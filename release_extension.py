"""
release_extension.py

Zips up a game extension folder using 7-Zip and opens the Nexus Mods
extension page in the browser. Optionally uploads the zip to the mod page
as a new file version via the Nexus Mods v3 API.

Steps performed per game:
    1. Validate info.json version has a matching ## [X.Y.Z] entry in CHANGELOG.md
    2. Check info.json 'name' matches 'Game: <Name>' pattern (errors if not)
    3. Check that const debug = false in index.js (errors if true)
    4. Check that all context.registerInstaller calls have unique priority numbers (errors if not)
    5. Run validate_index_js: leftover XXX, missing applyGame/registerGame/main (warns)
    6. Rename version .txt file to match info.json version
    7. Update Version and Date in index.js header comment
    8. Add resolved store IDs to DISCOVERY_IDS_ACTIVE if missing
    9. node --check on index.js (warns on syntax error; use --skip-node-check to skip)
   10. eslint on index.js (warns on lint errors; use --skip-eslint to skip)
   11. Run generate_explained.js to regenerate EXTENSION_EXPLAINED.md
   12. Create game-{GAME_ID}.zip with 7-Zip
   13. Optionally upload zip to Nexus Mods as a new file version (changelog entry as
       description; file group resolved via v1 uid -> v3 groups); default: skip; use --upload to enable
   14. Open EXTENSION_URL?tab=files in browser (or nexusmods.com/games/site if not set)
   15. Optionally open EXTENSION_URL/edit/documents (changelog editor) in browser

Usage:
    python release_extension.py GAME_ID [GAME_ID ...]
    python release_extension.py GAME_ID --no-open
    python release_extension.py GAME_ID --dry-run
    python release_extension.py GAME_ID --skip-node-check
    python release_extension.py GAME_ID --skip-eslint
    python release_extension.py GAME_ID --upload
    python release_extension.py GAME_ID --edit-changelog

Environment variables:
    SEVENZIP_PATH   (optional, default: C:\\Program Files\\7-Zip\\7z.exe)
    NEXUS_API_KEY   (required for --upload)
"""

import argparse
import os
import re
import sys
import subprocess
import webbrowser
import zipfile

from vortex_utils import (
    REPO_ROOT, run_generate_explained_batch, add_to_discovery_ids, node_check, eslint_check,
    extract_extension_url, read_info_json, parse_changelog_latest,
    update_index_header as _apply_header, mutate_index_js, validate_index_js,
    print_run_summary, assert_is_game_id, log_info, log_warn, log_error,
    get_api_key, parse_nexus_mod_url,
)
from nexus_upload import pick_file_group, upload_zip, extract_changelog_entry
SEVENZIP = os.environ.get("SEVENZIP_PATH", r"C:\Program Files\7-Zip\7z.exe")
NEXUS_SITE_URL = "https://www.nexusmods.com/games/site"


# == Extension helpers =========================================================

def check_installer_priorities(index_src, game_id):
    """Error if any two context.registerInstaller calls share the same priority number."""
    priorities = re.findall(
        r"""context\.registerInstaller\s*\(\s*["'`][^"'`]*["'`]\s*,\s*(\d+)\s*,""",
        index_src,
    )
    seen, dupes = set(), []
    for p in priorities:
        if p in seen and p not in dupes:
            dupes.append(p)
        seen.add(p)
    if dupes:
        log_error(game_id, f"duplicate registerInstaller priority: {', '.join(dupes)}")
        return False
    return True


def update_version_txt(folder, game_id, version, dry_run=False):
    """Rename the versioned .txt file to match the current version from info.json."""
    if not version:
        log_warn(game_id, "could not read version from info.json, skipping .txt rename")
        return

    version_re = re.compile(r'^\d+\.\d+\.\d+\.txt$')
    existing = [f for f in os.listdir(folder) if version_re.match(f)]
    expected = f"{version}.txt"

    if not existing:
        log_warn(game_id, "no version .txt file found in folder")
        return

    renamed = False
    for txt_file in existing:
        if txt_file == expected:
            log_info(game_id, f"Version .txt already correct: {txt_file}")
        elif dry_run:
            log_info(game_id, f"[DRY RUN] Would rename: {txt_file} -> {expected}")
        elif renamed:
            log_warn(game_id, f"extra version .txt found and skipped: {txt_file}")
        else:
            os.rename(os.path.join(folder, txt_file), os.path.join(folder, expected))
            log_info(game_id, f"Renamed: {txt_file} -> {expected}")
            renamed = True


