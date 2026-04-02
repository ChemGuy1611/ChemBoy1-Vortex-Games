"""
release_extension.py

Zips up a game extension folder using 7-Zip and opens the Nexus Mods
extension page in the browser.

Usage:
    python release_extension.py GAME_ID [GAME_ID ...]
    python release_extension.py GAME_ID --no-open
    python release_extension.py GAME_ID --dry-run
"""

import os
import re
import sys
import subprocess

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
SEVENZIP = r"C:\Program Files\7-Zip\7z.exe"


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
        print(f"  [{game_id}] ERROR — folder not found: {folder}")
        return False

    index_path = os.path.join(folder, "index.js")
    extension_url = None
    if os.path.isfile(index_path):
        with open(index_path, encoding="utf-8") as f:
            extension_url = get_extension_url(f.read())

    if dry_run:
        zip_path = os.path.join(folder, f"game-{game_id}.zip")
        print(f"  [{game_id}] [DRY RUN] Would generate EXTENSION_EXPLAINED.md")
        print(f"  [{game_id}] [DRY RUN] Would create: {zip_path}")
        if extension_url:
            print(f"  [{game_id}] [DRY RUN] Would open: {extension_url}")
        else:
            print(f"  [{game_id}] [DRY RUN] EXTENSION_URL not set — browser open would be skipped.")
        return True

    print(f"  [{game_id}] Generating EXTENSION_EXPLAINED.md...")
    result = subprocess.run(
        ["node", "generate_explained.js", "--game", f"game-{game_id}"],
        cwd=REPO_ROOT, capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  [{game_id}] WARNING — generate_explained.js failed: {result.stderr.strip()}")

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
        print(f"  [{game_id}] ERROR — 7-Zip failed:")
        print(f"    {result.stderr.strip() or result.stdout.strip()}")
        return False

    size_kb = os.path.getsize(zip_path) / 1024
    print(f"  [{game_id}] Created: {zip_path} ({size_kb:.1f} KB)")

    if extension_url:
        print(f"  [{game_id}] Opening: {extension_url}")
        if open_browser:
            subprocess.run(["cmd", "/c", "start", "", extension_url], check=False)
    else:
        print(f"  [{game_id}] EXTENSION_URL not set — skipping browser open.")

    return True


def main():
    args = sys.argv[1:]
    open_browser = "--no-open" not in args
    dry_run = "--dry-run" in args
    args = [a for a in args if a not in ("--no-open", "--dry-run", "--force")]

    if not args:
        print("Usage: python release_extension.py GAME_ID [GAME_ID ...] [--no-open] [--dry-run]")
        sys.exit(1)

    if not dry_run and not os.path.isfile(SEVENZIP):
        print(f"ERROR: 7-Zip not found at {SEVENZIP}")
        sys.exit(1)

    label = " [DRY RUN]" if dry_run else ""
    print(f"Releasing {len(args)} extension(s){label}...\n")
    success = 0
    for game_id in args:
        if release(game_id, open_browser, dry_run):
            success += 1

    print(f"\nDone. {success}/{len(args)} succeeded.")


if __name__ == "__main__":
    main()
