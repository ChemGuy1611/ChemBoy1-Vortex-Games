/*////////////////////////////////////////////////
Name: WH40K Space Marine 2 Vortex Extension
Structure: Custom Game Data
Author: ChemBoy1
Version: 0.4.0
Date: 2025-01-28
////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const fsPromises = require('fs/promises');

//Specify all the information about the game
const STEAMAPP_ID = "2183900";
const EPICAPP_ID = "bb6054d614284c39bb203ebe134e5d79";
const GOGAPP_ID = null;
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const GAME_ID = "warhammer40000spacemarine2";
const EXEC = "Warhammer 40000 Space Marine 2.exe";
const EXEC_BIN = path.join("client_pc", "root", "bin", "pc", "Warhammer 40000 Space Marine 2 - Retail.exe");
const GAME_NAME = "Warhammer 40,000: Space Marine 2";
const GAME_NAME_SHORT = " WH40K Space Marine 2";
let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//feature toggles
const loadOrderEnabled = true;

//Info for mod types and installers
const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config (LocalAppData)";
const LOCALAPPDATA = util.getVortexPath('localAppData');
const CONFIG_PATH = path.join(LOCALAPPDATA, "Saber", "Space Marine 2");

const SAVE_FOLDER = path.join(CONFIG_PATH, "storage", "steam", "user");
let USERID_FOLDER = "";
try {
  const SAVE_ARRAY = fs.readdirSync(SAVE_FOLDER);
  USERID_FOLDER = SAVE_ARRAY.find((entry) => isDir(SAVE_FOLDER, entry));
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
} //*/
const SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER, "Main", "config");

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
const PAK_EXT = '.pak'
const PAK_EXTS = [PAK_EXT];

const LO_FILE = 'pak_config.yaml';
const LO_FILE_PATH = path.join(PAK_PATH, LO_FILE);
const LO_FILE_SPLITSTR =  '- pak: ';
// for mod update to keep them in the load order and not uncheck them
let mod_update_all_profile = false;
let updatemodid = undefined;
let updating_mod = false; // used to see if it's a mod update or not
let mod_install_name = ""; // used to display the name of the currently installed mod

const INDEXV2_ID = `${GAME_ID}-indexv2`;
const INDEXV2_NAME = "Index V2";
const INDEXV2_PATH = BINARIES_PATH;
const INDEXV2_EXEC = "Index.exe";
const INDEXV2_URL = "https://github.com/Wildenhaus/IndexV2/releases";
const INDEXV2_DLFILE_STRING = "Index-";

const CUSTOMSTRAT_ID = `${GAME_ID}-customstratagems`;
const CUSTOMSTRAT_NAME = "Custom Stratagems";
const CUSTOMSTRAT_PATH = BINARIES_PATH;
const CUSTOMSTRAT_EXEC = "CustomStratagems.exe";
const CUSTOMSTRAT_PAGE_NO = 375;
const CUSTOMSTRAT_FILE_NO = 2892;
const CUSTOMSTRAT_DOMAIN = GAME_ID;

