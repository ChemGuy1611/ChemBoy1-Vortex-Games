/*//////////////////////////////////////////
Name: PEAK Vortex Extension
Structure: Unity BepinEx
Author: ChemBoy1
Version: 0.2.1
Date: 2026-09-28
//////////////////////////////////////////*/

//Import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log } = require("vortex-api");
const path = require("path");
const template = require("string-template");
//Auto-downloader module - BepInEx itself still comes from the modtype-bepinex extension below
const {
  download,
  findModByFile,
  findDownloadIdByFile,
  resolveVersionByPattern,
  testRequirementVersion,
} = require("./downloader");
const { registerThunderstoreBrowser, onceThunderstoreBrowser } = require("./thunderstore_browser");
const winapi = require("winapi-bindings");

//Feature toggles
const thunderstoreBrowser = true; //register the "Browse Thunderstore" page

//Specify all the information about the game
const STEAMAPP_ID = "3527290";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const GAME_ID = "peak";
const exeHasGameVersion = false; //toggle: true if the game devs stamp the real game version (not just the Unity player version) into the exe ProductVersion

const TS_COMMUNITY = "peak"; //https://thunderstore.io/c/peak/
const TS_BROWSER_CONFIG = {
  tsCommunity: TS_COMMUNITY,
  pageId: `${GAME_ID}-thunderstore-browse`,
  pageTitle: "Browse Thunderstore",
};

const GAME_NAME = "PEAK";
const GAME_NAME_SHORT = "PEAK";
const EXEC = "PEAK.exe";
let GAME_PATH = "";
let GAME_VERSION = ""; //Game version
let STAGING_FOLDER = "";
let DOWNLOAD_FOLDER = "";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";

const BEPMOD_ID = `${GAME_ID}-bepmods`;
const BEPMOD_NAME = "BepinEx Mod";
const BEPMOD_PATH = path.join("BepinEx", "plugins");
const modFileExt = ".dll";

const BEPINEX_PAGE_ID = "1";
const BEPINEX_FILE_ID = "1";

const LOADER_ID = `${GAME_ID}-modloader`;

//feature toggles
const downloadCfgMan = true; //should BepInExConfigManager be downloaded?

//Mirrors the unityBuild literal passed to bepinexAddGame in main(). Declared separately on
//purpose: the BepInEx route is not this constant's business - it only picks the
//ConfigurationManager variant, so that literal is left exactly as it was.
const BEPINEX_BUILD = "unitymono"; // 'unityil2cpp' or 'unitymono'
const BEPCFGMAN_ID = `${GAME_ID}-bepcfgman`;
const BEPCFGMAN_NAME = "BepInEx Configuration Manager";
const BEPCFGMAN_PATH = "Bepinex";
const BEPCFGMAN_FILE = `configurationmanager.dll`; //lowercased
const BEPCFGMAN_VER = "19.0"; //set BepInExConfigManager version for direct URLs
//mono games take the BepInEx 5 build of ConfigurationManager, IL2CPP games the IL2CPP build.
//Matched with includes() because this family uses two vocabularies: 'mono'/'il2cpp' and
//'unitymono'/'unityil2cpp'.
const BEPCFGMAN_VARIANT = BEPINEX_BUILD.includes("mono") ? "BepInEx5" : "IL2CPP";
const BEPCFGMAN_ARCHIVE_NAME = `BepInEx.ConfigurationManager_${BEPCFGMAN_VARIANT}_v`;
const BEPCFGMAN_ARC_NAME = `${BEPCFGMAN_ARCHIVE_NAME}${BEPCFGMAN_VER}.zip`;
const BEPCFGMAN_URL_API = `https://api.github.com/repos/BepInEx/BepInEx.ConfigurationManager`;

