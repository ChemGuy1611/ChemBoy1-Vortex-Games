"""
check_nexus_api.py

Verify Nexus Mods v1 and v3 API response shapes match documentation.
Read-only checks run by default. Use --test-upload to also verify the
multipart upload session shape (creates a dangling 1-byte upload session
on Nexus/S3 that expires automatically; does not publish any files).
Use --check-spec to diff the live OpenAPI document against the endpoint
catalog recorded in resources/NEXUS_MODS_API.md (no API key needed).

Usage:
    python check_nexus_api.py
    python check_nexus_api.py --domain site --mod-id 1960
    python check_nexus_api.py --test-upload
    python check_nexus_api.py --check-spec
    python check_nexus_api.py --check-spec --spec-only

Environment variables:
    NEXUS_API_KEY  Required, except for --check-spec --spec-only.
                   Read from env var, with HKCU/HKLM registry fallback.
"""

import argparse
import json
import ssl
import sys
import urllib.error
import urllib.request

from vortex_utils import get_api_key as vu_get_api_key
from vortex_utils import NEXUS_USER_AGENT

try:
    import certifi
    _SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _SSL_CTX = ssl.create_default_context()

NEXUS_V1 = "https://api.nexusmods.com/v1"
NEXUS_V3 = "https://api.nexusmods.com/v3"
# The live OpenAPI document lives at the domain root, NOT under /v3/ (that 404s).
NEXUS_SPEC_URL = "https://api.nexusmods.com/openapi.yaml"
UA = NEXUS_USER_AGENT

# Default test target: Fatekeeper Vortex Extension (site/1960)
DEFAULT_DOMAIN = "site"
DEFAULT_MOD_ID = 1960

PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"
INFO = "[INFO]"


# == Expected shapes ===========================================================

V1_MOD_REQUIRED = {
    "name": str,
    "uid": int,
    "mod_id": int,
    "game_id": int,
    "domain_name": str,
    "version": str,
    "category_id": int,
    "status": str,
    "available": bool,
    "created_timestamp": int,
    "updated_timestamp": int,
    "author": str,
    "uploaded_by": str,
}

V3_GROUP_REQUIRED = {
    "id": str,
    "name": str,
    "is_active": bool,
    "last_file_uploaded_at": str,
    "versions_count": int,
}

# Present in live API, not in original docs — tracked here to catch future removals
V3_GROUP_KNOWN_EXTRA = {"archived_count", "removed_count"}

# Step 3: POST /v3/uploads/multipart response (inside "data"). Returns 201.
V3_UPLOAD_SESSION_REQUIRED = {
    "id": str,
    "part_presigned_urls": list,
    "part_size_bytes": int,
    "complete_presigned_url": str,
    "state": str,   # initial value: "created"
    "user": dict,   # {"id": "<user_id>"}
}

# Step 7: GET /v3/uploads/{id} response (inside "data")
V3_UPLOAD_STATE_REQUIRED = {
    "state": str,
    "id": str,
    "user": dict,   # {"id": "<user_id>"}
}

# Step 8: POST /v3/mod-files/{id}/versions response, shape of data.file
# (current endpoint since 2026-07-24 migration; legacy /mod-file-update-groups/{id}/versions
# returned this same shape flat under "data" instead of nested under "data.file" - deprecated
# 2026-06-11, removed on/after 2026-09-09)
V3_FILE_VERSION_REQUIRED = {
    "id": None,         # int or str depending on API
    "game_scoped_id": None,
    "name": str,
    "file_category": str,
}

V1_RATE_HEADERS = ["x-rl-daily-limit", "x-rl-daily-remaining",
                   "x-rl-hourly-limit", "x-rl-hourly-remaining"]

KNOWN_UPLOAD_STATES = {"created", "pending", "processing", "available", "failed"}

