/*///////////////////////////////////////////
Name: Red Dead Redemption 2 Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 1.1.0
Date: 2026-11-20
Notes:
-
///////////////////////////////////////////*/

//Import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log, VortexError } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const { parseStringPromise } = require("xml2js");
const winapi = require("winapi-bindings");

/*const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow'); //*/
const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "reddeadredemption2";
const STEAMAPP_ID = "1174180";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = "Heather";
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = "Game";
const XBOX_PUB_ID = "XXX"; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const INSTALL_HIVE = "HKEY_LOCAL_MACHINE"; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\Rockstar Games\\Red Dead Redemption 2`; //for finding install in registry - requires winapi-bindings
const INSTALL_VALUE = "InstallFolder"; //often InstallDir or InstallPath
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "Red Dead Redemption 2";
const GAME_NAME_SHORT = "RDR2";
const BINARIES_PATH = path.join(".");
const EXEC_NAME = "RDR2.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const EXEC_EGS = EXEC; //change other versions if different than Steam/default
const EXEC_GOG = EXEC;
const EXEC_DEMO = EXEC;
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Red_Dead_Redemption_2";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/2627"; //Nexus link to this extension. Used for links

//feature toggles
let hasXbox = false; //toggle for Xbox version logic
if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;
const multiExe = false; //set to true if there are multiple executable names
const multiModPath = false; //set to true if there are multiple possible mod paths (i.e. different path for Xbox version)
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const needsModInstaller = true; //set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing
const rootInstaller = true; //enable root installer. Set false if you need to avoid installer collisions
const saveInstaller = false; //enable save installer. Set false if path is outside of game folder
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const hasUserIdFolder = true; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
let binariesInstaller = false;
if (BINARIES_PATH !== ".") binariesInstaller = true; //only enable Binaries installer if not in root
const rdr2modsBrowser = true; //true to add a sidebar page for browsing and installing mods from rdr2mods.com
const debug = false; //toggle for debug mode

//info for modtypes, installers, tools, and actions
const DATA_FOLDER = "x64";
let ROOT_FOLDERS = [DATA_FOLDER, "lml", "RampageFiles", "reshade-shaders"]; //RampageFiles = Rampage Trainer add-ons
if (BINARIES_PATH !== ".") ROOT_FOLDERS.push(BINARIES_PATH.split(path.sep)[0]);
const ROOTSUB_FOLDERS = [];
const ROOTSUB_PATH = DATA_FOLDER;

const CONFIGMOD_LOCATION = DOCUMENTS;
const SAVEMOD_LOCATION = DOCUMENTS;
const APPDATA_FOLDER = path.join("Rockstar Games", "Red Dead Redemption 2");
const CONFIG_FOLDERNAME = "Settings";
const SAVE_FOLDERNAME = "Profiles";

let GAME_PATH = "";
let GAME_VERSION = "";
let STAGING_FOLDER = "";
let DOWNLOAD_FOLDER = "";
const APPMANIFEST_FILE = "appxmanifest.xml";
const EXEC_XBOX = "gamelaunchhelper.exe";

const STEAM_FILE = "steam_api64.dll";
const GOG_FILE = "Galaxy64.dll";
const EPIC_FILE = "EOSSDK-Win64-Shipping.dll";
const RS_FILE = "uninstall.exe"; //Rockstar Games Launcher install
const XBOX_FILE = APPMANIFEST_FILE;

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "LML Mod";
const MOD_PATH = "lml";
const MOD_PATH_XBOX = MOD_PATH;
const MOD_FILES = ["install.xml"];
const MOD_SHARED_FOLDERS = ["replace", "stream"]; //folders LML reads directly from "lml", shared by every mod without an install.xml
const STREAM_FOLDER = "stream"; //loose streaming assets without an install.xml go here
const STREAM_EXTS = [".ytd", ".ydd", ".yft", ".ydr", ".ymt", ".ybn", ".ycd"]; //assets LML streams by file name
const DOC_EXTS = [
  ".txt",
  ".md",
  ".pdf",
  ".rtf",
  ".html",
  ".htm",
  ".url",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".jfif",
]; //readmes and preview images, never installed by the stream and add-on installers

//Add-ons for another mod on the same Nexus page (translations, compatibility files) - installed into the folder where that mod holds the same file
const ADDON_ID = `${GAME_ID}-addon`; //installer id only - the add-on takes its parent mod's type
const VARIANT_ID = `${GAME_ID}-variant`; //installer id only - archives in several parts (alternatives, optional patches), each chosen part takes the type its own installer gives
const ADDON_BLOCK_EXTS = [".asi", ".dll", ".exe"]; //an archive carrying these is a main file or an update, never an add-on
const NEXUS_FILENAME_PATTERNS = [
  /^.*?-(\d+)-.*-\d{9,11}\.[^.]+$/, //Name-<modId>-<version>-<timestamp>.ext
  / (\d+) \S+ \d{4}-\d{2}-\d{2}T\d{2}-\d{2}Z \w+\.[^.]+$/, //Name <modId> <version> <date> <id>.ext
];
const MOD_EXTS = [
  ".ytd",
  ".ydr",
  ".ydd",
  ".yft",
  ".ymt",
  ".ymap",
  ".ytyp",
  ".ybn",
  ".awc",
  ".meta",
  ".ymf",
  ".yld",
  ".gxt2",
];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const MODLOADER_ID = `${GAME_ID}-modloader`;
const MODLOADER_NAME = "Lenny's Mod Loader";
const MODLOADER_FILES = ["vfs.asi"];
const MODMANAGER_ID = `${GAME_ID}-lmlmodmanager`; //tool id
const MODMANAGER_NAME = "LML Mod Manager";
const MODMANAGER_FOLDER = "ModManager"; //kept in its own folder - it ships its own NLog.dll, which would clash with the loader's
const MODMANAGER_EXEC = path.join(MODMANAGER_FOLDER, "ModManager.UI.exe");
const MODMANAGER_FILES = ["modmanager.ui.exe"];

const SCRIPTHOOK_ID = `${GAME_ID}-scripthook`;
const SCRIPTHOOK_NAME = "ScriptHookRDR2";
const SCRIPTHOOK_DLL = "ScriptHookRDR2.dll";
const SCRIPTHOOK_FILES = ["scripthookrdr2.dll"];
const SCRIPTHOOK_SKIP_FOLDERS = ["sdk"]; //developer files, not needed in the game folder

const ASILOADER_ID = `${GAME_ID}-asiloader`;
const ASILOADER_NAME = "ASI Loader";
const ASILOADER_DLL = "dinput8.dll";
const ASILOADER_FILES = ["dinput8.dll", "version.dll"]; //ScriptHookRDR2's loader, Ultimate ASI Loader

//ScriptHookRDR2 V2 - Nexus page with two separate main files, the hook itself and its "Mod Loader" (dinput8.dll ASI loader)
const {
  download,
  findModByFile,
  resolveVersionByModVersion,
  testRequirementVersion,
} = require("./downloader");
const SCRIPTHOOK_PAGE_NO = 1472;
const SCRIPTHOOK_DOMAIN = GAME_ID;
const SCRIPTHOOK_V2_NAME = "ScriptHookRDR2 V2";
const SCRIPTHOOK_REQUIREMENTS = [
  {
    archiveFileName: SCRIPTHOOK_DLL, //notification id only on this route
    userFacingName: SCRIPTHOOK_V2_NAME,
    nexusModId: SCRIPTHOOK_PAGE_NO, //presence of this switches the requirement to the Nexus route
    nexusDomain: SCRIPTHOOK_DOMAIN,
    nexusFileMatch: "ScriptHookRDR2 V2",
    modType: SCRIPTHOOK_ID,
    assemblyFileName: SCRIPTHOOK_DLL,
    presenceFiles: SCRIPTHOOK_FILES, //any of these already installed counts as present (checkScriptHook)
    findMod: (api) => findModByFile(api, SCRIPTHOOK_ID, SCRIPTHOOK_DLL),
    resolveVersion: (api) => resolveVersionByModVersion(api, SCRIPTHOOK_REQUIREMENTS[0]),
  },
  {
    archiveFileName: ASILOADER_DLL, //notification id only on this route
    userFacingName: `${SCRIPTHOOK_V2_NAME} Mod Loader`,
    nexusModId: SCRIPTHOOK_PAGE_NO,
    nexusDomain: SCRIPTHOOK_DOMAIN,
    nexusFileMatch: "Mod Loader",
    modType: ASILOADER_ID,
    assemblyFileName: ASILOADER_DLL,
    presenceFiles: ASILOADER_FILES, //a second ASI loader would load every plugin twice
    findMod: (api) => findModByFile(api, ASILOADER_ID, ASILOADER_DLL),
    resolveVersion: (api) => resolveVersionByModVersion(api, SCRIPTHOOK_REQUIREMENTS[1]),
  },
];

const ASIPLUGIN_ID = `${GAME_ID}-asiplugin`;
const ASIPLUGIN_NAME = "ASI Plugin";
const ASIPLUGIN_EXTS = [".asi"];

//ScriptHookRDR2 .NET scripts - same mod type id as the official extension, so .NET mods installed with it keep their type
const DOTNET_ID = `${GAME_ID}dotnet`;
const DOTNET_NAME = ".NET Script";
const DOTNET_PATH = "scripts";
const DOTNET_SOURCE_EXTS = [".cs", ".vb"]; //scripts the runtime compiles itself
const DOTNET_DLL_EXTS = [".dll"]; //compiled scripts - only .NET assemblies, a native .dll is not a script
const DOTNET_BLOCK_EXTS = [".exe"]; //a standalone tool ships .NET .dll files too, but never belongs in "scripts"
//Community ScriptHookRDR2 .NET - the runtime every .NET script needs, an ASI plugin in the game folder
const DOTNET_RUNTIME_PAGE_NO = 70;
const DOTNET_RUNTIME_NAME = "ScriptHookRDR2 .NET";
const DOTNET_RUNTIME_ASI = "ScriptHookRDRDotNet.asi";
const DOTNET_RUNTIME_FILES = ["scripthookrdrdotnet.asi", "scripthookrdrnetapi.dll"];
const DOTNET_RUNTIME_REQUIREMENT = {
  archiveFileName: DOTNET_RUNTIME_ASI, //notification id only on this route
  userFacingName: DOTNET_RUNTIME_NAME,
  nexusModId: DOTNET_RUNTIME_PAGE_NO,
  nexusDomain: GAME_ID,
  nexusFileMatch: "ScriptHookRDR2DotNet",
  modType: ASIPLUGIN_ID,
  assemblyFileName: DOTNET_RUNTIME_ASI,
  presenceFiles: DOTNET_RUNTIME_FILES,
  findMod: (api) => findModByFile(api, ASIPLUGIN_ID, DOTNET_RUNTIME_ASI),
  resolveVersion: (api) => resolveVersionByModVersion(api, DOTNET_RUNTIME_REQUIREMENT),
};

//mod types of the official Nexus Mods "Red Dead Redemption 2 Support" extension - kept registered so mods installed with it still deploy and purge where they did
const LEGACY_ASI_ID = `${GAME_ID}asi`;
const LEGACY_ASI_NAME = "ASI (Official Extension)";
const LEGACY_DLC_ID = `${GAME_ID}dlc`;
const LEGACY_DLC_NAME = "DLC Pack (OpenIV)";
const LEGACY_DLC_PATH = path.join("mods", "x64", "dlcpacks");
const LEGACY_MODTYPES = [
  { id: LEGACY_ASI_ID, name: LEGACY_ASI_NAME, targetPath: "{gamePath}" },
  {
    id: DOTNET_ID,
    name: DOTNET_NAME,
    targetPath: path.join("{gamePath}", DOTNET_PATH),
  },
  {
    id: LEGACY_DLC_ID,
    name: LEGACY_DLC_NAME,
    targetPath: path.join("{gamePath}", LEGACY_DLC_PATH),
  },
];
const LEGACY_MOD_PATH = path.join("mods", "source", "content"); //default mod folder of the official extension
const LEGACY_MANIFEST_FILE = "vortex.deployment.json";

const OFFICIAL_EXT_MOD_ID = 68; //Nexus Mods page of the official "Red Dead Redemption 2 Support" extension
const OFFICIAL_EXT_NAME = "Red Dead Redemption 2 Support";
const OPENIV_ID = "OpenIV"; //same tool id as the official extension, so a user's tool settings carry over
const OPENIV_NAME = "OpenIV";
const OPENIV_PATH = path.join(LOCALAPPDATA, "New Technology Studio", "Apps", "OpenIV");
const OPENIV_EXEC = "OpenIV.exe";
const OPENIV_PARAMETERS = ["-core.game:rdr2"];

//razedmods.com downloads - optional, only installed from the toolbar button
const { downloadRazedMods, checkForRazedModsUpdate } = require("./razedmods_downloader");
const VISUALREDEMPTION_NAME = "Visual Redemption";
const VISUALREDEMPTION_ALIAS_URL = "https://downloads.razedmods.com/rdr2";
const VISUALREDEMPTION_URL_ERR = "https://razedmods.com/rdr2";
const RAZEDMODS_REQUIREMENTS = [
  {
    aliasUrl: VISUALREDEMPTION_ALIAS_URL,
    userFacingName: VISUALREDEMPTION_NAME,
    pageUrl: VISUALREDEMPTION_URL_ERR,
    autoInstall: false, //never installed unattended - the update check only runs once the user installed it
  },
];

//rdr2mods.com browse page - needs rdr2mods_browser.js and base_browser.js beside this file
const {
  registerRdr2ModsBrowser,
  onceRdr2ModsBrowser,
  openRdr2ModsFilePage,
} = require("./rdr2mods_browser");
const RDR2MODS_BROWSER_CONFIG = {
  pageTitle: "Browse RDR2Mods",
};
const MODLOADER_BROWSE_KEY = "rdr2/tools/76-lennys-mod-loader-rdr"; //Lenny's Mod Loader page on rdr2mods.com - the only place it is published

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
const BINARIES_EXTS = [".exe", ".dll", ".asi", ".addon64"];

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
const SAVE_FOLDER_XBOX = path.join(
  LOCALAPPDATA,
  "Packages",
  `${XBOXAPP_ID}_${XBOX_PUB_ID}`,
  "SystemAppData",
  "wgs",
);
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
const SAVE_EXTS = [];
const SAVE_FILES = [];
const SAVE_STRINGS = ["srdr3"]; //save slots (SRDR30000 to SRDR30015) and their .bak copies, matched by name prefix in lower case
let CHECK_CONFIG = undefined; //true when Documents is on the same drive as the game and the staging folder - hardlinks cannot cross drives
let CHECK_SAVE = undefined;

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
let CONFIG_PATH = path.join(CONFIGMOD_LOCATION, APPDATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_PATH_XBOX = CONFIG_PATH; //XBOX Version
const CONFIG_EXTS = [];
const CONFIG_FILES = ["system.xml"];

/* tool info (i.e. save editor)
const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = "XXX";
const TOOL_EXEC_FOLDER = path.join('XXX');
const TOOL_EXEC = path.join("XXX", "XXX.exe");
const TOOL_EXEC_PATH = path.join(TOOL_EXEC_FOLDER, TOOL_EXEC);
//*/

let MOD_PATH_DEFAULT = "."; //mods without a mod type deploy to the game folder, not "lml"
//if (!needsModInstaller) MOD_PATH_DEFAULT = '.';
let REQ_FILE = EXEC;
if (multiExe) REQ_FILE = DATA_FOLDER;
const PARAMETERS_STRING = "-scOfflineOnly"; //keeps the game out of Red Dead Online while mods are loaded
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [BINARIES_PATH, DOTNET_PATH, LEGACY_DLC_PATH];
if (needsModInstaller) MODTYPE_FOLDERS.push(MOD_PATH);
if (saveInstaller) MODTYPE_FOLDERS.push(SAVE_PATH);
const IGNORE_CONFLICTS = [
  path.join("**", "CHANGELOG.md"),
  path.join("**", "readme.txt"),
  path.join("**", "README.txt"),
  path.join("**", "ReadMe.txt"),
  path.join("**", "Readme.txt"),
  path.join("**", "license!(*.*)"),
  path.join("**", "license*.{txt,md,rtf,pdf,html,htm}"),
];
const IGNORE_DEPLOY = [
  path.join("**", "CHANGELOG.md"),
  path.join("**", "readme.txt"),
  path.join("**", "README.txt"),
  path.join("**", "ReadMe.txt"),
  path.join("**", "Readme.txt"),
  path.join("**", "license!(*.*)"),
  path.join("**", "license*.{txt,md,rtf,pdf,html,htm}"),
];

//filled in from data above
const spec = {
  game: {
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME_SHORT,
    parameters: PARAMETERS,
    logo: `${GAME_ID}.jpg`,
    mergeMods: true,
    requiresCleanup: true,
    requiredFiles: [REQ_FILE],
    compatible: {
      dinput: false,
      enb: false,
    },
    details: {
      steamAppId: +STEAMAPP_ID,
      gogAppId: GOGAPP_ID,
      epicAppId: EPICAPP_ID,
      xboxAppId: XBOXAPP_ID,
      supportsSymlinks: allowSymlinks,
      ignoreConflicts: IGNORE_CONFLICTS,
      ignoreDeploy: IGNORE_DEPLOY,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
      GogAPPId: GOGAPP_ID,
      EpicAPPId: EPICAPP_ID,
      XboxAPPId: XBOXAPP_ID,
    },
  },
  modTypes: [
    {
      id: ROOT_ID,
      name: ROOT_NAME,
      priority: "high",
      targetPath: `{gamePath}`,
    },
    {
      id: MODLOADER_ID,
      name: MODLOADER_NAME,
      priority: "high",
      targetPath: `{gamePath}`,
    },
    {
      id: SCRIPTHOOK_ID,
      name: SCRIPTHOOK_NAME,
      priority: "high",
      targetPath: `{gamePath}`,
    },
    {
      id: ASILOADER_ID,
      name: ASILOADER_NAME,
      priority: "high",
      targetPath: `{gamePath}`,
    },
    {
      id: ASIPLUGIN_ID,
      name: ASIPLUGIN_NAME,
      priority: "high",
      targetPath: `{gamePath}`,
    },
  ],
  discovery: {
    ids: DISCOVERY_IDS_ACTIVE,
    names: [],
  },
};
//? think of a way to tell if the mod path is not in the game folder, only add ROOT modType if it is
if (needsModInstaller) {
  spec.modTypes.push({
    id: MOD_ID,
    name: MOD_NAME,
    priority: "high",
    targetPath: path.join("{gamePath}", MOD_PATH),
  });
}
if (saveInstaller) {
  spec.modTypes.push({
    id: SAVE_ID,
    name: SAVE_NAME,
    priority: "high",
    targetPath: path.join("{gamePath}", SAVE_PATH),
  });
}

//3rd party tools and launchers
const tools = [
  //accepts: exe, jar, py, vbs, bat
  {
    id: `${GAME_ID}-customlaunch`,
    name: "Custom Launch",
    logo: "exec.png",
    executable: () => EXEC,
    requiredFiles: [EXEC],
    relative: true,
    exclusive: true,
    shell: true,
    detach: true,
    //defaultPrimary: true,
    parameters: PARAMETERS,
  }, //*/
  {
    id: OPENIV_ID,
    name: OPENIV_NAME,
    queryPath: () => OPENIV_PATH,
    executable: () => OPENIV_EXEC,
    requiredFiles: [OPENIV_EXEC],
    relative: false,
    detach: true,
    parameters: OPENIV_PARAMETERS,
  }, //*/
  {
    id: MODMANAGER_ID,
    name: MODMANAGER_NAME,
    logo: "lml.png",
    executable: () => MODMANAGER_EXEC,
    requiredFiles: [MODMANAGER_EXEC],
    relative: true,
    exclusive: true,
  }, //*/
  /*{
    id: `${GAME_ID}-customlaunchxbox`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC_XBOX,
    requiredFiles: [
      EXEC_XBOX,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
  /*{
    id: TOOL_ID,
    name: TOOL_NAME,
    logo: 'tool.png',
    //queryPath: () => TOOL_EXEC_FOLDER,
    executable: () => TOOL_EXEC,
    requiredFiles: [
      TOOL_EXEC,
    ],
    relative: true,
    exclusive: true,
    //shell: true,
    //defaultPrimary: true,
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
  } catch {
    return false;
  }
}
async function statCheckAsync(gamePath, file) {
  try {
    await fsp.stat(path.join(gamePath, file));
    return true;
  } catch {
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
      gamePath:
        (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0
          ? void 0
          : _a.path,
      documents: util.getVortexPath("documents"),
      localAppData: util.getVortexPath("localAppData"),
      appData: util.getVortexPath("appData"),
    });
  } catch (err) {
    //this happens if the executable comes back as "undefined", usually caused by the Xbox app locking down the folder
    api.showErrorNotification(
      "Failed to locate executable. Please launch the game at least once.",
      err,
    );
  }
}

//* Get mod path dynamically for different game versions
function getModPath(discoveryPath) {
  if (!multiModPath) {
    return () => MOD_PATH_DEFAULT;
  }
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    GAME_VERSION = "xbox";
    return () => MOD_PATH_XBOX;
  }
  //add GOG/EGS/Demo versions here if needed
  GAME_VERSION = "default";
  return () => MOD_PATH_DEFAULT;
} //*/

//Find game installation directory
function makeFindGame(api, gameSpec) {
  //using registry - requires winapi-bindings
  try {
    const instPath = winapi.RegGetValue(INSTALL_HIVE, INSTALL_KEY, INSTALL_VALUE);
    if (!instPath) {
      throw new Error("empty registry key");
    }
    return () => Promise.resolve(instPath.value);
  } catch {
    return () =>
      util.GameStoreHelper.findByAppId(gameSpec.discovery.ids).then((game) => game.gamePath);
  }
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === "steam") {
    return Promise.resolve({
      launcher: "steam",
      addInfo: {
        appId: STEAMAPP_ID,
        parameters: PARAMETERS, //Steam only passes launch parameters given here, not the game's own
      },
    });
  } //*/
  if (store === "xbox" && DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) {
    return Promise.resolve({
      launcher: "xbox",
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
        //parameters: [{ appExecName: XBOXEXECNAME }, PARAMETERS_STRING],
        //launchType: 'gamestore',
      },
    });
  } //*/
  if (store === "epic" && DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID)) {
    return Promise.resolve({
      launcher: "epic",
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
    GAME_VERSION = "xbox";
    SAVE_PATH = SAVE_PATH_XBOX;
    CONFIG_PATH = CONFIG_PATH_XBOX;
    return EXEC_XBOX;
  }
  //add GOG/EGS/Demo versions here if needed
  GAME_VERSION = "default";
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (!multiExe && !hasXbox) {
    //same executable on every store, so tell them apart by store marker file
    if (await statCheckAsync(gamePath, STEAM_FILE)) {
      GAME_VERSION = "steam";
    } else if (await statCheckAsync(gamePath, RS_FILE)) {
      GAME_VERSION = "rockstar";
    } else if (await statCheckAsync(gamePath, EPIC_FILE)) {
      GAME_VERSION = "epic";
    } else {
      GAME_VERSION = "default";
    }
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, EXEC_XBOX)) {
    GAME_VERSION = "xbox";
    SAVE_PATH = SAVE_PATH_XBOX;
    CONFIG_PATH = CONFIG_PATH_XBOX;
    return GAME_VERSION;
  } else {
    GAME_VERSION = "default";
    return GAME_VERSION;
  }
}

async function getAllFiles(dirPath) {
  let results = [];
  try {
    const entries = await fsp.readdir(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fsp.stat(fullPath);
      if (stats.isDirectory()) {
        // Recursively get files from subdirectories
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else {
        // Add file to results
        results.push(fullPath);
      }
    }
  } catch (err) {
    log("warn", `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

