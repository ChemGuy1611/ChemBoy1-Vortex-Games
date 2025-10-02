/*
Name: NINJA GAIDEN: Master Collection Vortex Extension
Structure: Multi-Game, Mod Loader
Author: ChemBoy1
Version: 0.1.2
Date: 02/03/2025
*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all information that`s the same for all 3 games
const GAME_ID = "ninjagaidenmastercollection";
const GAME_NAME = "NINJA GAIDEN: Master Collection";
const GAME_NAME_SHORT = "NINJA GAIDEN: MC";
const MODLOADER_STEAM_FILE = "dbghelp.dll";
const XBOX_EXEC = "gamelaunchhelper.exe";
let GAME_STORE = "";

//Game information for all 3 games we're adding ///////////////////////////////////////////////////

// For NGS1
const STEAMAPP_ID1 = "1580780";
const XBOXAPP_ID1 = "946B6A6E.NINJAGAIDENSIGMA";
const XBOX_EXECNAME1 = "Game";
const GAME_ID1 = "ninjagaidensigma";
const EXEC1 = "ninja gaiden sigma.exe";
const GAME_NAME1 = "NINJA GAIDEN Sigma";
const GAME_NAME_SHORT1 = "NINJA GAIDEN Sigma";
const MOD_PATH_DEFAULT1 = '.';

const gameFinderQuery1 = {
  steam: [{ id: STEAMAPP_ID1, prefer: 0 }],
  xbox: [{ id: XBOXAPP_ID1 }],
};

const MODLOADER_STEAM_ID1 = `${GAME_ID1}-steammodloader`;
const MODLOADER_STEAM_NAME1 = "Essential Files for NGS1";
const ML_STEAM_PAGE1 = 240;
const ML_STEAM_FILE1 = 1172;
const ML_STEAM_EXEC1 = EXEC1;

const DATABINSUB_ID1 = `${GAME_ID}-databinsubfolder1`;
const DATABINSUB_FOLDERS1 = ["bgm", "movie"];

// For NGS2
const STEAMAPP_ID2 = "1580790";
const XBOXAPP_ID2 = "946B6A6E.NINJAGAIDENSIGMA2";
const XBOX_EXECNAME2 = "Game";
const GAME_ID2 = "ninjagaidensigma2";
const EXEC2 = "ninja gaiden sigma2.exe";
const GAME_NAME2 = "NINJA GAIDEN Sigma 2";
const GAME_NAME_SHORT2 = "NINJA GAIDEN Sigma 2";
const MOD_PATH_DEFAULT2 = '.';

const gameFinderQuery2 = {
  steam: [{ id: STEAMAPP_ID2, prefer: 0 }],
  xbox: [{ id: XBOXAPP_ID2 }],
};

const MODLOADER_STEAM_ID2 = `${GAME_ID2}-steammodloader`;
const MODLOADER_STEAM_NAME2 = "Essential Files for NGS2";
const ML_STEAM_PAGE2 = 241;
const ML_STEAM_FILE2 = 1197;
const ML_STEAM_EXEC2 = EXEC2;

const DATABINSUB_ID23 = `${GAME_ID}-databinsubfolder23`;
const DATABINSUB_FOLDERS23 = ["sound", "movie"];

// For NG3RE
const STEAMAPP_ID3 = "1369760";
const XBOXAPP_ID3 = "946B6A6E.NINJAGAIDEN3RazorsEdge";
const XBOX_EXECNAME3 = "Game";
const GAME_ID3 = "ninjagaiden3razorsedge";
const EXEC3 = "ninja gaiden 3 razor's edge.exe";
const GAME_NAME3 = "NINJA GAIDEN 3 Razor's Edge";
const GAME_NAME_SHORT3 = "NINJA GAIDEN 3 RE";
const MOD_PATH_DEFAULT3 = '.';

const gameFinderQuery3 = {
  steam: [{ id: STEAMAPP_ID3, prefer: 0 }],
  xbox: [{ id: XBOXAPP_ID3 }],
};

const MODLOADER_STEAM_ID3 = `${GAME_ID3}-steammodloader`;
const MODLOADER_STEAM_NAME3 = "Essential Files for NG3RE";
const ML_STEAM_PAGE3 = 243;
const ML_STEAM_FILE3 = 1213;
const ML_STEAM_EXEC3 = EXEC3;

// Common installer info (same for all 3 games) ///////////////////////////////////////////////////

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";

const MODLOADER_XBOX_ID = `${GAME_ID}-xboxmodloader`;
const MODLOADER_XBOX_NAME = "Tmx_NgLoader (Mods Loader)";
const MODLOADER_XBOX_EXEC = "tmx_ngloader.exe";
const ML_XBOX_PAGE = 34;
const ML_XBOX_FILE = 444;

const MLMOD_ID = `${GAME_ID}-mlmod`;
const MLMOD_NAME = "Mod Loader Mod";
const MLMOD_FOLDER = "mods";
const MLMOD_PATH = `${MLMOD_FOLDER}`;
const MLMOD_EXT = '.dat';

const DATABIN_ID = `${GAME_ID}-databinfolder`;
const DATABIN_NAME = "Databin Folder";
const DATABIN_FOLDER = "databin";

const DATABINSUB_NAME = "Databin Subfolder";
const DATABINSUB_PATH = `${DATABIN_FOLDER}`;

// gameSpec data for all 3 games ///////////////////////////////////////////////////

//Filled in from data above - for NGS1
const spec1 = {
  "game": {
    "id": GAME_ID1,
    "name": GAME_NAME1,
    "shortName": GAME_NAME_SHORT1,
    "executable": EXEC1,
    "logo": `${GAME_ID1}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH_DEFAULT1,
    "requiredFiles": [
      EXEC1,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID1,
      "xboxAppId": XBOXAPP_ID1,
      "nexusPageId": GAME_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID1,
      "XboxAPPId": XBOXAPP_ID1,
    }
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": MLMOD_ID,
      "name": MLMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MLMOD_PATH}`
    },
    {
      "id": DATABIN_ID,
      "name": DATABIN_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": DATABINSUB_ID1,
      "name": DATABINSUB_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${DATABINSUB_PATH}`
    },
    {
      "id": MODLOADER_XBOX_ID,
      "name": MODLOADER_XBOX_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": MODLOADER_STEAM_ID1,
      "name": MODLOADER_STEAM_NAME1,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
};

//Filled in from data above - for NGS2
const spec2 = {
  "game": {
    "id": GAME_ID2,
    "name": GAME_NAME2,
    "shortName": GAME_NAME_SHORT2,
    "executable": EXEC2,
    "logo": `${GAME_ID2}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH_DEFAULT2,
    "requiredFiles": [
      EXEC2,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID2,
      "xboxAppId": XBOXAPP_ID2,
      "nexusPageId": GAME_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID2,
      "XboxAPPId": XBOXAPP_ID2,
    }
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": MLMOD_ID,
      "name": MLMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MLMOD_PATH}`
    },
    {
      "id": DATABIN_ID,
      "name": DATABIN_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": DATABINSUB_ID23,
      "name": DATABINSUB_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${DATABINSUB_PATH}`
    },
    {
      "id": MODLOADER_XBOX_ID,
      "name": MODLOADER_XBOX_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": MODLOADER_STEAM_ID2,
      "name": MODLOADER_STEAM_NAME2,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
};

//Filled in from data above - for NG3RE
const spec3 = {
  "game": {
    "id": GAME_ID3,
    "name": GAME_NAME3,
    "shortName": GAME_NAME_SHORT3,
    "executable": EXEC3,
    "logo": `${GAME_ID3}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH_DEFAULT3,
    "requiredFiles": [
      EXEC3,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID3,
      "xboxAppId": XBOXAPP_ID3,
      "nexusPageId": GAME_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID3,
      "XboxAPPId": XBOXAPP_ID3,
    }
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": MLMOD_ID,
      "name": MLMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MLMOD_PATH}`
    },
    {
      "id": DATABIN_ID,
      "name": DATABIN_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": DATABINSUB_ID23,
      "name": DATABINSUB_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${DATABINSUB_PATH}`
    },
    {
      "id": MODLOADER_XBOX_ID,
      "name": MODLOADER_XBOX_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": MODLOADER_STEAM_ID3,
      "name": MODLOADER_STEAM_NAME3,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
};

//launchers and 3rd party tools - same for all 3 games
const tools = [
  {
    id: MODLOADER_XBOX_ID,
    name: MODLOADER_XBOX_NAME,
    logo: "modloader.png",
    executable: () => MODLOADER_XBOX_EXEC,
    requiredFiles: [MODLOADER_XBOX_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
  },
];

//Set mod type priorities - same for all 3 games
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace string placeholders with actual folder paths - same for all 3 games
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Set launcher requirements - for NGS1
async function requiresLauncher1(gamePath, store) { 

  if (store === 'xbox') {
      return Promise.resolve({
          launcher: 'xbox',
          addInfo: {
              appId: XBOXAPP_ID1,
              parameters: [{ appExecName: XBOX_EXECNAME1 }],
          },
      });
  }

  return Promise.resolve(undefined);
}

//Set launcher requirements - for NGS2
async function requiresLauncher2(gamePath, store) { 

  if (store === 'xbox') {
      return Promise.resolve({
          launcher: 'xbox',
          addInfo: {
              appId: XBOXAPP_ID2,
              parameters: [{ appExecName: XBOX_EXECNAME2 }],
          },
      });
  }

  return Promise.resolve(undefined);
}

//Set launcher requirements - for NG3RE
async function requiresLauncher3(gamePath, store) { 

  if (store === 'xbox') {
      return Promise.resolve({
          launcher: 'xbox',
          addInfo: {
              appId: XBOXAPP_ID3,
              parameters: [{ appExecName: XBOX_EXECNAME3 }],
          },
      });
  }

  return Promise.resolve(undefined);
}

// AUTO-DOWNLOAD FUNCTIONS ///////////////////////////////////////////////////

//Check if Xbox Mod Loader is installed - same for all 3 games
function isMlXboxInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MODLOADER_XBOX_ID);
}

//Check if Steam Mod Loader is installed - for NGS1
function isMlSteamInstalled1(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MODLOADER_STEAM_ID1);
}

//Check if Steam Mod Loader is installed - for NGS2
function isMlSteamInstalled2(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MODLOADER_STEAM_ID2);
}

//Check if Steam Mod Loader is installed - for NG3RE
function isMlSteamInstalled3(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MODLOADER_STEAM_ID3);
}

//Function to auto-download Xbox Mod Loader from Nexus Mods - same for all 3 games
async function downloadMlXbox(api, gameSpec) {
  let isInstalled = isMlXboxInstalled(api, gameSpec);
  
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = MODLOADER_XBOX_NAME;
    const NOTIF_ID = `${GAME_NAME}-${MOD_NAME}-installing`;
    const MOD_TYPE = MODLOADER_XBOX_ID;
    const modPageId = ML_XBOX_PAGE;
    const FILE_ID = ML_XBOX_FILE;  //Using a specific file id if "input" below gives an error 
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

    try {
      //get the mod files information from Nexus
      //*
      const modFiles = await api.ext.nexusGetModFiles(GAME_ID, modPageId);
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
        game: GAME_ID,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${GAME_ID}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${GAME_ID}/mods/${modPageId}/files/${FILE_ID}`;
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
      const errPage = `https://www.nexusmods.com/${GAME_ID}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download Steam Mod Loader from Nexus Mods - for NGS1
async function downloadMlSteam1(api, gameSpec) {
  let isInstalled = isMlSteamInstalled1(api, gameSpec);
  
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = MODLOADER_STEAM_NAME1;
    const NOTIF_ID = `${GAME_NAME1}-${MOD_NAME}-installing`;
    const MOD_TYPE = MODLOADER_STEAM_ID1;
    const modPageId = ML_STEAM_PAGE1;
    //const FILE_ID = ML_XBOX_FILE;  //Using a specific file id if "input" below gives an error 
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

    try {
      //get the mod files information from Nexus
      ///*
      const modFiles = await api.ext.nexusGetModFiles(GAME_ID, modPageId);
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
        game: GAME_ID,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${GAME_ID}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${FILE_ID}`;
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
      const errPage = `https://www.nexusmods.com/${GAME_ID}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download Steam Mod Loader from Nexus Mods - for NGS2
async function downloadMlSteam2(api, gameSpec) {
  let isInstalled = isMlSteamInstalled2(api, gameSpec);
  
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = MODLOADER_STEAM_NAME2;
    const NOTIF_ID = `${GAME_NAME2}-${MOD_NAME}-installing`;
    const MOD_TYPE = MODLOADER_STEAM_ID2;
    const modPageId = ML_STEAM_PAGE2;
    //const FILE_ID = ML_XBOX_FILE;  //Using a specific file id if "input" below gives an error 
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

    try {
      //get the mod files information from Nexus
      ///*
      const modFiles = await api.ext.nexusGetModFiles(GAME_ID, modPageId);
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
        game: GAME_ID,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${GAME_ID}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${FILE_ID}`;
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
      const errPage = `https://www.nexusmods.com/${GAME_ID}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download Steam Mod Loader from Nexus Mods - for NG3RE
async function downloadMlSteam3(api, gameSpec) {
  let isInstalled = isMlSteamInstalled3(api, gameSpec);
  
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = MODLOADER_STEAM_NAME3;
    const NOTIF_ID = `${GAME_NAME3}-${MOD_NAME}-installing`;
    const MOD_TYPE = MODLOADER_STEAM_ID3;
    const modPageId = ML_STEAM_PAGE3;
    //const FILE_ID = ML_XBOX_FILE;  //Using a specific file id if "input" below gives an error 
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

    try {
      //get the mod files information from Nexus
      ///*
      const modFiles = await api.ext.nexusGetModFiles(GAME_ID, modPageId);
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
        game: GAME_ID,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${GAME_ID}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${FILE_ID}`;
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
      const errPage = `https://www.nexusmods.com/${GAME_ID}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// MOD INSTALLER FUNCTIONS (same for all 3 games) ///////////////////////////////////////////////////

//Installer test for Xbox Mod Loader
function testModLoaderXbox(files, gameId) {
  const isMl = files.some(file => path.basename(file).toLocaleLowerCase() === MODLOADER_XBOX_EXEC);
  let supported = (gameId === (spec1.game.id || spec2.game.id || spec3.game.id)) && isMl;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Xbox Mod Loader
function installModLoaderXbox(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === MODLOADER_XBOX_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODLOADER_XBOX_ID };

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

//Installer test for Steam Mod Loader - for NGS1
function testModLoaderSteam1(files, gameId) {
  const isMl = files.some(file => path.basename(file).toLocaleLowerCase() === ML_STEAM_EXEC1);
  let supported = (gameId === spec1.game.id) && isMl;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Steam Mod Loader - for NGS1
function installModLoaderSteam1(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === ML_STEAM_EXEC1);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODLOADER_STEAM_ID1 };

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

//Installer test for Steam Mod Loader - for NGS2
function testModLoaderSteam2(files, gameId) {
  const isMl = files.some(file => path.basename(file).toLocaleLowerCase() === ML_STEAM_EXEC2);
  let supported = (gameId === spec2.game.id) && isMl;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Steam Mod Loader - for NGS2
function installModLoaderSteam2(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === ML_STEAM_EXEC2);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODLOADER_STEAM_ID2 };

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

//Installer test for Steam Mod Loader - for NG3RE
function testModLoaderSteam3(files, gameId) {
  const isMl = files.some(file => path.basename(file).toLocaleLowerCase() === ML_STEAM_EXEC3);
  let supported = (gameId === spec3.game.id) && isMl;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Steam Mod Loader - for NG3RE
function installModLoaderSteam3(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === ML_STEAM_EXEC3);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODLOADER_STEAM_ID3 };

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

//Installer test for mod files
function testMlMod(files, gameId) {
  const isMod = files.some(file => path.extname(file).toLocaleLowerCase() === MLMOD_EXT);
  let supported = (gameId === (spec1.game.id || spec2.game.id || spec3.game.id)) && isMod;

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
function installMlMod(files, fileName) {
  const modFile = files.find(file => path.extname(file).toLocaleLowerCase() === MLMOD_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MLMOD_ID };

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
function testDatabin(files, gameId) {
  const isMod = files.some(file => path.basename(file) === DATABIN_FOLDER);
  let supported = (gameId === (spec1.game.id || spec2.game.id || spec3.game.id)) && isMod;

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
function installDatabin(files) {
  const modFile = files.find(file => path.basename(file) === DATABIN_FOLDER);
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATABIN_ID };

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

//Installer test for Root folder files
function testDatabinSub1(files, gameId) {
  const isMod = files.some(file => DATABINSUB_FOLDERS1.includes(path.basename(file)));
  let supported = (gameId === spec1.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installDatabinSub1(files) {
  const modFile = files.find(file => DATABINSUB_FOLDERS1.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATABINSUB_ID1 };

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

//Installer test for Root folder files
function testDatabinSub23(files, gameId) {
  const isMod = files.some(file => DATABINSUB_FOLDERS23.includes(path.basename(file)));
  let supported = (gameId === (spec2.game.id || spec3.game.id)) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installDatabinSub23(files) {
  const modFile = files.find(file => DATABINSUB_FOLDERS23.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATABINSUB_ID23 };

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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify Stam User of Setup instructions
function setupNotifySteam(api) {
  const NOTIF_ID = `${GAME_ID}-steamsetup-notification`;
  const MOD_NAME = 'Steam Mod Loader';
  const MESSAGE = `Steam Mod Loader Installed`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `This extension has automatically downloaded and installed ${MOD_NAME} to enable mods after installing with Vortex.\n`
                + `Please do not uninstall or disable the Mod Loader or any mods that depdend on it will not work.\n`
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

//Notify Xbox User of Setup instructions
function setupNotifyXbox(api) {
  const NOTIF_ID = `${GAME_ID}-xboxsetup-notification`;
  const MOD_NAME = MODLOADER_XBOX_NAME;
  const MESSAGE = `Xbox Mod Loader Installed`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You must run ${MOD_NAME} to enable mods after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} after launching the game (in "Dashboard" tab).\n`
                + `You will see an error popup about a failed hash check. You can safely ignore this error.\n`
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

function getStore(discovery) {
  try {
    fs.statSync(path.join(discovery.path, XBOX_EXEC));
    return GAME_STORE = 'xbox';
  }
  catch (err) {
    return GAME_STORE = 'steam';
  }
}

//Setup function - for NGS1
async function setup1(discovery, api, gameSpec) {
  getStore(discovery);
  if (GAME_STORE === 'xbox') {
    await downloadMlXbox(api, gameSpec);
    setupNotifyXbox(api);
  }
  if (GAME_STORE === 'steam') {
    await downloadMlSteam1(api, gameSpec);
    setupNotifySteam(api);
  }

  return fs.ensureDirWritableAsync(path.join(discovery.path, MLMOD_PATH));
}

//Setup function - for NGS2
async function setup2(discovery, api, gameSpec) {
  getStore(discovery);
  if (GAME_STORE === 'xbox') {
    await downloadMlXbox(api, gameSpec);
    setupNotifyXbox(api);
  }
  if (GAME_STORE === 'steam') {
    await downloadMlSteam2(api, gameSpec);
    setupNotifySteam(api);
  }

  return fs.ensureDirWritableAsync(path.join(discovery.path, MLMOD_PATH));
}

//Setup function - for NG3RE
async function setup3(discovery, api, gameSpec) {
  getStore(discovery);
  if (GAME_STORE === 'xbox') {
    await downloadMlXbox(api, gameSpec);
    setupNotifyXbox(api);
  }
  if (GAME_STORE === 'steam') {
    await downloadMlSteam3(api, gameSpec);
    setupNotifySteam(api);
  }

  return fs.ensureDirWritableAsync(path.join(discovery.path, MLMOD_PATH));
}

//Let Vortex know about the game - for NGS1
function applyGame1(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    requiresCleanup: true,
    queryArgs: gameFinderQuery1,
    executable: () => gameSpec.game.executable,
    queryModPath: () => gameSpec.game.modPath,
    setup: async (discovery) => await setup1(discovery, context.api, gameSpec),
    supportedTools: tools,
    requiresLauncher: requiresLauncher1,
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
}

//Let Vortex know about the game - for NGS2
function applyGame2(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    requiresCleanup: true,
    queryArgs: gameFinderQuery2,
    executable: () => gameSpec.game.executable,
    queryModPath: () => gameSpec.game.modPath,
    setup: async (discovery) => await setup2(discovery, context.api, gameSpec),
    supportedTools: tools,
    requiresLauncher: requiresLauncher2,
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
}

//Let Vortex know about the game - for NG3RE
function applyGame3(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    requiresCleanup: true,
    queryArgs: gameFinderQuery3,
    executable: () => gameSpec.game.executable,
    queryModPath: () => gameSpec.game.modPath,
    setup: async (discovery) => await setup3(discovery, context.api, gameSpec),
    supportedTools: tools,
    requiresLauncher: requiresLauncher3,
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
}

//Main function
function main(context) {
  //register games and mod types
  applyGame1(context, spec1);
  applyGame2(context, spec2);
  applyGame3(context, spec3);

  //register mod installers
  context.registerInstaller(MODLOADER_XBOX_ID, 25, testModLoaderXbox, installModLoaderXbox);
  context.registerInstaller(MODLOADER_STEAM_ID1, 30, testModLoaderSteam1, installModLoaderSteam1);
  context.registerInstaller(MODLOADER_STEAM_ID2, 35, testModLoaderSteam2, installModLoaderSteam2);
  context.registerInstaller(MODLOADER_STEAM_ID3, 40, testModLoaderSteam3, installModLoaderSteam3);
  context.registerInstaller(MLMOD_ID, 45, testMlMod, installMlMod);
  context.registerInstaller(DATABIN_ID, 50, testDatabin, installDatabin);
  context.registerInstaller(DATABINSUB_ID1, 55, testDatabinSub1, installDatabinSub1);
  context.registerInstaller(DATABINSUB_ID23, 60, testDatabinSub23, installDatabinSub23);

  context.once(() => {
    // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
