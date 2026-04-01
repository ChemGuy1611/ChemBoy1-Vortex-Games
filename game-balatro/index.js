/*///////////////////////////////////////
Name: Balatro Vortex Extension
Structure: Mod Loader (Mods in AppData Folder)
Author: ChemBoy1
Version: 0.2.0
Date: 2026-02-24
///////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');
const semver = require('semver');
const { parseStringPromise } = require('xml2js');

//Specify all the information about the game
const GAME_ID = "balatro";
const GAME_NAME = "Balatro";
const GAME_NAME_SHORT = "Balatro";
const STEAMAPP_ID = "2379780";
const XBOXAPP_ID = "PlayStack.Balatro";
const XBOXEXECNAME = "Balatro";
const XBOX_PUB_ID = "3wcqaesafpzfy";

const EXEC_STEAM = `Balatro.exe`;
const EXEC_XBOX = `gamelaunchhelper.exe`;
const PCGAMINGWIKI_URL = `https://www.pcgamingwiki.com/wiki/Balatro`;
const EXTENSION_URL = `https://www.nexusmods.com/site/mods/1315`;

let GAME_VERSION = '';
let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//Info for mod types and installers
const APPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");
const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Mod";
let MOD_PATH = path.join(APPDATA, "Balatro", "Mods");
const MOD_EXTS = ['.lua'];
const MOD_FOLDERS = ['assets', 'libs', 'localization', 'lovely', 'lsp_def', 'api', 'utils'];

//Xbox version info
//there are ZERO identical files between Xbox and Steam versions. Would have to remove requiredFiles.
const DATA_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_PUB_ID}`, "LocalCache", "Local", "LOVE", "Assets");
const MOD_PATH_XBOX = path.join(DATA_PATH_XBOX, "lovelymods");
const XBOX_INSTALLER_URL = "https://codeberg.org/frostice482/balatro-xbgp/raw/branch/new/install.bat";
const XBOX_INSTALLER_SCRIPT = "install.bat";
const XBOX_INSTALLER_ID = `${GAME_ID}-xboxinstallscript`;
const XBOX_INSTALLER_NAME = "Xbox Install Script";
const XBOX_INSTALLER_PATH = '.';
//////////////////*/

const MALVERK_ID = `${GAME_ID}-malverk`;
const MALVERK_NAME = "Malverk (Texture Pack Manager)";
const MALVERK_PATH = MOD_PATH;
const MALVERK_FILE = 'malverk.lua';
const MALVERK_URL = 'https://github.com/Eremel/Malverk/archive/refs/heads/main.zip';

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const LOVELY_ID = `${GAME_ID}-LOVELY`;
const LOVELY_NAME = "Lovely-Injector";
const LOVELY_FILE = "version.dll"; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.
const LOVELY_URL = 'https://github.com/ethangreen-dev/lovely-injector/releases/download/v0.7.1/lovely-x86_64-pc-windows-msvc.zip';
const LOVELY_URL_LATEST = 'https://github.com/ethangreen-dev/lovely-injector/releases/latest/download/lovely-x86_64-pc-windows-msvc.zip';
const LOVELY_URL_MANUAL = 'https://github.com/ethangreen-dev/lovely-injector/releases';

