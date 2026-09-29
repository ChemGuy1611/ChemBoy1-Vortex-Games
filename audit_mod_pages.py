"""
audit_mod_pages.py

Mechanical layer for the mod-page audit: checks every game-* extension's Nexus mod page
against the two-tag policy (Game Extension 4694 + AI Assisted 4902, no others), and
re-verifies via live GraphQL introspection that the mod-page "allow users to add
tags/images/videos" permission switches are still unreadable through any API tier.

Extension -> mod page mapping comes from each game's index.js EXTENSION_URL, not a
hardcoded domain. Nearly all extensions publish under the "site" domain, but at least
one (game-bloodborne) publishes under its own game's domain -- the numeric gameId each
domain needs for the GraphQL mod() query is resolved live and cached per domain, not
assumed to be site/2295 for everyone.

helper-* folders are in scope too (2026-09-27), same EXTENSION_URL mechanism as game-*.
Unlike game-*, a helper-* folder with no discoverable EXTENSION_URL is never treated as
"unreleased" -- every helper-* folder that exists is a real, already-shipped tool, so a
missing const there is a genuine index.js gap and is reported as a problem finding
instead of silently skipped. A folder with no index.js at all (a non-JS tool, e.g. a
bundled .bat script) can't be scanned this way and is reported the same way.

A second pass queries mods(filter: {uploaderId, gameDomainName: "site"}) for the whole
account to list mods with no local match: a newly published extension whose
EXTENSION_URL hasn't been filled in yet, a renamed/orphaned mod page, or a non-extension
mod uploaded under the same account (Anti-Stutter, XeSS, etc.). Named but never
tag-checked (2026-09-27 user call) -- the two-tag policy was never confirmed to apply
to these, so there is nothing to check yet, just something to keep visible.

Unreleased extensions (EXTENSION_URL unset/XXX/non-Nexus) are skipped -- no live page to
check. battlefield1 is excluded as frozen, same carve-out as the store-id audit. A
one-off exception can be parked with a marker on the EXTENSION_URL line:

    const EXTENSION_URL = "..."; //!audit-skip: modpage-tags - <reason>

This audit is read-only. No Nexus API tier can add/remove a mod tag or toggle a mod
page's media/tag permission switches (confirmed exhaustively across v1/v3 REST and v2
GraphQL -- see resources/NEXUS_GRAPHQL_API.md "What You Cannot Do"), so output is a
report + worklist for manual remediation on the site, never an auto-fix.

Usage:
    python audit_mod_pages.py                   # full report
    python audit_mod_pages.py --json             # machine-readable report
    python audit_mod_pages.py --show-suppressed  # also list suppressed/excluded entries

Environment variables:
    NEXUS_API_KEY  Required. Read from env var, with HKCU/HKLM registry fallback.

Exit code 1 if any non-suppressed extension has a missing/stray tag or a helper-*
folder has no resolvable mod-page URL, 0 otherwise.
"""

import argparse
import json
import os
import sys
import time

from vortex_utils import (
    REPO_ROOT, iter_game_folders, read_index_js, extract_game_id,
    extract_extension_url, parse_nexus_mod_url,
    audit_skip_lines, AUDIT_SKIP_MODPAGE,
    get_api_key, nexus_graphql,
)

TARGET_TAGS = {4694: "Game Extension", 4902: "AI Assisted"}

# Same carve-out as the store-id audit (feedback_store_id_audit) -- frozen, no more
# updates, excluded from bulk sweeps. See memory project_deprecated_extensions.
FROZEN_GAME_IDS = {"battlefield1": "frozen extension (project_deprecated_extensions)"}

HELPER_PREFIX = "helper-"

ALIAS_BATCH_SIZE = 30
BATCH_SLEEP_SECONDS = 0.5

# Field-name substrings that would indicate the "allow users to add tags/images/videos"
# mod-page permission switches have become readable (or writable) on the Mod type or
# outside the Collection-scoped mutation family. None of these existed as of 2026-09-27;
# a hit here is a schema change worth documenting immediately, not a false alarm.
PERMISSION_FIELD_HINTS = ("allowuser", "usertag", "usermedia", "manuallyverify", "userpermission")


