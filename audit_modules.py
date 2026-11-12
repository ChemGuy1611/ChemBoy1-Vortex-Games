#!/usr/bin/env python3
"""
audit_modules.py

Mechanical layer for the browser and downloader module audit. Read-only: it never edits an
extension, regenerates a list or decides anything. Two questions:

Are the bundled modules at parity? Every copy of a shared module in a game-*, template-* or
helper-* folder is compared against its canonical file in resources/downloader/ or
resources/browsers/ by md5. A copy listed in MODULE_COPY_EXCEPTIONS must differ only in the way
its entry allows, so the exception cannot hide a missed propagation wave. Then the wiring: bundled
but never required, required but not bundled, a source browser without base_browser.js (or the
reverse), a destructured name the module does not export, a browser page missing its register or
once call, a template_*.js snippet out of step with its module, and a games-downloader*.txt list
that disagrees with the disk. zCustomGames and zArchive are out of scope.

Which extensions could gain a module? --sites looks each extension up on the mod sites that have a
browser module and reports every match with its size, most mods first. There is no cutoff: rows
below the THIN_* limits stay listed, marked thin, and rows at exactly zero fold into one list.
Matching is by store id first where the site publishes one (Thunderstore, mod.io, ModWorkshop),
then exact normalised name, then GAME_NAME_SHORT ("short", which can be an older game of that name).
ModDB publishes neither, so its slug is derived from the game name and checked against the feed
title; a "slug" match means the title differed and the page may be another game ("games/doom" is
the 1993 one).
Past decisions live in CANDIDATE_DECLINED, printed apart from the candidates. The downloader half
is offline and always runs: a live direct-asset URL, or a browse-for-download route, is a
requirement fetched by hand that a downloader module could take over. A bare releases page is a
link rather than a download and is not counted. Upstreams in HAND_ROLLED_EXCLUDED stay hand-rolled
by decision: they print as one line with their extension count and leave the candidate groups.

--loose adds a fuzzy name pass on the name-matching sites. Its hits are candidates only: "RuneScape:
Dragonwilds" matched mod.io's classic "RuneScape", a different game.

Keyless throughout: mod.io's website endpoint (https://mod.io/v1 with X-Modio-Origin: web), the
Thunderstore ecosystem schema, ModWorkshop /games, GameBanana apiv11 and rss.moddb.com.

Usage:
    python audit_modules.py                       # parity + wiring + downloader scan, offline
    python audit_modules.py --sites               # + every site, a few minutes
    python audit_modules.py --sites modio moddb   # + the named sites only
    python audit_modules.py --sites --loose       # + fuzzy name candidates
    python audit_modules.py --sites --adopted     # + list rows that already bundle the browser
    python audit_modules.py --json FILE           # also write the whole report as JSON

Arguments:
    --sites [SITE ...]  thunderstore, modio, modworkshop, gamebanana, moddb, fcmodding; none = all
    --loose             Also list fuzzy name matches (containment or similarity >= 0.85)
    --adopted           Print the rows for extensions that already bundle that site's browser
    --json FILE         Write parity problems, downloader candidates and site rows as JSON

Output:
    A parity section (one line per module, then every problem), the hand-rolled downloader
    candidates grouped by upstream, and with --sites one table per site. "thin" marks a row under
    THIN_MODS mods, or under THIN_FILES_PER_MONTH on ModDB, whose unit is files per month since the
    oldest of the feed's newest items (MODDB_RATE_FLOOR_DAYS at least). The feed holds ten items, so
    3.33 is the ceiling: ten files inside 90 days, which one author's burst of variants can reach
    as easily as a busy scene. For mod.io, "dl auth" means anonymous downloads are off,
    which a browser page needs.

Exit code 1 on any parity or wiring problem, 0 otherwise. Candidates never fail the run.

Environment variables:
    none
"""

import argparse
import difflib
import email.utils
import glob
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse

from vortex_utils import (
    DEPRECATED_GAMES, LISTS_DIR, NEVER_UPLOAD_GAMES, REPO_ROOT,
    http_get, http_get_json, normalize_game_name, read_id_list, read_index_js,
    roman_to_arabic, run_concurrent_batch, strip_js_comments,
)

DOWNLOADER_DIR = os.path.join(REPO_ROOT, "resources", "downloader")
BROWSER_DIR = os.path.join(REPO_ROOT, "resources", "browsers")
SCOPE_PREFIXES = ("game-", "template-", "helper-")

THIN_MODS = 10
THIN_FILES_PER_MONTH = 1.0
SITE_WORKERS = 4

ALL_SITES = ("thunderstore", "modio", "modworkshop", "gamebanana", "moddb", "fcmodding")

