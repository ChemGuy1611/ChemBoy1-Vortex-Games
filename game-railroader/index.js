/*//////////////////////////////////////////
Name: Railroader Vortex Extension
Structure: Unity UMM (Unity Mod Manager)
Author: ChemBoy1
Version: 1.0.0
Date: 2026-08-24
Notes:
- First UMM implementation.
//////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');
const { parseStringPromise, Builder } = require('xml2js');

// -- START EDIT ZONE -- ///////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow');
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "railroader";
const STEAMAPP_ID = "1683150";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const XBOX_PUB_ID = 'XXX'; //string after "ID_"
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "Railroader";
const GAME_NAME_SHORT = "Railroader";
const GAME_STRING = "Railroader"; //string for exe and data folder (seem to always match)
const GAME_STRING_ALT = "Railroader"; //
const EXEC = `${GAME_STRING}.exe`;
const EXEC_EGS = EXEC;
const EXEC_GOG = EXEC;
const EXEC_XBOX = 'gamelaunchhelper.exe';
const EXEC_ALT = EXEC_XBOX; //or `${GAME_STRING_ALT}.exe`
const PCGAMINGWIKI_URL = "https://railroader.fandom.com/wiki/Railroader_Wiki";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/2206"; //Nexus link to this extension. Used for links

//UMM specific
const UMM_GAME_NAME = 'Railroader'; //selects the <GameInfo Name="..."> block in UMM's config

//feature toggles
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
let hasXbox = false; //toggle for Xbox version logic
if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;
const multiExe = false; //set to true if there are multiple executables (and conseq. DATA_FOLDERs) (typically for Xbox/EGS)
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const autoDownloadUmm = true; //download Unity Mod Manager from Nexus during setup
const railloaderSupport = true; //install Railloader mods, and a user-supplied Railloader archive
const seedUmmParams = true; //pre-seed UMM's Params.xml and registry values so the tool opens pointed at this game
const hasVersionFile = true; //toggle for version file. Set to false if game doesn't have
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const debug = false; //toggle for debug mode

const DATA_FOLDER_DEFAULT = `${GAME_STRING}_Data`;
let DATA_FOLDER = DATA_FOLDER_DEFAULT;
const ALT_VERSION = 'xbox';
const DATA_FOLDER_ALT = `${GAME_STRING_ALT}_Data`; //don't always match
const ROOT_FOLDERS = [DATA_FOLDER, DATA_FOLDER_ALT];
const VERSION_FILE = path.join('StreamingAssets', 'app.info');
let VERSION_FILE_PATH = path.join(DATA_FOLDER, VERSION_FILE);

const DEV_REGSTRING = "Giraffe Lab LLC";
const GAME_REGSTRING = "Railroader";

const UNITY_ARCH = 'x64'; // 'x64' or 'x86'
const UNITY_BUILD = 'mono'; // 'il2cpp' or 'mono' - IL2CPP will use bleeding edge builds

// -- END EDIT ZONE -- /////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let GAME_VERSION = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//modtypes
const UMM_ID = `${GAME_ID}-umm`;
const UMM_NAME = "Unity Mod Manager";
const UMM_FOLDER = 'UnityModManagerInstaller';
const UMM_INST_EXEC = 'UnityModManager.exe';
const UMM_INST_PATH = path.join(UMM_FOLDER, UMM_INST_EXEC);
const UMM_DOMAIN = 'site'; //UMM is only distributed on Nexus, there are no GitHub releases
const UMM_PAGE_NO = 21;
const UMM_FILE_NO = 9047; //fallback file id if the Nexus file list can not be read
const UMM_MANAGER_FOLDER = 'UnityModManager'; //subfolder UMM's libraries are installed into
const UMM_CONFIG_FILE = 'UnityModManagerConfig.xml'; //shipped list of supported games
const UMM_CONFIG_OUT = 'Config.xml'; //per-game config UMM reads at runtime
const UMM_DOORSTOP_INI = 'doorstop_config.ini';
const UMM_DOORSTOP_DLL = 'winhttp.dll';
const UMM_DOORSTOP_SRC = `winhttp_${UNITY_ARCH}.dll`;
const UMM_MANAGER_DLL = 'UnityModManager.dll';
const UMM_HARMONY_DLL = '0Harmony.dll';
const UMM_HARMONY_22 = path.join('Harmony', '2.2', UMM_HARMONY_DLL);
const UMM_XML_DLL = 'System.Xml.dll';
const UMM_MANAGER_FILES = [UMM_HARMONY_DLL, 'dnlib.dll', UMM_MANAGER_DLL, 'UnityModManager.xml'];
const UMM_PARAMS_FOLDER = path.join(LOCALAPPDATA, 'UnityModManagerNet');
const UMM_PARAMS_FILE = path.join(UMM_PARAMS_FOLDER, 'Params.xml');
const UMM_REG_HIVE = 'HKEY_CURRENT_USER';
const UMM_REG_KEY = 'Software\\UnityModManager';
let UMM_MANAGER_PATH = path.join(DATA_FOLDER, "Managed", UMM_MANAGER_FOLDER);
let UMM_MARKER = path.join(UMM_MANAGER_PATH, UMM_MANAGER_DLL);  //check if present to determine if UMM is installed

const MODS_ID = `${GAME_ID}-mods`;
const MODS_NAME = "Mod";
const MODS_FOLDER = 'Mods'; //both loaders read their mods from here
const UMM_MOD_ID = `${GAME_ID}-ummmod`;
const UMM_MOD_NAME = "UMM Mod";
const UMM_MOD_FILE = 'info.json'; //UMM's config calls it Info.json, shipped mods use lower case

const RAILLOADER_ID = `${GAME_ID}-railloader`;
const RAILLOADER_NAME = "Railloader";
const RAILLOADER_URL = 'https://railroader.stelltis.ch/';
const RAILLOADER_FILES = ['railloader.exe', 'railloader.dll']; //loader archive is unobtainable, so this list is a best guess
const RAILLOADER_MOD_ID = `${GAME_ID}-railloadermod`;
const RAILLOADER_MOD_NAME = "Railloader Mod";
const RAILLOADER_MOD_FILE = 'definition.json';

const PLUGIN_ID = `${GAME_ID}-plugin`;
const PLUGIN_NAME = "UMM Plugin";
const PLUGIN_FOLDER = 'Plugins';
const PLUGIN_EXTS = ['.dll'];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const ASSEMBLY_ID = `${GAME_ID}-assemblydll`;
const ASSEMBLY_NAME = "Assembly DLL Mod";
let ASSEMBLY_PATH = path.join(DATA_FOLDER, "Managed");
let ASSEMBLY_FILES = ["Assembly-CSharp.dll", "Assembly-CSharp-firstpass.dll"];
if (UNITY_BUILD === 'il2cpp') {
  ASSEMBLY_PATH = '.';
  ASSEMBLY_FILES = ["GameAssembly.dll"];
}

//Config and save paths
const CONFIG_HIVE = 'HKEY_CURRENT_USER';
const CONFIG_KEY = `Software\\${DEV_REGSTRING}\\${GAME_REGSTRING}`;
const CONFIG_REGPATH_FULL = `${CONFIG_HIVE}\\${CONFIG_KEY}`; //*/
//const CONFIG_PATH = path.join(LOCALLOW, DEV_REGSTRING, GAME_REGSTRING, 'Settings');
const CONFIG_FILES = ['settings.json'];
const SAVE_PATH_DEFAULT = path.join(LOCALLOW, DEV_REGSTRING, GAME_REGSTRING, 'SaveGames');
const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_PUB_ID}`, "SystemAppData", "wgs"); //XBOX Version
let SAVE_PATH = SAVE_PATH_DEFAULT;
const SAVE_FILES = ['XXX.XXX'];
const SAVE_EXTS = ['.XXX'];

const ASSETS_ID = `${GAME_ID}-assets`;
const ASSETS_NAME = "Assets/Resources File";
let ASSETS_PATH = DATA_FOLDER;
const ASSETS_EXTS = ['.assets', '.resource', '.ress'];

// -- START EDIT ZONE -- ///////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

const MOD_PATH_DEFAULT = ".";
let REQ_FILE = EXEC;
if (multiExe && (UNITY_BUILD === 'il2cpp')) {
  REQ_FILE = ASSEMBLY_FILES[0];
}
if (multiExe && (UNITY_BUILD === 'mono')) {
  REQ_FILE = ''; //find something that works in this case
}
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];
const IGNORE_CONFLICTS = [path.join('**', 'manifest.json'), path.join('**', 'icon.png'), path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'manifest.json'), path.join('**', 'icon.png'), path.join('**', 'changelog*'), path.join('**', 'readme*')];
let MODTYPE_FOLDERS = [];

// -- END EDIT ZONE -- /////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
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
      "supportsSymlinks": allowSymlinks,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
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
    id: UMM_ID,
    name: UMM_NAME,
    logo: `exec.png`,
    executable: () => UMM_INST_PATH,
    requiredFiles: [UMM_INST_PATH],
    detach: true,
    relative: true,
    exclusive: true,
    shell: false,
    parameters: [],
  }, //*/
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
    //parameters: PARAMETERS
  }, //*/
  {
    id: `${GAME_ID}-customlaunchalt`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC_ALT,
    requiredFiles: [EXEC_ALT],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS
  }, //*/
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}
async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

//Set mod type priorities
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

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
  //*
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
  if (store === 'xbox' && (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID))) {
  return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  } //*/
  if (store === 'epic' && (DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID))) {
    return Promise.resolve({
      launcher: 'epic',
      addInfo: {
        appId: EPICAPP_ID,
      },
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (!multiExe) { //return immediately if only one exe filename for all versions
    return EXEC;
  }
  if (statCheckSync(discoveryPath, EXEC_ALT)) {
    DATA_FOLDER = DATA_FOLDER_ALT;
    ASSETS_PATH = path.join(DATA_FOLDER, "Managed");
    UMM_MANAGER_PATH = path.join(DATA_FOLDER, "Managed", UMM_MANAGER_FOLDER);
    UMM_MARKER = path.join(UMM_MANAGER_PATH, UMM_MANAGER_DLL);
    if (UNITY_BUILD === 'mono') {
      ASSEMBLY_PATH = path.join(DATA_FOLDER, "Managed");
    }
    VERSION_FILE_PATH = path.join(DATA_FOLDER, VERSION_FILE);
    if (hasXbox) {
      SAVE_PATH = SAVE_PATH_XBOX;
    }
    return EXEC_ALT;
  };
  return EXEC;
}

//Get correct save folder for game version
async function getSavePath(api) {
  GAME_PATH = getDiscoveryPath(api);
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(GAME_PATH, exec));
      return true;
    }
    catch {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    SAVE_PATH = SAVE_PATH_XBOX;
    return SAVE_PATH;
  }
  else {
    SAVE_PATH = SAVE_PATH_DEFAULT;
    return SAVE_PATH;
  };
} //*/

//Get correct game version
async function setGameVersion(gamePath) {
  const CHECK = await statCheckAsync(gamePath, EXEC_ALT);
  if (CHECK) {
    GAME_VERSION = ALT_VERSION;
    DATA_FOLDER = DATA_FOLDER_ALT;
    ASSETS_PATH = path.join(DATA_FOLDER, "Managed");
    UMM_MANAGER_PATH = path.join(DATA_FOLDER, "Managed", UMM_MANAGER_FOLDER);
    UMM_MARKER = path.join(UMM_MANAGER_PATH, UMM_MANAGER_DLL);
    if (UNITY_BUILD === 'mono') {
      ASSEMBLY_PATH = path.join(DATA_FOLDER, "Managed");
    }
    VERSION_FILE_PATH = path.join(DATA_FOLDER, VERSION_FILE);
    if (hasXbox) {
      SAVE_PATH = SAVE_PATH_XBOX;
    }
    return GAME_VERSION;
  } else {
    GAME_VERSION = 'default';
    return GAME_VERSION;
  }
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

// AUTOMATIC INSTALLER FUNCTIONS /////////////////////////////////////////////

//Check if Unity Mod Manager is installed, either as a mod or already patched into the game folder
async function isUmmInstalled(api) {
  const state = api.getState();
  const mods = state.persistent.mods[GAME_ID] || {};
  if (Object.keys(mods).some(id => mods[id]?.type === UMM_ID)) {
    return true;
  }
  const discoveryPath = getDiscoveryPath(api);
  if (discoveryPath === undefined) {
    return false;
  }
  return statCheckAsync(discoveryPath, UMM_MARKER);
}

//Function to auto-download Unity Mod Manager from Nexus (it has no GitHub releases)
async function downloadUmm(api, gameSpec, check = true) {
  let isInstalled = await isUmmInstalled(api);
  if (!isInstalled || !check) {
    //notification indicating install process
    const MOD_NAME = UMM_NAME;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const MOD_TYPE = UMM_ID;
    const PAGE_ID = UMM_PAGE_NO;
    const FILE_ID = UMM_FILE_NO; //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = UMM_DOMAIN;
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
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch { // use defined file ID if input is undefined above
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
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err, { allowReport: false });
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Read this game's <GameInfo> block out of the archive's shipped list of supported games
async function readUmmGameInfo(files, workingDir) {
  const configFile = files.find(file => (path.basename(file).toLowerCase() === UMM_CONFIG_FILE.toLowerCase()));
  if (configFile === undefined) {
    throw new util.DataInvalid(`${UMM_CONFIG_FILE} is missing from the ${UMM_NAME} archive`);
  }
  const data = await fs.readFileAsync(path.join(workingDir, configFile), { encoding: 'utf8' });
  const parsed = await parseStringPromise(data);
  const root = parsed[Object.keys(parsed)[0]] || {};
  const games = root.GameInfo || [];
  const gameInfo = games.find(entry => entry?.$?.Name === UMM_GAME_NAME);
  if (gameInfo === undefined) {
    throw new util.DataInvalid(`${UMM_GAME_NAME} is not listed in ${UMM_CONFIG_FILE}`);
  }
  return gameInfo;
}

//Installer test for the Unity Mod Manager archive
function testUmm(files, gameId) {
  const isUmm = files.some(file => (path.basename(file).toLowerCase() === UMM_INST_EXEC.toLowerCase()));
  let supported = (gameId === spec.game.id) && isUmm;

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

//Install the Unity Mod Manager archive, reproducing what its own DoorstopProxy install does
async function installUmm(api, files, workingDir) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === UMM_INST_EXEC.toLowerCase()));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UMM_ID };

  //The whole installer folder is kept so UnityModManager.exe stays usable as a tool
  const filtered = files.filter(file => (
    (!file.endsWith(path.sep)) &&
    ((rootPath === '.') || (file.indexOf(`${rootPath}${path.sep}`) === 0))
  ));
  const archivePath = (relPath) => (rootPath === '.') ? relPath : path.join(rootPath, relPath);
  const hasFile = (relPath) => filtered.some(file => (file.toLowerCase() === archivePath(relPath).toLowerCase()));
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(UMM_FOLDER, (rootPath === '.') ? file : file.substring(rootPath.length + 1)),
    };
  });

  let gameInfo;
  try {
    gameInfo = await readUmmGameInfo(files, workingDir);
  } catch (err) {
    gameInfo = undefined;
    api.showErrorNotification(`Could not read the ${UMM_NAME} game list`, err, { allowReport: false });
  }

  //Doorstop proxy next to the executable
  if (hasFile(UMM_DOORSTOP_SRC)) {
    instructions.push({
      type: 'copy',
      source: archivePath(UMM_DOORSTOP_SRC),
      destination: UMM_DOORSTOP_DLL,
    });
  }

  //Manager libraries, mirroring UMM's own conditionals for Harmony and System.Xml
  const copyToManager = (relPath, destName) => {
    if (!hasFile(relPath)) {
      log('warn', `${relPath} is missing from the ${UMM_NAME} archive`);
      return;
    }
    instructions.push({
      type: 'copy',
      source: archivePath(relPath),
      destination: path.join(UMM_MANAGER_PATH, destName || path.basename(relPath)),
    });
  };
  const useHarmony22 = (gameInfo?.HarmonyVersion?.[0] === '2.2') && hasFile(UMM_HARMONY_22);
  UMM_MANAGER_FILES.forEach(file => {
    if (useHarmony22 && (file === UMM_HARMONY_DLL)) {
      return; //replaced by the 2.2 payload below
    }
    copyToManager(file);
  });
  if (useHarmony22) {
    copyToManager(UMM_HARMONY_22, UMM_HARMONY_DLL);
  }
  //A second System.Xml.dll next to the game's own copy risks an assembly conflict
  const discoveryPath = getDiscoveryPath(api);
  const gameHasXml = (discoveryPath !== undefined) && statCheckSync(discoveryPath, path.join(DATA_FOLDER, "Managed", UMM_XML_DLL));
  if (!gameHasXml) {
    copyToManager(UMM_XML_DLL);
  }

  //Doorstop configuration, pointing at the manager assembly relative to the game folder
  instructions.push({
    type: 'generatefile',
    destination: UMM_DOORSTOP_INI,
    data: `[General]\r\nenabled = true\r\ntarget_assembly = ${path.join(UMM_MANAGER_PATH, UMM_MANAGER_DLL)}\r\n`,
  });

  //This game's entry from the shipped list, re-serialized the way UMM writes it per game
  if (gameInfo !== undefined) {
    const builder = new Builder({ rootName: 'Config' });
    instructions.push({
      type: 'generatefile',
      destination: path.join(UMM_MANAGER_PATH, UMM_CONFIG_OUT),
      data: builder.buildObject({ GameInfo: gameInfo }),
    });
  }

  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Pre-seed UMM's own settings file so the tool opens already pointed at this game
async function writeUmmParams(api) {
  const discoveryPath = getDiscoveryPath(api);
  if (discoveryPath === undefined) {
    return;
  }
  try {
    let root = {};
    try { //never clobber the file, the user may have other games registered with UMM
      const data = await fs.readFileAsync(UMM_PARAMS_FILE, { encoding: 'utf8' });
      const parsed = await parseStringPromise(data);
      root = parsed?.Param || {};
    } catch (err) {
      log('debug', `No existing ${UMM_NAME} Params.xml to merge with: ${err}`);
    }
    root.LastSelectedGame = [UMM_GAME_NAME];
    const container = Array.isArray(root.GameParams) ? (root.GameParams[0] || {}) : {};
    if (!Array.isArray(container.GameParam)) {
      container.GameParam = [];
    }
    let entry = container.GameParam.find(game => (game?.$?.Name === UMM_GAME_NAME));
    if (entry === undefined) {
      entry = { $: { Name: UMM_GAME_NAME } };
      container.GameParam.push(entry);
    }
    entry.Path = [discoveryPath];
    entry.InstallType = ['DoorstopProxy'];
    root.GameParams = [container];
    const builder = new Builder({ rootName: 'Param' });
    await fs.ensureDirWritableAsync(UMM_PARAMS_FOLDER);
    await fs.writeFileAsync(UMM_PARAMS_FILE, builder.buildObject(root), { encoding: 'utf8' });
  } catch (err) {
    log('warn', `Could not write ${UMM_NAME} Params.xml: ${err}`);
  }
}

//UMM writes these itself on first run, seeding them just saves the user a step
function setUmmRegistry(api) {
  const discoveryPath = getDiscoveryPath(api);
  if (discoveryPath === undefined) {
    return;
  }
  try {
    winapi.RegSetKeyValue(UMM_REG_HIVE, UMM_REG_KEY, 'Path', path.join(discoveryPath, UMM_FOLDER));
    winapi.RegSetKeyValue(UMM_REG_HIVE, UMM_REG_KEY, 'ExePath', path.join(discoveryPath, UMM_INST_PATH));
  } catch (err) {
    log('warn', `Could not write ${UMM_NAME} registry values: ${err}`);
  }
}

//Point every registered UMM tool at the deployed executable in the game folder.
//The bundled modtype-umm extension registers its tool against the mod's staging folder, which is
//named after the version it installed, so it stops resolving the moment that version changes.
function setUmmTool(api) {
  const discoveryPath = getDiscoveryPath(api);
  if (discoveryPath === undefined) {
    return;
  }
  const toolPath = path.join(discoveryPath, UMM_INST_PATH);
  const state = api.getState();
  const tools = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools'], {});
  Object.keys(tools).forEach(id => {
    const tool = tools[id];
    const isUmmTool = (tool?.path !== undefined)
      && (path.basename(tool.path).toLowerCase() === UMM_INST_EXEC.toLowerCase());
    if (isUmmTool && (tool.path !== toolPath)) {
      api.store.dispatch(actions.addDiscoveredTool(GAME_ID, id, {
        ...tool,
        path: toolPath,
        workingDirectory: path.join(discoveryPath, UMM_FOLDER),
      }, true));
      log('info', `Repointed ${UMM_NAME} tool "${id}" from ${tool.path} to ${toolPath}`);
    }
  });
}

//Launch the Unity Mod Manager installer window
function runUmm(api) {
  const TOOL_NAME = UMM_NAME;
  const discoveryPath = getDiscoveryPath(api);

  try {
    //resolved from the game folder every time - a stored tool path can point at a staging folder
    //named after a specific version, which breaks as soon as that version is replaced
    const TOOL_PATH = (discoveryPath !== undefined) ? path.join(discoveryPath, UMM_INST_PATH) : undefined;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false })
        .catch(err => api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    }
    else {
      return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, `Path to ${TOOL_NAME} executable could not be found. Ensure ${TOOL_NAME} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}

