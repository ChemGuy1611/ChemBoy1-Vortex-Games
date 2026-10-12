"""
audit_parity.py

Mechanical layer for the template-parity audit: UE4-5 load-order parity plus template
shape parity for every engine family in vortex_utils.SHAPE_PARITY_FAMILIES (Unity
hybrid, Anvil, Far Cry, Reloaded-II, Cobra/ACSE, Frostbite, Godot, RE Engine, RPG Maker,
Snowdrop, SRMM, UE2-3, Unity UMM). Regenerates the parity-related flag lists via
categorize_games.py, then reports on games not yet at parity and a couple of invariants
a stale or partial port can silently break.

UE4-5: games-ue4-5-parity.txt marks games carrying the full UE4SS+LogicMods
load-order shape (Ue4ssContextMenu marker, see vortex_utils.has_ue4ss_load_order_parity).
This script additionally checks the ue4ssLoadOrder/logicModsLoadOrder toggle-pairing
invariant across every UE4-5 game: a game with UE4SS load order dormant must have
LogicMods load order dormant too, since LogicMods needs UE4SS's BPModLoaderMod to
feed it. See memory feedback_ue4_5_test_workflow for the incident that motivated this.

Shape families: each family's parity list (games-unity-hybrid-parity.txt,
games-anvil-parity.txt, games-reengine-parity.txt, ...) marks games with every top-level
function and boolean toggle their template has. Extra functions/toggles a game has
beyond its template are NOT a parity failure - a game's own unique code is expected,
same as UE4-5 parity is "matches template shape", not byte-identical. For every game not
at parity, this script prints its missing function/toggle counts - the same measurement
the unity-loader-downloader-migration plan tracked by hand, wave over wave.
Permanent per-game carve-outs live on each registry row (UNITY_PARITY_KNOWN_EXCEPTIONS,
REENGINE_PARITY_KNOWN_EXCEPTIONS, FROSTBITE_PARITY_KNOWN_EXCEPTIONS,
GODOT_PARITY_KNOWN_EXCEPTIONS) and print as
EXCEPTED. Only Unity exempts a toggle (isXna, both ways): every other template boolean
gates an optional subsystem, so a missing one is always a pending port rather than a
deliberate variant. The Anvil and Far Cry families started at zero: no Anvil extension
carried a single boolean feature toggle before the template gained its EDIT ZONE, and
the Far Cry games carry one of the template's five.

Usage:
    python audit_parity.py              # regenerate lists + print full report
    python audit_parity.py --json       # emit a structured JSON report instead
    python audit_parity.py --no-regen   # skip the categorize_games.py rebuild,
                                         # report against the lists already on disk
    python audit_parity.py --game ID [ID ...]            # live shape check of these games against
                                                         # their own template; lists ignored
    python audit_parity.py --game ID ... --bodies a,b    # also require functions a, b to be
                                                         # equal to the template's (proves a splice
                                                         # was verbatim; trailing whitespace is
                                                         # ignored, the splicer drops a ` //*/`
                                                         # toggle token after the closing brace);
                                                         # --json works too
    python audit_parity.py --game ID ... --diff a,b      # print a unified diff of functions a, b,
                                                         # template vs each game (read-only; shows
                                                         # WHAT --bodies calls "differs")
    python audit_parity.py --game ID ... --count a,b     # also print whole-word occurrence counts
                                                         # of identifiers a, b per game (sweep)
    python audit_parity.py --game ID ... --needs [a,b]   # run BEFORE splicing: the template names the
                                                         # missing functions (or a, b) use that the
                                                         # game does not declare / declares with
                                                         # different text, plus the missing toggles
                                                         # they depend on; exit 1 if any is
                                                         # undeclared (the body would throw
                                                         # ReferenceError, lint stays green)

Exit code 1 if the ue4ssLoadOrder/logicModsLoadOrder pairing invariant is violated
anywhere, 0 otherwise. Games not (yet) at parity are informational, not a failure -
most are simply mid-migration and that is expected, not a defect.
"""

import os
import re
import sys
import json
import difflib
import argparse
import subprocess

