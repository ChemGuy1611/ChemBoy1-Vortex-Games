/**
 * generate_explained.js
 * Scans every game-* and template-* folder in this repo, reads index.js,
 * and writes an EXTENSION_EXPLAINED.md describing how the extension works.
 * 
 * Run with:  node generate_explained.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;

// ── helpers ──────────────────────────────────────────────────────────────────

function extract(src, regex, fallback = 'N/A') {
  const m = src.match(regex);
  return m ? m[1].trim() : fallback;
}

function extractAll(src, regex) {
  const results = [];
  let m;
  const g = new RegExp(regex.source, 'g' + (regex.flags.replace('g','') ));
  while ((m = g.exec(src)) !== null) results.push(m[1].trim());
  return results;
}

function flag(src, name) {
  const m = src.match(new RegExp(`const\\s+${name}\\s*=\\s*(true|false)`));
  return m ? m[1] : 'N/A';
}

function strVal(src, name) {
  const m = src.match(new RegExp(`const\\s+${name}\\s*=\\s*["'\`]([^"'\`]*)["'\`]`));
  return m ? m[1] : null;
}

function numVal(src, name) {
  const m = src.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`));
  return m ? m[1] : null;
}

// Extract the block comment header (first /*...*/ block)
function extractHeader(src) {
  const m = src.match(/^\/\*+\s*([\s\S]*?)\*+\//);
  if (!m) return null;
  return m[1]
    .split('\n')
    .map(l => l.replace(/^\s*\*?\s?/, '').trimEnd())
    .filter(l => l.length > 0)
    .join('\n');
}

// Extract mod types array from spec object
function extractModTypes(src) {
  const results = [];
  // Match objects inside modTypes array in spec
  const modTypesBlock = src.match(/"modTypes"\s*:\s*\[([\s\S]*?)\]\s*[,}]/);
  if (!modTypesBlock) return results;
  const block = modTypesBlock[1];
  const entries = block.split(/\},\s*\{/);
  for (const entry of entries) {
    const id = extract(entry, /"id"\s*:\s*[`"']([^`"']*)[`"']/, null);
    const name = extract(entry, /"name"\s*:\s*[`"']([^`"']*)[`"']/, null);
    const priority = extract(entry, /"priority"\s*:\s*"([^"]*)"/, null);
    const targetPath = extract(entry, /"targetPath"\s*:\s*[`"']([^`"']*)[`"']/, null)
      || extract(entry, /"targetPath"\s*:\s*path\.join\(([^)]+)\)/, null)
      || extract(entry, /"targetPath"\s*:\s*(`[^`]*`)/, null);
    if (id || name) results.push({ id, name, priority, targetPath });
  }
  return results;
}

// Extract tool names from const tools = [...]
function extractTools(src) {
  const results = [];
  const toolsBlock = src.match(/const\s+tools\s*=\s*\[([\s\S]*?)\];\s*\n/);
  if (!toolsBlock) return results;
  const names = toolsBlock[1].match(/name\s*:\s*['"`]([^'"`]+)['"`]/g);
  if (names) {
    for (const n of names) {
      const m = n.match(/name\s*:\s*['"`]([^'"`]+)['"`]/);
      if (m) results.push(m[1]);
    }
  }
  return results;
}

// Extract installer registrations: context.registerInstaller(id, priority, ...)
function extractInstallers(src) {
  const results = [];
  const re = /context\.registerInstaller\(\s*([^,]+),\s*(\d+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    results.push({ id: m[1].trim(), priority: m[2] });
  }
  return results;
}

// Extract action labels
function extractActions(src) {
  const results = [];
  const re = /context\.registerAction\([^,]+,\s*\d+,\s*[^,]+,\s*\{\}\s*,\s*[`'"]([^`'"]+)[`'"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    results.push(m[1]);
  }
  return results;
}

// Check if a function exists in source
function hasFunc(src, name) {
  return src.includes(`function ${name}`) || src.includes(`async function ${name}`);
}

// ── builder ───────────────────────────────────────────────────────────────────

function buildMarkdown(folder, src, dirName) {
  const header = extractHeader(src);

  const gameId    = strVal(src, 'GAME_ID')    || dirName;
  const gameName  = strVal(src, 'GAME_NAME')  || strVal(src, 'GAME_NAME_SHORT') || gameId;
  const steamId   = strVal(src, 'STEAMAPP_ID') || strVal(src, 'STEAMAPP_ID_STEAM') || 'N/A';
  const epicId    = strVal(src, 'EPICAPP_ID') || 'N/A';
  const gogId     = strVal(src, 'GOGAPP_ID')  || 'N/A';
  const xboxId    = strVal(src, 'XBOXAPP_ID') || 'N/A';
  const execName  = strVal(src, 'EXEC_NAME')  || strVal(src, 'EXEC') || 'N/A';
  const nexusUrl  = strVal(src, 'EXTENSION_URL') || 'N/A';
  const pcgwUrl   = strVal(src, 'PCGAMINGWIKI_URL') || 'N/A';
  const version   = extract(src, /Version:\s*([\d.]+)/, 'N/A');

  // Feature flags
  const fLoadOrder   = flag(src, 'loadOrder');
  const fHasLoader   = flag(src, 'hasLoader');
  const fSymlinks    = flag(src, 'allowSymlinks');
  const fModInstall  = flag(src, 'needsModInstaller');
  const fRootInst    = flag(src, 'rootInstaller');
  const fFallback    = flag(src, 'fallbackInstaller');
  const fSetupNotif  = flag(src, 'setupNotification');
  const fUserIdFoldr = flag(src, 'hasUserIdFolder');
  const fDebug       = flag(src, 'debug');
  const fBinaries    = flag(src, 'binariesInstaller');

  const modTypes   = extractModTypes(src);
  const tools      = extractTools(src);
  const installers = extractInstallers(src);
  const actions    = extractActions(src);

  // Detect special features
  const hasDownloader     = src.includes('downloadBrowser') || src.includes('downloadManager') || src.includes('downloadLoader') || src.includes('auto-download') || src.includes('vortex-download');
  const hasLoadOrder      = fLoadOrder === 'true';
  const hasDeployHook     = src.includes("'did-deploy'") || src.includes('"did-deploy"');
  const hasPurgeHook      = src.includes("'did-purge'") || src.includes('"did-purge"');
  const hasFomod          = src.includes('moduleconfig.xml');
  const hasXbox           = src.includes('xbox') || src.includes('XBOX');
  const hasEpic           = src.includes('epic') || src.includes('EPIC');
  const hasSymlinkNote    = fSymlinks === 'false';

  // Build notes from header
  const notes = header ? header.split('\n').filter(l => l.startsWith('-') || l.startsWith('*')) : [];

  let md = `# ${gameName} — Vortex Extension Explained\n\n`;

  if (header) {
    md += `## Overview\n\n`;
    md += `\`\`\`\n${header}\n\`\`\`\n\n`;
  }

  md += `## Key Identifiers\n\n`;
  md += `| Property | Value |\n|---|---|\n`;
  md += `| Game ID | \`${gameId}\` |\n`;
  md += `| Extension Version | ${version} |\n`;
  md += `| Steam App ID | ${steamId} |\n`;
  md += `| Epic App ID | ${epicId} |\n`;
  md += `| GOG App ID | ${gogId} |\n`;
  md += `| Xbox App ID | ${xboxId} |\n`;
  md += `| Executable | \`${execName}\` |\n`;
  if (nexusUrl !== 'N/A') md += `| Extension Page | ${nexusUrl} |\n`;
  if (pcgwUrl  !== 'N/A') md += `| PCGamingWiki | ${pcgwUrl} |\n`;
  md += `\n`;

  md += `## Feature Flags\n\n`;
  md += `| Flag | Value | Meaning |\n|---|---|---|\n`;
  if (fLoadOrder   !== 'N/A') md += `| \`loadOrder\` | ${fLoadOrder} | ${fLoadOrder === 'true' ? 'Drag-drop load ordering enabled' : 'No load ordering'} |\n`;
  if (fHasLoader   !== 'N/A') md += `| \`hasLoader\` | ${fHasLoader} | ${fHasLoader === 'true' ? 'Mod loader required' : 'No mod loader'} |\n`;
  if (fSymlinks    !== 'N/A') md += `| \`allowSymlinks\` | ${fSymlinks} | ${fSymlinks === 'true' ? 'Symlink deployment allowed' : 'Symlinks disabled (hardlink/copy used)'} |\n`;
  if (fModInstall  !== 'N/A') md += `| \`needsModInstaller\` | ${fModInstall} | ${fModInstall === 'true' ? 'Mods go through a custom installer' : 'Mods installed directly to mods folder'} |\n`;
  if (fRootInst    !== 'N/A') md += `| \`rootInstaller\` | ${fRootInst} | ${fRootInst === 'true' ? 'Root folder installer active' : 'Root installer disabled'} |\n`;
  if (fFallback    !== 'N/A') md += `| \`fallbackInstaller\` | ${fFallback} | ${fFallback === 'true' ? 'Catch-all fallback installer active' : 'No fallback installer'} |\n`;
  if (fSetupNotif  !== 'N/A') md += `| \`setupNotification\` | ${fSetupNotif} | ${fSetupNotif === 'true' ? 'Setup notification shown to users' : 'No setup notification'} |\n`;
  if (fUserIdFoldr !== 'N/A') md += `| \`hasUserIdFolder\` | ${fUserIdFoldr} | ${fUserIdFoldr === 'true' ? 'Save path includes a user ID subfolder' : 'No user ID subfolder'} |\n`;
  if (fBinaries    !== 'N/A') md += `| \`binariesInstaller\` | ${fBinaries} | ${fBinaries === 'true' ? 'Binaries (engine injector) installer active' : 'No binaries installer'} |\n`;
  if (fDebug       !== 'N/A') md += `| \`debug\` | ${fDebug} | Debug logging ${fDebug === 'true' ? 'enabled' : 'disabled'} |\n`;
  md += `\n`;

  if (modTypes.length > 0) {
    md += `## Mod Types\n\n`;
    md += `Mod types define where each category of mod gets deployed:\n\n`;
    md += `| Name | ID | Priority | Target Path |\n|---|---|---|---|\n`;
    for (const mt of modTypes) {
      md += `| ${mt.name || '?'} | \`${mt.id || '?'}\` | ${mt.priority || '?'} | ${mt.targetPath || '?'} |\n`;
    }
    md += `\n`;
  }

  if (installers.length > 0) {
    md += `## Mod Installers\n\n`;
    md += `Installers run in priority order (lower number = tested first). The first installer whose test returns \`supported: true\` handles the archive.\n\n`;
    md += `| Installer ID | Priority |\n|---|---|\n`;
    for (const inst of installers) {
      md += `| \`${inst.id}\` | ${inst.priority} |\n`;
    }
    md += `\n`;
    md += `Each installer has a paired **test** function (detects the archive type) and an **install** function (produces \`copy\` instructions telling Vortex where to place each file).\n\n`;
  }

  if (tools.length > 0) {
    md += `## Registered Tools\n\n`;
    md += `These tools appear in Vortex's Tools panel when this game is active:\n\n`;
    for (const t of tools) md += `- ${t}\n`;
    md += `\n`;
  }

  if (actions.length > 0) {
    md += `## Toolbar Actions\n\n`;
    md += `These buttons appear in the Vortex mod-icons toolbar when this game is active:\n\n`;
    for (const a of actions) md += `- **${a}**\n`;
    md += `\n`;
  }

  md += `## Special Features\n\n`;
  const specialFeatures = [];
  if (hasLoadOrder)    specialFeatures.push('**Load Order** — mods are assigned numbered folder names based on their position in the load order.');
  if (hasDeployHook)   specialFeatures.push('**Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.');
  if (hasPurgeHook)    specialFeatures.push('**Purge Hook** (`did-purge`) — runs custom logic when mods are purged.');
  if (hasDownloader)   specialFeatures.push('**Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.');
  if (hasFomod)        specialFeatures.push('**FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.');
  if (hasXbox)         specialFeatures.push('**Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.');
  if (hasEpic)         specialFeatures.push('**Epic Games Store Support** — detects EGS version and uses the Epic launcher.');
  if (hasSymlinkNote)  specialFeatures.push('**Symlinks Disabled** — this game uses file formats (e.g., pak/ba2/esp) with internal cross-references, so symlinks are not safe; hardlink or copy deployment is used instead.');
  if (specialFeatures.length === 0) specialFeatures.push('No special features beyond the standard extension pattern.');
  for (const f of specialFeatures) md += `- ${f}\n`;
  md += `\n`;

  md += `## How Mod Installation Works\n\n`;
  md += `\`\`\`\n`;
  md += `User drops archive into Vortex\n`;
  md += `  └── Each installer's test() runs in priority order\n`;
  md += `       └── First supported=true wins\n`;
  md += `            └── install() returns copy instructions + setmodtype\n`;
  md += `                 └── Vortex stages files\n`;
  md += `                      └── User deploys\n`;
  md += `                           └── Vortex symlinks/copies to game folder\n`;
  if (hasDeployHook) {
    md += `                                └── did-deploy fires → post-deploy logic runs\n`;
  }
  md += `\`\`\`\n\n`;

  md += `## Entry Point\n\n`;
  md += `The extension is registered via:\n\n`;
  md += `\`\`\`js\nmodule.exports = { default: main };\n\`\`\`\n\n`;
  md += `The \`main(context)\` function calls \`applyGame(context, spec)\` which registers the game, mod types, installers, and actions with Vortex.\n`;

  return md;
}

// ── main ──────────────────────────────────────────────────────────────────────

const entries = fs.readdirSync(ROOT, { withFileTypes: true });
const extDirs = entries
  .filter(e => e.isDirectory() && (e.name.startsWith('game-') || e.name.startsWith('template-')))
  .map(e => e.name)
  .sort();

console.log(`Found ${extDirs.length} extension directories.\n`);

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
    const md  = buildMarkdown(dirPath, src, dirName);
    fs.writeFileSync(outPath, md, 'utf8');
    console.log(`  OK    ${dirName}`);
    created++;
  } catch (err) {
    console.error(`  ERR   ${dirName}: ${err.message}`);
    errors++;
  }
}

console.log(`\nDone. Created: ${created}  Skipped: ${skipped}  Errors: ${errors}`);
