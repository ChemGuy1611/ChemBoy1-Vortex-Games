/*
Name: The Outer Worlds Vortex Extension
Structure: UE4
Author: ChemBoy1
Version: 0.4.2
Date: 11/07/2024
*/

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
const XBOXAPP_ID_NEW = "";
const XBOXEXECNAME = "App";
const XBOXEXECNAME_NEW = "App";
const EPIC_CODE_NAME = "Indiana";
const GAME_NAME = "The Outer Worlds";
const GAME_NAME_SHORT = "The Outer Worlds";

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }, { id: STEAMAPP_ID_NEW }],
  gog: [{ id: GOGAPP_ID }, { id: GOGAPP_ID_NEW }],
  epic: [{ id: EPICAPP_ID }, { id: EPICAPP_ID_NEW }],
  xbox: [{ id: XBOXAPP_ID }],
  //xbox: [{ id: XBOXAPP_ID }, { id: XBOXAPP_ID_NEW }],
};

//Information for setting the executable and variable paths based on the game store version
let MOD_PATH = null;
let EXEC_TARGET = null;
let CONFIG_PATH = null;
let CONFIG_TARGET = null;
let EPIC_LAUNCH_ID = null;
let XBOX_LAUNCH_ID = null;
let XBOX_LAUNCH_NAME = null;
let requiredFiles = [EPIC_CODE_NAME];
const CONFIG_PATH_DEFAULT = path.join(EPIC_CODE_NAME, "Saved", "Config", "WindowsNoEditor");
const CONFIG_PATH_XBOX = path.join("Packages", `${XBOXAPP_ID}_hv3d7yfbgr2rp`, "LocalCache", "Local", EPIC_CODE_NAME, "Saved", "Config", "WindowsNoEditor"); //XBOX Version
const EXEC_FOLDER = "Win64";
const XBOX_EXEC_FOLDER = "WinGDK";
const EXEC_CLASSIC = `TheOuterWorlds.exe`;
const EXEC_NEW = "TheOuterWorldsSpacersChoiceEdition.exe";
const EXEC_XBOX = `gamelaunchhelper.exe`;

let GAME_VERSION = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

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
//const SHIPPING_EXE = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_NAME}\\${EPIC_CODE_NAME}-${EXEC_FOLDER_NAME}-Shipping.exe`;
//const SHIPPING_EXE_EPIC= `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_NAME}\\${EPIC_CODE_NAME}EpicGameStore-${EXEC_FOLDER_NAME}-Shipping.exe`;
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = `Config (LocalAppData)`;
const CONFIG_FILE1 = "engine.ini";
const CONFIG_FILE2 = "input.ini";
const CONFIG_FILES = [CONFIG_FILE1, CONFIG_FILE2];
const CONFIG_EXT = ".ini";
const PAK_ID = `${GAME_ID}-pak`;
const PAK_PATH = UNREALDATA.modsPath;
const ROOT_ID = `${GAME_ID}-root`;
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = `Binaries (Engine Injector)`;
const ROOT_FILE = EPIC_CODE_NAME;
const ROOT_IDX = `${EPIC_CODE_NAME}\\`;

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
      "targetPath": `{gamePath}\\${PAK_PATH}`
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
  
];

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
      localAppData: process.env['LOCALAPPDATA'],
      appData: util.getVortexPath('appData'),
    });
  }
  catch(err){
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
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

  if (isCorrectExec(EXEC_CLASSIC)) {
    MOD_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER}`;
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    CONFIG_TARGET = `{localAppData}\\${CONFIG_PATH}`;
    EXEC_TARGET = `{gamePath}\\${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER}`;
    EPIC_LAUNCH_ID = EPICAPP_ID;
    XBOX_LAUNCH_ID = XBOXAPP_ID;
    XBOX_LAUNCH_NAME = XBOXEXECNAME;
    return EXEC_CLASSIC;
  };

  if (isCorrectExec(EXEC_NEW)) {
    MOD_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER}`;
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    CONFIG_TARGET = `{localAppData}\\${CONFIG_PATH}`;
    EXEC_TARGET = `{gamePath}\\${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER}`;
    EPIC_LAUNCH_ID = EPICAPP_ID_NEW;
    XBOX_LAUNCH_ID = XBOXAPP_ID_NEW;
    XBOX_LAUNCH_NAME = XBOXEXECNAME_NEW;
    return EXEC_NEW;
  };

  /*
  if (isCorrectExec(XBOX_EXEC)) {
    MOD_PATH = `${EPIC_CODE_NAME}\\Binaries\\${XBOX_EXEC_FOLDER}`;
    CONFIG_PATH = CONFIG_PATH_XBOX;
    CONFIG_TARGET = `{localAppData}\\${CONFIG_PATH}`;
    EXEC_TARGET = `{gamePath}\\${EPIC_CODE_NAME}\\Binaries\\${XBOX_EXEC_FOLDER}`;
    EPIC_LAUNCH_ID = EPICAPP_ID_NEW;
    XBOX_LAUNCH_ID = XBOXAPP_ID_NEW;
    XBOX_LAUNCH_NAME = XBOXEXECNAME_NEW;
    return XBOX_EXEC;
  };
  */
  /*
  MOD_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER}`;
  CONFIG_PATH = CONFIG_PATH_DEFAULT;
  CONFIG_TARGET = `{localAppData}\\${CONFIG_PATH}`;
  EXEC_TARGET = `{gamePath}\\${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER}`;
  */
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
  if (isCorrectExec(EXEC_CLASSIC)) {
    GAME_VERSION = 'classic';
    return GAME_VERSION;
  };
  if (isCorrectExec(EXEC_NEW)) {
    GAME_VERSION = 'spacers';
    return GAME_VERSION;
  };
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
  //const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FILE);
  const isMod = files.some(file => path.basename(file) === ROOT_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installRoot(files) {
  //const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FILE);
  const modFile = files.find(file => path.basename(file) === ROOT_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
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
  //SHIPPING_EXE = getShippingExe(gamePath);
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
  if (GAME_VERSION = 'classic') { //use shipping exe (note that this only returns the UE engine version right now)
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
  await fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], CONFIG_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, PAK_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //require other extensions
  context.requireExtension('Unreal Engine Mod Installer');
  //register the game
  const game = {
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
    (game) => pathPattern(context.api, game, EXEC_TARGET), 
    () => Promise.resolve(false), 
    { name: BINARIES_NAME }
  );
  context.registerModType(CONFIG_ID, 45, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, CONFIG_TARGET), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  );

  //register mod installers
  context.registerInstaller(`${GAME_ID}-config`, 35, testConfig, installConfig);
  context.registerInstaller(`${GAME_ID}-root`, 45, testRoot, installRoot);
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
        context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
        previousLO = loadOrder;
      },
      createInfoPanel: () =>
      context.api.translate(`Drag and drop the mods on the left to change the order in which they load. ${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes `
      + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
      + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.'),
    });
  }
  
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up

  });

  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
