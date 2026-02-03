/*
Name: Sker Ritual Vortex Extension
Structure: Unity BepinEx
Author: ChemBoy1
Version: 0.1.0
Date: 10/16/2024
*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const winapi = require('winapi-bindings');
//const turbowalk = require('turbowalk');

//Specify all the information about the game
const STEAMAPP_ID = "1492070";
const EPICAPP_ID = ""; //not on egdata.app yet
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const GAME_ID = "skerritual";
const GAME_NAME = "Sker Ritual"
const GAME_NAME_SHORT = "Sker Ritual"
const EXEC = "SkerRitual.exe";

const ROOT_ID = `${GAME_ID}-root`;

const BEPMOD_ID = `${GAME_ID}-bepmods`;
const BEPMOD_PATH = path.join("BepinEx", "plugins")
const modFileExt = ".dll";

const LOADER_ID = `${GAME_ID}-modloader`;

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
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
      "id": ROOT_ID,
      "name": "Root Game Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": BEPMOD_ID,
      "name": "BepinEx Mod",
      "priority": "high",
      "targetPath": path.join('{gamePath}', BEPMOD_PATH)
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
  
];

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

//Test for .dll BepinEx mod files
function testBepMod(files, gameId) {
  // Make sure we're able to support this mod.
  const isMod = files.find(file => path.extname(file).toLowerCase() === modFileExt) !== undefined;
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

//Install .dll BepinEx mod files
function installBepMod(files) {
  // The .dds file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === modFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_ID };
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

//Setup function
async function setup(discovery, api, gameSpec) {
  //await downloadLoader(discovery, api, gameSpec);
  //setupNotify(api);
  //await fs.ensureDirWritableAsync(path.join(discovery.path, "Mods"));
  return fs.ensureDirWritableAsync(path.join(discovery.path, BEPMOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //Require BepinEx Mod Installer extension
  context.requireExtension('modtype-bepinex');

  //register game
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
  //context.registerInstaller(BEPMOD_ID, 25, testBepMod, installBepMod);
}

//main function
function main(context) {
  applyGame(context, spec);

  context.once(() => {
    //Download BepinEx and register with extension
    if (context.api.ext.bepinexAddGame !== undefined) {
      context.api.ext.bepinexAddGame({
        gameId: GAME_ID,
        autoDownloadBepInEx: true,
        /*
        customPackDownloader: () => { // <--- This will download from a Nexus Mods page
          return {
            // The game extension's domain Id/gameId as defined when registering the extension
            gameId: GAME_ID,
            // Nexus Mods site domain for the BepinEx package's mod page
            domainId: 'site',
            // Nexus Mods site page number for the BepinEx package's mod page
            modId: '115',
            // We extracted this one by hovering over the download buttons on the site
            fileId: '2529',
            // What we want to call the archive of the downloaded pack.
            archiveName: 'BepInEx_x64_6.0.0-pre.1_IL2CPP.zip',
            // Whether we want this to be installed automatically - should always be true
            allowAutoInstall: true,
          }
        },
        */
        architecture: 'x64', // <--- This will download version for 64-bit games
        //architecture: 'x86', // <--- This will download version for 32-bit games
        //installRelPath: "bin/x64" // <--- Specify install location if not the root game folder
        //bepinexVersion: '5.4.23.1', // <--- Force BepinEx version
        forceGithubDownload: true, // <--- This will force Vortex to download directly from Github
        unityBuild: 'unityil2cpp', // <--- This will default to version 6.0.0 of BepInEx that supports IL2CPP
        //unityBuild: 'unitymono', // <--- This will default to version of BepInEx that supports Mono
      });
    }
  });

  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
