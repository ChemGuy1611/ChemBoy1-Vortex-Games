/*///////////////////////////////////////////
Name: Lobotomy Corporation Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 1.0.1
Date: 2026-09-08
Notes:
- The BaseMod loader is the Lobotomy Mod Manager (LMM) release archive, downloaded from GitHub.
  Only the patcher's PatchFiles folder is deployed, and the prebuilt patched assembly is used in
  place of the vanilla one, so Vortex never has to run the Patchwork/Cecil patch step.
- Mods install to LobotomyCorp_Data/BaseMods/`<Archive Name>`/ and are enabled and ordered through
  LobotomyCorp_Data/BaseMods/BaseModList_v2.xml.
///////////////////////////////////////////*/

//Import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const { parseStringPromise } = require("xml2js");
const {
  download,
  findModByFile,
  findDownloadIdByFile,
  resolveVersionByPattern,
  testRequirementVersion,
} = require("./downloader");
const React = require("react");
//const winapi = require('winapi-bindings');

const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, "AppData", "LocalLow");
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "lobotomycorporation";
const STEAMAPP_ID = "568220"; // https://steamdb.info/app/568220/
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = "Game";
const XBOX_PUB_ID = "XXX"; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const INSTALL_HIVE = "HKEY_LOCAL_MACHINE"; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\XXX\\XXX`; //for finding install in registry - requires winapi-bindings
const INSTALL_VALUE = "XXX"; //often InstallDir or InstallPath
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "Lobotomy Corporation";
const GAME_NAME_SHORT = "Lobotomy Corporation";
const BINARIES_PATH = path.join(".");
const EXEC_NAME = "LobotomyCorp.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const EXEC_EGS = EXEC; //change other versions if different than Steam/default
const EXEC_GOG = EXEC;
const EXEC_DEMO = EXEC;
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Lobotomy_Corporation";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/2278"; //Nexus link to this extension. Used for links

//feature toggles
const hasLoader = true; //true if game needs a mod loader
const LOAD_ORDER_ENABLED = true; //enable the load order page backed by BaseModList_v2.xml
const nexusCreditDownload = true; //true to also download the mod loader's official Nexus release, so its mod page gets the download credit
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
const hasUserIdFolder = false; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
let binariesInstaller = false;
if (BINARIES_PATH !== ".") binariesInstaller = true; //only enable Binaries installer if not in root
const debug = false; //toggle for debug mode

//info for modtypes, installers, tools, and actions
const DATA_FOLDER = "LobotomyCorp_Data";
let ROOT_FOLDERS = [DATA_FOLDER];
if (BINARIES_PATH !== ".") ROOT_FOLDERS.push(BINARIES_PATH.split(path.sep)[0]);
const ROOTSUB_FOLDERS = [];
const ROOTSUB_PATH = DATA_FOLDER;

const CONFIGMOD_LOCATION = LOCALLOW;
const SAVEMOD_LOCATION = LOCALLOW;
const APPDATA_FOLDER = path.join("Project_Moon");
const CONFIG_FOLDERNAME = "Lobotomy";
const SAVE_FOLDERNAME = "Lobotomy";

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

const MANAGED_PATH = path.join(DATA_FOLDER, "Managed");

const LOADER_ID = `${GAME_ID}-loader`;
const LOADER_NAME = "BaseMod Loader";
const LOADER_PATH = MANAGED_PATH;
const LOADER_FILE = "LobotomyBaseModLib.dll"; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.
//The loader archive is the whole Lobotomy Mod Manager application. Only the folder holding
//LOADER_FILE is deployed, and inside it the prebuilt patched assembly takes the vanilla one's
//name. The vanilla assembly and the Patchwork input are never deployed: the patcher writes the
//vanilla copy only so it has something to patch over, and Vortex takes its already-patched
//result instead of running the patch step.
const LOADER_PATCH_FOLDER = "PatchFiles";
const LOADER_ASSEMBLY_PATCHED = "Assembly-CSharp_patched.dll";
const LOADER_ASSEMBLY_VANILLA = "Assembly-CSharp.dll";
const LOADER_PATCH_INPUT = "Lobotomypatch.dll";

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "BaseMod";
const MOD_PATH = path.join(DATA_FOLDER, "BaseMods");
const MOD_PATH_XBOX = MOD_PATH;
const MOD_EXTS = [".dll"];
//Folder names the loader accepts as proof that a folder is a mod root. A mod may also be a
//bare dll, so a loose dll counts too.
const MOD_FOLDERS = ["Info", "Creature", "Equipment", "Localize"];
const MOD_INFO_FOLDER = "Info";
const MOD_INFO_FILE = "info.xml";
const MOD_INFO_LANGS = ["en", "kr"]; //languages the loader falls back to, in order

//The loader reads this list from the mods folder and loads the folders it names, in order, when
//Useit is true. Folders it does not name load afterwards and are always on, which is what the
//load order page mirrors. The file is an XmlSerializer dump of the loader's own ModListXml type,
//so it is rebuilt whole rather than merged - the mod manager rewrites it the same way.
const LO_FILE = "BaseModList_v2.xml";
const LO_ATTRIBUTE = "modFolderName"; //mod attribute holding the folder name, set by the installer
const LO_IMAGE_WIDTH = 96; //Width of the load order thumbnail image
const LO_IMAGE_HEIGHT = LO_IMAGE_WIDTH * 0.5625;
const LO_FILE_HEADER =
  '<?xml version="1.0" encoding="utf-8"?>\r\n' +
  '<ModListXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\r\n' +
  "  <list>";
const LO_FILE_FOOTER = "  </list>\r\n</ModListXml>";

//Load order is frozen while a mod update is mid-flight: Vortex briefly removes the old mod before
//the new one lands, and rebuilding the order from disk in that window would drop the mod's entry.
let mod_update_all_profile = false;
let updateModIds = new Map(); // Nexus mod id -> {firstSeen, targetFileId} (Map, not scalar, so batch updates don't clobber each other)
const MAX_UPDATE_WAIT_MS = 5 * 60 * 1000; // release the guard for an update that never lands (cancelled or failed install)
let updating_mod = false; // used to see if it's a mod update or not

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

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

// Information for the BASEMOD LOADER downloader and updater
const LOADER_AUTHOR = "LobotomyBaseMod";
const LOADER_REPO = "LMM";
const LOADER_VERSION = "1.3.9";
const LOADER_ARC_NAME = `Lobotomy.Mod.Manager.${LOADER_VERSION}.zip`;
const LOADER_URL_API = `https://api.github.com/repos/${LOADER_AUTHOR}/${LOADER_REPO}`;

