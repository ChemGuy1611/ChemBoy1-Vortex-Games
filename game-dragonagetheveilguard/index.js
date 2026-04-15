/*////////////////////////////////////////////////////
Name: Dragon Age: The Veilguard Vortex Extension
Structure: 3rd Party Mod Manager (Frosty)
Author: ChemBoy1
Version: 0.3.0
Date: 2026-02-26
////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');
const fsPromises = require('fs/promises');

//Specify all the information about the game
const EAAPP_ID = "";
const STEAMAPP_ID = "1845910";
const EPICAPP_ID = "chamaelejp"; //from egdata.app
const REGISTRY_NAME = "Dragon Age The Veilguard";
const GAME_ID = "dragonagetheveilguard";
const EXEC = "Dragon Age The Veilguard.exe";
const EXEC_EA = EXEC;
const EXEC_EPIC = EXEC; //NEED TO VERIFY
const EXEC_ALT = "morrison.main_win64_final.exe";
const GAME_NAME = "Dragon Age: The Veilguard";
const GAME_NAME_SHORT = "DA Veilguard";
let GAME_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const DOCUMENTS = util.getVortexPath("documents");
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Dragon_Age:_The_Veilguard";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1075"; //Nexus link to this extension. Used for links
const INSTR_URL = `https://docs.google.com/document/d/1F6X8fjh6RS_IHX7cqx36lyhCEpLPZSYknki-M28w_K0`;

const EA_FILE = path.join('Support', 'EA Help');
const EPIC_FILE = 'XXX'; //not known until in egdata.app

//info for modtypes, installers, and tools
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";

const FROSTYMANAGER_ID = `${GAME_ID}-frostymanager`;
const FROSTYMANAGER_NAME = "Frosty Mod Manager";
const FROSTYMANAGER_PATH = path.join("FrostyModManager");
const FROSTY_EXEC = 'frostymodmanager.exe';
const FROSTY_TOOL_ID = 'FrostyModManager';
const MODDATA_FOLDER = 'ModData';

const FROSTYMOD_FOLDER = "Dragon Age The Veilguard";
const FROSTYMOD_ID = `${GAME_ID}-frostymod`;
const FROSTYMOD_NAME = "Frosty .fbmod/.archive";
const FROSTYMOD_EXTS = [".fbmod", ".archive"];
const FROSTYMOD_PATH = path.join(FROSTYMANAGER_PATH, "Mods", FROSTYMOD_FOLDER);

const SDKPATCH_ID = `${GAME_ID}-sdkpatch`;
const SDKPATCH_NAME = "SDK Patch (EA/Epic)";
const SDKPATCH_PATH = path.join(FROSTYMANAGER_PATH, "Profiles");
const SDKPATCH_FILE = 'DragonAgeTheVeilguardSDK.dll';
const SDKPATCH_URL = `https://github.com/J-Lyt/FrostyToolsuite/releases/latest/download/DragonAgeTheVeilguardSDK.dll`;
const SDKPATCH_URL_ERR = `https://github.com/J-Lyt/FrostyToolsuite/releases/`;

const DAVEX_ID = `${GAME_ID}-davex`;
const DAVEX_NAME = "DAVExtender";
const DAVEX_PATH = '.';
const DAVEX_FILE = 'd3d11.dll';
const DAVEX_PAGE_NO = 2315;
const DAVEX_FILE_NO_STEAM = 10169; //different files for Steam/EA
const DAVEX_FILE_NO_EA = 10168;
const DAVEX_DOMAIN = GAME_ID;

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config (LocalAppData)";
const CONFIG_PATH = path.join(DOCUMENTS, "BioWare", "Dragon Age The Veilguard", "settings");
const CONFIG_FILE = "profile.ini";

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Config (LocalAppData)";
const SAVE_FOLDER = path.join(DOCUMENTS, "BioWare", "Dragon Age The Veilguard", "save games");
let USERID_FOLDER = "";
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}
try {
  const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
} //*/
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_EXT = ".csav";

// Information for Frosty Mod Manager Alpha downloader and updater
const FROSTY_ARC_NAME = 'FrostyModManager_2026.02.01.0.zip';
const AUTHOR = 'J-Lyt'; // Author of the Frosty Mod Manager Alpha fork
const REPO = 'FrostyToolsuite'; // Repository name on GitHub
const FROSTY_URL = 'https://github.com/J-Lyt/FrostyToolsuite';
const FROSTY_URL_MAIN = `https://api.github.com/repos/${AUTHOR}/${REPO}`;
const FROSTY_FILE = 'FrostyModManager.exe'; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.
const REQUIREMENTS = [
  { //Frosty Mod Manager Alpha
    archiveFileName: FROSTY_ARC_NAME,
    modType: FROSTYMANAGER_ID,
    assemblyFileName: FROSTY_FILE,
    userFacingName: FROSTYMANAGER_NAME,
    githubUrl: FROSTY_URL_MAIN,
    findMod: (api) => findModByFile(api, FROSTYMANAGER_ID, FROSTY_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, FROSTY_ARC_NAME),
    fileArchivePattern: new RegExp(/^FrostyModManager_(\d+\.\d+\.\d+\.\d+)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
  },
];

const MOD_PATH_DEFAULT = ".";
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];

