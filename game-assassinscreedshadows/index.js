/*////////////////////////////////////////////////
Name: AC Shadows Vortex Extension
Structure: Ubisoft AnvilToolkit & Forger Patch Manager
Author: ChemBoy1
Version: 0.2.0
Date: 2025-10-07
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//Specify all the information about the game
const GAME_ID = "assassinscreedshadows";
const UPLAYAPP_ID = "8006";
const STEAMAPP_ID = "3159330";
const GAME_NAME = "Assassin's Creed Shadows";
const GAME_NAME_SHORT = "AC Shadows";
const EXEC = "ACShadows.exe";
let GAME_PATH = null; //patched in the setup function to the discovered game path
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

const DLCSTRING10 = "_10_";
const DLCSTRING26 = "_26_";
const DLCSTRING28 = "_28_";
const DLCSTRING29 = "_29_";

const DLCFOLDER10 = 'dlc_10';
const DLCFOLDER26 = 'dlc_26';
const DLCFOLDER28 = 'dlc_28';
const DLCFOLDER29 = 'dlc_29';
const DLC_FOLDERS = [DLCFOLDER10, DLCFOLDER26, DLCFOLDER28, DLCFOLDER29];
const ROOT_FOLDERS = ['videos', 'resources'];
const FIXES_FILES = ["version.dll"];
const LOOSE_EXTS = [".data"];
const IGNORE_DEPLOY = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_CONFLICTS = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Information for installers, mod types, and tools
const ATK_ID = `${GAME_ID}-atk`;
const ATK_NAME = "AnvilToolkit";
const ATK_EXEC = 'anviltoolkit.exe';
const ATK_DOMAIN = `site`;
const ATK_PAGE = 455;
const ATK_FILE = 3699;

const FORGER_ID = `${GAME_ID}-forgerpatchmanager`;
const FORGER_NAME = "Forger Patch Manager";
const FORGER_EXEC = 'forger.exe';
const FORGER_DOMAIN = "assassinscreedodyssey";
const FORGER_PAGE = 42;
const FORGER_FILE = 716;

const FORGER_NEW_EXEC = 'forger mod.exe';
const FORGER_NEW_URL = 'https://drive.usercontent.google.com/download?id=1MctosQuCK1FNmTbaDl4GVWnka1r_0FJl&export=download&authuser=0&confirm=t&uuid=88e66bba-2858-4bf1-ae98-d2df9e8b7a76&at=AEz70l6ooFkHoL-8hKGoUG3sjmnx%3A1742334203674';

const PATCH_ID = `${GAME_ID}-forgerpatch`;
const PATCH_NAME = "Forger Patch";
const PATCH_PATH = path.join("ForgerPatches");
const PATCH_EXT = ".forger2";

const PATCH_TEXTURES_ID = `${GAME_ID}-forgerpatchtextures`;
const PATCH_TEXTURES_NAME = "Forger Patch Textures";
const PATCH_TEXTURES_PATH = PATCH_PATH;
const PATCH_TEXTURES_EXT = ".dds";

const DLC_ID = `${GAME_ID}-dlcfolder`;
const DLC_NAME = "DLC Folder";
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
const LOOSE_NAME = "Loose .data File";
const LOOSE_PATH = path.join(".");

const FORGE_ID = `${GAME_ID}-forgefile`;
const FORGE_NAME = "Forge Replacement (root)";
const FORGE_PATH = path.join(".");
const FORGE_EXT = ".forge";

const FORGEDLC10_ID = `${GAME_ID}-forgefiledlc10`;
const FORGEDLC10_NAME = `Forge Replacement (${DLCFOLDER10})`;
const FORGEDLC10_PATH = path.join(DLCFOLDER10);
const FORGEDLC10_FILELIST = [
  "DataPC_boot_10_dlc.forge",
  "DataPC_boot_10_dlc_patch_01.forge",
  "DataPC_boot_10_dlc_sound.forge",
  "DataPC_boot_10_dlc_sound_bra.forge",
  "DataPC_boot_10_dlc_sound_patch_01.forge",
  "DataPC_Japan_ext_10_dlc.forge",
  "DataPC_Japan_ext_10_dlc_patch_01.forge",
];

const FORGEDLC26_ID = `${GAME_ID}-forgefiledlc26`;
const FORGEDLC26_NAME = `Forge Replacement (${DLCFOLDER26})`;
const FORGEDLC26_PATH = path.join(DLCFOLDER26);
const FORGEDLC26_FILELIST = [
  "DataPC_boot_26_dlc.forge",
  "DataPC_boot_26_dlc_patch_01.forge",
  "DataPC_Japan_ext_26_dlc.forge",
  "DataPC_Japan_ext_26_dlc_patch_01.forge",
];

const FORGEDLC28_ID = `${GAME_ID}-forgefiledlc28`;
const FORGEDLC28_NAME = `Forge Replacement (${DLCFOLDER28})`;
const FORGEDLC28_PATH = path.join(DLCFOLDER28);
const FORGEDLC28_FILELIST = [
  "DataPC_AnimusRoom_ext_28_dlc.forge",
  "DataPC_boot_28_dlc.forge",
  "DataPC_boot_28_dlc_dx12.forge",
  "DataPC_boot_28_dlc_patch_01.forge",
  "DataPC_boot_28_dlc_sound.forge",
  "DataPC_boot_28_dlc_sound_bra.forge",
  "DataPC_boot_28_dlc_sound_eng.forge",
  "DataPC_boot_28_dlc_sound_eng_patch_01.forge",
  "DataPC_boot_28_dlc_sound_fre.forge",
  "DataPC_boot_28_dlc_sound_ger.forge",
  "DataPC_boot_28_dlc_sound_ita.forge",
  "DataPC_boot_28_dlc_sound_jap.forge",
  "DataPC_boot_28_dlc_sound_jap_patch_01.forge",
  "DataPC_boot_28_dlc_sound_patch_01.forge",
  "DataPC_boot_28_dlc_sound_spa.forge",
  "DataPC_Japan_ext_28_dlc.forge",
  "DataPC_Japan_ext_28_dlc_dx12.forge",
  "DataPC_Japan_ext_28_dlc_patch_01.forge",
  "DataPC_Japan_ext_28_dlc_sound.forge",
  "DataPC_Japan_ext_28_dlc_sound_patch_01.forge",
];

const FORGEDLC29_ID = `${GAME_ID}-forgefiledlc29`;
const FORGEDLC29_NAME = `Forge Replacement (${DLCFOLDER29})`;
const FORGEDLC29_PATH = path.join(DLCFOLDER29);
const FORGEDLC29_FILELIST = [
  "DataPC_boot_29_dlc.forge",
  "DataPC_boot_29_dlc_dx12.forge",
  "DataPC_boot_29_dlc_patch_01.forge",
  "DataPC_boot_29_dlc_sound.forge",
  "DataPC_boot_29_dlc_sound_patch_01.forge",
  "DataPC_Japan_ext_29_dlc.forge",
  "DataPC_Japan_ext_29_dlc_patch_01.forge",
];

const FIXES_ID = `${GAME_ID}-fixes`;
const FIXES_NAME = "Fixes";
const FIXES_PATH = path.join(".");

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const MOD_PATH_DEFAULT = path.join(".");

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
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "uPlayAppId": UPLAYAPP_ID,
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
      "id": PATCH_ID,
      "name": PATCH_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PATCH_PATH}`
    },
    {
      "id": PATCH_TEXTURES_ID,
      "name": PATCH_TEXTURES_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PATCH_TEXTURES_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
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
      "id": FORGEDLC10_ID,
      "name": FORGEDLC10_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${FORGEDLC10_PATH}`
    },
    {
      "id": FORGEDLC26_ID,
      "name": FORGEDLC26_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${FORGEDLC26_PATH}`
    },
    {
      "id": FORGEDLC28_ID,
      "name": FORGEDLC28_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${FORGEDLC28_PATH}`
    },
    {
      "id": FORGEDLC29_ID,
      "name": FORGEDLC29_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${FORGEDLC29_PATH}`
    },
    {
      "id": FIXES_ID,
      "name": FIXES_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${FIXES_PATH}`
    },
    {
      "id": ATK_ID,
      "name": ATK_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": FORGER_ID,
      "name": FORGER_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      UPLAYAPP_ID,
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
    requiredFiles: [ATK_EXEC],
    relative: true,
    exclusive: true,
  },
  {
    id: FORGER_ID,
    name: FORGER_NAME,
    logo: 'forger.png',
    executable: () => FORGER_EXEC,
    requiredFiles: [FORGER_EXEC],
    relative: true,
    exclusive: true,
  },
  {
    id: FORGER_ID + 'new',
    name: FORGER_NAME + ' (New)',
    logo: 'forger.png',
    executable: () => FORGER_NEW_EXEC,
    requiredFiles: [FORGER_NEW_EXEC],
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

//Check if Forger Patch Manager is installed
function isForgerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === FORGER_ID);
}

//Function to auto-download AnvilToolkit
async function downloadAnvil(api, gameSpec) {
  let isInstalled = isAnvilInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = ATK_NAME;
    const MOD_TYPE = ATK_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = ATK_PAGE;
    const FILE_ID = ATK_FILE;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = ATK_DOMAIN;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try { //Try to automatically download the mod
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10); //sometimes errors on 'input'
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
      } catch (err) { //Use specific file id because "input" above gives an error
        FILE = FILE_ID; 
      }
      const dlInfo = {
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download Forger Patch Manager
async function downloadForger(api, gameSpec) {
  let isInstalled = isForgerInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = FORGER_NAME;
    const MOD_TYPE = FORGER_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = FORGER_PAGE;
    const FILE_ID = FORGER_FILE;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = FORGER_DOMAIN;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10); //sometimes errors on 'input'
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
      } catch (err) {
        FILE = FILE_ID; //Use specific file id because "input" above gives an error
      }
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for AnvilToolkit files
function testATK(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === ATK_EXEC);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install AnvilToolkit files
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

//Installer test for Forger Patch Manager files
function testForger(files, gameId) {
  const isMod = files.some(file => ((path.basename(file).toLowerCase() === FORGER_EXEC) || (path.basename(file).toLowerCase() === FORGER_NEW_EXEC)));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Forger Patch Manager files
function installForger(files) {
  const modFile = files.find(file => ((path.basename(file).toLowerCase() === FORGER_EXEC) || (path.basename(file).toLowerCase() === FORGER_NEW_EXEC)));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FORGER_ID };

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


//Test for .forger2 files
function testPatch(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === PATCH_EXT) !== undefined;
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

//Install .forger2 files
function installPatch(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === PATCH_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const MODTYPE_ID = PATCH_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MODTYPE_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    //((file.indexOf(rootPath) !== -1))
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

//Test for Forger Patch .dds files
function testPatchTextures(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === PATCH_TEXTURES_EXT));
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

//Fallback installer for binaries folder
function installPatchTextures(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: PATCH_TEXTURES_ID };
  // Remove empty directories
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for DLC folder files
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

//Installer install DLC folder files
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

//Test for Fixes files
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

//Install Fixes files
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

  let setModTypeInstruction = { type: 'setmodtype', value: FORGE_ID };
  if (path.basename(modFile).includes(DLCSTRING10)) {
    setModTypeInstruction = { type: 'setmodtype', value: FORGEDLC10_ID };
  }
  else if (path.basename(modFile).includes(DLCSTRING26)) {
    setModTypeInstruction = { type: 'setmodtype', value: FORGEDLC26_ID };
  }
  else if (path.basename(modFile).includes(DLCSTRING28)) {
    setModTypeInstruction = { type: 'setmodtype', value: FORGEDLC28_ID };
  }
  else if (path.basename(modFile).includes(DLCSTRING29)) {
    setModTypeInstruction = { type: 'setmodtype', value: FORGEDLC29_ID };
  }

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

// MAIN FUNCTIONS /////////////////////////////////////////////////////////////

//Startup notification
function setupNotify(api) {
  api.sendNotification({
    id: `${GAME_ID}-setup-notification`,
    type: 'warning',
    message: 'Forger Setup Required',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: () => {
          api.showDialog('question', 'Action required', {
            text: 'Some of the most popular mods for AC Shadows require a software called Forger Patch Manager.\n'
                + 'This software has been automatically downloaded and installed for you by the extension. \n'
                + 'You need to run the tool on the Dashboard to apply the patches to the game files.'
          }, [
            { label: 'Continue', action: (dismiss) => dismiss() },
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

//Notify User to run Fluffy Mod Manager after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = ATK_NAME;
  const MESSAGE = `Run Tools to Complete Mod Installation`;
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
        title: 'Run Forger',
        action: (dismiss) => {
          runForger(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For most mods, you must use either AnvilToolkit or Forger Patch Manager to complet mod installation after installing with Vortex.\n`
                + `Use the included tools to launch these programs (button on notification or in "Dashboard" tab) if your mod requires them.\n`
                + `Read your mod's instructions to determine if one of these tools is required.\n`
                + `\n`
                + `For ATK Mods:\n`
                + `Read your mod's instructions to determine which .forge file(s) need to be unpacked and repacked.\n`
                + `You may need to do some manual folder manipulation in the mod staging folder if the extension could not do it automatically for your mod.\n`
                + `Right click on the mod in the "Mods" tab and select "Open in File Manager" to open the mod's staging folder and verify the folder structure is correct.\n`
                + `The folder structure should look something like this: "Extracted/{FORGE_FILE_NAME}.forge/{DATA_FILE}.data" or "{DLC_FOLDER}/Extracted/{FORGE_FILE_NAME}.forge/{DATA_FILE}.data".\n`
          }, [
            {
              label: 'Run ATK', action: () => {
                runForger(api);
                dismiss();
              }
            },
            {
              label: 'Run Forger', action: () => {
                runForger(api);
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

function runForger(api) {
  const TOOL_ID = FORGER_ID;
  const TOOL_NAME = FORGER_NAME;
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

//Setup function
async function setup(discovery, api, gameSpec) {
  //setupNotify(api);
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  await (DLC_FOLDERS || []).forEach((folder, idx, arr) => {
    fs.ensureDirWritableAsync(path.join(discovery.path, folder));
    //fs.ensureDirWritableAsync(path.join(discovery.path, folder, EXTRACTED_FOLDER));
  }); //*/
  /*await (gameSpec.modTypes || []).forEach((type, idx, arr) => {
    fs.ensureDirWritableAsync(pathPattern(api, gameSpec.game, type.targetPath));
  }); //*/
  //await downloadAnvil(api, gameSpec); // <-- ATK is not yet compatible with Shadows
  //await downloadForger(api, gameSpec); // <-- Forger Patch Manager is not yet compatible with Shadows
  //return fs.ensureDirWritableAsync(path.join(discovery.path, EXTRACTED_FOLDER));
  return fs.ensureDirWritableAsync(path.join(discovery.path));
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

  //register mod types
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod installers
  context.registerInstaller(ATK_ID, 25, testATK, installATK); 
  context.registerInstaller(FORGER_ID, 30, testForger, installForger); 
  //context.registerInstaller(PATCH_ID, 35, testPatch, installPatch);
  //context.registerInstaller(PATCH_TEXTURES_ID, 37, testPatchTextures, installPatchTextures);
  context.registerInstaller(DLC_ID, 40, testDlc, installDlc); //DLC folder names, installed to root
  /* Disabled due to lack of ATK support
  context.registerInstaller(EXTRACTED_ID, 45, testExtracted, installExtracted);
  context.registerInstaller(FORGEFOLDER_ID, 50, testForgeFolder, installForgeFolder);
  context.registerInstaller(DATAFOLDER_ID, 55, testDataFolder, installDataFolder);
  context.registerInstaller(LOOSE_ID, 60, testLoose, installLoose); //*/
  //context.registerInstaller(FIXES_ID, 62, testFixes, installFixes); // Disabled until there is a mod that would use it. 
  context.registerInstaller(FORGE_ID, 65, testForge, installForge); // Installs .forge to root or dlc folders based on file list
  context.registerInstaller(ROOT_ID, 69, testRoot, installRoot); // NICE
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    /* Disabled until ATK is compatible with Shadows
    context.api.onAsync('did-deploy', async (profileId, deployment) => { //notification to run tools after deployment
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;

      return deployNotify(context.api);
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
