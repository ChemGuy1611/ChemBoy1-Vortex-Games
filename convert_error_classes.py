"""
convert_error_classes.py

Codemod: converts the 10 deprecated `util.<Class>(...)` error constructors to direct
`VortexError(message, { kind, ...payload })` construction, AND every
`x instanceof util.<Class>` check to `x?.data?.kind === "<kind>"`.

Both halves are required together. All 10 classes extend VortexError<kind> since v2.5.0,
but compatibility only runs one way: a plain `new VortexError(msg, { kind })` is NOT
`instanceof` the subclass (no Symbol.hasInstance; Vortex rebuilds the subclass only when
an error crosses IPC, never inside one extension's own throw/catch). Converting throws
alone silently breaks every same-file `instanceof util.X` catch. The kind check matches
both shapes -- subclass instances thrown by Vortex core carry the same `data.kind` -- so
the catch rewrite is safe on its own, even in files whose throws can't be converted.

`VortexError` is a TOP-LEVEL vortex-api export, NOT under `util.*` (api.d.ts export list
bundles `util` separately as `api_d_exports$1`). Every file that gets a call site
converted also needs `VortexError` added to its `require('vortex-api')` destructure --
handled by vortex_utils.ensure_vortex_api_name(), shared with any future script that
needs to add a name to that same import. A file whose vortex-api import is namespace-
style (`const api = require('vortex-api')`) or has more than one destructure of it is
skipped WHOLE -- see that helper's docstring -- never left with call sites referencing
an unimported name.

Per-class mapping (message text: kept as the original argument where the old class took
one; a literal placeholder where it didn't, since VortexError requires a message):

    UserCanceled(skipped?)          -> VortexError('User canceled', {kind:'user-canceled', skipped})
    ProcessCanceled(msg, extra?)    -> VortexError(msg, {kind:'process-canceled', extraInfo?})
    DataInvalid(msg)                -> VortexError(msg, {kind:'data-invalid'})
    SetupError(msg, component?)     -> VortexError(msg, {kind:'setup-error', component?})
    MissingInterpreter(msg, url?)   -> VortexError(msg, {kind:'missing-interpreter', url?})
    NotFound(what)                  -> VortexError(what, {kind:'not-found'})
    NotSupportedError()             -> VortexError('Not supported', {kind:'not-supported'})
    ArgumentInvalid(arg)            -> VortexError('Invalid argument: ' + arg, {kind:'argument-invalid', argument:arg})
    CycleError(cycles)              -> VortexError('Circular dependency detected', {kind:'cycle-error', cycles})
    GameNotFound(search)            -> VortexError('Game not found: ' + search, {kind:'game-not-found', gameId:search})

ArgumentInvalid/GameNotFound duplicate their single argument's text (once as part of the
message, once in the payload) -- safe everywhere in this repo since every real call site
passes a string literal or a simple identifier, never a side-effecting expression, but a
codemod can't prove that in general, hence --verbose to review before a real run.

Wrong arg count for a class (e.g. `new util.NotFound()` with zero args, which the
declared constructor signature does not allow) is never guessed at -- skipped with a
reason, same "never guess" rule convert_getsafe.py established.

Usage:
    python convert_error_classes.py --scope templates --diff        # preview template-*/resources/*.js
    python convert_error_classes.py --scope templates                # apply for real
    python convert_error_classes.py --scope games --batch 1/6 --diff # preview game-* batch 1 of 6
    python convert_error_classes.py --scope games --batch 1/6        # apply that batch
    python convert_error_classes.py GAME_ID [GAME_ID ...] --scope games --diff  # one-off games
    python convert_error_classes.py --scope all --dry-run --verbose  # full repo, report only

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
    find_matching_bracket, split_top_level_masked, js_files_in, batch_slice,
    ensure_vortex_api_name,
    node_check, node_check_source, report_node_check,
    write_text_atomic, print_count_summary, log_warn,
)

_CALL_RE = re.compile(
    r"\bnew\s+util\.(UserCanceled|ProcessCanceled|DataInvalid|SetupError|MissingInterpreter|"
    r"NotFound|NotSupportedError|ArgumentInvalid|CycleError|GameNotFound)\s*\("
)

_INSTANCEOF_RE = re.compile(
    r"(?<![\w$.])([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)\s+instanceof\s+util\.(UserCanceled|"
    r"ProcessCanceled|DataInvalid|SetupError|MissingInterpreter|NotFound|NotSupportedError|"
    r"ArgumentInvalid|CycleError|GameNotFound)\b"
)

# name -> (kind, min_args, max_args, message_fn(args) -> str, payload_fn(args) -> [(field, expr), ...])
# args is the list of already-stripped argument source-text strings, 0-indexed.


def _msg_arg0(args):
    return args[0]


def _lit(text):
    return lambda args: text


_CLASSES = {
    # Real constructor is UserCanceled(skipped?: boolean) -- but every one of this repo's
    # 186 non-bare call sites passes a STRING ("Selected wrong download", "User
    # cancelled.", ...), never a boolean (verified: grepped every distinct argument
    # value in the repo). That string was always inert dead weight in the old class (no
    # message slot to put it in), so route it to VortexError's real `message` param
    # instead of preserving the nonsensical `skipped: "some sentence"` shape -- still the
    # same silent-abort 'user-canceled' kind, still zero visible behavior change (this
    # class never rendered a dialog either way), just puts the text somewhere it's
    # actually readable (logs/err.message) instead of a boolean field that ignored it.
    "UserCanceled": (
        "user-canceled", 0, 1,
        lambda args: args[0] if args else "'User canceled'",
        lambda args: [("skipped", "true" if args else "false")],
    ),
    "ProcessCanceled": (
        "process-canceled", 1, 2,
        _msg_arg0,
        lambda args: [("extraInfo", args[1])] if len(args) > 1 else [],
    ),
    "DataInvalid": (
        "data-invalid", 1, 1,
        _msg_arg0,
        lambda args: [],
    ),
    "SetupError": (
        "setup-error", 1, 2,
        _msg_arg0,
        lambda args: [("component", args[1])] if len(args) > 1 else [],
    ),
    "MissingInterpreter": (
        "missing-interpreter", 1, 2,
        _msg_arg0,
        lambda args: [("url", args[1])] if len(args) > 1 else [],
    ),
    "NotFound": (
        "not-found", 1, 1,
        _msg_arg0,
        lambda args: [],
    ),
    "NotSupportedError": (
        "not-supported", 0, 0,
        _lit("'Not supported'"),
        lambda args: [],
    ),
    "ArgumentInvalid": (
        "argument-invalid", 1, 1,
        lambda args: f"'Invalid argument: ' + {args[0]}",
        lambda args: [("argument", args[0])],
    ),
    "CycleError": (
        "cycle-error", 1, 1,
        _lit("'Circular dependency detected'"),
        lambda args: [("cycles", args[0])],
    ),
    "GameNotFound": (
        "game-not-found", 1, 1,
        lambda args: f"'Game not found: ' + {args[0]}",
        lambda args: [("gameId", args[0])],
    ),
}


def _convert_one_call(src, masked, class_name, open_pos):
    """Try to convert one `new util.<class_name>(...)` call at open_pos (index of '(').

    Returns ((end_offset, replacement_text), None) on success, or (None, reason) to skip."""
    close_pos = find_matching_bracket(masked, open_pos)
    if close_pos is None:
        return None, "unbalanced parens (EOF before matching close)"

    arg_spans = split_top_level_masked(masked, open_pos + 1, close_pos)
    args = [src[s:e].strip() for s, e in arg_spans]

    kind, min_args, max_args, message_fn, payload_fn = _CLASSES[class_name]
    if not (min_args <= len(args) <= max_args):
        return None, f"{class_name} expects {min_args}-{max_args} arg(s), found {len(args)}"

    message = message_fn(args)
    payload = payload_fn(args)
    payload_str = "".join(f", {field}: {expr}" for field, expr in payload)
    replacement = f"new VortexError({message}, {{ kind: '{kind}'{payload_str} }})"
    return (close_pos + 1, replacement), None


def _instanceof_edits(masked):
    """(start, end, replacement) for every `<operand> instanceof util.<Class>` in masked."""
    edits = []
    for m in _INSTANCEOF_RE.finditer(masked):
        kind = _CLASSES[m.group(2)][0]
        edits.append((m.start(), m.end(), f'{m.group(1)}?.data?.kind === "{kind}"'))
    return edits


def _apply_edits(src, edits):
    for start, end, replacement in sorted(edits, key=lambda t: t[0], reverse=True):
        src = src[:start] + replacement + src[end:]
    return src


def convert_source(src):
    """Convert every `new util.<Class>(...)` call and every `instanceof util.<Class>`
    check in src. Returns (new_src, converted, checks, skipped, import_reason).
    import_reason is set when at least one call site would convert but VortexError could
    not be safely added to this file's require('vortex-api') -- the call sites are then
    left untouched rather than converted with a dangling unimported name, while the
    instanceof checks (which need no import) are still converted."""
    masked = mask_comments_and_strings(src)
    check_edits = _instanceof_edits(masked)
    call_sites = [(m.group(1), m.start(), m.end() - 1) for m in _CALL_RE.finditer(masked)]

    candidates = []
    for class_name, call_start, open_pos in call_sites:
        result, reason = _convert_one_call(src, masked, class_name, open_pos)
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

    # A check nested inside a converted call's arguments would be overwritten by that
    # call's replacement text; leave it for a rerun instead.
    kept_checks = []
    for edit in check_edits:
        if any(cs <= edit[0] < ce for cs, ce, _ in accepted):
            skipped.append((edit[0], "instanceof inside a converted call -- rerun this script"))
        else:
            kept_checks.append(edit)

    checks_only = _apply_edits(src, kept_checks)
    if not accepted:
        return checks_only, 0, len(kept_checks), skipped, None

    # Apply all offset-based edits FIRST, against the original src's offsets, while
    # they're still valid. Only afterward touch the require() line --
    # ensure_vortex_api_name re-locates its target fresh via regex, so it doesn't care
    # that the string grew, but doing it first would shift every offset computed against
    # the pre-insertion src and corrupt every splice below it.
    new_src = _apply_edits(src, accepted + kept_checks)

    new_src, added, reason = ensure_vortex_api_name(new_src, "VortexError")
    if reason is not None:
        # Can't safely add the import -- leave the call sites untouched (report them as
        # skipped too); the instanceof rewrites need no import, so they still land.
        skipped = skipped + [(call_start, f"would convert but {reason}") for call_start, _, _ in accepted]
        return checks_only, 0, len(kept_checks), skipped, reason

    return new_src, len(accepted), len(kept_checks), skipped, None


def iter_target_files(scope, batch=None, game_ids=None):
    """Same shape as convert_getsafe.py's file-scoping -- kept identical on purpose so
    the two scripts can be run over the same batch boundaries in one pass."""
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
        "Convert the 10 deprecated util.<Class>(...) error constructors to direct "
        "VortexError(message, { kind, ...payload }) construction, and every "
        "'instanceof util.<Class>' check to an err?.data?.kind comparison."
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

    counters = {"files scanned": 0, "files changed": 0, "calls converted": 0,
                "instanceof checks converted": 0, "calls skipped": 0,
                "files skipped (import)": 0}

    for path in files:
        counters["files scanned"] += 1
        label = os.path.relpath(path, REPO_ROOT)
        try:
            with open(path, encoding="utf-8") as f:
                src = f.read()
        except OSError as e:
            log_warn(label, f"could not read: {e}")
            continue

        new_src, converted, checks, skipped, import_reason = convert_source(src)
        counters["calls converted"] += converted
        counters["instanceof checks converted"] += checks
        counters["calls skipped"] += len(skipped)
        if import_reason is not None:
            counters["files skipped (import)"] += 1
            log_warn(label, f"skipped whole file -- {import_reason}")

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
            print(f"  [DRY RUN] would convert {converted} call(s), {checks} check(s): {label}")
            ok, err = node_check_source(new_src)
            if ok is False:
                log_warn(label, f"node --check would FAIL after conversion: {err}")
            continue

        write_text_atomic(path, new_src)
        print(f"  Converted {converted} call(s), {checks} check(s): {label}")
        ok, err = node_check(path)
        report_node_check(label, ok, err)

    print_count_summary(counters)


if __name__ == "__main__":
    main()
