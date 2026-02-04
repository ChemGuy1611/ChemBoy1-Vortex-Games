/*/////////////////////////////////////////////////////
Name: Dragon Ball: Sparking! Zero Vortex Extension
Structure: UE5
Author: ChemBoy1
Version: 0.5.0
Date: 2026-02-01
/////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const fsPromises = require('fs/promises');

//Specify all information about the game
const GAME_ID = "dragonballsparkingzero";
const STEAMAPP_ID = "1790600";
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const EPIC_CODE_NAME = "SparkingZERO";
const LOCALDATA_FOLDER = EPIC_CODE_NAME;
const EXEC_FOLDER_NAME = "Win64";
const GAME_NAME = "Dragon Ball: Sparking! Zero";
const GAME_NAME_SHORT = "DB Sparking! Zero";
const EXEC = "SparkingZERO.exe";
const IO_STORE = true; //true if the Paks folder contains .ucas and .utoc files
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Dragon_Ball:_Sparking!_Zero";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1055";

let GAME_PATH = '';
let CHECK_DATA = false;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Set file number for pak installer file selection (needs to be 3 if IO Store is used to accomodate .ucas and .utoc files)
let PAK_FILE_MIN = 1;
let SYM_LINKS = true;
if (IO_STORE) {
  PAK_FILE_MIN = 3;
  SYM_LINKS = false;
}

//Unreal Engine Game Data
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'),
  fileExt: ['.pak', '.ucas', '.utoc'],
  loadOrder: true,
}

//Specify information for mod types and installers
const SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_NAME, `${EPIC_CODE_NAME}-${EXEC_FOLDER_NAME}-Shipping.exe`);
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_NAME);

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_FOLDER = EPIC_CODE_NAME;

const UE5_ID = `${GAME_ID}-ue5`;
const UE5_ALT_ID = `${GAME_ID}-pakalt`;
const UE5_EXT = UNREALDATA.fileExt;
const UE5_PATH = UNREALDATA.modsPath;
const UE5_ALT_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks');
const UE5_SORTABLE_ID = `${GAME_ID}-ue5-sortable-modtype`;
const LEGACY_UE5_SORTABLE_ID = 'ue5-sortable-modtype';
const UE5_SORTABLE_NAME = 'UE5 Sortable Mod';

const LOGICMODS_ID = `${GAME_ID}-logicmods`;
const UE4SSCOMBO_ID = `${GAME_ID}-ue4sscombo`;
const LOGICMODS_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks', 'LogicMods');
const LOGICMODS_FOLDER = "LogicMods";
const LOGICMODS_EXT = ".pak";

const LOCALAPPDATA = util.getVortexPath('localAppData');
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config (LocalAppData)";
const CONFIG_PATH = path.join(LOCALAPPDATA, LOCALDATA_FOLDER, "Saved", "Config", "Windows");
const CONFIG_FILES = ["engine.ini", "scalability.ini", "input.ini"];
const CONFIG_EXT = ".ini";

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Saves (Game Directory)";
const SAVE_PATH = path.join("SaveGame");
const SAVE_STRING = "MainGameSaveData";
let USERID_FOLDER = "";

const SCRIPTS_ID = `${GAME_ID}-scripts`;
const SCRIPTS_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_NAME, 'ue4ss', 'Mods');
const SCRIPTS_EXT = ".lua";
const SCRIPTS_FOLDER = "Scripts";

const DLL_ID = `${GAME_ID}-ue4ssdll`;
const DLL_NAME = "UE4SS DLL Mod";
const DLL_EXT = ".dll";
const DLL_FOLDER = "dlls";
const DLL_PATH = SCRIPTS_PATH;

const UE4SS_ID = `${GAME_ID}-ue4ss`;
const UE4SS_FILE = "dwmapi.dll";

const SIGBYPASS_ID = `${GAME_ID}-sigbypass`;
const SIGBYPASS_NAME = "Signature Bypass";
const SIGBYPASS_DLL = "dsound.dll";
const SIGBYPASS_FILE = "dbsparkingzeroutocbypass.asi";
const SIGBYPASS_PAGE_NO = 18;
const SIGBYPASS_FILE_NO = 2175;

const MODLOADER_ID = `${GAME_ID}-modloader`;
const MODLOADER_NAME = "SZModLoader";
const MODLOADER_PATH = path.join(EPIC_CODE_NAME, 'Mods');
const MODLOADER_FILE = "SZModLib";
const MODLOADER_PAGE_NO = 348;
const MODLOADER_FILE_NO = 1720;

const LFSE_ID = `${GAME_ID}-lfse`;
const LFSE_PATH = path.join(EPIC_CODE_NAME, 'Mods');
const LFSE_FILE = "LFSE";

const MODLOADERMOD_ID = `${GAME_ID}-modloadermod`;
const MODLOADERMOD_PATH = path.join(EPIC_CODE_NAME, 'Mods');
const MODLOADERMOD_EXT = ".uplugin";

const JSON_ID = `${GAME_ID}-json`;
const JSON_PATH = path.join(EPIC_CODE_NAME, `Mods`, `ZeroSpark`, `Json`);
const JSON_EXT = ".json";
const JSONFILES_FILE = "JsonFiles.json";
let JSONFILES_JSON = {};
let DEFAULT_ARRAY = [];
let DEFAULT_JSON = {
  "Default": [],
  "Unverum": []
};
const JSONFILES_KEY = "Default";

const MOD_PATH_DEFAULT = BINARIES_PATH;

//This information will be filled in from the data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC,
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
      "supportsSymlinks": SYM_LINKS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      //"XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": SCRIPTS_ID,
      "name": "UE4SS Scripts",
      "priority": "high",
      "targetPath": path.join(`{gamePath}`, SCRIPTS_PATH)
    },
    { //UE4SS DLL Mods
      "id": DLL_ID,
      "name": DLL_NAME,
      "priority": "high",
      "targetPath": path.join(`{gamePath}`, DLL_PATH)
    },
    {
      "id": LOGICMODS_ID,
      "name": "UE4SS LogicMods (Blueprint)",
      "priority": "high",
      "targetPath": path.join(`{gamePath}`, LOGICMODS_PATH)
    },
    {
      "id": UE4SSCOMBO_ID,
      "name": "UE4SS Script-LogicMod Combo",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": MODLOADERMOD_ID,
      "name": "SZModLoader Mod",
      "priority": "high",
      "targetPath": path.join(`{gamePath}`, MODLOADERMOD_PATH)
    },
    {
      "id": JSON_ID,
      "name": "SZModLoader JSON",
      "priority": "high",
      "targetPath": path.join(`{gamePath}`, JSON_PATH)
    },
    {
      "id": ROOT_ID,
      "name": "Root Game Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": UE5_ID,
      "name": "UE5 Paks",
      "priority": "high",
      "targetPath": path.join(`{gamePath}`, UE5_PATH)
    },
    {
      "id": UE5_ALT_ID,
      "name": 'UE5 Paks (no "~mods")',
      "priority": "high",
      "targetPath": path.join(`{gamePath}`, UE5_ALT_PATH)
    },
    {
      "id": BINARIES_ID,
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": path.join(`{gamePath}`, BINARIES_PATH)
    },
    {
      "id": UE4SS_ID,
      "name": "UE4SS",
      "priority": "low",
      "targetPath": path.join(`{gamePath}`, BINARIES_PATH)
    },
    {
      "id": SIGBYPASS_ID,
      "name": SIGBYPASS_NAME,
      "priority": "low",
      "targetPath": path.join(`{gamePath}`, BINARIES_PATH)
    },
    {
      "id": MODLOADER_ID,
      "name": MODLOADER_NAME,
      "priority": "low",
      "targetPath": path.join(`{gamePath}`, MODLOADER_PATH)
    },
    {
      "id": LFSE_ID,
      "name": "LFSE",
      "priority": "low",
      "targetPath": path.join(`{gamePath}`, LFSE_PATH)
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
      //GOGAPP_ID,
      //XBOXAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: "LaunchModdedGame",
    name: "Custom Launch",
    logo: `exec.png`,
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    shell: true,
    relative: true,
    exclusive: true,
    //defaultPrimary: true,
    //parameters: []
  }, //*/
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 30,
    low: 75,
  }[priority];
}

