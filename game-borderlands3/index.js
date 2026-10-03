/*/////////////////////////////////////////
Name: Borderlands 3 Vortex Extension
Structure: UE4 Game (Custom)
Author: ChemBoy1
Version: 0.4.4
Date: 2026-10-02
/////////////////////////////////////////*/

//Import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const { parseStringPromise } = require("xml2js");
//const winapi = require('winapi-bindings');
const {
  download,
  findModByFile,
  findDownloadIdByFile,
  resolveVersionByModVersion,
  testRequirementVersion,
} = require("./downloader");

//const USER_HOME = util.getVortexPath("home");
const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath('appData');
//const LOCALAPPDATA = util.getVortexPath('localAppData');

//Specify all the information about the game
const GAME_ID = "borderlands3";
const STEAMAPP_ID = "397540";
const EPICAPP_ID = "Catnip";
const XBOXAPP_ID = "2K-Gearbox.Borderlands3WindowsPC"; //Microsoft Store Edition, resolved via MS Store catalog - verify against a live install
const XBOXEXECNAME = "App2KGearboxBorderlands3WindowsPCShipping"; // resolved via MS Store catalog - verify against a live install
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID, XBOXAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Borderlands 3";
const GAME_NAME_SHORT = "Borderlands 3";
const EPIC_CODE_NAME = "OakGame";

const ROOT_FOLDERS = [EPIC_CODE_NAME, "Engine"];
const EXEC_FOLDER_DEFAULT = "Win64"; //PC builds (Steam, Epic)
const EXEC_FOLDER_XBOX = "WinGDK"; //Xbox / Microsoft Store build
let BINARIES_PATH = path.join(EPIC_CODE_NAME, "Binaries", EXEC_FOLDER_DEFAULT); //reset for the Xbox build in getExecutable
const EXEC = path.join(BINARIES_PATH, "Borderlands3.exe");
const EXEC_XBOX = "gamelaunchhelper.exe";
const APPMANIFEST_FILE = "appxmanifest.xml";
const DATA_FOLDER = "Borderlands 3";

//feature toggles
let hasXbox = false; //toggle for Xbox version logic
if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;

let GAME_PATH = ""; //patched in the setup function to the discovered game path
let GAME_VERSION = ""; //Game version
let STAGING_FOLDER = ""; //Vortex staging folder path
let DOWNLOAD_FOLDER = ""; //Vortex download folder path

//Information for mod types and installers
const MERGER_ID = `${GAME_ID}-openhotfixloader`;
const MERGER_NAME = "OpenHotfixLoader";
const MERGER_EXEC = "b3hm.exe"; //legacy merger exe (not used)
let MERGER_PATH = path.join(BINARIES_PATH, "Plugins");
const MERGER_EXEC_PATH = path.join(MERGER_PATH, MERGER_EXEC);
//const MERGER_DLL = "b3hm.dll";
const MERGER_DLL = "openhotfixloader.dll";
const MERGER_WEBUI_URL = `https://c0dycode.github.io/BL3HotfixWebUI/v2`; //legacy merger UI (not used)
const MERGER_ARC_NAME = "OpenHotfixLoader.zip";
const MERGER_URL_API = `https://api.github.com/repos/apple1417/OpenHotfixLoader`;

const PLUGINLOADER_ID = `${GAME_ID}-pluginloader`; //not used
const PLUGINLOADER_NAME = "Plugin Loader";
const PLUGINLOADER_FILE = "d3d11.dll";
let PLUGINLOADER_PATH = BINARIES_PATH; //installer only - not auto-downloaded

const HOTFIX_ID = `${GAME_ID}-hotfix`;
const HOTFIX_NAME = "Hotfix Mod";
const HOTFIX_EXT = ".bl3hotfix";
let HOTFIX_PATH = path.join(MERGER_PATH, "ohl-mods");

const SDK_ID = `${GAME_ID}-sdk`;
const SDK_NAME = "Python SDK";
const SDK_FOLDER = "sdk_mods";
const SDK_DLL = "unrealsdk.dll";
const SDK_PATH = ".";
const SDK_ARC_NAME = "bl3-sdk.zip";
const SDK_URL_API = `https://api.github.com/repos/bl-sdk/oak-mod-manager`;

