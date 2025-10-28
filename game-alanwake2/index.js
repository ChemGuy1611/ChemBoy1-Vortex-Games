/*
Name: Alan Wake 2 Vortex Extension
Structure: Root Folder Mod Loader
Author: ChemBoy1
Version: 1.1.3
Date: 07/23/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const turbowalk = require('turbowalk');

//Specify all information about the game
const EPICAPP_ID = "dc9d2e595d0e4650b35d659f90d41059";
const GAME_ID = "alanwake2";
const EXEC = "AlanWake2.exe";
const MODLOADER_ID = "alanwake2-modloader";
const MODLOADER_FILE = "version.dll";
const RMDTOC_EXEC = "alan wake 2 rmdtoc tool.exe";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": "Alan Wake 2",
    "executable": EXEC,
    "logo": "alanwake2.jpg",
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "epicAppId": EPICAPP_ID,
    },
    "environment": {
      "EpicAPPId": EPICAPP_ID,
    },
    "requiresLauncher": "epic"
  },
  "modTypes": [
    {
      "id": MODLOADER_ID,
      "name": "Mod Loader",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      EPICAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: "RMDTOCTool",
    name: "RMDTOC Tool",
    logo: "rmdtoc.png",
    executable: () => RMDTOC_EXEC,
    //parameters: [],
    requiredFiles: [RMDTOC_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
  /*
  {
    id: "AlanWake2",
    name: "Alan Wake 2",
    logo: "icon.png",
    executable: () => EXEC,
    parameters: [
       '-EpicPortal',
    ],
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    defaultPrimary: true,
    isPrimary: true,
  },
  */
];

//Set mod type priorities
function modTypePriority(priority) {
    return {
        high: 25,
        low: 75,
    }[priority];
}

//replace path placeholders with actual values
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
    ? { 
      launcher: gameSpec.game.requiresLauncher,
      addInfo: {
        appId: EPICAPP_ID,
      }
      }
    : undefined);
}

//Check if Mod Loader is installed
function isModLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MODLOADER_ID);
}

//Function to auto-download Mod Loader
async function downloadModLoader(api, gameSpec) {
  let modLoaderInstalled = isModLoaderInstalled(api, gameSpec);
  if (!modLoaderInstalled) {
    NOTIF_ID = 'alanwake2-modloader-installing';
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: 'Installing Alan Wake 2 Mod Loader',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }

    const modPageId = 19;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled('No Alan Wake 2 Mod Loader main file found');
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'Alan Wake 2 Mod Loader',
      };
      const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [nxmUrl], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), spec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, MODLOADER_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification('Failed to download/install Alan Wake 2 Mod Loader', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Installer test for Fluffy Mod Manager files
function testModLoader(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === MODLOADER_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installModLoader(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === MODLOADER_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODLOADER_ID };

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
  await downloadModLoader(api, gameSpec)
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
  context.registerInstaller(`${GAME_ID}-modloader`, 25, testModLoader, installModLoader);
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
