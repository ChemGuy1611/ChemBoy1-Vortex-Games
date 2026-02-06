/*//////////////////////////////////////////////////
Name: Red Faction Guerrilla Re-Mars-tered Vortex Extension
Structure: 3rd-Party Mod Installer
Author: ChemBoy1
Version: 0.2.0
Date: 2025-10-04
//////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const GAME_ID = "redfactionguerrillaremarstered";
const STEAMAPP_ID = "667720";
const STEAMAPP_ID_LEGACY = "20500";
const GOGAPP_ID = "2029222893";
const GAME_NAME = "Red Faction Guerrilla Re-Mars-tered"
const GAME_NAME_SHORT = "RFG";
const EXEC = "rfg.exe";
const EXEC_LEGACY = "rfg_launcher.exe";

let GAME_PATH = ''; //game installation path
let GAME_VERSION = ''; //game version (remaster or legacy)
let STAGING_FOLDER = ''; //Vortex staging folder path
let DOWNLOAD_FOLDER = ''; //Vortex download folder path

//Data for mod types, tools, and installers
const MOD_PATH = path.join("mods");
const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = `Mod`;
const MOD_FILES = ["modinfo.xml"];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = `Root Game Folder`;

const MANAGER_ID = `${GAME_ID}-manager`;
const MANAGER_NAME = `Mod Manager`;
const MANAGER_EXEC = "mod manager re-mars-tered.exe";
const MANAGER_PAGE_NO = 10;
const MANAGER_FILE_NO = 2538;

const MANAGER_EXEC_LEGACY = "modmanager.exe";
const MANAGER_URL_LEGACY = "https://www.factionfiles.com/ffdownload.php?id=3863";
const MANAGER_URL_LEGACY_ERR = "https://www.factionfiles.com/ff.php?action=file&id=3863";

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "compatibleDownloads": ['redfactionguerilla'],
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MOD_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": MANAGER_ID,
      "name": MANAGER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      GOGAPP_ID,
      STEAMAPP_ID_LEGACY,
    ],
    "names": []
  }
};

const MANAGER_ID_TOOL = `${GAME_ID}-ModManager`;
const MANAGER_ID_TOOL_LEGACY = `${GAME_ID}-ModManagerlegacy`;

//3rd party tools and launchers
const tools = [
  {
    id: MANAGER_ID_TOOL,
    name: MANAGER_NAME,
    logo: "manager.png",
    executable: () => MANAGER_EXEC,
    requiredFiles: [MANAGER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
  },
  {
    id: MANAGER_ID_TOOL_LEGACY,
    name: MANAGER_NAME,
    logo: "manager.png",
    executable: () => MANAGER_EXEC_LEGACY,
    requiredFiles: [MANAGER_EXEC_LEGACY],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
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

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  /*
  if (store === 'steam') {
      return Promise.resolve({
          launcher: 'steam',
      });
  } //*/
  /*
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  }
  //*/
  return Promise.resolve(undefined);
}

//Get correct game version
function setGameVersion(api) {
  GAME_PATH = getDiscoveryPath(api);
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(GAME_PATH, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };

  if (isCorrectExec(EXEC_LEGACY)) {
    GAME_VERSION = 'legacy';
    return GAME_VERSION;
  };

  GAME_VERSION = 'remaster';
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

// AUTOMATIC DOWNLOAD FUNCTIONS //////////////////////////////////////////////

//Check if mod injector is installed
function isModManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MANAGER_ID);
}

//* Function to auto-download Mod Manager for remastered version from Nexus Mods
async function downloadModManager(api, gameSpec) {
  let isInstalled = isModManagerInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MANAGER_NAME;
    const MOD_TYPE = MANAGER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    let FILE_ID =  MANAGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const PAGE_ID = MANAGER_PAGE_NO;
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

//* Function to auto-download Mod Manager for Legacy version from site
async function downloadModManagerLegacy(api, gameSpec) {
  let isInstalled = isModManagerInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MANAGER_NAME;
    const MOD_TYPE = MANAGER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = MANAGER_URL_LEGACY;
    const ERR_URL = MANAGER_URL_LEGACY_ERR;
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

//Installer test for Mod Importer
function testModManger(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === MANAGER_EXEC);
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

//Installer install Mod Importer
function installModManager(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === MANAGER_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MANAGER_ID };

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

//Installer test for Mod Importer
function testModMangerLegacy(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === MANAGER_EXEC_LEGACY);
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

//Installer install Mod Importer
function installModManagerLegacy(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === MANAGER_EXEC_LEGACY);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MANAGER_ID };

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

//Installer test for mod files
function testMod(files, gameId) {
  const isMod = files.some(file => MOD_FILES.includes(path.basename(file).toLowerCase()));
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

//Installer install mod files
function installMod(files,fileName) {
  const modFile = files.find(file => MOD_FILES.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_ID };
  const MOD_NAME = path.basename(fileName);
  const MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');

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

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  const NOTIF_ID = `setup-notification-${GAME_ID}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: 'Mod Manager Required',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Mod Manager Must Be Run', {
            text: 'The Mod Manager tool downloaded by this extension must be run every time new mods are installed.\n'
                + 'Please launch the tool from the Dashboard tab every time you install new mods.\n'
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
  //SYNCHRONOUS CODE ////////////////////////////////////
  setupNotify(api);
  const state = api.getState();
  GAME_PATH = discovery.path;
  GAME_VERSION = setGameVersion(api);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  //ASYNC CODE ////////////////////////////////////
  if (GAME_VERSION === 'legacy') {
    await downloadModManagerLegacy(api, gameSpec);
  }
  if (GAME_VERSION === 'remaster') {
    await downloadModManager(api, gameSpec);
  }
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH));
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
  context.registerInstaller(MANAGER_ID, 25, testModManger, installModManager);
  context.registerInstaller(`${MANAGER_ID}legacy`, 30, testModMangerLegacy, installModManagerLegacy);
  context.registerInstaller(MOD_ID, 35, testMod, installMod);

  //register actions
  /*
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = XML_PATH;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    SAVE_PATH = getSavePath();
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
      const lastActiveProfile = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== lastActiveProfile) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

//Notify User to run Mod Merger Utility after deployment
function deployNotify(api) {
  GAME_VERSION = setGameVersion(api);
  let TOOL_ID = MANAGER_ID_TOOL;
  if (GAME_VERSION === 'legacy') {
    TOOL_ID = MANAGER_ID_TOOL_LEGACY;
  }
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = MANAGER_NAME;
  const MESSAGE = `Use ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Manager',
        action: (dismiss) => {
          runModManager(api, TOOL_ID);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For most mods, you must use ${MOD_NAME} to install mod files into the game data.\n`
                + `Use the included tool to launch ${MOD_NAME} (button below, in "Dashboard" tab, or in notification shown after deployment).\n`
          }, [
            {
              label: 'Run Mod Manager', action: () => {
                runModManager(api, TOOL_ID);
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

function runModManager(api, toolId) {
  const TOOL_ID = toolId;
  const TOOL_NAME = MANAGER_NAME;
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
