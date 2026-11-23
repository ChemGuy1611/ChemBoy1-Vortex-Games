"""
nexus_upload.py

Reusable Nexus Mods v3 upload module. Provides multipart upload helpers and
changelog extraction. No game/extension-specific assumptions; caller supplies
mod_id, domain, version, description, zip_path, api_key, and a mod_key label
used for logging.

Usage:
    from nexus_upload import (
        upload_zip, pick_file_group, extract_changelog_entry,
        fit_file_description, post_mod_changelog, FILE_DESCRIPTION_MAX,
        v3_get, v3_post_json,
        upload_parts, complete_multipart, poll_upload_state,
        NEXUS_V3,
    )
"""

import json
import os
import re
import ssl
import time
import urllib.error
import urllib.request

from vortex_utils import (
    log_info, nexus_v3_get, nexus_v3_post_json, NEXUS_USER_AGENT,
)

NEXUS_V3 = "https://api.nexusmods.com/v3"

# Headers for the two direct v1 calls below. The v3 calls route through
# vortex_utils, which sends the same identifying User-Agent the Nexus API asks
# clients for; these hand-rolled requests need it added explicitly.
_V1_HEADERS = {"Accept": "application/json", "User-Agent": NEXUS_USER_AGENT}

# S3 presigned-URL requests go directly to AWS — use a plain SSL context, not the
# Nexus-specific certifi one that vu builds for its own helpers.
_SSL_CTX = ssl.create_default_context()


# == Low-level HTTP helpers ====================================================

def v3_get(path, api_key):
    """GET a Nexus v3 endpoint. Returns the parsed 'data' field."""
    return nexus_v3_get(path, api_key)["data"]


def v3_post_json(path, body, api_key):
    """POST JSON to a Nexus v3 endpoint. Returns the parsed 'data' field if present."""
    result = nexus_v3_post_json(path, body, api_key)
    return result.get("data", result)


# == Changelog extraction ======================================================

def extract_changelog_entry(changelog_src, version):
    """Extract changelog entry for version: date-only header + body, no blank line between."""
    # Use a trailing boundary (?![\d.]) to prevent "1.2" matching "1.20" or "1.2.3".
    pattern = rf'(## (?:\[?{re.escape(version)}\]?(?![\d.])).*?)(?=\n## |\Z)'
    m = re.search(pattern, changelog_src, re.DOTALL)
    if not m:
        return ""
    text = m.group(1).strip()
    # Strip "## [X.Y.Z] - YYYY-MM-DD" header down to just the date.
    text = re.sub(r'^## (?:\[?[^\]]*\]?\s*-\s*)(\d{4}-\d{2}-\d{2})', r'\1', text)
    # Strip bare "## [X.Y.Z]" or "## X.Y.Z" header (no date) so it doesn't appear in upload.
    text = re.sub(r'^## \[?[^\]\n]+\]?\s*\n', '', text)
    text = re.sub(r'^(\d{4}-\d{2}-\d{2})\n\n', r'\1\n', text)
    return text.strip()


# Nexus caps a file version's "description" at 255 characters (enforced from
# 2026-11-23; HTTP 422 above it). The full notes go to the mod's Changelogs tab.
FILE_DESCRIPTION_MAX = 255


def fit_file_description(entry, max_len=FILE_DESCRIPTION_MAX):
    """Return entry (an extract_changelog_entry result) trimmed to fit max_len.

    An entry that fits is returned unchanged. Otherwise the leading date line and as
    many whole lines as fit are kept, followed by a "(+N more - see the Changelogs tab)"
    line; a first bullet that is too long on its own is cut with "...". The result is
    never longer than max_len."""
    if len(entry) <= max_len:
        return entry
    lines = entry.split("\n")
    kept = []
    for i, line in enumerate(lines):
        rest = len(lines) - i - 1
        tail = f"(+{rest} more - see the Changelogs tab)" if rest else ""
        candidate = "\n".join(kept + [line] + ([tail] if tail else []))
        if len(candidate) > max_len:
            break
        kept.append(line)
    omitted = len(lines) - len(kept)
    tail = f"(+{omitted} more - see the Changelogs tab)"
    if not any(l.startswith("- ") for l in kept):
        # Not even one bullet fits beside the tail: cut the first bullet instead.
        first = next((l for l in lines if l.startswith("- ")), lines[0])
        head = "\n".join(kept)
        room = max_len - len(head) - len(tail) - 2 - 3  # two newlines + "..."
        kept.append(first[:max(room, 0)] + "...")
        omitted -= 1
        tail = f"(+{omitted} more - see the Changelogs tab)" if omitted > 0 else "(full notes: see the Changelogs tab)"
    return "\n".join(kept + [tail])[:max_len]


