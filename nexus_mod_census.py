"""
nexus_mod_census.py

Count how many mods for one Nexus game ship a given file extension, file name or
folder inside their archives, or mention a term anywhere in their page text.
Answers questions like "how many mods still need tool X" or "how many mods ship an
install.xml" from the Nexus v2 GraphQL indexes, without downloading anything.

Archive terms (--ext, --file, --folder) search the GraphQL file index
(modFileContents) and report matching entries plus distinct mods. That index
serves at most 10,000 results per query, so a term with more entries is split
into mod id ranges until every range fits; totals stay exact.

Text terms (--text) pull every published mod's name, summary and full description
and match a regular expression locally. The server-side description search is
token-based and misses spelling variants ("Open IV" vs "OpenIV"), so it is not used.
A game with more than 20,000 mods needs --allow-large, since the pull is one request
per 160 mods.

Usage:
    python nexus_mod_census.py DOMAIN --ext .rpf [--ext .oiv]
    python nexus_mod_census.py DOMAIN --file install.xml --folder lml
    python nexus_mod_census.py DOMAIN --text "open\\s*-?\\s*iv" --list
    python nexus_mod_census.py DOMAIN --ext .rpf --list --paths 3 --by-year
    python nexus_mod_census.py DOMAIN --text openiv --json OUT.json

Arguments:
    DOMAIN       Nexus game domain (the URL slug), e.g. reddeadredemption2

Options:
    --ext EXT        Archive entries with this extension (leading dot optional, matched
                     lowercase; the index is case-sensitive and stores lowercase). Repeatable.
    --file NAME      Archive entries with this exact file name, case-insensitive. The
                     index ignores "*" wildcards here. Repeatable.
    --folder NAME    Archive entries with a folder of this exact name anywhere in their
                     path. Repeatable.
    --text REGEX     Mods whose name, summary or description matches REGEX
                     (case-insensitive). Repeatable.
    --list           List every matching mod: id, upload date, downloads, name, plus
                     sample archive paths or text snippets.
    --paths N        Sample archive paths per mod in --list and --json (default 2).
    --snippets N     Text snippets per mod in --list and --json (default 2).
    --by-year        Break each term's matching mods down by upload year.
    --json FILE      Write every term's matching mods to FILE as JSON.
    --allow-large    Allow the --text pull for a game with more than 20,000 mods.

Caveats:
    - The file index has no entries for some recently uploaded files, so a mod can
      ship a match the archive terms do not see.
    - The file index covers hidden and removed mods; the mod list does not. Those
      mods count toward archive totals and show as "(not public)" in --list.

Environment variables:
    NEXUS_API_KEY  Optional. Sent when found; every query used here works without it.
"""

import argparse
import collections
import json
import re
import sys
import time

from vortex_utils import get_api_key, nexus_graphql

RESULT_WINDOW = 10000  # modFileContents max_result_window: offset + count past it is an error
CONTENTS_PAGE = 80  # modFileContents caps count at 80
CONTENTS_ALIASES = 25  # pages per request
MODS_PAGE = 40  # mods with full descriptions per page
MODS_ALIASES = 4  # pages per request
LOOKUP_BATCH = 50  # mod ids per OR lookup
LARGE_GAME = 20000
REQUEST_PAUSE = 0.3

CONTENT_FIELDS = {
    "ext": ("fileExtensionExact", "EQUALS"),
    "file": ("fileNameWildcard", "WILDCARD"),
    "folder": ("filePathPartsExact", "EQUALS"),
}

CONTENTS_QUERY_FIELD = (
    "{alias}: modFileContents(filter: $f, offset: {offset}, count: {count}) "
    "{{ totalCount nodes {{ modId filePath }} }}"
)
MOD_FIELDS = "modId name createdAt downloads status"
MODS_TEXT_FIELD = (
    "{alias}: mods(filter: $f, offset: {offset}, count: {count}, "
    "sort: [{{ createdAt: {{ direction: ASC }} }}]) "
    "{{ totalCount nodes {{ " + MOD_FIELDS + " summary description }} }}"
)


