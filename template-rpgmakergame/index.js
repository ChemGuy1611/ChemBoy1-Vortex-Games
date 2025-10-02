/*///////////////////////////////////////////
Name: XXX Vortex Extension
Structure: RPGMaker Engine Game
Author: ChemBoy1
Version: 0.1.0
Date: 2025-09-17
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const fsPromises = require('fs/promises');
//const winapi = require('winapi-bindings');
//const turbowalk = require('turbowalk');

//const USER_HOME = util.getVortexPath("home");
const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "XXX";
const STEAMAPP_ID = "XXX";
const STEAMAPP_ID_DEMO = "XXX";
const EPICAPP_ID = "XXX";
const GOGAPP_ID = "XXX";
const XBOXAPP_ID = "XXX";
const XBOXEXECNAME = "XXX";
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "XXX";
const GAME_NAME_SHORT = "XXX";
const EXEC = "XXX.exe";
const EXEC_EGS = EXEC;
const EXEC_XBOX = 'gamelaunchhelper.exe';
const NAME_FOLDER = 'XXX';

const ROOT_FOLDERS = [NAME_FOLDER, 'audio', 'css', 'data', 'effects', 'fonts', 'icon', 'img', 'lib', 'locales', 'swiftshader'];
const DATA_FOLDER = 'XXX';
const CONFIGMOD_LOCATION = DOCUMENTS;
const CONFIG_FOLDERNAME = 'XXX';
const SAVEMOD_LOCATION = DOCUMENTS;
const SAVE_FOLDERNAME = CONFIG_FOLDERNAME;

let GAME_PATH = null;
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

const JSFOLDER_ID = `${GAME_ID}-jsfolder`;
const JSFOLDER_NAME = "js folder";
const JSFOLDER_PATH = ".";
const JSFOLDER_FILE = 'js';

const JSFILE_ID = `${GAME_ID}-jsfile`;
const JSFILE_NAME = "js file";
const JSFILE_PATH = path.join('js', 'plugins');
const JSFILE_EXT = ".js";

const JSLIST_FILE = 'plugins.js';
const JSLIST_FILE_PATH = path.join('js', JSLIST_FILE);
const JSLIST_TEMPLATE = {
  "name": "{modName}",
  "status": true,
  "description": "Mod installed with Vortex. See mod page for descripton. You may need to add additional parameters below.",
  "parameters": {}
}
const JSLIST_HEADER = `var $plugins =\n`;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const JSON_ID = `${GAME_ID}-json`;
const JSON_NAME = "JSON Mod";
const JSON_PATH = path.join('data');
const JSON_EXT = ".json";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_EXT = ".ini";
const CONFIG_FILES = ["XXX"];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, DATA_FOLDER, SAVE_FOLDERNAME);
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
const SAVE_EXT = ".sav";
const SAVE_FILES = ["XXX"];

const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = "XXX";
const TOOL_EXEC = path.join('XXX', 'XXX.exe');

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC; //NAME_FOLDER or EXEC
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];
const IGNORE_CONFLICTS = [path.join('**', 'instructions.txt'), path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "parameters": PARAMETERS,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "ignoreConflicts": IGNORE_CONFLICTS,
      //"supportsSymlinks": false,
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
      "id": JSFOLDER_ID,
      "name": JSFOLDER_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${JSFOLDER_PATH}`
    },
    {
      "id": JSFILE_ID,
      "name": JSFILE_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${JSFILE_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": JSON_ID,
      "name": JSON_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${JSON_PATH}`
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

//Replace folder path string placeholders with actual folder paths
function modNamePattern(fileName, pattern) {
  try {
    return template(pattern, {
      modName: fileName,
    });
  }
  catch (err) {
    log('error', `Could not add mod to plugins.js file. You will have to add it manually: ${err}`);
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

//Get correct executable for game version
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
    return EXEC_XBOX;
  };
  return EXEC;
}

//Get correct game version
function setGameVersion(gamePath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(gamePath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  };
  if (isCorrectExec(EXEC)) {
    GAME_VERSION = 'default';
    return GAME_VERSION;
  };
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

//Test for save files
function testJsFolder(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === JSFOLDER_FILE));
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

//Install save files
async function installJsFolder(files, fileName) {
  const MOD_TYPE = JSFOLDER_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === JSFOLDER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

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

  try { //Add mod to plugins.js file
    const listPath = path.join(GAME_PATH, JSLIST_FILE_PATH);
    let plugins = await fsPromises.readdir(fileName, {recursive: true});
    plugins = plugins.filter(file => file.endsWith(JSFILE_EXT)); //.js files
    plugins = plugins.map(file => path.basename(file, JSFILE_EXT)); //map array to plugin names
    let data = await fs.readFileAsync(listPath);
    data = data.toString();
    data = data.slice(data.indexOf('['), data.indexOf(';'));
    let dataArray = JSON.parse(data);
    let pluginsToWrite = [];
    let pluginObjectArray = [];
    plugins.forEach((plugin, index) => {
      const inList = Object.keys(dataArray).some(idx => dataArray[idx]?.name === plugin);
      if (!inList) {  
        pluginsToWrite.push(plugin);
      }
    });
    pluginsToWrite.forEach((plugin, index) => {
      const entry = {
        "name": `${plugin}`,
        "status": true,
        "description": "Mod installed with Vortex. See mod page for description. You may need to add additional parameters below.",
        "parameters": {}
      }
      pluginObjectArray.push(entry);
    });
    log('warn', `plugins to write: ${pluginsToWrite}`);
    const writeArray = dataArray.concat(pluginObjectArray);
    const writeData = JSON.stringify(writeArray, null, 2);
    await fs.writeFileAsync(listPath, `${JSLIST_HEADER}${writeData};`);
  } catch (err) {
    log('error', `Could not add mod to plugins.js file. You will have to add it manually: ${err}`);
  }

  return Promise.resolve({ instructions });
}

//Test for save files
function testJsFile(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === JSFILE_EXT));
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

//Install save files
async function installJsFile(files, fileName) {
  const MOD_TYPE = JSFILE_ID;
  const modFile = files.find(file => (path.extname(file).toLowerCase() === JSFILE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

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

  try { //Add mod to plugins.js file
    const listPath = path.join(GAME_PATH, JSLIST_FILE_PATH);
    let plugins = await fsPromises.readdir(fileName, {recursive: true});
    plugins = plugins.filter(file => file.endsWith(JSFILE_EXT)); //.js files
    plugins = plugins.map(file => path.basename(file, JSFILE_EXT)); //map array to plugin names
    let data = await fs.readFileAsync(listPath);
    data = data.toString();
    data = data.slice(data.indexOf('['), data.indexOf(';'));
    let dataArray = JSON.parse(data);
    let pluginsToWrite = [];
    let pluginObjectArray = [];
    plugins.forEach((plugin, index) => {
      const inList = Object.keys(dataArray).some(idx => dataArray[idx]?.name === plugin);
      if (!inList) {  
        pluginsToWrite.push(plugin);
      }
    });
    pluginsToWrite.forEach((plugin, index) => {
      const entry = {
        "name": `${plugin}`,
        "status": true,
        "description": "Mod installed with Vortex. See mod page for description. You may need to add additional parameters below.",
        "parameters": {}
      }
      pluginObjectArray.push(entry);
    });
    log('warn', `plugins to write: ${pluginsToWrite}`);
    const writeArray = dataArray.concat(pluginObjectArray);
    const writeData = JSON.stringify(writeArray, null, 2);
    await fs.writeFileAsync(listPath, `${JSLIST_HEADER}${writeData};`);
  } catch (err) {
    log('error', `Could not add mod to plugins.js file. You will have to add it manually: ${err}`);
  }

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
  const MOD_TYPE = ROOT_ID;
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
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

//Test for save files
function testJson(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === JSON_EXT));
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

//Install save files
function installJson(files) {
  const MOD_TYPE = JSON_ID;
  const modFile = files.find(file => (path.extname(file).toLowerCase() === JSON_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User to update plugins.js file
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup`;
  const MESSAGE = `User Must Update plugins.js File Manually`;
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
            text: `After installing a js plugin mods with Vortex, you must update the plugins.js file manually.\n`
                + `Please read each mod's description for instructions on how to do this.\n`
                + `You can open the file with the button below or using the button inside the folder icon on the Mods toolbar.\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
            {
              label: 'Open plugins.js File', action: () => {
                util.opn(path.join(GAME_PATH, JSLIST_FILE_PATH)).catch(() => null);
                dismiss();
              }
            },
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

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  //GAME_VERSION = setGameVersion(GAME_PATH);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  setupNotify(api);
  // ASYNC CODE //////////////////////////////////////////
  return fs.ensureDirWritableAsync(path.join(GAME_PATH, JSFILE_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    //executable: getExecutable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    //getGameVersion: resolveGameVersion,
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
  );
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
  context.registerInstaller(JSFOLDER_ID, 25, testJsFolder, installJsFolder);
  context.registerInstaller(JSFILE_ID, 27, testJsFile, installJsFile);
  context.registerInstaller(ROOT_ID, 29, testRoot, installRoot);
  context.registerInstaller(JSON_ID, 31, testJson, installJson);
  //context.registerInstaller(CONFIG_ID, 47, testConfig, installConfig);
  //context.registerInstaller(SAVE_ID, 49, testSave, installSave);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open plugins.js File', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, JSLIST_FILE_PATH);
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

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
