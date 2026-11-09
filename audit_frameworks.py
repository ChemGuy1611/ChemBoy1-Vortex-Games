"""
audit_frameworks.py

Mechanical layer for the framework audit: looks through each game's Nexus mods for modding
frameworks that its extension would need real changes to support. A framework the extension's
existing installers already cover (one that loads regular mods from the ~mods folder, say)
needs no change and is not a finding.

Read-only. Output is a worklist to judge by hand, never a patch.

Each template family has a profile (see PROFILES) that decides what counts as handled and
which verdicts apply. The families are ue4-5, unity and basic. The UE4-5 verdicts are
described first; the Unity and basic ones follow them.

Two signals, both from the Nexus v2 GraphQL API:

1. Requirement graph. Scans the game's top mods by downloads for mods that many others
   list as a requirement. Popular content mods get required too, so the count only picks
   candidates. Each candidate's own archive and a sample of its dependents' archives then
   decide the verdict:
     extra-exts  Dependents ship an extension beside their paks that the pak installer
                 would drop. Usual fix: PAKMOD_EXTRA_EXTS.
     loose-files Dependents ship an unhandled extension away from any pak, and index.js
                 never names the candidate. Usual fix: a new mod type or installer.
     native-code The candidate ships a .dll/.asi/.exe and index.js never names it. Check
                 whether it installs correctly or needs a requirement entry.
     external    Off-site requirement listed by several top mods, and index.js never
                 names it. No archive to read, so check by hand.
   A candidate with none of these is dropped: pak-only content mods, script or LogicMods
   loaders the UE4SS installers already cover, and signature-bypass loaders (a bitfix
   folder or a known sig bypass file), which the universal sig bypass already covers.

2. File name fingerprints. Samples config-style files across the whole game and reports a
   name recurring across many mods, even when no mod declares a requirement. Noisier than
   signal 1, because it cannot see whether the file sits beside a pak.

A file extension counts as handled when it is in the game's PAKMOD_EXTRA_EXTS or the pak
family, or when the game's index.js quotes it and template-ue4-5 does not (a game-specific
installer). A dependent one of the game's own installers would take is left out: a .uplugin
plus the game's MODKITMOD_FILE when hasModKit is on, or a file name the game's index.js
quotes and the template does not (inzoi's appearance.dat). Those file names are never
fingerprints either. resources/lists/framework-audit-reviewed.txt holds candidates already checked
and found to need no change. A name target there matches any mod name containing it, or the
whole name only when written with a leading "=" (=UE4SS skips plain UE4SS uploads but still
reports custom builds such as "ML-UE4SS Mod Loader"). A scope there is a GAME_ID, * for every
game, or @<family> for one template family. Deprecated extensions (games-deprecated.txt) and
extensions that are never released (games-never-upload.txt) are skipped unless named on the
command line.

Unity verdicts (template-unitymelonloaderbepinex-hybrid):
    loader-build  The candidate ships a BepInEx or MelonLoader core tree and is not the page
                  the game's BEPINEX_PAGE_NO / MELON_PAGE_NO / CUSTOMLOADER_PAGE_NO points at.
                  Usual fix: point the page constant at it, if it is more than a stock repack.
    custom-loader The candidate ships a proxy dll or .exe with no such tree, and index.js
                  never names it. Usual fix: the hasCustomLoader toggle set.
    loose-files   Dependents with no .dll and no other file an installer claims, so they reach
                  the fallback installer. Usual fix: a new mod type or installer.
    external      As above, ignoring off-site BepInEx and MelonLoader links.
A candidate that is only plugin dlls is dropped: the plugin installer takes it and its
dependents. Unity extensions are matched on their own extension constants, not the template's,
because the template quotes .json behind a toggle that is off by default.

Basic verdicts (template-basic):
    native-code   The candidate ships a .dll/.asi/.exe and index.js never names it. Check
                  whether it installs correctly or needs a requirement entry.
    loose-files   Dependents with no file an installer claims. Only for a game that quotes its
                  own mod extension: a game with no mod extension sends whole archives to its
                  mod folder, so an unhandled extension means nothing there.
    external      As above.

Usage:
    python audit_frameworks.py                      # every game in every family
    python audit_frameworks.py --family basic       # one family (repeatable)
    python audit_frameworks.py deadasdisco tekken8  # just these games
    python audit_frameworks.py --json               # machine-readable report
    python audit_frameworks.py --show-dropped       # also list dropped candidates
    python audit_frameworks.py --min-requirers 10   # candidate threshold (default 5)

Environment variables:
    NEXUS_API_KEY  Required. Read from env var, with HKCU/HKLM registry fallback.

Exit code 1 if any game has a finding or could not be checked, 0 otherwise. A game with no
Nexus page is counted separately and does not affect the exit code. Progress and warnings go
to stderr, so --json output on stdout always parses.
"""

import argparse
import fnmatch
import json
import math
import os
import re
import sys
import time
from typing import NamedTuple

from vortex_utils import (
    DEPRECATED_GAMES, LISTS_DIR, NEVER_UPLOAD_GAMES, REPO_ROOT, get_api_key, iter_game_folders,
    nexus_game_id_for_domain, nexus_graphql, read_id_list, read_index_js,
)

