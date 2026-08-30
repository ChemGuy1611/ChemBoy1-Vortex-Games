/*///////////////////////////////////////////
Name: HITMAN World of Assassination Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 1.0.0
Date: 2026-08-28
Notes:
-
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');
//const winapi = require('winapi-bindings');
//const fsPromises = require('fs/promises'); //.rm() for recursive folder deletion
//const fsExtra = require('fs-extra');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, resolveVersionByAssetDate, resolveVersionByModVersion, resolveVersionByDirectCopyMarker, resolveVersionByNightlyRun, testRequirementVersion } = require('./downloader');
const semver = require('semver');

/*const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow'); //*/
//const DOCUMENTS = util.getVortexPath("documents");
const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "hitman3";
const STEAMAPP_ID = "1659040"; // https://steamdb.info/app/1659040/
const STEAMAPP_ID_DEMO = "1847520"; // https://steamdb.info/app/1847520/
const EPICAPP_ID = "4145c668a0c94f1db16de2cbfbc60309"; // https://store.epicgames.com/en-US/p/hitman-3
const GOGAPP_ID = null;
const XBOXAPP_ID = "IOInteractiveAS.PC-HITMAN3-BaseGame"; // https://apps.microsoft.com/detail/9PDRM8BFW1X1
const XBOXEXECNAME = "XXX";
const XBOX_PUB_ID = "6h0y724g59e1w"; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const INSTALL_HIVE = 'HKEY_LOCAL_MACHINE'; //typically HKEY_LOCAL_MACHINE or HKEY_CURRENT_USER
const INSTALL_KEY = `SOFTWARE\\WOW6432Node\\XXX\\XXX`; //for finding install in registry - requires winapi-bindings
const INSTALL_VALUE = "XXX"; //often InstallDir or InstallPath
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, STEAMAPP_ID_DEMO, EPICAPP_ID, XBOXAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "HITMAN World of Assassination";
const GAME_NAME_SHORT = "HITMAN WoA";
const BINARIES_PATH = path.join('Retail');
const EXEC_NAME = "HITMAN3.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const EXEC_LAUNCHER = 'Launcher.exe';
const EXEC_EGS = EXEC; //change other versions if different than Steam/default
const EXEC_GOG = EXEC;
const EXEC_DEMO = EXEC;
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Hitman%3A_World_of_Assassination";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/2232"; //Nexus link to this extension. Used for links

//feature toggles
const hasLoader = true; //true if game needs a mod loader
const nexusCreditDownload = true; //true to also download the mod loader's official Nexus installer, so its mod page gets the download credit
let hasXbox = true; //toggle for Xbox version logic
if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;
const multiExe = false; //set to true if there are multiple executable names
const multiModPath = false; //set to true if there are multiple possible mod paths (i.e. different path for Xbox version)
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const needsModInstaller = true; //set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing
const rootInstaller = false; //enable root installer. Set false if you need to avoid installer collisions
const saveInstaller = false; //enable save installer. Set false if path is outside of game folder
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = false; //enable to show the user a notification with special instructions (specify below)
const hasUserIdFolder = false; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
let binariesInstaller = false;
if (BINARIES_PATH !== '.') binariesInstaller = true; //only enable Binaries installer if not in root
const debug = false; //toggle for debug mode

//info for modtypes, installers, tools, and actions
const DATA_FOLDER = 'Runtime';
let ROOT_FOLDERS = [DATA_FOLDER];
if (BINARIES_PATH !== '.') ROOT_FOLDERS.push(BINARIES_PATH.split(path.sep)[0]);
const ROOTSUB_FOLDERS = [];
const ROOTSUB_PATH = DATA_FOLDER;

const CONFIGMOD_LOCATION = '';
const SAVEMOD_LOCATION = ROAMINGAPPDATA;
const APPDATA_FOLDER = path.join('IO Interactive');
const CONFIG_FOLDERNAME = '';
const SAVE_FOLDERNAME = '';

let GAME_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';
const EXEC_XBOX = 'gamelaunchhelper.exe';

const STEAM_FILE = 'steam_api64.dll';
const GOG_FILE = 'Galaxy64.dll';
const EPIC_FILE = 'EOSSDK-Win64-Shipping.dll';
const XBOX_FILE = APPMANIFEST_FILE;

