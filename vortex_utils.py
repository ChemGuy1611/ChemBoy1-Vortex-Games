"""
vortex_utils.py

Shared utility functions for Vortex extension developer scripts.
Centralizes common patterns: index.js parsing, name processing,
API key loading, HTTP helpers, PCGamingWiki lookups, egdata.app lookups,
and logging.

Usage:
    from vortex_utils import (
        REPO_ROOT, PCGW_API, EGDATA_API,
        TITLE_IMAGES_DIR, BANNER_IMAGES_DIR, LISTS_DIR,
        GUI_FLAGS_PATH, GUI_STATS_PATH,
        GAME_PREFIX, TEMPLATE_PREFIX, VORTEX_PLUGINS_DIR,
        read_index_js, write_index_js,
        extract_game_id, extract_steamapp_id, has_real_steamapp_id,
        extract_game_name, extract_extension_url, extract_file_group_id,
        sanitize_game_name, normalize_game_name,
        roman_to_arabic, arabic_to_roman,
        name_lookup_variants, lookup_pcgamingwiki,
        get_api_key, http_get, http_get_bytes, http_get_json, http_post_json,
        nexus_v3_get, nexus_v3_post_json,
        fetch_epic_app_id, add_to_discovery_ids,
        const_value, is_unset, is_missing, set_or_insert, replace_const_rhs,
        XXX_PATTERN, is_placeholder_value, is_real_value, find_placeholder_vars,
        const_decl_match, const_array_value,
        find_js_function,
        update_index_header, inject_register_actions,
        find_fn_end, find_fn_body, REGISTER_ACTIONS,
        read_info_json, make_info_json, make_changelog, parse_changelog_latest,
        bump_semver, prepend_changelog_entry,
        mutate_index_js, mutate_text_file, read_json, write_json_atomic,
        read_gui_stats, write_gui_stats,
        SEMVER_PATTERN, is_valid_semver,
        list_game_ids, iter_game_folders, iter_steam_image_targets, iter_repo_scripts,
        run_concurrent_batch, report_download_results, retry_failed_downloads,
        dry_prefix, log_dry, print_run_summary, print_count_summary, resize_images_to,
        build_arg_parser, assert_is_game_id, report_node_check,
        node_check, node_check_source, eslint_check,
        run_generate_explained, run_generate_explained_batch,
        get_discovery_ids, detect_engine, detect_stores,
        validate_index_js,
        log_info, log_error, log_warn,
        find_vortex_exe, safe_windows_dirname,
        safe_rmtree, touch_empty, find_vortex_plugin_folder,
        normalize_target_ids, read_id_list, write_id_list, is_load_order_game,
        parse_nexus_mod_url, nexus_list_games, nexus_get_mod,
        download_exec_icon, download_cover_art,
        download_title_image, download_banner_image,
        write_text_atomic, open_in_default_app,
        run_script, load_vortex_manifest,
        resize_pngs_in_dirs, build_js_symbol_table,
        list_template_names, iter_extension_folders,
    )
"""

import argparse
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import certifi as _certifi
    _SSL_CTX_NEXUS = ssl.create_default_context(cafile=_certifi.where())
except ImportError:
    _SSL_CTX_NEXUS = ssl.create_default_context()

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

PCGW_API    = "https://www.pcgamingwiki.com/w/api.php"
EGDATA_API  = "https://api.egdata.app"

TITLE_IMAGES_DIR  = os.path.join(REPO_ROOT, "resources", "title-images")
BANNER_IMAGES_DIR = os.path.join(REPO_ROOT, "resources", "banner-images")
LISTS_DIR         = os.path.join(REPO_ROOT, "resources", "lists")

# Title-image logo composite: logo is scaled to this fraction of the image
# width (upscaled if the native logo is smaller), capped at the height fraction.
TITLE_LOGO_WIDTH_FRAC  = 0.50
TITLE_LOGO_HEIGHT_FRAC = 0.40

GUI_FLAGS_PATH = os.path.join(REPO_ROOT, "vortex_gui_flags.json")
GUI_STATS_PATH = os.path.join(REPO_ROOT, "vortex_gui_nexus_stats.json")

GAME_PREFIX     = "game-"
TEMPLATE_PREFIX = "template-"

VORTEX_PLUGINS_DIR = os.environ.get("VORTEX_PLUGINS_DIR", r"C:\ProgramData\vortex\plugins")


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


def log_dry(msg):
    """Print a dry-run message without a game_id prefix."""
    print(f"[DRY RUN] {msg}")


# == HTTP helpers ==============================================================

_HTTP_TIMEOUT = 15  # seconds for all urllib urlopen calls
_RETRY_DELAYS = (2, 4)  # seconds between attempts (2 retries after initial try)


def _is_retryable(exc):
    """Return True for transient HTTP errors worth retrying (429, 5xx, network)."""
    if isinstance(exc, urllib.error.HTTPError):
        return exc.code == 429 or exc.code >= 500
    if isinstance(exc, urllib.error.URLError):
        return True
    return False


def _execute_with_retry(fn, *, respect_retry_after=False):
    """Call fn(), retrying on transient failures with exponential back-off.

    If respect_retry_after=True and fn raises HTTPError 429 with a Retry-After
    header, that delay is honored on top of the base back-off delay."""
    last_exc = None
    for attempt, delay in enumerate([0] + list(_RETRY_DELAYS)):
        if attempt:
            time.sleep(delay)
        try:
            return fn()
        except Exception as exc:
            if not _is_retryable(exc):
                raise
            if (respect_retry_after
                    and isinstance(exc, urllib.error.HTTPError)
                    and exc.code == 429
                    and attempt < len(_RETRY_DELAYS)):
                try:
                    ra = int(exc.headers.get("Retry-After") or "0")
                    if ra > delay:
                        time.sleep(ra - delay)
                except (ValueError, TypeError):
                    pass
            last_exc = exc
    raise last_exc


def http_get(url, headers=None):
    """Fetch a URL and return the response body as a UTF-8 string.
    Retries up to 2 times on 429 / 5xx / network errors (2 s, 4 s delays)."""
    def _do():
        req = urllib.request.Request(
            url, headers={"User-Agent": "Mozilla/5.0", **(headers or {})}
        )
        with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:
            return resp.read().decode("utf-8")
    return _execute_with_retry(_do)


def http_get_bytes(url, headers=None):
    """Fetch a URL and return the response body as raw bytes.
    Retries up to 2 times on 429 / 5xx / network errors (2 s, 4 s delays)."""
    def _do():
        req = urllib.request.Request(
            url, headers={"User-Agent": "Mozilla/5.0", **(headers or {})}
        )
        with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:
            return resp.read()
    return _execute_with_retry(_do)


def http_post_json(url, data, headers=None):
    """POST a JSON-serializable dict to a URL and return the parsed JSON response.
    Retries up to 2 times on 429 / 5xx / network errors (2 s, 4 s delays)."""
    def _do():
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
        with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    return _execute_with_retry(_do)


def http_get_json(url, headers=None):
    """Fetch a URL and return the parsed JSON response body.
    Retries up to 2 times on 429 / 5xx / network errors (2 s, 4 s delays)."""
    return json.loads(http_get(url, headers))


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


def write_index_js(folder, src):
    """Write src to index.js in a game extension folder (atomic via tmp + os.replace)."""
    dst = os.path.join(folder, "index.js")
    tmp = dst + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(src)
    os.replace(tmp, dst)


def extract_game_id(src):
    """Extract GAME_ID value from index.js source."""
    m = re.search(r"(?:const|let)\s+GAME_ID\s*=\s*['\"]([^'\"]+)['\"]", src)
    return m.group(1) if m else None


def extract_steamapp_id(src):
    """Extract STEAMAPP_ID value from index.js source. Returns None if not found or null."""
    m = re.search(r"(?:const|let)\s+STEAMAPP_ID\s*=\s*['\"]?(\d+)['\"]?\s*;?", src)
    return m.group(1) if m else None


def has_real_steamapp_id(src):
    """Return True if STEAMAPP_ID is a real numeric value (not null or a placeholder)."""
    if const_value(src, "STEAMAPP_ID") == "null":
        return False
    return bool(extract_steamapp_id(src))


def extract_game_name(src):
    """Extract the game name from index.js source.
    Tries GAME_NAME constant first, then quoted 'name': in spec,
    then name: following id: GAME_ID in the context.registerGame call."""
    m = re.search(r"const\s+GAME_NAME\s*=\s*(['\"])(.*?)\1", src)
    if m:
        return m.group(2)
    m = re.search(r'"name":\s*(["\'])(.+?)\1', src)
    if m:
        return m.group(2)
    m = re.search(r'\bid\s*:\s*GAME_ID\b.+?\bname\s*:\s*(["\'])(.+?)\1', src, re.DOTALL)
    return m.group(2) if m else None