def _make_entry(folder, game_id, src, url):
    """Build a live-extension dict from a resolved EXTENSION_URL, or None if the URL
    doesn't parse as a Nexus mod URL."""
    parsed = parse_nexus_mod_url(url)
    if not parsed:
        return None
    domain, mod_id = parsed
    suppress_reason = FROZEN_GAME_IDS.get(game_id)
    if not suppress_reason:
        skip_hits = audit_skip_lines(src, AUDIT_SKIP_MODPAGE)
        if skip_hits:
            suppress_reason = next(iter(skip_hits.values()))
    return {
        "game_id": game_id,
        "folder": folder,
        "domain": domain,
        "mod_id": mod_id,
        "url": url,
        "suppress_reason": suppress_reason,
        "no_url": None,
    }


def _no_url_entry(game_id, folder, reason):
    return {
        "game_id": game_id, "folder": folder, "domain": None, "mod_id": None,
        "url": None, "suppress_reason": None, "no_url": reason,
    }


def _get_local_extensions():
    """Yield one dict per game-*/helper-* folder that should carry a live Nexus mod
    page. Keys: game_id, folder, domain, mod_id, url, suppress_reason, no_url.

    game-* folders with no EXTENSION_URL are unreleased -- silently skipped, matching
    every other script's convention (most are pre-release test beds). helper-* folders
    are different: every one that exists is a real, already-shipped tool, so a missing
    EXTENSION_URL there is a genuine gap, yielded as a "no_url" problem entry instead."""
    for folder, game_id, src in iter_game_folders():
        url = extract_extension_url(src)
        if not url:
            continue  # unreleased -- no live mod page to check
        entry = _make_entry(folder, game_id, src, url)
        if entry:
            yield entry

    for name in sorted(os.listdir(REPO_ROOT)):
        if not name.startswith(HELPER_PREFIX):
            continue
        folder = os.path.join(REPO_ROOT, name)
        if not os.path.isdir(folder):
            continue
        src = read_index_js(folder)
        if src is None:
            yield _no_url_entry(name, folder, "no index.js in this folder -- can't read EXTENSION_URL")
            continue
        game_id = extract_game_id(src) or name
        url = extract_extension_url(src)
        if not url:
            yield _no_url_entry(game_id, folder, "index.js has no EXTENSION_URL const")
            continue
        entry = _make_entry(folder, game_id, src, url)
        if entry:
            yield entry
        else:
            yield _no_url_entry(game_id, folder, f"EXTENSION_URL does not parse as a Nexus mod URL: {url!r}")


def _resolve_game_ids(domains, api_key):
    """Return {domain: numeric_gameId} for every domain in the iterable, via one
    aliased GraphQL request (or zero requests if all domains already known)."""
    domains = sorted(set(domains))
    if not domains:
        return {}
    fields = "\n".join(
        f'd{i}: game(domainName: "{d}") {{ id domainName }}' for i, d in enumerate(domains)
    )
    resp = nexus_graphql(f"query {{ {fields} }}", api_key=api_key)
    if resp.get("errors"):
        raise RuntimeError(f"game id resolution failed: {resp['errors']}")
    data = resp.get("data") or {}
    result = {}
    for i, d in enumerate(domains):
        node = data.get(f"d{i}")
        if node and node.get("id") is not None:
            result[d] = node["id"]
        else:
            print(f"  WARNING: could not resolve numeric gameId for domain {d!r} -- "
                  f"its extensions will be skipped")
    return result


def _fetch_mod_pages(extensions, game_ids_by_domain, api_key):
    """Batch-fetch {(domain, mod_id): {name, status, tag_ids: {id: name}}} via aliased
    mod() queries, ALIAS_BATCH_SIZE per request."""
    targets = [e for e in extensions if e["domain"] in game_ids_by_domain]
    result = {}
    for start in range(0, len(targets), ALIAS_BATCH_SIZE):
        batch = targets[start:start + ALIAS_BATCH_SIZE]
        fields = "\n".join(
            f'm{i}: mod(gameId: {game_ids_by_domain[e["domain"]]}, modId: {e["mod_id"]}) '
            f'{{ modId name status tags {{ id name }} }}'
            for i, e in enumerate(batch)
        )
        resp = nexus_graphql(f"query {{ {fields} }}", api_key=api_key)
        for i, e in enumerate(batch):
            key = (e["domain"], e["mod_id"])
            node = (resp.get("data") or {}).get(f"m{i}")
            if node is None:
                result[key] = {"error": "not found / query error"}
                continue
            result[key] = {
                "name": node.get("name"),
                "status": node.get("status"),
                # LegacyTag.id is GraphQL ID -- serializes as a numeric STRING ("4694"),
                # not an int. Cast here so it compares equal to TARGET_TAGS' int keys.
                "tag_ids": {int(t["id"]): t["name"] for t in (node.get("tags") or [])},
            }
        if start + ALIAS_BATCH_SIZE < len(targets):
            time.sleep(BATCH_SLEEP_SECONDS)
    return result


