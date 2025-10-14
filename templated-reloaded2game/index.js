/*/////////////////////////////////////////////////
Name: XXX Vortex Extension
Structure: Reloaded-II Game (Mod Installer)
Author: ChemBoy1
Version: 0.1.0
Date: 2025-XX-XX
/////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const process = require('node:process');

//Specify all the information about the game
const GAME_ID = "XXX";
const STEAMAPP_ID = "XXX";
const STEAMAPP_ID_DEMO = "XXX";
const EPICAPP_ID = null;
const GOGAPP_ID = "XXX";
const XBOXAPP_ID = "XXX";
const XBOXEXECNAME = "XXX";
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID];
const GAME_NAME = "XXX";
const GAME_NAME_SHORT = "XXX";
const EXEC = "XXX.exe";
const EXEC_XBOX = 'gamelaunchhelper.exe';
const APPMANIFEST_FILE = 'appxmanifest.xml';

const MOD_LOADER_FOLDER = "";
const PUBLISHER_FOLDER = "";
const DATA_FOLDER = "";

let GAME_PATH = null;
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Data for mod types, tools, and installers
const RELOADED_ID = `${GAME_ID}-reloadedmanager`;
const RELOADED_NAME = "Reloaded-II Mod Manager";
const RELOADED_PATH = path.join("Reloaded");
const RELOADED_EXEC = "reloaded-ii.exe";
const RELOADED_EXEC_PATH = path.join(RELOADED_PATH, RELOADED_EXEC);
const RELOADED_URL_LATEST = `https://github.com/Reloaded-Project/Reloaded-II/releases/latest/download/Release.zip`;
const RELOADED_URL_MANUAL = `https://github.com/Reloaded-Project/Reloaded-II/releases`;

const ELEVATOR_PATH = path.join(util.getVortexPath('application'), 'resources');
const ELEVATOR_EXEC = "elevate.exe";

const RELOADEDMOD_ID = `${GAME_ID}-reloadedmod`;
const RELOADEDMOD_NAME = "Reloaded Mod";
const RELOADEDMOD_PATH = path.join("Reloaded", "Mods");
const RELOADEDMOD_FILE = "modconfig.json";

const RELOADEDMODLOADER_ID = `${GAME_ID}-reloadedmodloader`;
const RELOADEDMODLOADER_NAME = "Mod Loader";
const RELOADEDMODLOADER_PATH = path.join(RELOADEDMOD_PATH, MOD_LOADER_FOLDER);
const RELOADEDMODLOADER_FILE = "XXX.dll";
const RELOADEDMODLOADER_PAGE_NO = 0;
const RELOADEDMODLOADER_FILE_NO = 0;
const RELOADEDMODLOADER_URL = `XXX`;
const RELOADEDMODLOADER_URL_ERR = `XXX`;

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save File";
const SAVE_FOLDER = path.join('gamedata', 'savedata');
let USERID_FOLDER = "";
/*try {
  const ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = ARRAY[0];
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
} //*/
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
//const SAVE_PATH = path.join(util.getVortexPath('localAppData'), PUBLISHER_FOLDER, DATA_FOLDER, USERID_FOLDER);
const SAVE_EXTS = ['.bin'];

const MOD_PATH_DEFAULT = '.';

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
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
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "supportsSymlinks": false,
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
      "id": RELOADEDMOD_ID,
      "name": RELOADEDMOD_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", RELOADEDMOD_PATH)
    },
    {
      "id": RELOADEDMODLOADER_ID,
      "name": RELOADEDMODLOADER_NAME,
      "priority": "low",
      "targetPath": path.join("{gamePath}", RELOADEDMODLOADER_PATH)
    },
    {
      "id": RELOADED_ID,
      "name": RELOADED_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", SAVE_PATH)
    }, //*/
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
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

//Replace folder path string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
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

