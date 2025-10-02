/*////////////////////////////////////////////////
Name: The Last of Us Part II Remastered Vortex Extension
Author: ChemBoy1
Structure: Generic Game
Version: 0.6.1
Date: 2025-07-14
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');
const fsPromises = require('fs/promises');
const { clear } = require('console');

//Specify all information about the game
const STEAMAPP_ID = "2531310";
const EPICAPP_ID = "831cd8c0c25b4615ade419ecb4f50e42";
const GAME_ID = "thelastofuspart2";
const GAME_NAME = "The Last of Us Part II\t Remastered";
const GAME_NAME_SHORT = "TLOU Part II";
const EXEC = "launcher.exe";
const MOD_PATH_DEFAULT = path.join(".");
let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let LOAD_ORDER_ENABLED = true;

const IGNORE_CONFLICTS = [path.join('**', 'modinfo.ini'), path.join('**', 'Preview.png'), path.join('**', 'screenshot.png'), path.join('**', 'screenshot.jpg'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'modinfo.ini'), path.join('**', 'Preview.png'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Info for mod types and installers
const USER_HOME = util.getVortexPath("home");
const DOCUMENTS = util.getVortexPath("documents");

const BUILD_ID = `${GAME_ID}-buildfolder`;
const BUILD_NAME = "Build Folder";
const BUILD_FOLDER = "build";
const BUILD_PATH = path.join(".");

const BIN_ID = `${GAME_ID}-binfolder`;
const BIN_NAME = "bin Folder";
const BIN_FOLDER = "bin";
const BIN_PATH = path.join(BUILD_FOLDER, "pc", "main");
const MAIN_PATH = path.join(BUILD_FOLDER, "pc", "main");
const BIN_EXT = ".bin";

const PAK_ID = `${GAME_ID}-pak`;
const PAK_NAME = "Pak (actor97)";
const PAK_EXT = ".pak";
const PAK_FOLDER = "actor97";
const PAK_PATH = path.join(BUILD_FOLDER, "pc", "main");

const MODLOADER_ID = `${GAME_ID}-modloader`;
const MODLOADER_NAME = "ND Mod Loader";
const MODLOADER_PATH = path.join(".");
const MODLOADER_FILE = "winmm.dll";
const MODLOADER_PAGE_NO = 32;
const MODLOADER_FILE_NO = 122;

const LO_FILE = "modloader.ini";
const LO_LINE_START = "MountOrder=";
const CHUNKS_FILE = "chunks.txt";
const CHUNKS_PATH = path.join(MAIN_PATH, CHUNKS_FILE);
const CHUNKS_START_LINE = 38;
const CHUNKS_DEFAULT_CONTENT = `common 0
epic 1
sp-common 2
steam 3
world-abby-ellie-fight 4
world-abby-fights-militia 5
world-abby-flashback-dad 6
world-amputation 7
world-cutting-room 8
world-ellie-flashback-museum 9
world-ellie-flashback-patrol 10
world-ellie-flashback-ultimatum 11
world-epilogue 12
world-farm 13
world-find-aquarium 14
world-find-nora 15
world-flashback-guitar 16
world-flooded-city 17
world-forward-base 18
world-game-start 19
world-guitar-freeplay 20
world-jordan-escape 21
world-medicine 22
world-patrol 23
world-patrol-chalet 24
world-patrol-departure 25
world-patrol-jackson 26
world-rescue-jesse 27
world-rogue 28
world-santa-barbara 29
world-save-lev 30
world-saving-kids 31
world-seattle-arrival 32
world-theater 33
world-theater-ambush 34
world-tracking 35
world-tracking-horde 36
world-watchtower 37
`;

// for mod update to keep them in the load order and not uncheck them
let mod_update_all_profile = false;
let updatemodid = undefined;
let updating_mod = false; // used to see if it's a mod update or not
let mod_install_name = ""; // used to display the name of the currently installed mod

const PSARC_ID = `${GAME_ID}-psarc`;
const PSARC_NAME = ".psarc (Mod Loader)";
const PSARC_PATH = path.join("mods");
const PSARC_EXT = ".psarc";

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(DOCUMENTS, "The Last of Us Part II");
let USERID_FOLDER = "";
try {
  const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = SAVE_ARRAY.find((element) => 
    ((/[a-z]/i.test(element) === false))
  );
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
}
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER, "savedata");
const SAVE_FILE = "USR-DATA";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(USER_HOME, "SOFTWARE", "Naughty Dog", "The Last of Us Part II");
const CONFIG_FILE = "screeninfo.cfg";

const PSARCTOOL_ID = `${GAME_ID}-psarctoolndarc`;
const PSARCTOOL_NAME = "ndarc Tool";
const PSARCTOOL_EXEC = "ndarc.exe";
const PSARCTOOL_EXT_PATH = 'ndarc';
const PSARCTOOL_PAGE_NO = 31;
const PSARCTOOL_FILE_NO = 107;
/*const PSARCTOOL_NAME = "UnPSARC Tool";
const PSARCTOOL_EXEC = "UnPSARC.exe";
const PSARCTOOL_EXT_PATH = 'UnPSARC'; //*/
const PSARCTOOL_PATH = path.join(BUILD_FOLDER, "pc", "main");
const SPCOMPSARC_FILE = "sp-common.psarc";
const BAK_SPCOMPSARC_FILE = "sp-common.psarc.bak";
const SPCOMPSARC_PATH = path.join(BUILD_FOLDER, "pc", "main", SPCOMPSARC_FILE);
const BINPSARC_FILE = "bin.psarc";
const BAK_BINPSARC_FILE = "bin.psarc.bak";
const BINPSARC_PATH = path.join(BUILD_FOLDER, "pc", "main", BINPSARC_FILE);
const VANILLA_FOLDERS = ["boot1", "movie1", "speech1", "tts1"];
const CLEANUP_FOLDERS = ["actor97", "animstream97", "bin", "irpack3", "pak68", "sfx1", "soundbank4", "texturedict3"];

