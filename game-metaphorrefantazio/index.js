/*/////////////////////////////////////////////////
Name: Metaphor: ReFantazio Vortex Extension
Structure: 3rd-Party Mod Installer (Reloaded-II)
Author: ChemBoy1
Version: 0.2.1
Date: 2025-10-05
/////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');

//Specify all the information about the game
const STEAMAPP_ID = "2679460";
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = "SEGAofAmericaInc.Pae22b02y";
const XBOXEXECNAME = "METAPHOR";
const GAME_ID = "metaphorrefantazio";
const GAME_NAME = "Metaphor: ReFantazio";
const GAME_NAME_SHORT = "Metaphor: RF";
const EXEC = "METAPHOR.exe";

let GAME_VERSION = '';
const EXEC_XBOX = 'gamelaunchhelper.exe';
const APPMANIFEST_FILE = 'appxmanifest.xml';

const RELOADED_ID = `${GAME_ID}-reloadedmanager`;
const RELOADED_PATH = path.join("Reloaded");
const RELOADED_EXEC = "reloaded-ii.exe";
const RELOADED_URL_LATEST = `https://github.com/Reloaded-Project/Reloaded-II/releases/latest/download/Release.zip`;
const RELOADED_URL_MANUAL = `https://github.com/Reloaded-Project/Reloaded-II/releases`;

const RELOADEDMODLOADER_ID = `${GAME_ID}-reloadedmodloader`;
const RELOADEDMODLOADER_PATH = path.join("Reloaded", "Mods", "MRFPC_Mod_Loader");
const RELOADEDMODLOADER_FILE = "mrfpc.modloader.dll";

const RELOADEDMOD_ID = `${GAME_ID}-reloadedmod`;
const RELOADEDMOD_PATH = path.join("Reloaded", "Mods");
const RELOADEDMOD_FILE = "modconfig.json";

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
      //"gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
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
      "targetPath": path.join('{gamePath}', RELOADEDMOD_PATH)
    },
    {
      "id": RELOADEDMODLOADER_ID,
      "name": "MRFPC Mod Loader",
      "priority": "low",
      "targetPath": path.join('{gamePath}', RELOADEDMODLOADER_PATH)
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

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

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

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
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
  } //*/
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable, add to required files, set paths for mod types
function setGameVersion(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  }
  else { 
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  };
}

const getDiscoveryPath = (api) => {
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


// AUTO-DOWNLOADER FUNCTIONS ///////////////////////////////////////////////////

//Check if mod injector is installed
function isModManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === RELOADED_ID);
}

//Check if mod injector is installed
function isModLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === RELOADEDMODLOADER_ID);
}

//Function to auto-download Reloaded-II Mod Loader
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
      const URL = RELOADED_URL_LATEST;
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
      const errPage = RELOADED_URL_MANUAL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download Reloaded-II Mod Loader from GitHub (no check, for button)
async function downloadModManagerNoCheck(api, gameSpec) {
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
    const URL = RELOADED_URL_LATEST;
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
    const errPage = RELOADED_URL_MANUAL;
    api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
    util.opn(errPage).catch(() => null);
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
}

//Function to auto-download MRFC Mod Loader for Reloaded-II Mod Loader (from Nexus)
async function downloadModLoader(api, gameSpec) {
  let modLoaderInstalled = isModLoaderInstalled(api, gameSpec);
  if (!modLoaderInstalled) {
    //notification indicating install process
    const MOD_NAME = `Metaphor Essentials`;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }

    const modPageId = 5;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [nxmUrl], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, RELOADEDMODLOADER_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

/*
//Function to auto-download MRFC Mod Loader for Reloaded-II Mod Loader (from Github)
async function downloadModLoaderGithub(api, gameSpec) {
  let modLoaderInstalled = isModLoaderInstalled(api, gameSpec);
  
  if (!modLoaderInstalled) {
    //notification indicating install process
    const MOD_NAME = 'MRFPC Mod Loader';
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
      const URL = `https://github.com/DeathChaos25/mrfpc.modloader/releases/download/1.0.1/mrfpc.modloader1.0.1.7z`;
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
        actions.setModType(gameSpec.game.id, modId, RELOADEDMODLOADER_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://github.com/DeathChaos25/mrfpc.modloader/releases`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}
*/

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

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
function testReloadedLoader(files, gameId) {
  // Make sure we're able to support this mod
  const isMod = files.find(file => path.basename(file).toLowerCase() === RELOADEDMOD_FILE) !== undefined;
  const isLoader = files.find(file => path.basename(file).toLowerCase() === RELOADEDMODLOADER_FILE) !== undefined;
  let supported = (gameId === spec.game.id) && isMod && isLoader;

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
function installReloadedLoader(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === RELOADEDMOD_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: RELOADEDMODLOADER_ID };

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
  const MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');

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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup-notification`;
  const MESSAGE = 'Reloaded Mod Manager Setup Required';
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
            text: 'The Reloaded Mod Manager tool downloaded by this extension requires setup.\n'
                + `Please launch the tool and set the location of the ${GAME_NAME} executable.\n`
                + 'You must also enable mods in Reloaded using the "Manage Mods" button on the left hand side of the Reloaded window.\n'
                + 'You must launch the game from Reloaded for mods installed there to load with the game".\n'
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

async function resolveGameVersion(gamePath) {
  GAME_VERSION = setGameVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') {
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
  else { // use METAPHOR.exe for Steam
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  setupNotify(api);
  await fs.ensureDirWritableAsync(path.join(discovery.path, RELOADEDMODLOADER_PATH));
  await downloadModManager(api, gameSpec);
  await downloadModLoader(api, gameSpec);
  return fs.ensureFileAsync(
    path.join(discovery.path, RELOADED_PATH, "portable.txt")
  );
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    getGameVersion: resolveGameVersion,
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
  context.registerInstaller(RELOADED_ID, 25, testModManger, installModManager);
  context.registerInstaller(RELOADEDMODLOADER_ID, 30, testReloadedLoader, installReloadedLoader);
  context.registerInstaller(RELOADEDMOD_ID, 35, testReloadedMod, installReloadedMod);

  //register actions
    context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Reloaded Mod Manager', () => {
      downloadModManagerNoCheck(context.api, gameSpec).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }); //*/
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
