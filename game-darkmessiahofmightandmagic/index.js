/*//////////////////////////////////////////////////////
Name: Dark Messiah of Might & Magic Vortex Extension
Structure: Basic (Launcher)
Author: ChemBoy1
Version: 0.2.3
Date: 2025-11-18
//////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const GAME_ID = "darkmessiahofmightandmagic";
const STEAMAPP_ID = "2100";
const GAME_NAME = "Dark Messiah \tof Might & Magic";
const GAME_NAME_SHORT = "Dark Messiah MM";

const EXEC = "mm.exe";
const ROOT_FOLDER = "mm";

let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//info for modtypes, tools, and actions
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = `Root Folder`;
const ROOT_FOLDERS = ['_mods']; // Cannot use 'bin' because that would conflict with some Launcher Mods

const DATA_ID = `${GAME_ID}-data`;
const DATA_NAME = `Game Data Folder`;
const DATA_FILE = ROOT_FOLDER;

const DATASUB_ID = `${GAME_ID}-datasub`;
const DATASUB_NAME = `Data Subfolder`;
const DATASUB_PATH = ROOT_FOLDER;
const MATL_FOLDER = 'materials';
const MAPS_FOLDER = 'maps';
const SAVE_FOLDER = 'SAVE';
const DATASUB_FOLDERS = [MATL_FOLDER, MAPS_FOLDER, 'bin', 'cfg', 'media', 'resource', 'scripts', SAVE_FOLDER];
const DATASUB_FILE = `gameinfo.txt`;

const MATERIALS_SUB_ID = `${GAME_ID}-materialssub`;
const MATERIALS_SUB_NAME = `Materials Subfolder`;
const MATERIALS_SUB_PATH = path.join(ROOT_FOLDER, MATL_FOLDER);
const MATERIALS_SUB_FOLDERS = ['models', 'fx', 'sprites', 'cloth', 'console', 'correction', 'decals', 'detail', 'effects', 'engine', 'envcubemaps', 'generic', 'hud', 'nature', 'overlays', 'sun', 'vgui', 'voice'];

const VPK_ID = `${GAME_ID}-vpk`;
const VPK_NAME = `VPK Files`;
const VPK_FOLDER = "vpks";
const VPK_PATH = VPK_FOLDER;
const VPK_EXT = `.vpk`;

const MAPS_ID = `${GAME_ID}-maps`;
const MAPS_NAME = `Maps (.bsp)`;
const MAPS_PATH = path.join(ROOT_FOLDER, MAPS_FOLDER);
const MAPS_EXT = `.bsp`;

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = `Save`;
const SAVE_PATH = path.join(ROOT_FOLDER, SAVE_FOLDER);
const SAVE_EXT = `.sav`;

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = `Config`;
const CONFIG_PATH = path.join(ROOT_FOLDER, 'cfg');
const CONFIG_FILE = 'config.cfg';
const CONFIG_FILES = [CONFIG_FILE];
const CONFIG_EXTS = ['.cfg'];

const LAUNCHER_ID = `${GAME_ID}-launcher`;
const LAUNCHER_NAME = `wiltOS Mod Launcher`;
const LAUNCHER_EXEC = EXEC;

const LAUNCHERMOD_ID = `${GAME_ID}-launchermod`;
const LAUNCHERMOD_NAME = `Launcher Mod`;
const LAUNCHERMOD_PATH = `_mods`;
const LAUNCHERMOD_FILE = `info.json`;
const UNLIMITED_FILE = `unlimited_edition`;

const H_RES = "2560";
const V_RES = "1440";

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '-novid';
const PARAMETERS = [PARAMETERS_STRING];
const PARAMETERS_STRING_RTX = `-tempcontent -novid -dev -windowed -w ${H_RES} -h ${V_RES} -dxlevel 70 +mat_dxlevel 70 +mat_softwarelighting 0 +sv_cheats 1 +r_frustumcullworld 0 +r_3dsky 0 +mat_drawwater 0 +map_background none +r_portalsopenall 1 +mat_very_high_texture 1 +mat_picmip 0`;
const PARAMETERS_RTX = [PARAMETERS_STRING_RTX];

const IGNORE_CONFLICTS = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'CHANGELOG.md'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
let MODTYPE_FOLDER = [LAUNCHERMOD_PATH, MATERIALS_SUB_PATH, MAPS_PATH, SAVE_PATH, VPK_PATH];

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
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
      "id": DATA_ID,
      "name": DATA_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": DATASUB_ID,
      "name": DATASUB_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', DATASUB_PATH)
    },
    {
      "id": MATERIALS_SUB_ID,
      "name": MATERIALS_SUB_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MATERIALS_SUB_PATH)
    },
    {
      "id": VPK_ID,
      "name": VPK_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', VPK_PATH)
    },
    {
      "id": MAPS_ID,
      "name": MAPS_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MAPS_PATH)
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', SAVE_PATH)
    },
    { 
      "id": CONFIG_ID,
      "name": CONFIG_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', CONFIG_PATH)
    },
    {
      "id": LAUNCHERMOD_ID,
      "name": LAUNCHERMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', LAUNCHERMOD_PATH)
    },
    {
      "id": LAUNCHER_ID,
      "name": LAUNCHER_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
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
    id: "LaunchGame",
    name: "Launch Game",
    logo: "exec.png",
    executable: () => LAUNCHER_EXEC,
    requiredFiles: [LAUNCHER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    defaultPrimary: true,
    parameters: PARAMETERS,
  },
  {
    id: "RTX Remix Launch",
    name: "RTX Remix Launch",
    logo: "rtxremix_logo.png",
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    parameters: PARAMETERS_RTX,
  },
];

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
  return Promise.resolve(undefined);
}

const getDiscoveryPath = (api) => { //get the game's discovered path
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) { //useful to clear out mods prior to doing some action
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) { //useful to deploy mods after doing some action
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// DOWNLOAD MOD FUNCTIONS //////////////////////////////////////////////////////////////////////////////////////////////

//Check if mod injector is installed
function isLauncherInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LAUNCHER_ID);
}

//* Function to have user browse to download Mod Launcher from modDB
async function downloadLauncher(api, gameSpec) {
  let isInstalled = isLauncherInstalled(api, gameSpec);
  const URL = "https://www.moddb.com/games/dark-messiah-of-might-magic/downloads";
  const MOD_NAME = "wiltOS Mod Launcher";
  const ARCHIVE_NAME = "wos_dm_modlauncher";
  const instructions = api.translate(`Once you allow Vortex to browse to modDB - `
    + `Navigate to the latest version of the ${MOD_NAME} in the Files list`
    + `and click on "Download Now" button to download and install the mod.`
  );

  if (!isInstalled) {
    //*
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.ProcessCanceled('Selected wrong download'));
        }
        return Promise.resolve(result);
      })
      .catch((error) => {
        return reject(error);
      })
      .then((result) => {
        const dlInfo = {game: gameSpec.game.id, name: MOD_NAME};
        api.events.emit('start-download', result, {}, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            //log('error', `result: ${result}`);
            //log('error', `error: ${error}`);
            //log('error', `id: ${id}`);
            //const FILE_NAME = error.fileName;
            //const downloads = api.getState().persistent.downloads.files;
            //id = Object.keys(downloads).find(iter => downloads[iter].localPath === FILE_NAME);
            //id = Object.keys(downloads).find(iter => downloads[iter].localPath.includes(ARCHIVE_NAME));
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              // Do something with the completed download/installation
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], LAUNCHER_ID), // Set the mod type
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
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please re-launch Vortex and try again.`, err, { allowReport: false });
        //util.opn(URL).catch(() => null);
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from modDB at the opened paged and install the zip in Vortex.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
    //*/
  }
}