//for Integration Studio
const INTEGRATION_STUDIO_ID = `${GAME_ID}-integrationstudio`;
const INTEGRATION_STUDIO_NAME = "Integration Studio";
const INTEGRATION_STUDIO_PATH = path.join('client_pc', 'root');
const INTEGRATION_STUDIO_EXE = "IntegrationStudio.exe";
const IS_EXEPATH = path.join(INTEGRATION_STUDIO_PATH, 'tools', 'ModEditor', INTEGRATION_STUDIO_EXE);
const PAK_PATH_VANILLA = path.join("client_pc", "root", "paks", "client", "default");
const PAK_PATH_SERVER = path.join("server_pc", "root", "paks", "server", "default");
const RESOURCE_PAK = 'default_other.pak';
const INTEGRATION_STUDIO_RESOURCE_PATH = path.join(PAK_PATH_VANILLA, RESOURCE_PAK);
const INTEGRATION_STUDIO_RESOURCE_PATH_SERVER = path.join(PAK_PATH_SERVER, RESOURCE_PAK);
const INTEGRATION_STUDIO_URL_NEXUS = 'https://www.nexusmods.com/warhammer40000spacemarine2/mods/280';
const IS_PAGE_ID = 280;
const IS_FILE_NO = 2771;

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
      "steamAppId": +STEAMAPP_ID,
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
      "targetPath": path.join("{gamePath}", BINARIES_PATH)
    },
    /*{
      "id": CONFIG_ID,
      "name": "Config (LocalAppData)",
      "priority": "high",
      "targetPath": CONFIG_PATH
    }, //*/
    /*{
      "id": PAK_ID,
      "name": PAK_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", PAK_PATH)
    }, //*/
    {
      "id": LOCAL_ID,
      "name": LOCAL_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", LOCAL_PATH)
    },
    {
      "id": LOCALSUB_ID,
      "name": LOCALSUB_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", LOCALSUB_PATH)
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
      "targetPath": path.join("{gamePath}", INTEGRATION_STUDIO_PATH)
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
  },
  {
    id: INDEXV2_ID,
    name: INDEXV2_NAME,
    logo: 'index.png',
    queryPath: () => INDEXV2_PATH,
    executable: () => INDEXV2_EXEC,
    requiredFiles: [INDEXV2_EXEC],
    detach: true,
    relative: true,
    exclusive: false
  },
  {
    id: CUSTOMSTRAT_ID,
    name: CUSTOMSTRAT_NAME,
    logo: 'customstratagems.png',
    queryPath: () => CUSTOMSTRAT_PATH,
    executable: () => CUSTOMSTRAT_EXEC,
    requiredFiles: [CUSTOMSTRAT_EXEC],
    detach: true,
    relative: true,
    exclusive: false
  },
];

// BASIC FUNCTIONS //////////////////////////////////////////////////////////////

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
function modTypePriority(priority) {
  return {
    high: 30,
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

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if Integration Studio is installed
function isIntegrationStudioInstalled(api) {
  const state = api.getState();
  const mods = state.persistent.mods[GAME_ID] || {};
  return Object.keys(mods).some(id => mods[id]?.type === INTEGRATION_STUDIO_ID);
}

//Check if Custom Stratagems is installed
function isCustomStratagemsInstalled(api) {
  const state = api.getState();
  const mods = state.persistent.mods[GAME_ID] || {};
  return Object.keys(mods).some(id => mods[id]?.type === CUSTOMSTRAT_ID);
}
//Check if Index V2 is installed
function isIndexInstalled(api) {
  const state = api.getState();
  const mods = state.persistent.mods[GAME_ID] || {};
  return Object.keys(mods).some(id => mods[id]?.type === INDEXV2_ID);
}

//* Function to auto-download IS from Nexus Mods
async function downloadIntegrationStudio(api, gameSpec) {
  let isInstalled = isIntegrationStudioInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = INTEGRATION_STUDIO_NAME;
    const MOD_TYPE = INTEGRATION_STUDIO_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    let FILE_ID = IS_FILE_NO;  //If using a specific file id because "input" below gives an error
    const PAGE_ID = IS_PAGE_ID;
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
      let FILE = FILE_ID; //use the FILE_ID directly for the correct game store version
      let URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        log('warn', `Files: ${FILE} found for ${MOD_NAME}`);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        log('warn', `latest file ${FILE} found for ${MOD_NAME}`);
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
        log('warn', `used fallback file id when downloading ${MOD_NAME}: ` + err);
      } //*/
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

//* Function to auto-download Custom Stratagems from Nexus Mods
async function downloadCustomStratagems(api, gameSpec) {
  const MOD_NAME = CUSTOMSTRAT_NAME;
  const MOD_TYPE = CUSTOMSTRAT_ID;
  const NOTIF_ID = `${MOD_TYPE}-installing`;
  let FILE_ID = CUSTOMSTRAT_FILE_NO;  //If using a specific file id because "input" below gives an error
  const PAGE_ID = CUSTOMSTRAT_PAGE_NO;
  const GAME_DOMAIN = CUSTOMSTRAT_DOMAIN;
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
      log('warn', `Files: ${FILE} found for ${MOD_NAME}`);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        //.reverse()[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      FILE = file.file_id;
      log('warn', `latest file ${FILE} found for ${MOD_NAME}`);
      URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
    } catch (err) { // use defined file ID if input is undefined above
      FILE = FILE_ID;
      URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      log('warn', `used fallback file id when downloading ${MOD_NAME}: ` + err);
    } //*/
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
      //actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
    ];
    util.batchDispatch(api.store, batched); // Will dispatch both actions
  } catch (err) { //Show the user the download page if the download, install process fails
    const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
    api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
    util.opn(errPage).catch(() => null);
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
} //*/

