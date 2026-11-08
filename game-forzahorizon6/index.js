/*///////////////////////////////////////////
Name: Forza Horizon 6 Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 2.0.1
Date: 2026-11-01
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
//const winapi = require('winapi-bindings');

/*const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow'); //*/
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "forzahorizon6";
const STEAMAPP_ID = "2483190"; // https://steamdb.info/app/2483190/
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = "Microsoft.ForteBaseGame"; // https://apps.microsoft.com/detail/9nr1r1xwlcnb
const XBOXEXECNAME = "Forzahorizon6";
const XBOX_PUB_ID = "8wekyb3d8bbwe"; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const INSTALL_HIVE = "HKEY_LOCAL_MACHINE"; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\XXX\\XXX`; //for finding install in registry - requires winapi-bindings
const INSTALL_VALUE = "XXX"; //often InstallDir or InstallPath
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, XBOXAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "Forza Horizon 6";
const GAME_NAME_SHORT = "Forza Horizon 6";
const BINARIES_PATH = path.join(".");
const EXEC_NAME = "forzahorizon6.exe";
const EXEC = EXEC_NAME;
const EXEC_EGS = EXEC; //change other versions if different than Steam/default
const EXEC_GOG = EXEC;
const EXEC_DEMO = EXEC;
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Forza_Horizon_6";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1913"; //Nexus link to this extension. Used for links

//feature toggles
const hasLoader = false; //true if game needs a mod loader
const hasXbox = true; //toggle for Xbox version logic
const multiExe = false; //set to true if there are multiple executable names
const multiModPath = false; //set to true if there are multiple possible mod paths (i.e. different path for Xbox version)
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const needsModInstaller = false; //set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing
const rootInstaller = true; //enable root installer. Set false if you need to avoid installer collisions
const looseInstaller = true; //enable installer that places loose media files into the matching mediapc sub-folder
const nestedZipInstaller = true; //enable installer that re-zips car/sky mods into the matching mediapc sub-folder
const saveInstaller = false; //enable save installer. Set false if path is outside of game folder
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const hasUserIdFolder = true; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
let binariesInstaller = false;
const debug = false; //toggle for debug mode

//info for modtypes, installers, tools, and actions
const DATA_FOLDER = "media";
const MEDIAPC_FOLDER = "mediapc";
let ROOT_FOLDERS = [DATA_FOLDER, MEDIAPC_FOLDER];
const ROOTSUB_FOLDERS = [
  "animation",
  "audio",
  "brakes",
  "camera",
  "cars",
  "charactercustomisation",
  "cinematic_assets",
  "cinematics",
  "colourgrades",
  "crowds",
  "crowds_autumn",
  "crowds_spring",
  "crowds_winter",
  "deformableterrain",
  "displaymappers",
  "dynamicpost",
  "gametunablesettings",
  "graphicscache",
  "hdrskies",
  "inputmappingprofiles",
  "lensflare",
  "livery",
  "nerddata",
  "objectmodelgame",
  "openworld",
  "particles",
  "particlesmodels",
  "performance",
  "physics",
  "popcornfx",
  "posteffects",
  "profileschema",
  "rendering",
  "renderscenarios",
  "rules",
  "shadersdxil",
  "sky",
  "stateflow",
  "stripped",
  "timeofday",
  "tracks",
  "ui",
  "water",
  "weather",
  "weathertextures",
  "wheeltunablesettingspc",
  "_library", //last - can also be a subfolder of other folders
];
const ROOTSUB_PATH = MEDIAPC_FOLDER;

const CONFIGMOD_LOCATION = LOCALAPPDATA;
const SAVEMOD_LOCATION = LOCALAPPDATA;
const APPDATA_FOLDER = path.join("ForzaHorizon6", "LocalStorage_Shared");
const CONFIG_FOLDERNAME = "";
const SAVE_FOLDERNAME = "";

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

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Mod";
const MOD_PATH = ".";
const MOD_PATH_XBOX = MOD_PATH;
const MOD_EXTS = [".XXX"];

const LOADER_ID = `${GAME_ID}-loader`;
const LOADER_NAME = "Mod Loader";
const LOADER_PATH = BINARIES_PATH;
const LOADER_FILE = "XXX.dll";
const LOADER_PAGE_NO = 0;
const LOADER_FILE_NO = 0;
const LOADER_DOMAIN = GAME_ID;
const LOADER_URL = `XXX`; //if not on Nexus

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const LOOSE_ID = `${GAME_ID}-loosemedia`;
const LOOSE_NAME = "Loose Files";
const LOOSE_PATH = MEDIAPC_FOLDER;
const LOOSE_IGNORE_EXTS = [".txt", ".md", ".pdf", ".url", ".html", ".png", ".jpg"]; //readme-type files dropped when the game has no file by that name

const CAR_ID = `${GAME_ID}-car`;
const CAR_NAME = "Car Mod";
const CAR_PATH = path.join(MEDIAPC_FOLDER, "cars");

const SKY_ID = `${GAME_ID}-sky`;
const SKY_NAME = "Sky Mod";
const SKY_PATH = path.join(MEDIAPC_FOLDER, "hdrskies");

const NESTEDZIP_ID = `${GAME_ID}-nestedzip`;
const NESTEDZIP_NAME = "Car / Sky Zip";
//Mods that replace a whole zip inside a media sub-folder. Vortex extracts them, so they are re-zipped under the name of the zip they replace
const NESTED_ZIP_KINDS = [
  {
    folder: "cars",
    label: "car",
    modTypeId: CAR_ID,
    markerExts: [".carbin"],
    markerFiles: [],
    defaultFromMarker: true,
  },
  {
    folder: "hdrskies",
    label: "sky",
    modTypeId: SKY_ID,
    markerExts: [],
    markerFiles: ["framedata.xml"],
    defaultFromMarker: false,
  },
];

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
    USERID_FOLDER = SAVE_ARRAY.find(
      (entry) => isDir(SAVE_FOLDER, entry) && entry.includes("User_"),
    );
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
  "LocalCache",
  "Local",
  "LocalStorage_Shared",
); //XBOX Version
if (hasUserIdFolder) {
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER_XBOX);
    USERID_FOLDER = SAVE_ARRAY.find(
      (entry) => isDir(SAVE_FOLDER, entry) && entry.includes("User_"),
    );
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
const CONFIG_PATH_XBOX = path.join(
  LOCALAPPDATA,
  "Packages",
  `${XBOXAPP_ID}_${XBOX_PUB_ID}`,
  "LocalCache",
  "Local",
  "LocalStorage_Shared",
); //XBOX Version
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
if (!needsModInstaller) {
  MOD_PATH_DEFAULT = ".";
}
const REQ_FILE = EXEC;
const PARAMETERS_STRING = "";
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [DATA_FOLDER];
if (needsModInstaller) {
  MODTYPE_FOLDERS.push(MOD_PATH);
}
if (saveInstaller) {
  MODTYPE_FOLDERS.push(SAVE_PATH);
}
if (looseInstaller) {
  MODTYPE_FOLDERS.push(LOOSE_PATH);
}
if (nestedZipInstaller) {
  MODTYPE_FOLDERS.push(CAR_PATH, SKY_PATH);
}
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
if (looseInstaller) {
  spec.modTypes.push({
    id: LOOSE_ID,
    name: LOOSE_NAME,
    priority: "high",
    targetPath: path.join("{gamePath}", LOOSE_PATH),
  });
}
if (nestedZipInstaller) {
  spec.modTypes.push(
    {
      id: CAR_ID,
      name: CAR_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", CAR_PATH),
    },
    {
      id: SKY_ID,
      name: SKY_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", SKY_PATH),
    },
  );
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
    //parameters: PARAMETERS,
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
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
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
  files = files.filter(
    (file) => !file.toLowerCase().includes("backup") && !file.toLowerCase().includes("original"),
  ); //!risky, but fixes some poorly packaged mods
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map((str) => str.toLowerCase());
  const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map((str) => str.toLowerCase());
  let folder = "";
  let modFile = files.find((file) =>
    ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()),
  );
  if (modFile === undefined) {
    // Shallowest match wins, so a sub-folder nested inside another (e.g. "cars\_library") is not picked over its parent.
    const depth = (file) => file.split(path.sep).filter(Boolean).length;
    modFile = files
      .filter((file) => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()))
      .sort((a, b) => depth(a) - depth(b))[0];
    folder = ROOTSUB_PATH;
  }
  const ROOT_IDX = path.basename(modFile); //!don't use path.sep since some sub-items are files
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

//Find the car/sky marker file closest to the archive root
function findNestedZipMarker(files) {
  for (const kind of NESTED_ZIP_KINDS) {
    const markers = files.filter((file) => {
      if (file.endsWith(path.sep)) return false;
      const name = path.basename(file).toLowerCase();
      return kind.markerExts.includes(path.extname(name)) || kind.markerFiles.includes(name);
    });
    if (markers.length) {
      const depth = (file) => file.split(path.sep).length;
      return { kind, marker: markers.sort((a, b) => depth(a) - depth(b))[0] };
    }
  }
  return undefined;
}

//Installer test for car/sky mods that replace a whole zip
function testNestedZip(files, gameId) {
  //a mod already laid out in a media/mediapc folder installs as packaged (Root installer)
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map((str) => str.toLowerCase());
  const hasRootFolder = files.some((file) =>
    ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()),
  );
  let supported =
    gameId === spec.game.id && !hasRootFolder && findNestedZipMarker(files) !== undefined;

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

//Names (without ".zip") of the zips in a media sub-folder, in the game's casing
const NESTED_ZIP_NAMES = {};
async function getNestedZipNames(kind) {
  if (!NESTED_ZIP_NAMES[kind.folder]?.length) {
    const entries = await fsp
      .readdir(path.join(GAME_PATH, DATA_FOLDER, kind.folder))
      .catch(() => []);
    NESTED_ZIP_NAMES[kind.folder] = entries
      .filter((entry) => path.extname(entry).toLowerCase() === ".zip")
      .map((entry) => path.basename(entry, path.extname(entry)));
  }
  return NESTED_ZIP_NAMES[kind.folder];
}

//Ask which car/sky the mod replaces. Re-asks until the name matches a zip in the game
async function askNestedZipName(api, kind, defaultName, knownNames) {
  const NAME_INPUT_ID = "zipName";
  let value = defaultName;
  let error = "";
  for (;;) {
    const listText =
      knownNames.length && knownNames.length <= 50 ? `\n\nAvailable: ${knownNames.join(", ")}` : "";
    const result = await api.showDialog(
      "question",
      `${NESTEDZIP_NAME} - choose the ${kind.label}`,
      {
        text:
          `${error}This mod replaces one ${kind.label} in the game's "${DATA_FOLDER}\\${kind.folder}" folder. ` +
          `Vortex packs it into a zip in "${MEDIAPC_FOLDER}\\${kind.folder}" named after the ${kind.label} it replaces.\n\n` +
          `Enter the name of the ${kind.label} to replace (the zip file name without ".zip"). ` +
          `The mod page usually says which one.${listText}`,
        input: [{ id: NAME_INPUT_ID, type: "text", label: `${kind.label} name`, value }],
      },
      [{ label: "Cancel" }, { label: "Install", default: true }],
    );
    if (result.action !== "Install") throw new util.UserCanceled();
    value = (result.input[NAME_INPUT_ID] ?? "").trim().replace(/\.zip$/i, "");
    if (!value) {
      error = `Enter a ${kind.label} name.\n\n`;
      continue;
    }
    if (!knownNames.length) return value; //game folder not readable - trust the user
    const match = knownNames.find((name) => name.toLowerCase() === value.toLowerCase());
    if (match) return match;
    error = `"${value}" is not a ${kind.label} in this game.\n\n`;
  }
}