MODIO_API = "https://mod.io/v1"
MODIO_HEADERS = {"X-Modio-Origin": "web"}
MODIO_DIRECT_DOWNLOADS = 2  # api_access_options bit: binary_url works without authentication
THUNDERSTORE_SCHEMA = "https://thunderstore.io/api/experimental/schema/dev/latest/"
# The listing count, not the community record's total_package_count: that total reads 0 for
# communities whose listing holds packages.
THUNDERSTORE_LISTING = "https://thunderstore.io/api/cyberstorm/listing/{}/?page_size=1"
MODWORKSHOP_GAMES = "https://api.modworkshop.net/games?limit=50&page={}"
GAMEBANANA_NAME_MATCH = "https://gamebanana.com/apiv11/Util/Game/NameMatch?_nPerpage=50&_nPage=1&_sName={}"
GAMEBANANA_PROFILE = "https://gamebanana.com/apiv11/Game/{}/ProfilePage"
MODDB_FEED = "https://rss.moddb.com/games/{}/downloads/feed/rss.xml"
MODDB_RATE_FLOOR_DAYS = 90  # one file posted yesterday must not read as 30 files a month
FARCRY_LIST = os.path.join(LISTS_DIR, "games-farcrygame.txt")

STEAM_ID_RE = re.compile(r"""\bSTEAMAPP_ID\w*\s*=\s*["'](\d+)["']\s*;?""")
EPIC_ID_RE = re.compile(r"""\bEPICAPP_ID\w*\s*=\s*["']([0-9a-fA-F]{32})["']\s*;?""")
# Closes on the quote that opened it, so the apostrophe in "Assassin's Creed" stays in the name.
GAME_NAME_RE = re.compile(r"""\b(GAME_NAME\w*)\s*=\s*(["'`])((?:\\.|(?!\2).)+)\2\s*;?""")
STEAM_URL_RE = re.compile(r"store\.steampowered\.com/app/(\d+)")
EXPORTS_RE = re.compile(r"^module\.exports\s*=\s*\{(.*?)^\}\s*;?", re.M | re.S)
EXPORT_KEY_RE = re.compile(r"^\s*(\w+)\s*(?::|,|$)", re.M)
NORMALIZER_FN_RE = re.compile(r"^function normalize(?:Frosty)?Version\(", re.M)
COMPARABLE_FN = "function toComparableVersion(version) {"

# Direct-asset URL shapes per host. A bare page link is left out on purpose: it sits behind an
# "Open <host> Page" button or an error fallback and fetches nothing.
HAND_ROLLED_HOSTS = (
    ("github", "downloader.js",
     re.compile(r"""github\.com/([^/"'`\s]+/[^/"'`\s]+)/releases/(latest/)?download/[^"'`\s]+""")),
    ("codeberg", "codeberg_downloader.js",
     re.compile(r"""codeberg\.org/([^/"'`\s]+/[^/"'`\s]+)/(?:releases/download|attachments)/()[^"'`\s]+""")),
    ("gamebanana", "gamebanana_downloader.js",
     re.compile(r"""(gamebanana\.com)/dl/()\d+|(?:files\.)(gamebanana\.com)/()[^"'`\s]+""")),
    ("moddb", "moddb_downloader.js",
     re.compile(r"""(moddb\.com)/[^"'`\s]*downloads/start()[^"'`\s]*""")),
    ("thunderstore", "thunderstore_downloader.js",
     re.compile(r"""thunderstore\.io/package/download/([^/"'`\s]+/[^/"'`\s]+)/()[^"'`\s]*""")),
    ("modworkshop", "modworkshop_downloader.js",
     re.compile(r"""(?:api|storage)\.(modworkshop\.net)/[^"'`\s]*(?:download|files)()[^"'`\s]*""")),
    ("fcmodding", "fcmodding_downloader.js",
     re.compile(r"""downloads\.(fcmodding\.com)/()[^"'`\s]+\.(?:zip|7z|rar|exe)""")),
)
TEMPLATE_VAR_RE = re.compile(r"\$\{(\w+)\}")

# ModDB slugs a game's name cannot produce, confirmed live by the 2026-08-29 screen.
MODDB_SLUG_OVERRIDES = {
    "game-civilisationvi": "civilization-vi",
    "game-godofwar": "god-of-war-2018",
    "game-sacred2remaster": "sacred-2-fallen-angel",
    "game-warhammer40000spacemarine": "warhammer-40000-space-marine",
    "game-warhammer40kdarktide": "warhammer-40000-darktide",
}

