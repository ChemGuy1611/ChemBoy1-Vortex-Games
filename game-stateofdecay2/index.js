/*/////////////////////////////////////////////////////
Name: State of Decay 2 Vortex Extension
Structure: UE4 (Local AppData)
Author: ChemBoy1
Version: 2.2.0
Date: 2026-01-31
/////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');

//Specify all information about the game
const GAME_ID = "stateofdecay2";
const STEAMAPP_ID = "495420";
const EPICAPP_ID = "Snoek";
const GOGAPP_ID = null;
const XBOXAPP_ID = "Microsoft.Dayton";
const XBOXEXECNAME = "Shipping";
const EPIC_CODE_NAME = "StateOfDecay2";
const GAME_NAME = "State of Decay 2";
const GAME_NAME_SHORT = "State of Decay 2";
const EXEC = `StateOfDecay2.exe`;
const EXEC_XBOX = `gamelaunchhelper.exe`;
const LOCALAPPDATA = util.getVortexPath('localAppData');
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/State_of_Decay_2";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/946"; //Nexus link to this extension. Used for links

let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let GAME_VERSION = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//Unreal Engine Game Data
const XBOX_DATA_PATH = path.join('Packages', `${XBOXAPP_ID}_8wekyb3d8bbwe`, 'LocalCache', 'Local');
const UNREALDATA = {
  absModsPath: path.join(LOCALAPPDATA, EPIC_CODE_NAME, 'Saved', 'Paks'),
  //absModsPath: path.join(LOCALAPPDATA, XBOX_DATA_PATH, 'Saved', 'Paks'), //XBOX Version
  fileExt: '.pak',
  loadOrder: true,
}

//Information for mod types and installers
const COOKED_ID = `${GAME_ID}-cooked`;
const COOKED_NAME = "Cooked Mods";
//const COOKED_PATH = path.join(EPIC_CODE_NAME, 'Saved', 'Cooked', 'WindowsNoEditor', EPIC_CODE_NAME);
const COOKED_PATH = path.join(EPIC_CODE_NAME, 'Saved');
const XBOX_COOKED_PATH = path.join(XBOX_DATA_PATH, COOKED_PATH);
const COOKED_FILE = "Cooked";
const COOKED_EXT = ".uasset";

const PAK_ID = `${GAME_ID}-pak`;
const PAK_NAME = "Paks";
const PAK_PATH = path.join(EPIC_CODE_NAME, "Saved", "Paks");
const XBOX_PAK_PATH = path.join(XBOX_DATA_PATH, PAK_PATH);

const MANAGER_ID = `${GAME_ID}-modmanager`;
const MANAGER_NAME = "SoD2 Mod Manager";
const MANAGER_EXEC = "modintegrator.exe";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Game Folder";
const ROOT_FILE = EPIC_CODE_NAME;

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config (LocalAppData)";
const CONFIG_PATH = path.join(EPIC_CODE_NAME, "Saved", "Config", "WindowsNoEditor");
const XBOX_CONFIG_PATH = path.join(XBOX_DATA_PATH, CONFIG_PATH);
const CONFIG_FILE1 = "engine.ini";
const CONFIG_FILE2 = "input.ini";
const CONFIG_EXT = ".ini";

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";
const BINPATH_STEAM = path.join(EPIC_CODE_NAME, "Binaries", "Win64");
const BINPATH_XBOX = path.join(EPIC_CODE_NAME, "Binaries", "Win64");
const BINPATH_EPIC = path.join(EPIC_CODE_NAME, "Binaries", "Win64");
let BINARIES_PATH = '';
let BINARIES_TARGET = '';

const COMMUNITYEDITOR_ID = `${GAME_ID}-communityeditor`;
const COMMUNITYEDITOR_NAME = "Community Editor";
const COMMUNITYEDITOR_EXEC = "CommunityEditor.exe";

const MOD_PATH_DEFAULT = path.join(LOCALAPPDATA, COOKED_PATH);
const XBOX_MOD_PATH_DEFAULT = path.join(LOCALAPPDATA, XBOX_COOKED_PATH);

const REQ_FILE = EPIC_CODE_NAME;

// Filled in from info above
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
    //"modPath": XBOX_MOD_PATH_DEFAULT, //XBOX mod path
    "modPathIsRelative": false,
    "requiredFiles": [
      //EXEC,
      REQ_FILE,
    ],
    "details": {
      "unrealEngine": UNREALDATA,
      "epicAppId": EPICAPP_ID,
      "steamAppId": +STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "customOpenModsPath": UNREALDATA.absModsPath || UNREALDATA.modsPath
    },
    "compatible": {
      "unrealEngine": true
    },
    "environment": {
      "EpicAppId": EPICAPP_ID,
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": CONFIG_ID,
      "name": "Config (LocalAppData)",
      "priority": "high",
      "targetPath": path.join("{localAppData}", CONFIG_PATH)
      //"targetPath": path.join("{localAppData}", XBOX_CONFIG_PATH) //XBOX Config path
    },
    {
      "id": PAK_ID,
      "name": PAK_NAME,
      "priority": "high",
      "targetPath": path.join("{localAppData}", PAK_PATH)
      //"targetPath": path.join("{localAppData}", XBOX_PAK_PATH) //XBOX Pak path
    },
    {
      "id": COOKED_ID,
      "name": COOKED_NAME,
      "priority": "high",
      "targetPath": path.join("{localAppData}", COOKED_PATH)
      //"targetPath": path.join("{localAppData}", XBOX_COOKED_PATH) //XBOX Cooked path
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": MANAGER_ID,
      "name": MANAGER_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
      //GOGAPP_ID,
      XBOXAPP_ID
    ],
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: "SOD2ModManager",
    name: "SoD2 Mod Manager",
    logo: "manager.png",
    executable: () => MANAGER_EXEC,
    requiredFiles: [MANAGER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
  {
    id: COMMUNITYEDITOR_ID,
    name: COMMUNITYEDITOR_NAME,
    logo: "editor.png",
    executable: () => COMMUNITYEDITOR_EXEC,
    requiredFiles: [COMMUNITYEDITOR_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
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
    //defaultPrimary: true,
    //parameters: [],
  }, //*/
  /*{
    id: `${GAME_ID}-customlaunchxbox`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC_XBOX,
    requiredFiles: [EXEC_XBOX],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: [],
  }, //*/
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

