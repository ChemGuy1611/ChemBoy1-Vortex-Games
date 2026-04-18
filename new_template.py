#!/usr/bin/env python3
"""
new_template.py

Creates a new Vortex extension template from one or more existing game extensions.
The primary game's index.js is copied and all game-specific constants are replaced
with "XXX" placeholders. Tool icon PNGs (excluding exec.png) are also copied.
Adds the new template to the TEMPLATES list in new_extension.py.

Substitution rules:
  - ALWAYS_XXX constants (GAME_ID, GAME_NAME, etc.) -> "XXX"
  - Store ID constants with a non-empty value -> "XXX"
  - Store ID constants with an empty string ("") -> null (store not applicable)
  - Store ID constants already null -> left as null
  - Header Name/Version/Date fields -> reset to XXX / 0.1.0 / 2026-XX-XX
  - String constants whose value embeds the original GAME_ID (exact case) ->
    auto-converted to template literals (e.g. `${GAME_ID}-binaries`)
  - Case-variant GAME_ID matches -> flagged for manual conversion

Fixup passes (apply_fixups):
  After substitutions, the processed index.js is augmented with standard
  structure and utility code that is present in template-basic but may be
  missing from older game extensions. Each pass is idempotent.
  1.  Feature toggles block (hasLoader, hasXbox, multiExe, etc.)
  2.  Store ID constants: GOGAPP_ID=null, XBOXAPP_ID=null, XBOXEXECNAME="XXX"
  3.  DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]
  4.  PARAMETERS_STRING = '' and PARAMETERS = [PARAMETERS_STRING]
  5.  MODTYPE_FOLDERS = [MOD_PATH]
  6.  IGNORE_CONFLICTS and IGNORE_DEPLOY arrays
  7.  Spec completeness: compatible, gogAppId, xboxAppId, supportsSymlinks,
      ignoreConflicts, ignoreDeploy in details; GogAPPId, EpicAPPId, XboxAPPId
      in environment; DISCOVERY_IDS_ACTIVE in discovery.ids
  8.  modFoldersEnsureWritable function
  9.  setup() modFoldersEnsureWritable call
  10. pathPattern try/catch wrapper
  11. requiresLauncher with full DISCOVERY_IDS_ACTIVE logic
  12. testFallback / installFallback / fallbackInstallerNotify functions +
      gated registerInstaller call at priority 49; ROOT_ID if missing
  13. Standard registerAction calls (Open PCGamingWiki Page, View Changelog,
      Submit Bug Report, Open Downloads Folder, commented Config/Save Folder);
      each checked individually by label

Usage:
    python new_template.py TEMPLATE_NAME GAME_ID [GAME_ID ...]
    python new_template.py TEMPLATE_NAME GAME_ID [GAME_ID ...] --dry-run
    python new_template.py TEMPLATE_NAME GAME_ID [GAME_ID ...] --force

Examples:
    python new_template.py anvilengine ghostreconbreakpoint
    python new_template.py anvilengine ghostreconbreakpoint assassinscreedorigins
    python new_template.py myengine mygame --dry-run

After writing index.js, automatically runs node --check and prints a WARNING on
syntax errors (the file is left on disk regardless).

Requirements:
    No additional packages required (Python stdlib only).
"""

import os
import re
import sys
import shutil
import argparse

from vortex_utils import (
    REPO_ROOT, extract_game_id, _find_fn_end, REGISTER_ACTIONS, node_check,
    inject_register_actions, update_index_header,
    make_info_json, make_changelog,
)

# String constants always replaced with "XXX"
ALWAYS_XXX = [
    "GAME_ID",
    "GAME_NAME",
    "GAME_NAME_SHORT",
    "EXEC",
    "EXEC_NAME",
    "STEAMAPP_ID",
    "PCGAMINGWIKI_URL",
    "EXTENSION_URL",
]

# Store ID constants: non-empty string -> "XXX", empty string -> null, null -> left as null
STORE_IDS = [
    "EAAPP_ID",
    "UPLAYAPP_ID",
    "GOGAPP_ID",
    "EPICAPP_ID",
    "XBOXAPP_ID",
]

# Minimum value length to flag for review (short strings like '.forge', 'high' are fine)
REVIEW_VALUE_MIN_LEN = 10

# Value substrings/patterns that are safe to leave even if long
SAFE_VALUE_PATTERNS = [
    r'XXX',          # already replaced
    r'^\.',          # path fragment starting with dot
    r'\\',           # Windows path fragment
    r'\.dll$',       # DLL filename
    r'\.exe$',       # executable filename
    r'\.png$',       # PNG asset name
    r'readme',       # readme patterns in IGNORE_DEPLOY/IGNORE_CONFLICTS
    r'\*\*',         # glob patterns
]


def replace_const(src, var_name):
    """Replace a string constant's quoted value with "XXX". Null values are untouched."""
    return re.sub(
        rf'((?:const|let)\s+{re.escape(var_name)}\s*=\s*)["\'].+?["\']',
        r'\1"XXX"',
        src, count=1
    )