REVIEWED_LIST = os.path.join(LISTS_DIR, "framework-audit-reviewed.txt")

TOP_MODS = 60  # 80 can pass the API's query complexity cap of 10000 once requirements are selected
MIN_REQUIRERS = 5
MIN_TALLY = 3  # top mods naming the same requirement, for one outside the top mods
MAX_CANDIDATES = 10  # per game
DEPENDENT_SAMPLE = 12
OWN_FILES = 80  # the API caps count at 80
DEPENDENT_FILES = 40
DEPENDENT_MIN_SHARE = 0.25
DEPENDENT_MIN_MODS = 3

FINGERPRINT_EXTS = (".json", ".toml", ".yaml", ".xml", ".ini")
FINGERPRINT_PAGES = 3
FINGERPRINT_MIN_MODS = 5

PAK_FAMILY = frozenset({".pak", ".ucas", ".utoc"})
NATIVE_EXTS = frozenset({".dll", ".asi", ".exe"})
# Readmes, images, archives and unpacked source assets say nothing about a framework.
NOISE_EXTS = frozenset({
    ".txt", ".md", ".pdf", ".doc", ".docx", ".rtf", ".nfo", ".html", ".htm", ".url", ".log",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".mp4",
    ".zip", ".7z", ".rar", ".bak", ".tmp", ".db", ".ds_store",
    ".uasset", ".uexp", ".ubulk", ".umap", ".blend", ".fbx", ".tga", ".psd",
})
# Common loader proxy names, too generic to prove index.js knows a framework.
PROXY_DLLS = frozenset({
    "dwmapi", "dsound", "version", "winmm", "winhttp", "xinput1_3", "xinput1_4",
    "d3d11", "d3d12", "dxgi", "dinput8", "bink2w64", "ue4ss",
})
# Files that mark a signature-bypass loader. The universal sig bypass the extensions install
# already covers these, whatever the mod page calls itself (inzoi's IZPL ships bitfix/sig_bypass.lua).
SIGBYPASS_FOLDERS = frozenset({"bitfix"})
SIGBYPASS_FILES = frozenset({"sig.lua", "sig_bypass.lua", "universal.lua", "universalsigbypasser.asi"})
# File types whose name can tie a framework to a constant in index.js (SIGBYPASS_LUA = "sig.lua").
IDENTIFYING_EXTS = NATIVE_EXTS | {".lua"}
GENERIC_FILES = frozenset({"main.lua", "init.lua", "config.lua"})
ACRONYM_STOPWORDS =frozenset({"UE4", "UE5", "UE4SS", "DLC", "NPC", "FPS", "HUD", "NSFW", "MOD", "PAK"})

REQUEST_SLEEP_SECONDS = 0.2
RETRY_SLEEP_SECONDS = 5
RETRIES = 2

EXT_LITERAL = re.compile(r"""["'`](\.[A-Za-z0-9]{1,8})["'`]""")
FILE_LITERAL = re.compile(r"""["'`]([A-Za-z0-9_\-]+\.[A-Za-z0-9]{1,8})["'`]""")
EXTRA_EXTS_CONST = re.compile(r"const\s+PAKMOD_EXTRA_EXTS\s*=\s*\[([^\]]*)\]\s*;?")
MODKIT_ON = re.compile(r"const\s+hasModKit\s*=\s*true\s*;?")
MODKIT_FILE_CONST = re.compile(r"""const\s+MODKITMOD_FILE\s*=\s*["']([^"']+)["']\s*;?""")
NEXUS_PAGE_ID = re.compile(r"""nexusPageId["']?\s*:\s*["']([^"']+)["']""")
NEXUS_PAGE_ID_CONST = re.compile(r"""nexusPageId["']?\s*:\s*([A-Za-z_][A-Za-z0-9_]*)""")
ACRONYM = re.compile(r"\b[A-Z][A-Z0-9]{2,}\b")

UNITY_HANDLED_EXTS = frozenset({".dll", ".assets", ".resource", ".ress"})
# Image files are real payload in a Unity texture pack, unlike the UE case.
UNITY_NOISE_EXTS = NOISE_EXTS - {".png", ".jpg", ".jpeg", ".bmp", ".tga"}
UNITY_FINGERPRINT_EXTS = FINGERPRINT_EXTS + (".cfg",)
UNITY_STOPWORDS = ACRONYM_STOPWORDS | {"IL2CPP", "BEPINEX", "MONO", "API", "NET", "CPP", "UNITY"}
UNITY_STOCK_LOADER = re.compile(r"bepinex|beepinex|melonloader", re.IGNORECASE)
EXTS_CONST = re.compile(r"const\s+([A-Z0-9_]+_EXTS)\s*=\s*\[([^\]]*)\]\s*;?")
LOADER_PAGE_CONST = re.compile(r"const\s+(?:BEPINEX|MELON|CUSTOMLOADER)_PAGE_NO\s*=\s*(\d+)\s*;?")
TEXTURE_REPLACER_ON = re.compile(r"const\s+hasTextureReplacer\s*=\s*true\s*;?")
CUSTOM_MODS_ON = re.compile(r"const\s+hasCustomMods\s*=\s*true\s*;?")

