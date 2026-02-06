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
const fsPromises = require('fs/promises'); //.readdir() for recursive folder reading

//Specify all the information about the game
const STEAMAPP_ID = "2322010";
const EPICAPP_ID = "";  // not on egdata.app yet
const GAME_ID = "godofwarragnarok";
const EXEC = "GoWR.exe";
const GAME_NAME = "God of War: Ragnarok";
const GAME_NAME_SHORT = "GoW Ragnarok";
const MOD_PATH = ".";
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/God_of_War_Ragnar%C3%B6k";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/959"; //Nexus link to this extension. Used for links

let GAME_PATH = '';
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
const READ_PAK_PATH = path.join("exec", "patch");
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
} //*/
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);

//For boot-options.json file
const BOOT_OPTIONS_FILENAME = "boot-options.json";
const BOOT_OPTIONS_FILEPATH = path.join(DATA_FILE, BOOT_OPTIONS_FILENAME);
const BOOT_TEX_KEY = "patch-texpacks";
const BOOT_LOD_KEY = "patch-lodpacks";
let BOOT_OPTIONS_JSON = {};
let BOOT_ORDER_TEX = [];
let BOOT_ORDER_LOD = [];

const SETTINGS_FILE = "settings.ini";

const LUAMOD_ID = `${GAME_ID}-luamod`;
const LUAMOD_NAME = "Lua Mod";
const LUAMOD_PATH = path.join("mod");
const LUAMOD_FOLDER = "int9";
const LUAMOD_EXTS = ['.lua'];

const LOADER_ID = `${GAME_ID}-scriptloader`;
const LOADER_NAME = "GoWR-Script-Loader";
const LOADER_ZIP = `God.of.War.Ragnarok.zip`;
const LOADER_URL = `https://github.com/Eiton/GoWR-Script-Loader/releases/latest/download/${LOADER_ZIP}`;
const LOADER_URL_ERR = "https://github.com/Eiton/GoWR-Script-Loader/releases";
const LOADER_CONFIG_FILE = "GOWR-Script-Loader.ini"; 
const LOADER_CONFIG_FILEPATH = path.join(LOADER_CONFIG_FILE);
const LOADER_FILE = 'winmm.dll';

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
      "steamAppId": +STEAMAPP_ID,
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
      "targetPath": path.join('{gamePath}', PATCH_PATH)
    },
    {
      "id": EXECSUB_ID,
      "name": EXECSUB_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', EXECSUB_PATH)
    },
    {
      "id": PACK_ID,
      "name": PACK_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', PACK_PATH)
    },
    {
      "id": LUAMOD_ID,
      "name": LUAMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', LUAMOD_PATH)
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": SAVE_PATH
    },
    {
      "id": LOADER_ID,
      "name": LOADER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
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

//test whether to use mod installer
function testLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LOADER_FILE.toLowerCase()));
  const isConfig = files.some(file => (path.basename(file).toLowerCase() === LOADER_CONFIG_FILE.toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod && isConfig;

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
function installLoader(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LOADER_FILE.toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOADER_ID };

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
function testLuaMod(files, gameId) {
  const isMod = files.some(file => LUAMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === LUAMOD_FOLDER));
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

//mod installer instructions
function installLuaMod(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LUAMOD_FOLDER));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LUAMOD_ID };

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

// AUTO-DOWNLOAD FUNCTIONS /////////////////////////////////////////////////////////

//* Function to auto-download from GitHub or external site //////////////////////////////////////////////////////
async function downloadLoader(api, gameSpec) {
  //let isInstalled = isLoaderInstalled(api, gameSpec);
  //if (!isInstalled) {
    const MOD_NAME = LOADER_NAME;
    const MOD_TYPE = LOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = LOADER_URL;
    const ERR_URL = LOADER_URL_ERR;
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
  //}
} //*/

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

