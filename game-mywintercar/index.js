/*//////////////////////////////////////////
Name: My Winter Car Vortex Extension
Structure: Unity BepinEx/MelonLoader Hybrid + Custom Mod Loader (MSCLoader)
Author: ChemBoy1
Version: 0.2.2
Date: 2026-01-12
//////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const fsExtra = require('fs-extra');
const fsPromises = require('fs/promises');
const { parseStringPromise } = require('xml2js');

// -- START EDIT ZONE -- ///////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "mywintercar";
const STEAMAPP_ID = "4164420";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "My Winter Car";
const GAME_NAME_SHORT = "My Winter Car";
const GAME_STRING = "mywintercar"; //string for exe and data folder (seem to always match)
const EXEC = `${GAME_STRING}.exe`;
const DATA_FOLDER = `${GAME_STRING}_Data`;
const DEV_REGSTRING = "amistech"; //developer name
const GAME_REGSTRING = "My Winter Car"; //game name
const XBOX_SAVE_STRING = ''; //string after "ID_"
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/My_Winter_Car";

//feature toggles
const hasCustomMods = false; //set to true if there are modTypes with folder paths dependent on which mod loader is installed
const hasCustomLoader = true; //set to true if there is a custom mod loader
const customLoaderInstaller = true; //set true if the custom loader uses an installer

//Data to determine BepinEx/MelonLoader versions and URLs
const BEPINEX_BUILD = 'mono'; // 'mono' or 'il2cpp' - check for "il2cpp_data" folder
const ARCH = 'x64'; //'x64' or 'x86' game architecture (64-bit or 32-bit)
const BEP_VER = '5.4.23.4'; //set BepInEx version for mono URLs
const BEP_BE_VER = '752'; //set BepInEx build for BE IL2CPP URLs
const BEP_BE_COMMIT = 'dd0655f'; //git commit number for BE IL2CPP builds
const allowBepCfgMan = false; //should BepInExConfigManager be downloaded?
const allowMelPrefMan = false; //should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency
const allowBepinexNexus = false; //set false until bugs are fixed
const allowMelonNexus = false; //set false until bugs are fixed

// -- END EDIT ZONE -- /////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let GAME_VERSION = '';
let bepinexInstalled = false;
let melonInstalled = false;
let mscInstalled = false;
const EXEC_XBOX = 'gamelaunchhelper.exe';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//Config and save paths
const CONFIG_HIVE = 'HKEY_CURRENT_USER';
const CONFIG_REGPATH = `Software\\${DEV_REGSTRING}\\${GAME_REGSTRING}`;
const CONFIG_REGPATH_FULL = `${CONFIG_HIVE}\\${CONFIG_REGPATH}`;

const SAVE_PATH_DEFAULT = path.join(USER_HOME, 'AppData', 'LocalLow', DEV_REGSTRING, GAME_REGSTRING);
const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_SAVE_STRING}`, "SystemAppData", "wgs"); //XBOX Version
let SAVE_PATH = SAVE_PATH_DEFAULT;
const SAVE_FILES = ["savefile.txt"];

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

let BEPINEX_URL = `https://builds.bepinex.dev/projects/bepinex_be/${BEP_BE_VER}/BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.${BEP_BE_VER}%2B${BEP_BE_COMMIT}.zip`;
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

//custom mods (that change directory based on loader)
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

//Save Editor
const MWCEDITOR_ID = `${GAME_ID}-mwceditor`;
const MWCEDITOR_NAME = "MWCEditor";
const MWCEDITOR_EXEC = 'MWCEditor.exe';

//support for MSCLoader //////////////////////////////////////////////////

const MSCLOADER_ID = `${GAME_ID}-mscloader`;
const MSCLOADER_NAME = "MSCLoader";
const MSCLOADER_EXEC = 'MSCLInstaller.exe';
const MSCLOADER_MARKER_FILE = 'MSCLoader.dll';
const MSCLOADER_MARKER_FOLDER = path.join(DATA_FOLDER, 'Managed');
const MSCLOADER_MARKER_PATH = path.join(MSCLOADER_MARKER_FOLDER, MSCLOADER_MARKER_FILE);
const MSCLOADER_FOLDER = 'MSCLoader'; //folder to place the installer in so that the dlls are not next to game exe
const MSCLOADER_PAGE_NO = 3;
const MSCLOADER_FILE_NO = 1463;
const MSCLOADER_DOMAIN = GAME_ID;
const MSCLOADER_FILES_ARRAY = [ //delete these files on purge to remove MSCLoader
  'winhttp.dll',
  path.join(MSCLOADER_MARKER_FOLDER, '0Harmony.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'INIFileParser.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'Ionic.Zip.Reduced.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'MSCLoader.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'MSCLoader.Preloader.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'NAudio.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'NAudio.Flac.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'Newtonsoft.Json.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'NVorbis.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'System.Data.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'System.Runtime.Serialization.dll'),
  path.join(MSCLOADER_MARKER_FOLDER, 'System.Xml.dll'),
];
//these folders need to be temporarily deleted to run the MSCLoader installer
const INSTALLER_DELETE_FOLDERS = [ 
  'Plugins',
  'BepInEx',
];

const MSCLOADER_MOD_ID = `${GAME_ID}-mscloadermod`;
const MSCLOADER_MOD_NAME = "MSCLoader Mod";
const MSCLOADER_MOD_PATH = '.';
const MSCLOADER_MOD_FOLDERS = ['mods'];

const MSCLOADER_PLUGIN_ID = `${GAME_ID}-mscloaderplugin`;
const MSCLOADER_PLUGIN_NAME = "MSCLoader Plugin";
const MSCLOADER_PLUGIN_PATH = path.join('Mods');
const MSC_STRING = 'MSCLoader'; //string to ID MSC plugin file

const TEXTUREPACK_ID = `${GAME_ID}-texturepack`;
const TEXTUREPACK_NAME = "Texture Pack (MSCLoader)";
const TEXTUREPACK_PATH = path.join(MSCLOADER_PLUGIN_PATH, 'Assets', 'TexturePackLoader');
const TEXTUREPACK_FILES = ['packinfo.json'];
const TEXTUREPACK_EXTS = ['.png'];

// EDIT ZONE //////////////////////////////////////////////////////////////

const MOD_PATH_DEFAULT = ".";
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'manifest.json'), path.join('**', 'icon.png'), path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'manifest.json'), path.join('**', 'icon.png'), path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
//had to split BepInEx and Plugins folders into separate write check since MSCLoader author is a special kind of individual
let MODTYPE_FOLDERS = [ASSEMBLY_PATH, MSCLOADER_PLUGIN_PATH, TEXTUREPACK_PATH];
const MODTYPE_FOLDERS_BEPINEX = [BEPINEX_PATCHERS_PATH, BEPINEX_PLUGINS_PATH, BEPINEX_CONFIG_PATH];
const MODTYPE_FOLDERS_MELON = [MELON_PLUGINS_PATH, MELON_MODS_PATH, MELON_CONFIG_PATH];
if (hasCustomMods) {
  MODTYPE_FOLDERS.push(CUSTOM_PATH_BEPINEX, CUSTOM_PATH_MELON);
}

// EDIT ZONE //////////////////////////////////////////////////////////////

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
    "compatible": {
      "dinput": false,
      "enb": false,
    },
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
      "id": MSCLOADER_MOD_ID,
      "name": MSCLOADER_MOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MSCLOADER_MOD_PATH)
    }, //*/
    {
      "id": MSCLOADER_PLUGIN_ID,
      "name": MSCLOADER_PLUGIN_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MSCLOADER_PLUGIN_PATH)
    }, //*/
    {
      "id": TEXTUREPACK_ID,
      "name": TEXTUREPACK_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', TEXTUREPACK_PATH)
    }, //*/
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
    {
      "id": MSCLOADER_ID,
      "name": MSCLOADER_NAME,
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
    parameters: PARAMETERS,
  }, //*/
  {
    id: MWCEDITOR_ID,
    name: MWCEDITOR_NAME,
    logo: `mwceditor.png`,
    executable: () => MWCEDITOR_EXEC,
    requiredFiles: [MWCEDITOR_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: [],
  }, //*/
  {
    id: MSCLOADER_ID,
    name: `${MSCLOADER_NAME} Installer`,
    logo: `mscloader.png`,
    executable: () => path.join(MSCLOADER_FOLDER, MSCLOADER_EXEC),
    requiredFiles: [path.join(MSCLOADER_FOLDER, MSCLOADER_EXEC)],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    //parameters: [],
  }, //*/
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////

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
  if (await statCheckAsync(GAME_PATH, EXEC_XBOX)) {
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
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    return EXEC_XBOX;
  };
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

//Test for MSCLoader files (installer exe)
function testMscLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === MSCLOADER_EXEC));
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

