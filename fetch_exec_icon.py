#!/usr/bin/env python3
"""
fetch_exec_icon.py
------------------
Finds all game-* extension folders missing their exec.png icon and downloads
it from the Steam CDN (64x64 PNG).

Usage:
    python fetch_exec_icon.py
    python fetch_exec_icon.py --game abioticfactor
    python fetch_exec_icon.py --dry-run

Options:
    --game GAME_ID   Only process the single extension with this game ID.
    --dry-run        List missing exec.png files without downloading anything.

Requirements:
    pip install Pillow
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


def extract_game_name(src):
    """Extract GAME_NAME value from index.js source for Steam icon search."""
    m = re.search(r"const\s+GAME_NAME\s*=\s*['\"]([^'\"]+)['\"]", src)
    return m.group(1) if m else None


# ── Core logic ────────────────────────────────────────────────────────────────

def find_targets(target_game_id=None, force=False):
    """
    Yields (folder_path, game_id, steamapp_id, game_name) for extensions to process.
    Without --force, skips extensions that already have an exec.png.
    If target_game_id is set, only that extension is checked.
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

        if target_game_id and game_id != target_game_id:
            continue

        icon_path = os.path.join(folder, "exec.png")
        if os.path.isfile(icon_path) and not force:
            continue

        steamapp_id = extract_steamapp_id(src)
        game_name = extract_game_name(src)
        yield folder, game_id, steamapp_id, game_name


def fetch_all(target_game_id=None, dry_run=False, force=False):
    saved = []
    failed = []
    skipped = []

    targets = list(find_targets(target_game_id, force))
    if not targets:
        print("No missing exec.png files found.")
        return

    for folder, game_id, steamapp_id, game_name in targets:
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

        out_path = os.path.join(folder, "exec.png")
        ok, source = ne.download_exec_icon(steamapp_id, game_name or game_id, out_path)
        if ok:
            print(f"  Saved: {source}")
            saved.append(game_id)
        else:
            print(f"  FAILED — add exec.png manually (64x64 PNG)")
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
        description="Download missing exec.png icons for Vortex game extensions."
    )
    parser.add_argument(
        "--game",
        metavar="GAME_ID",
        help="Only process the extension with this game ID.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List missing exec.png files without downloading.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download exec.png even if it already exists.",
    )
    args = parser.parse_args()
    fetch_all(target_game_id=args.game, dry_run=args.dry_run, force=args.force)


if __name__ == "__main__":
    main()