def _fetch_account_site_mods(api_key):
    """Return {mod_id: name} for every mod on the site domain under this account,
    paginated past the 80-per-request server cap. Used only to name mods with no local
    game-* match (non-extension mods) -- their tags are never checked, those are out of
    scope on purpose (2026-09-27 user call: list the names, skip the tags -- this pass
    isn't a worklist). Other domains (e.g. bloodborne) are not swept this way since
    there is no cheap "every mod this account owns, any domain" query."""
    user = None
    try:
        from vortex_utils import nexus_get_current_user
        user = nexus_get_current_user(api_key)
    except Exception as e:
        print(f"  WARNING: could not resolve account user id ({e}) -- "
              f"skipping the account-wide extra-mods pass")
        return {}
    uploader_id = user.get("user_id")
    if not uploader_id:
        print("  WARNING: v1 validate response had no user_id -- skipping account-wide pass")
        return {}

    mods = {}
    offset = 0
    while True:
        query = f"""
        query {{
            mods(filter: {{ uploaderId: [{{ value: "{uploader_id}", op: EQUALS }}]
                            gameDomainName: [{{ value: "site", op: EQUALS }}] }}
                 count: 80, offset: {offset}) {{
                totalCount
                nodes {{ modId name }}
            }}
        }}"""
        resp = nexus_graphql(query, api_key=api_key)
        if resp.get("errors"):
            print(f"  WARNING: account-wide mods() query failed: {resp['errors']}")
            break
        page = (resp.get("data") or {}).get("mods") or {}
        nodes = page.get("nodes") or []
        for n in nodes:
            mods[n["modId"]] = n["name"]
        if len(nodes) < 80 or offset + 80 >= (page.get("totalCount") or 0):
            break
        offset += 80
        time.sleep(BATCH_SLEEP_SECONDS)
    return mods


def check_permission_visibility(api_key):
    """Live-introspect the Mod type + top-level Mutation type. Returns (visible, hits)
    where hits lists any field name that matches PERMISSION_FIELD_HINTS -- i.e. any sign
    the user-tag/user-media permission switches have become API-visible since the last
    run. Empty hits = still confirmed unreadable, matching resources/NEXUS_GRAPHQL_API.md."""
    query = """
    query {
        modType: __type(name: "Mod") { fields(includeDeprecated: true) { name } }
        mutType: __type(name: "Mutation") { fields(includeDeprecated: true) { name } }
    }"""
    resp = nexus_graphql(query, api_key=api_key)
    if resp.get("errors"):
        raise RuntimeError(f"permission-visibility introspection failed: {resp['errors']}")
    data = resp.get("data") or {}
    mod_fields = [f["name"] for f in (data.get("modType") or {}).get("fields", [])]
    mut_fields = [f["name"] for f in (data.get("mutType") or {}).get("fields", [])
                  if "collection" not in f["name"].lower()]
    hits = [f"Mod.{f}" for f in mod_fields if any(h in f.lower() for h in PERMISSION_FIELD_HINTS)]
    hits += [f"Mutation.{f}" for f in mut_fields if any(h in f.lower() for h in PERMISSION_FIELD_HINTS)]
    return (len(hits) == 0), hits


