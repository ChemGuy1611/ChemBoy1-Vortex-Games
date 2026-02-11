/*////////////////////////////////////////////////
Name: The Last of Us Part I Vortex Extension
Author: ChemBoy1
Structure: Gemeric Game w/ File Extraction
Version: 2.1.0
Date: 2026-02-11
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');
const fsPromises = require('fs/promises');

//Specify all information about the game
const STEAMAPP_ID = "1888930";
const EPICAPP_ID = ""; // not on egdata.app yet
const GAME_ID = "thelastofuspart1";
const GAME_NAME = "The Last of Us Part I";
const GAME_NAME_SHORT = "TLOU Part I";
const EXEC = "launcher.exe";
const MOD_PATH_DEFAULT = path.join(".");
let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/The_Last_of_Us_Part_I";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/839"; //Nexus link to this extension. Used for links

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

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_FOLDER = path.join(USER_HOME, "Saved Games", "The Last of Us Part I", "users");
let USERID_FOLDER = "";
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}
try {
  const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
} //*/
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER, "savedata");
const SAVE_FILE = "USR-DATA";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(USER_HOME, "Saved Games", "The Last of Us Part I", "users", USERID_FOLDER);
const CONFIG_FILE = "screeninfo.cfg";

const PSARCTOOL_ID = `${GAME_ID}-psarctool`;
const PSARCTOOL_NAME = "UnPSARC Tool";
const PSARCTOOL_EXEC = "UnPSARC.exe";
const PSARCTOOL_EXT_PATH = 'UnPSARC';
const PSARCTOOL_PATH = path.join(BUILD_FOLDER, "pc", "main");
const SPCOMPSARC_FILE = "sp-common.psarc";
const BAK_SPCOMPSARC_FILE = "sp-common.psarc.bak";
const SPCOMPSARC_PATH = path.join(BUILD_FOLDER, "pc", "main", SPCOMPSARC_FILE);
const BINPSARC_FILE = "bin.psarc";
const BAK_BINPSARC_FILE = "bin.psarc.bak";
const BINPSARC_PATH = path.join(BUILD_FOLDER, "pc", "main", BINPSARC_FILE);
const OO2_DLL = "oo2core_9_win64.dll";
const VANILLA_FOLDERS = ["boot1", "movie1", "speech1", "tts1"];
const CLEANUP_FOLDERS = ["actor97", "animstream97", "bin", "pak68", "sfx1", "soundbank4", "texturedict3"];

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
    fileArchivePattern: new RegExp(/^UnPSARC_v(\d+\.\d+)/, 'i'),
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
      "steamAppId": +STEAMAPP_ID,
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
      "id": BUILD_ID,
      "name": BUILD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BUILD_PATH)
    },
    {
      "id": BIN_ID,
      "name": BIN_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BIN_PATH)
    },
    {
      "id": PAK_ID,
      "name": PAK_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', PAK_PATH)
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
      "targetPath": path.join('{gamePath}', PSARCTOOL_PATH)
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

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await testRequirementVersion(api, REQUIREMENTS[0]);
  } catch (err) {
    log('warn', `failed to test requirement version: ${err}`);
  }
}

async function checkForTool(api) {
  const mod = await REQUIREMENTS[0].findMod(api);
  return mod !== undefined;
} //*/

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

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
  let idx = modFile.indexOf(`${path.basename(rootPath)}${path.sep}`);
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

//Check if Fluffy Mod Manager is installed
function isFluffyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === "tloup1-fluffymodmanager");
}

