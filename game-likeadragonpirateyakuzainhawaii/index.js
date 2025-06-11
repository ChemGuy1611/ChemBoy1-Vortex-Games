/*
Name: Like a Dragon: Pirate Yakuza in Hawaii Vortex Extension
Structure: 3rd Party Mod Manager
Author: ChemBoy1
Version: 0.1.4
Date: 03/12/2025
*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all information about the game
const STEAMAPP_ID = "3061810";
const GAME_ID = "likeadragonpirateyakuzainhawaii";
const TOPLEVEL_FOLDER = path.join('runtime', 'media');
const EXEC = path.join(TOPLEVEL_FOLDER, 'startup.exe');
const EXEC2 = path.join(TOPLEVEL_FOLDER, 'likeadragonpirates.exe');
const GAME_NAME = "Like a Dragon: Pirate Yakuza in Hawaii";
const GAME_NAME_SHORT = "LaD: Pirate Yakuza iH";

const MOD_PATH = path.join(TOPLEVEL_FOLDER, `mods`);

//Information for mod types, tools, and installers
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";
const ROOT_PATH = path.join(TOPLEVEL_FOLDER);

const MODMANAGER_ID = `${GAME_ID}-modmanager`;
const LAUNCH_ID = `${MODMANAGER_ID}launch`;
const MODMANAGER_NAME = "Shin Ryu Mod Manager";
const MODMANAGER_EXEC = "shinryumodmanager.exe";
const MODMANAGER_PATH = path.join(TOPLEVEL_FOLDER);
const MODMANAGER_PAGE_NO = 743;
const MODMANAGER_FILE_NO = 4744;

const MODMANAGERMOD_ID = `${GAME_ID}-mod`;
const MODMANAGERMOD_NAME = "Mod";
const MODMANAGERMOD_PATH = path.join(TOPLEVEL_FOLDER, `mods`);
const MODMANAGERMOD_FILE = "modinfo.ini";

const DATAMOD_ID = `${GAME_ID}-data`;
const DATAMOD_NAME = ".par Data File";
const DATAMOD_PATH = path.join(TOPLEVEL_FOLDER, `data`);
const DATAMOD_EXT = [".par"];

const PARFILE_NAMES = ["ui.spr.common", "ui.spr.de"];

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiresLauncher": 'steam',
    "requiredFiles": [
      EXEC,
      EXEC2,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${ROOT_PATH}`
    },
    {
      "id": MODMANAGERMOD_ID,
      "name": MODMANAGERMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MODMANAGERMOD_PATH}`
    },
    {
      "id": DATAMOD_ID,
      "name": DATAMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${DATAMOD_PATH}`
    },
    {
      "id": MODMANAGER_ID,
      "name": MODMANAGER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${MODMANAGER_PATH}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
    ],
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: LAUNCH_ID,
    name: 'Launch Modded Game',
    logo: 'exec.png',
    executable: () => MODMANAGER_EXEC,
    requiredFiles: [
        MODMANAGER_EXEC,
    ],
    parameters: [
        '--run',
        '--silent',
    ],
    detach: true,
    relative: true,
    exclusive: true,
    defaultPrimary: true,
},
  {
    id: MODMANAGER_ID,
    name: MODMANAGER_NAME,
    logo: "modmanager.png",
    executable: () => MODMANAGER_EXEC,
    requiredFiles: [MODMANAGER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Find game installation directory
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

// AUTOMATIC INSTALLER FUNCTIONS /////////////////////////////////////////////////////////

//Check if ModManager Mod Manager is installed
function isModManagerInstalled(api, spec) {
  const MOD_TYPE = MODMANAGER_ID;
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MOD_TYPE);
}

/*
//Function to auto-download SRMM from Github
async function downloadModManager(api, gameSpec) {
  let isInstalled = isModManagerInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = MODMANAGER_NAME;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const MOD_TYPE = MODMANAGER_ID;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      //Insert code to get github version here


      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const URL = `https://github.com/praydog/REFramework/releases/latest/download/RE4.zip`;
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://github.com/SRMM-Studio/ShinRyuModManager/releases`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}
//*/

