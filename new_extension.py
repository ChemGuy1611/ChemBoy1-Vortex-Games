#!/usr/bin/env python3
"""
new_extension.py
----------------
Bootstraps a new Vortex game extension from a template.

Usage:
    python new_extension.py TEMPLATE "Game Name"
    python new_extension.py TEMPLATE STEAM_APP_ID
    python new_extension.py TEMPLATE "Game Name" --force
    python new_extension.py TEMPLATE "Game Name" --dry-run
    python new_extension.py TEMPLATE "Game Name" --no-images

Fills in all XXX fields it can resolve automatically from Steam, GOG, Epic,
and PCGamingWiki. Remaining XXX fields are reported at the end for manual entry.

Downloads exec.png (64x64, Steam CDN), a 640x360 cover art JPG with no title
text (SteamGridDB heroes if STEAMGRIDDB_API_KEY is set, else Steam
library_hero.jpg), and a 1920x1080 title image (SteamGridDB grids, requires
STEAMGRIDDB_API_KEY) saved to resources/title-images/.

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
import shutil
import argparse
import subprocess
import urllib.request
import urllib.parse
from datetime import date
from io import BytesIO
from PIL import Image
import setup_test_folder as stf

from vortex_utils import (
    REPO_ROOT, http_get, http_get_bytes,
    roman_to_arabic, arabic_to_roman, name_lookup_variants,
    lookup_pcgamingwiki, get_api_key,
)

TEMPLATES = [
    "template-anvilengine",
    "template-basic",
    "template-cobraengineACSE",
    "template-farcry",
    "template-frostbite",
    "template-godot",
    "template-masseffectandromeda",
    "template-reframework-fluffy",
    "template-reloaded2",
    "template-rpgmaker",
    "template-shinryu",
    "template-snowdropengine",
    "template-tfcinstaller-ue2-3",
    "template-ue4-5",
    "template-unity-umm",
    "template-unitybepinex",
    "template-unitymelonloaderbepinex-hybrid",
]

# Short names accepted on the command line (strip the "template-" prefix)
TEMPLATE_SHORT_NAMES = [t[len("template-"):] for t in TEMPLATES]

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
    # Method 1: Steam launch options (most reliable -full path available)
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
    except Exception:
        pass
    return None


# ── Store lookups ─────────────────────────────────────────────────────────────

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
    Only returns a result when the title genuinely matches -never falls back
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



def fetch_pcgw_availability(page_title):
    """Fetch PCGamingWiki page wikitext and check the Availability section for store presence.
    Returns dict: {'xbox': bool, 'xbox_url': str|None, 'epic_url': str|None, 'engine_version': str|None}.
    engine_version is a 4-part string like '5.4.4.0' parsed from {{Infobox game/row/engine|...|build=X.Y.Z}}."""
    result = {'xbox': False, 'xbox_url': None, 'epic_url': None, 'engine_version': None, 'unity_paths': {}}
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
        result['unity_paths'] = parse_unity_data_paths(wikitext)
    except Exception as e:
        print(f"    PCGamingWiki availability error: {e}")
    return result


def parse_unity_data_paths(wikitext):
    """
    Parse DEV_REGSTRING, GAME_REGSTRING, SAVE_FOLDERNAME, and CONFIG_FOLDERNAME
    from PCGamingWiki wikitext for Unity games that store data under AppData\\LocalLow.

    PCGW save/config entries look like:
      {{Game data/saves|Windows|{{p|userprofile}}\\AppData\\LocalLow\\Dev\\Game\\SavesFolder}}
      {{Game data/config|Windows|{{p|userprofile}}\\AppData\\LocalLow\\Dev\\Game\\ConfigFolder}}

    Returns dict with keys: dev_folder, game_folder, save_folder, config_folder.
    All values are str or None.
    """
    result = {'dev_folder': None, 'game_folder': None, 'save_folder': None, 'config_folder': None}

    def extract_windows_path(data_type):
        m = re.search(
            rf'\{{{{Game data/{data_type}\s*\|[^|]*Windows[^|]*\|([^}}]+)\}}}}',
            wikitext, re.IGNORECASE | re.DOTALL
        )
        return m.group(1).strip() if m else None

    def parse_locallow(path_str):
        """Return (dev, game, subfolder) from a LocalLow path string, or (None, None, None)."""
        if not path_str or 'locallow' not in path_str.lower():
            return None, None, None
        # Strip leading {{p|...}} token
        cleaned = re.sub(r'^\{\{p\|[^}]+\}\}', '', path_str).strip()
        parts = [p.strip() for p in re.split(r'[/\\]', cleaned) if p.strip()]
        try:
            idx = next(i for i, p in enumerate(parts) if p.lower() == 'locallow')
            dev   = parts[idx + 1] if idx + 1 < len(parts) else None
            game  = parts[idx + 2] if idx + 2 < len(parts) else None
            sub   = parts[idx + 3] if idx + 3 < len(parts) else None
            return dev, game, sub
        except StopIteration:
            return None, None, None

    save_path   = extract_windows_path('saves')
    config_path = extract_windows_path('config')

    dev, game, sub = parse_locallow(save_path)
    if dev:
        result['dev_folder']  = dev
        result['game_folder'] = game
        result['save_folder'] = sub

    dev2, game2, sub2 = parse_locallow(config_path)
    if dev2:
        if not result['dev_folder']:
            result['dev_folder']  = dev2
            result['game_folder'] = game2
        result['config_folder'] = sub2

    return result


# ── Assets ────────────────────────────────────────────────────────────────────

def download_exec_icon(appid, game_name, out_path):
    """Download and save a 64x64 exec.png.

    Tries in order:
    1. Steam CDN icon via exact appid match in SearchApps results
    2. SteamGridDB icons endpoint (requires STEAMGRIDDB_API_KEY env var)
    """
    # 1. Steam CDN -exact appid match only, no name-based fallback
    icon_url = steam_icon_search(appid, game_name)
    if icon_url:
        try:
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
            print(f"    Steam CDN error: {e}")

    # 2. SteamGridDB icons
    sgdb_key = os.environ.get("STEAMGRIDDB_API_KEY")
    if not sgdb_key:
        try:
            from winreg import OpenKey, QueryValueEx, HKEY_CURRENT_USER
            with OpenKey(HKEY_CURRENT_USER, "Environment") as reg_key:
                sgdb_key, _ = QueryValueEx(reg_key, "STEAMGRIDDB_API_KEY")
        except Exception:
            pass
    if sgdb_key:
        try:
            url = f"https://www.steamgriddb.com/api/v2/icons/steam/{appid}"
            resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
            icons = resp.get("data", [])
            if icons:
                img_data = http_get_bytes(icons[0]["url"])
                img = Image.open(BytesIO(img_data)).convert("RGB")
                img = img.resize((64, 64), Image.LANCZOS)
                img.save(out_path, "PNG")
                return True, "SteamGridDB icon"
        except Exception as e:
            print(f"    SteamGridDB icon error: {e}")

    return False, None


def download_cover_art(appid, game_name, out_path, sgdb_key=None):
    """Download and save a 640x360 cover art JPG with no title text.

    All sources used are strictly title-free. Sources with baked-in title text
    (Steam capsule, Steam header, SteamGridDB alternate/white_logo grids) are
    never used.

    Priority order:
    1. SteamGridDB 920x430 grid, no_logo style only -native aspect ratio, no text
    2. SteamGridDB heroes -title-free wide art, center-cropped from 3:1 to 16:9
    3. Steam library_hero.jpg -title-free wide art, center-cropped from 3:1 to 16:9
    """

    img_data = None
    source = None

    # 1. SteamGridDB 920x430 no_logo grids only -skip if style not available
    if sgdb_key:
        try:
            url = f"https://www.steamgriddb.com/api/v2/grids/steam/{appid}?dimensions=920x430&styles=no_logo"
            resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
            grids = resp.get("data", [])
            if grids:
                best = sorted(grids, key=lambda x: x.get("width", 0), reverse=True)[0]
                img_data = http_get_bytes(best["url"])
                source = "SteamGridDB grid 920x430 no_logo"
        except Exception as e:
            print(f"    SteamGridDB grid error: {e}")

    # 2. SteamGridDB heroes (title-free, wide art -requires crop)
    if not img_data and sgdb_key:
        try:
            url = f"https://www.steamgriddb.com/api/v2/heroes/steam/{appid}"
            resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
            heroes = resp.get("data", [])
            if heroes:
                best = sorted(heroes, key=lambda x: x.get("width", 0), reverse=True)[0]
                img_data = http_get_bytes(best["url"])
                source = f"SteamGridDB hero ({best.get('width')}x{best.get('height')}) [cropped]"
        except Exception as e:
            print(f"    SteamGridDB hero error: {e}")

    # 3. Steam library_hero.jpg (1920x620, title-free -requires crop)
    if not img_data:
        try:
            url = f"https://cdn.fastly.steamstatic.com/steam/apps/{appid}/library_hero.jpg"
            img_data = http_get_bytes(url)
            source = "Steam library_hero.jpg [cropped]"
        except Exception as e:
            print(f"    Steam library_hero error: {e}")

    if not img_data:
        return False, None

    img = Image.open(BytesIO(img_data)).convert("RGB")
    w, h = img.size

    # Crop to 16:9 if the source is wider than 16:9 (heroes and library_hero are ~3:1)
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


def download_title_image(appid, game_name, out_path, sgdb_key=None):
    """Download and save a 1920x1080 title image (with game logo/title text).

    Priority order:
    1. SteamGridDB hero + logo composite -hero as background, logo centered in
       the lower portion (Steam library convention). Requires STEAMGRIDDB_API_KEY.
       Heroes and logos prefer is_official=True; logos exclude white/black styles.
    2. SteamGridDB 920x430 grid (no style filter -usually has title text baked in).
       Prefers is_official=True, sorted by score. Requires STEAMGRIDDB_API_KEY.
    3. Steam capsule_616x353.jpg -official art, always has title text. No key needed.
    """

    result_img = None
    source = None

    def _en(items):
        """Keep only English/language-neutral items; fall back to all if none."""
        en = [i for i in items if i.get("language", "en") in ("en", "all")]
        return en if en else items

    def _pick(items, sort_key="score"):
        """Return the best official item if any exist, else best overall."""
        official = [i for i in items if i.get("is_official", False)]
        pool = official if official else items
        return sorted(pool, key=lambda x: x.get(sort_key, 0), reverse=True)[0]

    # ── 1. SteamGridDB hero + logo composite ──────────────────────────────────
    if sgdb_key:
        hero_data = None
        logo_data = None

        try:
            url = f"https://www.steamgriddb.com/api/v2/heroes/steam/{appid}"
            resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
            heroes = resp.get("data", [])
            if heroes:
                hero_data = http_get_bytes(_pick(_en(heroes), "width")["url"])
        except Exception as e:
            print(f"    SteamGridDB hero error: {e}")

        try:
            url = f"https://www.steamgriddb.com/api/v2/logos/steam/{appid}"
            resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
            logos = resp.get("data", [])
            if logos:
                # Prefer colored logos -exclude white and black styles
                colored = [l for l in _en(logos) if l.get("style", "") not in ("white", "black")]
                pool = colored if colored else _en(logos)
                logo_data = http_get_bytes(_pick(pool, "score")["url"])
        except Exception as e:
            print(f"    SteamGridDB logo error: {e}")

        if hero_data and logo_data:
            try:
                # Build hero background: crop to 16:9, resize to 1920x1080
                hero = Image.open(BytesIO(hero_data)).convert("RGB")
                w, h = hero.size
                tr = 1920 / 1080
                cr = w / h
                if cr > tr:
                    nw = int(h * tr)
                    hero = hero.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
                elif cr < tr:
                    nh = int(w / tr)
                    hero = hero.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
                hero = hero.resize((1920, 1080), Image.LANCZOS)

                # Scale logo: max 65% canvas width, 40% canvas height
                logo = Image.open(BytesIO(logo_data)).convert("RGBA")
                logo.thumbnail((int(1920 * 0.65), int(1080 * 0.40)), Image.LANCZOS)
                lw, lh = logo.size

                # Position: horizontally centered, bottom edge at 88% canvas height
                x = (1920 - lw) // 2
                y = int(1080 * 0.88) - lh

                hero.paste(logo, (x, y), mask=logo.split()[3])
                result_img = hero
                source = "SteamGridDB hero + logo composite"
            except Exception as e:
                print(f"    Composite error: {e}")

    # ── 2. SteamGridDB 920x430 grid (no style filter, official preferred) ────────
    if result_img is None and sgdb_key:
        try:
            url = f"https://www.steamgriddb.com/api/v2/grids/steam/{appid}?dimensions=920x430"
            resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
            grids = resp.get("data", [])
            if grids:
                raw = http_get_bytes(_pick(_en(grids), "score")["url"])
                result_img = Image.open(BytesIO(raw)).convert("RGB")
                source = "SteamGridDB grid 920x430 [upscaled]"
        except Exception as e:
            print(f"    SteamGridDB grid error: {e}")

    # ── 3. Steam capsule_616x353.jpg (official, always has title text) ─────────
    if result_img is None:
        try:
            url = f"https://cdn.fastly.steamstatic.com/steam/apps/{appid}/capsule_616x353.jpg"
            raw = http_get_bytes(url)
            result_img = Image.open(BytesIO(raw)).convert("RGB")
            source = "Steam capsule_616x353.jpg [upscaled]"
        except Exception as e:
            print(f"    Steam capsule error: {e}")

    if result_img is None:
        return False, None

    # Crop to 16:9 if needed, then resize to 1920x1080 (composite is already sized)
    if source != "SteamGridDB hero + logo composite":
        w, h = result_img.size
        tr = 1920 / 1080
        cr = w / h
        if cr > tr:
            nw = int(h * tr)
            result_img = result_img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        elif cr < tr:
            nh = int(w / tr)
            result_img = result_img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        result_img = result_img.resize((1920, 1080), Image.LANCZOS)

    result_img.save(out_path, "JPEG", quality=92)
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
    return re.sub(pattern, lambda m: m.group(1) + f' // {comment}\n', src)


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

def create_extension(template_name, game_input, force=False, dry_run=False, no_images=False):
    sgdb_key = get_api_key("STEAMGRIDDB_API_KEY")
    nexus_key = get_api_key("NEXUS_API_KEY")
    today = date.today().strftime("%Y-%m-%d")

    # ── Resolve Steam ID and canonical name ──────────────────────────────────
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

    # Strip trademark/copyright symbols that Steam sometimes includes in game names
    game_name = re.sub(r'[®™©]', '', game_name).strip()

    print(f"  Name     : {game_name}")
    print(f"  Steam ID : {appid}")

    nexus_domain = lookup_nexus_domain(game_name, nexus_key)
    if nexus_domain:
        game_id = nexus_domain
        print(f"  Game ID  : {game_id} (from Nexus Mods)")
    else:
        game_id = derive_game_id(game_name)
        print(f"  Game ID  : {game_id} (derived -verify Nexus domain manually)")

    # ── Check destination ─────────────────────────────────────────────────────
    dest = os.path.join(REPO_ROOT, f"game-{game_id}")
    if os.path.exists(dest) and not dry_run:
        if force:
            shutil.rmtree(dest)
        else:
            print(f"\n  ERROR: Folder already exists: {dest}")
            print("  Use --force to overwrite.")
            sys.exit(1)

    # ── Store IDs ─────────────────────────────────────────────────────────────
    print("\n[Store IDs]")
    time.sleep(0.3)
    gog_id = lookup_gog(game_name)
    print(f"  GOG      : {gog_id or 'not found'}")

    # ── SteamDB data, executable, demo ID, and UE code name ──────────────────
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
    epic_found = bool(availability.get('epic_url'))
    engine_version = availability['engine_version']
    print(f"  Epic     : {'found (set ID manually)' if epic_found else 'not found'}")
    print(f"  Xbox     : {'found (set ID manually)' if xbox_found else 'not found'}")
    if engine_version:
        print(f"  UE build : {engine_version}")

    # ── 6. Copy template folder ───────────────────────────────────────────────
    if dry_run:
        print(f"\n{'=' * 60}")
        print(f"  [DRY RUN] Would create: game-{game_id}/")
        print(f"  Template : {template_name}")
        print(f"  Steam ID : {appid}  |  GOG: {gog_id or 'N/A'}  |  Epic: {'yes' if epic_found else 'N/A'}  |  Xbox: {'yes' if xbox_found else 'N/A'}")
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
    # For Unity templates, populate registry/AppData path fields from PCGamingWiki save paths
    UNITY_TEMPLATES = {
        'template-unitybepinex',
        'template-unitymelonloaderbepinex-hybrid',
        'template-unity-umm',
    }
    if template_name in UNITY_TEMPLATES:
        up = availability.get('unity_paths', {})
        if up.get('dev_folder'):
            fields['DEV_REGSTRING']   = up['dev_folder']
        if up.get('game_folder'):
            fields['GAME_REGSTRING']  = up['game_folder']
        if up.get('save_folder'):
            fields['SAVE_FOLDERNAME'] = up['save_folder']
        if up.get('config_folder'):
            fields['CONFIG_FOLDERNAME'] = up['config_folder']
    # Direct EXEC/EXEC_NAME assignments (for templates that use a literal)
    if exec_filename:
        fields["EXEC"] = exec_filename
        fields["EXEC_NAME"] = exec_filename
        fields["EXEC_DEMO"] = None

    # ── 8. Apply substitutions to index.js ───────────────────────────────────
    index_path = os.path.join(dest, "index.js")
    with open(index_path, encoding="utf-8") as f:
        src = f.read()
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

    # ── exec.png ──────────────────────────────────────────────────────────────
    if no_images:
        print("\n[exec.png] Skipped (--no-images)")
    else:
        print("\n[exec.png]")
        time.sleep(0.3)
        icon_path = os.path.join(dest, "exec.png")
        icon_ok, icon_source = download_exec_icon(appid, game_name, icon_path)
        print(f"  {'Saved  : ' + icon_source if icon_ok else 'FAILED -add exec.png manually (64x64 PNG)'}")
        if icon_ok:
            os.startfile(icon_path)

    # ── Cover art ─────────────────────────────────────────────────────────────
    if no_images:
        print(f"\n[{game_id}.jpg] Skipped (--no-images)")
    else:
        print(f"\n[{game_id}.jpg]")
        time.sleep(0.3)
        art_path = os.path.join(dest, f"{game_id}.jpg")
        art_ok, art_source = download_cover_art(appid, game_name, art_path, sgdb_key)
        if art_ok:
            print(f"  Saved  : {art_source}")
            os.startfile(art_path)
        else:
            print(f"  FAILED -add {game_id}.jpg manually (640x360 JPG, no title text)")

    # ── Title image ───────────────────────────────────────────────────────────
    title_ok = False
    if no_images:
        print(f"\n[{game_id}_title.jpg] Skipped (--no-images)")
    else:
        print(f"\n[{game_id}_title.jpg]")
        title_dir = os.path.join(REPO_ROOT, "resources", "title-images")
        os.makedirs(title_dir, exist_ok=True)
        title_path = os.path.join(title_dir, f"{game_id}_title.jpg")
        title_ok, title_source = download_title_image(appid, game_name, title_path, sgdb_key)
        if title_ok:
            print(f"  Saved  : {title_source}")
        else:
            print(f"  FAILED -- add {game_id}_title.jpg manually to resources/title-images/ (1920x1080 JPG, with title text)")

    # ── Banner image ─────────────────────────────────────────────────────────
    banner_ok = False
    if no_images:
        print(f"\n[{game_id}_banner.jpg] Skipped (--no-images)")
    else:
        print(f"\n[{game_id}_banner.jpg]")
        banner_dir = os.path.join(REPO_ROOT, "resources", "banner-images")
        os.makedirs(banner_dir, exist_ok=True)
        banner_path = os.path.join(banner_dir, f"{game_id}_banner.jpg")
        from fetch_cover_art import download_banner_image
        banner_ok, banner_source = download_banner_image(appid, game_id, banner_path, sgdb_key)
        if banner_ok:
            print(f"  Saved  : {banner_source}")
        else:
            print(f"  FAILED -- add {game_id}_banner.jpg manually to resources/banner-images/")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print(f"  Created  : game-{game_id}/")
    print(f"  Template : {template_name}")
    print()

    with open(index_path, encoding="utf-8") as f:
        src_check = f.read()
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
    if not title_ok:
        missing_files.append(f"{game_id}_title.jpg (1920x1080 JPG, with title text) -> resources/title-images/")
    if not banner_ok:
        missing_files.append(f"{game_id}_banner.jpg (full-size hero JPG) -> resources/banner-images/")
    if missing_files:
        print("\n  Files to add manually:")
        for f in missing_files:
            print(f"    - {f}")

    print(f"{'=' * 60}\n")

    # ── Generate EXTENSION_EXPLAINED.md ───────────────────────────────────────
    print("[generate_explained.js]")
    result = subprocess.run(
        ["node", "generate_explained.js", game_id],
        cwd=REPO_ROOT, capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  EXTENSION_EXPLAINED.md written.\n")
    else:
        print(f"  FAILED -run manually: node generate_explained.js {game_id}")
        if result.stderr:
            print(f"  {result.stderr.strip()}\n")

    # ── Update engine category lists ─────────────────────────────────────────
    print("[categorize_games.py]")
    result = subprocess.run(
        ["python", "categorize_games.py", game_id],
        cwd=REPO_ROOT, capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  {result.stdout.strip()}\n")
    else:
        print(f"  FAILED -run manually: python categorize_games.py {game_id}")
        if result.stderr:
            print(f"  {result.stderr.strip()}\n")

    # ── Create test game folder ───────────────────────────────────────────────
    print("[setup_test_folder.py]")
    try:
        stf.setup(game_id)
    except Exception as exc:
        print(f"  FAILED -run manually: python setup_test_folder.py {game_id}")
        print(f"  {exc}\n")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Bootstrap a new Vortex game extension from a template.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Templates:\n  " + "\n  ".join(TEMPLATE_SHORT_NAMES) + "\n\n"
            "Examples:\n"
            '  python new_extension.py unitybepinex "Hollow Knight"\n'
            "  python new_extension.py ue4-5 1954200\n"
        ),
    )
    parser.add_argument(
        "template",
        choices=TEMPLATE_SHORT_NAMES,
        metavar="TEMPLATE",
        help=f"Template short name. One of: {', '.join(TEMPLATE_SHORT_NAMES)}",
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
    parser.add_argument(
        "--no-images", action="store_true",
        help="Skip downloading exec.png and cover art (useful when re-running on an existing extension)",
    )
    args = parser.parse_args()
    full_template = f"template-{args.template}"
    create_extension(full_template, args.game, args.force, args.dry_run, args.no_images)


if __name__ == "__main__":
    main()
