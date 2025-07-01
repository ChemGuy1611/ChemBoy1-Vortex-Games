/*////////////////////////////////////////////////
Name: System Shock 2: 25th Anniversary Remaster Vortex Extension
Structure: Basic game w/ mods folder
Author: ChemBoy1
Version: 0.2.1
Date: 2025-06-30
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const Bluebird = require('bluebird');
const fsPromises = require('fs/promises');

//Specify all the information about the game
const STEAMAPP_ID = "866570";
const EPICAPP_ID = "";
const GOGAPP_ID = "1448370350";
const XBOXAPP_ID = "";
const XBOXEXECNAME = "";
const GAME_ID = "systemshock225thanniversaryremaster";
const GAME_ID_CLASSIC = 'systemshock2'
const GAME_NAME = "System Shock 2: 25th Anniversary Remaster";
const GAME_NAME_SHORT = " SS2 Remaster";
let GAME_PATH = undefined;
let EXECUTABLE = undefined;
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Different exes for each version, use getExecutable function in context.registerGame
const EXEC_STEAM = 'hathor_Shipping_Playfab_Steam_x64.exe';
const EXEC_GOG = 'hathor_Shipping_Playfab_Galaxy_x64.exe';
const EXEC_EPIC = 'hathor_Shipping_Playfab_Epic_x64.exe'; //NOT SURE IF THIS IS CORRECT. Need a user with Epic version to confirm.

//Info for mod types and installers
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";
const ROOT_FOLDERS = ['mods', 'cutscenes'];

const MOD_ID = `${GAME_ID}-kpfmod`;
const MOD_NAME = "Mod .kpf";
const MOD_PATH = path.join("mods");
const MOD_EXT = [".kpf"];

const LEGACY_ID = `${GAME_ID}-convertedlegacy`;
const LEGACY_NAME = "Converted Legacy Mod";
const LEGACY_PATH = MOD_PATH;
const LEGACY_FOLDERS = ['obj', 'mesh', 'bitmap', 'motions', 'sq_scripts', 'sdn2', 'strings', 'iface', 'intrface', 'misdml', 'snd']; //cannot put "custscenes" here since it would conflict with Root installer

const REQ_FILE = 'base.kpf';

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID_CLASSIC}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
      "supportsSymlinks": true,
      "compatibleDownloads": [GAME_ID_CLASSIC],
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      //"XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MOD_PATH}`
    },
    {
      "id": LEGACY_ID,
      "name": LEGACY_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${LEGACY_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
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
  /*if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for save files
function testMod(files, gameId) {
  const isMod = files.some(file => MOD_EXT.includes(path.extname(file).toLowerCase()))
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
function installMod(files) {
  const modFile = files.find(file => MOD_EXT.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_ID };

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

//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

//Success notifications
function convertSuccessNotify(api, name) {
  const NOTIF_ID = `${GAME_ID}-folonlinksuccess`;
  const MESSAGE = `Successfully converted legacy SS2 Mod "${name}" to .kpf format.`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'success',
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}

//Test for legacy SS2 mod files
function testLegacy(files, gameId) {
  const isMod = files.some(file => LEGACY_FOLDERS.includes(path.basename(file).toLowerCase()))
  let supported = (gameId === spec.game.id) && ( isMod );

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

//Install legacy SS2 mod files
async function installLegacy(files, destinationPath) {
//async function installLegacy(api, files, destinationPath) {
  const setModTypeInstruction = { type: 'setmodtype', value: LEGACY_ID };
  /* experimental
  const szip = new util.SevenZip();
  const archiveName = path.basename(destinationPath, '.installing') + '.zip';
  const convertName = path.basename(destinationPath, '.installing') + '.kpf';
  const archivePath = path.join(destinationPath, archiveName);
  const convertPath = path.join(destinationPath, convertName);
  try {//Pack files into zip first, then change extension to .kpf
    const rootRelPaths = await fs.readdirAsync(destinationPath);
    await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
    await fs.renameAsync (archivePath, convertPath);
  } catch (err) {
    api.showErrorNotification(`Failed to convert legacy SS2 Mod: "${MOD_NAME}". You will have to repack it manually to .kpf format.`, err, { allowReport: false });
  } 
  const instructions = [{
    type: 'copy',
    source: convertName,
    destination: path.basename(convertPath),
  }];
  //*/

  const szip = new util.SevenZip();
  const archiveName = path.basename(destinationPath, '.installing') + '.kpf';
  const archivePath = path.join(destinationPath, archiveName);
  const rootRelPaths = await fs.readdirAsync(destinationPath);
  await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
  /* IMPROVEMENT - index the files on the folder names to remove any extraneous top level folders
  const rootRelPaths = await fsPromises.readdir(destinationPath, { recursive: true });
  const modFile = rootRelPaths.find(file => LEGACY_FOLDERS.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
  await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath.substr(idx))), { raw: ['-r'] }); //*/

  const instructions = [{
    type: 'copy',
    source: archiveName,
    destination: path.basename(archivePath),
  }];
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
    //.then(() => convertSuccessNotify(api, path.basename(destinationPath, '.installing')));
    //.then(() => log(`Successfully converted legacy mod "${path.basename(destinationPath, '.installing')}" to .kpf format`));
}

//Test for save files
function testRootFolder(files, gameId) {
  const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file).toLowerCase()))
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
function installRootFolder(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

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

//Test for fallback binaries installer
function testRoot(files, gameId) {
  let supported = (gameId === spec.game.id);

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

//Install fallback binaries installer
function installRoot(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };
  
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Get correct executable, add to required files, set paths for mod types
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
  if (isCorrectExec(EXEC_STEAM)) {
    GAME_VERSION = 'steam';
    return EXEC_STEAM;
  };
  if (isCorrectExec(EXEC_GOG)) {
    GAME_VERSION = 'gog';
    return EXEC_GOG;
  };
  if (isCorrectExec(EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    return EXEC_EPIC;
  };
  return EXEC_STEAM;
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  //EXECUTABLE = getExecutable(GAME_PATH); //also sets GAME_VERSION
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: getExecutable,
    supportedTools: [
      {
        id: `${GAME_ID}-customlaunch`,
        name: `Custom Launch`,
        logo: `exec.png`,
        executable: (discoveryPath) => getExecutable(discoveryPath),
        requiredFiles: [],
        detach: true,
        relative: true,
        exclusive: true,
        shell: true,
        parameters: []
      }, //*/
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
  context.registerInstaller(MOD_ID, 25, testMod, installMod);
  context.registerInstaller(LEGACY_ID, 27, toBlue(testLegacy), toBlue(installLegacy));
  //context.registerInstaller(LEGACY_ID, 27, toBlue(testLegacy), (files, destinationPath) => toBlue(installLegacy(context.api, files, destinationPath)));
  context.registerInstaller(`${ROOT_ID}folder`, 29, testRootFolder, installRootFolder);
  context.registerInstaller(ROOT_ID, 31, testRoot, installRoot); //fallback to root folder

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
  context.once(() => { // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
