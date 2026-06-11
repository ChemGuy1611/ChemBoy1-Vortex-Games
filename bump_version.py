"""
bump_version.py

Bump the version of one or more Vortex game extensions.
Updates info.json, the index.js header comment, and prepends a new section
to CHANGELOG.md.

Usage:
    python bump_version.py --major GAME_ID [GAME_ID ...]
    python bump_version.py --minor GAME_ID [GAME_ID ...]
    python bump_version.py --version 1.2.3 GAME_ID [GAME_ID ...]
    python bump_version.py --major GAME_ID --dry-run

Options:
    --major          Bump minor segment: 0.3.0 -> 0.4.0 (resets patch to 0)
    --minor          Bump patch segment: 0.3.0 -> 0.3.1
    --version VER    Set explicit semver version (X.Y.Z)
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
             manual_ver: str | None = None) -> bool:
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
        "--major", action="store_true", help="Bump minor segment: 0.3.0 -> 0.4.0"
    )
    group.add_argument(
        "--minor", action="store_true", help="Bump patch segment: 0.3.0 -> 0.3.1"
    )
    group.add_argument(
        "--version", metavar="VER", help="Set explicit version (X.Y.Z semver)"
    )
    args = parser.parse_args()

    if args.version and not vu.is_valid_semver(args.version):
        print(f"ERROR: '{args.version}' is not valid semver (X.Y.Z required)")
        sys.exit(1)

    bump_type = "major" if args.major else ("minor" if args.minor else None)
    manual_ver = args.version or None
    saved, failed = [], []
    try:
        for folder, game_id, _ in vu.iter_game_folders(args.game_ids):
            try:
                ok = _process(folder, game_id, bump_type, args.dry_run, manual_ver)
                (saved if ok else failed).append(game_id)
            except Exception as e:
                vu.log_error(game_id, f"unexpected error: {e}")
                failed.append(game_id)
    except KeyboardInterrupt:
        print("\n\n  Interrupted.")
    finally:
        vu.print_run_summary(saved, failed, [])


if __name__ == "__main__":
    main()
