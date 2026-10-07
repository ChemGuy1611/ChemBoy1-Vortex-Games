/*/////////////////////////////////////////
Name: God of War (2018) Vortex Extension
Structure: Sony Port, Custom Game Data
Author: ChemBoy1
Version: 1.0.1
Date: 2026-10-07
/////////////////////////////////////////*/

//import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log, VortexError } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const React = require("react");

//Specify all the information about the game
const STEAMAPP_ID = "1593500";
const EPICAPP_ID = "91bfb663fe7a4b9698ba08bd80549b34"; //from egdata.app
const GOGAPP_ID = "1074905459"; //https://www.gogdb.org/product/1074905459
const GAME_ID = "godofwar";
const EXEC = "GoW.exe";
const GAME_NAME = "God of War (2018)";
const GAME_NAME_SHORT = "God of War";
const MOD_PATH = ".";
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/God_of_War";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/340"; //Nexus link to this extension. Used for links

let GAME_PATH = "";
let GAME_VERSION = ""; //Game version
let STAGING_FOLDER = "";
let DOWNLOAD_FOLDER = "";

//Mod types and installers info
const USER_HOME = util.getVortexPath("home");

const DATA_ID = `${GAME_ID}-data`;
const DATA_NAME = "exec folder";
const DATA_FILE = "exec";

const PATCH_ID = `${GAME_ID}-patchfolder`;
const PATCH_NAME = "patch Folder";
const PATCH_PATH = path.join("exec");
const PATCH_FILE = "patch";

const EXECSUB_ID = `${GAME_ID}-execsub`;
const EXECSUB_NAME = "exec subfolder";
const EXECSUB_PATH = path.join("exec");
const EXECSUB_FOLDERS = ["ActivityFeed", "cinematics", "dc", "languages", "sound", "wad"];

const PACK_ID = `${GAME_ID}-pack`;
const PACK_NAME = "Texpack/Lodpack";
const PACK_PATH = path.join("exec", "patch", "pc_le");
const READ_PAK_PATH = path.join("exec", "patch");
const PACK_EXT = ".texpack";
const LOD_EXT = ".lodpack";
const PACK_EXTS = [PACK_EXT, LOD_EXT];
const READ_WAD_PATH = path.join("exec", "wad");

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save (User Home)";
const SAVE_EXT = ".sav";
const SAVE_FOLDER = path.join(USER_HOME, "Saved Games", "God of War");
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

//For boot-options.json file
const BOOT_OPTIONS_FILENAME = "boot-options.json";
const BOOT_OPTIONS_FILEPATH = path.join(DATA_FILE, BOOT_OPTIONS_FILENAME);
const BOOT_TEX_KEY = "patch-texpacks";
const BOOT_LOD_KEY = "patch-lodpacks";
const BOOT_CHUNKS_KEY = "playgo-chunks"; //names of the base game packs the game loads itself
const BOOT_VANILLA_STEMS = ["root"]; //always base game packs, whether or not playgo-chunks lists them
const BOOT_PATH_PREFIX = "../../"; //pack paths in boot-options.json are relative to a folder two levels below exec
const PACK_SCAN_PATHS = [READ_PAK_PATH, READ_WAD_PATH]; //folders searched for texpack/lodpack files
const PACK_MODTYPE_IDS = [DATA_ID, PATCH_ID, EXECSUB_ID, PACK_ID]; //mod types that can deliver a pack file
const PACKS_LO_FILE = "packsLoadOrder.json"; //Vortex-owned sidecar (profile-prefixed), durable order/enabled/locked store - lives in exec next to boot-options.json, outside the scanned folders, never deployed
let mod_update_all_profile = false; // for mod update to keep packs in the load order and not uncheck them
let updateModIds = new Map(); // Nexus mod id -> {firstSeen, targetFileId} (Map, not scalar, so batch updates don't clobber each other)
const MAX_UPDATE_WAIT_MS = 5 * 60 * 1000; // release the guard for an update that never lands (cancelled or failed install)
const LO_IMAGE_WIDTH = 96; //Width of the load order thumbnail image
const LO_IMAGE_HEIGHT = LO_IMAGE_WIDTH * 0.5625;

