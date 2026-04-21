"""
release_extension.py

Zips up a game extension folder using 7-Zip and opens the Nexus Mods
extension page in the browser.

Steps performed per game:
    1. Validate info.json version has a matching ## [X.Y.Z] entry in CHANGELOG.md
    2. Rename version .txt file to match info.json version
    3. Update Version and Date in index.js header comment
    4. Add resolved store IDs to DISCOVERY_IDS_ACTIVE if missing
    5. node --check on index.js (warns on syntax error)
    6. eslint on index.js (warns on lint errors)
    7. Run generate_explained.js to regenerate EXTENSION_EXPLAINED.md
    8. Create game-{GAME_ID}.zip with 7-Zip
    9. Open EXTENSION_URL in browser (or nexusmods.com/games/site if not set)

Usage:
    python release_extension.py GAME_ID [GAME_ID ...]
    python release_extension.py GAME_ID --no-open
    python release_extension.py GAME_ID --dry-run

Environment variables:
    SEVENZIP_PATH  (optional, default: C:\\Program Files\\7-Zip\\7z.exe)
"""

import argparse
import os
import re
import sys
import subprocess
import webbrowser

from vortex_utils import (
    REPO_ROOT, run_generate_explained, add_to_discovery_ids, node_check, eslint_check,
    extract_extension_url, read_info_json, parse_changelog_latest,
    update_index_header as _apply_header,
)
SEVENZIP = os.environ.get("SEVENZIP_PATH", r"C:\Program Files\7-Zip\7z.exe")
NEXUS_SITE_URL = "https://www.nexusmods.com/games/site"



def update_version_txt(folder, game_id, version, dry_run=False):
    """Rename the versioned .txt file to match the current version from info.json."""
    if not version:
        print(f"  [{game_id}] WARNING -could not read version from info.json, skipping .txt rename")
        return

    version_re = re.compile(r'^\d+\.\d+\.\d+\.txt$')
    existing = [f for f in os.listdir(folder) if version_re.match(f)]
    expected = f"{version}.txt"

    if not existing:
        print(f"  [{game_id}] WARNING -no version .txt file found in folder")
        return

    renamed = False
    for txt_file in existing:
        if txt_file == expected:
            print(f"  [{game_id}] Version .txt already correct: {txt_file}")
        elif dry_run:
            print(f"  [{game_id}] [DRY RUN] Would rename: {txt_file} -> {expected}")
        elif renamed:
            print(f"  [{game_id}] WARNING -extra version .txt found and skipped: {txt_file}")
        else:
            os.rename(os.path.join(folder, txt_file), os.path.join(folder, expected))
            print(f"  [{game_id}] Renamed: {txt_file} -> {expected}")
            renamed = True



def update_index_header(folder, game_id, version, date, dry_run=False):
    """Update the Version and Date lines in the index.js header comment."""
    index_path = os.path.join(folder, "index.js")
    if not os.path.isfile(index_path):
        print(f"  [{game_id}] WARNING -index.js not found, skipping header update")
        return

    try:
        with open(index_path, encoding="utf-8") as f:
            original = f.read()
    except OSError as e:
        print(f"  [{game_id}] WARNING -could not read index.js: {e}")
        return

    if not version:
        print(f"  [{game_id}] WARNING -no version available, skipping Version header update")
    if not date:
        print(f"  [{game_id}] WARNING -no changelog date found, skipping Date header update")

    updated = _apply_header(original, version=version, date=date)

    if updated == original:
        print(f"  [{game_id}] index.js header already up to date")
        return

    if dry_run:
        if version:
            print(f"  [{game_id}] [DRY RUN] Would update index.js header: Version -> {version}")
        if date:
            print(f"  [{game_id}] [DRY RUN] Would update index.js header: Date -> {date}")
        return

    try:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(updated)
        if version:
            print(f"  [{game_id}] Updated index.js header: Version -> {version}")
        if date:
            print(f"  [{game_id}] Updated index.js header: Date -> {date}")
    except OSError as e:
        print(f"  [{game_id}] ERROR -could not write index.js: {e}")


def update_discovery_ids(folder, game_id, dry_run=False):
    """Add any resolved store IDs to DISCOVERY_IDS_ACTIVE if not already present."""
    index_path = os.path.join(folder, "index.js")
    if not os.path.isfile(index_path):
        return
    try:
        with open(index_path, encoding="utf-8") as f:
            original = f.read()
    except OSError as e:
        print(f"  [{game_id}] WARNING -could not read index.js: {e}")
        return
    updated = add_to_discovery_ids(original)
    if updated == original:
        print(f"  [{game_id}] DISCOVERY_IDS_ACTIVE already up to date")
        return
    if dry_run:
        print(f"  [{game_id}] [DRY RUN] Would update DISCOVERY_IDS_ACTIVE")
        return
    try:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(updated)
        print(f"  [{game_id}] Updated DISCOVERY_IDS_ACTIVE")
    except OSError as e:
        print(f"  [{game_id}] ERROR -could not write index.js: {e}")



