/*////////////////////////////////////////////
Name: Marvel's Spider-Man 2 Vortex Extension
Structure: 3rd-Party Mod Manager (Overstrike)
Author: ChemBoy1
Version: 0.2.0
Date: 2026-03-06
////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

const DOCUMENTS = util.getVortexPath("documents");

//Specify all information about the game
const STEAMAPP_ID = "2651280";
const EPICAPP_ID = ""; // not on egdata.app yet - https://egdata.app/offers/5143c451be9b4e1ab9f3a0296d0bf5e7/builds
const GAME_ID = "marvelsspiderman2";
const EXEC = "Spider-Man2.exe";
const GAME_NAME = "Marvel's Spider-Man 2";
const GAME_NAME_SHORT = "Spider-Man 2";
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Marvel's_Spider-Man_2";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1166"; //Nexus link to this extension. Used for links

let GAME_PATH = "";
let GAME_VERSION = "";
let STAGING_FOLDER = "";
let DOWNLOAD_FOLDER = "";
let USERID_FOLDER = "";

const STEAM_FILE = 'steam_api64.dll';

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";

const OVERSTRIKE_ID = `${GAME_ID}-overstrike`;
const OVERSTRIKE_NAME = "Overstrike";
const OVERSTRIKE_EXEC = "overstrike.exe";
const OS_PAGE_NO = 1;
const OS_FILE_NO = 2206;

const OSMOD_ID = `${GAME_ID}-osmod`;
const OSMOD_NAME = "Overstrike Mod";
const OSMOD_FOLDER = "Mods Library";
const OSMOD_PATH = OSMOD_FOLDER;
const OSMOD_EXTS = ['.smpcmod', '.suit', '.suit_style', '.stage', '.modular', '.script']; //add new exts as needed

const TOC_FILE = "toc";
const TOC_FILE_BAK = "toc.BAK";

const SAVE_FOLDER = path.join(DOCUMENTS, 'Marvel\'s Spider-Man 2');
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

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": `.`,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
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
      "id": OSMOD_ID,
      "name": OSMOD_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', OSMOD_PATH)
    },
    {
      "id": OVERSTRIKE_ID,
      "name": OVERSTRIKE_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
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

//launchers and 3rd party tools
const tools = [
  {
    id: OVERSTRIKE_ID,
    name: OVERSTRIKE_NAME,
    logo: "overstrike.png",
    executable: () => OVERSTRIKE_EXEC,
    requiredFiles: [OVERSTRIKE_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
];

// BASIC EXTENSION FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
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

//Set mod type priorities
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

function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace string placeholders with actual folder paths
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

//Set launcher requirements
async function requiresLauncher(gamePath, store) {

  if (store === 'steam') {
      return Promise.resolve({
          launcher: 'steam',
      });
  }
  /*
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  }
  //*/
  return Promise.resolve(undefined);
}

async function setGameVersion(gamePath) {
  const CHECK = await statCheckAsync(gamePath, STEAM_FILE);
  if (CHECK) {
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  }
  GAME_VERSION = 'other';
  return GAME_VERSION;
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

// AUTO-DOWNLOAD FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Check if Overstrike is installed
function isOverstrikeInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === OVERSTRIKE_ID);
}

