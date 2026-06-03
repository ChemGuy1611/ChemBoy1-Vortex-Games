"""
nexus_upload.py

Reusable Nexus Mods v3 upload module. Provides multipart upload helpers and
changelog extraction. No game/extension-specific assumptions; caller supplies
mod_id, domain, version, description, zip_path, api_key, and a mod_key label
used for logging.

Usage:
    from nexus_upload import (
        upload_zip, pick_file_group, extract_changelog_entry,
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

try:
    import certifi
    _SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CTX = ssl.create_default_context()

from vortex_utils import log_info, log_warn, log_error

NEXUS_V3 = "https://api.nexusmods.com/v3"


# == Low-level HTTP helpers ====================================================

def v3_get(path, api_key):
    """GET a Nexus v3 endpoint. Returns the parsed 'data' field."""
    req = urllib.request.Request(
        f"{NEXUS_V3}{path}",
        headers={"apikey": api_key, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=_SSL_CTX) as resp:
            return json.loads(resp.read())["data"]
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        raise RuntimeError(f"HTTP {e.code} {e.reason} - {body[:200]}") from None


def v3_post_json(path, body, api_key):
    """POST JSON to a Nexus v3 endpoint. Returns the parsed 'data' field if present."""
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{NEXUS_V3}{path}",
        data=payload,
        headers={
            "apikey": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=_SSL_CTX) as resp:
            result = json.loads(resp.read())
            return result.get("data", result)
    except urllib.error.HTTPError as e:
        body_txt = ""
        try:
            body_txt = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        raise RuntimeError(f"HTTP {e.code} {e.reason} - {body_txt[:400]}") from None


# == Changelog extraction ======================================================

def extract_changelog_entry(changelog_src, version):
    """Extract changelog entry for version: date-only header + body, no blank line between."""
    pattern = rf'(## (?:\[?{re.escape(version)}\]?).*?)(?=\n## |\Z)'
    m = re.search(pattern, changelog_src, re.DOTALL)
    if not m:
        return ""
    text = m.group(1).strip()
    text = re.sub(r'^## (?:\[?[^\]]*\]?\s*-\s*)(\d{4}-\d{2}-\d{2})', r'\1', text)
    text = re.sub(r'^(\d{4}-\d{2}-\d{2})\n\n', r'\1\n', text)
    return text.strip()


# == File group picker =========================================================

# Words stripped from group names before fuzzy matching (extend as needed).
_NAME_STRIP_WORDS = ['addon']


def _normalize_name(s):
    """Lowercase, strip spaces/underscores/hyphens, and remove _NAME_STRIP_WORDS for fuzzy matching."""
    for word in _NAME_STRIP_WORDS:
        s = re.sub(rf'\b{re.escape(word)}\b', '', s, flags=re.IGNORECASE)
    return re.sub(r'[\s_\-]+', '', s.lower())


def pick_file_group(mod_id, domain, api_key, mod_key, name_hint=None):
    """Return the file update group dict to use for this upload.

    Lookup: v1 mod UID via GET /v1/games/{domain}/mods/{mod_id}.json,
    then GET /v3/mods/{uid}/file-update-groups.

    name_hint: optional string used to auto-select from multiple groups by
    fuzzy name match (lowercase, spaces/underscores/hyphens stripped).
    Falls back to interactive picker when hint is ambiguous or absent.
    """
    log_info(mod_key, "Resolving mod UID from Nexus v1...")
    try:
        req = urllib.request.Request(
            f"https://api.nexusmods.com/v1/games/{domain}/mods/{mod_id}.json",
            headers={"apikey": api_key, "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=15, context=_SSL_CTX) as resp:
            v1_data = json.loads(resp.read())
        uid = v1_data.get("uid")
        if not uid:
            raise RuntimeError("v1 mod data has no 'uid' field")
        log_info(mod_key, f"Resolved uid: {uid}; fetching file update groups...")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"v1 mod lookup failed: HTTP {e.code} {e.reason}") from None

    try:
        data = v3_get(f"/mods/{uid}/file-update-groups", api_key)
    except RuntimeError as e:
        if "HTTP 404" in str(e):
            raise RuntimeError(
                f"mod uid {uid} has no v3 file update groups. "
                "Add FILE_GROUP_ID to index.js or create a file group via the Nexus Mods Files tab."
            ) from None
        raise
    groups = [g for g in data.get("groups", []) if g.get("is_active")]
    if not groups:
        raise RuntimeError("no active file update groups found for this mod")
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

    print(f"\n  Multiple active file groups for mod {mod_id}:")  # noqa: raw-log-print
    for i, g in enumerate(groups):
        last = g.get("latest_file_upload_date") or "never"
        print(f"  [{i + 1}] {g['name']}  (id: {g['id']}, last upload: {last})")  # noqa: raw-log-print
    while True:
        ans = input(f"  Choose group [1-{len(groups)}]: ").strip()
        if ans.isdigit() and 1 <= int(ans) <= len(groups):
            return groups[int(ans) - 1]
        print(f"  Enter a number between 1 and {len(groups)}.")  # noqa: raw-log-print


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

def upload_zip(zip_path, mod_id, domain, version, description, api_key, mod_key, name_hint=None):
    """Run the full Nexus v3 multipart upload flow and create a new file version."""
    group = pick_file_group(mod_id, domain, api_key, mod_key, name_hint=name_hint)
    group_id = group["id"]
    display_name = group["name"]

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

    log_info(mod_key, f"Publishing version {version} to file group '{display_name}'...")
    result = v3_post_json(f"/mod-file-update-groups/{group_id}/versions", {
        "upload_id": upload_id,
        "name": display_name,
        "description": description,
        "version": version,
        "file_category": "main",
        "archive_existing_file": True,
        "primary_mod_manager_download": True,
        "allow_mod_manager_download": False,  # inverted legacy field: False = MMD enabled, True = MMD disabled
        "show_requirements_pop_up": True,
    }, api_key)
    file_uid = result.get("id", "unknown")
    log_info(mod_key, f"File UID: {file_uid} (NOTE: enable 'Mod Manager Download' manually on the Files tab - Nexus v3 API ignores allow_mod_manager_download)")

    log_info(mod_key, f"Nexus upload complete: {display_name} v{version}")
