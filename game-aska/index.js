/*//////////////////////////////////////////
Name: ASKA Vortex Extension
Structure: Unity BepinEx/MelonLoader Hybrid
Author: ChemBoy1
Version: 0.1.0
Date: 2025-11-22
//////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const fsExtra = require('fs-extra');
//const { parseStringPromise } = require('xml2js');

const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "aska";
const STEAMAPP_ID = "1898300";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "ASKA";
const GAME_NAME_SHORT = "ASKA";
const GAME_STRING = "Aska"; //string for exe and data folder (seem to always match)
const EXEC = `${GAME_STRING}.exe`;
const DATA_FOLDER = `${GAME_STRING}_Data`;
const DEV_REGSTRING = "Sand Sailor Studio"; //developer name
const GAME_REGSTRING = "Aska"; //game name
const XBOX_SAVE_STRING = ''; //string after "ID_"

const hasCustomMods = false; //set to true if there are modTypes with folder paths dependent on which mod loader is installed

//Data to determine BepinEx/MelonLoader versions and URLs
const BEPINEX_BUILD = 'il2cpp'; // 'mono' or 'il2cpp' - check for "il2cpp_data" folder
const ARCH = 'x64'; //'x64' or 'x86' game architecture (64-bit or 32-bit)
const BEP_VER = '5.4.23.4'; //set BepInEx version for mono URLs
const BEP_BE_VER = '738'; //set BepInEx build for BE URLs
const BEP_BE_COMMIT = 'af0cba7'; //git commit number for BE builds
const allowBepCfgMan = false; //should BepInExConfigManager be downloaded?
const allowMelPrefMan = false; //should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency
const allowBepinexNexus = false; //set false until bugs are fixed
const allowMelonNexus = false; //set false until bugs are fixed

let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let GAME_VERSION = '';
let bepinexInstalled = false;
let melonInstalled = false;
const EXEC_XBOX = 'gamelaunchhelper.exe';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//Config and save paths
const CONFIG_HIVE = 'HKEY_CURRENT_USER';
const CONFIG_REGPATH = `Software\\${DEV_REGSTRING}\\${GAME_REGSTRING}`;
const CONFIG_REGPATH_FULL = `${CONFIG_HIVE}\\${CONFIG_REGPATH}`;

const SAVE_PATH_DEFAULT = path.join(USER_HOME, 'AppData', 'LocalLow', DEV_REGSTRING, GAME_REGSTRING, 'data');
const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_SAVE_STRING}`, "SystemAppData", "wgs"); //XBOX Version
let SAVE_PATH = SAVE_PATH_DEFAULT;
const SAVE_EXTS = [".json"];

//info for modtypes, installers, and tools
const BEPINEX_ID = `${GAME_ID}-bepinex`;
const BEPINEX_NAME = "BepInEx Injector";
let BEPINEX_FILE = 'BepInEx.Core.dll';
let BEP_INDICATOR_FILE = path.join('BepInEx', 'core', BEPINEX_FILE);
if (BEPINEX_BUILD === 'mono') {
  BEPINEX_FILE = 'BepInEx.dll';
  BEP_INDICATOR_FILE = path.join('BepInEx', 'core', BEPINEX_FILE);
}
const BEPINEX_FOLDER = 'BepInEx';
const BEP_STRING = 'BepInEx';
const BEP_PATCHER_STRING = 'BaseUnityPlugin';

let BEPINEX_URL = `https://builds.bepinex.dev/projects/bepinex_be/738/BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.${BEP_BE_VER}%2B${BEP_BE_COMMIT}.zip`;
let BEPINEX_URL_ERR = `https://builds.bepinex.dev/projects/bepinex_be`;
let BEPINEX_ZIP = `BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.${BEP_BE_VER}+${BEP_BE_COMMIT}.zip`;
if (BEPINEX_BUILD === 'mono') {
  BEPINEX_ZIP = `BepInEx_win_${ARCH}_${BEP_VER}.zip`;
  BEPINEX_URL = `https://github.com/BepInEx/BepInEx/releases/download/v${BEP_VER}/${BEPINEX_ZIP}`;
  BEPINEX_URL_ERR = `https://github.com/BepInEx/BepInEx/releases`;
}

let MELON_STRING = 'IL2CPP';
if ( BEPINEX_BUILD === 'mono') {
  MELON_STRING = 'Mono';
}
const MELON_ID = `${GAME_ID}-melonloader`;
const MELON_NAME = "MelonLoader";
const MELON_ZIP = `MelonLoader.${ARCH}.zip`;
const MELON_URL = `https://github.com/LavaGang/MelonLoader/releases/latest/download/${MELON_ZIP}`;
const MELON_URL_ERR = `https://github.com/LavaGang/MelonLoader/releases`;
const MELON_FILE = 'MelonLoader.dll';
const MELON_FOLDER = 'MelonLoader';
const MEL_STRING = 'MelonLoader';
const MEL_PLUGIN_STRING = 'MelonPlugin';
const MELON_INDICATOR_FILE = path.join('MelonLoader', 'net6', MELON_FILE);

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";

const ASSEMBLY_ID = `${GAME_ID}-assemblydll`;
const ASSEMBLY_NAME = "Assembly DLL Mod";
let ASSEMBLY_PATH = '.';
let ASSEMBLY_FILES = ["GameAssembly.dll"];
if (BEPINEX_BUILD === 'mono') {
  ASSEMBLY_PATH = path.join(DATA_FOLDER, 'Managed');
  ASSEMBLY_FILES = ["Assembly-CSharp.dll", "Assembly-CSharp-firstpass.dll"];
}

const ASSETS_ID = `${GAME_ID}-assets`;
const ASSETS_NAME = "Assets/Resources File";
const ASSETS_PATH = DATA_FOLDER;
const ASSETS_EXTS = ['.assets', '.resource', '.ress'];

const PLUGIN_EXTS = ['.dll'];

const BEPINEX_MOD_ID = `${GAME_ID}-bepinexmod`;
const BEPINEX_MOD_NAME = "BepInEx Mod";
const BEPINEX_MOD_PATH = BEPINEX_FOLDER;
const BEPINEX_MOD_FOLDERS = ['plugins', 'patchers', 'config'];

const MELON_MOD_ID = `${GAME_ID}-melonmod`;
const MELON_MOD_NAME = "MelonLoader Mod";
const MELON_MOD_PATH = '.';
const MELON_MOD_FOLDERS = ['mods', 'plugins', 'userdata', 'userlibs'];

const BEPINEX_PLUGINS_ID = `${GAME_ID}-bepinex-plugins`;
const BEPINEX_PLUGINS_NAME = "BepInEx Plugins";
const BEPINEX_PLUGINS_FOLDER = 'plugins';
const BEPINEX_PLUGINS_PATH = path.join(BEPINEX_FOLDER, BEPINEX_PLUGINS_FOLDER);

const BEPINEX_PATCHERS_ID = `${GAME_ID}-bepinex-patchers`;
const BEPINEX_PATCHERS_NAME = "BepInEx Patchers";
const BEPINEX_PATCHERS_FOLDER = 'patchers';
const BEPINEX_PATCHERS_PATH = path.join(BEPINEX_FOLDER, BEPINEX_PATCHERS_FOLDER);

const BEPINEX_CONFIG_ID = `${GAME_ID}-bepinex-config`;
const BEPINEX_CONFIG_NAME = "BepInEx Config";
const BEPINEX_CONFIG_FOLDER = 'config';
const BEPINEX_CONFIG_PATH = path.join(BEPINEX_FOLDER, BEPINEX_CONFIG_FOLDER);

const MELON_MODS_ID = `${GAME_ID}-melonloader-mods`;
const MELON_MODS_NAME = "MelonLoader Mods";
const MELON_MODS_FOLDER = 'Mods';
const MELON_MODS_PATH = MELON_MODS_FOLDER;

const MELON_PLUGINS_ID = `${GAME_ID}-melonloader-plugins`;
const MELON_PLUGINS_NAME = "MelonLoader Plugins";
const MELON_PLUGINS_FOLDER = 'Plugins';
const MELON_PLUGINS_PATH = MELON_PLUGINS_FOLDER;

const MELON_CONFIG_ID = `${GAME_ID}-melonloader-config`;
const MELON_CONFIG_NAME = "MelonLoader Config";
const MELON_CONFIG_FOLDER = 'UserData';
const MELON_CONFIG_PATH = MELON_CONFIG_FOLDER;

const BEPCFGMAN_ID = `${GAME_ID}-bepcfgman`;
const BEPCFGMAN_NAME = "BepInExConfigManager";
const BEPCFGMAN_PATH = BEPINEX_MOD_PATH;
const BEPCFGMAN_URL = `https://github.com/sinai-dev/BepInExConfigManager/releases/latest/download/BepInExConfigManager.${BEPINEX_BUILD}.zip`;
const BEPCFGMAN_URL_ERR = `https://github.com/sinai-dev/BepInExConfigManager/releases`;
const BEPCFGMAN_FILE = `bepinexconfigmanager.${BEPINEX_BUILD}.dll`; //lowercased

const MELONPREFMAN_ID = `${GAME_ID}-melonprefman`;
const MELONPREFMAN_NAME = "MelonPreferencesManager";
const MELONPREFMAN_PATH = MELON_MODS_PATH;
const MELONPREFMAN_URL = `https://github.com/Bluscream/MelonPreferencesManager/releases/latest/download/MelonPrefManager.${MELON_STRING}.dll`;
const MELONPREFMAN_URL_ERR = `https://github.com/Bluscream/MelonPreferencesManager/releases`;
const MELONPREFMAN_FILE = `melonprefmanager.${BEPINEX_BUILD}.dll`; //lowercased

const BEP_CONFIG_FILE = 'BepInEx.cfg';
const BEP_CONFIG_FILEPATH = path.join(BEPINEX_CONFIG_PATH, BEP_CONFIG_FILE);
const MEL_CONFIG_FILE = 'Loader.cfg';
const MEL_CONFIG_FILEPATH = path.join(MELON_CONFIG_PATH, MEL_CONFIG_FILE);

const BEP_LOG_FILE = 'LogOutput.log';
const BEP_LOG_FILEPATH = path.join(BEPINEX_FOLDER, BEP_LOG_FILE);
const MEL_LOG_FILE = 'Latest.log';
const MEL_LOG_FILEPATH = path.join(MELON_FOLDER, MEL_LOG_FILE);

const CUSTOM_ID = `${GAME_ID}-custommod`;
const CUSTOM_NAME = "XXX";
const CUSTOM_FOLDER = 'XXX';
const CUSTOM_PATH_BEPINEX = path.join(BEPINEX_PLUGINS_PATH, CUSTOM_FOLDER);
const CUSTOM_PATH_MELON = path.join(MELON_MODS_PATH, CUSTOM_FOLDER);
let CUSTOM_PATH = '';
/*const CUSTOM_PATH_BEPINEX = path.join(BEPINEX_PLUGINS_PATH);
const CUSTOM_PATH_MELON = path.join(MELON_MODS_PATH); //*/
const CUSTOM_STRING = '.custom.json';
const CUSTOM_EXTS = ['.json'];

