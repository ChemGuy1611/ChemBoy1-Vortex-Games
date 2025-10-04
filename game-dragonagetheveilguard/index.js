/*////////////////////////////////////////////////////
Name: Dragon Age: The Veilguard Vortex Extension
Structure: 3rd Party Mod Manager (Frosty)
Author: ChemBoy1
Version: 0.2.3
Date: 2025-06-17
////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');

//Specify all the information about the game
const EAAPP_ID = "";
const STEAMAPP_ID = "1845910";
const EPICAPP_ID = "";
const REGISTRY_NAME = "Dragon Age The Veilguard";
const GAME_ID = "dragonagetheveilguard";
const EXEC = "Dragon Age The Veilguard.exe";
const EXEC_EA = "Dragon Age The Veilguard EA.exe";
const EXEC_ALT = "morrison.main_win64_final.exe";
const GAME_NAME = "Dragon Age: The Veilguard";
const GAME_NAME_SHORT = "DA Veilguard";
let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const DOCUMENTS = util.getVortexPath("documents");

const FROSTY_VERSION = "Alpha5v4";
const FROSTY_URL = `https://github.com/wavebend/FrostyToolsuite/releases/download/${FROSTY_VERSION}/FrostyModManager_${FROSTY_VERSION}.zip`;
const FROSTY_URL_MANUAL = `https://github.com/wavebend/FrostyToolsuite/releases`;
const INSTR_URL = `https://docs.google.com/document/d/1F6X8fjh6RS_IHX7cqx36lyhCEpLPZSYknki-M28w_K0`;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";

const FROSTYMANAGER_ID = `${GAME_ID}-frostymanager`;
const FROSTYMANAGER_NAME = "Frosty Mod Manager";
const FROSTYMANAGER_PATH = path.join("FrostyModManager");
const FROSTY_EXEC = 'frostymodmanager.exe';
const FROSTY_TOOL_ID = 'FrostyModManager';

const FROSTYMOD_FOLDER = "Dragon Age The Veilguard";
const FROSTYMOD_ID = `${GAME_ID}-frostymod`;
const FROSTYMOD_NAME = "Frosty .fbmod/.archive";
const FROSTYMOD_EXTS = [".fbmod", ".archive"];
const FROSTYMOD_PATH = path.join(FROSTYMANAGER_PATH, "Mods", FROSTYMOD_FOLDER);

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config (LocalAppData)";
const CONFIG_PATH = path.join(DOCUMENTS, "BioWare", "Dragon Age The Veilguard", "settings");
const CONFIG_FILE = "profile.ini";

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Config (LocalAppData)";
const SAVE_FOLDER = path.join(DOCUMENTS, "BioWare", "Dragon Age The Veilguard", "save games");
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
}
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const SAVE_EXT = ".csav";

// Information for Frosty Mod Manager Alpha downloader and updater
//const FROSTY_ARC_NAME = 'FrostyModManager_Alpha5v4.zip';
const FROSTY_ARC_NAME = 'FrostyModManager_2025.6.12.0.zip';
const AUTHOR = 'J-Lyt'; // Author of the Frosty Mod Manager Alpha fork
//const AUTHOR = 'wavebend'; // Author of the Frosty Mod Manager Alpha fork
const REPO = 'FrostyToolsuite'; // Repository name on GitHub
const FROSTY_URL_MAIN = `https://api.github.com/repos/${AUTHOR}/${REPO}`;
const FROSTY_FILE = 'FrostyModManager.exe'; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.
const REQUIREMENTS = [
  { //Frosty Mod Manager Alpha
    archiveFileName: FROSTY_ARC_NAME,
    modType: FROSTYMANAGER_ID,
    assemblyFileName: FROSTY_FILE,
    userFacingName: FROSTYMANAGER_NAME,
    githubUrl: FROSTY_URL_MAIN,
    findMod: (api) => findModByFile(api, FROSTYMANAGER_ID, FROSTY_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, FROSTY_ARC_NAME),
    //fileArchivePattern: new RegExp(/^FrostyModManager_Alpha(\d+)v(\d+)/, 'i'),
    fileArchivePattern: new RegExp(/^FrostyModManager_(\d+)\.(\d+)\.(\d+)\.(\d+)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
  },
];

const MOD_PATH_DEFAULT = ".";

//Filled in from info above
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
      EXEC,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "EAAppId": EAAPP_ID,
      "epicAppId": EPICAPP_ID,
      "supportsSymlinks": false,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "EAAPPId": EAAPP_ID
    }
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": FROSTYMOD_ID,
      "name": FROSTYMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${FROSTYMOD_PATH}`
    },
    {
      "id": FROSTYMANAGER_ID,
      "name": FROSTYMANAGER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${FROSTYMANAGER_PATH}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
      //EAAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: 'FrostyModManagerLaunch',
    name: 'Launch Modded Game',
    logo: 'executable.png',
    executable: () => FROSTY_EXEC,
    requiredFiles: [
      FROSTY_EXEC,
    ],
    relative: true,
    detached: true,
    exclusive: true,
    defaultPrimary: true,
    parameters: [
      '-launch Default'
    ],
  }, //*/
  {
    id: FROSTY_TOOL_ID,
    name: FROSTYMANAGER_NAME,
    logo: 'frosty.png',
    executable: () => FROSTY_EXEC,
    requiredFiles: [
      FROSTY_EXEC,
    ],
    relative: true,
    detached: true,
    exclusive: true,
    parameters: [
      
    ],
  }
];

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

