/*////////////////////////////////////////////////
Name: Horizon Forbidden West Vortex Extension
Author: ChemBoy1
Version: 0.2.4
Date: 2026-01-27
////////////////////////////////////////////////*/

//import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const STEAMAPP_ID = "2420110";
const EPICAPP_ID = "2efe99166b8847e9bcd80c571b05e1b6";
const GAME_ID = "horizonforbiddenwest";
const EXEC = "HorizonForbiddenWest.exe";
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Horizon_Forbidden_West";

//Info for mod types and installers
const SAVE_ID = `${GAME_ID}-save`
const SAVE_EXT = '.dat'
const userDocsValue = util.getVortexPath('documents');
const userDocsPathString = userDocsValue.replace(/x00s/g, '');
const SAVE_FOLDER = path.join(userDocsPathString, 'Horizon Forbidden West Complete Edition');
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
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);

let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = ''; 
let GAME_PATH = '';
let modManagerInstalled = false;
let repackerInstalled = false;

const MODMANAGER_ID = `${GAME_ID}-modmanager`;
const MODMANAGER_NAME = "HFW Mod Manager";
const MODMANAGER_STRING = 'HFW Mod Manager';
const MODMANAGER_EXEC = 'HFW_MM.exe';
const MODMANAGER_PAGE_NO = 137;
const MODMANAGER_FILE_NO = 683;
const MODMANAGER_DOMAIN = GAME_ID;

const REPACKER_ID = `${GAME_ID}-repacker`;
const REPACKER_NAME = "Repacker";
const REPACKER_EXEC = 'Repacker.exe';
const REPACKER_PAGE_NO = 1;
const REPACKER_FILE_NO = 1;
const REPACKER_DOMAIN = GAME_ID;

const loaderChoice = false; //toggle for choice of mod packer

const MANAGERMOD_ID = `${GAME_ID}-managermod`;
const MANAGERMOD_NAME = "HFW Manager Mod";
const MANAGERMOD_PATH = path.join('mods');
const MANAGERMOD_EXTS = ['.core', '.stream'];
const MANAGERMOD_FILES = ['modinfo.json'];

const spec = {
  "game": {
    "id": GAME_ID,
    "name": "Horizon Forbidden West",
    "executable": EXEC,
    "logo": "horizonforbiddenwest.jpg",
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": MANAGERMOD_ID,
      "name": MANAGERMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MANAGERMOD_PATH)
    },
    {
      "id": MODMANAGER_ID,
      "name": MODMANAGER_NAME,
      "priority": "low",
      "targetPath": '{gamePath}'
    },
    {
      "id": REPACKER_ID,
      "name": REPACKER_NAME,
      "priority": "low",
      "targetPath": '{gamePath}'
    },
    {
      "id": SAVE_ID,
      "name": "Save Game (Documents)",
      "priority": "low",
      "targetPath": SAVE_PATH
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
    ],
    "names": []
  }
};

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//convert path placeholders to actual values
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Get mod path
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

async function requiresLauncher(gamePath, store) {
  //*
  if (store === 'epic') {
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

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// AUTO-DOWNLOADER FUNCTIONS ///////////////////////////////////////////////////

//Check if HFW ModManager is installed
async function isModManagerInstalled(api) {
  try {
    GAME_PATH = getDiscoveryPath(api);
    await fs.statAsync(path.join(GAME_PATH, MODMANAGER_EXEC));
    return true;
  } catch (err) {
    return false;
  }
}

//Check if Repacker is installed
function isRepackerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === REPACKER_ID);
}

