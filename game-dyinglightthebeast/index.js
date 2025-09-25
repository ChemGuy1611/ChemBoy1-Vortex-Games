/*///////////////////////////////////////////
Name: Dying Light The Beast Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.2.0
Date: 2025-09-25
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const shortid = require('shortid');
const template = require('string-template');
//const winapi = require('winapi-bindings');
//const turbowalk = require('turbowalk');

//const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "dyinglightthebeast";
const STEAMAPP_ID = "3008130";
const STEAMAPP_ID_DEMO = null;
const EPICAPP_ID = "32eba9473a5642ac947f33b7130094b1";
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Dying Light: The Beast";
const GAME_NAME_SHORT = "DL The Beast";
const BINARIES_PATH = path.join('ph_ft', 'work', 'bin', 'x64');
const EXEC = path.join(BINARIES_PATH, 'DyingLightGame_TheBeast_x64_rwdi.exe');
const EXEC_EGS = EXEC;
const EXEC_XBOX = 'gamelaunchhelper.exe';

const ROOT_FOLDERS = ['ph_ft'];
/*
const DATA_FOLDER = 'XXX';
const CONFIGMOD_LOCATION = DOCUMENTS;
const CONFIG_FOLDERNAME = 'XXX';
const SAVEMOD_LOCATION = DOCUMENTS;
const SAVE_FOLDERNAME = CONFIG_FOLDERNAME;
//*/

let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

const PAK_ID = `${GAME_ID}-pak`;
const PAK_NAME = "Pak Mod (Merged)";
//const PAK_PATH = path.join('ph_ft', 'source'); //
const PAK_PATH = path.join('ph_ft', 'mods');
const PAK_EXT = '.pak';
const PAK_STRING = 'data';
const PAK_IDX_START = 2;
const PAK_IDX_END = 7;
const VANILLA_PAKS = ['data0.pak', 'data1.pak'];
const VANILLA_PAK_PATH = path.join('ph_ft', 'source');

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const MERGER_ID = `${GAME_ID}-mergerutility`;
const MERGER_NAME = "UTM Mod Merger Utility";
const MERGER_PATH = 'ph_ft';
const MERGER_EXEC = "unleashthemods.exe";
const MERGER_EXEC_PATH = path.join(MERGER_PATH, MERGER_EXEC);
const MERGER_PAGE_NO = 140;
const MERGER_FILE_NO = 402;

/* Config and Save paths and modtypes
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(CONFIGMOD_LOCATION, DATA_FOLDER, CONFIG_FOLDERNAME);
const CONFIG_EXT = ".ini";
const CONFIG_FILES = ["XXX"];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, DATA_FOLDER, SAVE_FOLDERNAME);
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
} //
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_EXT = ".sav";
const SAVE_FILES = ["XXX"];
//*/

const MOD_PATH_DEFAULT = PAK_PATH;
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];
const IGNORED_FILES = [path.join('**', '**.pak')];
const DEPLOY_IGNORE = [path.join('**', 'data0.pak'), path.join('**', 'data1.pak')];

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
    "details": {
      "steamAppId": STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
      "ignoreConflicts": IGNORED_FILES,
      //"ignoreDeploy": DEPLOY_IGNORE,
      //"supportsSymlinks": false,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": PAK_ID,
      "name": PAK_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PAK_PATH}`
    }, //*/
    {
      "id": MERGER_ID,
      "name": MERGER_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MERGER_PATH}`
    }, //*/
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
      "targetPath": `{gamePath}\\${BINARIES_PATH}`
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
    parameters: PARAMETERS,
  }, //*/
  {
    id: MERGER_ID,
    name: MERGER_NAME,
    logo: 'merger.png',
    executable: () => MERGER_EXEC_PATH,
    requiredFiles: [
      MERGER_EXEC_PATH,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: [],
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

// AUTOMATIC DOWNLOADER FUNCTIONS ///////////////////////////////////////////////////

//Check if Mod Merger Utility is installed
function isMergerUtilityInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MERGER_ID);
}

