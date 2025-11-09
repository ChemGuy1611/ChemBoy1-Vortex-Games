/*
Name: Dishonored 2 Vortex Extension
Author: ChemBoy1
Version: 0.5.3
Date: 03/12/2025
*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const turbowalk = require('turbowalk');
//const winapi = require('winapi-bindings');
const { parseStringPromise } = require('xml2js');

//Specify all the information about the game
const STEAMAPP_ID = "403640";
const EPICAPP_ID = ""; // not on egdata.app yet
const GOGAPP_ID = "1431426311";
const XBOXAPP_ID = "BethesdaSoftworks.Dishonored2-PC";
const XBOXEXECNAME = "App";
const GAME_ID = "dishonored2";
const GAME_NAME = "Dishonored 2";
const GAME_NAME_SHORT = "Dishonored 2";
const MOD_PATH = ".";

let GAME_PATH = null; //patched in the setup function to the discovered game path
let GAME_VERSION = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  gog: [{ id: GOGAPP_ID }],
  //epic: [{ id: EPICAPP_ID }],
  xbox: [{ id: XBOXAPP_ID }],
};
const requiredFiles = ['base'];

//Information for setting the executable and variable paths based on the game store version
const EXEC = "Dishonored2.exe";
const EPIC_EXEC = "Dishonored2.exe";
const XBOX_EXEC = "gamelaunchhelper.exe";
const XBOX_EXEC_SHIPPING = "Dishonored2_x64ShippingRetail.exe";

//Information for mod types and installers
const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save Game";
const SAVE_EXT = ".dat";
const SAVE_PATH = path.join(util.getVortexPath('documents'), "Saved Games", "Arkane Studios", "Dishonored2", "base", "savegame");

const VOID_ID = `${GAME_ID}-voidinstaller`;
const VOID_NAME = "Void Installer";
const VOID_EXEC = "voidinstaller.exe";
const VOID_FOLDER = "Void Installer";
const VOID_PATH = path.join('.');

const VOIDEXPLORER_ID = `${GAME_ID}-voidexplorer`;
const VOIDEXPLORER_NAME = "Void Explorer";
const VOIDEXPLORER_EXEC = "voidexplorer.exe";
const VOIDEXPLORER_FOLDER = "Void Explorer";
const VOIDEXPLORER_PATH = path.join('.');

const VOIDMOD_ID = `${GAME_ID}-voidmod`;
const VOIDMOD_NAME = "Void Mod";
const VOIDMOD_FILE = "modinfo.xml";
const VOIDMOD_EXTS = ['.voidindex', '.voidresources'];
const VOIDMOD_PATH = path.join(VOID_FOLDER, 'Mods');

//Filled in from the data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "details": {
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
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
      "id": VOIDMOD_ID,
      "name": VOIDMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${VOIDMOD_PATH}`
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": SAVE_PATH
    },
    {
      "id": VOID_ID,
      "name": VOID_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${VOID_PATH}`
    },
    {
      "id": VOIDEXPLORER_ID,
      "name": VOIDEXPLORER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${VOIDEXPLORER_PATH}`
    },
  ],
};

//3rd party tools and launchers
const tools = [
  {
    id: VOID_ID,
    name: VOID_NAME,
    logo: "void.png",
    executable: () => VOID_EXEC,
    requiredFiles: [VOID_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
  {
    id: VOIDEXPLORER_ID,
    name: VOIDEXPLORER_NAME,
    logo: "void.png",
    executable: () => VOIDEXPLORER_EXEC,
    requiredFiles: [VOIDEXPLORER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
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

async function requiresLauncher(gamePath, store) {
  if (store === 'xbox') {
      return Promise.resolve({
          launcher: 'xbox',
          addInfo: {
              appId: XBOXAPP_ID,
              parameters: [{ appExecName: XBOXEXECNAME }],
          },
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
  } //*/
  return Promise.resolve(undefined);
}

//Get the executable and add to required files
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
  if (isCorrectExec(XBOX_EXEC)) {
    return XBOX_EXEC;
  };
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(gamePath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  };
  GAME_VERSION = 'default';
  return GAME_VERSION;
}

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if Void is installed
function isVoidInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === VOID_ID);
}