const getDiscoveryPath = (api) => {
  //get the game's discovered path
  const state = api.getState();
  const discovery = state?.settings?.gameMode?.discovered?.[GAME_ID] ?? {};
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  //useful to clear out mods prior to doing some action
  return new Promise((resolve, reject) =>
    api.events.emit("purge-mods", true, (err) => (err ? reject(err) : resolve())),
  );
}
async function deploy(api) {
  //useful to deploy mods after doing some action
  return new Promise((resolve, reject) =>
    api.events.emit("deploy-mods", (err) => (err ? reject(err) : resolve())),
  );
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Pick the match closest to the archive root
function shallowestFile(files, predicate) {
  return files
    .filter((file) => !file.endsWith(path.sep) && predicate(file))
    .sort((lhs, rhs) => lhs.split(path.sep).length - rhs.split(path.sep).length)[0];
}

//Copy everything in the marker file's folder (wrapper folders stripped, sibling files and folders kept)
function installFromMarkerFolder(files, modFile, modType, skipFolders = []) {
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: modType };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => {
    if (file.endsWith(path.sep) || !file.startsWith(rootPrefix)) return false;
    const relParts = file.slice(rootPrefix.length).split(path.sep);
    return !(relParts.length > 1 && skipFolders.includes(relParts[0].toLowerCase()));
  });
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: file.slice(rootPrefix.length),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Nexus mod id of the archive being installed: from its download's metadata, else from the Nexus file name
function archiveNexusModId(api, archivePath) {
  if (!archivePath) return undefined;
  const fileName = path.basename(archivePath);
  const downloads = api.getState().persistent?.downloads?.files ?? {};
  const download = Object.values(downloads).find(
    (dl) =>
      dl?.localPath !== undefined &&
      path.basename(dl.localPath).toLowerCase() === fileName.toLowerCase(),
  );
  const nexusId = download?.modInfo?.nexus?.ids?.modId;
  if (nexusId !== undefined) return String(nexusId);
  for (const pattern of NEXUS_FILENAME_PATTERNS) {
    const match = pattern.exec(fileName);
    if (match) return match[1];
  }
  return undefined;
}

