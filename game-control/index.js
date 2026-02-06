/*/////////////////////////////////////////
Name: Control Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 2.0.2
Date: 2025-12-01
/////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');

//const USER_HOME = util.getVortexPath('home');
const DOCUMENTS = util.getVortexPath('documents');
//const ROAMINGAPPDATA = util.getVortexPath('appData');
const LOCALAPPDATA = util.getVortexPath('localAppData');

//Specify all the information about the game
const GAME_ID = "control";
const STEAMAPP_ID = "870780";
const EPICAPP_ID = "Calluna";
const GOGAPP_ID = "2049187585";
const XBOXAPP_ID = "505GAMESS.P.A.ControlPCGP";
const XBOXEXECNAME = "Game";
const GAME_NAME = "Control"
const GAME_NAME_SHORT = "Control";

let GAME_VERSION = null;
let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//executables for different stores
const EXEC = `Control.exe`;
const EXEC_XBOX = "gamelaunchhelper.exe";

const GOG_FILE = 'Galaxy64.dll';
const STEAM_FILE = 'steam_api64.dll';
const EPIC_FILE = 'eossdk-win64-shipping.dll';
const XBOX_FILE = EXEC_XBOX;

const DEV_STRING = 'Remedy';
const GAME_STRING = 'Control';
const XBOX_SAVE_STRING = 'tefn33qh9azfc';
let SAVE_PATH = '';
const SAVE_PATH_EPIC = path.join(LOCALAPPDATA, DEV_STRING, GAME_STRING, 'Default-Epic-User');
const SAVE_PATH_GOG = path.join(DOCUMENTS, 'My Games', GAME_STRING, 'Saves');
const SAVE_PATH_STEAM = path.join('Steam', 'Saved', 'SaveGames');
const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_SAVE_STRING}`, "SystemAppData", "wgs"); //XBOX Version

const LOADER_LOGS_PATH = path.join(LOCALAPPDATA, DEV_STRING, GAME_STRING);

let CONFIG_PATH = '';
const CONFIG_FILE = 'renderer.ini';
const CONFIG_PATH_EPIC = path.join(SAVE_PATH_EPIC, 'preferences');
const CONFIG_PATH_GOG = path.join(SAVE_PATH_GOG, 'preferences_data');
const CONFIG_PATH_STEAM = path.join('Steam', 'Saved', 'Config', 'Windows');
const CONFIG_PATH_XBOX = SAVE_PATH_XBOX; //XBOX Version

//Data for mod types, tools, load order, and installers
const MODFOLDER_ID = `${GAME_ID}-modfolder`;
const MODFOLDER_NAME = `Mod Folder`;
const MODFOLDER_PACK = `data_packfiles`;
const MODFOLDER_DATA = `data`;
const MODFOLDER_DATAPC = `data_pc`;
const MODFOLDER_PLUGINS = `plugins`;
const MODFOLDER_FOLDERS = [MODFOLDER_PACK, MODFOLDER_DATA, MODFOLDER_DATAPC, MODFOLDER_PLUGINS];

const MODPACK_ID = `${GAME_ID}-modpack`;
const MODPACK_NAME = `Mod Files (data_packfiles)`;
const MODPACK_PATH = MODFOLDER_PACK;
const MODPACK_EXTS = ['.bin', '.packmeta', '.rmdp'];

const PLUGINLOADER_ID = `${GAME_ID}-pluginloader`;
const PLUGINLOADER_NAME = `Plugin Loader`;
const PLUGINLOADER_FILE = `xinput1_4.dll`;
const PLUGINLOADER_PAGE_NO = 16;
const PLUGINLOADER_FILE_NO = 127;

const LOOSELOADER_ID = `${GAME_ID}-loosefileloader`;
const LOOSELOADER_NAME = `Loose File Loader`;
const LOOSELOADER_FILE = `iphlpapi.dll`;
const LOOSELOADER_PAGE_NO = 11;
const LOOSESLOADER_FILE_NO = 24;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = `Root Folder`;

/*
const USER_DOCS = util.getVortexPath('home');
const CONFIG_PATH = path.join(USER_DOCS);
const SAVE_PATH = path.join(USER_DOCS); 
const CFG_EXT = ".cfg";
//*/

const MOD_PATH_DEFAULT = ".";
const REQ_FILE = MODFOLDER_DATA;

