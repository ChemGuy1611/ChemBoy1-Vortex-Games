#!/usr/bin/env python3
"""
deploy_to_vortex.py -- Copy CB1 game extension folder(s) to the Vortex plugins directory.

Usage:
    python deploy_to_vortex.py GAME_ID [GAME_ID ...] [--dry-run] [--force]

Arguments:
    GAME_ID     One or more game IDs (e.g. thelastofuspart2)
    --dry-run   Preview what would change without copying
    --force     Always do a full folder replace instead of index.js-only update
"""

import argparse
import os
import re
import shutil
import sys

import vortex_utils as vu

PLUGINS_DIR = r"C:\ProgramData\vortex\plugins"

_GAME_NAME_RE = re.compile(r'const GAME_NAME\s*=\s*["\']([^"\']+)["\']')

def _read_game_name(src: str) -> str | None:
    index_js = os.path.join(src, "index.js")
    try:
        with open(index_js, encoding="utf-8") as f:
            for line in f:
                m = _GAME_NAME_RE.search(line)
                if m:
                    return m.group(1)
    except OSError:
        pass
    return None


def find_existing_plugin(game_id: str, game_name: str | None) -> str | None:
    """Return path to an existing plugin folder matching game-{game_id}[-*] or
    'Vortex Extension Update - {game_name} Vortex Extension v*'."""
    prefix = f"game-{game_id}"
    try:
        entries = sorted(os.listdir(PLUGINS_DIR))
    except OSError:
        return None
    for name in entries:
        if name == prefix or name.startswith(prefix + "-"):
            return os.path.join(PLUGINS_DIR, name)
    if game_name:
        needle = vu.roman_to_arabic(f"Vortex Extension Update - {game_name} Vortex Extension")
        for name in entries:
            if vu.roman_to_arabic(name).startswith(needle):
                return os.path.join(PLUGINS_DIR, name)
    return None


def deploy_game(game_id: str, dry_run: bool, force: bool) -> bool:
    src = os.path.join(vu.REPO_ROOT, f"game-{game_id}")
    if not os.path.isdir(src):
        vu.log_error(game_id, f"source folder not found: {src}")
        return False

    game_name = _read_game_name(src)
    existing = None if force else find_existing_plugin(game_id, game_name)
    dest = existing or os.path.join(PLUGINS_DIR, f"game-{game_id}")
    pfx = vu.dry_prefix(dry_run)

    if dry_run:
        if existing:
            print(f"{pfx}[{game_id}] copy index.js -> {existing}")
        else:
            action = "overwrite" if os.path.isdir(dest) else "create"
            print(f"{pfx}[{game_id}] {action} -> {dest}")
            for name in sorted(os.listdir(src)):
                status = "(overwrite)" if os.path.exists(os.path.join(dest, name)) else "(new)"
                print(f"  {name} {status}")
        return True

    if existing:
        src_js = os.path.join(src, "index.js")
        dest_js = os.path.join(existing, "index.js")
        shutil.copy2(src_js, dest_js)
        print(f"[{game_id}] updated index.js in {os.path.basename(existing)}")
    else:
        if os.path.isdir(dest):
            shutil.rmtree(dest)
        shutil.copytree(src, dest)
        files = os.listdir(dest)
        print(f"[{game_id}] deployed to {dest} ({len(files)} files)")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Deploy CB1 extension folder(s) to the Vortex plugins directory."
    )
    parser.add_argument("game_ids", nargs="+", metavar="GAME_ID")
    parser.add_argument("--dry-run", action="store_true", help="preview without copying")
    parser.add_argument("--force", action="store_true", help="full folder replace instead of index.js-only update")
    args = parser.parse_args()

    if not os.path.isdir(PLUGINS_DIR):
        print(f"[ERROR] Vortex plugins folder not found: {PLUGINS_DIR}")
        sys.exit(1)

    results = [deploy_game(gid, dry_run=args.dry_run, force=args.force) for gid in args.game_ids]
    if not all(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