# Saves and settings: quoted by many basic games and shipped by many mods (ReShade presets),
# so they neither mark a game's mod format nor count as a dependent's unhandled file.
BASIC_NON_MOD_EXTS = frozenset({".sav", ".save", ".ini", ".cfg", ".xxx"})

TOP_MODS_QUERY = """
query($domain: String!, $count: Int!) {
    mods(filter: { gameDomainName: [{ value: $domain, op: EQUALS }] },
         sort: [{ downloads: { direction: DESC } }], count: $count) {
        totalCount
        nodes {
            modId
            name
            modRequirements {
                nexusRequirements { nodes { modId modName gameId externalRequirement url } }
                modsRequiringThisMod { totalCount }
            }
        }
    }
}"""


def normalize_name(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def load_reviewed(path=REVIEWED_LIST):
    """Return [{scope, target, reason}] from the hand-maintained reviewed list. A line with
    no reason is reported and ignored, so a candidate is never hidden without an explanation."""
    entries = []
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p.strip() for p in line.split("|", 2)]
            if len(parts) != 3 or not all(parts):
                print(f"  WARNING: ignoring malformed reviewed entry: {line}", file=sys.stderr)
                continue
            entries.append({"scope": parts[0], "target": parts[1], "reason": parts[2]})
    return entries


def scope_matches(entry, game_id, family):
    return entry["scope"] in ("*", game_id, f"@{family}")


def reviewed_reason_for_mod(reviewed, game_id, family, name, mod_id):
    wanted = normalize_name(name or "")
    for entry in reviewed:
        if not scope_matches(entry, game_id, family):
            continue
        target = entry["target"]
        if target.startswith("file:"):
            continue
        if target.startswith("mod:"):
            if target[4:].strip() == str(mod_id):
                return entry["reason"]
            continue
        if target.startswith("="):
            if normalize_name(target[1:]) == wanted:
                return entry["reason"]
            continue
        if normalize_name(target) in wanted:
            return entry["reason"]
    return None


def reviewed_reason_for_file(reviewed, game_id, family, file_name):
    for entry in reviewed:
        target = entry["target"]
        if scope_matches(entry, game_id, family) and target.startswith("file:") \
                and fnmatch.fnmatchcase(file_name.lower(), target[5:].strip().lower()):
            return entry["reason"]
    return None


def extension_literals(src):
    return {ext.lower() for ext in EXT_LITERAL.findall(src or "")}


def file_literals(src):
    return {name.lower() for name in FILE_LITERAL.findall(src or "")}


def template_context(template_src):
    return {"exts": extension_literals(template_src), "files": file_literals(template_src),
            "ext_consts": {name for name, _body in EXTS_CONST.findall(template_src)}}


def build_ext_context(src, template):
    """What this game's extension already handles.
    pak: extensions installed beside paks. game: extensions quoted by this game but not the
    template, so it has its own installer. template: extensions quoted by the template, covered
    away from paks only. game_files: file names quoted by this game but not the template, which
    its own installers key on (inzoi's appearance.dat). modkit_file: the ModKit manifest name
    when hasModKit is on, else None."""
    pak = set(PAK_FAMILY)
    match = EXTRA_EXTS_CONST.search(src)
    if match:
        pak |= {ext.lower() for ext in EXT_LITERAL.findall(match.group(1))}
    modkit_file = None
    if MODKIT_ON.search(src):
        manifest = MODKIT_FILE_CONST.search(src)
        modkit_file = manifest.group(1).lower() if manifest else None
    return {"pak": pak, "game": extension_literals(src) - template["exts"],
            "template": set(template["exts"]), "game_files": file_literals(src) - template["files"],
            "modkit_file": modkit_file}


def build_unity_context(src, template):
    """What a Unity extension handles. game: extensions an installer claims, from the fixed
    Unity set, the toggles that are on, and anything this game quotes beyond the template.
    pinned_loaders: Nexus page ids the extension already installs a loader from."""
    handled = set(UNITY_HANDLED_EXTS)
    if TEXTURE_REPLACER_ON.search(src):
        handled.add(".png")
    if CUSTOM_MODS_ON.search(src):
        handled.add(".json")
    # A game's own *_EXTS array backs a game-specific installer, even for an extension the
    # template also quotes (silksong's SKIN_EXTS = [".png"]).
    for const_name, body in EXTS_CONST.findall(src):
        if const_name not in template["ext_consts"]:
            handled |= {ext.lower() for ext in EXT_LITERAL.findall(body)}
    return {"pak": set(), "game": handled | (extension_literals(src) - template["exts"]),
            "template": set(template["exts"]), "game_files": file_literals(src) - template["files"],
            "skip_files": set(template["files"]), "modkit_file": None, "stopwords": UNITY_STOPWORDS,
            "pinned_loaders": {page for page in LOADER_PAGE_CONST.findall(src) if page != "0"}}


