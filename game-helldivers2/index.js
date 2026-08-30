/*///////////////////////////////////////////
Name: Helldivers 2 Vortex Extension
Structure: Custom Game Data
Author: ChemBoy1
Version: 1.0.1
Date: 2026-08-29
/////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log, MainPage } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const React = require('react');

//Specify all info about the game
const STEAMAPP_ID = "553850";
const GAME_ID = "helldivers2";
const GAME_NAME = "Helldivers 2";
const GAME_NAME_SHORT = "Helldivers 2";
const EXEC = path.join("bin", "helldivers2.exe");

//Info for mod types and installers
const DATA_ID = `${GAME_ID}-data`;
const DATA_NAME = "Game Data (.dl_bin)";
const DATA_PATH = path.join("data", "game");
const modFileExt = ".dl_bin";

const STREAM_ID = `${GAME_ID}-stream`;
const STREAM_NAME = "Data Stream File (.stream)";
const STREAM_PATH = path.join("data");
const streamFileExt = ".stream";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_PATH = path.join("bin");

let GAME_PATH = '';
let GAME_VERSION = ''; //Game version
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

// This will also be the name of the merge folder.
// It creates a mod new mod folder and vortex will show an error message when for the first time after installing mods. User must select "Apply Changes".
// It Will also show up in the mod list. User must not enable this mod.
// LOAD BEARING: this string is the mod type stored on every already-installed patch mod and the
// suffix of the merged folder name. Changing it orphans every installed patch mod.
const PATCH_ID = `${GAME_ID}-patch--MergedMods--This-is-fine--Ignore-this--SELECT-APPLY-CHANGES--DO-NOT-ENABLE`;
const PATCH_NAME = "Data Patch (.patch_0)";
const PATCH_PATH = path.join("data");

// Retired in 1.0.0: sound patches are ordinary patch mods now. The mod type stays registered for one
// release so that any mod the migration below could not convert does not end up type-less.
const SOUNDPATCH_ID = `${GAME_ID}-soundpatch`;
const SOUNDPATCH_NAME = "Data Sound Patch (.patch_0) (retired)";

// Every patch file the game accepts: a 16-character archive hash, a patch index, and an optional
// sidecar suffix. Sidecars are optional and vary by archive, so they are never required.
const PATCH_FILE_RE = /^([0-9a-f]{16})\.patch_(\d+)(\.gpu_resources|\.stream)?$/i;
// An archive the base game ships in its data folder: the bare hash, plus an optional sidecar.
// Deliberately does NOT match `<hash>.patch_N`. Mods deploy into this same folder, so any patch file
// found here is this extension's own merged output from a previous deployment, never something the
// game shipped - and nothing in the file name can tell the two apart.
const BASE_ARCHIVE_RE = /^([0-9a-f]{16})(?:\.gpu_resources|\.stream)?$/i;
const ARCHIVE_CATALOG_FILE = "archives.json";
const ARCHIVE_HASH_RE = /^[0-9a-f]{16}$/i;

const IGNORED_FILES = [path.join('**', '*.patch_*'), path.join('**', '*.gpu_resources'), path.join('**', '*.stream')];

//Load order file names, all under the extension's own folder in Vortex's user data
const ORDER_FILE = (profileId) => `${profileId}_patch_order.json`;
const OVERRIDES_FILE = (profileId) => `${profileId}_patch_overrides.json`;
const PLAN_FILE = (profileId) => `${profileId}_patch_plan.json`;

//Load order UI
const LO_IMAGE_WIDTH = 96; //Width of the load order thumbnail image
const LO_IMAGE_HEIGHT = LO_IMAGE_WIDTH * 0.5625;

//Conflicts page icon: two arrows meeting head-on with an exclamation mark between them. The
//built-in `conflict` icon is a lightning bolt and the Load Order page's is a pair of chevrons -
//neither reads as two mods clashing, and the two pages sit next to each other in the sidebar.
const PATCH_CONFLICT_ICON = 'M1 10.25H5.5V7L9.5 12L5.5 17V13.75H1V10.25ZM23 10.25H18.5V7L14.5 12L18.5 17V13.75H23V10.25ZM10.85 3.4H13.15V13.1H10.85V3.4ZM10.85 15.1H13.15V17.7H10.85V15.1Z';

//Mod update guard (keeps load order positions across a mod update)
let mod_update_all_profile = false; // for mod update to keep them in the load order and not uncheck them
let updateModIds = new Map(); // Nexus mod id -> {firstSeen, targetFileId} (Map, not scalar, so batch updates don't clobber each other)
const MAX_UPDATE_WAIT_MS = 5 * 60 * 1000; // release the guard for an update that never lands (cancelled or failed install)
let updating_mod = false; // used to see if it's a mod update or not

//Redux actions for the per-archive overrides (plain action objects - no redux-act dependency)
const SET_PATCH_OVERRIDE = 'HELLDIVERS2_SET_PATCH_OVERRIDE';
const CLEAR_PATCH_OVERRIDE = 'HELLDIVERS2_CLEAR_PATCH_OVERRIDE';
const setPatchOverride = (profileId, hash, order) => ({ type: SET_PATCH_OVERRIDE, payload: { profileId, hash, order } });
const clearPatchOverride = (profileId, hash) => ({ type: CLEAR_PATCH_OVERRIDE, payload: { profileId, hash } });

//Filled in from info above
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/845"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Helldivers_2";
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "ignoreConflicts": [].concat(IGNORED_FILES, IGNORE_CONFLICTS),
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
    },
    "requiresLauncher": "steam"
  },
  "modTypes": [
    {
      "id": DATA_ID,
      "name": DATA_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', DATA_PATH)
    },
    {
      "id": STREAM_ID,
      "name": STREAM_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', STREAM_PATH)
    },
    {
      "id": BINARIES_ID,
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": path.join('{gamePath}', BINARIES_PATH)
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [

];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

//Set mod type priorities
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

async function getAllFiles(dirPath) {
  let results = [];
  try {
    const entries = await fs.readdirAsync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.statAsync(fullPath);
      if (stats.isDirectory()) { // Recursively get files from subdirectories
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else { // Add file to results
        results.push(fullPath);
      }
    }
  } catch (err) {
    log('warn', `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

const getDiscoveryPath = (api) => { //get the game's discovered path
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}

async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

function modTypePriority(priority) {
  return {
    high: 40,
    low: 75,
  }[priority];
}

//Convert path placeholders to actual path values
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Find game install location
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set mod path
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Set launcher requirements
function makeRequiresLauncher(api, gameSpec) {
  return () => Promise.resolve((gameSpec.game.requiresLauncher !== undefined)
    ? { launcher: gameSpec.game.requiresLauncher }
    : undefined);
}

// JSON STORAGE //////////////////////////////////////////////////////////////

//All of the extension's own files live beside Vortex's own data rather than in the game folder, so
//that verifying the game files can never delete them and so they follow Vortex's shared mode.
function getDataFolder() {
  return path.join(util.getVortexPath('userData'), GAME_ID);
}

async function readJsonFile(filePath, fallback) {
  try {
    const data = await fs.readFileAsync(filePath, { encoding: 'utf8' });
    return JSON.parse(data);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      log('warn', `[${GAME_ID}] could not read ${filePath}: ${err.message}`);
    }
    return fallback;
  }
}

async function writeJsonFile(filePath, data) {
  try {
    await fs.ensureDirWritableAsync(path.dirname(filePath));
    await fs.writeFileAsync(filePath, JSON.stringify(data, undefined, 2), { encoding: 'utf8' });
  } catch (err) {
    log('warn', `[${GAME_ID}] could not write ${filePath}: ${err.message}`);
  }
}

// ARCHIVE CATALOG AND BASE ARCHIVE SCAN /////////////////////////////////////

//Display-only catalog: friendly names and grouping for the Patch Conflicts page. Never the authority
//on which archives exist - a hash missing from here is simply shown by its hash.
let ARCHIVE_CATALOG = null;

function getArchiveCatalog() {
  if (ARCHIVE_CATALOG === null) {
    ARCHIVE_CATALOG = {};
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(__dirname, ARCHIVE_CATALOG_FILE), { encoding: 'utf8' }));
      for (const key of Object.keys(raw)) {
        if (ARCHIVE_HASH_RE.test(key)) {
          ARCHIVE_CATALOG[key.toLowerCase()] = raw[key];
        }
      }
    } catch (err) {
      log('warn', `[${GAME_ID}] could not read ${ARCHIVE_CATALOG_FILE}: ${err.message}`);
    }
  }
  return ARCHIVE_CATALOG;
}

function archiveDisplayName(hash) {
  const entry = getArchiveCatalog()[hash];
  return (entry !== undefined && entry.name) ? entry.name : 'Unknown archive';
}

function archiveKind(hash) {
  const entry = getArchiveCatalog()[hash];
  return (entry !== undefined && entry.kind) ? entry.kind : 'other';
}

//The game's own data folder is the authority on which archives exist. A patch aimed at an archive
//this install does not have simply does nothing, so the scan is what lets us warn about that.
//The scan also records the highest patch index the base game ships for an archive (-1 when it ships
//none), so that mod patches can start above it instead of overwriting a game file.
let BASE_ARCHIVES = null; // Set of archive hashes this installation actually has
let BASE_ARCHIVES_PATH = null; // discovery path the cache was built for

async function scanBaseArchives(gamePath) {
  const result = new Set();
  const dataPath = path.join(gamePath, 'data');
  let entries = [];
  try {
    entries = await fs.readdirAsync(dataPath);
  } catch (err) {
    log('warn', `[${GAME_ID}] could not read ${dataPath}: ${err.message}`);
    return result;
  }
  for (const entry of entries) {
    const match = BASE_ARCHIVE_RE.exec(entry);
    if (match === null) continue;
    result.add(match[1].toLowerCase());
  }
  return result;
}

async function ensureBaseArchives(api) {
  const gamePath = getDiscoveryPath(api);
  if (!gamePath) return new Set();
  if ((BASE_ARCHIVES !== null) && (BASE_ARCHIVES_PATH === gamePath)) return BASE_ARCHIVES;
  BASE_ARCHIVES = await scanBaseArchives(gamePath);
  BASE_ARCHIVES_PATH = gamePath;
  log('info', `[${GAME_ID}] found ${BASE_ARCHIVES.size} base archives`);
  return BASE_ARCHIVES;
}

function invalidateBaseArchives() {
  BASE_ARCHIVES = null;
  BASE_ARCHIVES_PATH = null;
}

// PATCH FILE HELPERS ////////////////////////////////////////////////////////

function parsePatchFile(fileName) {
  const match = PATCH_FILE_RE.exec(fileName);
  if (match === null) return undefined;
  return {
    hash: match[1].toLowerCase(),
    index: parseInt(match[2], 10),
    suffix: (match[3] !== undefined) ? match[3].toLowerCase() : '',
  };
}

function getModStagingPath(api, mod) {
  const state = api.getState();
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  const installationPath = (mod !== undefined) ? (mod.installationPath ?? mod.id) : undefined;
  if (!stagingPath || !installationPath) return undefined;
  return path.join(stagingPath, installationPath);
}

//Every patch file a mod actually has on disk. Reading the staging folder rather than trusting the
//stored attribute matters: a half-installed or hand-edited mod must not reserve a patch index for a
//file that is not there, because that would leave a hole in the numbering.
async function listModPatchFiles(api, mod) {
  const modPath = getModStagingPath(api, mod);
  if (modPath === undefined) return [];
  const all = await getAllFiles(modPath);
  return all.reduce((accum, fullPath) => {
    const parsed = parsePatchFile(path.basename(fullPath));
    if (parsed !== undefined) {
      accum.push({ ...parsed, filePath: fullPath });
    }
    return accum;
  }, []);
}

//Archive hashes a mod ships. Uses the attribute written at install time, and falls back to scanning
//the staging folder for mods installed before this version stored one.
const ARCHIVE_ATTR_CACHE = {};

async function getModArchives(api, mod) {
  if (mod === undefined) return [];
  const fromAttribute = util.getSafe(mod, ['attributes', 'patchArchives'], undefined);
  if (Array.isArray(fromAttribute) && (fromAttribute.length > 0)) {
    return fromAttribute.map(hash => String(hash).toLowerCase());
  }
  if (ARCHIVE_ATTR_CACHE[mod.id] !== undefined) return ARCHIVE_ATTR_CACHE[mod.id];
  const files = await listModPatchFiles(api, mod);
  const hashes = Array.from(new Set(files.map(file => file.hash))).sort();
  ARCHIVE_ATTR_CACHE[mod.id] = hashes;
  return hashes;
}

function getModName(mod) {
  if (mod === undefined) return '';
  const attributes = mod.attributes ?? {};
  return attributes.customFileName ?? attributes.logicalFileName ?? attributes.name ?? mod.id;
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for .dl_bin files
function testDlbin(files, gameId) {
  let supported = (gameId === spec.game.id) && (files.find(file => path.extname(file).toLowerCase() === modFileExt) !== undefined);

  // Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install .dl_bin files
function installDlbin(files, gameSpec) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === modFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATA_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);

  return Promise.resolve({ instructions });
}

//Test for patch files (in mod merger). Any archive, with or without sidecar files.
function testPatch(files, gameId) {
  let supported = (gameId === spec.game.id)
    && files.some(file => parsePatchFile(path.basename(file)) !== undefined);

  // Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

// MOD OPTION TREE ///////////////////////////////////////////////////////////

// A mod can offer the user a choice in more than one shape: a `manifest.json` describing named
// options with images and descriptions, or nothing but a folder per version of the mod. Every
// source is parsed into one normalized tree so that a single resolver, a single renumbering pass
// and a single dialog serve all of them:
//
//   { name, description, icon, exclusive, dataPath, categories: [...], options: [...] }
//
// `exclusive` marks the whole option list as one pick-one radio group - what a bare folder layout
// and a Legacy manifest both mean - as opposed to independent checkboxes. An option's `include`
// names archive-relative folders whose patch files are taken when that option is chosen; a folder
// is read without descending into its subfolders, matching the community mod managers.

const MANIFEST_FILE = 'manifest.json';
const ARCHIVE_ROOT_LABEL = '(archive root)';

//The archive-relative folder a file sits in, '' for the archive root. This doubles as an option's
//identity in an inferred tree, so separators are normalized and any trailing one dropped.
function optionDir(file) {
  const dir = path.dirname(file);
  if ((dir === '.') || (dir === '')) return '';
  return normalizeRelPath(dir);
}

//Archive-relative paths arrive from three places - Vortex's file list, a manifest's `Include`, a
//manifest's `Image` - with whichever separator the author typed. One spelling for all of them.
function normalizeRelPath(value) {
  if ((value === undefined) || (value === null)) return '';
  return String(value)
    .split(/[\\/]+/)
    .filter(segment => (segment !== '') && (segment !== '.'))
    .join('/');
}

//Build a tree out of the archive's folder layout alone. Patch files spread over more than one
//folder mean the mod ships alternative versions of itself, so the FOLDER is the question. Asking
//about the folder instead of about each file name it contains is what keeps a version shipping
//`<hash>.patch_0` plus its `.gpu_resources` and `.stream` sidecars down to a single question - and
//makes a self-contradictory answer impossible, which repeating the question per file did not.
function inferOptionTree(patchFiles, dataPath) {
  const dirs = [];
  for (const file of patchFiles) {
    const dir = optionDir(file);
    if (!dirs.includes(dir)) dirs.push(dir);
  }
  if (dirs.length < 2) return undefined;
  return {
    name: undefined,
    description: undefined,
    icon: undefined,
    exclusive: true,
    dataPath,
    categories: [],
    options: dirs.map(dir => ({
      //An empty id would be lost in the dialog result, so the archive root is identified as '.'.
      id: (dir === '') ? '.' : dir,
      name: (dir === '') ? ARCHIVE_ROOT_LABEL : dir,
      description: undefined,
      image: undefined,
      categoryId: undefined,
      defaultOn: false,
      include: [dir],
      subOptions: [],
    })),
  };
}

// MANIFEST.JSON /////////////////////////////////////////////////////////////

// Helldivers 2 mods have a community manifest standard, shared by the two managers that predate
// this extension. Three versions exist and all three are read here:
//
//   Legacy  no `Version` property. `Options` is an array of folder names, exactly one is installed.
//   V1      `Version: 1`. `Options` are objects with Name/Description/Image/Include/SubOptions.
//           Any number of options can be enabled; an enabled option with sub-options installs
//           exactly one of them.
//   V2      `Version: 2`. V1 plus per-option `Guid`/`CategoryRef`, a `Categories` list and `Tags`.
//
// `NexusData` is deliberately ignored: Vortex tracks a mod's Nexus identity itself, and letting an
// archive declare its own mod id is how mods end up attributed to the wrong page.
//
// Nothing here may fail an install. A missing, unreadable, malformed or self-contradictory manifest
// is logged and the folder layout is used instead - the mod still installs.

async function readManifest(files, destinationPath) {
  if (!destinationPath) return undefined;
  const entry = files.find(file =>
    (path.dirname(file) === '.') && (path.basename(file).toLowerCase() === MANIFEST_FILE));
  if (entry === undefined) return undefined;
  try {
    const raw = await fs.readFileAsync(path.join(destinationPath, entry), { encoding: 'utf8' });
    //JS counts a byte-order mark as whitespace, so trimming is enough to survive one.
    return { file: entry, data: JSON.parse(raw.trim()) };
  } catch (err) {
    //The file is still reported so that it is kept out of the install even when it cannot be read.
    log('warn', `[${GAME_ID}] ignoring unreadable ${entry}: ${err.message}`);
    return { file: entry, data: undefined };
  }
}

//Every folder the archive actually contains, so that an `Include` naming a folder that is not there
//can be reported rather than silently installing nothing.
function collectArchiveDirs(files) {
  const dirs = new Set(['']);
  for (const file of files) {
    const segments = normalizeRelPath(path.dirname(file)).split('/').filter(segment => segment !== '');
    let current = '';
    for (const segment of segments) {
      current = (current === '') ? segment : `${current}/${segment}`;
      dirs.add(current);
    }
  }
  return dirs;
}

function manifestVersion(data) {
  const version = data.Version ?? data.version;
  return (typeof version === 'number') ? version : 0;
}

//`Include` entries, normalized and checked against the archive. A warning is the whole penalty for
//naming a folder that is not there: the option simply contributes nothing.
function parseInclude(raw, archiveDirs, label) {
  const list = Array.isArray(raw) ? raw : (raw !== undefined) ? [raw] : [];
  const result = [];
  for (const value of list) {
    const dir = normalizeRelPath(value);
    if (!archiveDirs.has(dir)) {
      log('warn', `[${GAME_ID}] ${MANIFEST_FILE}: ${label} includes "${value}", which the archive does not contain`);
      continue;
    }
    if (!result.includes(dir)) result.push(dir);
  }
  return result;
}

//Manifest image paths are collected as they are parsed so that they can be kept out of the install:
//they are artwork for the picker, and would otherwise deploy into the game's data folder.
function parseImage(raw, imageFiles) {
  const image = normalizeRelPath(raw);
  if (image === '') return undefined;
  imageFiles.add(image.toLowerCase());
  return image;
}

//Legacy: `Options` is a list of folder names and exactly one of them is installed.
function parseLegacyOptions(data, archiveDirs) {
  const list = Array.isArray(data.Options) ? data.Options : [];
  return list.reduce((accum, value, idx) => {
    const include = parseInclude(value, archiveDirs, `option "${value}"`);
    if (include.length === 0) return accum;
    accum.push({
      id: `option-${idx}`,
      name: String(value),
      description: undefined,
      image: undefined,
      categoryId: undefined,
      defaultOn: false,
      include,
      subOptions: [],
    });
    return accum;
  }, []);
}

//V1 and V2: `Options` are objects, any number can be enabled, and an option's `SubOptions` are a
//pick-one list of their own.
function parseStructuredOptions(data, archiveDirs, imageFiles) {
  const list = Array.isArray(data.Options) ? data.Options : [];
  return list.reduce((accum, entry, idx) => {
    if ((entry === null) || (typeof entry !== 'object')) {
      log('warn', `[${GAME_ID}] ${MANIFEST_FILE}: option ${idx} is not an object, skipping it`);
      return accum;
    }
    const name = (entry.Name !== undefined) ? String(entry.Name) : `Option ${idx + 1}`;
    const id = (entry.Guid !== undefined) ? String(entry.Guid) : `option-${idx}`;
    const rawSubs = Array.isArray(entry.SubOptions) ? entry.SubOptions : [];
    const subOptions = rawSubs.reduce((subs, sub, subIdx) => {
      if ((sub === null) || (typeof sub !== 'object')) return subs;
      const subName = (sub.Name !== undefined) ? String(sub.Name) : `Option ${subIdx + 1}`;
      const include = parseInclude(sub.Include, archiveDirs, `sub-option "${name} / ${subName}"`);
      if (include.length === 0) {
        log('warn', `[${GAME_ID}] ${MANIFEST_FILE}: sub-option "${name} / ${subName}" installs nothing, skipping it`);
        return subs;
      }
      subs.push({
        id: `${id}-sub-${subIdx}`,
        name: subName,
        description: (sub.Description !== undefined) ? String(sub.Description) : undefined,
        image: parseImage(sub.Image, imageFiles),
        include,
      });
      return subs;
    }, []);
    if ((rawSubs.length > 0) && (subOptions.length === 0)) {
      log('warn', `[${GAME_ID}] ${MANIFEST_FILE}: option "${name}" has no usable sub-options`);
    }
    const include = parseInclude(entry.Include, archiveDirs, `option "${name}"`);
    if ((include.length === 0) && (subOptions.length === 0)) {
      log('warn', `[${GAME_ID}] ${MANIFEST_FILE}: option "${name}" installs nothing, skipping it`);
      return accum;
    }
    accum.push({
      id,
      name,
      description: (entry.Description !== undefined) ? String(entry.Description) : undefined,
      image: parseImage(entry.Image, imageFiles),
      categoryId: (entry.CategoryRef !== undefined) ? String(entry.CategoryRef) : undefined,
      defaultOn: false,
      include,
      subOptions,
    });
    return accum;
  }, []);
}

function parseCategories(data) {
  const list = Array.isArray(data.Categories) ? data.Categories : [];
  return list.reduce((accum, entry, idx) => {
    if ((entry === null) || (typeof entry !== 'object')) return accum;
    accum.push({
      id: (entry.Guid !== undefined) ? String(entry.Guid) : `category-${idx}`,
      name: (entry.Name !== undefined) ? String(entry.Name) : `Category ${idx + 1}`,
      description: (entry.Description !== undefined) ? String(entry.Description) : undefined,
    });
    return accum;
  }, []);
}

//The manifest as a normalized tree, or undefined when it carries nothing this extension can use -
//in which case the caller falls back to the folder layout.
function parseManifestTree(data, dataPath, archiveDirs, imageFiles) {
  if ((data === null) || (typeof data !== 'object')) {
    log('warn', `[${GAME_ID}] ${MANIFEST_FILE} is not an object, using the folder layout instead`);
    return undefined;
  }
  const version = manifestVersion(data);
  if (version > 2) {
    log('warn', `[${GAME_ID}] ${MANIFEST_FILE} declares version ${version}, which is newer than this extension knows; reading it as version 2`);
  }
  const exclusive = (version === 0);
  const options = exclusive
    ? parseLegacyOptions(data, archiveDirs)
    : parseStructuredOptions(data, archiveDirs, imageFiles);
  if ((options.length === 0) && Array.isArray(data.Options) && (data.Options.length > 0)) {
    log('warn', `[${GAME_ID}] ${MANIFEST_FILE} lists options but none of them are usable, using the folder layout instead`);
    return undefined;
  }
  const categories = exclusive ? [] : parseCategories(data);
  for (const option of options) {
    if ((option.categoryId !== undefined)
      && !categories.some(category => category.id === option.categoryId)) {
      log('warn', `[${GAME_ID}] ${MANIFEST_FILE}: option "${option.name}" references category "${option.categoryId}", which is not declared`);
      option.categoryId = undefined;
    }
  }
  return {
    name: (data.Name !== undefined) ? String(data.Name) : undefined,
    description: (data.Description !== undefined) ? String(data.Description) : undefined,
    icon: parseImage(data.IconPath, imageFiles),
    exclusive,
    dataPath,
    categories,
    //An empty option list is legitimate: the manifest is describing the mod, not offering a choice.
    options,
  };
}

// OPTION RESOLUTION /////////////////////////////////////////////////////////

//Turn a selection into the ordered, de-duplicated list of folders to install from. The selection is
//  { options: { [optionId]: boolean }, subOptions: { [optionId]: subOptionId } }
//and folder order follows option order, because that is the order the files are numbered in.
function resolveSelection(tree, selection) {
  const dirs = [];
  const addDir = (dir) => {
    const normalized = normalizeRelPath(dir);
    if (!dirs.includes(normalized)) dirs.push(normalized);
  };
  for (const option of tree.options) {
    if (selection.options[option.id] !== true) continue;
    option.include.forEach(addDir);
    if (option.subOptions.length === 0) continue;
    const chosen = option.subOptions.find(sub => sub.id === selection.subOptions[option.id]);
    if (chosen !== undefined) chosen.include.forEach(addDir);
  }
  return dirs;
}

//Copy instructions for the patch files in the selected folders, flattened to the mod root and
//renumbered per archive. Renumbering matters as soon as two selected folders touch the same
//archive: both would be called `<hash>.patch_0` and one would silently overwrite the other.
//Numbering runs folder by folder and, inside a folder, in the file's own index order, so the
//layering a mod author expressed within one folder survives; sidecars keep their patch file's
//number. A single selected folder that is already numbered from zero comes out unchanged.
function buildPatchFileInstructions(patchFiles, dirs) {
  const counters = {};
  const instructions = [];
  for (const dir of dirs) {
    const groups = new Map();
    for (const file of patchFiles) {
      if (optionDir(file) !== dir) continue;
      const match = PATCH_FILE_RE.exec(path.basename(file));
      if (match === null) continue;
      const index = parseInt(match[2], 10);
      const key = `${match[1].toLowerCase()}:${index}`;
      if (!groups.has(key)) groups.set(key, { hash: match[1], index, files: [] });
      groups.get(key).files.push({
        file,
        suffix: (match[3] !== undefined) ? match[3] : '',
      });
    }
    const ordered = Array.from(groups.values()).sort((lhs, rhs) => {
      const byHash = lhs.hash.toLowerCase().localeCompare(rhs.hash.toLowerCase());
      return (byHash !== 0) ? byHash : (lhs.index - rhs.index);
    });
    for (const group of ordered) {
      const hashKey = group.hash.toLowerCase();
      const nextIndex = (counters[hashKey] !== undefined) ? counters[hashKey] : 0;
      counters[hashKey] = nextIndex + 1;
      for (const entry of group.files) {
        instructions.push({
          type: 'copy',
          source: entry.file,
          destination: `${group.hash}.patch_${nextIndex}${entry.suffix}`,
        });
      }
    }
  }
  return instructions;
}

//A tree only needs asking about when it offers a real choice. No options at all means the manifest
//describes the mod without branching, and a single exclusive option is a choice of one.
function needsQuery(tree) {
  return (tree.options.length > 0) && !(tree.exclusive && (tree.options.length === 1));
}

function defaultSelection(tree) {
  const options = {};
  tree.options.forEach((option, idx) => {
    options[option.id] = (tree.exclusive) ? (idx === 0) : (option.defaultOn === true);
  });
  const subOptions = {};
  for (const option of tree.options) {
    if (option.subOptions.length > 0) subOptions[option.id] = option.subOptions[0].id;
  }
  return { options, subOptions };
}

//Asking the user is a dialog component, not `api.showDialog`: a Vortex dialog can hold only one
//radio group, and a manifest can have a sub-option group per enabled option. The installer and the
//dialog talk through this queue rather than through the api, because they are the same module.
const OPTION_QUEUE = [];
const OPTION_LISTENERS = new Set();

function activeOptionRequest() {
  return (OPTION_QUEUE.length > 0) ? OPTION_QUEUE[0] : undefined;
}

function notifyOptionListeners() {
  const request = activeOptionRequest();
  for (const listener of Array.from(OPTION_LISTENERS)) listener(request);
}

//Resolves once the user confirms. Installs are queued one at a time, but a queue costs nothing and
//means a second request can never silently replace one the user is still looking at.
function requestOptionSelection(tree) {
  return new Promise((resolve, reject) => {
    OPTION_QUEUE.push({ tree, resolve, reject });
    if (OPTION_QUEUE.length === 1) notifyOptionListeners();
  });
}

function answerOptionRequest(selection) {
  const request = OPTION_QUEUE.shift();
  notifyOptionListeners();
  if (request !== undefined) request.resolve(selection);
}

function cancelOptionRequest() {
  const request = OPTION_QUEUE.shift();
  notifyOptionListeners();
  if (request !== undefined) request.reject(new util.UserCanceled());
}

//install patch mods, asking once which of the mod's versions to install when it offers a choice
async function installPatchMulti(files, destinationPath) {
  const patchFiles = files.filter(file =>
    !file.endsWith(path.sep) && (parsePatchFile(path.basename(file)) !== undefined));

  //A manifest is authoritative when it is usable, because it carries the names, descriptions and
  //grouping the mod author wrote. Anything wrong with it falls back to the folder layout.
  const manifestFiles = new Set();
  const manifest = await readManifest(files, destinationPath);
  let tree;
  if (manifest !== undefined) {
    manifestFiles.add(normalizeRelPath(manifest.file).toLowerCase());
    if (manifest.data !== undefined) {
      tree = parseManifestTree(manifest.data, destinationPath, collectArchiveDirs(files), manifestFiles);
    }
  }
  if (tree === undefined) tree = inferOptionTree(patchFiles, destinationPath);

  //Documentation and similar files that sit at the root of the archive are installed alongside the
  //patch files so they deploy normally. Anything deeper is skipped: it would collide once the patch
  //files are flattened, and it is nearly always part of a variant folder. The manifest and the
  //artwork it points at are skipped too - they belong to the picker, not to the game.
  const extraFiles = files.filter(file =>
    !file.endsWith(path.sep)
    && (parsePatchFile(path.basename(file)) === undefined)
    && (path.dirname(file) === '.')
    && !manifestFiles.has(normalizeRelPath(file).toLowerCase()));

  const generateInstructions = (dirs, chosenNames) => {
    const fileInstructions = buildPatchFileInstructions(patchFiles, dirs);
    const archives = Array.from(new Set(fileInstructions
      .map(instruction => parsePatchFile(instruction.destination))
      .filter(parsed => parsed !== undefined)
      .map(parsed => parsed.hash))).sort();
    const extraInstructions = extraFiles.map(file => ({
      type: 'copy',
      source: file,
      destination: path.basename(file),
    }));

    return [
      { type: 'setmodtype', value: PATCH_ID },
      { type: 'attribute', key: 'patchArchives', value: archives },
      //Recorded for the mod list and for support reports: what the user actually picked, by name.
      { type: 'attribute', key: 'hd2ModOptions', value: chosenNames },
    ].concat(fileInstructions, extraInstructions);
  };

  const selectedNames = (selection) => tree.options
    .filter(option => selection.options[option.id] === true)
    .map(option => {
      const sub = option.subOptions.find(entry => entry.id === selection.subOptions[option.id]);
      return (sub !== undefined) ? `${option.name} / ${sub.name}` : option.name;
    });

  if (tree === undefined) {
    //All the patch files live in one folder, so there is nothing to ask.
    const dirs = (patchFiles.length > 0) ? [optionDir(patchFiles[0])] : [];
    return { instructions: generateInstructions(dirs, []) };
  }

  if (tree.options.length === 0) {
    //A manifest that offers no options describes a mod installed from its root folder.
    return { instructions: generateInstructions([''], []) };
  }

  const selection = needsQuery(tree)
    ? await requestOptionSelection(tree)
    : defaultSelection(tree);
  return {
    instructions: generateInstructions(resolveSelection(tree, selection), selectedNames(selection)),
  };
}

//Test for .stream files
function testStream(files, gameId) {
  const isMod = files.some(file => path.extname(file).toLowerCase() === streamFileExt);
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install .stream files
function installStream(files, gameSpec) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === streamFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: STREAM_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  (
    (!file.endsWith(path.sep))
  )
  );

  const instructions = filtered.map((file, index) => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });

  instructions.push(setModTypeInstruction);

  return Promise.resolve({ instructions });
}

//A patch aimed at an archive this installation does not have never loads. Nothing else tells the
//user that, so say it at install time - but never block the install, since they may be mid-update.
async function warnAboutInertArchives(api, modId) {
  const state = api.getState();
  const mod = util.getSafe(state, ['persistent', 'mods', GAME_ID, modId], undefined);
  if ((mod === undefined) || (mod.type !== PATCH_ID)) return;

  const baseArchives = await ensureBaseArchives(api);
  if (baseArchives.size === 0) return; //could not scan the game folder - do not cry wolf

  const hashes = await getModArchives(api, mod);
  const missing = hashes.filter(hash => !baseArchives.has(hash));
  if (missing.length === 0) return;

  const name = getModName(mod);
  api.sendNotification({
    id: `helldivers2-inert-archive-${modId}`,
    type: 'warning',
    message: `"${name}" patches an archive this game version does not have`,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('info', 'Patch targets a missing archive', {
            text: `"${name}" contains patch files for the following archives, which are not present `
                + `in this installation's data folder:\n\n`
                + missing.map(hash => `    ${hash} (${archiveDisplayName(hash)})`).join('\n')
                + `\n\nHelldivers 2 ignores a patch whose archive it does not have, so these files `
                + `will have no effect in game. The mod has still been installed. This usually means `
                + `the mod was made for a different version of the game, or that the game needs `
                + `updating.`,
          }, [{ label: 'Close', action: () => dismiss() }]);
        },
      },
    ],
  });
}

// PATCH PLAN ////////////////////////////////////////////////////////////////

//Order only matters within a single archive: two mods that touch different archives never interact.
//So there is one order for all patch mods, and each archive derives its own numbering from it.
//
//The numbering must be contiguous. A hole in an archive's patch_0..N sequence does not merely load
//the mods in the wrong order, it stops them working, so the counter below runs over the files that
//actually exist on disk for mods that are actually enabled, and never over their positions in the
//order.

let PLAN_CACHE = undefined; // { profileId, plan } - valid for the duration of one deployment
//Conflict information the load order rows read. Kept outside redux because the renderers are
//synchronous and building a plan reads the disk.
let CONFLICT_MODS = new Set();

function invalidatePlan() {
  PLAN_CACHE = undefined;
}

//The stored order is an array under FBLO. Installations upgrading from the legacy load order page
//still have the old object keyed by mod id, so read both shapes.
function readLoadOrderState(state, profileId) {
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profileId], undefined);
  if (Array.isArray(loadOrder)) {
    return loadOrder.map(entry => entry.id).filter(id => id !== undefined);
  }
  if ((loadOrder !== undefined) && (loadOrder !== null) && (typeof loadOrder === 'object')) {
    return Object.keys(loadOrder)
      .filter(id => (loadOrder[id] !== undefined) && (loadOrder[id] !== null))
      .sort((lhs, rhs) => (loadOrder[lhs].pos ?? 0) - (loadOrder[rhs].pos ?? 0));
  }
  return [];
}

function getOverrides(state, profileId) {
  return util.getSafe(state, ['persistent', 'helldivers2PatchOverrides', profileId], {});
}

async function buildPatchPlan(api, profileId) {
  const state = api.getState();
  const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
  const profile = util.getSafe(state, ['persistent', 'profiles', profileId], undefined);
  const isEnabled = (modId) => util.getSafe(profile, ['modState', modId, 'enabled'], false);

  //Master order: the stored order first, then any patch mod that is not in it yet.
  const ordered = [];
  const seen = new Set();
  for (const modId of readLoadOrderState(state, profileId)) {
    if (seen.has(modId)) continue;
    seen.add(modId);
    if ((mods[modId] !== undefined) && (mods[modId].type === PATCH_ID) && isEnabled(modId)) {
      ordered.push(modId);
    }
  }
  for (const modId of Object.keys(mods).sort()) {
    if (seen.has(modId)) continue;
    if ((mods[modId].type === PATCH_ID) && isEnabled(modId)) {
      ordered.push(modId);
    }
  }

  const warnings = [];
  const baseArchives = await ensureBaseArchives(api);

  //One contribution per (mod, archive, patch index the mod itself uses). A mod that ships both
  //x.patch_0 and x.patch_1 therefore keeps its own internal layering.
  const contributions = [];
  for (const modId of ordered) {
    const mod = mods[modId];
    const files = await listModPatchFiles(api, mod);
    const grouped = new Map();
    for (const file of files) {
      const key = `${file.hash}#${file.index}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          modId,
          modName: getModName(mod),
          hash: file.hash,
          localIdx: file.index,
          files: [],
        });
      }
      grouped.get(key).files.push(path.basename(file.filePath));
    }

    const claimed = util.getSafe(mod, ['attributes', 'patchArchives'], undefined);
    if (Array.isArray(claimed)) {
      const present = new Set(files.map(file => file.hash));
      for (const hash of claimed.map(h => String(h).toLowerCase())) {
        if (!present.has(hash)) {
          warnings.push({
            type: 'missing-files',
            hash,
            modId,
            message: `"${getModName(mod)}" is recorded as patching archive ${hash} but has no such `
                   + `file in its staging folder. It has been left out of the numbering.`,
          });
        }
      }
    }

    const modContributions = Array.from(grouped.values())
      .sort((lhs, rhs) => (lhs.localIdx - rhs.localIdx) || lhs.hash.localeCompare(rhs.hash));
    for (const contribution of modContributions) {
      contributions.push(contribution);
    }
  }

  //Group by archive, keeping master order, then apply that archive's override if it has one.
  const overrides = getOverrides(state, profileId);
  const masterRank = new Map(ordered.map((modId, idx) => [modId, idx]));
  const byArchive = {};
  for (const contribution of contributions) {
    if (byArchive[contribution.hash] === undefined) byArchive[contribution.hash] = [];
    byArchive[contribution.hash].push(contribution);
  }

  for (const hash of Object.keys(byArchive)) {
    const list = byArchive[hash];
    const override = overrides[hash];
    if (Array.isArray(override) && (override.length > 0)) {
      //Mods named in the override come first, in the order it gives; anything it does not mention
      //follows in master order. Mods it names that are no longer installed simply never appear.
      const overrideRank = new Map(override.map((modId, idx) => [modId, idx]));
      list.sort((lhs, rhs) => {
        const lhsRank = overrideRank.has(lhs.modId) ? overrideRank.get(lhs.modId) : Number.MAX_SAFE_INTEGER;
        const rhsRank = overrideRank.has(rhs.modId) ? overrideRank.get(rhs.modId) : Number.MAX_SAFE_INTEGER;
        if (lhsRank !== rhsRank) return lhsRank - rhsRank;
        const lhsMaster = masterRank.get(lhs.modId) ?? 0;
        const rhsMaster = masterRank.get(rhs.modId) ?? 0;
        if (lhsMaster !== rhsMaster) return lhsMaster - rhsMaster;
        return lhs.localIdx - rhs.localIdx;
      });
    }

    //Running counter, not position in the order: a disabled or missing mod must not leave a hole,
    //and a mod contributing several files to one archive takes consecutive numbers. Always starts
    //at 0 - the base game ships no patch files of its own, so there is nothing to number above.
    list.forEach((contribution, idx) => { contribution.assigned = idx; });

    if (!baseArchives.has(hash) && (baseArchives.size > 0)) {
      warnings.push({
        type: 'inert-archive',
        hash,
        modId: undefined,
        message: `Archive ${hash} (${archiveDisplayName(hash)}) is not present in the game folder, `
               + `so patches for it have no effect in game.`,
      });
    }
  }

  //The numbering is the whole point, so prove it rather than assume it. A hole here is a bug in
  //this function, not something the user did, so fail rather than warn.
  for (const hash of Object.keys(byArchive)) {
    const assigned = byArchive[hash].map(contribution => contribution.assigned).sort((lhs, rhs) => lhs - rhs);
    for (let i = 0; i < assigned.length; ++i) {
      if (assigned[i] !== i) {
        throw new Error(`Helldivers 2: patch numbering for archive ${hash} is not contiguous `
          + `(expected ${i}, got ${assigned[i]}). Please report this.`);
      }
    }
  }

  const assignments = {};
  const byMod = {};
  for (const hash of Object.keys(byArchive)) {
    for (const contribution of byArchive[hash]) {
      assignments[`${contribution.modId}|${contribution.hash}|${contribution.localIdx}`] = contribution.assigned;
      if (byMod[contribution.modId] === undefined) {
        byMod[contribution.modId] = { name: contribution.modName, archives: {} };
      }
      if (byMod[contribution.modId].archives[hash] === undefined) {
        byMod[contribution.modId].archives[hash] = [];
      }
      byMod[contribution.modId].archives[hash].push(contribution.assigned);
    }
  }

  const conflicts = Object.keys(byArchive)
    .filter(hash => new Set(byArchive[hash].map(contribution => contribution.modId)).size >= 2)
    .sort();

  //Cache what the load order rows need so their renderers stay synchronous.
  CONFLICT_MODS = new Set(conflicts.reduce((accum, hash) =>
    accum.concat(byArchive[hash].map(contribution => contribution.modId)), []));

  return {
    profileId,
    builtAt: new Date().toISOString(),
    order: ordered,
    byArchive,
    byMod,
    assignments,
    conflicts,
    warnings,
  };
}

async function ensurePlan(api, profileId) {
  if ((PLAN_CACHE !== undefined) && (PLAN_CACHE.profileId === profileId)) {
    return PLAN_CACHE.plan;
  }
  const plan = await buildPatchPlan(api, profileId);
  PLAN_CACHE = { profileId, plan };
  return plan;
}

//Rebuild the plan purely to refresh what the pages display. Deliberately does not touch the
//deployment cache, which has to stay stable for the length of a merge run.
async function refreshPlanForUI(api) {
  try {
    const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
    if (profileId === undefined) return undefined;
    const plan = await buildPatchPlan(api, profileId);
    notifyFblo();
    return plan;
  } catch (err) {
    log('warn', `[${GAME_ID}] could not refresh patch plan`, err);
    return undefined;
  }
}

// MERGE /////////////////////////////////////////////////////////////////////

const mergeTest = (game, discovery, context) => {
  if (game.id !== GAME_ID) return;

  return {
    baseFiles: () => [],
    //Only patch files are renamed and merged. Everything else a mod ships - documentation and so on
    //- has to be left alone so that it deploys normally.
    filter: (filePath) => parsePatchFile(path.basename(filePath)) !== undefined,
  };
};

const sendRefreshLoadOrderNotification = (context) => {
  context.api.sendNotification({
    id: 'refresh-load-order-notification-helldivers2',
    type: 'error',
    message: 'Refresh your load order',
    allowSuppress: false,
  });
};

//Which mod a file being merged belongs to. Matching against each mod's staging folder rather than
//taking the file's parent folder name means a mod that keeps its patch files in a subfolder still
//resolves correctly. The longest matching staging path wins, in case one is nested inside another.
function resolveModId(api, filePath) {
  const state = api.getState();
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  if (!stagingPath) return undefined;
  const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
  const normalized = path.normalize(filePath).toLowerCase();

  let best;
  for (const modId of Object.keys(mods)) {
    const installationPath = mods[modId].installationPath;
    if (installationPath === undefined) continue;
    const modRoot = path.normalize(path.join(stagingPath, installationPath)).toLowerCase() + path.sep;
    if (normalized.startsWith(modRoot) && ((best === undefined) || (modRoot.length > best.length))) {
      best = { modId, length: modRoot.length };
    }
  }
  return (best !== undefined) ? best.modId : undefined;
}

const mergeOperation = async (filePath, mergePath, context) => {
  const api = context.api;
  const parsed = parsePatchFile(path.basename(filePath));
  if (parsed === undefined) return; //the filter above should already have excluded this

  const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
  const plan = await ensurePlan(api, profileId);
  const modId = resolveModId(api, filePath);

  const assigned = (modId !== undefined)
    ? plan.assignments[`${modId}|${parsed.hash}|${parsed.index}`]
    : undefined;

  if (assigned === undefined) {
    sendRefreshLoadOrderNotification(context);
    return;
  }

  //Sidecar files take the same number as the patch file they belong to.
  const targetFileName = `${parsed.hash}.patch_${assigned}${parsed.suffix}`;
  const mergeTarget = path.join(mergePath, targetFileName);

  await fs.ensureDirWritableAsync(path.dirname(mergeTarget));
  try {
    await util.copyFileAtomic(filePath, mergeTarget);
  } catch (err) {
    //Skipping the file is not an option: the game needs an archive's patch files to be numbered
    //without gaps, so leaving one out breaks every mod above it for that archive. Fail the whole
    //deployment instead, and say which archive and mod are involved.
    const modName = plan.byMod[modId] !== undefined ? plan.byMod[modId].name : modId;
    log('error', `[${GAME_ID}] failed to write merged patch file`, {
      source: filePath,
      destination: mergeTarget,
      error: err.message,
    });
    api.showErrorNotification(
      `Could not write patch file for archive ${parsed.hash}`,
      new Error(`Deployment stopped while merging "${modName}". Helldivers 2 needs an archive's `
        + `patch files to be numbered without gaps, so the remaining mods for archive `
        + `${parsed.hash} were not written either. Original error: ${err.message}`),
      { allowReport: false });
    throw err;
  }
};

//Reading back what was actually written is the only thing between a copy that quietly failed and a
//user whose mods stop working, so check that every archive got the numbers the plan promised.
async function verifyMergedOutput(api, plan) {
  const stagingPath = selectors.installPathForGame(api.getState(), GAME_ID);
  if (!stagingPath) return;
  const mergedPath = path.join(stagingPath, `__merged.${PATCH_ID}`);

  let entries = [];
  try {
    entries = await fs.readdirAsync(mergedPath);
  } catch (err) {
    if (err.code === 'ENOENT') return; //nothing was merged, nothing to check
    log('warn', `[${GAME_ID}] could not read ${mergedPath}: ${err.message}`);
    return;
  }

  const found = {};
  for (const entry of entries) {
    const parsed = parsePatchFile(entry);
    if (parsed === undefined) continue;
    if (found[parsed.hash] === undefined) found[parsed.hash] = new Set();
    found[parsed.hash].add(parsed.index);
  }

  const broken = [];
  for (const hash of Object.keys(plan.byArchive)) {
    const expected = plan.byArchive[hash].map(contribution => contribution.assigned);
    const actual = found[hash] ?? new Set();
    const missing = expected.filter(index => !actual.has(index));
    if (missing.length > 0) {
      broken.push({ hash, missing });
    }
  }

  if (broken.length === 0) return;

  log('error', `[${GAME_ID}] merged patch files are incomplete`, broken);
  api.showErrorNotification(
    'Some patch files were not written',
    new Error('Helldivers 2 needs each archive\'s patch files to be numbered without gaps. The '
      + 'following archives are missing files, so their mods will not work correctly:\n\n'
      + broken.map(entry => `    ${entry.hash} (${archiveDisplayName(entry.hash)}) - missing `
        + `patch_${entry.missing.join(', patch_')}`).join('\n')
      + '\n\nTry deploying again. If it keeps happening, check that no other program is using the '
      + 'game folder and that there is enough free disk space.'),
    { allowReport: false });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions for Mod Managers
function autoDeployNotification(api) {
  const NOTIF_ID = 'setup-notification-helldivers2';
  const MESSAGE = 'Disabling Auto-Deploy is Recommended';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'info',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            bbcode: `Deployment of mods for Helldivers 2 is a bit slower and tedious. By disabling
            this option, it will save you time and make it easier on your PC / Drive.
            <br/>
            <br/>
            It is in "Settings > Interface > Automation > Deploy Mods when Enabled"
            <br/>
            <br/>
            There will be a notification to remind you that you need to deploy.`
          }, [
            { label: 'OK', action: () => dismiss() },
            {
              label: 'Never Show Again', action: () => {
                api.suppressNotification(NOTIF_ID);
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });
}

//Notify User of Setup instructions for Mod Managers
function setupNotification(api) {
  const NOTIF_ID = 'setup-notification-helldivers2-general';
  const MESSAGE = 'Special Instructions for Helldivers 2';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'info',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            bbcode: `This extension renames patch files automatically, using the order you set on the Load Order page.
            <br/>
            <br/>
            Both graphics and sound mods are handled. Because two mods only affect each other when they patch the same archive, each archive gets its own numbering worked out from that one order.
            <br/>
            <br/>
            You can use the Patch Conflicts page to see which mods patch specific game data files and their patch naming order.
            <br/>
            <br/>
            Mods do not change in game until you deploy, so deploy after adding, removing, enabling, disabling or reordering a patch mod.`
          }, [
            { label: 'OK', action: () => dismiss() },
            {
              label: 'Never Show Again', action: () => {
                api.suppressNotification(NOTIF_ID);
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });
}

//Setup function
async function setup(discovery, api, gameSpec) {
  setupNotification(api);
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  invalidateBaseArchives();
  await ensureBaseArchives(api);
  /*const isAutoDeployOn = api.getState().settings.automation.deploy;
  if (isAutoDeployOn) autoDeployNotification(api); //*/
  return fs.ensureDirWritableAsync(path.join(discovery.path, DATA_PATH));
}

