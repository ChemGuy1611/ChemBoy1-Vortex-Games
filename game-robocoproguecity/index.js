/*////////////////////////////////////////////
Name: RoboCop Rogue City and Unfinished Business Vortex Extension
Structure: UE5
Author: ChemBoy1
Version: 0.7.0
Date: 2026-02-01
////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');

//for Rogue City
const GAME_ID = "robocoproguecity";
const STEAMAPP_ID = "1681430";
const EPICAPP_ID = ""; // not on egdata.app yet
const GOGAPP_ID = "1950574400";
const XBOXAPP_ID = "BigbenInteractiveSA.RoboCopRogueCity";
const XBOXEXECNAME = "AppRobocopShipping";
const GAME_NAME = "RoboCop: Rogue City";
const GAME_NAME_SHORT = "RoboCop: RC";
const EXEC_DEFAULT = "RoboCop.exe";
const EXEC_XBOX = "gamelaunchhelper.exe";
let GAME_PATH = null;
let CHECK_DATA = false;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//same for both games
const EPIC_CODE_NAME = "Game";
const EXEC_FOLDER_DEFAULT = "Win64";
const EXEC_FOLDER_XBOX = "WinGDK";
const UE4SS_MOD_PATH = path.join('ue4ss', 'Mods');
const IO_STORE = true; //true if the Paks folder contains .ucas and .utoc files
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'),
  fileExt: ['.pak', '.ucas', '.utoc'],
  loadOrder: true,
}

//for Unfinished Business
const GAME_ID_UNFINISHED = "robocoproguecityunfinishedbusiness";
const STEAMAPP_ID_UNFINISHED = "3527760";
const EPICAPP_ID_UNFINISHED = "";
const GOGAPP_ID_UNFINISHED = "1318449508";
const XBOXAPP_ID_UNFINISHED = "";
const XBOXEXECNAME_UNFINISHED = "";
const GAME_NAME_UNFINISHED = "RoboCop: Rogue City - Unfinished Business";
const GAME_NAME_SHORT_UNFINISHED = "RoboCop: RC - UFB";
const EXEC_UNFINISHED = "RoboCopUnfinishedBusiness.exe";
let GAME_PATH_UNFINISHED = null;
let CHECK_DATA_UNFINISHED = false;
let STAGING_FOLDER_UNFINISHED = '';
let DOWNLOAD_FOLDER_UNFINISHED = '';
const BINARIES_PATH_UNFINISHED = path.join(EPIC_CODE_NAME, "Binaries", EXEC_FOLDER_DEFAULT);
const SCRIPTS_PATH_UNFINISHED = path.join(BINARIES_PATH_UNFINISHED, UE4SS_MOD_PATH);

//Information for setting the executable and variable paths based on the game store version
let GAME_VERSION = '';
let GAME_VERSION_UNFINISHED = '';
let BINARIES_PATH = null;
let BINARIES_TARGET = null;
let SHIPPING_EXE = ''; 
let SCRIPTS_PATH = null;
let SCRIPTS_TARGET = null;
let SAVE_PATH = null;
let SAVE_TARGET = null;
let CONFIG_PATH = null;
let CONFIG_TARGET = null;
let requiredFiles = [EPIC_CODE_NAME];
let USERID_FOLDER = "";

const XBOX_FILE = `appxmanifest.xml`;

//Config and save paths
//const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
const LOCALAPPDATA = util.getVortexPath("localAppData");
const XBOX_SAVE_STRING = 'ymj30pw7xe604';
const CONFIG_PATH_DEFAULT = path.join(LOCALAPPDATA, 'Robocop', "Saved", "Config", "Windows");
const CONFIG_PATH_XBOX = path.join(LOCALAPPDATA, 'Robocop', "Saved", "Config", "WinGDK"); //XBOX Version
const SAVE_PATH_DEFAULT = path.join(LOCALAPPDATA, 'Robocop', "Saved", "SaveGames");
const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_SAVE_STRING}`, "SystemAppData", "wgs"); //XBOX Version
const CONFIG_LOC = 'Local AppData';
const SAVE_LOC = 'Local AppData';

const CONFIG_PATH_UNFINISHED = path.join(LOCALAPPDATA, 'RoboCopUnfinishedBusiness', "Saved", "Config", "Windows");
const SAVE_PATH_UNFINISHED = path.join(LOCALAPPDATA, 'RoboCopUnfinishedBusiness', "Saved", "SaveGames");
const CONFIG_LOC_UNFINISHED = 'Local AppData';
const SAVE_LOC_UNFINISHED = 'Local AppData';

const UE5_SORTABLE_ID = `${GAME_ID}-ue5-sortable-modtype`;
const LEGACY_UE5_SORTABLE_ID = 'ue5-sortable-modtype';
const UE5_SORTABLE_NAME = 'UE5 Sortable Mod';
const UE5_SORTABLE_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-ue5-sortable-modtype`;

//Information for mod types and installers. This will be filled in from the data above
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const UE5_ALT_ID = `${GAME_ID}-pakalt`;
const UE5_ALT_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-pakalt`;
const UE5_ALT_NAME = 'UE5 Paks (no "~mods")';
const PAK_EXT = '.pak';
const UE5_PATH = UNREALDATA.modsPath;
const UE5_ALT_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks');

const LOGICMODS_ID = `${GAME_ID}-logicmods`;
const LOGICMODS_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-logicmods`;
const LOGICMODS_NAME = "UE4SS LogicMods (Blueprint)";
const UE4SSCOMBO_ID = `${GAME_ID}-ue4sscombo`;
const UE4SSCOMBO_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-ue4sscombo`;
const UE4SSCOMBO_NAME = "UE4SS Script-LogicMod Combo";
const LOGICMODS_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks', 'LogicMods');
const LOGICMODS_FOLDER = "LogicMods";
const LOGICMODS_EXT = ".pak";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-config`; //same as above
const CONFIG_NAME = "Config";
const CONFIG_FILES = ["engine.ini", "scalability.ini", "input.ini", "game.ini"];
const CONFIG_EXT = ".ini";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-root`;
const ROOT_NAME = "Root Game Folder";
const ROOT_FOLDER = EPIC_CODE_NAME;

const CONTENT_ID = `${GAME_ID}-contentfolder`;
const CONTENT_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-contentfolder`;
const CONTENT_NAME = "Content Folder";
const CONTENT_FILE = 'Content';
const CONTENT_PATH = path.join(EPIC_CODE_NAME);

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-save`;
const SAVE_NAME = "Saves";
const SAVE_EXT = ".sav";

const SCRIPTS_ID = `${GAME_ID}-scripts`;
const SCRIPTS_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-scripts`;
const SCRIPTS_NAME = "UE4SS Script Mod";
const SCRIPTS_EXT = ".lua";
const SCRIPTS_FOLDER = "Scripts";

const DLL_ID = `${GAME_ID}-ue4ssdll`;
const DLL_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-ue4ssdll`;
const DLL_NAME = "UE4SS DLL Mod";
const DLL_EXT = ".dll";
const DLL_FOLDER = "dlls";

const UE4SS_ID = `${GAME_ID}-ue4ss`;
const UE4SS_ID_UNFINISHED = `${GAME_ID_UNFINISHED}-ue4ss`;
const UE4SS_NAME = "UE4SS";
const UE4SS_FILE = "dwmapi.dll";
const UE4SS_DLFILE_STRING = "ue4ss";
const UE4SS_URL = "https://github.com/UE4SS-RE/RE-UE4SS/releases";
const UE4SS_PAGE_NO = 0; // <-- No Nexus page currently
const UE4SS_FILE_NO = 0;

//Set file number for pak installer file selection (needs to be 3 if IO Store is used to accomodate .ucas and .utoc files)
let PAK_FILE_MIN = 1;
let SYM_LINKS = true;
if (IO_STORE) {
  PAK_FILE_MIN = 3;
  SYM_LINKS = false;
}

const MOD_PATH_DEFAULT = BINARIES_PATH;
const MOD_PATH_DEFAULT_UNFINISHED = UE5_PATH;

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    //"executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      EPIC_CODE_NAME,
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "compatibleDownloads": [GAME_ID_UNFINISHED],
      "supportsSymlinks": SYM_LINKS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": UE4SSCOMBO_ID,
      "name": UE4SSCOMBO_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": LOGICMODS_ID,
      "name": LOGICMODS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', LOGICMODS_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": CONTENT_ID,
      "name": CONTENT_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', CONTENT_PATH)
    },
    {
      "id": UE5_ALT_ID,
      "name": UE5_ALT_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', UE5_ALT_PATH)
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
      GOGAPP_ID,
      XBOXAPP_ID
    ],
    "names": []
  }
};

const specUnfinished = {
  "game": {
    "id": GAME_ID_UNFINISHED,
    "name": GAME_NAME_UNFINISHED,
    "shortName": GAME_NAME_SHORT_UNFINISHED,
    "executable": EXEC_UNFINISHED,
    "logo": `${GAME_ID_UNFINISHED}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT_UNFINISHED,
    "modPathIsRelative": true,
    "requiredFiles": [
      EPIC_CODE_NAME,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID_UNFINISHED,
      "gogAppId": GOGAPP_ID_UNFINISHED,
      //"epicAppId": EPICAPP_ID_UNFINISHED,
      //"xboxAppId": XBOXAPP_ID_UNFINISHED,
      "compatibleDownloads": [GAME_ID],
      "supportsSymlinks": SYM_LINKS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID_UNFINISHED,
      "GogAPPId": GOGAPP_ID_UNFINISHED,
      //"EpicAPPId": EPICAPP_ID_UNFINISHED,
      //"XboxAPPId": XBOXAPP_ID_UNFINISHED,
    },
  },
  "modTypes": [
    {
      "id": BINARIES_ID_UNFINISHED,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BINARIES_PATH_UNFINISHED)
    },
    {
      "id": SCRIPTS_ID_UNFINISHED,
      "name": SCRIPTS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', SCRIPTS_PATH_UNFINISHED)
    },
    {
      "id": DLL_ID_UNFINISHED,
      "name": DLL_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', SCRIPTS_PATH_UNFINISHED)
    },
    {
      "id": UE4SS_ID_UNFINISHED,
      "name": UE4SS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BINARIES_PATH_UNFINISHED)
    },
    {
      "id": UE4SSCOMBO_ID_UNFINISHED,
      "name": UE4SSCOMBO_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": LOGICMODS_ID_UNFINISHED,
      "name": LOGICMODS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', LOGICMODS_PATH)
    },
    {
      "id": ROOT_ID_UNFINISHED,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": CONTENT_ID_UNFINISHED,
      "name": CONTENT_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', CONTENT_PATH)
    },
    {
      "id": UE5_ALT_ID_UNFINISHED,
      "name": UE5_ALT_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', UE5_ALT_PATH)
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID_UNFINISHED,
      //EPICAPP_ID_UNFINISHED,
      GOGAPP_ID_UNFINISHED,
      //XBOXAPP_ID_UNFINISHED
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [

];
const toolsUnfinished = [

];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 30,
    low: 75,
  }[priority];
}

//Convert path placeholders to actual values
function pathPattern(api, game, pattern) {
  try{
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch(err){
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Find game installation directory
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

async function requiresLauncher(gamePath, store) {
  if (store === 'xbox') {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  } //*/
  /*if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable, add to required files, set paths for mod types
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
    GAME_VERSION = 'xbox';
    BINARIES_PATH = path.join(EPIC_CODE_NAME, "Binaries", EXEC_FOLDER_XBOX);
    BINARIES_TARGET = path.join('{gamePath}', BINARIES_PATH);
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, "Binaries", EXEC_FOLDER_XBOX, `${EPIC_CODE_NAME}-${EXEC_FOLDER_XBOX}-Shipping.exe`);
    SCRIPTS_PATH = path.join(EPIC_CODE_NAME, "Binaries", EXEC_FOLDER_XBOX, UE4SS_MOD_PATH);
    SCRIPTS_TARGET = path.join('{gamePath}', SCRIPTS_PATH);
    CONFIG_PATH = CONFIG_PATH_XBOX;
    CONFIG_TARGET = CONFIG_PATH;
    try {
      const SAVE_ARRAY = fs.readdirSync(SAVE_PATH_XBOX);
      USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_PATH_XBOX, entry));
    } catch(err) {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    } //*/
    SAVE_PATH = path.join(SAVE_PATH_XBOX, USERID_FOLDER);
    SAVE_TARGET = SAVE_PATH;
    return EXEC_XBOX;
  };
  if (isCorrectExec(EXEC_DEFAULT)) {
    GAME_VERSION = 'default';
    BINARIES_PATH = path.join(EPIC_CODE_NAME, "Binaries", EXEC_FOLDER_DEFAULT);
    BINARIES_TARGET = path.join('{gamePath}', BINARIES_PATH);
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, "Binaries", EXEC_FOLDER_DEFAULT, `${EPIC_CODE_NAME}-${EXEC_FOLDER_DEFAULT}-Shipping.exe`);
    SCRIPTS_PATH = path.join(EPIC_CODE_NAME, "Binaries", EXEC_FOLDER_DEFAULT, UE4SS_MOD_PATH);
    SCRIPTS_TARGET = path.join('{gamePath}', SCRIPTS_PATH);
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    CONFIG_TARGET = CONFIG_PATH;
    try {
        const SAVE_ARRAY = fs.readdirSync(SAVE_PATH_DEFAULT);
        USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_PATH_DEFAULT, entry));
      } catch(err) {
        USERID_FOLDER = "";
      }
      if (USERID_FOLDER === undefined) {
        USERID_FOLDER = "";
      } //*/
    SAVE_PATH = path.join(SAVE_PATH_DEFAULT, USERID_FOLDER);
    SAVE_TARGET = SAVE_PATH;
    return EXEC_DEFAULT;
  };
  return EXEC_DEFAULT;
}

