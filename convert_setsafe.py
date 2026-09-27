"""
convert_setsafe.py

Codemod: converts deprecated `util.setSafe(state, [path, 'segments'], value)` calls to
a nested-spread object literal: `({ ...state, path: { ...state.path, segments: value } })`.

Vortex's own setSafe carries an `@deprecated` tag recommending "spread syntax with
computed property names and nested spreads for immutable updates" -- this is that swap,
generated mechanically. Sibling to convert_getsafe.py (same repo-wide audit, same
plan): reuses its call-finding machinery (mask_comments_and_strings + the shared
find_matching_bracket/split_top_level_masked scanner in vortex_utils.py) but builds a
different replacement shape, since a write can't be expressed as an optional-chain.

Every real call site in this repo is `util.setSafe(state, [...], value)` inside a
registerReducer spec -- arg0 is always the bare `state` identifier, path depth is always
1 or 2. The generated spread is built recursively for ANY depth (matches setSafe's own
recursive implementation) rather than hard-coded to depth <=2, so a future 3+ level call
still converts correctly instead of silently mis-firing.

Known gap, inherent to a purely textual transform: real setSafe uses `state.slice()`
(array copy) instead of `{...state}` (object copy) when an intermediate path segment
holds an ARRAY at runtime -- that can't be known statically from the call site alone.
Every real call site's intermediate values are per-key state objects, never arrays (the
audit that scoped this script confirmed it), so this never actually diverges from
setSafe's real behavior here -- but it means the transform is not a universal drop-in
replacement for a setSafe call whose state shape uses arrays partway down the path.

The replacement is ALWAYS wrapped in outer parens, same rule as convert_getsafe.py but
for a different reason: an arrow function's implicit-return body cannot be a bare object
literal (`(state, payload) => { ...state, a: value }` is a syntax error -- `{` opens a
block, and `...state` is not valid there), and every real setSafe call site in this repo
sits in exactly that position (`[actions.X]: (state, payload) => util.setSafe(...)`).

Usage:
    python convert_setsafe.py --scope templates --diff        # preview template-*/resources/*.js
    python convert_setsafe.py --scope templates                # apply for real
    python convert_setsafe.py --scope games --batch 1/3 --diff # preview game-* batch 1 of 3
    python convert_setsafe.py --scope games --batch 1/3        # apply that batch
    python convert_setsafe.py GAME_ID [GAME_ID ...] --scope games --diff  # one-off games
    python convert_setsafe.py --scope all --dry-run --verbose  # full repo, report only

After a real (non-dry-run, non-diff) run, run `npm run format` (oxfmt --write .) so
final formatting matches the project's own formatter -- this script does not try to
pretty-print its output.
"""

import argparse
import difflib
import os
import re
import sys

from vortex_utils import (
    REPO_ROOT, GAME_PREFIX, TEMPLATE_PREFIX,
    list_game_ids, mask_comments_and_strings,
    find_matching_bracket, split_top_level_masked, js_files_in, batch_slice,
    node_check, node_check_source, report_node_check,
    write_text_atomic, print_count_summary, log_warn,
)

_CALL_RE = re.compile(r'\butil\.setSafe\(')
_IDENT_RE = re.compile(r'^[A-Za-z_$][A-Za-z0-9_$]*$')


def _seg_forms(seg_text):
    """Return (key_form, access_form) for one path segment's ORIGINAL source text.

    key_form is how the segment reads as an object-literal key: bare `name` for an
    identifier-safe quoted string, else computed `[expr]`. access_form is how it reads
    as a member-access expression appended to a base: `.name` or `[expr]` respectively
    -- same identifier-safety rule convert_getsafe.py uses for chain segments, just
    applied to write-side syntax instead of a `?.` chain."""
    t = seg_text.strip()
    if len(t) >= 2 and t[0] in "'\"`" and t[-1] == t[0]:
        inner = t[1:-1]
        if "\\" not in inner and (t[0] != "`" or "${" not in inner) and _IDENT_RE.match(inner):
            return inner, f".{inner}"
    return f"[{t}]", f"[{t}]"