def build_basic_context(src, template):
    """What a basic extension handles. game: extensions an installer can claim, this game's own
    plus the template's binaries. mod_exts: this game's own extensions that mark a mod format,
    empty for a game that sends whole archives to its mod folder."""
    own = extension_literals(src) - template["exts"]
    return {"pak": set(), "game": (own | template["exts"]) - {".xxx"},
            "mod_exts": own - BASIC_NON_MOD_EXTS - NOISE_EXTS,
            "template": set(template["exts"]), "game_files": file_literals(src) - template["files"],
            "skip_files": set(template["files"]), "modkit_file": None, "stopwords": ACRONYM_STOPWORDS}


def _base_names(files):
    return {os.path.basename((n.get("filePath") or "").replace(chr(92), "/")).lower() for n in files}


def is_installer_package(files, ctx):
    """True when one of the game's own installers would take this archive: a .uplugin plus the
    game's ModKit manifest (the pair testModKitMod looks for), or a file name only this game's
    index.js quotes."""
    names = _base_names(files)
    if names & ctx.get("game_files", set()):
        return True
    manifest = ctx.get("modkit_file")
    return bool(manifest) and manifest in names and any(_file_ext(n) == ".uplugin" for n in files)


def extension_domain(game_id, src):
    """The Nexus domain: GAME_ID, unless the game sets nexusPageId, as a literal or a const
    (gzdoom has no domain of its own and points at doom1993's)."""
    match = NEXUS_PAGE_ID.search(src)
    if match:
        return match.group(1)
    match = NEXUS_PAGE_ID_CONST.search(src)
    if match:
        value = re.search(rf"""const\s+{match.group(1)}\s*=\s*["']([^"']+)["']\s*;?""", src)
        if value:
            return value.group(1)
    return game_id


def _file_ext(node):
    ext = (node.get("fileExtension") or "").lower()
    if ext:
        return ext
    return os.path.splitext(node.get("filePath") or "")[1].lower()


def _file_dir(node):
    return (node.get("filePath") or "").replace(chr(92), "/").rpartition("/")[0].lower()


def split_by_pak_neighbours(files):
    """Return (beside, away): extensions in the same archive folder as a pak, and elsewhere."""
    pak_dirs = {(n.get("fileId"), _file_dir(n)) for n in files if _file_ext(n) == ".pak"}
    beside, away = set(), set()
    for node in files:
        ext = _file_ext(node)
        if not ext or ext in PAK_FAMILY:
            continue
        (beside if (node.get("fileId"), _file_dir(node)) in pak_dirs else away).add(ext)
    return beside, away


def is_sig_bypass(own_files):
    for node in own_files:
        parts = (node.get("filePath") or "").replace(chr(92), "/").lower().split("/")
        if parts[-1] in SIGBYPASS_FILES or SIGBYPASS_FOLDERS & set(parts[:-1]):
            return True
    return False


def is_named_in_source(name, own_files, src, stopwords=ACRONYM_STOPWORDS):
    """True when index.js already names this mod: its full name, an acronym, or a native file."""
    if normalize_name(name) in normalize_name(src):
        return True
    # Word start only: CNS matches CNSJSON_ID, but ZOI must not match inZOI.
    if any(token not in stopwords and re.search(rf"(?<![A-Za-z0-9]){token}", src)
           for token in ACRONYM.findall(name)):
        return True
    src_lower = src.lower()
    for node in own_files:
        if _file_ext(node) not in IDENTIFYING_EXTS:
            continue
        base = os.path.basename((node.get("filePath") or "").replace(chr(92), "/")).lower()
        stem = os.path.splitext(base)[0]
        if stem and stem not in PROXY_DLLS and base not in GENERIC_FILES and base in src_lower:
            return True
    return False


def classify_candidate(name, own_files, dependent_files, ctx, src):
    """Decide what a candidate would need. dependent_files is {mod_id: [file nodes]}.
    Returns {"verdicts": [...], "why_dropped": str or None, "evidence": {...}}."""
    with_files = [files for files in dependent_files.values() if files]
    sampled = [files for files in with_files if not is_installer_package(files, ctx)]
    installer_skipped = len(with_files) - len(sampled)
    threshold = max(DEPENDENT_MIN_MODS, math.ceil(len(sampled) * DEPENDENT_MIN_SHARE))
    beside_counts, away_counts = {}, {}
    for files in sampled:
        beside, away = split_by_pak_neighbours(files)
        for ext in beside:
            beside_counts[ext] = beside_counts.get(ext, 0) + 1
        for ext in away:
            away_counts[ext] = away_counts.get(ext, 0) + 1

    handled_beside = ctx["pak"] | ctx["game"] | NOISE_EXTS
    handled_away = handled_beside | ctx["template"]
    extra = {e: n for e, n in beside_counts.items() if n >= threshold and e not in handled_beside}
    loose = {e: n for e, n in away_counts.items() if n >= threshold and e not in handled_away}
    own_exts = {_file_ext(node) for node in own_files}
    if is_sig_bypass(own_files):
        return {"verdicts": [], "why_dropped": "signature bypass, covered by the universal sig bypass",
                "evidence": {"own_exts": sorted(e for e in own_exts if e)}}
    native = sorted(own_exts & NATIVE_EXTS)
    named = is_named_in_source(name, own_files, src)

    # A named framework already has its own installer, which is where its mods' loose files go.
    # Files beside paks still count: the pak installer drops them whatever else exists.
    verdicts = []
    if extra:
        verdicts.append("extra-exts")
    if loose and not named:
        verdicts.append("loose-files")
    if native and not named:
        verdicts.append("native-code")

    why_dropped = None
    if not verdicts:
        if named:
            why_dropped = "index.js already names it"
        elif installer_skipped and not sampled:
            why_dropped = "dependents match the game's own installers (ModKit or a game-specific file)"
        elif own_exts and own_exts <= (PAK_FAMILY | NOISE_EXTS):
            why_dropped = "pak-only, dependents need nothing extra"
        elif ".lua" in own_exts or any("logicmods" in _file_dir(n) for n in own_files):
            why_dropped = "script or LogicMods loader, covered by the UE4SS installers"
        elif not own_files:
            why_dropped = "no archive contents available"
        else:
            why_dropped = "nothing beyond what the extension handles"
    return {
        "verdicts": verdicts,
        "why_dropped": why_dropped,
        "evidence": {
            "own_exts": sorted(e for e in own_exts if e),
            "dependents_sampled": len(sampled),
            "installer_dependents_skipped": installer_skipped,
            "extra_exts": extra,
            "loose_exts": loose,
        },
    }