/* Function to auto-download Mod Launcher from modDB
async function downloadLauncher(api, gameSpec) {
  let isInstalled = isLauncherInstalled(api, gameSpec);

  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = "wiltOS Mod Launcher";
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
    const DOWNLOAD_URL = "https://www.moddb.com/downloads/start/277806";
    const MANUAL_URL = "https://www.moddb.com/games/dark-messiah-of-might-magic/downloads/wos-dark-messiah-mod-launcher-r0-926";
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
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
      const nxmUrl = DOWNLOAD_URL;
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
        actions.setModType(gameSpec.game.id, modId, LAUNCHER_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = MANUAL_URL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}
//*/

// MOD INSTALLER FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Installer test for WiltOS Mod Launcher files
function testLauncher(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LAUNCHER_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install WiltOS Mod Launcher files
function installLauncher(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LAUNCHER_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LAUNCHER_ID };

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

//Installer test for Unlimited mod files
function testUnlimited(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === UNLIMITED_FILE));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Unlimited mod files
function installUnlimited(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === UNLIMITED_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LAUNCHERMOD_ID };

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

//Installer test for Materials subfolders
function testRoot(files, gameId) {
  const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file)));
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

//Installer install Materials subfolders
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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


//Installer test for wiltOS Mod Launcher mod files
function testLauncherMod(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === LAUNCHERMOD_FILE));
  let supported = (gameId === GAME_ID) && isMod;

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

