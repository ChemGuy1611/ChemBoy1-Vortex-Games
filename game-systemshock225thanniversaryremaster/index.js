/*////////////////////////////////////////////////
Name: System Shock 2 (Classic AND 25th Anniversary Remaster) Vortex Extension
Structure: Basic game w/ mods folder
Author: ChemBoy1
Version: 0.4.6
Date: 2025-09-28
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const Bluebird = require('bluebird');
const fsPromises = require('fs/promises');
const child_process = require("child_process");
const winapi = require('winapi-bindings');
const fsNative = require('fs');

//Specify all the information about the game
const STEAMAPP_ID = "866570";
const STEAMAPP_ID_CLASSIC = "238210";
const GOGAPP_ID = "1448370350";
const GOGAPP_ID_CLASSIC = "1207659172";
const EPICAPP_ID = "2feb2f328922458e9f698f620fbddc13";
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const GAME_ID = "systemshock225thanniversaryremaster";
const GAME_ID_CLASSIC = 'systemshock2'
const GAME_NAME = "System Shock 2: 25th Anniversary Remaster";
const GAME_NAME_SHORT = "SS2 Remaster";
const GAME_NAME_CLASSIC = "System Shock 2 (1999)";
const GAME_NAME_SHORT_CLASSIC = "System Shock 2";
let GAME_PATH = undefined;
let GAME_PATH_CLASSIC = undefined;
let GAME_VERSION = '';
let GAME_VERSION_CLASSIC = '';
let STAGING_FOLDER = '';
let STAGING_FOLDER_CLASSIC = '';
let DOWNLOAD_FOLDER = '';
let DOWNLOAD_FOLDER_CLASSIC = '';

//Different exes for each version, use getExecutable function in context.registerGame
const EXEC_STEAM = 'hathor_Shipping_Playfab_Steam_x64.exe';
const EXEC_GOG = 'hathor_Shipping_Playfab_Galaxy_x64.exe';
const EXEC_EPIC = 'hathor_Shipping_Playfab_Epic_x64.exe'; //NOT SURE IF THIS IS CORRECT. Need a user with Epic version to confirm.
const EXEC_CLASSIC = 'SS2.exe';

//For Remaster (2025) version
const USER_HOME = util.getVortexPath('home');
const CONFIG_PATH = path.join(USER_HOME, 'Saved Games', 'Nightdive Studios', 'System Shock 2 Remastered');

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";
const ROOT_FOLDERS = ['mods', 'cutscenes'];

const MOD_ID = `${GAME_ID}-kpfmod`;
const MOD_NAME = "Mod .kpf";
const MOD_PATH = path.join('mods');
const MOD_EXT = [".kpf"];

const LEGACY_ID = `${GAME_ID}-convertedlegacy`;
const LEGACY_NAME = "Converted Legacy Mod";
const LEGACY_PATH = MOD_PATH;
const LEGACY_FOLDERS = ['obj', 'mesh', 'bitmap', 'motions', 'sq_scripts', 'sdn2', 'strings', 'iface', 'intrface', 'misdml', 'snd']; //cannot put "custscenes" here since it would conflict with Root installer
const LEGACY_EXTS = ['.dml', '.gam', '.mis'];

const REQ_FILE = 'base.kpf';

// For Classic (1999) version
const SS2TOOL_ID = `${GAME_ID_CLASSIC}-ss2tool`;
const SS2TOOL_NAME = `SS2Tool`;
const SS2TOOL_EXEC = `SS2Tool-v.6.1.1.8.exe`;
const SS2TOOL_URL = `https://www.systemshock.org/index.php?topic=4141.0`;
const SS2TOOL_URL_DIRECT = `https://www.systemshock.org/index.php?action=dlattach;topic=4141.0;attach=15728&mid=45944&sesc=1dd1fec0fa9126c5ef752f3685775d4ce5f81760`;

const BMM_ID = `${GAME_ID_CLASSIC}-bmm`;
const BMM_NAME = `Blue Mod Manager`;
const BMM_EXEC = 'ss2bmm.exe';

const EDITOR_ID = `${GAME_ID_CLASSIC}-editor`;
const EDITOR_NAME = `ShockEd`;
const EDITOR_EXEC = 'ShockEd.exe';

const CLASSIC_ID = `${GAME_ID_CLASSIC}-classicmod`;
const CLASSIC_NAME = `Classic Mod`;
const CLASSIC_PATH = path.join('DMM');
const ADDITIONAL_FOLDERS = ['custscenes'];
const CLASSIC_FOLDERS = LEGACY_FOLDERS.concat(ADDITIONAL_FOLDERS);
const CLASSIC_EXTS = LEGACY_EXTS;

const REQ_FILE_CLASSIC = EXEC_CLASSIC;

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "mergeMods": true,
    "requiresCleanup": true,
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
      EPICAPP_ID,
      GOGAPP_ID,
      //XBOXAPP_ID
    ],
    "names": []
  }
};

//Filled in from info above
const specClassic = {
  "game": {
    "id": GAME_ID_CLASSIC,
    "name": GAME_NAME_CLASSIC,
    "shortName": GAME_NAME_SHORT_CLASSIC,
    "executable": EXEC_CLASSIC,
    "logo": `${GAME_ID_CLASSIC}.jpg`,
    "modPath": '.',
    "modPathIsRelative": true,
    "mergeMods": true,
    "requiresCleanup": true,
    "requiredFiles": [
      REQ_FILE_CLASSIC,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID_CLASSIC,
      "gogAppId": GOGAPP_ID_CLASSIC,
      "supportsSymlinks": true,
      "compatibleDownloads": [GAME_ID],
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID_CLASSIC,
      "GogAPPId": GOGAPP_ID_CLASSIC,
    }
  },
  "modTypes": [
    {
      "id": CLASSIC_ID,
      "name": CLASSIC_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${CLASSIC_PATH}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID_CLASSIC,
      GOGAPP_ID_CLASSIC,
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
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Set mod path
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
  if (store === 'epic') {
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

const getDiscoveryPath = (api, gameSpec) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, gameSpec.game.id], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// DOWNLOADER FUNCTIONS ///////////////////////////////////////////////////

//* Repeatable code for browse-to-download regular archives and installers, and then executing installers from the appropriate location (staging (if zipped) or downloads (if not zipped))
async function browseForDownloadFunction(api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  //const dlInfo = {game: gameSpec.game.id, name: MOD_NAME};
  const dlInfo = {
    game: gameSpec.game.id,
    name: MOD_NAME,
  };

  if (!isInstalled && isArchive && isInstaller && !isElevated) { // mod is not installed, is an archive, and has an installer exe in the archive that does not require elevation. Must launch from staging folder after extraction (need to know exact folder name STAGING_PATH)
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.ProcessCanceled('Selected wrong download'));
        }
        return Promise.resolve(result);
      })
      .catch((err) => {
        return reject(err);
      })
      .then((result) => {
        api.events.emit('start-download', result, dlInfo, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(gameSpec.game.id, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              try {
                const RUN_PATH = path.join(STAGING_FOLDER, STAGING_PATH, INSTALLER);
                child_process.spawnSync( //run installer from staging folder
                  RUN_PATH,
                  []
                );
                log('warn', `${MOD_NAME} installer started from staging folder`);
              } catch (err) {
                log('error', `Running ${MOD_NAME} installer from staging folder failed: ${err}`);
              }
              return resolve();
            });
          },
          'never',
          { allowInstall: false },
        );
      })
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please try again.`, err, { allowReport: false });
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from the opened page..`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    })
  } 

  if (!isInstalled && isArchive && isInstaller && isElevated) { // mod is not installed, is an archive, and has an installer exe in the archive that requires elevation. Must launch from staging folder after extraction (need to know exact folder name STAGING_PATH)
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        /*if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.ProcessCanceled('Selected wrong download'));
        } //*/
        return Promise.resolve(result);
      })
      .catch((err) => {
        return reject(err);
      })
      .then((result) => {
        api.events.emit('start-download', result, dlInfo, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(gameSpec.game.id, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              try { //run installer from staging folder with elevation
                const RUN_PATH = path.join(STAGING_FOLDER, STAGING_PATH, INSTALLER);
                api.runExecutable(RUN_PATH, [], { suggestDeploy: false });
                log('warn', `${MOD_NAME} installer started from staging folder`);
              } catch (err) {
                log('error', `Running ${MOD_NAME} installer from staging folder failed: ${err}`);
              }
              return resolve();
            });
          },
          'never',
          { allowInstall: false },
        );
      })
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please try again.`, err, { allowReport: false });
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from the opened page..`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    })
  } 

  if (!isInstalled && !isArchive && isInstaller && !isElevated) { // mod is not installed, is NOT an archive, and is an installer exe that does not require elevation. Can launch from Downloads folder
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        /*if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.ProcessCanceled('Selected wrong download'));
        } //*/
        return Promise.resolve(result);
      })
      .catch((err) => {
        return reject(err);
      })
      .then((result) => {
        api.events.emit('start-download', result, dlInfo, undefined,
          async (error, id) => { //callback function to check for errors and then run installer from downloads folder
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            try {
              const RUN_PATH = path.join(DOWNLOAD_FOLDER, INSTALLER);
              child_process.spawnSync( //run installer from downloads folder
                RUN_PATH,
                []
              );
              log('warn', `${MOD_NAME} installer started from downloads folder`);
            } catch (err) {
              log('error', `Running ${MOD_NAME} installer frown downloads folder failed: ${err}`);
            }
            return resolve();
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please re-launch Vortex and try again.`, err, { allowReport: false });
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from the opened page.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }

  if (!isInstalled && !isArchive && isInstaller && isElevated) { // mod is not installed, is NOT an archive, and is an installer exe that requires elevation. Can launch from Downloads folder
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        /*if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.ProcessCanceled('Selected wrong download'));
        } //*/
        return Promise.resolve(result);
      })
      .catch((err) => {
        return reject(err);
      })
      .then((result) => {
        api.events.emit('start-download', result, dlInfo, undefined,
          async (error, id) => { //callback function to check for errors and then run installer from downloads folder
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            try { //run installer from downloads folder with elevation
              const RUN_PATH = path.join(DOWNLOAD_FOLDER, INSTALLER);
              api.runExecutable(RUN_PATH, [], { suggestDeploy: false });
              log('warn', `${MOD_NAME} installer started from downloads folder`);
            } catch (err) {
              log('error', `Running ${MOD_NAME} installer frown downloads folder failed: ${err}`);
            }
            return resolve();
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please re-launch Vortex and try again.`, err, { allowReport: false });
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from the opened page.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }

  if (!isInstalled && isArchive && !isInstaller) { // mod is not installed, is an archive, and has no installer. Install normally as a mod in Vortex
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        /*if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.ProcessCanceled('Selected wrong download'));
        } //*/
        return Promise.resolve(result);
      })
      .catch((err) => {
        return reject(err);
      })
      .then((result) => {
        api.events.emit('start-download', result, dlInfo, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(gameSpec.game.id, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              return resolve();
            });
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please try again.`, err, { allowReport: false });
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from the opened page.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }
} //*/

//Check if SS2Tool is installed
function isSS2ToolInstalled(api, gameSpec) {
  GAME_PATH = getDiscoveryPath(api, gameSpec);
  try {
    fs.statSync(path.join(GAME_PATH, BMM_EXEC));
    return true;
  } catch (err) {
    return false;
  }
}

//* Function to have user browse to download RS_ASIO
async function downloadSS2Tool(api, gameSpec) {
  let isInstalled = isSS2ToolInstalled(api, gameSpec);
  const URL = SS2TOOL_URL;
  const MOD_NAME = SS2TOOL_NAME;
  const MOD_TYPE = SS2TOOL_ID;
  const INSTALLER = SS2TOOL_EXEC;
  const STAGING_PATH = '';
  const isArchive = false;
  const isInstaller = true;
  const isElevated = false;
  const ARCHIVE_NAME = SS2TOOL_EXEC;
  const instructions = api.translate(`1. Click on Continue below to open the browser.\n`
    + `2. Navigate to the latest version of ${MOD_NAME} on the site.\n`
    + `3. Click on the appropriate file to download and install the mod.\n`
  );
  await browseForDownloadFunction(api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated);
}

// REMASTER MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

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

//Test for legacy SS2 mod files (to convert)
function testLegacy(files, gameId) {
  const isMod = files.some(file => LEGACY_FOLDERS.includes(path.basename(file).toLowerCase()));
  const isExt = files.some(file => LEGACY_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && (isMod || isExt);

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

//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

//Success notifications
function convertSuccessNotify(api, name, file) {
  const NOTIF_ID = `${GAME_ID}-legacyconvertsuccess`;
  const MESSAGE = `Successfully converted legacy SS2 Mod "${name}" to .kpf format - found folder "${path.basename(file)}".`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'success',
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}

async function asyncForEachCopy(relPaths, destinationPath, rootPath) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.copyAsync(path.join(destinationPath, rootPath, relPaths[index]), path.join(destinationPath, relPaths[index]));
  }
}

//Install legacy SS2 mod files
async function installLegacy(files, destinationPath) {
//async function installLegacy(files, destinationPath, api) {
  const setModTypeInstruction = { type: 'setmodtype', value: LEGACY_ID };
  let modFile = files.find(file => LEGACY_FOLDERS.includes(path.basename(file).toLowerCase()));
  if (modFile === undefined) {
    modFile = files.find(file => LEGACY_EXTS.includes(path.extname(file).toLowerCase()));
  }
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  let rootPath = path.dirname(modFile);
  if (rootPath === '.') {
    rootPath = '';
  }
  const szip = new util.SevenZip();
  const MOD_NAME = path.basename(destinationPath, '.installing');
  const MOD_NAME_TRIMMED = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  const MOD_NAME_TRUNCATED = truncateString(MOD_NAME_TRIMMED, 29);
  const archiveName = MOD_NAME_TRUNCATED + '.zip';
  const convertName = MOD_NAME_TRUNCATED + '.kpf';
  const archivePath = path.join(destinationPath, archiveName);
  const convertPath = path.join(destinationPath, convertName);
  const relPaths = await fs.readdirAsync(path.join(destinationPath, rootPath));
  if (rootPath !== '') {
    try {
      await asyncForEachCopy(relPaths, destinationPath, rootPath);
      await fsPromises.rmdir(path.join(destinationPath, rootPath), { recursive: true });
    } catch (err) {
      log('error', `Failed to convert legacy SS2 mod files to .kpf format: ${err}`);
    }
  }
  await szip.add(archivePath, relPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] }); //*/
  await fs.renameAsync (archivePath, convertPath); //rename archive from .zip to .kpf extension
  //convertSuccessNotify(api, MOD_NAME, modFile);
  const instructions = [{
    type: 'copy',
    source: convertName,
    destination: path.basename(convertPath),
  }];
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
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
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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

// CLASSIC MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for Classic SS2 mod files
function testClassic(files, gameId) {
  const isMod = files.some(file => CLASSIC_FOLDERS.includes(path.basename(file).toLowerCase()))
  const isExt = files.some(file => CLASSIC_EXTS.includes(path.extname(file).toLowerCase()))
  let supported = (gameId === specClassic.game.id) && (isMod || isExt);

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

function truncateString(str, num) {
  return str.length > num ? str.slice(0, num) : str;
}

//* Install classic SS2 mod files (to folders)
function installClassic(files, fileName) {
  let modFile = files.find(file => CLASSIC_FOLDERS.includes(path.basename(file).toLowerCase()));
  let idx = 0;
  if (modFile !== undefined) {
    idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  }
  if (modFile === undefined) {
    modFile = files.find(file => CLASSIC_EXTS.includes(path.extname(file).toLowerCase()));
    idx = modFile.indexOf(path.basename(modFile));
  }
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CLASSIC_ID };

  const MOD_NAME = path.basename(fileName, '.installing');
  const MOD_NAME_TRIMMED = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  const MOD_NAME_TRUNCATED = truncateString(MOD_NAME_TRIMMED, 29);
  let MOD_FOLDER = MOD_NAME_TRUNCATED;
  
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => (
    (file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))
  ));
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
} //*/

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Get correct executable for game registration
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

//Get game store version based on which executable is in the game folder
function getVersion(api, gameSpec) {
  GAME_PATH = getDiscoveryPath(api, gameSpec);
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(GAME_PATH, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_STEAM)) {
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  };
  if (isCorrectExec(EXEC_GOG)) {
    GAME_VERSION = 'gog';
    return GAME_VERSION;
  };
  if (isCorrectExec(EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    return GAME_VERSION;
  };
  return;
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  GAME_VERSION = getVersion(api, gameSpec);
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  return fs.ensureDirWritableAsync(path.join(GAME_PATH, MOD_PATH));
}

//Setup function
async function setupClassic(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH_CLASSIC = discovery.path;
  STAGING_FOLDER_CLASSIC = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER_CLASSIC = selectors.downloadPathForGame(state, gameSpec.game.id);
  await downloadSS2Tool(api, gameSpec);
  const SS2TOOL_RUNPATH = path.join(GAME_PATH_CLASSIC, SS2TOOL_EXEC);
  const SS2TOOL_SOURCEPATH = path.join(DOWNLOAD_FOLDER_CLASSIC, SS2TOOL_EXEC);
  try {
    fs.statSync(SS2TOOL_RUNPATH);
  } catch (err) {
    try {
      fs.statSync(SS2TOOL_SOURCEPATH);
      await fs.copyAsync(SS2TOOL_SOURCEPATH, SS2TOOL_RUNPATH);
      log('warn', `Suucessfully copied SS2Tool from "${DOWNLOAD_FOLDER_CLASSIC}" to "${SS2TOOL_RUNPATH}"`);
    } catch (err) {
      log('error', `Failed to copy SS2Tool from "${DOWNLOAD_FOLDER_CLASSIC}" to "${SS2TOOL_RUNPATH}": ${err}`);
    }
  }
  return fs.ensureDirWritableAsync(path.join(GAME_PATH_CLASSIC, CLASSIC_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec), //setup function
    executable: getExecutable,
    supportedTools: [
      {
        id: `${GAME_ID}-customlaunch`,
        name: `Custom Launch`,
        logo: `exec.png`,
        executable: getExecutable,
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
  //context.registerInstaller(LEGACY_ID, 27, toBlue(testLegacy), (files, destinationPath) => toBlue(installLegacy(files, destinationPath, context.api))); //with api passed in for notifications
  context.registerInstaller(`${ROOT_ID}folder`, 29, testRootFolder, installRootFolder);
  context.registerInstaller(ROOT_ID, 31, testRoot, installRoot); //fallback to root folder

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config/Save Folder', () => {
    const openPath = CONFIG_PATH;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === gameSpec.game.id;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === gameSpec.game.id;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    const openPath = DOWNLOAD_FOLDER;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === gameSpec.game.id;
  });
}

//Let Vortex know about the game
function applyGameClassic(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setupClassic(discovery, context.api, gameSpec), //setup function
    executable: () => gameSpec.game.executable,
    supportedTools: [
      {
        id: `${GAME_ID_CLASSIC}-customlaunch`,
        name: `Custom Launch`,
        logo: `exec.png`,
        executable: () => gameSpec.game.executable,
        requiredFiles: [gameSpec.game.executable],
        detach: true,
        relative: true,
        exclusive: true,
        shell: true,
        parameters: []
      }, //*/
      {
        id: BMM_ID,
        name: BMM_NAME,
        logo: `bmm.png`,
        executable: () => BMM_EXEC,
        requiredFiles: [BMM_EXEC],
        detach: true,
        relative: true,
        exclusive: true,
        shell: false,
        defaultPrimary: true,
        parameters: []
      }, //*/
      {
        id: SS2TOOL_ID,
        name: SS2TOOL_NAME,
        logo: `ss2tool.png`,
        //queryPath: () => path.join(DOWNLOAD_FOLDER_CLASSIC, SS2TOOL_EXEC),
        executable: () => SS2TOOL_EXEC,
        requiredFiles: [SS2TOOL_EXEC],
        detach: true,
        relative: true,
        exclusive: true,
        shell: false,
        parameters: []
      }, //*/
      {
        id: EDITOR_ID,
        name: EDITOR_NAME,
        logo: `editor.png`,
        executable: () => EDITOR_EXEC,
        requiredFiles: [EDITOR_EXEC],
        detach: true,
        relative: true,
        exclusive: true,
        shell: false,
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
  context.registerInstaller(CLASSIC_ID, 33, toBlue(testClassic), toBlue(installClassic)); //fallback to root folder

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download and/or Run SS2Tool', () => {
    downloadSS2Tool(context.api, gameSpec);
    GAME_PATH_CLASSIC = getDiscoveryPath(context.api, gameSpec);
    DOWNLOAD_FOLDER_CLASSIC = selectors.downloadPathForGame(context.api.getState(), gameSpec.game.id);
    const SS2TOOL_RUNPATH = path.join(GAME_PATH_CLASSIC, SS2TOOL_EXEC);
    const SS2TOOL_SOURCEPATH = path.join(DOWNLOAD_FOLDER_CLASSIC, SS2TOOL_EXEC);
    try {
      fs.statSync(SS2TOOL_RUNPATH);
      context.api.runExecutable(SS2TOOL_RUNPATH, [], { suggestDeploy: false });
    } catch (err) {
      try {
        fs.statSync(SS2TOOL_SOURCEPATH);
        fs.copyAsync(SS2TOOL_SOURCEPATH, SS2TOOL_RUNPATH);
        context.api.runExecutable(SS2TOOL_RUNPATH, [], { suggestDeploy: false });
      } catch (err) {
        context.api.showErrorNotification('Failed to run SS2Tool.', err, { allowReport: false });
      }
    }
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === gameSpec.game.id;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === gameSpec.game.id;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    const openPath = DOWNLOAD_FOLDER_CLASSIC;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === gameSpec.game.id;
  });
}

//main function
function main(context) {
  applyGame(context, spec);
  applyGameClassic(context, specClassic);
  context.once(() => { // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