def run_audit(api_key):
    extensions = list(_get_local_extensions())
    no_url = [e for e in extensions if e["no_url"]]
    live = [e for e in extensions if not e["no_url"] and not e["suppress_reason"]]
    suppressed = [e for e in extensions if not e["no_url"] and e["suppress_reason"]]

    game_ids_by_domain = _resolve_game_ids((e["domain"] for e in live), api_key)
    pages = _fetch_mod_pages(live, game_ids_by_domain, api_key)
    account_site_mods = _fetch_account_site_mods(api_key)

    findings = [{**e, "problem": e["no_url"]} for e in no_url]
    ok = []
    for e in live:
        key = (e["domain"], e["mod_id"])
        page = pages.get(key)
        if page is None:
            findings.append({**e, "problem": "no numeric gameId for its domain -- not checked"})
            continue
        if "error" in page:
            findings.append({**e, "problem": page["error"]})
            continue
        have = set(page["tag_ids"])
        missing = [TARGET_TAGS[t] for t in TARGET_TAGS if t not in have]
        extra = [name for tid, name in page["tag_ids"].items() if tid not in TARGET_TAGS]
        if missing or extra:
            findings.append({**e, "name": page["name"], "status": page["status"],
                              "missing": missing, "extra": extra})
        else:
            ok.append({**e, "name": page["name"]})

    matched_mod_ids = {e["mod_id"] for e in extensions if e["domain"] == "site"}
    extra_account_mods = {mid: name for mid, name in account_site_mods.items()
                           if mid not in matched_mod_ids}

    perm_visible, perm_hits = check_permission_visibility(api_key)

    return {
        "ok": ok,
        "findings": findings,
        "suppressed": suppressed,
        "extra_account_mods": extra_account_mods,
        "permission_switches_visible": perm_visible,
        "permission_hits": perm_hits,
    }


def print_report(report, show_suppressed):
    print("=== Mod Page Audit ===\n")

    print(f"OK (exactly Game Extension + AI Assisted): {len(report['ok'])}")

    findings = report["findings"]
    if findings:
        print(f"\nNeeds attention ({len(findings)}):")
        for f in findings:
            label = f.get("name") or f["game_id"]
            where = f"{f['domain']}/mods/{f['mod_id']}" if f.get("mod_id") is not None \
                else os.path.basename(f["folder"])
            print(f"  - {f['game_id']} ({label}) -- {where}")
            if "problem" in f:
                print(f"      {f['problem']}")
                continue
            if f.get("status") and f["status"] != "published":
                print(f"      status: {f['status']}")
            if f["missing"]:
                print(f"      missing: {', '.join(f['missing'])}")
            if f["extra"]:
                print(f"      stray tags: {', '.join(f['extra'])}")
    else:
        print("\nNeeds attention: none")

    suppressed = report["suppressed"]
    print(f"\nSuppressed/excluded: {len(suppressed)}")
    if show_suppressed:
        for s in suppressed:
            print(f"  - {s['game_id']} ({s['domain']}/mods/{s['mod_id']}): {s['suppress_reason']}")

    extras = report["extra_account_mods"]
    print(f"\nMods on the account (site domain) with no local game-* match: {len(extras)}")
    for mid, name in sorted(extras.items()):
        print(f"  - site/mods/{mid}: {name}")
    if extras:
        print("  (names only -- tags not checked, out of scope until the policy is confirmed for these)")

    print("\nUser-tag / user-media permission switches:")
    if report["permission_switches_visible"]:
        print("  Still confirmed unreadable via any API tier (Mod type + non-Collection "
              "mutations checked live) -- stays a manual per-page check on the site.")
    else:
        print("  NEW: schema now exposes possible permission field(s) -- investigate before "
              "trusting the old 'API can't see this' assumption:")
        for h in report["permission_hits"]:
            print(f"    {h}")


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--json", action="store_true", help="Emit a JSON report instead of text")
    parser.add_argument("--show-suppressed", action="store_true",
                         help="List suppressed/excluded extensions, not just the count")
    args = parser.parse_args()

    api_key = get_api_key("NEXUS_API_KEY")
    if not api_key:
        print("ERROR: NEXUS_API_KEY not found in env / registry")
        sys.exit(1)

    report = run_audit(api_key)

    if args.json:
        out = dict(report)
        if not args.show_suppressed:
            out["suppressed"] = [{"game_id": s["game_id"], "reason": s["suppress_reason"]}
                                  for s in out["suppressed"]]
        print(json.dumps(out, indent=2))
    else:
        print_report(report, args.show_suppressed)

    sys.exit(1 if report["findings"] else 0)


if __name__ == "__main__":
    main()