// Simple Mod Framework
const LOADER_ID = `${GAME_ID}-loader`;
const LOADER_NAME = "Simple Mod Framework";
const LOADER_PATH = 'Simple Mod Framework';
const LOADER_FILE = 'Deploy.exe';
const LOADER_EXEC = path.join(LOADER_PATH, 'Mod Manager', 'Mod Manager.exe');
const LOADER_LOGO = 'framework.png';
const LOADER_ARC_NAME = `Release.zip`;
const AUTHOR = 'atampy25'; // Author of the repo
const REPO = 'simple-mod-framework'; // Repository name on GitHub
const LOADER_URL_API = `https://api.github.com/repos/${AUTHOR}/${REPO}`; //api url
const REQUIREMENTS = [
  {
    archiveFileName: LOADER_ARC_NAME,
    modType: LOADER_ID, //the module assigns this to the installed mod itself; findModByFile only matches mods carrying it (untyped mods are not considered)
    assemblyFileName: LOADER_FILE,
    userFacingName: LOADER_NAME, //notifications, error messages, and the name shown in the mod list
    githubUrl: LOADER_URL_API,
    findMod: (api) => findModByFile(api, LOADER_ID, LOADER_FILE),
    fileArchivePattern: new RegExp(/^Release/, 'i'),
    findDownloadId: (api) => findDownloadIdByFile(api, LOADER_ARC_NAME),
    resolveVersion: (api) => resolveVersionByModVersion(api, REQUIREMENTS[0]), //reads the version stamped on the installed mod at install time; use when the version is only in the release tag (asset filename is versionless) and fileArchivePattern has no capture group
  },
]; //*/

