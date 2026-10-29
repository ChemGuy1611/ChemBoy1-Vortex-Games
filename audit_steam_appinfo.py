"""
audit_steam_appinfo.py

Cross-checks the hand-set path constants of every template-ue4-5 game extension against
Steam's own appinfo (launch entries and Steam Cloud save paths), fetched from the
steamcmd.net mirror (see resources/STEAMCMD_API.md). It is the same inference
new_extension.py uses when scaffolding, run backwards over extensions that already exist.

Checks per game (games with a numeric STEAMAPP_ID and a literal EPIC_CODE_NAME):
  - EPIC_CODE_NAME   vs the project folder inferred from Steam (steam_ue_code_name)
  - EXEC             vs Steam's Windows launch executables
  - save location    Steam Cloud root "gameinstall" (saves inside the game folder) vs an
                     extension that points saves at Local AppData, and the reverse
  - DATA_FOLDER      vs the folder before Saved/ in Steam Cloud's Local AppData entries

Findings are split by how much the Steam side can be trusted:
  Likely wrong  the Steam source matched the hand-set value on every extension when this
                audit was built (a Binaries/ launch path or a game-folder cloud path for
                the code name; a cloud config whose only save root is the game folder).
                A game-folder root listed NEXT TO a Local AppData one is only "Verify":
                Steam syncs both, and most such games write to Local AppData.
  Verify        weaker sources: cloud folder NAMES can be stale (Of Ash and Steel's says
                ofAshAndSteel, the game writes ofAshAndSteelGame), launch exes can be a
                launcher, and internal code names (Polaris, Indiana) appear nowhere in
                appinfo. Confirm against PCGamingWiki or a real install before editing.

Deprecated extensions (resources/lists/games-deprecated.txt) are skipped. A deliberate
difference can be parked with a marker anywhere in the extension's index.js:

    //!audit-skip: steam-appinfo - <reason>

Read-only: prints a report, never edits an extension.

--dump PATH skips the audit and saves the raw appinfo instead: one record per game with a
numeric STEAMAPP_ID, across EVERY game-* extension (any template), keyed by folder id
({"liesofp": {...appinfo...}}). A game whose fetch failed or whose app is unknown gets {}.
PATH "-" writes to stdout. Use it to survey appinfo fields across the repo offline.

Usage:
    python audit_steam_appinfo.py                  # every UE4-5 game
    python audit_steam_appinfo.py liesofp tekken8  # just these games
    python audit_steam_appinfo.py --json           # machine-readable report
    python audit_steam_appinfo.py --show-suppressed
    python audit_steam_appinfo.py --dump appinfo.json            # every game, raw appinfo
    python audit_steam_appinfo.py --dump - liesofp tekken8      # just these, to stdout

Exit code 1 if anything lands under "Likely wrong", 0 otherwise (--dump: always 0).
Progress and fetch errors go to stderr, so --json and --dump - output on stdout always
parses.
"""

import argparse
import json
import os
import re
import sys
import time

from vortex_utils import (
    REPO_ROOT, LISTS_DIR, GAME_PREFIX, DEPRECATED_GAMES, AUDIT_SKIP_STEAM_APPINFO,
    read_index_js, const_value, read_id_list, audit_skip_lines, iter_game_folders,
    fetch_steam_appinfo, steam_launch_exes, steam_cloud_saves, steam_cloud_folder, steam_game_exe,
    steam_ue_code_name, describe_steam_cloud_saves, STEAM_CODE_NAME_SURE_SOURCES,
    STEAM_CLOUD_STORE_FOLDERS,
)

UE_LIST = os.path.join(LISTS_DIR, "games-ue4-5.txt")
REQUEST_DELAY = 0.15


def _strip_quotes(raw):
    m = re.fullmatch(r"""(["'`])(.*)\1""", raw or "")
    return m.group(2) if m else None


def resolve_path_const(raw, code):
    """Resolve a template-ue4-5 path const RHS to a forward-slash string.
    Handles a quoted literal, `${EPIC_CODE_NAME}...` template literals, a bare
    EPIC_CODE_NAME and path.join(...) over those. None when it can't be resolved
    statically (another const, a function call)."""
    if raw is None:
        return None
    raw = raw.strip()
    if raw == "EPIC_CODE_NAME":
        return code
    literal = _strip_quotes(raw)
    if literal is not None:
        return literal.replace("${EPIC_CODE_NAME}", code).replace("\\\\", "/").replace("\\", "/")
    m = re.fullmatch(r"path\.join\((.*)\)", raw)
    if m:
        parts = [resolve_path_const(p, code) for p in m.group(1).split(",")]
        return "/".join(parts) if all(parts) else None
    return None


