/*///////////////////////////////////////////
Name: Bloodthief Vortex Extension
Structure: Godot Engine Game
Author: ChemBoy1
Version: 1.0.0
Date: 2026-08-22
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, resolveVersionByModVersion, testRequirementVersion } = require('./downloader');
//const winapi = require('winapi-bindings');

//const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "bloodthief";
const STEAMAPP_ID = "2533600";
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // Not including demo because it doesn't work with the mod loader.
const GAME_NAME = "Bloodthief";
const GAME_NAME_SHORT = "Bloodthief";
const EXEC = "bloodthief.exe";
const EXEC_CONSOLE = "bloodthief.console.exe";
const EXEC_XBOX = 'gamelaunchhelper.exe';

const ENGINE_VERSION = '4'; //3 or 4 - can see when running console.exe for game

//feature toggles
let hasXbox = false; //toggle for Xbox version logic
if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const customLoader = true;
const keepZips = false;
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const debug = false; //toggle for debug mode

const LOADER_CUSTOM_URL_API = 'https://api.github.com/repos/olvior/bloodthief-mod-loader';

let GAME_PATH = '';
let GAME_VERSION = 'default';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Godot Mod";
//const MOD_FOLDER = "mods";
let MOD_FOLDER = "mods-unpacked";
if (keepZips) {
  MOD_FOLDER = "mods";
}
const MOD_PATH = MOD_FOLDER;
const MOD_EXTS = ['.gd'];
//Files the mod loader guarantees at a mod's root folder, most reliable first.
const MOD_ROOT_FILES = ['mod_main.gd', 'manifest.json'];

const MAPS_ID = `${GAME_ID}-maps`;
const MAPS_NAME = "Map";
const MAPS_FOLDER = "maps";
const MAPS_PATH = MAPS_FOLDER;
const MAPS_EXTS = ['.map'];

const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = "XXX";
const TOOL_EXEC = path.join('XXX', 'XXX.exe');

// Information for downloader and updater
const LOADER_ID = `${GAME_ID}-godotmodloader`;
const LOADER_NAME = "Godot Mod Loader";
let LOADER_FILE = 'mod_loader_setup.gd';
if (customLoader) {
  LOADER_FILE = 'mod_loader.gd';
}
let LOADER_URL_API = `https://api.github.com/repos/GodotModding/godot-mod-loader`;
let LOADER_VERSION = '7.0.1';
let LOADER_ARC_NAME = `ModLoader-Self-Setup_${LOADER_VERSION}-WIN.zip`;
let ARCHIVE_PATTERN = new RegExp(/^ModLoader-Self-Setup_(\d+\.\d+\.\d+)-WIN/, 'i');
let LOADER_RESOLVE = resolveVersionByPattern;
if (ENGINE_VERSION === '3') {
  LOADER_VERSION = '6.3.0';
  LOADER_ARC_NAME = `godot-mod-loader_${LOADER_VERSION}_self-setup.zip`;
  ARCHIVE_PATTERN = new RegExp(/^godot-mod-loader_(\d+\.\d+\.\d+)_self-setup/, 'i');
}
//The custom loader publishes one asset per release, always named `mod_loader.zip`, with the
//version only in the release tag. Its pattern therefore has no capture group, and
//resolveVersionByPattern would floor every check to 0.0.0 and report an update forever - read
//back the tag-derived version stamped on the installed mod instead.
if (customLoader) {
  LOADER_URL_API = LOADER_CUSTOM_URL_API;
  LOADER_ARC_NAME = 'mod_loader.zip';
  ARCHIVE_PATTERN = new RegExp(/^mod_loader\.zip$/, 'i');
  LOADER_RESOLVE = resolveVersionByModVersion;
}
const REQUIREMENTS = [
  { //Godot Mod Loader
    archiveFileName: LOADER_ARC_NAME,
    modType: LOADER_ID,
    assemblyFileName: LOADER_FILE,
    userFacingName: LOADER_NAME,
    githubUrl: LOADER_URL_API,
    findMod: (api) => findModByFile(api, LOADER_ID, LOADER_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, LOADER_ARC_NAME),
    fileArchivePattern: ARCHIVE_PATTERN,
    resolveVersion: (api) => LOADER_RESOLVE(api, REQUIREMENTS[0]),
  }, //*/
];
const OVERRIDE_FILE = 'override.cfg';

const MOD_PATH_DEFAULT = MOD_PATH;
const REQ_FILE = EXEC;
let PARAMETERS_STRING = '';
if (!customLoader) {
  PARAMETERS_STRING = '--script addons/mod_loader/mod_loader_setup.gd';
}
const PAR_STRING2 = '--setup-create-override-cfg';
//An empty string here reaches the game as an empty argv element, so emit no arguments at all.
const PARAMETERS = (PARAMETERS_STRING === '') ? [] : [PARAMETERS_STRING];
const MODTYPE_FOLDERS = [MOD_PATH, 'mods', MAPS_PATH];

