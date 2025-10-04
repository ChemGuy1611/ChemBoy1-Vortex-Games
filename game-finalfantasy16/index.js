/*
Name: Final Fantasy XVI Vortex Extension
Structure: 3rd-Party Mod Installer
Author: ChemBoy1
Version: 0.1.1
Date: 09/18/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const STEAMAPP_ID = "2515020";
const EPICAPP_ID = "";
const GOGAPP_ID = "";
const XBOXAPP_ID = "";
const XBOXEXECNAME = "";
const GAME_ID = "finalfantasy16";
const EXEC = "ffxvi.exe";

const RELOADED_ID = `${GAME_ID}-reloadedmanager`;
const RELOADED_PATH = path.join("Reloaded");
const RELOADED_EXEC = "reloaded-ii.exe";

const RELOADEDMOD_ID = `${GAME_ID}-reloadedmod`;
const RELOADEDMOD_PATH = path.join("Reloaded", "Mods");
const RELOADEDMOD_FILE = "modconfig.json";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": "Final Fantasy XVI",
    "shortName": "FFXVI",
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
      "nexusPageId": GAME_ID,
      "supportsSymlinks": false,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      //"XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": RELOADEDMOD_ID,
      "name": "Reloaded Mod",
      "priority": "high",
      "targetPath": `{gamePath}\\${RELOADEDMOD_PATH}`
    },
    {
      "id": RELOADED_ID,
      "name": "Reloaded Mod Manager",
      "priority": "low",
      "targetPath": "{gamePath}"
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

  return undefined;
}

//Check if mod injector is installed
function isModManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === RELOADED_ID);
}

//Function to auto-download Mod Loader
async function downloadModManager(api, gameSpec) {
  let modLoaderInstalled = isModManagerInstalled(api, gameSpec);
  
  if (!modLoaderInstalled) {
    //notification indicating install process
    const MOD_NAME = 'Reloaded Mod Manager';
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing-${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const URL = `https://github.com/Reloaded-Project/Reloaded-II/releases/latest/download/Release.zip`;
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
        actions.setModType(gameSpec.game.id, modId, RELOADED_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://github.com/Reloaded-Project/Reloaded-II/releases`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Installer test for Fluffy Mod Manager files
function testModManger(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === RELOADED_EXEC);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installModManager(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === RELOADED_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: RELOADED_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(RELOADED_PATH, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);

  return Promise.resolve({ instructions });
}

//Test for Reloaded Mod files
function testReloadedMod(files, gameId) {
  // Make sure we're able to support this mod
  const isMod = files.find(file => path.basename(file).toLowerCase() === RELOADEDMOD_FILE) !== undefined;
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

//Install Reloaded Mod files
function installReloadedMod(files, fileName) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === RELOADEDMOD_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: RELOADEDMOD_ID };
  const MOD_NAME = path.basename(fileName);
  const MOD_FOLDER = MOD_NAME.replace(/[\-]*[\d]*[\.]*( )*(installing)*/gi, '');;

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  api.sendNotification({
    id: 'setup-notification-finalfantasy16',
    type: 'warning',
    message: 'Mod Manager Setup Required',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'The Reloaded Mod Manager tool downloaded by this extension requires setup.\n'
                + 'Please launch the tool and set the location of the FFXVI game executable.\n'
                + 'You must also enable mods in Reloaded using the "Manage Mods" button on the left hand side of the Reloaded window.\n'
                + 'You must launch the game from Reloaded for mods installed there to load with the game".\n'
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
          ]);
        },
      },
    ],
  });    
}

//Setup function
async function setup(discovery, api, gameSpec) {
  setupNotify(api);
  await downloadModManager(api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(discovery.path, RELOADEDMOD_PATH));
  //return fs.ensureDirWritableAsync(path.join(discovery.path, gameSpec.game.modPath));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher,
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    supportedTools: [
      /*
      {
        id: "LaunchModdedGame",
        name: "Launch Modded Game",
        logo: "exec.png",
        executable: () => RELOADED_EXEC,
        requiredFiles: [RELOADED_EXEC],
        detach: true,
        relative: true,
        exclusive: true,
        defaultPrimary: true,
        isPrimary: true,
        parameters: [`--launch "${path.join(gamePath, EXEC)}"`]
      },
      */
      {
        id: "ReloadedModManager",
        name: "Reloaded Mod Manager",
        logo: "reloaded.png",
        executable: () => RELOADED_EXEC,
        requiredFiles: [RELOADED_EXEC],
        detach: true,
        relative: true,
        exclusive: true,
        defaultPrimary: true,
        isPrimary: true,
      },
    ],
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
  context.registerInstaller(`${GAME_ID}-reloadedmanager`, 25, testModManger, installModManager);
  context.registerInstaller(`${GAME_ID}-reloadedmod`, 30, testReloadedMod, installReloadedMod);
}

//main function
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