# Decisions already made. These rows print under "Declined" so a re-run does not raise them again
# as new, while staying visible if the facts change.
CANDIDATE_DECLINED = {
    ("game-mywintercar", "thunderstore"): "user declined the bundle, 2026-09-20",
    ("game-mewgenics", "thunderstore"): "community was empty; page replaced by ModWorkshop",
    ("game-painkiller", "moddb"): "2026 reboot; games/painkiller is the classic game",
    ("game-doom", "moddb"): "its slug doom-4 is dead; the active games/doom is the 1993 game",
    ("game-silenthill2", "moddb"): "2024 remake; the slug is the 2001 game",
    ("game-runescapedragonwilds", "modio"): "mod.io's RuneScape is the classic game, Steam 1343400",
    ("game-bloodborne", "moddb"): "whole feed is variants of a few mods posted within days, not a scene",
    ("game-residentevilrequiem", "moddb"): "whole feed is variants of one mod posted the same day, not a scene",
    ("game-civilizationvii", "moddb"): "only 3 files in the feed",
    ("game-hollowknight", "thunderstore"): "fuzzy hit on Hollow Knight: Silksong's community",
    ("game-hades", "thunderstore"): "fuzzy hit on Hades II's community",
    ("game-starsandisland", "thunderstore"): "fuzzy hit on Starsand, a different game",
    ("game-fatekeeper", "thunderstore"): "fuzzy hit on Gatekeeper, a different game",
    ("game-control", "thunderstore"): "fuzzy hit on SUPERHOT: MIND CONTROL DELETE, a different game",
    ("game-finalfantasy16", "modworkshop"): "fuzzy hit on the Final Fantasy XV section",
    ("game-farcry3", "gamebanana"): "maps and saves, nothing the Mod Installer takes",
    ("game-farcry5", "gamebanana"): "user maps, nothing the Mod Installer takes",
    ("game-batmanarkhamcity", "gamebanana"): "TexMod .tpf files, which the game does not read",
    ("game-batmanarkhamorigins", "gamebanana"): "TexMod .tpf files, which the game does not read",
    ("game-hollowknight", "gamebanana"): "mostly Switch-port skins",
    ("game-monsterhunterrise", "gamebanana"): "almost all Switch-port mods",
    ("game-reddeadredemption", "gamebanana"): "nearly half are Switch patches, which install nothing useful on PC",
}

# Upstreams left out of the downloader candidates by user decision: the fetch stays hand-rolled on
# purpose. Their extensions still print as a count, so the exclusion stays visible.
HAND_ROLLED_EXCLUDED = {
    "praydog/REFramework-nightly": "nightly tags carry no version and move every build",
    "Reloaded-Project/Reloaded-II": "the mod manager updates itself",
    "CadeEvs/FrostyToolsuite": "user declined the move to downloader.js, 2026-11-11",
    "Dyvinia/DatapathFixPlugin": "user declined the move to downloader.js, 2026-11-11",
}


def veilguard_copy_is_frosty_only(canonical, copy):
    """True if the copy equals canonical apart from the normalizer swap.

    Same splice the propagation recipe uses: blank the region from the normalizer's leading
    comment through toComparableVersion's opening line, undo the one call-site swap, compare."""
    def body(text):
        match = NORMALIZER_FN_RE.search(text)
        end = text.find(COMPARABLE_FN)
        if not match or end < 0:
            return None
        start = match.start()
        # Walk back over the comment block sitting directly above the function.
        lines_before = text[:start].splitlines(keepends=True)
        while lines_before and lines_before[-1].startswith("//"):
            start -= len(lines_before.pop())
        return text[:start] + text[end:]

    left, right = body(canonical), body(copy)
    if left is None or right is None:
        return False
    return left == right.replace("normalizeFrostyVersion(raw)", "normalizeVersion(raw)")


# (folder, module) -> (reason, predicate(canonical_text, copy_text)). A copy failing its predicate
# is a problem like any other divergence.
MODULE_COPY_EXCEPTIONS = {
    ("game-dragonagetheveilguard", "downloader.js"): (
        "Frosty date tags, normalizeFrostyVersion swapped in for normalizeVersion",
        veilguard_copy_is_frosty_only,
    ),
}


def read_text(path):
    with open(path, encoding="utf-8", errors="replace", newline="") as handle:
        return handle.read().replace("\r\n", "\n")


def md5_of(path):
    with open(path, "rb") as handle:
        return hashlib.md5(handle.read()).hexdigest()


def canonical_modules():
    """{file name: canonical path} for every shared module, template_* snippets excluded."""
    found = {}
    for pattern in (os.path.join(DOWNLOADER_DIR, "*downloader.js"), os.path.join(BROWSER_DIR, "*browser.js")):
        for path in glob.glob(pattern):
            name = os.path.basename(path)
            if not name.startswith("template_"):
                found[name] = path
    return found


def scope_folders():
    """Yield (folder name, path) for every game-*, template-* and helper-* folder with an index.js."""
    for entry in sorted(os.listdir(REPO_ROOT)):
        path = os.path.join(REPO_ROOT, entry)
        if entry.startswith(SCOPE_PREFIXES) and os.path.isfile(os.path.join(path, "index.js")):
            yield entry, path


def is_frozen(folder_name):
    return folder_name.startswith("game-") and folder_name[len("game-"):] in DEPRECATED_GAMES


def module_exports(text):
    """Top-level keys of a module's module.exports object, or None when it has none."""
    match = EXPORTS_RE.search(strip_js_comments(text))
    return set(EXPORT_KEY_RE.findall(match.group(1))) if match else None


