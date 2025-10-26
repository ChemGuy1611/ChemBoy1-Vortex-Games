
// BASIC FUNCTIONS ///////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

//get discovery.path from state
const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};
//Trigger purge and deploy events
async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// Read an unknown folder name in a path //////////////////////////////////////////////////////
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, DATA_FOLDER, 'Saved', 'SaveGames');
let USERID_FOLDER = "";
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}
try {
  const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
} //*/
let SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);

// Check if folders are on the same drive partition //////////////////////////////////////////////////////
STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
function checkPartitions(folder, discoveryPath) {
  try {
    // Define paths
    const path1 = discoveryPath;
    const path2 = STAGING_FOLDER;
    const path3 = folder;
    // Ensure all folders exist
    fs.ensureDirSync(path1);
    fs.ensureDirSync(path2);
    fs.ensureDirSync(path3); 
    // Get the stats for all folders
    const stats1 = fs.statSync(path1);
    const stats2 = fs.statSync(path2);
    const stats3 = fs.statSync(path3);
    // Read device IDs and check if they are all the same
    const a = stats1.dev;
    const b = stats2.dev;
    const c = stats3.dev;
    const TEST = ((a === b) && (b === c));
    return TEST;
  } catch (err) {
    //log('error', `Error checking folder partitions: ${err}`);
    return false;
  }
}
//* register modtypes with partition checks
context.registerModType(CONFIG_ID, 60, 
(gameId) => {
    GAME_PATH = getDiscoveryPath(context.api);
    if (GAME_PATH !== undefined) {
    CHECK_DATA = checkPartitions(CONFIGMOD_LOCATION, GAME_PATH);
    }
    return ((gameId === GAME_ID) && (CHECK_DATA === true));
},
(game) => pathPattern(context.api, game, CONFIG_TARGET), 
() => Promise.resolve(false), 
{ name: CONFIG_NAME }
); //*/

// Did deploy/purge boilerplate //////////////////////////////////////////////////////
async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  
  return Promise.resolve();
}
async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  
  return Promise.resolve();
}

//AUTO-DOWNLOAD FUNCTIONS /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

//* for downloader.js
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');
const SHADPS4_ARC_NAME = `shadps4-win64-qt-${SHADPS4_VERSION}.zip`;
const SHADPS4_URL_MAIN = `https://api.github.com/repos/shadps4-emu/shadPS4`;
const SHADPS4_FILE = 'shadPS4.exe'; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.
const REQUIREMENTS = [
  { //shadPS4
    archiveFileName: SHADPS4_ARC_NAME,
    modType: SHADPS4_ID,
    assemblyFileName: SHADPS4_FILE,
    userFacingName: SHADPS4_NAME,
    githubUrl: SHADPS4_URL_MAIN,
    findMod: (api) => findModByFile(api, SHADPS4_ID, SHADPS4_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, SHADPS4_ARC_NAME),
    fileArchivePattern: new RegExp(/^shadps4-win64-qt-(\d+\.\d+\.\d+)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
  },
]; //*/
//* Test version for all requirements
async function asyncForEachTestVersion(api, requirements) {
  for (let index = 0; index < requirements.length; index++) {
    await testRequirementVersion(api, requirements[index]);
  }
} //*/
//* Find all requirements
async function asyncForEachCheck(api, requirements) {
  let mod = [];
  for (let index = 0; index < requirements.length; index++) {
    mod[index] = await requirements[index].findMod(api);
  }
  let checker = mod.every((entry) => entry === true);
  return checker;
} //*/
//* called in context.once
async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await asyncForEachTestVersion(api, REQUIREMENTS);
    log('warn', 'Checked requirements versions');
  } catch (err) {
    log('warn', `failed to test requirement version: ${err}`);
  }
} //*/
//* check for each requirement
async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
} //*/
//* in setup function
const requirementsInstalled = await checkForRequirements(api);
if (!requirementsInstalled) {
    await download(api, REQUIREMENTS);
} //*/
//* in context.once
context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return onCheckModVersion(context.api, gameId, mods, forced);
}); //*/

