/*//////////////////////////////////////////////////////////
Name: S.T.A.L.K.E.R. 2: Heart of Chornobyl Vortex Extension
Structure: UE5 (Xbox-Integrated)
Author: ChemBoy1
Version: 0.3.3
Date: 2025-09-09
//////////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const fsPromises = require('fs/promises');
const template = require('string-template');
//const Shell = require('node-powershell');
const child_process = require("child_process");

//Specify all information about the game
const GAME_ID = "stalker2heartofchornobyl";
const STEAMAPP_ID = "1643320";
const EPICAPP_ID = "c04ba25a0e674b1ab3ea79e50c24a722";
const GOGAPP_ID = "1529799785";
const XBOXAPP_ID = "GSCGameWorld.S.T.A.L.K.E.R.2HeartofChernobyl";
const XBOXEXECNAME = "AppSTALKER2Shipping";
const GAME_NAME = 'S.T.A.L.K.E.R. 2 \tHeart of Chornobyl';
const GAME_NAME_SHORT = "STALKER 2 HoC";
const DEFAULT_EXEC = "Stalker2.exe";
const EXEC_XBOX = `gamelaunchhelper.exe`;
let GAME_PATH = undefined; //patched in the setup function to the discovered game path
let GAME_VERSION = '';
let CHECK_SAVE = false;
let CHECK_CONFIG = false; 
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Unreal Engine specific
const EPIC_CODE_NAME = "Stalker2";
const IO_STORE = true; //true if the Paks folder contains .ucas and .utoc files
const UE4SS_MOD_PATH = path.join('ue4ss', 'Mods')

//Settings related to the IO Store UE feature
let PAKMOD_EXTS = ['.pak'];
let PAK_FILE_MIN = 1;
let SYM_LINKS = true;
if (IO_STORE) { //Set file number for pak installer file selection (needs to be 3 if IO Store is used to accomodate .ucas and .utoc files)
  SYM_LINKS = false;
  PAKMOD_EXTS = ['.pak', '.ucas', '.utoc'];
  PAK_FILE_MIN = PAKMOD_EXTS.length;
}

//Discovery IDs
const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  xbox: [{ id: XBOXAPP_ID }],
  gog: [{ id: GOGAPP_ID }],
  epic: [{ id: EPICAPP_ID }],
};

//Info fo Simple Merger Tool
const MERGER_ID = `${GAME_ID}-merger`;
const MERGER_NAME = 'Simple Mod Merger';
const MERGER_FOLDER = "Stalker2SimpleModMerger";
const MERGER_PATH = path.join(MERGER_FOLDER);
const MERGER_FILE = "simple_mod_merger.exe";
const MERGER_URL = `https://github.com/AlanParadis/Stalker2SimpleModMerger/releases/download/Vortex-v1.4.5/Stalker2SimpleModMergerForVortex.zip`;
const MERGER_URL_MANUAL = `https://github.com/AlanParadis/Stalker2SimpleModMerger/releases`;
const GAMEPATH_FILE = "gamepath.txt";
const AES_KEY_FILE = "key.txt";
const AES_KEY = "0x33A604DF49A07FFD4A4C919962161F5C35A134D37EFA98DB37A34F6450D7D386";
const MERGER_PAGE = 369;
const MERGER_FILE_ID = 3859;
const MERGED_PAK = "zzzzzzzzzz_MERGED_MOD.pak";
const PAKCHUNK0_FOLDER_STEAM = "pakchunk0-Windows";
const PAKCHUNK0_FOLDER_XBOX = "pakchunk0-WinGDK";

//Information for setting the executable and variable paths based on the game store version
let BIN_PATH = null;
let EXEC_TARGET = null;
let SCRIPTS_PATH = null;
let SCRIPTS_TARGET = null;
let SAVE_PATH = null;
let SAVE_TARGET = null;
let CONFIG_PATH = null;
let CONFIG_TARGET = null;
const requiredFiles = [EPIC_CODE_NAME];
let USERID_FOLDER = "";
const LOCALAPPDATA = util.getVortexPath("localAppData");
const CONFIG_PATH_DEFAULT = path.join(LOCALAPPDATA, EPIC_CODE_NAME, "Saved", "Config", "Windows");
const CONFIG_PATH_XBOX = path.join(LOCALAPPDATA, EPIC_CODE_NAME, "Saved", "Config", "WinGDK"); //XBOX Version
const SAVE_PATH_DEFAULT = path.join(LOCALAPPDATA, EPIC_CODE_NAME, "Saved", "SaveGames");
const SAVE_PATH_STEAM = path.join(LOCALAPPDATA, EPIC_CODE_NAME, "Saved", "Steam", "SaveGames");
let SAVE_PATH_XBOX = path.join(LOCALAPPDATA, 'Packages', `${XBOXAPP_ID}_6fr1t1rwfarwt`, "SystemAppData", "xgs"); //XBOX Version
const EXEC_FOLDER_DEFAULT = "Win64";
const EXEC_FOLDER_XBOX = "WinGDK";
const EXEC_DEFAULT = DEFAULT_EXEC;

//Unreal Engine Game Data
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'),
  fileExt: PAKMOD_EXTS,
  loadOrder: true,
}

//Information for mod types and installers
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const UE5_ID = `${GAME_ID}-ue5`;
const UE5_NAME = "UE5 Paks";
const UE5_ALT_ID = `${GAME_ID}-pakalt`;
const UE5_ALT_NAME = 'UE5 Paks (no ~mods)';
const UE5_EXT = UNREALDATA.fileExt;
const PAK_EXT = '.pak';
const UE5_PATH = UNREALDATA.modsPath;
const UE5_ALT_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks');
const UE5_PAK_PRIORITY = 35;

const LOGICMODS_ID = `${GAME_ID}-logicmods`;
const LOGICMODS_NAME = "UE4SS LogicMods (Blueprint)";
const UE4SSCOMBO_ID = `${GAME_ID}-ue4sscombo`;
const UE4SSCOMBO_NAME = "UE4SS Script-LogicMod Combo";
const LOGICMODS_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks', 'LogicMods');
const LOGICMODS_FILE = "LogicMods";
const LOGICMODS_EXT = ".pak";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config (LocalAppData)";
const CONFIG_FILES = ["engine.ini", "scalability.ini", "input.ini", "game.ini"];
const CONFIG_EXT = ".ini";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";
const ROOT_FILE = EPIC_CODE_NAME;

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Saves (LocalAppData)";
const SAVE_EXT = ".sav";

const UE4SS_ID = `${GAME_ID}-ue4ss`;
const UE4SS_NAME = "UE4SS";
const UE4SS_FILE = "dwmapi.dll";
const UE4SS_PAGE_NO = 560;
const UE4SS_FILE_NO = 4003;

const SCRIPTS_ID = `${GAME_ID}-scripts`;
const SCRIPTS_NAME = "UE4SS Scripts";
const SCRIPTS_EXT = ".lua";
const SCRIPTS_FILE = "Scripts";
const SCRIPTS_IDX = `${SCRIPTS_FILE}\\`;

const DLL_ID = `${GAME_ID}-ue4ssdll`;
const DLL_NAME = "UE4SS DLL Mod";
const DLL_EXT = ".dll";
const DLL_FILE = "dlls";

const HERBATA_ID = `${GAME_ID}-herbata`;
const HERBATA_NAME = "Herbata's Mod-as-DLC Loader";
const HERBATA_FILE = "herbatasdlc-as-modloader.exe";
const HERBATA_GAMEPATH_FILE = "config.ini";
const HERBATA_PAK = 'HerbatasDLCModLoader.pak';

const HERBATAMOD_ID = `${GAME_ID}-herbatamod`;
const HERBATAMOD_NAME = "Herbata Mod (GameLite)";
const HERBATAMOD_FILE = "GameLite";
const HERBATAMOD_IDX = `${HERBATAMOD_FILE}\\`;
const HERBATAMOD_PATH = path.join(EPIC_CODE_NAME, 'Content');
const HERBATAMOD_PATH_FULL = path.join(EPIC_CODE_NAME, 'Content', 'GameLite', 'DLCGameData');

const STEAMWORKSHOP_FOLDER = path.join("workshop", "content", STEAMAPP_ID);
let STEAMWORKSHOP_PATH = undefined;

const MOD_PATH_DEFAULT = UE5_PATH;

//This will be filled in from the data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "details": {
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "supportsSymlinks": SYM_LINKS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": LOGICMODS_ID,
      "name": LOGICMODS_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${LOGICMODS_PATH}`
    },
    {
      "id": UE4SSCOMBO_ID,
      "name": UE4SSCOMBO_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": UE5_ID,
      "name": UE5_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${UE5_PATH}`
    },
    {
      "id": UE5_ALT_ID,
      "name": UE5_ALT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${UE5_ALT_PATH}`
    },
    {
      "id": HERBATAMOD_ID,
      "name": HERBATAMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${HERBATAMOD_PATH}`
    },
    {
      "id": MERGER_ID,
      "name": MERGER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${MERGER_PATH}`
    },
  ],
};

//3rd party tools and launchers
const tools = [
  {
    id: "ModMerger",
    name: "Simple Mod Merger",
    logo: `merger.jpg`,
    executable: () => MERGER_FILE,
    requiredFiles: [MERGER_FILE],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //parameters: []
  },
  {
    id: `${GAME_ID}-herbatamodloader`,
    name: "Herbata's Mod-as-DLC Loader",
    logo: `herbata.png`,
    executable: () => HERBATA_FILE,
    requiredFiles: [HERBATA_FILE],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    //parameters: []
  },
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 30,
    low: 75,
  }[priority];
}

//Convert path placeholders to actual values
function pathPattern(api, game, pattern) {
  try {
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: process.env['LOCALAPPDATA'],
      appData: util.getVortexPath('appData'),
    });
  }
  catch (err) {
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
  //*
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

//Get correct executable, add to required files, set paths for mod types
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
    BIN_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_XBOX}`;
    EXEC_TARGET = `{gamePath}\\${BIN_PATH}`;
    SCRIPTS_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_XBOX}\\${UE4SS_MOD_PATH}`;
    SCRIPTS_TARGET = `{gamePath}\\${SCRIPTS_PATH}`;
    CONFIG_PATH = CONFIG_PATH_XBOX;
    CONFIG_TARGET = CONFIG_PATH;
    try {
      const SAVE_ARRAY = fs.readdirSync(SAVE_PATH_XBOX);
      USERID_FOLDER = SAVE_ARRAY[0];
    } catch (err) {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    }
    SAVE_PATH = path.join(SAVE_PATH_XBOX, USERID_FOLDER, 'SaveGames');
    SAVE_TARGET = SAVE_PATH;
    SAVE_PATH_XBOX = SAVE_PATH;
    return EXEC_XBOX;
  };
  if (isCorrectExec(EXEC_DEFAULT)) {
    BIN_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_DEFAULT}`;
    EXEC_TARGET = `{gamePath}\\${BIN_PATH}`;
    SCRIPTS_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_DEFAULT}\\${UE4SS_MOD_PATH}`;
    SCRIPTS_TARGET = `{gamePath}\\${SCRIPTS_PATH}`;
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    CONFIG_TARGET = CONFIG_PATH;
    SAVE_PATH = path.join(SAVE_PATH_DEFAULT);
    SAVE_TARGET = SAVE_PATH;
    return EXEC_DEFAULT;
  };
  return EXEC_DEFAULT;
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

//Installer test for Simple Mod Merger files
function testModMerger(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === MERGER_FILE));
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

//Installer install Simple Mod Merger files
function installModMerger(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MERGER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MERGER_ID };

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

//Installer test for Herbata's Mod-as-DLC Loader files
function testHerbata(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === HERBATA_FILE));
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

//Installer install Herbata's Mod-as-DLC Loader files
function installHerbata(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === HERBATA_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: HERBATA_ID };

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

//Test for save files
function testUe4ssCombo(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SCRIPTS_EXT));
  const isMod2 = files.some(file => (path.extname(file).toLowerCase() === LOGICMODS_EXT));
  const isFolder = files.some(file => (path.basename(file) === ROOT_FILE));
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
  const modFile = files.find(file => (path.basename(file) === ROOT_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
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
  const isMod = files.some(file => (path.basename(file) === LOGICMODS_FILE));
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
  const modFile = files.find(file => (path.extname(file).toLowerCase() === LOGICMODS_EXT));
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

//Installer test for Root folder files
function testHerbataMod(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === HERBATAMOD_FILE));
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

//Installer install Root folder files
function installHerbataMod(files) {
  const modFile = files.find(file => (path.basename(file) === HERBATAMOD_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: HERBATAMOD_ID };

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

//Installer test for UE4SS files
function testUe4ss(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === UE4SS_FILE));
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

//Installer install UE4SS files
function installUe4ss(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === UE4SS_FILE));
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
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SCRIPTS_EXT));
  const isFolder = files.some(file => (path.basename(file) === SCRIPTS_FILE));
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

//Install UE4SS Script files
function installScripts(files, fileName) {
  const modFile = files.find(file => (path.basename(file) === SCRIPTS_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SCRIPTS_ID };
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/[\-]*[\.]*(installing)*(zip)*/gi, '');
  }
  
  const ENABLEDTXT_FILE = 'enabled.txt';
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
      log('warn', `Successfully created enabled.txt for UE4SS Script Mod: ${MOD_NAME}`);
    } catch (err) {
      log('error', `Could not create enabled.txt for UE4SS Script Mod: ${MOD_NAME}: ${err}`);
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

//Test for UE4SS DLL files
function testDll(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === DLL_EXT));
  const isFolder = files.some(file => (path.basename(file) === DLL_FILE));
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
  const modFile = files.find(file => (path.basename(file) === DLL_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DLL_ID };
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/[\-]*[\.]*(installing)*(zip)*/gi, '');
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

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === ROOT_FILE));
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

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => (path.basename(file) === ROOT_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
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
  //*
  const state = api.getState();
  const discovery = selectors.discoveryByGame(state, GAME_ID);
  const IS_CONFIG = checkPartitions(CONFIG_PATH, discovery.path);
  if (IS_CONFIG === false) {
    api.showErrorNotification(`Could not install mod as Config`, `You tried installing a Config mod, but the game, staging folder, and Config folder are not all on the same drive. Please move the game and/or staging folder to the same drive as the Config folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } //*/
  return Promise.resolve({ instructions });
}

//Test for save files
function testSave(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SAVE_EXT));
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
function installSave(api, files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === SAVE_EXT));
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
  //*
  const state = api.getState();
  const discovery = selectors.discoveryByGame(state, GAME_ID);
  const IS_SAVE = checkPartitions(SAVE_PATH, discovery.path);
  if (IS_SAVE === false) {
    api.showErrorNotification(`Could not install mod as Save`, `You tried installing a Save mod, but the game, staging folder, and Save folder are not all on the same drive. Please move the game and/or staging folder to the same drive as the Save folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } //*/
  return Promise.resolve({ instructions });
}

//Test Fallback installer for binaries folder
function testBinaries(files, gameId) {
  const isPak = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
  let supported = (gameId === spec.game.id) && !isPak;

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

//Fallback installer for binaries folder
function installBinaries(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };
  // Remove empty directories
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
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
      value: 'ue5-sortable-modtype',
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

  context.registerInstaller('ue5-pak-installer', UE5_PAK_PRIORITY, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealMod(context.api, files, gameId));

  context.registerModType('ue5-sortable-modtype', 25, (gameId) => testUnrealGame(gameId, true), getUnrealModsPath, () => Promise.resolve(false), {
    name: 'UE5 Sortable Mod',
    mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id
  });
}

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if Mod Merger is installed
function isModMergerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MERGER_ID);
}