async function requiresLauncher(gamePath, store) {
  if ((store === 'xbox') && DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  } //*/
  //*
  if ((store === 'epic') && DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID)) {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  /*
  if ((store === 'steam') && DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID)) {
    return Promise.resolve({
        launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable, add to required files, set paths for mod types
function setGameVersion(discoveryPath) {
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

  GAME_VERSION = 'steam';
  return GAME_VERSION;
}

const getDiscoveryPath = (api) => {
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

//Check if mod injector is installed
function isModManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === RELOADED_ID);
}

//Check if mod injector is installed
function isModLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === RELOADEDMODLOADER_ID);
}

//Function to auto-download Reloaded-II Mod Loader
async function downloadModManager(api, gameSpec) {
  let modLoaderInstalled = isModManagerInstalled(api, gameSpec);
  if (!modLoaderInstalled) {
    //notification indicating install process
    const MOD_NAME = 'Reloaded Mod Manager';
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing-${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const URL = RELOADED_URL_LATEST;
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
        actions.setModType(gameSpec.game.id, modId, RELOADED_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = RELOADED_URL_MANUAL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download Reloaded-II Mod Loader from GitHub (no check, for button)
async function downloadModManagerNoCheck(api, gameSpec) {
  //notification indicating install process
  const MOD_NAME = 'Reloaded Mod Manager';
  const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
  api.sendNotification({
    id: NOTIF_ID,
    message: `Installing-${MOD_NAME}`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });

  try {
    //Download the mod
    const dlInfo = {
      game: gameSpec.game.id,
      name: MOD_NAME,
    };
    const URL = RELOADED_URL_LATEST;
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
      actions.setModType(gameSpec.game.id, modId, RELOADED_ID), // Set the mod type
    ];
    util.batchDispatch(api.store, batched); // Will dispatch both actions.
  //Show the user the download page if the download, install process fails
  } catch (err) {
    const errPage = RELOADED_URL_MANUAL;
    api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
    util.opn(errPage).catch(() => null);
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
}

//Function to auto-download MRFC Mod Loader for Reloaded-II Mod Loader (from Nexus)
async function downloadModLoader(api, gameSpec) {
  let modLoaderInstalled = isModLoaderInstalled(api, gameSpec);
  if (!modLoaderInstalled) {
    //notification indicating install process
    const MOD_NAME = `Metaphor Essentials`;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }

    const modPageId = 5;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [nxmUrl], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, RELOADEDMODLOADER_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testModManger(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === RELOADED_EXEC);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installModManager(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === RELOADED_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: RELOADED_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(RELOADED_PATH, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for Mod Loaderfiles
function testReloadedLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === RELOADEDMOD_FILE));
  const isLoader = files.some(file => (path.basename(file).toLowerCase() === RELOADEDMODLOADER_FILE));
  let supported = (gameId === spec.game.id) && isMod && isLoader;

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

//Install Mod Loader files
function installReloadedLoader(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === RELOADEDMOD_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: RELOADEDMODLOADER_ID };

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

//Test for Reloaded Mod files
function testReloadedMod(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === RELOADEDMOD_FILE));
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

//Install Reloaded Mod files
function installReloadedMod(files, fileName) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === RELOADEDMOD_FILE);
  let idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: RELOADEDMOD_ID };

  let MOD_FOLDER = '.';
  const ROOT_PATH = path.basename(path.dirname(modFile));
  const MOD_NAME = path.basename(fileName);
  if (ROOT_PATH !== '.' && ROOT_PATH !== undefined) {
    idx = modFile.indexOf(`${path.basename(ROOT_PATH)}${path.sep}`);
  }
  if (ROOT_PATH === '.') {
    MOD_FOLDER = MOD_NAME.replace(/[\.]*(installing)*(zip)*/gi, '');
  }

  // Remove directories and anything that isn't in the rootPath.
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