def changelog_body(entry):
    """The bullet text of an extract_changelog_entry result, without its date line."""
    return re.sub(r'^\d{4}-\d{2}-\d{2}\n?', '', entry).strip()


def mod_changelog_has_version(mod_uid, version, api_key):
    """True when the mod's Changelogs tab already holds text for version, False when it does
    not, None when that cannot be told (GET /v3/mods/{uid}/changelogs, paged newest first).

    POST /v3/mods/{uid}/changelogs only appends, so post_mod_changelog checks this first.
    Never raises: any failure (HTTP error after nexus_v3_get's retries, timeout, connection
    reset, unexpected shape) returns None, and the caller then skips the post rather than
    risk a duplicate it could never remove."""
    page, page_size = 1, 100
    try:
        while True:
            result = nexus_v3_get(f"/mods/{mod_uid}/changelogs?page={page}&page_size={page_size}", api_key)
            items = result.get("data")
            if not isinstance(items, list):
                return None
            if any(isinstance(item, dict) and item.get("version") == version and item.get("entries")
                   for item in items):
                return True
            total = (result.get("meta") or {}).get("total_count", 0)
            if page * page_size >= total or not items:
                return False
            page += 1
    except Exception:
        return None


def post_mod_changelog(mod_id, domain, version, entry, api_key, mod_key):
    """Add entry (date line + bullets) to the mod's Changelogs tab for version (POST /v3/mods/{uid}/changelogs).

    Skips when that version already has changelog text, and also when that cannot be
    checked: the endpoint only appends, so a duplicate could only be removed by hand on the
    site, while a skipped post is fixed by re-running the release. Never raises: the file is
    already published when this runs, so a problem is reported and the release still counts.
    Returns "posted", "exists", "unverified" or "failed".

    The entry is posted whole, date line included: Nexus splits it into one tab entry per
    line, and versions published before the 255 limit show the same "YYYY-MM-DD" first line."""
    body = entry.strip()
    if not changelog_body(entry):
        return "failed"
    uid = _UID_CACHE.get((domain, str(mod_id)))
    if not uid:
        log_info(mod_key, "WARNING - Changelogs tab not updated: mod uid unknown")
        return "failed"
    has = mod_changelog_has_version(uid, version, api_key)
    if has is None:
        log_info(mod_key, f"WARNING - Changelogs tab not updated: could not check whether v{version} "
                          f"is already there; re-run the release to post it")
        return "unverified"
    if has:
        log_info(mod_key, f"Changelogs tab already has v{version} - not posted again")
        return "exists"
    try:
        v3_post_json(f"/mods/{uid}/changelogs", {"version": version, "changelog": body}, api_key)
    except Exception as e:
        log_info(mod_key, f"WARNING - Changelogs tab not updated: {e}")
        return "failed"
    log_info(mod_key, f"Changelogs tab updated for v{version}")
    return "posted"


# == File group picker =========================================================

# Words stripped from group names before fuzzy matching (extend as needed).
_NAME_STRIP_WORDS = ['addon']


def _normalize_name(s):
    """Lowercase, strip spaces/underscores/hyphens, and remove _NAME_STRIP_WORDS for fuzzy matching."""
    for word in _NAME_STRIP_WORDS:
        s = re.sub(rf'\b{re.escape(word)}\b', '', s, flags=re.IGNORECASE)
    return re.sub(r'[\s_\-]+', '', s.lower())


def _v1_primary_file_name(mod_id, domain, api_key):
    """Return the name of the latest primary, non-archived v1 file for this mod, or None.

    Used to label a direct-to-group upload (FILE_GROUP_ID override) with the same
    name the existing file group uses on Nexus.
    """
    try:
        req = urllib.request.Request(
            f"https://api.nexusmods.com/v1/games/{domain}/mods/{mod_id}/files.json",
            headers={"apikey": api_key, **_V1_HEADERS},
        )
        with urllib.request.urlopen(req, timeout=15, context=_SSL_CTX) as resp:
            data = json.loads(resp.read())
    except (urllib.error.HTTPError, urllib.error.URLError):
        return None
    candidates = [
        f for f in data.get("files", [])
        if f.get("is_primary") and f.get("category_name") != "ARCHIVED"
    ]
    if not candidates:
        candidates = data.get("files", [])
    if not candidates:
        return None
    latest = max(candidates, key=lambda f: f.get("uploaded_timestamp", 0))
    return latest.get("name")