const DEPLOY_FILE = `vortex.deployment.${CUSTOM_ID}.json`;
const CUSTOM_DEPLOYFILE_BEPINEX = path.join(CUSTOM_PATH_BEPINEX, DEPLOY_FILE);
const CUSTOM_DEPLOYFILE_MELON = path.join(CUSTOM_PATH_MELON, DEPLOY_FILE);

const MOD_PATH_DEFAULT = ".";
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'manifest.json'), path.join('**', 'icon.png'), path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'manifest.json'), path.join('**', 'icon.png'), path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
let MODTYPE_FOLDERS = [ASSEMBLY_PATH, ASSETS_PATH, BEPINEX_PATCHERS_PATH, BEPINEX_PLUGINS_PATH, BEPINEX_CONFIG_PATH, MELON_PLUGINS_PATH, MELON_MODS_PATH, MELON_CONFIG_PATH];
if (hasCustomMods) {
  MODTYPE_FOLDERS.push(CUSTOM_PATH_BEPINEX, CUSTOM_PATH_MELON);
}

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    //"parameters": PARAMETERS,
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
      //"supportsSymlinks": false,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": BEPINEX_MOD_ID,
      "name": BEPINEX_MOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPINEX_MOD_PATH)
    },
    {
      "id": MELON_MOD_ID,
      "name": MELON_MOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MELON_MOD_PATH)
    }, //*/
    {
      "id": BEPINEX_PLUGINS_ID,
      "name": BEPINEX_PLUGINS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPINEX_PLUGINS_PATH)
    },
    {
      "id": BEPINEX_PATCHERS_ID,
      "name": BEPINEX_PATCHERS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPINEX_PATCHERS_PATH)
    },
    {
      "id": BEPINEX_CONFIG_ID,
      "name": BEPINEX_CONFIG_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPINEX_CONFIG_PATH)
    },
    {
      "id": MELON_MODS_ID,
      "name": MELON_MODS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MELON_MODS_PATH)
    },
    {
      "id": MELON_PLUGINS_ID,
      "name": MELON_PLUGINS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MELON_PLUGINS_PATH)
    },
    {
      "id": MELON_CONFIG_ID,
      "name": MELON_CONFIG_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MELON_CONFIG_PATH)
    },
    {
      "id": ASSEMBLY_ID,
      "name": ASSEMBLY_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', ASSEMBLY_PATH)
    },
    {
      "id": BEPCFGMAN_ID,
      "name": BEPCFGMAN_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPCFGMAN_PATH)
    },
    {
      "id": MELONPREFMAN_ID,
      "name": MELONPREFMAN_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MELONPREFMAN_PATH)
    },
    {
      "id": ASSETS_ID,
      "name": ASSETS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', ASSETS_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": BEPINEX_ID,
      "name": BEPINEX_NAME,
      "priority": "low",
      "targetPath": '{gamePath}'
    },
    {
      "id": MELON_ID,
      "name": MELON_NAME,
      "priority": "low",
      "targetPath": '{gamePath}'
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: `${GAME_ID}-customlaunch`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: []
  }, //*/
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////

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
          },
      });
  } //*/
  if (store === 'epic' && (DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID))) {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  /*
  if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct save folder for game version
async function getSavePath(api) {
  GAME_PATH = getDiscoveryPath(api);
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(GAME_PATH, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    SAVE_PATH = SAVE_PATH_XBOX;
    return SAVE_PATH;
  }
  else {
    SAVE_PATH = SAVE_PATH_DEFAULT;
    return SAVE_PATH;
  };
} //*/

//Get correct executable for game version
function getExecutable(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    return EXEC_XBOX;
  };
  return EXEC;
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

//Get correct custom folder for installed mod loader
function getCustomFolder(api, game) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return '.';
  }
  bepinexInstalled = isBepinexInstalled(api, spec);
  melonInstalled = isMelonInstalled(api, spec);
  if (bepinexInstalled) {
    CUSTOM_PATH = CUSTOM_PATH_BEPINEX;
    try {
      fs.statSync(path.join(GAME_PATH, CUSTOM_DEPLOYFILE_MELON));
      fsExtra.unlinkSync(path.join(GAME_PATH, CUSTOM_DEPLOYFILE_MELON));
    } catch (err) {
      //log('warn', `Failed to remove ${CUSTOMCHAR_DEPLOYFILE_MELON}: ${err.message}`);
    }
  };
  if (melonInstalled) {
    CUSTOM_PATH = CUSTOM_PATH_MELON;
    try {
      fs.statSync(path.join(GAME_PATH, CUSTOM_DEPLOYFILE_BEPINEX));
      fsExtra.unlinkSync(path.join(GAME_PATH, CUSTOM_DEPLOYFILE_BEPINEX));
    } catch {
      //log('warn', `Failed to remove ${CUSTOMCHAR_DEPLOYFILE_BEPINEX}: ${err.message}`);
    }
  };
  const folderPath = path.join(GAME_PATH, CUSTOM_PATH);
  return folderPath;
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