//The parent mod's file an add-on file replaces: same relative path, else the only file with that name
function matchParentFile(parentFiles, file) {
  const needle = file.toLowerCase();
  const samePath = parentFiles.find((parentFile) => {
    const lower = parentFile.toLowerCase();
    return lower === needle || lower.endsWith(path.sep + needle);
  });
  if (samePath !== undefined) return samePath;
  const name = path.basename(needle);
  const sameName = parentFiles.filter(
    (parentFile) => path.basename(parentFile).toLowerCase() === name,
  );
  return sameName.length === 1 ? sameName[0] : undefined;
}

//An add-on archive (translation, compatibility file) for a mod from the same Nexus page that is already installed:
//returns that mod and, for each add-on file, the path where the mod holds the file it replaces
async function findAddonTargets(api, files, archivePath) {
  const assets = files.filter(
    (file) => !file.endsWith(path.sep) && !DOC_EXTS.includes(path.extname(file).toLowerCase()),
  );
  if (assets.length === 0) return undefined;
  const isMainFile = assets.some(
    (file) =>
      ADDON_BLOCK_EXTS.includes(path.extname(file).toLowerCase()) ||
      MOD_FILES.includes(path.basename(file).toLowerCase()),
  );
  if (isMainFile) return undefined;
  const nexusId = archiveNexusModId(api, archivePath);
  if (nexusId === undefined) return undefined;
  const state = api.getState();
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  const parents = Object.values(state.persistent.mods[GAME_ID] || {}).filter(
    (mod) => mod.state === "installed" && String(mod.attributes?.modId) === nexusId,
  );
  for (const parent of parents) {
    const parentPath = path.join(stagingPath, parent.installationPath);
    const parentFiles = (await getAllFiles(parentPath)).map((file) =>
      path.relative(parentPath, file),
    );
    const targets = {};
    for (const asset of assets) {
      const target = matchParentFile(parentFiles, asset);
      if (target === undefined) break;
      targets[asset] = target;
    }
    if (Object.keys(targets).length === assets.length) return { parent, targets };
  }
  return undefined;
}

//Test for an add-on to an installed mod from the same Nexus page
async function testAddon(api, files, gameId, archivePath) {
  let supported = gameId === spec.game.id;
  // Test for a mod installer
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }
  if (supported) supported = (await findAddonTargets(api, files, archivePath)) !== undefined;
  return { supported, requiredFiles: [] };
}

//Install the add-on over its parent mod: same mod type, same paths, deployed after the parent so its files win
async function installAddon(api, files, archivePath) {
  const found = await findAddonTargets(api, files, archivePath);
  if (found === undefined) {
    throw new VortexError("The mod this add-on belongs to is no longer installed", {
      kind: "process-canceled",
    });
  }
  const { parent, targets } = found;
  const instructions = Object.entries(targets).map(([source, destination]) => ({
    type: "copy",
    source,
    destination,
  }));
  if (parent.type) instructions.push({ type: "setmodtype", value: parent.type });
  instructions.push({ type: "rule", rule: { type: "after", reference: { id: parent.id } } });
  return { instructions };
}

const isUnder = (file, root) =>
  root === "." || file.toLowerCase().startsWith(root.toLowerCase() + path.sep);

//Folder that a file makes installable on its own. nestable: the part carries its own "lml" (or "replace"/"stream")
//folder, so it can be an optional extra inside another part - a nested install.xml folder or plugin folder cannot.
function installRootOf(file, lmlFolders) {
  const parts = file.split(path.sep);
  const dirs = parts.slice(0, -1).map((folder) => folder.toLowerCase());
  const join = (count) => (count === 0 ? "." : parts.slice(0, count).join(path.sep));
  const lmlIdx = dirs.indexOf(MOD_PATH);
  if (lmlIdx !== -1) return { root: join(lmlIdx), nestable: true };
  if (MOD_FILES.includes(parts[parts.length - 1].toLowerCase())) {
    return { root: join(Math.max(parts.length - 2, 0)), nestable: false }; //the folder holding the LML mod folder
  }
  //inside an LML mod folder, everything (its own "stream" folder, an .asi) belongs to that mod
  if (lmlFolders.some((folder) => isInFolder(file, folder))) return undefined;
  const sharedIdx = dirs.findIndex((folder) => MOD_SHARED_FOLDERS.includes(folder));
  if (sharedIdx !== -1) return { root: join(sharedIdx), nestable: true };
  const isCode =
    hasExt(file, ASIPLUGIN_EXTS) ||
    hasExt(file, DOTNET_DLL_EXTS) ||
    hasExt(file, DOTNET_SOURCE_EXTS);
  if (!isCode) return undefined;
  const scriptsIdx = dirs.indexOf(DOTNET_PATH);
  return { root: scriptsIdx === -1 ? path.dirname(file) : join(scriptsIdx), nestable: false };
}

