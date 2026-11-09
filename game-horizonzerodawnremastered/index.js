/*
Name: Horizon Zero Dawn Remastered Vortex Extension
Author: ChemBoy1
Version: 1.0.0
Date: 2026-11-09
*/

//import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const {
  download,
  findModByFile,
  resolveVersionByModVersion,
  testRequirementVersion,
} = require("./downloader");
//const winapi = require('winapi-bindings'); //gives access to the Windows registry

//Specify all the information about the game
const GAME_ID = "horizonzerodawnremastered";
const STEAMAPP_ID = "2561580";
const EPICAPP_ID = "Grunion"; //from egdata.app
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
//!audit-skip: store-id - GOGAPP_ID: GOG lists only the original Horizon Zero Dawn Complete Edition, not the Remastered release
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const EXEC = "HorizonZeroDawnRemastered.exe";
const GAME_NAME = "Horizon Zero Dawn Remastered";
const GAME_NAME_SHORT = "Horizon ZD Remastered";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1077"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Horizon_Zero_Dawn_Remastered";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;

let STAGING_FOLDER = ""; //Vortex staging folder path
let DOWNLOAD_FOLDER = ""; //Vortex download folder path
let GAME_PATH = ""; //Game installation path
let GAME_VERSION = ""; //Game version
let modManagerInstalled = false;

//feature toggles
const hasModManager = false; //HFW Mod Manager and its mods. Off until the manager supports this game

//Info for mod types and installers
const MODMANAGER_ID = `${GAME_ID}-modmanager`;
const MODMANAGER_NAME = "DS2 Mod Manager";
const MODMANAGER_EXEC = "HFW_MM.exe";
const MODMANAGER_PAGE_NO = 137;
const MODMANAGER_FILE_NO = 762;
const MODMANAGER_DOMAIN = "horizonforbiddenwest";

// The Mod Manager is published only on Nexus, on the Horizon Forbidden West page rather than this
// game's, and as a naked .exe rather than an archive. The requirement therefore takes the module's
// Nexus route with directCopyAsMod: the file lands in a managed mod's staging folder and deploys
// through MODMANAGER_ID, giving it a mod list row with its version and an update check.
const MODMANAGER_REQUIREMENTS = [
  {
    archiveFileName: MODMANAGER_EXEC, //notification id only on this route
    userFacingName: MODMANAGER_NAME,
    nexusModId: MODMANAGER_PAGE_NO, //presence of this switches the requirement to the Nexus route
    //REQUIRED here: the page belongs to another game, so the domain must never be inferred from
    //the game being managed. The download also lands in that game's download folder, which the
    //module resolves from the download itself.
    nexusDomain: MODMANAGER_DOMAIN,
    nexusFileId: MODMANAGER_FILE_NO, //fallback only, for when the file listing cannot be read
    //The page files its current build under MISCELLANEOUS, not MAIN, and has no MAIN file at all -
    //so accept every category a file can be uploaded as (MAIN/OPTIONAL/MISCELLANEOUS) and none of
    //the states a superseded file falls into (UPDATE/OLD_VERSION/ARCHIVED).
    nexusCategoryId: [1, 3, 5],
    modType: MODMANAGER_ID,
    assemblyFileName: MODMANAGER_EXEC,
    directCopyAsMod: true,
    installFileName: MODMANAGER_EXEC, //the uploaded file name carries the mod and file ids
    findMod: (api) => findModByFile(api, MODMANAGER_ID, MODMANAGER_EXEC),
    resolveVersion: (api) => resolveVersionByModVersion(api, MODMANAGER_REQUIREMENTS[0]),
    autoInstall: true,
  },
];

const MANAGERMOD_ID = `${GAME_ID}-managermod`;
const MANAGERMOD_NAME = "DS2 Manager Mod";
const MANAGERMOD_PATH = path.join("mods");
const MANAGERMOD_EXTS = [".core", ".stream"];
const MANAGERMOD_FILES = ["modinfo.json"];

//Native Loader plugins: <game>\nativemods\<mod>\<mod>.dll
const NATIVEMOD_ID = `${GAME_ID}-nativemod`;
const NATIVEMOD_NAME = "Native Mod";
const NATIVEMOD_PATH = "nativemods";
const NATIVEMOD_EXTS = [".dll"];