//Set mod type priorities
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

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'xbox') {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  }
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

function getExecutable(discoveredPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveredPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    BINARIES_PATH = BINPATH_XBOX;
    BINARIES_TARGET = path.join("{gamePath}", BINARIES_PATH);
    return EXEC_XBOX;
  }; //*/
  /*if (isCorrectExec(EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    BINARIES_PATH = BINPATH_EPIC;
    BINARIES_TARGET = path.join("{gamePath}", BINARIES_PATH);
    return EXEC_EPIC;
  }; //*/
  GAME_VERSION = 'steam';
  BINARIES_PATH = BINPATH_STEAM;
  BINARIES_TARGET = path.join("{gamePath}", BINARIES_PATH);
  return EXEC;
}

async function setGameVersion(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  } //*/
  else {
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  };
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

//Check if mod injector is installed
function isModManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MANAGER_ID);
}

//Function to auto-download Mod Loader
async function downloadModManager(api, gameSpec) {
  let modManagerInstalled = isModManagerInstalled(api, gameSpec);
  if (!modManagerInstalled) {
    //notification indicating install process
    const NOTIF_ID = "stateofdecay2-modmanager-installing";
    const MOD_NAME = "SoD2 Mod Manager";
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

    const modPageId = 96;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
      };
      const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [nxmUrl], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, MANAGER_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for config files
function testConfig(files, gameId) {
  const isConfig = files.some(file => (path.basename(file).toLowerCase() === (CONFIG_FILE1 || CONFIG_FILE2)));
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
function installConfig(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === CONFIG_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

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

//Installer test for Mod Manager
function testModManager(files, gameId) {
  const isManager = files.some(file => (path.basename(file).toLowerCase() === MANAGER_EXEC));
  let supported = (gameId === spec.game.id) && isManager

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

//Install Mod Manager files
function installModManager(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MANAGER_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MANAGER_ID };

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

//Installer test for Cooked mods
function testCooked(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === COOKED_FILE));
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

//Installer install Cooked mods
function installCooked(files) {
  const modFile = files.find(file => (path.basename(file) === COOKED_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: COOKED_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    //((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    ((file.indexOf(rootPath) !== -1))
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

//Installer test for Cooked mods
function testRoot(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === ROOT_FILE));
  const isCooked = files.some(file => (path.extname(file) === COOKED_EXT)); //common file in Cooked mods. Author may have packaged without Cooked folder.
  let supported = (gameId === spec.game.id) && isMod && !isCooked;

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

//Installer install Cooked mods
function installRoot(files) {
  const modFile = files.find(file => (path.basename(file) === ROOT_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    //((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    ((file.indexOf(rootPath) !== -1))
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

//Test for Mod Loader mods
function testBinaries(files, gameId) {
  const isCooked = files.some(file => (path.extname(file) === COOKED_EXT)); //common file in Cooked mods. Author may have packaged without Cooked folder.
  let supported = (gameId === spec.game.id) && !isCooked;

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

//Install Mod Loader mods
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

//Pre-sort function
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = (UNREALDATA.fileExt || '.pak').substr(1).toUpperCase();

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

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setupnotification`;
  const MESSAGE = 'IMPORTANT - Intregation Mods and SoD2 Mod Manger';
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
            text: 'IMPORTANT - This extension cannot directly install "Integration" pak mods that require the SoD2 Mod Manager. Note that if you run SoD2 MM while Vortex pak mods are deployed, it will forcibly rename the .pak files. This breaks the symlink/hardlink deployment of Vortex and will generate an "External Changes" popup. You can deal with this in one of the ways below.\n'
                + '\n'
                + 'A. If you want to use Integration Mods without impacting your Vortex pak mod deployment, simply Purge mods in Vortex, then install mods with SoD2 MM, then Deploy mods in Vortex again. This will avoid files being forcibly renamed.\n'
                + '\n'
                + 'B. You can just let SoD2 MM go ahead and rename the pak files after installing with Vortex and accept the External Changes popup. You can always Reinstall mods in Vortex if you need to get the original pak back..\n'
                + '\n'
                + 'Either way, you can download all mods through Vortex and then choose one of the above options for Integration Mods. The extension includes a tool to launch SoD2 MM from the Vortex Dashboard.\n'
                + '\n'
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

//*
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') { // use appxmanifest.xml for Xbox version
    try {
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parsed = await parseStringPromise(appManifest);
      version = parsed?.Package?.Identity?.[0]?.$?.Version;
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  else { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

//Setup function
async function setup(discovery, api, gameSpec) {
  GAME_PATH = discovery.path;
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  //await downloadModManager(api, gameSpec);
  setupNotify(api);
  await fs.ensureDirWritableAsync(GAME_PATH, BINARIES_PATH);
  await fs.ensureDirWritableAsync(path.join(LOCALAPPDATA, COOKED_PATH));
  await fs.ensureDirWritableAsync(path.join(LOCALAPPDATA, CONFIG_PATH));
  return fs.ensureDirWritableAsync(path.join(LOCALAPPDATA, PAK_PATH));
  //await fs.ensureDirWritableAsync(path.join(LOCALAPPDATA, XBOX_COOKED_PATH)); //XBOX Version
  //await fs.ensureDirWritableAsync(path.join(LOCALAPPDATA, XBOX_CONFIG_PATH)); //XBOX Version
  //return fs.ensureDirWritableAsync(path.join(LOCALAPPDATA, XBOX_PAK_PATH)); //XBOX Version
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  context.requireExtension('Unreal Engine Mod Installer'); //require other extensions
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
    getGameVersion: resolveGameVersion,
  };
  context.registerGame(game); //register the game
  //register mod types recursively
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });
  //register mod types explictly
  context.registerModType(BINARIES_ID, 45,
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    (game) => pathPattern(context.api, game, BINARIES_TARGET),
    () => Promise.resolve(false),
    { name: BINARIES_NAME }
  );

  //register mod installers
  //25 is pak installer from UEMI
  context.registerInstaller(MANAGER_ID, 30, testModManager, installModManager);
  context.registerInstaller(CONFIG_ID, 35, testConfig, installConfig);
  context.registerInstaller(COOKED_ID, 40, testCooked, installCooked);
  context.registerInstaller(ROOT_ID, 45, testRoot, installRoot);
  context.registerInstaller(BINARIES_ID, 49, testBinaries, installBinaries);
  //default mod installation to Cooked folder

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download SoD2 Mod Manager', () => {
    downloadModManager(context.api, spec).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Paks Folder', () => {
    const openPath = path.join(LOCALAPPDATA, PAK_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(path.join(LOCALAPPDATA, CONFIG_PATH)).catch(() => null);
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
  if (UNREALDATA.loadOrder === true) {
    let previousLO;
    context.registerLoadOrderPage({
      gameId: spec.game.id,
      gameArtURL: path.join(__dirname, spec.game.logo),
      preSort: (items, direction) => preSort(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === 'ue4-sortable-modtype'),
      displayCheckboxes: true,
      callback: (loadOrder) => {
        if (previousLO === undefined) previousLO = loadOrder;
        if (loadOrder === previousLO) return;
        context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
        previousLO = loadOrder;
      },
      createInfoPanel: () =>
      context.api.translate(`Drag and drop the mods on the left to change the order in which they load. ${spec.game.name} loads mods in alphanumerical order, so Vortex prefixes `
      + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
      + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.'),
    });
  }
  context.once(() => { // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