def extract_extension_url(src):
    """Return the EXTENSION_URL value from index.js source, or None if unset/XXX/non-Nexus."""
    m = re.search(r'const\s+EXTENSION_URL\s*=\s*["\'\`](.+?)["\'\`]', src)
    if not m:
        return None
    val = m.group(1)
    return val if "nexusmods.com" in val else None


def extract_file_group_id(src):
    """Return the FILE_GROUP_ID integer from index.js source, or None if unset/non-numeric.

    Optional escape hatch: when a mod's v3 file-update-groups list endpoint 404s
    (files uploaded via the web/v1 flow are not registered in the v3 list), this
    constant lets the uploader POST directly to /v3/mod-file-update-groups/{id}/versions.
    """
    m = re.search(r'const\s+FILE_GROUP_ID\s*=\s*(\d+)\b', src)
    return int(m.group(1)) if m else None


def sanitize_game_name(name):
    """Strip trademark/copyright symbols and normalize whitespace from a game name."""
    name = re.sub(r'[®™©]', '', name)
    return ' '.join(name.split())


def normalize_game_name(s):
    """Lowercase + normalize punctuation for fuzzy title comparison.
    Strips right-quotes, colons, ' - ' separators, underscores, extra whitespace, and normalizes 40,000 -> 40K."""
    return (s.replace('40,000', '40K')
             .lower()
             .replace('\u2019', "'")
             .replace(':', '')
             .replace('_', ' ')
             .replace(' - ', ' ')
             .replace('  ', ' ')
             .strip())


# == Name processing ===========================================================

_ROMAN = [
    (r'\bXII\b', '12'), (r'\bVIII\b', '8'), (r'\bVII\b', '7'), (r'\bVI\b', '6'),
    (r'\bIX\b', '9'), (r'\bIV\b', '4'), (r'\bXI\b', '11'),
    (r'\bIII\b', '3'), (r'\bII\b', '2'), (r'\bX\b', '10'),
    (r'\bV\b', '5'),
]