// Check if modType is installed //////////////////////////////////////////////////////
function isUe4ssInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === UE4SS_ID);
}

// Download from GitHub page (user browse for download)
async function downloadUe4ss(api, gameSpec) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  const URL = UE4SS_URL;
  const MOD_NAME = UE4SS_NAME;
  const MOD_TYPE = UE4SS_ID;
  const ARCHIVE_NAME = UE4SS_DLFILE_STRING;
  const instructions = api.translate(`Click on Continue below to open the browser. - `
    + `Navigate to the latest experimental version of ${MOD_NAME} on the GitHub releases page and `
    + `click on the appropriate file to download and install the mod.`
  );

  if (!isInstalled) {
    return new Promise((resolve, reject) => { //Browse and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.ProcessCanceled('Selected wrong download'));
        } //*/
        return Promise.resolve(result);
      })
      .catch((error) => {
        return reject(error);
      })
      .then((result) => {
        const dlInfo = {game: gameSpec.game.id, name: MOD_NAME};
        api.events.emit('start-download', result, {}, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              return resolve();
            });
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please re-launch Vortex and try again.`, err, { allowReport: false });
        //util.opn(URL).catch(() => null);
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from modDB at the opened paged and install the zip in Vortex.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }
} //*/

// Function to user-browse download from an external website
async function downloadUe4ssNexus(api, gameSpec) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = UE4SS_NAME;
    const MOD_TYPE = UE4SS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = UE4SS_PAGE_NO;
    const FILE_ID = UE4SS_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = gameSpec.game.id;
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
      let FILE = null;
      let URL = null;
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
      }
      const dlInfo = { //Download the mod
        game: gameSpec.game.id,
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

//* User Browse download and Run executable


// LOAD ORDER /////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

// Folder-based load order //////////////////////////////////////////////////////
let previousLO;
context.registerLoadOrderPage({
    gameId: spec.game.id,
    gameArtURL: path.join(__dirname, spec.game.logo),
    preSort: (items, direction) => preSort(context.api, items, direction),
    filter: mods => mods.filter(mod => mod.type === UE5_SORTABLE_ID),
    displayCheckboxes: true,
    callback: (loadOrder) => {
    if (previousLO === undefined) previousLO = loadOrder;
    if (loadOrder === previousLO) return;
    context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
    previousLO = loadOrder;
    },
    createInfoPanel: () =>
    context.api.translate(`Drag and drop the mods on the left to change the order in which they load. ${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes `
    + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
    + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.'),
});

//UNREAL - Pre-sort function
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = UNREALDATA.fileExt;

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    const paks = util.getSafe(modInfo.attributes, ['unrealModFiles'], []);
    if (paks.length > 1) name = name + ` (${paks.length} ${fileExt} files)`;

    return {
      id: mod.id,
      name,
      imgUrl: util.getSafe(modInfo, ['attributes', 'pictureUrl'], path.join(__dirname, spec.game.logo))
    }
  });

  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);
}
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
function makePrefix(input) {
  let res = '';
  let rest = input;
  while (rest > 0) {
      res = String.fromCharCode(65 + (rest % 25)) + res;
      rest = Math.floor(rest / 25);
  }
  return util.pad(res, 'A', 3);
}
function loadOrderPrefix(api, mod) {
  const state = api.getState();
  const profile = selectors.lastActiveProfileForGame(state, GAME_ID);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});
  const loKeys = Object.keys(loadOrder);
  const pos = loKeys.indexOf(mod.id);
  if (pos === -1) {
      return 'ZZZZ-';
  }
  return makePrefix(pos) + '-';
}
function installUnrealMod(api, files, gameId) {
  return __awaiter(this, void 0, void 0, function* () {
    const game = gameId;
    const fileExt = UNREALDATA.fileExt;
    if (!fileExt)
      Promise.reject('Unsupported game - UE5 installer failed.');
    const modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const modType = {
      type: 'setmodtype',
      value: UE5_SORTABLE_ID,
    };
    const installFiles = (modFiles.length > PAK_FILE_MIN)
      ? yield chooseFilesToInstall(api, modFiles, fileExt)
      : modFiles;
    const unrealModFiles = {
      type: 'attribute',
      key: 'unrealModFiles',
      value: modFiles.map(f => path.basename(f))
    };
    let instructions = installFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file)
      };
    });
    instructions.push(modType);
    instructions.push(unrealModFiles);
    return Promise.resolve({ instructions });
  });
}
function chooseFilesToInstall(api, files, fileExt) {
  return __awaiter(this, void 0, void 0, function* () {
    const t = api.translate;
    return api.showDialog('question', t('Multiple {{PAK}} files', { replace: { PAK: fileExt } }), {
        text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: fileExt } }) +
            `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
        checkboxes: files.map((pak) => {
            return {
                id: path.basename(pak),
                text: path.basename(pak),
                value: false
            };
        })
    }, [
        { label: 'Cancel' },
        { label: 'Install Selected' },
        { label: 'Install All_plural' }
    ]).then((result) => {
        if (result.action === 'Cancel')
            return Promise.reject(new util.ProcessCanceled('User cancelled.'));
        else {
            const installAll = (result.action === 'Install All' || result.action === 'Install All_plural');
            const installPAKS = installAll ? files : Object.keys(result.input).filter(s => result.input[s])
                .map(file => files.find(f => path.basename(f) === file));
            return installPAKS;
        }
    });
  });
}
function UNREALEXTENSION(context) {
  const testUnrealGame = (gameId, withLoadOrder) => {
    const game = gameId === spec.game.id;
    const unrealModsPath = UNREALDATA.modsPath;
    const loadOrder = UNREALDATA.loadOrder;
    return (!!unrealModsPath && game && loadOrder === true);
  };

  const testForUnrealMod = (files, gameId) => {
    const supportedGame = testUnrealGame(gameId);
    const fileExt = UNREALDATA.fileExt;
    let modFiles = [];
    if (fileExt)
      modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const supported = (supportedGame && (gameId === spec.game.id) && modFiles.length > 0);
    return Promise.resolve({
      supported,
      requiredFiles: []
    });
  };

  const getUnrealModsPath = (game) => {
    const modsPath = UNREALDATA.modsPath;
    const state = context.api.getState();
    const discoveryPath = util.getSafe(state.settings, ['gameMode', 'discovered', game.id, 'path'], undefined);
    const installPath = [discoveryPath].concat(modsPath.split(path.sep));
    return discoveryPath ? path.join.apply(null, installPath) : undefined;
  };

  context.registerInstaller('ue5-pak-installer', 29, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealMod(context.api, files, gameId));

  context.registerModType(UE5_SORTABLE_ID, 25, 
    (gameId) => testUnrealGame(gameId, true), 
    getUnrealModsPath, 
    () => Promise.resolve(false), 
    { name: UE5_SORTABLE_NAME,
      mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id
    }
  );
}

