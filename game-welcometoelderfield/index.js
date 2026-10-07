/*///////////////////////////////////////////
Name: Welcome to Elderfield Vortex Extension
Structure: RPGMaker Engine Game
Author: ChemBoy1
Version: 1.0.0
Date: 2026-10-07
Notes:
-
///////////////////////////////////////////*/

//Import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const React = require("react");
//const winapi = require('winapi-bindings');
//const { parseStringPromise } = require('xml2js');

//const USER_HOME = util.getVortexPath("home");
const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "welcometoelderfield";
const STEAMAPP_ID = "3195440"; // https://steamdb.info/app/3195440/
const STEAMAPP_ID_DEMO = "3195680"; // https://steamdb.info/app/3195680/
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = "XXX";
const XBOX_PUB_ID = null; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, STEAMAPP_ID_DEMO]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "Welcome to Elderfield";
const GAME_NAME_SHORT = "Welcome to Elderfield";
const EXEC = "Game.exe";
const EXEC_EGS = EXEC;
const NAME_FOLDER = "Elderfield";
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/2429"; //Nexus link to this extension. Used for links

//feature toggles
let hasXbox = false; //toggle for Xbox version logic
if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = true; //enable to show the user a notification with special instructions (specify below) - default true: plugins.js manual-update reminder is always relevant
const debug = false; //toggle for debug mode

//info for modtypes, installers, tools, and actions
const ROOT_FOLDERS = [
  NAME_FOLDER,
  "audio",
  "css",
  "data",
  "effects",
  "fonts",
  "icon",
  "img",
  "lib",
  "locales",
  "swiftshader",
];
const DATA_FOLDER = "XXX";
const CONFIGMOD_LOCATION = DOCUMENTS;
const CONFIG_FOLDERNAME = "XXX";
const SAVEMOD_LOCATION = DOCUMENTS;
const SAVE_FOLDERNAME = CONFIG_FOLDERNAME;

let GAME_PATH = "";
let GAME_VERSION = "";
let STAGING_FOLDER = "";
let DOWNLOAD_FOLDER = "";
const APPMANIFEST_FILE = "appxmanifest.xml";
const EXEC_XBOX = "gamelaunchhelper.exe";

const JSFOLDER_ID = `${GAME_ID}-jsfolder`;
const JSFOLDER_NAME = "js folder";
const JSFOLDER_PATH = ".";
const JSFOLDER_FILE = "js";

const JSFILE_ID = `${GAME_ID}-jsfile`;
const JSFILE_NAME = "js file";
const JSFILE_PATH = path.join("js", "plugins");
const JSFILE_EXT = ".js";

const JSLIST_FILE = "plugins.js";
const JSLIST_FILE_PATH = path.join("js", JSLIST_FILE);
const JSLIST_HEADER = `var $plugins =\n`;
const JSLIST_DEFAULT_DESCRIPTION =
  "Mod installed with Vortex. See mod page for description. You may need to add additional parameters below.";
const LO_ATTRIBUTE = "pluginNames"; //mod attribute holding the plugin basenames it installed, set by installJsFile/installJsFolder
let isPurging = false; //guards plugins.js writes during a purge cycle - see the will-purge/did-deploy listeners in main()
const LO_IMAGE_WIDTH = 96; //Width of the load order thumbnail image
const LO_IMAGE_HEIGHT = LO_IMAGE_WIDTH * 0.5625;
const PLUGINS_LO_FILE = "pluginsLoadOrder.json"; //Vortex-owned sidecar (profile-prefixed), durable order/enabled/description/parameters store - lives in the game root, never deployed, so a purge never touches it

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const JSON_ID = `${GAME_ID}-json`;
const JSON_NAME = "JSON Mod";
const JSON_PATH = path.join("data");
const JSON_EXT = ".json";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_EXTS = [".ini"];
const CONFIG_FILES = ["XXX"];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, DATA_FOLDER, SAVE_FOLDERNAME);
let USERID_FOLDER = "";
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}
try {
  const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
} catch {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
} //*/
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_EXTS = [".sav"];
const SAVE_FILES = ["XXX"];

const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = "XXX";
const TOOL_EXEC = path.join("XXX", "XXX.exe");

