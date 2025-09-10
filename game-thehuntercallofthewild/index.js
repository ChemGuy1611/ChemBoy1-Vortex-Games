/*///////////////////////////////////////////
Name: theHunter: Call of the Wild Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.0
Date: 2025-09-01
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//const USER_HOME = util.getVortexPath("home");
const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const STEAMAPP_ID = "518790";
const EPICAPP_ID = "4f0c34d469bb47b2bcf5b377f47ccfe3";
const GOGAPP_ID = null;
const XBOXAPP_ID = "AvalancheStudios.theHunterCalloftheWild-Windows10";
const XBOXEXECNAME = "Game";
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID, XBOXAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_ID = "thehuntercallofthewild";
const GAME_NAME = "theHunter: Call of the Wild";
const GAME_NAME_SHORT = "theHunter: CotW";
const EXEC = "theHunterCotW_F.exe";
const EXEC_EGS = EXEC;
const EXEC_XBOX = 'gamelaunchhelper.exe';
const CONFIGMOD_LOCATION = DOCUMENTS;
const CONFIG_FOLDERNAME = 'theHunter Call of the Wild';
const SAVEMOD_LOCATION = DOCUMENTS;
const SAVE_FOLDERNAME = 'COTW';
const EGS_FILE = 'versions.Paris-RC-Final.txt';

let GAME_PATH = null;
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

const DROPZONE_ID = `${GAME_ID}-dropzonefolder`;
const DROPZONE_NAME = "Dropzone Folder";
const DROPZONE_PATH = ".";
//const MOD_PATH_XBOX = MOD_PATH;
const DROPZONE_FOLDER = "dropzone";

let CONFIG_PATH = null;
let SAVE_PATH = null;
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_FOLDER = path.join(CONFIGMOD_LOCATION, 'Avalanche Studios');

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save Data File";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, 'Avalanche Studios');
let USERID_FOLDER = "";
const SAVE_STRINGS = [
  "found_icons_",
  "animal_population_",
];
const SAVE_FILES = [
  "found_icons_0",
  "found_icons_1",
  "found_icons_2",
  "found_icons_3",
  "found_icons_4",
  "found_icons_5",
  "found_icons_6",
  "found_icons_7",
  "found_icons_8",
  "found_icons_9",
  "found_icons_10",
  "found_icons_11",
  "found_icons_12",
  "found_icons_13",
  "found_icons_14",
  "found_icons_15",
  "found_icons_16",
  "found_icons_17",
  "found_icons_18",
  "found_icons_19",
  "animal_population_0",
  "animal_population_1",
  "animal_population_2",
  "animal_population_3",
  "animal_population_4",
  "animal_population_5",
  "animal_population_6",
  "animal_population_7",
  "animal_population_8",
  "animal_population_9",
  "animal_population_10",
  "animal_population_11",
  "animal_population_12",
  "animal_population_13",
  "animal_population_14",
  "animal_population_15",
  "animal_population_16",
  "animal_population_17",
  "animal_population_18",
  "animal_population_19",
];

const APCGUI_ID = `${GAME_ID}-apcguide`;
const APCGUI_NAME = "Animal Population Changer GUI";
const APCGUI_EXEC = path.join('apcgui', 'apcgui.exe');

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = 'archives_win64';
const PARAMETERS = ['--vfs-fs dropzone --vfs-archive patch_win64 --vfs-archive archives_win64 --vfs-archive dlc_win64 --vfs-fs'];

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      //"supportsSymlinks": false,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": DROPZONE_ID,
      "name": DROPZONE_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${DROPZONE_PATH}`
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  /*{
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
  {
    id: APCGUI_ID,
    name: APCGUI_NAME,
    logo: 'apcgui.png',
    executable: () => APCGUI_EXEC,
    requiredFiles: [
      APCGUI_EXEC,
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

//Get mod path dynamically for different game versions
function getModPath(gamePath) {
  GAME_VERSION = setGameVersion(gamePath);
  if (GAME_VERSION === 'xbox') {
    return MOD_PATH_XBOX;
  }
  else {
    return MOD_PATH;
  }
} //*/

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

