/*//////////////////////////////////////////////////////////
Name: XXX Vortex Extension
Structure: Anvil Engine - AnvilToolkit/ForgerPatchManager
Author: ChemBoy1
Version: 0.1.0
Date: 2026-XX-XX
Notes:
-
//////////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//Specify all the information about the game
const UPLAYAPP_ID = "XXX"; //Ubisoft Connect App ID — from SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs\
const STEAMAPP_ID = "XXX"; //https://steamdb.info/app/XXX/
const GOGAPP_ID = null; //not typically available for Ubisoft games
const EPICAPP_ID = null; //not typically available for Ubisoft games
const GAME_ID = "XXX";
const GAME_NAME = "XXX";
const GAME_NAME_SHORT = "XXX";
const EXEC = "XXX.exe";
const PCGAMINGWIKI_URL = "XXX";
const EXTENSION_URL = "XXX"; //Nexus link to this extension. Used for links

const SETTINGS_FILE = 'XXX.ini';

let GAME_PATH = ''; //patched in setup to the discovered game path
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Feature toggles
const hasAtk = true; //true if game supports AnvilToolkit — set to false for games that don't use ATK
const hasForger = false; //true if game supports Forger Patch Manager (.forger2 files) — typically older AC games
const setupNotification = false; //enable to show the user a notification with special instructions on first setup
const allowSymlinks = false; //symlinks can cause issues when repacking with ATK — set to false when hasAtk = true
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions

//Info for mod types and installers
const ROOT_FOLDERS = ["videos"]; //XXX — update to match game (e.g. ["videos", "resources"])
const LOOSE_EXTS = [".data"];

const ATK_ID = `${GAME_ID}-atk`;
const ATK_NAME = "AnvilToolkit";
const ATK_EXEC = 'anviltoolkit.exe';
const ATK_PAGE = 455;
const ATK_FILE = 3699;
const ATK_DOMAIN = 'site';

const EXTRACTED_ID = `${GAME_ID}-extracted`;
const EXTRACTED_NAME = "Extracted Folder";
const EXTRACTED_FOLDER = "Extracted";
const RENAME_FOLDER = "RENAME_ME_TO_FORGE_NAME.forge";

const FORGEFOLDER_ID = `${GAME_ID}-forgefolder`;
const FORGEFOLDER_NAME = ".forge Folder";
const FORGEFOLDER_STRING = ".forge";

const DATAFOLDER_ID = `${GAME_ID}-datafolder`;
const DATAFOLDER_NAME = ".data Folder";
const DATAFOLDER_STRING = ".data";

const LOOSE_ID = `${GAME_ID}-loosedata`;
const LOOSE_NAME = "Loose Data Files";

const FORGE_ID = `${GAME_ID}-forgefile`;
const FORGE_NAME = "Forge Replacement";
const FORGE_EXT = ".forge";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";

//Forger Patch Manager — used when hasForger = true (older AC games)
const FORGER_ID = `${GAME_ID}-forger`;
const FORGER_NAME = "Forger Patch Manager";
const FORGER_EXEC = 'forger.exe';
const FORGERPATCH_ID = `${GAME_ID}-forgerpatch`;
const FORGERPATCH_NAME = "Forger Patch";
const FORGER_EXT = ".forger2";
const FORGER_FOLDER = "ForgerPatches";
const FORGER_PAGE = 42;
const FORGER_FILE = 716;
const FORGER_DOMAIN = "assassinscreedodyssey"; //Forger is hosted on AC Odyssey page

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];
const IGNORE_DEPLOY = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_CONFLICTS = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

let MODTYPE_FOLDERS = [EXTRACTED_FOLDER]; //XXX — add any other folders that need to be writable (e.g. SOUND_PATH)

//filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "compatible": {
      "dinput": false,
      "enb": false,
    },
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "uPlayAppId": UPLAYAPP_ID,
      "supportsSymlinks": allowSymlinks,
      "ignoreDeploy": IGNORE_DEPLOY,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "UPlayAPPId": UPLAYAPP_ID
    }
  },
  "modTypes": [
    {
      "id": EXTRACTED_ID,
      "name": EXTRACTED_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": FORGEFOLDER_ID,
      "name": FORGEFOLDER_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": DATAFOLDER_ID,
      "name": DATAFOLDER_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": LOOSE_ID,
      "name": LOOSE_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": FORGE_ID,
      "name": FORGE_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      UPLAYAPP_ID
    ],
    "names": []
  }
};

//Append ATK mod type when enabled
if (hasAtk) {
  spec.modTypes.push({
    "id": ATK_ID,
    "name": ATK_NAME,
    "priority": "low",
    "targetPath": "{gamePath}"
  });
}

//Append Forger mod types when enabled
if (hasForger) {
  spec.modTypes.push({
    "id": FORGER_ID,
    "name": FORGER_NAME,
    "priority": "low",
    "targetPath": "{gamePath}"
  });
  spec.modTypes.push({
    "id": FORGERPATCH_ID,
    "name": FORGERPATCH_NAME,
    "priority": "high",
    "targetPath": path.join("{gamePath}", FORGER_FOLDER)
  });
}

//3rd party tools and launchers
const tools = [
  /*{
    id: `${GAME_ID}-launchplus`,
    name: "Launch Game Ubisoft Plus",
    logo: `exec.png`,
    executable: () => "XXX_UPP.exe",
    requiredFiles: ["XXX_UPP.exe"],
    detach: true,
    relative: true,
    exclusive: true,
  },
  {
    id: `${GAME_ID}-launchvulkan`,
    name: "Launch Vulkan",
    logo: `exec.png`,
    executable: () => "XXX_vulkan.exe",
    requiredFiles: ["XXX_vulkan.exe"],
    detach: true,
    relative: true,
    exclusive: true,
  }, //*/
  {
    id: `${GAME_ID}-customlaunch`,
    name: "Custom Launch",
    logo: `exec.png`,
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  },
];

