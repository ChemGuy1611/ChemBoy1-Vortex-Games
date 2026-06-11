#!/usr/bin/env python3
"""
deploy_to_vortex.py -- Copy CB1 game extension folder(s) to the Vortex plugins directory.

Usage:
    python deploy_to_vortex.py GAME_ID [GAME_ID ...] [--dry-run] [--force]
    python deploy_to_vortex.py --all [--dry-run] [--force]

Arguments:
    GAME_ID     One or more game IDs (e.g. thelastofuspart2)
    --all       Deploy every game-* extension in the repo
    --dry-run   Preview what would change without copying
    --force     Always do a full folder replace instead of index.js-only update

Environment variables:
    VORTEX_PLUGINS_DIR  Path to the Vortex plugins directory.
                        Default: C:\\ProgramData\\vortex\\plugins
"""

import os
import shutil
import sys

import vortex_utils as vu

PLUGINS_DIR = os.environ.get("VORTEX_PLUGINS_DIR", r"C:\ProgramData\vortex\plugins")


def deploy_game(game_id: str, dry_run: bool, force: bool) -> bool:
    src = os.path.join(vu.REPO_ROOT, f"game-{game_id}")
    if not os.path.isdir(src):
        vu.log_error(game_id, f"source folder not found: {src}")
        return False

    js_src = vu.read_index_js(src)
    game_name = vu.extract_game_name(js_src) if js_src else None
    existing = None if force else vu.find_vortex_plugin_folder(game_id, game_name)
    dest = existing or os.path.join(PLUGINS_DIR, f"game-{game_id}")
    if dry_run:
        if existing:
            vu.log_info(game_id, f"copy index.js -> {existing}")
        else:
            action = "overwrite" if os.path.isdir(dest) else "create"
            vu.log_info(game_id, f"{action} -> {dest}")
            for name in sorted(os.listdir(src)):
                status = "(overwrite)" if os.path.exists(os.path.join(dest, name)) else "(new)"
                print(f"  {name} {status}")
        return True

    if existing:
        src_js = os.path.join(src, "index.js")
        dest_js = os.path.join(existing, "index.js")
        dest_tmp = dest_js + ".tmp"
        shutil.copy2(src_js, dest_tmp)
        os.replace(dest_tmp, dest_js)
        vu.log_info(game_id, f"updated index.js in {os.path.basename(existing)}")
    else:
        if os.path.isdir(dest):
            vu.safe_rmtree(dest, "close Vortex first")
        shutil.copytree(src, dest,
                        ignore=shutil.ignore_patterns("*.bak", "*.tmp"))
        files = os.listdir(dest)
        vu.log_info(game_id, f"deployed to {dest} ({len(files)} files)")
    return True


def main():
    parser = vu.build_arg_parser(
        "Deploy CB1 extension folder(s) to the Vortex plugins directory.",
        ids_required=False,
    )
    parser.add_argument(
        "--all", action="store_true",
        help="Deploy every game-* extension in the repo.",
    )
    args = parser.parse_args()

    if args.all:
        game_ids = vu.list_game_ids()
        if not game_ids:
            print("[ERROR] No game-* folders found in repo.")
            sys.exit(1)
    elif args.game_ids:
        game_ids = args.game_ids
    else:
        parser.error("Provide at least one GAME_ID or use --all.")

    if not os.path.isdir(PLUGINS_DIR):
        print(f"[ERROR] Vortex plugins folder not found: {PLUGINS_DIR}")
        sys.exit(1)

    results = []
    try:
        for gid in game_ids:
            try:
                results.append(deploy_game(gid, dry_run=args.dry_run, force=args.force))
            except Exception as e:
                vu.log_error(gid, f"unexpected error: {e}")
                results.append(False)
    except KeyboardInterrupt:
        print("\n\n  Interrupted.")
        results.append(False)
    if not all(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
