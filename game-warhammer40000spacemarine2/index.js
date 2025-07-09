/*////////////////////////////////////////////////
Name: WH40K Space Marine 2 Vortex Extension
Structure: Custom Game Data
Author: ChemBoy1
Version: 0.3.3
Date: 2025-05-14
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const STEAMAPP_ID = "2183900";
const EPICAPP_ID = "bb6054d614284c39bb203ebe134e5d79";
const GOGAPP_ID = "";
const XBOXAPP_ID = "";
const XBOXEXECNAME = "";
const GAME_ID = "warhammer40000spacemarine2";
const EXEC = "Warhammer 40000 Space Marine 2.exe";
const EXEC_BIN = "client_pc\\root\\bin\\pc\\Warhammer 40000 Space Marine 2 - Retail.exe";
const GAME_NAME = "Warhammer 40,000: Space Marine 2";
const GAME_NAME_SHORT = " WH40K Space Marine 2";
let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Info for mod types and installers
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config (LocalAppData)";
let USERID_FOLDER = "";
const LOCALAPPDATA = util.getVortexPath('localAppData');
const CONFIG_PATH = path.join(LOCALAPPDATA, "Saber", "Space Marine 2");
//const CONFIG_FOLDER = path.join(LOCALAPPDATA, "Saber", "Space Marine 2", "storage", "steam", "user");
/*try {
  const CONFIG_ARRAY = fs.readdirSync(CONFIG_FOLDER);
  USERID_FOLDER = CONFIG_ARRAY.find((element) => 
  ((/[a-z]/i.test(element) === false))
   );
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
}
const CONFIG_PATH =  path.join(CONFIG_FOLDER, USERID_FOLDER, "Main", "config");
const CONFIG_EXT = ".cfg"; //*/

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
const BINARIES_PATH = path.join("client_pc", "root", "bin", "pc");

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";
const ROOT_FOLDERS = ["client_pc", "server_pc"];

const LOCAL_ID = `${GAME_ID}-local`;
const LOCAL_NAME = "Local (Loose)";
const LOCAL_PATH = path.join("client_pc", "root");
const LOCAL_FILE = "local";

const LOCALSUB_ID = `${GAME_ID}-localsub`;
const LOCALSUB_NAME = "Local (Loose Subfolder)";
const LOCALSUB_PATH = path.join("client_pc", "root", "local");
const LOCALSUB_FOLDERS = ["ssl", "video", "textures", "presets", "texts", "ui"]; // <-- Update to incorporate all subfolders 

const PAK_ID = `${GAME_ID}-pak`;
const PAK_NAME = "Paks";

const PAK_PATH = path.join("client_pc", "root", "mods");
const PAK_EXT = [".pak"];

//for Integration Studio
const INTEGRATION_STUDIO_ID = `${GAME_ID}-integrationstudio`;
const INTEGRATION_STUDIO_NAME = "Integration Studio";
const INTEGRATION_STUDIO_PATH = path.join('client_pc', 'root');
const INTEGRATION_STUDIO_EXE = "IntegrationStudio.exe";
const IS_EXEPATH = path.join(INTEGRATION_STUDIO_PATH, 'tools', 'ModEditor', INTEGRATION_STUDIO_EXE);
const PAK_PATH_VANILLA = path.join("client_pc", "root", "paks", "client", "default");
const RESOURCE_PAK = 'default_other.pak';
const INTEGRATION_STUDIO_RESOURCE_PATH = path.join(PAK_PATH_VANILLA, RESOURCE_PAK);
const INTEGRATION_STUDIO_URL = 'https://drive.usercontent.google.com/u/0/uc?id=1zw1424H_kDHx2oO-KJKi_8R-cJoUOrDm&export=download';
const INTEGRATION_STUDIO_URL_ERROR = 'https://drive.google.com/file/d/1zw1424H_kDHx2oO-KJKi_8R-cJoUOrDm/edit';
const INTEGRTION_STUDIO_PAGEID = 0;
const INTEGRTION_STUDIO_FILEID = 0;
const INTEGRATION_STUDIO_URL_OFFICIAL = 'https://prismray.io/games/spacemarine2/mods/modding-toolset-for-space-marine-2'; //requires PROS login

const MOD_PATH = PAK_PATH;
const REQ_FILE = EXEC;

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
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
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${BINARIES_PATH}`
    },
    /*{
      "id": CONFIG_ID,
      "name": "Config (LocalAppData)",
      "priority": "high",
      "targetPath": CONFIG_PATH
    }, //*/
    {
      "id": PAK_ID,
      "name": PAK_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PAK_PATH}`
    },
    {
      "id": LOCAL_ID,
      "name": LOCAL_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${LOCAL_PATH}`
    },
    {
      "id": LOCALSUB_ID,
      "name": LOCALSUB_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${LOCALSUB_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": INTEGRATION_STUDIO_ID,
      "name": INTEGRATION_STUDIO_NAME,
      "priority": "low",
      "targetPath": `{gamePath}\\${INTEGRATION_STUDIO_PATH}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
      //GOGAPP_ID,
      //XBOXAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: "SkipLauncher",
    name: "Skip Launcher",
    logo: `exec.png`,
    executable: () => EXEC_BIN,
    requiredFiles: [EXEC_BIN],
    detach: true,
    relative: true,
    exclusive: true,
    //defaultPrimary: true,
    //parameters: []
  }, //*/
  {
    id: INTEGRATION_STUDIO_ID,
    name: INTEGRATION_STUDIO_NAME,
    logo: 'IS.png',
    executable: () => IS_EXEPATH,
    requiredFiles: [IS_EXEPATH],
    detach: true,
    relative: true,
    exclusive: false
  }
];

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
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
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