const REQUIREMENTS = [
  {
    //BASEMOD LOADER (Lobotomy Mod Manager)
    archiveFileName: LOADER_ARC_NAME,
    modType: LOADER_ID,
    assemblyFileName: LOADER_FILE,
    userFacingName: LOADER_NAME,
    githubUrl: LOADER_URL_API,
    findMod: (api) => findModByFile(api, LOADER_ID, LOADER_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, LOADER_ARC_NAME),
    //anchored on the extension so the sibling Updater asset in the same release can never match
    fileArchivePattern: new RegExp(/^Lobotomy\.Mod\.Manager\.(\d+\.\d+\.\d+)\.zip$/, "i"),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
  },
];

//The mod manager's Nexus Mods page, which lives on the "site" domain rather than the game's own.
//Its build trails the GitHub releases - GitHub has been the update channel since LMM 1.2.0 - so the
//archive is only downloaded, never installed: the point is to give the mod page the download credit.
const LOADER_PAGE_NO = 765;
const LOADER_FILE_NO = 5358;
const LOADER_DOMAIN = "site";
const LOADER_NEXUS_NAME = `${LOADER_NAME} (Nexus Release)`;
//Remembered in Vortex's settings so the courtesy download happens exactly once, no matter how often
//the loader is reinstalled or the download is cleared out of the Downloads tab.
const SETTING_NEXUS_CREDIT_DOWNLOADED = "nexusInstallerDownloaded";
const SET_NEXUS_CREDIT_DOWNLOADED = `SET_${GAME_ID.toUpperCase()}_NEXUS_CREDIT_DOWNLOADED`;
function setNexusInstallerDownloaded(value) {
  return { type: SET_NEXUS_CREDIT_DOWNLOADED, payload: value };
}
setNexusInstallerDownloaded.toString = () => SET_NEXUS_CREDIT_DOWNLOADED;

let MOD_PATH_DEFAULT = MOD_PATH;
//if (!needsModInstaller) MOD_PATH_DEFAULT = '.';
let REQ_FILE = EXEC;
if (multiExe) REQ_FILE = DATA_FOLDER;
const PARAMETERS_STRING = "";
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [BINARIES_PATH];
if (needsModInstaller) MODTYPE_FOLDERS.push(MOD_PATH);
if (saveInstaller) MODTYPE_FOLDERS.push(SAVE_PATH);
if (hasLoader) MODTYPE_FOLDERS.push(LOADER_PATH);
const IGNORE_CONFLICTS = [path.join("**", "changelog*"), path.join("**", "readme*")];
const IGNORE_DEPLOY = [path.join("**", "changelog*"), path.join("**", "readme*")];

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
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
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

