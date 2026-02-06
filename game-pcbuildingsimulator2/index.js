/*//////////////////////////////////////////
Name: PC Building Simulator 2 Vortex Extension
Structure: Unity BepinEx (IL2CPP)
Author: ChemBoy1
Version: 0.1.0
Date: 2025-10-15
//////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "pcbuildingsimulator2";
const STEAMAPP_ID = null;
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = "0449f415f5404df093b8d67c31940024";
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "PC Building Simulator 2"
const GAME_NAME_SHORT = "PCBS2"
const EXEC = "PCBS2.exe";
const EXEC_XBOX = 'gamelaunchhelper.exe';
const DATA_FOLDER = "PCBS2_Data";
const DEV_REGSTRING = "Epic Games Publishing";
const GAME_REGSTRING = "PCBS2";

const BEPINEX_PAGE_ID = '0'; //only specify if there is a Nexus page for BepInEx
const BEPINEX_FILE_ID = '0';
const BEPINEX_ARCH = 'x64'; // 'x64' or 'x86'
const BEPINEX_BUILD = 'unityil2cpp'; // 'unityil2cpp' or 'unitymono' 
const BEPINEX_VERSION = '6.0.0'; //force BepInEx version ('5.4.23.3' or '6.0.0')
const allowBepinexNexus = false; //set false until bugs are fixed
const downloadCfgMan = false; //should BepInExConfigManager be downloaded?

const BEPINEXIL2CPP_BE_URL = `https://builds.bepinex.dev/projects/bepinex_be/738/BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.738%2Baf0cba7.zip`;
const BEPINEXIL2CPP_BE_URL_ERR = `https://builds.bepinex.dev/projects/bepinex_be`;
const BEPINEX_ID = 'bepinex-injector';
const BEPINEX_ZIP = 'BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.738+af0cba7.zip';

let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let GAME_VERSION = '';

//modtypes
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";

let BEPINEX_STRING = 'mono';
if (BEPINEX_BUILD === 'unityil2cpp') {
  BEPINEX_STRING = 'il2cpp';
}
const BEPCFGMAN_ID = `${GAME_ID}-bepcfgman`;
const BEPCFGMAN_NAME = "BepInEx Configuration Manager";
const BEPCFGMAN_PATH = 'Bepinex';
const BEPCFGMAN_URL = `https://github.com/sinai-dev/BepInExConfigManager/releases/download/1.3.0/BepInExConfigManager.${BEPINEX_STRING}.zip`;
const BEPCFGMAN_FILE = `bepinexconfigmanager.${BEPINEX_STRING}.dll`; //lowercased

const BEPMOD_ID = `${GAME_ID}-bepmods`;
const BEPMOD_NAME = "BepInEx Mod";
const BEPMOD_PATH = path.join("BepinEx", "plugins")
const modFileExt = ".dll";

const ASSEMBLY_ID = `${GAME_ID}-assemblydll`;
const ASSEMBLY_NAME = "Assembly DLL Mod";
const ASSEMBLY_PATH = path.join('.');
const ASSEMBLY_FILE = "GameAssembly.dll";

//Config and save paths
const CONFIG_HIVE = 'HKEY_CURRENT_USER';
const CONFIG_REGPATH = `Software\\${DEV_REGSTRING}\\${GAME_REGSTRING}`;
const CONFIG_REGPATH_FULL = `${CONFIG_HIVE}\\${CONFIG_REGPATH}`;

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_PATH_DEFAULT = 'Saves';
let SAVE_PATH = SAVE_PATH_DEFAULT;
const SAVE_EXTS = ['.binary'];

const PC_ID = `${GAME_ID}-pcbuild`;
const PC_NAME = "PC Build";
const PC_PATH = 'PCs';
const PC_EXTS = ['.pcbs'];

const ASSETS_ID = `${GAME_ID}-assets`;
const ASSETS_NAME = "Assets/Resources File";
const ASSETS_PATH = DATA_FOLDER;
const ASSETS_EXTS = ['.assets', '.resource', '.ress'];

const PARTCREATOR_ID = `${GAME_ID}-partcreator`;
const PARTCREATOR_NAME = "Part Creator";
const PARTCREATOR_EXEC = 'PCBS2 Part Creator-102-0-0-8-1757772262.exe';

const MOD_PATH_DEFAULT = ".";
const MODTYPE_FOLDERS = [BEPMOD_PATH, ASSEMBLY_PATH, SAVE_PATH];
const IGNORE_CONFLICTS = [path.join('**', 'manifest.json'), path.join('**', 'icon.png'), path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    //"parameters": [],
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "epicAppId": EPICAPP_ID,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "EpicAPPId": EPICAPP_ID,
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
      "id": ASSEMBLY_ID,
      "name": ASSEMBLY_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', ASSEMBLY_PATH)
    },
    {
      "id": BEPCFGMAN_ID,
      "name": BEPCFGMAN_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPCFGMAN_PATH)
    },
    {
      "id": BEPMOD_ID,
      "name": BEPMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPMOD_PATH)
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', SAVE_PATH)
    },
    {
      "id": PC_ID,
      "name": PC_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', PC_PATH)
    },
    {
      "id": ASSETS_ID,
      "name": ASSETS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', ASSETS_PATH)
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
    parameters: [],
  }, //*/
  {
    id: PARTCREATOR_ID,
    name: PARTCREATOR_NAME,
    logo: `partcreator.png`,
    executable: () => PARTCREATOR_EXEC,
    requiredFiles: [PARTCREATOR_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  }, //*/
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////

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

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'epic' && DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID)) {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  return Promise.resolve(undefined);
}