const REQUIREMENTS = [
  {
    //OpenHotfixLoader
    archiveFileName: MERGER_ARC_NAME,
    modType: MERGER_ID,
    assemblyFileName: MERGER_DLL,
    userFacingName: MERGER_NAME,
    githubUrl: MERGER_URL_API,
    findMod: (api) => findModByFile(api, MERGER_ID, MERGER_DLL),
    findDownloadId: (api) => findDownloadIdByFile(api, MERGER_ARC_NAME),
    fileArchivePattern: new RegExp(/^OpenHotfixLoader/, "i"), //no capture group - the version is only in the release tag
    resolveVersion: (api) => resolveVersionByModVersion(api, REQUIREMENTS[0]),
  },
  {
    //Python SDK
    archiveFileName: SDK_ARC_NAME,
    modType: SDK_ID,
    assemblyFileName: SDK_DLL,
    userFacingName: SDK_NAME,
    githubUrl: SDK_URL_API,
    findMod: (api) => findModByFile(api, SDK_ID, SDK_DLL),
    findDownloadId: (api) => findDownloadIdByFile(api, SDK_ARC_NAME),
    fileArchivePattern: new RegExp(/^bl3-sdk/, "i"), //anchored so the Wonderlands asset in the same release is not picked
    resolveVersion: (api) => resolveVersionByModVersion(api, REQUIREMENTS[1]),
  },
];

const SDKMOD_ID = `${GAME_ID}-sdkmod`;
const SDKMOD_NAME = "SDK Mod";
const SDKMOD_EXT = ".py";
const SDKMOD_EXT2 = ".sdkmod";
const SDKMOD_PATH = SDK_FOLDER;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const MOVIES_ID = `${GAME_ID}-movies`;
const MOVIES_NAME = "Movies";
const MOVIES_PATH = path.join(EPIC_CODE_NAME, "Content", "Movies");
const MOVIES_EXT = ".mp4";

const PAK_ID = `${GAME_ID}-pak`;
const PAK_NAME = "Pak Mod";
const PAK_PATH = path.join(EPIC_CODE_NAME, "Content", "Paks");
const PAK_EXT = ".pak";

const CONFIG_PATH = path.join(
  DOCUMENTS,
  "My Games",
  DATA_FOLDER,
  "Saved",
  "Config",
  "WindowsNoEditor",
);
const SAVE_FOLDER = path.join(DOCUMENTS, "My Games", DATA_FOLDER, "Saved", "SaveGames");
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

const SAVEEDITOR_ID = `${GAME_ID}-saveeditor`;
const SAVEEDITOR_NAME = "Save Editor";
const SAVEEDITOR_EXEC = "BL3SaveEditor.exe";
const SAVEEDITOR_EXEC_PATH = path.join(BINARIES_PATH, SAVEEDITOR_EXEC);
const SAVEEDITOR_EXEC_PATH_XBOX = path.join(EPIC_CODE_NAME, "Binaries", EXEC_FOLDER_XBOX, SAVEEDITOR_EXEC);

//The Xbox version launches through a different exe and its Binaries folder is unverified, so require the game's code folder that every version has instead of Borderlands3.exe
const REQ_FILE = hasXbox ? EPIC_CODE_NAME : EXEC;
let MODTYPE_FOLDERS = [SDKMOD_PATH, HOTFIX_PATH, PAK_PATH, MOVIES_PATH];

const IGNORE_CONFLICTS = [
  path.join("**", "LICENSE.txt"),
  path.join("**", "instructions.txt"),
  path.join("**", "CHANGELOG.md"),
  path.join("**", "readme.txt"),
  path.join("**", "README.txt"),
  path.join("**", "ReadMe.txt"),
  path.join("**", "Readme.txt"),
  path.join("**", "license*"),
];

