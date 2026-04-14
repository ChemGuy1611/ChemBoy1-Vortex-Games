/*
Name: Horizon Zero Dawn Remastered Vortex Extension
Author: ChemBoy1
Version: 0.1.2
Date: 11/07/2024
*/

//import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const winapi = require('winapi-bindings'); //gives access to the Windows registry

//Specify all the information about the game
const GAME_ID = "horizonzerodawnremastered";
const STEAMAPP_ID = "2561580";
const EPICAPP_ID = ""; // NOT on egdata.app yet - https://egdata.app/offers/ea784aaca7084a2792d961faa0f5d5df/builds
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const EXEC = "HorizonZeroDawnRemastered.exe";
const GAME_NAME = "Horizon Zero Dawn Remastered";
const GAME_NAME_SHORT = "Horizon ZD Remastered";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1077"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Horizon_Zero_Dawn_Remastered";

let STAGING_FOLDER = ''; //Vortex staging folder path
let DOWNLOAD_FOLDER = ''; //Vortex download folder path
let GAME_PATH = ''; //Game installation path
let GAME_VERSION = ''; //Game version
let modManagerInstalled = false;

//Info for mod types and installers
const MODMANAGER_ID = `${GAME_ID}-modmanager`;
const MODMANAGER_NAME = "DS2 Mod Manager";
const MODMANAGER_STRING = 'HFW Mod Manager';
const MODMANAGER_EXEC = 'HFW_MM.exe';
const MODMANAGER_PAGE_NO = 137;
const MODMANAGER_FILE_NO = 762;
const MODMANAGER_DOMAIN = 'horizonforbiddenwest';

const MANAGERMOD_ID = `${GAME_ID}-managermod`;
const MANAGERMOD_NAME = "DS2 Manager Mod";
const MANAGERMOD_PATH = path.join('mods');
const MANAGERMOD_EXTS = ['.core', '.stream'];
const MANAGERMOD_FILES = ['modinfo.json'];

const SAVE_ID = `${GAME_ID}-save`
const SAVE_EXT = '.dat'
const userDocsValue = util.getVortexPath('documents');
const userDocsPathString = userDocsValue.replace(/x00s/g, '');
const SAVE_FOLDER = path.join(userDocsPathString, 'Horizon Zero Dawn Remastered');
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
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);
const CONFIG_PATH = SAVE_PATH;

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];

