/*
Name: Helldivers 2 Vortex Extension
Structure: Custom Game Data
Author: ChemBoy1
Version: 0.4.3
Date: 10/15/2024
*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { getMaxListeners } = require('events');

//Specify all info about the game
const STEAMAPP_ID = "553850";
const GAME_ID = "helldivers2";
const GAME_NAME = "Helldivers 2";
const GAME_NAME_SHORT = "Helldivers 2"; 
const EXEC = "bin\\helldivers2.exe";

//Info for mod types and installers
const DATA_ID = `${GAME_ID}-data`;
const DATA_NAME = "Game Data (.dl_bin)";
const DATA_PATH = path.join("data", "game");
const modFileExt = ".dl_bin";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_PATH = path.join("bin");

const PATCH_ID = `${GAME_ID}-patch`;
const PATCH_NAME = "Data Patch (.patch0)";
const PATCH_PATH = path.join("data");
const patchModFileExt = ".patch_0";
const PATCH_EXTS = [".patch_0", ".gpu_resources", ".stream"];
//const PATCH_EXTS = [".patch_0", ".patch_0.gpu_resources", ".patch_0.stream"];
const PATCH_FILE1 = "9ba626afa44a3aa3.patch_0";
const PATCH_FILE2 = "9ba626afa44a3aa3.patch_0.gpu_resources";
const PATCH_FILE3 = "9ba626afa44a3aa3.patch_0.stream";
const PATCH_STRING = "9ba626afa44a3aa3.patch_0";
const PATCH_BASE_STRING = "9ba626afa44a3aa3.patch_";
const PATCH_IDX = PATCH_FILE1.indexOf("0");

const STREAM_ID = `${GAME_ID}-stream`;
const STREAM_NAME = "Data Stream File (.stream)";
const STREAM_PATH = path.join("data");
const streamFileExt = ".stream";

//Filled in from info above
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
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "nexusPageId": GAME_ID
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
    },
    "requiresLauncher": "steam"
  },
  "modTypes": [
    {
      "id": DATA_ID,
      "name": DATA_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${DATA_PATH}`
    },
    /*
    {
      "id": PATCH_ID,
      "name": PATCH_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PATCH_PATH}`
    },
    */
    {
      "id": STREAM_ID,
      "name": STREAM_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${STREAM_PATH}`
    },
    {
      "id": BINARIES_ID,
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": `{gamePath}\\${BINARIES_PATH}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [

];

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 30,
    low: 75,
  }[priority];
}

//Convert path placeholders to actual path values
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Find game install location
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set mod path
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Set launcher requirements
function makeRequiresLauncher(api, gameSpec) {
  return () => Promise.resolve((gameSpec.game.requiresLauncher !== undefined)
    ? { launcher: gameSpec.game.requiresLauncher }
    : undefined);
}

//Test for .dl_bin files
function testDlbin(files, gameId) {
  let supported = (gameId === spec.game.id) && (files.find(file => path.extname(file).toLowerCase() === modFileExt) !== undefined);

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

//Install .dl_bin files
function installDlbin(files, gameSpec) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === modFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATA_ID };

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

//Test for .patch files
function testPatch(files, gameId) {
  let supported = (gameId === spec.game.id) && (files.find(file => path.extname(file).toLowerCase() === patchModFileExt) !== undefined);

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

//Install .patch files
function installPatch(files, gameSpec) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === patchModFileExt);
  const patchFiles = files.filter(file => PATCH_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PATCH_ID };
  const patchModFiles = {
    type: 'attribute',
    key: 'patchModFiles',
    value: patchFiles.map(f => path.basename(f))
  };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ( 
      (file.indexOf(rootPath) !== -1) && 
      (!file.endsWith(path.sep)) &&
      (PATCH_EXTS.includes(path.extname(file).toLowerCase()))
    )
  );

  const instructions = filtered.map((file, index) => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });

  instructions.push(setModTypeInstruction);
  instructions.push(patchModFiles);

  return Promise.resolve({ instructions });
}

//Test for .stream files
function testStream(files, gameId) {
  let supported = (gameId === spec.game.id) && (files.find(file => path.extname(file).toLowerCase() === streamFileExt) !== undefined);

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

//Install .stream files
function installStream(files, gameSpec) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === streamFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: STREAM_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ( 
      //(file.indexOf(rootPath) !== -1) && 
      (!file.endsWith(path.sep))
    )
  );

  const instructions = filtered.map((file, index) => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });

  instructions.push(setModTypeInstruction);

  return Promise.resolve({ instructions });
}

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  api.sendNotification({
    id: 'setup-notification-helldivers2',
    type: 'warning',
    message: '.patch0 Files Management',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'If you are using multiple ".patch0" type mods, you need to rename files manually in the staging folder to resolve conflicts. \n'
                + 'Right click on the mod in the modlist and select "Open in File Manager" option. You can then change the file extensions. \n'
                + 'The Load Order tab can be used as a reference to keep track of how many patch mods you have deployed currently. \n'
          }, [
            { label: 'Continue', action: () => dismiss() },
          ]);
        },
      },
    ],
  });    
}