def required_names(stripped_src, module_name):
    """(is required, destructured export names) for ./module_name in comment-stripped source."""
    stem = re.escape(module_name[:-len(".js")])
    required = re.search(r"""require\(\s*["']\./%s(?:\.js)?["']\s*\)""" % stem, stripped_src) is not None
    names = set()
    pattern = r"""(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\(\s*["']\./%s(?:\.js)?["']\s*\)\s*;?""" % stem
    for match in re.finditer(pattern, stripped_src):
        for entry in match.group(1).split(","):
            key = entry.split(":")[0].strip()
            if key:
                names.add(key)
    return required, names


def check_copies(modules):
    """Compare every bundled copy against canonical. Returns (per-module rows, problems, excepted)."""
    rows, problems, excepted = [], [], []
    for name, canonical_path in sorted(modules.items()):
        canonical_md5 = md5_of(canonical_path)
        total = same = 0
        for folder, path in scope_folders():
            copy_path = os.path.join(path, name)
            if not os.path.isfile(copy_path):
                continue
            total += 1
            if md5_of(copy_path) == canonical_md5:
                same += 1
                continue
            exception = MODULE_COPY_EXCEPTIONS.get((folder, name))
            if is_frozen(folder):
                excepted.append(f"{folder}/{name}: frozen, deprecated extension")
            elif exception and exception[1](read_text(canonical_path), read_text(copy_path)):
                excepted.append(f"{folder}/{name}: {exception[0]}")
            elif exception:
                problems.append(f"{folder}/{name}: differs beyond its exception ({exception[0]})")
            else:
                problems.append(f"{folder}/{name}: differs from canonical")
        rows.append({"module": name, "copies": total, "identical": same})
    return rows, problems, excepted


def check_wiring(modules):
    """Bundled vs required, base pairing, export names and browser register/once calls."""
    problems = []
    exports = {name: module_exports(read_text(path)) for name, path in modules.items()}
    source_browsers = [m for m in modules if m.endswith("_browser.js") and m != "base_browser.js"]

    for folder, path in scope_folders():
        stripped = strip_js_comments(read_index_js(path) or "")
        for name in modules:
            if name == "base_browser.js":  # required by the source module, never by index.js
                continue
            bundled = os.path.isfile(os.path.join(path, name))
            required, destructured = required_names(stripped, name)
            if bundled and not required:
                problems.append(f"{folder}: bundles {name} but index.js never requires it")
            if required and not bundled:
                problems.append(f"{folder}: requires ./{name} but does not bundle it")
            if required and exports[name] is not None:
                for missing in sorted(destructured - exports[name]):
                    problems.append(f"{folder}: destructures {missing} from {name}, which does not export it")
            if required and name in source_browsers:
                for prefix in ("register", "once"):
                    wanted = sorted(n for n in destructured if n.startswith(prefix) and n.endswith("Browser"))
                    called = [n for n in wanted if re.search(r"\b%s\s*\(" % n, stripped)]
                    if not called:
                        problems.append(f"{folder}: {name} required but no {prefix}*Browser call")

        carried = [m for m in source_browsers if os.path.isfile(os.path.join(path, m))]
        has_base = os.path.isfile(os.path.join(path, "base_browser.js"))
        if carried and not has_base:
            problems.append(f"{folder}: bundles {carried[0]} without base_browser.js (fails at require time)")
        if has_base and not carried:
            problems.append(f"{folder}: bundles base_browser.js with no source browser module")
    return problems


def check_template_snippets(modules):
    """Each resources/*/template_*.js must only import what its module exports."""
    problems = []
    exports = {name: module_exports(read_text(path)) for name, path in modules.items()}
    for directory in (DOWNLOADER_DIR, BROWSER_DIR):
        for path in sorted(glob.glob(os.path.join(directory, "template_*.js"))):
            stripped = strip_js_comments(read_text(path))
            for name in modules:
                required, destructured = required_names(stripped, name)
                if required and exports[name] is not None:
                    for missing in sorted(destructured - exports[name]):
                        problems.append(f"{os.path.basename(path)}: imports {missing}, not exported by {name}")
    return problems


def check_lists(modules):
    """games-downloader*.txt vs the disk. Read-only: categorize_games.py is what regenerates them."""
    problems = []
    for name in sorted(modules):
        if not name.endswith("downloader.js"):
            continue
        stem = name[:-len("downloader.js")].rstrip("_")
        list_name = f"games-downloader-{stem}.txt" if stem else "games-downloader.txt"
        list_path = os.path.join(LISTS_DIR, list_name)
        if not os.path.isfile(list_path):
            problems.append(f"{list_name}: missing, {name} has no adopter list")
            continue
        listed = set(read_id_list(list_path))
        on_disk = {folder[len("game-"):] for folder, path in scope_folders()
                   if folder.startswith("game-") and os.path.isfile(os.path.join(path, name))}
        for game in sorted(on_disk - listed):
            problems.append(f"{list_name}: {game} bundles {name} but is not listed")
        for game in sorted(listed - on_disk):
            problems.append(f"{list_name}: {game} is listed but does not bundle {name}")
    return problems