def ascii_text(text):
    return str(text).encode("ascii", "replace").decode("ascii")


def progress(msg):
    print(ascii_text(msg), file=sys.stderr, flush=True)


def gql(query, api_key, variables=None, attempts=3):
    """Run a read-only GraphQL query and return its data. Retries transport failures;
    a GraphQL error (HTTP 200 with errors[]) is raised at once."""
    for attempt in range(attempts):
        try:
            response = nexus_graphql(query, api_key, variables)
            break
        except Exception as err:
            if attempt == attempts - 1:
                raise
            progress(f"  request failed ({err}), retrying")
            time.sleep(2 * (attempt + 1))
    if response.get("errors"):
        raise RuntimeError(response["errors"][0].get("message", "GraphQL error")[:400])
    return response["data"]


def game_info(domain, api_key):
    """Return (numeric game id, published mod count, highest mod id) for a domain."""
    query = (
        "query($f: ModsFilter) { mods(filter: $f, count: 1, "
        "sort: [{ createdAt: { direction: DESC } }]) { totalCount nodes { modId game { id } } } }"
    )
    data = gql(query, api_key, {"f": {"gameDomainName": [{"value": domain, "op": "EQUALS"}]}})
    nodes = data["mods"]["nodes"]
    if not nodes:
        return None, 0, 0
    return int(nodes[0]["game"]["id"]), data["mods"]["totalCount"], nodes[0]["modId"]


# --- archive terms ---------------------------------------------------------------


def content_filter(game_num, kind, value, lo, hi):
    field, op = CONTENT_FIELDS[kind]
    flt = {"gameId": [{"value": game_num, "op": "EQUALS"}], field: [{"value": value, "op": op}]}
    bounds = []
    if lo:
        bounds.append({"value": lo, "op": "GTE"})
    if hi is not None:
        bounds.append({"value": hi, "op": "LT"})
    if bounds:
        flt["modId"] = bounds
    return flt


def contents_request(api_key, flt, offsets, count=CONTENTS_PAGE):
    fields = " ".join(
        CONTENTS_QUERY_FIELD.format(alias=f"p{off}", offset=off, count=count) for off in offsets
    )
    query = "query($f: ModFileContentSearchFilter) { " + fields + " }"
    return gql(query, api_key, {"f": flt})


def scan_content(api_key, game_num, max_mod_id, kind, value, sample_paths):
    """Return (entry count, {modId: {"entries": n, "paths": [...]}}) for one archive term.
    Mod id ranges over RESULT_WINDOW entries are halved until each fits."""
    mods = {}
    entries = 0
    ranges = [(0, None)]
    while ranges:
        lo, hi = ranges.pop()
        flt = content_filter(game_num, kind, value, lo, hi)
        first = contents_request(api_key, flt, [0])["p0"]
        total = first["totalCount"]
        if total > RESULT_WINDOW:
            top = hi if hi is not None else max_mod_id + 1
            if top - lo > 1:
                mid = (lo + top) // 2
                ranges += [(mid, hi), (lo, mid)]
                continue
            # one mod alone holds more matches than the window: count it, sample the first page
            offsets = []
        else:
            offsets = list(range(CONTENTS_PAGE, total, CONTENTS_PAGE))
        entries += total
        nodes = list(first["nodes"])
        for start in range(0, len(offsets), CONTENTS_ALIASES):
            batch = offsets[start : start + CONTENTS_ALIASES]
            data = contents_request(api_key, flt, batch)
            for off in batch:
                nodes += data[f"p{off}"]["nodes"]
            time.sleep(REQUEST_PAUSE)
        for node in nodes:
            mod = mods.setdefault(node["modId"], {"entries": 0, "paths": []})
            mod["entries"] += 1
            if len(mod["paths"]) < sample_paths:
                mod["paths"].append(node["filePath"])
        if total:
            progress(f"  {kind} {value}: {entries} entries, {len(mods)} mods so far")
    return entries, mods