def update_index_header(folder, game_id, version, date, dry_run=False):
    """Update the Version and Date lines in the index.js header comment."""
    if not version:
        log_warn(game_id, "no version available, skipping Version header update")
    if not date:
        log_warn(game_id, "no changelog date found, skipping Date header update")
    parts = [p for p in (f"Version -> {version}" if version else None, f"Date -> {date}" if date else None) if p]
    label = ", ".join(parts) if parts else "header"
    mutate_index_js(
        folder, game_id,
        lambda src: _apply_header(src, version=version, date=date),
        dry_run=dry_run,
        changed_msg=f"Updated index.js {label}",
        unchanged_msg="index.js header already up to date",
        dry_run_msg=f"Would update index.js {label}",
    )


def update_discovery_ids(folder, game_id, dry_run=False):
    """Add any resolved store IDs to DISCOVERY_IDS_ACTIVE if not already present."""
    mutate_index_js(
        folder, game_id, add_to_discovery_ids,
        dry_run=dry_run,
        changed_msg="Updated DISCOVERY_IDS_ACTIVE",
        unchanged_msg="DISCOVERY_IDS_ACTIVE already up to date",
        dry_run_msg="Would update DISCOVERY_IDS_ACTIVE",
    )


def release(game_id, open_browser, dry_run=False, skip_eslint=False,
            skip_node_check=False, upload=False, edit_changelog=False, out=None):
    if out is None:
        out = {}
    out.update({"zipped": False, "uploaded": False, "upload_failed": False, "browser_opened": False})

    folder = os.path.join(REPO_ROOT, f"game-{game_id}")
    if not os.path.isdir(folder):
        log_error(game_id, f"folder not found: {folder}")
        return False

    index_path = os.path.join(folder, "index.js")
    extension_url = None
    if os.path.isfile(index_path):
        with open(index_path, encoding="utf-8") as f:
            index_src = f.read()
        extension_url = extract_extension_url(index_src)
        if re.search(r'^\s*(?:const|let)\s+debug\s*=\s*true\b', index_src, re.MULTILINE):
            log_error(game_id, "debug is set to true in index.js")
            return False
        if not check_installer_priorities(index_src, game_id):
            return False
        for issue in validate_index_js(index_src):
            log_warn(game_id, issue)

    info = read_info_json(folder)
    if info is None:
        log_error(game_id, "info.json missing or invalid")
        return False
    version = info.get("version")

    name_field = info.get("name", "")
    if not re.match(r'^Game:\s+\S', name_field):
        log_error(game_id, f"info.json 'name' does not match 'Game: <Name>' pattern: {name_field!r}")
        return False

    changelog_path = os.path.join(folder, "CHANGELOG.md")
    if not os.path.isfile(changelog_path):
        log_error(game_id, "CHANGELOG.md missing")
        return False
    with open(changelog_path, encoding="utf-8") as f:
        changelog_src = f.read()
    if version and not re.search(rf'## \[{re.escape(version)}\]', changelog_src):
        log_error(game_id, f"version {version} has no entry in CHANGELOG.md (add ## [{version}] section)")
        return False

    changelog_version, date = parse_changelog_latest(folder)
    if version and changelog_version and version != changelog_version:
        log_warn(game_id, f"info.json version ({version}) does not match latest CHANGELOG entry ({changelog_version})")
    changelog_entry = extract_changelog_entry(changelog_src, version or "")
    if changelog_entry:
        log_info(game_id, f"Changelog entry for v{version}:")
        for line in changelog_entry.splitlines():
            print(f"    {line}")

    update_version_txt(folder, game_id, version, dry_run=dry_run)
    update_index_header(folder, game_id, version, date, dry_run=dry_run)
    update_discovery_ids(folder, game_id, dry_run=dry_run)

    if dry_run:
        zip_path = os.path.join(folder, f"game-{game_id}.zip")
        if not skip_node_check:
            log_info(game_id, "[DRY RUN] Would run node --check on index.js")
        if not skip_eslint:
            log_info(game_id, "[DRY RUN] Would run eslint on index.js")
        log_info(game_id, "[DRY RUN] Would generate EXTENSION_EXPLAINED.md")
        log_info(game_id, f"[DRY RUN] Would create: {zip_path}")
        api_key = get_api_key("NEXUS_API_KEY")
        if not api_key:
            log_warn(game_id, "[DRY RUN] NEXUS_API_KEY not set; file group lookup skipped")
        else:
            parsed = parse_nexus_mod_url(extension_url) if extension_url else None
            if not parsed:
                log_warn(game_id, "[DRY RUN] EXTENSION_URL missing or not a valid Nexus mod URL; file group lookup skipped")
            else:
                _domain, mod_id = parsed
                try:
                    group = pick_file_group(mod_id, _domain, api_key, game_id)
                    if upload:
                        log_info(game_id, f"[DRY RUN] Would upload {os.path.basename(zip_path)} to file group"
                                 f" '{group['name']}' (id: {group['id']})")
                    else:
                        log_info(game_id, f"[DRY RUN] File group: '{group['name']}' (id: {group['id']})")
                except Exception as e:
                    log_error(game_id, f"[DRY RUN] File group lookup failed: {e}")
        if extension_url:
            log_info(game_id, f"[DRY RUN] Would open (files tab): {extension_url}?tab=files")
            if edit_changelog:
                _ep = parse_nexus_mod_url(extension_url)
                if _ep:
                    log_info(game_id, f"[DRY RUN] Would open (changelog edit): https://www.nexusmods.com/games/{_ep[0]}/mods/{_ep[1]}/edit/documents")
        else:
            log_info(game_id, f"[DRY RUN] EXTENSION_URL not set - would open: {NEXUS_SITE_URL}")
        return True

    if not skip_node_check:
        log_info(game_id, "Checking index.js syntax...")
        ok, err = node_check(index_path)
        if ok:
            log_info(game_id, "index.js syntax OK")
        else:
            log_warn(game_id, "node --check found a syntax error in index.js:")
            print(f"    {err}")

    if not skip_eslint:
        log_info(game_id, "Linting index.js...")
        lint_ok, lint_out = eslint_check(index_path)
        if lint_ok:
            log_info(game_id, "eslint OK")
        else:
            log_warn(game_id, "eslint reported issues:")
            for line in lint_out.splitlines():
                print(f"    {line}")

    zip_path = os.path.join(folder, f"game-{game_id}.zip")

    # The zip is a convenience artifact for manual distribution.
    # If 7-Zip fails or is absent, having no zip is acceptable — the extension
    # (index.js, info.json, CHANGELOG.md, images) is still fully valid without it.
    if os.path.isfile(zip_path):
        os.remove(zip_path)

    log_info(game_id, "Zipping...")
    result = subprocess.run(
        [SEVENZIP, "a", "-tzip", zip_path, os.path.join(folder, "*")],
        capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )

    if result.returncode != 0:
        log_error(game_id, "7-Zip failed:")
        print(f"    {result.stderr.strip() or result.stdout.strip()}")
        return False

    size_kb = os.path.getsize(zip_path) / 1024
    log_info(game_id, f"Created: {zip_path} ({size_kb:.1f} KB)")
    out["zipped"] = True

    try:
        with zipfile.ZipFile(zip_path) as zf:
            names = zf.namelist()
        if "info.json" not in names:
            shown = ", ".join(names[:10]) + (f" ... ({len(names)} total)" if len(names) > 10 else "")
            log_warn(game_id, f"info.json not found at zip root (files: {shown})")
        if "index.js" not in names:
            shown = ", ".join(names[:10]) + (f" ... ({len(names)} total)" if len(names) > 10 else "")
            log_warn(game_id, f"index.js not found at zip root (files: {shown})")
    except Exception as e:
        log_warn(game_id, f"could not verify zip contents: {e}")

    if upload and not dry_run:
        api_key = get_api_key("NEXUS_API_KEY")
        if not api_key:
            log_error(game_id, "NEXUS_API_KEY not set; skipping upload")
            out["upload_failed"] = True
        else:
            parsed = parse_nexus_mod_url(extension_url) if extension_url else None
            if not parsed:
                log_error(game_id, "EXTENSION_URL missing or not a valid Nexus mod URL; skipping upload")
                out["upload_failed"] = True
            else:
                _domain, mod_id = parsed
                try:
                    upload_zip(zip_path, mod_id, _domain, version or "", changelog_entry, api_key, game_id)
                    out["uploaded"] = True
                except Exception as e:
                    log_error(game_id, f"upload failed: {e}")
                    out["upload_failed"] = True

    url_to_open = (f"{extension_url}?tab=files" if extension_url else None) or NEXUS_SITE_URL
    url_label = "" if extension_url else " (EXTENSION_URL not set)"
    if open_browser:
        log_info(game_id, f"Opening: {url_to_open}{url_label}")
        webbrowser.open(url_to_open)
        out["browser_opened"] = True
        if edit_changelog and extension_url:
            _ep = parse_nexus_mod_url(extension_url)
            if _ep:
                edit_url = f"https://www.nexusmods.com/games/{_ep[0]}/mods/{_ep[1]}/edit/documents"
                log_info(game_id, f"Opening changelog editor: {edit_url}")
                webbrowser.open(edit_url)

    return True


