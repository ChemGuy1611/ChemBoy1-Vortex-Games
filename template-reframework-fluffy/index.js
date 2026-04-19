/*////////////////////////////////////////////
Name: XXX Vortex Extension
Structure: Fluffy + REFramework (RE Engine)
Author: ChemBoy1
Version: 0.1.0
Date: 2026-XX-XX
Notes:
- 
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');
const { parseStringPromise } = require('xml2js');

// -- START EDIT ZONE -- ///////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

//Specify all information about the game
const GAME_ID = "XXX";
const STEAMAPP_ID = "XXX";
const STEAMAPP_ID_DEMO = "XXX";
const EPICAPP_ID = "XXX";
const GOGAPP_ID = "XXX";
const XBOXAPP_ID = "XXX";
const XBOXEXECNAME = "XXX";
const XBOX_PUB_ID = "XXX"; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const EXEC = "XXX.exe";
const EXEC_DEMO = "XXX.exe";
const REF_STRING = "XXX";
const GAME_NAME = "XXX";
const GAME_NAME_SHORT = "XXX";
const PCGAMINGWIKI_URL = "XXX";
const EXTENSION_URL = "XXX"; //Nexus link to this extension. Used for links

const FLUFFY_FOLDER = "XXX";
const FLUFFY_FOLDER_DEMO = "XXX_Demo";
const ROOT_FILES = ['nvngx_dlss.dll', "dstoragecore.dll", "dstorage.dll", "amd_fidelityfx_dx12.dll", "amd_ags_x64.dll", "libxess.dll"];
const ROOT_EXTS = [".exe"];
const REF_PAGE_NO = 0;
const REF_FILE_NO = 0;
const REF_DOMAIN = GAME_ID;
const CONFIG_PATH = '.';
const CONFIG_FILE = 'config.ini';

//feature toggles
const useRefNightly = false; //toggle for using the REFramework nightly instead of Nexus release
const hasXbox = false; //toggle for Xbox version logic
const reZip = true; //NOT WORKING YET - KEEP AS TRUE FOR NOW - set to true to re-zip Fluffy Mods (possibly not necessary for FLUFFY v3.069+)
//could index on modinfo.ini to avoid extra top level folder. should work?
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
let multiExe = false; //set to true if there are multiple executables (and multiple FLUFFY_FOLDERs) (typically for Demo)
if (EXEC !== EXEC_DEMO) {
  multiExe = true;
}
const debug = false; //toggle for debug mode

// -- END EDIT ZONE -- /////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

//global variables to set later
let GAME_PATH = ''; //game installation path
let GAME_VERSION = '';
let SAVE_PATH = '';
let STAGING_FOLDER = ''; //Vortex staging folder path
let DOWNLOAD_FOLDER = ''; //Vortex download folder path
const EXEC_XBOX = 'gamelaunchhelper.exe';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//Information for mod types, tools, and installers
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";

const REF_ID = `${GAME_ID}-reframework`;
const REF_NAME = "REFramework";
const REF_FILE = "dinput8.dll";
const REF_URL = `https://github.com/praydog/REFramework-nightly/releases/latest/download/${REF_STRING}.zip`;
const REF_URL_ERR = "https://github.com/praydog/REFramework-nightly/releases";

const FLUFFY_ID = `${GAME_ID}-fluffymanager`;
const FLUFFY_NAME = "Fluffy Mod Manager";
const FLUFFY_EXEC = "modmanager.exe";
const FLUFFY_PAGE_NO = 818;
const FLUFFY_FILE_NO = 7192;

const FLUFFYMOD_ID = `${GAME_ID}-fluffymod`;
const FLUFFYMOD_NAME = "Fluffy Mod";
const FLUFFYPAK_ID = `${GAME_ID}-fluffypakmod`;
const FLUFFYPAK_NAME = "Fluffy Pak Mod";
let FLUFFYMOD_PATH = path.join("Games", FLUFFY_FOLDER, "Mods");
const FLUFFYMOD_PATH_DEMO = path.join("Games", FLUFFY_FOLDER_DEMO, "Mods");
const FLUFFYMOD_FILE = "modinfo.ini";
const PAK_EXT = '.pak';

const PRESET_ID = `${GAME_ID}-preset`;
const PRESET_NAME = "Fluffy Preset";
let PRESET_PATH = path.join("Games", FLUFFY_FOLDER, "Presets");
const PRESET_PATH_DEMO = path.join("Games", FLUFFY_FOLDER_DEMO, "Presets");
const PRESET_EXTS = [".prt"];

const LOOSELUA_ID = `${GAME_ID}-looselua`;
const LOOSELUA_NAME = "Loose Lua/Plugin (REFramework)";
const LOOSELUA_PATH = ".";
const LUA_EXT = '.lua';
const PLUGIN_EXT = '.dll';
const REF_FOLDERS = ['reframework', 'autorun'];
const PLUGIN_FOLDERS = ['reframework', 'plugins'];

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config File";
const CONFIG_FILEPATH = path.join(CONFIG_PATH, CONFIG_FILE);

async function getSavePath() {
  const STEAM_HIVE = 'HKEY_LOCAL_MACHINE'; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
  const STEAM_KEY = `SOFTWARE\\WOW6432Node\\Valve\\Steam`; //fill in path
  const STEAM_VALUE = "InstallPath"; //often InstallDir or InstallPath
  let STEAM_PATH = "";
  try {
    const instPath = winapi.RegGetValue(
      STEAM_HIVE,
      STEAM_KEY,
      STEAM_VALUE
    );
    if (!instPath) {
      STEAM_PATH = "";
    } else {
      STEAM_PATH = instPath.value;
    }
  } catch(err) {
    STEAM_PATH = "";
  }
  if (STEAM_PATH === undefined) {
    STEAM_PATH = "";
  } //*/
  const SAVE_FOLDER = path.join(STEAM_PATH, 'userdata');
  let USERID_FOLDER = "";
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
  } catch(err) {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  } //*/
  let STEAM_ID = STEAMAPP_ID;
  if (GAME_VERSION === 'demo') {
    STEAM_ID = STEAMAPP_ID_DEMO;
  }
  //SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER, STEAM_ID, 'remote', 'win64_save');
  SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER, STEAM_ID);
  return SAVE_PATH;
}

