/*//////////////////////////////////////////
Name: BioShock Remastered Vortex Extension
Structure: UE2/3 TFC
Author: ChemBoy1
Version: 0.6.0
Date: 2025-11-12
/////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const turbowalk = require('turbowalk');
//const winapi = require('winapi-bindings');

const DOCUMENTS = util.getVortexPath('documents');
const ROAMINGAPPDATA = util.getVortexPath('appData');

//Specify all the information about the game
const STEAMAPP_ID = "409710";
const STEAMAPP_CLASSIC_ID = "7670";
const EPICAPP_ID = "bc2c95c6ff564a16b26644f1d3ac3c55";
const GOGAPP_ID = "1439656515";
const GOGAPP_CLASSIC_ID = "2022341186";
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const GAME_ID = "bioshock";
const GAME_NAME = "BioShock";
const EPIC_CODE_NAME = "ContentBaked";
const EXEC_NAME = "BioshockHD.exe";
const EXEC_NAME_CLASSIC = "Bioshock.exe";
let GAME_PATH = ''; //patched in the setup function to the discovered game path
let GAME_VERSION = '';
let STAGING_FOLDER = ''; //Vortex staging folder path
let DOWNLOAD_FOLDER = ''; //Vortex download folder path

const SPECIAL_TFCMOD_FOLDERS = [];

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }, { id: STEAMAPP_CLASSIC_ID }],
  gog: [{ id: GOGAPP_ID }, { id: GOGAPP_CLASSIC_ID }],
  epic: [{ id: EPICAPP_ID }],
  //xbox: [{ id: XBOXAPP_ID }],
  //registry: [{ id: 'HKEY_LOCAL_MACHINE:Software\\Wow6432Node\\Bethesda Softworks\\Bioshock:Installed Path' }],
};

//Information for setting the executable and variable paths based on the game store version
let BINARIES_TARGET = null;
let BINARIES_FOLDER = null;
let requiredFiles = [];
const BINARIES_FOLDER_STEAM = path.join('Build', 'Final');
const BINARIES_FOLDER_EPIC = path.join('Build', 'FinalEpic');
const BINARIES_FOLDER_CLASSIC = path.join('Builds', 'Release');
const EXEC_STEAM = path.join(BINARIES_FOLDER_STEAM, EXEC_NAME);
const EXEC_EPIC = path.join(BINARIES_FOLDER_EPIC, EXEC_NAME);
const EXEC_CLASSIC = path.join(BINARIES_FOLDER_CLASSIC, EXEC_NAME_CLASSIC);

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
const UPKEXPLORER_PATH = '.';

const TFCMOD_ID = `${GAME_ID}-tfcmod`;
const TFCMOD_NAME = "TFC Mod";
const TFCMOD_EXTS = ['.packagepatch', '.descriptor', '.tfcmapping', '.inipatch'];
const TFCMOD_FILES = ['gameprofile.xml', 'gameprofile.idremappings.xml', 'objectdescriptors.xml', 'packageextensions.xml', `texturepack`, 'game'];
const TFCMOD_PATH = path.join(TFC_FOLDER, 'Mods');

const MOVIES_ID = `${GAME_ID}-movies`;
const MOVIES_NAME = "Movies Mod";
const MOVIES_PATH = path.join(EPIC_CODE_NAME, 'pc', 'BinkMovies');
const MOVIES_EXTS = ['.bik'];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";
const ROOT_FOLDERS = [EPIC_CODE_NAME];

const ROOTSUB_ID = `${GAME_ID}-rootsub`;
const ROOTSUB_NAME = "Root Sub Folder";
const COOKED_FOLDER = 'BulkContent';
const ROOTSUB_PATH = path.join(EPIC_CODE_NAME, 'pc');
const ROOTSUB_FOLDERS = ['BinkMovies', COOKED_FOLDER, 'FlashMovies', 'Maps', 'Sounds_Windows', 'System'];

const COOKEDSUB_ID = `${GAME_ID}-cookedsub`;
const COOKEDSUB_NAME = "Cooked Sub Folder";
const COOKEDSUB_PATH = path.join(ROOTSUB_PATH, COOKED_FOLDER);
const COOKEDSUB_FOLDERS = [];
const COOKEDSUB_EXTS = ['.blk'];

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
const BINARIES_FILES = [EXEC_NAME, EXEC_NAME_CLASSIC];
const BINARIES_EXTS = ['.dll'];

const DATA_FOLDER = path.join('BioshockHD', 'Bioshock');
const CONFIG_PATH = path.join(ROAMINGAPPDATA, DATA_FOLDER);
const SAVE_PATH = path.join(DOCUMENTS, DATA_FOLDER, 'SaveGames');

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EPIC_CODE_NAME;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

const IGNORE_CONFLICTS = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
let MODTYPE_FOLDERS = [TFCMOD_PATH, MOVIES_PATH, COOKEDSUB_PATH];

//This fills in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH_DEFAULT,
    "requiresCleanup": true,
    //parameters: PARAMETERS,
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
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": TFCMOD_ID,
      "name": TFCMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', TFCMOD_PATH)
    },
    { 
      "id": MOVIES_ID,
      "name": MOVIES_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MOVIES_PATH)
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
      "id": TFC_ID,
      "name": TFC_NAME,
      "priority": "low",
      "targetPath": path.join('{gamePath}', TFC_PATH)
    },
    {
      "id": UPKEXPLORER_ID,
      "name": UPKEXPLORER_NAME,
      "priority": "low",
      "targetPath": path.join('{gamePath}', UPKEXPLORER_PATH)
    },
  ],
};

//3rd party tools and launchers
const tools = [
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
    id: UPKEXPLORER_ID,
    name: UPKEXPLORER_NAME,
    logo: "tfc.png",
    executable: () => UPKEXPLORER_EXEC,
    requiredFiles: [UPKEXPLORER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
  {
    id: `${GAME_ID}-customlaunchsteam`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC_STEAM,
    requiredFiles: [EXEC_STEAM],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: []
  }, //*/
  {
    id: `${GAME_ID}-customlaunchepic`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC_EPIC,
    requiredFiles: [EXEC_EPIC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: []
  }, //*/
  {
    id: `${GAME_ID}-customlaunchclassic`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC_CLASSIC,
    requiredFiles: [EXEC_CLASSIC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: []
  }, //*/
];

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
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
      localAppData: process.env['LOCALAPPDATA'],
      appData: util.getVortexPath('appData'),
    });
  }
  catch(err){
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
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
  }
  //*/
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  }
  return Promise.resolve(undefined);
}