def resolve_template_vars(text, stripped_src):
    """Fill ${NAME} from a plain string const in the same file; unknown names stay as written."""
    def replace(match):
        const = re.search(r"""\b%s\s*=\s*["'`]([^"'`$]+)["'`]\s*;?""" % match.group(1), stripped_src)
        return const.group(1) if const else match.group(0)
    return TEMPLATE_VAR_RE.sub(replace, text)


def scan_hand_rolled():
    """Live direct-asset URLs and browse-for-download routes a downloader module could replace."""
    urls, browse = [], []
    for folder, path in scope_folders():
        if folder.startswith("helper-") or is_frozen(folder):
            continue
        stripped = strip_js_comments(read_index_js(path) or "")
        for host, module, pattern in HAND_ROLLED_HOSTS:
            seen = set()
            for match in pattern.finditer(stripped):
                groups = [g for g in match.groups() if g is not None]
                upstream = resolve_template_vars(groups[0], stripped) if groups else host
                latest = len(groups) > 1 and bool(groups[1])
                entry = (upstream, latest)
                if entry in seen:
                    continue
                seen.add(entry)
                urls.append({
                    "extension": folder,
                    "host": host,
                    "upstream": upstream,
                    "kind": "latest" if latest else "pinned",
                    "has_module": os.path.isfile(os.path.join(path, module)),
                })
        if "browse-for-download" in stripped:
            browse.append(folder)
    return urls, browse


def squash(name):
    """Name key for exact matching: normalised, Arabic numerals, then letters and digits only."""
    return re.sub(r"[^a-z0-9]", "", roman_to_arabic(normalize_game_name(name.replace("&", "and"))).lower())


def load_extensions():
    """Identity of every released-or-not, non-frozen game extension."""
    extensions = []
    for folder, path in scope_folders():
        if not folder.startswith("game-") or is_frozen(folder):
            continue
        src = read_index_js(path) or ""
        names, short_names = set(), set()
        for const, _, value in GAME_NAME_RE.findall(src):
            (short_names if "SHORT" in const else names).add(value.replace("\\", ""))
        extensions.append(
            {
                "folder": folder,
                "path": path,
                "steam": set(STEAM_ID_RE.findall(src)),
                "epic": set(EPIC_ID_RE.findall(src)),
                "names": names,
                "short_names": short_names - names,
            }
        )
    return extensions


def loose_ratio(ext, site_name):
    """Best fuzzy score against an extension's names, or None. Candidates only, never a match."""
    key = squash(site_name)
    if len(key) < 5:
        return None
    best = None
    for name in ext["names"]:
        other = squash(name)
        if len(other) < 5:
            continue
        ratio = difflib.SequenceMatcher(None, other, key).ratio()
        contained = len(min(other, key, key=len)) >= 7 and (other in key or key in other)
        if (contained or ratio >= 0.85) and (best is None or ratio > best):
            best = ratio
    return best


def match_extension(ext, site_name, steam=frozenset(), epic=frozenset(), loose=False):
    """How an extension matches a site's game record: steam, epic, name, short, loose N or None.

    "short" is an exact hit on GAME_NAME_SHORT only. It drops the subtitle or edition, so it can be
    an older game of the same name."""
    if steam & ext["steam"]:
        return "steam"
    if epic & ext["epic"]:
        return "epic"
    key = squash(site_name)
    if any(squash(name) == key for name in ext["names"]):
        return "name"
    if any(squash(name) == key for name in ext["short_names"]):
        return "short"
    if loose:
        ratio = loose_ratio(ext, site_name)
        if ratio is not None:
            return f"loose {ratio:.2f}"
    return None


def make_row(site, ext, key, site_name, count, unit, match, note=""):
    limit = THIN_FILES_PER_MONTH if unit == "files/mo" else THIN_MODS
    notes = [note] if note else []
    game = ext["folder"][len("game-"):]
    if game in NEVER_UPLOAD_GAMES:
        notes.append("never-upload")
    if os.path.isfile(os.path.join(ext["path"], f"{site}_downloader.js")):
        notes.append("has downloader")
    return {
        "extension": ext["folder"],
        "site": site,
        "key": key,
        "site_name": site_name,
        "count": count,
        "unit": unit,
        "thin": count is not None and count < limit,
        "match": match,
        "adopted": os.path.isfile(os.path.join(ext["path"], f"{site}_browser.js")),
        "declined": CANDIDATE_DECLINED.get((ext["folder"], site)),
        "note": ", ".join(notes),
    }


