/*////////////////////////////////////////////////
Name: The Outer Worlds Vortex Extension
Structure: UE4
Author: ChemBoy1
Version: 0.5.0
Date: 2026-02-02
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');

//Specify all information about the game
const GAME_ID = "theouterworlds";
const GAME_ID_NEW = "theouterworldsspacerschoiceedition";
const EPICAPP_ID = "Rosemallow";
const EPICAPP_ID_NEW = "cb3bf7ba89574a66ae3b795e039d4dbc";
const STEAMAPP_ID = "578650";
const STEAMAPP_ID_NEW = "1920490";
const GOGAPP_ID = "1242541569";
const GOGAPP_ID_NEW = "1986509485";
const XBOXAPP_ID = "PrivateDivision.TheOuterWorldsWindows10";
const XBOXAPP_ID_NEW = "PrivateDivision.64850D0BF098F";
const XBOXEXECNAME = "App";
const XBOXEXECNAME_NEW = "App";

const EPIC_CODE_NAME = "Indiana";
const EXEC_FOLDER = "Win64";
const EXEC_FOLDER_XBOX = "WinGDK";
const EXEC_CLASSIC = `TheOuterWorlds.exe`;
const EXEC_NEW = "TheOuterWorldsSpacersChoiceEdition.exe";
const EXEC_XBOX = `gamelaunchhelper.exe`;

const GAME_NAME = "The Outer Worlds";
const GAME_NAME_SHORT = "The Outer Worlds";
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/The_Outer_Worlds";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/964"; //Nexus link to this extension. Used for links

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }, { id: STEAMAPP_ID_NEW }],
  gog: [{ id: GOGAPP_ID }, { id: GOGAPP_ID_NEW }],
  epic: [{ id: EPICAPP_ID }, { id: EPICAPP_ID_NEW }],
  xbox: [{ id: XBOXAPP_ID }, { id: XBOXAPP_ID_NEW }],
};

//Information for setting the executable and variable paths based on the game store version
let GAME_PATH = '';
let GAME_VERSION = '';
let XBOX_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let BINARIES_TARGET = '';
let EPIC_LAUNCH_ID = EPICAPP_ID;
let XBOX_LAUNCH_ID = XBOXAPP_ID;
let XBOX_LAUNCH_NAME = XBOXEXECNAME;
let requiredFiles = [EPIC_CODE_NAME];
const APPMANIFEST_FILE = 'appxmanifest.xml';

const LOCALAPPDATA = util.getVortexPath('localAppData');
const CONFIG_PATH_DEFAULT = path.join(LOCALAPPDATA, EPIC_CODE_NAME, "Saved", "Config", "WindowsNoEditor");
const CONFIG_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_hv3d7yfbgr2rp`, "LocalCache", "Local", EPIC_CODE_NAME, "Saved", "Config", "WindowsNoEditor"); //Classic XBOX Version
const CONFIG_PATH_XBOX_NEW = path.join(LOCALAPPDATA, EPIC_CODE_NAME, "Saved", "Config", "WinGDK"); //Spacer's Choice XBOX Version
let CONFIG_PATH = CONFIG_PATH_DEFAULT;

/*
  Unreal Engine Game Data
  - modsPath: this is where the mod files need to be installed, relative to the game install folder.
  - fileExt(optional): if for some reason the game uses something other than PAK files, add the extensions here.
  - loadOrder: do we want to show the load order tab?
*/
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'),
  fileExt: '.pak',
  loadOrder: true,
}

//This information will be filled in from the data above
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = `Config (LocalAppData)`;
const CONFIG_FILE1 = "engine.ini";
const CONFIG_FILE2 = "input.ini";
const CONFIG_FILES = [CONFIG_FILE1, CONFIG_FILE2];
const CONFIG_EXT = ".ini";

