/*///////////////////////////////////////////
Name: METAL GEAR SOLID V: THE PHANTOM PAIN Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 1.3.0
Date: 2026-08-30
Notes:
-
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const React = require('react');
const path = require('path');
const zlib = require('zlib');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');
const { downloadCodeberg, checkForCodebergUpdate, isCodebergRequirementInstalled } = require('./codeberg_downloader');
//const winapi = require('winapi-bindings');
//const fsPromises = require('fs/promises'); //.rm() for recursive folder deletion
//const fsExtra = require('fs-extra');

/*const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow'); //*/
const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "metalgearsolidvtpp";
const STEAMAPP_ID = "287700"; // https://steamdb.info/app/287700/
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = "XXX";
const XBOX_PUB_ID = "XXX"; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const INSTALL_HIVE = 'HKEY_LOCAL_MACHINE'; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\XXX\\XXX`; //for finding install in registry - requires winapi-bindings
const INSTALL_VALUE = "XXX"; //often InstallDir or InstallPath
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "METAL GEAR SOLID V: THE PHANTOM PAIN";
const GAME_NAME_SHORT = "MGSV";
const BINARIES_PATH = '.';
const EXEC_NAME = "mgsvtpp.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const EXEC_EGS = EXEC; //change other versions if different than Steam/default
const EXEC_GOG = EXEC;
const EXEC_DEMO = EXEC;
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Metal_Gear_Solid_V%3A_The_Phantom_Pain";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/2196"; //Nexus link to this extension. Used for links

//feature toggles
const hasLoader = true; //true if game needs a mod loader
const loaderSilentUpdate = true; //true to re-run the mod loader installer unattended when updating an existing install
const allowMgsvFix = true; //should MGSVFix be offered to the user (via a notification at setup)?
const snakeBiteCliSync = true; //true to install and remove mods through the mod loader's command line, so the game matches what Vortex has deployed
let hasXbox = false; //toggle for Xbox version logic
if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;
const multiExe = false; //set to true if there are multiple executable names
const multiModPath = false; //set to true if there are multiple possible mod paths (i.e. different path for Xbox version)
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const needsModInstaller = true; //set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing
const rootInstaller = true; //enable root installer. Set false if you need to avoid installer collisions
const saveInstaller = false; //enable save installer. Set false if path is outside of game folder
const fallbackInstaller = false; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const hasUserIdFolder = true; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
const debug = false; //toggle for debug mode

//info for modtypes, installers, tools, and actions
const DATA_FOLDER = 'master';
let ROOT_FOLDERS = [DATA_FOLDER];
if (BINARIES_PATH !== '.') ROOT_FOLDERS.push(BINARIES_PATH.split(path.sep)[0]);
const ROOTSUB_FOLDERS = [];
const ROOTSUB_PATH = DATA_FOLDER;

const CONFIGMOD_LOCATION = DOCUMENTS;
const SAVEMOD_LOCATION = DOCUMENTS;
const APPDATA_FOLDER = path.join('XXX');
const CONFIG_FOLDERNAME = 'XXX';
const SAVE_FOLDERNAME = 'XXX';

let GAME_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';
const EXEC_XBOX = 'gamelaunchhelper.exe';

const STEAM_FILE = 'steam_api64.dll';
const GOG_FILE = 'Galaxy64.dll';
const EPIC_FILE = 'EOSSDK-Win64-Shipping.dll';
const XBOX_FILE = APPMANIFEST_FILE;

const LOADER_ID = `${GAME_ID}-loader`;
const LOADER_NAME = "Snakebite Mod Manager";
const LOADER_NAME_SHORT = "SnakeBite";
const LOADER_PATH = BINARIES_PATH;
const LOADER_FILE = 'SnakeBite Installer.exe';
const LOADER_INST_EXEC = LOADER_FILE;
const LOADER_EXEC = 'SnakeBite.exe';
const LOADER_PAGE_NO = 106;
const LOADER_FILE_NO = 0;
const LOADER_DOMAIN = GAME_ID;
const LOADER_REG_HIVE = 'HKEY_CURRENT_USER';
const LOADER_REG_KEY = 'SOFTWARE\\SnakeBite'; //registry path, not a file path - always backslash-separated
const LOADER_REG_VALUE = ''; //the installer records its install folder as this key's default (unnamed) value
const LOADER_SILENT_PARAMS = ['/S']; //silent switch for the installer
const LOADER_SETTINGS_FILE = 'snakebite.xml'; //the mod loader's database, written to the game folder
const LOADER_LOG_PATH = path.join('Logs', 'log.txt'); //relative to the mod loader's install folder - rotated on every launch
const LOADER_LEDGER_FILE = `${GAME_ID}-snakebite.json`; //record of the mods this extension installed through the mod loader
//both of these turn a long archive repack into something that happens on its own, so they are the
//user's call and default to off
const SETTING_AUTO_SYNC = 'autoSyncOnDeploy';
const SETTING_UNINSTALL_ON_PURGE = 'uninstallOnPurge';
const SET_AUTO_SYNC = `SET_${GAME_ID.toUpperCase()}_AUTO_SYNC`;
function setAutoSyncOnDeploy(value) { return { type: SET_AUTO_SYNC, payload: value }; }
setAutoSyncOnDeploy.toString = () => SET_AUTO_SYNC;
const SET_UNINSTALL_ON_PURGE = `SET_${GAME_ID.toUpperCase()}_UNINSTALL_ON_PURGE`;
function setUninstallOnPurge(value) { return { type: SET_UNINSTALL_ON_PURGE, payload: value }; }
setUninstallOnPurge.toString = () => SET_UNINSTALL_ON_PURGE;
const LOADER_ARG_INSTALL = '-i';
const LOADER_ARG_UNINSTALL = '-u'; //takes mod names, not file paths
const LOADER_ARG_SKIP_CHECKS = '-c';
const LOADER_ARG_CLOSE = '-x'; //without this the mod loader leaves its own window open when it is done
const LOADER_ARG_RESTORE = '-completeuninstall'; //only honoured when it is the only argument passed
const LOADER_ICON_NAME = 'snakebite-sync'; //toolbar buttons are grouped by icon, so this one is its own
const LOADER_ICON = 'M9.7 2h4.6l-0.9 13.2h-2.8L9.7 2z M12 17.1c1.4 0 2.5 1.1 2.5 2.5S13.4 22.1 12 22.1 9.5 21 9.5 19.6 10.6 17.1 12 17.1z'; //traced from the mod loader's own logo
const RESTORE_ICON_NAME = 'snakebite-restore';
const RESTORE_ICON = 'M13,3A9,9 0 0,0 4,12H1L4.89,15.89L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.51,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3M12,8V13L16.28,15.54L17,14.33L13.5,12.25V8H12Z';
const LOADER_ICONS = [{ name: LOADER_ICON_NAME, path: LOADER_ICON }, { name: RESTORE_ICON_NAME, path: RESTORE_ICON }];

const MGSVFIX_ID = `${GAME_ID}-mgsvfix`;
const MGSVFIX_NAME = "MGSVFix";
const MGSVFIX_PATH = BINARIES_PATH;
const MGSVFIX_FILES = ['mgsvfix.asi']; //lowercased - marker file identifying the archive
const MGSVFIX_IGNORE_FILES = ['extract_to_game_folder']; //lowercased - empty marker file shipped in the archive, not wanted in the game folder
const MGSVFIX_REPO = 'Lyall/MGSVFix'; //https://codeberg.org/Lyall/MGSVFix
const MGSVFIX_VER = '0.0.3'; //fallback version if the Codeberg API is unreachable
const MGSVFIX_ARC_PATTERN = /^MGSVFix_(\d+\.\d+(?:\.\d+)?)/i; //capture group 1 is the version
const CODEBERG_REQUIREMENTS = [
  {
    repo: MGSVFIX_REPO,
    modType: MGSVFIX_ID,
    userFacingName: MGSVFIX_NAME,
    assetPattern: MGSVFIX_ARC_PATTERN,
    fallbackVersion: MGSVFIX_VER,
    autoInstall: false, //an optional fix rather than a requirement - only the setup notification or the toolbar action installs it
  },
];

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "SnakeBite Mod (.mgsv)";
const MOD_PATH = "SnakeBite_Mods";
const MOD_PATH_XBOX = MOD_PATH;
const MOD_EXTS = ['.mgsv', '.MGSVPreset'];
const MOD_INSTALL_EXT = '.mgsv'; //the only extension the mod loader installs - presets are loaded through its own interface
const MOD_META_FILE = 'metadata.xml'; //every .mgsv carries one at its root
const MOD_MIN_LOADER_VERSION = '0.8.0.0'; //the mod loader refuses mods built with anything older

//zip structures, enough of them to pull one named file out of a very large archive
const ZIP_EOCD_SIG = 0x06054b50;
const ZIP_EOCD_SIZE = 22;
const ZIP_EOCD_SEARCH = ZIP_EOCD_SIZE + 0xffff; //the record plus the largest comment that can follow it
const ZIP_EOCD64_SIG = 0x06064b50;
const ZIP_EOCD64_SIZE = 56;
const ZIP_EOCD64_LOCATOR_SIG = 0x07064b50;
const ZIP_EOCD64_LOCATOR_SIZE = 20;
const ZIP_CENTRAL_SIG = 0x02014b50;
const ZIP_CENTRAL_SIZE = 46;
const ZIP_LOCAL_SIZE = 30;
const ZIP_METHOD_STORE = 0;
const ZIP_METHOD_DEFLATE = 8;
const ZIP64_EXTRA_ID = 0x0001;
const ZIP64_MARKER = 0xffffffff; //stands in for a value too large for its field
const MOD_ATTR_KEY = 'mgsvFiles';
const MOD_ATTR_META_KEY = 'mgsvMetadata'; //name and versions read out of each .mgsv, kept so they are read once

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, APPDATA_FOLDER, SAVE_FOLDERNAME);
let USERID_FOLDER = "";
if (hasUserIdFolder) {
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
  } catch {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  }
}
let SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_FOLDER_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_PUB_ID}`, "SystemAppData", "wgs");
if (hasUserIdFolder) {
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER_XBOX);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
  } catch {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  }
}
const SAVE_PATH_XBOX = path.join(SAVE_FOLDER_XBOX, USERID_FOLDER);
const SAVE_EXTS = [".XXX"];
const SAVE_FILES = ["XXX"];

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
let CONFIG_PATH = path.join(CONFIGMOD_LOCATION, APPDATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_PATH_XBOX = CONFIG_PATH; //XBOX Version
const CONFIG_EXTS = [".XXX"];
const CONFIG_FILES = ["XXX"];

/* tool info (i.e. save editor)
const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = "XXX";
const TOOL_EXEC_FOLDER = path.join('XXX');
const TOOL_EXEC = 'XXX.exe';
const TOOL_EXEC_PATH = path.join(TOOL_EXEC_FOLDER, TOOL_EXEC);
//*/

let MOD_PATH_DEFAULT = MOD_PATH;
//if (!needsModInstaller) MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [BINARIES_PATH];
if (needsModInstaller) MODTYPE_FOLDERS.push(MOD_PATH);
if (saveInstaller) MODTYPE_FOLDERS.push(SAVE_PATH);
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
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};
//? think of a way to tell if the mod path is not in the game folder, only add ROOT modType if it is
if (needsModInstaller) {
  spec.modTypes.push({
    "id": MOD_ID,
    "name": MOD_NAME,
    "priority": "high",
    "targetPath": path.join('{gamePath}', MOD_PATH)
  });
}
if (saveInstaller) {
  spec.modTypes.push({
    "id": SAVE_ID,
    "name": SAVE_NAME,
    "priority": "high",
    "targetPath": path.join("{gamePath}", SAVE_PATH)
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
    //parameters: PARAMETERS,
  }, //*/
  {
    id: LOADER_ID,
    name: LOADER_NAME,
    logo: 'snakebite.png',
    queryPath: getSnakeBite,
    executable: () => LOADER_EXEC,
    requiredFiles: [
      LOADER_EXEC,
    ],
    relative: true,
    exclusive: true,
    //shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
];

//The installer records the folder it installed to in the registry. That is the only reliable
//source for the location, since the user can choose a different folder during setup. Returns an
//empty string when the key is absent, which is how a tool reports that it could not be found.
function getSnakeBite() {
  try {
    const winapi = require('winapi-bindings');
    const installPath = winapi.RegGetValue(LOADER_REG_HIVE, LOADER_REG_KEY, LOADER_REG_VALUE);
    return installPath?.value ?? '';
  } catch (err) { //RegGetValue throws when the key is missing rather than returning undefined
    log('debug', `Could not read the ${LOADER_NAME} install folder from the registry: ${err}`);
    return '';
  }
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

//* Get mod path dynamically for different game versions
function getModPath(discoveryPath) {
  if (!multiModPath) {
    return () => MOD_PATH_DEFAULT;
  }
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return () => MOD_PATH_XBOX;
  };
  //add GOG/EGS/Demo versions here if needed
  GAME_VERSION = 'default';
  return () => MOD_PATH_DEFAULT;
} //*/

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
  } catch { //*/
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  //}
} //*/

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
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
  return Promise.resolve(undefined);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (!multiExe && !hasXbox) {
    return EXEC;
  }
  if (hasXbox && statCheckSync(discoveryPath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    SAVE_PATH = SAVE_PATH_XBOX;
    CONFIG_PATH = CONFIG_PATH_XBOX;
    return EXEC_XBOX;
  };
  //add GOG/EGS/Demo versions here if needed
  GAME_VERSION = 'default';
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (!multiExe && !hasXbox) {
    GAME_VERSION = 'default';
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    SAVE_PATH = SAVE_PATH_XBOX;
    CONFIG_PATH = CONFIG_PATH_XBOX;
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

//Test for MGSVFix files
function testMgsvFix(files, gameId) {
  const isMod = files.some(file => MGSVFIX_FILES.includes(path.basename(file).toLowerCase()));
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

//Install MGSVFix files
function installMgsvFix(files) {
  const MOD_TYPE = MGSVFIX_ID;
  const modFile = files.find(file => MGSVFIX_FILES.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories, anything that isn't in the rootPath, and the archive's own
  // "extract here" marker file, which has no business in the game folder.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep))
      && (!MGSVFIX_IGNORE_FILES.includes(path.basename(file).toLowerCase())))
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

//Test for mod files
function testMod(files, gameId) {
  const MOD_EXTS_LOWER = MOD_EXTS.map(ext => ext.toLowerCase());
  const isMod = files.some(file => MOD_EXTS_LOWER.includes(path.extname(file).toLowerCase()));
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

//The mod loader's command line matches the file extension case-sensitively, so a mod shipping
//".MGSV" would be passed over without a word. Deploy every mod with a lower case extension.
function normalizeModFileName(fileName) {
  const ext = path.extname(fileName);
  return `${path.basename(fileName, ext)}${ext.toLowerCase()}`;
}

//install pak mods
async function installMod(api, files, fileName) {
  const fileExts = MOD_EXTS.map(ext => ext.toLowerCase());
  const modFiles = files.filter(file => (
    fileExts.includes(path.extname(file).toLowerCase())
  ));
  //const folder = path.basename(fileName).slice(0, 20);
  const modType = {
    type: 'setmodtype',
    value: MOD_ID,
  };
  const installFiles = (modFiles.length > 1)
    ? await chooseFilesToInstall(api, modFiles, fileExts)
    : modFiles;
  const mgsvModFiles = {
    type: 'attribute',
    key: MOD_ATTR_KEY,
    value: installFiles.map(f => normalizeModFileName(path.basename(f)))
  };
  let instructions = installFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: normalizeModFileName(path.basename(file))
      //destination: path.join(folder, path.basename(file))
    };
  });
  instructions.push(modType);
  instructions.push(mgsvModFiles);
  return Promise.resolve({ instructions });
}

//file selection dialog for .mgsv mods
async function chooseFilesToInstall(api, files, fileExts) {
  const t = api.translate;
  return api.showDialog('question', t('Multiple {{exts}} files', { replace: { exts: fileExts.join('/') } }), {
    text: t('The mod you are installing contains {{x}} {{exts}} files.', { replace: { x: files.length, exts: fileExts.join('/') } }) +
        `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
    checkboxes: files.map((mgsv) => {
      return {
          id: mgsv,
          text: mgsv,
          subtext: path.basename(mgsv),
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
          const installMgsvs = installAll ? files : Object.keys(result.input).filter(s => result.input[s])
            .map(file => files.find(f => f === file));
          return installMgsvs;
      }
  });
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map(str => str.toLowerCase());
  const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map(str => str.toLowerCase());
  const isMod = files.some(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const isSub = files.some(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isMod || isSub );

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
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map(str => str.toLowerCase());
  const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map(str => str.toLowerCase());
  let folder = '';
  let modFile = files.find(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  if (modFile === undefined) {
    modFile = files.find(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    folder = ROOTSUB_PATH;
  }
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
      destination: path.join(folder, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for save files
function testSave(files, gameId) {
  const isMod = files.some(file => SAVE_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install save files
function installSave(files) {
  const MOD_TYPE = SAVE_ID;
  const modFile = files.find(file => SAVE_EXTS.includes(path.extname(file).toLowerCase()));
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
  instructions.push(setModTypeInstruction);
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

//Check if mod loader is installed
function isLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LOADER_ID);
}

//The mod loader uses four-part version numbers, while the version published on the mod page may
//have three. Pad both to four parts so they can be compared as plain strings - these versions are
//not semver, so a semver comparison would treat 0.9.2.5 and 0.9.2.6 as the same release.
function normalizeLoaderVersion(version) {
  if (!version) {
    return undefined;
  }
  const parts = String(version).trim().split('.').slice(0, 4);
  while (parts.length < 4) {
    parts.push('0');
  }
  return parts.join('.');
}

//Read the version of the mod loader that is currently installed on the system. Its executable
//carries the same version that is published on the mod page, so the two can be compared directly.
//Returns undefined when the mod loader is not installed.
function getLoaderInstalledVersion() {
  const installPath = getSnakeBite();
  if (!installPath) {
    return undefined; //not installed, so there is no version to read
  }
  try {
    const exeVersion = require('exe-version');
    return normalizeLoaderVersion(exeVersion.getProductVersion(path.join(installPath, LOADER_EXEC)));
  } catch (err) {
    log('debug', `Could not read the installed ${LOADER_NAME} version: ${err}`);
    return undefined;
  }
}

//The mod loader ships as an installer rather than as files to deploy, so it has to be run out of
//its staging folder. Resolve that folder from the mod entry instead of searching the staging
//folder by name, so that an update always runs the installer it just downloaded.
async function runLoaderInstaller(api, modId, silent) {
  const state = api.getState();
  const mod = state.persistent.mods[GAME_ID]?.[modId];
  if (mod === undefined) {
    throw new util.ProcessCanceled(`${LOADER_NAME} is no longer installed`);
  }
  const stagingFolder = selectors.installPathForGame(state, GAME_ID);
  const runPath = path.join(stagingFolder, mod.installationPath ?? modId, LOADER_INST_EXEC);
  log('info', `Running the ${LOADER_NAME} installer at ${runPath}`);
  await api.runExecutable(runPath, silent ? LOADER_SILENT_PARAMS : [], { suggestDeploy: false });
  log('info', `The ${LOADER_NAME} installer completed`);
}

//Guards against launching the installer twice for the same mod, since the install event and the
//download routine can both ask for it at the same time.
const loaderSyncInFlight = new Set();

//Run the mod loader installer whenever the version Vortex has staged is not the version installed
//on the system. This is what carries an update through: Vortex downloading a newer version only
//puts the installer in the staging folder, and the installer still has to run to apply it.
//Re-installing the same version is skipped, so nothing happens when there is no update.
async function syncLoaderInstall(api, modId) {
  const mod = api.getState().persistent.mods[GAME_ID]?.[modId];
  if (mod?.type !== LOADER_ID) {
    return;
  }
  if (loaderSyncInFlight.has(modId)) {
    return;
  }
  const staged = normalizeLoaderVersion(mod.attributes?.version);
  const installed = getLoaderInstalledVersion();
  if ((staged !== undefined) && (installed !== undefined) && (staged === installed)) {
    return; //already applied - nothing was updated
  }
  loaderSyncInFlight.add(modId);
  const NOTIF_ID = `${LOADER_ID}-updating`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'activity',
    //a first install has no recorded folder, so the user has to be warned about the directory page
    message: (installed === undefined)
      ? `Installing ${LOADER_NAME} - DO NOT CHANGE THE INSTALL DIRECTORY`
      : `Updating ${LOADER_NAME} to ${staged ?? 'the staged version'}`,
    noDismiss: true,
    allowSuppress: false,
  });
  try {
    //an update re-uses the folder recorded in the registry, so it can run unattended; a first
    //install has no folder to re-use and must show its directory page
    await runLoaderInstaller(api, modId, loaderSilentUpdate && (installed !== undefined));
  } catch (err) {
    api.showErrorNotification(`Failed to run the ${LOADER_NAME} installer`, err,
      { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  } finally {
    loaderSyncInFlight.delete(modId);
    api.dismissNotification(NOTIF_ID);
  }
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
      message: `Downloading ${MOD_NAME}`, //the installer run that follows puts up its own notification
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
        } catch { // use defined file ID if input is undefined above
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
        await util.batchDispatch(api.store, batched); // Will dispatch both actions
        await syncLoaderInstall(api, modId); //run the installer exe from staging
        //return new Promise((resolve, reject) => { //download, install, run installer exe
        //return resolve();
        //});
      } catch (err) { //Show the user the download page if the download, install process fails
        const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
        util.opn(errPage).catch(() => null);
        //return reject(err);
      } finally {
        api.dismissNotification(NOTIF_ID);
      }
  }
} //*/

//Check if MGSVFix is installed
function isMgsvFixInstalled(api, gameSpec) {
  return isCodebergRequirementInstalled(api, gameSpec.game.id, CODEBERG_REQUIREMENTS[0]);
}

//Notify the user to ask if they want to download MGSVFix. It is an optional fix rather than a
//requirement, so it is never installed unattended: the requirement carries autoInstall: false,
//and this notification (or the toolbar action) is the only way in.
function downloadMgsvFixNotify(api) {
  if (isMgsvFixInstalled(api, spec)) return;
  const NOTIF_ID = `${GAME_ID}-mgsvfix`;
  const MOD_NAME = MGSVFIX_NAME;
  const MESSAGE = `Would you like to download ${MOD_NAME}?`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Download Fix',
        action: (dismiss) => {
          downloadCodeberg(api, spec, CODEBERG_REQUIREMENTS);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `${MOD_NAME} is an ASI plugin that skips the intro logos, unlocks the framerate and the resolution options, fixes HUD and graphical effects at ultrawide resolutions, and lets you tweak LOD distances.\n`
                + `Click the button below to download and install ${MOD_NAME}.\n`
                + `Once installed, open "MGSVFix.ini" in the game folder to change its settings.\n`
                + `\n`
                + `You can also install it at any time with the "Download Latest ${MOD_NAME}" button above the mod list.\n`
          }, [
            {
              label: `Download ${MOD_NAME}`, action: () => {
                downloadCodeberg(api, spec, CODEBERG_REQUIREMENTS);
                dismiss();
              }
            },
            { label: 'Not Now', action: () => dismiss() },
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
      const EXEC = getExecutable(gamePath);
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC)); //can also use getFileVersion if this doesn't return the correct number (rare)
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read executable file to get game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

// MOD LOADER COMMAND LINE ///////////////////////////////////////////////////

//Mods are driven into the game through the mod loader's command line rather than by hand. Two of
//its behaviours shape everything below: it takes mod names when uninstalling but file paths when
//installing, and its own pre-install checks reject any mod whose declared game version is not an
//exact match - which almost none are - while also treating an already-installed mod as
//conflicting with itself. Those checks are therefore skipped, and the two worth keeping are done
//here instead.

//A toolbar icon is resolved to an svg symbol by id, so the mod loader's mark has to be in the
//document before the button renders. Vortex can install an icon set, but only from a file on
//disk, and the deploy script carries nothing but the scripts - so the symbol is added directly.
function installLoaderIcons() {
  try {
    const container = globalThis.document.getElementById('icon-sets');
    if (container === null) {
      return;
    }
    const missing = LOADER_ICONS.filter((icon) => globalThis.document.getElementById(`icon-${icon.name}`) === null);
    if (missing.length === 0) {
      return;
    }
    const holder = globalThis.document.createElement('div');
    holder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">'
      + missing.map((icon) => `<symbol id="icon-${icon.name}" viewBox="0 0 24 24"><path d="${icon.path}"/></symbol>`).join('')
      + '</svg>';
    container.appendChild(holder);
  } catch (err) { //the buttons still work, they just draw without an icon
    log('warn', `Could not install the ${LOADER_NAME} icons: ${err}`);
  }
}

function getLoaderExecutable() {
  const installPath = getSnakeBite();
  return installPath ? path.join(installPath, LOADER_EXEC) : '';
}

function isAutoSyncEnabled(api) {
  return util.getSafe(api.getState(), ['settings', GAME_ID, SETTING_AUTO_SYNC], false);
}

function isUninstallOnPurgeEnabled(api) {
  return util.getSafe(api.getState(), ['settings', GAME_ID, SETTING_UNINSTALL_ON_PURGE], false);
}

//These versions have four parts and are not semver, so compare them part by part.
function compareLoaderVersions(left, right) {
  const leftParts = String(left ?? '').split('.');
  const rightParts = String(right ?? '').split('.');
  for (let index = 0; index < 4; index++) {
    const diff = (parseInt(leftParts[index], 10) || 0) - (parseInt(rightParts[index], 10) || 0);
    if (diff !== 0) {
      return diff < 0 ? -1 : 1;
    }
  }
  return 0;
}

//Recorded paths use either slash and any case, so flatten them before comparing.
function normalizeEntryPath(entryPath) {
  return String(entryPath ?? '').replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

//A mod records the game files it replaces in three lists, and two mods conflict when they claim
//the same file. Packed archives are ignored, matching what the mod loader itself compares, and a
//file inside an archive only counts as the same file when it comes from the same archive.
function getEntryPaths(entry) {
  const paths = [];
  (entry?.QarEntries?.[0]?.QarEntry ?? []).forEach((item) => {
    const filePath = item?.$?.FilePath;
    if ((filePath === undefined) || /\.fpkd?$/i.test(filePath)) {
      return;
    }
    paths.push(normalizeEntryPath(filePath));
  });
  (entry?.FpkEntries?.[0]?.FpkEntry ?? []).forEach((item) => {
    const filePath = item?.$?.FilePath;
    if (filePath !== undefined) {
      paths.push(`${normalizeEntryPath(item?.$?.FpkFile)}|${normalizeEntryPath(filePath)}`);
    }
  });
  (entry?.FileEntries?.[0]?.FileEntry ?? []).forEach((item) => {
    const filePath = item?.$?.FilePath;
    if (filePath !== undefined) {
      paths.push(normalizeEntryPath(filePath));
    }
  });
  return paths;
}

//Read what the mod loader currently has installed. Its database lives in the game folder and is
//the only record of what actually reached the game archives - the deployed files are just the
//source material. Returns undefined when the mod loader has never been set up for this game.
async function readInstalledMods(gamePath) {
  let data;
  try {
    data = await fs.readFileAsync(path.join(gamePath, LOADER_SETTINGS_FILE), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
  const parsed = await parseStringPromise(data);
  return (parsed?.Settings?.Mods?.[0]?.ModEntry ?? [])
    .map((entry) => ({
      name: entry?.$?.Name ?? '',
      version: entry?.$?.Version ?? '',
      paths: getEntryPaths(entry),
    }))
    .filter((mod) => mod.name !== '');
}

//XML written by .NET usually starts with a byte order mark, which the parser will not accept.
function stripBom(text) {
  return (text.charCodeAt(0) === 0xfeff) ? text.slice(1) : text;
}

//Read `length` bytes at `position` without pulling the rest of the file into memory.
async function readFileChunk(fd, position, length) {
  const buffer = Buffer.allocUnsafe(length);
  await fs.readAsync(fd, buffer, 0, length, position);
  return buffer;
}

//The end of central directory record is the archive's index of its own contents. It sits at the
//very end, behind a comment of unknown length, so it has to be searched for backwards.
function findEndOfCentralDirectory(tail) {
  for (let offset = tail.length - ZIP_EOCD_SIZE; offset >= 0; offset--) {
    if (tail.readUInt32LE(offset) === ZIP_EOCD_SIG) {
      return offset;
    }
  }
  return -1;
}

//Sizes and offsets that do not fit in four bytes are parked in a zip64 extra field instead.
function applyZip64Extra(entry, extra) {
  let offset = 0;
  while ((offset + 4) <= extra.length) {
    const fieldSize = extra.readUInt16LE(offset + 2);
    if (extra.readUInt16LE(offset) === ZIP64_EXTRA_ID) {
      let field = offset + 4;
      if (entry.uncompressedSize === ZIP64_MARKER) {
        entry.uncompressedSize = Number(extra.readBigUInt64LE(field));
        field += 8;
      }
      if (entry.compressedSize === ZIP64_MARKER) {
        entry.compressedSize = Number(extra.readBigUInt64LE(field));
        field += 8;
      }
      if (entry.localOffset === ZIP64_MARKER) {
        entry.localOffset = Number(extra.readBigUInt64LE(field));
      }
      break;
    }
    offset += 4 + fieldSize;
  }
  return entry;
}

function findDirectoryEntry(directory, wantedName) {
  let offset = 0;
  while (((offset + ZIP_CENTRAL_SIZE) <= directory.length)
      && (directory.readUInt32LE(offset) === ZIP_CENTRAL_SIG)) {
    const nameLength = directory.readUInt16LE(offset + 28);
    const extraLength = directory.readUInt16LE(offset + 30);
    const commentLength = directory.readUInt16LE(offset + 32);
    const nameStart = offset + ZIP_CENTRAL_SIZE;
    const name = directory.toString('utf8', nameStart, nameStart + nameLength);
    if (path.basename(name).toLowerCase() === wantedName) {
      return applyZip64Extra({
        method: directory.readUInt16LE(offset + 10),
        compressedSize: directory.readUInt32LE(offset + 20),
        uncompressedSize: directory.readUInt32LE(offset + 24),
        localOffset: directory.readUInt32LE(offset + 42),
      }, directory.slice(nameStart + nameLength, nameStart + nameLength + extraLength));
    }
    offset += ZIP_CENTRAL_SIZE + nameLength + extraLength + commentLength;
  }
  return undefined;
}

async function readZip64Directory(fd, tail, eocdOffset) {
  let locator = -1;
  for (let offset = eocdOffset - ZIP_EOCD64_LOCATOR_SIZE; offset >= 0; offset--) {
    if (tail.readUInt32LE(offset) === ZIP_EOCD64_LOCATOR_SIG) {
      locator = offset;
      break;
    }
  }
  if (locator === -1) {
    throw new Error('the archive claims to be zip64 but carries no zip64 locator');
  }
  const record = await readFileChunk(fd, Number(tail.readBigUInt64LE(locator + 8)), ZIP_EOCD64_SIZE);
  if (record.readUInt32LE(0) !== ZIP_EOCD64_SIG) {
    throw new Error('the zip64 end of central directory record is missing');
  }
  return {
    directorySize: Number(record.readBigUInt64LE(40)),
    directoryOffset: Number(record.readBigUInt64LE(48)),
  };
}

//Pull one named file out of a zip by reading its index and inflating only that entry. A .mgsv is
//an ordinary zip, and they run past a gigabyte, so nothing here unpacks the archive.
async function readZipEntry(archivePath, entryName) {
  const wantedName = entryName.toLowerCase();
  const stats = await fs.statAsync(archivePath);
  const fd = await fs.openAsync(archivePath, 'r');
  try {
    const tailLength = Math.min(stats.size, ZIP_EOCD_SEARCH);
    const tail = await readFileChunk(fd, stats.size - tailLength, tailLength);
    const eocdOffset = findEndOfCentralDirectory(tail);
    if (eocdOffset === -1) {
      throw new Error('not a zip archive');
    }
    let directorySize = tail.readUInt32LE(eocdOffset + 12);
    let directoryOffset = tail.readUInt32LE(eocdOffset + 16);
    if ((directorySize === ZIP64_MARKER) || (directoryOffset === ZIP64_MARKER)) {
      ({ directorySize, directoryOffset } = await readZip64Directory(fd, tail, eocdOffset));
    }
    const entry = findDirectoryEntry(await readFileChunk(fd, directoryOffset, directorySize), wantedName);
    if (entry === undefined) {
      throw new Error(`${entryName} is not in the archive`);
    }
    //the local header repeats the name and extra fields, so where the data starts is only known
    //once it has been read
    const header = await readFileChunk(fd, entry.localOffset, ZIP_LOCAL_SIZE);
    const dataOffset = entry.localOffset + ZIP_LOCAL_SIZE
      + header.readUInt16LE(26) + header.readUInt16LE(28);
    const compressed = await readFileChunk(fd, dataOffset, entry.compressedSize);
    if (entry.method === ZIP_METHOD_STORE) {
      return compressed;
    }
    if (entry.method === ZIP_METHOD_DEFLATE) {
      return zlib.inflateRawSync(compressed);
    }
    throw new Error(`${entryName} uses unsupported compression method ${entry.method}`);
  } finally {
    await fs.closeAsync(fd);
  }
}

//A .mgsv is a zip carrying a metadata.xml at its root, and that one file names the mod.
async function readModMetadata(mgsvPath) {
  const data = stripBom((await readZipEntry(mgsvPath, MOD_META_FILE)).toString('utf8'));
  const entry = (await parseStringPromise(data))?.ModEntry;
  return {
    name: entry?.$?.Name ?? '',
    version: entry?.$?.Version ?? '',
    loaderVersion: entry?.SBVersion?.[0]?.$?.Version ?? '',
    gameVersion: entry?.MGSVersion?.[0]?.$?.Version ?? '',
    paths: getEntryPaths(entry),
  };
}

//Find the Vortex mod a deployed file came from, so what was read out of it can be kept there.
function findModForFile(api, fileName) {
  const mods = api.getState().persistent.mods[GAME_ID] ?? {};
  return Object.values(mods).find((mod) => (mod.attributes?.[MOD_ATTR_KEY] ?? [])
    .some((entry) => entry.toLowerCase() === fileName.toLowerCase()));
}

//Opening every deployed archive on every sync would be wasteful, so the name and versions are
//cached on the Vortex mod that deployed the file. The file lists are deliberately left out - they
//run to hundreds of entries per mod and are only needed for the few about to be installed.
async function getModMetadataCached(api, mgsvPath) {
  const fileName = path.basename(mgsvPath);
  const mod = findModForFile(api, fileName);
  const cached = mod?.attributes?.[MOD_ATTR_META_KEY]?.[fileName];
  if (cached?.name) {
    return cached;
  }
  const metadata = await readModMetadata(mgsvPath);
  const summary = {
    name: metadata.name,
    version: metadata.version,
    loaderVersion: metadata.loaderVersion,
    gameVersion: metadata.gameVersion,
  };
  if ((mod !== undefined) && (summary.name !== '')) {
    api.store.dispatch(actions.setModAttribute(GAME_ID, mod.id, MOD_ATTR_META_KEY, {
      ...(mod.attributes?.[MOD_ATTR_META_KEY] ?? {}),
      [fileName]: summary,
    }));
  }
  return summary;
}

//A mod removed from Vortex takes its attributes with it, so the names installed from here are
//recorded outside the mod list. Any installed mod missing from this record was installed by hand
//and is never touched.
function getLedgerPath() {
  return path.join(util.getVortexPath('userData'), GAME_ID, LOADER_LEDGER_FILE);
}

async function readLedger() {
  try {
    const parsed = JSON.parse(await fs.readFileAsync(getLedgerPath(), 'utf8'));
    return Array.isArray(parsed?.names) ? parsed.names : [];
  } catch {
    return []; //no record yet, so nothing here counts as ours
  }
}

async function writeLedger(names) {
  const ledgerPath = getLedgerPath();
  await fs.ensureDirWritableAsync(path.dirname(ledgerPath));
  await fs.writeFileAsync(ledgerPath, JSON.stringify({ names }, undefined, 2));
}

async function getDeployedModFiles(gamePath) {
  const modsPath = path.join(gamePath, MOD_PATH);
  let entries;
  try {
    entries = await fs.readdirAsync(modsPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
  return entries
    .filter((entry) => path.extname(entry).toLowerCase() === MOD_INSTALL_EXT)
    .map((entry) => path.join(modsPath, entry));
}

//Work out what has to change for the game to match what Vortex has deployed.
async function planSync(api, gamePath) {
  const installed = await readInstalledMods(gamePath);
  if (installed === undefined) {
    throw new util.ProcessCanceled(`${LOADER_NAME} has not been set up for this game yet. `
      + `Run it once and finish its setup wizard, then try again.`);
  }
  const deployed = [];
  const unreadable = [];
  const files = await getDeployedModFiles(gamePath);
  for (const file of files) {
    try {
      const metadata = await getModMetadataCached(api, file);
      if (metadata.name === '') {
        throw new Error('the archive carries no mod name');
      }
      deployed.push({ ...metadata, file });
    } catch (err) {
      log('warn', `Could not read mod information from ${path.basename(file)}: ${err}`);
      unreadable.push(path.basename(file));
    }
  }
  const installedNames = installed.map((mod) => mod.name);
  const deployedNames = deployed.map((mod) => mod.name);
  const ledger = await readLedger();
  return {
    installed,
    ledger,
    unreadable,
    deployedNames,
    toInstall: deployed.filter((mod) => !installedNames.includes(mod.name)),
    toUninstall: ledger.filter((name) => installedNames.includes(name) && !deployedNames.includes(name)),
    //installed by hand and not deployed by Vortex: reported so the drift is visible, never removed
    //on their own, since the user may well have installed them deliberately
    unmanaged: installedNames.filter((name) => !ledger.includes(name) && !deployedNames.includes(name)),
  };
}

//With the mod loader's own checks skipped, these are the two worth keeping: a mod built for a
//newer mod loader than the one installed cannot be trusted, and a mod claiming a file another mod
//already replaced has to be flagged. The game version a mod declares is deliberately ignored -
//the mod loader's own interface ignores it too, and enforcing it rejects almost every mod.
async function checkInstallCandidates(candidates, installed) {
  const loaderVersion = getLoaderInstalledVersion();
  const owners = new Map();
  installed.forEach((mod) => mod.paths.forEach((entryPath) => {
    if (!owners.has(entryPath)) {
      owners.set(entryPath, mod.name);
    }
  }));
  const accepted = [];
  const refused = [];
  const conflicts = [];
  for (const candidate of candidates) {
    let metadata;
    try {
      metadata = await readModMetadata(candidate.file); //read again: the file lists are not cached
    } catch (err) {
      refused.push({ name: candidate.name, reason: `its mod information could not be read (${err.message})` });
      continue;
    }
    if (compareLoaderVersions(metadata.loaderVersion, MOD_MIN_LOADER_VERSION) < 0) {
      refused.push({
        name: candidate.name,
        reason: `it was built with ${LOADER_NAME} ${metadata.loaderVersion}, which is no longer supported`,
      });
      continue;
    }
    if ((loaderVersion !== undefined) && (compareLoaderVersions(metadata.loaderVersion, loaderVersion) > 0)) {
      refused.push({
        name: candidate.name,
        reason: `it needs ${LOADER_NAME} ${metadata.loaderVersion} or newer, but ${loaderVersion} is installed`,
      });
      continue;
    }
    const clashesWith = [];
    metadata.paths.forEach((entryPath) => {
      const owner = owners.get(entryPath);
      if ((owner !== undefined) && (owner !== candidate.name) && !clashesWith.includes(owner)) {
        clashesWith.push(owner);
      }
    });
    if (clashesWith.length > 0) {
      conflicts.push({ name: candidate.name, clashesWith });
    }
    metadata.paths.forEach((entryPath) => { //also catches two mods in this batch claiming one file
      if (!owners.has(entryPath)) {
        owners.set(entryPath, candidate.name);
      }
    });
    accepted.push(candidate);
  }
  return { accepted, refused, conflicts };
}

//Installing over another mod's files leaves both in a broken state, and the only way back out is
//to remove every mod involved, so this is the user's call rather than something to decide here.
async function confirmConflicts(api, conflicts) {
  const t = api.translate;
  const details = conflicts
    .map((conflict) => `- ${conflict.name} replaces files already replaced by: ${conflict.clashesWith.join(', ')}`)
    .join('\n');
  const result = await api.showDialog('question', t('Mod conflicts found'), {
    text: `${conflicts.length} of the mods about to be installed replace game files that an installed mod already replaced. `
        + `The last mod installed wins, and undoing the overlap later means removing every mod involved.\n\n${details}`,
  }, [
    { label: 'Cancel' },
    { label: 'Install Anyway' },
  ]);
  if (result.action === 'Cancel') {
    throw new util.UserCanceled();
  }
}

async function runLoaderCommand(api, args, message, options) {
  const executable = getLoaderExecutable();
  if (executable === '') {
    throw new util.ProcessCanceled(`${LOADER_NAME} is not installed`);
  }
  //most commands get the switch that closes the mod loader when it is done, but the arguments that
  //have to stand alone are ignored as soon as anything is passed alongside them
  const allArgs = (options?.close === false) ? [...args] : [...args, LOADER_ARG_CLOSE];
  const NOTIF_ID = `${LOADER_ID}-running`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'activity',
    message,
    noDismiss: true,
    allowSuppress: false,
  });
  try {
    await api.runExecutable(executable, allArgs, { suggestDeploy: false, expectSuccess: true });
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
}

function notifySyncResult(api, result) {
  const NOTIF_ID = `${GAME_ID}-sync`;
  const problems = result.failed.length + result.refused.length + result.unreadable.length;
  const lines = [];
  if (result.installed.length > 0) {
    lines.push(`Installed: ${result.installed.join(', ')}`);
  }
  if (result.removed.length > 0) {
    lines.push(`Removed: ${result.removed.join(', ')}`);
  }
  result.refused.forEach((item) => lines.push(`Skipped ${item.name} because ${item.reason}.`));
  result.unreadable.forEach((fileName) => lines.push(`Skipped ${fileName} because it contains no mod information.`));
  if (result.failed.length > 0) {
    lines.push(`${LOADER_NAME} did not install: ${result.failed.join(', ')}. Its log records why.`);
  }
  if (result.unmanaged.length > 0) {
    lines.push(`Installed in ${LOADER_NAME} but not deployed by Vortex, so left alone: `
      + `${result.unmanaged.join(', ')}.`);
  }
  const changed = result.installed.length + result.removed.length;
  api.sendNotification({
    id: NOTIF_ID,
    type: problems > 0 ? 'warning' : 'success',
    message: (changed === 0)
      ? (problems === 0
        ? `Mods already match ${LOADER_NAME}`
        : `Nothing installed - ${problems} mod(s) skipped`)
      : `Installed ${result.installed.length}, removed ${result.removed.length}`,
    displayMS: problems > 0 ? undefined : 8000,
    allowSuppress: false,
    actions: (lines.length === 0) ? undefined : [
      {
        title: 'Details',
        action: (dismiss) => {
          api.showDialog('info', `${LOADER_NAME} Results`, { text: lines.join('\n') }, [
            ...((result.unmanaged.length === 0) ? [] : [{
              label: 'Remove Those', action: () => {
                removeUnmanagedMods(api, result.unmanaged).catch((err) => reportSyncError(api, err));
                dismiss();
              }
            }]),
            {
              label: 'Open Log', action: () => {
                util.opn(path.join(getSnakeBite(), LOADER_LOG_PATH)).catch(() => null);
                dismiss();
              }
            },
            { label: 'Close', action: () => dismiss() },
          ]);
        },
      },
    ],
  });
}

//Bring the game in line with what Vortex has deployed: remove the mods that are gone, install the
//ones that are new, then read the database back to find out what actually happened.
async function syncMods(api) {
  const gamePath = getDiscoveryPath(api);
  if (gamePath === undefined) {
    throw new util.ProcessCanceled(`${GAME_NAME_SHORT} has not been discovered yet`);
  }
  const plan = await planSync(api, gamePath);
  const check = await checkInstallCandidates(plan.toInstall, plan.installed);
  if (check.conflicts.length > 0) {
    await confirmConflicts(api, check.conflicts);
  }
  if ((plan.toUninstall.length === 0) && (check.accepted.length === 0)) {
    notifySyncResult(api, {
      installed: [], removed: [], failed: [], refused: check.refused,
      unreadable: plan.unreadable, unmanaged: plan.unmanaged,
    });
    return;
  }
  if (plan.toUninstall.length > 0) {
    await runLoaderCommand(api, [LOADER_ARG_UNINSTALL, ...plan.toUninstall],
      `Removing ${plan.toUninstall.length} mod(s) with ${LOADER_NAME}`);
  }
  if (check.accepted.length > 0) {
    //the checks are skipped here on purpose - see the note at the top of this section
    await runLoaderCommand(api,
      [LOADER_ARG_INSTALL, ...check.accepted.map((mod) => mod.file), LOADER_ARG_SKIP_CHECKS],
      `Installing ${check.accepted.length} mod(s) with ${LOADER_NAME}`);
  }
  //a mod that is dropped is not reported anywhere, so the database is the only way to tell
  const afterNames = ((await readInstalledMods(gamePath)) ?? []).map((mod) => mod.name);
  const installed = check.accepted.filter((mod) => afterNames.includes(mod.name)).map((mod) => mod.name);
  const failed = check.accepted.filter((mod) => !afterNames.includes(mod.name)).map((mod) => mod.name);
  const removed = plan.toUninstall.filter((name) => !afterNames.includes(name));
  const ledger = plan.ledger.filter((name) => !removed.includes(name));
  //anything both deployed and installed is a mod Vortex is managing, whoever installed it first -
  //adopting it means a later removal in Vortex takes it back out of the game
  afterNames.filter((name) => plan.deployedNames.includes(name)).forEach((name) => {
    if (!ledger.includes(name)) {
      ledger.push(name);
    }
  });
  await writeLedger(ledger);
  notifySyncResult(api, {
    installed, removed, failed, refused: check.refused,
    unreadable: plan.unreadable, unmanaged: plan.unmanaged,
  });
}

//Mods the user installed themselves are never removed as part of a sync, but leaving an older copy
//of a mod installed means it fights the deployed one over the same game files - so removing them is
//offered as its own deliberate step.
async function removeUnmanagedMods(api, names) {
  const gamePath = getDiscoveryPath(api);
  if (gamePath === undefined) {
    throw new util.ProcessCanceled(`${GAME_NAME_SHORT} has not been discovered yet`);
  }
  const t = api.translate;
  const result = await api.showDialog('question', t('Remove mods Vortex does not manage?'), {
    text: `${LOADER_NAME} has these mods installed, but Vortex has not deployed them and did not `
        + `install them:\n\n${names.map((name) => `- ${name}`).join('\n')}\n\n`
        + `Removing them leaves the game with only the mods Vortex has deployed. Keep them if you `
        + `installed them deliberately.`,
  }, [
    { label: 'Cancel' },
    { label: 'Remove Them' },
  ]);
  if (result.action === 'Cancel') {
    return;
  }
  await runLoaderCommand(api, [LOADER_ARG_UNINSTALL, ...names],
    `Removing ${names.length} mod(s) with ${LOADER_NAME}`);
  const afterNames = ((await readInstalledMods(gamePath)) ?? []).map((mod) => mod.name);
  const removed = names.filter((name) => !afterNames.includes(name));
  api.sendNotification({
    id: `${GAME_ID}-sync`,
    type: (removed.length === names.length) ? 'success' : 'warning',
    message: (removed.length === names.length)
      ? `Removed ${removed.length} mod(s)`
      : `Removed ${removed.length} of ${names.length} mod(s) - ${LOADER_NAME}'s log records why`,
    displayMS: (removed.length === names.length) ? 8000 : undefined,
  });
}

//Purging removes the deployed files from the game folder, but by then those mods are inside the
//game's own archives - so unless they are taken out first, the game stays modded with the files
//that would undo it gone. Only the mods installed from here are removed.
async function purgeInstalledMods(api) {
  const gamePath = getDiscoveryPath(api);
  if (gamePath === undefined) {
    return;
  }
  const installed = await readInstalledMods(gamePath);
  if (installed === undefined) {
    return; //the mod loader was never set up, so it has nothing installed
  }
  const installedNames = installed.map((mod) => mod.name);
  const ledger = await readLedger();
  const names = ledger.filter((name) => installedNames.includes(name));
  if (names.length === 0) {
    return;
  }
  const t = api.translate;
  const result = await api.showDialog('question', t('Remove these mods from the game as well?'), {
    text: `Vortex is about to remove the mod files it deployed, but ${names.length} of them are `
        + `installed inside the game's own archives and would be left in the game:\n\n`
        + `${names.map((name) => `- ${name}`).join('\n')}\n\n`
        + `${LOADER_NAME} can take them out first. That repacks the game archives, so it takes a `
        + `while. Mods installed outside Vortex are left alone either way.`,
  }, [
    { label: 'Leave Them Installed' },
    { label: 'Remove Them' },
  ]);
  if (result.action === 'Leave Them Installed') {
    return;
  }
  await runLoaderCommand(api, [LOADER_ARG_UNINSTALL, ...names],
    `Removing ${names.length} mod(s) with ${LOADER_NAME}`);
  const afterNames = ((await readInstalledMods(gamePath)) ?? []).map((mod) => mod.name);
  const removed = names.filter((name) => !afterNames.includes(name));
  await writeLedger(ledger.filter((name) => !removed.includes(name)));
  api.sendNotification({
    id: `${GAME_ID}-sync`,
    type: (removed.length === names.length) ? 'success' : 'warning',
    message: (removed.length === names.length)
      ? `Removed ${removed.length} mod(s) from the game`
      : `Removed ${removed.length} of ${names.length} mod(s) - ${LOADER_NAME}'s log records why`,
    displayMS: (removed.length === names.length) ? 8000 : undefined,
  });
}

async function willPurge(api, profileId) {
  const profile = selectors.profileById(api.getState(), profileId);
  if ((profile?.gameId !== GAME_ID) || !isUninstallOnPurgeEnabled(api)) {
    return;
  }
  try {
    await purgeInstalledMods(api);
  } catch (err) { //a failure here must not stop the purge itself
    reportSyncError(api, err, `Failed to remove mods with ${LOADER_NAME}`);
  }
}

//A purge takes the deployed files away, but any mod already installed is inside the game archives
//by then - so unless it was removed first, the game is still modded and the files that would undo
//it are gone. Say so once the purge is done, and offer the one command that still puts it back.
async function didPurge(api, profileId) {
  const profile = selectors.profileById(api.getState(), profileId);
  if (profile?.gameId !== GAME_ID) {
    return;
  }
  const gamePath = getDiscoveryPath(api);
  if (gamePath === undefined) {
    return;
  }
  const installed = await readInstalledMods(gamePath)
    .catch(err => { //nothing here is worth interrupting a purge over
      log('warn', `Could not read what ${LOADER_NAME} has installed: ${err}`);
      return undefined;
    });
  if ((installed === undefined) || (installed.length === 0)) {
    return;
  }
  const NOTIF_ID = `${GAME_ID}-purge`;
  const MESSAGE = `${LOADER_NAME} still has ${installed.length} mod(s) installed in the game`;
  const MORE_TEXT =
    `Purging removed the mod files Vortex deployed, but those may be installed stil in the game archives. `
    + `"Restore Vanilla Game Files" button will clear the game files: ${LOADER_NAME_SHORT} puts the game archives back to `
    + `a vanilla state. It removes every mod, including any installed outside Vortex, `
    + `and ${LOADER_NAME_SHORT} runs its setup wizard the next time it is started.\n\n`
    + `If you would rather keep the game as it is, no action is required - deploy again and use `
    + `"Install Mods with ${LOADER_NAME_SHORT}" to get back in sync. To have future purges restore vanilla game files automatically, `
    + `turn on "Remove mods from the game when purging" under Settings > Mods.`;
  const startRestore = (dismiss) => {
    restoreOriginalFiles(api)
      .catch((err) => reportSyncError(api, err, 'Failed to restore vanilla game files'));
    dismiss();
  };
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Restore',
        action: startRestore,
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, { text: MORE_TEXT }, [
            { label: 'Restore Vanilla Game Files', action: () => startRestore(dismiss) },
            { label: 'Continue', action: () => dismiss() },
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

//The mod loader can put the game archives back the way they were before it ever touched them. That
//undoes every mod, including the ones installed outside Vortex, and it discards its own database,
//so it runs its setup again the next time it is started. Always the user's own decision.
async function restoreOriginalFiles(api) {
  const t = api.translate;
  const result = await api.showDialog('question', t('Restore vanilla game files?'), {
    text: `${LOADER_NAME} will put the game archives back the way they were before any mod was `
        + `installed. This removes every installed mod, including any installed outside Vortex, and `
        + `clears ${LOADER_NAME}'s record of them, so it runs its setup again the next time it is `
        + `started.\n\n`
        + `Nothing in Vortex is deleted. The deployed mod files stay where they are and can be put `
        + `back into the game with "Install Mods with ${LOADER_NAME_SHORT}".`,
  }, [
    { label: 'Cancel' },
    { label: 'Restore Vanilla' },
  ]);
  if (result.action === 'Cancel') {
    return;
  }
  //this argument only works on its own, so the switch that closes the mod loader is left off and
  //its window may stay open until it is closed by hand
  await runLoaderCommand(api, [LOADER_ARG_RESTORE],
    `Restoring vanilla game files with ${LOADER_NAME}`, { close: false });
  await writeLedger([]);
  const gamePath = getDiscoveryPath(api);
  const remaining = (gamePath === undefined) ? [] : ((await readInstalledMods(gamePath)) ?? []);
  api.sendNotification({
    id: `${GAME_ID}-sync`,
    type: (remaining.length === 0) ? 'success' : 'warning',
    message: (remaining.length === 0)
      ? 'Vanilla game files have been restored'
      : `${LOADER_NAME} still has ${remaining.length} mod(s) installed - its log records why`,
    displayMS: (remaining.length === 0) ? 8000 : undefined,
  });
}

//Everything the user can trigger reports through a notification rather than throwing.
function reportSyncError(api, err, title) {
  if (err instanceof util.UserCanceled) {
    return;
  }
  if (err instanceof util.ProcessCanceled) {
    api.sendNotification({ type: 'warning', message: err.message, displayMS: 10000 });
    return;
  }
  api.showErrorNotification(title ?? `Failed to sync mods with ${LOADER_NAME}`, err,
    { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
}

function startSync(api) {
  syncMods(api).catch((err) => reportSyncError(api, err));
}

//Both switches live under Settings > Mods rather than being fixed behaviour: each one makes the
//game archives repack without being asked, which takes minutes, so it has to be the user's choice.
function GameSettings() {
  const { Toggle, More } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');
  const dispatch = useDispatch();
  const autoSync = useSelector((state) => util.getSafe(state, ['settings', GAME_ID, SETTING_AUTO_SYNC], false));
  const purgeSync = useSelector((state) => util.getSafe(state, ['settings', GAME_ID, SETTING_UNINSTALL_ON_PURGE], false));
  const onToggleAutoSync = React.useCallback((checked) => dispatch(setAutoSyncOnDeploy(checked)), [dispatch]);
  const onTogglePurgeSync = React.useCallback((checked) => dispatch(setUninstallOnPurge(checked)), [dispatch]);
  return React.createElement('form', null,
    React.createElement('div', { className: 'settings-group' },
      React.createElement(Toggle, { checked: autoSync, onToggle: onToggleAutoSync },
        `Install mods with ${LOADER_NAME_SHORT} after deploying`,
        React.createElement(More, { id: `${GAME_ID}-auto-sync-more`, name: 'Install After Deploying' },
          `Runs the same sync as the "Install Mods with ${LOADER_NAME_SHORT}" button every time mods are `
          + `deployed, instead of showing a notification with a button on it.\n\n`
          + `A sync repacks the game archives, so leaving this off keeps deploying quick and puts the `
          + `sync on your schedule.`,
        ),
      ),
      React.createElement(Toggle, { checked: purgeSync, onToggle: onTogglePurgeSync },
        `Restore vanilla game files when purging (${LOADER_NAME_SHORT})`,
        React.createElement(More, { id: `${GAME_ID}-purge-sync-more`, name: 'Remove When Purging' },
          `Purging removes the deployed mod files, but by then those mods are inside the game archives, `
          + `so the game stays modded with the files that would undo it gone. With this on, `
          + `${LOADER_NAME_SHORT} is asked to take them out first.\n\n`
          + `Only mods installed through Vortex are removed, and you are asked before anything happens.`,
        ),
      ),
    ),
  );
}

//Notify User to run TFC Installer after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = "SnakeBite";
  const MESSAGE = snakeBiteCliSync
    ? `Sync Mods to ${MOD_NAME} to Finish Installing`
    : `Run ${MOD_NAME} to Install Mods`;
  const MORE_TEXT = snakeBiteCliSync
    ? `Deploying only places mods in "<GameFolder>\\${MOD_PATH}". They are not in the game until `
      + `${MOD_NAME} installs them into the game archives.\n\n`
      + `"Sync" does that for you: it installs everything Vortex has deployed and is not installed yet, `
      + `and removes the mods it previously installed that Vortex no longer has. Mods you installed `
      + `yourself in ${MOD_NAME} are left alone - Sync reports them but never removes them on its own.\n\n`
      + `Syncing repacks the game archives, so it can take a while for large mods. The same button is on `
      + `the Mods toolbar, and ${MOD_NAME} can still be run by hand from the "Tools" tab.\n`
    : `For most mods, you must use ${MOD_NAME} to install the mod to the game files after installing with Vortex.\n`
      + `Mods requiring installation will be found in the folder: "<GameFolder>\\${MOD_PATH}".\n`
      + `If you don't see your mod's folder there, check in the root game folder.\n`
      + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Tools" tab).\n`;
  const actions = [];
  if (snakeBiteCliSync) {
    actions.push({
      title: 'Sync',
      action: (dismiss) => {
        startSync(api);
        dismiss();
      },
    });
  }
  actions.push({
    title: 'Run SB',
    action: (dismiss) => {
      runModManager(api);
      dismiss();
    },
  });
  actions.push({
    title: 'More',
    action: (dismiss) => {
      const buttons = [];
      if (snakeBiteCliSync) {
        buttons.push({
          label: 'Sync', action: () => {
            startSync(api);
            dismiss();
          }
        });
      }
      buttons.push({
        label: 'Run SB', action: () => {
          runModManager(api);
          dismiss();
        }
      });
      buttons.push({ label: 'Continue', action: () => dismiss() });
      buttons.push({
        label: 'Never Show Again', action: () => {
          api.suppressNotification(NOTIF_ID);
          dismiss();
        }
      });
      api.showDialog('question', MESSAGE, { text: MORE_TEXT }, buttons);
    },
  });
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions,
  });
}

function runModManager(api) {
  const TOOL_ID = LOADER_ID;
  const TOOL_NAME = LOADER_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false })
        .catch(err => api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    }
    else {
      return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, `Path to ${TOOL_NAME} executable could not be found. Ensure ${TOOL_NAME} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
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
  if (hasXbox || multiExe) {
    GAME_VERSION = await setGameVersion(GAME_PATH);
  }
  if (setupNotification) setupNotify(api);
  //await fs.ensureDirWritableAsync(CONFIG_PATH);
  if (hasLoader) {
    await downloadLoader(api, gameSpec);
    //catches an update that was installed while another game was active, and a mod loader that was
    //uninstalled outside of Vortex
    const loaderMod = Object.values(api.getState().persistent.mods[GAME_ID] ?? {})
      .find(mod => mod.type === LOADER_ID);
    if (loaderMod !== undefined) {
      await syncLoaderInstall(api, loaderMod.id);
    }
  }
  if (allowMgsvFix) downloadMgsvFixNotify(api);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = { //register game
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

  /*register mod types explicitly
  context.registerModType(CONFIG_ID, 60,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, CONFIG_PATH),
    () => Promise.resolve(false),
    { name: CONFIG_NAME }
  ); //*/
  /*context.registerModType(SAVE_ID, 62,
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
  if (allowMgsvFix) {
    context.registerModType(MGSVFIX_ID, 72,
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      },
      (game) => pathPattern(context.api, game, path.join('{gamePath}', MGSVFIX_PATH)),
      () => Promise.resolve(false),
      { name: MGSVFIX_NAME }
    );
  }

  //register mod installers
  if (hasLoader) {
    context.registerInstaller(LOADER_ID, 25, testLoader, installLoader);
  }
  if (allowMgsvFix) {
    context.registerInstaller(MGSVFIX_ID, 26, testMgsvFix, installMgsvFix);
  }
  if (rootInstaller) {
    context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  }
  if (needsModInstaller) {
    context.registerInstaller(MOD_ID, 29, testMod, (files, fileName) => installMod(context.api, files, fileName));
  }
  //context.registerInstaller(CONFIG_ID, 33, testConfig, installConfig);
  if (saveInstaller) {
    context.registerInstaller(SAVE_ID, 35, testSave, installSave);
  }
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register settings
  if (snakeBiteCliSync) {
    context.registerReducer(['settings', GAME_ID], {
      reducers: {
        [setAutoSyncOnDeploy.toString()]: (state, payload) => util.setSafe(state, [SETTING_AUTO_SYNC], payload),
        [setUninstallOnPurge.toString()]: (state, payload) => util.setSafe(state, [SETTING_UNINSTALL_ON_PURGE], payload),
      },
      defaults: { [SETTING_AUTO_SYNC]: false, [SETTING_UNINSTALL_ON_PURGE]: false },
    });
    context.registerSettings('Mods', GameSettings, () => ({}),
      () => selectors.activeGameId(context.api.getState()) === GAME_ID, 150
    );
  }

  //register actions
  if (snakeBiteCliSync) {
    context.registerAction('mod-icons', 300, LOADER_ICON_NAME, {}, `Install Mods with ${LOADER_NAME_SHORT}`, () => {
      startSync(context.api);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    });
    context.registerAction('mod-icons', 300, RESTORE_ICON_NAME, {}, `Restore Game Files (${LOADER_NAME_SHORT})`, () => {
      restoreOriginalFiles(context.api)
        .catch((err) => reportSyncError(context.api, err, 'Failed to restore vanilla game files'));
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    });
  }
  if (allowMgsvFix) { //the notification is otherwise the only install path, and "Never Show Again" would leave no way back
    context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${MGSVFIX_NAME}`, () => {
      downloadCodeberg(context.api, spec, CODEBERG_REQUIREMENTS, false);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    });
  }
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Open ${LOADER_NAME} Folder`, () => {
    const folder = getSnakeBite(context.api);
    util.opn(folder).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
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
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    if (snakeBiteCliSync) {
      installLoaderIcons();
    }
    api.onAsync('did-deploy', async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      if (snakeBiteCliSync && isAutoSyncEnabled(api)) { //the sync reports what it did, so the reminder would only repeat it
        return syncMods(api).catch(err => reportSyncError(api, err));
      }
      return deployNotify(api);
    });
    if (snakeBiteCliSync) {
      api.onAsync('will-purge', (profileId) => willPurge(api, profileId));
      api.onAsync('did-purge', (profileId) => didPurge(api, profileId));
    }
    api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return checkForCodebergUpdate(api, spec, CODEBERG_REQUIREMENTS)
        .catch(err => log('warn', `Failed to check for ${MGSVFIX_NAME} update: ${err}`));
    });
    if (hasLoader) { //updating the mod loader in Vortex only stages the installer, so run it afterwards
      api.events.on('did-install-mod', (gameId, archiveId, modId) => {
        if (gameId !== GAME_ID) return;
        syncLoaderInstall(api, modId)
          .catch(err => log('warn', `Failed to apply the ${LOADER_NAME} install: ${err}`));
      });
    }
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
