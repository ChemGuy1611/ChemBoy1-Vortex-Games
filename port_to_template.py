#!/usr/bin/env python3
"""
port_to_template.py

Takes an existing game extension and a target template, then rewrites the
game's index.js using the template as the structural base. Game-specific
constant values are transplanted into the template's XXX placeholders.

Key rule: mod type IDs (e.g. FLUFFY_ID, MOD_ID) are ALWAYS preserved from
the game, never replaced by the template's suffix. Vortex stores mod type
assignments using these IDs; changing them would break existing user setups.
If the game uses a different suffix (e.g. "-fluffymodmanager" vs the
template's "-fluffymanager"), the template literal is rewritten to keep the
game's suffix.

Substitution rules:
  - "XXX" / "XXX.exe" / "XXXdemo.exe" / "XXX_Demo" etc. -> game value
  - `${GAME_ID}-SUFFIX` template literals -> preserve game's suffix
  - null -> game value (if game has a non-null, non-XXX value)
  - 0 (numeric) -> game value (if game has a non-zero value)
  - DISCOVERY_IDS_ACTIVE -> rebuilt from game's discovery.ids references
  - IGNORE_CONFLICTS / IGNORE_DEPLOY -> substituted from game
  - Boolean feature toggles -> left as template defaults
  - Constants not found in game -> left as template defaults (skipped list)
  - Constants in game but not in template -> listed for manual review

A .bak copy of the original index.js is written before overwriting.

Usage:
    python port_to_template.py GAME_ID TEMPLATE_NAME
    python port_to_template.py GAME_ID TEMPLATE_NAME --dry-run
    python port_to_template.py GAME_ID TEMPLATE_NAME --force

Examples:
    python port_to_template.py dragonsdogma2 reframework-fluffy
    python port_to_template.py dragonsdogma2 reframework-fluffy --dry-run

After writing index.js, automatically runs generate_explained.js to regenerate
EXTENSION_EXPLAINED.md.

Requirements:
    No additional packages required (Python stdlib only).
    node must be on PATH for JS syntax validation.
"""

import os
import re
import sys
import shutil
import argparse

from vortex_utils import REPO_ROOT, run_generate_explained, node_check_source, get_discovery_ids

# Template constant names that are boolean feature toggles.
# These are intentionally left at template defaults, not transferred from the game.
BOOLEAN_TOGGLES = {
    'reZip', 'allowSymlinks', 'multiExe', 'multiModPath',
    'hasLoader', 'hasXbox', 'needsModInstaller', 'rootInstaller',
    'fallbackInstaller', 'setupNotification', 'hasUserIdFolder', 'debug',
}

# Constants whose values are arrays (not simple scalars) that we handle specially.
ARRAY_CONSTS = {'IGNORE_CONFLICTS', 'IGNORE_DEPLOY', 'DISCOVERY_IDS_ACTIVE'}


def extract_constants(src):
    """
    Return a dict {name: raw_rhs_string} for every top-level single-line const/let
    declaration (i.e. not indented -- column 0). raw_rhs_string is everything after
    the '=' up to (but not including) the trailing semicolon and newline.
    Multi-line declarations (arrays, objects that span lines) are NOT captured here
    -- they are handled separately.
    """
    consts = {}
    # Anchor at start of line (^) with no leading whitespace to skip function-body locals.
    pattern = re.compile(
        r'^(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;\n]+?)\s*;?\s*$',
        re.MULTILINE
    )
    for m in pattern.finditer(src):
        name = m.group(1)
        rhs = m.group(2).strip()
        consts[name] = rhs
    return consts


def extract_id_suffix(rhs):
    """
    If rhs is a template literal of the form `${GAME_ID}-SUFFIX`, return SUFFIX.
    Otherwise return None.
    """
    m = re.match(r'^`\$\{GAME_ID\}-([^`]+)`$', rhs.strip())
    return m.group(1) if m else None




def extract_array_rhs(src, var_name):
    """
    Extract the full RHS (including brackets) of an array declaration like:
      const IGNORE_CONFLICTS = [...];
    Returns the raw array string (e.g. "[path.join(...), ...]") or None.
    """
    pattern = re.compile(
        rf'(?:const|let)\s+{re.escape(var_name)}\s*=\s*(\[[^\]]*\])',
        re.DOTALL
    )
    m = pattern.search(src)
    return m.group(1) if m else None


def is_xxx_value(rhs):
    """Return True if the rhs string is a variant of the XXX placeholder."""
    # Matches "XXX", "XXX.exe", "XXXdemo.exe", "XXX_Demo", 'XXX', etc.
    stripped = rhs.strip('"\'` ')
    return stripped.upper().startswith('XXX') or stripped == ''


def is_zero_value(rhs):
    """Return True if rhs is the numeric literal 0."""
    return rhs.strip() == '0'


def is_null_value(rhs):
    """Return True if rhs is null."""
    return rhs.strip() == 'null'


def is_boolean_value(rhs):
    """Return True if rhs is a boolean literal."""
    return rhs.strip() in ('true', 'false')


