#!/usr/bin/env python3
"""
mod_listings.py -- List what is inside a GameBanana or ModWorkshop game's most downloaded mod
archives, so a browser page can be judged against an extension's installers before it is built.

The output JSON (a list of {modId, name, filename, size, files}) is the input replay_installers.js
takes, the same shape modio_listings.py writes.

A zip is read through its central directory with two range requests, whatever its size. Neither
site has a listing endpoint and GameBanana mods are often rar or 7z, which range requests cannot
read, so those are downloaded up to the size limits into a new empty temp folder, listed with
7-Zip's list command, and deleted. Nothing is extracted or run. An archive over a limit, a naked
file, or a read that fails is recorded with "files": null and its reason printed.

Usage:
    python mod_listings.py SITE GAME [--count N] [--max-mb N] [--budget-mb N] [--out FILE]
    python mod_listings.py gamebanana 21179 --count 20
    python mod_listings.py modworkshop mewgenics --out mewgenics.json

Arguments:
    SITE            gamebanana or modworkshop
    GAME            GameBanana game id, or ModWorkshop short_name or numeric id
    --count N       How many mods to list, most downloaded first (default: 20)
    --max-mb N      Largest rar/7z to download, in MB (default: 50)
    --budget-mb N   Total rar/7z download for this run, in MB (default: 300)
    --out FILE      Output JSON path (default: mod_listings_<SITE>_<GAME>.json in the current folder)

Output:
    The game's name and first mods' names, so a wrong game id shows, then one line per mod (entry
    count, or why it could not be listed), a summary, and the JSON file.
    Exit code 0 on success, 1 when the game cannot be found or 7-Zip is missing for a site run.
    A run stopped part-way (Ctrl-C, or the site's mod list failing) still writes the JSON with
    the mods listed so far, then exits 1.

Environment variables:
    SEVENZIP_PATH   (optional, default: C:\\Program Files\\7-Zip\\7z.exe)
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

from vortex_utils import SEVENZIP, http_get_json, zip_listing

GAMEBANANA_API = "https://gamebanana.com/apiv11"
MODWORKSHOP_API = "https://api.modworkshop.net"
ZIP_EXTS = (".zip",)
SAMPLED_EXTS = (".rar", ".7z")
DOWNLOAD_TIMEOUT = 60
CHUNK_BYTES = 1024 * 1024
MB = 1024 * 1024


def gamebanana_mods(game, count):
    """Yield (mod id, name, filename, size, url) for a game's mods, most downloaded first."""
    profile = http_get_json(f"{GAMEBANANA_API}/Game/{game}/ProfilePage")
    yield profile["_sName"]
    seen, page = 0, 1
    while seen < count:
        query = urllib.parse.urlencode({
            "_nPerpage": 50, "_nPage": page, "_aFilters[Generic_Game]": game, "_sSort": "Generic_MostDownloaded",
        })
        records = http_get_json(f"{GAMEBANANA_API}/Mod/Index?{query}").get("_aRecords") or []
        if not records:
            return
        for record in records:
            if seen >= count:
                return
            seen += 1
            files = http_get_json(f"{GAMEBANANA_API}/Mod/{record['_idRow']}/Files") if record.get("_bHasFiles") else []
            if not files:
                yield record["_idRow"], record["_sName"], None, None, None
                continue
            # Newest archive. Authors using Reloaded-II's updater also upload a release metadata .json
            # beside each archive, sometimes newer than it.
            archives = [f for f in files if f["_sFile"].lower().endswith(ZIP_EXTS + SAMPLED_EXTS)]
            newest = max(archives or files, key=lambda f: f.get("_tsDateAdded", 0))
            yield record["_idRow"], record["_sName"], newest["_sFile"], newest.get("_nFilesize"), newest["_sDownloadUrl"]
        page += 1


def modworkshop_mods(game, count):
    """Yield (mod id, name, filename, size, url) for a game's mods, most downloaded first."""
    profile = http_get_json(f"{MODWORKSHOP_API}/games/{game}")
    yield profile["name"]
    seen, page = 0, 1
    while seen < count:
        data = http_get_json(f"{MODWORKSHOP_API}/games/{game}/mods?limit=50&sort=downloads&page={page}")
        if not data["data"]:
            return
        for mod in data["data"]:
            if seen >= count:
                return
            seen += 1
            try:
                file = http_get_json(f"{MODWORKSHOP_API}/mods/{mod['id']}/files/primary")
            except urllib.error.HTTPError:
                # Not every mod has a primary file; its own /download still resolves the first one.
                files = http_get_json(f"{MODWORKSHOP_API}/mods/{mod['id']}/files?limit=1").get("data") or []
                file = files[0] if files else None
            if not file:
                yield mod["id"], mod["name"], None, None, None
                continue
            url = file.get("download_url") or f"{MODWORKSHOP_API}/files/{file['id']}/download"
            yield mod["id"], mod["name"], file.get("file") or file.get("name"), file.get("size"), url
        if page >= data["meta"]["last_page"]:
            return
        page += 1


SITES = {"gamebanana": gamebanana_mods, "modworkshop": modworkshop_mods}


def download_capped(url, dest, limit_bytes):
    """Download to dest, stopping at limit_bytes. Returns the bytes written, or None when over."""
    written = 0
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=DOWNLOAD_TIMEOUT) as response, open(dest, "wb") as out:
        while True:
            chunk = response.read(CHUNK_BYTES)
            if not chunk:
                return written
            written += len(chunk)
            if written > limit_bytes:
                return None
            out.write(chunk)


