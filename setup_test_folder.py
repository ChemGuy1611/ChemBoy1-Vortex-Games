"""
setup_test_folder.py

Creates a minimal fake game installation folder for testing a Vortex extension.
Reads the game spec out of the extension's index.js -- its name, executable and
requiredFiles -- and creates an empty file at the full path of the executable,
including every subfolder, plus every discovery path the spec requires, so
Vortex can detect the game.

Extensions that pick their executable at runtime (a getExecutable function that
probes the game folder) declare one constant per store or edition instead;
those are read from EXEC_KEYS, preferring the default/Steam build. GAME_NAME,
REQ_FILE, EXEC_NAME, BINARIES_PATH and STEAM_EXEC_FOLDER are used as fallbacks
for anything the spec does not answer.

Test folders are created under the VORTEX_TEST_ROOT directory.

Environment variables:
    VORTEX_TEST_ROOT  (optional, default: D:\\Game_Tools_D\\!TestGameFolders_D)

Usage:
    python setup_test_folder.py GAME_ID [GAME_ID ...]
    python setup_test_folder.py GAME_ID --dry-run
    python setup_test_folder.py GAME_ID --force
    python setup_test_folder.py GAME_ID [GAME_ID ...] --clean
    python setup_test_folder.py GAME_ID [GAME_ID ...] --clean --dry-run
    python setup_test_folder.py --list

    --list  List all existing test folders with size and last-modified time,
            then exit. No GAME_ID needed.

Examples:
    python setup_test_folder.py hollowknight
    python setup_test_folder.py helldivers2 reddeadredemption2
"""

import argparse
import os
import re
import sys
from datetime import datetime

from vortex_utils import REPO_ROOT, safe_windows_dirname, log_error, log_info, build_js_symbol_table, read_index_js, safe_rmtree, touch_empty, print_run_summary, is_real_value
TEST_ROOT = os.environ.get("VORTEX_TEST_ROOT", r"D:\Game_Tools_D\!TestGameFolders_D")

# Executable constants, in the order they are tried when the game spec does not
# name a resolvable executable. Extensions that pick their exe at runtime (a
# getExecutable function probing the discovered folder) declare one constant per
# store or edition instead. Default/Steam builds come first; EXEC_XBOX is last
# because it is the gamelaunchhelper.exe shim -- creating it would make the
# extension treat the test folder as a Game Pass install and use Xbox mod paths.
EXEC_KEYS = (
    "EXEC",
    "EXEC_DEFAULT",
    "DEFAULT_EXEC",
    "STEAM_EXEC",
    "EXEC_STEAM",
    "EXEC_GOG",
    "EXEC_EPIC",
    "EXEC_CLASSIC",
    "EXEC_NEW",
    "EXEC_XBOX",
)

_PROBE = "__SETUP_TEST_FOLDER_PROBE__"
_SPEC_START = re.compile(r'["\']?game["\']?\s*:\s*\{')
_REGISTER_GAME = re.compile(r'registerGame\s*\(\s*\{')
_LINE_COMMENT = re.compile(r'^\s*//')


# ── index.js game spec parsing ────────────────────────────────────────────────

def _match_block(src, start, opener, closer):
    """Return src from the opener at/after start through its matching closer."""
    begin = src.index(opener, start)
    depth = 0
    for i in range(begin, len(src)):
        if src[i] == opener:
            depth += 1
        elif src[i] == closer:
            depth -= 1
            if depth == 0:
                return src[begin:i + 1]
    return None


def find_game_spec(src):
    """
    Return the source of the registered game object, or None.

    Most extensions declare `const gameSpec = { "game": { ... } }`; a few call
    `context.registerGame({ ... })` with an inline object instead.
    """
    m = _SPEC_START.search(src) or _REGISTER_GAME.search(src)
    if m is None:
        return None
    return _match_block(src, m.start(), "{", "}")


def _strip_comments(text):
    """Drop whole-line // comments so commented-out spec fields are ignored."""
    return "\n".join(l for l in text.splitlines() if not _LINE_COMMENT.match(l))


