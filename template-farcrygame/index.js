/*///////////////////////////////////////////
Name: Far Cry XXX Vortex Extension
Structure: Far Cry Game (Mod Installer)
Author: ChemBoy1
Version: 0.1.0
Date: 2025-XX-XX
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const Bluebird = require('bluebird');
const winapi = require('winapi-bindings');

const DOCUMENTS = util.getVortexPath("documents");

//Specify all the information about the game
const GAME_ID = "farcryXXX";
const STEAMAPP_ID = "XXX";
const UPLAYAPP_ID = "XXX";
const GAME_NAME = "Far Cry XXX";
const GAME_NAME_SHORT = "FCXXX";

const BIN_PATH = "bin";
const DATA_PATH = "data_win32";
const EXEC_NAME = "XXX.exe";
const FC = 'fcXXX';
const MI_EXEC = "FCXXXModInstaller.exe";
const MIMOD_FOLDER = "ModifiedFilesFCXXX";

const DATA_FOLDER = "Far Cry XXX";
const XML_PAGE_NO = 0;
const XML_FILE_NO = 0;

let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let SAVE_PATH = null;

const EXEC = path.join(BIN_PATH, EXEC_NAME);
const DB_URL = `https://mods.farcry.info/${FC}`;

//Info for mod types and installers
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

const BIN_ID = `${GAME_ID}-binaries`;
const BIN_NAME = "Binaries (Engine Injector)";
const BIN_EXT = ".dll";

const DATA_ID = `${GAME_ID}-data`;
const DATA_NAME = "Game Data";
const DATA_EXTS = [".dat", ".fat"];

const MI_ID = `${GAME_ID}-modinstaller`;
const MI_NAME = "FC Mod Installer";
const MI_PATH = "FCModInstaller";
const MI_FILE = "fcmodinstaller.exe";
const MI_URL = "https://downloads.fcmodding.com/files/FCModInstaller.zip";
const MI_URL_ERR = "https://downloads.fcmodding.com/all/mod-installer/";

const XML_ID = `${GAME_ID}-xml`;
const XML_NAME = "XML Settings Mod";
const XML_FOLDER = path.join(DOCUMENTS, "My Games", DATA_FOLDER);
let USERID_FOLDER = "";
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}
try {
  const ARRAY = fs.readdirSync(XML_FOLDER);
  USERID_FOLDER = ARRAY.find(entry => isDir(XML_FOLDER, entry));
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
}
const XML_PATH = path.join(XML_FOLDER, USERID_FOLDER);
const XML_FILE = "gamerprofile.xml";
const XML_EXT = ".xml";

const MIMOD_ID = `${GAME_ID}-mimod`;
const MIMOD_NAME = "FCMI Mod (.a2/.a3/.a4/.a5/.bin)";
const MIMODA3_ID = `${GAME_ID}-mimoda3`;
const MIMODA3_NAME = "Repacked FCMI Mod";
const MIMOD_PATH = path.join(MI_PATH, MIMOD_FOLDER);

const MIMOD_EXTA2 = ".a2";
const MIMOD_EXTA3 = ".a3";
const MIMOD_EXTA4 = ".a4";
const MIMOD_EXTA5 = ".a5";
const MIMOD_EXTBIN = ".bin";
const MIMOD_FILEXML = "info.xml";
const MIMOD_EXTS = [MIMOD_EXTA2, MIMOD_EXTA3, MIMOD_EXTA4, MIMOD_EXTA5, MIMOD_EXTBIN];

const SAVEMANAGER_ID = `${GAME_ID}-savemanager`;
const SAVEMANAGER_NAME = "FC Save Manager";
const SAVEMANAGER_EXEC = path.join(MI_PATH, "FCSavegameManager.exe");

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const ROOT_FOLDERS = [BIN_PATH, DATA_PATH, 'Support'];
const ROOT_FILES = [''];
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];
const MODTYPE_FOLDERS = [MIMOD_PATH, BIN_PATH, DATA_PATH];

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    //"parameters": PARAMETERS,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "uPlayAppId": UPLAYAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "UPlayAPPId": UPLAYAPP_ID,
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
      "id": BIN_ID,
      "name": BIN_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", BIN_PATH)
    },
    {
      "id": DATA_ID,
      "name": DATA_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", DATA_PATH)
    },
    {
      "id": MI_ID,
      "name": MI_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", MI_PATH)
    },
    {
      "id": MIMOD_ID,
      "name": MIMOD_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", MIMOD_PATH)
    },
    {
      "id": MIMODA3_ID,
      "name": MIMODA3_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", MIMOD_PATH)
    },
    {
      "id": XML_ID,
      "name": XML_NAME,
      "priority": "high",
      "targetPath": XML_PATH
    }, //*/ // outside of the game folder
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      UPLAYAPP_ID,
    ],
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: MI_ID,
    name: MI_NAME,
    logo: 'modinstaller.png',
    executable: () => MI_EXEC,
    requiredFiles: [
      MI_EXEC,
    ],
    relative: true,
    exclusive: true,
  },
  {
    id: `${GAME_ID}-customlaunch`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC,
    requiredFiles: [
      EXEC,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: PARAMETERS,
  },
  {
    id: SAVEMANAGER_ID,
    name: SAVEMANAGER_NAME,
    logo: 'savemanager.png',
    executable: () => SAVEMANAGER_EXEC,
    requiredFiles: [
      SAVEMANAGER_EXEC,
    ],
    relative: true,
    exclusive: true,
  },
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

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

//Find the game installation folder
function makeFindGame(api, gameSpec) {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      `SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\${UPLAYAPP_ID}`,
        'InstallDir');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return () => Promise.resolve(instPath.value);
  } catch (err) {
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  }
}

