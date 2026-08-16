/*////////////////////////////////////////
Name: Marvel Rivals Vortex Extension
Structure: UE5
Author: ChemBoy1
Version: 1.0.0
Date: 2026-08-16
////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const React = require('react');

const LOCALAPPDATA = util.getVortexPath('localAppData');

//Specify all information about the game
const GAME_ID = "marvelrivals";
const STEAMAPP_ID = "2767030";
const EPICAPP_ID = "575efd0b5dd54429b035ffc8fe2d36d0";
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID];
const EPIC_CODE_NAME = "Marvel";
const EXEC_FOLDER_NAME = "Win64";
const TOP_FOLDER_NAME = "MarvelGame"; //this game nests EPIC_CODE_NAME under a top folder, unlike most UE games
const GAME_NAME = "Marvel Rivals";
const GAME_NAME_SHORT = "Marvel Rivals";
const EXEC = path.join(TOP_FOLDER_NAME, "Marvel.exe");

//NOTE: no UE4SS/LogicMods support - online-only PvP with anti-cheat. Do not port UE4SS surfaces here.
//feature toggles
const preferHardlinks = true; //set true to perform partition checks when IO_STORE is false so that hardlinks are available to more users
const SIGBYPASS_REQUIRED = true; //set true if there are .sig files in the Paks folder
const IO_STORE = true; //true if the Paks folder contains .ucas and .utoc files
const PAKMOD_LOADORDER = true; //set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder.
const FBLO = true; //set to false to use legacy load order page
const LO_IMAGE_WIDTH = 96; //Width of the load order thumbnail image
const SPECIAL_LO_INSTRUCTIONS = ''; //Show special load order instructions
const PAKMOD_EXTRA_EXTS = []; //extra extensions to include with paks (usually for custom modding frameworks, i.e .toml, .json)

const LO_IMAGE_HEIGHT = LO_IMAGE_WIDTH * 0.5625;

//Settings related to the IO Store UE feature
let PAKMOD_PATH = path.join(TOP_FOLDER_NAME, EPIC_CODE_NAME, 'Content', 'Paks', '~mods');
if (!PAKMOD_LOADORDER) PAKMOD_PATH = path.join(TOP_FOLDER_NAME, EPIC_CODE_NAME, 'Content', 'Paks'); //if loadOrder is disabled, Paks must be in root
let PAKMOD_EXTS = ['.pak'].concat(PAKMOD_EXTRA_EXTS);
let PAK_FILE_MIN = PAKMOD_EXTS.length;
let SYM_LINKS = true;
if (IO_STORE) { //Set file number for pak installer file selection (needs to be 3 if IO Store is used to accomodate .ucas and .utoc files)
  SYM_LINKS = false;
  PAKMOD_EXTS = ['.pak', '.ucas', '.utoc'].concat(PAKMOD_EXTRA_EXTS);
  PAK_FILE_MIN = PAKMOD_EXTS.length;
}

//global variables to set later
let GAME_PATH = ''; //game installation path
let STAGING_FOLDER = ''; //Vortex staging folder path
let DOWNLOAD_FOLDER = ''; //Vortex download folder path
let CHECK_CONFIG = false; //boolean to check if game, staging folder, and config folder are on the same drive
let mod_update_all_profile = false; // for mod update to keep them in the load order and not uncheck them
let updateModIds = new Map(); // Nexus mod id -> {firstSeen, targetFileId} (Map, not scalar, so batch updates don't clobber each other)
const MAX_UPDATE_WAIT_MS = 5 * 60 * 1000; // release the guard for an update that never lands (cancelled or failed install)
let updating_mod = false; // used to see if it's a mod update or not

// Unreal Engine Game Data
const UNREALDATA = {
  modsPath: PAKMOD_PATH,
  fileExt: PAKMOD_EXTS,
  loadOrder: PAKMOD_LOADORDER,
}

//This information will be filled in from the data above
const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Loose Data Files";
const ROOT_FOLDER = EPIC_CODE_NAME;
const ROOT_PATH = path.join(TOP_FOLDER_NAME, EPIC_CODE_NAME, 'Content');

const UE5_ID = `${GAME_ID}-ue5`;
const UE5_NAME = "UE5 Paks";
const PAK_ALT_ID = `${GAME_ID}-pakalt`;
const PAK_ALT_NAME = 'UE5 Paks (no ~mods)';
const PAK_EXT = ".pak";
const PAK_PATH = UNREALDATA.modsPath;
const PAK_ALT_PATH = path.join(TOP_FOLDER_NAME, EPIC_CODE_NAME, 'Content', 'Paks');
const UE5_SORTABLE_ID = `${GAME_ID}-ue5-sortable-modtype`;
const LEGACY_UE5_SORTABLE_ID = 'ue5-sortable-modtype';
const UE5_SORTABLE_NAME = 'UE5 Sortable Mod';

const BINARIES_PATH = path.join(TOP_FOLDER_NAME, EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_NAME);
const SHIPEXE_PROJECTNAME = EPIC_CODE_NAME;
const SHIPPING_EXE = path.join(BINARIES_PATH, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_NAME}-Shipping.exe`);
const LO_FILE_NAME = 'loadOrder.json';
let MODTYPE_FOLDERS = [PAK_PATH, PAK_ALT_PATH, path.join(ROOT_PATH, EPIC_CODE_NAME)];

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = 'Config (LocalAppData)';
const CONFIG_PATH = path.join(LOCALAPPDATA, EPIC_CODE_NAME, "Saved", "Config", "Windows");
const CONFIG_FILES = [
  "engine.ini", "game.ini", "gameusersettings.ini", "input.ini", "scalability.ini",
  "hardware.ini", "deviceprofiles.ini", "compat.ini", "runtimeoptions.ini",
  "gameplaytags.ini", "enhancedinput.ini", "consolevariables.ini",
];
const CONFIG_EXT = ".ini";

const SIGBYPASS_ID = `${GAME_ID}-sigbypass`;
const SIGBYPASS_NAME = "Signature Bypass";
const SIGBYPASS_PATH = BINARIES_PATH; //sig bypass installs into the Binaries folder
const SIGBYPASS_DLL = "dsound.dll";
const SIGBYPASS_LUA = "marvelrivalsutocsignaturebypass.asi";
const SIGBYPASS_PAGE_NO = 2940;
const SIGBYPASS_FILE_NO = 7106;

const REPAK_ID = `${GAME_ID}-repak`;
const REPAK_NAME = "Repak Rivals";
const REPAK_EXEC = 'repak-gui.exe';
const REPAK_PAGE_NO = 1717;
const REPAK_FILE_NO = 19706;
const REPAK_DOMAIN = GAME_ID;

// FILLED IN FROM DATA ABOVE
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1132"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Marvel_Rivals";
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
    "requiresCleanup": true,
    "modPath": PAK_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC,
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
      "supportsSymlinks": SYM_LINKS,
      "ignoreConflicts": IGNORE_CONFLICTS,
      "ignoreDeploy": IGNORE_DEPLOY,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', ROOT_PATH)
    },
    {
      "id": UE5_ID,
      "name": UE5_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', PAK_PATH)
    },
    {
      "id": PAK_ALT_ID,
      "name": PAK_ALT_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', PAK_ALT_PATH)
    },
    {
      "id": SIGBYPASS_ID,
      "name": SIGBYPASS_NAME,
      "priority": "low",
      "targetPath": path.join('{gamePath}', SIGBYPASS_PATH)
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
    id: REPAK_ID,
    name: REPAK_NAME,
    logo: `repak.png`,
    executable: () => REPAK_EXEC,
    requiredFiles: [REPAK_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    //parameters: [],
  }, //*/
];