//* Download Index V2 from GitHub (user browse for download)
async function downloadIndex(api, gameSpec) {
  const URL = INDEXV2_URL;
  const MOD_NAME = INDEXV2_NAME;
  const MOD_TYPE = INDEXV2_ID;
  const ARCHIVE_NAME = INDEXV2_DLFILE_STRING;
  const instructions = api.translate(`Click on Continue below to open the browser. - `
    + `Navigate to the latest experimental version of ${MOD_NAME} on the GitHub releases page and `
    + `click on the appropriate file to download and install the mod.`
  );

  return new Promise((resolve, reject) => { //Browse and download the mod
    return api.emitAndAwait('browse-for-download', URL, instructions)
    .then((result) => { //result is an array with the URL to the downloaded file as the only element
      if (!result || !result.length) { //user clicks outside the window without downloading
        return reject(new util.UserCanceled());
      }
      if (!result[0].toLowerCase().includes(ARCHIVE_NAME.toLowerCase())) { //if user downloads the wrong file
        return reject(new util.ProcessCanceled('Selected wrong download'));
      } //*/
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
              //actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
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
} //*/

//Notification with IS info
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
                  + `- You can use the button below to open the IS Nexus Mods page.\n`
                  + `\n`
            }, [
              { label: 'Acknowledge', action: () => dismiss() },
              {
                label: 'Open IS Nexus Page', action: () => {
                  util.opn(INTEGRATION_STUDIO_URL_NEXUS).catch(() => null);
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for IS installer
function testIntegrationStudio(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === INTEGRATION_STUDIO_EXE));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    return Promise.resolve({ supported: false, requiredFiles: [] });
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install IS installer
async function installIntegrationStudio(files, tempFolder, api) {
  const NOTIF_ID = `${GAME_ID}-isinstaller-notif`;
  api.sendNotification({ //notification indicating setup process
    id: NOTIF_ID,
    message: `Installing IS and Extracting resource files. This will take a while.`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });

  const setModTypeInstruction = { type: 'setmodtype', value: INTEGRATION_STUDIO_ID };
  GAME_PATH = getDiscoveryPath(api);
  const resourcePath = path.join(GAME_PATH, INTEGRATION_STUDIO_RESOURCE_PATH);
  const resourcePathServer = path.join(GAME_PATH, INTEGRATION_STUDIO_RESOURCE_PATH_SERVER);
  try { // copy tools folder to root
    const source = path.join(tempFolder, 'ModEditor');
    await fs.statAsync(source);
    try {
      await fs.statAsync(path.join(source, 'mods_source'));
      await fsPromises.rm(path.join(source, 'mods_source'), { recursive: true });
    } catch(err) {
      log('error', 'Error deleting Integration Studio bundled "mods_source" folder: ' + err);
    }
    const destination = tempFolder;
    await fs.copyAsync(source, destination);
    await fsPromises.rm(source, { recursive: true });
    const paths = await getAllFiles(tempFolder);
    //files = [ ...files, ...paths.map(p => p.replace(`${tempFolder}${path.sep}`, ''))];
    files = [ ...paths.map(p => p.replace(`${tempFolder}${path.sep}`, ''))];
  }
  catch(err) {
    log('error', 'Error copying Integration Studio tools folder: ' + err);
  }
  try { //extract client default_other.pak
    await fs.statAsync(resourcePath);
    const sevenZip = new util.SevenZip();
    const destination = path.join(tempFolder, 'mods_source');
    const zipOp = await sevenZip.extractFull(resourcePath, destination);
    if (zipOp?.code !== 0) throw new Error('7zip extraction failed');
    const paths = await getAllFiles(destination);
    files = [ ...files, ...paths.map(p => p.replace(`${tempFolder}${path.sep}`, ''))];
  }
  catch(err) {
    log('error', 'Error extracting Integration Studio client resources: ' + err);
  }
  try { //extract server default_other.pak
    await fs.statAsync(resourcePathServer);
    const sevenZip = new util.SevenZip();
    const destination = path.join(tempFolder, 'mods_source');
    const zipOp = await sevenZip.extractFull(resourcePathServer, destination);
    if (zipOp?.code !== 0) throw new Error('7zip extraction failed');
    const paths = await getAllFiles(destination);
    files = [ ...files, ...paths.map(p => p.replace(`${tempFolder}${path.sep}`, ''))];
  }
  catch(err) {
    log('error', 'Error extracting Integration Studio server resources: ' + err);
  }

  // remove empty folders
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
  api.dismissNotification(NOTIF_ID);
  return Promise.resolve({ instructions });
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
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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
  const isMod = files.some(file => PAK_EXTS.includes(path.extname(file).toLowerCase()))
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

/*Install save files
function installPak(files) {
  const modFile = files.find(file => PAK_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PAK_ID };
  const pakFiles = files.filter(file => PAK_EXTS.includes(path.extname(file).toLowerCase()));
  const pakModFiles = {
    type: 'attribute',
    key: 'pakModFiles',
    value: pakFiles.map(f => path.basename(f))
  };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    (
      (file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep)) 
      //&& (PAK_EXTS.includes(path.extname(file).toLowerCase()))
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
  instructions.push(pakModFiles);
  return Promise.resolve({ instructions });
} //*/

/* install sound .pak mods with multiple variants
function installPak(api, files) {
  let hasVariants = false;
  const pakFiles = files.reduce((accum, iter) => {
    if (PAK_EXTS.includes(path.extname(iter).toLowerCase())) {
      //const exists = accum[path.basename(iter)] !== undefined;
      const exists = (accum.length > 1);
      if (exists) {
        hasVariants = true;
      }
      accum[path.basename(iter)] = exists
        ? accum[path.basename(iter)].concat(iter)
        : [iter];
    }
    return accum;
  }, {});

  let filtered = files.filter(file =>
    (
      (PAK_EXTS.includes(path.extname(file).toLowerCase()))
    )
  );

  var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };

  const queryVariant = () => {
    const pak = Object.keys(pakFiles).filter(key => pakFiles[key].length > 1);
    return Promise.map(pak, pakFile => {
      return api.showDialog('question', 'Choose Variant', {
        text: 'This mod has several pak files - please '
            + 'choose the files you wish to install. (You can choose '
            + 'different files by re-installing the mod)',
        choices: pakFiles[pakFile].map((iter, idx) => ({ 
          id: iter,
          text: iter,
          value: idx === 0,
        })),
        parameters: {
          pak: pakFile,
        },
      }, [
        { label: 'Cancel' },
        { label: 'Confirm' },
      ]).then(res => {
        if (res.action === 'Confirm') {
          const choice = Object.keys(res.input).find(choice => res.input[choice]);
          filtered = filtered.filter(file => 
            !PAK_EXTS.includes(path.extname(file).toLowerCase()) ||
            ((path.basename(file) === pakFile) && file.includes(choice)) ||
            (path.basename(file) !== pakFile)
          );
          return Promise.resolve();
        } else {
          return new util.UserCanceled();
        }
      });
    })
  };

  const generateInstructions = () => {
    const fileInstructions = filtered.reduce((accum, iter) => {
      if (!iter.endsWith(path.sep)) {
        accum.push({
          type: 'attribute',
          key: 'pakModFiles',
          value: filtered.map(f => path.basename(f)),
        });
        accum.push({
          type: 'copy',
          source: iter,
          destination: path.basename(iter),
        });
      }
      return accum;
    }, []);
    const instructions = [{ 
      type: 'setmodtype',
      value: PAK_ID,
    }].concat(fileInstructions);
    return instructions;
  }

  const prom = hasVariants ? queryVariant : Promise.resolve;
  return prom()
    .then(() => Promise.resolve({ instructions: generateInstructions() }));
} //*/

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

function installPak(api, files) {
  return __awaiter(this, void 0, void 0, function* () {
    const fileExt = PAK_EXTS[0];
    const modFiles = files.filter(file => PAK_EXTS.includes(path.extname(file).toLowerCase()));
    const modType = {
      type: 'setmodtype',
      value: PAK_ID,
    };
    const installFiles = (modFiles.length > 1)
      ? yield chooseFilesToInstall(api, modFiles, fileExt)
      : modFiles;
    const pakModFiles = {
      type: 'attribute',
      key: 'pakModFiles',
      value: modFiles.map(f => path.basename(f))
    };
    let instructions = installFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file)
      };
    });
    instructions.push(modType);
    instructions.push(pakModFiles);
    return Promise.resolve({ instructions });
  });
}

function chooseFilesToInstall(api, files, fileExt) {
  return __awaiter(this, void 0, void 0, function* () {
    const t = api.translate;
    return api.showDialog('question', t('Multiple {{PAK}} files', { replace: { PAK: fileExt } }), {
        text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: fileExt } }) +
            `This can be because the author intended for you to chose from several options. Please select which files to install below:`,
        checkboxes: files.map((pak) => {
            return {
                id: path.basename(pak),
                text: pak,
                value: false
            };
        })
    }, [
        { label: 'Cancel' },
        { label: 'Install Selected' },
        { label: 'Install All_plural' }
    ]).then((result) => {
        if (result.action === 'Cancel')
            return Promise.reject(new util.ProcessCanceled('User cancelled.'));
        else {
            const installAll = (result.action === 'Install All' || result.action === 'Install All_plural');
            const installPAKS = installAll ? files : Object.keys(result.input).filter(s => result.input[s])
                .map(file => files.find(f => path.basename(f) === file));
            return installPAKS;
        }
    });
  });
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
  //add fallback notification
  
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

