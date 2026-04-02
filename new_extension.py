#!/usr/bin/env python3
"""
new_extension.py
----------------
Bootstraps a new Vortex game extension from a template.

Usage:
    python new_extension.py --template TEMPLATE_NAME "Game Name"
    python new_extension.py --template TEMPLATE_NAME 1234567

Examples:
    python new_extension.py --template template-unitybepinex "Hollow Knight"
    python new_extension.py --template template-ue4-5game 1954200

Fills in all XXX fields it can resolve automatically from Steam, GOG, Epic,
and PCGamingWiki. Remaining XXX fields are reported at the end for manual entry.

Downloads exec.png (64x64, Steam CDN) and a 640x360 cover art JPG with no
title text (SteamGridDB heroes if STEAMGRIDDB_API_KEY is set, else Steam
library_hero.jpg).

Copies all template assets as-is (tfc.png, fluffy.png, reloaded.png, etc.).
Skips EXTENSION_EXPLAINED.md (generated separately via generate_explained.js).

Requirements:
    pip install Pillow
Environment variables:
    STEAMGRIDDB_API_KEY  (optional, for higher-quality cover art)
"""

import os
import re
import sys
import json
import time
import shutil
import argparse
import subprocess
import urllib.request
import urllib.parse
from datetime import date
from io import BytesIO
from PIL import Image

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

TEMPLATES = [
    "template-basicgame",
    "template-cobraengineACSEgame",
    "template-farcrygame",
    "template-godot-game",
    "template-reframework-fluffy-game",
    "template-reloaded2game",
    "template-rpgmakergame",
    "template-snowdropenginegame",
    "template-tfcinstaller-ue2-3game",
    "template-ue4-5game",
    "template-unitybepinex",
    "template-unitymelonloaderbepinex-hybrid",
    "template-unity-umm",
]

# ── HTTP ──────────────────────────────────────────────────────────────────────

def http_get(url, headers=None):
    req = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0", **(headers or {})}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8")


def http_get_bytes(url, headers=None):
    req = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0", **(headers or {})}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read()


# ── Steam ─────────────────────────────────────────────────────────────────────

def steam_search(game_name):
    """Search Steam Community for a game. Returns (appid_str, name) or (None, None)."""
    clean = re.sub(r"[^\w\s]", " ", game_name).strip()
    url = "https://steamcommunity.com/actions/SearchApps/{}".format(
        urllib.parse.quote(clean)
    )
    try:
        results = json.loads(http_get(url))
        if results:
            return str(results[0]["appid"]), results[0]["name"]
    except Exception as e:
        print(f"    Steam search error: {e}")
    return None, None


def steam_appdetails(appid):
    """Fetch Steam Store app details. Returns data dict or None."""
    url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
    try:
        data = json.loads(http_get(url))
        entry = data.get(str(appid), {})
        if entry.get("success"):
            return entry["data"]
    except Exception as e:
        print(f"    Steam appdetails error: {e}")
    return None


def scrape_steamdb_info(appid):
    """Scrape steamdb.info/app/{appid}/info/ once. Returns dict with installdir and
    launch executables. Called once in create_extension() and shared across helpers."""
    result = {'installdir': None, 'launch_exes': []}
    try:
        html = http_get(f"https://steamdb.info/app/{appid}/info/")
        m = re.search(r"installdir\s*</td>\s*<td[^>]*>\s*([^<]+?)\s*</td>", html, re.IGNORECASE)
        if m:
            result['installdir'] = m.group(1).strip()
        exes = re.findall(r'executable\s*</td>\s*<td[^>]*>\s*([^<]+?)\s*</td>', html, re.IGNORECASE)
        for exe in exes:
            exe = exe.strip().replace("\\", "/")
            if exe and exe.lower().endswith(".exe"):
                parts = exe.split("/")
                result['launch_exes'].append({'filename': parts[-1], 'dir_parts': parts[:-1]})
    except Exception as e:
        print(f"    SteamDB info page error: {e}")
    return result


def get_exec_info(steam_data, steamdb_data):
    """Extract the primary executable filename and directory parts.
    Returns (exec_filename, dir_parts) or (None, []).

    Method 1: Parse Steam launch options for the full exe path.
    Method 2: Use launch executables from the SteamDB info page scrape."""
    # Method 1: Steam launch options (most reliable — full path available)
    launch = (steam_data or {}).get("launch", [])
    for entry in sorted(launch, key=lambda x: 0 if x.get("type") == "default" else 1):
        cat = entry.get("category", "")
        if "vr" in cat.lower() or "tool" in cat.lower():
            continue
        exe = entry.get("executable", "").replace("\\", "/")
        if exe:
            parts = exe.split("/")
            return parts[-1], parts[:-1] if len(parts) > 1 else []

    # Method 2: SteamDB launch executables
    exes = (steamdb_data or {}).get("launch_exes", [])
    if exes:
        e = exes[0]
        return e['filename'], e['dir_parts']

    return None, []


