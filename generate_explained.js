/**
 * generate_explained.js
 * Scans every game-* and template-* folder in this repo, reads index.js,
 * and writes an EXTENSION_EXPLAINED.md describing how the extension works.
 *
 * Run with:  node generate_explained.js
 *            node generate_explained.js --game game-thelongdark
 */

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;

// ── symbol table ────────────────────────────────────────────────────────────

/**
 * Build a symbol table from all const/let declarations in the source.
 * Returns a Map<string, string> of resolved variable names to values.
 */
function buildSymbolTable(src) {
  const table = new Map();
  const raw = [];

  // Strip block comments to avoid picking up commented-out declarations
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');

  // Harvest all const/let declarations
  const lines = stripped.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip line comments
    if (trimmed.startsWith('//')) continue;
    // Remove inline comments for parsing but keep them for later
    const noComment = trimmed.replace(/\/\/.*$/, '').trim();

    // Match: const/let NAME = VALUE;
    const m = noComment.match(/^(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*(.+?)\s*;?\s*$/);
    if (m) {
      raw.push({ name: m[1], rawValue: m[2].trim() });
    }
  }

  // Harvest object literal properties (e.g., UNREALDATA = { modsPath: ... })
  const objRe = /(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*\{([\s\S]*?)\}/g;
  let objM;
  while ((objM = objRe.exec(stripped)) !== null) {
    const objName = objM[1];
    const objBody = objM[2];
    // Split on commas that are at depth 0 (not inside parentheses)
    const props = splitAtTopLevelCommas(objBody);
    for (const prop of props) {
      const pm = prop.trim().match(/^(\w+)\s*:\s*(.+?)\s*$/);
      if (pm) {
        raw.push({ name: `${objName}.${pm[1]}`, rawValue: pm[2].trim() });
      }
    }
  }

  // Pass 1: resolve simple literals
  for (const decl of raw) {
    const v = decl.rawValue;
    // String literal: '...' or "..." (each allows the other quote type inside)
    const sqMatch = v.match(/^'([^']*)'$/);
    const dqMatch = v.match(/^"([^"]*)"$/);
    const strMatch = sqMatch || dqMatch;
    if (strMatch) { table.set(decl.name, strMatch[1]); continue; }
    // Numeric literal
    if (/^\d+$/.test(v)) { table.set(decl.name, v); continue; }
    // Unary plus numeric: +VARNAME
    if (/^\+\w+$/.test(v)) { /* skip, derived value */ continue; }
    // Boolean/null
    if (v === 'true' || v === 'false' || v === 'null') { table.set(decl.name, v); continue; }
    // Empty array
    if (v === '[]') { table.set(decl.name, '[]'); continue; }
  }

  // Passes 2-6: resolve references, templates, and path.join
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const decl of raw) {
      if (table.has(decl.name)) continue;
      const v = decl.rawValue;

      // Variable reference: bare identifier or property access (e.g., OBJ.prop)
      if (/^[A-Za-z_$][\w.]*$/.test(v) && table.has(v)) {
        table.set(decl.name, table.get(v));
        changed = true;
        continue;
      }

      // Template literal: `...${VAR}...`
      if (v.startsWith('`') && v.endsWith('`')) {
        const inner = v.slice(1, -1);
        let resolved = inner;
        let allResolved = true;
        resolved = resolved.replace(/\$\{([^}]+)\}/g, (_, varName) => {
          const val = table.get(varName.trim());
          if (val !== undefined) return val;
          allResolved = false;
          return '${' + varName + '}';
        });
        if (allResolved) {
          table.set(decl.name, resolved);
          changed = true;
        }
        continue;
      }

      // path.join(...) expression
      const pjMatch = v.match(/^path\.join\((.+)\)$/);
      if (pjMatch) {
        const args = splitPathJoinArgs(pjMatch[1]);
        let allResolved = true;
        const resolved = args.map(arg => {
          const a = arg.trim();
          // String literal
          const sm = a.match(/^['"]([^'"]*)['"]\s*$/);
          if (sm) return sm[1];
          // Variable reference (including property access)
          if (/^[A-Za-z_$][\w.]*$/.test(a) && table.has(a)) return table.get(a);
          // Template literal
          if (a.startsWith('`') && a.endsWith('`')) {
            const inner = a.slice(1, -1);
            let r = inner;
            r = r.replace(/\$\{([^}]+)\}/g, (_, vn) => {
              const val = table.get(vn.trim());
              if (val !== undefined) return val;
              allResolved = false;
              return '${' + vn + '}';
            });
            return r;
          }
          allResolved = false;
          return a;
        });
        if (allResolved) {
          table.set(decl.name, resolved.join('/'));
          changed = true;
        }
        continue;
      }
    }
    if (!changed) break;
  }

  return table;
}