//Get correct game version
function setGameVersion(api, id) {
  const path = getDiscoveryPath(api, id);
  let version = '';
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(path, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    version = 'xbox';
    return version;
  }
  else {
    version = 'default';
    return version;
  };
}

//Get correct game version
async function setGameVersionPath(gamePath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(gamePath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  };
  GAME_VERSION = 'steam';
  return GAME_VERSION;
}

const getDiscoveryPath = (api, id) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, id], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// ROGUE CITY MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for save files
function testUe4ssCombo(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === SCRIPTS_EXT) !== undefined;
  const isMod2 = files.find(file => path.extname(file).toLowerCase() === LOGICMODS_EXT) !== undefined;
  const isFolder = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase()) !== undefined;
  let supported = (gameId === spec.game.id) && isMod && isMod2 && isFolder;

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
function installUe4ssCombo(files, fileName) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE4SSCOMBO_ID };

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

//Test for save files
function testLogic(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === LOGICMODS_FOLDER.toLowerCase());
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
function installLogic(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === LOGICMODS_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOGICMODS_ID };

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

//Installer test for UE4SS files
function testUe4ss(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === UE4SS_FILE);
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

//Installer install UE4SS files
function installUe4ss(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === UE4SS_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE4SS_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    //((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    ((file.indexOf(rootPath) !== -1))
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

//Test for UE4SS Script files
function testScripts(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SCRIPTS_EXT));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === SCRIPTS_FOLDER.toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod && isFolder;

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

