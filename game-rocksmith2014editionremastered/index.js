/*/////////////////////////////////////////////////////////
Name: Rocksmith 2014 Edition REMASTERED Vortex Extension
Structure: Basic Game with Tools & Launchers
Author: ChemBoy1
Version: 0.2.1
Date: 2025-10-21
/////////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const child_process = require("child_process");
const winapi = require('winapi-bindings');

//Specify all information about the game
const STEAMAPP_ID = "221680";
const GAME_ID = "rocksmith2014editionremastered";
const GAME_NAME = "Rocksmith 2014 Edition REMASTERED";
const GAME_NAME_SHORT = "Rocksmith 2014";
const MOD_PATH_DEFAULT = ".";
const EXEC = "Rocksmith2014.exe";
const requiredFiles = [EXEC];
let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Information for installers, modtypes, and tools
const RSMODS_ID = `${GAME_ID}-rsmods`;
const RSMODS_NAME = "RSMods";
const RSMODS_EXEC = "rsmods.exe";
const RSMODS_FILE = "xinput1_3.dll";
const RSMODS_PATH = path.join("RSMods");
const RSMODS_INSTALLER = "RS2014-Mod-Installer.exe";
const RSMODS_IS_ARCHIVE = false;
const RSMODS_IS_INSTALLER = true;
const RSMODS_IS_ELEVATED = false;
const RSMODS_DLFILE_STRING = "rs2014-mod";
const RSMODS_URL = "https://github.com/Lovrom8/RSMods/releases";

const CDLC_ID = `${GAME_ID}-cdlc`;
const CDLC_NAME = "CDLC Enabler";
const CDLC_FILE = "d3dx9_42.dll";
const CDLC_INSTALLER = "RS2014-CDLC-Installer.exe";
const CDLC_IS_ARCHIVE = false;
const CDLC_IS_INSTALLER = true;
const CDLC_IS_ELEVATED = false;
const CDLC_DLFILE_STRING = "rs2014-cdlc";
const CDLC_URL = "https://ignition4.customsforge.com/tools/cdlcenabler";

const CFSM_ID = `${GAME_ID}-cfsm`;
const CFSM_NAME = "CustomsForge Song Manager";
const CFSM_EXEC = 'CustomsForgeSongManager.exe';
const CFSM_PATH = path.join("CustomsForgeSongManager");
const CFSM_INSTALLER = "CFSMSetup.exe";
const CFSM_IS_ARCHIVE = true;
const CFSM_IS_INSTALLER = true;
const CFSM_IS_ELEVATED = false;
const CFSM_DLFILE_STRING = "cfsm";
const CFSM_URL = "https://ignition4.customsforge.com/tools/cfsm";
//const CFSM_URL = "https://ignition4.customsforge.com/files/cfsm/Windows/CFSMSetup.rar";

const NOCABLE_ID = `${GAME_ID}-nocable`;
const NOCABLE_NAME = "NoCableLauncher";
const NOCABLE_EXEC = "nocablelauncher.exe";
const NOCABLE_IS_ARCHIVE = true
const NOCABLE_IS_INSTALLER = false;
const NOCABLE_IS_ELEVATED = false;
const NOCABLE_DLFILE_STRING = "nocablelauncher";
const NOCABLE_URL = "https://github.com/Maxx53/NoCableLauncher/releases";
const NOCABLE_PAGE_NO = 1;
const NOCABLE_FILE_NO = 1;

const RSASIO_ID = `${GAME_ID}-rsasio`;
const RSASIO_NAME = "RS ASIO";
const RSASIO_FILE = "rs_asio.dll";
const RSASIO_IS_ARCHIVE = true;
const RSASIO_IS_INSTALLER = false;
const RSASIO_IS_ELEVATED = false;
const RSASIO_DLFILE_STRING = "rs_asio";
const RSASIO_URL = "https://github.com/mdias/rs_asio/releases";

const ASIO4ALL_ID = `${GAME_ID}-asio4all`;
const ASIO4ALL_NAME = "ASIO4ALL";
const ASIO4ALL_INSTALLER = "ASIO4ALL_2_16.exe";
const ASIO4ALL_IS_ARCHIVE = false;
const ASIO4ALL_IS_INSTALLER = true;
const ASIO4ALL_IS_ELEVATED = true;
const ASIO4ALL_DLFILE_STRING = "asio4all";
const ASIO4ALL_URL = "https://asio4all.org/about/download-asio4all/";
const ASIO4ALL_REGISTRY_KEY = {
  "key": "HKEY_LOCAL_MACHINE",
  "subKey": `SOFTWARE\\WOW6432Node\\ASIO4ALL`,
  "value": ``
};

const EOF_ID = `${GAME_ID}-eof`;
const EOF_NAME = "Editor On Fire";
const EOF_EXEC = "eof.exe";
const EOF_PATH = path.join("EditorOnFire");
const EOF_IS_ARCHIVE = true;
const EOF_IS_INSTALLER = false;
const EOF_IS_ELEVATED = false;
const EOF_DLFILE_STRING = "eof";
const EOF_URL = "https://ignition4.customsforge.com/eof";

const DLCBUILDER_ID = `${GAME_ID}-dlcbuilder`;
const DLCBUILDER_NAME = "DLC Builder";
const DLCBUILDER_EXEC = 'DLCBuilder.exe';
const DLCBUILDER_PATH = path.join("Rocksmith 2014 DLC Builder");
const DLCBUILDER_INSTALLER = "dlcbuilder-win-3.4.0.exe";
const DLCBUILDER_IS_ARCHIVE = false;
const DLCBUILDER_IS_INSTALLER = true;
const DLCBUILDER_IS_ELEVATED = false;
const DLCBUILDER_DLFILE_STRING = "dlcbuilder";
const DLCBUILDER_URL = "https://github.com/iminashi/Rocksmith2014.NET/releases";

const CDLCMOD_ID = `${GAME_ID}-cdlcmod`;
const CDLCMOD_NAME = "CDLC Mod";
const CDLCMOD_PATH = path.join("dlc");
const CDLCMOD_EXT = ".psarc";
const CDLCMOD_DLFILE_STRING = "_p.psarc";
const CDLCMOD_URL = "https://ignition4.customsforge.com";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";
const ROOT_FILES = ["cache.psarc", "audio.psarc", "crowd.psarc", "etudes.psarc",
  "gears.psarc", "guitars.psarc", "session.psarc", "songs.psarc", "static.psarc", 
  "video.psarc",
];
const ROOT_FOLDERS = ['base', "dlc", 'guitarcade', 'venues'];

const REPACK_ID = `${GAME_ID}-repack`;
const REPACK_NAME = "PSARC Repack Tool";
const REPACK_EXEC = "Unpack-Repack file.PSARC for Rocksmith 2014 Edition - Remastered By Mix98TH.exe";

const SETTINGS_FILE = "Rocksmith.ini";
const RSMODS_SETTINGS_FILE = "RSMods.ini";
const NOCABLE_SETTINGS_FILE = "NCL_Settings.xml";

//This information will be filled in from the data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH_DEFAULT,
    "requiresCleanup": true,
    "modPathIsRelative": true,
    "details": {
      "steamAppId": +STEAMAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": CDLCMOD_ID,
      "name": CDLCMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', CDLCMOD_PATH)
    },
    {
      "id": NOCABLE_ID,
      "name": NOCABLE_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": RSASIO_ID,
      "name": RSASIO_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": EOF_ID,
      "name": EOF_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', EOF_PATH)
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
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: NOCABLE_ID,
    name: NOCABLE_NAME,
    logo: `nocable.png`,
    executable: () => NOCABLE_EXEC,
    requiredFiles: [NOCABLE_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    defaultPrimary: true,
    //shell: true,
    //parameters: []
  },
  {
    id: NOCABLE_ID + 'settings',
    name: NOCABLE_NAME + ' Settings',
    logo: `nocablesettings.png`,
    executable: () => NOCABLE_EXEC,
    requiredFiles: [NOCABLE_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    parameters: ['-set']
  },
  {
    id: RSMODS_ID,
    name: RSMODS_NAME,
    logo: `rsmods.png`,
    executable: () => RSMODS_EXEC,
    requiredFiles: [RSMODS_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: []
  },
  {
    id: CFSM_ID,
    name: CFSM_NAME,
    logo: `cfsm.png`,
    //executable: () => getCfsmLocation(),
    //requiredFiles: [getCfsmLocation()],
    executable: () => CFSM_EXEC,
    requiredFiles: [CFSM_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: []
  },
  {
    id: DLCBUILDER_ID,
    name: DLCBUILDER_NAME,
    logo: `dlcbuilder.png`,
    executable: () => DLCBUILDER_EXEC,
    requiredFiles: [DLCBUILDER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    ///parameters: []
  },
  {
    id: EOF_ID,
    name: EOF_NAME,
    logo: `eof.png`,
    executable: () => EOF_EXEC,
    requiredFiles: [EOF_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    ///parameters: []
  },
  {
    id: REPACK_ID,
    name: REPACK_NAME,
    logo: `repack.png`,
    executable: () => REPACK_EXEC,
    requiredFiles: [REPACK_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    ///parameters: []
  },
  //*
  {
    id: `${GAME_ID}-customlaunch`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    parameters: []
  }, //*/
];

