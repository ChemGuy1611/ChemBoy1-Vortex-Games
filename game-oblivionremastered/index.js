/*////////////////////////////////////////////////
Name: Oblivion Remastered Vortex Extension
Structure: UE5 (Xbox-Integrated) + Gamebryo Plugins
Author: ChemBoy1
Version: 0.2.0
Date: 2025-04-25
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');

//Specify all information about the game
const GAME_ID = "oblivionremastered";
const STEAMAPP_ID = "2623190";
const EPICAPP_ID = "";
const GOGAPP_ID = "";
const XBOXAPP_ID = "BethesdaSoftworks.ProjectAltar";
const XBOXEXECNAME = "AppUEGameShipping";
const GAME_NAME = "The Elder Scrolls IV: Oblivion Remastered";
const GAME_NAME_SHORT = "Oblivion Remastered";
const DEFAULT_EXEC = "OblivionRemastered.exe";
let GAME_PATH = null;
let CHECK_DATA = false;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

let PLUGIN_LO_ENABLE = true;

//Unreal Engine specific
const EPIC_CODE_NAME = "OblivionRemastered";
const IO_STORE = true; //true if the Paks folder contains .ucas and .utoc files
const UE4SS_PATH = path.join('ue4ss', 'Mods');

//Discovery IDs
const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  //gog: [{ id: GOGAPP_ID }],
  //epic: [{ id: EPICAPP_ID }],
  xbox: [{ id: XBOXAPP_ID }],
};

//Settings related to the IO Store UE feature
let PAKMOD_EXTS = ['.pak'];
let PAK_FILE_MIN = 1;
let SYM_LINKS = true;
if (IO_STORE) { //Set file number for pak installer file selection (needs to be 3 if IO Store is used to accomodate .ucas and .utoc files)
  SYM_LINKS = false;
  PAKMOD_EXTS = ['.pak', '.ucas', '.utoc'];
  PAK_FILE_MIN = PAKMOD_EXTS.length;
}

//Information for setting the executable and variable paths based on the game store version
let EXEC_PATH = null;
let EXEC_TARGET = null;
let SCRIPTS_PATH = null;
let SCRIPTS_TARGET = null;
let SAVE_PATH = null;
let SAVE_TARGET = null;
let CONFIG_PATH = null;
let CONFIG_TARGET = null;
let requiredFiles = [EPIC_CODE_NAME];
let USERID_FOLDER = "";
const USER_HOME = util.getVortexPath("home");
const DOCUMENTS = path.join(USER_HOME, "Documents");
//const DOCUMENTS = util.getVortexPath("documents");
const LOCALAPPDATA = util.getVortexPath("localAppData");
const CONFIG_PATH_DEFAULT = path.join(DOCUMENTS, "My Games", "Oblivion Remastered", "Saved", "Config", "Windows");
const CONFIG_PATH_XBOX = path.join(DOCUMENTS, "My Games", "Oblivion Remastered", "Saved", "Config", "WinGDK"); //XBOX Version
const SAVE_PATH_DEFAULT = path.join(DOCUMENTS, "My Games", "Oblivion Remastered", "Saved", "SaveGames");
const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_3275kfvn8vcwc`, "SystemAppData", "wgs"); //XBOX Version
const EXEC_FOLDER_DEFAULT = "Win64";
const EXEC_FOLDER_XBOX = "WinGDK";
const EXEC_DEFAULT= DEFAULT_EXEC;
const EXEC_XBOX = `gamelaunchhelper.exe`;
const XBOX_FILE = `appxmanifest.xml`;

//Unreal Engine Game Data
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'),
  fileExt: PAKMOD_EXTS,
  loadOrder: false, //disable to allow for plugin load order
}
const UE5_SORTABLE_ID = `${GAME_ID}-ue5-sortable-modtype`; //this should not be changed to be maintain consistency with other UE5 games
const UE5_SORTABLE_NAME = 'UE5 Mod (Not Sorted)';

//Information for mod types and installers. This will be filled in from the data above
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const UE5_ID = `${GAME_ID}-ue5`;
const UE5_ALT_ID = `${GAME_ID}-pakalt`;
const UE5_EXT = UNREALDATA.fileExt;
const PAK_EXT = '.pak';
const UE5_PATH = UNREALDATA.modsPath;
const UE5_ALT_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks');

const LOGICMODS_ID = `${GAME_ID}-logicmods`;
const UE4SSCOMBO_ID = `${GAME_ID}-ue4sscombo`;
const LOGICMODS_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks', 'LogicMods');
const LOGICMODS_FILE = "LogicMods";
const LOGICMODS_EXT = ".pak";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config (Documents)";
const CONFIG_FILES = ["engine.ini", "scalability.ini", "input.ini"];
const CONFIG_EXT = ".ini";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_FILE = EPIC_CODE_NAME;
const ROOT_IDX = `${EPIC_CODE_NAME}\\`;

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Saves (Documents)";
const SAVE_EXT = ".sav";

const SCRIPTS_ID = `${GAME_ID}-scripts`;
const SCRIPTS_NAME = "UE4SS Script Mod";
const SCRIPTS_EXT = ".lua";
const SCRIPTS_FILE = "Scripts";

const DLL_ID = `${GAME_ID}-ue4ssdll`;
const DLL_NAME = "UE4SS DLL Mod";
const DLL_EXT = ".dll";
const DLL_FILE = "dlls";

const OBSE_ID = `${GAME_ID}-obse`;
const OBSE_NAME = "OBSE";
const OBSE_FILE = "obse64_loader.exe";
const OBSE_PAGE_NO = 282;
const OBSE_FILE_NO = 999;

const UE4SS_ID = `${GAME_ID}-ue4ss`;
const UE4SS_NAME = "UE4SS";
const UE4SS_FILE = "dwmapi.dll";
const UE4SS_PAGE_NO = 32; // <-- No Nexus page currently
const UE4SS_FILE_NO = 14;
// Information for UE4SS downloader and updater
const UE4SS_ARC_NAME = 'UE4SS_v3.0.1-394-g437a8ff.zip';
const UE4SS_URL_MAIN = `https://api.github.com/repos/UE4SS-RE/RE-UE4SS`;
const REQUIREMENTS = [
  { //UE4SS
    archiveFileName: UE4SS_ARC_NAME,
    modType: UE4SS_ID,
    assemblyFileName: UE4SS_FILE,
    userFacingName: UE4SS_NAME,
    githubUrl: UE4SS_URL_MAIN,
    findMod: (api) => findModByFile(api, UE4SS_ID, UE4SS_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, UE4SS_ARC_NAME),
    fileArchivePattern: new RegExp(/^UE4SS.*v(\d+\.\d+\.\d+(-\w+(\.\d+)?)?)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
  },
];

const regexTest = /^UE4SS_v(\d+\.\d+\.\d+)(-\d+)?(-\w+)?/igm;

const PLUGINS_ID = `${GAME_ID}-plugins`;
const PLUGINS_NAME = "Data (Plugins)";
const PLUGINS_EXTS = [".esp", ".esm", ".esl", ".bsa"];
const PLUGINS_FOLDERS = ["Textures", "Music", "Menus"];
const PLUGINS_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Dev', 'ObvData', 'Data');

let PLUGINS_ORDER = [];
const PLUGINS_EXTS_FILTER = ['.esp', '.esm', '.esl'];
const PLUGINSTXT_FILE = "Plugins.txt";
const PLUGINSTXT_FILE_BAK = "Plugins.txt.bak";
const PLUGINSTXT_PATH = path.join(PLUGINS_PATH, PLUGINSTXT_FILE);
const PLUGINSTXT_DEFAULT_CONTENT = `Oblivion.esm
DLCBattlehornCastle.esp
DLCFrostcrag.esp
DLCHorseArmor.esp
DLCMehrunesRazor.esp
DLCOrrery.esp
DLCShiveringIsles.esp
DLCSpellTomes.esp
DLCThievesDen.esp
DLCVileLair.esp
Knights.esp
AltarESPMain.esp
AltarDeluxe.esp
AltarESPLocal.esp
`;
const DEFAULT_PLUGINS = [
  "Oblivion.esm",
  "DLCBattlehornCastle.esp",
  "DLCFrostcrag.esp",
  "DLCHorseArmor.esp",
  "DLCMehrunesRazor.esp",
  "DLCOrrery.esp",
  "DLCShiveringIsles.esp",
  "DLCSpellTomes.esp",
  "DLCThievesDen.esp",
  "DLCVileLair.esp",
  "Knights.esp",
  "AltarESPMain.esp",
  "AltarDeluxe.esp",
  "AltarESPLocal.esp",
];
const EXCLUDED_PLUGINS = [
  'AltarGymNavigation.esp',
  'TamrielLeveledRegion.esp',
];

const MOD_PATH_DEFAULT = PLUGINS_PATH;

//Filled in from data above
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
      "name": "UE4SS LogicMods (Blueprint)",
      "priority": "high",
      "targetPath": `{gamePath}\\${LOGICMODS_PATH}`
    },
    {
      "id": UE4SSCOMBO_ID,
      "name": "UE4SS Script-LogicMod Combo",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": PLUGINS_ID,
      "name": PLUGINS_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PLUGINS_PATH}`
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
      "targetPath": `{gamePath}\\${UE5_PATH}`
    },
    {
      "id": UE5_ALT_ID,
      "name": 'UE5 Paks (no "~mods")',
      "priority": "high",
      "targetPath": `{gamePath}\\${UE5_ALT_PATH}`
    },
  ],
};

//3rd party tools and launchers
const tools = [
  {
    id: `${GAME_ID}-obse`,
    name: `OBSE64`,
    logo: `exec.png`,
    executable: () => OBSE_FILE,
    requiredFiles: [OBSE_FILE],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: []
  }, //*/
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
  try{
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch(err){
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
    EXEC_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_XBOX}`;
    EXEC_TARGET = `{gamePath}\\${EXEC_PATH}`;
    SCRIPTS_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_XBOX}\\${UE4SS_PATH}`;
    SCRIPTS_TARGET = `{gamePath}\\${SCRIPTS_PATH}`;
    CONFIG_PATH = CONFIG_PATH_XBOX;
    CONFIG_TARGET = `${CONFIG_PATH}`;
    try {
      const SAVE_ARRAY = fs.readdirSync(SAVE_PATH_XBOX);
      USERID_FOLDER = SAVE_ARRAY.find((element) => 
      ((element))
       );
    } catch(err) {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    }
    SAVE_PATH = path.join(SAVE_PATH_XBOX, USERID_FOLDER);
    SAVE_TARGET = `${SAVE_PATH}`;
    return EXEC_XBOX;
  };
  if (isCorrectExec(EXEC_DEFAULT)) {
    EXEC_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_DEFAULT}`;
    EXEC_TARGET = `{gamePath}\\${EXEC_PATH}`;
    SCRIPTS_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_DEFAULT}\\${UE4SS_PATH}`;
    SCRIPTS_TARGET = `{gamePath}\\${SCRIPTS_PATH}`;
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    CONFIG_TARGET = `${CONFIG_PATH}`;
    try {
      const SAVE_ARRAY = fs.readdirSync(SAVE_PATH_DEFAULT);
      USERID_FOLDER = SAVE_ARRAY.find((element) => 
      ((/[a-z]/i.test(element) === false))
       );
    } catch(err) {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    }
    SAVE_PATH = path.join(SAVE_PATH_DEFAULT, USERID_FOLDER);
    SAVE_TARGET = `${SAVE_PATH}`;
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

