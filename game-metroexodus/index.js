/*
Name: Metro Exodus Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.4.1
Date: 2026-11-04
*/

//Import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const { parseStringPromise } = require("xml2js");
//Embedded mod.io browser page (needs base_browser.js beside it)
const { registerModioBrowser, onceModioBrowser } = require("./modio_browser");

//Specify all the information about the game
const STEAMAPP_ID_LEGACY = "412020";
const STEAMAPP_ID = "1449560";
const EPICAPP_ID = "153e4dd8955e452aa60ba9ba2d906bf1";
const GOGAPP_ID = "1407287452";
const XBOXAPP_ID = "DeepSilver.ProjectWindfall"; //Microsoft Store Edition, resolved via MS Store catalog - verify against a live install
const XBOXAPP_ID_ENHANCED = "DeepSilver.MetroExodusEnhancedEdition"; //Enhanced Edition, resolved via MS Store catalog - verify against a live install
const XBOXEXECNAME = "App"; // same on both editions, resolved via MS Store catalog - verify against a live install
const XBOX_PUB_ID = "hmv7qcest37me"; // same on both editions, resolved via MS Store catalog - verify against a live install
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID_LEGACY, STEAMAPP_ID, EPICAPP_ID, GOGAPP_ID, XBOXAPP_ID_ENHANCED, XBOXAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_ID = "metroexodus";
const GAME_NAME = "Metro Exodus";
const EXEC = "MetroExodus.exe";
const EXEC_XBOX = "gamelaunchhelper.exe";

//feature toggles
let hasXbox = false; //toggle for Xbox version logic
if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;
const modioBrowser = true; //register the "Browse mod.io" page - browse and install the game's mod.io mods inside Vortex

const EXTENSION_URL = "https://www.nexusmods.com/site/mods/907"; //Nexus link to this extension. Used for links
const MODIO_GAME = "exodussdk"; //mod.io game name_id - https://mod.io/g/exodussdk
const MODIO_URL = `https://mod.io/g/${MODIO_GAME}/m`;
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Metro_Exodus";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
let STAGING_FOLDER = ""; //Vortex staging folder path
let DOWNLOAD_FOLDER = ""; //Vortex download folder path
let GAME_PATH = ""; //Game installation path
let GAME_VERSION = ""; //Game version
const APPMANIFEST_FILE = "appxmanifest.xml";
//The Xbox version launches through a different exe, so require a game data file that every version has instead of MetroExodus.exe
const REQ_FILE = hasXbox ? "content.vfx" : EXEC;
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

//Exodus SDK projects - whole mod folders the SDK launcher loads with "Add Existing Mod", not files
//the game reads from its own folder. Each gets its own folder here.
const SDKMOD_ID = `${GAME_ID}-sdkmod`;
const SDKMOD_NAME = "SDK Mod";
const SDKMOD_PATH = "SDKMods";
const SDKMOD_FOLDERS = ["content", "cache"]; //a project holds ALL of these side by side

//Embedded mod.io browser page - the user browses the live site and installs from it. Most mod.io
//mods are SDK projects, so they land through the SDK mod installer.
const MODIO_BROWSER_CONFIG = {
  modioGame: MODIO_GAME,
  pageId: `${GAME_ID}-modio-browse`,
  pageTitle: "Browse mod.io",
};

const spec = {
  game: {
    id: GAME_ID,
    name: "Metro Exodus",
    executable: EXEC,
    logo: "metroexodus.jpg",
    mergeMods: true,
    modPath: ".",
    modPathIsRelative: true,
    requiredFiles: [REQ_FILE],
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
      id: SDKMOD_ID,
      name: SDKMOD_NAME,
      priority: "high",
      targetPath: path.join("{gamePath}", SDKMOD_PATH),
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
    id: "MetroExodusSDK",
    name: "Metro Exodus SDK",
    logo: "sdk.png",
    executable: () => path.join("SDK", "bin_x64", "Exodus_SDK.exe"),
    requiredFiles: [path.join("SDK", "bin_x64", "Exodus_SDK.exe")],
    detach: true,
    relative: true,
    exclusive: true,
  },
];

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

//Find game information by API utility
async function queryGame() {
  let game = await util.GameStoreHelper.findByAppId(spec.discovery.ids);
  return game;
}

//Find game install location
async function queryPath() {
  let game = await queryGame();
  return game.gamePath;
}

