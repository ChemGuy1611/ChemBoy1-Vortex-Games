/*////////////////////////////////////////////////
Name: XXX Vortex Extension
Structure: Unreal Engine 4-5 Game
Author: ChemBoy1
Version: 0.1.0
Date: 2026-XX-XX
Notes:
-
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log,
        MainPage, FlexLayout, DNDContainer, DraggableList } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');
const React = require('react');
//const fsPromises = require('fs/promises'); //.rm() for recursive folder deletion

// -- START EDIT ZONE -- ///////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

/*const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow'); //*/
//const DOCUMENTS = util.getVortexPath('documents');
//const ROAMINGAPPDATA = util.getVortexPath('appData');
const LOCALAPPDATA = util.getVortexPath('localAppData');

//Specify all information about the game
const GAME_ID = "XXX"; //same as Nexus domain
const STEAMAPP_ID = "XXX"; //from steamdb.info
const STEAMAPP_ID_DEMO = "XXX"; //VERIFY if the EPIC_CODE_NAME and EXEC_DEMO match Steam full game
const EPICAPP_ID = "XXX"; //from egdata.app
const GOGAPP_ID = "XXX"; // from gogdb.org
const XBOXAPP_ID = "XXX"; //from appxmanifest.xml
const XBOXEXECNAME = "AppUEGameShipping"; //from appxmanifest.xml
const XBOX_PUB_ID = "XXX"; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "XXX";
const GAME_NAME_SHORT = "XXX"; //Try for 8-10 characters
const EPIC_CODE_NAME = "XXX"; //Folder in root
const EXEC = `${EPIC_CODE_NAME}.exe`; //This is true ~80% of the time. Change if different
const EXEC_EPIC = EXEC; //change these 3 if different
const EXEC_GOG = EXEC;
const EXEC_DEMO = EXEC;
const PARAMETERS_STRING = ''; //launch arguments to pass when launching the game
const PCGAMINGWIKI_URL = "XXX";
const EXTENSION_URL = "XXX"; //Nexus link to this extension. Used for links

//feature toggles
const hasXbox = false; //toggle for Xbox version logic.
let multiExe = false; //toggle for multiple executables (Epic/GOG/Demo don't match Steam)
if ( (EXEC !== EXEC_EPIC) || (EXEC !== EXEC_GOG) || (EXEC !== EXEC_DEMO) ) {
  multiExe = true;
} //*/
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const hasModKit = false; //toggle for UE ModKit mod support
const hasServer = false; //toggle for server pak mod logic
const preferHardlinks = true; //set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users
const autoDownloadUe4ss = false; //toggle for auto downloading UE4SS
const SIGBYPASS_REQUIRED = false; //set true if there are .sig files in the Paks folder
const IO_STORE = true; //true if the Paks folder contains .ucas and .utoc files
const hasUserIdFolder = false; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
const debug = false; //toggle for debug mode

//UE specific
const ENGINE_VERSION = '5.X.X.0'; //Unreal Engine version - info only atm. usually '4.27.2.0' or '5.X.X.0'
const MAJOR_VERSION = ENGINE_VERSION.split('.')[0]; //major UE version
const MINOR_VERSION = ENGINE_VERSION.split('.')[1]; //minor UE version
const ROOT_FOLDERS = [EPIC_CODE_NAME, 'Engine']; //addressable folders in root
const ROOTSUB_FOLDERS = ['Content', 'Binaries', 'Mods']; //subfolders of EPIC_CODE_NAME. Don't use "Plugins" here since it can conflict with plugin loader/asi mods
const CONTENTSUB_FOLDERS = ['Paks', 'Movies']; //subfolders of Content folder
const UE4SS_SUBFOLDERS = ['MapGenBP', 'MemberVarLayoutTemplates', 'UE4SS_Signatures', 'VTableLayoutTemplates']; //subfolders of UE4SS folder
const SAVE_EXT = ".sav";
const SAVE_COMPAT_VERSIONS = ['steam', 'epic', 'gog']; //game versions with installable save mods (never Xbox)
let PAKMOD_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'); //usually works. Some games don't work from "~mods".
const PAKMOD_LOADORDER = true; //set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder.
const FBLO = true; //set to false to use legacy load order page
const LO_IMAGE_WIDTH = 96; //Width of the load order thumbnail image
const SPECIAL_LO_INSTRUCTIONS = ''; //Show special load order instructions
const PAKMOD_EXTRA_EXTS = []; //extra extensions to include with paks (usually for custom modding frameworks, i.e .toml, .json)
const ue4ssLoadOrder = true; //enable load order and mods.txt writing for UE4SS mods
const UE4SS_PAGE_NO = 0; //set these if there is a customized UE4SS Nexus page
const UE4SS_FILE_NO = 0;
const UE4SS_DOMAIN = GAME_ID; //either GAME_ID or 'site'
const UE4SS_FOLDER = 'ue4ss'; //this should probably never change
const UE4SS_MOD_PATH = path.join(UE4SS_FOLDER, 'Mods'); //this should probably never change (unless UE4SS team changes it again lol)

const SET_UE4SS_LOAD_ORDER = `SET_${GAME_ID.toUpperCase()}_UE4SS_LOAD_ORDER`;
function setUe4ssLoadOrder(profileId, loadOrder) { return { type: SET_UE4SS_LOAD_ORDER, payload: { profileId, loadOrder } }; }
setUe4ssLoadOrder.toString = () => SET_UE4SS_LOAD_ORDER;

const SET_UE4SS_LO_ENABLED = `SET_${GAME_ID.toUpperCase()}_UE4SS_LO_ENABLED`;
function setUe4ssLoEnabled(value) { return { type: SET_UE4SS_LO_ENABLED, payload: value }; }
setUe4ssLoEnabled.toString = () => SET_UE4SS_LO_ENABLED;

//config and save
const DATA_FOLDER = EPIC_CODE_NAME; //almost always matches.
const CONFIG_FOLDERNAME = 'Windows'; //UE 4 games are often 'WindowsNoEditor' - "Windows", "WindowsClient", "WindowsNoEditor"
const CONFIG_LOC = 'Local AppData'; //string for notification text.
const SAVE_LOC = CONFIG_LOC; //string for notification text. Config and Save mods are almost always in the same place
const CONFIGMOD_LOCATION = LOCALAPPDATA; //almost always matches. Some are in game folder or Documents.
const SAVEMOD_LOCATION = CONFIGMOD_LOCATION;

//shipping exe
const SHIPEXE_STRING_DEFAULT = '';
const SHIPEXE_STRING_EGS = '';
const SHIPEXE_STRING_GOG = '';
const SHIPEXE_STRING_XBOX = '';
const SHIPEXE_STRING_DEMO = '';
const SHIPEXE_PROJECTNAME = EPIC_CODE_NAME; //almost always matches.

//Save Editor (only used if one is available)
const SAVE_EDITOR_ID = `${GAME_ID}-saveeditor`;
const SAVE_EDITOR_NAME = "Save Editor";
const SAVE_EDITOR_EXEC = "XXX.exe";

// -- END EDIT ZONE -- /////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