def site_modio(extensions, loose, failures):
    games, offset = [], 0
    while True:
        page = http_get_json(f"{MODIO_API}/games?_limit=100&_offset={offset}", MODIO_HEADERS)
        games += page["data"]
        offset += 100
        if offset >= page["result_total"]:
            break
    rows = []
    for game in games:
        urls = " ".join(u.get("url", "") for u in game.get("other_urls") or [])
        steam = set(STEAM_URL_RE.findall(urls))
        for ext in extensions:
            how = match_extension(ext, game["name"], steam=steam, loose=loose)
            if not how:
                continue
            open_dl = bool((game.get("api_access_options") or 0) & MODIO_DIRECT_DOWNLOADS)
            platforms = ",".join(p.get("platform") for p in game.get("platforms") or []) or "-"
            rows.append(make_row("modio", ext, game["name_id"], game["name"],
                                 (game.get("stats") or {}).get("mods_count_total", 0), "mods", how,
                                 f"dl {'open' if open_dl else 'auth'}, {platforms}"))
    return rows


def site_thunderstore(extensions, loose, failures):
    schema = http_get_json(THUNDERSTORE_SCHEMA)
    communities = schema.get("communities") or {}
    pending = []
    for label, game in (schema.get("games") or {}).items():
        distributions = game.get("distributions") or []
        steam = {d.get("identifier") for d in distributions if d.get("platform") in ("steam", "steam-direct")}
        epic = {d.get("identifier") for d in distributions if d.get("platform") == "epic-games-store"}
        name = (game.get("meta") or {}).get("displayName") or label
        community = label
        for entry in game.get("r2modman") or []:
            found = re.search(r"/c/([^/]+)/", entry.get("packageIndex") or "")
            if found:
                community = found.group(1)
                break
        for ext in extensions:
            how = match_extension(ext, name, steam=steam, epic=epic, loose=loose)
            if how:
                pending.append((ext, community, name, how))

    def count_of(community):
        try:
            data = http_get_json(THUNDERSTORE_LISTING.format(community))
            return community, data.get("count", 0), None
        except Exception as err:  # reported through failures, one bad community must not end the run
            return community, None, str(err)

    counts = run_concurrent_batch({p[1] for p in pending}, count_of, max_workers=SITE_WORKERS)
    rows = []
    for ext, community, name, how in pending:
        _, count, error = counts[community]
        if error:
            failures.append(f"thunderstore {community}: {error}")
        listed = (communities.get(community) or {}).get("listed", True)
        rows.append(make_row("thunderstore", ext, community, name, count, "mods", how,
                             "" if listed else "community unlisted"))
    return rows


def site_modworkshop(extensions, loose, failures):
    games, page = [], 1
    while True:
        data = http_get_json(MODWORKSHOP_GAMES.format(page))
        games += data["data"]
        if page >= data["meta"]["last_page"]:
            break
        page += 1
    rows = []
    for game in games:
        steam = set(STEAM_URL_RE.findall(game.get("buttons") or ""))
        for ext in extensions:
            how = match_extension(ext, game["name"], steam=steam, loose=loose)
            if how:
                rows.append(make_row("modworkshop", ext, game["short_name"], game["name"],
                                     int(game.get("mods_count") or 0), "mods", how))
    return rows


def site_gamebanana(extensions, loose, failures):
    def lookup(ext):
        found = []
        for group in (sorted(ext["names"]), sorted(ext["short_names"])):
            for name in group:
                try:
                    url = GAMEBANANA_NAME_MATCH.format(urllib.parse.quote(name))
                    data = http_get_json(url)
                except Exception as err:  # reported through failures
                    return ext["folder"], found, f"{name}: {err}"
                for record in data.get("_aRecords") or []:
                    how = match_extension(ext, record["_sName"], loose=loose)
                    if how:
                        found.append((record["_idRow"], record["_sName"], how))
            if found:  # the short name only searches when the full name found nothing
                break
        return ext["folder"], found, None

    results = run_concurrent_batch(extensions, lookup, max_workers=SITE_WORKERS)

    def count_of(game_id):
        try:
            # Mods are counted per root category; _aSections holds every other section, not Mod.
            data = http_get_json(GAMEBANANA_PROFILE.format(game_id))
            return game_id, sum(c.get("_nItemCount", 0) for c in data.get("_aModRootCategories") or []), None
        except Exception as err:  # reported through failures
            return game_id, None, str(err)

    game_ids = {hit[0] for _, found, _ in results.values() for hit in found}
    counts = run_concurrent_batch(game_ids, count_of, max_workers=SITE_WORKERS)

    rows = []
    for ext in extensions:
        _, found, error = results[ext["folder"]]
        if error:
            failures.append(f"gamebanana {ext['folder']} {error}")
        for game_id in {hit[0] for hit in found}:
            hit = next(h for h in found if h[0] == game_id)
            _, count, count_error = counts[game_id]
            if count_error:
                failures.append(f"gamebanana game {game_id}: {count_error}")
            rows.append(make_row("gamebanana", ext, str(game_id), hit[1], count, "mods", hit[2]))
    return rows


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower().replace("&", "and").replace("'", "")).strip("-")


def moddb_slugs(ext):
    """Slugs to try in order: override, full name, short name, then the name before its subtitle."""
    slugs = []
    override = MODDB_SLUG_OVERRIDES.get(ext["folder"])
    if override:
        slugs.append(override)
    for name in sorted(ext["names"]) + sorted(ext["short_names"]):
        slugs.append(slugify(name))
    for name in sorted(ext["names"]):
        head = re.split(r":| - ", name)[0]
        if head != name:
            slugs.append(slugify(head))
    return list(dict.fromkeys(s for s in slugs if s))