_ARABIC_TO_ROMAN = [
    ('12', 'XII'), ('11', 'XI'), ('10', 'X'), ('9', 'IX'), ('8', 'VIII'),
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
    if game_name in _pcgw_cache and not debug:
        return _pcgw_cache[game_name]

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
        name_variants_norm = {normalize_game_name(v) for v in name_variants}

        if debug:
            print(f"    [debug] search fallback: {repr(game_name)} variants={name_variants_norm}")
            for result in results:
                t = normalize_game_name(result["title"])
                match = any(t.startswith(v + " (") for v in name_variants_norm)
                print(f"    [debug]   result: {repr(result['title'])}  match={match}")

        title = None
        for result in results:
            t = normalize_game_name(result["title"])
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

    Returns (app_id, offer_id) tuple, or (None, None) if not found or on any error.
    """
    try:
        result = http_post_json(
            f"{EGDATA_API}/search",
            {"title": game_name, "offerType": "BASE_GAME", "limit": 1},
        )
        elements = result.get("elements", [])
        if not elements:
            return None, None
        offer_id = elements[0].get("id")
        if not offer_id:
            return None, None
    except Exception:
        return None, None

    try:
        time.sleep(0.3)
        items = json.loads(http_get(f"{EGDATA_API}/offers/{offer_id}/items"))
        for item in items:
            if item.get("entitlementType") == "EXECUTABLE":
                for release in item.get("releaseInfo", []):
                    app_id = release.get("appId")
                    if app_id:
                        return app_id, offer_id
    except Exception:
        return None, None

    return None, None


# == JS source helpers =========================================================

def const_value(src, var_name):
    """Return the raw RHS of a const/let declaration, or None if absent.
    E.g. returns '"XXX"', 'null', '"https://..."'."""
    m = re.search(
        rf'(?:const|let)\s+{re.escape(var_name)}\s*=\s*(.+?)(?:\s*;|\s+//|$)',
        src, re.MULTILINE,
    )
    return m.group(1).strip() if m else None


def is_unset(value_str):
    """Return True if a const RHS value is "XXX" or 'XXX' (needs filling in)."""
    return value_str is not None and bool(re.match(r'^["\']XXX["\']$', value_str))


def is_missing(src, var_name):
    """Return True if no const/let declaration for var_name exists in src."""
    return not re.search(rf'(?:const|let)\s+{re.escape(var_name)}\s*=', src)


def set_or_insert(src, var_name, value, comment=None):
    """Replace the 'XXX' value for var_name, or insert the declaration before
    `const spec = {` if var_name is missing. value is a Python string (will be
    JSON-quoted in the output). comment is an optional trailing // comment."""
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    comment_str = f" //{comment}" if comment else ""
    new_line = f'const {var_name} = "{escaped}";{comment_str}'
    pattern = rf'((?:const|let)\s+{re.escape(var_name)}\s*=\s*)["\']XXX["\']([^;\n]*;?)'
    if re.search(pattern, src):
        return re.sub(pattern, rf'\1"{escaped}"\2', src)
    insert_marker = re.search(r'^const\s+spec\s*=\s*\{', src, re.MULTILINE)
    if insert_marker:
        pos = insert_marker.start()
        return src[:pos] + new_line + "\n" + src[pos:]
    return src + "\n" + new_line + "\n"


def get_discovery_ids(src):
    """Parse the variable names referenced in the spec's discovery.ids array.
    Returns a list of variable name strings (e.g. ["STEAMAPP_ID", "EAAPP_ID"]).
    Falls back to ["STEAMAPP_ID"] if the block cannot be parsed.
    Strips JS comments so commented-out IDs are excluded."""
    m = re.search(r'"discovery"\s*:\s*\{.*?"ids"\s*:\s*\[([^\]]*)\]', src, re.DOTALL)
    if not m:
        return ['STEAMAPP_ID']
    ids_block = m.group(1)
    ids_block = re.sub(r'/\*.*?\*/', '', ids_block, flags=re.DOTALL)
    ids_block = re.sub(r'//[^\n]*', '', ids_block)
    names = re.findall(r'\b([A-Z_][A-Z0-9_]+)\b', ids_block)
    return names if names else ['STEAMAPP_ID']


def add_to_discovery_ids(src):
    """Add store ID variables to DISCOVERY_IDS_ACTIVE as needed.

    Reads each store ID constant directly from src. A variable is added only
    if its current value is a real resolved ID (not null, '', or 'XXX') and
    it is not already present in the array.

    Handled variables (in order): STEAMAPP_ID_DEMO, GOGAPP_ID, EPICAPP_ID, XBOXAPP_ID, UPLAYAPP_ID, EAAPP_ID.

    Returns the updated source string.
    """
    def _append(s, var_name):
        m = re.search(r'const\s+DISCOVERY_IDS_ACTIVE\s*=\s*\[([^\]]*)\]', s)
        if not m or re.search(rf'\b{re.escape(var_name)}\b', m.group(1)):
            return s
        return re.sub(
            r'(const\s+DISCOVERY_IDS_ACTIVE\s*=\s*\[[^\]]*?)(\s*\])',
            rf'\1, {var_name}\2',
            s,
            count=1,
        )

    def _has_real_value(s, var_name):
        v = const_value(s, var_name)
        return is_real_value(v)

    for var in ("STEAMAPP_ID_DEMO", "GOGAPP_ID", "EPICAPP_ID", "XBOXAPP_ID", "UPLAYAPP_ID", "EAAPP_ID"):
        if _has_real_value(src, var):
            src = _append(src, var)

    return src


def find_fn_end(src, fn_match_end):
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
# Each tuple: (label, commented_out: bool, code: str[, detect_key: str])
# detect_key overrides the default exact-label check used to decide whether the action already exists.
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
        'Open Config',  # match any 'Open Config ...' variant
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
        'Open Save',  # match any 'Open Save ...' variant
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


def find_fn_body(src, func_start):
    """Return (body_start, body_end) where src[body_start:body_end] is the function
    body content between braces (exclusive). func_start is the index of the function
    declaration keyword. Returns (None, None) on failure."""
    brace_pos = src.find('{', func_start)
    if brace_pos == -1:
        return None, None
    depth = 0
    for i in range(brace_pos, len(src)):
        if src[i] == '{':
            depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0:
                return brace_pos + 1, i
    return None, None


# == Extended JS source helpers ================================================

# Canonical placeholder pattern: "XXX", 'XXX', "XXX.exe", "XXX_Demo", etc.
XXX_PATTERN = re.compile(r"""^["']XXX(?:[._][A-Za-z0-9]+)*["']$""")


def is_placeholder_value(rhs):
    """Return True if rhs is a placeholder value ("XXX", "XXX.exe", "XXX_Demo", etc.)."""
    if rhs is None:
        return False
    return bool(XXX_PATTERN.match(rhs.strip()))


def is_real_value(v):
    """Return True if v is a filled-in, non-empty, non-placeholder value.

    Returns False for: None, empty string, quoted empty string, 'XXX*' placeholders,
    'null', 'N/A', and JS template refs like '${...}'."""
    if v is None:
        return False
    s = str(v).strip()
    if not s or s in ("null", "N/A"):
        return False
    if re.match(r'^["\']["\']$', s):
        return False
    if is_placeholder_value(s):
        return False
    if s.startswith('${'):
        return False
    return True


def find_placeholder_vars(src):
    """Return a list of const/let variable names whose RHS is a placeholder value.

    A placeholder is any value matched by is_placeholder_value (XXX*, N/A, etc.)
    or is_unset. Useful for reporting leftover unset fields after extension creation."""
    found = []
    for m in re.finditer(
        r'^[ \t]*(?:const|let)\s+(\w+)\s*=\s*(["\'][^"\']*["\'])',
        src, re.MULTILINE,
    ):
        rhs = m.group(2)
        if is_placeholder_value(rhs) or is_unset(rhs):
            found.append(m.group(1))
    return found


def const_decl_match(src, name):
    """Return the re.Match for the const/let declaration line of name, or None.

    Useful for line-position edits — m.start()/m.end() give the declaration bounds."""
    return re.search(
        rf'^[ \t]*(?:const|let)\s+{re.escape(name)}\s*=\s*.+?(?:\s*;|\s*//|$)',
        src, re.MULTILINE,
    )


def _scan_to_close(src, open_pos, open_ch, close_ch):
    """Return content between open_ch and close_ch starting at open_pos using depth tracking.
    Returns None if unbalanced."""
    depth = 0
    start = None
    for i in range(open_pos, len(src)):
        if src[i] == open_ch:
            depth += 1
            if start is None:
                start = i + 1
        elif src[i] == close_ch:
            depth -= 1
            if depth == 0:
                return src[start:i]
    return None


def const_array_value(src, name):
    """Return the raw array content (between [ and ]) for `const NAME = [...]`.
    Uses bracket-depth scanning to handle nested arrays. Returns None if not found."""
    m = re.search(rf'(?:const|let)\s+{re.escape(name)}\s*=\s*\[', src)
    if not m:
        return None
    return _scan_to_close(src, m.end() - 1, '[', ']')



def find_js_function(src, name):
    """Return (fn_start, body_start, body_end) for the named JS function.

    fn_start: start of the function keyword (or const/let for arrow functions).
    body_start: index just after the opening '{'.
    body_end: index of the closing '}'.
    Returns (None, None, None) if not found."""
    m = re.search(rf'(?:async\s+)?function\s+{re.escape(name)}\s*\(', src)
    if not m:
        m = re.search(
            rf'(?:const|let)\s+{re.escape(name)}\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>\s*\{{',
            src,
        )
        if not m:
            return None, None, None
    fn_start = m.start()
    body_start, body_end = find_fn_body(src, m.start())
    return fn_start, body_start, body_end


def update_index_header(src, *, name=None, version=None, date=None):
    """Update Name, Version, and/or Date fields in the index.js header comment block.
    Pass None to leave a field unchanged. Returns updated source string."""
    if name is not None:
        src = re.sub(
            r'^([/*\s]*Name:\s*).+?(\s+Vortex Extension)',
            rf'\g<1>{name}\g<2>', src, flags=re.MULTILINE,
        )
    if version is not None:
        src = re.sub(r'^([/*\s]*Version:\s*)\S+', rf'\g<1>{version}', src, flags=re.MULTILINE)
    if date is not None:
        src = re.sub(r'^([/*\s]*Date:\s*)\S+', rf'\g<1>{date}', src, flags=re.MULTILINE)
    return src


def inject_register_actions(src):
    """Inject missing standard context.registerAction calls into applyGame().
    Returns (new_src, missing_labels) where missing_labels is a list of the
    injected action label strings (empty list if nothing was injected)."""
    m = re.search(r'\nfunction applyGame\b[^{]*\{|\nasync function applyGame\b[^{]*\{', src)
    if not m:
        return src, []
    fn_end = find_fn_end(src, m.end())
    if fn_end == -1:
        return src, []
    has_combined = 'Open Config/Save' in src
    missing_code = []
    missing_labels = []
    for label, _commented, code, *rest in REGISTER_ACTIONS:
        detect_key = rest[0] if rest else f"'{label}'"
        if detect_key not in src:
            if has_combined and label in ('Open Config Folder', 'Open Save Folder'):
                continue
            missing_code.append(code)
            missing_labels.append(label)
    if not missing_labels:
        return src, []
    block = '\n'
    if '//register actions' not in src:
        block += '  //register actions\n'
    block += ''.join(missing_code)
    return src[:fn_end - 1] + block + src[fn_end - 1:], missing_labels


# == JS symbol table ===========================================================

def build_js_symbol_table(src):
    """Build a simple {name: value} dict of resolved string constants from index.js source.

    Handles:
      - String literals:   const FOO = "bar"  or  const FOO = 'bar'
      - Template literals: const FOO = `${OTHER}suffix`
      - path.join():       const FOO = path.join("a", "b")  -> "a/b"
      - Variable refs:     const FOO = OTHER_VAR
    Multi-pass to resolve chained references.
    """
    table = {}

    # Pass 1: collect all literal string constants (trailing semicolon optional)
    for m in re.finditer(
        r'^(?:const|let)\s+(\w+)\s*=\s*(["`\'])(.*?)\2\s*;?',
        src, re.MULTILINE
    ):
        table[m.group(1)] = m.group(3)

    # Pass 2: resolve template literals `${VAR}suffix` or `prefix${VAR}`
    for m in re.finditer(
        r'^(?:const|let)\s+(\w+)\s*=\s*`(.*?)`\s*;?',
        src, re.MULTILINE
    ):
        name = m.group(1)
        template = m.group(2)
        resolved = re.sub(
            r'\$\{(\w+)\}',
            lambda r: table.get(r.group(1), r.group(0)),
            template
        )
        if '${' not in resolved:
            table[name] = resolved

    # Pass 3: collect path.join(...) constants, resolving variable refs from table
    for m in re.finditer(
        r'^(?:const|let)\s+(\w+)\s*=\s*path\.join\((.+?)\)\s*;?',
        src, re.MULTILINE
    ):
        name = m.group(1)
        args_str = m.group(2)
        parts = []
        for arg in re.split(r',', args_str):
            arg = arg.strip()
            qm = re.match(r'^["\']([^"\']*)["\']$', arg)
            if qm:
                parts.append(qm.group(1))
                continue
            tm = re.match(r'^`(.*)`$', arg)
            if tm:
                resolved = re.sub(
                    r'\$\{(\w+)\}',
                    lambda r: table.get(r.group(1), r.group(0)),
                    tm.group(1)
                )
                if '${' not in resolved:
                    parts.append(resolved)
                continue
            if re.match(r'^\w+$', arg) and arg in table:
                parts.append(table[arg])
                continue
            parts = None
            break
        if parts:
            table[name] = "/".join(parts)

    # Pass 4: resolve variable-to-variable refs
    for m in re.finditer(
        r'^(?:const|let)\s+(\w+)\s*=\s*(\w+)\s*;?',
        src, re.MULTILINE
    ):
        name, ref = m.group(1), m.group(2)
        if name not in table and ref in table:
            table[name] = table[ref]

    return table


# == Image download helpers ====================================================

def _steam_icon_search(appid, game_name):
    """Return the Steam CDN icon URL for exec.png fetching, or None."""
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


def download_exec_icon(appid, game_name, out_path):
    """Download and save a 64x64 exec.png.

    Tries in order:
    1. Steam CDN icon via exact appid match in SearchApps results
    2. SteamGridDB icons endpoint (requires STEAMGRIDDB_API_KEY env var)
    """
    from io import BytesIO
    from PIL import Image

    icon_url = _steam_icon_search(appid, game_name)
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

    sgdb_key = get_api_key("STEAMGRIDDB_API_KEY")
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


def _crop_resize(img, w_out, h_out):
    """Center-crop img to the target aspect ratio, then resize to (w_out, h_out) with LANCZOS."""
    from PIL import Image
    w, h = img.size
    target_ratio = w_out / h_out
    current_ratio = w / h
    if current_ratio > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    elif current_ratio < target_ratio:
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))
    return img.resize((w_out, h_out), Image.LANCZOS)


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
    from io import BytesIO
    from PIL import Image

    img_data = None
    source = None

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
    img = _crop_resize(img, 640, 360)
    img.save(out_path, "JPEG", quality=92)
    return True, source