//Notify User of Setup instructions
async function setupNotify(api) {
  GAME_PATH = getDiscoveryPath(api);
  try {
    await fs.statAsync(path.join(GAME_PATH, PSARCTOOL_PATH, 'pak68'));
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

//Notify User of Setup instructions
function reinstallWarningNotify(api) {
  const NOTIF_ID = `${GAME_ID}-reinstallwarning`;
  const MESSAGE = `REINSTALL YOUR MOD LIST!`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'error',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: 'The extension has been updated to completely remove Fluffy Mod Manager.  Please re-install your full mod list.\n'
                + `This change will improve your modding experience and prevent issues with mods.\n`
                + `Apologies for any inconvenience this may cause.\n`
          }, [
              { label: 'OK, I Understand', action: () => dismiss() },
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
async function psarcExtract(GAME_PATH, api) {
  let RUN_PATH = path.join(__dirname, PSARCTOOL_EXT_PATH, PSARCTOOL_EXEC);
  /*
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  const mods = state.persistent.mods[spec.game.id] || {};
  const modMatch = Object.values(mods).find(mod => mod.type === PSARCTOOL_ID);
  const EXEC_FOLDER = modMatch.installationPath;
  if (EXEC_FOLDER !== undefined) {
    //const RUN_PATH = path.join(GAME_PATH, PSARCTOOL_PATH, PSARCTOOL_EXEC);
    RUN_PATH = path.join(STAGING_FOLDER, EXEC_FOLDER, PSARCTOOL_EXEC);
  } //*/
  const WORK_PATH = path.join(GAME_PATH, PSARCTOOL_PATH);
  //extract sp-common.psarc
  try { 
    const TARGET_FILE = path.join(WORK_PATH, SPCOMPSARC_FILE);
    const EXTRACT_PATH = WORK_PATH;
    await fs.statAsync(TARGET_FILE);
    const ARGUMENTS = `"${TARGET_FILE}" "${EXTRACT_PATH}"`;
    await api.runExecutable(RUN_PATH, [ARGUMENTS], { shell: true, detached: true, suggestDeploy: false });
    log('warn', `Ran extraction for .psarc file ${SPCOMPSARC_FILE}`);
  } catch (err) {
    log('error', `Could not extract .psarc file ${SPCOMPSARC_FILE}: ${err}`);
    return false;
  }
  //extract bin.psarc
  try { 
    const TARGET_FILE = path.join(WORK_PATH, BINPSARC_FILE);
    const EXTRACT_PATH = path.join(WORK_PATH, BIN_FOLDER);
    await fs.statAsync(TARGET_FILE);
    const ARGUMENTS = `"${TARGET_FILE}" "${EXTRACT_PATH}"`; //unPSARC arguments
    await api.runExecutable(RUN_PATH, [ARGUMENTS], { shell: true, detached: true, suggestDeploy: false });
    log('warn', `Ran extraction for .psarc file ${BINPSARC_FILE}`);
  } catch (err) {
    log('error', `Could not extract .psarc file ${BINPSARC_FILE}: ${err}`);
    return false;
  }
  //stat extracted folders to make sure they are there
  try { 
    await fs.statAsync(path.join(WORK_PATH, BIN_FOLDER));
    await fs.statAsync(path.join(WORK_PATH, 'pak68'));
    return true;
  } catch (err) { //if the folders aren't there, the user probably closed the terminal windows early
    return false;
  }
}
function extractSuccessNotify(api) {
  const NOTIF_ID = `${GAME_ID}-extractsuccess`;
  const MESSAGE = `Successfully extracted .psarc files`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'success',
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}

//Setup .psarc files for modding
async function psarcSetup(api) { //run on mod purge
  const NOTIF_ID = `${GAME_ID}-psarcsetup`
  api.sendNotification({ //notification indicating process
    id: NOTIF_ID,
    message: `Extracting and Renaming .psarc Files. This will take a while. Do not close the terminal windows.`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  GAME_PATH = await getDiscoveryPath(api);
  const WORK_PATH = path.join(GAME_PATH, PSARCTOOL_PATH);
  //await api.emitAndAwait('purge-mods-in-path', GAME_ID, '', WORK_PATH);
  await purge(api);
  //await api.emitAndAwait('deploy-single-mod', GAME_ID, modMatch.id, false);
  let EXTRACTED = await psarcExtract(GAME_PATH, api);
  if (EXTRACTED) {
    log('warn', `Extraction of all .psarc files complete. Renaming files...`);
    //rename sp-common.psarc
    try { 
      await fs.statAsync(path.join(WORK_PATH, SPCOMPSARC_FILE));
      await fs.renameAsync(path.join(WORK_PATH, SPCOMPSARC_FILE), path.join(WORK_PATH, BAK_SPCOMPSARC_FILE));
      log('warn', `Renamed .psarc file ${SPCOMPSARC_FILE} to ${BAK_SPCOMPSARC_FILE}`);
    } catch (err) {
      log('error', `Could not rename .psarc file ${SPCOMPSARC_FILE}: ${err}`);
    }
    //rename bin.psarc
    try { 
      await fs.statAsync(path.join(WORK_PATH, BINPSARC_FILE));
      await fs.renameAsync(path.join(WORK_PATH, BINPSARC_FILE), path.join(WORK_PATH, BAK_BINPSARC_FILE));
      log('warn', `Renamed .psarc file ${BINPSARC_FILE} to ${BAK_BINPSARC_FILE}`);
    } catch (err) {
      log('error', `Could not rename .psarc file ${BINPSARC_FILE}: ${err}`);
    } //*/
    //finish up - success
    await deploy(api);
    api.dismissNotification(NOTIF_ID);
    extractSuccessNotify(api);
    return;
  }
  //finish up - failure
  await deploy(api);
  api.dismissNotification(NOTIF_ID);
  api.showErrorNotification(`Could not complete extraction of .psarc files. Please try again.`, 
    `Could not complete extraction of .psarc files. Please try again. This error likely occured due to closing the ndarc terminal windows before extraction was complete.\n ${err}`, 
    { allowReport: false }
  );
  return;
}

async function foldersCleanup(workingPath, folders) {
  for (let index = 0; index < folders.length; index++) {
    const folder = path.join(workingPath, folders[index]);
    try { //remove extracted .psarc folders
      await fs.statAsync(folder);
      await fsPromises.rm(folder, { recursive: true });
    } catch (err) {
      log('error', `Could not delete extracted .psarc folder "${folder}": ${err}`);
    }
  }
}
function cleanupSuccessNotify(api) {
  const NOTIF_ID = `${GAME_ID}-cleanupsuccess`;
  const MESSAGE = `Successfully restored vanilla .psarc files and deleted extracted files`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'success',
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}

//Cleanup extracted .psarc game files (called on purge)
async function psarcCleanup(api) {
  const NOTIF_ID = `${GAME_ID}-psarccleanup`
  api.sendNotification({ //notification indicating process
    id: NOTIF_ID,
    message: `Cleaning up extracted .psarc Files and restoring file names. This will take a few seconds.`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  GAME_PATH = await getDiscoveryPath(api);
  const WORK_PATH = path.join(GAME_PATH, PSARCTOOL_PATH);
  await foldersCleanup(WORK_PATH, CLEANUP_FOLDERS);
  //restore name of sp-common.psarc
  try { 
    await fs.statAsync(path.join(WORK_PATH, BAK_SPCOMPSARC_FILE));
    try { //make sure vanilla file is not in place - this usually means the game was updated
      await fs.statAsync(path.join(WORK_PATH, SPCOMPSARC_FILE));
      await fs.unlinkAsync(path.join(WORK_PATH, BAK_SPCOMPSARC_FILE));
    } catch (err) { //vanilla file not present, safe to rename
      await fs.renameAsync(path.join(WORK_PATH, BAK_SPCOMPSARC_FILE), path.join(WORK_PATH, SPCOMPSARC_FILE));
      log('warn', `Renamed .psarc file ${BAK_SPCOMPSARC_FILE} to ${SPCOMPSARC_FILE}`);
    }
  } catch (err) {
    log('error', `Could not restore name of .psarc file ${SPCOMPSARC_FILE}: ${err}`);
  }
  //restore name of bin.psarc
  try { 
    await fs.statAsync(path.join(WORK_PATH, BAK_BINPSARC_FILE));
    try { //make sure vanilla file is not in place - this usually means the game was updated
      await fs.statAsync(path.join(WORK_PATH, BINPSARC_FILE));
      await fs.unlinkAsync(path.join(WORK_PATH, BAK_BINPSARC_FILE));
    } catch (err) {
      await fs.renameAsync(path.join(WORK_PATH, BAK_BINPSARC_FILE), path.join(WORK_PATH, BINPSARC_FILE));
      log('warn', `Renamed .psarc file ${BAK_BINPSARC_FILE} to ${BINPSARC_FILE}`);
    }
  } catch (err) {
    log('error', `Could not restore name of .psarc file ${BINPSARC_FILE}: ${err}`);
  }
  //stat vanilla files to make sure they are there
  try { 
    await fs.statAsync(path.join(WORK_PATH, BINPSARC_FILE));
    await fs.statAsync(path.join(WORK_PATH, SPCOMPSARC_FILE));
    api.dismissNotification(NOTIF_ID);
    cleanupSuccessNotify(api);
    setupNotify(api);
    return;
  } catch (err) { //if the files aren't there, cleanup did not succeed
    api.dismissNotification(NOTIF_ID);
    api.showErrorNotification(`Did Not Complete .psarc Cleanup. Please try again.`, 
      `Could not complete cleanup of extracted .psarc files and restoration of vanilla files. Please verify your game files to ensure vanilla .psar files are present.\n ${err}`,
      { allowReport: false }
    );
    setupNotify(api);
    return;
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  if (isFluffyInstalled(api, gameSpec)) {
    reinstallWarningNotify(api);
  }
  // ASYNCHRONOUS CODE ///////////////////////////////////
  await setupNotify(api);
  await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(SAVE_PATH);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, PAK_PATH));
  try { //copy oo2core_9_win64.dll to PSARCTOOL_PATH and PSARCTOOL_EXT_PATH if not present
    await fs.statAsync(path.join(GAME_PATH, PSARCTOOL_PATH, OO2_DLL));
    //log('warn', `Found ${OO2_DLL} in ${PSARCTOOL_PATH}`);
    await fs.statAsync(path.join(__dirname, PSARCTOOL_EXT_PATH, OO2_DLL));
    //log('warn', `Found ${OO2_DLL} in ${path.join(__dirname, 'UnPSARC', OO2_DLL)}`);
  } catch (err) {
    try {
      await fs.copyAsync(path.join(GAME_PATH, OO2_DLL), path.join(GAME_PATH, PSARCTOOL_PATH, OO2_DLL));
      //log('warn', `${OO2_DLL} copied successfully to ${PSARCTOOL_PATH}`);
      await fs.copyAsync(path.join(GAME_PATH, OO2_DLL), path.join(__dirname, PSARCTOOL_EXT_PATH, OO2_DLL));
      //log('warn', `${OO2_DLL} copied successfully to ${path.join(__dirname, PSARCTOOL_EXT_PATH)}`);
    } catch (err) {
      log('error', `Could not copy ${OO2_DLL} to ${PSARCTOOL_PATH} and ${PSARCTOOL_EXT_PATH}: ${err}`);
    }
  }
  const isToolInstalled = await checkForTool(api);
  return isToolInstalled ? Promise.resolve() : download(api, REQUIREMENTS); //*/
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
  context.registerInstaller(`${BUILD_ID}pakbin`, 29, testBuildPakBin, installBuildPakBin);
  context.registerInstaller(BIN_ID, 31, testBin, installBin);
  context.registerInstaller(PAK_ID, 33, testPak, installPak);
  context.registerInstaller(BUILD_ID, 35, testBuild, installBuild);
  context.registerInstaller(SAVE_ID, 37, testSave, installSave);
  context.registerInstaller(CONFIG_ID, 39, testConfig, installConfig);
  context.registerInstaller(PSARCTOOL_ID, 41, testPsarcTool, installPsarcTool);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Extract .psarc Files', () => {
    psarcSetup(context.api);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Cleanup Extracted .psarc Files', () => {
    psarcCleanup(context.api);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open "build\\pc\\main" Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, BIN_PATH)).catch(() => null);
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open PCGamingWiki Page', () => {
    util.opn(PCGAMINGWIKI_URL).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    util.opn(path.join(__dirname, 'CHANGELOG.md')).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Submit Bug Report', () => {
    util.opn(`${EXTENSION_URL}?tab=bugs`).catch(() => null);
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

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(context.api, gameId, mods, forced);
    }); //*/
    context.api.onAsync('did-purge', (profileId) => didPurge(context.api, profileId));
    //context.api.onAsync('did-deploy', (profileId) => didDeploy(context.api, profileId));
  });
  return true;
}

//on purge
async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  GAME_PATH = await getDiscoveryPath(api);
  try {
    await fs.statAsync(path.join(GAME_PATH, PSARCTOOL_PATH, 'pak68'));
    await fs.statAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BIN_FOLDER));
    await psarcCleanup(api);
  } catch (err) {
    log('warn', `Skipping purge cleanup because cleanup folders not found.`);
  }
  return Promise.resolve();
}

//on deploy
async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  await setupNotify(api);
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
