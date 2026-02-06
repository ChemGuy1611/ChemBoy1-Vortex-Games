/*///////////////////////////////////////////
Name: Middle-earth: Shadow of War Vortex Extension
Structure: Mod Loaders + Mods folder w/ LO support
Author: ChemBoy1
Version: 2.2.1
Date: 2026-01-29
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
const GAME_ID = "middleearthshadowofwar";
const STEAMAPP_ID = "356190";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = "1324471032";
const XBOXAPP_ID = "WarnerBros.Interactive.WB-Kraken";  //Xbox NOT supported due to folder permissions
const XBOXEXECNAME = "Kraken.D3D11.C";
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, GOGAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Middle-earth: Shadow of War";
const GAME_NAME_SHORT = "Shadow of War";
const BINARIES_PATH = 'x64';
const EXEC_NAME = "ShadowOfWar.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const EXEC_GOG = EXEC; //matching exes
const EXEC_XBOX = 'gamelaunchhelper.exe';
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Middle-earth:_Shadow_of_War";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/375"; //Nexus link to this extension. Used for links

const LOAD_ORDER_ENABLED = true;
const ROOT_FOLDERS = ['game', 'x64'];
const DATA_FOLDER = path.join('WB Games', 'Shadow of War');
const CONFIGMOD_LOCATION = LOCALAPPDATA;

let GAME_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';
let dllLoaderInstalled = false;
let modLoaderInstalled = false;

const MOD_ID = `${GAME_ID}-arch06mod`;
const MOD_NAME = ".arch06 Mod";
const MOD_PATH = "Mods";
const MOD_EXT = ".arch06";
const MOD_EXTS = [MOD_EXT];

const PLUGINS_ID = `${GAME_ID}-pluginsandpackets`;
const PLUGINS_NAME = "Plugins / Packets";
const PLUGINS_FOLDER = "plugins";
const PLUGINS_PATH = path.join(BINARIES_PATH, PLUGINS_FOLDER);
const PLUGINS_EXTS = ['.dll'];

const PACKETLOADER_FOLDER = "PacketLoader";
const PLUGINS_SUBFOLDERS = [PACKETLOADER_FOLDER];
const PACKETLOADER_SUBFOLDERS = ['Internal'];
const PLFOLDER_STRING1 = 'PLG';
const PLFOLDER_STRING2 = 'Packets';

const PACKETLOADER_ID = `${GAME_ID}-packetloader`;
const PACKETLOADER_NAME = "Packet Loader";
const PACKETLOADER_PATH = PLUGINS_PATH;
const PACKETLOADER_FILE = "ShadowOfWarPacketLoader.dll";
const PACKETLOADER_PAGE_ID = 49;
const PACKETLOADER_FILE_NO = 366;
const PACKETLOADER_INI = "PacketLoader.ini";
const PACKETLOADER_INI_PATH = path.join(PLUGINS_PATH, PACKETLOADER_FOLDER, 'Internal', PACKETLOADER_INI);

const DLLLOADER_ID = `${GAME_ID}-dllloader`;
const DLLLOADER_NAME = "DLL Loader";
const DLLLOADER_PATH = BINARIES_PATH;
const DLLLOADER_FILE = "ShadowOfWarDllLoader.dll";
const DLLLOADER_PAGE_ID = 99;
const DLLLOADER_FILE_NO = 275;

const MODLOADER_ID = `${GAME_ID}-modloader`;
const MODLOADER_NAME = "Middle-Earth-Mod-Loader";
const MODLOADER_PATH = BINARIES_PATH;
const MODLOADER_FILE = "bink2w64.dll";
const MODLOADER_MARKER = "modloader";
const MODLOADER_URL = "https://github.com/ReaperAnon/Middle-Earth-Mod-Loader/releases/download/loader/modloader.7z";
const MODLOADER_URL_ERR = "https://github.com/ReaperAnon/Middle-Earth-Mod-Loader/releases";
const REAPERMODS_URL = "https://github.com/ReaperAnon/Shadow-Of-War-Mods/releases/tag/1.0.0";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const CONFIG_ID = `${GAME_ID}-configsave`;
const CONFIG_NAME = "Config / Save";
const CONFIG_PATH = path.join(CONFIGMOD_LOCATION, DATA_FOLDER);
const CONFIG_EXTS = [".ini"];
const CONFIG_FILES = ["render.cfg"];
const SAVE_EXTS = [".sav"];

const LO_FILE = "default.archcfg";
const LO_FILE_PATH = path.join(BINARIES_PATH, LO_FILE);
const LO_MOD_EXTS = MOD_EXTS;
const LO_READ_PATH = MOD_PATH;
const LO_FILE_SPLITSTRING = "..\\Mods\\";
let LO_FILE_STARTUP = `..\\Game

; needed to support DLC content
Game

; file search order is from the bottom up
..\\UI_Assets.Arch06
..\\CoreCharacter.Arch06
..\\Monsters.Arch06
..\\Presentations.Arch06
..\\Presentations_en.Arch06
..\\Presentations_fr.Arch06
..\\Presentations_it.Arch06
..\\Presentations_de.Arch06
..\\Presentations_esla.Arch06
..\\Presentations_eses.Arch06
..\\Presentations_ptbr.Arch06
..\\Presentations_ja.Arch06
..\\BlackGates_Lighting.Arch06
..\\BlackGates.Arch06
..\\BaradDur_Lighting.Arch06
..\\BaradDur.Arch06
..\\Great_Hall_Lighting.Arch06
..\\Great_Hall.Arch06
..\\Island_Lighting.Arch06
..\\Island.Arch06
..\\MinasIthil_Lighting.Arch06
..\\MinasIthil.Arch06
..\\MtnPass_Lighting.Arch06
..\\MtnPass.Arch06
..\\snowMtn_Lighting.Arch06
..\\snowMtn.Arch06
..\\Volcano_Lighting.Arch06
..\\Volcano.Arch06
..\\Benchmark.Arch06
..\\Patch_00.Arch06
..\\Patch_00_LC.Arch06
..\\Patch_01.Arch06
..\\Patch_01_LC.Arch06
..\\Patch_02.Arch06
..\\Patch_02_LC.Arch06
..\\Patch_03.Arch06
..\\Patch_03_LC.Arch06
..\\Patch_04.Arch06
..\\Patch_04_LC.Arch06
..\\Patch_DLC1.Arch06
..\\Patch_DLC1_LC.Arch06
..\\Patch_05.Arch06
..\\Patch_05_LC.Arch06
..\\Patch_DLC2.Arch06
..\\Patch_DLC2_LC.Arch06
..\\Patch_06.Arch06
..\\Patch_06_LC.Arch06
..\\soundbundles.Arch06
..\\Patch_DLC3.Arch06
..\\Patch_DLC3_LC.Arch06
..\\TextureArrayPatch.Arch06
..\\Patch_07.Arch06
..\\Patch_07_LC.Arch06
..\\Patch_08.Arch06
..\\Patch_08_LC.Arch06
..\\Patch_DLC4.Arch06
..\\Patch_DLC4_LC.Arch06
..\\Patch_09.Arch06
..\\Patch_09_LC.Arch06
..\\Patch_10.Arch06
..\\Patch_10_LC.Arch06
..\\Patch_11.Arch06
..\\Patch_11_LC.Arch06
..\\Patch_DLC5.Arch06
..\\Patch_DLC5_LC.Arch06
..\\Patch_12.Arch06
..\\Patch_12_LC.Arch06
..\\Patch_13.Arch06
..\\Patch_13_LC.Arch06
..\\Global.Arch06
..\\HotChunk.Arch06

; DLC archives. '../' needed for steam, flat needed for UWP
..\\HighMip.Arch06
HighMip.Arch06
..\\HighMipA.Arch06
HighMipA.Arch06
..\\uhdmip.Arch06
uhdmip.Arch06
..\\uhdmip_DLC1.Arch06
uhdmip_DLC1.Arch06
..\\uhdmip_DLC2.Arch06
uhdmip_DLC2.Arch06
..\\uhdmip_DLC3.Arch06
uhdmip_DLC3.Arch06
..\\uhdmip_DLC4.Arch06
uhdmip_DLC4.Arch06
..\\uhdmipA.Arch06
uhdmipA.Arch06
`;

// for mod update to keep them in the load order and not uncheck them
let mod_update_all_profile = false;
let updatemodid = undefined;
let updating_mod = false; // used to see if it's a mod update or not
let mod_install_name = ""; // used to display the name of the currently installed mod

const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = "XXX";
const TOOL_EXEC = path.join('XXX', 'XXX.exe');

const MOD_PATH_DEFAULT = PLUGINS_PATH; //set here for backwards compatibility with old extension. Would prefer MODS_PATH
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
let MODTYPE_FOLDERS = [MOD_PATH, PLUGINS_PATH];

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
    "compatible": {
      "dinput": false,
      "enb": false,
    },
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
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", MOD_PATH)
    },
    {
      "id": PLUGINS_ID,
      "name": PLUGINS_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", PLUGINS_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", BINARIES_PATH)
    },
    {
      "id": PACKETLOADER_ID,
      "name": PACKETLOADER_NAME,
      "priority": "low",
      "targetPath": path.join("{gamePath}", PACKETLOADER_PATH)
    },
    {
      "id": DLLLOADER_ID,
      "name": DLLLOADER_NAME,
      "priority": "low",
      "targetPath": path.join("{gamePath}", DLLLOADER_PATH)
    },
    {
      "id": MODLOADER_ID,
      "name": MODLOADER_NAME,
      "priority": "low",
      "targetPath": path.join("{gamePath}", MODLOADER_PATH)
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
    //parameters: PARAMETERS,
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
  //*
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
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
//Get correct game version
async function setGameVersion(gamePath) {
  const CHECK = await statCheckAsync(gamePath, EXEC_XBOX);
  if (CHECK) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  } else {
    GAME_VERSION = 'default';
    return GAME_VERSION;
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

//Test for Dll Loader files
function testDllLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === DLLLOADER_FILE));
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

//Install Dll Loader files
function installDllLoader(files) {
  const MOD_TYPE = DLLLOADER_ID;
  const modFile = files.find(file => (path.basename(file) === DLLLOADER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
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

//Test for Middle-Earth-Mod-Loader files
function testModLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === MODLOADER_FILE));
  const isFolder = files.some(file => (path.basename(file) === MODLOADER_MARKER));
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

//Install Middle-Earth-Mod-Loader files
function installModLoader(files) {
  const MOD_TYPE = MODLOADER_ID;
  const modFile = files.find(file => (path.basename(file) === MODLOADER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
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

//Test for Packet Loader files
function testPacketLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === PACKETLOADER_FILE));
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

//Install Packet Loader files
function installPacketLoader(files) {
  const MOD_TYPE = PACKETLOADER_ID;
  const modFile = files.find(file => (path.basename(file) === PACKETLOADER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
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

//Test for mod files
function testMod(files, gameId) {
  const isMod = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install mod files
function installMod(files) {
  const MOD_TYPE = MOD_ID;
  const modFile = files.find(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  //set a mod attribute to find the mod name in deserializeLoadOrder
  const ARCH06_FILES = files.filter(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  const MOD_ATTRIBUTE = {
    type: 'attribute',
    key: 'arch06Files',
    value: ARCH06_FILES,
  };

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
  instructions.push(MOD_ATTRIBUTE);
  return Promise.resolve({ instructions });
}

//Test for plugins mod files
function testPlugins(files, gameId) {
  const isDll = files.some(file => PLUGINS_EXTS.includes(path.extname(file).toLowerCase()));
  const isSub = files.some(file => PLUGINS_SUBFOLDERS.includes(path.basename(file)));
  const isPacket = files.some(file => PACKETLOADER_SUBFOLDERS.includes(path.basename(file)));
  const isString = files.some(file => (
    path.basename(file).includes(PLFOLDER_STRING1) &&
    path.basename(file).includes(PLFOLDER_STRING2)
  ));
  let supported = (gameId === spec.game.id) && (isDll || isSub || isPacket || isString);

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

//Install plugins mod files
function installPlugins(files) {
  const MOD_TYPE = PLUGINS_ID;

  let FOLDERS = '';
  let modFile = files.find(file => PLUGINS_EXTS.includes(path.extname(file).toLowerCase()));
  if (modFile === undefined) {
    modFile = files.find(file => PLUGINS_SUBFOLDERS.includes(path.basename(file)));
  }
  if (modFile === undefined) {
    modFile = files.find(file => PACKETLOADER_SUBFOLDERS.includes(path.basename(file)));
    FOLDERS = PACKETLOADER_FOLDER;
  }
  if (modFile === undefined) {
    modFile = files.find(file => (
      path.basename(file).includes(PLFOLDER_STRING1) &&
      path.basename(file).includes(PLFOLDER_STRING2)
    ));
    FOLDERS = PACKETLOADER_FOLDER;
  }

  const idx = modFile.indexOf(path.basename(modFile));
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
      destination: path.join(FOLDERS, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
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
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
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



//Fallback installer to default folder
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

//Fallback installer to default folder
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
  const NOTIF_ID = `${GAME_ID}-fallbackinstaller-notify`;
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
            text: `\n`
                + `The mod you just installed reached the fallback installer. This means Vortex could not determine where to place these mod files.\n`
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
            //*
            { label: `Open Nexus Mods Page`, action: () => {
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

// AUTOMATIC DOWNLOADER FUNCTIONS //////////////////////////////////////////////

//Check if Dll Loader is installed
function isDllLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === DLLLOADER_ID);
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      fs.statSync(path.join(GAME_PATH, BINARIES_PATH, DLLLOADER_FILE));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//Check if Packet Loader is installed
function isPacketLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === PACKETLOADER_ID);
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      fs.statSync(path.join(GAME_PATH, PLUGINS_PATH, PACKETLOADER_FILE));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//Check if Middle-Earth-Mod-Loader is installed
function isModLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === MODLOADER_ID);
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      fs.statSync(path.join(GAME_PATH, BINARIES_PATH, MODLOADER_MARKER));
      test = true;
    } catch (err) {
      test = false;
    }
  }
  return test;
}

//* Function to auto-download DLL Loader from Nexus Mods
async function downloadDllLoader(api, gameSpec) {
  let isInstalled = isDllLoaderInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = DLLLOADER_NAME;
    const MOD_TYPE = DLLLOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = DLLLOADER_PAGE_ID;
    const FILE_ID = DLLLOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
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
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
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
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download Packet Loader from Nexus Mods
async function downloadPacketLoader(api, gameSpec) {
  let isInstalled = isPacketLoaderInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = PACKETLOADER_NAME;
    const MOD_TYPE = PACKETLOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = PACKETLOADER_PAGE_ID;
    const FILE_ID = PACKETLOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
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
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
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
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download Middle-Earth-Mod-Loader from GitHub
async function downloadModLoader(api, gameSpec) {
  let isInstalled = isModLoaderInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MODLOADER_NAME;
    const MOD_TYPE = MODLOADER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = MODLOADER_URL;
    const ERR_URL = MODLOADER_URL_ERR;
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
  }
} //*/

