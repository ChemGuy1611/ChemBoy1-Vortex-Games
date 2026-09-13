/*///////////////////////////////////////////
Name: Watch_Dogs Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.2.0
Date: 2026-09-12
Notes:
-
///////////////////////////////////////////*/

//Import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const winapi = require("winapi-bindings");
const React = require("react");

const DOCUMENTS = util.getVortexPath("documents");
const APPDATA = util.getVortexPath("appData");

//Specify all the information about the game
const GAME_ID = "watchdogs";
const STEAMAPP_ID = "243470"; // https://steamdb.info/app/243470/
const UPLAYAPP_ID = "274";
const EPICAPP_ID = "Jasper"; // https://store.epicgames.com/en-US/p/watch-dogs
const INSTALL_HIVE = "HKEY_LOCAL_MACHINE"; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\${UPLAYAPP_ID}`; //for finding install in registry - requires winapi-bindings
const INSTALL_VALUE = "InstallDir"; //often InstallDir or InstallPath
const DISCOVERY_IDS_ACTIVE = [UPLAYAPP_ID, STEAMAPP_ID, EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  epic: [{ id: EPICAPP_ID }],
  registry: [{ id: `${INSTALL_HIVE}:${INSTALL_KEY}:${INSTALL_VALUE}` }],
};

const GAME_NAME = "Watch_Dogs";
const GAME_NAME_SHORT = "Watch_Dogs";
const BINARIES_PATH = "bin";
const EXEC_NAME = "Watch_Dogs.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Watch_Dogs";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1995"; //Nexus link to this extension. Used for links

//feature toggles
const hasLoader = true; //true if game needs a mod loader
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const needsModInstaller = true; //set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing
const rootInstaller = true; //enable root installer. Set false if you need to avoid installer collisions
const saveInstaller = false; //enable save installer. Set false if path is outside of game folder
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const hasUserIdFolder = true; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
const binariesInstaller = true;
//const debug = false; //toggle for debug mode

//info for modtypes, installers, tools, and actions
const DATA_FOLDER = "data_win64";
const ROOT_FOLDERS = [DATA_FOLDER, BINARIES_PATH];
const ROOTSUB_FOLDERS = ["worlds"];
const ROOTSUB_PATH = DATA_FOLDER;

const CONFIGMOD_LOCATION = DOCUMENTS;
const APPDATA_FOLDER = path.join("My Games", "Watch_Dogs");
const SAVE_FOLDERNAME = "savegames";

let GAME_PATH = "";
let STAGING_FOLDER = "";
let DOWNLOAD_FOLDER = "";

const LOADER_ID = `${GAME_ID}-loader`;
const LOADER_NAME = "NexusTools Mod Loader";
const LOADER_PATH = ".";
const LOADER_FILE = "ModManager.exe";
const LOADER_PAGE_NO = 491;
const LOADER_FILE_NO = 1666;
const LOADER_DOMAIN = GAME_ID;

//Experimental: NexusTools persists its own settings (confirmed against a live install) at
//%APPDATA%\Troplo\Nexus\settings.json, a JSON object with a "commands" map. Setting
//"ModLoader_DisablePrelaunchWindow" true there is meant to suppress its in-game mod confirm popup.
//The path/key are verified live; whether the popup can actually be skipped without also blocking
//the mod mount is not.
const NEXUSTOOLS_SETTINGS_FOLDER = path.join("Troplo", "Nexus");
const NEXUSTOOLS_SETTINGS_FILE = "settings.json";
const NEXUSTOOLS_PRELAUNCH_KEY = "ModLoader_DisablePrelaunchWindow";

//Experimental: NexusTools' own load order + enable state, also confirmed live at
//%APPDATA%\Troplo\Nexus\localmodsconfig.json - { "mods": [{ friendlyId, enabled, priority,
//enableWorkspaces }] }, one entry per data_win64\mods\<folder>. Whether writing this actually
//changes in-game mount order (rather than NexusTools just reading it for its own GUI) is what
//this load order page exists to test.
const NEXUSTOOLS_MODSCONFIG_FILE = "localmodsconfig.json";

//Stamped onto each installed MOD_ID mod so the load order page can find its Vortex modId back from
//a bare on-disk folder name - same LO_ATTRIBUTE pattern used across this repo's other FBLO games
//(e.g. game-warhammer40kdarktide). Without it, entries have no modId and show "Not managed by
//Vortex" even for mods Vortex itself installed.
const LO_ATTRIBUTE = "nexusToolsFolder";
const LO_IMAGE_WIDTH = 96; //Width of the load order thumbnail image
const LO_IMAGE_HEIGHT = LO_IMAGE_WIDTH * 0.5625;

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Mod";
const MOD_PATH = path.join(DATA_FOLDER, "mods");
const MOD_EXTS = [".dat", ".fat"];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
const BINARIES_EXTS = [".exe", ".dll", ".asi", ".addon64"];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
let USERID_FOLDER = "";
let SAVE_PATH = ""; //Defined in setup fn <Ubisoft-Connect-folder>\savegames\<user-id>\${UPLAYAPP_ID}
const SAVE_EXTS = [".save"];

let CONFIG_FOLDER = path.join(CONFIGMOD_LOCATION, APPDATA_FOLDER);
if (hasUserIdFolder) {
  try {
    const CONFIG_ARRAY = fs.readdirSync(CONFIG_FOLDER);
    USERID_FOLDER = CONFIG_ARRAY.find((entry) => isDir(CONFIG_FOLDER, entry));
  } catch {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  }
}
let CONFIG_PATH = path.join(CONFIG_FOLDER, USERID_FOLDER);
const CONFIG_FILES = ["GamerProfile.xml"];
const CONFIG_FILE_PATH = path.join(CONFIG_PATH, CONFIG_FILES[0]);

let MOD_PATH_DEFAULT = MOD_PATH;
const REQ_FILE = EXEC;
const PARAMETERS_STRING = "";
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [BINARIES_PATH];
if (needsModInstaller) MODTYPE_FOLDERS.push(MOD_PATH);
if (saveInstaller) MODTYPE_FOLDERS.push(SAVE_PATH);
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
      epicAppId: EPICAPP_ID,
      uPlayAppId: UPLAYAPP_ID,
      supportsSymlinks: allowSymlinks,
      ignoreConflicts: IGNORE_CONFLICTS,
      ignoreDeploy: IGNORE_DEPLOY,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
      EpicAPPId: EPICAPP_ID,
      UPlayAPPId: UPLAYAPP_ID,
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
    parameters: PARAMETERS,
  }, //*/
  {
    id: LOADER_ID,
    name: LOADER_NAME,
    logo: "nexustools.png",
    executable: () => LOADER_FILE,
    requiredFiles: [LOADER_FILE],
    relative: true,
    exclusive: false,
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
function getModPath() {
  return () => MOD_PATH_DEFAULT;
} //*/

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === "steam") {
    return Promise.resolve({
      launcher: "steam",
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
function getExecutable() {
  return EXEC;
}

//Find the save folder (inside Ubisoft Launcher install path)
function getUbisoftSavePath() {
  try {
    const instPath = winapi.RegGetValue(
      "HKEY_LOCAL_MACHINE",
      `SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher`,
      "InstallDir",
    );
    if (!instPath) {
      throw new Error("empty registry key");
    }
    const REG_PATH = instPath.value;
    const READ_PATH = path.join(REG_PATH, SAVE_FOLDERNAME);
    try {
      const ARRAY = fs.readdirSync(READ_PATH);
      USERID_FOLDER = ARRAY.find((entry) => isDir(READ_PATH, entry));
    } catch {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    }
    SAVE_PATH = path.join(READ_PATH, USERID_FOLDER, UPLAYAPP_ID);
    return SAVE_PATH;
  } catch (err) {
    log(
      "warn",
      `Could not get Ubisoft Launcher install path from registry to set the Saves directory: ${err}`,
    );
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

//Test for mod loader files
function testLoader(files, gameId) {
  const isMod = files.some((file) => path.basename(file) === LOADER_FILE);
  const isFolder = files.some((file) => path.basename(file).toLowerCase() === "bin");
  let supported = gameId === spec.game.id && isMod && isFolder;

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
  const modFile = files.find((file) => path.basename(file).toLowerCase() === "bin");
  const idx = modFile.indexOf(path.basename(modFile));
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
function installMod(files, fileName) {
  const MOD_TYPE = MOD_ID;
  let modFile = files.find((file) => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  let rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: "setmodtype", value: MOD_TYPE };

  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, "");
  const ROOT_PATH = path.basename(rootPath);
  if (ROOT_PATH !== ".") {
    MOD_FOLDER = ""; //no top level folder needed if it's already included in the archive
    modFile = rootPath; //make the folder the targeted modFile so we can grab any other folders also in its directory
    rootPath = path.dirname(modFile);
  }
  const idx = modFile.indexOf(path.basename(modFile));

  // Remove directories and anything that isn't in the rootPath.
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  //Stamp the actual deployed top-level folder name so the load order page can match this mod back
  //by folder without guessing - ROOT_PATH when the archive already ships its own folder, otherwise
  //the sanitized MOD_FOLDER (mirrors the two branches above).
  const FOLDER_NAME = ROOT_PATH !== "." ? ROOT_PATH : MOD_FOLDER;
  instructions.push({ type: "attribute", key: LO_ATTRIBUTE, value: FOLDER_NAME });
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
          .filter(
            (file) => file.category_id === 1 && file.file_name.toLowerCase().includes("manual"),
          )
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
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
      const dlId = await util.toPromise((cb) =>
        api.events.emit("start-download", [URL], dlInfo, undefined, cb, undefined, {
          allowInstall: false,
        }),
      );
      const modId = await util.toPromise((cb) =>
        api.events.emit("start-install-download", dlId, { allowAutoEnable: false }, cb),
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
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//Experimental: patch NexusTools' own settings.json so it may skip its in-game mod confirm popup.
//Only ever sets the key to true - never resets it, since we cannot tell "we set this" apart from
//"the user turned it on themselves in NexusTools' own Settings". Never touches the file if it does
//not exist yet (NexusTools has never been run) or does not parse as JSON - patching a file whose
//shape we cannot confirm risks corrupting real user settings (hotkeys, camera/trainer prefs).
async function reconcileNexusToolsPrelaunchSetting(api, enabled) {
  if (!enabled) return;
  const SETTINGS_PATH = path.join(APPDATA, NEXUSTOOLS_SETTINGS_FOLDER, NEXUSTOOLS_SETTINGS_FILE);
  try {
    let raw;
    try {
      raw = await fsp.readFile(SETTINGS_PATH, "utf8");
    } catch {
      return; //NexusTools has not created its settings file yet - nothing to patch
    }
    const parsed = JSON.parse(raw);
    if (parsed?.commands?.[NEXUSTOOLS_PRELAUNCH_KEY] === true) return; //already set
    parsed.commands = parsed.commands || {};
    parsed.commands[NEXUSTOOLS_PRELAUNCH_KEY] = true;
    await fsp.writeFile(SETTINGS_PATH, JSON.stringify(parsed, null, 4));
  } catch (err) {
    api.showErrorNotification(`Failed to update NexusTools ${NEXUSTOOLS_SETTINGS_FILE}`, err);
  }
}

function setNexusToolsAutoConfirm(value) {
  return { type: "SET_NEXUSTOOLS_AUTOCONFIRM_WATCHDOGS", payload: value };
}
setNexusToolsAutoConfirm.toString = () => "SET_NEXUSTOOLS_AUTOCONFIRM_WATCHDOGS";

//Experimental: mirrors NexusTools' own load order + enable state (localmodsconfig.json) as a
//Vortex Load Order page, so the two can be tested against each other - does reordering here
//actually change in-game mount order, or does NexusTools only read this file for its own GUI?

//List actual mod folders on disk - the ground truth of what's physically deployed.
async function listModFolders(gamePath) {
  const modsPath = path.join(gamePath, MOD_PATH);
  const result = [];
  try {
    const entries = await fsp.readdir(modsPath);
    for (const entry of entries) {
      try {
        const stat = await fsp.stat(path.join(modsPath, entry));
        if (stat.isDirectory()) result.push(entry);
      } catch {
        //unreadable entry - skip it
      }
    }
  } catch {
    //mods folder doesn't exist yet
  }
  return result;
}

async function readNexusToolsModsConfig() {
  const CONFIG_PATH = path.join(APPDATA, NEXUSTOOLS_SETTINGS_FOLDER, NEXUSTOOLS_MODSCONFIG_FILE);
  try {
    const raw = await fsp.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.mods) ? parsed.mods : [];
  } catch {
    return [];
  }
}

async function deserializeWatchdogsLoadOrder(api) {
  const state = api.getState();
  if (selectors.activeGameId(state) !== GAME_ID) return [];
  const discovery = util.getSafe(state, ["settings", "gameMode", "discovered", GAME_ID], undefined);
  if (!discovery?.path) return [];
  const [folders, modsConfig] = await Promise.all([
    listModFolders(discovery.path),
    readNexusToolsModsConfig(),
  ]);
  const mods = util.getSafe(state, ["persistent", "mods", GAME_ID], {});
  //Seed lock state from the stored load order - localmodsconfig.json has no lock concept at all,
  //so without this a locked entry would silently unlock on the next deploy/profile switch/page mount.
  const prevLO = util.getSafe(
    state,
    ["persistent", "loadOrder", selectors.lastActiveProfileForGame(state, GAME_ID)],
    [],
  );
  const prevById = new Map(prevLO.map((entry) => [entry.id, entry]));
  function getModId(folder) {
    const modMatch = Object.values(mods).find(
      (mod) => util.getSafe(mod.attributes, [LO_ATTRIBUTE], "") === folder,
    );
    return modMatch?.id;
  }
  const byId = new Map(modsConfig.map((mod) => [mod.friendlyId, mod]));
  const entries = folders.map((folder) => {
    const existing = byId.get(folder);
    return {
      id: folder,
      modId: getModId(folder),
      priority: existing?.priority ?? Number.MAX_SAFE_INTEGER,
      enabled: existing?.enabled !== false,
      locked: prevById.get(folder)?.locked ?? false,
    };
  });
  entries.sort((lhs, rhs) => lhs.priority - rhs.priority);
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.id,
    modId: entry.modId,
    enabled: entry.enabled,
    locked: entry.locked,
  }));
}

async function serializeWatchdogsLoadOrder(api, loadOrder) {
  const state = api.getState();
  if (selectors.activeGameId(state) !== GAME_ID) return;
  const CONFIG_PATH = path.join(APPDATA, NEXUSTOOLS_SETTINGS_FOLDER, NEXUSTOOLS_MODSCONFIG_FILE);
  let parsed;
  try {
    const raw = await fsp.readFile(CONFIG_PATH, "utf8");
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  const existingMods = Array.isArray(parsed.mods) ? parsed.mods : [];
  const byId = new Map(existingMods.map((mod) => [mod.friendlyId, mod]));
  const managedIds = new Set(loadOrder.map((entry) => entry.id));
  const newMods = loadOrder.map((entry, index) => {
    const existing = byId.get(entry.id);
    return {
      friendlyId: entry.id,
      enabled: entry.enabled,
      priority: index,
      enableWorkspaces: existing?.enableWorkspaces ?? true,
    };
  });
  //keep any mod NexusTools already knows about that Vortex isn't currently managing (folder
  //removed, or a mod installed by hand outside Vortex) - never silently drop its bookkeeping.
  const unmanaged = existingMods.filter((mod) => !managedIds.has(mod.friendlyId));
  parsed.mods = newMods.concat(unmanaged);
  try {
    await fsp.writeFile(CONFIG_PATH, JSON.stringify(parsed, null, 4));
  } catch (err) {
    api.showErrorNotification(`Failed to update NexusTools ${NEXUSTOOLS_MODSCONFIG_FILE}`, err);
  }
}

function validateWatchdogsLoadOrder() {
  return Promise.resolve(undefined);
}

//Tier-G load order page: custom row renderer, right-click context menu, status filter, locking -
//ported from game-warhammer40kdarktide/index.js (see atomic-seeking-magpie.md for the source-read
//function list this was copied from). No mod_update_all_profile equivalent exists in this
//extension, so the update-freeze guard darktide layers on top is not ported.

//React load order instructions renderer
function LoadOrderInstructions() {
  const { statusFilter, setStatusFilter } = useFbloState();
  const { useSelector } = require("react-redux");
  const profile = useSelector((state) => selectors.activeProfile(state));
  const loadOrder = useSelector((state) =>
    util.getSafe(state, ["persistent", "loadOrder", profile?.id], []),
  );
  const isLocked = (entry) => [true, "true", "always"].includes(entry?.locked);
  const total = loadOrder.length;
  const matched =
    statusFilter.size > 0
      ? loadOrder.filter((e) =>
          matchesStatus(e, statusFilter, (x) => x.enabled !== false, isLocked),
        ).length
      : total;
  //Collapse the DraggableListItem wrapper of any filtered-out row - see LO_ROW_HIDDEN_CSS below.
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
      `Experimental: this mirrors NexusTools' own load order file (${NEXUSTOOLS_MODSCONFIG_FILE}) ` +
        "directly.",
    ),
    React.createElement(
      "p",
      null,
      "Whether reordering here actually changes in-game mount order, or NexusTools only reads " +
        "that file for its own GUI, has not been confirmed - this page exists to test that.",
    ),
  );
}

