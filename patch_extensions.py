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
    python patch_extensions.py --list-patches                 # list all patches with enabled status and description
    python patch_extensions.py --only PATCH_NAME              # run only the named patch (bypasses enabled flag)
    python patch_extensions.py GAME_ID [GAME_ID ...] --only PATCH_NAME

Environment variables:
    VORTEX_MANIFEST_PATH  (optional) Path to Vortex extensions-manifest.json.
                          Default: C:\\Game_Tools\\0 GitHub Repos\\Vortex-Backend\\out\\extensions-manifest.json
"""

import argparse
import os
import re
import sys
from vortex_utils import (
    REPO_ROOT, TITLE_IMAGES_DIR,
    lookup_pcgamingwiki, extract_game_name,
    REGISTER_ACTIONS, run_generate_explained, run_generate_explained_batch,
    fetch_epic_app_id, add_to_discovery_ids,
    const_value, is_unset, is_missing, set_or_insert,
    inject_register_actions, find_fn_body,
    list_game_ids, write_index_js, resize_images_to, log_info, log_warn,
    load_vortex_manifest, resize_pngs_in_dirs,
    is_placeholder_value, replace_const_rhs, print_count_summary,
)
MANIFEST_PATH = os.environ.get("VORTEX_MANIFEST_PATH", r"C:\Game_Tools\0 GitHub Repos\Vortex-Backend\out\extensions-manifest.json")
NEXUS_SITE_BASE = "https://www.nexusmods.com/site/mods"


# ── Patches ───────────────────────────────────────────────────────────────────

def patch_extension_url(game_id, src, context):
    """
    Set EXTENSION_URL to https://www.nexusmods.com/site/mods/{modId}.
    Skips if modId not in manifest or value is already a real URL.
    """
    manifest = context["manifest"]
    mod_id = manifest.get(game_id)
    if not mod_id:
        return src, False, SKIP_NO_MOD_ID

    current = const_value(src, "EXTENSION_URL")
    if current and not is_unset(current) and current != "null":
        if not context.get("force"):
            return src, False, SKIP_ALREADY_SET

    url = f"{NEXUS_SITE_BASE}/{mod_id}"
    new_src = set_or_insert(src, "EXTENSION_URL", url, comment="Nexus link to this extension. Used for links")
    return new_src, True, f"set to {url}"


def patch_epic_app_id(game_id, src, context):
    """
    Fill in EPICAPP_ID where the value is "" by querying egdata.app with the
    game name. Skips null (not on Epic), "XXX" (intentional placeholder), and
    already-set real IDs. Use --force to overwrite already-set real IDs.
    """
    current = const_value(src, "EPICAPP_ID")
    if current is None:
        return src, False, SKIP_NO_EPICAPP_ID
    if current == "null":
        return src, False, SKIP_NULL_NOT_ON_EPIC
    if is_placeholder_value(current):
        return src, False, SKIP_XXX_INTENTIONAL

    is_empty = bool(re.match(r'^["\']["\']$', current))
    if not is_empty and not context.get("force"):
        return src, False, SKIP_ALREADY_SET

    game_name = extract_game_name(src)
    if not game_name:
        return src, False, "could not extract game name"

    app_id, _ = fetch_epic_app_id(game_name)
    if not app_id:
        return src, False, f"not found on egdata.app for '{game_name}'"

    new_src = replace_const_rhs(src, "EPICAPP_ID", f'"{app_id}"')
    if new_src == src:
        return src, False, "regex substitution had no effect"
    return new_src, True, f"set to {app_id}"


def patch_discovery_ids(game_id, src, context):
    """
    Add any resolved store IDs (STEAMAPP_ID_DEMO, GOGAPP_ID, EPICAPP_ID,
    XBOXAPP_ID, UPLAYAPP_ID, EAAPP_ID) to DISCOVERY_IDS_ACTIVE if they have
    real values and are not already in the array. Delegates all logic to
    add_to_discovery_ids() from vortex_utils.
    """
    new_src = add_to_discovery_ids(src)
    if new_src == src:
        return src, False, SKIP_ALREADY_UP_TO_DATE
    return new_src, True, "updated DISCOVERY_IDS_ACTIVE"


def patch_pcgamingwiki_url(game_id, src, context):
    """
    Set PCGAMINGWIKI_URL by looking up the game name on PCGamingWiki.
    Skips if PCGW is unreachable or no match found, or value already set.
    Use --force-pcgw to overwrite already-set values (e.g. to correct wrong URLs).
    """
    current = const_value(src, "PCGAMINGWIKI_URL")
    if current and not is_unset(current) and current != "null":
        if not context.get("force_pcgw"):
            return src, False, SKIP_ALREADY_SET

    game_name = extract_game_name(src)
    page_url = None

    if game_name:
        page_url, _title = lookup_pcgamingwiki(game_name, debug=context.get("debug", False))

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
        return src, False, SKIP_ALREADY_SET

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
        return src, False, SKIP_ALREADY_SET

    name = extract_game_name(src)
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
        r'^function\s+isDir\b',
        "function isDir(folder, file) {\n"
        "  const stats = fs.statSync(path.join(folder, file));\n"
        "  return stats.isDirectory();\n"
        "}\n"
    ),
    (
        "statCheckSync",
        r'^function\s+statCheckSync\b',
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
        r'^async\s+function\s+statCheckAsync\b',
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
        r'^async\s+function\s+getAllFiles\b',
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
        r'^const\s+getDiscoveryPath\b',
        "const getDiscoveryPath = (api) => { //get the game's discovered path\n"
        "  const state = api.getState();\n"
        "  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});\n"
        "  return discovery === null || discovery === void 0 ? void 0 : discovery.path;\n"
        "};\n"
    ),
    (
        "purge",
        r'^async\s+function\s+purge\b',
        "async function purge(api) {\n"
        "  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));\n"
        "}\n"
    ),
    (
        "deploy",
        r'^async\s+function\s+deploy\b',
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
               if not re.search(pattern, src, re.MULTILINE)]
    if not missing:
        return src, False, SKIP_ALREADY_SET

    m = re.search(r'^function\s+modTypePriority\b', src, re.MULTILINE)
    if not m:
        return src, False, "could not find modTypePriority anchor"

    block = "\n".join(code for _, code in missing)
    new_src = src[:m.start()] + block + "\n" + src[m.start():]
    return new_src, True, f"inserted {', '.join(name for name, _ in missing)}"


def patch_register_actions(game_id, src, context):
    """
    Inject standard context.registerAction calls inside applyGame() for any
    that are missing: Open Config/Save Folder (commented out), Open PCGamingWiki
    Page, View Changelog, Submit Bug Report, Open Downloads Folder.
    """
    if not re.search(r'\nfunction applyGame\b|\nasync function applyGame\b', src):
        return src, False, "no applyGame function found"
    new_src, missing_labels = inject_register_actions(src)
    if not missing_labels:
        return src, False, SKIP_ALREADY_SET
    return new_src, True, f"inserted {', '.join(missing_labels)}"


def patch_setup_vars(game_id, src, context):
    """
    Ensure the setup() function sets GAME_PATH, STAGING_FOLDER, DOWNLOAD_FOLDER
    (and GAME_VERSION if setGameVersion is defined) at the top of its body.
    Lines already present in the setup body are not duplicated.
    """
    m_setup = re.search(r'^(?:async\s+)?function\s+setup\b', src, re.MULTILINE)
    if not m_setup:
        return src, False, "no setup function found"

    body_start, body_end = find_fn_body(src, m_setup.start())
    if body_start is None:
        return src, False, "could not parse setup function body"

    body = src[body_start:body_end]
    # Determine which lines are missing from the setup body
    needed = [
        ("const state",     r'\bconst\s+state\s*=',
         "  const state = api.getState();"),
        ("GAME_PATH",       r'\bGAME_PATH\s*=',
         "  GAME_PATH = discovery.path;"),
        ("STAGING_FOLDER",  r'\bSTAGING_FOLDER\s*=',
         "  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);"),
        ("DOWNLOAD_FOLDER", r'\bDOWNLOAD_FOLDER\s*=',
         "  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);"),
    ]

    missing_lines = []
    missing_names = []
    for name, pattern, line in needed:
        if not re.search(pattern, body):
            missing_lines.append(line)
            missing_names.append(name)

    if not missing_lines:
        return src, False, SKIP_ALREADY_SET

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
        body_start, body_end = find_fn_body(new_src, brace_pos)
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
        return src, False, SKIP_ALREADY_SET
    return new_src, True, f"inserted const api in {inserted} context.once block(s)"


# ── Patch registry ────────────────────────────────────────────────────────────
# Add new patches here. Set enabled=False to skip without removing.

PATCHES = [
    {"name": "game_name",           "enabled": True, "fn": patch_game_name},
    {"name": "folder_vars",         "enabled": True, "fn": patch_folder_vars},
    {"name": "utility_functions",   "enabled": True, "fn": patch_utility_functions},
    {"name": "setup_vars",          "enabled": True, "fn": patch_setup_vars},
    {"name": "register_actions",    "enabled": True, "fn": patch_register_actions},
    {"name": "context_once_api",    "enabled": True, "fn": patch_context_once_api},
    {"name": "extension_url",       "enabled": True, "fn": patch_extension_url},
    {"name": "pcgamingwiki_url",    "enabled": True, "fn": patch_pcgamingwiki_url},
    {"name": "epic_app_id",         "enabled": True, "fn": patch_epic_app_id},
    {"name": "discovery_ids",       "enabled": True, "fn": patch_discovery_ids},
]


def run_title_image_resize(game_ids, dry_run):
    """Resize all non-1920x1080 title images in resources/title-images/ to 1920x1080."""
    if not os.path.isdir(TITLE_IMAGES_DIR):
        print("Title image resize skipped -- resources/title-images/ not found\n")
        return
    pairs = [
        (os.path.join(TITLE_IMAGES_DIR, f"{gid}_title.jpg"), f"title-images/{gid}_title.jpg")
        for gid in game_ids
    ]
    try:
        r, a, m = resize_images_to(pairs, (1920, 1080), dry_run=dry_run)
    except ImportError:
        print("Title image resize skipped -- Pillow not installed (pip install Pillow)\n")
        return
    print(f"\nTitle image resize: {r} resized, {a} already 1920x1080, {m} missing.\n")


def run_cover_art_resize(game_ids, dry_run):
    """Resize all non-640x360 cover art (GAME_ID.jpg) in game-* folders to 640x360."""
    pairs = [
        (os.path.join(REPO_ROOT, f"game-{gid}", f"{gid}.jpg"), f"game-{gid}/{gid}.jpg")
        for gid in game_ids
    ]
    try:
        r, a, m = resize_images_to(pairs, (640, 360), dry_run=dry_run)
    except ImportError:
        print("Cover art resize skipped -- Pillow not installed (pip install Pillow)\n")
        return
    print(f"\nCover art resize: {r} resized, {a} already 640x360, {m} missing.\n")


# ── Patch listing ─────────────────────────────────────────────────────────────

def list_patches():
    """Print all patches with their enabled status and first docstring line."""
    col = max(len(p["name"]) for p in PATCHES)
    for p in PATCHES:
        fn = p["fn"]
        doc = (fn.__doc__ or "").strip().splitlines()[0] if fn.__doc__ else "(no description)"
        status = "enabled " if p["enabled"] else "disabled"
        print(f"  [{status}] {p['name']:<{col}}  {doc}")  # noqa: raw-log-print


# ── Runner ────────────────────────────────────────────────────────────────────

# Named sentinel strings returned by patches to suppress per-game output.
# Patches must return one of these constants (not a free string) to stay silent.
SKIP_ALREADY_SET        = "already set"
SKIP_NULL_NOT_ON_EPIC   = "null (not on Epic)"
SKIP_NO_EPICAPP_ID      = "no EPICAPP_ID in source"
SKIP_XXX_INTENTIONAL    = "XXX (intentional placeholder)"
SKIP_NO_MOD_ID          = "no modId in manifest"
SKIP_ALREADY_UP_TO_DATE = "already up to date"

_SILENT_MSGS = frozenset({
    SKIP_ALREADY_SET, SKIP_NULL_NOT_ON_EPIC, SKIP_NO_EPICAPP_ID,
    SKIP_XXX_INTENTIONAL, SKIP_NO_MOD_ID, SKIP_ALREADY_UP_TO_DATE,
})


def run_patches(game_ids, dry_run, context, only=None):
    if only:
        active_patches = [p for p in PATCHES if p["name"] == only]
    else:
        active_patches = [p for p in PATCHES if p["enabled"]]
    total_changed = 0
    total_skipped = 0
    total_errors = 0
    changed_ids = []

    try:
        for game_id in game_ids:
            index_path = os.path.join(REPO_ROOT, f"game-{game_id}", "index.js")
            if not os.path.isfile(index_path):
                log_info(game_id, "SKIP - no index.js found")
                total_skipped += 1
                continue

            with open(index_path, encoding="utf-8", errors="replace") as f:
                src = f.read()

            original_src = src
            game_changed = False
            changed_msgs = []
            fail_msgs = []  # non-trivial skips worth showing

            for patch in active_patches:
                try:
                    src, changed, msg = patch["fn"](game_id, src, context)
                    if changed:
                        changed_msgs.append(f"{patch['name']}: {msg}")
                        game_changed = True
                    elif msg not in _SILENT_MSGS:
                        fail_msgs.append(f"{patch['name']}: {msg}")
                except Exception as ex:
                    fail_msgs.append(f"{patch['name']}: ERROR - {ex}")
                    total_errors += 1

            if game_changed:
                total_changed += 1
                log_info(game_id, f"{'[DRY RUN] ' if dry_run else ''}CHANGED")
                for msg in changed_msgs:
                    print(f"    - {msg}")
                if not dry_run:
                    write_index_js(os.path.join(REPO_ROOT, f"game-{game_id}"), src)
                    changed_ids.append(game_id)
            else:
                if fail_msgs:
                    log_warn(game_id, '; '.join(fail_msgs))
                total_skipped += 1

    except KeyboardInterrupt:
        print("\n\n  Interrupted.")
    finally:
        print_count_summary({"changed": total_changed, "skipped": total_skipped, "errors": total_errors})

    if changed_ids and not dry_run:
        ok, err = run_generate_explained_batch(changed_ids)
        if not ok:
            print(f"  ! generate_explained.js batch failed: {err}")


def main():
    parser = argparse.ArgumentParser(
        description="Apply repo-wide patches to all game-*/index.js files."
    )
    parser.add_argument(
        "game",
        nargs="*",
        metavar="GAME_ID",
        help="One or more game IDs to target. Omit to run on all.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-run all URL patches even if values are already set.",
    )
    parser.add_argument(
        "--force-pcgw",
        action="store_true",
        help="Re-evaluate PCGAMINGWIKI_URL values that are already set.",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Print raw PCGamingWiki search results for diagnosis.",
    )
    parser.add_argument(
        "--list-patches",
        action="store_true",
        help="List all patches with their enabled status and description, then exit.",
    )
    parser.add_argument(
        "--only",
        metavar="PATCH_NAME",
        help="Run only this named patch (bypasses the enabled flag). Use --list-patches to see names.",
    )
    args = parser.parse_args()

    if args.list_patches:
        list_patches()
        sys.exit(0)

    if args.only:
        patch_names = {p["name"] for p in PATCHES}
        if args.only not in patch_names:
            print(f"ERROR: unknown patch '{args.only}'. Use --list-patches to see available patches.")
            sys.exit(1)

    dry_run = args.dry_run
    target_ids = args.game if args.game else None

    print("Loading context...")
    context = {
        "manifest": load_vortex_manifest(MANIFEST_PATH),
        "force_pcgw": args.force_pcgw or args.force,
        "force": args.force,
        "debug": args.debug,
    }

    if target_ids:
        game_ids = target_ids
    else:
        game_ids = list_game_ids()

    if args.only:
        print(f"Running patch '{args.only}' on {len(game_ids)} game(s){' [DRY RUN]' if dry_run else ''}...\n")
    else:
        print(f"Running {len([p for p in PATCHES if p['enabled']])} patch(es) on {len(game_ids)} game(s){' [DRY RUN]' if dry_run else ''}...\n")
    run_patches(game_ids, dry_run, context, only=args.only)

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
    resize_pngs_in_dirs(png_folders, dry_run=dry_run)

    print(f"Checking title images for {len(game_ids)} game(s){' [DRY RUN]' if dry_run else ''}...\n")
    run_title_image_resize(game_ids, dry_run)

    print(f"Checking cover art for {len(game_ids)} game(s){' [DRY RUN]' if dry_run else ''}...\n")
    run_cover_art_resize(game_ids, dry_run)


if __name__ == "__main__":
    main()
