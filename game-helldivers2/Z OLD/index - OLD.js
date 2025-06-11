/*
Name: Helldivers 2 Vortex Extension
Structure: Custom Game Data
Author: ChemBoy1
Version: 0.4.0
Date: 09/18/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all info about the game
const STEAMAPP_ID = "553850";
const GAME_ID = "helldivers2";
const GAME_NAME = "Helldivers 2";
const GAME_NAME_SHORT = "Helldivers 2"; 
const EXEC = "bin\\helldivers2.exe";

//Info for mod types and installers
const DATA_ID = `${GAME_ID}-data`;
const DATA_PATH = path.join("data", "game");
const modFileExt = ".dl_bin";

const PATCH_ID = `${GAME_ID}-patch`;
const PATCH_PATH = path.join("data");
const patchModFileExt = ".patch_0";
//const patchModFileExt = [".patch_0", ".patch_0.gpu_resources", ".patch_0.stream"];

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_PATH = path.join("bin");

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
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
      "SteamAPPId": STEAMAPP_ID,
    },
    "requiresLauncher": "steam"
  },
  "modTypes": [
    {
      "id": DATA_ID,
      "name": "Game Data (.dl_bin)",
      "priority": "high",
      "targetPath": `{gamePath}\\${DATA_PATH}`
    },
    {
      "id": PATCH_ID,
      "name": "Game Data Patch (.patch)",
      "priority": "high",
      "targetPath": `{gamePath}\\${PATCH_PATH}`
    },
    {
      "id": BINARIES_ID,
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": `{gamePath}\\${BINARIES_PATH}`
    },
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

//Convert path placeholders to actual path values
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Find game install location
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

//Test for .dl_bin files
function testDlbin(files, gameId) {
  let supported = (gameId === spec.game.id) && (files.find(file => path.extname(file).toLowerCase() === modFileExt) !== undefined);

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

//Install .dl_bin files
function installDlbin(files, gameSpec) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === modFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATA_ID };

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

//Test for .patch files
function testPatch(files, gameId) {
  let supported = (gameId === spec.game.id) && (files.find(file => path.extname(file).toLowerCase() === patchModFileExt) !== undefined);

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

//Install .patch files
function installPatch(files, gameSpec) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === patchModFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PATCH_ID };

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

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  api.sendNotification({
    id: 'setup-notification-helldivers2',
    type: 'warning',
    message: '.patch0 Files Management',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'If you are using multiple ".patch0" type mods, you need to rename files manually in the staging folder to resolve conflicts. \n'
                + 'Right click on the mod in the modlist and select "Open in File Manager" option. You can then change the file extensions. \n'
          }, [
            { label: 'Continue', action: () => dismiss() },
          ]);
        },
      },
    ],
  });    
}

//Setup function
async function setup(discovery, api, gameSpec) {
  setupNotify(api);
  return fs.ensureDirWritableAsync(path.join(discovery.path, DATA_PATH));
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
  context.registerInstaller(`${GAME_ID}-dlbin`, 25, testDlbin, installDlbin);
  context.registerInstaller(`${GAME_ID}-patch`, 50, testPatch, installPatch);
}

//Main Function
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