// BASIC EXTENSION FUNCTIONS //////////////////////////////////////////////////////////////////////////////////

//Set mod type priorities
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch {
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

function modTypePriority(priority) {
  return {
    high: 30,
    low: 75,
  }[priority];
}

//Change folder path string placeholders to actual folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Set the mod path
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
  }
  if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam',
    });
  }
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

// AUTODOWNLOADER FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////

//Check if Sig Bypass is installed
function isSigBypassInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === SIGBYPASS_ID);
}

//* Function to auto-download signature bypass from Nexus Mods
async function downloadSigBypass(api, gameSpec) {
  let isInstalled = isSigBypassInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = SIGBYPASS_NAME;
    const MOD_TYPE = SIGBYPASS_ID;
    const NOTIF_ID = `${GAME_ID}-${MOD_TYPE}-installing`;
    const PAGE_ID = SIGBYPASS_PAGE_NO;
    const FILE_ID = SIGBYPASS_FILE_NO;  //If using a specific file id because "input" below gives an error
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
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: gameSpec.game.id,
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

// MOD INSTALLER FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase()));
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
  const modFile = files.find(file => (path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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


//Installer test for Signature Bypass files
function testSigBypass(files, gameId) {
  const isDll = files.some(file => path.basename(file).toLowerCase() === SIGBYPASS_DLL);
  const isLua = files.some(file => path.basename(file).toLowerCase() === SIGBYPASS_LUA.toLowerCase());
  const TEST = isDll && isLua;
  let supported = (gameId === spec.game.id) && TEST;

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

//Installer install Signature Bypass files
function installSigBypass(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === SIGBYPASS_DLL);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SIGBYPASS_ID };

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

//Test for config files
function testConfig(files, gameId) {
  const isConfig = files.some(file => CONFIG_FILES.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isConfig;

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

//Install config files
function installConfig(api, files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === CONFIG_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

  //Filter files and set instructions
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
  GAME_PATH = getDiscoveryPath(api);
  const IS_CONFIG = checkPartitions(LOCALAPPDATA, GAME_PATH);
  if (IS_CONFIG === false) {
    //api.showErrorNotification(`Could not install mod as Config`, `You tried installing a Config file mod, but the game, staging folder, and Local AppData folder are not all on the same drive. Please move the game and/or staging folder to the same drive as the Local AppData folder (typically C Drive) to install these types of mods with Vortex.`, { allowReport: false });
    configInstallerNotify(api);
    throw new util.UserCanceled();
  }
  return Promise.resolve({ instructions });
}

//Notification for config installer
function configInstallerNotify(api) {
  const NOTIF_ID = `${GAME_ID}-partioncheck`;
  const MESSAGE = 'Could not install mod as Config';
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
            text: `You tried installing a Config file mod, but the game, staging folder, and Local AppData folder are not all on the same drive.\n`
                + `Please move the game and/or staging folder to the same drive as the Local AppData folder (typically C Drive) to install these types of mods with Vortex.\n`
                + `\n`
                + `Config Path: ${path.join(CONFIG_PATH)}\n`
                + `\n`             
                + `If you want to use this mod installer, you must move the game and staging folder to the same partition as the Local AppData folder (typically C Drive).\n`
                + `\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
            {
              label: 'Open Config Folder', action: () => {
                util.opn(path.join(CONFIG_PATH)).catch(() => null);
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });
}

// UNREAL FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////

//* FBLO Functions
function generateProps(context, profileId) {
  const api = context.api;
  const state = api.getState();
  const profile = (profileId !== undefined)
    ? selectors.profileById(state, profileId)
    : selectors.activeProfile(state);
  if (profile?.gameId !== GAME_ID) {
      return undefined;
  }

  const discovery = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
  if (discovery?.path === undefined) {
    return undefined;
  }

  const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
  return { api, state, profile, mods, discovery };
}

async function ensureLOFile(context, profileId, props) {
  if (props === undefined) {
    props = generateProps(context, profileId);
  }
  if (props === undefined) {
    return Promise.reject(new util.ProcessCanceled('failed to generate game props'));
  }
  const targetPath = path.join(props.discovery.path, props.profile.id + '_' + LO_FILE_NAME);
  try {
    await fs.ensureFileAsync(targetPath);
    return targetPath;
  } catch (err) {
    return Promise.reject(err);
  }
}

//Reordering is ignored while a mod update is in flight: the deserializers below freeze the stored
//order and the serializers skip writing, so tell the user their change was not applied.
function notifyLoadOrderPaused(api, gameId) {
  api.sendNotification({
    id: `${gameId}-loadorder-update-paused`,
    type: 'warning',
    message: 'Load order changes are paused while a mod update finishes. Reorder again once it completes.',
    displayMS: 6000,
  });
}

async function deserializeLoadOrder(context) {
  if (mod_update_all_profile) {
    //A mod update briefly removes and reinstalls mods, so rebuilding the order from disk right now
    //would drop their entries. Return the stored order untouched instead: positions are preserved
    //and the page keeps showing the real load order rather than a placeholder row.
    const updateState = context.api.getState();
    const updateProfileId = selectors.lastActiveProfileForGame(updateState, GAME_ID);
    return util.getSafe(updateState, ['persistent', 'loadOrder', updateProfileId], []);
  }

  const props = generateProps(context, undefined);
  if (props?.profile?.gameId !== GAME_ID) {
    return Promise.reject(new util.ProcessCanceled('invalid props'));
  }

  // The deserialization function should be used to filter and insert wanted data into Vortex's
  //  loadOrder application state, once that's done, Vortex will trigger a serialization event
  //  which will ensure that the data is written to the LO file.
  const currentModsState = util.getSafe(props.profile, ['modState'], {});

  // we only want to insert enabled mods.
  const enabledModIds = Object.keys(currentModsState)
      .filter(modId => util.getSafe(currentModsState, [modId, 'enabled'], false));
  const mods = util.getSafe(props.state,
      ['persistent', 'mods', GAME_ID], {});
  const loFilePath = await ensureLOFile(context, props.profile.gameId, props);
  const fileData = await fs.readFileAsync(loFilePath, { encoding: 'utf8' });
  let data = [];
  if (fileData.length > 0) {
    data = JSON.parse(fileData);
  }
  try {
    // User may have disabled/removed a mod - we need to filter out any existing entries from the data we parsed.
    let filteredData = data.filter(entry => enabledModIds.includes(entry.id));
    // Check if the user added any new mods
    const diff = enabledModIds.filter((id) =>
      (mods[id]?.type === UE5_SORTABLE_ID)
      && !filteredData.some((loEntry) => (loEntry.id === id))
    );
    // Add any newly added mods to the bottom of the loadOrder.
    diff.forEach(id => {
      filteredData.push({
        id: id,
        modId: id,
        enabled: true,
        name: mods[id] !== undefined
          ? util.renderModName(mods[id])
          : id,
      });
    });
    return Promise.resolve(filteredData);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function serializeLoadOrder(context, loadOrder) {
  if (mod_update_all_profile) {
    notifyLoadOrderPaused(context.api, GAME_ID);
    return;
  }

  const props = generateProps(context, undefined);
  if (props === undefined) {
    return Promise.reject(new util.ProcessCanceled('invalid props'));
  }
  // Make sure the LO file is created and ready to be written to.
  const loFilePath = await ensureLOFile(context, props.profile.id, props);
  // Write the prefixed LO to file
  await fs.writeFileAsync(loFilePath, JSON.stringify(loadOrder, null, 4), { encoding: 'utf8' });
  // something has changed so we need to tell vortex that a deployment will be necessary
  requestDeployment(context.api, spec);
  return Promise.resolve();
}
//*/

//UNREAL - Pre-sort function - legacy load order page
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = UNREALDATA.fileExt;

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    const paks = util.getSafe(modInfo.attributes, ['unrealModFiles'], []);
    if (paks.length > 1) name = name + ` (${paks.length} ${fileExt} files)`;

    return {
      id: mod.id,
      name,
      imgUrl: util.getSafe(modInfo, ['attributes', 'pictureUrl'], path.join(__dirname, spec.game.logo))
    }
  });

  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);
}

//Make prefix based on loadOrder index
function makePrefix(input) {
  let res = '';
  let rest = input;
  while (rest > 0) {
      res = String.fromCharCode(65 + (rest % 25)) + res;
      rest = Math.floor(rest / 25);
  }
  return util.pad(res, 'A', 3);
}

//Find the loadOrder index and convert to prefix
function loadOrderPrefix(api, mod) {
  const state = api.getState();
  const profile = selectors.lastActiveProfileForGame(state, GAME_ID);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});
  let pos;
  if (FBLO) {
    pos = loadOrder.findIndex((entry) => entry.id === mod.id); //for FBLO
  } else {
    const loKeys = Object.keys(loadOrder);
    pos = loKeys.indexOf(mod.id); //for legacy load order page
  }
  //
  if (pos === -1) {
    return 'ZZZZ-';
  }
  return makePrefix(pos) + '-';
}

//Test for pak mods
function testPak(files, gameId) {
  const supportedGame = gameId === spec.game.id;
  const isPak = files.some(file => (path.extname(file).toLowerCase() === PAK_EXT));
  let supported = supportedGame && isPak;

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
};

//install pak mods
async function installPak(api, files) {
  const fileExt = UNREALDATA.fileExt;
  const modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
  const modType = {
    type: 'setmodtype',
    value: UE5_SORTABLE_ID,
  };
  const installFiles = (modFiles.length > PAK_FILE_MIN)
    ? await chooseFilesToInstall(api, modFiles, fileExt)
    : modFiles;
  const unrealModFiles = {
    type: 'attribute',
    key: 'unrealModFiles',
    value: installFiles.map(f => path.basename(f))
  };
  let instructions = installFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.basename(file)
    };
  });
  instructions.push(modType);
  instructions.push(unrealModFiles);
  return Promise.resolve({ instructions });
}

//file selection dialog for pak mods
async function chooseFilesToInstall(api, files, fileExt) {
  const t = api.translate;
  return api.showDialog('question', t('Multiple {{PAK}} files', { replace: { PAK: fileExt } }), {
    text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: fileExt } }) +
        `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
    checkboxes: files.map((pak) => {
      return {
          id: pak,
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
          return Promise.reject(new util.UserCanceled('User cancelled.'));
      else {
          const installAll = (result.action === 'Install All' || result.action === 'Install All_plural');
          const installPAKS = installAll ? files : Object.keys(result.input).filter(s => result.input[s])
            .map(file => files.find(f => f === file));
          return installPAKS;
      }
  });
}

// MAIN FUNCTIONS /////////////////////////////////////////////////////////////////////////

// Function to check if staging folder and game path are on same drive partition to enable modtypes + installers
function checkPartitions(folder, discoveryPath) {
  if (!preferHardlinks && !IO_STORE) { //only do early return if hardlinks have no benefits and aren't required
    return true;
  }
  try {
    // Define paths
    const path1 = discoveryPath;
    const path2 = STAGING_FOLDER;
    const path3 = folder;
    // Ensure all folders exist
    fs.ensureDirSync(path1);
    fs.ensureDirSync(path2);
    fs.ensureDirSync(path3); 
    // Get the stats for all folders
    const stats1 = fs.statSync(path1);
    const stats2 = fs.statSync(path2);
    const stats3 = fs.statSync(path3);
    // Read device IDs and check if they are all the same
    const a = stats1.dev;
    const b = stats2.dev;
    const c = stats3.dev;
    const TEST = ((a === b) && (b === c));
    return TEST;
  } catch (err) {
    //log('error', `Error checking folder partitions: ${err}`);
    return false;
  }
}

//Notification if Config, Save, and Creations folders are not on the same partition
function partitionCheckNotify(api, CHECK_CONFIG) {
  const NOTIF_ID = `${GAME_ID}-partioncheck`;
  const MESSAGE = 'Some Mods Installers are Not Available';
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
            text: `Because ${GAME_NAME} includes the IO-Store Unreal Engine feature, Vortex must use hardlinks to install mods for the game.\n`
                + `Because of this, the game, staging folder, and user folder (typically on C Drive) must all be on the same partition to install certain mods with Vortex.\n`
                + `Vortex detected that one or more of the mod types listed below are not available because the game, staging folder, and user folder are not on the same partition.\n`
                + `\n`
                + `Here are your results for the partition check to enable these mod types:\n`
                + `  - Config: ${CHECK_CONFIG ? 'ENABLED: Local AppData folders are on the same partition as the game and staging folder and the Config modtype is available' : 'DISABLED: Local AppData folders are NOT on the same partition as the game and staging folder and the Config modtype is NOT available'}\n`
                + `\n`
                + `Config Path: ${CONFIG_PATH}\n`
                + `Staging Path: ${STAGING_FOLDER}\n`
                + `Game Path: ${GAME_PATH}\n`
                + `\n`             
                + `If you want to use the disabled mod types, you must move the game and staging folder to the same partition as the Local AppData folder (typically C Drive).\n`
                + `\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
            {
              label: 'Open Config Folder', action: () => {
                util.opn(path.join(CONFIG_PATH)).catch(() => null);
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

//Notification if Config, Save, and Creations folders are not on the same partition
function legacyModsNotify(api, legacyMods) {
  const NOTIF_ID = `${GAME_ID}-legacymodsnotify`;
  const MESSAGE = 'Reinstall Pak Mods to Make Sortable';
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
            text: `\n\n`
                + `Due to a bug in a handful of Unreal Engine Vortex game extensions, your pak mods were assigned a modType ID that was shared among several games.\n`
                + `This bug can result in the Load Order tab not properly load ordering your pak mods.\n`
                + `A list of the affected mods is shown below. You must Reinstall these mods to make them sortable.\n`
                + `If you don't Reinstall thes mods, they will still function, but they will sit at the bottom of the loading order and will not be sortable.\n`
                + `\n`
                + `Perform the following steps to Reinstall the affected mods:\n
                  1. Filter your Mods page by Mod Type "Legacy UE - REINSTALL TO SORT" using the categories at the top.\n
                  2. Use the "CTRL + A" keyboard shortcut to select all displayed mods.\n
                  3. Click the "Reinstall" button in the blue ribbon at the bottom of the Mods page.\n
                  4. You can now sort all of your pak mods in the Load Order tab.\n`
                + `\n`
                + `Pak Mods to Reinstall:\n` 
                + `${legacyMods.join('\n')}`
                + `\n`
                + `\n`
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
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

//Read the game version from the shipping executable's file properties
async function resolveGameVersion(gamePath, exePath) {
  const READ_FILE = path.join(gamePath, SHIPPING_EXE);
  let version = '0.0.0';
  try { //note that this only returns the UE engine version right now
    const exeVersion = require('exe-version');
    version = await exeVersion.getProductVersion(READ_FILE);
    return Promise.resolve(version);
  } catch (err) {
    log('error', `Could not read ${READ_FILE} file to get game version: ${err}`);
    return Promise.resolve(version);
  }
}

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  //SYNCHRONOUS CODE //////////////////////////////////////
  const state = api.getState();
  const mods = util.getSafe(state, ['persistent', 'mods', gameSpec.game.id], {});
  const legacyMods = Object.keys(mods).filter(id => mods[id]?.type === LEGACY_UE5_SORTABLE_ID);
  if (legacyMods.length > 0) {
    legacyModsNotify(api, legacyMods);
  }
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  CHECK_CONFIG = checkPartitions(LOCALAPPDATA, GAME_PATH);
  if (!CHECK_CONFIG) {
    partitionCheckNotify(api, CHECK_CONFIG);
  }
  //ASYNC CODE ///////////////////////////////////////////
  if (CHECK_CONFIG) { //if game, staging folder, and config folder are on the same drive
    await fs.ensureDirWritableAsync(CONFIG_PATH);
  }
  if (SIGBYPASS_REQUIRED === true) {
    await downloadSigBypass(api, gameSpec);
  }
  MODTYPE_FOLDERS.push(BINARIES_PATH);
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
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
    getGameVersion: resolveGameVersion,
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
  //Pak modType
  context.registerModType(UE5_SORTABLE_ID, 25,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, path.join('{gamePath}', UNREALDATA.modsPath)),
    () => Promise.resolve(false),
    { name: UE5_SORTABLE_NAME,
      mergeMods: (mod) => {
        if (UNREALDATA.loadOrder === true) {
          return loadOrderPrefix(context.api, mod) + mod.id
        } else { //If load order is disabled, don't use sorting folders
          return '';
        }
      } //*/
    }
  );
  //Legacy pak modType, shared between several games by mistake. Mods must be reinstalled to become sortable
  context.registerModType(LEGACY_UE5_SORTABLE_ID, 65,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, path.join('{gamePath}', UNREALDATA.modsPath)),
    () => Promise.resolve(false),
    { name: 'Legacy UE - REINSTALL TO SORT',
      mergeMods: mod => 'ZZZZ-' + mod.id
    }
  );

  //register mod types dependent on drive partition
  context.registerModType(CONFIG_ID, 45,
    (gameId) => {
      GAME_PATH = getDiscoveryPath(context.api)
      if (GAME_PATH !== undefined) {
        CHECK_CONFIG = checkPartitions(LOCALAPPDATA, GAME_PATH);
      }
      return ((gameId === GAME_ID) && (CHECK_CONFIG === true));
    },
    (game) => pathPattern(context.api, game, CONFIG_PATH), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  );

  //register mod installers
  context.registerInstaller(ROOT_ID, 30, testRoot, installRoot);
  context.registerInstaller(UE5_SORTABLE_ID, 35, testPak, (files) => installPak(context.api, files)); //Pak installer
  context.registerInstaller(SIGBYPASS_ID, 37, testSigBypass, installSigBypass);
  context.registerInstaller(CONFIG_ID, 40, testConfig, (files) => installConfig(context.api, files));

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, PAK_ALT_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Binaries Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    util.opn(path.join(GAME_PATH, BINARIES_PATH)).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder (LocalAppData)', () => {
    const openPath = CONFIG_PATH;
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
  if (UNREALDATA.loadOrder === true) { //UNREAL - mod load order
    if (FBLO) {
      context.registerLoadOrder({
        gameId: spec.game.id,
        validate: async () => Promise.resolve(undefined), // no validation implemented yet
        deserializeLoadOrder: async () => await deserializeLoadOrder(context),
        serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
        toggleableEntries: false,
        usageInstructions: LoadOrderInstructions,
        customItemRenderer: LoadOrderItemRenderer,
      }); //*/
    } else { //legacy Load Order
      let previousLO;
      context.registerLoadOrderPage({
        gameId: spec.game.id,
        gameArtURL: path.join(__dirname, spec.game.logo),
        preSort: (items, direction) => preSort(context.api, items, direction),
        filter: mods => mods.filter(mod => mod.type === UE5_SORTABLE_ID),
        displayCheckboxes: false,
        callback: (loadOrder) => {
          if (previousLO === undefined) previousLO = loadOrder;
          if (loadOrder === previousLO) return;
          requestDeployment(context.api, spec);
          previousLO = loadOrder;
        },
        createInfoPanel: () =>
        context.api.translate(`Drag and drop the mods on the left to change the order in which they load. ${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes `
        + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
        + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.'),
      });
    }
  }

  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    api.onAsync('did-deploy', (profileId) => didDeploy(api, profileId)); //*/
    //api.onAsync('did-purge', (profileId) => didPurge(api, profileId)); //*/
    //detect mod update (to maintain LO position)
    //fileId is the version being updated TO, and is what tells the new version apart from the
    //old one on deploy - without it every mod not yet updated still looks "already installed"
    api.events.on('mod-update', (gameId, modId, fileId) => {
      if (GAME_ID === gameId) {
        updateModIds.set(String(modId), { firstSeen: Date.now(), targetFileId: String(fileId ?? '') });
      }
    });
    //detect batch mod update: the "Update all" button emits mods-update with LOCAL mod ids
    //and never emits mod-update, so resolve each one to its Nexus mod id before tracking it
    api.events.on('mods-update', (gameId, modIds) => {
      if (GAME_ID !== gameId) return;
      const mods = util.getSafe(api.getState(), ['persistent', 'mods', GAME_ID], {});
      for (const modId of modIds ?? []) {
        const nexusModId = mods[modId]?.attributes?.modId;
        if (nexusModId !== undefined) {
          updateModIds.set(String(nexusModId), {
            firstSeen: Date.now(),
            targetFileId: String(mods[modId]?.attributes?.newestFileId ?? ''),
          });
        }
      }
    });
    //detect mod removal (to maintain LO position) - match on the Nexus mod id
    //recorded in state (attributes.modId), not the local modId string: the
    //local id's naming convention varies by when the mod was originally
    //downloaded (older dash-delimited vs current space-delimited), so string
    //parsing silently misses old installs.
    api.events.on('remove-mod', (gameMode, modId) => {
      const removedMod = util.getSafe(api.getState(), ['persistent', 'mods', GAME_ID, modId], undefined);
      const nexusModId = removedMod?.attributes?.modId;
      if (nexusModId !== undefined && updateModIds.has(String(nexusModId))) {
        mod_update_all_profile = true;
      }
    });
    //detect mod installation (to maintain LO position). This only gates the
    //fallback-installer re-notify suppression, so a best-effort filename
    //match (covering both the old dash and current space delimiter) is fine.
    api.events.on('will-install-mod', (gameId, archiveId, modId) => {
      updating_mod = GAME_ID === gameId && Array.from(updateModIds.keys()).some((id) =>
        modId.includes('-' + id + '-') || modId.includes(' ' + id + ' ')
      );
    });
  });
  return true;
}

const requestDeployment = (api, spec) => {
  api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
  api.sendNotification({
    id: `${spec.game.id}-loadorderdeploy-notif`,
    type: 'warning',
    message: 'Deployment Required to Apply Load Order Changes',
    allowSuppress: true,
    actions: [
      {
        title: 'Deploy',
        action: (dismiss) => {
          deploy(api);
          dismiss();
        }
      }
    ],
  });
};

async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  //release tracking one mod id at a time, and only once that mod's new version has landed
  //and is enabled, so a deploy that fires mid-batch can't disarm the guard for mods that
  //haven't been reinstalled yet.
  //guard state as it stood before the loop below releases it - the FBLO refresh further
  //down only runs on the deploy that actually clears the guard
  const guardWasArmed = mod_update_all_profile;
  if (updateModIds.size > 0) {
    const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
    const now = Date.now();
    for (const [nexusId, { firstSeen, targetFileId }] of Array.from(updateModIds)) {
      const landed = Object.values(mods).some((mod) =>
        String(mod?.attributes?.modId ?? '') === nexusId &&
        //if the target file is unknown, fall back to "installed and enabled"
        (targetFileId === '' || String(mod?.attributes?.fileId ?? '') === targetFileId) &&
        util.getSafe(profile, ['modState', mod.id, 'enabled'], false)
      );
      if (landed) {
        updateModIds.delete(nexusId);
      } else if (now - firstSeen > MAX_UPDATE_WAIT_MS) {
        log('warn', `[${GAME_ID}] Mod update tracking for Nexus mod ${nexusId} timed out without landing; releasing load order guard for it.`);
        updateModIds.delete(nexusId);
      }
    }
  }
  mod_update_all_profile = updateModIds.size > 0; //stay armed while any update is still outstanding
  //Core FBLO deserialized this order concurrently with this handler - did-deploy listeners run
  //in parallel and the core one is registered first - so it read the frozen order before the
  //guard cleared above, leaving its page stale. Re-run the deserialize it would have got and
  //push the result into state; cheaper and less disruptive than forcing a second deployment.
  if (guardWasArmed && !mod_update_all_profile) {
    try {
      const refreshedLO = await deserializeLoadOrder({ api });
      api.store.dispatch(actions.setFBLoadOrder(profileId, refreshedLO));
    } catch (err) {
      log('warn', `[${GAME_ID}] post-update load order refresh failed`, err);
    }
  }
  updating_mod = false; //reset updating flag on deploy
  api.dismissNotification(`${GAME_ID}-loadorderdeploy-notif`);
  return Promise.resolve();
}

async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }

  return Promise.resolve();
}