// REQUIREMENTS ///////////////////////////////////////////////////////////////////////////////////////
//BepInEx itself is NOT here - it stays on the modtype-bepinex extension's bepinexAddGame route.
const BEPCFGMAN_REQUIREMENTS = [
  {
    archiveFileName: BEPCFGMAN_ARC_NAME,
    modType: BEPCFGMAN_ID,
    assemblyFileName: BEPCFGMAN_FILE,
    userFacingName: BEPCFGMAN_NAME,
    githubUrl: BEPCFGMAN_URL_API,
    findMod: (api) => findModByFile(api, BEPCFGMAN_ID, BEPCFGMAN_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, BEPCFGMAN_ARC_NAME),
    //v19.0 is 2-segment; the third group stays optional for a future 19.0.1 style tag
    fileArchivePattern: new RegExp(
      `^BepInEx\\.ConfigurationManager_${BEPCFGMAN_VARIANT}_v(\\d+\\.\\d+(?:\\.\\d+)?)`,
      "i",
    ),
    resolveVersion: (api) => resolveVersionByPattern(api, BEPCFGMAN_REQUIREMENTS[0]),
    //autoInstall is deliberately omitted - downloadCfgMan is the single switch here. With it
    //on, setup() installs ConfigurationManager and the update check may reinstate a missing
    //one; with it off, getRequirements() returns [] and neither path runs.
    //pinVersion: BEPCFGMAN_VER, //the tag is 'v<version>', reached by the automatic 'v' retry
  },
];

//Filled in from info above
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1356"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Peak";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const IGNORE_CONFLICTS = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];
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
    requiresCleanup: true,
    modPath: ".",
    modPathIsRelative: true,
    requiredFiles: [EXEC],
    details: {
      steamAppId: +STEAMAPP_ID,
      gogAppId: GOGAPP_ID,
      epicAppId: EPICAPP_ID,
      xboxAppId: XBOXAPP_ID,
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
      targetPath: "{gamePath}",
    },
    {
      id: BEPCFGMAN_ID,
      name: BEPCFGMAN_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", BEPCFGMAN_PATH),
    },
    {
      id: BEPMOD_ID,
      name: BEPMOD_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", BEPMOD_PATH),
    },
  ],
  discovery: {
    ids: [
      STEAMAPP_ID,
      //EPICAPP_ID,
      //GOGAPP_ID,
      //XBOXAPP_ID
    ],
    names: [],
  },
};

//3rd party tools and launchers
const tools = [];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////

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