# Rate limits as documented in resources/NEXUS_MODS_API.md. A live response whose
# limit headers match neither tier means the docs have drifted.
DOCUMENTED_RATE_LIMITS = {
    "premium": {"daily": 20000, "hourly": 2000},
    "free": {"daily": 2500, "hourly": 100},
}

# == Live OpenAPI spec baseline ================================================
# Mirrors the "V3 Endpoint Catalog" table in resources/NEXUS_MODS_API.md. When
# --check-spec reports drift, update BOTH this list and that doc in the same pass.
SPEC_EXPECTED_VERSION = "3.0.0"
SPEC_KNOWN_PATHS = {
    "/collections",
    "/collections/{id}",
    "/collections/{id}/revisions",
    "/games/{game_domain}/dlcs",
    "/games/{game_domain}/mod-file-versions/{game_scoped_id}",
    "/games/{game_domain}/mods/{game_scoped_id}",
    "/games/{game_domain}/trending-mods",
    "/mod-file-update-groups/{group_id}/versions",
    "/mod-file-versions/batch",
    "/mod-file-versions/dependencies/materialized/batch",
    "/mod-file-versions/dependencies/ranges/materialized/batch",
    "/mod-file-versions/move",
    "/mod-file-versions/move-to-new-mod-file",
    "/mod-file-versions/{id}",
    "/mod-file-versions/{id}/dependencies",
    "/mod-file-versions/{id}/dependencies/dlc",
    "/mod-file-versions/{id}/dependencies/ranges",
    "/mod-file-versions/{id}/dependencies/ranges/materialized",
    "/mod-files",
    "/mod-files/{id}",
    "/mod-files/{id}/versions",
    "/mods/batch",
    "/mods/{id}/changelogs",
    "/mods/{id}/files",
    "/mods/{id}/toggle-legacy-mod-requirements",
    "/uploads",
    "/uploads/multipart",
    "/uploads/{id}",
    "/uploads/{id}/finalise",
    "/vortex/extensions",
}

# Endpoints release_extension.py --upload depends on. Both are Experimental tier,
# so they carry no deprecation-notice guarantee -- their disappearance from the
# spec is the failure this check exists to catch early.
SPEC_PIPELINE_PATHS = {
    "/mods/{id}/files": "get",            # upload flow step 2
    "/mod-files/{id}/versions": "post",   # upload flow step 8
    "/uploads/multipart": "post",         # step 3
    "/uploads/{id}": "get",               # step 7
    "/uploads/{id}/finalise": "post",     # step 6
}

# Deprecations already recorded in the docs. Anything else the spec marks
# deprecated is new since the last audit and gets flagged loudly.
SPEC_KNOWN_DEPRECATIONS = {
    "/mod-file-update-groups/{group_id}/versions",
    "/mod-file-versions/dependencies/materialized/batch",
}


# == HTTP helpers ==============================================================

def _get_api_key():
    return vu_get_api_key("NEXUS_API_KEY")


def _get(url, api_key, *, expect_status=200):
    headers = {"apikey": api_key, "Accept": "application/json", "User-Agent": UA}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15, context=_SSL_CTX) as resp:
            return resp.status, dict(resp.getheaders()), json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")[:300]
        except Exception:
            pass
        return e.code, {}, body


def _post_json(url, api_key, body):
    payload = json.dumps(body).encode("utf-8")
    headers = {
        "apikey": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": UA,
    }
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30, context=_SSL_CTX) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")[:300]
        except Exception:
            pass
        return e.code, body


# == Shape checker =============================================================

def check_shape(label, obj, required):
    """Returns (pass_count, fail_messages)."""
    fails = []
    passes = 0
    for field, expected_type in required.items():
        if field not in obj:
            fails.append(f"  missing field: {field!r}")
        elif expected_type is not None and not isinstance(obj[field], expected_type):
            actual = type(obj[field]).__name__
            fails.append(f"  {field!r}: expected {expected_type.__name__}, got {actual} ({obj[field]!r})")
        else:
            passes += 1
    return passes, fails


