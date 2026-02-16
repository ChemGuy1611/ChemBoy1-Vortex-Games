/*///////////////////////////////////////////
Name: Mewgenics Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.0
Date: 2026-02-13
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');
//const fsPromises = require('fs/promises'); //.rm() for recursive folder deletion
//const fsExtra = require('fs-extra');
//const winapi = require('winapi-bindings');
//const turbowalk = require('turbowalk');

/*const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow'); //*/
//const DOCUMENTS = util.getVortexPath("documents");
const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "mewgenics";
const STEAMAPP_ID = "686060";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const XBOX_PUB_ID = ""; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Mewgenics";
const GAME_NAME_SHORT = GAME_NAME;
const BINARIES_PATH = '.';
const EXEC = 'Mewgenics.exe';
const EXEC_EGS = EXEC;
const EXEC_GOG = EXEC;
const EXEC_DEMO = EXEC;
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Mewgenics";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1691"; //Nexus link to this extension. Used for links

//feature toggles
const enableLoadOrder = true; //true if you want to use load order sorting
const hasLoader = false; //Disabled since it is not actually necessary. Installer and modType still works.
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const rootInstaller = false; //enable root installer. Set false if you need to avoid installer collisions
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = true; //enable to show the user a notification with special instructions (specify below)
const hasUserIdFolder = true; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
const debug = false; //toggle for debug mode
let binariesInstaller = false;
if (BINARIES_PATH !== '.') {
    binariesInstaller = true; //only enable Binaries installer if not in root
}

//info for modtypes, installers, tools, and actions
const DATA_FOLDER = '';
const ROOT_FOLDERS = [];

const CONFIGMOD_LOCATION = ROAMINGAPPDATA;
const SAVEMOD_LOCATION = ROAMINGAPPDATA;
const APPDATA_FOLDER = path.join('Glaiel Games', 'Mewgenics');
const CONFIG_FOLDERNAME = '';
const SAVE_FOLDERNAME = '';

let GAME_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';
const EXEC_XBOX = 'gamelaunchhelper.exe';

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Mod";
const MOD_PATH = "mods";
const MOD_PATH_XBOX = MOD_PATH;
const MOD_FILES = ['description.json'];
const MOD_FOLDERS = ['data', 'audio', 'levels', 'shaders', 'swfs', 'textures'];

const LO_FILE = 'modlist.txt';
const LO_FILE_PATH = path.join(MOD_PATH, LO_FILE);
// for mod update to keep them in the load order and not uncheck them
let mod_update_all_profile = false;
let updatemodid = undefined;
let updating_mod = false; // used to see if it's a mod update or not
let mod_install_name = ""; // used to display the name of the currently installed mod

const LOADER_ID = `${GAME_ID}-mewtator`;
const LOADER_NAME = "Mewtator";
const LOADER_PATH = BINARIES_PATH;
const LOADER_FILE = 'Mewtator.exe';
const LOADER_EXEC = LOADER_FILE;
const LOADER_PAGE_NO = 1;
const LOADER_FILE_NO = 8;
const LOADER_DOMAIN = GAME_ID;
const LOADER_URL = `XXX`; //if not on Nexus

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(CONFIGMOD_LOCATION, APPDATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_EXTS = [".XXX"];
const CONFIG_FILES = ["XXX"];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, APPDATA_FOLDER, SAVE_FOLDERNAME);
let USERID_FOLDER = "";
if (hasUserIdFolder) {
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
  } catch(err) {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  }
}
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER, "saves");
const SAVE_EXTS = [".sav"];
const SAVE_FILES = ["XXX"];

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
let PARAMETERS = [];
const LAUNCH_BAT = 'launch.bat';