# Cached (domain, mod_id) -> active file group list. A mod with many files is
# released one file at a time, and every file resolves the same group list, so
# without this each upload would repeat the v1 uid + v3 group lookups.
_GROUPS_CACHE = {}

# Cached (domain, mod_id) -> mod uid, filled by the same lookup. Needed to create a
# new file group, which is addressed by mod uid rather than by an existing group id.
_UID_CACHE = {}


def _fetch_file_groups(mod_id, domain, api_key, mod_key):
    """Return the list of active file groups for this mod (cached per domain+mod_id).

    Resolves the mod UID via GET /v1/games/{domain}/mods/{mod_id}.json, then reads
    the groups from GET /v3/mods/{uid}/files.
    """
    cache_key = (domain, str(mod_id))
    if cache_key in _GROUPS_CACHE:
        return _GROUPS_CACHE[cache_key]

    log_info(mod_key, "Resolving mod UID from Nexus v1...")
    try:
        req = urllib.request.Request(
            f"https://api.nexusmods.com/v1/games/{domain}/mods/{mod_id}.json",
            headers={"apikey": api_key, **_V1_HEADERS},
        )
        with urllib.request.urlopen(req, timeout=15, context=_SSL_CTX) as resp:
            v1_data = json.loads(resp.read())
        uid = v1_data.get("uid")
        if not uid:
            raise RuntimeError("v1 mod data has no 'uid' field")
        log_info(mod_key, f"Resolved uid: {uid}; fetching file groups...")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"v1 mod lookup failed: HTTP {e.code} {e.reason}") from None

    # File groups live under GET /v3/mods/{uid}/files as `mod_files` (same shape as the
    # `groups` array the now-defunct /file-update-groups endpoint used to return: each entry
    # has id, name, is_active, versions_count, ...). The mod_files[].id IS the file group id.
    try:
        data = v3_get(f"/mods/{uid}/files", api_key)
    except RuntimeError as e:
        if "HTTP 404" in str(e):
            raise RuntimeError(
                f"mod uid {uid} has no v3 file groups. "
                "Add FILE_GROUP_ID to index.js or create a file group via the Nexus Mods Files tab."
            ) from None
        raise
    groups = [g for g in data.get("mod_files", []) if g.get("is_active")]
    if not groups:
        raise RuntimeError("no active file groups found for this mod")
    _GROUPS_CACHE[cache_key] = groups
    _UID_CACHE[cache_key] = uid
    return groups


def find_exact_file_group(mod_id, domain, api_key, mod_key, name_hint):
    """Return the file group whose normalized name equals name_hint, or None.

    Unlike pick_file_group there is no substring fallback, so a file that has no
    group of its own yet (e.g. a new addon "Mod_Extra") is never matched to a
    sibling whose name it merely contains ("Mod").
    """
    groups = _fetch_file_groups(mod_id, domain, api_key, mod_key)
    hint_norm = _normalize_name(name_hint)
    exact = [g for g in groups if _normalize_name(g["name"]) == hint_norm]
    if len(exact) > 1:
        raise RuntimeError(
            f"ambiguous file group match for stem '{name_hint}': "
            + ", ".join(f"{g['name']!r} (id: {g['id']})" for g in exact)
        )
    if exact:
        log_info(mod_key, f"File group (exact): {exact[0]['name']} (id: {exact[0]['id']})")
        return exact[0]
    return None