def get_demo_appid(steam_data):
    """Return the Steam App ID of the game's demo, or None if no demo exists.
    Steam appdetails includes a 'demos' array when a demo is available."""
    demos = (steam_data or {}).get("demos", [])
    if demos:
        return str(demos[0].get("appid", ""))
    return None


def get_epic_code_name(steam_data, steamdb_data):
    """Find the Unreal Engine project code name (folder containing Binaries/ and Content/).

    Method 1: Parse Steam launch executable paths for ([^/]+)/Binaries/ pattern.
    Method 2: Use the installdir from the already-scraped SteamDB info page.
    Returns the code name string, or None if not found."""

    # Method 1: launch executable path contains folder structure
    for entry in (steam_data or {}).get("launch", []):
        exe = entry.get("executable", "").replace("\\", "/")
        m = re.match(r"([^/]+)/Binaries/", exe, re.IGNORECASE)
        if m:
            return m.group(1)

    # Method 2: installdir from SteamDB (already scraped, no extra request)
    installdir = (steamdb_data or {}).get("installdir")
    if installdir:
        return installdir

    return None


def steam_icon_search(appid, game_name):
    """Return the Steam CDN icon URL for exec.png fetching."""
    # Get canonical name from Store API
    try:
        data = json.loads(http_get(
            f"https://store.steampowered.com/api/appdetails?appids={appid}"
        ))
        if data.get(str(appid), {}).get("success"):
            game_name = data[str(appid)]["data"]["name"]
    except Exception:
        pass

    clean = game_name.encode("ascii", "ignore").decode()
    clean = re.sub(r"[:\-]", " ", clean)
    clean = re.sub(
        r"\b(Deluxe|Gold|Complete|Definitive|Enhanced|Remastered|Ultimate|"
        r"Standard|Premium|Legendary|Anniversary|Director.s Cut|"
        r"Game of the Year|GOTY|Edition|Collection|Bundle)\b.*",
        "", clean, flags=re.IGNORECASE,
    ).strip()

    try:
        url = "https://steamcommunity.com/actions/SearchApps/{}".format(
            urllib.parse.quote(clean)
        )
        results = json.loads(http_get(url))
        for r in results:
            if str(r.get("appid")) == str(appid):
                return r.get("icon")
        if results:
            return results[0].get("icon")
    except Exception:
        pass
    return None


# ── Store lookups ─────────────────────────────────────────────────────────────

_ROMAN = [
    (r'\bVIII\b', '8'), (r'\bVII\b', '7'), (r'\bVI\b', '6'),
    (r'\bIX\b', '9'), (r'\bIV\b', '4'), (r'\bXI\b', '11'),
    (r'\bIII\b', '3'), (r'\bII\b', '2'), (r'\bX\b', '10'),
    (r'\bV\b', '5'),
]

_ARABIC_TO_ROMAN = [
    ('11', 'XI'), ('10', 'X'), ('9', 'IX'), ('8', 'VIII'),
    ('7', 'VII'), ('6', 'VI'), ('5', 'V'), ('4', 'IV'),
    ('3', 'III'), ('2', 'II'),
]

_EDITION_SUFFIXES = [
    ' Gold Edition', ' GOTY Edition', ' Game of the Year Edition',
    ' Definitive Edition', ' Complete Edition', ' Deluxe Edition',
    ' Ultimate Edition', ' Anniversary Edition', ' Remastered Edition',
    ' Edition REMASTERED', ' REMASTERED', ' Remastered',
    ' Gold', ' Plus Edition',
]

def roman_to_arabic(name):
    """Convert standalone Roman numeral words in a game title to Arabic digits."""
    for pattern, replacement in _ROMAN:
        name = re.sub(pattern, replacement, name)
    return name


def arabic_to_roman(name):
    """Convert standalone Arabic digit words in a game title to Roman numerals."""
    for arabic, roman in _ARABIC_TO_ROMAN:
        name = re.sub(rf'\b{arabic}\b', roman, name)
    return name