const PSARC_FILES_ARRAY = [
  { //sp-common.psarc
    fileName: SPCOMPSARC_FILE,
    backupName: BAK_SPCOMPSARC_FILE,
    extractTo: ".",
  },
  { //bin.psarc
    fileName: BINPSARC_FILE,
    backupName : BAK_BINPSARC_FILE,
    extractTo: BIN_FOLDER,
  },
];

/* Information for UnPSARC downloader and updater
const PSARCTOOL_ARC_NAME = 'UnPSARC_v2.7.zip';
const PSARCTOOL_URL = `https://api.github.com/repos/rm-NoobInCoding/UnPSARC`;
const REQUIREMENTS = [
  { //PSARCTOOL
    archiveFileName: PSARCTOOL_ARC_NAME,
    modType: PSARCTOOL_ID,
    assemblyFileName: PSARCTOOL_EXEC,
    userFacingName: PSARCTOOL_NAME,
    githubUrl: PSARCTOOL_URL,
    findMod: (api) => findModByFile(api, PSARCTOOL_ID, PSARCTOOL_EXEC),
    findDownloadId: (api) => findDownloadIdByFile(api, PSARCTOOL_ARC_NAME),
    fileArchivePattern: new RegExp(/^UnPSARC_v(\d+\.\d+\.)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
  },
]; //*/

