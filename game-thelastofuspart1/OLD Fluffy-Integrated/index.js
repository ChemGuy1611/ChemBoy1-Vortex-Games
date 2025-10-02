/*////////////////////////////////////////////////
Name: The Last of Us Part I Vortex Extension
Author: ChemBoy1
Structure: Gemeric Game + Fluffy
Version: 1.5.2
Date: 2025-04-04
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');
const child_process = require("child_process");

//Specify all information about the game
const STEAMAPP_ID = "1888930";
const EPICAPP_ID = "";
const GAME_ID = "thelastofuspart1";
const GAME_NAME = "The Last of Us Part I";
const GAME_NAME_SHORT = "TLOU Part I";
const EXEC = "launcher.exe";
const MOD_PATH_DEFAULT = path.join(".");
const FLUFFY_FOLDER = "TLOU";
let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

const IGNORE_CONFLICTS = [path.join('**', 'screenshot.png'), path.join('**', 'screenshot.jpg'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Info for mod types and installers
const USER_HOME = util.getVortexPath("home");

const FLUFFY_ID = "tloup1-fluffymodmanager";
const FLUFFY_NAME = "Fluffy Mod Manager";
const FLUFFY_EXEC = "modmanager.exe";
const FLUFFY_PAGE_NO = 818;
const FLUFFY_FILE_NO = 4736;

const FLUFFYMOD_ID = "tloup1-fluffymod";
const FLUFFYMOD_NAME = "Fluffy Mod";
const FLUFFYMOD_PATH = path.join("Games", FLUFFY_FOLDER, "Mods");

const BUILD_ID = "tloup1-build";
const BUILD_NAME = "Build Folder";
const BUILD_FOLDER = "build";
const BUILD_PATH = path.join(".");

const BIN_ID = `tloup1-binfolder`;
const BIN_NAME = "bin Folder";
const BIN_FOLDER = "bin";
const BIN_PATH = path.join(BUILD_FOLDER, "pc", "main");
const BIN_EXT = ".bin";

const PAK_ID = `${GAME_ID}-pak`;
const PAK_NAME = "Pak (actor97)";
const PAK_EXT = ".pak";
const PAK_PATH = path.join(BUILD_FOLDER, "pc", "main", "actor97");

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(USER_HOME, "Saved Games", "The Last of Us Part I", "users");
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
const CONFIG_PATH = path.join(USER_HOME, "Saved Games", "The Last of Us Part I", "users", USERID_FOLDER);
const CONFIG_FILE = "screeninfo.cfg";

const PSARCTOOL_ID = `${GAME_ID}-psarctool`;
const PSARCTOOL_NAME = "UnPSARC Tool";
const PSARCTOOL_EXEC = "UnPSARC.exe";
const PSARCTOOL_PATH = path.join(BUILD_FOLDER, "pc", "main");
const SPCOMPSARC_FILE = "sp-common.psarc";
const SPCOMPSARC_PATH = path.join(BUILD_FOLDER, "pc", "main", SPCOMPSARC_FILE);
const BINPSARC_FILE = "bin.psarc";
const BINPSARC_PATH = path.join(BUILD_FOLDER, "pc", "main", BINPSARC_FILE);
const OO2_DLL = "oo2core_9_win64.dll";
const CLEANUP_FOLDERS = ["actor97", "animstream97", "dc1", "pak68", "sfx1", "soundbank4", "texturedict3"];
const DELETE_FOLDERS = ["animstream97", "dc1", "pak68", "sfx1", "soundbank4", "texturedict3"];

// Information for UnPSARC downloader and updater
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
];

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
      "id": FLUFFYMOD_ID,
      "name": FLUFFYMOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${FLUFFYMOD_PATH}`
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
      "id": FLUFFY_ID,
      "name": "Fluffy Mod Manager",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
    {
      "id": PSARCTOOL_ID,
      "name": PSARCTOOL_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PSARCTOOL_PATH}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: FLUFFY_ID,
    name: FLUFFY_NAME,
    logo: "fluffy.png",
    executable: () => FLUFFY_EXEC,
    requiredFiles: [FLUFFY_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
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
  /*
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

// AUTOMATIC INSTALLER FUNCTIONS /////////////////////////////////////////////////////////

async function onCheckModVersion(api, gameId, mods, forced) {
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
}

//Check if Fluffy Mod Manager is installed
function isFluffyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === FLUFFY_ID);
}

//Function to auto-download Fluffy Mod Manager
async function downloadFluffy(api, gameSpec) {
  let isInstalled = isFluffyInstalled(api, gameSpec);
  if (!isInstalled) {
    //notification indicating install process
    const MOD_NAME = FLUFFY_NAME;
    const MOD_TYPE = FLUFFY_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = FLUFFY_PAGE_NO;
    const FILE_ID = FLUFFY_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = 'site';
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
        game: GAME_DOMAIN,
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
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err, { allowReport: false });
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testFluffy(files, gameId) {
  const isFluffy = files.some(file => (path.basename(file).toLowerCase() === FLUFFY_EXEC));
  let supported = (gameId === spec.game.id) && isFluffy;

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
function installFluffy(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === FLUFFY_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FLUFFY_ID };

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

//Test for .pak files in "build" folder
function testFluffyBuild(files, gameId) {
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

//Install .pak files in "build" folder
function installFluffyBuild(files, fileName) {
  const modFile = files.find(file => (path.basename(file) === BUILD_FOLDER));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FLUFFYMOD_ID };
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

//Test for .bin files from "build" folder
function testFluffyBin(files, gameId) {
  const isBinFolder = files.some(file => (path.basename(file) === BIN_FOLDER));
  const isPak = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
  const isBin = files.some(file => (path.extname(file).toLowerCase() === BIN_EXT));
  let supported = (gameId === spec.game.id) && isBinFolder && ( isPak || isBin );

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

//Install .bin files from "build" folder
function installFluffyBin(files, fileName) {
  const modFile = files.find(file => (path.basename(file) === BIN_FOLDER));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FLUFFYMOD_ID };
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
      destination: path.join(MOD_FOLDER, BIN_PATH, file.substr(idx)),
    };
  });

  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for pak files in root folder
function testFluffyRootPak(files, gameId) {
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
function installFluffyRootPak(files, fileName) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === PAK_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FLUFFYMOD_ID };
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
      destination: path.join(MOD_FOLDER, PAK_PATH, file.substr(idx)),
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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions
function setupNotify(discovery, api, gameSpec) {
  const NOTIF_ID = `${GAME_ID}-setup`;
  const MESSAGE = `Extract Vanilla .psarc Files with ${PSARCTOOL_NAME}`;
  api.sendNotification({
    id: 'setup-notification-tloup1',
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: 'For mods to work properly, you must extract the game files from the .psarc files. This process must be done initially and after any game updates.\n'
                + `Click the button below to run the ${PSARCTOOL_NAME} to extract the game files.\n`
          }, [
              {
                label: 'Extract Game Files', action: () => {
                  psarcExtract(discovery, api, gameSpec);
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

//Extract .psarc game files
function psarcExtract(discovery, api, gameSpec) {
  GAME_PATH = discovery.path;
  const RUN_PATH = path.join(GAME_PATH, PSARCTOOL_PATH, PSARCTOOL_EXEC);
  const WORK_PATH = path.join(GAME_PATH, PSARCTOOL_PATH);
  try {
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BINPSARC_FILE));
    api.runExecutable(RUN_PATH, [`${SPCOMPSARC_FILE} "${WORK_PATH}"`], { cwd: WORK_PATH, shell: true, detached: true, suggestDeploy: false });
    log('warn', `Ran extraction for .psarc file ${BINPSARC_FILE}`);
  } catch (err) {
    log('error', `Could not extract .psarc file ${SPCOMPSARC_FILE}: ${err}`);
  }
  try {
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BINPSARC_FILE));
    api.runExecutable(RUN_PATH, [`${BINPSARC_FILE} "${path.join(WORK_PATH, BIN_FOLDER)}"`], { cwd: WORK_PATH, shell: true, detached: true, suggestDeploy: false });
    log('warn', `Ran extraction for .psarc file ${BINPSARC_FILE}`);
  } catch (err) {
    log('error', `Could not extract .psarc file ${BINPSARC_FILE}: ${err}`);
  }
}

//Notify User to run Fluffy Mod Manager after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = FLUFFY_NAME;
  const MESSAGE = `Run Fluffy Mod Manager after Deploy`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Fluffy',
        action: (dismiss) => {
          runFluffy(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Run Fluffy Mod Manager to Enable Mods', {
            text: `You must use ${MOD_NAME} to enable mods after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
                + `If your mod is not for ${MOD_NAME}, you may need to change the mod type to "Binaries / Root Folder" manually.\n`
          }, [
            {
              label: 'Run Fluffy', action: () => {
                runFluffy(api);
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

function runFluffy(api) {
  const TOOL_ID = FLUFFY_ID;
  const TOOL_NAME = FLUFFY_NAME;
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
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  setupNotify(discovery, api, gameSpec);
  // ASYNCHRONOUS CODE ///////////////////////////////////
  await downloadFluffy(api, gameSpec);
  await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(SAVE_PATH);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, FLUFFYMOD_PATH));
  try {
      fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, OO2_DLL));
      log('warn', `Found ${OO2_DLL} in ${PSARCTOOL_PATH}`);
    } catch (err) {
      try {
        await fs.copyAsync(path.join(GAME_PATH, OO2_DLL), path.join(GAME_PATH, PSARCTOOL_PATH, OO2_DLL));
        log('warn', `${OO2_DLL} copied successfully to ${PSARCTOOL_PATH}`);
      } catch (err) {
        log('error', `Could not copy ${OO2_DLL} to ${PSARCTOOL_PATH}: ${err}`);
      }
    }
  const isToolInstalled = await checkForTool(api);
  return isToolInstalled ? Promise.resolve() : download(api, REQUIREMENTS);
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
  context.registerInstaller(FLUFFY_ID, 25, testFluffy, installFluffy);
  context.registerInstaller(`${GAME_ID}-fluffymodbuild`, 30, testFluffyBuild, installFluffyBuild);
  context.registerInstaller(`${GAME_ID}-fluffymodbin`, 35, testFluffyBin, installFluffyBin);
  context.registerInstaller(`${GAME_ID}-fluffymodrootpak`, 40, testFluffyRootPak, installFluffyRootPak);
  context.registerInstaller(BUILD_ID, 50, testBuild, installBuild);
  context.registerInstaller(SAVE_ID, 55, testSave, installSave);
  context.registerInstaller(CONFIG_ID, 60, testConfig, installConfig);
  context.registerInstaller(PSARCTOOL_ID, 60, testPsarcTool, installPsarcTool);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Extract .psarc Files', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    psarcExtract(discovery, context.api, gameSpec);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open "build\\pc\\main" Folder', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, BIN_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Fluffy Mods Folder', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, FLUFFYMOD_PATH);
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
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('check-mods-version', (gameId, mods, forced) => onCheckModVersion(context.api, gameId, mods, forced));
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
