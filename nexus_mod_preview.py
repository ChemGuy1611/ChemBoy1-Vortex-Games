"""
nexus_mod_preview.py

Print a Nexus Mods mod's description and its file list, with the contents of
each file's archive taken from Nexus's content preview. Shows which file ships
which manifest or folder layout without downloading anything, which is what an
extension installer needs to know, and works where the mod page itself refuses
scripted fetches (nexusmods.com answers those with HTTP 403).

When a file has no content preview, or the preview cannot be fetched (Nexus
returns 404 for many files), the archive listing comes from the v2 GraphQL
file index (modFileContents) instead, and the output says so. Some recently
uploaded files are missing from that index too; those print "no listing",
which does not mean the archive is empty.

Usage:
    python nexus_mod_preview.py URL [options]
    python nexus_mod_preview.py DOMAIN MOD_ID [options]
    python nexus_mod_preview.py DOMAIN MOD_ID --archived
    python nexus_mod_preview.py DOMAIN MOD_ID --file ID [--file ID ...]
    python nexus_mod_preview.py DOMAIN MOD_ID --no-desc --no-preview
    python nexus_mod_preview.py DOMAIN MOD_ID --desc-chars N
    python nexus_mod_preview.py DOMAIN MOD_ID --listing OUT.json
    node replay_installers.js GAME_ID OUT.json

Arguments:
    URL          A mod page URL, e.g. https://www.nexusmods.com/railroader/mods/1809
    DOMAIN       Nexus game domain (the URL slug), e.g. railroader
    MOD_ID       Numeric mod id

Options:
    --archived       Include files in the ARCHIVED category (hidden by default).
    --file ID        Only show this file id (shown even if archived). Repeat for several.
    --no-desc        Skip the mod description.
    --no-preview     Skip the archive contents, list files only.
    --desc-chars N   Truncate the description to N characters (default 5000, 0 = all).
    --listing FILE   Also write the archive listings of the shown files to FILE as JSON,
                     a list of {name, filename, files}: the input replay_installers.js
                     reads. A file with no listing is written with "files": null, which
                     replay_installers.js skips. Cannot be combined with --no-preview.

Environment variables:
    NEXUS_API_KEY  Required. Read from env var, with HKCU/HKLM registry fallback.
"""

import argparse
import json
import re
import sys

from vortex_utils import (
    get_api_key,
    nexus_archive_paths,
    nexus_game_id_for_domain,
    nexus_get_mod,
    nexus_get_mod_files,
    parse_nexus_mod_url,
)


def ascii_text(text):
    """Make text safe for a console that cannot print Unicode."""
    return (text or "").encode("ascii", "replace").decode()


def clean_description(text):
    """Turn the API's description (BBCode with HTML line breaks) into readable text."""
    text = re.sub(r"<br\s*/?>", "\n", text or "", flags=re.IGNORECASE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Print a Nexus mod's description and each file's archive contents."
    )
    parser.add_argument("target", nargs="+", help="mod page URL, or DOMAIN MOD_ID")
    parser.add_argument("--archived", action="store_true", help="include ARCHIVED files")
    parser.add_argument(
        "--file", type=int, action="append", default=[], help="only show this file id (repeatable)"
    )
    parser.add_argument("--no-desc", action="store_true", help="skip the mod description")
    parser.add_argument("--no-preview", action="store_true", help="skip the archive contents")
    parser.add_argument(
        "--desc-chars", type=int, default=5000, help="truncate the description (0 = all)"
    )
    parser.add_argument(
        "--listing", metavar="FILE", help="write archive listings as replay_installers.js JSON"
    )
    args = parser.parse_args()
    if args.listing and args.no_preview:
        parser.error("--listing needs the archive contents; drop --no-preview")

    if len(args.target) == 1:
        parsed = parse_nexus_mod_url(args.target[0])
        if not parsed:
            parser.error("not a Nexus mod URL; pass a URL, or DOMAIN MOD_ID")
        domain, mod_id = parsed
    elif len(args.target) == 2 and args.target[1].isdigit():
        domain, mod_id = args.target[0], int(args.target[1])
    else:
        parser.error("pass a mod page URL, or DOMAIN MOD_ID")
    opts = {
        "archived": args.archived,
        "files": set(args.file),
        "desc": not args.no_desc,
        "preview": not args.no_preview,
        "desc_chars": args.desc_chars,
        "listing": args.listing,
    }
    return domain.lower(), mod_id, opts


def main():
    domain, mod_id, opts = parse_args()
    api_key = get_api_key("NEXUS_API_KEY")
    if not api_key:
        sys.exit("NEXUS_API_KEY not found in environment or registry.")

    try:
        mod, _ = nexus_get_mod(domain, mod_id, api_key)
        files = nexus_get_mod_files(domain, mod_id, api_key)
    except Exception as err:
        sys.exit(f"Nexus API error for {domain}/{mod_id}: {err}")

    print(ascii_text(f"{mod.get('name')} | version {mod.get('version')} | by {mod.get('author')}"))
    print(f"https://www.nexusmods.com/{domain}/mods/{mod_id}")

    if opts["desc"]:
        desc = clean_description(mod.get("description"))
        if opts["desc_chars"] and len(desc) > opts["desc_chars"]:
            desc = desc[: opts["desc_chars"]] + "\n[... truncated, --desc-chars 0 for all]"
        print("\n--- Description ---")
        print(ascii_text(desc))

    game_num = None
    if opts["preview"]:
        game_num = mod.get("game_id") or nexus_game_id_for_domain(domain, api_key)

    hidden = 0
    listings = []
    print("\n--- Files ---")
    for entry in files:
        if opts["files"] and entry.get("file_id") not in opts["files"]:
            continue
        if not opts["archived"] and not opts["files"] and entry.get("category_name") == "ARCHIVED":
            hidden += 1
            continue
        print(
            ascii_text(
                f"\n[{entry.get('file_id')}] {entry.get('name')} | {entry.get('version')} | "
                f"{entry.get('category_name')} | {entry.get('file_name')}"
            )
        )
        if entry.get("description"):
            print(ascii_text("  " + clean_description(entry["description"]).replace("\n", " ")))
        if not opts["preview"]:
            continue
        paths, note = nexus_archive_paths(entry, game_num, api_key)
        if note:
            print(ascii_text(f"  ({note})"))
        for item in paths or []:
            print(ascii_text(f"    {item}"))
        listings.append(
            {
                "name": f"{mod_id} [{entry.get('file_id')}] {entry.get('name')} {entry.get('version')}",
                "filename": entry.get("file_name"),
                "files": paths,
            }
        )

    if hidden:
        print(f"\n{hidden} archived file(s) hidden, --archived to show.")

    if opts["listing"]:
        with open(opts["listing"], "w", encoding="utf-8") as fh:
            json.dump(listings, fh, indent=1, ensure_ascii=False)
        missing = sum(1 for item in listings if item["files"] is None)
        print(f"\nWrote {len(listings)} listing(s) to {opts['listing']} ({missing} without a listing).")


if __name__ == "__main__":
    main()
