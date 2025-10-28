/*
Name: Dark Messiah of Might & Magic Vortex Extension
Structure: Basic (Launcher)
Author: ChemBoy1
Version: 0.2.2
Date: 03/17/2025
*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const STEAMAPP_ID = "2100";
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const GAME_ID = "darkmessiahofmightandmagic";
const GAME_NAME = "Dark Messiah \tof Might & Magic";
const GAME_NAME_SHORT = "Dark Messiah MM";

const MOD_PATH = ".";
const EXEC = "mm.exe";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = `Root Folder`;
const ROOT_FOLDERS = ['_mods']; // Cannot use 'bin' because that would conflict with some Launcher Mods

const DATA_ID = `${GAME_ID}-data`;
const DATA_NAME = `Game Data Folder`;
const DATA_FILE = `mm`;

const DATASUB_ID = `${GAME_ID}-datasub`;
const DATASUB_NAME = `Data Subfolder`;
const DATASUB_PATH = path.join("mm");
const DATASUB_FOLDERS = ['materials', 'maps', 'bin', 'cfg', 'media', 'resource', 'scripts', 'SAVE'];
const DATASUB_FILE = `gameinfo.txt`;

const MATERIALS_SUB_ID = `${GAME_ID}-materialssub`;
const MATERIALS_SUB_NAME = `Materials Subfolder`;
const MATERIALS_SUB_PATH = path.join("mm", "materials");
const MATERIALS_SUB_FOLDERS = ['models', 'fx', 'sprites', 'cloth', 'console', 'correction', 'decals', 'detail', 'effects', 'engine', 'envcubemaps', 'generic', 'hud', 'nature', 'overlays', 'sun', 'vgui', 'voice'];

const VPK_ID = `${GAME_ID}-vpk`;
const VPK_NAME = `VPK Files`;
const VPK_PATH = path.join("vpks");
const VPK_EXT = `.vpk`;

const MAPS_ID = `${GAME_ID}-maps`;
const MAPS_NAME = `Maps (.bsp)`;
const MAPS_PATH = path.join("mm", "maps");
const MAPS_EXT = `.bsp`;

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = `Save`;
const SAVE_PATH = path.join("mm", "SAVE");
const SAVE_EXT = `.sav`;

const LAUNCHER_ID = `${GAME_ID}-launcher`;
const LAUNCHER_NAME = `wiltOS Mod Launcher`;
const LAUNCHER_EXEC = EXEC;

const LAUNCHERMOD_ID = `${GAME_ID}-launchermod`;
const LAUNCHERMOD_NAME = `Launcher Mod`;
const LAUNCHERMOD_PATH = path.join(`_mods`);
const LAUNCHERMOD_FILE = `info.json`;
const UNLIMITED_FILE = `unlimited_edition`;

const H_RES = "2560";
const V_RES = "1440";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      //"epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      //"EpicAPPId": EPICAPP_ID,
      //"XboxAPPId": XBOXAPP_ID
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
      "targetPath": `{gamePath}\\${DATASUB_PATH}`
    },
    {
      "id": MATERIALS_SUB_ID,
      "name": MATERIALS_SUB_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MATERIALS_SUB_PATH}`
    },
    {
      "id": VPK_ID,
      "name": VPK_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${VPK_PATH}`
    },
    {
      "id": MAPS_ID,
      "name": MAPS_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MAPS_PATH}`
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${SAVE_PATH}`
    },
    {
      "id": LAUNCHERMOD_ID,
      "name": LAUNCHERMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${LAUNCHERMOD_PATH}`
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
      //EPICAPP_ID,
      //GOGAPP_ID,
      //XBOXAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  /*
  {
    id: LAUNCHER_ID,
    name: LAUNCHERMOD_NAME,
    logo: "exec.png",
    executable: () => LAUNCHER_EXEC,
    requiredFiles: [LAUNCHER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    defaultPrimary: true,
    parameters: [
      `-novid`,
    ],
  },
  //*/
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
    parameters: [
      `-novid`,
    ],
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
    parameters: [
      `-tempcontent -novid -dev -windowed -w ${H_RES} -h ${V_RES} -dxlevel 70 +mat_dxlevel 70 +mat_softwarelighting 0 +sv_cheats 1 +r_frustumcullworld 0 +r_3dsky 0 +mat_drawwater 0 +map_background none +r_portalsopenall 1 +mat_very_high_texture 1 +mat_picmip 0 `,
    ],
  },
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
async function requiresLauncher(gamePath, store) {
  if (store === 'steam') {
      return Promise.resolve({
          launcher: 'steam',
      });
  }
  return Promise.resolve(undefined);
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
    MOD_FOLDER = MOD_NAME.replace(/[\.]*(installing)*(zip)*/gi, '');
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

// MAIN FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  api.sendNotification({
    id: `${GAME_ID}-setup`,
    type: 'warning',
    message: 'Mod Installation and Setup Instructions',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'TEXT.\n'
                + 'TEXT.\n'
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
          ]);
        },
      },
    ],
  });    
}

//Notify User to run wiltOS Launcher after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = LAUNCHER_NAME;
  const MESSAGE = `Run ${MOD_NAME} after Deploy`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run wiltOS',
        action: (dismiss) => {
          runWilt(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For some mods, you must use ${MOD_NAME} to enable mods after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run wiltOS', action: () => {
                runWilt(api);
                dismiss();
              }
            },
            { label: 'Continue', action: () => dismiss() },
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

function runWilt(api) {
  const TOOL_ID = LAUNCHER_ID;
  const TOOL_NAME = LAUNCHER_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false })
        .catch(err => api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    }
    else {
      return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, `Path to ${TOOL_NAME} executable could not be found. Ensure ${TOOL_NAME} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  //setupNotify(api);
  await downloadLauncher(api, gameSpec);
  //*
  await (gameSpec.modTypes || []).forEach((type, idx, arr) => {
    fs.ensureDirWritableAsync(pathPattern(api, gameSpec.game, type.targetPath));
  });
  //*/
  /*
  await fs.ensureDirWritableAsync(path.join(discovery.path, SAVE_PATH));
  await fs.ensureDirWritableAsync(path.join(discovery.path, VPK_PATH));
  await fs.ensureDirWritableAsync(path.join(discovery.path, MATERIALS_SUB_PATH));
  await fs.ensureDirWritableAsync(path.join(discovery.path, MAPS_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, LAUNCHERMOD_PATH));
  //*/
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath,
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
  context.registerInstaller(`${GAME_ID}-unlimited`, 30, testUnlimited, installUnlimited);
  context.registerInstaller(ROOT_ID, 35, testRoot, installRoot);
  context.registerInstaller(LAUNCHERMOD_ID, 40, testLauncherMod, installLauncherMod);
  context.registerInstaller(DATA_ID, 45, testData, installData);
  context.registerInstaller(DATASUB_ID, 50, testDataSub, installDataSub);
  context.registerInstaller(VPK_ID, 55, testVpk, installVpk);
  context.registerInstaller(MATERIALS_SUB_ID, 60, testMaterials, installMaterials);
  context.registerInstaller(MAPS_ID, 65, testMaps, installMaps);
  context.registerInstaller(SAVE_ID, 70, testSave, installSave);
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