//Sound patches used to be a mod type of their own, installed unmerged and numbered by hand. They are
//ordinary patch mods now, so move them across. Their place in the order is picked up automatically:
//the load order below appends any patch mod it has not seen before.
//Runs whenever the game is activated rather than as a version migration. A migration only fires when
//the extension folder's info.json version differs from the one recorded in state, which makes it
//miss any install where the version did not visibly change. This is idempotent - once the mods are
//converted there is nothing left to find - so running it on every activation costs a state read.
async function convertSoundPatchMods(api) {
  const state = api.getState();
  const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
  const soundMods = Object.keys(mods).filter(modId => mods[modId].type === SOUNDPATCH_ID);
  if (soundMods.length === 0) return;

  util.batchDispatch(api.store, soundMods.map(modId => actions.setModType(GAME_ID, modId, PATCH_ID)));
  invalidatePlan();
  log('info', `[${GAME_ID}] migrated ${soundMods.length} sound patch mods to the merged patch mod type`);

  api.sendNotification({
    id: 'helldivers2-soundpatch-migration',
    type: 'success',
    message: `${soundMods.length} sound mod(s) now use the load order`,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('info', 'Sound mods now use the load order', {
            text: 'Sound mods used to be installed without being renamed, so two sound mods for the '
                + 'same archive would overwrite each other and had to be renumbered by hand. They '
                + 'are now ordered on the "Mod Priority" page along with every other patch mod.\n\n'
                + 'Deploy to apply the new numbering.',
          }, [{ label: 'Close', action: () => dismiss() }]);
        },
      },
    ],
  });
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: makeRequiresLauncher(context.api, gameSpec),
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    supportedTools: tools,
  };
  context.registerGame(game);

  //register mod types recusively
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });
  //register mod types explicitly
  context.registerModType(PATCH_ID, 25, //id, priority
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, //isSupported - Is this mod for this game
    (game) => pathPattern(context.api, game, path.join('{gamePath}', PATCH_PATH)), //getPath - mod install location
    () => Promise.resolve(false), //test - is installed mod of this type
    {
      name: PATCH_NAME,
    } //options
  );
  //Retired, kept registered for one release so the migration above has something to move mods off of
  context.registerModType(SOUNDPATCH_ID, 30, //id, priority
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, //isSupported - Is this mod for this game
    (game) => pathPattern(context.api, game, path.join('{gamePath}', PATCH_PATH)), //getPath - mod install location
    () => Promise.resolve(false), //test - is installed mod of this type
    {
      name: SOUNDPATCH_NAME,
    } //options
  );

  //register mod installers
  context.registerInstaller(DATA_ID, 25, testDlbin, installDlbin);
  context.registerInstaller(PATCH_ID, 27, testPatch,
    (files, destinationPath) => installPatchMulti(files, destinationPath));
  context.registerInstaller(STREAM_ID, 31, testStream, installStream);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    const openPath = DOWNLOAD_FOLDER;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Patch Order Folder', () => {
    util.opn(getDataFolder()).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });

  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open PCGamingWiki Page', () => {
    util.opn(PCGAMINGWIKI_URL).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Submit Bug Report', () => {
    util.opn(`${EXTENSION_URL}?tab=bugs`).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
}