// LOAD ORDER FUNCTIONS /////////////////////////////////////////////////////////

//remove load order list from default.archcfg on purge
async function clearModOrder(api) {
  let gameDir = getDiscoveryPath(api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  let loadOrderPath = path.join(gameDir, LO_FILE_PATH);
  return fs.writeFileAsync(
    loadOrderPath,
    LO_FILE_STARTUP,
    { encoding: "utf8" },
  );
}

async function deserializeLoadOrder(context) {
  //* on mod update for all profile it would cause the mod if it was selected to be unselected
  if (mod_update_all_profile) {
    let allMods = Array("mod_update");

    return allMods.map((modId) => {
      return {
        id: "mod update in progress, please wait. Refresh when finished. \n To avoid this wait, only update current profile",
        modId: modId,
        enabled: false,
      };
    });
  } //*/

  //Set basic information for load order paths and data
  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const mods = util.getSafe(context.api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  let modFolderPath = path.join(gameDir, MOD_PATH);
  let loadOrderPath = path.join(gameDir, LO_FILE_PATH);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let loadOrderSplit = loadOrderFile.split(LO_FILE_SPLITSTRING);
  let MOD_ENTRIES = loadOrderSplit.slice(1);
  MOD_ENTRIES = MOD_ENTRIES.map(entry => entry.split('\n')[0]);
  let LO_MOD_ARRAY = MOD_ENTRIES
  .map(entry => entry.replace(LO_FILE_SPLITSTRING, ''));
  //log('warn', `LO_MOD_ARRAY: ${LO_MOD_ARRAY.join(', ')}`);
  
  //Get all .arch06 files from mods folder
  let modFiles = [];
  try {
    modFiles = await fs.readdirAsync(modFolderPath);
    modFiles = modFiles.filter((file) => MOD_EXTS.includes(path.extname(file).toLowerCase()));
    modFiles = modFiles.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read .arch06 "Mods" folder'));
  }

  // Get readable mod name using attribute from mod installer
  async function getModName(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['arch06Files'], '').includes(file))); //find mod that includes the .arch06 file
      if (modMatch) {
        return modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
      }
      return file;
    } catch (err) {
      return file;
    }
  }

  // Get Vortex mod id using attribute from mod installer
  async function getModId(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['arch06Files'], '').includes(file))); //find mod that includes the .arch06 file
      if (modMatch) {
        return modMatch.id;
      }
      return undefined;
    } catch (err) {
      return undefined;
    }
  }

  //Set load order
  let loadOrder = await LO_MOD_ARRAY
    .reduce(async (accumP, entry) => {
      const accum = await accumP;
      const file = entry;
      if (!modFiles.includes(file)) {
        return Promise.resolve(accum);
      }
      accum.push(
      {
        id: file,
        name: `${file.replace(MOD_EXT, '')} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: true,
      }
      );
      return Promise.resolve(accum);
    }, Promise.resolve([]));
  
  //push new mods to loadOrder
  for (let file of modFiles) {
    if (!loadOrder.find((mod) => (mod.id === file))) {
      loadOrder.push({
        id: file,
        name: `${file.replace(MOD_EXT, '')} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: true,
      });
    }
  }

  return loadOrder;
}