//Installer install car/sky mods - re-zip the contents under the name of the zip they replace
async function installNestedZip(api, files, destinationPath) {
  const { kind, marker } = findNestedZipMarker(files);
  const knownNames = await getNestedZipNames(kind);
  const defaultName = kind.defaultFromMarker ? path.basename(marker, path.extname(marker)) : "";
  const zipName = (await askNestedZipName(api, kind, defaultName, knownNames)) + ".zip";
  const markerDir = path.dirname(marker);
  const sourceDir = markerDir === "." ? destinationPath : path.join(destinationPath, markerDir);
  const entries = await fsp.readdir(sourceDir);
  await new util.SevenZip().add(
    path.join(destinationPath, zipName),
    entries.map((entry) => path.join(sourceDir, entry)),
    { raw: ["-r"] },
  );
  const instructions = [
    { type: "copy", source: zipName, destination: zipName },
    { type: "setmodtype", value: kind.modTypeId },
  ];
  return Promise.resolve({ instructions });
}

//Index of every file the game reads from the media folder: lowercase file name -> Map(lowercase folder -> folder in game casing).
//Top-level media zips read as folders of the same name, so their contents are indexed under that name. Built once per session
let MEDIA_INDEX_PATH = "";
let MEDIA_INDEX_PROMISE = undefined;
function getMediaIndex(gamePath) {
  if (MEDIA_INDEX_PROMISE === undefined || MEDIA_INDEX_PATH !== gamePath) {
    MEDIA_INDEX_PATH = gamePath;
    MEDIA_INDEX_PROMISE = buildMediaIndex(gamePath).catch((err) => {
      MEDIA_INDEX_PROMISE = undefined;
      throw err;
    });
  }
  return MEDIA_INDEX_PROMISE;
}