def seven_zip_listing(archive):
    """Entry names from 7-Zip's list command, in zip form: forward slashes, folders end in '/'."""
    # -p with a dummy keeps an encrypted archive from waiting on a password prompt.
    result = subprocess.run(
        [SEVENZIP, "l", "-ba", "-slt", "-pnone", "--", archive],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
        stdin=subprocess.DEVNULL, timeout=120, check=False,
    )
    if result.returncode != 0:
        return None
    names = []
    for block in result.stdout.split("\n\n"):
        fields = dict(line.split(" = ", 1) for line in block.splitlines() if " = " in line)
        if "Path" not in fields:
            continue
        # rar reports "Folder = +", 7z reports a D in its attributes.
        is_folder = fields.get("Folder") == "+" or "D" in fields.get("Attributes", "")
        name = fields["Path"].replace("\\", "/")
        names.append(name + "/" if is_folder else name)
    return names


class Limits:
    """The per-file cap and the shared budget for rar/7z downloads in one run."""

    def __init__(self, max_mb, budget_mb):
        self.max_bytes = max_mb * MB
        self.left = budget_mb * MB
        self.used = 0

    def refuse(self, size):
        if size and size > self.max_bytes:
            return f"over --max-mb ({size // MB} MB)"
        if self.left <= 0 or (size and size > self.left):
            return "over --budget-mb"
        return None


def sample_listing(url, filename, size, limits, temp_dir):
    """Download one rar/7z, list it and delete it. Returns (files, status)."""
    refused = limits.refuse(size)
    if refused:
        return None, refused
    # A fixed name: the mod's own file name is untrusted and never touches the file system.
    archive = os.path.join(temp_dir, "sample" + os.path.splitext(filename)[1].lower())
    try:
        written = download_capped(url, archive, min(limits.max_bytes, limits.left))
        if written is None:
            return None, "over a size limit while downloading"
        limits.left -= written
        limits.used += written
        files = seven_zip_listing(archive)
        return files, f"{len(files)} entries (7-Zip)" if files is not None else "7-Zip could not read it"
    finally:
        if os.path.exists(archive):
            os.remove(archive)


def list_archive(url, filename, size, limits, temp_dir):
    """Returns (files, status) for one mod file, whichever way its format allows."""
    if not url or not filename:
        return None, "no file"
    ext = os.path.splitext(filename)[1].lower()
    try:
        if ext in ZIP_EXTS:
            files = zip_listing(url)
            if files is not None:
                return files, f"{len(files)} entries"
            return sample_listing(url, filename, size, limits, temp_dir)  # zip64, or mislabelled
        if ext in SAMPLED_EXTS:
            return sample_listing(url, filename, size, limits, temp_dir)
    except urllib.error.HTTPError as err:
        return None, f"HTTP {err.code}"
    except (urllib.error.URLError, TimeoutError, OSError, subprocess.TimeoutExpired) as err:
        return None, f"unreachable ({err})"  # one slow read must not end the run
    except Exception as err:  # a broken archive or reply for one mod must not end the run either
        return None, f"unreadable ({type(err).__name__}: {err})"
    return None, f"not an archive ({ext or 'no extension'})"


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("site", choices=sorted(SITES))
    parser.add_argument("game")
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--max-mb", type=int, default=50)
    parser.add_argument("--budget-mb", type=int, default=300)
    parser.add_argument("--out")
    args = parser.parse_args()
    sys.stdout.reconfigure(errors="replace")  # mod names carry characters a cp1252 console cannot print

    if not os.path.isfile(SEVENZIP):
        sys.exit(f"7-Zip not found at {SEVENZIP} (set SEVENZIP_PATH)")

    mods = SITES[args.site](args.game, args.count)
    try:
        title = next(mods)
    except (urllib.error.HTTPError, KeyError, StopIteration) as err:
        sys.exit(f"{args.site} game '{args.game}' not found ({err})")
    print(f"{title} ({args.site} {args.game}) - listing {args.count} mods")

    limits = Limits(args.max_mb, args.budget_mb)
    results = []
    stopped = None
    out = args.out or f"mod_listings_{args.site}_{args.game}.json"
    try:
        with tempfile.TemporaryDirectory(prefix="mod_listings_") as temp_dir:
            for mod_id, name, filename, size, url in mods:
                files, status = list_archive(url, filename, size, limits, temp_dir)
                results.append({"modId": mod_id, "name": name, "filename": filename, "size": size, "files": files})
                print(f"  {len(results):3} {name[:50]:50} {status}")
    except KeyboardInterrupt:
        stopped = "interrupted"
    except Exception as err:  # the site's mod list itself failed: keep what was listed so far
        stopped = f"mod list request failed ({type(err).__name__}: {err})"
    finally:
        with open(out, "w", encoding="utf-8") as handle:
            json.dump(results, handle, indent=1)
        listed = sum(1 for r in results if r["files"] is not None)
        print(f"Listed {listed}/{len(results)}, downloaded {limits.used // MB} MB of rar/7z. Wrote {out}")
    if stopped:
        sys.exit(f"Stopped early: {stopped}. {out} holds the {len(results)} mods listed before that.")


if __name__ == "__main__":
    main()