// LOAD ORDER FUNCTIONS /////////////////////////////////////////////////////////

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
  let modFolderPath = path.join(gameDir, PAK_PATH);
  let loadOrderPath = path.join(gameDir, LO_FILE_PATH);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let loadOrderSplit = loadOrderFile.split('\n');
  let MOD_ENTRIES = loadOrderSplit
  .map(entry => entry.replace(LO_FILE_SPLITSTR, ''));
  let LO_MOD_ARRAY = MOD_ENTRIES;
  //log('warn', `LO_MOD_ARRAY: ${LO_MOD_ARRAY.join(', ')}`);
  
  //Get all .pak files from mods folder
  let modFiles = [];
  try {
    modFiles = await fs.readdirAsync(modFolderPath);
    modFiles = modFiles.filter((file) => PAK_EXTS.includes(path.extname(file).toLowerCase()));
    modFiles = modFiles.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read .arch06 "Mods" folder'));
  }

  // Get readable mod name using attribute from mod installer
  async function getModName(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['pakModFiles'], '').includes(file))); //find mod that includes the .arch06 file
      if (modMatch) {
        return modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
      }
      return file;
    } catch (err) {
      return file;
    }
  }

  // Get Vortex mod id using attribute from mod installer
  async function getModId(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['pakModFiles'], '').includes(file))); //find mod that includes the .arch06 file
      if (modMatch) {
        return modMatch.id;
      }
      return undefined;
    } catch (err) {
      return undefined;
    }
  }

  //Set load order
  let loadOrder = await LO_MOD_ARRAY
    .reduce(async (accumP, entry) => {
      const accum = await accumP;
      const file = entry;
      if (!modFiles.includes(file)) {
        return Promise.resolve(accum);
      }
      accum.push(
      {
        id: file,
        name: `${file.replace(PAK_EXT, '')} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: true,
      }
      );
      return Promise.resolve(accum);
    }, Promise.resolve([]));
  
  //push new mods to loadOrder
  for (let file of modFiles) {
    if (!loadOrder.find((mod) => (mod.id === file))) {
      loadOrder.push({
        id: file,
        name: `${file.replace(PAK_EXT, '')} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: true,
      });
    }
  }

  return loadOrder;
}