def _build_spread(base_expr, segments, value_text):
    """Recursively build the nested-spread replacement for setSafe(base, segments, value).

    segments: list of ORIGINAL source-text path pieces (already comma-split). Mirrors
    setSafe's own recursion: the innermost level sets the leaf key directly, every level
    above spreads its own current value and replaces just the one key that changed."""
    if not segments:
        # path.length === 0 in the real implementation returns {...value} -- not seen
        # anywhere in this repo, handled only so the script never mis-fires on it.
        return f"{{ ...{value_text.strip()} }}"

    first, rest = segments[0], segments[1:]
    key_form, access_form = _seg_forms(first)

    if not rest:
        return f"{{ ...{base_expr}, {key_form}: {value_text.strip()} }}"

    inner_base = f"{base_expr}{access_form}"
    inner = _build_spread(inner_base, rest, value_text)
    return f"{{ ...{base_expr}, {key_form}: {inner} }}"


def _convert_one_call(src, masked, call_start, open_pos):
    """Try to convert one `util.setSafe(...)` call found at call_start (index of 'u').

    Returns ((end_offset, replacement_text), None) on success, or (None, reason) to
    skip -- this script never guesses on a shape it doesn't recognize."""
    close_pos = find_matching_bracket(masked, open_pos)
    if close_pos is None:
        return None, "unbalanced parens (EOF before matching close)"

    args = split_top_level_masked(masked, open_pos + 1, close_pos)
    if len(args) != 3:
        return None, f"expected 3 args, found {len(args)}"

    (a0s, a0e), (a1s, a1e), (a2s, a2e) = args
    arg0, arg1, arg2 = src[a0s:a0e], src[a1s:a1e], src[a2s:a2e]

    if not (arg1.startswith("[") and arg1.endswith("]")):
        return None, "path arg is not a literal array"
    close_bracket = find_matching_bracket(masked, a1s)
    if close_bracket != a1e - 1:
        return None, "path arg brackets do not span the whole segment"

    segments = [src[s:e] for s, e in split_top_level_masked(masked, a1s + 1, close_bracket)]
    replacement = "(" + _build_spread(arg0.strip(), segments, arg2) + ")"
    return (close_pos + 1, replacement), None


def convert_source(src):
    """Convert every util.setSafe(...) call in src. Returns (new_src, converted_count,
    skipped) where skipped is a list of (call_start_offset, reason) pairs.

    Same outermost-first overlap handling as convert_getsafe.py's convert_source -- see
    that docstring. Not observed for setSafe in this repo either, but the algorithm
    costs nothing to keep symmetric and safe."""
    masked = mask_comments_and_strings(src)
    call_sites = [(m.start(), m.end() - 1) for m in _CALL_RE.finditer(masked)]

    candidates = []
    for call_start, open_pos in call_sites:
        result, reason = _convert_one_call(src, masked, call_start, open_pos)
        if result is None:
            candidates.append((call_start, None, None, reason))
        else:
            end, replacement = result
            candidates.append((call_start, end, replacement, None))

    accepted = []
    skipped = []
    last_end = -1
    for call_start, end, replacement, reason in candidates:
        if replacement is None:
            skipped.append((call_start, reason))
            continue
        if call_start < last_end:
            skipped.append((call_start, "overlaps another converted setSafe call -- rerun this script after this wave"))
            continue
        accepted.append((call_start, end, replacement))
        last_end = end

    new_src = src
    for call_start, end, replacement in sorted(accepted, key=lambda t: t[0], reverse=True):
        new_src = new_src[:call_start] + replacement + new_src[end:]

    return new_src, len(accepted), skipped


