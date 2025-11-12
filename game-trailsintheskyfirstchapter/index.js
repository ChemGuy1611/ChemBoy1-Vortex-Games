/*///////////////////////////////////////////
Name: Trails in the Sky 1st Chapter Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.0
Date: 2025-11-11
///////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');
const fsPromises = require('fs/promises');
const { readFile } = require('fs');
//const turbowalk = require('turbowalk');

const USER_HOME = util.getVortexPath("home");
//const DOCUMENTS = util.getVortexPath("documents");
//const ROAMINGAPPDATA = util.getVortexPath("appData");
//const LOCALAPPDATA = util.getVortexPath("localAppData");

//Specify all the information about the game
const GAME_ID = "trailsintheskyfirstchapter";
const STEAMAPP_ID = "3375780";
const STEAMAPP_ID_DEMO = "3902570";
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, STEAMAPP_ID_DEMO]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "Trails in the Sky 1st Chapter";
const GAME_NAME_SHORT = "Trails 1st";
const BINARIES_PATH = path.join('.');
const EXEC_NAME = "sora_1st.exe";
const EXEC = path.join(BINARIES_PATH, EXEC_NAME);
const EXEC_XBOX = 'gamelaunchhelper.exe';

const DATA_FOLDER = 'asset';
const ROOT_FOLDERS = [DATA_FOLDER, 'pac',
  'asset_de',
  'asset_en',
  'asset_es',
  'asset_fr',
  'bgm1',
  'bgm2',
  'bgm3',
  'layout',
  'movie',
  'movie_en',
  'scene',
  'script',
  'script_de',
  'script_en',
  'script_es',
  'script_fr',
  'se',
  'ssytem',
  'table',
  'table_de',
  'table_en',
  'table_es',
  'table_fr',
  'vfx',
  'voice',
  'voice_en',
];

let GAME_PATH = null;
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

const PAC_ID = `${GAME_ID}-pac`;
const PAC_NAME = "Pac Files";
const PAC_PATH = path.join('pac', 'steam');
const PAC_EXT = '.pac';
const PAC_EXTS = [PAC_EXT];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

//* Config and Saves
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(USER_HOME, 'Saved Games', 'FALCOM', 'Trails in the Sky 1st Chapter');
const CONFIG_EXTS = [".json"];
const CONFIG_FILES = ["settings.json"];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_PATH = path.join(CONFIG_PATH, 'savedata');
const SAVE_EXTS = [".dat"];
const SAVE_FILES = ["user.dat"];

const PACTOOL_ID = `${GAME_ID}-pacextract`;
const PACTOOL_NAME = "Pac Extractor (Python)";
const PACTOOL_PY = 'sky_extract_pac.py';
const PACTOOL_EXEC = path.join(PAC_PATH, PACTOOL_PY);
const BUNDLED_PACTOOL_PATH = path.join(__dirname, 'assets', PACTOOL_PY);
const DESTINATION_PACTOOL_PATH = path.join(PAC_PATH, PACTOOL_PY);
let pythonInstalled = false;
const runInShell = false;
const BAK_EXT = '.bak';
const CLEANUP_FOLDERS = [
  DATA_FOLDER
];

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];
const MODTYPE_FOLDERS = [PAC_PATH];

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
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      //"supportsSymlinks": false,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": PAC_ID,
      "name": PAC_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", PAC_PATH)
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//3rd party tools and launchers
const tools = [ //accepts: exe, jar, py, vbs, bat
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
  }, //*/
  /*{
    id: PACTOOL_ID,
    name: PACTOOL_NAME,
    logo: 'python_icon.png',
    executable: () => PACTOOL_EXEC,
    requiredFiles: [
      PACTOOL_EXEC,
    ],
    relative: true,
    exclusive: true,
    //shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

function isDir(folder, file) {
  const readFile = path.join(folder, file);
  try {
    /*if (readFile.endsWith(PAC_EXT)) {
      return false;
    }//*/
    const stats = fs.statSync(readFile);
    return stats.isDirectory();
  } catch (err) {
    log('error', `Could not check if "${path.join(folder, file)}" is a folder: ${err}`);
  }
}

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  try {
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch (err) { //this happens if the executable comes back as "undefined", usually caused by the Xbox app locking down the folder
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
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
  if (store === 'xbox' && (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID))) {
      return Promise.resolve({
        launcher: 'xbox',
        addInfo: {
          appId: XBOXAPP_ID,
          parameters: [{ appExecName: XBOXEXECNAME }],
          //parameters: [{ appExecName: XBOXEXECNAME }, PARAMETERS_STRING],
          //launchType: 'gamestore',
        },
      });
  } //*/
  if (store === 'epic' && (DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID))) {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
          appId: EPICAPP_ID,
          //parameters: PARAMETERS,
          //launchType: 'gamestore',
        },
    });
  } //*/
  /*
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
      addInfo: {
        appId: STEAM_ID,
        //parameters: PARAMETERS,
        //launchType: 'gamestore',
      } //
    });
  } //*/
  return Promise.resolve(undefined);
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch (err) {
    return false;
  }
}
async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch (err) {
    return false;
  }
}
//Get correct game version
async function setGameVersion(gamePath) {
  const CHECK = await statCheckAsync(gamePath, EXEC_XBOX);
  if (CHECK) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  } else {
    GAME_VERSION = 'default';
    return GAME_VERSION;
  }
}

