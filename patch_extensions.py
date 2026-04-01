"""
patch_extensions.py

Generic framework for making repo-wide changes to all game-*/index.js files.
Each patch is a named, independently-enabled function. New patches can be added
to the PATCHES list without touching the runner logic.

Usage:
    python patch_extensions.py                        # run all enabled patches on all games
    python patch_extensions.py --game GAME_ID         # run on a single game
    python patch_extensions.py --dry-run              # preview changes without writing
    python patch_extensions.py --game GAME_ID --dry-run
    python patch_extensions.py --force-pcgw                # re-evaluate all PCGAMINGWIKI_URL values, overwriting wrong ones
    python patch_extensions.py --game GAME_ID --debug      # print raw PCGW search results for diagnosis
"""

import os
import sys
import re
import json
import time
import urllib.request
import subprocess

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
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
        # Already set to a real value
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


# ── Patch registry ────────────────────────────────────────────────────────────
# Add new patches here. Set enabled=False to skip without removing.

PATCHES = [
    {"name": "game_name",        "enabled": True, "fn": patch_game_name},
    {"name": "folder_vars",      "enabled": True, "fn": patch_folder_vars},
    {"name": "extension_url",    "enabled": True, "fn": patch_extension_url},
    {"name": "pcgamingwiki_url", "enabled": True, "fn": patch_pcgamingwiki_url},
]


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
                    ["node", "generate_explained.js", "--game", f"game-{game_id}"],
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
    global _debug
    _debug = "--debug" in args
    args = [a for a in args if a not in ("--dry-run", "--force-pcgw", "--debug")]

    single_game = None
    if "--game" in args:
        idx = args.index("--game")
        if idx + 1 >= len(args):
            print("ERROR: --game requires a GAME_ID argument.")
            sys.exit(1)
        single_game = args[idx + 1]

    print("Loading context...")
    context = {
        "manifest": load_manifest(),
        "force_pcgw": force_pcgw,
    }

    if single_game:
        game_ids = [single_game]
    else:
        game_ids = sorted(
            d[len("game-"):]
            for d in os.listdir(REPO_ROOT)
            if d.startswith("game-") and os.path.isdir(os.path.join(REPO_ROOT, d))
        )

    print(f"Running {len([p for p in PATCHES if p['enabled']])} patch(es) on {len(game_ids)} game(s){' [DRY RUN]' if dry_run else ''}...\n")
    run_patches(game_ids, dry_run, context)


if __name__ == "__main__":
    main()
