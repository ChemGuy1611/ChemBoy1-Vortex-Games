#!/usr/bin/env python3
"""
release_scope.py
----------------
Survey before a bulk release: which game-* extensions can be uploaded to Nexus, what state
each is in, and whether the local numbers agree with what Nexus publishes. Read-only.

One pass answers what the release runbook otherwise needs several ad-hoc checks for:

  1. Eligibility -- vortex_utils.releasable_game_ids(): a real Nexus page in EXTENSION_URL,
     minus the never-upload games (test beds, personal-use builds), deprecated ones and any
     --exclude id. Every other game is listed with the reason it is out.
  2. Local version vs Nexus -- one call to the public /v3/vortex/extensions feed (no key).
     equal = bump-ready; AHEAD = bumped but never uploaded (fold into that version, do not
     double-bump); BEHIND = attention. A page the feed has no row for (a slot held by another
     author, a page on a game domain) is looked up in the v1 file list when NEXUS_API_KEY
     is set, otherwise reported as unknown.
  3. gameId -- info.json "gameId" must be a positive integer and equal the feed's numeric
     game_id for the same extension. Missing, invalid and disagreeing ids are attention items.
  4. modId -- info.json "modId" must be a positive integer equal to the mod id at the end of
     the game's EXTENSION_URL. Local only (no Nexus call): release_extension.py would rewrite
     a missing, placeholder or wrong value anyway, so this shows what the release will change.
  5. CHANGELOG -- how many games hold a done Planned Improvements bullet that
     bump_version.py --move-planned would move in, how many would be left with a bare stub
     (needs --note or hand-written text before release_extension.py accepts it), and how many
     are already bumped with a bare stub.

Usage:
    python release_scope.py
    python release_scope.py --exclude ID [ID ...]
    python release_scope.py --ids
    python release_scope.py --bullets
    python release_scope.py --offline
    python release_scope.py --verify-files
    python release_scope.py --json

Options:
    --exclude ID ...  Leave these ids out as well (for example an extension blocked on an
                      external tool). Everything else comes from vortex_utils.
    --ids             Print only the eligible ids, space separated, for use in a shell
                      command: python bump_version.py --patch $(python release_scope.py --ids)
                      Local only; makes no Nexus call.
    --bullets         Also list the Planned Improvements bullets that --move-planned would
                      leave behind, grouped by text: a done bullet worded outside its
                      Fixed:/Added:/Changed: pattern shows up here and has to be moved by hand.
    --offline         Skip every Nexus call (the version and gameId comparison is then unknown).
    --verify-files    Read each game's MAIN file version from the v1 file list instead of the
                      feed (one API call per game, so a few minutes for ~270 games; needs
                      NEXUS_API_KEY). The feed is a cached snapshot that can trail an upload by
                      hours, so use this to confirm a bulk release actually landed.
    --json           Print the survey as JSON instead of text.

Environment variables:
    NEXUS_API_KEY     Optional. Looks up the published version of the few pages the public
                      feed has no row for. Without it those are reported as unknown.
                      Required for --verify-files.

Exit code: 1 when an attention item exists (a local version BEHIND Nexus, or a missing,
invalid or disagreeing gameId or modId), otherwise 0.
"""

import argparse
import collections
import json
import re
import sys

import vortex_utils as vu


def _vkey(version):
    """Sort key for an X.Y.Z version, or None when it is not plain semver."""
    if not isinstance(version, str) or not vu.is_valid_semver(version):
        return None
    return tuple(int(p) for p in version.split("."))


def _main_file_version(domain, mod_id, api_key):
    """Version of the newest MAIN file on a mod page via the v1 file list, or None."""
    try:
        files = vu.nexus_get_mod_files(domain, mod_id, api_key)
    except Exception:
        return None
    main = [f for f in files if str(f.get("category_name", "")).upper() == "MAIN"]
    if not main:
        return None
    return max(main, key=lambda f: f.get("uploaded_timestamp", 0)).get("version")