def nullify_empty_store_id(src, var_name):
    """Replace an empty-string store ID (= "" or = '') with null."""
    return re.sub(
        rf'((?:const|let)\s+{re.escape(var_name)}\s*=\s*)["\']["\']',
        r'\1null',
        src, count=1
    )



def replace_game_id_embedded(src, original_game_id):
    """
    Convert string constants that embed the original GAME_ID value (exact case)
    to template literals. E.g. "gameid-binaries" -> `${GAME_ID}-binaries`.
    Case-variant matches (e.g. "GameId-folder") are left for manual review.
    Returns (new_src, count).
    """
    if not original_game_id:
        return src, 0
    replaced = 0

    def to_template_literal(m):
        nonlocal replaced
        new_value = m.group(2).replace(original_game_id, '${GAME_ID}')
        replaced += 1
        return m.group(1) + '`' + new_value + '`'

    # Match const/let VAR = "...originalGameId..." but NOT the GAME_ID declaration itself
    pattern = rf'((?:const|let)\s+(?!GAME_ID\b)\w+\s*=\s*)["\']([^"\']*{re.escape(original_game_id)}[^"\']*)["\']'
    new_src = re.sub(pattern, to_template_literal, src)
    return new_src, replaced


def sanitize_header(src):
    """Reset Name, Version, and Date fields in the header comment block."""
    return update_index_header(src, name='XXX', version='0.1.0', date='2026-XX-XX')


def apply_substitutions(src):
    """
    Apply all XXX substitutions to a game extension's index.js content.
    Returns (new_src, replaced_count).
    """
    replaced = 0

    # Capture GAME_ID before it is replaced (needed for embedded-ID conversion)
    original_game_id = extract_game_id(src)

    for var in ALWAYS_XXX:
        before = src
        src = replace_const(src, var)
        if src != before:
            replaced += 1

    for var in STORE_IDS:
        # Match null, non-empty string, or empty string ("" / '')
        m = re.search(
            rf'(?:const|let)\s+{re.escape(var)}\s*=\s*(["\'].*?["\']|null)',
            src
        )
        if m:
            value = m.group(1)
            if value == 'null':
                pass  # already null, leave it
            elif value in ('""', "''"):  # empty string -> null (store not applicable)
                before = src
                src = nullify_empty_store_id(src, var)
                if src != before:
                    replaced += 1
            else:  # non-empty string -> "XXX"
                before = src
                src = replace_const(src, var)
                if src != before:
                    replaced += 1

    # Auto-convert string constants that embed the original GAME_ID to template literals
    src, embedded_count = replace_game_id_embedded(src, original_game_id)
    replaced += embedded_count

    src = sanitize_header(src)
    return src, replaced


def find_remaining_values(src, original_game_id=None):
    """
    Find string constants that still have non-XXX values worth reviewing.
    Returns (review_list, template_literal_list) where:
      review_list           -- (var_name, value) pairs needing general review
      template_literal_list -- (var_name, value) pairs whose value contains the
                               original GAME_ID and should use a template literal
    """
    review = []
    template_literal = []
    for m in re.finditer(r'(?:const|let)\s+(\w+)\s*=\s*["\']([^"\']+)["\']', src):
        var_name = m.group(1)
        value = m.group(2)
        if len(value) < REVIEW_VALUE_MIN_LEN:
            continue
        if any(re.search(p, value, re.IGNORECASE) for p in SAFE_VALUE_PATTERNS):
            continue
        if original_game_id and original_game_id.lower() in value.lower():
            template_literal.append((var_name, value))
        else:
            review.append((var_name, value))
    return review, template_literal


# ─── apply_fixups helpers ────────────────────────────────────────────────────

def _fixup_toggles(src):
    """Inject the standard feature toggles block after EXTENSION_URL if any toggle is missing."""
    TOGGLES = [
        ('hasLoader',         'false', 'true if game needs a mod loader'),
        ('hasXbox',           'false', 'toggle for Xbox version logic'),
        ('multiExe',          'false', 'set to true if there are multiple executable names'),
        ('multiModPath',      'false', 'set to true if there are multiple possible mod paths (i.e. different path for Xbox version)'),
        ('allowSymlinks',     'true',  'true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)'),
        ('needsModInstaller', 'true',  'set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing'),
        ('rootInstaller',     'true',  'enable root installer. Set false if you need to avoid installer collisions'),
        ('fallbackInstaller', 'true',  'enable fallback installer. Set false if you need to avoid installer collisions'),
        ('setupNotification', 'false', 'enable to show the user a notification with special instructions (specify below)'),
        ('hasUserIdFolder',   'false', 'true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)'),
        ('debug',             'false', 'toggle for debug mode'),
    ]
    missing = [(n, d, c) for n, d, c in TOGGLES
               if not re.search(rf'(?:const|let)\s+{n}\s*=', src)]
    if not missing:
        return src
    lines = ['//feature toggles'] + [f'const {n} = {d}; //{c}' for n, d, c in missing]
    block = '\n' + '\n'.join(lines) + '\n'
    m = re.search(r'const EXTENSION_URL\s*=\s*[^\n]*\n', src)
    if m:
        return src[:m.end()] + block + src[m.end():]
    m = re.search(r'\nconst spec\s*=', src)
    if m:
        return src[:m.start()] + block + src[m.start():]
    return src