//Find the game installation folder
function makeFindGame(api, gameSpec) {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      `SOFTWARE\\WOW6432Node\\BioWare\\${REGISTRY_NAME}`,
        'Install Dir');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return () => Promise.resolve(instPath.value);
  } catch (err) {
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  }
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Setup launcher requirements (Steam, Epic, GOG, GamePass, etc.). More parameters required for Epic and GamePass
async function requiresLauncher(gamePath, store) {
  /*if (store === 'xbox') {
    return Promise.resolve({
        launcher: 'xbox',
        addInfo: {
            appId: XBOXAPP_ID,
            parameters: [{ appExecName: XBOXEXECNAME }],
        },
    });
  } //*/
  /*if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  return Promise.resolve(undefined);
}

const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

// AUTO-DOWNLOAD FUNCTIONS ///////////////////////////////////////////////////

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await testRequirementVersion(api, REQUIREMENTS[0]);
  } catch (err) {
    log('warn', 'failed to test version for Frosty Mod Manager', err);
  }
}

async function checkForFrosty(api) {
  const mod = await REQUIREMENTS[0].findMod(api);
  return mod !== undefined;
}

//Check if mod injector is installed
function isFrostyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === FROSTYMANAGER_ID);
}

//Function to auto-download Frosty Mod Manager
async function downloadFrosty(api, gameSpec) {
  let isInstalled = isFrostyInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = `Frosty Mod Manager ${FROSTY_VERSION}`;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
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
      const URL = FROSTY_URL;
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
        actions.setModType(gameSpec.game.id, modId, FROSTYMANAGER_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download and install process fails
    } catch (err) {
      const errPage = FROSTY_URL_MANUAL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for Frosty Manager files
function testFrosty(files, gameId) {
  const isFrosty = files.some(file => (path.basename(file).toLowerCase() === FROSTY_EXEC));
  let supported = (gameId === spec.game.id) && isFrosty;

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

//Install Frosty Manager files
function installFrosty(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === FROSTY_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FROSTYMANAGER_ID };

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

//Test for .fbmod files
function testFbmod(files, gameId) {
  const isMod = files.find(file => FROSTYMOD_EXTS.includes(path.extname(file).toLowerCase())) !== undefined;
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

//Install .fbmod files
function installFbmod(files) {
  const modFile = files.find(file => FROSTYMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FROSTYMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) && 
    (!file.endsWith(path.sep))
  ));
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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions for Mod Managers
function setupNotify(api, gameSpec) {
  const MOD_NAME = FROSTYMANAGER_NAME;
  const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-notification`;
  const MESSAGE = `${MOD_NAME} Alpha Instructions`;
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
            text: `${MOD_NAME} Alpha is required to install .fbmod files into the game's data files.\n`
                + `Use the button below to open important instructions in your browser on how to set up ${MOD_NAME} Alpha.\n`
              }, [
                  { label: `Open Instructions`, action: () => {
                    util.opn(INSTR_URL).catch(err => undefined);
                    dismiss();
                  }},
                  { label: 'Close', action: () => dismiss() },
                  { label: 'Never Show Again', action: () => {
                    api.suppressNotification(NOTIF_ID);
                    dismiss();
                  }},
                ]
            );
        },
      },
    ],
  });    
}

//Notify User to run ATK after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = FROSTYMANAGER_NAME;
  const MESSAGE = `Run ${MOD_NAME}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Frosty',
        action: (dismiss) => {
          runFrosty(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `After installing new mods, you must run ${MOD_NAME} to install them to the game's data files.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run Frosty', action: () => {
                runFrosty(api);
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

function runFrosty(api) {
  const TOOL_ID = FROSTY_TOOL_ID;
  const TOOL_NAME = FROSTYMANAGER_NAME;
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

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  setupNotify(api, gameSpec);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, FROSTYMOD_PATH));
  const FrostyInstalled = await checkForFrosty(api);
  return FrostyInstalled ? Promise.resolve() : download(api, REQUIREMENTS);
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

  //register mod types explicitlty (partion check)
  

  //register mod installers
  context.registerInstaller(FROSTYMANAGER_ID, 25, testFrosty, installFrosty);
  context.registerInstaller(FROSTYMOD_ID, 30, testFbmod, installFbmod);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = CONFIG_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    const openPath = SAVE_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Frosty Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, FROSTYMOD_PATH);
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
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });
    context.api.onAsync('check-mods-version', (profileId, gameId, mods, forced) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return onCheckModVersion(context.api, gameId, mods, forced)
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