// BASIC EXTENSIOn FUNCTIONS //////////////////////////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Convert path placeholders to actual values
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set mod path
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

async function requiresLauncher(gamePath, store) {
  if (store === 'steam') {
      return Promise.resolve({
          launcher: 'steam',
      });
  }
  return Promise.resolve(undefined);
}

//Find the game installation folder
function getCfsmLocation() {
  let PATH = null;
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      `SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\58F35625-541C-493A-A289-4B2D362DAFE0_is1`,
      'InstallLocation'
    );
    if (!instPath) {
      throw new Error('empty registry key');
    }
    log('warn', `CFSM: InstallLocation: ${instPath.value}`);
    const PATH_CLEAN = instPath.value.replace(/(\.\.\/)/g, '');
    PATH = path.join(PATH_CLEAN, CFSM_EXEC);
    //PATH = path.join(instPath.value, CFSM_EXEC);
    log('warn', `CFSM: Found CFSM Location at: ${PATH}`);
    return (PATH);
  } catch (err) {
    log('error', `CFSM: Failed to get CFSM install location: ${err}`);
    PATH = '';
    return (PATH);
  }
}

//Find the game installation folder
function registryInstallCheck(keyObj, modName) {
  try {
    const instPath = winapi.RegGetValue(keyObj.key, keyObj.subKey, keyObj.value);
    if (!instPath) {
      throw new Error('empty registry key');
    }
    log('warn', `${modName} found in the registry at: ${instPath.value}`);
    return true;
  } catch (err) {
    log('warn', `${modName} not found in the registry: ${err}`);
    return false;
  }
}

