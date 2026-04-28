#!/usr/bin/env python3
"""
fetch_nexus_stats.py
--------------------
Fetches endorsement count and unique download count from the Nexus Mods v1 API
for every game-* extension with a valid EXTENSION_URL (contains nexusmods.com).
Results are cached to vortex_gui_nexus_stats.json at the repo root for display
in vortex_gui.py.

Usage:
    python fetch_nexus_stats.py
    python fetch_nexus_stats.py GAME_ID [GAME_ID ...]
    python fetch_nexus_stats.py --dry-run
    python fetch_nexus_stats.py --force

Options:
    GAME_ID          One or more game IDs to process. Omit to process all.
    --dry-run        List extensions to fetch without making any API calls.
    --force          Re-fetch stats even if already cached.

Environment variables:
    NEXUS_API_KEY    Required. Nexus Mods API key (env var or HKCU registry).
                     Not needed for --dry-run.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

import vortex_utils as vu

STATS_PATH = os.path.join(vu.REPO_ROOT, "vortex_gui_nexus_stats.json")
MOD_RE     = re.compile(r"nexusmods\.com/([^/]+)/mods/(\d+)")
API_TMPL   = "https://api.nexusmods.com/v1/games/{domain}/mods/{id}.json"


# == Persistence ===============================================================

def _load_stats() -> dict:
    if os.path.isfile(STATS_PATH):
        try:
            with open(STATS_PATH, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_stats(data: dict):
    tmp = STATS_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, sort_keys=True)
    os.replace(tmp, STATS_PATH)


# == API =======================================================================

def _fetch_mod(domain: str, mod_id: str, api_key: str):
    """Fetch mod details from Nexus v1. Returns (data_dict, rate_remaining_str_or_None)."""
    req = urllib.request.Request(
        API_TMPL.format(domain=domain, id=mod_id),
        headers={
            "apikey": api_key,
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
        remaining = resp.headers.get("X-RL-Daily-Remaining")
    return data, remaining


# == Core logic ================================================================

def fetch_all(target_ids=None, dry_run=False, force=False):
    cache = _load_stats()

    # Build work list
    work = []
    for _folder, game_id, src in vu.iter_game_folders(target_ids):
        url = vu.extract_extension_url(src)
        if not url:
            continue
        m = MOD_RE.search(url)
        if not m:
            vu.log_warn(game_id, f"EXTENSION_URL has no parseable mod ID: {url}")
            continue
        domain, mod_id = m.group(1), m.group(2)
        cached = cache.get(game_id, {})
        if not force and cached and cached.get("error") in (None, ""):
            continue
        work.append((game_id, domain, mod_id))

    if not work:
        print("Nothing to fetch -- all extensions already cached. Use --force to re-fetch.")
        return

    if dry_run:
        print(f"Extensions to fetch ({len(work)} total):")
        for game_id, domain, mod_id in work:
            print(f"  [{game_id}]  nexusmods.com/{domain}/mods/{mod_id}")
        return

    api_key = vu.get_api_key("NEXUS_API_KEY")
    if not api_key:
        vu.log_error("fetch_nexus_stats", "NEXUS_API_KEY not set -- add it as a Windows user env var or in HKCU\\Environment")
        sys.exit(1)

    updated = 0
    failed = []
    last_remaining = None

    for i, (game_id, domain, mod_id) in enumerate(work):
        if i > 0:
            time.sleep(0.2)
        try:
            data, remaining = _fetch_mod(domain, mod_id, api_key)
            last_remaining = remaining
            entry = {
                "mod_id": int(mod_id),
                "domain": domain,
                "endorsements": data.get("endorsement_count", 0),
                "unique_downloads": data.get("mod_unique_downloads", 0),
                "total_downloads": data.get("mod_downloads", 0),
                "mod_name": data.get("name"),
                "mod_version": data.get("version"),
                "fetched_at": int(time.time()),
                "error": None,
            }
            cache[game_id] = entry
            vu.log_info(
                game_id,
                f"endorsements={entry['endorsements']:,}  unique_dl={entry['unique_downloads']:,}"
                + (f"  (rate left: {remaining})" if remaining is not None else ""),
            )
            updated += 1

            if remaining is not None:
                try:
                    if int(remaining) <= 5:
                        vu.log_warn("fetch_nexus_stats", "Daily rate limit nearly exhausted -- stopping early")
                        break
                except ValueError:
                    pass

        except urllib.error.HTTPError as e:
            if e.code == 404:
                cache[game_id] = {
                    "mod_id": int(mod_id),
                    "domain": domain,
                    "error": "404",
                    "fetched_at": int(time.time()),
                }
                vu.log_warn(game_id, f"404 from Nexus (mod {mod_id} not found or private)")
            else:
                vu.log_error(game_id, f"HTTP {e.code}: {e.reason}")
                failed.append(game_id)
        except Exception as e:
            vu.log_error(game_id, f"fetch error: {e}")
            failed.append(game_id)

    _save_stats(cache)

    print(f"\n{'-' * 50}")
    print(f"Updated: {updated}")
    if failed:
        print(f"Failed : {len(failed)}")
        for g in failed:
            print(f"  - {g}")
    if last_remaining is not None:
        print(f"Daily remaining: {last_remaining}")


# == Entry point ===============================================================

def main():
    parser = argparse.ArgumentParser(
        description="Fetch Nexus Mods endorsement and unique download stats for Vortex extensions."
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
        help="List extensions to fetch without making any API calls.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-fetch stats even if already cached.",
    )
    args = parser.parse_args()
    fetch_all(
        target_ids=set(args.game) or None,
        dry_run=args.dry_run,
        force=args.force,
    )


if __name__ == "__main__":
    main()