//The release archive ships the loader assembly twice: once beside the patcher's own Cecil and
//Patchwork tooling, and once in PatchFiles, which is the set the patcher actually copies into the
//game. Prefer the PatchFiles copy, and fall back to any copy so a hand-packed archive holding
//only the contents of PatchFiles still installs.
function getLoaderRoot(files) {
  const inPatchFiles = files.find(
    (file) =>
      path.basename(file) === LOADER_FILE &&
      path.basename(path.dirname(file)).toLowerCase() === LOADER_PATCH_FOLDER.toLowerCase(),
  );
  const modFile = inPatchFiles ?? files.find((file) => path.basename(file) === LOADER_FILE);
  return modFile === undefined ? null : path.dirname(modFile);
}

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
  const rootPath = getLoaderRoot(files);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const idx = rootPrefix.length;
  const setModTypeInstruction = { type: "setmodtype", value: MOD_TYPE };

  // Keep only the folder holding the loader assembly - the rest of the archive is the mod
  // manager application, which the game never sees. The vanilla assembly and the Patchwork
  // input are dropped: the patched assembly below takes the vanilla one's place.
  const filtered = files.filter(
    (file) =>
      file.startsWith(rootPrefix) &&
      !file.endsWith(path.sep) &&
      path.basename(file) !== LOADER_ASSEMBLY_VANILLA &&
      path.basename(file) !== LOADER_PATCH_INPUT,
  );
  const instructions = filtered.map((file) => {
    let destination = file.substring(idx);
    if (path.basename(file) === LOADER_ASSEMBLY_PATCHED) {
      destination = path.join(path.dirname(destination), LOADER_ASSEMBLY_VANILLA);
    }
    return {
      type: "copy",
      source: file,
      destination: destination,
    };
  });
  if (!filtered.some((file) => path.basename(file) === LOADER_ASSEMBLY_PATCHED)) {
    log(
      "warn",
      `${LOADER_ASSEMBLY_PATCHED} is missing from ${rootPath} - the game assembly will not be patched`,
    );
  }
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Find the folder inside a mod archive that the loader would treat as the mod root. The loader
//looks for one of its marker folders and otherwise accepts a bare dll, and it walks down through
//wrapper folders until it finds one, so a mod packed one or more levels deep still installs flat.
//Returns a path relative to the archive root, '' for the archive root itself, or null when the
//archive holds nothing the loader recognises.
function getModRoot(files) {
  const MARKERS = MOD_FOLDERS.map((folder) => folder.toLowerCase());
  let root = null;
  let depth = Number.MAX_SAFE_INTEGER;

  files.forEach((file) => {
    const segments = file.split(/[\\/]/).filter((segment) => segment !== "");
    // a trailing separator means the entry is itself a folder, so its last segment counts
    const limit = file.endsWith(path.sep) ? segments.length : segments.length - 1;
    for (let index = 0; index < limit; index++) {
      if (MARKERS.includes(segments[index].toLowerCase()) && index < depth) {
        depth = index;
        root = segments.slice(0, index).join(path.sep);
      }
    }
  });
  if (root !== null) {
    return root;
  }

  // no marker folder - the loader also accepts a bare dll, so take the shallowest one
  files.forEach((file) => {
    if (file.endsWith(path.sep) || !MOD_EXTS.includes(path.extname(file).toLowerCase())) {
      return;
    }
    const segments = file.split(/[\\/]/).filter((segment) => segment !== "");
    if (segments.length - 1 < depth) {
      depth = segments.length - 1;
      root = segments.slice(0, segments.length - 1).join(path.sep);
    }
  });
  return root;
}

//Read the mod's display name out of Info/<lang>/info.xml, the same file the loader reads.
//English first, then Korean, then whatever else the mod ships.
async function getModDisplayName(destinationPath, rootPath) {
  const INFO_PATH = path.join(destinationPath, rootPath, MOD_INFO_FOLDER);
  const langRank = (folder) => {
    const idx = MOD_INFO_LANGS.indexOf(folder.toLowerCase());
    return idx === -1 ? MOD_INFO_LANGS.length : idx;
  };
  let folders = [];
  try {
    folders = await fsp.readdir(INFO_PATH);
  } catch {
    return undefined;
  }
  folders.sort((lhs, rhs) => langRank(lhs) - langRank(rhs));
  for (const folder of folders) {
    try {
      const data = await fsp.readFile(path.join(INFO_PATH, folder, MOD_INFO_FILE), "utf8");
      const parsed = await parseStringPromise(data.replace(/^\uFEFF/, ""));
      const name = parsed?.info?.name?.[0];
      if (typeof name === "string" && name.trim() !== "") {
        return name.trim();
      }
    } catch (err) {
      log("debug", `Could not read mod name from ${folder}/${MOD_INFO_FILE}: ${err}`);
    }
  }
  return undefined;
}