// -- START EDIT ZONE -- ///////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

let REQ_FILE = EXEC;
if (multiExe) {
  REQ_FILE = 're_chunk_000.pak';
}
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
let MODTYPE_FOLDERS = [];

// -- END EDIT ZONE -- /////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    //"parameters": PARAMETERS,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "requiredFiles": [
      REQ_FILE,
    ],
    "compatible": {
      "dinput": false,
      "enb": false,
    },
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "supportsSymlinks": allowSymlinks,
      "ignoreDeploy": IGNORE_DEPLOY,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
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
      "id": LOOSELUA_ID,
      "name": LOOSELUA_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', LOOSELUA_PATH)
    },
    {
      "id": FLUFFY_ID,
      "name": FLUFFY_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": REF_ID,
      "name": REF_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: FLUFFY_ID,
    name: FLUFFY_NAME,
    logo: "fluffy.png",
    executable: () => FLUFFY_EXEC,
    requiredFiles: [FLUFFY_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
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
    //parameters: [],
  }, //*/
  {
    id: `${GAME_ID}-customlaunchdemo`,
    name: `Custom Launch (Demo)`,
    logo: `exec_demo.png`,
    executable: () => EXEC_DEMO,
    requiredFiles: [EXEC_DEMO],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: [],
  }, //*/
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////////////

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
    high: 35,
    low: 75,
  }[priority];
}

