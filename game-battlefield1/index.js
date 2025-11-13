/*
Name: Battlefield 1 Vortex Extension
Author: ChemBoy1
Version: 0.2.2
Date: 09/13/2024
*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//Specify all the information about the game
const EAAPP_ID = "";
const STEAMAPP_ID = "1238840";
const GAME_ID = "battlefield1";
const EXEC = "bf1.exe";
const BINARIES_ID = "battlefield1-binaries";
const FROSTY_EXEC = 'frostymodmanager.exe';

const FROSTYMOD_ID = `${GAME_ID}-frostymod`;
const modFileExt = ".fbmod";
const FROSTY_PATH = "FrostyModManager\\Mods\\bf1";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": "Battlefield 1",
    "executable": EXEC,
    "logo": "battlefield1.jpg",
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      //"EAAppId": EAAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"EAAPPId": EAAPP_ID
    }
  },
  "modTypes": [
    {
      "id": BINARIES_ID,
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": FROSTYMOD_ID,
      "name": "Frosty .fbmod",
      "priority": "high",
      "targetPath": `{gamePath}\\${FROSTY_PATH}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EAAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  ///*
  {
    id: 'FrostyModManagerLaunch',
    name: 'Launch Modded Game',
    logo: 'executable.png',
    executable: () => FROSTY_EXEC,
    requiredFiles: [
      FROSTY_EXEC,
    ],
    relative: true,
    exclusive: true,
    parameters: [
        '-launch Default',
    ],
    defaultPrimary: true,
    isPrimary: true,
  },
  //*/
  {
    id: 'FrostyModManager',
    name: 'Frosty Mod Manager',
    logo: 'frosty.png',
    executable: () => FROSTY_EXEC,
    requiredFiles: [
      FROSTY_EXEC,
    ],
    relative: true,
    exclusive: true,
  }
  
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
      'Software\\Wow6432Node\\EA Games\\Battlefield 1',
        'Install Dir');
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

//Check if mod injector is installed
function isFrostyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === BINARIES_ID);
}

//Function to auto-download Frosty Mod Manager
async function downloadFrosty(discovery, api, gameSpec) {
  let modLoaderInstalled = isFrostyInstalled(api, gameSpec);

  if (!modLoaderInstalled) {
    //notification indicating install process
    const NOTIF_ID = 'battlefield1-frosty-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing Frosty Mod Manager',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'Frosty Mod Manager',
      };
      const URL = `https://github.com/CadeEvs/FrostyToolsuite/releases/download/v1.0.6.3/FrostyModManager.zip`;
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
        actions.setModType(gameSpec.game.id, modId, BINARIES_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://github.com/CadeEvs/FrostyToolsuite/releases/tag/v1.0.6.3`;
      api.showErrorNotification('Failed to download/install Frosty Mod Manager', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Test for Frosty Manager files
function testFrosty(files, gameId) {
  // Make sure we're able to support this mod.
  const isFrosty = files.some(file => path.basename(file).toLowerCase() === FROSTY_EXEC);
  let supported = (gameId === spec.game.id) && isFrosty;

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

//Install Frosty Manager files
function installFrosty(files) {
  // The .fbmod file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.basename(file).toLowerCase() === FROSTY_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join("FrostyModManager", file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for .fbmod files
function testFbmod(files, gameId) {
  // Make sure we're able to support this mod.
  const isMod = files.find(file => path.extname(file).toLowerCase() === modFileExt) !== undefined;
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

//Install .fbmod files
function installFbmod(files) {
  // The .fbmod file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === modFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FROSTYMOD_ID };

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
  await downloadFrosty(discovery, api, gameSpec)
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
  context.registerInstaller('masseffectandromeda-frostymodmanager', 25, testFrosty, installFrosty);
  context.registerInstaller('masseffectandromeda-fbmod', 30, testFbmod, installFbmod);
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
