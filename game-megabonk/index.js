/*//////////////////////////////////////////
Name: Megabonk Vortex Extension
Structure: Unity BepinEx/MelonLoader Hybrid (IL2CPP & x64)
Author: ChemBoy1
Version: 0.1.0
Date: 2025-10-15
//////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "megabonk";
const STEAMAPP_ID = "3405340";
const STEAMAPP_ID_DEMO = "3520070";
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Megabonk"
const GAME_NAME_SHORT = "Megabonk"
const EXEC = "Megabonk.exe";
const DATA_FOLDER = "Megabonk_Data";
const DEV_REGSTRING = "Ved";
const GAME_REGSTRING = "Megabonk";

let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let GAME_VERSION = '';
let bepinexInstalled = false;
let melonInstalled = false;

//info for modtypes, installers, and tools
const BEPINEX_ID = `${GAME_ID}-bepinex`;
const BEPINEX_NAME = "BepInEx Injector";
const BEPINEX_URL = `https://builds.bepinex.dev/projects/bepinex_be/738/BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.738%2Baf0cba7.zip`;
const BEPINEX_URL_ERR = `https://builds.bepinex.dev/projects/bepinex_be`;
const BEPINEX_ZIP = 'BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.738+af0cba7.zip';
const BEPINEX_FILE = 'BepInEx.Core.dll';
const BEPINEX_FOLDER = 'BepInEx';
const BEP_STRING = 'BepInEx';
const BEP_PATCHER_STRING = 'BaseUnityPlugin';

const MELON_ID = `${GAME_ID}-melonloader`;
const MELON_NAME = "MelonLoader";
const MELON_URL = `https://github.com/LavaGang/MelonLoader/releases/latest/download/MelonLoader.x64.zip`;
const MELON_URL_ERR = `https://github.com/LavaGang/MelonLoader/releases`;
const MELON_ZIP = 'MelonLoader.x64.zip';
const MELON_FILE = 'MelonLoader.dll';
const MELON_FOLDER = 'MelonLoader';
const MEL_STRING = 'MelonLoader';
const MEL_PLUGIN_STRING = 'MelonPlugin';

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";

const BEPCFGMAN_ID = `${GAME_ID}-bepcfgman`;
const BEPCFGMAN_NAME = "BepInEx Configuration Manager";
const BEPCFGMAN_PATH = 'Bepinex';
const BEPCFGMAN_URL = `https://github.com/sinai-dev/BepInExConfigManager/releases/latest/download/BepInExConfigManager.il2cpp.zip`;
const BEPCFGMAN_FILE = `bepinexconfigmanager.il2cpp.dll`; //lowercased

const ASSEMBLY_ID = `${GAME_ID}-assemblydll`;
const ASSEMBLY_NAME = "Assembly DLL Mod";
const ASSEMBLY_PATH = '.';
const ASSEMBLY_FILE= "GameAssembly.dll";

//Config and save paths
const CONFIG_HIVE = 'HKEY_CURRENT_USER';
const CONFIG_REGPATH = `Software\\${DEV_REGSTRING}\\${GAME_REGSTRING}`;
const CONFIG_REGPATH_FULL = `${CONFIG_HIVE}\\${CONFIG_REGPATH}`;

const SAVE_FOLDER_DEFAULT = path.join(USER_HOME, 'AppData', 'LocalLow', DEV_REGSTRING, GAME_REGSTRING, 'Saves', 'CloudDir');
let USERID_FOLDER = "";
try {
  const ARRAY = fs.readdirSync(SAVE_FOLDER_DEFAULT);
  USERID_FOLDER = ARRAY[0];
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
}
let SAVE_PATH = path.join(SAVE_FOLDER_DEFAULT, USERID_FOLDER);
const SAVE_EXTS = [".json"];

const ASSETS_ID = `${GAME_ID}-assets`;
const ASSETS_NAME = "Assets/Resources File";
const ASSETS_PATH = DATA_FOLDER;
const ASSETS_EXTS = ['.assets', '.resource', '.ress'];

const PLUGIN_EXTS = ['.dll'];

const BEPINEX_MOD_ID = `${GAME_ID}-bepinexmod`;
const BEPINEX_MOD_NAME = "BepInEx Mod";
const BEPINEX_MOD_PATH = BEPINEX_FOLDER;
const BEPINEX_MOD_FOLDERS = ['plugins', 'patchers', 'config'];

const MELON_MOD_ID = `${GAME_ID}-melonmod`;
const MELON_MOD_NAME = "MelonLoader Mod";
const MELON_MOD_PATH = '.';
const MELON_MOD_FOLDERS = ['mods', 'plugins', 'userdata', 'userlibs'];

const BEPINEX_PLUGINS_ID = `${GAME_ID}-bepinex-plugins`;
const BEPINEX_PLUGINS_NAME = "BepInEx Plugins";
const BEPINEX_PLUGINS_FOLDER = 'plugins';
const BEPINEX_PLUGINS_PATH = path.join(BEPINEX_FOLDER, BEPINEX_PLUGINS_FOLDER);

const BEPINEX_PATCHERS_ID = `${GAME_ID}-bepinex-patchers`;
const BEPINEX_PATCHERS_NAME = "BepInEx Patchers";
const BEPINEX_PATCHERS_FOLDER = 'patchers';
const BEPINEX_PATCHERS_PATH = path.join(BEPINEX_FOLDER, BEPINEX_PATCHERS_FOLDER);

const BEPINEX_CONFIG_ID = `${GAME_ID}-bepinex-config`;
const BEPINEX_CONFIG_NAME = "BepInEx Config";
const BEPINEX_CONFIG_FOLDER = 'config';
const BEPINEX_CONFIG_PATH = path.join(BEPINEX_FOLDER, BEPINEX_CONFIG_FOLDER);

const MELON_MODS_ID = `${GAME_ID}-melonloader-mods`;
const MELON_MODS_NAME = "MelonLoader Mods";
const MELON_MODS_FOLDER = 'Mods';
const MELON_MODS_PATH = MELON_MODS_FOLDER;

const MELON_PLUGINS_ID = `${GAME_ID}-melonloader-plugins`;
const MELON_PLUGINS_NAME = "MelonLoader Plugins";
const MELON_PLUGINS_FOLDER = 'Plugins';
const MELON_PLUGINS_PATH = MELON_PLUGINS_FOLDER;

const MELON_CONFIG_ID = `${GAME_ID}-melonloader-config`;
const MELON_CONFIG_NAME = "MelonLoader Config";
const MELON_CONFIG_FOLDER = 'UserData';
const MELON_CONFIG_PATH = MELON_CONFIG_FOLDER;

const MOD_PATH_DEFAULT = ".";
const MODTYPE_FOLDERS = [ASSEMBLY_PATH, ASSETS_PATH, BEPINEX_PATCHERS_PATH, BEPINEX_PLUGINS_PATH, BEPINEX_CONFIG_PATH, MELON_PLUGINS_PATH, MELON_MODS_PATH, MELON_CONFIG_PATH];
const IGNORE_CONFLICTS = [path.join('**', 'manifest.json'), path.join('**', 'icon.png'), path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    //"parameters": [],
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": BEPINEX_MOD_ID,
      "name": BEPINEX_MOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPINEX_MOD_PATH)
    },
    {
      "id": MELON_MOD_ID,
      "name": MELON_MOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MELON_MOD_PATH)
    }, //*/
    {
      "id": BEPINEX_PLUGINS_ID,
      "name": BEPINEX_PLUGINS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPINEX_PLUGINS_PATH)
    },
    {
      "id": BEPINEX_PATCHERS_ID,
      "name": BEPINEX_PATCHERS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPINEX_PATCHERS_PATH)
    },
    {
      "id": BEPINEX_CONFIG_ID,
      "name": BEPINEX_CONFIG_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPINEX_CONFIG_PATH)
    },
    {
      "id": MELON_PLUGINS_ID,
      "name": MELON_PLUGINS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MELON_PLUGINS_PATH)
    },
    {
      "id": MELON_MODS_ID,
      "name": MELON_MODS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MELON_MODS_PATH)
    },
    {
      "id": MELON_CONFIG_ID,
      "name": MELON_CONFIG_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MELON_CONFIG_PATH)
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
      "targetPath": path.join('{gamePath}', BEPCFGMAN_PATH)
    },
    {
      "id": ASSETS_ID,
      "name": ASSETS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', ASSETS_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": BEPINEX_ID,
      "name": BEPINEX_NAME,
      "priority": "low",
      "targetPath": '{gamePath}'
    },
    {
      "id": MELON_ID,
      "name": MELON_NAME,
      "priority": "low",
      "targetPath": '{gamePath}'
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
  /*
  if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
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

//Test for BepinEx files
function testBepinex(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === BEPINEX_FILE));
  const isFolder = files.some(file => (path.basename(file) === BEPINEX_FOLDER));
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

//Install BepInEx files
function installBepinex(files) {
  const MOD_TYPE = BEPINEX_ID;
  const modFile = files.find(file => (path.basename(file) === BEPINEX_FOLDER));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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

//Test for MelonLoader files
function testMelon(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === MELON_FILE));
  const isFolder = files.some(file => (path.basename(file) === MELON_FOLDER));
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

//Install MelonLoader files
function installMelon(files) {
  const MOD_TYPE = MELON_ID;
  const modFile = files.find(file => (path.basename(file) === MELON_FOLDER));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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

//Installer Test for plugin files
function testPlugin(files, gameId) {
  const isMod = files.some(file => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install plugin files
async function installPlugin(api, gameSpec, files, workingDir) {
  const modFile = files.find(file => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
  let idx = modFile.indexOf(path.basename(modFile));
  let rootPath = path.dirname(modFile);
  let setModTypeInstruction = {};
  const MOD_NAME = path.basename(workingDir).replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*/gi, '');

  // logic to parse dll files to determine if they are MelonLoader plugins or BepInEx plugins
  let isBepinex = false;
  let isBepinexPatcher = false;
  let isMelon = false;
  let isMelonPlugin = false;
  bepinexInstalled = isBepinexInstalled(api, gameSpec);
  melonInstalled = isMelonInstalled(api, gameSpec);

  // detect plugin types by reading DLL contents
  await Promise.all(files.map(async file => {
    if (PLUGIN_EXTS.includes(path.extname(file).toLowerCase())) {
      try {
        const content = await fs.readFileAsync(path.join(workingDir, file), 'utf8');
        if (content.includes(BEP_STRING)) {
            isBepinex = true;
            isBepinexPatcher = false; //temporary, find reliable string to id patchers
            //isBepinexPatcher = !content.includes(BEP_PATCHER_STRING) && !files.find(file => path.extname(file).toLowerCase() = BEPINEX_PLUGINS_FOLDER);
        } else if (content.includes(MEL_STRING)) {
          isMelon = true;
          isMelonPlugin = content.includes(MEL_PLUGIN_STRING);
        }
      } catch (err) {
        api.showErrorNotification(`Failed to read mod file "${file}" to determine if for BepInEx or MelonLoader`, err);
      }
    }
  }));

  // CANCEL INSTALL CONDITIONS
  // If both BepInEx and MelonLoader plugins are detected, cancel install
  if (isBepinex && isMelon) {
    const mixedModHandling = await api.showDialog('error', 'Mixed Mod Detected', {
        bbcode: api.translate(`Vortex has detected that the ${MOD_NAME} archive has both BepInEx and MelonLoader plugins in the same archive.[br][/br][br][/br]`
            + `Mixed mods are not supported by the game extension and the mod author will need to repackage their mod.[br][/br][br][/br]`
            + `You can manually extract the correct plugin from the archive and install it to Vortex.[br][/br][br][/br]`),
        options: { order: ['bbcode'], wrap: true },
    }, [
        { label: 'Ok' }
    ]);
    if (mixedModHandling.action === 'Ok') {
        throw new util.UserCanceled();
    }
  }
  //if BepInEx plugin is installed while using MelonLoader, cancel install
  if (isBepinex && melonInstalled) {
    const wrongLoader = await api.showDialog('error', 'Wrong Mod Loader', {
        bbcode: api.translate(`Vortex has detected that the ${MOD_NAME} archive has BepInEx plugins, but you have installed MelonLoader.[br][/br][br][/br]`
            + `The installation will be cancelled to avoid issues.[br][/br][br][/br]`
            + `Check the mod's page to see if there is a MelonLoader version of the mod, or change your mod loader to BepInEx.[br][/br][br][/br]`),
        options: { order: ['bbcode'], wrap: true },
    }, [
        { label: 'Ok' }
    ]);
    if (wrongLoader.action === 'Ok') {
        throw new util.UserCanceled();
    }
  }
  //if MelonLoader plugin is installed while using BepInEx, cancel install
  if (isMelon && bepinexInstalled) {
    const wrongLoader = await api.showDialog('error', 'Wrong Mod Loader', {
        bbcode: api.translate(`Vortex has detected that the ${MOD_NAME} archive has MelonLoader plugins, but you have installed BepInEx.[br][/br][br][/br]`
            + `The installation will be cancelled to avoid issues.[br][/br][br][/br]` 
            + `Check the mod's page to see if there is a BepInEx version of the mod, or change your mod loader to MelonLoader.[br][/br][br][/br]`),
        options: { order: ['bbcode'], wrap: true },
    }, [
        { label: 'Ok' }
    ]);
    if (wrongLoader.action === 'Ok') {
        throw new util.UserCanceled();
    }
  }

  // Install method that attempts to index on folders, then dll files
  if (isBepinex && !isBepinexPatcher) {
    setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_MOD_ID };
    const folder = files.find(file => BEPINEX_MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
    if (folder !== undefined) {
      idx = folder.indexOf(`${path.basename(folder)}${path.sep}`);
      rootPath = path.dirname(folder);
    }
    if (folder === undefined) {
      setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_PLUGINS_ID };
    }
  }

  if (isBepinex && isBepinexPatcher) {
    setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_MOD_ID };
    const folder = files.find(file => BEPINEX_MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
    if (folder !== undefined) {
      idx = folder.indexOf(`${path.basename(folder)}${path.sep}`);
      rootPath = path.dirname(folder);
    }
    if (folder === undefined) {
      setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_PATCHERS_ID };
    }
  }

  if (isMelon && !isMelonPlugin) {
    setModTypeInstruction = { type: 'setmodtype', value: MELON_MOD_ID };
    const folder = files.find(file => MELON_MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
    if (folder !== undefined) {
      idx = folder.indexOf(`${path.basename(folder)}${path.sep}`);
      rootPath = path.dirname(folder);
    }
    if (folder === undefined) {
      setModTypeInstruction = { type: 'setmodtype', value: MELON_MODS_ID };
    }
  }

  if (isMelon && isMelonPlugin) {
    setModTypeInstruction = { type: 'setmodtype', value: MELON_MOD_ID };
    const folder = files.find(file => MELON_MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
    if (folder !== undefined) {
      idx = folder.indexOf(`${path.basename(folder)}${path.sep}`);
      rootPath = path.dirname(folder);
    }
    if (folder === undefined) {
      setModTypeInstruction = { type: 'setmodtype', value: MELON_PLUGINS_ID };
    }
  } //*/


  /* NORMAL INSTALL - Assign mod types
  if (isBepinex && !isBepinexPatcher) {
    setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_PLUGINS_ID };
  }
  if (isBepinex && isBepinexPatcher) {
    setModTypeInstruction = { type: 'setmodtype', value: BEPINEX_PATCHERS_ID };
  }
  if (isMelon && !isMelonPlugin) {
    setModTypeInstruction = { type: 'setmodtype', value: MELON_MODS_ID };
  }
  if (isMelon && isMelonPlugin) {
    setModTypeInstruction = { type: 'setmodtype', value: MELON_PLUGINS_ID };
  } //*/

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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Function to choose mod loader
async function chooseModLoader(api, gameSpec) {
  const t = api.translate;
  const replace = {
    game: gameSpec.game.name,
    bl: '[br][/br][br][/br]',
  };
  return api.showDialog('info', 'Mod Loader Selection', {
    bbcode: t('You must choose between BepInEx and MelonLoader to install mods.{{bl}}'
      + 'Only one mod loader can be installed at a time.{{bl}}'
      + 'Make your choice based on which mods you would like to install and which loader they support.{{bl}}'
      + 'You can change which mod loader you have installed by Uninstalling the current one from Vortex, which will bring up this dialog again.{{bl}}'
      + 'Which mod loader would you like to use for {{game}}?', 
      { replace }
    ),
  }, [
    { label: t('BepInEx') },
    { label: t('MelonLoader') },
  ])
  .then(async (result) => {
    if (result === undefined) {
      return;
    }
    if (result.action === 'BepInEx') {
      await downloadBepinex(api, gameSpec);
    } else if (result.action === 'MelonLoader') {
      await downloadMelon(api, gameSpec);
    }
  });
}

//Deconflict mod loaders
async function deconflictModLoaders(api, gameSpec) {
  const t = api.translate;
  const replace = {
    game: gameSpec.game.name,
    bl: '[br][/br][br][/br]',
  };
  return api.showDialog('info', 'Mod Loader Conflict', {
    bbcode: t('You have both BepInEx and MelonLoader installed.{{bl}}'
      + 'This will cause the game to crash at launch. Only one mod loader can be installed at a time.{{bl}}'
      + 'You must choose which mod loader you would like to use for {{game}}.', 
      { replace }
    ),
  }, [
    { label: t('BepInEx') },
    { label: t('MelonLoader') },
  ])
  .then(async (result) => {
    if (result === undefined) {
      return;
    }
    if (result.action === 'BepInEx') {
      await removeMelon(api, gameSpec);
    } else if (result.action === 'MelonLoader') {
      await removeBepinex(api, gameSpec);
    }
  });
}

async function removeBepinex(api, gameSpec) {
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const mod = Object.keys(mods).find(id => mods[id]?.type === BEPINEX_ID);
  const modId = mods[mod].id
  log('warn', `Found BepInEx mod to remove for deconfliction: ${modId}`);
  try {
    await util.removeMods(api, gameSpec.game.id, [modId]);
  } catch (err) {
    api.showErrorNotification('Failed to remove BepInEx', err);
  }
}

async function removeMelon(api, gameSpec) {
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const mod = Object.keys(mods).find(id => mods[id]?.type === MELON_ID);
  const modId = mods[mod].id
  log('warn', `Found MelonLoader mod to remove for deconfliction: ${modId}`);
  try {
    await util.removeMods(api, gameSpec.game.id, [modId]);
  } catch (err) {
    api.showErrorNotification('Failed to remove MelonLoader', err);
  }
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
  bepinexInstalled = isBepinexInstalled(api, gameSpec);
  melonInstalled = isMelonInstalled(api, gameSpec);
  // ASYNC CODE ///////////////////////////////////
  if (!bepinexInstalled && !melonInstalled) {
    await chooseModLoader(api, gameSpec); //dialog to choose mod loader
  }
  if (bepinexInstalled && melonInstalled) {
    await deconflictModLoaders(api, gameSpec); //deconflict if both mod loaders are installed
  } //*/
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = { //register game
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
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

  //register mod installers
  context.registerInstaller(BEPINEX_ID, 25, testBepinex, installBepinex);
  context.registerInstaller(MELON_ID, 26, testMelon, installMelon);
  context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  context.registerInstaller(BEPCFGMAN_ID, 29, testBepCfgMan, installBepCfgMan);
  context.registerInstaller(ASSEMBLY_ID, 31, testAssembly, installAssembly);
  context.registerInstaller(`${GAME_ID}-plugin`, 33, testPlugin, (files, workingDir) => installPlugin(context.api, gameSpec, files, workingDir));
  context.registerInstaller(ASSETS_ID, 37, testAssets, installAssets);
  //context.registerInstaller(SAVE_ID, 49, testSave, installSave); //best to only enable if saves are stored in the game's folder
  
  //register actions
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
    const openPath = SAVE_PATH;
    util.opn(openPath).catch(() => null);
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

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => { 
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      bepinexInstalled = isBepinexInstalled(context.api, spec);
      melonInstalled = isMelonInstalled(context.api, spec);
      if (!bepinexInstalled && !melonInstalled) {
        await chooseModLoader(context.api, spec); //dialog to choose mod loader
      }
      if (bepinexInstalled && melonInstalled) {
        await deconflictModLoaders(context.api, spec); //deconflict if both mod loaders are installed
      } //*/
    });
  });
  return true;
}

// Test if BepInEx is installed
function isBepinexInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === BEPINEX_ID);
}

// Test if MelonLoader is installed
function isMelonInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MELON_ID);
}

// Download BepInEx
async function downloadBepinex(api, gameSpec) {
  let isInstalled = isBepinexInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = BEPINEX_NAME;
    const MOD_TYPE = BEPINEX_ID;
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
      const URL = BEPINEX_URL;
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
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
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = BEPINEX_URL_ERR;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// Download MelonLoader
async function downloadMelon(api, gameSpec) {
  let isInstalled = isMelonInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MELON_NAME;
    const MOD_TYPE = MELON_ID;
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
      const URL = MELON_URL;
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
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
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = MELON_URL_ERR;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//export to Vortex
module.exports = {
  default: main,
};
