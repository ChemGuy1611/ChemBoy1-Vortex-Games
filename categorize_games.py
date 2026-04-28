"""
categorize_games.py

Scans all game-* extension folders and categorizes them by engine/framework
based on the Structure: header comment and key code markers in index.js.

Writes one .txt file per category to resources/lists/. Each line is a GAME_ID.
Also writes games-loadorder.txt for non-UE4/5 games that call context.registerLoadOrder.

Usage:
    python categorize_games.py              # rebuild all category files from scratch
    python categorize_games.py GAME_ID [GAME_ID ...]  # add/update specific games
    python categorize_games.py --dry-run   # print categorizations without writing files
"""

import os
import argparse

from vortex_utils import REPO_ROOT, LISTS_DIR, list_game_ids, detect_engine

# (filename, display label) in detection priority order.
# The label strings match detect_engine() return values exactly.
CATEGORIES = [
    ("games-ue4-5.txt",                      "Unreal Engine 4/5"),
    ("games-ue2-3.txt",                      "Unreal Engine 2/3"),
    ("games-unity-bepinex.txt",              "Unity + BepInEx"),
    ("games-unity-melonloader-bepinex.txt",  "Unity + MelonLoader/BepInEx"),
    ("games-unity-umm.txt",                  "Unity + UMM"),
    ("games-farcrygame.txt",                 "Far Cry / Dunia"),
    ("games-rpgmaker.txt",                   "RPG Maker"),
    ("games-snowdrop.txt",                   "Snowdrop Engine"),
    ("games-godot.txt",                      "Godot Engine"),
    ("games-cobra-acse.txt",                 "Cobra / ACSE"),
    ("games-reengine.txt",                   "RE Engine"),
    ("games-reloaded2.txt",                  "Reloaded-II"),
    ("games-anvil.txt",                      "Anvil Engine"),
    ("games-srmm.txt",                       "Shin Ryu (SRMM)"),
    ("games-frostbite.txt",                  "Frostbite"),
    ("games-basic.txt",                      "Basic / Other"),
]

_FILE_FOR_LABEL = {label: fname for fname, label in CATEGORIES}

LOADORDER_FILE = "games-loadorder.txt"


def categorize(game_id):
    """Return the output filename for the given game_id, or None if no index.js found."""
    index_path = os.path.join(REPO_ROOT, f"game-{game_id}", "index.js")
    if not os.path.isfile(index_path):
        return None
    with open(index_path, encoding="utf-8") as f:
        src = f.read()
    return _FILE_FOR_LABEL[detect_engine(src)]


def is_load_order_game(game_id):
    """Return True if the game calls registerLoadOrder and is not a UE4/5 extension."""
    index_path = os.path.join(REPO_ROOT, f"game-{game_id}", "index.js")
    if not os.path.isfile(index_path):
        return False
    with open(index_path, encoding="utf-8") as f:
        src = f.read()
    return "context.registerLoadOrder" in src and detect_engine(src) != "Unreal Engine 4/5"


def read_list(filepath):
    """Read a category file and return a list of game IDs (stripped, non-empty lines)."""
    if not os.path.isfile(filepath):
        return []
    with open(filepath, encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def write_list(filepath, game_ids):
    """Write a sorted list of game IDs to a category file."""
    with open(filepath, "w", encoding="utf-8") as f:
        for gid in sorted(game_ids):
            f.write(gid + "\n")


def rebuild_all(dry_run=False):
    """Scan all game-* folders and rebuild every category file from scratch."""
    buckets = {filename: [] for filename, _ in CATEGORIES}
    lo_games = []

    for game_id in list_game_ids():
        target = categorize(game_id)
        if target:
            buckets[target].append(game_id)
        else:
            print(f"  Warning: no index.js found for game-{game_id}, skipping.")
        if is_load_order_game(game_id):
            lo_games.append(game_id)

    if not dry_run:
        os.makedirs(LISTS_DIR, exist_ok=True)

    for filename, label in CATEGORIES:
        if dry_run:
            print(f"  {filename}: {len(buckets[filename])} games")
        else:
            filepath = os.path.join(LISTS_DIR, filename)
            write_list(filepath, buckets[filename])
            print(f"  {filename}: {len(buckets[filename])} games")

    if dry_run:
        print(f"  {LOADORDER_FILE}: {len(lo_games)} games")
    else:
        write_list(os.path.join(LISTS_DIR, LOADORDER_FILE), lo_games)
        print(f"  {LOADORDER_FILE}: {len(lo_games)} games")

    tag = " [DRY RUN]" if dry_run else ""
    print(f"\nDone{tag}. {sum(len(v) for v in buckets.values())} games categorized across {len(CATEGORIES)} categories. {len(lo_games)} with load order.")


def update_single(game_id, dry_run=False):
    """Add game_id to its correct category file and remove it from all others."""
    target = categorize(game_id)
    if target is None:
        print(f"  Warning: no index.js found for game-{game_id}, skipping.")
        return

    if not dry_run:
        os.makedirs(LISTS_DIR, exist_ok=True)

    for filename, label in CATEGORIES:
        filepath = os.path.join(LISTS_DIR, filename)
        ids = read_list(filepath)
        if filename == target:
            if game_id not in ids:
                if dry_run:
                    print(f"  [DRY RUN] Would add {game_id} -> {filename} ({label})")
                else:
                    ids.append(game_id)
                    write_list(filepath, ids)
                    print(f"  Added {game_id} -> {filename} ({label})")
            else:
                print(f"  {game_id} already in {filename} ({label})")
        else:
            if game_id in ids:
                if dry_run:
                    print(f"  [DRY RUN] Would remove {game_id} from {filename}")
                else:
                    ids.remove(game_id)
                    write_list(filepath, ids)
                    print(f"  Removed {game_id} from {filename}")

    lo_path = os.path.join(LISTS_DIR, LOADORDER_FILE)
    lo_ids = read_list(lo_path)
    if is_load_order_game(game_id):
        if game_id not in lo_ids:
            if dry_run:
                print(f"  [DRY RUN] Would add {game_id} -> {LOADORDER_FILE}")
            else:
                lo_ids.append(game_id)
                write_list(lo_path, lo_ids)
                print(f"  Added {game_id} -> {LOADORDER_FILE}")
        else:
            print(f"  {game_id} already in {LOADORDER_FILE}")
    else:
        if game_id in lo_ids:
            if dry_run:
                print(f"  [DRY RUN] Would remove {game_id} from {LOADORDER_FILE}")
            else:
                lo_ids.remove(game_id)
                write_list(lo_path, lo_ids)
                print(f"  Removed {game_id} from {LOADORDER_FILE}")


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
        for game_id in target_ids:
            print(f"Updating category for game-{game_id}{'  [DRY RUN]' if args.dry_run else ''}...")
            update_single(game_id, args.dry_run)
    else:
        print(f"Rebuilding all category files{'  [DRY RUN]' if args.dry_run else ''}...")
        rebuild_all(args.dry_run)


if __name__ == "__main__":
    main()
