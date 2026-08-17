/*/////////////////////////////////
Name: Hades II Vortex Extension
Structure: 3rd-Party Mod Installer
Author: ChemBoy1
Version: 1.1.1
Date: 2026-08-17
////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { downloadThunderstore, checkForThunderstoreUpdate, downloadThunderstoreRequirement } = require('./thunderstore_downloader');
const { registerThunderstoreBrowser, onceThunderstoreBrowser } = require('./thunderstore_browser');
const { parseStringPromise } = require('xml2js');

//Feature toggles
const thunderstoreBrowser = true; //register the "Browse Thunderstore" page

//Specify all the information about the game
const STEAMAPP_ID = "1145350";
const EPICAPP_ID = "07c634c7291a49b5b2455e14b9a83950";
const XBOXAPP_ID = "SupergiantGamesLLC.HadesII";
const XBOXEXECNAME = "Game";
const XBOX_PUB_ID = "8fty0by31jkny"; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const GAME_ID = "hades2";
const GAME_NAME = "Hades II"
const EXEC = path.join("Ship", "Hades2.exe");
//const EXEC_VK = path.join("Ship", "Hades2.exe");
const REQ_FILE = path.join("Content", "Audio", "Desktop", "VO", "Hades.fsb");

const MODUTIL_URL = 'https://github.com/SGG-Modding/ModUtil/releases/download/2.10.1/SGG_Modding-ModUtil-2.10.1.zip'; //legacy, pre-1.0

//Data for mod types, tools, and installers
let GAME_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';
const EXEC_XBOX = 'gamelaunchhelper.exe';

const MOD_PATH = path.join("Content", "Mods");
const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = `Mod`;
const MOD_EXTS = [".lua"];

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = `Binaries`;
const BINARIES_PATH_DEFAULT = path.join("Ship");
const BINARIES_PATH_XBOX = '.'; //XBOX Version - the executable sits in the game root instead of Ship
let BINARIES_PATH = BINARIES_PATH_DEFAULT;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = `Root Game Folder`;

const MANAGER_ID = `${GAME_ID}-manager`;
const MANAGER_NAME = `Mod Importer`;
const MANAGER_PATH = path.join("Content");
const MANAGER_EXEC = "modimporter.exe";

const UTILITY_ID = `${GAME_ID}-modutility`;
const UTILITY_NAME = `Mod Utility`;
const UTILITY_PATH = path.join(MOD_PATH, 'ModUtil');
const UTILITY_FILE = "modutil.lua";
//const UTILITY_FILE = "ModUtil";

//Hell2Modding (ReturnOfModding) route - the current Hades II modding ecosystem, hosted on Thunderstore
const TS_COMMUNITY = 'hades-ii'; //https://thunderstore.io/c/hades-ii/

const LOADER_ID = `${GAME_ID}-loader`;
const LOADER_NAME = `Mod Loader (Hell2Modding)`;
const LOADER_PATH_DEFAULT = BINARIES_PATH_DEFAULT;
const LOADER_PATH_XBOX = BINARIES_PATH_XBOX; //XBOX Version - the loader DLL has to sit beside the executable
let LOADER_PATH = LOADER_PATH_DEFAULT;
const LOADER_FILE = "d3d12.dll";

const PLUGIN_ID = `${GAME_ID}-plugin`;
const PLUGIN_NAME = `ReturnOfModding Plugin`;
const PLUGIN_FOLDER = path.join("ReturnOfModding", "plugins");
const PLUGIN_PATH_DEFAULT = path.join(BINARIES_PATH_DEFAULT, PLUGIN_FOLDER);
const PLUGIN_PATH_XBOX = path.join(BINARIES_PATH_XBOX, PLUGIN_FOLDER); //XBOX Version - ReturnOfModding creates its folder beside the executable
let PLUGIN_PATH = PLUGIN_PATH_DEFAULT;
const PLUGIN_FILE = "manifest.json";
const PLUGIN_ENTRY_FILE = "main.lua"; //ReturnOfModding plugin entry point - also what separates a plugin from a legacy Mod Importer mod, which ships manifest.json too

const LUAENVY_ID = `${GAME_ID}-luaenvy`;
const LUAENVY_NAME = `ENVY (LuaENVY)`;

const ENVY_ID = `${GAME_ID}-envy`;
const ENVY_NAME = `ENVY (SGG Modding)`;

const CHALK_ID = `${GAME_ID}-chalk`;
const CHALK_NAME = `Chalk`;

const RELOAD_ID = `${GAME_ID}-reload`;
const RELOAD_NAME = `ReLoad`;

const SJSON_ID = `${GAME_ID}-sjson`;
const SJSON_NAME = `SJSON`;

const DAEMON_ID = `${GAME_ID}-demondaemon`;
const DAEMON_NAME = `DemonDaemon`;

const MODUTIL_ROM_ID = `${GAME_ID}-modutil-rom`;
const MODUTIL_ROM_NAME = `ModUtil (Hell2Modding)`;

//Every mod type that deploys into the ReturnOfModding plugins folder. They are registered
//explicitly in applyGame() because that folder is only known once the game version is.
const PLUGIN_MODTYPES = [
  { id: PLUGIN_ID, name: PLUGIN_NAME },
  { id: LUAENVY_ID, name: LUAENVY_NAME },
  { id: ENVY_ID, name: ENVY_NAME },
  { id: CHALK_ID, name: CHALK_NAME },
  { id: RELOAD_ID, name: RELOAD_NAME },
  { id: SJSON_ID, name: SJSON_NAME },
  { id: DAEMON_ID, name: DAEMON_NAME },
  { id: MODUTIL_ROM_ID, name: MODUTIL_ROM_NAME },
];

//Mod loader plus the full ModUtil dependency closure. Each entry needs its own mod type - the
//downloader keys installed-detection on the mod type, so a shared type would make every later
//requirement look installed as soon as the first one landed.
const TS_REQUIREMENTS = [
  {
    tsCommunity: TS_COMMUNITY,
    tsNamespace: 'Hell2Modding',
    tsName: 'Hell2Modding',
    modType: LOADER_ID,
    userFacingName: LOADER_NAME,
    fallbackVersion: '1.0.110',
  },
  {
    tsCommunity: TS_COMMUNITY,
    tsNamespace: 'LuaENVY',
    tsName: 'ENVY',
    modType: LUAENVY_ID,
    userFacingName: LUAENVY_NAME,
    fallbackVersion: '1.2.0',
  },
  {
    tsCommunity: TS_COMMUNITY,
    tsNamespace: 'SGG_Modding',
    tsName: 'ENVY',
    modType: ENVY_ID,
    userFacingName: ENVY_NAME,
    fallbackVersion: '1.2.0',
  },
  {
    tsCommunity: TS_COMMUNITY,
    tsNamespace: 'SGG_Modding',
    tsName: 'Chalk',
    modType: CHALK_ID,
    userFacingName: CHALK_NAME,
    fallbackVersion: '2.1.1',
  },
  {
    tsCommunity: TS_COMMUNITY,
    tsNamespace: 'SGG_Modding',
    tsName: 'ReLoad',
    modType: RELOAD_ID,
    userFacingName: RELOAD_NAME,
    fallbackVersion: '1.0.2',
  },
  {
    tsCommunity: TS_COMMUNITY,
    tsNamespace: 'SGG_Modding',
    tsName: 'SJSON',
    modType: SJSON_ID,
    userFacingName: SJSON_NAME,
    fallbackVersion: '1.0.1',
  },
  {
    tsCommunity: TS_COMMUNITY,
    tsNamespace: 'SGG_Modding',
    tsName: 'DemonDaemon',
    modType: DAEMON_ID,
    userFacingName: DAEMON_NAME,
    fallbackVersion: '1.1.0',
  },
  {
    tsCommunity: TS_COMMUNITY,
    tsNamespace: 'SGG_Modding',
    tsName: 'ModUtil',
    modType: MODUTIL_ROM_ID,
    userFacingName: MODUTIL_ROM_NAME,
    fallbackVersion: '4.0.1',
  },
];

//Embedded Thunderstore browser page - the user browses the live site and installs from it.
//Managed requirements above keep their own mod types; anything else lands as a generic plugin.
const TS_BROWSER_CONFIG = {
  tsCommunity: TS_COMMUNITY,
  requirements: TS_REQUIREMENTS,
  installRequirement: (api, gameSpec, requirement) =>
    downloadThunderstoreRequirement(api, gameSpec, requirement, true),
  pageId: `${GAME_ID}-thunderstore-browse`,
  pageTitle: 'Browse Thunderstore',
  hotkey: 'B',
};

//Filled in from data above
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1138"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Hades_II";
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "supportsSymlinks": false,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MOD_PATH)
    },
    //Binaries is registered explicitly in applyGame() - its folder varies by game version
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": MANAGER_ID,
      "name": MANAGER_NAME,
      "priority": "low",
      "targetPath": path.join('{gamePath}', MANAGER_PATH)
    },
    //*
    {
      "id": UTILITY_ID,
      "name": UTILITY_NAME,
      "priority": "low",
      "targetPath": path.join('{gamePath}', UTILITY_PATH)
    },
    //*/
    //Binaries, the mod loader and every plugin mod type are registered explicitly in applyGame() -
    //their folders vary by game version
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
      XBOXAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: "HadesModImporter",
    name: "Mod Importer",
    logo: "modimporter.png",
    executable: () => MANAGER_EXEC,
    requiredFiles: [MANAGER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
  },
  /*
  {
    id: "VulkanExecutable",
    name: "Vulkan Launch",
    logo: "exec.png",
    executable: () => EXEC_VK,
    requiredFiles: [EXEC_VK],
    detach: true,
    relative: true,
    exclusive: true,
  },
  //*/
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

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
  catch {
    return false;
  }
}

