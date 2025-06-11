/*
Name: System Shock Vortex Extension
Structure: UE4
Author: ChemBoy1
Version: 0.2.2
Date: 01/06/2025
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all information about the game
const GAME_ID = "systemshock2023";
const STEAMAPP_ID = "482400";
const EPICAPP_ID = "";
const GOGAPP_ID = "1439637285";
const XBOXAPP_ID = "";
const XBOXEXECNAME = "";
const EPIC_CODE_NAME = "SystemShock";
const EXEC_FOLDER_NAME = "Win64";
//const EXEC_FOLDER_NAME = "WinGDK"; //XBOX Version
const GAME_NAME = "System Shock (2023)";
const GAME_NAME_SHORT = "System Shock";
const EXEC = "SystemShock.exe";
//const EXEC = XBOXEXECNAME; //XBOX Version

/*
  Unreal Engine Game Data
  - modsPath: this is where the mod files need to be installed, relative to the game install folder.
  - fileExt(optional): if for some reason the game uses something other than PAK files, add the extensions here.
  - loadOrder: do we want to show the load order tab?
*/
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'),
  //modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks'), //XBOX Version
  //absModsPath: path.join(process.env['LOCALAPPDATA'], EPIC_CODE_NAME, 'Saved', 'Paks'),
  fileExt: '.pak',
  loadOrder: true,
}

//This information will be filled in from the data above
const EXEC_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_NAME}`;
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_PATH = path.join(EPIC_CODE_NAME, "Saved", "Config", "WindowsNoEditor");
const CONFIG_FILES = ["engine.ini", "input.ini"];
const CONFIG_EXT = ".ini";

const PAK_ID = `${GAME_ID}-pak`;
const PAK_PATH = UNREALDATA.modsPath;

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_FILE = EPIC_CODE_NAME;
const ROOT_IDX = `${ROOT_FILE}\\`;

const BINARIES_ID = `${GAME_ID}-binaries`;

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_PATH = path.join(EPIC_CODE_NAME, "Saved", "SaveGames");
const SAVE_EXT = ".sav";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": EXEC_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC,
    ],
    "details": {
      "unrealEngine": UNREALDATA,
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
      "nexusPageId": GAME_ID,
      "customOpenModsPath": UNREALDATA.absModsPath || UNREALDATA.modsPath
    },
    "compatible": {
      "unrealEngine": true
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      //"XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": BINARIES_ID,
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": `{gamePath}\\${EXEC_PATH}`
    },
    {
      "id": CONFIG_ID,
      "name": "Config (LocalAppData)",
      "priority": "high",
      "targetPath": `{localAppData}\\${CONFIG_PATH}`
    },
    {
      "id": SAVE_ID,
      "name": "Saves (LocalAppData)",
      "priority": "high",
      "targetPath": `{localAppData}\\${SAVE_PATH}`
    },
    {
      "id": PAK_ID,
      "name": "Paks",
      "priority": "high",
      "targetPath": `{gamePath}\\${PAK_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": "Root Game Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    }
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
      GOGAPP_ID,
      //XBOXAPP_ID
    ],
    "names": []
  }
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

//Convert path string placeholders to actual values
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Set mod path
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
async function requiresLauncher() {
  let game = await queryGame();

  if (game.gameStoreId === "steam") {
    return undefined;
  }

  if (game.gameStoreId === "gog") {
    return undefined;
  }
  /*
  if (game.gameStoreId === "epic") {
    return {
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    };
  }
  if (game.gameStoreId === "xbox") {
    return {
      launcher: "xbox",
      addInfo: {
        appId: XBOXAPP_ID,
        // appExecName is the <Application id="" in the appxmanifest.xml file
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    };
  }
  //*/
  return undefined;
}

//Test for config files
function testConfig(files, gameId) {
  const isConfig = files.find(file => CONFIG_FILES.includes(path.basename(file).toLowerCase())) !== undefined;
  let supported = (gameId === spec.game.id) && isConfig;

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
  const modFile = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  ((file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))));

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

//Test for save files
function testSave(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT) !== undefined;
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
function installSave(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

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
  //const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === ROOT_FILE);
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

//Setup function
async function setup(discovery, api, gameSpec) {
  await fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], CONFIG_PATH));
  await fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], SAVE_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, PAK_PATH));
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

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //require other extensions
  context.requireExtension('Unreal Engine Mod Installer');
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher,
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
  context.registerInstaller(CONFIG_ID, 35, testConfig, installConfig);
  context.registerInstaller(SAVE_ID, 40, testSave, installSave);
  context.registerInstaller(ROOT_ID, 45, testRoot, installRoot);
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
