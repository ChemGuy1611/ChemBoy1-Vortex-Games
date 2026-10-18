"""
verify_propagation.py

Prove a template fix really reached the games it was propagated to. A template change
rewrites some top-level functions. A game that carried the old text of such a function
verbatim must now carry the new text verbatim, so for every function the template changed
and every game given:

  * the game's function was byte-identical to the template's OLD text before the patch:
    it must now be byte-identical to the template's NEW text. A difference is a PROBLEM
    (the patch missed part of it, or touched something it should not have).
  * the game's function was already its own variant (differed from the template's old
    text): informational. "patched" if the patch changed it, "untouched" if it did not.
    Untouched is where a missed fix hides, so each is listed for a hand review; with
    --strict they fail the run.
  * the function is missing from the game: PROBLEM (parity gap, e.g. a helper the fix
    adds that the patch did not splice in).

Functions the template ADDED count as changed (absent in the old text), so a helper a fix
introduces must match the template's text in every game. Functions only in the old
template (removed) are listed and not checked. Only `function name(...)` /
`async function name(...)` declarations at column 0 are compared; arrow-style
`const name = () =>` declarations are not (vortex_utils.top_level_function_text).

The three sides are read from git, not the working tree, so the answer does not depend on
what was edited since: the template OLD text from --old-ref (the commit before the template
change), the template NEW text from --new-ref (default: the working-tree index.js), the
game OLD text from --game-ref (default HEAD, right while the patch is uncommitted; pass
the commit before the patch once it is committed). The game NEW side is always the
working-tree index.js. CRLF/LF differences are ignored.

Complements audit_parity.py --game --bodies (names the functions to compare by hand, game
against template only): this derives the functions from the template diff and tells
"already equal to the old template" apart from "game's own variant".

Two optional checks add PROBLEM lines to the same report:

  --residual          the done criterion "no old defect pattern left in the family". Runs
                      patch_extensions.patch_template_gap_fixes on each game's working-tree
                      source without writing: any pair it would still apply is old text
                      the patch left behind. The patch is the oracle, so a game the patch
                      skips on purpose (its own guards) is not reported.
  --changelog-key T   (repeatable) a bullet text the patch wrote to the CHANGELOGs. Each
                      key may appear at most once per game and only above the first dated
                      "## [x.y.z]" section, and the released text from that section down
                      must equal the --game-ref copy. A key a game does not carry is fine
                      (bullets are per game), so this proves placement, not coverage.

Usage:
    python verify_propagation.py TEMPLATE OLD_REF GAME_ID [GAME_ID ...]
    python verify_propagation.py TEMPLATE OLD_REF --list resources/lists/games-xxx-parity.txt
    python verify_propagation.py TEMPLATE OLD_REF --list FILE GAME_ID ...   # lists add up
    python verify_propagation.py TEMPLATE OLD_REF ... --new-ref REF         # template NEW from git
    python verify_propagation.py TEMPLATE OLD_REF ... --game-ref REF        # game OLD from a commit
    python verify_propagation.py TEMPLATE OLD_REF ... --functions a,b       # only these functions
    python verify_propagation.py TEMPLATE OLD_REF ... --residual              # old patterns left
    python verify_propagation.py TEMPLATE OLD_REF ... --changelog-key "text"  # CHANGELOG placement
    python verify_propagation.py TEMPLATE OLD_REF ... --strict --json

TEMPLATE is a template folder name ("template-ue4-5") or its short name ("ue4-5").
GAME_ID is the bare id ("hollowknight"). Read-only: nothing is written anywhere.

Exit code: 0 = no problem, 1 = a problem (or, with --strict, an untouched variant),
2 = could not run (unknown template, bad git ref, no games given).
"""

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import vortex_utils as vu


def _read_working(folder):
    src = vu.read_index_js(folder)
    return None if src is None else src.replace("\r\n", "\n")