/**
 * Split path.join arguments, handling nested path.join calls.
 */
function splitPathJoinArgs(argsStr) {
  const args = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

/**
 * Split a string on commas at depth 0 (not inside parentheses or brackets).
 */
function splitAtTopLevelCommas(str) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/**
 * Resolve a value expression using the symbol table.
 * Handles string literals, template literals, variable refs, and path.join.
 */
function resolveValue(expr, table) {
  if (!expr) return null;
  const e = expr.trim();

  // String literal (single or double quotes only — backticks handled below)
  const sm = e.match(/^(['"])(.+?)\1$/);
  if (sm) return sm[2];

  // Template literal with interpolation
  if (e.startsWith('`') && e.endsWith('`')) {
    const inner = e.slice(1, -1);
    return inner.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      return table.get(varName.trim()) || varName;
    });
  }

  // path.join(...)
  const pjMatch = e.match(/^path\.join\((.+)\)$/);
  if (pjMatch) {
    const args = splitPathJoinArgs(pjMatch[1]);
    return args.map(a => resolveValue(a, table) || a).join('/');
  }

  // Variable reference (including property access like OBJ.prop)
  if (/^[A-Za-z_$][\w.]*$/.test(e)) {
    return table.get(e) || e;
  }

  // Fallback
  return e;
}

// ── extractors ──────────────────────────────────────────────────────────────

/**
 * Parse the block comment header into structured fields.
 */
function parseHeader(src) {
  const m = src.match(/^\/\*[\s\S]*?\*\//);
  if (!m) return {};
  const block = m[0];
  const result = {};
  const nameMatch = block.match(/Name:\s*(.+)/);
  if (nameMatch) result.name = nameMatch[1].trim();
  const structMatch = block.match(/Structure:\s*(.+)/);
  if (structMatch) result.structure = structMatch[1].trim();
  const authorMatch = block.match(/Author:\s*(.+)/);
  if (authorMatch) result.author = authorMatch[1].trim();
  const versionMatch = block.match(/Version:\s*([\d.]+)/);
  if (versionMatch) result.version = versionMatch[1].trim();
  const dateMatch = block.match(/Date:\s*(.+)/);
  if (dateMatch) result.date = dateMatch[1].trim();
  // Extract note lines (starting with - or *)
  const notes = [];
  for (const line of block.split('\n')) {
    const trimmed = line.replace(/^\s*\*?\s?/, '').trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      notes.push(trimmed);
    }
  }
  if (notes.length > 0) result.notes = notes;
  return result;
}

// Fallback descriptions for known flags that lack an inline comment.
// Suffix patterns (*_IS_ARCHIVE etc.) are matched programmatically below.
const FLAG_DESCRIPTIONS = {
  // UE / Pak flags
  IO_STORE:              'true if the Paks folder contains .ucas and .utoc files',
  SIGBYPASS_REQUIRED:    'true if .sig files are present in the Paks folder and must be bypassed',
  PAKMOD_LOADORDER:      'enables load order sorting for pak mods',
  FBLO:                  'enables the full-featured load order page (false uses the legacy page)',
  LOAD_ORDER_ENABLED:    'enables load order sorting',
  // Store / platform
  hasXbox:               'enables Xbox Game Pass version detection and launcher logic',
  multiExe:              'the game has multiple executables for different store versions',
  // Loader flags
  hasLoader:             'true if the game requires a mod loader to be downloaded and installed',
  hasCustomLoader:       'the game uses a custom mod loader',
  customLoader:          'enables custom mod loader support',
  customLoaderInstaller: 'the custom loader is distributed as an installer executable',
  loaderChoice:          'the user can choose between multiple mod loaders',
  loaderSwitchRestart:   'switching mod loaders requires a Vortex restart',
  useMelonNightly:       'uses nightly builds of MelonLoader instead of stable releases',
  bleedingEdge:          'downloads bleeding edge builds of BepInEx (IL2CPP only)',
  // Download toggles
  allowBepinexNexus:     'allows BepInEx/MelonLoader to be downloaded from Nexus Mods',
  allowMelonNexus:       'allows MelonLoader to be downloaded from Nexus Mods',
  allowBepCfgMan:        'enables auto-download of BepInEx Configuration Manager',
  allowMelPrefMan:       'enables auto-download of MelonLoader Preferences Manager',
  downloadCfgMan:        'enables auto-download of BepInEx Configuration Manager',
  // Installer flags
  rootInstaller:         'enables the root game folder installer',
  binariesInstaller:     'enables the Binaries folder installer (for engine injectors)',
  fallbackInstaller:     'enables a catch-all fallback installer for unrecognised mod structures',
  enableSaveInstaller:   'enables the save file installer (only recommended if saves are in the game folder)',
  modInstallerEnabled:   'enables the mod installer',
  needsModInstaller:     'the game requires a specific mod installer',
  preventPluginInstall:  'prevents automatic plugin installation',
  // Mod path / structure
  hasCustomMods:         'mod type target paths depend on which mod loader is installed',
  multiModPath:          'the game has multiple mod path configurations',
  hasModKit:             'enables UE ModKit mod support',
  // Save / config
  hasUserIdFolder:       'a user ID folder (Steam ID, username) exists in the save path and must be detected at runtime',
  hasVersionFile:        'a Version.info file exists containing the game version number',
  // Deployment
  allowSymlinks:         'true if the game supports symlink deployment; false forces hardlinks or copies',
  preferHardlinks:       'hardlinks are preferred over symlinks for deployment',
  reZip:                 'mod archives are re-zipped after installation',
  keepZips:              'downloaded tool archives are kept on disk after extraction',
  // Load order
  loadOrder:             'enables load order sorting for mods',
  loadOrderEnabled:      'enables load order sorting for mods',
  enableLoadOrder:       'enables load order sorting for mods',
  // Misc
  setupNotification:     'shows an informational notification when the game is first set up',
  runInShell:            'the game executable is launched through a shell',
  debug:                 'enables verbose debug logging',
  CHECK_DATA:            'true if game, staging, and save folders are all on the same drive (partition check)',
  SYM_LINKS:             'true if symlink deployment is enabled for this game',
};

/**
 * Return a description for a flag, using its inline comment or the lookup table.
 * For *_IS_ARCHIVE / *_IS_ELEVATED / *_IS_INSTALLER suffixes a generic description
 * is derived from the suffix so individual tool variants don't need explicit entries.
 */
function getFlagDescription(name, comment) {
  if (comment) return comment;
  if (FLAG_DESCRIPTIONS[name]) return FLAG_DESCRIPTIONS[name];
  if (name.endsWith('_IS_ARCHIVE'))   return 'the tool is distributed as an archive (zip/7z)';
  if (name.endsWith('_IS_ELEVATED'))  return 'the tool requires elevated/admin privileges to install';
  if (name.endsWith('_IS_INSTALLER')) return 'the tool is distributed as an installer executable';
  return '';
}

/**
 * Dynamically discover all boolean feature flags.
 */
function discoverFlags(src) {
  const flags = [];
  // Strip block comments
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const lines = stripped.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;
    const m = trimmed.match(/^(?:const|let)\s+([A-Za-z_$]\w*)\s*=\s*(true|false)\s*;?\s*(?:\/\/(.*))?$/);
    if (m) {
      // Skip well-known non-flag booleans
      const name = m[1];
      const skipNames = ['supported', 'allResolved', 'changed', 'isInstalled',
        'bepinexInstalled', 'melonInstalled', 'isBepinex', 'isBepinexPatcher', 'isMelon', 'isMelonPlugin'];
      if (skipNames.includes(name)) continue;
      flags.push({
        name: name,
        value: m[2],
        comment: m[3] ? m[3].trim() : null
      });
    }
  }
  return flags;
}

/**
 * Extract mod types from the spec object, resolving variable references.
 */
function extractModTypes(src, table) {
  const results = [];
  const modTypesBlock = src.match(/"modTypes"\s*:\s*\[([\s\S]*?)\]\s*[,}]/);
  if (!modTypesBlock) return results;

  // Split into individual object entries
  const block = modTypesBlock[1];
  const entries = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === '{') { depth++; if (depth === 1) { current = ''; continue; } }
    if (ch === '}') { depth--; if (depth === 0) { entries.push(current); continue; } }
    if (depth > 0) current += ch;
  }

  for (const entry of entries) {
    const idRaw = extractField(entry, 'id');
    const nameRaw = extractField(entry, 'name');
    const priorityRaw = extractField(entry, 'priority');
    const targetPathRaw = extractFieldRaw(entry, 'targetPath');

    results.push({
      id: resolveValue(idRaw, table),
      name: resolveValue(nameRaw, table),
      priority: resolveValue(priorityRaw, table),
      targetPath: resolveValue(targetPathRaw, table)
    });
  }
  return results;
}