// FBLO (File-Based Load Order) //////////////////////////////////////////////////////////////////////


//Dynamic executable path
function getExecutable(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return EXEC_XBOX;
  };
  if (isCorrectExec(EXEC_DEFAULT)) {
    GAME_VERSION = 'steam';
    return EXEC_DEFAULT;
  };
  if (isCorrectExec(EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    return EXEC_EPIC;
  };
  if (isCorrectExec(EXEC_GOG)) {
    GAME_VERSION = 'gog';
    return EXEC_GOG;
  }; 
  if (isCorrectExec(EXEC_DEMO)) {
    GAME_VERSION = 'demo';
    return EXEC_DEMO;
  }; //*/
  GAME_VERSION = 'default';
  return EXEC;
}

// NOTIFICATIONS ///////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////

//Success notification
function linkSuccessNotify(api) {
  const NOTIF_ID = `${GAME_ID}-folonlinksuccess`;
  const MESSAGE = `${EXTENSION_NAME} successfully linked FOLON GOG game files to FO4 Vortex Staging Folder`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'success',
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}

//Basic notification
function partitionCheckNotify(api, CHECK_DATA) {
  const NOTIF_ID = `${GAME_ID}-partioncheck`;
  const MESSAGE = 'Some Mods Installers are Not Available';
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
            text: `Because ${GAME_NAME} includes the IO-Store Unreal Engine feature, Vortex must use hardlinks to install mods for the game.\n`
                + `Because of this, the game, staging folder, and user folder (typically on C Drive) must all be on the same partition to install certain mods with Vortex.\n`
                + `Vortex detected that one or more of the mod types listed below are not available because the game, staging folder, and user folder are not on the same partition.\n`
                + `\n`
                + `Here are your results for the partition check to enable these mod types:\n`
                + `  - Config: ${CHECK_DATA ? `ENABLED: ${CONFIG_LOC} folder is on the same partition as the game and the Vortex staging folder, so the Config modtype is available` : `DISABLED: ${CONFIG_LOC} folder is NOT on the same partition as the game and the Vortex staging folder, so the Config modtype is NOT available`}\n`
                + `  - Save: ${CHECK_DATA ? `ENABLED: ${SAVE_LOC} folder is on the same partition as the game and the Vortex staging folder, so the Save modtype is available` : `DISABLED: ${SAVE_LOC} folder is NOT on the same partition as the game and the Vortex staging folder, so the Save modtype is NOT available`}\n`

                + `\n`
                + `Config Path: ${CONFIG_PATH}\n`
                + `Save Path: ${SAVE_PATH}\n`
                + `\n`
                + `If you want to use the disabled mod types, you must move the game and staging folder to the same partition as the folders shown above (typically C Drive).\n`
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

//Tool-run notification
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
            text: `For most mods, you must use ${MOD_NAME} to install the mod to the game files after installing with Vortex.\n`
                + `TFC mods will be found at this folder: "${TFC_FOLDER}\\Mods".\n`
                + `BLCMM mods (.blcm files) will be found in the "Binaries" folder.\n`  
                + `.txt patch files for OpenBLCMM will be found at the game root folder.\n`         
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
//run the tool
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

// SETUP FUNCTIONS ////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

//Setup function - ensure modType Folders are writable
async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//

// REGISTER GAME FUNCTIONS /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

//getGameVersion
async function setGameVersion(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  }
  else { 
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  };
}
//For games with an Xbox version and a readable executable for non-Xbox versions
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') { // use appxmanifest.xml for Xbox version
    try { //try to parse appxmanifest.xml
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parsed = await parseStringPromise(appManifest);
      version = parsed?.Package?.Identity?.[0]?.$?.Version;
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  else { // use DoomTheDarkAges.exe for Steam
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
}

//Specify a second executable to use for versioning
function getShippingExe(gamePath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(gamePath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_DEFAULT)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_DEFAULT}-Shipping.exe`);
    return SHIPPING_EXE;
  };
  if (isCorrectExec(EXEC_EPIC)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_EGS}-Shipping.exe`);
    return SHIPPING_EXE;
  };
  if (isCorrectExec(EXEC_GOG)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_GOG}-Shipping.exe`);
    return SHIPPING_EXE;
  };
  if (isCorrectExec(EXEC_DEMO)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_DEMO}-Shipping.exe`);
    return SHIPPING_EXE;
  };
}
async function resolveGameVersion(gamePath, exePath) {
  //SHIPPING_EXE = getShippingExe(gamePath);
  const READ_FILE = path.join(gamePath, SHIPPING_EXE);
  let version = '0.0.0';
  try {
    const exeVersion = require('exe-version');
    version = await exeVersion.getProductVersion(READ_FILE);
    //log('warn', `Resolved game version for ${GAME_ID} to: ${version}`);
    return Promise.resolve(version); 
  } catch (err) {
    log('error', `Could not read ${READ_FILE} file to get game version: ${err}`);
    return Promise.resolve(version);
  }
}

