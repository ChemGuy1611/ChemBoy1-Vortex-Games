/*//////////////////////////////////////////
Name: Hollow Knight: Silksong Vortex Extension
Structure: Unity BepinEx
Author: ChemBoy1
Version: 0.3.0
Date: 2026-03-29
//////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const turbowalk = require('turbowalk');
const { parseStringPromise } = require('xml2js');

const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const STEAMAPP_ID = "1030300";
const EPICAPP_ID = null;
const GOGAPP_ID = "1558393671";
const XBOXAPP_ID = "TeamCherry.HollowKnightSilksong";
const XBOXEXECNAME = "Hollow.Knight.Silksong";
const GAME_ID = "hollowknightsilksong";
const GAME_NAME = "Hollow Knight: Silksong"
const GAME_NAME_SHORT = "HK Silksong"
const EXEC = "Hollow Knight Silksong.exe";
const EXEC_XBOX = 'gamelaunchhelper.exe';
const DATA_FOLDER = "Hollow Knight Silksong_Data";
const DEV_REGSTRING = "Team Cherry";
const GAME_REGSTRING = "Hollow Knight Silksong";
const XBOX_SAVE_STRING = 'y4jvztpgccj42';
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Hollow_Knight:_Silksong";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1420";

const BEPINEX_PAGE_ID = '26';
const BEPINEX_FILE_ID = '40';
const BEPINEX_ARCH = 'x64'; // 'x64' or 'x86'
const BEPINEX_BUILD = 'unitymono'; // 'unityil2cpp' or 'unitymono' 
const BEPINEX_VERSION = '5.4.23.5'; //force BepInEx version ('5.4.23.5' or '6.0.0')
const allowBepinexNexus = false; //set false until bugs are fixed
const downloadCfgMan = true; //should BepInExConfigManager be downloaded?

let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let GAME_VERSION = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//modtypes
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";

let BEPINEX_STRING = 'mono';
if (BEPINEX_BUILD === 'unityil2cpp') {
  BEPINEX_STRING = 'il2cpp';
}
const BEPCFGMAN_ID = `${GAME_ID}-bepcfgman`;
const BEPCFGMAN_NAME = "BepInEx Configuration Manager";
const BEPCFGMAN_URL = `https://github.com/BepInEx/BepInEx.ConfigurationManager/releases/download/v18.4.1/BepInEx.ConfigurationManager_BepInEx5_v18.4.1.zip`;
const BEPCFGMAN_FILE = `configurationmanager.dll`; //lowercased

const BEPMOD_ID = `${GAME_ID}-bepmods`;
const BEPMOD_NAME = "BepinEx Mod";
const BEPMOD_PATH = path.join("BepinEx", "plugins")
const modFileExt = ".dll";

const ASSEMBLY_ID = `${GAME_ID}-assemblydll`;
const ASSEMBLY_NAME = "Assembly DLL Mod";
const ASSEMBLY_PATH = path.join(DATA_FOLDER, "Managed");
const ASSEMBLY_FILE = "Assembly-CSharp.dll";

const SKIN_ID = `${GAME_ID}-skin`;
const SKIN_NAME = "Skin Mod";
const SKIN_PATH = path.join(DATA_FOLDER, "Mods", "Customizer");
const SKIN_IGNORE_FILES = ["icon.png"];
const SKIN_EXTS = [".png"];
const SKINS_FOLDER = "Texture2D";
const SKINS_STRING = "atlas";

const MELONLOADER_ID = `${GAME_ID}-melonloader`;
const MELONLOADER_NAME = "MelonLoader";
const MELONLOADER_PATH = path.join("MelonLoader");
const MELONLOADER_FILE = "BepInEx.MelonLoader.Loader.UnityMono.dll ";
const MELONLOADER_PAGE_ID = 44;
const MELONLOADER_FILE_ID = 305;
const MELONLOADER_DOMAIN = GAME_ID;

const MELONPLUGIN_ID = `${GAME_ID}-melonplugin`;
const MELONPLUGIN_NAME = "MelonLoader Plugin";
const MELONPLUGIN_PATH = path.join("MLLoader", "Mods");
const MELPLUGIN_EXTS = ['.dll'];
const MELONPLUGIN_STRING = "MelonLoader";

//Config and save paths
const CONFIG_HIVE = 'HKEY_CURRENT_USER';
const CONFIG_REGPATH = `Software\\${DEV_REGSTRING}\\${GAME_REGSTRING}`;
const CONFIG_REGPATH_FULL = `${CONFIG_HIVE}\\${CONFIG_REGPATH}`;
const SAVE_PATH_DEFAULT = path.join(USER_HOME, 'AppData', 'LocalLow', DEV_REGSTRING, GAME_REGSTRING);
const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_${XBOX_SAVE_STRING}`, "SystemAppData", "wgs"); //XBOX Version
let SAVE_PATH = SAVE_PATH_DEFAULT;

const BEPINEXIL2CPP_BE_URL = `https://builds.bepinex.dev/projects/bepinex_be/738/BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.738%2Baf0cba7.zip`;

const LOADER_ID = `${GAME_ID}-modloader`;

const MOD_PATH_DEFAULT = ".";
const MODTYPE_FOLDERS = [BEPMOD_PATH, ASSEMBLY_PATH, SKIN_PATH];
const IGNORE_CONFLICTS = [path.join('**', 'manifest.json'), path.join('**', 'icon.png'), path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "ignoreConflicts": IGNORE_CONFLICTS,
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
    {
      "id": ASSEMBLY_ID,
      "name": ASSEMBLY_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', ASSEMBLY_PATH)
    },
    {
      "id": BEPCFGMAN_ID,
      "name": BEPCFGMAN_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', 'Bepinex')
    },
    {
      "id": BEPMOD_ID,
      "name": BEPMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPMOD_PATH)
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      XBOXAPP_ID,
      //EPICAPP_ID,
      GOGAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
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
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////

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
  /*if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam',
    });
  } //*/
  if (store === 'xbox') {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  } //*/
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