const IGNORE_CONFLICTS = [path.join('**', 'changelog.txt'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'changelog.txt'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
let MODTYPE_FOLDERS = [MOD_PATH_DEFAULT, MODPACK_PATH];

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiresCleanup": true,
    "requiredFiles": [
      REQ_FILE,
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": MODFOLDER_ID,
      "name": MODFOLDER_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": MODPACK_ID,
      "name": MODPACK_NAME,
      "priority": "high",
      "targetPath": path.join(`{gamePath}`, MODFOLDER_PACK)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": PLUGINLOADER_ID,
      "name": PLUGINLOADER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
    {
      "id": LOOSELOADER_ID,
      "name": LOOSELOADER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
      GOGAPP_ID,
      XBOXAPP_ID,
    ],
    "names": []
  }
};

// BASIC EXTENSION FUNCTIONS //////////////////////////////////////////////////////////////////////////////////

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

function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
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
  try {
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch (err) {
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
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
  }
  if (store === 'epic') {
    return Promise.resolve({
      launcher: 'epic',
      addInfo: {
        appId: EPICAPP_ID,
      },
    });
  };
  return Promise.resolve(undefined);
}

function getExecutable(discoveredPath) {
  if (statCheckSync(discoveredPath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return EXEC_XBOX;
  };
  GAME_VERSION = 'default';
  return EXEC;
}

//Get correct game version
function setGameVersion(gamePath) {
  if (statCheckSync(gamePath, XBOX_FILE)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  }
  if (statCheckSync(gamePath, STEAM_FILE)) {
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  }
  if (statCheckSync(gamePath, EPIC_FILE)) {
    GAME_VERSION = 'epic';
    return GAME_VERSION;
  }
  if (statCheckSync(gamePath, GOG_FILE)) {
    GAME_VERSION = 'gog';
    return GAME_VERSION;
  }
}

//Get correct game version - async
async function setGameVersionAsync(gamePath) {
  if (await statCheckAsync(gamePath, XBOX_FILE)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, STEAM_FILE)) {
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, EPIC_FILE)) {
    GAME_VERSION = 'epic';
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, GOG_FILE)) {
    GAME_VERSION = 'gog';
    return GAME_VERSION;
  }
}

//Get correct config path for game version
async function setConfigPath(api) {
  GAME_PATH = getDiscoveryPath(api);
  GAME_VERSION = await setGameVersionAsync(GAME_PATH);
  if (GAME_VERSION === 'xbox') {
    CONFIG_PATH = CONFIG_PATH_XBOX;
    return CONFIG_PATH;
  }
  if (GAME_VERSION === 'steam') {
    CONFIG_PATH = "";
    return "";
  }
  if (GAME_VERSION === 'epic') {
    CONFIG_PATH = CONFIG_PATH_EPIC;
    return CONFIG_PATH;
  }
  if (GAME_VERSION === 'gog') {
    CONFIG_PATH = CONFIG_PATH_GOG;
    return CONFIG_PATH;
  }
}

//Get correct save path for game version
async function setSavePath(api) {
  GAME_PATH = getDiscoveryPath(api);
  GAME_VERSION = await setGameVersionAsync(GAME_PATH);
  if (GAME_VERSION === 'xbox') {
    CONFIG_PATH = CONFIG_PATH_XBOX;
    return CONFIG_PATH;
  }
  if (GAME_VERSION === 'steam') {
    CONFIG_PATH = "";
    return "";
  }
  if (GAME_VERSION === 'epic') {
    CONFIG_PATH = CONFIG_PATH_EPIC;
    return CONFIG_PATH;
  }
  if (GAME_VERSION === 'gog') {
    CONFIG_PATH = CONFIG_PATH_GOG;
    return CONFIG_PATH;
  }
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

// AUTO-INSTALLER FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Check if UE4SS is installed
function isLooseLoaderInstalled(discovery, api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LOOSELOADER_ID);
}

//Check if Mod Enabler is installed
function isPluginLoaderInstalled(discovery, api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === PLUGINLOADER_ID);
}