//Test for BepinEx files
function testBepinex(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === BEPINEX_FILE));
  const isFolder = files.some(file => (path.basename(file) === BEPINEX_FOLDER));
  let supported = (gameId === spec.game.id) && isMod && isFolder;

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

//Install BepInEx files
function installBepinex(files) {
  const MOD_TYPE = BEPINEX_ID;
  const modFile = files.find(file => (path.basename(file) === BEPINEX_FOLDER));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))
  ));
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

//Test for MelonLoader files
function testMelon(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === MELON_FILE));
  const isFolder = files.some(file => (path.basename(file) === MELON_FOLDER));
  let supported = (gameId === spec.game.id) && isMod && isFolder;

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

//Install MelonLoader files
function installMelon(files) {
  const MOD_TYPE = MELON_ID;
  const modFile = files.find(file => (path.basename(file) === MELON_FOLDER));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))
  ));
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

//Test for BepinExConfigManager mod files
function testBepCfgMan(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === BEPCFGMAN_FILE));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === 'plugins'));
  let supported = (gameId === spec.game.id) && isMod && isFolder;

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

//Install BepinExConfigManager mod files
function installBepCfgMan(files) {
  const MOD_TYPE = BEPCFGMAN_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === 'plugins'));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))
  ));
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