//Install UE4SS Script files
function installScripts(files, fileName) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === SCRIPTS_FOLDER.toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SCRIPTS_ID };
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  }
  
  const ENABLEDTXT_FILE = 'enabled.txt'
  const ENABLEDTXT_PATH = path.join(fileName, rootPath, ENABLEDTXT_FILE);
  try {
    fs.statSync(ENABLEDTXT_PATH);
  } catch (err) {
    try {
      fs.writeFileSync(
        ENABLEDTXT_PATH,
        ``,
        { encoding: "utf8" },
      );
      files.push(path.join(rootPath, ENABLEDTXT_FILE));
      log('info', `Successfully created enabled.txt for UE4SS Script Mod: ${MOD_NAME}`);
    } catch (err) {
      log('error', `Could not create enabled.txt for UE4SS Script Mod: ${MOD_NAME}`);
    }
  }

  //Filter files and set instructions
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for UE4SS DLL files
function testDll(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === DLL_EXT));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === DLL_FOLDER.toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod && isFolder;

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

//Install UE4SS DLL files
function installDll(files, fileName) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === DLL_FOLDER.toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DLL_ID };
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  }
  
  const ENABLEDTXT_FILE = 'enabled.txt'
  const ENABLEDTXT_PATH = path.join(fileName, rootPath, ENABLEDTXT_FILE);
  try {
    fs.statSync(ENABLEDTXT_PATH);
  } catch (err) {
    try {
      fs.writeFileSync(
        ENABLEDTXT_PATH,
        ``,
        { encoding: "utf8" },
      );
      files.push(path.join(rootPath, ENABLEDTXT_FILE));
      log('info', `Successfully created enabled.txt for UE4SS DLL Mod: ${MOD_NAME}`);
    } catch (err) {
      log('error', `Could not create enabled.txt for UE4SS DLL Mod: ${MOD_NAME}`);
    }
  }

  //Filter files and set instructions
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
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

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    //((file.indexOf(rootPath) !== -1))
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
function testContent(files, gameId) {
  const isMod = files.some(file => path.basename(file) === CONTENT_FILE);
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

//Installer install Root folder files
function installContent(files) {
  const modFile = files.find(file => path.basename(file) === CONTENT_FILE);
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONTENT_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    //((file.indexOf(rootPath) !== -1))
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

//Test for config files
function testConfig(files, gameId) {
  const isConfig = files.some(file => CONFIG_FILES.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isConfig;

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

//Install config files
function installConfig(api, files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === CONFIG_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

  //Filter files and set instructions
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
  GAME_PATH = getDiscoveryPath(api, GAME_ID);
  const IS_CONFIG = checkPartitions(LOCALAPPDATA, GAME_PATH);
  if (IS_CONFIG === false) {
    //api.showErrorNotification(`Could not install mod as Config`, `You tried installing a Config mod, but the game, staging folder, and ${CONFIG_LOC} folders are not all on the same drive. Please move the game and/or staging folder to the same drive as the ${CONFIG_LOC} folders (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
    configInstallerNotify(api);
  }
  return Promise.resolve({ instructions });
}

//Notification for config installer
function configInstallerNotify(api) {
  const NOTIF_ID = `${GAME_ID}-configinstaller`;
  const MESSAGE = 'Could not install mod as Config';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'error',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You tried installing a Config file mod, but the game, staging folder, and ${CONFIG_LOC} folder are not all on the same drive.\n`
                + `Please move the game and/or staging folder to the same drive as the ${CONFIG_LOC} folder (typically C Drive) to install these types of mods with Vortex.\n`
                + `\n`
                + `Config Path: ${CONFIG_PATH}\n`
                + `\n`             
                + `If you want to use this mod installer, you must move the game and staging folder to the same partition as the ${CONFIG_LOC} folder (typically C Drive).\n`
                + `\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
            {
              label: 'Open Config Folder', action: () => {
                util.opn(CONFIG_PATH).catch(() => null);
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });
}

//Test for save files
function testSave(api, files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SAVE_EXT));
  GAME_VERSION = setGameVersion(api, GAME_ID);
  const TEST = (GAME_VERSION === 'default');
  let supported = (gameId === spec.game.id) && isMod && TEST;

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
function installSave(api, files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === SAVE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

  //Filter files and set instructions
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
  GAME_PATH = getDiscoveryPath(api, GAME_ID);
  const IS_SAVE = checkPartitions(LOCALAPPDATA, GAME_PATH);
  if (IS_SAVE === false) {
    //api.showErrorNotification(`Could not install mod as Save`, `You tried installing a Save mod, but the game, staging folder, and ${SAVE_LOC} folder are not all on the same drive. Please move the game and/or staging folder to the same drive as the ${SAVE_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
    saveInstallerNotify(api);
  } 
  return Promise.resolve({ instructions });
}

//Notification for config installer
function saveInstallerNotify(api) {
  const NOTIF_ID = `${GAME_ID}-saveinstaller`;
  const MESSAGE = 'Could not install mod as Save';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'error',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You tried installing a Save file mod, but the game, staging folder, and ${SAVE_LOC} folder are not all on the same drive.\n`
                + `Please move the game and/or staging folder to the same drive as the ${SAVE_LOC} folder (typically C Drive) to install these types of mods with Vortex.\n`
                + `\n`
                + `Save Path: ${SAVE_PATH}\n`
                + `\n`             
                + `If you want to use this mod installer, you must move the game and staging folder to the same partition as the ${SAVE_LOC} folder (typically C Drive).\n`
                + `\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
            {
              label: 'Open Save Folder', action: () => {
                util.opn(SAVE_PATH).catch(() => null);
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });
}

//Test Fallback installer for binaries folder
function testBinaries(files, gameId) {
  const isPak = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
  let supported = (gameId === spec.game.id) && !isPak;

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

//Fallback installer for binaries folder
function installBinaries(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };

  // Remove empty directories
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );

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

// UNFINISHED BUSINESS MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for save files
function testUe4ssComboUnfinished(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === SCRIPTS_EXT) !== undefined;
  const isMod2 = files.find(file => path.extname(file).toLowerCase() === LOGICMODS_EXT) !== undefined;
  const isFolder = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase()) !== undefined;
  let supported = (gameId === specUnfinished.game.id) && isMod && isMod2 && isFolder;

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
function installUe4ssComboUnfinished(files, fileName) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE4SSCOMBO_ID_UNFINISHED };

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

//Test for save files
function testLogicUnfinished(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === LOGICMODS_FOLDER.toLowerCase());
  let supported = (gameId === specUnfinished.game.id) && isMod;

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
function installLogicUnfinished(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === LOGICMODS_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOGICMODS_ID_UNFINISHED };

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

//Installer test for UE4SS files
function testUe4ssUnfinished(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === UE4SS_FILE);
  let supported = (gameId === specUnfinished.game.id) && isMod;

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

//Installer install UE4SS files
function installUe4ssUnfinished(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === UE4SS_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE4SS_ID_UNFINISHED };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    //((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    ((file.indexOf(rootPath) !== -1))
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

//Test for UE4SS Script files
function testScriptsUnfinished(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SCRIPTS_EXT));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === SCRIPTS_FOLDER.toLowerCase()));
  let supported = (gameId === specUnfinished.game.id) && isMod && isFolder;

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