//React load order instructions renderer
function LoadOrderInstructions() {
  const { statusFilter, setStatusFilter } = usePakLOState();
  const { useSelector } = require('react-redux');
  const profile = useSelector((state) => selectors.activeProfile(state));
  const loadOrder = useSelector((state) => util.getSafe(state, ['persistent', 'loadOrder', profile?.id], []));
  const modState = useSelector((state) => util.getSafe(state, ['persistent', 'profiles', profile?.id, 'modState'], {}));
  const isLocked = (entry) => [true, 'true', 'always'].includes(entry?.locked);
  const isEnabled = (entry) => util.getSafe(modState, [entry.modId, 'enabled'], false);
  // Count entries matching the active filter (matched / total), shown beside the pills.
  const total = loadOrder.length;
  const matched = statusFilter.size > 0
    ? loadOrder.filter((e) => matchesStatus(e, statusFilter, isEnabled, isLocked)).length
    : total;
  useInjectStyleOnce('fblo-status-filter-hide-style', LO_ROW_HIDDEN_CSS);
  return React.createElement('div', null,
    React.createElement(StatusPills, { active: statusFilter, setActive: setStatusFilter, groups: ['enabled', 'locked', 'unmanaged'], count: statusFilter.size > 0 ? { matched, total } : null }),
    React.createElement('p', { style: { fontStyle: 'italic', color: '#7ec8e3' } },
      'Filter the list above by status. Clear the filter before reordering mods.',
    ),
    React.createElement('br', null),
    React.createElement('p', null,
      'Drag and drop the mods on the left to change the order in which they load. ',
    ),
    React.createElement('br', null),
    React.createElement('p', null,
      `${GAME_NAME_SHORT} loads mods in alphanumerical order, so Vortex prefixes the folder `,
      'names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. ',
      'The number in the left column represents the overwrite order. Changes from ',
      'mods with higher numbers take priority over mods that make similar edits.'
    ),
    React.createElement('br', null),
    React.createElement('p', { style: { fontWeight: 'bold', color: '#7ec8e3' } },
      'The Enable/Disable button on each row enables or disables the underlying Vortex mod. ',
      'Disabling a mod here will remove it from this view and disable it on the Mods tab. ',
      'Re-enabling it on the Mods tab will restore it to the load order.'
    ),
    React.createElement('br', null),
    React.createElement('p', { style: { fontWeight: 'bold' } },
      'YOU MUST DEPLOY MODS AFTER CHANGING THE ORDER TO APPLY CHANGES! ',
      '- This is required to rename the folders for the correct order.'
    ),
    React.createElement('br', null),
    React.createElement('p', { style: { color: 'yellow', fontWeight: 'bold' } },
      SPECIAL_LO_INSTRUCTIONS
    )
  );
}