//Test for MelonPreferencesManager mod files
function testMelonPrefMan(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === MELONPREFMAN_FILE));
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

//Install MelonPreferencesManager mod files
function installMelonPrefMan(files) {
  const MOD_TYPE = MELONPREFMAN_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MELONPREFMAN_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))
  ));
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

//Test for Assembly mod files
function testAssembly(files, gameId) {
  const isMod = files.some(file => ASSEMBLY_FILES.includes(path.basename(file)));
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

//Install Assembly mod files
function installAssembly(files) {
  const MOD_TYPE = ASSEMBLY_ID;
  const modFile = files.find(file => ASSEMBLY_FILES.includes(path.basename(file)));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))
  ));
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
  const isMod = files.some(file => (path.basename(file) === DATA_FOLDER));
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
  const modFile = files.find(file => (path.basename(file) === DATA_FOLDER));
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

//Installer Test for assets files
function testAssets(files, gameId) {
  const isMod = files.some(file => ASSETS_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install assets files
function installAssets(files) {
  const modFile = files.find(file => ASSETS_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ASSETS_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
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

//Test for Assembly mod files
function testCustom(files, gameId) {
  const isMod = files.some(file => (CUSTOM_EXTS.includes(path.extname(file).toLowerCase())));
  const isString = files.some(file => (path.basename(file).toLowerCase().includes(CUSTOM_STRING)));
  let supported = (gameId === spec.game.id) && isMod && isString;

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

//Install Assembly mod files
function installCustom(files) {
  const MOD_TYPE = CUSTOM_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  const modFile = files.find(file => (CUSTOM_EXTS.includes(path.extname(file).toLowerCase())));
  /*let modFile = files.find(file => (path.basename(file) === CUSTOM_FOLDER)); //check for folder and use to index if it's there.
  let folder  = '.';
  if (modFile === undefined) {
    modFile = files.find(file => (CUSTOM_EXTS.includes(path.extname(file).toLowerCase())));
    folder =  CUSTOM_FOLDER;
  } //*/
  const DATA_FILE = path.basename(modFile, '.custom.json');
  const idx = modFile.indexOf(DATA_FILE);
  const rootPath = path.dirname(modFile);
 
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) 
    && (!file.endsWith(path.sep))
  ));
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: file.substr(idx),
      //destination: path.join(folder, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Fallback installer to Binaries folder
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

//Fallback installer to Binaries folder
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
  const NOTIF_ID = `${GAME_ID}-fallbackinstaller`;
  modName = path.basename(modName, '.installing');
  const MESSAGE = 'Fallback installer reached for ' + modName;
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
            text: `The mod you just installed reached the fallback installer. This means Vortex could not determine where to place these mod files.\n`
                + `Please check the mod page description and review the files in the mod staging folder to determine if manual file manipulation is required.\n`
                + `\n`
                + `Mod Name: ${modName}.\n`
                + `\n`             
          }, [
            { label: 'Continue', action: () => dismiss() },
            {
              label: 'Open Staging Folder', action: () => {
                util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
                dismiss();
              }
            }, //*/
            //*
            { label: `Open Nexus Mods Page`, action: () => {
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
          ]);
        },
      },
    ],
  });
}