def check_extra_fields(obj, known_required, known_extra, label):
    all_known = set(known_required) | known_extra
    unexpected = set(obj) - all_known
    if unexpected:
        print(f"  {WARN} {label}: unknown fields (update docs): {sorted(unexpected)}")
    for field in sorted(known_extra):
        if field in obj:
            print(f"  {INFO} {label}: extra documented field present: {field!r} = {obj[field]!r}")


# == Main checks ===============================================================

def run_read_only_checks(domain, mod_id, api_key):
    results = {"pass": 0, "fail": 0, "warn": 0}
    group_id = None
    uid = None

    def ok(msg):
        print(f"  {PASS} {msg}")
        results["pass"] += 1

    def fail(msg):
        print(f"  {FAIL} {msg}")
        results["fail"] += 1

    def warn(msg):
        print(f"  {WARN} {msg}")
        results["warn"] += 1

    # ------------------------------------------------------------------
    print(f"\n=== v1 Mod Details: {domain}/mods/{mod_id} ===")
    status, headers, body = _get(f"{NEXUS_V1}/games/{domain}/mods/{mod_id}.json", api_key)

    if status != 200:
        fail(f"Expected 200, got {status}: {body}")
        return results, uid, group_id
    ok("Status 200")

    passes, fails = check_shape("v1 mod", body, V1_MOD_REQUIRED)
    for f in fails:
        fail(f)
    if passes:
        ok(f"{passes}/{len(V1_MOD_REQUIRED)} required fields present with correct types")

    uid = body.get("uid")
    if uid:
        ok(f"uid present: {uid}")
    else:
        fail("uid missing - v1->v3 bridge broken")
        return results, uid, group_id

    # Rate limit headers
    print(f"\n=== Rate Limit Headers ===")
    lower_headers = {k.lower(): v for k, v in headers.items()}
    for h in V1_RATE_HEADERS:
        if h in lower_headers:
            ok(f"{h}: {lower_headers[h]}")
        else:
            fail(f"Missing header: {h}")

    # The limit values themselves are documented -- catch it when Nexus changes
    # them, instead of only noticing that the headers exist.
    try:
        live_daily = int(lower_headers.get("x-rl-daily-limit", ""))
        live_hourly = int(lower_headers.get("x-rl-hourly-limit", ""))
    except ValueError:
        warn("Could not parse limit values - skipping documented-limit comparison")
    else:
        matched = [
            tier for tier, lim in DOCUMENTED_RATE_LIMITS.items()
            if lim["daily"] == live_daily and lim["hourly"] == live_hourly
        ]
        if matched:
            ok(f"Limits match documented '{matched[0]}' tier ({live_daily}/day, {live_hourly}/hour)")
        else:
            documented = ", ".join(
                f"{t}={lim['daily']}/day+{lim['hourly']}/hour"
                for t, lim in DOCUMENTED_RATE_LIMITS.items()
            )
            fail(
                f"Live limits {live_daily}/day, {live_hourly}/hour match no documented tier "
                f"({documented}) - update resources/NEXUS_MODS_API.md"
            )

    # ------------------------------------------------------------------
    print(f"\n=== v3 Mod Files: mods/{uid}/files ===")
    status, _, body = _get(f"{NEXUS_V3}/mods/{uid}/files", api_key)

    if status != 200:
        fail(f"Expected 200, got {status}: {body}")
    else:
        ok("Status 200")
        if not isinstance(body, dict) or "data" not in body:
            fail("Top-level 'data' wrapper missing")
        elif "mod_files" not in body["data"]:
            fail("'data.mod_files' missing")
        else:
            groups = body["data"]["mod_files"]
            ok(f"data.mod_files present ({len(groups)} group(s))")
            if groups:
                g = groups[0]
                passes, fails = check_shape("mod_files[0]", g, V3_GROUP_REQUIRED)
                for f in fails:
                    fail(f)
                if passes:
                    ok(f"{passes}/{len(V3_GROUP_REQUIRED)} group fields correct")
                check_extra_fields(g, V3_GROUP_REQUIRED, V3_GROUP_KNOWN_EXTRA, "mod_files[0]")
                group_id = g.get("id")
            else:
                warn("No mod files returned - shape check skipped")

    # ------------------------------------------------------------------
    print(f"\n=== Dead/Nonexistent v3 Paths (expect 404 -- confirms still gone, not that they're 'wrong') ===")

    # GET /v3/openapi.yaml itself is NOT broken -- the live spec is at the domain root,
    # https://api.nexusmods.com/openapi.yaml (no /v3/ prefix). This checks the wrong-prefixed
    # path stays 404, which is expected and not a bug.
    broken = [
        ("GET /v3/openapi.yaml (wrong path -- real spec is at domain root, not under /v3/)",
         f"{NEXUS_V3}/openapi.yaml", 404),
        (f"GET /v3/mods/{mod_id}/file-update-groups (v1 mod_id, not uid)",
         f"{NEXUS_V3}/mods/{mod_id}/file-update-groups", 404),
        (f"GET /v3/mods/{uid} (mod-level GET by uid was never in the spec)",
         f"{NEXUS_V3}/mods/{uid}", 404),
    ]
    if group_id:
        broken.append((
            f"GET /v3/mod-file-update-groups/{group_id} (defunct list endpoint)",
            f"{NEXUS_V3}/mod-file-update-groups/{group_id}", 404,
        ))

    for label, url, expected_code in broken:
        status, _, body = _get(url, api_key, expect_status=expected_code)
        if status == expected_code:
            ok(f"{label} -> {status} (expected)")
        elif status == 200:
            fail(f"{label} -> 200 UNEXPECTEDLY WORKS - update docs!")
        else:
            warn(f"{label} -> {status} (expected {expected_code}) - error code changed")

    return results, uid, group_id