//Data Loader mods: <game>\datamods\<mod>\<game folders>\file.core
const DATAMOD_ID = `${GAME_ID}-datamod`;
const DATAMOD_NAME = "Data Mod";
const DATAMOD_PATH = "datamods";
const DATAMOD_EXTS = [".core"];
const DATAMOD_ROOT_FOLDERS = ["default_assets", "interface", "localized", "models"]; //the game's own top folders, used to find where the mod's folder sits
const DATAMOD_EXCLUDE_FILES = ["packfilelocators.bin"]; //archives with this replace the game's own package files

const LOADERMOD_ID = `${GAME_ID}-loaderfolders`;
const LOADERMOD_FOLDERS = [NATIVEMOD_PATH, DATAMOD_PATH];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_EXT = ".dat";
const userDocsValue = util.getVortexPath("documents");
const userDocsPathString = userDocsValue.replace(/x00s/g, "");
const SAVE_FOLDER = path.join(userDocsPathString, "Horizon Zero Dawn Remastered");
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
const CONFIG_PATH = SAVE_PATH;

const MOD_PATH_DEFAULT = ".";
const REQ_FILE = EXEC;
const PARAMETERS_STRING = "";
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [NATIVEMOD_PATH, DATAMOD_PATH];
if (hasModManager) MODTYPE_FOLDERS.push(MANAGERMOD_PATH);

//Mod types and tools that exist only with the Mod Manager
const MODMANAGER_FEATURE_IDS = [MANAGERMOD_ID, MODMANAGER_ID];
const isEnabledFeature = (entry) => hasModManager || !MODMANAGER_FEATURE_IDS.includes(entry.id);
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

