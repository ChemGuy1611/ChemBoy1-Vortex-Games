/*///////////////////////////////////////////
Name: Unreal Tournament 2004 Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.0
Date: 2026-02-20
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const { parseStringPromise } = require('xml2js');
//const fsPromises = require('fs/promises'); //.rm() for recursive folder deletion
//const fsExtra = require('fs-extra');
const winapi = require('winapi-bindings');
//const turbowalk = require('turbowalk');

/*const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow'); //*/
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "unrealtournament2004";
const STEAMAPP_ID = null;
const GOGAPP_ID = null;
const DISCOVERY_IDS_ACTIVE = []; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Unreal Tournament 2004";
const GAME_NAME_SHORT = "UT2004";
const BINARIES_PATH = 'System';
const EXEC_NAME = "UT2004.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Unreal_Tournament_2004";
const EXTENSION_URL = "XXX"; //Nexus link to this extension. Used for links

const INSTALL_HIVE = 'HKEY_LOCAL_MACHINE';
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OldUnreal_ut2004`;
const INSTALL_VALUE = "DisplayIcon"; //*/ need to pop twice to get to root

//feature toggles
const hasLoader = false; //true if game needs a mod loader
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const debug = false; //toggle for debug mode

//info for modtypes, installers, tools, and actions
const ANIMATIONS_FOLDER = 'Animations';
const ANIMATIONS_EXTS = ['.ukx'];
const KARMADATA_FOLDER = 'KarmaData';
const KARMADATA_EXTS = ['.ka'];
const MAPS_FOLDER = 'Maps';
const MAPS_EXTS = ['.ut2'];
const MUSIC_FOLDER = 'Music';
const MUSIC_EXTS = ['.ogg'];
const SOUNDS_FOLDER = 'Sounds';
const SOUNDS_EXTS = ['.uax'];
const SPEECH_FOLDER = 'Speech';
const SPEECH_EXTS = ['.xml'];
const STATICMESHES_FOLDER = 'StaticMeshes';
const STATICMESHES_EXTS = ['.usx'];
const SYSTEM_FOLDER = 'System';
const SYSTEM_EXTS = ['.u', '.ucl', '.dll', '.ini'];
const TEXTURES_FOLDER = 'Textures';
const TEXTURES_EXTS = ['.utx'];
const SAVES_FOLDER = 'Saves';
const SAVES_EXTS = ['.uvx'];
const CONFIG_FILES = ["default.ini", "defuser.ini"];

const ROOT_FOLDERS = [
  ANIMATIONS_FOLDER,
  'Benchmark',
  'ForceFeedback',
  'Help',
  KARMADATA_FOLDER,
  MAPS_FOLDER,
  MUSIC_FOLDER,
  SOUNDS_FOLDER,
  SPEECH_FOLDER,
  STATICMESHES_FOLDER,
  SYSTEM_FOLDER,
  'SystemLocalized',
  TEXTURES_FOLDER,
  'Web',
  SAVES_FOLDER,
];
const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map(folder => folder.toLowerCase());
const ALL_EXTS = [...ANIMATIONS_EXTS, ...KARMADATA_EXTS, ...MAPS_EXTS, ...MUSIC_EXTS, ...SOUNDS_EXTS, ...SPEECH_EXTS, ...STATICMESHES_EXTS, ...SYSTEM_EXTS, ...TEXTURES_EXTS, ...SAVES_EXTS];

let GAME_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';
const EXEC_XBOX = 'gamelaunchhelper.exe';

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Mod";
const MOD_PATH = '.';
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    //"parameters": PARAMETERS, //commented out by default to avoid passing empty string parameter
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
      //"steamAppId": +STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      //"epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
      "supportsSymlinks": allowSymlinks,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      //"SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      //"EpicAPPId": EPICAPP_ID,
      //"XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", BINARIES_PATH)
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
    detach: true,
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
  //* using registry - requires winapi-bindings
  try {
      const instPath = winapi.RegGetValue(
        INSTALL_HIVE,
        INSTALL_KEY,
        INSTALL_VALUE);
      if (!instPath) {
        throw new Error('empty registry key');
      }
      const splitPath = instPath.value.split('\\');
      const gamePath = splitPath.slice(0, splitPath.length - 2).join(path.sep);
      return () => Promise.resolve(gamePath);
    } catch (err) { //*/
      return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
        .then((game) => game.gamePath);
    }
  //*/
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

//Test for mod files
function testMod(files, gameId) {
  const isFolder = files.some(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const isExt = files.some(file => ALL_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && (isFolder || isExt);

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
function installMod(files) {
  const MOD_TYPE = MOD_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  let folder = '';
  let modFile = '';
  if (files.some(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()))) {
    folder = '';
    modFile = files.find(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()))
  }
  else if (files.some(file => ANIMATIONS_EXTS.includes(path.extname(file).toLowerCase()))) {
    folder = ANIMATIONS_FOLDER;
    modFile = files.find(file => ANIMATIONS_EXTS.includes(path.extname(file).toLowerCase()))
  }
  else if (files.some(file => KARMADATA_EXTS.includes(path.extname(file).toLowerCase()))) {
    folder = KARMADATA_FOLDER;
    modFile = files.find(file => KARMADATA_EXTS.includes(path.extname(file).toLowerCase()));
  }
  else if (files.some(file => MAPS_EXTS.includes(path.extname(file).toLowerCase()))) {
    folder = MAPS_FOLDER;
    modFile = files.find(file => MAPS_EXTS.includes(path.extname(file).toLowerCase()));
  }
  else if (files.some(file => MUSIC_EXTS.includes(path.extname(file).toLowerCase()))) {
    folder = MUSIC_FOLDER;
    modFile = files.find(file => MUSIC_EXTS.includes(path.extname(file).toLowerCase()));
  }
  else if (files.some(file => SOUNDS_EXTS.includes(path.extname(file).toLowerCase()))) {
    folder = SOUNDS_FOLDER;
    modFile = files.find(file => SOUNDS_EXTS.includes(path.extname(file).toLowerCase()));
  }
  else if (files.some(file => SPEECH_EXTS.includes(path.extname(file).toLowerCase()))) {
    folder = SPEECH_FOLDER;
    modFile = files.find(file => SPEECH_EXTS.includes(path.extname(file).toLowerCase()));
  }
  else if (files.some(file => STATICMESHES_EXTS.includes(path.extname(file).toLowerCase()))) {
    folder = STATICMESHES_FOLDER;
    modFile = files.find(file => STATICMESHES_EXTS.includes(path.extname(file).toLowerCase()));
  }
  else if (files.some(file => SYSTEM_EXTS.includes(path.extname(file).toLowerCase()))) {
    folder = SYSTEM_FOLDER;
    modFile = files.find(file => SYSTEM_EXTS.includes(path.extname(file).toLowerCase()))
  }
  else if (files.some(file => TEXTURES_EXTS.includes(path.extname(file).toLowerCase()))) {
    folder = TEXTURES_FOLDER;
    modFile = files.find(file => TEXTURES_EXTS.includes(path.extname(file).toLowerCase()));
  }
  else if (files.some(file => SAVES_EXTS.includes(path.extname(file).toLowerCase()))) {
    folder = SAVES_FOLDER;
    modFile = files.find(file => SAVES_EXTS.includes(path.extname(file).toLowerCase()));
  }
  /*else {
    folder = '';
    modFile = files[0];
  } //*/
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);

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



// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup-notify`;
  const MESSAGE = 'Special Setup Instructions';
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
                + `TEXT HERE.\n`
                + `\n`
                + `TEXT HERE.\n`
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
  const versionFile = path.join(gamePath, BINARIES_PATH, 'Build.ini');
  let data = '';
  try {
    data = await fs.readFileAsync(versionFile, { encoding: 'utf8' });
  } catch (err) {
    log('error', `Could not read ${BINARIES_PATH}/Build.ini file to get game version: ${err}`);
    return Promise.resolve(undefined);
  }
  const segments = data.split('_');
  const v1 = segments[1].replace('v', ''); //3374
  const v2 = segments[4]; //e777cc6e
  const version = `${v1}-${v2}`;
  return Promise.resolve(version);
} //*/

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  if (setupNotification) {
    setupNotify(api);
  }
  return fs.ensureDirWritableAsync(GAME_PATH);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = { //register game
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
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
  context.registerInstaller(MOD_ID, 27, testMod, installMod);
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Open Engine Settings File`, () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, BINARIES_PATH, CONFIG_FILES[0])).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Open User Settings File`, () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, BINARIES_PATH, CONFIG_FILES[1])).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, SAVES_FOLDER)).catch(() => null);
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

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
