/*////////////////////////////////////////////////
Name: Dragon's Dogma 2 Vortex Extension
Structure: Fluffy + REFramework (RE Engine)
Author: ChemBoy1
Version: 1.0.0
Date: 2026-10-12
/////////////////////////////////////////////////*/

//Import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log, VortexError } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const winapi = require("winapi-bindings");
const { parseStringPromise } = require("xml2js");

//Specify all information about the game
const STEAMAPP_ID = "2054970";
const STEAMAPP_ID_DEMO = null; //no demo
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_ID = "dragonsdogma2";
const EXEC = "DD2.exe";
const EXEC_DEMO = ""; //!set as "" if no demo
const REF_STRING = "REFramework"; //file name for nightly latest URL - constant in recent versions. Not named per game any longer.

const GAME_NAME = "Dragon's Dogma 2";
const GAME_NAME_SHORT = "DD2";
const FLUFFY_FOLDER = "DragonsDogma2";
const FLUFFY_FOLDER_DEMO = ""; //!set as "" if no demo
const ROOT_FILES = [
  "nvngx_dlss.dll",
  "dstoragecore.dll",
  "dstorage.dll",
  "amd_fidelityfx_dx12.dll",
  "amd_ags_x64.dll",
];
const ROOT_EXTS = [".exe"];
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Dragon%27s_Dogma_II";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/851"; //Nexus link to this extension. Used for links

//feature toggles
const useRefNightly = false; //toggle for using the REFramework nightly instead of Nexus release
let hasXbox = false; //toggle for Xbox version logic
if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;
const reZip = true; //NOT WORKING YET - KEEP AS TRUE FOR NOW - set to true to re-zip Fluffy Mods (possibly not necessary for FLUFFY v3.069+)
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const HAS_DEMO = EXEC_DEMO !== "" && EXEC_DEMO !== EXEC; //false when the game has no separate demo executable
let multiExe = false; //set to true if there are multiple executables (and multiple FLUFFY_FOLDERs) (typically for Demo)
if (HAS_DEMO || hasXbox) {
  multiExe = true;
}
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const debug = false; //toggle for debug mode

let GAME_PATH = "";
let GAME_VERSION = "";
let SAVE_PATH = "";
let DOWNLOAD_FOLDER = "";
let STAGING_FOLDER = "";
const EXEC_XBOX = "gamelaunchhelper.exe";
const APPMANIFEST_FILE = "appxmanifest.xml";

//Information for mod types, tools, and installers
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";

const REF_ID = `${GAME_ID}-reframework`;
const REF_NAME = "REFramework";
const REF_FILE = "dinput8.dll";
const REF_PAGE_NO = 8;
const REF_FILE_NO = 4028;
const REF_URL = `https://github.com/praydog/REFramework-nightly/releases/latest/download/${REF_STRING}.zip`;
const REF_URL_ERR = "https://github.com/praydog/REFramework-nightly/releases";

const FLUFFY_ID = `${GAME_ID}-fluffymodmanager`;
const FLUFFY_NAME = "Fluffy Mod Manager";
const FLUFFY_EXEC = "modmanager.exe";
const FLUFFY_PAGE_NO = 818;
const FLUFFY_FILE_NO = 4736;
const FLUFFY_TOOL_ID = "FluffyModManager";

const FLUFFYMOD_ID = `${GAME_ID}-fluffymod`;
const FLUFFYMOD_NAME = "Fluffy Mod";
const FLUFFYPAK_ID = `${GAME_ID}-fluffypakmod`;
const FLUFFYPAK_NAME = "Fluffy Pak Mod";
let FLUFFYMOD_PATH = path.join("Games", FLUFFY_FOLDER, "Mods");
const FLUFFYMOD_PATH_DEMO = path.join("Games", FLUFFY_FOLDER_DEMO, "Mods");
const FLUFFYMOD_FILE = "modinfo.ini";
const PAK_EXT = ".pak";