// Information for Lovely Injector downloader and updater
const LOVELY_ARC_NAME = 'lovely-x86_64-pc-windows-msvc.zip';
const AUTHOR = 'ethangreen-dev';
const REPO = 'lovely-injector';
const LOVELY_URL_MAIN = `https://api.github.com/repos/${AUTHOR}/${REPO}`;
const REQUIREMENTS = [
  { //lovely injector
    archiveFileName: LOVELY_ARC_NAME,
    modType: LOVELY_ID,
    assemblyFileName: LOVELY_FILE,
    userFacingName: LOVELY_NAME,
    githubUrl: LOVELY_URL_MAIN,
    findMod: (api) => findModByFile(api, LOVELY_ID, LOVELY_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, LOVELY_ARC_NAME),
    fileArchivePattern: new RegExp(/^lovely-x86_64-pc-windows-msvc/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
    //resolveVersion: (api) => resolveVersionByFile(api, REQUIREMENTS[0]),
  },
];

//* Function to resolve version by a means other than the archive name - WORK IN PROGRESS - NOT FINISHED
async function resolveVersionByFile(api, requirement) {
  const state = api.getState();
  const files = util.getSafe(state, ['persistent', 'downloads', 'files'], []);
  const latestVersion = Object.values(files).reduce((prev, file) => {
    const match = requirement.fileArchivePattern.exec(file.localPath);
    if ((match === null || match === void 0 ? void 0 : match[1]) && semver.gt(match[1], prev)) {
        prev = match[1];
    }
    return prev;
  }, '0.0.0');
  return latestVersion;
} //*/

const STEAMMODDED_ID = `${GAME_ID}-steammodded`;
const STEAMMODDED_NAME = "SteamModded";
const STEAMMODDED_PATH = MOD_PATH;
const STEAMMODDED_FILE = "tk_debug_window.py";
//const STEAMMODDED_FILE2 = "tk_debug_window.py";
const STEAMMODDED_PAGE_NO = 45;
const STEAMMODDED_FILE_NO = 878;

const REQ_FILE = EXEC_STEAM;
//const REQ_FILE = `love.dll`;

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(APPDATA, "Balatro");
const CONFIG_PATH_XBOX = path.join(DATA_PATH_XBOX);
const CONFIG_FILE = "settings.jkr";
let CONFIG_FILEPATH = path.join(CONFIG_PATH, CONFIG_FILE);
const CONFIG_FILEPATH_XBOX = path.join(CONFIG_PATH_XBOX, CONFIG_FILE);

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
let SAVE_PATH = path.join(APPDATA, "Balatro");
const SAVE_PATH_XBOX = path.join(DATA_PATH_XBOX);

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC_STEAM,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": false,
    "requiredFiles": [
      REQ_FILE,
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "xboxAppId": XBOXAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": MOD_PATH
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": LOVELY_ID,
      "name": LOVELY_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
    {
      "id": STEAMMODDED_ID,
      "name": STEAMMODDED_NAME,
      "priority": "low",
      "targetPath": STEAMMODDED_PATH
    },
    {
      "id": MALVERK_ID,
      "name": MALVERK_NAME,
      "priority": "low",
      "targetPath": MALVERK_PATH
    }
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //XBOXAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  
];

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

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

async function requiresLauncher(gamePath, store) {
  if (store === 'xbox') {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  } //*/
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable, add to required files, set paths for mod types
function getExecutable(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    SAVE_PATH = SAVE_PATH_XBOX;
    CONFIG_FILEPATH = CONFIG_FILEPATH_XBOX;
    return EXEC_XBOX;
  };
  GAME_VERSION = 'steam';
  return EXEC_STEAM;
}

//Get correct executable, add to required files, set paths for mod types
async function setGameVersion(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    SAVE_PATH = SAVE_PATH_XBOX;
    CONFIG_FILEPATH = CONFIG_FILEPATH_XBOX;
    return GAME_VERSION;
  }
  else { 
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  };
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for LOVELY files
function testLOVELY(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LOVELY_FILE));
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

//Installer install LOVELY files
function installLOVELY(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LOVELY_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOVELY_ID };

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

//Installer test for SteamModded files
function testSteamModded(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === STEAMMODDED_FILE));
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

//Installer install SteamModded files
function installSteamModded(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === STEAMMODDED_FILE));
  const setModTypeInstruction = { type: 'setmodtype', value: STEAMMODDED_ID };

  // Remove directories and anything that isn't in the rootPath.
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

//Installer test for Malverk files
function testMalverk(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === MALVERK_FILE));
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

//Installer install Malverk files
function installMalverk(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MALVERK_FILE));
  const setModTypeInstruction = { type: 'setmodtype', value: MALVERK_ID };

  // Remove directories and anything that isn't in the rootPath.
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

//Installer test for Mod files
function testMod(files, gameId) {
  const isMod = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  const isFolder = files.some(file => MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isMod || isFolder );

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

//Install mod files
function installMod(files, fileName) {
  const MOD_TYPE = MOD_ID;
  let modFile = files.find(file => MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
  if (modFile === undefined) {
    modFile = files.find(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  }
  let rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  let folder = path.basename(fileName, '.installing');
  folder = folder.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  const ROOT_PATH = path.basename(rootPath);
  if (ROOT_PATH !== '.') {
    folder = '';
    modFile = rootPath; //make the folder the targeted modFile so we can grab any other folders also in its directory
    rootPath = path.dirname(modFile);
    /*const indexFolder = path.basename(modFile);
    //idx = modFile.indexOf(`${indexFolder}${path.sep}`); //*/ //index on the folder with path separator
  }
  const idx = modFile.indexOf(path.basename(modFile));

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(folder, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// AUTOMATIC DOWNLOAD FUNCTIONS /////////////////////////////////////////////////

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await testRequirementVersion(api, REQUIREMENTS[0]);
  } catch (err) {
    log('warn', 'failed to test requirement version', err);
  }
}

async function checkForLOVELY(api) {
  const mod = await REQUIREMENTS[0].findMod(api);
  return mod !== undefined;
}

//Check if SteamModded is installed
function isSteamModdedInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === STEAMMODDED_ID);
}

//Check if SteamModded is installed
function isLOVELYInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LOVELY_ID);
}