//Installer test for Save (.bin) files
function testSave(files, gameId) {
  const isMod = files.some(file => SAVE_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install Save (.bin) files
function installSave(files) {
  const modFile = files.find(file => SAVE_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(RELOADED_PATH, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions for Reloaded-II
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup`;
  const MESSAGE = 'Reloaded Mod Manager Setup Required';
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
            text: 'The Reloaded-II Mod Manager tool downloaded by this extension requires setup.\n'
                + '\n'
                + `Please launch the tool and set the location of the ${GAME_NAME} executable.\n`
                + '\n'
                + 'You must also enable mods in Reloaded using the "Manage Mods" button on the left hand side of the Reloaded window.\n'
                + '\n'
                + 'You must launch the game from Reloaded for mods to load in the game.\n'
                + '\n'
                + '\n'
                + `IMPORTANT: You may need to run Reloaded-II as Administrator for setup and dependency updates.\n`
                + '\n'
                + 'If you get a message about missing mod dependencies or .NET Runtimes, you may need to run Reloaded as an Administrator to allow dependencies to download.\n'
                + '\n'
                + 'You can launch Reloaded as Admin using the button below.\n'
                + '\n'
          }, [
            {
              label: `Run Reloaded-II as Admin`, action: () => {
                runReloadedAdmin(api);
                dismiss();
              }
            },
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

//Run Reloaded-II as Admin (allow dependency download in priviledged folders)
function runReloadedAdmin(api) {
  const TOOL_ID = RELOADED_ID;
  const TOOL_NAME = RELOADED_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(path.join(util.getVortexPath('application'), 'resources', ELEVATOR_EXEC), [TOOL_PATH], { suggestDeploy: false, detached: true })
        .catch(err => api.showErrorNotification(`Failed to run ${TOOL_NAME} as Admin`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    }
    else {
      return api.showErrorNotification(`Failed to run ${TOOL_NAME} as Admin`, `Path to ${TOOL_NAME} executable could not be found. Ensure ${TOOL_NAME} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${TOOL_NAME} as Admin`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}

async function resolveGameVersion(gamePath) {
  GAME_VERSION = setGameVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') {
    try { //try to parse appmanifest.xml
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parser = new DOMParser();
      const XML = parser.parseFromString(appManifest, 'text/xml');
      try { //try to get version from appmanifest.xml
        const identity = XML.getElementsByTagName('Identity')[0];
        version = identity.getAttribute('Version');
        return Promise.resolve(version);
      } catch (err) { //could not get version
        log('error', `Could not get version from appmanifest.xml file for Xbox game version: ${err}`);
        return Promise.resolve(version);
      }
    } catch (err) { //mod.manifest could not be read. Try to overwrite with a clean one.
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  else { // use game exe for Steam
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

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  GAME_PATH = discovery.path;
  setupNotify(api);
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, RELOADEDMODLOADER_PATH));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, SAVE_PATH));
  await downloadModManager(api, gameSpec);
  //await downloadModLoader(api, gameSpec);
  return fs.ensureFileAsync(
    path.join(GAME_PATH, RELOADED_PATH, "portable.txt")
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
    getGameVersion: resolveGameVersion,
    supportedTools: [
      {
        id: RELOADED_ID,
        name: RELOADED_NAME,
        logo: "reloaded.png",
        executable: () => RELOADED_EXEC,
        requiredFiles: [RELOADED_EXEC],
        detach: true,
        relative: true,
        exclusive: true,
        defaultPrimary: true,
        //parameters: [],
      }, //*/
      /*{
        id: RELOADED_ID,
        name: RELOADED_NAME,
        logo: "reloaded.png",
        queryPath: () => ELEVATOR_PATH,
        executable: () => ELEVATOR_EXEC,
        requiredFiles: [ELEVATOR_EXEC],
        detach: true,
        relative: false,
        exclusive: true,
        defaultPrimary: true,
        parameters: [path.join(GAME_PATH, RELOADED_PATH, RELOADED_EXEC)],
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
  context.registerInstaller(RELOADED_ID, 25, testModManger, installModManager);
  context.registerInstaller(RELOADEDMODLOADER_ID, 27, testReloadedLoader, installReloadedLoader);
  context.registerInstaller(RELOADEDMOD_ID, 29, testReloadedMod, installReloadedMod);
  //context.registerInstaller(SAVE_ID, 49, testSave, installSave);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Reloaded Mod Manager', () => {
    downloadModManagerNoCheck(context.api, gameSpec).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    //const openPath = SAVE_PATH;
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, SAVE_PATH); //*/
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
      const lastActiveProfile = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== lastActiveProfile) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

//Notify User to run Mod Merger Utility after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = RELOADED_NAME;
  const MESSAGE = `Run ${MOD_NAME} as Admin`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Reloaded (Admin)',
        action: (dismiss) => {
          runReloadedAdmin(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `If your game is installed in a protected folder, such as "C:\Program Files (x86)" (default for Steam), you must run ${MOD_NAME} as Administrator.\n`
                + '\n'
                + `Use the button below to launch ${MOD_NAME} as Administrator.\n`
                + '\n'
                + `If your game is NOT installed in a priviledged folder, you can suppress this notification with the "Never Show Again" button below.\n`
                + '\n'
          }, [
            {
              label: 'Run Reloaded (Admin)', action: () => {
                runReloadedAdmin(api);
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

//export to Vortex
module.exports = {
  default: main,
};
