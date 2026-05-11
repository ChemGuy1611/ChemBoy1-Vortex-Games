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
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import vortex_utils as vu


def _bump(version: str, bump_type: str) -> str:
    parts = version.split(".")
    if len(parts) != 3:
        raise ValueError(f"Unexpected version format: {version!r}")
    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
    if bump_type == "major":
        minor += 1
        patch = 0
    else:
        patch += 1
    return f"{major}.{minor}.{patch}"


_SEMVER = re.compile(r'^\d+\.\d+\.\d+$')


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

    # CHANGELOG.md
    changelog_path = os.path.join(folder, "CHANGELOG.md")
    if os.path.exists(changelog_path):
        with open(changelog_path, "r", encoding="utf-8") as f:
            content = f.read()
        new_section = f"## [{new_ver}] - {today}\n\n- \n\n"
        m = re.search(r"^## \[", content, re.MULTILINE)
        if m:
            content = content[: m.start()] + new_section + content[m.start() :]
        else:
            content = content.rstrip("\n") + "\n\n" + new_section
        vu.write_text_atomic(changelog_path, content)

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

    if args.version and not _SEMVER.match(args.version):
        print(f"ERROR: '{args.version}' is not valid semver (X.Y.Z required)")
        sys.exit(1)

    bump_type = "major" if args.major else ("minor" if args.minor else None)
    manual_ver = args.version or None
    saved, failed = [], []
    for folder, game_id, _ in vu.iter_game_folders(args.game_ids):
        ok = _process(folder, game_id, bump_type, args.dry_run, manual_ver)
        (saved if ok else failed).append(game_id)

    vu.print_run_summary(saved, failed, [])


if __name__ == "__main__":
    main()
