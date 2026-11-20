/*///////////////////////////////////////////
Name: CONTROL Resonant Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 1.3.0
Date: 2026-11-19
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
const React = require("react");
//const winapi = require('winapi-bindings');

/*const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow'); //*/
const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "controlresonant";
const STEAMAPP_ID = "3669870"; // https://steamdb.info/app/3669870/
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = "6d334eff6285472eb9ddb79992cb43e9"; // https://store.epicgames.com/en-US/p/control-resonant-3568d3
const GOGAPP_ID = "1627372090"; // https://www.gogdb.org/product/1627372090
const XBOXAPP_ID = "Remedy.CONTROLResonant"; // https://apps.microsoft.com/detail/9p092299fsgw
const XBOXEXECNAME = "CONTROLResonant"; // resolved via MS Store catalog - verify against a live install
const XBOX_PUB_ID = "a0f1gph4eb81p"; // resolved via MS Store catalog - verify against a live install
const INSTALL_HIVE = "HKEY_LOCAL_MACHINE"; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\XXX\\XXX`; //for finding install in registry - requires winapi-bindings
const INSTALL_VALUE = "XXX"; //often InstallDir or InstallPath
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, GOGAPP_ID, EPICAPP_ID, XBOXAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "CONTROL Resonant";
const GAME_NAME_SHORT = "CONTROL Resonant";
const BINARIES_PATH = ".";
const EXEC_NAME = "CONTROLResonant.exe";
const EXEC = EXEC_NAME;
const EXEC_EGS = EXEC; //change other versions if different than Steam/default
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Control_Resonant";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/2366"; //Nexus link to this extension. Used for links

//feature toggles
const hasLoader = false; //true if game needs a mod loader
let hasXbox = true; //toggle for Xbox version logic
const multiExe = false; //set to true if there are multiple executable names
const multiModPath = false; //set to true if there are multiple possible mod paths (i.e. different path for Xbox version)
const allowSymlinks = false; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const needsModInstaller = false; //set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing
const rootInstaller = true; //enable root installer. Set false if you need to avoid installer collisions
const saveInstaller = false; //enable save installer. Set false if path is outside of game folder
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const hasUserIdFolder = false; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
let binariesInstaller = false;
const debug = false; //toggle for debug mode

//info for modtypes, installers, tools, and actions
const DATA_FOLDER = "data";
let ROOT_FOLDERS = [DATA_FOLDER, "data_pack2", "crmods"];
const ROOTSUB_FOLDERS = [];
const ROOTSUB_PATH = DATA_FOLDER;

const CONFIGMOD_LOCATION = LOCALAPPDATA; // PCGW base: LOCALAPPDATA
const SAVEMOD_LOCATION = ""; // PCGW base: UNSUPPORTED
const APPDATA_FOLDER = path.join("Remedy", "CONTROLResonant");
const CONFIG_FOLDERNAME = ""; // PCGW config: %LOCALAPPDATA%\Remedy\CONTROLResonant\renderer.ini
const SAVE_FOLDERNAME = ""; // PCGW save: {{P|steam}}\userdata\{{P|uid}}\3669870\remote\ (unsupported base - set manually)

let GAME_PATH = "";
let GAME_VERSION = "";
let STAGING_FOLDER = "";
let DOWNLOAD_FOLDER = "";
const APPMANIFEST_FILE = "appxmanifest.xml";
const EXEC_XBOX = "gamelaunchhelper.exe";

const STEAM_FILE = "steam_api64.dll";
const GOG_FILE = "Galaxy64.dll";
const EPIC_FILE = "EOSSDK-Win64-Shipping.dll";
const XBOX_FILE = APPMANIFEST_FILE;

const LOADER_ID = `${GAME_ID}-loader`;
const LOADER_NAME = "Mod Loader";
const LOADER_PATH = BINARIES_PATH;
const LOADER_FILE = "XXX.dll";
const LOADER_PAGE_NO = 0;
const LOADER_FILE_NO = 0;
const LOADER_DOMAIN = GAME_ID;
const LOADER_URL = `XXX`; //if not on Nexus

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Mod";
const MOD_PATH = ".";
const MOD_PATH_XBOX = MOD_PATH;
const MOD_EXTS = [".XXX"];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
const BINARIES_EXTS = [".exe", ".dll", ".asi", ".addon64"];

//*
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
const SAVE_EXTS = [".XXX"];
const SAVE_FILES = ["XXX"]; //*/

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
let CONFIG_PATH = path.join(CONFIGMOD_LOCATION, APPDATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_PATH_XBOX = CONFIG_PATH; //XBOX Version
const CONFIG_FILES = ["renderer.ini"];

//Resonant Mod Manager (merges data_pack2 resource mods placed in Mods\<ModName>)
const RMM_ID = `${GAME_ID}-rmm`;
const RMM_NAME = "Resonant Mod Manager";
const RMM_FILES = ["ResonantModManager.exe"];
const RMM_PAGE_NO = 152;
const RMM_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${RMM_PAGE_NO}`;

const RMMMOD_ID = `${GAME_ID}-rmmmod`;
const RMMMOD_NAME = "Resonant Mod Manager Mod";
const RMMMOD_PATH = "Mods";
const RMMMOD_FOLDERS = ["data_pack2"];
const RMMMOD_EXTS = [".rmdblob", ".rmdtoc"];

//Resonant Mod Manager load order (mods.json in the Mods folder: {"mods":[{"name","enabled"}]}, lower rows win)
const LO_FILE = "mods.json";
const LO_ATTRIBUTE = "rmmModFolder"; //mod attribute holding the mod's folder name inside Mods
const LO_IGNORED_FOLDERS = [".cache"];
const LO_IMAGE_WIDTH = 96; //Width of the load order thumbnail image
const LO_IMAGE_HEIGHT = LO_IMAGE_WIDTH * 0.5625;
let mod_update_all_profile = false; // for mod update to keep them in the load order and not uncheck them
let updateModIds = new Map(); // Nexus mod id -> {firstSeen, targetFileId} (Map, not scalar, so batch updates don't clobber each other)
const MAX_UPDATE_WAIT_MS = 5 * 60 * 1000; // release the guard for an update that never lands (cancelled or failed install)

// tool info (i.e. save editor)
const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = RMM_NAME;
const TOOL_EXEC_FOLDER = ".";
const TOOL_EXEC = RMM_FILES[0];
const TOOL_EXEC_PATH = path.join(TOOL_EXEC_FOLDER, TOOL_EXEC);
//*/

let MOD_PATH_DEFAULT = MOD_PATH;
//if (!needsModInstaller) MOD_PATH_DEFAULT = '.';
let REQ_FILE = EXEC;
if (multiExe) REQ_FILE = DATA_FOLDER;
const PARAMETERS_STRING = "";
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [BINARIES_PATH, RMMMOD_PATH];
if (needsModInstaller) MODTYPE_FOLDERS.push(MOD_PATH);
if (saveInstaller) MODTYPE_FOLDERS.push(SAVE_PATH);
if (hasLoader) MODTYPE_FOLDERS.push(LOADER_PATH);
const IGNORE_CONFLICTS = [
  path.join("**", "change?([-_ ])log!(*.*)"),
  path.join("**", "change?([-_ ])log*.{txt,md,rtf,pdf,html,htm}"),
  path.join("**", "read?([-_ ])me!(*.*)"),
  path.join("**", "read?([-_ ])me*.{txt,md,rtf,pdf,html,htm}"),
  path.join("**", "license!(*.*)"),
  path.join("**", "license*.{txt,md,rtf,pdf,html,htm}"),
];
const IGNORE_DEPLOY = [
  path.join("**", "change?([-_ ])log!(*.*)"),
  path.join("**", "change?([-_ ])log*.{txt,md,rtf,pdf,html,htm}"),
  path.join("**", "read?([-_ ])me!(*.*)"),
  path.join("**", "read?([-_ ])me*.{txt,md,rtf,pdf,html,htm}"),
  path.join("**", "license!(*.*)"),
  path.join("**", "license*.{txt,md,rtf,pdf,html,htm}"),
];

