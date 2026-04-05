#!/usr/bin/env python3
"""
fetch_cover_art.py
------------------
Finds all game-* extension folders missing their {GAME_ID}.jpg cover art and
downloads it from SteamGridDB (heroes) or Steam library_hero.jpg.

With --title, fetches {GAME_ID}_title.jpg (1920x1080, with title text) to
resources/title-images/ instead of the usual cover art.

Usage:
    python fetch_cover_art.py
    python fetch_cover_art.py GAME_ID [GAME_ID ...]
    python fetch_cover_art.py --dry-run
    python fetch_cover_art.py --force
    python fetch_cover_art.py --title
    python fetch_cover_art.py --title GAME_ID [GAME_ID ...]

Options:
    GAME_ID          One or more game IDs to process. Omit to process all.
    --dry-run        List missing files without downloading anything.
    --force          Re-download even if the target file already exists.
    --title          Fetch title images (1920x1080) to resources/title-images/
                     instead of the usual 640x360 cover art.

Requirements:
    pip install Pillow
Environment variables:
    STEAMGRIDDB_API_KEY  (optional; required for --title)
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

def find_targets(target_game_ids=None, force=False, title_mode=False):
    """
    Yields (folder_path, game_id, steamapp_id) for extensions to process.
    Without --force, skips extensions that already have their target image.
    If target_game_ids is set, only those extensions are checked.
    In title_mode, checks resources/title-images/{game_id}_title.jpg instead.
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

        if title_mode:
            target_path = os.path.join(REPO_ROOT, "resources", "title-images", f"{game_id}_title.jpg")
        else:
            target_path = os.path.join(folder, f"{game_id}.jpg")

        if os.path.isfile(target_path) and not force:
            continue

        steamapp_id = extract_steamapp_id(src)
        yield folder, game_id, steamapp_id


def fetch_all(target_game_ids=None, dry_run=False, force=False, title_mode=False):
    sgdb_key = get_sgdb_key()
    if title_mode:
        if not dry_run and not sgdb_key:
            print("No SteamGridDB API key — title images require STEAMGRIDDB_API_KEY.")
    else:
        if not dry_run and sgdb_key:
            print("SteamGridDB API key found — will try heroes first.")
        elif not dry_run:
            print("No SteamGridDB API key — will use Steam library_hero.jpg.")

    saved = []
    failed = []
    skipped = []

    targets = list(find_targets(target_game_ids, force, title_mode))
    if not targets:
        label = "title images" if title_mode else "cover art files"
        print(f"No missing {label} found.")
        return

    title_dir = os.path.join(REPO_ROOT, "resources", "title-images")

    for folder, game_id, steamapp_id in targets:
        if title_mode:
            label = f"[{game_id}_title.jpg]"
        else:
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

        if title_mode:
            os.makedirs(title_dir, exist_ok=True)
            out_path = os.path.join(title_dir, f"{game_id}_title.jpg")
            ok, source = ne.download_title_image(steamapp_id, game_id, out_path, sgdb_key)
            if ok:
                print(f"  Saved: {source}")
                saved.append(game_id)
            else:
                print(f"  FAILED — add {game_id}_title.jpg manually to resources/title-images/ (1920x1080 JPG, with title text)")
                failed.append(game_id)
        else:
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
    parser.add_argument(
        "--title",
        action="store_true",
        help="Fetch title images (1920x1080) to resources/title-images/ instead of cover art.",
    )
    args = parser.parse_args()
    fetch_all(
        target_game_ids=set(args.game) or None,
        dry_run=args.dry_run,
        force=args.force,
        title_mode=args.title,
    )


if __name__ == "__main__":
    main()