def audit_game(game_id, src):
    """Return (findings, skip_reason). findings = list of {level, check, detail}."""
    steam_id = _strip_quotes(const_value(src, "STEAMAPP_ID") or "")
    code = _strip_quotes(const_value(src, "EPIC_CODE_NAME") or "")
    if not steam_id or not steam_id.isdigit():
        return [], "no Steam ID"
    if not code or code.startswith("XXX"):
        return [], "EPIC_CODE_NAME unset"
    info = fetch_steam_appinfo(steam_id)
    time.sleep(REQUEST_DELAY)
    if not info:
        return [], "no appinfo from steamcmd.net"
    exes, saves = steam_launch_exes(info), steam_cloud_saves(info)
    findings = []

    def add(level, check, detail):
        findings.append({"level": level, "check": check, "detail": detail})

    inferred, source = steam_ue_code_name(exes, saves)
    if inferred and inferred.lower() != code.lower():
        level = "likely" if source in STEAM_CODE_NAME_SURE_SOURCES else "verify"
        add(level, "EPIC_CODE_NAME", f"{code!r} but {source} says {inferred!r}")

    exe = resolve_path_const(const_value(src, "EXEC"), code)
    # every Steam launch entry being a launcher/anti-cheat wrapper leaves nothing to compare
    # (EXEC is then hand-set to the shipping exe on purpose)
    if exe and steam_game_exe(exes)[0]:
        names = {e.lower() for e in exes} | {e.split("/")[-1].lower() for e in exes}
        if exe.lower() not in names and exe.split("/")[-1].lower() not in names:
            add("verify", "EXEC", f"{exe!r} is not a Steam launch exe ({', '.join(exes)})")

    in_game_folder = "Game Folder" in (const_value(src, "SAVE_LOC") or "") or "SAVE_PATH_GAME" in src
    unreal_saves = [e for e in saves if steam_cloud_folder(e)]
    roots = {e["root"] for e in unreal_saves}
    data_folder = resolve_path_const(const_value(src, "DATA_FOLDER"), code)
    # a separate save folder (game-specific SAVE_DATA_FOLDER const) counts as a match too
    save_data_folder = resolve_path_const(const_value(src, "SAVE_DATA_FOLDER"), code)
    known = {f.lower() for f in (data_folder, save_data_folder) if f}

    def matches_extension(entry):
        # cloud folder equal to, or ending in, the extension's folder ("My Games/Borderlands 4")
        folder = (steam_cloud_folder(entry) or "").lower()
        return any(folder == k or folder.endswith("/" + k) for k in known)

    if roots == {"gameinstall"} and not in_game_folder:
        add("likely", "save location",
            f"Steam Cloud saves only in the game folder, extension uses Local AppData "
            f"({describe_steam_cloud_saves(unreal_saves)})")
    elif "gameinstall" in roots and not in_game_folder and not any(
        matches_extension(e) for e in unreal_saves if e["root"] != "gameinstall"
    ):
        # Steam syncs every listed root, so a game-folder entry next to a Local AppData one
        # decides nothing - only flag it when the extension's folder matches neither entry
        add("verify", "save location",
            f"Steam Cloud lists the game folder AND {', '.join(sorted(roots - {'gameinstall'}))} - "
            f"check PCGamingWiki ({describe_steam_cloud_saves(unreal_saves)})")
    if in_game_folder and unreal_saves and all(e["root"] == "WinAppDataLocal" for e in unreal_saves):
        add("verify", "save location",
            f"extension saves in the game folder, Steam Cloud says Local AppData "
            f"({describe_steam_cloud_saves(unreal_saves)})")

    local = sorted({steam_cloud_folder(e) for e in unreal_saves if e["root"] == "WinAppDataLocal"})
    if data_folder and local and not known & {f.lower() for f in local}:
        add("verify", "DATA_FOLDER", f"{data_folder!r} but Steam Cloud Local AppData folder is {', '.join(local)}")

    # a store folder between the game's folder and Saved/ ("Bloodlines2/Steam/Saved") needs a
    # per-store path in the extension; without one, config and save mods miss on every store
    store_layer = re.search(r"\b(STORE_FOLDERS|DISCOVERY_STORE)\b", src)
    for e in unreal_saves:
        segs = [s for s in e["path"].split("/") if s]
        before = segs[segs.index("Saved") - 1] if "Saved" in segs and segs.index("Saved") > 0 else ""
        if e["root"] == "WinAppDataLocal" and before.lower() in STEAM_CLOUD_STORE_FOLDERS and not store_layer:
            add("likely", "store folder",
                f"Steam Cloud path has a {before!r} store folder before Saved/ ({e['path']}), "
                f"extension builds no per-store path")
            break

    return findings, None