def name_lookup_variants(game_name):
    """
    Return a list of name strings to try for PCGW direct title lookup.
    Includes the original, title-cased (for all-caps names), roman↔arabic
    numeral alternates, and edition-suffix-stripped variants of all the above.
    """
    candidates = [game_name]

    # Title-case variant: covers all-caps names ("FINAL FANTASY TACTICS") and
    # names with lowercase prepositions ("Escape from Duckov" → "Escape From Duckov")
    titled = game_name.title()
    if titled != game_name:
        candidates.append(titled)

    # Arabic ↔ Roman numeral alternates
    extra = []
    for c in candidates:
        r2a = roman_to_arabic(c)
        if r2a != c:
            extra.append(r2a)
        a2r = arabic_to_roman(c)
        if a2r != c:
            extra.append(a2r)
    candidates.extend(extra)

    # Edition-suffix-stripped variants
    stripped = []
    for c in candidates:
        for suffix in _EDITION_SUFFIXES:
            if c.endswith(suffix):
                stripped.append(c[: -len(suffix)].rstrip())
                break
    candidates.extend(stripped)

    # Deduplicate while preserving order
    seen = set()
    result = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            result.append(c)
    return result


_nexus_games_cache = None

def lookup_nexus_domain(game_name, api_key):
    """Look up the Nexus Mods domain name for a game using the v1 games list.
    Fetches all games once and caches the result for the session.
    Uses exact matching with Roman numeral fallback (e.g. 'II' -> '2').
    Returns the domain_name string, or None if not found."""
    global _nexus_games_cache
    if not api_key:
        return None
    try:
        if _nexus_games_cache is None:
            req = urllib.request.Request(
                "https://api.nexusmods.com/v1/games.json?include_unapproved=false",
                headers={"apikey": api_key, "User-Agent": "Mozilla/5.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                _nexus_games_cache = json.loads(resp.read())
        norm = lambda s: s.lower().replace('\u2019', "'").replace(':', '').replace('  ', ' ').strip()
        name_variants = {norm(game_name)}
        converted = roman_to_arabic(game_name)
        if converted != game_name:
            name_variants.add(norm(converted))
        for game in _nexus_games_cache:
            t = norm(game.get("name", ""))
            if t in name_variants or any(t.startswith(v + " (") for v in name_variants):
                return game["domain_name"]
    except Exception as e:
        print(f"    Nexus domain lookup error: {e}")
    return None


def lookup_gog(game_name):
    """Search GOG catalog for a matching game. Returns GOG ID string or None.
    Only returns a result when the title genuinely matches — never falls back
    to an unrelated first result."""
    url = (
        "https://catalog.gog.com/v1/catalog"
        f"?search={urllib.parse.quote(game_name)}&productType=in:game,pack&limit=5"
    )
    try:
        data = json.loads(http_get(url))
        products = data.get("products", [])
        for p in products:
            if game_name.lower() in p.get("title", "").lower():
                return str(p["id"])
    except Exception as e:
        print(f"    GOG lookup error: {e}")
    return None


def check_epic(game_name):
    """Check whether the game has a page on the Epic Games Store.
    Returns (found: bool, url: str | None).
    found=True → EPICAPP_ID left as XXX for manual entry.
    found=False → EPICAPP_ID set to null."""
    slug = re.sub(r"[^a-z0-9]+", "-", game_name.lower()).strip("-")
    url = f"https://store.epicgames.com/en-US/p/{slug}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            final_url = resp.geturl()
        return True, final_url
    except urllib.error.HTTPError as e:
        found = e.code != 404
        return found, url if found else None
    except Exception:
        return True, url  # Network error — be conservative, leave as XXX


def lookup_pcgamingwiki(game_name):
    """Search PCGamingWiki and return (page_url, page_title) or (None, None).
    Stage 1: direct title lookup with redirect following for exact matches.
    Stage 2: title search fallback for disambiguation suffixes like "Keeper (video game)"."""
    PCGW_API = "https://www.pcgamingwiki.com/w/api.php"
    norm = lambda s: s.lower().replace('\u2019', "'").replace(':', '').replace(' - ', ' ').replace('  ', ' ').strip()
    name_variants = name_lookup_variants(game_name)

    try:
        # Stage 1: direct title lookup (handles exact matches and redirects)
        for variant in name_variants:
            url = (
                f"{PCGW_API}?action=query&titles={urllib.parse.quote(variant)}"
                "&redirects=1&format=json"
            )
            data = json.loads(http_get(url))
            pages = data.get("query", {}).get("pages", {})
            for page_id, page in pages.items():
                if page_id != "-1" and "missing" not in page:
                    title = page["title"]
                    slug = urllib.parse.quote(title.replace(" ", "_"))
                    return f"https://www.pcgamingwiki.com/wiki/{slug}", title

        # Stage 2: title search fallback for disambiguation suffixes
        url = (
            f"{PCGW_API}?action=query&list=search&srsearch={urllib.parse.quote(game_name)}"
            "&srwhat=title&format=json&srlimit=20"
        )
        data = json.loads(http_get(url))
        results = data.get("query", {}).get("search", [])
        name_variants_norm = {norm(v) for v in name_variants}
        title = None
        for result in results:
            t = norm(result["title"])
            if t in name_variants_norm or any(t.startswith(v + " (") for v in name_variants_norm):
                title = result["title"]
                break
        if not title:
            return None, None

        # Fetch wikitext to check for redirect on disambiguation-matched pages
        wt_url = (
            f"{PCGW_API}?action=parse&page={urllib.parse.quote(title)}"
            "&prop=wikitext&format=json"
        )
        wt_data = json.loads(http_get(wt_url))
        wikitext = wt_data.get("parse", {}).get("wikitext", {}).get("*", "")
        redirect = re.search(r'#REDIRECT\s*\[\[(.+?)\]\]', wikitext)
        if redirect:
            title = redirect.group(1)
        slug = urllib.parse.quote(title.replace(" ", "_"))
        return f"https://www.pcgamingwiki.com/wiki/{slug}", title

    except Exception as e:
        print(f"    PCGamingWiki lookup error: {e}")
    return None, None


def fetch_pcgw_availability(page_title):
    """Fetch PCGamingWiki page wikitext and check the Availability section for store presence.
    Returns dict: {'xbox': bool, 'xbox_url': str|None, 'epic_url': str|None, 'engine_version': str|None}.
    engine_version is a 4-part string like '5.4.4.0' parsed from {{Infobox game/row/engine|...|build=X.Y.Z}}."""
    result = {'xbox': False, 'xbox_url': None, 'epic_url': None, 'engine_version': None}
    if not page_title:
        return result
    try:
        url = (
            "https://www.pcgamingwiki.com/w/api.php"
            f"?action=parse&page={urllib.parse.quote(page_title)}"
            "&prop=wikitext&format=json"
        )
        data = json.loads(http_get(url))
        wikitext = data.get("parse", {}).get("wikitext", {}).get("*", "")
        # Follow redirect if the title resolved to a redirect page
        if wikitext.strip().startswith("#REDIRECT"):
            m_redirect = re.search(r'#REDIRECT\s*\[\[(.+?)\]\]', wikitext, re.IGNORECASE)
            if m_redirect:
                redirect_title = m_redirect.group(1).strip()
                url = (
                    "https://www.pcgamingwiki.com/w/api.php"
                    f"?action=parse&page={urllib.parse.quote(redirect_title)}"
                    "&prop=wikitext&format=json"
                )
                data = json.loads(http_get(url))
                wikitext = data.get("parse", {}).get("wikitext", {}).get("*", "")
        if re.search(r'microsoft\s*store|xbox\s*(game\s*pass|store|app)', wikitext, re.IGNORECASE):
            result['xbox'] = True
        m_xbox = re.search(
            r'\{\{Availability/row\|\s*Microsoft Store\s*\|\s*([^|{}\n]+?)\s*\|',
            wikitext, re.IGNORECASE
        )
        if m_xbox:
            result['xbox_url'] = f"https://apps.microsoft.com/detail/{m_xbox.group(1).strip()}"
        m = re.search(
            r'\{\{Availability/row\|\s*(?:Epic Games Store|EGS)\s*\|\s*([^|{}\n]+?)\s*\|',
            wikitext, re.IGNORECASE
        )
        if m:
            result['epic_url'] = f"https://store.epicgames.com/en-US/p/{m.group(1).strip()}"
        m_eng = re.search(
            r'\{\{Infobox game/row/engine\|Unreal Engine [45]\|build=(\d+\.\d+(?:\.\d+)?)',
            wikitext
        )
        if m_eng:
            build = m_eng.group(1)
            # Normalise to 4-part format (e.g. '5.4.4' → '5.4.4.0')
            result['engine_version'] = build if build.count('.') >= 3 else build + '.0'
    except Exception as e:
        print(f"    PCGamingWiki availability error: {e}")
    return result


# ── Assets ────────────────────────────────────────────────────────────────────

def download_exec_icon(appid, game_name, out_path):
    """Download and save a 64x64 exec.png from Steam CDN."""
    icon_url = steam_icon_search(appid, game_name)
    if not icon_url:
        return False, None
    try:
        # Try 184x184 _full first, fall back to 32x32
        try:
            data = http_get_bytes(icon_url.replace(".jpg", "_full.jpg"))
            source = "Steam CDN 184x184"
        except Exception:
            data = http_get_bytes(icon_url)
            source = "Steam CDN 32x32"
        img = Image.open(BytesIO(data)).convert("RGB")
        img = img.resize((64, 64), Image.LANCZOS)
        img.save(out_path, "PNG")
        return True, source
    except Exception as e:
        print(f"    exec.png error: {e}")
        return False, None


def download_cover_art(appid, game_name, out_path, sgdb_key=None):
    """Download and save a 640x360 cover art JPG with no title text.
    Tries SteamGridDB heroes first, then Steam library_hero.jpg."""

    img_data = None
    source = None

    # 1. SteamGridDB heroes (curated text-free wide art)
    if sgdb_key:
        try:
            url = f"https://www.steamgriddb.com/api/v2/heroes/steam/{appid}"
            resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
            heroes = resp.get("data", [])
            if heroes:
                best = sorted(heroes, key=lambda x: x.get("width", 0), reverse=True)[0]
                img_data = http_get_bytes(best["url"])
                source = f"SteamGridDB hero ({best.get('width')}x{best.get('height')})"
        except Exception as e:
            print(f"    SteamGridDB hero error: {e}")

    # 2. Steam library_hero.jpg (1920x620, no title text)
    if not img_data:
        try:
            url = f"https://cdn.fastly.steamstatic.com/steam/apps/{appid}/library_hero.jpg"
            img_data = http_get_bytes(url)
            source = "Steam library_hero.jpg"
        except Exception as e:
            print(f"    Steam library_hero error: {e}")

    if not img_data:
        return False, None

    # Center-crop to 16:9, then resize to 640x360
    img = Image.open(BytesIO(img_data)).convert("RGB")
    w, h = img.size
    target_ratio = 640 / 360
    current_ratio = w / h
    if current_ratio > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    elif current_ratio < target_ratio:
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))
    img = img.resize((640, 360), Image.LANCZOS)
    img.save(out_path, "JPEG", quality=92)
    return True, source