const requestDeployment = (context) => {
  context.api.store.dispatch(actions.setDeploymentNecessary(GAME_ID, true));

  context.api.sendNotification({
    id: 'deploy-notification-helldivers2',
    type: 'warning',
    message: 'Deployment is needed',
    allowSuppress: true,
    actions: [
      {
        title: 'Deploy',
        action: () => context.api.events.emit('deploy-mods', (err) => {
          log('warn', `Error deploying mods: ${err}`);
        })
      }
    ],
  });
};

// LOAD ORDER FUNCTIONS //////////////////////////////////////////////////////

//Reordering is ignored while a mod update is in flight: the deserializer below freezes the stored
//order and the serializer skips writing, so tell the user their change was not applied.
function notifyLoadOrderPaused(api, gameId) {
  api.sendNotification({
    id: `${gameId}-loadorder-update-paused`,
    type: 'warning',
    message: 'Load order changes are paused while a mod update finishes. Reorder again once it completes.',
    displayMS: 6000,
  });
}

async function readOrderFile(profileId) {
  const stored = await readJsonFile(path.join(getDataFolder(), ORDER_FILE(profileId)), []);
  return Array.isArray(stored) ? stored : [];
}

async function writeOrderFile(profileId, entries) {
  return writeJsonFile(path.join(getDataFolder(), ORDER_FILE(profileId)), entries);
}

