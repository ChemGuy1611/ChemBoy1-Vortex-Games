/*////////////////////////////////////////////////
Name: Of Ash and Steel Vortex Extension
Structure: Unreal Engine Game
Author: ChemBoy1
Version: 0.1.1
Date: 2026-01-07
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');

//const USER_HOME = util.getVortexPath('home');
//const DOCUMENTS = util.getVortexPath('documents');
//const ROAMINGAPPDATA = util.getVortexPath('appData');
const LOCALAPPDATA = util.getVortexPath('localAppData');

//Specify all information about the game
const GAME_ID = "ofashandsteel"; //same as Nexus domain
const STEAMAPP_ID = "2893820"; //from steamdb.info
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null; //from egdata.app
const GOGAPP_ID = "1113561740"; // from gogdb.org
const XBOXAPP_ID = null; //from appxmanifest.xml
const XBOXEXECNAME = null; //from appxmanifest.xml
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, GOGAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Of Ash and Steel";
const GAME_NAME_SHORT = "Of Ash and Steel"; //Try for 8-10 characters
const EPIC_CODE_NAME = "ofAshAndSteelGame";
const EXEC = `${EPIC_CODE_NAME}.exe`;
const EXEC_EPIC = EXEC;
const EXEC_GOG = EXEC;
const EXEC_DEMO = EXEC;
const EXEC_XBOX = 'gamelaunchhelper.exe';
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Of_Ash_and_Steel";

//feature toggles
const hasXbox = false; //toggle for Xbox version logic (to unify templates)
const multiExe = false; //toggle for multiple executables (Epic/GOG/Demo don't match Steam)
const hasModKit = false; //toggle for UE ModKit mod support
const autoDownloadUe4ss = false; //toggle for auto downloading UE4SS
const SIGBYPASS_REQUIRED = false; //set true if there are .sig files in the Paks folder
const IO_STORE = false; //true if the Paks folder contains .ucas and .utoc files

//UE specific
const UE4SS_PAGE_NO = 0; //set if there is UE4SS Nexus page
const UE4SS_FILE_NO = 0;
const UE4SS_DOMAIN = GAME_ID;
const UE4SS_MOD_PATH = path.join('ue4ss', 'Mods');
const EXEC_FOLDER_DEFAULT = "Win64";
const EXEC_FOLDER_XBOX = "WinGDK";

//config, save, shipping exe
const DATA_FOLDER = EPIC_CODE_NAME;
const XBOX_SAVE_STRING = ''; //'8wekyb3d8bbwe' if published by Microsoft
const CONFIG_FOLDERNAME = 'WindowsNoEditor';
const CONFIG_LOC = 'Local AppData';
const SAVE_LOC = 'Local AppData';
const CONFIGMOD_LOCATION = LOCALAPPDATA;
const SAVEMOD_LOCATION = CONFIGMOD_LOCATION;
const SHIPEXE_STRING_DEFAULT = '';
const SHIPEXE_STRING_EGS = '';
const SHIPEXE_STRING_GOG = '';
const SHIPEXE_STRING_XBOX = '';
const SHIPEXE_STRING_DEMO = '';
const SHIPEXE_PROJECTNAME = EPIC_CODE_NAME;

const CONFIG_PATH_DEFAULT = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, "Saved", "Config", CONFIG_FOLDERNAME);
const CONFIG_PATH_XBOX = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, "Saved", "Config", "WinGDK"); //XBOX Version
const SAVE_PATH_DEFAULT = path.join(SAVEMOD_LOCATION, DATA_FOLDER, "Saved", "SaveGames");
const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_SAVE_STRING}`, "SystemAppData", "wgs"); //XBOX Version

//Settings related to the IO Store UE feature
let PAKMOD_EXTS = ['.pak'];
let PAK_FILE_MIN = 1;
let SYM_LINKS = true;
if (IO_STORE) { //Set file number for pak installer file selection (needs to be 3 if IO Store is used to accomodate .ucas and .utoc files)
  SYM_LINKS = false;
  PAKMOD_EXTS = ['.pak', '.ucas', '.utoc'];
  PAK_FILE_MIN = PAKMOD_EXTS.length;
}

//global variables to set later
let GAME_PATH = ''; //game installation path
let CHECK_DATA = false; //boolean to check if game, staging folder, and config and save folders are on the same drive
let CHECK_DOCS = false; //secondary same as above (if save and config are in different locations)
let STAGING_FOLDER = ''; //Vortex staging folder path
let DOWNLOAD_FOLDER = ''; //Vortex download folder path
let GAME_VERSION = '';
let USERID_FOLDER = "";
let STORE_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//Unreal Engine Game Data
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks'), //Don't use the "~mods" folder as some mods apparently don't work from that folder.
  fileExt: PAKMOD_EXTS,
  loadOrder: false,
}
const UE5_SORTABLE_ID = `${GAME_ID}-uesortablepak`; //this should not be changed to be maintain consistency with other UE5 games
const UE5_SORTABLE_NAME = 'UE Sortable Pak Mod';

//Information for modtypes, installers, tools, and actions
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
let BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT);
let SHIPPING_EXE = path.join(BINARIES_PATH, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_DEFAULT}-Shipping.exe`);

const GOG_FILE = path.join('Plugins', 'OnlineSubsystemGOG', 'GalaxySDK', 'Galaxy64.dll');
const STEAM_FILE = path.join('Engine', 'Binaries', 'ThirdParty', 'Steamworks', 'Steamv153', 'Win64', 'steam_api64.dll');
const EPIC_FILE = path.join(EPIC_CODE_NAME, 'Binaries', 'Win64', SHIPPING_EXE);
const XBOX_FILE = EXEC_XBOX;

const PAK_ALT_ID = `${GAME_ID}-pakalt`;
const PAK_ALT_NAME = 'Paks (with "~mods")';
const PAK_PATH = UNREALDATA.modsPath;
const PAK_ALT_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods');
const PAK_EXT = '.pak';

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";
const ROOT_FOLDER = EPIC_CODE_NAME;
const ROOT_FOLDERS = [ROOT_FOLDER, 'Engine'];

const ROOTSUB_ID = `${GAME_ID}-rootsubfolders`;
const ROOTSUB_NAME = "Root Sub-Folders";
const ROOTSUB_FOLDERS = ['Content', 'Binaries', 'Mods'];
const ROOTSUB_PATH = EPIC_CODE_NAME;

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = `Config (${CONFIG_LOC})`;
let CONFIG_PATH = CONFIG_PATH_DEFAULT;
const CONFIG_FILES = ["engine.ini", "scalability.ini", "input.ini", "game.ini", "gameusersettings.ini"];
const CONFIG_EXT = ".ini";

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = `Saves (${SAVE_LOC})`;
const SAVE_FOLDER = SAVE_PATH_DEFAULT;
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}
try {
  const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
} //*/
let SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_EXT = ".sav";
const SAVE_COMPAT_VERSIONS = ['steam', 'epic', 'gog'];