# ── Derivation helpers ────────────────────────────────────────────────────────

def derive_game_id(name):
    """'Hollow Knight' → 'hollowknight'"""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def derive_short_name(name):
    """Strip subtitle after ':' for GAME_NAME_SHORT. Uses full name if no colon."""
    if ":" in name:
        return name.split(":")[0].strip()
    return name


# ── index.js substitution ─────────────────────────────────────────────────────

def sub(src, var_name, value):
    """
    Replace lines of the form:
        const VAR_NAME = "XXX"   →   const VAR_NAME = "value"
        const VAR_NAME = "XXX"   →   const VAR_NAME = null    (when value is None)
        const VAR_NAME = 'XXX'   →   same (single-quoted variant)
    Only targets lines where the RHS is exactly "XXX" or 'XXX'.
    Lines already set to null or a real value are untouched.
    """
    pattern = rf'((?:const|let)\s+{re.escape(var_name)}\s*=\s*)["\']XXX(?:\.exe)?["\']'
    if value is None:
        return re.sub(pattern, r"\1null", src)
    escaped = value.replace("\\", "\\\\")
    return re.sub(pattern, rf'\1"{escaped}"', src)


def sub_header(src, game_name, today):
    """Update the header comment block fields."""
    src = re.sub(
        r"(Name:\s*).*?(\s*Vortex Extension)",
        rf"\g<1>{game_name}\2",
        src
    )
    src = re.sub(r"(Version:\s*)[\d.]+", r"\g<1>0.1.0", src)
    src = re.sub(r"(Date:\s*)\S+", rf"\g<1>{today}", src)
    return src