def parse_moddb_feed(text):
    """(page title, canonical slug, files per month, newest date) from a downloads feed."""
    title = re.search(r"<title>(.*?)</title>", text, re.S)
    page = html.unescape(title.group(1)).strip() if title else ""
    page = re.sub(r"^Files RSS feed\s*-\s*", "", page)
    page = re.sub(r"\s*-\s*ModDB$", "", page)
    link = re.search(r"<link>[^<]*/games/([^/<]+)/downloads</link>", text)
    dates = []
    for item in re.findall(r"<item>.*?</item>", text, re.S):
        stamp = re.search(r"<pubDate>(.*?)</pubDate>", item, re.S)
        if stamp:
            try:
                dates.append(email.utils.parsedate_to_datetime(stamp.group(1).strip()).timestamp())
            except ValueError:
                pass
    if not dates:
        return page, link.group(1) if link else "", 0.0, ""
    # Measured to now, not across the window: ten files from 2012 are not a live scene.
    days = max((time.time() - min(dates)) / 86400, MODDB_RATE_FLOOR_DAYS)
    newest = time.strftime("%Y-%m", time.gmtime(max(dates)))
    return page, link.group(1) if link else "", round(len(dates) / days * 30, 2), newest


def site_moddb(extensions, loose, failures):
    def lookup(ext):
        for slug in moddb_slugs(ext):
            try:
                text = http_get(MODDB_FEED.format(slug))
            except urllib.error.HTTPError as err:
                if err.code == 404:
                    continue
                return ext["folder"], None, f"{slug}: HTTP {err.code}"
            except Exception as err:  # reported through failures
                return ext["folder"], None, f"{slug}: {err}"
            return ext["folder"], (slug, text), None
        return ext["folder"], None, None

    results = run_concurrent_batch(extensions, lookup, max_workers=SITE_WORKERS)
    rows = []
    for ext in extensions:
        _, hit, error = results[ext["folder"]]
        if error:
            failures.append(f"moddb {ext['folder']} {error}")
        if not hit:
            continue
        slug, text = hit
        page, canonical, rate, newest = parse_moddb_feed(text)
        how = match_extension(ext, page) or "slug"
        note = f"newest {newest}" if newest else "no files"
        rows.append(make_row("moddb", ext, canonical or slug, page, rate, "files/mo", how, note))
    return rows


def site_fcmodding(extensions, loose, failures):
    """Closed set, no lookup: fcmodding only hosts Far Cry games."""
    farcry = set(read_id_list(FARCRY_LIST))
    return [make_row("fcmodding", ext, "-", ext["folder"][len("game-"):], None, "mods", "engine")
            for ext in extensions if ext["folder"][len("game-"):] in farcry]


SITE_FUNCTIONS = {
    "thunderstore": site_thunderstore,
    "modio": site_modio,
    "modworkshop": site_modworkshop,
    "gamebanana": site_gamebanana,
    "moddb": site_moddb,
    "fcmodding": site_fcmodding,
}


def row_sort_key(row):
    return (-(row["count"] if row["count"] is not None else -1), row["extension"])


def print_rows(rows):
    """Table by count, with the rows at exactly zero folded into one list at the end: the page
    exists but holds nothing, which is common on ModDB."""
    table = [r for r in rows if r["count"] != 0]
    zero = [r for r in rows if r["count"] == 0]
    if table:
        print(f"  {'extension':46} {'key':40} {'count':>8}  {'unit':8} {'match':10} {'thin':4}  note")
    for row in sorted(table, key=row_sort_key):
        count = "-" if row["count"] is None else row["count"]
        print(f"  {row['extension']:46} {row['key'][:40]:40} {count!s:>8}  {row['unit']:8} {row['match']:10} "
              f"{'thin' if row['thin'] else '':4}  {row['note']}")
    if zero:
        print(f"  Zero on the site, thin ({len(zero)}): " + ", ".join(
            f"{r['extension'][len('game-'):]}[{r['match']}]" for r in sorted(zero, key=row_sort_key)))


def report_parity(rows, copy_problems, excepted, wiring, snippets, lists):
    print("=== Module parity ===")
    for row in rows:
        print(f"  {row['module']:30} {row['identical']:>3}/{row['copies']:<3} identical")
    for line in excepted:
        print(f"  EXCEPTED {line}")
    sections = (
        ("Copies differing from canonical", copy_problems),
        ("Wiring", wiring),
        ("Template snippets", snippets),
        ("games-downloader lists (fix: python categorize_games.py)", lists),
    )
    for title, problems in sections:
        print(f"\n{title}: {len(problems)}")
        for line in problems:
            print(f"  {line}")