//* PAK LO selection + context menu + status filter state (module-level pub-sub, shared across all item renderer instances)
let _pakSelectedIds = new Set();
let _pakContextMenu = null;
let _pakStatusFilter = new Set();
const _pakListeners = new Set();
function _notifyPak() { _pakListeners.forEach(l => l()); }
function usePakLOState() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    _pakListeners.add(forceUpdate);
    return () => _pakListeners.delete(forceUpdate);
  }, []);
  return {
    selectedIds: _pakSelectedIds,
    setSelectedIds: (fn) => { _pakSelectedIds = fn(_pakSelectedIds); _notifyPak(); },
    contextMenu: _pakContextMenu,
    setContextMenu: (val) => { _pakContextMenu = val; _notifyPak(); },
    statusFilter: _pakStatusFilter,
    setStatusFilter: (next) => { _pakStatusFilter = next; _notifyPak(); },
  };
}

//Resolve the mod page URL for a Vortex-managed load order entry (undefined when not resolvable).
//Prefers the mod's homepage attribute; falls back to composing the Nexus URL from the numeric mod id.
function getModPageURL(api, vortexModId) {
  if (vortexModId === undefined) return undefined;
  const attributes = util.getSafe(api.getState(), ['persistent', 'mods', GAME_ID, vortexModId, 'attributes'], {});
  if (attributes.homepage) return attributes.homepage;
  if (attributes.source === 'nexus' && attributes.modId !== undefined) {
    return `https://www.nexusmods.com/${GAME_ID}/mods/${attributes.modId}`;
  }
  return undefined;
}