let MODTYPE_FOLDERS = [MOD_PATH];
const IGNORE_CONFLICTS = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//filled in from data above
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
      REQ_FILE
    ],
    "compatible": {
      "dinput": false,
      "enb": false,
    },
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "supportsSymlinks": allowSymlinks,
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
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", MOD_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};
//think of a way to tell if the mod path is not in the game folder, only add ROOT modType if it is
if (binariesInstaller) {
  spec.modTypes.push({
    "id": BINARIES_ID,
    "name": BINARIES_NAME,
    "priority": "high",
    "targetPath": path.join("{gamePath}", BINARIES_PATH)
  });
}

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

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
  catch (err) { //this happens if the executable comes back as "undefined", usually caused by the Xbox app locking down the folder
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//* Get mod path dynamically for different game versions
function getModPath(discoveryPath) {
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return MOD_PATH_XBOX;
  };
  //add GOG/EGS/Demo versions here if needed
  GAME_VERSION = 'default';
  return MOD_PATH;
} //*/

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'xbox' && (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID))) {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
        //parameters: [{ appExecName: XBOXEXECNAME }, PARAMETERS_STRING],
        //launchType: 'gamestore',
      },
    });
  } //*/
  if (store === 'epic' && (DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID))) {
    return Promise.resolve({
      launcher: 'epic',
      addInfo: {
        appId: EPICAPP_ID,
        //parameters: PARAMETERS,
        //launchType: 'gamestore',
      },
    });
  } //*/
  /*
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return EXEC_XBOX;
  };
  //add GOG/EGS/Demo versions here if needed
  GAME_VERSION = 'default';
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  const CHECK = await statCheckAsync(gamePath, EXEC_XBOX);
  if (CHECK) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  } else {
    GAME_VERSION = 'default';
    return GAME_VERSION;
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

async function purge(api) { //useful to clear out mods prior to doing some action
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) { //useful to deploy mods after doing some action
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for mod loader files
function testLoader(files, gameId) {
  const isMod = files.some(file => path.basename(file) === LOADER_FILE);
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

//Install mod loader files
function installLoader(files) {
  const MOD_TYPE = LOADER_ID;
  const modFile = files.find(file => path.basename(file) === LOADER_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

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

//Test for mod files
function testMod(files, gameId) {
  const isMod = files.some(file => MOD_FILES.includes(path.basename(file).toLowerCase()));
  const isFolder = files.some(file => MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && (isMod || isFolder);

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
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  let modFile = files.find(file => MOD_FILES.includes(path.basename(file).toLowerCase()));
  if (modFile === undefined) {
    modFile = files.find(file => MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
  }
  let rootPath = path.dirname(modFile);
  //*
  let folder = path.basename(fileName).split('-')[0];
  const ROOT_PATH = path.basename(rootPath);
  if (ROOT_PATH !== '.') {
    folder = '';
    modFile = rootPath; //make the folder the targeted modFile so we can grab any other folders also in its directory
    rootPath = path.dirname(modFile);
    //const indexFolder = path.basename(modFile);
    //idx = modFile.indexOf(`${indexFolder}${path.sep}`);  //index on the folder with path separator
  } //*/
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
      //destination: file.substr(idx),
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
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
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

//Fallback installer to Binaries folder
function testBinaries(files, gameId) {
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

//Fallback installer to Binaries folder
function installBinaries(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };
  
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
  const NOTIF_ID = `${GAME_ID}-fallbackinstaller`;
  modName = path.basename(modName, '.installing');
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
            {
              label: 'Open Staging Folder', action: () => {
                util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
                dismiss();
              }
            }, //*/
            //*
            { label: `Open Mod Page`, action: () => {
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
              util.opn(MOD_PAGE_URL).catch(err => undefined);
              //dismiss();
            }}, //*/
          ]);
        },
      },
    ],
  });
}

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if mod loader is installed
function isLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LOADER_ID);
}

