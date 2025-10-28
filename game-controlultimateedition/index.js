/*/////////////////////////////////////////
Name: Control Ultimate Edition Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.3
Date: 2025-04-01
/////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');

//Specify all the information about the game
const STEAMAPP_ID = "870780";
const EPICAPP_ID = "Calluna";
const GOGAPP_ID = "2049187585";
const XBOXAPP_ID = "505GAMESS.P.A.ControlPCGP";
const XBOXEXECNAME = "Game";
const GAME_ID = "controlultimateedition";
const LEGACY_ID = "control";
const GAME_NAME = "Control Ultimate Edition"
const GAME_NAME_SHORT = "Control UE";
let GAME_VERSION = null;
let GAME_PATH = null;
const APPMANIFEST_FILE = 'appxmanifest.xml';

//executables for different stores
const EXEC_DEFAULT = `Control.exe`;
const EXEC_XBOX = "gamelaunchhelper.exe";

//Data for mod types, tools, load order, and installers
const MODFOLDER_ID = `${GAME_ID}-modfolder`;
const MODFOLDER_NAME = `Mod Folder`;
const MODFOLDER_PACK = `data_packfiles`;
const MODFOLDER_DATA = `data`;
const MODFOLDER_DATAPC = `data_pc`;
const MODFOLDER_PLUGINS = `plugins`;
const MODFOLDER_FOLDERS = [MODFOLDER_PACK, MODFOLDER_DATA, MODFOLDER_DATAPC, MODFOLDER_PLUGINS];

const MODPACK_ID = `${GAME_ID}-modpack`;
const MODPACK_NAME = `Mod Files (data_packfiles)`;
const MODPACK_PATH = path.join(MODFOLDER_PACK);
const MODPACK_EXTS = ['.bin', '.packmeta', '.rmdp'];

const PLUGINLOADER_ID = `${GAME_ID}-pluginloader`;
const PLUGINLOADER_NAME = `Plugin Loader`;
const PLUGINLOADER_FILE = `xinput1_4.dll`;
const PLUGINLOADER_PAGE_NO = 16;
const PLUGINLOADER_FILE_NO = 127;

const LOOSELOADER_ID = `${GAME_ID}-loosefileloader`;
const LOOSELOADER_NAME = `Loose File Loader`;
const LOOSELOADER_FILE = `iphlpapi.dll`;
const LOOSELOADER_PAGE_NO = 11;
const LOOSESLOADER_FILE_NO = 24;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = `Root Folder`;

/*
const USER_DOCS = util.getVortexPath('home');
const CONFIG_PATH = path.join(USER_DOCS);
const SAVE_PATH = path.join(USER_DOCS); 
const CFG_EXT = ".cfg";
//*/

const MOD_PATH_DEFAULT = path.join(".");
const REQ_FILE = MODFOLDER_PACK;

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiresCleanup": true,
    "requiredFiles": [
      REQ_FILE,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "compatibleDownloads": [LEGACY_ID],
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": MODFOLDER_ID,
      "name": MODFOLDER_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": MODPACK_ID,
      "name": MODPACK_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MODPACK_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": PLUGINLOADER_ID,
      "name": PLUGINLOADER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
    {
      "id": LOOSELOADER_ID,
      "name": LOOSELOADER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
      GOGAPP_ID,
      XBOXAPP_ID,
    ],
    "names": []
  }
};

// BASIC EXTENSION FUNCTIONS //////////////////////////////////////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  try {
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch (err) {
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
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
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  };
  return Promise.resolve(undefined);
}

function getExecutable(discoveredPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveredPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_DEFAULT)) {
    GAME_VERSION = 'default';
    return EXEC_DEFAULT;
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return EXEC_XBOX;
  };
  return EXEC_DEFAULT;
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

// AUTO-INSTALLER FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Check if UE4SS is installed
function isLooseLoaderInstalled(discovery, api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LOOSELOADER_ID);
}

//Check if Mod Enabler is installed
function isPluginLoaderInstalled(discovery, api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === PLUGINLOADER_ID);
}

//* Function to auto-download UE4SS form Nexus Mods
async function downloadLooseLoader(discovery, api, gameSpec) {
  let isInstalled = isLooseLoaderInstalled(discovery, api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = LOOSELOADER_NAME;
    const MOD_TYPE = LOOSELOADER_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = LOOSELOADER_PAGE_NO;
    const FILE_ID = LOOSESLOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = LEGACY_ID;
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
          //throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
          throw new Error(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        game: GAME_DOMAIN, // set to the game's ID so that they wil not get a game selection popup. Vortex will update the metadata automatically if the mod is from another domain, such as 'site'
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download UE4SS form Nexus Mods
async function downloadPluginLoader(discovery, api, gameSpec) {
  let isInstalled = isPluginLoaderInstalled(discovery, api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = PLUGINLOADER_NAME;
    const MOD_TYPE = PLUGINLOADER_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = PLUGINLOADER_PAGE_NO;
    const FILE_ID = PLUGINLOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = LEGACY_ID;
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
          //throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
          throw new Error(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        game: GAME_DOMAIN, // set to the game's ID so that they wil not get a game selection popup. Vortex will update the metadata automatically if the mod is from another domain, such as 'site'
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// MOD INSTALLER FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Installer test for Root folder files
function testModFolder(files, gameId) {
  const isFolder = files.some(file => MODFOLDER_FOLDERS.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isFolder );

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

//Installer install Root folder files
function installModFolder(files) {
  const modFile = files.find(file => MODFOLDER_FOLDERS.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODFOLDER_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    //((file.indexOf(rootPath) !== -1))
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

//Installer test for Root folder files
function testModPack(files, gameId) {
  const isMod = files.some(file => MODPACK_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isMod );

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

//Installer install Root folder files
function installModPack(files) {
  const modFile = files.find(file => MODPACK_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODPACK_ID };

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

//Installer test for UE4SS files
function testLooseLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LOOSELOADER_FILE));
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

//Install Mod Loader mods
function installLooseLoader(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LOOSELOADER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOOSELOADER_ID };

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

//Installer test for UE4SS files
function testPluginLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === PLUGINLOADER_FILE));
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

//Install Mod Loader mods
function installPluginLoader(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === PLUGINLOADER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PLUGINLOADER_ID };

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
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup`;
  const MESSAGE = `PLACEHOLDER`;
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
            text: 'TEXT.\n'
                + 'TEXT.\n'
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
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC_DEFAULT));
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
  //setupNotify(api);
  await downloadLooseLoader(discovery, api, gameSpec);
  await downloadPluginLoader(discovery, api, gameSpec);
  await fs.ensureDirWritableAsync(path.join(discovery.path, MODPACK_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH_DEFAULT));
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
    executable: getExecutable,
    getGameVersion: resolveGameVersion,
    supportedTools: [ //3rd party tools and launchers
      {
        id: `${GAME_ID}-customlaunch`,
        name: `Control Custom Launch`,
        logo: `exec.png`,
        executable: () => getExecutable(GAME_PATH),
        requiredFiles: [getExecutable(GAME_PATH)],
        detach: true,
        relative: true,
        exclusive: true,
        //shell: true,
        parameters: [],
      },
    ],
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

  //register mod installers
  context.registerInstaller(MODFOLDER_ID, 25, testModFolder, installModFolder);
  context.registerInstaller(MODPACK_ID, 30, testModPack, installModPack);
  context.registerInstaller(LOOSELOADER_ID, 35, testLooseLoader, installLooseLoader);
  context.registerInstaller(PLUGINLOADER_ID, 40, testPluginLoader, installPluginLoader);
  
  //register buttons to open folders and files
  
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
