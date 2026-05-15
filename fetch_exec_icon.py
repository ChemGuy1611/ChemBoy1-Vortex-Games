#!/usr/bin/env python3
"""
fetch_exec_icon.py
------------------
Finds all game-* extension folders missing their exec.png icon and downloads
it from the Steam CDN (64x64 PNG) with SteamGridDB icon as fallback.

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
Environment variables:
    STEAMGRIDDB_API_KEY  (optional, consumed by vortex_utils.download_exec_icon;
                         used as fallback icon source when the Steam CDN has no icon)
"""

import os
import argparse

from vortex_utils import (
    extract_steamapp_id, extract_game_name, iter_game_folders,
    download_exec_icon, print_run_summary, const_value,
)


# ── Core logic ────────────────────────────────────────────────────────────────

def find_targets(target_game_ids=None, force=False):
    """
    Yields (folder_path, game_id, steamapp_id, game_name) for extensions to process.
    Without --force, skips extensions that already have an exec.png.
    If target_game_ids is set, only those extensions are checked.
    """
    for folder, game_id, src in iter_game_folders(target_game_ids):
        icon_path = os.path.join(folder, "exec.png")
        if os.path.isfile(icon_path) and not force:
            continue
        if const_value(src, "STEAMAPP_ID") == "null":
            continue  # Xbox/Epic-only game -- no Steam icon available
        steamapp_id = extract_steamapp_id(src)
        if not steamapp_id:
            continue  # XXX placeholder or other non-resolvable ID
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
            print(f"  MISSING  {label}  (Steam {steamapp_id})")
            continue

        print(f"\n{label}")

        out_path = os.path.join(folder, "exec.png")
        try:
            ok, source = download_exec_icon(steamapp_id, game_name or game_id, out_path)
        except Exception as e:
            print(f"  ERROR - {e}")
            failed.append(game_id)
            continue
        if ok:
            print(f"  Saved: {source}")
            saved.append(game_id)
        else:
            print(f"  FAILED -- add exec.png manually (64x64 PNG)")
            failed.append(game_id)

    if dry_run:
        return

    print_run_summary(saved, failed, skipped)


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
