#!/usr/bin/env python3
"""
find_modio_games.py -- Find which game extensions in this repo have a mod.io page.

Fetches every game mod.io lists and matches it against the game-* extensions: first by Steam app
id (mod.io carries Steam store links in a game's other_urls), then by exact normalised name
(GAME_NAME constants). Each match is reported with its mod.io name_id (the `modioGame` value a
browser page needs), mod count, whether anonymous downloads are allowed, platforms, and whether
the extension already bundles modio_browser.js.

--loose adds a fuzzy name pass for games whose mod.io record has no Steam link. Its hits are
candidates only: "RuneScape DW" matched mod.io's classic "RuneScape", a different game.

Uses mod.io's website endpoint (https://mod.io/v1 with X-Modio-Origin: web), which needs no API
key - see resources/MODIO_API.md.

Usage:
    python find_modio_games.py [--loose] [--json FILE]

Arguments:
    --loose       Also list fuzzy name candidates (containment or similarity >= 0.85)
    --json FILE   Write the matches (and loose candidates) as JSON

Output:
    A table of matches, most mods first, then loose candidates when asked for.
    "dl" is "open" when the game allows direct downloads (api_access_options bit 2), which a
    browser page needs; "adopted" marks extensions that already bundle modio_browser.js.

Environment variables:
    none
"""

import argparse
import difflib
import json
import os
import re
import sys

from vortex_utils import http_get_json, iter_extension_folders, normalize_game_name

API_BASE = "https://mod.io/v1"
API_HEADERS = {"X-Modio-Origin": "web"}
STEAM_ID_RE = re.compile(r"""\bSTEAMAPP_ID\w*\s*=\s*["'](\d+)["']\s*;?""")
GAME_NAME_RE = re.compile(r"""\bGAME_NAME\w*\s*=\s*["']([^"']+)["']\s*;?""")
STEAM_URL_RE = re.compile(r"store\.steampowered\.com/app/(\d+)")
DIRECT_DOWNLOADS = 2  # api_access_options bit: binary_url works without authentication


def squash(name):
    """Name key for exact matching: normalised, then letters and digits only."""
    return re.sub(r"[^a-z0-9]", "", normalize_game_name(name.replace("&", "and")))


def fetch_modio_games():
    games, offset = [], 0
    while True:
        page = http_get_json(f"{API_BASE}/games?_limit=100&_offset={offset}", API_HEADERS)
        games += page["data"]
        offset += 100
        if offset >= page["result_total"]:
            return games


def load_extensions():
    extensions = []
    for folder, game_id, src in iter_extension_folders():
        extensions.append(
            {
                "folder": os.path.basename(folder),
                "steam": set(STEAM_ID_RE.findall(src)),
                "names": set(GAME_NAME_RE.findall(src)),
                "adopted": os.path.isfile(os.path.join(folder, "modio_browser.js")),
            }
        )
    return extensions


def describe(game, ext, how):
    stats = game.get("stats") or {}
    return {
        "extension": ext["folder"],
        "modio_name": game["name"],
        "name_id": game["name_id"],
        "modio_id": game["id"],
        "match": how,
        "mods": stats.get("mods_count_total", 0),
        "downloads_open": bool((game.get("api_access_options") or 0) & DIRECT_DOWNLOADS),
        "platforms": [p.get("platform") for p in game.get("platforms") or []],
        "adopted": ext["adopted"],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--loose", action="store_true")
    parser.add_argument("--json")
    args = parser.parse_args()
    sys.stdout.reconfigure(errors="replace")  # game names carry characters a cp1252 console cannot print

    games = fetch_modio_games()
    extensions = load_extensions()
    print(f"mod.io games: {len(games)}, repo extensions: {len(extensions)}")

    matches, matched = [], set()
    for game in games:
        urls = " ".join(u.get("url", "") for u in game.get("other_urls") or [])
        steam = set(STEAM_URL_RE.findall(urls))
        key = squash(game["name"])
        for ext in extensions:
            how = "steam" if steam & ext["steam"] else "name" if any(squash(n) == key for n in ext["names"]) else None
            if how:
                matches.append(describe(game, ext, how))
                matched.add((ext["folder"], game["id"]))

    print(f"\n{'extension':40} {'modioGame':28} {'mods':>5}  match  dl     adopted  platforms")
    for m in sorted(matches, key=lambda m: -m["mods"]):
        print(f"{m['extension']:40} {m['name_id']:28} {m['mods']:>5}  {m['match']:5}  "
              f"{'open' if m['downloads_open'] else 'auth':6} {'yes' if m['adopted'] else '-':7}  "
              f"{','.join(m['platforms']) or '-'}")

    loose = []
    if args.loose:
        for game in games:
            key = squash(game["name"])
            if len(key) < 5:
                continue
            for ext in extensions:
                if (ext["folder"], game["id"]) in matched:
                    continue
                for name in ext["names"]:
                    other = squash(name)
                    if len(other) < 5:
                        continue
                    ratio = difflib.SequenceMatcher(None, other, key).ratio()
                    contained = len(min(other, key, key=len)) >= 7 and (other in key or key in other)
                    if contained or ratio >= 0.85:
                        candidate = describe(game, ext, f"loose {ratio:.2f}")
                        candidate["repo_name"] = name
                        loose.append(candidate)
                        break
        print(f"\nLoose candidates ({len(loose)}) - verify each before trusting it:")
        for c in loose:
            print(f"  {c['extension']:40} '{c['repo_name']}' ~ '{c['modio_name']}' ({c['name_id']}, "
                  f"{c['match']}, {c['mods']} mods)")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as handle:
            json.dump({"matches": matches, "loose": loose}, handle, indent=1)
        print(f"\nWrote {args.json}")


if __name__ == "__main__":
    main()