def download_title_image(appid, game_name, out_path, sgdb_key=None,
                         hero_id=None, logo_id=None):
    """Download and save a 1920x1080 title image (with game logo/title text).

    Priority order:
    1. SteamGridDB hero + logo composite -hero as background, logo centered in
       the lower portion (Steam library convention). Requires STEAMGRIDDB_API_KEY.
       Heroes and logos prefer is_official=True; logos exclude white/black styles.
    2. SteamGridDB 920x430 grid (no style filter -usually has title text baked in).
       Prefers is_official=True, sorted by score. Requires STEAMGRIDDB_API_KEY.
    3. Steam capsule_616x353.jpg -official art, always has title text. No key needed.

    hero_id: if given, use that specific SteamGridDB hero asset
        (https://www.steamgriddb.com/hero/<id>) as the background instead of the
        best hero auto-picked for appid. The composite still falls back to the
        grid/capsule path if no logo is available.
    logo_id: if given, use that specific SteamGridDB logo asset
        (https://www.steamgriddb.com/logo/<id>) instead of the best auto-picked
        logo for appid.
    """
    from io import BytesIO
    from PIL import Image

    result_img = None
    source = None

    def _en(items):
        en = [i for i in items if i.get("language", "en") in ("en", "all")]
        return en if en else items

    def _pick(items, sort_key="score"):
        official = [i for i in items if i.get("is_official", False)]
        pool = official if official else items
        return sorted(pool, key=lambda x: x.get(sort_key, 0), reverse=True)[0]

    if sgdb_key:
        hero_data = None
        logo_data = None

        try:
            if hero_id:
                url = f"https://www.steamgriddb.com/api/v2/heroes/{hero_id}"
                resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
                hero = resp.get("data")
                if hero:
                    hero_data = http_get_bytes(hero["url"])
            else:
                url = f"https://www.steamgriddb.com/api/v2/heroes/steam/{appid}"
                resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
                heroes = resp.get("data", [])
                if heroes:
                    hero_data = http_get_bytes(_pick(_en(heroes), "width")["url"])
        except Exception as e:
            print(f"    SteamGridDB hero error: {e}")

        try:
            if logo_id:
                url = f"https://www.steamgriddb.com/api/v2/logos/{logo_id}"
                resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
                logo = resp.get("data")
                if logo:
                    logo_data = http_get_bytes(logo["url"])
            else:
                url = f"https://www.steamgriddb.com/api/v2/logos/steam/{appid}"
                resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
                logos = resp.get("data", [])
                if logos:
                    colored = [l for l in _en(logos) if l.get("style", "") not in ("white", "black")]
                    pool = colored if colored else _en(logos)
                    logo_data = http_get_bytes(_pick(pool, "score")["url"])
        except Exception as e:
            print(f"    SteamGridDB logo error: {e}")

        if hero_data and logo_data:
            try:
                hero = _crop_resize(Image.open(BytesIO(hero_data)).convert("RGB"), 1920, 1080)

                logo = Image.open(BytesIO(logo_data)).convert("RGBA")
                # Scale logo to a target fraction of the image width (upscaling
                # small native logos too), capped by a max height fraction so
                # tall/square logos don't dominate. thumbnail() only shrinks, so
                # small logos stayed tiny -- use an explicit resize instead.
                lw, lh = logo.size
                scale = min(1920 * TITLE_LOGO_WIDTH_FRAC / lw,
                            1080 * TITLE_LOGO_HEIGHT_FRAC / lh)
                lw, lh = int(lw * scale), int(lh * scale)
                logo = logo.resize((lw, lh), Image.LANCZOS)

                x = (1920 - lw) // 2
                y = int(1080 * 0.88) - lh

                hero.paste(logo, (x, y), mask=logo.split()[3])
                result_img = hero
                source = "SteamGridDB hero + logo composite"
            except Exception as e:
                print(f"    Composite error: {e}")

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

    if source != "SteamGridDB hero + logo composite":
        result_img = _crop_resize(result_img, 1920, 1080)

    result_img.save(out_path, "JPEG", quality=92)
    return True, source


def download_banner_image(appid, game_id, out_path, sgdb_key):
    """Download the official SteamGridDB hero at full size. No crop or resize.

    Prefers is_official=True heroes, sorted by resolution. Returns (ok, source)."""
    from io import BytesIO
    from PIL import Image

    try:
        url = f"https://www.steamgriddb.com/api/v2/heroes/steam/{appid}"
        resp = json.loads(http_get(url, {"Authorization": f"Bearer {sgdb_key}"}))
        heroes = resp.get("data", [])
        if not heroes:
            return False, None
        official = [h for h in heroes if h.get("is_official", False)]
        pool = official if official else heroes
        best = sorted(pool, key=lambda x: x.get("width", 0), reverse=True)[0]
        img_data = http_get_bytes(best["url"])
    except Exception as e:
        print(f"    SteamGridDB hero error: {e}")
        return False, None

    img = Image.open(BytesIO(img_data)).convert("RGB")
    img.save(out_path, "JPEG", quality=95)
    hero_id = best.get("id", "unknown")
    w, h = img.size
    source = f"SteamGridDB hero ({w}x{h}) - https://www.steamgriddb.com/hero/{hero_id}"
    return True, source


# == Image resize helpers ======================================================

def resize_images_to(paths_and_labels, target_wh, *, fmt='JPEG', quality=95, dry_run=False):
    """Resize images that don't match the target dimensions.

    paths_and_labels: iterable of (img_path, label) tuples.
    target_wh: (width, height) tuple.
    fmt: 'JPEG' or 'PNG'.
    quality: JPEG quality (ignored for PNG).
    dry_run: if True, print what would be done without writing files.

    Returns (resized, already_correct, missing) counts.
    Raises ImportError if Pillow is not installed (caller should catch)."""
    from PIL import Image
    target = tuple(target_wh)
    tw, th = target
    resized = already = missing = 0
    for img_path, label in paths_and_labels:
        if not os.path.isfile(img_path):
            missing += 1
            continue
        try:
            with Image.open(img_path) as img:
                size = img.size
                if size == target:
                    already += 1
                    continue
                prefix = '[DRY RUN] ' if dry_run else ''
                print(f"  {prefix}[{label}] {size[0]}x{size[1]} -> {tw}x{th}")
                if not dry_run:
                    mode = 'RGB' if fmt == 'JPEG' else 'RGBA'
                    resized_img = img.convert(mode).resize(target, Image.LANCZOS)
                    kw = {'quality': quality} if fmt == 'JPEG' else {}
                    resized_img.save(img_path, fmt, **kw)
        except Exception as e:
            print(f"  [{label}] SKIP - could not process: {e}")
            continue
        resized += 1
    return resized, already, missing


def resize_pngs_in_dirs(folders, dry_run=False):
    """Resize all non-64x64 PNGs in the given folders to 64x64 using Pillow.
    Skips folders that do not exist. Prints a summary line."""
    try:
        from PIL import Image  # noqa: F401 — import check only; resize_images_to imports again
    except ImportError:
        print("PNG resize skipped -- Pillow not installed (pip install Pillow)\n")
        return
    pairs = []
    for folder in folders:
        if not os.path.isdir(folder):
            continue
        folder_name = os.path.basename(folder)
        for png in sorted(f for f in os.listdir(folder) if f.lower().endswith('.png')):
            pairs.append((os.path.join(folder, png), f"{folder_name}/{png}"))
    if not pairs:
        return
    r, a, _ = resize_images_to(pairs, (64, 64), fmt='PNG', dry_run=dry_run)
    print(f"\nPNG resize: {r} resized, {a} already 64x64.\n")


# == Node / repo helpers =======================================================

def run_generate_explained(game_id):
    """Run generate_explained.js for game_id. Returns (ok: bool, stderr: str)."""
    result = subprocess.run(
        ["node", "generate_explained.js", game_id],
        cwd=REPO_ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )
    return result.returncode == 0, result.stderr.strip()


