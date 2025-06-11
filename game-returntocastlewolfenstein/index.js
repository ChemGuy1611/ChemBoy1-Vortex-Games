/*
Name: Return to Castle Wolfenstein Vortex Extension
Structure: Generic Game with Custom Engine Mod (RealRTCW)
Author: ChemBoy1
Version: 0.4.1
Date: 03/20/2025
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const STEAMAPP_ID = "9010";
const EPICAPP_ID = "";
const GOGAPP_ID = "1441704976";
const XBOXAPP_ID = "BethesdaSoftworks.ReturntoCastleWolfenstein";
const XBOXEXECNAME = "Game";
const GAME_ID = "returntocastlewolfenstein";
const GAME_NAME = "Return to Castle Wolfenstein";
const GAME_NAME_SHORT = "RTCW";
const EXEC = "WolfSP.exe";

//Info for mod types, tools, and installers
const IORTCW_ID = `${GAME_ID}-iortcw`;
const IORTCW_NAME = "ioRTCW";
const IORTCW_EXEC = "iowolfsp.x64.exe";

const REALRTCW_ID = `${GAME_ID}-realrtcw`;
const REALRTCW_NAME = "RealRTCW";
const REALRTCW_EXEC = "realrtcw.x64.exe";

const MAIN_ID = `${GAME_ID}-mainfolder`;
const MAIN_NAME = "Main Folder";
const MAIN_FOLDER = "Main";
const MAIN_PATH = path.join('.');

const PK3_ID = `${GAME_ID}-main`;
const PK3_NAME = ".pk3 Data (Main)";
const PK3_PATH = path.join(MAIN_FOLDER);
const PK3_EXT = ".pk3";

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": "rtcw.jpg",
    "mergeMods": true,
    "modPath": ".",
    "requiresCleanup": true,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      //"epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      //"EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": PK3_ID,
      "name": PK3_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${PK3_PATH}`
    },
    {
      "id": MAIN_ID,
      "name": MAIN_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MAIN_PATH}`
    },
    {
      "id": REALRTCW_ID,
      "name": REALRTCW_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
    {
      "id": IORTCW_ID,
      "name": IORTCW_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
      GOGAPP_ID,
      XBOXAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: 'RealRTCW',
    name: 'Launch RealRTCW',
    logo: 'realrtcw.png',
    executable: () => REALRTCW_EXEC,
    requiredFiles: [REALRTCW_EXEC],
    relative: true,
    exclusive: true,
    parameters: [
      
    ],
    defaultPrimary: true,
  },
  {
    id: 'ioRTCW',
    name: 'Launch ioRTCW',
    logo: 'iortcw.png',
    executable: () => IORTCW_EXEC,
    requiredFiles: [IORTCW_EXEC],
    relative: true,
    exclusive: true,
    parameters: [
      
    ],
    defaultPrimary: true,
  },
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////////////////////

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
  if (store === 'xbox') {
    return Promise.resolve({
      launcher: "xbox",
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  }
  /*
  else if (store === 'epic') {
    return Promise.resolve({
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    });
  } //*/
  if (store === 'steam') {
    return Promise.resolve(
      undefined
      //{launcher: 'steam'}
    );
  }
  if (store === 'gog') {
    return Promise.resolve(
      undefined
      //{launcher: 'gog'}
    );
  }
  else {
    return Promise.resolve(undefined);
  }
}

// DOWNLOAD MOD FUNCTIONS //////////////////////////////////////////////////////////////////////////////////////////////

//Check if mod injector is installed
function isRealRTCWInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === REALRTCW_ID);
}

//Check if mod injector is installed
function isIoRTCWInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === IORTCW_ID);
}

