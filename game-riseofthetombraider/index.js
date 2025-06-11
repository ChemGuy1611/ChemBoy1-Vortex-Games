/*
Name: Rise of the Tomb Raider Vortex Extension
Structure: 3rd-Party Mod Installer
Author: ChemBoy1
Version: 0.4.1
Date: 03/10/2025
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const STEAMAPP_ID = "391220";
const EPICAPP_ID = "";
const GOGAPP_ID = "";
const XBOXAPP_ID = "39C668CD.RiseoftheTombRaider";
const XBOXEXECNAME = "App";
const GAME_ID = "riseofthetombraider";
const GAME_NAME = "Rise of the Tomb Raider";
const GAME_NAME_SHORT = "ROTTR";
const EXEC = "ROTTR.exe";
const EXEC_XBOX = "ROTTR_UAP.exe";

const MANAGER_ID = "riseofthetombraider-manager";
const MANAGER_EXEC = "rottrmodmanager.exe";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries / Root Folder";
const BINARIES_EXTS = ['.dll', '.exe', '.tiger'];

const MANAGERUNIFIED_ID = `${GAME_ID}-trmodmanager`;
const MANAGERUNIFIED_NAME = "TR Reboot Mod Manager";
const MANAGERUNIFIED_EXEC = "trreboottools.modmanager.exe";
const MANAGER_PAGE = 94;
const MANAGER_FILE = 1161;

const MANAGERMOD_ID = `${GAME_ID}-modmanagermod`;
const MANAGERMOD_NAME = "Mod Manager Mod";
const MANAGERMOD_PATH = path.join("Mods");
const MANAGERMOD_EXTS = ['tr2mesh', '.tr2pcd', '.drm', '.skl',  '.tr10dtp', '.tr10material', '.tr10modeldata', '.t10script', '.t10shaderlib', '.tr10sound', '.dds', '.tr10objectref', '.tr10dtp', '.tr10anim'];

//Filled in from information above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": "Mods",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "nexusPageId": GAME_ID
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": MANAGERMOD_ID,
      "name": MANAGERMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MANAGERMOD_PATH}`
    },
    {
      "id": MANAGERUNIFIED_ID,
      "name": MANAGERUNIFIED_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": MANAGER_ID,
      "name": "ROTTR Mod Manager",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
      //GOGAPP_ID,
      //XBOXAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: "ROTTRModManager",
    name: "ROTTR Mod Manager",
    logo: "modmanager.png",
    executable: () => MANAGER_EXEC,
    requiredFiles: [MANAGER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
  {
    id: MANAGERUNIFIED_ID,
    name: MANAGERUNIFIED_NAME,
    logo: 'modmanager.png',
    executable: () => MANAGERUNIFIED_EXEC,
    requiredFiles: [
      MANAGERUNIFIED_EXEC,
    ],
    relative: true,
    exclusive: true,
    detach: true,
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
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game information by API utility
async function queryGame() {
  let game = await util.GameStoreHelper.findByAppId(spec.discovery.ids);
  return game;
}

//Find game install location 
async function queryPath() {
  let game = await queryGame();
  return game.gamePath;
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'steam') {
    return Promise.resolve(
      undefined,
    );
  }
  /*
  else if (store === 'epic') {
    return Promise.resolve({
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    });
  }
  //*/
  /*
  else if (store === 'xbox') {
    return Promise.resolve({
      launcher: "xbox",
      addInfo: {
        appId: XBOXAPP_ID,
        // appExecName is the <Application id="" in the appxmanifest.xml file
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  }
  //*/
  else if (store === undefined) {
    return Promise.resolve(
      undefined,
    );
  }
  else {
    return Promise.resolve(undefined);
  }
}

// AUTOMATIC DOWNLOAD FUNCTIONS //////////////////////////////////////////////

//Check if mod injector is installed
function isModManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MANAGERUNIFIED_ID);
}

//Function to auto-download Mod Manager
async function downloadModManager(api, gameSpec) {
  let isInstalled = isModManagerInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = MANAGERUNIFIED_NAME;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const MOD_TYPE = MANAGERUNIFIED_ID;
    const modPageId = MANAGER_PAGE;
    const FILE_ID = MANAGER_FILE;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = gameSpec.game.id;
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
      //*get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, modPageId);
      const fileTime = () => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //*/
      //Download the mod
      const dlInfo = {
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${file.file_id}`;
      //const nxmUrl = `nxm://${GAME_DOMAIN}/mods/${modPageId}/files/${FILE_ID}`;
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download/install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testModManger(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === MANAGER_EXEC);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installModManager(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === MANAGER_EXEC);
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

//Installer test for TR Reboot Mod Manager files
function testModMangerUnified(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === MANAGERUNIFIED_EXEC);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install TR Reboot Mod Manager files
function installModManagerUnified(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === MANAGERUNIFIED_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MANAGERUNIFIED_ID };

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

//Test Fallback installer for binaries folder
function testBinaries(files, gameId) {
  const isMod = files.some(file => BINARIES_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isMod );

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

//Fallback installer for binaries folder
function installBinaries(files) {
  const modFile = files.find(file => BINARIES_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };

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

//Test Fallback installer for binaries folder
function testManagerMod(files, gameId) {
  const isMod = files.some(file => MANAGERMOD_EXTS.includes(path.extname(file).toLowerCase()));
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

//Fallback installer for binaries folder
function installManagerMod(files, fileName) {
  const modFile = files.find(file => MANAGERMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const ROOT_PATH = path.basename(path.dirname(modFile));
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = '.';
  if (ROOT_PATH === '.') {
    MOD_FOLDER = MOD_NAME.replace(/[\.]*(installing)*(zip)*/gi, '');
  }
  const setModTypeInstruction = { type: 'setmodtype', value: MANAGERMOD_ID };
  
  // Remove empty directories
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );

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

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  const NOTIF_ID = `setup-notification-riseofthetombraider`;
  const MESSAGE = `ROTTR Mod Manager Setup Required`;
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
            text: 'The ROTTR Mod Manager tool downloaded by this extension requires setup.\n'
                + 'Please launch the tool and enable your mod folders inside the folder: "[RootGameFolder]\\Mods".\n'
                + 'It is recommended that you use ROTTR Mod Manager to enable/disable mods after install.\n'
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

//Notify User to run ATK after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = MANAGERUNIFIED_NAME;
  const MESSAGE = `Run TR Reboot Mod Manager`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run MM',
        action: (dismiss) => {
          runModManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For some mods, you must use ${MOD_NAME} to deploy the mod to the game files after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run MM', action: () => {
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
  const TOOL_ID = MANAGERUNIFIED_ID;
  const TOOL_NAME = MANAGERUNIFIED_NAME;
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
  setupNotify(api);
  await downloadModManager(api, gameSpec);
  await (gameSpec.modTypes || []).forEach((type, idx, arr) => {
    fs.ensureDirWritableAsync(pathPattern(api, gameSpec.game, type.targetPath));
  });
  return fs.ensureDirWritableAsync(path.join(discovery.path, gameSpec.game.modPath));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath,
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
  context.registerInstaller(MANAGER_ID, 25, testModManger, installModManager);
  context.registerInstaller(MANAGERUNIFIED_ID, 30, testModMangerUnified, installModManagerUnified);
  context.registerInstaller(BINARIES_ID, 35, testBinaries, installBinaries);
  context.registerInstaller(MANAGERMOD_ID, 40, testManagerMod, installManagerMod);

}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
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
