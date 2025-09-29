/*/////////////////////////////////////////
Name: Borderlands 3 Vortex Extension
Structure: UE4 Game (Custom)
Author: ChemBoy1
Version: 0.2.0
Date: 2025-09-21
/////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const turbowalk = require('turbowalk');
//const winapi = require('winapi-bindings');

//const USER_HOME = util.getVortexPath("home");
const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath('appData');
//const LOCALAPPDATA = util.getVortexPath('localAppData');

//Specify all the information about the game
const GAME_ID = "borderlands3";
const STEAMAPP_ID = "397540";
const EPICAPP_ID = "Catnip";
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Borderlands 3";
const GAME_NAME_SHORT = "Borderlands 3";
const EPIC_CODE_NAME = "OakGame";

const ROOT_FOLDERS = [EPIC_CODE_NAME, 'Engine'];
const BINARIES_PATH = path.join(EPIC_CODE_NAME, "Binaries", "Win64");
const EXEC = path.join(BINARIES_PATH, 'Borderlands3.exe');
const DATA_FOLDER = 'Borderlands 3';

let GAME_PATH = null; //patched in the setup function to the discovered game path
let STAGING_FOLDER = ''; //Vortex staging folder path
let DOWNLOAD_FOLDER = ''; //Vortex download folder path

//Information for mod types and installers
const MERGER_ID = `${GAME_ID}-openhotfixloader`;
const MERGER_NAME = "OpenHotfixLoader";
const MERGER_EXEC = "b3hm.exe"; //legacy merger exe (not used)
const MERGER_PATH = path.join(BINARIES_PATH, 'Plugins');
const MERGER_EXEC_PATH = path.join(MERGER_PATH, MERGER_EXEC);
//const MERGER_DLL = "b3hm.dll";
const MERGER_DLL = "openhotfixloader.dll";
const MERGER_PAGE_NO = 244;
const MERGER_FILE_NO = 1377;
const MERGER_WEBUI_URL = `https://c0dycode.github.io/BL3HotfixWebUI/v2`; //legacy merger UI (not used)
const MERGER_URL = `https://github.com/apple1417/OpenHotfixLoader/releases/latest/download/OpenHotfixLoader.zip`;
const MERGER_URL_ERR = `https://github.com/apple1417/OpenHotfixLoader/releases`;

const PLUGINLOADER_ID = `${GAME_ID}-pluginloader`; //not used
const PLUGINLOADER_NAME = "Plugin Loader";
const PLUGINLOADER_FILE = 'd3d11.dll';
const PLUGINLOADER_PATH = BINARIES_PATH;
const PLUGINLOADER_URL = `https://github.com/FromDarkHell/BL3DX11Injection/releases/download/v1.1.3/D3D11.zip`;

const HOTFIX_ID = `${GAME_ID}-hotfix`;
const HOTFIX_NAME = "Hotfix Mod";
const HOTFIX_EXT = '.bl3hotfix';
const HOTFIX_PATH = path.join(MERGER_PATH, 'ohl-mods');

const SDK_ID = `${GAME_ID}-sdk`;
const SDK_NAME = "Python SDK";
const SDK_FOLDER = "sdk_mods";
const SDK_DLL = "unrealsdk.dll";
const SDK_PATH = '.';
const SDK_URL = `https://github.com/bl-sdk/oak-mod-manager/releases/latest/download/bl3-sdk.zip`;
const SDK_URL_ERR = `https://github.com/bl-sdk/oak-mod-manager/releases`;

const SDKMOD_ID = `${GAME_ID}-sdkmod`;
const SDKMOD_NAME = "SDK Mod";
const SDKMOD_EXT = '.py';
const SDKMOD_EXT2 = '.sdkmod';
const SDKMOD_PATH = SDK_FOLDER;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const MOVIES_ID = `${GAME_ID}-movies`;
const MOVIES_NAME = "Movies";
const MOVIES_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Movies');
const MOVIES_EXT = '.mp4';

const PAK_ID = `${GAME_ID}-pak`;
const PAK_NAME = "Pak Mod";
const PAK_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks');
const PAK_EXT = '.pak';

const CONFIG_PATH = path.join(DOCUMENTS, 'My Games', DATA_FOLDER, 'Saved', 'Config', 'WindowsNoEditor');
const SAVE_FOLDER = path.join(DOCUMENTS, 'My Games', DATA_FOLDER, 'Saved', 'SaveGames');
let USERID_FOLDER = "";
try {
  const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = SAVE_ARRAY.find((element) => 
  ((/[a-z]/i.test(element) === false))
  );
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
} //*/
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);

const SAVEEDITOR_ID = `${GAME_ID}-saveeditor`;
const SAVEEDITOR_NAME = "Save Editor";
const SAVEEDITOR_EXEC = 'BL3SaveEditor.exe';