//Resolve the staging folder of a Vortex-managed load order entry (undefined when not resolvable)
function getModStagingFolder(api, vortexModId) {
  if (vortexModId === undefined) return undefined;
  const state = api.getState();
  const installationPath = util.getSafe(state, ['persistent', 'mods', GAME_ID, vortexModId, 'installationPath'], undefined);
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  if (!installationPath || !stagingPath) return undefined;
  return path.join(stagingPath, installationPath);
}

//Status filter shared helpers (load order pages). Groups combine with AND across, OR within.
const STATUS_GROUP_TOKENS = { enabled: ['enabled', 'disabled'], locked: ['locked', 'unlocked'], unmanaged: ['unmanaged'] };
const STATUS_TOKEN_LABELS = { enabled: 'Enabled', disabled: 'Disabled', locked: 'Locked', unlocked: 'Unlocked', unmanaged: 'Unmanaged' };

function matchesStatus(entry, active, isEnabledFn, isLockedFn) {
  if (active.has('enabled') || active.has('disabled')) {
    const en = isEnabledFn(entry);
    if (!((active.has('enabled') && en) || (active.has('disabled') && !en))) return false;
  }
  if (active.has('locked') || active.has('unlocked')) {
    const lk = isLockedFn(entry);
    if (!((active.has('locked') && lk) || (active.has('unlocked') && !lk))) return false;
  }
  if (active.has('unmanaged') && entry.modId !== undefined) return false;
  return true;
}

