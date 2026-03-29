/*///////////////////////////////////////////
Name: Crimson Desert Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.2.2
Date: 2026-03-27
Notes:
- Supports plugin mods and data mods with "00XX" folders
- Supports Crimson Browser (manifest.json and files folder), CD Mod Manager (.cdmod), and JSON Mod Manager (.json) mods
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');
//const fsPromises = require('fs/promises'); //.rm() for recursive folder deletion
//const fsExtra = require('fs-extra');
const winapi = require('winapi-bindings');
//const turbowalk = require('turbowalk');

/*const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow'); //*/
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "crimsondesert";
const STEAMAPP_ID = "3321460"; //https://steamdb.info/app/3321460/depots/
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = "0230d0150e9f45d49dce401e1103c9fc"; // https://egdata.app/offers/93fa632bf25b4361abb3a79c86e3f822/builds
const GOGAPP_ID = null;
const XBOXAPP_ID = "XXX"; //not on Game Pass. Cannot get info
const XBOXEXECNAME = "XXX";
const XBOX_PUB_ID = ""; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Crimson Desert";
const GAME_NAME_SHORT = "Crimson Desert";
const BINARIES_PATH = 'bin64';
const EXEC_NAME = "CrimsonDesert.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const EXEC_EGS = EXEC; //change other versions if different than Steam/default
const EXEC_GOG = EXEC;
const EXEC_DEMO = EXEC;
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Crimson_Desert";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1746"; //Nexus link to this extension. Used for links
//for finding install in registry - requires winapi-bindings
const INSTALL_HIVE = 'HKEY_LOCAL_MACHINE'; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\XXX\\XXX`; //fill in path
const INSTALL_VALUE = "XXX"; //often InstallDir or InstallPath
const RESHADE_URL = "https://reshade.me/#download";

//feature toggles
const loadOrder = false; //true if game needs a load order
const hasLoader = false; //true if game needs a mod loader
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const needsModInstaller = true; //set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing
const rootInstaller = true; //enable root installer. Set false if you need to avoid installer collisions
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const hasUserIdFolder = true; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
const debug = false; //toggle for debug mode
const binariesInstaller = true; //only enable Binaries installer if not in root

//info for modtypes, installers, tools, and actions
const ROOT_FOLDERS = [BINARIES_PATH];
const BINARIES_EXTS = [".dll", ".asi"];

const CONFIGMOD_LOCATION = LOCALAPPDATA;
const SAVEMOD_LOCATION = LOCALAPPDATA;
const APPDATA_FOLDER = path.join('Pearl Abyss', 'CD');
const CONFIG_FOLDERNAME = 'save';
const SAVE_FOLDERNAME = 'save';

let GAME_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';
const EXEC_XBOX = 'gamelaunchhelper.exe';

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Data Mod";
const MOD_PATH = ".";
const MOD_EXTS = ['.paz', '.pamt'];
const META_FILE_EXTS = ['.papgt', '.pathc', '.paver'];
const METADATA_FILE = path.join('meta', '0.papgt'); //This seems to require updating for each mod. Need a community tool to run on deploy.
/*Test for naming mod folders
const VANILLA_ENDING_FOLDERNAME = '0035';
const FOLDER_INDEX = +VANILLA_ENDING_FOLDERNAME;
log('warn', `FOLDER_INDEX: ${FOLDER_INDEX}`);
const FOLDER_NAME = util.pad(FOLDER_INDEX, '0', VANILLA_ENDING_FOLDERNAME.length);
log('warn', `FOLDER_NAME: ${FOLDER_NAME}`);
const MOD_STARTING_INDEX = +VANILLA_ENDING_FOLDERNAME + 1; //Naming folders subsequent will load the mod data after vanilla, so you don't have to repack the ENTIRE game file.
//*/
const DATA_FOLDERS = ['meta',
  '0000', 
  '0001', 
  '0002', 
  '0003',
  '0004',
  '0005',
  '0006',
  '0007',
  '0008',
  '0009',
  '0010',
  '0011',
  '0012',
  '0013',
  '0014',
  '0015',
  '0016',
  '0017',
  '0018',
  '0019',
  '0020',
  '0021',
  '0022',
  '0023',
  '0024',
  '0025',
  '0026',
  '0027',
  '0028',
  '0029',
  '0030',
  '0031',
  '0032',
  '0033',
  '0034',
  '0035',
  //'0036', //this folder is used by patch mods, so we don't want to put it in root
];

// tool info (i.e. save editor)
const BROWSER_ID = `${GAME_ID}-browser`;
const BROWSER_NAME = "Crimson Browser";
const BROWSER_PY = 'crimson_browser.py';
const BROWSER_BAT = 'run_mod_manager.bat';
const BROWSER_PAGE_NO = 84;
const BROWSER_FILE_NO = 355;
const BROWSER_DOMAIN = GAME_ID;

const BROWSER_CONFIG_FILE = 'config.txt';
const BROWSER_REQ_FILE = 'requirements.txt';
const BROWSER_CONFIG_STRING = 'archives_path=';
const PYTHON_URL = 'https://www.python.org/downloads/';
const PYTHON_MIN_VER = 3.10;

const CD_MANAGER_ID = `${GAME_ID}-cdmanager`;
const CD_MANAGER_NAME = "CD Mod Manager";
const CD_MANAGER_EXEC = 'CDModManager.exe';
const CD_MANAGER_PAGE_NO = 114;
const CD_MANAGER_FILE_NO = 292;
const CD_MANAGER_DOMAIN = GAME_ID;

const JSON_MANAGER_ID = `${GAME_ID}-jsonmanager`;
const JSON_MANAGER_NAME = "JSON Mod Manager";
const JSON_MANAGER_EXEC = 'CD Mod Manager.exe';
const JSON_MANAGER_PAGE_NO = 113;
const JSON_MANAGER_FILE_NO = 324;
const JSON_MANAGER_DOMAIN = GAME_ID;

const QT_MANAGER_ID = `${GAME_ID}-qtmanager`;
const QT_MANAGER_NAME = "QT Mod Manager";
const QT_MANAGER_EXEC = 'QT_ModManager.exe';
const QT_MANAGER_PAGE_NO = 218;
const QT_MANAGER_FILE_NO = 504;
const QT_MANAGER_DOMAIN = GAME_ID;

const ULTIMATE_MANAGER_ID = `${GAME_ID}-ultimatemanager`;
const ULTIMATE_MANAGER_NAME = "Ultimate Mod Manager";
const ULTIMATE_MANAGER_EXEC = 'CrimsonDesertModManager.exe';  //not actual name since naked exe - will not support
const ULTIMATE_MANAGER_PAGE_NO = 207;
const ULTIMATE_MANAGER_FILE_NO = 766;
const ULTIMATE_MANAGER_DOMAIN = GAME_ID;

const UNPACKER_ID = `${GAME_ID}-unpacker`;
const UNPACKER_NAME = "Unpacker";
const UNPACKER_EXEC = 'PazGui.exe';
const UNPACKER_PAGE_NO = 62;
const UNPACKER_FILE_NO = 138;
const UNPACKER_DOMAIN = GAME_ID;

const SAVE_EDITOR_ID = `${GAME_ID}-saveeditor`;
const SAVE_EDITOR_NAME = "Save Editor";
const SAVE_EDITOR_EXEC = 'CrimsonSaveEditor.exe';
const SAVE_EDITOR_PAGE_NO = 20;
const SAVE_EDITOR_FILE_NO = 314;
const SAVE_EDITOR_DOMAIN = GAME_ID;

const TOOLS_ID = `${GAME_ID}-tools`;
const TOOLS_NAME = "Tools";
const KNOWN_TOOLS_FILES = [
  UNPACKER_EXEC,
  BROWSER_PY,
  CD_MANAGER_EXEC,
  JSON_MANAGER_EXEC,
  QT_MANAGER_EXEC,
  //ULTIMATE_MANAGER_EXEC,
  SAVE_EDITOR_EXEC,
];

//Crimson Browser mods
const BROWSER_MOD_ID = `${GAME_ID}-browsermod`;
const BROWSER_MOD_NAME = "Crimson Browser Mod";
const BROWSER_MOD_PATH = 'mods';
const BROWSER_MOD_MANIFEST = 'manifest.json';
const BROWSER_MOD_FOLDER = 'files';
const BROWSER_MOD_FILES = [BROWSER_MOD_MANIFEST, BROWSER_MOD_FOLDER];

//patch mods - multiple mod managers
//don't really NEED an external manager. Just a script to run on deploy to patch the meta\0.papgt file
const PATCH_MOD_ID = `${GAME_ID}-patchmod`;
const PATCH_MOD_NAME = "Patch Mod";
const PATCH_MOD_FOLDER = 'mods';
const PATCH_MOD_PATH = PATCH_MOD_FOLDER;
const PATCH_MOD_FILES = ['modinfo.json'];
const PATCH_MOD_EXTS = ['.json', '.cdmod'];

//Mod type to use with future Vortex built-in LO and patch on deploy
const VORTEX_MOD_ID = `${GAME_ID}-vortexmod`;
const VORTEX_MOD_NAME = "Vortex Mod";
const VORTEX_MOD_FOLDER = '.';
const VORTEX_MOD_PATH = VORTEX_MOD_FOLDER;

//DISABLED for now - reserved for a runtime or script patcher that updates the meta\0.papgt file
const LOADER_ID = `${GAME_ID}-loader`;
const LOADER_NAME = "Mod Loader";
const LOADER_PATH = '.';
const LOADER_FILE = 'XXX.dll'; //probably a dll or python script
const LOADER_PAGE_NO = 0;
const LOADER_FILE_NO = 0;
const LOADER_DOMAIN = GAME_ID;
const LOADER_URL = `XXX`; //if not on Nexus

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, APPDATA_FOLDER, SAVE_FOLDERNAME);
let USERID_FOLDER = "";
if (hasUserIdFolder) {
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
  } catch(err) {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  }
}
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_EXTS = [".save"];
const SAVE_FILES = ["slot0"];

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(CONFIGMOD_LOCATION, APPDATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_FILES = ["user_engine_option_save.xml"];

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [BINARIES_PATH, PATCH_MOD_PATH];
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];

//filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    //"parameters": PARAMETERS, //commented out by default to avoid passing empty string parameter
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
    }, //*/
    {
      "id": BROWSER_MOD_ID,
      "name": BROWSER_MOD_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", BROWSER_MOD_PATH)
    }, //*/
    {
      "id": PATCH_MOD_ID,
      "name": PATCH_MOD_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", PATCH_MOD_PATH)
    }, //*/
    {
      "id": VORTEX_MOD_ID,
      "name": VORTEX_MOD_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", VORTEX_MOD_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": TOOLS_ID,
      "name": TOOLS_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};
//think of a way to tell if the mod path is not in the game folder, only add ROOT modType if it is
if (binariesInstaller) {
  spec.modTypes.push({
    "id": BINARIES_ID,
    "name": BINARIES_NAME,
    "priority": "high",
    "targetPath": path.join("{gamePath}", BINARIES_PATH)
  });
}

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
    detach: true,
    //defaultPrimary: true,
    parameters: PARAMETERS,
  }, //*/
  {
    id: BROWSER_ID,
    name: BROWSER_NAME,
    logo: 'browser.png',
    executable: () => BROWSER_BAT,
    requiredFiles: [
      BROWSER_PY,
      BROWSER_BAT,
    ],
    relative: true,
    exclusive: false,
    shell: true,
    //parameters: ['--mod-manager'],
  }, //*/
  /*{
    id: CD_MANAGER_ID,
    name: CD_MANAGER_NAME,
    logo: 'cdmanager.png',
    executable: () => CD_MANAGER_EXEC,
    requiredFiles: [
      CD_MANAGER_EXEC,
    ],
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: [],
  }, //*/
  {
    id: JSON_MANAGER_ID,
    name: JSON_MANAGER_NAME,
    logo: 'jsonmanager.png',
    executable: () => JSON_MANAGER_EXEC,
    requiredFiles: [
      JSON_MANAGER_EXEC,
    ],
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: [],
  }, //*/
  {
    id: QT_MANAGER_ID,
    name: QT_MANAGER_NAME,
    logo: 'qtmanager.png',
    executable: () => QT_MANAGER_EXEC,
    requiredFiles: [
      QT_MANAGER_EXEC,
    ],
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: [],
  }, //*/
  /*{
    id: ULTIMATE_MANAGER_ID,
    name: ULTIMATE_MANAGER_NAME,
    logo: 'ultimatemanager.png',
    executable: () => ULTIMATE_MANAGER_EXEC,
    requiredFiles: [
      ULTIMATE_MANAGER_EXEC,
    ],
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: [],
  }, //*/
  {
    id: UNPACKER_ID,
    name: UNPACKER_NAME,
    logo: 'unpacker.png',
    executable: () => UNPACKER_EXEC,
    requiredFiles: [
      UNPACKER_EXEC,
    ],
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: [],
  }, //*/
  {
    id: SAVE_EDITOR_ID,
    name: SAVE_EDITOR_NAME,
    logo: 'saveeditor.png',
    executable: () => SAVE_EDITOR_EXEC,
    requiredFiles: [
      SAVE_EDITOR_EXEC,
    ],
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: [],
  }, //*/
];

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

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 30,
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
  /*using registry - requires winapi-bindings
  try {
    const instPath = winapi.RegGetValue(
      INSTALL_HIVE,
      INSTALL_KEY,
      INSTALL_VALUE
    );
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return () => Promise.resolve(instPath.value);
  } catch (err) { //*/
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  //}
} //*/

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
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return EXEC_XBOX;
  };
  //add GOG/EGS/Demo versions here if needed
  GAME_VERSION = 'default';
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  const CHECK = await statCheckAsync(gamePath, EXEC_XBOX);
  if (CHECK) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  } else {
    GAME_VERSION = 'default';
    return GAME_VERSION;
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

async function purge(api) { //useful to clear out mods prior to doing some action
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) { //useful to deploy mods after doing some action
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for mod loader files
function testLoader(files, gameId) {
  const isMod = files.some(file => path.basename(file) === LOADER_FILE);
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

//Install mod loader files
function installLoader(files) {
  const MOD_TYPE = LOADER_ID;
  const modFile = files.find(file => path.basename(file) === LOADER_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

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

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file)));
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

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

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

//Test for Unpacker files
function testTools(files, gameId) {
  const isMod = files.some(file => KNOWN_TOOLS_FILES.includes(path.basename(file)));
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

//Install Unpacker files
function installTools(files) {
  const MOD_TYPE = TOOLS_ID;
  const modFile = files.find(file => KNOWN_TOOLS_FILES.includes(path.basename(file)));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

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

//Test for Crimson Browser mod files
function testBrowserMod(files, gameId) {
  const isJson = files.some(file => path.basename(file).toLowerCase() === BROWSER_MOD_MANIFEST); //manifest.json
  const isFolder = files.some(file => path.basename(file).toLowerCase() === BROWSER_MOD_FOLDER); //"files" folder
  let supported = (gameId === spec.game.id) && ( isJson && isFolder );

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

//Install Crimson Browser mod files
function installBrowserMod(files, fileName) {
  const MOD_TYPE = BROWSER_MOD_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  let modFile = files.find(file => path.basename(file).toLowerCase() === BROWSER_MOD_MANIFEST);
  let rootPath = path.dirname(modFile);
  //*
  let folder = path.basename(fileName).replace('.installing', '');
  //??? Read manifest.json to get folder name???
  const ROOT_PATH = path.basename(rootPath);
  if (ROOT_PATH !== '.') {
    folder = ''; //no folder needed if already present
    modFile = rootPath; //make the folder the targeted modFile so we can grab any other folders also in its directory
    rootPath = path.dirname(modFile);
    //const indexFolder = path.basename(modFile);
    //idx = modFile.indexOf(`${indexFolder}${path.sep}`);  //index on the folder with path separator
  } //*/
  const idx = modFile.indexOf(path.basename(modFile));

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(folder, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for patch mod files
function testPatchMod(files, gameId, archivePath) {
  const isMod = files.some(file => PATCH_MOD_FILES.includes(path.basename(file).toLowerCase())); //modinfo.json
  const isFolder = files.some(file => ( //i.e. "0036" folder
    path.basename(file).startsWith('00')
    && path.basename(file).length === 4
    && parseFloat(path.basename(file).replace('00', '')) > 35
    //&& isDir(archivePath, file)
  )); //*/
  let supported = (gameId === spec.game.id) && ( isFolder );

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

//*Install patch mod files - SIMPLE VERSION
function installPatchMod(api, files, fileName) {
  const MOD_TYPE = PATCH_MOD_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  //let modFile = files.find(file => PATCH_MOD_FILES.includes(path.basename(file).toLowerCase())); //modinfo.json
  let modFile = files.find(file => ( //i.e. "0036" folder
    path.basename(file).startsWith('00')
    && path.basename(file).length === 4
    && parseFloat(path.basename(file).replace('00', '')) > 35
    //&& isDir(archivePath, file)
  )); //*/
  let rootPath = path.dirname(modFile);
  //*
  let folder = path.basename(fileName).replace('.installing', '');
  //??? Read modinfo.json to get folder name???
  const ROOT_PATH = path.basename(rootPath);
  if (ROOT_PATH !== '.') {
    folder = ''; //no folder needed if already present
    modFile = rootPath; //make the folder the targeted modFile so we can grab any other folders also in its directory
    rootPath = path.dirname(modFile);
    //const indexFolder = path.basename(modFile);
    //idx = modFile.indexOf(`${indexFolder}${path.sep}`);  //index on the folder with path separator
  } //*/
  const idx = modFile.indexOf(path.basename(modFile));

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(folder, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
} //*/

//Test for json mod files
function testJsonMod(files, gameId) {
  const isModInfo = files.some(file => PATCH_MOD_FILES.includes(path.basename(file).toLowerCase())); //modinfo.json
  const isJson = files.some(file => path.extname(file).toLowerCase() === '.json');
  const isFolder = files.some(file => ( //i.e. "0036" folder
    path.basename(file).startsWith('00')
    && path.basename(file).length === 4
    //&& isDir(archivePath, file)
  )); //*/
  let supported = (gameId === spec.game.id) && ( !isModInfo && isJson && !isFolder );

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


//Install patch mod files - file selection popup
async function installJsonMod(api, files) {
  const fileExt = PATCH_MOD_EXTS;
  const modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
  const modType = {
    type: 'setmodtype',
    value: PATCH_MOD_ID,
  };
  const installFiles = (modFiles.length > 1)
    ? await chooseFilesToInstall(api, modFiles, fileExt)
    : modFiles;
  let instructions = installFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.basename(file)
    };
  });
  instructions.push(modType);
  return Promise.resolve({ instructions });
} //*/

async function chooseFilesToInstall(api, files, fileExt) {
  const t = api.translate;
  return api.showDialog('question', t('Multiple {{ext}} files', { replace: { ext: path.extname(files[0]) } }), {
      text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: path.extname(files[0]) } }) +
          `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
      checkboxes: files.map((file) => {
          return {
              id: file,
              text: file,
              value: false
          };
      })
  }, [
      { label: 'Cancel' },
      { label: 'Install Selected' },
      { label: 'Install All_plural' }
  ]).then((result) => {
      if (result.action === 'Cancel')
          return Promise.reject(new util.UserCanceled('User cancelled.'));
      else {
        const installAll = (result.action === 'Install All' || result.action === 'Install All_plural');
        const installFiles = installAll ? files : Object.keys(result.input).filter(s => result.input[s])
          .map(file => files.find(f => f === file));
        return installFiles;
      }
  });
}