//Folders holding a file whose name also sits in another folder - alternatives of one file (eye colours, horse coats,
//weapon presets). Each such folder is one alternative, nested ones included ("Options\Infinite Ammo\Express Buckshot").
function duplicateRoots(files) {
  const byName = new Map(); //file name => folders holding it
  files
    .filter(
      (file) => !file.endsWith(path.sep) && !DOC_EXTS.includes(path.extname(file).toLowerCase()),
    )
    .forEach((file) => {
      const name = path.basename(file).toLowerCase();
      const folders = byName.get(name) ?? new Map();
      folders.set(path.dirname(file).toLowerCase(), path.dirname(file));
      byName.set(name, folders);
    });
  const roots = new Map();
  [...byName.values()]
    .filter((folders) => folders.size > 1)
    .forEach((folders) => folders.forEach((folder, key) => roots.set(key, folder)));
  return [...roots.values()];
}

//Parts of an archive that each install on their own, when there is more than one - alternatives, or optional extras
function variantUnits(files) {
  if (
    files.some((file) =>
      [...MODLOADER_FILES, ...SCRIPTHOOK_FILES].includes(path.basename(file).toLowerCase()),
    )
  ) {
    return []; //frameworks have their own installers and keep only what they need
  }
  const lmlFolders = lmlModFolders(files);
  const found = new Map(); //root (lower case) => { root, nestable }
  files
    .filter((file) => !file.endsWith(path.sep))
    .forEach((file) => {
      const marker = installRootOf(file, lmlFolders);
      if (marker === undefined) return;
      const key = marker.root.toLowerCase();
      found.set(key, {
        root: marker.root,
        nestable: (found.get(key)?.nestable ?? false) || marker.nestable,
      });
    });
  let roots = [...found.values()];
  //a part inside another part belongs to it (a plugin's examples, a wrapped LML mod folder), unless it is nestable
  roots = roots.filter(
    (entry) =>
      entry.nestable || !roots.some((other) => other !== entry && isUnder(entry.root, other.root)),
  );
  let rootPaths = roots.map((entry) => entry.root);
  if (rootPaths.length === 0) rootPaths = duplicateRoots(files);
  if (rootPaths.length < 2) return [];
  //every file goes to the deepest unit it sits in; files outside all units are left out
  const deepestRoot = (file) =>
    rootPaths
      .filter((root) => isUnder(file, root) && file.toLowerCase() !== root.toLowerCase() + path.sep)
      .sort((lhs, rhs) => rhs.length - lhs.length)[0];
  const units = rootPaths
    .sort((lhs, rhs) => (lhs === "." ? -1 : rhs === "." ? 1 : lhs.localeCompare(rhs)))
    .map((root) => ({ root, files: files.filter((file) => deepestRoot(file) === root) }))
    .filter((unit) => unit.files.some((file) => !file.endsWith(path.sep)));
  return units.length < 2 ? [] : units;
}

//Test for an archive holding several parts that each install on their own
function testVariant(files, gameId) {
  let supported = gameId === spec.game.id;
  // Test for a mod installer
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }
  if (supported) supported = variantUnits(files).length > 0;
  return Promise.resolve({ supported, requiredFiles: [] });
}

//The installers a chosen part goes through, in priority order - everything but this one
function partInstallers(api, destinationPath, archivePath) {
  return [
    [
      (files) => testAddon(api, files, GAME_ID, archivePath),
      (files) => installAddon(api, files, archivePath),
    ],
    [testModLoader, installModLoader],
    [testScriptHook, installScriptHook],
    rootInstaller && [testRoot, installRoot],
    [testAsiLoader, installAsiLoader],
    binariesInstaller && [testBinaries, installBinaries],
    [testAsiPlugin, installAsiPlugin],
    [testDotNet, (files) => installDotNet(api, files, destinationPath)],
    needsModInstaller && [testMod, (files) => installMod(api, files, destinationPath)],
    [(files) => testConfig(api, files, GAME_ID), (files) => installConfig(api, files)],
    [(files) => testSave(api, files, GAME_ID), (files) => installSave(api, files)],
    [testFallback, (files) => installFallback(api, files, destinationPath)],
  ].filter(Boolean);
}

//Folder inside the game folder that each mod type deploys to - used to merge parts of different types into one mod
const PART_TYPE_FOLDERS = {
  [MOD_ID]: MOD_PATH,
  [DOTNET_ID]: DOTNET_PATH,
  [ROOT_ID]: "",
  [MODLOADER_ID]: "",
  [SCRIPTHOOK_ID]: "",
  [ASILOADER_ID]: "",
  [ASIPLUGIN_ID]: "",
};

//Ask which parts to install (unattended installs take the default), run each through the installers, merge into one mod
async function installVariant(api, files, destinationPath, unattended, archivePath) {
  const units = variantUnits(files);
  const defaults = units.map((unit, idx) =>
    units[0].root === "." ? unit.root === "." : idx === 0,
  );
  let chosen = units.filter((unit, idx) => defaults[idx]);
  if (unattended !== true) {
    const result = await api.showDialog(
      "question",
      "Choose What to Install",
      {
        text:
          "This mod comes in several parts that each install on their own - alternative versions, " +
          "or optional extras such as compatibility patches. Read the mod's description, then tick " +
          "every part you want. (Reinstall the mod to change your choice.)",
        checkboxes: units.map((unit, idx) => ({
          id: `part${idx}`,
          text: unit.root === "." ? "Main files (top of the archive)" : unit.root,
          value: defaults[idx],
        })),
      },
      [{ label: "Cancel" }, { label: "Install" }],
    );
    //util.UserCanceled - Vortex only treats that class as a cancel when it comes from an installer (see cancelDocumentsInstall)
    if (result.action !== "Install") throw new util.UserCanceled(false);
    chosen = units.filter((unit, idx) => result.input?.[`part${idx}`] === true);
    if (chosen.length === 0) throw new util.UserCanceled(false); //nothing ticked counts as cancel
  }
  const installers = partInstallers(api, destinationPath, archivePath);
  const parts = [];
  for (const unit of chosen) {
    for (const [test, install] of installers) {
      if (!(await test(unit.files, GAME_ID)).supported) continue;
      const { instructions } = await install(unit.files);
      const type = instructions.filter((inst) => inst.type === "setmodtype").pop()?.value;
      parts.push({
        unit,
        type,
        instructions: instructions.filter((inst) => inst.type !== "setmodtype"),
      });
      break;
    }
  }
  const types = [...new Set(parts.map((part) => part.type))];
  let modType = types[0];
  if (types.length > 1) {
    //different mod types: one game folder mod, each part placed where its own type deploys
    const unplaceable = parts.filter(
      (part) => PART_TYPE_FOLDERS[part.type ?? ROOT_ID] === undefined,
    );
    unplaceable.forEach((part) =>
      log("warn", `Skipped "${part.unit.root}": its files deploy outside the game folder`),
    );
    parts
      .filter((part) => !unplaceable.includes(part))
      .forEach((part) => {
        const folder = PART_TYPE_FOLDERS[part.type ?? ROOT_ID];
        part.instructions = part.instructions.map((inst) =>
          inst.type === "copy"
            ? { ...inst, destination: path.join(folder, inst.destination) }
            : inst,
        );
      });
    parts.splice(0, parts.length, ...parts.filter((part) => !unplaceable.includes(part)));
    modType = ROOT_ID;
  }
  //a later part replaces an earlier part's file with the same destination (a patch over the main files)
  const copies = new Map();
  const others = [];
  parts.forEach((part) =>
    part.instructions.forEach((inst) => {
      if (inst.type === "copy") copies.set(inst.destination.toLowerCase(), inst);
      else others.push(inst);
    }),
  );
  const instructions = [...copies.values(), ...others];
  if (modType !== undefined) instructions.push({ type: "setmodtype", value: modType });
  return { instructions };
}