//Filled in from info above
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
      EXEC,
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "EAAppId": EAAPP_ID,
      "epicAppId": EPICAPP_ID,
      "supportsSymlinks": false,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "EAAPPId": EAAPP_ID
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
      "id": DAVEX_ID,
      "name": DAVEX_NAME,
      "priority": "low",
      "targetPath": path.join('{gamePath}', DAVEX_PATH)
    },
    {
      "id": SDKPATCH_ID,
      "name": SDKPATCH_NAME,
      "priority": "low",
      "targetPath": path.join('{gamePath}', SDKPATCH_PATH)
    },
    {
      "id": FROSTYMOD_ID,
      "name": FROSTYMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', FROSTYMOD_PATH)
    },
    {
      "id": FROSTYMANAGER_ID,
      "name": FROSTYMANAGER_NAME,
      "priority": "low",
      "targetPath": path.join('{gamePath}', FROSTYMANAGER_PATH)
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
  {
    id: 'FrostyModManagerLaunch',
    name: 'Launch Modded Game',
    logo: 'exec.png',
    executable: () => FROSTY_EXEC,
    requiredFiles: [
      FROSTY_EXEC,
    ],
    relative: true,
    detached: true,
    exclusive: true,
    defaultPrimary: true,
    parameters: [
      '-launch Default'
    ],
  }, //*/
  {
    id: FROSTY_TOOL_ID,
    name: FROSTYMANAGER_NAME,
    logo: 'frosty.png',
    executable: () => FROSTY_EXEC,
    requiredFiles: [
      FROSTY_EXEC,
    ],
    relative: true,
    detached: true,
    exclusive: true,
    //parameters: [],
  }, //*/
  {
    id: `${GAME_ID}-directlaunch`,
    name: 'Direct Launch',
    logo: 'exec.png',
    executable: () => EXEC,
    requiredFiles: [
      EXEC,
    ],
    relative: true,
    detached: true,
    exclusive: true,
    //defaultPrimary: true,
    //parameters: [],
  }, //*/
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////

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
      `SOFTWARE\\WOW6432Node\\BioWare\\${REGISTRY_NAME}`,
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

//Setup launcher requirements (Steam, Epic, GOG, GamePass, etc.). More parameters required for Epic and GamePass
async function requiresLauncher(gamePath, store) {
  /*if (store === 'xbox') {
    return Promise.resolve({
        launcher: 'xbox',
        addInfo: {
            appId: XBOXAPP_ID,
            parameters: [{ appExecName: XBOXEXECNAME }],
        },
    });
  } //*/
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (await statCheckAsync(gamePath, EA_FILE)) {
    GAME_VERSION = 'ea';
    return GAME_VERSION;
  }
  /*if (await statCheckAsync(gamePath, EPIC_FILE)) {
    GAME_VERSION = 'epic';
    return GAME_VERSION;
  } //*/
  GAME_VERSION = 'steam';
  return GAME_VERSION;
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (statCheckSync(discoveryPath, EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    return EXEC_EPIC;
  };
  return EXEC;
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

const getDiscoveryPath = (api) => { //get the game's discovered path
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// AUTO-DOWNLOAD FUNCTIONS ///////////////////////////////////////////////////

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await testRequirementVersion(api, REQUIREMENTS[0]);
  } catch (err) {
    log('warn', `failed to test Frosty Mod Manager version: ${err}`);
  }
}

async function checkForFrosty(api) {
  const mod = await REQUIREMENTS[0].findMod(api);
  return mod !== undefined;
}

//Check if mod injector is installed
function isFrostyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === FROSTYMANAGER_ID);
}

//Check if DAVExtender is installed
function isDavexInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === DAVEX_ID);
}

