#!/usr/bin/env python3
"""
analyze_vortex_log.py
---------------------
Parses the Vortex runtime log and consolidates entries into a single file
(vortex.analyzed.log) with sections per severity level. Within each section
entries are grouped by hour, newest-first within each bucket. Multi-line entries
(stack traces, JSON blobs) are kept together. The output file lands next to
the source log by default, and the output file is opened on success.

Usage:
    python analyze_vortex_log.py
    python analyze_vortex_log.py LOG_PATH
    python analyze_vortex_log.py [LOG_PATH] [--out-dir DIR] [--levels LEVELS]
    python analyze_vortex_log.py --summary-only
    python analyze_vortex_log.py --dry-run
    python analyze_vortex_log.py --force
    python analyze_vortex_log.py --no-open

Environment variables:
    APPDATA          Standard Windows variable used to locate the fallback log path
                     (%APPDATA%\\Vortex\\vortex.log) when the primary log is absent.

Options:
    LOG_PATH         Path to vortex.log.
                     Default: C:\\ProgramData\\vortex\\vortex.log
                     (falls back to %APPDATA%\\Vortex\\vortex.log).
    --out-dir DIR    Output directory (default: same folder as LOG_PATH).
    --levels LEVELS  Comma-separated levels: DEBUG, INFO, WARN, ERROR.
                     Default: all four.
    --summary-only   Print entry counts and exit without writing files.
    --dry-run        Preview output path and counts without writing.
    --force          Overwrite existing output file.
    --no-open        Do not open the output file after writing.
"""

import argparse
import collections
import os
import pathlib
import re
import sys

from vortex_utils import write_text_atomic, open_in_default_app

_DEFAULT_LOG_PRIMARY  = r"C:\ProgramData\vortex\vortex.log"
_DEFAULT_LOG_FALLBACK = os.path.join(
    os.environ.get("APPDATA", ""), "Vortex", "vortex.log"
)

_ENTRY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\S+(?:Z|[+-]\d{2}:?\d{2}) \[(DEBG|INFO|WARN|ERROR)\] ")
_HOUR_RE  = re.compile(r"^(\d{4}-\d{2}-\d{2})T(\d{2}):")

_USER_TO_TOKEN = {
    "DEBUG": "DEBG",
    "INFO":  "INFO",
    "WARN":  "WARN",
    "ERROR": "ERROR",
}
_DISPLAY_ORDER = ["ERROR", "WARN", "INFO", "DEBG"]
_DISPLAY_LABEL = {"DEBG": "DEBUG", "INFO": "INFO", "WARN": "WARN", "ERROR": "ERROR"}

_SEP = "=" * 80


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


def _out_path(out_dir: pathlib.Path) -> pathlib.Path:
    return out_dir / "vortex.analyzed.log"


def _extract_hour(entry: str) -> str:
    m = _HOUR_RE.match(entry)
    if m:
        return f"{m.group(1)} {m.group(2)}:00"
    return "unknown"


def _parse_log(
    log_path: pathlib.Path, selected_tokens: list[str]
) -> tuple[collections.Counter, dict[str, list[tuple[str, str]]]]:
    counts: collections.Counter = collections.Counter()
    # buckets: token -> list of (hour_key, entry_text)
    buckets: dict[str, list[tuple[str, str]]] = {tok: [] for tok in selected_tokens}
    current_lines: list[str] = []
    current_level: str | None = None

    with open(log_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            m = _ENTRY_RE.match(line)
            if m:
                if current_level is not None:
                    counts[current_level] += 1
                    if current_level in buckets:
                        text = "".join(current_lines)
                        buckets[current_level].append((_extract_hour(text), text))
                current_lines = [line]
                current_level = m.group(1)
            elif current_level is not None:
                current_lines.append(line)

    if current_level is not None:
        counts[current_level] += 1
        if current_level in buckets:
            text = "".join(current_lines)
            buckets[current_level].append((_extract_hour(text), text))

    return counts, buckets


def _build_output(
    log_path: pathlib.Path,
    selected: list[str],
    buckets: dict[str, list[tuple[str, str]]],
    counts: collections.Counter,
) -> str:
    parts: list[str] = []

    total = sum(counts.values())
    count_w = max(len(f"{counts.get(t, 0):,}") for t in _DISPLAY_ORDER)

    # aggregate hour totals across all selected levels
    hour_totals: dict[str, int] = {}
    for tok in selected:
        for hour, _ in buckets[tok]:
            hour_totals[hour] = hour_totals.get(hour, 0) + 1

    # header / TOC
    parts.append(_SEP + "\n")
    parts.append("  Vortex Log Analysis\n")
    parts.append(f"  Source: {log_path}\n")
    parts.append(f"  Total entries: {total:,}\n")
    parts.append(_SEP + "\n\n")

    for tok in _DISPLAY_ORDER:
        label = _DISPLAY_LABEL[tok]
        n = counts.get(tok, 0)
        parts.append(f"  {label:<5}  {n:>{count_w},}\n")

    if hour_totals:
        parts.append("\n  Hour buckets:\n")
        hw = max(len(f"{v:,}") for v in hour_totals.values())
        for hour in sorted(hour_totals, reverse=True):
            parts.append(f"    {hour}   {hour_totals[hour]:>{hw},}\n")

    parts.append("\n")

    # per-severity sections
    for tok in [t for t in _DISPLAY_ORDER if t in selected]:
        entries = buckets[tok]
        if not entries:
            continue
        label = _DISPLAY_LABEL[tok]
        parts.append(_SEP + "\n")
        parts.append(f"  {label}  ({len(entries):,} entries)\n")
        parts.append(_SEP + "\n")

        # group by hour, newest-first within each bucket
        hour_groups: dict[str, list[str]] = {}
        for hour, text in entries:
            if hour not in hour_groups:
                hour_groups[hour] = []
            hour_groups[hour].append(text)

        for hour in sorted(hour_groups, reverse=True):
            group = hour_groups[hour]
            parts.append(f"\n--- {hour} ({len(group):,} entries) ---\n")
            parts.extend(reversed(group))

        parts.append("\n")

    return "".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Consolidate vortex.log into a single file with severity sections and hour grouping."
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
        help="Preview output path without writing",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Overwrite existing output file",
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
        out = _out_path(out_dir)
        if out.exists():
            print(f"[ERROR] Output file already exists (use --force to overwrite):\n  {out}")
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
        out = _out_path(out_dir)
        print(f"[DRY-RUN] Would write to {out}")
        for tok in [t for t in _DISPLAY_ORDER if t in selected]:
            entries = buckets[tok]
            if not entries:
                continue
            hour_groups: dict[str, int] = {}
            for hour, _ in entries:
                hour_groups[hour] = hour_groups.get(hour, 0) + 1
            print(f"  {_DISPLAY_LABEL[tok]} ({len(entries):,} entries)")
            for hour in sorted(hour_groups, reverse=True):
                print(f"    {hour}: {hour_groups[hour]:,}")
        return

    os.makedirs(out_dir, exist_ok=True)
    out = _out_path(out_dir)
    content = _build_output(log_path, selected, buckets, counts)
    write_text_atomic(out, content)

    print(f"[OK] Wrote {out}")

    if not args.no_open:
        open_in_default_app(out)


if __name__ == "__main__":
    main()