//Install UE4SS Script files
function installScriptsUnfinished(files, fileName) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === SCRIPTS_FOLDER.toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SCRIPTS_ID_UNFINISHED };
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  }
  
  const ENABLEDTXT_FILE = 'enabled.txt'
  const ENABLEDTXT_PATH = path.join(fileName, rootPath, ENABLEDTXT_FILE);
  try {
    fs.statSync(ENABLEDTXT_PATH);
  } catch (err) {
    try {
      fs.writeFileSync(
        ENABLEDTXT_PATH,
        ``,
        { encoding: "utf8" },
      );
      files.push(path.join(rootPath, ENABLEDTXT_FILE));
      log('info', `Successfully created enabled.txt for UE4SS Script Mod: ${MOD_NAME}`);
    } catch (err) {
      log('error', `Could not create enabled.txt for UE4SS Script Mod: ${MOD_NAME}`);
    }
  }

  //Filter files and set instructions
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for UE4SS DLL files
function testDllUnfinished(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === DLL_EXT));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === DLL_FOLDER.toLowerCase()));
  let supported = (gameId === specUnfinished.game.id) && isMod && isFolder;

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

//Install UE4SS DLL files
function installDllUnfinished(files, fileName) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === DLL_FOLDER.toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DLL_ID_UNFINISHED };
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  }
  
  const ENABLEDTXT_FILE = 'enabled.txt'
  const ENABLEDTXT_PATH = path.join(fileName, rootPath, ENABLEDTXT_FILE);
  try {
    fs.statSync(ENABLEDTXT_PATH);
  } catch (err) {
    try {
      fs.writeFileSync(
        ENABLEDTXT_PATH,
        ``,
        { encoding: "utf8" },
      );
      files.push(path.join(rootPath, ENABLEDTXT_FILE));
      log('info', `Successfully created enabled.txt for UE4SS DLL Mod: ${MOD_NAME}`);
    } catch (err) {
      log('error', `Could not create enabled.txt for UE4SS DLL Mod: ${MOD_NAME}`);
    }
  }

  //Filter files and set instructions
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testRootUnfinished(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  let supported = (gameId === specUnfinished.game.id) && isMod;

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

//Installer install Root folder files
function installRootUnfinished(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID_UNFINISHED };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    //((file.indexOf(rootPath) !== -1))
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
function testContentUnfinished(files, gameId) {
  const isMod = files.some(file => path.basename(file) === CONTENT_FILE);
  let supported = (gameId === specUnfinished.game.id) && isMod;

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

//Installer install Root folder files
function installContentUnfinished(files) {
  const modFile = files.find(file => path.basename(file) === CONTENT_FILE);
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONTENT_ID_UNFINISHED };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    //((file.indexOf(rootPath) !== -1))
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

//Test for config files
function testConfigUnfinished(files, gameId) {
  const isConfig = files.some(file => CONFIG_FILES.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === specUnfinished.game.id) && isConfig;

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

//Install config files
function installConfigUnfinished(api, files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === CONFIG_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID_UNFINISHED };

  //Filter files and set instructions
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
  GAME_PATH_UNFINISHED = getDiscoveryPath(api, GAME_ID_UNFINISHED);
  const IS_CONFIG = checkPartitions(LOCALAPPDATA, GAME_PATH_UNFINISHED);
  if (IS_CONFIG === false) {
    //api.showErrorNotification(`Could not install mod as Config`, `You tried installing a Config mod, but the game, staging folder, and ${CONFIG_LOC} folders are not all on the same drive. Please move the game and/or staging folder to the same drive as the ${CONFIG_LOC} folders (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
    configInstallerNotifyUnfinished(api);
  }
  return Promise.resolve({ instructions });
}

//Notification for config installer
function configInstallerNotifyUnfinished(api) {
  const NOTIF_ID = `${GAME_ID_UNFINISHED}-configinstaller`;
  const MESSAGE = 'Could not install mod as Config';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'error',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You tried installing a Config file mod, but the game, staging folder, and ${CONFIG_LOC_UNFINISHED} folder are not all on the same drive.\n`
                + `Please move the game and/or staging folder to the same drive as the ${CONFIG_LOC_UNFINISHED} folder (typically C Drive) to install these types of mods with Vortex.\n`
                + `\n`
                + `Config Path: ${CONFIG_PATH_UNFINISHED}\n`
                + `\n`             
                + `If you want to use this mod installer, you must move the game and staging folder to the same partition as the ${CONFIG_LOC_UNFINISHED} folder (typically C Drive).\n`
                + `\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
            {
              label: 'Open Config Folder', action: () => {
                util.opn(CONFIG_PATH_UNFINISHED).catch(() => null);
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });
}

//Test for save files
function testSaveUnfinished(api, files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SAVE_EXT));
  GAME_VERSION = setGameVersion(api, GAME_ID_UNFINISHED);
  //const TEST = (GAME_VERSION === 'default');
  let supported = (gameId === specUnfinished.game.id) && isMod;

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
function installSaveUnfinished(api, files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === SAVE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID_UNFINISHED };

  //Filter files and set instructions
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
  GAME_PATH_UNFINISHED = getDiscoveryPath(api, GAME_ID_UNFINISHED);
  const IS_SAVE = checkPartitions(LOCALAPPDATA, GAME_PATH_UNFINISHED);
  if (IS_SAVE === false) {
    //api.showErrorNotification(`Could not install mod as Save`, `You tried installing a Save mod, but the game, staging folder, and ${SAVE_LOC} folder are not all on the same drive. Please move the game and/or staging folder to the same drive as the ${SAVE_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
    saveInstallerNotifyUnfinished(api);
  } 
  return Promise.resolve({ instructions });
}