async function makeLoadOrderEntry(api, mod, profile, stored) {
  const archives = await getModArchives(api, mod);
  return {
    id: mod.id,
    modId: mod.id,
    name: getModName(mod),
    //With no game-side list to enable entries in, this simply mirrors whether the mod is enabled in
    //Vortex. The merge only walks enabled mods, so that is what "enabled" means here.
    enabled: util.getSafe(profile, ['modState', mod.id, 'enabled'], false),
    locked: stored?.locked === true,
    data: { archives },
  };
}

async function deserializeLoadOrder(context) {
  const api = context.api;

  // on mod update for all profile it would cause the mod if it was selected to be unselected
  if (mod_update_all_profile) {
    //A mod update briefly removes and reinstalls mods, so rebuilding the order right now would drop
    //their entries. Return the stored order untouched instead: positions are preserved and the page
    //keeps showing the real load order rather than a placeholder row.
    const updateState = api.getState();
    const updateProfileId = selectors.lastActiveProfileForGame(updateState, GAME_ID);
    return util.getSafe(updateState, ['persistent', 'loadOrder', updateProfileId], []);
  }

  const state = api.getState();
  const profileId = selectors.lastActiveProfileForGame(state, GAME_ID);
  const profile = util.getSafe(state, ['persistent', 'profiles', profileId], undefined);
  const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});

  const patchMods = new Set(Object.keys(mods).filter(modId => mods[modId].type === PATCH_ID));
  const stored = await readOrderFile(profileId);
  const storedById = new Map(stored.map(entry => [entry.id, entry]));

  const loadOrder = [];
  const seen = new Set();
  for (const entry of stored) { //stored order first, dropping mods that are gone
    if (seen.has(entry.id) || !patchMods.has(entry.id)) continue;
    seen.add(entry.id);
    loadOrder.push(await makeLoadOrderEntry(api, mods[entry.id], profile, entry));
  }
  for (const modId of Array.from(patchMods).sort()) { //then anything newly installed
    if (seen.has(modId)) continue;
    loadOrder.push(await makeLoadOrderEntry(api, mods[modId], profile, storedById.get(modId)));
  }
  return loadOrder;
}