//Check if UE4SS is installed
function isUe4ssInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === UE4SS_ID);
}

//Function to auto-download Simple Mod Merger from Nexus
async function downloadModMerger(api, gameSpec) {
  let isInstalled = isModMergerInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = `Simple Mod Merger For Vortex`;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const modPageId = MERGER_PAGE;
    const FILE_ID = MERGER_FILE_ID;
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
      const dlInfo = { //Download the mod
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
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
        actions.setModType(gameSpec.game.id, modId, MERGER_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//* Function to auto-download UE4SS form Nexus Mods
async function downloadUe4ss(api, gameSpec) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = UE4SS_NAME;
    const MOD_TYPE = UE4SS_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = UE4SS_PAGE_NO;
    const FILE_ID = UE4SS_FILE_NO;  //If using a specific file id because "input" below gives an error
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
        const fileTime = () => Number.parseInt(input.uploaded_time, 10);
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
        game: gameSpec.game.id, // set to the game's ID so that they wil not get a game selection popup. Vortex will update the metadata automatically if the mod is from another domain, such as 'site'
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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

const isGameActive = (api) => { //check if STALKER 2 is the active game
  const state = () => api.getState(); //get the state
  return (selectors.activeGameId(state()) === GAME_ID);
};

async function deployMerge(api, profileId) { //run after mod deployment
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }

  try { //run merge tool
    log('info', 'Running merge tool');
    ///*
    const proc = child_process.spawn(
      path.join(GAME_PATH, MERGER_FOLDER, MERGER_FILE),
      [],
      {
        //cwd: path.join(GAME_PATH, MERGER_FOLDER),
        //shell: true, 
        //detached: true, 
      }
    );
    //*/
    /*
    const proc = child_process.spawn(
      'cmd.exe',
      [`start ${path.join(GAME_PATH, MERGER_FOLDER, MERGER_FILE)}`],
      { 
        //cwd: path.join(GAME_PATH, MERGER_FOLDER),
        //shell: true, 
        //detached: true, 
      }
    );
    //*/
    proc.on("error", () => { });
  }
  catch (err) {
    api.showErrorNotification('Failed to run merge tool', err);
  }

  return Promise.resolve();
}

async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }

  try { //Delete merged pak on purge
    log('info', 'Deleting merged pak on purge');
    await fs.unlinkAsync(path.join(GAME_PATH, UE5_PATH, MERGED_PAK));
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      log('info', 'Merged pak does not exist on purge');
    }
    else {
      api.showErrorNotification('Failed to delete merged pak on purge', err);
    }
  }

  try { //Delete HerbatasDLCModLoader.pak on purge
    log('info', 'Deleting HerbatasDLCModLoader.pak on purge');
    await fs.unlinkAsync(path.join(GAME_PATH, UE5_PATH, HERBATA_PAK));
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      log('info', 'HerbatasDLCModLoader.pak does not exist on purge');
    }
    else {
      api.showErrorNotification('Failed to delete HerbatasDLCModLoader.pak on purge', err);
    }
  }

  try { //Delete pakchunk0-Windows folder on purge
    log('info', 'Deleting "pakchunk0-Windows" folder on purge');
    const FOLDER = path.join(GAME_PATH, UE5_ALT_PATH, PAKCHUNK0_FOLDER_STEAM);
    await fsPromises.rmdir(FOLDER, { recursive: true });
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      log('info', '"pakchunk0-WinGDK" folder does not exist on purge');
    }
    else {
      api.showErrorNotification('Failed to delete "pakchunk0-Windows" folder on purge', err);
    }
  }

  try { //Delete pakchunk0-WinGDK folder on purge
    log('info', 'Deleting "pakchunk0-WinGDK" folder on purge');
    const FOLDER = path.join(GAME_PATH, UE5_ALT_PATH, PAKCHUNK0_FOLDER_XBOX);
    await fsPromises.rmdir(FOLDER, { recursive: true });
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      log('info', '"pakchunk0-WinGDK" folder does not exist on purge');
    }
    else {
      api.showErrorNotification('Failed to delete "pakchunk0-WinGDK" folder on purge', err);
    }
  }

  return Promise.resolve();
}

