"""
setup_test_folder.py

Creates a minimal fake game installation folder for testing a Vortex extension.
Reads GAME_NAME, EXEC/EXEC_NAME, BINARIES_PATH, EPIC_CODE_NAME, STEAM_EXEC,
EXEC_STEAM, STEAM_EXEC_FOLDER, and REQ_FILE from the extension's index.js,
then creates an empty executable file at the correct path so Vortex can detect the game.

Test folders are created under the VORTEX_TEST_ROOT directory.

Environment variables:
    VORTEX_TEST_ROOT  (optional, default: D:\\Game_Tools_D\\!TestGameFolders_D)

Usage:
    python setup_test_folder.py GAME_ID [GAME_ID ...]
    python setup_test_folder.py GAME_ID --dry-run
    python setup_test_folder.py GAME_ID --force
    python setup_test_folder.py GAME_ID [GAME_ID ...] --clean
    python setup_test_folder.py GAME_ID [GAME_ID ...] --clean --dry-run

Examples:
    python setup_test_folder.py hollowknight
    python setup_test_folder.py helldivers2 reddeadredemption2
"""

import argparse
import os
import sys

from vortex_utils import REPO_ROOT, safe_windows_dirname, log_error, log_info, build_js_symbol_table, read_index_js, safe_rmtree, touch_empty, print_run_summary, is_real_value
TEST_ROOT = os.environ.get("VORTEX_TEST_ROOT", r"D:\Game_Tools_D\!TestGameFolders_D")


# ── Exec/path resolution ──────────────────────────────────────────────────────

def resolve_exec(table):
    """
    Return (exec_filename, binaries_path) where:
      exec_filename -the .exe filename only (no directory parts)
      binaries_path -subdirectory relative to game root, or '' for root
    """
    # Prefer EXEC_NAME, then STEAM_EXEC/EXEC_STEAM, then extract filename from EXEC
    exec_name = None
    for key in ("EXEC_NAME", "STEAM_EXEC", "EXEC_STEAM", "EXEC"):
        val = table.get(key)
        if is_real_value(val):
            exec_name = os.path.basename(val.replace("/", os.sep))
            break

    # Append .exe only when the name has no file extension at all.
    # Avoids mangling non-Windows execs like game.x86_64 or game.sh.
    if exec_name and not os.path.splitext(exec_name)[1]:
        exec_name += ".exe"

    # UE4/5 games: exe lives at game root, not in BINARIES_PATH
    if "EPIC_CODE_NAME" in table:
        bin_path = ""
    else:
        # BINARIES_PATH -also try STEAM_EXEC_FOLDER as fallback
        bin_path = table.get("BINARIES_PATH", "")
        if not is_real_value(bin_path):
            bin_path = table.get("STEAM_EXEC_FOLDER", "")
        if bin_path in (".", "", None) or not is_real_value(bin_path):
            bin_path = ""
        # Normalise forward slashes
        bin_path = bin_path.replace("/", os.sep)

    return exec_name, bin_path


def resolve_req_file(table):
    """
    Return the REQ_FILE value from the symbol table, or None.
    REQ_FILE is either a folder name (e.g. EPIC_CODE_NAME) or a file path
    (e.g. EXEC). Normalise separators but do not strip anything.
    """
    val = table.get("REQ_FILE")
    if not is_real_value(val):
        return None
    return val.replace("/", os.sep)


# ── Main logic ────────────────────────────────────────────────────────────────

def setup(game_id, dry_run=False, force=False):
    folder = os.path.join(REPO_ROOT, f"game-{game_id}")

    src = read_index_js(folder)
    if src is None:
        log_error(game_id, f"no index.js found in game-{game_id}/")
        return False

    table = build_js_symbol_table(src)

    game_name = table.get("GAME_NAME")
    if not game_name or game_name == "XXX":
        log_error(game_id, "could not resolve GAME_NAME from index.js")
        return False

    exec_name, bin_path = resolve_exec(table)
    if not exec_name or exec_name == ".exe":
        log_error(game_id, "could not resolve executable name from index.js")
        return False

    req_file = resolve_req_file(table)

    # Build the target paths -strip characters invalid in Windows folder names
    safe_game_name = safe_windows_dirname(game_name)
    game_folder = os.path.join(TEST_ROOT, safe_game_name)
    exec_dir = os.path.join(game_folder, bin_path) if bin_path else game_folder
    exec_file = os.path.join(exec_dir, exec_name)

    # REQ_FILE path -relative to game_folder
    req_path = os.path.join(game_folder, req_file) if req_file else None
    # If the basename of REQ_FILE has no extension, treat it as a folder
    req_is_dir = req_path and not os.path.splitext(os.path.basename(req_file))[1]

    if dry_run:
        log_info(game_id, "[DRY RUN] Would create:")
        print(f"    exe:      {exec_file}")
        if req_path and req_path != exec_file:
            kind = "dir" if req_is_dir else "file"
            print(f"    req_file: {req_path}  ({kind})")
        return True

    # Create the exe
    os.makedirs(exec_dir, exist_ok=True)
    if not os.path.exists(exec_file) or force:
        touch_empty(exec_file, force=True)
        log_info(game_id, f"Created exe:      {exec_file}")
    else:
        log_info(game_id, f"Already exists:   {exec_file}")

    # Create REQ_FILE if it differs from the exe
    if req_path and req_path != exec_file:
        if req_is_dir:
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
    game_name = table.get("GAME_NAME")
    if not game_name or game_name == "XXX":
        log_error(game_id, "could not resolve GAME_NAME from index.js")
        return False

    safe_game_name = safe_windows_dirname(game_name)
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


def main():
    parser = argparse.ArgumentParser(
        description="Create minimal fake game installation folders for Vortex testing."
    )
    parser.add_argument(
        "game",
        nargs="+",
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
    args = parser.parse_args()

    if not os.path.isdir(TEST_ROOT) and (not args.dry_run or args.clean):
        print(f"ERROR: Test root directory not found: {TEST_ROOT}")
        sys.exit(1)

    label = " [DRY RUN]" if args.dry_run else ""
    saved = []
    failed = []
    try:
        if args.clean:
            print(f"Cleaning test folder(s) in {TEST_ROOT}{label}...\n")
            for game_id in args.game:
                try:
                    if clean(game_id, args.dry_run):
                        saved.append(game_id)
                except Exception as e:
                    log_error(game_id, str(e))
                    failed.append(game_id)
        else:
            print(f"Setting up test folder(s) in {TEST_ROOT}{label}...\n")
            for game_id in args.game:
                try:
                    if setup(game_id, args.dry_run, args.force):
                        saved.append(game_id)
                except Exception as e:
                    log_error(game_id, str(e))
                    failed.append(game_id)
    except KeyboardInterrupt:
        print("\n\n  Interrupted.")
    finally:
        print_run_summary(saved, failed, [])


if __name__ == "__main__":
    main()
