/*////////////////////////////////////////////
Name: Marvel's Spider-Man 2 Vortex Extension
Structure: 3rd-Party Mod Manager (Overstrike)
Author: ChemBoy1
Version: 0.1.6
Date: 2025-04-05
////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all information about the game
const STEAMAPP_ID = "2651280";
const EPICAPP_ID = "";
const GAME_ID = "marvelsspiderman2";
const EXEC = "Spider-Man2.exe";
const GAME_NAME = "Marvel's Spider-Man 2";
const GAME_NAME_SHORT = "Spider-Man 2";

let GAME_PATH = "";

const OS_PAGE_NO = 1;
const OS_FILE_NO = 30;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";

const OVERSTRIKE_ID = `${GAME_ID}-overstrike`;
const OVERSTRIKE_NAME = "Overstrike";
const OVERSTRIKE_EXEC = "overstrike.exe";

const OSMOD_ID = `${GAME_ID}-osmod`;
const OSMOD_NAME = "Overstrike Mod";
const OSMOD_FOLDER = "Mods Library";
const OSMOD_PATH = path.join(OSMOD_FOLDER);
const OSMOD_EXTS = ['.smpcmod', '.suit', '.suit_style', '.stage', '.modular', '.script']; //add new exts as needed

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": `.`,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
      //"supportsSymlinks": false,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
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
      "id": OSMOD_ID,
      "name": OSMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${OSMOD_PATH}`
    },
    {
      "id": OVERSTRIKE_ID,
      "name": OVERSTRIKE_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
    ],
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: OVERSTRIKE_ID,
    name: OVERSTRIKE_NAME,
    logo: "overstrike.png",
    executable: () => OVERSTRIKE_EXEC,
    requiredFiles: [OVERSTRIKE_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
];

// BASIC EXTENSION FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

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
    localAppData: util.getVortexPath('localAppData'),
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
async function requiresLauncher(gamePath, store) {

  if (store === 'steam') {
      return Promise.resolve({
          launcher: 'steam',
      });
  }

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


// AUTO-DOWNLOAD FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Check if Overstrike is installed
function isOverstrikeInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === OVERSTRIKE_ID);
}

//Function to auto-download Overstrike from Nexus Mods <-- This function gave an error when getting the file upload time, for some reason ????
async function downloadOverstrike(api, gameSpec) {
  let isInstalled = isOverstrikeInstalled(api, gameSpec);
  
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = OVERSTRIKE_NAME;
    const NOTIF_ID = `${GAME_NAME}-${MOD_NAME}-installing`;
    const MOD_TYPE = OVERSTRIKE_ID;
    const modPageId = OS_PAGE_NO;
    //const FILE_ID = OS_FILE_NO;  //Using a specific file id because "input" below gives an error 
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
      ///*
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //*/
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${FILE_ID}`;
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
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}
//*/

// MOD INSTALLER FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Installer test for Overstrike
function testOverstrike(files, gameId) {
  const isOverstrike = files.some(file => (path.basename(file).toLowerCase() === OVERSTRIKE_EXEC));
  let supported = (gameId === spec.game.id) && isOverstrike;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Overstrike
function installOverstrike(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === OVERSTRIKE_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: OVERSTRIKE_ID };

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
function testOsMod(files, gameId) {
  const isMod = files.some(file => OSMOD_EXTS.includes(path.extname(file).toLowerCase()));
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
function installOsMod(files) {
  const modFile = files.find(file => OSMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: OSMOD_ID };

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

// MAIN FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////

//Notify User of Setup instructions
function updateNotify(api) {
  const NOTIF_ID = `${GAME_ID}-update-notification`;
  const MESSAGE = `Verify Game Files after Update`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      /*
      {
        title: 'Verify Game Files',
        action: (dismiss) => {
          verifyGameFiles(api);
          dismiss();
        },
      },
      //*/
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You must verify the game files after an update to avoid crashing with mods installed.\n`
                + `Use the button below to verify the game files.\n`
                + `\n`
                + `NOTE: This will only work with the Steam version of the game.\n`
                + `EGS version needs to delete 'toc' and 'toc.BAK' files manually, then verify game files in EGS app.\n`
                + `\n`
                + `You must reinstall mods in Overstrike after verifying game files.\n`
          }, [
            {
              label: 'Verify Game Files', action: () => {
                verifyGameFiles(api);
                dismiss();
              }
            },
            { label: 'Not Now', action: () => dismiss() },
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

//Notify User to run Overstrike after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = OVERSTRIKE_NAME;
  const MESSAGE = `Run Overstrike after Deploy`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Overstrike',
        action: (dismiss) => {
          runOverstrike(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Run Overstrike to Enable Mods', {
            text: `You must use ${MOD_NAME} to enable mods after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run Overstrike', action: () => {
                runOverstrike(api);
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

function runOverstrike(api) {
  const TOOL_ID = OVERSTRIKE_ID;
  const TOOL_NAME = OVERSTRIKE_NAME;
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

function verifyGameFiles(api) {
  const FILE1 = 'toc';
  const FILE2 = 'toc.BAK';
  const parameters = {
    FileList: `${FILE1}`,
    InstallDirectory: GAME_PATH,
    VerifyAll: false,
    AppId: STEAMAPP_ID,
  };

  try {
    fs.unlinkAsync(path.join(GAME_PATH, FILE1));
    fs.unlinkAsync(path.join(GAME_PATH, FILE2));
  } catch (err) {
    return api.showErrorNotification('Failed to delete toc and toc.BAK files', err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }

  try {
    return api.ext.steamkitVerifyFileIntegrity(parameters, GAME_ID);
  } catch (err) {
    return api.showErrorNotification('Failed to verify game files through Steam', err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  GAME_PATH = discovery.path;
  updateNotify(api);
  await downloadOverstrike(api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(discovery.path, OSMOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  context.requireExtension('Vortex Steam File Downloader');
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
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
  context.registerInstaller(OVERSTRIKE_ID, 25, testOverstrike, installOverstrike);
  context.registerInstaller(OSMOD_ID, 30, testOsMod, installOsMod);
  
  //register actions
  
}

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