//Installer install wiltOS Mod Launcher mod  files
function installLauncherMod(files, fileName) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === LAUNCHERMOD_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LAUNCHERMOD_ID};
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = path.basename(rootPath);
  if (MOD_FOLDER === '.') {
    MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');
  }

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

//Installer test for Data folder
function testData(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === DATA_FILE));
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

//Installer install Data folder
function installData(files) {
  const modFile = files.find(file => (path.basename(file) === DATA_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATA_ID };

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

//Installer test for Data subfolders
function testDataSub(files, gameId) {
  const isMod = files.some(file => DATASUB_FOLDERS.includes(path.basename(file)));
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

//Installer install Data subfolders
function installDataSub(files) {
  const modFile = files.find(file => DATASUB_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATASUB_ID };

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

//test for .vpk files
function testVpk(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === VPK_EXT));
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

//Install .vpk files
function installVpk(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === VPK_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: VPK_ID };

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

//Installer test for Materials subfolders
function testMaterials(files, gameId) {
  const isMod = files.some(file => MATERIALS_SUB_FOLDERS.includes(path.basename(file)));
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

//Installer install Materials subfolders
function installMaterials(files) {
  const modFile = files.find(file => MATERIALS_SUB_FOLDERS.includes(path.basename(file)));
  const MATERIALS_SUB_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(MATERIALS_SUB_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MATERIALS_SUB_ID };

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

//Test for .bsp files
function testMaps(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === MAPS_EXT));
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

//Install .bsp files
function installMaps(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === MAPS_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MAPS_ID };

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

//Test for .sav files
function testSave(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SAVE_EXT));
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

//Install .sav files
function installSave(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

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

//Test for config file
function testConfig(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === CONFIG_FILE));
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

//Install config file
function installConfig(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === CONFIG_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

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

// MAIN FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.store.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  await downloadLauncher(api, gameSpec);
  return modFoldersEnsureWritable(discovery.path, MODTYPE_FOLDER);
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
  context.registerInstaller(LAUNCHER_ID, 25, testLauncher, installLauncher);
  context.registerInstaller(`${GAME_ID}-unlimited`, 27, testUnlimited, installUnlimited);
  context.registerInstaller(ROOT_ID, 29, testRoot, installRoot);
  context.registerInstaller(LAUNCHERMOD_ID, 31, testLauncherMod, installLauncherMod);
  context.registerInstaller(DATA_ID, 33, testData, installData);
  context.registerInstaller(DATASUB_ID, 35, testDataSub, installDataSub);
  context.registerInstaller(VPK_ID, 37, testVpk, installVpk);
  context.registerInstaller(MATERIALS_SUB_ID, 39, testMaterials, installMaterials);
  context.registerInstaller(MAPS_ID, 41, testMaps, installMaps);
  context.registerInstaller(SAVE_ID, 43, testSave, installSave);
  context.registerInstaller(CONFIG_ID, 45, testConfig, installConfig);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open config.cfg', async () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, CONFIG_PATH, CONFIG_FILE)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', async () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, SAVE_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    util.opn(DOWNLOAD_FOLDER).catch(() => null);
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
    /* put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;

      return deployNotify(context.api);
    });
    //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