//* Function to auto-download Mod Merger Utility from Nexus Mods
async function downloadMergerUtility(api, gameSpec) {
  let isInstalled = isMergerUtilityInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MERGER_NAME;
    const MOD_TYPE = MERGER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    let FILE_ID = MERGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const PAGE_ID = MERGER_PAGE_NO;
    const GAME_DOMAIN = GAME_ID;
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
        const fileTime = () => Number.parseInt(input.uploaded_time, 10);
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
      } //
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

//Test for .pak files (in mod merger)
function testPak(files, gameId) {
  const isMod = files.some(file => path.extname(file).toLowerCase() === PAK_EXT);
  let supported = (gameId === spec.game.id) && isMod;

  /* Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  } //*/

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

/*Install pak files (merger function version)
function installPak(api, files, fileName) {
  const rootCandidate = files.find(file => file.toLowerCase().split(path.sep).includes('ph_ft'));
  const idx = rootCandidate !== undefined
    ? rootCandidate.toLowerCase().split(path.sep).findIndex(seg => seg === 'ph_ft')
    : 0;

  let hasVariants = false;
  const pakFiles = files.reduce((accum, iter) => {
    if (path.extname(iter) === '.pak') {
      const exists = accum[path.basename(iter)] !== undefined;
      if (exists) {
        hasVariants = true;
      }
      accum[path.basename(iter)] = exists
        ? accum[path.basename(iter)].concat(iter)
        : [iter];
    }
    return accum;
  }, {});

  let filtered = files;
  const queryVariant = () => {
    const paks = Object.keys(pakFiles).filter(key => pakFiles[key].length > 1);
    return Promise.map(paks, pakFile => {
      return api.showDialog('question', 'Choose Variant', {
        text: 'This mod has several variants for "{{pak}}" - please '
            + 'choose the variant you wish to install. (You can choose a '
            + 'different variant by re-installing the mod)',
        choices: pakFiles[pakFile].map((iter, idx) => ({ 
          id: iter,
          text: iter,
          value: idx === 0,
        })),
        parameters: {
          pak: pakFile,
        },
      }, [
        { label: 'Cancel' },
        { label: 'Confirm' },
      ]).then(res => {
        if (res.action === 'Confirm') {
          const choice = Object.keys(res.input).find(choice => res.input[choice]);
          filtered = filtered.filter(file => (path.extname(file) !== PAK_EXT)
            || ((path.basename(file) === pakFile) && file.includes(choice))
            || (path.basename(file) !== pakFile));
          return Promise.resolve();
        } else {
          return new util.UserCanceled();
        }
      });
    })
  };
  const generateInstructions = () => {
    const fileInstructions = filtered.reduce((accum, iter) => {
      if (!iter.endsWith(path.sep)) {
        iter = iter.match(/data[2-7].pak/) !== null //only 2-7 will be loaded by the game. 0-1 are vanilla paks
          ? iter 
          : 'data2.pak'; //use data2.pak if mod's pak name is invalid
        const destination = isPak(iter)
          ? shortid() + PAK_EXT
          : iter.split(path.sep).slice(idx).join(path.sep);
        if (isPak(iter)) {
          const pakDictIdx = accum.findIndex(attrib =>
            (attrib.type === 'attribute') && (attrib.key === 'pakDictionary'));
          if (pakDictIdx !== -1) {
            accum[pakDictIdx] = {
              ...accum[pakDictIdx],
              [destination]: path.basename(iter),
            }
          } else {
            accum.push({
              type: 'attribute',
              key: 'pakDictionary',
              value: { [destination]: path.basename(iter) },
            });
          }
        }
        accum.push({
          type: 'copy',
          source: iter,
          destination: destination,
        });
      }
      return accum;
    }, []);
    const instructions = [{ 
      type: 'setmodtype',
      value: PAK_ID,
    }].concat(fileInstructions);
    return instructions;
  }

  const prom = hasVariants ? queryVariant : Promise.resolve;
  return prom()
    .then(() => Promise.resolve({ instructions: generateInstructions() }));
} //*/

//*Install pak files (Mod Merger Utility version)
function installPak(api, files, fileName) {
  const rootCandidate = files.find(file => file.toLowerCase().split(path.sep).includes('ph_ft'));
  const idx = rootCandidate !== undefined
    ? rootCandidate.toLowerCase().split(path.sep).findIndex(seg => seg === 'ph_ft')
    : 0;
  
  const MOD_NAME = path.basename(fileName);
  const MOD_FOLDER = MOD_NAME.replace(/[\.]*(installing)*(zip)*/gi, '');

  let hasVariants = false;
  const pakFiles = files.reduce((accum, iter) => {
    if (path.extname(iter) === '.pak') {
      const exists = accum[path.basename(iter)] !== undefined;
      if (exists) {
        hasVariants = true;
      }
      accum[path.basename(iter)] = exists
        ? accum[path.basename(iter)].concat(iter)
        : [iter];
    }
    return accum;
  }, {});

  let filtered = files;
  const queryVariant = () => {
    const paks = Object.keys(pakFiles).filter(key => pakFiles[key].length > 1);
    return Promise.map(paks, pakFile => {
      return api.showDialog('question', 'Choose Variant', {
        text: 'This mod has several variants for "{{pak}}" - please '
            + 'choose the variant you wish to install. (You can choose a '
            + 'different variant by re-installing the mod)',
        choices: pakFiles[pakFile].map((iter, idx) => ({ 
          id: iter,
          text: iter,
          value: idx === 0,
        })),
        parameters: {
          pak: pakFile,
        },
      }, [
        { label: 'Cancel' },
        { label: 'Confirm' },
      ]).then(res => {
        if (res.action === 'Confirm') {
          const choice = Object.keys(res.input).find(choice => res.input[choice]);
          filtered = filtered.filter(file => (path.extname(file) !== PAK_EXT)
            || ((path.basename(file) === pakFile) && file.includes(choice))
            || (path.basename(file) !== pakFile));
          return Promise.resolve();
        } else {
          return new util.UserCanceled();
        }
      });
    })
  };
  const generateInstructions = () => {
    const fileInstructions = filtered.reduce((accum, iter) => {
      if (!iter.endsWith(path.sep)) {
        accum.push({
          type: 'copy',
          source: iter,
          destination: path.join(MOD_FOLDER, path.basename(iter)),
        });
      }
      return accum;
    }, []);
    const instructions = [{ 
      type: 'setmodtype',
      value: PAK_ID,
    }].concat(fileInstructions);
    return instructions;
  }

  const prom = hasVariants ? queryVariant : Promise.resolve;
  return prom()
    .then(() => Promise.resolve({ instructions: generateInstructions() }));
} //*/

//* Install paks in zips for Mod Merger Utility
async function installZipContent(files, destinationPath) {
  const zipFiles = files.filter(file => ['.zip', '.7z', '.rar'].includes(path.extname(file)));
  const setModTypeInstruction = { type: 'setmodtype', value: PAK_ID };
  if (zipFiles.length > 0) { // If it's a double zip, we don't need to repack. 
    const instructions = zipFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file),
      }
    });
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }
  else { // Repack the ZIP
    const szip = new util.SevenZip();
    const MOD_NAME = path.basename(destinationPath);
    const ZIP_NAME = MOD_NAME.replace(/[\-]*[\.]*[\d]*[ ]*(installing)*(zip)*/gi, '');
    const archiveName = ZIP_NAME + '.zip';
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
}

