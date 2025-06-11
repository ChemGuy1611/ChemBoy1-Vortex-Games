/*
Name: Warhammer Vermintide 2 Vortex Extension
Author: ChemBoy1
Version: 1.0.5
Date: 07/31/2024
*/

//Import libraries
const { actions, fs, util } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all information about the game
const STEAMAPP_ID = "552500";
const GAME_ID = "vermintide2";
const EXEC = "launcher\\Launcher.exe";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": "Warhammer - Vermintide 2",
    "shortName": "Vermintide 2",
    "executable": EXEC,
    "logo": "vermintide2.jpg",
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "nexusPageId": GAME_ID
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID
    }
  },
  "modTypes": [
    {
      "id": "vermintide2-binaries",
      "name": "Binaries",
      "priority": "high",
      "targetPath": "{gamePath}\\binaries",
    },
    {
      "id": "vermintide2-binariesdx12",
      "name": "Binaries DX12",
      "priority": "high",
      "targetPath": "{gamePath}\\binaries_dx12",
    }
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID
    ],
    "names": []
  }
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
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Find game installation location
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set mod path
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Set launcher requirements
function makeRequiresLauncher(api, gameSpec) {
  return () => Promise.resolve((gameSpec.game.requiresLauncher !== undefined)
    ? { launcher: gameSpec.game.requiresLauncher }
    : undefined);
}

//Setup function to send notification for Reshade
function reshadeNotify(api) {
  api.sendNotification({
    id: 'reshade-notification-vermintide2',
    type: 'warning',
    message: 'Reshade mod may be required.',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'Vermintide 2 requires Reshades for most mods available on Nexus Mods.\n'
                + 'Please use the button below to download and install Reshade\n'
                + 'if you haven\'t already and plan to use those mods.'
          }, [
            { label: 'Continue', action: () => dismiss() },
            { label: 'Download Reshade', action: () => {
                util.opn('https://www.reshade.me/').catch(err => undefined);
                dismiss();
            }},
          ]);
        },
      },
    ],
  });    
}

//Setup function
async function setup(discovery, api, gameSpec){
  reshadeNotify(api);
  return fs.ensureDirWritableAsync(path.join(discovery.path, gameSpec.game.modPath));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: makeRequiresLauncher(context.api, gameSpec),
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    supportedTools: tools
  };
  context.registerGame(game);

  //register Mod Types
  (gameSpec.modTypes || []).forEach((type, idx) => {
    // Loop through each mod type in gameSpec.modTypes array
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      //type.path = path.join(discovery.path, type.path);
      // Return a boolean indicating whether the modification type should be applied to the game with gameId
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod installers

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