//Get correct save folder for game version
async function getSavePath(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (await statCheckAsync(GAME_PATH, EXEC_XBOX)) {
    SAVE_PATH = SAVE_PATH_XBOX;
    return SAVE_PATH;
  } else {
    SAVE_PATH = SAVE_PATH_DEFAULT;
    return SAVE_PATH;
  };
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (await statCheckAsync(gamePath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  };
  GAME_VERSION = 'default';
  return GAME_VERSION;
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

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === DATA_FOLDER));
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
  const modFile = files.find(file => (path.basename(file) === DATA_FOLDER));
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

//Test for BepinExConfigManager mod files
function testBepCfgMan(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === BEPCFGMAN_FILE));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === 'plugins'));
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

//Install BepinExConfigManager mod files
function installBepCfgMan(files) {
  const MOD_TYPE = BEPCFGMAN_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === 'plugins'));
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

//Test for Assembly mod files
function testAssembly(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === ASSEMBLY_FILE));
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
  const modFile = files.find(file => (path.basename(file) === ASSEMBLY_FILE));
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


//Test for .dll BepinEx mod files
function testBepMod(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === modFileExt));
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

//Install .dll BepinEx mod files
function installBepMod(files) {
  const MOD_TYPE = BEPMOD_ID;
  const modFile = files.find(file => (path.extname(file).toLowerCase() === modFileExt));
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

//Test for .png skin mod files
function testSkin(files, gameId) {
  const isMod = files.some(file => (
    SKIN_EXTS.includes(path.extname(file).toLowerCase())
    && path.basename(file).toLowerCase().includes(SKINS_STRING)
  ));
  const isExcluded = files.some(file => (
    path.extname(file).toLowerCase() === '.exe'
    || path.extname(file).toLowerCase() === '.dll'
    //|| SKIN_IGNORE_FILES.includes(path.basename(file).toLowerCase())
  )); //*/
  let supported = (gameId === spec.game.id) && isMod && !isExcluded;

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

//Install .png skin mod files
function installSkin(files, fileName) {
  const MOD_TYPE = SKIN_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  let modFile = files.find(file => (
    SKIN_EXTS.includes(path.extname(file).toLowerCase())
    && path.basename(file).toLowerCase().includes(SKINS_STRING)
  ));
  let rootPath = path.dirname(modFile);
  const ROOT_PATH = path.basename(rootPath);
  if (ROOT_PATH !== '.') {
    modFile = rootPath; //make the folder the targeted modFile so we can grab any other folders also in its directory
    rootPath = path.dirname(modFile);
    //const indexFolder = path.basename(modFile);
    //idx = modFile.indexOf(`${indexFolder}${path.sep}`);  //index on the folder with path separator
  } //*/
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

//Fallback installer to root folder
function testFallback(files, gameId) {
  const isPlugin = files.some(file => path.extname(file).toLowerCase() === '.dll');
  let supported = (gameId === spec.game.id) && !isPlugin;

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
            {
              label: 'Open Staging Folder', action: () => {
                util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
                dismiss();
              }
            }, //*/
            //*
            { label: `Open Mod Page`, action: () => {
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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//*
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
  //SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYCRONOUS CODE ///////////////////////////////////
  //await downloadBepinex(api, gameSpec);
  if (downloadCfgMan === true) {
    await fs.ensureDirWritableAsync(path.join(GAME_PATH, 'Bepinex')); //allows downloader to write files
    await downloadBepCfgMan(api, gameSpec);
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  context.requireExtension('modtype-bepinex'); //Require BepinEx Mod Installer extension
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
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

  //Skin modType with mergeMods
  context.registerModType(SKIN_ID, 50, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, path.join('{gamePath}', SKIN_PATH)), 
    () => Promise.resolve(false), 
    { name: SKIN_NAME,
      mergeMods: (mod) => mod.id.split('-')[0]
    } //*/
  );

  //register mod installers
  context.registerInstaller(ROOT_ID, 8, testRoot, installRoot);
  context.registerInstaller(BEPCFGMAN_ID, 9, testBepCfgMan, installBepCfgMan);
  //context.registerInstaller(BEPINEX_ID, 25, testBepinex, installBepinex);
  //context.registerInstaller(MELON_ID, 27, testMelon, installMelon);
  //context.registerInstaller(BEPMOD_ID, 29, testBepMod, installBepMod);
  //context.registerInstaller(MELONMOD_ID, 31, testMelonMod, installMelonMod);
  context.registerInstaller(ASSEMBLY_ID, 33, testAssembly, installAssembly);
  context.registerInstaller(SKIN_ID, 35, testSkin, installSkin);
  //context.registerInstaller(SAVE_ID, 47, testSave, installSave);
  context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  
  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download BepInExConfigManager', () => {
    downloadBepCfgMan(context.api, spec, false);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open BepInEx.cfg', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, 'BepinEx', 'config', 'BepInEx.cfg');
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', async () => {
    SAVE_PATH = await getSavePath(context.api);
    util.opn(SAVE_PATH).catch(() => null);
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
  context.once(() => {
    const api = context.api;
    //Download BepinEx and register with extension
    if (context.api.ext.bepinexAddGame !== undefined) {
      context.api.ext.bepinexAddGame({
        gameId: GAME_ID,
        autoDownloadBepInEx: true,
        /* <--- Download BepInEx from a Nexus Mods page. Comment out other section if using this.
        customPackDownloader: () => {
          return {
            gameId: GAME_ID, // <--- The game extension's domain Id/gameId as defined when registering the extension
            domainId: GAME_ID, // <--- Nexus Mods site domain for the BepinEx package's mod page (GAME_ID or "site")
            modId: BEPINEX_PAGE_ID, // <--- Nexus Mods site page number for the BepinEx package's mod page
            fileId: BEPINEX_FILE_ID, // <--- Get this by hovering over the download button on the site
            archiveName: `BepInEx-5.4.23.2_with_ConfigurationManager`, // <--- What we want to call the archive of the downloaded pack.
            allowAutoInstall: true, // <--- Whether we want this to be installed automatically - should always be true
          }
        }, //*/
        //* <--- Download BepinEx from GitHub. Comment out other section if using this.
        architecture: BEPINEX_ARCH, // <--- Select version for 64-bit or 32-bit game ('x64' or 'x86')
        //installRelPath: "bin/x64" // <--- Specify install location (next to game .exe) if not the root game folder (not common)
        bepinexVersion: BEPINEX_VERSION, // <--- Force BepinEx version (5.4.23.X or 6.0.0)
        forceGithubDownload: true, // <--- Force Vortex to download directly from Github (recommended)
        unityBuild: BEPINEX_BUILD, // <--- Download version 6.0.0 of BepInEx that supports IL2CPP or 5.4.23.x Mono ('unityil2cpp' or 'unitymono')
        //*/
      });
    }
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};

//Download BepInExConfigManager from GitHub
function isBepCfgManInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === BEPCFGMAN_ID);
}

async function downloadBepCfgMan(api, gameSpec, check = true) {
  let isInstalled = isBepCfgManInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = BEPCFGMAN_NAME;
    const MOD_TYPE = BEPCFGMAN_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const URL = BEPCFGMAN_URL;
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      }; //*/
      //const dlInfo = {};
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
    } catch (err) {
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/