async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

//Point the version-dependent mod type folders at the right place. The binaries folder, the mod
//loader DLL and the ReturnOfModding plugins folder all sit beside the game executable, which the
//Xbox version keeps in the game root instead of the Ship folder.
function setVersionPaths(gameVersion) {
  const isXbox = (gameVersion === 'xbox');
  BINARIES_PATH = isXbox ? BINARIES_PATH_XBOX : BINARIES_PATH_DEFAULT;
  LOADER_PATH = isXbox ? LOADER_PATH_XBOX : LOADER_PATH_DEFAULT;
  PLUGIN_PATH = isXbox ? PLUGIN_PATH_XBOX : PLUGIN_PATH_DEFAULT;
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    setVersionPaths(GAME_VERSION);
    //SAVE_PATH = SAVE_PATH_XBOX;
    //CONFIG_PATH = CONFIG_PATH_XBOX;
    return EXEC_XBOX;
  };
  GAME_VERSION = 'default';
  setVersionPaths(GAME_VERSION);
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (await statCheckAsync(gamePath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    setVersionPaths(GAME_VERSION);
    //SAVE_PATH = SAVE_PATH_XBOX;
    //CONFIG_PATH = CONFIG_PATH_XBOX;
    return GAME_VERSION;
  } else {
    GAME_VERSION = 'default';
    setVersionPaths(GAME_VERSION);
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

//Shared support check for the explicitly registered mod types
function makeIsSupported(api) {
  return (gameId) => {
    var _a;
    return (gameId === GAME_ID)
      && !!((_a = api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
  };
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
  if (store === 'xbox') {
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
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
          appId: EPICAPP_ID,
          //parameters: PARAMETERS,
          //launchType: 'gamestore',
        },
    });
  } //*/
  return Promise.resolve(undefined);
}

// AUTOMATIC DOWNLOAD FUNCTIONS ///////////////////////////////////////////////////

//Check if mod injector is installed
function isModManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MANAGER_ID);
}

