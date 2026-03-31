"""
setup_test_folder.py

Creates a minimal fake game installation folder for testing a Vortex extension.
Reads GAME_NAME, EXEC/EXEC_NAME, and BINARIES_PATH from the extension's index.js,
then creates an empty executable file at the correct path so Vortex can detect the game.

Test folders are created under: D:\\Game_Tools_D\\!TestGameFolders_D\\{GAME_NAME}\\

Usage:
    python setup_test_folder.py GAME_ID [GAME_ID ...]
"""

import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
TEST_ROOT = r"D:\Game_Tools_D\!TestGameFolders_D"


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

    # Pass 2: collect path.join(...) constants
    for m in re.finditer(
        r'^(?:const|let)\s+(\w+)\s*=\s*path\.join\((.+?)\)\s*;?',
        src, re.MULTILINE
    ):
        name = m.group(1)
        args_str = m.group(2)
        # Extract quoted string parts only (skip variable refs for simplicity)
        parts = re.findall(r'["\']([^"\']+)["\']', args_str)
        if parts:
            table[name] = "/".join(parts)

    # Pass 3: resolve template literals  `${VAR}suffix` or `prefix${VAR}`
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
      exec_filename — the .exe filename only (no directory parts)
      binaries_path — subdirectory relative to game root, or '' for root
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

    # BINARIES_PATH — also try STEAM_EXEC_FOLDER as fallback
    bin_path = table.get("BINARIES_PATH", "")
    if not valid(bin_path):
        bin_path = table.get("STEAM_EXEC_FOLDER", "")
    if bin_path in (".", "", None) or not valid(bin_path):
        bin_path = ""
    # Normalise forward slashes
    bin_path = bin_path.replace("/", os.sep)

    return exec_name, bin_path


# ── Main logic ────────────────────────────────────────────────────────────────

def setup(game_id):
    folder = os.path.join(REPO_ROOT, f"game-{game_id}")
    index_path = os.path.join(folder, "index.js")

    if not os.path.isfile(index_path):
        print(f"  [{game_id}] ERROR — no index.js found in game-{game_id}/")
        return False

    with open(index_path, encoding="utf-8") as f:
        src = f.read()

    table = build_symbol_table(src)

    game_name = table.get("GAME_NAME")
    if not game_name or game_name == "XXX":
        print(f"  [{game_id}] ERROR — could not resolve GAME_NAME from index.js")
        return False

    exec_name, bin_path = resolve_exec(table)
    if not exec_name or exec_name == ".exe":
        print(f"  [{game_id}] ERROR — could not resolve executable name from index.js")
        return False

    # Build the target path
    game_folder = os.path.join(TEST_ROOT, game_name)
    if bin_path:
        exec_dir = os.path.join(game_folder, bin_path)
    else:
        exec_dir = game_folder
    exec_file = os.path.join(exec_dir, exec_name)

    # Create directories and empty exe file
    os.makedirs(exec_dir, exist_ok=True)
    if not os.path.exists(exec_file):
        open(exec_file, "w").close()
        print(f"  [{game_id}] Created: {exec_file}")
    else:
        print(f"  [{game_id}] Already exists: {exec_file}")

    return True


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python setup_test_folder.py GAME_ID [GAME_ID ...]")
        sys.exit(1)

    if not os.path.isdir(TEST_ROOT):
        print(f"ERROR: Test root directory not found: {TEST_ROOT}")
        sys.exit(1)

    print(f"Setting up test folder(s) in {TEST_ROOT}...\n")
    success = 0
    for game_id in args:
        if setup(game_id):
            success += 1

    print(f"\nDone. {success}/{len(args)} succeeded.")


if __name__ == "__main__":
    main()