//Startup notification to download RealRTCW or ioRTCW
async function downloadEngine(api, gameSpec) {
  let isInstalled = ( isRealRTCWInstalled(api, gameSpec) || isIoRTCWInstalled(api, gameSpec) );
  if (!isInstalled) {
    const NOTIF_ID = 'setup-notification-returntocastlewolfenstein';
    const MOD_NAME = REALRTCW_NAME;
    const MESSAGE = `${MOD_NAME} Recommended`;
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
              text: 'It is highly recommended that you download and install either RealRTCW or ioRTCW to improve your experience on modern systems. \n'
                  + 'RealRTCW is a fork of ioRTCW and is receiving active support, so it is recommended to use RealRTCW. \n'
              }, 
              [
                { label: 'Download RealRTCW', action: () => {
                  downloadRealRTCW(api, gameSpec);
                  dismiss();
                }},
                { label: 'Download ioRTCW', action: () => {
                  downloadIoRTCW(api, gameSpec);
                  dismiss();
                }},
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

//* Function to have user browse to download Mod Launcher from modDB
async function downloadRealRTCW(api, gameSpec) {
  let isInstalled = isRealRTCWInstalled(api, gameSpec);
  const URL = "https://www.moddb.com/mods/realrtcw-realism-mod/downloads";
  const MOD_NAME = REALRTCW_NAME;
  const MOD_TYPE = REALRTCW_ID;
  const ARCHIVE_NAME = "realrtcw";
  const instructions = api.translate(`Once you allow Vortex to browse to modDB - `
    + `Navigate to the latest version of ${MOD_NAME} in the Files list`
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
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
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

//Download ioRTCW from GitHub
async function downloadIoRTCW(api, gameSpec) {
  //notification indicating install process
  const MOD_NAME = IORTCW_NAME;
  const MOD_TYPE = IORTCW_ID;
  const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
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
    const URL = `https://github.com/iortcw/iortcw/releases/download/1.51c/iortcw-1.51c-win-x64.zip`;
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
      actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the modType
    ];
    util.batchDispatch(api.store, batched); // Will dispatch both actions.
  //Show the user the download page if the download/install process fails
  } catch (err) {
    const errPage = `https://github.com/iortcw/iortcw/releases`;
    api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
    util.opn(errPage).catch(() => null);
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////////////

//Installer test for ioRTCW
function testIortcw(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === IORTCW_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install ioRTCW files
function installIortcw(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === IORTCW_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: IORTCW_ID };

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

//Installer test for RealRTCW
function testRealrtcw(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === REALRTCW_EXEC));
  //const isMod = files.some(file => (path.basename(file).toLowerCase().includes('realrtcw.x64')));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install RealRTCW files
function installRealrtcw(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === REALRTCW_EXEC));
  //const modFile = files.find(file => (path.basename(file).toLowerCase().includes('realrtcw.x64')));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: REALRTCW_ID };

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

//Installer test for Main folderfiles
function testMainFolder(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === MAIN_FOLDER));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Main folder files
function installMainFolder(files) {
  const modFile = files.find(file => (path.basename(file) === MAIN_FOLDER));
  const idx = modFile.indexOf(`${modFile}\\`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MAIN_ID };

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

//Test for pk3 files
function testPk3(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === PK3_EXT));
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

//Install pk3 files
function installPk3(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === PK3_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PK3_ID };

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

// MAIN FUNCTIONS ////////////////////////////////////////////////////////////////////

//Setup function
async function setup(discovery, api, gameSpec) {
  await (gameSpec.modTypes || []).forEach((type, idx, arr) => {
    fs.ensureDirWritableAsync(pathPattern(api, gameSpec.game, type.targetPath));
  });
  await downloadEngine(api, gameSpec);
  return fs.ensureDirWritableAsync(path.join(discovery.path, gameSpec.game.modPath));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  const game = { //register game
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
  context.registerInstaller(IORTCW_ID, 25, testIortcw, installIortcw);
  context.registerInstaller(REALRTCW_ID, 30, testRealrtcw, installRealrtcw);
  context.registerInstaller(MAIN_ID, 35, testMainFolder, installMainFolder);
  context.registerInstaller(PK3_ID, 40, testPk3, installPk3);

  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download RealRTCW', () => {
    downloadRealRTCW(context.api, gameSpec).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download ioRTCW', () => {
    downloadIoRTCW(context.api, gameSpec).catch(() => null);
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

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