//List the files (not folders) inside a zip. Vortex's node-7z hands entries ({ name, attr }) to a progress callback
async function listZipFiles(zipPath) {
  const entries = [];
  await new util.SevenZip().list(zipPath, {}, (batch) => {
    for (const entry of batch) {
      if (!(entry.attr ?? "").includes("D")) entries.push(entry.name);
    }
  });
  return entries;
}

async function buildMediaIndex(gamePath) {
  const mediaPath = path.join(gamePath, DATA_FOLDER);
  const index = new Map();
  const add = (name, folder) => {
    const key = name.toLowerCase();
    if (!index.has(key)) index.set(key, new Map());
    index.get(key).set(folder.toLowerCase(), folder);
  };
  const topZips = [];
  await util.walk(
    mediaPath,
    (iterPath, stats) => {
      if (stats.isDirectory()) return Promise.resolve();
      const rel = path.relative(mediaPath, iterPath);
      const folder = path.dirname(rel) === "." ? "" : path.dirname(rel);
      if (folder === "" && path.extname(rel).toLowerCase() === ".zip") topZips.push(rel);
      else add(path.basename(rel), folder);
      return Promise.resolve();
    },
    { ignoreErrors: true },
  );
  for (const zip of topZips) {
    const zipFolder = path.basename(zip, path.extname(zip));
    try {
      for (const entry of await listZipFiles(path.join(mediaPath, zip))) {
        const inner = path.dirname(entry.replace(/[\\/]/g, path.sep));
        add(path.basename(entry), inner === "." ? zipFolder : path.join(zipFolder, inner));
      }
    } catch (err) {
      log("warn", `${GAME_NAME} ${LOOSE_NAME}: could not list "${zip}"`, { error: err.message });
    }
  }
  return index;
}