//Style blocks injected by the load order surfaces (see useInjectStyleOnce below)
const LO_INDEX_FOCUS_CSS = '.load-order-index input:focus { background: white !important; color: black !important; } .layout-flex.file-based-load-order-list-outer { overflow: auto; }';
const LO_ROW_HIDDEN_CSS = '.file-based-load-order-list .list-group > div:has(.lo-row-hidden) { display: none !important; }';
const LO_CTX_MENU_CSS = '.ue4ss-ctx-item:hover { background: rgba(255,255,255,0.1); }';

//Extensions cannot ship CSS, so a component injects its styles into the document head on mount.
//Guarded by a fixed id, so repeated mounts (every row, every page visit) never duplicate the block.
function useInjectStyleOnce(styleId, css) {
  React.useEffect(() => {
    if (globalThis.document.getElementById(styleId)) return;
    const style = globalThis.document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    globalThis.document.head.appendChild(style);
  }, [styleId, css]);
}

//Shared dismiss behaviour for the context menus: any click or right-click outside closes the menu,
//as does Escape. Menu items call stopPropagation, so their own clicks never reach these listeners.
function useDismissOnOutside(onClose) {
  React.useEffect(() => {
    const dismiss = () => onClose();
    const onKey = (evt) => { if (evt.key === 'Escape') onClose(); };
    globalThis.document.addEventListener('click', dismiss);
    globalThis.document.addEventListener('contextmenu', dismiss);
    globalThis.document.addEventListener('keydown', onKey);
    return () => {
      globalThis.document.removeEventListener('click', dismiss);
      globalThis.document.removeEventListener('contextmenu', dismiss);
      globalThis.document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
}

//Viewport clamp for the context menus. The clamped position is measured once into state and then
//rendered, rather than written onto el.style after the fact - a fresh callback ref every render
//makes React detach and reattach it, and the next render would overwrite the mutated style anyway.
function useClampedMenuPosition(x, y) {
  const [position, setPosition] = React.useState({ left: x, top: y });
  const measureRef = React.useCallback((el) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = globalThis.window.innerWidth;
    const vh = globalThis.window.innerHeight;
    const left = (x + rect.width > vw) ? Math.max(8, vw - rect.width - 8) : x;
    const top = (y + rect.height > vh) ? Math.max(8, vh - rect.height - 8) : y;
    setPosition(prev => (prev.left === left && prev.top === top) ? prev : { left, top });
  }, [x, y]);
  return [position, measureRef];
}

//Inline toggle pills for status filtering (used in the InfoPanel surfaces, i.e. the core FBLO page)
function StatusPills({ active, setActive, groups, count }) {
  const { Button } = require('react-bootstrap');
  const tokens = groups.reduce((acc, g) => acc.concat(STATUS_GROUP_TOKENS[g] || []), []);
  const toggle = (token) => {
    const next = new Set(active);
    next.has(token) ? next.delete(token) : next.add(token);
    setActive(next);
  };
  return React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginBottom: 8 } },
    React.createElement('span', { style: { fontWeight: 'bold', marginRight: 4 } }, 'Filter:'),
    count != null ? React.createElement('span', { style: { color: '#7ec8e3', marginRight: 4 } }, `${count.matched} / ${count.total}`) : null,
    ...tokens.map(token => React.createElement(Button, {
      key: token,
      bsSize: 'xsmall',
      bsStyle: active.has(token) ? 'success' : 'default',
      style: active.has(token) ? { fontWeight: 'bold' } : undefined,
      onClick: () => toggle(token),
    }, STATUS_TOKEN_LABELS[token])),
    active.size > 0 ? React.createElement(Button, {
      key: '__clear',
      bsSize: 'xsmall',
      bsStyle: 'link',
      onClick: () => setActive(new Set()),
    }, 'Clear') : null,
  );
}