const LO_IMAGE_HEIGHT = LO_IMAGE_WIDTH * 0.5625;
//const ENGINE_VERSION_NO = +ENGINE_VERSION;
let configSaveMatch = (CONFIGMOD_LOCATION === SAVEMOD_LOCATION); //true if the config and save mods are in the same folder
const XBOX_SAVE_STRING = XBOX_PUB_ID;
const CONFIG_PATH_DEFAULT = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, "Saved", "Config", CONFIG_FOLDERNAME);
const CONFIG_PATH_XBOX = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, "Saved", "Config", "WinGDK"); //XBOX Version
const SAVE_PATH_DEFAULT = path.join(SAVEMOD_LOCATION, DATA_FOLDER, "Saved", "SaveGames");
const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_SAVE_STRING}`, "SystemAppData", "wgs"); //XBOX Version

//Settings related to the IO Store UE feature
if (!PAKMOD_LOADORDER) PAKMOD_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks'); //if loadOrder is disabled, Paks must be in root
let PAKMOD_EXTS = ['.pak'].concat(PAKMOD_EXTRA_EXTS);
let PAK_FILE_MIN = PAKMOD_EXTS.length;
let SYM_LINKS = true;
if (IO_STORE) { //Set file number for pak installer file selection (needs to be 3 if IO Store is used to accomodate .ucas and .utoc files)
  SYM_LINKS = false;
  PAKMOD_EXTS = ['.pak', '.ucas', '.utoc'].concat(PAKMOD_EXTRA_EXTS);
  PAK_FILE_MIN = PAKMOD_EXTS.length;
}

//global variables to set later
let GAME_PATH = ''; //game installation path
let CHECK_CONFIG = false; //boolean to check if game, staging folder, and config and save folders are on the same drive
let CHECK_SAVE = false; //secondary same as above (if save and config are in different locations)
let STAGING_FOLDER = ''; //Vortex staging folder path
let DOWNLOAD_FOLDER = ''; //Vortex download folder path
let GAME_VERSION = '';
let USERID_FOLDER = "";
let STORE_FOLDER = '';

//other constants
const APPMANIFEST_FILE = 'appxmanifest.xml';
const EXEC_XBOX = 'gamelaunchhelper.exe';
const EXEC_FOLDER_DEFAULT = "Win64"; //almost never changes
const EXEC_FOLDER_XBOX = "WinGDK"; //almost never changes

//Unreal Engine Game Data
const UNREALDATA = {
  modsPath: PAKMOD_PATH,
  fileExt: PAKMOD_EXTS,
  loadOrder: PAKMOD_LOADORDER,
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
let PAK_ALT_NAME = 'Paks (no "~mods")';
let PAK_ALT_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks');
if (UNREALDATA.loadOrder === false) {
  PAK_ALT_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods');
  PAK_ALT_NAME = 'Paks (with "~mods")';
}
const PAK_PATH = UNREALDATA.modsPath;
const PAK_EXT = '.pak';

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";
const ROOT_FOLDER = EPIC_CODE_NAME;
//const ROOTSUB_ID = `${GAME_ID}-rootsubfolders`;
//const ROOTSUB_NAME = "Root Sub-Folders";
const ROOTSUB_PATH = EPIC_CODE_NAME;

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = `Config (${CONFIG_LOC})`;
let CONFIG_PATH = CONFIG_PATH_DEFAULT;
const CONFIG_FILES = [
  "engine.ini", "game.ini", "gameusersettings.ini", "input.ini", "scalability.ini",
  "hardware.ini", "deviceprofiles.ini", "compat.ini", "runtimeoptions.ini",
  "gameplaytags.ini", "enhancedinput.ini", "consolevariables.ini",
];
const CONFIG_EXT = ".ini";

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = `Saves (${SAVE_LOC})`;
const SAVE_FOLDER = SAVE_PATH_DEFAULT;
if (hasUserIdFolder) {
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
  } catch {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  } //*/
}
let SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);

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
const UE4SS_SETTINGS_FILE = 'UE4SS-settings.ini';
const UE4SS_PLUGIN = 'UE4SS.dll';
UE4SS_SUBFOLDERS.push(UE4SS_SETTINGS_FILE, UE4SS_PLUGIN);
const UE4SS_SETTINGS_FILEPATH = path.join(UE4SS_FOLDER, UE4SS_SETTINGS_FILE); //relative to Binaries folder
const UE4SS_MODSJSON_FILE = 'mods.json';
const UE4SS_MODSTXT_FILE = 'mods.txt';
const UE4SS_MODSJSON_FILEPATH = path.join(UE4SS_MOD_PATH, UE4SS_MODSJSON_FILE); //relative to Binaries folder
const UE4SS_MODSTXT_FILEPATH = path.join(UE4SS_MOD_PATH, UE4SS_MODSTXT_FILE);
const UE4SS_LO_FILE = 'ue4ss_loadOrder.json';
const LO_ATTRIBUTE_UE4SS = 'ue4ssModFolder';
const UE4SS_CONFIG_FILES = ['config.txt', 'settings.json', 'config.lua']; //files that trigger the Configure button on UE4SS LO items
const UE4SS_NATIVE_MODS = ['BPML_GenericFunctions', 'BPModLoaderMod', 'CheatManagerEnablerMod',
  'ConsoleCommandsMod', 'ConsoleEnablerMod', 'Keybinds', 'LineTraceMod', 'shared', 'SplitScreenMod'
];
const ENABLEDTXT_FILE = 'enabled.txt';
const UE4SS_ICON = 'M12 0c-6.5745 0-11.899 5.371-11.899 12s5.324 12 11.899 12c6.57 0 11.899-5.371 11.899-12s-5.328-12-11.903-12zM12 0.527c3.035 0 5.894 1.196 8.043 3.359 2.144 2.156 3.34 5.075 3.332 8.114 0 3.062-1.184 5.945-3.332 8.114-2.121 2.153-5.02 3.363-8.043 3.359-3.023 0.004-5.922-1.207-8.043-3.359-2.144-2.156-3.344-5.075-3.336-8.114 0-3.062 1.187-5.945 3.332-8.114 2.121-2.156 5.024-3.368 8.047-3.359zM11.402 4.75c-1.937 0.52-3.731 1.516-6.121 4.258s-1.937 5.008-1.937 5.008c0 0 0.66-1.559 2.246-3.2 0.754-0.777 1.313-1.039 1.7-1.039 0.344-0.02 0.633 0.258 0.633 0.602v5.567c0 0.551-0.356 0.672-0.683 0.664-0.278-0.004-0.536-0.101-0.536-0.101 1.629 2.367 5.528 2.699 5.528 2.699l1.711-1.829 0.039 0.035 1.567 1.336c2.867-1.703 4.25-4.859 4.25-4.859-1.281 1.352-2.094 1.668-2.579 1.668-0.43-0.004-0.598-0.254-0.598-0.254-0.023-0.117-0.062-1.813-0.078-3.508-0.016-1.754 0-3.512 0.086-3.516 0.496-0.93 2.075-2.805 2.075-2.805-2.949 0.582-4.555 2.516-4.555 2.516-0.476-0.375-1.445-0.313-1.445-0.313 0.453 0.25 0.906 0.977 0.906 1.578v5.922c0 0-0.989 0.871-1.75 0.871-0.453 0-0.731-0.246-0.883-0.449-0.059-0.078-0.11-0.164-0.149-0.258v-7.313c-0.106 0.078-0.235 0.121-0.363 0.125-0.164 0-0.332-0.082-0.446-0.32-0.086-0.18-0.141-0.449-0.141-0.844 0-1.348 1.523-2.243 1.523-2.243z';

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

// -- START EDIT ZONE -- ///////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

const LO_FILE_NAME = 'loadOrder.json';
const MOD_PATH_DEFAULT = PAK_PATH;
const REQ_FILE = EPIC_CODE_NAME;
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
let MODTYPE_FOLDERS = [path.join(LOGICMODS_PATH, LOGICMODS_FOLDER), PAK_PATH, PAK_ALT_PATH];
if (hasModKit) {
  MODTYPE_FOLDERS.push(MODKITMOD_PATH);
}

// -- END EDIT ZONE -- /////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    //"parameters": PARAMETERS, //must uncomment manually since we don't want to send empty string parameter
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
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

if (hasModKit) {
  spec.modTypes.push({
    "id": MODKITMOD_ID,
    "name": MODKITMOD_NAME,
    "priority": "high",
    "targetPath": path.join('{gamePath}', MODKITMOD_PATH)
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
  //*
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
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
  return Promise.resolve(undefined);
}

function getUserIdFolder(savePath) {
  try {
    const SAVE_ARRAY = fs.readdirSync(savePath);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(savePath, entry));
  } catch {
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
      DLL_PATH = SCRIPTS_PATH;
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
    DLL_PATH = SCRIPTS_PATH;
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    //CONFIG_PATH = setConfigPath(GAME_VERSION); //if there's an intermediate store folder in the path
    //SAVE_PATH = setSavePath;
    SAVE_PATH = SAVE_PATH_DEFAULT;
    return EXEC;
  } //*/
  if (statCheckSync(discoveryPath, EXEC_DEMO)) {
    GAME_VERSION = 'demo';
    BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT);
    SHIPPING_EXE = path.join(BINARIES_PATH, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_DEMO}-Shipping.exe`);
    SCRIPTS_PATH = path.join(BINARIES_PATH, UE4SS_MOD_PATH);
    DLL_PATH = SCRIPTS_PATH;
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    //CONFIG_PATH = setConfigPath(GAME_VERSION); //if there's an intermediate store folder in the path
    //SAVE_PATH = setSavePath;
    SAVE_PATH = SAVE_PATH_DEFAULT;
    return EXEC_DEMO;
  } //*/
  if (statCheckSync(discoveryPath, EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT);
    SHIPPING_EXE = path.join(BINARIES_PATH, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_EGS}-Shipping.exe`);
    SCRIPTS_PATH = path.join(BINARIES_PATH, UE4SS_MOD_PATH);
    DLL_PATH = SCRIPTS_PATH;
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
    DLL_PATH = SCRIPTS_PATH;
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    //CONFIG_PATH = setConfigPath(GAME_VERSION); //if there's an intermediate store folder in the path
    //SAVE_PATH = setSavePath;
    SAVE_PATH = SAVE_PATH_DEFAULT;
    return EXEC_GOG;
  } //*/
  GAME_VERSION = 'default';
  return EXEC;
}

//Get correct shipping executable for game version
function getShippingExe(gamePath) {
  if (hasXbox) {
    if (statCheckSync(gamePath, EXEC_XBOX)) {
      SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_XBOX, `${SHIPEXE_PROJECTNAME}${SHIPEXE_STRING_XBOX}-${EXEC_FOLDER_XBOX}-Shipping.exe`);
      return SHIPPING_EXE;
    }
  }
  if (statCheckSync(gamePath, EXEC)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}${SHIPEXE_STRING_DEFAULT}-${EXEC_FOLDER_DEFAULT}-Shipping.exe`);
    return SHIPPING_EXE;
  }
  if (statCheckSync(gamePath, EXEC_EPIC)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}${SHIPEXE_STRING_EGS}-${EXEC_FOLDER_DEFAULT}-Shipping.exe`);
    return SHIPPING_EXE;
  }
  if (statCheckSync(gamePath, EXEC_GOG)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}${SHIPEXE_STRING_GOG}-${EXEC_FOLDER_DEFAULT}-Shipping.exe`);
    return SHIPPING_EXE;
  }
  if (statCheckSync(gamePath, EXEC_DEMO)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}${SHIPEXE_STRING_DEMO}-${EXEC_FOLDER_DEFAULT}-Shipping.exe`);
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
  } catch {
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
  } catch {
    STORE_FOLDER = '';
  }
  if (STORE_FOLDER === undefined) {
    STORE_FOLDER = '';
  }
  SAVE_PATH = path.join(SAVEMOD_LOCATION, DATA_FOLDER, STORE_FOLDER, "Saved", "SaveGames");
  SAVE_PATH = getUserIdFolder(SAVE_PATH);
  return SAVE_PATH;
} //*/

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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for modkit mod files
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

//Installer install modkit mod files
async function installModKitMod(files, fileName) {
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
    let contents = await fs.readFileAsync(path.join(fileName, rootPath, MODKITMOD_FILE), 'utf8');
    contents = util.deBOM(contents);
    const JSON_OBJECT = JSON.parse(contents);
    const JSON_MOD_NAME = JSON_OBJECT["modPluginName"];
    MOD_FOLDER = JSON_MOD_NAME;
  } catch { //mod.json could not be read.
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

//Test for UE4SS combo (pak and lua/dll) mod files
function testUe4ssCombo(files, gameId) {
  //const isMod = files.some(file => (path.extname(file).toLowerCase() === SCRIPTS_EXT));
  const isBinaries = files.some(file => (path.basename(file).toLowerCase() === 'binaries')); //added to catch mods packaged with paks and dll/asi, but no lua scripts.
  //const isPak = files.some(file => (path.extname(file).toLowerCase() === LOGICMODS_EXT));
  const isContent = files.some(file => (path.basename(file).toLowerCase() === 'content'));
  //const isFolder = files.some(file => (path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase()));
  let supported = (gameId === spec.game.id) && isContent && isBinaries;

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

//Install UE4SS combo (pak and lua/dll) mod files
async function installUe4ssCombo(files, workingDir) {
  //const modFile = files.find(file => (path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase()));
  const modFile = files.find(file => (path.basename(file).toLowerCase() === 'binaries'));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE4SSCOMBO_ID };

  if (GAME_VERSION === 'xbox') {
    try {
      /*await fs.statAsync(path.join(workingDir, modFile, 'Binaries', 'Win64'));
      await fs.renameAsync(path.join(workingDir, modFile, 'Binaries', 'Win64'), path.join(workingDir, modFile, 'Binaries', 'WinGDK')); //*/
      await fs.statAsync(path.join(workingDir, modFile, 'Win64'));
      await fs.renameAsync(path.join(workingDir, modFile, 'Win64'), path.join(workingDir, modFile, 'WinGDK')); //*/
      const paths = await getAllFiles(workingDir);
      files = [...paths.map(p => p.replace(`${workingDir}${path.sep}`, ''))];
    } catch (err) {
      log('warn', `Failed to rename "Win64" folder to "WinGDK" for UE4SS combo mod ${workingDir} (or "Win64" folder is not present): ${err}`);
    }
  }

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      //destination: path.join(file.substr(idx)),
      destination: path.join(EPIC_CODE_NAME, file.substr(idx)),
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
  const UE4SS_SUBFOLDERS_LOWER = UE4SS_SUBFOLDERS.map(str => str.toLowerCase());
  const isMod = files.some(file => (path.basename(file).toLowerCase() === UE4SS_FILE));
  const isFolder = files.some(file => UE4SS_SUBFOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isMod || isFolder );

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
  let folder = '';
  let modFile = files.find(file => (path.basename(file).toLowerCase() === UE4SS_FILE));
  if (modFile === undefined) {
    folder = UE4SS_FOLDER;
    const UE4SS_SUBFOLDERS_LOWER = UE4SS_SUBFOLDERS.map(str => str.toLowerCase());
    modFile = files.find(file => UE4SS_SUBFOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  }
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
      destination: path.join(folder, file.substr(idx)),
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
async function installScripts(api, files, fileName) {
  const scriptsFolder = files.find(file => (path.basename(file).toLowerCase() === SCRIPTS_FOLDER.toLowerCase()));
  const setModTypeInstruction = { type: 'setmodtype', value: SCRIPTS_ID };
  let modFile = scriptsFolder;
  let rootPath = path.dirname(modFile);
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  let fallbackName = true;
  const ROOT_PATH = path.basename(rootPath);
  if (ROOT_PATH !== '.') {
    fallbackName = false;
    MOD_FOLDER = ''; //no top level folder needed if it's already included in the archive
    modFile = rootPath; //make the folder the targeted modFile so we can grab any other folders also in its directory
    rootPath = path.dirname(modFile);
  }
  const idx = modFile.indexOf(path.basename(modFile));
  //handle enabled.txt file
  if (!ue4ssLoadOrder || !util.getSafe(api.store.getState(), ['settings', GAME_ID, 'ue4ssLoEnabled'], true)) {
    const ENABLEDTXT_PATH = path.join(fileName, path.dirname(scriptsFolder), ENABLEDTXT_FILE);
    try {
      await fs.statAsync(ENABLEDTXT_PATH);
    } catch (err) {
      try {
        await fs.writeFileAsync(ENABLEDTXT_PATH, '', { encoding: "utf8" });
        files.push(path.join(path.dirname(scriptsFolder), ENABLEDTXT_FILE));
        log('info', `Successfully created ${ENABLEDTXT_FILE} for UE4SS Script Mod: ${MOD_NAME}`);
      } catch {
        log('error', `Could not create ${ENABLEDTXT_FILE} for UE4SS Script Mod: ${MOD_NAME}`);
      }
    }
  } else {
    files = files.filter(f => path.basename(f).toLowerCase() !== ENABLEDTXT_FILE);
  }
  //Filter files and set instructions
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const MOD_ATTRIBUTE = {
    type: 'attribute',
    key: LO_ATTRIBUTE_UE4SS,
    value: fallbackName ? MOD_FOLDER : path.basename(modFile),
  };
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  instructions.push(MOD_ATTRIBUTE);
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
async function installDll(api, files, fileName) {
  const dllFolder = files.find(file => (path.basename(file).toLowerCase() === DLL_FOLDER.toLowerCase()));
  const setModTypeInstruction = { type: 'setmodtype', value: DLL_ID };
  let modFile = dllFolder;
  let rootPath = path.dirname(modFile);
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  let fallbackName = true;
  const ROOT_PATH = path.basename(rootPath);
  if (ROOT_PATH !== '.') {
    fallbackName = false;
    MOD_FOLDER = ''; //no top level folder needed if it's already included in the archive
    modFile = rootPath; //make the folder the targeted modFile so we can grab any other folders also in its directory
    rootPath = path.dirname(modFile);
  }
  const idx = modFile.indexOf(path.basename(modFile));
  //handle enabled.txt file
  if (!ue4ssLoadOrder || !util.getSafe(api.store.getState(), ['settings', GAME_ID, 'ue4ssLoEnabled'], true)) {
    const ENABLEDTXT_PATH = path.join(fileName, path.dirname(dllFolder), ENABLEDTXT_FILE);
    try {
      await fs.statAsync(ENABLEDTXT_PATH);
    } catch (err) {
      try {
        await fs.writeFileAsync(ENABLEDTXT_PATH, '', { encoding: "utf8" });
        files.push(path.join(path.dirname(dllFolder), ENABLEDTXT_FILE));
        log('info', `Successfully created ${ENABLEDTXT_FILE} for UE4SS DLL Mod: ${MOD_NAME}`);
      } catch {
        log('error', `Could not create ${ENABLEDTXT_FILE} for UE4SS DLL Mod: ${MOD_NAME}`);
      }
    }
  } else {
    files = files.filter(f => path.basename(f).toLowerCase() !== ENABLEDTXT_FILE);
  }
  //Filter files and set instructions
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const MOD_ATTRIBUTE = {
    type: 'attribute',
    key: LO_ATTRIBUTE_UE4SS,
    value: fallbackName ? MOD_FOLDER : path.basename(modFile),
  };
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  instructions.push(MOD_ATTRIBUTE);
  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map(str => str.toLowerCase());
  const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map(str => str.toLowerCase());
  const CONTENTSUB_FOLDERS_LOWER = CONTENTSUB_FOLDERS.map(str => str.toLowerCase());
  const isMod = files.some(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const isSub = files.some(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const isContentSub = files.some(file => CONTENTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isMod || isSub || isContentSub );

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
  const CONTENTSUB_FOLDERS_LOWER = CONTENTSUB_FOLDERS.map(str => str.toLowerCase());
  let folder = '';
  let modFile = files.find(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  if (modFile === undefined) {
    modFile = files.find(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    folder = ROOTSUB_PATH;
  }
  if (modFile === undefined) {
    modFile = files.find(file => CONTENTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    folder = path.join(EPIC_CODE_NAME, 'Content');
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
    throw new util.UserCanceled();
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

//error notification for Xbox version save install attempt
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
async function installSave(api, files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === SAVE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

  GAME_PATH = getDiscoveryPath(api);
  GAME_VERSION = await setGameVersionAsync(GAME_PATH);
  const TEST = SAVE_COMPAT_VERSIONS.includes(GAME_VERSION);
  if (!TEST) {
    saveErrorNotify(api);
    throw new util.UserCanceled();
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
  const IS_SAVE = checkPartitions(SAVEMOD_LOCATION, GAME_PATH);
  if (IS_SAVE === false) {
    saveInstallerNotify(api);
    throw new util.UserCanceled();
  }
  return Promise.resolve({ instructions });
}

//Error notification for save installer when not on same partition
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
            text: `\n`
                + `The mod you just installed reached the fallback installer to the Binaries folder. This means Vortex could not determine where to place these mod files.\n`
                + `Please check the mod page description and review the files in the mod staging folder to determine whether the mod was installed correctly.\n`
                + `It may be necessary to perform manual file manipulation for the mod, or to manually change the Mod Type.\n`
                + `It is also possible that the mod was installed correctly. For example a non-UE4SS dll mod, like Optiscaler, is installed correctly to the Binaries folder.\n`
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
async function downloadUe4ss(api, gameSpec, check = true) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  const URL = UE4SS_URL;
  const MOD_NAME = UE4SS_NAME;
  const MOD_TYPE = UE4SS_ID;
  const ARCHIVE_NAME = UE4SS_DLFILE_STRING;
  const instructions = api.translate(`Click on Continue below to open the browser. - `
    + `Navigate to the latest experimental version of ${MOD_NAME} on the GitHub releases page and `
    + `click on the appropriate file to download and install the mod.`
  );

  if (!isInstalled || !check) {
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
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please try again.`, err, { allowReport: false });
        //util.opn(URL).catch(() => null);
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please try again or download manually.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }
} //*/