//Find the save folder (inside Ubisoft Launcher install path)
async function getSavePath() {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      `SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher`,
        'InstallDir');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    const REG_PATH = instPath.value;
    const READ_PATH = path.join(REG_PATH, 'savegames');
    try {
      const ARRAY = fs.readdirSync(READ_PATH);
      USERID_FOLDER = ARRAY.find(entry => isDir(READ_PATH, entry));
    } catch(err) {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    }
    SAVE_PATH = path.join(READ_PATH, USERID_FOLDER, UPLAYAPP_ID);
    return SAVE_PATH;
  } catch (err) {
    log('error', `Could not get Ubisoft Launcher install path from registry to set the Saves directory: ${err}`);
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Mod Installer
function testModInstaller(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === MI_FILE);
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

//Installer install Mod Installer
function installModInstaller(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === MI_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MI_ID };

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

//Installer Test for .a3 files
async function testMiModA3(files, gameId) {
  //xml file will be seen because Vortex extracts naked .a3 files as an archive. We need to repack them.
  const isMod = files.some(file => path.basename(file).toLowerCase() === MIMOD_FILEXML);
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

//Installer install .a3 files
async function installMiModA3(files, destinationPath) {
  const setModTypeInstruction = { type: 'setmodtype', value: MIMODA3_ID };

  //Repack .a3 files since Vortex forcibly extracts them as archives for some reason...
  const szip = new util.SevenZip();
  const archiveName = path.basename(destinationPath, '.installing') + MIMOD_EXTA3;
  const archivePath = path.join(destinationPath, archiveName);
  const rootRelPaths = await fs.readdirAsync(destinationPath);
  await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
  const instructions = [{
    type: 'copy',
    source: archiveName,
    destination: path.basename(archivePath),
  }];
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer Test for mod installer .a2 and .bin mod files
function testMiMod(files, gameId) {
  const isMod = files.some(file => MIMOD_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install mod installer .a2 and .bin mod files
function installMiMod(files) {
  //const modFile = files.find(file => path.extname(file).toLowerCase() === MIMOD_EXTA2 || MIMOD_EXTA3 || MIMOD_EXTBIN);
  const modFile = files.find(file => MIMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MIMOD_ID };

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

//Installer test for root files (not folders)
function testRootFiles(files, gameId) {
  const isMod = files.some(file => ROOT_FILES.includes(path.basename(file)));
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

//Installer install root files (not folders)
function installRootFiles(files) {
  const modFile = files.find(file => ROOT_FILES.includes(path.basename(file)));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);

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
  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file)));
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

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
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

//Installer Test for .dat and .fat files
function testData(files, gameId) {
  const isMod = files.some(file => DATA_EXTS.includes(path.extname(file).toLowerCase()));
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

//Installer install .dat and .fat files
function installData(files) {
  const modFile = files.find(file => DATA_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATA_ID };

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

//Installer Test for .dll files
function testBin(files, gameId) {
  const isMod = files.some(file => path.extname(file).toLowerCase() === BIN_EXT);
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

//Installer install .dll files
function installBin(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === BIN_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
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

//Installer test for xml settings file
function testXml(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === XML_FILE);
  //const isMod = files.some(file => path.extname(file).toLowerCase() === XML_EXT);
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

//Installer install xml settings file
function installXml(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === XML_FILE);
  //const modFile = files.find(file => path.extname(file).toLowerCase() === XML_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: XML_ID };

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

// AUTOMATIC DOWNLOAD FUNCTIONS //////////////////////////////////////////////

//Check if Mod Installer is installed
function isModInstallerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MI_ID);
}

//Check if XML is installed
function isXmlInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === XML_ID);
}

//* Function to auto-download Mod Installer from site
async function downloadModInstaller(api, gameSpec) {
  let isInstalled = isModInstallerInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = MI_NAME;
    const MOD_TYPE = MI_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = MI_URL;
    const ERR_URL = MI_URL_ERR;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const dlInfo = { //Download the mod
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = ERR_URL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//* Function to auto-download XML file from Nexus Mods
async function downloadXml(api, gameSpec) {
  let isInstalled = isXmlInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = XML_NAME;
    const MOD_TYPE = XML_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    let FILE_ID = XML_FILE_NO;  //If using a specific file id because "input" below gives an error
    const PAGE_ID = XML_PAGE_NO;
    const GAME_DOMAIN = GAME_ID;
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
      let FILE = FILE_ID; //use the FILE_ID directly for the correct game store version
      let URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } //
      const dlInfo = { //Download the mod
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
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

//Notify User of Setup instructions for FC Mod Installer
function setupNotify(api) {
  api.sendNotification({
    id: `${GAME_ID}-setup`,
    type: 'warning',
    message: 'FC Mod Installer Usage',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'This extension has automatically downloaded and installed the FC Mod Installer application. This can be used to install mods from the database site linked below.\n'
                + '\n'
                + 'After downloading a file there, drag and drop the zip or file downloaded into Vortex, where it will be placed in the correct folder.\n'
                + 'Next, run the FC Mod Installer using the tool in the Vortex Dashboard tab to launch the application and install the mod.\n'
                + '\n'
                + 'If you have already installed mods from Nexus previously, you may need to disable them in order to use the Mod Installer as it expects unmodified game files.\n'
                + '\n'
                + 'It is also recommended you run the Large Address Aware application in the Dashboard tab and target the game executable to prevent issues with crashing on DX11.\n'
          }, [
            { label: 'Continue', action: () => dismiss() },
            { label: 'Get Mod Installer Mods', action: () => {
              util.opn(DB_URL).catch(err => undefined);
              dismiss();
          }},
          ]);
        },
      },
    ],
  });    
}

//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  setupNotify(api);
  SAVE_PATH = getSavePath();
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  await downloadModInstaller(api, gameSpec);
  //await downloadXml(api, gameSpec);
  await fs.ensureDirWritableAsync(XML_PATH);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
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
  context.registerInstaller(MI_ID, 25, testModInstaller, installModInstaller);
  //context.registerInstaller(`${ROOT_ID}files`, 26, testRootFiles, installRootFiles);
  context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  context.registerInstaller(DATA_ID, 29, testData, installData);
  context.registerInstaller(BIN_ID, 31, testBin, installBin);
  context.registerInstaller(MIMODA3_ID, 33, toBlue(testMiModA3), toBlue(installMiModA3));
  context.registerInstaller(MIMOD_ID, 35, testMiMod, installMiMod);
  context.registerInstaller(XML_ID, 37, testXml, installXml);
  //default to root

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Far Cry Mods Site', () => {
    const openPath = DB_URL;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Far Cry Mod Installer Site', () => {
    const openPath = MI_URL_ERR;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = XML_PATH;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', async () => {
    SAVE_PATH = await getSavePath();
    const openPath = SAVE_PATH;
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
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const lastActiveProfile = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== lastActiveProfile) return;
      return deployNotify(context.api);
    });
  });
  return true;
}

//Notify User to run Mod Merger Utility after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = MI_NAME;
  const MESSAGE = `Use ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Installer',
        action: (dismiss) => {
          runModManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For ${MIMOD_EXTS.join('/')} mods, you must use ${MOD_NAME} to install mod files into the game data.\n`
                + `Use the included tool to launch ${MOD_NAME} (button below, in "Dashboard" tab, or in notification shown after deployment).\n`
          }, [
            {
              label: 'Run Mod Installer', action: () => {
                runModManager(api);
                dismiss();
              }
            },
            { label: 'Get Mod Installer Mods', action: () => {
              util.opn(DB_URL).catch(err => undefined);
              dismiss();
          }},
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

function runModManager(api) {
  const TOOL_ID = MI_ID;
  const TOOL_NAME = MI_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false, shell: true })
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

//export to Vortex
module.exports = {
  default: main,
};
