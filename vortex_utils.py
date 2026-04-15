"""
vortex_utils.py

Shared utility functions for Vortex extension developer scripts.
Centralizes common patterns: index.js parsing, name processing,
API key loading, HTTP helpers, PCGamingWiki lookups, egdata.app lookups,
and logging.

Usage:
    from vortex_utils import (
        REPO_ROOT, read_index_js, extract_game_id, extract_steamapp_id,
        extract_game_name, name_lookup_variants, lookup_pcgamingwiki,
        get_api_key, http_get, http_get_bytes, http_post_json,
        fetch_epic_app_id, add_to_discovery_ids, EGDATA_API,
        log_info, log_error, log_warn,
    )
"""

import json
import os
import re
import subprocess
import time
import urllib.request
import urllib.parse

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

PCGW_API = "https://www.pcgamingwiki.com/w/api.php"
EGDATA_API = "https://api.egdata.app"


# == Logging helpers ===========================================================

def log_info(game_id, msg):
    """Print an info message with standard [game_id] prefix."""
    print(f"  [{game_id}] {msg}")


def log_error(game_id, msg):
    """Print an error message with standard [game_id] prefix."""
    print(f"  [{game_id}] ERROR - {msg}")


def log_warn(game_id, msg):
    """Print a warning message with standard [game_id] prefix."""
    print(f"  [{game_id}] WARNING - {msg}")


# == HTTP helpers ==============================================================

def http_get(url, headers=None):
    """Fetch a URL and return the response body as a UTF-8 string."""
    req = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0", **(headers or {})}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8")


def http_get_bytes(url, headers=None):
    """Fetch a URL and return the response body as raw bytes."""
    req = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0", **(headers or {})}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read()


def http_post_json(url, data, headers=None):
    """POST a JSON-serializable dict to a URL and return the parsed JSON response."""
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/json",
            **(headers or {}),
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


# == API key loading ===========================================================