//Change folder path string placeholders to actual folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Set the mod path
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
  if (store === 'steam') {
      return Promise.resolve({
          launcher: 'steam',
      });
  }
  /*if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  return Promise.resolve(undefined);
}

const getDiscoveryPath = (api) => {
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for save files
function testUe4ssCombo(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === SCRIPTS_EXT) !== undefined;
  const isMod2 = files.find(file => path.extname(file).toLowerCase() === LOGICMODS_EXT) !== undefined;
  const isFolder = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase()) !== undefined;
  let supported = (gameId === spec.game.id) && isMod && isMod2 && isFolder;

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
function installUe4ssCombo(files, fileName) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE4SSCOMBO_ID };

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
function testLogic(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === LOGICMODS_FOLDER.toLowerCase());
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
function installLogic(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === LOGICMODS_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOGICMODS_ID };

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

//Installer test for UE4SS files
function testUe4ss(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === UE4SS_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install UE4SS files
function installUe4ss(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === UE4SS_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE4SS_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    //((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    ((file.indexOf(rootPath) !== -1))
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
function testScripts(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === SCRIPTS_EXT) !== undefined;
  const isFolder = files.find(file => path.basename(file).toLowerCase() === SCRIPTS_FOLDER.toLowerCase()) !== undefined;
  let supported = (gameId === spec.game.id) && isMod && isFolder;

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
function installScripts(files, fileName) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === SCRIPTS_FOLDER.toLowerCase());
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SCRIPTS_ID };
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  }

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

//Test for UE4SS DLL files
function testDll(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === DLL_EXT));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === DLL_FOLDER.toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod && isFolder;

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

//Install UE4SS DLL files
function installDll(files, fileName) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === DLL_FOLDER.toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DLL_ID };
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  }
  
  const ENABLEDTXT_FILE = 'enabled.txt'
  const ENABLEDTXT_PATH = path.join(fileName, rootPath, ENABLEDTXT_FILE);
  try {
    fs.statSync(ENABLEDTXT_PATH);
  } catch (err) {
    try {
      fs.writeFileSync(
        ENABLEDTXT_PATH,
        ``,
        { encoding: "utf8" },
      );
      files.push(path.join(rootPath, ENABLEDTXT_FILE));
      log('info', `Successfully created enabled.txt for UE4SS DLL Mod: ${MOD_NAME}`);
    } catch (err) {
      log('error', `Could not create enabled.txt for UE4SS DLL Mod: ${MOD_NAME}`);
    }
  }

  //Filter files and set instructions
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

//Test for config files
function testConfig(files, gameId) {
  const isConfig = files.some(file => CONFIG_FILES.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isConfig;

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

//Install config files
function installConfig(api, files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === CONFIG_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

  //Filter files and set instructions
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
  GAME_PATH = getDiscoveryPath(api);
  const IS_CONFIG = checkPartitions(CONFIG_PATH, GAME_PATH);
  if (IS_CONFIG === false) {
    api.showErrorNotification(`Could not install mod as Config`, `You tried installing a Config file mod, but the game, staging folder, and Local AppData folder are not all on the same drive. Please move the game and/or staging folder to the same drive as the Local AppData folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  }
  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    //((file.indexOf(rootPath) !== -1))
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
  const isSave = files.find(file => path.basename(file).includes(SAVE_STRING)) !== undefined;
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
      //(file.indexOf(rootPath) !== -1) 
      //&& (!file.endsWith(path.sep))
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

//Installer test for Signature Bypass files
function testSigBypass(files, gameId) {
  const isDll = files.some(file => path.basename(file).toLowerCase() === SIGBYPASS_DLL);
  const isAsi = files.some(file => path.basename(file).toLowerCase() === SIGBYPASS_FILE);
  let supported = (gameId === spec.game.id) && isDll && isAsi;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install UE4SS files
function installSigBypass(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === SIGBYPASS_DLL);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SIGBYPASS_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    //((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    ((file.indexOf(rootPath) !== -1))
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

//Test for Mod Loader
function testModLoader(files, gameId) {
  const isMod = files.some(file => path.basename(file) === MODLOADER_FILE);
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

//Install Mod Loader
function installModLoader(files) {
  const modFile = files.find(file => path.basename(file) === MODLOADER_FILE);
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODLOADER_ID };

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

//Test for LFSE
function testLFSE(files, gameId) {
  const isMod = files.some(file => path.basename(file) === LFSE_FILE);
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

//Install LFSE
function installLFSE(files) {
  const modFile = files.find(file => path.basename(file) === LFSE_FILE);
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LFSE_ID };

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

//Test for Mod Loader mods
function testModLoaderMod(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === MODLOADERMOD_EXT) !== undefined;
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

//Install Mod Loader mods
function installModLoaderMod(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === MODLOADERMOD_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODLOADERMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep))));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(path.basename(modFile, '.uplugin'), file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for Mod Loader mods
function testJson(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === JSON_EXT) !== undefined;
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

//Install Mod Loader mods
function installJson(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === JSON_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: JSON_ID };

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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if UE4SS is installed
function isUe4ssInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === UE4SS_ID);
}

//Check if Signature Bypass is installed
function isSigBypassInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === SIGBYPASS_ID);
}

//Check if Signature Bypass is installed
function isModLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MODLOADER_ID);
}

//Function to auto-download UE4SS from Nexus
async function downloadUe4ss(api, gameSpec) {
  let modLoaderInstalled = isUe4ssInstalled(api, gameSpec);
  if (!modLoaderInstalled) {
    //notification indicating install process
    const MOD_NAME = `UE4SS`;
    const NOTIF_ID = `${MOD_NAME}-installing`;
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
    const modPageId = 19;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
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
        actions.setModType(gameSpec.game.id, modId, UE4SS_ID), // Set the mod type
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

//Function to auto-download Signature Bypass from Nexus
async function downloadSigBypass(api, gameSpec) {
  let modLoaderInstalled = isSigBypassInstalled(api, gameSpec);
  if (!modLoaderInstalled) {
    const MOD_NAME = SIGBYPASS_NAME;
    const MOD_TYPE = SIGBYPASS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = SIGBYPASS_PAGE_NO;
    const FILE_ID = SIGBYPASS_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = gameSpec.game.id;
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
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          //throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
          throw new Error(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        game: gameSpec.game.id, // always set to the game's ID so user wil not get a game selection popup. Vortex will update the metadata automatically if the mod is from another domain, such as 'site'
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
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download Mod Enabler form Nexus Mods
async function downloadModLoader(api, gameSpec) {
  let isInstalled = isModLoaderInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MODLOADER_NAME;
    const MOD_TYPE = MODLOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = MODLOADER_PAGE_NO;
    const FILE_ID = MODLOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = gameSpec.game.id;
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
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          //throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
          throw new Error(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        game: gameSpec.game.id, // always set to the game's ID so user wil not get a game selection popup. Vortex will update the metadata automatically if the mod is from another domain, such as 'site'
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
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// UNREAL FUNCTIONS ///////////////////////////////////////////////////////////////

//UNREAL - Pre-sort function
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = UNREALDATA.fileExt;

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    const paks = util.getSafe(modInfo.attributes, ['unrealModFiles'], []);
    if (paks.length > 1) name = name + ` (${paks.length} ${fileExt} files)`;

    return {
      id: mod.id,
      name,
      imgUrl: util.getSafe(modInfo, ['attributes', 'pictureUrl'], path.join(__dirname, spec.game.logo))
    }
  });

  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);
}

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

function makePrefix(input) {
  let res = '';
  let rest = input;
  while (rest > 0) {
      res = String.fromCharCode(65 + (rest % 25)) + res;
      rest = Math.floor(rest / 25);
  }
  return util.pad(res, 'A', 3);
}

function loadOrderPrefix(api, mod) {
  const state = api.getState();
  const gameId = GAME_ID;
  const profile = selectors.lastActiveProfileForGame(state, gameId);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});
  const loKeys = Object.keys(loadOrder);
  const pos = loKeys.indexOf(mod.id);
  if (pos === -1) {
      return 'ZZZZ-';
  }
  return makePrefix(pos) + '-';
}

function installUnrealMod(api, files, gameId) {
  return __awaiter(this, void 0, void 0, function* () {
    const game = gameId;
    const fileExt = UNREALDATA.fileExt;
    if (!fileExt)
      Promise.reject('Unsupported game - UE5 installer failed.');
    const modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const modType = {
      type: 'setmodtype',
      value: UE5_SORTABLE_ID,
    };
    const installFiles = (modFiles.length > PAK_FILE_MIN)
      ? yield chooseFilesToInstall(api, modFiles, fileExt)
      : modFiles;
    const unrealModFiles = {
      type: 'attribute',
      key: 'unrealModFiles',
      value: modFiles.map(f => path.basename(f))
    };
    let instructions = installFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file)
      };
    });
    instructions.push(modType);
    instructions.push(unrealModFiles);
    return Promise.resolve({ instructions });
  });
}

function chooseFilesToInstall(api, files, fileExt) {
  return __awaiter(this, void 0, void 0, function* () {
    const t = api.translate;
    return api.showDialog('question', t('Multiple {{PAK}} files', { replace: { PAK: fileExt } }), {
        text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: fileExt } }) +
            `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
        checkboxes: files.map((pak) => {
            return {
                id: path.basename(pak),
                text: path.basename(pak),
                value: false
            };
        })
    }, [
        { label: 'Cancel' },
        { label: 'Install Selected' },
        { label: 'Install All_plural' }
    ]).then((result) => {
        if (result.action === 'Cancel')
            return Promise.reject(new util.ProcessCanceled('User cancelled.'));
        else {
            const installAll = (result.action === 'Install All' || result.action === 'Install All_plural');
            const installPAKS = installAll ? files : Object.keys(result.input).filter(s => result.input[s])
                .map(file => files.find(f => path.basename(f) === file));
            return installPAKS;
        }
    });
  });
}

function UNREALEXTENSION(context) {
  const testUnrealGame = (gameId, withLoadOrder) => {
    const game = gameId === spec.game.id;
    const unrealModsPath = UNREALDATA.modsPath;
    const loadOrder = UNREALDATA.loadOrder;
    return (!!unrealModsPath && game && loadOrder === true);
  };

  const testForUnrealMod = (files, gameId) => {
    const supportedGame = testUnrealGame(gameId);
    const fileExt = UNREALDATA.fileExt;
    let modFiles = [];
    if (fileExt)
      modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const supported = (supportedGame && (gameId === spec.game.id) && modFiles.length > 0);

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
  };

  const getUnrealModsPath = (game) => {
    const modsPath = UNREALDATA.modsPath;
    const state = context.api.getState();
    const discoveryPath = util.getSafe(state.settings, ['gameMode', 'discovered', game.id, 'path'], undefined);
    const installPath = [discoveryPath].concat(modsPath.split(path.sep));
    return discoveryPath ? path.join.apply(null, installPath) : undefined;
  };

  context.registerInstaller('ue5-pak-installer', 37, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealMod(context.api, files, gameId));

  context.registerModType(UE5_SORTABLE_ID, 25, (gameId) => testUnrealGame(gameId, true), getUnrealModsPath, () => Promise.resolve(false), {
    name: 'UE5 Sortable Mod',
    mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id
  });
  context.registerModType(LEGACY_UE5_SORTABLE_ID, 65, 
    (gameId) => testUnrealGame(gameId, true), 
    getUnrealModsPath, 
    () => Promise.resolve(false), 
    { name: 'Legacy UE - REINSTALL TO SORT',
      mergeMods: mod => 'ZZZZ-' + mod.id
    }
  );
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Write json file list to JsonFiles.json file (on deployment)
async function updateJsonFiles(api) { // Write json file list to JsonFiles.json file (on deployment)
  GAME_PATH = getDiscoveryPath(api);
  const JSONFILES_FILEPATH = path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE);
  const JSONFILES_FOLDERPATH = path.join(GAME_PATH, JSON_PATH);
  try { //write to JsonFiles.json file (on deploy)
    try { //read JsonFiles.json file to get current list
      await fs.statAsync(JSONFILES_FILEPATH);
      const contents = await fs.readFileAsync(JSONFILES_FILEPATH);
      JSONFILES_JSON = JSON.parse(contents);
    } catch (err) { //write the file with default content if it doesn't exist
      await fs.writeFileAsync(
        JSONFILES_FILEPATH,
        JSON.stringify(DEFAULT_JSON, null, 2),
        { encoding: "utf8" },
      );
      JSONFILES_JSON = DEFAULT_JSON;
    } //*/
    const JSON_FOLDER_FILES = await fsPromises.readdir(JSONFILES_FOLDERPATH, { recursive: true });
    const IGNORED_FILES = [JSONFILES_FILE.toLowerCase(), 'mod.json', 'vortex.deployment.dragonballsparkingzero-json.json'];
    const JSON_FILES = JSON_FOLDER_FILES.filter(file => ( 
      (path.extname(file).toLowerCase() === JSON_EXT)
      && !IGNORED_FILES.includes(path.basename(file).toLowerCase())
    ));
    const JSON_FILE_NAMES = JSON_FILES.map(file => path.basename(file, path.extname(file)));
    JSONFILES_JSON[JSONFILES_KEY] = JSON_FILE_NAMES;
    await fs.writeFileAsync(
      JSONFILES_FILEPATH,
      JSON.stringify(JSONFILES_JSON, null, 2),
      { encoding: "utf8" },
    );
  } catch (err) {
    api.showErrorNotification(`Could not update ${JSONFILES_FILE} file with texpack and lodpack file names. Please add entries manually.`, err, { allowReport: false });
  }
}