async function serializeLoadOrder(context, loadOrder) {
  if (mod_update_all_profile) {
    notifyLoadOrderPaused(context.api, GAME_ID);
    return;
  }

  const state = context.api.getState();
  const profileId = selectors.lastActiveProfileForGame(state, GAME_ID);

  const serialized = loadOrder.map(entry => ({ id: entry.id, locked: entry.locked === true }));
  const previous = await readOrderFile(profileId);
  const changed = JSON.stringify(previous) !== JSON.stringify(serialized);

  await writeOrderFile(profileId, serialized);

  //Only ask for a deployment when the order really moved, so that simply opening the page does not
  //keep telling the user to deploy.
  if (changed) {
    invalidatePlan();
    requestDeployment(context);
    refreshPlanForUI(context.api);
  }
}

// REACT LOAD ORDER UI ///////////////////////////////////////////////////////

//Module-level pub-sub for multi-select + context menu + status filter (Vortex FBLO page has no custom context provider)
let _fbloSelectedIds = new Set();
let _fbloContextMenu = null;
let _fbloStatusFilter = new Set();
const _fbloListeners = new Set();
function notifyFblo() { _fbloListeners.forEach(listener => listener()); }
function useFbloState() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    _fbloListeners.add(forceUpdate);
    return () => _fbloListeners.delete(forceUpdate);
  }, []);
  return {
    selectedIds: _fbloSelectedIds,
    setSelectedIds: (fn) => { _fbloSelectedIds = fn(_fbloSelectedIds); notifyFblo(); },
    contextMenu: _fbloContextMenu,
    setContextMenu: (val) => { _fbloContextMenu = val; notifyFblo(); },
    statusFilter: _fbloStatusFilter,
    setStatusFilter: (next) => { _fbloStatusFilter = next; notifyFblo(); },
  };
}

function useInjectStyleOnce(styleId, css) {
  React.useEffect(() => {
    if (globalThis.document.getElementById(styleId)) return;
    const style = globalThis.document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    globalThis.document.head.appendChild(style);
  }, [styleId, css]);
}

//Shared dismiss behaviour for the context menu: any click or right-click outside closes it, as does
//Escape. Menu items call stopPropagation, so their own clicks never reach these listeners.
function useDismissOnOutside(onClose) {
  React.useEffect(() => {
    const dismiss = () => onClose();
    const onKey = (evt) => { if (evt.key === 'Escape') onClose(); };
    globalThis.document.addEventListener('click', dismiss);
    globalThis.document.addEventListener('contextmenu', dismiss);
    globalThis.document.addEventListener('keydown', onKey);
    return () => {
      globalThis.document.removeEventListener('click', dismiss);
      globalThis.document.removeEventListener('contextmenu', dismiss);
      globalThis.document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
}

//Viewport clamp for the context menu. The clamped position is measured once into state and then
//rendered, rather than written onto el.style after the fact - a fresh callback ref every render
//makes React detach and reattach it, and the next render would overwrite the mutated style anyway.
function useClampedMenuPosition(x, y) {
  const [position, setPosition] = React.useState({ left: x, top: y });
  const measureRef = React.useCallback((el) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = globalThis.window.innerWidth;
    const vh = globalThis.window.innerHeight;
    const left = (x + rect.width > vw) ? Math.max(8, vw - rect.width - 8) : x;
    const top = (y + rect.height > vh) ? Math.max(8, vh - rect.height - 8) : y;
    setPosition(prev => (prev.left === left && prev.top === top) ? prev : { left, top });
  }, [x, y]);
  return [position, measureRef];
}

//Status filter shared helpers (load order pages). Groups combine with AND across, OR within.
const STATUS_GROUP_TOKENS = { enabled: ['enabled', 'disabled'], locked: ['locked', 'unlocked'] };
const STATUS_TOKEN_LABELS = { enabled: 'Enabled', disabled: 'Disabled', locked: 'Locked', unlocked: 'Unlocked' };

function matchesStatus(entry, active, isEnabledFn, isLockedFn) {
  if (active.has('enabled') || active.has('disabled')) {
    const en = isEnabledFn(entry);
    if (!((active.has('enabled') && en) || (active.has('disabled') && !en))) return false;
  }
  if (active.has('locked') || active.has('unlocked')) {
    const lk = isLockedFn(entry);
    if (!((active.has('locked') && lk) || (active.has('unlocked') && !lk))) return false;
  }
  return true;
}

//Inline toggle pills for status filtering (used in the InfoPanel surfaces)
function StatusPills({ active, setActive, groups, count }) {
  const { Button } = require('react-bootstrap');
  const tokens = groups.reduce((acc, group) => acc.concat(STATUS_GROUP_TOKENS[group] || []), []);
  const toggle = (token) => {
    const next = new Set(active);
    next.has(token) ? next.delete(token) : next.add(token);
    setActive(next);
  };
  return React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginBottom: 8 } },
    React.createElement('span', { style: { fontWeight: 'bold', marginRight: 4 } }, 'Filter:'),
    count != null ? React.createElement('span', { style: { color: '#7ec8e3', marginRight: 4 } }, `${count.matched} / ${count.total}`) : null,
    ...tokens.map(token => React.createElement(Button, {
      key: token,
      bsSize: 'xsmall',
      bsStyle: active.has(token) ? 'success' : 'default',
      style: active.has(token) ? { fontWeight: 'bold' } : undefined,
      onClick: () => toggle(token),
    }, STATUS_TOKEN_LABELS[token])),
    active.size > 0 ? React.createElement(Button, {
      key: '__clear',
      bsSize: 'xsmall',
      bsStyle: 'link',
      onClick: () => setActive(new Set()),
    }, 'Clear') : null,
  );
}

//Enablement here is Vortex's own mod state: this game has no separate list of active patch mods.
const isEntryLocked = (entry) => [true, 'true', 'always'].includes(entry?.locked);
const makeIsEntryEnabled = (profile) => (entry) =>
  util.getSafe(profile, ['modState', entry?.modId, 'enabled'], false);

//Resolve the mod page URL for a load order entry (undefined when not resolvable).
//Prefers the mod's homepage attribute; falls back to composing the Nexus URL from the numeric mod id.
function getModPageURL(api, vortexModId) {
  if (vortexModId === undefined) return undefined;
  const attributes = util.getSafe(api.getState(), ['persistent', 'mods', GAME_ID, vortexModId, 'attributes'], {});
  if (attributes.homepage) return attributes.homepage;
  if (attributes.source === 'nexus' && attributes.modId !== undefined) {
    return `https://www.nexusmods.com/${GAME_ID}/mods/${attributes.modId}`;
  }
  return undefined;
}

//Resolve the staging folder of a load order entry (undefined when not resolvable)
function getModStagingFolder(api, vortexModId) {
  if (vortexModId === undefined) return undefined;
  const state = api.getState();
  const installationPath = util.getSafe(state, ['persistent', 'mods', GAME_ID, vortexModId, 'installationPath'], undefined);
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  if (!installationPath || !stagingPath) return undefined;
  return path.join(stagingPath, installationPath);
}

const LO_ROW_HIDE_CSS = '.file-based-load-order-list .list-group > div:has(.lo-row-hidden) { display: none !important; }';
const LO_CTX_MENU_CSS = '.hd2-ctx-item:hover { background: rgba(255,255,255,0.1); }';