def report_hand_rolled(urls, browse):
    print("\n=== Downloader candidates (offline scan) ===")
    print("Direct-asset URLs by upstream, most extensions first. 'pinned' names one release tag (a rolling tag")
    print("like x64-latest also reads as pinned); 'latest' follows the newest release. Neither checks for updates.")
    for upstream, reason in HAND_ROLLED_EXCLUDED.items():
        count = len({u["extension"] for u in urls if u["upstream"] == upstream})
        print(f"Excluded: {upstream}, {count} extensions ({reason})")
    counted = [u for u in urls if u["upstream"] not in HAND_ROLLED_EXCLUDED]
    for title, group_urls in (
        ("No module for that host", [u for u in counted if not u["has_module"]]),
        ("Already bundles that host's module: leftover or second requirement, read by hand",
         [u for u in counted if u["has_module"]]),
    ):
        print(f"\n{title}: {len(group_urls)}")
        grouped = {}
        for url in group_urls:
            grouped.setdefault((url["host"], url["upstream"]), []).append(url)
        for (host, upstream), group in sorted(grouped.items(), key=lambda kv: (-len(kv[1]), kv[0])):
            print(f"  {host}:{upstream} ({len(group)})")
            for url in sorted(group, key=lambda u: u["extension"]):
                print(f"      {url['extension']:46} {url['kind']}")
    print(f"\nbrowse-for-download routes: {len(browse)}")
    for folder in browse:
        print(f"  {folder}")


def report_sites(rows, failures, show_adopted):
    print("\n=== Browser candidates by site ===")
    print(f"Thin = under {THIN_MODS} mods, or under {THIN_FILES_PER_MONTH} files/mo on ModDB. Name matches need a look.")
    for site in ALL_SITES:
        site_rows = [r for r in rows if r["site"] == site]
        if not site_rows:
            continue
        adopted = [r for r in site_rows if r["adopted"]]
        declined = [r for r in site_rows if r["declined"] and not r["adopted"]]
        open_rows = [r for r in site_rows if not r["adopted"] and not r["declined"]]
        print(f"\n--- {site}: {len(open_rows)} candidates, {len(adopted)} adopted, {len(declined)} declined ---")
        if open_rows:
            print_rows(open_rows)
        if declined:
            print("  Declined:")
            for row in sorted(declined, key=row_sort_key):
                print(f"    {row['extension']:46} {row['key'][:32]:32} {row['count']!s:>8} {row['unit']:8} {row['declined']}")
        if show_adopted and adopted:
            print("  Adopted:")
            print_rows(adopted)
    if failures:
        print(f"\nLookups that failed, so these rows may be missing or uncounted: {len(failures)}")
        for line in failures:
            print(f"  {line}")


def main():
    parser = argparse.ArgumentParser(description="Audit browser and downloader module parity and adoption candidates.")
    parser.add_argument("--sites", nargs="*", choices=ALL_SITES, default=None)
    parser.add_argument("--loose", action="store_true")
    parser.add_argument("--adopted", action="store_true")
    parser.add_argument("--json")
    args = parser.parse_args()
    sys.stdout.reconfigure(errors="replace")  # game names carry characters a cp1252 console cannot print

    modules = canonical_modules()
    rows, copy_problems, excepted = check_copies(modules)
    wiring = check_wiring(modules)
    snippets = check_template_snippets(modules)
    lists = check_lists(modules)
    urls, browse = scan_hand_rolled()
    report_parity(rows, copy_problems, excepted, wiring, snippets, lists)
    report_hand_rolled(urls, browse)

    site_rows, failures = [], []
    if args.sites is not None:
        extensions = load_extensions()
        for site in args.sites or ALL_SITES:
            print(f"Querying {site}...", file=sys.stderr)
            try:
                site_rows += SITE_FUNCTIONS[site](extensions, args.loose, failures)
            except Exception as err:  # a site being down must not lose the other sites' results
                failures.append(f"{site}: whole site failed: {err}")
        report_sites(site_rows, failures, args.adopted)

    problem_count = len(copy_problems) + len(wiring) + len(snippets) + len(lists)
    print(f"\nSummary: {problem_count} parity problems, {len(excepted)} excepted copies, "
          f"{sum(1 for u in urls if u['upstream'] not in HAND_ROLLED_EXCLUDED)} hand-rolled URLs, "
          f"{len(browse)} browse routes"
          + (f", {sum(1 for r in site_rows if not r['adopted'] and not r['declined'])} site candidates"
             if args.sites is not None else ""))

    if args.json:
        with open(args.json, "w", encoding="utf-8") as handle:
            json.dump({
                "copies": rows,
                "excepted": excepted,
                "problems": {"copies": copy_problems, "wiring": wiring, "snippets": snippets, "lists": lists},
                "hand_rolled_urls": urls,
                "browse_routes": browse,
                "site_rows": site_rows,
                "failures": failures,
            }, handle, indent=1)
        print(f"Wrote {args.json}")
    return 1 if problem_count else 0


if __name__ == "__main__":
    sys.exit(main())
