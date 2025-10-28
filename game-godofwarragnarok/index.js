/*/////////////////////////////////////////
Name: God of War: Ragnarok Vortex Extension
Structure: Sony Port, Custom Game Data
Author: ChemBoy1
Version: 0.2.2
Date: 2025-04-10
/////////////////////////////////////////*/

//import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const STEAMAPP_ID = "2322010";
const EPICAPP_ID = "";  // not on egdata.app yet
const GAME_ID = "godofwarragnarok";
const EXEC = "GoWR.exe";
const GAME_NAME = "God of War: Ragnarok";
const GAME_NAME_SHORT = "GoW Ragnarok";
const MOD_PATH = ".";
let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Mod types and installers info
const DATA_ID = `${GAME_ID}-data`;
const DATA_NAME = "exec folder";
const DATA_FILE = "exec";

const PATCH_ID = `${GAME_ID}-patchfolder`;
const PATCH_NAME = "patch Folder";
const PATCH_PATH = path.join("exec");
const PATCH_FILE = "patch";

const EXECSUB_ID = `${GAME_ID}-execsub`;
const EXECSUB_NAME = "exec subfolder";
const EXECSUB_PATH = path.join("exec");
const EXECSUB_FOLDERS = ["ActivityFeed", "cinematics", "dc", "languages", "sound", "wad"];

const PACK_ID = `${GAME_ID}-pack`;
const PACK_NAME = "Texpack/Lodpack";
const PACK_PATH = path.join("exec", "patch", "pc_le");
const PACK_EXT = ".texpack";
const LOD_EXT = ".lodpack";
const PACK_EXTS = [PACK_EXT, LOD_EXT];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save (Documents)";
const SAVE_STRING = "GOWRSAVE";
const userHomeValue = util.getVortexPath('home');
const userHomePathSanitize = userHomeValue.replace(/x00s/g, '');
const SAVE_FOLDER = path.join(userHomePathSanitize, "Saved Games", "God of War Ragnar\u00F6k");
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
}
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);

//For boot-options.json file
const BOOT_OPTIONS_FILENAME = "boot-options.json";
const BOOT_OPTIONS_FILEPATH = path.join(DATA_FILE, BOOT_OPTIONS_FILENAME);
const BOOT_TEX_KEY = `patch-texpacks`;
const BOOT_LOD_KEY = `patch-lodpacks`;
let BOOT_OPTIONS_JSON = {};
let BOOT_ORDER_TEX = [];
let BOOT_ORDER_LOD = [];

const SETTINGS_FILE = "settings.ini";

