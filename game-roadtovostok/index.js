/*///////////////////////////////////////////
Name: Road to Vostok Vortex Extension
Structure: Godot Engine Game
Author: ChemBoy1
Version: 1.0.0
Date: 2026-08-23
Notes:
- 
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByModVersion, testRequirementVersion } = require('./downloader');
const { downloadModWorkshop, checkForModWorkshopUpdate, downloadModWorkshopRequirement } = require('./modworkshop_downloader');
const { registerModWorkshopBrowser, onceModWorkshopBrowser } = require('./modworkshop_browser');
//const winapi = require('winapi-bindings');

//const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "roadtovostok";
const STEAMAPP_ID = "1963610"; // https://steamdb.info/app/1963610/
const STEAMAPP_ID_DEMO = "2141300"; // https://steamdb.info/app/2141300/
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = "XXX";
const XBOX_PUB_ID = "XXX"; //get from Save folder. '8wekyb3d8bbwe' if published by Microsoft
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, STEAMAPP_ID_DEMO]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "Road to Vostok";
const GAME_NAME_SHORT = "Road to Vostok";
const EXEC = "RTV.exe";
const EXEC_XBOX = 'gamelaunchhelper.exe';
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Road_to_Vostok";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1853"; //Nexus link to this extension. Used for links
const ENGINE_VERSION = '4'; // 4 or 3 - can see when running console.exe for game

//feature toggles
const hasXbox = false; //toggle for Xbox version logic
const allowSymlinks = true; //true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp)
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const customLoader = true;
const keepZips = false;
const modworkshopBrowser = true; //register the "Browse ModWorkshop" page
const debug = false; //toggle for debug mode

const DATA_FOLDER = path.join('Godot', 'app_userdata', 'Road to Vostok');
const CONFIGMOD_LOCATION = ROAMINGAPPDATA;
const CONFIG_FOLDERNAME = '';
const SAVEMOD_LOCATION = ROAMINGAPPDATA;
const SAVE_FOLDERNAME = '';

let GAME_PATH = '';
let GAME_VERSION = 'default';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = "Godot Mod";
const MOD_FOLDER = "mods";
const MOD_PATH = MOD_FOLDER;
const MOD_EXT = '.vmz';
const MOD_EXTS = [MOD_EXT];
const MOD_FILES = ["mod.txt"];
const REPACK_EXT = '.zip';

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_EXT = ".ini";
const CONFIG_FILES = [];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, DATA_FOLDER, SAVE_FOLDERNAME);
let USERID_FOLDER = "";
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}
/*try {
  const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
} catch {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
} //*/
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_EXT = ".sav";
const SAVE_FILES = [];

const TOOL_ID = `${GAME_ID}-tool`;
const TOOL_NAME = "XXX";
const TOOL_EXEC = path.join('XXX', 'XXX.exe');

// Information for downloader and updater
const LOADER_ID = `${GAME_ID}-godotmodloader`;
const LOADER_NAME = "Metro Mod Loader";
const LOADER_FILE = 'modloader.gd';
const LOADER_MWS_ID = '55623'; //ModWorkshop mod id - https://modworkshop.net/mod/55623
const LOADER_REV = '3.2.1'; //fallback version if the ModWorkshop API is unreachable
const LOADER_DL_ID = '98157'; //fallback file id if the ModWorkshop API is unreachable
const OVERRIDE_FILE = 'override.cfg';

const MWS_GAME = 'roadtovostok'; //ModWorkshop game slug - https://modworkshop.net/g/roadtovostok
const WORKSHOP_URL = `https://modworkshop.net/g/${MWS_GAME}`;

const MWS_REQUIREMENTS = [
  { //Metro Mod Loader
    mwsModId: LOADER_MWS_ID,
    modType: LOADER_ID,
    userFacingName: LOADER_NAME,
    fallbackVersion: LOADER_REV,
    fallbackFileId: LOADER_DL_ID,
    //every file on this mod is a .zip, so the mod's primary file is taken as-is - add fileType if that ever changes
  },
];

//Embedded ModWorkshop browser page - the user browses the live site and installs from it.
//Mods that declare dependencies offer them alongside the install.
const MWS_BROWSER_CONFIG = {
  mwsGame: MWS_GAME,
  requirements: MWS_REQUIREMENTS, //Metro Mod Loader installs to its own mod type, not as a browsed mod
  installRequirement: (api, gameSpec, requirement) =>
    downloadModWorkshopRequirement(api, gameSpec, requirement, true),
  pageId: `${GAME_ID}-modworkshop-browse`,
  pageTitle: 'Browse ModWorkshop',
  //no hotkey: Ctrl+Shift+B is already taken, and a second claim on it is dropped with a warning
};