def _print_per_game_summary(details):
    """Print per-game zipped/uploaded/browser action summary."""
    if not details:
        return
    print("\nPer-game actions:")
    for game_id, r in details.items():
        if not r.get("ok"):
            print(f"  {game_id}: failed")
            continue
        parts = ["zipped"]
        if r.get("uploaded"):
            parts.append("uploaded")
        elif r.get("upload_failed"):
            parts.append("upload failed")
        else:
            parts.append("upload skipped")
        if r.get("browser_opened"):
            parts.append("opened browser")
        print(f"  {game_id}: {', '.join(parts)}")


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
        help="Print what would be done without running checks, 7-Zip, or upload.",
    )
    parser.add_argument(
        "--skip-node-check",
        action="store_true",
        help="Skip the node --check syntax step.",
    )
    parser.add_argument(
        "--skip-eslint",
        action="store_true",
        help="Skip the eslint step.",
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upload the zip to Nexus Mods as a new file version (no prompt).",
    )
    parser.add_argument(
        "--edit-changelog",
        action="store_true",
        help="Also open the Nexus Mods changelog editor (Documents tab) in the browser.",
    )
    args = parser.parse_args()

    upload = True if args.upload else False

    if not args.dry_run and not os.path.isfile(SEVENZIP):
        print(f"ERROR: 7-Zip not found at {SEVENZIP}")
        sys.exit(1)

    dry_label = " [DRY RUN]" if args.dry_run else ""
    print(f"Releasing {len(args.game)} extension(s){dry_label}...\n")

    # Batch generate_explained for all valid game folders in a single Node invocation.
    if not args.dry_run:
        batch_ids = [gid for gid in args.game if os.path.isdir(os.path.join(REPO_ROOT, f"game-{gid}"))]
        if batch_ids:
            n = len(batch_ids)
            label = f"{n} games" if n > 1 else "1 game"
            print(f"  Generating EXTENSION_EXPLAINED.md ({label})...")
            ok, err = run_generate_explained_batch(batch_ids)
            if not ok:
                print(f"  WARNING - generate_explained.js batch failed: {err}")

    saved = []
    failed = []
    details = {}
    try:
        for game_id in args.game:
            try:
                assert_is_game_id(game_id)
            except ValueError as e:
                print(f"  ERROR - {e}")
                failed.append(game_id)
                details[game_id] = {}
                continue
            r_out = {}
            try:
                ok = release(
                    game_id, not args.no_open, args.dry_run,
                    skip_eslint=args.skip_eslint,
                    skip_node_check=args.skip_node_check,
                    upload=upload,
                    edit_changelog=args.edit_changelog,
                    out=r_out,
                )
                r_out["ok"] = ok
                if ok:
                    saved.append(game_id)
                else:
                    failed.append(game_id)
            except Exception as e:
                log_error(game_id, f"unexpected error: {e}")
                r_out["ok"] = False
                failed.append(game_id)
            details[game_id] = r_out
    except KeyboardInterrupt:
        print("\n\n  Interrupted.")
    finally:
        print_run_summary(saved, failed, skipped=[])
        if not args.dry_run:
            _print_per_game_summary(details)


if __name__ == "__main__":
    main()