//Reset JsonFiles.json file (on purge)
async function resetJsonFiles(api) { // Reset JsonFiles.json file (on purge)
  GAME_PATH = getDiscoveryPath(api);
  const JSONFILES_FILEPATH = path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE);
  try { //reset JsonFiles.json file
    try { //read JsonFiles.json file to get current list
      await fs.statAsync(JSONFILES_FILEPATH);
      const contents = await fs.readFileAsync(JSONFILES_FILEPATH);
      JSONFILES_JSON = JSON.parse(contents);
    } catch (err) { //write the file with default content if it doesn't exist
      await fs.writeFileAsync(
        JSONFILES_FILEPATH,
        JSON.stringify(DEFAULT_JSON, null, 2),
        { encoding: "utf8" },
      );
      JSONFILES_JSON = DEFAULT_JSON;
    } //*/
    JSONFILES_JSON[JSONFILES_KEY] = []; //clear out the list
    await fs.writeFileAsync(
      JSONFILES_FILEPATH,
      JSON.stringify(JSONFILES_JSON, null, 2),
      { encoding: "utf8" },
    );
  } catch (err) {
    api.showErrorNotification(`Could not reset ${JSONFILES_FILE} file. Please remove entries manually.`, err, { allowReport: false });
  }
}

// Function to check if staging folder and game path are on same drive partition to enable modtypes + installers
function checkPartitions(folder, discoveryPath) {
  if (!IO_STORE) { // true if IO-Store is not enabled for the game, since symlinks work fine in that case
    return true;
  }
  try {
    // Define paths
    const path1 = discoveryPath;
    const path2 = STAGING_FOLDER;
    const path3 = folder;
    // Ensure all folders exist
    fs.ensureDirSync(path1);
    fs.ensureDirSync(path2);
    fs.ensureDirSync(path3); 
    // Get the stats for all folders
    const stats1 = fs.statSync(path1);
    const stats2 = fs.statSync(path2);
    const stats3 = fs.statSync(path3);
    // Read device IDs and check if they are all the same
    const a = stats1.dev;
    const b = stats2.dev;
    const c = stats3.dev;
    const TEST = ((a === b) && (b === c));
    return TEST;
  } catch (err) {
    //log('error', `Error checking folder partitions: ${err}`);
    return false;
  }
}

