/*
Name: Indiana Jones and the Great Circle Vortex Extension
Structure: Basic Game (with Xbox) - Future Mod Injector
Author: ChemBoy1
Version: 0.1.1
Date: 12/18/2024
*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const Bluebird = require('bluebird');

//Specify all the information about the game
const STEAMAPP_ID = "2677660";
const EPICAPP_ID = null;
const GOGAPP_ID = "";
const XBOXAPP_ID = "BethesdaSoftworks.ProjectRelic"; // <Identity Name="" in the appxmanifest.xml file
const XBOXEXECNAME = "Game"; // <Application id="" in the appxmanifest.xml file
const GAME_ID = "indianajonesandthegreatcircle";
const EXEC = "TheGreatCircle.exe";

//Info for mod types and installers
const BINARIES_ID = `${GAME_ID}-binaries`;

//let USERID_FOLDER = "";
const USER_DOCS = util.getVortexPath("home");
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_PATH = path.join(USER_DOCS, 'Saved Games', "MachineGames", "TheGreatCircle", "base");
const CONFIG_EXTS = ['.local', '.cfg'];

const SOUND_ID = `${GAME_ID}-sounds`;
const SOUND_PATH = path.join('base', 'sound', 'soundbanks', 'pc');
const SOUND_EXTS = [".pack", ".bnk"];

const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");
const SAVE_ID = `${GAME_ID}-saves`;
const SAVE_PATH = path.join(ROAMINGAPPDATA, 'GSE Saves', STEAMAPP_ID, "remote", 'GAME-SLOT0');
//const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, 'Packages', `${XBOXAPP_ID}_3275kfvn8vcwc`, "SystemAppData", "wgs"); //XBOX Version
const SAVE_EXT = ".dat";

const INJECTOR_ID = `${GAME_ID}-modinjector`;
const INJECTOR_FILE = 'indianajonesmodmanager.exe';
const INJECTOR_URL = 'google.com';
const INJECTOR_ERROR_URL = 'google.com';

const spec = {
  "game": {
    "id": GAME_ID,
    "name": "Indiana Jones and the Great Circle",
    "shortName": "Indiana Jones ATGC",
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
      //"epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "nexusPageId": GAME_ID
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      //"EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": SOUND_ID,
      "name": "Sounds",
      "priority": "high",
      "targetPath": `{gamePath}\\${SOUND_PATH}`
    },
    {
      "id": BINARIES_ID,
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": INJECTOR_ID,
      "name": "Mod Injector",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": CONFIG_ID,
      "name": "Config (Saved Games)",
      "priority": "high",
      "targetPath": CONFIG_PATH
    },
    {
      "id": SAVE_ID,
      "name": "Save (Steam)",
      "priority": "high",
      "targetPath": SAVE_PATH
    },

  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
      //GOGAPP_ID,
      XBOXAPP_ID
    ],
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: `${GAME_ID}-customlaunch`,
    name: "Custom Launch",
    logo: "indiana.png",
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //defaultPrimary: true,
    //isPrimary: true,
    parameters: ['+com_skipIntroVideo 1 +r_swapInterval 6']
  },
  {
    id: `${GAME_ID}-modinjector`,
    name: "Indiana Jones Mod Injector",
    logo: "indiana.png",
    executable: () => INJECTOR_FILE,
    requiredFiles: [INJECTOR_FILE],
    detach: true,
    relative: true,
    exclusive: true,
    //defaultPrimary: true,
    //isPrimary: true,
    parameters: []
  },
];

//set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with correct folder paths
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
  //*/

  if (game.gameStoreId === "xbox") {
    return {
      launcher: "xbox",
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    };
  }

  return undefined;
}

//Check if mod injector is installed
function isModInjectorInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === INJECTOR_ID);
}

//Function to auto-download Mod Loader
async function downloadModInjector(api, gameSpec) {
  let isInstalled = isModInjectorInstalled(api, gameSpec);

  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = 'Indiana Jones Mod Injector'
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    
    //Download the mod
    try {
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const URL = INJECTOR_URL;
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
        actions.setModType(gameSpec.game.id, modId, INJECTOR_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download/install process fails
    } catch (err) {
      const errPage = INJECTOR_ERROR_URL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}. You must download manually.`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//test for zips
async function testZipContent(files, gameId) {
  const isInjector = files.some(file => path.basename(file).toLocaleLowerCase() === INJECTOR_FILE);
  return Promise.resolve({
    supported: (gameId === spec.game.id) && !isInjector,
    requiredFiles: []
  });
}

//Install zips
async function installZipContent(files, destinationPath) {
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

//Test for config files
function testConfig(files, gameId) {
  const isMod = files.some(file => CONFIG_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install config files
function installConfig(files) {
  const modFile = files.find(file => CONFIG_EXTS.includes(path.extname(file).toLowerCase()));
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

//Test for sound files
function testSound(files, gameId) {
  const isMod = files.some(file => SOUND_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install sound files
function installSound(files) {
  const modFile = files.find(file => SOUND_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SOUND_ID };

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

//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

//Setup function
async function setup(discovery, api, gameSpec) {
  //await downloadModInjector(api, gameSpec);
  await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(SAVE_PATH);
  return fs.ensureDirWritableAsync(path.join(discovery.path, SOUND_PATH));
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
  //context.registerInstaller(INJECTOR_ID, 25, testInjector, installInjector);
  context.registerInstaller(CONFIG_ID, 30, testConfig, installConfig);
  context.registerInstaller(SAVE_ID, 35, testSave, installSave);
  context.registerInstaller(SOUND_ID, 40, testSound, installSound);
  //context.registerInstaller(`${GAME_ID}-zip-mod`, 45, toBlue(testZipContent), toBlue(installZipContent));
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