//Function to auto-download Void
async function downloadVoid(api, gameSpec) {
  let isInstalled = isVoidInstalled(api, gameSpec);
  /*
  const state = api.getState();
  const modLoaderFile = VOID_EXEC;
  const installPath = selectors.installPathForGame(state, gameSpec.game.id); // This retrieves the staging folder for the game.
  let isInstalled = false;
  await turbowalk.default(installPath, async (entries) => { // Walk through the folders of the staging folder in an attempt to look for an identifiable file entry.
    if (isInstalled === true) {
      return Promise.resolve();
    }
    for (const entry of entries) {
      if (path.basename(entry.filePath).toLowerCase() === modLoaderFile) {
        isInstalled = true;
        return Promise.resolve();
      }
    }
  });
  //*/
  if (!isInstalled) {
    const MOD_TYPE = VOID_ID;
    const MOD_NAME = VOID_NAME;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const modPageId = 31;
    const FILE_ID = 224;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = GAME_ID;
    api.sendNotification({ //notification indicating install process
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Void Installer
function testVoid(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === VOID_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Overstrike
function installVoid(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === VOID_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: VOID_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(VOID_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for Void Installer
function testVoidExplorer(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === VOIDEXPLORER_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Overstrike
function installVoidExplorer(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === VOIDEXPLORER_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: VOIDEXPLORER_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(VOIDEXPLORER_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test Fallback installer for Void Mods
function testVoidMod(files, gameId) {
  const isMod = files.some(file => VOIDMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const isXml = files.some(file => (path.basename(file).toLowerCase() === VOIDMOD_FILE));
  //let supported = (gameId === spec.game.id) && ( isMod || isXml );
  let supported = (gameId === spec.game.id) && isMod && isXml;

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

//Fallback installer for Void Mods
function installVoidMod(files, fileName) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === VOIDMOD_FILE));
  const ROOT_PATH = path.basename(path.dirname(modFile));
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = '.';
  if (ROOT_PATH === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  }
  const setModTypeInstruction = { type: 'setmodtype', value: VOIDMOD_ID };
  
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

//test whether to use mod installer
function testSave(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SAVE_EXT));
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

//mod installer instructions
function installSave(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === SAVE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join("SLOT41", file.substr(idx)),
    };
  });

  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions for Void Installer
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup`;
  const MOD_NAME = VOID_NAME;
  const MESSAGE = `${MOD_NAME} Setup Required`;
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
            text: `The ${MOD_NAME} tool downloaded by this extension requires setup.\n`
                + `Please launch the tool and set the Game Folder.\n`
                + `Mods to install with ${MOD_NAME} will be found at this folder: "[RootGameFolder]\\${VOID_FOLDER}\\Mods".\n`
                + `If you don't see your mod's folder there, check in the root game folder.\n`   
                + `You must use ${MOD_NAME} to install and uninstall those mods after installing with Vortex.\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
            {
              label: 'Run Void', action: () => {
                runModManager(api);
                dismiss();
              }
            },
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

//Notify User to run Void after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = VOID_NAME;
  const MESSAGE = `Run ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Void',
        action: (dismiss) => {
          runModManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For most mods, you must use ${MOD_NAME} to install the mod to the game files after installing with Vortex.\n`
                + `Mods to install with ${MOD_NAME} will be found at this folder: "[RootGameFolder]\\${VOID_FOLDER}\\Mods".\n`
                + `If you don't see your mod's folder there, check in the root game folder.\n`   
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run Void', action: () => {
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
  const TOOL_ID = VOID_ID;
  const TOOL_NAME = VOID_NAME;
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

//*
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') { // use appxmanifest.xml for Xbox version
    try {
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parsed = await parseStringPromise(appManifest);
      version = parsed?.Package?.Identity?.[0]?.$?.Version;
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  else { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

//Setup function
async function setup(discovery, api, gameSpec) {
  GAME_PATH = discovery.path;
  setupNotify(api);
  await downloadVoid(api, gameSpec);
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
    requiresCleanup: true,
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: () => gameSpec.game.modPath,
    requiredFiles,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
    getGameVersion: resolveGameVersion,
    requiresLauncher: requiresLauncher,
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
  context.registerInstaller(VOID_ID, 25, testVoid, installVoid);
  context.registerInstaller(VOIDEXPLORER_ID, 30, testVoidExplorer, installVoidExplorer);
  context.registerInstaller(VOIDMOD_ID, 35, testVoidMod, installVoidMod);
  context.registerInstaller(SAVE_ID, 40, testSave, installSave);
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