def classify_ue(candidate, own_files, dependent_files, ctx, src):
    return classify_candidate(candidate["name"], own_files, dependent_files, ctx, src)


def has_loader_tree(own_files):
    """True when the archive carries a BepInEx or MelonLoader core, not just a plugin for one."""
    return any("bepinex/core" in folder or "melonloader" in folder.split("/")
               for folder in (_file_dir(node) for node in own_files))


def ships_proxy_or_exe(own_files):
    for node in own_files:
        ext = _file_ext(node)
        base = os.path.basename((node.get("filePath") or "").replace(chr(92), "/")).lower()
        if ext == ".exe" or (ext == ".dll" and os.path.splitext(base)[0] in PROXY_DLLS):
            return True
    return False


def has_root_folder(files):
    """True when an archive holds the game's <name>_Data folder, which the root installer takes."""
    return any(part.endswith("_data") for node in files for part in _file_dir(node).split("/"))


def classify_unity(candidate, own_files, dependent_files, ctx, src):
    """Decide what a Unity candidate would need. See the module docstring for the verdicts."""
    with_files = [files for files in dependent_files.values() if files]
    sampled = [files for files in with_files if not is_installer_package(files, ctx)]
    installer_skipped = len(with_files) - len(sampled)
    threshold = max(DEPENDENT_MIN_MODS, math.ceil(len(sampled) * DEPENDENT_MIN_SHARE))
    loose_counts = {}
    for files in sampled:
        exts = {_file_ext(node) for node in files}
        if exts & ctx["game"] or has_root_folder(files):
            continue  # an installer claims this archive
        for ext in exts - UNITY_NOISE_EXTS - {""}:
            loose_counts[ext] = loose_counts.get(ext, 0) + 1
    loose = {e: n for e, n in loose_counts.items() if n >= threshold}
    own_exts = {_file_ext(node) for node in own_files}
    named = is_named_in_source(candidate["name"], own_files, src, ctx["stopwords"])

    verdicts = []
    why_dropped = None
    if has_loader_tree(own_files):
        if candidate["mod_id"] in ctx["pinned_loaders"]:
            why_dropped = "the extension already installs this build (page constant)"
        else:
            verdicts.append("loader-build")
    elif ships_proxy_or_exe(own_files) and not named:
        verdicts.append("custom-loader")
    if loose and not named:
        verdicts.append("loose-files")

    if verdicts:
        why_dropped = None
    elif not why_dropped:
        if named:
            why_dropped = "index.js already names it"
        elif installer_skipped and not sampled:
            why_dropped = "dependents match the game's own installers"
        elif not own_files:
            why_dropped = "no archive contents available"
        elif own_exts - UNITY_NOISE_EXTS - {""} <= {".dll"}:
            why_dropped = "plugin library, the plugin installer takes it and its dependents"
        else:
            why_dropped = "nothing beyond what the extension handles"
    return {
        "verdicts": verdicts,
        "why_dropped": why_dropped,
        "evidence": {
            "own_exts": sorted(e for e in own_exts if e),
            "dependents_sampled": len(sampled),
            "installer_dependents_skipped": installer_skipped,
            "extra_exts": {},
            "loose_exts": loose,
            "loose_label": "in dependents with no dll, no installer claims them",
        },
    }