def spec_field(spec, field):
    """Return the raw expression assigned to a scalar spec field, or None."""
    if not spec:
        return None
    m = re.search(
        r'^[ \t]*["\']?' + field + r'["\']?\s*:\s*(.+?),?[ \t]*$',
        _strip_comments(spec), re.MULTILINE
    )
    return m.group(1) if m else None


def spec_list_field(spec, field):
    """
    Return the raw expression assigned to an array spec field: either the
    array literal itself (which may span lines) or the name of a const array
    declared elsewhere, e.g. `requiredFiles,`. Returns None if absent.
    """
    if not spec:
        return None
    clean = _strip_comments(spec)
    m = re.search(r'["\']?' + field + r'["\']?\s*(?:,|:\s*)', clean)
    if m is None:
        return None
    if clean[m.end() - 1] == ",":       # shorthand property: `requiredFiles,`
        return field
    rest = clean[m.end():].lstrip()
    if not rest.startswith("["):
        return rest.split(",")[0].split("\n")[0]
    return _match_block(clean, m.end(), "[", "]")


def resolve_expr(src, expr):
    """
    Resolve a JS value expression against the file's own symbol table by
    appending it as a probe constant. Returns None for anything the symbol
    table cannot resolve (runtime functions, unfilled placeholders).
    """
    if not expr:
        return None
    expr = re.sub(r'\s*//.*$', '', expr.strip())
    expr = re.sub(r'^\(\s*\)\s*=>\s*', '', expr).strip().rstrip(",;").strip()
    if not expr:
        return None
    val = build_js_symbol_table(f"{src}\nconst {_PROBE} = {expr};\n").get(_PROBE)
    return val if is_real_value(val) else None


def resolve_array(src, expr):
    """Resolve an array expression, following a reference to a const array."""
    if not expr:
        return []
    expr = expr.strip()
    if expr.startswith("["):
        items = [p.strip() for p in expr[1:-1].split(",") if p.strip()]
    elif re.match(r'^\w+$', expr):
        m = re.search(r'^(?:const|let)\s+' + expr + r'\s*=\s*', src, re.MULTILINE)
        if m is None:
            return []
        block = _match_block(src, m.end(), "[", "]")
        if block is None:
            return []
        items = [p.strip() for p in block[1:-1].split(",") if p.strip()]
    else:
        items = [expr]
    return [v for v in (resolve_expr(src, item) for item in items) if v]


# ── Exec/path resolution ──────────────────────────────────────────────────────

def resolve_game_name(src, table):
    """
    Return the game's display name, which is also its test folder name.

    GAME_NAME is the convention; a few extensions pass the name as a literal
    straight to registerGame instead, so the spec is used as a fallback.
    """
    name = table.get("GAME_NAME")
    if is_real_value(name):
        return name
    return resolve_expr(src, spec_field(find_game_spec(src), "name"))


def _normalise_rel(value, add_exe=False):
    """Normalise a relative path: OS separators, no '.' or empty segments."""
    parts = [p for p in value.replace("/", os.sep).split(os.sep) if p not in ("", ".")]
    if not parts:
        return None
    rel = os.path.join(*parts)
    # Append .exe only when the name has no file extension at all.
    # Avoids mangling non-Windows execs like game.x86_64 or game.sh.
    if add_exe and not os.path.splitext(rel)[1]:
        rel += ".exe"
    return rel


def resolve_exec(src, table):
    """
    Return the executable path relative to the game root, including every
    directory part (e.g. 'Base\\Binaries\\Win64\\Civ7_Win64_DX12_FinalRelease.exe'),
    or None if it cannot be resolved.

    The game spec's `executable` field is what Vortex actually launches, so it
    wins. Extensions that choose their exe at runtime leave a function there
    instead; those declare one constant per store or edition, which is what
    EXEC_KEYS covers. BINARIES_PATH is only consulted when nothing but a bare
    EXEC_NAME is available -- in most extensions it is a mod deployment target,
    not the folder the exe lives in.
    """
    rel = resolve_expr(src, spec_field(find_game_spec(src), "executable"))

    if rel is None:
        for key in EXEC_KEYS:
            val = table.get(key)
            if is_real_value(val):
                rel = val
                break

    # Still nothing: build a path from the filename plus whichever folder
    # constant is available.
    if rel is None:
        exec_name = table.get("EXEC_NAME")
        if not is_real_value(exec_name):
            return None
        folder = table.get("BINARIES_PATH")
        if not is_real_value(folder):
            folder = table.get("STEAM_EXEC_FOLDER")
        rel = os.path.join(folder, exec_name) if is_real_value(folder) else exec_name

    return _normalise_rel(rel, add_exe=True)


