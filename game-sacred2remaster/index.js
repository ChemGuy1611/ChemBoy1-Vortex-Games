/*///////////////////////////////////////////
Name: Sacred 2 Remaster Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.0
Date: 2025-11-19
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const { parseStringPromise } = require('xml2js');
//const winapi = require('winapi-bindings');
//const turbowalk = require('turbowalk');

//const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "sacred2remaster";
const STEAMAPP_ID = "3906660";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = "2041849309";
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, GOGAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Sacred 2 Remaster";
const GAME_NAME_SHORT = "Sacred 2";
const BINARIES_PATH = '.';
const EXEC_NAME = "sacred2.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);

const ROOT_FOLDER = 'Remaster';
const PAK_FOLDER = 'pak';
//removed ROOT_FOLDER since some mods end top level folder name with "Remaster", breaking indexing
const ROOT_FOLDERS = ['scripts', 'video', PAK_FOLDER, 'locale']; 
const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map(folder => folder.toLowerCase());

const TEXTURE_FOLDER = 'Textures';
const UI_FOLDER = 'ui';
const ROOTSUB_FOLDERS = [TEXTURE_FOLDER, UI_FOLDER];
const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map(folder => folder.toLowerCase());

const TEXTURESUB_FOLDERS = ['data', 'Skills', 'Spells', 'Spritesheets'];
const TEXTURESUB_FOLDERS_LOWER = TEXTURESUB_FOLDERS.map(folder => folder.toLowerCase());

const UISUB_FOLDERS = ['Global', 'HUD', 'Ingame', 'MainMenu', 'Shared'];
const UISUB_FOLDERS_LOWER = UISUB_FOLDERS.map(folder => folder.toLowerCase());

const PAKSUB_FOLDERS = ['dummy', 'env', 'fx', 'gui',
  'lensflares', 'maps', 'miniobj', 'particles', 'patches', 'physx', 'system',
  'test', 'models', 'cluster', 'creature', 'footsteps', 'item', 'region',
  'weapon', 'music', 'thumbnails', 'data', 'PhysXForceFields', 'PhysXParticles', 'worldmap', 
  'Bitmaps', 'Fonts', 'Shaders', 'Sounds', 'Visuals', 'Windows', 'spawn'
];
const PAKSUB_FOLDERS_LOWER = PAKSUB_FOLDERS.map(folder => folder.toLowerCase());

const DATA_FOLDER = 'Sacred2Remaster';
const CONFIGMOD_LOCATION = LOCALAPPDATA;
const CONFIG_FOLDERNAME = '';
const SAVEMOD_LOCATION = LOCALAPPDATA;
const SAVE_FOLDERNAME = 'user';

let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const ROOTSUB_ID = `${GAME_ID}-rootsub`;
const ROOTSUB_NAME = "Root Sub-Folder";
const ROOTSUB_PATH = path.join(ROOT_FOLDER);

const TEXTURESUB_ID = `${GAME_ID}-texturesub`;
const TEXTURESUB_NAME = "Textures Sub-Folder";
const TEXTURESUB_PATH = path.join(ROOT_FOLDER, TEXTURE_FOLDER);

const UISUB_ID = `${GAME_ID}-uisub`;
const UISUB_NAME = "UI Sub-Folder";
const UISUB_PATH = path.join(ROOT_FOLDER, UI_FOLDER);

const PAKSUB_ID = `${GAME_ID}-paksub`;
const PAKSUB_NAME = "Paks Sub-Folder";
const PAKSUB_PATH = path.join(PAK_FOLDER);

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_EXTS = [];
const CONFIG_FILES = ["options.txt"];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, DATA_FOLDER, SAVE_FOLDERNAME);
let USERID_FOLDER = "";
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}
/*try {
  const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
} //*/
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_EXTS = [".sacred2save"];
const SAVE_FILES = [];

const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = "XXX";
const TOOL_EXEC = path.join('XXX', 'XXX.exe');

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
let MODTYPE_FOLDERS = [TEXTURESUB_PATH, UISUB_PATH, PAKSUB_PATH];

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    //"parameters": PARAMETERS,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      //"supportsSymlinks": false,
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
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": ROOTSUB_ID,
      "name": ROOTSUB_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", ROOTSUB_PATH)
    },
    {
      "id": TEXTURESUB_ID,
      "name": TEXTURESUB_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", TEXTURESUB_PATH)
    },
    {
      "id": UISUB_ID,
      "name": UISUB_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", UISUB_PATH)
    },
    {
      "id": PAKSUB_ID,
      "name": PAKSUB_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", PAKSUB_PATH)
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//3rd party tools and launchers
const tools = [ //accepts: exe, jar, py, vbs, bat
  {
    id: `${GAME_ID}-customlaunch`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC,
    requiredFiles: [
      EXEC,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: PARAMETERS,
  }, //*/
  /*{
    id: TOOL_ID,
    name: TOOL_NAME,
    logo: 'tool.png',
    executable: () => TOOL_EXEC,
    requiredFiles: [
      TOOL_EXEC,
    ],
    relative: true,
    exclusive: true,
    //shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
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
      addInfo: {
        appId: STEAM_ID,
        //parameters: PARAMETERS,
        //launchType: 'gamestore',
      } //
    });
  } //*/
  return Promise.resolve(undefined);
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

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isRoot = files.some(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const isRootSub = files.some(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const isPakSub = files.some(file => PAKSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const isTexSub = files.some(file => TEXTURESUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const isUiSub = files.some(file => UISUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && (isRoot || isRootSub || isPakSub || isTexSub || isUiSub);

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
  let modFile = files.find(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  let setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };
  if (modFile === undefined) {
    modFile = files.find(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    setModTypeInstruction = { type: 'setmodtype', value: ROOTSUB_ID };
  }
  if (modFile === undefined) {
    modFile = files.find(file => PAKSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    setModTypeInstruction = { type: 'setmodtype', value: PAKSUB_ID };
  }
  if (modFile === undefined) {
    modFile = files.find(file => TEXTURESUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    setModTypeInstruction = { type: 'setmodtype', value: TEXTURESUB_ID };
  }
  if (modFile === undefined) {
    modFile = files.find(file => UISUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    setModTypeInstruction = { type: 'setmodtype', value: UISUB_ID };
  }
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);

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

//Fallback installer to Binaries folder
function installFallback(api, files, destinationPath) {
  fallbackInstallerNotify(api, destinationPath);
  
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
  return Promise.resolve({ instructions });
}

function fallbackInstallerNotify(api, modName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  const NOTIF_ID = `${GAME_ID}-fallbackinstaller`;
  modName = path.basename(modName, '.installing');
  const MESSAGE = 'Fallback installer reached for ' + modName;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'error',
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
                + `Mod Name: ${modName}.\n`
                + `\n`             
          }, [
            { label: 'Continue', action: () => dismiss() },
            {
              label: 'Open Staging Folder', action: () => {
                util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
                dismiss();
              }
            }, //*/
          ]);
        },
      },
    ],
  });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

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
  /*await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(SAVE_PATH); //*/
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
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
  context.registerModType(SAVE_ID, 60, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, SAVE_PATH), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  ); //*/
  
  //register mod installers
  context.registerInstaller(ROOT_ID, 25, testRoot, installRoot);
  //context.registerInstaller(CONFIG_ID, 30, testConfig, installConfig);
  //context.registerInstaller(SAVE_ID, 35, testSave, installSave);
  context.registerInstaller(`${GAME_ID}-fallback`, 40, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
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
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
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

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
