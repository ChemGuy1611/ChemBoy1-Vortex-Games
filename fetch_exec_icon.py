#!/usr/bin/env python3
"""
fetch_exec_icon.py
------------------
Finds all game-* extension folders missing their exec.png icon and downloads
it from the Steam CDN (64x64 PNG).

Usage:
    python fetch_exec_icon.py
    python fetch_exec_icon.py GAME_ID [GAME_ID ...]
    python fetch_exec_icon.py --dry-run
    python fetch_exec_icon.py --force

Options:
    GAME_ID          One or more game IDs to process. Omit to process all.
    --dry-run        List missing exec.png files without downloading anything.
    --force          Re-download exec.png even if it already exists.

Requirements:
    pip install Pillow
"""

import os
import sys
import argparse

from vortex_utils import (
    REPO_ROOT, read_index_js, extract_game_id, extract_steamapp_id,
    extract_game_name,
)

# Import download helper from new_extension.py
sys.path.insert(0, REPO_ROOT)
import new_extension as ne


# ── Core logic ────────────────────────────────────────────────────────────────

def find_targets(target_game_ids=None, force=False):
    """
    Yields (folder_path, game_id, steamapp_id, game_name) for extensions to process.
    Without --force, skips extensions that already have an exec.png.
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

        icon_path = os.path.join(folder, "exec.png")
        if os.path.isfile(icon_path) and not force:
            continue

        steamapp_id = extract_steamapp_id(src)
        game_name = extract_game_name(src)
        yield folder, game_id, steamapp_id, game_name


def fetch_all(target_game_ids=None, dry_run=False, force=False):
    saved = []
    failed = []
    skipped = []

    targets = list(find_targets(target_game_ids, force))
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

    print(f"\n{'-' * 50}")
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
        "game",
        nargs="*",
        metavar="GAME_ID",
        help="One or more game IDs to process. Omit to process all.",
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
    fetch_all(target_game_ids=set(args.game) or None, dry_run=args.dry_run, force=args.force)


if __name__ == "__main__":
    main()