def resolve_req_files(src, table):
    """
    Return the game's discovery paths relative to the game root.

    Vortex only reports a game as discovered when every entry of the spec's
    `requiredFiles` is present, so all of them are created. Some extensions
    keep that array in a top-level `requiredFiles` const and attach it when
    registering the game, so that name is the fallback. REQ_FILE -- the
    constant the templates feed into the array -- is included as well, for
    specs whose array cannot be resolved statically.
    """
    expr = spec_list_field(find_game_spec(src), "requiredFiles") or "requiredFiles"
    paths = resolve_array(src, expr)

    req_file = table.get("REQ_FILE")
    if is_real_value(req_file) and req_file not in paths:
        paths.append(req_file)

    return [p for p in (_normalise_rel(v) for v in paths) if p]


# ── Main logic ────────────────────────────────────────────────────────────────

def setup(game_id, dry_run=False, force=False):
    folder = os.path.join(REPO_ROOT, f"game-{game_id}")

    src = read_index_js(folder)
    if src is None:
        log_error(game_id, f"no index.js found in game-{game_id}/")
        return False

    table = build_js_symbol_table(src)

    game_name = resolve_game_name(src, table)
    if not game_name:
        log_error(game_id, "could not resolve GAME_NAME from index.js")
        return False

    exec_rel = resolve_exec(src, table)
    if not exec_rel or exec_rel == ".exe":
        log_error(game_id, "could not resolve executable name from index.js")
        return False

    # Build the target paths -strip characters invalid in Windows folder names
    safe_game_name = safe_windows_dirname(game_name)
    game_folder = os.path.join(TEST_ROOT, safe_game_name)
    exec_file = os.path.join(game_folder, exec_rel)
    exec_dir = os.path.dirname(exec_file)

    # Discovery paths -relative to game_folder. Entries whose basename has no
    # file extension are folders, everything else is an empty file.
    req_paths = [
        (os.path.join(game_folder, rel), not os.path.splitext(os.path.basename(rel))[1])
        for rel in resolve_req_files(src, table)
    ]

    if dry_run:
        log_info(game_id, "[DRY RUN] Would create:")
        print(f"    exe:      {exec_file}")
        for req_path, is_dir in req_paths:
            if req_path != exec_file:
                print(f"    req_file: {req_path}  ({'dir' if is_dir else 'file'})")
        return True

    # Create the exe
    os.makedirs(exec_dir, exist_ok=True)
    if not os.path.exists(exec_file) or force:
        touch_empty(exec_file, force=True)
        log_info(game_id, f"Created exe:      {exec_file}")
    else:
        log_info(game_id, f"Already exists:   {exec_file}")

    # Create each discovery path that differs from the exe
    for req_path, is_dir in req_paths:
        if req_path == exec_file:
            continue
        if is_dir:
            os.makedirs(req_path, exist_ok=True)
            log_info(game_id, f"Created req dir:  {req_path}")
        else:
            os.makedirs(os.path.dirname(req_path), exist_ok=True)
            if not os.path.exists(req_path) or force:
                touch_empty(req_path, force=True)
                log_info(game_id, f"Created req file: {req_path}")

    return True


