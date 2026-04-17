"""
release_extension.py

Zips up a game extension folder using 7-Zip and opens the Nexus Mods
extension page in the browser.

Usage:
    python release_extension.py GAME_ID [GAME_ID ...]
    python release_extension.py GAME_ID --no-open
    python release_extension.py GAME_ID --dry-run
"""

import argparse
import json
import os
import re
import sys
import subprocess

from vortex_utils import REPO_ROOT, run_generate_explained, add_to_discovery_ids
SEVENZIP = os.environ.get("SEVENZIP_PATH", r"C:\Program Files\7-Zip\7z.exe")
NEXUS_SITE_URL = "https://www.nexusmods.com/games/site"


def get_version(folder):
    """Return the version string from info.json, or None if not found."""
    info_path = os.path.join(folder, "info.json")
    if not os.path.isfile(info_path):
        return None
    try:
        with open(info_path, encoding="utf-8") as f:
            return json.load(f).get("version")
    except (json.JSONDecodeError, OSError):
        return None


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

    for txt_file in existing:
        if txt_file == expected:
            print(f"  [{game_id}] Version .txt already correct: {txt_file}")
        elif dry_run:
            print(f"  [{game_id}] [DRY RUN] Would rename: {txt_file} -> {expected}")
        else:
            os.rename(os.path.join(folder, txt_file), os.path.join(folder, expected))
            print(f"  [{game_id}] Renamed: {txt_file} -> {expected}")


def get_changelog_date(folder):
    """Return the date string from the most recent versioned entry in CHANGELOG.md, or None."""
    changelog_path = os.path.join(folder, "CHANGELOG.md")
    if not os.path.isfile(changelog_path):
        return None
    entry_re = re.compile(r'^## \[\d+\.\d+\.\d+\] - (\d{4}-\d{2}-\d{2})', re.MULTILINE)
    try:
        with open(changelog_path, encoding="utf-8") as f:
            content = f.read()
        m = entry_re.search(content)
        return m.group(1) if m else None
    except OSError:
        return None


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

    updated = original
    if version:
        updated = re.sub(r'(Version:\s*)\d+\.\d+\.\d+', rf'\g<1>{version}', updated, count=1)
    else:
        print(f"  [{game_id}] WARNING -no version available, skipping Version header update")

    if date:
        updated = re.sub(r'(Date:\s*)\d{4}-\d{2}-\d{2}', rf'\g<1>{date}', updated, count=1)
    else:
        print(f"  [{game_id}] WARNING -no changelog date found, skipping Date header update")

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


def get_extension_url(src):
    """Return the EXTENSION_URL value from index.js source, or None if unset/XXX."""
    m = re.search(r'const\s+EXTENSION_URL\s*=\s*["\'](.+?)["\']', src)
    if not m:
        return None
    val = m.group(1)
    if val == "XXX" or not val.startswith("http"):
        return None
    return val


def release(game_id, open_browser, dry_run=False):
    folder = os.path.join(REPO_ROOT, f"game-{game_id}")
    if not os.path.isdir(folder):
        print(f"  [{game_id}] ERROR -folder not found: {folder}")
        return False

    index_path = os.path.join(folder, "index.js")
    extension_url = None
    if os.path.isfile(index_path):
        with open(index_path, encoding="utf-8") as f:
            extension_url = get_extension_url(f.read())

    version = get_version(folder)
    date = get_changelog_date(folder)
    update_version_txt(folder, game_id, version, dry_run=dry_run)
    update_index_header(folder, game_id, version, date, dry_run=dry_run)
    update_discovery_ids(folder, game_id, dry_run=dry_run)

    if dry_run:
        zip_path = os.path.join(folder, f"game-{game_id}.zip")
        print(f"  [{game_id}] [DRY RUN] Would generate EXTENSION_EXPLAINED.md")
        print(f"  [{game_id}] [DRY RUN] Would create: {zip_path}")
        if extension_url:
            print(f"  [{game_id}] [DRY RUN] Would open: {extension_url}")
        else:
            print(f"  [{game_id}] [DRY RUN] EXTENSION_URL not set -would open: {NEXUS_SITE_URL}")
        return True

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
    print(f"  [{game_id}] Opening: {url_to_open}{label}")
    if open_browser:
        subprocess.run(["cmd", "/c", "start", "", url_to_open], check=False)

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