//Function to auto-download Mod Loader
async function downloadModManager(api, gameSpec) {
  let isInstalled = isModManagerInstalled(api, gameSpec);

  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = MANAGER_NAME;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const MOD_TYPE = MANAGER_ID;
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

    const modPageId = 1;
    const FILE_ID = 2;
    try {
      //get the mod files information from Nexus
      /*
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
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
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
      const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${FILE_ID}`;
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Check if mod injector is installed
function isModUtilityInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === UTILITY_ID);
}

//Function to auto-download Mod Loader
async function downloadModUtility(api, gameSpec) {
  let isInstalled = isModUtilityInstalled(api, gameSpec);

  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = UTILITY_NAME;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const MOD_TYPE = UTILITY_ID;
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

    //const modPageId = 27;
    //const FILE_ID = 568;
    try {
      //get the mod files information from Nexus
      /*
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
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
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${FILE_ID}`;
      const nxmUrl = MODUTIL_URL;
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      //const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      const errPage = `https://github.com/SGG-Modding/ModUtil/releases/tag/2.10.1`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Mod Importer
function testModManger(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === MANAGER_EXEC);
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

//Installer install Mod Importer
function installModManager(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === MANAGER_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MANAGER_ID };

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

//Installer test for Mod Importer
function testModUtility(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === UTILITY_FILE);
  //ModUtil 4.x carries the legacy files alongside the ReturnOfModding ones, so it matches on
  //UTILITY_FILE too - main.lua marks it as a plugin and hands it to the plugin installer instead.
  const isPlugin = files.some(file => path.basename(file).toLowerCase() === PLUGIN_ENTRY_FILE);
  let supported = (gameId === spec.game.id) && isMod && !isPlugin;

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

//Installer install Mod Importer
function installModUtility(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === UTILITY_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UTILITY_ID };

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

//Installer test for the Hell2Modding mod loader
function testLoader(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === LOADER_FILE);
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

//Installer install the Hell2Modding mod loader
function installLoader(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === LOADER_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = (rootPath === '.') ? '' : rootPath + path.sep;
  const setModTypeInstruction = { type: 'setmodtype', value: LOADER_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    (file.startsWith(rootPrefix) && (!file.endsWith(path.sep)))
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

//Installer test for ReturnOfModding plugins
function testPlugin(files, gameId) {
  //A legacy Mod Importer mod ships manifest.json as well, so the plugin entry point is what
  //identifies a ReturnOfModding plugin. The mod loader package carries a manifest too and is
  //claimed by its own installer.
  const isMod = files.some(file => path.basename(file).toLowerCase() === PLUGIN_FILE)
    && files.some(file => path.basename(file).toLowerCase() === PLUGIN_ENTRY_FILE);
  const isLoader = files.some(file => path.basename(file).toLowerCase() === LOADER_FILE);
  let supported = (gameId === spec.game.id) && isMod && !isLoader;

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

//Installer install ReturnOfModding plugins
function installPlugin(files, destinationPath) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === PLUGIN_FILE);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PLUGIN_ID };
  //A package that already ships its own plugins folder only needs that prefix removed. Anything
  //else is flat at the archive root and has to be wrapped in the plugin's own folder, since
  //ReturnOfModding resolves plugins by the folder name.
  const segments = (rootPath === '.') ? [] : rootPath.split(path.sep);
  const hasPluginsFolder = (segments.length > 0) && (segments[0].toLowerCase() === 'plugins');
  const stripPath = hasPluginsFolder ? segments[0] : rootPath;
  const stripPrefix = (stripPath === '.') ? '' : stripPath + path.sep;
  //Thunderstore serves Namespace-Name-Version.zip and Vortex names the staging folder after the
  //archive, so stripping the version off the folder name yields the Namespace-Name plugin folder.
  const MOD_FOLDER = path.basename(destinationPath)
    .replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '')
    .replace(/-\d+(\.\d+)*$/, '');

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    (file.startsWith(stripPrefix) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    const relPath = file.substr(stripPrefix.length);
    return {
      type: 'copy',
      source: file,
      destination: hasPluginsFolder ? relPath : path.join(MOD_FOLDER, relPath),
    };
  });
  instructions.push(setModTypeInstruction);

  return Promise.resolve({ instructions });
}

//Installer test for mod files
function testMod(files, gameId) {
  const isMod = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install mod files
function installMod(files,fileName) {
  const modFile = files.find(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_ID };
  const MOD_NAME = path.basename(fileName);
  const MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);

  return Promise.resolve({ instructions });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  const NOTIF_ID = `setup-notification-${GAME_ID}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: 'Mod Importer Required',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Mod Importer Must Be Run', {
            text: 'The Mod Importer tool downloaded by this extension must be run every time new mods are installed.\n'
                + 'Please launch the tool from the Dashboard tab every time you install new mods.\n'
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
      const EXEC = getExecutable(gamePath);
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC)); //can also use getFileVersion if this doesn't return the correct number (rare)
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read executable file to get game version: ${err}`);
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
  //setupNotify(api); //!disabled for 1.0 - only related to mod manager
  GAME_VERSION = await setGameVersion(GAME_PATH);
  //await downloadModManager(api, gameSpec); //!disabled for 1.0
  await fs.ensureDirWritableAsync(path.join(discovery.path, UTILITY_PATH));
  //await downloadModUtility(api, gameSpec); //!disabled for 1.0
  await fs.ensureDirWritableAsync(path.join(discovery.path, PLUGIN_PATH));
  await downloadThunderstore(api, gameSpec, TS_REQUIREMENTS);
  await checkForThunderstoreUpdate(api, gameSpec, TS_REQUIREMENTS).catch(() => null); //update check should never block setup
  await fs.ensureDirWritableAsync(path.join(discovery.path, BINARIES_PATH));
  //await fs.ensureDirWritableAsync(path.join(discovery.path, BINARIESVK_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: getExecutable,
    supportedTools: tools,
    getGameVersion: resolveGameVersion,
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

  //register mod types explicitly (their folders vary by game version, so the path has to be
  //resolved when Vortex asks for it rather than baked into the spec at load time)
  const isSupported = makeIsSupported(context.api);
  context.registerModType(BINARIES_ID, 50, isSupported,
    (game) => pathPattern(context.api, game, path.join('{gamePath}', BINARIES_PATH)),
    () => Promise.resolve(false),
    { name: BINARIES_NAME }
  );
  context.registerModType(LOADER_ID, 51, isSupported,
    (game) => pathPattern(context.api, game, path.join('{gamePath}', LOADER_PATH)),
    () => Promise.resolve(false),
    { name: LOADER_NAME }
  );
  PLUGIN_MODTYPES.forEach((type, idx) => {
    context.registerModType(type.id, 52 + idx, isSupported,
      (game) => pathPattern(context.api, game, path.join('{gamePath}', PLUGIN_PATH)),
      () => Promise.resolve(false),
      { name: type.name }
    );
  });

  //register the embedded Thunderstore browser page
  if (thunderstoreBrowser) {
    registerThunderstoreBrowser(context, gameSpec, TS_BROWSER_CONFIG);
  }

  //register mod installers
  context.registerInstaller(MANAGER_ID, 25, testModManger, installModManager);
  context.registerInstaller(UTILITY_ID, 27, testModUtility, installModUtility);
  context.registerInstaller(LOADER_ID, 29, testLoader, installLoader);
  context.registerInstaller(PLUGIN_ID, 31, testPlugin, installPlugin);
  //context.registerInstaller(MOD_ID, 35, testMod, installMod);

  //register actions
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Latest Hell2Modding Mod Loader', () => {
    downloadThunderstore(context.api, spec, TS_REQUIREMENTS, false);
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
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return checkForThunderstoreUpdate(api, spec, TS_REQUIREMENTS)
        .catch(err => log('warn', `Failed to check for Hell2Modding requirement updates: ${err}`));
    });
    if (thunderstoreBrowser) { //claims downloads started from the browse page, and update-checks the mods installed through it
      onceThunderstoreBrowser(api, spec, TS_BROWSER_CONFIG);
    }
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
