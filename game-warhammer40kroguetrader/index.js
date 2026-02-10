/*///////////////////////////////////////////
Name: Warhammer 40,000: Rogue Trader Vortex Extension
Structure: Game with Integrated Mod Loader (UnityModManager)
Author: ChemBoy1
Version: 0.1.2
Date: 2025-01-21
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');
//const winapi = require('winapi-bindings');
//const turbowalk = require('turbowalk');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');

const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "warhammer40kroguetrader";
const STEAMAPP_ID = "2186680";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = "XXX"; //NOT on egdata.app yet
const GOGAPP_ID = "1347700224";
const XBOXAPP_ID = "OwlcatGames.3387926822CE4";
const XBOXEXECNAME = "Game";
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, GOGAPP_ID, XBOXAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Warhammer 40,000: Rogue Trader";
const GAME_NAME_SHORT = "WH40K Rogue Trader";
const EXEC = "WH40KRT.exe";
const EXEC_GOG = EXEC;
const EXEC_EGS = EXEC;
const EXEC_XBOX = 'gamelaunchhelper.exe';
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Warhammer_40,000:_Rogue_Trader";

const LOAD_ORDER_ENABLED = true;
const debug = true;

const DATA_FOLDER = path.join(USER_HOME, 'AppData', 'LocalLow', 'Owlcat Games', 'Warhammer 40000 Rogue Trader');
const ROOT_FOLDERS = ['']; //not using root installer

let GAME_PATH = '';
let GAME_VERSION = 'default';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

const PLUGIN_ID = `${GAME_ID}-plugin`;
const PLUGIN_NAME = "Plugin (UnityModManager)";
const PLUGIN_FOLDERNAME = 'UnityModManager';
const PLUGIN_PATH = path.join(DATA_FOLDER, PLUGIN_FOLDERNAME);
const PLUGIN_EXTS = ['.dll'];
const PLUGIN_IGNORE_NAMES = ['0Harmony'];

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Owlcat Mod";
const MOD_FOLDERNAME = 'Modifications';
const MOD_PATH = path.join(DATA_FOLDER, MOD_FOLDERNAME);
const MOD_MANIFEST = 'owlcatmodificationmanifest.json';
const MOD_FILES = [MOD_MANIFEST];
const MOD_FOLDERS = ['Assemblies', 'Blueprints', 'Bundles', 'Localization'];
const BUNDLE_STRING_1 = '_content';
const BUNDLE_STRING_2 = '_BlueprintDirectReferences';
const BUNDLE_STRINGS = [BUNDLE_STRING_1, BUNDLE_STRING_2];

const PORTRAIT_ID = `${GAME_ID}-portrait`;
const PORTRAIT_NAME = "Portraits";
const PORTRAIT_FOLDERNAME = 'Portraits';
const PORTRAIT_PATH = path.join(DATA_FOLDER, PORTRAIT_FOLDERNAME);
const PORTRAIT_EXTS = ['.png'];
const PORTRAIT_FILES = ['fulllength.png', 'medium.png', 'small.png'];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_FOLDERNAME = '';
const CONFIG_PATH = path.join(DATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_EXTS = [".json"];
const CONFIG_FILES = ["general_settings.json"];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDERNAME = 'Saved Games';
const SAVE_PATH = path.join(DATA_FOLDER, SAVE_FOLDERNAME);
const SAVE_EXTS = [".zks"];

const SAVEEDITOR_ID = `${GAME_ID}-saveeditor`;
const SAVEEDITOR_NAME = "Arcemi Save Editor";
const SAVEEDITOR_EXEC = 'Arcemi Save Game Editor.exe';
const SAVEEDITOR_FOLDER = SAVEEDITOR_NAME;
const SAVEEDITOR_EXEC_FOLDER = path.join(DATA_FOLDER, SAVEEDITOR_FOLDER);
const SAVEEDITOR_EXEC_PATH = path.join(SAVEEDITOR_EXEC_FOLDER, SAVEEDITOR_EXEC);

const MODFINDER_ID = `${GAME_ID}-modfinder`;
const MODFINDER_NAME = "Modfinder";
const MODFINDER_EXEC = 'ModFinder.exe';
const MODFINDER_FOLDER = MODFINDER_NAME;
const MODFINDER_EXEC_FOLDER = path.join(DATA_FOLDER, MODFINDER_FOLDER);
const MODFINDER_EXEC_PATH = path.join(MODFINDER_EXEC_FOLDER, MODFINDER_EXEC);

const PORTMAN_ID = `${GAME_ID}-portraitmanager`;
const PORTMAN_NAME = "Portrait Manager";
const PORTMAN_EXEC = 'Portrait Manager Owlcat.exe';
const PORTMAN_FOLDER = PORTMAN_NAME;
const PORTMAN_EXEC_FOLDER = path.join(DATA_FOLDER, PORTMAN_FOLDER);
const PORTMAN_EXEC_PATH = path.join(PORTMAN_EXEC_FOLDER, PORTMAN_EXEC);

const LO_FILE = "OwlcatModificationManagerSettings.json";
const LO_FILE_PATH = path.join(DATA_FOLDER, LO_FILE);
const LO_FILE_EMPTY = {
  "$id": "1",
  "SourceDirectories": [],
  "EnabledModifications": [],
  "ActiveModifications": [],
  "DisabledModifications": []
};
const LO_ATTRIBUTE = "modName";
// for mod update to keep them in the load order and not uncheck them
let mod_update_all_profile = false;
let updatemodid = undefined;
let updating_mod = false; // used to see if it's a mod update or not
let mod_install_name = ""; // used to display the name of the currently installed mod

// Information for MICROPATCHES downloader and updater
const MICROPATCHES_ID = `${GAME_ID}-micropatches`;
const MICROPATCHES_NAME = "MicroPatches";
const MICROPATCHES_PATH = PLUGIN_PATH;
const MICROPATCHES_VERSION = '1.21.0';
const MICROPATCHES_ARC_NAME = `MicroPatches-Mod-${MICROPATCHES_VERSION}.zip`;
const AUTHOR = 'microsoftenator2022';
const REPO = 'MicroPatches';
const MICROPATCHES_URL = `https://github.com/${AUTHOR}/${REPO}/releases/download/v.${MICROPATCHES_VERSION}/${MICROPATCHES_ARC_NAME}`;
const MICROPATCHES_URL_API = `https://api.github.com/repos/${AUTHOR}/${REPO}`;
const MICROPATCHES_FILE = 'MicroPatches.dll'; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.

const REQUIREMENTS = [
  { //MICROPATCHESer
    archiveFileName: MICROPATCHES_ARC_NAME,
    modType: MICROPATCHES_ID,
    assemblyFileName: MICROPATCHES_FILE,
    userFacingName: MICROPATCHES_NAME,
    githubUrl: MICROPATCHES_URL_API,
    findMod: (api) => findModByFile(api, MICROPATCHES_ID, MICROPATCHES_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, MICROPATCHES_ARC_NAME),
    fileArchivePattern: new RegExp(/^MicroPatches-Mod-(\d+\.\d+\.\d+)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
  },
];

const MOD_PATH_DEFAULT = DATA_FOLDER;
const REQ_FILE = 'MonoBleedingEdge'; //cannot use exe or data folder since they are not the same on Xbox
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
let MODTYPE_FOLDERS = [PLUGIN_PATH, MOD_PATH, PORTRAIT_PATH, SAVE_PATH];

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
      "id": PLUGIN_ID,
      "name": PLUGIN_NAME,
      "priority": "high",
      "targetPath": PLUGIN_PATH
    },
    {
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": MOD_PATH
    },
    {
      "id": PORTRAIT_ID,
      "name": PORTRAIT_NAME,
      "priority": "high",
      "targetPath": PORTRAIT_PATH
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": SAVE_PATH
    },
    {
      "id": MICROPATCHES_ID,
      "name": MICROPATCHES_NAME,
      "priority": "low",
      "targetPath": MICROPATCHES_PATH
    },
    /*{
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
    }, //*/
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
  {
    id: `${GAME_ID}-customlaunchxbox`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC_XBOX,
    requiredFiles: [
      EXEC_XBOX,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
  {
    id: SAVEEDITOR_ID,
    name: SAVEEDITOR_NAME,
    logo: 'saveeditor.png',
    queryPath: () => SAVEEDITOR_EXEC_FOLDER,
    executable: () => SAVEEDITOR_EXEC,
    requiredFiles: [
      SAVEEDITOR_EXEC,
    ],
    relative: false,
    exclusive: true,
    //shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
  {
    id: PORTMAN_ID,
    name: PORTMAN_NAME,
    logo: 'portman.png',
    queryPath: () => PORTMAN_EXEC_FOLDER,
    executable: () => PORTMAN_EXEC,
    requiredFiles: [
      PORTMAN_EXEC,
    ],
    relative: false,
    exclusive: true,
    //shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
  {
    id: MODFINDER_ID,
    name: MODFINDER_NAME,
    logo: 'modfinder.png',
    queryPath: () => MODFINDER_EXEC_FOLDER,
    executable: () => MODFINDER_EXEC,
    requiredFiles: [
      MODFINDER_EXEC,
    ],
    relative: false,
    exclusive: true,
    //shell: true,
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
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return EXEC_XBOX;
  };
  GAME_VERSION = 'default';
  return EXEC;
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

//Test for .dll plugin mod files
function testMicroPatches(files, gameId) {
  const isMod = files.some(file => path.basename(file) === MICROPATCHES_FILE);
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

//Install .dll plugin mod files
function installMicroPatches(files) {
  const MOD_TYPE = MICROPATCHES_ID;
  const modFile = files.find(file => path.basename(file) === MICROPATCHES_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
 
  folder = path.basename(modFile, PLUGIN_EXTS[0]);

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

//Test for Modfinder
function testModFinder(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === MODFINDER_EXEC.toLowerCase()));
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

//Install Modfinder
function installModFinder(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MODFINDER_EXEC.toLowerCase()));
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
      destination: path.join(MODFINDER_FOLDER, file.substr(idx)),
    };
  });
  return Promise.resolve({ instructions });
}

//Test for Save Editor
function testSaveEditor(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === SAVEEDITOR_EXEC.toLowerCase()));
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