//Check if Integration Studio is installed
function isIntegrationStudioInstalled(api) {
  const state = api.getState();
  const mods = state.persistent.mods[GAME_ID] || {};
  return Object.keys(mods).some(id => mods[id]?.type === INTEGRATION_STUDIO_ID);
}

//Notification if Config, Save, and Creations folders are not on the same partition
function notifyIntegrationStudio(api) {
  let isInstalled = isIntegrationStudioInstalled(api);
  const NOTIF_ID = `${GAME_ID}-integrationstudio`;
  const MESSAGE = 'Integration Studio Important Info';
  if (isInstalled) {
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
              text: `Vortex detected that you have installed the Integration Studio (IS) mod toolkit for Space Marine 2.\n`
                  + `Please note the following information related to using IS in Vortex:\n`
                  + `\n`
                  + `- During installation of IS, Vortex will automatically extract the resource file "${RESOURCE_PAK}" and add it to the mod staging folder.\n`
                  + `- After each game update, you must Reinstall the IS mod to refresh the extracted resource file.\n`
                  + `- You can use the button below to open the IS download page. Note that a PROS account login is required to download the mod kit.\n`
                  + `\n`
            }, [
              { label: 'Acknowledge', action: () => dismiss() },
              {
                label: 'Open IS Download Page', action: () => {
                  util.opn(INTEGRATION_STUDIO_URL_OFFICIAL).catch(() => null);
                  dismiss();
                }
              },
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

//Test for IS installer
function testIntegrationStudio(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === INTEGRATION_STUDIO_EXE));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    return Promise.resolve({ supported: false, requiredFiles: [] })
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install IS installer
async function installIntegrationStudio(files, tempFolder, api) {
  const setModTypeInstruction = { type: 'setmodtype', value: INTEGRATION_STUDIO_ID };
  GAME_PATH = getDiscoveryPath(api);
  const resourcePath = path.join(GAME_PATH, INTEGRATION_STUDIO_RESOURCE_PATH);
  try {
    await fs.statAsync(resourcePath);
    const sevenZip = new util.SevenZip();
    const destination = path.join(tempFolder, 'mods_source');
    const zipOp = await sevenZip.extractFull(resourcePath, destination);
    if (zipOp?.code !== 0) throw new Error('7zip extraction failed');
    const paths = await getAllFiles(destination);
    files = [ ...files, ...paths.map(p => p.replace(`${tempFolder}${path.sep}`, ''))];
  }
  catch(err) {
    log('error', 'Error extracting Integration Studio resources: ' + err);
  }

  // Now we extract all the files from the IS archive, plus the unpacked PAK file into the staging folder.
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

async function getAllFiles(dirPath) {
  let results = [];
  try {
    const entries = await fs.readdirAsync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.statAsync(fullPath);
      if (stats.isDirectory()) {
        // Recursively get files from subdirectories
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else {
        // Add file to results
        results.push(fullPath);
      }
    }
  } catch (err) {
    log('error', `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

//Installer test for Root folder files
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

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
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

//Installer test for Root folder files
function testLocal(files, gameId) {
  const isMod = files.some(file => path.basename(file) === LOCAL_FILE);
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

//Installer install Root folder files
function installLocal(files) {
  const modFile = files.find(file => path.basename(file) === LOCAL_FILE);
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOCAL_ID };

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

//Installer test for Root folder files
function testLocalSub(files, gameId) {
  const isMod = files.some(file => LOCALSUB_FOLDERS.includes(path.basename(file)));
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

//Installer install Root folder files
function installLocalSub(files) {
  const modFile = files.find(file => LOCALSUB_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOCALSUB_ID };

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

//Test for save files
function testPak(files, gameId) {
  const isMod = files.some(file => PAK_EXT.includes(path.extname(file).toLowerCase()))
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
function installPak(files) {
  const modFile = files.find(file => PAK_EXT.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PAK_ID };

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
function testBinaries(files, gameId) {
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
function installBinaries(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };
  
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

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  await fs.ensureDirWritableAsync(path.join(discovery.path, BINARIES_PATH));
  await fs.ensureDirWritableAsync(path.join(discovery.path, LOCALSUB_PATH));
  //await fs.ensureDirWritableAsync(path.join(discovery.path, INTEGRATION_STUDIO_PATH));
  notifyIntegrationStudio(api);
  return fs.ensureDirWritableAsync(path.join(discovery.path, PAK_PATH));
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
  context.registerInstaller(INTEGRATION_STUDIO_ID, 25, testIntegrationStudio, (files, temp) => installIntegrationStudio(files, temp, context.api));
  context.registerInstaller(ROOT_ID, 26, testRoot, installRoot);
  context.registerInstaller(LOCAL_ID, 27, testLocal, installLocal);
  context.registerInstaller(LOCALSUB_ID, 29, testLocalSub, installLocalSub);
  context.registerInstaller(PAK_ID, 31, testPak, installPak);
  context.registerInstaller(BINARIES_ID, 33, testBinaries, installBinaries); //fallback to binaries folder

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open IS Download Page (Login Required)', () => {
    const openPath = INTEGRATION_STUDIO_URL_OFFICIAL;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Binaries Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, BINARIES_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Local (Loose) Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, LOCALSUB_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, PAK_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Local AppData Folder', () => {
    const openPath = CONFIG_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Crash Reports Folder', () => {
    const openPath = path.join(CONFIG_PATH, "client", "reports");
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
    //context.api.onAsync('did-deploy', (profileId) => didDeploy(context.api, profileId));
  });
  return true;
}

async function didDeploy(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  notifyIntegrationStudio(api);
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