def _function_names(*sources):
    """Declared (non-arrow) top-level function names across the sources, sorted."""
    names = set()
    for src in sources:
        if src:
            names |= vu.top_level_functions(src)
    return sorted(n for n in names
                  if any(src and vu.top_level_function_text(src, n) is not None
                         for src in sources))


def changed_functions(tpl_old, tpl_new, only=None):
    """(changed, removed): functions whose text differs between the template's old and new
    source (added ones included), and functions only the old source declares."""
    changed, removed = [], []
    for name in _function_names(tpl_old, tpl_new):
        if only and name not in only:
            continue
        old = vu.top_level_function_text(tpl_old, name)
        new = vu.top_level_function_text(tpl_new, name)
        if new is None:
            removed.append(name)
        elif old != new:
            changed.append(name)
    return changed, removed


def verify_game(game_id, game_ref, tpl_old, tpl_new, names):
    """Compare one game against the template change. Returns a result dict."""
    folder = os.path.join(vu.REPO_ROOT, f"{vu.GAME_PREFIX}{game_id}")
    rel = f"{vu.GAME_PREFIX}{game_id}/index.js"
    game_new = _read_working(folder)
    game_old = vu.git_show_text(game_ref, rel)
    result = {"game": game_id, "problems": [], "exact": [], "patched": [], "untouched": []}
    if game_new is None:
        result["problems"].append("no index.js in the working tree")
        return result
    if game_old is None:
        result["problems"].append(f"no {rel} at {game_ref}, nothing to compare against")
        return result
    for name in names:
        t_old = vu.top_level_function_text(tpl_old, name)
        t_new = vu.top_level_function_text(tpl_new, name)
        g_old = vu.top_level_function_text(game_old, name)
        g_new = vu.top_level_function_text(game_new, name)
        if g_new is None:
            result["problems"].append(f"{name}: missing from the game")
        elif g_old == t_old:
            if g_new == t_new:
                result["exact"].append(name)
            else:
                result["problems"].append(
                    f"{name}: matched the old template before the patch, differs from the new one now")
        elif g_new == g_old:
            result["untouched"].append(name)
        else:
            result["patched"].append(name)
    return result


def residual_problems(game_id):
    """Old text a template_gap_fixes pair would still change in the game (dry run, nothing is
    written). Empty when the game is clean or has no index.js."""
    import patch_extensions as pe
    path = os.path.join(vu.REPO_ROOT, f"{vu.GAME_PREFIX}{game_id}", "index.js")
    if not os.path.isfile(path):
        return []
    with open(path, encoding="utf-8", errors="replace") as f:
        src = f.read()
    _, changed, msg = pe.patch_template_gap_fixes(game_id, src, None)
    return [f"old text still present, template_gap_fixes would change it: {msg}"] if changed else []


def changelog_problems(game_id, game_ref, keys):
    """CHANGELOG placement: each key at most once and only above the first dated section, and
    the released text (first '## [x.y.z]' down) equal to its copy at game_ref."""
    rel = f"{vu.GAME_PREFIX}{game_id}/CHANGELOG.md"
    path = os.path.join(vu.REPO_ROOT, rel)
    if not os.path.isfile(path):
        return ["no CHANGELOG.md in the working tree"]
    with open(path, encoding="utf-8", newline="") as f:
        new = f.read().replace("\r\n", "\n")
    dated = re.search(r"^## \[", new, re.MULTILINE)
    cut = dated.start() if dated else len(new)
    problems = []
    for key in keys:
        if new.count(key) > 1:
            problems.append(f"CHANGELOG: '{key[:40]}' appears {new.count(key)} times")
        elif new.count(key, cut):
            problems.append(f"CHANGELOG: '{key[:40]}' sits in a released section")
    old = vu.git_show_text(game_ref, rel)
    if old is not None:
        old_dated = re.search(r"^## \[", old, re.MULTILINE)
        if (old[old_dated.start():] if old_dated else "") != new[cut:]:
            problems.append(f"CHANGELOG: released text changed since {game_ref}")
    return problems


