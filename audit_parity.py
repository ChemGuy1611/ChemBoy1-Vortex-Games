"""
audit_parity.py

Mechanical layer for the template-parity audit: UE4-5 load-order parity plus Unity
BepInEx/hybrid template parity. Regenerates the parity-related flag lists via
categorize_games.py, then reports on games not yet at parity and a couple of
invariants a stale or partial port can silently break.

UE4-5: games-ue4-5-parity.txt marks games carrying the full UE4SS+LogicMods
load-order shape (Ue4ssContextMenu marker, see vortex_utils.has_ue4ss_load_order_parity).
This script additionally checks the ue4ssLoadOrder/logicModsLoadOrder toggle-pairing
invariant across every UE4-5 game: a game with UE4SS load order dormant must have
LogicMods load order dormant too, since LogicMods needs UE4SS's BPModLoaderMod to
feed it. See memory feedback_ue4_5_test_workflow for the incident that motivated this.

Unity BepInEx/hybrid: games-unity-bepinex-parity.txt / games-unity-hybrid-parity.txt
mark games with every function and boolean toggle their template has (isXna exempted
both ways; permanent per-game carve-outs in vortex_utils.UNITY_PARITY_KNOWN_EXCEPTIONS).
Extra functions/toggles a game has beyond its template are NOT a parity failure - a
game's own unique code is expected, same as UE4-5 parity is "matches template shape",
not byte-identical. For every game not at parity, this script prints its missing
function/toggle counts - the same measurement the unity-loader-downloader-migration
plan tracked by hand, wave over wave.

Usage:
    python audit_parity.py              # regenerate lists + print full report
    python audit_parity.py --json       # emit a structured JSON report instead
    python audit_parity.py --no-regen   # skip the categorize_games.py rebuild,
                                         # report against the lists already on disk

Exit code 1 if the ue4ssLoadOrder/logicModsLoadOrder pairing invariant is violated
anywhere, 0 otherwise. Games not (yet) at parity are informational, not a failure -
most are simply mid-migration and that is expected, not a defect.
"""

import os
import re
import sys
import json
import argparse
import subprocess

from vortex_utils import (
    REPO_ROOT, LISTS_DIR, read_index_js, read_id_list,
    unity_template_diff, UNITY_PARITY_KNOWN_EXCEPTIONS,
)

# UE4-5 games carved out of parity by design, never expected to reach it - not a
# pending port. Keep in sync with the carve-out documented in
# feedback_ue4_5_test_workflow (memory) and reference_game_lists.
UE4_5_PARITY_CARVEOUTS = {
    "marvelrivals": "online-only PvP with anti-cheat, no UE4SS/LogicMods code at all "
                     "and never will be - PAK load order only",
}

UE4SS_TOGGLE_RE = re.compile(r'^\s*(?:const\s+)?ue4ssLoadOrder\s*=\s*(true|false)\s*;?', re.MULTILINE)
LOGICMODS_TOGGLE_RE = re.compile(r'^\s*(?:const\s+)?logicModsLoadOrder\s*=\s*(true|false)\s*;?', re.MULTILINE)

UNITY_BEPINEX_TEMPLATE = "template-unitybepinex"
UNITY_HYBRID_TEMPLATE = "template-unitymelonloaderbepinex-hybrid"


