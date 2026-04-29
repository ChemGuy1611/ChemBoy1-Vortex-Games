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
    python fetch_nexus_stats.py --prune [--dry-run]

Options:
    GAME_ID          One or more game IDs to process. Omit to process all.
    --dry-run        List extensions to fetch (or entries to prune) without making changes.
    --force          Re-fetch stats even if already cached.
    --prune          Remove cache entries for game IDs no longer in the repo, then exit.

Environment variables:
    NEXUS_API_KEY    Required. Nexus Mods API key (env var or HKCU registry).
                     Not needed for --dry-run.
"""

import argparse
import re
import sys
import time
import urllib.error

import vortex_utils as vu

STATS_PATH = vu.GUI_STATS_PATH
MOD_RE     = re.compile(r"nexusmods\.com/([^/]+)/mods/(\d+)")


# == Persistence ===============================================================

def _load_stats() -> dict:
    return vu.read_json(STATS_PATH)


def _save_stats(data: dict):
    vu.write_json_atomic(STATS_PATH, data, sort_keys=True)


# == API =======================================================================

def _fetch_mod(domain: str, mod_id: str, api_key: str):
    """Fetch mod details from Nexus v1. Returns (data_dict, rate_remaining_str_or_None)."""
    return vu.nexus_get_mod(domain, mod_id, api_key)


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
                "created_timestamp": data.get("created_timestamp"),
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


# == Prune =====================================================================

def prune(dry_run=False):
    """Remove cache entries for game IDs no longer present in the repo."""
    cache = _load_stats()
    current = set(vu.list_game_ids())
    stale = sorted(gid for gid in cache if gid not in current)
    if not stale:
        print("Nothing to prune -- all cached IDs still exist in the repo.")
        return
    for gid in stale:
        if dry_run:
            print(f"  [DRY RUN] Would remove: {gid}")
        else:
            del cache[gid]
            print(f"  Removed: {gid}")
    if not dry_run:
        _save_stats(cache)
    tag = " [DRY RUN]" if dry_run else ""
    print(f"\nDone{tag}. {len(stale)} stale {'entry' if len(stale) == 1 else 'entries'} pruned.")


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
    parser.add_argument(
        "--prune",
        action="store_true",
        help="Remove cache entries for game IDs no longer in the repo, then exit.",
    )
    args = parser.parse_args()
    if args.prune:
        prune(dry_run=args.dry_run)
        return
    fetch_all(
        target_ids=set(args.game) or None,
        dry_run=args.dry_run,
        force=args.force,
    )


if __name__ == "__main__":
    main()
