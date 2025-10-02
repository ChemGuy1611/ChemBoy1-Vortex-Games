/*
Name: Resident Evil 4 CHAINSAW DEMO Vortex Extension
Author: ChemBoy1
Version: 0.1.1
Date: 06/21/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const Bluebird = require('bluebird');

//Specify all information about the game
const STEAM_APP_ID = "2231770";
const GAME_ID = "residentevil42023demo";
const EXEC = "re4demo.exe";
const REF_ID = "re4demo-reframework";
const FLUFFY_ID = "re4demo-fluffymodmanager";
const FLUFFY_EXEC = "modmanager.exe";
const REF_FILE = "dinput8.dll"

const spec = {
  "game": {
    "id": GAME_ID,
    "name": "Resident Evil 4 (2023) - Chainsaw Demo",
    "shortName": "RE4 Demo",
    "executable": EXEC,
    "logo": "residentevil42023.jpg",
    "mergeMods": true,
    "modPath": "Games\\RE4R_Demo\\Mods",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAM_APP_ID,
    },
    "environment": {
      "SteamAPPId": STEAM_APP_ID,
      "nexusPageId": "residentevil42023"
    }
  },
  "modTypes": [
    {
      "id": "re4demo-root",
      "name": "Binaries / Game Root Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": FLUFFY_ID,
      "name": "Fluffy Mod Manager",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": REF_ID,
      "name": "REFramework",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAM_APP_ID
    ],
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: "FluffyModManager",
    name: "Fluffy Mod Manager",
    logo: "fluffy.png",
    executable: () => FLUFFY_EXEC,
    requiredFiles: [FLUFFY_EXEC],
    detach: true,
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

//Replace string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Find game installation directory
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

//Check if Fluffy Mod Manager is installed
function isFluffyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === FLUFFY_ID);
}

//Check if REFramework is installed
function isREFInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === REF_ID);
}

//Function to auto-download Fluffy Mod Manager
async function downloadFluffy(api, gameSpec) {
  let modLoaderInstalled = isFluffyInstalled(api, gameSpec);

  if (!modLoaderInstalled) {
    //notification indicating install process
    NOTIF_ID = 're4-fluffy-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing Fluffy Mod Manager',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }

    const modPageId = 818;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles('site', modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled('No Fluffy Mod Manager main file found');
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'Fluffy Mod Manager',
      };
      const nxmUrl = `nxm://site/mods/${modPageId}/files/${file.file_id}`;
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
        actions.setModType(gameSpec.game.id, modId, FLUFFY_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/site/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification('Failed to download/install Flufy Mod Manager', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download REFramework from Github
async function downloadREFramework(api, gameSpec) {
  let modLoaderInstalled = isREFInstalled(api, gameSpec);
  
  if (!modLoaderInstalled) {
    //notification indicating install process
    NOTIF_ID = 're4-REFramework-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing REFramework',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    //make sure user is logged into Nexus Mods account in Vortex

    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'REFramework',
      };
      const URL = `https://github.com/praydog/REFramework/releases/download/v.1.5.6/RE4.zip`;
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
        actions.setModType(gameSpec.game.id, modId, REF_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification('Failed to download/install REFramework', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

/*
//Function to auto-download REFramework from Nexus Mods <-- This function gave an error when getting the file upload time, for some reason ????
async function downloadREFramework(api, gameSpec) {
  let modLoaderInstalled = isREFInstalled(api, gameSpec);
  
  if (!modLoaderInstalled) {
    //notification indicating install process
    NOTIF_ID = 're4-REFramework-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing REFramework',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }

    const modPageId = 12;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled('No REFramework main file found');
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'REFramework',
      };
      const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
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
        actions.setModType(gameSpec.game.id, modId, REF_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification('Failed to download/install REFramework', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}
*/

//Notify User of Setup instructions
function setupNotify(api) {
  api.sendNotification({
    id: 'setup-notification-re4demo',
    type: 'warning',
    message: 'Mod Installation and Setup Instructions',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: () => {
          api.showDialog('question', 'Action required', {
            text: 'You must use Fluffy Mod Manager to enable mods after installing with Vortex.\n'
                + 'Use the included tool to launch Fluffy Mod Manger (at top of window or in "Dashboard" tab).\n'
                + 'If your mod is not for Fluffy, you must extract the zip file in the staging folder and change the mod type to "Binaries / Root Game Folder".\n'
          }, [
            { label: 'Acknowledge', action: (dismiss) => dismiss() },
          ]);
        },
      },
    ],
  });    
}

//test for zips
async function testZipContent(files, gameId) {
  const isFluffy = files.some(file => path.basename(file).toLocaleLowerCase() === FLUFFY_EXEC);
  const isREF = files.some(file => path.basename(file).toLocaleLowerCase() === REF_FILE);
  return Promise.resolve({
    supported: (gameId === spec.game.id) && !isFluffy && !isREF,
    requiredFiles: []
  });
}

//install zips
async function installZipContent(files, destinationPath) {
  const zipFiles = files.filter(file => ['.zip', '.7z', '.rar'].includes(path.extname(file)));
  // If it's a double zip, we don't need to repack. 
  if (zipFiles.length > 0) {
    const instructions = zipFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file),
      }
    });
    return Promise.resolve({ instructions });
  }
  // Repack the ZIP
  else {
    const szip = new util.SevenZip();
    const archiveName = path.basename(destinationPath, '.installing') + '.zip';
    const archivePath = path.join(destinationPath, archiveName);
    const rootRelPaths = await fs.readdirAsync(destinationPath);
    await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
    const instructions = [{
      type: 'copy',
      source: archiveName,
      destination: path.basename(archivePath),
    }];
    return Promise.resolve({ instructions });
  }
}

//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

//Setup function
async function setup(discovery, api, gameSpec) {
  setupNotify(api);
  //Download core mods
  await downloadFluffy(api, gameSpec);
  await downloadREFramework(api, gameSpec);
  //check Fluffy Mod Manager mod path writable
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
  context.registerInstaller('re4-mods', 25, toBlue(testZipContent), toBlue(installZipContent));
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