function modToTemplate(mod) {
  return `- pak: ${mod}`;
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
  let loadOrderPath = path.join(gameDir, LO_FILE_PATH);

  let loadOrderMapped = loadOrder
    .map((mod) => (mod.enabled ? modToTemplate(mod.id) : ``));
  let loadOrderJoined = loadOrderMapped
    .filter((entry) => (entry !== ``))
    .join("\n");

  //write to default.archcfg file
  let loadOrderOutput = loadOrderJoined;
  return fs.writeFileAsync(
    loadOrderPath,
    loadOrderOutput,
    { encoding: "utf8" },
  );
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, BINARIES_PATH));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, LOCALSUB_PATH));
  notifyIntegrationStudio(api);
  await fs.ensureFileAsync(path.join(GAME_PATH, LO_FILE_PATH), 'utf8');
  return fs.ensureDirWritableAsync(path.join(GAME_PATH, PAK_PATH));
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

  //register mod types explicitly
  context.registerModType(PAK_ID, 25, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, path.join('{gamePath}', PAK_PATH)), 
    () => Promise.resolve(false), 
    { name: PAK_NAME }
  );

  //register mod installers
  context.registerInstaller(INTEGRATION_STUDIO_ID, 25, testIntegrationStudio, (files, temp) => installIntegrationStudio(files, temp, context.api));
  context.registerInstaller(PAK_ID, 27, testPak, (files) => installPak(context.api, files));
  context.registerInstaller(ROOT_ID, 29, testRoot, installRoot);
  context.registerInstaller(LOCAL_ID, 31, testLocal, installLocal);
  context.registerInstaller(LOCALSUB_ID, 33, testLocalSub, installLocalSub);
  context.registerInstaller(BINARIES_ID, 49, testBinaries, installBinaries); //fallback to binaries folder

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Open ${LO_FILE} (Load Order)`, () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, LO_FILE_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Integration Studio', () => {
    downloadIntegrationStudio(context.api, spec).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Custom Stratagems', () => {
    downloadCustomStratagems(context.api, spec).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Index V2', () => {
    downloadIndex(context.api, spec).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Binaries Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, BINARIES_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Loose Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, LOCALSUB_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Mods Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, PAK_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Local AppData Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves (Profiles) Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Crash Reports Folder', () => {
    util.opn(path.join(CONFIG_PATH, "client", "reports")).catch(() => null);
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
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    util.opn(DOWNLOAD_FOLDER).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
}

//Functions for .pak file extension renaming and load ordering
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = PAK_EXTS[0];

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    //*
    const pak = util.getSafe(modInfo.attributes, ['pakModFiles'], []);
    if (pak.length > 1) {
      name = name + ` (${pak.length} ${fileExt} files)`; 
    } //*/
    return {
      id: mod.id,
      name,
      imgUrl: util.getSafe(modInfo, ['attributes', 'pictureUrl'], path.join(__dirname, spec.game.logo))
    }
  });
  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);
}

function isPak(filePath) {
  return PAK_EXTS.includes(path.extname(filePath.toLowerCase()));
}

const mergeTest = (game, discovery, context) => {
  if (game.id !== GAME_ID) return;
  return {
    baseFiles: () => [],
    //filter: () => true,
    filter: filePath => isPak(filePath),
  }
}

const sendRefreshLoadOrderNotification = (context) => {
  context.api.sendNotification({
    id: `${GAME_ID}-loadorderrefresh-notify`,
    type: 'error',
    message: 'Refresh your load order',
    allowSuppress: false,
  });
};

function makePrefix(input) {
  let res = '';
  let rest = input;
  while (rest > 0) {
      res = String.fromCharCode(65 + (rest % 25)) + res;
      rest = Math.floor(rest / 25);
  }
  return util.pad(res, 'A', 3);
}

function loadOrderPrefix(pos) {
  return makePrefix(pos) + '-';
}

const mergeOperation = (filePath, mergePath, context, currentLoadOrder) => {

  const state = context.api.getState();
  const profile = selectors.lastActiveProfileForGame(state, GAME_ID);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});

  const splitPath = filePath.split(path.sep);
  const fileName = splitPath.pop();
  const modName = splitPath.pop();

  const modIsInLoadOrder = loadOrder[modName] != undefined;
  const modPosition = modIsInLoadOrder ? loadOrder[modName].pos : Object.keys(loadOrder).length;

  if (modPosition == undefined) {
    sendRefreshLoadOrderNotification(context);
  }
  else {
    const prefix = loadOrderPrefix(modPosition);
    const targetFileName = `${prefix}${fileName}`;
    const mergeTarget = path.join(mergePath, targetFileName);
    //ADD - Sanity checks before file copy
    fs.ensureDirWritableAsync(path.dirname(mergeTarget));
    fs.ensureDirWritableAsync(path.dirname(filePath));
    return util.copyFileAtomic(filePath, mergeTarget)
    //return fs.copyAsync(filePath, mergeTarget)
      .catch({ code: 'ENOENT' }, err => {
        // not entirely sure whether "ENOENT" refers to the source file or the directory we're trying to copy into, the error object contains only one of those paths
        context.api.showErrorNotification('Failed to rename .pak files from load order', err);
        log('error', 'file not found upon copying merge base file', {
          source: filePath,
          destination: mergeTarget,
        });
        return Promise.reject(err);
      });
  }
}

const requestDeployment = (context) => {
  context.api.store.dispatch(actions.setDeploymentNecessary(GAME_ID, true));
  context.api.sendNotification({
    id: `${GAME_ID}-deploy-notify`,
    type: 'warning',
    message: 'Deployment is needed',
    allowSuppress: true,
    actions: [
      {
        title: 'Deploy',
        action: () => context.api.events.emit('deploy-mods', (err) => {
          log('warn', `Error deploying mods: ${err}`);
        })
      }
    ],
  });
};

//main function
function main(context) {
  applyGame(context, spec);
  if (loadOrderEnabled) {
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
    /*
    let currentLoadOrder;
    context.registerLoadOrderPage({
      gameId: spec.game.id,
      gameArtURL: path.join(__dirname, spec.game.logo),
      preSort: (items, direction) => preSort(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === PAK_ID),
      displayCheckboxes: false,
      callback: (updatedLoadOrder, mods) => {
        if (currentLoadOrder == updatedLoadOrder) return;
        if (currentLoadOrder == undefined) {
          currentLoadOrder = updatedLoadOrder;
          return;
        }
        currentLoadOrder = updatedLoadOrder;
        requestDeployment(context);
      },
      createInfoPanel: () =>
        context.api.translate(`Drag and drop the pak mods on the left to change the
          order in which they load. ${spec.game.name} loads patch mods in numerical 
          order, so Vortex prefixes the file names with "0001-, 0002-, 0003-, etc." 
          to ensure they load in the order you set here. The number in the left column 
          represents the overwrite order. The changes from mods with higher numbers will 
          take priority over other mods which make similar edits.`
        ),
    });

    context.registerMerge( //register merger for .pak mods
      (game, discovery) => mergeTest(game, discovery, context),
      (filePath, mergePath) => mergeOperation(filePath, mergePath, context, currentLoadOrder),
      PAK_ID
    ); //*/
  }

  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const lastActiveProfile = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== lastActiveProfile) return;
      //notifyIntegrationStudio(api);
      context.api.dismissNotification(`${GAME_ID}-deploy-notify`);
      mod_update_all_profile = false;
      updating_mod = false;
      updatemodid = undefined;
      //context.api.dismissNotification('redundant-mods'); // Because we create a merged mod when deploying, Vortex thinks that all mods have duplicates and are redundant
    });
    //*
    context.api.events.on('mods-enabled', (mods, enabled, gameId) => {
      if (gameId !== GAME_ID) return;
      const isAutoDeployOn = context.api.getState().settings.automation.deploy;
      if (!isAutoDeployOn) {
        requestDeployment(context);
      }
    }); //*/
    context.api.events.on('mod-disabled', (profileId, modId) => {
      const lastActiveProfile = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== lastActiveProfile) return;
      const isAutoDeployOn = context.api.getState().settings.automation.deploy;
      if (!isAutoDeployOn) {
        requestDeployment(context);
      }
    }); //*/
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

//export to Vortex
module.exports = {
  default: main,
};
