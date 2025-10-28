/*
Name: A Plague Tale Requiem Vortex Extension
Structure: Basic Game (XBOX Integrated)
Author: ChemBoy1
Version: 1.2.0
Date: 08/02/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all information about the game
const STEAMAPP_ID = "1182900";
const EPICAPP_ID = ""; // not on egdata.app yet
const GOGAPP_ID = "1552771812";
const XBOXAPP_ID = "FocusHomeInteractiveSA.APlagueTaleRequiem-Windows";
const XBOXEXECNAME = "Game";
const GAME_ID = "aplaguetalerequiem";
const GAME_NAME = "A Plague Tale: Requiem";
const GAME_NAME_SHORT = "A Plague Tale: Requiem";
const MOD_PATH = ".";
const COMMON_FILE = path.join('DATAS', 'P_AMICIA.DPC');

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  gog: [{ id: GOGAPP_ID }],
  //epic: [{ id: EPICAPP_ID }],
  xbox: [{ id: XBOXAPP_ID }],
};

//Information for setting the executable and variable paths based on the game store version
const requiredFiles = [COMMON_FILE];
const EXEC = "APlagueTaleRequiem_x64.exe";
const EPIC_EXEC = "APlagueTaleRequiem_x64.exe";
const XBOX_EXEC = "APT2_WinStore.x64.Submission.exe";

//This information will be filled in from the data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "details": {
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [

  ],
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

//Set mod path
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
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
      return true;
    }
    catch (err) {
      return false;
    }
  };

  if (isCorrectExec(XBOX_EXEC)) {
    return XBOX_EXEC;
  };

  if (isCorrectExec(EXEC)) {
    return EXEC;
  };
  /*
  if (isCorrectExec(EPIC_EXEC)) {
    return EPIC_EXEC;
  }; //*/
  return EXEC;
}

//Send notification for Reshade
function reshadeNotify(api) {
  api.sendNotification({
    id: 'reshade-notification-aplaguetalerequiem',
    type: 'warning',
    message: 'Reshade mod may be required.',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'A Plague Tale: Requiem requires Reshades for most mods available on Nexus Mods.\n'
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
    requiresCleanup: true,
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: () => gameSpec.game.modPath,
    requiredFiles,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
    requiresLauncher: requiresLauncher,
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