//* React line item renderer for load order
function LoadOrderItemRenderer(props) {
  const { className, item } = props;
  if (item?.loEntry === undefined) return null;

  const { ListGroupItem, Checkbox } = require('react-bootstrap');
  const { Icon, LoadOrderIndexInput, MainContext } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');

  const context = React.useContext(MainContext);
  const dispatch = useDispatch();

  const profile = useSelector((state) => selectors.activeProfile(state));
  const loadOrder = useSelector((state) =>
    util.getSafe(state, ['persistent', 'loadOrder', profile?.id], []),
  );

  const { loEntry, displayCheckboxes } = item;
  const mods = useSelector((state) => util.getSafe(state, ['persistent', 'mods', GAME_ID], {}));
  const pictureUrl = mods[loEntry.modId]?.attributes?.pictureUrl;
  //FBLO precomputes these on the item (memoized by its row cache); the fallbacks keep the
  //renderer working if it is ever mounted outside the FBLO page.
  const currentIdx = item.position ?? loadOrder.findIndex((e) => e.id === loEntry.id) + 1;
  const isModEnabled = useSelector(state =>
    util.getSafe(state, ['persistent', 'profiles', profile?.id, 'modState', loEntry.modId, 'enabled'], false));
  const modState = useSelector(state =>
    util.getSafe(state, ['persistent', 'profiles', profile?.id, 'modState'], {}));

  const isLocked = (entry) => [true, 'true', 'always'].includes(entry?.locked);
  const lockedCount = item.lockedEntriesCount ?? loadOrder.filter(isLocked).length;

  const onApplyIndex = React.useCallback((idx) => {
    if (currentIdx === idx) return;
    const newLO = loadOrder.filter((e) => e.id !== loEntry.id);
    newLO.splice(idx - 1, 0, loEntry);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
  }, [dispatch, profile, loadOrder, loEntry, currentIdx]);

  const onToggle = React.useCallback((evt) => {
    dispatch(actions.setFBLoadOrderEntry(profile.id, { ...loEntry, enabled: evt.target.checked }));
  }, [dispatch, profile, loEntry]);

  const onModToggle = React.useCallback(() => {
    if (!loEntry.modId) return;
    actions.setModsEnabled(context.api, profile.id, [loEntry.modId], !isModEnabled, { allowAutoDeploy: true });
  }, [profile, loEntry.modId, isModEnabled, context]);

  const isEntryLocked = isLocked(loEntry);

  const { selectedIds, setSelectedIds, contextMenu, setContextMenu, statusFilter } = usePakLOState();
  const isSelected = selectedIds.has(loEntry.id);
  //Shift-select must span visible rows only, so build the id list from the status-filtered order.
  //Memoized: a bare filter here would run once per row, i.e. O(n^2) over the whole load order.
  const allIds = React.useMemo(() => loadOrder
    .filter(e => matchesStatus(e, statusFilter, (entry) => util.getSafe(modState, [entry.modId, 'enabled'], false), isLocked))
    .map(e => e.id), [loadOrder, statusFilter, modState]);

  const onSelect = React.useCallback((evt) => {
    const ctrlKey = evt.ctrlKey || evt.metaKey;
    const shiftKey = evt.shiftKey;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (ctrlKey) {
        next.has(loEntry.id) ? next.delete(loEntry.id) : next.add(loEntry.id);
      } else if (shiftKey) {
        const lastId = [...prev].at(-1);
        const start = allIds.indexOf(lastId ?? loEntry.id);
        const end = allIds.indexOf(loEntry.id);
        const [lo, hi] = [Math.min(start, end), Math.max(start, end)];
        for (let i = lo; i <= hi; i++) next.add(allIds[i]);
      } else {
        next.clear();
        next.add(loEntry.id);
      }
      return next;
    });
  }, [loEntry.id, setSelectedIds, allIds]);

  const onContextMenu = React.useCallback((evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    setContextMenu({ x: evt.clientX, y: evt.clientY, itemId: loEntry.id });
  }, [loEntry.id, setContextMenu]);

  const onLock = React.useCallback(() => {
    const newLO = loadOrder.map(e => e.id === loEntry.id ? { ...e, locked: !isEntryLocked } : e);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
    serializeLoadOrder(context, newLO);
  }, [dispatch, context, profile, loadOrder, loEntry, isEntryLocked]);

  useInjectStyleOnce('lo-index-focus-style', LO_INDEX_FOCUS_CSS);

  const classes = ['load-order-entry'];
  if (className) classes.push(...className.split(' '));

  // Status filter: render hidden (but keep the DnD item count stable) when the entry is filtered out.
  // The 'lo-row-hidden' marker lets the injected CSS collapse the whole DraggableListItem wrapper
  // (the two dnd <div>s the renderer can't reach), otherwise their spacing leaves visible gaps.
  if (!matchesStatus(loEntry, statusFilter, () => isModEnabled, isLocked)) {
    return React.createElement(ListGroupItem, { key: loEntry.id, className: 'lo-row-hidden', style: { display: 'none' } });
  }

  return React.createElement(
    ListGroupItem,
    { key: loEntry.id, className: classes.join(' '), onClick: onSelect, onContextMenu: onContextMenu, style: { outline: isSelected ? '2px solid #337ab7' : 'none', outlineOffset: '-1px' } },
    React.createElement('div', { style: { visibility: isEntryLocked ? 'hidden' : 'visible' } },
      React.createElement(Icon, { className: 'drag-handle-icon', name: 'drag-handle' }),
    ),
    React.createElement('div', { style: { width: 24, flexShrink: 0, overflow: 'hidden' } },
      React.createElement(LoadOrderIndexInput, {
        className: 'load-order-index',
        api: context.api,
        item: loEntry,
        currentPosition: currentIdx,
        lockedEntriesCount: lockedCount,
        loadOrder: loadOrder,
        isLocked: isLocked,
        onApplyIndex: onApplyIndex,
      }),
    ),
    React.createElement('div', {
      style: { cursor: 'pointer', display: 'flex', alignItems: 'center' },
      title: isEntryLocked ? 'Unlock position' : 'Lock position',
      onClick: (evt) => { evt.stopPropagation(); onLock(); },
    },
      React.createElement(Icon, { name: isEntryLocked ? 'locked' : 'unlocked', style: { color: isEntryLocked ? '#e2c04c' : 'inherit' } }),
    ),
    React.createElement('div', { className: 'load-order-thumb-slot', style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, marginRight: 4, flexShrink: 0 } },
      !loEntry.modId ? React.createElement('div', {
        className: 'load-order-unmanaged-banner',
        title: 'Not managed by Vortex',
        style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textAlign: 'center', borderRadius: 2, border: '1px solid #e2c04c', background: 'rgba(226,192,76,0.12)', color: '#e2c04c', fontSize: 9, lineHeight: 1.1, padding: 2, pointerEvents: 'none' },
      },
        React.createElement(Icon, { className: 'external-caution-logo', name: 'feedback-warning', style: { color: '#e2c04c' } }),
        React.createElement('span', null, 'Not managed by Vortex'),
      ) : pictureUrl ? React.createElement('img', {
        className: 'load-order-thumb',
        src: pictureUrl,
        draggable: false,
        style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, objectFit: 'cover', borderRadius: 2, pointerEvents: 'none' },
      }) : null,
    ),
    React.createElement('p', { className: 'load-order-name', style: { whiteSpace: 'normal', wordBreak: 'break-word' } }, loEntry.name),
    loEntry.modId ? React.createElement('button', {
      className: 'btn btn-default btn-sm',
      style: { margin: '0 4px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 },
      onClick: evt => { evt.stopPropagation(); onModToggle(); },
    },
      React.createElement(Icon, { name: isModEnabled ? 'toggle-disabled' : 'toggle-enabled' }),
      isModEnabled ? 'Disable' : 'Enable',
    ) : null,
    displayCheckboxes ? React.createElement(Checkbox, {
      className: 'entry-checkbox',
      checked: loEntry.enabled,
      disabled: isLocked(loEntry),
      onChange: onToggle,
    }) : null,
    contextMenu?.itemId === loEntry.id ? React.createElement(PakContextMenu, {
      x: contextMenu.x, y: contextMenu.y,
      item: loEntry, loadOrder, profile, dispatch, context, selectedIds, isModEnabled,
      onClose: () => setContextMenu(null),
    }) : null,
  );
} //*/