function LoadOrderInstructions() {
  const { statusFilter, setStatusFilter } = useFbloState();
  const { useSelector } = require('react-redux');
  const profile = useSelector((state) => selectors.activeProfile(state));
  const loadOrder = useSelector((state) => util.getSafe(state, ['persistent', 'loadOrder', profile?.id], []));
  const isEnabled = makeIsEntryEnabled(profile);

  // Count entries matching the active filter (matched / total), shown beside the pills.
  const total = loadOrder.length;
  const matched = statusFilter.size > 0
    ? loadOrder.filter((entry) => matchesStatus(entry, statusFilter, isEnabled, isEntryLocked)).length
    : total;

  // Collapse the DraggableListItem wrapper of any filtered-out row. The renderer only owns the
  // inner <li>; the two dnd <div> wrappers retain their spacing when the <li> is display:none,
  // leaving visible gaps. This :has() rule hides the whole wrapper when its row is marked hidden.
  useInjectStyleOnce('hd2-fblo-status-filter-hide-style', LO_ROW_HIDE_CSS);

  //Keep the "shares an archive" markers on the rows current without waiting for a deployment. Keyed
  //on the sorted mod ids, because which mods are present changes conflicts and reordering does not.
  const modIdKey = React.useMemo(() =>
    loadOrder.map(entry => entry.id).sort().join('|'), [loadOrder]);
  React.useEffect(() => {
    if (extensionApi !== undefined) refreshPlanForUI(extensionApi);
  }, [modIdKey]);

  return React.createElement('div', null,
    React.createElement(StatusPills, { active: statusFilter, setActive: setStatusFilter, groups: ['enabled', 'locked'], count: statusFilter.size > 0 ? { matched, total } : null }),
    React.createElement('p', { style: { fontStyle: 'italic', color: '#7ec8e3' } },
      'Filter the list above by status. Clear the filter before reordering mods.',
    ),
    React.createElement('br', null),
    React.createElement('p', null,
      'Drag and drop the mods on the left to set which of them wins when two mods change the same thing. Mods further down the list take priority.',
    ),
    React.createElement('br', null),
    React.createElement('p', null,
      'Two mods only affect each other when they patch the same game archive. This one order covers every patch mod, and each archive gets its own numbering worked out from it, so you never have to think about archives unless two mods actually collide. Rows marked with a warning icon share an archive with another mod; the Patch Conflicts page lists those archives and lets you reorder within one of them on its own.',
    ),
    React.createElement('br', null),
    React.createElement('p', { style: { fontWeight: 'bold' } },
      'Changes here do nothing in game until you deploy. Deploy after adding, removing, enabling, disabling or reordering a patch mod - Helldivers 2 needs each archive\'s patch files numbered without gaps, and only deploying rewrites them.',
    ),
  );
}

//* React line item renderer for load order
function LoadOrderItemRenderer(props) {
  const { className, item } = props;
  if (item?.loEntry === undefined) return null;

  const { ListGroupItem } = require('react-bootstrap');
  const { Icon, LoadOrderIndexInput, MainContext } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');

  const context = React.useContext(MainContext);
  const dispatch = useDispatch();

  const profile = useSelector((state) => selectors.activeProfile(state));
  const loadOrder = useSelector((state) =>
    util.getSafe(state, ['persistent', 'loadOrder', profile?.id], []),
  );

  const { loEntry } = item;
  const mods = useSelector((state) => util.getSafe(state, ['persistent', 'mods', GAME_ID], {}));
  const pictureUrl = mods[loEntry.modId]?.attributes?.pictureUrl;
  //FBLO precomputes these on the item (memoized by its row cache); the fallbacks keep the
  //renderer working if it is ever mounted outside the FBLO page.
  const currentIdx = item.position ?? loadOrder.findIndex((entry) => entry.id === loEntry.id) + 1;
  const lockedCount = item.lockedEntriesCount ?? loadOrder.filter(isEntryLocked).length;

  const isEnabled = makeIsEntryEnabled(profile);
  const entryLocked = isEntryLocked(loEntry);
  const { selectedIds, setSelectedIds, contextMenu, setContextMenu, statusFilter } = useFbloState();
  const isSelected = selectedIds.has(loEntry.id);

  const archives = loEntry.data?.archives ?? [];
  const sharesArchive = CONFLICT_MODS.has(loEntry.modId);

  const onApplyIndex = React.useCallback((idx) => {
    if (currentIdx === idx) return;
    const newLO = loadOrder.filter((entry) => entry.id !== loEntry.id);
    newLO.splice(idx - 1, 0, loEntry);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
  }, [dispatch, profile, loadOrder, loEntry, currentIdx]);

  //Shift-select must span visible rows only, so build the id list from the status-filtered order.
  //Memoized: a bare filter here would run once per row, i.e. O(n^2) over the whole load order.
  const allIds = React.useMemo(() => loadOrder
    .filter(entry => matchesStatus(entry, statusFilter, isEnabled, isEntryLocked))
    .map(entry => entry.id), [loadOrder, statusFilter, profile]);

  const onSelect = React.useCallback((evt) => {
    const ctrlKey = evt.ctrlKey || evt.metaKey;
    const shiftKey = evt.shiftKey;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (ctrlKey) {
        next.has(loEntry.id) ? next.delete(loEntry.id) : next.add(loEntry.id);
      } else if (shiftKey) {
        const lastId = [...prev].at(-1);
        const start = allIds.indexOf(lastId ?? loEntry.id);
        const end = allIds.indexOf(loEntry.id);
        const [lo, hi] = [Math.min(start, end), Math.max(start, end)];
        for (let i = lo; i <= hi; i++) next.add(allIds[i]);
      } else {
        next.clear();
        next.add(loEntry.id);
      }
      return next;
    });
  }, [loEntry.id, setSelectedIds, allIds]);

  const onContextMenu = React.useCallback((evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    setContextMenu({ x: evt.clientX, y: evt.clientY, itemId: loEntry.id });
  }, [loEntry.id, setContextMenu]);

  const onLock = React.useCallback(() => {
    const newLO = loadOrder.map(entry => entry.id === loEntry.id ? { ...entry, locked: !entryLocked } : entry);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
    serializeLoadOrder(context, newLO);
  }, [dispatch, context, profile, loadOrder, loEntry, entryLocked]);

  const classes = ['load-order-entry'];
  if (className) classes.push(...className.split(' '));

  // Status filter: render hidden (but keep the DnD item count stable) when the entry is filtered out.
  // The 'lo-row-hidden' marker lets the injected CSS collapse the whole DraggableListItem wrapper
  // (the two dnd <div>s the renderer can't reach), otherwise their spacing leaves visible gaps.
  if (!matchesStatus(loEntry, statusFilter, isEnabled, isEntryLocked)) {
    return React.createElement(ListGroupItem, { key: loEntry.id, className: 'lo-row-hidden', style: { display: 'none' } });
  }

  return React.createElement(
    ListGroupItem,
    {
      key: loEntry.id,
      className: classes.join(' '),
      onClick: onSelect,
      onContextMenu: onContextMenu,
      style: {
        outline: isSelected ? '2px solid #337ab7' : 'none',
        outlineOffset: '-1px',
        opacity: isEnabled(loEntry) ? 1 : 0.55,
      },
    },
    React.createElement(Icon, { className: 'drag-handle-icon', name: 'drag-handle' }),
    React.createElement(LoadOrderIndexInput, {
      className: 'load-order-index',
      api: context.api,
      item: loEntry,
      currentPosition: currentIdx,
      lockedEntriesCount: lockedCount,
      loadOrder: loadOrder,
      isLocked: isEntryLocked,
      onApplyIndex: onApplyIndex,
    }),
    React.createElement('div', {
      style: { cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: 4 },
      title: entryLocked ? 'Unlock position' : 'Lock position',
      onClick: (evt) => { evt.stopPropagation(); onLock(); },
    },
      React.createElement(Icon, { name: entryLocked ? 'locked' : 'unlocked', style: { color: entryLocked ? '#e2c04c' : 'inherit' } }),
    ),
    React.createElement('div', { className: 'load-order-thumb-slot', style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, marginRight: 4, flexShrink: 0 } },
      pictureUrl ? React.createElement('img', {
        className: 'load-order-thumb',
        src: pictureUrl,
        draggable: false,
        style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, objectFit: 'cover', borderRadius: 2, pointerEvents: 'none' },
      }) : null,
    ),
    React.createElement('p', { className: 'load-order-name', style: { flex: 1, marginBottom: 0 } }, loEntry.name),
    archives.length > 0 ? React.createElement('span', {
      className: 'hd2-archive-chip',
      title: archives.map(hash => `${archiveDisplayName(hash)} (${hash})`).join('\n'),
      style: {
        marginLeft: 8, marginRight: 4, padding: '1px 6px', borderRadius: 8, flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.25)', fontSize: 11, whiteSpace: 'nowrap',
      },
    }, `${archives.length} archive${archives.length === 1 ? '' : 's'}`) : null,
    sharesArchive ? React.createElement('span', {
      title: 'Shares an archive with another enabled mod - see the Patch Conflicts page',
      style: { marginRight: 4, display: 'flex', alignItems: 'center', flexShrink: 0 },
    },
      React.createElement(Icon, { name: 'feedback-warning', style: { color: '#e2c04c' } }),
    ) : null,
    contextMenu?.itemId === loEntry.id ? React.createElement(FbloContextMenu, {
      x: contextMenu.x, y: contextMenu.y,
      item: loEntry, loadOrder, profile, dispatch, context, selectedIds,
      onClose: () => setContextMenu(null),
    }) : null,
  );
} //*/

//Right-click context menu for load order entries (single + multi-select)
function FbloContextMenu({ x, y, item, loadOrder, profile, dispatch, context, selectedIds, onClose }) {
  useDismissOnOutside(onClose);
  useInjectStyleOnce('hd2-ctx-menu-style', LO_CTX_MENU_CSS);

  const [menuPosition, clampRef] = useClampedMenuPosition(x, y);

  const isMulti = selectedIds.size >= 2 && selectedIds.has(item.id);
  const targets = isMulti ? loadOrder.filter(entry => selectedIds.has(entry.id)) : [item];

  const applyToTargets = (transform, serialize = false) => {
    const newLO = transform(loadOrder, targets);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
    if (serialize) serializeLoadOrder(context, newLO);
    onClose();
  };

  const entryLocked = isEntryLocked(item);
  const isEnabled = makeIsEntryEnabled(profile);

  //This game has no list of its own to enable entries in, so enabling a row is simply enabling the
  //Vortex mod. There is deliberately only one Enable/Disable pair.
  const setVortexEnabled = (entries, enabled) => {
    const modIds = entries.filter(entry => entry.modId !== undefined).map(entry => entry.modId);
    if (modIds.length > 0) {
      actions.setModsEnabled(context.api, profile.id, modIds, enabled, { allowAutoDeploy: true });
    }
    onClose();
  };
  const openStagingFolders = (entries) => {
    entries.forEach(entry => {
      const folder = getModStagingFolder(context.api, entry.modId);
      if (folder) util.opn(folder).catch(() => null);
    });
    onClose();
  };

  const modPageUrl = getModPageURL(context.api, item.modId);
  const stagingFolder = getModStagingFolder(context.api, item.modId);

  const menuStyle = {
    position: 'fixed', left: menuPosition.left, top: menuPosition.top, zIndex: 9999,
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4, padding: '4px 0', minWidth: 180,
    boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
  };
  const itemStyle = { padding: '6px 16px', cursor: 'pointer', whiteSpace: 'nowrap' };
  const sepStyle = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' };

  const menuItem = (label, onClick) => React.createElement('div', {
    className: 'hd2-ctx-item',
    style: itemStyle,
    onClick: (evt) => { evt.stopPropagation(); onClick(); },
  }, label);

  if (isMulti) {
    const n = targets.length;
    return React.createElement('div', { ref: clampRef, style: menuStyle },
      menuItem(`Enable Selected (${n})`, () => setVortexEnabled(targets, true)),
      menuItem(`Disable Selected (${n})`, () => setVortexEnabled(targets, false)),
      React.createElement('div', { style: sepStyle }),
      menuItem(`Lock Selected (${n})`, () => applyToTargets((lo) => lo.map(entry => targets.find(target => target.id === entry.id) ? { ...entry, locked: true } : entry), true)),
      menuItem(`Unlock Selected (${n})`, () => applyToTargets((lo) => lo.map(entry => targets.find(target => target.id === entry.id) ? { ...entry, locked: false } : entry), true)),
      React.createElement('div', { style: sepStyle }),
      menuItem(`Move to Top (${n})`, () => applyToTargets((lo) => {
        const locked = lo.filter(isEntryLocked);
        const selected = lo.filter(entry => targets.find(target => target.id === entry.id) && !isEntryLocked(entry));
        const rest = lo.filter(entry => !isEntryLocked(entry) && !targets.find(target => target.id === entry.id));
        return [...locked, ...selected, ...rest];
      }, true)),
      menuItem(`Move to Bottom (${n})`, () => applyToTargets((lo) => {
        //Locked entries stay put, so they have to be counted into rest or they drop out of the order
        const selected = lo.filter(entry => targets.find(target => target.id === entry.id) && !isEntryLocked(entry));
        const rest = lo.filter(entry => !targets.find(target => target.id === entry.id) || isEntryLocked(entry));
        return [...rest, ...selected];
      }, true)),
      React.createElement('div', { style: sepStyle }),
      menuItem(`Open Staging Folders (${n})`, () => openStagingFolders(targets)),
    );
  }

  return React.createElement('div', { ref: clampRef, style: menuStyle },
    menuItem(isEnabled(item) ? 'Disable' : 'Enable', () => setVortexEnabled([item], !isEnabled(item))),
    menuItem(entryLocked ? 'Unlock Position' : 'Lock Position', () => applyToTargets((lo) => lo.map(entry => entry.id === item.id ? { ...entry, locked: !entryLocked } : entry), true)),
    React.createElement('div', { style: sepStyle }),
    menuItem('Move to Top', () => applyToTargets((lo) => {
      if (isEntryLocked(item)) return lo;
      const locked = lo.filter(isEntryLocked);
      const rest = lo.filter(entry => !isEntryLocked(entry) && entry.id !== item.id);
      return [...locked, item, ...rest];
    }, true)),
    menuItem('Move to Bottom', () => applyToTargets((lo) => {
      if (isEntryLocked(item)) return lo;
      const rest = lo.filter(entry => entry.id !== item.id);
      return [...rest, item];
    }, true)),
    React.createElement('div', { style: sepStyle }),
    stagingFolder ? menuItem('Open Staging Folder', () => { util.opn(stagingFolder).catch(() => null); onClose(); }) : null,
    modPageUrl ? menuItem('Open Mod Page', () => { util.opn(modPageUrl).catch(() => null); onClose(); }) : null,
  );
}