def run_generate_explained_batch(game_ids):
    """Run generate_explained.js for multiple game IDs in a single node invocation.
    Returns (ok: bool, stderr: str). No-op (ok=True) for empty input."""
    if not game_ids:
        return True, ""
    result = subprocess.run(
        ["node", "generate_explained.js"] + list(game_ids),
        cwd=REPO_ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )
    return result.returncode == 0, result.stderr.strip()


def node_check(path):
    """Run `node --check` on a JS file. Returns (ok: bool, stderr: str)."""
    result = subprocess.run(
        ["node", "--check", path],
        capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )
    return result.returncode == 0, result.stderr.strip()


def eslint_check(path):
    """Run `npx eslint` on a JS file. Returns (ok: bool, output: str).
    Runs from REPO_ROOT so eslint.config.js is picked up automatically."""
    result = subprocess.run(
        ["npx", "--no-install", "eslint", path],
        capture_output=True, text=True, cwd=REPO_ROOT, shell=True,
        encoding="utf-8", errors="replace",
    )
    output = (result.stdout + result.stderr).strip()
    return result.returncode == 0, output


def node_check_source(src):
    """Run `node --check` on an in-memory JS string. Returns (ok, error_msg).
    Returns (None, msg) if node is not on PATH."""
    try:
        with tempfile.NamedTemporaryFile(suffix='.js', delete=False,
                                         mode='w', encoding='utf-8') as f:
            f.write(src)
            tmp = f.name
        try:
            result = subprocess.run(
                ['node', '--check', tmp],
                capture_output=True, text=True,
                encoding="utf-8", errors="replace",
            )
        finally:
            os.unlink(tmp)
        return result.returncode == 0, result.stderr.strip() or None
    except FileNotFoundError:
        return None, 'node not found on PATH -- skipping JS validation'


def run_script(script_name, *args, capture=True):
    """Run a Python script from REPO_ROOT using sys.executable.

    Returns a CompletedProcess with .returncode, .stdout, .stderr when
    capture=True (default). Returns a CompletedProcess with only .returncode
    when capture=False (output goes to the terminal)."""
    cmd = [sys.executable, script_name] + [str(a) for a in args]
    return subprocess.run(
        cmd, cwd=REPO_ROOT,
        capture_output=capture, text=capture,
        encoding="utf-8" if capture else None,
        errors="replace" if capture else None,
    )


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


def iter_steam_image_targets(target_game_ids=None, force=False, target_path_fn=None):
    """Yield (folder, game_id, steamapp_id, game_name) for extensions to process.

    Skips games that already have their target image (unless force=True) and games
    without a real STEAMAPP_ID (Xbox/Epic-only). Deduplicates identical game_ids.

    target_path_fn: callable(folder, game_id) -> str target path. If None, yields
    all Steam-resolvable games (caller computes path)."""
    seen = set()
    for folder, game_id, src in iter_game_folders(target_game_ids):
        if game_id in seen:
            continue
        seen.add(game_id)
        if not has_real_steamapp_id(src):
            continue
        if target_path_fn is not None:
            target_path = target_path_fn(folder, game_id)
            if os.path.isfile(target_path) and not force:
                continue
        steamapp_id = extract_steamapp_id(src)
        game_name = extract_game_name(src)
        yield folder, game_id, steamapp_id, game_name


def run_concurrent_batch(items, worker_fn, max_workers=8):
    """Run worker_fn over items in a thread pool; return {key: result_tuple}.

    worker_fn(item) must return a tuple whose first element is the result key,
    and must catch its own per-item exceptions (an uncaught exception aborts
    the batch). KeyboardInterrupt prints an "Interrupted." notice and returns
    the partial batch collected so far."""
    batch = {}
    try:
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            for f in as_completed({pool.submit(worker_fn, item): item for item in items}):
                r = f.result()
                batch[r[0]] = r
    except KeyboardInterrupt:
        print("\n\n  Interrupted.")
    return batch


def report_download_results(targets, results, label_fn, saved, failed, skipped):
    """Classify and print results from run_concurrent_batch for download workers.

    Worker results must be (game_id, status, source_or_none, msg_or_none) where:
      status  : "ok" (saved), "fail" (soft fail, shows msg), "error" (exception, shows msg), "skip"
      source_or_none : description string for "ok"
      msg_or_none    : fail/error message, or None
    label_fn(game_id) : callable returning the display label string.
    saved / failed / skipped : lists updated in-place."""
    for item in targets:
        game_id = item[1]
        if game_id not in results:
            continue
        result = results[game_id]
        status = result[1]
        source = result[2] if len(result) > 2 else None
        msg = result[3] if len(result) > 3 else None
        label = label_fn(game_id)
        if status == "skip":
            print(f"\n{label}\n  SKIP -- no STEAMAPP_ID in index.js")
            skipped.append(game_id)
        elif status == "ok":
            print(f"\n{label}\n  Saved: {source}")
            saved.append(game_id)
        elif status == "fail":
            print(f"\n{label}\n  FAILED -- {msg}")
            failed.append(game_id)
        elif status == "error":
            print(f"\n{label}\n  ERROR - {msg}")
            failed.append(game_id)


def retry_failed_downloads(targets, failed, worker_fn, concurrency, saved, skipped):
    """Retry failed downloads once using worker_fn; updates saved/failed/skipped in-place.

    Clears the failed list, re-runs failed items through run_concurrent_batch, then
    re-classifies results (ok → saved, fail/error → failed, skip → skipped)."""
    print(f"\n  Retrying {len(failed)} failed download(s)...")
    retry_ids = set(failed)
    retry_targets = [t for t in targets if t[1] in retry_ids]
    failed.clear()
    retry_results = run_concurrent_batch(retry_targets, worker_fn, max_workers=concurrency)
    for item in retry_targets:
        game_id = item[1]
        if game_id not in retry_results:
            continue
        result = retry_results[game_id]
        status = result[1]
        if status == "ok":
            saved.append(game_id)
        elif status in ("fail", "error"):
            failed.append(game_id)
        elif status == "skip":
            skipped.append(game_id)


def list_game_ids():
    """Return a sorted list of game IDs for all game-* folders in the repo."""
    return sorted(
        entry[len('game-'):]
        for entry in os.listdir(REPO_ROOT)
        if entry.startswith('game-') and os.path.isdir(os.path.join(REPO_ROOT, entry))
    )


def list_template_names():
    """Return a sorted list of template name suffixes (e.g. ['basic', 'ue4-5', ...])."""
    return sorted(
        entry[len(TEMPLATE_PREFIX):]
        for entry in os.listdir(REPO_ROOT)
        if entry.startswith(TEMPLATE_PREFIX) and os.path.isdir(os.path.join(REPO_ROOT, entry))
    )


def iter_extension_folders(*, include_templates=False):
    """Yield (folder, game_id, src) for game-* and optionally template-* folders.

    Like iter_game_folders() but can also include templates. Template game_id
    falls back to the folder entry name when GAME_ID is absent from source."""
    for entry in sorted(os.listdir(REPO_ROOT)):
        folder = os.path.join(REPO_ROOT, entry)
        if not os.path.isdir(folder):
            continue
        if entry.startswith(GAME_PREFIX):
            pass
        elif include_templates and entry.startswith(TEMPLATE_PREFIX):
            pass
        else:
            continue
        src = read_index_js(folder)
        if not src:
            continue
        game_id = extract_game_id(src) or entry
        yield folder, game_id, src


