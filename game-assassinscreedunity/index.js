/*
Name: AC Unity Vortex Extension
Structure: Ubisoft AnvilToolkit
Author: ChemBoy1
Version: 0.4.2
Date: 03/12/2025
*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//Specify all the information about the game
const UPLAYAPP_ID = "720";
const STEAMAPP_ID = "289650";
const GAME_ID = "assassinscreedunity";
const GAME_NAME = "Assassin's Creed Unity";
const GAME_NAME_SHORT = "AC Unity";
const EXEC = "ACU.exe";
let GAME_PATH = null; //patched in the setup function to the discovered game path

const BITS = "BIT64";
const RESOREP_PAGE = 1215;
const RESOREP_FILE_32BIT = 4854;
const RESOREP_FILE_64BIT = 4855;

const DLC_FOLDERS = ["dlc_10", "dlc_11"];
const ROOT_FOLDERS = ["videos", "sounddata"];
const FIXES_FILES = ["version.dll", "ACUFixes"];
const LOOSE_EXTS = [".data"];
const IGNORE_DEPLOY = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_CONFLICTS = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Information for installers, mod types, and tools
const ATK_ID = `${GAME_ID}-atk`;
const ATK_NAME = "AnvilToolkit"
const ATK_EXEC = 'anviltoolkit.exe';

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries / Root Folder";
const BINARIES_PATH = path.join(".");

const DLC_ID = `${GAME_ID}-dlcfolder`;
const DLC_NAME = "DLC Folder"
const DLC_PATH = path.join(".");

const EXTRACTED_ID = `${GAME_ID}-extractedfolder`;
const EXTRACTED_NAME = "Extracted Folder"
const EXTRACTED_PATH = path.join(".");
const EXTRACTED_FOLDER = "Extracted";
const RENAME_FOLDER = "RENAME_ME_TO_FORGE_NAME.forge";

const FORGEFOLDER_ID = `${GAME_ID}-forgefolder`;
const FORGEFOLDER_NAME = ".forge Folder"
const FORGEFOLDER_PATH = path.join(".");
const FORGEFOLDER_STRING = ".forge";

const DATAFOLDER_ID = `${GAME_ID}-datafolder`;
const DATAFOLDER_NAME = ".data Folder"
const DATAFOLDER_PATH = path.join(".");
const DATAFOLDER_STRING = ".data";

const LOOSE_ID = `${GAME_ID}-loosedata`;
const LOOSE_NAME = "Loose Data Files";
const LOOSE_PATH = path.join(".");

const FORGE_ID = `${GAME_ID}-forgefile`;
const FORGE_NAME = "Forge Replacement";
const FORGE_PATH = path.join(".");
const FORGE_EXT = ".forge";

const FIXES_ID = `${GAME_ID}-fixes`;
const FIXES_NAME = "Fixes";
const FIXES_PATH = path.join(".");

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const RESOREP_ID = `${GAME_ID}-resorep`;
const RESOREP_NAME = "ResoRep DLL";
const RESOREP_PATH = path.join(".");
const RESOREP_FILES = ["d3d11.dll"];

const RESOREP_TEXTURES_ID = `${GAME_ID}-resoreptextures`;
const RESOREP_TEXTURES_NAME = "ResoRep Textures";
const RESOREP_TEXTURES_PATH = path.join("ResoRep", "modded");
const RESOREP_TEXTURES_EXT = ".dds";

const RESOREP_INI_FILE = "dllsettings.ini";
const RESOREP_DLL_FILE = 'd3d11.dll';
const RESOREP_ORIDLL_FILE = 'ori_d3d11.dll';
const RESOREP_SCRIPT_FILE = 'copy_d3d11dll_vortex.bat';
const SYSTEM_DLL_FILE = path.join('C:', 'Windows', 'SysWOW64', 'd3d11.dll');
const RESOREP_INI_TEXT = (
`version=1.7.0
modded_textures_folder={gamePath}\\${RESOREP_TEXTURES_PATH}
mod_creator_mode_enabled=false
dll_log_enabled=false
dll_log_file={gamePath}\\resorepDll.log
save_textures=false
original_textures_folder={gamePath}\\ResoRep\\original
application_to_hook={gamePath}\\${EXEC}|${BITS}`
);

//Filled from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "uPlayAppId": UPLAYAPP_ID,
      "supportsSymlinks": true,
      //"nexusPageId": GAME_ID,
      //"compatibleDownloads": ['site'],
      "ignoreDeploy": IGNORE_DEPLOY,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "UPlayAPPId": UPLAYAPP_ID
    }
  },
  "modTypes": [
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": DLC_ID,
      "name": DLC_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${DLC_PATH}`
    },
    {
      "id": EXTRACTED_ID,
      "name": EXTRACTED_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${EXTRACTED_PATH}`
    },
    {
      "id": FORGEFOLDER_ID,
      "name": FORGEFOLDER_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${FORGEFOLDER_PATH}`
    },
    {
      "id": DATAFOLDER_ID,
      "name": DATAFOLDER_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${DATAFOLDER_PATH}`
    },
    {
      "id": LOOSE_ID,
      "name": LOOSE_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${LOOSE_PATH}`
    },
    {
      "id": FORGE_ID,
      "name": FORGE_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${FORGE_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": RESOREP_TEXTURES_ID,
      "name": RESOREP_TEXTURES_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${RESOREP_TEXTURES_PATH}`
    },
    {
      "id": FIXES_ID,
      "name": FIXES_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${FIXES_PATH}`
    },
    {
      "id": RESOREP_ID,
      "name": RESOREP_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${RESOREP_PATH}`
    },
    {
      "id": ATK_ID,
      "name": ATK_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    }
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      UPLAYAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: ATK_ID,
    name: ATK_NAME,
    logo: 'anvil.png',
    executable: () => ATK_EXEC,
    requiredFiles: [
      ATK_EXEC,
    ],
    relative: true,
    exclusive: true,
    detach: true,
    //shell: true,
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
    localAppData: util.getVortexPath('localAppData'),
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

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  return Promise.resolve(undefined);
  /*
  if (store === 'steam') {
    return Promise.resolve({
      undefined,
    });
  }
  else if (store === 'uplay') {
    return Promise.resolve({
      undefined,
    });
  }
  else if (store === undefined) {
    return Promise.resolve({
      undefined,
    });
  }
  else {
    return Promise.resolve(undefined);
  }
  //*/
}