//Installer Test for plugin files
function testPlugin(files, gameId) {
  const isMod = files.some(file => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install plugin files
async function installPlugin(api, gameSpec, files, workingDir) {
  const modFile = files.find(file => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
  let idx = modFile.indexOf(path.basename(modFile));
  let rootPath = path.dirname(modFile);
  let setModTypeInstruction = {};
  const MOD_NAME = path.basename(workingDir).replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*/gi, '');

  // logic to parse dll files to determine if they are MelonLoader plugins or BepInEx plugins
  let isBepinex = false;
  let isBepinexPatcher = false;
  let isMelon = false;
  let isMelonPlugin = false;
  bepinexInstalled = isBepinexInstalled(api, gameSpec);
  melonInstalled = isMelonInstalled(api, gameSpec);

  // detect plugin types by reading DLL contents
  await Promise.all(files.map(async file => {
    if (PLUGIN_EXTS.includes(path.extname(file).toLowerCase())) {
      try {
        const content = await fs.readFileAsync(path.join(workingDir, file), 'utf8');
        if (content.includes(BEP_STRING)) {
            isBepinex = true;
            isBepinexPatcher = false; //temporary, find reliable string to id patchers
            //isBepinexPatcher = !content.includes(BEP_PATCHER_STRING) && !files.find(file => path.extname(file).toLowerCase() = BEPINEX_PLUGINS_FOLDER);
        } else if (content.includes(MEL_STRING)) {
          isMelon = true;
          isMelonPlugin = content.includes(MEL_PLUGIN_STRING);
        }
      } catch (err) {
        api.showErrorNotification(`Failed to read mod file "${file}" to determine if for BepInEx or MelonLoader`, err);
      }
    }
  }));

  // CANCEL INSTALL CONDITIONS
  // If both BepInEx and MelonLoader plugins are detected, cancel install
  if (isBepinex && isMelon) {
    const mixedModHandling = await api.showDialog('error', 'Mixed Mod Detected', {
        bbcode: api.translate(`Vortex has detected that the ${MOD_NAME} archive has both BepInEx and MelonLoader plugins in the same archive.[br][/br][br][/br]`
            + `Mixed mods are not supported by the game extension and the mod author will need to repackage their mod.[br][/br][br][/br]`
            + `You can manually extract the correct plugin from the archive and install it to Vortex.[br][/br][br][/br]`),
        options: { order: ['bbcode'], wrap: true },
    }, [
        { label: 'Ok' }
    ]);
    if (mixedModHandling.action === 'Ok') {
        throw new util.UserCanceled();
    }
  }
  //if BepInEx plugin is installed while using MelonLoader, cancel install
  if (isBepinex && melonInstalled) {
    const wrongLoader = await api.showDialog('error', 'Wrong Mod Loader', {
        bbcode: api.translate(`Vortex has detected that the ${MOD_NAME} archive has BepInEx plugins, but you have installed MelonLoader.[br][/br][br][/br]`
            + `The installation will be cancelled to avoid issues.[br][/br][br][/br]`
            + `Check the mod's page to see if there is a MelonLoader version of the mod, or change your mod loader to BepInEx.[br][/br][br][/br]`),
        options: { order: ['bbcode'], wrap: true },
    }, [
        { label: 'Ok' }
    ]);
    if (wrongLoader.action === 'Ok') {
        throw new util.UserCanceled();
    }
  }
  //if MelonLoader plugin is installed while using BepInEx, cancel install
  if (isMelon && bepinexInstalled) {
    const wrongLoader = await api.showDialog('error', 'Wrong Mod Loader', {
        bbcode: api.translate(`Vortex has detected that the ${MOD_NAME} archive has MelonLoader plugins, but you have installed BepInEx.[br][/br][br][/br]`
            + `The installation will be cancelled to avoid issues.[br][/br][br][/br]` 
            + `Check the mod's page to see if there is a BepInEx version of the mod, or change your mod loader to MelonLoader.[br][/br][br][/br]`),
        options: { order: ['bbcode'], wrap: true },
    }, [
        { label: 'Ok' }
    ]);
    if (wrongLoader.action === 'Ok') {
        throw new util.UserCanceled();
    }
  }

  // Install method that attempts to index on folders, then dll files
  if (isBepinex && !isBepinexPatcher) {
    setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_MOD_ID };
    const folder = files.find(file => BEPINEX_MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
    if (folder !== undefined) {
      idx = folder.indexOf(`${path.basename(folder)}${path.sep}`);
      rootPath = path.dirname(folder);
    }
    if (folder === undefined) {
      setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_PLUGINS_ID };
    }
  }

  if (isBepinex && isBepinexPatcher) {
    setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_MOD_ID };
    const folder = files.find(file => BEPINEX_MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
    if (folder !== undefined) {
      idx = folder.indexOf(`${path.basename(folder)}${path.sep}`);
      rootPath = path.dirname(folder);
    }
    if (folder === undefined) {
      setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_PATCHERS_ID };
    }
  }

  if (isMelon && !isMelonPlugin) {
    setModTypeInstruction = { type: 'setmodtype', value: MELON_MOD_ID };
    const folder = files.find(file => MELON_MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
    if (folder !== undefined) {
      idx = folder.indexOf(`${path.basename(folder)}${path.sep}`);
      rootPath = path.dirname(folder);
    }
    if (folder === undefined) {
      setModTypeInstruction = { type: 'setmodtype', value: MELON_MODS_ID };
    }
  }

  if (isMelon && isMelonPlugin) {
    setModTypeInstruction = { type: 'setmodtype', value: MELON_MOD_ID };
    const folder = files.find(file => MELON_MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
    if (folder !== undefined) {
      idx = folder.indexOf(`${path.basename(folder)}${path.sep}`);
      rootPath = path.dirname(folder);
    }
    if (folder === undefined) {
      setModTypeInstruction = { type: 'setmodtype', value: MELON_PLUGINS_ID };
    }
  } //*/


  /* NORMAL INSTALL - Assign mod types
  if (isBepinex && !isBepinexPatcher) {
    setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_PLUGINS_ID };
  }
  if (isBepinex && isBepinexPatcher) {
    setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_PATCHERS_ID };
  }
  if (isMelon && !isMelonPlugin) {
    setModTypeInstruction = { type: 'setmodtype', value: MELON_MODS_ID };
  }
  if (isMelon && isMelonPlugin) {
    setModTypeInstruction = { type: 'setmodtype', value: MELON_PLUGINS_ID };
  } //*/

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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

async function relaunchExt(api) {
  return api.showDialog('info', 'Restart Required', {
    text: '\n'
        + 'The extension requires a restart to complete the Mod Loader setup.\n'
        + '\n'
        + 'The extension will purge mods and then exit - please re-activate the game via the Games page or Dashboard page.\n'
        + '\n'
        + 'IMPORTANT: You may see an External Changes dialogue. Select "Revert change (use staging file)".\n'
        + '\n',
  }, [ { label: 'Restart Extension' } ])
  .then(async () => {
    try {
      await purge(api);
      const batched = [
        actions.setDeploymentNecessary(GAME_ID, true),
        actions.setNextProfile(undefined),
      ];
      util.batchDispatch(api.store, batched);
    } catch (err) {
      api.showErrorNotification('Failed to set up Mod Loader', err);
    }
  });
}
//Function to choose mod loader
async function chooseModLoader(api, gameSpec) {
  const t = api.translate;
  const replace = {
    game: gameSpec.game.name,
    bl: '[br][/br][br][/br]',
  };
  return api.showDialog('info', 'Mod Loader Selection', {
    bbcode: t('You must choose between BepInEx and MelonLoader to install mods.{{bl}}'
      + 'Only one mod loader can be installed at a time.{{bl}}'
      + 'Make your choice based on which mods you would like to install and which loader they support.{{bl}}'
      + 'You can change which mod loader you have installed by Uninstalling the current one from Vortex, which will bring up this dialog again.{{bl}}'
      + 'Which mod loader would you like to use for {{game}}?',
      { replace }
    ),
  }, [
    { label: t('BepInEx') },
    { label: t('MelonLoader') },
  ])
  .then(async (result) => {
    if (result === undefined) {
      return;
    }
    if (result.action === 'BepInEx') {
      await downloadBepinex(api, gameSpec);
    } else if (result.action === 'MelonLoader') {
      await downloadMelon(api, gameSpec);
    }
    if (hasCustomMods) { //Run this if need to change a modType path based on the mod loader installed
      await deploy(api);
      relaunchExt(api);
    }
  });
}
//Deconflict mod loaders
async function deconflictModLoaders(api, gameSpec) {
  const t = api.translate;
  const replace = {
    game: gameSpec.game.name,
    bl: '[br][/br][br][/br]',
  };
  return api.showDialog('info', 'Mod Loader Conflict', {
    bbcode: t('You have both BepInEx and MelonLoader installed.{{bl}}'
      + 'This will cause the game to crash at launch. Only one mod loader can be installed at a time.{{bl}}'
      + 'You must choose which mod loader you would like to use for {{game}}.',
      { replace }
    ),
  }, [
    { label: t('BepInEx') },
    { label: t('MelonLoader') },
  ])
  .then(async (result) => {
    if (result === undefined) {
      return;
    }
    if (result.action === 'BepInEx') {
      await removeMelon(api, gameSpec);
    } else if (result.action === 'MelonLoader') {
      await removeBepinex(api, gameSpec);
    }
    if (hasCustomMods) { //Run this if need to change a modType path based on the mod loader installed
      await deploy(api);
      relaunchExt(api);
    }
  });
}
async function removeBepinex(api, gameSpec) {
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const mod = Object.keys(mods).find(id => mods[id]?.type === BEPINEX_ID);
  const modId = mods[mod].id
  log('warn', `Found BepInEx mod to remove for deconfliction: ${modId}`);
  try {
    await util.removeMods(api, gameSpec.game.id, [modId]);
  } catch (err) {
    api.showErrorNotification('Failed to remove BepInEx', err);
  }
}
async function removeMelon(api, gameSpec) {
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const mod = Object.keys(mods).find(id => mods[id]?.type === MELON_ID);
  const modId = mods[mod].id
  log('warn', `Found MelonLoader mod to remove for deconfliction: ${modId}`);
  try {
    await util.removeMods(api, gameSpec.game.id, [modId]);
  } catch (err) {
    api.showErrorNotification('Failed to remove MelonLoader', err);
  }
}

/*
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

//Notify User to ask if they want to download BepInExConfigManager
async function downloadBepCfgManNotify(api) {
  let isInstalled = isBepCfgManInstalled(api, spec);
  if (!isInstalled) {
    const NOTIF_ID = `${GAME_ID}-bepcfgman`;
    const MOD_NAME = BEPCFGMAN_NAME;
    const MESSAGE = `Would you like to download ${MOD_NAME}?`;
    api.sendNotification({
      id: NOTIF_ID,
      type: 'warning',
      message: MESSAGE,
      allowSuppress: true,
      actions: [
        {
          title: 'Download BepCfgMan',
          action: (dismiss) => {
            downloadBepCfgMan(api, spec);
            dismiss();
          },
        },
        {
          title: 'More',
          action: (dismiss) => {
            api.showDialog('question', MESSAGE, {
              text: `${MOD_NAME} is a mod that allows you to configure BepInEx mods with and in-game GUI.\n`
                  + `Click the button below to download and install ${BEPCFGMAN_NAME}.\n`
                  + `Once installed, the default key to show the configuration menu is F5.\n`
            }, [
                {
                  label: `Download ${MOD_NAME}`, action: () => {
                    downloadBepCfgMan(api, spec);
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
}

//Notify User to ask if they want to download MelonPreferencesManager
async function downloadMelonPrefManNotify(api) {
  let isInstalled = isMelonPrefManInstalled(api, spec);
  if (!isInstalled) {
    const NOTIF_ID = `${GAME_ID}-melonprefman`;
    const MOD_NAME = MELONPREFMAN_NAME;
    const MESSAGE = `Would you like to download ${MOD_NAME}?`;
    api.sendNotification({
      id: NOTIF_ID,
      type: 'warning',
      message: MESSAGE,
      allowSuppress: true,
      actions: [
        {
          title: 'Download MelPrefMan',
          action: (dismiss) => {
            downloadMelonPrefMan(api, spec);
            dismiss();
          },
        },
        {
          title: 'More',
          action: (dismiss) => {
            api.showDialog('question', MESSAGE, {
              text: `${MOD_NAME} is a mod that allows you to configure BepInEx mods with and in-game GUI.\n`
                  + `Click the button below to download and install ${BEPCFGMAN_NAME}.\n`
                  + `Once installed, the default key to show the configuration menu is F5.\n`
                  + '\n'
                  + `Note that due to the way the file is packaged on GitHub, you will see a popup asking if you want to create a new mod with the file.\n`
                  + `Select the "Create Mod" option.\n`
            }, [
                {
                  label: `Download ${MOD_NAME}`, action: () => {
                    downloadMelonPrefMan(api, spec);
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
}

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  //SYNC CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  bepinexInstalled = isBepinexInstalled(api, gameSpec);
  melonInstalled = isMelonInstalled(api, gameSpec);
  // ASYNC CODE ///////////////////////////////////
  await modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
  if (!bepinexInstalled && !melonInstalled) {
    chooseModLoader(api, gameSpec); //dialog to choose mod loader
  }
  if (bepinexInstalled && melonInstalled) {
    deconflictModLoaders(api, gameSpec); //deconflict if both mod loaders are installed
  } //*/
  if (bepinexInstalled && allowBepCfgMan) {
    downloadBepCfgManNotify(api, gameSpec); //notification to download BepInExConfigManager
  } //*/
  if (melonInstalled && allowMelPrefMan) {
    downloadMelonPrefManNotify(api, gameSpec); //notification to download MelonPreferencesManager
  } //*/
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = { //register game
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    //executable: getExecutable,
    //getGameVersion: resolveGameVersion,
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

  //register mod types explicitly
  if (hasCustomMods) {
    context.registerModType(CUSTOM_ID, 60, 
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, 
      (game) => getCustomFolder(context.api, game),
      () => Promise.resolve(false), 
      { name: CUSTOM_NAME }
    ); //*/
    //add more if needed
  }

  //register mod installers
  context.registerInstaller(BEPINEX_ID, 25, testBepinex, installBepinex);
  context.registerInstaller(MELON_ID, 26, testMelon, installMelon);
  context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  context.registerInstaller(BEPCFGMAN_ID, 29, testBepCfgMan, installBepCfgMan);
  context.registerInstaller(MELONPREFMAN_ID, 30, testMelonPrefMan, installMelonPrefMan);
  context.registerInstaller(ASSEMBLY_ID, 31, testAssembly, installAssembly);
  //if there are other known dll files that are not Unity plugins, add installers for them here
  context.registerInstaller(`${GAME_ID}-plugin`, 33, testPlugin, (files, workingDir) => installPlugin(context.api, gameSpec, files, workingDir));
  context.registerInstaller(ASSETS_ID, 37, testAssets, installAssets);
  if (hasCustomMods) {
    context.registerInstaller(CUSTOM_ID, 39, testCustom, installCustom);
  }
  //context.registerInstaller(SAVE_ID, 47, testSave, installSave); //best to only enable if saves are stored in the game's folder
  context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  
  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Data Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, DATA_FOLDER);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', async () => {
    //SAVE_PATH = await getSavePath(context.api);
    util.opn(SAVE_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open BepInEx Config', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, BEP_CONFIG_FILEPATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open BepInEx Log', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, BEP_LOG_FILEPATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download BepInExConfigManager', async () => {
    await downloadBepCfgMan(context.api, spec);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open MelonLoader Config', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, MEL_CONFIG_FILEPATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open MelonLoader Log', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, MEL_LOG_FILEPATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  /*
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download MelonPreferencesManager', async () => {
    await downloadMelonPrefMan(context.api, spec);
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
    context.api.onAsync('did-deploy', (profileId, deployment) => { 
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      bepinexInstalled = isBepinexInstalled(context.api, spec);
      melonInstalled = isMelonInstalled(context.api, spec);
      if (!bepinexInstalled && !melonInstalled) {
        chooseModLoader(context.api, spec); //dialog to choose mod loader
      }
      if (bepinexInstalled && melonInstalled) {
        deconflictModLoaders(context.api, spec); //deconflict if both mod loaders are installed
      } //*/
      if (bepinexInstalled && allowBepCfgMan) {
        downloadBepCfgMan(context.api, spec); //download BepInExConfigManager
      } //*/
      if (melonInstalled && allowMelPrefMan) {
        downloadMelonPrefMan(context.api, spec); //download MelonPreferencesManager
      } //*/
      return Promise.resolve();
    });
  });
  return true;
}