def iter_repo_scripts():
    """Yield absolute paths of all scripts listed in scripts.txt.
    Blank lines and # comment lines are skipped."""
    scripts_txt = os.path.join(REPO_ROOT, "scripts.txt")
    with open(scripts_txt, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            yield os.path.join(REPO_ROOT, line)


# == Extension metadata helpers ================================================

def read_info_json(folder):
    """Return the parsed info.json dict for a game folder, or None if missing/invalid."""
    path = os.path.join(folder, "info.json")
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


_DEFAULT_MANIFEST_PATH = os.path.join(os.environ.get("APPDATA", ""), "Vortex", "temp", "extensions-manifest.json")


def load_vortex_manifest(path=None):
    """Read Vortex extensions-manifest.json. Returns {game_id: mod_id} dict.

    path defaults to %APPDATA%\\Vortex\\temp\\extensions-manifest.json.
    Returns {} and prints a warning on any read/parse error."""
    manifest_path = path or _DEFAULT_MANIFEST_PATH
    try:
        with open(manifest_path, encoding="utf-8") as f:
            data = json.load(f)
        result = {}
        for e in data.get("extensions", []):
            gid = e.get("gameId")
            mid = e.get("modId")
            if gid and mid:
                result[gid] = mid
        print(f"  Manifest loaded: {len(result)} games with modId.")
        return result
    except Exception as ex:
        print(f"  Warning: could not load manifest ({ex}). EXTENSION_URL patch will be skipped.")
        return {}


def make_info_json():
    """Return a fresh info.json template string for a new extension."""
    return (
        '{\n'
        '  "name": "Game: XXX",\n'
        '  "author": "ChemBoy1",\n'
        '  "version": "0.1.0",\n'
        '  "description": "Vortex support for XXX"\n'
        '}\n'
    )


def make_changelog():
    """Return a fresh CHANGELOG.md template string for a new extension."""
    return (
        "# Changelog\n"
        "\n"
        "## Planned Improvements (Not Yet Released)\n"
        "\n"
        "- None Planned\n"
        "\n"
        "## [0.1.0] - 2026-XX-XX\n"
        "\n"
        "- Initial Release\n"
    )


def parse_changelog_latest(folder):
    """Return (version, date) from the most recent ## [X.Y.Z] - YYYY-MM-DD entry
    in CHANGELOG.md, or (None, None) if the file is missing or has no dated entry."""
    path = os.path.join(folder, "CHANGELOG.md")
    if not os.path.isfile(path):
        return None, None
    try:
        with open(path, encoding="utf-8") as f:
            content = f.read()
        m = re.search(r'^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})', content, re.MULTILINE)
        return (m.group(1), m.group(2)) if m else (None, None)
    except OSError:
        return None, None


def detect_engine(src):
    """Return a short engine/framework label for a game extension based on its index.js source.

    Same detection logic as categorize_games.py; both share this function.
    Returns one of the ENGINE_LABELS strings (e.g. 'UE4-5', 'RE Engine', etc.).
    """
    head = re.sub(r'\s+', ' ', '\n'.join(src.splitlines()[:20]))
    if 'UNREALDATA' in src:
        return 'UE4-5'
    if 'const TFC_ID =' in src or 'Structure: UE2/3' in head or 'TFC Installer' in head:
        return 'UE2-3'
    if "requireExtension('modtype-bepinex')" in src and 'MelonLoader' not in head and 'Hybrid' not in head:
        return 'Unity+Bep'
    if 'MelonLoader' in head or 'Hybrid' in head:
        return 'Unity+Mel/Bep'
    if "requireExtension('modtype-umm')" in src or 'UMM' in head:
        return 'Unity+UMM'
    if 'Far Cry' in head or 'Dunia' in head:
        return 'Dunia'
    if 'RPGMaker' in head or 'RPG Maker' in head:
        return 'RPG Maker'
    if 'Snowdrop' in head:
        return 'Snowdrop'
    if 'Godot' in head:
        return 'Godot'
    if 'const ACSE_ID =' in src or 'Cobra' in head or 'ACSE' in head:
        return 'Cobra/ACSE'
    if 'REFramework' in head or 'RE Engine' in head or 'Fluffy' in head:
        return 'RE/Fluffy'
    if 'const RELOADED_ID =' in src or 'Reloaded' in head:
        return 'Reloaded-II'
    if 'AnvilToolkit' in head or 'const ATK_ID =' in src or 'ReForge' in src:
        return 'Anvil'
    if 'SRMM' in head or 'shinryumodmanager' in src:
        return 'SRMM'
    if 'Frostbite' in head or 'const FROSTY_EXEC =' in src:
        return 'Frostbite'
    return 'Basic'


def validate_index_js(src: str) -> list[str]:
    """Return a list of issue strings found in an index.js source.

    Checks: leftover XXX placeholders outside comments, missing applyGame(),
    missing context.registerGame(), and missing main() function.
    """
    issues = []
    stripped = re.sub(r'/\*.*?\*/', '', src, flags=re.DOTALL)
    stripped = re.sub(r'//[^\n]*', '', stripped)
    stripped = re.sub(r'"[^"\n]*"|\'[^\'\n]*\'|`[^`]*`', '', stripped)
    if re.search(r'\bXXX\b', stripped):
        issues.append("leftover XXX placeholder(s)")
    if 'applyGame' not in src:
        issues.append("missing applyGame()")
    if 'context.registerGame' not in src:
        issues.append("missing context.registerGame()")
    if not re.search(r'\bfunction\s+main\s*\(|\bconst\s+main\s*=', src):
        issues.append("missing main()")
    return issues


def detect_stores(src: str) -> str:
    """Return space-separated store badges present in DISCOVERY_IDS_ACTIVE.

    Parses the array literal and maps known constant names to abbreviated badges:
    STEAMAPP_ID -> S, GOGAPP_ID -> G, EPICAPP_ID -> E, XBOXAPP_ID -> X,
    UBI*_ID -> U, EA_APP_ID/ORIGIN_ID -> EA.
    """
    m = re.search(r'DISCOVERY_IDS_ACTIVE\s*=\s*\[([^\]]*)\]', src, re.DOTALL)
    if not m:
        return ""
    active = m.group(1)
    badges = []
    if re.search(r'\bSTEAMAPP_ID\b', active):
        badges.append("S")
    if re.search(r'\bGOGAPP_ID\b', active):
        badges.append("G")
    if re.search(r'\bEPICAPP_ID\b', active):
        badges.append("E")
    if re.search(r'\bXBOXAPP_ID\b', active):
        badges.append("X")
    if re.search(r'\bUBI(?:APP)?_ID\b', active):
        badges.append("U")
    if re.search(r'\bEA_APP_ID\b|\bORIGIN_ID\b', active):
        badges.append("EA")
    return " ".join(badges)


# == CLI helpers ===============================================================

def dry_prefix(dry_run):
    """Return '[DRY RUN] ' when dry_run is True, else ''."""
    return '[DRY RUN] ' if dry_run else ''


def build_arg_parser(desc, *, with_force=True, with_dry_run=True, ids_required=True, dest="game_ids"):
    """Return an ArgumentParser with standard GAME_ID positional arg and common flags.

    with_dry_run: add --dry-run flag (default True)
    with_force: add --force flag (default True)
    ids_required: nargs='+' when True, nargs='*' when False
    dest: parsed-namespace attribute name (default 'game_ids'; pass 'game' for args.game)"""
    p = argparse.ArgumentParser(description=desc)
    p.add_argument(
        dest, metavar="GAME_ID",
        nargs="+" if ids_required else "*",
        help="Game ID(s) to process",
    )
    if with_dry_run:
        p.add_argument("--dry-run", action="store_true",
                       help="Show what would be done without making changes")
    if with_force:
        p.add_argument("--force", action="store_true",
                       help="Overwrite existing files without prompting")
    return p


def normalize_target_ids(arg):
    """Convert a list of game IDs from argparse to a set, or None for 'all games'.

    arg: the parsed positional list (may be [] or None when nargs='*').
    Returns set(arg) when non-empty, else None."""
    return set(arg) or None


def assert_is_game_id(game_id):
    """Raise ValueError with a clear message if game_id is a template name."""
    if game_id.startswith(TEMPLATE_PREFIX):
        raise ValueError(
            f"Expected a game ID but got template name '{game_id}'. "
            f"Pass the game ID without the '{TEMPLATE_PREFIX}' prefix."
        )


def report_node_check(game_id, ok, err):
    """Print node --check result in standard format. No-op when ok and no error."""
    if not ok:
        log_warn(game_id, f"node --check failed: {err}")


def mutate_index_js(folder, game_id, mutator_fn, *,
                    dry_run=False,
                    changed_msg="Updated index.js",
                    unchanged_msg="index.js already up to date",
                    dry_run_msg="Would update index.js"):
    """Read index.js, apply mutator_fn(src) -> new_src, write back if changed.

    Returns True if changed (or would be in dry_run). Handles all error
    printing so callers do not need try/except boilerplate.
    Pass unchanged_msg=None to suppress the no-change print."""
    index_path = os.path.join(folder, "index.js")
    if not os.path.isfile(index_path):
        print(f"  [{game_id}] WARNING - index.js not found")
        return False
    try:
        with open(index_path, encoding="utf-8") as f:
            src = f.read()
    except OSError as e:
        print(f"  [{game_id}] WARNING - could not read index.js: {e}")
        return False
    new_src = mutator_fn(src)
    if new_src == src:
        if unchanged_msg:
            print(f"  [{game_id}] {unchanged_msg}")
        return False
    if dry_run:
        print(f"  [{game_id}] [DRY RUN] {dry_run_msg}")
        return True
    try:
        write_index_js(folder, new_src)
        print(f"  [{game_id}] {changed_msg}")
        return True
    except OSError as e:
        print(f"  [{game_id}] ERROR - could not write index.js: {e}")
        return False


def mutate_text_file(path, fn, *, dry_run=False, atomic=True,
                     changed_msg="Updated", unchanged_msg="Already up to date",
                     dry_run_msg="Would update"):
    """Read a text file, apply fn(src) -> new_src, write back if changed.

    Sibling to mutate_index_js for non-index.js files. Returns True if changed.
    Uses write_text_atomic when atomic=True (default)."""
    label = os.path.basename(path)
    if not os.path.isfile(path):
        print(f"  WARNING - {label} not found")
        return False
    try:
        with open(path, encoding="utf-8") as f:
            src = f.read()
    except OSError as e:
        print(f"  WARNING - could not read {label}: {e}")
        return False
    new_src = fn(src)
    if new_src == src:
        if unchanged_msg:
            print(f"  {unchanged_msg}: {label}")
        return False
    if dry_run:
        print(f"  [DRY RUN] {dry_run_msg}: {label}")
        return True
    try:
        if atomic:
            write_text_atomic(path, new_src)
        else:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_src)
        print(f"  {changed_msg}: {label}")
        return True
    except OSError as e:
        print(f"  ERROR - could not write {label}: {e}")
        return False