/**
 * Extract a field value from a JS object-like string.
 * Handles quoted values containing special characters like }.
 */
function extractField(objStr, fieldName) {
  // Try double-quoted value
  const dqRe = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`, 's');
  const dqM = objStr.match(dqRe);
  if (dqM) return '"' + dqM[1] + '"';

  // Try single-quoted value (may contain double quotes)
  const sqRe = new RegExp(`"${fieldName}"\\s*:\\s*'([^']*)'`, 's');
  const sqM = objStr.match(sqRe);
  if (sqM) return "'" + sqM[1] + "'";

  // Try template literal with interpolation
  const templateRe = new RegExp(`"${fieldName}"\\s*:\\s*(\`[^\`]*\`)`);
  const templateM = objStr.match(templateRe);
  if (templateM) return templateM[1].trim();

  // Try bare identifier or expression
  const bareRe = new RegExp(`"${fieldName}"\\s*:\\s*([A-Za-z_$]\\w*)`);
  const bareM = objStr.match(bareRe);
  if (bareM) return bareM[1].trim();

  return null;
}

/**
 * Extract raw field value (including path.join expressions).
 */
function extractFieldRaw(objStr, fieldName) {
  // Try path.join first
  const pjRe = new RegExp(`"${fieldName}"\\s*:\\s*(path\\.join\\([^)]+\\))`);
  const pjM = objStr.match(pjRe);
  if (pjM) return pjM[1].trim();
  // Fall back to regular extraction
  return extractField(objStr, fieldName);
}

