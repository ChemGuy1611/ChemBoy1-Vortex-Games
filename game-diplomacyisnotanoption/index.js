/*/////////////////////////////////////////////////
Name: Diplomacy Is Not An Option Vortex Extension
Structure: Unity BepinEx (Custom Nexus Download)
Author: ChemBoy1
Version: 0.3.0
Date: 2026-09-13
////////////////////////////////////////////////*/

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
//const winapi = require('winapi-bindings');

//Specify all the information about the game
const STEAMAPP_ID = "1272320";
const EPICAPP_ID = "65b84f30926947bb87400b6e39269156"; //from egdata.app
const GOGAPP_ID = "1946916562";
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const GAME_ID = "diplomacyisnotanoption";
const GAME_NAME = "Diplomacy is Not an Option";
const GAME_NAME_SHORT = "Diplomacy INAO";
const EXEC = "Diplomacy is Not an Option.exe";

const ROOT_ID = `${GAME_ID}-root`;

const BEPMOD_ID = `${GAME_ID}-bepmods`;
const BEPMOD_PATH = path.join("BepinEx", "plugins");
const modFileExt = ".dll";

//feature toggles
//OFF by default: ConfigurationManager is reached only from the toolbar button here. Turning this
//on does NOT install it - there is no setup() call and the requirement sets autoInstall: false.
//What it turns on is the update check for a ConfigurationManager the user already installed.
const downloadCfgMan = false; //should BepInExConfigManager be update-checked?

//Mirrors the unityBuild the BepInEx pack in main() provides. Declared separately on purpose: the
//BepInEx route is not this constant's business, it only drives the ConfigurationManager variant.
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
    //This game's BepInEx comes from a pre-built Nexus pack that may already contain a copy of
    //ConfigurationManager. autoInstall: false keeps the update check from ever adding a second
    //one on its own - installing is strictly the toolbar button's job, i.e. the user's choice.
    autoInstall: false,
    //pinVersion: BEPCFGMAN_VER, //the tag is 'v<version>', reached by the automatic 'v' retry
  },
];

const LOADER_ID = `${GAME_ID}-modloader`;

const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1070"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Diplomacy_Is_Not_an_Option";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
let STAGING_FOLDER = ""; //Vortex staging folder path
let DOWNLOAD_FOLDER = ""; //Vortex download folder path
let GAME_PATH = ""; //Game installation path
let GAME_VERSION = ""; //Game version
const IGNORE_CONFLICTS = [path.join("**", "changelog*"), path.join("**", "readme*")];
const IGNORE_DEPLOY = [path.join("**", "changelog*"), path.join("**", "readme*")];
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
      name: "Root Game Folder",
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
      name: "BepinEx Mod",
      priority: "high",
      targetPath: path.join("{gamePath}", BEPMOD_PATH),
    },
  ],
  discovery: {
    ids: [
      STEAMAPP_ID,
      EPICAPP_ID,
      GOGAPP_ID,
      //XBOXAPP_ID
    ],
    names: [],
  },
};

//3rd party tools and launchers
const tools = [];

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
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
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

//Set launcher requirements
async function requiresLauncher() {
  let game = await queryGame();

  if (game.gameStoreId === "steam") {
    return undefined;
  }

  //*
  if (game.gameStoreId === "epic") {
    return {
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    };
  }
  //*/

  if (game.gameStoreId === "xbox") {
    return {
      launcher: "xbox",
      addInfo: {
        appId: XBOXAPP_ID,
        // appExecName is the <Application id="" in the appxmanifest.xml file
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    };
  }

  return undefined;
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

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  //await downloadLoader(discovery, api, gameSpec);
  //setupNotify(api);
  //await fs.ensureDirWritableAsync(path.join(discovery.path, "Mods"));
  return vfs.ensureDirWritableAsync(path.join(discovery.path, BEPMOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //Require BepinEx Mod Installer extension
  context.requireExtension("modtype-bepinex");

  //register game
  const game = {
    ...gameSpec.game,
    queryPath,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher,
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
  context.registerInstaller(BEPCFGMAN_ID, 9, testBepCfgMan, installBepCfgMan); //must be set to 9 since bepinex extension modtypes start at 10 and would hijack

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
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
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
}

//main function
function main(context) {
  applyGame(context, spec);

  context.once(() => {
    const api = context.api;
    api.onAsync("check-mods-version", (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return Promise.resolve();
      return onCheckModVersion(api, gameId, mods, forced);
    });
    //Download BepinEx and register with extension
    if (context.api.ext.bepinexAddGame !== undefined) {
      context.api.ext.bepinexAddGame({
        gameId: GAME_ID,
        autoDownloadBepInEx: true,
        ///*
        customPackDownloader: () => {
          // <--- This will download from a Nexus Mods page
          return {
            gameId: GAME_ID, // The game extension's domain Id/gameId as defined when registering the extension
            domainId: GAME_ID, // Nexus Mods site domain for the BepinEx package's mod page
            modId: "1", // Nexus Mods site page number for the BepinEx package's mod page
            fileId: "6", // We extracted this one by hovering over the download buttons on the site
            archiveName: "BepInEx-5.4.23.2-win64-with-UnityECS-Support.zip", // What we want to call the archive of the downloaded pack.
            allowAutoInstall: true, // Whether we want this to be installed automatically - should always be true
          };
        },
        //*/
        //architecture: 'x64', // <--- This will download version for 64-bit games
        //architecture: 'x86', // <--- This will download version for 32-bit games
        //installRelPath: "bin/x64" // <--- Specify install location if not the root game folder
        //bepinexVersion: '5.4.23.5', // <--- Force BepinEx version
        //forceGithubDownload: true, // <--- This will force Vortex to download directly from Github
        //unityBuild: 'unityil2cpp', // <--- This will default to version 6.0.0 of BepInEx that supports IL2CPP
        //unityBuild: 'unitymono', // <--- This will default to version of BepInEx that supports Mono
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

//Gated on downloadCfgMan so an extension with it switched off runs no ConfigurationManager update
//check at all. With it on, the requirement's autoInstall: false still means only an ALREADY
//installed ConfigurationManager is updated - a missing one is never pulled in by the check.
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