//* Function to auto-download UE4SS form Nexus Mods
async function downloadLooseLoader(discovery, api, gameSpec) {
  let isInstalled = isLooseLoaderInstalled(discovery, api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = LOOSELOADER_NAME;
    const MOD_TYPE = LOOSELOADER_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = LOOSELOADER_PAGE_NO;
    const FILE_ID = LOOSESLOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = GAME_ID;
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
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          //throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
          throw new Error(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        game: GAME_DOMAIN, // set to the game's ID so that they wil not get a game selection popup. Vortex will update the metadata automatically if the mod is from another domain, such as 'site'
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download UE4SS form Nexus Mods
async function downloadPluginLoader(discovery, api, gameSpec) {
  let isInstalled = isPluginLoaderInstalled(discovery, api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = PLUGINLOADER_NAME;
    const MOD_TYPE = PLUGINLOADER_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = PLUGINLOADER_PAGE_NO;
    const FILE_ID = PLUGINLOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = GAME_ID;
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
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          //throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
          throw new Error(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        game: GAME_DOMAIN, // set to the game's ID so that they wil not get a game selection popup. Vortex will update the metadata automatically if the mod is from another domain, such as 'site'
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// MOD INSTALLER FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Installer test for Root folder files
function testModFolder(files, gameId) {
  const isFolder = files.some(file => MODFOLDER_FOLDERS.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isFolder );

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
function installModFolder(files) {
  const modFile = files.find(file => MODFOLDER_FOLDERS.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODFOLDER_ID };

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

//Installer test for Root folder files
function testModPack(files, gameId) {
  const isMod = files.some(file => MODPACK_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isMod );

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
function installModPack(files) {
  const modFile = files.find(file => MODPACK_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODPACK_ID };

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

//Installer test for UE4SS files
function testLooseLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LOOSELOADER_FILE));
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

//Install Mod Loader mods
function installLooseLoader(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LOOSELOADER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOOSELOADER_ID };

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

//Installer test for UE4SS files
function testPluginLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === PLUGINLOADER_FILE));
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

//Install Mod Loader mods
function installPluginLoader(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === PLUGINLOADER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PLUGINLOADER_ID };

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

// MAIN FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////


//*
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersionAsync(gamePath);
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

//Send notification for Reshade
function xboxNotify(api) {
  const NOTIF_ID = `${GAME_ID}-xboxnotify`;
  const MESSAGE = 'Some Mods Not Supported on Xbox Version';
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
            text: '\n'
                + 'Vortex detected that you are using the Xbox version of the game.\n'
                + 'This version of the game does not support mods that depend on the Loose Files Loader.\n'
                + 'Most Plugin mods will also not load because the memory signatures they look for may be different on Xbox.\n'
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

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  GAME_PATH = discovery.path;
  GAME_VERSION = await setGameVersionAsync(GAME_PATH);
  if (GAME_VERSION === 'xbox') {
    xboxNotify(api);
  }
  await downloadLooseLoader(discovery, api, gameSpec);
  await downloadPluginLoader(discovery, api, gameSpec);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
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
    executable: getExecutable,
    getGameVersion: resolveGameVersion,
    supportedTools: [ //3rd party tools and launchers
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
        //parameters: [],
      },
      {
        id: `${GAME_ID}-customlaunchxbox`,
        name: `Custom Launch`,
        logo: `exec.png`,
        executable: () => EXEC_XBOX,
        requiredFiles: [EXEC_XBOX],
        detach: true,
        relative: true,
        exclusive: true,
        shell: true,
        //parameters: [],
      },
    ],
  };
  context.registerGame(game);

  //register mod types recusively
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod installers
  context.registerInstaller(MODFOLDER_ID, 25, testModFolder, installModFolder);
  context.registerInstaller(MODPACK_ID, 30, testModPack, installModPack);
  context.registerInstaller(LOOSELOADER_ID, 35, testLooseLoader, installLooseLoader);
  context.registerInstaller(PLUGINLOADER_ID, 40, testPluginLoader, installPluginLoader);
  
  //register buttons to open folders and files
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', async () => {
    CONFIG_PATH = await setConfigPath(context.api);
    util.opn(CONFIG_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Loader Logs Folder', async () => {
    util.opn(LOADER_LOGS_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open renderer.ini', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, CONFIG_FILE);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', async () => {
    SAVE_PATH = await setSavePath(context.api);
    util.opn(SAVE_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Editor (Web)', () => {
    const URL = 'https://reg2k.github.io/control-save-editor-beta/';
    util.opn(URL).catch(() => null);
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
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