//* Function to auto-download UE4SS from Nexus Mods
async function downloadUe4ssNexus(api, gameSpec, check = true) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  if (!isInstalled || !check) {
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

//* Function to auto-download Sig Bypass from Nexus Mods
async function downloadSigBypass(api, gameSpec, check = true) {
  let isInstalled = isSigBypassInstalled(api, gameSpec);
  if (!isInstalled || !check) {
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
      } catch { // use defined file ID if input is undefined above
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

//* FBLO Functions
function generateProps(context, profileId) {
  const api = context.api;
  const state = api.getState();
  const profile = (profileId !== undefined)
    ? selectors.profileById(state, profileId)
    : selectors.activeProfile(state);
  if (profile?.gameId !== GAME_ID) {
      return undefined;
  }

  const discovery = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
  if (discovery?.path === undefined) {
    return undefined;
  }

  const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
  return { api, state, profile, mods, discovery };
}

async function ensureLOFile(context, profileId, props) {
  if (props === undefined) {
    props = generateProps(context, profileId);
  }
  if (props === undefined) {
    return Promise.reject(new util.ProcessCanceled('failed to generate game props'));
  }
  const targetPath = path.join(props.discovery.path, props.profile.id + '_' + LO_FILE_NAME);
  try {
    await fs.ensureFileAsync(targetPath);
    return targetPath;
  } catch (err) {
    return Promise.reject(err);
  }
}

async function deserializeLoadOrder(context) {
  const props = generateProps(context, undefined);
  if (props?.profile?.gameId !== GAME_ID) {
    return Promise.reject(new util.ProcessCanceled('invalid props'));
  }

  // The deserialization function should be used to filter and insert wanted data into Vortex's
  //  loadOrder application state, once that's done, Vortex will trigger a serialization event
  //  which will ensure that the data is written to the LO file.
  const currentModsState = util.getSafe(props.profile, ['modState'], {});

  // we only want to insert enabled mods.
  const enabledModIds = Object.keys(currentModsState)
      .filter(modId => util.getSafe(currentModsState, [modId, 'enabled'], false));
  const mods = util.getSafe(props.state,
      ['persistent', 'mods', GAME_ID], {});
  const loFilePath = await ensureLOFile(context, props.profile.gameId, props);
  const fileData = await fs.readFileAsync(loFilePath, { encoding: 'utf8' });
  let data = [];
  if (fileData.length > 0) {
    data = JSON.parse(fileData);
  }
  try {
    /*try {
      data = JSON.parse(fileData);
    } catch (err) {
      await new Promise((resolve, reject) => {
        props.api.showDialog('error', 'Corrupt load order file', {
          bbcode: props.api.translate('The load order file is in a corrupt state. You can try to fix it yourself '
              + 'or Vortex can regenerate the file for you, but that may result in loss of data ' +
              '(Will only affect load order items you added manually, if any).')
          },
          [
            { label: 'Cancel', action: () => reject(err) },
            {
              label: 'Regenerate File', action: () => {
                data = [];
                return resolve();
              }
            }
          ]
        )
      })
    } //*/

    // User may have disabled/removed a mod - we need to filter out any existing entries from the data we parsed.
    let filteredData = data.filter(entry => enabledModIds.includes(entry.id));
    // Check if the user added any new mods
    const diff = enabledModIds.filter((id) =>
      (mods[id]?.type === UE5_SORTABLE_ID)
      && !filteredData.some((loEntry) => (loEntry.id === id))
    );
    // Add any newly added mods to the bottom of the loadOrder.
    diff.forEach(id => {
      filteredData.push({
        id: id,
        modId: id,
        enabled: true,
        name: mods[id] !== undefined
          ? util.renderModName(mods[id])
          : id,
      });
    });
    return Promise.resolve(filteredData);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function serializeLoadOrder(context, loadOrder) {
  const props = generateProps(context, undefined);
  if (props === undefined) {
    return Promise.reject(new util.ProcessCanceled('invalid props'));
  }
  // Make sure the LO file is created and ready to be written to.
  const loFilePath = await ensureLOFile(context, props.profile.id, props);
  // Write the prefixed LO to file
  await fs.writeFileAsync(loFilePath, JSON.stringify(loadOrder, null, 4), { encoding: 'utf8' });
  // something has changed so we need to tell vortex that a deployment will be necessary
  requestDeployment(context.api, spec);
  return Promise.resolve();
}
//*/

async function deserializeUe4ss(api) {
  //Set basic information for load order paths and data
  const state = api.getState();
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  GAME_PATH = getDiscoveryPath(api);
  let modFolderPath = path.join(GAME_PATH, BINARIES_PATH, UE4SS_MOD_PATH);
  const profile = selectors.activeProfile(state);
  const filename = profile.id + '_' + UE4SS_LO_FILE;
  let loadOrderPath = path.join(modFolderPath, filename);
  let LO_MOD_ARRAY = [];
  try {
    const raw = await fs.readFileAsync(loadOrderPath, { encoding: 'utf8' });
    if (raw.length > 0) LO_MOD_ARRAY = JSON.parse(util.deBOM(raw));
  } catch { /* file doesn't exist yet; start with empty array */ }
  if (debug) {
    log('warn', `UE4SS LO_MOD_ARRAY: ${LO_MOD_ARRAY.map(mod => mod.id).join(', ')}`);
  }

  //Get all mod files from mods folder
  let modFolders = [];
  try {
    modFolders = await fs.readdirAsync(modFolderPath);
    modFolders = modFolders.filter((file) => (isDir(modFolderPath, file) && !UE4SS_NATIVE_MODS.includes(file)))
      .sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read UE4SS Mods folder'));
  }

  //Determine if mod is managed by Vortex (async version)
  const isVortexManaged = async (modId) => {
    return fs.statAsync(path.join(modFolderPath, modId, `__folder_managed_by_vortex`))
      .then(() => true)
      .catch(() => false)
  };

  // Get readable mod name using attribute from mod installer
  async function getModName(folder) {
    const VORTEX = await isVortexManaged(folder);
    if (!VORTEX) {
      return ('Manual Mod');
    }
    try {//Mod installed by Vortex, find mod where atrribute (from installer) matches folder in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, [LO_ATTRIBUTE_UE4SS], '') === folder));
      if (modMatch) {
        return modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
      }
      return folder;
    } catch {
      return folder;
    }
  }

  // Get Vortex mod id using attribute from mod installer
  async function getModId(folder) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, [LO_ATTRIBUTE_UE4SS], '') === folder)); //find mod by folder name attribute
      if (modMatch) {
        return modMatch.id;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  //Set load order
  let loadOrder = await LO_MOD_ARRAY
    .reduce(async (accumP, entry) => {
      const accum = await accumP;
      const folder = entry.id;
      if (!modFolders.includes(folder)) {
        return Promise.resolve(accum);
      }
      accum.push(
        {
          id: folder,
          name: `${await getModName(folder)} (${folder})`,
          modId: await isVortexManaged(folder) ? await getModId(folder) : undefined,
          enabled: entry.enabled,
          locked: entry?.locked,
        }
      );
      return Promise.resolve(accum);
    }, Promise.resolve([]));

  //push new mods to loadOrder
  for (let folder of modFolders) {
    if (!loadOrder.find((mod) => (mod.id === folder))) {
      loadOrder.push({
        id: folder,
        name: `${await getModName(folder)} (${folder})`,
        modId: await isVortexManaged(folder) ? await getModId(folder) : undefined,
        enabled: true,
      });
    }
  }

  return loadOrder;
}

//Write load order to files
async function serializeUe4ss(api, loadOrder) {
  const state = api.getState();
  if (selectors.activeGameId(state) !== GAME_ID) return;
  GAME_PATH = getDiscoveryPath(api);
  const profile = selectors.activeProfile(state);
  const filename = profile.id + '_' + UE4SS_LO_FILE;
  const jsonPath = path.join(GAME_PATH, BINARIES_PATH, UE4SS_MOD_PATH, filename);
  await fs.writeFileAsync(
    jsonPath,
    JSON.stringify(loadOrder, null, 2),
    { encoding: "utf8" },
  );

  let loadOrderPath = path.join(GAME_PATH, BINARIES_PATH, UE4SS_MOD_PATH, UE4SS_MODSTXT_FILE);
  await fs.ensureFileAsync(loadOrderPath);
  let loadOrderMapped = loadOrder
    .map((mod) => `${mod.id} : ${mod.enabled ? 1 : 0}`);
  let contents = await fs.readFileAsync(loadOrderPath, 'utf8');
  const lines = contents.split('\n');
  const bpIdx = lines.findIndex(l => l.trim().startsWith('BPModLoaderMod'));
  const kbIdx = lines.findIndex(l => l.trim().startsWith('Keybinds'));
  const loadOrderOutput = [
    ...lines.slice(0, bpIdx + 1),
    ...loadOrderMapped,
    ...lines.slice(kbIdx),
  ].join('\n');
  return fs.writeFileAsync(
    loadOrderPath,
    loadOrderOutput,
    { encoding: "utf8" },
  );
}

//UNREAL - Pre-sort function - legacy load order page
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

//Make prefix based on loadOrder index
function makePrefix(input) {
  let res = '';
  let rest = input;
  while (rest > 0) {
    res = String.fromCharCode(65 + (rest % 25)) + res;
    rest = Math.floor(rest / 25);
  }
  return util.pad(res, 'A', 3);
}

//Find the loadOrder index and convert to prefix
function loadOrderPrefix(api, mod) {
  const state = api.getState();
  const profile = selectors.lastActiveProfileForGame(state, GAME_ID);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});
  let pos;
  if (FBLO) {
    pos = loadOrder.findIndex((entry) => entry.id === mod.id); //for FBLO
  } else {
    const loKeys = Object.keys(loadOrder);
    pos = loKeys.indexOf(mod.id); //for legacy load order page
  }
  //
  if (pos === -1) {
    return 'ZZZZ-';
  }
  return makePrefix(pos) + '-';
}

//Test for pak mods
function testPak(files, gameId) {
  const supportedGame = gameId === spec.game.id;
  const isPak = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
  let supported = supportedGame && isPak;

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

//install pak mods
async function installPak(api, files) {
  const fileExt = UNREALDATA.fileExt;
  const modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
  const modType = {
    type: 'setmodtype',
    value: UE5_SORTABLE_ID,
  };
  const installFiles = (modFiles.length > PAK_FILE_MIN)
    ? await chooseFilesToInstall(api, modFiles, fileExt)
    : modFiles;
  const unrealModFiles = {
    type: 'attribute',
    key: 'unrealModFiles',
    value: installFiles.map(f => path.basename(f))
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
}

//file selection dialog for pak mods
async function chooseFilesToInstall(api, files, fileExt) {
  const t = api.translate;
  return api.showDialog('question', t('Multiple {{PAK}} files', { replace: { PAK: fileExt } }), {
    text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: fileExt } }) +
        `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
    checkboxes: files.map((pak) => {
      return {
          id: pak,
          text: pak,
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
            .map(file => files.find(f => f === file));
          return installPAKS;
      }
  });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

// Function to check if staging folder and game path are on same drive partition to enable modtypes + installers
function checkPartitions(folder, discoveryPath) {
  if (!preferHardlinks && !IO_STORE) { //only do early return if hardlinks have no benefits and aren't required
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
  } catch {
    return false;
  }
}

//Notification if Config/Save folders are not on the same partition as the game and staging folder
function partitionCheckNotify(api, CHECK_CONFIG, CHECK_SAVE) {
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
            text: `Because ${GAME_NAME} includes the IO-Store Unreal Engine feature (or because hardlinks are preferred), Vortex must use hardlinks to install mods for the game.\n`
                + `As such, the game, staging folder, and user folder (typically on C Drive) must all be on the same drive partition to install certain mods with Vortex.\n`
                + `Vortex detected that one or more of the mod types listed below are not available because the game, staging folder, and mod type folder(s) are not all on the same drive partition.\n`
                + `\n`
                + `Here are your results for the partition checks to enable these mod types:\n`
                + `  - Config: ${CHECK_CONFIG ? `ENABLED: ${CONFIG_LOC} folder is on the same partition as the game and the Vortex staging folder, so the Config modtype is available` : `DISABLED: ${CONFIG_LOC} folder is NOT on the same partition as the game and the Vortex staging folder, so the Config modtype is NOT available`}\n`
                + `  - Save: ${CHECK_SAVE ? `ENABLED: ${SAVE_LOC} folder is on the same partition as the game and the Vortex staging folder, so the Save modtype is available` : `DISABLED: ${SAVE_LOC} folder is NOT on the same partition as the game and the Vortex staging folder, so the Save modtype is NOT available`}\n`
                + `\n`
                + `Game Path: ${GAME_PATH}\n`
                + `Staging Path: ${STAGING_FOLDER}\n`
                + `Config Path: ${CONFIG_PATH}\n`
                + `Save Path (installer for Steam/Epic/GOG versions only): ${SAVE_PATH}\n`
                + `\n`
                + `If you want to use the disabled mod types, you must move the game and staging folder to the same partition as the folders shown above.\n`
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
  CHECK_CONFIG = checkPartitions(CONFIGMOD_LOCATION, GAME_PATH);
  if (configSaveMatch) {
    CHECK_SAVE = CHECK_CONFIG;
  } else {
    CHECK_SAVE = checkPartitions(SAVEMOD_LOCATION, GAME_PATH);
  }
  if (!CHECK_CONFIG || !CHECK_SAVE) {
    partitionCheckNotify(api, CHECK_CONFIG, CHECK_SAVE);
  }
  if (setupNotification) {
    setupNotify(api);
  }
  // ASYNC CODE ///////////////////////////////////
  GAME_VERSION = await setGameVersionAsync(GAME_PATH);
  if (CHECK_CONFIG) { //if game, staging folder, and config and save folders are on the same drive
    await fs.ensureDirWritableAsync(CONFIG_PATH);
    if (SAVE_COMPAT_VERSIONS.includes(GAME_VERSION)) {
      if (configSaveMatch) {
        await fs.ensureDirWritableAsync(SAVE_PATH);
      }
    }
  } //*/
  if (!configSaveMatch) {
    if (CHECK_SAVE) { //if game, staging folder, and config and save folders are on the same drive
      await fs.ensureDirWritableAsync(SAVE_PATH);
    }
  }
  if (autoDownloadUe4ss) {
    if (UE4SS_PAGE_NO !== 0) {
      await downloadUe4ssNexus(api, gameSpec);
    } else {
      await downloadUe4ss(api, gameSpec);
    }
  } //*/
  if (SIGBYPASS_REQUIRED === true) {
    await downloadSigBypass(api, gameSpec);
  }
  MODTYPE_FOLDERS.push(SCRIPTS_PATH);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//* Get ModKit install path with GameStoreHelper
async function getModKitPath() {
  let game = undefined;
  try {
    game = await util.GameStoreHelper.findByAppId(MODKITAPP_ID, 'epic');
  } catch {
    //log('warn', `ModKit path not found`);
    return undefined;
  }
  if (game === undefined) {
    //log('warn', `ModKit path not found`);
    return undefined;
  }
  let instPath = game.gamePath;
  log('warn', `ModKit path found at ${instPath}`);
  instPath = path.join(instPath, MODKIT_FOLDER);
  return instPath;
} //*/

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
      /*{
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
      /*
      {
        id: MODKIT_ID,
        name: MODKIT_NAME,
        logo: `modkit.png`,
        queryPath: async () => await getModKitPath(),
        //queryPath: () => getModKitPathReg(),
        executable: () => MODKIT_EXEC_NAME,
        requiredFiles: [MODKIT_EXEC_NAME],
        detach: true,
        relative: false,
        exclusive: false,
        //parameters: [],
      }, //*/
    ],
  };
  context.registerGame(game);

  //register mod types recursively (types that are always the same)
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //Pak modType
  context.registerModType(UE5_SORTABLE_ID, 25,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, path.join('{gamePath}', UNREALDATA.modsPath)),
    () => Promise.resolve(false),
    { name: UE5_SORTABLE_NAME,
      mergeMods: (mod) => {
        if (UNREALDATA.loadOrder === true) {
          return loadOrderPrefix(context.api, mod) + mod.id
        } else { //If load order is disabled, don't use sorting folders
          return '';
        }
      } //*/
    }
  );

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

  //* register modtypes with partition checks
  context.registerModType(CONFIG_ID, 62,
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_CONFIG = checkPartitions(CONFIGMOD_LOCATION, GAME_PATH);
      }
      return ((gameId === GAME_ID) && (CHECK_CONFIG === true));
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
        if (configSaveMatch) {
          CHECK_CONFIG = checkPartitions(SAVEMOD_LOCATION, GAME_PATH);
        }
        if (!configSaveMatch) {
          CHECK_SAVE = checkPartitions(SAVEMOD_LOCATION, GAME_PATH);
        }
      }
      if (configSaveMatch) {
        return ((gameId === GAME_ID) && (CHECK_CONFIG === true) && SAVE_COMPAT_VERSIONS.includes(GAME_VERSION));
      }
      if (!configSaveMatch) {
        return ((gameId === GAME_ID) && (CHECK_SAVE === true) && SAVE_COMPAT_VERSIONS.includes(GAME_VERSION));
      }
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
  context.registerInstaller(UE5_SORTABLE_ID, 29, testPak, (files) => installPak(context.api, files)); //Pak installer
  context.registerInstaller(UE4SS_ID, 31, testUe4ss, installUe4ss);
  if (SIGBYPASS_REQUIRED === true) {
    context.registerInstaller(SIGBYPASS_ID, 33, testSigBypass, installSigBypass);
  }
  context.registerInstaller(SCRIPTS_ID, 35, testScripts, (files, fileName) => installScripts(context.api, files, fileName));
  context.registerInstaller(DLL_ID, 37, testDll, (files, fileName) => installDll(context.api, files, fileName));
  context.registerInstaller(ROOT_ID, 39, testRoot, installRoot);
  context.registerInstaller(CONFIG_ID, 41, testConfig, (files) => installConfig(context.api, files));
  context.registerInstaller(SAVE_ID, 43, testSave, (files) => installSave(context.api, files));
  context.registerInstaller(BINARIES_ID, 49, testBinaries, (files, fileName) => installBinaries(context.api, files, fileName));

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, PAK_ALT_PATH)).catch(() => null);
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
    util.opn(path.join(GAME_PATH, SCRIPTS_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open LogicMods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, LOGICMODS_PATH)).catch(() => null);
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
      downloadUe4ssNexus(context.api, gameSpec);
    } else {
      downloadUe4ss(context.api, gameSpec, false);
    }
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open UE4SS Settings INI', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, BINARIES_PATH, UE4SS_SETTINGS_FILEPATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open UE4SS mods.txt', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, BINARIES_PATH, UE4SS_MODSTXT_FILEPATH)).catch(() => null);
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

//Main function
function main(context) {
  applyGame(context, spec);
  if (UNREALDATA.loadOrder === true) { //UNREAL - mod load order
    if (FBLO) {
      context.registerLoadOrder({
        gameId: spec.game.id,
        validate: async () => Promise.resolve(undefined), // no validation implemented yet
        deserializeLoadOrder: async () => await deserializeLoadOrder(context),
        serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
        toggleableEntries: false,
        usageInstructions: LoadOrderInstructions,
        customItemRenderer: LoadOrderItemRenderer,
      }); //*/
    } else { //legacy Load Order
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
          requestDeployment(context.api, spec);
          previousLO = loadOrder;
        },
        createInfoPanel: () =>
          context.api.translate(`Drag and drop the mods on the left to change the order in which they load.\n`
            + `${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here.\n`
            + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.\n'
            + '\n'
            + 'YOU MUST DEPLOY MODS AFTER CHANGING THE ORDER TO APPLY CHANGES.'
          ),
      }); //*/
    }
  }
  if (ue4ssLoadOrder) {
    context.registerReducer(['settings', GAME_ID], {
      reducers: {
        [setUe4ssLoEnabled.toString()]: (state, payload) => util.setSafe(state, ['ue4ssLoEnabled'], payload),
      },
      defaults: { ue4ssLoEnabled: true },
    });
    context.registerSettings('Mods', GameSettings, () => ({}),
      () => selectors.activeGameId(context.api.getState()) === GAME_ID, 150
    );
    context.registerReducer(['persistent', 'ue4ssLoadOrder'], {
      reducers: {
        [setUe4ssLoadOrder.toString()]: (state, payload) => util.setSafe(state, [payload.profileId, 'loadOrder'], payload.loadOrder),
      },
      defaults: {},
    });
    context.registerMainPage('unreal', 'UE4SS Load Order', Ue4ssLoadOrderPage, {
      id: `${GAME_ID}-ue4ss-loadorder`,
      priority: 31,
      group: 'per-game',
      hotkey: 'U',
      mdi: UE4SS_ICON,
      visible: () => {
        const state = context.api.store.getState();
        const gameId = selectors.activeGameId(state);
        //const loEnabled = util.getSafe(state, ['settings', GAME_ID, 'ue4ssLoEnabled'], true);
        return gameId === GAME_ID && ue4ssLoadOrder; //not using loEnabled so that the page is still visible
      },
      props: () => ({ api: context.api }),
    });
  }
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    api.onAsync('did-deploy', (profileId) => didDeploy(api, profileId)); //*/
    //api.onAsync('did-purge', (profileId) => didPurge(api, profileId)); //*/
  });
  return true;
}

const requestDeployment = (api, spec) => {
  api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
  api.sendNotification({
    id: `${spec.game.id}-loadorderdeploy-notif`,
    type: 'warning',
    message: 'Deployment Required to Apply Load Order Changes',
    allowSuppress: true,
    actions: [
      {
        title: 'Deploy',
        action: (dismiss) => {
          deploy(api);
          dismiss();
        }
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
  if (ue4ssLoadOrder && isUe4ssInstalled(api, spec)) {
    const loEnabled = util.getSafe(state, ['settings', GAME_ID, 'ue4ssLoEnabled'], true);
    if (loEnabled) {
      let UE4SS_LOAD_ORDER;
      try {
        UE4SS_LOAD_ORDER = await deserializeUe4ss(api);
        api.store.dispatch(setUe4ssLoadOrder(profileId, UE4SS_LOAD_ORDER));
      } catch (err) {
        log('error', `[${GAME_ID}] didDeploy: deserializeUe4ss failed, falling back to store state`, err);
        UE4SS_LOAD_ORDER = util.getSafe(state, ['persistent', 'ue4ssLoadOrder', profileId, 'loadOrder'], []);
      }
      if (UE4SS_LOAD_ORDER.length > 0) {
        await serializeUe4ss(api, UE4SS_LOAD_ORDER);
      }
    }
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

//React load order instructions renderer
function LoadOrderInstructions() {
  return React.createElement('div', null,
    React.createElement('p', null,
      'Drag and drop the mods on the left to change the order in which they load. ',
    ),
    React.createElement('br', null),
    React.createElement('p', null,
      `${GAME_NAME_SHORT} loads mods in alphanumerical order, so Vortex prefixes the folder `,
      'names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. ',
      'The number in the left column represents the overwrite order. Changes from ',
      'mods with higher numbers take priority over mods that make similar edits.'
    ),
    React.createElement('br', null),
    React.createElement('p', { style: { fontWeight: 'bold', color: '#7ec8e3' } },
      'The Enable/Disable button on each row enables or disables the underlying Vortex mod. ',
      'Disabling a mod here will remove it from this view and disable it on the Mods tab. ',
      'Re-enabling it on the Mods tab will restore it to the load order.'
    ),
    React.createElement('br', null),
    React.createElement('p', { style: { fontWeight: 'bold' } },
      'YOU MUST DEPLOY MODS AFTER CHANGING THE ORDER TO APPLY CHANGES! ',
      '- This is required to rename the folders for the correct order.'
    ),
    React.createElement('br', null),
    React.createElement('p', { style: { fontStyle: 'italic', color: 'yellow', fontWeight: 'bold' } },
      'Note: This page manages Pak mods only. UE4SS mod load order is managed on the UE4SS Load Order page.'
    ),
    React.createElement('br', null),
    React.createElement('p', { style: { color: 'yellow', fontWeight: 'bold' } },
      SPECIAL_LO_INSTRUCTIONS
    )
  );
}

//* PAK LO selection + context menu state (module-level pub-sub, shared across all item renderer instances)
let _pakSelectedIds = new Set();
let _pakContextMenu = null;
const _pakListeners = new Set();
function _notifyPak() { _pakListeners.forEach(l => l()); }
function usePakLOState() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    _pakListeners.add(forceUpdate);
    return () => _pakListeners.delete(forceUpdate);
  }, []);
  return {
    selectedIds: _pakSelectedIds,
    setSelectedIds: (fn) => { _pakSelectedIds = fn(_pakSelectedIds); _notifyPak(); },
    contextMenu: _pakContextMenu,
    setContextMenu: (val) => { _pakContextMenu = val; _notifyPak(); },
  };
}

//* React line item renderer for load order
function LoadOrderItemRenderer(props) {
  const { className, item } = props;
  if (item?.loEntry === undefined) return null;

  const { ListGroupItem, Checkbox } = require('react-bootstrap');
  const { Icon, LoadOrderIndexInput, MainContext } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');

  const context = React.useContext(MainContext);
  const dispatch = useDispatch();

  const profile = useSelector((state) => selectors.activeProfile(state));
  const loadOrder = useSelector((state) =>
    util.getSafe(state, ['persistent', 'loadOrder', profile?.id], []),
  );

  const { loEntry, displayCheckboxes } = item;
  const mods = useSelector((state) => util.getSafe(state, ['persistent', 'mods', GAME_ID], {}));
  const pictureUrl = mods[loEntry.modId]?.attributes?.pictureUrl;
  const currentIdx = loadOrder.findIndex((e) => e.id === loEntry.id) + 1;
  const isModEnabled = useSelector(state =>
    util.getSafe(state, ['persistent', 'profiles', profile?.id, 'modState', loEntry.modId, 'enabled'], false));

  const isLocked = (entry) => [true, 'true', 'always'].includes(entry?.locked);
  const lockedCount = loadOrder.filter(isLocked).length;

  const onApplyIndex = React.useCallback((idx) => {
    if (currentIdx === idx) return;
    const newLO = loadOrder.filter((e) => e.id !== loEntry.id);
    newLO.splice(idx - 1, 0, loEntry);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
  }, [dispatch, profile, loadOrder, loEntry, currentIdx]);

  const onToggle = React.useCallback((evt) => {
    dispatch(actions.setFBLoadOrderEntry(profile.id, { ...loEntry, enabled: evt.target.checked }));
  }, [dispatch, profile, loEntry]);

  const onModToggle = React.useCallback(() => {
    if (!loEntry.modId) return;
    dispatch(actions.setModEnabled(profile.id, loEntry.modId, !isModEnabled));
    requestDeployment(context.api, spec);
  }, [dispatch, profile, loEntry.modId, isModEnabled, context]);

  const isEntryLocked = isLocked(loEntry);

  const { selectedIds, setSelectedIds, contextMenu, setContextMenu } = usePakLOState();
  const isSelected = selectedIds.has(loEntry.id);
  const allIds = loadOrder.map(e => e.id);

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
    const newLO = loadOrder.map(e => e.id === loEntry.id ? { ...e, locked: !isEntryLocked } : e);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
    serializeLoadOrder(context, newLO);
  }, [dispatch, context, profile, loadOrder, loEntry, isEntryLocked]);

  React.useEffect(() => {
    const styleId = 'lo-index-focus-style';
    if (!globalThis.document.getElementById(styleId)) {
      const style = globalThis.document.createElement('style');
      style.id = styleId;
      style.textContent = '.load-order-index input:focus { background: white !important; color: black !important; }';
      globalThis.document.head.appendChild(style);
    }
  }, []);

  const classes = ['load-order-entry'];
  if (className) classes.push(...className.split(' '));

  return React.createElement(
    ListGroupItem,
    { key: loEntry.id, className: classes.join(' '), onClick: onSelect, onContextMenu: onContextMenu, style: { outline: isSelected ? '2px solid #337ab7' : 'none', outlineOffset: '-1px' } },
    React.createElement('div', { style: { visibility: isEntryLocked ? 'hidden' : 'visible' } },
      React.createElement(Icon, { className: 'drag-handle-icon', name: 'drag-handle' }),
    ),
    React.createElement('div', { style: { width: 24, flexShrink: 0, overflow: 'hidden' } },
      React.createElement(LoadOrderIndexInput, {
        className: 'load-order-index',
        api: context.api,
        item: loEntry,
        currentPosition: currentIdx,
        lockedEntriesCount: lockedCount,
        loadOrder: loadOrder,
        isLocked: isLocked,
        onApplyIndex: onApplyIndex,
      }),
    ),
    React.createElement('div', {
      style: { cursor: 'pointer', display: 'flex', alignItems: 'center' },
      title: isEntryLocked ? 'Unlock position' : 'Lock position',
      onClick: onLock,
    },
      React.createElement(Icon, { name: isEntryLocked ? 'locked' : 'unlocked', style: { color: isEntryLocked ? '#e2c04c' : 'inherit' } }),
    ),
    React.createElement('div', { className: 'load-order-thumb-slot', style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, marginRight: 4, flexShrink: 0 } },
      pictureUrl ? React.createElement('img', {
        className: 'load-order-thumb',
        src: pictureUrl,
        draggable: false,
        style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, objectFit: 'cover', borderRadius: 2, pointerEvents: 'none' },
      }) : null,
    ),
    React.createElement('p', { className: 'load-order-name', style: { whiteSpace: 'normal', wordBreak: 'break-word' } }, loEntry.name),
    loEntry.modId ? React.createElement('button', {
      className: 'btn btn-default btn-sm',
      style: { margin: '0 4px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 },
      onClick: evt => { evt.stopPropagation(); onModToggle(); },
    },
      React.createElement(Icon, { name: isModEnabled ? 'toggle-disabled' : 'toggle-enabled' }),
      isModEnabled ? 'Disable' : 'Enable',
    ) : null,
    displayCheckboxes ? React.createElement(Checkbox, {
      className: 'entry-checkbox',
      checked: loEntry.enabled,
      disabled: isLocked(loEntry),
      onChange: onToggle,
    }) : null,
    contextMenu?.itemId === loEntry.id ? React.createElement(PakContextMenu, {
      x: contextMenu.x, y: contextMenu.y,
      item: loEntry, loadOrder, profile, dispatch, context, selectedIds, isModEnabled,
      onClose: () => setContextMenu(null),
    }) : null,
  );
} //*/

function PakContextMenu({ x, y, item, loadOrder, profile, dispatch, context, selectedIds, isModEnabled, onClose }) {
  React.useEffect(() => {
    const onKey = (evt) => { if (evt.key === 'Escape') onClose(); };
    globalThis.document.addEventListener('keydown', onKey);
    return () => globalThis.document.removeEventListener('keydown', onKey);
  }, [onClose]);

  React.useEffect(() => {
    const dismiss = onClose;
    globalThis.document.addEventListener('click', dismiss);
    globalThis.document.addEventListener('contextmenu', dismiss);
    return () => {
      globalThis.document.removeEventListener('click', dismiss);
      globalThis.document.removeEventListener('contextmenu', dismiss);
    };
  }, []);

  React.useEffect(() => {
    const styleId = 'ue4ss-ctx-menu-style';
    if (!globalThis.document.getElementById(styleId)) {
      const style = globalThis.document.createElement('style');
      style.id = styleId;
      style.textContent = '.ue4ss-ctx-item:hover { background: rgba(255,255,255,0.1); }';
      globalThis.document.head.appendChild(style);
    }
  }, []);

  const isLocked = (e) => [true, 'true', 'always'].includes(e?.locked);
  const isMulti = selectedIds.size >= 2 && selectedIds.has(item.id);
  const targets = isMulti ? loadOrder.filter(e => selectedIds.has(e.id)) : [item];

  const applyToTargets = (transform, serialize = false) => {
    const newLO = transform(loadOrder, targets);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
    if (serialize) serializeLoadOrder(context, newLO);
    onClose();
  };

  const isEntryLocked = isLocked(item);

  const setModsEnabled = (entries, enable) => {
    const batch = entries.filter(e => e.modId)
      .map(e => actions.setModEnabled(profile.id, e.modId, enable));
    if (batch.length) {
      util.batchDispatch(dispatch, batch);
      requestDeployment(context.api, spec);
    }
    onClose();
  };

  const menuStyle = {
    position: 'fixed', left: x, top: y, zIndex: 9999,
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4, padding: '4px 0', minWidth: 180,
    boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
  };
  const itemStyle = { padding: '6px 16px', cursor: 'pointer', whiteSpace: 'nowrap' };
  const sepStyle = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' };

  const menuItem = (label, onClick) => React.createElement('div', {
    className: 'ue4ss-ctx-item',
    style: itemStyle,
    onClick: (evt) => { evt.stopPropagation(); onClick(); },
  }, label);

  if (isMulti) {
    const n = targets.length;
    return React.createElement('div', { style: menuStyle },
      menuItem(`Enable Selected (${n})`, () => setModsEnabled(targets, true)),
      menuItem(`Disable Selected (${n})`, () => setModsEnabled(targets, false)),
      React.createElement('div', { style: sepStyle }),
      menuItem(`Lock Selected (${n})`, () => applyToTargets((lo) => lo.map(e => targets.find(t => t.id === e.id) ? { ...e, locked: true } : e), true)),
      menuItem(`Unlock Selected (${n})`, () => applyToTargets((lo) => lo.map(e => targets.find(t => t.id === e.id) ? { ...e, locked: false } : e), true)),
    );
  }

  return React.createElement('div', { style: menuStyle },
    item.modId ? menuItem(isModEnabled ? 'Disable Mod' : 'Enable Mod', () => setModsEnabled([item], !isModEnabled)) : null,
    item.modId ? React.createElement('div', { style: sepStyle }) : null,
    menuItem(isEntryLocked ? 'Unlock Position' : 'Lock Position', () => applyToTargets((lo) => lo.map(e => e.id === item.id ? { ...e, locked: !isEntryLocked } : e), true)),
    React.createElement('div', { style: sepStyle }),
    menuItem('Move to Top', () => applyToTargets((lo) => {
      const locked = lo.filter(isLocked);
      const rest = lo.filter(e => !isLocked(e) && e.id !== item.id);
      return [...locked, item, ...rest];
    })),
    menuItem('Move to Bottom', () => applyToTargets((lo) => {
      const rest = lo.filter(e => e.id !== item.id);
      return [...rest, item];
    })),
  );
}

function GameSettings() {
  const { Toggle, More, MainContext } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');
  const dispatch = useDispatch();
  const { api } = React.useContext(MainContext);
  const ue4ssLoEnabled = useSelector(state =>
    util.getSafe(state, ['settings', GAME_ID, 'ue4ssLoEnabled'], true));
  const onToggle = React.useCallback((checked) => {
    dispatch(setUe4ssLoEnabled(checked));
    reconcileEnabledTxt(api, !checked)
      .catch(err => log('warn', `UE4SS LO reconcile failed: ${err.message}`));
  }, [api, dispatch]);
  return React.createElement('form', null,
    React.createElement('div', { className: 'settings-group' },
      React.createElement(Toggle, { checked: ue4ssLoEnabled, onToggle },
        'UE4SS Load Order',
        React.createElement(More, { id: `${GAME_ID}-ue4ss-lo-more`, name: 'UE4SS Load Order' },
          'Enable the UE4SS mod load order page and mods.txt management. '
          + `Disabling will have the extension write ${ENABLEDTXT_FILE} files with no Load Order control.`,
        ),
      ),
    ),
  );
}

async function reconcileEnabledTxt(api, write) {
  const state = api.getState();
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  if (!stagingPath) return;

  const targets = new Set();
  await util.walk(stagingPath, (iterPath, stats) => {
    if (!stats.isDirectory()) return Promise.resolve();
    const base = path.basename(iterPath).toLowerCase();
    if (base === 'scripts' || base === 'dlls') {
      if (!UE4SS_NATIVE_MODS.includes(path.basename(path.dirname(iterPath)))) {
        targets.add(path.dirname(iterPath));
      }
    }
    return Promise.resolve();
  }, { ignoreErrors: true });

  let touched = 0;
  for (const parent of targets) {
    const marker = path.join(parent, ENABLEDTXT_FILE);
    try {
      if (write) {
        try { await fs.statAsync(marker); }
        catch { await fs.writeFileAsync(marker, ''); touched++; }
      } else {
        try { await fs.removeAsync(marker); touched++; }
        catch (err) { if (err.code !== 'ENOENT') throw err; }
      }
    } catch (err) {
      log('warn', `${ENABLEDTXT_FILE} ${write ? 'write' : 'delete'} failed at ${marker}: ${err.message}`);
    }
  }

  api.sendNotification({
    id: `${GAME_ID}-ue4ss-lo-reconcile`,
    type: 'success',
    message: write
      ? `UE4SS Load Order disabled: wrote ${ENABLEDTXT_FILE} for ${touched} mod folder(s).`
      : `UE4SS Load Order enabled: cleared ${ENABLEDTXT_FILE} for ${touched} mod folder(s).`,
    displayMS: 5000,
  });
}

//* React components for UE4SS load order page
const Ue4ssSelectionContext = React.createContext({ selectedIds: new Set(), setSelectedIds: () => {}, allIds: [], contextMenu: null, setContextMenu: () => {} });

function Ue4ssItemRenderer({ className, item }) {
  const { Checkbox } = require('react-bootstrap');
  const { Icon, LoadOrderIndexInput, MainContext } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');

  const vortexContext = React.useContext(MainContext);
  const dispatch = useDispatch();

  const profileId = useSelector(state => selectors.activeProfile(state)?.id);
  const loadOrder = useSelector(state =>
    util.getSafe(state, ['persistent', 'ue4ssLoadOrder', profileId, 'loadOrder'], []));
  const mods = useSelector(state => util.getSafe(state, ['persistent', 'mods', GAME_ID], {}));
  const pictureUrl = mods[item.modId]?.attributes?.pictureUrl;
  const gamePath = useSelector(state => util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'path'], ''));

  const currentIdx = loadOrder.findIndex((e) => e.id === item.id) + 1;
  const isLocked = (entry) => [true, 'true', 'always'].includes(entry?.locked);
  const lockedCount = loadOrder.filter(isLocked).length;

  const onApplyIndex = React.useCallback((idx) => {
    if (currentIdx === idx) return;
    const newLO = loadOrder.filter((e) => e.id !== item.id);
    newLO.splice(idx - 1, 0, item);
    dispatch(setUe4ssLoadOrder(profileId, newLO));
    serializeUe4ss(vortexContext.api, newLO);
  }, [dispatch, vortexContext, profileId, loadOrder, item, currentIdx]);

  const isEntryLocked = isLocked(item);

  const onLock = React.useCallback(() => {
    const newLO = loadOrder.map(e => e.id === item.id ? { ...e, locked: !isEntryLocked } : e);
    dispatch(setUe4ssLoadOrder(profileId, newLO));
    serializeUe4ss(vortexContext.api, newLO);
  }, [dispatch, vortexContext, profileId, loadOrder, item, isEntryLocked]);

  const [configFilePath, setConfigFilePath] = React.useState('');
  React.useEffect(() => {
    if (!gamePath || !item.id) { setConfigFilePath(''); return; }
    const modFolder = path.join(gamePath, BINARIES_PATH, UE4SS_MOD_PATH, item.id);
    const localConfigFiles = [...UE4SS_CONFIG_FILES, `${item.id}.txt`, `${item.id}.ini`, `${item.id}.json`];
    let found = '';
    util.walk(modFolder, (iterPath, stats) => {
      if (found === '' && !stats.isDirectory() && localConfigFiles.includes(path.basename(iterPath))) {
        found = iterPath;
      }
      return Promise.resolve();
    })
      .then(() => setConfigFilePath(found))
      .catch(() => setConfigFilePath(''));
  }, [gamePath, item.id]);

  const onConfigure = React.useCallback(() => {
    util.opn(configFilePath).catch(() => null);
  }, [configFilePath]);

  const onToggle = React.useCallback((evt) => {
    const newLO = loadOrder.map(e => e.id === item.id ? { ...e, enabled: evt.target.checked } : e);
    dispatch(setUe4ssLoadOrder(profileId, newLO));
    serializeUe4ss(vortexContext.api, newLO);
  }, [dispatch, vortexContext, loadOrder, item, profileId]);

  const { selectedIds, setSelectedIds, allIds, contextMenu, setContextMenu } = React.useContext(Ue4ssSelectionContext);
  const isSelected = selectedIds.has(item.id);

  const onContextMenu = React.useCallback((evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    setContextMenu({ x: evt.clientX, y: evt.clientY, itemId: item.id });
  }, [item.id, setContextMenu]);

  const onSelect = React.useCallback((evt) => {
    const ctrlKey = evt.ctrlKey || evt.metaKey;
    const shiftKey = evt.shiftKey;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (ctrlKey) {
        next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      } else if (shiftKey) {
        const lastId = [...prev].at(-1);
        const start = allIds.indexOf(lastId ?? item.id);
        const end = allIds.indexOf(item.id);
        const [lo, hi] = [Math.min(start, end), Math.max(start, end)];
        for (let i = lo; i <= hi; i++) next.add(allIds[i]);
      } else {
        next.clear();
        next.add(item.id);
      }
      return next;
    });
  }, [item.id, setSelectedIds, allIds]);

  const classes = ['load-order-entry'];
  if (className) classes.push(...className.split(' ').filter(Boolean));

  return React.createElement('div', {
    key: item.id,
    className: classes.join(' '),
    onClick: onSelect,
    onContextMenu: onContextMenu,
    style: {
      display: 'flex', flexDirection: 'row', alignItems: 'center',
      gap: 8, padding: '4px 12px', margin: 0,
      border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4,
      minHeight: 52,
      outline: isSelected ? '2px solid #337ab7' : 'none',
      outlineOffset: '-1px',
    },
  },
    React.createElement('div', { style: { visibility: isEntryLocked ? 'hidden' : 'visible' } },
      React.createElement(Icon, { className: 'drag-handle-icon', name: 'drag-handle' }),
    ),
    React.createElement('div', { style: { width: 24, flexShrink: 0, overflow: 'hidden' } },
      React.createElement(LoadOrderIndexInput, {
        className: 'load-order-index',
        api: vortexContext.api,
        item: item,
        currentPosition: currentIdx,
        lockedEntriesCount: lockedCount,
        loadOrder: loadOrder,
        isLocked: isLocked,
        onApplyIndex: onApplyIndex,
      }),
    ),
    React.createElement('div', {
      style: { cursor: 'pointer', display: 'flex', alignItems: 'center' },
      title: isEntryLocked ? 'Unlock position' : 'Lock position',
      onClick: onLock,
    },
      React.createElement(Icon, { name: isEntryLocked ? 'locked' : 'unlocked', style: { color: isEntryLocked ? '#e2c04c' : 'inherit' } }),
    ),
    React.createElement('div', { className: 'load-order-thumb-slot', style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, flexShrink: 0 } },
      pictureUrl ? React.createElement('img', {
        className: 'load-order-thumb',
        src: pictureUrl,
        draggable: false,
        style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, objectFit: 'cover', borderRadius: 2, pointerEvents: 'none' },
      }) : null,
    ),
    React.createElement('p', { className: 'load-order-name', style: { flex: '1 1 0', margin: 0, whiteSpace: 'normal', wordBreak: 'break-word' } }, item.name),
    configFilePath ? React.createElement('button', {
      className: 'btn btn-default btn-sm',
      style: { margin: '0 4px' },
      onClick: onConfigure,
    }, 'Configure') : null,
    React.createElement('input', {
      type: 'checkbox',
      style: { alignSelf: 'center', cursor: 'pointer' },
      checked: item.enabled ?? true,
      onChange: onToggle,
    }),
    contextMenu?.itemId === item.id ? React.createElement(Ue4ssContextMenu, {
      x: contextMenu.x, y: contextMenu.y,
      item, loadOrder, profileId, dispatch,
      api: vortexContext.api, gamePath, configFilePath, selectedIds,
      onClose: () => setContextMenu(null),
    }) : null,
  );
}

function Ue4ssContextMenu({ x, y, item, loadOrder, profileId, dispatch, api, gamePath, configFilePath, selectedIds, onClose }) {
  React.useEffect(() => {
    const onKey = (evt) => { if (evt.key === 'Escape') onClose(); };
    globalThis.document.addEventListener('keydown', onKey);
    return () => globalThis.document.removeEventListener('keydown', onKey);
  }, [onClose]);

  React.useEffect(() => {
    const styleId = 'ue4ss-ctx-menu-style';
    if (!globalThis.document.getElementById(styleId)) {
      const style = globalThis.document.createElement('style');
      style.id = styleId;
      style.textContent = '.ue4ss-ctx-item:hover { background: rgba(255,255,255,0.1); }';
      globalThis.document.head.appendChild(style);
    }
  }, []);

  const isLocked = (e) => [true, 'true', 'always'].includes(e?.locked);
  const isMulti = selectedIds.size >= 2 && selectedIds.has(item.id);
  const targets = isMulti ? loadOrder.filter(e => selectedIds.has(e.id)) : [item];

  const applyToTargets = (transform) => {
    const newLO = transform(loadOrder, targets);
    dispatch(setUe4ssLoadOrder(profileId, newLO));
    serializeUe4ss(api, newLO);
    onClose();
  };

  const isEntryLocked = isLocked(item);
  const isEntryEnabled = item.enabled ?? true;

  const menuStyle = {
    position: 'fixed', left: x, top: y, zIndex: 9999,
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4, padding: '4px 0', minWidth: 180,
    boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
  };
  const itemStyle = { padding: '6px 16px', cursor: 'pointer', whiteSpace: 'nowrap' };
  const sepStyle = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' };

  const menuItem = (label, onClick) => React.createElement('div', {
    className: 'ue4ss-ctx-item',
    style: itemStyle,
    onClick: (evt) => { evt.stopPropagation(); onClick(); },
  }, label);

  if (isMulti) {
    const n = targets.length;
    return React.createElement('div', { style: menuStyle },
      menuItem(`Enable Selected (${n})`, () => applyToTargets((lo) => lo.map(e => targets.find(t => t.id === e.id) ? { ...e, enabled: true } : e))),
      menuItem(`Disable Selected (${n})`, () => applyToTargets((lo) => lo.map(e => targets.find(t => t.id === e.id) ? { ...e, enabled: false } : e))),
      React.createElement('div', { style: sepStyle }),
      menuItem(`Lock Selected (${n})`, () => applyToTargets((lo) => lo.map(e => targets.find(t => t.id === e.id) ? { ...e, locked: true } : e))),
      menuItem(`Unlock Selected (${n})`, () => applyToTargets((lo) => lo.map(e => targets.find(t => t.id === e.id) ? { ...e, locked: false } : e))),
      React.createElement('div', { style: sepStyle }),
      menuItem('Open Mod Folder', () => { util.opn(path.join(gamePath, BINARIES_PATH, UE4SS_MOD_PATH, item.id)).catch(() => null); onClose(); }),
    );
  }

  return React.createElement('div', { style: menuStyle },
    menuItem(isEntryEnabled ? 'Disable' : 'Enable', () => applyToTargets((lo) => lo.map(e => e.id === item.id ? { ...e, enabled: !isEntryEnabled } : e))),
    menuItem(isEntryLocked ? 'Unlock Position' : 'Lock Position', () => applyToTargets((lo) => lo.map(e => e.id === item.id ? { ...e, locked: !isEntryLocked } : e))),
    configFilePath ? menuItem('Configure', () => { util.opn(configFilePath).catch(() => null); onClose(); }) : null,
    React.createElement('div', { style: sepStyle }),
    menuItem('Open Mod Folder', () => { util.opn(path.join(gamePath, BINARIES_PATH, UE4SS_MOD_PATH, item.id)).catch(() => null); onClose(); }),
    React.createElement('div', { style: sepStyle }),
    menuItem('Move to Top', () => applyToTargets((lo) => {
      const locked = lo.filter(isLocked);
      const rest = lo.filter(e => !isLocked(e) && e.id !== item.id);
      return [...locked, item, ...rest];
    })),
    menuItem('Move to Bottom', () => applyToTargets((lo) => {
      const rest = lo.filter(e => e.id !== item.id);
      return [...rest, item];
    })),
  );
}

function Ue4ssLoadOrderInfoPanel() {
  return React.createElement('div', {
    id: 'loadorderinfo',
    style: { padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' },
  },
    React.createElement('h2', { style: { marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 } },
      React.createElement('svg', {
        viewBox: '0 0 24 24',
        style: { width: 28, height: 28, fill: 'currentColor', flexShrink: 0 },
      },
        React.createElement('path', { d: UE4SS_ICON }),
      ),
      React.createElement('span', null,
        React.createElement('span', { style: { fontWeight: 'bold' } }, 'UE4SS'),
        React.createElement('span', { style: { fontWeight: 300, color: 'rgba(255,255,255,0.65)' } }, ' Mod Load Order'),
      ),
    ),
    React.createElement('ul', { style: { margin: 0, paddingLeft: 20, listStyleType: 'disc' } },
      React.createElement('li', null,
        'Drag and drop mods to change the order in which UE4SS loads them. Changes write to mods.txt immediately.'
      ),
      React.createElement('li', null,
        'Use the checkboxes to enable or disable each mod. All changes write to mods.txt immediately.'
      ),
      React.createElement('li', null,
        `Mods with a ${UE4SS_CONFIG_FILES.join('/')} file will have a "Configure" button to open the file externally.`
      ),
      React.createElement('li', { style: { fontStyle: 'italic', color: 'yellow', fontWeight: 'bold' } },
        'Note: This page manages UE4SS mods only. Pak mod load order is managed on the Load Order page.'
      ),
    ),
  );
}

function Ue4ssLoadOrderPage({ api }) {
  const { useSelector, useDispatch } = require('react-redux');
  const { FormControl } = require('react-bootstrap');

  const profileId = useSelector(state => selectors.activeProfile(state)?.id);
  const loadOrder = useSelector(state =>
    util.getSafe(state, ['persistent', 'ue4ssLoadOrder', profileId, 'loadOrder'], []));
  const loEnabled = useSelector(state => util.getSafe(state, ['settings', GAME_ID, 'ue4ssLoEnabled'], true));
  const dispatch = useDispatch();
  const [filterText, setFilterText] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [contextMenu, setContextMenu] = React.useState(null);

  React.useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    globalThis.document.addEventListener('click', dismiss);
    globalThis.document.addEventListener('contextmenu', dismiss);
    return () => {
      globalThis.document.removeEventListener('click', dismiss);
      globalThis.document.removeEventListener('contextmenu', dismiss);
    };
  }, [contextMenu]);

  React.useEffect(() => {
    if (!profileId) return;
    if (selectors.activeGameId(api.getState()) !== GAME_ID) return;
    deserializeUe4ss(api).then(lo => dispatch(setUe4ssLoadOrder(profileId, lo)));
    setSelectedIds(new Set());
  }, [profileId]);

  React.useEffect(() => {
    const styleId = 'lo-index-focus-style';
    if (!globalThis.document.getElementById(styleId)) {
      const style = globalThis.document.createElement('style');
      style.id = styleId;
      style.textContent = '.load-order-index input:focus { background: white !important; color: black !important; }';
      globalThis.document.head.appendChild(style);
    }
  }, []);

  const onApply = React.useCallback((reordered) => {
    let newLO;
    if (filterText) {
      const filteredIds = new Set(reordered.map(e => e.id));
      const positions = loadOrder.reduce((acc, e, i) => { if (filteredIds.has(e.id)) acc.push(i); return acc; }, []);
      newLO = [...loadOrder];
      positions.forEach((pos, i) => { newLO[pos] = reordered[i]; });
    } else {
      newLO = reordered;
    }
    dispatch(setUe4ssLoadOrder(profileId, newLO));
    serializeUe4ss(api, newLO);
  }, [dispatch, loadOrder, filterText, profileId]);

  const filteredOrder = filterText
    ? loadOrder.filter(e => e.name.toLowerCase().includes(filterText.toLowerCase()))
    : loadOrder;

  const allIds = filteredOrder.map(e => e.id);

  if (!loEnabled) {
    return React.createElement(MainPage, null,
      React.createElement(MainPage.Body, null,
        React.createElement('p', { style: { padding: '12px', fontWeight: 'bold', color: 'yellow' } }, 'UE4SS load order is disabled in Settings.')));
  }

  if (!loadOrder.length) {
    return React.createElement(MainPage, null,
      React.createElement(MainPage.Body, null,
        React.createElement('p', { style: { padding: '12px', fontWeight: 'bold', color: 'yellow' } }, 'No UE4SS mods are installed.')));
  }

  return React.createElement(MainPage, null,
    React.createElement(MainPage.Header, null,
      React.createElement(FormControl, {
        type: 'search',
        placeholder: 'Filter mods...',
        className: 'file-based-load-order-filter',
        value: filterText,
        onChange: (evt) => setFilterText(evt.target.value),
      })
    ),
    React.createElement(MainPage.Body, null,
      React.createElement(DNDContainer, { style: { height: '95%' } },
        React.createElement(FlexLayout, { type: 'column', className: 'file-based-load-order-container', style: { height: '100%' } },
          React.createElement(FlexLayout.Flex, { className: 'file-based-load-order-list', style: { overflowY: 'auto', minHeight: 0 } },
            React.createElement(Ue4ssSelectionContext.Provider, { value: { selectedIds, setSelectedIds, allIds, contextMenu, setContextMenu } },
              React.createElement(DraggableList, {
                itemTypeId: `${GAME_ID}-ue4ss-lo-entry`,
                id: `${GAME_ID}-ue4ss-loadorder-list`,
                items: filteredOrder,
                itemRenderer: Ue4ssItemRenderer,
                apply: onApply,
                idFunc: entry => entry.id,
                isLocked: item => [true, 'true', 'always'].includes(item?.locked),
              })
            )
          ),
          React.createElement('div', { style: { flexShrink: 0 } },
            React.createElement(Ue4ssLoadOrderInfoPanel)
          )
        )
      )
    )
  );
} //*/

//export to Vortex
module.exports = {
  default: main,
};