const PRESET_ID = `${GAME_ID}-preset`;
const PRESET_NAME = "Fluffy Preset";
let PRESET_PATH = path.join("Games", FLUFFY_FOLDER, "Presets");
const PRESET_PATH_DEMO = path.join("Games", FLUFFY_FOLDER_DEMO, "Presets");
const PRESET_EXTS = [".prt"];

const LOOSELUA_ID = `${GAME_ID}-looselua`;
const LOOSELUA_NAME = "Loose Lua (REFramework)";
const LOOSELUA_PATH = path.join(".");
const LUA_EXT = ".lua";
const REF_FOLDERS = ["reframework", "autorun"];

async function getSavePath() {
  const STEAM_HIVE = "HKEY_LOCAL_MACHINE"; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
  const STEAM_KEY = `SOFTWARE\\WOW6432Node\\Valve\\Steam`; //fill in path
  const STEAM_VALUE = "InstallPath"; //often InstallDir or InstallPath
  let STEAM_PATH = "";
  try {
    const instPath = winapi.RegGetValue(STEAM_HIVE, STEAM_KEY, STEAM_VALUE);
    if (!instPath) {
      STEAM_PATH = "";
    } else {
      STEAM_PATH = instPath.value;
    }
  } catch {
    STEAM_PATH = "";
  }
  if (STEAM_PATH === undefined) {
    STEAM_PATH = "";
  } //*/
  const SAVE_FOLDER = path.join(STEAM_PATH, "userdata");
  let USERID_FOLDER = "";
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
  } catch {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  } //*/
  let STEAM_ID = STEAMAPP_ID;
  if (GAME_VERSION === "demo") {
    STEAM_ID = STEAMAPP_ID_DEMO;
  }
  //SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER, STEAM_ID, 'remote', 'win64_save');
  SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER, STEAM_ID);
  return SAVE_PATH;
}

const IGNORE_CONFLICTS = [
  path.join("**", "screenshot.png"),
  path.join("**", "screenshot.jpg"),
  path.join("**", "readme.txt"),
  path.join("**", "README.txt"),
  path.join("**", "ReadMe.txt"),
  path.join("**", "Readme.txt"),
  path.join("**", "license*"),
];
const IGNORE_DEPLOY = [
  path.join("**", "readme.txt"),
  path.join("**", "README.txt"),
  path.join("**", "ReadMe.txt"),
  path.join("**", "Readme.txt"),
  path.join("**", "license*"),
];
let MODTYPE_FOLDERS = [];

//Filled in from data above
const spec = {
  game: {
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME_SHORT,
    logo: `${GAME_ID}.jpg`,
    mergeMods: true,
    requiredFiles: [EXEC],
    details: {
      steamAppId: +STEAMAPP_ID,
      supportsSymlinks: allowSymlinks,
      ignoreDeploy: IGNORE_DEPLOY,
      ignoreConflicts: IGNORE_CONFLICTS,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
    },
  },
  modTypes: [
    {
      id: ROOT_ID,
      name: ROOT_NAME,
      priority: "high",
      targetPath: "{gamePath}",
    },
    {
      id: LOOSELUA_ID,
      name: LOOSELUA_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", LOOSELUA_PATH),
    },
    {
      id: PRESET_ID,
      name: PRESET_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", PRESET_PATH),
    },
    {
      id: FLUFFY_ID,
      name: FLUFFY_NAME,
      priority: "low",
      targetPath: "{gamePath}",
    },
    {
      id: FLUFFYMOD_ID,
      name: FLUFFYMOD_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", FLUFFYMOD_PATH),
    },
    {
      id: FLUFFYPAK_ID,
      name: FLUFFYPAK_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", FLUFFYMOD_PATH),
    },
    {
      id: REF_ID,
      name: REF_NAME,
      priority: "low",
      targetPath: "{gamePath}",
    },
  ],
  discovery: {
    ids: DISCOVERY_IDS_ACTIVE,
    names: [],
  },
};

