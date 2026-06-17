#!/usr/bin/env python3
"""
make_title_image.py
-------------------
Build a {GAME_ID}_title.jpg for a single game extension using a specific
SteamGridDB hero asset as the background, composited with the game's logo
(Steam library convention: logo centered in the lower portion).

Unlike fetch_cover_art.py --title (which auto-picks the best hero for the
game's Steam appid), this lets you pick the exact hero by its SteamGridDB
asset id -- the number in a https://www.steamgriddb.com/hero/<id> URL. The
logo is still auto-picked from the game's Steam appid unless --logo is given.

The result is written to resources/title-images/{GAME_ID}_title.jpg.

Usage:
    python make_title_image.py GAME_ID --hero HERO_ID
    python make_title_image.py GAME_ID --hero HERO_ID --logo LOGO_ID
    python make_title_image.py GAME_ID --hero HERO_ID --dry-run

Example:
    python make_title_image.py xcom --hero 137053

Options:
    GAME_ID      The game extension id (folder is game-<id>; matched by the
                 GAME_ID const in index.js).
    --hero ID    SteamGridDB hero asset id to use as the background (required).
    --logo ID    SteamGridDB logo asset id to composite (optional; default is
                 the best official colored logo for the game's Steam appid).
    --dry-run    Resolve appid/paths and report without downloading or writing.

Requirements:
    pip install Pillow
Environment variables:
    STEAMGRIDDB_API_KEY  (required -- registry fallback via get_api_key).
"""

import argparse
import os
import sys

from vortex_utils import (
    TITLE_IMAGES_DIR,
    get_api_key, iter_game_folders, const_value,
    download_title_image, log_info, log_warn, log_error, dry_prefix,
)


def make_title(game_id, hero_id, logo_id=None, dry_run=False):
    sgdb_key = get_api_key("STEAMGRIDDB_API_KEY")
    if not sgdb_key:
        print("No SteamGridDB API key -- set STEAMGRIDDB_API_KEY (env or HKCU).")
        return False

    match = next(iter_game_folders([game_id]), None)
    if match is None:
        log_error(game_id, "no game-* folder found for this id.")
        return False
    _folder, resolved_id, src = match

    appid = const_value(src, "STEAMAPP_ID")
    if appid:
        appid = appid.strip("\"'")
    if not appid or appid in ("null", "XXX"):
        log_warn(resolved_id, "no real STEAMAPP_ID in index.js -- logo lookup "
                 "may fail; pass --logo to force a specific logo.")
        appid = None

    out_path = os.path.join(TITLE_IMAGES_DIR, f"{resolved_id}_title.jpg")
    log_info(resolved_id, f"{dry_prefix(dry_run)}hero {hero_id}"
             + (f", logo {logo_id}" if logo_id else "")
             + (f", appid {appid}" if appid else "")
             + f" -> {out_path}")
    if dry_run:
        return True

    os.makedirs(TITLE_IMAGES_DIR, exist_ok=True)
    try:
        ok, source = download_title_image(
            appid, resolved_id, out_path, sgdb_key,
            hero_id=hero_id, logo_id=logo_id,
        )
    except Exception as e:
        log_error(resolved_id, f"failed: {e}")
        return False

    if not ok:
        log_error(resolved_id, "could not build title image.")
        return False
    log_info(resolved_id, f"saved ({source})")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Build a title image for one game from a specific "
                    "SteamGridDB hero asset.")
    parser.add_argument("game_id", help="Game extension id (e.g. xcom).")
    parser.add_argument("--hero", required=True, metavar="ID",
                        help="SteamGridDB hero asset id (the number in a "
                             "/hero/<id> URL).")
    parser.add_argument("--logo", metavar="ID", default=None,
                        help="SteamGridDB logo asset id (default: auto-pick "
                             "best logo for the game's Steam appid).")
    parser.add_argument("--dry-run", action="store_true",
                        help="Resolve and report without downloading/writing.")
    args = parser.parse_args()

    ok = make_title(args.game_id, args.hero, logo_id=args.logo,
                    dry_run=args.dry_run)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
