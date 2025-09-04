/*//////////////////////////////////////////
Name: XXX Vortex Extension
Structure: Unity BepinEx
Author: ChemBoy1
Version: 0.1.0
Date: 2025-07-02
//////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const winapi = require('winapi-bindings');
//const turbowalk = require('turbowalk');

//Specify all the information about the game
const STEAMAPP_ID = "XXX";
const EPICAPP_ID = "XXX";
const GOGAPP_ID = "XXX";
const XBOXAPP_ID = "XXX";
const XBOXEXECNAME = "XXX";
const GAME_ID = "XXX";
const GAME_NAME = "XXX"
const GAME_NAME_SHORT = "XXX"
const EXEC = "XXX.exe";
const EXEC_XBOX = 'gamelaunchhelper.exe';
const BEPINEX_PAGE_ID = 'XXX';
const BEPINEX_FILE_ID = 'XXX';

let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//modtypes
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";

const BEPMOD_ID = `${GAME_ID}-bepmods`;
const BEPMOD_NAME = "BepinEx Mod";
const BEPMOD_PATH = path.join("BepinEx", "plugins")
const modFileExt = ".dll";

const BEPINEXIL2CPP_BE_URL = `https://builds.bepinex.dev/projects/bepinex_be/738/BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.738%2Baf0cba7.zip`;

const LOADER_ID = `${GAME_ID}-modloader`;

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      //"supportsSymlinks": false,
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
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": BEPMOD_ID,
      "name": BEPMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${BEPMOD_PATH}`
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

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////

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
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  /*if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam',
    });
  } //*/
  /*if (store === 'xbox') {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  } //*/
  /*if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  } //*/
  return Promise.resolve(undefined);
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for .dll BepinEx mod files
function testBepMod(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === modFileExt));
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
  const modFile = files.find(file => (path.extname(file).toLowerCase() === modFileExt));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BEPMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))
  ));
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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Setup function
async function setup(discovery, api, gameSpec) {
  //SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYCRONOUS CODE ///////////////////////////////////
  //await downloadBepinex(api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(GAME_PATH, BEPMOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  context.requireExtension('modtype-bepinex'); //Require BepinEx Mod Installer extension
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    getGameVersion: resolveGameVersion,
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
  //context.registerInstaller(BEPINEX_ID, 25, testBepinex, installBepinex);
  //context.registerInstaller(MELON_ID, 25, testMelon, installMelon);
  //context.registerInstaller(BEPMOD_ID, 25, testBepMod, installBepMod);
  //context.registerInstaller(MELONMOD_ID, 25, testMelonMod, installMelonMod);
  
  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    const openPath = DOWNLOAD_FOLDER;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
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
        /* <--- Download BepInEx from a Nexus Mods page. Comment out other section if using this.
        customPackDownloader: () => {
          return {
            gameId: GAME_ID, // <--- The game extension's domain Id/gameId as defined when registering the extension
            domainId: GAME_ID, // <--- Nexus Mods site domain for the BepinEx package's mod page (GAME_ID or "site")
            modId: BEPINEX_PAGE_ID, // <--- Nexus Mods site page number for the BepinEx package's mod page
            fileId: BEPINEX_FILE_ID, // <--- Get this by hovering over the download button on the site
            archiveName: `BepInEx-${GAME_ID}-Custom.zip`, // <--- What we want to call the archive of the downloaded pack.
            allowAutoInstall: true, // <--- Whether we want this to be installed automatically - should always be true
          }
        }, //*/
        //* <--- Download BepinEx from GitHub. Comment out other section if using this.
        architecture: 'x64', // <--- Select version for 64-bit or 32-bit game ('x64' or 'x86')
        //installRelPath: "bin/x64" // <--- Specify install location (next to game .exe) if not the root game folder (not common)
        bepinexVersion: '5.4.23.3', // <--- Force BepinEx version
        forceGithubDownload: true, // <--- Force Vortex to download directly from Github (recommended)
        unityBuild: 'unitymono', // <--- Download version 6.0.0 of BepInEx that supports IL2CPP or 5.4.23 Mono ('unityil2cpp' or 'unitymono') 
        //*/
      });
    }
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};


//* Functions to download BepInEx 5.4.23.3 from GitHub (temporary due to error)
function isBepinexInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === 'bepinex-injector');
}
async function downloadBepinex(api, gameSpec) {
  let isInstalled = isBepinexInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = 'BepInEx_win_x64_5.4.23.3';
    const MOD_TYPE = 'bepinex-injector';
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const URL = 'https://github.com/BepInEx/BepInEx/releases/download/v5.4.23.3/BepInEx_win_x64_5.4.23.3.zip';
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //const dlInfo = {};
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = 'https://github.com/BepInEx/BepInEx/releases';
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/