const PAK_ID = `${GAME_ID}-pak`;
const PAK_PATH = UNREALDATA.modsPath;

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = `Binaries (Engine Injector)`;
const BINARIES_PATH = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER);
const BINARIES_PATH_XBOX = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_XBOX);
let MOD_PATH = BINARIES_PATH;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_FOLDER = EPIC_CODE_NAME;

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "details": {
      "unrealEngine": UNREALDATA,
      "epicAppId": EPICAPP_ID,
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "customOpenModsPath": UNREALDATA.absModsPath || UNREALDATA.modsPath
    },
    "compatible": {
      "unrealEngine": true
    },
    "environment": {
      "EpicAppId": EPICAPP_ID,
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": PAK_ID,
      "name": "Paks",
      "priority": "low",
      "targetPath": path.join("{gamePath}", PAK_PATH)
    },
    {
      "id": ROOT_ID,
      "name": "Root Game Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    }
  ],
};

//3rd party tools and launchers
const tools = [
  {
    id: `${GAME_ID}-customlaunch`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC_CLASSIC,
    requiredFiles: [EXEC_CLASSIC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: [],
  }, //*/
  {
    id: `${GAME_ID}-customlaunchspacers`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC_NEW,
    requiredFiles: [EXEC_NEW],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: [],
  },
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}
function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch (err) {
    return false;
  }
}
async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch (err) {
    return false;
  }
}

//Set mod type priority
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Convert path placeholders to actual values
function pathPattern(api, game, pattern) {
  try{
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch(err){
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Get the executable
function getExecutable(discoveryPath) {
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    MOD_PATH = BINARIES_PATH_XBOX;
    BINARIES_TARGET = path.join('{gamePath}', MOD_PATH);
    if (statCheckSync(discoveryPath, EXEC_CLASSIC)) { //Classic
      CONFIG_PATH = CONFIG_PATH_XBOX;
      EPIC_LAUNCH_ID = EPICAPP_ID;
      XBOX_LAUNCH_ID = XBOXAPP_ID;
      XBOX_LAUNCH_NAME = XBOXEXECNAME;
    }
    else  { //Spacer's Choice
      CONFIG_PATH = CONFIG_PATH_XBOX_NEW;
      EPIC_LAUNCH_ID = EPICAPP_ID_NEW;
      XBOX_LAUNCH_ID = XBOXAPP_ID_NEW;
      XBOX_LAUNCH_NAME = XBOXEXECNAME_NEW;
    }
    return EXEC_XBOX;
  };
  if (statCheckSync(discoveryPath, EXEC_NEW)) { //Spacer's Choice
    MOD_PATH = BINARIES_PATH;
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    BINARIES_TARGET = path.join('{gamePath}', MOD_PATH);
    EPIC_LAUNCH_ID = EPICAPP_ID_NEW;
    XBOX_LAUNCH_ID = XBOXAPP_ID_NEW;
    XBOX_LAUNCH_NAME = XBOXEXECNAME_NEW;
    return EXEC_NEW;
  };
  //Classic
  BINARIES_TARGET = path.join('{gamePath}', MOD_PATH);
  return EXEC_CLASSIC;
}

async function requiresLauncher(gamePath, store) {
  if (store === 'xbox') {
      return Promise.resolve({
          launcher: 'xbox',
          addInfo: {
              appId: XBOX_LAUNCH_ID,
              parameters: [{ appExecName: XBOX_LAUNCH_NAME }],
          },
      });
  }
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPIC_LAUNCH_ID,
        },
    });
  }
  return Promise.resolve(undefined);
}