//Check if SDK Patch is installed
async function isSdkPatchInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test = Object.keys(mods).some(id => mods[id]?.type === SDKPATCH_ID);
  if (!test) {
    try {
      await fs.statAsync(path.join(GAME_PATH, SDKPATCH_PATH, SDKPATCH_FILE));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//* Function to download DAVExtender from Nexus Mods
async function downloadDavex(api, gameSpec) {
  let isInstalled = isDavexInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = DAVEX_NAME;
    const MOD_TYPE = DAVEX_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = DAVEX_PAGE_NO;
    let FILE_ID = DAVEX_FILE_NO_STEAM; //variable on game version
    if (GAME_VERSION === 'ea') {
      FILE_ID = DAVEX_FILE_NO_EA;
    }
    const GAME_DOMAIN = DAVEX_DOMAIN;
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
      let FILE = FILE_ID;
      const URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

/* Download SDK Patch from GitHub
async function downloadSdkPatch(api, gameSpec, check) {
  let isInstalled = isSdkPatchInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = SDKPATCH_NAME;
    const MOD_TYPE = SDKPATCH_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    const URL = SDKPATCH_URL;
    const URL_ERR = SDKPATCH_URL_ERR;
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
      //const dlInfo = {};
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) {
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err, { allowReport: false });
      util.opn(URL_ERR).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// Download SDK Patch from GitHub
async function downloadSdkPatch(api, gameSpec, check) {
  GAME_PATH = getDiscoveryPath(api);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(api.getState(), GAME_ID);
  if (GAME_VERSION === 'steam') {
    api.showErrorNotification(`SDK Patch is not needed for the Steam version of the game`, undefined, { allowReport: false });
    return;
  }
  let isInstalled = await isSdkPatchInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = SDKPATCH_NAME;
    const MOD_TYPE = SDKPATCH_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    const URL = SDKPATCH_URL;
    const URL_ERR = SDKPATCH_URL_ERR;
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
              files = files.filter(file => ( path.basename(file).includes(path.basename(SDKPATCH_FILE, 'dll'))))
                .sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                .reverse();
              const copyFile = files[0];
              await fs.statAsync(path.join(DOWNLOAD_FOLDER, copyFile));
              const source = path.join(DOWNLOAD_FOLDER, copyFile);
              const destination = path.join(GAME_PATH, SDKPATCH_PATH, SDKPATCH_FILE);
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
  const setModTypeInstruction = { type: 'setmodtype', value: FROSTYMANAGER_ID };

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

//Test for DAVExtender files
function testDavex(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === DAVEX_FILE));
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

//Install DAVExtender files
function installDavex(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === DAVEX_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DAVEX_ID };

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

//Test for SDK Patch files
function testSdkPatch(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === SDKPATCH_FILE));
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

//Install SDK Patch files
function installSdkPatch(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === SDKPATCH_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SDKPATCH_ID };

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
function testFbmod(files, gameId) {
  const isMod = files.find(file => FROSTYMOD_EXTS.includes(path.extname(file).toLowerCase())) !== undefined;
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
function installFbmod(files) {
  const modFile = files.find(file => FROSTYMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FROSTYMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) && 
    (!file.endsWith(path.sep))
  ));
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

//Notify User of Setup instructions for Mod Managers
function setupNotify(api, gameSpec) {
  const MOD_NAME = FROSTYMANAGER_NAME;
  const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-notification`;
  const MESSAGE = `${MOD_NAME} Alpha Instructions`;
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
            text: `${MOD_NAME} Alpha is required to install .fbmod files into the game's data files.\n`
                + `Use the button below to open important instructions in your browser on how to set up ${MOD_NAME} Alpha.\n`
              }, [
                  { label: `Open Instructions`, action: () => {
                    util.opn(INSTR_URL).catch(err => undefined);
                    dismiss();
                  }},
                  { label: 'Close', action: () => dismiss() },
                  { label: 'Never Show Again', action: () => {
                    api.suppressNotification(NOTIF_ID);
                    dismiss();
                  }},
                ]
            );
        },
      },
    ],
  });    
}

//Notify User to run ATK after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = FROSTYMANAGER_NAME;
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
  const TOOL_ID = FROSTY_TOOL_ID;
  const TOOL_NAME = FROSTYMANAGER_NAME;
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
  setupNotify(api, gameSpec);
  GAME_VERSION = await setGameVersion(GAME_PATH);
  //await downloadDavex(api, gameSpec);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, SDKPATCH_PATH));
  if (GAME_VERSION === 'ea' || GAME_VERSION === 'epic') {
    await downloadSdkPatch(api, gameSpec, true);
  }
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, FROSTYMOD_PATH));
  const FrostyInstalled = await checkForFrosty(api);
  return FrostyInstalled ? Promise.resolve() : download(api, REQUIREMENTS);
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

  //register mod types explicitlty (partion check)
  

  //register mod installers
  context.registerInstaller(FROSTYMANAGER_ID, 25, testFrosty, installFrosty);
  context.registerInstaller(DAVEX_ID, 27, testDavex, installDavex);
  context.registerInstaller(SDKPATCH_ID, 29, testSdkPatch, installSdkPatch);
  //context.registerInstaller(FROSTYPATCH, 31, testFrostyPatch, installFrostyPatch);
  context.registerInstaller(FROSTYMOD_ID, 33, testFbmod, installFbmod);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download DAVExtender', () => {
    downloadDavex(context.api, gameSpec);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download SDK Patch Latest (EA/Epic)', () => {
    downloadSdkPatch(context.api, gameSpec, false);
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open FMM GitHub Page', () => {
    util.opn(FROSTY_URL).catch(() => null);
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    const openPath = SAVE_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Frosty Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, FROSTYMOD_PATH);
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
    const openPath = DOWNLOAD_FOLDER;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });

  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
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
    context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(context.api, gameId, mods, forced);
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
