/**
 * generate_explained.js
 * Scans every game-* folder in this repo, reads index.js, and writes an
 * EXTENSION_EXPLAINED.md describing how the extension works. template-* folders
 * are included only with --templates.
 * Always overwrites any existing EXTENSION_EXPLAINED.md.
 *
 * Run with:  node generate_explained.js
 *            node generate_explained.js megabonk [GAME_ID ...]
 *
 * Flags:
 *   --json       Write machine-readable JSON to stdout; progress goes to stderr.
 *   --templates  Also process template-* folders (when no GAME_ID args given).
 *   --check      Drift mode: exit non-zero if any EXTENSION_EXPLAINED.md would change.
 *                Does not write files. Use in CI to detect stale docs.
 *
 * JSON output schema:
 *   { timestamp, created, skipped, errors, drifted, unresolvedTotal,
 *     results: [{ id, ok, error?, unresolved }] }
 */

const fs   = require('fs');
const path = require('path');

// Static-analysis helpers shared with generate_notes.js.
const {
  buildSymbolTable,
  splitPathJoinArgs,
  splitAtTopLevelCommas,
  scanToMatchingClose,
  getGuardFlag,
  resolveValue,
  resolveWithFallback,
  isRealValue,
  parseHeader,
  discoverFlags,
  extractModTypes,
  extractRegisterModTypes,
  extractField,
  extractFieldRaw,
  extractInstallers,
} = require('./extension_parser');

const ROOT = __dirname;

// ── extractors ──────────────────────────────────────────────────────────────

