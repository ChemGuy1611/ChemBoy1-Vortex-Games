/*
Name: RoboCop Rogue City Vortex Extension
Author: ChemBoy1
Version: 0.2.2
Date: 07/19/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

/*
  Unreal Engine Game Data
  - modsPath: this is where the mod files need to be installed, relative to the game install folder.
  - fileExt(optional): if for some reason the game uses something other than PAK files, add the extensions here.
  - loadOrder: do we want to show the load order tab?
*/
const UNREALDATA = {
  modsPath: path.join('Game', 'Content', 'Paks', '~mods'),
  fileExt: ('.pak', '.ucas', '.utoc'),
  loadOrder: true,
}

//App IDs for game spec, discovery, and launcher setup
const GAME_ID = "robocoproguecity";
const STEAMAPP_ID = "1681430";
const EPICAPP_ID = "";
const GOGAPP_ID = "1950574400";
const XBOXAPP_ID = "";
const XBOXEXECNAME = "";
const EXEC = "RoboCop.exe";
const SHIPPING_EXE_PATH = 'Game\\Binaries\\Win64\\RoboCop-Win64-Shipping.exe';
const UE5_ID = "robocoproguecity-ue5";
const UE5_EXT = ['.pak', '.ucas', '.utoc'];
const UE5_PATH = UNREALDATA.modsPath;
const CONFIG_ID = "robocoproguecity-config";
const CONFIG_EXT = ".ini";
const CONFIG_PATH = "RoboCop\\Saved\\Config\\Windows";
const CONFIG_FILE = "engine.ini";
const CONFIG_FILE2 = "scalability.ini";

//Specify all information about the game
const spec = {
  "game": {
    "id": GAME_ID,
    "name": "RoboCop: Rogue City",
    "executable": EXEC,
    "logo": "robocoproguecity.jpg",
    "mergeMods": true,
    "modPath": "Game\\Binaries\\Win64",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC,
      SHIPPING_EXE_PATH
    ],
    "details": {
      //"unrealEngine": UNREALDATA,
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
      "nexusPageId": GAME_ID,
      //"customOpenModsPath": UNREALDATA.absModsPath || UNREALDATA.modsPath
    },
    "compatible": {
      //"unrealEngine": true
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
      "id": "robocoproguecity-binaries",
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": "{gamePath}\\Game\\Binaries\\Win64"
    },
    {
      "id": CONFIG_ID,
      "name": "Config (LocalAppData)",
      "priority": "high",
      "targetPath": "{localAppData}\\RoboCop\\Saved\\Config\\Windows"
    },
    {
      "id": UE5_ID,
      "name": "Paks",
      "priority": "high",
      "targetPath": "{gamePath}\\Game\\Content\\Paks\\~mods"
    },
    {
      "id": "robocoproguecity-pakalt",
      "name": 'Paks (Alt, no "~mods")',
      "priority": "high",
      "targetPath": "{gamePath}\\Game\\Content\\Paks"
    },
    {
      "id": "robocoproguecity-root",
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

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Change folder path string placeholders to actual folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Set the mod path
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
}

//Test for UE5 Mod files
function testSupportedContent(files, gameId) {
  // Make sure we're able to support this mod.
  //const isMod = files.find(file => path.extname(file).toLowerCase() === UE5_EXT) !== undefined;
  const isMod = files.find(file => UE5_EXT.includes(path.extname(file).toLowerCase())) !== undefined;
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

//Install UE5 Mod files
function installContent(files) {
  // The UE5 mod files are expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  //const modFile = files.find(file => path.extname(file).toLowerCase() === UE5_EXT);
  const modFile = files.find(file => UE5_EXT.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const MODTYPE_ID = UE5_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MODTYPE_ID };

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

//Test for config files
function testSupportedContentConfig(files, gameId) {
  // Make sure we're able to support this mod
  const isConfig = files.some(file => path.basename(file).toLocaleLowerCase() === (CONFIG_FILE || CONFIG_FILE2));
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
function installContentConfig(files) {
  // The config files are expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const MODTYPE_ID = CONFIG_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MODTYPE_ID };

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

//Setup function
async function setup(discovery, api, gameSpec) {
  await fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], CONFIG_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, UE5_PATH));
}

/*
//UNREAL - Pre-sort function
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = (UNREALDATA.fileExt || ('.pak', '.ucas', '.utoc')).substr(1).toUpperCase();

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
*/

//Let vortex know about the game
function applyGame(context, gameSpec) {
  //Require Unreal Engine Mod Installer extension
  //context.requireExtension('Unreal Engine Mod Installer');

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
  context.registerInstaller('robocoproguecity-ue5', 25, testSupportedContent, installContent);
  context.registerInstaller('robocoproguecity-config', 50, testSupportedContentConfig, installContentConfig);
}

//Main function
function main(context) {
  applyGame(context, spec);
  /*
  //UNREAL - mod load order
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
  */

  context.once(() => {
    // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