//* Function to auto-download mod loader from Nexus Mods
async function downloadLoader(api, gameSpec) {
  let isInstalled = isLoaderInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = LOADER_NAME;
    const MOD_TYPE = LOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = LOADER_PAGE_NO;
    const FILE_ID = LOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = LOADER_DOMAIN;
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

// LOAD ORDER FUNCTIONS /////////////////////////////////////////////////////////

async function deserializeLoadOrder(context) {
  //* on mod update for all profile it would cause the mod if it was selected to be unselected
  if (mod_update_all_profile) {
    let allMods = Array("mod_update");

    return allMods.map((modId) => {
      return {
        id: "mod update in progress, please wait. Refresh when finished. \n To avoid this wait, only update current profile",
        modId: modId,
        enabled: false,
      };
    });
  } //*/

  //Set basic information for load order paths and data
  GAME_PATH = getDiscoveryPath(context.api);
  const mods = util.getSafe(context.api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  let modFolderPath = path.join(GAME_PATH, MOD_PATH);
  let loadOrderPath = path.join(GAME_PATH, LO_FILE_PATH);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let LO_MOD_ARRAY = loadOrderFile.split('\n');
  if (debug) {
    log('warn', `LO_MOD_ARRAY: ${LO_MOD_ARRAY.join(', ')}`);
  }
  
  //Get all mod files from mods folder
  let modFolders = [];
  try {
    modFolders = await fs.readdirAsync(modFolderPath);
    modFolders = modFolders.filter((file) => isDir(modFolderPath, file))
      .filter((file) => path.basename(file) !== 'modexample1');
    modFolders = modFolders.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read "mods" folder'));
  }

  //Determine if mod is managed by Vortex (async version)
  const isVortexManaged = async (modId) => {
    return fs.statAsync(path.join(modFolderPath, modId, `__folder_managed_by_vortex`))
      .then(() => true)
      .catch(() => false)
  };
  
  // Get readable mod name using attribute from mod installer
  async function getModName(folder) {
    const VORTEX = await isVortexManaged(folder);
    if (!VORTEX) {
      return ('Manual Mod');
    }
    try {//Mod installed by Vortex, find mod where atrribute (from installer) matches folder in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, [LO_ATTRIBUTE], '') === folder));
      if (modMatch) {
        return modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
      }
      return folder;
    } catch (err) {
      return folder;
    }
  }

  // Get Vortex mod id using attribute from mod installer
  async function getModId(folder) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, [LO_ATTRIBUTE], '').includes(folder))); //find mod by folder name attribute
      if (modMatch) {
        return modMatch.id;
      }
      return undefined;
    } catch (err) {
      return undefined;
    }
  }

  //Set load order
  let loadOrder = await LO_MOD_ARRAY
    .reduce(async (accumP, entry) => {
      const accum = await accumP;
      const folder = entry.replace('#', '');
      if (!modFolders.includes(folder)) {
        return Promise.resolve(accum);
      }
      accum.push(
        {
          id: folder,
          name: `${await getModName(folder)} (${folder})`,
          modId: await isVortexManaged(folder) ? folder : undefined,
          enabled: !entry.startsWith('#'),
        }
      );
      return Promise.resolve(accum);
    }, Promise.resolve([]));
  
  //push new mods to loadOrder
  for (let folder of modFolders) {
    if (!loadOrder.find((mod) => (mod.id === folder))) {
      loadOrder.push({
        id: folder,
        name: `${await getModName(folder)} (${folder})`,
        modId: await isVortexManaged(folder) ? folder : undefined,
        enabled: true,
      });
    }
  }

  return loadOrder;
}

async function setParameters(loadOrder) {
  const count = loadOrder.length;
  const param1 = `-modcount ${count}`;
  const modPaths = loadOrder.map(mod => `"${path.join(GAME_PATH, MOD_PATH, mod)}"`);
  const param2 = `-modpaths ${modPaths.join(' ')}`;
  //log ('warn', `Params: ${param1} ${param2}`);
  PARAMETERS = [param1, param2];
  const contents = `@echo off
echo Launching ${GAME_NAME} with mods...
echo Using parameters: ${param1} ${param2}
"${path.join(GAME_PATH, EXEC)}" ${param1} ${param2}
exit`; //*/
  //const contents = `"${path.join(GAME_PATH, EXEC)}" ${param1} ${param2}`;
  await fs.writeFileAsync( //write to .bat file
    path.join(GAME_PATH, LAUNCH_BAT),
    contents,
    { encoding: "utf8" },
  );
}

