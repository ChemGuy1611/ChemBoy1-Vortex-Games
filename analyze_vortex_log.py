#!/usr/bin/env python3
"""
analyze_vortex_log.py
---------------------
Parses the Vortex runtime log and splits entries into per-severity output files.
Multi-line entries (stack traces, JSON blobs) are kept together. Output files
land next to the source log by default, and the folder is opened on success.

Usage:
    python analyze_vortex_log.py
    python analyze_vortex_log.py LOG_PATH
    python analyze_vortex_log.py [LOG_PATH] [--out-dir DIR] [--levels LEVELS]
    python analyze_vortex_log.py --summary-only
    python analyze_vortex_log.py --dry-run

Options:
    LOG_PATH         Path to vortex.log.
                     Default: C:\ProgramData\vortex\vortex.log
                     (falls back to %APPDATA%\Vortex\vortex.log).
    --out-dir DIR    Output directory (default: same folder as LOG_PATH).
    --levels LEVELS  Comma-separated levels: DEBUG, INFO, WARN, ERROR.
                     Default: all four.
    --summary-only   Print entry counts and exit without writing files.
    --dry-run        Preview output paths and counts without writing.
    --force          Overwrite existing output files.
    --no-open        Do not open the output folder after writing.
"""

import argparse
import collections
import os
import pathlib
import re
import sys

_DEFAULT_LOG_PRIMARY  = r"C:\ProgramData\vortex\vortex.log"
_DEFAULT_LOG_FALLBACK = os.path.join(
    os.environ.get("APPDATA", ""), "Vortex", "vortex.log"
)

_ENTRY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\S+Z \[(DEBG|INFO|WARN|ERROR)\] ")

_USER_TO_TOKEN = {
    "DEBUG": "DEBG",
    "INFO":  "INFO",
    "WARN":  "WARN",
    "ERROR": "ERROR",
}
_TOKEN_TO_SUFFIX = {
    "DEBG":  "debug",
    "INFO":  "info",
    "WARN":  "warn",
    "ERROR": "error",
}
_DISPLAY_ORDER = ["DEBG", "INFO", "WARN", "ERROR"]
_DISPLAY_LABEL = {"DEBG": "DEBUG", "INFO": "INFO", "WARN": "WARN", "ERROR": "ERROR"}


def _resolve_log_path(arg: str | None) -> pathlib.Path:
    if arg:
        p = pathlib.Path(arg)
        if not p.exists():
            print(f"[ERROR] Log file not found: {p}", file=sys.stderr)
            sys.exit(1)
        return p
    for candidate in (_DEFAULT_LOG_PRIMARY, _DEFAULT_LOG_FALLBACK):
        p = pathlib.Path(candidate)
        if p.exists():
            return p
    print(
        "[ERROR] Could not find vortex.log.\n"
        f"  Tried: {_DEFAULT_LOG_PRIMARY}\n"
        f"  Tried: {_DEFAULT_LOG_FALLBACK}\n"
        "  Pass LOG_PATH explicitly.",
        file=sys.stderr,
    )
    sys.exit(1)


def _parse_levels(levels_str: str) -> list[str]:
    tokens: list[str] = []
    for part in levels_str.upper().split(","):
        part = part.strip()
        if part not in _USER_TO_TOKEN:
            print(
                f"[ERROR] Unknown level '{part}'. Valid: DEBUG, INFO, WARN, ERROR",
                file=sys.stderr,
            )
            sys.exit(1)
        tok = _USER_TO_TOKEN[part]
        if tok not in tokens:
            tokens.append(tok)
    return tokens


def _out_path(out_dir: pathlib.Path, token: str) -> pathlib.Path:
    return out_dir / f"vortex.{_TOKEN_TO_SUFFIX[token]}.log"


def _parse_log(
    log_path: pathlib.Path, selected_tokens: list[str]
) -> tuple[collections.Counter, dict[str, list[str]]]:
    counts: collections.Counter = collections.Counter()
    buckets: dict[str, list[str]] = {tok: [] for tok in selected_tokens}
    current_lines: list[str] = []
    current_level: str | None = None

    with open(log_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            m = _ENTRY_RE.match(line)
            if m:
                if current_level is not None:
                    counts[current_level] += 1
                    if current_level in buckets:
                        buckets[current_level].append("".join(current_lines))
                current_lines = [line]
                current_level = m.group(1)
            elif current_level is not None:
                current_lines.append(line)

    if current_level is not None:
        counts[current_level] += 1
        if current_level in buckets:
            buckets[current_level].append("".join(current_lines))

    return counts, buckets


def _write_atomic(path: pathlib.Path, entries: list[str]) -> None:
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        for entry in entries:
            f.write(entry)
    os.replace(tmp, path)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Split vortex.log into per-severity output files."
    )
    parser.add_argument(
        "log_path", nargs="?", metavar="LOG_PATH",
        help=r"Path to vortex.log (default: C:\ProgramData\vortex\vortex.log)",
    )
    parser.add_argument(
        "--out-dir", metavar="DIR",
        help="Output directory (default: same folder as LOG_PATH)",
    )
    parser.add_argument(
        "--levels", default="DEBUG,INFO,WARN,ERROR", metavar="LEVELS",
        help="Comma-separated levels to extract (default: DEBUG,INFO,WARN,ERROR)",
    )
    parser.add_argument(
        "--summary-only", action="store_true",
        help="Print entry counts without writing files",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview output paths without writing",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Overwrite existing output files",
    )
    parser.add_argument(
        "--no-open", action="store_true",
        help="Do not open the output folder after writing",
    )
    args = parser.parse_args()

    log_path = _resolve_log_path(args.log_path)
    out_dir  = pathlib.Path(args.out_dir) if args.out_dir else log_path.parent
    selected = _parse_levels(args.levels)

    write_mode = not args.dry_run and not args.summary_only

    if write_mode and not args.force:
        conflicts = [_out_path(out_dir, tok) for tok in selected
                     if _out_path(out_dir, tok).exists()]
        if conflicts:
            print("[ERROR] Output files already exist (use --force to overwrite):")
            for p in conflicts:
                print(f"  {p}")
            sys.exit(1)

    print(f"Parsing {log_path} ...")
    counts, buckets = _parse_log(log_path, selected)
    total = sum(counts.values())

    count_w = max(len(f"{counts.get(t, 0):,}") for t in _DISPLAY_ORDER)
    print(f"\n[OK] Parsed {total:,} entries")
    for tok in _DISPLAY_ORDER:
        print(f"     {_DISPLAY_LABEL[tok]:<5}  {counts.get(tok, 0):>{count_w},}")
    print()

    if args.summary_only:
        return

    if args.dry_run:
        print(f"[DRY-RUN] Would write {len(selected)} file(s) to {out_dir}")
        for tok in selected:
            n = len(buckets[tok])
            print(f"  {_out_path(out_dir, tok)}  ({n:,} entries)")
        return

    os.makedirs(out_dir, exist_ok=True)
    written: list[tuple[pathlib.Path, str]] = []
    for tok in selected:
        p = _out_path(out_dir, tok)
        _write_atomic(p, buckets[tok])
        written.append((p, tok))

    print(f"[OK] Wrote {len(written)} file(s) to {out_dir}")
    for p, tok in written:
        print(f"  {p}  ({len(buckets[tok]):,} entries)")

    if not args.no_open:
        os.startfile(out_dir)


if __name__ == "__main__":
    main()