//* Write texpack and lodpack file names to boot-options.json file (on deployment)
async function updateBootOptions(api) { 
  GAME_PATH = getDiscoveryPath(api);
  try { //read files and write to boot-options.json file
    //.texpack files
    //const PATCH_FOLDER_FILES = await fs.readdirAsync(path.join(GAME_PATH, PACK_PATH));
    const PATCH_FOLDER_FILES = await fsPromises.readdir(path.join(GAME_PATH, READ_PAK_PATH), { recursive: true });
    const TEX_FILES = PATCH_FOLDER_FILES.filter(file => (path.extname(file).toLowerCase() === PACK_EXT));
    /*const TEX_FILE_NAMES = TEX_FILES.map(file => path.basename(file, path.extname(file)));
    const TEX_FILE_NAMES_CONV = TEX_FILE_NAMES.map(file => `../../patch/pc_le/${file}`); //*/
    const TEX_FILE_NAMES = TEX_FILES.map(file => file.replace(path.extname(file), '').replace("\\", "/"));
    const TEX_FILE_NAMES_CONV = TEX_FILE_NAMES.map(file => `../../patch/${file}`); //*/
    //.lodpack files
    const LOD_FILES = PATCH_FOLDER_FILES.filter(file => (path.extname(file).toLowerCase() === LOD_EXT));
    /*const LOD_FILE_NAMES = LOD_FILES.map(file => path.basename(file, path.extname(file)));
    const LOD_FILE_NAMES_CONV = LOD_FILE_NAMES.map(file => `../../patch/pc_le/${file}`); //*/
    const LOD_FILE_NAMES = LOD_FILES.map(file => file.replace(path.extname(file), '').replace("\\", "/"));
    const LOD_FILE_NAMES_CONV = LOD_FILE_NAMES.map(file => `../../patch/${file}`); //*/
    BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_TEX_KEY] = TEX_FILE_NAMES_CONV;
    BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_LOD_KEY] = LOD_FILE_NAMES_CONV;
    BOOT_ORDER_TEX = BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_TEX_KEY];
    BOOT_ORDER_LOD = BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_LOD_KEY];
    await fs.writeFileAsync(
      path.join(GAME_PATH, BOOT_OPTIONS_FILEPATH),
      JSON.stringify(BOOT_OPTIONS_JSON, null, 2),
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
    BOOT_ORDER_TEX = BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_TEX_KEY];
    BOOT_ORDER_LOD = BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_LOD_KEY];
    await fs.writeFileAsync(
      path.join(GAME_PATH, BOOT_OPTIONS_FILEPATH),
      JSON.stringify(BOOT_OPTIONS_JSON, null, 2),
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
    const contents = await fs.readFileAsync(path.join(GAME_PATH, BOOT_OPTIONS_FILEPATH), 'utf8');
    BOOT_OPTIONS_JSON = JSON.parse(contents);
    //log('warn', `Boot-options.json file read successfully: ${BOOT_OPTIONS_JSON}`);
    BOOT_ORDER_TEX = BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_TEX_KEY];
    BOOT_ORDER_LOD = BOOT_OPTIONS_JSON.allcontentidarray[0][BOOT_LOD_KEY];
    log('warn', `Texpacks: ${BOOT_ORDER_TEX}`);
    log('warn', `Lodpacks: ${BOOT_ORDER_LOD}`);
  } catch (err) {
    api.showErrorNotification(`Could not read file "${BOOT_OPTIONS_FILEPATH}". Please verify your game files.`, err, { allowReport: false });
  }
  await fs.ensureDirWritableAsync(SAVE_PATH);
  await fs.ensureDirWritableAsync(path.join(discovery.path, LUAMOD_PATH));
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
  context.registerInstaller(LOADER_ID, 25, testLoader, installLoader);
  context.registerInstaller(DATA_ID, 27, testData, installData);
  context.registerInstaller(PATCH_ID, 29, testPatch, installPatch);
  context.registerInstaller(EXECSUB_ID, 31, testExecsub, installExecsub);
  context.registerInstaller(PACK_ID, 33, testPack, installPack);
  context.registerInstaller(LUAMOD_ID, 35, testLuaMod, installLuaMod);
  context.registerInstaller(SAVE_ID, 37, testSave, installSave);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${LOADER_NAME}`, () => {
    downloadLoader(context.api, spec).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open GoWR-Script-Loader Config', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, LOADER_CONFIG_FILEPATH);
    util.opn(openPath).catch(() => null);
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
    util.opn(path.join(__dirname, 'CHANGELOG.md')).catch(() => null);
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
      await updateBootOptions(context.api);
      return Promise.resolve();
    });
    context.api.onAsync('did-purge', async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      await resetBootOptions(context.api);
      return Promise.resolve();
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