//* Repeatable code for browse-to-download regular archives and installers, and then executing installers from the appropriate location (staging (if zipped) or downloads (if not zipped))
async function browseForDownloadFunction(discovery, api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  //const dlInfo = {game: gameSpec.game.id, name: MOD_NAME};
  const dlInfo = {};

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
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
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
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
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
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
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
  log('warn', `Could not download/install ${MOD_NAME}. Cannot be downloaded with this function.`);
  return api.showErrorNotification(`${MOD_NAME} is already installed. Please remove the exisitng mod if you want to try again.`, undefined, { allowReport: false });
} //*/

// AUTOMATIC DOWNLOADERS ////////////////////////////////////////////////////////////////////////

//Check if RSMods is installed
function isRsModsInstalled(discovery, api, spec) {
  try {
    fs.statSync(path.join(discovery.path, RSMODS_FILE));
    return true;
  } catch (err) {
    return false;
  }
}
//Check if CDLC Enabler is installed
function isCdlcInstalled(discovery, api, spec) {
  try {
    fs.statSync(path.join(discovery.path, CDLC_FILE));
    return true;
  } catch (err) {
    return false;
  }
}
//Check if CFSM is installed
function isCfsmInstalled(discovery, api, spec) {
  try {
    fs.statSync(path.join(discovery.path, CFSM_PATH, CFSM_EXEC));
    return true;
  } catch (err) {
    return false;
  }
}