//Test for mod files
function testMod(files, gameId) {
  const isLoader = files.some((file) => path.basename(file) === LOADER_FILE);
  const isMod = getModRoot(files) !== null;
  let supported = gameId === spec.game.id && isMod && !isLoader;

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

//Install mod files. Every mod gets its own folder under BaseMods, named after the archive, which
//is what the mod manager does too - so the same mod keeps its BaseModList_v2.xml entry whether it
//was installed here or there.
async function installMod(files, destinationPath) {
  const MOD_TYPE = MOD_ID;
  const MOD_FOLDER = path.basename(destinationPath, ".installing");
  const rootPath = getModRoot(files) ?? "";
  const rootPrefix = rootPath === "" ? "" : rootPath + path.sep;
  const idx = rootPrefix.length;
  const setModTypeInstruction = { type: "setmodtype", value: MOD_TYPE };

  // Remove directories and anything above the mod root, so wrapper folders are flattened away.
  const filtered = files.filter((file) => file.startsWith(rootPrefix) && !file.endsWith(path.sep));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(MOD_FOLDER, file.substring(idx)),
    };
  });
  instructions.push({ type: "attribute", key: LO_ATTRIBUTE, value: MOD_FOLDER });
  const displayName = await getModDisplayName(destinationPath, rootPath);
  if (displayName !== undefined) {
    instructions.push({ type: "attribute", key: "customFileName", value: displayName });
  }
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
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: ROOT_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(
    (file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix),
  );
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
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(
    (file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix),
  );
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
  if (!updating_mod) {
    //a mod update that lands here should not raise the "fallback reached" notice
    fallbackInstallerNotify(api, destinationPath);
  }
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
                  util.opn(`${EXTENSION_URL}?tab=posts`).catch(() => null);
                  dismiss();
                },
              }, //*/
              //*
              {
                label: `Open Mod Page + Staging Folder`,
                action: () => {
                  util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
                  const mods = util.getSafe(
                    api.store.getState(),
                    ["persistent", "mods", spec.game.id],
                    {},
                  );
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
                  util.opn(MOD_PAGE_URL).catch(() => null);
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

// GITHUB AUTOMATIC DOWNLOAD FUNCTIONS /////////////////////////////////////////////////

async function asyncForEachTestVersion(api, requirements) {
  for (let index = 0; index < requirements.length; index++) {
    await testRequirementVersion(api, requirements[index]);
  }
}

async function asyncForEachCheck(api, requirements) {
  let mod = [];
  for (let index = 0; index < requirements.length; index++) {
    mod[index] = await requirements[index].findMod(api);
  }
  let checker = mod.every((entry) => entry !== undefined); //findMod resolves to a mod object or undefined, never a boolean
  return checker;
}

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await asyncForEachTestVersion(api, REQUIREMENTS);
    log("warn", "Checked requirements versions");
  } catch (err) {
    log("warn", `failed to test requirements versions: ${err}`);
  }
}

async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
}

//Whether the loader's Nexus release has been fetched already
function isNexusInstallerDownloaded(api) {
  return util.getSafe(
    api.getState(),
    ["settings", GAME_ID, SETTING_NEXUS_CREDIT_DOWNLOADED],
    false,
  );
}

//Register the mod manager's Nexus page as an installed (but empty, enabled) mod. Other Lobotomy
//Corporation mods list "Lobotomy Mod Manager" (site/765) as a requirement, and Vortex's Nexus
//requirements health check only counts ENABLED Nexus mods as satisfying a requirement - so without
//this a fully working setup still reports the requirement missing. The real loader is installed
//from GitHub under a different mod, so this placeholder carries no files and deploys nothing; it
//exists purely so the requirement's (downloadGame, modId) match finds it.
async function ensureNexusRequirementMod(api) {
  try {
    const state = api.getState();
    const profile = selectors.activeProfile(state);
    if (profile === undefined || profile.gameId !== GAME_ID) {
      return;
    }
    const mods = util.getSafe(state, ["persistent", "mods", GAME_ID], {});
    const existing = Object.values(mods).find(
      (mod) => String(mod.attributes?.modId) === String(LOADER_PAGE_NO),
    );
    if (existing !== undefined) {
      //already tracked - the placeholder, or a real Nexus install
      return;
    }
    //Stamp the current file id and version so the mod update check treats the placeholder as
    //up to date - otherwise it would offer to "update" it, which pulls in the real Nexus archive.
    let fileId = LOADER_FILE_NO;
    let version = "0.0.0";
    try {
      const modFiles = await api.ext.nexusGetModFiles(LOADER_DOMAIN, LOADER_PAGE_NO);
      const fileTime = (input) => Number(input.uploaded_timestamp) || 0;
      const file = modFiles
        .filter((entry) => entry.category_id === 1)
        .sort((lhs, rhs) => fileTime(rhs) - fileTime(lhs))[0];
      if (file !== undefined) {
        fileId = file.file_id;
        version = file.version ?? file.mod_version ?? version;
      }
    } catch {
      //offline or not logged in - fall back to the pinned ids
    }
    const modId = `${GAME_ID}-nexus-requirement`;
    const mod = {
      id: modId,
      state: "installed",
      type: "",
      installationPath: modId,
      attributes: {
        name: "Lobotomy Mod Manager",
        logicalFileName: "Lobotomy Mod Manager",
        shortDescription:
          "Placeholder so Vortex sees the Lobotomy Mod Manager requirement as met. The loader itself is installed from GitHub, and this mod deploys no files.",
        modId: LOADER_PAGE_NO,
        fileId: fileId,
        newestFileId: fileId,
        source: "nexus",
        downloadGame: LOADER_DOMAIN,
        version: version,
        newestVersion: version,
        author: LOADER_AUTHOR,
        installTime: new Date(),
      },
    };
    await new Promise((resolve, reject) => {
      api.events.emit("create-mod", GAME_ID, mod, (err) =>
        err !== null ? reject(err) : resolve(),
      );
    });
    api.store.dispatch(actions.setModEnabled(profile.id, modId, true));
  } catch (err) {
    //never block or shout over the loader install
    log("warn", `Failed to register the ${LOADER_NEXUS_NAME} requirement placeholder: ${err}`);
  }
}

