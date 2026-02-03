/*
Name: AC Valhalla Vortex Extension
Author: ChemBoy1
Version: 0.1.3
Date: 07/31/2024
*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//Specify all the information about the game
const UPLAYAPP_ID = "13504";
const STEAMAPP_ID = "2208920";
const GAME_ID = "assassinscreedvalhalla";
const EXEC = "ACValhalla.exe";
const ATK_ID = "assassinscreedvalhalla-ATK";
const ATK_EXEC = 'AnvilToolkit.exe';
const FORGER_ID = "assassinscreedvalhalla-forger";
const FORGER_EXEC = 'Forger.exe';
const forgerModFileExt = ".forger2";
const PATCH_ID = "assassinscreedvalhalla-forgerpatch";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": "Assassin's Creed Valhalla",
    "shortName": "AC Valhalla",
    "executable": EXEC,
    "logo": "assassinscreedvalhalla.jpg",
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "uPlayAppId": UPLAYAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "UPlayAPPId": UPLAYAPP_ID
    }
  },
  "modTypes": [
    {
      "id": PATCH_ID,
      "name": "Forger Patch",
      "priority": "high",
      "targetPath": path.join("{gamePath}", "ForgerPatches")
    },
    {
      "id": ATK_ID,
      "name": "AnvilToolKit",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": FORGER_ID,
      "name": "Forger Patch Manager",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //UPLAYAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  /*
  {
    id: 'AnvilToolkit',
    name: 'AnvilToolkit',
    logo: 'anvil.png',
    executable: () => ATK_EXEC,
    requiredFiles: [
      ATK_EXEC,
    ],
    relative: true,
    exclusive: true,
  },
  */
  {
    id: 'ForgerPatchManager',
    name: 'Forger Patch Manager',
    logo: 'forger.png',
    executable: () => FORGER_EXEC,
    requiredFiles: [
      FORGER_EXEC,
    ],
    relative: true,
    exclusive: true,
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
      `SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\${UPLAYAPP_ID}`,
        'InstallDir');
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

//Check if AnvilToolkit is installed
function isAnvilInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === ATK_ID);
}

//Check if Forger Patch Manager is installed
function isForgerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === FORGER_ID);
}

//Function to auto-download AnvilToolkit
async function downloadAnvil(discovery, api, gameSpec) {
  let modLoaderInstalled = isAnvilInstalled(api, gameSpec);

  if (!modLoaderInstalled) {
    //notification indicating install process
    const NOTIF_ID = 'assassinscreedvalhalla-anvil-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing AnvilToolkit',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }

    const modPageId = 455;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles('site', modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled('No AnvilToolkit main file found');
      }
      //Download the mod
      const dlInfo = {
        game: 'site',
        name: 'AnvilToolkit',
      };
      const nxmUrl = `nxm://$site/mods/${modPageId}/files/${file.file_id}`;
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [nxmUrl], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, ATK_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download/install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/site/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification('Failed to download/install AnvilToolkit', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download Forger Patch Manager
async function downloadForger(discovery, api, gameSpec) {
  let modLoaderInstalled = isForgerInstalled(api, gameSpec);

  if (!modLoaderInstalled) {
    //notification indicating install process
    const NOTIF_ID = 'assassinscreedvalhalla-forger-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing Forger Patch Manager',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }

    const gameId = "assassinscreedodyssey";
    const modPageId = 42;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameId, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled('No Forger Patch Manager main file found');
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'Forger Patch Manager',
      };
      const nxmUrl = `nxm://${gameId}/mods/${modPageId}/files/${file.file_id}`;
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [nxmUrl], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, FORGER_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download/install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameId}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification('Failed to download/install Forger Patch Manager', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Notify User of ResoRep
function setupNotify(api) {
  api.sendNotification({
    id: 'setup-notification-assassinscreedvalhalla',
    type: 'warning',
    message: 'Forger Setup Required',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'Some of the most popular mods for AC Valhalla require a software called Forger Patch Manager.\n'
                + 'This software has been automatically downloaded and installed for you by the extension. \n'
                + 'You need to run the tool on the Dashboard to apply the patches to the game files.'
          }, [
            { label: 'Continue', action: () => dismiss() },
          ]);
        },
      },
    ],
  });    
}

//Test for .forger2 files
function forgerTestSupportedContent(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === spec.game.id) && 
      (files.find(file => path.extname(file).toLowerCase() === forgerModFileExt) !== undefined);

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

//Install .forger2 files
function forgerInstallContent(files) {
  // The .forger2 file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === forgerModFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const MODTYPE_ID = PATCH_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MODTYPE_ID };
  ///*
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep))));
  //*/
  /*
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1)));
  */
  const instructions = filtered.map(file => {
  //const instructions = files.map(file => {
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
  setupNotify(api);
  //await downloadAnvil(discovery, api, gameSpec);
  await downloadForger(discovery, api, gameSpec);
  //await fs.ensureDirWritableAsync(path.join(discovery.path, "Forger"));
  return fs.ensureDirWritableAsync(path.join(discovery.path, "ForgerPatches"));
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
  context.registerInstaller('assassinscreedvalhalla-forger', 25, forgerTestSupportedContent, forgerInstallContent);
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