//Check if Railloader is installed. Its archive can not be fetched, so this only detects a manual install
async function isRailloaderInstalled(api) {
  const discoveryPath = getDiscoveryPath(api);
  if (discoveryPath === undefined) {
    return false;
  }
  for (const file of RAILLOADER_FILES) {
    if (await statCheckAsync(discoveryPath, file)) {
      return true;
    }
  }
  return false;
}

//Send the user to Railloader's home page, warning that it is currently offline
async function getRailloader(api) {
  const isInstalled = await isRailloaderInstalled(api);
  if (isInstalled) {
    api.sendNotification({
      id: `${GAME_ID}-${RAILLOADER_ID}-installed`,
      type: 'info',
      message: `${RAILLOADER_NAME} is already installed in the game folder`,
      allowSuppress: true,
    });
    return;
  }
  api.showDialog('info', `Get ${RAILLOADER_NAME}`, {
    text: `${RAILLOADER_NAME}'s official download site is currently offline, so Vortex can not fetch it for you.\n`
        + `If you already have a ${RAILLOADER_NAME} archive, install it through Vortex like any other mod and it will be placed in the game folder.\n`
        + `\n`
        + `${RAILLOADER_NAME} mods can be installed either way - they do not need the loader to be present to install, only to run.\n`
  }, [
    { label: 'Open Home Page', action: () => { util.opn(RAILLOADER_URL).catch(() => null); } },
    { label: 'Continue' },
  ]);
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Read a mod folder name out of a manifest, falling back to the archive name
async function readModName(manifestPath, key, fallback) {
  try {
    const data = await fs.readFileAsync(manifestPath, { encoding: 'utf8' });
    const parsed = JSON.parse(data);
    const name = parsed[key] || parsed[key.toLowerCase()] || parsed[key.charAt(0).toUpperCase() + key.slice(1)];
    if ((typeof name === 'string') && (name.length > 0)) {
      return name;
    }
  } catch (err) {
    log('warn', `Could not read a mod name from ${manifestPath}: ${err}`);
  }
  return fallback;
}

//Turn any of the shipped archive shapes into a single "<Name>/..." folder under the Mods folder
function modsFolderInstructions(files, rootPath, modName) {
  const filtered = files.filter(file => (
    (!file.endsWith(path.sep)) &&
    ((rootPath === '.') || (file.indexOf(`${rootPath}${path.sep}`) === 0))
  ));
  return filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(modName, (rootPath === '.') ? file : file.substring(rootPath.length + 1)),
    };
  });
}