// Test if BepInEx is installed
function isBepinexInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === BEPINEX_ID);
}

// Test if MelonLoader is installed
function isMelonInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MELON_ID);
}

//Test if BepInExConfigManager is installed
function isBepCfgManInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === BEPCFGMAN_ID);
}

//Test if MelonPreferences Manager is installed
function isMelonPrefManInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MELONPREFMAN_ID);
}

// Download BepInEx
async function downloadBepinex(api, gameSpec) {
  let isInstalled = isBepinexInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = BEPINEX_NAME;
    const MOD_TYPE = BEPINEX_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const URL = BEPINEX_URL;
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //const dlInfo = {};
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
      const errPage = BEPINEX_URL_ERR;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// Download MelonLoader
async function downloadMelon(api, gameSpec) {
  let isInstalled = isMelonInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MELON_NAME;
    const MOD_TYPE = MELON_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const URL = MELON_URL;
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //const dlInfo = {};
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
      const errPage = MELON_URL_ERR;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// Download BepInExConfigManager from GitHub
async function downloadBepCfgMan(api, gameSpec) {
  let isInstalled = isBepCfgManInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = BEPCFGMAN_NAME;
    const MOD_TYPE = BEPCFGMAN_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    const URL = BEPCFGMAN_URL;
    const URL_ERR = BEPCFGMAN_URL_ERR;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //const dlInfo = {};
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
    } catch (err) {
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(URL_ERR).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// Download MelonPreferences Manager from GitHub
async function downloadMelonPrefMan(api, gameSpec) {
  let isInstalled = isMelonPrefManInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MELONPREFMAN_NAME;
    const MOD_TYPE = MELONPREFMAN_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    const URL = MELONPREFMAN_URL;
    const URL_ERR = MELONPREFMAN_URL_ERR;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //const dlInfo = {};
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
    } catch (err) {
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(URL_ERR).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//export to Vortex
module.exports = {
  default: main,
};