//Test for data mod files
function testVortex(files, gameId) {
  //const isMod = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  //const isMeta = files.some(file => META_FILE_EXTS.includes(path.extname(file).toLowerCase()));
  const isFolder = files.some(file => ( //i.e. "0036" folder
    path.basename(file).startsWith('00')
    && path.basename(file).length === 4
    //&& isDir(archivePath, file)
  ));
  let supported = (gameId === spec.game.id) && ( isFolder );

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

//Install data mod files using Vortex load order and metadata patch on deploy
function installVortex(files) {
  const MOD_TYPE = VORTEX_MOD_ID;
  let folder = '';
  let modFile = files.findfiles.some(file => { //i.e. "0036" folder
    path.basename(file).startsWith('00')
    && path.basename(file).length === 4
    //&& isDir(archivePath, file)
  });
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(folder, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for data mod files
function testMod(files, gameId) {
  //const isMod = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  //const isMeta = files.some(file => META_FILE_EXTS.includes(path.extname(file).toLowerCase()));
  const isFolder = files.some(file => DATA_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && ( isFolder );

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

//Install data mod files
function installMod(files) {
  const MOD_TYPE = MOD_ID;
  let folder = '';
  let modFile = files.find(file => DATA_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(folder, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Fallback installer to Binaries folder
function testBinaries(files, gameId) {
  const isMod = files.some(file => BINARIES_EXTS.includes(path.extname(file).toLowerCase()));
  const isExe = files.some(file => path.extname(file).toLowerCase() === '.exe');
  let supported = (gameId === spec.game.id) && ( isMod && !isExe );

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

//Fallback installer to Binaries folder
function installBinaries(files) {
  const MOD_TYPE = BINARIES_ID;
  const modFile = files.find(file => BINARIES_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  
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
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };
  
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
  //instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

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
                + `IF THE MOD YOU INSTALLED IS A RESHADE PRESET: You must download ReShade, run the installer, and select the preset\'s .ini file to activate the preset. The preset .ini will be found in the game folder or a subfolder of it.\n`
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
            {
              label: 'Open Staging Folder', action: () => {
                util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
                dismiss();
              }
            }, //*/
            //*
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
              util.opn(MOD_PAGE_URL).catch(err => undefined);
              //dismiss();
            }}, //*/
            {
              label: 'Download ReShade', action: () => {
                util.opn(RESHADE_URL).catch(() => null);
                dismiss();
              }
            }, //*/
          ]);
        },
      },
    ],
  });
}

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if mod loader is installed
function isLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LOADER_ID);
}