//Installer test for UMM mod files
function testUmmMod(files, gameId) {
  const manifest = files.find(file => (path.basename(file).toLowerCase() === UMM_MOD_FILE));
  const isMod = (manifest !== undefined) && files.some(file => (path.extname(file).toLowerCase() === '.dll'));
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

//Installer install UMM mod files
async function installUmmMod(files, workingDir) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === UMM_MOD_FILE));
  const rootPath = path.dirname(modFile);
  const fallbackName = path.basename(workingDir, '.installing');
  const modName = (rootPath === '.')
    ? await readModName(path.join(workingDir, modFile), 'Id', fallbackName)
    : path.basename(rootPath);
  const instructions = modsFolderInstructions(files, rootPath, modName);
  instructions.push({ type: 'setmodtype', value: MODS_ID });
  return Promise.resolve({ instructions });
}

//Installer test for Railloader mod files
function testRailloaderMod(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === RAILLOADER_MOD_FILE));
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

//Installer install Railloader mod files. A leading "Mods" folder is dropped, the mod type supplies it
async function installRailloaderMod(files, workingDir) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === RAILLOADER_MOD_FILE));
  const rootPath = path.dirname(modFile);
  const fallbackName = path.basename(workingDir, '.installing');
  const modName = (rootPath === '.')
    ? await readModName(path.join(workingDir, modFile), 'id', fallbackName)
    : path.basename(rootPath);
  const instructions = modsFolderInstructions(files, rootPath, modName);
  instructions.push({ type: 'setmodtype', value: MODS_ID });
  return Promise.resolve({ instructions });
}

