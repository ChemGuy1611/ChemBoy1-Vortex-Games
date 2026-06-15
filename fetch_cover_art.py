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
    python fetch_cover_art.py --retry-failed
    python fetch_cover_art.py --concurrency 4

Options:
    GAME_ID          One or more game IDs to process. Omit to process all.
    --dry-run        List missing files without downloading anything.
    --force          Re-download even if the target file already exists.
    --title          Fetch title images (1920x1080) to resources/title-images/
                     instead of the usual 640x360 cover art.
    --banner         Fetch full-size official hero images to
                     resources/banner-images/. Requires STEAMGRIDDB_API_KEY.
    --concurrency N  Max parallel download workers (default: 8).
    --retry-failed   Automatically retry failed downloads once after the main pass.

Requirements:
    pip install Pillow
Environment variables:
    STEAMGRIDDB_API_KEY  (optional, consumed by vortex_utils download helpers;
                         required for --banner; improves --title and default mode.
                         --title falls back to Steam capsule_616x353.jpg without this key.)
"""

import os

from vortex_utils import (
    TITLE_IMAGES_DIR, BANNER_IMAGES_DIR,
    get_api_key, iter_steam_image_targets, run_concurrent_batch,
    report_download_results, retry_failed_downloads,
    download_cover_art, download_title_image, download_banner_image,
    print_run_summary, normalize_target_ids,
    build_arg_parser,
)


# ── Core logic ────────────────────────────────────────────────────────────────

def _cover_target_path(mode, folder, game_id):
    if mode == "title":
        return os.path.join(TITLE_IMAGES_DIR, f"{game_id}_title.jpg")
    if mode == "banner":
        return os.path.join(BANNER_IMAGES_DIR, f"{game_id}_banner.jpg")
    return os.path.join(folder, f"{game_id}.jpg")


def fetch_all(target_game_ids=None, dry_run=False, force=False, mode="cover",
              concurrency=8, retry_failed=False):
    sgdb_key = get_api_key("STEAMGRIDDB_API_KEY")
    if mode in ("title", "banner"):
        if not sgdb_key:
            if mode == "banner":
                print("No SteamGridDB API key -- banner images require STEAMGRIDDB_API_KEY.")
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

    targets = list(iter_steam_image_targets(
        target_game_ids, force,
        target_path_fn=lambda folder, game_id: _cover_target_path(mode, folder, game_id),
    ))
    if not targets:
        labels = {"cover": "cover art files", "title": "title images", "banner": "banner images"}
        print(f"No missing {labels[mode]} found.")
        return

    out_dir = None
    if mode == "title":
        out_dir = TITLE_IMAGES_DIR
    elif mode == "banner":
        out_dir = BANNER_IMAGES_DIR

    for folder, game_id, steamapp_id, _game_name in targets:
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

    if dry_run:
        return

    # Hoist makedirs out of the thread pool to avoid concurrent redundant calls
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    def _download_one(item):
        folder, game_id, steamapp_id, _game_name = item
        if not steamapp_id:
            return game_id, "skip", None, None
        try:
            if mode == "title":
                out_path = os.path.join(out_dir, f"{game_id}_title.jpg")
                ok, source = download_title_image(steamapp_id, game_id, out_path, sgdb_key)
                fail_msg = f"add {game_id}_title.jpg manually to resources/title-images/ (1920x1080 JPG, with title text)"
            elif mode == "banner":
                out_path = os.path.join(out_dir, f"{game_id}_banner.jpg")
                ok, source = download_banner_image(steamapp_id, game_id, out_path, sgdb_key)
                fail_msg = f"add {game_id}_banner.jpg manually to resources/banner-images/"
            else:
                out_path = os.path.join(folder, f"{game_id}.jpg")
                ok, source = download_cover_art(steamapp_id, game_id, out_path, sgdb_key)
                fail_msg = f"add {game_id}.jpg manually (640x360 JPG, no title text)"
            return game_id, "ok" if ok else "fail", source, fail_msg
        except Exception as e:
            return game_id, "error", None, str(e)

    results = run_concurrent_batch(targets, _download_one, max_workers=concurrency)

    def _label(game_id):
        if mode == "title":
            return f"[{game_id}_title.jpg]"
        if mode == "banner":
            return f"[{game_id}_banner.jpg]"
        return f"[{game_id}]"

    report_download_results(targets, results, _label, saved, failed, skipped)

    if retry_failed and failed:
        retry_failed_downloads(targets, failed, _download_one, concurrency, saved, skipped)

    print_run_summary(saved, failed, skipped)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = build_arg_parser(
        "Download missing cover art or title images for Vortex game extensions.",
        ids_required=False, dest="game",
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
    parser.add_argument(
        "--concurrency", type=int, default=8, metavar="N",
        help="Max parallel download workers (default: 8).",
    )
    parser.add_argument(
        "--retry-failed", action="store_true",
        help="Automatically retry failed downloads once after the main pass.",
    )
    args = parser.parse_args()
    mode = "title" if args.title else "banner" if args.banner else "cover"
    fetch_all(
        target_game_ids=normalize_target_ids(args.game),
        dry_run=args.dry_run,
        force=args.force,
        mode=mode,
        concurrency=args.concurrency,
        retry_failed=args.retry_failed,
    )


if __name__ == "__main__":
    main()