//filled in from data above
const spec = {
  game: {
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME_SHORT,
    //"parameters": PARAMETERS, //commented out by default to avoid passing empty string parameter
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
      id: RMM_ID,
      name: RMM_NAME,
      priority: "high",
      targetPath: `{gamePath}`,
    },
    {
      id: RMMMOD_ID,
      name: RMMMOD_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", RMMMOD_PATH),
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
    //parameters: PARAMETERS,
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
  {
    id: TOOL_ID,
    name: TOOL_NAME,
    logo: "exec.png",
    //queryPath: () => TOOL_EXEC_FOLDER,
    executable: () => TOOL_EXEC_PATH,
    requiredFiles: [TOOL_EXEC_PATH],
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
  return () =>
    util.GameStoreHelper.findByAppId(gameSpec.discovery.ids).then((game) => game.gamePath);
  //}
} //*/

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === "steam") {
    return Promise.resolve({
      launcher: "steam",
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
    GAME_VERSION = "default";
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

//Test for mod loader files
function testLoader(files, gameId) {
  const isMod = files.some((file) => path.basename(file) === LOADER_FILE);
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

//Install mod loader files
function installLoader(files) {
  const MOD_TYPE = LOADER_ID;
  const modFile = files.find((file) => path.basename(file) === LOADER_FILE);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for mod files
function testMod(files, gameId) {
  const isMod = files.some((file) => MOD_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install mod files
function installMod(files) {
  const MOD_TYPE = MOD_ID;
  const modFile = files.find((file) => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(file.substr(idx)),
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

//Test for save files
function testSave(files, gameId) {
  const isMod = files.some((file) => SAVE_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install save files
function installSave(files) {
  const MOD_TYPE = SAVE_ID;
  const modFile = files.find((file) => SAVE_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for Resonant Mod Manager
function testRmm(files, gameId) {
  const RMM_FILES_LOWER = RMM_FILES.map((str) => str.toLowerCase());
  const isMod = files.some((file) => RMM_FILES_LOWER.includes(path.basename(file).toLowerCase()));
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

//Install Resonant Mod Manager to the game folder, keeping its Mods folder beside the exe
function installRmm(api, files) {
  const RMM_FILES_LOWER = RMM_FILES.map((str) => str.toLowerCase());
  const modFile = files.find((file) => RMM_FILES_LOWER.includes(path.basename(file).toLowerCase()));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: RMM_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: file.slice(rootPrefix.length),
    };
  });
  instructions.push(setModTypeInstruction);
  rmmDirectModsNotify(api);
  return Promise.resolve({ instructions });
}

//Resonant Mod Manager is in use when its exe is in the game folder or it is installed as a mod
function isRmmPresent(api) {
  const state = api.getState();
  const mods = state.persistent.mods?.[GAME_ID] ?? {};
  if (Object.values(mods).some((mod) => mod?.type === RMM_ID)) {
    return true;
  }
  const gamePath = selectors.discoveryByGame(state, GAME_ID)?.path ?? GAME_PATH;
  if (!gamePath) {
    return false;
  }
  return RMM_FILES.some((file) => fs.existsSync(path.join(gamePath, file)));
}

//Index of the data_pack2 folder segment in a file path, or -1
function rmmModFolderIndex(file) {
  const RMMMOD_FOLDERS_LOWER = RMMMOD_FOLDERS.map((str) => str.toLowerCase());
  return file
    .split(path.sep)
    .slice(0, -1)
    .findIndex((segment) => RMMMOD_FOLDERS_LOWER.includes(segment.toLowerCase()));
}

//Folder name for a mod inside Mods: the archive folder directly above data_pack2 if there is one, else the mod's archive name
function rmmModFolderName(segments, destinationPath) {
  if (segments.length >= 1) {
    return segments[segments.length - 1];
  }
  const archiveName = path.basename(destinationPath, ".installing");
  // Strip the Nexus download suffix from archive names, current format
  // "<name> <modId> <version> <YYYY-MM-DDTHH-MMZ> <hash>" and older format "<name>-<modId>-<version>-<timestamp>"
  const stripped = archiveName
    .replace(/ \d+ \S+ \d{4}-\d{2}-\d{2}T\d{2}-\d{2}Z \S+$/, "")
    .replace(/-\d+-.*-\d{9,}$/, "")
    .trim();
  return stripped || archiveName;
}

//Test for resource mods that Resonant Mod Manager should merge
function testRmmMod(api, files, gameId) {
  let supported =
    gameId === spec.game.id &&
    files.some(
      (file) =>
        RMMMOD_EXTS.includes(path.extname(file).toLowerCase()) && rmmModFolderIndex(file) !== -1,
    );

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

  // Only route mods to the Mods folder when Resonant Mod Manager is in use
  if (supported) {
    supported = isRmmPresent(api);
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install resource mods to Mods\<ModName>\data_pack2 for Resonant Mod Manager
function installRmmMod(files, destinationPath) {
  const modFile = files.find(
    (file) => RMMMOD_EXTS.includes(path.extname(file).toLowerCase()) && rmmModFolderIndex(file) !== -1,
  );
  const segments = modFile.split(path.sep).slice(0, rmmModFolderIndex(modFile));
  const rootPrefix = segments.length > 0 ? segments.join(path.sep) + path.sep : "";
  const modFolder = rmmModFolderName(segments, destinationPath);
  const setModTypeInstruction = { type: "setmodtype", value: RMMMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(modFolder, file.slice(rootPrefix.length)),
    };
  });
  instructions.push(setModTypeInstruction);
  instructions.push({ type: "attribute", key: LO_ATTRIBUTE, value: modFolder });
  return Promise.resolve({ instructions });
}

//Tell the user about resource mods installed straight into data_pack2 before Resonant Mod Manager was added
function rmmDirectModsNotify(api) {
  try {
    const state = api.getState();
    const stagingFolder = selectors.installPathForGame(state, GAME_ID);
    const mods = state.persistent.mods?.[GAME_ID] ?? {};
    const directMods = Object.values(mods).filter(
      (mod) =>
        mod?.type === ROOT_ID &&
        mod?.installationPath &&
        RMMMOD_FOLDERS.some((folder) => fs.existsSync(path.join(stagingFolder, mod.installationPath, folder))),
    );
    if (directMods.length === 0) {
      return;
    }
    api.sendNotification({
      id: `${GAME_ID}-rmm-direct-mods`,
      type: "warning",
      message: `${directMods.length} mod(s) are installed directly into data_pack2. Reinstall them so ${RMM_NAME} can merge them.`,
      allowSuppress: true,
    });
  } catch (err) {
    log("warn", `Could not check for mods installed directly into data_pack2: ${err}`);
  }
}

// LOAD ORDER FUNCTIONS ///////////////////////////////////////////////////

//Reordering is ignored while a mod update is in flight: the deserializers below freeze the stored
//order and the serializers skip writing, so tell the user their change was not applied.
function notifyLoadOrderPaused(api, gameId) {
  api.sendNotification({
    id: `${gameId}-loadorder-update-paused`,
    type: "warning",
    message:
      "Load order changes are paused while a mod update finishes. Reorder again once it completes.",
    displayMS: 6000,
  });
}

//Read Resonant Mod Manager's mods.json. A missing or unreadable file reads as empty.
async function readRmmModsJson(loadOrderPath) {
  try {
    const raw = await fsp.readFile(loadOrderPath, { encoding: "utf8" });
    const data = JSON.parse(raw.replace(/^﻿/, ""));
    const isObject = data !== null && typeof data === "object" && !Array.isArray(data);
    return {
      exists: true,
      data: isObject ? data : {},
      entries: isObject && Array.isArray(data.mods) ? data.mods : [],
    };
  } catch (err) {
    if (err?.code !== "ENOENT") {
      log("warn", `Could not read ${LO_FILE}: ${err}`);
    }
    return { exists: err?.code !== "ENOENT", data: {}, entries: [] };
  }
}

//Folder names (lowercase) inside Mods -> the Vortex mod that installed them. Uses the installer's
//folder attribute, or the top-level folders in the staging folder for mods installed before it existed.
async function getRmmFolderMods(api) {
  const state = api.getState();
  const mods = state?.persistent?.mods?.[GAME_ID] ?? {};
  const stagingFolder = selectors.installPathForGame(state, GAME_ID);
  const folderMods = new Map();
  for (const mod of Object.values(mods)) {
    if (mod?.type !== RMMMOD_ID) continue;
    let folders = [];
    const attribute = mod?.attributes?.[LO_ATTRIBUTE];
    if (attribute) {
      folders = [attribute];
    } else if (stagingFolder && mod?.installationPath) {
      try {
        const entries = await fsp.readdir(path.join(stagingFolder, mod.installationPath), {
          withFileTypes: true,
        });
        folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
      } catch {
        folders = [];
      }
    }
    folders.forEach((folder) => folderMods.set(folder.toLowerCase(), mod));
  }
  return folderMods;
}

//Readable name for a load order row
function getRmmModName(mod, folder) {
  if (mod === undefined) {
    return `Manual Mod (${folder})`;
  }
  let name = mod.attributes?.customFileName ?? mod.attributes?.logicalFileName ?? mod.attributes?.name ?? folder;
  name = name.replace(/(\.zip|\.rar|\.7z)$/gi, "");
  return name.toLowerCase() === folder.toLowerCase() ? folder : `${name} (${folder})`;
}

async function deserializeLoadOrder(context) {
  // on mod update for all profile it would cause the mod if it was selected to be unselected
  if (mod_update_all_profile) {
    //A mod update briefly removes and reinstalls mods, so rebuilding the order from disk right now
    //would drop their entries. Return the stored order untouched instead: positions are preserved
    //and the page keeps showing the real load order rather than a placeholder row.
    const updateState = context.api.getState();
    const updateProfileId = selectors.lastActiveProfileForGame(updateState, GAME_ID);
    return updateState?.persistent?.loadOrder?.[updateProfileId] ?? [];
  }

  //Seed lock state from the stored load order. mods.json has no lock field, so without this a
  //locked entry would silently unlock on the next deploy or page mount.
  const prevState = context.api.getState();
  const prevLO =
    prevState?.persistent?.loadOrder?.[selectors.lastActiveProfileForGame(prevState, GAME_ID)] ??
    [];
  const prevById = new Map(prevLO.map((e) => [e.id, e]));

  const gameDir = getDiscoveryPath(context.api);
  if (!gameDir) return [];
  const modFolderPath = path.join(gameDir, RMMMOD_PATH);

  //read mod folders: every subfolder of Mods is a mod for Resonant Mod Manager, except its own state folders
  let dirents = [];
  try {
    dirents = await fsp.readdir(modFolderPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const modFolders = dirents
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !LO_IGNORED_FOLDERS.includes(entry.name.toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); // Ignore case when sorting

  //read current LO file
  const { entries } = await readRmmModsJson(path.join(modFolderPath, LO_FILE));
  const folderMods = await getRmmFolderMods(context.api);
  const makeEntry = (folder, enabled) => {
    const mod = folderMods.get(folder.toLowerCase());
    return {
      id: folder,
      name: getRmmModName(mod, folder),
      modId: mod?.id,
      enabled,
      locked: prevById.get(folder)?.locked ?? false,
    };
  };

  //create load order array in the file's order, dropping entries with no folder on disk
  const loadOrder = [];
  const seen = new Set();
  for (const entry of entries) {
    const name = typeof entry?.name === "string" ? entry.name.toLowerCase() : undefined;
    const folder = modFolders.find((f) => f.toLowerCase() === name);
    if (folder === undefined || seen.has(name)) continue;
    seen.add(name);
    loadOrder.push(makeEntry(folder, entry.enabled !== false));
  }

  //add new mods to load order
  for (const folder of modFolders) {
    if (!seen.has(folder.toLowerCase())) {
      loadOrder.push(makeEntry(folder, true));
    }
  }
  return loadOrder;
}

async function serializeLoadOrder(context, loadOrder) {
  if (mod_update_all_profile) {
    notifyLoadOrderPaused(context.api, GAME_ID);
    return;
  }

  const gameDir = getDiscoveryPath(context.api);
  if (!gameDir) return;
  const loadOrderPath = path.join(gameDir, RMMMOD_PATH, LO_FILE);
  const { exists, data, entries } = await readRmmModsJson(loadOrderPath);
  //No mods and no file yet: Resonant Mod Manager is not in use, so don't create its file
  if (loadOrder.length === 0 && !exists) return;

  //Keep any other fields Resonant Mod Manager stores, at file level and per mod
  const prevByName = new Map(entries.map((e) => [String(e?.name ?? "").toLowerCase(), e]));
  const modsOutput = loadOrder.map((entry) => ({
    ...(prevByName.get(entry.id.toLowerCase()) ?? {}),
    name: entry.id,
    enabled: entry.enabled !== false,
  }));
  await fsp.mkdir(path.dirname(loadOrderPath), { recursive: true });
  return fsp.writeFile(loadOrderPath, JSON.stringify({ ...data, mods: modsOutput }, null, 2), {
    encoding: "utf8",
  });
}

//Release the mod update guard once the updated mods have landed (runs on every deploy of this game)
async function releaseLoadOrderUpdateGuard(api, profileId) {
  //release tracking one mod id at a time, and only once that mod's new version has
  //landed and is enabled, so a deploy that fires mid-batch can't disarm the guard for
  //mods that haven't been reinstalled yet
  //guard state as it stood before the loop below releases it - the FBLO refresh further
  //down only runs on the deploy that actually clears the guard
  const guardWasArmed = mod_update_all_profile;
  if (updateModIds.size > 0) {
    const state = api.getState();
    const profile = selectors.profileById(state, profileId);
    const mods = state?.persistent?.mods?.[GAME_ID] ?? {};
    const now = Date.now();
    for (const [nexusId, { firstSeen, targetFileId }] of Array.from(updateModIds)) {
      const landed = Object.values(mods).some(
        (mod) =>
          String(mod?.attributes?.modId ?? "") === nexusId &&
          //if the target file is unknown, fall back to "installed and enabled"
          (targetFileId === "" || String(mod?.attributes?.fileId ?? "") === targetFileId) &&
          (profile?.modState?.[mod.id]?.enabled ?? false),
      );
      if (landed) {
        updateModIds.delete(nexusId);
      } else if (now - firstSeen > MAX_UPDATE_WAIT_MS) {
        log(
          "warn",
          `[${GAME_ID}] Mod update tracking for Nexus mod ${nexusId} timed out without landing; releasing load order guard for it.`,
        );
        updateModIds.delete(nexusId);
      }
    }
  }
  mod_update_all_profile = updateModIds.size > 0; //stay armed while any update is still outstanding
  //Core FBLO deserialized this order concurrently with this handler - did-deploy listeners run
  //in parallel and the core one is registered first - so it read the frozen order before the
  //guard cleared above, leaving its page stale. Re-run the deserialize it would have got and
  //push the result into state; cheaper and less disruptive than forcing a second deployment.
  if (guardWasArmed && !mod_update_all_profile) {
    try {
      const refreshedLO = await deserializeLoadOrder({ api });
      api.store.dispatch(actions.setFBLoadOrder(profileId, refreshedLO));
    } catch (err) {
      log("warn", `[${GAME_ID}] post-update load order refresh failed`, err);
    }
  }
}

//True if the profile has an enabled mod of this type
function hasEnabledModOfType(api, profileId, modType) {
  const state = api.getState();
  const mods = state?.persistent?.mods?.[GAME_ID] ?? {};
  const modState = state?.persistent?.profiles?.[profileId]?.modState ?? {};
  return Object.keys(mods).some((id) => mods[id]?.type === modType && modState[id]?.enabled);
}

//Notify the user to build mods with Resonant Mod Manager after deployment (or to get it first)
function rmmDeployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-rmm-deploy`;
  const MOD_NAME = RMM_NAME;
  const isInstalled = isRmmPresent(api);
  const MESSAGE = isInstalled ? `Run ${MOD_NAME} to Build Mods` : `${MOD_NAME} is Required`;
  const RUN_TITLE = isInstalled ? `Run ${MOD_NAME}` : `Get ${MOD_NAME}`;
  const run = () => (isInstalled ? runRmm(api) : util.opn(RMM_URL).catch(() => null));
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: RUN_TITLE,
        action: (dismiss) => {
          run();
          dismiss();
        },
      },
      {
        title: "More",
        action: (dismiss) => {
          api.showDialog(
            "question",
            MESSAGE,
            {
              text:
                `${RMMMOD_NAME}s are not loaded by the game directly. After deploying with Vortex, open ${MOD_NAME}, tick the mods you want, arrange their order and click "Build mods" or "Launch game" there. ${MOD_NAME} then merges them into the game's data_pack2 files.\n` +
                `\n` +
                `Vortex places these mods in this folder: "[RootGameFolder]\\${RMMMOD_PATH}".\n` +
                `Set the order and enabled state on Vortex's Load Order page; Vortex writes it to ${MOD_NAME}'s ${LO_FILE}.\n` +
                `Click "Refresh list" in ${MOD_NAME} after adding or removing mods.\n` +
                `Use the included tool to launch ${MOD_NAME} (button on notification or in "Tools" tab).\n`,
            },
            [
              {
                label: RUN_TITLE,
                action: () => {
                  run();
                  dismiss();
                },
              },
              { label: "Continue", action: () => dismiss() },
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

//Run Resonant Mod Manager from its tool entry
function runRmm(api) {
  const state = api.getState();
  const tool = state?.settings?.gameMode?.discovered?.[GAME_ID]?.tools?.[TOOL_ID];
  const gamePath = selectors.discoveryByGame(state, GAME_ID)?.path ?? GAME_PATH;
  const TOOL_PATH = tool?.path ?? (gamePath ? path.join(gamePath, TOOL_EXEC_PATH) : undefined);
  if (TOOL_PATH === undefined) {
    return api.showErrorNotification(
      `Failed to run ${RMM_NAME}`,
      `Path to ${RMM_NAME} executable could not be found. Ensure ${RMM_NAME} is installed through Vortex.`,
      { allowReport: false },
    );
  }
  return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false }).catch((err) =>
    api.showErrorNotification(`Failed to run ${RMM_NAME}`, err, {
      allowReport: ["EPERM", "EACCES", "ENOENT"].indexOf(err.code) !== -1,
    }),
  );
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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if mod loader is installed
function isLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some((id) => mods[id]?.type === LOADER_ID);
}

//* Function to auto-download mod loader from Nexus Mods
async function downloadLoader(api, gameSpec, check = true) {
  let isInstalled = isLoaderInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = LOADER_NAME;
    const MOD_TYPE = LOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = LOADER_PAGE_NO;
    const FILE_ID = LOADER_FILE_NO; //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = LOADER_DOMAIN;
    api.sendNotification({
      //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) {
      //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try {
        //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter((file) => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new VortexError(`No ${MOD_NAME} main file found`, { kind: "process-canceled" });
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch {
        // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      const dlId = await new Promise((resolve, reject) =>
        api.events.emit(
          "start-download",
          [URL],
          dlInfo,
          undefined,
          (err, result) => (err ? reject(err) : resolve(result)),
          undefined,
          {
            allowInstall: false,
          },
        ),
      );
      const modId = await new Promise((resolve, reject) =>
        api.events.emit("start-install-download", dlId, { allowAutoEnable: false }, (err, result) =>
          err ? reject(err) : resolve(result),
        ),
      );
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
      //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      try {
        window.api.shell.openUrl(errPage);
      } catch (openErr) {
        api.showErrorNotification("Failed to open the URL", openErr, { allowReport: false });
      }
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

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
  }
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

  //Resonant Mod Manager load order (mods.json in the Mods folder)
  context.registerLoadOrder({
    gameId: GAME_ID,
    validate: async () => Promise.resolve(undefined), // no validation implemented yet
    deserializeLoadOrder: async () => await deserializeLoadOrder(context),
    serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
    toggleableEntries: true,
    usageInstructions: LoadOrderInstructions,
    customItemRenderer: LoadOrderItemRenderer,
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
    context.registerModType(
      LOADER_ID,
      70,
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
      (game) => pathPattern(context.api, game, path.join("{gamePath}", LOADER_PATH)),
      () => Promise.resolve(false),
      { name: LOADER_NAME },
    );
  }
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
  if (hasLoader) {
    context.registerInstaller(LOADER_ID, 25, testLoader, installLoader);
  }
  context.registerInstaller(
    RMMMOD_ID,
    26,
    (files, gameId) => testRmmMod(context.api, files, gameId),
    installRmmMod,
  );
  if (rootInstaller) {
    context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  }
  context.registerInstaller(RMM_ID, 28, testRmm, (files) => installRmm(context.api, files));
  if (needsModInstaller) {
    context.registerInstaller(MOD_ID, 29, testMod, installMod);
  }
  if (binariesInstaller) {
    context.registerInstaller(BINARIES_ID, 31, testBinaries, installBinaries);
  }
  //context.registerInstaller(CONFIG_ID, 33, testConfig, installConfig);
  if (saveInstaller) {
    context.registerInstaller(SAVE_ID, 35, testSave, installSave);
  }
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) =>
      installFallback(context.api, files, destinationPath),
    );
  }

  //register actions
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Config File",
    () => {
      try {
        window.api.shell.openFile(path.join(CONFIG_PATH, CONFIG_FILES[0]));
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
  /*context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Save Folder",
    () => {
      try {
        window.api.shell.openFile(SAVE_PATH);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the file or folder", err, { allowReport: false });
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
// LOAD ORDER REACT COMPONENTS ///////////////////////////////////////////////

function LoadOrderInstructions() {
  const { statusFilter, setStatusFilter } = useFbloState();
  const { useSelector } = require("react-redux");
  const profile = useSelector((state) => selectors.activeProfile(state));
  const loadOrder = useSelector((state) => state?.persistent?.loadOrder?.[profile?.id] ?? []);
  const isLocked = (entry) => [true, "true", "always"].includes(entry?.locked);
  // Count entries matching the active filter (matched / total), shown beside the pills.
  const total = loadOrder.length;
  const matched =
    statusFilter.size > 0
      ? loadOrder.filter((e) =>
          matchesStatus(e, statusFilter, (x) => x.enabled !== false, isLocked),
        ).length
      : total;
  // Collapse the DraggableListItem wrapper of any filtered-out row. The renderer only owns the
  // inner <li>; the two dnd <div> wrappers retain their spacing when the <li> is display:none,
  // leaving visible gaps. This :has() rule hides the whole wrapper when its row is marked hidden.
  useInjectStyleOnce("fblo-status-filter-hide-style", LO_ROW_HIDDEN_CSS);
  return React.createElement(
    "div",
    null,
    React.createElement(StatusPills, {
      active: statusFilter,
      setActive: setStatusFilter,
      groups: ["enabled", "locked", "unmanaged"],
      count: statusFilter.size > 0 ? { matched, total } : null,
    }),
    React.createElement(
      "p",
      { style: { fontStyle: "italic", color: "#7ec8e3" } },
      "Filter the list above by status. Clear the filter before reordering mods.",
    ),
    React.createElement("br", null),
    React.createElement(
      "p",
      null,
      "Drag and drop the mods on the left to change the order in which they load.",
    ),
    React.createElement("br", null),
    React.createElement(
      "p",
      null,
      `${RMM_NAME} merges the mods in its "${RMMMOD_PATH}" folder in the order you set here — Vortex writes this order and each mod's enabled state directly to the manager's ${LO_FILE} file. The number in the left column represents the overwrite order. Changes from mods with higher numbers take priority over mods that make similar edits.`,
    ),
    React.createElement("br", null),
    React.createElement(
      "p",
      null,
      `After changing the order, open ${RMM_NAME} and click "Build mods" or "Launch game" to apply it. Changes saved in the manager show up here the next time this page loads.`,
    ),
  );
}

//Module-level pub-sub for multi-select + context menu + status filter (Vortex FBLO page has no custom context provider)
let _fbloSelectedIds = new Set();
let _fbloContextMenu = null;
let _fbloStatusFilter = new Set();
const _fbloListeners = new Set();
function _notifyFblo() {
  _fbloListeners.forEach((l) => l());
}
function useFbloState() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    _fbloListeners.add(forceUpdate);
    return () => _fbloListeners.delete(forceUpdate);
  }, []);
  return {
    selectedIds: _fbloSelectedIds,
    setSelectedIds: (fn) => {
      _fbloSelectedIds = fn(_fbloSelectedIds);
      _notifyFblo();
    },
    contextMenu: _fbloContextMenu,
    setContextMenu: (val) => {
      _fbloContextMenu = val;
      _notifyFblo();
    },
    statusFilter: _fbloStatusFilter,
    setStatusFilter: (next) => {
      _fbloStatusFilter = next;
      _notifyFblo();
    },
  };
}

//Resolve the mod page URL for a Vortex-managed load order entry (undefined when not resolvable).
//Prefers the mod's homepage attribute; falls back to composing the Nexus URL from the numeric mod id.
function getModPageURL(api, vortexModId) {
  if (vortexModId === undefined) return undefined;
  const attributes = api.getState()?.persistent?.mods?.[GAME_ID]?.[vortexModId]?.attributes ?? {};
  if (attributes.homepage) return attributes.homepage;
  if (attributes.source === "nexus" && attributes.modId !== undefined) {
    return `https://www.nexusmods.com/${GAME_ID}/mods/${attributes.modId}`;
  }
  return undefined;
}

//Resolve the staging folder of a Vortex-managed load order entry (undefined when not resolvable)
function getModStagingFolder(api, vortexModId) {
  if (vortexModId === undefined) return undefined;
  const state = api.getState();
  const installationPath =
    state?.persistent?.mods?.[GAME_ID]?.[vortexModId]?.installationPath ?? undefined;
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  if (!installationPath || !stagingPath) return undefined;
  return path.join(stagingPath, installationPath);
}

//Status filter shared helpers (load order pages). Groups combine with AND across, OR within.
const STATUS_GROUP_TOKENS = {
  enabled: ["enabled", "disabled"],
  locked: ["locked", "unlocked"],
  unmanaged: ["unmanaged"],
};
const STATUS_TOKEN_LABELS = {
  enabled: "Enabled",
  disabled: "Disabled",
  locked: "Locked",
  unlocked: "Unlocked",
  unmanaged: "Unmanaged",
};

function matchesStatus(entry, active, isEnabledFn, isLockedFn) {
  if (active.has("enabled") || active.has("disabled")) {
    const en = isEnabledFn(entry);
    if (!((active.has("enabled") && en) || (active.has("disabled") && !en))) return false;
  }
  if (active.has("locked") || active.has("unlocked")) {
    const lk = isLockedFn(entry);
    if (!((active.has("locked") && lk) || (active.has("unlocked") && !lk))) return false;
  }
  if (active.has("unmanaged") && entry.modId !== undefined) return false;
  return true;
}

//Style blocks injected by the load order surfaces (see useInjectStyleOnce below)
const LO_INDEX_FOCUS_CSS =
  ".load-order-index input:focus { background: white !important; color: black !important; } .layout-flex.file-based-load-order-list-outer { overflow: auto; }";
const LO_ROW_HIDDEN_CSS =
  ".file-based-load-order-list .list-group > div:has(.lo-row-hidden) { display: none !important; }";
const LO_CTX_MENU_CSS = ".ue4ss-ctx-item:hover { background: rgba(255,255,255,0.1); }";

//Extensions cannot ship CSS, so a component injects its styles into the document head on mount.
//Guarded by a fixed id, so repeated mounts (every row, every page visit) never duplicate the block.
function useInjectStyleOnce(styleId, css) {
  React.useEffect(() => {
    if (globalThis.document.getElementById(styleId)) return;
    const style = globalThis.document.createElement("style");
    style.id = styleId;
    style.textContent = css;
    globalThis.document.head.appendChild(style);
  }, [styleId, css]);
}

//Shared dismiss behaviour for the context menus: any click or right-click outside closes the menu,
//as does Escape. Menu items call stopPropagation, so their own clicks never reach these listeners.
function useDismissOnOutside(onClose) {
  React.useEffect(() => {
    const dismiss = () => onClose();
    const onKey = (evt) => {
      if (evt.key === "Escape") onClose();
    };
    globalThis.document.addEventListener("click", dismiss);
    globalThis.document.addEventListener("contextmenu", dismiss);
    globalThis.document.addEventListener("keydown", onKey);
    return () => {
      globalThis.document.removeEventListener("click", dismiss);
      globalThis.document.removeEventListener("contextmenu", dismiss);
      globalThis.document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
}

//Viewport clamp for the context menu. The clamped position is measured once into state and then
//rendered, rather than written onto el.style after the fact - a fresh callback ref every render
//makes React detach and reattach it, and the next render would overwrite the mutated style anyway.
function useClampedMenuPosition(x, y) {
  const [position, setPosition] = React.useState({ left: x, top: y });
  const measureRef = React.useCallback(
    (el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = globalThis.window.innerWidth;
      const vh = globalThis.window.innerHeight;
      const left = x + rect.width > vw ? Math.max(8, vw - rect.width - 8) : x;
      const top = y + rect.height > vh ? Math.max(8, vh - rect.height - 8) : y;
      setPosition((prev) => (prev.left === left && prev.top === top ? prev : { left, top }));
    },
    [x, y],
  );
  return [position, measureRef];
}

//Inline toggle pills for status filtering (used in the InfoPanel surfaces)
function StatusPills({ active, setActive, groups, count }) {
  const { Button } = require("react-bootstrap");
  const tokens = groups.reduce((acc, g) => acc.concat(STATUS_GROUP_TOKENS[g] || []), []);
  const toggle = (token) => {
    const next = new Set(active);
    next.has(token) ? next.delete(token) : next.add(token);
    setActive(next);
  };
  return React.createElement(
    "div",
    { style: { display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginBottom: 8 } },
    React.createElement("span", { style: { fontWeight: "bold", marginRight: 4 } }, "Filter:"),
    count != null
      ? React.createElement(
          "span",
          { style: { color: "#7ec8e3", marginRight: 4 } },
          `${count.matched} / ${count.total}`,
        )
      : null,
    ...tokens.map((token) =>
      React.createElement(
        Button,
        {
          key: token,
          bsSize: "xsmall",
          bsStyle: active.has(token) ? "success" : "default",
          style: active.has(token) ? { fontWeight: "bold" } : undefined,
          onClick: () => toggle(token),
        },
        STATUS_TOKEN_LABELS[token],
      ),
    ),
    active.size > 0
      ? React.createElement(
          Button,
          {
            key: "__clear",
            bsSize: "xsmall",
            bsStyle: "link",
            onClick: () => setActive(new Set()),
          },
          "Clear",
        )
      : null,
  );
}

//* React line item renderer for load order
function LoadOrderItemRenderer(props) {
  const { className, item } = props;
  if (item?.loEntry === undefined) return null;

  const { ListGroupItem, Checkbox } = require("react-bootstrap");
  const { Icon, LoadOrderIndexInput, MainContext } = require("vortex-api");
  const { useSelector, useDispatch } = require("react-redux");

  const context = React.useContext(MainContext);
  const dispatch = useDispatch();

  const profile = useSelector((state) => selectors.activeProfile(state));
  const loadOrder = useSelector((state) => state?.persistent?.loadOrder?.[profile?.id] ?? []);

  const { loEntry, displayCheckboxes } = item;
  const mods = useSelector((state) => state?.persistent?.mods?.[GAME_ID] ?? {});
  const pictureUrl = mods[loEntry.modId]?.attributes?.pictureUrl;
  //FBLO precomputes these on the item (memoized by its row cache); the fallbacks keep the
  //renderer working if it is ever mounted outside the FBLO page.
  const currentIdx = item.position ?? loadOrder.findIndex((e) => e.id === loEntry.id) + 1;

  const isLocked = (entry) => [true, "true", "always"].includes(entry?.locked);
  //Core derives the index input's minimum from this and assumes locked entries sit at the top.
  //Only the LEADING locked run blocks row 1 - a lock further down must not raise the floor.
  const firstUnlocked = loadOrder.findIndex((e) => !isLocked(e));
  const leadingLockedCount = firstUnlocked === -1 ? loadOrder.length : firstUnlocked;

  const onApplyIndex = React.useCallback(
    (idx) => {
      if (currentIdx === idx || isLocked(loEntry)) return;
      //Locked entries hold their absolute index - the typed row picks a slot among the unlocked ones
      const bound = idx - 1 + (idx > currentIdx ? 1 : 0);
      const dest = loadOrder.filter(
        (e, i) => !isLocked(e) && e.id !== loEntry.id && i < bound,
      ).length;
      const unlocked = loadOrder.filter((e) => !isLocked(e) && e.id !== loEntry.id);
      unlocked.splice(dest, 0, loEntry);
      let next = 0;
      const newLO = loadOrder.map((e) => (isLocked(e) ? e : unlocked[next++]));
      dispatch(actions.setFBLoadOrder(profile.id, newLO));
    },
    [dispatch, profile, loadOrder, loEntry, currentIdx],
  );

  const onToggle = React.useCallback(
    (evt) => {
      dispatch(
        actions.setFBLoadOrderEntry(profile.id, { ...loEntry, enabled: evt.target.checked }),
      );
    },
    [dispatch, profile, loEntry],
  );

  const isEntryLocked = isLocked(loEntry);
  const { selectedIds, setSelectedIds, contextMenu, setContextMenu, statusFilter } = useFbloState();
  const isSelected = selectedIds.has(loEntry.id);
  //Shift-select must span visible rows only, so build the id list from the status-filtered order.
  //Memoized: a bare filter here would run once per row, i.e. O(n^2) over the whole load order.
  const allIds = React.useMemo(
    () =>
      loadOrder
        .filter((e) => matchesStatus(e, statusFilter, (entry) => entry.enabled !== false, isLocked))
        .map((e) => e.id),
    [loadOrder, statusFilter],
  );

  const onSelect = React.useCallback(
    (evt) => {
      const ctrlKey = evt.ctrlKey || evt.metaKey;
      const shiftKey = evt.shiftKey;
      setSelectedIds((prev) => {
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
    },
    [loEntry.id, setSelectedIds, allIds],
  );

  const onContextMenu = React.useCallback(
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      setContextMenu({ x: evt.clientX, y: evt.clientY, itemId: loEntry.id });
    },
    [loEntry.id, setContextMenu],
  );

  const onLock = React.useCallback(() => {
    const newLO = loadOrder.map((e) =>
      e.id === loEntry.id ? { ...e, locked: !isEntryLocked } : e,
    );
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
    serializeLoadOrder(context, newLO);
  }, [dispatch, context, profile, loadOrder, loEntry, isEntryLocked]);

  useInjectStyleOnce("lo-index-focus-style", LO_INDEX_FOCUS_CSS);

  const classes = ["load-order-entry"];
  if (className) classes.push(...className.split(" "));

  // Status filter: render hidden (but keep the DnD item count stable) when the entry is filtered out.
  // The 'lo-row-hidden' marker lets the injected CSS collapse the whole DraggableListItem wrapper
  // (the two dnd <div>s the renderer can't reach), otherwise their spacing leaves visible gaps.
  if (!matchesStatus(loEntry, statusFilter, (e) => e.enabled !== false, isLocked)) {
    return React.createElement(ListGroupItem, {
      key: loEntry.id,
      className: "lo-row-hidden",
      style: { display: "none" },
    });
  }

  return React.createElement(
    ListGroupItem,
    {
      key: loEntry.id,
      className: classes.join(" "),
      onClick: onSelect,
      onContextMenu: onContextMenu,
      style: { outline: isSelected ? "2px solid #337ab7" : "none", outlineOffset: "-1px" },
    },
    React.createElement(
      "div",
      { style: { visibility: isEntryLocked ? "hidden" : "visible" } },
      React.createElement(Icon, { className: "drag-handle-icon", name: "drag-handle" }),
    ),
    React.createElement(
      "div",
      { style: { width: 24, flexShrink: 0, overflow: "hidden" } },
      React.createElement(LoadOrderIndexInput, {
        className: "load-order-index",
        api: context.api,
        item: loEntry,
        currentPosition: currentIdx,
        lockedEntriesCount: leadingLockedCount,
        loadOrder: loadOrder,
        isLocked: isLocked,
        onApplyIndex: onApplyIndex,
      }),
    ),
    React.createElement(
      "div",
      {
        style: { cursor: "pointer", display: "flex", alignItems: "center" },
        title: isEntryLocked ? "Unlock position" : "Lock position",
        onClick: (evt) => {
          evt.stopPropagation();
          onLock();
        },
      },
      React.createElement(Icon, {
        name: isEntryLocked ? "locked" : "unlocked",
        style: { color: isEntryLocked ? "#e2c04c" : "inherit" },
      }),
    ),
    React.createElement(
      "div",
      {
        className: "load-order-thumb-slot",
        style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, marginRight: 4, flexShrink: 0 },
      },
      !loEntry.modId
        ? React.createElement(
            "div",
            {
              className: "load-order-unmanaged-banner",
              title: "Not managed by Vortex",
              style: {
                width: LO_IMAGE_WIDTH,
                height: LO_IMAGE_HEIGHT,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                textAlign: "center",
                borderRadius: 2,
                border: "1px solid #e2c04c",
                background: "rgba(226,192,76,0.12)",
                color: "#e2c04c",
                fontSize: 9,
                lineHeight: 1.1,
                padding: 2,
                pointerEvents: "none",
              },
            },
            React.createElement(Icon, {
              className: "external-caution-logo",
              name: "feedback-warning",
              style: { color: "#e2c04c" },
            }),
            React.createElement("span", null, "Not managed by Vortex"),
          )
        : pictureUrl
          ? React.createElement("img", {
              className: "load-order-thumb",
              src: pictureUrl,
              draggable: false,
              style: {
                width: LO_IMAGE_WIDTH,
                height: LO_IMAGE_HEIGHT,
                objectFit: "cover",
                borderRadius: 2,
                pointerEvents: "none",
              },
            })
          : null,
    ),
    React.createElement(
      "p",
      { className: "load-order-name", style: { whiteSpace: "normal", wordBreak: "break-word" } },
      loEntry.name,
    ),
    displayCheckboxes
      ? React.createElement(Checkbox, {
          className: "entry-checkbox",
          checked: loEntry.enabled,
          disabled: isLocked(loEntry),
          onChange: onToggle,
        })
      : null,
    contextMenu?.itemId === loEntry.id
      ? React.createElement(FbloContextMenu, {
          x: contextMenu.x,
          y: contextMenu.y,
          item: loEntry,
          loadOrder,
          profile,
          dispatch,
          context,
          selectedIds,
          onClose: () => setContextMenu(null),
        })
      : null,
  );
} //*/

//Right-click context menu for load order entries (single + multi-select)
function FbloContextMenu({
  x,
  y,
  item,
  loadOrder,
  profile,
  dispatch,
  context,
  selectedIds,
  onClose,
}) {
  useDismissOnOutside(onClose);

  useInjectStyleOnce("ue4ss-ctx-menu-style", LO_CTX_MENU_CSS);

  const [menuPosition, clampRef] = useClampedMenuPosition(x, y);

  const isLocked = (e) => [true, "true", "always"].includes(e?.locked);
  const isMulti = selectedIds.size >= 2 && selectedIds.has(item.id);
  const targets = isMulti ? loadOrder.filter((e) => selectedIds.has(e.id)) : [item];

  const applyToTargets = (transform, serialize = false) => {
    const newLO = transform(loadOrder, targets);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
    if (serialize) serializeLoadOrder(context, newLO);
    onClose();
  };

  const isEntryLocked = isLocked(item);
  const isEntryEnabled = item.enabled ?? true;

  const gameDir = getDiscoveryPath(context.api);
  const isModEnabled = (e) => profile?.modState?.[e.modId]?.enabled ?? false;
  const setVortexEnabled = (entries, enabled) => {
    //One Vortex mod can own several load order rows on file-based games (LO_ATTRIBUTE is an array
    //of basenames), so a multi-select can list the same modId more than once - dedupe before dispatch.
    const modIds = [...new Set(entries.filter((e) => e.modId !== undefined).map((e) => e.modId))];
    if (modIds.length > 0) {
      actions.setModsEnabled(context.api, profile.id, modIds, enabled, { allowAutoDeploy: true });
    }
    onClose();
  };
  const openModFolders = (entries) => {
    entries
      .filter((e) => e.id !== undefined)
      .forEach((e) => {
        try {
          window.api.shell.openFile(path.join(gameDir, RMMMOD_PATH, e.id));
        } catch (err) {
          context.api.showErrorNotification("Failed to open the file or folder", err, {
            allowReport: false,
          });
        }
      });
    onClose();
  };
  const itemVortexEnabled = isModEnabled(item);
  const modPageUrl = getModPageURL(context.api, item.modId);
  const stagingFolder = getModStagingFolder(context.api, item.modId);

  const menuStyle = {
    position: "fixed",
    left: menuPosition.left,
    top: menuPosition.top,
    zIndex: 9999,
    background: "#1e1e1e",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 4,
    padding: "4px 0",
    minWidth: 180,
    boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
  };
  const itemStyle = { padding: "6px 16px", cursor: "pointer", whiteSpace: "nowrap" };
  const sepStyle = { borderTop: "1px solid rgba(255,255,255,0.1)", margin: "4px 0" };

  const menuItem = (label, onClick) =>
    React.createElement(
      "div",
      {
        className: "ue4ss-ctx-item",
        style: itemStyle,
        onClick: (evt) => {
          evt.stopPropagation();
          onClick();
        },
      },
      label,
    );

  if (isMulti) {
    const n = targets.length;
    return React.createElement(
      "div",
      { ref: clampRef, style: menuStyle },
      menuItem(`Enable Selected (${n})`, () =>
        applyToTargets((lo) =>
          lo.map((e) => (targets.find((t) => t.id === e.id) ? { ...e, enabled: true } : e)),
        ),
      ),
      menuItem(`Disable Selected (${n})`, () =>
        applyToTargets((lo) =>
          lo.map((e) => (targets.find((t) => t.id === e.id) ? { ...e, enabled: false } : e)),
        ),
      ),
      React.createElement("div", { style: sepStyle }),
      menuItem(`Lock Selected (${n})`, () =>
        applyToTargets(
          (lo) => lo.map((e) => (targets.find((t) => t.id === e.id) ? { ...e, locked: true } : e)),
          true,
        ),
      ),
      menuItem(`Unlock Selected (${n})`, () =>
        applyToTargets(
          (lo) => lo.map((e) => (targets.find((t) => t.id === e.id) ? { ...e, locked: false } : e)),
          true,
        ),
      ),
      React.createElement("div", { style: sepStyle }),
      menuItem(`Move to Top (${n})`, () =>
        applyToTargets((lo) => {
          //Locked entries hold their absolute index - only the unlocked entries reorder into the slots between them
          const selected = lo.filter((e) => targets.find((t) => t.id === e.id) && !isLocked(e));
          const rest = lo.filter((e) => !isLocked(e) && !targets.find((t) => t.id === e.id));
          const reordered = [...selected, ...rest];
          let next = 0;
          return lo.map((e) => (isLocked(e) ? e : reordered[next++]));
        }),
      ),
      menuItem(`Move to Bottom (${n})`, () =>
        applyToTargets((lo) => {
          //Locked entries hold their absolute index - only the unlocked entries reorder into the slots between them
          const selected = lo.filter((e) => targets.find((t) => t.id === e.id) && !isLocked(e));
          const rest = lo.filter((e) => !isLocked(e) && !targets.find((t) => t.id === e.id));
          const reordered = [...rest, ...selected];
          let next = 0;
          return lo.map((e) => (isLocked(e) ? e : reordered[next++]));
        }),
      ),
      React.createElement("div", { style: sepStyle }),
      menuItem(`Open Mod Folders (${n})`, () => openModFolders(targets)),
      targets.some((t) => t.modId !== undefined)
        ? menuItem(`Open Staging Folders (${n})`, () => {
            //Several rows can resolve to the same staging folder on file-based games - dedupe so it opens once.
            const folders = [
              ...new Set(
                targets.map((t) => getModStagingFolder(context.api, t.modId)).filter(Boolean),
              ),
            ];
            folders.forEach((folder) => {
              try {
                window.api.shell.openFile(folder);
              } catch (err) {
                context.api.showErrorNotification("Failed to open the file or folder", err, {
                  allowReport: false,
                });
              }
            });
            onClose();
          })
        : null,
      React.createElement("div", { style: sepStyle }),
      menuItem(`Disable Vortex Mod (${n})`, () => setVortexEnabled(targets, false)),
    );
  }

  return React.createElement(
    "div",
    { ref: clampRef, style: menuStyle },
    menuItem(isEntryEnabled ? "Disable" : "Enable", () =>
      applyToTargets((lo) =>
        lo.map((e) => (e.id === item.id ? { ...e, enabled: !isEntryEnabled } : e)),
      ),
    ),
    menuItem(isEntryLocked ? "Unlock Position" : "Lock Position", () =>
      applyToTargets(
        (lo) => lo.map((e) => (e.id === item.id ? { ...e, locked: !isEntryLocked } : e)),
        true,
      ),
    ),
    React.createElement("div", { style: sepStyle }),
    menuItem("Move to Top", () =>
      applyToTargets((lo) => {
        if (isLocked(item)) return lo;
        //Locked entries hold their absolute index - only the unlocked entries reorder into the slots between them
        const moved = lo.filter((e) => !isLocked(e) && e.id === item.id);
        const rest = lo.filter((e) => !isLocked(e) && e.id !== item.id);
        const reordered = [...moved, ...rest];
        let next = 0;
        return lo.map((e) => (isLocked(e) ? e : reordered[next++]));
      }),
    ),
    menuItem("Move to Bottom", () =>
      applyToTargets((lo) => {
        if (isLocked(item)) return lo;
        //Locked entries hold their absolute index - only the unlocked entries reorder into the slots between them
        const moved = lo.filter((e) => !isLocked(e) && e.id === item.id);
        const rest = lo.filter((e) => !isLocked(e) && e.id !== item.id);
        const reordered = [...rest, ...moved];
        let next = 0;
        return lo.map((e) => (isLocked(e) ? e : reordered[next++]));
      }),
    ),
    React.createElement("div", { style: sepStyle }),
    menuItem("Open Mod Folder", () => openModFolders([item])),
    stagingFolder
      ? menuItem("Open Staging Folder", () => {
          try {
            window.api.shell.openFile(stagingFolder);
          } catch (err) {
            context.api.showErrorNotification("Failed to open the file or folder", err, {
              allowReport: false,
            });
          }
          onClose();
        })
      : null,
    modPageUrl
      ? menuItem("Open Mod Page", () => {
          try {
            window.api.shell.openUrl(modPageUrl);
          } catch (err) {
            context.api.showErrorNotification("Failed to open the URL", err, {
              allowReport: false,
            });
          }
          onClose();
        })
      : null,
    item.modId !== undefined ? React.createElement("div", { style: sepStyle }) : null,
    item.modId !== undefined
      ? menuItem(itemVortexEnabled ? "Disable Vortex Mod" : "Enable Vortex Mod", () =>
          setVortexEnabled([item], !itemVortexEnabled),
        )
      : null,
  );
}

function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    api.onAsync("did-deploy", async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      await releaseLoadOrderUpdateGuard(api, profileId);
      if (!hasEnabledModOfType(api, profileId, RMMMOD_ID)) return;
      return rmmDeployNotify(api);
    });
    //detect mod update (to maintain LO position)
    //fileId is the version being updated TO, and is what tells the new version apart from the
    //old one on deploy - without it every mod not yet updated still looks "already installed"
    api.events.on("mod-update", (gameId, modId, fileId) => {
      if (GAME_ID == gameId) {
        updateModIds.set(String(modId), {
          firstSeen: Date.now(),
          targetFileId: String(fileId ?? ""),
        });
      }
    });
    //detect batch mod update: the "Update all" button emits mods-update with LOCAL mod ids
    //and never emits mod-update, so resolve each one to its Nexus mod id before tracking it
    api.events.on("mods-update", (gameId, modIds) => {
      if (GAME_ID !== gameId) return;
      const mods = api.getState()?.persistent?.mods?.[GAME_ID] ?? {};
      for (const modId of modIds ?? []) {
        const nexusModId = mods[modId]?.attributes?.modId;
        if (nexusModId !== undefined) {
          updateModIds.set(String(nexusModId), {
            firstSeen: Date.now(),
            targetFileId: String(mods[modId]?.attributes?.newestFileId ?? ""),
          });
        }
      }
    });
    //detect mod removal (to maintain LO position) - match on the Nexus mod id
    //recorded in state (attributes.modId), not the local modId string: the
    //local id's naming convention varies by when the mod was originally
    //downloaded (older dash-delimited vs current space-delimited), so string
    //parsing silently misses old installs.
    api.events.on("remove-mod", (gameMode, modId) => {
      const removedMod = api.getState()?.persistent?.mods?.[GAME_ID]?.[modId] ?? undefined;
      const nexusModId = removedMod?.attributes?.modId;
      if (nexusModId !== undefined && updateModIds.has(String(nexusModId))) {
        mod_update_all_profile = true;
      }
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