def apply_substitutions(src, fields):
    """Apply a {var_name: value_or_None} dict of substitutions to src."""
    for var_name, value in fields.items():
        src = sub(src, var_name, value)
    return src


def add_line_comment(src, var_name, comment):
    """Add or replace the trailing // comment on the const/let VAR_NAME = ...; line."""
    pattern = rf'((?:const|let)\s+{re.escape(var_name)}\s*=[^;\n]*;?)[ \t]*(?://[^\n]*)?\n'
    return re.sub(pattern, rf'\1 // {comment}\n', src)


def sub_binaries_path(src, dir_parts):
    """Replace BINARIES_PATH = path.join('.') with the actual path from dir_parts.
    Only acts when dir_parts is non-empty (exe is in a subdirectory)."""
    if not dir_parts:
        return src
    args = ", ".join(f'"{p}"' for p in dir_parts)
    return re.sub(
        r"(const\s+BINARIES_PATH\s*=\s*)path\.join\s*\(\s*['\"]\.['\"]\s*\)",
        rf'\1path.join({args})',
        src
    )


def sub_toggle(src, toggle_name, value):
    """Set a boolean feature toggle (const NAME = false/true;) to the given value.
    Only acts if the toggle currently holds the opposite value."""
    val_str = "true" if value else "false"
    opposite = "false" if value else "true"
    pattern = rf'(const\s+{re.escape(toggle_name)}\s*=\s*){re.escape(opposite)}(\s*;?)'
    return re.sub(pattern, rf'\g<1>{val_str}\2', src)