// FILLED IN FROM DATA ABOVE
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
      //"ignoreDeploy": IGNORE_DEPLOY,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": PSARC_ID,
      "name": PSARC_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PSARC_PATH}`
    },
    {
      "id": BUILD_ID,
      "name": BUILD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${BUILD_PATH}`
    },
    {
      "id": BIN_ID,
      "name": BIN_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${BIN_PATH}`
    },
    {
      "id": PAK_ID,
      "name": PAK_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PAK_PATH}`
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": SAVE_PATH
    },
    {
      "id": CONFIG_ID,
      "name": CONFIG_NAME,
      "priority": "high",
      "targetPath": CONFIG_PATH
    },
    {
      "id": PSARCTOOL_ID,
      "name": PSARCTOOL_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${PSARCTOOL_PATH}`
    },
    {
      "id": MODLOADER_ID,
      "name": MODLOADER_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${MODLOADER_PATH}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: PSARCTOOL_ID,
    name: PSARCTOOL_NAME,
    //logo: "psarctool.png",
    executable: () => PSARCTOOL_EXEC,
    requiredFiles: [PSARCTOOL_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    parameters: [],
  }, //*/
  {
    id: `${GAME_ID}-customlaunch`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    parameters: []
  }, //*/
];

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
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
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

// AUTOMATIC INSTALLER FUNCTIONS /////////////////////////////////////////////////////////

/*async function onCheckModVersion(api, gameId, mods, forced) {
  const profile = selectors.activeProfile(api.getState());
  if (profile.gameId !== gameId) {
    return;
  }
  try {
    await testRequirementVersion(api, REQUIREMENTS[0]);
  } catch (err) {
    log('warn', 'failed to test requirement version', err);
  }
}
async function checkForTool(api) {
  const mod = await REQUIREMENTS[0].findMod(api);
  return mod !== undefined;
} //*/

//Check if Mod Loader is installed
function isModLoaderInstalled(discovery, api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MODLOADER_ID);
}

//Check if PSARC Tool is installed
function isPsarcToolInstalled(discovery, api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === PSARCTOOL_ID);
}

//* Function to auto-download Mod Enabler form Nexus Mods
async function downloadModLoader(discovery, api, gameSpec) {
  let isInstalled = isModLoaderInstalled(discovery, api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MODLOADER_NAME;
    const MOD_TYPE = MODLOADER_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = MODLOADER_PAGE_NO;
    const FILE_ID = MODLOADER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = gameSpec.game.id;
    api.sendNotification({ //notification indicating install process
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
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          //throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
          throw new Error(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        game: GAME_DOMAIN, // always set to the game's ID so user wil not get a game selection popup. Vortex will update the metadata automatically if the mod is from another domain, such as 'site'
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
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download Mod Enabler form Nexus Mods
async function downloadPsarcTool(discovery, api, gameSpec) {
  let isInstalled = isPsarcToolInstalled(discovery, api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = PSARCTOOL_NAME;
    const MOD_TYPE = PSARCTOOL_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = PSARCTOOL_PAGE_NO;
    const FILE_ID = PSARCTOOL_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = gameSpec.game.id;
    api.sendNotification({ //notification indicating install process
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
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          //throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
          throw new Error(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        game: GAME_DOMAIN, // always set to the game's ID so user wil not get a game selection popup. Vortex will update the metadata automatically if the mod is from another domain, such as 'site'
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
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testModLoader(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === MODLOADER_FILE));
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

//Installer install Fluffy Mod Manger files
function installModLoader(files) {
  const modFile = files.find(file => (path.basename(file) === MODLOADER_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MODLOADER_ID };

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

//Test for .pak or .bin files in "build" folder
function testBuildPakBin(files, gameId) {
  const isBuild = files.some(file => (path.basename(file) === BUILD_FOLDER));
  const isPak = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
  const isBin = files.some(file => (path.extname(file).toLowerCase() === BIN_EXT));
  let supported = (gameId === spec.game.id) && isBuild && ( isPak || isBin );

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

//Install .pak or .bin files in "build" folder
function installBuildPakBin(files, fileName) {
  const modFile = files.find(file => (path.basename(file) === BUILD_FOLDER));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BUILD_ID };

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

//Test for  "bin" folder
function testBin(files, gameId) {
  const isBinFolder = files.some(file => (path.basename(file) === BIN_FOLDER));
  /*const isPak = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
  const isBin = files.some(file => (path.extname(file).toLowerCase() === BIN_EXT));
  let supported = (gameId === spec.game.id) && isBinFolder && ( isPak || isBin ); //*/
  let supported = (gameId === spec.game.id) && isBinFolder;

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

//Install "bin" folder
function installBin(files, fileName) {
  const modFile = files.find(file => (path.basename(file) === BIN_FOLDER));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BIN_ID };

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

//Installer test for psarc files
function testPsarc(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === PSARC_EXT));
  const isPak = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
  const isBin = files.some(file => (path.extname(file).toLowerCase() === BIN_EXT));
  let supported = (gameId === spec.game.id) && isMod && !isPak && !isBin;

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

//Installer Install psarc files
function installPsarc(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === PSARC_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PSARC_ID };

  //set a mod attribute to find the mod name in deserializeLoadOrder
  const PSARC_FILES = files.filter(file => (path.extname(file).toLowerCase() === PSARC_EXT));
  const MOD_ATTRIBUTE = {
    type: 'attribute',
    key: 'psarcFiles',
    value: PSARC_FILES,
  };

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
  instructions.push(MOD_ATTRIBUTE);
  return Promise.resolve({ instructions });
}


//Installer test for pak files in root folder
function testPak(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
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

//Installer Install pak files in root folder
function installPak(files, fileName) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === PAK_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PAK_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(PAK_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for "build" folder (non-Fluffy)
function testBuild(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === BUILD_FOLDER));
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

//Installer install "build" folder (non-Fluffy)
function installBuild(files) {
  const modFile = files.find(file => (path.basename(file) === BUILD_FOLDER));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BUILD_ID };

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

//Installer test for save files
function testSave(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === SAVE_FILE));
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

//Installer install save files
function installSave(files) {
  const modFile = files.find(file => (path.basename(file) === SAVE_FILE));
  const rootPath = path.dirname(modFile);
  let idx = modFile.indexOf(`${path.basename(rootPath)}\\`);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((!file.endsWith(path.sep)))
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

//Installer test for config files
function testConfig(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === CONFIG_FILE));
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

//Installer install config files
function installConfig(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === CONFIG_FILE));
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

//Installer test for Fluffy Mod Manager files
function testPsarcTool(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === PSARCTOOL_EXEC));
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

//Installer install Fluffy Mod Manger files
function installPsarcTool(files) {
  const modFile = files.find(file => (path.basename(file) === PSARCTOOL_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PSARCTOOL_ID };

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

// LOAD ORDER FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////

async function deserializeLoadOrder(context) {
  //* on mod update for all profile it would cause the mod if it was selected to be unselected
  if (mod_update_all_profile) {
    let allMods = Array("mod_update");

    return allMods.map((modId) => {
      return {
        id: "mod update in progress, please wait. Refresh when finished. \n To avoid this wait, only update current profile",
        modId: modId,
        enabled: false,
      };
    });
  } //*/

  //Set basic information for load order paths and data
  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const mods = util.getSafe(context.api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  let loadOrderPath = path.join(gameDir, LO_FILE);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let loadOrderSplit = loadOrderFile.split("\n");
  let LO_LINE = loadOrderSplit.find(line => line.startsWith(LO_LINE_START)); //we are putting the list on one line. should be element [1], but doing find just in case that ever changes.
  LO_LINE = LO_LINE.replace(LO_LINE_START, '');
  let modFolderPath = path.join(gameDir, PSARC_PATH);

  //Get all .psarc files from mods folder
  let modFiles = [];
  try {
    modFiles = await fs.readdirAsync(modFolderPath);
    modFiles = modFiles.filter((file) => (path.extname(file) === PSARC_EXT));
    modFiles.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read .psarc "mods" folder'));
  }

  // Get readable mod name using attribute from mod installer
  async function getModName(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['psarcFiles'], '').includes(file))); //find mod that includes the psarc file
      if (modMatch) {
        return modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
      }
      return file;
    } catch (err) {
      return file;
    }
  }

  // Get readable mod id using attribute from mod installer
  async function getModId(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['psarcFiles'], '').includes(file))); //find mod that includes the psarc file
      if (modMatch) {
        return modMatch.id;
      }
      return undefined;
    } catch (err) {
      return undefined;
    }
  }

  //Set load order
  let loadOrder = await (LO_LINE.split(","))
    .reduce(async (accumP, entry) => {
      const accum = await accumP;
      const file = entry;
      if (!modFiles.includes(file)) {
        return Promise.resolve(accum);
      }
      accum.push(
      {
        id: file,
        name: `${file.replace(PSARC_EXT, '')} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: true,
      }
      );
      return Promise.resolve(accum);
    }, Promise.resolve([]));
  
  //push new mod folders from Mods folder to loadOrder
  for (let file of modFiles) {
    if (!loadOrder.find((mod) => (mod.id === file))) {
      loadOrder.push({
        id: file,
        name: `${file.replace(PSARC_EXT, '')} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: true,
      });
    }
  }

  return loadOrder;
}

//Write load order to files
async function serializeLoadOrder(context, loadOrder) {
  //* don't write if all profiles are being updated
  if (mod_update_all_profile) {
    return;
  } //*/

  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }

  let loadOrderPath = path.join(gameDir, LO_FILE);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let loadOrderSplit = loadOrderFile.split("\n");
  let LO_LINE = loadOrderSplit.find(line => line.startsWith(LO_LINE_START)); //we are putting the list on one line. should be element [1], but doing find just in case that ever changes.
  let index = loadOrderSplit.indexOf(LO_LINE);
  let loadOrderMapped = loadOrder
    //.map((mod) => (mod.id))
    .map((mod) => (mod.enabled ? mod.id : ``)); //this is used for chunks.txt also
  let loadOrderJoined = loadOrderMapped
    .filter((entry) => (entry !== ``))
    .join(",");
  loadOrderSplit[index] = LO_LINE_START + loadOrderJoined;

  //Write to chunks.txt file
  let chunksPath = path.join(gameDir, CHUNKS_PATH);
  let loadOrderName = loadOrderMapped
    .filter((entry) => (entry !== ``))
    .map((name) => (name.replace('.psarc', '')));
  const startLine = CHUNKS_START_LINE;
  for (let line = startLine; line < (startLine + loadOrderName.length); line++) {
    let offset = line - startLine; //offset to zero for indexing the array from the first element
    loadOrderName[offset] = `${loadOrderName[offset]} ${line}`;
  }
  let loadOrderJoinedChunks = loadOrderName.join(`\n`);
  await fs.writeFileAsync(
    chunksPath,
    `${CHUNKS_DEFAULT_CONTENT}` + `${loadOrderJoinedChunks}`,
    { encoding: "utf8" },
  );

  //write to modloader.ini file
  let loadOrderOutput = loadOrderSplit.join("\n");
  return fs.writeFileAsync(
    loadOrderPath,
    `${loadOrderOutput}`,
    { encoding: "utf8" },
  );
}

//remove load order list from modloader.ini on purge
async function clearModOrder(api) {
  let gameDir = getDiscoveryPath(api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }

  let loadOrderPath = path.join(gameDir, LO_FILE);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let loadOrderSplit = loadOrderFile.split("\n");
  let LO_LINE = loadOrderSplit.find(line => line.startsWith(LO_LINE_START)); //we are putting the list on one line. should be element [1], but doing find just in case that ever changes.
  let index = loadOrderSplit.indexOf(LO_LINE);
  loadOrderSplit[index] = LO_LINE_START; //set the line to the default "blank" text

  let loadOrderOutput = loadOrderSplit.join("\n");
  return fs.writeFileAsync(
    loadOrderPath,
    `${loadOrderOutput}`,
    { encoding: "utf8" },
  );
}

//remove load order list from chunks.txt on purge
async function clearChunksTxt(api) {
  let gameDir = getDiscoveryPath(api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }

  let chunksPath = path.join(gameDir, CHUNKS_PATH);
  return fs.writeFileAsync(
    chunksPath,
    `${CHUNKS_DEFAULT_CONTENT}`,
    { encoding: "utf8" },
  );
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

//Notify User of Setup instructions
function setupNotify(api) {
  GAME_PATH = getDiscoveryPath(api);
  try {
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, 'pak68'));
    log('warn', `Extracted folder found. Suppressing setup notification.`);
  }
  catch (err) { //*/
    const NOTIF_ID = `${GAME_ID}-setup`;
    const MESSAGE = `Extract Vanilla .psarc Files with ${PSARCTOOL_NAME}`;
    api.sendNotification({
      id: NOTIF_ID,
      type: 'warning',
      message: MESSAGE,
      allowSuppress: true,
      actions: [
        {
          title: 'Extract Game Files',
          action: (dismiss) => {
            psarcSetup(api);
            dismiss();
          },
        },
        {
          title: 'More',
          action: (dismiss) => {
            api.showDialog('question', MESSAGE, {
              text: 'For mods to work properly, you must extract the game files from the .psarc files and rename the .psarc files. This process must be done initially and after any game updates.\n'
                  + `Click the button below to run the ${PSARCTOOL_NAME} to extract the game files and rename the .psarc files.\n`
            }, [
                {
                  label: 'Extract Game Files', action: () => {
                    psarcSetup(api);
                    dismiss();
                  }
                },
                { label: 'Not Now', action: () => dismiss() },
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
}

//Extract .psarc game files
async function psarcExtract(GAME_PATH, api) {
  let RUN_PATH = path.join(__dirname, PSARCTOOL_EXT_PATH, PSARCTOOL_EXEC);
  /*
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  const modMatch = Object.values(mods).find(mod => mod.type === PSARCTOOL_ID);
  const EXEC_FOLDER = modMatch.installationPath;
  if (EXEC_FOLDER !== undefined) {
    //const RUN_PATH = path.join(GAME_PATH, PSARCTOOL_PATH, PSARCTOOL_EXEC);
    RUN_PATH = path.join(STAGING_FOLDER, EXEC_FOLDER, PSARCTOOL_EXEC);
  } //*/
  const WORK_PATH = path.join(GAME_PATH, PSARCTOOL_PATH);

  try { //extract sp-common.psarc
    const TARGET_FILE = path.join(WORK_PATH, SPCOMPSARC_FILE);
    const EXTRACT_PATH = WORK_PATH;
    fs.statSync(TARGET_FILE);
    //const ARGUMENTS = `"${path.join(WORK_PATH, SPCOMPSARC_FILE)}" "${WORK_PATH}"`; //UnPSARC arguments
    const ARGUMENTS = `-e "${TARGET_FILE}" -o "${EXTRACT_PATH}"`; //ndarc arguments
    await api.runExecutable(RUN_PATH, [ARGUMENTS], { shell: true, detached: true, suggestDeploy: false });
    log('warn', `Ran extraction for .psarc file ${SPCOMPSARC_FILE}`);
  } catch (err) {
    log('error', `Could not extract .psarc file ${SPCOMPSARC_FILE}: ${err}`);
    return false;
  }

  try { //extract bin.psarc
    const TARGET_FILE = path.join(WORK_PATH, BINPSARC_FILE);
    const EXTRACT_PATH = path.join(WORK_PATH, BIN_FOLDER);
    fs.statSync(TARGET_FILE);
    //const ARGUMENTS = `"${path.join(WORK_PATH, BINPSARC_FILE)}" "${path.join(WORK_PATH, BIN_FOLDER)}"`; //UnPSARC arguments
    const ARGUMENTS = `-e "${TARGET_FILE}" -o "${EXTRACT_PATH}"`; //ndarc arguments
    await api.runExecutable(RUN_PATH, [ARGUMENTS], { shell: true, detached: true, suggestDeploy: false });
    log('warn', `Ran extraction for .psarc file ${BINPSARC_FILE}`);
  } catch (err) {
    log('error', `Could not extract .psarc file ${BINPSARC_FILE}: ${err}`);
    return false;
  }

  try { //stat extracted folders to make sure they are there
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BIN_FOLDER));
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, 'pak68'));
    return true;
  } catch (err) { //if the folders aren't there, the user probably clossed the terminal windows
    return false;
  }
}

//Setup .psarc files for modding
async function psarcSetup(api) { //run on mod purge
  const NOTIF_ID = `${GAME_ID}-psarcsetup`
  api.sendNotification({ //notification indicating install process
    id: NOTIF_ID,
    message: `Extracting and Renaming .psarc Files. This will take a while. Do not close the terminal windows.`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  const state = api.getState();
  const discovery = selectors.discoveryByGame(state, GAME_ID);
  GAME_PATH = discovery.path;
  //await api.emitAndAwait('purge-mods-in-path', GAME_ID, '', path.join(GAME_PATH, PSARCTOOL_PATH));
  await purge(api);
  //await api.emitAndAwait('deploy-single-mod', GAME_ID, modMatch.id, false);
  let EXTRACTED = await psarcExtract(GAME_PATH, api);
  if (EXTRACTED) {
    log('warn', `Extraction of all .psarc files complete. Renaming files...`);
    try { //rename sp-common.psarc
      fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, SPCOMPSARC_FILE));
      fs.renameAsync(path.join(GAME_PATH, PSARCTOOL_PATH, SPCOMPSARC_FILE), path.join(GAME_PATH, PSARCTOOL_PATH, BAK_SPCOMPSARC_FILE));
      log('warn', `Renamed .psarc file ${SPCOMPSARC_FILE} to ${BAK_SPCOMPSARC_FILE}`);
    } catch (err) {
      log('error', `Could not rename .psarc file ${SPCOMPSARC_FILE}: ${err}`);
    }
    try { //rename bin.psarc
      fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BINPSARC_FILE));
      fs.renameAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BINPSARC_FILE), path.join(GAME_PATH, PSARCTOOL_PATH, BAK_BINPSARC_FILE));
      log('warn', `Renamed .psarc file ${BINPSARC_FILE} to ${BAK_BINPSARC_FILE}`);
    } catch (err) {
      log('error', `Could not rename .psarc file ${BINPSARC_FILE}: ${err}`);
    } //*/
    //api.events.emit('deploy-mods', (err) => {log('error', `Failed to deploy mods! User will have to deploy manually: ${err}`)});
    await deploy(api);
    api.dismissNotification(NOTIF_ID);
    return;
  }
  await deploy(api);
  api.dismissNotification(NOTIF_ID);
  api.showErrorNotification(`Could not complete extraction of .psarc files. Please try again.`, `Could not complete extraction of .psarc files. Please try again. This error likely occured due to closing the ndarc terminal windows before extraction was complete.`, { allowReport: false });
  return;
}

//Cleanup extracted .psarc game files (called on purge)
async function psarcCleanup(api) {
  const state = api.getState();
  const discovery = selectors.discoveryByGame(state, GAME_ID);
  GAME_PATH = discovery.path;
  const FOLDERS_PATH = path.join(GAME_PATH, PSARCTOOL_PATH);
  CLEANUP_FOLDERS.forEach((folder, idx, arr) => {
    try { //remove extracted .psarc folders
      fs.statSync(path.join(FOLDERS_PATH, folder));
      fsPromises.rmdir(path.join(FOLDERS_PATH, folder), { recursive: true });
      //log('warn', `Deleted extracted .psarc folder "${folder}"`);
    } catch (err) {
      log('error', `Could not delete extracted .psarc folder "${folder}": ${err}`);
    }
  }); //*/
  try { //restore name of sp-common.psarc
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_SPCOMPSARC_FILE));
    try { //make sure vanilla file is not in place - this usually means the game was updated
      fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, SPCOMPSARC_FILE));
      fs.unlinkAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_SPCOMPSARC_FILE));
    } catch (err) {
      await fs.renameAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_SPCOMPSARC_FILE), path.join(GAME_PATH, PSARCTOOL_PATH, SPCOMPSARC_FILE));
      //log('warn', `Renamed .psarc file ${BAK_SPCOMPSARC_FILE} to ${SPCOMPSARC_FILE}`);
    }
  } catch (err) {
    //log('error', `Could not restore name of .psarc file ${SPCOMPSARC_FILE}: ${err}`);
  }
  try { //restore name of bin.psarc
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_BINPSARC_FILE));
    try { //make sure vanilla file is not in place - this usually means the game was updated
      fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BINPSARC_FILE));
      fs.unlinkAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_BINPSARC_FILE));
    } catch (err) {
      await fs.renameAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_BINPSARC_FILE), path.join(GAME_PATH, PSARCTOOL_PATH, BINPSARC_FILE));
      //log('warn', `Renamed .psarc file ${BAK_BINPSARC_FILE} to ${BINPSARC_FILE}`);
    }
  } catch (err) {
    //log('error', `Could not restore name of .psarc file ${BINPSARC_FILE}: ${err}`);
  }
  setupNotify(api);
}

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  setupNotify(api);
  // ASYNCHRONOUS CODE ///////////////////////////////////
  await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(SAVE_PATH);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, PAK_PATH));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, PSARC_PATH));
  /*const isToolInstalled = await checkForTool(api);
  //return isToolInstalled ? Promise.resolve() : download(api, REQUIREMENTS); //*/
  await downloadModLoader(discovery, api, gameSpec);
  if (LOAD_ORDER_ENABLED) {
    const LO_FILE_PATH = path.join(GAME_PATH, LO_FILE);
    try {
      fs.statSync(LO_FILE_PATH);
    } catch (err) {
      const modFolder = path.join(GAME_PATH, PSARC_PATH);
      const LO_FILE_LINES = [`[ModLoader]`, 'MountOrder=', 'ShowConsole=false', `ModFolder=${modFolder}`];
      const LO_FILE_CONTENT = LO_FILE_LINES.join('\n')
      fs.writeFileAsync(
        LO_FILE_PATH,
        LO_FILE_CONTENT,
        { encoding: "utf8" },
      );
    }
  }
  return downloadPsarcTool(discovery, api, gameSpec);
}

//Let vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
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
  context.registerInstaller(MODLOADER_ID, 25, testModLoader, installModLoader);
  context.registerInstaller(PSARC_ID, 27, testPsarc, installPsarc);
  context.registerInstaller(`${BUILD_ID}pakbin`, 30, testBuildPakBin, installBuildPakBin);
  context.registerInstaller(BIN_ID, 35, testBin, installBin);
  context.registerInstaller(PAK_ID, 40, testPak, installPak);
  context.registerInstaller(BUILD_ID, 45, testBuild, installBuild);
  context.registerInstaller(SAVE_ID, 50, testSave, installSave);
  context.registerInstaller(CONFIG_ID, 55, testConfig, installConfig);
  context.registerInstaller(PSARCTOOL_ID, 60, testPsarcTool, installPsarcTool);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Extract .psarc Files', () => {
    psarcSetup(context.api);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open "build\\pc\\main" Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, MAIN_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open .psarc "mods" Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, PSARC_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open modloader.ini', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, LO_FILE);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open chunks.txt', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, CHUNKS_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    const openPath = path.join(SAVE_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = path.join(CONFIG_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Vortex Downloads Folder', () => {
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
  if (LOAD_ORDER_ENABLED) {
    context.registerLoadOrder({
      gameId: GAME_ID,
      validate: async () => Promise.resolve(undefined), // no validation implemented yet
      deserializeLoadOrder: async () => await deserializeLoadOrder(context),
      serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),  
      toggleableEntries: false,
      usageInstructions:`Drag and drop the mods on the left to change the order in which they load.   \n` 
                        +`${GAME_NAME} loads mods in the order you set from top to bottom.   \n`
                        +`\n`,
    });
  }
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    //context.api.onAsync('check-mods-version', (gameId, mods, forced) => onCheckModVersion(context.api, gameId, mods, forced));
    context.api.onAsync('did-purge', (profileId) => didPurge(context.api, profileId)); //*/
    context.api.onAsync("did-deploy", (profileId) => {
      mod_update_all_profile = false;
      updating_mod = false;
      updatemodid = undefined;
    });
    context.api.events.on("mod-update", (gameId, modId, fileId) => {
      if (GAME_ID == gameId) {
        updatemodid = modId;
      }
    });
    context.api.events.on("remove-mod", (gameMode, modId) => {
      if (modId.includes("-" + updatemodid + "-")) {
        mod_update_all_profile = true;
      }
    });
    context.api.events.on("will-install-mod", (gameId, archiveId, modId) => {
      mod_install_name = modId.split("-")[0];
      if (GAME_ID == gameId && modId.includes("-" + updatemodid + "-")) {
        updating_mod = true;
      } else {
        updating_mod = false;
      }
    }); //*/
  });
  return true;
}

async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  psarcCleanup(api);
  clearModOrder(api);
  clearChunksTxt(api);
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