// FILLED IN FROM DATA ABOVE
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": DATA_ID,
      "name": DATA_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": PATCH_ID,
      "name": PATCH_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PATCH_PATH}`
    },
    {
      "id": EXECSUB_ID,
      "name": EXECSUB_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${EXECSUB_PATH}`
    },
    {
      "id": PACK_ID,
      "name": PACK_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PACK_PATH}`
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": SAVE_PATH
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID
    ],
    "names": []
  }
};

//3rd party launchers and tools
const tools = [

];

// BASIC FUNCTIONS ///////////////////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Convert path string placeholders to actual values
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Set mod path
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game information by API utility
async function queryGame() {
  let game = await util.GameStoreHelper.findByAppId(spec.discovery.ids);
  return game;
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

async function requiresLauncher(gamePath, store) {
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Root folder files
function testData(files, gameId) {
  const isMod = files.some(file => path.basename(file) === DATA_FILE);
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
function installData(files) {
  const modFile = files.find(file => (path.basename(file) === DATA_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATA_ID };

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

//Installer test for Root folder files
function testPatch(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === PATCH_FILE));
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
function installPatch(files) {
  const modFile = files.find(file => (path.basename(file) === PATCH_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PATCH_ID };

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

//Installer test for Root folder files
function testExecsub(files, gameId) {
  const isMod = files.find(file => EXECSUB_FOLDERS.includes(path.basename(file))) !== undefined;
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
function installExecsub(files) {
  const modFile = files.find(file => EXECSUB_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: EXECSUB_ID };

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

//test whether to use mod installer
function testPack(files, gameId) {
  const isMod = files.some(file => PACK_EXTS.includes(path.extname(file).toLowerCase()));
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

//mod installer instructions
function installPack(files) {
  const modFile = files.find(file => PACK_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PACK_ID };

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

//test whether to use mod installer
function testSave(files, gameId) {
  const isSave = files.some(file => path.basename(file).includes(SAVE_STRING));
  let supported = (gameId === spec.game.id) && isSave;

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

//mod installer instructions
function installSave(files) {
  const modFile = files.find(file => path.basename(file).includes(SAVE_STRING));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    (file
      //(file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep))
    )
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

const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function updateBootOptions(api) { //* Write texpack and lodpack file names to boot-options.json file (on deployment)
  GAME_PATH = getDiscoveryPath(api);
  try { //read boot-options.json file to get tex and lod order
    const PATCH_FOLDER_FILES = await fs.readdirAsync(path.join(GAME_PATH, PACK_PATH));
    const TEX_FILES = PATCH_FOLDER_FILES.filter(file => (path.extname(file).toLowerCase() === PACK_EXT));
    const TEX_FILE_NAMES = TEX_FILES.map(file => path.basename(file, path.extname(file)));
    const TEX_FILE_NAMES_CONV = TEX_FILE_NAMES.map(file => `../../patch/pc_le/${file}`);
    const LOD_FILES = PATCH_FOLDER_FILES.filter(file => (path.extname(file).toLowerCase() === LOD_EXT));
    const LOD_FILE_NAMES = LOD_FILES.map(file => path.basename(file, path.extname(file)));
    const LOD_FILE_NAMES_CONV = LOD_FILE_NAMES.map(file => `../../patch/pc_le/${file}`);
    BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_TEX_KEY] = TEX_FILE_NAMES_CONV;
    BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_LOD_KEY] = LOD_FILE_NAMES_CONV;
    await fs.writeFileAsync(
      path.join(GAME_PATH, BOOT_OPTIONS_FILEPATH),
      `${JSON.stringify(BOOT_OPTIONS_JSON, null, 2)}`,
      { encoding: "utf8" },
    );
  } catch (err) {
    api.showErrorNotification(`Could not update ${BOOT_OPTIONS_FILEPATH} file.`, err);
  }
}

async function resetBootOptions(api) { // Resetboot-options.json file (on purge)
  GAME_PATH = getDiscoveryPath(api);
  try { //reset boot-options.json file
    BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_TEX_KEY] = [];
    BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_LOD_KEY] = [];
    await fs.writeFileAsync(
      path.join(GAME_PATH, BOOT_OPTIONS_FILEPATH),
      `${JSON.stringify(BOOT_OPTIONS_JSON, null, 2)}`,
      { encoding: "utf8" },
    );
  } catch (err) {
    api.showErrorNotification(`Could not reset ${BOOT_OPTIONS_FILEPATH} file. Please remove entries manually.`, err, { allowReport: false });
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  try { //read boot-options.json file to get current tex and lod order
    BOOT_OPTIONS_JSON = JSON.parse(fs.readFileSync(path.join(GAME_PATH, BOOT_OPTIONS_FILEPATH)));
    //log('warn', `Boot-options.json file read successfully: ${BOOT_OPTIONS_JSON}`);
    BOOT_ORDER_TEX = BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_TEX_KEY];
    BOOT_ORDER_LOD = BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_LOD_KEY];
    //log('warn', `Texpacks: ${BOOT_ORDER_TEX}`);
    //log('warn', `Lodpacks: ${BOOT_ORDER_LOD}`);
  } catch (err) {
    api.showErrorNotification(`Could not read file "${BOOT_OPTIONS_FILEPATH}". Please verify your game files.`, err, { allowReport: false });
  }
  await fs.ensureDirWritableAsync(SAVE_PATH);
  return fs.ensureDirWritableAsync(path.join(discovery.path, PACK_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
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
  context.registerInstaller(DATA_ID, 25, testData, installData);
  context.registerInstaller(PATCH_ID, 30, testPatch, installPatch);
  context.registerInstaller(EXECSUB_ID, 35, testExecsub, installExecsub);
  context.registerInstaller(PACK_ID, 40, testPack, installPack);
  context.registerInstaller(SAVE_ID, 45, testSave, installSave);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Settings INI', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, SETTINGS_FILE);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open boot-options.json', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, BOOT_OPTIONS_FILEPATH);
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
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return await updateBootOptions(context.api);
    });
    context.api.onAsync('did-purge', (profileId) => didPurge(context.api, profileId)); //*/
  });
  return true;
}

async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  resetBootOptions(api);
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