def get_api_key(key_name):
    """Load an API key by name from environment variables with Windows registry
    fallback. Checks os.environ first, then HKCU\\Environment, then
    HKLM\\...\\Environment. Returns the key string or None."""
    key = os.environ.get(key_name)
    if key:
        return key
    try:
        from winreg import OpenKey, QueryValueEx, HKEY_CURRENT_USER
        with OpenKey(HKEY_CURRENT_USER, "Environment") as reg_key:
            key, _ = QueryValueEx(reg_key, key_name)
        if key:
            return key
    except Exception:
        pass
    try:
        from winreg import OpenKey, QueryValueEx, HKEY_LOCAL_MACHINE
        with OpenKey(HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment") as reg_key:
            key, _ = QueryValueEx(reg_key, key_name)
        if key:
            return key
    except Exception:
        pass
    return None


# == index.js extraction =======================================================

def read_index_js(folder):
    """Read index.js from a game extension folder. Returns src string or None."""
    path = os.path.join(folder, "index.js")
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        return f.read()


def extract_game_id(src):
    """Extract GAME_ID value from index.js source."""
    m = re.search(r"(?:const|let)\s+GAME_ID\s*=\s*['\"]([^'\"]+)['\"]", src)
    return m.group(1) if m else None


def extract_steamapp_id(src):
    """Extract STEAMAPP_ID value from index.js source. Returns None if not found or null."""
    m = re.search(r"const\s+STEAMAPP_ID\s*=\s*['\"]?(\d+)['\"]?\s*;?", src)
    return m.group(1) if m else None


def extract_game_name(src):
    """Extract the game name from index.js source.
    Tries GAME_NAME constant first, then quoted 'name': in spec,
    then name: following id: GAME_ID in the context.registerGame call."""
    m = re.search(r"const\s+GAME_NAME\s*=\s*['\"]([^'\"]+)['\"]", src)
    if m:
        return m.group(1)
    m = re.search(r'"name":\s*(["\'])(.+?)\1', src)
    if m:
        return m.group(2)
    m = re.search(r'\bid\s*:\s*GAME_ID\b.+?\bname\s*:\s*(["\'])(.+?)\1', src, re.DOTALL)
    return m.group(2) if m else None


# == Name processing ===========================================================

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
    Includes the original, title-cased (for all-caps names), roman<->arabic
    numeral alternates, and edition-suffix-stripped variants of all the above.
    """
    candidates = [game_name]

    # Title-case variant: covers all-caps names ("FINAL FANTASY TACTICS") and
    # names with lowercase prepositions ("Escape from Duckov" -> "Escape From Duckov")
    titled = game_name.title()
    if titled != game_name:
        candidates.append(titled)

    # Arabic <-> Roman numeral alternates
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


# == PCGamingWiki lookup =======================================================

_pcgw_cache = {}

def lookup_pcgamingwiki(game_name, debug=False):
    """
    Return (page_url, page_title) for the game, or (None, None).
    Results are cached per game_name for the session.
    Stage 1: direct title lookup with redirect following for exact matches.
    Stage 2: title search fallback for disambiguation suffixes like "Keeper (video game)".

    Set debug=True to print raw search results and match status.
    """
    if game_name in _pcgw_cache:
        return _pcgw_cache[game_name]

    norm = lambda s: s.lower().replace('\u2019', "'").replace(':', '').replace(' - ', ' ').replace('  ', ' ').strip()
    name_variants = name_lookup_variants(game_name)

    try:
        # Stage 1: direct title lookup (handles exact matches and redirects)
        for variant in name_variants:
            time.sleep(0.2)
            url = (
                f"{PCGW_API}?action=query&titles={urllib.parse.quote(variant)}"
                "&redirects=1&format=json"
            )
            data = json.loads(http_get(url))
            pages = data.get("query", {}).get("pages", {})
            for page_id, page in pages.items():
                if page_id != "-1" and "missing" not in page:
                    title = page["title"]
                    if debug:
                        print(f"    [debug] direct lookup: {repr(variant)} -> {repr(title)}")
                    slug = urllib.parse.quote(title.replace(" ", "_"))
                    page_url = f"https://www.pcgamingwiki.com/wiki/{slug}"
                    _pcgw_cache[game_name] = (page_url, title)
                    return page_url, title

        # Stage 2: title search fallback for disambiguation suffixes
        time.sleep(0.2)
        url = (
            f"{PCGW_API}?action=query&list=search&srsearch={urllib.parse.quote(game_name)}"
            "&srwhat=title&format=json&srlimit=20"
        )
        data = json.loads(http_get(url))
        results = data.get("query", {}).get("search", [])
        name_variants_norm = {norm(v) for v in name_variants}

        if debug:
            print(f"    [debug] search fallback: {repr(game_name)} variants={name_variants_norm}")
            for result in results:
                t = norm(result["title"])
                match = any(t.startswith(v + " (") for v in name_variants_norm)
                print(f"    [debug]   result: {repr(result['title'])}  match={match}")

        title = None
        for result in results:
            t = norm(result["title"])
            if t in name_variants_norm or any(t.startswith(v + " (") for v in name_variants_norm):
                title = result["title"]
                break

        if not title:
            _pcgw_cache[game_name] = (None, None)
            return None, None

        # Fetch wikitext to check for redirect on disambiguation-matched pages
        time.sleep(0.2)
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
        page_url = f"https://www.pcgamingwiki.com/wiki/{slug}"
        _pcgw_cache[game_name] = (page_url, title)
        return page_url, title

    except Exception as e:
        if debug:
            print(f"    [debug] PCGamingWiki lookup error: {e}")
        _pcgw_cache[game_name] = (None, None)
        return None, None


# == egdata.app helpers ========================================================

def fetch_epic_app_id(game_name):
    """Fetch the EPICAPP_ID for a game from egdata.app using a two-step chain.

    Step 1: POST /search with {"title": game_name, "offerType": "BASE_GAME", "limit": 1}
            -> elements[0].id (offer ID)
    Step 2: GET /offers/{offer_id}/items
            -> find item with entitlementType == "EXECUTABLE"
            -> return releaseInfo[0].appId

    Returns the appId string, or None if not found or on any error.
    """
    try:
        result = http_post_json(
            f"{EGDATA_API}/search",
            {"title": game_name, "offerType": "BASE_GAME", "limit": 1},
        )
        elements = result.get("elements", [])
        if not elements:
            return None
        offer_id = elements[0].get("id")
        if not offer_id:
            return None
    except Exception:
        return None

    try:
        time.sleep(0.3)
        items = json.loads(http_get(f"{EGDATA_API}/offers/{offer_id}/items"))
        for item in items:
            if item.get("entitlementType") == "EXECUTABLE":
                for release in item.get("releaseInfo", []):
                    app_id = release.get("appId")
                    if app_id:
                        return app_id
    except Exception:
        return None

    return None


# == JS source helpers =========================================================

def add_to_discovery_ids(src):
    """Add store ID variables to DISCOVERY_IDS_ACTIVE as needed.

    Reads each store ID constant directly from src. A variable is added only
    if its current value is a real resolved ID (not null, '', or 'XXX') and
    it is not already present in the array.

    Handled variables (in order): STEAMAPP_ID_DEMO, GOGAPP_ID, EPICAPP_ID.

    Returns the updated source string.
    """
    def _append(s, var_name):
        m = re.search(r'const\s+DISCOVERY_IDS_ACTIVE\s*=\s*\[([^\]]*)\]', s)
        if not m or var_name in m.group(1):
            return s
        return re.sub(
            r'(const\s+DISCOVERY_IDS_ACTIVE\s*=\s*\[[^\]]*?)(\s*\])',
            rf'\1, {var_name}\2',
            s,
            count=1,
        )

    def _has_real_value(s, var_name):
        m = re.search(
            rf'(?:const|let)\s+{re.escape(var_name)}\s*=\s*(.+?)(?:\s*;|\s*//|$)',
            s, re.MULTILINE,
        )
        if not m:
            return False
        v = m.group(1).strip()
        return not (v == "null"
                    or re.match(r'^["\']["\']$', v)
                    or re.match(r'^["\']XXX["\']$', v))

    for var in ("STEAMAPP_ID_DEMO", "GOGAPP_ID", "EPICAPP_ID"):
        if _has_real_value(src, var):
            src = _append(src, var)

    return src


def _find_fn_end(src, fn_match_end):
    """Return index just past the closing '}' of the JS function whose opening
    '{' is at fn_match_end - 1. Returns -1 if the brace is never closed."""
    brace_depth = 0
    idx = fn_match_end - 1  # position of the opening '{'
    while idx < len(src):
        if src[idx] == '{':
            brace_depth += 1
        elif src[idx] == '}':
            brace_depth -= 1
            if brace_depth == 0:
                return idx + 1
        idx += 1
    return -1


# Standard context.registerAction entries injected by new_template.py and patch_extensions.py.
# Each tuple: (label, commented_out: bool, code: str)
REGISTER_ACTIONS = [
    (
        'Open Config Folder',
        True,  # commented out by default
        "  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {\n"
        "    util.opn(CONFIG_PATH).catch(() => null);\n"
        "    }, () => {\n"
        "      const state = context.api.getState();\n"
        "      const gameId = selectors.activeGameId(state);\n"
        "      return gameId === GAME_ID;\n"
        "  }); //*/\n",
    ),
    (
        'Open Save Folder',
        True,  # commented out by default
        "  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {\n"
        "    util.opn(SAVE_PATH).catch(() => null);\n"
        "    }, () => {\n"
        "      const state = context.api.getState();\n"
        "      const gameId = selectors.activeGameId(state);\n"
        "      return gameId === GAME_ID;\n"
        "  }); //*/\n",
    ),
    (
        'Open PCGamingWiki Page',
        False,
        "  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open PCGamingWiki Page', () => {\n"
        "    util.opn(PCGAMINGWIKI_URL).catch(() => null);\n"
        "  }, () => {\n"
        "    const state = context.api.getState();\n"
        "    const gameId = selectors.activeGameId(state);\n"
        "    return gameId === GAME_ID;\n"
        "  });\n",
    ),
    (
        'View Changelog',
        False,
        "  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {\n"
        "    const openPath = path.join(__dirname, 'CHANGELOG.md');\n"
        "    util.opn(openPath).catch(() => null);\n"
        "    }, () => {\n"
        "      const state = context.api.getState();\n"
        "      const gameId = selectors.activeGameId(state);\n"
        "      return gameId === GAME_ID;\n"
        "  });\n",
    ),
    (
        'Submit Bug Report',
        False,
        "  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Submit Bug Report', () => {\n"
        "    util.opn(`${EXTENSION_URL}?tab=bugs`).catch(() => null);\n"
        "  }, () => {\n"
        "    const state = context.api.getState();\n"
        "    const gameId = selectors.activeGameId(state);\n"
        "    return gameId === GAME_ID;\n"
        "  });\n",
    ),
    (
        'Open Downloads Folder',
        False,
        "  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {\n"
        "    util.opn(DOWNLOAD_FOLDER).catch(() => null);\n"
        "  }, () => {\n"
        "    const state = context.api.getState();\n"
        "    const gameId = selectors.activeGameId(state);\n"
        "    return gameId === GAME_ID;\n"
        "  });\n",
    ),
]


# == Node / repo helpers =======================================================

def run_generate_explained(game_id):
    """Run generate_explained.js for game_id. Returns (ok: bool, stderr: str)."""
    result = subprocess.run(
        ["node", "generate_explained.js", game_id],
        cwd=REPO_ROOT, capture_output=True, text=True
    )
    return result.returncode == 0, result.stderr.strip()


def iter_game_folders(target_game_ids=None):
    """Yield (folder, game_id, src) for every game-* extension folder.
    If target_game_ids is a non-empty collection, only those game IDs are yielded."""
    for entry in sorted(os.listdir(REPO_ROOT)):
        folder = os.path.join(REPO_ROOT, entry)
        if not os.path.isdir(folder):
            continue
        if not entry.startswith("game-"):
            continue
        src = read_index_js(folder)
        if not src:
            continue
        game_id = extract_game_id(src)
        if not game_id:
            continue
        if target_game_ids and game_id not in target_game_ids:
            continue
        yield folder, game_id, src