function modToTemplate(mod) {
  return `..\\Mods\\${mod}
Mods\\${mod}`;
}

//Write load order to files
async function serializeLoadOrder(context, loadOrder) {
  //* don't write if all profiles are being updated
  if (mod_update_all_profile) {
    return;
  } //*/

  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  let loadOrderPath = path.join(gameDir, LO_FILE_PATH);

  let loadOrderMapped = loadOrder
    .map((mod) => (mod.enabled ? modToTemplate(mod.id) : ``));
  let loadOrderJoined = loadOrderMapped
    .filter((entry) => (entry !== ``))
    .join("\n");

  //write to default.archcfg file
  let loadOrderOutput = `${LO_FILE_STARTUP}` + `\n` + `${loadOrderJoined}`;
  return fs.writeFileAsync(
    loadOrderPath,
    `${loadOrderOutput}`,
    { encoding: "utf8" },
  );
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
  //GAME_VERSION = setGameVersion(GAME_PATH);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  await modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
  //await fs.ensureDirWritableAsync(CONFIG_PATH);
  try { //read contents of LO file
    const LO_FILE_READ = await fs.readFileAsync(path.join(GAME_PATH, LO_FILE_PATH), 'utf8');
    LO_FILE_STARTUP = LO_FILE_READ.split(LO_FILE_SPLITSTRING)[0];
  }
  catch (err) { //write the file if it doesn't exist
    await fs.writeFileAsync(path.join(GAME_PATH, LO_FILE_PATH), LO_FILE_STARTUP, 'utf8');
    //api.showErrorNotification('Failed to read LO file. Please verify your game files.', err, { allowReport: false });
  }
  dllLoaderInstalled = isDllLoaderInstalled(api, gameSpec);
  modLoaderInstalled = isModLoaderInstalled(api, gameSpec);
  if (!dllLoaderInstalled && !modLoaderInstalled) {
    await downloadDllLoader(api, gameSpec);
    //await downloadModLoader(api, gameSpec);
  }
  return downloadPacketLoader(api, gameSpec);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = { //register game
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
  };
  context.registerGame(game);

  //register Load Order
  if (LOAD_ORDER_ENABLED) {
    context.registerLoadOrder({
      gameId: GAME_ID,
      validate: async () => Promise.resolve(undefined), // no validation implemented yet
      deserializeLoadOrder: async () => await deserializeLoadOrder(context),
      serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
      toggleableEntries: true,
      usageInstructions:`Drag and drop the mods on the left to change the order in which they load.   \n`
                        +`${GAME_NAME} loads mods in the order you set from top to bottom.   \n`
                        +`\n`,
    });
  }

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
  ); //*/
  
  //register mod installers
  context.registerInstaller(PACKETLOADER_ID, 25, testPacketLoader, installPacketLoader);
  context.registerInstaller(DLLLOADER_ID, 27, testDllLoader, installDllLoader);
  context.registerInstaller(MODLOADER_ID, 29, testModLoader, installModLoader);
  context.registerInstaller(MOD_ID, 29, testMod, installMod);
  context.registerInstaller(PLUGINS_ID, 31, testPlugins, installPlugins);
  context.registerInstaller(ROOT_ID, 33, testRoot, installRoot);
  //context.registerInstaller(CONFIG_ID, 43, testConfig, installConfig);
  context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open default.archcfg File', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, LO_FILE_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Open ${PACKETLOADER_INI}`, () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, PACKETLOADER_INI_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config / Save Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Middle-Earth-Mod-Loader', () => {
    downloadModLoader(context.api, spec).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Get MEML Mods (GitHub)', () => {
    util.opn(REAPERMODS_URL).catch(() => null);
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    util.opn(DOWNLOAD_FOLDER).catch(() => null);
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
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-purge', (profileId) => didPurge(context.api, profileId)); //*/
    context.api.onAsync("did-deploy", (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      dllLoaderInstalled = isDllLoaderInstalled(context.api, spec);
      modLoaderInstalled = isModLoaderInstalled(context.api, spec);
      if (!dllLoaderInstalled && !modLoaderInstalled) {
        downloadDllLoader(context.api, spec);
        //downloadModLoader(context.api, spec);
      }
      mod_update_all_profile = false;
      updating_mod = false;
      updatemodid = undefined;
    });
    context.api.events.on("mod-update", (gameId, modId, fileId) => {
      if (GAME_ID == gameId) {
        updatemodid = modId;
      }
    });
    context.api.events.on("remove-mod", (gameMode, modId) => {
      if (modId.includes("-" + updatemodid + "-")) {
        mod_update_all_profile = true;
      }
    });
    context.api.events.on("will-install-mod", (gameId, archiveId, modId) => {
      mod_install_name = modId.split("-")[0];
      if (GAME_ID == gameId && modId.includes("-" + updatemodid + "-")) {
        updating_mod = true;
      } else {
        updating_mod = false;
      }
    }); //*/
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
  /* No need to run on purge
  dllLoaderInstalled = isDllLoaderInstalled(api, spec);
  modLoaderInstalled = isModLoaderInstalled(api, spec);
  if (!dllLoaderInstalled && !modLoaderInstalled) {
    downloadDllLoader(api, spec);
    //downloadModLoader(api, spec);
  } //*/
  clearModOrder(api);
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
