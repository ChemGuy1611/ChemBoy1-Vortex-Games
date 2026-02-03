/*/////////////////////////////////////////
Name: Borderlands 2 Vortex Extension
Structure: UE2/3 Game (TFC Installer)
Author: ChemBoy1
Version: 0.3.5
Date: 2025-11-16
/////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const turbowalk = require('turbowalk');
//const winapi = require('winapi-bindings');

//const USER_HOME = util.getVortexPath("home");
const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath('appData');
//const LOCALAPPDATA = util.getVortexPath('localAppData');

//Specify all the information about the game
const GAME_ID = "borderlands2";
const STEAMAPP_ID = "49520";
const EPICAPP_ID = "Dodo";
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Borderlands 2";
const GAME_NAME_SHORT = "Borderlands 2";
const EPIC_CODE_NAME = "WillowGame";

const SPECIAL_TFCMOD_FOLDERS = [];

const ROOT_FOLDERS = [EPIC_CODE_NAME, 'Engine', 'Binaries', 'DLC'];
const COOKED_FOLDER = 'CookedPCConsole';
const ROOTSUB_FOLDERS = ['Config', COOKED_FOLDER, 'Localization', 'Movies', 'Splash'];
const COOKEDSUB_FOLDERS = [ 'English(US)'];
const BINARIES_PATH = path.join("Binaries", "Win32");
const EXEC_NAME = "Borderlands2.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const EXEC_XBOX = 'gamelaunchhelper.exe';
const DATA_FOLDER = path.join('Borderlands 2', EPIC_CODE_NAME);

let GAME_PATH = null; //patched in the setup function to the discovered game path
let STAGING_FOLDER = ''; //Vortex staging folder path
let DOWNLOAD_FOLDER = ''; //Vortex download folder path

//Information for mod types and installers
const TFC_ID = `${GAME_ID}-tfcinstaller`;
const TFC_NAME = "TFC Installer";
const TFC_EXEC = "tfcinstaller.exe";
const TFC_FOLDER = "TFCInstaller";
const TFC_PATH = '.';
const TFC_PAGE_NO = 588;
const TFC_FILE_NO = 5717;

const UPKEXPLORER_ID = `${GAME_ID}-tfcexplorer`;
const UPKEXPLORER_NAME = "UPK Explorer";
const UPKEXPLORER_EXEC = "upk explorer.exe";
const UPKEXPLORER_FOLDER = "UPK Explorer";
const UPKEXPLORER_PATH = path.join('.');

const TFCMOD_ID = `${GAME_ID}-tfcmod`;
const TFCMOD_NAME = "TFC Mod";
const TFCMOD_EXTS = ['.packagepatch', '.descriptor', '.tfcmapping', '.inipatch'];
const TFCMOD_FILES = ['gameprofile.xml', 'gameprofile.idremappings.xml', 'objectdescriptors.xml', 'packageextensions.xml', `texturepack`, 'game'];
const TFCMOD_PATH = path.join(TFC_FOLDER, 'Mods');

const BLCMM_ID = `${GAME_ID}-blcmm`;
const BLCMM_NAME = "OpenBLCMM";
const BLCMM_PATH = '.';
const BLCMM_EXEC = 'openblcmm.exe';
const BLCMM_URL = `https://github.com/BLCM/OpenBLCMM/releases/download/v1.4.1/OpenBLCMM-1.4.1-Windows.zip`;

const BLCMMMOD_ID = `${GAME_ID}-blcmmmod`;
const BLCMMMOD_NAME = "BLCMM Mod";
const BLCMMMOD_EXT = '.txt';
const BLCMMMOD_PATH = '.';

const BLCMFILE_ID = `${GAME_ID}-blcmfile`;
const BLCMFILE_NAME = ".blcm file (OpenBLCMM)";
const BLCMFILE_EXT = '.blcm';
const BLCMFILE_PATH = 'Binaries';

const SDK_ID = `${GAME_ID}-sdk`;
const SDK_NAME = "Python SDK";
const SDK_FOLDER = "sdk_mods";
const SDK_DLL = "unrealsdk.dll";
const SDK_PATH = '.';
const SDK_URL = `https://github.com/bl-sdk/willow2-mod-manager/releases/latest/download/willow2-sdk.zip`;
const SDK_URL_ERR = `https://github.com/bl-sdk/willow2-mod-manager/releases`;

const SDKMOD_ID = `${GAME_ID}-sdkmod`;
const SDKMOD_NAME = "SDK Mod";
const SDKMOD_EXT = '.py';
const SDKMOD_EXT2 = '.sdkmod';
const SDKMOD_PATH = SDK_FOLDER;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const ROOTSUB_ID = `${GAME_ID}-rootsub`;
const ROOTSUB_NAME = "Root Sub Folder";
const ROOTSUB_PATH = path.join(EPIC_CODE_NAME);

const COOKEDSUB_ID = `${GAME_ID}-cookedsub`;
const COOKEDSUB_NAME = "Cooked Sub Folder";
const COOKEDSUB_PATH = path.join(ROOTSUB_PATH, COOKED_FOLDER);
const COOKEDSUB_EXTS = ['.tfc', '.upk', '.pck'];

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
const BINARIES_FILES = [EXEC_NAME];
const BINARIES_EXTS = ['.dll'];

const MOVIES_ID = `${GAME_ID}-movies`;
const MOVIES_NAME = "Movies";
const MOVIES_PATH = path.join(EPIC_CODE_NAME, 'Movies');
const MOVIES_EXT = '.bik';

const CONFIG_PATH = path.join(DOCUMENTS, 'My Games', DATA_FOLDER, 'Config');
const SAVE_PATH = path.join(DOCUMENTS, 'My Games', DATA_FOLDER, 'SaveData');

const SAVEEDITOR_ID = `${GAME_ID}-saveeditor`;
const SAVEEDITOR_NAME = "Save Editor";
const SAVEEDITOR_EXEC = 'Gibbed.Borderlands2.SaveEdit.exe';

const REQ_FILE = EXEC;
const MODTYPE_FOLDERS = [TFCMOD_PATH, SDKMOD_PATH, MOVIES_PATH, BINARIES_PATH];
const IGNORE_CONFLICTS = [path.join('**', 'LICENSE.txt'), path.join('**', 'instructions.txt'), path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Filled in from the data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiresCleanup": true,
    "requiredFiles": [
      REQ_FILE
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
      "id": BLCMM_ID,
      "name": BLCMM_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BLCMM_PATH)
    },
    {
      "id": BLCMMMOD_ID,
      "name": BLCMMMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BLCMMMOD_PATH)
    },
    {
      "id": BLCMFILE_ID,
      "name": BLCMFILE_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BLCMFILE_PATH)
    },
    {
      "id": SDK_ID,
      "name": SDK_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', SDK_PATH)
    },
    {
      "id": SDKMOD_ID,
      "name": SDKMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', SDKMOD_PATH)
    },
    {
      "id": TFCMOD_ID,
      "name": TFCMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', TFCMOD_PATH)
    },
    {
      "id": TFCMOD_ID,
      "name": TFCMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', TFCMOD_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    { 
      "id": ROOTSUB_ID,
      "name": ROOTSUB_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', ROOTSUB_PATH)
    },
    { 
      "id": COOKEDSUB_ID,
      "name": COOKEDSUB_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', COOKEDSUB_PATH)
    },
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${BINARIES_PATH}`
    },
    {
      "id": MOVIES_ID,
      "name": MOVIES_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MOVIES_PATH}`
    },
    {
      "id": TFC_ID,
      "name": TFC_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${TFC_PATH}`
    },
    {
      "id": UPKEXPLORER_ID,
      "name": UPKEXPLORER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${UPKEXPLORER_PATH}`
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
  {
    id: BLCMM_ID,
    name: BLCMM_NAME,
    logo: "blcmm.png",
    executable: () => BLCMM_EXEC,
    requiredFiles: [BLCMM_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
  },
  {
    id: TFC_ID,
    name: TFC_NAME,
    logo: "tfc.png",
    executable: () => TFC_EXEC,
    requiredFiles: [TFC_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
  {
    id: SAVEEDITOR_ID,
    name: SAVEEDITOR_NAME,
    logo: "editor.png",
    executable: () => SAVEEDITOR_EXEC,
    requiredFiles: [SAVEEDITOR_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
  },
  {
    id: UPKEXPLORER_ID,
    name: UPKEXPLORER_NAME,
    logo: "tfc.png",
    executable: () => UPKEXPLORER_EXEC,
    requiredFiles: [UPKEXPLORER_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
  },
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
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
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

//set launcher requirements
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
      addInfo: {
        appId: STEAM_ID,
        //parameters: PARAMETERS,
        //launchType: 'gamestore',
      } //
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct shipping executable for game version
function getExecutable(gamePath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(gamePath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    return EXEC_XBOX; 
  };

  return EXEC;
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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if TFC is installed
function isTfcInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === TFC_ID);
}

//Check if BLCMM is installed
function isBlcmmInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === BLCMM_ID);
}

//Check if SDK is installed
function isSdkInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === SDK_ID);
}

//* Function to auto-download TFC from Nexus Mods
async function downloadTfc(api, gameSpec) {
  let isInstalled = isTfcInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = TFC_NAME;
    const MOD_TYPE = TFC_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    let FILE_ID = TFC_FILE_NO;  //If using a specific file id because "input" below gives an error
    const PAGE_ID = TFC_PAGE_NO;
    const GAME_DOMAIN = 'site';
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
      let FILE = FILE_ID; //use the FILE_ID directly for the correct game store version
      let URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
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
      } //*/
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