def iter_target_files(scope, batch=None, game_ids=None):
    """Yield absolute paths to .js files to scan for the given scope. Same scope
    semantics as convert_getsafe.py's iter_target_files -- kept as a sibling copy (not
    a shared import) so each script's own scope logic stays readable standalone; the
    file-walk primitives underneath (js_files_in/batch_slice) ARE shared."""
    paths = []

    if scope in ("templates", "all"):
        for entry in sorted(os.listdir(REPO_ROOT)):
            if entry.startswith(TEMPLATE_PREFIX):
                js_files_in(os.path.join(REPO_ROOT, entry), paths)
        for sub in ("", "downloader", "browsers"):
            js_files_in(os.path.join(REPO_ROOT, "resources", sub), paths)

    if scope in ("games", "all"):
        if game_ids:
            target_ids = sorted(set(game_ids))
        else:
            target_ids = list_game_ids()
            if batch:
                target_ids = batch_slice(target_ids, batch)
        for gid in target_ids:
            js_files_in(os.path.join(REPO_ROOT, f"{GAME_PREFIX}{gid}"), paths)

    if scope in ("zcustom", "all"):
        zc = os.path.join(REPO_ROOT, "zCustomGames")
        if os.path.isdir(zc):
            for entry in sorted(os.listdir(zc)):
                js_files_in(os.path.join(zc, entry), paths)

    if scope in ("helpers", "all"):
        for entry in sorted(os.listdir(REPO_ROOT)):
            if entry.startswith("helper-"):
                js_files_in(os.path.join(REPO_ROOT, entry), paths)

    return paths


def build_parser():
    p = argparse.ArgumentParser(description=(
        "Convert util.setSafe(state, [path...], value) calls to a nested-spread "
        "object literal ({ ...state, path: { ...state.path, ... } })."
    ))
    p.add_argument("game_ids", nargs="*", metavar="GAME_ID",
                   help="Restrict --scope games to these game IDs (default: all games, "
                        "or the --batch slice if given)")
    p.add_argument("--scope", choices=["templates", "games", "zcustom", "helpers", "all"],
                   default="templates", help="Which file set to scan (default: templates)")
    p.add_argument("--batch", metavar="N/TOTAL",
                   help="Restrict --scope games to alphabetical chunk N of TOTAL, e.g. 1/3")
    p.add_argument("--dry-run", action="store_true",
                   help="Report what would change without writing")
    p.add_argument("--diff", action="store_true",
                   help="Print a unified diff per changed file instead of writing (implies --dry-run)")
    p.add_argument("--verbose", action="store_true",
                   help="Print each skip reason inline, not just the summary count")
    return p


def main():
    args = build_parser().parse_args()
    dry_run = args.dry_run or args.diff

    files = iter_target_files(args.scope, batch=args.batch, game_ids=args.game_ids or None)
    if not files:
        print("No files matched.")
        return

    counters = {"files scanned": 0, "files changed": 0, "calls converted": 0, "calls skipped": 0}

    for path in files:
        counters["files scanned"] += 1
        label = os.path.relpath(path, REPO_ROOT)
        try:
            with open(path, encoding="utf-8") as f:
                src = f.read()
        except OSError as e:
            log_warn(label, f"could not read: {e}")
            continue

        new_src, converted, skipped = convert_source(src)
        counters["calls converted"] += converted
        counters["calls skipped"] += len(skipped)

        if args.verbose:
            for call_start, reason in skipped:
                line_no = src.count("\n", 0, call_start) + 1
                log_warn(label, f"line {line_no}: skipped -- {reason}")

        if new_src == src:
            continue
        counters["files changed"] += 1

        if args.diff:
            sys.stdout.writelines(difflib.unified_diff(
                src.splitlines(keepends=True), new_src.splitlines(keepends=True),
                fromfile=f"a/{label}", tofile=f"b/{label}",
            ))
            ok, err = node_check_source(new_src)
            if ok is False:
                log_warn(label, f"node --check would FAIL after conversion: {err}")
            continue

        if dry_run:
            print(f"  [DRY RUN] would convert {converted} call(s): {label}")
            ok, err = node_check_source(new_src)
            if ok is False:
                log_warn(label, f"node --check would FAIL after conversion: {err}")
            continue

        write_text_atomic(path, new_src)
        print(f"  Converted {converted} call(s): {label}")
        ok, err = node_check(path)
        report_node_check(label, ok, err)

    print_count_summary(counters)


if __name__ == "__main__":
    main()