//Find the game installation folder
function openConfigRegistry(api) {
  GAME_PATH = getDiscoveryPath(api);
  try {
    api.runExecutable(path.join(GAME_PATH, 'regjump.exe'), [`${CONFIG_REGPATH_FULL}`], { shell: true, detached: true } )
    /*winapi.WithRegOpen(
      CONFIG_HIVE,
      CONFIG_REGPATH,
      hkey => {
        util.opn(hkey);
      }
    ); //*/
  } catch (err) {
    log('error', `Could not open ${GAME_NAME} config in registry: ${err}`);
  }
} //*/

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

//Test for BepinExConfigManager mod files
function testBepCfgMan(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === BEPCFGMAN_FILE));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === 'plugins'));
  let supported = (gameId === spec.game.id) && isMod && isFolder;

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

//Install BepinExConfigManager mod files
function installBepCfgMan(files) {
  const MOD_TYPE = BEPCFGMAN_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === 'plugins'));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

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

//Test for Assembly mod files
function testAssembly(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === ASSEMBLY_FILE));
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

//Install Assembly mod files
function installAssembly(files) {
  const MOD_TYPE = ASSEMBLY_ID;
  const modFile = files.find(file => (path.basename(file) === ASSEMBLY_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

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

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === DATA_FOLDER));
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
  const modFile = files.find(file => (path.basename(file) === DATA_FOLDER));
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

//Installer Test for save files
function testSave(files, gameId) {
  const isMod = files.some(file => SAVE_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install save files
function installSave(files) {
  const modFile = files.find(file => SAVE_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

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

//Installer Test for .pcbs files
function testPc(files, gameId) {
  const isMod = files.some(file => PC_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install .pcbs files
function installPc(files) {
  const modFile = files.find(file => PC_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PC_ID };

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

//Installer Test for assets files
function testAssets(files, gameId) {
  const isMod = files.some(file => ASSETS_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install assets files
function installAssets(files) {
  const modFile = files.find(file => ASSETS_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ASSETS_ID };

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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  //SYNC CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE ///////////////////////////////////
  //await downloadBepinex(api, gameSpec);
  if (downloadCfgMan === true) {
    await fs.ensureDirWritableAsync(path.join(GAME_PATH, 'Bepinex')); //allows downloader to write files
    await downloadBepCfgMan(api, gameSpec);
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  context.requireExtension('modtype-bepinex'); //Require BepinEx Mod Installer extension
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
  context.registerInstaller(ROOT_ID, 8, testRoot, installRoot);
  context.registerInstaller(BEPCFGMAN_ID, 9, testBepCfgMan, installBepCfgMan); //must be set to 9 since bepinex extension modtypes start at 10 and would hijack
  context.registerInstaller(PC_ID, 25, testPc, installPc);
  context.registerInstaller(ASSEMBLY_ID, 27, testAssembly, installAssembly);
  context.registerInstaller(ASSETS_ID, 29, testAssets, installAssets);
  context.registerInstaller(SAVE_ID, 49, testSave, installSave);
  
  //register actions
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config (Registry)', () => {
    openConfigRegistry;
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open BepInEx.cfg', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, 'BepinEx', 'config', 'BepInEx.cfg');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Data Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, DATA_FOLDER);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, SAVE_PATH);
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
    if (context.api.ext.bepinexAddGame !== undefined) {
      context.api.ext.bepinexAddGame({
        gameId: GAME_ID,
        autoDownloadBepInEx: true,
        customPackDownloader: () => {
          downloadBepinex(context.api, spec);
          //return path.join(DOWNLOAD_FOLDER, BEPINEX_ZIP);
        },
      });
    }
  });
  return true;
}


//* Functions to download BepInEx 5.4.23.3 from GitHub (temporary due to error)
function isBepinexInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === BEPINEX_ID);
}

async function downloadBepinex(api, gameSpec) {
  let isInstalled = isBepinexInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = BEPINEX_ZIP;
    const MOD_TYPE = BEPINEX_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const URL = BEPINEXIL2CPP_BE_URL;
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
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = BEPINEXIL2CPP_BE_URL_ERR;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//Download BepInExConfigManager from GitHub
function isBepCfgManInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === BEPCFGMAN_ID);
}

async function downloadBepCfgMan(api, gameSpec) {
  let isInstalled = isBepCfgManInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = BEPCFGMAN_NAME;
    const MOD_TYPE = BEPCFGMAN_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const URL = BEPCFGMAN_URL;
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
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//export to Vortex
module.exports = {
  default: main,
};