//*
//Function to auto-download SRMM
async function downloadModManager(api, gameSpec) {
  let isInstalled = isModManagerInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = MODMANAGER_NAME;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const MOD_TYPE = MODMANAGER_ID;
    const modPageId = MODMANAGER_PAGE_NO;
    const FILE_ID = MODMANAGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = 'site';
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
    try {
      //get the mod files information from Nexus
      //*
      const modFiles = await api.ext.nexusGetModFiles('site', modPageId);
      const fileTime = () => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //*/
      //*
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://site/mods/${modPageId}/files/${FILE_ID}`;
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}
//*/

// MOD INSTALLER FUNCTIONS //////////////////////////////////////////////////////////////

//Installer test for ModManager Mod Manager files
function testModManager(files, gameId) {
  const isModManager = files.some(file => (path.basename(file).toLowerCase() === MODMANAGER_EXEC));
  let supported = (gameId === spec.game.id) && isModManager

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install ModManager Mod Manger files
function installModManager(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MODMANAGER_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODMANAGER_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
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
function testModManagerMod(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === MODMANAGERMOD_FILE));
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
function installModManagerMod(files, fileName) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MODMANAGERMOD_FILE));
  const setModTypeInstruction = { type: 'setmodtype', value: MODMANAGERMOD_ID };
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
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

//Test for save files
function testData(files, gameId) {
  const isMod = files.some(file => DATAMOD_EXT.includes(path.extname(file).toLowerCase()));
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

//Install save files
function installData(files) {
  const modFile = files.find(file => DATAMOD_EXT.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATAMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
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

// MAIN FUNCTIONS ////////////////////////////////////////////////////////////////////////

//Notify User of Setup instructions
function setupNotify(api) {
  const MOD_NAME = `ModManager Mod Manager`;
  api.sendNotification({
    id: `${GAME_ID}-setup-notification`,
    type: 'warning',
    message: 'Mod Installation and Setup Instructions',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: `You must use ${MOD_NAME} to enable mods after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (at top of window or in "Dashboard" tab).\n`
                + `If your mod is not for ${MOD_NAME}, you must extract the zip file in the staging folder and change the mod type to "Binaries / Root Folder".\n`
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

//Notify User to run ModManager Mod Manager after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = 'SRMM';
  const MESSAGE = `Run ${MOD_NAME} after Deploy`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run SRMM',
        action: (dismiss) => {
          runModManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', `Run ${MOD_NAME} to Enable Mods`, {
            text: `You must use ${MOD_NAME} to enable mods after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
                + `If your mod is not for ${MOD_NAME}, you may need to change the mod type to "Binaries / Root Folder" manually.\n`
          }, [
            {
              label: 'Run ModManager', action: () => {
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
  const TOOL_ID = MODMANAGER_ID;
  const TOOL_NAME = MODMANAGER_NAME;
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

/*
async function onCheckModVersion(api, gameId, mods, forced) {
  const profile = selectors.activeProfile(api.getState());
  if (profile.gameId !== gameId) {
      return;
  }
  try {
      await testRequirementVersion(api, REQUIREMENTS[0]);
  } catch (err) {
      log('warn', 'Failed to test SRMM version', err);
  }
}
//*/

//Setup function
async function setup(discovery, api, gameSpec) {
  //setupNotify(api);
  await downloadModManager(api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(discovery.path, MODMANAGERMOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
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

  //register mod installers
  context.registerInstaller(MODMANAGER_ID, 25, testModManager, installModManager);
  //context.registerInstaller(MODMANAGERMOD_ID, 35, testModManagerMod, installModManagerMod);
  context.registerInstaller(DATAMOD_ID, 30, testData, installData);
  //context.registerInstaller(ROOT_ID, 40, testRoot, installRoot);
}

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });

    //context.api.onAsync('check-mods-version', (gameId, mods, forced) => onCheckModVersion(context.api, gameId, mods, forced));
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
