"""
convert_getsafe.py

Codemod: converts deprecated `util.getSafe(obj, [path, 'segments'], default)` calls to
native optional chaining + nullish coalescing: `(obj?.path?.segments ?? default)`.

Vortex's own getSafe is already implemented internally as `current?.[path[i]] ... ??
fallback` and carries an `@deprecated` tag recommending this exact swap, so the
conversion is behavior-preserving, not a guess.

Uses a bracket-depth scanner over mask_comments_and_strings() output (comments and
string/template/regex bodies blanked, same length so offsets line up with the real
source) to find call sites and split arguments -- never a naive line-based regex, since
multi-line oxfmt-wrapped calls and a commented-out call are both real in this repo.

Two correctness rules baked in, both proven necessary by real call sites in this repo:
  - The replacement is ALWAYS wrapped in outer parens: `??` binds looser than `===`/`+`/
    etc., so a bare `obj?.a ?? default` dropped into `getSafe(...) === folder` would
    silently reparse as `?? (default === folder)`.
  - A quoted path segment only becomes a dot-chain segment (`?.name`) when its inner text
    is a valid identifier; otherwise it stays a bracket segment using the ORIGINAL quoted
    text verbatim (`?.["x-ratelimit-remaining"]`), since `?.x-ratelimit-remaining` is a
    syntax error (parses as subtraction).

`getSafeCI` and `setSafe` are different functions with no optional-chaining equivalent
and are never matched by this script.

Usage:
    python convert_getsafe.py --scope templates --diff        # preview template-*/resources/*.js
    python convert_getsafe.py --scope templates                # apply for real
    python convert_getsafe.py --scope games --batch 1/3 --diff # preview game-* batch 1 of 3
    python convert_getsafe.py --scope games --batch 1/3        # apply that batch
    python convert_getsafe.py GAME_ID [GAME_ID ...] --scope games --diff  # one-off games
    python convert_getsafe.py --scope all --dry-run --verbose  # full repo, report only

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

_CALL_RE = re.compile(r'\butil\.getSafe\(')
_IDENT_RE = re.compile(r'^[A-Za-z_$][A-Za-z0-9_$]*$')


def _chain_piece(seg_text):
    """Return the '?.name' or '?.[expr]' chain piece for one path-array segment,
    given the segment's ORIGINAL source text (whitespace already trimmed)."""
    t = seg_text.strip()
    if len(t) >= 2 and t[0] in "'\"`" and t[-1] == t[0]:
        inner = t[1:-1]
        # A backslash could hide the closing quote from the naive t[-1]==t[0] check
        # above; a template literal with ${...} is a real expression, not a plain key.
        # Either case falls through to bracket form, untouched, below.
        if "\\" not in inner and (t[0] != "`" or "${" not in inner) and _IDENT_RE.match(inner):
            return f"?.{inner}"
    return f"?.[{t}]"


def _convert_one_call(src, masked, call_start, open_pos):
    """Try to convert one `util.getSafe(...)` call found at call_start (index of 'u').
    open_pos is the index of the call's '(' in both src and masked.

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
    chain = "".join(_chain_piece(seg) for seg in segments)
    replacement = f"({arg0.strip()}{chain} ?? {arg2.strip()})"
    return (close_pos + 1, replacement), None


def convert_source(src):
    """Convert every util.getSafe(...) call in src. Returns (new_src, converted_count,
    skipped) where skipped is a list of (call_start_offset, reason) pairs.

    Overlapping/nested call spans (a getSafe call whose own arg0 is itself a getSafe
    call -- not observed anywhere in this repo today, but not assumed impossible either)
    are resolved outermost-first per pass: an inner span that overlaps an already-
    accepted outer replacement is skipped with a "rerun" reason rather than corrupting
    either span; a second script run then picks it up, since the untouched original
    text is still sitting right there in the outer call's own arg text."""
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
            skipped.append((call_start, "overlaps another converted getSafe call -- rerun this script after this wave"))
            continue
        accepted.append((call_start, end, replacement))
        last_end = end

    new_src = src
    for call_start, end, replacement in sorted(accepted, key=lambda t: t[0], reverse=True):
        new_src = new_src[:call_start] + replacement + new_src[end:]

    return new_src, len(accepted), skipped


def iter_target_files(scope, batch=None, game_ids=None):
    """Yield absolute paths to .js files to scan for the given scope.

    scope: 'templates' (template-*/*.js + resources/*.js reference snippets -- these are
    the master scaffolds/copy sources, grouped together), 'games' (game-*/*.js, every
    file directly inside each game-* folder -- index.js/downloader.js/base_browser.js/
    etc; narrowed by explicit game_ids or one --batch N/TOTAL alphabetical chunk),
    'zcustom' (zCustomGames/**/*.js), 'helpers' (helper-*/*.js), or 'all' (every one of
    the above)."""
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
        "Convert util.getSafe(obj, [path...], default) calls to optional chaining + "
        "nullish coalescing (obj?.path... ?? default)."
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