//launchers and 3rd party tools
const tools = [
  {
    id: FLUFFY_TOOL_ID,
    name: FLUFFY_NAME,
    logo: "fluffy.png",
    executable: () => FLUFFY_EXEC,
    requiredFiles: [FLUFFY_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////////////

//Set mod type priorities
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

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (!multiExe && !hasXbox) {
    //return immediately if only one exe filename for all versions
    return EXEC;
  }
  if (hasXbox && statCheckSync(discoveryPath, EXEC_XBOX)) {
    return EXEC_XBOX;
  }
  if (HAS_DEMO && statCheckSync(discoveryPath, EXEC_DEMO)) {
    FLUFFYMOD_PATH = FLUFFYMOD_PATH_DEMO;
    PRESET_PATH = PRESET_PATH_DEMO;
    return EXEC_DEMO;
  }
  return EXEC;
}

//Set mod path
function getModPath(discoveryPath) {
  if (!multiExe) {
    //return immediately if only one exe filename for all versions
    return () => FLUFFYMOD_PATH;
  }
  if (HAS_DEMO && statCheckSync(discoveryPath, EXEC_DEMO)) {
    FLUFFYMOD_PATH = FLUFFYMOD_PATH_DEMO;
    PRESET_PATH = PRESET_PATH_DEMO;
    return () => FLUFFYMOD_PATH;
  }
  return () => FLUFFYMOD_PATH;
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (hasXbox && (await statCheckAsync(gamePath, EXEC_XBOX))) {
    GAME_VERSION = "xbox";
    return GAME_VERSION;
  }
  if (HAS_DEMO && (await statCheckAsync(gamePath, EXEC_DEMO))) {
    GAME_VERSION = "demo";
    FLUFFYMOD_PATH = FLUFFYMOD_PATH_DEMO;
    PRESET_PATH = PRESET_PATH_DEMO;
    return GAME_VERSION;
  } else {
    GAME_VERSION = "default";
    return GAME_VERSION;
  }
}

const getDiscoveryPath = (api) => {
  //get the game's discovered path
  const state = api.getState();
  const discovery = state?.settings?.gameMode?.discovered?.[GAME_ID] ?? {};
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  return new Promise((resolve, reject) =>
    api.events.emit("purge-mods", true, (err) => (err ? reject(err) : resolve())),
  );
}

async function deploy(api) {
  return new Promise((resolve, reject) =>
    api.events.emit("deploy-mods", (err) => (err ? reject(err) : resolve())),
  );
}

function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
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
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () =>
    util.GameStoreHelper.findByAppId(gameSpec.discovery.ids).then((game) => game.gamePath);
}

//Set mod path
function makeGetModPath(api, gameSpec) {
  return () =>
    gameSpec.game.modPathIsRelative !== false
      ? gameSpec.game.modPath || "."
      : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === "steam") {
    return Promise.resolve({
      launcher: "steam",
    });
  } /*else if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/ else {
    return Promise.resolve(undefined);
  }
}

// AUTOMATIC INSTALLER FUNCTIONS /////////////////////////////////////////////////////////

//Check if Fluffy Mod Manager is installed
function isFluffyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some((id) => mods[id]?.type === FLUFFY_ID);
}

//Check if REFramework is installed
function isREFInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some((id) => mods[id]?.type === REF_ID);
}

//Function to auto-download Fluffy Mod Manager
async function downloadFluffy(api, gameSpec) {
  let isInstalled = isFluffyInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = FLUFFY_NAME;
    const MOD_TYPE = FLUFFY_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const modPageId = FLUFFY_PAGE_NO;
    const FILE_ID = FLUFFY_FILE_NO; //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = "site";
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });
    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try {
        //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, modPageId);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter((file) => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new VortexError(`No ${MOD_NAME} main file found`, { kind: "process-canceled" });
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${FILE}`;
      } catch {
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${FILE}`;
      }
      //Download the mod
      const dlInfo = {
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
      //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${modPageId}/files/?tab=files`;
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

//Function to auto-download REFramework from Github
async function downloadREFrameworkGitHub(api, gameSpec, check = true) {
  let isInstalled = isREFInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    //notification indicating install process
    const MOD_NAME = REF_NAME;
    const MOD_TYPE = REF_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const URL = REF_URL;
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
      //Show the user the download page if the download, install process fails
    } catch (err) {
      //const errPage = `https://github.com/praydog/REFramework/releases`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      try {
        window.api.shell.openUrl(REF_URL_ERR);
      } catch (openErr) {
        api.showErrorNotification("Failed to open the URL", openErr, { allowReport: false });
      }
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download REFramework from Nexus
async function downloadREFramework(api, gameSpec) {
  let isInstalled = isREFInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = REF_NAME;
    const MOD_TYPE = REF_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const modPageId = REF_PAGE_NO;
    const FILE_ID = REF_FILE_NO; //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = gameSpec.game.id;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });
    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }
    try {
      //get the mod files information from Nexus
      //*
      const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter((file) => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new VortexError(`No ${MOD_NAME} main file found`, { kind: "process-canceled" });
      }
      //*/
      //Download the mod
      const dlInfo = {
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${FILE_ID}`;
      const dlId = await new Promise((resolve, reject) =>
        api.events.emit(
          "start-download",
          [nxmUrl],
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
      //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${modPageId}/files/?tab=files`;
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
}

// MOD INSTALLER FUNCTIONS //////////////////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testFluffy(files, gameId) {
  const isFluffy = files.some((file) => path.basename(file).toLowerCase() === FLUFFY_EXEC);
  let supported = gameId === spec.game.id && isFluffy;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installFluffy(files) {
  const modFile = files.find((file) => path.basename(file).toLowerCase() === FLUFFY_EXEC);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: FLUFFY_ID };

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

//Installer test for REFramework file
function testREF(files, gameId) {
  const isREF = files.some((file) => path.basename(file).toLowerCase() === REF_FILE);
  let supported = gameId === spec.game.id && isREF;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install REFramework file
function installREF(files) {
  const modFile = files.find((file) => path.basename(file).toLowerCase() === REF_FILE);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: REF_ID };

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

//Installer test for mod files
function testFluffyMod(files, gameId) {
  const isMod = files.some((file) => path.basename(file).toLowerCase() === FLUFFYMOD_FILE);
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

//Installer install mod files
function installFluffyMod(files, fileName) {
  const modFile = files.find((file) => path.basename(file).toLowerCase() === FLUFFYMOD_FILE);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: FLUFFYMOD_ID };
  const MOD_NAME = path.basename(fileName);
  const MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, "");

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));

  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
      //destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);

  return Promise.resolve({ instructions });
}

