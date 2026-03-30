#!/usr/bin/env python3
"""
fetch_exec_icon.py
------------------
Downloads and resizes a 64x64 exec.png icon for one or more Vortex game
extension folders using the official Steam CDN icon (extracted from the
game's executable by Steam).

Usage:
    python fetch_exec_icon.py game-foo game-bar ...

Skips any folder that already has exec.png or executable.png.
Use --force to overwrite existing icons.

Source:
    Steam CDN icon extracted from the game executable via Steam Community.
    Tries 184x184 (_full) version first, falls back to 32x32.

Requirements:
    pip install Pillow
"""

import os
import re
import sys
import json
import time
import urllib.request
from io import BytesIO
from PIL import Image

STEAM_COMMUNITY_SEARCH = "https://steamcommunity.com/actions/SearchApps/{}"
REPO_ROOT = os.path.dirname(os.path.abspath(__file__))


def http_get_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read()


def extract_steam_id(index_js_path):
    """Return STEAMAPP_ID value from index.js, or None if missing/placeholder."""
    try:
        src = open(index_js_path, encoding="utf-8").read()
        m = re.search(r"STEAMAPP_ID\s*=\s*['\"](\d+)['\"]", src)
        return m.group(1) if m else None
    except Exception:
        return None


def extract_game_name(folder_path):
    """Return display name from info.json, or derive from folder name."""
    info = os.path.join(folder_path, "info.json")
    if os.path.exists(info):
        try:
            data = json.load(open(info, encoding="utf-8"))
            name = re.sub(r"^Game:\s*", "", data.get("name", "")).strip()
            if name:
                return name
        except Exception:
            pass
    name = os.path.basename(folder_path).removeprefix("game-")
    return name.replace("-", " ").title()


def clean_for_search(name):
    """
    Strip non-ASCII chars and edition suffixes so Steam Community search finds
    the game. E.g. 'Mass Effect\u2122: Andromeda Deluxe Edition' -> 'Mass Effect Andromeda'.
    """
    name = name.encode("ascii", "ignore").decode()
    name = re.sub(r"[:\-]", " ", name)
    name = re.sub(
        r"\b(Deluxe|Gold|Complete|Definitive|Enhanced|Remastered|"
        r"Ultimate|Standard|Premium|Legendary|Anniversary|Director.s Cut|"
        r"Game of the Year|GOTY|Edition|Collection|Bundle)\b.*",
        "", name, flags=re.IGNORECASE,
    ).strip()
    return name


def fetch_icon_steam_cdn(appid, game_name):
    """
    Fetch the official Steam icon (extracted from the game exe by Steam).
    Returns (img_bytes, source_desc) or (None, None).
    Tries 184x184 (_full) first, falls back to 32x32.
    """
    # Use Steam store API to get the canonical game name for searching
    try:
        store_url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
        store_data = json.loads(http_get_bytes(store_url))
        if store_data.get(appid, {}).get("success"):
            game_name = store_data[appid]["data"]["name"]
    except Exception:
        pass  # Fall through using the name from info.json

    search_name = clean_for_search(game_name)

    try:
        search_url = STEAM_COMMUNITY_SEARCH.format(urllib.request.quote(search_name))
        results = json.loads(http_get_bytes(search_url))

        icon_url = None
        for r in results:
            if str(r.get("appid")) == str(appid):
                icon_url = r.get("icon")
                break
        if not icon_url and results:
            icon_url = results[0].get("icon")
        if not icon_url:
            return None, None

        # Try _full (184x184) first
        full_url = icon_url.replace(".jpg", "_full.jpg")
        try:
            data = http_get_bytes(full_url)
            return data, "Steam CDN 184x184"
        except Exception:
            pass

        # Fall back to 32x32
        data = http_get_bytes(icon_url)
        return data, "Steam CDN 32x32"

    except Exception as e:
        print(f"    Steam CDN failed: {e}")
        return None, None


def download_and_save(img_bytes, out_path):
    """Resize to 64x64 and save as RGB PNG."""
    img = Image.open(BytesIO(img_bytes)).convert("RGB")
    img = img.resize((64, 64), Image.LANCZOS)
    img.save(out_path, "PNG")


def process_folder(folder_name, force=False):
    folder_path = os.path.join(REPO_ROOT, folder_name)
    if not os.path.isdir(folder_path):
        print(f"  ERROR: Directory not found: {folder_path}")
        return False

    # Skip if already has either icon file
    if not force:
        if os.path.exists(os.path.join(folder_path, "exec.png")):
            print(f"  SKIP: exec.png already exists")
            return True
        if os.path.exists(os.path.join(folder_path, "executable.png")):
            print(f"  SKIP: executable.png already exists")
            return True

    index_path = os.path.join(folder_path, "index.js")
    appid = extract_steam_id(index_path) if os.path.exists(index_path) else None
    game_name = extract_game_name(folder_path)

    print(f"  Game name : {game_name}")
    print(f"  Steam ID  : {appid or 'none'}")

    if not appid:
        print(f"  FAILED: No Steam App ID found.")
        return False

    img_bytes, source = fetch_icon_steam_cdn(appid, game_name)

    if not img_bytes:
        print(f"  FAILED: No icon found on Steam CDN.")
        return False

    out_path = os.path.join(folder_path, "exec.png")
    print(f"  Source    : {source}")
    download_and_save(img_bytes, out_path)
    print(f"  Saved     : exec.png")
    return True


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    force = "--force" in sys.argv
    targets = [a for a in sys.argv[1:] if not a.startswith("--")]
    results = {"ok": [], "skip": [], "fail": []}

    for folder in targets:
        print(f"\n[{folder}]")
        # Check skip conditions before calling process_folder for cleaner reporting
        folder_path = os.path.join(REPO_ROOT, folder)
        if not force:
            if os.path.exists(os.path.join(folder_path, "exec.png")):
                print(f"  SKIP: exec.png already exists")
                results["skip"].append(folder)
                continue
            if os.path.exists(os.path.join(folder_path, "executable.png")):
                print(f"  SKIP: executable.png already exists")
                results["skip"].append(folder)
                continue

        ok = process_folder(folder, force)
        time.sleep(0.3)
        (results["ok"] if ok else results["fail"]).append(folder)

    print(f"\n=== Done: {len(results['ok'])} saved, {len(results['skip'])} skipped, {len(results['fail'])} failed ===")
    if results["fail"]:
        print("Failed:", ", ".join(results["fail"]))


if __name__ == "__main__":
    main()