const REQ_FILE = EXEC;
let MODTYPE_FOLDERS = [SDKMOD_PATH, HOTFIX_PATH, PAK_PATH, MOVIES_PATH];

const IGNORE_CONFLICTS = [path.join('**', 'LICENSE.txt'), path.join('**', 'instructions.txt'), path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Filled in from the data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiresCleanup": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": SDK_ID,
      "name": SDK_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${SDK_PATH}`
    },
    {
      "id": SDKMOD_ID,
      "name": SDKMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${SDKMOD_PATH}`
    },
    {
      "id": MERGER_ID,
      "name": MERGER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${MERGER_PATH}`
    },
    {
      "id": PLUGINLOADER_ID,
      "name": PLUGINLOADER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${PLUGINLOADER_PATH}`
    },
    {
      "id": HOTFIX_ID,
      "name": HOTFIX_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${HOTFIX_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${BINARIES_PATH}`
    },
    {
      "id": MOVIES_ID,
      "name": MOVIES_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MOVIES_PATH}`
    },
    {
      "id": PAK_ID,
      "name": PAK_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PAK_PATH}`
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
  }, //*/
  {
    id: SAVEEDITOR_ID,
    name: SAVEEDITOR_NAME,
    logo: `saveeditor.png`,
    executable: () => SAVEEDITOR_EXEC,
    requiredFiles: [SAVEEDITOR_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
    //shell: true,
    //defaultPrimary: true,
    parameters: []
  }, //*/
  /*{
    id: MERGER_ID,
    name: MERGER_NAME,
    logo: `merger.png`,
    executable: () => MERGER_EXEC_PATH,
    requiredFiles: [MERGER_EXEC_PATH],
    detach: true,
    relative: true,
    exclusive: false,
    //shell: true,
    //defaultPrimary: true,
    parameters: []
  }, //*/
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

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//set launcher requirements
async function requiresLauncher(gamePath, store) {
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
      addInfo: {
        appId: STEAM_ID,
        //parameters: PARAMETERS,
        //launchType: 'gamestore',
      } //
    });
  } //*/
  return Promise.resolve(undefined);
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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if Hotfix Merger is installed
function isHotfixMergerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MERGER_ID);
}

//Check if plugin loader is installed
function isPluginLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === PLUGINLOADER_ID);
}

//Check if SDK is installed
function isSdkInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === SDK_ID);
}

/* Function to auto-download Hotfix Merger from Nexus Mods
async function downloadHotfixMerger(api, gameSpec) {
  let isInstalled = isHotfixMergerInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MERGER_NAME;
    const MOD_TYPE = MERGER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    let FILE_ID = MERGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const PAGE_ID = MERGER_PAGE_NO;
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
      let FILE = FILE_ID; //use the FILE_ID directly for the correct game store version
      let URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = () => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } //
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

//* Function to auto-download Hotfix Merger from GitHub
async function downloadHotfixMerger(api, gameSpec) {
  let isInstalled = isHotfixMergerInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MERGER_NAME;
    const MOD_TYPE = MERGER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = MERGER_URL;
    const ERR_URL = MERGER_URL_ERR;
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
      const errPage = ERR_URL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download Plugin Loader from GitHub
async function downloadPluginLoader(api, gameSpec) {
  let isInstalled = isPluginLoaderInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = PLUGINLOADER_NAME;
    const MOD_TYPE = PLUGINLOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = PLUGINLOADER_URL;
    const ERR_URL = `https://github.com/FromDarkHell/BL3DX11Injection/releases/latest`;
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
      const errPage = ERR_URL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download SDK from GitHub
async function downloadSdk(api, gameSpec) {
  let isInstalled = isSdkInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = SDK_NAME;
    const MOD_TYPE = SDK_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = SDK_URL;
    const ERR_URL = SDK_URL_ERR;
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
      const errPage = ERR_URL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Hotfix Merger files
function testHotfixMerger(files, gameId) {
  const isFile = files.some(file => (path.basename(file).toLowerCase() === MERGER_DLL));
  //const isExe = files.some(file => (path.basename(file).toLowerCase() === MERGER_EXEC));
  let supported = (gameId === spec.game.id) && isFile;

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

//Installer install Hotfix Merger files
function installHotfixMerger(files) {
  const MOD_TYPE = MERGER_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MERGER_DLL));
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

//Installer test for plugin loader files
function testPluginLoader(files, gameId) {
  const isFile = files.some(file => (path.basename(file).toLowerCase() === PLUGINLOADER_FILE));
  let supported = (gameId === spec.game.id) && isFile;

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

//Installer install plugin loader files
function installPluginLoader(files) {
  const MOD_TYPE = PLUGINLOADER_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === PLUGINLOADER_FILE));
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

//Installer test for Fluffy Mod Manager files
function testSdk(files, gameId) {
  const isFile = files.some(file => (path.basename(file).toLowerCase() === SDK_DLL));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === SDK_FOLDER));
  let supported = (gameId === spec.game.id) && isFile && isFolder;

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
function installSdk(files) {
  const MOD_TYPE = SDK_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === SDK_FOLDER));
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