def read_json(path, default=None):
    """Read and parse a JSON file. Returns default (empty dict by default) on missing/corrupt file."""
    if default is None:
        default = {}
    if not os.path.isfile(path):
        return default
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def write_json_atomic(path, data, *, indent=2, sort_keys=False):
    """Write data as JSON to path atomically (tmp file + os.replace)."""
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=indent, sort_keys=sort_keys)
    os.replace(tmp, path)


def write_text_atomic(path, entries, encoding="utf-8"):
    """Write entries to path atomically via a .tmp file + os.replace.

    entries may be a list of strings (each written in order) or a single string.
    path may be a str or pathlib.Path."""
    tmp = str(path) + ".tmp"
    if isinstance(entries, str):
        entries = [entries]
    with open(tmp, "w", encoding=encoding) as f:
        for entry in entries:
            f.write(entry)
    os.replace(tmp, path)


def read_gui_stats():
    """Read the shared GUI nexus-stats JSON ({game_id: stats_dict}). Returns {} on error.

    Both vortex_gui.py and fetch_nexus_stats.py must use this instead of reading
    GUI_STATS_PATH directly to keep their I/O behaviour in sync."""
    return read_json(GUI_STATS_PATH, default={})


def write_gui_stats(data):
    """Write stats dict to GUI_STATS_PATH atomically with sort_keys=True.

    Both vortex_gui.py and fetch_nexus_stats.py must use this so the file is always
    written consistently (sort_keys guarantees a stable diff for version control)."""
    write_json_atomic(GUI_STATS_PATH, data, sort_keys=True)


def print_run_summary(saved, failed, skipped, *, skip_label="no Steam ID"):
    """Print a standardized saved/failed/skipped run summary block."""
    print(f"\n{'-' * 50}")
    print(f"Saved : {len(saved)}")
    if failed:
        print(f"Failed: {len(failed)}")
        for g in failed:
            print(f"  - {g}")
    if skipped:
        print(f"Skipped ({skip_label}): {len(skipped)}")
        for g in skipped:
            print(f"  - {g}")


def print_count_summary(counters):
    """Print a one-line 'Done. N label, ...' summary from an ordered {label: count} dict."""
    parts = ", ".join(f"{v} {k}" for k, v in counters.items())
    print(f"\nDone. {parts}.")


def replace_const_rhs(src, name, new_rhs, *, count=1):
    """Replace the quoted RHS of a const/let declaration with new_rhs.

    new_rhs is the literal replacement string, e.g. '"value"' or 'null'.
    Anchored with ^[ \\t]* and MULTILINE so only the first top-level
    declaration is targeted when count=1 (default)."""
    pattern = rf'^([ \t]*(?:const|let)\s+{re.escape(name)}\s*=\s*)["\'][^"\']*["\']'
    return re.sub(pattern, rf'\g<1>{new_rhs}', src, count=count, flags=re.MULTILINE)


SEMVER_PATTERN = re.compile(r'^\d+\.\d+\.\d+$')
"""Compiled regex matching strict X.Y.Z semver (no pre-release suffix).
Use is_valid_semver() for a boolean check."""


def is_valid_semver(s):
    """Return True if s is a strict X.Y.Z semver string (no pre-release suffix)."""
    return bool(SEMVER_PATTERN.match(s))


def bump_semver(version, kind):
    """Bump a semver string. kind='major' increments minor and resets patch; else increments patch.

    Raises ValueError for malformed version strings."""
    parts = version.split(".")
    if len(parts) != 3:
        raise ValueError(f"Unexpected version format: {version!r}")
    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
    if kind == "major":
        minor += 1
        patch = 0
    else:
        patch += 1
    return f"{major}.{minor}.{patch}"


def prepend_changelog_entry(folder, version, date):
    """Prepend a new ## [version] - date section to CHANGELOG.md in folder.

    No-op if CHANGELOG.md does not exist. Inserts before the first existing
    ## [ heading, or appends after trailing content if none found."""
    changelog_path = os.path.join(folder, "CHANGELOG.md")
    if not os.path.exists(changelog_path):
        return
    with open(changelog_path, "r", encoding="utf-8") as f:
        content = f.read()
    new_section = f"## [{version}] - {date}\n\n- \n\n"
    m = re.search(r"^## \[", content, re.MULTILINE)
    if m:
        content = content[: m.start()] + new_section + content[m.start():]
    else:
        content = content.rstrip("\n") + "\n\n" + new_section
    write_text_atomic(changelog_path, content)


# == Nexus Mods API helpers ====================================================

def parse_nexus_mod_url(url):
    """Parse a Nexus Mods URL into (domain, mod_id) or None.

    Handles: https://www.nexusmods.com/<domain>/mods/<mod_id>[?...][#...]
    Returns (domain: str, mod_id: int) or None."""
    m = re.search(r'nexusmods\.com/([^/]+)/mods/(\d+)', url)
    if not m:
        return None
    return m.group(1), int(m.group(2))


_NEXUS_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
}

_nexus_games_cache = None


def nexus_list_games(api_key):
    """Fetch all Nexus Mods games (approved only). Caches result for the process lifetime.
    Returns a list of game dicts with at least 'name' and 'domain_name'. Returns [] on error."""
    global _nexus_games_cache
    if not api_key:
        return []
    if _nexus_games_cache is None:
        try:
            req = urllib.request.Request(
                "https://api.nexusmods.com/v1/games.json?include_unapproved=false",
                headers={"apikey": api_key, **_NEXUS_HEADERS},
            )
            with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:
                _nexus_games_cache = json.loads(resp.read())
        except Exception as e:
            print(f"  Nexus games fetch error: {e}")
            return []
    return _nexus_games_cache


def nexus_get_mod(domain, mod_id, api_key):
    """Fetch mod details from the Nexus v1 API.

    Returns (data_dict, rate_remaining_str_or_None). Retries up to 2 times on
    429 / 5xx / network errors (2 s, 4 s delays), honoring Retry-After on 429.
    Raises immediately on 404 or non-retryable 4xx errors."""
    req = urllib.request.Request(
        f"https://api.nexusmods.com/v1/games/{domain}/mods/{mod_id}.json",
        headers={"apikey": api_key, **_NEXUS_HEADERS},
    )
    result = {}

    def _do():
        with urllib.request.urlopen(req, timeout=_HTTP_TIMEOUT) as resp:
            result["data"] = json.loads(resp.read())
            result["remaining"] = resp.headers.get("X-RL-Daily-Remaining")

    _execute_with_retry(_do, respect_retry_after=True)
    return result["data"], result.get("remaining")


_NEXUS_V3 = "https://api.nexusmods.com/v3"
_NEXUS_V3_HEADERS = {"Accept": "application/json", "User-Agent": "Mozilla/5.0"}