def _fixup_store_consts(src):
    """Add GOGAPP_ID=null, XBOXAPP_ID=null, XBOXEXECNAME='XXX' constants if missing."""
    to_add = []
    if not re.search(r'(?:const|let)\s+GOGAPP_ID\s*=', src):
        to_add.append('const GOGAPP_ID = null;')
    if not re.search(r'(?:const|let)\s+XBOXAPP_ID\s*=', src):
        to_add.append('const XBOXAPP_ID = null;')
    if not re.search(r'(?:const|let)\s+XBOXEXECNAME\s*=', src):
        to_add.append('const XBOXEXECNAME = "XXX";')
    if not to_add:
        return src
    block = '\n' + '\n'.join(to_add) + '\n'
    for pat in [
        r'(?:const|let)\s+EPICAPP_ID\s*=[^\n]+\n',
        r'(?:const|let)\s+STEAMAPP_ID\s*=[^\n]+\n',
    ]:
        m = re.search(pat, src)
        if m:
            return src[:m.end()] + block + src[m.end():]
    return src


def _fixup_discovery_ids_active(src):
    """Add DISCOVERY_IDS_ACTIVE constant if missing."""
    if re.search(r'(?:const|let)\s+DISCOVERY_IDS_ACTIVE\s*=', src):
        return src
    line = 'const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs\n'
    for pat in [
        r'(?:const|let)\s+XBOXAPP_ID\s*=[^\n]+\n',
        r'(?:const|let)\s+GOGAPP_ID\s*=[^\n]+\n',
        r'(?:const|let)\s+EPICAPP_ID\s*=[^\n]+\n',
    ]:
        m = re.search(pat, src)
        if m:
            return src[:m.end()] + line + src[m.end():]
    m = re.search(r'(?:const|let)\s+GAME_NAME\s*=', src)
    if m:
        return src[:m.start()] + line + src[m.start():]
    return src


def _fixup_parameters(src):
    """Add PARAMETERS_STRING and PARAMETERS constants if missing."""
    if re.search(r'(?:const|let)\s+PARAMETERS_STRING\s*=', src):
        return src
    block = "const PARAMETERS_STRING = '';\nconst PARAMETERS = [PARAMETERS_STRING];\n"
    for pat in [
        r'(?:const|let)\s+REQ_FILE\s*=[^\n]+\n',
        r'(?:const|let)\s+MOD_PATH_DEFAULT\s*=[^\n]+\n',
    ]:
        m = re.search(pat, src)
        if m:
            return src[:m.end()] + block + src[m.end():]
    m = re.search(r'(?:const|let)\s+MODTYPE_FOLDERS\s*=', src)
    if m:
        return src[:m.start()] + block + src[m.start():]
    m = re.search(r'\nconst spec\s*=', src)
    if m:
        return src[:m.start()] + '\n' + block + src[m.start():]
    return src


def _fixup_modtype_folders(src):
    """Add MODTYPE_FOLDERS array if missing.
    Populates the array by scanning spec.modTypes targetPath entries for
    *_PATH variable references (skips bare '{gamePath}' root entries)."""
    if re.search(r'(?:const|let)\s+MODTYPE_FOLDERS\s*=', src):
        return src
    # Collect *_PATH vars from targetPath lines inside spec.modTypes
    path_vars = []
    seen = set()
    for m_tp in re.finditer(
        r'"targetPath"\s*:\s*path\.join\(\s*[\'"`]\{gamePath\}[\'"`]\s*,\s*(\w+_PATH)\b',
        src
    ):
        var = m_tp.group(1)
        if var not in seen:
            path_vars.append(var)
            seen.add(var)
    if path_vars:
        arr = ', '.join(path_vars)
    else:
        arr = 'MOD_PATH'
    line = f'let MODTYPE_FOLDERS = [{arr}]; // Add all mod type target paths\n'
    m = re.search(r'(?:const|let)\s+PARAMETERS\s*=\s*\[[^\]]*\][^\n]*\n', src)
    if m:
        return src[:m.end()] + line + src[m.end():]
    m = re.search(r'\nconst spec\s*=', src)
    if m:
        return src[:m.start()] + '\n' + line + src[m.start():]
    return src


def _fixup_ignore_arrays(src):
    """Add IGNORE_CONFLICTS and IGNORE_DEPLOY arrays if missing."""
    has_conflicts = bool(re.search(r'(?:const|let)\s+IGNORE_CONFLICTS\s*=', src))
    has_deploy = bool(re.search(r'(?:const|let)\s+IGNORE_DEPLOY\s*=', src))
    if has_conflicts and has_deploy:
        return src
    lines = []
    if not has_conflicts:
        lines.append("const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];")
    if not has_deploy:
        lines.append("const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];")
    block = '\n'.join(lines) + '\n'
    m = re.search(r'(?:const|let)\s+MODTYPE_FOLDERS\s*=[^\n]+\n', src)
    if m:
        return src[:m.end()] + block + src[m.end():]
    m = re.search(r'\nconst spec\s*=', src)
    if m:
        return src[:m.start()] + '\n' + block + src[m.start():]
    return src


