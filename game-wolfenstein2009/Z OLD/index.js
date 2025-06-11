/*
Name: Wolfenstein (2009) Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.0
Date: 07/29/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//Specify all the information about the game
const STEAMAPP_ID = "10170";
const GAME_ID = "wolfenstein2009";
const GAME_NAME = "Wolfenstein (2009)";
const GAME_NAME_SHORT = "Wolfenstein";
const EXEC = "SP\\Wolf2.exe";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": "SP",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "nexusPageId": GAME_ID
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": `${GAME_ID}-root`,
      "name": "Root Game Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": `${GAME_ID}-mp`,
      "name": "MultiPlayer Folder",
      "priority": "high",
      "targetPath": "{gamePath}\\MP"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: 'LaunchGame',
    name: 'Launch Game',
    logo: 'executable.png',
    executable: () => EXEC,
    requiredFiles: [
      EXEC,
    ],
    relative: true,
    exclusive: true,
    parameters: [
        '+set com_allowconsole 1 +set com_skipIntro 1 +set com_SingleDeclFile 0 +set sys_lang "english"',
    ],
    defaultPrimary: true,
    isPrimary: true,
  },
];

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
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Find the game installation folder
function makeFindGame(api, gameSpec) {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      `SOFTWARE\\WOW6432Node\\Activision\\Wolfenstein`,
        'InstallPath');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return () => Promise.resolve(instPath.value);
  } catch (err) {
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  }
}
//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Setup launcher requirements (Steam, Epic, GOG, GamePass, etc.). More parameters required for Epic and GamePass
function makeRequiresLauncher(api, gameSpec) {
  return () => Promise.resolve((gameSpec.game.requiresLauncher !== undefined)
    ? { launcher: gameSpec.game.requiresLauncher }
    : undefined);
}

//Setup function
async function setup(discovery, api, gameSpec) {
  return fs.ensureDirWritableAsync(path.join(discovery.path, gameSpec.game.modPath));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: makeRequiresLauncher(context.api, gameSpec),
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
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

  //register mod installers

}

//main function
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