const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1528"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Bloodthief";
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "parameters": PARAMETERS,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "supportsSymlinks": allowSymlinks,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", MOD_PATH)
    },
    {
      "id": MAPS_ID,
      "name": MAPS_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", MAPS_PATH)
    },
    {
      "id": LOADER_ID,
      "name": LOADER_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//3rd party tools and launchers
const tools = [ //accepts: exe, jar, py, vbs, bat
  {
    id: `${GAME_ID}-customlaunch`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC,
    requiredFiles: [
      EXEC,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    defaultPrimary: !customLoader,
    parameters: PARAMETERS,
  }, //*/
  {
    id: `${GAME_ID}-consolelaunch`,
    name: 'Console Launch',
    logo: 'exec.png',
    executable: () => EXEC_CONSOLE,
    requiredFiles: [
      EXEC_CONSOLE,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: PARAMETERS,
  }, //*/
  /*{
    id: TOOL_ID,
    name: TOOL_NAME,
    logo: 'tool.png',
    executable: () => TOOL_EXEC,
    requiredFiles: [
      TOOL_EXEC,
    ],
    relative: true,
    exclusive: true,
    //shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

function truncateString(str, num) {
  return str.length > num ? str.slice(0, num) : str;
}

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  try {
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch (err) { //this happens if the executable comes back as "undefined", usually caused by the Xbox app locking down the folder
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'xbox' && (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID))) {
      return Promise.resolve({
        launcher: 'xbox',
        addInfo: {
          appId: XBOXAPP_ID,
          parameters: [{ appExecName: XBOXEXECNAME }],
          //parameters: [{ appExecName: XBOXEXECNAME }, PARAMETERS_STRING],
          //launchType: 'gamestore',
        },
      });
  } //*/
  if (store === 'epic' && (DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID))) {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
          appId: EPICAPP_ID,
          //parameters: PARAMETERS,
          //launchType: 'gamestore',
        },
    });
  } //*/
  /*
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
      addInfo: {
        appId: STEAM_ID,
        //parameters: PARAMETERS,
        //launchType: 'gamestore',
      } //
    });
  } //*/
  return Promise.resolve(undefined);
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
//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (hasXbox && statCheckSync(discoveryPath, EXEC_XBOX)) {
    return EXEC_XBOX;
  };
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (hasXbox && await statCheckAsync(gamePath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  } else {
    GAME_VERSION = 'default';
    return GAME_VERSION;
  }
}

const getDiscoveryPath = (api) => { //get the game's discovered path
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) { //useful to clear out mods prior to doing some action
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) { //useful to deploy mods after doing some action
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for Godot Mod Loader files
function testLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LOADER_FILE));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer
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

//Folders that get swept into the published loader archive by mistake. The release currently
//carries a stray Python virtual environment under addons/.venv - about 2600 files and 29 MB
//that are not part of the loader and must never reach the game folder.
const LOADER_EXCLUDE_FOLDERS = ['.venv', '__pycache__', '.git', '.github'];

function isExcludedLoaderFile(file) {
  const segments = file.toLowerCase().split(/[\\/]/);
  return LOADER_EXCLUDE_FOLDERS.some(folder => segments.includes(folder));
}

//Install Godot Mod Loader files
function installLoader(files) {
  const MOD_TYPE = LOADER_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories, excluded build folders, and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  (
    !isExcludedLoaderFile(file) &&
    !file.endsWith(path.sep)
  ));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for mod files
function testMod(files, gameId) {
  const isMod = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer
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

//Find the file that marks a mod's root folder. The loader guarantees mod_main.gd and
//manifest.json sit there, so key on those and let the shallowest match win - a nested copy
//must not out-rank the real root. Falls back to the first .gd file when a mod carries
//neither, which is what this installer has always done.
function findModRootFile(files) {
  for (const rootName of MOD_ROOT_FILES) {
    const matches = files.filter(file => path.basename(file).toLowerCase() === rootName);
    if (matches.length > 0) {
      return matches.reduce((best, file) =>
        (file.split(/[\\/]/).length < best.split(/[\\/]/).length) ? file : best);
    }
  }
  return files.find(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
}

//* Install mod files (non-zip)
function installMod(files, fileName) {
  const MOD_TYPE = MOD_ID;
  const modFile = findModRootFile(files);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  let MOD_FOLDER = path.basename(rootPath);
  const MOD_NAME = path.basename(fileName);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
    MOD_FOLDER = truncateString(MOD_FOLDER, 29);
    /*
    const nameFile = files.find(file => ( MOD_EXTS.includes(path.extname(file).toLowerCase()) && ( path.basename(file) !== 'mod_main.gd' ) ));
    if (nameFile !== undefined) {
      MOD_FOLDER = path.basename(nameFile, path.extname(nameFile)); //set folder name to .gd file name if no file in archive
    } //*/
  }

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  ((file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
} //*/

//Install mod files in zips
async function installModZip(files, destinationPath) {
  const MOD_TYPE = MOD_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  const zipFiles = files.filter(file => ['.zip', '.7z', '.rar'].includes(path.extname(file)));
  if (zipFiles.length > 0) { // If it's a double zip, we don't need to repack. 
    const instructions = zipFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file),
      }
    });
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }
  else { // Repack the ZIP
    const szip = new util.SevenZip();
    let archiveName = path.basename(destinationPath, '.installing');
    archiveName = truncateString(archiveName, 25) + '.zip';
    const archivePath = path.join(destinationPath, archiveName);
    const rootRelPaths = await fs.readdirAsync(destinationPath);
    await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
    const instructions = [{
      type: 'copy',
      source: archiveName,
      destination: path.basename(archivePath),
    }];
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }
}