//*
function toolbar(api) {
  const state = api.getState();
  if (
    !util.getSafe(
      state,
      ["settings", "interface", "tools", "addToolsToTitleBar"],
      false,
    )
  ) {
    const NOTIF_ID = `${GAME_ID}-enabletoolbar`;
    api.sendNotification({
      id: NOTIF_ID,
      type: "warning",
      message: "Enable Toolbar for Easy Mod Merging",
      actions: [
        {
          title: "Enable Toolbar",
          action: () => {
            api.store.dispatch({
              type: "SET_ADD_TO_TITLEBAR",
              payload: { addToTitleBar: true },
            });
            api.dismissNotification(NOTIF_ID);
            api.sendNotification({
              id: "enabled toolbar",
              type: "success",
              message:
                "Activated the toolbar. At the top of your screen you now can run the merger tool",
              supress: true,
            });
          },
        },
      ],
    });
  }
} //*/

//Notify User of instructions for Mod Merger Tool
function downloadModMergerNotify(api, gameSpec) {
  const MOD_NAME = MERGER_NAME;
  const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-notification`;
  const MESSAGE = `${MOD_NAME} Download and Instructions`;
  //let isInstalled = isModMergerInstalled(api, gameSpec);
  //if (!isInstalled) {
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
              text: `Many mods for STALKER 2 require you to run a tool like ${MOD_NAME} to install multiple configuration mods into the game's .cfg files.\n`
                + `You are strongly encouraged to download the tool with the button below so that you can de-conflict any mods that require it.\n`
                + `You can launch the tool from the Dashboard tab or the toolbar and follow the prompts. The tool will detect if you have any conflicts that need to be merged.\n`
                + `\n`
                + `A few additional notes related to the Merger tool:\n`
                + `- After each game update - you will need to Purge Mods in Vortex, Deploy Mods, then run the Merger tool again. This is necessary to refresh the config files for the new game version and remove outdated files.\n`
                + `- When purging mods, Vortex will automatically delete the merged mod pak from the "Paks/~mods" folder and the "pakchunk0" folder from the "Paks" folder.\n`
            }, [
              //*
              { label: `Download ${MOD_NAME}`, action: () => {
                downloadModMerger(api, gameSpec);
                dismiss();
              }}, //*/
              { label: 'Not Now', action: () => dismiss() },
              {
                label: 'Never Show Again', action: () => {
                  api.suppressNotification(NOTIF_ID);
                  dismiss();
                }
              },
            ]
            );
          },
        },
      ],
    });
  //}
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
    return (TEST);
  } catch (err) {
    return (false);
  }
}

