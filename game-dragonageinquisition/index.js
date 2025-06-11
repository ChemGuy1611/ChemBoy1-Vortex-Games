/*
Name: Dragon Age Inquisition Vortex Extension
Structure: 3rd-Party Mod Manager (Frosty)
Author: ChemBoy1
Version: 0.2.3
Date: 01/17/2025
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

const EAAPP_ID = "";
const EPICAPP_ID = "verdi";
const STEAMAPP_ID = "1222690";
const GAME_ID = "dragonageinquisition";
const GAME_NAME = "Dragon Age: Inquisition";
const GAME_NAME_SHORT = "Dragon Age: Inquisition";
const EXEC = "DragonAgeInquisition.exe";

const FROSTY_FOLDER = "dragonageinquisition";

//definitions for mod types, installers, and tools
const BINARIES_ID = `${GAME_ID}-binaries`;

const FROSTY_ID = `${GAME_ID}-frostymanager`;
const DAI_ID = `${GAME_ID}-daimanager`;

const DAIMOD_ID = `${GAME_ID}-daimod`;
const daiModFileExt = ".daimod";
const DAI_PATH = "DAIMod";

const FROSTYMOD_ID = `${GAME_ID}-frostymod`;
const modFileExt = ".fbmod";
const FROSTY_PATH = path.join("FrostyModManager", "Mods", FROSTY_FOLDER);

const FROSTY_EXEC = 'frostymodmanager.exe';
const DAI_EXEC = 'daimodmanager.exe';

const DOCUMENTS = util.getVortexPath('documents');
const CONFIG_ID = `${GAME_ID}-configsave`;
const CONFIG_PATH = path.join(DOCUMENTS, "BioWare", "Dragon Age Inquisition", "Save");
const SAVE_EXT = ".das";
const CONFIG_FILE = "ProfileOptions_profile";

const UPDATE_ID = `${GAME_ID}-update`;
const UPDATE_PATH = "Update";

const FROSTYPLUGIN_ID = `${GAME_ID}-frostyplugin`;
const FROSTYPLUGIN_PATH = path.join("FrostyModManager", "Plugins");

//Specify all the information about the game
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
      "epicAppId": EPICAPP_ID,
      //"EAAppId": EAAPP_ID,
      "nexusPageId": GAME_ID
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      //"EAAPPId": EAAPP_ID
    }
  },
  "modTypes": [
    {
      "id": BINARIES_ID,
      "name": "Binaries / Root Game Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": FROSTYMOD_ID,
      "name": "Frosty Mod .fbmod",
      "priority": "high",
      "targetPath": `{gamePath}\\${FROSTY_PATH}`
    },
    {
      "id": DAIMOD_ID,
      "name": "DAIMod .daimod",
      "priority": "high",
      "targetPath": `{gamePath}\\${DAI_PATH}`
    },
    {
      "id": CONFIG_ID,
      "name": "Config / Save File",
      "priority": "high",
      "targetPath": CONFIG_PATH
    },
    {
      "id": FROSTYPLUGIN_ID,
      "name": "Frosty Plugin",
      "priority": "high",
      "targetPath": `{gamePath}\\${FROSTYPLUGIN_PATH}`
    },
    {
      "id": UPDATE_ID,
      "name": "Update Folder",
      "priority": "high",
      "targetPath": `{gamePath}\\${UPDATE_PATH}`
    },
    {
      "id": DAI_ID,
      "name": "DAI Mod Manager",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": FROSTY_ID,
      "name": "Frosty Mod Manager",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
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
  },
  {
    id: 'DAIModManager',
    name: 'DAI Mod Manager',
    logo: 'DAIMod.png',
    executable: () => DAI_EXEC,
    requiredFiles: [
      DAI_EXEC
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
      'SOFTWARE\\WOW6432Node\\BioWare\\Dragon Age Inquisition',
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

/*
//Set launcher requirements
function makeRequiresLauncher(api, gameSpec) {

  if (util.epicGamesLauncher.isGameInstalled(EPICAPP_ID)) {
    return () => Promise.resolve({
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    });
  }

  return undefined;
}
*/

//Setup launcher requirements (Steam, Epic, GOG, GamePass, etc.). More parameters required for Epic and GamePass
async function requiresLauncher(gamePath, store) {

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

//Check if mod injector is installed
function isFrostyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === FROSTY_ID);
}

//Check if mod injector is installed
function isDAIInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === DAI_ID);
}

