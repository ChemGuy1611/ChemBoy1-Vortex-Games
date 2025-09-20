/*///////////////////////////////////////////
Name: XXX Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.0
Date: 2025-09-01
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
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
const PAK_PATH = path.join('ph_ft', 'source');
const PAK_EXT = '.pak';

const PAK_STRING = 'data';
const PAK_IDX_START = 2;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

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
    /*{
      "id": PAK_ID,
      "name": PAK_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PAK_PATH}`
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for .pak files (in mod merger)
function testPak(files, gameId) {
  const isMod = files.some(file => path.extname(file).toLowerCase() === PAK_EXT);
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

//Install .pak files (in mod merger)
function installPak(files, gameSpec) {
  const MOD_TYPE = PAK_ID;
  const modFile = files.find(file => path.extname(file).toLowerCase() === PAK_EXT);
  const pakFiles = files.filter(file => path.extname(file).toLowerCase() === PAK_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };
  const pakModFiles = {
    type: 'attribute',
    key: 'pakModFiles',
    value: pakFiles.map(f => path.basename(f))
  };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  (
    (file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep)) &&
    (path.extname(file).toLowerCase() === PAK_EXT)
  )
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });

  instructions.push(setModTypeInstruction);
  instructions.push(pakModFiles);

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

//Functions for .pak file extension renaming and load ordering
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = PAK_EXT;

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    const pak = util.getSafe(modInfo.attributes, ['pakModFiles'], []);
    //if (pak.length > 1) name = name + ` (${pak.length} ${fileExt} files)`;

    return {
      id: mod.id,
      name,
      imgUrl: util.getSafe(modInfo, ['attributes', 'pictureUrl'], path.join(__dirname, spec.game.logo))
    }
  });

  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);
}

//test whether to use the merger
const mergeTest = (game, discovery, context) => {
  if (game.id !== GAME_ID) return;
  /*const state = context.api.getState();
  const installPath = selectors.installPathForGame(state, game.id);
  return {
    baseFiles: (deployedFiles) => deployedFiles
      .filter(file => isPak(file.relPath))
      .map(file => ({
        in: path.join(installPath, file.source, file.relPath),
        out: file.relPath,
      })),
    filter: filePath => isPak(filePath),
  }; //*/
  //*
  return {
    baseFiles: () => [],
    filter: () => true
  } //*/
}

//inform user to refresh load order if can't get index
const sendRefreshLoadOrderNotification = (context) => {
  context.api.sendNotification({
    id: `${GAME_ID}-refreshloadorder`,
    type: 'error',
    message: 'Refresh your load order',
    allowSuppress: false,
  });
};

//merger file operations
const mergeOperation = (filePath, mergePath, context, currentLoadOrder) => {
  const state = context.api.getState();
  const profile = selectors.lastActiveProfileForGame(state, GAME_ID);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});

  const splittedPath = filePath.split(path.sep);
  const fileName = splittedPath.pop();
  const modName = splittedPath.pop();

  const modIsInLoadOrder = loadOrder[modName] != undefined;
  //const modPosition = modIsInLoadOrder ? loadOrder[modName].pos : Object.keys(loadOrder).length;
  const modPosition = modIsInLoadOrder ? loadOrder[modName].pos : undefined;

  if (modPosition == undefined) {
    sendRefreshLoadOrderNotification(context);
  }
  else {
    context.api.dismissNotification(`${GAME_ID}-refreshloadorder`);
    const number = modPosition + PAK_IDX_START;
    const targetFileName = `data${number}.pak`;
    const mergeTarget = path.join(mergePath, targetFileName);
    fs.ensureDirWritableAsync(path.dirname(mergeTarget));
    fs.ensureDirWritableAsync(path.dirname(filePath));
    return util.copyFileAtomic(filePath, mergeTarget)
    //return fs.copyAsync(filePath, mergeTarget)
      .catch({ code: 'ENOENT' }, err => {
        // not entirely sure whether "ENOENT" refers to the source file or the directory we're trying to copy into, the error object contains only one of those paths
        context.api.showErrorNotification('Failed to rename dataX.pak files from load order', err);
        log('error', 'file not found upon copying merge base file', {
          source: filePath,
          destination: mergeTarget,
        });
        return Promise.reject(err);
      });
  }
}

