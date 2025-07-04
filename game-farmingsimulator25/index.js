/*
Name: Farming Simulator 25 Vortex Extension
Author: ChemBoy1
Version: 0.1.0
Date: 11/23/2024
*/

//import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const Bluebird = require('bluebird');
//const winapi = require('winapi-bindings'); //gives access to the Windows registry

//Specify all the information about the game
const STEAMAPP_ID = "2300320";
const EPICAPP_ID = "";
const XBOXAPP_ID = "";
const XBOXEXECNAME = "";
const GAME_ID = "farmingsimulator25";
const EXEC = "FarmingSimulator2025.exe";
const GAME_NAME = "Farming Simulator 25";
const GAME_NAME_SHORT = "Farming Sim 25";

//Info for mod types and installers
const DOCUMENTS = util.getVortexPath('documents');
const MOD_PATH = path.join(DOCUMENTS, 'My Games', 'FarmingSimulator2025', 'mods');
const ZIP_ID = `${GAME_ID}-zip`;

const ROOT_ID = `${GAME_ID}-root`;

const PDLC_ID = `${GAME_ID}-pdlc`;
const PDLC_PATH = path.join("pdlc");

const I3D_ID = `${GAME_ID}-i3d`;
const I3D_EXTS = ['.i3d'];
const I3D_PATH = path.join("data", "maps", 'mapUS');

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": false,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "nexusPageId": GAME_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": I3D_ID,
      "name": "Map Mod (Game Folder)",
      "priority": "high",
      "targetPath": `{gamePath}\\${I3D_PATH}`
    },
    {
      "id": PDLC_ID,
      "name": "PDLC (Game Folder)",
      "priority": "high",
      "targetPath": `{gamePath}\\${PDLC_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": "Root Game Folder",
      "priority": "high",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
      //XBOXAPP_ID,
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

//convert path placeholders to actual values
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Get mod path
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
    //return { launcher: "steam"};
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
  */
  /*
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
  */
  return undefined;
}

//Test for .i3d files
function testI3d(files, gameId) {
  const isMod = files.find(file => I3D_EXTS.includes(path.extname(file).toLowerCase())) !== undefined;
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

//Install .i3d files
function installI3d(files) {
  const modFile = files.find(file => I3D_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: I3D_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    (
     (file.indexOf(rootPath) !== -1) &&
     (!file.endsWith(path.sep))
    )
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

//test for zips
async function testZip(files, gameId) {
  let supported = (gameId === spec.game.id);

  return Promise.resolve({
    supported,
    requiredFiles: []
  });
}

//Install zips
async function installZip(files, destinationPath) {
  const zipFiles = files.filter(file => ['.zip', '.7z', '.rar'].includes(path.extname(file)));
  // If it's a double zip, we don't need to repack. 
  if (zipFiles.length > 0) {
    const instructions = zipFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file),
      }
    });
    return Promise.resolve({ instructions });
  }
  // Repack the ZIP
  else {
    const szip = new util.SevenZip();
    const archiveName = path.basename(destinationPath, '.installing') + '.zip';
    const archivePath = path.join(destinationPath, archiveName);
    const rootRelPaths = await fs.readdirAsync(destinationPath);
    await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
    const instructions = [{
      type: 'copy',
      source: archiveName,
      destination: path.basename(archivePath),
    }];
    return Promise.resolve({ instructions });
  }
}

//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

//Setup function
async function setup(discovery, api, gameSpec) {
  await fs.ensureDirWritableAsync(path.join(discovery.path, I3D_PATH));
  await fs.ensureDirWritableAsync(path.join(discovery.path, PDLC_PATH));
  return fs.ensureDirWritableAsync(MOD_PATH);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
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
  //context.registerInstaller(I3D_ID, 25, testI3d, installI3d);
  context.registerInstaller(ZIP_ID, 70, toBlue(testZip), toBlue(installZip));
}

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