//Test for save files
function testUe4ssCombo(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === SCRIPTS_EXT) !== undefined;
  const isMod2 = files.find(file => path.extname(file).toLowerCase() === LOGICMODS_EXT) !== undefined;
  const isFolder = files.find(file => path.basename(file) === ROOT_FILE) !== undefined;
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
  const modFile = files.find(file => path.basename(file) === ROOT_FILE);
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
  const isMod = files.some(file => path.basename(file) === LOGICMODS_FILE);
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

//Installer test for UE4SS files
function testObse(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === OBSE_FILE);
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

//Installer install UE4SS files
function installObse(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === OBSE_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: OBSE_ID };

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

//Test for UE4SS Script files
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
      log('info', `Successfully created enabled.txt for UE4SS Script Mod: ${MOD_NAME}`);
    } catch (err) {
      log('error', `Could not create enabled.txt for UE4SS Script Mod: ${MOD_NAME}`);
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
    //MOD_FOLDER = MOD_NAME.replace(/[\-]*[\d]*[\.]*( )*(installing)*/gi, '');
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
  const isMod = files.some(file => path.basename(file) === ROOT_FILE);
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
  const modFile = files.find(file => path.basename(file) === ROOT_FILE);
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
  const IS_CONFIG = checkPartitions(DOCUMENTS, GAME_PATH);
  if (IS_CONFIG === false) {
    api.showErrorNotification(`Could not install mod as Config`, `You tried installing a Config mod, but the game, staging folder, and User folders are not all on the same drive. Please move the game and/or staging folder to the same drive as the User folders (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  }
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
  const IS_SAVE = checkPartitions(DOCUMENTS, GAME_PATH);
  if (IS_SAVE === false) {
    api.showErrorNotification(`Could not install mod as Save`, `You tried installing a Save mod, but the game, staging folder, and Local AppData folder are not all on the same drive. Please move the game and/or staging folder to the same drive as the Local AppData folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } 
  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testPlugins(files, gameId) {
  const isMod = files.some(file => PLUGINS_EXTS.includes(path.extname(file).toLowerCase()));
  const isFolder = files.some(file => PLUGINS_FOLDERS.includes(path.basename(file)));
  const TEST = isMod || isFolder;
  let supported = (gameId === spec.game.id) && TEST;

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
function installPlugins(files) {
  const modFile = files.find(file => 
    PLUGINS_FOLDERS.includes(path.basename(file)) ||
    PLUGINS_EXTS.includes(path.extname(file).toLowerCase()) 
  );
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PLUGINS_ID };

  //set a mod attribute to find the mod name in deserializeLoadOrder
  const PLUGIN_FILES = files.filter(file => PLUGINS_EXTS_FILTER.includes(path.extname(file).toLowerCase()));
  const PLUGIN_FILES_MAP = PLUGIN_FILES.map(file => path.basename(file));
  const MOD_ATTRIBUTE = {
    type: 'attribute',
    key: 'plugins',
    value: PLUGIN_FILES_MAP,
  };

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
  instructions.push(MOD_ATTRIBUTE);
  return Promise.resolve({ instructions });
}


//Test Fallback installer for binaries folder
function testBinaries(files, gameId) {
  const isPak = files.find(file => path.extname(file).toLowerCase() === PAK_EXT) !== undefined;
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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

async function onCheckModVersion(api, gameId, mods, forced) {
  const profile = selectors.activeProfile(api.getState());
  if (profile.gameId !== gameId) {
    return;
  }
  try {
    await testRequirementVersion(api, REQUIREMENTS[0]);
  } catch (err) {
    log('warn', 'failed to test requirement version', err);
  }
}

async function checkForUe4ss(api) {
  const mod = await REQUIREMENTS[0].findMod(api);
  return mod !== undefined;
}

//Check if UE4SS is installed
function isUe4ssInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === UE4SS_ID);
}

//Check if OBSE is installed
function isObseInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === OBSE_ID);
}