def _fixup_spec(src):
    """Inject missing fields into the spec object (compatible, store IDs, DISCOVERY_IDS_ACTIVE)."""

    # 1. "compatible" block before "details" in game object
    if not re.search(r'"compatible"\s*:', src):
        m = re.search(r'(\n([ \t]*)"details"\s*:)', src)
        if m:
            ind = m.group(2)
            block = (
                f'\n{ind}"compatible": {{\n'
                f'{ind}  "dinput": false,\n'
                f'{ind}  "enb": false,\n'
                f'{ind}}},'
            )
            src = src[:m.start(1)] + block + src[m.start(1):]

    # 2. "gogAppId" in details after "steamAppId"
    if not re.search(r'"gogAppId"\s*:', src):
        m = re.search(r'(\n([ \t]*)"steamAppId"\s*:[^\n]+)', src)
        if m:
            ind = m.group(2)
            src = src[:m.end()] + f'\n{ind}"gogAppId": GOGAPP_ID,' + src[m.end():]

    # 3. "epicAppId" in details after "gogAppId"
    if not re.search(r'"epicAppId"\s*:', src):
        m = re.search(r'(\n([ \t]*)"gogAppId"\s*:[^\n]+)', src)
        if m:
            ind = m.group(2)
            src = src[:m.end()] + f'\n{ind}"epicAppId": EPICAPP_ID,' + src[m.end():]

    # 4. "xboxAppId" in details after "epicAppId"
    if not re.search(r'"xboxAppId"\s*:', src):
        m = re.search(r'(\n([ \t]*)"epicAppId"\s*:[^\n]+)', src)
        if m:
            ind = m.group(2)
            src = src[:m.end()] + f'\n{ind}"xboxAppId": XBOXAPP_ID,' + src[m.end():]

    # 5. "supportsSymlinks" in details after "xboxAppId"
    if not re.search(r'"supportsSymlinks"\s*:', src):
        m = re.search(r'(\n([ \t]*)"xboxAppId"\s*:[^\n]+)', src)
        if m:
            ind = m.group(2)
            src = src[:m.end()] + f'\n{ind}"supportsSymlinks": allowSymlinks,' + src[m.end():]

    # 6. "ignoreConflicts" in details after "supportsSymlinks"
    if not re.search(r'"ignoreConflicts"\s*:', src):
        m = re.search(r'(\n([ \t]*)"supportsSymlinks"\s*:[^\n]+)', src)
        if m:
            ind = m.group(2)
            src = src[:m.end()] + f'\n{ind}"ignoreConflicts": IGNORE_CONFLICTS,' + src[m.end():]

    # 7. "ignoreDeploy" in details after "ignoreConflicts"
    if not re.search(r'"ignoreDeploy"\s*:', src):
        m = re.search(r'(\n([ \t]*)"ignoreConflicts"\s*:[^\n]+)', src)
        if m:
            ind = m.group(2)
            src = src[:m.end()] + f'\n{ind}"ignoreDeploy": IGNORE_DEPLOY,' + src[m.end():]

    # 8. "GogAPPId" in environment after "SteamAPPId"
    if not re.search(r'"GogAPPId"\s*:', src):
        m = re.search(r'(\n([ \t]*)"SteamAPPId"\s*:[^\n]+)', src)
        if m:
            ind = m.group(2)
            src = src[:m.end()] + f'\n{ind}"GogAPPId": GOGAPP_ID,' + src[m.end():]

    # 9. "EpicAPPId" in environment after "GogAPPId"
    if not re.search(r'"EpicAPPId"\s*:', src):
        m = re.search(r'(\n([ \t]*)"GogAPPId"\s*:[^\n]+)', src)
        if m:
            ind = m.group(2)
            src = src[:m.end()] + f'\n{ind}"EpicAPPId": EPICAPP_ID,' + src[m.end():]

    # 10. "XboxAPPId" in environment after "EpicAPPId"
    if not re.search(r'"XboxAPPId"\s*:', src):
        m = re.search(r'(\n([ \t]*)"EpicAPPId"\s*:[^\n]+)', src)
        if m:
            ind = m.group(2)
            src = src[:m.end()] + f'\n{ind}"XboxAPPId": XBOXAPP_ID,' + src[m.end():]

    # 11. DISCOVERY_IDS_ACTIVE in discovery.ids (replace hard-coded array literal)
    if not re.search(r'"ids"\s*:\s*DISCOVERY_IDS_ACTIVE', src):
        src = re.sub(r'("ids"\s*:\s*)\[[^\]]*\]', r'\1DISCOVERY_IDS_ACTIVE', src, count=1)

    return src


