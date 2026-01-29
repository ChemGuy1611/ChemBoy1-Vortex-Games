/*///////////////////////////////////////////
Name: Helldivers 2 Vortex Extension
Structure: Custom Game Data
Author: ChemBoy1
Version: 0.7.1
Date: 2026-01-28
/////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all info about the game
const STEAMAPP_ID = "553850";
const GAME_ID = "helldivers2";
const GAME_NAME = "Helldivers 2";
const GAME_NAME_SHORT = "Helldivers 2";
const EXEC = path.join("bin", "helldivers2.exe");

//Info for mod types and installers
const DATA_ID = `${GAME_ID}-data`;
const DATA_NAME = "Game Data (.dl_bin)";
const DATA_PATH = path.join("data", "game");
const modFileExt = ".dl_bin";

const STREAM_ID = `${GAME_ID}-stream`;
const STREAM_NAME = "Data Stream File (.stream)";
const STREAM_PATH = path.join("data");
const streamFileExt = ".stream";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_PATH = path.join("bin");

let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

// This will also be the name of the merge folder.
// It creates a mod new mod folder and vortex will show an error message when for the first time after installing mods. User must select "Apply Changes".
// It Will also show up in the mod list. User must not enable this mod.
const PATCH_ID = `${GAME_ID}-patch--MergedMods--This-is-fine--Ignore-this--SELECT-APPLY-CHANGES--DO-NOT-ENABLE`;
const PATCH_NAME = "Data Patch (.patch0)";
const PATCH_PATH = path.join("data");
const patchModFileExt = ".patch_0";
const PATCH_EXT_NONUMBER = ".patch_";
const PATCH_EXTS = [".patch_0", ".gpu_resources", ".stream"];
//const PATCH_EXTS = [".patch_0", ".patch_0.gpu_resources", ".patch_0.stream"];
const PATCH_FILE1 = "9ba626afa44a3aa3.patch_0";
const PATCH_FILE2 = "9ba626afa44a3aa3.patch_0.gpu_resources";
const PATCH_FILE3 = "9ba626afa44a3aa3.patch_0.stream";
const PATCH_FILES_ARR = [PATCH_FILE1, PATCH_FILE2, PATCH_FILE3];

const SOUNDPATCH_ID = `${GAME_ID}-soundpatch`;
const SOUNDPATCH_NAME = "Data Sound Patch (.patch0)";
const SOUNDPATCH_EXTS = [".patch_0"];
const SOUNDPATCH_FILE1 = "2e24ba9dd702da5c.patch_0";
const SOUNDPATCH_FILE2 = "5ab4204a4e0ccbe8.patch_0";
const SOUNDPATCH_FILE3 = "7c221cf5b12213ac.patch_0";
const SOUNDPATCH_FILE4 = "9bc33b7058a2bd5a.patch_0";
const SOUNDPATCH_FILE5 = "e75f556a740e00c9.patch_0";
const SOUNDPATCH_FILES_ARR = [SOUNDPATCH_FILE1, SOUNDPATCH_FILE2, SOUNDPATCH_FILE3, SOUNDPATCH_FILE4, SOUNDPATCH_FILE5];

const IGNORED_FILES = [path.join('**', PATCH_FILE1), path.join('**', PATCH_FILE2), path.join('**', PATCH_FILE3)];

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
      "steamAppId": +STEAMAPP_ID,
      "ignoreConflicts": IGNORED_FILES,
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
      "targetPath": path.join('{gamePath}', DATA_PATH)
    },
    {
      "id": STREAM_ID,
      "name": STREAM_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', STREAM_PATH)
    },
    {
      "id": BINARIES_ID,
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": path.join('{gamePath}', BINARIES_PATH)
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

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 40,
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

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

//Test for .patch0 files (in mod merger)
function testPatch(files, gameId) {
  const isMod = files.some(file => path.extname(file).toLowerCase() === patchModFileExt);
  const isGpuPatch = files.some(file => path.basename(file).toLowerCase() === PATCH_FILE2);
  let supported = (gameId === spec.game.id) && isMod && isGpuPatch;

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

//Install .patch0 files (in mod merger)
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

//install .patch_0 mods with multiple variants
function installPatchMulti(api, files) {
  let hasVariants = false;
  const patchFiles = files.reduce((accum, iter) => {
    if (PATCH_EXTS.includes(path.extname(iter).toLowerCase()) && PATCH_FILES_ARR.includes(path.basename(iter))) {
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

  let filtered = files.filter(file =>
    (
      (PATCH_EXTS.includes(path.extname(file).toLowerCase()))
    )
  );
  const queryVariant = () => {
    const patch = Object.keys(patchFiles).filter(key => patchFiles[key].length > 1);
    return Promise.map(patch, patchFile => {
      return api.showDialog('question', 'Choose Variant', {
        text: 'This mod has several variants for "{{patch}}" - please '
            + 'choose the variant you wish to install. (You can choose a '
            + 'different variant by re-installing the mod)',
        choices: patchFiles[patchFile].map((iter, idx) => ({ 
          id: iter,
          text: iter,
          value: idx === 0,
        })),
        parameters: {
          patch: patchFile,
        },
      }, [
        { label: 'Cancel' },
        { label: 'Confirm' },
      ]).then(res => {
        if (res.action === 'Confirm') {
          const choice = Object.keys(res.input).find(choice => res.input[choice]);
          filtered = filtered.filter(file => 
            !PATCH_EXTS.includes(path.extname(file).toLowerCase()) ||
            ((path.basename(file) === patchFile) && file.includes(choice)) ||
            (path.basename(file) !== patchFile)
          );
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
        /*accum.push({
          type: 'attribute',
          key: 'patchModFiles',
          value: patchFiles.map(f => path.basename(f)),
        }); //*/
        accum.push({
          type: 'copy',
          source: iter,
          destination: path.basename(iter),
        });
      }
      return accum;
    }, []);
    const instructions = [{ 
      type: 'setmodtype',
      value: PATCH_ID,
    }].concat(fileInstructions);
    return instructions;
  }

  const prom = hasVariants ? queryVariant : Promise.resolve;
  return prom()
    .then(() => Promise.resolve({ instructions: generateInstructions() }));
}