//Check if NoCableLauncher is installed
function isNoCableInstalled(discovery, api, spec) {
  try {
    fs.statSync(path.join(discovery.path, NOCABLE_EXEC));
    return true;
  } catch (err) {
    return false;
  }
}
//Check if RS_ASIO is installed
function isRsAsioInstalled(discovery, api, spec) {
  try {
    fs.statSync(path.join(discovery.path, RSASIO_FILE));
    return true;
  } catch (err) {
    return false;
  }
}

//Check if EOF is installed
function isEofInstalled(discovery, api, spec) {
  try {
    fs.statSync(path.join(discovery.path, EOF_PATH, EOF_EXEC));
    return true;
  } catch (err) {
    return false;
  }
}
//Check if DLC Builder is installed
function isDlcBuilderInstalled(discovery, api, spec) {
  try {
    fs.statSync(path.join(discovery.path, DLCBUILDER_PATH, DLCBUILDER_EXEC));
    return true;
  } catch (err) {
    return false;
  }
}

//Check if Asio4All is installed
function isAsio4allInstalled() {
  try {
    return registryInstallCheck(ASIO4ALL_REGISTRY_KEY, ASIO4ALL_NAME);
  } catch (err) {
    return false;
  } //*/
}

//Startup notification to download minimum required mods
async function downloadRequired(discovery, api, gameSpec) {
  let isInstalled = ( isRsModsInstalled(discovery, api, gameSpec) && isCdlcInstalled(discovery, api, gameSpec) );
  if (!isInstalled) {
    const NOTIF_ID = `${GAME_ID}-required`;
    const MOD_NAME = RSMODS_NAME + ` and ` + CDLC_NAME;
    const MESSAGE = `REQUIRED: ${MOD_NAME} Installation Required`;
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
              text: `It is required that you download and install ${MOD_NAME} to use mods with the game.\n`
                  + `Use the buttons below to open browser views to download the files and run the installers.\n`
              }, 
              [
                { label: `Install ${RSMODS_NAME}`, action: () => {
                  downloadRsMods(discovery, api, gameSpec);
                }},
                { label: `Install ${CDLC_NAME}`, action: () => {
                  downloadCdlc(discovery, api, gameSpec);
                }},
                { label: 'Done - Continue', action: () => dismiss() },
                {
                  label: 'Never Show Again', action: () => {
                    api.suppressNotification(NOTIF_ID);
                    dismiss();
                  }
                },
              ]
            );
          },
        },
      ],
    });    
  }
}

