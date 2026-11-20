/*///////////////////////////////////////////
Name: Watch_Dogs 2 Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 1.0.0
Date: 2026-11-17
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

const DOCUMENTS = util.getVortexPath("documents");

//Specify all the information about the game
const GAME_ID = "watchdogs2";
const STEAMAPP_ID = "447040"; // https://steamdb.info/app/447040/
const UPLAYAPP_ID = "2688";
const EPICAPP_ID = "Angelonia"; // https://store.epicgames.com/en-US/p/watch-dogs-2
const GOGAPP_ID = null;
const INSTALL_HIVE = "HKEY_LOCAL_MACHINE"; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\${UPLAYAPP_ID}`; //for finding install in registry - requires winapi-bindings
const INSTALL_VALUE = "InstallDir"; //often InstallDir or InstallPath
const DISCOVERY_IDS_ACTIVE = [UPLAYAPP_ID, STEAMAPP_ID, EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  epic: [{ id: EPICAPP_ID }],
  registry: [{ id: `${INSTALL_HIVE}:${INSTALL_KEY}:${INSTALL_VALUE}` }],
};

const GAME_NAME = "Watch_Dogs 2";
const GAME_NAME_SHORT = "Watch_Dogs 2";
const BINARIES_PATH = "bin";
const EXEC_NAME = "WatchDogs2.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Watch_Dogs_2";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/2630"; //Nexus link to this extension. Used for links

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
const loaderAutoDownload = false; //true to download Disrupt Manager during setup. false to offer the download only once a Disrupt Manager package is deployed
const debug = false; //toggle for debug mode

//info for modtypes, installers, tools, and actions
const DATA_FOLDER = "data_win64";
const ROOT_FOLDERS = [DATA_FOLDER, BINARIES_PATH];
const ROOTSUB_FOLDERS = ["worlds"];
const ROOTSUB_PATH = DATA_FOLDER;

const CONFIGMOD_LOCATION = DOCUMENTS;
const APPDATA_FOLDER = path.join("My Games", "Watch_Dogs 2");
const SAVE_FOLDERNAME = "savegames";

let GAME_PATH = "";
let STAGING_FOLDER = "";
let DOWNLOAD_FOLDER = "";

const LOADER_ID = `${GAME_ID}-loader`;
const LOADER_NAME = "Disrupt Manager";
const LOADER_PATH = "Disrupt_Manager";
const LOADER_FILE = "DisruptManager.exe";
const LOADER_EXEC = path.join(LOADER_PATH, LOADER_FILE);
const LOADER_URL = `https://github.com/rootCBR/DisruptManager/releases/download/1.1.9311.41691/DisruptManager.1.1.9311.41691.zip`; //if not on Nexus
const LOADER_URL_ERR = `https://github.com/rootCBR/DisruptManager/releases`;

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Patch Archive";
const MOD_PATH = DATA_FOLDER;
const MOD_EXTS = [".dat", ".fat"];
const MOD_INDEX_EXTS = [".fat"]; //one index file per archive pair - used to tell variant folders apart
const FAT_HEADER_LENGTH = 12; //magic (4) + version (4) + platform/compression/hash-version fields (4)
const FAT_FLAGS_OFFSET = 8; //Disrupt Manager cannot read an index file whose platform/compression/hash-version fields are all zero

const PACKAGE_ID = `${GAME_ID}-package`;
const PACKAGE_NAME = "Disrupt Manager Package";
const PACKAGE_PATH = path.join(LOADER_PATH, "Watch Dogs 2"); //Disrupt Manager only reads zip files in this folder
const PACKAGE_FILES = ["info.xml"];
const PACKAGE_EXTS = [".zip"];
const PACKAGE_EXT = ".zip";
const PACKAGE_TEMP_FOLDER = "_disruptmanager_packages"; //zipped packages are built here during installation

const SCRIPTHOOK_NAME = "ScriptHook";
const SCRIPTHOOK_FOLDER = "ScriptHook";
const SCRIPTHOOK_FOLDERS = ["scripthook"]; //lowercase - folder names that mark a ready-made ScriptHook folder
const SCRIPTHOOK_MARKER = path.join(BINARIES_PATH, SCRIPTHOOK_FOLDER, "core.dll"); //written by the ScriptHook installer - present = ScriptHook installed
const SCRIPTHOOK_INSTALLER_URL =
  "https://cdn.nomad-group.net/nomadapps/wd2sh/build_depot/prod/installer/Watch_Dogs2-ScriptHook-Installer_r185.exe"; //direct installer download - opens in the browser (cdn refuses non-browser requests)
const SCRIPT_ID = `${GAME_ID}-script`;
const SCRIPT_NAME = "ScriptHook Script";
const SCRIPT_PATH = path.join(BINARIES_PATH, SCRIPTHOOK_FOLDER, "data", "scripts");
const SCRIPT_FILES = ["manifest.json"];
const SCRIPT_EXTS = [".lua"];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
const BINARIES_EXTS = [".exe", ".dll", ".asi", ".addon64"];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
let USERID_FOLDER = "";
let SAVE_PATH = ""; //Defined in setup fn <Ubisoft-Connect-folder>\savegames\<user-id>\2688\
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

/* tool info (i.e. save editor)
const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = "XXX";
const TOOL_EXEC_FOLDER = path.join('XXX');
const TOOL_EXEC = 'XXX.exe';
const TOOL_EXEC_PATH = path.join(TOOL_EXEC_FOLDER, TOOL_EXEC);
//*/

