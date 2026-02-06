/*/////////////////////////////////////////////////////
Name: Civilization VI Vortex Extension
Structure: User Folder Mod Location
Author: ChemBoy1
Version: 0.1.3
Date: 2025-07-31
/////////////////////////////////////////////////////*/

//import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const winapi = require('winapi-bindings'); //gives access to the Windows registry

//Specify all the information about the game
const STEAMAPP_ID = "289070";
const EPICAPP_ID = "Kinglet";
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const GAME_ID = "civilisationvi";
const EXEC = path.join("Base" , "Binaries", "Win64Steam", "CivilizationVI.exe");
const EXEC_EPIC = path.join("Base" , "Binaries", "Win64EOS", "CivilizationVI.exe");
const GAME_NAME = "Sid Meier's Civilization VI";
const GAME_NAME_SHORT = "Civ VI";
let GAME_PATH = '';
let MOD_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Info for mod types and installers
const DOCUMENTS = util.getVortexPath("documents");
const MOD_PATH_STEAM = path.join(DOCUMENTS, 'My Games', 'Sid Meier\'s Civilization VI', 'Mods');
const MOD_PATH_EPIC = path.join(DOCUMENTS, 'My Games', 'Sid Meier\'s Civilization VI (Epic)', 'Mods');
const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Mod";
const MOD_EXT = '.modinfo';

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";
const ROOT_FOLDER = "Base";

const DXLAUNCH_ID = `${GAME_ID}-dxlaunch`;
const DXLAUNCH_NAME = "DX12 Launch";
const EXEC_DX = path.join("Base" , "Binaries", "Win64Steam", "CivilizationVI_DX12.exe");

const REQ_FILE = `Base`;

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "requiredFiles": [
      REQ_FILE,
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
    },
    "environment": {
      "SteamAPPId": +STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
      //XBOXAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: DXLAUNCH_ID,
    name: DXLAUNCH_NAME,
    logo: `exec.png`,
    executable: () => EXEC_DX,
    requiredFiles: [EXEC_DX],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    //parameters: []
  },
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 30,
    low: 75,
  }[priority];
}

//Convert path placeholders to actual values
function pathPattern(api, game, pattern) {
  try{
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch(err){
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

async function requiresLauncher(gamePath, store) {
  /*if (store === 'xbox') {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  } //*/
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable, add to required files, set paths for mod types
function getExecutable(api) {
  GAME_PATH = getDiscoveryPath(api);
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(GAME_PATH, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC)) {
    GAME_VERSION = 'steam';
    MOD_PATH = MOD_PATH_STEAM;
    return EXEC;
  };
  if (isCorrectExec(EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    MOD_PATH = MOD_PATH_EPIC;
    return EXEC_EPIC;
  };
  return EXEC;
}

//Get correct mod folder (Epic folder is different)
function getModPath(api) {
  GAME_PATH = getDiscoveryPath(api);
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(GAME_PATH, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC)) {
    GAME_VERSION = 'steam';
    MOD_PATH = MOD_PATH_STEAM;
    return MOD_PATH;
  };
  if (isCorrectExec(EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    MOD_PATH = MOD_PATH_EPIC;
    return MOD_PATH;
  };
  return MOD_PATH_STEAM;
}

const getDiscoveryPath = (api) => {
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for mod files
function testMod(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === MOD_EXT));
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

//Installer install mod files
function installMod(files, fileName) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === MOD_EXT));
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_ID };
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  }

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
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

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  await fs.ensureDirWritableAsync(GAME_PATH);
  return fs.ensureDirWritableAsync(MOD_PATH);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: () => getExecutable(context.api),
    queryModPath: () => getModPath(context.api),
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

  //register mod types explicitly
    context.registerModType(MOD_ID, 25,
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      },
      (game) => pathPattern(context.api, game, MOD_PATH),
      () => Promise.resolve(false),
      { name: MOD_NAME }
    );

  //register mod installers
  context.registerInstaller(MOD_ID, 25, testMod, installMod);
  context.registerInstaller(ROOT_ID, 30, testRoot, installRoot);

  //register actions
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

//Main function
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
