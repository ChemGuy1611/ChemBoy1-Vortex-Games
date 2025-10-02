/*////////////////////////////////////////////////
Name: inZOI Vortex Extension
Structure: UE5
Author: ChemBoy1
Version: 0.3.2
Date: 2025-09-05
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const fsPromises = require('fs/promises');
//const { jsonrepair } = require('./node_modules/jsonrepair');

//Specify all information about the game
const GAME_ID = "inzoi";
const EPICAPP_ID = null;
const STEAMAPP_ID = "2456740";
const GOGAPP_ID = "";
const XBOXAPP_ID = "";
const XBOXEXECNAME = "";
const GAME_NAME = "inZOI";
const GAME_NAME_SHORT = "inZOI";
const EXEC = "inZOI.exe";
let GAME_PATH = null;
let MODKIT_PATH = null;
let CHECK_CONFIG = false;
let CHECK_DOCS = false; 
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Unreal Engine specific
const EPIC_CODE_NAME = "BlueClient";
const EXEC_FOLDER_NAME = "Win64";
const IO_STORE = true; //true if the Paks folder contains .ucas and .utoc files
const UE4SS_MOD_PATH = path.join('ue4ss', 'Mods');

//Settings related to the IO Store UE feature
let PAKMOD_EXTS = ['.pak'];
let PAK_FILE_MIN = 1;
let SYM_LINKS = true;
if (IO_STORE) { //Set file number for pak installer file selection (needs to be 3 if IO Store is used to accomodate .ucas and .utoc files)
  SYM_LINKS = false;
  PAKMOD_EXTS = ['.pak', '.ucas', '.utoc'];
  PAK_FILE_MIN = PAKMOD_EXTS.length;
}

// Unreal Engine Game Data
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'),
  fileExt: PAKMOD_EXTS,
  loadOrder: true,
}

//Information for installers, modtypes, and tools
const DOCUMENTS = util.getVortexPath("documents");
const LOCALAPPDATA = util.getVortexPath("localAppData");
const DOCS_PATH = path.join(DOCUMENTS, "inZOI");
const DOCS_LOC = 'User Documents';

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(LOCALAPPDATA, EPIC_CODE_NAME, "Saved", "Config", "Windows");
const CONFIG_FILE1 = "engine.ini";
const CONFIG_FILE2 = "scalability.ini";
const CONFIG_FILE3 = "input.ini";
const CONFIG_FILES = [CONFIG_FILE1, CONFIG_FILE2, CONFIG_FILE3];
const CONFIG_EXT = ".ini";
const CONFIG_LOC = 'Local AppData';

const PAK_ID = `${GAME_ID}-pak`;
const PAK_NAME = "Paks (no ~mods)";
const PAK_PATH = UNREALDATA.modsPath;
const PAK_EXT = '.pak';
const PAK_ALT_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks');

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
const BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_NAME);
const SHIPPING_EXE = path.join(BINARIES_PATH, `${EPIC_CODE_NAME}-${EXEC_FOLDER_NAME}-Shipping.exe`);

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";
const ROOT_FILE = EPIC_CODE_NAME;

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(DOCS_PATH, "SaveGames");
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
const SAVE_EXT = ".sav";

const SCRIPTS_ID = `${GAME_ID}-scripts`;
const SCRIPTS_NAME = "UE4SS Script Mod";
const SCRIPTS_EXT = ".lua";
const SCRIPTS_FILE = "Scripts";
const SCRIPTS_PATH = path.join(BINARIES_PATH, UE4SS_MOD_PATH);

const DLL_ID = `${GAME_ID}-ue4ssdll`;
const DLL_NAME = "UE4SS DLL Mod";
const DLL_EXT = ".dll";
const DLL_FILE = "dlls";
const DLL_PATH = path.join(BINARIES_PATH, UE4SS_MOD_PATH);

const LOGICMODS_ID = `${GAME_ID}-logicmods`;
const LOGICMODS_NAME = "UE4SS LogicMods (Blueprint)";
const UE4SSCOMBO_ID = `${GAME_ID}-ue4sscombo`;
const UE4SSCOMBO_NAME = "UE4SS Script-LogicMod Combo";
const LOGICMODS_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks', 'LogicMods');
const LOGICMODS_FILE = "LogicMods";
const LOGICMODS_EXT = ".pak";

const UE4SS_ID = `${GAME_ID}-ue4ss`;
const UE4SS_NAME = "UE4SS";
const UE4SS_FILE = "dwmapi.dll";
const UE4SS_DLFILE_STRING = "ue4ss";
const UE4SS_URL = "https://github.com/UE4SS-RE/RE-UE4SS/releases";
const UE4SS_PAGE_NO = 1;
const UE4SS_FILE_NO = 1;

const MODENABLER_ID = `${GAME_ID}-modenabler`;
const MODENABLER_NAME = "Mod Enabler";
const MODENABLER_FILE = "dsound.dll";
const MODENABLER_FILE2 = "sig.lua";
const MODENABLER_PAGE_NO = 1;
const MODENABLER_FILE_NO = 13;

//Documents Folders
const CREATIONS_ID = `${GAME_ID}-creations`;
const CREATIONS_NAME = "Creations (Documents)";
const CREATIONS_PATH = path.join(DOCS_PATH);
const CREATIONS_FILE = "Creations";

const AIGENERATED_ID = `${GAME_ID}-aigenerated`;
const AIGENERATED_NAME = "AIGenerated (Documents)";
const AIGENERATED_PATH = path.join(DOCS_PATH);
const AIGENERATED_FILE = "AIGenerated";

const CANVAS_ID = `${GAME_ID}-canvas`;
const CANVAS_NAME = "Canvas (Documents)";
const CANVAS_PATH = path.join(DOCS_PATH);
const CANVAS_FILE = "Canvas";

//Individual file installers (NO Creations/AIGenerated/Canvas folders)
const MY3DPRINTER_ID = `${GAME_ID}-my3dprinter`;
const MY3DPRINTER_NAME = "My3DPrinter (Documents)";
const MY3DPRINTER_PATH = path.join(DOCS_PATH, "AIGenerated", "My3DPrinter");
const MY3DPRINTER_EXT1 = ".glb";
const MY3DPRINTER_EXT2 = ".dat";
const MY3DPRINTER_EXT3 = ".json";
const MY3DPRINTER_EXTS = [MY3DPRINTER_EXT1, MY3DPRINTER_EXT2];

const MYAPPEARANCES_ID = `${GAME_ID}-myappearances`;
const MYAPPEARANCES_NAME = "MyAppearances (Documents)";
const MYAPPEARANCES_PATH = path.join(DOCS_PATH, "Creations", "MyAppearances");
const MYAPPEARANCES_FILE = "appearance.dat";

const ANIMATIONS_ID = `${GAME_ID}-animations`;
const ANIMATIONS_NAME = "Animations (Documents)";
const ANIMATIONS_PATH = path.join(DOCS_PATH, "AIGenerated", "MyAIMotions");
const ANIMATIONS_FILE = "motion.dat";

const TEXTURES_ID = `${GAME_ID}-textures`;
const TEXTURES_NAME = "Textures (Documents)";
const TEXTURES_PATH = path.join(DOCS_PATH, "Creations", "MyTextures");
const TEXTURES_FILE = "albedo.jpg";

// MODKit
const MODKIT_ID = `${GAME_ID}-modkit`;
const MODKITAPP_ID = "e61de4231c6b43349615781e737ad297";
const MODKIT_EXEC = path.join('inZOIModKit', 'Binaries', 'Win64', 'inZOIModKit.exe');
const MODKIT_NAME = "MODKit";

const UE5KITMOD_ID = `${GAME_ID}-ue5modkitpak`;
const UE5KITMOD_NAME = "UE5 MODKit Pak Mod";
const UE5KITMOD_FILE = 'mod_manifest.json';
const UE5KITMOD_EXT = '.uplugin';
const UE5KITMOD_PATH = path.join(DOCS_PATH, 'Mods');

const MOD_PATH_DEFAULT = UE5KITMOD_PATH;

//Filled in from data above
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
    "modPathIsRelative": false,
    "requiredFiles": [
      EXEC,
      EPIC_CODE_NAME,
    ],
    "details": {
      "epicAppId": EPICAPP_ID,
      "steamAppId": STEAMAPP_ID,
      "supportsSymlinks": SYM_LINKS,
    },
    "environment": {
      "EpicAppId": EPICAPP_ID,
      "SteamAPPId": STEAMAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": UE5KITMOD_ID,
      "name": UE5KITMOD_NAME,
      "priority": "high",
      "targetPath": UE5KITMOD_PATH
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": SAVE_PATH
    },
    {
      "id": CREATIONS_ID,
      "name": CREATIONS_NAME,
      "priority": "high",
      "targetPath": CREATIONS_PATH
    },
    {
      "id": AIGENERATED_ID,
      "name": AIGENERATED_NAME,
      "priority": "high",
      "targetPath": AIGENERATED_PATH
    },
    {
      "id": CANVAS_ID,
      "name": CANVAS_NAME,
      "priority": "high",
      "targetPath": CANVAS_PATH
    },
    {
      "id": MY3DPRINTER_ID,
      "name": MY3DPRINTER_NAME,
      "priority": "high",
      "targetPath": MY3DPRINTER_PATH
    },
    {
      "id": MYAPPEARANCES_ID,
      "name": MYAPPEARANCES_NAME,
      "priority": "high",
      "targetPath": MYAPPEARANCES_PATH
    },
    {
      "id": ANIMATIONS_ID,
      "name": ANIMATIONS_NAME,
      "priority": "high",
      "targetPath": ANIMATIONS_PATH
    },
    {
      "id": TEXTURES_ID,
      "name": TEXTURES_NAME,
      "priority": "high",
      "targetPath": TEXTURES_PATH
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
    ],
    "names": []
  }
};

//Set mod type priority
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
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Set mod path
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

async function requiresLauncher(gamePath, store) {
  /*
  if (store === 'xbox') {
      return Promise.resolve({
          launcher: 'xbox',
          addInfo: {
              appId: XBOXAPP_ID,
              parameters: [{ appExecName: XBOXEXECNAME }],
          },
      });
  } //*/
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