const SCRIPTS_ID = `${GAME_ID}-scripts`;
const SCRIPTS_NAME = "UE4SS Script Mod";
const SCRIPTS_EXT = ".lua";
const SCRIPTS_FOLDER = "Scripts";
let SCRIPTS_PATH = path.join(BINARIES_PATH, UE4SS_MOD_PATH);

const DLL_ID = `${GAME_ID}-ue4ssdll`;
const DLL_NAME = "UE4SS DLL Mod";
const DLL_EXT = ".dll";
const DLL_FOLDER = "dlls";
let DLL_PATH = SCRIPTS_PATH;

const LOGICMODS_ID = `${GAME_ID}-logicmods`;
const LOGICMODS_NAME = "UE4SS LogicMods (Blueprint)";
const UE4SSCOMBO_ID = `${GAME_ID}-ue4sscombo`;
const UE4SSCOMBO_NAME = "UE4SS Script-LogicMod Combo";
const LOGICMODS_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks');
const LOGICMODS_FOLDER = "LogicMods";
const LOGICMODS_EXT = ".pak";

const UE4SS_ID = `${GAME_ID}-ue4ss`;
const UE4SS_NAME = "UE4SS";
const UE4SS_FILE = "dwmapi.dll";
const UE4SS_DLFILE_STRING = "ue4ss_v";
const UE4SS_URL = "https://github.com/UE4SS-RE/RE-UE4SS/releases";

//Save Editor (only used if one is available)
const SAVE_EDITOR_ID = `${GAME_ID}-saveeditor`;
const SAVE_EDITOR_NAME = "Save Editor";
const SAVE_EDITOR_EXEC = "XXX.exe";

//Signature Bypass (only used if game requires)
const SIGBYPASS_ID = `${GAME_ID}-sigbypass`;
const SIGBYPASS_NAME = "Sig Bypass";
const SIGBYPASS_DLL = "dsound.dll";
const SIGBYPASS_LUA = "UniversalSigBypasser.asi";
const SIGBYPASS_PAGE_NO = 1416;
const SIGBYPASS_FILE_NO = 5719;
const SIGBYPASS_DOMAIN = 'site';

//ModKit (only used if game supports)
const MODKITMOD_ID = `${GAME_ID}-modkitmod`;
const MODKITMOD_NAME = "ModKit mod";
const MODKITMOD_FILE = 'mod.json';
const MODKITMOD_EXT = '.uplugin';
const MODKITMOD_PATH = path.join(EPIC_CODE_NAME, 'Mods');