//Filled in from the data above
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1451"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Borderlands_3";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const IGNORE_DEPLOY = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];
const spec = {
  game: {
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME_SHORT,
    executable: EXEC,
    logo: `${GAME_ID}.jpg`,
    mergeMods: true,
    modPath: ".",
    modPathIsRelative: true,
    requiresCleanup: true,
    requiredFiles: [REQ_FILE],
    details: {
      steamAppId: +STEAMAPP_ID,
      epicAppId: EPICAPP_ID,
      xboxAppId: XBOXAPP_ID,
      ignoreConflicts: IGNORE_CONFLICTS,
      ignoreDeploy: IGNORE_DEPLOY,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
      EpicAPPId: EPICAPP_ID,
      XboxAPPId: XBOXAPP_ID,
    },
  },
  modTypes: [
    {
      id: SDK_ID,
      name: SDK_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", SDK_PATH),
    },
    {
      id: SDKMOD_ID,
      name: SDKMOD_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", SDKMOD_PATH),
    },
    {
      id: ROOT_ID,
      name: ROOT_NAME,
      priority: "high",
      targetPath: `{gamePath}`,
    },
    {
      id: MOVIES_ID,
      name: MOVIES_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", MOVIES_PATH),
    },
    {
      id: PAK_ID,
      name: PAK_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", PAK_PATH),
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
  {
    id: SAVEEDITOR_ID,
    name: SAVEEDITOR_NAME,
    logo: `saveeditor.png`,
    executable: () => SAVEEDITOR_EXEC_PATH,
    requiredFiles: [SAVEEDITOR_EXEC_PATH],
    detach: true,
    relative: true,
    exclusive: false,
    //shell: true,
    //defaultPrimary: true,
    parameters: [],
  }, //*/
  {
    //Xbox build keeps its binaries in WinGDK; relative tools are found by their required file, so only the matching one shows
    id: `${SAVEEDITOR_ID}-xbox`,
    name: SAVEEDITOR_NAME,
    logo: `saveeditor.png`,
    executable: () => SAVEEDITOR_EXEC_PATH_XBOX,
    requiredFiles: [SAVEEDITOR_EXEC_PATH_XBOX],
    detach: true,
    relative: true,
    exclusive: false,
    parameters: [],
  },
  /*{
    id: MERGER_ID,
    name: MERGER_NAME,
    logo: `merger.png`,
    executable: () => MERGER_EXEC_PATH,
    requiredFiles: [MERGER_EXEC_PATH],
    detach: true,
    relative: true,
    exclusive: false,
    //shell: true,
    //defaultPrimary: true,
    parameters: []
  }, //*/
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

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

function modTypePriority(priority) {
  return {
    high: 25,
    low: 50,
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

//set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === "xbox" && DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) {
    return Promise.resolve({
      launcher: "xbox",
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
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
  /*
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
      addInfo: {
        appId: STEAM_ID,
        //parameters: PARAMETERS,
        //launchType: 'gamestore',
      } //
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (!hasXbox) {
    return EXEC;
  }
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    setBinariesFolder(EXEC_FOLDER_XBOX);
    return EXEC_XBOX;
  }
  if (statCheckSync(discoveryPath, EXEC)) {
    setBinariesFolder(EXEC_FOLDER_DEFAULT);
  }
  return EXEC;
}

//Point every Binaries-relative path at the Win64 (PC) or WinGDK (Xbox) folder
function setBinariesFolder(folder) {
  BINARIES_PATH = path.join(EPIC_CODE_NAME, "Binaries", folder);
  MERGER_PATH = path.join(BINARIES_PATH, "Plugins");
  PLUGINLOADER_PATH = BINARIES_PATH;
  HOTFIX_PATH = path.join(MERGER_PATH, "ohl-mods");
  MODTYPE_FOLDERS = [SDKMOD_PATH, HOTFIX_PATH, PAK_PATH, MOVIES_PATH];
}

//Get correct game version
async function setGameVersion(gamePath) {
  GAME_VERSION = (await statCheckAsync(gamePath, EXEC_XBOX)) ? "xbox" : "default";
  return GAME_VERSION;
}

//Resolve game version dynamically for different game versions
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

// AUTO-DOWNLOADER FUNCTIONS ///////////////////////////////////////////////////

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
    log("warn", `Failed to test requirement version: ${err}`);
  }
}

async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Hotfix Merger files
function testHotfixMerger(files, gameId) {
  const isFile = files.some((file) => path.basename(file).toLowerCase() === MERGER_DLL);
  //const isExe = files.some(file => (path.basename(file).toLowerCase() === MERGER_EXEC));
  let supported = gameId === spec.game.id && isFile;

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

//Installer install Hotfix Merger files
function installHotfixMerger(files) {
  const MOD_TYPE = MERGER_ID;
  const modFile = files.find((file) => path.basename(file).toLowerCase() === MERGER_DLL);
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

//Installer test for plugin loader files
function testPluginLoader(files, gameId) {
  const isFile = files.some((file) => path.basename(file).toLowerCase() === PLUGINLOADER_FILE);
  let supported = gameId === spec.game.id && isFile;

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

//Installer install plugin loader files
function installPluginLoader(files) {
  const MOD_TYPE = PLUGINLOADER_ID;
  const modFile = files.find((file) => path.basename(file).toLowerCase() === PLUGINLOADER_FILE);
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

//Installer test for Fluffy Mod Manager files
function testSdk(files, gameId) {
  const isFile = files.some((file) => path.basename(file).toLowerCase() === SDK_DLL);
  const isFolder = files.some((file) => path.basename(file).toLowerCase() === SDK_FOLDER);
  let supported = gameId === spec.game.id && isFile && isFolder;

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

//Installer install Fluffy Mod Manger files
function installSdk(files) {
  const MOD_TYPE = SDK_ID;
  const modFile = files.find((file) => path.basename(file).toLowerCase() === SDK_FOLDER);
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

//Test Fallback installer for SDK Mods
function testSdkMod(files, gameId) {
  const isMod = files.some((file) => path.extname(file).toLowerCase() === SDKMOD_EXT);
  const isMod2 = files.some((file) => path.extname(file).toLowerCase() === SDKMOD_EXT2);
  let supported = gameId === spec.game.id && (isMod || isMod2);

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

//Fallback installer for SDK Mods
function installSdkMod(files, fileName) {
  const MOD_TYPE = SDKMOD_ID;
  let modFile = files.find((file) => path.extname(file).toLowerCase() === SDKMOD_EXT2);
  if (modFile === undefined) {
    modFile = files.find((file) => path.extname(file).toLowerCase() === SDKMOD_EXT);
  }
  let MOD_FOLDER = ".";
  const idx = modFile.indexOf(path.basename(modFile));
  const ROOT_PATH = path.basename(path.dirname(modFile));
  const MOD_NAME = path.basename(fileName);
  if (ROOT_PATH === ".") {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, "");
  }
  const setModTypeInstruction = { type: "setmodtype", value: MOD_TYPE };

  // Remove empty directories
  const filtered = files.filter((file) => !file.endsWith(path.sep));

  let instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(MOD_FOLDER, file),
    };
  });
  if (path.extname(modFile).toLowerCase() === SDKMOD_EXT2) {
    //index to .sdkmod file if it exists
    instructions = filtered.map((file) => {
      return {
        type: "copy",
        source: file,
        destination: path.join(file.substr(idx)),
      };
    });
  }

  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for .bl3hotfix files
function testHotfix(files, gameId) {
  const isMod = files.some((file) => path.extname(file).toLowerCase() === HOTFIX_EXT);
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

//Install .bl3hotfix files
function installHotfix(files) {
  const MOD_TYPE = HOTFIX_ID;
  const modFile = files.find((file) => path.extname(file).toLowerCase() === HOTFIX_EXT);
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
      destination: path.join(file),
    };
  });
  instructions.push(setModTypeInstruction);
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
  const modFile = files.find((file) => ROOT_FOLDERS.includes(path.basename(file)));
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
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test .pak files
function testPak(files, gameId) {
  const isMod = files.some((file) => path.extname(file).toLowerCase() === PAK_EXT);
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

//Install .pak files
function installPak(files) {
  const MOD_TYPE = PAK_ID;
  const modFile = files.find((file) => path.extname(file).toLowerCase() === PAK_EXT);
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

//Test .mp4 files
function testMovies(files, gameId) {
  const isMod = files.some((file) => path.extname(file).toLowerCase() === MOVIES_EXT);
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

//Install .mp4 files
function installMovies(files) {
  const MOD_TYPE = MOVIES_ID;
  const modFile = files.find((file) => path.extname(file).toLowerCase() === MOVIES_EXT);
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

//Fallback installer to Binaries folder
function testBinaries(files, gameId) {
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

//Fallback installer to Binaries folder
function installBinaries(files) {
  const setModTypeInstruction = { type: "setmodtype", value: BINARIES_ID };

  const filtered = files.filter((file) => !file.endsWith(path.sep));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(file),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// MAIN EXTENSION FUNCTION /////////////////////////////////////////////////////

//Notify User to run TFC Installer after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = MERGER_NAME;
  const MESSAGE = `Use ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "Open WebUI",
        action: (dismiss) => {
          try {
            window.api.shell.openUrl(MERGER_WEBUI_URL);
          } catch (err) {
            api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
          }
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
                `Mods to install with ${MOD_NAME} will be found at this folder: "${HOTFIX_PATH}".\n` +
                `Use the included tool to launch ${MOD_NAME} (button below or in "Dashboard" tab).\n` +
                `You can open the Hotfix Merger WebUI using the button below, or using the button within the folder icon on the Mods toolbar.\n`,
            },
            [
              {
                label: "Open Hotfix Merger WebUI",
                action: () => {
                  try {
                    window.api.shell.openUrl(MERGER_WEBUI_URL);
                  } catch (err) {
                    api.showErrorNotification("Failed to open the URL", err, {
                      allowReport: false,
                    });
                  }
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
  const TOOL_ID = MERGER_ID;
  const TOOL_NAME = MERGER_NAME;
  const state = api.store.getState();
  const tool = state?.settings?.gameMode?.discovered?.[GAME_ID]?.tools?.[TOOL_ID] ?? undefined;

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
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  // ASYNC CODE //////////////////////////////////////////
  if (hasXbox) {
    GAME_VERSION = await setGameVersion(GAME_PATH);
  }
  await vfs.ensureDirWritableAsync(path.join(GAME_PATH, MERGER_PATH));
  const requirementsInstalled = await checkForRequirements(api);
  if (!requirementsInstalled) {
    await download(api, REQUIREMENTS);
  }
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

  //register mod types that live in the Binaries folder (Win64 or WinGDK, set in getExecutable) so their path is resolved when used
  context.registerModType(
    HOTFIX_ID,
    35,
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
    (game) => pathPattern(context.api, game, path.join("{gamePath}", HOTFIX_PATH)),
    () => Promise.resolve(false),
    { name: HOTFIX_NAME },
  );
  context.registerModType(
    BINARIES_ID,
    40,
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
  context.registerModType(
    MERGER_ID,
    55,
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
    (game) => pathPattern(context.api, game, path.join("{gamePath}", MERGER_PATH)),
    () => Promise.resolve(false),
    { name: MERGER_NAME },
  );
  context.registerModType(
    PLUGINLOADER_ID,
    56,
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
    (game) => pathPattern(context.api, game, path.join("{gamePath}", PLUGINLOADER_PATH)),
    () => Promise.resolve(false),
    { name: PLUGINLOADER_NAME },
  );

  //register mod installers
  context.registerInstaller(MERGER_ID, 25, testHotfixMerger, installHotfixMerger);
  context.registerInstaller(SDK_ID, 27, testSdk, installSdk);
  context.registerInstaller(SDKMOD_ID, 28, testSdkMod, installSdkMod);
  context.registerInstaller(PLUGINLOADER_ID, 29, testPluginLoader, installPluginLoader);
  context.registerInstaller(HOTFIX_ID, 31, testHotfix, installHotfix);
  context.registerInstaller(ROOT_ID, 43, testRoot, installRoot);
  context.registerInstaller(PAK_ID, 45, testPak, installPak);
  context.registerInstaller(MOVIES_ID, 47, testMovies, installMovies);
  context.registerInstaller(BINARIES_ID, 49, testBinaries, installBinaries);

  //register actions
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Hotfix Merger WebUI', () => {
    const openPath = MERGER_WEBUI_URL;
    try {
      window.api.shell.openUrl(openPath);
    } catch (err) {
      context.api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
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
    "Open Config Folder",
    () => {
      const openPath = CONFIG_PATH;
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
    "Open Save Folder",
    () => {
      const openPath = SAVE_PATH;
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
    /*context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    }); //*/
    context.api.onAsync("check-mods-version", (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(context.api, gameId, mods, forced);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