//* Function to auto-download HFW MM from Nexus Mods
async function downloadModManager(api, check) {
  GAME_PATH = getDiscoveryPath(api);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(api.getState(), GAME_ID);
  let isInstalled = await isModManagerInstalled(api);
  if (check === false) isInstalled = false;
  if (!isInstalled) {
    const MOD_NAME = MODMANAGER_NAME;
    const MOD_TYPE = MODMANAGER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = MODMANAGER_PAGE_NO;
    const FILE_ID = MODMANAGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = MODMANAGER_DOMAIN;
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
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //*Only start-download with Promise
      return new Promise((resolve, reject) => {
        api.events.emit('start-download', [URL], dlInfo, undefined,
          async (error, dlid) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            try { //find the file in Download and copy it to the game folder
              api.sendNotification({ //notification indicating copy process
                id: `${NOTIF_ID}-copy`,
                message: `Copying ${MOD_NAME} executable to game folder`,
                type: 'activity',
                noDismiss: true,
                allowSuppress: false,
              });
              let files = await fs.readdirAsync(DOWNLOAD_FOLDER);
              //let files = fs.readdirSync(DOWNLOAD_FOLDER);
              files = files.filter(file => ( path.basename(file).includes(MODMANAGER_STRING) && (path.extname(file).toLowerCase() === '.exe') ))
                .sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                .reverse();
              const copyFile = files[0];
              await fs.statAsync(path.join(DOWNLOAD_FOLDER, copyFile));
              //fs.statSync(path.join(DOWNLOAD_FOLDER, copyFile));
              const source = path.join(DOWNLOAD_FOLDER, copyFile);
              const destination = path.join(GAME_PATH, MODMANAGER_EXEC);
              await fs.copyAsync(source, destination, { overwrite: true });
              //fs.copySync(source, destination, { overwrite: true });
              api.dismissNotification(NOTIF_ID);
              api.dismissNotification(`${NOTIF_ID}-copy`);
              api.sendNotification({ //notification copy success
                id: `${NOTIF_ID}-success`,
                message: `Successfully copied ${MOD_NAME} executable to game folder`,
                type: 'success',
                noDismiss: false,
                allowSuppress: true,
              });
            } catch (err) {
              const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
              api.showErrorNotification(`Failed to download and copy ${MOD_NAME} executable`, err, { allowReport: false });
              util.opn(errPage).catch(() => null);
              return reject(err);
            }
            finally {
              api.dismissNotification(NOTIF_ID);
              api.dismissNotification(`${NOTIF_ID}-copy`);
              return resolve();
            }
          },
          'never',
          { allowInstall: false },
        );
      });
    } catch (err) { //Show the user the download page if the download and copy process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download and copy ${MOD_NAME} executable`, err, { allowReport: false });
      util.opn(errPage).catch(() => null);
      api.dismissNotification(NOTIF_ID);
      api.dismissNotification(`${NOTIF_ID}-copy`);
    }
  }
} //*/