/**
 * Extract installer registrations with resolved IDs.
 */
function extractInstallers(src, table) {
  const results = [];
  // Strip block comments but preserve line structure
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /context\.registerInstaller\(\s*([^,]+),\s*(\d+)/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    // Check this isn't in a comment
    const lineStart = stripped.lastIndexOf('\n', m.index);
    const linePrefix = stripped.substring(lineStart + 1, m.index).trim();
    if (linePrefix.startsWith('//')) continue;

    const rawId = m[1].trim();
    const priority = m[2];
    const resolvedId = resolveValue(rawId, table);
    results.push({ id: resolvedId, priority });
  }
  return results;
}

/**
 * Extract tool definitions with name, ID, and executable.
 */
function extractTools(src, table) {
  const results = [];
  // Match the tools array block - handle both const and let
  const toolsBlock = src.match(/(?:const|let)\s+tools\s*=\s*\[([\s\S]*?)\];\s*\n/);
  if (!toolsBlock) return results;
  const block = toolsBlock[1];

  // Split into individual tool objects
  const entries = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === '{') { depth++; if (depth === 1) { current = ''; continue; } }
    if (ch === '}') { depth--; if (depth === 0) { entries.push(current); continue; } }
    if (depth > 0) current += ch;
  }

  for (const entry of entries) {
    const nameM = entry.match(/name\s*:\s*['"`]([^'"`]+)['"`]/);
    const idM = entry.match(/id\s*:\s*([^,\n]+)/);
    const execM = entry.match(/executable\s*:\s*\(\)\s*=>\s*([^,\n]+)/);

    const name = nameM ? nameM[1] : null;
    const id = idM ? resolveValue(idM[1].trim(), table) : null;
    const exec = execM ? resolveValue(execM[1].trim(), table) : null;

    if (name) results.push({ name, id, executable: exec });
  }
  return results;
}

/**
 * Extract action labels from context.registerAction calls.
 */
function extractActions(src) {
  const results = [];
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /context\.registerAction\([^,]+,\s*\d+,\s*[^,]+,\s*\{\}\s*,\s*[`'"]([^`'"]+)[`'"]/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const lineStart = stripped.lastIndexOf('\n', m.index);
    const linePrefix = stripped.substring(lineStart + 1, m.index).trim();
    if (linePrefix.startsWith('//')) continue;
    results.push(m[1]);
  }
  return results;
}

/**
 * Detect supported stores from non-null App IDs.
 */
function detectStores(table) {
  const stores = [];
  const steamId = table.get('STEAMAPP_ID');
  const epicId = table.get('EPICAPP_ID');
  const gogId = table.get('GOGAPP_ID');
  const xboxId = table.get('XBOXAPP_ID');

  if (steamId && steamId !== 'null' && steamId !== 'XXX' && steamId !== 'N/A') {
    stores.push({ store: 'Steam', appId: steamId });
  }
  if (epicId && epicId !== 'null' && epicId !== 'XXX' && epicId !== 'N/A') {
    stores.push({ store: 'Epic Games Store', appId: epicId });
  }
  if (gogId && gogId !== 'null' && gogId !== 'XXX' && gogId !== 'N/A') {
    stores.push({ store: 'GOG', appId: gogId });
  }
  if (xboxId && xboxId !== 'null' && xboxId !== 'XXX' && xboxId !== 'N/A') {
    stores.push({ store: 'Xbox / Microsoft Store', appId: xboxId });
  }
  return stores;
}