let MOD_PATH_DEFAULT = MOD_PATH;
//if (!needsModInstaller) MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = "-eac_launcher"; //starts the game without Easy Anti-Cheat (same argument Disrupt Manager uses)
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [BINARIES_PATH, SCRIPT_PATH];
if (needsModInstaller) MODTYPE_FOLDERS.push(MOD_PATH);
if (hasLoader) MODTYPE_FOLDERS.push(PACKAGE_PATH);
if (saveInstaller) MODTYPE_FOLDERS.push(SAVE_PATH);
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
    parameters: PARAMETERS, //commented out by default to avoid passing empty string parameter
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
      uPlayAppId: UPLAYAPP_ID,
      supportsSymlinks: allowSymlinks,
      ignoreConflicts: IGNORE_CONFLICTS,
      ignoreDeploy: IGNORE_DEPLOY,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
      GogAPPId: GOGAPP_ID,
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
if (hasLoader) {
  spec.modTypes.push({
    id: PACKAGE_ID,
    name: PACKAGE_NAME,
    priority: "high",
    targetPath: path.join("{gamePath}", PACKAGE_PATH),
  });
}
spec.modTypes.push({
  id: SCRIPT_ID,
  name: SCRIPT_NAME,
  priority: "high",
  targetPath: path.join("{gamePath}", SCRIPT_PATH),
});
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
    logo: "dirsuptmanager.png",
    executable: () => LOADER_EXEC,
    requiredFiles: [LOADER_EXEC],
    relative: true,
    exclusive: false,
  },
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

//Keep only the folders that are not inside another folder of the list
function outermostFolders(folders) {
  const unique = [...new Set(folders)];
  if (unique.includes(".")) return ["."];
  return unique.filter(
    (folder) => !unique.some((other) => other !== folder && folder.startsWith(other + path.sep)),
  );
}

//Test whether a file sits inside a folder ("." is the archive root)
function isInFolder(file, folder) {
  return folder === "." || file.startsWith(folder + path.sep);
}

