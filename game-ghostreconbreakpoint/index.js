/*//////////////////////////////////////////////////////////
Name: Ghost Recon Breakpoint Vortex Extension
Structure: Ubisoft AnvilToolkit
Author: ChemBoy1
Version: 0.2.3
Date: 2025-04-11
//////////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//Specify all the information about the game
const UPLAYAPP_ID = "11903";
const STEAMAPP_ID = "2231380";
const GAME_ID = "ghostreconbreakpoint";
const EXEC = "GRB.exe";
const EXEC_PLUS = "GRB_UPP.exe";
const EXEC_VULKAN = "GRB_vulkan.exe";
const GAME_NAME = "Ghost Recon Breakpoint";
const GAME_NAME_SHORT = "GR Breakpoint";
let GAME_PATH = null; //patched in the setup function to the discovered game path
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

const ROOT_FOLDERS = ["videos"];
const LOOSE_EXTS = [".data"];
const IGNORE_DEPLOY = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_CONFLICTS = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Info for mod types and installers
const DOCUMENTS = util.getVortexPath('documents');

const ATK_ID = `${GAME_ID}-atk`;
const ATK_NAME = "AnvilToolkit";
const ATK_EXEC = 'anviltoolkit.exe';
const ATK_PAGE = 455;
const ATK_FILE = 3699;
const ATK_DOMAIN = 'site';

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries / Root Folder";

const BUILDTABLE_ID = `${GAME_ID}-buildtable`;
const BUILDTABLE_NAME = "Individual Buildtables";
const BUILDTABLE_FOLDER = "Individual Buildtables";
const BUILDTABLE_PATH  = path.join('Extracted', 'DataPC_patch_01.forge', 'Extracted', '23_-_TEAMMATE_Template.data');
const BUILDTABLE_EXT = ".buildtable";

const SOUND_ID = `${GAME_ID}-sound`;
const SOUND_NAME = "Sound Data .pck";
const SOUND_PATH = path.join('sounddata', 'pc');
const SOUND_EXT = ".pck";

const EXTRACTED_ID = `${GAME_ID}-extracted`;
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

const SETTINGS_FILE = path.join(DOCUMENTS, 'My Games', 'Ghost Recon Breakpoint', "GRB.ini");

//This will fill in from info above
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
      "id": SOUND_ID,
      "name": SOUND_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${SOUND_PATH}`
    },
    {
      "id": BUILDTABLE_ID,
      "name": BUILDTABLE_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${BUILDTABLE_PATH}`
    },
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
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
      "id": ATK_ID,
      "name": ATK_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
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
    id: "LaunchUbisoftPlus",
    name: "Launch Game Ubisoft Plus",
    logo: `exec.png`,
    executable: () => EXEC_PLUS,
    requiredFiles: [EXEC_PLUS],
    detach: true,
    relative: true,
    exclusive: true,
    //defaultPrimary: true,
    //isPrimary: true,
    parameters: []
  },
  {
    id: "LaunchVulkan",
    name: "Launch Vulkan Game",
    logo: `vulkan.png`,
    executable: () => EXEC_VULKAN,
    requiredFiles: [EXEC_VULKAN],
    detach: true,
    relative: true,
    exclusive: true,
    //defaultPrimary: true,
    //isPrimary: true,
    parameters: []
  },
  {
    id: `${GAME_ID}-customlaunch`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: []
  },
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
  },
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if AnvilToolkit is installed
function isAnvilInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === ATK_ID);
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
    //const modPageId = 38;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles('site', modPageId);
      //const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = () => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testATK(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === ATK_EXEC));
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

//Installer install Fluffy Mod Manger files
function installATK(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === ATK_EXEC));
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

//Test for config files
function testSound(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SOUND_EXT));
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

//Install config files
function installSound(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === SOUND_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SOUND_ID };

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
function testIndividualBuildtables(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === BUILDTABLE_FOLDER));
  const isExt = files.some(file => (path.extname(file).toLowerCase() === BUILDTABLE_EXT));
  let supported = (gameId === spec.game.id) && isMod && isExt;

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

//Installer install Root folder files
function installIndividualBuildtables(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === BUILDTABLE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BUILDTABLE_ID };

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
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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

//Test for ".data" containing folder name
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

//Install ".data" containing folder name
function installDataFolder(api, files, fileName) {
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
    };
  });
  instructions.push(setModTypeInstruction);
  renamingRequiredNotify(api, fileName);
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
function installLoose(api, files, fileName) {
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
  renamingRequiredNotify(api, fileName);
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

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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

//Test Fallback installer for binaries folder
function testFallback(files, gameId) {
  let supported = (gameId === spec.game.id);

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

//Fallback installer for binaries folder
function installFallback(api, files, fileName) {
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
  fallbackInstallerNotify(api, fileName);
  return Promise.resolve({ instructions });
}

//Notify User of instructions for Mod Merger Tool
function renamingRequiredNotify(api, fileName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  const MOD_NAME = path.basename(fileName).replace(/(.installing)*(.zip)*(.rar)*(.7z)*/gi, '');
  const NOTIF_ID = `${GAME_ID}-installerrenamingrequired`;
  const MESSAGE = `MANUAL FOLDER RENAMING REQUIRED FOR ${MOD_NAME}`;
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
            text: `You've just installed a mod with loose ".data" files or a folder name containing ".data" without a .forge folder above it. The affected mod is shown below.\n`
              + `\n`
              + `${MOD_NAME}.\n`
              + `\n`
              + `Because the mod author did not package the mod in the correct folder structure, you must manually rename folders in the mod Staging Folder. Pick one of the methods below to rename the folder.\n`
              + `\n`
              + `Check the mod page description to determine what the correct "FORGE_FILE_NAME" should be. You can use the "Open Mod Page" button below. This notification will remain active after opening the mod page.\n`
              + `\n`
              + `EASY MODE: Click the "Show Folder Rename Dialog" button below to open a dialog popup to rename the .forge folder.\n`
              + `\n`
              + `ADVANCED MODE:\n`
              + ` 1. Open the Staging Folder with the button below and rename the folder as indicated.\n`
              + ` 2. Deploy mods in Vortex.\n`
              + ` 3. You will get an "External Changes" popup in Vortex after doing this. Select "Save change (delete file)".\n`
              + `\n`
              + `The correct structure is:  Extracted\\FORGE_FILE_NAME.forge\\DATA_FILE.data.\n`
              + `The .forge folder is already in place for you to rename.\n`
              + `\n`
          }, [
            //*
            { label: `Open Mod Page`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
              log('warn', `Found ${modMatch?.id} for ${MOD_NAME}`);
              let PAGE = ``;
              if (modMatch) {
                const MOD_ID = modMatch.attributes.modId;
                PAGE = `${MOD_ID}?tab=description`;
              }
              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
              util.opn(MOD_PAGE_URL).catch(err => undefined);
              //dismiss();
            }}, //*/
            { label: `Show Folder Rename Dialog`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
              folderRenameDialog(api, modMatch);
              dismiss();
            }}, //*/
            { label: `Open Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, MOD_NAME)).catch(err => undefined);
              dismiss();
            }}, //*/
            { label: 'Close', action: () => dismiss() },
          ]
          );
        },
      },
    ],
  });
}

const RENAME_INPUT_ID = `${GAME_ID}-forgefolderrenameinput`;
async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

async function folderRenameDialog(api, mod) {
  return api.showDialog('question', 'Rename .forge Folder', {
      text: api.translate(`Enter the correct .forge folder name for ${mod.name}:`),
      input: [
          {
              id: RENAME_INPUT_ID,
              label: 'For',
              type: 'text',
              placeholder: RENAME_FOLDER,
          }
      ],
  }, [{ label: 'Cancel' }, { label: 'Rename', default: true }])
  .then(result => { //rename the folder in the mod staging folder
    if (result.action === 'Rename') {
      const name = result.input[RENAME_INPUT_ID];
      if ( ( name.trim() === ( '' || RENAME_FOLDER ) ) || !name.includes(FORGE_EXT) ) {
        api.showErrorNotification('Invalid name entered for .forge folder. You will have to rename the folder manually.', undefined, { allowReport: false });
        return Promise.resolve();
      }
      const state = api.getState();
      STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
      const FOLDER_PATH = path.join(STAGING_FOLDER, mod.installationPath, EXTRACTED_FOLDER);
      const EXISTING = path.join(FOLDER_PATH, RENAME_FOLDER);
      const NEW = path.join(FOLDER_PATH, name);
      rename(api, EXISTING, NEW);
      /*purge(api); //purge mods before renaming folder
      fs.renameAsync(EXISTING, NEW) //rename the folder
      deploy(api); //redeploy mods after renaming folder //*/
    }
    return Promise.resolve();
  })
  .catch(err => {
    api.showErrorNotification('Failed to rename .forge folder. You will have to rename the folder manually.', err, { allowReport: false });
    return Promise.resolve();
  });
}

async function rename(api, EXISTING, NEW) {
  await purge(api); //purge mods before renaming folder
  try {
    fs.statSync(EXISTING); //make sure the folder exists
    await fs.renameAsync(EXISTING, NEW); //rename the folder
  }
  catch (err) {
    api.showErrorNotification('Failed to rename .forge folder. You will have to rename the folder manually.', err, { allowReport: false });
    return Promise.resolve();
  }
  await deploy(api); //redeploy mods after renaming folder
  return Promise.resolve();
}

//Notify User of instructions for Mod Merger Tool
function fallbackInstallerNotify(api, fileName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  const MOD_NAME = path.basename(fileName).replace(/(.installing)*(.zip)*(.rar)*(.7z)*/gi, '');
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
  log('warn', `Found ${modMatch?.id} for ${MOD_NAME}`);
  let PAGE = ``;
  if (modMatch) {
    const MOD_ID = modMatch.attributes.modId;
    PAGE = `${MOD_ID}?tab=description`;
  }
  const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
  const NOTIF_ID = `${GAME_ID}-fallbackinstaller`;
  const MESSAGE = `Fallback installer reached for ${MOD_NAME}`;
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
            text: `You've reached the fallback installer for the mod below. This mod is either not intended to be used with ATK, or it is packaged in a way that Vortex can't handle.\n`
              + `\n`
              + `${MOD_NAME}.\n`
              + `\n`
              + `Please manually verify that the mod is installed correctly. You can open the Staging Folder with the button below.\n`
              + `Check the mod page description with the button below to determine how the mod should be installed.\n`
              + `\n`
          }, [
            //*
            { label: `Open Mod Page`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
              log('warn', `Found ${modMatch?.id} for ${MOD_NAME}`);
              let PAGE = ``;
              if (modMatch) {
                const MOD_ID = modMatch.attributes.modId;
                PAGE = `${MOD_ID}?tab=description`;
              }
              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
              util.opn(MOD_PAGE_URL).catch(err => undefined);
              dismiss();
            }}, //*/
            { label: `Open Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, MOD_NAME)).catch(err => undefined);
              dismiss();
            }}, //*/
            { label: 'Close', action: () => dismiss() },
          ]
          );
        },
      },
    ],
  });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

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

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  await fs.ensureDirWritableAsync(path.join(discovery.path, BUILDTABLE_FOLDER));
  await fs.ensureDirWritableAsync(path.join(discovery.path, SOUND_PATH));
  await downloadAnvil(discovery, api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(discovery.path, EXTRACTED_FOLDER));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: makeRequiresLauncher(context.api, gameSpec),
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
  context.registerInstaller(SOUND_ID, 30, testSound, installSound);
  context.registerInstaller(BUILDTABLE_ID, 35, testIndividualBuildtables, installIndividualBuildtables);
  context.registerInstaller(EXTRACTED_ID, 40, testExtracted, installExtracted);
  context.registerInstaller(FORGEFOLDER_ID, 45, testForgeFolder, installForgeFolder);
  context.registerInstaller(DATAFOLDER_ID, 50, testDataFolder, (files, fileName) => installDataFolder(context.api, files, fileName));
  context.registerInstaller(LOOSE_ID, 55, testLoose, (files, fileName) => installLoose(context.api, files, fileName));
  context.registerInstaller(FORGE_ID, 60, testForge, installForge);
  context.registerInstaller(ROOT_ID, 65, testRoot, installRoot);
  context.registerInstaller(`${GAME_ID}-fallback`, 70, testFallback, (files, fileName) => installFallback(context.api, files, fileName));

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Settings INI', () => {
    const openPath = SETTINGS_FILE;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    const openPath = DOWNLOAD_FOLDER;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