def dump_appinfo(game_ids, path):
    """Fetch the raw appinfo of every non-deprecated game-* extension with a numeric
    STEAMAPP_ID (or only game_ids) and write {folder_id: record} as JSON to path
    ("-" = stdout). Returns the number of records written."""
    wanted = set(game_ids)
    targets = []
    for folder, _, src in iter_game_folders():
        game_id = os.path.basename(folder)[len(GAME_PREFIX):]
        if (wanted and game_id not in wanted) or game_id in DEPRECATED_GAMES:
            continue
        steam_id = _strip_quotes(const_value(src, "STEAMAPP_ID") or "")
        if steam_id and steam_id.isdigit():
            targets.append((game_id, steam_id))
    for missing in sorted(wanted - {g for g, _ in targets}):
        print(f"  {missing}: no game-{missing} folder with a numeric STEAMAPP_ID, skipped",
              file=sys.stderr)

    records = {}
    for n, (game_id, steam_id) in enumerate(targets, 1):
        print(f"[{n}/{len(targets)}] {game_id}", file=sys.stderr)
        records[game_id] = fetch_steam_appinfo(steam_id)
        time.sleep(REQUEST_DELAY)

    text = json.dumps(records, indent=1, sort_keys=True)
    if path == "-":
        print(text)
    else:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text + "\n")
    empty = sum(1 for r in records.values() if not r)
    print(f"Wrote {len(records)} appinfo records ({empty} empty) to {path}", file=sys.stderr)
    return len(records)


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("game_ids", nargs="*",
                        help="Bare game ids (default: every UE4-5 game; with --dump, every game)")
    parser.add_argument("--json", action="store_true", help="Emit a JSON report instead of text")
    parser.add_argument("--show-suppressed", action="store_true",
                        help="Also list findings parked with an audit-skip marker")
    parser.add_argument("--dump", metavar="PATH",
                        help="Skip the audit; save raw appinfo of every game with a Steam ID "
                             "to PATH as JSON ('-' = stdout)")
    args = parser.parse_args()

    if args.dump:
        dump_appinfo(args.game_ids, args.dump)
        return 0

    ids = args.game_ids or read_id_list(UE_LIST)
    report = {"likely": [], "verify": [], "suppressed": [], "skipped": [], "checked": 0}
    for n, game_id in enumerate(ids, 1):
        if game_id in DEPRECATED_GAMES:
            report["skipped"].append({"game": game_id, "reason": "deprecated"})
            continue
        src = read_index_js(os.path.join(REPO_ROOT, f"{GAME_PREFIX}{game_id}"))
        if not src:
            report["skipped"].append({"game": game_id, "reason": "no index.js"})
            continue
        print(f"[{n}/{len(ids)}] {game_id}", file=sys.stderr)
        findings, skip = audit_game(game_id, src)
        if skip:
            report["skipped"].append({"game": game_id, "reason": skip})
            continue
        report["checked"] += 1
        parked = audit_skip_lines(src, AUDIT_SKIP_STEAM_APPINFO)
        for f in findings:
            row = {"game": game_id, **f}
            if parked:
                row["reason"] = next(iter(parked.values()))
                report["suppressed"].append(row)
            else:
                report[f["level"]].append(row)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"\nChecked {report['checked']} games, skipped {len(report['skipped'])}.")
        for key, title in (("likely", "Likely wrong"), ("verify", "Verify (weaker Steam source)")):
            print(f"\n{title} ({len(report[key])}):")
            for r in report[key]:
                print(f"  {r['game']:40} {r['check']:15} {r['detail']}")
        if args.show_suppressed:
            print(f"\nSuppressed ({len(report['suppressed'])}):")
            for r in report["suppressed"]:
                print(f"  {r['game']:40} {r['check']:15} {r['detail']}  [{r['reason']}]")
        elif report["suppressed"]:
            print(f"\n{len(report['suppressed'])} suppressed finding(s) hidden (--show-suppressed).")
        not_trivial = [s for s in report["skipped"] if s["reason"] not in ("no Steam ID", "deprecated")]
        if not_trivial:
            print("\nSkipped:")
            for s in not_trivial:
                print(f"  {s['game']:40} {s['reason']}")
    return 1 if report["likely"] else 0


if __name__ == "__main__":
    sys.exit(main())