//Installer test for mod files
function testFluffyPak(files, gameId) {
  const isMod = files.some((file) => path.extname(file).toLowerCase() === PAK_EXT);
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

//Installer install mod files
function installFluffyPak(files, fileName) {
  const modFile = files.find((file) => path.extname(file).toLowerCase() === PAK_EXT);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: FLUFFYPAK_ID };
  const MOD_NAME = path.basename(fileName);
  const MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, "");

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));

  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      //destination: path.join(MOD_FOLDER, file.substr(idx)),
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);

  return Promise.resolve({ instructions });
}

//Installer test for mod files
function testLooseLua(files, gameId) {
  const isLua = files.some((file) => path.extname(file).toLowerCase() === LUA_EXT);
  const isRefFolder = files.some((file) => REF_FOLDERS.includes(path.basename(file).toLowerCase()));
  let supported = gameId === spec.game.id && isLua && !isRefFolder;

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

//Installer install mod files
function installLooseLua(files) {
  // Root the install at the deepest folder that holds every script, so scripts in separate folders all install.
  const luaDirs = files
    .filter((file) => path.extname(file).toLowerCase() === LUA_EXT)
    .map((file) => (path.dirname(file) === "." ? [] : path.dirname(file).split(path.sep)));
  let sharedDirs = luaDirs[0];
  for (const dirs of luaDirs) {
    let n = 0;
    while (n < sharedDirs.length && n < dirs.length && sharedDirs[n] === dirs[n]) n++;
    sharedDirs = sharedDirs.slice(0, n);
  }
  const rootPrefix = sharedDirs.length > 0 ? sharedDirs.join(path.sep) + path.sep : "";
  const setModTypeInstruction = { type: "setmodtype", value: LOOSELUA_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));

  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join("reframework", "autorun", file.substr(rootPrefix.length)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for root folders/files
function testRoot(files, gameId) {
  const isFile = files.some((file) => ROOT_FILES.includes(path.basename(file).toLowerCase()));
  const isExt = files.some((file) => ROOT_EXTS.includes(path.extname(file).toLowerCase()));
  const isFluffy = files.some((file) => path.basename(file).toLowerCase() === FLUFFYMOD_FILE);
  let supported = gameId === spec.game.id && (isFile || isExt) && !isFluffy;

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

//Installer install root folders/files
function installRoot(files) {
  let modFile = files.find((file) => ROOT_FILES.includes(path.basename(file).toLowerCase()));
  if (modFile === undefined) {
    modFile = files.find((file) => ROOT_EXTS.includes(path.extname(file).toLowerCase()));
  }
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: ROOT_ID };
  const idx = modFile.lastIndexOf(path.basename(modFile));

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

//Installer test for Fluffy Preset files
function testPreset(files, gameId) {
  const isMod = files.some((file) => PRESET_EXTS.includes(path.extname(file).toLowerCase()));
  const isFluffy = files.some((file) => path.basename(file).toLowerCase() === FLUFFYMOD_FILE);
  let supported = gameId === spec.game.id && isMod && !isFluffy;

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

//Install Fluffy Preset files
function installPreset(files) {
  const modFile = files.find((file) => PRESET_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: PRESET_ID };

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

//test for zips
async function testZipContent(files, gameId) {
  const isFluffy = files.some((file) => path.basename(file).toLowerCase() === FLUFFY_EXEC);
  const isREF = files.some((file) => path.basename(file).toLowerCase() === REF_FILE);
  return Promise.resolve({
    supported: gameId === spec.game.id && !isFluffy && !isREF,
    requiredFiles: [],
  });
}

//install zips
async function installZipContent(files, destinationPath) {
  const zipFiles = files.filter((file) =>
    [".zip", ".7z", ".rar"].includes(path.extname(file).toLowerCase()),
  );
  // If it's a double zip, we don't need to repack.
  if (zipFiles.length > 0) {
    const instructions = zipFiles.map((file) => {
      return {
        type: "copy",
        source: file,
        destination: path.basename(file),
      };
    });
    return Promise.resolve({ instructions });
  }
  // Repack the ZIP
  else {
    const szip = new util.SevenZip();
    const archiveName = path.basename(destinationPath, ".installing") + ".zip";
    const archivePath = path.join(destinationPath, archiveName);
    const rootRelPaths = await fsp.readdir(destinationPath);
    await szip.add(
      archivePath,
      rootRelPaths.map((relPath) => path.join(destinationPath, relPath)),
      { raw: ["-r"] },
    );
    const instructions = [
      {
        type: "copy",
        source: archiveName,
        destination: path.basename(archivePath),
      },
    ];
    return Promise.resolve({ instructions });
  }
}

// MAIN FUNCTIONS ////////////////////////////////////////////////////////////////////////

//Notify User of Setup instructions
function setupNotify(api) {
  const MOD_NAME = `Fluffy Mod Manager`;
  const NOTIF_ID = `${GAME_ID}-setup-notification`;
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: "Mod Installation and Setup Instructions",
    allowSuppress: true,
    actions: [
      {
        title: "More",
        action: (dismiss) => {
          api.showDialog(
            "question",
            "Action required",
            {
              text:
                `You must use ${MOD_NAME} to enable mods after installing with Vortex.\n` +
                `Use the included tool to launch ${MOD_NAME} (at top of window or in "Dashboard" tab).\n` +
                `If your mod is not for ${MOD_NAME}, you must extract the zip file in the staging folder and change the mod type to "Binaries / Root Folder".\n`,
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

//Notify User to run Fluffy Mod Manager after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = FLUFFY_NAME;
  const MESSAGE = `Run ${MOD_NAME} after Deploy`;
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "Run Fluffy",
        action: (dismiss) => {
          runFluffy(api);
          dismiss();
        },
      },
      {
        title: "More",
        action: (dismiss) => {
          api.showDialog(
            "question",
            `Run ${MOD_NAME} to Enable Mods`,
            {
              text:
                `You must use ${MOD_NAME} to enable mods after installing with Vortex.\n` +
                `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n` +
                `If your mod is not for ${MOD_NAME}, you may need to change the mod type to "Binaries / Root Folder" manually.\n`,
            },
            [
              {
                label: "Run Fluffy",
                action: () => {
                  runFluffy(api);
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

function runFluffy(api) {
  const TOOL_ID = FLUFFY_TOOL_ID;
  const TOOL_NAME = FLUFFY_NAME;
  const state = api.store.getState();
  const tool = state?.settings?.gameMode?.discovered?.[GAME_ID]?.tools?.[TOOL_ID] ?? undefined;

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false }).catch((err) =>
        api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, {
          allowReport: ["EPERM", "EACCES", "ENOENT"].indexOf(err.code) !== -1,
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
      allowReport: ["EPERM", "EACCES", "ENOENT"].indexOf(err.code) !== -1,
    });
  }
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
}

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await vfs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  if (setupNotification) setupNotify(api);
  GAME_VERSION = await setGameVersion(GAME_PATH);
  MODTYPE_FOLDERS.push(FLUFFYMOD_PATH);
  MODTYPE_FOLDERS.push(PRESET_PATH);
  await downloadFluffy(api, gameSpec);
  if (useRefNightly) {
    await downloadREFrameworkGitHub(api, gameSpec);
  } else {
    await downloadREFramework(api, gameSpec);
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: getModPath(),
    requiresLauncher: requiresLauncher,
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: getExecutable,
    supportedTools: tools,
    getGameVersion: resolveGameVersion,
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

  //register mod installers
  context.registerInstaller(FLUFFY_ID, 25, testFluffy, installFluffy);
  context.registerInstaller(REF_ID, 30, testREF, installREF);
  //context.registerInstaller(FLUFFYPAK_ID, 40, testFluffyPak, installFluffyPak);
  context.registerInstaller(LOOSELUA_ID, 41, testLooseLua, installLooseLua);
  //context.registerInstaller(ROOT_ID, 50, testRoot, installRoot);
  context.registerInstaller(PRESET_ID, 43, testPreset, installPreset);
  if (!reZip) {
    context.registerInstaller(FLUFFYMOD_ID, 35, testFluffyMod, installFluffyMod);
  } else {
    context.registerInstaller(`${FLUFFYMOD_ID}zip`, 45, testZipContent, installZipContent);
  }

  //register actions
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Download Latest REFramework Nightly",
    () => {
      downloadREFrameworkGitHub(context.api, spec, false);
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
      try {
        window.api.shell.openFile(path.join(__dirname, "CHANGELOG.md"));
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

  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    try {
      window.api.shell.openFile(CONFIG_PATH);
    } catch (err) {
      context.api.showErrorNotification("Failed to open the file or folder", err, { allowReport: false });
    }
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Save Folder (Steam)",
    async () => {
      SAVE_PATH = await getSavePath();
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
}

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    context.api.onAsync("did-deploy", async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(
        context.api.getState(),
        GAME_ID,
      );
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