const requestDeployment = (context) => {
  context.api.store.dispatch(actions.setDeploymentNecessary(GAME_ID, true));
  context.api.sendNotification({
    id: `${GAME_ID}-deployrequest`,
    type: 'warning',
    message: 'Deployment is needed',
    allowSuppress: true,
    actions: [
      {
        title: 'Deploy',
        action: () => context.api.events.emit('deploy-mods', (err) => {
          console.warn(`Error deploying mods \n${err}`)
        })
      }
    ],
  });
};

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions
function setupNotification(api) {
  const NOTIF_ID = `${GAME_ID}-setup`;
  const MESSAGE = `Special Instructions for ${GAME_NAME}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'info',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            bbcode: `This extension uses the Load Order you set for "dataX.pak" mods to do automatic file renaming.
            <br/>
            <br/>
            To do this, the extension will create another mod in your mod list ("_merged....."). Please do not enable or uninstall this mod.
            <br/>
            <br/>
            You may sometimes see popups after installing new mods or changing the load order for "Changes Outside of Vortex".
            <br/>
            <br/>
            Please accept and apply those changes for the "_merged" mod when you see the popups.
            <br/>
            <br/>`
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

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  //setupNotification(api);
  // ASYNC CODE //////////////////////////////////////////
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

  //register mod types explicitly
    context.registerModType(PAK_ID, 25, //id, priority
      (gameId) => {
        var _a;
        return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, //isSupported - Is this mod for this game
      (game) => pathPattern(context.api, game, `{gamePath}\\${PAK_PATH}`), //getPath - mod install location
      () => Promise.resolve(false), //test - is installed mod of this type
      {
        name: PAK_NAME,
        //mergeMods: true,
        //deploymentEssential: true,
        //noConflicts: true,
      } //options
    );

  //register mod installers
  context.registerInstaller(PAK_ID, 25, testPak, installPak);
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

  let currentLoadOrder;
  context.registerLoadOrderPage({
    gameId: spec.game.id,
    gameArtURL: path.join(__dirname, spec.game.logo),
    preSort: (items, direction) => preSort(context.api, items, direction),
    filter: mods => mods.filter(mod => mod.type === PAK_ID),
    displayCheckboxes: false,
    callback: (updatedLoadOrder, mods) => {
      if (currentLoadOrder == updatedLoadOrder) return;

      if (currentLoadOrder == undefined) {
        currentLoadOrder = updatedLoadOrder;
        return;
      }

      currentLoadOrder = updatedLoadOrder;
      requestDeployment(context);
    },
    createInfoPanel: () =>
      context.api.translate(`${spec.game.name} loads "dataX.pak" mods in numerical 
        order, so Vortex suffixes the file names with "${PAK_IDX_START}, ${PAK_IDX_START+1}, ${PAK_IDX_START+2}, ..." 
        to ensure they load in the order you set here. The number in the left column 
        represents the overwrite order. The changes from mods with higher numbers will 
        take priority over other mods which make similar edits.`
      ),
  });

  context.registerMerge(
    (game, discovery) => mergeTest(game, discovery, context),
    (filePath, mergePath) => mergeOperation(filePath, mergePath, context, currentLoadOrder),
    PAK_ID
  );

  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const lastActiveProfile = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== lastActiveProfile) return;
      context.api.dismissNotification(`${GAME_ID}-deployrequest`);
      context.api.dismissNotification('redundant-mods'); // Because we create a merged mod when deploying, Vortex thinks that all mods have duplicates and are redundant
    });
    //*
    context.api.events.on('mods-enabled', (mods, enabled, gameId) => {
      if (gameId !== GAME_ID) return;

      const isAutoDeployOn = context.api.getState().settings.automation.deploy;
      if (!isAutoDeployOn) {
        requestDeployment(context);
      }
    });
    context.api.events.on('mod-disabled', (profileId, modId) => {
      const lastActiveHelldiverProfile = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== lastActiveHelldiverProfile) return;

      const isAutoDeployOn = context.api.getState().settings.automation.deploy;
      if (!isAutoDeployOn) {
        requestDeployment(context);
      }
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