//Get the Xbox app id of the installed edition. Both editions use gamelaunchhelper.exe, so only appxmanifest.xml tells them apart
async function getXboxLaunchId(gamePath) {
  try {
    const appManifest = await fsp.readFile(path.join(gamePath, APPMANIFEST_FILE), "utf8");
    const parsed = await parseStringPromise(appManifest);
    if (parsed?.Package?.Identity?.[0]?.$?.Name === XBOXAPP_ID) {
      return XBOXAPP_ID;
    }
  } catch (err) {
    log("error", `Could not read appmanifest.xml file to get Xbox app id: ${err}`);
  }
  return XBOXAPP_ID_ENHANCED;
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === "xbox" && DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) {
    return {
      launcher: "xbox",
      addInfo: {
        appId: await getXboxLaunchId(gamePath),
        // appExecName is the <Application id="" in the appxmanifest.xml file
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    };
  }
  if (store === "epic") {
    return {
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    };
  }
  return undefined;
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (!hasXbox) {
    return EXEC;
  }
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    return EXEC_XBOX;
  }
  return EXEC;
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

//Find the folders holding an SDK project: the path above SDKMOD_FOLDERS, "" for the archive root
function getSdkModRoots(files) {
  const found = new Map();
  files.forEach((file) => {
    const segs = file.split(path.sep).slice(0, -1);
    const index = segs.findIndex((seg) => SDKMOD_FOLDERS.includes(seg.toLowerCase()));
    if (index === -1) return;
    const root = segs.slice(0, index).join(path.sep);
    found.set(root, (found.get(root) ?? new Set()).add(segs[index].toLowerCase()));
  });
  return [...found.keys()].filter((root) => found.get(root).size === SDKMOD_FOLDERS.length);
}

//Test for SDK projects
function testSdkMod(files, gameId) {
  let supported = gameId === spec.game.id && getSdkModRoots(files).length > 0;

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

//Install SDK projects, one folder per project. A project at the archive root is wrapped in a folder
//named after the archive, since the launcher adds a folder.
function installSdkMod(api, files, destinationPath) {
  const modFiles = files.filter((file) => !file.endsWith(path.sep));
  const archiveName = path
    .basename(destinationPath)
    .replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*/gi, "");
  const instructions = getSdkModRoots(files).flatMap((root) => {
    const folder = root === "" ? archiveName : path.basename(root);
    return modFiles
      .filter((file) => root === "" || file.startsWith(root + path.sep))
      .map((file) => ({
        type: "copy",
        source: file,
        destination: path.join(folder, path.relative(root, file)),
      }));
  });
  instructions.push({ type: "setmodtype", value: SDKMOD_ID });
  sdkModNotify(api);
  return Promise.resolve({ instructions });
}

//Explain the launcher step - Vortex can deploy an SDK project, but only the launcher can load it
function sdkModNotify(api) {
  const MESSAGE = "SDK Mods Must Be Added in the Exodus SDK";
  api.sendNotification({
    id: `${GAME_ID}-sdkmod`,
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
                `You installed an Exodus SDK mod. The game does not read these from its own folder, so there is one more step, and the Metro Exodus SDK must be installed.\n` +
                `\n` +
                `1. Deploy your mods in Vortex.\n` +
                `2. Run the Exodus SDK launcher.\n` +
                `3. Click "Add Existing Mod" and pick the mod's folder in:\n` +
                `${path.join(GAME_PATH, SDKMOD_PATH)}\n` +
                `4. Select the mod and click "Launch Game".\n`,
            },
            [{ label: "Close", action: () => dismiss() }],
          );
        },
      },
    ],
  });
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  if (hasXbox) {
    GAME_VERSION = await setGameVersion(GAME_PATH);
  }
  await vfs.ensureDirWritableAsync(path.join(discovery.path, SDKMOD_PATH));
  return vfs.ensureDirWritableAsync(path.join(discovery.path, gameSpec.game.modPath));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher,
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: getExecutable,
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
  //register mod installers
  context.registerInstaller(SDKMOD_ID, 25, testSdkMod, (files, destinationPath) =>
    installSdkMod(context.api, files, destinationPath),
  );

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
  if (modioBrowser) {
    context.registerAction(
      "mod-icons",
      300,
      "open-ext",
      {},
      "Open mod.io Page",
      () => {
        try {
          window.api.shell.openUrl(MODIO_URL);
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

  //register the embedded mod.io browser page
  if (modioBrowser) {
    registerModioBrowser(context, gameSpec, MODIO_BROWSER_CONFIG);
  }
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    const api = context.api;
    // put code here that should be run (once) when Vortex starts up
    if (modioBrowser) {
      //claims downloads started from the browse page, and update-checks the mods installed through it
      onceModioBrowser(api, spec, MODIO_BROWSER_CONFIG);
    }
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