def update_discovery_ids(src, gog_id, demo_appid):
    """Update DISCOVERY_IDS_ACTIVE to include all found store IDs.
    Always includes STEAMAPP_ID. Adds STEAMAPP_ID_DEMO if a demo was found,
    GOGAPP_ID if GOG was found."""
    ids = ["STEAMAPP_ID"]
    if demo_appid:
        ids.append("STEAMAPP_ID_DEMO")
    if gog_id:
        ids.append("GOGAPP_ID")
    array_str = ", ".join(ids)
    return re.sub(
        r'(const\s+DISCOVERY_IDS_ACTIVE\s*=\s*\[)[^\]]*(\])',
        rf'\g<1>{array_str}\2',
        src
    )


# ── File editors ─────────────────────────────────────────────────────────────

def edit_info_json(path, game_name):
    """Replace the XXX game name in the copied info.json."""
    with open(path, encoding="utf-8") as f:
        content = f.read()
    content = content.replace('"Game: XXX"', f'"Game: {game_name}"')
    content = content.replace('"Vortex support for XXX"', f'"Vortex support for {game_name}"')
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def edit_changelog(path, today):
    """Fill in the date placeholder in the copied CHANGELOG.md."""
    with open(path, encoding="utf-8") as f:
        content = f.read()
    # Replace date placeholders like 2026-XX-XX or XXXX-XX-XX
    content = re.sub(r'\d{4}-XX-XX', today, content)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


# ── Orchestration ─────────────────────────────────────────────────────────────