_MOD_FOLDERS_FN = (
    'async function modFoldersEnsureWritable(gamePath, relPaths) {\n'
    '  for (let index = 0; index < relPaths.length; index++) {\n'
    '    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));\n'
    '  }\n'
    '}\n'
)


def _fixup_mod_folders_fn(src):
    """Add modFoldersEnsureWritable function before setup() if missing."""
    if re.search(r'function\s+modFoldersEnsureWritable\b', src):
        return src
    m = re.search(r'\nasync function setup\b|\nfunction setup\b', src)
    if m:
        return src[:m.start()] + '\n' + _MOD_FOLDERS_FN + src[m.start():]
    return src


def _fixup_setup_writable(src):
    """Add modFoldersEnsureWritable call before setup()'s closing brace if missing.
    Also removes any existing 'return fs.ensureDirWritableAsync(...)' lines inside
    setup() so the new call is the single return point."""
    # Check for the *call* specifically (GAME_PATH as first arg), not just the definition
    if re.search(r'modFoldersEnsureWritable\s*\(\s*GAME_PATH', src):
        return src
    m_start = re.search(r'\nasync function setup\b[^{]*\{|\nfunction setup\b[^{]*\{', src)
    if not m_start:
        return src
    fn_end = _find_fn_end(src, m_start.end())
    if fn_end == -1:
        return src
    # Extract setup() body, remove any 'return fs.ensureDirWritableAsync(...)' lines
    setup_body = src[m_start.end():fn_end - 1]
    setup_body = re.sub(
        r'[ \t]*return\s+fs\.ensureDirWritableAsync\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*;?\s*\n?',
        '', setup_body)
    # Rebuild with the new return at the end
    line = '  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);\n'
    return src[:m_start.end()] + setup_body + line + src[fn_end - 1:]


_PATHPATTERN_FN = (
    '//Replace folder path string placeholders with actual folder paths\n'
    'function pathPattern(api, game, pattern) {\n'
    '  try {\n'
    '    var _a;\n'
    '    return template(pattern, {\n'
    "      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,\n"
    "      documents: util.getVortexPath('documents'),\n"
    "      localAppData: util.getVortexPath('localAppData'),\n"
    "      appData: util.getVortexPath('appData'),\n"
    '    });\n'
    '  }\n'
    "  catch (err) { //this happens if the executable comes back as \"undefined\", usually caused by the Xbox app locking down the folder\n"
    "    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);\n"
    '  }\n'
    '}\n'
)


def _fixup_path_pattern(src):
    """
    Add try/catch to pathPattern if it exists without one.
    If pathPattern is absent entirely, inject it before modTypePriority or makeFindGame.
    """
    if not re.search(r'function\s+pathPattern\b', src):
        for pat in [r'\nfunction modTypePriority\b', r'\nfunction makeFindGame\b']:
            m = re.search(pat, src)
            if m:
                return src[:m.start()] + '\n' + _PATHPATTERN_FN + src[m.start():]
        return src
    # Already exists -- check if try/catch is already present
    m_fn = re.search(r'\nfunction pathPattern\b[^{]*\{', src)
    if not m_fn:
        return src
    fn_end = _find_fn_end(src, m_fn.end())
    if fn_end == -1:
        return src
    fn_body = src[m_fn.start():fn_end]
    if re.search(r'\btry\s*\{', fn_body):
        return src  # already has try/catch
    # Replace the entire function with the canonical version
    new_fn = '\n' + _PATHPATTERN_FN.rstrip('\n')
    return src[:m_fn.start()] + new_fn + src[fn_end:]


_REQUIRES_LAUNCHER_FN = (
    '//Set launcher requirements\n'
    'async function requiresLauncher(gamePath, store) {\n'
    "  if (store === 'xbox' && (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID))) {\n"
    '    return Promise.resolve({\n'
    "      launcher: 'xbox',\n"
    '      addInfo: {\n'
    '        appId: XBOXAPP_ID,\n'
    '        parameters: [{ appExecName: XBOXEXECNAME }],\n'
    '        //parameters: [{ appExecName: XBOXEXECNAME }, PARAMETERS_STRING],\n'
    '        //launchType: \'gamestore\',\n'
    '      },\n'
    '    });\n'
    '  } //*/\n'
    "  if (store === 'epic' && (DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID))) {\n"
    '    return Promise.resolve({\n'
    "      launcher: 'epic',\n"
    '      addInfo: {\n'
    '        appId: EPICAPP_ID,\n'
    '        //parameters: PARAMETERS,\n'
    '        //launchType: \'gamestore\',\n'
    '      },\n'
    '    });\n'
    '  } //*/\n'
    "  if (store === 'steam') {\n"
    '    return Promise.resolve({\n'
    "      launcher: 'steam',\n"
    '    });\n'
    '  } //*/\n'
    '  return Promise.resolve(undefined);\n'
    '}\n'
)