//Notification if Config/Save folders are not on the same partition as the game and staging folder
function partitionCheckNotify(api, CHECK_DATA) {
  const NOTIF_ID = `${GAME_ID}-partioncheck`;
  const MESSAGE = 'Some Mods Installers are Not Available';
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
            text: `Because ${GAME_NAME} includes the IO-Store Unreal Engine feature (or because hardlinks are preferred), Vortex must use hardlinks to install mods for the game.\n`
                + `As such, the game, staging folder, and user folder (typically on C Drive) must all be on the same drive partition to install certain mods with Vortex.\n`
                + `Vortex detected that one or more of the mod types listed below are not available because the game, staging folder, and mod type folder(s) are not all on the same drive partition.\n`
                + `\n`
                + `Here are your results for the partition checks to enable these mod types:\n`
                + `  - Config: ${CHECK_DATA ? `ENABLED: Local AppData folder is on the same partition as the game and the Vortex staging folder, so the Config modtype is available` : `DISABLED: Local AppData folder is NOT on the same partition as the game and the Vortex staging folder, so the Config modtype is NOT available`}\n`
                + `\n`
                + `Game Path: ${GAME_PATH}\n`
                + `Staging Path: ${STAGING_FOLDER}\n`
                + `Config Path: ${CONFIG_PATH}\n`
                + `\n`
                + `If you want to use the disabled mod types, you must move the game and staging folder to the same partition as the folders shown above.\n`
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

//Notification if Config, Save, and Creations folders are not on the same partition
function legacyModsNotify(api, legacyMods) {
  const NOTIF_ID = `${GAME_ID}-legacymodsnotify`;
  const MESSAGE = 'Reinstall Pak Mods to Make Sortable';
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
            text: `\n\n`
                + `Due to a bug in a handful of Unreal Engine Vortex game extensions, your pak mods were assigned a modType ID that was shared among several games.\n`
                + `This bug can result in the Load Order tab not properly load ordering your pak mods.\n`
                + `A list of the affected mods is shown below. You must Reinstall these mods to make them sortable.\n`
                + `If you don't Reinstall thes mods, they will still function, but they will sit at the bottom of the loading order and will not be sortable.\n`
                + `\n`
                + `Perform the following steps to Reinstall the affected mods:\n
                  1. Filter your Mods page by Mod Type "Legacy UE - REINSTALL TO SORT" using the categories at the top.\n
                  2. Use the "CTRL + A" keyboard shortcut to select all displayed mods.\n
                  3. Click the "Reinstall" button in the blue ribbon at the bottom of the Mods page.\n
                  4. You can now sort all of your pak mods in the Load Order tab.\n`
                + `\n`
                + `Pak Mods to Reinstall:\n` 
                + `${legacyMods.join('\n')}`
                + `\n`
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

//Setup function
async function setup(discovery, api, gameSpec) {
  //SYNCHRONOUS CODE //////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  const mods = util.getSafe(state, ['persistent', 'mods', gameSpec.game.id], {});
  const legacyMods = Object.keys(mods).filter(id => mods[id]?.type === LEGACY_UE5_SORTABLE_ID);
  if (legacyMods.length > 0) {
    legacyModsNotify(api, legacyMods);
  }
  //Set save path
  const SAVE_FOLDER = path.join(GAME_PATH, SAVE_PATH);
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
  } catch(err) {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  } //*/
  await fs.ensureDirWritableAsync(path.join(discovery.path, JSON_PATH)); //MUST CREATE THE FOLDER BEFOER WRITING JSONFILES.JSON FILE
  try { //read JsonFiles.json file to get current list
    fs.statSync(path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE));
    JSONFILES_JSON = JSON.parse(fs.readFileSync(path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE)));
    DEFAULT_ARRAY = JSONFILES_JSON[JSONFILES_KEY];
  } catch (err) {
    await fs.writeFileAsync(
      path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE),
      `${JSON.stringify(DEFAULT_JSON, null, 2)}`,
      { encoding: "utf8" },
    );
  } //*/

  CHECK_DATA = checkPartitions(LOCALAPPDATA, GAME_PATH);
  if (!CHECK_DATA) {
    partitionCheckNotify(api, CHECK_DATA);
  }
  if (CHECK_DATA) { //if game, staging folder, and config and save folders are on the same drive
    await fs.ensureDirWritableAsync(CONFIG_PATH);
  }

  //await downloadUe4ss(api, gameSpec);
  await downloadSigBypass(api, gameSpec);
  await downloadModLoader(api, gameSpec);
  await fs.ensureDirWritableAsync(path.join(discovery.path, SAVE_PATH, USERID_FOLDER));
  await fs.ensureDirWritableAsync(path.join(discovery.path, SCRIPTS_PATH));
  await fs.ensureDirWritableAsync(path.join(discovery.path, LOGICMODS_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, UE5_PATH));
}