def run_upload_shape_checks(api_key, results):
    """POST a 1-byte multipart session and verify step 3 + step 7 shapes.
    Does NOT upload data or publish anything. Session expires automatically."""

    def ok(msg):
        print(f"  {PASS} {msg}")
        results["pass"] += 1

    def fail(msg):
        print(f"  {FAIL} {msg}")
        results["fail"] += 1

    def warn(msg):
        print(f"  {WARN} {msg}")
        results["warn"] += 1

    # Step 3 — create upload session
    print(f"\n=== Step 3: POST /v3/uploads/multipart (shape only - no data uploaded) ===")
    status, body = _post_json(
        f"{NEXUS_V3}/uploads/multipart",
        api_key,
        {"filename": "shape-check-test.zip", "size_bytes": "1"},
    )

    if status not in (200, 201):
        fail(f"Expected 200/201, got {status}: {body}")
        return

    ok(f"Status {status}")

    data = body.get("data") if isinstance(body, dict) else None
    if not data:
        fail("'data' wrapper missing in response")
        return

    passes, fails = check_shape("upload session", data, V3_UPLOAD_SESSION_REQUIRED)
    for f in fails:
        fail(f)
    if passes:
        ok(f"{passes}/{len(V3_UPLOAD_SESSION_REQUIRED)} upload session fields correct")

    # Extra field check
    all_known = set(V3_UPLOAD_SESSION_REQUIRED)
    unexpected = set(data) - all_known
    if unexpected:
        warn(f"Unknown upload session fields (update docs): {sorted(unexpected)}")

    # Print actual values for manual verification
    print(f"  {INFO} id: {data.get('id')!r}")
    print(f"  {INFO} part_size_bytes: {data.get('part_size_bytes')}")
    print(f"  {INFO} part_presigned_urls count: {len(data.get('part_presigned_urls', []))}")
    print(f"  {INFO} complete_presigned_url present: {bool(data.get('complete_presigned_url'))}")

    upload_id = data.get("id")
    if not upload_id:
        fail("No upload_id in session response - cannot check step 7")
        return

    # Step 7 — poll upload state immediately (expect pending/processing)
    print(f"\n=== Step 7: GET /v3/uploads/{upload_id} (state shape) ===")
    status, _, state_body = _get(f"{NEXUS_V3}/uploads/{upload_id}", api_key)

    if status != 200:
        fail(f"Expected 200, got {status}: {state_body}")
        return
    ok("Status 200")

    state_data = state_body.get("data") if isinstance(state_body, dict) else None
    if not state_data:
        fail("'data' wrapper missing in upload state response")
        return

    passes, fails = check_shape("upload state", state_data, V3_UPLOAD_STATE_REQUIRED)
    for f in fails:
        fail(f)
    if passes:
        ok(f"{passes}/{len(V3_UPLOAD_STATE_REQUIRED)} upload state fields correct")

    actual_state = state_data.get("state", "")
    if actual_state in KNOWN_UPLOAD_STATES:
        ok(f"state value {actual_state!r} is a known state")
    else:
        warn(f"state value {actual_state!r} not in known states {KNOWN_UPLOAD_STATES}")

    all_known = set(V3_UPLOAD_STATE_REQUIRED)
    unexpected = set(state_data) - all_known
    if unexpected:
        print(f"  {INFO} Additional upload state fields present: {sorted(unexpected)}")
        for f in sorted(unexpected):
            print(f"  {INFO}   {f!r}: {state_data[f]!r}")

    print(f"  NOTE: session {upload_id!r} left dangling - will expire automatically on S3")
    return upload_id


