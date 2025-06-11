/*
Name: Hades II Vortex Extension
Structure: 3rd-Party Mod Installer
Author: ChemBoy1
Version: 0.1.2
Date: 01/14/2025
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const STEAMAPP_ID = "1145350";
const EPICAPP_ID = "";
const GAME_ID = "hades2";
const GAME_NAME = "Hades II"
const EXEC = "Ship\\Hades2.exe";
//const EXEC_VK = "Ship\\Hades2.exe";
//const EXEC_XBOX = "Ship\\Hades2.exe";

const MODUTIL_URL = 'https://github.com/SGG-Modding/ModUtil/releases/download/2.10.1/SGG_Modding-ModUtil-2.10.1.zip';

//Data for mod types, tools, and installers
const MOD_PATH = path.join("Content", "Mods");
const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = `Mod`;
const MOD_EXTS = [".lua"];

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = `Binaries`;
const BINARIES_PATH = path.join("Ship");

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = `Root Game Folder`;

const MANAGER_ID = `${GAME_ID}-manager`;
const MANAGER_NAME = `Mod Importer`;
const MANAGER_PATH = path.join("Content");
const MANAGER_EXEC = "modimporter.exe";

const UTILITY_ID = `${GAME_ID}-modutility`;
const UTILITY_NAME = `Mod Utility`;
const UTILITY_PATH = path.join(MOD_PATH, 'ModUtil');
const UTILITY_FILE = "modutil.lua";
//const UTILITY_FILE = "ModUtil";
//const UTILITY_IDX = `${UTILITY_FILE}\\`;

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
      "nexusPageId": GAME_ID,
      "supportsSymlinks": false,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MOD_PATH}`
    },
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${BINARIES_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": MANAGER_ID,
      "name": MANAGER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${MANAGER_PATH}`
    },
    //*
    {
      "id": UTILITY_ID,
      "name": UTILITY_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${UTILITY_PATH}`
    },
    //*/
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: "HadesModImporter",
    name: "Mod Importer",
    logo: "modimporter.png",
    executable: () => MANAGER_EXEC,
    requiredFiles: [MANAGER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
  },
  /*
  {
    id: "VulkanExecutable",
    name: "Vulkan Launch",
    logo: "exec.png",
    executable: () => EXEC_VK,
    requiredFiles: [EXEC_VK],
    detach: true,
    relative: true,
    exclusive: true,
  },
  //*/
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

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game information by API utility
async function queryGame() {
  let game = await util.GameStoreHelper.findByAppId(spec.discovery.ids);
  return game;
}

//Find game install location 
async function queryPath() {
  let game = await queryGame();
  return game.gamePath;
}

//Set launcher requirements
async function requiresLauncher() {
  let game = await queryGame();

  if (game.gameStoreId === "steam") {
    return undefined;
  }

  /*
  if (game.gameStoreId === "epic") {
    return {
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    };
  }
  //*/
  return undefined;
}

//Check if mod injector is installed
function isModManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MANAGER_ID);
}

//Function to auto-download Mod Loader
async function downloadModManager(api, gameSpec) {
  let isInstalled = isModManagerInstalled(api, gameSpec);

  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = MANAGER_NAME;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const MOD_TYPE = MANAGER_ID;
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

    const modPageId = 1;
    const FILE_ID = 2;
    try {
      //get the mod files information from Nexus
      /*
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = () => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //*/
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
      const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${FILE_ID}`;
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Check if mod injector is installed
function isModUtilityInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === UTILITY_ID);
}

//Function to auto-download Mod Loader
async function downloadModUtility(api, gameSpec) {
  let isInstalled = isModUtilityInstalled(api, gameSpec);

  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = UTILITY_NAME;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const MOD_TYPE = UTILITY_ID;
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

    //const modPageId = 27;
    //const FILE_ID = 568;
    try {
      //get the mod files information from Nexus
      /*
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = () => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //*/
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${FILE_ID}`;
      const nxmUrl = MODUTIL_URL;
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      //const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      const errPage = `https://github.com/SGG-Modding/ModUtil/releases/tag/2.10.1`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Installer test for Mod Importer
function testModManger(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === MANAGER_EXEC);
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer
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

//Installer install Mod Importer
function installModManager(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === MANAGER_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MANAGER_ID };

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

//Installer test for Mod Importer
function testModUtility(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === UTILITY_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer
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

//Installer install Mod Importer
function installModUtility(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === UTILITY_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UTILITY_ID };

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

//Installer test for mod files
function testMod(files, gameId) {
  const isMod = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer
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

//Installer install mod files
function installMod(files,fileName) {
  const modFile = files.find(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_ID };
  const MOD_NAME = path.basename(fileName);
  const MOD_FOLDER = MOD_NAME.replace(/[\-]*[\d]*[\.]*(installing)*/gi, '');

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);

  return Promise.resolve({ instructions });
}

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  const NOTIF_ID = `setup-notification-${GAME_ID}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: 'Mod Importer Required',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Mod Importer Must Be Run', {
            text: 'The Mod Importer tool downloaded by this extension must be run every time new mods are installed.\n'
                + 'Please launch the tool from the Dashboard tab every time you install new mods.\n'
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
            {
              label: 'Never Show Again', action: () => {
                api.suppressNotification(NOTIF_ID);
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });    
}

//Setup function
async function setup(discovery, api, gameSpec) {
  setupNotify(api);
  await downloadModManager(api, gameSpec);
  await fs.ensureDirWritableAsync(path.join(discovery.path, UTILITY_PATH));
  await downloadModUtility(api, gameSpec);
  await fs.ensureDirWritableAsync(path.join(discovery.path, BINARIES_PATH));
  //await fs.ensureDirWritableAsync(path.join(discovery.path, BINARIESVK_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher,
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
  context.registerInstaller(MANAGER_ID, 25, testModManger, installModManager);
  context.registerInstaller(UTILITY_ID, 30, testModUtility, installModUtility);
  //context.registerInstaller(MOD_ID, 35, testMod, installMod);
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