def _regenerate_lists():
    result = subprocess.run(
        [sys.executable, os.path.join(REPO_ROOT, "categorize_games.py")],
        cwd=REPO_ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        print("  categorize_games.py failed to regenerate lists:", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        sys.exit(1)


def _list(filename):
    return read_id_list(os.path.join(LISTS_DIR, filename))


def audit_ue4_5():
    """Return a dict report on UE4-5 load-order parity."""
    full = set(_list("games-ue4-5.txt"))
    parity = set(_list("games-ue4-5-parity.txt"))
    pending = sorted(full - parity - set(UE4_5_PARITY_CARVEOUTS))
    unknown_carveouts = sorted(c for c in UE4_5_PARITY_CARVEOUTS if c not in full)

    violations = []
    for game_id in sorted(full):
        src = read_index_js(os.path.join(REPO_ROOT, f"game-{game_id}"))
        if src is None:
            continue
        ue4ss = UE4SS_TOGGLE_RE.search(src)
        logicmods = LOGICMODS_TOGGLE_RE.search(src)
        if ue4ss and logicmods and ue4ss.group(1) != logicmods.group(1):
            violations.append({
                "game": game_id,
                "ue4ssLoadOrder": ue4ss.group(1),
                "logicModsLoadOrder": logicmods.group(1),
            })

    return {
        "total": len(full),
        "at_parity": len(parity),
        "pending": pending,
        "carveouts": UE4_5_PARITY_CARVEOUTS,
        "unknown_carveouts": unknown_carveouts,
        "toggle_pairing_violations": violations,
    }


def _unity_family_report(list_file, parity_file, template_folder):
    all_games = sorted(_list(list_file))
    parity_games = set(_list(parity_file))
    games = []
    for game_id in all_games:
        folder = f"game-{game_id}"
        if folder in UNITY_PARITY_KNOWN_EXCEPTIONS:
            games.append({
                "game": game_id, "status": "excepted",
                "reason": UNITY_PARITY_KNOWN_EXCEPTIONS[folder],
            })
            continue
        if game_id in parity_games:
            games.append({"game": game_id, "status": "parity"})
            continue
        src = read_index_js(os.path.join(REPO_ROOT, folder))
        missing_f, extra_f, missing_t, extra_t = unity_template_diff(src, template_folder)
        games.append({
            "game": game_id, "status": "pending",
            "missing_functions": missing_f, "extra_functions": extra_f,
            "missing_toggles": missing_t, "extra_toggles": extra_t,
        })
    return {
        "template": template_folder,
        "total": len(all_games),
        "at_parity": len(parity_games),
        "games": games,
    }


def audit_unity():
    return {
        "bepinex": _unity_family_report(
            "games-unity-bepinex.txt", "games-unity-bepinex-parity.txt", UNITY_BEPINEX_TEMPLATE),
        "hybrid": _unity_family_report(
            "games-unity-melonloader-bepinex.txt", "games-unity-hybrid-parity.txt", UNITY_HYBRID_TEMPLATE),
    }


def _print_ue4_5_report(report):
    print(f"UE4-5: {report['at_parity']}/{report['total']} at template-ue4-5 load-order parity.")
    if report["pending"]:
        print(f"  Pending ({len(report['pending'])}): {', '.join(report['pending'])}")
    if report["unknown_carveouts"]:
        print(f"  WARNING - carve-out no longer a UE4-5 game (stale entry?): "
              f"{', '.join(report['unknown_carveouts'])}")
    if report["toggle_pairing_violations"]:
        print("  ue4ssLoadOrder/logicModsLoadOrder MISMATCH (fix before next deploy):")
        for v in report["toggle_pairing_violations"]:
            print(f"    {v['game']}: ue4ssLoadOrder={v['ue4ssLoadOrder']} "
                  f"logicModsLoadOrder={v['logicModsLoadOrder']}")
    else:
        print("  Toggle-pairing invariant OK across all UE4-5 games.")


def _print_unity_family(label, report):
    print(f"{label}: {report['at_parity']}/{report['total']} at {report['template']} parity.")
    for g in report["games"]:
        if g["status"] == "parity":
            continue
        if g["status"] == "excepted":
            print(f"  {g['game']}: EXCEPTED - {g['reason']}")
            continue
        bits = []
        if g["missing_functions"]:
            bits.append(f"{len(g['missing_functions'])} missing functions")
        if g["missing_toggles"]:
            bits.append(f"{len(g['missing_toggles'])} missing toggles")
        if g["extra_functions"]:
            bits.append(f"{len(g['extra_functions'])} extra functions (own code, informational)")
        if g["extra_toggles"]:
            bits.append(f"{len(g['extra_toggles'])} extra toggles (own code, informational)")
        print(f"  {g['game']}: {', '.join(bits) if bits else 'at parity'}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("Usage:")[0].strip())
    parser.add_argument("--json", action="store_true", help="emit a structured JSON report")
    parser.add_argument("--no-regen", action="store_true",
                         help="skip the categorize_games.py rebuild; report against lists on disk")
    args = parser.parse_args()

    if not args.no_regen:
        _regenerate_lists()

    ue4_5 = audit_ue4_5()
    unity = audit_unity()

    if args.json:
        print(json.dumps({"ue4_5": ue4_5, "unity": unity}, indent=2))
    else:
        _print_ue4_5_report(ue4_5)
        print()
        _print_unity_family("Unity+BepInEx", unity["bepinex"])
        print()
        _print_unity_family("Unity+MelonLoader/BepInEx hybrid", unity["hybrid"])

    sys.exit(1 if ue4_5["toggle_pairing_violations"] else 0)


if __name__ == "__main__":
    main()
