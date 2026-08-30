/*////////////////////////////////////////////////////////
Name: Return to Castle Wolfenstein Vortex Extension
Structure: Generic Game with Custom Engine Mod (RealRTCW)
Author: ChemBoy1
Version: 1.1.0
Date: 2026-08-29
////////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');
const { downloadModDb, checkForModDbUpdate, downloadModDbRequirement } = require('./moddb_downloader');
const { registerModDbBrowser, onceModDbBrowser } = require('./moddb_browser');

//feature toggles
const moddbBrowser = true; //register the "Browse ModDB" page (moddb.com)

//Specify all the information about the game
const STEAMAPP_ID = "9010";
const EPICAPP_ID = null;
const GOGAPP_ID = "1441704976";
const XBOXAPP_ID = "BethesdaSoftworks.ReturntoCastleWolfenstein";
const XBOXEXECNAME = "Game";
const GAME_ID = "returntocastlewolfenstein";
const GAME_NAME = "Return to Castle Wolfenstein";
const GAME_NAME_SHORT = "RTCW";
const EXEC = "WolfSP.exe";
const EXEC_XBOX = "gamelaunchhelper.exe";

let GAME_VERSION = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//Info for mod types, tools, and installers
const IORTCW_ID = `${GAME_ID}-iortcw`;
const IORTCW_NAME = "ioRTCW";
const IORTCW_EXEC = "iowolfsp.x64.exe";

const REALRTCW_ID = `${GAME_ID}-realrtcw`;
const REALRTCW_NAME = "RealRTCW";
const REALRTCW_EXEC = "realrtcw.x64.exe";
const REALRTCW_URL = "https://www.moddb.com/mods/realrtcw-realism-mod/downloads";
const MODDB_REQUIREMENTS = [ //ModDB requirements for moddb_downloader.js
  { //RealRTCW
    moddbPath: 'mods/realrtcw-realism-mod',
    modType: REALRTCW_ID,
    userFacingName: REALRTCW_NAME,
    filePattern: /^RealRTCW\s+\d+(\.\d+)*$/i, //main mod only - skips the language packs, localizations and "(OUTDATED)" releases in the feed
    versionPattern: /(\d+(?:\.\d+)+)\s*$/, //version trails the title ("RealRTCW 5.43"), so the default trailing-bracket pattern does not apply
    fallbackFileId: '273184', //https://www.moddb.com/downloads/start/273184
    fallbackVersion: '5.43',
    pageUrl: REALRTCW_URL,
    browseKey: 'mods/realrtcw-realism-mod#realrtcw', //RealRTCW's own file on the browse page, so browsing to it installs the requirement
    skipDownloadManager: true, //modDB blocks Vortex's download manager - fetch the file directly instead
  },
];

//Embedded ModDB browser page - the user browses the live moddb.com section for this game and
//installs from it. Vortex's download manager cannot fetch from this host, so the page fetches
//the file itself; the requirement above keeps its own mod type when downloaded there.
const MODDB_BROWSER_CONFIG = {
  //the GAME, not the RealRTCW mod page the requirement above tracks - the browse page is for
  //finding anything for this game, and the game feed is also the fallback for a mod page whose
  //own feed 404s
  moddbPath: 'games/return-to-castle-wolfenstein',
  requirements: MODDB_REQUIREMENTS,
  installRequirement: (api, gameSpec, requirement) =>
    downloadModDbRequirement(api, gameSpec, requirement, true),
  pageId: `${GAME_ID}-moddb-browse`,
  pageTitle: 'Browse ModDB',
  //no hotkey: Ctrl+Shift+B is already taken, and a second claim on it is dropped with a warning
};

const MAIN_ID = `${GAME_ID}-mainfolder`;
const MAIN_NAME = "Main Folder";
const MAIN_FOLDER = "Main";
const MAIN_PATH = path.join('.');

const PK3_ID = `${GAME_ID}-main`;
const PK3_NAME = ".pk3 Data (Main)";
const PK3_PATH = path.join(MAIN_FOLDER);
const PK3_EXT = ".pk3";

//Filled in from data above
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/937"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Return_to_Castle_Wolfenstein";
let STAGING_FOLDER = ''; //Vortex staging folder path
let DOWNLOAD_FOLDER = ''; //Vortex download folder path
let GAME_PATH = ''; //Game installation path
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": ".",
    "requiresCleanup": true,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": PK3_ID,
      "name": PK3_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', PK3_PATH)
    },
    {
      "id": MAIN_ID,
      "name": MAIN_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MAIN_PATH)
    },
    {
      "id": REALRTCW_ID,
      "name": REALRTCW_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
    {
      "id": IORTCW_ID,
      "name": IORTCW_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      GOGAPP_ID,
      XBOXAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: 'RealRTCW',
    name: 'Launch RealRTCW',
    logo: 'realrtcw.png',
    executable: () => REALRTCW_EXEC,
    requiredFiles: [REALRTCW_EXEC],
    relative: true,
    exclusive: true,
    parameters: [
      
    ],
    defaultPrimary: true,
  },
  {
    id: 'ioRTCW',
    name: 'Launch ioRTCW',
    logo: 'iortcw.png',
    executable: () => IORTCW_EXEC,
    requiredFiles: [IORTCW_EXEC],
    relative: true,
    exclusive: true,
    parameters: [
      
    ],
    defaultPrimary: true,
  },
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////////////////////

//Set mod type priorities
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

async function getAllFiles(dirPath) {
  let results = [];
  try {
    const entries = await fs.readdirAsync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.statAsync(fullPath);
      if (stats.isDirectory()) { // Recursively get files from subdirectories
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else { // Add file to results
        results.push(fullPath);
      }
    }
  } catch (err) {
    log('warn', `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

const getDiscoveryPath = (api) => { //get the game's discovered path
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}

async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
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
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'xbox') {
    return Promise.resolve({
      launcher: "xbox",
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  }
  return Promise.resolve(undefined);
}

//Get correct game version
async function setGameVersion(gamePath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(gamePath, exec));
      return true;
    }
    catch {
      return false;
    }
  };

  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  };

  GAME_VERSION = 'default';
  return GAME_VERSION;
}

// DOWNLOAD MOD FUNCTIONS //////////////////////////////////////////////////////////////////////////////////////////////

//Check if mod injector is installed
function isRealRTCWInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === REALRTCW_ID);
}

//Check if mod injector is installed
function isIoRTCWInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === IORTCW_ID);
}

//Startup notification to download RealRTCW
async function downloadEngine(api, gameSpec) {
  let isInstalled = ( isRealRTCWInstalled(api, gameSpec) || isIoRTCWInstalled(api, gameSpec) );
  if (!isInstalled) {
    const NOTIF_ID = 'setup-notification-returntocastlewolfenstein';
    const MOD_NAME = REALRTCW_NAME;
    const MESSAGE = `${MOD_NAME} Recommended`;
    api.sendNotification({
      id: NOTIF_ID,
      type: 'warning',
      message: MESSAGE,
      allowSuppress: true,
      actions: [
        {
          title: 'More',
          action: (dismiss) => {
            api.showDialog('question', MESSAGE, {
              text: 'It is highly recommended that you download and install RealRTCW to improve your experience on modern systems. \n'
                  + 'RealRTCW is a fork of ioRTCW and is receiving active support, so it is the recommended engine. \n'
              },
              [
                { label: 'Download RealRTCW', action: () => {
                  downloadRealRTCW(api, gameSpec);
                  dismiss();
                }},
                { label: 'Not Now', action: () => dismiss() },
                {
                  label: 'Never Show Again', action: () => {
                    api.suppressNotification(NOTIF_ID);
                    dismiss();
                  }
                },
              ]);
          },
        },
      ],
    });    
  }
}

//Function to auto-download RealRTCW from modDB (resolved via the shared moddb_downloader module)
async function downloadRealRTCW(api, gameSpec, check = true) {
  return downloadModDb(api, gameSpec, MODDB_REQUIREMENTS, check);
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////////////

//Installer test for ioRTCW
function testIortcw(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === IORTCW_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install ioRTCW files
function installIortcw(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === IORTCW_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: IORTCW_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for RealRTCW
function testRealrtcw(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === REALRTCW_EXEC));
  //const isMod = files.some(file => (path.basename(file).toLowerCase().includes('realrtcw.x64')));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install RealRTCW files
function installRealrtcw(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === REALRTCW_EXEC));
  //const modFile = files.find(file => (path.basename(file).toLowerCase().includes('realrtcw.x64')));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: REALRTCW_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for Main folderfiles
function testMainFolder(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === MAIN_FOLDER));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Main folder files
function installMainFolder(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MAIN_FOLDER.toLowerCase()));
  const idx = modFile.indexOf(`${modFile}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MAIN_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for pk3 files
function testPk3(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === PK3_EXT));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer
  if (supported && files.find(file =>
      (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
      (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install pk3 files
function installPk3(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === PK3_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PK3_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// MAIN FUNCTIONS ////////////////////////////////////////////////////////////////////

//*
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

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  await (gameSpec.modTypes || []).forEach((type, idx, arr) => {
    fs.ensureDirWritableAsync(pathPattern(api, gameSpec.game, type.targetPath));
  });
  await downloadEngine(api, gameSpec);
  await checkForModDbUpdate(api, gameSpec, MODDB_REQUIREMENTS).catch(() => null); //update check should never block setup
  return fs.ensureDirWritableAsync(path.join(discovery.path, gameSpec.game.modPath));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = { //register game
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

  //register the embedded moddb.com browser page
  if (moddbBrowser) {
    registerModDbBrowser(context, gameSpec, MODDB_BROWSER_CONFIG);
  }
  
  //register mod types
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod installers
  context.registerInstaller(IORTCW_ID, 25, testIortcw, installIortcw);
  context.registerInstaller(REALRTCW_ID, 30, testRealrtcw, installRealrtcw);
  context.registerInstaller(MAIN_ID, 35, testMainFolder, installMainFolder);
  context.registerInstaller(PK3_ID, 40, testPk3, installPk3);

  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Latest RealRTCW', () => {
    downloadRealRTCW(context.api, gameSpec, false).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });

  //register actions
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open PCGamingWiki Page', () => {
    util.opn(PCGAMINGWIKI_URL).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Submit Bug Report', () => {
    util.opn(`${EXTENSION_URL}?tab=bugs`).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    util.opn(DOWNLOAD_FOLDER).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return checkForModDbUpdate(api, spec, MODDB_REQUIREMENTS)
        .catch(err => log('warn', `Failed to check for ${REALRTCW_NAME} update: ${err}`));
    });
    if (moddbBrowser) { //installs downloads started from the browse page, and update-checks the mods installed through it
      onceModDbBrowser(context.api, spec, MODDB_BROWSER_CONFIG);
    }
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
