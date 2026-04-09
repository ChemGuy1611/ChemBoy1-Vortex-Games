"""
setup_test_folder.py

Creates a minimal fake game installation folder for testing a Vortex extension.
Reads GAME_NAME, EXEC/EXEC_NAME, and BINARIES_PATH from the extension's index.js,
then creates an empty executable file at the correct path so Vortex can detect the game.

Test folders are created under: D:\\Game_Tools_D\\!TestGameFolders_D\\{GAME_NAME}\\

Usage:
    python setup_test_folder.py GAME_ID [GAME_ID ...]
    python setup_test_folder.py GAME_ID --dry-run
    python setup_test_folder.py GAME_ID --force
"""

import argparse
import os
import re
import sys

from vortex_utils import REPO_ROOT
TEST_ROOT = os.environ.get("VORTEX_TEST_ROOT", r"D:\Game_Tools_D\!TestGameFolders_D")


# ── Symbol table builder ──────────────────────────────────────────────────────

def build_symbol_table(src):
    """
    Build a simple {name: value} dict of resolved string constants from index.js.
    Handles:
      - String literals:   const FOO = "bar"  or  const FOO = 'bar'
      - Template literals: const FOO = `${OTHER}suffix`
      - path.join():       const FOO = path.join("a", "b")  → "a/b"
      - Variable refs:     const FOO = OTHER_VAR
    Multi-pass to resolve chained references.
    """
    table = {}

    # Pass 1: collect all literal string constants (trailing semicolon optional)
    for m in re.finditer(
        r'^(?:const|let)\s+(\w+)\s*=\s*["`\'](.*?)["`\']\s*;?',
        src, re.MULTILINE
    ):
        table[m.group(1)] = m.group(2)

    # Pass 2: resolve template literals  `${VAR}suffix` or `prefix${VAR}`
    # (run before path.join() pass so template vars are available for substitution)
    for m in re.finditer(
        r'^(?:const|let)\s+(\w+)\s*=\s*`(.*?)`\s*;?',
        src, re.MULTILINE
    ):
        name = m.group(1)
        template = m.group(2)
        resolved = re.sub(
            r'\$\{(\w+)\}',
            lambda r: table.get(r.group(1), r.group(0)),
            template
        )
        if '${' not in resolved:
            table[name] = resolved

    # Pass 3: collect path.join(...) constants, resolving variable refs from table
    for m in re.finditer(
        r'^(?:const|let)\s+(\w+)\s*=\s*path\.join\((.+?)\)\s*;?',
        src, re.MULTILINE
    ):
        name = m.group(1)
        args_str = m.group(2)
        parts = []
        for arg in re.split(r',', args_str):
            arg = arg.strip()
            # Quoted string literal
            qm = re.match(r'^["\']([^"\']*)["\']$', arg)
            if qm:
                parts.append(qm.group(1))
                continue
            # Template literal  `Win${BITS}`
            tm = re.match(r'^`(.*)`$', arg)
            if tm:
                resolved = re.sub(
                    r'\$\{(\w+)\}',
                    lambda r: table.get(r.group(1), r.group(0)),
                    tm.group(1)
                )
                if '${' not in resolved:
                    parts.append(resolved)
                continue
            # Variable reference
            if re.match(r'^\w+$', arg) and arg in table:
                parts.append(table[arg])
                continue
            # Unresolvable -abort this join
            parts = None
            break
        if parts:
            table[name] = "/".join(parts)

    # Pass 4: resolve variable-to-variable refs
    for m in re.finditer(
        r'^(?:const|let)\s+(\w+)\s*=\s*(\w+)\s*;?',
        src, re.MULTILINE
    ):
        name, ref = m.group(1), m.group(2)
        if name not in table and ref in table:
            table[name] = table[ref]

    return table


# ── Exec/path resolution ──────────────────────────────────────────────────────