def nexus_v3_get(path, api_key):
    """GET a Nexus Mods v3 endpoint.

    Uses certifi SSL context; retries up to 2 times on 429/5xx (honoring Retry-After).
    Returns the parsed JSON response body (the full dict, not just 'data' -- v3 shapes vary).
    Raises RuntimeError on persistent HTTP errors."""
    url = f"{_NEXUS_V3}{path}"
    headers = {"apikey": api_key, **_NEXUS_V3_HEADERS}

    def _do():
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30, context=_SSL_CTX_NEXUS) as resp:
            return json.loads(resp.read())

    try:
        result = {}
        result["r"] = _execute_with_retry(_do, respect_retry_after=True)
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        raise RuntimeError(f"nexus_v3_get {path}: HTTP {e.code} {e.reason} - {body[:200]}") from None
    return result["r"]


def nexus_v3_post_json(path, body, api_key):
    """POST JSON to a Nexus Mods v3 endpoint.

    Uses certifi SSL context. Returns the parsed JSON response body.
    Not retried (POST is not idempotent). Raises RuntimeError on HTTP errors."""
    url = f"{_NEXUS_V3}{path}"
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"apikey": api_key, "Content-Type": "application/json", **_NEXUS_V3_HEADERS},
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=_SSL_CTX_NEXUS) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_txt = ""
        try:
            body_txt = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        raise RuntimeError(f"nexus_v3_post_json {path}: HTTP {e.code} {e.reason} - {body_txt[:400]}") from None


# == Platform / filesystem helpers =============================================

def find_vortex_exe():
    """Return the path to Vortex.exe if found, else None.
    Checks the default install location first, then PATH."""
    candidates = [
        r"C:\Program Files\Black Tree Gaming Ltd\Vortex\Vortex.exe",
        shutil.which("Vortex.exe") or "",
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    return None


def safe_rmtree(path, hint=None):
    """Remove a directory tree, retrying once on PermissionError after 1 second.

    On retry, read-only bits are cleared via an error handler before the
    per-file delete is re-attempted.
    hint: shown in the warning when PermissionError is caught."""
    def _on_err(func, fpath, _exc):
        try:
            os.chmod(fpath, 0o777)
            func(fpath)
        except Exception:
            pass

    # onexc= replaces deprecated onerror= in Python 3.12+
    retry_kwargs = ({'onexc': _on_err} if sys.version_info >= (3, 12)
                    else {'onerror': _on_err})

    try:
        shutil.rmtree(path)
    except PermissionError as e:
        msg = hint or "ensure no process is locking the folder"
        print(f"  WARNING - {e}. {msg}. Retrying in 1s...")
        time.sleep(1)
        try:
            shutil.rmtree(path, **retry_kwargs)
        except PermissionError as e2:
            print(f"  ERROR - {e2}. {msg}. Could not remove folder.")
            raise


def touch_empty(path, force=False):
    """Create an empty file at path atomically. No-op if file exists and force=False."""
    if not force and os.path.isfile(path):
        return
    tmp = str(path) + ".tmp"
    with open(tmp, "wb"):
        pass
    os.replace(tmp, path)


def find_vortex_plugin_folder(game_id, game_name=None):
    """Return the deployed plugin folder path for game_id in Vortex's plugins dir, or None.

    Checks VORTEX_PLUGINS_DIR env var (default: C:\\ProgramData\\vortex\\plugins).
    Match priority:
      1. Exact game_id match or game_id prefix (e.g. "subnautica2", "subnautica2-1.2.0")
      2. "Vortex Extension Update - <name> v*" folder (deployed via Nexus in-app update);
         cleaned game_id or game_name as substring
      3. Fuzzy substring match of cleaned game_id or game_name against any folder

    Cleaning normalizes underscores to spaces (newer deployed folders use the
    underscore-delimited "{Name}_Vortex_Extension_{version}_{hash}" form),
    normalizes "&" to "and", and applies roman_to_arabic before lowercasing, so
    display names with "&" or Roman numerals ("DOOM I & II", "Battlefront II")
    match folders using "and"/Arabic ("DOOM I and II", "battlefront2")."""
    plugins_dir = VORTEX_PLUGINS_DIR
    if not os.path.isdir(plugins_dir):
        return None
    try:
        entries = os.listdir(plugins_dir)
    except OSError:
        return None

    gid_lower = game_id.lower()

    # Pass 1: exact game-id prefix match
    for entry in entries:
        el = entry.lower()
        if el == gid_lower or el.startswith(gid_lower + "-"):
            full = os.path.join(plugins_dir, entry)
            if os.path.isdir(full):
                return full

    # Pass 2: "Vortex Extension Update - <name> v*" naming (Vortex in-app update folder)
    # Compare the stripped name portion against both game_id and game_name.
    _vu_prefix = re.compile(r'^vortex extension update - (.+?) v\d', re.IGNORECASE)
    _vu_suffix = re.compile(r'\s+vortex extension.*$', re.IGNORECASE)
    def _clean(s):
        # Normalize underscores to spaces first: newer deployed folders use
        # "{Name}_Vortex_Extension_{version}_{hash}" (underscore-delimited),
        # older ones use spaces. Without this the suffix strip below (\s+...)
        # and roman_to_arabic's \b boundaries fail on underscore forms.
        s = s.replace('_', ' ')
        # Drop trailing " Vortex Extension[ CB1...]" suffix, normalize ampersand
        # to "and" (display names use "&", deployed folders use "and"), then
        # roman_to_arabic before lowercasing (its patterns are uppercase-cased),
        # so "Battlefront II"/"Battlefront 2" and "I & II"/"I and II" collapse.
        s = _vu_suffix.sub('', s).replace('&', ' and ')
        return re.sub(r'[^a-z0-9]', '', roman_to_arabic(s).lower())

    gid_clean = _clean(game_id)
    name_clean = _clean(game_name) if game_name else None

    for entry in entries:
        m = _vu_prefix.match(entry)
        if not m:
            continue
        entry_name_clean = _clean(m.group(1))
        full = os.path.join(plugins_dir, entry)
        if not os.path.isdir(full):
            continue
        if gid_clean and gid_clean in entry_name_clean:
            return full
        if name_clean and name_clean in entry_name_clean:
            return full

    # Pass 3: fuzzy game_name substring match (original fallback)
    for entry in entries:
        ec = _clean(entry)
        if (gid_clean and gid_clean in ec) or (name_clean and name_clean in ec):
            full = os.path.join(plugins_dir, entry)
            if os.path.isdir(full):
                return full

    return None


def open_in_default_app(path):
    """Open path in the system default application (Windows: os.startfile)."""
    startfile = getattr(os, 'startfile', None)
    if startfile:
        startfile(path)


_WINDOWS_RESERVED_NAMES = {
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
}


def safe_windows_dirname(name):
    """Strip invalid Windows dir name chars, trailing dots/spaces, and reject reserved names."""
    name = re.sub(r'[<>:"/\\|?*]', '', name).rstrip('. ').strip()
    if name.upper() in _WINDOWS_RESERVED_NAMES:
        name = '_' + name
    return name


def read_id_list(filepath):
    """Read a text file and return a list of IDs (stripped, non-empty lines)."""
    if not os.path.isfile(filepath):
        return []
    with open(filepath, encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def write_id_list(filepath, game_ids):
    """Write a sorted list of IDs to a file atomically, one per line."""
    write_text_atomic(filepath, "".join(gid + "\n" for gid in sorted(game_ids)))


def is_load_order_game(src):
    """Return True if the extension registers a load order and is not a UE4/5 game."""
    return "context.registerLoadOrder" in src and detect_engine(src) != "UE4-5"


# Matches a GitHub release-asset download URL, e.g.
#   github.com/Owner/Repo/releases/download/v1.2.3/asset.zip
#   github.com/Owner/Repo/releases/latest/download/asset.zip
_GITHUB_DOWNLOAD_RE = re.compile(r"github\.com/[^\"'\s]+/releases/(?:latest/)?download")


def has_downloader_js(folder):
    """Return True if the extension folder contains a bundled downloader.js module."""
    return os.path.isfile(os.path.join(folder, "downloader.js"))


def downloads_from_github(src):
    """Return True if index.js pulls a mod/requirement from a GitHub release.

    Detects direct release-asset URLs and the browser_download_url field returned
    by the GitHub releases API. Independent of whether a downloader.js module exists.
    """
    return bool(_GITHUB_DOWNLOAD_RE.search(src)) or "browser_download_url" in src


def requires_unreal_mod_installer(src):
    """Return True if the extension declares a dependency on the
    'Unreal Engine Mod Installer' extension via context.requireExtension in applyGame."""
    return ('context.requireExtension("Unreal Engine Mod Installer")' in src
            or "context.requireExtension('Unreal Engine Mod Installer')" in src)