//Replace folder path string placeholders with actual folder paths
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
  /*if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam',
    });
  } //*/
  /*if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  return Promise.resolve(undefined);
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for BepinExConfigManager mod files
function testBepCfgMan(files, gameId) {
  const isMod = files.some((file) => path.basename(file).toLowerCase() === BEPCFGMAN_FILE);
  const isFolder = files.some((file) => path.basename(file).toLowerCase() === "plugins");
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

//Install BepinExConfigManager mod files
function installBepCfgMan(files) {
  const MOD_TYPE = BEPCFGMAN_ID;
  const modFile = files.find((file) => path.basename(file).toLowerCase() === "plugins");
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

//Test for .dll BepinEx mod files
function testBepMod(files, gameId) {
  const isMod = files.some((file) => path.extname(file).toLowerCase() === modFileExt);
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

//Install .dll BepinEx mod files
function installBepMod(files) {
  const modFile = files.find((file) => path.extname(file).toLowerCase() === modFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: BEPMOD_ID };

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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

async function getExeProductVersion(filePath) {
  const exeVersion = require("exe-version");
  return exeVersion.getProductVersion(filePath);
}

function findSteamAppsDir(gamePath) {
  //walk up from gamePath to the ancestor dir whose parent is 'steamapps' and whose name is 'common'
  let dir = gamePath;
  for (;;) {
    const parent = path.dirname(dir);
    if (parent === dir) return undefined; //reached filesystem root
    if (
      path.basename(parent).toLowerCase() === "common" &&
      path.basename(path.dirname(parent)).toLowerCase() === "steamapps"
    ) {
      return path.dirname(parent);
    }
    dir = parent;
  }
}

async function resolveSteamBuildVersion(gamePath) {
  const steamAppsDir = findSteamAppsDir(gamePath);
  if (!steamAppsDir) return undefined;
  for (const appId of [STEAMAPP_ID, STEAMAPP_ID_DEMO]) {
    if (!appId || appId === "XXX") continue;
    try {
      const contents = await fsp.readFile(
        path.join(steamAppsDir, `appmanifest_${appId}.acf`),
        "utf8",
      );
      const match = contents.match(/"buildid"\s+"(\d+)"/);
      if (match) return match[1];
    } catch {
      //manifest for this appId not present here, try next
    }
  }
  return undefined;
}

async function resolveEpicBuildVersion(gamePath) {
  //dead branch today - EPICAPP_ID is null - present for template parity
  if (!EPICAPP_ID || EPICAPP_ID === "XXX") return undefined;
  let dataPath;
  try {
    dataPath = winapi.RegGetValue(
      "HKEY_LOCAL_MACHINE",
      "SOFTWARE\\WOW6432Node\\Epic Games\\EpicGamesLauncher",
      "AppDataPath",
    ).value;
  } catch {
    dataPath = path.join(
      process.env.ProgramData || process.env.ALLUSERSPROFILE,
      "Epic",
      "EpicGamesLauncher",
      "Data",
    );
  }
  const normalizedGamePath = path.normalize(gamePath).toLowerCase();
  try {
    const manifestsDir = path.join(dataPath, "Manifests");
    const entries = await fsp.readdir(manifestsDir);
    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith(".item")) continue;
      try {
        const data = JSON.parse(await fsp.readFile(path.join(manifestsDir, entry), "utf8"));
        const matches =
          data.AppName === EPICAPP_ID ||
          path.normalize(data.InstallLocation || "").toLowerCase() === normalizedGamePath;
        if (matches && data.AppVersionString) return data.AppVersionString;
      } catch {
        //unreadable/invalid manifest, skip it
      }
    }
  } catch (err) {
    log("warn", `Could not read Epic manifests for ${GAME_ID}: ${err}`);
  }
  return undefined;
}

async function resolveGogVersion(gamePath) {
  //dead branch today - GOGAPP_ID is null - present for template parity
  if (!GOGAPP_ID || GOGAPP_ID === "XXX") return undefined;
  try {
    const regKey = `SOFTWARE\\WOW6432Node\\GOG.com\\Games\\${GOGAPP_ID}`;
    const regPath = winapi.RegGetValue("HKEY_LOCAL_MACHINE", regKey, "path").value;
    if (path.normalize(regPath).toLowerCase() !== path.normalize(gamePath).toLowerCase()) {
      return undefined;
    }
    return winapi.RegGetValue("HKEY_LOCAL_MACHINE", regKey, "ver").value;
  } catch {
    //RegGetValue throws (never returns null) when the key/value is missing
    return undefined;
  }
}

async function resolveStoreVersion(gamePath) {
  const steamVersion = await resolveSteamBuildVersion(gamePath);
  if (steamVersion !== undefined) return steamVersion;
  const epicVersion = await resolveEpicBuildVersion(gamePath);
  if (epicVersion !== undefined) return epicVersion;
  return resolveGogVersion(gamePath);
}

//Get correct game version. No hash-fallback tier here - this game has no dedicated Assembly
//DLL modtype, so no confirmed game-code file exists to hash. Store build -> exe/"0.0.0" last resort.
async function resolveGameVersion(gamePath) {
  const READ_FILE = path.join(gamePath, EXEC); //single fixed exe, no getExecutable() in this file
  if (exeHasGameVersion) {
    try {
      return await getExeProductVersion(READ_FILE);
    } catch (err) {
      log("error", `Could not read ${READ_FILE} file to get game version: ${err}`);
    }
  }
  const storeVersion = await resolveStoreVersion(gamePath);
  if (storeVersion !== undefined) return storeVersion;
  //last resort: exe ProductVersion (Unity player version), then "0.0.0". Never throw.
  try {
    return await getExeProductVersion(READ_FILE);
  } catch (err) {
    log("error", `Could not read ${READ_FILE} file to get game version: ${err}`);
    return "0.0.0";
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  //await downloadBepinex(api, gameSpec);
  if (downloadCfgMan === true) {
    await vfs.ensureDirWritableAsync(path.join(GAME_PATH, "Bepinex")); //allows downloader to write files
    await downloadBepCfgMan(api, gameSpec);
  }
  return vfs.ensureDirWritableAsync(path.join(GAME_PATH, BEPMOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //Require BepinEx Mod Installer extension
  context.requireExtension("modtype-bepinex");

  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
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

  //register the embedded Thunderstore browser page
  if (thunderstoreBrowser) {
    registerThunderstoreBrowser(context, gameSpec, TS_BROWSER_CONFIG);
  }

  //register mod installers
  context.registerInstaller(BEPCFGMAN_ID, 9, testBepCfgMan, installBepCfgMan);
  //context.registerInstaller(BEPINEX_ID, 25, testBepinex, installBepinex);
  //context.registerInstaller(MELON_ID, 25, testMelon, installMelon);
  //context.registerInstaller(BEPMOD_ID, 25, testBepMod, installBepMod);
  //context.registerInstaller(MELONMOD_ID, 25, testMelonMod, installMelonMod);

  //register actions
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    `Download ${BEPCFGMAN_NAME}`,
    () => {
      downloadBepCfgMan(context.api, spec, false);
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

//* Functions to download BepInEx 5.4.23.x from GitHub (temporary due to error)
function isBepinexInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some((id) => mods[id]?.type === "bepinex-injector");
}
async function downloadBepinex(api, gameSpec) {
  let isInstalled = isBepinexInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = "BepInEx_win_x64_5.4.23.3";
    const MOD_TYPE = "bepinex-injector";
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    api.sendNotification({
      //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const URL =
        "https://github.com/BepInEx/BepInEx/releases/download/v5.4.23.3/BepInEx_win_x64_5.4.23.3.zip";
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
      const errPage = "https://github.com/BepInEx/BepInEx/releases";
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

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    const api = context.api;
    api.onAsync("check-mods-version", (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return Promise.resolve();
      return onCheckModVersion(api, gameId, mods, forced);
    });
    if (thunderstoreBrowser) {
      //claims downloads started from the browse page, and update-checks the mods installed through it
      onceThunderstoreBrowser(api, spec, TS_BROWSER_CONFIG);
    }
    //Download BepinEx and register with extension
    if (context.api.ext.bepinexAddGame !== undefined) {
      context.api.ext.bepinexAddGame({
        gameId: GAME_ID,
        autoDownloadBepInEx: true,
        /*
        customPackDownloader: () => { // <--- Download BepInEx from a Nexus Mods page. Don't use other lines if using this.
          return {
            gameId: GAME_ID, // <--- The game extension's domain Id/gameId as defined when registering the extension
            domainId: GAME_ID, // <--- Nexus Mods site domain for the BepinEx package's mod page (GAME_ID or "site")
            modId: BEPINEX_PAGE_ID, // <--- Nexus Mods site page number for the BepinEx package's mod page
            fileId: BEPINEX_FILE_ID, // <--- Get this by hovering over the download button on the site
            archiveName: `BepInEx-${GAME_ID}-Custom.zip`, // <--- What we want to call the archive of the downloaded pack.
            allowAutoInstall: true, // <--- Whether we want this to be installed automatically - should always be true
          }
        }, //*/
        //*
        architecture: "x64", // <--- Select version for 64-bit or 32-bit game ('x64' or 'x86')
        //installRelPath: "bin/x64" // <--- Specify install location (next to game .exe) if not the root game folder
        bepinexVersion: "5.4.23.5", // <--- Force BepinEx version
        forceGithubDownload: true, // <--- Force Vortex to download directly from Github (recommended)
        unityBuild: "unitymono", // <--- Download version 6.0.0 of BepInEx that supports IL2CPP or 5.4.23 Mono ('unityil2cpp' or 'unitymono')
        //*/
      });
    }
  });
  return true;
}

// AUTO-DOWNLOADER FUNCTIONS ///////////////////////////////////////////////////////////////////////

async function asyncForEachTestVersion(api, requirements) {
  for (let index = 0; index < requirements.length; index++) {
    await testRequirementVersion(api, requirements[index]);
  }
}

//Requirements this extension manages. ConfigurationManager installs unattended, so an extension
//that has it switched off must not have the update check pull it in through the back door.
function getRequirements(api) {
  return downloadCfgMan ? BEPCFGMAN_REQUIREMENTS : [];
}

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await asyncForEachTestVersion(api, getRequirements(api));
    log("warn", "Checked requirements versions");
  } catch (err) {
    log("warn", `Failed to test requirement version: ${err}`);
  }
}

//Download BepInExConfigManager from GitHub
async function downloadBepCfgMan(api, gameSpec, check = true) {
  return download(api, BEPCFGMAN_REQUIREMENTS, !check);
} //*/

//export to Vortex
module.exports = {
  default: main,
};