//A map is a <name>.map file with a sibling <name>.json alongside it. That pair is what
//separates a map archive from any other archive that happens to carry a .map file.
function findMapFile(files) {
  return files.find(file => {
    if (!MAPS_EXTS.includes(path.extname(file).toLowerCase())) {
      return false;
    }
    const sibling = `${file.slice(0, file.length - path.extname(file).length)}.json`.toLowerCase();
    return files.some(entry => entry.toLowerCase() === sibling);
  });
}

//Test for map files
function testMaps(files, gameId) {
  const isMod = (findMapFile(files) !== undefined);
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer
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

//Install map files
function installMaps(files, fileName) {
  const MOD_TYPE = MAPS_ID;
  const mapFile = findMapFile(files);
  const idx = mapFile.indexOf(path.basename(mapFile));
  const rootPath = path.dirname(mapFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  let MAP_FOLDER = path.basename(rootPath);
  const MAP_NAME = path.basename(fileName);
  if (MAP_FOLDER === '.') {
    MAP_FOLDER = MAP_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
    MAP_FOLDER = truncateString(MAP_FOLDER, 29);
  }

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  ((file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MAP_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Fallback installer to root folder
function testFallback(files, gameId) {
  let supported = (gameId === spec.game.id);

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

//Fallback installer to root folder
function installFallback(api, files, destinationPath) {
  fallbackInstallerNotify(api, destinationPath);

  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: file,
    };
  });
  return Promise.resolve({ instructions });
}

function fallbackInstallerNotify(api, modName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, spec.game.id);
  modName = path.basename(modName, '.installing');
  const id = modName.replace(/[^a-zA-Z0-9\s]*( )*/gi, '');
  const NOTIF_ID = `${GAME_ID}-${id}-fallback`;
  const MESSAGE = 'Fallback installer reached for ' + modName;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'info',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `The mod you just installed reached the fallback installer. This means Vortex could not determine where to place these mod files.\n`
                + `Please check the mod page description and review the files in the mod staging folder to determine if manual file manipulation is required.\n`
                + `\n`
                + `If you think that Vortex should be capable to install this mod to a specific folder, please contact the extension developer for support at the link below.\n`
                + `\n`
                + `Mod Name: ${modName}.\n`
                + `\n`
          }, [
            { label: 'Continue', action: () => dismiss() },
            {
              label: 'Contact Ext. Developer', action: () => {
                util.opn(`${EXTENSION_URL}?tab=posts`).catch(() => null);
                dismiss();
              }
            }, //*/
            //*
            { label: `Open Mod Page + Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === modName);
              log('warn', `Found ${modMatch?.id} for ${modName}`);
              let PAGE = ``;
              if (modMatch) {
                const MOD_ID = modMatch.attributes.modId;
                if (MOD_ID !== undefined) {
                  PAGE = `${MOD_ID}?tab=description`;
                }
              }
              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
              util.opn(MOD_PAGE_URL).catch(() => null);
              dismiss();
            }}, //*/
          ]);
        },
      },
    ],
  });
}

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

async function asyncForEachTestVersion(api, requirements) {
  for (let index = 0; index < requirements.length; index++) {
    await testRequirementVersion(api, requirements[index]);
  }
}

async function asyncForEachCheck(api, requirements) {
  let mod = [];
  for (let index = 0; index < requirements.length; index++) {
    mod[index] = await requirements[index].findMod(api);
  }
  let checker = mod.every((entry) => entry !== undefined); //findMod resolves to a mod object or undefined, never a boolean
  return checker;
}

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await asyncForEachTestVersion(api, REQUIREMENTS);
    log('warn', 'Checked requirements versions');
  } catch (err) {
    log('warn', `failed to test requirement version: ${err}`);
  }
}

async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup-notify`;
  const MESSAGE = 'Special Setup Instructions';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `\n`
                + `TEXT HERE.\n`
                + `\n`
                + `TEXT HERE.\n`
                + `\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
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

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  if (setupNotification) setupNotify(api);
  //GAME_VERSION = await setGameVersion(GAME_PATH);
  const requirementsInstalled = await checkForRequirements(api);
  if (!requirementsInstalled) {
    await download(api, REQUIREMENTS);
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
  };
  context.registerGame(game);

  //register mod types
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod installers
  context.registerInstaller(LOADER_ID, 25, testLoader, installLoader);
  context.registerInstaller(MAPS_ID, 26, testMaps, installMaps);
  if (keepZips) {
    context.registerInstaller(MOD_ID, 27, testMod, installModZip); //keep in zips
  } else {
    context.registerInstaller(MOD_ID, 27, testMod, installMod); //unzip
  }
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open override.cfg', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, OVERRIDE_FILE);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
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

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(api, gameId, mods, forced);
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