const Bluebird = require('bluebird');
//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
} //*/

//Installer test for Hotfix Merger files
function testMergerUtility(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === MERGER_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

  /* Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  } //*/

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Hotfix Merger files
function installMergerUtility(files) {
  const MOD_TYPE = MERGER_ID;
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MERGER_EXEC));
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
  const ROOT_IDX = `${path.basename(modFile)}\\`
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

//Fallback installer to Binaries folder
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

//Install fallback
function installBinaries(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };
  
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
  return Promise.resolve({ instructions });
}

// MERGER FUNCTIONS ///////////////////////////////////////////////////////////

function isPak(filePath) {
  return path.extname(filePath.toLowerCase()) === PAK_EXT;
}

//test whether to use the merger
function mergeTest(api, game, discovery) {
  if (game.id !== GAME_ID && discovery?.path !== undefined) {
    return undefined;
  }

  const installPath = selectors.installPathForGame(api.store.getState(), game.id);
  return {
    baseFiles: (deployedFiles) => deployedFiles
      .filter(file => isPak(file.relPath))
      .map(file => ({
        in: path.join(installPath, file.source, file.relPath),
        out: file.relPath,
      })),
    filter: filePath => isPak(filePath),
  };
}

//merger file operations - filePath points to the mod file - mergeDir points to the __merged directory
function mergeOperation(api, filePath, mergeDir) {
  const state = api.getState();
  const modId = Object.keys(state.persistent.mods[GAME_ID]).find(id => filePath.includes(id));
  let pakDict;
  if (modId !== undefined) {
    const mod = state.persistent.mods[GAME_ID][modId];
    pakDict = mod.attributes.pakDictionary;
  }

  if (pakDict?.[path.basename(filePath)] === undefined) {
    log('error', 'file is not present in pak dictionary',
      { filePath, pakDict: pakDict !== undefined ? JSON.stringify(pakDict, undefined, 2) : 'undefined' });
    return Promise.resolve();
  }
  const sevenzip = new util.SevenZip();
  const destDir = path.join(mergeDir);
  const mergeFilePath = path.join(destDir, pakDict[path.basename(filePath)]);
  const zipFile = mergeFilePath + '.zip';
  const tempDir = path.join(mergeDir, 'temp');
  return fs.ensureDirWritableAsync(destDir)
    .then(() => fs.ensureDirWritableAsync(tempDir))
    .then(() => fs.statAsync(mergeFilePath)
      .then(() => sevenzip.extractFull(mergeFilePath, tempDir))
      .catch(err => err.code === 'ENOENT')
        ? Promise.resolve()
        : Promise.reject(err))
    .then(() => sevenzip.extractFull(filePath, tempDir))
    .then(() => new Promise((resolve, reject) => setTimeout(() => resolve(), 500)))
    .then(() => fs.readdirAsync(tempDir))
    .then(entries => sevenzip.add(zipFile, entries.map(entry => path.join(tempDir, entry)),
      { raw: ['-r'] }))
    .then(() => fs.removeAsync(tempDir))
    .then(() => fs.removeAsync(mergeFilePath)
      .catch(err => err.code === 'ENOENT')
        ? Promise.resolve()
        : Promise.reject(err))
    .then(() => fs.moveAsync(zipFile, mergeFilePath, { overwrite: true }));
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  await downloadMergerUtility(api, gameSpec);
  const MERGER_FOLDER_OLD = path.join(STAGING_FOLDER, '__merged.dyinglightthebeast-pak');
  try {
    await fs.statAsync(MERGER_FOLDER_OLD);
    await fs.removeAsync(MERGER_FOLDER_OLD);
  } catch (err) {
    //do nothing
  } //*/
  return fs.ensureDirWritableAsync(path.join(GAME_PATH, MOD_PATH_DEFAULT));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
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
  context.registerModType(PAK_ID, 25, //id, priority
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, //isSupported - Is this mod for this game
    (game) => pathPattern(context.api, game, `{gamePath}\\${PAK_PATH}`), //getPath - mod install location
    () => Promise.resolve(false), //test - is installed mod of this type
    {
      name: PAK_NAME,
    } //options
  ); //*/

  //register mod installers
  //context.registerInstaller(PAK_ID, 25, testPak, (files, fileName) => installPak(context.api, files, fileName));
  context.registerInstaller(PAK_ID, 25, toBlue(testPak), toBlue(installZipContent));
  context.registerInstaller(MERGER_ID, 27, testMergerUtility, installMergerUtility);
  //context.registerInstaller(CONFIG_ID, 43, testConfig, installConfig);
  //context.registerInstaller(SAVE_ID, 45, testSave, installSave);
  context.registerInstaller(ROOT_ID, 47, testRoot, installRoot);
  context.registerInstaller(BINARIES_ID, 49, testBinaries, installBinaries);

  //register actions
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
  /* merger for pak mods
  context.registerMerge(
    (game, discovery) => mergeTest(context.api, game, discovery),
    (filePath, mergeDir) => mergeOperation(context.api, filePath, mergeDir),
    PAK_ID
  ); //*/

  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const lastActiveProfile = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== lastActiveProfile) return;
      await didDeploy(context.api);
      return deployNotify(context.api);
    }); //*/
    context.api.onAsync('did-purge', async (profileId, deployment) => {
      const lastActiveProfile = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== lastActiveProfile) return;
      return didPurge(context.api);
    }); //*/
  });
  return true;
}