//* Download the mod manager's official release from Nexus Mods, so its mod page gets the download
//  credit, then register it as an installed placeholder mod (see ensureNexusRequirementMod). The
//  archive itself is never installed - Vortex installs the loader from the newer GitHub release,
//  and installing both would put two copies of the same files in the mod list.
async function downloadNexusInstaller(api) {
  if (isNexusInstallerDownloaded(api)) {
    return;
  }
  const NOTIF_ID = `${GAME_ID}-nexus-credit-download`;
  api.sendNotification({
    id: NOTIF_ID,
    message: `Downloading ${LOADER_NEXUS_NAME}`,
    type: "activity",
    noDismiss: true,
    allowSuppress: false,
  });
  try {
    if (api.ext?.ensureLoggedIn !== undefined) {
      //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    let FILE = LOADER_FILE_NO;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(LOADER_DOMAIN, LOADER_PAGE_NO);
      //sort on uploaded_timestamp - uploaded_time is an ISO string, so parsing it as a number
      //yields the year for every file and the sort does nothing
      const fileTime = (input) => Number(input.uploaded_timestamp) || 0;
      const file = modFiles
        .filter((file) => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(rhs) - fileTime(lhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${LOADER_NEXUS_NAME} main file found`);
      }
      FILE = file.file_id;
    } catch {
      // use defined file ID if the lookup above fails
      FILE = LOADER_FILE_NO;
    }
    const URL = `nxm://${LOADER_DOMAIN}/mods/${LOADER_PAGE_NO}/files/${FILE}`;
    const dlInfo = {
      game: LOADER_DOMAIN,
      name: LOADER_NEXUS_NAME,
    };
    await util.toPromise((cb) =>
      api.events.emit("start-download", [URL], dlInfo, undefined, cb, undefined, {
        allowInstall: false,
      }),
    );
    api.store.dispatch(setNexusInstallerDownloaded(true)); //only ever ask for this once
  } catch (err) {
    //courtesy download - it must never block or shout over the loader install
    log("warn", `Failed to download ${LOADER_NEXUS_NAME}: ${err}`);
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
} //*/

// LOAD ORDER FUNCTIONS /////////////////////////////////////////////////////////

//Absolute path of the folder holding the mods and the load order file, or undefined when the
//game has not been discovered yet.
function getModFolderPath(api) {
  const discoveryPath = getDiscoveryPath(api);
  return discoveryPath === undefined ? undefined : path.join(discoveryPath, MOD_PATH);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

//Read the load order file into { folder, enabled } entries. A missing or unreadable file simply
//means no order has been recorded yet, which is not an error - the loader treats it the same way.
async function readLoadOrderFile(loadOrderPath) {
  let parsed = null;
  try {
    const data = await fsp.readFile(loadOrderPath, "utf8");
    parsed = await parseStringPromise(data.replace(/^\uFEFF/, ""));
  } catch (err) {
    if (err.code !== "ENOENT") {
      log("warn", `Could not read ${LO_FILE}: ${err}`);
    }
    return [];
  }
  const entries = parsed?.ModListXml?.list?.[0]?.ModInfoXml ?? [];
  return entries
    .map((entry) => ({
      folder: entry?.modfoldername?.[0],
      //the loader defaults a missing Useit to true
      enabled: String(entry?.Useit?.[0] ?? "true").toLowerCase() !== "false",
    }))
    .filter((entry) => typeof entry.folder === "string" && entry.folder !== "");
}

//Build the whole document from the row list. The id fields are the loader's own update-check
//bookkeeping, so they are written at their defaults - that keeps the loader from treating a mod
//Vortex installed as one of its own managed downloads. Booleans must be lowercase.
function buildLoadOrderFile(loadOrder) {
  const entries = loadOrder.map((entry) =>
    [
      "    <ModInfoXml>",
      `      <modfoldername>${escapeXml(entry.id)}</modfoldername>`,
      `      <Useit>${entry.enabled !== false ? "true" : "false"}</Useit>`,
      "      <IsWorkShop>false</IsWorkShop>",
      "      <IsNexus>false</IsNexus>",
      "      <IsGitHub>false</IsGitHub>",
      "      <modid>-1</modid>",
      "      <fileid>-1</fileid>",
      "      <g_modid />",
      "      <g_fileid>-1</g_fileid>",
      "    </ModInfoXml>",
    ].join("\r\n"),
  );
  return [LO_FILE_HEADER, ...entries, LO_FILE_FOOTER].join("\r\n") + "\r\n";
}

//Reordering is ignored while a mod update is in flight: the deserializer below freezes the stored
//order and the serializer skips writing, so tell the user their change was not applied.
function notifyLoadOrderPaused(api, gameId) {
  api.sendNotification({
    id: `${gameId}-loadorder-update-paused`,
    type: "warning",
    message:
      "Load order changes are paused while a mod update finishes. Reorder again once it completes.",
    displayMS: 6000,
  });
}

//Build the load order page from the folders on disk, ordered by the load order file
async function deserializeLoadOrder(context) {
  const api = context.api;
  //A mod update briefly removes and reinstalls mods, so rebuilding the order from disk right now
  //would drop their entries. Return the stored order untouched instead: positions are preserved
  //and the page keeps showing the real load order rather than a placeholder row.
  if (mod_update_all_profile) {
    const updateState = api.getState();
    const updateProfileId = selectors.lastActiveProfileForGame(updateState, GAME_ID);
    return util.getSafe(updateState, ["persistent", "loadOrder", updateProfileId], []);
  }
  const modFolderPath = getModFolderPath(api);
  if (modFolderPath === undefined) {
    return [];
  }
  const mods = util.getSafe(api.getState(), ["persistent", "mods", spec.game.id], {});

  //Seed lock state from the stored load order. BaseModList_v2.xml has no lock field, so without
  //this a locked entry would silently unlock on the next deploy or page mount.
  const prevState = api.getState();
  const prevLO = util.getSafe(
    prevState,
    ["persistent", "loadOrder", selectors.lastActiveProfileForGame(prevState, GAME_ID)],
    [],
  );
  const prevById = new Map(prevLO.map((e) => [e.id, e]));

  //the folders on disk decide what exists - the file only decides order and enabled state
  let modFolders = [];
  try {
    modFolders = await fsp.readdir(modFolderPath);
    modFolders = modFolders.filter((file) => isDir(modFolderPath, file));
    modFolders = modFolders.sort((lhs, rhs) => lhs.toLowerCase().localeCompare(rhs.toLowerCase()));
  } catch (err) {
    if (err.code !== "ENOENT") {
      log("warn", `Could not read the mods folder: ${err}`);
    }
    return [];
  }

  const findMod = (folder) =>
    Object.values(mods).find(
      (mod) => util.getSafe(mods[mod.id]?.attributes, [LO_ATTRIBUTE], "") === folder,
    );
  const getModId = (folder) => findMod(folder)?.id;
  const getModName = (folder) => {
    const modMatch = findMod(folder);
    if (modMatch === undefined) {
      return `${folder} (not managed by Vortex)`;
    }
    const name =
      modMatch.attributes?.customFileName ??
      modMatch.attributes?.logicalFileName ??
      modMatch.attributes?.name ??
      folder;
    return name === folder ? folder : `${name} (${folder})`;
  };

  const listed = await readLoadOrderFile(path.join(modFolderPath, LO_FILE));
  const loadOrder = [];
  listed.forEach((entry) => {
    if (!modFolders.includes(entry.folder)) {
      //drop entries whose folder is gone
      return;
    }
    if (loadOrder.find((row) => row.id === entry.folder) !== undefined) {
      return;
    }
    loadOrder.push({
      id: entry.folder,
      name: getModName(entry.folder),
      modId: getModId(entry.folder),
      enabled: entry.enabled,
      locked: prevById.get(entry.folder)?.locked ?? false,
    });
  });

  //the loader loads folders the file does not name after the ones it does, and always on, so
  //they belong at the end of the page rather than being hidden from it
  modFolders.forEach((folder) => {
    if (loadOrder.find((row) => row.id === folder) === undefined) {
      loadOrder.push({
        id: folder,
        name: getModName(folder),
        modId: getModId(folder),
        enabled: true,
        locked: prevById.get(folder)?.locked ?? false,
      });
    }
  });
  return loadOrder;
}

//Write the load order file, every time - it is the only place the enabled state is kept
async function serializeLoadOrder(context, loadOrder) {
  if (mod_update_all_profile) {
    notifyLoadOrderPaused(context.api, GAME_ID);
    return;
  }
  const modFolderPath = getModFolderPath(context.api);
  if (modFolderPath === undefined) {
    return;
  }
  await vfs.ensureDirWritableAsync(modFolderPath);
  return fsp.writeFile(path.join(modFolderPath, LO_FILE), buildLoadOrderFile(loadOrder), {
    encoding: "utf8",
  });
}

//React load order instructions renderer
function LoadOrderInstructions() {
  const { statusFilter, setStatusFilter } = useFbloState();
  const { useSelector } = require("react-redux");
  const profile = useSelector((state) => selectors.activeProfile(state));
  const loadOrder = useSelector((state) =>
    util.getSafe(state, ["persistent", "loadOrder", profile?.id], []),
  );
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
      `Drag and drop the mods on the left to change the order in which they load.   `,
    ),
    React.createElement("br", null),
    React.createElement(
      "p",
      null,
      `${GAME_NAME} loads mods in the order you set from top to bottom. Unchecking a mod leaves ` +
        `its files installed but tells the loader to skip it.   `,
    ),
    React.createElement("br", null),
    React.createElement(
      "p",
      null,
      `The order is written to ${LO_FILE} in the mods folder, which is the same file the ` +
        `Lobotomy Mod Manager reads, so both tools stay in step.   `,
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
  const attributes = util.getSafe(
    api.getState(),
    ["persistent", "mods", GAME_ID, vortexModId, "attributes"],
    {},
  );
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
  const installationPath = util.getSafe(
    state,
    ["persistent", "mods", GAME_ID, vortexModId, "installationPath"],
    undefined,
  );
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
  const loadOrder = useSelector((state) =>
    util.getSafe(state, ["persistent", "loadOrder", profile?.id], []),
  );

  const { loEntry, displayCheckboxes } = item;
  const mods = useSelector((state) => util.getSafe(state, ["persistent", "mods", GAME_ID], {}));
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

  const modBasePath = getModFolderPath(context.api);
  const isModEnabled = (e) => util.getSafe(profile, ["modState", e.modId, "enabled"], false);
  const setVortexEnabled = (entries, enabled) => {
    const modIds = entries.filter((e) => e.modId !== undefined).map((e) => e.modId);
    if (modIds.length > 0) {
      actions.setModsEnabled(context.api, profile.id, modIds, enabled, { allowAutoDeploy: true });
    }
    onClose();
  };
  const openModFolders = (entries) => {
    entries
      .filter((e) => e.id !== undefined)
      .forEach((e) => util.opn(path.join(modBasePath, e.id)).catch(() => null));
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
            targets.forEach((t) => {
              const folder = getModStagingFolder(context.api, t.modId);
              if (folder) util.opn(folder).catch(() => null);
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
          util.opn(stagingFolder).catch(() => null);
          onClose();
        })
      : null,
    modPageUrl
      ? menuItem("Open Mod Page", () => {
          util.opn(modPageUrl).catch(() => null);
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
    if (nexusCreditDownload) {
      //has its own once-only guard, so it does not ride on whether the loader is missing
      await downloadNexusInstaller(api);
      await ensureNexusRequirementMod(api); //self-guarding: no-op once the placeholder (or a real Nexus install) exists
    }
    const requirementsInstalled = await checkForRequirements(api);
    if (!requirementsInstalled) {
      await download(api, REQUIREMENTS);
    }
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register settings
  if (hasLoader && nexusCreditDownload) {
    context.registerReducer(["settings", GAME_ID], {
      reducers: {
        [setNexusInstallerDownloaded.toString()]: (state, payload) =>
          util.setSafe(state, [SETTING_NEXUS_CREDIT_DOWNLOADED], payload),
      },
      defaults: { [SETTING_NEXUS_CREDIT_DOWNLOADED]: false },
    });
  }

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

  //register the load order page
  if (LOAD_ORDER_ENABLED) {
    context.registerLoadOrder({
      gameId: GAME_ID,
      validate: async () => Promise.resolve(undefined), // no cross-mod constraint exists
      deserializeLoadOrder: async () => await deserializeLoadOrder(context),
      serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
      toggleableEntries: true,
      usageInstructions: LoadOrderInstructions,
      customItemRenderer: LoadOrderItemRenderer,
    });
  }

  //register mod installers
  if (hasLoader) {
    context.registerInstaller(LOADER_ID, 25, testLoader, installLoader);
  }
  if (rootInstaller) {
    context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  }
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
  if (LOAD_ORDER_ENABLED) {
    context.registerAction(
      "mod-icons",
      300,
      "open-ext",
      {},
      `Open ${LO_FILE} File`,
      () => {
        const modFolderPath = getModFolderPath(context.api);
        if (modFolderPath !== undefined) {
          util.opn(path.join(modFolderPath, LO_FILE)).catch(() => null);
        }
      },
      () => {
        const state = context.api.getState();
        const gameId = selectors.activeGameId(state);
        return gameId === GAME_ID;
      },
    );
  }
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Mods Folder",
    () => {
      const modFolderPath = getModFolderPath(context.api);
      if (modFolderPath !== undefined) {
        util.opn(modFolderPath).catch(() => null);
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
    "Open Config Folder",
    () => {
      util.opn(CONFIG_PATH).catch(() => null);
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
      util.opn(SAVE_PATH).catch(() => null);
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  ); //*/
  if (nexusCreditDownload) {
    context.registerAction(
      "mod-icons",
      300,
      "open-ext",
      {},
      `Open ${LOADER_NAME} Nexus Page`,
      () => {
        util
          .opn(`https://www.nexusmods.com/${LOADER_DOMAIN}/mods/${LOADER_PAGE_NO}`)
          .catch(() => null);
      },
      () => {
        const state = context.api.getState();
        const gameId = selectors.activeGameId(state);
        return gameId === GAME_ID;
      },
    );
  }
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open PCGamingWiki Page",
    () => {
      util.opn(PCGAMINGWIKI_URL).catch(() => null);
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
      util.opn(openPath).catch(() => null);
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
      util.opn(`${EXTENSION_URL}?tab=bugs`).catch(() => null);
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
      util.opn(DOWNLOAD_FOLDER).catch(() => null);
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
    context.api.onAsync("check-mods-version", (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(context.api, gameId, mods, forced);
    }); //*/
    context.api.onAsync("did-deploy", async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(
        context.api.getState(),
        GAME_ID,
      );
      if (profileId !== LAST_ACTIVE_PROFILE) return; //only reset this game's mod update flags
      //release tracking one mod id at a time, and only once that mod's new version has
      //landed and is enabled, so a deploy that fires mid-batch can't disarm the guard for
      //mods that haven't been reinstalled yet
      //guard state as it stood before the loop below releases it - the FBLO refresh further
      //down only runs on the deploy that actually clears the guard
      const guardWasArmed = mod_update_all_profile;
      if (updateModIds.size > 0) {
        const state = context.api.getState();
        const profile = selectors.profileById(state, profileId);
        const mods = util.getSafe(state, ["persistent", "mods", GAME_ID], {});
        const now = Date.now();
        for (const [nexusId, { firstSeen, targetFileId }] of Array.from(updateModIds)) {
          const landed = Object.values(mods).some(
            (mod) =>
              String(mod?.attributes?.modId ?? "") === nexusId &&
              //if the target file is unknown, fall back to "installed and enabled"
              (targetFileId === "" || String(mod?.attributes?.fileId ?? "") === targetFileId) &&
              util.getSafe(profile, ["modState", mod.id, "enabled"], false),
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
          const refreshedLO = await deserializeLoadOrder({ api: context.api });
          context.api.store.dispatch(actions.setFBLoadOrder(profileId, refreshedLO));
        } catch (err) {
          log("warn", `[${GAME_ID}] post-update load order refresh failed`, err);
        }
      }
      updating_mod = false; //reset updating flag on deploy
    });
    //detect mod update (to maintain LO position)
    //fileId is the version being updated TO, and is what tells the new version apart from
    //the old one on deploy - without it every mod not yet updated still looks "already installed"
    context.api.events.on("mod-update", (gameId, modId, fileId) => {
      if (GAME_ID == gameId) {
        updateModIds.set(String(modId), {
          firstSeen: Date.now(),
          targetFileId: String(fileId ?? ""),
        });
      }
    });
    //detect batch mod update: the "Update all" button emits mods-update with LOCAL mod ids
    //and never emits mod-update, so resolve each one to its Nexus mod id before tracking it
    context.api.events.on("mods-update", (gameId, modIds) => {
      if (GAME_ID !== gameId) return;
      const mods = util.getSafe(context.api.getState(), ["persistent", "mods", GAME_ID], {});
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
    context.api.events.on("remove-mod", (gameMode, modId) => {
      const removedMod = util.getSafe(
        api.getState(),
        ["persistent", "mods", GAME_ID, modId],
        undefined,
      );
      const nexusModId = removedMod?.attributes?.modId;
      if (nexusModId !== undefined && updateModIds.has(String(nexusModId))) {
        mod_update_all_profile = true;
      }
    });
    //detect mod installation (to maintain LO position). This only gates the
    //fallback-installer re-notify suppression, so a best-effort filename
    //match (covering both the old dash and current space delimiter) is fine.
    context.api.events.on("will-install-mod", (gameId, archiveId, modId) => {
      updating_mod =
        GAME_ID == gameId &&
        Array.from(updateModIds.keys()).some(
          (id) => modId.includes("-" + id + "-") || modId.includes(" " + id + " "),
        );
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