def run_step8_shape_checks(api_key, group_id, upload_id, results):
    """Verify step 8 POST /v3/mod-files/{group_id}/versions field validation.
    (Current endpoint since the 2026-07-24 migration off the deprecated
    /mod-file-update-groups/{group_id}/versions path, removed on/after 2026-09-09.)
    Uses schema-validates-before-upload-state-check property:
    - null boolean fields → 422 even with fake upload_id
    - missing required fields → 422
    - valid body with real (non-available) upload_id → 404 (schema passed)
    Does NOT publish any files."""

    def ok(msg):
        print(f"  {PASS} {msg}")
        results["pass"] += 1

    def fail(msg):
        print(f"  {FAIL} {msg}")
        results["fail"] += 1

    def warn(msg):
        print(f"  {WARN} {msg}")
        results["warn"] += 1

    print(f"\n=== Step 8: POST /v3/mod-files/{group_id}/versions (field validation) ===")

    FAKE_UID = "aaaaaaaa-0000-0000-0000-000000000000"
    base = {
        "upload_id": FAKE_UID,
        "name": "Fatekeeper Vortex Extension",
        "description": "2026-06-03\n- Shape check test",
        "version": "0.0.0-test",
        "file_category": "main",
        "archive_existing_file": False,
        "primary_mod_manager_download": True,
        "allow_mod_manager_download": True,
        "show_requirements_pop_up": True,
        "update_mod_version": False,
    }
    url = f"{NEXUS_V3}/mod-files/{group_id}/versions"

    def post8(body):
        status, resp = _post_json(url, api_key, body)
        detail = ""
        if isinstance(resp, dict):
            detail = resp.get("detail", "")
        elif isinstance(resp, str):
            try:
                detail = json.loads(resp).get("detail", resp)
            except Exception:
                detail = resp[:200]
        return status, detail

    # Null boolean fields — all three must 422
    for field in ("show_requirements_pop_up", "allow_mod_manager_download", "primary_mod_manager_download"):
        status, detail = post8({**base, field: None})
        if status == 422 and "does not allow null" in detail:
            ok(f"{field}=null -> 422 (null rejected)")
        elif status == 422:
            ok(f"{field}=null -> 422 ({detail[:80]})")
        else:
            fail(f"{field}=null -> {status} (expected 422): {detail[:80]}")

    # Required fields — 422 if missing
    for field in ("upload_id", "name", "version", "file_category"):
        body = {k: v for k, v in base.items() if k != field}
        status, detail = post8(body)
        if status == 422 and "missing required" in detail:
            ok(f"missing {field!r} -> 422 (required field caught)")
        elif status == 422:
            ok(f"missing {field!r} -> 422 ({detail[:80]})")
        else:
            fail(f"missing {field!r} -> {status} (expected 422): {detail[:80]}")

    # Invalid enum value for file_category
    status, detail = post8({**base, "file_category": "badvalue"})
    if status == 422 and "enum" in detail:
        ok("file_category='badvalue' -> 422 (enum rejected)")
    elif status == 422:
        ok(f"file_category='badvalue' -> 422 ({detail[:80]})")
    else:
        fail(f"file_category='badvalue' -> {status} (expected 422): {detail[:80]}")

    # Valid body with real (non-available) upload_id → schema passes, upload state fails
    if upload_id:
        status, detail = post8({**base, "upload_id": upload_id})
        if status == 404 and "invalid state" in detail:
            ok(f"valid body + non-available upload_id -> 404 (schema passed, upload state check hit)")
        elif status == 404:
            ok(f"valid body + non-available upload_id -> 404 ({detail[:80]})")
        elif status == 200:
            fail("valid body -> 200 UNEXPECTEDLY PUBLISHED - check mod page!")
        else:
            warn(f"valid body + non-available upload_id -> {status}: {detail[:80]}")
    else:
        warn("No upload_id available - skipping valid-body schema-pass check")