//Replace string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'steam') {
      return Promise.resolve({
        launcher: 'steam',
      });
  }
  //*
  if (store === 'epic' && (DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID))) {
    return Promise.resolve({
      launcher: 'epic',
      addInfo: {
        appId: EPICAPP_ID,
      },
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (!multiExe && !hasXbox) { //return immediately if only one exe filename for all versions
    return EXEC;
  }
  if (hasXbox && statCheckSync(discoveryPath, EXEC_XBOX)) {
    return EXEC_XBOX;
  };
  if (statCheckSync(discoveryPath, EXEC_DEMO)) {
    FLUFFYMOD_PATH = FLUFFYMOD_PATH_DEMO;
    PRESET_PATH = PRESET_PATH_DEMO;
    return EXEC_DEMO;
  };
  return EXEC;
}

//Set mod path
function getModPath(discoveryPath) {
  if (!multiExe) { //return immediately if only one exe filename for all versions
    return () => FLUFFYMOD_PATH;
  }
  if (statCheckSync(discoveryPath, EXEC_DEMO)) {
    FLUFFYMOD_PATH = FLUFFYMOD_PATH_DEMO;
    PRESET_PATH = PRESET_PATH_DEMO;
    return () => FLUFFYMOD_PATH;
  };
  return () => FLUFFYMOD_PATH;
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (hasXbox && await statCheckAsync(gamePath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  };
  if (multiExe && await statCheckAsync(gamePath, EXEC_DEMO)) {
    GAME_VERSION = 'demo';
    FLUFFYMOD_PATH = FLUFFYMOD_PATH_DEMO;
    PRESET_PATH = PRESET_PATH_DEMO;
    return GAME_VERSION;
  } else {
    GAME_VERSION = 'default';
    return GAME_VERSION;
  }
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

// AUTOMATIC INSTALLER FUNCTIONS /////////////////////////////////////////////////////////

//Check if Fluffy Mod Manager is installed
function isFluffyInstalled(api, spec) {
  const MOD_TYPE = FLUFFY_ID;
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MOD_TYPE);
}

//Check if REFramework is installed
function isREFInstalled(api, spec) {
  const MOD_TYPE = REF_ID;
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MOD_TYPE);
}

//Function to auto-download Fluffy Mod Manager
async function downloadFluffy(api, gameSpec, check = true) {
  let isInstalled = isFluffyInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = FLUFFY_NAME;
    const MOD_TYPE = FLUFFY_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const modPageId = FLUFFY_PAGE_NO;
    const FILE_ID = FLUFFY_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = 'site';
    api.sendNotification({ //notification indicating install process
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
      let FILE = null;
      let URL = null;
      try {
        //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, modPageId);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${FILE}`;
      } catch (err) {
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${FILE}`;
      }
      //Download the mod
      const dlInfo = {
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//Function to auto-download REFramework from Github
async function downloadREFrameworkGitHub(api, gameSpec, check = true) {
  let isInstalled = isREFInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    //notification indicating install process
    const MOD_NAME = REF_NAME;
    const MOD_TYPE = REF_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const URL = REF_URL;
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
    //Show the user the download page if the download, install process fails
    } catch (err) {
      //const errPage = `https://github.com/praydog/REFramework/releases`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(REF_URL_ERR).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//Function to auto-download REFramework from Nexus Mods
async function downloadREFramework(api, gameSpec) {
  let isInstalled = isREFInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = REF_NAME;
    const MOD_TYPE = REF_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const modPageId = REF_PAGE_NO;
    const FILE_ID = REF_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = gameSpec.game.id;
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
      let FILE = null;
      let URL = null;
      try {
        //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, modPageId);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${FILE}`;
      } catch (err) {
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${FILE}`;
      }
      //Download the mod
      const dlInfo = {
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// MOD INSTALLER FUNCTIONS //////////////////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testFluffy(files, gameId) {
  const isFluffy = files.some(file => path.basename(file).toLowerCase() === FLUFFY_EXEC);
  let supported = (gameId === spec.game.id) && isFluffy

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

//Installer install Fluffy Mod Manger files
function installFluffy(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === FLUFFY_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FLUFFY_ID };

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

//Installer test for REFramework file
function testREF(files, gameId) {
  const isREF = files.some(file => path.basename(file).toLowerCase() === REF_FILE);
  let supported = (gameId === spec.game.id) && isREF;

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

//Installer install REFramework file
function installREF(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === REF_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: REF_ID };

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

//Installer test for Fluffy mod files (no test as any mod not caught by previous installer is assumed to be a Fluffy Mod)
function testFluffyMod(files, gameId) {
  //const isNatives = files.some(file => path.basename(file).toLowerCase() === NATIVES_FOLDER);
  //const isPak = files.some(file => path.extname(file).toLowerCase() === PAK_EXT);
  //const isMod = files.some(file => path.basename(file).toLowerCase() === FLUFFYMOD_FILE);
  let supported = (gameId === spec.game.id);

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

//Installer install Fluffy mod files
function installFluffyMod(files) {
  //const modFile = files.find(file => path.basename(file).toLowerCase() === FLUFFYMOD_FILE);
  //const idx = modFile.indexOf(path.basename(modFile));
  //const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FLUFFYMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    //(file.indexOf(rootPath) !== -1) && 
    (!file.endsWith(path.sep))
  ));
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

//Installer test for mod files
function testLooseLua(files, gameId) {
  const isLua = files.some(file => path.extname(file).toLowerCase() === LUA_EXT);
  const isRefFolder = files.some(file => REF_FOLDERS.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isLua && !isRefFolder );

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
function installLooseLua(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === LUA_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOOSELUA_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join('reframework', 'autorun', file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for root folders/files
function testRoot(files, gameId) {
  const isFile = files.some(file => ROOT_FILES.includes(path.basename(file).toLowerCase()));
  const isExt = files.some(file => ROOT_EXTS.includes(path.extname(file).toLowerCase()));
  const isFluffy = files.some(file => path.basename(file).toLowerCase() === FLUFFYMOD_FILE);
  let supported = (gameId === spec.game.id) && ( isFile || isExt ) && !isFluffy;

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

//Installer install root folders/files
function installRoot(files) {
  let modFile = files.find(file => ROOT_FILES.includes(path.basename(file).toLowerCase()));
  if (modFile === undefined) {
    modFile = files.find(file => ROOT_EXTS.includes(path.extname(file).toLowerCase()));
  }
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };
  const idx = modFile.indexOf(path.basename(modFile));

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

//Installer test for Fluffy Preset files
function testPreset(files, gameId) {
  const isMod = files.some(file => PRESET_EXTS.includes(path.extname(file).toLowerCase()));
  const isFluffy = files.some(file => path.basename(file).toLowerCase() === FLUFFYMOD_FILE);
  let supported = (gameId === spec.game.id) && isMod && !isFluffy;

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

//Install Fluffy Preset files
function installPreset(files) {
  const modFile = files.find(file => PRESET_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PRESET_ID };

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

//test for zips for Fluffy (all mods will be re-zipped for Fluffy to avoid install failures)
async function testZipContent(files, gameId) {
  const isFluffy = files.some(file => (path.basename(file).toLowerCase() === FLUFFY_EXEC));
  const isREF = files.some(file => (path.basename(file).toLowerCase() === REF_FILE));
  let supported = (gameId === spec.game.id) && ( !isFluffy && !isREF );

  // Test for a mod installer
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
  supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: []
  });
}

//install zips for Fluffy
async function installZipContent(files, destinationPath) {
  const zipFiles = files.filter(file => ['.zip', '.7z', '.rar'].includes(path.extname(file)));
  if (zipFiles.length > 0) { // If it's a double zip, we don't need to repack. 
    const instructions = zipFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file),
      }
    });
    return Promise.resolve({ instructions });
  }
  else { // Repack the ZIP
    const szip = new util.SevenZip();
    const archiveName = path.basename(destinationPath, '.installing') + '.zip';
    const archivePath = path.join(destinationPath, archiveName);
    const rootRelPaths = await fs.readdirAsync(destinationPath);
    await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
    const instructions = [{
      type: 'copy',
      source: archiveName,
      destination: path.basename(archivePath),
    }];
    return Promise.resolve({ instructions });
  }
}

// MAIN FUNCTIONS ////////////////////////////////////////////////////////////////////////

//Notify User of Setup instructions
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup-notification`;
  const MOD_NAME = `Fluffy Mod Manager`;
  const MESSAGE = `${MOD_NAME} Instructions`;
  api.sendNotification({
    id: `${GAME_ID}-setup-notification`,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You must use ${MOD_NAME} to enable mods after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (at top of window or in "Dashboard" tab).\n`
                + `If your mod is not for ${MOD_NAME}, you must extract the zip file in the staging folder and change the mod type to "Binaries / Root Folder".\n`
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

//Notify User to run Fluffy Mod Manager after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = FLUFFY_NAME;
  const MESSAGE = `Run ${MOD_NAME} after Deploy`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Fluffy',
        action: (dismiss) => {
          runFluffy(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You must use ${MOD_NAME} to enable most mods after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
                + `If your mod is not for ${MOD_NAME}, you may need to change the mod type to "Binaries / Root Folder" and extract the zip in the staging folder manually.\n`
          }, [
            {
              label: 'Run Fluffy', action: () => {
                runFluffy(api);
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

function runFluffy(api) {
  const TOOL_ID = FLUFFY_ID;
  const TOOL_NAME = FLUFFY_NAME;
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
      const EXEC = getExecutable(gamePath);
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC)); //can also use getFileVersion if this doesn't return the correct number (rare)
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read executable file to get game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

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
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  //setupNotify(api);
  // ASYNC CODE //////////////////////////////////////////
  GAME_VERSION = await setGameVersion(GAME_PATH);
  MODTYPE_FOLDERS.push(FLUFFYMOD_PATH);
  MODTYPE_FOLDERS.push(PRESET_PATH);
  await downloadFluffy(api, gameSpec);
  if (useRefNightly) {
    await downloadREFrameworkGitHub(api, gameSpec);
  } else {
    await downloadREFramework(api, gameSpec);
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutable,
    queryModPath: getModPath(),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
    //getGameVersion: resolveGameVersion,
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

  //register mod types explicitly (due to potentially dynamic FLUFFY_FOLDER)
  context.registerModType(FLUFFYMOD_ID, 25, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, path.join('{gamePath}', FLUFFYMOD_PATH)), 
    () => Promise.resolve(false), 
    { 
      name: FLUFFYMOD_NAME, 
      mergeMods: reZip,
    }
  );
  context.registerModType(PRESET_ID, 40, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, path.join('{gamePath}', PRESET_PATH)), 
    () => Promise.resolve(false), 
    { 
      name: PRESET_NAME, 
    }
  );

  //register mod installers
  context.registerInstaller(FLUFFY_ID, 25, testFluffy, installFluffy);
  context.registerInstaller(REF_ID, 27, testREF, installREF);
  context.registerInstaller(LOOSELUA_ID, 29, testLooseLua, installLooseLua);
  context.registerInstaller(ROOT_ID, 31, testRoot, installRoot);
  context.registerInstaller(PRESET_ID, 33, testPreset, installPreset);
  if (!reZip) {
    context.registerInstaller(FLUFFYMOD_ID, 49, testFluffyMod, installFluffyMod);
  } else {
    context.registerInstaller(`${FLUFFYMOD_ID}zip`, 49, testZipContent, installZipContent); //no longer need to rezip as of Fluffy MM v3.069
  }
  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Latest REFramework Nightly', () => {
    downloadREFrameworkGitHub(context.api, spec, false);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config File', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, CONFIG_FILEPATH)).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder (Steam)', async () => {
    SAVE_PATH = await getSavePath();
    util.opn(SAVE_PATH).catch(() => null);
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

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const api = context.api;
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