// AUTOMATIC DOWNLOAD FUNCTIONS //////////////////////////////////////////////

//Check if AnvilToolkit is installed
function isAnvilInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === ATK_ID);
}

//Check if ResoRep is installed
function isResoRepInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === RESOREP_ID);
}

//Function to auto-download AnvilToolkit
async function downloadAnvil(discovery, api, gameSpec) {
  let isInstalled = isAnvilInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = ATK_NAME;
    const MOD_TYPE = ATK_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const modPageId = 455;
    const FILE_ID = 3699;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = 'site';
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
      //*get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
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
      const nxmUrl = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${FILE_ID}`;
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download/install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to allow user to download ResoRep by choice
async function downloadResoRep(discovery, api, gameSpec) {
  let isInstalled = isResoRepInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification asking user if they want to download ResoRep
    const NOTIF_ID = `${GAME_ID}-resorepdownload`;
    const MOD_NAME = RESOREP_NAME;
    const MESSAGE = `Download ResoRep for Legacy Texture Mods`;
    api.sendNotification({
      id: NOTIF_ID,
      type: 'warning',
      message: MESSAGE,
      allowSuppress: true,
      actions: [
        {
          title: 'Download ResoRep',
          action: (dismiss) => {
            if (BITS === "BIT32") {
              downloadResoRep32Bit(discovery, api, gameSpec);
              dismiss();
            }
            else if (BITS === "BIT64") {
              downloadResoRep64Bit(discovery, api, gameSpec);
              dismiss();
            }
            else {
              dismiss();
            }
          },
        },
        {
          title: 'More',
          action: (dismiss) => {
            api.showDialog('question', MESSAGE, {
              text: `For some legacy texture mods, you must use ${MOD_NAME} to inject textures into memory at runtime.\n`
                  + `Click "Dowload ResoRep" below if you like to use it.\n`
                  + `There is a small script for you to run in the mod statging folder after installation to complete the ResoRep setup.\n`
            }, [
              {
                label: 'Download ResoRep', action: () => {
                  if (BITS === "BIT32") {
                    downloadResoRep32Bit(discovery, api, gameSpec);
                    dismiss();
                  }
                  else if (BITS === "BIT64") {
                    downloadResoRep64Bit(discovery, api, gameSpec);
                    dismiss();
                  }
                  else {
                    dismiss();
                  }
                }
              },
              { label: 'Continue', action: () => dismiss() },
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
}

async function downloadResoRep32Bit(discovery, api, gameSpec) {
  //notification indicating install process
  const MOD_NAME = `${RESOREP_NAME} 32-bit`;
  const MOD_TYPE = RESOREP_ID;
  const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
  const modPageId = RESOREP_PAGE;
  const FILE_ID = RESOREP_FILE_32BIT;  //If using a specific file id because "input" below gives an error
  const GAME_DOMAIN = 'site';
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
    /*get the mod files information from Nexus
    const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, modPageId);
    const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
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
    //const nxmUrl = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${file.file_id}`;
    const nxmUrl = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${FILE_ID}`;
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
      actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the modType
    ];
    util.batchDispatch(api.store, batched); // Will dispatch both actions.
  //Show the user the download page if the download/install process fails
  } catch (err) {
    const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${modPageId}/files/?tab=files`;
    api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
    util.opn(errPage).catch(() => null);
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
}