//Notification for config installer
function saveInstallerNotifyUnfinished(api) {
  const NOTIF_ID = `${GAME_ID_UNFINISHED}-saveinstaller`;
  const MESSAGE = 'Could not install mod as Save';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'error',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You tried installing a Save file mod, but the game, staging folder, and ${SAVE_LOC_UNFINISHED} folder are not all on the same drive.\n`
                + `Please move the game and/or staging folder to the same drive as the ${SAVE_LOC_UNFINISHED} folder (typically C Drive) to install these types of mods with Vortex.\n`
                + `\n`
                + `Save Path: ${SAVE_PATH_UNFINISHED}\n`
                + `\n`             
                + `If you want to use this mod installer, you must move the game and staging folder to the same partition as the ${SAVE_LOC_UNFINISHED} folder (typically C Drive).\n`
                + `\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
            {
              label: 'Open Save Folder', action: () => {
                util.opn(SAVE_PATH_UNFINISHED).catch(() => null);
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });
}

//Test Fallback installer for binaries folder
function testBinariesUnfinished(files, gameId) {
  const isPak = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
  let supported = (gameId === specUnfinished.game.id) && !isPak;

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

//Fallback installer for binaries folder
function installBinariesUnfinished(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID_UNFINISHED };

  // Remove empty directories
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );

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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if UE4SS is installed
function isUe4ssInstalled(api, spec, type) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === type);
}

//* Download UE4SS from GitHub page (user browse for download)
async function downloadUe4ss(api, gameSpec, type) {
  let isInstalled = isUe4ssInstalled(api, gameSpec, type);
  const URL = UE4SS_URL;
  const MOD_NAME = UE4SS_NAME;
  const MOD_TYPE = type;
  const ARCHIVE_NAME = UE4SS_DLFILE_STRING;
  const instructions = api.translate(`Click on Continue below to open the browser. - `
    + `Navigate to the latest experimental version of ${MOD_NAME} on the GitHub releases page and `
    + `click on the appropriate file to download and install the mod.`
  );

  if (!isInstalled) {
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.ProcessCanceled('Selected wrong download'));
        } //*/
        return Promise.resolve(result);
      })
      .catch((error) => {
        return reject(error);
      })
      .then((result) => {
        const dlInfo = {game: gameSpec.game.id, name: MOD_NAME};
        api.events.emit('start-download', result, {}, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(gameSpec.game.id, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              return resolve();
            });
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please re-launch Vortex and try again.`, err, { allowReport: false });
        //util.opn(URL).catch(() => null);
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from modDB at the opened paged and install the zip in Vortex.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }
} //*/

// ROGUE CITY UNREAL FUNCTIONS ///////////////////////////////////////////////////////////////

//UNREAL - Pre-sort function
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', GAME_ID], {});
  const fileExt = UNREALDATA.fileExt;

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    const paks = util.getSafe(modInfo.attributes, ['unrealModFiles'], []);
    if (paks.length > 1) name = name + ` (${paks.length} ${fileExt} files)`;

    return {
      id: mod.id,
      name,
      imgUrl: util.getSafe(modInfo, ['attributes', 'pictureUrl'], path.join(__dirname, spec.game.logo))
    }
  });

  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);
}

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

function makePrefix(input) {
  let res = '';
  let rest = input;
  while (rest > 0) {
      res = String.fromCharCode(65 + (rest % 25)) + res;
      rest = Math.floor(rest / 25);
  }
  return util.pad(res, 'A', 3);
}

function loadOrderPrefix(api, mod) {
  const state = api.getState();
  const profile = selectors.lastActiveProfileForGame(state, GAME_ID);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});
  const loKeys = Object.keys(loadOrder);
  const pos = loKeys.indexOf(mod.id);
  if (pos === -1) {
      return 'ZZZZ-';
  }
  return makePrefix(pos) + '-';
}

function installUnrealMod(api, files, gameId) {
  return __awaiter(this, void 0, void 0, function* () {
    const game = gameId;
    const fileExt = UNREALDATA.fileExt;
    if (!fileExt)
      Promise.reject('Unsupported game - UE5 installer failed.');
    const modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const modType = {
      type: 'setmodtype',
      value: UE5_SORTABLE_ID,
    };
    const installFiles = (modFiles.length > PAK_FILE_MIN)
      ? yield chooseFilesToInstall(api, modFiles, fileExt)
      : modFiles;
    const unrealModFiles = {
      type: 'attribute',
      key: 'unrealModFiles',
      value: modFiles.map(f => path.basename(f))
    };
    let instructions = installFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file)
      };
    });
    instructions.push(modType);
    instructions.push(unrealModFiles);
    return Promise.resolve({ instructions });
  });
}

function chooseFilesToInstall(api, files, fileExt) {
  return __awaiter(this, void 0, void 0, function* () {
    const t = api.translate;
    return api.showDialog('question', t('Multiple {{PAK}} files', { replace: { PAK: fileExt } }), {
        text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: fileExt } }) +
            `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
        checkboxes: files.map((pak) => {
            return {
                id: path.basename(pak),
                text: path.basename(pak),
                value: false
            };
        })
    }, [
        { label: 'Cancel' },
        { label: 'Install Selected' },
        { label: 'Install All_plural' }
    ]).then((result) => {
        if (result.action === 'Cancel')
            return Promise.reject(new util.ProcessCanceled('User cancelled.'));
        else {
            const installAll = (result.action === 'Install All' || result.action === 'Install All_plural');
            const installPAKS = installAll ? files : Object.keys(result.input).filter(s => result.input[s])
                .map(file => files.find(f => path.basename(f) === file));
            return installPAKS;
        }
    });
  });
}

function UNREALEXTENSION(context) {
  const testUnrealGame = (gameId, withLoadOrder) => {
    const game = gameId === GAME_ID;
    const unrealModsPath = UNREALDATA.modsPath;
    const loadOrder = UNREALDATA.loadOrder;
    return (!!unrealModsPath && game && loadOrder === true);
  };

  const testForUnrealMod = (files, gameId) => {
    const supportedGame = testUnrealGame(gameId);
    const fileExt = UNREALDATA.fileExt;
    let modFiles = [];
    if (fileExt)
      modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const supported = (supportedGame && (gameId === GAME_ID) && modFiles.length > 0);
    return Promise.resolve({
      supported,
      requiredFiles: []
    });
  };

  const getUnrealModsPath = (game) => {
    const modsPath = UNREALDATA.modsPath;
    const state = context.api.getState();
    const discoveryPath = util.getSafe(state.settings, ['gameMode', 'discovered', game.id, 'path'], undefined);
    const installPath = [discoveryPath].concat(modsPath.split(path.sep));
    return discoveryPath ? path.join.apply(null, installPath) : undefined;
  };

  context.registerInstaller(UE5_SORTABLE_ID, 29, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealMod(context.api, files, gameId));

  context.registerModType(UE5_SORTABLE_ID, 25, (gameId) => testUnrealGame(gameId, true), getUnrealModsPath, () => Promise.resolve(false), {
    name: UE5_SORTABLE_NAME,
    mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id
  });
  context.registerModType(LEGACY_UE5_SORTABLE_ID, 65, 
    (gameId) => testUnrealGame(gameId, true), 
    getUnrealModsPath, 
    () => Promise.resolve(false), 
    { name: 'Legacy UE - REINSTALL TO SORT',
      mergeMods: mod => 'ZZZZ-' + mod.id
    }
  );
}

