/*////////////////////////////////////////////////
Name: A Plague Tale Requiem Vortex Extension
Structure: Basic Game (XBOX Integrated)
Author: ChemBoy1
Version: 1.3.1
Date: 2025-11-18
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');

const DOCUMENTS = util.getVortexPath("documents");
//const LOCALAPPDATA = util.getVortexPath("localAppData");
const APPDATA = util.getVortexPath("appData");

//Specify all information about the game
const GAME_ID = "aplaguetalerequiem";
const STEAMAPP_ID = "1182900";
const EPICAPP_ID = ""; // not on egdata.app yet - https://egdata.app/offers/28678d007f3d4440b7a7365b04c5fc2e/builds
const GOGAPP_ID = "1552771812";
const XBOXAPP_ID = "FocusHomeInteractiveSA.APlagueTaleRequiem-Windows";
const XBOXEXECNAME = "Game";
const GAME_NAME = "A Plague Tale: Requiem";
const GAME_NAME_SHORT = "APT Requiem";
const COMMON_FILE = path.join('DATAS', 'P_AMICIA.DPC');

const ROOT_FOLDERS = ['DATAS', 'FONT', 'INPUT', 'LEVELS', 'RTC', 'Shaders', 'SOUNDBANKS', 'TRTEXT', 'UPDATE', 'VIDEOS'];
const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map(folder => folder.toLowerCase());

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  gog: [{ id: GOGAPP_ID }],
  //epic: [{ id: EPICAPP_ID }],
  xbox: [{ id: XBOXAPP_ID }],
};

//Information for setting the executable and variable paths based on the game store version
const EXEC = "APlagueTaleRequiem_x64.exe";
const EXEC_GOG = EXEC;
const EXEC_EPIC = "APlagueTaleRequiem_x64.exe";
const EXEC_XBOX = "APT2_WinStore.x64.Submission.exe";
const EXEC_XBOX_ALT = "gamelaunchhelper.exe";
const GOG_FILE = 'Galaxy64.dll';
const STEAM_FILE = 'steam_api64.dll';
const XBOX_FILE = EXEC_XBOX_ALT;
const EPIC_FILE = EXEC;

let GAME_VERSION = '';
let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//Information for mod types and installers
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

//* Config
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_EXTS = [".ini"];
const CONFIG_FILES = ["ENGINESETTINGS"]; 
const CONFIG_PATH_STEAM = path.join(APPDATA, 'A Plague Tale Requiem');
const CONFIG_PATH_GOG = path.join(DOCUMENTS, 'My Games', 'A Plague Tale Requiem');
const CONFIG_PATH_XBOX = CONFIG_PATH_GOG;
const CONFIG_PATH_EPIC = CONFIG_PATH_GOG;
let CONFIG_PATH = CONFIG_PATH_STEAM;
//*/

/*Save
const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(DOCUMENTS, '');
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
} 
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_EXTS = [".sav"]; //*/

MOD_PATH_DEFAULT = ".";
const REQ_FILE = COMMON_FILE;
const PARAMETERS = [];
let MODTYPE_FOLDERS = ['.'];

//This information will be filled in from the data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    //"parameters": PARAMETERS,
    "mergeMods": true,
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
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    /*{
      "id": CONFIG_ID,
      "name": CONFIG_NAME,
      "priority": "high",
      "targetPath": CONFIG_PATH
    }, //*/
  ],
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
    //parameters: PARAMETERS,
  }, //*/
  {
    id: `${GAME_ID}-xboxcustomlaunch`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC_XBOX,
    requiredFiles: [EXEC_XBOX],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
];

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
  catch (err) { //this happens if the executable comes back as "undefined", usually caused by another app locking down the folder
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
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
  /*
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

//Get the executable
function getExecutable(discoveryPath) {
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    return EXEC_XBOX;
  };
  /*
  if (statCheckSync(discoveryPath, EXEC_EPIC)) {
    return EXEC_EPIC;
  }; //*/
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (await statCheckAsync(gamePath, STEAM_FILE)) {
    GAME_VERSION = 'steam';
    CONFIG_PATH = setConfigPath(GAME_VERSION);
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, XBOX_FILE)) {
    GAME_VERSION = 'xbox';
    CONFIG_PATH = setConfigPath(GAME_VERSION);
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, GOG_FILE)) {
    GAME_VERSION = 'gog';
    CONFIG_PATH = setConfigPath(GAME_VERSION);
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, EPIC_FILE)) {
    GAME_VERSION = 'epic';
    CONFIG_PATH = setConfigPath(GAME_VERSION);
    return GAME_VERSION;
  }
}

//Get correct config path for game version
async function setConfigPath(GAME_VERSION) {
  if (GAME_VERSION === 'steam') {
    CONFIG_PATH = CONFIG_PATH_STEAM;
  }
  if (GAME_VERSION === 'xbox') {
    CONFIG_PATH = CONFIG_PATH_XBOX;
  }
  if (GAME_VERSION === 'gog') {
    CONFIG_PATH = CONFIG_PATH_GOG;
  }
  if (GAME_VERSION === 'epic') {
    CONFIG_PATH = CONFIG_PATH_EPIC;
  }
  return CONFIG_PATH;
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

//Test for root folders
function testRoot(files, gameId) {
  const isFolder = files.some(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isFolder;

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

//Install root folders
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Send notification for Reshade
function reshadeNotify(api) {
  const NOTIF_ID = 'reshade-notification-aplaguetalerequiem';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: 'Reshade mod may be required.',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: "A Plague Tale: Requiem requires Reshades for most mods available on Nexus Mods.\n"
                + 'Please use the button below to download and install Reshade\n'
                + 'if you haven\'t already and plan to use those mods.'
          }, [
            { label: 'Continue', action: () => dismiss() },
            { label: 'Download Reshade', action: () => {
                util.opn('https://www.reshade.me/').catch(err => undefined);
                dismiss();
            }},
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

//*
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

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec){
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  reshadeNotify(api);
  // ASYNC CODE //////////////////////////////////////////
  GAME_VERSION = await setGameVersion(GAME_PATH);
  CONFIG_PATH = await setConfigPath(GAME_VERSION);
  //MODTYPE_FOLDERS.push(CONFIG_PATH);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    requiresCleanup: true,
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: () => gameSpec.game.modPath,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
    getGameVersion: resolveGameVersion,
    requiresLauncher: requiresLauncher,
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
  context.registerInstaller(ROOT_ID, 25, testRoot, installRoot);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', async () => {
    CONFIG_PATH = await setConfigPath(GAME_VERSION);
    util.opn(CONFIG_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', async () => {
    //SAVE_PATH = await setSavePath();
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
    const openPath = DOWNLOAD_FOLDER;
    util.opn(openPath).catch(() => null);
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

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