//Installer test for a user-supplied Railloader archive
function testRailloaderApp(files, gameId) {
  const isLoader = files.some(file => RAILLOADER_FILES.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isLoader;

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

//Installer install a user-supplied Railloader archive into the game folder
function installRailloaderApp(files) {
  const modFile = files.find(file => RAILLOADER_FILES.includes(path.basename(file).toLowerCase()));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

  const filtered = files.filter(file => (
    (!file.endsWith(path.sep)) &&
    ((rootPath === '.') || (file.indexOf(`${rootPath}${path.sep}`) === 0))
  ));
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: (rootPath === '.') ? file : file.substring(rootPath.length + 1),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for Assembly mod files
function testAssembly(files, gameId) {
  const isMod = files.some(file => ASSEMBLY_FILES.includes(path.basename(file)));
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

//Install Assembly mod files
function installAssembly(files) {
  const MOD_TYPE = ASSEMBLY_ID;
  const modFile = files.find(file => ASSEMBLY_FILES.includes(path.basename(file)));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))
  ));
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
async function installRoot(files, workingDir) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

  if (GAME_VERSION === ALT_VERSION) {
    try {
      await fs.statAsync(path.join(workingDir, modFile));
      if (path.basename(modFile) === DATA_FOLDER_DEFAULT) {
        await fs.renameAsync(path.join(workingDir, modFile), path.join(workingDir, rootPath, DATA_FOLDER_ALT));
      }
      const paths = await getAllFiles(workingDir);
      files = [...paths.map(p => p.replace(`${workingDir}${path.sep}`, ''))];
    } catch (err) {
      log('warn', `Failed to rename "${DATA_FOLDER_DEFAULT}" folder to "${DATA_FOLDER_ALT}" for root mod ${workingDir} (or "${DATA_FOLDER_DEFAULT}" folder is not present): ${err}`);
    }
  }

  // Don't use rootPath filter since it removes files without extensions
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

//Installer Test for assets files
function testAssets(files, gameId) {
  const isMod = files.some(file => ASSETS_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install assets files
function installAssets(files) {
  const modFile = files.find(file => ASSETS_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ASSETS_ID };

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
  modName = path.basename(modName, '.installing');
  const id = modName.replace(/[^a-zA-Z0-9\s]*( )*/gi, '');
  const NOTIF_ID = `${GAME_ID}-${id}-fallback`;
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
            //*
            { label: `Open Mod Page + Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
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
              util.opn(MOD_PAGE_URL).catch(() => null);
              dismiss();
            }}, //*/
          ]);
        },
      },
    ],
  });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
  VERSION_FILE_PATH = path.join(DATA_FOLDER, VERSION_FILE);
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
  else if (hasVersionFile) { //use text file
    const versionFilepath = path.join(gamePath, VERSION_FILE_PATH);
    try {
      const data = await fs.readFileAsync(versionFilepath, { encoding: 'utf8' });
      const segments = data.split(' ');
      return (segments[3])
        ? Promise.resolve(segments[3])
        : Promise.reject(new util.DataInvalid('Failed to resolve version'));
    } catch (err) {
      return Promise.reject(err);
    }
  } //*/
  else { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC));
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get game version: ${err}`);
      return Promise.resolve(version);
    }
  } //*/
} //*/

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

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  //SYNC CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  if (setupNotification) {
    setupNotify(api);
  }
  // ASYNC CODE ///////////////////////////////////
  if (multiExe) {
    GAME_VERSION = await setGameVersion(GAME_PATH);
  }
  MODTYPE_FOLDERS.push(ASSEMBLY_PATH);
  MODTYPE_FOLDERS.push(ASSETS_PATH);
  MODTYPE_FOLDERS.push(MODS_FOLDER); //both loaders expect this to exist, UMM's own installer creates it too
  if (autoDownloadUmm) {
    await downloadUmm(api, gameSpec);
  }
  if (seedUmmParams) {
    await writeUmmParams(api);
    setUmmRegistry(api);
  }
  setUmmTool(api);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
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

  //register mod types explicitly (due to potentially dynamic DATA_FOLDER)
  context.registerModType(UMM_ID, 8,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, '{gamePath}'),
    () => Promise.resolve(false),
    { name: UMM_NAME }
  );
  context.registerModType(MODS_ID, 10,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, path.join('{gamePath}', MODS_FOLDER)),
    () => Promise.resolve(false),
    { name: MODS_NAME }
  );
  context.registerModType(ASSEMBLY_ID, 60,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, path.join('{gamePath}', ASSEMBLY_PATH)),
    () => Promise.resolve(false),
    { name: ASSEMBLY_NAME }
  );
  context.registerModType(ASSETS_ID, 62,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, path.join('{gamePath}', ASSETS_PATH)),
    () => Promise.resolve(false),
    { name: ASSETS_NAME }
  );

  //register mod installers
  context.registerInstaller(ROOT_ID, 8, testRoot, installRoot);
  if (railloaderSupport) {
    context.registerInstaller(RAILLOADER_ID, 23, testRailloaderApp, installRailloaderApp);
  }
  context.registerInstaller(UMM_ID, 25, testUmm, (files, workingDir) => installUmm(context.api, files, workingDir));
  context.registerInstaller(UMM_MOD_ID, 27, testUmmMod, installUmmMod);
  if (railloaderSupport) {
    context.registerInstaller(RAILLOADER_MOD_ID, 29, testRailloaderMod, installRailloaderMod);
  }
  context.registerInstaller(ASSEMBLY_ID, 31, testAssembly, installAssembly);
  context.registerInstaller(ASSETS_ID, 33, testAssets, installAssets);
  //context.registerInstaller(SAVE_ID, 49, testSave, installSave); //best to only enable if saves are stored in the game's folder
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Run ${UMM_NAME}`, () => {
    runUmm(context.api);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Get ${RAILLOADER_NAME}`, () => {
    getRailloader(context.api);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return railloaderSupport && (gameId === GAME_ID);
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, MODS_FOLDER);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Data Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, DATA_FOLDER);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    //const openPath = SAVE_PATH;
    const openPath = getSavePath(context.api);
    util.opn(openPath).catch(() => null);
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
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