//Test for Sound .patch0 files (NOT in mod merger)
function testSoundPatch(files, gameId) {
  const isMod = files.some(file => path.extname(file).toLowerCase() === patchModFileExt);
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

//Install Sound .patch0 files (NOT in mod merger)
function installSoundPatch(files, gameSpec) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === patchModFileExt);
  //const patchFiles = files.filter(file => PATCH_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SOUNDPATCH_ID };
  /*
  const patchModFiles = {
    type: 'attribute',
    key: 'patchModFiles',
    value: patchFiles.map(f => path.basename(f))
  };
  //*/
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
  //instructions.push(patchModFiles);
  return Promise.resolve({ instructions });
}

// install sound .patch_0 mods with multiple variants
function installSoundPatchMulti(api, files) {
  let hasVariants = false;
  const patchFiles = files.reduce((accum, iter) => {
    if (SOUNDPATCH_EXTS.includes(path.extname(iter).toLowerCase())) {
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

  let filtered = files.filter(file =>
    (
      (SOUNDPATCH_EXTS.includes(path.extname(file).toLowerCase()))
    )
  );
  const queryVariant = () => {
    const patch = Object.keys(patchFiles).filter(key => patchFiles[key].length > 1);
    return Promise.map(patch, patchFile => {
      return api.showDialog('question', 'Choose Variant', {
        text: 'This mod has several variants for "{{patch}}" - please '
            + 'choose the variant you wish to install. (You can choose a '
            + 'different variant by re-installing the mod)',
        choices: patchFiles[patchFile].map((iter, idx) => ({ 
          id: iter,
          text: iter,
          value: idx === 0,
        })),
        parameters: {
          patch: patchFile,
        },
      }, [
        { label: 'Cancel' },
        { label: 'Confirm' },
      ]).then(res => {
        if (res.action === 'Confirm') {
          const choice = Object.keys(res.input).find(choice => res.input[choice]);
          filtered = filtered.filter(file => 
            !SOUNDPATCH_EXTS.includes(path.extname(file).toLowerCase()) ||
            ((path.basename(file) === patchFile) && file.includes(choice)) ||
            (path.basename(file) !== patchFile)
          );
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
        /*accum.push({
          type: 'attribute',
          key: 'patchModFiles',
          value: patchFiles.map(f => path.basename(f)),
        }); //*/
        accum.push({
          type: 'copy',
          source: iter,
          destination: path.basename(iter),
        });
      }
      return accum;
    }, []);
    const instructions = [{ 
      type: 'setmodtype',
      value: SOUNDPATCH_ID,
    }].concat(fileInstructions);
    return instructions;
  }

  const prom = hasVariants ? queryVariant : Promise.resolve;
  return prom()
    .then(() => Promise.resolve({ instructions: generateInstructions() }));
}

//Test for .stream files
function testStream(files, gameId) {
  const isMod = files.some(file => path.extname(file).toLowerCase() === streamFileExt);
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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions for Mod Managers
function autoDeployNotification(api) {
  const NOTIF_ID = 'setup-notification-helldivers2';
  const MESSAGE = 'Disabling Auto-Deploy is Recommended';
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
            bbcode: `Deployment of mods for Helldivers 2 is a bit slower and tedious. By disabling
            this option, it will save you time and make it easier on your PC / Drive.
            <br/>
            <br/>
            It is in "Settings > Interface > Automation > Deploy Mods when Enabled"
            <br/>
            <br/>
            There will be a notification to remind you that you need to deploy.`
          }, [
            { label: 'OK', action: () => dismiss() },
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

//Notify User of Setup instructions for Mod Managers
function setupNotification(api) {
  const NOTIF_ID = 'setup-notification-helldivers2-general';
  const MESSAGE = 'Special Instructions for Helldivers 2';
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
            bbcode: `This extension uses the Load Order you set for "patch0" graphics mods to do automatic file renaming.
            <br/>
            <br/>
            Note that this merger is only for graphics mods. Sound mods will not be merged and must be renumbered manually.`
          }, [
            { label: 'OK', action: () => dismiss() },
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

//Functions for .patch0 file extension renaming and load ordering
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = PATCH_EXTS;

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    /*
    const patch = util.getSafe(modInfo.attributes, ['patchModFiles'], []);
    if (patch.length > 1) name = name + ` (${patch.length} ${fileExt} files)`; 
    //*/
    return {
      id: mod.id,
      name,
      imgUrl: util.getSafe(modInfo, ['attributes', 'pictureUrl'], path.join(__dirname, spec.game.logo))
    }
  });

  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);
}

//util.copyFileAtomic(`srcPath`, `destPath`)

//Setup function
async function setup(discovery, api, gameSpec) {
  setupNotification(api);
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  /*const isAutoDeployOn = api.getState().settings.automation.deploy;
  if (isAutoDeployOn) autoDeployNotification(api); //*/
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

  //register mod types recusively
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });
  //register mod types explicitly
  context.registerModType(PATCH_ID, 25, //id, priority
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, //isSupported - Is this mod for this game
    (game) => pathPattern(context.api, game, path.join('{gamePath}', PATCH_PATH)), //getPath - mod install location
    () => Promise.resolve(false), //test - is installed mod of this type
    {
      name: PATCH_NAME,
    } //options
  );
  context.registerModType(SOUNDPATCH_ID, 30, //id, priority
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, //isSupported - Is this mod for this game
    (game) => pathPattern(context.api, game, path.join('{gamePath}', PATCH_PATH)), //getPath - mod install location
    () => Promise.resolve(false), //test - is installed mod of this type
    {
      name: SOUNDPATCH_NAME,
    } //options
  );

  //register mod installers
  context.registerInstaller(DATA_ID, 25, testDlbin, installDlbin);
  //context.registerInstaller(PATCH_ID, 30, testPatch, installPatch);
  context.registerInstaller(PATCH_ID, 27, testPatch, (files) => installPatchMulti(context.api, files));
  //context.registerInstaller(SOUNDPATCH_ID, 29, testSoundPatch, installSoundPatch);
  context.registerInstaller(SOUNDPATCH_ID, 27, testSoundPatch, (files) => installSoundPatchMulti(context.api, files));
  context.registerInstaller(STREAM_ID, 31, testStream, installStream);

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

const mergeTest = (game, discovery, context) => {
  if (game.id !== GAME_ID) return;

  return {
    baseFiles: () => [],
    filter: () => true
  }
}

const sendRefreshLoadOrderNotification = (context) => {
  context.api.sendNotification({
    id: 'refresh-load-order-notification-helldivers2',
    type: 'error',
    message: 'Refresh your load order',
    allowSuppress: false,
  });
};

const mergeOperation = (filePath, mergePath, context, currentLoadOrder) => {

  const state = context.api.getState();
  const profile = selectors.lastActiveProfileForGame(state, GAME_ID);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});

  const splittedPath = filePath.split(path.sep);
  const fileName = splittedPath.pop();
  const modName = splittedPath.pop();

  //const splitString = fileName.match(/patch_[0-9]*/); // Use RegEx to get actual "patch_X" string from fileName
  const splitString = "patch_0";
  const [fileStart, fileEnd] = fileName.split(splitString);

  const modIsInLoadOrder = loadOrder[modName] != undefined;
  const modPosition = modIsInLoadOrder ? loadOrder[modName].pos : Object.keys(loadOrder).length;

  if (modPosition == undefined) {
    sendRefreshLoadOrderNotification(context);
  }
  else {
    const targetFileName = `${fileStart}patch_${modPosition}${fileEnd}`;
    const mergeTarget = path.join(mergePath, targetFileName);
    //ADD - Sanity checks before file copy
    fs.ensureDirWritableAsync(path.dirname(mergeTarget));
    fs.ensureDirWritableAsync(path.dirname(filePath));
    return util.copyFileAtomic(filePath, mergeTarget)
    //return fs.copyAsync(filePath, mergeTarget)
      .catch({ code: 'ENOENT' }, err => {
        // not entirely sure whether "ENOENT" refers to the source file or the directory we're trying to copy into, the error object contains only one of those paths
        context.api.showErrorNotification('Failed to rename patch0 files from load order', err);
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
    id: 'deploy-notification-helldivers2',
    type: 'warning',
    message: 'Deployment is needed',
    allowSuppress: true,
    actions: [
      {
        title: 'Deploy',
        action: () => context.api.events.emit('deploy-mods', (err) => {
          log('warn', `Error deploying mods: ${err}`);
        })
      }
    ],
  });
};

//Main Function
function main(context) {
  applyGame(context, spec);

  let currentLoadOrder;
  context.registerLoadOrderPage({
    gameId: spec.game.id,
    gameArtURL: path.join(__dirname, spec.game.logo),
    preSort: (items, direction) => preSort(context.api, items, direction),
    filter: mods => mods.filter(mod => mod.type === PATCH_ID),
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
      context.api.translate(`THIS LOAD ORDER IS FOR GRAPHICS MODS ONLY. Sound mods are not included here. Drag and drop the patch mods on the left to change the
        order in which they load. ${spec.game.name} loads patch mods in numerical 
        order, so Vortex suffixes the file names with ".patch_0, .patch_1, .patch_2, etc." 
        to ensure they load in the order you set here. The number in the left column 
        represents the overwrite order. The changes from mods with higher numbers will 
        take priority over other mods which make similar edits.`
      ),
  });

  context.registerMerge( //register merger for .patch0 graphics mods
    (game, discovery) => mergeTest(game, discovery, context),
    (filePath, mergePath) => mergeOperation(filePath, mergePath, context, currentLoadOrder),
    PATCH_ID
  );

  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const lastActiveHelldiverProfile = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== lastActiveHelldiverProfile) return;
      context.api.dismissNotification('deploy-notification-helldivers2');
      // Because we create a merged mod when deploying, Vortex thinks that all mods have duplicates and are redundant
      context.api.dismissNotification('redundant-mods');
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