def pick_file_group(mod_id, domain, api_key, mod_key, name_hint=None, group_id_override=None):
    """Return the file update group dict to use for this upload.

    Lookup: v1 mod UID via GET /v1/games/{domain}/mods/{mod_id}.json,
    then GET /v3/mods/{uid}/files (returns the file groups under `mod_files`;
    the old /v3/mods/{uid}/file-update-groups path is defunct and 404s). The
    resolved group list is cached per mod for the lifetime of the process.

    group_id_override: when set, skip the v1->v3 group list entirely and target
    this group id directly. The publish name is derived from the latest primary
    v1 file, then name_hint, then a generic fallback. Use when the v3 list
    endpoint 404s for a mod whose files were uploaded via the web/v1 flow.

    name_hint: optional string used to auto-select from multiple groups by
    fuzzy name match (lowercase, spaces/underscores/hyphens stripped). Raises
    RuntimeError when no hint is given and more than one group is active --
    pick_file_group has exactly one caller (release_extension.py, which always
    runs unattended for --upload) so there is no safe place to block on stdin;
    set FILE_GROUP_ID in the extension's index.js to pin a group explicitly.
    """
    if group_id_override is not None:
        name = _v1_primary_file_name(mod_id, domain, api_key) or name_hint or f"file group {group_id_override}"
        log_info(mod_key, f"File group (override): {name} (id: {group_id_override})")
        return {"id": group_id_override, "name": name}

    groups = _fetch_file_groups(mod_id, domain, api_key, mod_key)
    if len(groups) == 1:
        log_info(mod_key, f"File group: {groups[0]['name']} (id: {groups[0]['id']})")
        return groups[0]

    # Try name_hint auto-match
    if name_hint:
        hint_norm = _normalize_name(name_hint)
        # Exact normalized match — required when group names share a common prefix
        # (e.g. "Disable_Screen_FX" must not match "Disable_Screen_FX_Bloom")
        exact = [g for g in groups if _normalize_name(g["name"]) == hint_norm]
        if len(exact) == 1:
            log_info(mod_key, f"File group (exact): {exact[0]['name']} (id: {exact[0]['id']})")
            return exact[0]
        # Substring fallback for partial naming
        matched = [
            g for g in groups
            if hint_norm in _normalize_name(g["name"]) or _normalize_name(g["name"]) in hint_norm
        ]
        if len(matched) == 1:
            log_info(mod_key, f"File group (matched): {matched[0]['name']} (id: {matched[0]['id']})")
            return matched[0]
        if not matched:
            raise RuntimeError(f"no Nexus file group matches stem '{name_hint}'")
        raise RuntimeError(
            f"ambiguous file group match for stem '{name_hint}': "
            + ", ".join(g["name"] for g in matched)
        )

    names = ", ".join(f"{g['name']!r} (id: {g['id']})" for g in groups)
    raise RuntimeError(
        f"mod {mod_id} has {len(groups)} active file groups and no name_hint matched one: "
        f"{names}. Set FILE_GROUP_ID in the extension's index.js to pin a group."
    )


# == Multipart upload ==========================================================

def upload_parts(zip_path, presigned_urls, part_size, mod_key):
    """Upload zip_path in parts to the presigned S3 URLs. Returns list of ETags."""
    etags = []
    total = len(presigned_urls)
    with open(zip_path, "rb") as f:
        for i, url in enumerate(presigned_urls):
            chunk = f.read(part_size)
            if len(chunk) == 0 and i < total - 1:
                raise RuntimeError(f"unexpected EOF reading zip before part {i + 1}/{total}")
            req = urllib.request.Request(url, data=chunk, method="PUT")
            req.add_header("Content-Type", "application/octet-stream")
            req.add_header("Content-Length", str(len(chunk)))
            with urllib.request.urlopen(req, timeout=120, context=_SSL_CTX) as resp:
                etag = resp.getheader("ETag", "").strip('"')
                etags.append(etag)
            log_info(mod_key, f"  Part {i + 1}/{total} uploaded")
        # guard: if the API returned too few presigned URLs the tail of the zip is silently
        # dropped and a truncated archive would be published
        tail = f.read(1)
        if tail:
            raise RuntimeError(
                f"upload_parts: zip has unread data after {total} parts -- "
                "the API returned too few presigned URLs; aborting to avoid truncated archive"
            )
    return etags


def complete_multipart(complete_url, etags):
    """POST the S3 CompleteMultipartUpload XML to finalize assembly."""
    parts_xml = "".join(
        f"<Part><PartNumber>{i + 1}</PartNumber><ETag>{etag}</ETag></Part>"
        for i, etag in enumerate(etags)
    )
    xml_body = f"<CompleteMultipartUpload>{parts_xml}</CompleteMultipartUpload>"
    req = urllib.request.Request(
        complete_url,
        data=xml_body.encode("utf-8"),
        method="POST",
    )
    req.add_header("Content-Type", "application/xml")
    try:
        with urllib.request.urlopen(req, timeout=60, context=_SSL_CTX):
            pass
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        raise RuntimeError(f"S3 CompleteMultipartUpload failed: HTTP {e.code} {e.reason} - {body[:400]}") from None