const SETTINGS_FILE = "settings.ini";

const LUAMOD_ID = `${GAME_ID}-luamod`;
const LUAMOD_NAME = "Lua Mod";
const LUAMOD_PATH = path.join("mods");
const LUAMOD_FOLDER = "lua";
const LUAMOD_EXTS = [".lua"];

const LOADER_ID = `${GAME_ID}-scriptloader`;
const LOADER_NAME = "Script Loader";
const LOADER_CONFIG_FILE = "loader_config.toml";
const LOADER_CONFIG_FILEPATH = path.join(LUAMOD_PATH, LOADER_CONFIG_FILE);
const LOADER_FILE = "version.dll";
const LOADER_PAGE_NO = 89;
const LOADER_FILE_NO = 475;
const LOADER_DOMAIN = GAME_ID;

// FILLED IN FROM DATA ABOVE
const IGNORE_CONFLICTS = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
  path.join("**", "boot-options.json"),
];
const IGNORE_DEPLOY = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
  path.join("**", "boot-options.json"),
];
const spec = {
  game: {
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME_SHORT,
    executable: EXEC,
    logo: `${GAME_ID}.jpg`,
    mergeMods: true,
    requiresCleanup: true,
    modPath: MOD_PATH,
    modPathIsRelative: true,
    requiredFiles: [EXEC],
    details: {
      steamAppId: +STEAMAPP_ID,
      gogAppId: GOGAPP_ID,
      epicAppId: EPICAPP_ID,
      ignoreConflicts: IGNORE_CONFLICTS,
      ignoreDeploy: IGNORE_DEPLOY,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
      GogAPPId: GOGAPP_ID,
      EpicAPPId: EPICAPP_ID,
    },
  },
  modTypes: [
    {
      id: DATA_ID,
      name: DATA_NAME,
      priority: "high",
      targetPath: `{gamePath}`,
    },
    {
      id: PATCH_ID,
      name: PATCH_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", PATCH_PATH),
    },
    {
      id: EXECSUB_ID,
      name: EXECSUB_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", EXECSUB_PATH),
    },
    {
      id: PACK_ID,
      name: PACK_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", PACK_PATH),
    },
    {
      id: PACK_ID,
      name: PACK_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", PACK_PATH),
    },
    {
      id: LUAMOD_ID,
      name: LUAMOD_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", LUAMOD_PATH),
    },
    {
      id: SAVE_ID,
      name: SAVE_NAME,
      priority: "high",
      targetPath: SAVE_PATH,
    },
    {
      id: LOADER_ID,
      name: LOADER_NAME,
      priority: "low",
      targetPath: `{gamePath}`,
    },
  ],
  discovery: {
    ids: [STEAMAPP_ID, GOGAPP_ID, EPICAPP_ID],
    names: [],
  },
};

//3rd party launchers and tools
const tools = [
  //*
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
    parameters: [],
  }, //*/
];

// BASIC FUNCTIONS ///////////////////////////////////////////////////////////////

//Set mod type priorities
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

//Convert path string placeholders to actual values
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