//Append ATK tool when enabled
if (hasAtk) {
  tools.push({
    id: ATK_ID,
    name: ATK_NAME,
    logo: 'anvil.png',
    executable: () => ATK_EXEC,
    requiredFiles: [
      ATK_EXEC,
    ],
    relative: true,
    exclusive: true,
  });
}
if (hasForger) {
  tools.push({
    id: FORGER_ID,
    name: FORGER_NAME,
    logo: 'forger.png',
    executable: () => FORGER_EXEC,
    requiredFiles: [
      FORGER_EXEC,
    ],
    relative: true,
    exclusive: true,
  });
}

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch (err) {
    return false;
  }
}

async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch (err) {
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
      if (stats.isDirectory()) {
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else {
        results.push(fullPath);
      }
    }
  } catch (err) {
    log('warn', `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

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

//Find the game installation folder via Ubisoft Connect registry entry
function makeFindGame(api, gameSpec) {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      `SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\${UPLAYAPP_ID}`,
      'InstallDir');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return () => Promise.resolve(instPath.value);
  } catch (err) {
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  }
}

//* Get mod path dynamically
function getModPath(discoveryPath) {
  return MOD_PATH_DEFAULT;
} //*/

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable
function getExecutable(discoveryPath) {
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  GAME_VERSION = 'default';
  return GAME_VERSION;
}

//* Resolve game version for display in Vortex
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
  let version = '0.0.0';
  try {
    const exeVersion = require('exe-version');
    version = exeVersion.getProductVersion(path.join(gamePath, getExecutable(gamePath)));
    return Promise.resolve(version);
  } catch (err) {
    log('error', `Could not read executable file to get game version: ${err}`);
    return Promise.resolve(version);
  }
} //*/

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if AnvilToolkit is installed
function isAnvilInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === ATK_ID);
}

//Function to automatically download AnvilToolkit from Nexus Mods
async function downloadAnvil(api, gameSpec) {
  let isInstalled = isAnvilInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = ATK_NAME;
    const MOD_TYPE = ATK_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = ATK_PAGE;
    const FILE_ID = ATK_FILE;
    const GAME_DOMAIN = ATK_DOMAIN;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try {
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) {
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [URL], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE),
      ];
      util.batchDispatch(api.store, batched);
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Check if Forger Patch Manager is installed
function isForgerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === FORGER_ID);
}

//Function to automatically download Forger Patch Manager from Nexus Mods
//Only called when hasForger = true
async function downloadForger(api, gameSpec) {
  let isInstalled = isForgerInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = FORGER_NAME;
    const MOD_TYPE = FORGER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = FORGER_PAGE;
    const FILE_ID = FORGER_FILE;
    const GAME_DOMAIN = FORGER_DOMAIN;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try {
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) {
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [URL], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE),
      ];
      util.batchDispatch(api.store, batched);
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// MOD INSTALLER FUNCTIONS /////////////////////////////////////////////////////

//Installer test for AnvilToolkit
function testATK(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === ATK_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

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

//Installer install AnvilToolkit
function installATK(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === ATK_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ATK_ID };

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

//Test for "Extracted" folder
function testExtracted(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === EXTRACTED_FOLDER));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install "Extracted" folder
function installExtracted(files) {
  const modFile = files.find(file => (path.basename(file) === EXTRACTED_FOLDER));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: EXTRACTED_ID };

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

//Test for folder with ".forge" in name
function testForgeFolder(files, gameId) {
  const isMod = files.some(file => path.dirname(file).includes(FORGEFOLDER_STRING));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install folder with ".forge" in name — places inside Extracted folder
function installForgeFolder(files) {
  const modFile = files.find(file => path.basename(file).includes(FORGEFOLDER_STRING));
  const MODFILE_IDX = `${path.basename(modFile)}${path.sep}`;
  const idx = modFile.indexOf(MODFILE_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FORGEFOLDER_ID };

  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTRACTED_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for folder with ".data" in name
function testDataFolder(files, gameId) {
  const isMod = files.some(file => path.dirname(file).includes(DATAFOLDER_STRING));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install folder with ".data" in name — places inside Extracted/RENAME_ME folder, notifies user to rename
function installDataFolder(api, files, fileName) {
  const modFile = files.find(file => path.basename(file).includes(DATAFOLDER_STRING));
  const MODFILE_IDX = `${path.basename(modFile)}${path.sep}`;
  const idx = modFile.indexOf(MODFILE_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATAFOLDER_ID };

  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTRACTED_FOLDER, RENAME_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  renamingRequiredNotify(api, fileName);
  return Promise.resolve({ instructions });
}

//Test for loose .data files
function testLoose(files, gameId) {
  const isMod = files.some(file => LOOSE_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install loose .data files — places inside Extracted/RENAME_ME folder, notifies user to rename
function installLoose(api, files, fileName) {
  const modFile = files.find(file => LOOSE_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOOSE_ID };

  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTRACTED_FOLDER, RENAME_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  renamingRequiredNotify(api, fileName);
  return Promise.resolve({ instructions });
}

//Test for .forge replacement files
function testForge(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === FORGE_EXT));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install .forge replacement files
function installForge(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === FORGE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FORGE_ID };

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

//Test for root folder files (e.g. videos, resources)
function testRoot(files, gameId) {
  const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install root folder files
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

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

//Fallback installer — catches anything not handled above
function testFallback(files, gameId) {
  let supported = (gameId === spec.game.id);

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

//Fallback installer — installs to root, notifies user
function installFallback(api, files, fileName) {
  fallbackInstallerNotify(api, fileName);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };
  const filtered = files.filter(file => (!file.endsWith(path.sep)));
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: file,
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for Forger Patch Manager installer files — only used when hasForger = true
function testForger(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === FORGER_EXEC);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install Forger Patch Manager — only used when hasForger = true
function installForger(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === FORGER_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FORGER_ID };

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

//Test for .forger2 patch files — only used when hasForger = true
function testForgerPatch(files, gameId) {
  const isMod = files.some(file => path.extname(file).toLowerCase() === FORGER_EXT);
  let supported = (gameId === spec.game.id) && isMod;

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

//Install .forger2 patch files — only used when hasForger = true
function installForgerPatch(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === FORGER_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FORGERPATCH_ID };

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

// MAIN FUNCTIONS //////////////////////////////////////////////////////////////

//Notify user that folder renaming is required for .data folder mods
function renamingRequiredNotify(api, fileName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  const MOD_NAME = path.basename(fileName).replace(/(.installing)*(.zip)*(.rar)*(.7z)*/gi, '');
  const NOTIF_ID = `${GAME_ID}-installerrenamingrequired`;
  const MESSAGE = `MANUAL FOLDER RENAMING REQUIRED FOR ${MOD_NAME}`;
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
            text: `You've just installed a mod with loose ".data" files or a folder name containing ".data" without a .forge folder above it. The affected mod is shown below.\n`
              + `\n`
              + `${MOD_NAME}.\n`
              + `\n`
              + `Because the mod author did not package the mod in the correct folder structure, you must manually rename folders in the mod Staging Folder. Pick one of the methods below to rename the folder.\n`
              + `\n`
              + `Check the mod page description to determine what the correct "FORGE_FILE_NAME" should be. You can use the "Open Mod Page" button below. This notification will remain active after opening the mod page.\n`
              + `\n`
              + `EASY MODE: Click the "Show Folder Rename Dialog" button below to open a dialog popup to rename the .forge folder.\n`
              + `\n`
              + `ADVANCED MODE:\n`
              + ` 1. Open the Staging Folder with the button below and rename the folder as indicated.\n`
              + ` 2. Deploy mods in Vortex.\n`
              + ` 3. You will get an "External Changes" popup in Vortex after doing this. Select "Save change (delete file)".\n`
              + `\n`
              + `The correct structure is:  Extracted\\FORGE_FILE_NAME.forge\\DATA_FILE.data.\n`
              + `The .forge folder is already in place for you to rename.\n`
              + `\n`
          }, [
            { label: `Open Mod Page`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
              log('warn', `Found ${modMatch?.id} for ${MOD_NAME}`);
              let PAGE = ``;
              if (modMatch) {
                const MOD_ID = modMatch.attributes.modId;
                if (MOD_ID !== undefined) {
                  PAGE = `${MOD_ID}?tab=description`;
                }
              }
              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
              util.opn(MOD_PAGE_URL).catch(() => null);
            }},
            { label: `Show Folder Rename Dialog`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
              if (!modMatch) {
                api.showErrorNotification('Cannot rename folder. You must rename the folder manually.', undefined, { allowReport: false });
                dismiss();
              } else {
                folderRenameDialog(api, modMatch);
                dismiss();
              }
            }},
            { label: `Open Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, MOD_NAME)).catch(() => null);
              dismiss();
            }},
            { label: 'Close', action: () => dismiss() },
          ]);
        },
      },
    ],
  });
}

const RENAME_INPUT_ID = `${GAME_ID}-forgefolderrenameinput`;

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

async function folderRenameDialog(api, mod) {
  return api.showDialog('question', 'Rename .forge Folder', {
    text: api.translate(`Enter the correct .forge folder name for ${mod.name}:`),
    input: [
      {
        id: RENAME_INPUT_ID,
        label: 'For',
        type: 'text',
        placeholder: RENAME_FOLDER,
      }
    ],
  }, [{ label: 'Cancel' }, { label: 'Rename', default: true }])
  .then(result => {
    if (result.action === 'Rename') {
      let name = result.input[RENAME_INPUT_ID];
      if (name === undefined) {
        name = RENAME_FOLDER;
      }
      name = name.trim();
      if (!name.endsWith('.forge')) {
        name = name + '.forge';
      }
      if (name === '.forge' || name === RENAME_FOLDER) {
        api.showErrorNotification('Invalid name entered for .forge folder. You will have to rename the folder manually.', undefined, { allowReport: false });
        return Promise.resolve();
      }
      const state = api.getState();
      STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
      const FOLDER_PATH = path.join(STAGING_FOLDER, mod.installationPath, EXTRACTED_FOLDER);
      const EXISTING = path.join(FOLDER_PATH, RENAME_FOLDER);
      const NEW = path.join(FOLDER_PATH, name);
      rename(api, EXISTING, NEW);
    }
    return Promise.resolve();
  })
  .catch(err => {
    api.showErrorNotification('Failed to rename .forge folder. You will have to rename the folder manually.', err, { allowReport: false });
    return Promise.resolve();
  });
}

async function rename(api, EXISTING, NEW) {
  await purge(api);
  try {
    fs.statSync(EXISTING);
    await fs.renameAsync(EXISTING, NEW);
  }
  catch (err) {
    api.showErrorNotification('Failed to rename .forge folder. You will have to rename the folder manually.', err, { allowReport: false });
    return Promise.resolve();
  }
  await deploy(api);
  return Promise.resolve();
}

//Notify user that fallback installer was reached
function fallbackInstallerNotify(api, modName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, spec.game.id);
  modName = path.basename(modName, '.installing');
  const id = modName.replace(/[^a-zA-Z0-9\s]*( )*/gi, '').slice(0, 20);
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
            },
            {
              label: 'Open Staging Folder', action: () => {
                util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
                dismiss();
              }
            },
            { label: `Open Mod Page`, action: () => {
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
            }},
          ]);
        },
      },
    ],
  });
}

//Notify user to run the active deploy tool(s) after deployment
function deployNotify(api) {
  if (!hasAtk && !hasForger) return;
  const hasBoth = hasAtk && hasForger;
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MESSAGE = hasBoth
    ? `Run ATK and Forger to Apply Changes`
    : hasAtk
      ? `Run ATK to Repack .forge Files`
      : `Run Forger to Apply Patches`;
  const DETAIL_TEXT = hasBoth
    ? `After installing mods, run ${ATK_NAME} first to repack mods into the game's .forge data files, then run ${FORGER_NAME} to apply any Forger patches.\n`
    + `Use the included tools to launch them (buttons on notification or in the "Dashboard" tab).\n`
    + `Read your mod's instructions to determine which .forge file(s) to unpack and repack.\n`
    + `The folder structure for ATK mods should look something like this: "Extracted/{FORGE_FILE_NAME}.forge/{DATA_FILE}.data".\n`
    : hasAtk
      ? `For some mods, you must use ${ATK_NAME} to pack mods into the game's .forge data files after installing with Vortex.\n`
      + `Use the included tool to launch ${ATK_NAME} (button on notification or in "Dashboard" tab).\n`
      + `Read your mod's instructions to determine which .forge file(s) to unpack and repack.\n`
      + `You may need to do some manual folder manipulation in the mod staging folder if the extension could not do it for your mod.\n`
      + `Right click on the mod in the "Mods" tab to open the mod's staging folder and verify the folder structure is correct.\n`
      + `The folder structure should look something like this: "Extracted/{FORGE_FILE_NAME}.forge/{DATA_FILE}.data".\n`
      : `For Forger patch mods, you must use ${FORGER_NAME} to apply patches after installing with Vortex.\n`
      + `Use the included tool to launch ${FORGER_NAME} (button on notification or in "Dashboard" tab).\n`
      + `Read your mod's instructions for any additional steps required.\n`;
  const notifActions = [];
  if (hasAtk) notifActions.push({
    title: `Run ${ATK_NAME}`,
    action: (dismiss) => { runDeployTool(api, ATK_ID, ATK_NAME); dismiss(); },
  });
  if (hasForger) notifActions.push({
    title: `Run ${FORGER_NAME}`,
    action: (dismiss) => { runDeployTool(api, FORGER_ID, FORGER_NAME); dismiss(); },
  });
  notifActions.push({
    title: 'More',
    action: (dismiss) => {
      const dialogButtons = [];
      if (hasAtk) dialogButtons.push({ label: `Run ${ATK_NAME}`, action: () => { runDeployTool(api, ATK_ID, ATK_NAME); dismiss(); } });
      if (hasForger) dialogButtons.push({ label: `Run ${FORGER_NAME}`, action: () => { runDeployTool(api, FORGER_ID, FORGER_NAME); dismiss(); } });
      dialogButtons.push({ label: 'Continue', action: () => dismiss() });
      dialogButtons.push({ label: 'Never Show Again', action: () => { api.suppressNotification(NOTIF_ID); dismiss(); } });
      api.showDialog('question', MESSAGE, { text: DETAIL_TEXT }, dialogButtons);
    },
  });
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: notifActions,
  });
}

