/*/////////////////////////////////////////////
Name: XXX Vortex Extension
Structure: Frostbite Engine - Frosty Mod Manager
Author: ChemBoy1
Version: 0.1.0
Date: 2026-XX-XX
Notes:
-
/////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');
const fsPromises = require('fs/promises');

const DOCUMENTS = util.getVortexPath("documents");

//Specify all the information about the game
const GAME_ID = "XXX";
const EAAPP_ID = "XXX";
const STEAMAPP_ID = "XXX";
const GOGAPP_ID = null; //not typically available for EA games
//not typically available on Xbox/Epic - available through EA Play instead
const REGISTRY_HIVE = 'HKEY_LOCAL_MACHINE';
const REGISTRY_KEY = 'SOFTWARE\\WOW432Node\\EA Games\\XXX'; // e.g. 'SOFTWARE\\WOW6432Node\\BioWare\\Mass Effect Andromeda'
const REGISTRY_VALUE = 'Install Dir'; // e.g. 'Install Dir'
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  registry: [{ id: `${REGISTRY_HIVE}:${REGISTRY_KEY}:${REGISTRY_VALUE}`}],
};

const GAME_NAME = "XXX";
const GAME_NAME_SHORT = "XXX";
const EXEC = "XXX";
const PCGAMINGWIKI_URL = "XXX";
const EXTENSION_URL = "XXX";

const CONFIG_FOLDER = path.join("XXX", "XXX"); // Developer folder, game subfolder (e.g. "BioWare", "Mass Effect Andromeda")
const FROSTYMOD_FOLDER = "XXX"; // Game-specific folder name inside FrostyModManager/Mods/

//feature toggles
const hasArchives = false; //toggle for .archive file support
const allowSymlinks = false; // Frosty handles its own deployment; symlinks not typical
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const hasUserIdFolder = false; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
const debug = false; //toggle for debug mode

let GAME_PATH = '';
let GAME_VERSION = ''; //Game version
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Info for modtypes, installers, and tools
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";

const FROSTYMOD_ID = `${GAME_ID}-frostymod`;
const FROSTYMOD_NAME = "Frosty .fbmod/.archive";
let FROSTYMOD_EXTS = [".fbmod"];
if (hasArchives) FROSTYMOD_EXTS.push(".archive");
const FROSTYMOD_PATH = path.join("FrostyModManager", "Mods", FROSTYMOD_FOLDER);
const MODDATA_FOLDER = 'ModData';

const FROSTY_ID = `${GAME_ID}-frostymodmanager`;
const FROSTY_NAME = "Frosty Mod Manager";
const FROSTY_FOLDER = "FrostyModManager";
const FROSTY_EXEC = 'frostymodmanager.exe';
const FROSTY_URL = "https://github.com/CadeEvs/FrostyToolsuite/releases/download/v1.0.6.3/FrostyModManager.zip";
const FROSTY_URL_ERR = `https://github.com/CadeEvs/FrostyToolsuite/releases`;

const PATCH_ID = `${GAME_ID}-patch`;
const PATCH_NAME = "DatapathFix Plugin";
const PATCH_PATH = path.join(FROSTY_FOLDER, "Plugins");
const PATCH_FILE = 'DatapathFixPlugin.dll';
const PATCH_URL = `https://github.com/Dyvinia/DatapathFixPlugin/releases/download/v1.7.1/DatapathFixPlugin.dll`;
const PATCH_URL_ERR = `https://github.com/Dyvinia/DatapathFixPlugin/releases`;

const PLUGIN_ID = `${GAME_ID}-plugin`;
const PLUGIN_NAME = "Plugin (FMM)";
const PLUGIN_PATH = path.join(FROSTY_FOLDER, "Plugins");
const PLUGIN_EXTS = ['.dll'];

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config Folder";
const CONFIG_PATH = path.join(DOCUMENTS, CONFIG_FOLDER);

const MOD_PATH_DEFAULT = FROSTYMOD_PATH; //default here to accommodate FOMODs
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];
let MODTYPE_FOLDERS = [FROSTYMOD_PATH, PATCH_PATH]; // Folders to ensure are writable on setup
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];

// Filled in from data above
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
      "steamAppId": +STEAMAPP_ID,
      //"EAAppId": EAAPP_ID,
      //"gogAppId": null,
      "supportsSymlinks": allowSymlinks,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
      "compatible": { "dinput": false, "enb": false },
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      //"EAAPPId": EAAPP_ID,
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
      "id": FROSTYMOD_ID,
      "name": FROSTYMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', FROSTYMOD_PATH)
    },
    {
      "id": PLUGIN_ID,
      "name": PLUGIN_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', PLUGIN_PATH)
    },
    {
      "id": FROSTY_ID,
      "name": FROSTY_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: 'FrostyModManagerLaunch',
    name: 'Launch Modded Game',
    logo: 'exec.png',
    executable: () => FROSTY_EXEC,
    requiredFiles: [
      FROSTY_EXEC,
    ],
    relative: true,
    detach: true,
    exclusive: true,
    //shell: true,
    parameters: [
      '-launch Default',
    ],
    defaultPrimary: true,
  },
  {
    id: FROSTY_ID,
    name: FROSTY_NAME,
    logo: 'frosty.png',
    executable: () => FROSTY_EXEC,
    requiredFiles: [
      FROSTY_EXEC,
    ],
    relative: true,
    detach: true,
    exclusive: true,
    //parameters: [],
  }
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////////////////

//Set mod type priorities
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch (err) {
    return false;
  }
}

async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch (err) {
    return false;
  }
}

async function getAllFiles(dirPath) {
  let results = [];
  try {
    const entries = await fs.readdirAsync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.statAsync(fullPath);
      if (stats.isDirectory()) { // Recursively get files from subdirectories
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else { // Add file to results
        results.push(fullPath);
      }
    }
  } catch (err) {
    log('warn', `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}

async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  try {
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch (err) { //this happens if the executable comes back as "undefined", usually caused by the another app locking down the folder
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Find the game installation folder
function makeFindGame(api, gameSpec) {
  try {
    const instPath = winapi.RegGetValue(
      REGISTRY_HIVE,
      REGISTRY_KEY,
      REGISTRY_VALUE);
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
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

// AUTO-DOWNLOAD FUNCTIONS /////////////////////////////////////////////////////////////////////

//Check if mod injector is installed
function isFrostyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === FROSTY_ID);
}

//Check if Patch is installed
async function isPatchInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test = Object.keys(mods).some(id => mods[id]?.type === PATCH_ID);
  if (!test) {
    try {
      await fs.statAsync(path.join(GAME_PATH, PATCH_PATH, PATCH_FILE));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//Function to auto-download Frosty Mod Manager
async function downloadFrosty(discovery, api, gameSpec, check = true) {
  let modLoaderInstalled = isFrostyInstalled(api, gameSpec);
  if (!modLoaderInstalled || !check) {
    const NOTIF_ID = `${GAME_ID}-frosty-installing`
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: 'Installing Frosty Mod Manager',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try { //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'Frosty Mod Manager',
      };
      //dlInfo = {};
      const URL = FROSTY_URL;
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
    } catch (err) { //Show the user the download page if the download and install process fails
      api.showErrorNotification('Failed to download/install Frosty Mod Manager', err);
      util.opn(FROSTY_URL_ERR).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// Download Patch from GitHub
async function downloadPatch(api, gameSpec, check) {
  GAME_PATH = getDiscoveryPath(api);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(api.getState(), GAME_ID);
  if (GAME_VERSION === 'steam') {
    api.showErrorNotification(`SDK Patch is not needed for the Steam version of the game`, undefined, { allowReport: false });
    return;
  }
  let isInstalled = await isPatchInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = PATCH_NAME;
    const MOD_TYPE = PATCH_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    const URL = PATCH_URL;
    const URL_ERR = PATCH_URL_ERR;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //*Only start-download with Promise
      return new Promise((resolve, reject) => {
        api.events.emit('start-download', [URL], dlInfo, undefined,
          async (error, dlid) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            try { //find the file in Download and copy it to the game folder
              api.sendNotification({ //notification indicating copy process
                id: `${NOTIF_ID}-copy`,
                message: `Copying ${MOD_NAME} dll to game folder`,
                type: 'activity',
                noDismiss: true,
                allowSuppress: false,
              });
              let files = await fs.readdirAsync(DOWNLOAD_FOLDER);
              files = files.filter(file => ( path.basename(file).includes(path.basename(PATCH_FILE, 'dll'))))
                .sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                .reverse();
              const copyFile = files[0];
              await fs.statAsync(path.join(DOWNLOAD_FOLDER, copyFile));
              const source = path.join(DOWNLOAD_FOLDER, copyFile);
              const destination = path.join(GAME_PATH, PATCH_PATH, PATCH_FILE);
              await fs.copyAsync(source, destination, { overwrite: true });
              api.dismissNotification(NOTIF_ID);
              api.dismissNotification(`${NOTIF_ID}-copy`);
              api.sendNotification({ //notification copy success
                id: `${NOTIF_ID}-success`,
                message: `Successfully copied ${MOD_NAME} dll to game folder`,
                type: 'success',
                noDismiss: false,
                allowSuppress: true,
              });
            } catch (err) {
              api.showErrorNotification(`Failed to download and copy ${MOD_NAME} dll`, err, { allowReport: false });
              util.opn(URL_ERR).catch(() => null);
              return reject(err);
            }
            finally {
              api.dismissNotification(NOTIF_ID);
              api.dismissNotification(`${NOTIF_ID}-copy`);
              return resolve();
            }
          },
          'never',
          { allowInstall: false },
        );
      });
    } catch (err) { //Show the user the download page if the download and copy process fails
      api.showErrorNotification(`Failed to download and copy ${MOD_NAME} dll`, err, { allowReport: false });
      util.opn(URL_ERR).catch(() => null);
      api.dismissNotification(NOTIF_ID);
      api.dismissNotification(`${NOTIF_ID}-copy`);
    }
  }
} //*/

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for Frosty Manager files
function testFrosty(files, gameId) {
  const isFrosty = files.some(file => (path.basename(file).toLowerCase() === FROSTY_EXEC));
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
  const modFile = files.find(file => (path.basename(file).toLowerCase() === FROSTY_EXEC));
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
      destination: path.join(FROSTY_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for .fbmod files
function testFbmod(files, gameId) {
  const isMod = files.some(file => FROSTYMOD_EXTS.includes(path.extname(file).toLowerCase()));
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

/*Install .fbmod files - SIMPLE VERSION
function installFbmod(files) {
  const modFile = files.find(file => FROSTYMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FROSTYMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep))));
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
} //*/

//install .fbmod/.archive mod files (variant handler)
async function installFbmod(api, files) {
  const fileExt = FROSTYMOD_EXTS;
  const modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
  const modType = {
    type: 'setmodtype',
    value: FROSTYMOD_ID,
  };
  const installFiles = (modFiles.length > FROSTYMOD_EXTS.length)
    ? await chooseFilesToInstall(api, modFiles, fileExt)
    : modFiles;
  let instructions = installFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.basename(file)
    };
  });
  instructions.push(modType);
  return Promise.resolve({ instructions });
}