//Test for Lenny's Mod Loader files
function testModLoader(files, gameId) {
  const isMod = files.some((file) => MODLOADER_FILES.includes(path.basename(file).toLowerCase()));
  let supported = gameId === spec.game.id && isMod;

  // Test for a mod installer
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install Lenny's Mod Loader files, plus its Mod Manager app into a "ModManager" folder in the game folder
async function installModLoader(files) {
  const modFile = shallowestFile(files, (file) =>
    MODLOADER_FILES.includes(path.basename(file).toLowerCase()),
  );
  const { instructions } = await installFromMarkerFolder(files, modFile, MODLOADER_ID);
  const managerFile = shallowestFile(files, (file) =>
    MODMANAGER_FILES.includes(path.basename(file).toLowerCase()),
  );
  const managerPath = managerFile === undefined ? "." : path.dirname(managerFile);
  //only a Mod Manager in its own folder, never one sharing the loader's folder or the archive root
  if (managerPath !== "." && managerPath !== path.dirname(modFile)) {
    const managerPrefix = managerPath + path.sep;
    files
      .filter((file) => !file.endsWith(path.sep) && file.startsWith(managerPrefix))
      .forEach((file) =>
        instructions.push({
          type: "copy",
          source: file,
          destination: path.join(MODMANAGER_FOLDER, file.slice(managerPrefix.length)),
        }),
      );
  }
  return { instructions };
}

//Test for ScriptHookRDR2 files
function testScriptHook(files, gameId) {
  const isMod = files.some((file) => SCRIPTHOOK_FILES.includes(path.basename(file).toLowerCase()));
  let supported = gameId === spec.game.id && isMod;

  // Test for a mod installer
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install ScriptHookRDR2 files
function installScriptHook(files) {
  const modFile = shallowestFile(files, (file) =>
    SCRIPTHOOK_FILES.includes(path.basename(file).toLowerCase()),
  );
  return installFromMarkerFolder(files, modFile, SCRIPTHOOK_ID, SCRIPTHOOK_SKIP_FOLDERS);
}

//Test for a standalone ASI loader (dinput8.dll) - an archive that also carries .asi plugins is an ASI plugin mod instead
function testAsiLoader(files, gameId) {
  const isMod = files.some((file) => ASILOADER_FILES.includes(path.basename(file).toLowerCase()));
  const hasPlugin = files.some((file) => ASIPLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = gameId === spec.game.id && isMod && !hasPlugin;

  // Test for a mod installer
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install ASI loader files
function installAsiLoader(files) {
  const modFile = shallowestFile(files, (file) =>
    ASILOADER_FILES.includes(path.basename(file).toLowerCase()),
  );
  return installFromMarkerFolder(files, modFile, ASILOADER_ID);
}

//Folders holding an install.xml - each one is an LML mod
function lmlModFolders(files) {
  return [
    ...new Set(
      files
        .filter((file) => MOD_FILES.includes(path.basename(file).toLowerCase()))
        .map((file) => path.dirname(file)),
    ),
  ];
}

function isInFolder(file, folder) {
  return folder === "." || file.toLowerCase().startsWith(folder.toLowerCase() + path.sep);
}

//An .asi outside every LML mod folder - one inside belongs to that LML mod and stays with it
function isLooseAsi(file, lmlFolders) {
  return (
    ASIPLUGIN_EXTS.includes(path.extname(file).toLowerCase()) &&
    !lmlFolders.some((folder) => isInFolder(file, folder))
  );
}

//Test for ASI plugin files
function testAsiPlugin(files, gameId) {
  const lmlFolders = lmlModFolders(files);
  const isMod = files.some((file) => isLooseAsi(file, lmlFolders));
  let supported = gameId === spec.game.id && isMod;

  // Test for a mod installer
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install ASI plugin files. LML mod folders shipped beside the plugin without an "lml" wrapper go into "lml".
async function installAsiPlugin(files) {
  const lmlFolders = lmlModFolders(files);
  const modFile = shallowestFile(files, (file) => isLooseAsi(file, lmlFolders));
  if (lmlFolders.length === 0) {
    return installFromMarkerFolder(files, modFile, ASIPLUGIN_ID);
  }
  //game folder mod type, so one mod can place the plugin in the game folder and its LML folders in "lml"
  const outside = files.filter((file) => !lmlFolders.some((folder) => isInFolder(file, folder)));
  const { instructions } = await installFromMarkerFolder(outside, modFile, ROOT_ID);
  lmlFolders.forEach((folder) => {
    files
      .filter((file) => !file.endsWith(path.sep) && isInFolder(file, folder))
      .forEach((file) =>
        instructions.push({
          type: "copy",
          source: file,
          destination: path.join(MOD_PATH, path.basename(folder), file.slice(folder.length + 1)),
        }),
      );
  });
  return { instructions };
}

//True if the file is a .NET assembly: a PE file with a CLR runtime header
async function isManagedAssembly(filePath) {
  let handle;
  try {
    handle = await fsp.open(filePath, "r");
    const dos = Buffer.alloc(64);
    await handle.read(dos, 0, dos.length, 0);
    if (dos.readUInt16LE(0) !== 0x5a4d) return false; //"MZ"
    const pe = Buffer.alloc(264);
    const { bytesRead } = await handle.read(pe, 0, pe.length, dos.readUInt32LE(0x3c));
    if (bytesRead < 26 || pe.readUInt32LE(0) !== 0x4550) return false; //"PE\0\0"
    const optionalHeader = 24; //after the signature and the file header
    const isPe32Plus = pe.readUInt16LE(optionalHeader) === 0x20b;
    const directories = optionalHeader + (isPe32Plus ? 112 : 96);
    const CLR_DIRECTORY = 14;
    if (pe.readUInt32LE(directories - 4) <= CLR_DIRECTORY) return false; //directory count
    if (bytesRead < directories + (CLR_DIRECTORY + 1) * 8) return false;
    return pe.readUInt32LE(directories + CLR_DIRECTORY * 8) !== 0;
  } catch {
    return false;
  } finally {
    await handle?.close();
  }
}

const hasExt = (file, exts) => exts.includes(path.extname(file).toLowerCase());

//Test for ScriptHookRDR2 .NET scripts. Whether a .dll is a .NET assembly is only known once the files can be read,
//so installDotNet hands archives without one to the fallback installer.
function testDotNet(files, gameId) {
  const isMod = files.some(
    (file) => hasExt(file, DOTNET_SOURCE_EXTS) || hasExt(file, DOTNET_DLL_EXTS),
  );
  const isOther = files.some(
    (file) =>
      hasExt(file, DOTNET_BLOCK_EXTS) ||
      hasExt(file, MOD_EXTS) ||
      MOD_FILES.includes(path.basename(file).toLowerCase()),
  );
  let supported = gameId === spec.game.id && isMod && !isOther;

  // Test for a mod installer
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install .NET scripts into "scripts": everything inside the archive's own "scripts" folder, else everything in the script's folder
async function installDotNet(api, files, destinationPath) {
  const filtered = files.filter((file) => !file.endsWith(path.sep));
  const sources = filtered.filter((file) => hasExt(file, DOTNET_SOURCE_EXTS));
  const assemblies = [];
  for (const file of filtered.filter((entry) => hasExt(entry, DOTNET_DLL_EXTS))) {
    if (await isManagedAssembly(path.join(destinationPath, file))) assemblies.push(file);
  }
  const scripts = [...sources, ...assemblies];
  if (scripts.length === 0) return installFallback(api, files, destinationPath); //native .dll files only
  const modFile = scripts.sort(
    (lhs, rhs) => lhs.split(path.sep).length - rhs.split(path.sep).length,
  )[0];
  const parts = path.dirname(modFile).split(path.sep);
  const scriptsIdx = parts.findIndex((folder) => folder.toLowerCase() === DOTNET_PATH);
  const rootPath =
    scriptsIdx === -1 ? path.dirname(modFile) : parts.slice(0, scriptsIdx + 1).join(path.sep);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const instructions = filtered
    .filter((file) => file.startsWith(rootPrefix))
    .map((file) => ({ type: "copy", source: file, destination: file.slice(rootPrefix.length) }));
  instructions.push({ type: "setmodtype", value: DOTNET_ID });
  dotNetRuntimeCheck(api);
  return { instructions };
}

//Offer to download ScriptHookRDR2 .NET when a .NET script is installed without it. Never awaited - runs beside the install.
async function dotNetRuntimeCheck(api) {
  try {
    if ((await DOTNET_RUNTIME_REQUIREMENT.findMod(api)) !== undefined) return;
    if (await isRequirementInstalledElsewhere(api, DOTNET_RUNTIME_REQUIREMENT)) return;
  } catch (err) {
    log("warn", `Failed to check for ${DOTNET_RUNTIME_NAME}: ${err}`);
    return;
  }
  api.sendNotification({
    id: `${GAME_ID}-dotnet-runtime-missing`,
    type: "warning",
    message: `.NET scripts need ${DOTNET_RUNTIME_NAME}, which is not installed.`,
    allowSuppress: true,
    actions: [
      {
        title: "Download",
        action: (dismiss) => {
          dismiss();
          download(api, [DOTNET_RUNTIME_REQUIREMENT]).catch((err) =>
            log("warn", `Failed to download ${DOTNET_RUNTIME_NAME}: ${err}`),
          );
        },
      },
    ],
  });
}

//Test for mod files
function testMod(files, gameId) {
  const isMod = files.some(
    (file) =>
      MOD_FILES.includes(path.basename(file).toLowerCase()) ||
      MOD_EXTS.includes(path.extname(file).toLowerCase()),
  );
  let supported = gameId === spec.game.id && isMod;

  // Test for a mod installer
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Top level folder names of every installed LML mod - a mod without an install.xml that uses one of them patches that mod
async function installedLmlFolders(api) {
  const state = api.getState();
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  const mods = Object.values(state.persistent.mods[GAME_ID] || {}).filter(
    (mod) => mod.type === MOD_ID,
  );
  const names = new Set();
  for (const mod of mods) {
    try {
      (await fsp.readdir(path.join(stagingPath, mod.installationPath))).forEach((name) =>
        names.add(name.toLowerCase()),
      );
    } catch {
      //mod folder missing - nothing to match
    }
  }
  return names;
}

//Loose streaming assets (no install.xml, no "replace"/"stream" folder) that are not a patch for an installed LML mod.
//LML only streams these from "lml\stream" - in a folder of their own they would never load.
async function streamInstructions(api, filtered) {
  const assets = filtered.filter((file) => !DOC_EXTS.includes(path.extname(file).toLowerCase()));
  if (
    assets.length === 0 ||
    !assets.every((file) => STREAM_EXTS.includes(path.extname(file).toLowerCase()))
  ) {
    return undefined;
  }
  const topLevel = new Set(assets.map((file) => file.split(path.sep)[0].toLowerCase()));
  const hasLooseFiles = assets.some((file) => !file.includes(path.sep));
  if (!hasLooseFiles && topLevel.size === 1) {
    const installed = await installedLmlFolders(api);
    if (installed.has([...topLevel][0])) return undefined; //patch for that mod - goes into its folder
  }
  return assets.map((file) => ({
    type: "copy",
    source: file,
    destination: path.join(STREAM_FOLDER, file),
  }));
}

//Install mod files - every mod needs its own folder inside "lml"
async function installMod(api, files, destinationPath) {
  const setModTypeInstruction = { type: "setmodtype", value: MOD_ID };
  const archiveName = path.basename(destinationPath, ".installing");
  const filtered = files.filter((file) => !file.endsWith(path.sep));

  let rootPrefix = ""; //wrapper folders stripped from every file
  let modFolder = ""; //folder added when the archive doesn't carry one
  const modFile = shallowestFile(files, (file) =>
    MOD_FILES.includes(path.basename(file).toLowerCase()),
  );
  if (modFile !== undefined) {
    //the folder holding install.xml is the mod folder
    const rootPath = path.dirname(modFile);
    if (rootPath === ".") {
      modFolder = archiveName;
    } else {
      const parent = path.dirname(rootPath);
      rootPrefix = parent === "." ? "" : parent + path.sep;
    }
  } else {
    const sharedFile = filtered
      .filter((file) =>
        file
          .split(path.sep)
          .slice(0, -1)
          .some((folder) => MOD_SHARED_FOLDERS.includes(folder.toLowerCase())),
      )
      .sort((lhs, rhs) => lhs.split(path.sep).length - rhs.split(path.sep).length)[0];
    if (sharedFile !== undefined) {
      //a "replace" or "stream" folder goes straight into "lml", with whatever sits beside it
      const parts = sharedFile.split(path.sep);
      const sharedIdx = parts.findIndex((folder) =>
        MOD_SHARED_FOLDERS.includes(folder.toLowerCase()),
      );
      rootPrefix = sharedIdx === 0 ? "" : parts.slice(0, sharedIdx).join(path.sep) + path.sep;
    } else {
      const streamed = await streamInstructions(api, filtered);
      if (streamed !== undefined) {
        return { instructions: [...streamed, setModTypeInstruction] };
      }
      //a single top level folder is the mod folder, anything else gets wrapped
      const topLevel = new Set(filtered.map((file) => file.split(path.sep)[0]));
      const hasLooseFiles = filtered.some((file) => !file.includes(path.sep));
      if (hasLooseFiles || topLevel.size !== 1) {
        modFolder = archiveName;
      }
    }
  }

  const instructions = filtered
    .filter((file) => file.startsWith(rootPrefix))
    .map((file) => {
      return {
        type: "copy",
        source: file,
        destination: path.join(modFolder, file.slice(rootPrefix.length)),
      };
    });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map((str) => str.toLowerCase());
  const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map((str) => str.toLowerCase());
  const isMod = files.some((file) =>
    ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()),
  );
  const isSub = files.some((file) =>
    ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()),
  );
  let supported = gameId === spec.game.id && (isMod || isSub);

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installRoot(files) {
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map((str) => str.toLowerCase());
  const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map((str) => str.toLowerCase());
  let folder = "";
  let modFile = files.find((file) =>
    ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()),
  );
  if (modFile === undefined) {
    modFile = files.find((file) =>
      ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()),
    );
    folder = ROOTSUB_PATH;
  }
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`;
  const idx = modFile.lastIndexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: ROOT_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(folder, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for Binaries folder mods
function testBinaries(files, gameId) {
  const isMod = files.some((file) => BINARIES_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = gameId === spec.game.id && isMod;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer to Binaries folder
function installBinaries(files) {
  const setModTypeInstruction = { type: "setmodtype", value: BINARIES_ID };

  const filtered = files.filter((file) => !file.endsWith(path.sep));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: file,
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

function isSaveFile(file) {
  const name = path.basename(file).toLowerCase();
  return (
    SAVE_STRINGS.some((prefix) => name.startsWith(prefix)) ||
    SAVE_FILES.map((saveFile) => saveFile.toLowerCase()).includes(name) ||
    SAVE_EXTS.includes(path.extname(name))
  );
}

//Files matching the predicate, one per file name - the one closest to the archive root wins
function shallowestByName(files, predicate) {
  const byName = new Map();
  files
    .filter((file) => !file.endsWith(path.sep) && predicate(file))
    .sort((lhs, rhs) => lhs.split(path.sep).length - rhs.split(path.sep).length)
    .forEach((file) => {
      const name = path.basename(file).toLowerCase();
      if (!byName.has(name)) byName.set(name, file);
    });
  return [...byName.values()];
}

//Stop a save or config install with the reason - the files must not fall through to another installer.
//util.UserCanceled, not a plain VortexError: Vortex checks "instanceof UserCanceled" (the reinstall path has no other
//check), so a plain error with kind "user-canceled" adds "Installation failed" and "Failed to reinstall mod" popups.
function cancelDocumentsInstall(api, kind, reason) {
  api.showErrorNotification(`Cannot install this ${kind} mod`, reason, { allowReport: false });
  throw new util.UserCanceled(false);
}

const PARTITION_REASON =
  `${GAME_NAME} keeps its saves and settings in your Documents folder, which is not on the same drive ` +
  `as the game and the Vortex staging folder. Vortex can only deploy there with hardlinks if all three share a drive. ` +
  `Move the game and the staging folder to the drive Documents is on, or copy the files in by hand.`;

//Test for save files. The install stops with the reason when they cannot be deployed.
function testSave(api, files, gameId) {
  const isMod = files.some((file) => !file.endsWith(path.sep) && isSaveFile(file));
  if (isMod && CHECK_SAVE === undefined) updatePartitionChecks(api);
  let supported = gameId === spec.game.id && isMod;

  // Test for a mod installer
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install save files straight into the profile folder. Only the save slots - a shipped profile's settings
//and cloud sync files would overwrite the user's own.
async function installSave(api, files) {
  if (CHECK_SAVE !== true) cancelDocumentsInstall(api, "save", PARTITION_REASON);
  if (SAVE_PATH === SAVE_FOLDER) {
    cancelDocumentsInstall(
      api,
      "save",
      `${GAME_NAME} has no profile folder in "${SAVE_FOLDER}" yet. Start the game once, then install the save again.`,
    );
  }
  const instructions = shallowestByName(files, isSaveFile).map((file) => ({
    type: "copy",
    source: file,
    destination: path.basename(file),
  }));
  instructions.push({ type: "setmodtype", value: SAVE_ID });
  return Promise.resolve({ instructions });
}

function isConfigFile(file) {
  const name = path.basename(file).toLowerCase();
  return (
    CONFIG_FILES.map((configFile) => configFile.toLowerCase()).includes(name) ||
    CONFIG_EXTS.includes(path.extname(name))
  );
}

//Test for config files (graphics presets). The install stops with the reason when they cannot be deployed.
function testConfig(api, files, gameId) {
  const isMod = files.some((file) => !file.endsWith(path.sep) && isConfigFile(file));
  if (isMod && CHECK_CONFIG === undefined) updatePartitionChecks(api);
  let supported = gameId === spec.game.id && isMod;

  // Test for a mod installer
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install config files straight into the Settings folder
async function installConfig(api, files) {
  if (CHECK_CONFIG !== true) cancelDocumentsInstall(api, "config", PARTITION_REASON);
  const instructions = shallowestByName(files, isConfigFile).map((file) => ({
    type: "copy",
    source: file,
    destination: path.basename(file),
  }));
  instructions.push({ type: "setmodtype", value: CONFIG_ID });
  return Promise.resolve({ instructions });
}

//Fallback installer to root folder
function testFallback(files, gameId) {
  let supported = gameId === spec.game.id;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
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
  const setModTypeInstruction = { type: "setmodtype", value: ROOT_ID };

  const filtered = files.filter((file) => !file.endsWith(path.sep));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
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
  modName = path.basename(modName, ".installing");
  const id = modName.replace(/[^a-zA-Z0-9\s]*( )*/gi, "").slice(0, 20);
  const NOTIF_ID = `${GAME_ID}-${id}-fallback`;
  const MESSAGE = "Fallback installer reached for " + modName;
  api.sendNotification({
    id: NOTIF_ID,
    type: "info",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "More",
        action: (dismiss) => {
          api.showDialog(
            "question",
            MESSAGE,
            {
              text:
                `The mod you just installed reached the fallback installer. This means Vortex could not determine where to place these mod files.\n` +
                `Please check the mod page description and review the files in the mod staging folder to determine if manual file manipulation is required.\n` +
                `\n` +
                `If you think that Vortex should be capable to install this mod to a specific folder, please contact the extension developer for support at the link below.\n` +
                `\n` +
                `Mod Name: ${modName}.\n` +
                `\n`,
            },
            [
              { label: "Continue", action: () => dismiss() },
              {
                label: "Contact Ext. Developer",
                action: () => {
                  try {
                    window.api.shell.openUrl(`${EXTENSION_URL}?tab=posts`);
                  } catch (err) {
                    api.showErrorNotification("Failed to open the URL", err, {
                      allowReport: false,
                    });
                  }
                  dismiss();
                },
              }, //*/
              //*
              {
                label: `Open Mod Page + Staging Folder`,
                action: () => {
                  try {
                    window.api.shell.openFile(path.join(STAGING_FOLDER, modName));
                  } catch (err) {
                    api.showErrorNotification("Failed to open the file or folder", err, {
                      allowReport: false,
                    });
                  }
                  const mods = api.store.getState()?.persistent?.mods?.[spec.game.id] ?? {};
                  const modMatch = Object.values(mods).find(
                    (mod) => mod.installationPath === modName,
                  );
                  log("warn", `Found ${modMatch?.id} for ${modName}`);
                  let PAGE = ``;
                  if (modMatch) {
                    const MOD_ID = modMatch.attributes.modId;
                    if (MOD_ID !== undefined) {
                      PAGE = `${MOD_ID}?tab=description`;
                    }
                  }
                  const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
                  try {
                    window.api.shell.openUrl(MOD_PAGE_URL);
                  } catch (err) {
                    api.showErrorNotification("Failed to open the URL", err, {
                      allowReport: false,
                    });
                  }
                  dismiss();
                },
              }, //*/
            ],
          );
        },
      },
    ],
  });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Check if Lenny's Mod Loader is installed
function isModLoaderInstalled(api) {
  const mods = api.getState().persistent.mods[GAME_ID] || {};
  return Object.keys(mods).some((id) => mods[id]?.type === MODLOADER_ID);
}

//Is one of a requirement's files already installed some other way: in the game folder (installed by hand, or
//deployed), or at the top of any installed mod (another mod type, or not deployed yet - such as the original
//ScriptHookRDR2, which carries its own dinput8.dll)
async function isRequirementInstalledElsewhere(api, requirement) {
  const names = requirement.presenceFiles ?? [requirement.assemblyFileName.toLowerCase()];
  const gamePath = getDiscoveryPath(api);
  if (gamePath) {
    for (const name of names) {
      if (await statCheckAsync(gamePath, name)) return true;
    }
  }
  const state = api.getState();
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  const mods = Object.values(state.persistent.mods[GAME_ID] || {}).filter(
    (mod) => mod.state === "installed",
  );
  for (const mod of mods) {
    try {
      const entries = await fsp.readdir(path.join(stagingPath, mod.installationPath));
      if (entries.some((entry) => names.includes(entry.toLowerCase()))) return true;
    } catch {
      //mod folder missing - nothing to match
    }
  }
  return false;
}

//Install ScriptHookRDR2 V2 and its ASI loader when missing. A copy installed any other way is left alone.
//checkUpdates also offers updates for the copies this extension manages.
async function checkScriptHook(api, checkUpdates) {
  const missing = [];
  for (const requirement of SCRIPTHOOK_REQUIREMENTS) {
    if ((await requirement.findMod(api)) !== undefined) {
      if (checkUpdates) await testRequirementVersion(api, requirement);
    } else if (!(await isRequirementInstalledElsewhere(api, requirement))) {
      missing.push(requirement);
    }
  }
  if (missing.length > 0) await download(api, missing);
}

//Open the rdr2mods.com browse page on the Lenny's Mod Loader page
function openModLoaderPage(api) {
  openRdr2ModsFilePage(api, spec, RDR2MODS_BROWSER_CONFIG, MODLOADER_BROWSE_KEY);
}

//The official extension registers the same game. While it is enabled, Vortex runs its game setup and installers
//instead of this extension's, so mods install to the wrong places. Checked on game activation, not in setup(),
//because this extension's setup() does not run while the official one wins.
function officialExtensionNotify(api) {
  const extensions = api.getState().app?.extensions ?? {};
  const official = Object.values(extensions).find(
    (ext) =>
      ext?.enabled === true &&
      ext?.remove !== true &&
      (ext?.modId === OFFICIAL_EXT_MOD_ID || ext?.name === OFFICIAL_EXT_NAME),
  );
  if (official === undefined) return;
  api.sendNotification({
    id: `${GAME_ID}-official-extension`,
    type: "warning",
    message: `Disable the official "${OFFICIAL_EXT_NAME}" extension. It replaces this extension's Red Dead Redemption 2 support, so mods install to the wrong places.`,
    actions: [
      {
        title: "Open Extensions",
        action: (dismiss) => {
          api.events.emit("show-main-page", "Extensions");
          dismiss();
        },
      },
    ],
  });
}

//Tell the user Lenny's Mod Loader is missing. It cannot be installed automatically - rdr2mods.com only lets a real browser session download.
function modLoaderNotify(api) {
  api.sendNotification({
    id: `${GAME_ID}-modloader-missing`,
    type: "warning",
    message: `${MODLOADER_NAME} is not installed. Most mods need it. RDR2Mods.com, its only download site, blocks automatic downloads, so use "Get It" and click Download there.`,
    allowSuppress: true,
    actions: [
      {
        title: "Get It",
        action: (dismiss) => {
          openModLoaderPage(api);
          dismiss();
        },
      },
    ],
  });
}

function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup-notify`;
  const MESSAGE = "Special Setup Instructions";
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "More",
        action: (dismiss) => {
          api.showDialog(
            "question",
            MESSAGE,
            {
              text: `\n` + `TEXT HERE.\n` + `\n` + `TEXT HERE.\n` + `\n`,
            },
            [
              { label: "Acknowledge", action: () => dismiss() },
              {
                label: "Never Show Again",
                action: () => {
                  api.suppressNotification(NOTIF_ID);
                  dismiss();
                },
              },
            ],
          );
        },
      },
    ],
  });
}

//* Resolve game version dynamically for different game versions
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
  let version = "0.0.0";
  if (GAME_VERSION === "xbox") {
    // use appxmanifest.xml for Xbox version
    try {
      const appManifest = await fsp.readFile(path.join(gamePath, APPMANIFEST_FILE), "utf8");
      const parsed = await parseStringPromise(appManifest);
      version = parsed?.Package?.Identity?.[0]?.$?.Version;
      return Promise.resolve(version);
    } catch (err) {
      log("error", `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  } else {
    // use exe
    try {
      const exeVersion = require("exe-version");
      const EXEC = getExecutable(gamePath);
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC)); //can also use getFileVersion if this doesn't return the correct number (rare)
      return Promise.resolve(version);
    } catch (err) {
      log("error", `Could not read executable file to get game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await vfs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Closest folder above (or at) the path that exists - a folder the game has not created yet sits on the same drive as its parent
function existingAncestor(folder) {
  let dir = folder;
  while (!fs.existsSync(dir)) {
    const parent = path.dirname(dir);
    if (parent === dir) return dir;
    dir = parent;
  }
  return dir;
}

//True if the folder, the game and the staging folder are on one drive. Vortex picks one deployment method for all
//mod types of a game, so a single mod type on another drive would take hardlink deployment away from every mod.
function checkPartitions(folder, gamePath, stagingPath) {
  try {
    const devs = [folder, gamePath, stagingPath].map(
      (dir) => fs.statSync(existingAncestor(dir)).dev,
    );
    return devs.every((dev) => dev === devs[0]);
  } catch {
    return false;
  }
}

function updatePartitionChecks(api) {
  const state = api.getState();
  const gamePath = state.settings.gameMode.discovered[GAME_ID]?.path;
  if (!gamePath) return;
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  CHECK_CONFIG = checkPartitions(CONFIG_PATH, gamePath, stagingPath);
  CHECK_SAVE =
    SAVEMOD_LOCATION === CONFIGMOD_LOCATION
      ? CHECK_CONFIG
      : checkPartitions(SAVE_FOLDER, gamePath, stagingPath);
}

//Profile folder the saves go in - the first one in "Profiles", which only exists once the game was started
function resolveSavePath() {
  try {
    const userId = fs.readdirSync(SAVE_FOLDER).find((entry) => isDir(SAVE_FOLDER, entry));
    return path.join(SAVE_FOLDER, userId ?? "");
  } catch {
    return SAVE_FOLDER;
  }
}

//Save and Config mods are off because Documents is on another drive than the game or the staging folder
function partitionCheckNotify(api) {
  const NOTIF_ID = `${GAME_ID}-partitioncheck`;
  const MESSAGE = "Save and Config mods are not available";
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "More",
        action: (dismiss) => {
          api.showDialog(
            "question",
            MESSAGE,
            {
              text:
                `${GAME_NAME} keeps its saves and settings in your Documents folder. Vortex can only deploy ` +
                `mods there with hardlinks if Documents, the game and the Vortex staging folder are all on the same drive. ` +
                `They are not, so Vortex does not install save or config mods for ${GAME_NAME}, and every other mod keeps using hardlinks.\n\n` +
                `Game: ${GAME_PATH}\n` +
                `Staging folder: ${STAGING_FOLDER}\n` +
                `Saves: ${SAVE_FOLDER}\n` +
                `Settings: ${CONFIG_PATH}\n\n` +
                `To use save or config mods, move the game and the staging folder to the drive Documents is on, ` +
                `or copy the files into the folders above by hand.`,
            },
            [
              { label: "Acknowledge", action: () => dismiss() },
              {
                label: "Never Show Again",
                action: () => {
                  api.suppressNotification(NOTIF_ID);
                  dismiss();
                },
              },
            ],
          );
        },
      },
    ],
  });
}

//Move mods installed with the official RDR2 extension onto this extension's mod types.
//The official types stay registered and deploy first, so the next deployment removes their old files before the new types deploy them again.
async function migrateLegacyMods(api) {
  const state = api.getState();
  const mods = state.persistent.mods[GAME_ID] || {};
  const legacyMods = Object.values(mods).filter((mod) =>
    [LEGACY_ASI_ID, DOTNET_ID].includes(mod.type),
  );
  if (legacyMods.length === 0) return;
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  const batch = [];
  for (const mod of legacyMods) {
    let files = [];
    try {
      files = (await fsp.readdir(path.join(stagingPath, mod.installationPath))).map((file) =>
        file.toLowerCase(),
      );
    } catch (err) {
      log("warn", `Could not read the files of mod "${mod.id}" to change its mod type: ${err}`);
      continue;
    }
    //the official extension typed every mod with a .dll and no game assets as a .NET script, including ScriptHook itself
    let newType = undefined;
    if (files.some((file) => MODLOADER_FILES.includes(file))) newType = MODLOADER_ID;
    else if (files.some((file) => SCRIPTHOOK_FILES.includes(file))) newType = SCRIPTHOOK_ID;
    else if (files.some((file) => ASILOADER_FILES.includes(file))) newType = ASILOADER_ID;
    else if (mod.type === LEGACY_ASI_ID) newType = ASIPLUGIN_ID;
    if (newType !== undefined) batch.push(actions.setModType(GAME_ID, mod.id, newType));
  }
  if (batch.length === 0) return;
  const count = batch.length;
  batch.push(actions.setDeploymentNecessary(GAME_ID, true));
  util.batchDispatch(api.store, batch);
  log("info", `Changed the mod type of ${count} mod(s) installed with the official RDR2 extension`);
  api.sendNotification({
    id: `${GAME_ID}-legacy-migrated`,
    type: "info",
    message: `Updated ${count} mod(s) installed with the official RDR2 extension. Deploy to apply.`,
    displayMS: 10000,
  });
}

//Remove the files the official RDR2 extension deployed to its own mod folder, then its manifest
async function cleanLegacyModPath(api, gamePath, files) {
  const basePath = path.join(gamePath, LEGACY_MOD_PATH);
  let removed = 0;
  for (const file of files) {
    const filePath = path.resolve(basePath, file.relPath);
    if (!filePath.startsWith(basePath + path.sep)) continue; //never touch anything outside that folder
    try {
      await fsp.unlink(filePath);
      removed++;
    } catch (err) {
      if (err.code !== "ENOENT") log("warn", `Could not remove "${filePath}": ${err}`);
    }
  }
  try {
    await fsp.unlink(path.join(basePath, LEGACY_MANIFEST_FILE));
  } catch (err) {
    api.showErrorNotification(
      "Failed to remove the official extension's deployment manifest",
      err,
      {
        allowReport: false,
      },
    );
    return;
  }
  log("info", `Removed ${removed} file(s) the official RDR2 extension deployed to "${basePath}"`);
}

//Mods the official RDR2 extension deployed to its own mod folder do not work there - list them so the user can reinstall them
async function legacyModPathNotify(api, gamePath) {
  let manifest;
  try {
    manifest = JSON.parse(
      await fsp.readFile(path.join(gamePath, LEGACY_MOD_PATH, LEGACY_MANIFEST_FILE), "utf8"),
    );
  } catch {
    return; //official extension never deployed there
  }
  const files = manifest?.files ?? [];
  if (files.length === 0) return;
  const mods = Object.values(api.getState().persistent.mods[GAME_ID] || {});
  const names = [...new Set(files.map((file) => file.source))].map((source) => {
    const mod = mods.find((entry) => entry.installationPath === source);
    return mod !== undefined ? util.renderModName(mod) : source;
  });
  const NOTIF_ID = `${GAME_ID}-legacy-modpath`;
  const MESSAGE = "Mods installed with the official RDR2 extension need reinstalling";
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "More",
        action: async (dismiss) => {
          const result = await api.showDialog(
            "question",
            MESSAGE,
            {
              text:
                `The official Red Dead Redemption 2 extension deployed these mods to "${LEGACY_MOD_PATH}", ` +
                `where the game never loads them:\n\n` +
                names.map((name) => `- ${name}`).join("\n") +
                `\n\nSelect them on the Mods page and use Reinstall so this extension can install them correctly.\n\n` +
                `"Clean Up" removes the files the official extension left in "${LEGACY_MOD_PATH}". ` +
                `Your installed mods are not affected.`,
            },
            [{ label: "Close" }, { label: "Clean Up" }],
          );
          if (result.action === "Clean Up") {
            await cleanLegacyModPath(api, gamePath, files);
            dismiss();
          }
        },
      },
    ],
  });
}

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  SAVE_PATH = resolveSavePath(); //the game may have created its profile folder since Vortex started
  updatePartitionChecks(api);
  if (!CHECK_CONFIG || !CHECK_SAVE) partitionCheckNotify(api);
  // ASYNC CODE //////////////////////////////////////////
  if (CHECK_CONFIG) await vfs.ensureDirWritableAsync(CONFIG_PATH);
  if (CHECK_SAVE && SAVE_PATH !== SAVE_FOLDER) await vfs.ensureDirWritableAsync(SAVE_PATH);
  if (hasXbox || multiExe) {
    GAME_VERSION = await setGameVersion(GAME_PATH);
  }
  if (setupNotification) setupNotify(api);
  await migrateLegacyMods(api); //before the Mod Loader check, which reads the migrated types
  await legacyModPathNotify(api, GAME_PATH);
  try {
    await checkScriptHook(api, false); //after the migration, which retypes ScriptHook and ASI loader mods
  } catch (err) {
    log("warn", `Failed to check for ${SCRIPTHOOK_V2_NAME}: ${err}`);
  }
  if (rdr2modsBrowser && !isModLoaderInstalled(api)) modLoaderNotify(api);
  //await fs.ensureDirWritableAsync(CONFIG_PATH);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = {
    //register game
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

  //register the official RDR2 extension's mod types FIRST - mod types deploy in registration order,
  //so once their mods move to this extension's types, the old files are removed before the new types deploy them
  LEGACY_MODTYPES.forEach((type, idx) => {
    context.registerModType(
      type.id,
      73 + idx,
      (gameId) =>
        gameId === GAME_ID && !!context.api.getState().settings.gameMode.discovered[gameId]?.path,
      (game) => pathPattern(context.api, game, type.targetPath),
      () => Promise.resolve(false),
      { name: type.name },
    );
  });

  //register mod types
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(
      type.id,
      modTypePriority(type.priority) + idx,
      (gameId) => {
        var _a;
        return (
          gameId === gameSpec.game.id &&
          !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null ||
          _a === void 0
            ? void 0
            : _a.path)
        );
      },
      (game) => pathPattern(context.api, game, type.targetPath),
      () => Promise.resolve(false),
      { name: type.name },
    );
  });

  //register mod types explicitly - Documents folders, only while they share a drive with the game and the staging folder
  const documentsTypeSupported = (gameId, check) => {
    if (gameId !== GAME_ID || !context.api.getState().settings.gameMode.discovered[gameId]?.path) {
      return false;
    }
    if (CHECK_CONFIG === undefined) updatePartitionChecks(context.api); //before setup has run
    return check() === true;
  };
  context.registerModType(
    CONFIG_ID,
    60,
    (gameId) => documentsTypeSupported(gameId, () => CHECK_CONFIG),
    (game) => pathPattern(context.api, game, CONFIG_PATH),
    () => Promise.resolve(false),
    { name: CONFIG_NAME },
  );
  context.registerModType(
    SAVE_ID,
    62,
    (gameId) => documentsTypeSupported(gameId, () => CHECK_SAVE),
    (game) => pathPattern(context.api, game, SAVE_PATH),
    () => Promise.resolve(false),
    { name: SAVE_NAME },
  );

  if (binariesInstaller) {
    context.registerModType(
      BINARIES_ID,
      72,
      (gameId) => {
        var _a;
        return (
          gameId === GAME_ID &&
          !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null ||
          _a === void 0
            ? void 0
            : _a.path)
        );
      },
      (game) => pathPattern(context.api, game, path.join("{gamePath}", BINARIES_PATH)),
      () => Promise.resolve(false),
      { name: BINARIES_NAME },
    );
  }

  //register mod installers
  //archives in several parts first - each chosen part then goes through the installers below
  context.registerInstaller(
    VARIANT_ID,
    25,
    testVariant,
    (files, destinationPath, gameId, progressDelegate, choices, unattended, archivePath) =>
      installVariant(context.api, files, destinationPath, unattended, archivePath),
  );
  //add-ons next - they only match when the mod they belong to is installed, and every file has a place in it
  context.registerInstaller(
    ADDON_ID,
    26,
    (files, gameId, archivePath) => testAddon(context.api, files, gameId, archivePath),
    (files, destinationPath, gameId, progressDelegate, choices, unattended, archivePath) =>
      installAddon(context.api, files, archivePath),
  );
  //loader and ScriptHook first so the ".asi" and "lml" folder matchers below can't claim them
  context.registerInstaller(MODLOADER_ID, 27, testModLoader, installModLoader);
  context.registerInstaller(SCRIPTHOOK_ID, 28, testScriptHook, installScriptHook);
  if (rootInstaller) {
    context.registerInstaller(ROOT_ID, 29, testRoot, installRoot);
  }
  context.registerInstaller(ASILOADER_ID, 30, testAsiLoader, installAsiLoader);
  if (binariesInstaller) {
    context.registerInstaller(BINARIES_ID, 31, testBinaries, installBinaries);
  }
  context.registerInstaller(ASIPLUGIN_ID, 33, testAsiPlugin, installAsiPlugin);
  //after the ASI plugin installer, which takes the .NET runtime itself (an .asi beside its .dll)
  context.registerInstaller(DOTNET_ID, 34, testDotNet, (files, destinationPath) =>
    installDotNet(context.api, files, destinationPath),
  );
  if (needsModInstaller) {
    context.registerInstaller(MOD_ID, 35, testMod, (files, destinationPath) =>
      installMod(context.api, files, destinationPath),
    );
  }
  context.registerInstaller(
    CONFIG_ID,
    37,
    (files, gameId) => testConfig(context.api, files, gameId),
    (files) => installConfig(context.api, files),
  );
  //not gated on saveInstaller - that toggle is the game folder save type
  context.registerInstaller(
    SAVE_ID,
    39,
    (files, gameId) => testSave(context.api, files, gameId),
    (files) => installSave(context.api, files),
  );
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) =>
      installFallback(context.api, files, destinationPath),
    );
  }

  //register the rdr2mods.com browse page
  if (rdr2modsBrowser) {
    registerRdr2ModsBrowser(context, gameSpec, RDR2MODS_BROWSER_CONFIG);
    context.registerAction(
      "mod-icons",
      300,
      "open-ext",
      {},
      `Download ${MODLOADER_NAME}`,
      () => {
        openModLoaderPage(context.api);
      },
      () => {
        const state = context.api.getState();
        const gameId = selectors.activeGameId(state);
        return gameId === GAME_ID;
      },
    );
  }

  //register actions
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    `Download ${SCRIPTHOOK_V2_NAME}`,
    () => {
      download(context.api, SCRIPTHOOK_REQUIREMENTS, true);
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    `Download ${VISUALREDEMPTION_NAME}`,
    () => {
      downloadRazedMods(context.api, gameSpec, RAZEDMODS_REQUIREMENTS, false);
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Config Folder",
    () => {
      try {
        window.api.shell.openFile(CONFIG_PATH);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the file or folder", err, {
          allowReport: false,
        });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Save Folder",
    () => {
      try {
        window.api.shell.openFile(SAVE_PATH);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the file or folder", err, {
          allowReport: false,
        });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  ); //*/
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open PCGamingWiki Page",
    () => {
      try {
        window.api.shell.openUrl(PCGAMINGWIKI_URL);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Nexus Mods Page",
    () => {
      try {
        window.api.shell.openUrl(`https://www.nexusmods.com/${GAME_ID}/mods`);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open SteamDB Page",
    () => {
      try {
        window.api.shell.openUrl(STEAMDB_URL);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "View Changelog",
    () => {
      const openPath = path.join(__dirname, "CHANGELOG.md");
      try {
        window.api.shell.openFile(openPath);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the file or folder", err, {
          allowReport: false,
        });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Submit Bug Report",
    () => {
      try {
        window.api.shell.openUrl(`${EXTENSION_URL}?tab=bugs`);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Downloads Folder",
    () => {
      try {
        window.api.shell.openFile(DOWNLOAD_FOLDER);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the file or folder", err, {
          allowReport: false,
        });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    if (rdr2modsBrowser) {
      onceRdr2ModsBrowser(api, spec, RDR2MODS_BROWSER_CONFIG);
    }
    api.events.on("gamemode-activated", (gameId) => {
      if (gameId === GAME_ID) officialExtensionNotify(api);
    });
    api.onAsync("check-mods-version", async (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      await checkScriptHook(api, true).catch((err) =>
        log("warn", `Failed to check for ${SCRIPTHOOK_V2_NAME} update: ${err}`),
      );
      await checkForRazedModsUpdate(api, spec, RAZEDMODS_REQUIREMENTS).catch((err) =>
        log("warn", `Failed to check for ${VISUALREDEMPTION_NAME} update: ${err}`),
      );
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