def _fixup_requires_launcher(src):
    """
    Replace requiresLauncher with the standard DISCOVERY_IDS_ACTIVE form, or inject it
    if absent. Skips if DISCOVERY_IDS_ACTIVE.includes is already present.
    """
    if re.search(r'DISCOVERY_IDS_ACTIVE\.includes', src):
        return src  # already in standard form
    if not re.search(r'function\s+requiresLauncher\b', src):
        # Inject before getExecutable or applyGame
        for pat in [r'\nfunction getExecutable\b', r'\nasync function getExecutable\b',
                    r'\nfunction applyGame\b']:
            m = re.search(pat, src)
            if m:
                return src[:m.start()] + '\n' + _REQUIRES_LAUNCHER_FN + src[m.start():]
        return src
    # Replace existing function body
    m_start = re.search(
        r'\nasync function requiresLauncher\b[^{]*\{|\nfunction requiresLauncher\b[^{]*\{',
        src
    )
    if not m_start:
        return src
    fn_end = _find_fn_end(src, m_start.end())
    if fn_end == -1:
        return src
    new_fn = '\n' + _REQUIRES_LAUNCHER_FN.rstrip('\n')
    return src[:m_start.start()] + new_fn + src[fn_end:]


_FALLBACK_INSTALLER_FNS = (
    '//Fallback installer to root folder\n'
    'function testFallback(files, gameId) {\n'
    '  let supported = (gameId === spec.game.id);\n'
    '\n'
    '  // Test for a mod installer.\n'
    '  if (supported && files.find(file =>\n'
    "    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&\n"
    "    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {\n"
    '    supported = false;\n'
    '  }\n'
    '\n'
    '  return Promise.resolve({\n'
    '    supported,\n'
    '    requiredFiles: [],\n'
    '  });\n'
    '}\n'
    '\n'
    '//Fallback installer to root folder\n'
    'function installFallback(api, files, destinationPath) {\n'
    '  fallbackInstallerNotify(api, destinationPath);\n'
    '  const setModTypeInstruction = { type: \'setmodtype\', value: ROOT_ID };\n'
    '  \n'
    '  const filtered = files.filter(file =>\n'
    '    (!file.endsWith(path.sep))\n'
    '  );\n'
    '  const instructions = filtered.map(file => {\n'
    '    return {\n'
    "      type: 'copy',\n"
    '      source: file,\n'
    '      destination: file,\n'
    '    };\n'
    '  });\n'
    '  instructions.push(setModTypeInstruction);\n'
    '  return Promise.resolve({ instructions });\n'
    '}\n'
    '\n'
    'function fallbackInstallerNotify(api, modName) {\n'
    '  const state = api.getState();\n'
    '  STAGING_FOLDER = selectors.installPathForGame(state, spec.game.id);\n'
    "  modName = path.basename(modName, '.installing');\n"
    "  const id = modName.replace(/[^a-zA-Z0-9\\s]*( )*/gi, '').slice(0, 20);\n"
    '  const NOTIF_ID = `${GAME_ID}-${id}-fallback`;\n'
    "  const MESSAGE = 'Fallback installer reached for ' + modName;\n"
    '  api.sendNotification({\n'
    '    id: NOTIF_ID,\n'
    "    type: 'info',\n"
    '    message: MESSAGE,\n'
    '    allowSuppress: true,\n'
    '    actions: [\n'
    '      {\n'
    "        title: 'More',\n"
    '        action: (dismiss) => {\n'
    "          api.showDialog('question', MESSAGE, {\n"
    '            text: `The mod you just installed reached the fallback installer. This means Vortex could not determine where to place these mod files.\\n`\n'
    '                + `Please check the mod page description and review the files in the mod staging folder to determine if manual file manipulation is required.\\n`\n'
    '                + `\\n`\n'
    '                + `If you think that Vortex should be capable to install this mod to a specific folder, please contact the extension developer for support at the link below.\\n`\n'
    '                + `\\n`\n'
    '                + `Mod Name: ${modName}.\\n`\n'
    '                + `\\n`             \n'
    '          }, [\n'
    "            { label: 'Continue', action: () => dismiss() },\n"
    '            {\n'
    "              label: 'Contact Ext. Developer', action: () => {\n"
    '                util.opn(`${EXTENSION_URL}?tab=posts`).catch(() => null);\n'
    '                dismiss();\n'
    '              }\n'
    '            }, //*/\n'
    '            {\n'
    "              label: 'Open Staging Folder', action: () => {\n"
    '                util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);\n'
    '                dismiss();\n'
    '              }\n'
    '            }, //*/\n'
    '            //*\n'
    "            { label: `Open Mod Page`, action: () => {\n"
    "              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});\n"
    '              const modMatch = Object.values(mods).find(mod => mod.installationPath === modName);\n'
    '              log(\'warn\', `Found ${modMatch?.id} for ${modName}`);\n'
    '              let PAGE = ``;\n'
    '              if (modMatch) {\n'
    '                const MOD_ID = modMatch.attributes.modId;\n'
    '                if (MOD_ID !== undefined) {\n'
    '                  PAGE = `${MOD_ID}?tab=description`; \n'
    '                }\n'
    '              }\n'
    '              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;\n'
    '              util.opn(MOD_PAGE_URL).catch(err => undefined);\n'
    '              //dismiss();\n'
    '            }}, //*/\n'
    '          ]);\n'
    '        },\n'
    '      },\n'
    '    ],\n'
    '  });\n'
    '}\n'
)