//Startup notification to download optional mods
async function downloadOptional(discovery, api, gameSpec) {
  let isInstalled = ( isCfsmInstalled(discovery, api, gameSpec) && isNoCableInstalled(discovery, api, gameSpec) && isRsAsioInstalled(discovery, api, gameSpec) && isAsio4allInstalled() );
  if (!isInstalled) {
    const NOTIF_ID = `${GAME_ID}-optional`;
    const MOD_NAME = CFSM_NAME + `, ` + NOCABLE_NAME + `, ` + RSASIO_NAME + `, and ` + ASIO4ALL_NAME + `+ Build Tools`;
    const MESSAGE = `OPTIONAL: ${MOD_NAME} Install`;
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
              text: `If you want to be able to play the game without a 1st-party Real Tone cable, OR you want to connect your guitar through a separate MIDI device:\n`
                  + `- You MUST download and install ${NOCABLE_NAME}, ${RSASIO_NAME}, and ${ASIO4ALL_NAME} to use your guitar in game.\n`
                  + `- Vortex will then launch the game through ${NOCABLE_NAME} by default.\n`
                  + `- Make sure you set up your audio interface correctly with ${ASIO4ALL_NAME} if using a separate MIDI device to connect your guitar.\n`
                  + `\n`
                  + `${CFSM_NAME}: This tool allows you to manage all your downloaded songs. Install CFSM to the game folder if you want to be able to launch it from Vortex.\n`
                  + `\n`
                  + `${ASIO4ALL_NAME}: You must launch the installer from the Vortex downloads folder to install after downloading the file. This is neessary because the installer requires administrator privileges. You can open the downloads folder using the button on the folder icon on the Mods page toolbar.\n`
                  + `\n`
                  + `Build Tools:\n`
                  + `- ${EOF_NAME}: Song Editor.\n`
                  + `- ${DLCBUILDER_NAME}: Create and share songs for CDLC.\n`
                  + `\n`
                  + `Use the buttons below to download these mods individually, if you want/need them.\n`
              }, 
              [
                { label: `Install ${CFSM_NAME}`, action: () => {
                  downloadCfsm(discovery, api, gameSpec);
                }},
                { label: `Install ${NOCABLE_NAME}`, action: () => {
                  downloadNoCable(discovery, api, gameSpec);
                }},
                { label: `Install ${RSASIO_NAME}`, action: () => {
                  downloadRsAsio(discovery, api, gameSpec);
                }},
                { label: `Install ${ASIO4ALL_NAME}`, action: () => {
                  downloadAsio4all(discovery, api, gameSpec);
                }},
                { label: `Install ${EOF_NAME}`, action: () => {
                  downloadEof(discovery, api, gameSpec);
                }},
                { label: `Install ${DLCBUILDER_NAME}`, action: () => {
                  downloadDlcBuilder(discovery, api, gameSpec);
                }},
                { label: 'Done - Continue', action: () => dismiss() },
                {
                  label: 'Never Show Again', action: () => {
                    api.suppressNotification(NOTIF_ID);
                    dismiss();
                  }
                },
              ]
            );
          },
        },
      ],
    });    
  }
}

//* Function to have user browse to download RSMods
async function downloadRsMods(discovery, api, gameSpec) {
  let isInstalled = isRsModsInstalled(discovery, api, gameSpec);
  const URL = RSMODS_URL;
  const MOD_NAME = RSMODS_NAME;
  const MOD_TYPE = RSMODS_ID;
  const INSTALLER = RSMODS_INSTALLER;
  const STAGING_PATH = '';
  const isArchive = RSMODS_IS_ARCHIVE;
  const isInstaller = RSMODS_IS_INSTALLER;
  const isElevated = RSMODS_IS_ELEVATED;
  const ARCHIVE_NAME = RSMODS_DLFILE_STRING;
  const instructions = api.translate(`1. Click on Continue below to open the browser.\n`
    + `2. Navigate to the latest version of ${MOD_NAME} on the site.\n`
    + `3. Click on the appropriate file to download and install the mod.\n`
  );
  await browseForDownloadFunction(discovery, api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated);
}

//* Function to have user browse to download CDLC Enabler
async function downloadCdlc(discovery, api, gameSpec) {
  let isInstalled = isCdlcInstalled(discovery, api, gameSpec);
  const URL = CDLC_URL;
  const MOD_NAME = CDLC_NAME;
  const MOD_TYPE = CDLC_ID;
  const INSTALLER = CDLC_INSTALLER;
  const STAGING_PATH = '';
  const isArchive = CDLC_IS_ARCHIVE;
  const isInstaller = CDLC_IS_INSTALLER;
  const isElevated = CDLC_IS_ELEVATED;
  const ARCHIVE_NAME = CDLC_DLFILE_STRING;
  const instructions = api.translate(`1. Click on Continue below to open the browser.\n`
    + `2. Navigate to the latest version of ${MOD_NAME} on the site.\n`
    + `3. Click on the appropriate file to download and install the mod.\n`
  );
  await browseForDownloadFunction(discovery, api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated);
}

