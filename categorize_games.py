"""
categorize_games.py

Scans all game-* extension folders and categorizes them by engine/framework
based on the Structure: header comment and key code markers in index.js.

Writes one .txt file per category to resources/. Each line is a GAME_ID.

Usage:
    python categorize_games.py              # rebuild all category files from scratch
    python categorize_games.py GAME_ID     # add/update a single game only
    python categorize_games.py --dry-run   # print categorizations without writing files
"""

import os
import sys
import re

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
RESOURCES_DIR = os.path.join(REPO_ROOT, "resources")

# Output file name → detection logic (applied in order; first match wins)
# Each entry: (filename, label, detector_fn)
# detector_fn(head: str, src: str) -> bool
#   head = first 20 lines joined, src = full file content

CATEGORIES = [
    (
        "games-ue4-5.txt",
        "Unreal Engine 4/5",
        lambda head, src: "const UNREALDATA =" in src,
    ),
    (
        "games-ue2-3.txt",
        "Unreal Engine 2/3",
        lambda head, src: "const TFC_ID =" in src or "Structure: UE2/3" in head or "TFC Installer" in head,
    ),
    (
        "games-unity-bepinex.txt",
        "Unity + BepInEx (modtype-bepinex)",
        lambda head, src: (
            "requireExtension('modtype-bepinex')" in src
            and "MelonLoader" not in head
            and "Hybrid" not in head
        ),
    ),
    (
        "games-unity-melonloader-bepinex.txt",
        "Unity + MelonLoader/BepInEx Hybrid",
        lambda head, src: "MelonLoader" in head or "Hybrid" in head,
    ),
    (
        "games-unity-umm.txt",
        "Unity + UMM",
        lambda head, src: "requireExtension('modtype-umm')" in src or "UMM" in head,
    ),
    (
        "games-farcrygame.txt",
        "Far Cry / Dunia Engine",
        lambda head, src: "Far Cry" in head or "Dunia" in head,
    ),
    (
        "games-rpgmaker.txt",
        "RPG Maker",
        lambda head, src: "RPGMaker" in head or "RPG Maker" in head,
    ),
    (
        "games-snowdrop.txt",
        "Snowdrop Engine",
        lambda head, src: "Snowdrop" in head,
    ),
    (
        "games-godot.txt",
        "Godot Engine",
        lambda head, src: "Godot" in head,
    ),
    (
        "games-cobra-acse.txt",
        "Cobra Engine / ACSE",
        lambda head, src: "const ACSE_ID =" in src or "Cobra" in head or "ACSE" in head,
    ),
    (
        "games-reengine.txt",
        "RE Engine (REFramework / Fluffy)",
        lambda head, src: "REFramework" in head or "RE Engine" in head or "Fluffy" in head,
    ),
    (
        "games-reloaded2.txt",
        "Reloaded-II",
        lambda head, src: "const RELOADED_ID =" in src or "Reloaded" in head,
    ),
    (
        "games-anvil.txt",
        "Ubisoft Anvil Engine (AnvilToolkit)",
        lambda head, src: "AnvilToolkit" in head or "const ATK_ID =" in src or "ReForge" in src,
    ),
    (
        "games-basic.txt",
        "Basic / Proprietary",
        lambda head, src: True,  # catch-all
    ),
]


def get_head(src):
    """Return the first 20 lines of src joined as a single string."""
    return "\n".join(src.splitlines()[:20])


def categorize(game_id):
    """Return the output filename for the given game_id, or None if no index.js found."""
    index_path = os.path.join(REPO_ROOT, f"game-{game_id}", "index.js")
    if not os.path.isfile(index_path):
        return None
    with open(index_path, encoding="utf-8") as f:
        src = f.read()
    head = get_head(src)
    for filename, _label, detector in CATEGORIES:
        if detector(head, src):
            return filename
    return "games-basic.txt"


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
    buckets = {filename: [] for filename, _, _ in CATEGORIES}

    game_dirs = sorted(
        d for d in os.listdir(REPO_ROOT)
        if d.startswith("game-") and os.path.isdir(os.path.join(REPO_ROOT, d))
    )

    for d in game_dirs:
        game_id = d[len("game-"):]
        target = categorize(game_id)
        if target:
            buckets[target].append(game_id)
        else:
            print(f"  Warning: no index.js found for {d}, skipping.")

    for filename, label, _ in CATEGORIES:
        if dry_run:
            print(f"  {filename}: {len(buckets[filename])} games")
        else:
            filepath = os.path.join(RESOURCES_DIR, filename)
            write_list(filepath, buckets[filename])
            print(f"  {filename}: {len(buckets[filename])} games")

    label = " [DRY RUN]" if dry_run else ""
    print(f"\nDone{label}. {sum(len(v) for v in buckets.values())} games categorized across {len(CATEGORIES)} categories.")


def update_single(game_id, dry_run=False):
    """Add game_id to its correct category file and remove it from all others."""
    target = categorize(game_id)
    if target is None:
        print(f"  Warning: no index.js found for game-{game_id}, skipping.")
        return

    for filename, label, _ in CATEGORIES:
        filepath = os.path.join(RESOURCES_DIR, filename)
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


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    args = [a for a in args if a not in ("--dry-run", "--force")]

    # Remaining positional args (if any) are the GAME_IDs to target
    target_ids = args if args else None
    if target_ids:
        for game_id in target_ids:
            print(f"Updating category for game-{game_id}{'  [DRY RUN]' if dry_run else ''}...")
            update_single(game_id, dry_run)
    else:
        print(f"Rebuilding all category files{'  [DRY RUN]' if dry_run else ''}...")
        rebuild_all(dry_run)


if __name__ == "__main__":
    main()