//Test for Disrupt Manager packages (loose info.xml package or ready-made package zips)
function testPackage(files, gameId) {
  const isMod = files.some((file) => PACKAGE_FILES.includes(path.basename(file).toLowerCase()));
  const isZip = files.some((file) => PACKAGE_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = gameId === spec.game.id && (isMod || isZip);

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

//List the top-level files inside a zip. Vortex's node-7z hands entries ({ name, attr }) to a progress callback
async function listZipRootFiles(zipPath) {
  const entries = [];
  await new util.SevenZip().list(zipPath, {}, (batch) => {
    for (const entry of batch) {
      const isFolder = (entry.attr ?? "").includes("D");
      if (!isFolder && path.basename(entry.name) === entry.name) entries.push(entry.name);
    }
  });
  return entries;
}

//Install Disrupt Manager packages. Disrupt Manager only reads zip files, so loose packages are zipped back up
async function installPackage(api, files, destinationPath) {
  const setModTypeInstruction = { type: "setmodtype", value: PACKAGE_ID };
  const modName = path.basename(destinationPath, ".installing");
  const isZip = (file) => PACKAGE_EXTS.includes(path.extname(file).toLowerCase());
  const infoFiles = files.filter((file) =>
    PACKAGE_FILES.includes(path.basename(file).toLowerCase()),
  );
  const packageFolders = outermostFolders(infoFiles.map((file) => path.dirname(file)));
  const instructions = [];
  const usedNames = [];

  //Zip each loose package so that its info.xml sits at the root of the zip
  for (const folder of packageFolders) {
    const baseName = util.sanitizeFilename(folder === "." ? modName : path.basename(folder));
    let zipName = baseName + PACKAGE_EXT;
    for (let count = 2; usedNames.includes(zipName.toLowerCase()); count++) {
      zipName = `${baseName}_${count}${PACKAGE_EXT}`;
    }
    usedNames.push(zipName.toLowerCase());
    const folderPath = path.join(destinationPath, folder);
    const entries = (await fsp.readdir(folderPath)).filter((entry) => !isZip(entry));
    const zipPath = path.join(destinationPath, PACKAGE_TEMP_FOLDER, zipName);
    await fsp.mkdir(path.dirname(zipPath), { recursive: true });
    await new util.SevenZip().add(
      zipPath,
      entries.map((entry) => path.join(folderPath, entry)),
      { raw: ["-tzip"] },
    );
    instructions.push({
      type: "copy",
      source: path.join(PACKAGE_TEMP_FOLDER, zipName),
      destination: zipName,
    });
  }

  //Copy zips that are already packages (info.xml at the root of the zip) as they are
  const looseZips = files.filter(
    (file) =>
      isZip(file) && !packageFolders.some((folder) => folder !== "." && isInFolder(file, folder)),
  );
  for (const file of looseZips) {
    let rootFiles = [];
    try {
      rootFiles = await listZipRootFiles(path.join(destinationPath, file));
    } catch (err) {
      log("warn", `Could not read ${file} to check for a Disrupt Manager package: ${err}`);
    }
    const isPackage = rootFiles.some((entry) => PACKAGE_FILES.includes(entry.toLowerCase()));
    if (isPackage && !usedNames.includes(path.basename(file).toLowerCase())) {
      usedNames.push(path.basename(file).toLowerCase());
      instructions.push({
        type: "copy",
        source: file,
        destination: path.basename(file),
      });
    }
  }

  //No package found after all (the zips were something else)
  if (instructions.length === 0) {
    return installFallback(api, files, destinationPath);
  }
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for ScriptHook script mods (manifest.json + lua script, or a ready-made ScriptHook folder)
function testScript(files, gameId) {
  const isFolder = files.some((file) =>
    file
      .toLowerCase()
      .split(path.sep)
      .some((segment) => SCRIPTHOOK_FOLDERS.includes(segment)),
  );
  const isManifest = files.some((file) => SCRIPT_FILES.includes(path.basename(file).toLowerCase()));
  const isScript = files.some((file) => SCRIPT_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = gameId === spec.game.id && (isFolder || (isManifest && isScript));

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

//Install ScriptHook script mods
function installScript(api, files, destinationPath) {
  if (!statCheckSync(GAME_PATH, SCRIPTHOOK_MARKER)) {
    scriptHookNotify(api);
  }
  const modName = path.basename(destinationPath, ".installing");
  const filtered = files.filter((file) => !file.endsWith(path.sep));

  //Archive ships a "ScriptHook" folder meant for the binaries folder
  const folderFile = filtered.find((file) =>
    file
      .toLowerCase()
      .split(path.sep)
      .slice(0, -1)
      .some((segment) => SCRIPTHOOK_FOLDERS.includes(segment)),
  );
  if (folderFile !== undefined) {
    const segments = folderFile.split(path.sep);
    const folderIdx = segments.findIndex((segment) =>
      SCRIPTHOOK_FOLDERS.includes(segment.toLowerCase()),
    );
    const rootPrefix = segments.slice(0, folderIdx + 1).join(path.sep) + path.sep;
    const instructions = filtered
      .filter((file) => file.toLowerCase().startsWith(rootPrefix.toLowerCase()))
      .map((file) => {
        return {
          type: "copy",
          source: file,
          destination: path.join(SCRIPTHOOK_FOLDER, file.slice(rootPrefix.length)),
        };
      });
    instructions.push({ type: "setmodtype", value: BINARIES_ID });
    return Promise.resolve({ instructions });
  }

  //Script folders (each one has its own manifest.json). A script at the archive root gets a folder named after the mod
  const manifestFiles = filtered.filter((file) =>
    SCRIPT_FILES.includes(path.basename(file).toLowerCase()),
  );
  const scriptFolders = outermostFolders(manifestFiles.map((file) => path.dirname(file)));
  const instructions = [];
  for (const folder of scriptFolders) {
    const folderName = folder === "." ? util.sanitizeFilename(modName) : path.basename(folder);
    const prefixLength = folder === "." ? 0 : folder.length + path.sep.length;
    for (const file of filtered.filter((entry) => isInFolder(entry, folder))) {
      instructions.push({
        type: "copy",
        source: file,
        destination: path.join(folderName, file.slice(prefixLength)),
      });
    }
  }
  instructions.push({ type: "setmodtype", value: SCRIPT_ID });
  return Promise.resolve({ instructions });
}

//Test for patch archive files
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

//Install patch archive files. An archive with several variant folders asks which one to install
async function installMod(api, files) {
  const setModTypeInstruction = { type: "setmodtype", value: MOD_ID };
  const modFiles = files.filter((file) => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  const indexFiles = modFiles.filter((file) =>
    MOD_INDEX_EXTS.includes(path.extname(file).toLowerCase()),
  );
  const folders = [
    ...new Set((indexFiles.length > 0 ? indexFiles : modFiles).map((file) => path.dirname(file))),
  ];
  const folder = folders.length > 1 ? await chooseVariantToInstall(api, folders) : folders[0];
  const instructions = modFiles
    .filter((file) => path.dirname(file) === folder)
    .map((file) => {
      return {
        type: "copy",
        source: file,
        destination: path.basename(file),
      };
    });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Variant selection dialog for archives with more than one set of patch archive files
async function chooseVariantToInstall(api, folders) {
  const result = await api.showDialog(
    "question",
    "Multiple Mod Variants",
    {
      text:
        `The mod you are installing contains ${folders.length} sets of patch files in different folders.\n` +
        `Only one set can be used at a time. Please select which one to install below:`,
      choices: folders.map((folder, idx) => {
        return {
          id: folder,
          text: folder === "." ? "(archive root)" : folder,
          value: idx === 0,
        };
      }),
    },
    [{ label: "Cancel" }, { label: "Install Selected" }],
  );
  if (result.action === "Cancel") {
    return Promise.reject(new util.UserCanceled());
  }
  return folders.find((folder) => result.input[folder]) ?? folders[0];
}

//Notify the user that ScriptHook is needed for script mods
function scriptHookNotify(api) {
  const NOTIF_ID = `${GAME_ID}-scripthook`;
  const MESSAGE = `${SCRIPTHOOK_NAME} is Required for Script Mods`;
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
                `The mod you just installed is a script for ${SCRIPTHOOK_NAME}.\n` +
                `${SCRIPTHOOK_NAME} is not available on Nexus Mods and must be installed manually with its own installer.\n` +
                `Use the "Download ${SCRIPTHOOK_NAME} Installer" button to download it in your browser, then run it and select your game folder.\n` +
                `\n` +
                `Script mods are installed to this folder: "[RootGameFolder]\\${SCRIPT_PATH}".\n`,
            },
            [
              { label: "Continue", action: () => dismiss() },
              {
                label: `Download ${SCRIPTHOOK_NAME} Installer`,
                action: () => {
                  try {
                    window.api.shell.openUrl(SCRIPTHOOK_INSTALLER_URL);
                  } catch (err) {
                    api.showErrorNotification("Failed to open the URL", err, {
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

//* Function to auto-download Disrupt Manager from GitHub
async function downloadLoader(api, gameSpec, check = true) {
  let isInstalled = isLoaderInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = LOADER_NAME;
    const MOD_TYPE = LOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    let URL = LOADER_URL;
    const URL_ERR = LOADER_URL_ERR;
    api.sendNotification({
      //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const dlInfo = {
        //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //const dlInfo = {};
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
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err, {
        allowReport: false,
      });
      try {
        window.api.shell.openUrl(URL_ERR);
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

//Check if the profile has an enabled mod of the given mod type
function hasEnabledModOfType(api, profileId, modType) {
  const state = api.getState();
  const mods = state?.persistent?.mods?.[GAME_ID] ?? {};
  const modState = state?.persistent?.profiles?.[profileId]?.modState ?? {};
  return Object.keys(mods).some((id) => mods[id]?.type === modType && modState[id]?.enabled);
}

//Notify the user to apply packages with Disrupt Manager after deployment (or to get Disrupt Manager first)
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = LOADER_NAME;
  const isInstalled = isLoaderInstalled(api, spec);
  const MESSAGE = isInstalled
    ? `Run ${MOD_NAME} to Apply Packages`
    : `${MOD_NAME} is Required for Packages`;
  const RUN_TITLE = isInstalled ? `Run ${MOD_NAME}` : `Download ${MOD_NAME}`;
  const run = () => (isInstalled ? runModManager(api) : downloadLoader(api, spec));
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
                `${PACKAGE_NAME} mods are not loaded by the game directly. After deploying with Vortex, you must open ${MOD_NAME}, tick the packages you want and click "Install Mods" there. ${MOD_NAME} then builds them into the game's patch files.\n` +
                `\n` +
                `Vortex places the packages in this folder: "[RootGameFolder]\\${PACKAGE_PATH}".\n` +
                `The first time you run ${MOD_NAME}, select the game folder in its settings.\n` +
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

//Find patch index files in the data folder that Disrupt Manager cannot read (older packers left the header fields zeroed)
async function findUnreadableFatFiles() {
  const folder = path.join(GAME_PATH, DATA_FOLDER);
  let entries = [];
  try {
    entries = await fsp.readdir(folder);
  } catch {
    return [];
  }
  const unreadable = [];
  for (const entry of entries) {
    if (!MOD_INDEX_EXTS.includes(path.extname(entry).toLowerCase())) continue;
    let handle;
    try {
      handle = await fsp.open(path.join(folder, entry), "r");
      const buffer = Buffer.alloc(FAT_HEADER_LENGTH);
      const { bytesRead } = await handle.read(buffer, 0, FAT_HEADER_LENGTH, 0);
      if (bytesRead === FAT_HEADER_LENGTH && buffer.readUInt32LE(FAT_FLAGS_OFFSET) === 0) {
        unreadable.push(entry);
      }
    } catch {
      //unreadable for other reasons (locked by the game or Disrupt Manager) - skip
    } finally {
      await handle?.close();
    }
  }
  return unreadable;
}

//Warn that a deployed patch archive will make Disrupt Manager crash when it installs packages
function unreadableFatNotify(api, files) {
  const NOTIF_ID = `${GAME_ID}-unreadable-fat`;
  const MESSAGE = `${LOADER_NAME} Cannot Read Some Patch Files`;
  const FILE_LIST = files.map((file) => `"${file}"`).join(", ");
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
                `These patch files in the "${DATA_FOLDER}" folder were made with an older tool: ${FILE_LIST}.\n` +
                `The game loads them normally, but ${LOADER_NAME} crashes with an "unknown version/platform/CV/NHV combination" error when it installs packages while they are present.\n` +
                `\n` +
                `To install your ${PACKAGE_NAME} mods: disable the ${MOD_NAME} mods that contain these files in Vortex, deploy, run ${LOADER_NAME} and install your packages, then enable the ${MOD_NAME} mods again and deploy.\n`,
            },
            [
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

//Run Disrupt Manager from its tool entry
function runModManager(api) {
  const TOOL_ID = LOADER_ID;
  const TOOL_NAME = LOADER_NAME;
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
  if (hasLoader && loaderAutoDownload) {
    await downloadLoader(api, gameSpec);
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
    //before the root installer: packages hold game data folders (like "worlds") the root installer would claim
    context.registerInstaller(PACKAGE_ID, 26, testPackage, (files, destinationPath) =>
      installPackage(context.api, files, destinationPath),
    );
  }
  if (rootInstaller) {
    context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  }
  context.registerInstaller(SCRIPT_ID, 28, testScript, (files, destinationPath) =>
    installScript(context.api, files, destinationPath),
  );
  if (binariesInstaller) {
    context.registerInstaller(BINARIES_ID, 29, testBinaries, installBinaries);
  }
  //context.registerInstaller(CONFIG_ID, 31, testConfig, installConfig);
  if (saveInstaller) {
    context.registerInstaller(SAVE_ID, 33, testSave, installSave);
  }
  if (needsModInstaller) {
    context.registerInstaller(MOD_ID, 35, testMod, (files) => installMod(context.api, files));
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
        window.api.shell.openFile(CONFIG_FILE_PATH);
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
    api.onAsync("did-deploy", async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      if (!hasEnabledModOfType(api, profileId, PACKAGE_ID)) return;
      deployNotify(api);
      const unreadable = await findUnreadableFatFiles();
      if (unreadable.length > 0) unreadableFatNotify(api, unreadable);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