//Write load order to files
async function serializeLoadOrder(context, loadOrder) {
  //* don't write if all profiles are being updated
  if (mod_update_all_profile) {
    return;
  } //*/

  GAME_PATH = getDiscoveryPath(context.api);
  let loadOrderPath = path.join(GAME_PATH, LO_FILE_PATH);

  //map the load order
  let loadOrderMapped = loadOrder
    /*.map((mod) => (mod.enabled ? mod.id : ``))
    .filter((mod) => (mod !== ``)) //*/
    .map((mod) => (mod.enabled ? mod.id : `#${mod.id}`))
  
  const loadOrderEnabled = loadOrderMapped
    .filter((mod) => (!mod.startsWith('#')))
  await setParameters(loadOrderEnabled);

  //write to modlist.txt file
  let loadOrderOutput = loadOrderMapped.join('\n');
  return fs.writeFileAsync(
    loadOrderPath,
    loadOrderOutput,
    { encoding: "utf8" },
  );
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup-notify`;
  const MESSAGE = 'NOTE: Must launch game using default launch tool';
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
            text: `\n`
                + `Note that you must launch the game using the default launch tool included with Vortex.\n`
                + `Vortex creates the command line arguments needed to tell the game to load each mod.\n`
                + `Launching the game by any other means will not load your mods.\n`
                + `\n`
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

//* Resolve game version dynamically for different game versions
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

//Notify User to run TFC Installer after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = LOADER_NAME;
  const MESSAGE = `Run ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: `Run ${MOD_NAME}`,
        action: (dismiss) => {
          runModManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `\n`
                + `For most mods, you must use ${MOD_NAME} to install the mod to the game files after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
                + `\n`
          }, [
            {
              label: `Run ${MOD_NAME}`, action: () => {
                runModManager(api);
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

function runModManager(api) {
  const TOOL_ID = LOADER_ID;
  const TOOL_NAME = LOADER_NAME;
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

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  //GAME_VERSION = await setGameVersion(GAME_PATH);
  if (setupNotification) {
    setupNotify(api);
  }
  /*await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(SAVE_PATH); //*/
  if (hasLoader) {
    await downloadLoader(api, gameSpec);
  } //*/
  //ensure LO file
  await fs.ensureFileAsync(
    path.join(GAME_PATH, LO_FILE_PATH),
    { encoding: "utf8" },
  );
  if (hasLoader) {
    //set paths in config.json
    const configPath = path.join(GAME_PATH, 'config.json');
    try {
      await fs.ensureFileAsync(
        configPath,
        { encoding: "utf8" },
      );
      const contents = await fs.readFileAsync(configPath, 'utf8');
      const json = JSON.parse(contents);
      json.game_install_dir = GAME_PATH;
      json.mod_folder = path.join(GAME_PATH, MOD_PATH);
      const configOutput = JSON.stringify(json, null, 2);
      await fs.writeFileAsync(
      configPath,
      configOutput,
      { encoding: "utf8" },
    );
    } catch (err) {
      log('error', `Could not write paths to config.json file: ${err}`);
    }
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = { //register game
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    //executable: getExecutable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    //queryModPath: getModPath(),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    //getGameVersion: resolveGameVersion,
    parameters: PARAMETERS,
    supportedTools: [
      {
        id: `${GAME_ID}-customlaunch`,
        name: 'Custom Launch',
        logo: 'exec.png',
        executable: () => LAUNCH_BAT,
        requiredFiles: [
          LAUNCH_BAT,
        ],
        relative: true,
        exclusive: true,
        shell: true,
        detach: true,
        defaultPrimary: true,
        //parameters: PARAMETERS,
      }, //*/
      {
        id: LOADER_ID,
        name: LOADER_NAME,
        logo: 'mewtator.png',
        executable: () => LOADER_EXEC,
        requiredFiles: [
          LOADER_EXEC,
        ],
        relative: true,
        exclusive: true,
        //shell: true,
        detach: true,
        //defaultPrimary: true,
      }, //*/
    ],
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

  /*register mod types explicitly
  context.registerModType(CONFIG_ID, 60, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, CONFIG_PATH), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  ); //
  context.registerModType(SAVE_ID, 62, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, SAVE_PATH), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  ); //*/

  context.registerModType(LOADER_ID, 70, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, path.join('{gamePath}', LOADER_PATH)), 
    () => Promise.resolve(false), 
    { name: LOADER_NAME }
  );
  
  //register mod installers
  context.registerInstaller(LOADER_ID, 25, testLoader, installLoader);
  context.registerInstaller(MOD_ID, 27, testMod, installMod);
  //context.registerInstaller(CONFIG_ID, 43, testConfig, installConfig);
  //context.registerInstaller(SAVE_ID, 45, testSave, installSave);
  if (rootInstaller) {
    context.registerInstaller(ROOT_ID, 47, testRoot, installRoot);
  }
  if (binariesInstaller) {
    context.registerInstaller(BINARIES_ID, 48, testBinaries, installBinaries);
  }
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register actions
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open modlist.txt (Load Order)', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, LO_FILE_PATH)).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); 
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
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
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
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
  //register Load Order
  if (enableLoadOrder) {
    context.registerLoadOrder({
      gameId: GAME_ID,
      validate: async () => Promise.resolve(undefined), // no validation implemented yet
      deserializeLoadOrder: async () => await deserializeLoadOrder(context),
      serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
      toggleableEntries: true,
      usageInstructions:`Drag and drop the mods on the left to change the order in which they load.   \n`
                        +`${GAME_NAME} loads mods in the order you set from top to bottom.   \n`
                        +`\n`,
    });
  }
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    api.onAsync('did-deploy', async (profileId, deployment) => { 
      mod_update_all_profile = false;
      updating_mod = false;
      updatemodid = undefined;
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      if (hasLoader) {
        deployNotify(api);
      }
    });
    api.events.on("mod-update", (gameId, modId, fileId) => {
      if (GAME_ID == gameId) {
        updatemodid = modId;
      }
    });
    api.events.on("remove-mod", (gameMode, modId) => {
      if (modId.includes("-" + updatemodid + "-")) {
        mod_update_all_profile = true;
      }
    });
    api.events.on("will-install-mod", (gameId, archiveId, modId) => {
      mod_install_name = modId.split("-")[0];
      if (GAME_ID == gameId && modId.includes("-" + updatemodid + "-")) {
        updating_mod = true;
      } else {
        updating_mod = false;
      }
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