//Function to auto-download UE4SS from Nexus
async function downloadUe4ss(api, gameSpec) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = `UE4SS`;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const MOD_TYPE = UE4SS_ID;
    const modPageId = 32;
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
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = () => Number.parseInt(input.uploaded_time, 10);
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

//Function to auto-download UE4SS from Nexus
async function downloadObse(api, gameSpec) {
  let isInstalled = isObseInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = OBSE_NAME;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const MOD_TYPE = OBSE_ID;
    const modPageId = 282;
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
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = () => Number.parseInt(input.uploaded_time, 10);
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
  const testUnrealGame = (gameId) => {
    const game = gameId === spec.game.id;
    const unrealModsPath = UNREALDATA.modsPath;
    const loadOrder = UNREALDATA.loadOrder;
    return (!!unrealModsPath && game);
    //return (!!unrealModsPath && game && loadOrder === true);
  };

  const testForUnrealMod = (files, gameId) => {
    const supportedGame = testUnrealGame(gameId);
    const fileExt = UNREALDATA.fileExt;
    let modFiles = [];
    if (fileExt)
      modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const supported = (supportedGame && (gameId === spec.game.id) && modFiles.length > 0);
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

  context.registerInstaller('ue5-pak-installer', 29, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealMod(context.api, files, gameId));

  context.registerModType(UE5_SORTABLE_ID, 25, (gameId) => testUnrealGame(gameId), getUnrealModsPath, () => Promise.resolve(false), {
    name: UE5_SORTABLE_NAME,
    //mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id
  });
}

// PLUGINS LOAD ORDER FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////

//deserialize load order
async function deserializeLoadOrder(context) {
  //Set basic information for load order paths and data
  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const mods = util.getSafe(context.api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const loadOrderPath = path.join(gameDir, PLUGINSTXT_PATH);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );

  //Get all .esm/esp/esl files from Data folder
  let modFolderPath = path.join(gameDir, PLUGINS_PATH);
  let modFiles = [];
  try {
    modFiles = await fs.readdirAsync(modFolderPath);
    modFiles = modFiles.filter(file => PLUGINS_EXTS_FILTER.includes(path.extname(file).toLowerCase()));
    modFiles = modFiles.filter(file => !DEFAULT_PLUGINS.includes(path.basename(file)));
    modFiles = modFiles.filter(file => !EXCLUDED_PLUGINS.includes(path.basename(file)));
    modFiles.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read Data folder'));
  }

  // Get readable mod name using attribute from mod installer
  async function getModName(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['plugins'], '').includes(file))); //find mod that includes the plugin file
      if (modMatch) {
        return modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
      }
      return file;
    } catch (err) {
      return file;
    }
  }
  // Get readable mod id using attribute from mod installer
  async function getModId(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['plugins'], '').includes(file))); //find mod that includes the plugin file
      if (modMatch) {
        return modMatch.id;
      }
      return undefined;
    } catch (err) {
      return undefined;
    }
  }

  //* Set initial load order from file
  let loadOrder = await (loadOrderFile.split("\n"))
    .reduce(async (accumP, line) => {
      const accum = await accumP;
      const file = line.replace(/#/g, '');
      if (!modFiles.includes(file)) {
        return Promise.resolve(accum);
      }
      accum.push(
      {
        id: file,
        name: `${file} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: !line.startsWith("#"),
      }
      );
      return Promise.resolve(accum);
    }, Promise.resolve([])
  ); //*/
  
  //push new mods to loadOrder
  for (let file of modFiles) {
    if (!loadOrder.find((mod) => (mod.id === file))) {
      loadOrder.push({
        id: file,
        name: `${file} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: true,
      });
    }
  }

  return loadOrder;
}