const splitFolder = (folder) => (folder === "." ? [] : folder.split(path.sep).filter(Boolean));

//Number of trailing folder names two folder paths share (case-insensitive)
function sharedTail(a, b) {
  let n = 0;
  while (
    n < a.length &&
    n < b.length &&
    a[a.length - 1 - n].toLowerCase() === b[b.length - 1 - n].toLowerCase()
  ) {
    n++;
  }
  return n;
}

//Work out where each loose mod file goes in mediapc. Returns undefined when any file can't be placed.
//A file name found in one place in the game goes there. Those files also show how the mod's own folders line up with
//the game's (mod folder -> game folder), which places the rest: names found in several places and files the game doesn't have
function resolveLoose(files, index) {
  const modFiles = files.filter((file) => !file.endsWith(path.sep));
  if (modFiles.some((file) => BINARIES_EXTS.includes(path.extname(file).toLowerCase())))
    return undefined;
  const votes = new Map(); //mod folder prefix -> Map(game folder prefix -> vote)
  let hits = 0;
  for (const file of modFiles) {
    const locations = index.get(path.basename(file).toLowerCase());
    if (!locations) continue;
    hits++;
    if (locations.size !== 1) continue;
    const modFolder = splitFolder(path.dirname(file));
    const gameFolder = splitFolder([...locations.values()][0]);
    const shared = sharedTail(modFolder, gameFolder);
    const modPrefix = modFolder.slice(0, modFolder.length - shared);
    const gamePrefix = gameFolder.slice(0, gameFolder.length - shared);
    const modKey = modPrefix.join(path.sep).toLowerCase();
    const gameKey = gamePrefix.join(path.sep).toLowerCase();
    if (!votes.has(modKey)) votes.set(modKey, new Map());
    const vote = votes.get(modKey).get(gameKey) ?? { modPrefix, gamePrefix, count: 0 };
    vote.count++;
    votes.get(modKey).set(gameKey, vote);
  }
  const counted = modFiles.filter(
    (file) =>
      index.has(path.basename(file).toLowerCase()) ||
      !LOOSE_IGNORE_EXTS.includes(path.extname(file).toLowerCase()),
  );
  if (hits === 0 || hits * 2 < counted.length) return undefined; //mostly files the game doesn't have - not a loose media mod
  const mappings = [...votes.values()]
    .map((options) => [...options.values()].sort((a, b) => b.count - a.count)[0])
    .sort((a, b) => b.modPrefix.length - a.modPrefix.length); //most specific mod folder first
  const sameFolder = (a, b) =>
    a.length === b.length && a.every((seg, i) => seg.toLowerCase() === b[i].toLowerCase());
  const placements = [];
  for (const file of modFiles) {
    const name = path.basename(file);
    const modFolder = splitFolder(path.dirname(file));
    const locations = index.get(name.toLowerCase());
    if (!locations && LOOSE_IGNORE_EXTS.includes(path.extname(name).toLowerCase())) continue;
    let target;
    if (locations?.size === 1) {
      target = splitFolder([...locations.values()][0]);
    } else {
      const mapping = mappings.find((m) =>
        m.modPrefix.every((seg, i) => modFolder[i]?.toLowerCase() === seg.toLowerCase()),
      );
      const mapped = mapping && [
        ...mapping.gamePrefix,
        ...modFolder.slice(mapping.modPrefix.length),
      ];
      if (locations) {
        const candidates = [...locations.values()].map(splitFolder);
        target =
          mapped && candidates.some((c) => sameFolder(c, mapped))
            ? mapped
            : candidates.sort(
                (a, b) =>
                  sharedTail(modFolder, b) - sharedTail(modFolder, a) || a.length - b.length,
              )[0];
      } else if (mapped) {
        target = mapped;
      } else {
        return undefined;
      }
    }
    placements.push({ source: file, destination: path.join(...target, name) }); //relative to mediapc (Loose Files mod type)
  }
  return placements.length ? placements : undefined;
}