//The framework's Nexus Mods page. Its official installer is a wrapper that downloads the same
//GitHub release Vortex installs from, so it is only downloaded, never installed or run - the point
//is to give the mod page the download credit.
const LOADER_PAGE_NO = 200;
const LOADER_FILE_NO = 2575;
const LOADER_DOMAIN = GAME_ID;
const LOADER_INSTALLER_NAME = `${LOADER_NAME} (Nexus Installer)`;
//Remembered in Vortex's settings so the courtesy download happens exactly once, no matter how often
//the framework is reinstalled or the download is cleared out of the Downloads tab.
const SETTING_NEXUS_CREDIT_DOWNLOADED = 'nexusInstallerDownloaded';
const SET_NEXUS_CREDIT_DOWNLOADED = `SET_${GAME_ID.toUpperCase()}_NEXUS_CREDIT_DOWNLOADED`;
function setNexusInstallerDownloaded(value) { return { type: SET_NEXUS_CREDIT_DOWNLOADED, payload: value }; }
setNexusInstallerDownloaded.toString = () => SET_NEXUS_CREDIT_DOWNLOADED;
//Folders in the framework archive that Vortex must never deploy. The framework owns its own "Mods"
//folder: it reads every entry as a mod, and refuses to start if it finds a loose file in there.
const LOADER_EXCLUDE_FOLDERS = ['Mods'];
const LOADER_MODS_PATH = path.join(LOADER_PATH, 'Mods');

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "SMF Mod";
const MOD_PATH = "Vortex_Mods";
const MOD_PATH_XBOX = MOD_PATH;
const MOD_FILES = ['manifest.json'];
const MOD_EXTS = ['.rpkg'];
const MOD_ARCHIVE_EXTS = ['.zip', '.7z', '.rar'];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
const BINARIES_EXTS = ['.exe', '.dll', '.asi', '.addon64'];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, APPDATA_FOLDER, SAVE_FOLDERNAME);
let USERID_FOLDER = "";
if (hasUserIdFolder) {
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
  } catch {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  }
}
let SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_FOLDER_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_PUB_ID}`, "SystemAppData", "wgs");
if (hasUserIdFolder) {
  try {
    const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER_XBOX);
    USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
  } catch {
    USERID_FOLDER = "";
  }
  if (USERID_FOLDER === undefined) {
    USERID_FOLDER = "";
  }
}
const SAVE_PATH_XBOX = path.join(SAVE_FOLDER_XBOX, USERID_FOLDER);
const SAVE_EXTS = [".XXX"];
const SAVE_FILES = ["XXX"];

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
let CONFIG_PATH = path.join(CONFIGMOD_LOCATION, APPDATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_PATH_XBOX = CONFIG_PATH; //XBOX Version
const CONFIG_EXTS = [".XXX"];
const CONFIG_FILES = ["XXX"];

/* tool info (i.e. save editor)
const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = "XXX";
const TOOL_EXEC_FOLDER = path.join('XXX');
const TOOL_EXEC = 'XXX.exe';
const TOOL_EXEC_PATH = path.join(TOOL_EXEC_FOLDER, TOOL_EXEC);
//*/

let MOD_PATH_DEFAULT = MOD_PATH;
//if (!needsModInstaller) MOD_PATH_DEFAULT = '.';
let REQ_FILE = EXEC;
if (multiExe) REQ_FILE = DATA_FOLDER;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [BINARIES_PATH];
if (needsModInstaller) MODTYPE_FOLDERS.push(MOD_PATH);
if (saveInstaller) MODTYPE_FOLDERS.push(SAVE_PATH);
if (hasLoader) MODTYPE_FOLDERS.push(LOADER_PATH);
if (hasLoader) MODTYPE_FOLDERS.push(LOADER_MODS_PATH); //the framework reads this folder every time it starts, so it has to exist even though Vortex never deploys into it
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];

//filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    //"parameters": PARAMETERS, //commented out by default to avoid passing empty string parameter
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
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
      "XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};
//? think of a way to tell if the mod path is not in the game folder, only add ROOT modType if it is
if (needsModInstaller) {
  spec.modTypes.push({
    "id": MOD_ID,
    "name": MOD_NAME,
    "priority": "high",
    "targetPath": path.join('{gamePath}', MOD_PATH)
  });
}
if (saveInstaller) {
  spec.modTypes.push({
    "id": SAVE_ID,
    "name": SAVE_NAME,
    "priority": "high",
    "targetPath": path.join("{gamePath}", SAVE_PATH)
  });
}

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
    detach: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
  {
    id: LOADER_ID,
    name: LOADER_NAME,
    logo: LOADER_LOGO,
    executable: () => LOADER_EXEC,
    requiredFiles: [
      LOADER_EXEC,
    ],
    relative: true,
    exclusive: true,
    //shell: true,
    //defaultPrimary: true,
    //parameters: [],
  }, //*/
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

async function isDirAsync(folder, file) {
  try {
    const stats = await fs.statAsync(path.join(folder, file));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

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

//* Get mod path dynamically for different game versions
function getModPath(discoveryPath) {
  if (!multiModPath) {
    return () => MOD_PATH_DEFAULT;
  }
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return () => MOD_PATH_XBOX;
  };
  //add GOG/EGS/Demo versions here if needed
  GAME_VERSION = 'default';
  return () => MOD_PATH_DEFAULT;
} //*/

//Find game installation directory
function makeFindGame(api, gameSpec) {
  /*using registry - requires winapi-bindings
  try {
    const instPath = winapi.RegGetValue(
      INSTALL_HIVE,
      INSTALL_KEY,
      INSTALL_VALUE
    );
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return () => Promise.resolve(instPath.value);
  } catch { //*/
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  //}
} //*/

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
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
  return Promise.resolve(undefined);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (!multiExe && !hasXbox) {
    return EXEC;
  }
  if (hasXbox && statCheckSync(discoveryPath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    SAVE_PATH = SAVE_PATH_XBOX;
    CONFIG_PATH = CONFIG_PATH_XBOX;
    return EXEC_XBOX;
  };
  //add GOG/EGS/Demo versions here if needed
  GAME_VERSION = 'default';
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (!multiExe && !hasXbox) {
    GAME_VERSION = 'default';
    return GAME_VERSION;
  }
  if (await statCheckAsync(gamePath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    SAVE_PATH = SAVE_PATH_XBOX;
    CONFIG_PATH = CONFIG_PATH_XBOX;
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for mod loader files
function testLoader(files, gameId) {
  const isMod = files.some(file => path.basename(file) === LOADER_FILE);
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

//Install mod loader files
function installLoader(files) {
  const MOD_TYPE = LOADER_ID;
  const modFile = files.find(file => path.basename(file) === LOADER_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  const LOADER_EXCLUDE_LOWER = LOADER_EXCLUDE_FOLDERS.map(folder => folder.toLowerCase());
  // The archive ships an example mod and a marker file inside "Mods". Dropping the whole folder here
  // means nothing Vortex manages can ever live in it, so purging and redeploying leave it alone too.
  const isExcluded = (file) => LOADER_EXCLUDE_LOWER.includes(file.substr(idx).split(path.sep)[0].toLowerCase());

  // Remove directories, anything that isn't in the rootPath, and the folders the framework owns.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)) && !isExcluded(file))
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
  const MOD_FILES_LOWER = MOD_FILES.map(file => file.toLowerCase());
  const hasManifest = files.some(file => MOD_FILES_LOWER.includes(path.basename(file).toLowerCase()));
  const hasRpkg = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  const isMod = hasManifest || hasRpkg;
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

//Whether a folder holds a mod manifest, which is what makes it a mod as far as the framework cares
async function hasModManifest(folderPath) {
  const MOD_FILES_LOWER = MOD_FILES.map(file => file.toLowerCase());
  try {
    const entries = await fs.readdirAsync(folderPath);
    return entries.some(entry => MOD_FILES_LOWER.includes(entry.toLowerCase()));
  } catch {
    return false;
  }
}

//Read the mod's name out of its manifest, so the archive is named after the mod rather than the download
async function readModName(folderPath) {
  const MOD_FILES_LOWER = MOD_FILES.map(file => file.toLowerCase());
  try {
    const entries = await fs.readdirAsync(folderPath);
    const manifest = entries.find(entry => MOD_FILES_LOWER.includes(entry.toLowerCase()));
    if (manifest === undefined) {
      return undefined;
    }
    const data = await fs.readFileAsync(path.join(folderPath, manifest), 'utf8');
    return JSON.parse(data)?.name; //manifests are read as JSON5 by the framework, so this can fail on a valid manifest
  } catch {
    return undefined;
  }
}

function sanitizeFileName(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
}

//Install mod files.
//The framework's "Add a Mod" button takes one archive whose root holds nothing but mod folders, each
//with a manifest, and rejects it outright if a loose file sits at the root. So mods are repacked into
//a single archive in that shape, which the user then hands to the framework.
async function installMod(files, destinationPath) {
  const MOD_TYPE = MOD_ID;
  const MOD_FILES_LOWER = MOD_FILES.map(file => file.toLowerCase());
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  const archiveFiles = files.filter(file => MOD_ARCHIVE_EXTS.includes(path.extname(file).toLowerCase()));
  if (archiveFiles.length > 0) { //a mod packed inside another archive is already in the shape the framework wants
    const instructions = archiveFiles.map(file => ({
      type: 'copy',
      source: file,
      destination: path.basename(file),
    }));
    instructions.push(setModTypeInstruction);
    return { instructions };
  }

  const hasManifest = files.some(file => MOD_FILES_LOWER.includes(path.basename(file).toLowerCase()));
  if (!hasManifest) { //loose RPKG files - "Add a Mod" takes those directly, no repacking needed
    const rpkgFiles = files.filter(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
    const instructions = rpkgFiles.map(file => ({
      type: 'copy',
      source: file,
      destination: path.basename(file),
    }));
    instructions.push(setModTypeInstruction);
    return { instructions };
  }

  // Sort the archive root into folders and loose files, then work out what has to be packed.
  const rootEntries = await fs.readdirAsync(destinationPath);
  const rootDirs = [];
  for (const entry of rootEntries) {
    if (await isDirAsync(destinationPath, entry)) {
      rootDirs.push(entry);
    }
  }
  const modDirs = [];
  for (const dir of rootDirs) {
    if (await hasModManifest(path.join(destinationPath, dir))) {
      modDirs.push(dir);
    }
  }

  let modName = await readModName(destinationPath); //manifest sitting at the archive root
  if ((modName === undefined) && (modDirs.length > 0)) {
    modName = await readModName(path.join(destinationPath, modDirs[0]));
  }
  modName = sanitizeFileName(modName ?? path.basename(destinationPath, '.installing'));
  if (modName === '') {
    modName = MOD_NAME;
  }

  let packPaths = [];
  if (modDirs.length > 0) { //already mod folders - pack those and leave any loose readme behind
    packPaths = modDirs.map(dir => path.join(destinationPath, dir));
  }
  else { //manifest is at the archive root - wrap the whole thing in a folder named after the mod
    let wrapper = modName;
    while (rootEntries.some(entry => entry.toLowerCase() === wrapper.toLowerCase())) {
      wrapper = `${wrapper}_`;
    }
    const wrapperPath = path.join(destinationPath, wrapper);
    await fs.ensureDirWritableAsync(wrapperPath);
    for (const entry of rootEntries) {
      await fs.renameAsync(path.join(destinationPath, entry), path.join(wrapperPath, entry));
    }
    packPaths = [wrapperPath];
  }

  const szip = new util.SevenZip();
  const archiveName = `${modName}.zip`;
  const archivePath = path.join(destinationPath, archiveName);
  await szip.add(archivePath, packPaths, { raw: ['-r'] });
  const instructions = [{
    type: 'copy',
    source: archiveName,
    destination: archiveName,
  }];
  instructions.push(setModTypeInstruction);
  return { instructions };
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map(str => str.toLowerCase());
  const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map(str => str.toLowerCase());
  const isMod = files.some(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const isSub = files.some(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isMod || isSub );

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
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map(str => str.toLowerCase());
  const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map(str => str.toLowerCase());
  let folder = '';
  let modFile = files.find(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  if (modFile === undefined) {
    modFile = files.find(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    folder = ROOTSUB_PATH;
  }
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
      destination: path.join(folder, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Fallback installer to Binaries folder
function testBinaries(files, gameId) {
  const isMod = files.some(file => BINARIES_EXTS.includes(path.extname(file).toLowerCase()));
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

//Fallback installer to Binaries folder
function installBinaries(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };

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
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for save files
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

//Install save files
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
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

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
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

function fallbackInstallerNotify(api, modName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, spec.game.id);
  modName = path.basename(modName, '.installing');
  const id = modName.replace(/[^a-zA-Z0-9\s]*( )*/gi, '').slice(0, 20);
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

// AUTO-DOWNLOADER FUNCTIONS ///////////////////////////////////////////////

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
  let checker = mod.every((entry) => entry !== undefined); //findMod resolves to a mod object or undefined, never a boolean
  return checker;
}

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await asyncForEachTestVersion(api, REQUIREMENTS);
    log('warn', 'Checked requirements versions');
  } catch (err) {
    log('warn', `Failed to test requirement version: ${err}`);
  }
}

async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
}

//Whether the framework's Nexus installer has been fetched already
function isNexusInstallerDownloaded(api) {
  return util.getSafe(api.getState(), ['settings', GAME_ID, SETTING_NEXUS_CREDIT_DOWNLOADED], false);
}

//* Download the framework's official installer from Nexus Mods, so its mod page gets the download
//  credit. The installer is only downloaded, never installed or run - it is a wrapper that fetches
//  the same GitHub release Vortex already installs, and it refuses to run once the framework exists.
async function downloadNexusInstaller(api) {
  if (isNexusInstallerDownloaded(api)) {
    return;
  }
  const NOTIF_ID = `${GAME_ID}-nexus-credit-download`;
  api.sendNotification({
    id: NOTIF_ID,
    message: `Downloading ${LOADER_INSTALLER_NAME}`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  try {
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    let FILE = LOADER_FILE_NO;
    try { //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(LOADER_DOMAIN, LOADER_PAGE_NO);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
        .reverse()[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${LOADER_INSTALLER_NAME} main file found`);
      }
      FILE = file.file_id;
    } catch { // use defined file ID if the lookup above fails
      FILE = LOADER_FILE_NO;
    }
    const URL = `nxm://${LOADER_DOMAIN}/mods/${LOADER_PAGE_NO}/files/${FILE}`;
    const dlInfo = {
      game: LOADER_DOMAIN,
      name: LOADER_INSTALLER_NAME,
    };
    await util.toPromise(cb =>
      api.events.emit('start-download', [URL], dlInfo, undefined, cb, undefined, { allowInstall: false }));
    api.store.dispatch(setNexusInstallerDownloaded(true)); //only ever ask for this once
  } catch (err) { //courtesy download - it must never block or shout over the framework install
    log('warn', `Failed to download ${LOADER_INSTALLER_NAME}: ${err}`);
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
} //*/

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

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
  else { // use exe
    try {
      const exeVersion = require('exe-version');
      const EXEC = getExecutable(gamePath);
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC)); //can also use getFileVersion if this doesn't return the correct number (rare)
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read executable file to get game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