//Serialize load order
async function serializeLoadOrder(context, loadOrder) {
  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const loadOrderPath = path.join(gameDir, PLUGINSTXT_PATH);

  let loadOrderOutput = loadOrder
  .map((mod) => (mod.enabled ? mod.id : `#${mod.id}`))
  .join("\n");
  /* Log load order
  let loadOrderLog = loadOrder
  .map((mod) => (mod.enabled ? mod.id : `#${mod.id}`))
  .join(", ");
  log('warn', `Load Order: ${loadOrderLog}`); //*/
  const header = `# File generated by Vortex. Please do not edit this file.\n`;
  return fs.writeFileAsync(
    loadOrderPath,
    `${header + PLUGINSTXT_DEFAULT_CONTENT + loadOrderOutput}`, //empty line included in default plugins list to avoid overlap
    { encoding: "utf8" },
  );
}

//Validate load order
async function validate(context, prev, current) {
  const invalid = [];
  GAME_PATH = getDiscoveryPath(context.api);
  const dataPath = path.join(GAME_PATH, PLUGINS_PATH);
  for (const entry of current) {
    try {
      await fs.statAsync(path.join(dataPath, entry.id));
    }
    catch (err) {
      invalid.push({ id: entry.id, reason: 'File not found in Data folder' });
    }
  }
  return invalid.length > 0 ? Promise.resolve({ invalid }) : Promise.resolve(undefined);
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

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

//Notification if Config, Save, and Creations folders are not on the same partition
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
            text: `Because ${GAME_NAME} includes the IO-Store Unreal Engine feature, Vortex must use hardlinks to install mods for the game.\n`
                + `Because of this, the game, staging folder, and user folder (typically on C Drive) must all be on the same partition to install certain mods with Vortex.\n`
                + `Vortex detected that one or more of the mod types listed below are not available because the game, staging folder, and user folder are not on the same partition.\n`
                + `\n`
                + `Here are your results for the partition check to enable these mod types:\n`
                + `  - Config: ${CHECK_DATA ? 'ENABLED: User folders are on the same partition as the game and staging folder and the Config modtypes are available' : 'DISABLED: User folders are NOT on the same partition as the game and staging folder and the Config modtypes are NOT available'}\n`
                + `\n`
                + `Config Path: ${path.join(DOCUMENTS, CONFIG_PATH)}\n`
                + `\n`
                + `If you want to use the disabled mod types, you must move the game and staging folder to the same partition as the Documents folder (typically C Drive).\n`
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
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  //*
  CHECK_DATA = checkPartitions(DOCUMENTS, GAME_PATH);
  if (!CHECK_DATA) {
    partitionCheckNotify(api, CHECK_DATA);
  }
  if (CHECK_DATA) { //if game, staging folder, and config and save folders are on the same drive
    await fs.ensureDirWritableAsync(path.join(DOCUMENTS, CONFIG_PATH));
    //await fs.ensureDirWritableAsync(DOCUMENTS, SAVE_PATH);
  } //*/
  try {
    fs.statSync(GAME_PATH, PLUGINSTXT_PATH);
    //PLUGINS_ORDER = await fs.readFileAsync(path.join(GAME_PATH, PLUGINSTXT_PATH), { encoding: "utf8" });
  } catch (err) {
    await fs.writeFileAsync(
      path.join(GAME_PATH, PLUGINSTXT_PATH),
      `${PLUGINSTXT_DEFAULT_CONTENT}`,
      { encoding: "utf8" },
    );
  }
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, SCRIPTS_PATH));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, LOGICMODS_PATH));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, PLUGINS_PATH));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, UE5_PATH));
  //await downloadUe4ss(api, gameSpec);
  await downloadObse(api, gameSpec);
  const ue4ssInstalled = await checkForUe4ss(api);
  return ue4ssInstalled ? Promise.resolve() : download(api, REQUIREMENTS);
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
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
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

  //register mod types explicitly (in Binaries folder)
  context.registerModType(SCRIPTS_ID, 50, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, SCRIPTS_TARGET), 
    () => Promise.resolve(false), 
    { name: SCRIPTS_NAME }
  );
  context.registerModType(DLL_ID, 52, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, SCRIPTS_TARGET), 
    () => Promise.resolve(false), 
    { name: DLL_NAME }
  );
  context.registerModType(BINARIES_ID, 54, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, EXEC_TARGET), 
    () => Promise.resolve(false), 
    { name: BINARIES_NAME }
  );
  context.registerModType(UE4SS_ID, 56, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, EXEC_TARGET), 
    () => Promise.resolve(false), 
    { name: UE4SS_NAME }
  );
  context.registerModType(OBSE_ID, 58, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, EXEC_TARGET), 
    () => Promise.resolve(false), 
    { name: OBSE_NAME }
  );

  //* register modtypes with partition checks
  context.registerModType(CONFIG_ID, 60, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DATA = checkPartitions(DOCUMENTS, GAME_PATH);
      }
      return ((gameId === GAME_ID) && (CHECK_DATA === true));
    },
    (game) => pathPattern(context.api, game, CONFIG_TARGET), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  ); //*/
  /*
  context.registerModType(SAVE_ID, 62, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DATA = checkPartitions(DOCUMENTS, GAME_PATH);
      }
      return ((gameId === GAME_ID) && (CHECK_DATA === true));
    },
    (game) => pathPattern(context.api, game, SAVE_TARGET), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  ); //*/

  //register mod installers
  context.registerInstaller(UE4SSCOMBO_ID, 25, testUe4ssCombo, installUe4ssCombo);
  context.registerInstaller(LOGICMODS_ID, 27, testLogic, installLogic);
  //29 is pak installer above
  context.registerInstaller(UE4SS_ID, 31, testUe4ss, installUe4ss);
  context.registerInstaller(OBSE_ID, 32, testObse, installObse);
  context.registerInstaller(SCRIPTS_ID, 33, testScripts, installScripts);
  context.registerInstaller(DLL_ID, 35, testDll, installDll);
  context.registerInstaller(PLUGINS_ID, 37, testPlugins, installPlugins);
  context.registerInstaller(ROOT_ID, 39, testRoot, installRoot);
  context.registerInstaller(CONFIG_ID, 41, testConfig, (files) => installConfig(context.api, files));
  //context.registerInstaller(SAVE_ID, 43, testSave, (files) => installSave(context.api, files));
  context.registerInstaller(BINARIES_ID, 45, testBinaries, installBinaries);

  //register buttons to open folders
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, UE5_ALT_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Binaries Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, EXEC_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open UE4SS Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, SCRIPTS_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Data Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, PLUGINS_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const state = context.api.getState();
    const openPath = path.join(CONFIG_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Engine.ini', () => {
    const state = context.api.getState();
    const openPath = path.join(CONFIG_PATH, 'Engine.ini');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    const state = context.api.getState();
    const openPath = path.join(SAVE_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download UE4SS', () => {
    downloadUe4ss(context.api, gameSpec).catch(() => null);
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

  context.registerAction('fb-load-order-icons', 150, 'open-ext', {}, 'View Plugins.txt File', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, PLUGINSTXT_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('fb-load-order-icons', 500, 'remove', {}, 'Reset Plugins.txt File', () => {
    writePluginsTxtPurge(context.api);
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

  if (PLUGIN_LO_ENABLE === true) { //plugin mod load order
    context.registerLoadOrder({
      gameId: GAME_ID,
      deserializeLoadOrder: async () => await deserializeLoadOrder(context),
      serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),  
      validate: async (prev, current) => await validate(context, prev, current), 
      //validate: async () => Promise.resolve(undefined), // no validation
      toggleableEntries: true,
      clearStateOnPurge: false,
      //noCollectionGeneration: undefined,
      usageInstructions:`Drag and drop the mods on the left to change the order in which they load.   \n` 
                        +`${GAME_NAME} loads mods in the order you set from top to bottom.   \n`
                        +`De-select mods to prevent the game from loading them.   \n`
                        +`\n`,
    });
  }

  if (UNREALDATA.loadOrder === true) { //UNREAL - mod load order
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
    context.api.onAsync('check-mods-version', (gameId, mods, forced) => onCheckModVersion(context.api, gameId, mods, forced));
    context.api.onAsync('will-purge', (profileId) => willPurge(context.api, profileId)); //*/
    context.api.onAsync('will-deploy', (profileId) => willDeploy(context.api, profileId)); //*/
    //context.api.onAsync('did-deploy', (profileId) => didDeploy(context.api, profileId)); //*/
    //context.api.onAsync('did-purge', (profileId) => didPurge(context.api, profileId)); //*/
  });
  return true;
}

//Functions to backup the plugins.txt file before starting purge events
async function willPurge(api, profileId) { //run before mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  await purgeTxtBackup(api);
  return Promise.resolve();
}
//Backup Plugins.txt file before purging
async function purgeTxtBackup(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }

  const source = path.join(GAME_PATH, PLUGINSTXT_PATH);
  const destination = path.join(GAME_PATH, PLUGINS_PATH, PLUGINSTXT_FILE_BAK);
  try {
    fs.statSync(source);
    const sourceContents = await fs.readFileAsync(source, { encoding: 'utf8' });
    const header = `# File generated by Vortex. Please do not edit this file.\n`;
    if ( sourceContents !== ( `${header + PLUGINSTXT_DEFAULT_CONTENT}` || `${PLUGINSTXT_DEFAULT_CONTENT}` )) { //DON'T do the copy if the contents are the default (to avoid overwriting the backup load order with the default)
      await fs.copyAsync(source, destination);
    }
    return
  } catch (err) {
    return Promise.reject(new util.NotFound(`Plugins.txt could not be backed up - error: ${err.message}`));
  }
}

//Functions to restore the plugins.txt file after deploy completes
async function willDeploy(api, profileId) { //run before deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  await deployTxtRestore(api);
  return Promise.resolve();
}
//Restore Plugins.txt file before deploying
async function deployTxtRestore(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }

  const source = path.join(GAME_PATH, PLUGINS_PATH, PLUGINSTXT_FILE_BAK);
  const destination = path.join(GAME_PATH, PLUGINSTXT_PATH);
  try { 
    fs.statSync(source);
  } catch (err) { //if the backup file doesn't exist, write it with default contents
    await fs.writeFileAsync(
      path.join(source),
      `${PLUGINSTXT_DEFAULT_CONTENT}`,
      { encoding: "utf8" },
    ); //*/
  }
  try {
    fs.statSync(destination);
    const destinationContents = await fs.readFileAsync(destination, { encoding: 'utf8' }); //read Plugins.txt contents
    const header = `# File generated by Vortex. Please do not edit this file.\n`;
    if ( destinationContents === ( `${header + PLUGINSTXT_DEFAULT_CONTENT}` || `${PLUGINSTXT_DEFAULT_CONTENT}` ) ) { //only copy the backup to Plugins.txt if the contents of Plugins.txt ARE the default, indicating mods had been purged (to prevent reverting load order changes)
      await fs.copyAsync(source, destination);
    }
  } catch (err) { 
    return Promise.reject(new util.NotFound(`Plugins.txt could not be restored when deploying mods from default - error: ${err.message}`));
  }
}