const MODKIT_ID = `${GAME_ID}-modkit`;
const MODKIT_NAME = "ModKit";
const MODKITAPP_ID = "XXX";
const MODKIT_EXEC_NAME = "ModKit.exe";
const MODKIT_FOLDER = path.join('XXX', 'Binaries', 'Win64');
const MODKIT_EXEC_PATH = path.join(MODKIT_FOLDER, MODKIT_EXEC_NAME);

const MOD_PATH_DEFAULT = PAK_PATH;
const REQ_FILE = EPIC_CODE_NAME;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
let MODTYPE_FOLDERS = [path.join(LOGICMODS_PATH, 'LogicMods'), PAK_PATH, PAK_ALT_PATH];

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    //"parameters": PARAMETERS,
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
      "supportsSymlinks": SYM_LINKS,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
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
      "id": PAK_ALT_ID,
      "name": PAK_ALT_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', PAK_ALT_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": ROOTSUB_ID,
      "name": ROOTSUB_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', ROOTSUB_PATH)
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

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

//Set mod type priority
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
  catch (err) { //this happens if the executable comes back as "undefined", usually caused by another app locking down the folder
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Set mod path
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

async function requiresLauncher(gamePath, store) {
  if (store === 'xbox' && DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  } //*/
  //*
  if (store === 'epic' && DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID)) {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  //*
  if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

function getUserIdFolder(savePath) {
  try {
    const SAVE_ARRAY = fs.readdirSync(savePath);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(savePath, entry));
  } catch(err) {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  }
  return SAVE_PATH = path.join(savePath, USERID_FOLDER);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (!hasXbox && !multiExe) {
    return EXEC;
  }
  if (hasXbox) {
    if (statCheckSync(discoveryPath, EXEC_XBOX)) {
      GAME_VERSION = 'xbox';
      BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_XBOX);
      SHIPPING_EXE = path.join(BINARIES_PATH, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_XBOX}${SHIPEXE_STRING_XBOX}-Shipping.exe`);
      SCRIPTS_PATH = path.join(BINARIES_PATH, UE4SS_MOD_PATH);
      CONFIG_PATH = CONFIG_PATH_XBOX;
      //CONFIG_PATH = setConfigPath(GAME_VERSION); //if there's an intermediate store folder in the path
      SAVE_PATH = getUserIdFolder(SAVE_PATH_XBOX);
      return EXEC_XBOX;
    }
  }
  if (statCheckSync(discoveryPath, EXEC)) {
    GAME_VERSION = 'steam';
    BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT);
    SHIPPING_EXE = path.join(BINARIES_PATH, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_DEFAULT}-Shipping.exe`);
    SCRIPTS_PATH = path.join(BINARIES_PATH, UE4SS_MOD_PATH);
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    //CONFIG_PATH = setConfigPath(GAME_VERSION); //if there's an intermediate store folder in the path
    //SAVE_PATH = setSavePath;
    SAVE_PATH = SAVE_PATH_DEFAULT;
    return EXEC;
  } //*/
  if (statCheckSync(discoveryPath, EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT);
    SHIPPING_EXE = path.join(BINARIES_PATH, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_EGS}-Shipping.exe`);
    SCRIPTS_PATH = path.join(BINARIES_PATH, UE4SS_MOD_PATH);
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    //CONFIG_PATH = setConfigPath(GAME_VERSION); //if there's an intermediate store folder in the path
    //SAVE_PATH = setSavePath;
    SAVE_PATH = SAVE_PATH_DEFAULT;
    return EXEC_EPIC;
  } //*/
  if (statCheckSync(discoveryPath, EXEC_GOG)) {
    GAME_VERSION = 'gog';
    BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT);
    SHIPPING_EXE = path.join(BINARIES_PATH, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_GOG}-Shipping.exe`);
    SCRIPTS_PATH = path.join(BINARIES_PATH, UE4SS_MOD_PATH);
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    //CONFIG_PATH = setConfigPath(GAME_VERSION); //if there's an intermediate store folder in the path
    //SAVE_PATH = setSavePath;
    SAVE_PATH = SAVE_PATH_DEFAULT;
    return EXEC_GOG;
  } //*/
  if (statCheckSync(discoveryPath, EXEC_DEMO)) {
    GAME_VERSION = 'demo';
    BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT);
    SHIPPING_EXE = path.join(BINARIES_PATH, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_DEMO}-Shipping.exe`);
    SCRIPTS_PATH = path.join(BINARIES_PATH, UE4SS_MOD_PATH);
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    //CONFIG_PATH = setConfigPath(GAME_VERSION); //if there's an intermediate store folder in the path
    //SAVE_PATH = setSavePath;
    SAVE_PATH = SAVE_PATH_DEFAULT;
    return EXEC_DEMO;
  } //*/
  GAME_VERSION = 'default';
  return EXEC;
}

//Get correct shipping executable for game version
function getShippingExe(gamePath) {
  if (hasXbox) {
    if (statCheckSync(gamePath, EXEC_XBOX)) {
      SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_XBOX, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_XBOX}${SHIPEXE_STRING_XBOX}-Shipping.exe`);
      return SHIPPING_EXE; 
    }
  }
  if (statCheckSync(gamePath, EXEC)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_DEFAULT}-Shipping.exe`);
    return SHIPPING_EXE;
  }
  if (statCheckSync(gamePath, EXEC_EPIC)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_EGS}-Shipping.exe`);
    return SHIPPING_EXE;
  }
  if (statCheckSync(gamePath, EXEC_GOG)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_GOG}-Shipping.exe`);
    return SHIPPING_EXE;
  }
  if (statCheckSync(gamePath, EXEC_DEMO)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_DEMO}-Shipping.exe`);
    return SHIPPING_EXE;
  }
}

