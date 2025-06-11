/*
Name: Mortal Kombat 1 Vortex Extension
Structure: UE5 (Sig Bypass)
Author: ChemBoy1
Version: 0.1.0
Date: 10/15/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all information about the game
const GAME_ID = "mortalkombat";
const STEAMAPP_ID = "1971870";
const EPICAPP_ID = "";
const GOGAPP_ID = "";
const XBOXAPP_ID = "";
const XBOXEXECNAME = "";
const EPIC_CODE_NAME = "MK12";
const EXEC_FOLDER_NAME = "Win64";
const GAME_NAME = "Mortal Kombat 1";
const GAME_NAME_SHORT = "MK1";
const EXEC = "MK12.exe";
const IO_STORE = true; //true if the Paks folder contains .ucas and .utoc files

//Data for Unreal Engine Mod Installer
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'),
  fileExt: ['.pak', '.ucas', '.utoc'],
  loadOrder: true,
}

//This information will be filled in from the data above
const SHIPPING_EXE = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_NAME}\\${EPIC_CODE_NAME}-MK12.exe`;
const BINARIES_ID = `${GAME_ID}-binaries`;
const EXEC_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_NAME}`;

const UE5_ID = `${GAME_ID}-ue5`;
const UE5_ALT_ID = `${GAME_ID}-pakalt`;
const UE5_EXT = UNREALDATA.fileExt;
const UE5_PATH = UNREALDATA.modsPath;
const UE5_ALT_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks');

const LOGICMODS_ID = `${GAME_ID}-logicmods`;
const UE4SSCOMBO_ID = `${GAME_ID}-ue4sscombo`;
const LOGICMODS_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks', 'LogicMods');
const LOGICMODS_FILE = "LogicMods";
const LOGICMODS_EXT = ".pak";

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_PATH = `${EPIC_CODE_NAME}\\Saved\\Config\\Windows`;
const CONFIG_FILES = ["engine.ini", "scalability.ini", "input.ini"];
const CONFIG_EXT = ".ini";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_FILE = EPIC_CODE_NAME;
const ROOT_IDX = `${EPIC_CODE_NAME}\\`;

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_PATH = path.join(EPIC_CODE_NAME, "Saved", "SaveGames");
let USERID_FOLDER = "";
const SAVE_EXT = ".sav";

const SCRIPTS_ID = `${GAME_ID}-scripts`;
const SCRIPTS_PATH = `${EPIC_CODE_NAME}\\Binaries\\${EXEC_FOLDER_NAME}\\Mods`;
const SCRIPTS_EXT = ".lua";
const SCRIPTS_FILE = "Scripts";
const SCRIPTS_IDX = `Scripts\\`;

const UE4SS_ID = `${GAME_ID}-ue4ss`;
const UE4SS_FILE = "dwmapi.dll";

const SIGBYPASS_ID = `${GAME_ID}-sigbypass`;
const SIGBYPASS_EXEC = "patch_proj.exe";

//Set file number for pak installer file selection (needs to be 3 if IO Store is used to accomodate .ucas and .utoc files)
let PAK_FILE_MIN = 1;
let SYM_LINKS = true;
if (IO_STORE) {
  PAK_FILE_MIN = 3;
  SYM_LINKS = false;
}
else {
  PAK_FILE_MIN = 1;
  SYM_LINKS = true;
}

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": EXEC_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC,
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      //"epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
      "nexusPageId": GAME_ID,
      "supportsSymlinks": SYM_LINKS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      //"EpicAPPId": EPICAPP_ID,
      //"XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": SCRIPTS_ID,
      "name": "UE4SS Scripts",
      "priority": "high",
      "targetPath": `{gamePath}\\${SCRIPTS_PATH}`
    },
    {
      "id": LOGICMODS_ID,
      "name": "UE4SS LogicMods (Blueprint)",
      "priority": "high",
      "targetPath": `{gamePath}\\${LOGICMODS_PATH}`
    },
    {
      "id": UE4SSCOMBO_ID,
      "name": "UE4SS Script-LogicMod Combo",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    /*
    {
      "id": CONFIG_ID,
      "name": "Config (LocalAppData)",
      "priority": "high",
      "targetPath": `{localAppData}\\${CONFIG_PATH}`
    },
    {
      "id": SAVE_ID,
      "name": "Saves (Game Directory)",
      "priority": "high",
      "targetPath": `{localAppData}\\${SAVE_PATH}`
    },
    */
    {
      "id": ROOT_ID,
      "name": "Root Game Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": UE5_ID,
      "name": "UE5 Paks",
      "priority": "high",
      "targetPath": `{gamePath}\\${UE5_PATH}`
    },
    {
      "id": UE5_ALT_ID,
      "name": 'UE5 Paks (no "~mods")',
      "priority": "high",
      "targetPath": `{gamePath}\\${UE5_ALT_PATH}`
    },
    {
      "id": BINARIES_ID,
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": `{gamePath}\\${EXEC_PATH}`
    },
    {
      "id": UE4SS_ID,
      "name": "UE4SS",
      "priority": "low",
      "targetPath": `{gamePath}\\${EXEC_PATH}`
    },
    {
      "id": SIGBYPASS_ID,
      "name": "Signature Bypass",
      "priority": "low",
      "targetPath": `{gamePath}\\${EXEC_PATH}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
      //GOGAPP_ID,
      //XBOXAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: "LaunchModdedGame",
    name: "Launch Modded Game",
    logo: `exec.png`,
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    defaultPrimary: true,
    isPrimary: true,
    parameters: ['-fileopenlog']
  },
  {
    id: "SigBypassPatch",
    name: "Sig Bypass Patch",
    logo: `sigbypass.png`,
    executable: () => SIGBYPASS_EXEC,
    requiredFiles: [SIGBYPASS_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //isPrimary: true,
    parameters: []
  },

];

//Set mod type priorities
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
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Set the mod path
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game information by API utility
async function queryGame() {
  let game = await util.GameStoreHelper.findByAppId(spec.discovery.ids);
  return game;
}

//Find game install location 
async function queryPath(api) {
  let game = await queryGame();
  return game.gamePath;
}

//Set launcher requirements
async function requiresLauncher() {
//async function requiresLauncher(api) {
  let game = await queryGame();

  if (game.gameStoreId === "steam") {
    return undefined;
  }

  if (game.gameStoreId === "gog") {
    return undefined;
  }

  /*
  if (game.gameStoreId === "epic") {
    //api.showErrorNotification('Epic AppName needed to launch game', 'Please see the extension page on Nexus Mods for instructions and send the Epic AppName to the mod author.');
    //return undefined;
    return {
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    };
  }
  */

  /*
  if (game.gameStoreId === "xbox") {
    return {
      launcher: "xbox",
      addInfo: {
        appId: XBOXAPP_ID,
        // appExecName is the <Application id="" in the appxmanifest.xml file
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    };
  }
  */

  return undefined;
}

//Test for save files
function testUe4ssCombo(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === SCRIPTS_EXT) !== undefined;
  const isMod2 = files.find(file => path.extname(file).toLowerCase() === LOGICMODS_EXT) !== undefined;
  const isFolder = files.find(file => path.basename(file) === ROOT_FILE) !== undefined;
  let supported = (gameId === spec.game.id) && isMod && isMod2 && isFolder;

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
function installUe4ssCombo(files, fileName) {
  const modFile = files.find(file => path.basename(file) === ROOT_FILE);
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE4SSCOMBO_ID };

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

//Test for save files
function testLogic(files, gameId) {
  const isMod = files.some(file => path.basename(file) === LOGICMODS_FILE);
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
function installLogic(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === LOGICMODS_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOGICMODS_ID };

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

//Installer test for UE4SS files
function testUe4ss(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === UE4SS_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install UE4SS files
function installUe4ss(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === UE4SS_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: UE4SS_ID };

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

//Installer test for Signature Bypass files
function testSigBypass(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === SIGBYPASS_EXEC);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install UE4SS files
function installSigBypass(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === SIGBYPASS_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SIGBYPASS_ID };

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

//Test for save files
function testScripts(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === SCRIPTS_EXT) !== undefined;
  const isFolder = files.find(file => path.basename(file) === SCRIPTS_FILE) !== undefined;
  let supported = (gameId === spec.game.id) && isMod && isFolder;

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
function installScripts(files, fileName) {
  const modFile = files.find(file => path.basename(file) === SCRIPTS_FILE);
  const idx = modFile.indexOf(SCRIPTS_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SCRIPTS_ID };
  const MOD_NAME = path.basename(fileName);
  const MOD_FOLDER = MOD_NAME.replace(/[\-]*[\d]*[\.]*( )*(installing)*/gi, '');;

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(MOD_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for config files
function testConfig(files, gameId) {
  const isConfig = files.find(file => CONFIG_FILES.includes(path.basename(file).toLowerCase())) !== undefined;
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
  const modFile = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

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
  //const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === ROOT_FILE);
  const isMod = files.some(file => path.basename(file) === ROOT_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installRoot(files) {
  //const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === ROOT_FILE);
  const modFile = files.find(file => path.basename(file) === ROOT_FILE);
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
    //((file.indexOf(rootPath) !== -1))
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

//Test for save files
function testSave(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT) !== undefined;
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
function installSave(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

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

//Check if UE4SS is installed
function isUe4ssInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === UE4SS_ID);
}

//Check if Signature Bypass is installed
function isSigBypassInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === SIGBYPASS_ID);
}

//Function to auto-download UE4SS from Nexus
async function downloadUe4ss(api, gameSpec) {
  let modLoaderInstalled = isUe4ssInstalled(api, gameSpec);
  
  if (!modLoaderInstalled) {
    //notification indicating install process
    const MOD_NAME = `UE4SS`;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
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

    const modPageId = 19;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = () => Number.parseInt(input.uploaded_time, 10);
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
        actions.setModType(gameSpec.game.id, modId, UE4SS_ID), // Set the mod type
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

//Function to auto-download Signature Bypass from Nexus
async function downloadSigBypass(api, gameSpec) {
  let modLoaderInstalled = isSigBypassInstalled(api, gameSpec);
  
  if (!modLoaderInstalled) {
    //notification indicating install process
    const MOD_NAME = `Signature Bypass`;
    const NOTIF_ID = `${GAME_ID}-${MOD_NAME}-installing`;
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

    const modPageId = 7;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = () => Number.parseInt(input.uploaded_time, 10);
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
        actions.setModType(gameSpec.game.id, modId, SIGBYPASS_ID), // Set the mod type
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

//Setup function
async function setup(discovery, api, gameSpec) {
  //await downloadUe4ss(api, gameSpec);
  await downloadSigBypass(api, gameSpec);
  //await fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], CONFIG_PATH));
  //await fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], SAVE_PATH, USERID_FOLDER));
  await fs.ensureDirWritableAsync(path.join(discovery.path, SCRIPTS_PATH));
  await fs.ensureDirWritableAsync(path.join(discovery.path, LOGICMODS_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, UE5_PATH));
}

///*
//UNREAL - Pre-sort function
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
//*/

///*
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
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

function loadOrderPrefix(api, mod) {
  const state = api.getState();
  const gameId = mod.attributes.downloadGame;
  if (!gameId)
      return 'ZZZZ-';
  const profile = selectors.lastActiveProfileForGame(state, gameId);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile], {});
  const loKeys = Object.keys(loadOrder);
  const pos = loKeys.indexOf(mod.id);
  if (pos === -1) {
      return 'ZZZZ-';
  }
  return makePrefix(pos) + '-';
}

function installUnrealMod(api, files, gameId) {
  return __awaiter(this, void 0, void 0, function* () {
    const game = gameId;
    const fileExt = UNREALDATA.fileExt;
    if (!fileExt)
      Promise.reject('Unsupported game - UE5 installer failed.');
    const modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const modType = {
      type: 'setmodtype',
      value: 'ue5-sortable-modtype',
    };
    const installFiles = (modFiles.length > PAK_FILE_MIN)
      ? yield chooseFilesToInstall(api, modFiles, fileExt)
      : modFiles;
    const unrealModFiles = {
      type: 'attribute',
      key: 'unrealModFiles',
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
    instructions.push(unrealModFiles);
    return Promise.resolve({ instructions });
  });
}

function chooseFilesToInstall(api, files, fileExt) {
  return __awaiter(this, void 0, void 0, function* () {
    const t = api.translate;
    return api.showDialog('question', t('Multiple {{PAK}} files', { replace: { PAK: fileExt } }), {
        text: t('The mod you are installing contains {{x}} {{ext}} files.', { replace: { x: files.length, ext: fileExt } }) +
            `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
        checkboxes: files.map((pak) => {
            return {
                id: path.basename(pak),
                text: path.basename(pak),
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

function UNREALEXTENSION(context) {
  const testUnrealGame = (gameId, withLoadOrder) => {
    const game = gameId === spec.game.id;
    const unrealModsPath = UNREALDATA.modsPath;
    const loadOrder = UNREALDATA.loadOrder;
    return (!!unrealModsPath && game && loadOrder === true);
  };

  const testForUnrealMod = (files, gameId) => {
    const supportedGame = testUnrealGame(gameId);
    const fileExt = UNREALDATA.fileExt;
    let modFiles = [];
    if (fileExt)
      modFiles = files.filter(file => fileExt.includes(path.extname(file).toLowerCase()));
    const supported = (supportedGame && (gameId === spec.game.id) && modFiles.length > 0);
    return Promise.resolve({
      supported,
      requiredFiles: []
    });
  };


  const getUnrealModsPath = (game) => {
    /*
    const absModsPath = UNREALDATA.absModsPath;
    if (absModsPath)
      return absModsPath;
    */
    const modsPath = UNREALDATA.modsPath;
    const state = context.api.getState();
    const discoveryPath = util.getSafe(state.settings, ['gameMode', 'discovered', game.id, 'path'], undefined);
    const installPath = [discoveryPath].concat(modsPath.split(path.sep));
    return discoveryPath ? path.join.apply(null, installPath) : undefined;
  };

  context.registerInstaller('ue5-pak-installer', 35, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealMod(context.api, files, gameId));

  context.registerModType('ue5-sortable-modtype', 25, (gameId) => testUnrealGame(gameId, true), getUnrealModsPath, () => Promise.resolve(false), {
    name: 'UE Sortable Mod',
    mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id
  });
}

//Let vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher,
    //requiresLauncher: async () => await requiresLauncher(context.api),
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
  context.registerInstaller(`${GAME_ID}-ue4ss-logicscriptcombo`, 25, testUe4ssCombo, installUe4ssCombo);
  context.registerInstaller(`${GAME_ID}-ue4ss-logicmod`, 30, testLogic, installLogic);
  //35 is pak installer above
  context.registerInstaller(`${GAME_ID}-ue4ss`, 40, testUe4ss, installUe4ss);
  context.registerInstaller(`${GAME_ID}-sigbypass`, 45, testSigBypass, installSigBypass);
  context.registerInstaller(`${GAME_ID}-ue4ss-scripts`, 50, testScripts, installScripts);
  context.registerInstaller(`${GAME_ID}-root`, 55, testRoot, installRoot);
  //context.registerInstaller(`${GAME_ID}-config`, 60, testConfig, installConfig);
  //context.registerInstaller(`${GAME_ID}-save`, 65, testSave, installSave);
}

//Main function
function main(context) {
  UNREALEXTENSION(context);
  applyGame(context, spec);
  //UNREAL - mod load order
  if (UNREALDATA.loadOrder === true) {
    let previousLO;
    context.registerLoadOrderPage({
      gameId: spec.game.id,
      gameArtURL: path.join(__dirname, spec.game.logo),
      preSort: (items, direction) => preSort(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === 'ue5-sortable-modtype'),
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

  context.once(() => {
    // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