const MCM_ID = `${GAME_ID}-mcm`;
const MCM_NAME = "ModConfigurationMenu";
const MCM_PATH = MOD_PATH;
const MCM_FILE = 'ModConfigurationMenu'; //marker folder inside the extracted archive, used by the installer test
const MCM_AUTHOR = 'DoinkOink';
const MCM_REPO = 'Mod-Configuration-Menu-Road-To-Vostok';
//The release also carries an identical .vmz asset. Take the .zip: Vortex only treats known archive
//extensions as archives, so the .vmz never reaches the installers with a usable file list.
const MCM_ARC_NAME = '00ModConfigurationMenu.zip';
const MCM_STAGED_FILE = '00ModConfigurationMenu.zip'; //what installMcm repacks the extracted mod into
const MCM_URL_API = `https://api.github.com/repos/${MCM_AUTHOR}/${MCM_REPO}`;

const REQUIREMENTS = [
  { //ModConfigurationMenu
    archiveFileName: MCM_ARC_NAME,
    modType: MCM_ID,
    assemblyFileName: MCM_STAGED_FILE,
    userFacingName: MCM_NAME,
    githubUrl: MCM_URL_API,
    findMod: (api) => findModByFile(api, MCM_ID, MCM_STAGED_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, MCM_ARC_NAME),
    fileArchivePattern: new RegExp(/^00ModConfigurationMenu\.zip/, 'i'), //selects the asset only - the file name carries no version
    resolveVersion: (api) => resolveVersionByModVersion(api, REQUIREMENTS[0]), //version only exists in the release tag, so read it back off the installed mod
  },
];

const MOD_PATH_DEFAULT = MOD_PATH;
const REQ_FILE = EXEC;
let PARAMETERS_STRING = '';
const PAR_STRING2 = '--setup-create-override-cfg';
//An empty string here would launch the game with a blank argv element, so emit no
//parameters at all when there is nothing to pass.
const PARAMETERS = (PARAMETERS_STRING === '') ? [] : [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];

let MODTYPE_FOLDERS = [MOD_PATH];

//filled in from data above
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
      "id": MCM_ID,
      "name": MCM_NAME,
      "priority": "low",
      "targetPath": path.join("{gamePath}", MCM_PATH)
    },
    {
      "id": LOADER_ID,
      "name": LOADER_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
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
    //defaultPrimary: !customLoader,
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

function truncateString(str, num) {
  return str.length > num ? str.slice(0, num) : str;
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
  if (hasXbox && statCheckSync(discoveryPath, EXEC_XBOX)) {
    return EXEC_XBOX;
  };
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (hasXbox && await statCheckAsync(gamePath, EXEC_XBOX)) {
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

//Test for Godot Mod Loader files
function testLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LOADER_FILE));
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

//Install Godot Mod Loader files
function installLoader(files) {
  const MOD_TYPE = LOADER_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  (
    !file.endsWith(path.sep)
  ));

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

//Test for Godot Mod Loader files
function testMcm(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === MCM_FILE));
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

//Install Godot Mod Loader files
async function installMcm(files, destinationPath) {
  const setModTypeInstruction = { type: 'setmodtype', value: MCM_ID };
  //Repack .vmz files since Vortex forcibly extracts them as archives for some reason...
  const szip = new util.SevenZip();
  const modName = path.basename(destinationPath, '.installing');
  const split = modName.split('-');
  const archiveName = split[0] + REPACK_EXT;
  const archivePath = path.join(destinationPath, archiveName);
  const rootRelPaths = await fs.readdirAsync(destinationPath);
  await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
  const instructions = [{
    type: 'copy',
    source: archiveName,
    destination: path.basename(archivePath),
  }];
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

//install .vmz mod files (variant handler)
async function installMod(api, files) {
  const fileExt = MOD_EXTS;
  const modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
  const modType = {
    type: 'setmodtype',
    value: MOD_ID,
  };
  const installFiles = (modFiles.length > MOD_EXTS.length)
    ? await chooseFilesToInstall(api, modFiles, fileExt)
    : modFiles;
  let instructions = installFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.basename(file)
    };
  });
  instructions.push(modType);
  return Promise.resolve({ instructions });
}