//Get correct game version
async function setGameVersionPath(gamePath) {
  if (statCheckAsync(gamePath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    MOD_PATH = BINARIES_PATH_XBOX;
    if (statCheckAsync(gamePath, EXEC_CLASSIC)) { //Classic
      XBOX_VERSION = 'classic';
      CONFIG_PATH = CONFIG_PATH_XBOX;
      return GAME_VERSION;
    } else { //Spacer's Choice
      XBOX_VERSION = 'spacers';
      CONFIG_PATH = CONFIG_PATH_XBOX_NEW;
      return GAME_VERSION;
    }
  };
  if (statCheckAsync(gamePath, EXEC_CLASSIC)) {
    GAME_VERSION = 'classic';
    return GAME_VERSION;
  };
  if (statCheckAsync(gamePath, EXEC_NEW)) {
    GAME_VERSION = 'spacers';
    return GAME_VERSION;
  };
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for config files
function testConfig(files, gameId) {
  // Make sure we're able to support this mod
  const isConfig = files.some(file => path.basename(file).toLowerCase() === (CONFIG_FILE1 || CONFIG_FILE2));
  const isIni = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT) !== undefined;
  let supported = (gameId === spec.game.id) && isConfig && isIni;

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

//Install config files
function installConfig(files) {
  // The config files are expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

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

//Installer test for Fluffy Mod Manager files
function testRoot(files, gameId) {
  //const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FOLDER);
  const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installRoot(files) {
  //const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER);
  const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    //((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    ((file.indexOf(rootPath) !== -1))
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

// UNREAL FUNCTIONS ///////////////////////////////////////////////////////////////

//Pre-sort function
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = (UNREALDATA.fileExt || '.pak').substr(1).toUpperCase();

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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

async function resolveGameVersion(gamePath, exePath) {
  GAME_VERSION = await setGameVersionPath(gamePath);
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
  if (GAME_VERSION = 'classic') { //use exe (note that this only returns the UE engine version right now)
    try {
      const READ_FILE = path.join(gamePath, EXEC_CLASSIC);
      const exeVersion = require('exe-version');
      version = await exeVersion.getProductVersion(READ_FILE);
      //log('warn', `Resolved game version for ${GAME_ID} to: ${version}`);
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${READ_FILE} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  if (GAME_VERSION = 'spacers') { //use shipping exe (note that this only returns the UE engine version right now)
    try {
      const READ_FILE = path.join(gamePath, EXEC_NEW);
      const exeVersion = require('exe-version');
      version = await exeVersion.getProductVersion(READ_FILE);
      //log('warn', `Resolved game version for ${GAME_ID} to: ${version}`);
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${READ_FILE} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  GAME_VERSION = await setGameVersionPath(GAME_PATH);
  await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(path.join(discovery.path, PAK_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  context.requireExtension('Unreal Engine Mod Installer'); //require other extensions
  const game = { //register the game
    ...gameSpec.game,
    requiresCleanup: true,
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: () => MOD_PATH,
    requiredFiles,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
    getGameVersion: resolveGameVersion,
    requiresLauncher: requiresLauncher,
  };
  context.registerGame(game);

  //register mod types from spec
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod types explicitly
  context.registerModType(BINARIES_ID, 40, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, BINARIES_TARGET), 
    () => Promise.resolve(false), 
    { name: BINARIES_NAME }
  );
  context.registerModType(CONFIG_ID, 45, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, CONFIG_PATH), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  );

  //register mod installers
  //25 is pak installer from Unreal Engine Mod Installer
  context.registerInstaller(`${GAME_ID}-config`, 30, testConfig, installConfig);
  context.registerInstaller(`${GAME_ID}-root`, 35, testRoot, installRoot);

  //register buttons to open folders
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, PAK_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Binaries Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, BINARIES_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', async () => {
    util.opn(CONFIG_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', async () => {
    util.opn(SAVE_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Submit Bug Report', () => {
    util.opn(`${EXTENSION_URL}?tab=bugs`).catch(() => null);
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
  
  if (UNREALDATA.loadOrder === true) {
    let previousLO;
    context.registerLoadOrderPage({
      gameId: spec.game.id,
      gameArtURL: path.join(__dirname, spec.game.logo),
      preSort: (items, direction) => preSort(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === 'ue4-sortable-modtype'),
      displayCheckboxes: true,
      callback: (loadOrder) => {
        if (previousLO === undefined) previousLO = loadOrder;
        if (loadOrder === previousLO) return;
        //context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
        requestDeployment(context, spec);
        previousLO = loadOrder;
      },
      createInfoPanel: () =>
      context.api.translate(`Drag and drop the mods on the left to change the order in which they load. ${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes `
      + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
      + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.'),
    });
  }
  
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', (profileId) => didDeploy(context.api, profileId)); //*/
  });

  return true;
}

const requestDeployment = (context, spec) => {
  context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
  context.api.sendNotification({
    id: `${spec.game.id}-loadorderdeploy-notif`,
    type: 'warning',
    message: 'Deployment Required to Apply Load Order Changes',
    allowSuppress: true,
    actions: [
      {
        title: 'Deploy',
        action: (dismiss) => {
          deploy(context.api)
          dismiss();
        }
      }
    ],
  });
};

async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  api.dismissNotification(`${GAME_ID}-loadorderdeploy-notif`);
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
