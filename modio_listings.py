#!/usr/bin/env python3
"""
modio_listings.py -- List what is inside a mod.io game's most popular mod archives, without
downloading them.

For each mod it picks the file for one platform (mod.io keeps a live file per platform, and a
mod's default file may be another platform's build), then reads only the zip's central directory
with two HTTP range requests. Answers "what do this game's mod.io archives look like?" in seconds
even when the archives are gigabytes.

The output JSON (a list of {modId, name, filename, size, files}) is the input replay_installers.js
takes, to see which of an extension's installers would claim each archive and where its files land.

Uses mod.io's website endpoint (https://mod.io/v1 with the X-Modio-Origin: web header), which needs
no API key - see resources/MODIO_API.md.

Usage:
    python modio_listings.py GAME [--count N] [--platform P] [--out FILE]
    python modio_listings.py stalker2 --count 40
    python modio_listings.py abiotic-factor --platform windows --out abiotic.json
    python modio_listings.py 12104

Arguments:
    GAME            mod.io game name_id (the slug in https://mod.io/g/<slug>) or numeric game id
    --count N       How many mods to list, most popular first (default: 20)
    --platform P    mod.io platform whose live file is listed (default: windows)
    --out FILE      Output JSON path (default: modio_listings_<GAME>.json in the current folder)

Output:
    One line per mod (file count, or why it could not be listed), then the JSON file.
    Archives that are not plain zips (7z, rar, zip64) or whose read failed or timed out are
    recorded with "files": null.
    Exit code 0 on success, 1 when the game cannot be found.

Environment variables:
    none
"""

import argparse
import json
import sys
import urllib.error

from vortex_utils import http_get_json, zip_listing

API_BASE = "https://mod.io/v1"
API_HEADERS = {"X-Modio-Origin": "web"}


def api_get(path):
    return http_get_json(f"{API_BASE}{path}", API_HEADERS)


def game_ref(game):
    return game if game.isdigit() else f"@{game}"


def platform_file(game, mod, platform):
    """The mod's live file for the platform, falling back to its default file."""
    live = {entry["platform"]: entry["modfile_live"] for entry in mod.get("platforms") or []}
    default = mod.get("modfile") or {}
    file_id = live.get(platform)
    if file_id is None or file_id == default.get("id"):
        return default
    return api_get(f"/games/{game_ref(game)}/mods/{mod['id']}/files/{file_id}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("game")
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--platform", default="windows")
    parser.add_argument("--out")
    args = parser.parse_args()
    sys.stdout.reconfigure(errors="replace")  # mod names carry characters a cp1252 console cannot print

    try:
        game = api_get(f"/games/{game_ref(args.game)}")
    except urllib.error.HTTPError as err:
        sys.exit(f"mod.io game '{args.game}' not found ({err.code})")
    print(f"{game['name']} ({game['name_id']}, id {game['id']}) - listing {args.count} mods, platform {args.platform}")

    results = []
    offset = 0
    while len(results) < args.count:
        page = api_get(f"/games/{game['id']}/mods?_limit=100&_offset={offset}&_sort=-popular")
        if not page["data"]:
            break
        for mod in page["data"][: args.count - len(results)]:
            file = platform_file(args.game, mod, args.platform)
            url = (file.get("download") or {}).get("binary_url")
            try:
                files = zip_listing(url) if url else None
                status = f"{len(files)} entries" if files is not None else "not a plain zip"
            except urllib.error.HTTPError as err:
                files, status = None, f"HTTP {err.code}"
            except (urllib.error.URLError, TimeoutError, OSError) as err:
                files, status = None, f"unreachable ({err})"  # one slow CDN read must not end the run
            results.append(
                {
                    "modId": mod["id"],
                    "name": mod["name"],
                    "filename": file.get("filename"),
                    "size": file.get("filesize"),
                    "files": files,
                }
            )
            print(f"  {len(results):3} {mod['name'][:50]:50} {status}")
        offset += 100

    out = args.out or f"modio_listings_{game['name_id']}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=1)
    print(f"Wrote {out} ({len(results)} mods)")


if __name__ == "__main__":
    main()
