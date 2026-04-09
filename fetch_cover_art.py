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
    STEAMGRIDDB_API_KEY  (optional; required for --title and --banner)
"""

import os
import sys
import argparse

from vortex_utils import (
    REPO_ROOT, read_index_js, extract_game_id, extract_steamapp_id,
    get_api_key,
)

# Import download helpers from new_extension.py
sys.path.insert(0, REPO_ROOT)
import new_extension as ne


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_sgdb_key():
    return get_api_key("STEAMGRIDDB_API_KEY")


# ── Core logic ────────────────────────────────────────────────────────────────

def find_targets(target_game_ids=None, force=False, mode="cover"):
    """
    Yields (folder_path, game_id, steamapp_id) for extensions to process.
    Without --force, skips extensions that already have their target image.
    If target_game_ids is set, only those extensions are checked.
    mode: "cover" (default), "title", or "banner".
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

        if mode == "title":
            target_path = os.path.join(REPO_ROOT, "resources", "title-images", f"{game_id}_title.jpg")
        elif mode == "banner":
            target_path = os.path.join(REPO_ROOT, "resources", "banner-images", f"{game_id}_banner.jpg")
        else:
            target_path = os.path.join(folder, f"{game_id}.jpg")

        if os.path.isfile(target_path) and not force:
            continue

        steamapp_id = extract_steamapp_id(src)
        yield folder, game_id, steamapp_id


def download_banner_image(appid, game_id, out_path, sgdb_key):
    """Download the official SteamGridDB hero at full size. No crop or resize.

    Prefers is_official=True heroes, sorted by resolution. Returns (ok, source)."""
    from io import BytesIO
    from PIL import Image

    try:
        url = f"https://www.steamgriddb.com/api/v2/heroes/steam/{appid}"
        resp = json.loads(ne.http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
        heroes = resp.get("data", [])
        if not heroes:
            return False, None
        # Prefer official, then sort by width
        official = [h for h in heroes if h.get("is_official", False)]
        pool = official if official else heroes
        best = sorted(pool, key=lambda x: x.get("width", 0), reverse=True)[0]
        img_data = ne.http_get_bytes(best["url"])
    except Exception as e:
        print(f"    SteamGridDB hero error: {e}")
        return False, None

    img = Image.open(BytesIO(img_data)).convert("RGB")
    img.save(out_path, "JPEG", quality=95)
    hero_id = best.get("id", "unknown")
    w, h = img.size
    source = f"SteamGridDB hero ({w}x{h}) - https://www.steamgriddb.com/hero/{hero_id}"
    return True, source


def fetch_all(target_game_ids=None, dry_run=False, force=False, mode="cover"):
    sgdb_key = get_sgdb_key()
    if mode in ("title", "banner"):
        if not sgdb_key:
            label = "title" if mode == "title" else "banner"
            print(f"No SteamGridDB API key -- {label} images require STEAMGRIDDB_API_KEY.")
            if not dry_run:
                return
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
        out_dir = os.path.join(REPO_ROOT, "resources", "title-images")
    elif mode == "banner":
        out_dir = os.path.join(REPO_ROOT, "resources", "banner-images")

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
            ok, source = ne.download_title_image(steamapp_id, game_id, out_path, sgdb_key)
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
            ok, source = ne.download_cover_art(steamapp_id, game_id, out_path, sgdb_key)
            if ok:
                print(f"  Saved: {source}")
                saved.append(game_id)
            else:
                print(f"  FAILED -- add {game_id}.jpg manually (640x360 JPG, no title text)")
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