_FALLBACK_REGISTRATION = (
    '  if (fallbackInstaller) {\n'
    '    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, '
    '(files, destinationPath) => installFallback(context.api, files, destinationPath));\n'
    '  }\n'
)


def _fixup_fallback_installer(src):
    """
    Inject testFallback, installFallback, fallbackInstallerNotify functions and the
    gated registerInstaller call (priority 49) if missing. Also injects ROOT_ID if absent,
    since installFallback sets the mod type to ROOT_ID.
    """
    if re.search(r'function\s+testFallback\b', src):
        return src  # already present

    # Ensure ROOT_ID is defined (installFallback references it)
    if not re.search(r'(?:const|let)\s+ROOT_ID\s*=', src):
        root_id_line = 'const ROOT_ID = `${GAME_ID}-root`;\n'
        for pat in [r'(?:const|let)\s+BINARIES_ID\s*=[^\n]+\n',
                    r'(?:const|let)\s+GAME_ID\s*=[^\n]+\n']:
            m = re.search(pat, src)
            if m:
                src = src[:m.end()] + root_id_line + src[m.end():]
                break

    # Inject the three functions before applyGame
    for pat in [r'\nfunction applyGame\b', r'\nasync function applyGame\b']:
        m = re.search(pat, src)
        if m:
            src = src[:m.start()] + '\n' + _FALLBACK_INSTALLER_FNS + src[m.start():]
            break

    # Inject the registration inside applyGame: before //register actions or
    # before the first context.registerAction call
    for pat in [r'(\n[ \t]*//register actions\b)', r'(\n[ \t]*context\.registerAction\b)']:
        m = re.search(pat, src)
        if m:
            src = src[:m.start(1)] + '\n' + _FALLBACK_REGISTRATION + src[m.start(1):]
            return src

    # Fallback: before the closing } of applyGame
    m = re.search(r'\nfunction applyGame\b[^{]*\{|\nasync function applyGame\b[^{]*\{', src)
    if m:
        fn_end = _find_fn_end(src, m.end())
        if fn_end != -1:
            src = src[:fn_end - 1] + _FALLBACK_REGISTRATION + src[fn_end - 1:]

    return src




def _fixup_register_actions(src):
    """Inject missing standard context.registerAction calls into applyGame()."""
    new_src, _ = inject_register_actions(src)
    return new_src


def apply_fixups(src):
    """
    Post-process augmentation: inject standard structure and utility code that is
    present in template-basic but may be missing from older game extensions.
    Returns (new_src, applied_list) where applied_list contains the names of fixups
    that were actually applied (already-present items are silently skipped).
    Each fixup is idempotent.
    """
    fixups = [
        ('feature toggles block',
         _fixup_toggles),
        ('store ID constants (GOGAPP_ID / XBOXAPP_ID / XBOXEXECNAME)',
         _fixup_store_consts),
        ('DISCOVERY_IDS_ACTIVE',
         _fixup_discovery_ids_active),
        ('PARAMETERS_STRING and PARAMETERS',
         _fixup_parameters),
        ('MODTYPE_FOLDERS',
         _fixup_modtype_folders),
        ('IGNORE_CONFLICTS and IGNORE_DEPLOY',
         _fixup_ignore_arrays),
        ('spec completeness',
         _fixup_spec),
        ('modFoldersEnsureWritable function',
         _fixup_mod_folders_fn),
        ('setup() modFoldersEnsureWritable call',
         _fixup_setup_writable),
        ('pathPattern try/catch',
         _fixup_path_pattern),
        ('requiresLauncher (DISCOVERY_IDS_ACTIVE)',
         _fixup_requires_launcher),
        ('fallback installer (testFallback / installFallback / registration)',
         _fixup_fallback_installer),
        ('register actions (PCGamingWiki / Changelog / Bug Report / Downloads)',
         _fixup_register_actions),
    ]
    applied = []
    for name, fn in fixups:
        new_src = fn(src)
        if new_src != src:
            src = new_src
            applied.append(name)
    return src, applied


# ─── file generators ─────────────────────────────────────────────────────────

def update_templates_list(template_name, dry_run):
    """
    Insert "template-{name}" into the TEMPLATES list in new_extension.py alphabetically.
    Returns (changed, message).
    """
    path = os.path.join(REPO_ROOT, "new_extension.py")
    with open(path, encoding="utf-8") as f:
        src = f.read()

    full_name = f"template-{template_name}"

    if full_name in src:
        return False, "already in TEMPLATES list"

    m = re.search(r'(TEMPLATES\s*=\s*\[)(.*?)(\])', src, re.DOTALL)
    if not m:
        return False, "could not find TEMPLATES list in new_extension.py"

    entries = re.findall(r'"(template-[^"]+)"', m.group(2))
    entries.append(full_name)
    entries.sort()

    new_entries = "\n" + "".join(f'    "{e}",\n' for e in entries)
    new_src = src[:m.start(2)] + new_entries + src[m.end(2):]

    if not dry_run:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_src)

    return True, f"inserted {full_name}"