//Functions for .patch0 file extension renaming and load ordering
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = PATCH_EXTS;

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    const patch = util.getSafe(modInfo.attributes, ['patchModFiles'], []);
    //if (patch.length > 1) name = name + ` (${patch.length} ${fileExt} files)`;

    return {
      id: mod.id,
      name,
      imgUrl: util.getSafe(modInfo, ['attributes', 'pictureUrl'], path.join(__dirname, spec.game.logo))
    }
  });

  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);
}


function loadOrderSuffix(api, mod) {
  const state = api.getState();
  const gameId = mod.attributes.downloadGame;
  if (!gameId)
      return '99';
  const profile = selectors.lastActiveProfileForGame(state, gameId);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});
  const loKeys = Object.keys(loadOrder);
  const pos = loKeys.indexOf(mod.id);
  if (pos === -1) {
      return '99';
  }
  //let pos_adj = pos + 1;
  let pos_adj = pos;

  return pos_adj;
}

//Rename .patch0 files based on load order position
async function renamePatchFiles(api, loadOrder, mods) {
  // Check we are managing HD2
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  if (gameId !== GAME_ID) return;
  //const stagingFolder = selectors.installPathForGame(state, GAME_ID);
  
  // Get the mod data
  const MODS_FILTERED = state.persistent.mods[GAME_ID];
  //const MODS_FILTERED = mods.filter(mod => (mod.type === PATCH_ID));
  if (!MODS_FILTERED) return;

  // Read the contents of the staging folder for this mod
  //const modPath = path.join(stagingFolder, modId);

  //util.copyFileAtomic(`srcPath`, `destPath`)

  //Rename the files
  try {
    MODS_FILTERED.forEach(
        (mod, idx) => {
            let pos_adj = 1;
            loadOrderSuffix(context.api, mod);
            const MOD_FILES = mods[mod.id].files[mod.id];
            //const MOD_FILES = mod.files;
            MOD_FILES.forEach(
                (file, idx) => {
                    const MOD_FILE = MOD_FILES[idx];
                    const FILE_NAME = path.basename(MOD_FILE);
                    const FILE_NAME_NEW = FILE_NAME.replace(/(?<=patch_)\d*/, pos_adj);
                    fs.renameSync(MOD_FILE, path.join(path.dirname(MOD_FILE), FILE_NAME_NEW));
                }
            );
        }
    );
    return;
  }
  catch(err) {
    //log('error', 'Unable to rename .patch0 files', err);
    api.showErrorNotification(`Unable to rename .patch0 files`, err);
    return;
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  setupNotify(api);
  return fs.ensureDirWritableAsync(path.join(discovery.path, DATA_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: makeRequiresLauncher(context.api, gameSpec),
    requiresCleanup: true,
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

  context.registerModType(PATCH_ID, 25, //id, priority
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, //isSupported - Is this mod for this game
    (game) => pathPattern(context.api, game, `{gamePath}\\${PATCH_PATH}`), //getPath - mod install location
    () => Promise.resolve(false), //test - is installed mod of this type
    { 
      name: PATCH_NAME,
    } //options
  );
  
  //register mod installers
  context.registerInstaller(`${GAME_ID}-dlbin`, 25, testDlbin, installDlbin);
  context.registerInstaller(`${GAME_ID}-patch`, 30, testPatch, installPatch);
  context.registerInstaller(`${GAME_ID}-stream`, 35, testStream, installStream);
}

//Main Function
function main(context) {
  applyGame(context, spec);

  let previousLO;
  context.registerLoadOrderPage({
    gameId: spec.game.id,
    gameArtURL: path.join(__dirname, spec.game.logo),
    preSort: (items, direction) => preSort(context.api, items, direction),
    filter: mods => mods.filter(mod => mod.type === PATCH_ID),
    displayCheckboxes: false,
    callback: (loadOrder, mods) => {
      if (previousLO === undefined) previousLO = loadOrder;
      if (loadOrder === previousLO) return;
      renamePatchFiles(context.api, loadOrder, mods);
      context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
      previousLO = loadOrder;
    },
    createInfoPanel: () =>
    context.api.translate(`Drag and drop the patch mods on the left to change the order in which they load. ${spec.game.name} loads patch mods in numerical order, so Vortex suffixes `
    + 'the file names with ".patch0, .patch1, .patch2, ..." to ensure they load in the order you set here. '
    + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.'),
  });
  
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