const MOD_PATH_DEFAULT = ".";
const REQ_FILE = EXEC; //NAME_FOLDER or EXEC
const PARAMETERS_STRING = "";
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [
  path.join("**", "instructions.txt"),
  path.join("**", "screenshot*"),
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
  path.join("**", "plugins.js"),
];
const IGNORE_DEPLOY = [
  path.join("**", "instructions.txt"),
  path.join("**", "screenshot*"),
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
  path.join("**", "plugins.js"),
];
let MODTYPE_FOLDERS = [JSFILE_PATH, JSON_PATH];

//filled in from data above
const spec = {
  game: {
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME_SHORT,
    //"parameters": PARAMETERS,
    logo: `${GAME_ID}.jpg`,
    mergeMods: true,
    requiresCleanup: true,
    modPath: MOD_PATH_DEFAULT,
    modPathIsRelative: true,
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
      id: JSFOLDER_ID,
      name: JSFOLDER_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", JSFOLDER_PATH),
    },
    {
      id: JSFILE_ID,
      name: JSFILE_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", JSFILE_PATH),
    },
    {
      id: ROOT_ID,
      name: ROOT_NAME,
      priority: "high",
      targetPath: `{gamePath}`,
    },
    {
      id: JSON_ID,
      name: JSON_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", JSON_PATH),
    },
  ],
  discovery: {
    ids: DISCOVERY_IDS_ACTIVE,
    names: [],
  },
};

