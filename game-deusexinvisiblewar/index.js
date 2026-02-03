/*///////////////////////////////////////////
Name: Deus Ex: Invisible War Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.0
Date: 2025-09-26
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const winapi = require('winapi-bindings');
//const turbowalk = require('turbowalk');

//const USER_HOME = util.getVortexPath("home");
const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "deusexinvisiblewar";
const STEAMAPP_ID = "6920";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = "1207659068";
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, GOGAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Deus Ex: Invisible War";
const GAME_NAME_SHORT = "Deus Ex: IW";
const BINARIES_PATH = path.join('System');
const EXEC_NAME = "dx2.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const EXEC_VISIBLE = path.join(BINARIES_PATH, 'DeusEx2.exe');

const ROOT_FOLDERS = ['System', 'content'];
const BINARIES_FILES = ['dx2ui.ini'];

const DATA_FOLDER = 'Deus Ex - Invisible War';
const CONFIGMOD_LOCATION = DOCUMENTS;
const CONFIG_FOLDERNAME = '';
const SAVEMOD_LOCATION = DOCUMENTS;
const SAVE_FOLDERNAME = 'SaveGames';

let GAME_PATH = null;
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

const DATAMOD_ID = `${GAME_ID}-datamodfolder`;
const DATAMOD_NAME = "Data Mod Folder";
const DATAMOD_PATH = path.join('content', 'DX2');
const DATAMOD_FOLDERS = ['AcquiredDataText', 'Bitmaps', 'Conversations', 'Flags', 'LipsincData', 'Maps', 'MatLib', 'SkeletalAnimations', 'SkeletalMeshes', 'Sounds', 'StaticMeshes', 'TagDatabase', 'Textures', 'UTX', 'VideoTextures'];

const LAUNCHER_ID = `${GAME_ID}-launcher`;
const LAUNCHER_NAME = "Deux Exe (Launcher)";
const LAUNCHER_PATH = BINARIES_PATH;
const LAUNCHER_FILE = "deusex.exe";
const LAUNCHER_URL = "https://kentie.net/article/dxguide/files/DeusExe-v8.1.zip";
const LAUNCHER_URL_ERR = "https://kentie.net/article";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_EXT = ".ini";
const CONFIG_FILES = ["user.ini"];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, DATA_FOLDER, SAVE_FOLDERNAME);
const SAVE_PATH = path.join(SAVE_FOLDER);
const SAVE_EXT = ".dxs";
const SAVE_FILES = ["saveinfo.dxs"];

const VISIBLE_ID = `${GAME_ID}-visibleupgrade`;
const VISIBLE_NAME = "Visible Upgrade Launch";
const VISIBLE_EXEC = path.join(BINARIES_PATH, 'DeusEx2.exe');

const TWEAKER_ID = `${GAME_ID}-tweaker`;
const TWEAKER_NAME = "VisibleTweaker Launch";
const TWEAKER_EXEC = path.join(BINARIES_PATH, 'VisibleTweaker.exe');

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    //"parameters": PARAMETERS,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      //"epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      //"EpicAPPId": EPICAPP_ID,
      //"XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": DATAMOD_ID,
      "name": DATAMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', DATAMOD_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BINARIES_PATH)
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: VISIBLE_ID,
    name: VISIBLE_NAME,
    logo: 'visible.png',
    executable: () => VISIBLE_EXEC,
    requiredFiles: [
      VISIBLE_EXEC,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: PARAMETERS,
  }, //*/
  {
    id: TWEAKER_ID,
    name: TWEAKER_NAME,
    logo: 'tweaker.png',
    executable: () => TWEAKER_EXEC,
    requiredFiles: [
      TWEAKER_EXEC,
    ],
    relative: true,
    //exclusive: true,
    //shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
  {
    id: `${GAME_ID}-customlaunch`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC,
    requiredFiles: [
      EXEC,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: PARAMETERS,
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
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch (err) { //this happens if the executable comes back as "undefined", usually caused by the Xbox app locking down the folder
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
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
  if (store === 'xbox' && (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID))) {
      return Promise.resolve({
        launcher: 'xbox',
        addInfo: {
          appId: XBOXAPP_ID,
          parameters: [{ appExecName: XBOXEXECNAME }],
          //parameters: [{ appExecName: XBOXEXECNAME }, PARAMETERS_STRING],
          //launchType: 'gamestore',
        },
      });
  } //*/
  if (store === 'epic' && (DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID))) {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
          appId: EPICAPP_ID,
          //parameters: PARAMETERS,
          //launchType: 'gamestore',
        },
    });
  } //*/
  //*
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
      //addInfo: {
        //appId: STEAM_ID,
        //parameters: PARAMETERS,
        //launchType: 'gamestore',
      //} //
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct shipping executable for game version
function getExecutable(gamePath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(gamePath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_VISIBLE)) {
    return EXEC_VISIBLE; 
  };
  return EXEC;
}

const getDiscoveryPath = (api) => { //get the game's discovered path
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) { //useful to clear out mods prior to doing some action
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) { //useful to deploy mods after doing some action
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// AUTOMATIC DOWNLOAD FUNCTIONS //////////////////////////////////////////////

//Check if SDK is installed
function isLauncherInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LAUNCHER_ID);
}

//* Function to auto-download Hotfix Merger from GitHub
async function downloadLauncher(api, gameSpec) {
  let isInstalled = isLauncherInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = LAUNCHER_NAME;
    const MOD_TYPE = LAUNCHER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = LAUNCHER_URL;
    const ERR_URL = LAUNCHER_URL_ERR;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [URL], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = ERR_URL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Root folder files
function testDataMod(files, gameId) {
  const isMod = files.some(file => DATAMOD_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer.
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

//Installer install Root folder files
function installDataMod(files) {
  const MOD_TYPE = DATAMOD_ID;
  const modFile = files.find(file => DATAMOD_FOLDERS.includes(path.basename(file)));
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

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

//Test for launcher files
function testLauncher(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LAUNCHER_FILE));
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

//Install launcher files
function installLauncher(files) {
  const MOD_TYPE = LAUNCHER_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LAUNCHER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  ((file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))));

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

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer.
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

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

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

//Fallback installer to Binaries folder
function testBinaries(files, gameId) {
  let supported = (gameId === spec.game.id);

  // Test for a mod installer.
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

//Fallback installer to Binaries folder
function installBinaries(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };
  
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  //GAME_VERSION = setGameVersion(GAME_PATH);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  //await downloadLauncher(api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(GAME_PATH, MOD_PATH_DEFAULT));
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
    supportedTools: tools,
  };
  context.registerGame(game);

  //register mod types
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
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
  ); //
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
  
  context.registerInstaller(ROOT_ID, 25, testRoot, installRoot);
  context.registerInstaller(DATAMOD_ID, 27, testDataMod, installDataMod);
  //context.registerInstaller(LAUNCHER_ID, 29, testLauncher, installLauncher);
  //context.registerInstaller(CONFIG_ID, 43, testConfig, installConfig);
  //context.registerInstaller(SAVE_ID, 45, testSave, installSave);
  context.registerInstaller(BINARIES_ID, 49, testBinaries, installBinaries);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = CONFIG_PATH;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open user.ini File', () => {
    const openPath = path.join(CONFIG_PATH, 'user.ini');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    const openPath = SAVE_PATH;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open moddb.com Page', () => {
    const openPath = `https://www.moddb.com/games/deus-ex-invisible-war/mods`;
    util.opn(openPath).catch(() => null);
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    const openPath = DOWNLOAD_FOLDER;
    util.opn(openPath).catch(() => null);
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

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