def _read_list(path):
    with open(path, encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("Usage:")[0].strip(),
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("template", help='template folder ("template-ue4-5") or short name ("ue4-5")')
    parser.add_argument("old_ref", help="git ref of the template BEFORE the change")
    parser.add_argument("games", nargs="*", metavar="GAME_ID", help="bare game ids")
    parser.add_argument("--list", action="append", default=[], metavar="FILE",
                        help="file with one game id per line (repeatable, adds to GAME_ID)")
    parser.add_argument("--new-ref", metavar="REF",
                        help="read the template NEW text from this ref instead of the working tree")
    parser.add_argument("--game-ref", default="HEAD", metavar="REF",
                        help="git ref the games' OLD text is read from (default HEAD)")
    parser.add_argument("--functions", metavar="NAME,NAME",
                        help="only compare these functions (default: every function the template changed)")
    parser.add_argument("--residual", action="store_true",
                        help="also fail a game where a template_gap_fixes pair would still apply (old text left)")
    parser.add_argument("--changelog-key", action="append", default=[], metavar="TEXT",
                        help="a CHANGELOG bullet text (repeatable): check it sits once, above the first dated "
                             "section, and that released text is unchanged since --game-ref")
    parser.add_argument("--strict", action="store_true",
                        help="a game variant the patch left untouched also fails the run")
    parser.add_argument("--json", action="store_true", help="emit a structured JSON report")
    args = parser.parse_args()

    template = vu.resolve_template_folder(args.template)
    if template is None:
        print(f"ERROR: no template folder matches {args.template!r}")
        return 2
    tpl_rel = f"{template}/index.js"
    tpl_old = vu.git_show_text(args.old_ref, tpl_rel)
    if tpl_old is None:
        print(f"ERROR: {tpl_rel} not found at {args.old_ref}")
        return 2
    if args.new_ref:
        tpl_new = vu.git_show_text(args.new_ref, tpl_rel)
    else:
        tpl_new = _read_working(os.path.join(vu.REPO_ROOT, template))
    if tpl_new is None:
        print(f"ERROR: new template text not found ({args.new_ref or 'working tree'}:{tpl_rel})")
        return 2

    ids = list(args.games)
    for list_path in args.list:
        try:
            ids += _read_list(list_path)
        except OSError as err:
            print(f"ERROR: cannot read list {list_path}: {err}")
            return 2
    ids = list(dict.fromkeys(ids))
    if not ids:
        print("ERROR: no games given (ids or --list)")
        return 2

    only = set(args.functions.split(",")) if args.functions else None
    names, removed = changed_functions(tpl_old, tpl_new, only)
    results = [verify_game(g, args.game_ref, tpl_old, tpl_new, names) for g in ids]
    for r in results:
        if args.residual:
            r["problems"] += residual_problems(r["game"])
        if args.changelog_key:
            r["problems"] += changelog_problems(r["game"], args.game_ref, args.changelog_key)
    problems = sum(len(r["problems"]) for r in results)
    untouched = sum(len(r["untouched"]) for r in results)

    if args.json:
        print(json.dumps({"template": template, "old_ref": args.old_ref, "changed": names,
                          "removed": removed, "games": results}, indent=2))
    else:
        print(f"{template}: {len(names)} changed function(s) since {args.old_ref}: "
              f"{', '.join(names) if names else '(none)'}")
        if removed:
            print(f"  removed in the template, not checked: {', '.join(removed)}")
        for r in results:
            for p in r["problems"]:
                print(f"PROBLEM  {r['game']}: {p}")
        for r in results:
            if r["untouched"]:
                print(f"REVIEW   {r['game']}: own variant, patch left untouched: "
                      f"{', '.join(r['untouched'])}")
        exact = sum(len(r["exact"]) for r in results)
        patched = sum(len(r["patched"]) for r in results)
        print(f"{len(results)} game(s): {exact} function(s) now identical to the new template, "
              f"{patched} own variant(s) patched, {untouched} own variant(s) untouched, "
              f"{problems} problem(s)")

    return 1 if problems or (args.strict and untouched) else 0


if __name__ == "__main__":
    sys.exit(main())