def apply_port(template_src, game_consts, game_src):
    """
    Rewrite template_src by substituting game values for template placeholders.
    Returns (new_src, substituted, skipped, review) where:
      substituted - list of (name, old_rhs, new_rhs)
      skipped     - list of names left at template default (not found in game)
      review      - list of (name, rhs) from game with no template match
    """
    new_src = template_src
    substituted = []
    skipped_names = set()

    # --- Pass 1: single-line const/let declarations in template ---
    template_consts = extract_constants(template_src)

    def replace_single(var_name, old_rhs, new_rhs):
        nonlocal new_src
        # Replace the exact declaration line in the template src
        pattern = re.compile(
            rf'((?:const|let)\s+{re.escape(var_name)}\s*=\s*)({re.escape(old_rhs)})(\s*;?\s*$)',
            re.MULTILINE
        )
        replaced, count = pattern.subn(
            lambda m: m.group(1) + new_rhs + m.group(3),
            new_src,
            count=1
        )
        if count:
            new_src = replaced
            return True
        return False

    for name, tmpl_rhs in template_consts.items():
        # Skip booleans — always use template defaults
        if name in BOOLEAN_TOGGLES or is_boolean_value(tmpl_rhs):
            continue

        # Skip array constants — handled separately below
        if name in ARRAY_CONSTS:
            continue

        game_rhs = game_consts.get(name)

        # --- ID constants: template literal `${GAME_ID}-SUFFIX` ---
        tmpl_suffix = extract_id_suffix(tmpl_rhs)
        if tmpl_suffix is not None:
            if game_rhs is not None:
                game_suffix = extract_id_suffix(game_rhs)
                if game_suffix is not None and game_suffix != tmpl_suffix:
                    # Different suffix — rewrite to preserve game's suffix
                    new_rhs = f'`${{GAME_ID}}-{game_suffix}`'
                    if replace_single(name, tmpl_rhs, new_rhs):
                        substituted.append((name, tmpl_rhs, new_rhs))
                # else: suffix matches or game also uses template literal — leave as-is
            else:
                skipped_names.add(name)
            continue

        # --- XXX placeholders ---
        if is_xxx_value(tmpl_rhs):
            if game_rhs is not None and not is_xxx_value(game_rhs):
                if replace_single(name, tmpl_rhs, game_rhs):
                    substituted.append((name, tmpl_rhs, game_rhs))
            elif tmpl_rhs.strip('"\'` ') != '':
                # Only flag as skipped if the template had a real placeholder (e.g. "XXX"),
                # not an empty string — empty strings are always-empty by design.
                skipped_names.add(name)
            continue

        # --- null placeholders ---
        if is_null_value(tmpl_rhs):
            if game_rhs is not None and not is_null_value(game_rhs) and not is_xxx_value(game_rhs):
                if replace_single(name, tmpl_rhs, game_rhs):
                    substituted.append((name, tmpl_rhs, game_rhs))
            # null staying null is fine, no need to flag
            continue

        # --- numeric 0 placeholders ---
        if is_zero_value(tmpl_rhs):
            if game_rhs is not None and not is_zero_value(game_rhs):
                if replace_single(name, tmpl_rhs, game_rhs):
                    substituted.append((name, tmpl_rhs, game_rhs))
            continue

    # --- Pass 2: DISCOVERY_IDS_ACTIVE ---
    disc_ids = get_discovery_ids(game_src)
    if disc_ids:
        ids_str = ', '.join(disc_ids)
        new_ids_rhs = f'[{ids_str}]'
        # Replace the array in DISCOVERY_IDS_ACTIVE line (preserve trailing comment)
        pattern = re.compile(
            r'((?:const|let)\s+DISCOVERY_IDS_ACTIVE\s*=\s*)\[[^\]]*\]'
        )
        replaced, count = pattern.subn(
            lambda m: m.group(1) + new_ids_rhs,
            new_src, count=1
        )
        if count:
            old_ids = extract_array_rhs(template_src, 'DISCOVERY_IDS_ACTIVE') or '[STEAMAPP_ID]'
            if new_ids_rhs != old_ids:
                substituted.append(('DISCOVERY_IDS_ACTIVE', old_ids, new_ids_rhs))
            new_src = replaced

    # --- Pass 3: IGNORE_CONFLICTS / IGNORE_DEPLOY ---
    for name in ('IGNORE_CONFLICTS', 'IGNORE_DEPLOY'):
        game_array = extract_array_rhs(game_src, name)
        tmpl_array = extract_array_rhs(template_src, name)
        if game_array and tmpl_array and game_array.strip() != tmpl_array.strip():
            pattern = re.compile(
                rf'((?:const|let)\s+{re.escape(name)}\s*=\s*)(\[[^\]]*\])',
                re.DOTALL
            )
            replaced, count = pattern.subn(
                lambda m, ga=game_array: m.group(1) + ga,
                new_src, count=1
            )
            if count:
                new_src = replaced
                substituted.append((name, tmpl_array.strip(), game_array.strip()))

    # --- Pass 4: header comment Name field ---
    game_name = game_consts.get('GAME_NAME', 'XXX').strip('"\'')
    new_src = re.sub(r'(Name:\s+)XXX(\s+Vortex Extension)',
                     rf'\g<1>{game_name}\2', new_src)

    # --- Build review list: game consts not covered by any template constant ---
    template_names = set(template_consts.keys()) | ARRAY_CONSTS | {'DISCOVERY_IDS_ACTIVE'}
    review = []
    for name, rhs in game_consts.items():
        if name in template_names:
            continue
        if name in BOOLEAN_TOGGLES:
            continue
        # Skip module-level mutable vars like GAME_PATH, STAGING_FOLDER (lower-pattern)
        if name in ('GAME_PATH', 'GAME_VERSION', 'STAGING_FOLDER', 'DOWNLOAD_FOLDER', 'SAVE_PATH'):
            continue
        review.append((name, rhs))

    skipped = sorted(skipped_names)
    return new_src, substituted, skipped, review