//* Function to have user browse to download CFSM
async function downloadCfsm(discovery, api, gameSpec) {
  let isInstalled = isCfsmInstalled(discovery, api, gameSpec);
  const URL = CFSM_URL;
  const MOD_NAME = CFSM_NAME;
  const MOD_TYPE = CFSM_ID;
  const INSTALLER = CFSM_INSTALLER;
  const STAGING_PATH = 'CFSMSetup';
  const isArchive = CFSM_IS_ARCHIVE;
  const isInstaller = CFSM_IS_INSTALLER;
  const isElevated = CFSM_IS_ELEVATED;
  const ARCHIVE_NAME = CFSM_DLFILE_STRING;
  const instructions = api.translate(`1. Click on Continue below to open the browser.\n`
    + `2. Navigate to the latest version of ${MOD_NAME} on the site.\n`
    + `3. Click on the appropriate file to download and install the mod.\n`
  );
  await browseForDownloadFunction(discovery, api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated);
}

//* Function to auto-download NoCableLauncher from Nexus Mods
async function downloadNoCable(discovery, api, gameSpec) {
  let isInstalled = isNoCableInstalled(discovery, api, gameSpec);
  //notification indicating install process
  const MOD_NAME = NOCABLE_NAME;
  const MOD_TYPE = NOCABLE_ID;
  const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
  const PAGE_ID = NOCABLE_PAGE_NO;
  const FILE_ID = NOCABLE_FILE_NO;  //If using a specific file id because "input" below gives an error
  const GAME_DOMAIN = gameSpec.game.id;
  if (!isInstalled) {
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) { // use defined file ID if input is undefined above
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) {
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id, // set to the game's ID so that they wil not get a game selection popup. Vortex will update the metadata automatically if the mod is from another domain, such as 'site'
        name: MOD_NAME,
      };
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
  if (isInstalled) {
    return api.showErrorNotification(`${MOD_NAME} is already installed. Please remove the exisitng mod if you want to try again.`, undefined, { allowReport: false });
  }
} //*/

//* Function to have user browse to download RS_ASIO
async function downloadRsAsio(discovery, api, gameSpec) {
  let isInstalled = isRsAsioInstalled(discovery, api, gameSpec);
  const URL = RSASIO_URL;
  const MOD_NAME = RSASIO_NAME;
  const MOD_TYPE = RSASIO_ID;
  const INSTALLER = '';
  const STAGING_PATH = '';
  const isArchive = RSASIO_IS_ARCHIVE;
  const isInstaller = RSASIO_IS_INSTALLER;
  const isElevated = RSASIO_IS_ELEVATED;
  const ARCHIVE_NAME = RSASIO_DLFILE_STRING;
  const instructions = api.translate(`1. Click on Continue below to open the browser.\n`
    + `2. Navigate to the latest version of ${MOD_NAME} on the site.\n`
    + `3. Click on the appropriate file to download and install the mod.\n`
  );
  await browseForDownloadFunction(discovery, api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated);
}

//* Function to have user browse to download RS_ASIO
async function downloadAsio4all(discovery, api, gameSpec) {
  let isInstalled = isAsio4allInstalled();
  const URL = ASIO4ALL_URL;
  const MOD_NAME = ASIO4ALL_NAME;
  const MOD_TYPE = ASIO4ALL_ID;
  const INSTALLER = ASIO4ALL_INSTALLER;
  const STAGING_PATH = '';
  const isArchive = ASIO4ALL_IS_ARCHIVE;
  const isInstaller = ASIO4ALL_IS_INSTALLER;
  const isElevated = ASIO4ALL_IS_ELEVATED;
  const ARCHIVE_NAME = ASIO4ALL_DLFILE_STRING;
  const instructions = api.translate(`1. Click on Continue below to open the browser.\n`
    + `2. Navigate to the latest version of ${MOD_NAME} on the site.\n`
    + `3. Click on the appropriate file to download and install the mod.\n`
  );
  await browseForDownloadFunction(discovery, api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated);
}