//3rd party tools and launchers
const tools = [
  {
    id: `${GAME_ID}-customlaunch`,
    name: "Custom Launch",
    logo: "exec.png",
    executable: () => EXEC,
    requiredFiles: [EXEC],
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

//Read the plugins.js array. Returns [] on a missing/corrupt file - never plants an empty one,
//since plugins.js is a file the game itself parses at runtime.
async function readPluginsListFile(listPath) {
  try {
    let data = await fsp.readFile(listPath);
    data = data.toString();
    data = data.slice(data.indexOf("["), data.lastIndexOf(";"));
    return JSON.parse(data);
  } catch {
    return [];
  }
}

//Write the plugins.js array back out, preserving the header/footer the game expects
async function writePluginsListFile(listPath, dataArray) {
  const writeData = JSON.stringify(dataArray, null, 2);
  await fsp.writeFile(listPath, `${JSLIST_HEADER}${writeData};`);
}

//Create an empty file (and its parent folder) if it doesn't exist yet - never truncates an
//existing one. Only used for the plugins load order sidecar, a file Vortex owns outright.
async function ensureFileAsync(filePath) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const handle = await fsp.open(filePath, "a");
  await handle.close();
}

//Resolve (and create if missing) this profile's plugins load order sidecar path
async function ensurePluginsSidecar(gamePath, profileId) {
  const sidecarPath = path.join(gamePath, `${profileId}_${PLUGINS_LO_FILE}`);
  await ensureFileAsync(sidecarPath);
  return sidecarPath;
}

//Read the plugins load order sidecar. Returns [] on a missing/corrupt file - safe to plant
//empty since, unlike plugins.js, the game never parses this file.
async function readPluginsSidecar(sidecarPath) {
  try {
    const raw = await fsp.readFile(sidecarPath, { encoding: "utf8" });
    if (raw.length === 0) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

//Write the plugins load order sidecar
async function writePluginsSidecar(sidecarPath, dataArray) {
  await fsp.writeFile(sidecarPath, JSON.stringify(dataArray, null, 2), { encoding: "utf8" });
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () =>
    gameSpec.game.modPathIsRelative !== false
      ? gameSpec.game.modPath || "."
      : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () =>
    util.GameStoreHelper.findByAppId(gameSpec.discovery.ids).then((game) => game.gamePath);
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  //*
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
  if (hasXbox && statCheckSync(discoveryPath, EXEC_XBOX)) {
    return EXEC_XBOX;
  }
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (hasXbox && (await statCheckAsync(gamePath, EXEC_XBOX))) {
    GAME_VERSION = "xbox";
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

//Test for save files
function testJsFolder(files, gameId) {
  const isMod = files.some((file) => path.basename(file).toLowerCase() === JSFOLDER_FILE);
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
async function installJsFolder(files) {
  const MOD_TYPE = JSFOLDER_ID;
  const modFile = files.find((file) => path.basename(file).toLowerCase() === JSFOLDER_FILE);
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
  const pluginNames = instructions
    .filter(
      (instr) =>
        path.dirname(instr.destination) === JSFILE_PATH &&
        path.extname(instr.destination).toLowerCase() === JSFILE_EXT,
    )
    .map((instr) => path.basename(instr.destination, JSFILE_EXT));
  instructions.push(setModTypeInstruction);
  if (pluginNames.length > 0) {
    instructions.push({ type: "attribute", key: LO_ATTRIBUTE, value: pluginNames });
  }

  return Promise.resolve({ instructions });
}

//Test for save files
function testJsFile(files, gameId) {
  const isMod = files.some((file) => path.extname(file).toLowerCase() === JSFILE_EXT);
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
async function installJsFile(files) {
  const MOD_TYPE = JSFILE_ID;
  const modFile = files.find((file) => path.extname(file).toLowerCase() === JSFILE_EXT);
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
  const pluginNames = filtered
    .filter((file) => path.extname(file).toLowerCase() === JSFILE_EXT)
    .map((file) => path.basename(file, JSFILE_EXT));
  instructions.push(setModTypeInstruction);
  if (pluginNames.length > 0) {
    instructions.push({ type: "attribute", key: LO_ATTRIBUTE, value: pluginNames });
  }

  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some((file) => ROOT_FOLDERS.includes(path.basename(file)));
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

//Installer install Root folder files
function installRoot(files) {
  const MOD_TYPE = ROOT_ID;
  const modFile = files.find((file) => ROOT_FOLDERS.includes(path.basename(file)));
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`;
  const idx = modFile.indexOf(ROOT_IDX);
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

//Test for save files
function testJson(files, gameId) {
  const isMod = files.some((file) => path.extname(file).toLowerCase() === JSON_EXT);
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
function installJson(files) {
  const MOD_TYPE = JSON_ID;
  const modFile = files.find((file) => path.extname(file).toLowerCase() === JSON_EXT);
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

  const filtered = files.filter((file) => !file.endsWith(path.sep));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: file,
    };
  });
  return Promise.resolve({ instructions });
}

function fallbackInstallerNotify(api, modName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, spec.game.id);
  modName = path.basename(modName, ".installing");
  const id = modName.replace(/[^a-zA-Z0-9\s]*( )*/gi, "");
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

//Find the Vortex mod id that installed a given plugin, via the LO_ATTRIBUTE stamped by
//installJsFile/installJsFolder. Without this every plugin row shows core FBLO's
//"Not managed by Vortex" banner even when Vortex installed it.
function getModId(api, pluginName) {
  const mods = api.getState()?.persistent?.mods?.[GAME_ID] ?? {};
  const modMatch = Object.values(mods).find((mod) =>
    (mod.attributes?.[LO_ATTRIBUTE] ?? []).includes(pluginName),
  );
  return modMatch?.id;
}

//List the plugin basenames actually deployed to js/plugins right now.
async function getDeployedPluginNames(pluginsDir) {
  try {
    const files = await fsp.readdir(pluginsDir, { recursive: true });
    return files
      .filter((file) => file.endsWith(JSFILE_EXT))
      .map((file) => path.basename(file, JSFILE_EXT));
  } catch {
    return [];
  }
}

//Read installed plugins.js entries, reconciled against the plugins actually deployed to
//js/plugins and against the durable sidecar. Only plugins owned by a Vortex mod (LO_ATTRIBUTE
//match) are returned - vanilla/base-game plugins never show on the Load Order page.
//serializePluginsLoadOrder merges vanilla entries back into plugins.js untouched, so they stay
//in the file even though they never appear here.
//
//Order/content precedence per plugin: plugins.js's own copy first (freshest - catches hand
//edits to description/parameters), then the sidecar's copy (durable - survives plugins.js being
//reset, e.g. by a purge), then a fresh default for a plugin never seen before.
async function deserializePluginsLoadOrder(api) {
  if (isPurging) {
    //Every plugin .js file is transiently gone during a purge - rebuilding from that would read
    //as "every plugin uninstalled" and wipe plugins.js's custom parameters on the next write.
    //Return whatever is already stored; main()'s did-deploy listener re-runs this for real once
    //the purge's matching deploy restores the files.
    const profile = selectors.activeProfile(api.getState());
    return profile?.id !== undefined
      ? (api.getState()?.persistent?.loadOrder?.[profile.id] ?? [])
      : [];
  }

  const gamePath = getDiscoveryPath(api);
  const listPath = path.join(gamePath, JSLIST_FILE_PATH);
  const pluginsDir = path.join(gamePath, JSFILE_PATH);
  const profile = selectors.activeProfile(api.getState());
  const sidecarPath = await ensurePluginsSidecar(gamePath, profile?.id);

  //Seed lock state from the stored load order. plugins.js/the sidecar have no lock field, so
  //without this a locked entry would silently unlock on the next deploy or page mount.
  const prevLO = api.getState()?.persistent?.loadOrder?.[profile?.id] ?? [];
  const prevById = new Map(prevLO.map((entry) => [entry.id, entry]));

  const onDisk = await getDeployedPluginNames(pluginsDir);
  const isManaged = (name) => onDisk.includes(name) && getModId(api, name) !== undefined;

  const dataArray = (await readPluginsListFile(listPath)).filter((entry) => isManaged(entry.name));
  const known = new Set(dataArray.map((entry) => entry.name));

  (await readPluginsSidecar(sidecarPath)).forEach((entry) => {
    if (isManaged(entry.name) && !known.has(entry.name)) {
      dataArray.push(entry);
      known.add(entry.name);
    }
  });

  onDisk.forEach((name) => {
    if (isManaged(name) && !known.has(name)) {
      dataArray.push({
        name,
        status: true,
        description: JSLIST_DEFAULT_DESCRIPTION,
        parameters: {},
      });
      known.add(name);
    }
  });

  return dataArray.map((entry) => ({
    id: entry.name,
    name: entry.name,
    modId: getModId(api, entry.name),
    enabled: entry.status !== false,
    //persistent.loadOrder first (freshest), then the sidecar copy carried on `entry.locked` if
    //this plugin's tier came from the sidecar (see readPluginsSidecar merge above).
    locked: prevById.get(entry.name)?.locked ?? entry.locked ?? false,
    data: entry,
  }));
}

//Write the reordered/toggled load order back to plugins.js AND the durable sidecar, preserving
//each entry's description/parameters. Entries the Load Order page doesn't manage (vanilla
//plugins, anything not owned by a Vortex mod) pass through untouched in plugins.js as long as
//they're still deployed - keeps them in the file while still dropping dead entries left behind
//by an uninstalled mod. The sidecar only ever holds managed (mod-owned) entries.
async function serializePluginsLoadOrder(api, loadOrder) {
  if (isPurging) {
    return; //purge in progress - see deserializePluginsLoadOrder and main()'s listeners
  }

  const gamePath = getDiscoveryPath(api);
  const listPath = path.join(gamePath, JSLIST_FILE_PATH);
  const pluginsDir = path.join(gamePath, JSFILE_PATH);
  const profile = selectors.activeProfile(api.getState());
  const sidecarPath = await ensurePluginsSidecar(gamePath, profile?.id);

  const onDiskArray = await readPluginsListFile(listPath);
  const onDiskByName = new Map(onDiskArray.map((entry) => [entry.name, entry]));
  const sidecarByName = new Map(
    (await readPluginsSidecar(sidecarPath)).map((entry) => [entry.name, entry]),
  );
  const managedNames = new Set(loadOrder.map((entry) => entry.name));
  const deployedNames = await getDeployedPluginNames(pluginsDir);

  const unmanagedEntries = onDiskArray.filter(
    (entry) => !managedNames.has(entry.name) && deployedNames.includes(entry.name),
  );
  const managedEntries = loadOrder.map((entry) => ({
    ...(onDiskByName.get(entry.name) ??
      sidecarByName.get(entry.name) ??
      entry.data ?? {
        name: entry.name,
        description: JSLIST_DEFAULT_DESCRIPTION,
        parameters: {},
      }),
    name: entry.name,
    status: entry.enabled !== false,
  }));
  //Sidecar-only field: `locked` is pure Vortex UI state, plugins.js has no concept of it and
  //shouldn't gain one. persistent.loadOrder already covers the common case (profile switch,
  //reload) via the prevById lookup above - this is the fallback for if that state is ever lost
  //while the sidecar survives, matching the PAK sidecar precedent (it round-trips the whole entry).
  const sidecarEntries = managedEntries.map((entry, i) => ({
    ...entry,
    locked: loadOrder[i].locked ?? false,
  }));

  try {
    await writePluginsListFile(listPath, [...unmanagedEntries, ...managedEntries]);
  } catch (err) {
    log("error", `Could not write plugins.js load order: ${err}`);
  }
  try {
    await writePluginsSidecar(sidecarPath, sidecarEntries);
  } catch (err) {
    log("error", `Could not write plugins load order sidecar: ${err}`);
  }
}

//On purge, every deployed plugin .js file is gone - remove their now-dead entries from plugins.js
//(vanilla/still-deployed ones stay untouched) so the game doesn't try to load a file that no
//longer exists. Matches game-thelastofuspart2's didPurge/clearModOrder pattern: a dedicated purge
//cleanup, independent of the reorder/serialize cycle (which stays no-op'd by `isPurging` - this
//runs regardless of that guard, it's the intentional write purge is supposed to cause). The
//sidecar is left alone on purpose - it's the recovery copy for exactly this case, picked back up
//by deserializePluginsLoadOrder's sidecar tier if/when these plugins get reinstalled.
async function clearPurgedPlugins(api, profileId) {
  const profile = selectors.profileById(api.getState(), profileId);
  if (profile?.gameId !== GAME_ID) return;

  const gamePath = getDiscoveryPath(api);
  const listPath = path.join(gamePath, JSLIST_FILE_PATH);
  const pluginsDir = path.join(gamePath, JSFILE_PATH);

  const deployedNames = await getDeployedPluginNames(pluginsDir);
  const onDiskArray = await readPluginsListFile(listPath);
  const remaining = onDiskArray.filter((entry) => deployedNames.includes(entry.name));
  if (remaining.length === onDiskArray.length) return; //nothing purged, nothing to prune

  try {
    await writePluginsListFile(listPath, remaining);
  } catch (err) {
    log("error", `Could not clear purged plugins from plugins.js: ${err}`);
  }
}

//Directly patch one plugin's `description`/`parameters` in plugins.js AND the sidecar, independent
//of the reorder/serialize cycle. Editing them isn't a load-order change, so it shouldn't wait on a
//reorder/toggle to take effect - and serializePluginsLoadOrder's freshness priority (plugins.js's
//own copy over anything else) would silently discard this edit if routed through it, since it
//always prefers on-disk content over an in-memory update for an already-listed plugin.
async function writePluginEntry(api, pluginName, updates) {
  const gamePath = getDiscoveryPath(api);
  const listPath = path.join(gamePath, JSLIST_FILE_PATH);
  const profile = selectors.activeProfile(api.getState());
  const sidecarPath = await ensurePluginsSidecar(gamePath, profile?.id);

  const patch = (arr, withLocked) => {
    if (arr.some((entry) => entry.name === pluginName)) {
      return arr.map((entry) => (entry.name === pluginName ? { ...entry, ...updates } : entry));
    }
    //Plugin visible on the LO page but never yet written to this file (e.g. edited right after
    //install, before any reorder/toggle has triggered a real serialize) - add it fresh.
    const fresh = { name: pluginName, status: true, ...updates };
    return [...arr, withLocked ? { ...fresh, locked: false } : fresh];
  };

  await writePluginsListFile(listPath, patch(await readPluginsListFile(listPath), false));
  await writePluginsSidecar(sidecarPath, patch(await readPluginsSidecar(sidecarPath), true));
}

//Read a plugin's current `description`/`parameters` fresh from plugins.js (falling back to the
//sidecar, then a bare default), same freshness priority as deserializePluginsLoadOrder. The LO
//entry's own `data` is a snapshot from whenever the page last refreshed - stale the moment
//anything writes the file directly (a hand-edit, or this same dialog from a previous open), so
//the popup must never source its initial text from it.
async function readPluginEntry(api, pluginName) {
  const gamePath = getDiscoveryPath(api);
  const listPath = path.join(gamePath, JSLIST_FILE_PATH);
  const profile = selectors.activeProfile(api.getState());
  const sidecarPath = await ensurePluginsSidecar(gamePath, profile?.id);

  const onDisk = (await readPluginsListFile(listPath)).find((entry) => entry.name === pluginName);
  if (onDisk) return onDisk;
  const sidecar = (await readPluginsSidecar(sidecarPath)).find(
    (entry) => entry.name === pluginName,
  );
  return sidecar ?? { description: JSLIST_DEFAULT_DESCRIPTION, parameters: {} };
}

const DESC_INPUT_ID = `${GAME_ID}-editdescinput`;
const PARAMS_INPUT_ID = `${GAME_ID}-editparamsinput`;

//The Parameters field holds only the inner key/value pairs, no wrapping {} required - strips one
//off if the user (or a prefill) included it, so typing either form works the same way.
function stripOuterBraces(text) {
  const trimmed = (text ?? "").trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}") ? trimmed.slice(1, -1).trim() : trimmed;
}

function unquote(text) {
  const t = text.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) {
    return t.slice(1, -1);
  }
  return t;
}

//Split on every top-level occurrence of a character in `delimiters` - skips anything inside a
//quoted ('/") run so a comma or colon in a quoted value never gets treated as a separator.
function splitTopLevel(text, delimiters) {
  const parts = [];
  let current = "";
  let quote = null;
  for (const ch of text) {
    if (quote !== null) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (delimiters.includes(ch)) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

//Fallback when the Parameters field isn't valid JSON on its own: read it as "key: value" pairs
//(newline- or comma-separated, quote-aware) and force both sides into double-quoted JSON strings,
//quotes optional either way. Matches how RPG Maker MV/MZ itself always stores plugin parameter
//values - plain strings, even for declared number/boolean/struct types; the plugin's own code
//casts them at runtime - so quoting everything as a string is the correct fallback, not a guess.
function coercePairsToJson(text) {
  const entries = splitTopLevel(text, "\n,")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
  if (entries.length === 0) return "{}";
  const pairs = entries.map((entry) => {
    const [keyPart, ...rest] = splitTopLevel(entry, ":");
    if (rest.length === 0) {
      throw new Error(`No ':' found in "${entry}"`);
    }
    const key = unquote(keyPart);
    const value = unquote(rest.join(":")); //value itself may legitimately contain ':' (URLs, times)
    return `${JSON.stringify(key)}: ${JSON.stringify(value)}`;
  });
  return `{${pairs.join(", ")}}`;
}

//Popup text editor for a plugin's `description` and `parameters`. `currentDescription`/
//`currentParamsText` must be freshly read (see readPluginEntry) by the caller, not pulled from the
//LO entry's own cached `data`. Returns {description, parameters} on Save, or undefined on Cancel.
//Reopens with the user's own description edit AND (invalid) parameters text both preserved on a
//JSON parse failure, so a typo never costs them either edit.
async function editParametersDialog(api, pluginName, currentDescription, currentParamsText) {
  const result = await api.showDialog(
    "question",
    `Edit Parameters - ${pluginName}`,
    {
      text:
        "Edit this plugin's description and parameters below. Parameter keys/values don't need " +
        "quotes or a surrounding {} - they're added automatically.",
      input: [
        { id: DESC_INPUT_ID, type: "multiline", label: "Description", value: currentDescription },
        {
          id: PARAMS_INPUT_ID,
          type: "multiline",
          label: "Parameters (key: value pairs, one per line)",
          value: stripOuterBraces(currentParamsText),
        },
      ],
    },
    //No `default: true` on Save - core's Dialog.tsx binds Enter to the default action for the
    //WHOLE modal regardless of focus, which would submit/close on every newline typed into either
    //multiline field below instead of inserting one. Explicit Save click only.
    [{ label: "Cancel" }, { label: "Save" }],
  );
  if (result.action !== "Save") return undefined;

  const description = result.input[DESC_INPUT_ID] ?? "";
  const raw = stripOuterBraces(result.input[PARAMS_INPUT_ID]);
  let parameters;
  try {
    parameters = raw === "" ? {} : JSON.parse(`{${raw}}`);
  } catch (strictErr) {
    try {
      parameters = JSON.parse(coercePairsToJson(raw));
    } catch {
      api.showErrorNotification("Invalid JSON - parameters not saved", strictErr, {
        allowReport: false,
      });
      return editParametersDialog(api, pluginName, description, raw);
    }
  }
  return { description, parameters };
}

//React load order instructions renderer
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
      "Filter the list above by status. Clear the filter before reordering plugins.",
    ),
    React.createElement("br", null),
    React.createElement(
      "p",
      null,
      "Drag and drop plugins to change their order in the plugins.js file. Use the checkbox to " +
        "enable or disable a plugin without uninstalling it. Changes are written to plugins.js " +
        "immediately - no deploy needed.",
    ),
    React.createElement("br", null),
    React.createElement(
      "p",
      null,
      "Use the pencil icon (or right-click) on a plugin to set its parameters without hand-editing " +
        "plugins.js; check each mod's description for instructions on what to enter. " +
        "Vanilla/base-game plugins never show here, but stay untouched in plugins.js.",
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

//Status filter shared helpers (load order page). Groups combine with AND across, OR within.
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

//React line item renderer for load order
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
    serializePluginsLoadOrder(context.api, newLO);
  }, [dispatch, context, profile, loadOrder, loEntry, isEntryLocked]);

  const onEditParameters = React.useCallback(async () => {
    const current = await readPluginEntry(context.api, loEntry.name);
    const updates = await editParametersDialog(
      context.api,
      loEntry.name,
      current.description ?? "",
      JSON.stringify(current.parameters ?? {}, null, 2),
    );
    if (updates === undefined) return; //cancelled, or reopened-and-cancelled after a parse error
    try {
      await writePluginEntry(context.api, loEntry.name, updates);
      const lo = await deserializePluginsLoadOrder(context.api);
      dispatch(actions.setFBLoadOrder(profile.id, lo));
    } catch (err) {
      context.api.showErrorNotification("Could not save plugin parameters", err, {
        allowReport: false,
      });
    }
  }, [context, loEntry, dispatch, profile]);

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
        style: { cursor: "pointer", display: "flex", alignItems: "center" },
        title: "Edit Parameters",
        onClick: (evt) => {
          evt.stopPropagation();
          onEditParameters();
        },
      },
      React.createElement(Icon, { name: "edit" }),
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
}

//Right-click context menu for load order entries (single + multi-select). File-based LO surface -
//no per-entry mod folder to open (one Vortex mod can own several plugin files via LO_ATTRIBUTE), so
//no "Open Mod Folder" item - Open Staging Folder / Open Mod Page cover that need instead.
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
    if (serialize) serializePluginsLoadOrder(context.api, newLO);
    onClose();
  };

  const isEntryLocked = isLocked(item);
  const isEntryEnabled = item.enabled ?? true;

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

  const openStagingFolder = (folder) => {
    try {
      window.api.shell.openFile(folder);
    } catch (err) {
      context.api.showErrorNotification("Failed to open the file or folder", err, {
        allowReport: false,
      });
    }
  };

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
      targets.some((t) => t.modId !== undefined)
        ? menuItem(`Open Staging Folders (${n})`, () => {
            //Several rows can resolve to the same staging folder on file-based games - dedupe so it opens once.
            const folders = [
              ...new Set(
                targets.map((t) => getModStagingFolder(context.api, t.modId)).filter(Boolean),
              ),
            ];
            folders.forEach(openStagingFolder);
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
    menuItem("Edit Parameters", () => {
      onClose();
      (async () => {
        const current = await readPluginEntry(context.api, item.name);
        const updates = await editParametersDialog(
          context.api,
          item.name,
          current.description ?? "",
          JSON.stringify(current.parameters ?? {}, null, 2),
        );
        if (updates === undefined) return;
        try {
          await writePluginEntry(context.api, item.name, updates);
          const lo = await deserializePluginsLoadOrder(context.api);
          dispatch(actions.setFBLoadOrder(profile.id, lo));
        } catch (err) {
          context.api.showErrorNotification("Could not save plugin parameters", err, {
            allowReport: false,
          });
        }
      })();
    }),
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
    stagingFolder
      ? menuItem("Open Staging Folder", () => {
          openStagingFolder(stagingFolder);
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

//Notify User about the plugins.js file
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup`;
  const MESSAGE = `Configure Installed Plugins`;
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
                `Installed js plugin mods are added to the plugins.js file automatically and can be reordered ` +
                `or enabled/disabled from Vortex's Load Order page.\n` +
                `Some plugins still need their parameters filled in - use the pencil icon (or right-click) on a ` +
                `plugin's Load Order entry, or open plugins.js directly. Read each mod's description for ` +
                `instructions on what to enter.\n` +
                `You can open the file with the button below or using the button inside the folder icon on the Mods toolbar.\n`,
            },
            [
              { label: "Acknowledge", action: () => dismiss() },
              {
                label: "Open plugins.js File",
                action: () => {
                  try {
                    window.api.shell.openFile(path.join(GAME_PATH, JSLIST_FILE_PATH));
                  } catch (err) {
                    api.showErrorNotification("Failed to open the file or folder", err, {
                      allowReport: false,
                    });
                  }
                  dismiss();
                },
              },
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

/*
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
  //GAME_VERSION = await setGameVersion(GAME_PATH);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  if (setupNotification) setupNotify(api);
  // ASYNC CODE //////////////////////////////////////////
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutable,
    queryModPath: makeGetModPath(context.api, gameSpec),
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

  /*register mod types explicitly
  context.registerModType(CONFIG_ID, 60,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, CONFIG_PATH),
    () => Promise.resolve(false),
    { name: CONFIG_NAME }
  );
  context.registerModType(SAVE_ID, 60,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, SAVE_PATH),
    () => Promise.resolve(false),
    { name: SAVE_NAME }
  ); //*/

  //register mod installers
  context.registerInstaller(JSFOLDER_ID, 25, testJsFolder, installJsFolder);
  context.registerInstaller(JSFILE_ID, 27, testJsFile, installJsFile);
  context.registerInstaller(ROOT_ID, 29, testRoot, installRoot);
  context.registerInstaller(JSON_ID, 31, testJson, installJson);
  //context.registerInstaller(CONFIG_ID, 47, testConfig, installConfig);
  //context.registerInstaller(SAVE_ID, 49, testSave, installSave);
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) =>
      installFallback(context.api, files, destinationPath),
    );
  }

  //register load order
  context.registerLoadOrder({
    gameId: GAME_ID,
    validate: async () => Promise.resolve(undefined), // no validation implemented yet
    deserializeLoadOrder: () => deserializePluginsLoadOrder(context.api),
    serializeLoadOrder: (loadOrder) => serializePluginsLoadOrder(context.api, loadOrder),
    toggleableEntries: true,
    usageInstructions: LoadOrderInstructions,
    customItemRenderer: LoadOrderItemRenderer,
  });

  //register actions
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open plugins.js File",
    () => {
      GAME_PATH = getDiscoveryPath(context.api);
      const openPath = path.join(GAME_PATH, JSLIST_FILE_PATH);
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
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    const api = context.api;

    //Purging removes every plugin .js file transiently, and core's own did-deploy handler reads
    //the load order (via deserializePluginsLoadOrder) before this listener gets a chance to run,
    //so the guard has to stay armed past did-purge and only clear once the matching deploy that
    //restores the files actually lands - then this listener re-runs the read/dispatch itself.
    api.events.on("will-purge", (profileId) => {
      const profile = selectors.profileById(api.getState(), profileId);
      if (profile?.gameId === GAME_ID) {
        isPurging = true;
      }
    });
    api.events.on("did-deploy", async (profileId) => {
      if (!isPurging) return;
      const profile = selectors.profileById(api.getState(), profileId);
      if (profile?.gameId !== GAME_ID) return;
      isPurging = false;
      try {
        const lo = await deserializePluginsLoadOrder(api);
        api.store.dispatch(actions.setFBLoadOrder(profileId, lo));
      } catch (err) {
        log("error", `Could not refresh plugins.js load order after purge: ${err}`);
      }
    });
    //Files are gone by did-purge - prune their dead plugins.js entries now rather than waiting on
    //a redeploy/reorder to notice, so the game never tries to load a file that's already deleted.
    api.events.on("did-purge", (profileId) => {
      clearPurgedPlugins(api, profileId);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