// MOD OPTIONS DIALOG ////////////////////////////////////////////////////////

const OPTION_DIALOG_CSS = [
  '.hd2-option-layout { display: flex; gap: 16px; align-items: flex-start; }',
  '.hd2-option-list { flex: 1 1 60%; max-height: 45vh; overflow-y: auto; }',
  '.hd2-option-detail { flex: 1 1 40%; max-height: 45vh; overflow-y: auto; }',
  '.hd2-option-sub { margin-left: 24px; }',
  '.hd2-option-warning { margin-top: 8px; color: #e2c04c; }',
  '.hd2-option-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }',
  '.hd2-option-actions p { margin: 0; }',
].join(' ');

//The option picker. Registered with `registerDialog`, so it controls its own visibility: it renders
//nothing until an install asks a question, and the install's promise stays pending until it is
//answered. Options are checkboxes (or one radio group when the tree is exclusive), an enabled
//option's sub-options are a radio group of their own, and the pane on the right shows the artwork
//and description of whatever is focused.
function PatchOptionsDialog() {
  const { Modal, Icon } = require('vortex-api');
  const { Button, Checkbox, Radio } = require('react-bootstrap');
  const { pathToFileURL } = require('url');

  const [request, setRequest] = React.useState(activeOptionRequest());
  const [selection, setSelection] = React.useState(undefined);
  const [focus, setFocus] = React.useState(undefined);
  const [imageFailed, setImageFailed] = React.useState({});

  React.useEffect(() => {
    OPTION_LISTENERS.add(setRequest);
    setRequest(activeOptionRequest());
    return () => { OPTION_LISTENERS.delete(setRequest); };
  }, []);

  //Every request starts from its own defaults, so answering one install never leaks into the next.
  React.useEffect(() => {
    if (request === undefined) {
      setSelection(undefined);
      setFocus(undefined);
      return;
    }
    setSelection(defaultSelection(request.tree));
    setFocus({ optionId: request.tree.options[0]?.id });
    setImageFailed({});
  }, [request]);

  useInjectStyleOnce('hd2-mod-options-style', OPTION_DIALOG_CSS);

  if ((request === undefined) || (selection === undefined)) return null;
  const tree = request.tree;

  const setOption = (option, enabled) => {
    const options = (tree.exclusive)
      ? tree.options.reduce((accum, iter) => ({ ...accum, [iter.id]: iter.id === option.id }), {})
      : { ...selection.options, [option.id]: enabled };
    setSelection({ ...selection, options });
    setFocus({ optionId: option.id });
  };

  const setSubOption = (option, sub) => {
    setSelection({ ...selection, subOptions: { ...selection.subOptions, [option.id]: sub.id } });
    setFocus({ optionId: option.id, subId: sub.id });
  };

  //Enabling everything at once. Only offered when the options are independent checkboxes - an
  //exclusive tree is one radio group, where "all" is not a state that exists. Sub-option picks the
  //user already made are kept; an option that gains a sub-group here falls back to its first entry,
  //the same answer the dialog opens with, so Install is never blocked by an option the user was not
  //shown a choice for.
  const selectAllOptions = () => {
    const options = tree.options.reduce((accum, iter) => ({ ...accum, [iter.id]: true }), {});
    const subOptions = { ...selection.subOptions };
    for (const option of tree.options) {
      const chosen = subOptions[option.id];
      if ((option.subOptions.length > 0) && !option.subOptions.some(sub => sub.id === chosen)) {
        subOptions[option.id] = option.subOptions[0].id;
      }
    }
    setSelection({ options, subOptions });
  };

  //An enabled option whose sub-options are all unpicked would install nothing, so it blocks Install
  //rather than quietly dropping out.
  const unanswered = tree.options.filter(option =>
    (selection.options[option.id] === true)
    && (option.subOptions.length > 0)
    && !option.subOptions.some(sub => sub.id === selection.subOptions[option.id]));
  const nothingChosen = !tree.options.some(option => selection.options[option.id] === true);
  const everythingChosen = tree.options.every(option => selection.options[option.id] === true);

  const focused = (() => {
    if (focus === undefined) return undefined;
    const option = tree.options.find(iter => iter.id === focus.optionId);
    if (option === undefined) return undefined;
    if (focus.subId === undefined) return option;
    return option.subOptions.find(sub => sub.id === focus.subId) ?? option;
  })();

  const imageUrl = (entry) => {
    if ((entry === undefined) || !entry.image || !tree.dataPath) return undefined;
    if (imageFailed[entry.id] === true) return undefined;
    try {
      return pathToFileURL(path.join(tree.dataPath, entry.image.split('/').join(path.sep))).href;
    } catch {
      return undefined;
    }
  };

  const renderSubOption = (option, sub) => React.createElement('div',
    { key: sub.id, className: 'hd2-option-sub' },
    React.createElement(Radio, {
      name: `hd2-sub-${option.id}`,
      checked: selection.subOptions[option.id] === sub.id,
      onChange: () => setSubOption(option, sub),
      onClick: () => setFocus({ optionId: option.id, subId: sub.id }),
    }, sub.name));

  const renderOption = (option) => React.createElement('div',
    { key: option.id, className: 'hd2-option' },
    React.createElement(tree.exclusive ? Radio : Checkbox, {
      name: 'hd2-option',
      checked: selection.options[option.id] === true,
      onChange: (evt) => setOption(option, evt.currentTarget.checked),
      onClick: () => setFocus({ optionId: option.id }),
    }, option.name),
    (selection.options[option.id] === true)
      ? option.subOptions.map(sub => renderSubOption(option, sub))
      : null);

  //Options carrying no category, or a category the manifest never declared, are listed first and
  //without a heading - the same place they would be if the mod declared no categories at all.
  const grouped = [
    { category: undefined, options: tree.options.filter(option => option.categoryId === undefined) },
  ].concat(tree.categories.map(category => ({
    category,
    options: tree.options.filter(option => option.categoryId === category.id),
  }))).filter(group => group.options.length > 0);

  const focusedImage = imageUrl(focused);

  return React.createElement(Modal, {
    id: 'hd2-mod-options-dialog',
    show: true,
    onHide: () => cancelOptionRequest(),
  },
    React.createElement(Modal.Header, null,
      React.createElement(Modal.Title, null, tree.name ?? 'Choose Mod Options')),
    React.createElement(Modal.Body, null,
      (tree.description !== undefined)
        ? React.createElement('p', null, tree.description) : null,
      React.createElement('div', { className: 'hd2-option-actions' },
        React.createElement('p', null, (tree.exclusive)
          ? 'Choose the version of this mod you wish to install.'
          : 'Choose the components you wish to install.'),
        (!tree.exclusive && (tree.options.length > 1))
          ? React.createElement(Button, {
            bsSize: 'small',
            disabled: everythingChosen,
            onClick: () => selectAllOptions(),
          }, 'Select All')
          : null),
      React.createElement('div', { className: 'hd2-option-layout' },
        React.createElement('div', { className: 'hd2-option-list' },
          grouped.map(group => React.createElement('div',
            { key: group.category?.id ?? 'hd2-ungrouped' },
            (group.category !== undefined)
              ? React.createElement('h5', null, group.category.name) : null,
            group.options.map(renderOption)))),
        React.createElement('div', { className: 'hd2-option-detail' },
          (focusedImage !== undefined)
            ? React.createElement('img', {
              src: focusedImage,
              alt: focused.name,
              style: { maxWidth: '100%', marginBottom: 8 },
              onError: () => setImageFailed({ ...imageFailed, [focused.id]: true }),
            })
            : null,
          (focused !== undefined)
            ? React.createElement('h5', null, focused.name) : null,
          (focused !== undefined) && (focused.description !== undefined)
            ? React.createElement('p', null, focused.description) : null)),
      (unanswered.length > 0)
        ? React.createElement('p', { className: 'hd2-option-warning' },
          React.createElement(Icon, { name: 'feedback-warning' }),
          ` Choose a version for: ${unanswered.map(option => option.name).join(', ')}`)
        : null),
    React.createElement(Modal.Footer, null,
      React.createElement(Button, { onClick: () => cancelOptionRequest() }, 'Cancel'),
      React.createElement(Button, {
        bsStyle: 'primary',
        disabled: (unanswered.length > 0) || nothingChosen,
        onClick: () => answerOptionRequest(selection),
      }, 'Install')));
}

// PATCH CONFLICTS PAGE //////////////////////////////////////////////////////