//file selection dialog for .fbmod/.archive mods
async function chooseFilesToInstall(api, files, fileExt) {
  const t = api.translate;
  return api.showDialog('question', t('Multiple {{ext}} files', { replace: { ext: fileExt } }), {
    text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: fileExt } }) +
        `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
    checkboxes: files.map((file) => {
      return {
          id: file,
          text: file,
          value: false
      };
    })
    }, [
      { label: 'Cancel' },
      { label: 'Install Selected' },
      { label: 'Install All_plural' }
  ]).then((result) => {
      if (result.action === 'Cancel')
          return Promise.reject(new util.UserCanceled('User cancelled.'));
      else {
          const installAll = (result.action === 'Install All' || result.action === 'Install All_plural');
          const installPAKS = installAll ? files : Object.keys(result.input).filter(s => result.input[s])
            .map(file => files.find(f => f === file));
          return installPAKS;
      }
  });
}

//Installer Test for .vmz files
async function testRezip(files, gameId) {
  //mod.txt file seen since Vortex extracts naked .vmz file as an archive. Repack it
  const isMod = files.some(file => MOD_FILES.includes(path.basename(file).toLowerCase()));
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

//Installer install .vmz files
async function installRezip(files, destinationPath) {
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_ID };

  //Repack .vmz files since Vortex forcibly extracts them as archives for some reason...
  const szip = new util.SevenZip();
  const modName = path.basename(destinationPath, '.installing');
  const split = modName.split('-');
  const archiveName = split[0] + REPACK_EXT;
  const archivePath = path.join(destinationPath, archiveName);
  const rootRelPaths = await fs.readdirAsync(destinationPath);
  await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
  const instructions = [{
    type: 'copy',
    source: archiveName,
    destination: path.basename(archivePath),
  }];
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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

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
  try { //separate from the block above so a ModWorkshop failure cannot suppress the GitHub check
    await checkForModWorkshopUpdate(api, spec, MWS_REQUIREMENTS);
  } catch (err) {
    log('warn', `Failed to check for ${LOADER_NAME} update: ${err}`);
  }
}

async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

/*
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
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

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
  /*await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(SAVE_PATH); //*/
  //GAME_VERSION = await setGameVersion(GAME_PATH);
  await downloadModWorkshop(api, gameSpec, MWS_REQUIREMENTS);
  await checkForModWorkshopUpdate(api, gameSpec, MWS_REQUIREMENTS).catch(() => null); //update check should never block setup
  const requirementsInstalled = await checkForRequirements(api);
  if (!requirementsInstalled) {
    await download(api, REQUIREMENTS);
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    //getGameVersion: resolveGameVersion,
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

  //register the embedded ModWorkshop browser page
  if (modworkshopBrowser) {
    registerModWorkshopBrowser(context, gameSpec, MWS_BROWSER_CONFIG);
  }

  /*register mod types explicitly
  context.registerModType(CONFIG_ID, 60,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, CONFIG_PATH), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  ); //
  context.registerModType(SAVE_ID, 60, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, SAVE_PATH), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  ); //*/
  
  /* Register a .vmz reader. This only serves api.openArchive (merges, archive inspection) -
  it does NOT make Vortex treat .vmz as a downloadable/installable archive, because that list
  (knownArchiveExt) is hardcoded in Vortex core and cannot be extended by an extension. */
  context.registerArchiveType('vmz', (fileName, options) => {
    const szip = new util.SevenZip();
    const handler = {
      readDir: (archPath) => new Promise((resolve, reject) => {
        const files = [];
        const stream = szip.list(fileName);
        stream.on('data', (data) => files.push(data.file));
        stream.on('end', () => resolve(files));
        stream.on('error', reject);
      }),
      extractAll: (outputPath) => new Promise((resolve, reject) => {
        const stream = szip.extractFull(fileName, outputPath);
        stream.on('end', resolve);
        stream.on('error', reject);
      }),
    };
    return Promise.resolve(handler);
  }); //*/

  //register mod installers
  context.registerInstaller(LOADER_ID, 25, testLoader, installLoader);
  context.registerInstaller(MCM_ID, 26, testMcm, installMcm);
  context.registerInstaller(MOD_ID, 31, testMod, (files) => installMod(context.api, files)); //unzip
  context.registerInstaller(`${MOD_ID}-rezip`, 33, testRezip, installRezip); //re-zip
  //context.registerInstaller(CONFIG_ID, 43, testConfig, installConfig);
  //context.registerInstaller(SAVE_ID, 45, testSave, installSave);
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${MCM_NAME}`, () => {
    download(context.api, [REQUIREMENTS[0]], true);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${LOADER_NAME}`, () => {
    downloadModWorkshop(context.api, spec, MWS_REQUIREMENTS, false);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Open Modworkshop Page`, () => {
    util.opn(WORKSHOP_URL).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open override.cfg', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, OVERRIDE_FILE);
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
    context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(context.api, gameId, mods, forced);
    });
    if (modworkshopBrowser) { //claims downloads started from the browse page, and update-checks the mods installed through it
      onceModWorkshopBrowser(context.api, spec, MWS_BROWSER_CONFIG);
    }
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
