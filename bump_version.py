"""
bump_version.py

Bump the version of one or more Vortex game extensions.
Updates info.json, the index.js header comment, and prepends a new section
to CHANGELOG.md.

Usage:
    python bump_version.py --major GAME_ID [GAME_ID ...]
    python bump_version.py --minor GAME_ID [GAME_ID ...]
    python bump_version.py --patch GAME_ID [GAME_ID ...]
    python bump_version.py --version 1.2.3 GAME_ID [GAME_ID ...]
    python bump_version.py --minor GAME_ID --dry-run
    python bump_version.py --patch GAME_ID --open-changelog

Options:
    --major          Bump major segment: 1.2.3 -> 2.0.0 (resets minor and patch)
    --minor          Bump minor segment: 1.2.3 -> 1.3.0 (resets patch)
    --patch          Bump patch segment: 1.2.3 -> 1.2.4
    --version VER    Set explicit semver version (X.Y.Z)
    --open-changelog Open CHANGELOG.md in the default editor after bumping
    --dry-run        Print changes without writing files
"""

import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import vortex_utils as vu


def _bump(version: str, bump_type: str) -> str:
    return vu.bump_semver(version, bump_type)


def _process(folder: str, game_id: str, bump_type: str | None, dry_run: bool,
             manual_ver: str | None = None, open_changelog: bool = False) -> bool:
    info = vu.read_info_json(folder)
    if info is None:
        vu.log_error(game_id, "info.json missing or invalid")
        return False

    old_ver = info.get("version", "")
    if manual_ver:
        new_ver = manual_ver
    else:
        try:
            new_ver = _bump(old_ver, bump_type)
        except ValueError as exc:
            vu.log_error(game_id, str(exc))
            return False

    today = datetime.date.today().strftime("%Y-%m-%d")

    if new_ver == old_ver:
        vu.log_info(game_id, f"version unchanged ({new_ver}), nothing to do")
        return True

    vu.log_info(game_id, f"{old_ver} -> {new_ver}")

    if dry_run:
        vu.log_dry(f"Would write info.json version: {new_ver}")
        vu.log_dry(f"Would update index.js header: Version {new_ver}, Date {today}")
        vu.log_dry(f"Would prepend ## [{new_ver}] - {today} to CHANGELOG.md")
        if open_changelog:
            vu.log_dry("Would open CHANGELOG.md in the default editor")
        return True

    # info.json
    info["version"] = new_ver
    vu.write_json_atomic(os.path.join(folder, "info.json"), info)

    # index.js header
    src = vu.read_index_js(folder)
    if src is not None:
        new_src = vu.update_index_header(src, version=new_ver, date=today)
        if new_src != src:
            vu.write_index_js(folder, new_src)

    vu.prepend_changelog_entry(folder, new_ver, today)

    if open_changelog:
        changelog_path = os.path.join(folder, "CHANGELOG.md")
        if os.path.exists(changelog_path):
            vu.open_in_default_app(changelog_path)
        else:
            vu.log_info(game_id, "CHANGELOG.md missing, nothing to open")

    return True


def main():
    parser = vu.build_arg_parser(
        "Bump extension version in info.json, index.js header, and CHANGELOG.md",
        with_force=False,
        with_dry_run=True,
        ids_required=True,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--major", action="store_true", help="Bump major segment: 1.2.3 -> 2.0.0"
    )
    group.add_argument(
        "--minor", action="store_true", help="Bump minor segment: 1.2.3 -> 1.3.0"
    )
    group.add_argument(
        "--patch", action="store_true", help="Bump patch segment: 1.2.3 -> 1.2.4"
    )
    group.add_argument(
        "--version", metavar="VER", help="Set explicit version (X.Y.Z semver)"
    )
    parser.add_argument(
        "--open-changelog",
        action="store_true",
        help="Open CHANGELOG.md in the default editor after bumping",
    )
    args = parser.parse_args()

    if args.version and not vu.is_valid_semver(args.version):
        print(f"ERROR: '{args.version}' is not valid semver (X.Y.Z required)")
        sys.exit(1)

    bump_type = "major" if args.major else ("minor" if args.minor else ("patch" if args.patch else None))
    manual_ver = args.version or None
    saved, failed = [], []
    try:
        for folder, game_id, _ in vu.iter_game_folders(args.game_ids):
            try:
                ok = _process(folder, game_id, bump_type, args.dry_run, manual_ver,
                              args.open_changelog)
                (saved if ok else failed).append(game_id)
            except Exception as e:
                vu.log_error(game_id, f"unexpected error: {e}")
                failed.append(game_id)
    except KeyboardInterrupt:
        print("\n\n  Interrupted.")
    finally:
        vu.print_run_summary(saved, failed, [])
    # Explicit IDs that match no extension folder used to print "Saved: 0" and exit
    # 0, so a typo looked exactly like a successful no-op run.
    if args.game_ids and not saved and not failed:
        matched = {gid for _, gid, _ in vu.iter_game_folders(None)}
        unmatched = sorted(set(args.game_ids) - matched)
        if unmatched:
            print(f"\n  ERROR - no extension found for: {', '.join(unmatched)}")
            return 1
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main() or 0)