/**
 * Detect auto-downloaded dependencies.
 */
function extractDependencies(src, table) {
  const deps = [];

  // BepInEx
  const bepVersion = table.get('BEPINEX_VERSION') || table.get('BEP_VER');
  const bepBuild = table.get('BEPINEX_BUILD');
  const bepArch = table.get('BEPINEX_ARCH');
  if (bepVersion && bepVersion !== 'null') {
    deps.push({
      name: 'BepInEx',
      version: bepVersion,
      detail: [bepBuild, bepArch].filter(Boolean).join(', ')
    });
  }

  // BepInEx Configuration Manager
  const cfgManUrl = table.get('BEPCFGMAN_URL');
  if (cfgManUrl && cfgManUrl !== 'null') {
    const cfgManVersion = cfgManUrl.match(/v([\d.]+)/);
    deps.push({
      name: 'BepInEx Configuration Manager',
      version: cfgManVersion ? cfgManVersion[1] : 'latest',
      detail: null
    });
  }

  // MelonLoader
  const melonVersion = table.get('MELON_VERSION') || table.get('MEL_VER');
  if (melonVersion && melonVersion !== 'null') {
    deps.push({
      name: 'MelonLoader',
      version: melonVersion,
      detail: null
    });
  }

  // Fluffy Mod Manager
  const fluffyExec = table.get('FLUFFY_EXEC');
  if (fluffyExec && fluffyExec !== 'null') {
    deps.push({
      name: 'Fluffy Mod Manager',
      version: null,
      detail: null
    });
  }

  // REFramework
  const refId = table.get('REF_ID');
  if (refId && refId !== 'null' && src.includes('REFramework')) {
    deps.push({
      name: 'REFramework',
      version: null,
      detail: null
    });
  }

  // ACSE
  if (src.includes('downloadACSE') || (table.get('ACSE_NAME') && table.get('ACSE_NAME') !== 'null')) {
    const acseName = table.get('ACSE_NAME');
    deps.push({
      name: acseName || 'ACSE',
      version: null,
      detail: null
    });
  }

  // UE4SS
  if (src.includes('downloadUe4ss') || src.includes('UE4SS_URL') || src.includes('autoDownloadUe4ss')) {
    deps.push({
      name: 'UE4SS',
      version: null,
      detail: null
    });
  }

  // Reloaded-II
  if (src.includes('downloadModManager') && src.includes('Reloaded')) {
    deps.push({
      name: 'Reloaded-II',
      version: null,
      detail: null
    });
  }

  // GDWeave / Godot Mod Loader
  const loaderName = table.get('LOADER_NAME');
  if (loaderName && loaderName !== 'null') {
    deps.push({
      name: loaderName,
      version: null,
      detail: null
    });
  }

  // Mod Installer tools (Far Cry etc.)
  const miName = table.get('MI_NAME');
  if (miName && miName !== 'null') {
    deps.push({
      name: miName,
      version: null,
      detail: null
    });
  }

  // AnvilToolkit / Forger
  const forgerName = table.get('FORGER_NAME');
  if (forgerName && forgerName !== 'null') {
    deps.push({
      name: forgerName,
      version: null,
      detail: null
    });
  }

  // UMM (Unity Mod Manager)
  if (src.includes('ummAddGame') || src.includes('modtype-umm')) {
    deps.push({
      name: 'Unity Mod Manager (UMM)',
      version: null,
      detail: null
    });
  }

  // Save Manager
  const smName = table.get('SM_NAME');
  if (smName && smName !== 'null') {
    deps.push({
      name: smName,
      version: null,
      detail: null
    });
  }

  return deps;
}

/**
 * Extract config and save path information.
 */
function extractConfigSavePaths(table) {
  const paths = {};

  // Config paths
  const configPath = table.get('CONFIG_PATH') || table.get('CONFIG_FOLDER') || table.get('CONFIG_PATH_DEFAULT');
  if (configPath && configPath !== 'null') {
    paths.configPath = cleanEnvPath(configPath);
  }
  const configReg = table.get('CONFIG_REGPATH_FULL');
  if (configReg && configReg !== 'null') {
    paths.configRegistry = configReg;
  }

  // Save paths
  const savePath = table.get('SAVE_PATH') || table.get('SAVE_PATH_DEFAULT') || table.get('SAVE_FOLDER');
  if (savePath && savePath !== 'null') {
    paths.savePath = cleanEnvPath(savePath);
  }
  const savePathXbox = table.get('SAVE_PATH_XBOX');
  if (savePathXbox && savePathXbox !== 'null') {
    paths.savePathXbox = cleanEnvPath(savePathXbox);
  }

  return paths;
}