def release(game_id, open_browser, dry_run=False):
    folder = os.path.join(REPO_ROOT, f"game-{game_id}")
    if not os.path.isdir(folder):
        print(f"  [{game_id}] ERROR -folder not found: {folder}")
        return False

    index_path = os.path.join(folder, "index.js")
    extension_url = None
    if os.path.isfile(index_path):
        with open(index_path, encoding="utf-8") as f:
            extension_url = extract_extension_url(f.read())

    info = read_info_json(folder)
    if info is None:
        print(f"  [{game_id}] ERROR - info.json missing or invalid")
        return False
    version = info.get("version")

    changelog_path = os.path.join(folder, "CHANGELOG.md")
    if not os.path.isfile(changelog_path):
        print(f"  [{game_id}] ERROR - CHANGELOG.md missing")
        return False
    with open(changelog_path, encoding="utf-8") as f:
        changelog_src = f.read()
    if version and not re.search(rf'## \[{re.escape(version)}\]', changelog_src):
        print(f"  [{game_id}] ERROR - version {version} has no entry in CHANGELOG.md (add ## [{version}] section)")
        return False

    changelog_version, date = parse_changelog_latest(folder)
    if version and changelog_version and version != changelog_version:
        print(f"  [{game_id}] WARNING - info.json version ({version}) does not match latest CHANGELOG entry ({changelog_version})")
    update_version_txt(folder, game_id, version, dry_run=dry_run)
    update_index_header(folder, game_id, version, date, dry_run=dry_run)
    update_discovery_ids(folder, game_id, dry_run=dry_run)

    if dry_run:
        zip_path = os.path.join(folder, f"game-{game_id}.zip")
        print(f"  [{game_id}] [DRY RUN] Would run node --check on index.js")
        print(f"  [{game_id}] [DRY RUN] Would run eslint on index.js")
        print(f"  [{game_id}] [DRY RUN] Would generate EXTENSION_EXPLAINED.md")
        print(f"  [{game_id}] [DRY RUN] Would create: {zip_path}")
        if extension_url:
            print(f"  [{game_id}] [DRY RUN] Would open: {extension_url}")
        else:
            print(f"  [{game_id}] [DRY RUN] EXTENSION_URL not set -would open: {NEXUS_SITE_URL}")
        return True

    print(f"  [{game_id}] Checking index.js syntax...")
    ok, err = node_check(index_path)
    if ok:
        print(f"  [{game_id}] index.js syntax OK")
    else:
        print(f"  [{game_id}] WARNING - node --check found a syntax error in index.js:")
        print(f"    {err}")

    print(f"  [{game_id}] Linting index.js...")
    ok, out = eslint_check(index_path)
    if ok:
        print(f"  [{game_id}] eslint OK")
    else:
        print(f"  [{game_id}] WARNING - eslint reported issues:")
        for line in out.splitlines():
            print(f"    {line}")

    print(f"  [{game_id}] Generating EXTENSION_EXPLAINED.md...")
    ok, err = run_generate_explained(game_id)
    if not ok:
        print(f"  [{game_id}] WARNING -generate_explained.js failed: {err}")

    zip_path = os.path.join(folder, f"game-{game_id}.zip")

    # Remove existing zip so 7-Zip creates a fresh one
    if os.path.isfile(zip_path):
        os.remove(zip_path)

    print(f"  [{game_id}] Zipping...")
    result = subprocess.run(
        [SEVENZIP, "a", "-tzip", zip_path, os.path.join(folder, "*")],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"  [{game_id}] ERROR -7-Zip failed:")
        print(f"    {result.stderr.strip() or result.stdout.strip()}")
        return False

    size_kb = os.path.getsize(zip_path) / 1024
    print(f"  [{game_id}] Created: {zip_path} ({size_kb:.1f} KB)")

    url_to_open = extension_url or NEXUS_SITE_URL
    label = "" if extension_url else " (EXTENSION_URL not set)"
    if open_browser:
        print(f"  [{game_id}] Opening: {url_to_open}{label}")
        webbrowser.open(url_to_open)

    return True


def main():
    parser = argparse.ArgumentParser(
        description="Package Vortex game extensions into .zip archives for release."
    )
    parser.add_argument(
        "game",
        nargs="+",
        metavar="GAME_ID",
        help="One or more game IDs to release.",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Skip opening the Nexus Mods page in the browser.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be done without running 7-Zip.",
    )
    args = parser.parse_args()

    if not args.dry_run and not os.path.isfile(SEVENZIP):
        print(f"ERROR: 7-Zip not found at {SEVENZIP}")
        sys.exit(1)

    label = " [DRY RUN]" if args.dry_run else ""
    print(f"Releasing {len(args.game)} extension(s){label}...\n")
    success = 0
    for game_id in args.game:
        if release(game_id, not args.no_open, args.dry_run):
            success += 1

    print(f"\nDone. {success}/{len(args.game)} succeeded.")


if __name__ == "__main__":
    main()