//Check if Crimson Browser is installed
async function isBrowserInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === BROWSER_ID);
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      await fs.statAsync(path.join(GAME_PATH, BROWSER_PY));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

async function isPythonInstalled(api) {
  const version = PYTHON_MIN_VER;
  let keys = undefined;
  try {
    const buffer = winapi.WithRegOpen( //array of objects with values.type and values.key
      'HKEY_LOCAL_MACHINE',
      'SOFTWARE\\Python\\PythonCore',
      (hkey) => { //have to enum in the callback - https://github.com/Nexus-Mods/node-winapi-bindings/blob/master/index.d.ts
        keys = winapi.RegEnumKeys(hkey); //array of objects with values.class, values.key, values.lastWritten
      }
    );
    if (!keys) {
      return false; //assume not installed if key not found
    }
    keys = keys.map(key => key.key); //map array to only keys
    keys = keys.map(key => parseFloat(key)); //convert to number
    log('warn', `Python versions found: ${keys.join(', ')}`);
    const found = keys.some(key => (key >= version)); //find entry starting with correct version number
    if (found) {
      return true;
    } else {
      return false;
    }
  } catch (err) { //*/
    return false;
  }
}

function pythonNotify(api) {
  const NOTIF_ID = `${GAME_ID}-pythonnotify`;
  const MESSAGE = `Python ${PYTHON_MIN_VER}+ is required to install Crimson Browser dependencies. Please install Python and try again.`;
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
                + `Python ${PYTHON_MIN_VER}+ is required to install Crimson Browser dependencies. Please install Python and try again.\n`
                + `\n`
                + `You can open the Python download site in your browser by clicking the button below.\n`
                + `\n`
          }, [
            { label: 'Continue', action: () => dismiss() },
            {
              label: 'Open Python Download Page', action: () => {
                util.opn('https://www.python.org/downloads/').catch(() => null);
                dismiss();
              }
            },
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

//Run setup  for Crimson Browser
async function setupBrowser(api) {
  GAME_PATH = getDiscoveryPath(api);
  let success1 = false;
  let success2 = false;
  try { //install dependencies
    const test = await isPythonInstalled(api);
    if (!test) {
      pythonNotify(api);
      throw new util.UserCanceled();
    }
    const REQ_PATH = path.join(GAME_PATH, BROWSER_REQ_FILE);
    await fs.statAsync(REQ_PATH);
    await api.runExecutable('pip', [`install -r "${REQ_PATH}"`], { shell: true, detached: true })
    //log('warn', `Installed ${BROWSER_NAME} python dependencies`);
    success1 = true;
  } catch (err) {
    api.showErrorNotification(`Could not install ${BROWSER_NAME} dependencies. See mod page for manual instructions.`, err, { allowReport: false });
  }
  try { //write game path to config file
    const newLine = `${BROWSER_CONFIG_STRING}${GAME_PATH}`;
    await fs.statAsync(path.join(GAME_PATH, BROWSER_CONFIG_FILE));
    let data = await fs.readFileAsync(path.join(GAME_PATH, BROWSER_CONFIG_FILE), 'utf8');
    let dataSplit = data.split('\n');
    const idx = dataSplit.findIndex(line => line.startsWith(BROWSER_CONFIG_STRING));
    if (idx === -1) {
      throw new util.UserCanceled();
    }
    //log('warn', `config file index: ${idx}`);
    dataSplit[idx] = newLine;
    data = dataSplit.join('\n');
    await fs.writeFileAsync(path.join(GAME_PATH, BROWSER_CONFIG_FILE), data);
    //log('warn', `Added game path to ${BROWSER_NAME} config file`);
    success2 = true;
  } catch (err) {
    api.showErrorNotification(`Could not add game path to ${BROWSER_NAME} config file. See mod page for manual instructions.`, err, { allowReport: false });
  }
  if (success1 && success2) {
    return api.sendNotification({
      id: `${BROWSER_ID}-setupsuccess`,
      type: 'success',
      message: `Successfully installed ${BROWSER_NAME} dependencies and added game path to config file.`,
      allowSuppress: true,
    })
  }
}

//Check if CD Mod Manager is installed
async function isCdManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === CD_MANAGER_ID);
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      await fs.statAsync(path.join(GAME_PATH, CD_MANAGER_EXEC));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//Check if JSON Mod Manager is installed
async function isJsonManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === JSON_MANAGER_ID);
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      await fs.statAsync(path.join(GAME_PATH, JSON_MANAGER_EXEC));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//Check if QT Mod Manager is installed
async function isQtManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === QT_MANAGER_ID);
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      await fs.statAsync(path.join(GAME_PATH, QT_MANAGER_EXEC));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//Check if Ultimate Mod Manager is installed
async function isUltimateManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === ULTIMATE_MANAGER_ID);
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      await fs.statAsync(path.join(GAME_PATH, ULTIMATE_MANAGER_EXEC));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//Check if Save Editor is installed
async function isSaveEditorInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === SAVE_EDITOR_ID);
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      await fs.statAsync(path.join(GAME_PATH, SAVE_EDITOR_EXEC));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//Check if Unpacker is installed
async function isUnpackerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === UNPACKER_ID);
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      await fs.statAsync(path.join(GAME_PATH, UNPACKER_EXEC));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//* Function to auto-download mod loader from Nexus Mods
async function downloadLoader(api, gameSpec, check = true) {
  let isInstalled = isLoaderInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = LOADER_NAME;
    const MOD_TYPE = LOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = LOADER_PAGE_NO;
    const FILE_ID = LOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = LOADER_DOMAIN;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
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
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download Crimson Browser from Nexus Mods
async function downloadBrowser(api, gameSpec, check = true) {
  let isInstalled = await isBrowserInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = BROWSER_NAME;
    const MOD_TYPE = TOOLS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = BROWSER_PAGE_NO;
    const FILE_ID = BROWSER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = BROWSER_DOMAIN;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
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
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download CD Mod Manager from Nexus Mods
async function downloadCdManager(api, gameSpec, check = true) {
  let isInstalled = await isCdManagerInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = CD_MANAGER_ID;
    const MOD_TYPE = TOOLS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = CD_MANAGER_PAGE_NO;
    const FILE_ID = CD_MANAGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = CD_MANAGER_DOMAIN;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
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
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download JSON Mod Manager from Nexus Mods
async function downloadJsonManager(api, gameSpec, check = true) {
  let isInstalled = await isJsonManagerInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = JSON_MANAGER_ID;
    const MOD_TYPE = TOOLS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = JSON_MANAGER_PAGE_NO;
    const FILE_ID = JSON_MANAGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = JSON_MANAGER_DOMAIN;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
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
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download QT Mod Manager from Nexus Mods
async function downloadQtManager(api, gameSpec, check = true) {
  let isInstalled = await isQtManagerInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = QT_MANAGER_ID;
    const MOD_TYPE = TOOLS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = QT_MANAGER_PAGE_NO;
    const FILE_ID = QT_MANAGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = QT_MANAGER_DOMAIN;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .find(file => (
            file.category_id === 1 
            && !file.file_name.includes('SourceCode')
          ));
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download Ultimate Mod Manager from Nexus Mods
async function downloadUltimateManager(api, gameSpec, check = true) {
  let isInstalled = await isUltimateManagerInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = ULTIMATE_MANAGER_ID;
    const MOD_TYPE = TOOLS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = ULTIMATE_MANAGER_PAGE_NO;
    const FILE_ID = ULTIMATE_MANAGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = ULTIMATE_MANAGER_DOMAIN;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
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
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download Save Editor from Nexus Mods
async function downloadSaveEditor(api, gameSpec, check = true) {
  let isInstalled = await isSaveEditorInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = SAVE_EDITOR_NAME;
    const MOD_TYPE = TOOLS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = SAVE_EDITOR_PAGE_NO;
    const FILE_ID = SAVE_EDITOR_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = SAVE_EDITOR_DOMAIN;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
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
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download Save Editor from Nexus Mods
async function downloadUnpacker(api, gameSpec, check = true) {
  let isInstalled = await isUnpackerInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = UNPACKER_NAME;
    const MOD_TYPE = TOOLS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = UNPACKER_PAGE_NO;
    const FILE_ID = UNPACKER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = UNPACKER_DOMAIN;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .find(file => file.file_name.toLowerCase().includes('gui'))
          //.sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          //.reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

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

//* Resolve game version dynamically for different game versions
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') { // use appxmanifest.xml for Xbox version
    try {
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parsed = await parseStringPromise(appManifest);
      version = parsed?.Package?.Identity?.[0]?.$?.Version;
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  else { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

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
  //GAME_VERSION = await setGameVersion(GAME_PATH);
  if (setupNotification) {
    setupNotify(api);
  }
  /*await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(SAVE_PATH); //*/
  if (hasLoader) {
    await downloadLoader(api, gameSpec);
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = { //register game
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutable,
    queryModPath: makeGetModPath(context.api, gameSpec),
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

  /*register mod types explicitly
  context.registerModType(CONFIG_ID, 60, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, CONFIG_PATH), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  ); //
  context.registerModType(SAVE_ID, 62, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, SAVE_PATH), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  ); //*/

  if (hasLoader) {
    context.registerModType(LOADER_ID, 70, 
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, 
      (game) => pathPattern(context.api, game, path.join('{gamePath}', LOADER_PATH)), 
      () => Promise.resolve(false), 
      { name: LOADER_NAME }
    );
  }

  //Vortex mod type - merger from LO and patch on deploy
  if (loadOrder) {
    context.registerModType(VORTEX_MOD_ID, 25, 
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, 
      (game) => pathPattern(context.api, game, path.join('{gamePath}', VORTEX_MOD_PATH)), 
      () => Promise.resolve(false), 
      { name: VORTEX_MOD_NAME
        //mergeMods: (mod) => loadOrderPrefix(context.api, mod)
       }
    );
  }
  
  //register mod installers
  if (hasLoader) {
    context.registerInstaller(LOADER_ID, 25, testLoader, installLoader);
  }
  if (rootInstaller) {
    context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  }
  context.registerInstaller(TOOLS_ID, 29, testTools, installTools);
  context.registerInstaller(BROWSER_MOD_ID, 31, testBrowserMod, installBrowserMod);
  if (!loadOrder) {
    context.registerInstaller(PATCH_MOD_ID, 33, testPatchMod, (files, fileName) => installPatchMod(context.api, files, fileName));
  } else {
    context.registerInstaller(`${GAME_ID}-vortexmod`, 33, testVortex, (files, fileName) => installVortex(context.api, files, fileName));
  }
  context.registerInstaller(`${GAME_ID}-json`, 35, testJsonMod, (files) => installJsonMod(context.api, files)); //.json patches, no data files
  if (needsModInstaller) {
    context.registerInstaller(MOD_ID, 35, testMod, installMod);
  }
  if (binariesInstaller) {
    context.registerInstaller(BINARIES_ID, 37, testBinaries, installBinaries);
  }
  //context.registerInstaller(CONFIG_ID, 33, testConfig, installConfig);
  //context.registerInstaller(SAVE_ID, 34, testSave, installSave);
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${BROWSER_NAME} + Setup`, async () => {
    await downloadBrowser(context.api, spec);
    await deploy(context.api);
    await setupBrowser(context.api);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Run ${BROWSER_NAME} Setup`, async () => {
    await setupBrowser(context.api);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${JSON_MANAGER_NAME}`, async () => {
    await downloadJsonManager(context.api, spec);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${QT_MANAGER_NAME}`, async () => {
    await downloadQtManager(context.api, spec);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${ULTIMATE_MANAGER_NAME}`, async () => {
    await downloadUltimateManager(context.api, spec);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${CD_MANAGER_NAME}`, async () => {
    await downloadCdManager(context.api, spec);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${SAVE_EDITOR_NAME}`, async () => {
    await downloadSaveEditor(context.api, spec);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${UNPACKER_NAME}`, async () => {
    await downloadUnpacker(context.api, spec);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config File', () => {
    util.opn(path.join(CONFIG_PATH, CONFIG_FILES[0])).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
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
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
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
  //Load Order
  if (loadOrder) {
    //use load order to set folder names for mods, starting from 0036
  }
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    //api.onAsync('did-deploy', (profileId) => didDeploy(api, profileId));
    //api.onAsync('did-purge', (profileId) => didPurge(api, profileId));
  });
  return true;
}

async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  //patch metadata - NO METHOD YET
  return Promise.resolve();
}

async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  //restore metadata - NO METHOD YET
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
