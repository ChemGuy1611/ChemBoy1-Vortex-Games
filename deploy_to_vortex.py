#!/usr/bin/env python3
"""
deploy_to_vortex.py -- Copy CB1 game extension folder(s) to the Vortex plugins directory.

Usage:
    python deploy_to_vortex.py GAME_ID [GAME_ID ...] [--dry-run] [--force] [--restart-vortex]
    python deploy_to_vortex.py --all [--dry-run] [--force] [--restart-vortex]

Arguments:
    GAME_ID     One or more game IDs (e.g. thelastofuspart2)
    --all       Deploy every game-* extension in the repo
    --dry-run   Preview what would change without copying
    --force     Always do a full folder replace instead of updating only
                index.js and any *downloader.js modules
    --restart-vortex
                Close Vortex before copying (graceful taskkill, force-kill
                after 30s) and launch it again (no CLI args) after all copies.
                One close + one launch per run, not per game. Launches Vortex
                even if it was not running. Ignored with --dry-run.

Environment variables:
    (none -- VORTEX_PLUGINS_DIR is read from vortex_utils.VORTEX_PLUGINS_DIR)
"""

import os
import shutil
import subprocess
import sys
import time

import vortex_utils as vu

PLUGINS_DIR = vu.VORTEX_PLUGINS_DIR
VORTEX_IMAGE = "Vortex.exe"


def _vortex_running() -> bool:
    out = subprocess.run(
        ["tasklist", "/FI", f"IMAGENAME eq {VORTEX_IMAGE}", "/NH"],
        capture_output=True, encoding="utf-8", errors="replace",
    )
    return VORTEX_IMAGE.lower() in (out.stdout or "").lower()


def _close_vortex(timeout: int = 30) -> None:
    if not _vortex_running():
        print("Vortex is not running -- nothing to close.")
        return
    print("Closing Vortex...")
    subprocess.run(
        ["taskkill", "/IM", VORTEX_IMAGE],
        capture_output=True, encoding="utf-8", errors="replace",
    )
    deadline = time.time() + timeout
    while time.time() < deadline:
        if not _vortex_running():
            print("Vortex closed.")
            return
        time.sleep(1)
    print(f"Vortex did not exit within {timeout}s -- force-killing.")
    subprocess.run(
        ["taskkill", "/F", "/IM", VORTEX_IMAGE],
        capture_output=True, encoding="utf-8", errors="replace",
    )
    time.sleep(1)


def _start_vortex() -> None:
    exe = vu.find_vortex_exe()
    if not exe:
        print("[WARN] Vortex.exe not found -- skipping launch.")
        return
    print(f"Starting Vortex: {exe}")
    subprocess.Popen([exe], cwd=os.path.dirname(exe))


def deploy_game(game_id: str, dry_run: bool, force: bool) -> bool:
    src = os.path.join(vu.REPO_ROOT, f"game-{game_id}")
    if not os.path.isdir(src):
        vu.log_error(game_id, f"source folder not found: {src}")
        return False

    js_src = vu.read_index_js(src)
    game_name = vu.extract_game_name(js_src) if js_src else None
    existing = None if force else vu.find_vortex_plugin_folder(game_id, game_name)
    dest = existing or os.path.join(PLUGINS_DIR, f"game-{game_id}")
    copy_names = ["index.js"] + sorted(
        n for n in os.listdir(src) if n.endswith("downloader.js")
    )
    if dry_run:
        if existing:
            vu.log_info(game_id, f"copy {', '.join(copy_names)} -> {existing}")
        else:
            action = "overwrite" if os.path.isdir(dest) else "create"
            vu.log_info(game_id, f"{action} -> {dest}")
            for name in sorted(os.listdir(src)):
                status = "(overwrite)" if os.path.exists(os.path.join(dest, name)) else "(new)"
                print(f"  {name} {status}")
        return True

    if existing:
        for name in copy_names:
            src_file = os.path.join(src, name)
            dest_file = os.path.join(existing, name)
            dest_tmp = dest_file + ".tmp"
            try:
                shutil.copy2(src_file, dest_tmp)
                os.replace(dest_tmp, dest_file)
            except PermissionError:
                vu.log_error(game_id, f"{name} locked in {os.path.basename(existing)} -- close Vortex first (or use --restart-vortex)")
                return False
        vu.log_info(game_id, f"updated {', '.join(copy_names)} in {os.path.basename(existing)}")
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
    parser.add_argument(
        "--restart-vortex", action="store_true",
        help="Close Vortex before copying and relaunch it after all copies. Ignored with --dry-run.",
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

    restart = args.restart_vortex and not args.dry_run
    if restart:
        _close_vortex()

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

    if restart:
        _start_vortex()

    if not all(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
