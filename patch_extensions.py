"""
patch_extensions.py

Generic framework for making repo-wide changes to all game-*/index.js files.
Each patch is a named, independently-enabled function. New patches can be added
to the PATCHES list without touching the runner logic.

Also resizes all non-64x64 PNG files in game-* and template-* folders to 64x64,
all non-1920x1080 title images in resources/title-images/ to 1920x1080, and
all non-640x360 cover art (GAME_ID.jpg) in game-* folders to 640x360
(requires Pillow: pip install Pillow).

Usage:
    python patch_extensions.py                              # run all enabled patches on all games + resize PNGs + resize title images + resize cover art
    python patch_extensions.py GAME_ID [GAME_ID ...]       # run on one or more games (no template PNG resize)
    python patch_extensions.py --dry-run                   # preview changes without writing
    python patch_extensions.py GAME_ID [GAME_ID ...] --dry-run
    python patch_extensions.py --force-pcgw                # re-evaluate all PCGAMINGWIKI_URL values, overwriting wrong ones
    python patch_extensions.py --force                     # re-run all URL patches even if values are already set
    python patch_extensions.py GAME_ID [GAME_ID ...] --debug  # print raw PCGW search results for diagnosis
"""

import os
import sys
import re
import json
import time
import urllib.request
import subprocess

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
TITLE_IMAGES_DIR = os.path.join(REPO_ROOT, "resources", "title-images")
MANIFEST_PATH = r"C:\ProgramData\vortex\temp\extensions-manifest.json"
NEXUS_SITE_BASE = "https://www.nexusmods.com/site/mods"
PCGW_API = "https://www.pcgamingwiki.com/w/api.php"


# ── Shared utilities ──────────────────────────────────────────────────────────

def get_game_name_from_src(src):
    """Extract the game name from index.js source, or None.
    Tries GAME_NAME constant first, then quoted 'name': in spec, then
    name: following id: GAME_ID in the context.registerGame call."""
    m = re.search(r'const\s+GAME_NAME\s*=\s*(["\'])(.+?)\1', src)
    if m:
        return m.group(2)
    m = re.search(r'"name":\s*(["\'])(.+?)\1', src)
    if m:
        return m.group(2)
    # Fallback: name: field immediately following id: GAME_ID in registerGame object
    m = re.search(r'\bid\s*:\s*GAME_ID\b.+?\bname\s*:\s*(["\'])(.+?)\1', src, re.DOTALL)
    return m.group(2) if m else None


def get_game_id_from_src(src):
    """Extract the GAME_ID constant value from index.js source, or None."""
    m = re.search(r'const\s+GAME_ID\s*=\s*(["\'])(.+?)\1', src)
    return m.group(2) if m else None


def const_value(src, var_name):
    """
    Return the current RHS value of a const/let declaration, or None if not present.
    Returns the raw matched string (e.g. '"XXX"', 'null', '"https://..."').
    """
    m = re.search(
        rf'(?:const|let)\s+{re.escape(var_name)}\s*=\s*(.+?)(?:\s*;|\s*//|$)',
        src
    )
    return m.group(1).strip() if m else None


def is_unset(value_str):
    """Return True if a const value is 'XXX' (needs filling)."""
    return value_str is not None and re.match(r'^["\']XXX["\']$', value_str)


def is_missing(src, var_name):
    """Return True if the const/let declaration does not exist at all."""
    return not re.search(rf'(?:const|let)\s+{re.escape(var_name)}\s*=', src)


def set_or_insert(src, var_name, value, comment=None):
    """
    If var_name exists and is "XXX", replace it with value.
    If var_name is missing entirely, insert it before `const spec = {`.
    value should be a Python string (will be quoted in the output).
    comment is an optional trailing // comment string.
    """
    escaped = value.replace("\\", "\\\\")
    comment_str = f" //{comment}" if comment else ""
    new_line = f'const {var_name} = "{escaped}";{comment_str}'

    # Replace existing "XXX" value
    pattern = rf'((?:const|let)\s+{re.escape(var_name)}\s*=\s*)["\']XXX["\']([^;\n]*;?)'
    if re.search(pattern, src):
        return re.sub(pattern, rf'\1"{escaped}"\2', src)

    # Insert before `const spec = {`
    insert_marker = re.search(r'^const\s+spec\s*=\s*\{', src, re.MULTILINE)
    if insert_marker:
        pos = insert_marker.start()
        return src[:pos] + new_line + "\n" + src[pos:]

    # Fallback: append at end (shouldn't happen for valid extensions)
    return src + "\n" + new_line + "\n"