//Lists only the archives that more than one enabled mod patches, which is normally a handful at
//most. Reordering here writes a small exception for that one archive; the main order is untouched.
function PatchConflictsPage({ api }) {
  const { useSelector, useDispatch } = require('react-redux');
  const { Button, ListGroup, ListGroupItem } = require('react-bootstrap');
  const { Icon } = require('vortex-api');

  const dispatch = useDispatch();
  const profileId = useSelector(state => selectors.activeProfile(state)?.id);
  const loadOrder = useSelector(state => util.getSafe(state, ['persistent', 'loadOrder', profileId], []));
  const overrides = useSelector(state => getOverrides(state, profileId));

  const [plan, setPlan] = React.useState(undefined);
  const [busy, setBusy] = React.useState(true);
  const [expanded, setExpanded] = React.useState(new Set());

  const rebuild = React.useCallback(async () => {
    setBusy(true);
    try {
      const built = await buildPatchPlan(api, profileId);
      setPlan(built);
    } catch (err) {
      log('warn', `[${GAME_ID}] could not build patch plan for the conflicts page`, err);
      setPlan(undefined);
    } finally {
      setBusy(false);
    }
  }, [api, profileId]);

  React.useEffect(() => {
    if (profileId === undefined) return;
    rebuild();
  }, [profileId, loadOrder, overrides]);

  const toggleExpanded = (hash) => {
    const next = new Set(expanded);
    next.has(hash) ? next.delete(hash) : next.add(hash);
    setExpanded(next);
  };

  //Moving a mod within one archive writes that archive's full mod order as the exception, so the
  //result stays what the user just saw even if the main order changes later.
  const move = async (hash, modId, delta) => {
    const current = plan.byArchive[hash];
    const modIds = [];
    for (const contribution of current) {
      if (!modIds.includes(contribution.modId)) modIds.push(contribution.modId);
    }
    const idx = modIds.indexOf(modId);
    const target = idx + delta;
    if ((idx < 0) || (target < 0) || (target >= modIds.length)) return;
    [modIds[idx], modIds[target]] = [modIds[target], modIds[idx]];

    dispatch(setPatchOverride(profileId, hash, modIds));
    const next = { ...overrides, [hash]: modIds };
    await writeJsonFile(path.join(getDataFolder(), OVERRIDES_FILE(profileId)), next);
    invalidatePlan();
    requestDeployment({ api });
  };

  const reset = async (hash) => {
    dispatch(clearPatchOverride(profileId, hash));
    const next = { ...overrides };
    delete next[hash];
    await writeJsonFile(path.join(getDataFolder(), OVERRIDES_FILE(profileId)), next);
    invalidatePlan();
    requestDeployment({ api });
  };

  if (busy && (plan === undefined)) {
    return React.createElement(MainPage, null,
      React.createElement(MainPage.Body, null,
        React.createElement('p', { style: { padding: 12 } }, 'Working out the patch order...')));
  }

  if (plan === undefined) {
    return React.createElement(MainPage, null,
      React.createElement(MainPage.Body, null,
        React.createElement('p', { style: { padding: 12, fontWeight: 'bold', color: 'yellow' } },
          'The patch order could not be worked out. Check the Vortex log for details.')));
  }

  const archiveCount = Object.keys(plan.byArchive).length;
  const inertWarnings = plan.warnings.filter(warning => warning.type === 'inert-archive');

  //Everything lives in the body. MainPage.Header portals its children into the application's shared
  //header bar, which already draws the page title - stacking more than a single row of controls in
  //there overlaps what is already on it.
  return React.createElement(MainPage, null,
    React.createElement(MainPage.Body, null,
      React.createElement('div', { style: { padding: 12, overflowY: 'auto', height: '100%' } },
        React.createElement('h4', { style: { marginTop: 0 } },
          `${archiveCount} archive${archiveCount === 1 ? '' : 's'} touched, `
          + `${plan.conflicts.length} contested`),
        React.createElement('p', null,
          'Two patch mods only affect each other when they patch the same game archive. Only those '
          + 'archives are listed here. Within one, the mod at the bottom wins. Reordering here '
          + 'applies to that archive alone and leaves the main order on the Mod Priority page '
          + 'untouched.'),
        React.createElement('p', { style: { fontWeight: 'bold' } },
          'Deploy to apply any change made here.'),
        React.createElement('br', null),

        ...inertWarnings.map(warning => React.createElement('div', {
          key: `warning-${warning.hash}`,
          style: { marginBottom: 8, padding: 8, border: '1px solid #e2c04c', borderRadius: 3, color: '#e2c04c' },
        },
          React.createElement(Icon, { name: 'feedback-warning', style: { marginRight: 6 } }),
          warning.message,
        )),

        plan.conflicts.length === 0
          ? React.createElement('p', { style: { fontStyle: 'italic' } },
            'No two enabled mods patch the same archive, so there is nothing to resolve here.')
          : React.createElement(ListGroup, null,
            ...plan.conflicts.map(hash => {
              const contributions = plan.byArchive[hash];
              const isOpen = expanded.has(hash);
              const hasOverride = Array.isArray(overrides[hash]) && (overrides[hash].length > 0);
              const modIds = [];
              for (const contribution of contributions) {
                if (!modIds.includes(contribution.modId)) modIds.push(contribution.modId);
              }
              return React.createElement(ListGroupItem, { key: hash },
                React.createElement('div', {
                  style: { display: 'flex', alignItems: 'center', cursor: 'pointer' },
                  onClick: () => toggleExpanded(hash),
                },
                  React.createElement(Icon, { name: isOpen ? 'showhide-down' : 'showhide-right', style: { marginRight: 6 } }),
                  React.createElement('span', { style: { fontWeight: 'bold' } }, archiveDisplayName(hash)),
                  React.createElement('span', { style: { marginLeft: 8, opacity: 0.7, fontFamily: 'monospace' } }, hash),
                  React.createElement('span', { style: { marginLeft: 8, opacity: 0.7 } }, `(${archiveKind(hash)})`),
                  React.createElement('span', { style: { marginLeft: 'auto' } }, `${modIds.length} mods`),
                  hasOverride ? React.createElement('span', {
                    style: { marginLeft: 8, padding: '1px 6px', borderRadius: 8, border: '1px solid #7ec8e3', color: '#7ec8e3', fontSize: 11 },
                  }, 'custom order') : null,
                ),
                isOpen ? React.createElement('div', { style: { marginTop: 8, marginLeft: 20 } },
                  ...contributions.map((contribution, idx) => React.createElement('div', {
                    key: `${contribution.modId}-${contribution.localIdx}`,
                    style: { display: 'flex', alignItems: 'center', padding: '2px 0' },
                  },
                    React.createElement('span', { style: { fontFamily: 'monospace', minWidth: 90, opacity: 0.8 } },
                      `patch_${contribution.assigned}`),
                    React.createElement('span', { style: { flex: 1 } }, contribution.modName),
                    React.createElement(Button, {
                      bsSize: 'xsmall',
                      disabled: idx === 0,
                      onClick: () => move(hash, contribution.modId, -1),
                      title: 'Move up (loads earlier, lower priority)',
                    }, React.createElement(Icon, { name: 'sort-up' })),
                    React.createElement(Button, {
                      bsSize: 'xsmall',
                      disabled: idx === contributions.length - 1,
                      onClick: () => move(hash, contribution.modId, 1),
                      title: 'Move down (loads later, higher priority)',
                    }, React.createElement(Icon, { name: 'sort-down' })),
                  )),
                  hasOverride ? React.createElement(Button, {
                    bsSize: 'xsmall',
                    bsStyle: 'link',
                    onClick: () => reset(hash),
                  }, 'Reset to main order') : null,
                ) : null,
              );
            }),
          ),
      ),
    ),
  );
}

//Main Function
let extensionApi; //captured so the React surfaces can reach the api without prop drilling

function main(context) {
  extensionApi = context.api;

  context.registerReducer(['persistent', 'helldivers2PatchOverrides'], {
    reducers: {
      [SET_PATCH_OVERRIDE]: (state, payload) => util.setSafe(state, [payload.profileId, payload.hash], payload.order),
      [CLEAR_PATCH_OVERRIDE]: (state, payload) => util.deleteOrNop(state, [payload.profileId, payload.hash]),
    },
    defaults: {},
  });

  applyGame(context, spec);

  context.registerLoadOrder({
    gameId: GAME_ID,
    gameArtURL: path.join(__dirname, spec.game.logo),
    validate: async () => Promise.resolve(undefined), //numbering is checked when the plan is built
    deserializeLoadOrder: async () => await deserializeLoadOrder(context),
    serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
    //Nothing in the game marks a patch mod as active, so enabling an entry is enabling the Vortex
    //mod. That lives in the row's context menu instead of a checkbox.
    toggleableEntries: false,
    usageInstructions: LoadOrderInstructions,
    customItemRenderer: LoadOrderItemRenderer,
  });

  context.registerDialog('helldivers2-mod-options', PatchOptionsDialog);

  context.registerMainPage('conflict', 'Patch Conflicts', PatchConflictsPage, {
    id: `${GAME_ID}-patch-conflicts`,
    mdi: PATCH_CONFLICT_ICON,
    priority: 31,
    group: 'per-game',
    visible: () => selectors.activeGameId(context.api.getState()) === GAME_ID,
    props: () => ({ api: context.api }),
  });

  context.registerMerge( //register merger for patch mods (graphics and sound alike)
    (game, discovery) => mergeTest(game, discovery, context),
    (filePath, mergePath) => mergeOperation(filePath, mergePath, context),
    PATCH_ID
  );

  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;

    //Fires for EVERY game Vortex activates, not just this one, so everything below is gated on the
    //game id - an ungated side effect here runs while the user is managing some unrelated game.
    api.events.on('gamemode-activated', (gameId) => {
      if (gameId !== GAME_ID) return;
      invalidateBaseArchives();
      invalidatePlan();
      ensureBaseArchives(api).catch(() => null);
      convertSoundPatchMods(api)
        .catch(err => log('warn', `[${GAME_ID}] could not convert sound patch mods`, err));
    });

    //Work the numbering out once per deployment, before the merger starts asking about individual
    //files, and keep a copy on disk for inspection.
    api.onAsync('will-deploy', async (profileId) => {
      const lastActiveHelldiverProfile = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== lastActiveHelldiverProfile) return;
      invalidatePlan();
      try {
        const plan = await ensurePlan(api, profileId);
        await writeJsonFile(path.join(getDataFolder(), PLAN_FILE(profileId)), plan);
      } catch (err) {
        log('error', `[${GAME_ID}] could not work out the patch order`, err);
        api.showErrorNotification('Could not work out the patch order', err, { allowReport: false });
        throw err;
      }
    });

    api.onAsync('did-deploy', async (profileId, deployment) => {
      const lastActiveHelldiverProfile = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== lastActiveHelldiverProfile) return;

      //release tracking one mod id at a time, and only once that mod's new version has
      //landed and is enabled, so a deploy that fires mid-batch can't disarm the guard for
      //mods that haven't been reinstalled yet
      const guardWasArmed = mod_update_all_profile;
      if (updateModIds.size > 0) {
        const state = api.getState();
        const profile = selectors.profileById(state, profileId);
        const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
        const now = Date.now();
        for (const [nexusId, { firstSeen, targetFileId }] of Array.from(updateModIds)) {
          const landed = Object.values(mods).some((mod) =>
            String(mod?.attributes?.modId ?? '') === nexusId &&
            //if the target file is unknown, fall back to "installed and enabled"
            (targetFileId === '' || String(mod?.attributes?.fileId ?? '') === targetFileId) &&
            util.getSafe(profile, ['modState', mod.id, 'enabled'], false)
          );
          if (landed) {
            updateModIds.delete(nexusId);
          } else if (now - firstSeen > MAX_UPDATE_WAIT_MS) {
            log('warn', `[${GAME_ID}] Mod update tracking for Nexus mod ${nexusId} timed out without landing; releasing load order guard for it.`);
            updateModIds.delete(nexusId);
          }
        }
      }
      mod_update_all_profile = updateModIds.size > 0; //stay armed while any update is still outstanding
      //Core FBLO deserialized this order concurrently with this handler - did-deploy listeners run
      //in parallel and the core one is registered first - so it read the frozen order before the
      //guard cleared above, leaving its page stale. Re-run the deserialize it would have got and
      //push the result into state.
      if (guardWasArmed && !mod_update_all_profile) {
        try {
          const refreshedLO = await deserializeLoadOrder({ api });
          api.store.dispatch(actions.setFBLoadOrder(profileId, refreshedLO));
        } catch (err) {
          log('warn', `[${GAME_ID}] post-update load order refresh failed`, err);
        }
      }
      updating_mod = false; //reset updating flag on deploy

      //Check what actually got written before clearing the plan: a copy that failed quietly would
      //otherwise leave the user with mods that no longer load and nothing to explain why.
      if ((PLAN_CACHE !== undefined) && (PLAN_CACHE.profileId === profileId)) {
        try {
          await verifyMergedOutput(api, PLAN_CACHE.plan);
        } catch (err) {
          log('warn', `[${GAME_ID}] could not verify the merged patch files`, err);
        }
      }
      invalidatePlan();

      api.dismissNotification('deploy-notification-helldivers2');
      // Because we create a merged mod when deploying, Vortex thinks that all mods have duplicates and are redundant
      api.dismissNotification('redundant-mods');
    });

    api.events.on('did-install-mod', (gameId, archiveId, modId) => {
      if (gameId !== GAME_ID) return;
      delete ARCHIVE_ATTR_CACHE[modId];
      invalidatePlan();
      warnAboutInertArchives(api, modId)
        .catch(err => log('warn', `[${GAME_ID}] could not check the mod's archives`, err));
    });

    //*
    api.events.on('mods-enabled', (mods, enabled, gameId) => {
      if (gameId !== GAME_ID) return;
      invalidatePlan();

      const isAutoDeployOn = api.getState().settings.automation.deploy;
      if (!isAutoDeployOn) {
        requestDeployment(context);
      }
    });
    api.events.on('mod-disabled', (profileId, modId) => {
      const lastActiveHelldiverProfile = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== lastActiveHelldiverProfile) return;
      invalidatePlan();

      const isAutoDeployOn = api.getState().settings.automation.deploy;
      if (!isAutoDeployOn) {
        requestDeployment(context);
      }
    }); //*/

    //detect mod update (to maintain LO position)
    //fileId is the version being updated TO, and is what tells the new version apart from the
    //old one on deploy - without it every mod not yet updated still looks "already installed"
    api.events.on('mod-update', (gameId, modId, fileId) => {
      if (GAME_ID == gameId) {
        updateModIds.set(String(modId), { firstSeen: Date.now(), targetFileId: String(fileId ?? '') });
      }
    });
    //detect batch mod update: the "Update all" button emits mods-update with LOCAL mod ids
    //and never emits mod-update, so resolve each one to its Nexus mod id before tracking it
    api.events.on('mods-update', (gameId, modIds) => {
      if (GAME_ID !== gameId) return;
      const mods = util.getSafe(api.getState(), ['persistent', 'mods', GAME_ID], {});
      for (const modId of modIds ?? []) {
        const nexusModId = mods[modId]?.attributes?.modId;
        if (nexusModId !== undefined) {
          updateModIds.set(String(nexusModId), {
            firstSeen: Date.now(),
            targetFileId: String(mods[modId]?.attributes?.newestFileId ?? ''),
          });
        }
      }
    });
    //detect mod removal (to maintain LO position) - match on the Nexus mod id recorded in state
    api.events.on('remove-mod', (gameMode, modId) => {
      if (gameMode === GAME_ID) {
        delete ARCHIVE_ATTR_CACHE[modId];
        invalidatePlan();
      }
      const removedMod = util.getSafe(api.getState(), ['persistent', 'mods', GAME_ID, modId], undefined);
      const nexusModId = removedMod?.attributes?.modId;
      if (nexusModId !== undefined && updateModIds.has(String(nexusModId))) {
        mod_update_all_profile = true;
      }
    });
    //detect mod installation (to maintain LO position)
    api.events.on('will-install-mod', (gameId, archiveId, modId) => {
      updating_mod = GAME_ID == gameId && Array.from(updateModIds.keys()).some((id) =>
        modId.includes("-" + id + "-") || modId.includes(" " + id + " ")
      );
    });
  });

  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