//file selection dialog for .fbmod/.archive mods
async function chooseFilesToInstall(api, files, fileExt) {
  const t = api.translate;
  return api.showDialog('question', t('Multiple {{ext}} files', { replace: { ext: fileExt } }), {
    text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: fileExt } }) +
        `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
    checkboxes: files.map((file) => {
      return {
          id: file,
          text: file,
          value: false
      };
    })
    }, [
      { label: 'Cancel' },
      { label: 'Install Selected' },
      { label: 'Install All_plural' }
  ]).then((result) => {
      if (result.action === 'Cancel')
          return Promise.reject(new util.UserCanceled('User cancelled.'));
      else {
          const installAll = (result.action === 'Install All' || result.action === 'Install All_plural');
          const installPAKS = installAll ? files : Object.keys(result.input).filter(s => result.input[s])
            .map(file => files.find(f => f === file));
          return installPAKS;
      }
  });
}

//Test for FMM plugin files
function testPlugin(files, gameId) {
  const isMod = files.some(file => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install Frosty Manager files
function installPlugin(files) {
  const modFile = files.find(file => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PLUGIN_ID };

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

//Fallback installer to root folder
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

//Fallback installer to root folder
function installFallback(api, files, destinationPath) {
  fallbackInstallerNotify(api, destinationPath);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };
  
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: file,
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

function fallbackInstallerNotify(api, modName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, spec.game.id);
  modName = path.basename(modName, '.installing');
  const id = modName.replace(/[^a-zA-Z0-9\s]*( )*/gi, '').slice(0, 20);
  const NOTIF_ID = `${GAME_ID}-${id}-fallback`;
  const MESSAGE = 'Fallback installer reached for ' + modName;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'info',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `The mod you just installed reached the fallback installer. This means Vortex could not determine where to place these mod files.\n`
                + `Please check the mod page description and review the files in the mod staging folder to determine if manual file manipulation is required.\n`
                + `\n`
                + `If you think that Vortex should be capable to install this mod to a specific folder, please contact the extension developer for support at the link below.\n`
                + `\n`
                + `Mod Name: ${modName}.\n`
                + `\n`             
          }, [
            { label: 'Continue', action: () => dismiss() },
            {
              label: 'Contact Ext. Developer', action: () => {
                util.opn(`${EXTENSION_URL}?tab=posts`).catch(() => null);
                dismiss();
              }
            }, //*/
            //*
            { label: `Open Mod Page + Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === modName);
              log('warn', `Found ${modMatch?.id} for ${modName}`);
              let PAGE = ``;
              if (modMatch) {
                const MOD_ID = modMatch.attributes.modId;
                if (MOD_ID !== undefined) {
                  PAGE = `${MOD_ID}?tab=description`; 
                }
              }
              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
              util.opn(MOD_PAGE_URL).catch(() => null);
              dismiss();
            }}, //*/
          ]);
        },
      },
    ],
  });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User to run Frosty after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = FROSTY_NAME;
  const MESSAGE = `Run ${MOD_NAME}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Frosty',
        action: (dismiss) => {
          runFrosty(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `After installing new mods, you must run ${MOD_NAME} to install them to the game's data files.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run Frosty', action: () => {
                runFrosty(api);
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

function runFrosty(api) {
  const TOOL_ID = FROSTY_ID;
  const TOOL_NAME = FROSTY_NAME;
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

function setupNotify(api, gameSpec) {
  const NOTIF_ID = `${GAME_ID}-setup-notify`;
  const MESSAGE = 'IMPORTANT: DatapathFix for Steam/Epic Versions';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Download DatapathFix', 
        action: (dismiss) => {
          downloadPatch(api, gameSpec, true);
          dismiss();
        }
      },
      {
        title: 'More',
        action: (dismiss) => {
          const replace = {
            game: gameSpec.game.shortName,
            bl: '[br][/br][br][/br]',
          };
          const t = api.translate;
          api.showDialog('info', MESSAGE, {
            bbcode: t(`If you have the license for SWBF2 from Steam or Epic, you need to use the ${PATCH_NAME}.{{bl}}`
              + `You can download the plugin using the button below or within the folder icon on the Mods page toolbar.{{bl}}`
              + `Once downloaded, start Frosty and go to Options > DatapathFix Options > set "Enabled" checkbox.{{bl}}`
              + `Without this step, your mods will NOT load in the game on Steam and Epic versions.{{bl}}`
              + `[img]https://live.staticflickr.com/65535/55239407657_9cb28562aa_n.jpg[/img]`
              + '{{bl}}'
              + `[img]https://live.staticflickr.com/65535/55240681830_e246926ca6.jpg[/img]`
              + '{{bl}}',
              { replace }
            ),
          }, [
          { label: 'Continue', action: () => dismiss() },
          {
            label: 'Download DatapathFix', action: () => {
              downloadPatch(api, gameSpec, true);
              dismiss();
            }
          },
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
async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  if (setupNotification) setupNotify(api, gameSpec);
  await downloadFrosty(discovery, api, gameSpec);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    //queryArgs: gameFinderQuery,
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
  context.registerInstaller(FROSTY_ID, 25, testFrosty, installFrosty);
  context.registerInstaller(FROSTYMOD_ID, 30, testFbmod, (files) => installFbmod(context.api, files));
  context.registerInstaller(PLUGIN_ID, 35, testPlugin, installPlugin);
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${PATCH_NAME}`, () => {
    downloadPatch(context.api, gameSpec, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Remove ${PATCH_NAME}`, () => {
    removePatch(context.api);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Delete ModData Folder', () => {
    deleteModData(context.api);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = CONFIG_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Frosty Mods Folder', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, FROSTYMOD_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open PCGamingWiki Page', () => {
    util.opn(PCGAMINGWIKI_URL).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    util.opn(path.join(__dirname, 'CHANGELOG.md')).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Submit Bug Report', () => {
    util.opn(`${EXTENSION_URL}?tab=bugs`).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    util.opn(DOWNLOAD_FOLDER).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

async function deleteModData(api) {
  const t = api.translate;
  let choices = [
    { label: t("Continue") },
    { label: t("Cancel") },
  ];
  const result = await api.showDialog('question', `Delete ModData Folder`, {
    text: `\n`
      + `Are you sure you want to delete the ModData folder?\n`
      + `\n`
      + `Frosty will rebuild the ModData folder on next launch.`,
  }, choices)
  if (result === undefined  || result.action === "Cancel") {
    return;
  }
  GAME_PATH = getDiscoveryPath(api);
  const modDataPath = path.join(GAME_PATH, MODDATA_FOLDER);
  try {
    await fsPromises.rm(modDataPath, { recursive: true });
    api.sendNotification({
      id: `${GAME_ID}-deletemoddata`,
      type: 'success',
      message: `Successfully Deleted ModData Folder`,
      allowSuppress: true,
      actions: [],
    });
  } catch (err) {
    api.showErrorNotification('Failed to delete ModData folder', err, { allowReport: false });
  }
}

async function removePatch(api) {
  const t = api.translate;
  let choices = [
    { label: t("Continue") },
    { label: t("Cancel") },
  ];
  const result = await api.showDialog('question', `Remove ${PATCH_NAME}`, {
    text: `\n`
      + `Are you sure you want to remove the ${PATCH_NAME}?\n`
      + `\n`
  }, choices)
  if (result === undefined  || result.action === "Cancel") {
    return;
  }
  GAME_PATH = getDiscoveryPath(api);
  const pluginPath = path.join(GAME_PATH, PATCH_PATH, PATCH_FILE);
  try {
    await fs.unlinkAsync(pluginPath);
    api.sendNotification({
      id: `${GAME_ID}-removepatch`,
      type: 'success',
      message: `Successfully Removed ${PATCH_NAME}`,
      allowSuppress: true,
      actions: [],
    });
  } catch (err) {
    api.showErrorNotification(`Failed to remove ${PATCH_NAME}`, err, { allowReport: false });
  }
}

//export to Vortex
module.exports = {
  default: main,
};