function openModsFolder(api) {
  const DISCOVERY_PATH = getDiscoveryPath(api);
  if (DISCOVERY_PATH === undefined) {
    return;
  }
  util.opn(path.join(DISCOVERY_PATH, MOD_PATH)).catch(() => null);
}

function runModManager(api) {
  const TOOL_ID = LOADER_ID;
  const TOOL_NAME = LOADER_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
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

//Notify the user to hand the deployed mods over to the mod loader after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MESSAGE = `Add Mods to ${LOADER_NAME} to Finish Installing`;
  const MORE_TEXT = `Deploying only places each mod in "<GameFolder>\\${MOD_PATH}", packed as a single archive. `
      + `The mods are not in the game until ${LOADER_NAME} installs them.\n\n`
      + `Open ${LOADER_NAME}, use its "Add a Mod" button and pick the archive for each mod you want. `
      + `${LOADER_NAME} unpacks it into its own folder and adds it to its mod list, where you can enable it `
      + `and set the load order. Deploying again after that is safe - it only refreshes the archives.\n\n`
      + `Leave "<GameFolder>\\${LOADER_MODS_PATH}" alone. ${LOADER_NAME} owns that folder and reads every entry `
      + `in it as a mod, so adding files there by hand stops it from starting.\n`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run SMF',
        action: (dismiss) => {
          runModManager(api);
          dismiss();
        },
      },
      {
        title: 'Open Folder',
        action: (dismiss) => {
          openModsFolder(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, { text: MORE_TEXT }, [
            {
              label: 'Run SMF', action: () => {
                runModManager(api);
                dismiss();
              }
            },
            {
              label: 'Open Folder', action: () => {
                openModsFolder(api);
                dismiss();
              }
            },
            { label: 'Continue', action: () => dismiss() },
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
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  if (hasXbox || multiExe) {
    GAME_VERSION = await setGameVersion(GAME_PATH);
  }
  if (setupNotification) setupNotify(api);
  //await fs.ensureDirWritableAsync(CONFIG_PATH);
  if (hasLoader) {
    if (nexusCreditDownload) { //has its own once-only guard, so it does not ride on whether the loader is missing
      await downloadNexusInstaller(api);
    }
    const requirementsInstalled = await checkForRequirements(api);
    if (!requirementsInstalled) {
        await download(api, REQUIREMENTS);
    } //*/
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register settings
  if (hasLoader && nexusCreditDownload) {
    context.registerReducer(['settings', GAME_ID], {
      reducers: {
        [setNexusInstallerDownloaded.toString()]: (state, payload) => util.setSafe(state, [SETTING_NEXUS_CREDIT_DOWNLOADED], payload),
      },
      defaults: { [SETTING_NEXUS_CREDIT_DOWNLOADED]: false },
    });
  }

  const game = { //register game
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutable,
    queryModPath: getModPath(),
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
  /*context.registerModType(SAVE_ID, 62,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, SAVE_PATH),
    () => Promise.resolve(false),
    { name: SAVE_NAME }
  ); //*/

  if (hasLoader) {
    context.registerModType(LOADER_ID, 70,
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      },
      (game) => pathPattern(context.api, game, path.join('{gamePath}', LOADER_PATH)),
      () => Promise.resolve(false),
      { name: LOADER_NAME }
    );
  }
  if (binariesInstaller) {
    context.registerModType(BINARIES_ID, 72,
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      },
      (game) => pathPattern(context.api, game, path.join('{gamePath}', BINARIES_PATH)),
      () => Promise.resolve(false),
      { name: BINARIES_NAME }
    );
  }

  //register mod installers
  if (hasLoader) {
    context.registerInstaller(LOADER_ID, 25, testLoader, installLoader);
  }
  if (rootInstaller) {
    context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  }
  if (needsModInstaller) {
    context.registerInstaller(MOD_ID, 29, testMod, installMod);
  }
  if (binariesInstaller) {
    context.registerInstaller(BINARIES_ID, 31, testBinaries, installBinaries);
  }
  //context.registerInstaller(CONFIG_ID, 33, testConfig, installConfig);
  if (saveInstaller) {
    context.registerInstaller(SAVE_ID, 35, testSave, installSave);
  }
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register actions
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Vortex Mods Folder', () => {
    openModsFolder(context.api);
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
    const api = context.api;
    api.onAsync('did-deploy', async (profileId) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(api);
    });
    api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(api, gameId, mods, forced);
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