def classify_basic(candidate, own_files, dependent_files, ctx, src):
    """Decide what a basic-template candidate would need. See the module docstring for the verdicts."""
    with_files = [files for files in dependent_files.values() if files]
    sampled = [files for files in with_files if not is_installer_package(files, ctx)]
    installer_skipped = len(with_files) - len(sampled)
    threshold = max(DEPENDENT_MIN_MODS, math.ceil(len(sampled) * DEPENDENT_MIN_SHARE))
    loose_counts = {}
    if ctx["mod_exts"]:
        for files in sampled:
            exts = {_file_ext(node) for node in files}
            if exts & ctx["game"]:
                continue  # an installer claims this archive
            for ext in exts - NOISE_EXTS - BASIC_NON_MOD_EXTS - {""}:
                loose_counts[ext] = loose_counts.get(ext, 0) + 1
    loose = {e: n for e, n in loose_counts.items() if n >= threshold}
    own_exts = {_file_ext(node) for node in own_files}
    named = is_named_in_source(candidate["name"], own_files, src, ctx["stopwords"])

    verdicts = []
    if own_exts & NATIVE_EXTS and not named:
        verdicts.append("native-code")
    if loose and not named:
        verdicts.append("loose-files")

    why_dropped = None
    if not verdicts:
        if named:
            why_dropped = "index.js already names it"
        elif installer_skipped and not sampled:
            why_dropped = "dependents match the game's own installers"
        elif not own_files:
            why_dropped = "no archive contents available"
        else:
            why_dropped = "no native code, dependents need nothing extra"
    return {
        "verdicts": verdicts,
        "why_dropped": why_dropped,
        "evidence": {
            "own_exts": sorted(e for e in own_exts if e),
            "dependents_sampled": len(sampled),
            "installer_dependents_skipped": installer_skipped,
            "extra_exts": {},
            "loose_exts": loose,
            "loose_label": "in dependents, no installer claims them",
        },
    }


class FrameworkProfile(NamedTuple):
    family: str
    list_files: tuple
    template_folder: str
    build_context: object  # (src, template) -> ctx
    classify: object  # (candidate, own_files, dependent_files, ctx, src) -> decision
    fingerprint_exts: tuple
    external_stock: object = None  # compiled regex for off-site names to ignore


PROFILES = (
    FrameworkProfile("ue4-5", ("games-ue4-5.txt",), "template-ue4-5", build_ext_context, classify_ue,
                     FINGERPRINT_EXTS),
    FrameworkProfile("unity", ("games-unity-melonloader-bepinex.txt",),
                     "template-unitymelonloaderbepinex-hybrid", build_unity_context, classify_unity,
                     UNITY_FINGERPRINT_EXTS, UNITY_STOCK_LOADER),
    FrameworkProfile("basic", ("games-basic.txt",), "template-basic", build_basic_context, classify_basic,
                     FINGERPRINT_EXTS),
)


class NotOnNexusError(RuntimeError):
    """The game has no Nexus domain, so it has no mods to audit."""


def _query(query, api_key, variables=None):
    """One GraphQL read, retried on transport failure. Raises RuntimeError on API errors."""
    for attempt in range(RETRIES + 1):
        try:
            resp = nexus_graphql(query, api_key=api_key, variables=variables)
            break
        except (RuntimeError, OSError) as exc:
            if attempt == RETRIES:
                raise RuntimeError(str(exc)) from None
            time.sleep(RETRY_SLEEP_SECONDS)
    time.sleep(REQUEST_SLEEP_SECONDS)
    if resp.get("errors"):
        raise RuntimeError(resp["errors"][0].get("message", "GraphQL error"))
    return resp.get("data") or {}


def _files_field(alias, game_num, mod_id, count):
    return (f"{alias}: modFileContents(filter: {{ gameId: [{{ value: {game_num}, op: EQUALS }}], "
            f"modId: [{{ value: {int(mod_id)}, op: EQUALS }}] }}, count: {count}) "
            "{ nodes { fileId filePath fileExtension } }")


def fetch_top_mods(domain, api_key):
    data = _query(TOP_MODS_QUERY, api_key, {"domain": domain, "count": TOP_MODS})
    return data.get("mods") or {}


def collect_candidates(page, game_num, min_requirers):
    """Return (candidates, externals) from the top-mods page. Candidates are mods with enough
    requirers, plus on-site mods several top mods require even if they rank outside the page."""
    by_id, tally, names, ext_tally, ext_urls = {}, {}, {}, {}, {}
    for mod in page.get("nodes") or []:
        reqs = mod.get("modRequirements") or {}
        requirers = (reqs.get("modsRequiringThisMod") or {}).get("totalCount") or 0
        by_id[str(mod["modId"])] = {"mod_id": str(mod["modId"]), "name": mod["name"], "requirers": requirers}
        for req in (reqs.get("nexusRequirements") or {}).get("nodes") or []:
            if req.get("externalRequirement") or not req.get("modId"):
                label = req.get("modName") or req.get("url") or "?"
                ext_tally[label] = ext_tally.get(label, 0) + 1
                ext_urls[label] = req.get("url")
            elif str(req.get("gameId")) == str(game_num):
                key = str(req["modId"])
                tally[key] = tally.get(key, 0) + 1
                names[key] = req.get("modName") or key

    picked = {k: v for k, v in by_id.items() if v["requirers"] >= min_requirers}
    for key, count in tally.items():
        if count >= MIN_TALLY and key not in picked:
            picked[key] = by_id.get(key) or {"mod_id": key, "name": names[key], "requirers": None}
    externals = [{"name": k, "url": ext_urls[k], "top_mods": n}
                 for k, n in sorted(ext_tally.items(), key=lambda item: -item[1]) if n >= MIN_TALLY]
    ranked = sorted(picked.values(), key=lambda c: -(c["requirers"] or 0))
    return ranked, externals