//* Function to auto-download Hotfix Merger from Nexus Mods
async function downloadBlcmm(api, gameSpec) {
  let isInstalled = isBlcmmInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = BLCMM_NAME;
    const MOD_TYPE = BLCMM_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = BLCMM_URL;
    const ERR_URL = `https://github.com/BLCM/OpenBLCMM/releases/`;
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

//* Function to auto-download Hotfix Merger from Nexus Mods
async function downloadSdk(api, gameSpec) {
  let isInstalled = isSdkInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = SDK_NAME;
    const MOD_TYPE = SDK_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = SDK_URL;
    const ERR_URL = SDK_URL_ERR;
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testTfc(files, gameId) {
  const isTFC = files.some(file => (path.basename(file).toLowerCase() === TFC_EXEC));
  let supported = (gameId === spec.game.id) && isTFC;

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

//Installer install Fluffy Mod Manger files
function installTfc(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === TFC_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: TFC_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(TFC_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for Fluffy Mod Manager files
function testBlcmm(files, gameId) {
  const isTFC = files.some(file => (path.basename(file).toLowerCase() === BLCMM_EXEC));
  let supported = (gameId === spec.game.id) && isTFC;

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

//Installer install Fluffy Mod Manger files
function installBlcmm(files) {
  const MOD_TYPE = BLCMM_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === BLCMM_EXEC));
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

//Installer test for Fluffy Mod Manager files
function testUpkExplorer(files, gameId) {
  const isUpk = files.some(file => (path.basename(file).toLowerCase() === UPKEXPLORER_EXEC));
  let supported = (gameId === spec.game.id) && isUpk;

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

//Installer install Fluffy Mod Manger files
function installUpkExplorer(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === UPKEXPLORER_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UPKEXPLORER_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(UPKEXPLORER_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test Fallback installer for TFC Mods
function testTfcMod(files, gameId) {
  const isExt = files.some(file => TFCMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const isFile = files.some(file => TFCMOD_FILES.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isExt || isFile );

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

//Installer for TFC Mods
function installTfcMod(files, fileName) {
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  const setModTypeInstruction = { type: 'setmodtype', value: TFCMOD_ID };
  let modFile = files.find(file => TFCMOD_FILES.includes(path.basename(file).toLowerCase())); //try files first
  if (modFile === undefined) {
    modFile = files.find(file => TFCMOD_EXTS.includes(path.extname(file).toLowerCase())); //exts fallback
  }
  //let idx = modFile.indexOf(path.basename(modFile));
  let rootPath = path.dirname(modFile);
  const ROOT_PATH = path.basename(rootPath);
  if (ROOT_PATH !== '.') {
    MOD_FOLDER = '.'; //no top level folder needed if it's already included in the archive
    modFile = rootPath; //make the folder the targeted modFile so we can grab any other folders also in its directory
    rootPath = path.dirname(modFile);
    /*const indexFolder = path.basename(modFile); //index to catch other folders in the same directory
    //idx = modFile.indexOf(`${indexFolder}${path.sep}`); //index on the folder with path separator //*/
  }
  //these are special cases for mods that have multiple levels of folders in the archive
  if (files.some(file => SPECIAL_TFCMOD_FOLDERS.includes(path.basename(file)))) {
    modFile = files.find(file => SPECIAL_TFCMOD_FOLDERS.includes(path.basename(file)));
    rootPath = path.dirname(modFile);
    /*const indexFolder = path.basename(modFile); //index to catch other folders in the same directory
    //idx = modFile.indexOf(`${indexFolder}${path.sep}`); //index on the folder with path separator //*/
  }
  const idx = modFile.indexOf(path.basename(modFile));

  // Remove empty directories and anything that isn't in the rootPath
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

//Test .blcm files
function testBlcmFile(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === BLCMFILE_EXT));
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

//Install .blcm files
function installBlcmFile(files) {
  const MOD_TYPE = BLCMFILE_ID;
  const modFile = files.find(file => (path.extname(file).toLowerCase() === BLCMFILE_EXT));
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
      destination: path.join(file),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for Fluffy Mod Manager files
function testSdk(files, gameId) {
  const isFile = files.some(file => (path.basename(file).toLowerCase() === SDK_DLL));
  const isFolder = files.some(file => (path.basename(file).toLowerCase() === SDK_FOLDER));
  let supported = (gameId === spec.game.id) && isFile && isFolder;

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

//Installer install Fluffy Mod Manger files
function installSdk(files) {
  const MOD_TYPE = SDK_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === SDK_FOLDER));
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

//Test Fallback installer for SDK Mods
function testSdkMod(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SDKMOD_EXT));
  const isMod2 = files.some(file => (path.extname(file).toLowerCase() === SDKMOD_EXT2));
  let supported = (gameId === spec.game.id) && (isMod || isMod2);

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

//Fallback installer for SDK Mods
function installSdkMod(files, fileName) {
  const MOD_TYPE = SDKMOD_ID;
  let modFile = files.find(file => (path.extname(file).toLowerCase() === SDKMOD_EXT2));
  if (modFile === undefined) {
    modFile = files.find(file => (path.extname(file).toLowerCase() === SDKMOD_EXT));
  }
  let MOD_FOLDER = '.';
  const idx = modFile.indexOf(path.basename(modFile));
  const ROOT_PATH = path.basename(path.dirname(modFile));
  const MOD_NAME = path.basename(fileName);
  if (ROOT_PATH === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  }
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  
  // Remove empty directories
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );

  let instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file),
    };
  });
  if ((path.extname(modFile).toLowerCase() === SDKMOD_EXT2)) { //index to .sdkmod file if it exists
    instructions = filtered.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.join(file.substr(idx)),
      };
    });
  }

  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
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
  let modFile = files.find(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  let setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };
  if (modFile === undefined) {
    modFile = files.find(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    setModTypeInstruction = { type: 'setmodtype', value: ROOTSUB_ID };
  }
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);

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

//Installer test for CookedPC folders/files
function testCookedSub(files, gameId) {
  const isFolder = files.some(file => COOKEDSUB_FOLDERS.includes(path.basename(file)));
  const isExt = files.some(file => COOKEDSUB_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isFolder || isExt );

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

//Installer install CookedPC folders/files
function installCookedSub(files) {
  let modFile = files.find(file => COOKEDSUB_FOLDERS.includes(path.basename(file)));
  let idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  if (modFile === undefined) {
    modFile = files.find(file => COOKEDSUB_EXTS.includes(path.extname(file).toLowerCase()));
    idx = modFile.indexOf(path.basename(modFile));
  }
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: COOKEDSUB_ID };

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

//Test .bik files
function testMovies(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === MOVIES_EXT));
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

//Install .bik files
function installMovies(files) {
  const MOD_TYPE = MOVIES_ID;
  const modFile = files.find(file => (path.extname(file).toLowerCase() === MOVIES_EXT));
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

//Installer test for Root folder files
function testBinaries(files, gameId) {
  const isFile = files.some(file => BINARIES_FILES.includes(path.basename(file)));
  const isExt = files.some(file => BINARIES_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isFile || isExt );

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
function installBinaries(files) {
  let modFile = files.find(file => BINARIES_FILES.includes(path.basename(file)));
  if (modFile === undefined) {
    modFile = files.find(file => BINARIES_EXTS.includes(path.extname(file).toLowerCase()));
  }
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };

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

// MAIN EXTENSION FUNCTION /////////////////////////////////////////////////////

//Notify User of Setup instructions for TFC Installer
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup`;
  const MOD_NAME = `BLCMM and TFC`;
  const MESSAGE = `${MOD_NAME} Setup Required`;
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
            text: `The ${MOD_NAME} tools downloaded by this extension each requires setup.\n`
                + `Please launch each tool to set the Game Folder, patch the executable, etc.\n`
                + `\n`
                + `TFC Installer:\n`
                + `TFC mods will be found at this folder: "${TFC_FOLDER}\\Mods".\n`
                + `\n`
                + `BLCMM:\n`
                + `BLCMM mods (.blcm files) will be found in the "Binaries" folder.\n`  
                + `.txt patch files for OpenBLCMM will be found at the game root folder.\n`
                + `\n`         
                + `Use the included tools to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run BLCMM', action: () => {
                runModManager(api, BLCMM_ID, BLCMM_NAME);
                dismiss();
              }
            },
            {
              label: 'Run TFC', action: () => {
                runModManager(api, TFC_ID, TFC_NAME);
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


//Notify User to run TFC Installer after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = 'OpenBLCMM or TFC';
  const MESSAGE = `Run ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run BLCMM',
        action: (dismiss) => {
          runModManager(api, BLCMM_ID, BLCMM_NAME);
          dismiss();
        },
      },
      {
        title: 'Run TFC',
        action: (dismiss) => {
          runModManager(api, TFC_ID, TFC_NAME);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `The ${MOD_NAME} tools downloaded by this extension each requires setup.\n`
                + `Please launch each tool to set the Game Folder, patch the executable, etc.\n`
                + `\n`
                + `TFC Installer:\n`
                + `TFC mods will be found at this folder: "${TFC_FOLDER}\\Mods".\n`
                + `\n`
                + `BLCMM:\n`
                + `BLCMM mods (.blcm files) will be found in the "Binaries" folder.\n`  
                + `.txt patch files for OpenBLCMM will be found at the game root folder.\n`
                + `\n`         
                + `Use the included tools to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run BLCMM', action: () => {
                runModManager(api, BLCMM_ID, BLCMM_NAME);
                dismiss();
              }
            },
            {
              label: 'Run TFC', action: () => {
                runModManager(api, TFC_ID, TFC_NAME);
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

function runModManager(api, toolId, toolName) {
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', toolId], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false })
        .catch(err => api.showErrorNotification(`Failed to run ${toolName}`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    }
    else {
      return api.showErrorNotification(`Failed to run ${toolName}`, `Path to ${toolName} executable could not be found. Ensure ${toolName} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${toolName}`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
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
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  //setupNotify(api);
  // ASYNC CODE //////////////////////////////////////////
  await downloadTfc(api, gameSpec);
  await downloadBlcmm(api, gameSpec);
  await downloadSdk(api, gameSpec);
  await modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
  return fs.ensureFileAsync(
    path.join(GAME_PATH, TFCMOD_PATH, "TFC_Mods_Go_Here.txt")
  );
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    //executable: getExecutable,
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
  context.registerInstaller(TFC_ID, 25, testTfc, installTfc);
  context.registerInstaller(BLCMM_ID, 27, testBlcmm, installBlcmm);
  context.registerInstaller(TFCMOD_ID, 29, testTfcMod, installTfcMod);
  context.registerInstaller(UPKEXPLORER_ID, 31, testUpkExplorer, installUpkExplorer);
  context.registerInstaller(SDK_ID, 33, testSdk, installSdk);
  context.registerInstaller(SDKMOD_ID, 35, testSdkMod, installSdkMod);
  context.registerInstaller(BLCMFILE_ID, 37, testBlcmFile, installBlcmFile);
  context.registerInstaller(ROOT_ID, 39, testRoot, installRoot);
  context.registerInstaller(COOKEDSUB_ID, 41, testCookedSub, installCookedSub);
  context.registerInstaller(MOVIES_ID, 43, testMovies, installMovies);
  context.registerInstaller(BINARIES_ID, 45, testBinaries, installBinaries);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = CONFIG_PATH;
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
  context.once(() => {
    context.api.onAsync('did-deploy', async (profileId, deployment) => { // put code here that should be run (once) when Vortex starts up
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