def create_template(template_name, game_ids, dry_run, force):
    primary_game = game_ids[0]
    extra_games = game_ids[1:]

    src_dir = os.path.join(REPO_ROOT, f"game-{primary_game}")
    dest_dir = os.path.join(REPO_ROOT, f"template-{template_name}")

    # Validate source
    if not os.path.isdir(src_dir):
        print(f"ERROR: game-{primary_game}/ not found.")
        sys.exit(1)
    index_src = os.path.join(src_dir, "index.js")
    if not os.path.isfile(index_src):
        print(f"ERROR: game-{primary_game}/index.js not found.")
        sys.exit(1)

    # Check destination
    if os.path.isdir(dest_dir) and not force:
        print(f"ERROR: template-{template_name}/ already exists. Use --force to overwrite.")
        sys.exit(1)

    prefix = "[DRY RUN] " if dry_run else ""

    # Process index.js
    with open(index_src, encoding="utf-8") as f:
        index_content = f.read()

    original_game_id = extract_game_id(index_content)
    processed, replaced_count = apply_substitutions(index_content)
    processed, fixup_list = apply_fixups(processed)
    remaining, template_literal_candidates = find_remaining_values(processed, original_game_id)

    # Collect tool icon PNGs (exclude exec.png)
    pngs = sorted(
        f for f in os.listdir(src_dir)
        if f.lower().endswith(".png") and f.lower() != "exec.png"
    )

    # Write files
    print(f"{prefix}Creating template-{template_name}/ from game-{primary_game}")
    if not dry_run:
        os.makedirs(dest_dir, exist_ok=True)
        index_js_path = os.path.join(dest_dir, "index.js")
        with open(index_js_path, "w", encoding="utf-8") as f:
            f.write(processed)
        ok, err = node_check(index_js_path)
        if not ok:
            print(f"  WARNING - node --check reported a syntax error in index.js:")
            print(f"    {err}")
        with open(os.path.join(dest_dir, "info.json"), "w", encoding="utf-8") as f:
            f.write(make_info_json())
        with open(os.path.join(dest_dir, "CHANGELOG.md"), "w", encoding="utf-8") as f:
            f.write(make_changelog())
        for png in pngs:
            shutil.copy2(os.path.join(src_dir, png), os.path.join(dest_dir, png))

    print(f"  {prefix}index.js     - {replaced_count} substitution(s) applied")
    if fixup_list:
        print(f"               - {len(fixup_list)} fixup(s) applied:")
        for fx in fixup_list:
            print(f"                 * {fx}")
    else:
        print(f"               - no fixups needed (source already had standard features)")
    print(f"  {prefix}info.json    - written fresh")
    print(f"  {prefix}CHANGELOG.md - written fresh")
    if pngs:
        print(f"  {prefix}{', '.join(pngs)} - copied ({len(pngs)} PNG(s))")
    else:
        print(f"  {prefix}(no tool icon PNGs to copy)")

    # Update new_extension.py
    changed, msg = update_templates_list(template_name, dry_run)
    if changed:
        print(f"\n{prefix}Updated new_extension.py TEMPLATES list: {msg}")
    else:
        print(f"\nnew_extension.py TEMPLATES: {msg}")

    # Report constants that embed the original GAME_ID and should use template literals
    if template_literal_candidates:
        print("\nContains original GAME_ID -- convert to template literal or XXX:")
        for var, val in template_literal_candidates:
            print(f"  {var} = \"{val}\"")

    # Report remaining non-XXX values
    if remaining:
        print("\nManual review needed -- non-XXX string values remaining:")
        for var, val in remaining:
            print(f"  {var} = \"{val}\"")

    # List additional reference sources
    if extra_games:
        print("\nAdditional reference sources (not processed):")
        for g in extra_games:
            print(f"  game-{g}")

    # Reminders
    print(f"\nReminders:")
    print(f"  - Check inline strings in path.join() and registry calls (not auto-detected)")
    print(f"  - Update SCRIPTS.md: add {template_name} to new_extension.py templates table")
    print(f"  - Update CLAUDE.md: add template-{template_name} to available templates list")
    print(f"  - Update memory: reference_templates_overview.md and reference_templates_detail.md")


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Create a new Vortex extension template from one or more existing game extensions. "
            "The first GAME_ID is the primary source; additional IDs are listed as reference only."
        )
    )
    parser.add_argument(
        "template_name", metavar="TEMPLATE_NAME",
        help="Short template name without 'template-' prefix (e.g. anvilengine)"
    )
    parser.add_argument(
        "game_ids", metavar="GAME_ID", nargs="+",
        help="Game extension(s) to base the template on. First is the primary source."
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview what would be created without writing any files."
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Overwrite template folder if it already exists."
    )
    args = parser.parse_args()

    create_template(args.template_name, args.game_ids, args.dry_run, args.force)


if __name__ == "__main__":
    main()