def create_port(game_id, template_name, dry_run, force):
    game_dir = os.path.join(REPO_ROOT, f'game-{game_id}')
    tmpl_dir = os.path.join(REPO_ROOT, f'template-{template_name}')
    game_index = os.path.join(game_dir, 'index.js')
    tmpl_index = os.path.join(tmpl_dir, 'index.js')
    bak_path = game_index + '.bak'

    # Validate
    if not os.path.isdir(game_dir):
        print(f'ERROR: game-{game_id}/ not found.')
        sys.exit(1)
    if not os.path.isfile(game_index):
        print(f'ERROR: game-{game_id}/index.js not found.')
        sys.exit(1)
    if not os.path.isdir(tmpl_dir):
        print(f'ERROR: template-{template_name}/ not found.')
        sys.exit(1)
    if not os.path.isfile(tmpl_index):
        print(f'ERROR: template-{template_name}/index.js not found.')
        sys.exit(1)
    if not dry_run and os.path.isfile(bak_path) and not force:
        print(f'ERROR: {game_id}/index.js.bak already exists. Use --force to overwrite.')
        sys.exit(1)

    prefix = '[DRY RUN] ' if dry_run else ''

    with open(game_index, encoding='utf-8') as f:
        game_src = f.read()
    with open(tmpl_index, encoding='utf-8') as f:
        tmpl_src = f.read()

    game_consts = extract_constants(game_src)
    new_src, substituted, skipped, review = apply_port(tmpl_src, game_consts, game_src)

    # JS validation
    ok, err = node_check_source(new_src)

    # Print report
    print(f'{prefix}Porting game-{game_id} -> template-{template_name}')
    print()

    if substituted:
        print(f'  {len(substituted)} substitution(s) applied:')
        for name, old, new in substituted:
            print(f'    {name}: {old} -> {new}')
    else:
        print('  0 substitutions applied.')

    print()
    if skipped:
        print(f'  {len(skipped)} constant(s) left as template default (not found in game):')
        print('    ' + ', '.join(skipped))
    else:
        print('  All template constants matched.')

    print()
    if review:
        print('  Manual review -- in game but not in template:')
        for name, rhs in review:
            print(f'    {name} = {rhs}')
    else:
        print('  No game constants outside template scope.')

    print()
    if ok is False:
        print(f'  WARNING: JS syntax error in ported output:')
        print(f'    {err}')
        print('  The file has NOT been written. Fix the issue and re-run.')
        return
    elif ok is None:
        print(f'  NOTE: {err}')

    print('  Reminders:')
    print('    - Review all XXX placeholders still remaining in index.js')
    print('    - Check inline strings in path.join() and spec fields not covered by constants')
    print(f'    - Run: node --check game-{game_id}/index.js')

    if dry_run:
        return

    if ok is False:
        return  # already returned above, but be safe

    # Write backup then overwrite
    shutil.copy2(game_index, bak_path)
    with open(game_index, 'w', encoding='utf-8') as f:
        f.write(new_src)
    print()
    print(f'  Written: game-{game_id}/index.js')
    print(f'  Backup:  game-{game_id}/index.js.bak')

    # Regenerate EXTENSION_EXPLAINED.md
    ok, err = run_generate_explained(game_id)
    if ok:
        print(f'  EXTENSION_EXPLAINED.md regenerated.')
    else:
        print(f'  WARNING: generate_explained.js failed -- run manually: node generate_explained.js {game_id}')


def main():
    parser = argparse.ArgumentParser(
        description=(
            'Port a game extension to a template structure, preserving all '
            'existing mod type IDs. Rewrites game-{GAME_ID}/index.js in place.'
        )
    )
    parser.add_argument(
        'game_id', metavar='GAME_ID',
        help="Game extension folder name without 'game-' prefix (e.g. dragonsdogma2)"
    )
    parser.add_argument(
        'template_name', metavar='TEMPLATE_NAME',
        help="Template folder name without 'template-' prefix (e.g. reframework-fluffy)"
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help='Print substitution report without writing any files.'
    )
    parser.add_argument(
        '--force', action='store_true',
        help='Overwrite existing .bak file.'
    )
    args = parser.parse_args()
    create_port(args.game_id, args.template_name, args.dry_run, args.force)


if __name__ == '__main__':
    main()