const getDiscoveryPath = async (api) => { //get the game's discovered path
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for mod files
function testPac(files, gameId) {
  const isMod = files.some(file => PAC_EXTS.includes(path.extname(file).toLowerCase()));
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

//Install mod files
function installPac(files) {
  const MOD_TYPE = PAC_ID;
  const modFile = files.find(file => PAC_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_TYPE };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  ((file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))));

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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//rename extracted files
async function filesRename(workingPath, files) {
  for (let index = 0; index < files.length; index++) {
    const file = path.join(workingPath, files[index]); //original name
    const newName = file + BAK_EXT;
    try { //rename extracted files
      await fs.statAsync(file);
      await fs.renameAsync(file, newName);
      //log('warn', `Renamed file "${path.basename(file)}" to "${path.basename(newName)}"`);
    } catch (err) {
      log('error', `Could not rename extracted ${PAC_EXT} file "${path.basename(file)}": ${err}`);
    }
  }
}

//Restore extracted file names
async function filesRestore(workingPath, files) {
  for (let index = 0; index < files.length; index++) {
    const file = path.join(workingPath, files[index]);
    const newName = file.replace(BAK_EXT, ''); //original name
    try { //restore file names
      try { //make sure no vanilla file - this usually means the game was updated
        await fs.statAsync(newName);
        await fs.unlinkAsync(file); //delete backup since original present
      } catch (err) { //no vanilla file, safe to rename
        await fs.statAsync(file);
        await fs.renameAsync(file, newName);
        //log('warn', `Renamed file "${path.basename(file)}" to "${path.basename(newName)}"`);
      }
    } catch (err) {
      log('error', `Could not restore filename for "${path.basename(file)}": ${err}`);
    }
  }
}

//Extract game files
async function pacExtract(GAME_PATH, api) {
  const RUN_PATH = path.join(GAME_PATH, PACTOOL_EXEC);
  const WORK_PATH = path.join(GAME_PATH, PAC_PATH);
  const EXTRACTED_FOLDER = path.join(WORK_PATH, DATA_FOLDER);
  const ARGUMENTS = [];
  try { //extract pac files
    try { //copy python script to pac folder if it's not already there
      await fs.statAsync(RUN_PATH);
    } catch (err) {
      try {
        await fs.copyAsync(BUNDLED_PACTOOL_PATH, RUN_PATH);
      } catch (err) {
        log('error', `Could not copy ${PACTOOL_PY} to ${PAC_PATH}: ${err}`);
        return false;
      }
    }
    await api.runExecutable(RUN_PATH, ARGUMENTS, { shell: runInShell, detached: true, suggestDeploy: false });
    log('warn', `Ran extraction for ${PAC_EXT} files`);
  } catch (err) {
    log('error', `Could not extract ${PAC_EXT} files: ${err}`);
    return false;
  }

  try { //stat an extracted folder
    await fs.statAsync(EXTRACTED_FOLDER);
    return true;
  } catch (err) { //if the folder isn't there, the user probably interrupted somehow
    return false;
  }
}

//Copy Extracted folders from pac path to game root
async function foldersCopy(gamePath, workingPath) {
  const files = await fs.readdirAsync(workingPath);
  const folders = files.filter((file) => isDir(workingPath, file));
  for (let index = 0; index < folders.length; index++) {
    const folder = path.join(workingPath, folders[index]);
    const folderRoot = path.join(gamePath, folders[index]);
    try {
      await fs.statAsync(folder);
      await fs.copyAsync(folder, folderRoot);
      await fs.statAsync(folderRoot);
      //log('warn', `Copied extracted folder "${folder}" to "${folderRoot}"`);
    } catch (err) {
      log('error', `Could not copy extracted folder "${folder}": ${err}`);
    }
  }
}

//Cleanup extracted folders in game root and pac path
async function foldersCleanup(gamePath, workingPath) {
  const files = await fs.readdirAsync(workingPath);
  const folders = files.filter((file) => isDir(workingPath, file));
  for (let index = 0; index < folders.length; index++) {
    const folder = path.join(workingPath, folders[index]);
    const folderRoot = path.join(gamePath, folders[index]);
    try { //remove extracted folders
      await fs.statAsync(folder);
      await fsPromises.rmdir(folder, { recursive: true });
      await fs.statAsync(folderRoot);
      await fsPromises.rmdir(folderRoot, { recursive: true });
      //log('warn', `Deleted extracted folders "${folder}" and "${folderRoot}"`);
    } catch (err) {
      log('error', `Could not delete extracted folder "${folder}": ${err}`);
    }
  }
}

//Setup files for modding - Extract, copy folder, rename files
async function pacSetup(api) { //run through setup notification or button
  const NOTIF_ID = `${GAME_ID}-gamesetup`;
  const NOTIF_ID_SUC = `${GAME_ID}-gamesetupsuccess`;
  api.sendNotification({ //notification indicating setup process
    id: NOTIF_ID,
    message: `Extracting and Renaming files and copying folders to game root. This will take a while.`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  GAME_PATH = await getDiscoveryPath(api);
  const WORK_PATH = path.join(GAME_PATH, PAC_PATH);
  await purge(api);
  let EXTRACTED = await pacExtract(GAME_PATH, api);
  if (EXTRACTED) { //copy folder and rename files
    log('warn', `Extraction of all ${PAC_EXT} files complete. Copying "${DATA_FOLDER}" to game root...`);
    await foldersCopy(GAME_PATH, WORK_PATH);
    log('warn', `Copy of "${DATA_FOLDER}" to game root complete. Renaming files...`);
    try {
      let RENAME_FILES = await fs.readdirAsync(WORK_PATH);
      RENAME_FILES = RENAME_FILES.filter(file => file.endsWith(PAC_EXT));
      await filesRename(WORK_PATH, RENAME_FILES);
      log('warn', `Renamed all ${PAC_EXT} files`);
    } catch (err) {
      log('error', `Could not rename ${PAC_EXT} files: ${err}`);
      await deploy(api);
      api.dismissNotification(NOTIF_ID);
      api.showErrorNotification(`Could not complete extraction of ${PAC_EXT} files. Please try again.`, `Could not complete extraction of ${PAC_EXT} files. Please try again. This error likely occured due to closing the terminal window before extraction was complete.\n\n${err}`, { allowReport: false });
      return;
    }
    await deploy(api);
    api.dismissNotification(NOTIF_ID);
    api.sendNotification({ //notification indicating success
      id: NOTIF_ID_SUC,
      message: `Successfully Extracted and Renamed ${PAC_EXT} Files and copied "${DATA_FOLDER}" to game root.`,
      type: 'success',
      noDismiss: false,
      allowSuppress: true,
    });
    return;
  }
  await deploy(api);
  api.dismissNotification(NOTIF_ID);
  api.showErrorNotification(`Could not complete extraction of ${PAC_EXT} files. Please try again.`, `Could not complete extraction of ${PAC_EXT} files. Please try again. This error likely occured due to closing the terminal window before extraction was complete.`, { allowReport: false });
  return;
}

//Cleanup extracted asset folder and restore file names
async function pacCleanup(api) {
  const NOTIF_ID = `${GAME_ID}-gamecleanup`;
  const NOTIF_ID_SUC = `${GAME_ID}-gamecleanupsuccess`;
  api.sendNotification({ //notification indicating cleanup process
    id: NOTIF_ID,
    message: `Cleaning up extracted folders and restoring ${PAC_EXT} file names. This will take a few seconds.`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  await purge(api);
  GAME_PATH = await getDiscoveryPath(api);
  const WORK_PATH = path.join(GAME_PATH, PAC_PATH);
  try { //delete extracted folder and restore file names
    //delete extracted folders in game root and pac path
    log('warn', `Cleaning up extracted folders...`);
    await foldersCleanup(GAME_PATH, WORK_PATH);
    //restore file names
    let RESTORE_FILES = await fs.readdirAsync(WORK_PATH);
    RESTORE_FILES = RESTORE_FILES.filter(file => file.endsWith(BAK_EXT));
    await filesRestore(WORK_PATH, RESTORE_FILES);
    log('warn', `Restored all ${PAC_EXT} file names`);
  } catch (err) {
    log('error', `Could not restore names of all ${PAC_EXT} files: ${err}`);
    await setupNotify(api);
    await deploy(api);
    api.showErrorNotification(`Could not restore ${PAC_EXT} files. Please try again.`, `Could not complete restoration of ${PAC_EXT} files. Please try again.\n\n${err}`, { allowReport: false });
    return;
  }
  await setupNotify(api);
  await deploy(api);
  api.dismissNotification(NOTIF_ID);
  api.sendNotification({ //notification indicating success
    id: NOTIF_ID_SUC,
    message: `Successfully Cleaned Extracted game data and restored ${PAC_EXT} file names.`,
    type: 'success',
    noDismiss: false,
    allowSuppress: true,
  });
  return;
}

//Cleanup extracted asset folder and restore file names - for Purge event
async function pacCleanupPurge(api) {
  const NOTIF_ID = `${GAME_ID}-gamecleanup`
  api.sendNotification({ //notification indicating cleanup process
    id: NOTIF_ID,
    message: `Cleaning up extracted "${DATA_FOLDER}" folder and restoring ${PAC_EXT} file names. This will take a few seconds.`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  GAME_PATH = await getDiscoveryPath(api);
  const WORK_PATH = path.join(GAME_PATH, PAC_PATH);
  try { //delete extracted folders and restore file names
    //delete extracted folders in game root and pac path
    await foldersCleanup(GAME_PATH, WORK_PATH);
    //restore file names
    let RESTORE_FILES = await fs.readdirAsync(WORK_PATH);
    RESTORE_FILES = RESTORE_FILES.filter(file => file.endsWith(BAK_EXT));
    await filesRestore(WORK_PATH, RESTORE_FILES);
    log('warn', `Restored all ${PAC_EXT} file names`);
  } catch (err) {
    log('error', `Could not restore names of all ${PAC_EXT} files: ${err}`);
    api.showErrorNotification(`Could not restore ${PAC_EXT} files. Please try again.`, `Could not complete restoration of ${PAC_EXT} files. Please try again.\n\n${err}`, { allowReport: false });
  }
  await setupNotify(api);
  api.dismissNotification(NOTIF_ID);
}

//Notify User of Setup instructions
async function setupNotify(api) {
  GAME_PATH = await getDiscoveryPath(api);
  try { //see if extracted folder is present. Skip notification if it is.
    await fs.statAsync(path.join(GAME_PATH, DATA_FOLDER));
    log('warn', `"${DATA_FOLDER}" folder found. Skipping setup notification.`);
  }
  catch (err) { //*/
    const NOTIF_ID = `${GAME_ID}-setuprequired`;
    const MESSAGE = `Game Data Extraction Required`;
    api.sendNotification({
      id: NOTIF_ID,
      type: 'warning',
      message: MESSAGE,
      allowSuppress: true,
      actions: [
        {
          title: 'Extract Game Files',
          action: (dismiss) => {
            dismiss();
            pacSetup(api);
          },
        },
        {
          title: 'More',
          action: (dismiss) => {
            api.showDialog('question', MESSAGE, {
              text: `For mods to work properly, you must extract the game ${PAC_EXT} files, rename those files, and copy the extracted "${DATA_FOLDER}" folder to the game root.\n`
                  + `\n`
                  + `This process must be done initially and after any game updates. The process will take a while. Do not close the terminal window.\n`
                  + `\n`
                  + `Click the button below to run the Python script "${PACTOOL_PY}" to extract ${PAC_EXT} files, rename them, and copy the "${DATA_FOLDER}" folder.\n`
                  + `\n`
                  + `You must have Python installed for this to work. You can download Python from the Microsoft Store if you don't have it installed.\n`
            }, [
                {
                  label: 'Extract Game Files', action: () => {
                    dismiss();
                    pacSetup(api);
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

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  //GAME_VERSION = setGameVersion(GAME_PATH);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  /*await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(SAVE_PATH); //*/
  await setupNotify(api);
  try { //copy python script to pac folder if it's not already there
    await fs.statAsync(path.join(GAME_PATH, DESTINATION_PACTOOL_PATH));
  } catch (err) {
    try {
      await fs.copyAsync(BUNDLED_PACTOOL_PATH, path.join(GAME_PATH, DESTINATION_PACTOOL_PATH));
    } catch (err) {
      log('error', `Could not copy ${PACTOOL_PY} to ${PAC_PATH}: ${err}`);
    }
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
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

  /*register mod types explicitly
  context.registerModType(CONFIG_ID, 60, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, CONFIG_PATH), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  ); //
  context.registerModType(SAVE_ID, 60, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, SAVE_PATH), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  ); //*/
  
  //register mod installers
  context.registerInstaller(PAC_ID, 25, testPac, installPac);
  context.registerInstaller(ROOT_ID, 27, testRoot, installRoot);
  //context.registerInstaller(CONFIG_ID, 43, testConfig, installConfig);
  //context.registerInstaller(SAVE_ID, 45, testSave, installSave);
  

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Extract Game Files`, async () => {
    await pacSetup(context.api);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Cleanup Extracted Game Files`, async () => {
    await pacCleanup(context.api);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = CONFIG_PATH;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    const openPath = SAVE_PATH;
    util.opn(openPath).catch(() => null);
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
    const openPath = DOWNLOAD_FOLDER;
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
    /*context.api.onAsync('did-purge', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return didPurge(context.api, profileId);
    }); //*/
    //context.api.onAsync('did-deploy', (profileId) => didDeploy(context.api, profileId));
  });
  return true;
}

async function didPurge(api, profileId) { //run on mod purge
  GAME_PATH = await getDiscoveryPath(api);
  try {
    await fs.statAsync(path.join(GAME_PATH, DATA_FOLDER));
    await pacCleanupPurge(api);
  } catch (err) {
    log('warn', `Skipping "${DATA_FOLDER}" folder cleanup. Folder not found.`);
  }
  return Promise.resolve();
}

//export to Vortex
module.exports = {
  default: main,
};