//Function to auto-download Frosty Mod Manager
async function downloadFrosty(discovery, api, gameSpec) {
  let modLoaderInstalled = isFrostyInstalled(api, gameSpec);

  if (!modLoaderInstalled) {
    //notification indicating install process
    const NOTIF_ID = 'dragonageinquisition-frosty-installing';
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
        actions.setModType(gameSpec.game.id, modId, FROSTY_ID), // Set the modType
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

//Function to auto-download DAI Mod Manager
async function downloadDAIMod(discovery, api, gameSpec) {
  let modLoaderInstalled = isDAIInstalled(api, gameSpec);

  if (!modLoaderInstalled) {
    //notification indicating install process
    const NOTIF_ID = 'dragonageinquisition-dai-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing DAI Mod Manager',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'DAI Mod Manager',
      };
      const URL = `https://www.dropbox.com/s/9mhd5ovig3bjoxs/ModManager%20(x64)%201.0.0.59.zip?e=1&dl=1`;
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
        actions.setModType(gameSpec.game.id, modId, DAI_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.dropbox.com/s/9mhd5ovig3bjoxs/ModManager%20(x64)%201.0.0.59.zip?e=1&dl=0`;
      api.showErrorNotification('Failed to download/install DAI Mod Manager', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  api.sendNotification({
    id: 'setup-notification-dragonageinquisition',
    type: 'warning',
    message: 'DAI Mod Manager Setup Required.',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'The DAI Mod Manager tool downloaded by this extension requires setup.\n'
                + 'Please launch the tool and set the "Mod Path" to: "[RootGameFolder]\\DAIMod".\n'
                + '\n'
                + 'You should also make a backup of the "[RootGameFolder]\\Updates\\Patch" folder before using the "Merge" button to merge mods into the game in case you need to revert.\n'
                + 'After merging in DAI Mod Manger, you need to rename the "Updates\\Patch_ModManagerMerge" folder to just "Patch" (delete existing Patch folder).\n'
                + '\n'
                + 'It is also highly recommended you watch the video linked below to understand how to install DAI Mods (.daimod files) together with Frosty Mods (.fbmod files).'
          }, [
            { label: 'Continue', action: () => dismiss() },
            { label: 'Watch Instruction Video', action: () => {
              util.opn('https://www.youtube.com/watch?v=TiXuixE8vr0').catch(err => undefined);
              dismiss();
          }},
          ]);
        },
      },
    ],
  });    
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for Frosty Manager files
function testFrosty(files, gameId) {
  const isFrosty = files.some(file => path.basename(file).toLocaleLowerCase() === FROSTY_EXEC);
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
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === FROSTY_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FROSTY_ID };

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

//Test for Frosty Manager files
function testDAI(files, gameId) {
  // Make sure we're able to support this mod.
  const isDAI = files.some(file => path.basename(file).toLocaleLowerCase() === DAI_EXEC);
  let supported = (gameId === spec.game.id) && isDAI;

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
function installDAI(files) {
  // The .fbmod file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === DAI_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DAI_ID };

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

//Test for .fbmod files
function testFrostyMod(files, gameId) {
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
function installFrostyMod(files) {
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

//Test for .daimod files
function testDaiMod(files, gameId) {
  // Make sure we're able to support this mod.
  const isMod = files.find(file => path.extname(file).toLowerCase() === daiModFileExt) !== undefined;
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

//Install .daimod files
function installDaiMod(files) {
  // The .daimod file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === daiModFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DAIMOD_ID };

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

//Test for config files
function testConfig(files, gameId) {
  // Make sure we're able to support this mod.
  const isConfig = files.some(file => path.basename(file) === CONFIG_FILE);
  let supported = (gameId === spec.game.id) && isConfig;

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

//Install config files
function installConfig(files) {
  // The config file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.basename(file) === CONFIG_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((!file.endsWith(path.sep)))
    //((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
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

//Test for save files
function testSave(files, gameId) {
  // Make sure we're able to support this mod.
  const isSave = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT) !== undefined;
  let supported = (gameId === spec.game.id) && isSave;

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

//Install save files
function installSave(files) {
  // The save file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

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
  await downloadFrosty(discovery, api, gameSpec);
  await downloadDAIMod(discovery, api, gameSpec);
  setupNotify(api);
  await fs.ensureDirWritableAsync(path.join(discovery.path, DAI_PATH));
  await fs.ensureDirWritableAsync(path.join(CONFIG_PATH));
  await fs.ensureDirWritableAsync(path.join(discovery.path, UPDATE_PATH));
  await fs.ensureDirWritableAsync(path.join(discovery.path, FROSTYPLUGIN_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, FROSTY_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    //requiresLauncher: makeRequiresLauncher(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
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
  context.registerInstaller('dragonageinquisition-daimodmanager', 25, testDAI, installDAI);
  context.registerInstaller('dragonageinquisition-frostymodmanager', 30, testFrosty, installFrosty);
  context.registerInstaller('dragonageinquisition-fbmod', 35, testFrostyMod, installFrostyMod);
  context.registerInstaller('dragonageinquisition-daimod', 45, testDaiMod, installDaiMod);
  context.registerInstaller('dragonageinquisition-config', 50, testConfig, installConfig);
  context.registerInstaller('dragonageinquisition-save', 55, testSave, installSave);
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
