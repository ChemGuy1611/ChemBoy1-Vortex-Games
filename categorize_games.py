"""
categorize_games.py

Scans all game-* extension folders and categorizes them by engine/framework
based on the Structure: header comment and key code markers in index.js.

Writes one .txt file per engine category to resources/lists/. Each line is a GAME_ID.

Also writes these non-exclusive "flag" lists, evaluated for every game-* extension
independently of its engine category and of each other:
    games-loadorder.txt  - non-UE4/5 games that call context.registerLoadOrder
    games-downloader.txt - games with a bundled downloader.js module
    games-downloader-gamebanana.txt - games with a bundled gamebanana_downloader.js module
    games-downloader-moddb.txt      - games with a bundled moddb_downloader.js module
    games-github.txt     - games that download from GitHub inline (no downloader.js)
    games-uemi.txt       - games that require the "Unreal Engine Mod Installer" extension

Usage:
    python categorize_games.py              # rebuild all category files from scratch
    python categorize_games.py GAME_ID [GAME_ID ...]  # add/update specific games
    python categorize_games.py --dry-run   # print categorizations without writing files
"""

import os
import argparse

from vortex_utils import (
    REPO_ROOT, LISTS_DIR, list_game_ids, detect_engine, read_index_js,
    read_id_list, write_id_list,
    is_load_order_game as _is_load_order_game_src,
    has_downloader_js, has_gamebanana_downloader_js, has_moddb_downloader_js,
    downloads_from_github, requires_unreal_mod_installer,
    log_error, log_dry,
)

# (filename, display label) in detection priority order.
# The label strings match detect_engine() return values exactly.
CATEGORIES = [
    ("games-ue4-5.txt",                      "UE4-5"),
    ("games-ue2-3.txt",                      "UE2-3"),
    ("games-unity-bepinex.txt",              "Unity+Bep"),
    ("games-unity-melonloader-bepinex.txt",  "Unity+Mel/Bep"),
    ("games-unity-umm.txt",                  "Unity+UMM"),
    ("games-farcrygame.txt",                 "Dunia"),
    ("games-rpgmaker.txt",                   "RPG Maker"),
    ("games-snowdrop.txt",                   "Snowdrop"),
    ("games-godot.txt",                      "Godot"),
    ("games-cobra-acse.txt",                 "Cobra/ACSE"),
    ("games-reengine.txt",                   "RE/Fluffy"),
    ("games-reloaded2.txt",                  "Reloaded-II"),
    ("games-anvil.txt",                      "Anvil"),
    ("games-srmm.txt",                       "SRMM"),
    ("games-frostbite.txt",                  "Frostbite"),
    ("games-basic.txt",                      "Basic"),
]

_FILE_FOR_LABEL = {label: fname for fname, label in CATEGORIES}

# Flag lists are non-exclusive and evaluated for every game-* extension: a game
# may appear in zero or more of these in addition to its single engine category.
# Each entry pairs an output filename with a predicate(src, folder) -> bool.
FLAG_LISTS = [
    ("games-loadorder.txt",  lambda src, folder: _is_load_order_game_src(src)),
    ("games-downloader.txt", lambda src, folder: has_downloader_js(folder)),
    ("games-downloader-gamebanana.txt", lambda src, folder: has_gamebanana_downloader_js(folder)),
    ("games-downloader-moddb.txt",      lambda src, folder: has_moddb_downloader_js(folder)),
    # GitHub download done inline in index.js, i.e. without the downloader.js module.
    ("games-github.txt",     lambda src, folder: downloads_from_github(src) and not has_downloader_js(folder)),
    ("games-uemi.txt",       lambda src, folder: requires_unreal_mod_installer(src)),
]


def _game_context(game_id):
    """Return (folder, src) for a game. src is None if no index.js is found."""
    folder = os.path.join(REPO_ROOT, f"game-{game_id}")
    return folder, read_index_js(folder)


def categorize(src):
    """Return the engine-category output filename for the given index.js source."""
    return _FILE_FOR_LABEL[detect_engine(src)]