async function requiresLauncher(gamePath, store) {
  if (store === 'xbox' && (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID))) {
      return Promise.resolve({
          launcher: 'xbox',
          addInfo: {
              appId: XBOXAPP_ID,
              parameters: [{ appExecName: XBOXEXECNAME }],
          },
      });
  } //*/
  if (store === 'epic' && (DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID))) {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  /*
  if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    return EXEC_XBOX;
  } else {
    return EXEC;
  };
}

//Get correct game version
function setGameVersion(gamePath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(gamePath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    CONFIG_PATH = path.join(CONFIG_FOLDER, 'Microsoft Store', CONFIG_FOLDERNAME, 'Saves', 'settings');
    SAVE_PATH = path.join(SAVE_FOLDER, 'Microsoft Store', SAVE_FOLDERNAME, 'Saves');
    try {
      const SAVE_ARRAY = fs.readdirSync(SAVE_PATH);
      USERID_FOLDER = SAVE_ARRAY.find((element) => 
        ((/[a-z]/i.test(element) === false))
      );
    } catch(err) {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    } //*/
    SAVE_PATH = path.join(SAVE_PATH, USERID_FOLDER);
    return GAME_VERSION;
  };
  if (isCorrectExec(EGS_FILE)) {
    GAME_VERSION = 'epic';
    CONFIG_PATH = path.join(CONFIG_FOLDER, 'Epic Games Store', CONFIG_FOLDERNAME, 'Saves');
    SAVE_PATH = path.join(SAVE_FOLDER, 'Epic Games Store', SAVE_FOLDERNAME, 'Saves');
    try {
      const SAVE_ARRAY = fs.readdirSync(SAVE_PATH);
      USERID_FOLDER = SAVE_ARRAY.find((element) => 
        ((/[a-z]/i.test(element) === false))
      );
    } catch(err) {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    } //*/
    SAVE_PATH = path.join(SAVE_PATH, USERID_FOLDER);
    return GAME_VERSION;
  };
  if (isCorrectExec(EXEC)) {
    GAME_VERSION = 'steam';
    CONFIG_PATH = path.join(CONFIG_FOLDER, '', CONFIG_FOLDERNAME, 'Saves');
    SAVE_PATH = path.join(SAVE_FOLDER, '', SAVE_FOLDERNAME, 'Saves');
    try {
      const SAVE_ARRAY = fs.readdirSync(SAVE_PATH);
      USERID_FOLDER = SAVE_ARRAY.find((element) => 
        ((/[a-z]/i.test(element) === false))
      );
    } catch(err) {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    } //*/
    SAVE_PATH = path.join(SAVE_PATH, USERID_FOLDER);
    return GAME_VERSION;
  };
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for dropzone folder
function testDropzone(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === DROPZONE_FOLDER));
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

//Install dropzone folder
function installDropzone(files) {
  const MOD_TYPE = DROPZONE_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === DROPZONE_FOLDER));
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

//Test for save files
function testSave(files, gameId) {
  const isMod = files.some(file => (SAVE_FILES.includes(path.basename(file).toLowerCase())));
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

//Install save files
function installSave(files) {
  const MOD_TYPE = SAVE_ID;
  const modFile = files.find(file => (SAVE_FILES.includes(path.basename(file).toLowerCase())));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    (
      SAVE_FILES.includes(path.basename(file).toLowerCase())
      //(file.indexOf(rootPath) !== -1)
      //&& (!file.endsWith(path.sep))
    )
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
      //destination: file,
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
  GAME_VERSION = setGameVersion(GAME_PATH);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  return fs.ensureDirWritableAsync(path.join(GAME_PATH, DROPZONE_FOLDER));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    //executable: () => gameSpec.game.executable,
    executable: getExecutable,
    parameters: PARAMETERS,
    queryModPath: makeGetModPath(context.api, gameSpec),
    //queryModPath: getModPath,
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    //getGameVersion: resolveGameVersion,
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

  //register mod types explicitly
    /*context.registerModType(CONFIG_ID, 60, 
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, 
      (game) => pathPattern(context.api, game, CONFIG_PATH), 
      () => Promise.resolve(false), 
      { name: CONFIG_NAME }
    ); //*/
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
  context.registerInstaller(DROPZONE_ID, 25, testDropzone, installDropzone);
  //context.registerInstaller(CONFIG_ID, 48, testConfig, installConfig);
  context.registerInstaller(SAVE_ID, 49, testSave, installSave);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Data Folder', () => {
    const openPath = SAVE_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = CONFIG_PATH;
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