def fetch_candidate_evidence(candidate, game_num, api_key):
    """Return (own_files, {dependent_mod_id: files}) and fill in requirers if it was unknown."""
    query = (f"query {{ m: mod(gameId: {game_num}, modId: {int(candidate['mod_id'])}) "
             "{ modRequirements { modsRequiringThisMod { totalCount nodes { modId gameId } } } } "
             f"{_files_field('own', game_num, candidate['mod_id'], OWN_FILES)} }}")
    data = _query(query, api_key)
    requiring = ((data.get("m") or {}).get("modRequirements") or {}).get("modsRequiringThisMod") or {}
    if candidate.get("requirers") is None:
        candidate["requirers"] = requiring.get("totalCount") or 0
    own_files = (data.get("own") or {}).get("nodes") or []

    dependents = [str(node["modId"]) for node in requiring.get("nodes") or []
                  if str(node.get("gameId")) == str(game_num)][:DEPENDENT_SAMPLE]
    if not dependents:
        return own_files, {}
    fields = " ".join(_files_field(f"d{i}", game_num, mod_id, DEPENDENT_FILES)
                      for i, mod_id in enumerate(dependents))
    data = _query(f"query {{ {fields} }}", api_key)
    return own_files, {mod_id: (data.get(f"d{i}") or {}).get("nodes") or []
                       for i, mod_id in enumerate(dependents)}


def fetch_fingerprints(game_id, profile, game_num, ctx, reviewed, api_key):
    """Sample config-style files the game does not handle; report names recurring across mods."""
    found = []
    handled = ctx["pak"] | ctx["game"]
    skip_files = ctx.get("skip_files", set())
    for ext in profile.fingerprint_exts:
        if ext in handled:
            continue
        fields = " ".join(
            f'p{page}: modFileContents(filter: {{ gameId: [{{ value: {game_num}, op: EQUALS }}], '
            f'fileExtensionExact: [{{ value: "{ext}", op: EQUALS }}] }}, '
            f'count: 80, offset: {page * 80}) {{ totalCount nodes {{ modId fileName }} }}'
            for page in range(FINGERPRINT_PAGES)
        )
        data = _query(f"query {{ {fields} }}", api_key)
        total = (data.get("p0") or {}).get("totalCount") or 0
        mods_by_name = {}
        for page in range(FINGERPRINT_PAGES):
            for node in (data.get(f"p{page}") or {}).get("nodes") or []:
                mods_by_name.setdefault((node.get("fileName") or "").lower(), set()).add(node.get("modId"))
        for file_name, mods in mods_by_name.items():
            if file_name == ctx.get("modkit_file") or file_name in ctx["game_files"] or file_name in skip_files:
                continue  # a file one of the game's own installers keys on
            if len(mods) >= FINGERPRINT_MIN_MODS \
                    and not reviewed_reason_for_file(reviewed, game_id, profile.family, file_name):
                found.append({"file": file_name, "ext": ext, "mods_in_sample": len(mods), "ext_total": total})
    return sorted(found, key=lambda f: -f["mods_in_sample"])


def audit_game(game_id, src, profile, reviewed, template, api_key, min_requirers):
    domain = extension_domain(game_id, src)
    game_num = nexus_game_id_for_domain(domain, api_key)
    if not game_num:
        raise NotOnNexusError(f"no Nexus game id for domain {domain!r}")
    game_num = int(game_num)
    family = profile.family
    ctx = profile.build_context(src, template)
    page = fetch_top_mods(domain, api_key)
    candidates, externals = collect_candidates(page, game_num, min_requirers)

    result = {
        "game_id": game_id, "family": family, "domain": domain, "total_mods": page.get("totalCount") or 0,
        "findings": [], "externals": [], "fingerprints": [], "dropped": [], "reviewed": [],
    }
    picked = []
    for candidate in candidates:
        reason = reviewed_reason_for_mod(reviewed, game_id, family, candidate["name"], candidate["mod_id"])
        if reason:
            result["reviewed"].append({**candidate, "reason": reason})
        else:
            picked.append(candidate)
    for candidate in picked[MAX_CANDIDATES:]:
        result["dropped"].append({**candidate, "why": f"past the {MAX_CANDIDATES} candidate cap, not checked"})

    for candidate in picked[:MAX_CANDIDATES]:
        try:
            own_files, dependent_files = fetch_candidate_evidence(candidate, game_num, api_key)
        except RuntimeError as exc:  # a requirement can point at a deleted or hidden mod
            result["dropped"].append({**candidate, "why": f"could not read: {exc}"})
            continue
        decision = profile.classify(candidate, own_files, dependent_files, ctx, src)
        url =f"https://www.nexusmods.com/{domain}/mods/{candidate['mod_id']}"
        if decision["verdicts"]:
            result["findings"].append({**candidate, "url": url, "verdicts": decision["verdicts"],
                                       "evidence": decision["evidence"]})
        else:
            result["dropped"].append({**candidate, "why": decision["why_dropped"]})

    stopwords = ctx.get("stopwords", ACRONYM_STOPWORDS)
    for external in externals:
        if profile.external_stock and profile.external_stock.search(external["name"]):
            continue
        if reviewed_reason_for_mod(reviewed, game_id, family, external["name"], None):
            continue
        if not is_named_in_source(external["name"], [], src, stopwords):
            result["externals"].append(external)
    result["fingerprints"] = fetch_fingerprints(game_id, profile, game_num, ctx, reviewed, api_key)
    return result