def rebuild_all(dry_run=False):
    """Scan all game-* folders and rebuild every category and flag-list file from scratch."""
    buckets = {filename: [] for filename, _ in CATEGORIES}
    flag_games = {filename: [] for filename, _ in FLAG_LISTS}

    for game_id in list_game_ids():
        folder, src = _game_context(game_id)
        if src is None:
            print(f"  Warning: no index.js found for game-{game_id}, skipping.")
            continue
        buckets[categorize(src)].append(game_id)
        for filename, predicate in FLAG_LISTS:
            if predicate(src, folder):
                flag_games[filename].append(game_id)

    if not dry_run:
        os.makedirs(LISTS_DIR, exist_ok=True)

    for filename, label in CATEGORIES:
        if not dry_run:
            write_id_list(os.path.join(LISTS_DIR, filename), buckets[filename])
        print(f"  {filename}: {len(buckets[filename])} games")

    for filename, _ in FLAG_LISTS:
        if not dry_run:
            write_id_list(os.path.join(LISTS_DIR, filename), flag_games[filename])
        print(f"  {filename}: {len(flag_games[filename])} games")

    tag = " [DRY RUN]" if dry_run else ""
    print(f"\nDone{tag}. {sum(len(v) for v in buckets.values())} games categorized across "
          f"{len(CATEGORIES)} engine categories and {len(FLAG_LISTS)} flag lists.")


def update_single(game_id, dry_run=False):
    """Add game_id to its correct engine category and update every flag list, removing
    it from any category/flag list it no longer belongs to."""
    folder, src = _game_context(game_id)
    if src is None:
        print(f"  Warning: no index.js found for game-{game_id}, skipping.")
        return False

    target = categorize(src)

    if not dry_run:
        os.makedirs(LISTS_DIR, exist_ok=True)

    # Phase 1: compute all needed changes before touching the filesystem so a
    # mid-loop failure cannot leave the game in two categories simultaneously.
    pending = {}  # filepath -> (new_ids_list, log_message)

    for filename, label in CATEGORIES:
        filepath = os.path.join(LISTS_DIR, filename)
        ids = read_id_list(filepath)
        if filename == target:
            if game_id not in ids:
                ids.append(game_id)
                pending[filepath] = (ids, f"Added {game_id} -> {filename} ({label})")
            else:
                print(f"  {game_id} already in {filename} ({label})")
        else:
            if game_id in ids:
                ids.remove(game_id)
                pending[filepath] = (ids, f"Removed {game_id} from {filename}")

    # Flag lists are non-exclusive: include or remove independently of each other.
    for filename, predicate in FLAG_LISTS:
        filepath = os.path.join(LISTS_DIR, filename)
        ids = read_id_list(filepath)
        if predicate(src, folder):
            if game_id not in ids:
                ids.append(game_id)
                pending[filepath] = (ids, f"Added {game_id} -> {filename}")
            else:
                print(f"  {game_id} already in {filename}")
        else:
            if game_id in ids:
                ids.remove(game_id)
                pending[filepath] = (ids, f"Removed {game_id} from {filename}")

    if dry_run:
        for _, (_, msg) in pending.items():
            log_dry(f"Would: {msg}")
        return True

    # Phase 2: write all changes atomically per-file; report failures individually
    # so a single bad write does not silently leave the game in two categories.
    ok = True
    for filepath, (ids, msg) in pending.items():
        try:
            write_id_list(filepath, ids)
            print(f"  {msg}")
        except Exception as e:
            log_error(game_id, f"FAILED writing {os.path.basename(filepath)}: {e}")
            ok = False

    return ok


def main():
    parser = argparse.ArgumentParser(
        description="Categorize Vortex game extensions by engine/framework."
    )
    parser.add_argument(
        "game",
        nargs="*",
        metavar="GAME_ID",
        help="One or more game IDs to update. Omit to rebuild all.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print categorizations without writing files.",
    )
    args = parser.parse_args()

    target_ids = args.game if args.game else None
    if target_ids:
        success = 0
        failed = 0
        try:
            for game_id in target_ids:
                print(f"Updating category for game-{game_id}{'  [DRY RUN]' if args.dry_run else ''}...")
                try:
                    if update_single(game_id, args.dry_run):
                        success += 1
                    else:
                        failed += 1
                except Exception as e:
                    log_error(game_id, str(e))
                    failed += 1
        except KeyboardInterrupt:
            print("\n\n  Interrupted.")
        finally:
            tag = " [DRY RUN]" if args.dry_run else ""
            print(f"\nDone{tag}. {success}/{len(target_ids)} succeeded.")
    else:
        print(f"Rebuilding all category files{'  [DRY RUN]' if args.dry_run else ''}...")
        rebuild_all(args.dry_run)


if __name__ == "__main__":
    main()