def survey(exclude, offline, verify=False):
    """Collect the whole survey as a plain dict. verify = read every eligible game's MAIN file
    version from the v1 file list instead of trusting the feed (needs an API key)."""
    eligible = vu.releasable_game_ids(exclude)
    eligible_set = set(eligible)

    feed_rows = {}
    feed_error = None
    if not offline:
        try:
            for row in vu.fetch_vortex_extensions_feed()["data"]["extensions"]:
                feed_rows[str(row.get("mod_id"))] = row
        except Exception as exc:
            feed_error = str(exc)
    api_key = None if offline else vu.get_api_key("NEXUS_API_KEY")

    out = {
        "game_folders": 0, "eligible": eligible, "not_eligible": {},
        "feed_rows": len(feed_rows), "feed_error": feed_error,
        "versions": {"equal": [], "ahead": [], "behind": [], "unknown": []},
        "game_id": {"ok": 0, "missing": [], "invalid": [], "disagree": []},
        "mod_id": {"ok": 0, "missing": [], "invalid": [], "disagree": []},
        "changelog": {"move_planned": [], "bare_stub": [], "bumped_bare": []},
        "left_behind": collections.defaultdict(list),
    }
    for folder, gid, src in vu.iter_game_folders():
        out["game_folders"] += 1
        if gid not in eligible_set:
            if gid in vu.NEVER_UPLOAD_GAMES:
                why = "never uploaded (test bed / personal-use)"
            elif gid in vu.DEPRECATED_GAMES:
                why = "deprecated"
            elif gid in exclude:
                why = "left out with --exclude"
            else:
                why = "no Nexus page (EXTENSION_URL unset)"
            out["not_eligible"][gid] = why
            continue

        info = vu.read_info_json(folder) or {}
        local = info.get("version")
        url = vu.extract_extension_url(src)
        domain, mod_id = vu.parse_nexus_mod_url(url) or (None, None)
        row = feed_rows.get(str(mod_id))

        # -- published version --
        published = row.get("version") if row else None
        if api_key and (row is None or verify):
            file_version = _main_file_version(domain, mod_id, api_key)
            if file_version is not None:
                published = file_version
        if offline or feed_error:
            out["versions"]["unknown"].append({"id": gid, "why": "offline"})
        elif published is None:
            out["versions"]["unknown"].append({"id": gid, "why": "no feed row; set NEXUS_API_KEY to look it up"})
        elif _vkey(local) is None or _vkey(published) is None:
            out["versions"]["unknown"].append({"id": gid, "why": f"not plain semver: local {local} / Nexus {published}"})
        elif _vkey(local) == _vkey(published):
            out["versions"]["equal"].append(gid)
        elif _vkey(local) > _vkey(published):
            out["versions"]["ahead"].append({"id": gid, "local": local, "nexus": published})
        else:
            out["versions"]["behind"].append({"id": gid, "local": local, "nexus": published})

        # -- gameId --
        local_gid = info.get("gameId")
        if "gameId" not in info:
            out["game_id"]["missing"].append(gid)
        elif not vu.is_valid_nexus_game_id(local_gid):
            out["game_id"]["invalid"].append({"id": gid, "value": local_gid})
        elif row is not None and row.get("game_id") is not None and int(row["game_id"]) != local_gid:
            out["game_id"]["disagree"].append({"id": gid, "local": local_gid, "nexus": int(row["game_id"])})
        else:
            out["game_id"]["ok"] += 1

        # -- modId --
        local_mid = info.get("modId")
        if "modId" not in info:
            out["mod_id"]["missing"].append(gid)
        elif not vu.is_valid_nexus_game_id(local_mid):  # same rule: a positive int, bool excluded
            out["mod_id"]["invalid"].append({"id": gid, "value": local_mid})
        elif local_mid != mod_id:
            out["mod_id"]["disagree"].append({"id": gid, "local": local_mid, "url": mod_id})
        else:
            out["mod_id"]["ok"] += 1

        # -- changelog --
        shipped, left = vu.split_planned_bullets(folder)
        if shipped:
            out["changelog"]["move_planned"].append(gid)
        else:
            out["changelog"]["bare_stub"].append(gid)
        for bullet in left:
            if re.fullmatch(r"-\s*None( Planned)?", bullet.strip(), re.IGNORECASE):
                continue
            out["left_behind"][bullet.replace("\n", " ")].append(gid)
        try:
            with open(f"{folder}/CHANGELOG.md", encoding="utf-8") as f:
                section = re.search(r"^## \[" + re.escape(str(local)) + r"\][^\n]*\n(.*?)(?=^## |\Z)",
                                    f.read(), re.MULTILINE | re.DOTALL)
            if section and vu.changelog_entry_is_empty(section.group(1)):
                out["changelog"]["bumped_bare"].append(gid)
        except OSError:
            pass

    out["attention"] = bool(out["versions"]["behind"]
                            or any(out[k][s] for k in ("game_id", "mod_id")
                                   for s in ("missing", "invalid", "disagree")))
    return out


def _ids(items):
    return ", ".join(i["id"] if isinstance(i, dict) else i for i in items)


def _print_capped(rows, line, limit=15):
    """Print line(row) for the first `limit` rows, then a count of the rest (--json lists all)."""
    for row in rows[:limit]:
        print(f"    {line(row)}")
    if len(rows) > limit:
        print(f"    ... and {len(rows) - limit} more (--json lists all)")


