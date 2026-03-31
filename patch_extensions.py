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
"""

import os
import sys
import re
import json
import time
import urllib.request

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = r"C:\ProgramData\vortex\temp\extensions-manifest.json"
NEXUS_SITE_BASE = "https://www.nexusmods.com/site/mods"
PCGW_API = "https://www.pcgamingwiki.com/w/api.php"


# ── Shared utilities ──────────────────────────────────────────────────────────

def get_game_name_from_src(src):
    """Extract the GAME_NAME constant value from index.js source, or None."""
    m = re.search(r'const\s+GAME_NAME\s*=\s*["\'](.+?)["\']', src)
    return m.group(1) if m else None


def get_game_id_from_src(src):
    """Extract the GAME_ID constant value from index.js source, or None."""
    m = re.search(r'const\s+GAME_ID\s*=\s*["\'](.+?)["\']', src)
    return m.group(1) if m else None


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


_pcgw_cache = {}

def lookup_pcgamingwiki(game_name):
    """
    Return (page_url, page_title) for the game, or (None, None).
    Results are cached in _pcgw_cache by game_name.
    Follows #REDIRECT pages. Uses startswith matching to avoid sequels.
    """
    if game_name in _pcgw_cache:
        return _pcgw_cache[game_name]

    try:
        name_encoded = urllib.request.quote(game_name)
        url = f"{PCGW_API}?action=query&list=search&srsearch={name_encoded}&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "vortex-ext-dev/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())

        results = data.get("query", {}).get("search", [])
        name_lower = game_name.lower()
        title = None
        for result in results:
            t = result["title"].lower()
            if t.startswith(name_lower) or name_lower.startswith(t):
                title = result["title"]
                break

        if not title:
            _pcgw_cache[game_name] = (None, None)
            return None, None

        # Fetch wikitext to check for redirect
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
    """
    current = const_value(src, "PCGAMINGWIKI_URL")
    if current and not is_unset(current) and current != "null":
        return src, False, "already set"

    game_name = get_game_name_from_src(src)
    page_url = None

    if game_name:
        time.sleep(0.2)  # be polite to PCGW
        page_url, _title = lookup_pcgamingwiki(game_name)

    if not page_url:
        if is_missing(src, "PCGAMINGWIKI_URL"):
            new_src = set_or_insert(src, "PCGAMINGWIKI_URL", "XXX")
            reason = "no GAME_NAME in source" if not game_name else "not found on PCGamingWiki"
            return new_src, True, f"inserted as XXX ({reason})"
        return src, False, "not found on PCGamingWiki"

    new_src = set_or_insert(src, "PCGAMINGWIKI_URL", page_url)
    return new_src, True, f"set to {page_url}"


# ── Patch registry ────────────────────────────────────────────────────────────
# Add new patches here. Set enabled=False to skip without removing.

PATCHES = [
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
        messages = []

        for patch in active_patches:
            try:
                src, changed, msg = patch["fn"](game_id, src, context)
                if changed:
                    messages.append(f"{patch['name']}: {msg}")
                    game_changed = True
            except Exception as ex:
                messages.append(f"{patch['name']}: ERROR — {ex}")
                total_errors += 1

        if game_changed:
            total_changed += 1
            prefix = "[DRY RUN] " if dry_run else ""
            print(f"  {prefix}[{game_id}] CHANGED")
            for msg in messages:
                print(f"    • {msg}")
            if not dry_run:
                with open(index_path, "w", encoding="utf-8") as f:
                    f.write(src)
        else:
            if messages:
                print(f"  [{game_id}] skipped — {'; '.join(messages)}")
            total_skipped += 1

    print(f"\nDone. {total_changed} changed, {total_skipped} skipped, {total_errors} errors.")


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    args = [a for a in args if a != "--dry-run"]

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