//* Function to have user browse to download Editor On Fire
async function downloadEof(discovery, api, gameSpec) {
  let isInstalled = isEofInstalled(discovery, api, gameSpec);
  const URL = EOF_URL;
  const MOD_NAME = EOF_NAME;
  const MOD_TYPE = EOF_ID;
  const INSTALLER = '';
  const STAGING_PATH = '';
  const isArchive = EOF_IS_ARCHIVE;
  const isInstaller = EOF_IS_INSTALLER;
  const isElevated = EOF_IS_ELEVATED;
  const ARCHIVE_NAME = EOF_DLFILE_STRING;
  const instructions = api.translate(`1. Click on Continue below to open the browser.\n`
    + `2. Navigate to the latest version of ${MOD_NAME} on the site.\n`
    + `3. Click on the appropriate file to download and install the mod.\n`
  );
  await browseForDownloadFunction(discovery, api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated);
}

//* Function to have user browse to download DLC Builder
async function downloadDlcBuilder(discovery, api, gameSpec) {
  let isInstalled = isDlcBuilderInstalled(discovery, api, gameSpec);
  const URL = DLCBUILDER_URL;
  const MOD_NAME = DLCBUILDER_NAME;
  const MOD_TYPE = DLCBUILDER_ID;
  const INSTALLER = DLCBUILDER_INSTALLER;
  const STAGING_PATH = '';
  const isArchive = DLCBUILDER_IS_ARCHIVE;
  const isInstaller = DLCBUILDER_IS_INSTALLER;
  const isElevated = DLCBUILDER_IS_ELEVATED;
  const ARCHIVE_NAME = DLCBUILDER_DLFILE_STRING;
  const instructions = api.translate(`1. Click on Continue below to open the browser.\n`
    + `2. Navigate to the latest version of ${MOD_NAME} on the site.\n`
    + `3. Click on the appropriate file to download and install the mod.\n`
  );
  await browseForDownloadFunction(discovery, api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated);
}

//* Function to have user browse to download CDLC Songs from the catalogue
async function downloadCdlcSongs(discovery, api, gameSpec) {
  const URL = CDLCMOD_URL;
  const MOD_NAME = CDLCMOD_NAME;
  const MOD_TYPE = CDLCMOD_ID;
  const instructions = api.translate(`\n`
    + `1. Click on Continue below to open the browser.\n`
    + `2. Navigate to the songs you want and click the download button.\n`
    + `3. Vortex will install songs for you in the bakcground.\n`
    + `\n`
    + `NOTE: You will get a Vortex popup to "Create Mod" to install the songs as a mod if they are not zipped.\n`
  );

  return new Promise((resolve, reject) => { //Browse to modDB and download the mod
    /*
    return api.emitAndAwait(`do-browse`, URL, instructions, MOD_TYPE, true)
    .then(() => {
      //return resolve();
    }); //*/
    //util.doBrowse(api, URL, instructions, MOD_TYPE, true)
    util.opn(URL).catch(() => null);
    return resolve();
  })
  .catch((err) => {
    api.showErrorNotification(`Browser error`, err, { allowReport: false });
    util.opn(URL).catch(() => null);
    return Promise.reject(err);
  });
} //*/

// MOD INSTALLERS //////////////////////////////////////////////////////////////////////////////

//Installer test for mod files
function testCdlcMod(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === CDLCMOD_EXT));
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

//Installer install mod files
function installCdlcMod(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === CDLCMOD_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CDLCMOD_ID };

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