def print_report(s, show_bullets):
    print(f"Release scope: {s['game_folders']} game folders\n")
    print(f"Eligible for upload : {len(s['eligible'])}")
    print(f"Not eligible        : {len(s['not_eligible'])}")
    for gid, why in sorted(s["not_eligible"].items()):
        print(f"  {gid:<34} {why}")

    v = s["versions"]
    print("\nLocal version vs Nexus" + (f" ({s['feed_rows']} feed rows)" if s["feed_rows"] else ""))
    if s["feed_error"]:
        print(f"  WARNING - could not read the Nexus feed: {s['feed_error']}")
    print(f"  equal (bump-ready)        : {len(v['equal'])}")
    print(f"  AHEAD (bumped, unreleased): {len(v['ahead'])}")
    _print_capped(v["ahead"], lambda r: f"{r['id']}: local {r['local']}, Nexus {r['nexus']}")
    print(f"  BEHIND                    : {len(v['behind'])}")
    _print_capped(v["behind"], lambda r: f"{r['id']}: local {r['local']}, Nexus {r['nexus']}")
    print(f"  unknown                   : {len(v['unknown'])}")
    _print_capped(v["unknown"], lambda r: f"{r['id']}: {r['why']}")

    g = s["game_id"]
    print(f"\ninfo.json gameId: ok {g['ok']} | missing {len(g['missing'])} | invalid {len(g['invalid'])} "
          f"| disagrees with Nexus {len(g['disagree'])}")
    for gid in g["missing"]:
        print(f"    {gid}: no gameId")
    for r in g["invalid"]:
        print(f"    {r['id']}: invalid value {r['value']!r}")
    for r in g["disagree"]:
        print(f"    {r['id']}: local {r['local']}, Nexus {r['nexus']}")

    m = s["mod_id"]
    print(f"\ninfo.json modId: ok {m['ok']} | missing {len(m['missing'])} | invalid {len(m['invalid'])} "
          f"| differs from EXTENSION_URL {len(m['disagree'])}")
    _print_capped(m["missing"], lambda gid: f"{gid}: no modId")
    _print_capped(m["invalid"], lambda r: f"{r['id']}: invalid value {r['value']!r}")
    _print_capped(m["disagree"], lambda r: f"{r['id']}: local {r['local']}, EXTENSION_URL {r['url']}")

    c = s["changelog"]
    print("\nCHANGELOG")
    print(f"  done Planned bullets that --move-planned moves in : {len(c['move_planned'])} game(s)"
          + (f" ({_ids(c['move_planned'])})" if 0 < len(c["move_planned"]) <= 8 else ""))
    print(f"  stub would stay bare after a bump (use --note)    : {len(c['bare_stub'])} game(s)")
    print(f"  already bumped, [version] stub still bare         : {len(c['bumped_bare'])} game(s)"
          + (f" ({_ids(c['bumped_bare'])})" if 0 < len(c["bumped_bare"]) <= 8 else ""))

    if show_bullets:
        print("\nPlanned bullets --move-planned would leave behind (move a done one by hand):")
        if not s["left_behind"]:
            print("  none")
        for text, games in sorted(s["left_behind"].items(), key=lambda kv: -len(kv[1])):
            print(f"  {len(games):3d} game(s) | {text[:150]}")
            if len(games) <= 6:
                print(f"              {', '.join(games)}")

    print()
    print("Attention: " + ("yes - see BEHIND / gameId / modId above." if s["attention"] else "none."))


def main():
    parser = argparse.ArgumentParser(description="Survey the game extensions before a bulk Nexus release.")
    parser.add_argument("--exclude", nargs="+", default=[], metavar="ID",
                        help="Extra game ids to leave out (for example one blocked on an external tool).")
    parser.add_argument("--ids", action="store_true",
                        help="Print only the eligible ids, space separated. Local only.")
    parser.add_argument("--bullets", action="store_true",
                        help="Also list the Planned bullets --move-planned would leave behind.")
    parser.add_argument("--offline", action="store_true", help="Skip every Nexus call.")
    parser.add_argument("--verify-files", action="store_true",
                        help="Read each game's MAIN file version from the v1 file list instead of the feed.")
    parser.add_argument("--json", action="store_true", help="Print the survey as JSON.")
    args = parser.parse_args()

    if args.ids:
        print(" ".join(vu.releasable_game_ids(args.exclude)))
        return

    if args.verify_files and (args.offline or not vu.get_api_key("NEXUS_API_KEY")):
        parser.error("--verify-files needs NEXUS_API_KEY and cannot be combined with --offline")
    s = survey(set(args.exclude), args.offline, args.verify_files)
    if args.json:
        s["left_behind"] = dict(s["left_behind"])
        print(json.dumps(s, indent=2))
    else:
        print_report(s, args.bullets)
    sys.exit(1 if s["attention"] else 0)


if __name__ == "__main__":
    main()