//Let vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
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

  //register mod types recursively
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });
  
  //register mod types explicitly
  context.registerModType(SAVE_ID, 55, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, path.join(`{gamePath}`, SAVE_PATH, USERID_FOLDER)),
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  );
  context.registerModType(CONFIG_ID, 60, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DATA = checkPartitions(LOCALAPPDATA, GAME_PATH);
      }
      return ((gameId === GAME_ID) && (CHECK_DATA === true));
    },
    (game) => pathPattern(context.api, game, CONFIG_PATH), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  );

  //register mod installers
  context.registerInstaller(MODLOADER_ID, 25, testModLoader, installModLoader);
  context.registerInstaller(LFSE_ID, 27, testLFSE, installLFSE);
  context.registerInstaller(MODLOADERMOD_ID, 29, testModLoaderMod, installModLoaderMod);
  context.registerInstaller(JSON_ID, 31, testJson, installJson);
  context.registerInstaller(`${GAME_ID}-ue4ss-logicscriptcombo`, 33, testUe4ssCombo, installUe4ssCombo);
  context.registerInstaller(`${GAME_ID}-ue4ss-logicmod`, 35, testLogic, installLogic);
  //37 is pak installer above
  context.registerInstaller(`${GAME_ID}-ue4ss`, 39, testUe4ss, installUe4ss);
  context.registerInstaller(`${GAME_ID}-ue4ss-scripts`, 41, testScripts, installScripts);
  context.registerInstaller(DLL_ID, 42, testDll, installDll);
  context.registerInstaller(`${GAME_ID}-root`, 43, testRoot, installRoot);
  context.registerInstaller(`${GAME_ID}-config`, 45, testConfig, (files) => installConfig(context.api, files));
  context.registerInstaller(`${GAME_ID}-save`, 47, testSave, installSave);
  context.registerInstaller(`${GAME_ID}-sigbypass`, 49, testSigBypass, installSigBypass);

  //register buttons to open folders
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open JsonFiles.json File', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, JSON_PATH, JSONFILES_FILE);
    util.opn(openPath).catch(() => null);
    }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Folder', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, UE5_ALT_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open ModLoader Folder', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, MODLOADER_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open JSON Folder', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, JSON_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = path.join(CONFIG_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, SAVE_PATH, USERID_FOLDER);
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
  UNREALEXTENSION(context);
  applyGame(context, spec);
  if (UNREALDATA.loadOrder === true) {
    let previousLO;
    context.registerLoadOrderPage({
      gameId: spec.game.id,
      gameArtURL: path.join(__dirname, spec.game.logo),
      preSort: (items, direction) => preSort(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === UE5_SORTABLE_ID),
      displayCheckboxes: true,
      callback: (loadOrder) => {
        if (previousLO === undefined) previousLO = loadOrder;
        if (loadOrder === previousLO) return;
        //context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
        requestDeployment(context, spec);
        previousLO = loadOrder;
      },
      createInfoPanel: () =>
      context.api.translate(`Drag and drop the mods on the left to change the order in which they load. ${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes `
      + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
      + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.'),
    });
  }

  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => { //update boot-options.json file on deployment
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      await updateJsonFiles(context.api);
      context.api.dismissNotification(`${GAME_ID}-loadorderdeploy-notif`);
      return Promise.resolve();
    });
    context.api.onAsync('did-purge', async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      await resetJsonFiles(context.api);
      return Promise.resolve();
    }); //*/
  });
  return true;
}

const requestDeployment = (context, spec) => {
  context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
  context.api.sendNotification({
    id: `${spec.game.id}-loadorderdeploy-notif`,
    type: 'warning',
    message: 'Deployment Required to Apply Load Order Changes',
    allowSuppress: true,
    actions: [
      {
        title: 'Deploy',
        action: (dismiss) => {
          deploy(context.api)
          dismiss();
        }
      }
    ],
  });
};

//export to Vortex
module.exports = {
  default: main,
};