def lookup_mods(api_key, game_num, mod_ids):
    """Return {modId: mod fields} for the public mods among mod_ids. Hidden or removed
    mods are absent (an aliased mod() lookup would fail the whole batch on one of them)."""
    found = {}
    ids = sorted(mod_ids)
    query = "query($f: ModsFilter, $n: Int) { mods(filter: $f, count: $n) { nodes { " + MOD_FIELDS + " } } }"
    for start in range(0, len(ids), LOOKUP_BATCH):
        batch = ids[start : start + LOOKUP_BATCH]
        flt = {
            "op": "OR",
            "filter": [
                {
                    "gameId": [{"value": str(game_num), "op": "EQUALS"}],
                    "modId": [{"value": str(mod_id), "op": "EQUALS"}],
                }
                for mod_id in batch
            ],
        }
        for node in gql(query, api_key, {"f": flt, "n": len(batch)})["mods"]["nodes"]:
            found[node["modId"]] = node
        time.sleep(REQUEST_PAUSE)
    return found


# --- text terms ------------------------------------------------------------------


def fetch_all_mods(api_key, domain, total):
    """Pull every published mod with its summary and full description, oldest first."""
    flt = {"gameDomainName": [{"value": domain, "op": "EQUALS"}]}
    mods = []
    offsets = list(range(0, total, MODS_PAGE))
    for start in range(0, len(offsets), MODS_ALIASES):
        batch = offsets[start : start + MODS_ALIASES]
        fields = " ".join(
            MODS_TEXT_FIELD.format(alias=f"p{off}", offset=off, count=MODS_PAGE) for off in batch
        )
        data = gql("query($f: ModsFilter) { " + fields + " }", api_key, {"f": flt})
        for off in batch:
            mods += data[f"p{off}"]["nodes"]
        progress(f"  mod text: {len(mods)}/{total}")
        time.sleep(REQUEST_PAUSE)
    return mods


def plain_text(text):
    """Strip HTML tags and BBCode from a description, collapse whitespace."""
    text = re.sub(r"<[^>]{0,200}>|\[/?[a-z*]+[^\]]{0,200}\]", " ", text or "", flags=re.I)
    return re.sub(r"\s+", " ", text).strip()


def scan_text(all_mods, pattern, max_snippets):
    """Return {modId: {"snippets": [...]}} for mods whose text matches pattern."""
    rx = re.compile(pattern, re.I)
    hits = {}
    for mod in all_mods:
        text = plain_text(" || ".join([mod["name"], mod.get("summary") or "", mod.get("description") or ""]))
        matches = list(rx.finditer(text))
        if matches:
            hits[mod["modId"]] = {
                "snippets": [text[max(0, m.start() - 100) : m.end() + 100] for m in matches[:max_snippets]]
            }
    return hits


# --- output ----------------------------------------------------------------------


def year_breakdown(mod_ids, info):
    years = collections.Counter(
        info[mod_id]["createdAt"][:4] if mod_id in info else "not public" for mod_id in mod_ids
    )
    return ", ".join(f"{year}: {n}" for year, n in sorted(years.items()))


def print_list(term, info):
    def sort_key(item):
        meta = info.get(item[0])
        return (meta is None, meta["createdAt"] if meta else "", item[0])

    for mod_id, hit in sorted(term["mods"].items(), key=sort_key):
        meta = info.get(mod_id)
        if meta:
            head = f"#{mod_id} {meta['createdAt'][:10]} dl {meta['downloads']} | {meta['name']}"
        else:
            head = f"#{mod_id} (not public)"
        print(ascii_text("  " + head))
        for line in hit.get("paths", []) + [f"...{s}..." for s in hit.get("snippets", [])]:
            print(ascii_text("      " + line))


