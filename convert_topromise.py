"""
convert_topromise.py

Codemod: converts deprecated `util.toPromise((param) => EXPR)` calls to a plain
`new Promise((resolve, reject) => EXPR')`, where EXPR' has the bare `param` argument
(wherever it appears as a standalone call argument inside EXPR) replaced with
`(err, result) => (err ? reject(err) : resolve(result))`.

Checked every one of this repo's ~1250 call sites' arrow signature before writing this:
100% are expression-bodied single-param arrows (`(cb) => api.events.emit(...)`), zero
block-bodied (`=> {`) variants. Param name is `cb` everywhere sampled but the script
reads it from the arrow signature rather than hardcoding it.

Known exception, already hand-fixed, never matched by this script's pattern because it's
already plain `new Promise(...)`: `resources/downloader/downloader.js`'s
`importFetchedFile` -- the `import-downloads` event calls back `(dlIds)` with no error
argument, unlike every other event in this family, so it cannot go through the
`(err, result)` wrap this script produces. See the comment at that call site.

Usage:
    python convert_topromise.py --scope templates --diff        # preview template-*/resources/*.js
    python convert_topromise.py --scope templates                # apply for real
    python convert_topromise.py --scope games --batch 1/6 --diff # preview game-* batch 1 of 6
    python convert_topromise.py --scope games --batch 1/6        # apply that batch
    python convert_topromise.py GAME_ID [GAME_ID ...] --scope games --diff  # one-off games
    python convert_topromise.py --scope all --dry-run --verbose  # full repo, report only

After a real (non-dry-run, non-diff) run, run `npm run format` (oxfmt --write .) so final
formatting matches the project's own formatter -- this script does not pretty-print.
"""

import argparse
import difflib
import os
import re
import sys

from vortex_utils import (
    REPO_ROOT, GAME_PREFIX, TEMPLATE_PREFIX,
    list_game_ids, mask_comments_and_strings,
    find_matching_bracket, js_files_in, batch_slice,
    node_check, node_check_source, report_node_check,
    write_text_atomic, print_count_summary, log_warn,
)

_CALL_RE = re.compile(r"\butil\.toPromise\(")
_ARROW_HEADER_RE = re.compile(
    r"\s*\(?\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)?\s*=>\s*"
)
_REJECT_RESOLVE = "(err, result) => (err ? reject(err) : resolve(result))"


def _convert_one_call(src, masked, call_start, open_pos):
    """Try to convert one `util.toPromise(...)` call. call_start is the index of 'u' in
    'util', open_pos is the index of the '(' right after 'toPromise'.

    Returns ((end_offset, replacement_text), None) on success, or (None, reason) to
    skip -- never guesses on a shape it doesn't recognize."""
    close_pos = find_matching_bracket(masked, open_pos)
    if close_pos is None:
        return None, "unbalanced parens (EOF before matching close)"

    header = _ARROW_HEADER_RE.match(masked, open_pos + 1)
    if header is None or header.end() > close_pos:
        return None, "argument is not a simple (param) => expr arrow"

    param = header.group(1)
    body_start = header.end()
    if masked[body_start:body_start + 1] == "{":
        return None, "block-bodied arrow ('=> {') not supported, hand migrate"

    body_masked = masked[body_start:close_pos]
    param_re = re.compile(rf"(?<![\w$.]){re.escape(param)}(?![\w$])")
    occurrences = [m.start() + body_start for m in param_re.finditer(body_masked)]
    if not occurrences:
        return None, f"callback param `{param}` never referenced in body, hand migrate"

    body = src[body_start:close_pos]
    for off in sorted(occurrences, reverse=True):
        rel = off - body_start
        body = body[:rel] + _REJECT_RESOLVE + body[rel + len(param):]

    replacement = f"new Promise((resolve, reject) => {body})"
    return (close_pos + 1, replacement), None


def convert_source(src):
    """Convert every util.toPromise(...) call in src. Returns (new_src, converted_count,
    skipped) where skipped is a list of (call_start_offset, reason) pairs."""
    masked = mask_comments_and_strings(src)
    call_sites = [(m.start(), m.end() - 1) for m in _CALL_RE.finditer(masked)]

    candidates = []
    for call_start, open_pos in call_sites:
        result, reason = _convert_one_call(src, masked, call_start, open_pos)
        candidates.append((call_start, result, reason))

    accepted = []
    skipped = []
    last_end = -1
    for call_start, result, reason in candidates:
        if result is None:
            skipped.append((call_start, reason))
            continue
        end, replacement = result
        if call_start < last_end:
            skipped.append((call_start, "overlaps another converted call -- rerun this script after this wave"))
            continue
        accepted.append((call_start, end, replacement))
        last_end = end

    new_src = src
    for call_start, end, replacement in sorted(accepted, key=lambda t: t[0], reverse=True):
        new_src = new_src[:call_start] + replacement + new_src[end:]

    return new_src, len(accepted), skipped


def iter_target_files(scope, batch=None, game_ids=None):
    """Same shape as convert_getsafe.py's file-scoping -- kept identical on purpose so
    this script and convert_error_classes.py can run over the same batch boundaries."""
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
        "Convert util.toPromise((param) => expr) calls to new Promise((resolve, reject) "
        "=> expr'), rewriting the callback param into an (err, result) resolver."
    ))
    p.add_argument("game_ids", nargs="*", metavar="GAME_ID",
                   help="Restrict --scope games to these game IDs (default: all games, "
                        "or the --batch slice if given)")
    p.add_argument("--scope", choices=["templates", "games", "zcustom", "helpers", "all"],
                   default="templates", help="Which file set to scan (default: templates)")
    p.add_argument("--batch", metavar="N/TOTAL",
                   help="Restrict --scope games to alphabetical chunk N of TOTAL, e.g. 1/6")
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
