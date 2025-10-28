/*
Name: AC Odyssey Vortex Extension
Structure: Ubisoft AnvilToolkit
Author: ChemBoy1
Version: 0.2.1
Date: 07/31/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//Specify all the information about the game
const UPLAYAPP_ID = "5059";
const STEAMAPP_ID = "812140";
const GAME_ID = "assassinscreedodyssey";
const EXEC = "ACOdyssey.exe";
const modFileExt = ".dds";
const forgerModFileExt = ".forger2";
const TEXTURE_ID = "assassinscreedodyssey-textures";
const ATK_ID = "assassinscreedodyssey-ATK";
const ATK_EXEC = 'anviltoolkit.exe';
const FORGER_ID = "assassinscreedodyssey-forger";
const FORGER_EXEC = 'forger.exe';
const PATCH_ID = "assassinscreedodyssey-forgerpatch";

const userDocsValue = util.getVortexPath('documents');
const userDocsPathString = userDocsValue.replace(/x00s/g, '');
const ddsModPath = path.join(userDocsPathString, "Resorep", "modded");

const spec = {
  "game": {
    "id": GAME_ID,
    "name": "Assassin's Creed Odyssey",
    "executable": EXEC,
    "logo": "assassinscreedodyssey.jpg",
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "uPlayAppId": UPLAYAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "UPlayAPPId": UPLAYAPP_ID
    }
  },
  "modTypes": [
    {
      "id": "assassinscreedodyssey-binaries",
      "name": "Binaries / Root Game Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": PATCH_ID,
      "name": "Forger Patch",
      "priority": "high",
      "targetPath": "{gamePath}\\ForgerPatches"
    },
    {
      "id": TEXTURE_ID,
      "name": "Resorep Textures (Documents)",
      "priority": "high",
      "targetPath": ddsModPath
    },
    {
      "id": "assassinscreedodyssey-texturesgamefolder",
      "name": "Resorep Textures (Game Folder)",
      "priority": "high",
      "targetPath": "{gamePath}\\Resorep"
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
    const MOD_NAME = "AnvilToolkit";
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
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
      //const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //Download the mod
      const dlInfo = {
        game: 'site',
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://site/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
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
      //const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
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
    const NOTIF_ID = 'assassinscreedodyssey-forger-installing';
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
function resorepNotify(api) {
  api.sendNotification({
    id: 'resorep-notification-assassinscreedodyssey',
    type: 'warning',
    message: 'Resorep May Be Required.',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'Some of the most popular mods for AC Odyssey require a software called Resorep.\n'
                + 'You need to make an account to download the software at the link below. \n'
                + 'Be sure to read the instructions on mod pages to determine if you need Resorep for that mod.'
          }, [
            { label: 'Continue', action: () => dismiss() },
            { label: 'Download Resorep', action: () => {
              util.opn('https://www.undertow.club/downloads/resorep.1254/').catch(err => undefined);
              dismiss();
          }},
          ]);
        },
      },
    ],
  });    
}

//Test for .dds files
function testSupportedContent(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === spec.game.id) && 
      (files.find(file => path.extname(file).toLowerCase() === modFileExt) !== undefined);

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

//Install .dds files
function installContent(files) {
  // The .dds file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === modFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const MODTYPE_ID = TEXTURE_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MODTYPE_ID };
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
      ((file.indexOf(rootPath) !== -1) &&
          (!file.endsWith(path.sep))));

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
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
      ((file.indexOf(rootPath) !== -1) &&
          (!file.endsWith(path.sep))));

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

//Installer test for Fluffy Mod Manager files
function testATK(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === ATK_EXEC);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installATK(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === ATK_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ATK_ID };

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
  resorepNotify(api);
  await fs.ensureDirWritableAsync(ddsModPath);
  await fs.ensureDirWritableAsync(path.join(discovery.path, "Resorep"));
  //await fs.ensureDirWritableAsync(path.join(discovery.path, "ForgerPatchManger"));
  await fs.ensureDirWritableAsync(path.join(discovery.path, "ForgerPatches"));
  await downloadAnvil(discovery, api, gameSpec);
  await downloadForger(discovery, api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(discovery.path));
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
  //context.registerInstaller('assassinscreedodyssey-dds', 25, testSupportedContent, installContent);
  context.registerInstaller('assassinscreedodyssey-forger', 25, forgerTestSupportedContent, forgerInstallContent);
  context.registerInstaller(`${GAME_ID}-atk`, 25, testATK, installATK);
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