// Fallback descriptions for known flags that lack an inline comment.
// Suffix patterns (*_IS_ARCHIVE etc.) are matched programmatically below.
const FLAG_DESCRIPTIONS = {
  // UE / Pak flags
  IO_STORE:              'true if the Paks folder contains .ucas and .utoc files',
  SIGBYPASS_REQUIRED:    'true if .sig files are present in the Paks folder and must be bypassed',
  PAKMOD_LOADORDER:      'enables load order sorting for pak mods',
  FBLO:                  'enables the full-featured load order page (false uses the legacy page)',
  LOAD_ORDER_ENABLED:    'enables load order sorting',
  ue4ssLoadOrder:        'enables UE4SS script/DLL mod load order management and mods.txt serialization on deploy',
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
 * Extract tool definitions with name, ID, and executable.
 */
function extractTools(src, table) {
  const results = [];
  // Locate the tools array using a depth-tracked bracket scan so entries that
  // contain nested arrays (e.g. parameters: [...]) don't terminate the match early.
  const toolsDeclM = src.match(/(?:const|let)\s+tools\s*=\s*\[/);
  if (!toolsDeclM) return results;
  const arrayOpenPos = toolsDeclM.index + toolsDeclM[0].length - 1;
  const arrayClosePos = scanToMatchingClose(src, arrayOpenPos, '[', ']');
  if (arrayClosePos === -1) return results;
  const block = src.slice(arrayOpenPos + 1, arrayClosePos);

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
function extractActions(src, table) {
  const results = [];
  const stripped = src.replace(/(?<!\/)\/\*[\s\S]*?\*\//g, '');
  // Find each context.registerAction( call; use depth-tracked arg parsing so
  // an options object containing nested {} does not truncate the match.
  const startRe = /context\.registerAction\s*\(/g;
  let m;
  while ((m = startRe.exec(stripped)) !== null) {
    const lineStart = stripped.lastIndexOf('\n', m.index);
    const linePrefix = stripped.substring(lineStart + 1, m.index).trim();
    if (linePrefix.startsWith('//')) continue;
    const parenOpenPos = m.index + m[0].length - 1;
    const parenClosePos = scanToMatchingClose(stripped, parenOpenPos, '(', ')');
    if (parenClosePos === -1) continue;
    const argsStr = stripped.slice(parenOpenPos + 1, parenClosePos);
    const args = splitAtTopLevelCommas(argsStr);
    if (args.length < 5) continue;
    // An action wrapped in `if (FLAG) {` only exists when that flag is on
    const guardFlagAction = getGuardFlag(stripped, m.index);
    if (guardFlagAction && table.get(guardFlagAction) === 'false') continue;
    const labelArg = args[4].trim();
    const labelM = labelArg.match(/^[`'"]([^`'"]+)[`'"]$/);
    if (!labelM) continue;
    // Backtick labels can interpolate constants (`Force Copy System ${RESOREP_DLL_FILE}`),
    // so resolve them against the symbol table instead of emitting the raw ${...}.
    results.push(labelArg.startsWith('`') ? resolveWithFallback(labelArg, table, src) : labelM[1]);
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

  if (isRealValue(steamId)) stores.push({ store: 'Steam', appId: steamId });
  if (isRealValue(epicId))  stores.push({ store: 'Epic Games Store', appId: epicId });
  if (isRealValue(gogId))   stores.push({ store: 'GOG', appId: gogId });
  if (isRealValue(xboxId))  stores.push({ store: 'Xbox / Microsoft Store', appId: xboxId });
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
  if (isRealValue(bepVersion)) {
    deps.push({
      name: 'BepInEx',
      version: bepVersion,
      detail: [bepBuild, bepArch].filter(Boolean).join(', ')
    });
  }

  // BepInEx Configuration Manager
  const cfgManUrl = table.get('BEPCFGMAN_URL');
  if (isRealValue(cfgManUrl)) {
    const cfgManVersion = cfgManUrl.match(/v([\d.]+)/);
    deps.push({
      name: 'BepInEx Configuration Manager',
      version: cfgManVersion ? cfgManVersion[1] : 'latest',
      detail: null
    });
  }

  // MelonLoader
  const melonVersion = table.get('MELON_VERSION') || table.get('MEL_VER');
  if (isRealValue(melonVersion)) {
    deps.push({
      name: 'MelonLoader',
      version: melonVersion,
      detail: null
    });
  }

  // Fluffy Mod Manager
  const fluffyExec = table.get('FLUFFY_EXEC');
  if (isRealValue(fluffyExec)) {
    deps.push({
      name: 'Fluffy Mod Manager',
      version: null,
      detail: null
    });
  }

  // REFramework
  const refId = table.get('REF_ID');
  if (isRealValue(refId) && src.includes('REFramework')) {
    deps.push({
      name: 'REFramework',
      version: null,
      detail: null
    });
  }

  // ACSE
  const acseName = table.get('ACSE_NAME');
  if (src.includes('downloadACSE') || isRealValue(acseName)) {
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
  if (isRealValue(loaderName)) {
    deps.push({
      name: loaderName,
      version: null,
      detail: null
    });
  }

  // Mod Installer tools (Far Cry etc.)
  const miName = table.get('MI_NAME');
  if (isRealValue(miName)) {
    deps.push({
      name: miName,
      version: null,
      detail: null
    });
  }

  // AnvilToolkit / Forger
  const forgerName = table.get('FORGER_NAME');
  if (isRealValue(forgerName)) {
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
  if (isRealValue(smName)) {
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
  if (isRealValue(configPath)) {
    paths.configPath = cleanEnvPath(configPath);
  }
  const configReg = table.get('CONFIG_REGPATH_FULL');
  if (isRealValue(configReg)) {
    paths.configRegistry = configReg;
  }

  // Save paths
  const savePath = table.get('SAVE_PATH') || table.get('SAVE_PATH_DEFAULT') || table.get('SAVE_FOLDER');
  if (isRealValue(savePath)) {
    paths.savePath = cleanEnvPath(savePath);
  }
  const savePathXbox = table.get('SAVE_PATH_XBOX');
  if (isRealValue(savePathXbox)) {
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

  // UE4SS Load Order
  const hasUe4ssLO = flags.some(f => f.name === 'ue4ssLoadOrder' && f.value === 'true');
  if (hasUe4ssLO) {
    features.push('**UE4SS Load Order** — manages UE4SS script/DLL mod load order via a dedicated page; serializes order to `mods.txt` on deploy.');
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
  const specModTypes = extractModTypes(src, table);
  const registeredModTypes = extractRegisterModTypes(src, table);
  const seenModTypeIds = new Set(specModTypes.map(mt => mt.id));
  const modTypes = [...specModTypes, ...registeredModTypes.filter(mt => !seenModTypeIds.has(mt.id))];
  const installers = extractInstallers(src, table);
  const tools = extractTools(src, table);
  const actions = extractActions(src, table);
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
  if (isRealValue(execXbox))  md += `| Executable (Xbox) | \`${execXbox}\` |\n`;
  if (isRealValue(execGog))   md += `| Executable (GOG) | \`${execGog}\` |\n`;
  if (isRealValue(execDemo))  md += `| Executable (Demo) | \`${execDemo}\` |\n`;
  if (isRealValue(nexusUrl))  md += `| Extension Page | [${nexusUrl}](${nexusUrl}) |\n`;
  if (isRealValue(pcgwUrl))   md += `| PCGamingWiki | [${pcgwUrl}](${pcgwUrl}) |\n`;
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
    for (const t of tools) {
      if (t.executable) {
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

  return md;
}

// ── main ──────────────────────────────────────────────────────────────────────

const rawArgs     = process.argv.slice(2);
const cliFlags    = new Set(rawArgs.filter(a => a.startsWith('--')));
const gameArgs    = rawArgs.filter(a => !a.startsWith('--'));
const doJson      = cliFlags.has('--json');
const doTemplates = cliFlags.has('--templates');
const doCheck     = cliFlags.has('--check');
const jsonResults = [];

function emit(line = '') {
  if (doJson) process.stderr.write((line || '') + '\n');
  else console.log(line);
}

const entries = fs.readdirSync(ROOT, { withFileTypes: true });
const extDirs = entries
  .filter(e => {
    if (!e.isDirectory()) return false;
    if (e.name.startsWith('game-')) return true;
    if (e.name.startsWith('template-')) return gameArgs.length > 0 || doTemplates;
    return false;
  })
  .map(e => e.name)
  .sort()
  .filter(name => gameArgs.length === 0 || gameArgs.includes(name.replace(/^(?:game|template)-/, '')));

if (gameArgs.length > 0) {
  if (extDirs.length === 0) {
    console.error(`Error: no matching directories found for: ${gameArgs.join(', ')}`);
    process.exit(1);
  }
  emit(`Processing ${extDirs.length} extension(s): ${extDirs.join(', ')}\n`);
} else {
  emit(`Found ${extDirs.length} extension directories.\n`);
}

let created         = 0;
let skipped         = 0;
let errors          = 0;
let drifted         = 0;
let unresolvedTotal = 0;

for (const dirName of extDirs) {
  const dirPath    = path.join(ROOT, dirName);
  const indexPath  = path.join(dirPath, 'index.js');
  const outPath    = path.join(dirPath, 'EXTENSION_EXPLAINED.md');

  if (!fs.existsSync(indexPath)) {
    emit(`  SKIP  ${dirName} (no index.js)`);
    jsonResults.push({ id: dirName, ok: false, error: 'no index.js', unresolved: 0 });
    skipped++;
    continue;
  }

  try {
    const src        = fs.readFileSync(indexPath, 'utf8');
    const md         = buildMarkdown(dirName, src);
    const unresolved = (md.match(/\$\{[^}]+\}/g) || []).length;
    unresolvedTotal += unresolved;

    if (doCheck) {
      const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
      if (existing === md) {
        emit(`  OK    ${dirName}${unresolved > 0 ? ` (${unresolved} unresolved)` : ''}`);
        jsonResults.push({ id: dirName, ok: true, unresolved });
        created++;
      } else {
        emit(`  DRIFT ${dirName}${unresolved > 0 ? ` (${unresolved} unresolved)` : ''}`);
        jsonResults.push({ id: dirName, ok: false, error: 'drift', unresolved });
        drifted++;
      }
    } else {
      const tmpPath = outPath + '.tmp';
      fs.writeFileSync(tmpPath, md, 'utf8');
      fs.renameSync(tmpPath, outPath);
      emit(`  OK    ${dirName}${unresolved > 0 ? ` (${unresolved} unresolved)` : ''}`);
      jsonResults.push({ id: dirName, ok: true, unresolved });
      created++;
    }
  } catch (err) {
    emit(`  ERR   ${dirName}: ${err.message}`);
    jsonResults.push({ id: dirName, ok: false, error: err.message, unresolved: 0 });
    errors++;
  }
}

const checkNote = doCheck ? `  Drifted: ${drifted}` : `  Created: ${created}`;
const unresolvedNote = unresolvedTotal > 0 ? `  Unresolved vars: ${unresolvedTotal}` : '';
emit(`\nDone.${checkNote}  Skipped: ${skipped}  Errors: ${errors}${unresolvedNote}`);
if (doJson) {
  process.stdout.write(JSON.stringify({
    timestamp: new Date().toISOString(),
    created,
    skipped,
    errors,
    drifted,
    unresolvedTotal,
    results: jsonResults,
  }, null, 2) + '\n');
}
if (errors > 0 || (doCheck && drifted > 0)) process.exit(1);