let MODTYPE_FOLDERS = [MANAGERMOD_PATH];
const IGNORE_CONFLICTS = [path.join('**', 'changelog*'), path.join('**', 'readme*')];
const IGNORE_DEPLOY = [path.join('**', 'changelog*'), path.join('**', 'readme*')];

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
      //"epicAppId": EPICAPP_ID,
      "compatibleDownloads": ['horizonzerodawn'],
      "supportsSymlinks": true,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"EpicAPPId": EPICAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": MANAGERMOD_ID,
      "name": MANAGERMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', MANAGERMOD_PATH)
    },
    {
      "id": MODMANAGER_ID,
      "name": MODMANAGER_NAME,
      "priority": "low",
      "targetPath": '{gamePath}'
    },
    {
      "id": SAVE_ID,
      "name": "Save Game (Documents)",
      "priority": "high",
      "targetPath": SAVE_PATH
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
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
    detach: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
  {
    id: MODMANAGER_ID,
    name: MODMANAGER_NAME,
    logo: `modmanager.png`,
    executable: () => MODMANAGER_EXEC,
    requiredFiles: [MODMANAGER_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
    //defaultPrimary: true,
    //parameters: [],
  }, //*/
];

//Set mod type priorities
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

async function getAllFiles(dirPath) {
  let results = [];
  try {
    const entries = await fs.readdirAsync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.statAsync(fullPath);
      if (stats.isDirectory()) { // Recursively get files from subdirectories
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else { // Add file to results
        results.push(fullPath);
      }
    }
  } catch (err) {
    log('warn', `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

const getDiscoveryPath = (api) => { //get the game's discovered path
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

function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//convert path placeholders to actual values
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Get mod path
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  /*using registry - requires winapi-bindings
  try {
    const instPath = winapi.RegGetValue(
      INSTALL_HIVE,
      INSTALL_KEY,
      INSTALL_VALUE
    );
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return () => Promise.resolve(instPath.value);
  } catch (err) { //*/
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  //}
} //*/

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
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

// MOD INSTALLER FUNCTIONS //////////////////////////////////////////////////////////////

//test for HFW MM files/exts
function testManagerMod(files, gameId) {
  const isInfo = files.some(file => MANAGERMOD_FILES.includes(path.basename(file).toLowerCase()));
  const isExt = files.some(file => MANAGERMOD_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isInfo || isExt );

  // Test for a mod installer
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
  supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: []
  });
}

//Install Mod Manager mod (unzipped in folder)
function installManagerMod(files, fileName) {
  const MOD_NAME = path.basename(fileName);
  let MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*/gi, '');
  const setModTypeInstruction = { type: 'setmodtype', value: MANAGERMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep)));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//test whether to use mod installer
function testSave(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT) !== undefined;
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

//mod installer instructions
function installSave(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    (
     (file.indexOf(rootPath) !== -1) &&
     (!file.endsWith(path.sep))
    )
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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if HFW ModManager is installed
async function isModManagerInstalled(api) {
  try {
    GAME_PATH = getDiscoveryPath(api);
    await fs.statAsync(path.join(GAME_PATH, MODMANAGER_EXEC));
    return true;
  } catch (err) {
    return false;
  }
}

//* Function to auto-download HFW MM from Nexus Mods
async function downloadModManager(api, check = true) {
  GAME_PATH = getDiscoveryPath(api);
  const DOWNLOAD_FOLDER = selectors.downloadPathForGame(api.getState(), 'horizonforbiddenwest');
  let isInstalled = await isModManagerInstalled(api);
  if (!isInstalled || !check) {
    const MOD_NAME = MODMANAGER_NAME;
    const MOD_TYPE = MODMANAGER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = MODMANAGER_PAGE_NO;
    const FILE_ID = MODMANAGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = MODMANAGER_DOMAIN;
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
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //*Only start-download with Promise
      return new Promise((resolve, reject) => {
        api.events.emit('start-download', [URL], {}, undefined,
          async (error, dlid) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            try { //find the file in Download and copy it to the game folder
              api.sendNotification({ //notification indicating copy process
                id: `${NOTIF_ID}-copy`,
                message: `Copying ${MOD_NAME} executable to game folder`,
                type: 'activity',
                noDismiss: true,
                allowSuppress: false,
              });
              let files = await fs.readdirAsync(DOWNLOAD_FOLDER);
              files = files.filter(file => ( path.basename(file).includes(MODMANAGER_STRING) && (path.extname(file).toLowerCase() === '.exe') ))
                .sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                .reverse();
              const copyFile = files[0];
              if (copyFile === undefined) {
                throw new util.UserCanceled(`No ${MOD_NAME} download file found`);
              } //*/
              await fs.statAsync(path.join(DOWNLOAD_FOLDER, copyFile));
              const source = path.join(DOWNLOAD_FOLDER, copyFile);
              const destination = path.join(GAME_PATH, MODMANAGER_EXEC);
              await fs.copyAsync(source, destination, { overwrite: true });
              api.dismissNotification(NOTIF_ID);
              api.dismissNotification(`${NOTIF_ID}-copy`);
              api.sendNotification({ //notification copy success
                id: `${NOTIF_ID}-success`,
                message: `Successfully copied ${MOD_NAME} executable to game folder`,
                type: 'success',
                noDismiss: false,
                allowSuppress: true,
              });
            } catch (err) {
              const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
              api.showErrorNotification(`Failed to download and copy ${MOD_NAME} executable`, err, { allowReport: false });
              util.opn(errPage).catch(() => null);
              return reject(err);
            }
            finally {
              api.dismissNotification(NOTIF_ID);
              api.dismissNotification(`${NOTIF_ID}-copy`);
              return resolve();
            }
          },
          'never',
          { allowInstall: false },
        );
      });
    } catch (err) { //Show the user the download page if the download and copy process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download and copy ${MOD_NAME} executable`, err, { allowReport: false });
      util.opn(errPage).catch(() => null);
      api.dismissNotification(NOTIF_ID);
      api.dismissNotification(`${NOTIF_ID}-copy`);
    }
  }
} //*/

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User to run Mod Manager after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = 'HFW MM';
  const MESSAGE = `Run ${MOD_NAME} after Deploy`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: `Run ${MOD_NAME}`,
        action: (dismiss) => {
          runManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You must use ${MOD_NAME} to install .core/.stream mods after installing with Vortex.\n`
                + `\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
                + `Select the mod options you want, then click the "Pack Mods" button.\n`
          }, [
            { 
              label: `Run ${MOD_NAME}`, action: () => {
                runManager(api);
                dismiss();
              }
            }, //*/
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

//Notify User to run Mod Manager to restore vanilla files on purge
function purgeNotify(api) {
  const NOTIF_ID = `${GAME_ID}-purge-notification`;
  const MOD_NAME = 'HFW MM';
  const MESSAGE = `Run ${MOD_NAME} To Restore Files`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: `Run ${MOD_NAME}`,
        action: (dismiss) => {
          runManager(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `\n`
                + `Vortex just detected that you have purged mods.\n`
                + `If you wish to restore the game to a vanilla state, you must run ${MOD_NAME} and click the "Restore Files" button.\n`
                + `\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            { 
              label: `Run ${MOD_NAME}`, action: () => {
                runManager(api);
                dismiss();
              }
            }, //*/
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

function runManager(api) {
  let TOOL_ID =  MODMANAGER_ID;
  let TOOL_NAME = MODMANAGER_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], 
        { 
          //cwd: path.dirname(TOOL_PATH),
          detach: true, 
          //env: { 'PATH': process.env.PATH },
          //shell: true, 
          suggestDeploy: false 
        })
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

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  await downloadModManager(api, true);
  await fs.ensureDirWritableAsync(SAVE_PATH);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
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
  context.registerInstaller(MANAGERMOD_ID, 35, testManagerMod, installManagerMod);
  context.registerInstaller(`${GAME_ID}-save`, 45, testSave, installSave);

  //register actions
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config/Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open PCGamingWiki Page', () => {
    util.opn(PCGAMINGWIKI_URL).catch(() => null);
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
    const api = context.api;
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      modManagerInstalled = await isModManagerInstalled(context.api);
      if (!modManagerInstalled) {
        await downloadModManager(context.api, true);
      }
      deployNotify(context.api);
      return Promise.resolve();
    });
    context.api.onAsync('did-purge', async (profileId) => { 
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      modManagerInstalled = await isModManagerInstalled(context.api);
      if (!modManagerInstalled) {
        await downloadModManager(context.api, true);
      }
      purgeNotify(context.api);
      return Promise.resolve();
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