async function downloadResoRep64Bit(discovery, api, gameSpec) {
  //notification indicating install process
  const MOD_NAME = `${RESOREP_NAME} 64-bit`;
  const MOD_TYPE = RESOREP_ID;
  const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
  const modPageId = RESOREP_PAGE;
  const FILE_ID = RESOREP_FILE_64BIT;  //If using a specific file id because "input" below gives an error
  const GAME_DOMAIN = 'site';
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
    /*get the mod files information from Nexus
    const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, modPageId);
    const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
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
    //const nxmUrl = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${file.file_id}`;
    const nxmUrl = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${FILE_ID}`;
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
      actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the modType
    ];
    util.batchDispatch(api.store, batched); // Will dispatch both actions.
  //Show the user the download page if the download/install process fails
  } catch (err) {
    const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${modPageId}/files/?tab=files`;
    api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
    util.opn(errPage).catch(() => null);
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testATK(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === ATK_EXEC);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installATK(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === ATK_EXEC);
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

//Installer test for Root folder files
function testDlc(files, gameId) {
  const isMod = files.some(file => DLC_FOLDERS.includes(path.basename(file)));
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

//Installer install Root folder files
function installDlc(files) {
  const modFile = files.find(file => DLC_FOLDERS.includes(path.basename(file)));
  const MODFILE_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(MODFILE_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DLC_ID };

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

//Test for "Extracted" folder
function testExtracted(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === EXTRACTED_FOLDER));
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

//Install "Extracted" folder
function installExtracted(files) {
  const modFile = files.find(file => (path.basename(file) === EXTRACTED_FOLDER));
  const MODFILE_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(MODFILE_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: EXTRACTED_ID };

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

//Test for ".forge" containing folder name
function testForgeFolder(files, gameId) {
  const isMod = files.some(file => path.dirname(file).includes(FORGEFOLDER_STRING));
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

//Install ".forge" containing folder name
function installForgeFolder(files) {
  const modFile = files.find(file => path.basename(file).includes(FORGEFOLDER_STRING));
  const MODFILE_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(MODFILE_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FORGEFOLDER_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTRACTED_FOLDER, file.substr(idx)),
      //destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for ".forge" containing folder name
function testDataFolder(files, gameId) {
  const isMod = files.some(file => path.dirname(file).includes(DATAFOLDER_STRING));
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

//Install ".forge" containing folder name
function installDataFolder(files) {
  const modFile = files.find(file => path.basename(file).includes(DATAFOLDER_STRING));
  const MODFILE_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(MODFILE_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATAFOLDER_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTRACTED_FOLDER, RENAME_FOLDER, file.substr(idx)),
      //destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for loose .data files
function testLoose(files, gameId) {
  const isMod = files.some(file => LOOSE_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install loose .data files
function installLoose(files) {
  const modFile = files.find(file => LOOSE_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOOSE_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTRACTED_FOLDER, RENAME_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for ACUFixes files
function testFixes(files, gameId) {
  const isMod = files.some(file => FIXES_FILES.includes(path.basename(file)));
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

//Install ACUFixes files
function installFixes(files) {
  const modFile = files.find(file => FIXES_FILES.includes(path.basename(file)));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FIXES_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
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

//Test for ACUFixes files
function testResoRep(files, gameId) {
  const isMod = files.some(file => RESOREP_FILES.includes(path.basename(file)));
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

//Install ACUFixes files
function installResoRep(files) {
  const modFile = files.find(file => RESOREP_FILES.includes(path.basename(file)));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: RESOREP_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
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

//Test for .forge files
function testForge(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === FORGE_EXT));
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

//Install .forge files
function installForge(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === FORGE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FORGE_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
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
function testRoot(files, gameId) {
  const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const MODFILE_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(MODFILE_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

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

//Test for ResoRep .dds files
function testResoRepTextures(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === RESOREP_TEXTURES_EXT));
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

//Install ResoRep .dds files
function installResoRepTextures(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === RESOREP_TEXTURES_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: RESOREP_TEXTURES_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
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

// MAIN FUNCTIONS /////////////////////////////////////////////////////////////

//Notify User to run ATK after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = ATK_NAME;
  const MESSAGE = `Run ATK to Repack .forge Files`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run ATK',
        action: (dismiss) => {
          runAtk(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For some mods, you must use ${MOD_NAME} to pack mods into the game's .forge data files after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
                + `Read your mod's instructions to determine which .forge file(s) to unpack and repack.\n`
                + `You may need to do some manual folder manipulation in the mod staging folder if the extension could not do it for your mod.\n`
                + `Right click on the mod in the "Mods" tab to open the mod's staging folder and verify the folder structure is correct.\n`
                + `The folder structure should look something like this: "Extracted/{FORGE_FILE_NAME}.forge/{DATA_FILE}.data" or "dlc_10/Extracted/{FORGE_FILE_NAME}.forge/{DATA_FILE}.data".\n`
          }, [
            {
              label: 'Run ATK', action: () => {
                runAtk(api);
                dismiss();
              }
            },
            { label: 'Continue', action: () => dismiss() },
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

function runAtk(api) {
  const TOOL_ID = ATK_ID;
  const TOOL_NAME = ATK_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false })
        .catch(err => api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    }
    else {
      return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, `Path to ${TOOL_NAME} executable could not be found. Ensure ${TOOL_NAME} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}

//Write ResoRep dllsetttings.ini file
async function resorepSettingsWrite(discovery, api, gameSpec) {
  try {
    fs.statSync(path.join(GAME_PATH, RESOREP_INI_FILE));
  } catch (err) {
    await fs.writeFileAsync( //write Resorep dllsettings.ini file
      path.join(GAME_PATH, RESOREP_INI_FILE),
      (pathPattern(api, gameSpec.game, RESOREP_INI_TEXT)),
      //{ flag: 'x', encoding: 'utf8' },
      (err) => {
        if (err) {
          api.showErrorNotification('Failed to write ResoRep dllsettings.ini file', err);
        }
      }
    );
  }
}

//Run ResoRep mod script to copy d3d11.dll from system folder
async function resorepScriptCheck(discovery, api, gameSpec) {
  let isInstalled = isResoRepInstalled(api, gameSpec);
  if (isInstalled) {
    try {
      fs.statSync(path.join(GAME_PATH, RESOREP_ORIDLL_FILE));
      log('info', 'ResoRep original dll already exists. File copy script not run.');
    } catch (err) {
      try {
        child_process.spawn(
        //const proc = child_process.spawn(  
          path.join(GAME_PATH, RESOREP_SCRIPT_FILE),
          [""],
          { 
            //cwd: path.join(GAME_PATH),
            shell: true, 
            detached: true, 
          }
        );
        //proc.on("error", () => {});
        log('info', 'ResoRep file copy script run.');
      } catch (err) {
        api.showErrorNotification('Failed to run ResoRep file copy script', err);
      }
    }
  }
  else {
    log('info', 'ResoRep not installed. File copy script not run.');
  }
}

//Run ResoRep mod script to copy d3d11.dll from system folder
async function resorepDllCopy(api, gameSpec) {
  let isInstalled = isResoRepInstalled(api, gameSpec);
  if (isInstalled) {
    try {
      fs.statSync(path.join(GAME_PATH, RESOREP_ORIDLL_FILE));
      log('info', 'ResoRep original dll already exists. No file copied.');
    } catch (err) {
      try {
        const SOURCE = path.join('C:', 'Windows', 'SysWOW64', 'd3d11.dll');
        const TARGET = path.join(GAME_PATH, RESOREP_ORIDLL_FILE);
        return util.copyFileAtomic(SOURCE, TARGET)
        //return fs.copyAsync(filePath, mergeTarget)
        .catch({ code: 'ENOENT' }, err => {
          // not entirely sure whether "ENOENT" refers to the source file or the directory we're trying to copy into, the error object contains only one of those paths
          context.api.showErrorNotification('Failed to copy d3d11.dll from system folder', err);
          log('error', 'Failed to copy d3d11.dll from system folder', {
            source: filePath,
            destination: mergeTarget,
          });
          return Promise.reject(err);
        });
      } catch (err) {
          api.showErrorNotification('Failed to run ResoRep file copy script', err);
        }
    }
  }
  else {
    log('info', 'ResoRep not installed. File not copied.');
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  GAME_PATH = discovery.path;
  await downloadAnvil(discovery, api, gameSpec);
  await downloadResoRep(discovery, api, gameSpec);
  await resorepSettingsWrite(discovery, api, gameSpec);
  //await resorepDllCopy(api, gameSpec);
  //await resorepScriptCheck(discovery, api, gameSpec);
  await (DLC_FOLDERS || []).forEach((folder, idx, arr) => {
    fs.ensureDirWritableAsync(path.join(discovery.path, folder, EXTRACTED_FOLDER));
  });
  await (gameSpec.modTypes || []).forEach((type, idx, arr) => {
    fs.ensureDirWritableAsync(pathPattern(api, gameSpec.game, type.targetPath));
  });
  return fs.ensureDirWritableAsync(path.join(discovery.path, EXTRACTED_FOLDER));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    supportedTools: tools,
  };
  context.registerGame(game);

  //register mod types recursively
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod installers
  context.registerInstaller(ATK_ID, 25, testATK, installATK);
  context.registerInstaller(DLC_ID, 30, testDlc, installDlc);
  context.registerInstaller(EXTRACTED_ID, 35, testExtracted, installExtracted);
  context.registerInstaller(FORGEFOLDER_ID, 40, testForgeFolder, installForgeFolder);
  context.registerInstaller(DATAFOLDER_ID, 45, testDataFolder, installDataFolder);
  context.registerInstaller(LOOSE_ID, 50, testLoose, installLoose);
  context.registerInstaller(FIXES_ID, 55, testFixes, installFixes);
  context.registerInstaller(RESOREP_ID, 57, testResoRep, installResoRep);
  context.registerInstaller(FORGE_ID, 60, testForge, installForge);
  context.registerInstaller(ROOT_ID, 65, testRoot, installRoot);
  context.registerInstaller(RESOREP_TEXTURES_ID, 70, testResoRepTextures, installResoRepTextures);
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      resorepDllCopy(context.api, spec);
      return deployNotify(context.api);
    });

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
