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


def get_exec_name(steam_data):
    """Extract the primary executable filename from Steam launch options."""
    launch = (steam_data or {}).get("launch", [])
    # Sort: 'default' type first, skip VR/tool categories
    for entry in sorted(launch, key=lambda x: 0 if x.get("type") == "default" else 1):
        cat = entry.get("category", "")
        if "vr" in cat.lower() or "tool" in cat.lower():
            continue
        exe = entry.get("executable", "")
        if exe:
            return os.path.basename(exe.replace("\\", "/"))
    return None


def get_demo_appid(steam_data):
    """Return the Steam App ID of the game's demo, or None if no demo exists.
    Steam appdetails includes a 'demos' array when a demo is available."""
    demos = (steam_data or {}).get("demos", [])
    if demos:
        return str(demos[0].get("appid", ""))
    return None


def get_epic_code_name(steam_data, appid):
    """Try to find the Unreal Engine project code name (EPIC_CODE_NAME).
    This is the folder that contains both the Binaries/ and Content/ subfolders.

    Method 1: Parse Steam launch executable paths for a folder before /Binaries/.
      e.g. 'ProjectName/Binaries/Win64/Game.exe' -> 'ProjectName'
    Method 2: Scrape the installdir from the steamdb.info app info page.
    Returns the code name string, or None if not found."""

    # Method 1: launch executable path contains folder structure
    for entry in (steam_data or {}).get("launch", []):
        exe = entry.get("executable", "").replace("\\", "/")
        m = re.match(r"([^/]+)/Binaries/", exe, re.IGNORECASE)
        if m:
            return m.group(1)

    # Method 2: installdir from steamdb.info (often matches the code name)
    try:
        html = http_get(f"https://steamdb.info/app/{appid}/info/")
        m = re.search(r"installdir\s*</td>\s*<td[^>]*>\s*([^<]+?)\s*</td>", html, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if val:
                return val
    except Exception:
        pass

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
    Returns True if found (EPICAPP_ID left as XXX for manual entry),
    False if not found (EPICAPP_ID set to null).
    Derives a URL slug from the game name and checks for a 404."""
    slug = re.sub(r"[^a-z0-9]+", "-", game_name.lower()).strip("-")
    url = f"https://store.epicgames.com/en-US/p/{slug}"
    try:
        http_get(url)
        return True
    except urllib.error.HTTPError as e:
        return e.code != 404
    except Exception:
        return True  # Network error — be conservative, leave as XXX


def lookup_pcgamingwiki(game_name):
    """Search PCGamingWiki and return the page URL or None."""
    url = (
        "https://www.pcgamingwiki.com/w/api.php"
        f"?action=query&list=search&srsearch={urllib.parse.quote(game_name)}"
        "&format=json&srlimit=3"
    )
    try:
        data = json.loads(http_get(url))
        pages = data.get("query", {}).get("search", [])
        if pages:
            title = pages[0]["title"]
            slug = urllib.parse.quote(title.replace(" ", "_"))
            return f"https://www.pcgamingwiki.com/wiki/{slug}"
    except Exception as e:
        print(f"    PCGamingWiki lookup error: {e}")
    return None


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
    pattern = rf'((?:const|let)\s+{re.escape(var_name)}\s*=\s*)["\']XXX["\']'
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


def update_discovery_ids(src, gog_id, epic_found):
    """Update DISCOVERY_IDS_ACTIVE to include all found store IDs.
    Always includes STEAMAPP_ID. Adds GOGAPP_ID if GOG found, EPICAPP_ID if
    Epic found (still XXX for user to fill in, but the variable ref is wired in)."""
    ids = ["STEAMAPP_ID"]
    if gog_id:
        ids.append("GOGAPP_ID")
    if epic_found:
        ids.append("EPICAPP_ID")
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

def create_extension(template_name, game_input, force=False):
    sgdb_key = os.environ.get("STEAMGRIDDB_API_KEY")
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

    game_id = derive_game_id(game_name)
    print(f"  Game ID  : {game_id}")

    # ── 2. Check destination ──────────────────────────────────────────────────
    dest = os.path.join(REPO_ROOT, f"game-{game_id}")
    if os.path.exists(dest):
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
    epic_found = check_epic(game_name)
    print(f"  Epic     : {'found (set ID manually)' if epic_found else 'not found'}")

    # ── 4. Executable, demo ID, and UE code name ─────────────────────────────
    exec_name = get_exec_name(steam_data)
    game_string = exec_name.replace(".exe", "").replace(".EXE", "") if exec_name else None
    demo_appid = get_demo_appid(steam_data)
    epic_code_name = get_epic_code_name(steam_data, appid)
    print(f"\n[Executable]")
    print(f"  Exec     : {exec_name or 'not found (left as XXX)'}")
    print(f"  Demo ID  : {demo_appid or 'none found'}")
    print(f"  UE code  : {epic_code_name or 'not found (left as XXX)'}")

    # ── 5. PCGamingWiki ───────────────────────────────────────────────────────
    time.sleep(0.3)
    pcgw_url = lookup_pcgamingwiki(game_name)
    print(f"\n[PCGamingWiki]")
    print(f"  {pcgw_url or 'not found'}")

    # ── 6. Copy template folder ───────────────────────────────────────────────
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
        # XBOXAPP_ID, XBOXEXECNAME, XBOX_PUB_ID — left as XXX (cannot automate)
        "GAME_NAME":        game_name,
        "GAME_NAME_SHORT":  short_name,
        "PCGAMINGWIKI_URL": pcgw_url,
        "EPIC_CODE_NAME":   epic_code_name,                    # UE4/5 and TFC templates
        "GAME_STRING":      game_string,                       # Unity templates (exe base name)
        "GAME_STRING_ALT":  game_string,                       # Unity UMM template
        "GAME_FOLDER":      game_string,                       # Cobra/ACSE template
        "FLUFFY_FOLDER":    game_string,                       # RE Engine template (best guess)
    }
    # Direct EXEC/EXEC_NAME assignments (for templates that use a literal)
    if exec_name:
        fields["EXEC"] = exec_name
        fields["EXEC_NAME"] = exec_name
        fields["EXEC_DEMO"] = None

    # ── 8. Apply substitutions to index.js ───────────────────────────────────
    index_path = os.path.join(dest, "index.js")
    src = open(index_path, encoding="utf-8").read()
    src = sub_header(src, game_name, today)
    src = apply_substitutions(src, fields)
    src = update_discovery_ids(src, gog_id, epic_found)
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
    args = parser.parse_args()
    create_extension(args.template, args.game, args.force)


if __name__ == "__main__":
    main()