def poll_upload_state(upload_id, api_key, mod_key):
    """Poll until the upload reaches 'available' state. Raises on timeout."""
    log_info(mod_key, "Waiting for upload to be processed...")
    for attempt in range(30):
        delay = min(1.0 * (1.4 ** attempt), 20.0)
        time.sleep(delay)
        data = v3_get(f"/uploads/{upload_id}", api_key)
        state = data.get("state", "")
        if state == "available":
            return
        log_info(mod_key, f"  Upload state: {state}")
    raise RuntimeError(f"upload {upload_id} did not become available after 30 attempts")


# == Top-level upload flow =====================================================

def upload_zip(zip_path, mod_id, domain, version, description, api_key, mod_key, name_hint=None, file_category="main", group_id_override=None, update_mod_version=True, create_missing_group=False):
    """Run the full Nexus v3 multipart upload flow and create a new file version.

    create_missing_group: when True (requires name_hint), the file group is resolved
    by exact normalized name only, and if none exists a new file group named after
    name_hint (underscores as spaces) is created from this upload. Use for mods that
    ship several sibling files, where a new file must not be published into another
    file's group.
    """
    if create_missing_group:
        if not name_hint:
            raise RuntimeError("create_missing_group requires name_hint")
        group = find_exact_file_group(mod_id, domain, api_key, mod_key, name_hint)
    else:
        group = pick_file_group(mod_id, domain, api_key, mod_key, name_hint=name_hint, group_id_override=group_id_override)
    group_id = group["id"] if group else None
    display_name = group["name"] if group else name_hint.replace("_", " ")
    # Nexus rejects primary_mod_manager_download on anything but a main file (HTTP 422).
    is_main = file_category == "main"

    full_entry = description
    description = fit_file_description(description)
    if description != full_entry:
        log_info(mod_key, f"Changelog entry is {len(full_entry)} chars; file description trimmed to "
                          f"{len(description)} (limit {FILE_DESCRIPTION_MAX}), full notes go to the Changelogs tab")

    file_size = os.path.getsize(zip_path)
    filename = os.path.basename(zip_path)

    log_info(mod_key, f"Creating upload session for {filename} ({file_size / 1024:.1f} KB)...")
    upload = v3_post_json("/uploads/multipart", {
        "filename": filename,
        "size_bytes": str(file_size),
    }, api_key)
    upload_id = upload["id"]
    presigned_urls = upload["part_presigned_urls"]
    part_size = upload["part_size_bytes"]
    complete_url = upload["complete_presigned_url"]

    log_info(mod_key, f"Uploading {len(presigned_urls)} part(s)...")
    etags = upload_parts(zip_path, presigned_urls, part_size, mod_key)

    log_info(mod_key, "Completing multipart upload...")
    complete_multipart(complete_url, etags)

    log_info(mod_key, "Finalising upload...")
    v3_post_json(f"/uploads/{upload_id}/finalise", {}, api_key)

    poll_upload_state(upload_id, api_key, mod_key)

    if group_id is None:
        log_info(mod_key, f"No file group named '{display_name}'; creating it with version {version}...")
        result = v3_post_json("/mod-files", {
            "upload_id": upload_id,
            "mod_id": str(_UID_CACHE[(domain, str(mod_id))]),
            "name": display_name,
            "description": description,
            "version": version,
            "file_category": file_category,
            "primary_mod_manager_download": is_main,
            "allow_mod_manager_download": True,
            "show_requirements_pop_up": True,
            "update_mod_version": update_mod_version,
        }, api_key)
        new_id = result.get("id") or result.get("file", {}).get("id", "unknown")
        _GROUPS_CACHE.pop((domain, str(mod_id)), None)
        log_info(mod_key, f"File group created (id: {new_id})")
        log_info(mod_key, f"Nexus upload complete: {display_name} v{version}")
        post_mod_changelog(mod_id, domain, version, full_entry, api_key, mod_key)
        return

    log_info(mod_key, f"Publishing version {version} to file group '{display_name}'...")
    result = v3_post_json(f"/mod-files/{group_id}/versions", {
        "upload_id": upload_id,
        "name": display_name,
        "description": description,
        "version": version,
        "file_category": file_category,
        "archive_existing_file": True,
        "primary_mod_manager_download": is_main,
        "allow_mod_manager_download": True,
        "show_requirements_pop_up": True,
        "update_mod_version": update_mod_version,
    }, api_key)
    file_uid = result.get("file", {}).get("id", "unknown")
    version_id = result.get("version", {}).get("id", "unknown")
    log_info(mod_key, f"File UID: {file_uid} (version id: {version_id})")

    log_info(mod_key, f"Nexus upload complete: {display_name} v{version}")
    post_mod_changelog(mod_id, domain, version, full_entry, api_key, mod_key)