//Module-level pub-sub for multi-select + context menu + status filter (Vortex FBLO page has no custom context provider)
let _fbloSelectedIds = new Set();
let _fbloContextMenu = null;
let _fbloStatusFilter = new Set();
const _fbloListeners = new Set();
function _notifyFblo() {
  _fbloListeners.forEach((listener) => listener());
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

//Status filter shared helpers. Groups combine with AND across, OR within.
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
const LO_CTX_MENU_CSS = ".watchdogs-ctx-item:hover { background: rgba(255,255,255,0.1); }";

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

//Shared dismiss behaviour for the context menu: any click or right-click outside closes the menu,
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

//Inline toggle pills for status filtering
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

//React line item renderer for load order
function LoadOrderItemRenderer(props) {
  const { className, item } = props;
  if (item?.loEntry === undefined) return null;

  const { ListGroupItem, Checkbox } = require("react-bootstrap");
  const { Icon, LoadOrderIndexInput, MainContext } = require("vortex-api");
  const { useSelector, useDispatch } = require("react-redux");

  const { api } = React.useContext(MainContext);
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
    serializeWatchdogsLoadOrder(api, newLO);
  }, [dispatch, api, profile, loadOrder, loEntry, isEntryLocked]);

  useInjectStyleOnce("lo-index-focus-style", LO_INDEX_FOCUS_CSS);

  const classes = ["load-order-entry"];
  if (className) classes.push(...className.split(" "));

  // Status filter: render hidden (but keep the DnD item count stable) when the entry is filtered out.
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
        api: api,
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
          api,
          selectedIds,
          onClose: () => setContextMenu(null),
        })
      : null,
  );
}