/*
async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }

  //await writePluginsTxtPurge(api);
  return Promise.resolve();
} //*/

//Reset Plugins.txt (button action)
async function writePluginsTxtPurge(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  return fs.writeFileAsync(
    path.join(GAME_PATH, PLUGINSTXT_PATH),
    `${PLUGINSTXT_DEFAULT_CONTENT}`,
    { encoding: "utf8" },
  );
}

/*
async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  //await writePluginsTxtDeploy(api);
  return Promise.resolve();
}
//Write plugin names to Plugins.txt on deploy
async function writePluginsTxtDeploy(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  //Get all .esm/esp/esl files from Data folder
  let modFiles = [];
  const PLUGINS_EXTS_FILTER = ['.esp', '.esm', '.esl'];
  try {
    modFiles = await fs.readdirAsync(path.join(GAME_PATH, PLUGINS_PATH));
    modFiles = modFiles.filter(file => PLUGINS_EXTS_FILTER.includes(path.extname(file).toLowerCase()));
    modFiles = modFiles.filter(file => !DEFAULT_PLUGINS.includes(path.basename(file)));
    modFiles = modFiles.filter(file => !EXCLUDED_PLUGINS.includes(path.basename(file)));
    modFiles.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read Data folder'));
  }
  return fs.writeFileAsync(
    path.join(GAME_PATH, PLUGINSTXT_PATH),
    `${PLUGINSTXT_DEFAULT_CONTENT + modFiles.join('\n')}`,
    { encoding: "utf8" },
  );
} //*/

//export to Vortex
module.exports = {
  default: main,
};