def game_has_findings(game):
    return bool(game["findings"] or game["externals"] or game["fingerprints"])


def print_report(report, show_dropped):
    print("=== Framework Audit ===\n")
    games = report["games"]
    hits = [g for g in games if game_has_findings(g)]
    print(f"Games checked: {len(games)}")
    print(f"Games with something to check: {len(hits)}")

    for game in hits:
        print(f"\n{game['game_id']} [{game['family']}] ({game['total_mods']} mods)")
        for f in game["findings"]:
            evidence = f["evidence"]
            tags = "[" + ", ".join(f["verdicts"]) + "]"
            print(f"  {tags} {f['name']} -- required by {f['requirers']} -- {f['url']}")
            print(f"      own files: {' '.join(evidence['own_exts']) or '(none listed)'}")
            sampled = evidence["dependents_sampled"]
            if evidence["extra_exts"]:
                detail = ", ".join(f"{e} ({n}/{sampled})" for e, n in sorted(evidence["extra_exts"].items()))
                print(f"      beside dependents' paks, not installed: {detail}")
            if evidence["loose_exts"]:
                detail = ", ".join(f"{e} ({n}/{sampled})" for e, n in sorted(evidence["loose_exts"].items()))
                label = evidence.get("loose_label", "in dependents, away from paks")
                print(f"      {label}: {detail}")
        for e in game["externals"]:
            print(f"  [external] {e['name']} -- listed by {e['top_mods']} top mods -- {e['url']}")
        for f in game["fingerprints"]:
            print(f"  [fingerprint] {f['file']} -- in {f['mods_in_sample']} sampled mods "
                  f"({f['ext_total']} {f['ext']} files in all)")

    dropped = sum(len(g["dropped"]) for g in games)
    reviewed = sum(len(g["reviewed"]) for g in games)
    print(f"\nDropped candidates: {dropped}")
    print(f"Skipped as already reviewed: {reviewed}")
    if show_dropped:
        for game in games:
            for d in game["dropped"]:
                print(f"  - {game['game_id']}: {d['name']} (required by {d['requirers']}): {d['why']}")
            for r in game["reviewed"]:
                print(f"  - {game['game_id']}: {r['name']} (required by {r['requirers']}): reviewed, {r['reason']}")

    if report["not_on_nexus"]:
        print(f"\nNot on Nexus: {len(report['not_on_nexus'])} ({', '.join(report['not_on_nexus'])})")

    if report["errors"]:
        print(f"\nCould not check: {len(report['errors'])}")
        for err in report["errors"]:
            print(f"  - {err['game_id']}: {err['error']}")


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("game_ids", nargs="*", help="Games to check (default: every game in the selected families)")
    parser.add_argument("--family", action="append", choices=[p.family for p in PROFILES],
                        help="Limit to this template family (repeatable, default: all)")
    parser.add_argument("--json", action="store_true", help="Emit a JSON report instead of text")
    parser.add_argument("--show-dropped", action="store_true",
                        help="List dropped and already-reviewed candidates, not just the counts")
    parser.add_argument("--min-requirers", type=int, default=MIN_REQUIRERS,
                        help=f"Requirers a top mod needs to become a candidate (default {MIN_REQUIRERS})")
    args = parser.parse_args()

    api_key = get_api_key("NEXUS_API_KEY")
    if not api_key:
        print("ERROR: NEXUS_API_KEY not found in env / registry", file=sys.stderr)
        sys.exit(1)

    active = [p for p in PROFILES if not args.family or p.family in args.family]
    ids_by_family = {
        p.family: {game_id for name in p.list_files for game_id in read_id_list(os.path.join(LISTS_DIR, name))}
        for p in active
    }
    target_ids = set(args.game_ids) or (
        set().union(*ids_by_family.values()) - set(DEPRECATED_GAMES) - set(NEVER_UPLOAD_GAMES)
    )
    reviewed = load_reviewed()
    templates = {p.family: template_context(read_index_js(os.path.join(REPO_ROOT, p.template_folder)))
                 for p in active}

    report = {"games": [], "not_on_nexus": [], "errors": []}
    seen = set()
    for _folder, game_id, src in iter_game_folders(target_ids):
        seen.add(game_id)
        profile = next((p for p in active if game_id in ids_by_family[p.family]), None)
        if profile is None:
            report["errors"].append({"game_id": game_id, "error": "no framework profile for this game's template"})
            continue
        print(f"  checking {game_id}", file=sys.stderr, flush=True)
        try:
            report["games"].append(audit_game(game_id, src, profile, reviewed, templates[profile.family],
                                              api_key, args.min_requirers))
        except NotOnNexusError:
            report["not_on_nexus"].append(game_id)
        except RuntimeError as exc:
            report["errors"].append({"game_id": game_id, "error": str(exc)})
    for game_id in sorted(target_ids - seen):
        report["errors"].append({"game_id": game_id, "error": "no game-* folder with this GAME_ID"})

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print_report(report, args.show_dropped)

    failed = report["errors"] or any(game_has_findings(g) for g in report["games"])
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