//Test Fallback installer for SDK Mods
function testSdkMod(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SDKMOD_EXT));
  const isMod2 = files.some(file => (path.extname(file).toLowerCase() === SDKMOD_EXT2));
  let supported = (gameId === spec.game.id) && (isMod || isMod2);

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

//Fallback installer for SDK Mods
function installSdkMod(files, fileName) {
  const MOD_TYPE = SDKMOD_ID;
  let modFile = files.find(file => (path.extname(file).toLowerCase() === SDKMOD_EXT2));
  if (modFile === undefined) {
    modFile = files.find(file => (path.extname(file).toLowerCase() === SDKMOD_EXT));
  }
  let MOD_FOLDER = '.';
  const idx = modFile.indexOf(path.basename(modFile));
  const ROOT_PATH = path.basename(path.dirname(modFile));
  const MOD_NAME = path.basename(fileName);
  if (ROOT_PATH === '.') {
    MOD_FOLDER = MOD_NAME.replace(/[\.]*(installing)*(zip)*/gi, '');
  }
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  
  // Remove empty directories
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );

  let instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file),
    };
  });
  if ((path.extname(modFile).toLowerCase() === SDKMOD_EXT2)) { //index to .sdkmod file if it exists
    instructions = filtered.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.join(file.substr(idx)),
      };
    });
  }

  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for .bl3hotfix files
function testHotfix(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === HOTFIX_EXT));
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

//Install .bl3hotfix files
function installHotfix(files) {
  const MOD_TYPE = HOTFIX_ID;
  const modFile = files.find(file => (path.extname(file).toLowerCase() === HOTFIX_EXT));
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
      destination: path.join(file),
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
  const ROOT_IDX = `${path.basename(modFile)}\\`
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

//Test .pak files
function testPak(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
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

//Install .pak files
function installPak(files) {
  const MOD_TYPE = PAK_ID;
  const modFile = files.find(file => (path.extname(file).toLowerCase() === PAK_EXT));
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

//Test .mp4 files
function testMovies(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === MOVIES_EXT));
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

//Install .mp4 files
function installMovies(files) {
  const MOD_TYPE = MOVIES_ID;
  const modFile = files.find(file => (path.extname(file).toLowerCase() === MOVIES_EXT));
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

// MAIN EXTENSION FUNCTION /////////////////////////////////////////////////////

//Notify User to run TFC Installer after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = MERGER_NAME;
  const MESSAGE = `Use ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Open WebUI',
        action: (dismiss) => {
          util.opn(MERGER_WEBUI_URL).catch(() => null);
          runModManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For most mods, you must use ${MOD_NAME} to install the mod to the game files after installing with Vortex.\n`
                + `Mods to install with ${MOD_NAME} will be found at this folder: "${HOTFIX_PATH}".\n`
                + `Use the included tool to launch ${MOD_NAME} (button below or in "Dashboard" tab).\n`
                + `You can open the Hotfix Merger WebUI using the button below, or using the button within the folder icon on the Mods toolbar.\n`
          }, [
            {
              label: 'Open Hotfix Merger WebUI', action: () => {
                util.opn(MERGER_WEBUI_URL).catch(() => null);
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
  const TOOL_ID = MERGER_ID;
  const TOOL_NAME = MERGER_NAME;
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
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  // ASYNC CODE //////////////////////////////////////////
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, MERGER_PATH));
  await downloadHotfixMerger(api, gameSpec);
  //await downloadPluginLoader(api, gameSpec);
  await downloadSdk(api, gameSpec);
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
  context.registerInstaller(MERGER_ID, 25, testHotfixMerger, installHotfixMerger);
  context.registerInstaller(SDK_ID, 27, testSdk, installSdk);
  context.registerInstaller(SDKMOD_ID, 28, testSdkMod, installSdkMod);
  context.registerInstaller(PLUGINLOADER_ID, 29, testPluginLoader, installPluginLoader);
  context.registerInstaller(HOTFIX_ID, 31, testHotfix, installHotfix);
  context.registerInstaller(ROOT_ID, 43, testRoot, installRoot);
  context.registerInstaller(PAK_ID, 45, testPak, installPak);
  context.registerInstaller(MOVIES_ID, 47, testMovies, installMovies);
  //context.registerInstaller(BINARIES_ID, 49, testBinaries, installBinaries);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Hotfix Merger WebUI', () => {
    const openPath = MERGER_WEBUI_URL;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = CONFIG_PATH;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    const openPath = SAVE_PATH;
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
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    /*context.api.onAsync('did-deploy', async (profileId, deployment) => { 
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