const spec = {
  game: {
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME_SHORT,
    executable: EXEC,
    logo: `${GAME_ID}.jpg`,
    mergeMods: true,
    modPath: MOD_PATH_DEFAULT,
    modPathIsRelative: true,
    requiredFiles: [EXEC],
    details: {
      steamAppId: +STEAMAPP_ID,
      epicAppId: EPICAPP_ID,
      compatibleDownloads: ["horizonzerodawn"],
      supportsSymlinks: true,
      ignoreConflicts: IGNORE_CONFLICTS,
      ignoreDeploy: IGNORE_DEPLOY,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
      EpicAPPId: EPICAPP_ID,
    },
  },
  modTypes: [
    {
      id: MANAGERMOD_ID,
      name: MANAGERMOD_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", MANAGERMOD_PATH),
    },
    {
      id: MODMANAGER_ID,
      name: MODMANAGER_NAME,
      priority: "low",
      targetPath: "{gamePath}",
    },
    {
      id: SAVE_ID,
      name: "Save Game (Documents)",
      priority: "high",
      targetPath: SAVE_PATH,
    },
    {
      id: NATIVEMOD_ID,
      name: NATIVEMOD_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", NATIVEMOD_PATH),
    },
    {
      id: DATAMOD_ID,
      name: DATAMOD_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", DATAMOD_PATH),
    },
  ].filter(isEnabledFeature),
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
    detach: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
  {
    id: MODMANAGER_ID,
    name: MODMANAGER_NAME,
    logo: `modmanager.png`,
    executable: () => MODMANAGER_EXEC,
    requiredFiles: [MODMANAGER_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
    //defaultPrimary: true,
    //parameters: [],
  }, //*/
].filter(isEnabledFeature);

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

//convert path placeholders to actual values
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

//Get mod path
function makeGetModPath(api, gameSpec) {
  return () =>
    gameSpec.game.modPathIsRelative !== false
      ? gameSpec.game.modPath || "."
      : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

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
  if (store === "steam") {
    return Promise.resolve({
      launcher: "steam",
    });
  } //*/
  return Promise.resolve(undefined);
}

// MOD INSTALLER FUNCTIONS //////////////////////////////////////////////////////////////

//Test for an archive already laid out as the game's nativemods and datamods folders
function testLoaderFolders(files, gameId) {
  const isMod = files.some((file) =>
    file
      .toLowerCase()
      .split(path.sep)
      .some((segment) => LOADERMOD_FOLDERS.includes(segment)),
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

//Install nativemods and datamods folders to the game folder, dropping anything outside them
function installLoaderFolders(files) {
  const instructions = [];
  files
    .filter((file) => !file.endsWith(path.sep))
    .forEach((file) => {
      const segments = file.split(path.sep);
      const idx = segments.findIndex((segment) =>
        LOADERMOD_FOLDERS.includes(segment.toLowerCase()),
      );
      if (idx !== -1) {
        instructions.push({
          type: "copy",
          source: file,
          destination: segments.slice(idx).join(path.sep),
        });
      }
    });
  return Promise.resolve({ instructions });
}

//A Native Loader plugin is a dll named after the folder it sits in. Proxy dlls (version.dll, dxgi.dll) are not.
function isNativeModFile(file) {
  const ext = path.extname(file);
  return (
    NATIVEMOD_EXTS.includes(ext.toLowerCase()) &&
    path.basename(path.dirname(file)).toLowerCase() === path.basename(file, ext).toLowerCase()
  );
}

//Test for Native Loader plugins
function testNativeMod(files, gameId) {
  const isMod = files.some((file) => isNativeModFile(file));
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

//Install Native Loader plugins, each keeping its own folder
function installNativeMod(files) {
  const folders = files.filter((file) => isNativeModFile(file)).map((file) => path.dirname(file));
  const instructions = [{ type: "setmodtype", value: NATIVEMOD_ID }];
  files
    .filter((file) => !file.endsWith(path.sep))
    .forEach((file) => {
      const folder = folders.find((iter) => file.startsWith(iter + path.sep));
      if (folder !== undefined) {
        instructions.push({
          type: "copy",
          source: file,
          destination: path.join(path.basename(folder), file.slice(folder.length + 1)),
        });
      }
    });
  return Promise.resolve({ instructions });
}

//A Data Loader mod file sits below a folder. A bare .core at the archive root is a Mod Manager mod.
function isDataModFile(file) {
  return DATAMOD_EXTS.includes(path.extname(file).toLowerCase()) && path.dirname(file) !== ".";
}

//Test for Data Loader mods
function testDataMod(files, gameId) {
  const isMod = files.some((file) => isDataModFile(file));
  const isExcluded = files.some((file) => {
    const name = path.basename(file).toLowerCase();
    return MANAGERMOD_FILES.includes(name) || DATAMOD_EXCLUDE_FILES.includes(name);
  });
  let supported = gameId === spec.game.id && isMod && !isExcluded;

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

//Install Data Loader mods, keeping the mod's folder or giving it one named after the archive
function installDataMod(files, fileName) {
  const segments = files.find((file) => isDataModFile(file)).split(path.sep);
  const rootIdx = segments.findIndex((segment) =>
    DATAMOD_ROOT_FOLDERS.includes(segment.toLowerCase()),
  );
  const modIdx = rootIdx === -1 ? 0 : rootIdx - 1;
  const MOD_FOLDER =
    modIdx < 0
      ? path.basename(fileName).replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*/gi, "")
      : "";
  const wrapper = segments.slice(0, Math.max(modIdx, 0));
  const rootPrefix = wrapper.length > 0 ? wrapper.join(path.sep) + path.sep : "";

  //Files beside the mod's folder are readmes
  const filtered = files.filter(
    (file) =>
      !file.endsWith(path.sep) &&
      file.startsWith(rootPrefix) &&
      file.slice(rootPrefix.length).includes(path.sep),
  );
  const instructions = filtered.map((file) => ({
    type: "copy",
    source: file,
    destination: path.join(MOD_FOLDER, file.slice(rootPrefix.length)),
  }));
  instructions.push({ type: "setmodtype", value: DATAMOD_ID });
  return Promise.resolve({ instructions });
}

//test for HFW MM files/exts
function testManagerMod(files, gameId) {
  const isInfo = files.some((file) => MANAGERMOD_FILES.includes(path.basename(file).toLowerCase()));
  const isExt = files.some((file) => MANAGERMOD_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = gameId === spec.game.id && (isInfo || isExt);

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

//Install Mod Manager mod (unzipped in folder)
function installManagerMod(files, fileName) {
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*/gi, "");
  const setModTypeInstruction = { type: "setmodtype", value: MANAGERMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep));

  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(MOD_FOLDER, file),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//test whether to use mod installer
function testSave(files, gameId) {
  const isMod = files.find((file) => path.extname(file).toLowerCase() === SAVE_EXT) !== undefined;
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
function installSave(files) {
  const modFile = files.find((file) => path.extname(file).toLowerCase() === SAVE_EXT);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: SAVE_ID };

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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if HFW ModManager is installed
async function isModManagerInstalled(api) {
  //The managed mod is the primary signal: the executable only appears in the game folder once
  //Vortex has deployed it, so with auto-deploy off the disk check alone would keep asking the
  //user to install something they already have.
  if ((await findModByFile(api, MODMANAGER_ID, MODMANAGER_EXEC)) !== undefined) {
    return true;
  }
  //Fallback for a copy the user placed in the game folder by hand, which Vortex does not manage.
  try {
    GAME_PATH = getDiscoveryPath(api);
    await fsp.stat(path.join(GAME_PATH, MODMANAGER_EXEC));
    return true;
  } catch {
    return false;
  }
}

//Install the Mod Manager. check === true means "only if it is missing"; a forced call passes
//false, which is exactly download()'s forced branch.
async function downloadModManager(api, check = true) {
  GAME_PATH = getDiscoveryPath(api);
  return download(api, MODMANAGER_REQUIREMENTS, !check);
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User to run Mod Manager after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = "HFW MM";
  const MESSAGE = `Run ${MOD_NAME} after Deploy`;
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: `Run ${MOD_NAME}`,
        action: (dismiss) => {
          runManager(api);
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
                `You must use ${MOD_NAME} to install .core/.stream mods after installing with Vortex.\n` +
                `\n` +
                `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n` +
                `Select the mod options you want, then click the "Pack Mods" button.\n`,
            },
            [
              {
                label: `Run ${MOD_NAME}`,
                action: () => {
                  runManager(api);
                  dismiss();
                },
              }, //*/
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

//Notify User to run Mod Manager to restore vanilla files on purge
function purgeNotify(api) {
  const NOTIF_ID = `${GAME_ID}-purge-notification`;
  const MOD_NAME = "HFW MM";
  const MESSAGE = `Run ${MOD_NAME} To Restore Files`;
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: `Run ${MOD_NAME}`,
        action: (dismiss) => {
          runManager(api);
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
                `\n` +
                `Vortex just detected that you have purged mods.\n` +
                `If you wish to restore the game to a vanilla state, you must run ${MOD_NAME} and click the "Restore Files" button.\n` +
                `\n` +
                `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`,
            },
            [
              {
                label: `Run ${MOD_NAME}`,
                action: () => {
                  runManager(api);
                  dismiss();
                },
              }, //*/
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

function runManager(api) {
  let TOOL_ID = MODMANAGER_ID;
  let TOOL_NAME = MODMANAGER_NAME;
  const state = api.store.getState();
  const tool = state?.settings?.gameMode?.discovered?.[GAME_ID]?.tools?.[TOOL_ID] ?? undefined;

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api
        .runExecutable(TOOL_PATH, [], {
          //cwd: path.dirname(TOOL_PATH),
          detach: true,
          //env: { 'PATH': process.env.PATH },
          //shell: true,
          suggestDeploy: false,
        })
        .catch((err) =>
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
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  if (hasModManager) await downloadModManager(api, true);
  await vfs.ensureDirWritableAsync(SAVE_PATH);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    requiresCleanup: true,
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
  context.registerInstaller(LOADERMOD_ID, 29, testLoaderFolders, installLoaderFolders);
  context.registerInstaller(NATIVEMOD_ID, 31, testNativeMod, installNativeMod);
  context.registerInstaller(DATAMOD_ID, 33, testDataMod, installDataMod);
  if (hasModManager) {
    context.registerInstaller(MANAGERMOD_ID, 35, testManagerMod, installManagerMod);
  }
  context.registerInstaller(`${GAME_ID}-save`, 45, testSave, installSave);

  //register actions
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
    "Open Config/Save Folder",
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

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    context.api.onAsync("check-mods-version", async (gameId, mods, forced) => {
      if (!hasModManager || gameId !== GAME_ID) return;
      try {
        await testRequirementVersion(api, MODMANAGER_REQUIREMENTS[0]);
      } catch (err) {
        log("warn", `Failed to test requirement version: ${err}`);
      }
      return Promise.resolve();
    });
    context.api.onAsync("did-deploy", async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(
        context.api.getState(),
        GAME_ID,
      );
      if (!hasModManager || profileId !== LAST_ACTIVE_PROFILE) return;
      modManagerInstalled = await isModManagerInstalled(context.api);
      if (!modManagerInstalled) {
        await downloadModManager(context.api, true);
      }
      deployNotify(context.api);
      return Promise.resolve();
    });
    context.api.onAsync("did-purge", async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(
        context.api.getState(),
        GAME_ID,
      );
      if (!hasModManager || profileId !== LAST_ACTIVE_PROFILE) return;
      modManagerInstalled = await isModManagerInstalled(context.api);
      if (!modManagerInstalled) {
        await downloadModManager(context.api, true);
      }
      purgeNotify(context.api);
      return Promise.resolve();
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