//Notification if Config, Save, and Creations folders are not on the same partition
function partitionCheckNotify(api, CHECK_CONFIG, CHECK_SAVE) {
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
            text: `Because ${GAME_NAME} includes the IO-Store Unreal Engine feature, Vortex must use hardlinks to install mods for the game.\n`
                + `Because of this, the game, staging folder, and user folder (typically on C Drive) must all be on the same partition to install certain mods with Vortex.\n`
                + `Vortex detected that one or more of the mod types listed below are not available because the game, staging folder, and user folder are not on the same partition.\n`
                + `\n`
                + `Here are your results for the partition check to enable these mod types:\n`
                + `  - Config: ${CHECK_CONFIG ? 'ENABLED: Config Folder (Local AppData) is on the same partition as the game and staging folder and the modtype is available' : 'DISABLED: Config Folder (Local AppData) is NOT on the same partition as the game and staging folder and the modtype is NOT available'}\n`
                + `  - Save: ${CHECK_SAVE ? 'ENABLED: Save Folder is on the same partition as the game and staging folder and the modtype is available' : 'DISABLED: Save Folder is NOT on the same partition as the game and staging folder and the modtype is NOT available'}\n`
                + `\n`
                + `If you want to use the disabled mod types, you must move the game and staging folder to the same partition as the user folder (typically C Drive).\n`
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
async function setup(discovery, api, gameSpec, store) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  GAME_VERSION = store;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  CHECK_CONFIG = checkPartitions(CONFIG_PATH, GAME_PATH);
  CHECK_SAVE = checkPartitions(SAVE_PATH, GAME_PATH);
  if (!CHECK_SAVE || !CHECK_CONFIG) {
    partitionCheckNotify(api, CHECK_CONFIG, CHECK_SAVE);
  }
  if (CHECK_CONFIG === true) { //if game, staging folder, and Config folders are on the same drive
    await fs.ensureDirWritableAsync(CONFIG_PATH);
  }
  if (CHECK_SAVE === true) { //if game, staging folder, and Save folders are on the same drive
    await fs.ensureDirWritableAsync(SAVE_PATH);
  }
  await fs.ensureDirWritableAsync(path.join(discovery.path, MERGER_PATH));
  await fs.writeFileAsync( //write game path to file for merger tool
    path.join(GAME_PATH, MERGER_PATH, GAMEPATH_FILE),
    (GAME_PATH),
    //{ flag: 'x', encoding: 'utf8' },
    (err) => {
      if (err) {
        api.showErrorNotification('Failed to write game path file for merger tool', err, { allowReport: false });
      }
    }
  );
  ///*
  await fs.writeFileAsync( //write AES key to file for merger tool
    path.join(GAME_PATH, MERGER_PATH, AES_KEY_FILE),
    (AES_KEY),
    //{ flag: 'x', encoding: 'utf8' },
    (err) => {
      if (err) {
        api.showErrorNotification('Failed to write AES key file for merger tool', err, { allowReport: false });
      }
    }
  );
  //*/
  await fs.writeFileAsync( //write game path to ini file for Herbata's Mod-as-DLC Loader
    path.join(GAME_PATH, MERGER_PATH, HERBATA_GAMEPATH_FILE),
    (GAME_PATH),
    //{ flag: 'x', encoding: 'utf8' },
    (err) => {
      if (err) {
        api.showErrorNotification('Failed to write game path file for Herbata', err, { allowReport: false });
      }
    }
  );
  //await downloadModMerger(api, gameSpec);
  downloadModMergerNotify(api, gameSpec);
  if (GAME_VERSION === 'steam') { 
    const SPLIT_PATH = GAME_PATH.split(path.sep);
    const SPLIT_PATH_LENGTH = SPLIT_PATH.length;
    const STEAM_INSTALL_PATH = SPLIT_PATH.slice(0, SPLIT_PATH_LENGTH - 2).join(path.sep);
    STEAMWORKSHOP_PATH = path.join(STEAM_INSTALL_PATH, STEAMWORKSHOP_FOLDER);
  } //*/
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, SCRIPTS_PATH));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, HERBATAMOD_PATH_FULL));
  //await downloadUe4ss(api, gameSpec);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, LOGICMODS_PATH));
  return fs.ensureDirWritableAsync(path.join(GAME_PATH, UE5_PATH));
}