//Check if Malverk is installed
function isMalverkInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MALVERK_ID);
}

//* Function to auto-download SteamModded from Nexus Mods
async function downloadSteamModded(api, gameSpec) {
  let isInstalled = isSteamModdedInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = STEAMMODDED_NAME;
    const MOD_TYPE = STEAMMODDED_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = STEAMMODDED_PAGE_NO;
    const FILE_ID = STEAMMODDED_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = gameSpec.game.id;
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
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: gameSpec.game.id,
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

//* Function to auto-download Lovely Injector from GitHub
async function downloadLOVELY(api, gameSpec, check) {
  let isInstalled = isLOVELYInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = LOVELY_NAME;
    const MOD_TYPE = LOVELY_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    const URL = LOVELY_URL_LATEST;
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
      const errPage = LOVELY_URL_MANUAL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to download Malverk Injector from GitHub
async function downloadMalverk(api, gameSpec, check) {
  let isInstalled = isMalverkInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = MALVERK_NAME;
    const MOD_TYPE = MALVERK_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    const URL = MALVERK_URL;
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
      const errPage = LOVELY_URL_MANUAL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Download Lovely Injector from GitHub page (user browse for download)
async function downloadLOVELYManual(api, gameSpec) {
  let isInstalled = isLOVELYInstalled(api, gameSpec);
  const URL = LOVELY_URL_MANUAL;
  const MOD_NAME = LOVELY_NAME;
  const MOD_TYPE = LOVELY_ID;
  const ARCHIVE_NAME = LOVELY_ARC_NAME;
  const instructions = api.translate(`Click on Continue below to open the browser. - `
    + `Navigate to the latest version of ${MOD_NAME} on the GitHub releases page and `
    + `click on the appropriate file to download and install the mod.`
  );

  if (!isInstalled) {
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.UserCanceled('Selected wrong download'));
        } //*/
        return Promise.resolve(result);
      })
      .catch((error) => {
        return reject(error);
      })
      .then((result) => {
        const dlInfo = {game: gameSpec.game.id, name: MOD_NAME};
        api.events.emit('start-download', result, {}, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              return resolve();
            });
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please re-launch Vortex and try again.`, err, { allowReport: false });
        //util.opn(URL).catch(() => null);
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from modDB at the opened paged and install the zip in Vortex.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }
} //*/

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//* Resolve game version (support Xbox)
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') { // use appxmanifest.xml for Xbox version
    try {
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parsed = await parseStringPromise(appManifest);
      version = parsed?.Package?.Identity?.[0]?.$?.Version;
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  else { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  //GAME_VERSION = await setGameVersion(GAME_PATH);
  await fs.ensureDirWritableAsync(MOD_PATH);
  await fs.ensureDirWritableAsync(GAME_PATH);
  if (GAME_VERSION !== 'xbox') {
    return downloadLOVELY(api, gameSpec, true);
  } else {
    //download Xbox dependencies
    //
  }
  await downloadSteamModded(api, gameSpec); //both versions need SteamModded
  //await downloadMalverk(api, gameSpec, true);
  //const LOVELYInstalled = await checkForLOVELY(api);
  //return LOVELYInstalled ? Promise.resolve() : download(api, REQUIREMENTS);
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
    //executable: getExecutable,
    getGameVersion: resolveGameVersion,
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
  context.registerInstaller(LOVELY_ID, 25, testLOVELY, installLOVELY);
  context.registerInstaller(STEAMMODDED_ID, 27, testSteamModded, installSteamModded);
  context.registerInstaller(MALVERK_ID, 29, testMalverk, installMalverk);
  context.registerInstaller(MOD_ID, 29, testMod, installMod);
  //context.registerInstaller(CONFIG_ID, 31, testConfig, installConfig);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config File', () => {
    util.opn(CONFIG_FILEPATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder (Steam)', () => {
    util.opn(SAVE_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Lovely-Injector Latest', () => {
    downloadLOVELY(context.api, gameSpec, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${MALVERK_NAME} Latest`, () => {
    downloadMalverk(context.api, gameSpec, false).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
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
    /*const api = context.api;
    api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(api, gameId, mods, forced);
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