// UNFINISHED BUSINESS UNREAL FUNCTIONS ///////////////////////////////////////////////////////////////

//UNREAL - Pre-sort function
async function preSortUnfinished(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', GAME_ID_UNFINISHED], {});
  const fileExt = UNREALDATA.fileExt;

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    const paks = util.getSafe(modInfo.attributes, ['unrealModFiles'], []);
    if (paks.length > 1) name = name + ` (${paks.length} ${fileExt} files)`;

    return {
      id: mod.id,
      name,
      imgUrl: util.getSafe(modInfo, ['attributes', 'pictureUrl'], path.join(__dirname, specUnfinished.game.logo))
    }
  });

  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);
}

function loadOrderPrefixUnfinished(api, mod) {
  const state = api.getState();
  const profile = selectors.lastActiveProfileForGame(state, GAME_ID_UNFINISHED);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});
  const loKeys = Object.keys(loadOrder);
  const pos = loKeys.indexOf(mod.id);
  if (pos === -1) {
      return 'ZZZZ-';
  }
  return makePrefix(pos) + '-';
}

function installUnrealModUnfinished(api, files, gameId) {
  return __awaiter(this, void 0, void 0, function* () {
    const game = gameId;
    const fileExt = UNREALDATA.fileExt;
    if (!fileExt)
      Promise.reject('Unsupported game - UE5 installer failed.');
    const modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const modType = {
      type: 'setmodtype',
      value: UE5_SORTABLE_ID_UNFINISHED,
    };
    const installFiles = (modFiles.length > PAK_FILE_MIN)
      ? yield chooseFilesToInstall(api, modFiles, fileExt)
      : modFiles;
    const unrealModFiles = {
      type: 'attribute',
      key: 'unrealModFiles',
      value: modFiles.map(f => path.basename(f))
    };
    let instructions = installFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file)
      };
    });
    instructions.push(modType);
    instructions.push(unrealModFiles);
    return Promise.resolve({ instructions });
  });
}