function PakContextMenu({ x, y, item, loadOrder, profile, dispatch, context, selectedIds, isModEnabled, onClose }) {
  useDismissOnOutside(onClose);

  useInjectStyleOnce('ue4ss-ctx-menu-style', LO_CTX_MENU_CSS);

  const isLocked = (e) => [true, 'true', 'always'].includes(e?.locked);
  const isMulti = selectedIds.size >= 2 && selectedIds.has(item.id);
  const targets = isMulti ? loadOrder.filter(e => selectedIds.has(e.id)) : [item];

  const applyToTargets = (transform, serialize = false) => {
    const newLO = transform(loadOrder, targets);
    dispatch(actions.setFBLoadOrder(profile.id, newLO));
    if (serialize) serializeLoadOrder(context, newLO);
    onClose();
  };

  const isEntryLocked = isLocked(item);

  const setModsEnabled = (entries, enable) => {
    const modIds = entries.filter(e => e.modId !== undefined).map(e => e.modId);
    if (modIds.length > 0) {
      actions.setModsEnabled(context.api, profile.id, modIds, enable, { allowAutoDeploy: true });
    }
    onClose();
  };

  const [menuPosition, clampRef] = useClampedMenuPosition(x, y);
  const menuStyle = {
    position: 'fixed', left: menuPosition.left, top: menuPosition.top, zIndex: 9999,
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4, padding: '4px 0', minWidth: 180,
    boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
  };
  const itemStyle = { padding: '6px 16px', cursor: 'pointer', whiteSpace: 'nowrap' };
  const sepStyle = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' };

  const menuItem = (label, onClick) => React.createElement('div', {
    className: 'ue4ss-ctx-item',
    style: itemStyle,
    onClick: (evt) => { evt.stopPropagation(); onClick(); },
  }, label);

  if (isMulti) {
    const n = targets.length;
    return React.createElement('div', { ref: clampRef, style: menuStyle },
      menuItem(`Lock Selected (${n})`, () => applyToTargets((lo) => lo.map(e => targets.find(t => t.id === e.id) ? { ...e, locked: true } : e), true)),
      menuItem(`Unlock Selected (${n})`, () => applyToTargets((lo) => lo.map(e => targets.find(t => t.id === e.id) ? { ...e, locked: false } : e), true)),
      React.createElement('div', { style: sepStyle }),
      menuItem(`Move to Top (${n})`, () => applyToTargets((lo) => {
        const locked = lo.filter(isLocked);
        const selected = lo.filter(e => targets.find(t => t.id === e.id) && !isLocked(e));
        const rest = lo.filter(e => !isLocked(e) && !targets.find(t => t.id === e.id));
        return [...locked, ...selected, ...rest];
      })),
      menuItem(`Move to Bottom (${n})`, () => applyToTargets((lo) => {
        //Locked entries stay put, so they have to be counted into rest or they drop out of the order
        const selected = lo.filter(e => targets.find(t => t.id === e.id) && !isLocked(e));
        const rest = lo.filter(e => !targets.find(t => t.id === e.id) || isLocked(e));
        return [...rest, ...selected];
      })),
      React.createElement('div', { style: sepStyle }),
      //menuItem(`Enable Selected (${n})`, () => setModsEnabled(targets, true)),
      menuItem(`Disable Selected (${n})`, () => setModsEnabled(targets, false)),
    );
  }

  const modPageUrl = getModPageURL(context.api, item.modId);
  const stagingFolder = getModStagingFolder(context.api, item.modId);

  return React.createElement('div', { ref: clampRef, style: menuStyle },
    menuItem(isEntryLocked ? 'Unlock Position' : 'Lock Position', () => applyToTargets((lo) => lo.map(e => e.id === item.id ? { ...e, locked: !isEntryLocked } : e), true)),
    React.createElement('div', { style: sepStyle }),
    menuItem('Move to Top', () => applyToTargets((lo) => {
      if (isLocked(item)) return lo;
      const locked = lo.filter(isLocked);
      const rest = lo.filter(e => !isLocked(e) && e.id !== item.id);
      return [...locked, item, ...rest];
    })),
    menuItem('Move to Bottom', () => applyToTargets((lo) => {
      if (isLocked(item)) return lo;
      const rest = lo.filter(e => e.id !== item.id);
      return [...rest, item];
    })),
    (stagingFolder || modPageUrl) ? React.createElement('div', { style: sepStyle }) : null,
    stagingFolder ? menuItem('Open Staging Folder', () => { util.opn(stagingFolder).catch(() => null); onClose(); }) : null,
    modPageUrl ? menuItem('Open Mod Page', () => { util.opn(modPageUrl).catch(() => null); onClose(); }) : null,
    item.modId && isModEnabled ? React.createElement('div', { style: sepStyle }) : null,
    item.modId && isModEnabled ? menuItem('Disable Vortex Mod', () => setModsEnabled([item], false)) : null,
  );
}

//export to Vortex
module.exports = {
  default: main,
};