//* Function to auto-download BepInExCfgMan from a Nexus Mods page
async function downloadOverstrike(api, gameSpec) {
  let isInstalled = isOverstrikeInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = OVERSTRIKE_NAME;
    const MOD_TYPE = OVERSTRIKE_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = OS_PAGE_NO;
    const FILE_ID = OS_FILE_NO;  //If using a specific file id because "input" below gives an error
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
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err, { allowReport: false });
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// MOD INSTALLER FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Installer test for Overstrike
function testOverstrike(files, gameId) {
  const isOverstrike = files.some(file => (path.basename(file).toLowerCase() === OVERSTRIKE_EXEC));
  let supported = (gameId === spec.game.id) && isOverstrike;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Overstrike
function installOverstrike(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === OVERSTRIKE_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: OVERSTRIKE_ID };

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

//Installer test for mod files
function testOsMod(files, gameId) {
  const isMod = files.some(file => OSMOD_EXTS.includes(path.extname(file).toLowerCase()));
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
function installOsMod(files) {
  const modFile = files.find(file => OSMOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: OSMOD_ID };

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

//Notify User of Setup instructions
function updateNotify(api) {
  const NOTIF_ID = `${GAME_ID}-update-notification`;
  const MESSAGE = `Verify Game Files after Update`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      /*
      {
        title: 'Verify Game Files',
        action: (dismiss) => {
          verifyGameFiles(api);
          dismiss();
        },
      },
      //*/
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You must verify the game files after an update to avoid crashing with mods installed.\n`
                + `Use the button below to verify the game files.\n`
                + `\n`
                + `NOTE: This will only work with the Steam version of the game.\n`
                + `EGS version needs to delete 'toc' and 'toc.BAK' files manually, then verify game files in EGS app.\n`
                + `\n`
                + `You must reinstall mods in Overstrike after verifying game files.\n`
          }, [
            {
              label: 'Verify Game Files', action: () => {
                verifyGameFiles(api);
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

//Notify User to run Overstrike after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = OVERSTRIKE_NAME;
  const MESSAGE = `Run Overstrike after Deploy`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Overstrike',
        action: (dismiss) => {
          runOverstrike(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Run Overstrike to Enable Mods', {
            text: `You must use ${MOD_NAME} to enable mods after installing with Vortex.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run Overstrike', action: () => {
                runOverstrike(api);
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

function runOverstrike(api) {
  const TOOL_ID = OVERSTRIKE_ID;
  const TOOL_NAME = OVERSTRIKE_NAME;
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

async function verifyGameFiles(api) {
  GAME_PATH = await getDiscoveryPath(api);
  GAME_VERSION = await setGameVersion(GAME_PATH);
  const parameters = {
    "FileList": `${TOC_FILE}`,
    "InstallDirectory": GAME_PATH,
    "VerifyAll": false,
    "AppId": +STEAMAPP_ID,
  };

  try {
    await fs.statAsync(path.join(GAME_PATH, TOC_FILE));
    await fs.unlinkAsync(path.join(GAME_PATH, TOC_FILE));
    await fs.statAsync(path.join(GAME_PATH, TOC_FILE_BAK));
    await fs.unlinkAsync(path.join(GAME_PATH, TOC_FILE_BAK));
  } catch (err) {
    return api.showErrorNotification('Failed to delete toc and toc.BAK files', err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
  if (GAME_VERSION === 'steam') {
    try {
      await api.ext.steamkitVerifyFileIntegrity(parameters, GAME_ID);
      log('warn', `Steam verification complete`);
      return;
    } catch (err) {
      return api.showErrorNotification('Failed to verify game files through Steam. Do it in the Steam app instead.', err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
    }
  }
  api.sendNotification({ //success notification
    id: `${GAME_ID}-tocreset-success`,
    message: `Successfully performed TOC reset. You may need to verify the game files again.`,
    type: 'success',
    noDismiss: false,
    allowSuppress: true,
  });
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(api.getState(), GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(api.getState(), GAME_ID);
  GAME_VERSION = await setGameVersion(GAME_PATH);
  //updateNotify(api);
  await downloadOverstrike(api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(discovery.path, OSMOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  context.requireExtension('Vortex Steam File Downloader');
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
  context.registerInstaller(OVERSTRIKE_ID, 25, testOverstrike, installOverstrike);
  context.registerInstaller(OSMOD_ID, 30, testOsMod, installOsMod);
  
  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'TOC Reset (After Update)', () => {
    verifyGameFiles(context.api);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
   context.registerAction('mod-icons', 300, 'open-ext', {}, '.NET 7 Download Page', () => {
    util.opn('https://dotnet.microsoft.com/en-us/download/dotnet/7.0').catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
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
      return deployNotify(context.api);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