//Set mod path
function makeGetModPath(api, gameSpec) {
  return () =>
    gameSpec.game.modPathIsRelative !== false
      ? gameSpec.game.modPath || "."
      : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game information by API utility
async function queryGame() {
  let game = await util.GameStoreHelper.findByAppId(spec.discovery.ids);
  return game;
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () =>
    util.GameStoreHelper.findByAppId(gameSpec.discovery.ids).then((game) => game.gamePath);
}

async function requiresLauncher(gamePath, store) {
  if (store === "steam") {
    return Promise.resolve({
      launcher: "steam",
    });
  } //*/
  if (store === "epic") {
    return Promise.resolve({
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    });
  } //*/
  return Promise.resolve(undefined);
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//test whether to use mod installer
function testLoader(files, gameId) {
  const isMod = files.some(
    (file) => path.basename(file).toLowerCase() === LOADER_FILE.toLowerCase(),
  );
  const isConfig = files.some(
    (file) => path.basename(file).toLowerCase() === LOADER_CONFIG_FILE.toLowerCase(),
  );
  let supported = gameId === spec.game.id && isMod && isConfig;

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

//mod installer instructions
function installLoader(files) {
  const modFile = files.find(
    (file) => path.basename(file).toLowerCase() === LOADER_FILE.toLowerCase(),
  );
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: LOADER_ID };

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
function testData(files, gameId) {
  const isMod = files.some((file) => path.basename(file) === DATA_FILE);
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
function installData(files) {
  const modFile = files.find((file) => path.basename(file) === DATA_FILE);
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: DATA_ID };

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
function testPatch(files, gameId) {
  const isMod = files.some((file) => path.basename(file) === PATCH_FILE);
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
function installPatch(files) {
  const modFile = files.find((file) => path.basename(file) === PATCH_FILE);
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: PATCH_ID };

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
function testExecsub(files, gameId) {
  const isMod = files.some((file) => EXECSUB_FOLDERS.includes(path.basename(file)));
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
function installExecsub(files) {
  const modFile = files.find((file) => EXECSUB_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: EXECSUB_ID };

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

//test whether to use mod installer
function testPack(files, gameId) {
  const isMod = files.some((file) => PACK_EXTS.includes(path.extname(file).toLowerCase()));
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

//mod installer instructions
function installPack(files) {
  const modFile = files.find((file) => PACK_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: PACK_ID };

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

//test whether to use mod installer
function testLuaMod(files, gameId) {
  const isMod = files.some((file) => LUAMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const isFolder = files.some((file) => path.basename(file).toLowerCase() === LUAMOD_FOLDER);
  let supported = gameId === spec.game.id && isMod && isFolder;

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

//mod installer instructions
function installLuaMod(files) {
  const modFile = files.find((file) => path.basename(file).toLowerCase() === LUAMOD_FOLDER);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: LUAMOD_ID };

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

//test whether to use mod installer
function testSave(files, gameId) {
  const isSave = files.some((file) => path.extname(file) === SAVE_EXT);
  let supported = gameId === spec.game.id && isSave;

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

//mod installer instructions
function installSave(files) {
  const modFile = files.find((file) => path.extname(file) === SAVE_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: "setmodtype", value: SAVE_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep));
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

// AUTO-DOWNLOAD FUNCTIONS /////////////////////////////////////////////////////////

//* Function to auto-download UE4SS from Nexus Mods
async function downloadLoader(api, gameSpec) {
  //let isInstalled = isLoaderInstalled(api, gameSpec);
  // if (!isInstalled) {
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
  //}
} //*/

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = state?.settings?.gameMode?.discovered?.[GAME_ID] ?? {};
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

// LOAD ORDER FUNCTIONS ///////////////////////////////////////////////////////

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

//Read boot-options.json fresh. The game parses this file, so it is never created or truncated here.
async function readBootOptions(gamePath) {
  const raw = await fsp.readFile(path.join(gamePath, BOOT_OPTIONS_FILEPATH), { encoding: "utf8" });
  return JSON.parse(util.deBOM(raw));
}

//The object inside boot-options.json that holds the pack lists and playgo-chunks
function getBootBlock(bootJson) {
  return bootJson;
}

//Lowercase names of the base game packs. The game loads these itself (playgo-chunks), so listing
//them as patch packs would load them twice. Everything else on disk is a mod pack.
function getVanillaStems(bootJson) {
  const chunks = getBootBlock(bootJson)?.[BOOT_CHUNKS_KEY] ?? [];
  return new Set([...chunks, ...BOOT_VANILLA_STEMS].map((name) => String(name).toLowerCase()));
}

//Pack id: path under the exec folder with forward slashes, e.g. "wad/pc_le/slayer.texpack"
function toPackId(root, file) {
  return path.relative(DATA_FILE, path.join(root, file)).split(path.sep).join("/");
}

//How boot-options.json refers to a pack: relative to a folder two levels below exec, no extension
function toBootPath(packId) {
  return BOOT_PATH_PREFIX + packId.slice(0, -path.extname(packId).length);
}

//List every non-vanilla texpack/lodpack on disk as a pack id
async function scanPackIds(gamePath, vanillaStems) {
  const ids = [];
  for (const root of PACK_SCAN_PATHS) {
    let files = [];
    try {
      files = await fsp.readdir(path.join(gamePath, root), { recursive: true });
    } catch {
      continue; //folder does not exist (no exec\wad on a trimmed install), nothing to list
    }
    for (const file of files) {
      const ext = path.extname(file);
      if (!PACK_EXTS.includes(ext.toLowerCase())) continue;
      if (vanillaStems.has(path.basename(file, ext).toLowerCase())) continue;
      ids.push(toPackId(root, file));
    }
  }
  return ids.sort();
}

//Per-profile sidecar: the durable copy of the whole load order (order, enabled, locked).
//boot-options.json cannot hold a disabled pack or a lock, so this is the only place they live.
//It sits in exec next to boot-options.json, outside the folders that are scanned for packs.
function getPacksSidecarPath(gamePath, profileId) {
  return path.join(gamePath, DATA_FILE, `${profileId}_${PACKS_LO_FILE}`);
}

//Read the sidecar. Returns [] on a missing/corrupt file, the game never parses it.
async function readPacksSidecar(sidecarPath) {
  try {
    const raw = await fsp.readFile(sidecarPath, { encoding: "utf8" });
    if (raw.length === 0) return [];
    const data = JSON.parse(util.deBOM(raw));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writePacksSidecar(sidecarPath, loadOrder) {
  await fsp.writeFile(sidecarPath, JSON.stringify(loadOrder, null, 2), { encoding: "utf8" });
}

//Map each pack file name (lowercase) to the enabled Vortex mod that ships it, by walking the
//staging folder of every enabled mod that can deliver a pack. Pack files carry no install
//attribute, and this also works for mods installed before the Load Order page existed.
async function getPackOwners(api, profileId) {
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const mods = state?.persistent?.mods?.[GAME_ID] ?? {};
  const owners = new Map();
  for (const mod of Object.values(mods)) {
    if (!PACK_MODTYPE_IDS.includes(mod?.type) || !(profile?.modState?.[mod.id]?.enabled ?? false)) {
      continue;
    }
    const stagingFolder = getModStagingFolder(api, mod.id);
    if (!stagingFolder) continue;
    for (const file of await getAllFiles(stagingFolder)) {
      if (!PACK_EXTS.includes(path.extname(file).toLowerCase())) continue;
      const key = path.basename(file).toLowerCase();
      if (!owners.has(key)) owners.set(key, mod);
    }
  }
  return owners;
}

//Build the pack load order: the saved order for packs still on disk, new packs appended
async function deserializePackLoadOrder(api) {
  const state = api.getState();
  const profileId = selectors.lastActiveProfileForGame(state, GAME_ID);
  const storedLO = state?.persistent?.loadOrder?.[profileId] ?? [];
  const gamePath = getDiscoveryPath(api);
  if (profileId === undefined || gamePath === undefined) return storedLO;

  if (mod_update_all_profile) {
    //A mod update briefly removes and reinstalls the updated mod's packs, so rebuilding the order
    //from disk right now would drop their entries and reset their position and enabled state.
    //Return the stored order untouched instead: positions are preserved and the page keeps showing
    //the real load order. main()'s did-deploy listener re-runs this for real once the update lands.
    return storedLO;
  }

  let vanillaStems;
  try {
    vanillaStems = getVanillaStems(await readBootOptions(gamePath));
  } catch (err) {
    //Without boot-options.json the base game packs cannot be told apart from mod packs
    log(
      "warn",
      `[${GAME_ID}] Could not read ${BOOT_OPTIONS_FILEPATH}, keeping the stored load order`,
      err,
    );
    return storedLO;
  }

  const packIds = await scanPackIds(gamePath, vanillaStems);
  const saved = await readPacksSidecar(getPacksSidecarPath(gamePath, profileId));
  const storedById = new Map(storedLO.map((entry) => [entry.id, entry]));
  const owners = await getPackOwners(api, profileId);

  //prev is the sidecar entry, so enabled and locked survive the rebuild on every deploy
  const makeEntry = (id, prev) => {
    const file = path.basename(id);
    const mod = owners.get(file.toLowerCase());
    const modName =
      mod?.attributes?.customFileName ?? mod?.attributes?.logicalFileName ?? mod?.attributes?.name;
    return {
      id,
      name: modName ? `${modName} (${file})` : `Manual Mod (${file})`,
      modId: mod?.id,
      enabled: prev?.enabled ?? true,
      locked: storedById.get(id)?.locked ?? prev?.locked ?? false,
    };
  };

  const loadOrder = saved
    .filter((entry) => packIds.includes(entry.id))
    .map((entry) => makeEntry(entry.id, entry));
  for (const id of packIds) {
    if (!loadOrder.find((entry) => entry.id === id)) loadOrder.push(makeEntry(id));
  }
  return loadOrder;
}

//Write the pack lists into boot-options.json: enabled packs only, in load order, one list per
//extension. Every other key in the file is kept exactly as the game shipped it.
async function writeBootOptions(api, loadOrder) {
  const gamePath = getDiscoveryPath(api);
  try {
    const bootJson = await readBootOptions(gamePath);
    const block = getBootBlock(bootJson);
    const enabledIds = loadOrder.filter((entry) => entry.enabled !== false).map((e) => e.id);
    const idsWithExt = (ext) => enabledIds.filter((id) => path.extname(id).toLowerCase() === ext);
    block[BOOT_TEX_KEY] = idsWithExt(PACK_EXT).map(toBootPath);
    block[BOOT_LOD_KEY] = idsWithExt(LOD_EXT).map(toBootPath);
    await fsp.writeFile(
      path.join(gamePath, BOOT_OPTIONS_FILEPATH),
      JSON.stringify(bootJson, null, 2),
      { encoding: "utf8" },
    );
  } catch (err) {
    api.showErrorNotification(
      `Could not update ${BOOT_OPTIONS_FILEPATH} file with texpack and lodpack file names. Please add entries manually.`,
      err,
      { allowReport: false },
    );
  }
}

//Save the load order: sidecar first, then the pack lists the game reads
async function serializePackLoadOrder(api, loadOrder) {
  if (mod_update_all_profile) {
    notifyLoadOrderPaused(api, GAME_ID);
    return;
  }

  const gamePath = getDiscoveryPath(api);
  const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
  try {
    await writePacksSidecar(getPacksSidecarPath(gamePath, profileId), loadOrder);
  } catch (err) {
    log("error", `[${GAME_ID}] Could not write the pack load order sidecar`, err);
  }
  await writeBootOptions(api, loadOrder);
}

//Rewrite the pack lists in boot-options.json from the saved order and what is on disk right now.
//Runs after a deploy or purge, when core does not always serialize (an unchanged order, or a purge,
//which core deliberately does not serialize). Never touches the sidecar.
async function syncBootOptions(api) {
  await writeBootOptions(api, await deserializePackLoadOrder(api));
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
      "Filter the list above by status. Clear the filter before reordering packs.",
    ),
    React.createElement("br", null),
    React.createElement(
      "p",
      null,
      "Drag and drop packs to change the order they are listed in boot-options.json. Use the " +
        "checkbox to enable or disable a pack without uninstalling it. Changes are written to " +
        "boot-options.json immediately - no deploy needed.",
    ),
    React.createElement("br", null),
    React.createElement(
      "p",
      null,
      "Base game packs (the ones listed under playgo-chunks in boot-options.json) never show here " +
        "and are never added to its pack lists. Packs added by hand show with a Not managed by " +
        "Vortex banner.",
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
    serializePackLoadOrder(context.api, newLO);
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
}

//Right-click context menu for load order entries (single + multi-select). File-based LO surface -
//no per-entry mod folder to open (one Vortex mod can own several pack files), so
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
    if (serialize) serializePackLoadOrder(context.api, newLO);
    onClose();
  };

  const isEntryLocked = isLocked(item);
  const isEntryEnabled = item.enabled ?? true;

  const isModEnabled = (e) => profile?.modState?.[e.modId]?.enabled ?? false;
  const setVortexEnabled = (entries, enabled) => {
    //One Vortex mod can own several load order rows (one per pack file), so a multi-select can list
    //the same modId more than once - dedupe before dispatch.
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

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  await vfs.ensureDirWritableAsync(SAVE_PATH);
  await vfs.ensureDirWritableAsync(path.join(discovery.path, LUAMOD_PATH));
  return vfs.ensureDirWritableAsync(path.join(discovery.path, PACK_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
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

  //register mod installers
  context.registerInstaller(LOADER_ID, 25, testLoader, installLoader);
  context.registerInstaller(DATA_ID, 27, testData, installData);
  context.registerInstaller(PATCH_ID, 29, testPatch, installPatch);
  context.registerInstaller(EXECSUB_ID, 31, testExecsub, installExecsub);
  context.registerInstaller(PACK_ID, 33, testPack, installPack);
  context.registerInstaller(LUAMOD_ID, 35, testLuaMod, installLuaMod);
  context.registerInstaller(SAVE_ID, 37, testSave, installSave);

  //register load order
  context.registerLoadOrder({
    gameId: GAME_ID,
    gameArtURL: path.join(__dirname, spec.game.logo),
    validate: async () => Promise.resolve(undefined), // no validation implemented yet
    deserializeLoadOrder: () => deserializePackLoadOrder(context.api),
    serializeLoadOrder: (loadOrder) => serializePackLoadOrder(context.api, loadOrder),
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
    `Download ${LOADER_NAME}`,
    () => {
      downloadLoader(context.api, spec).catch(() => null);
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
    "Open Settings INI",
    () => {
      const state = context.api.getState();
      const discovery = selectors.discoveryByGame(state, GAME_ID);
      const openPath = path.join(discovery.path, SETTINGS_FILE);
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
    "Open boot-options.json",
    () => {
      const state = context.api.getState();
      const discovery = selectors.discoveryByGame(state, GAME_ID);
      const openPath = path.join(discovery.path, BOOT_OPTIONS_FILEPATH);
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
    "Open Script Loader Config",
    () => {
      const state = context.api.getState();
      const discovery = selectors.discoveryByGame(state, GAME_ID);
      const openPath = path.join(discovery.path, LOADER_CONFIG_FILEPATH);
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
      const openPath = DOWNLOAD_FOLDER;
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
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    try {
      window.api.shell.openFile(SAVE_PATH);
    } catch (err) {
      context.api.showErrorNotification("Failed to open the file or folder", err, { allowReport: false });
    }
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
}

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    const api = context.api;

    //Reset mod update flags on deploy, then bring boot-options.json in line with what is on disk
    api.onAsync("did-deploy", async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return; //only reset this game's mod update flags
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
          const refreshedLO = await deserializePackLoadOrder(api);
          api.store.dispatch(actions.setFBLoadOrder(profileId, refreshedLO));
        } catch (err) {
          log("warn", `[${GAME_ID}] post-update load order refresh failed`, err);
        }
      }
      //Core only serializes when the order changed, so rewrite the pack lists every deploy. This also
      //clears the base game packs an older version of this extension listed in boot-options.json.
      if (!mod_update_all_profile) await syncBootOptions(api);
    });

    //A purge removes the deployed packs: drop them from the pack lists, keep the saved order
    api.onAsync("did-purge", async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      if (!mod_update_all_profile) await syncBootOptions(api);
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