def resolve_exec(table):
    """
    Return (exec_filename, binaries_path) where:
      exec_filename -the .exe filename only (no directory parts)
      binaries_path -subdirectory relative to game root, or '' for root
    """
    def valid(val):
        return val and val != "XXX" and not val.startswith("${")

    # Prefer EXEC_NAME, then STEAM_EXEC/EXEC_STEAM, then extract filename from EXEC
    exec_name = None
    for key in ("EXEC_NAME", "STEAM_EXEC", "EXEC_STEAM", "EXEC"):
        val = table.get(key)
        if valid(val):
            exec_name = os.path.basename(val.replace("/", os.sep))
            break

    # Strip .exe if not present and re-add to normalise
    if exec_name and not exec_name.lower().endswith(".exe"):
        exec_name += ".exe"

    # BINARIES_PATH -also try STEAM_EXEC_FOLDER as fallback
    bin_path = table.get("BINARIES_PATH", "")
    if not valid(bin_path):
        bin_path = table.get("STEAM_EXEC_FOLDER", "")
    if bin_path in (".", "", None) or not valid(bin_path):
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
    def valid(val):
        return val and val != "XXX" and not val.startswith("${")

    val = table.get("REQ_FILE")
    if not valid(val):
        return None
    return val.replace("/", os.sep)


# ── Main logic ────────────────────────────────────────────────────────────────

def setup(game_id, dry_run=False, force=False):
    folder = os.path.join(REPO_ROOT, f"game-{game_id}")
    index_path = os.path.join(folder, "index.js")

    if not os.path.isfile(index_path):
        print(f"  [{game_id}] ERROR -no index.js found in game-{game_id}/")
        return False

    with open(index_path, encoding="utf-8") as f:
        src = f.read()

    table = build_symbol_table(src)

    game_name = table.get("GAME_NAME")
    if not game_name or game_name == "XXX":
        print(f"  [{game_id}] ERROR -could not resolve GAME_NAME from index.js")
        return False

    exec_name, bin_path = resolve_exec(table)
    if not exec_name or exec_name == ".exe":
        print(f"  [{game_id}] ERROR -could not resolve executable name from index.js")
        return False

    req_file = resolve_req_file(table)

    # Build the target paths -strip characters invalid in Windows folder names
    safe_game_name = re.sub(r'[<>:"/\\|?*]', '', game_name).strip()
    game_folder = os.path.join(TEST_ROOT, safe_game_name)
    exec_dir = os.path.join(game_folder, bin_path) if bin_path else game_folder
    exec_file = os.path.join(exec_dir, exec_name)

    # REQ_FILE path -relative to game_folder
    req_path = os.path.join(game_folder, req_file) if req_file else None
    # If REQ_FILE has no extension it is a folder (e.g. EPIC_CODE_NAME)
    req_is_dir = req_path and not os.path.splitext(req_file)[1]

    if dry_run:
        print(f"  [{game_id}] [DRY RUN] Would create:")
        print(f"    exe:      {exec_file}")
        if req_path and req_path != exec_file:
            kind = "dir" if req_is_dir else "file"
            print(f"    req_file: {req_path}  ({kind})")
        return True

    # Create the exe
    os.makedirs(exec_dir, exist_ok=True)
    if not os.path.exists(exec_file) or force:
        with open(exec_file, "w") as f:
            pass
        print(f"  [{game_id}] Created exe:      {exec_file}")
    else:
        print(f"  [{game_id}] Already exists:   {exec_file}")

    # Create REQ_FILE if it differs from the exe
    if req_path and req_path != exec_file:
        if req_is_dir:
            os.makedirs(req_path, exist_ok=True)
            print(f"  [{game_id}] Created req dir:  {req_path}")
        else:
            os.makedirs(os.path.dirname(req_path), exist_ok=True)
            if not os.path.exists(req_path) or force:
                with open(req_path, "w") as f:
                    pass
                print(f"  [{game_id}] Created req file: {req_path}")

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
    args = parser.parse_args()

    if not args.dry_run and not os.path.isdir(TEST_ROOT):
        print(f"ERROR: Test root directory not found: {TEST_ROOT}")
        sys.exit(1)

    label = " [DRY RUN]" if args.dry_run else ""
    print(f"Setting up test folder(s) in {TEST_ROOT}{label}...\n")
    success = 0
    for game_id in args.game:
        if setup(game_id, args.dry_run, args.force):
            success += 1

    print(f"\nDone. {success}/{len(args.game)} succeeded.")


if __name__ == "__main__":
    main()