//Install Save Editor
function installSaveEditor(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === SAVEEDITOR_EXEC.toLowerCase()));
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
      destination: path.join(SAVEEDITOR_FOLDER, file.substr(idx)),
    };
  });
  return Promise.resolve({ instructions });
}

//Test for Save Editor
function testPortraitManager(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === PORTMAN_EXEC.toLowerCase()));
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

//Install Save Editor
function installPortraitManager(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === PORTMAN_EXEC.toLowerCase()));
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
      destination: path.join(PORTMAN_FOLDER, file.substr(idx)),
    };
  });
  return Promise.resolve({ instructions });
}

//Test for .dll plugin mod files
function testPlugin(files, gameId) {
  const isMod = files.some(file => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install .dll plugin mod files
function installPlugin(files) {
  const MOD_TYPE = PLUGIN_ID;
  const modFile = files.find(file => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
 
  let folder = path.basename(modFile, PLUGIN_EXTS[0]);
  if (PLUGIN_IGNORE_NAMES.includes(folder)) {
    const file = files.find(file => ( PLUGIN_EXTS.includes(path.extname(file).toLowerCase()) && !PLUGIN_IGNORE_NAMES.includes(path.basename(file, PLUGIN_EXTS[0])) ));
    if (file === undefined) {
      folder = '' //don't use a top level folder if only ignored dll names are present
    } else {
      folder = path.basename(file, PLUGIN_EXTS[0]);
    }
  }

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

//Test for mod files
function testMod(files, gameId) {
  const isMod = files.some(file => MOD_FILES.includes(path.basename(file).toLowerCase()));
  const isFolder = files.some(file => MOD_FOLDERS.includes(path.basename(file)));
  const dll = files.find(file => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
  let dllInRoot = false;
  if (dll !== undefined) {
    dllInRoot = !dll.includes('Assemblies');
  }
  let supported = (gameId === spec.game.id) && isMod && isFolder && !dllInRoot;

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
function installMod(files, workingDir) {
  const MOD_TYPE = MOD_ID;
  let modFile = files.find(file => MOD_FILES.includes(path.basename(file).toLowerCase()));
  let idx = modFile.indexOf(path.basename(modFile));
  let rootPath = path.dirname(modFile); //this is often "." because mods are frequently not in top-level folders
  const ROOT_PATH = path.basename(rootPath);
  let filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  ); //*/
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
 
  //read manifest to get uniqueName and set folder name
  //const manifest = files.find(file => (path.basename(file).toLowerCase() === MOD_MANIFEST.toLowerCase()));
  const manifest = modFile;
  const MOD_NAME = path.basename(workingDir, '.installing');
  let folder = MOD_NAME;
  let nameFolder = undefined;
  try {
    const contents = fs.readFileSync(path.join(workingDir, manifest));
    const json = JSON.parse(contents);
    folder = json.UniqueName;
    //* index on the folder with the uniqueName if it is in the archive
    nameFolder = files.find(file => (path.basename(file) === folder));
    if (nameFolder !== undefined) {
      modFile = nameFolder;
      //idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
      idx = modFile.indexOf(path.basename(modFile));
      folder = '';
    } //*/
  } catch (err) {
    api.showErrorNotification(`Could not read mod ${MOD_MANIFEST} file to get ${MOD_NAME} name. Mod files are likely corrupted.`, err, { allowReport: false });
  } //*/
  
  //attribute for use in load order
  const MOD_ATTRIBUTE = {
    type: 'attribute',
    key: LO_ATTRIBUTE,
    value: folder,
  };

  /* normal filtering - cannot do this if the rootPath is "." as it will remove the "Bundles" files without extensions
  filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  ); //*/
  let instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      //destination: file,
      //destination: file.substr(idx),
      destination: path.join(folder, file.substr(idx)),
    };
  });
  /* if the mod is not in a top-level folder, we need to add the folder name to the destination
  if (ROOT_PATH !== '.') {
    instructions = filtered.map(file => {
      return {
        type: 'copy',
        source: file,
        //destination: file,
        destination: path.join(folder, file.substr(idx)),
      };
    });
  } //*/
  instructions.push(setModTypeInstruction);
  instructions.push(MOD_ATTRIBUTE);
  return Promise.resolve({ instructions });
}

//Test for portrait .png files
function testPortrait(files, gameId) {
  const isMod = files.some(file => PORTRAIT_FILES.includes(path.basename(file).toLowerCase()));
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

//Install portrait .png files
function installPortrait(files) {
  const MOD_TYPE = PORTRAIT_ID;
  let modFile = files.find(file => PORTRAIT_FILES.includes(path.basename(file).toLowerCase()));
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  let rootPath = path.dirname(modFile);
  const ROOT_PATH = path.basename(rootPath);
  if (ROOT_PATH !== '.') {
    modFile = rootPath; //make the folder the targeted modFile so we can grab any other folders also in its directory
    rootPath = path.dirname(modFile);
    /*const indexFolder = path.basename(modFile); //index to catch other folders in the same directory
    //idx = modFile.indexOf(`${indexFolder}${path.sep}`); //*/ //index on the folder with path separator
  }
  const idx = modFile.indexOf(path.basename(modFile));

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

//Test for .zks save mod files
function testSave(files, gameId) {
  const isMod = files.some(file => SAVE_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install .zks save mod files
function installSave(files) {
  const MOD_TYPE = SAVE_ID;
  const modFile = files.find(file => SAVE_EXTS.includes(path.extname(file).toLowerCase()));
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

//Fallback installer to Binaries folder
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

//Fallback installer to Binaries folder
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

// GITHUB AUTOMATIC DOWNLOAD FUNCTIONS /////////////////////////////////////////////////

async function asyncForEachTestVersion(api, requirements) {
  for (let index = 0; index < requirements.length; index++) {
    await testRequirementVersion(api, requirements[index]);
  }
}

async function asyncForEachCheck(api, requirements) {
  let mod = [];
  for (let index = 0; index < requirements.length; index++) {
    mod[index] = await requirements[index].findMod(api);
  }
  let checker = mod.every((entry) => entry === true);
  return checker;
}

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await asyncForEachTestVersion(api, REQUIREMENTS);
    log('warn', 'Checked requirements versions');
  } catch (err) {
    log('warn', `failed to test requirements versions: ${err}`);
  }
}

async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
}

// LOAD ORDER FUNCTIONS /////////////////////////////////////////////////////////

//remove load order list from default.archcfg on purge
async function clearModOrder(api) {
  return fs.writeFileAsync(
    LO_FILE_PATH,
    JSON.stringify(LO_FILE_EMPTY, null, 2),
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
  const mods = util.getSafe(context.api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  let modFolderPath = MOD_PATH;
  let loadOrderPath = LO_FILE_PATH;
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let json = JSON.parse(loadOrderFile);
  let LO_MOD_ARRAY = json.EnabledModifications;
  let disabled = json.DisabledModifications;
  LO_MOD_ARRAY = LO_MOD_ARRAY.concat(disabled);
  if (debug) {
    log('warn', `LO_MOD_ARRAY: ${LO_MOD_ARRAY.join(', ')}`);
  }
  
  //Get all mod files from mods folder
  let modFolders = [];
  try {
    modFolders = await fs.readdirAsync(modFolderPath);
    modFolders = modFolders.filter((file) => isDir(modFolderPath, file));
    modFolders = modFolders.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read "Modifications" folder'));
  }

  //Determine if mod is managed by Vortex (async version)
  const isVortexManaged = async (modId) => {
    return fs.statAsync(path.join(modFolderPath, modId, `__folder_managed_by_vortex`))
      .then(() => true)
      .catch(() => false)
  };
  
  // Get readable mod name using attribute from mod installer
  async function getModName(folder) {
    const VORTEX = await isVortexManaged(folder);
    if (!VORTEX) {
      return ('Manual Mod');
    }
    try {//Mod installed by Vortex, find mod where atrribute (from installer) matches folder in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, [LO_ATTRIBUTE], '') === folder));
      if (modMatch) {
        return modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
      }
      return folder;
    } catch (err) {
      return folder;
    }
  }

  // Get Vortex mod id using attribute from mod installer
  async function getModId(folder) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, [LO_ATTRIBUTE], '').includes(folder))); //find mod that includes the .arch06 file
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
      const folder = entry;
      if (!modFolders.includes(folder)) {
        return Promise.resolve(accum);
      }
      accum.push(
        {
          id: folder,
          name: `${await getModName(folder)} (${folder})`,
          modId: await isVortexManaged(folder) ? folder : undefined,
          enabled: !disabled.includes(folder),
        }
      );
      return Promise.resolve(accum);
    }, Promise.resolve([]));
  
  //push new mods to loadOrder
  for (let folder of modFolders) {
    if (!loadOrder.find((mod) => (mod.id === folder))) {
      loadOrder.push({
        id: folder,
        name: `${await getModName(folder)} (${folder})`,
        modId: await isVortexManaged(folder) ? folder : undefined,
        enabled: true,
      });
    }
  }

  return loadOrder;
}

//Write load order to files
async function serializeLoadOrder(context, loadOrder) {
  //* don't write if all profiles are being updated
  if (mod_update_all_profile) {
    return;
  } //*/

  let loadOrderPath = LO_FILE_PATH;
  let loadOrderMapped = loadOrder
    .map((mod) => (mod.enabled ? mod.id : ``))
    .filter((mod) => (mod !== ``))
  let disabled = loadOrder
    .map((mod) => (mod.enabled ? `` : mod.id))
    .filter((mod) => (mod !== ``));
  let contents = await fs.readFileAsync(loadOrderPath, 'utf8');
  let json = JSON.parse(contents);
  json.EnabledModifications = loadOrderMapped;
  json.ActiveModifications = loadOrderMapped; //??? Not sure if this needs to include disabled
  json.DisabledModifications = disabled;

  //write to OwlcatModificationManagerSettings.json file
  let loadOrderOutput = JSON.stringify(json, null, 2);
  return fs.writeFileAsync(
    loadOrderPath,
    loadOrderOutput,
    { encoding: "utf8" },
  );
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

function portraitsNotify(api) {
  const NOTIF_ID = `${GAME_ID}-xboxportraits-notify`;
  const MESSAGE = 'Portrait Mods Don\'t Work on Xbox Version';
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
                + `Vortex detected that you are using the Xbox version of ${GAME_NAME}.\n`
                + `Please note that custom Portraits mods do not work on the Xbox version of the game.\n`
                + `This is a limitation of the game itself, and cannot be fixed by the extension developer.\n`
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
  else { // use exe. Note this just returns the Unity Engine version right now
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

async function modFoldersEnsureWritable(paths) {
  for (let index = 0; index < paths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(paths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  GAME_VERSION = await setGameVersion(GAME_PATH);
  if (GAME_VERSION === 'xbox') {
    portraitsNotify(api);
  }
  if (LOAD_ORDER_ENABLED) {
    try {
      await fs.statAsync(LO_FILE_PATH);
      let contents = await fs.readFileAsync(LO_FILE_PATH, 'utf8');
      let json = JSON.parse(contents);
      if (json.EnabledModifications === undefined) {
        await fs.writeFileAsync(
          LO_FILE_PATH,
          JSON.stringify(LO_FILE_EMPTY, null, 2),
          { encoding: "utf8" },
        );
      }
    } catch (err) {
      await fs.writeFileAsync(
        LO_FILE_PATH,
        JSON.stringify(LO_FILE_EMPTY, null, 2),
        { encoding: "utf8" },
      );
    }
  }
  const requirementsInstalled = await checkForRequirements(api);
  if (!requirementsInstalled) {
    await download(api, REQUIREMENTS);
  }
  return modFoldersEnsureWritable(MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = { //register game
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
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

  //register mod installers
  context.registerInstaller(MICROPATCHES_ID, 25, testMicroPatches, installMicroPatches);
  context.registerInstaller(MODFINDER_ID, 27, testModFinder, installModFinder);
  context.registerInstaller(SAVEEDITOR_ID, 28, testSaveEditor, installSaveEditor);
  context.registerInstaller(PORTMAN_ID, 29, testPortraitManager, installPortraitManager);
  context.registerInstaller(MOD_ID, 31, testMod, installMod);
  context.registerInstaller(PLUGIN_ID, 33, testPlugin, installPlugin);
  context.registerInstaller(PORTRAIT_ID, 35, testPortrait, installPortrait);
  context.registerInstaller(SAVE_ID, 47, testSave, installSave);
  context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open OwlcatModificationManagerSettings.json File', () => {
    util.opn(LO_FILE_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Owlcat Mod Folder', () => {
    util.opn(MOD_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open UMM Plugin Folder', () => {
    util.opn(PLUGIN_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Portraits Folder', () => {
    util.opn(PORTRAIT_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
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
    context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(context.api, gameId, mods, forced);
    }); //*/
    context.api.onAsync('did-purge', (profileId) => didPurge(context.api, profileId)); //*/
    context.api.onAsync("did-deploy", (profileId) => {
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
  clearModOrder(api);
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