def create_extension(template_name, game_input, force=False, dry_run=False):
    sgdb_key = os.environ.get("STEAMGRIDDB_API_KEY")
    if not sgdb_key:
        try:
            from winreg import OpenKey, QueryValueEx, HKEY_CURRENT_USER
            with OpenKey(HKEY_CURRENT_USER, "Environment") as reg_key:
                sgdb_key, _ = QueryValueEx(reg_key, "STEAMGRIDDB_API_KEY")
        except Exception:
            pass
    nexus_key = os.environ.get("NEXUS_API_KEY")
    if not nexus_key:
        try:
            from winreg import OpenKey, QueryValueEx, HKEY_CURRENT_USER
            with OpenKey(HKEY_CURRENT_USER, "Environment") as reg_key:
                nexus_key, _ = QueryValueEx(reg_key, "NEXUS_API_KEY")
        except Exception:
            pass
    if not nexus_key:
        try:
            from winreg import OpenKey, QueryValueEx, HKEY_LOCAL_MACHINE
            with OpenKey(HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment") as reg_key:
                nexus_key, _ = QueryValueEx(reg_key, "NEXUS_API_KEY")
        except Exception:
            pass
    today = date.today().strftime("%Y-%m-%d")

    # ── 1. Resolve Steam ID and canonical name ────────────────────────────────
    print("\n[Steam]")
    if game_input.isdigit():
        appid = game_input
        steam_data = steam_appdetails(appid)
        game_name = (steam_data or {}).get("name", game_input)
    else:
        appid, game_name = steam_search(game_input)
        if not appid:
            print("  ERROR: Game not found on Steam.")
            sys.exit(1)
        steam_data = steam_appdetails(appid)
        if steam_data:
            game_name = steam_data.get("name", game_name)

    print(f"  Name     : {game_name}")
    print(f"  Steam ID : {appid}")

    nexus_domain = lookup_nexus_domain(game_name, nexus_key)
    if nexus_domain:
        game_id = nexus_domain
        print(f"  Game ID  : {game_id} (from Nexus Mods)")
    else:
        game_id = derive_game_id(game_name)
        print(f"  Game ID  : {game_id} (derived — verify Nexus domain manually)")

    # ── 2. Check destination ──────────────────────────────────────────────────
    dest = os.path.join(REPO_ROOT, f"game-{game_id}")
    if os.path.exists(dest) and not dry_run:
        if force:
            shutil.rmtree(dest)
        else:
            print(f"\n  ERROR: Folder already exists: {dest}")
            print("  Use --force to overwrite.")
            sys.exit(1)

    # ── 3. Store IDs ──────────────────────────────────────────────────────────
    print("\n[Store IDs]")
    time.sleep(0.3)
    gog_id = lookup_gog(game_name)
    print(f"  GOG      : {gog_id or 'not found'}")
    time.sleep(0.3)
    epic_found, epic_url = check_epic(game_name)
    print(f"  Epic     : {'found (set ID manually)' if epic_found else 'not found'}")

    # ── 4. SteamDB data, executable, demo ID, and UE code name ───────────────
    print("\n[SteamDB]")
    time.sleep(0.3)
    steamdb_data = scrape_steamdb_info(appid)
    exec_filename, dir_parts = get_exec_info(steam_data, steamdb_data)
    game_string = exec_filename.replace(".exe", "").replace(".EXE", "") if exec_filename else None
    demo_appid = get_demo_appid(steam_data)
    epic_code_name = get_epic_code_name(steam_data, steamdb_data)
    print(f"  Exec     : {exec_filename or 'not found (left as XXX)'}")
    if dir_parts:
        print(f"  Bin path : {'/'.join(dir_parts)}")
    print(f"  Demo ID  : {demo_appid or 'none found'}")
    print(f"  UE code  : {epic_code_name or 'not found (left as XXX)'}")

    # ── 5. PCGamingWiki ───────────────────────────────────────────────────────
    time.sleep(0.3)
    pcgw_url, pcgw_title = lookup_pcgamingwiki(game_name)
    print(f"\n[PCGamingWiki]")
    print(f"  {pcgw_url or 'not found'}")
    time.sleep(0.3)
    availability = fetch_pcgw_availability(pcgw_title)
    xbox_found = availability['xbox']
    engine_version = availability['engine_version']
    print(f"  Xbox     : {'found (set ID manually)' if xbox_found else 'not found'}")
    if engine_version:
        print(f"  UE build : {engine_version}")

    # ── 6. Copy template folder ───────────────────────────────────────────────
    if dry_run:
        print(f"\n{'=' * 60}")
        print(f"  [DRY RUN] Would create: game-{game_id}/")
        print(f"  Template : {template_name}")
        print(f"  Steam ID : {appid}  |  GOG: {gog_id or '—'}  |  Epic: {'yes' if epic_found else '—'}  |  Xbox: {'yes' if xbox_found else '—'}")
        print(f"  Exec     : {exec_filename or 'XXX'}")
        if engine_version:
            print(f"  UE build : {engine_version}")
        print(f"{'=' * 60}\n")
        return

    print(f"\n[Creating game-{game_id}/]")
    template_dir = os.path.join(REPO_ROOT, template_name)
    shutil.copytree(template_dir, dest)

    # Remove files that are either game-specific or generated separately
    for skip_name in ["EXTENSION_EXPLAINED.md"]:
        p = os.path.join(dest, skip_name)
        if os.path.exists(p):
            os.remove(p)
    # Remove any .jpg from the template (template logo named after template, not game)
    for fname in os.listdir(dest):
        if fname.endswith(".jpg"):
            os.remove(os.path.join(dest, fname))

    # ── 7. Build substitution fields ─────────────────────────────────────────
    short_name = derive_short_name(game_name)

    fields = {
        "GAME_ID":          game_id,
        "STEAMAPP_ID":      appid,
        "STEAMAPP_ID_DEMO": demo_appid,                        # from Steam demos array
        "EPICAPP_ID":       None if not epic_found else "XXX", # null if not on Epic
        "GOGAPP_ID":        gog_id,
        "XBOXAPP_ID":       None if not xbox_found else "XXX", # null if not on Xbox PC store
        "GAME_NAME":        game_name,
        "GAME_NAME_SHORT":  short_name,
        **({"PCGAMINGWIKI_URL": pcgw_url} if pcgw_url else {}),
        **({"EPIC_CODE_NAME": epic_code_name} if epic_code_name else {}),
        **({"GAME_STRING": game_string, "GAME_STRING_ALT": game_string,
            "GAME_FOLDER": game_string, "FLUFFY_FOLDER": game_string} if game_string else {}),
    }
    # Direct EXEC/EXEC_NAME assignments (for templates that use a literal)
    if exec_filename:
        fields["EXEC"] = exec_filename
        fields["EXEC_NAME"] = exec_filename
        fields["EXEC_DEMO"] = None

    # ── 8. Apply substitutions to index.js ───────────────────────────────────
    index_path = os.path.join(dest, "index.js")
    src = open(index_path, encoding="utf-8").read()
    src = sub_header(src, game_name, today)
    src = apply_substitutions(src, fields)
    src = update_discovery_ids(src, gog_id, demo_appid)
    src = sub_binaries_path(src, dir_parts)
    # Add store lookup links as comments on the const declaration lines
    src = add_line_comment(src, "STEAMAPP_ID", f"https://steamdb.info/app/{appid}/")
    if demo_appid:
        src = add_line_comment(src, "STEAMAPP_ID_DEMO", f"https://steamdb.info/app/{demo_appid}/")
    if gog_id:
        src = add_line_comment(src, "GOGAPP_ID", f"https://www.gogdb.org/product/{gog_id}")
    xbox_url = availability.get('xbox_url')
    if xbox_found:
        src = sub_toggle(src, "hasXbox", True)
        if xbox_url:
            src = add_line_comment(src, "XBOXAPP_ID", xbox_url)
    pcgw_epic_url = availability.get('epic_url')
    if epic_found and pcgw_epic_url:
        src = add_line_comment(src, "EPICAPP_ID", pcgw_epic_url)
    if engine_version:
        src = re.sub(
            r"(const\s+ENGINE_VERSION\s*=\s*)['\"]5\.X\.X(?:\.0)?['\"]",
            rf"\g<1>'{engine_version}'",
            src
        )
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(src)
    print("  index.js written")

    # ── 9. info.json ──────────────────────────────────────────────────────────
    edit_info_json(os.path.join(dest, "info.json"), game_name)
    print("  info.json updated")

    # ── 10. CHANGELOG.md ──────────────────────────────────────────────────────
    edit_changelog(os.path.join(dest, "CHANGELOG.md"), today)
    print("  CHANGELOG.md updated")

    # ── 11. exec.png ──────────────────────────────────────────────────────────
    print("\n[exec.png]")
    time.sleep(0.3)
    icon_ok, icon_source = download_exec_icon(appid, game_name, os.path.join(dest, "exec.png"))
    print(f"  {'Saved  : ' + icon_source if icon_ok else 'FAILED — add exec.png manually (64x64 PNG)'}")

    # ── 12. Cover art ─────────────────────────────────────────────────────────
    print(f"\n[{game_id}.jpg]")
    time.sleep(0.3)
    art_path = os.path.join(dest, f"{game_id}.jpg")
    art_ok, art_source = download_cover_art(appid, game_name, art_path, sgdb_key)
    if art_ok:
        print(f"  Saved  : {art_source}")
    else:
        print(f"  FAILED — add {game_id}.jpg manually (640x360 JPG, no title text)")

    # ── 13. Summary ───────────────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print(f"  Created  : game-{game_id}/")
    print(f"  Template : {template_name}")
    print()

    src_check = open(index_path, encoding="utf-8").read()
    remaining = [
        m.group(1)
        for m in re.finditer(r'(?:const|let)\s+(\w+)\s*=\s*["\']XXX["\']', src_check)
    ]

    if remaining:
        print("  Fields still needing manual attention (XXX remaining):")
        for v in remaining:
            print(f"    - {v}")
    else:
        print("  All XXX fields resolved.")

    if epic_found and not pcgw_epic_url:
        print("\n  Note: Epic store page found but canonical URL not in PCGamingWiki.")
        print("        Add the correct URL as a comment on the EPICAPP_ID line manually.")

    missing_files = []
    if not icon_ok:
        missing_files.append("exec.png (64x64 PNG)")
    if not art_ok:
        missing_files.append(f"{game_id}.jpg (640x360 JPG, no title text)")
    if missing_files:
        print("\n  Files to add manually:")
        for f in missing_files:
            print(f"    - {f}")

    print(f"{'=' * 60}\n")

    # ── 14. Generate EXTENSION_EXPLAINED.md ───────────────────────────────────
    print("[generate_explained.js]")
    result = subprocess.run(
        ["node", "generate_explained.js", "--game", f"game-{game_id}"],
        cwd=REPO_ROOT, capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  EXTENSION_EXPLAINED.md written.\n")
    else:
        print(f"  FAILED — run manually: node generate_explained.js --game game-{game_id}")
        if result.stderr:
            print(f"  {result.stderr.strip()}\n")

    # ── 15. Update engine category lists ─────────────────────────────────────
    print("[categorize_games.py]")
    result = subprocess.run(
        ["python", "categorize_games.py", "--game", game_id],
        cwd=REPO_ROOT, capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  {result.stdout.strip()}\n")
    else:
        print(f"  FAILED — run manually: python categorize_games.py --game {game_id}")
        if result.stderr:
            print(f"  {result.stderr.strip()}\n")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Bootstrap a new Vortex game extension from a template.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            '  python new_extension.py --template template-unitybepinex "Hollow Knight"\n'
            "  python new_extension.py --template template-ue4-5game 1954200\n"
        ),
    )
    parser.add_argument(
        "--template", required=True, choices=TEMPLATES,
        help="Template to base the extension on",
    )
    parser.add_argument(
        "game",
        help="Game name (quoted) or Steam App ID",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Overwrite existing folder if it already exists",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Run all lookups and print what would be created, without writing any files",
    )
    args = parser.parse_args()
    create_extension(args.template, args.game, args.force, args.dry_run)


if __name__ == "__main__":
    main()