function UNREALEXTENSION_UNFINISHED(context) {
  const testUnrealGame = (gameId, withLoadOrder) => {
    const game = gameId === GAME_ID_UNFINISHED;
    const unrealModsPath = UNREALDATA.modsPath;
    const loadOrder = UNREALDATA.loadOrder;
    return (!!unrealModsPath && game && loadOrder === true);
  };

  const testForUnrealMod = (files, gameId) => {
    const supportedGame = testUnrealGame(gameId);
    const fileExt = UNREALDATA.fileExt;
    let modFiles = [];
    if (fileExt)
      modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const supported = (supportedGame && (gameId === GAME_ID_UNFINISHED) && modFiles.length > 0);

    // Test for a mod installer
    if (supported && files.find(file =>
      (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
      (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
      supported = false;
    }

    return Promise.resolve({
      supported,
      requiredFiles: []
    });
  };

  const getUnrealModsPath = (game) => {
    const modsPath = UNREALDATA.modsPath;
    const state = context.api.getState();
    const discoveryPath = util.getSafe(state.settings, ['gameMode', 'discovered', game.id, 'path'], undefined);
    const installPath = [discoveryPath].concat(modsPath.split(path.sep));
    return discoveryPath ? path.join.apply(null, installPath) : undefined;
  };

  context.registerInstaller(UE5_SORTABLE_ID_UNFINISHED, 29, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealModUnfinished(context.api, files, gameId));

  context.registerModType(UE5_SORTABLE_ID_UNFINISHED, 25, (gameId) => testUnrealGame(gameId, true), getUnrealModsPath, () => Promise.resolve(false), {
    name: UE5_SORTABLE_NAME,
    mergeMods: mod => loadOrderPrefixUnfinished(context.api, mod) + mod.id
  });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

// Function to check if staging folder and game path are on same drive partition to enable modtypes + installers
function checkPartitions(folder, game, staging) {
  if (!IO_STORE) { // true if IO-Store is not enabled for the game, since symlinks work fine in that case
    return true;
  }
  try {
    // Define paths
    const path1 = game;
    const path2 = staging;
    const path3 = folder;
    // Ensure all folders exist
    fs.ensureDirSync(path1);
    fs.ensureDirSync(path2);
    fs.ensureDirSync(path3); 
    // Get the stats for all folders
    const stats1 = fs.statSync(path1);
    const stats2 = fs.statSync(path2);
    const stats3 = fs.statSync(path3);
    // Read device IDs and check if they are all the same
    const a = stats1.dev;
    const b = stats2.dev;
    const c = stats3.dev;
    const TEST = ((a === b) && (b === c));
    return TEST;
  } catch (err) {
    //log('error', `Error checking folder partitions: ${err}`);
    return false;
  }
}

//Notification if Config, Save, and Creations folders are not on the same partition
function partitionCheckNotify(api, check, id, name, location, config, save) {
  const NOTIF_ID = `${id}-partioncheck`;
  const MESSAGE = 'Some Mods Installers are Not Available';
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
            text: `Because ${name} includes the IO-Store Unreal Engine feature, Vortex must use hardlinks to install mods for the game.\n`
                + `Because of this, the game, staging folder, and user folder (typically on C Drive) must all be on the same partition to install certain mods with Vortex.\n`
                + `Vortex detected that one or more of the mod types listed below are not available because the game, staging folder, and ${location} folders are not on the same partition.\n`
                + `\n`
                + `Here are your results for the partition check to enable these mod types:\n`
                + `  - Config and Save: ${check ? `ENABLED: ${location} folders are on the same partition as the game and staging folder and the Config and Save modtypes are available` : `DISABLED: ${location} folders are NOT on the same partition as the game and staging folder and the Config and Save modtypes are NOT available`}\n`
                + `\n`
                + `Config Path: ${config}\n`
                + `Save Path: ${save}\n`
                + `\n`
                + `If you want to use the disabled mod types, you must move the game and staging folder to the same partition as the ${location} folders (typically C Drive).\n`
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

async function resolveGameVersion(gamePath, exePath) {
  GAME_VERSION = await setGameVersionPath(gamePath);
  //SHIPPING_EXE = getShippingExe(gamePath);
  const READ_FILE = path.join(gamePath, EXEC_DEFAULT);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') { // use appxmanifest.xml for Xbox version
    try { //try to parse appxmanifest.xml
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parsed = await parseStringPromise(appManifest);
      version = parsed?.Package?.Identity?.[0]?.$?.Version;
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  else { //use shipping exe (note that this only returns the UE engine version right now)
    try {
      const exeVersion = require('exe-version');
      version = await exeVersion.getProductVersion(READ_FILE);
      //log('warn', `Resolved game version for ${GAME_ID} to: ${version}`);
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${READ_FILE} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
}

//Notification if Config, Save, and Creations folders are not on the same partition
function legacyModsNotify(api, legacyMods) {
  const NOTIF_ID = `${GAME_ID}-legacymodsnotify`;
  const MESSAGE = 'Reinstall Pak Mods to Make Sortable';
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
            text: `\n\n`
                + `Due to a bug in a handful of Unreal Engine Vortex game extensions, your pak mods were assigned a modType ID that was shared among several games.\n`
                + `This bug can result in the Load Order tab not properly load ordering your pak mods.\n`
                + `A list of the affected mods is shown below. You must Reinstall these mods to make them sortable.\n`
                + `If you don't Reinstall thes mods, they will still function, but they will sit at the bottom of the loading order and will not be sortable.\n`
                + `\n`
                + `Perform the following steps to Reinstall the affected mods:\n
                  1. Filter your Mods page by Mod Type "Legacy UE - REINSTALL TO SORT" using the categories at the top.\n
                  2. Use the "CTRL + A" keyboard shortcut to select all displayed mods.\n
                  3. Click the "Reinstall" button in the blue ribbon at the bottom of the Mods page.\n
                  4. You can now sort all of your pak mods in the Load Order tab.\n`
                + `\n`
                + `Pak Mods to Reinstall:\n` 
                + `${legacyMods.join('\n')}`
                + `\n`
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

//Setup function
async function setup(discovery, api, gameSpec) {
  //SYNCHRONOUS CODE //////////////////////////////////////
  const state = api.getState();
  const mods = util.getSafe(state, ['persistent', 'mods', gameSpec.game.id], {});
  const legacyMods = Object.keys(mods).filter(id => mods[id]?.type === LEGACY_UE5_SORTABLE_ID);
  if (legacyMods.length > 0) {
    legacyModsNotify(api, legacyMods);
  }
  GAME_PATH = discovery.path;
  GAME_VERSION = setGameVersion(api, GAME_ID);
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  CHECK_DATA = checkPartitions(LOCALAPPDATA, GAME_PATH, STAGING_FOLDER);
  if (!CHECK_DATA) {
    partitionCheckNotify(api, CHECK_DATA, GAME_ID, GAME_NAME, CONFIG_LOC, CONFIG_PATH, SAVE_PATH);
  }
  // ASYCRONOUS CODE ///////////////////////////////////
  if (CHECK_DATA) { //if game, staging folder, and config and save folders are on the same drive
    await fs.ensureDirWritableAsync(CONFIG_PATH);
    await fs.ensureDirWritableAsync(SAVE_PATH);
  } //*/
  //await downloadUe4ss(api, gameSpec, UE4SS_ID);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, SCRIPTS_PATH));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, LOGICMODS_PATH));
  return fs.ensureDirWritableAsync(path.join(GAME_PATH, UE5_PATH));
}

//Setup function
async function setupUnfinished(discovery, api, gameSpec) {
  //SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH_UNFINISHED = discovery.path;
  //GAME_VERSION_UNFINISHED = setGameVersion(GAME_PATH_UNFINISHED, GAME_ID_UNFINISHED);
  STAGING_FOLDER_UNFINISHED = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER_UNFINISHED = selectors.downloadPathForGame(state, gameSpec.game.id);
  CHECK_DATA_UNFINISHED = checkPartitions(LOCALAPPDATA, GAME_PATH_UNFINISHED, STAGING_FOLDER_UNFINISHED);
  if (!CHECK_DATA_UNFINISHED) {
    partitionCheckNotify(api, CHECK_DATA_UNFINISHED, GAME_ID_UNFINISHED, GAME_NAME_UNFINISHED, CONFIG_LOC_UNFINISHED, CONFIG_PATH_UNFINISHED, SAVE_PATH_UNFINISHED);
  }
  // ASYCRONOUS CODE ///////////////////////////////////
  if (CHECK_DATA_UNFINISHED) { //if game, staging folder, and config and save folders are on the same drive
    await fs.ensureDirWritableAsync(CONFIG_PATH_UNFINISHED);
    await fs.ensureDirWritableAsync(SAVE_PATH_UNFINISHED);
  } //*/
  //await downloadUe4ss(api, gameSpec, UE4SS_ID_UNFINISHED);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH_UNFINISHED, SCRIPTS_PATH_UNFINISHED));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH_UNFINISHED, LOGICMODS_PATH));
  return fs.ensureDirWritableAsync(path.join(GAME_PATH_UNFINISHED, UE5_PATH));
}

//Let vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: getExecutable,
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

  //register mod types explicitly (due to dynamic Binaries folder)
  context.registerModType(SCRIPTS_ID, 50, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, SCRIPTS_TARGET), 
    () => Promise.resolve(false), 
    { name: SCRIPTS_NAME }
  );
  context.registerModType(DLL_ID, 52, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, SCRIPTS_TARGET), 
    () => Promise.resolve(false), 
    { name: DLL_NAME }
  );
  context.registerModType(BINARIES_ID, 54, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, BINARIES_TARGET), 
    () => Promise.resolve(false), 
    { name: BINARIES_NAME }
  );
  context.registerModType(UE4SS_ID, 56, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, BINARIES_TARGET), 
    () => Promise.resolve(false), 
    { name: UE4SS_NAME }
  );

  //* register modtypes with partition checks
  context.registerModType(CONFIG_ID, 58, 
    (gameId) => {
      const state = context.api.getState();
      GAME_PATH = getDiscoveryPath(context.api, gameSpec.game.id);
      STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
      if (GAME_PATH !== undefined) {
        CHECK_DATA = checkPartitions(LOCALAPPDATA, GAME_PATH, STAGING_FOLDER);
      }
      return ((gameId === GAME_ID) && (CHECK_DATA === true));
    },
    (game) => pathPattern(context.api, game, CONFIG_TARGET), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  ); //*/
  context.registerModType(SAVE_ID, 60, 
    (gameId) => {
      const state = context.api.getState();
      GAME_PATH = getDiscoveryPath(context.api, gameSpec.game.id);
      STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
      GAME_VERSION = setGameVersion(context.api, gameSpec.game.id);
      if (GAME_PATH !== undefined) {
        CHECK_DATA = checkPartitions(LOCALAPPDATA, GAME_PATH, STAGING_FOLDER);
      }
      return ((gameId === GAME_ID) && (CHECK_DATA === true) && (GAME_VERSION === 'default'));
    },
    (game) => pathPattern(context.api, game, SAVE_TARGET), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  ); //*/

  //register mod installers
  context.registerInstaller(UE4SSCOMBO_ID, 25, testUe4ssCombo, installUe4ssCombo);
  context.registerInstaller(LOGICMODS_ID, 27, testLogic, installLogic);
  //29 is pak installer above
  context.registerInstaller(UE4SS_ID, 31, testUe4ss, installUe4ss);
  context.registerInstaller(SCRIPTS_ID, 33, testScripts, installScripts);
  context.registerInstaller(DLL_ID, 35, testDll, installDll);
  context.registerInstaller(ROOT_ID, 37, testRoot, installRoot);
  context.registerInstaller(CONTENT_ID, 39, testContent, installContent);
  context.registerInstaller(CONFIG_ID, 41, testConfig, (files) => installConfig(context.api, files));
  context.registerInstaller(SAVE_ID, 43, (files, gameId) => testSave(context.api, files, gameId), (files) => installSave(context.api, files));
  context.registerInstaller(BINARIES_ID, 45, testBinaries, installBinaries);

  //register buttons to open folders
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api, gameSpec.game.id);
    const openPath = path.join(GAME_PATH, UE5_ALT_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Binaries Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api, gameSpec.game.id);
    const openPath = path.join(GAME_PATH, BINARIES_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open UE4SS Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api, gameSpec.game.id);
    const openPath = path.join(GAME_PATH, SCRIPTS_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const state = context.api.getState();
    const openPath = path.join(CONFIG_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    const state = context.api.getState();
    const openPath = path.join(SAVE_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download UE4SS', () => {
    downloadUe4ss(context.api, gameSpec, UE4SS_ID).catch(() => null);
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
}

//Let vortex know about the game
function applyGameUnfinished(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher,
    setup: async (discovery) => await setupUnfinished(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    //getGameVersion: resolveGameVersion,
    supportedTools: toolsUnfinished,
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

  //* register modtypes with partition checks
  context.registerModType(CONFIG_ID_UNFINISHED, 60, 
    (gameId) => {
      const state = context.api.getState();
      GAME_PATH_UNFINISHED = getDiscoveryPath(context.api, gameSpec.game.id);
      STAGING_FOLDER_UNFINISHED = selectors.installPathForGame(state, gameSpec.game.id);
      if (GAME_PATH_UNFINISHED !== undefined) {
        CHECK_DATA_UNFINISHED = checkPartitions(LOCALAPPDATA, GAME_PATH_UNFINISHED, STAGING_FOLDER_UNFINISHED);
      }
      return ((gameId === GAME_ID_UNFINISHED) && (CHECK_DATA_UNFINISHED === true));
    },
    (game) => pathPattern(context.api, game, CONFIG_PATH_UNFINISHED), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  ); //*/
  context.registerModType(SAVE_ID_UNFINISHED, 62, 
    (gameId) => {
      const state = context.api.getState();
      GAME_PATH_UNFINISHED = getDiscoveryPath(context.api, gameSpec.game.id);
      STAGING_FOLDER_UNFINISHED = selectors.installPathForGame(state, gameSpec.game.id);
      if (GAME_PATH_UNFINISHED !== undefined) {
        CHECK_DATA_UNFINISHED = checkPartitions(LOCALAPPDATA, GAME_PATH_UNFINISHED, STAGING_FOLDER_UNFINISHED);
      }
      return ((gameId === GAME_ID_UNFINISHED) && (CHECK_DATA_UNFINISHED === true));
    },
    (game) => pathPattern(context.api, game, SAVE_PATH_UNFINISHED), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  ); //*/

  //register mod installers
  context.registerInstaller(UE4SSCOMBO_ID_UNFINISHED, 25, testUe4ssComboUnfinished, installUe4ssComboUnfinished);
  context.registerInstaller(LOGICMODS_ID_UNFINISHED, 27, testLogicUnfinished, installLogicUnfinished);
  //29 is pak installer above
  context.registerInstaller(UE4SS_ID_UNFINISHED, 31, testUe4ssUnfinished, installUe4ssUnfinished); //
  context.registerInstaller(SCRIPTS_ID_UNFINISHED, 33, testScriptsUnfinished, installScriptsUnfinished); //
  context.registerInstaller(DLL_ID_UNFINISHED, 35, testDllUnfinished, installDllUnfinished); //
  context.registerInstaller(ROOT_ID_UNFINISHED, 37, testRootUnfinished, installRootUnfinished); //
  context.registerInstaller(CONTENT_ID_UNFINISHED, 39, testContentUnfinished, installContentUnfinished); //
  context.registerInstaller(CONFIG_ID_UNFINISHED, 41, testConfigUnfinished, (files) => installConfigUnfinished(context.api, files)); //
  context.registerInstaller(SAVE_ID_UNFINISHED, 43, (files, gameId) => testSaveUnfinished(context.api, files, gameId), (files) => installSaveUnfinished(context.api, files)); //
  context.registerInstaller(BINARIES_ID_UNFINISHED, 45, testBinariesUnfinished, installBinariesUnfinished); //

  //register buttons to open folders
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Folder', () => {
    GAME_PATH_UNFINISHED = getDiscoveryPath(context.api, gameSpec.game.id);
    const openPath = path.join(GAME_PATH_UNFINISHED, UE5_ALT_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID_UNFINISHED;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Binaries Folder', () => {
    GAME_PATH_UNFINISHED = getDiscoveryPath(context.api, gameSpec.game.id);
    const openPath = path.join(GAME_PATH_UNFINISHED, BINARIES_PATH_UNFINISHED);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID_UNFINISHED;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open UE4SS Mods Folder', () => {
    GAME_PATH_UNFINISHED = getDiscoveryPath(context.api, gameSpec.game.id);
    const openPath = path.join(GAME_PATH_UNFINISHED, SCRIPTS_PATH_UNFINISHED);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID_UNFINISHED;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = path.join(CONFIG_PATH_UNFINISHED);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID_UNFINISHED;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    GAME_PATH_UNFINISHED = getDiscoveryPath(context.api, gameSpec.game.id);
    const openPath = path.join(GAME_PATH_UNFINISHED, SAVE_PATH_UNFINISHED);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID_UNFINISHED;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download UE4SS', () => {
    downloadUe4ss(context.api, gameSpec, UE4SS_ID_UNFINISHED).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID_UNFINISHED;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID_UNFINISHED;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    const openPath = DOWNLOAD_FOLDER_UNFINISHED;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID_UNFINISHED;
  });
}

//Main function
function main(context) {
  UNREALEXTENSION(context);
  UNREALEXTENSION_UNFINISHED(context);
  applyGame(context, spec);
  applyGameUnfinished(context, specUnfinished);
  if (UNREALDATA.loadOrder === true) { //UNREAL - mod load order
    let previousLO;
    context.registerLoadOrderPage({
      gameId: spec.game.id,
      gameArtURL: path.join(__dirname, spec.game.logo),
      preSort: (items, direction) => preSort(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === UE5_SORTABLE_ID),
      displayCheckboxes: true,
      callback: (loadOrder) => {
        if (previousLO === undefined) previousLO = loadOrder;
        if (loadOrder === previousLO) return;
        context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
        previousLO = loadOrder;
      },
      createInfoPanel: () =>
      context.api.translate(`Drag and drop the mods on the left to change the order in which they load. ${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes `
      + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
      + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.'),
    });
    let previousLO_UNFINISHED;
    context.registerLoadOrderPage({
      gameId: specUnfinished.game.id,
      gameArtURL: path.join(__dirname, specUnfinished.game.logo),
      preSort: (items, direction) => preSortUnfinished(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === UE5_SORTABLE_ID_UNFINISHED),
      displayCheckboxes: true,
      callback: (loadOrder) => {
        if (previousLO_UNFINISHED === undefined) previousLO_UNFINISHED = loadOrder;
        if (loadOrder === previousLO_UNFINISHED) return;
        context.api.store.dispatch(actions.setDeploymentNecessary(specUnfinished.game.id, true));
        previousLO_UNFINISHED = loadOrder;
      },
      createInfoPanel: () =>
      context.api.translate(`Drag and drop the mods on the left to change the order in which they load. ${specUnfinished.game.name} loads mods in alphanumerical order, so Vortex prefixes `
      + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
      + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.'),
    });
  }

  context.once(() => { // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