/**
 * Replace Vortex path helper references with readable environment variables.
 */
function cleanEnvPath(p) {
  return p
    .replace(/util\.getVortexPath\(["']home["']\)/g, '%USERPROFILE%')
    .replace(/util\.getVortexPath\(["']documents["']\)/g, '%DOCUMENTS%')
    .replace(/util\.getVortexPath\(["']localAppData["']\)/g, '%LOCALAPPDATA%')
    .replace(/util\.getVortexPath\(["']appData["']\)/g, '%APPDATA%');
}

/**
 * Detect special features with accurate checks (no false positives).
 */
function detectSpecialFeatures(src, flags, stores) {
  const features = [];

  // Load Order
  const hasLoadOrder = flags.some(f =>
    (f.name === 'loadOrder' || f.name === 'PAKMOD_LOADORDER' || f.name === 'FBLO') && f.value === 'true'
  );
  if (hasLoadOrder) {
    features.push('**Load Order** — mods are assigned numbered folder names or sorted based on their position in the load order.');
  }

  // Deploy Hook
  if (src.includes("'did-deploy'") || src.includes('"did-deploy"')) {
    features.push('**Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.');
  }

  // Purge Hook
  if (src.includes("'did-purge'") || src.includes('"did-purge"')) {
    features.push('**Purge Hook** (`did-purge`) — runs custom logic when mods are purged.');
  }

  // Auto-Downloader
  const hasDownloader = src.includes("require('./downloader')") || src.includes('downloadBrowser')
    || src.includes('downloadManager') || src.includes('downloadLoader')
    || src.includes('auto-download') || src.includes('vortex-download')
    || src.includes('downloadACSE') || src.includes('downloadModLoader')
    || src.includes('downloadBepInEx') || src.includes('downloadFluffy')
    || src.includes('downloadREFramework') || src.includes('downloadUe4ss')
    || src.includes('downloadModManager');
  if (hasDownloader) {
    features.push('**Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).');
  }

  // FOMOD Awareness
  if (src.includes('moduleconfig.xml') || src.includes('ModuleConfig.xml')) {
    features.push('**FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.');
  }

  // Xbox Support — only if store is actually supported
  if (stores.some(s => s.store.includes('Xbox'))) {
    features.push('**Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.');
  }

  // Epic Support — only if store is actually supported
  if (stores.some(s => s.store.includes('Epic'))) {
    features.push('**Epic Games Store Support** — detects EGS version and uses the Epic launcher.');
  }

  // GOG Support — only if store is actually supported and has special handling
  const hasGogHandling = src.includes('EXEC_GOG') || src.includes('DATA_FOLDER_GOG');
  if (stores.some(s => s.store === 'GOG') && hasGogHandling) {
    features.push('**GOG Support** — detects GOG version with adjusted executable/data paths.');
  }

  // Symlinks Disabled
  const symlinkFlag = flags.find(f => f.name === 'allowSymlinks');
  if (symlinkFlag && symlinkFlag.value === 'false') {
    features.push('**Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.');
  }

  // Sig Bypass
  const sigFlag = flags.find(f => f.name === 'SIGBYPASS_REQUIRED');
  if (sigFlag && sigFlag.value === 'true') {
    features.push('**Signature Bypass** — .sig file bypass is required for pak mods.');
  }

  // Registry-based game detection
  if (src.includes('winapi.RegGetValue') || src.includes('winapi-bindings')) {
    features.push('**Registry Lookup** — uses Windows registry for game detection or configuration paths.');
  }

  // Version detection
  if (src.includes('setGameVersion') || src.includes('resolveGameVersion')) {
    features.push('**Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.');
  }

  // Context extension requirements
  if (src.includes('context.requireExtension')) {
    const reqMatch = src.match(/context\.requireExtension\(['"]([^'"]+)['"]\)/g);
    if (reqMatch) {
      const exts = reqMatch.map(r => {
        const em = r.match(/['"]([^'"]+)['"]/);
        return em ? em[1] : null;
      }).filter(Boolean);
      features.push(`**Required Extensions** — depends on: ${exts.map(e => '`' + e + '`').join(', ')}.`);
    }
  }

  if (features.length === 0) {
    features.push('No special features beyond the standard extension pattern.');
  }

  return features;
}

// ── markdown builder ────────────────────────────────────────────────────────

function buildMarkdown(dirName, src) {
  const table = buildSymbolTable(src);
  const header = parseHeader(src);
  const flags = discoverFlags(src);
  const modTypes = extractModTypes(src, table);
  const installers = extractInstallers(src, table);
  const tools = extractTools(src, table);
  const actions = extractActions(src);
  const stores = detectStores(table);
  const deps = extractDependencies(src, table);
  const configSave = extractConfigSavePaths(table);
  const specialFeatures = detectSpecialFeatures(src, flags, stores);

  const gameId = table.get('GAME_ID') || dirName;
  const gameName = table.get('GAME_NAME') || table.get('GAME_NAME_SHORT') || header.name || gameId;
  const execName = table.get('EXEC') || table.get('EXEC_NAME') || table.get('EXEC_DEFAULT') || 'N/A';
  const nexusUrl = table.get('EXTENSION_URL');
  const pcgwUrl = table.get('PCGAMINGWIKI_URL');

  let md = `# ${gameName} — Vortex Extension Explained\n\n`;

  // Overview
  md += `## Overview\n\n`;
  md += `| Property | Value |\n| --- | --- |\n`;
  if (header.name) md += `| Name | ${header.name} |\n`;
  if (header.structure) md += `| Engine / Structure | ${header.structure} |\n`;
  if (header.author) md += `| Author | ${header.author} |\n`;
  md += `\n`;

  if (header.notes && header.notes.length > 0) {
    md += `### Notes\n\n`;
    for (const note of header.notes) md += `${note}\n`;
    md += `\n`;
  }

  // Key Identifiers
  md += `## Key Identifiers\n\n`;
  md += `| Property | Value |\n| --- | --- |\n`;
  md += `| Game ID | \`${gameId}\` |\n`;
  md += `| Executable | \`${execName}\` |\n`;
  // Additional executables
  const execXbox = table.get('EXEC_XBOX');
  const execGog = table.get('EXEC_GOG');
  const execDemo = table.get('EXEC_DEMO');
  if (execXbox && execXbox !== 'null') md += `| Executable (Xbox) | \`${execXbox}\` |\n`;
  if (execGog && execGog !== 'null') md += `| Executable (GOG) | \`${execGog}\` |\n`;
  if (execDemo && execDemo !== 'null') md += `| Executable (Demo) | \`${execDemo}\` |\n`;
  if (nexusUrl && nexusUrl !== 'null') md += `| Extension Page | ${nexusUrl} |\n`;
  if (pcgwUrl && pcgwUrl !== 'null') md += `| PCGamingWiki | ${pcgwUrl} |\n`;
  md += `\n`;

  // Supported Stores
  if (stores.length > 0) {
    md += `## Supported Stores\n\n`;
    for (const s of stores) {
      md += `- **${s.store}** — \`${s.appId}\`\n`;
    }
    md += `\n`;
  }

  // Feature Flags
  if (flags.length > 0) {
    md += `## Feature Flags\n\n`;
    md += `| Flag | Value | Description |\n| --- | --- | --- |\n`;
    for (const f of flags) {
      md += `| \`${f.name}\` | \`${f.value}\` | ${getFlagDescription(f.name, f.comment)} |\n`;
    }
    md += `\n`;
  }

  // Mod Types
  if (modTypes.length > 0) {
    md += `## Mod Types\n\n`;
    md += `Mod types define where each category of mod gets deployed:\n\n`;
    md += `| Name | ID | Priority | Target Path |\n| --- | --- | --- | --- |\n`;
    for (const mt of modTypes) {
      md += `| ${mt.name || '?'} | \`${mt.id || '?'}\` | ${mt.priority || '?'} | \`${mt.targetPath || '?'}\` |\n`;
    }
    md += `\n`;
  }

  // Mod Installers
  if (installers.length > 0) {
    md += `## Mod Installers\n\n`;
    md += `Installers run in priority order (lower number = tested first). The first installer whose test returns \`supported: true\` handles the archive.\n\n`;
    md += `| Installer ID | Priority |\n| --- | --- |\n`;
    for (const inst of installers) {
      md += `| \`${inst.id}\` | ${inst.priority} |\n`;
    }
    md += `\n`;
  }

  // Registered Tools
  if (tools.length > 0) {
    md += `## Registered Tools\n\n`;
    md += `These tools appear in Vortex's Tools panel when this game is active:\n\n`;
    // Disambiguate duplicate names
    const nameCount = {};
    for (const t of tools) {
      nameCount[t.name] = (nameCount[t.name] || 0) + 1;
    }
    for (const t of tools) {
      if (nameCount[t.name] > 1 && t.executable) {
        md += `- **${t.name}** (\`${t.executable}\`)\n`;
      } else {
        md += `- **${t.name}**\n`;
      }
    }
    md += `\n`;
  }

  // Toolbar Actions
  if (actions.length > 0) {
    md += `## Toolbar Actions\n\n`;
    md += `These buttons appear in the Vortex mod-icons toolbar when this game is active:\n\n`;
    for (const a of actions) md += `- ${a}\n`;
    md += `\n`;
  }

  // Auto-Downloaded Dependencies
  if (deps.length > 0) {
    md += `## Auto-Downloaded Dependencies\n\n`;
    md += `| Dependency | Version | Details |\n| --- | --- | --- |\n`;
    for (const d of deps) {
      md += `| ${d.name} | ${d.version || '—'} | ${d.detail || '—'} |\n`;
    }
    md += `\n`;
  }

  // Config & Save Paths
  const hasPaths = configSave.configPath || configSave.configRegistry || configSave.savePath || configSave.savePathXbox;
  if (hasPaths) {
    md += `## Config & Save Paths\n\n`;
    md += `| Type | Path |\n| --- | --- |\n`;
    if (configSave.configPath) md += `| Config | \`${configSave.configPath}\` |\n`;
    if (configSave.configRegistry) md += `| Config (Registry) | \`${configSave.configRegistry}\` |\n`;
    if (configSave.savePath) md += `| Save | \`${configSave.savePath}\` |\n`;
    if (configSave.savePathXbox) md += `| Save (Xbox) | \`${configSave.savePathXbox}\` |\n`;
    md += `\n`;
  }

  // Special Features
  md += `## Special Features\n\n`;
  for (const f of specialFeatures) md += `- ${f}\n`;
  md += `\n`;

  // How Mod Installation Works
  md += `## How Mod Installation Works\n\n`;
  md += `\`\`\`\n`;
  md += `User drops archive into Vortex\n`;
  md += `  └── Each installer's test() runs in priority order\n`;
  md += `       └── First supported=true wins\n`;
  md += `            └── install() returns copy instructions + setmodtype\n`;
  md += `                 └── Vortex stages files\n`;
  md += `                      └── User deploys\n`;
  md += `                           └── Vortex links/copies to game folder\n`;
  const hasDeployHook = src.includes("'did-deploy'") || src.includes('"did-deploy"');
  if (hasDeployHook) {
    md += `                                └── did-deploy fires → post-deploy logic runs\n`;
  }
  md += `\`\`\`\n\n`;

  // Entry Point
  md += `## Entry Point\n\n`;
  md += `The extension is registered via \`module.exports = { default: main }\`. `;
  md += `The \`main(context)\` function calls \`applyGame(context, spec)\` which registers the game, mod types, installers, and actions with Vortex.\n`;

  return md;
}

// ── main ──────────────────────────────────────────────────────────────────────

const gameArg = (() => {
  const idx = process.argv.indexOf('--game');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const entries = fs.readdirSync(ROOT, { withFileTypes: true });
const extDirs = entries
  .filter(e => e.isDirectory() && (e.name.startsWith('game-') || e.name.startsWith('template-')))
  .map(e => e.name)
  .sort()
  .filter(name => !gameArg || name === gameArg);

if (gameArg) {
  if (extDirs.length === 0) {
    console.error(`Error: directory "${gameArg}" not found.`);
    process.exit(1);
  }
  console.log(`Processing single extension: ${gameArg}\n`);
} else {
  console.log(`Found ${extDirs.length} extension directories.\n`);
}

let created = 0;
let skipped = 0;
let errors  = 0;

for (const dirName of extDirs) {
  const dirPath    = path.join(ROOT, dirName);
  const indexPath  = path.join(dirPath, 'index.js');
  const outPath    = path.join(dirPath, 'EXTENSION_EXPLAINED.md');

  if (!fs.existsSync(indexPath)) {
    console.log(`  SKIP  ${dirName} (no index.js)`);
    skipped++;
    continue;
  }

  try {
    const src = fs.readFileSync(indexPath, 'utf8');
    const md  = buildMarkdown(dirName, src);
    fs.writeFileSync(outPath, md, 'utf8');
    console.log(`  OK    ${dirName}`);
    created++;
  } catch (err) {
    console.error(`  ERR   ${dirName}: ${err.message}`);
    errors++;
  }
}

console.log(`\nDone. Created: ${created}  Skipped: ${skipped}  Errors: ${errors}`);
