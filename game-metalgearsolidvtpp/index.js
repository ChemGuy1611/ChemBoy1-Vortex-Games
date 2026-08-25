/*///////////////////////////////////////////
Name: METAL GEAR SOLID V: THE PHANTOM PAIN Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 1.1.0
Date: 2026-08-22
Notes:
-
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
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
const LOADER_PATH = BINARIES_PATH;
const LOADER_FILE = 'SnakeBite Installer.exe';
const LOADER_INST_EXEC = LOADER_FILE;
const LOADER_EXEC = 'SnakeBite.exe';
const LOADER_PAGE_NO = 106;
const LOADER_FILE_NO = 0;
const LOADER_DOMAIN = GAME_ID;
const LOADER_URL = `XXX`; //if not on Nexus
const LOADER_REG_HIVE = 'HKEY_CURRENT_USER';
const LOADER_REG_KEY = 'SOFTWARE\\SnakeBite'; //registry path, not a file path - always backslash-separated
const LOADER_REG_VALUE = ''; //the installer records its install folder as this key's default (unnamed) value
const LOADER_SILENT_PARAMS = ['/S']; //silent switch for the installer

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
const MOD_EXTS = ['.mgsv'];
const MOD_ATTR_KEY = 'mgsvFiles';

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

//install pak mods
async function installMod(api, files, fileName) {
  const fileExt = MOD_EXTS[0];
  const modFiles = files.filter(file => (
    fileExt.includes(path.extname(file).toLowerCase())
    && path.extname(file).toLowerCase() === fileExt
  ));
  const folder = path.basename(fileName).slice(0, 20);
  const modType = {
    type: 'setmodtype',
    value: MOD_ID,
  };
  const installFiles = (modFiles.length > 1)
    ? await chooseFilesToInstall(api, modFiles, fileExt)
    : modFiles;
  const mgsvModFiles = {
    type: 'attribute',
    key: MOD_ATTR_KEY,
    value: installFiles.map(f => path.basename(f))
  };
  let instructions = installFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(folder, path.basename(file))
    };
  });
  instructions.push(modType);
  instructions.push(mgsvModFiles);
  return Promise.resolve({ instructions });
}

//file selection dialog for .mgsv mods
async function chooseFilesToInstall(api, files, fileExt) {
  const t = api.translate;
  return api.showDialog('question', t('Multiple {{ext}} files', { replace: { ext: fileExt } }), {
    text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: fileExt } }) +
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

//Notify User to run TFC Installer after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = "SnakeBite";
  const MESSAGE = `Run ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run SB',
        action: (dismiss) => {
          runModManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For most mods, you must use ${MOD_NAME} to install the mod to the game files after installing with Vortex.\n`
                + `Mods requiring installation will be found in the folder: "<GameFolder>\\${MOD_PATH}".\n`
                + `If you don't see your mod's folder there, check in the root game folder.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Tools" tab).\n`
          }, [
            {
              label: 'Run SB', action: () => {
                runModManager(api);
                dismiss();
              }
            },
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

  //register actions
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
    api.onAsync('did-deploy', async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(api);
    });
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
