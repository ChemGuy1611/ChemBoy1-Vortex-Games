#!/usr/bin/env python3
"""
fetch_cover_art.py
------------------
Finds all game-* extension folders missing their {GAME_ID}.jpg cover art and
downloads it from SteamGridDB (heroes) or Steam library_hero.jpg.

Usage:
    python fetch_cover_art.py
    python fetch_cover_art.py --game abioticfactor
    python fetch_cover_art.py --dry-run

Options:
    --game GAME_ID   Only process the single extension with this game ID.
    --dry-run        List missing cover art files without downloading anything.

Requirements:
    pip install Pillow
Environment variables:
    STEAMGRIDDB_API_KEY  (optional, for higher-quality cover art)
"""

import os
import re
import sys
import argparse

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

# Import shared helpers from new_extension.py
sys.path.insert(0, REPO_ROOT)
import new_extension as ne


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_sgdb_key():
    key = os.environ.get("STEAMGRIDDB_API_KEY")
    if not key:
        try:
            from winreg import OpenKey, QueryValueEx, HKEY_CURRENT_USER
            with OpenKey(HKEY_CURRENT_USER, "Environment") as reg_key:
                key, _ = QueryValueEx(reg_key, "STEAMGRIDDB_API_KEY")
        except Exception:
            pass
    return key


def read_index_js(folder):
    """Read index.js from a game extension folder. Returns src string or None."""
    path = os.path.join(folder, "index.js")
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        return f.read()


def extract_game_id(src):
    """Extract GAME_ID value from index.js source."""
    m = re.search(r"const\s+GAME_ID\s*=\s*['\"]([^'\"]+)['\"]", src)
    return m.group(1) if m else None


def extract_steamapp_id(src):
    """Extract STEAMAPP_ID value from index.js source. Returns None if not found or null."""
    m = re.search(r"const\s+STEAMAPP_ID\s*=\s*['\"]?(\d+)['\"]?\s*;?", src)
    return m.group(1) if m else None


# ── Core logic ────────────────────────────────────────────────────────────────

def find_targets(target_game_ids=None, force=False):
    """
    Yields (folder_path, game_id, steamapp_id) for extensions to process.
    Without --force, skips extensions that already have a {GAME_ID}.jpg.
    If target_game_ids is set, only those extensions are checked.
    """
    entries = sorted(os.listdir(REPO_ROOT))
    for entry in entries:
        folder = os.path.join(REPO_ROOT, entry)
        if not os.path.isdir(folder):
            continue
        if not entry.startswith("game-"):
            continue

        src = read_index_js(folder)
        if not src:
            continue

        game_id = extract_game_id(src)
        if not game_id:
            continue

        if target_game_ids and game_id not in target_game_ids:
            continue

        jpg_path = os.path.join(folder, f"{game_id}.jpg")
        if os.path.isfile(jpg_path) and not force:
            continue

        steamapp_id = extract_steamapp_id(src)
        yield folder, game_id, steamapp_id


def fetch_all(target_game_ids=None, dry_run=False, force=False):
    sgdb_key = get_sgdb_key()
    if not dry_run and sgdb_key:
        print("SteamGridDB API key found — will try heroes first.")
    elif not dry_run:
        print("No SteamGridDB API key — will use Steam library_hero.jpg.")

    saved = []
    failed = []
    skipped = []

    targets = list(find_targets(target_game_ids, force))
    if not targets:
        print("No missing cover art files found.")
        return

    for folder, game_id, steamapp_id in targets:
        label = f"[{game_id}]"
        if dry_run:
            if steamapp_id:
                print(f"  MISSING  {label}  (Steam {steamapp_id})")
            else:
                print(f"  MISSING  {label}  (no STEAMAPP_ID — cannot auto-fetch)")
            continue

        print(f"\n{label}")
        if not steamapp_id:
            print(f"  SKIP — no STEAMAPP_ID in index.js")
            skipped.append(game_id)
            continue

        out_path = os.path.join(folder, f"{game_id}.jpg")
        ok, source = ne.download_cover_art(steamapp_id, game_id, out_path, sgdb_key)
        if ok:
            print(f"  Saved: {source}")
            saved.append(game_id)
        else:
            print(f"  FAILED — add {game_id}.jpg manually (640x360 JPG, no title text)")
            failed.append(game_id)

    if dry_run:
        return

    print(f"\n{'─' * 50}")
    print(f"Saved : {len(saved)}")
    if failed:
        print(f"Failed: {len(failed)}")
        for g in failed:
            print(f"  - {g}")
    if skipped:
        print(f"Skipped (no Steam ID): {len(skipped)}")
        for g in skipped:
            print(f"  - {g}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Download missing {GAME_ID}.jpg cover art for Vortex game extensions."
    )
    parser.add_argument(
        "game",
        nargs="*",
        metavar="GAME_ID",
        help="One or more game IDs to process. Omit to process all.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List missing cover art without downloading.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download cover art even if {GAME_ID}.jpg already exists.",
    )
    args = parser.parse_args()
    fetch_all(target_game_ids=set(args.game) or None, dry_run=args.dry_run, force=args.force)


if __name__ == "__main__":
    main()