//Right-click context menu for load order entries (single + multi-select)
function FbloContextMenu({ x, y, item, loadOrder, profile, dispatch, api, selectedIds, onClose }) {
  useDismissOnOutside(onClose);

  useInjectStyleOnce("watchdogs-ctx-menu-style", LO_CTX_MENU_CSS);

  const [menuPosition, clampRef] = useClampedMenuPosition(x, y);

  const isLocked = (e) => [true, "true", "always"].includes(e?.locked);
  const isMulti = selectedIds.size >= 2 && selectedIds.has(item.id);
  const targets = isMulti ? loadOrder.filter((e) => selectedIds.has(e.id)) : [item];

  const applyToTargets = (transform, serialize = false) => {
    const newLO = transform(loadOrder, targets);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
    if (serialize) serializeWatchdogsLoadOrder(api, newLO);
    onClose();
  };

  const isEntryLocked = isLocked(item);
  const isEntryEnabled = item.enabled ?? true;

  const gameDir = getDiscoveryPath(api);
  const isModEnabled = (e) => util.getSafe(profile, ["modState", e.modId, "enabled"], false);
  const setVortexEnabled = (entries, enabled) => {
    //One Vortex mod can only own one folder here, but a multi-select can still list it twice if
    //selection logic ever changes - dedupe before dispatch to be safe.
    const modIds = [...new Set(entries.filter((e) => e.modId !== undefined).map((e) => e.modId))];
    if (modIds.length > 0) {
      actions.setModsEnabled(api, profile.id, modIds, enabled, { allowAutoDeploy: true });
    }
    onClose();
  };
  const openModFolders = (entries) => {
    entries
      .filter((e) => e.id !== undefined)
      .forEach((e) => util.opn(path.join(gameDir, MOD_PATH, e.id)).catch(() => null));
    onClose();
  };
  const itemVortexEnabled = isModEnabled(item);
  const modPageUrl = getModPageURL(api, item.modId);
  const stagingFolder = getModStagingFolder(api, item.modId);

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
        className: "watchdogs-ctx-item",
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
            //Several rows could in principle resolve to the same staging folder - dedupe so it opens once.
            const folders = [
              ...new Set(targets.map((t) => getModStagingFolder(api, t.modId)).filter(Boolean)),
            ];
            folders.forEach((folder) => util.opn(folder).catch(() => null));
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

function GameSettings() {
  const { Toggle, More, MainContext } = require("vortex-api");
  const { useSelector, useDispatch } = require("react-redux");
  const dispatch = useDispatch();
  const { api } = React.useContext(MainContext);
  const autoConfirmEnabled = useSelector((state) =>
    util.getSafe(state, ["settings", GAME_ID, "nexusToolsAutoConfirmEnabled"], false),
  );
  const onToggle = React.useCallback(
    (checked) => {
      dispatch(setNexusToolsAutoConfirm(checked));
      reconcileNexusToolsPrelaunchSetting(api, checked).catch((err) =>
        log("warn", `NexusTools settings.json reconcile failed: ${err.message}`),
      );
    },
    [api, dispatch],
  );
  return React.createElement(
    "form",
    null,
    React.createElement(
      "div",
      { className: "settings-group" },
      React.createElement(
        Toggle,
        { checked: autoConfirmEnabled, onToggle },
        "Skip NexusTools Confirm Window (Experimental)",
        React.createElement(
          More,
          { id: `${GAME_ID}-nexustools-autoconfirm-more`, name: "Skip NexusTools Confirm Window" },
          "Unverified - sets NexusTools' own ModLoader_DisablePrelaunchWindow setting to true in " +
            "its settings.json so it may apply mod changes without its in-game popup. Test that " +
            "mods still take effect after enabling this before relying on it. Disabling this does " +
            "NOT turn the popup back on - re-enable it yourself in NexusTools' own Settings if you " +
            "want it back.",
        ),
      ),
    ),
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

//Notify User to run NexusTools after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = LOADER_NAME;
  const MESSAGE = `Run ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "Run NexusTools",
        action: (dismiss) => {
          runModManager(api);
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
                `For most mods, you must use ${MOD_NAME} to install the mod to the game files after installing with Vortex.\n` +
                `Mods to install with ${MOD_NAME} will be found at this folder: "[RootGameFolder]\\${DATA_FOLDER}\\mods".\n` +
                `Use the included tool to launch ${MOD_NAME} (button on notification or in "Tools" tab).\n`,
            },
            [
              {
                label: "Run NexusTools",
                action: () => {
                  runModManager(api);
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

function runModManager(api) {
  const TOOL_ID = LOADER_ID;
  const TOOL_NAME = LOADER_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(
    state,
    ["settings", "gameMode", "discovered", GAME_ID, "tools", TOOL_ID],
    undefined,
  );

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false }).catch((err) =>
        api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, {
          allowReport: ["EPERM", "EACCESS", "ENOENT"].indexOf(err.code) !== -1,
        }),
      );
    } else {
      return api.showErrorNotification(
        `Failed to run ${TOOL_NAME}`,
        `Path to ${TOOL_NAME} executable could not be found. Ensure ${TOOL_NAME} is installed through Vortex.`,
      );
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, {
      allowReport: ["EPERM", "EACCESS", "ENOENT"].indexOf(err.code) !== -1,
    });
  }
}

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
  SAVE_PATH = getUbisoftSavePath();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  if (setupNotification) setupNotify(api);
  if (hasLoader) {
    await downloadLoader(api, gameSpec);
    await reconcileNexusToolsPrelaunchSetting(
      api,
      util.getSafe(state, ["settings", GAME_ID, "nexusToolsAutoConfirmEnabled"], false),
    );
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = {
    //register game
    ...gameSpec.game,
    //queryPath: makeFindGame(context.api, gameSpec),
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: getModPath(),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    //getGameVersion: resolveGameVersion,
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
  if (needsModInstaller) {
    context.registerInstaller(MOD_ID, 27, testMod, installMod);
  }
  if (rootInstaller) {
    context.registerInstaller(ROOT_ID, 29, testRoot, installRoot);
  }
  if (binariesInstaller) {
    context.registerInstaller(BINARIES_ID, 31, testBinaries, installBinaries);
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
      util.opn(CONFIG_FILE_PATH).catch(() => null);
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
    "Open SteamDB Page",
    () => {
      util.opn(STEAMDB_URL).catch(() => null);
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

  if (hasLoader) {
    context.registerReducer(["settings", GAME_ID], {
      reducers: {
        [setNexusToolsAutoConfirm.toString()]: (state, payload) =>
          util.setSafe(state, ["nexusToolsAutoConfirmEnabled"], payload),
      },
      defaults: { nexusToolsAutoConfirmEnabled: false },
    });
    context.registerSettings(
      "Mods",
      GameSettings,
      () => ({}),
      () => selectors.activeGameId(context.api.getState()) === GAME_ID,
      150,
    );
    context.registerLoadOrder({
      gameId: GAME_ID,
      toggleableEntries: true,
      noCollectionGeneration: true,
      usageInstructions: LoadOrderInstructions,
      customItemRenderer: LoadOrderItemRenderer,
      deserializeLoadOrder: () => deserializeWatchdogsLoadOrder(context.api),
      serializeLoadOrder: (loadOrder) => serializeWatchdogsLoadOrder(context.api, loadOrder),
      validate: () => validateWatchdogsLoadOrder(),
    });
  }
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    api.onAsync("did-deploy", async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(api);
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