//Installer test for mod files
function testEof(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === EOF_EXEC));
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

//Installer install mod files
function installEof(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === EOF_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: EOF_ID };

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

//Installer test for mod files
function testRoot(files, gameId) {
  const isMod = files.some(file => ROOT_FILES.includes(path.basename(file).toLowerCase()));
  const isFolder = files.some(file => ROOT_FOLDERS.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && (isMod || isFolder);

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

//Installer install mod files
function installRoot(files) {
  let modFile = files.find(file => ROOT_FILES.includes(path.basename(file).toLowerCase()));
  let idx;
  if (modFile !== undefined) {
    idx = modFile.indexOf(path.basename(modFile));
  }
  if (modFile === undefined) {
    modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file).toLowerCase()));
    idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  }
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

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

// MAIN FUNCTIONS ////////////////////////////////////////////////////////////////////////

//Send notification for Reshade
function setupNotify(discovery, api, gameSpec) {
  const NOTIF_ID = `${GAME_ID}-setup`;
  const MESSAGE = 'INTRO: Install Required Mods and Download CDLC Songs';
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
            text: 'This extension is intended to be used primarily with mods that are available outside of Nexus Mods.\n'
                + 'Please follow the instructions in the other notifications to download and install the tools required and optional ones.\n'
                + `\n`
                + `You must download the required mods, ${RSMODS_NAME}, ${CDLC_NAME}, and ${CFSM_NAME} to use mods with the game.\n`
                + `The other mods are optional, but recommended.\n`
                + `\n`
                + 'You can download custom songs for CDLC at the CustomsForge site through link below.\n'
                + 'You can download CDLC Songs and any of the tools via the folder icon on the Mods page toolbar.\n'
                + `\n`
          }, [
            { label: `Download CDLC Songs`, action: () => {
              const openPath = CDLCMOD_URL;
              //util.opn(openPath).catch(() => null);
              downloadCdlcSongs(discovery, api, gameSpec);
              dismiss();
            }},
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

//Setup function
async function setup(discovery, api, gameSpec){
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  await fs.ensureDirWritableAsync(path.join(discovery.path, CDLCMOD_PATH));
  await fs.ensureDirWritableAsync(path.join(discovery.path, EOF_PATH));
  setupNotify(discovery, api, gameSpec);
  downloadRequired(discovery, api, gameSpec);
  downloadOptional(discovery, api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH_DEFAULT));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    requiredFiles,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => EXEC,
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
  context.registerInstaller(ROOT_ID, 25, testRoot, installRoot);
  context.registerInstaller(CDLCMOD_ID, 27, testCdlcMod, installCdlcMod);
  context.registerInstaller(EOF_ID, 29, testEof, installEof);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Game Settings INI', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, SETTINGS_FILE);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open RSMods Settings INI', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, RSMODS_SETTINGS_FILE);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open NoCableLauncher Settings XML', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, NOCABLE_SETTINGS_FILE);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download CDLC Songs', () => {
    const openPath = CDLCMOD_URL;
    //util.opn(openPath).catch(() => null);
    //*
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    downloadCdlcSongs(discovery, context.api, gameSpec); //*/
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download RSMods', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    downloadRsMods(discovery, context.api, gameSpec);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download CDLC Enabler', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    downloadCdlc(discovery, context.api, gameSpec);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download CustomsForge Song Manager', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    downloadCfsm(discovery, context.api, gameSpec);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download NoCableLauncher', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    downloadNoCable(discovery, context.api, gameSpec);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download RS_ASIO', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    downloadRsAsio(discovery, context.api, gameSpec);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download ASIO4ALL', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    downloadAsio4all(discovery, context.api, gameSpec);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Editor On Fire', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    downloadEof(discovery, context.api, gameSpec);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download DLC Builder', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    downloadDlcBuilder(discovery, context.api, gameSpec);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    const openPath = path.join(DOWNLOAD_FOLDER);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
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