from vortex_utils import (
    REPO_ROOT, LISTS_DIR, read_index_js, read_id_list,
    template_shape_diff, SHAPE_PARITY_FAMILIES, detect_engine, top_level_function_text,
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


def _regenerate_lists():
    result = subprocess.run(
        [sys.executable, os.path.join(REPO_ROOT, "categorize_games.py")],
        cwd=REPO_ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace")
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


def _shape_family_report(list_file, parity_file, template_folder,
                         known_exceptions=None, toggle_exceptions=frozenset()):
    """Report one engine family against its template: every game in list_file, marked
    parity / excepted / pending, with per-game missing and extra counts for the pending
    ones. Same measurement for every family - only the template and the carve-out map
    change."""
    known_exceptions = known_exceptions or {}
    all_games = sorted(_list(list_file))
    parity_games = set(_list(parity_file))
    games = []
    for game_id in all_games:
        folder = f"game-{game_id}"
        if folder in known_exceptions:
            games.append({
                "game": game_id, "status": "excepted",
                "reason": known_exceptions[folder],
            })
            continue
        if game_id in parity_games:
            games.append({"game": game_id, "status": "parity"})
            continue
        src = read_index_js(os.path.join(REPO_ROOT, folder))
        if src is None:
            continue  # listed game whose folder is gone (stale list under --no-regen)
        missing_f, extra_f, missing_t, extra_t = template_shape_diff(
            src, template_folder, toggle_exceptions)
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


def audit_family(family):
    """Return the shape-parity report for one vortex_utils.ShapeParityFamily row."""
    return _shape_family_report(
        family.source_list, family.parity_list, family.template,
        family.exceptions, family.toggle_exceptions)


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


def _print_shape_family(label, report):
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


def _game_and_family(game_id):
    """Return (game index.js source, its shape family) or (None, None) when the game has no
    index.js or its engine is not a shape-parity family."""
    src = read_index_js(os.path.join(REPO_ROOT, f"game-{game_id}"))
    family = next((f for f in SHAPE_PARITY_FAMILIES
                   if src is not None and detect_engine(src) == f.engine), None)
    return (src, family) if family is not None else (None, None)


def diff_bodies(game_ids, names):
    """Unified diff of each named top-level function, template vs game (read-only). Returns
    (lines, ok): one '## game name: identical | N diff lines | missing in ...' header per
    pair, the diff under it. Equality ignores trailing whitespace, as audit_games does."""
    lines, ok = [], True
    for game_id in game_ids:
        src, family = _game_and_family(game_id)
        if family is None:
            lines.append(f"## {game_id}: no index.js or not in a shape family")
            ok = False
            continue
        tsrc = read_index_js(os.path.join(REPO_ROOT, family.template))
        for name in names:
            a, b = top_level_function_text(tsrc, name), top_level_function_text(src, name)
            if a is None or b is None:
                gone = " and ".join(w for w, t in (("template", a), ("game", b)) if t is None)
                lines.append(f"## {game_id} {name}: missing in {gone}")
                continue
            diff = list(difflib.unified_diff(a.rstrip().splitlines(), b.rstrip().splitlines(),
                                             family.template, f"game-{game_id}",
                                             lineterm="", n=1))
            lines.append(f"## {game_id} {name}: "
                         + ("identical" if not diff else f"{len(diff)} diff lines"))
            lines.extend(diff)
    return lines, ok


def audit_games(game_ids, body_names, count_names=()):
    """Live per-game check, independent of the parity lists on disk: shape diff against the
    game's own family template (found via detect_engine) and, for each name in body_names,
    whether the game's function text equals the template's (trailing whitespace ignored: the
    splicer drops a ` //*/` toggle token after the closing brace, which left the template's
    text without the trailing newline the game's has). count_names adds a whole-word
    occurrence count per name (the write-side half of a post-patch identifier sweep:
    declaration + every use). Returns (rows, ok)."""
    rows, ok = [], True
    for game_id in game_ids:
        src, family = _game_and_family(game_id)
        if family is None:
            rows.append({"game": game_id, "error": "no index.js or not in a shape family"})
            ok = False
            continue
        mf, ef, mt, et = template_shape_diff(src, family.template, family.toggle_exceptions)
        tsrc = read_index_js(os.path.join(REPO_ROOT, family.template))
        body_diffs = []
        for name in body_names:
            a, b = top_level_function_text(tsrc, name), top_level_function_text(src, name)
            if a is None or b is None:
                body_diffs.append(f"{name} (missing)")
            elif a.rstrip() != b.rstrip():
                body_diffs.append(f"{name} (differs)")
        at_parity = not (mf or mt)
        ok = ok and at_parity and not body_diffs
        row = {"game": game_id, "template": family.template, "at_parity": at_parity,
               "missing_functions": mf, "missing_toggles": mt,
               "extra_functions": len(ef), "body_diffs": body_diffs}
        if count_names:
            row["counts"] = {n: len(re.findall(r"\b" + re.escape(n) + r"\b", src))
                             for n in count_names}
        rows.append(row)
    return rows, ok


_BINDING_SIMPLE_RE = re.compile(r"^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b[^\n]*", re.MULTILINE)
_BINDING_DESTRUCT_RE = re.compile(r"^(?:const|let|var)\s*\{([^}]*)\}\s*=[^\n]*", re.MULTILINE)
_BINDING_FUNC_RE = re.compile(r"^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(", re.MULTILINE)
_LINE_COMMENT_RE = re.compile(r"(?m)(^|\s)//[^\n]*")


def _top_level_bindings(src):
    """Map every name a source declares at column 0 to its declaration line: `const|let|var
    NAME`, `function NAME`, and each name bound by a destructured `const { a, b: c } = ...`
    (the bound name is the one after the colon, so `fs: vfs` binds `vfs`)."""
    out = {}
    for m in _BINDING_SIMPLE_RE.finditer(src):
        text = m.group(0).strip()
        if text.endswith("="):  # value wraps onto the next line
            text += " " + src[m.end():].lstrip("\r\n").split("\n", 1)[0].strip()
        out.setdefault(m.group(1), text)
    for m in _BINDING_FUNC_RE.finditer(src):
        out.setdefault(m.group(1), m.group(0).strip())
    for m in _BINDING_DESTRUCT_RE.finditer(src):
        for part in m.group(1).split(","):
            name = part.split("=")[0].split(":")[-1].strip()
            if re.fullmatch(r"[A-Za-z_$][\w$]*", name):
                out.setdefault(name, m.group(0).strip())
    return out


_DESTRUCT_DECL_RE = re.compile(r"^(?:const|let|var)\s*\{")
_TRAIL_COMMENT_RE = re.compile(r"\s//.*$")


def _differs(game_decl, template_decl):
    """True when a name declared in both reads differently enough to check its meaning. Ignores
    trailing `//` comments, template placeholders (`XXX`) and destructured `require` lines
    (there the name being bound is what counts, not the list around it)."""
    if _DESTRUCT_DECL_RE.match(template_decl) or "XXX" in template_decl:
        return False
    return _TRAIL_COMMENT_RE.sub("", game_decl).strip() != _TRAIL_COMMENT_RE.sub("", template_decl).strip()


def needs_report(game_ids, names=()):
    """What the template functions a game is about to receive need from the game's own
    top-level scope. For each game, examines `names` (default: the functions the game is
    missing, from the shape diff) and lists every template top-level name their bodies use:
      undeclared    - not declared in the game and not about to arrive with the splice (a
                      missing function or toggle): add it before splicing, or the body throws
                      ReferenceError at run time while lint and node --check stay green
      missing_toggles - boolean toggles those bodies use that the game lacks (port them)
      differing     - declared in both with different text (FROSTY_FOLDER meaning one thing in
                      the game, another in the template): check the meaning before trusting a
                      verbatim splice
    Heuristic, not a parser: identifiers are whole-word matches in the body with `//` comments
    stripped, so a name mentioned only inside a string or template literal still counts (that
    is deliberate: `${FROSTYMOD_PATH}` inside a template literal is a real use). Returns
    (rows, ok); ok is False when any game has an undeclared name or is not in a family."""
    rows, ok = [], True
    for game_id in game_ids:
        src, family = _game_and_family(game_id)
        if family is None:
            rows.append({"game": game_id, "error": "no index.js or not in a shape family"})
            ok = False
            continue
        tsrc = read_index_js(os.path.join(REPO_ROOT, family.template))
        mf, _ef, mt, _et = template_shape_diff(src, family.template, family.toggle_exceptions)
        examined = list(names) if names else list(mf)
        t_decl, g_decl = _top_level_bindings(tsrc), _top_level_bindings(src)
        arriving = set(mf) | set(mt) | set(examined)
        used_by = {}
        unknown = []
        for fn in examined:
            body = top_level_function_text(tsrc, fn)
            if body is None:
                unknown.append(fn)
                continue
            body = _LINE_COMMENT_RE.sub(r"\1", body)
            for tok in set(re.findall(r"\b[A-Za-z_$][\w$]*\b", body)):
                if tok in t_decl and tok != fn:
                    used_by.setdefault(tok, set()).add(fn)
        undeclared, toggles, differing = [], [], []
        for tok in sorted(used_by):
            users = sorted(used_by[tok])
            if tok in mt:
                toggles.append({"name": tok, "used_by": users, "template": t_decl[tok]})
            elif tok in arriving:
                continue
            elif tok not in g_decl:
                undeclared.append({"name": tok, "used_by": users, "template": t_decl[tok]})
            elif _differs(g_decl[tok], t_decl[tok]):
                differing.append({"name": tok, "used_by": users,
                                  "game": g_decl[tok], "template": t_decl[tok]})
        ok = ok and not undeclared and not unknown
        rows.append({"game": game_id, "template": family.template, "examined": examined,
                     "not_template_functions": unknown, "undeclared": undeclared,
                     "missing_toggles": toggles, "differing": differing})
    return rows, ok


def _print_needs(rows):
    def clip(text, width=96):
        return text if len(text) <= width else text[:width - 3] + "..."

    for r in rows:
        if "error" in r:
            print(f"{r['game']}: {r['error']}")
            continue
        print(f"{r['game']} vs {r['template']}: {len(r['examined'])} function(s) examined")
        if not r["examined"]:
            print("  nothing to examine (no missing functions; pass names to --needs)")
            continue
        for title, key in (("NOT DECLARED in the game (add before splicing)", "undeclared"),
                           ("MISSING TOGGLES the bodies use (port with them)", "missing_toggles")):
            if r[key]:
                print(f"  {title}:")
                for item in r[key]:
                    print(f"    {item['name']:<24} <- {','.join(item['used_by'])}")
                    print(f"      template: {clip(item['template'])}")
        if r["differing"]:
            print("  DECLARED IN BOTH, DIFFERENT TEXT (check the meaning):")
            for item in r["differing"]:
                print(f"    {item['name']:<24} <- {','.join(item['used_by'])}")
                print(f"      game:     {clip(item['game'])}")
                print(f"      template: {clip(item['template'])}")
        if r["not_template_functions"]:
            print(f"  NOT A TOP-LEVEL FUNCTION IN THE TEMPLATE (skipped): "
                  f"{', '.join(r['not_template_functions'])}")
        elif not (r["undeclared"] or r["missing_toggles"] or r["differing"]):
            print("  every name the bodies use is declared and identical")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("Usage:")[0].strip())
    parser.add_argument("--json", action="store_true", help="emit a structured JSON report")
    parser.add_argument("--no-regen", action="store_true",
                         help="skip the categorize_games.py rebuild; report against lists on disk")
    parser.add_argument("--game", nargs="+", metavar="GAME_ID",
                         help="live check of these games only (no list regen, lists ignored); "
                              "exit 1 unless every one is at parity")
    parser.add_argument("--bodies", metavar="NAME,NAME",
                         help="with --game: also require these top-level functions to be "
                              "byte-equal to the template's")
    parser.add_argument("--count", metavar="NAME,NAME",
                         help="with --game: also print whole-word occurrence counts of these "
                              "identifiers per game")
    parser.add_argument("--diff", metavar="NAME,NAME",
                         help="with --game: print a unified diff of these top-level functions, "
                              "template vs each game (read-only), instead of the parity report")
    parser.add_argument("--needs", metavar="NAME,NAME", nargs="?", const="",
                         help="with --game: list the template names the missing functions (or "
                              "these functions) use that the game does not declare, so the "
                              "constants can be added before a splice; exit 1 if any is undeclared")
    args = parser.parse_args()
    if (args.bodies or args.count or args.diff or args.needs is not None) and not args.game:
        parser.error("--bodies, --count, --diff and --needs need --game")

    if args.game and args.diff:
        lines, ok = diff_bodies(args.game, args.diff.split(","))
        print("\n".join(lines))
        sys.exit(0 if ok else 1)

    if args.game and args.needs is not None:
        rows, ok = needs_report(args.game, [n for n in args.needs.split(",") if n])
        if args.json:
            print(json.dumps(rows, indent=2))
        else:
            _print_needs(rows)
        sys.exit(0 if ok else 1)

    if args.game:
        rows, ok = audit_games(args.game, args.bodies.split(",") if args.bodies else [],
                               args.count.split(",") if args.count else [])
        if args.json:
            print(json.dumps(rows, indent=2))
        else:
            for r in rows:
                if "error" in r:
                    print(f"{r['game']}: {r['error']}")
                    continue
                print(f"{r['game']}: {'PARITY' if r['at_parity'] else 'PENDING'} "
                      f"missingF={r['missing_functions']} missingT={r['missing_toggles']} "
                      f"extraF={r['extra_functions']} bodyDiffs={r['body_diffs']}"
                      + (f" counts={r['counts']}" if "counts" in r else ""))
        sys.exit(0 if ok else 1)

    if not args.no_regen:
        _regenerate_lists()

    ue4_5 = audit_ue4_5()
    families = {f.key: audit_family(f) for f in SHAPE_PARITY_FAMILIES}

    if args.json:
        print(json.dumps({"ue4_5": ue4_5, **families}, indent=2))
    else:
        _print_ue4_5_report(ue4_5)
        for f in SHAPE_PARITY_FAMILIES:
            print()
            _print_shape_family(f.label, families[f.key])

    sys.exit(1 if ue4_5["toggle_pairing_violations"] else 0)


if __name__ == "__main__":
    main()