async function didDeploy(api) {
  const state = api.getState();
  GAME_PATH = getDiscoveryPath(api);
  const PAK_DIRECTORY = path.join(GAME_PATH, VANILLA_PAK_PATH);
  let FILES = await fs.readdirAsync(PAK_DIRECTORY);
  
  try { //clear pak non-vanilla pak files
    FILES = FILES.filter(file => 
      path.extname(file).toLowerCase() === PAK_EXT &&
      !VANILLA_PAKS.includes(path.basename(file))
    );
    //log('warn', `Removing pak files on deploy: ${FILES.join(', ')}`);
    FILES.forEach(async file => {
      await fs.removeAsync(path.join(PAK_DIRECTORY, file));
    });
  } catch (err) {
    log('error', `Failed to remove merged pak files: ${FILES.join(', ')} - ${err.message}`);
  }

  //runModManager(api); //run merger executable once files are cleared - not executed for technical reasons
  return Promise.resolve();
}

async function didPurge(api) {
  const state = api.getState();
  GAME_PATH = getDiscoveryPath(api);
  const PAK_DIRECTORY = path.join(GAME_PATH, VANILLA_PAK_PATH);
  let FILES = await fs.readdirAsync(PAK_DIRECTORY);
  
  try { //clear pak non-vanilla pak files
    FILES = FILES.filter(file => 
      path.extname(file).toLowerCase() === PAK_EXT &&
      !VANILLA_PAKS.includes(path.basename(file))
    );
    //log('warn', `Removing pak files on purge: ${FILES.join(', ')}`);
    FILES.forEach(async file => {
      await fs.removeAsync(path.join(PAK_DIRECTORY, file));
    });
  } catch (err) {
    log('error', `Failed to remove merged pak files: ${FILES.join(', ')} - ${err.message}`);
  }
  return Promise.resolve();
}

//Notify User to run Mod Merger Utility after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = MERGER_NAME;
  const MESSAGE = `Use ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Merger',
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
                + `Mods to install with ${MOD_NAME} will be found at this folder: "${HOTFIX_PATH}".\n`
                + `Use the included tool to launch ${MOD_NAME} (button below or in "Dashboard" tab).\n`
                + `You can open the Hotfix Merger WebUI using the button below, or using the button within the folder icon on the Mods toolbar.\n`
          }, [
            {
              label: 'Run Merger', action: () => {
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
  const TOOL_ID = MERGER_ID;
  const TOOL_NAME = MERGER_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false, shell: true })
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

//export to Vortex
module.exports = {
  default: main,
};