def parse_args():
    parser = argparse.ArgumentParser(
        description="Count a Nexus game's mods by archive contents or page text."
    )
    parser.add_argument("domain", help="Nexus game domain, e.g. reddeadredemption2")
    parser.add_argument("--ext", action="append", default=[], help="archive file extension")
    parser.add_argument("--file", action="append", default=[], help="exact archive file name")
    parser.add_argument("--folder", action="append", default=[], help="exact archive folder name")
    parser.add_argument("--text", action="append", default=[], help="regex over name/summary/description")
    parser.add_argument("--list", action="store_true", help="list every matching mod")
    parser.add_argument("--paths", type=int, default=2, help="sample archive paths per mod")
    parser.add_argument("--snippets", type=int, default=2, help="text snippets per mod")
    parser.add_argument("--by-year", action="store_true", help="break matches down by upload year")
    parser.add_argument("--json", metavar="FILE", help="write matching mods to FILE as JSON")
    parser.add_argument("--allow-large", action="store_true", help="allow --text on a game over 20,000 mods")
    args = parser.parse_args()
    if not (args.ext or args.file or args.folder or args.text):
        parser.error("give at least one --ext, --file, --folder or --text term")
    for pattern in args.text:
        try:
            re.compile(pattern)
        except re.error as err:
            parser.error(f"bad --text regex {pattern!r}: {err}")
    args.domain = args.domain.lower()
    args.ext = ["." + e.lower().lstrip(".") for e in args.ext]
    return args


def main():
    args = parse_args()
    api_key = get_api_key("NEXUS_API_KEY")
    game_num, published, max_mod_id = game_info(args.domain, api_key)
    if game_num is None:
        sys.exit(f"No mods found for domain '{args.domain}' - check the slug.")
    if args.text and published > LARGE_GAME and not args.allow_large:
        sys.exit(
            f"{args.domain} has {published} mods; the --text pull would take "
            f"{published // (MODS_PAGE * MODS_ALIASES) + 1} requests. Re-run with --allow-large."
        )
    print(f"Game: {args.domain} (id {game_num}), {published} published mods")

    terms = []
    for kind in ("ext", "file", "folder"):
        for value in getattr(args, kind):
            entries, mods = scan_content(api_key, game_num, max_mod_id, kind, value, args.paths)
            terms.append({"kind": kind, "value": value, "entries": entries, "mods": mods})

    all_mods = []
    if args.text:
        all_mods = fetch_all_mods(api_key, args.domain, published)
        for pattern in args.text:
            terms.append({"kind": "text", "value": pattern, "mods": scan_text(all_mods, pattern, args.snippets)})

    info = {mod["modId"]: mod for mod in all_mods}
    if args.list or args.by_year or args.json:
        wanted = {mod_id for term in terms for mod_id in term["mods"]} - set(info)
        if wanted:
            info.update(lookup_mods(api_key, game_num, wanted))

    print()
    for term in terms:
        label = f"{term['kind']} {term['value']}"
        if term["kind"] == "text":
            summary = f"{len(term['mods'])} mods (of {published} published)"
        else:
            hidden = sum(1 for mod_id in term["mods"] if mod_id not in info) if info else None
            summary = f"{term['entries']} entries, {len(term['mods'])} mods"
            if hidden:
                summary += f" ({hidden} not public)"
        print(ascii_text(f"{label}: {summary}"))
        if args.by_year and term["mods"]:
            print(ascii_text(f"  by year: {year_breakdown(term['mods'], info)}"))
        if args.list:
            print_list(term, info)

    if args.json:
        out = {"domain": args.domain, "gameId": game_num, "publishedMods": published, "terms": []}
        for term in terms:
            mods = []
            for mod_id, hit in sorted(term["mods"].items()):
                meta = info.get(mod_id, {})
                mods.append(
                    {
                        "modId": mod_id,
                        "name": meta.get("name"),
                        "createdAt": meta.get("createdAt"),
                        "downloads": meta.get("downloads"),
                        "public": bool(meta),
                        **hit,
                    }
                )
            out["terms"].append({k: v for k, v in term.items() if k != "mods"} | {"mods": mods})
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=1)
        print(f"\nWrote {args.json}")


if __name__ == "__main__":
    main()