//Installer test for loose media files
async function testLoose(files, gameId) {
  let supported = gameId === spec.game.id && GAME_PATH !== "";

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
  if (supported) {
    try {
      supported = resolveLoose(files, await getMediaIndex(GAME_PATH)) !== undefined;
    } catch (err) {
      log("warn", `${GAME_NAME} ${LOOSE_NAME}: could not index the media folder`, {
        error: err.message,
      });
      supported = false;
    }
  }

  return {
    supported,
    requiredFiles: [],
  };
}

//Installer install loose media files into the matching mediapc sub-folder
async function installLoose(files) {
  const placements = resolveLoose(files, await getMediaIndex(GAME_PATH)) ?? [];
  const instructions = placements.map(({ source, destination }) => ({
    type: "copy",
    source,
    destination,
  }));
  instructions.push({ type: "setmodtype", value: LOOSE_ID });
  return { instructions };
}

//Fallback installer to Binaries folder
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

//Fallback installer to Binaries folder
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
async function downloadLoader(api, gameSpec) {
  let isInstalled = isLoaderInstalled(api, gameSpec);
  if (!isInstalled) {
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
  GAME_VERSION = await setGameVersion(GAME_PATH);
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
  if (nestedZipInstaller) {
    //before Root - car mods carry folders (e.g. "UI") the Root installer also matches
    context.registerInstaller(NESTEDZIP_ID, 26, testNestedZip, (files, destinationPath) =>
      installNestedZip(context.api, files, destinationPath),
    );
  }
  if (rootInstaller) {
    context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  }
  if (looseInstaller) {
    context.registerInstaller(LOOSE_ID, 28, testLoose, installLoose);
  }
  if (binariesInstaller) {
    context.registerInstaller(BINARIES_ID, 29, testBinaries, installBinaries);
  }
  //context.registerInstaller(CONFIG_ID, 31, testConfig, installConfig);
  if (saveInstaller) {
    context.registerInstaller(SAVE_ID, 33, testSave, installSave);
  }
  if (needsModInstaller) {
    context.registerInstaller(MOD_ID, 35, testMod, installMod);
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
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