//Get correct shipping executable folder for game version (for tool pathing)
function getBinariesFolder(discoveryPath) {
  if (!hasXbox) {
    return BINARIES_PATH;
  }
  if (statCheckSync(discoveryPath, EXEC_FOLDER_XBOX)) {
    BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_XBOX);
    return BINARIES_PATH;
  }
  if (statCheckSync(discoveryPath, EXEC_FOLDER_DEFAULT)) {
    BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT);
    return BINARIES_PATH;
  }
}

//Get correct game version - async
async function setGameVersionAsync(gamePath) {
  if (hasXbox) {
    if (await statCheckAsync(gamePath, EXEC_XBOX)) {
      GAME_VERSION = 'xbox';
      return GAME_VERSION;
    }
  }
  if (await statCheckAsync(gamePath, EXEC)) {
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, EXEC_GOG)) {
    GAME_VERSION = 'gog';
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, EXEC_DEMO)) {
    GAME_VERSION = 'demo';
    return GAME_VERSION;
  } //*/
}

//Get correct game version - synchronous
function setGameVersionSync(gamePath) {
  if (hasXbox) {
    if (statCheckSync(gamePath, EXEC_XBOX)) {
      GAME_VERSION = 'xbox';
      return GAME_VERSION;
    }
  }
  if (statCheckSync(gamePath, EXEC)) {
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  }
  if (statCheckSync(gamePath, EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    return GAME_VERSION;
  }
  if (statCheckSync(gamePath, EXEC_GOG)) {
    GAME_VERSION = 'gog';
    return GAME_VERSION;
  }
  if (statCheckSync(gamePath, EXEC_DEMO)) {
    GAME_VERSION = 'demo';
    return GAME_VERSION;
  } //*/
}

//Get correct config path for game version
async function setConfigPath(version) {
  const DATA_PATH = path.join(CONFIGMOD_LOCATION, DATA_FOLDER);
  try {
    const ARRAY = await fs.readdirAsync(DATA_PATH);
    STORE_FOLDER = ARRAY.find(entry => isDir(DATA_PATH, entry));
  } catch(err) {
    STORE_FOLDER = '';
  }
  if (STORE_FOLDER === undefined) {
    STORE_FOLDER = '';
  } 
  CONFIG_PATH = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, STORE_FOLDER, "Saved", "Config", CONFIG_FOLDERNAME);
  if (version === 'xbox') {
    CONFIG_PATH = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, STORE_FOLDER, "Saved", "Config", 'WinGDK');
  }
  return CONFIG_PATH;
}

//Get correct save path for game version
async function setSavePath() {
  const DATA_PATH = path.join(SAVEMOD_LOCATION, DATA_FOLDER);
  try {
    const ARRAY = await fs.readdirAsync(DATA_PATH);
    STORE_FOLDER = ARRAY.find(entry => isDir(DATA_PATH, entry));
  } catch(err) {
    STORE_FOLDER = '';
  }
  if (STORE_FOLDER === undefined) {
    STORE_FOLDER = '';
  }
  SAVE_PATH = path.join(SAVEMOD_LOCATION, DATA_FOLDER, STORE_FOLDER, "Saved", "SaveGames");
  SAVE_PATH = getUserIdFolder(SAVE_PATH);
  return SAVE_PATH;
} //*/

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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for mod files
function testModKitMod(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === MODKITMOD_EXT));
  const isJson = files.some(file => (path.basename(file).toLowerCase() === MODKITMOD_FILE));
  let supported = (gameId === spec.game.id) && ( isMod && isJson );

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