//Install MSCLoader files (installer exe)
function installMscLoader(files, workingDir) {
  const MOD_TYPE = MSCLOADER_ID;
  const modFile = files.find(file => (path.basename(file) === MSCLOADER_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  //import customized installer files here
  const source = path.join(__dirname, MSCLOADER_FOLDER);
  const dest = workingDir;
  try {
    const copyFiles = fs.readdirSync(source);
    copyFiles.forEach(file => {
      const sourcePath = path.join(source, file);
      const destPath = path.join(dest, file);
      fsExtra.copyFileSync(sourcePath, destPath);
      const paths = fs.readdirSync(dest);
      files = [ ...files, ...paths.map(p => p.replace(`${workingDir}${path.sep}`, ''))];
    });
  } catch (err) {
    log('error', `Failed to copy custom ${MSCLOADER_NAME} Installer files to ${workingDir} during install: ${err}`);
  }

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))
  ));
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MSCLOADER_FOLDER, file.substr(idx)),
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

//Test for Texture Pack (MSCLoader) mod files
function testTexturePack(files, gameId) {
  const isMod = files.some(file => TEXTUREPACK_FILES.includes(path.basename(file).toLowerCase()));
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

//Install Texture Pack (MSCLoader) mod files
function installTexturePack(files) {
  const MOD_TYPE = TEXTUREPACK_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (!file.endsWith(path.sep))
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

  // logic to parse dll files to determine if they are MSCLoader/Melon/BepInEx plugins
  let isBepinex = false;
  let isBepinexPatcher = false;
  let isMelon = false;
  let isMelonPlugin = false;
  let isMsc = false;
  let unknown = false;
  bepinexInstalled = isBepinexInstalled(api, gameSpec);
  melonInstalled = isMelonInstalled(api, gameSpec);
  mscInstalled = isMscInstalled(api, gameSpec);

  // detect plugin types by reading DLL contents
  await Promise.all(files.map(async file => {
    if (PLUGIN_EXTS.includes(path.extname(file).toLowerCase())) {
      try {
        const content = await fs.readFileAsync(path.join(workingDir, file), 'utf8');
        if (content.includes(MSC_STRING)) {
          isMsc = true;
        } 
        else if (content.includes(BEP_STRING)) {
          isBepinex = true;
          isBepinexPatcher = false; //temporary, find reliable string to id patchers
          //isBepinexPatcher = !content.includes(BEP_PATCHER_STRING) && !files.find(file => path.extname(file).toLowerCase() = BEPINEX_PLUGINS_FOLDER);
        } 
        else if (content.includes(MEL_STRING)) {
          isMelon = true;
          isMelonPlugin = content.includes(MEL_PLUGIN_STRING);
        } 
        else {
          unknown = true;
        }
      } catch (err) {
        api.showErrorNotification(`Failed to read plugin file "${file}" to determine which mod loader it requires. Plugin is likely corrupted.`, err, { allowReport: false });
      }
    }
  }));

  // CANCEL INSTALL CONDITIONS //////////////////////////////////////////
  if (isMsc && ( bepinexInstalled || melonInstalled )) {
    const wrongLoader = await api.showDialog('error', 'Wrong Mod Loader', {
        bbcode: api.translate(`Vortex has detected that the ${MOD_NAME} archive has ${MSCLOADER_NAME} plugins, but you have installed BepInEx or MelonLoader.[br][/br][br][/br]`
            + `The installation will be cancelled to avoid issues.[br][/br][br][/br]` 
            + `Check the mod's page to see if there is a BepInEx/MelonLoader version of the mod, or change your mod loader to MSCLoader.[br][/br][br][/br]`),
        options: { order: ['bbcode'], wrap: true },
    }, [
        { label: 'Ok' }
    ]);
    if (wrongLoader.action === 'Ok') {
        throw new util.UserCanceled();
    }
  }
  if ((isBepinex || isMelon) && mscInstalled) {
    const wrongLoader = await api.showDialog('error', 'Wrong Mod Loader', {
        bbcode: api.translate(`Vortex has detected that the ${MOD_NAME} archive has BepInEx/MelonLoader plugins, but you have installed MSCLoader.[br][/br][br][/br]`
            + `The installation will be cancelled to avoid issues.[br][/br][br][/br]` 
            + `Check the mod's page to see if there is a MSCLoader version of the mod, or change your mod loader to BepInEx/MelonLoader.[br][/br][br][/br]`),
        options: { order: ['bbcode'], wrap: true },
    }, [
        { label: 'Ok' }
    ]);
    if (wrongLoader.action === 'Ok') {
        throw new util.UserCanceled();
    }
  }
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
  if (isMsc) {
    setModTypeInstruction = { type: 'setmodtype', value: MSCLOADER_MOD_ID };
    const folder = files.find(file => MSCLOADER_MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
    if (folder !== undefined) {
      idx = folder.indexOf(`${path.basename(folder)}${path.sep}`);
      rootPath = path.dirname(folder);
    }
    if (folder === undefined) {
      setModTypeInstruction = { type: 'setmodtype', value: MSCLOADER_PLUGIN_ID };
    }
  }

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
      api.showErrorNotification('Failed to set up Mod Loader', err, { allowReport: false });
    }
  });
}
//Function to choose mod loader
async function chooseModLoader(api, gameSpec) {
  const MSC_LABEL = `${MSCLOADER_NAME} (Recommended)`;
  const t = api.translate;
  const replace = {
    game: gameSpec.game.name,
    bl: '[br][/br][br][/br]',
  };
  return api.showDialog('info', 'Mod Loader Selection', {
    bbcode: t('You must choose a mod loader to install mods.{{bl}}'
      + 'Only one mod loader can be installed at a time.{{bl}}'
      + 'Make your choice based on which mods you would like to install and which loader they support.{{bl}}'
      + 'You can change which mod loader you have installed by Uninstalling the current one from Vortex, which will bring up this dialog again.{{bl}}'
      + 'Which mod loader would you like to use for {{game}}?',
      { replace }
    ),
  }, [
    { label: t(MSC_LABEL) },
    { label: t('BepInEx') },
    { label: t('MelonLoader') },
  ])
  .then(async (result) => {
    if (result === undefined) {
      return;
    }
    if (result.action === MSC_LABEL) {
      await downloadMsc(api, gameSpec);
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
  const MSC_LABEL = `${MSCLOADER_NAME} (Recommended)`;
  bepinexInstalled = isBepinexInstalled(api, gameSpec);
  melonInstalled = isMelonInstalled(api, gameSpec);
  mscInstalled = isMscInstalled(api, spec);
  const t = api.translate;
  const replace = {
    game: gameSpec.game.name,
    bl: '[br][/br][br][/br]',
  };
  return api.showDialog('info', 'Mod Loader Conflict', {
    bbcode: t('You have more than one mod loader installed.{{bl}}'
      + 'This will cause the game to crash at launch. Only one mod loader can be installed at a time.{{bl}}'
      + 'You must choose which mod loader you would like to use for {{game}}.',
      { replace }
    ),
  }, [
    { label: t(MSC_LABEL) },
    { label: t('BepInEx') },
    { label: t('MelonLoader') },
  ])
  .then(async (result) => {
    if (result === undefined) {
      return;
    }
    if (result.action === MSC_LABEL) {
      if (melonInstalled) {
        await removeMelon(api, gameSpec);
      }
      if (bepinexInstalled) {
        await removeBepinex(api, gameSpec);
      }
    }
    if (result.action === 'BepInEx') {
      if (melonInstalled) {
        await removeMelon(api, gameSpec);
      }
      if (mscInstalled) {
        await removeMsc(api, gameSpec);
      }
    } else if (result.action === 'MelonLoader') {
      if (bepinexInstalled) {
        await removeBepinex(api, gameSpec);
      }
      if (mscInstalled) {
        await removeMsc(api, gameSpec);
      }
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
    api.showErrorNotification('Failed to remove BepInEx', err, { allowReport: false });
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
    api.showErrorNotification('Failed to remove MelonLoader', err, { allowReport: false });
  }
}
async function removeMsc(api, gameSpec) {
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const mod = Object.keys(mods).find(id => mods[id]?.type === MSCLOADER_ID);
  const modId = mods[mod].id
  log('warn', `Found MSCLoader mod to remove for deconfliction: ${modId}`);
  try {
    await util.removeMods(api, gameSpec.game.id, [modId]);
    await removeMscFiles(api, gameSpec);
  } catch (err) {
    api.showErrorNotification('Failed to remove MSCLoader', err, { allowReport: false });
  }
}
async function removeMscFiles(api, gameSpec) { //run on purge too
  GAME_PATH = getDiscoveryPath(api);
  let files = MSCLOADER_FILES_ARRAY;
  log('warn', `Found MSCLoader files to remove for deconfliction/purge: [${files.join(', ')}]`);
  await deleteFiles(GAME_PATH, files);
}
async function deleteFiles(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    try {
      await fs.unlinkAsync(path.join(gamePath, relPaths[index]));
    } catch (err) {
      log('warn', `Failed to remove ${path.join(gamePath, relPaths[index])}: ${err}`);
    }
  }
}

//*
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

//Notify MSCLoader Users about folders that must be deleted when running installer
async function mscInstallerFolderNotify(api) {
  const NOTIF_ID = `${GAME_ID}-mscinstallerfoldernotify`;
  const MOD_NAME = MSCLOADER_NAME;
  const MESSAGE = `IMPORTANT Note for ${MOD_NAME} Installer`;
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
              + `Vortex detected you have selected to use ${MOD_NAME}. You must run the ${MOD_NAME} installer to install necessary files to the game folder.\n`
              + `\n`
              + `Use the default installation options for compatibility with Vortex.\n`
              + `\n`
              /*+ `IMPORTANT: Due to some unneccessary programming in the MSCLoader Installer, you must temporarily delete the "BepInEx" and "Plugins" folders in your game folder before running the MSCLoader installer.\n`
              + `Otherwise, the installer will throw an error and refuse to proceed. After the installer is finished, restart Vortex, otherwise you won't be able to deploy mods.\n`
              + `This is necessary because I did not want to take away the freedom to use BepInEx and MelonLoader, if you prefer them.\n`
              + `\n`
              + `You can use the buttons within the folder icon on the Mods page toolbar to quickly delete the folders and another button to restore them after the installer is finished.\n` //*/
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
  //SYNC CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  bepinexInstalled = isBepinexInstalled(api, gameSpec);
  melonInstalled = isMelonInstalled(api, gameSpec);
  mscInstalled = isMscInstalled(api, spec);
  // ASYNC CODE ///////////////////////////////////
  await modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
  await modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS_BEPINEX);
  await modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS_MELON);
  /*if (mscInstalled) {
    mscInstallerFolderNotify(api);
  } //*/
  if (!bepinexInstalled && !melonInstalled && !mscInstalled) {
    chooseModLoader(api, spec); //dialog to choose mod loader
  }
  if ( (bepinexInstalled && melonInstalled) || (bepinexInstalled && mscInstalled) || (melonInstalled && mscInstalled) ) {
    deconflictModLoaders(api, spec); //deconflict if multiple mod loaders are installed
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
    context.registerModType(CUSTOM_ID, 58, 
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
  context.registerInstaller(MSCLOADER_ID, 25, testMscLoader, installMscLoader);
  context.registerInstaller(BEPINEX_ID, 26, testBepinex, installBepinex);
  context.registerInstaller(MELON_ID, 27, testMelon, installMelon);
  context.registerInstaller(ROOT_ID, 28, testRoot, installRoot);
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
  context.registerInstaller(TEXTUREPACK_ID, 48, testTexturePack, installTexturePack);
  context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  
  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Delete "BepInEx"+"Plugins" Folders (Pre-MSCLInstaller)', async () => {
    GAME_PATH = getDiscoveryPath(context.api);
    try {
      await fs.statAsync(path.join(GAME_PATH, "BepInEx"));
      await fs.statAsync(path.join(GAME_PATH, "Plugins"));
      await fsPromises.rm(path.join(GAME_PATH, "BepInEx"), { recursive: true });
      await fsPromises.rm(path.join(GAME_PATH, "Plugins"), { recursive: true });
      const NOTIF_ID = `${GAME_ID}-folderdeletesuccess`;
      const MESSAGE = `Successfully deleted "BepInEx"+"Plugins" folders. Don't forget to restore them after running the MSCLoader installer.`;
      context.api.sendNotification({
        id: NOTIF_ID,
        type: 'success',
        message: MESSAGE,
        allowSuppress: true,
        actions: [],
      });
    } catch (err) {
      log('warn', `Failed to delete "BepInEx"+"Plugins" folders: ${err}`);
    }
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Restore "BepInEx"+"Plugins" Folders (Post-MSCLInstaller)', async () => {
    GAME_PATH = getDiscoveryPath(context.api);
    modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS_BEPINEX);
    modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS_MELON);
    const NOTIF_ID = `${GAME_ID}-folderrestoresuccess`;
      const MESSAGE = `Successfully restored "BepInEx"+"Plugins" folders.`;
      context.api.sendNotification({
        id: NOTIF_ID,
        type: 'success',
        message: MESSAGE,
        allowSuppress: true,
        actions: [],
      });
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
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
      mscInstalled = isMscInstalled(context.api, spec);
      if (!bepinexInstalled && !melonInstalled && !mscInstalled) {
        chooseModLoader(context.api, spec); //dialog to choose mod loader
      }
      if ( (bepinexInstalled && melonInstalled) || (bepinexInstalled && mscInstalled) || (melonInstalled && mscInstalled) ) {
        deconflictModLoaders(context.api, spec); //deconflict if multiple mod loaders are installed
      }
      if (bepinexInstalled && allowBepCfgMan) {
        downloadBepCfgMan(context.api, spec); //download BepInExConfigManager
      } //*/
      if (melonInstalled && allowMelPrefMan) {
        downloadMelonPrefMan(context.api, spec); //download MelonPreferencesManager
      } //*/
      if (mscInstalled) { //check for condition if MSC Installer mod is installed, but not installed to the game folder
        checkMscInstalled(context.api, spec); //check if user has run installer and notify if not
      }
      return Promise.resolve();
    });
    context.api.onAsync('did-purge', async (profileId) => { 
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      bepinexInstalled = isBepinexInstalled(context.api, spec);
      melonInstalled = isMelonInstalled(context.api, spec);
      mscInstalled = checkMscInstalled(context.api, spec); //game folder file check
      if (mscInstalled) {
        await removeMscFiles(context.api, spec); //delete installed MSC files to clean game folder
      }
      mscInstalled = isMscInstalled(context.api, spec); //check if MSC Installer mod is installed in Vortex
      /*if (mscInstalled) {
        mscInstallerNotify(context.api); //notify user if MSC Installer mod is installed but not installed to the game folder
      } //*/
      if (!bepinexInstalled && !melonInstalled && !mscInstalled) {
        chooseModLoader(context.api, spec);
      }
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

// Test if MSCLoader is installed
function isMscInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  const idTest = Object.keys(mods).some(id => mods[id]?.type === MSCLOADER_ID);
  GAME_PATH = getDiscoveryPath(api);
  let fileTest = false;
  try {
    fs.statSync(path.join(GAME_PATH, MSCLOADER_MARKER_PATH));
    fileTest = true;
  } catch (err) {
    fileTest = false;
  }
  return (idTest || fileTest);
}

// Test if MSCLoader installer was run (marker file exists)
function checkMscInstalled(api, spec) {
  GAME_PATH = getDiscoveryPath(api);
  let fileTest = false;
  try {
    fs.statSync(path.join(GAME_PATH, MSCLOADER_MARKER_PATH));
    fileTest = true;
  } catch (err) {
    mscInstallerNotify(api);
    fileTest = false;
  }
  return fileTest;
}
//Notify user to run MSCLoader Installer if marker file not found
function mscInstallerNotify(api) {
  const NOTIF_ID = `${GAME_ID}-mscinstaller`;
  const MOD_NAME = MSCLOADER_NAME;
  const MESSAGE = `Run ${MOD_NAME} Installer`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: `Run ${MOD_NAME}`,
        action: (dismiss) => {
          runMsc(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `\n`
                + `You must run the ${MOD_NAME} installer to install necessary files to the game folder.\n`
                + `Use the default installation options for compatibility with Vortex.\n`
                /*+ `\n`
                + `IMPORTANT: Due to some unsavory programming in MSCLoader (not mine!), you must temporarily delete the "BepInEx" and "Plugins" folders in your game folder before running the MSCLoader installer.\n`
                + `Otherwise, the installer will throw an error and refuse to proceed. After the installer is finished, restart Vortex, otherwise you won't be able to deploy mods.\n`
                + `This is necessary because I did not want to take away the freedom to use BepInEx and MelonLoader, if you prefer them.\n`
                + `\n`
                + `You can use the buttons within the folder icon on the Mods page toolbar to quickly delete the folders and another button to restore them after the installer is finished.\n`//*/
                + `\n`
                + `Use the included tool to launch ${MOD_NAME} installer (button on this notification or in "Dashboard" tab).\n`
          }, [
            {
              label: `Run ${MOD_NAME}`, action: () => {
                runMsc(api);
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
function runMsc(api) {
  const TOOL_ID = MSCLOADER_ID;
  const TOOL_NAME = `${MSCLOADER_NAME} Installer`;
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
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err, { allowReport: false });
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
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err, { allowReport: false });
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//* Function to auto-download MSCLoader from Nexus Mods
async function downloadMsc(api, gameSpec) {
  let isInstalled = isMscInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MSCLOADER_NAME;
    const MOD_TYPE = MSCLOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = MSCLOADER_PAGE_NO;
    const FILE_ID = MSCLOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = MSCLOADER_DOMAIN;
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
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err, { allowReport: false });
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
      /*
      try { //run MSCLoader installer
        GAME_PATH = getDiscoveryPath(api);
        const executable = path.join(GAME_PATH, MSCLOADER_FOLDER, MSCLOADER_EXEC);
        api.runExecutable(executable, [], { suggestDeploy: false });
      } catch (err) {
        api.showErrorNotification(`Failed to run ${MOD_NAME} installer. You must run it manually.`, err, { allowReport: false });
      } //*/
    }
  }
} //*/

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
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err, { allowReport: false });
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
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err, { allowReport: false });
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