//* Function to auto-download Repacker from Nexus Mods
async function downloadRepacker(api, gameSpec) {
  let isInstalled = isRepackerInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = REPACKER_NAME;
    const MOD_TYPE = REPACKER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = REPACKER_PAGE_NO;
    const FILE_ID = REPACKER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = REPACKER_DOMAIN;
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

//Test for Repacker files
function testRepacker(files, gameId) {
  const isMod = files.some(file => path.basename(file) === REPACKER_EXEC);
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

//Install Repacker files
function installRepacker(files) {
  const MOD_TYPE = REPACKER_ID;
  const modFile = files.find(file => path.basename(file) === REPACKER_EXEC);
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

//test whether to use mod installer
function testSave(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === spec.game.id) &&
      (files.find(file => path.extname(file).toLowerCase() === SAVE_EXT) !== undefined);

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
function installSave(files) {
  // The .psarc file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep))));

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

//test for HFW MM files/exts
function testManagerMod(files, gameId) {
  const isInfo = files.some(file => MANAGERMOD_FILES.includes(path.basename(file).toLowerCase()));
  const isExt = files.some(file => MANAGERMOD_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isInfo || isExt );

  // Test for a mod installer
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
  supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: []
  });
}

//Install Mod Manager mod (unzipped in folder)
function installManagerMod(files, fileName) {
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*/gi, '');
  const setModTypeInstruction = { type: 'setmodtype', value: MANAGERMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep)));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User to run Mod Manager after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = 'HFW MM';
  const MESSAGE = `Run ${MOD_NAME} after Deploy`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: `Run ${MOD_NAME}`,
        action: (dismiss) => {
          runManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You must use ${MOD_NAME} to install .core/.stream mods after installing with Vortex.\n`
                + `\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
                + `Select the mod options you want, then click the "Pack Mods" button.\n`
          }, [
            /*{
              label: `Open Game Folder`, action: () => {
                util.opn(GAME_PATH).catch(() => null);
                dismiss();
              }
            }, //*/
            { 
              label: `Run ${MOD_NAME}`, action: () => {
                runManager(api);
                dismiss();
              }
            }, //*/
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

//Notify User to run Mod Manager to restore vanilla files on purge
function purgeNotify(api) {
  const NOTIF_ID = `${GAME_ID}-purge-notification`;
  const MOD_NAME = 'HFW MM';
  const MESSAGE = `Run ${MOD_NAME} To Restore Files`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: `Run ${MOD_NAME}`,
        action: (dismiss) => {
          runManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `\n`
                + `Vortex just detected that you have purged mods.\n`
                + `If you wish to restore the game to a vanilla state, you must run ${MOD_NAME} and click the "Restore Files" button.\n`
                + `\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            /*{
              label: `Open Game Folder`, action: () => {
                util.opn(GAME_PATH).catch(() => null);
                dismiss();
              }
            }, //*/
            { 
              label: `Run ${MOD_NAME}`, action: () => {
                runManager(api);
                dismiss();
              }
            }, //*/
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

function runManager(api) {
  let TOOL_ID =  MODMANAGER_ID;
  let TOOL_NAME = MODMANAGER_NAME;
  if (repackerInstalled && !modManagerInstalled) {
    TOOL_ID = REPACKER_ID;
    TOOL_NAME = REPACKER_NAME;
  }
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], 
        { 
          //cwd: path.dirname(TOOL_PATH),
          detach: true, 
          //env: { 'PATH': process.env.PATH },
          //shell: true, 
          suggestDeploy: false 
        })
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

//Setup function
async function setup(discovery, api, gameSpec) {
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(api.getState(), gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(api.getState(), gameSpec.game.id);
  modManagerInstalled = await isModManagerInstalled(api);
  repackerInstalled = isRepackerInstalled(api, gameSpec);
  if (!modManagerInstalled && !repackerInstalled) {
    if (loaderChoice) {
      await selectModPacker(api, gameSpec);
    } else {
      await downloadModManager(api, true);
    }
  }
  //await downloadModManager(api, true);
  await fs.ensureDirWritableAsync(path.join(discovery.path, MANAGERMOD_PATH));
  return fs.ensureDirWritableAsync(SAVE_PATH);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    supportedTools: [
      {
        id: MODMANAGER_ID,
        name: MODMANAGER_NAME,
        logo: `modmanager.png`,
        //queryPath: getDownloadsPath(context.api),
        executable: () => MODMANAGER_EXEC,
        requiredFiles: [MODMANAGER_EXEC],
        detach: true,
        relative: true,
        exclusive: false,
        //env: { 'PATH': process.env.PATH },
        //shell: true,
        //cwd: path.dirname(MODMANAGER_EXEC),
        //defaultPrimary: true,
        //parameters: [],
      }, //*/
      {
        id: REPACKER_ID,
        name: REPACKER_NAME,
        logo: `repacker.png`,
        //queryPath: getDownloadsPath(context.api),
        executable: () => REPACKER_EXEC,
        requiredFiles: [REPACKER_EXEC],
        detach: true,
        relative: true,
        exclusive: false,
        //env: { 'PATH': process.env.PATH },
        //shell: true,
        //defaultPrimary: true,
        //parameters: [],
      }, //*/
    ],
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
  if (loaderChoice) {
    context.registerInstaller(REPACKER_ID, 25, testRepacker, installRepacker);
  }
  context.registerInstaller(MANAGERMOD_ID, 27, testManagerMod, installManagerMod);
  context.registerInstaller(SAVE_ID, 25, testSave, installSave);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download HFW Mod Manager', () => {
    downloadModManager(context.api, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Repacker', () => {
    downloadRepacker(context.api, spec);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open HFW Mod Manager Page', () => {
    util.opn(`https://www.nexusmods.com/${GAME_ID}/mods/${MODMANAGER_PAGE_NO}`).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    util.opn(DOWNLOAD_FOLDER).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
}

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      modManagerInstalled = await isModManagerInstalled(context.api);
      repackerInstalled = isRepackerInstalled(context.api, spec);
      if (!modManagerInstalled && !repackerInstalled) {
        if (loaderChoice) {
          await selectModPacker(context.api, spec);
        } else {
          await downloadModManager(context.api, true);
        }
      }
      deployNotify(context.api);
      return Promise.resolve();
    });
    context.api.onAsync('did-purge', async (profileId) => { 
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      modManagerInstalled = await isModManagerInstalled(context.api);
      repackerInstalled = isRepackerInstalled(context.api, spec);
      if (!modManagerInstalled && !repackerInstalled) {
        if (loaderChoice) {
          await selectModPacker(context.api, spec);
        } else {
          await downloadModManager(context.api, true);
        }
      }
      purgeNotify(context.api);
      return Promise.resolve();
    });
  });
  return true;
}

//Function to select mod packer (HFW Mod Manager or Repacker)
async function selectModPacker(api, gameSpec) {
  const REC_LABEL = `${MODMANAGER_NAME} (Recommended)`;
  const t = api.translate;
  const replace = {
    game: gameSpec.game.name,
    bl: '[br][/br][br][/br]',
  };
  return api.showDialog('info', 'Mod Loader Selection', {
    bbcode: t('You must choose a mod packer to install .core and .stream mods.{{bl}}'
      + 'Either one is acceptable, but you should use only one at a time.{{bl}}'
      + 'Which mod packer would you like to use for {{game}}?',
      { replace }
    ),
  }, [
    { label: t(REC_LABEL) },
    { label: t(REPACKER_NAME) },
  ])
  .then(async (result) => {
    if (result === undefined) {
      return;
    }
    if (result.action === REC_LABEL) {
      await downloadModManager(api, true);
    } else if (result.action === REPACKER_NAME) {
      await downloadRepacker(api, gameSpec);
    }
  });
}

//export to Vortex
module.exports = {
  default: main,
};