# ── Data loaders (called once, passed as context) ─────────────────────────────

def load_manifest():
    """Return dict of {game_id: mod_id} from the Vortex extensions manifest."""
    try:
        with open(MANIFEST_PATH, encoding="utf-8") as f:
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


_pcgw_cache = {}
_debug = False

def lookup_pcgamingwiki(game_name):
    """
    Return (page_url, page_title) for the game, or (None, None).
    Results are cached in _pcgw_cache by game_name.
    Stage 1: direct title lookup with redirect following for exact matches.
    Stage 2: title search fallback for disambiguation suffixes like "Keeper (video game)".
    """
    if game_name in _pcgw_cache:
        return _pcgw_cache[game_name]

    norm = lambda s: s.lower().replace('\u2019', "'").replace(':', '').replace(' - ', ' ').replace('  ', ' ').strip()
    name_variants = name_lookup_variants(game_name)

    try:
        # Stage 1: direct title lookup (handles exact matches and redirects)
        for variant in name_variants:
            time.sleep(0.2)
            variant_encoded = urllib.request.quote(variant)
            url = f"{PCGW_API}?action=query&titles={variant_encoded}&redirects=1&format=json"
            req = urllib.request.Request(url, headers={"User-Agent": "vortex-ext-dev/1.0"})
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            pages = data.get("query", {}).get("pages", {})
            for page_id, page in pages.items():
                if page_id != "-1" and "missing" not in page:
                    title = page["title"]
                    if _debug:
                        print(f"    [debug] direct lookup: {repr(variant)} → {repr(title)}")
                    page_url = f"https://www.pcgamingwiki.com/wiki/{urllib.request.quote(title.replace(' ', '_'))}"
                    _pcgw_cache[game_name] = (page_url, title)
                    return page_url, title

        # Stage 2: title search fallback for disambiguation suffixes
        time.sleep(0.2)
        name_encoded = urllib.request.quote(game_name)
        url = f"{PCGW_API}?action=query&list=search&srsearch={name_encoded}&srwhat=title&format=json&srlimit=20"
        req = urllib.request.Request(url, headers={"User-Agent": "vortex-ext-dev/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())

        results = data.get("query", {}).get("search", [])
        name_variants_norm = {norm(v) for v in name_variants}
        if _debug:
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
        wt_url = f"{PCGW_API}?action=parse&page={urllib.request.quote(title)}&prop=wikitext&format=json"
        req2 = urllib.request.Request(wt_url, headers={"User-Agent": "vortex-ext-dev/1.0"})
        with urllib.request.urlopen(req2, timeout=10) as r2:
            wt_data = json.loads(r2.read())

        wikitext = wt_data.get("parse", {}).get("wikitext", {}).get("*", "")
        redirect = re.search(r'#REDIRECT\s*\[\[(.+?)]]', wikitext)
        if redirect:
            title = redirect.group(1)

        page_url = f"https://www.pcgamingwiki.com/wiki/{urllib.request.quote(title.replace(' ', '_'))}"
        _pcgw_cache[game_name] = (page_url, title)
        return page_url, title

    except Exception:
        _pcgw_cache[game_name] = (None, None)
        return None, None


# ── Patches ───────────────────────────────────────────────────────────────────

def patch_extension_url(game_id, src, context):
    """
    Set EXTENSION_URL to https://www.nexusmods.com/site/mods/{modId}.
    Skips if modId not in manifest or value is already a real URL.
    """
    manifest = context["manifest"]
    mod_id = manifest.get(game_id)
    if not mod_id:
        return src, False, "no modId in manifest"

    current = const_value(src, "EXTENSION_URL")
    if current and not is_unset(current) and current != "null":
        if not context.get("force"):
            return src, False, "already set"

    url = f"{NEXUS_SITE_BASE}/{mod_id}"
    new_src = set_or_insert(src, "EXTENSION_URL", url, comment="Nexus link to this extension. Used for links")
    return new_src, True, f"set to {url}"


def patch_pcgamingwiki_url(game_id, src, context):
    """
    Set PCGAMINGWIKI_URL by looking up the game name on PCGamingWiki.
    Skips if PCGW is unreachable or no match found, or value already set.
    Use --force-pcgw to overwrite already-set values (e.g. to correct wrong URLs).
    """
    current = const_value(src, "PCGAMINGWIKI_URL")
    if current and not is_unset(current) and current != "null":
        if not context.get("force_pcgw"):
            return src, False, "already set"

    game_name = get_game_name_from_src(src)
    page_url = None

    if game_name:
        page_url, _title = lookup_pcgamingwiki(game_name)

    if not page_url:
        if is_missing(src, "PCGAMINGWIKI_URL"):
            new_src = set_or_insert(src, "PCGAMINGWIKI_URL", "XXX")
            reason = "no GAME_NAME in source" if not game_name else "not found on PCGamingWiki"
            return new_src, True, f"inserted as XXX ({reason})"
        return src, False, "not found on PCGamingWiki"

    new_src = set_or_insert(src, "PCGAMINGWIKI_URL", page_url)
    return new_src, True, f"set to {page_url}"


def patch_folder_vars(game_id, src, context):
    """
    Insert any missing declarations from the set:
      let GAME_PATH = '';
      let GAME_VERSION = '';
      let STAGING_FOLDER = '';
      let DOWNLOAD_FOLDER = '';
    When GAME_PATH is missing all four are inserted together before `const spec = {`.
    When GAME_PATH exists the missing subset is inserted after it, in template order.
    """
    missing_game     = is_missing(src, "GAME_PATH")
    missing_version  = is_missing(src, "GAME_VERSION")
    missing_staging  = is_missing(src, "STAGING_FOLDER")
    missing_download = is_missing(src, "DOWNLOAD_FOLDER")
    if not any([missing_game, missing_version, missing_staging, missing_download]):
        return src, False, "already set"

    # Lines to insert after GAME_PATH (in template order)
    after_game_path_lines = []
    if missing_version:
        after_game_path_lines.append("let GAME_VERSION = ''; //Game version")
    if missing_staging:
        after_game_path_lines.append("let STAGING_FOLDER = ''; //Vortex staging folder path")
    if missing_download:
        after_game_path_lines.append("let DOWNLOAD_FOLDER = ''; //Vortex download folder path")

    missing_names = (
        (["GAME_PATH"]      if missing_game     else []) +
        (["GAME_VERSION"]   if missing_version  else []) +
        (["STAGING_FOLDER"] if missing_staging  else []) +
        (["DOWNLOAD_FOLDER"]if missing_download else [])
    )

    if missing_game:
        full_block = "\n".join(
            ["let GAME_PATH = ''; //Game installation path"] + after_game_path_lines
        )
        insert_marker = re.search(r'^const\s+spec\s*=\s*\{', src, re.MULTILINE)
        if insert_marker:
            pos = insert_marker.start()
            new_src = src[:pos] + full_block + "\n" + src[pos:]
            return new_src, True, f"inserted {', '.join(missing_names)}"
        return src, False, "could not find insertion point"

    # GAME_PATH exists — insert missing vars after it
    block = "\n".join(after_game_path_lines)
    m = re.search(r'^((?:const|let)\s+GAME_PATH\s*=\s*[^\n]+)', src, re.MULTILINE)
    if m:
        pos = m.end()
        new_src = src[:pos] + "\n" + block + src[pos:]
        return new_src, True, f"inserted {', '.join(missing_names)}"

    # Fallback: insert before const spec = {
    insert_marker = re.search(r'^const\s+spec\s*=\s*\{', src, re.MULTILINE)
    if insert_marker:
        pos = insert_marker.start()
        new_src = src[:pos] + block + "\n" + src[pos:]
        return new_src, True, f"inserted {', '.join(missing_names)}"

    return src, False, "could not find insertion point"


def patch_game_name(game_id, src, context):
    """
    Insert `const GAME_NAME = "...";` after the GAME_ID line for extensions
    that don't already define it. The name is extracted from the source:
    spec.game.name (quoted 'name':), or the name: field in context.registerGame.
    """
    if not is_missing(src, "GAME_NAME"):
        return src, False, "already set"

    name = get_game_name_from_src(src)
    if not name:
        return src, False, "could not extract game name from source"

    escaped = name.replace("\\", "\\\\").replace('"', '\\"')
    new_line = f'const GAME_NAME = "{escaped}";'

    # Insert immediately after the GAME_ID line
    m = re.search(r'^((?:const|let)\s+GAME_ID\s*=\s*[^\n]+)', src, re.MULTILINE)
    if m:
        pos = m.end()
        new_src = src[:pos] + "\n" + new_line + src[pos:]
        return new_src, True, f'inserted as "{name}"'

    return src, False, "could not find GAME_ID line to insert after"


# Each entry: (name, detection_pattern, source_code)
# Source code must end with a trailing newline; a blank line is added between inserted functions.
_UTILITY_FUNCTIONS = [
    (
        "isDir",
        r'\bfunction\s+isDir\b',
        "function isDir(folder, file) {\n"
        "  const stats = fs.statSync(path.join(folder, file));\n"
        "  return stats.isDirectory();\n"
        "}\n"
    ),
    (
        "statCheckSync",
        r'\bfunction\s+statCheckSync\b',
        "function statCheckSync(gamePath, file) {\n"
        "  try {\n"
        "    fs.statSync(path.join(gamePath, file));\n"
        "    return true;\n"
        "  }\n"
        "  catch (err) {\n"
        "    return false;\n"
        "  }\n"
        "}\n"
    ),
    (
        "statCheckAsync",
        r'\bfunction\s+statCheckAsync\b',
        "async function statCheckAsync(gamePath, file) {\n"
        "  try {\n"
        "    await fs.statAsync(path.join(gamePath, file));\n"
        "    return true;\n"
        "  }\n"
        "  catch (err) {\n"
        "    return false;\n"
        "  }\n"
        "}\n"
    ),
    (
        "getAllFiles",
        r'\bfunction\s+getAllFiles\b',
        "async function getAllFiles(dirPath) {\n"
        "  let results = [];\n"
        "  try {\n"
        "    const entries = await fs.readdirAsync(dirPath);\n"
        "    for (const entry of entries) {\n"
        "      const fullPath = path.join(dirPath, entry);\n"
        "      const stats = await fs.statAsync(fullPath);\n"
        "      if (stats.isDirectory()) { // Recursively get files from subdirectories\n"
        "        const subDirFiles = await getAllFiles(fullPath);\n"
        "        results = results.concat(subDirFiles);\n"
        "      } else { // Add file to results\n"
        "        results.push(fullPath);\n"
        "      }\n"
        "    }\n"
        "  } catch (err) {\n"
        "    log('warn', `Error reading directory ${dirPath}: ${err.message}`);\n"
        "  }\n"
        "  return results;\n"
        "}\n"
    ),
    (
        "getDiscoveryPath",
        r'\bgetDiscoveryPath\b',
        "const getDiscoveryPath = (api) => { //get the game's discovered path\n"
        "  const state = api.getState();\n"
        "  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});\n"
        "  return discovery === null || discovery === void 0 ? void 0 : discovery.path;\n"
        "};\n"
    ),
    (
        "purge",
        r'\basync\s+function\s+purge\b',
        "async function purge(api) {\n"
        "  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));\n"
        "}\n"
    ),
    (
        "deploy",
        r'\basync\s+function\s+deploy\b',
        "async function deploy(api) {\n"
        "  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));\n"
        "}\n"
    ),
]


def patch_utility_functions(game_id, src, context):
    """
    Insert standard utility functions (isDir, statCheckSync, statCheckAsync,
    getAllFiles, getDiscoveryPath, purge, deploy) before `function modTypePriority`
    for any extension missing them. Only missing functions are inserted.
    """
    missing = [(name, code) for name, pattern, code in _UTILITY_FUNCTIONS
               if not re.search(pattern, src)]
    if not missing:
        return src, False, "already set"

    m = re.search(r'^function\s+modTypePriority\b', src, re.MULTILINE)
    if not m:
        return src, False, "could not find modTypePriority anchor"

    block = "\n".join(code for _, code in missing)
    new_src = src[:m.start()] + block + "\n" + src[m.start():]
    return new_src, True, f"inserted {', '.join(name for name, _ in missing)}"


def _extract_function_body(src, func_start):
    """
    Given the index of a function declaration's opening `{` in src,
    return (body_start, body_end) where src[body_start:body_end] is the
    content between the braces (exclusive), or (None, None) on failure.
    """
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


def patch_setup_vars(game_id, src, context):
    """
    Ensure the setup() function sets GAME_PATH, STAGING_FOLDER, DOWNLOAD_FOLDER
    (and GAME_VERSION if setGameVersion is defined) at the top of its body.
    Lines already present in the setup body are not duplicated.
    """
    m_setup = re.search(r'^async\s+function\s+setup\b', src, re.MULTILINE)
    if not m_setup:
        return src, False, "no setup function found"

    body_start, body_end = _extract_function_body(src, m_setup.start())
    if body_start is None:
        return src, False, "could not parse setup function body"

    body = src[body_start:body_end]
    # Determine which lines are missing from the setup body
    needed = [
        ("const state",     r'\bconst\s+state\s*=\s*api\.getState\b',
         "  const state = api.getState();"),
        ("GAME_PATH",       r'\bGAME_PATH\s*=\s*discovery\.path\b',
         "  GAME_PATH = discovery.path;"),
        ("STAGING_FOLDER",  r'\bSTAGING_FOLDER\s*=\s*selectors\.installPathForGame\b',
         "  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);"),
        ("DOWNLOAD_FOLDER", r'\bDOWNLOAD_FOLDER\s*=\s*selectors\.downloadPathForGame\b',
         "  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);"),
    ]

    missing_lines = []
    missing_names = []
    for name, pattern, line in needed:
        if not re.search(pattern, body):
            missing_lines.append(line)
            missing_names.append(name)

    if not missing_lines:
        return src, False, "already set"

    # If const state already exists, insert missing lines right after it.
    # Otherwise insert everything at the top of the body.
    m_state = re.search(r'\bconst\s+state\s*=\s*api\.getState\(\)\s*;?[^\n]*\n', src[body_start:body_end])
    if m_state and "const state" not in missing_names:
        insert_pos = body_start + m_state.end()
        insert = "\n".join(missing_lines) + "\n"
        new_src = src[:insert_pos] + insert + src[insert_pos:]
    else:
        insert = "\n".join(missing_lines) + "\n"
        new_body_start = body_start
        if src[body_start] == '\n':
            new_body_start = body_start + 1
        new_src = src[:new_body_start] + insert + src[new_body_start:]
    return new_src, True, f"inserted {', '.join(missing_names)} in setup()"


def patch_context_once_api(game_id, src, context):
    """
    Insert `const api = context.api;` as the first statement inside every
    `context.once(() => { ... })` body that doesn't already have it.
    """
    insert_line = "    const api = context.api;"
    pattern = re.compile(r'\bcontext\.once\s*\(', )
    inserted = 0
    offset = 0
    new_src = src

    while True:
        m = pattern.search(new_src, offset)
        if not m:
            break
        # Find the arrow function opening brace
        arrow = re.search(r'=>\s*\{', new_src[m.start():m.start() + 80])
        if not arrow:
            offset = m.end()
            continue
        brace_pos = m.start() + arrow.end() - 1  # position of {
        body_start, body_end = _extract_function_body(new_src, brace_pos)
        if body_start is None:
            offset = m.end()
            continue

        body = new_src[body_start:body_end]
        if re.search(r'\bconst\s+api\s*=\s*context\.api\b', body):
            offset = body_end
            continue

        # Insert at the start of the line after the opening brace
        newline = new_src.find('\n', body_start)
        ins_pos = newline + 1 if newline != -1 else body_start
        new_src = new_src[:ins_pos] + insert_line + "\n" + new_src[ins_pos:]
        inserted += 1
        offset = ins_pos + len(insert_line) + 1

    if inserted == 0:
        return src, False, "already set"
    return new_src, True, f"inserted const api in {inserted} context.once block(s)"


# ── Patch registry ────────────────────────────────────────────────────────────
# Add new patches here. Set enabled=False to skip without removing.

PATCHES = [
    {"name": "game_name",           "enabled": True, "fn": patch_game_name},
    {"name": "folder_vars",         "enabled": True, "fn": patch_folder_vars},
    {"name": "utility_functions",   "enabled": True, "fn": patch_utility_functions},
    {"name": "setup_vars",          "enabled": True, "fn": patch_setup_vars},
    {"name": "context_once_api",    "enabled": True, "fn": patch_context_once_api},
    {"name": "extension_url",       "enabled": True, "fn": patch_extension_url},
    {"name": "pcgamingwiki_url",    "enabled": True, "fn": patch_pcgamingwiki_url},
]


# ── PNG resize ───────────────────────────────────────────────────────────────

def _get_png_size(path):
    """Return (width, height) from a PNG IHDR chunk, or None on failure."""
    import struct
    try:
        with open(path, 'rb') as f:
            if f.read(8) != b'\x89PNG\r\n\x1a\n':
                return None
            f.read(4)  # chunk length
            if f.read(4) != b'IHDR':
                return None
            w = struct.unpack('>I', f.read(4))[0]
            h = struct.unpack('>I', f.read(4))[0]
            return (w, h)
    except Exception:
        return None


def run_png_resize(folders, dry_run):
    """Resize all non-64x64 PNGs in the given folders to 64x64 using Pillow."""
    try:
        from PIL import Image
    except ImportError:
        print("PNG resize skipped -- Pillow not installed (pip install Pillow)\n")
        return

    TARGET = (64, 64)
    total_resized = 0
    total_already = 0

    for folder in folders:
        if not os.path.isdir(folder):
            continue
        folder_name = os.path.basename(folder)
        pngs = sorted(f for f in os.listdir(folder) if f.lower().endswith('.png'))
        for png in pngs:
            png_path = os.path.join(folder, png)
            size = _get_png_size(png_path)
            if size is None:
                print(f"  [{folder_name}/{png}] SKIP -- could not read PNG")
                continue
            if size == TARGET:
                total_already += 1
                continue
            prefix = "[DRY RUN] " if dry_run else ""
            print(f"  {prefix}[{folder_name}/{png}] {size[0]}x{size[1]} -> 64x64")
            if not dry_run:
                with Image.open(png_path) as img:
                    img = img.convert("RGBA")
                    img = img.resize(TARGET, Image.LANCZOS)
                    img.save(png_path)
            total_resized += 1

    print(f"\nPNG resize: {total_resized} resized, {total_already} already 64x64.\n")


def run_title_image_resize(game_ids, dry_run):
    """Resize all non-1920x1080 title images in resources/title-images/ to 1920x1080 using Pillow."""
    try:
        from PIL import Image
    except ImportError:
        print("Title image resize skipped -- Pillow not installed (pip install Pillow)\n")
        return

    TARGET = (1920, 1080)
    total_resized = 0
    total_already = 0
    total_missing = 0

    if not os.path.isdir(TITLE_IMAGES_DIR):
        print("Title image resize skipped -- resources/title-images/ not found\n")
        return

    for game_id in game_ids:
        filename = f"{game_id}_title.jpg"
        img_path = os.path.join(TITLE_IMAGES_DIR, filename)
        if not os.path.isfile(img_path):
            total_missing += 1
            continue
        try:
            with Image.open(img_path) as img:
                size = img.size
                if size == TARGET:
                    total_already += 1
                    continue
                prefix = "[DRY RUN] " if dry_run else ""
                print(f"  {prefix}[title-images/{filename}] {size[0]}x{size[1]} -> 1920x1080")
                if not dry_run:
                    img = img.convert("RGB")
                    img = img.resize(TARGET, Image.LANCZOS)
                    img.save(img_path, "JPEG", quality=95)
        except Exception as e:
            print(f"  [title-images/{filename}] SKIP -- could not read image: {e}")
            continue
        total_resized += 1

    print(f"\nTitle image resize: {total_resized} resized, {total_already} already 1920x1080, {total_missing} missing.\n")


def run_cover_art_resize(game_ids, dry_run):
    """Resize all non-640x360 cover art (GAME_ID.jpg) in game-* folders to 640x360 using Pillow."""
    try:
        from PIL import Image
    except ImportError:
        print("Cover art resize skipped -- Pillow not installed (pip install Pillow)\n")
        return

    TARGET = (640, 360)
    total_resized = 0
    total_already = 0
    total_missing = 0

    for game_id in game_ids:
        filename = f"{game_id}.jpg"
        img_path = os.path.join(REPO_ROOT, f"game-{game_id}", filename)
        if not os.path.isfile(img_path):
            total_missing += 1
            continue
        try:
            with Image.open(img_path) as img:
                size = img.size
                if size == TARGET:
                    total_already += 1
                    continue
                prefix = "[DRY RUN] " if dry_run else ""
                print(f"  {prefix}[game-{game_id}/{filename}] {size[0]}x{size[1]} -> 640x360")
                if not dry_run:
                    img = img.convert("RGB")
                    img = img.resize(TARGET, Image.LANCZOS)
                    img.save(img_path, "JPEG", quality=95)
        except Exception as e:
            print(f"  [game-{game_id}/{filename}] SKIP -- could not read image: {e}")
            continue
        total_resized += 1

    print(f"\nCover art resize: {total_resized} resized, {total_already} already 640x360, {total_missing} missing.\n")


# ── Runner ────────────────────────────────────────────────────────────────────

def run_patches(game_ids, dry_run, context):
    active_patches = [p for p in PATCHES if p["enabled"]]
    total_changed = 0
    total_skipped = 0
    total_errors = 0

    for game_id in game_ids:
        index_path = os.path.join(REPO_ROOT, f"game-{game_id}", "index.js")
        if not os.path.isfile(index_path):
            print(f"  [{game_id}] SKIP — no index.js found")
            total_skipped += 1
            continue

        with open(index_path, encoding="utf-8") as f:
            src = f.read()

        original_src = src
        game_changed = False
        changed_msgs = []
        fail_msgs = []  # non-trivial skips worth showing (excludes "already set")

        for patch in active_patches:
            try:
                src, changed, msg = patch["fn"](game_id, src, context)
                if changed:
                    changed_msgs.append(f"{patch['name']}: {msg}")
                    game_changed = True
                elif msg != "already set":
                    fail_msgs.append(f"{patch['name']}: {msg}")
            except Exception as ex:
                fail_msgs.append(f"{patch['name']}: ERROR — {ex}")
                total_errors += 1

        if game_changed:
            total_changed += 1
            prefix = "[DRY RUN] " if dry_run else ""
            print(f"  {prefix}[{game_id}] CHANGED")
            for msg in changed_msgs:
                print(f"    • {msg}")
            if not dry_run:
                with open(index_path, "w", encoding="utf-8") as f:
                    f.write(src)
                result = subprocess.run(
                    ["node", "generate_explained.js", game_id],
                    cwd=REPO_ROOT, capture_output=True, text=True
                )
                if result.returncode != 0:
                    print(f"    ! generate_explained.js failed: {result.stderr.strip()}")
        else:
            if fail_msgs:
                print(f"  [{game_id}] — {'; '.join(fail_msgs)}")
            total_skipped += 1

    print(f"\nDone. {total_changed} changed, {total_skipped} skipped, {total_errors} errors.")


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    force_pcgw = "--force-pcgw" in args
    force = "--force" in args
    global _debug
    _debug = "--debug" in args
    args = [a for a in args if a not in ("--dry-run", "--force-pcgw", "--force", "--debug")]

    # Remaining positional args (if any) are the GAME_IDs to target
    target_ids = args if args else None

    print("Loading context...")
    context = {
        "manifest": load_manifest(),
        "force_pcgw": force_pcgw or force,
        "force": force,
    }

    if target_ids:
        game_ids = target_ids
    else:
        game_ids = sorted(
            d[len("game-"):]
            for d in os.listdir(REPO_ROOT)
            if d.startswith("game-") and os.path.isdir(os.path.join(REPO_ROOT, d))
        )

    print(f"Running {len([p for p in PATCHES if p['enabled']])} patch(es) on {len(game_ids)} game(s){' [DRY RUN]' if dry_run else ''}...\n")
    run_patches(game_ids, dry_run, context)

    # PNG resize — all game-* and template-* folders when running on all,
    # or just the targeted game folders when specific IDs are given
    if target_ids:
        png_folders = [os.path.join(REPO_ROOT, f"game-{gid}") for gid in target_ids]
    else:
        png_folders = [
            os.path.join(REPO_ROOT, d) for d in sorted(os.listdir(REPO_ROOT))
            if (d.startswith("game-") or d.startswith("template-"))
            and os.path.isdir(os.path.join(REPO_ROOT, d))
        ]
    print(f"Checking PNGs in {len(png_folders)} folder(s){' [DRY RUN]' if dry_run else ''}...\n")
    run_png_resize(png_folders, dry_run)

    print(f"Checking title images for {len(game_ids)} game(s){' [DRY RUN]' if dry_run else ''}...\n")
    run_title_image_resize(game_ids, dry_run)

    print(f"Checking cover art for {len(game_ids)} game(s){' [DRY RUN]' if dry_run else ''}...\n")
    run_cover_art_resize(game_ids, dry_run)


if __name__ == "__main__":
    main()
