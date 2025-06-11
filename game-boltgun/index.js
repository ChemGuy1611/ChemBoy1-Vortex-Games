/*
Name: WH40K Boltgun Vortex Extension
Structure: UE4 (Basic)
Author: ChemBoy1
Version: 0.3.0
Date: 08/05/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all information about the game
const STEAMAPP_ID = "2005010";
const EPICAPP_ID = "";
const GOGAPP_ID = "2028053392";
const XBOXAPP_ID = "FocusHomeInteractiveSA.Boltgun-Windows";
const XBOXEXECNAME = "AppWarhammer40000BoltgunShipping";
const GAME_ID = "warhammer40000boltgun";
const GAME_NAME = "Warhammer 40,000: Boltgun";
const GAME_NAME_SHORT = "Boltgun";
const EPIC_CODE_NAME = "Boltgun";

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  gog: [{ id: GOGAPP_ID }],
  //epic: [{ id: EPICAPP_ID }],
  xbox: [{ id: XBOXAPP_ID }],
};

let MOD_PATH = "Boltgun\\Content\\Paks";
let EXEC_TARGET = null;
const requiredFiles = [];
const STEAM_EXEC_FOLDER = "Win64";
const GOG_EXEC_FOLDER = "Win64";
const EPIC_EXEC_FOLDER = "Win64";
const XBOX_EXEC_FOLDER = "WinGDK";
const STEAM_EXEC= `${EPIC_CODE_NAME}\\Binaries\\${STEAM_EXEC_FOLDER}\\${EPIC_CODE_NAME}-${STEAM_EXEC_FOLDER}-Shipping.exe`;
const GOG_EXEC= `${EPIC_CODE_NAME}\\Binaries\\${GOG_EXEC_FOLDER}\\${EPIC_CODE_NAME}-${GOG_EXEC_FOLDER}-Shipping.exe`;
const EPIC_EXEC = `${EPIC_CODE_NAME}\\Binaries\\${EPIC_EXEC_FOLDER}\\${EPIC_CODE_NAME}-${EPIC_EXEC_FOLDER}-Shipping.exe`; //Need to confirm for Epic
const XBOX_EXEC = `${EPIC_CODE_NAME}\\Binaries\\${XBOX_EXEC_FOLDER}\\${EPIC_CODE_NAME}-${XBOX_EXEC_FOLDER}-Shipping.exe`;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_PATH = "{gamePath}";
const ROOT_FILE = "Boltgun";
const ROOT_IDX = `${ROOT_FILE}\\`;
const ROOT_NAME = "Root Game Folder";
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "details": {
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "nexusPageId": GAME_ID
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
};

//3rd party tools and launchers
const tools = [
  
];

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
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
      localAppData: process.env['LOCALAPPDATA'],
      appData: util.getVortexPath('appData'),
    });
  }
  catch(err){
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

async function requiresLauncher(gamePath, store) {

  if (store === 'xbox') {
      return Promise.resolve({
          launcher: 'xbox',
          addInfo: {
              appId: XBOXAPP_ID,
              parameters: [{ appExecName: XBOXEXECNAME }],
          },
      });
  }

  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  }
  
  return Promise.resolve(undefined);
}

//Get the executable and add to required files
function getExecutable(discoveryPath) {

  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      requiredFiles.push(exec);
      return true;
    }
    catch (err) {
      return false;
    }
  };

  if (isCorrectExec(XBOX_EXEC)) {
    EXEC_TARGET = `{gamePath}\\${EPIC_CODE_NAME}\\Binaries\\${XBOX_EXEC_FOLDER}`;
    return XBOX_EXEC;
  };

  if (isCorrectExec(STEAM_EXEC)) {
    EXEC_TARGET = `{gamePath}\\${EPIC_CODE_NAME}\\Binaries\\${STEAM_EXEC_FOLDER}`;
    return STEAM_EXEC;
  };

  if (isCorrectExec(EPIC_EXEC)) {
    EXEC_TARGET = `{gamePath}\\${EPIC_CODE_NAME}\\Binaries\\${EPIC_EXEC_FOLDER}`;
    return EPIC_EXEC;
  };

  if (isCorrectExec(GOG_EXEC)) {
    EXEC_TARGET = `{gamePath}\\${EPIC_CODE_NAME}\\Binaries\\${GOG_EXEC_FOLDER}`;
    return GOG_EXEC;
  };

  return STEAM_EXEC;
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  //const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === ROOT_FILE);
  const isMod = files.some(file => path.basename(file) === ROOT_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installRoot(files) {
  //const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === ROOT_FILE);
  const modFile = files.find(file => path.basename(file) === ROOT_FILE);
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

//Setup function
async function setup(discovery, api, gameSpec) {
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    requiresCleanup: true,
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: () => MOD_PATH,
    requiredFiles,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
    requiresLauncher: requiresLauncher,
  };
  context.registerGame(game);

  //register mod types
  context.registerModType(ROOT_ID, 25, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, ROOT_PATH), 
    () => Promise.resolve(false), 
    { name: ROOT_NAME }
  );
  context.registerModType(BINARIES_ID, 30, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, EXEC_TARGET), 
    () => Promise.resolve(false), 
    { name: BINARIES_NAME }
  );

  //register mod installers
  context.registerInstaller(`${GAME_ID}-root`, 25, testRoot, installRoot);
}

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