//tools
supportedTools: [
    {
    id: `${GAME_ID}-customlaunch`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC_DEFAULT,
    requiredFiles: [EXEC_DEFAULT],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: [],
    }, //*/
    {
    id: `${GAME_ID}-customlaunchxbox`,
    name: `Custom Launch (Xbox)`,
    logo: `exec.png`,
    executable: () => EXEC_XBOX,
    requiredFiles: [EXEC_XBOX],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: [],
    }, //*/
    /*{
    id: SAVE_EDITOR_ID,
    name: SAVE_EDITOR_NAME,
    logo: `saveeditor.png`,
    queryPath: getBinariesFolder,
    executable: () => SAVE_EDITOR_EXEC,
    requiredFiles: [SAVE_EDITOR_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    //parameters: [],
    }, //*/
],


// CONTEXT.ONCE FUNCTIONS /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

// Combine txt files into one
//* In context.once 
context.api.onAsync('did-deploy', async (profileId, deployment) => {
    const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
    if (profileId !== LAST_ACTIVE_PROFILE) return;
    return didDeploy(context.api, profileId);
}); //*/
context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return onCheckModVersion(context.api, gameId, mods, forced);
}); //*/
context.api.onAsync('did-purge', (profileId) => didPurge(context.api, profileId));
//* After deploy
async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  await writeCfgDeploy(api);
  deployNotify(api);
  return Promise.resolve();
} //*/
//* After purge
async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  await writeCfgPurge(api);
  return Promise.resolve();
} //*/
//* Write autoexec.cfg on deploy
async function writeCfgDeploy(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const AUTOEXEC_CFG_PATH = path.join(GAME_PATH, CONFIG_PATH, AUTOEXEC_CFG_FILE);
  const CFG_PATH = path.join(GAME_PATH, CONFIG_PATH);

  let EXISTING_CONTENT = await fs.readFileAsync(
    AUTOEXEC_CFG_PATH, 
    { encoding: "utf8", }
  );
  let EXISTING_CONTENT_ARRAY = EXISTING_CONTENT.split("\n");
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => !line.startsWith('exec'));
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => (line !== ``));
  EXISTING_CONTENT = EXISTING_CONTENT_ARRAY.join("\n");

  let modFiles = [];
  const CFG_EXT_FILTER = CONFIG_EXTS;
  const CFG_FILE_FILTER = [AUTOEXEC_CFG_FILE, 'candidate.cfg', 'default.cfg', 'disclayout.cfg'];
  try {
    modFiles = await fs.readdirAsync(CFG_PATH);
    modFiles = modFiles.filter(file => CFG_EXT_FILTER.includes(path.extname(file).toLowerCase()));
    modFiles = modFiles.filter(file => !CFG_FILE_FILTER.includes(path.basename(file)));
    modFiles = modFiles.map(file => `exec ${file}`);
  } catch {
    return Promise.reject(new Error('Failed to read Data folder'));
  }
  return fs.writeFileAsync(
    AUTOEXEC_CFG_PATH,
    `${EXISTING_CONTENT + '\n' + modFiles.join('\n')}`,
    { encoding: "utf8" },
  );
} //*/
//* Reset autoexec.cfg on purge
async function writeCfgPurge(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const AUTOEXEC_CFG_PATH = path.join(GAME_PATH, CONFIG_PATH, AUTOEXEC_CFG_FILE);

  let EXISTING_CONTENT = await fs.readFileAsync(
    AUTOEXEC_CFG_PATH, 
    { encoding: "utf8", }
  );
  let EXISTING_CONTENT_ARRAY = EXISTING_CONTENT.split("\n");
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => !line.startsWith('exec'));
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => (line !== ``));
  EXISTING_CONTENT = EXISTING_CONTENT_ARRAY.join("\n");

  return fs.writeFileAsync(
    AUTOEXEC_CFG_PATH,
    EXISTING_CONTENT,
    { encoding: "utf8" },
  );
} //*/