//Installer install mod files
function installModKitMod(files, fileName) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MODKITMOD_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODKITMOD_ID };
  let MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  if (rootPath !== '.') {
    MOD_NAME = path.basename(rootPath);
    MOD_FOLDER = MOD_NAME;
  }
  try { //read mod.json file to get folder name (game will crash if this doesn't match)
    const JSON_OBJECT = JSON.parse(fs.readFileSync(path.join(fileName, rootPath, MODKITMOD_FILE)));
    const JSON_MOD_NAME = JSON_OBJECT["modPluginName"];
    MOD_FOLDER = JSON_MOD_NAME;
  } catch (err) { //mod.json could not be read.
    log('error', `Could not read mod.json file for mod ${MOD_NAME}.`);
  }

  // Remove directories and anything that isn't in the rootPath.
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

//Test for save files
function testUe4ssCombo(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SCRIPTS_EXT));
  const isModAlt = files.some(file => (path.basename(file).toLowerCase() === 'binaries')); //added to catch mods packaged with paks and dll/asi, but no lua scripts.
  const isMod2 = files.some(file => (path.extname(file).toLowerCase() === LOGICMODS_EXT));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isMod || isModAlt ) && isMod2 && isFolder;

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
  const modFile = files.find(file => (path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase()));
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
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LOGICMODS_FOLDER.toLowerCase()));
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
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LOGICMODS_FOLDER.toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOGICMODS_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep))
    )
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
  const isMod = files.some(file => (path.basename(file).toLowerCase() === UE4SS_FILE));
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
  const modFile = files.find(file => (path.basename(file).toLowerCase() === UE4SS_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE4SS_ID };

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

//Installer test for Signature Bypass files
function testSigBypass(files, gameId) {
  const isDll = files.some(file => path.basename(file).toLowerCase() === SIGBYPASS_DLL);
  const isLua = files.some(file => path.basename(file).toLowerCase() === SIGBYPASS_LUA.toLowerCase());
  let supported = (gameId === spec.game.id) && isDll && isLua;

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
function installSigBypass(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === SIGBYPASS_DLL);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SIGBYPASS_ID };

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
  let modFile = files.find(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  let setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };
  if (modFile === undefined) {
    modFile = files.find(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    setModTypeInstruction = { type: 'setmodtype', value: ROOTSUB_ID };
  }
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);

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
  GAME_PATH = getDiscoveryPath(api);
  const IS_CONFIG = checkPartitions(CONFIGMOD_LOCATION, GAME_PATH);
  if (IS_CONFIG === false) {
    //api.showErrorNotification(`Could not install mod as Config`, `You tried installing a Config mod, but the game, staging folder, and ${CONFIG_LOC} folder are not all on the same drive. Please move the game and/or staging folder to the same drive as the ${CONFIG_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
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
            { label: 'Continue', action: () => dismiss() },
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

function saveErrorNotify(api) {
  const NOTIF_ID = `${GAME_ID}-saveinsterrxbox`;
  const MESSAGE = `Save files are not supported by the Xbox version of ${GAME_NAME}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'error',
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}

//Test for save files
function testSave(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SAVE_EXT));
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
function installSave(api, files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === SAVE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

  GAME_PATH = getDiscoveryPath(api);
  GAME_VERSION = setGameVersionSync(GAME_PATH);
  const TEST = SAVE_COMPAT_VERSIONS.includes(GAME_VERSION);
  if (!TEST) {
    throw new Error(`Save files are not supported by the Xbox version of ${GAME_NAME}`);
    //saveErrorNotify(api);
  }
  
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
  GAME_PATH = getDiscoveryPath(api);
  const IS_SAVE = checkPartitions(SAVEMOD_LOCATION, GAME_PATH);
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
            { label: 'Continue', action: () => dismiss() },
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

//Test Fallback installer to Binaries folder
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

//Fallback installer to Binaries folder
function installBinaries(api, files, fileName) {
  fallbackInstallerNotify(api, fileName);
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };
  
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
  const NOTIF_ID = `${GAME_ID}-fallbackinstaller-notify`;
  modName = path.basename(modName, '.installing');
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
            text: `\n`
                + `The mod you just installed reached the fallback installer to the Binaries folder. This means Vortex could not determine where to place these mod files.\n`
                + `Please check the mod page description and review the files in the mod staging folder to determine whether the mod was installed correctly.\n`
                + `It may be necessary to perform manual file manipulation for the mod, or to manually change the Mod Type.\n`
                + `It is also possible that the mod was installed correctly. For example a non-UE4SS dll mod, like Optiscaler, is installed correctly to the Binaries folder.\n`
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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if UE4SS is installed
function isUe4ssInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === UE4SS_ID);
}

//Check if Signature Bypass is installed
function isSigBypassInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === SIGBYPASS_ID);
}

//* Download UE4SS from GitHub page (user browse for download)
async function downloadUe4ss(api, gameSpec) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  const URL = UE4SS_URL;
  const MOD_NAME = UE4SS_NAME;
  const MOD_TYPE = UE4SS_ID;
  const ARCHIVE_NAME = UE4SS_DLFILE_STRING;
  const instructions = api.translate(`Click on Continue below to open the browser. - `
    + `Navigate to the latest experimental version of ${MOD_NAME} on the GitHub releases page and `
    + `click on the appropriate file to download and install the mod.`
  );

  if (!isInstalled) {
    return new Promise((resolve, reject) => { //Browse and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.UserCanceled('Selected wrong download'));
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
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
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

//* Function to auto-download UE4SS from Nexus Mods
async function downloadUe4ssNexus(api, gameSpec) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = UE4SS_NAME;
    const MOD_TYPE = UE4SS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = UE4SS_PAGE_NO;
    const FILE_ID = UE4SS_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = UE4SS_DOMAIN;
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

//* Function to auto-download Mod Enabler form Nexus Mods
async function downloadSigBypass(api, gameSpec) {
  let isInstalled = isSigBypassInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = SIGBYPASS_NAME;
    const MOD_TYPE = SIGBYPASS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    let FILE_ID = SIGBYPASS_FILE_NO;  //If using a specific file id because "input" below gives an error
    const PAGE_ID = SIGBYPASS_PAGE_NO;
    const GAME_DOMAIN = SIGBYPASS_DOMAIN;
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
      let FILE = FILE_ID; //use the FILE_ID directly for the correct game store version
      let URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
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
      } //*/
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

// UNREAL FUNCTIONS ///////////////////////////////////////////////////////////////

//UNREAL - Pre-sort function
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
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
            return Promise.reject(new util.UserCanceled('User cancelled.'));
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
    const game = gameId === spec.game.id;
    const unrealModsPath = UNREALDATA.modsPath;
    const loadOrder = UNREALDATA.loadOrder;
    return (!!unrealModsPath && game);
  };

  const testForUnrealMod = (files, gameId) => {
    const supportedGame = testUnrealGame(gameId);
    const fileExt = UNREALDATA.fileExt;
    let modFiles = [];
    if (fileExt) {
      modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    }
    const supported = ( supportedGame && (gameId === spec.game.id) && modFiles.length > 0 );
    
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

  context.registerInstaller('ue5-pak-installer', 29, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealMod(context.api, files, gameId));

  context.registerModType(UE5_SORTABLE_ID, 25, 
    (gameId) => testUnrealGame(gameId, true), 
    getUnrealModsPath, 
    () => Promise.resolve(false), 
    { name: UE5_SORTABLE_NAME,
      mergeMods: mod => {
        if (UNREALDATA.loadOrder === true) {
          loadOrderPrefix(context.api, mod) + mod.id
        } else {
          return '';
        }
      }
    }
  );
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

// Function to check if staging folder and game path are on same drive partition to enable modtypes + installers
function checkPartitions(folder, discoveryPath) {
  if (!IO_STORE) { // true if IO-Store is not enabled for the game, since symlinks work fine in that case
    return true;
  }
  try {
    // Define paths
    const path1 = discoveryPath;
    const path2 = STAGING_FOLDER;
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
function partitionCheckNotify(api, CHECK_DATA) {
  const NOTIF_ID = `${GAME_ID}-partioncheck`;
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
            text: `Because ${GAME_NAME} includes the IO-Store Unreal Engine feature, Vortex must use hardlinks to install mods for the game.\n`
                + `Because of this, the game, staging folder, and user folder (typically on C Drive) must all be on the same partition to install certain mods with Vortex.\n`
                + `Vortex detected that one or more of the mod types listed below are not available because the game, staging folder, and ${CONFIG_LOC} folder are not on the same partition.\n`
                + `\n`
                + `Here are your results for the partition check to enable these mod types:\n`
                + `  - Config: ${CHECK_DATA ? `ENABLED: ${CONFIG_LOC} folder is on the same partition as the game and the Vortex staging folder, so the Config modtype is available` : `DISABLED: ${CONFIG_LOC} folder is NOT on the same partition as the game and the Vortex staging folder, so the Config modtype is NOT available`}\n`
                + `  - Save: ${CHECK_DATA ? `ENABLED: ${SAVE_LOC} folder is on the same partition as the game and the Vortex staging folder, so the Save modtype is available` : `DISABLED: ${SAVE_LOC} folder is NOT on the same partition as the game and the Vortex staging folder, so the Save modtype is NOT available`}\n`
                + `\n`
                + `Game Path: ${GAME_PATH}\n`
                + `Staging Path: ${STAGING_FOLDER}\n`
                + `Config Path: ${CONFIG_PATH}\n`
                + `Save Path (installer for Steam/Epic/GOG versions only): ${SAVE_PATH}\n`
                + `\n`
                + `If you want to use the disabled mod types, you must move the game and staging folder to the same partition as the folders shown above (typically C Drive).\n`
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
  GAME_VERSION = await setGameVersionAsync(gamePath);
  //SHIPPING_EXE = getShippingExe(gamePath);
  const READ_FILE = path.join(gamePath, SHIPPING_EXE);
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
      log('error', `Could not read ${READ_FILE} file to get game version: ${err}`);
      return Promise.resolve(version);
    }
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
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  CHECK_DATA = checkPartitions(CONFIGMOD_LOCATION, GAME_PATH);
  //CHECK_DOCS = checkPartitions(SAVEMOD_LOCATION, GAME_PATH);
  if (!CHECK_DATA) {
    partitionCheckNotify(api, CHECK_DATA);
  }
  /*if (!CHECK_DOCS) {
    partitionCheckNotify(api, CHECK_DOCS);
  } //*/
  // ASYNC CODE ///////////////////////////////////
  GAME_VERSION = await setGameVersionAsync(GAME_PATH);
  if (CHECK_DATA) { //if game, staging folder, and config and save folders are on the same drive
    await fs.ensureDirWritableAsync(CONFIG_PATH);
    if (SAVE_COMPAT_VERSIONS.includes(GAME_VERSION)) {
      await fs.ensureDirWritableAsync(SAVE_PATH);
    }
  } //*/
  /*if (CHECK_DOCS) { //if game, staging folder, and config and save folders are on the same drive
    await fs.ensureDirWritableAsync(SAVE_PATH);
  } //*/
  if (UE4SS_PAGE_NO !== 0 && autoDownloadUe4ss === true) {
    await downloadUe4ssNexus(api, gameSpec);
  } //*/
  if (SIGBYPASS_REQUIRED === true) {
    await downloadSigBypass(api, gameSpec);
  }
  MODTYPE_FOLDERS.push(SCRIPTS_PATH);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    getGameVersion: resolveGameVersion,
    supportedTools: [
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
        //parameters: [],
      }, //*/
      {
        id: `${GAME_ID}-customlaunchxbox`,
        name: `Custom Launch`,
        logo: `exec.png`,
        executable: () => EXEC_XBOX,
        requiredFiles: [EXEC_XBOX],
        detach: true,
        relative: true,
        exclusive: true,
        shell: true,
        //defaultPrimary: true,
        //parameters: [],
      }, //*/
      /*{
        id: SAVE_EDITOR_ID,
        name: SAVE_EDITOR_NAME,
        logo: `saveeditor.png`,
        queryPath: getBinariesFolder,
        executable: () => SAVE_EDITOR_EXEC,
        requiredFiles: [SAVE_EDITOR_EXEC],
        detach: true,
        relative: true,
        exclusive: true,
        //shell: true,
        //parameters: [],
      }, //*/
    ],
  };
  context.registerGame(game);

  //register mod types recursively
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod types explicitly (due to potentially dynamic Binaries folder)
    context.registerModType(SCRIPTS_ID, 50, 
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, 
      (game) => pathPattern(context.api, game, path.join('{gamePath}', SCRIPTS_PATH)), 
      () => Promise.resolve(false), 
      { name: SCRIPTS_NAME }
    );
    context.registerModType(DLL_ID, 52, 
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, 
      (game) => pathPattern(context.api, game, path.join('{gamePath}', SCRIPTS_PATH)), 
      () => Promise.resolve(false), 
      { name: DLL_NAME }
    );
    context.registerModType(BINARIES_ID, 54, 
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, 
      (game) => pathPattern(context.api, game, path.join('{gamePath}', BINARIES_PATH)), 
      () => Promise.resolve(false), 
      { name: BINARIES_NAME }
    );
    context.registerModType(UE4SS_ID, 56, 
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, 
      (game) => pathPattern(context.api, game, path.join('{gamePath}', BINARIES_PATH)), 
      () => Promise.resolve(false), 
      { name: UE4SS_NAME }
    );

  //register sigbypass modtype
  if (SIGBYPASS_REQUIRED === true) {
    context.registerModType(SIGBYPASS_ID, 58, 
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, 
      (game) => pathPattern(context.api, game, path.join('{gamePath}', BINARIES_PATH)),
      () => Promise.resolve(false), 
      { name: SIGBYPASS_NAME }
    );
  }

  //register ModKit modtype
  if (hasModKit === true) {
    context.registerModType(MODKITMOD_ID, 60, 
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, 
      (game) => pathPattern(context.api, game, path.join('{gamePath}', MODKITMOD_PATH)),
      () => Promise.resolve(false), 
      { name: MODKITMOD_NAME }
    );
  }

  //* register modtypes with partition checks
  context.registerModType(CONFIG_ID, 62, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DATA = checkPartitions(CONFIGMOD_LOCATION, GAME_PATH);
      }
      return ((gameId === GAME_ID) && (CHECK_DATA === true));
    },
    (game) => pathPattern(context.api, game, CONFIG_PATH), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  ); //*/
  context.registerModType(SAVE_ID, 64, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      GAME_VERSION = setGameVersionSync(GAME_PATH);
      if (GAME_PATH !== undefined) {
        CHECK_DATA = checkPartitions(SAVEMOD_LOCATION, GAME_PATH);
      }
      return ((gameId === GAME_ID) && (CHECK_DATA === true) && SAVE_COMPAT_VERSIONS.includes(GAME_VERSION)); //*/
      /*if (GAME_PATH !== undefined) {
        CHECK_DOCS = checkPartitions(DOCUMENTS, GAME_PATH);
      }
      return ((gameId === GAME_ID) && (CHECK_DOCS === true) && SAVE_COMPAT_VERSIONS.includes(GAME_VERSION)); //*/
    },
    (game) => pathPattern(context.api, game, SAVE_PATH), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  ); //*/
  
  //register mod installers
  if (hasModKit === true) {
    context.registerInstaller(MODKITMOD_ID, 25, testModKitMod, installModKitMod);
  }
  context.registerInstaller(UE4SSCOMBO_ID, 26, testUe4ssCombo, installUe4ssCombo);
  context.registerInstaller(LOGICMODS_ID, 27, testLogic, installLogic);
  //29 is pak installer above
  context.registerInstaller(UE4SS_ID, 31, testUe4ss, installUe4ss);
  if (SIGBYPASS_REQUIRED === true) {
    context.registerInstaller(SIGBYPASS_ID, 33, testSigBypass, installSigBypass);
  }
  context.registerInstaller(SCRIPTS_ID, 35, testScripts, installScripts);
  context.registerInstaller(DLL_ID, 37, testDll, installDll);
  context.registerInstaller(ROOT_ID, 39, testRoot, installRoot);
  context.registerInstaller(CONFIG_ID, 41, testConfig, (files) => installConfig(context.api, files));
  context.registerInstaller(SAVE_ID, 43, testSave, (files) => installSave(context.api, files));
  context.registerInstaller(BINARIES_ID, 49, testBinaries, (files, fileName) => installBinaries(context.api, files, fileName));

  //register buttons to open folders
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, PAK_ALT_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Binaries Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, BINARIES_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open UE4SS Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn( path.join(GAME_PATH, SCRIPTS_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open LogicMods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, LOGICMODS_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', async () => {
    //CONFIG_PATH = await setConfigPath(GAME_VERSION);
    util.opn(CONFIG_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', async () => {
    //SAVE_PATH = await setSavePath();
    util.opn(SAVE_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download UE4SS', () => {
    if (UE4SS_PAGE_NO !== 0) { //download from Nexus if the page exists
      downloadUe4ssNexus(context.api, gameSpec).catch(() => null);
    } else {
      downloadUe4ss(context.api, gameSpec).catch(() => null);
    }
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

//Main function
function main(context) {
  UNREALEXTENSION(context);
  applyGame(context, spec);
  if (UNREALDATA.loadOrder === true) { //UNREAL - mod load order
    let previousLO;
    context.registerLoadOrderPage({
      gameId: spec.game.id,
      gameArtURL: path.join(__dirname, spec.game.logo),
      preSort: (items, direction) => preSort(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === UE5_SORTABLE_ID),
      displayCheckboxes: false,
      callback: (loadOrder) => {
        if (previousLO === undefined) previousLO = loadOrder;
        if (loadOrder === previousLO) return;
        //context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
        requestDeployment(context, spec);
        previousLO = loadOrder;
      },
      createInfoPanel: () =>
        context.api.translate(`Drag and drop the mods on the left to change the order in which they load.\n` 
          + `${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here.\n`
          + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.\n'
          + '\n'
          + 'YOU MUST DEPLOY MODS AFTER CHANGING THE ORDER TO APPLY CHANGES.'
        ),
    });
  }
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', (profileId) => didDeploy(context.api, profileId)); //*/
    //context.api.onAsync('did-purge', (profileId) => didPurge(context.api, profileId)); //*/
  });
  return true;
}

const requestDeployment = (context, spec) => {
  context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));

  context.api.sendNotification({
    id: `${spec.game.id}-loadorderdeploy-notif`,
    type: 'warning',
    message: 'Deployment Required to Apply Load Order Changes',
    allowSuppress: true,
    actions: [
      {
        title: 'Deploy',
        action: () => deploy(context.api)
      }
    ],
  });
};

async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  api.dismissNotification(`${GAME_ID}-loadorderdeploy-notif`);
  return Promise.resolve();
}

async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