def clean(game_id, dry_run=False):
    """Delete the test folder for a game. Resolves GAME_NAME from index.js."""
    folder = os.path.join(REPO_ROOT, f"game-{game_id}")

    src = read_index_js(folder)
    if src is None:
        log_error(game_id, f"no index.js found in game-{game_id}/")
        return False

    table = build_js_symbol_table(src)
    game_name = resolve_game_name(src, table)
    if not game_name:
        log_error(game_id, "could not resolve GAME_NAME from index.js")
        return False

    safe_game_name = safe_windows_dirname(game_name)
    if not safe_game_name:
        log_error(game_id, f"GAME_NAME '{game_name}' cannot be sanitized to a valid folder name")
        return False
    game_folder = os.path.join(TEST_ROOT, safe_game_name)

    if not os.path.isdir(game_folder):
        log_info(game_id, f"Nothing to clean: {game_folder}")
        return True

    if dry_run:
        log_info(game_id, f"[DRY RUN] Would delete: {game_folder}")
        return True

    safe_rmtree(game_folder, "close the game or Vortex first")
    log_info(game_id, f"Deleted: {game_folder}")
    return True


def _folder_size(path):
    """Return total size in bytes of all files under path."""
    total = 0
    for root, _dirs, files in os.walk(path):
        for name in files:
            try:
                total += os.path.getsize(os.path.join(root, name))
            except OSError:
                pass
    return total


def _format_size(size):
    """Format a byte count as B / KB / MB / GB."""
    for unit in ("B", "KB", "MB"):
        if size < 1024:
            return f"{size:.0f} {unit}" if unit == "B" else f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} GB"


def list_folders():
    """Print all test folders under TEST_ROOT with size and last-modified time."""
    entries = sorted(
        e for e in os.listdir(TEST_ROOT)
        if os.path.isdir(os.path.join(TEST_ROOT, e))
    )
    if not entries:
        print(f"No test folders found in {TEST_ROOT}.")
        return
    print(f"Test folders in {TEST_ROOT}:\n")
    total = 0
    for name in entries:
        path = os.path.join(TEST_ROOT, name)
        size = _folder_size(path)
        total += size
        mtime = datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M:%S")
        print(f"  {mtime}  {_format_size(size):>10}  {name}")
    print(f"\n  {len(entries)} folder(s), {_format_size(total)} total")


def main():
    parser = argparse.ArgumentParser(
        description="Create minimal fake game installation folders for Vortex testing."
    )
    parser.add_argument(
        "game",
        nargs="*",
        metavar="GAME_ID",
        help="One or more game IDs to set up test folders for.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be created without making directories or files.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Recreate the .exe stub even if it already exists.",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Delete the test folder(s) for the given game ID(s) instead of creating them.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all existing test folders with size and last-modified time, then exit.",
    )
    args = parser.parse_args()

    if not args.list and not args.game:
        parser.error("Provide at least one GAME_ID (or use --list).")

    if not os.path.isdir(TEST_ROOT) and (args.list or not args.dry_run or args.clean):
        print(f"ERROR: Test root directory not found: {TEST_ROOT}")
        sys.exit(1)

    if args.list:
        list_folders()
        return

    label = " [DRY RUN]" if args.dry_run else ""
    saved = []
    failed = []
    try:
        if args.clean:
            print(f"Cleaning test folder(s) in {TEST_ROOT}{label}...\n")
            for game_id in args.game:
                try:
                    # clean()/setup() return False for soft failures (no index.js,
                    # unresolvable GAME_NAME or executable). Counting those as
                    # neither saved nor failed dropped them from the summary
                    # entirely, so a run that resolved nothing reported "Saved: 0"
                    # with no failure list.
                    (saved if clean(game_id, args.dry_run) else failed).append(game_id)
                except Exception as e:
                    log_error(game_id, str(e))
                    failed.append(game_id)
        else:
            print(f"Setting up test folder(s) in {TEST_ROOT}{label}...\n")
            for game_id in args.game:
                try:
                    (saved if setup(game_id, args.dry_run, args.force)
                     else failed).append(game_id)
                except Exception as e:
                    log_error(game_id, str(e))
                    failed.append(game_id)
    except KeyboardInterrupt:
        print("\n\n  Interrupted.")
    finally:
        print_run_summary(saved, failed, [])
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main() or 0)
