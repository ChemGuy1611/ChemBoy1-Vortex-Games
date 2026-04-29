#!/usr/bin/env python3
"""
fetch_cover_art.py
------------------
Finds all game-* extension folders missing their {GAME_ID}.jpg cover art and
downloads it from SteamGridDB (heroes) or Steam library_hero.jpg.

With --title, fetches {GAME_ID}_title.jpg (1920x1080, with title text) to
resources/title-images/ instead of the usual cover art.

With --banner, fetches {GAME_ID}_banner.jpg (full-size official hero) to
resources/banner-images/ from SteamGridDB. No cropping or resizing.

Usage:
    python fetch_cover_art.py
    python fetch_cover_art.py GAME_ID [GAME_ID ...]
    python fetch_cover_art.py --dry-run
    python fetch_cover_art.py --force
    python fetch_cover_art.py --title
    python fetch_cover_art.py --title GAME_ID [GAME_ID ...]
    python fetch_cover_art.py --banner
    python fetch_cover_art.py --banner GAME_ID [GAME_ID ...]

Options:
    GAME_ID          One or more game IDs to process. Omit to process all.
    --dry-run        List missing files without downloading anything.
    --force          Re-download even if the target file already exists.
    --title          Fetch title images (1920x1080) to resources/title-images/
                     instead of the usual 640x360 cover art.
    --banner         Fetch full-size official hero images to
                     resources/banner-images/. Requires STEAMGRIDDB_API_KEY.

Requirements:
    pip install Pillow
Environment variables:
    STEAMGRIDDB_API_KEY  (optional, consumed by vortex_utils download helpers;
                         required for --banner; improves --title and default mode.
                         --title falls back to Steam capsule_616x353.jpg without this key.)
"""

import os
import argparse

from vortex_utils import (
    TITLE_IMAGES_DIR, BANNER_IMAGES_DIR,
    extract_steamapp_id, get_api_key, iter_game_folders,
    download_cover_art, download_title_image, download_banner_image,
    print_run_summary, const_value,
)


# ── Core logic ────────────────────────────────────────────────────────────────

def find_targets(target_game_ids=None, force=False, mode="cover"):
    """
    Yields (folder_path, game_id, steamapp_id) for extensions to process.
    Without --force, skips extensions that already have their target image.
    If target_game_ids is set, only those extensions are checked.
    mode: "cover" (default), "title", or "banner".
    """
    for folder, game_id, src in iter_game_folders(target_game_ids):
        if mode == "title":
            target_path = os.path.join(TITLE_IMAGES_DIR, f"{game_id}_title.jpg")
        elif mode == "banner":
            target_path = os.path.join(BANNER_IMAGES_DIR, f"{game_id}_banner.jpg")
        else:
            target_path = os.path.join(folder, f"{game_id}.jpg")

        if os.path.isfile(target_path) and not force:
            continue
        if const_value(src, "STEAMAPP_ID") == "null":
            continue  # Xbox/Epic-only game -- no Steam art available

        steamapp_id = extract_steamapp_id(src)
        yield folder, game_id, steamapp_id


def fetch_all(target_game_ids=None, dry_run=False, force=False, mode="cover"):
    sgdb_key = get_api_key("STEAMGRIDDB_API_KEY")
    if mode in ("title", "banner"):
        if not sgdb_key:
            if mode == "banner":
                print("No SteamGridDB API key -- banner images require STEAMGRIDDB_API_KEY.")
                if not dry_run:
                    return
            else:
                print("No SteamGridDB API key -- title images will fall back to Steam capsule art.")
    else:
        if not dry_run and sgdb_key:
            print("SteamGridDB API key found -- will try heroes first.")
        elif not dry_run:
            print("No SteamGridDB API key -- will use Steam library_hero.jpg.")

    saved = []
    failed = []
    skipped = []

    targets = list(find_targets(target_game_ids, force, mode))
    if not targets:
        labels = {"cover": "cover art files", "title": "title images", "banner": "banner images"}
        print(f"No missing {labels[mode]} found.")
        return

    out_dir = None
    if mode == "title":
        out_dir = TITLE_IMAGES_DIR
    elif mode == "banner":
        out_dir = BANNER_IMAGES_DIR

    for folder, game_id, steamapp_id in targets:
        if mode == "title":
            label = f"[{game_id}_title.jpg]"
        elif mode == "banner":
            label = f"[{game_id}_banner.jpg]"
        else:
            label = f"[{game_id}]"
        if dry_run:
            if steamapp_id:
                print(f"  MISSING  {label}  (Steam {steamapp_id})")
            else:
                print(f"  MISSING  {label}  (no STEAMAPP_ID -- cannot auto-fetch)")
            continue

        print(f"\n{label}")
        if not steamapp_id:
            print(f"  SKIP -- no STEAMAPP_ID in index.js")
            skipped.append(game_id)
            continue

        if mode == "title":
            os.makedirs(out_dir, exist_ok=True)
            out_path = os.path.join(out_dir, f"{game_id}_title.jpg")
            ok, source = download_title_image(steamapp_id, game_id, out_path, sgdb_key)
            if ok:
                print(f"  Saved: {source}")
                saved.append(game_id)
            else:
                print(f"  FAILED -- add {game_id}_title.jpg manually to resources/title-images/ (1920x1080 JPG, with title text)")
                failed.append(game_id)
        elif mode == "banner":
            os.makedirs(out_dir, exist_ok=True)
            out_path = os.path.join(out_dir, f"{game_id}_banner.jpg")
            ok, source = download_banner_image(steamapp_id, game_id, out_path, sgdb_key)
            if ok:
                print(f"  Saved: {source}")
                saved.append(game_id)
            else:
                print(f"  FAILED -- add {game_id}_banner.jpg manually to resources/banner-images/")
                failed.append(game_id)
        else:
            out_path = os.path.join(folder, f"{game_id}.jpg")
            ok, source = download_cover_art(steamapp_id, game_id, out_path, sgdb_key)
            if ok:
                print(f"  Saved: {source}")
                saved.append(game_id)
            else:
                print(f"  FAILED -- add {game_id}.jpg manually (640x360 JPG, no title text)")
                failed.append(game_id)

    if dry_run:
        return

    print_run_summary(saved, failed, skipped)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Download missing cover art or title images for Vortex game extensions."
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
        help="Re-download even if the target file already exists.",
    )
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--title",
        action="store_true",
        help="Fetch title images (1920x1080) to resources/title-images/ instead of cover art.",
    )
    mode_group.add_argument(
        "--banner",
        action="store_true",
        help="Fetch full-size official hero images to resources/banner-images/. Requires STEAMGRIDDB_API_KEY.",
    )
    args = parser.parse_args()
    mode = "title" if args.title else "banner" if args.banner else "cover"
    fetch_all(
        target_game_ids=set(args.game) or None,
        dry_run=args.dry_run,
        force=args.force,
        mode=mode,
    )


if __name__ == "__main__":
    main()
