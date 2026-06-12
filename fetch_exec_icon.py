#!/usr/bin/env python3
"""
fetch_exec_icon.py
------------------
Finds all game-* extension folders missing their exec.png icon and downloads
it from the Steam CDN (64x64 PNG) with SteamGridDB icon as fallback.

Usage:
    python fetch_exec_icon.py
    python fetch_exec_icon.py GAME_ID [GAME_ID ...]
    python fetch_exec_icon.py --dry-run
    python fetch_exec_icon.py --force
    python fetch_exec_icon.py --retry-failed
    python fetch_exec_icon.py --concurrency 4

Options:
    GAME_ID          One or more game IDs to process. Omit to process all.
    --dry-run        List missing exec.png files without downloading anything.
    --force          Re-download exec.png even if it already exists.
    --concurrency N  Max parallel download workers (default: 8).
    --retry-failed   Automatically retry failed downloads once after the main pass.

Requirements:
    pip install Pillow
Environment variables:
    STEAMGRIDDB_API_KEY  (optional, consumed by vortex_utils.download_exec_icon;
                         used as fallback icon source when the Steam CDN has no icon)
"""

import os

from vortex_utils import (
    iter_steam_image_targets, run_concurrent_batch,
    download_exec_icon, print_run_summary, normalize_target_ids,
    build_arg_parser,
)


# ── Core logic ────────────────────────────────────────────────────────────────

def fetch_all(target_game_ids=None, dry_run=False, force=False,
              concurrency=8, retry_failed=False):
    saved = []
    failed = []
    skipped = []

    targets = list(iter_steam_image_targets(
        target_game_ids, force,
        target_path_fn=lambda folder, game_id: os.path.join(folder, "exec.png"),
    ))
    if not targets:
        print("No missing exec.png files found.")
        return

    if dry_run:
        for folder, game_id, steamapp_id, game_name in targets:
            print(f"  MISSING  [{game_id}]  (Steam {steamapp_id})")
        return

    def _download_one(item):
        folder, game_id, steamapp_id, game_name = item
        out_path = os.path.join(folder, "exec.png")
        try:
            ok, source = download_exec_icon(steamapp_id, game_name or game_id, out_path)
            return game_id, "ok" if ok else "fail", source
        except Exception as e:
            return game_id, "error", str(e)

    results = run_concurrent_batch(targets, _download_one, max_workers=concurrency)

    for _, game_id, steamapp_id, game_name in targets:
        if game_id not in results:
            continue
        _, status, detail = results[game_id]
        label = f"[{game_id}]"
        if status == "ok":
            print(f"\n{label}\n  Saved: {detail}")
            saved.append(game_id)
        elif status == "fail":
            print(f"\n{label}\n  FAILED -- add exec.png manually (64x64 PNG)")
            failed.append(game_id)
        elif status == "error":
            print(f"\n{label}\n  ERROR - {detail}")
            failed.append(game_id)

    if retry_failed and failed:
        print(f"\n  Retrying {len(failed)} failed download(s)...")
        retry_ids = set(failed)
        retry_targets = [t for t in targets if t[1] in retry_ids]
        failed.clear()
        retry_results = run_concurrent_batch(retry_targets, _download_one, max_workers=concurrency)
        for _, game_id, _steamapp_id, _game_name in retry_targets:
            if game_id not in retry_results:
                continue
            _, status, detail = retry_results[game_id]
            if status == "ok":
                saved.append(game_id)
            elif status in ("fail", "error"):
                failed.append(game_id)

    print_run_summary(saved, failed, skipped)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = build_arg_parser(
        "Download missing exec.png icons for Vortex game extensions.",
        ids_required=False, dest="game",
    )
    parser.add_argument(
        "--concurrency", type=int, default=8, metavar="N",
        help="Max parallel download workers (default: 8).",
    )
    parser.add_argument(
        "--retry-failed", action="store_true",
        help="Automatically retry failed downloads once after the main pass.",
    )
    args = parser.parse_args()
    fetch_all(
        target_game_ids=normalize_target_ids(args.game),
        dry_run=args.dry_run,
        force=args.force,
        concurrency=args.concurrency,
        retry_failed=args.retry_failed,
    )


if __name__ == "__main__":
    main()