//Test for UE4SS Script-LogicMods combo files
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

//Install UE4SS Script-LogicMods combo files
function installUe4ssCombo(api, files) {
  const modFile = files.find(file => (path.basename(file) === ROOT_FILE));
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

  //Partition check for if mod can be installed
  GAME_PATH = getDiscoveryPath(api);
  const CHECK = checkPartitions(DOCS_PATH, GAME_PATH);
  if (!CHECK) {
    api.showErrorNotification(`Could not install mod as "${UE4SSCOMBO_NAME}"`, `You tried installing a "${UE4SSCOMBO_NAME}" mod, but the game folder, Vortex Mod Staging folder, and ${DOCS_LOC} folder are not all on the same drive. Please move the game and/or Vortex Mod Staging Folder to the same drive as the ${DOCS_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } 

  return Promise.resolve({ instructions });
}

//Test for LogicMods files
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

//Install LogicMods files
function installLogic(api, files) {
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

  //Partition check for if mod can be installed
  GAME_PATH = getDiscoveryPath(api);
  const CHECK = checkPartitions(DOCS_PATH, GAME_PATH);
  if (!CHECK) {
    api.showErrorNotification(`Could not install mod as "${LOGICMODS_NAME}"`, `You tried installing a "${LOGICMODS_NAME}" mod, but the game folder, Vortex Mod Staging folder, and ${DOCS_LOC} folder are not all on the same drive. Please move the game and/or Vortex Mod Staging Folder to the same drive as the ${DOCS_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } 

  return Promise.resolve({ instructions });
}

//Installer test for mod files
function testPak(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === UE5KITMOD_EXT));
  const isJson = files.some(file => (path.basename(file).toLowerCase() === UE5KITMOD_FILE));
  let supported = (gameId === spec.game.id) && ( isMod && isJson );

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

//Installer install mod files
function installPak(api, files, fileName) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === UE5KITMOD_FILE));
  //const JSON_FILE = files.find(file => (path.basename(file).toLowerCase() === UE5KITMOD_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE5KITMOD_ID };
  let MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = MOD_NAME.replace(/[\.]*(installing)*(zip)*/gi, '');
  if (rootPath !== '.') {
    MOD_NAME = path.basename(rootPath);
    MOD_FOLDER = MOD_NAME;
  }
  try { //read mod_manifest.json file to get folder name (game will crash if this doesn't match)
    const JSON_OBJECT = JSON.parse(fs.readFileSync(path.join(fileName, rootPath, UE5KITMOD_FILE)));
    const JSON_MOD_NAME = JSON_OBJECT["ProjectName"];
    if (JSON_MOD_NAME === undefined) {
      throw new Error(`"ProjectName" key not found in mod_manifest.json for mod ${MOD_NAME}`);
    }
    MOD_FOLDER = JSON_MOD_NAME;
  } catch (err) { //mod_manifest.json could not be read.
    log('error', `Could not read ${UE5KITMOD_FILE} file for mod ${MOD_NAME} - ${err}:${err.message}`);
    api.showErrorNotification(`Could not get "ProjectName" from ${UE5KITMOD_FILE} file for mod ${MOD_NAME}`, `Could not get "ProjectName" from ${UE5KITMOD_FILE} file for mod ${MOD_NAME}. \n You must manually verify the folder above the mod files is named correctly.`, { allowReport: false });
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
function installUe4ss(api, files) {
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

  //Partition check for if mod can be installed
  GAME_PATH = getDiscoveryPath(api);
  const CHECK = checkPartitions(DOCS_PATH, GAME_PATH);
  if (!CHECK) {
    api.showErrorNotification(`Could not install mod as "${UE4SS_NAME}"`, `You tried installing a "${UE4SS_NAME}" mod, but the game folder, Vortex Mod Staging folder, and ${DOCS_LOC} folder are not all on the same drive. Please move the game and/or Vortex Mod Staging Folder to the same drive as the ${DOCS_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } 

  return Promise.resolve({ instructions });
}

//Installer test for Mod Enabler files
function testModEnabler(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === MODENABLER_FILE));
  const isMod2 = files.some(file => (path.basename(file).toLowerCase() === MODENABLER_FILE2));
  let supported = (gameId === spec.game.id) && isMod && isMod2;

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

//Install Mod Enabler files
function installModEnabler(api, files) {
  const setModTypeInstruction = { type: 'setmodtype', value: MODENABLER_ID };
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

  //Partition check for if mod can be installed
  GAME_PATH = getDiscoveryPath(api);
  const CHECK = checkPartitions(DOCS_PATH, GAME_PATH);
  if (!CHECK) {
    api.showErrorNotification(`Could not install mod as "${MODENABLER_NAME}"`, `You tried installing a "${MODENABLER_NAME}" mod, but the game folder, Vortex Mod Staging folder, and ${DOCS_LOC} folder are not all on the same drive. Please move the game and/or Vortex Mod Staging Folder to the same drive as the ${DOCS_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } 

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
function installScripts(api, files, fileName) {
  const modFile = files.find(file => (path.basename(file) === SCRIPTS_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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

  //Partition check for if mod can be installed
  GAME_PATH = getDiscoveryPath(api);
  const CHECK = checkPartitions(DOCS_PATH, GAME_PATH);
  if (!CHECK) {
    api.showErrorNotification(`Could not install mod as "${SCRIPTS_NAME_NAME}"`, `You tried installing a "${SCRIPTS_NAME}" mod, but the game folder, Vortex Mod Staging folder, and ${DOCS_LOC} folder are not all on the same drive. Please move the game and/or Vortex Mod Staging Folder to the same drive as the ${DOCS_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } 

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
function installDll(api, files, fileName) {
  const modFile = files.find(file => (path.basename(file) === DLL_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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

  //Partition check for if mod can be installed
  GAME_PATH = getDiscoveryPath(api);
  const CHECK = checkPartitions(DOCS_PATH, GAME_PATH);
  if (!CHECK) {
    api.showErrorNotification(`Could not install mod as "${DLL_NAME}"`, `You tried installing a "${DLL_NAME}" mod, but the game folder, Vortex Mod Staging folder, and ${DOCS_LOC} folder are not all on the same drive. Please move the game and/or Vortex Mod Staging Folder to the same drive as the ${DOCS_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } 

  return Promise.resolve({ instructions });
}

//Installer test for Creations folder
function testCreations(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === CREATIONS_FILE));
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

//Install Creations folder
function installCreations(api, files) {
  const modFile = files.find(file => (path.basename(file) === CREATIONS_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CREATIONS_ID };
  
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((!file.endsWith(path.sep)))
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

//Installer test for Creations folder
function testAiGenerated(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === AIGENERATED_FILE));
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

//Install Creations folder
function installAiGenerated(api, files) {
  const modFile = files.find(file => (path.basename(file) === AIGENERATED_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: AIGENERATED_ID };
  
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((!file.endsWith(path.sep)))
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

//Installer test for Creations folder
function testCanvas(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === CANVAS_FILE));
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

//Install Creations folder
function installCanvas(api, files) {
  const modFile = files.find(file => (path.basename(file) === CANVAS_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CANVAS_ID };
  
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((!file.endsWith(path.sep)))
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

//Installer test for My3DPrinter files
function testMy3DPrinter(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === MY3DPRINTER_EXT1));
  const isMod2 = files.some(file => (path.extname(file).toLowerCase() === MY3DPRINTER_EXT2));
  //const isMod3 = files.some(file => (path.extname(file).toLowerCase() === MY3DPRINTER_EXT3));
  let supported = (gameId === spec.game.id) && isMod && isMod2;

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

//Install My3DPrinter files
function installMy3DPrinter(api, files) {
  const modFile = files.find(file => MY3DPRINTER_EXTS.includes(path.extname(file).toLowerCase()));
  const rootPath = path.dirname(modFile);
  let idx = modFile.indexOf(`${path.basename(rootPath)}\\`);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    idx = modFile.indexOf(path.basename(modFile));
  }
  const setModTypeInstruction = { type: 'setmodtype', value: MY3DPRINTER_ID };
  
  //Filter files and set instructions
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
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

//Installer test for Canvas files
function testMyAppearances(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === MYAPPEARANCES_FILE));
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

//Install Canvas files
function installMyAppearances(api, files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MYAPPEARANCES_FILE));
  const rootPath = path.dirname(modFile);
  let idx = modFile.indexOf(`${path.basename(rootPath)}\\`);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    idx = modFile.indexOf(path.basename(modFile));
  }
  const setModTypeInstruction = { type: 'setmodtype', value: MYAPPEARANCES_ID };
  
  //Filter files and set instructions
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
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

//Installer test for Animations files
function testAnimations(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === ANIMATIONS_FILE));
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

//Install Animations files
function installAnimations(api, files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === ANIMATIONS_FILE));
  const rootPath = path.dirname(modFile);
  let idx = modFile.indexOf(`${path.basename(rootPath)}\\`);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    idx = modFile.indexOf(path.basename(modFile));
  }
  const setModTypeInstruction = { type: 'setmodtype', value: ANIMATIONS_ID };
  
  //Filter files and set instructions
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
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

//Installer test for Animations files
function testTextures(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === TEXTURES_FILE));
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

//Install Animations files
function installTextures(api, files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === TEXTURES_FILE));
  const rootPath = path.dirname(modFile);
  let idx = modFile.indexOf(`${path.basename(rootPath)}\\`);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    idx = modFile.indexOf(path.basename(modFile));
  }
  const setModTypeInstruction = { type: 'setmodtype', value: TEXTURES_ID };
  
  //Filter files and set instructions
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
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


//Installer test for root folder files
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

//Installer install root folder files
function installRoot(api, files) {
  const modFile = files.find(file => (path.basename(file) === ROOT_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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

  //Partition check for if mod can be installed
  GAME_PATH = getDiscoveryPath(api);
  const CHECK = checkPartitions(DOCS_PATH, GAME_PATH);
  if (!CHECK) {
    api.showErrorNotification(`Could not install mod as "${ROOT_NAME}"`, `You tried installing a "${ROOT_NAME}" mod, but the game folder, Vortex Mod Staging folder, and ${DOCS_LOC} folder are not all on the same drive. Please move the game and/or Vortex Mod Staging Folder to the same drive as the ${DOCS_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } 

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
    api.showErrorNotification(`Could not install mod as "${CONFIG_NAME}"`, `You tried installing a "${CONFIG_NAME}" mod, but the game, Vortex Mod Staging folder, and ${CONFIG_LOC} folder are not all on the same drive. Please move the game and/or Vortex Mod Staging folder to the same drive as the ${CONFIG_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
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

  //Partition check for if mod can be installed
  GAME_PATH = getDiscoveryPath(api);
  const CHECK = checkPartitions(DOCS_PATH, GAME_PATH);
  if (!CHECK) {
    api.showErrorNotification(`Could not install mod as "${SAVE_NAME}"`, `You tried installing a "${SAVE_NAME}" mod, but the game folder, Vortex Mod Staging folder, and ${DOCS_LOC} folder are not all on the same drive. Please move the game and/or Vortex Mod Staging Folder to the same drive as the ${DOCS_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } 

  return Promise.resolve({ instructions });
}

//Fallback installer test
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

//Fallback installer to Binaries folder
function installBinaries(api, files) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };
  
  // Remove empty directories and return instructions
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

  //Partition check for if mod can be installed
  GAME_PATH = getDiscoveryPath(api);
  const CHECK = checkPartitions(DOCS_PATH, GAME_PATH);
  if (!CHECK) {
    api.showErrorNotification(`Could not install mod as "${BINARIES_NAME}"`, `You tried installing a "${BINARIES_NAME}" mod, but the game folder, Vortex Mod Staging folder, and ${DOCS_LOC} folder are not all on the same drive. Please move the game and/or Vortex Mod Staging Folder to the same drive as the ${DOCS_LOC} folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
  } 

  return Promise.resolve({ instructions });
}

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if UE4SS is installed
function isUe4ssInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === UE4SS_ID);
}

//Check if Mod Enabler is installed
function isModEnablerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MODENABLER_ID);
}

//* Download UE4SS from GitHub page (user browse for download)
async function downloadUe4ss(api, gameSpec) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  const URL = UE4SS_URL;
  const MOD_NAME = UE4SS_NAME;
  const MOD_TYPE = UE4SS_ID;
  const ARCHIVE_NAME = UE4SS_DLFILE_STRING;
  const instructions = api.translate(`Click on Continue below to open the browser. - `
    + `Navigate to the latest experimental version of ${MOD_NAME} on the GitHub releases page `
    + `and click on the appropriate file to download and install the mod.`
  );

  if (!isInstalled) {
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.ProcessCanceled('Selected wrong download'));
        } //*/
        return Promise.resolve(result);
      })
      .catch((error) => {
        return reject(error);
      })
      .then((result) => {
        const dlInfo = {game: gameSpec.game.id, name: MOD_NAME};
        api.events.emit('start-download', result, {}, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              return resolve();
            });
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please re-launch Vortex and try again.`, err, { allowReport: false });
        //util.opn(URL).catch(() => null);
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from modDB at the opened paged and install the zip in Vortex.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }
} //*/

//* Function to auto-download UE4SS form Nexus Mods
async function downloadUe4ssNexus(api, gameSpec) {
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

//* Function to auto-download Mod Enabler form Nexus Mods
async function downloadModEnabler(api, gameSpec) {
  let isInstalled = isModEnablerInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MODENABLER_NAME;
    const MOD_TYPE = MODENABLER_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = MODENABLER_PAGE_NO;
    const FILE_ID = MODENABLER_FILE_NO;  //If using a specific file id because "input" below gives an error
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
        if (result.action === 'Cancel') {
          return Promise.reject(new util.ProcessCanceled('User cancelled.'));
        }
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

  context.registerInstaller('ue5-pak-installer', 28, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealMod(context.api, files, gameId));

  context.registerModType('ue5-sortable-modtype', 25, (gameId) => testUnrealGame(gameId, true), getUnrealModsPath, () => Promise.resolve(false), {
    name: 'UE5 Sortable Mod',
    mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id
  });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

// Function to check if staging folder and game path are on same drive partition to enable modtypes + installers
function checkPartitions(folder1, folder2) {
  if (!IO_STORE) { // true if IO-Store is not enabled for the game, since symlinks work fine in that case
    return true;
  }
  try {
    // Define paths
    const path1 = folder1;
    const path2 = folder2;
    const path3 = STAGING_FOLDER;
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
function partitionCheckNotify(api, CHECK_CONFIG, CHECK_DOCS) {
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
                + `Because of this, the game, Vortex Staging folder, and user folders (typically on C Drive) must all be on the same partition to install certain mods with Vortex.\n`
                + `Vortex detected that one or more of the mod types listed below are not available because the game, staging folder, and user folder are not on the same partition.\n`
                + `\n`
                + `Here are your results for the partition check to enable these mod types:\n`
                + `  - Config: ${CHECK_CONFIG ? 'ENABLED: Config Folder (Local AppData) is on the same partition as the game folder and the Vortex Staging folder and the modtype is available' : 'DISABLED: Config Folder (Local AppData) is NOT on the same partition as the game folder and the Vortex staging folder and the modtype is NOT available'}\n`
                + `  - Game Folder: ${CHECK_DOCS ? 'ENABLED: Game folders are on the same partition as User Documents and the Vortex Staging folder. All modtypes that install to the game folder are available.' : 'DISABLED: Game folders are NOT on the same partition as User Documents and the Vortex Staging folder. All modtypes that install to the game folder are NOT available.'}\n`
                + `\n`
                + `Config Path: ${CONFIG_PATH}\n`
                + `Documents Path: ${DOCS_PATH}\n`
                + `Game Path: ${GAME_PATH}\n`
                + `\n`
                + `If you want to use the disabled mod types, you must move the game and/or Vortex Staging folder to the same partition as the User Documents folder and/or Local AppData (typically C Drive).\n`
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

//Get MODKit install path from Epic
async function getModKitPath() {
  return () => util.GameStoreHelper.findByAppId(MODKITAPP_ID, 'epic')
    .then((game) => game.gamePath);
  /*const path = Promise.resolve(util.GameStoreHelper.findByAppId(MODKITAPP_ID, 'epic'));
  log ('warn', `ModKit path: ${path}`);
  if (path !== undefined) {
    log('warn', `ModKit path found at ${JSON.stringify(path, null, 2)}`)
    return () => path;
  } //*/
}

// Clean invalid characters from a string
function cleanInvalidChars(string) {
  // 1. Remove control characters (ASCII 0-31) & null character
  let cleaned = string.replace(/[^\x00-\x7F]/gi, ''); // Keep only printable ASCII + UTF-8
  // 2. Remove non-UTF8 sequences (if needed for strict JSON)
  // (This is advanced - most apps don't need this)
  cleaned = cleaned.replace(/[\u0000-\u001F]/gi, ''); // Null chars, control chars

  return cleaned;
}

async function setModkitModsEnabled(api) {
  let paths = [];
  const raw = await fsPromises.readdir(UE5KITMOD_PATH, { recursive: true });
  for (let entry of raw) {
    if (path.basename(entry).toLowerCase() === UE5KITMOD_FILE) {
      path_select = path.join(UE5KITMOD_PATH, entry);
      paths.push(path_select);
    }
  }

  for (let path of paths) {
    let content = await fs.readFileAsync(path);
    let json;
    try {
      //content = cleanInvalidChars(content);
      json = JSON.parse(content);
      if (json.bEnable === false || json.bEnable === undefined) {
        json.bEnable = true;
        content = JSON.stringify(json, null, 2);
        await fs.writeFileAsync(path, content, { encoding: 'utf8' });
      }
    } catch (err) {
      log('error', `Could not parse/write ${path}:${err}:${err.message}`);
    }
  }
}

//* Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  MODKIT_PATH = getModKitPath();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  CHECK_CONFIG = checkPartitions(LOCALAPPDATA, GAME_PATH);
  CHECK_DOCS = checkPartitions(DOCS_PATH, GAME_PATH);
  if (!CHECK_DOCS || !CHECK_CONFIG) {
    partitionCheckNotify(api, CHECK_CONFIG, CHECK_DOCS);
  }
  if (CHECK_CONFIG === true) { //if Local AppData folder is on same drive as, staging folder, and Config folders are on the same drive
    await fs.ensureDirWritableAsync(CONFIG_PATH);
  }
  if (CHECK_DOCS === true) { //if game folder is on same drive as Documents folder and Staging Folder
    await fs.ensureDirWritableAsync(path.join(GAME_PATH, PAK_PATH));
    await fs.ensureDirWritableAsync(path.join(GAME_PATH, SCRIPTS_PATH));
    await fs.ensureDirWritableAsync(path.join(GAME_PATH, LOGICMODS_PATH));
  }
  //Documents folders. Safe to write-check since they are all in Documents (default install location)
  await fs.ensureDirWritableAsync(SAVE_PATH);
  await fs.ensureDirWritableAsync(CREATIONS_PATH);
  await fs.ensureDirWritableAsync(AIGENERATED_PATH);
  await fs.ensureDirWritableAsync(CANVAS_PATH);
  await fs.ensureDirWritableAsync(MY3DPRINTER_PATH);
  await fs.ensureDirWritableAsync(MYAPPEARANCES_PATH);
  await fs.ensureDirWritableAsync(ANIMATIONS_PATH);
  await fs.ensureDirWritableAsync(TEXTURES_PATH);
  await downloadModEnabler(api, gameSpec);
  //await downloadUe4ss(api, gameSpec);
  //await downloadUe4ssNexus(api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(MOD_PATH_DEFAULT));
} //*/

//Let Vortex know about the game
async function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    requiresLauncher: requiresLauncher,
    supportedTools: [
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
        parameters: []
      }, //*/
      {
        id: MODKIT_ID,
        name: MODKIT_NAME,
        logo: `modkit.png`,
        queryPath: getModKitPath,
        executable: () => MODKIT_EXEC,
        requiredFiles: [MODKIT_EXEC],
        detach: true,
        relative: false,
        exclusive: false,
        parameters: [],
      }, //*/
    ],
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
  //* Register modtypes explicitly (conditional on all folders being on same drive partition)
  context.registerModType(CONFIG_ID, 50, //id, priority
    (gameId) => { //isSupported - Is this mod for this game?
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_CONFIG = checkPartitions(LOCALAPPDATA, GAME_PATH);
      }
      return ((gameId === GAME_ID) && CHECK_CONFIG);
    },
    (game) => pathPattern(context.api, game, CONFIG_PATH), //getPath - mod install location
    () => Promise.resolve(false), //test - Is installed mod of this type?
    { name: CONFIG_NAME } //options
  );
  context.registerModType(UE4SSCOMBO_ID, 51, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DOCS = checkPartitions(DOCS_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && CHECK_DOCS);
    },
    (game) => pathPattern(context.api, game, "{gamePath}"), 
    () => Promise.resolve(false), 
    { name: UE4SSCOMBO_NAME }
  );
  context.registerModType(LOGICMODS_ID, 52, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DOCS = checkPartitions(DOCS_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && CHECK_DOCS);
    },
    (game) => pathPattern(context.api, game, `{gamePath}\\${LOGICMODS_PATH}`), 
    () => Promise.resolve(false), 
    { name: LOGICMODS_NAME }
  );
  context.registerModType(UE4SS_ID, 53, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DOCS = checkPartitions(DOCS_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && CHECK_DOCS);
    },
    (game) => pathPattern(context.api, game, `{gamePath}\\${BINARIES_PATH}`), 
    () => Promise.resolve(false), 
    { name: UE4SS_NAME }
  );
  context.registerModType(SCRIPTS_ID, 54, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DOCS = checkPartitions(DOCS_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && CHECK_DOCS);
    },
    (game) => pathPattern(context.api, game, `{gamePath}\\${SCRIPTS_PATH}`), 
    () => Promise.resolve(false), 
    { name: SCRIPTS_NAME }
  );
  context.registerModType(DLL_ID, 54, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DOCS = checkPartitions(DOCS_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && CHECK_DOCS);
    },
    (game) => pathPattern(context.api, game, `{gamePath}\\${DLL_PATH}`), 
    () => Promise.resolve(false), 
    { name: DLL_NAME }
  );
  context.registerModType(PAK_ID, 55, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DOCS = checkPartitions(DOCS_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && CHECK_DOCS);
    },
    (game) => pathPattern(context.api, game, `{gamePath}\\${PAK_ALT_PATH}`), 
    () => Promise.resolve(false), 
    { name: PAK_NAME }
  );
  context.registerModType(MODENABLER_ID, 56, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DOCS = checkPartitions(DOCS_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && CHECK_DOCS);
    },
    (game) => pathPattern(context.api, game, `{gamePath}`), 
    () => Promise.resolve(false), 
    { name: MODENABLER_NAME }
  );
  context.registerModType(ROOT_ID, 57, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DOCS = checkPartitions(DOCS_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && CHECK_DOCS);
    },
    (game) => pathPattern(context.api, game, `{gamePath}`), 
    () => Promise.resolve(false), 
    { name: ROOT_NAME }
  );
  context.registerModType(BINARIES_ID, 58, 
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api);
      if (GAME_PATH !== undefined) {
        CHECK_DOCS = checkPartitions(DOCS_PATH, GAME_PATH);
      }
      return ((gameId === GAME_ID) && CHECK_DOCS);
    },
    (game) => pathPattern(context.api, game, `{gamePath}\\${BINARIES_PATH}`), 
    () => Promise.resolve(false), 
    { name: BINARIES_NAME }
  );

  //Core installers
  context.registerInstaller(UE4SSCOMBO_ID, 25, testUe4ssCombo, (files) => installUe4ssCombo(context.api, files));
  context.registerInstaller(LOGICMODS_ID, 26, testLogic, (files) => installLogic(context.api, files));
  context.registerInstaller(UE5KITMOD_ID, 27, testPak, (files, fileName) => installPak(context.api, files, fileName));
  //28 is legacy pak installer
  context.registerInstaller(UE4SS_ID, 29, testUe4ss, (files) => installUe4ss(context.api, files));
  context.registerInstaller(MODENABLER_ID, 30, testModEnabler, (files) => installModEnabler(context.api, files));
  context.registerInstaller(SCRIPTS_ID, 31, testScripts, (files, fileName) => installScripts(context.api, files, fileName));
  context.registerInstaller(DLL_ID, 32, testDll, (files, fileName) => installDll(context.api, files, fileName));
  //Documents Folders
  context.registerInstaller(CREATIONS_ID, 33, testCreations, (files) => installCreations(context.api, files));
  context.registerInstaller(AIGENERATED_ID, 24, testAiGenerated, (files) => installAiGenerated(context.api, files));
  context.registerInstaller(CANVAS_ID, 35, testCanvas, (files) => installCanvas(context.api, files));
  context.registerInstaller(MY3DPRINTER_ID, 36, testMy3DPrinter, (files) => installMy3DPrinter(context.api, files));
  context.registerInstaller(MYAPPEARANCES_ID, 37, testMyAppearances, (files) => installMyAppearances(context.api, files));
  context.registerInstaller(ANIMATIONS_ID, 38, testAnimations, (files) => installAnimations(context.api, files)); 
  context.registerInstaller(TEXTURES_ID, 39, testTextures, (files) => installTextures(context.api, files)); 
  //Others
  context.registerInstaller(ROOT_ID, 40, testRoot, (files) => installRoot(context.api, files));
  context.registerInstaller(CONFIG_ID, 41, testConfig, (files) => installConfig(context.api, files));
  context.registerInstaller(SAVE_ID, 42, testSave, (files) => installSave(context.api, files));
  context.registerInstaller(BINARIES_ID, 43, testBinaries, (files) => installBinaries(context.api, files));

  //register buttons to open folders
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open MODKit Mods Folder (Documents)', () => {
    const openPath = UE5KITMOD_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open MODKit Folder (Epic)', () => {
    const openPath = getModKitPath;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Legacy Pak Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, PAK_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Binaries Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, BINARIES_PATH);
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder (Local AppData)', () => {
    const openPath = CONFIG_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder (Documents)', () => {
    const openPath = SAVE_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open inZOI Documents Folder', () => {
    const openPath = DOCS_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download UE4SS', () => {
    downloadUe4ss(context.api, gameSpec);
    //downloadUe4ssNexus(context.api, gameSpec);
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

//Main function
function main(context) {
  UNREALEXTENSION(context);
  applyGame(context, spec);
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
        context.api.translate(`Drag and drop the mods on the left to change the order in which they load. ${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes`
          + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here.\n'
          + '\n'
          + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.\n'
          + '\n'
          + 'NOTE: This Load Order is for legacy Pak mods only (not mods made with the MODKit).\n'),
    });
  } //*/

  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const state = context.api.getState();
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(state, GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return didDeploy(context.api);
    });
  });
  return true;
}

async function didDeploy(api) { //run on mod purge
  //await setModkitModsEnabled(api);
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