# == Live OpenAPI spec drift check =============================================

_HTTP_METHODS = ("get", "post", "put", "patch", "delete")


def _operation_tier(op):
    """Return the stability badge name for an operation ('Stable' when unbadged)."""
    for badge in (op.get("x-badges") or []):
        name = badge.get("name")
        if name:
            return name
    return "Stable"


def run_spec_check(results):
    """Diff the live OpenAPI document against the catalog recorded in the docs.

    Needs no API key -- the spec is served unauthenticated. Catches new, renamed,
    and removed endpoints plus newly deprecated operations, none of which the
    endpoint-by-endpoint probes above can see."""

    def ok(msg):
        print(f"  {PASS} {msg}")
        results["pass"] += 1

    def fail(msg):
        print(f"  {FAIL} {msg}")
        results["fail"] += 1

    def warn(msg):
        print(f"  {WARN} {msg}")
        results["warn"] += 1

    print(f"\n=== Live OpenAPI Spec vs Documented Catalog ===")

    try:
        import yaml
    except ImportError:
        warn("PyYAML not installed - run 'pip install pyyaml' to enable --check-spec")
        return

    req = urllib.request.Request(NEXUS_SPEC_URL, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30, context=_SSL_CTX) as resp:
            spec = yaml.safe_load(resp.read())
    except (urllib.error.HTTPError, urllib.error.URLError, yaml.YAMLError) as e:
        fail(f"Could not fetch/parse {NEXUS_SPEC_URL}: {e}")
        return

    version = (spec.get("info") or {}).get("version")
    if version == SPEC_EXPECTED_VERSION:
        ok(f"info.version: {version}")
    else:
        warn(f"info.version: {version} (docs record {SPEC_EXPECTED_VERSION})")

    live_paths = set(spec.get("paths") or {})
    added = sorted(live_paths - SPEC_KNOWN_PATHS)
    removed = sorted(SPEC_KNOWN_PATHS - live_paths)

    if not added and not removed:
        ok(f"Path count {len(live_paths)} - catalog matches live spec exactly")
    else:
        for p in added:
            fail(f"NEW path not in docs: {p} - add it to resources/NEXUS_MODS_API.md")
        for p in removed:
            fail(f"Documented path GONE from spec: {p} - update resources/NEXUS_MODS_API.md")
        print(f"  {INFO} live spec has {len(live_paths)} paths, docs record {len(SPEC_KNOWN_PATHS)}")

    # Upload-flow endpoints -- Experimental tier, so they can vanish without notice.
    for path, method in sorted(SPEC_PIPELINE_PATHS.items()):
        op = (spec.get("paths") or {}).get(path, {}).get(method)
        if op is None:
            fail(f"UPLOAD FLOW BROKEN: {method.upper()} {path} no longer in spec")
        elif op.get("deprecated"):
            fail(f"UPLOAD FLOW: {method.upper()} {path} is now DEPRECATED - migrate")
        else:
            ok(f"{method.upper()} {path} present ({_operation_tier(op)})")

    # Deprecations -- the main thing this audit exists to catch early.
    live_deprecated = {}
    for path, ops in (spec.get("paths") or {}).items():
        for method, op in ops.items():
            if method not in _HTTP_METHODS:
                continue
            if op.get("deprecated") or _operation_tier(op) == "Deprecated":
                live_deprecated.setdefault(path, []).append(method.upper())

    new_deprecations = set(live_deprecated) - SPEC_KNOWN_DEPRECATIONS
    if new_deprecations:
        for path in sorted(new_deprecations):
            fail(
                f"NEW DEPRECATION: {'/'.join(live_deprecated[path])} {path} - "
                "check its description for a removal date and plan a migration"
            )
    else:
        ok(f"No new deprecations ({len(live_deprecated)} known deprecated path(s))")

    for path in sorted(set(live_deprecated) & SPEC_KNOWN_DEPRECATIONS):
        print(f"  {INFO} still deprecated (known): {'/'.join(live_deprecated[path])} {path}")

    tiers = {}
    for ops in (spec.get("paths") or {}).values():
        for method, op in ops.items():
            if method in _HTTP_METHODS:
                tiers[_operation_tier(op)] = tiers.get(_operation_tier(op), 0) + 1
    print(f"  {INFO} operations by tier: "
          + ", ".join(f"{t}={n}" for t, n in sorted(tiers.items())))