//Get the executable and add to required files
function getExecutable(discoveryPath) {

  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      requiredFiles.push(exec);
      return true;
    }
    catch (err) {
      return false;
    }
  };

  if (isCorrectExec(EXEC_STEAM)) {
    BINARIES_FOLDER = BINARIES_FOLDER_STEAM;
    BINARIES_TARGET = path.join('{gamePath}', BINARIES_FOLDER);
    return EXEC_STEAM;
  };

  if (isCorrectExec(EXEC_EPIC)) {
    BINARIES_FOLDER = BINARIES_FOLDER_EPIC;
    BINARIES_TARGET = path.join('{gamePath}', BINARIES_FOLDER);
    return EXEC_EPIC;
  };

  if (isCorrectExec(EXEC_CLASSIC)) {
    BINARIES_FOLDER = BINARIES_FOLDER_CLASSIC;
    BINARIES_TARGET = path.join('{gamePath}', BINARIES_FOLDER);
    return EXEC_CLASSIC;
  };

  return EXEC_STEAM;
}

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if TFC is installed
function isTfcInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === TFC_ID);
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
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testTfc(files, gameId) {
  const isTFC = files.some(file => (path.basename(file).toLowerCase() === TFC_EXEC));
  let supported = (gameId === spec.game.id) && isTFC;

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
function testUpkExplorer(files, gameId) {
  const isUpk = files.some(file => (path.basename(file).toLowerCase() === UPKEXPLORER_EXEC));
  let supported = (gameId === spec.game.id) && isUpk;

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

//test whether to use mod installer
function testMovies(files, gameId) {
  const isMod = files.some(file => MOVIES_EXTS.includes(path.extname(file).toLowerCase()));
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

//mod installer instructions
function installMovies(files) {
  const modFile = files.find(file => MOVIES_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOVIES_ID };

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
  const MOD_NAME = TFC_NAME;
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
            text: `The ${MOD_NAME} tool downloaded by this extension requires setup.\n`
                + `Please launch the tool and set the Game Folder.\n`
                + `Mods to install with ${MOD_NAME} will be found at this folder: "[RootGameFolder]\\${TFC_FOLDER}\\Mods".\n`
                + `If you don't see your mod's folder there, check in the root game folder.\n`              
                + `You must use ${MOD_NAME} to install and uninstall those mods after installing with Vortex.\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
            {
              label: 'Run TFC', action: () => {
                runModManager(api);
                dismiss();
              }
            },
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
  const MOD_NAME = TFC_NAME;
  const MESSAGE = `Run ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run TFC',
        action: (dismiss) => {
          runModManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For most mods, you must use ${MOD_NAME} to install the mod to the game files after installing with Vortex.\n`
                + `Mods to install with ${MOD_NAME} will be found at this folder: "[RootGameFolder]\\${TFC_FOLDER}\\Mods".\n`
                + `If you don't see your mod's folder there, check in the root game folder.\n`   
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run TFC', action: () => {
                runModManager(api);
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

function runModManager(api) {
  const TOOL_ID = TFC_ID;
  const TOOL_NAME = TFC_NAME;
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

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  //setupNotify(api);
  await downloadTfc(api, gameSpec);
  MODTYPE_FOLDERS.push(BINARIES_FOLDER);
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
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: () => gameSpec.game.modPath,
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
  //register mod types explicitly
  context.registerModType(BINARIES_ID, 40, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, BINARIES_TARGET), 
    () => Promise.resolve(false), 
    { name: BINARIES_NAME }
  );

  //register mod installers
  context.registerInstaller(TFC_ID, 25, testTfc, installTfc);
  context.registerInstaller(UPKEXPLORER_ID, 27, testUpkExplorer, installUpkExplorer);
  context.registerInstaller(TFCMOD_ID, 29, testTfcMod, installTfcMod);
  context.registerInstaller(ROOT_ID, 31, testRoot, installRoot);
  context.registerInstaller(COOKEDSUB_ID, 33, testCookedSub, installCookedSub);
  context.registerInstaller(MOVIES_ID, 35, testMovies, installMovies);
  context.registerInstaller(BINARIES_ID, 37, testBinaries, installBinaries);

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
  }); //*/
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

      return deployNotify(context.api);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
