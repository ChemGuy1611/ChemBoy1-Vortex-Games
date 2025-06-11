/*
Name: Lies of P Vortex Extension
Structure: UE4 (XBOX Integrated)
Author: ChemBoy1
Version: 0.3.3
Date: 11/07/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all information about the game
const GAME_ID = "liesofp";
const STEAMAPP_ID = "1627720";
const GOGAPP_ID = "";
const EPICAPP_ID = "";
const XBOXAPP_ID = "Neowiz.3616725F496B";
const XBOXEXECNAME = "AppLiesofPShipping";
const EPIC_CODE_NAME = "LiesofP";
const GAME_NAME = "Lies of P";
const GAME_NAME_SHORT = "Lies of P";

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  //gog: [{ id: GOGAPP_ID }],
  //epic: [{ id: EPICAPP_ID }],
  xbox: [{ id: XBOXAPP_ID }],
};

//Information for setting the executable and variable paths based on the game store version
let MOD_PATH = null;
let EXEC_TARGET = null;
let CONFIG_PATH = null;
let CONFIG_TARGET = null;
let requiredFiles = [EPIC_CODE_NAME];

const CONFIG_PATH_DEFAULT = path.join(EPIC_CODE_NAME, "Saved", "Config", "WindowsNoEditor");
const CONFIG_PATH_XBOX = path.join(EPIC_CODE_NAME, "Saved", "Config", "WinGDK"); //XBOX Version
const LOCALAPPDATA = util.getVortexPath('localAppData');

const STEAM_EXEC_FOLDER = "Win64";
//const GOG_EXEC_FOLDER = "Win64";
//const EPIC_EXEC_FOLDER = "Win64";
const XBOX_EXEC_FOLDER = "WinGDK";

const STEAM_EXEC= `LOP.exe`;
//const GOG_EXEC= `LOP.exe`;
//const EPIC_EXEC = `LOP.exe`;
const XBOX_EXEC = `gamelaunchhelper.exe`;

//Unreal Engine Game Data
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'),
  fileExt: '.pak',
  loadOrder: true,
}

//This information will be filled in from the data above
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config (LocalAppData)";
const CONFIG_FILE1 = "engine.ini";
const CONFIG_FILE2 = "input.ini";
const CONFIG_FILES = [CONFIG_FILE1, CONFIG_FILE2];
const CONFIG_EXT = ".ini";

const PAK_ID = `${GAME_ID}-pak`;
const PAK_PATH = UNREALDATA.modsPath;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_FILE = EPIC_CODE_NAME;
const ROOT_IDX = `${ROOT_FILE}\\`;

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_PATH = path.join(EPIC_CODE_NAME, "Saved", "SaveGames");
//const USER_ID = process.env['USER_ID']; //XBOX Version
//const SAVE_PATH = path.join("Packages", `${XBOXAPP_ID}_r4z3116tdh636`, "SystemAppData", "wgs", USER_ID); //XBOX Version
const SAVE_EXT = ".sav";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "details": {
      "unrealEngine": UNREALDATA,
      "steamAppId": STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      //"epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "nexusPageId": GAME_ID,
      "customOpenModsPath": UNREALDATA.absModsPath || UNREALDATA.modsPath
    },
    "compatible": {
      "unrealEngine": true
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      //"EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    /*
    {
      "id": SAVE_ID,
      "name": "Config (LocalAppData)",
      "priority": "high",
      "targetPath": `{localAppData}\\${SAVE_PATH}`
    },
    */
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
  }
  
  return Promise.resolve(undefined);
}

//Get the executable and add to required files
function getExecutable(discoveryPath) {

  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      requiredFiles.push(exec);
      return true;
    }
    catch (err) {
      return false;
    }
  };

  if (isCorrectExec(XBOX_EXEC)) {
    MOD_PATH = `${EPIC_CODE_NAME}\\Binaries\\${XBOX_EXEC_FOLDER}`;
    CONFIG_PATH = CONFIG_PATH_XBOX;
    CONFIG_TARGET = `{localAppData}\\${CONFIG_PATH}`;
    EXEC_TARGET = `{gamePath}\\${EPIC_CODE_NAME}\\Binaries\\${XBOX_EXEC_FOLDER}`;
    return XBOX_EXEC;
  };

  if (isCorrectExec(STEAM_EXEC)) {
    MOD_PATH = `${EPIC_CODE_NAME}\\Binaries\\${STEAM_EXEC_FOLDER}`;
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    CONFIG_TARGET = `{localAppData}\\${CONFIG_PATH}`;
    EXEC_TARGET = `{gamePath}\\${EPIC_CODE_NAME}\\Binaries\\${STEAM_EXEC_FOLDER}`;
    return STEAM_EXEC;
  };

  return STEAM_EXEC;
}

//Test for config files
function testConfig(files, gameId) {
  // Make sure we're able to support this mod
  const isConfig = files.some(file => path.basename(file).toLocaleLowerCase() === (CONFIG_FILE1 || CONFIG_FILE2));
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
  //const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === ROOT_FILE);
  const isMod = files.some(file => path.basename(file) === ROOT_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installRoot(files) {
  const modFile = files.find(file => path.basename(file) === ROOT_FILE);
  const idx = modFile.indexOf(ROOT_IDX);
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

//Setup function
async function setup(discovery, api, gameSpec) {
  await fs.ensureDirWritableAsync(path.join(LOCALAPPDATA, CONFIG_PATH));
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
  context.registerInstaller(`${GAME_ID}-config`, 30, testConfig, installConfig);
  context.registerInstaller(`${GAME_ID}-root`, 35, testRoot, installRoot);
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