# == Entry point ===============================================================

def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--domain", default=DEFAULT_DOMAIN)
    parser.add_argument("--mod-id", type=int, default=DEFAULT_MOD_ID, dest="mod_id")
    parser.add_argument(
        "--test-upload",
        action="store_true",
        help="Also verify step 3 + step 7 upload session shapes (creates a dangling 1-byte session)",
    )
    parser.add_argument(
        "--check-spec",
        action="store_true",
        help="Also diff the live OpenAPI document against the documented endpoint catalog",
    )
    parser.add_argument(
        "--spec-only",
        action="store_true",
        help="With --check-spec, run only the spec diff (needs no API key)",
    )
    args = parser.parse_args()

    if args.spec_only and not args.check_spec:
        parser.error("--spec-only requires --check-spec")

    results = {"pass": 0, "fail": 0, "warn": 0}

    if not args.spec_only:
        api_key = _get_api_key()
        if not api_key:
            print("ERROR: NEXUS_API_KEY not found in env / registry")
            sys.exit(1)
        print(f"API key loaded ({len(api_key)} chars)")

        results, uid, group_id = run_read_only_checks(args.domain, args.mod_id, api_key)

        if args.test_upload:
            upload_id = run_upload_shape_checks(api_key, results)
            if group_id:
                run_step8_shape_checks(api_key, group_id, upload_id, results)
            else:
                print(f"\n  {WARN} No group_id - skipping step 8 checks")

    if args.check_spec:
        run_spec_check(results)

    print(f"\n=== Summary ===")
    total = results["pass"] + results["fail"]
    print(f"  Passed: {results['pass']}/{total}")
    print(f"  Failed: {results['fail']}/{total}")
    if results["warn"]:
        print(f"  Warnings: {results['warn']}")

    sys.exit(1 if results["fail"] else 0)


if __name__ == "__main__":
    main()