//Let vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: () => MOD_PATH_DEFAULT,
    requiredFiles,
    setup: async (discovery, store) => await setup(discovery, context.api, gameSpec, store),
    supportedTools: tools,
    requiresLauncher: requiresLauncher,
  };
  context.registerGame(game);

  //register mod types recusively
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod types explicitly
  context.registerModType(SCRIPTS_ID, 40,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, SCRIPTS_TARGET),
    () => Promise.resolve(false),
    { name: SCRIPTS_NAME }
  );
  context.registerModType(DLL_ID, 42,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, SCRIPTS_TARGET),
    () => Promise.resolve(false),
    { name: DLL_NAME }
  );
  context.registerModType(CONFIG_ID, 44, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_CONFIG = checkPartitions(CONFIG_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && (CHECK_CONFIG === true));
    },
    (game) => pathPattern(context.api, game, CONFIG_TARGET), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  );
  context.registerModType(SAVE_ID, 46, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_SAVE = checkPartitions(SAVE_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && (CHECK_SAVE === true));
    }, 
    (game) => pathPattern(context.api, game, SAVE_TARGET), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  );
  context.registerModType(BINARIES_ID, 48,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, EXEC_TARGET),
    () => Promise.resolve(false),
    { name: BINARIES_NAME }
  );
  context.registerModType(UE4SS_ID, 50,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, EXEC_TARGET),
    () => Promise.resolve(false),
    { name: UE4SS_NAME }
  );
  /*
  context.registerModType(HERBATA_ID, 52,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, EXEC_TARGET),
    () => Promise.resolve(false),
    { name: HERBATA_NAME }
  );
  //*/

  //register mod installers
  context.registerInstaller(MERGER_ID, 25, testModMerger, installModMerger);
  //context.registerInstaller(HERBATA_ID, 27, testHerbata, installHerbata);
  context.registerInstaller(UE4SSCOMBO_ID, 29, testUe4ssCombo, installUe4ssCombo);
  context.registerInstaller(LOGICMODS_ID, 31, testLogic, installLogic);
  context.registerInstaller(HERBATAMOD_ID, 33, testHerbataMod, installHerbataMod);
  //35 is pak installer above
  context.registerInstaller(UE4SS_ID, 37, testUe4ss, installUe4ss);
  context.registerInstaller(SCRIPTS_ID, 39, testScripts, installScripts);
  context.registerInstaller(DLL_ID, 41, testDll, installDll);
  context.registerInstaller(ROOT_ID, 43, testRoot, installRoot);
  context.registerInstaller(CONFIG_ID, 45, testConfig, (files) => installConfig(context.api, files));
  context.registerInstaller(SAVE_ID, 47, testSave, (files) => installSave(context.api, files));
  context.registerInstaller(BINARIES_ID, 49, testBinaries, installBinaries);

  //register buttons to open folders
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Steam Workshop Mods Folder', () => {
    const openPath = STEAMWORKSHOP_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, UE5_ALT_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Binaries Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, BIN_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open UE4SS Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, SCRIPTS_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open LogicMods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, LOGICMODS_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open GameLite (Herbata) Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, HERBATAMOD_PATH_FULL);
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder (Steam)', () => {
    const openPath = SAVE_PATH_STEAM;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder (Xbox)', () => {
    const openPath = SAVE_PATH_XBOX;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download UE4SS', () => {
    downloadUe4ss(context.api, gameSpec);
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Vortex Downloads Folder', () => {
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
  //UNREAL - mod load order
  if (UNREALDATA.loadOrder === true) {
    let previousLO;
    context.registerLoadOrderPage({
      gameId: spec.game.id,
      gameArtURL: path.join(__dirname, spec.game.logo),
      preSort: (items, direction) => preSort(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === 'ue5-sortable-modtype'),
      displayCheckboxes: true,
      callback: (loadOrder) => {
        if (previousLO === undefined) previousLO = loadOrder;
        if (loadOrder === previousLO) return;
        context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
        previousLO = loadOrder;
      },
      createInfoPanel: () =>
        context.api.translate(`Drag and drop the mods on the left to change the order in which they load. ${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes `
          + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
          + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.'),
    });
  }
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api; //don't move from the top
    //* Ask user to enable toolbar on profile change
    context.api.events.on("profile-did-change", () => {
      if (isGameActive(api)) {
        toolbar(api);
      }
    }); //*/
    /* Merge mods on deploy
    context.api.onAsync('did-deploy', (profileId) => deployMerge(context.api, profileId)); //*/
    //* Delete merged mod pak, Herbata's DLC pak and pakchunk0 folder on purge
    context.api.onAsync('did-purge', (profileId) => didPurge(api, profileId)); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