//Launch a deploy tool from Vortex
function runDeployTool(api, toolId, toolName) {
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', toolId], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false })
        .catch(err => api.showErrorNotification(`Failed to run ${toolName}`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    } else {
      return api.showErrorNotification(`Failed to run ${toolName}`, `Path to ${toolName} executable could not be found. Ensure ${toolName} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${toolName}`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}

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

//Setup function — runs when the game is first discovered
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  if (setupNotification) {
    setupNotify(api);
  }
  if (hasAtk) await downloadAnvil(api, gameSpec);
  if (hasForger) {
    await downloadForger(api, gameSpec);
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
    queryModPath: getModPath(),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    getGameVersion: resolveGameVersion,
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
  if (hasAtk) {
    context.registerInstaller(ATK_ID, 25, testATK, installATK);
    context.registerInstaller(EXTRACTED_ID, 27, testExtracted, installExtracted);
    context.registerInstaller(FORGEFOLDER_ID, 29, testForgeFolder, installForgeFolder);
    context.registerInstaller(DATAFOLDER_ID, 31, testDataFolder, (files, fileName) => installDataFolder(context.api, files, fileName));
    context.registerInstaller(LOOSE_ID, 33, testLoose, (files, fileName) => installLoose(context.api, files, fileName));
  }
  context.registerInstaller(FORGE_ID, 35, testForge, installForge);
  context.registerInstaller(ROOT_ID, 37, testRoot, installRoot);
  if (hasForger) {
    context.registerInstaller(FORGER_ID, 41, testForger, installForger);
    context.registerInstaller(FORGERPATCH_ID, 43, testForgerPatch, installForgerPatch);
  }
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register actions
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Settings INI', () => {
    util.opn(SETTINGS_FILE).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open PCGamingWiki Page', () => {
    util.opn(PCGAMINGWIKI_URL).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    util.opn(path.join(__dirname, 'CHANGELOG.md')).catch(() => null);
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    util.opn(DOWNLOAD_FOLDER).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    const api = context.api;
    // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
