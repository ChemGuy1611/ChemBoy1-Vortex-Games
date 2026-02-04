/*//////////////////////////////////////////////////
Name: Hellblade 2 Vortex Extension
Structure: UE5 (XBOX Integrated)
Author: ChemBoy1
Version: 0.5.0
Date: 2026-02-01
//////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');

//Specify all information about the game
const GAME_ID = "senuassagahellblade2";
const STEAMAPP_ID = "2461850";
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = "Microsoft.Superb";
const XBOXEXECNAME = "AppHellblade2Shipping";
const EPIC_CODE_NAME = "Hellblade2";
const GAME_NAME = "Senua's Saga: Hellblade 2";
const GAME_NAME_SHORT = "SS: Hellblade 2";

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  //gog: [{ id: GOGAPP_ID }],
  //epic: [{ id: EPICAPP_ID }],
  xbox: [{ id: XBOXAPP_ID }],
};

//Information for setting the executable and variable paths based on the game store version
let MOD_PATH = null;
let BINARIES_TARGET = null;
let CONFIG_PATH = null;
let CONFIG_TARGET = null;
let requiredFiles = [EPIC_CODE_NAME];
let GAME_VERSION = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

const CONFIG_PATH_DEFAULT = path.join(EPIC_CODE_NAME, "Saved", "Config", "Windows");
const CONFIG_PATH_XBOX = path.join(EPIC_CODE_NAME, "Saved", "Config", "WinGDK"); //XBOX Version
const LOCALAPPDATA = util.getVortexPath('localAppData');

const STEAM_EXEC_FOLDER = "Win64";
//const GOG_EXEC_FOLDER = "Win64";
//const EPIC_EXEC_FOLDER = "Win64";
const XBOX_EXEC_FOLDER = "WinGDK";

const STEAM_EXEC= `Hellblade2.exe`;
//const GOG_EXEC= `Hellblade2.exe`;
//const EPIC_EXEC = `Hellblade2.exe`;
const XBOX_EXEC = `gamelaunchhelper.exe`;

const EXEC_XBOX = XBOX_EXEC;
const EXEC_STEAM = STEAM_EXEC;

/*
  Unreal Engine Game Data
  - modsPath: this is where the mod files need to be installed, relative to the game install folder.
  - fileExt(optional): if for some reason the game uses something other than PAK files, add the extensions here.
  - loadOrder: do we want to show the load order tab?
*/
const UNREALDATA = {
  modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks', '~mods'),
  //modsPath: path.join(EPIC_CODE_NAME, 'Content', 'Paks'), //XBOX Version
  fileExt: ['.pak', '.ucas', '.utoc'],
  loadOrder: true,
}

//This information will be filled in from the data above
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries (Engine Injector)";

const UE5_ID = `${GAME_ID}-ue5`;
const UE5_ALT_ID = `${GAME_ID}-pakalt`;
const UE5_EXT = UNREALDATA.fileExt;
const UE5_PATH = UNREALDATA.modsPath;
const UE5_ALT_PATH = path.join(EPIC_CODE_NAME, 'Content', 'Paks');
const UE5_SORTABLE_ID = `${GAME_ID}-ue5-sortable-modtype`;
const LEGACY_UE5_SORTABLE_ID = 'ue5-sortable-modtype';
const UE5_SORTABLE_NAME = 'UE5 Sortable Mod';

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config (LocalAppData)";
const CONFIG_FILE1 = "engine.ini";
const CONFIG_FILE2 = "scalability.ini";
const CONFIG_FILE = [CONFIG_FILE1, CONFIG_FILE2];
const CONFIG_EXT = ".ini";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_FOLDER = EPIC_CODE_NAME;

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_PATH = path.join(EPIC_CODE_NAME, "Saved", "SaveGames");
//const USER_ID = process.env["USER_ID"]; //XBOX Version
//const SAVE_PATH = path.join("Packages", `${XBOXAPP_ID}_8wekyb3d8bbwe`, "SystemAppData", "wgs", USER_ID); //XBOX Version
const SAVE_EXT = ".sav";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "details": {
      "steamAppId": +STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      //"epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      //"EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": SAVE_ID,
      "name": "Save (LocalAppData)",
      "priority": "high",
      "targetPath": path.join('{localAppData}', SAVE_PATH)
    },
    {
      "id": UE5_ID,
      "name": "UE5 Paks",
      "priority": "high",
      "targetPath": path.join('{gamePath}', UE5_PATH)
    },
    {
      "id": UE5_ALT_ID,
      "name": 'Paks (Alt, no "~mods")',
      "priority": "high",
      "targetPath": path.join('{gamePath}', UE5_ALT_PATH)
    },
    {
      "id": ROOT_ID,
      "name": "Root Game Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    }
  ],
};

//3rd party tools and launchers
const tools = [

];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 30,
    low: 75,
  }[priority];
}

//Convert path placeholders to actual values
function pathPattern(api, game, pattern) {
  try{
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: process.env['LOCALAPPDATA'],
      appData: util.getVortexPath('appData'),
    });
  }
  catch(err){
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

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
  }
  
  return Promise.resolve(undefined);
}

//Get the executable and add to required files
function getExecutable(discoveryPath) {

  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };

  if (isCorrectExec(XBOX_EXEC)) {
    MOD_PATH = path.join(EPIC_CODE_NAME, "Binaries", XBOX_EXEC_FOLDER);
    CONFIG_PATH = CONFIG_PATH_XBOX;
    CONFIG_TARGET = path.join('{localAppData}', CONFIG_PATH);
    BINARIES_TARGET = path.join('{gamePath}', EPIC_CODE_NAME, "Binaries", XBOX_EXEC_FOLDER);
    return XBOX_EXEC;
  };

  if (isCorrectExec(STEAM_EXEC)) {
    MOD_PATH = path.join(EPIC_CODE_NAME, "Binaries", STEAM_EXEC_FOLDER);
    CONFIG_PATH = CONFIG_PATH_DEFAULT;
    CONFIG_TARGET = path.join('{localAppData}', CONFIG_PATH);
    BINARIES_TARGET = path.join('{gamePath}', EPIC_CODE_NAME, "Binaries", STEAM_EXEC_FOLDER);
    return STEAM_EXEC;
  };

  return STEAM_EXEC;
}

//Get correct game version
async function setGameVersionPath(gamePath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(gamePath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  };
  GAME_VERSION = 'steam';
  return GAME_VERSION;
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for config files
function testConfig(files, gameId) {
  // Make sure we're able to support this mod
  const isConfig = files.some(file => path.basename(file).toLowerCase() === (CONFIG_FILE1 || CONFIG_FILE2));
  const isIni = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT) !== undefined;
  let supported = (gameId === spec.game.id) && isConfig && isIni;

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
  // The config files are expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const MODTYPE_ID = CONFIG_ID;
  const setModTypeInstruction = { type: 'setmodtype', value: MODTYPE_ID };

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

//Installer test for Fluffy Mod Manager files
function testRoot(files, gameId) {
  //const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FOLDER);
  const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installRoot(files) {
  //const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER);
  const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FOLDER.toLowerCase());
  const idx = modFile.indexOf(path.basename(modFile));
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

//Test for save files
function testSave(files, gameId) {
  // Make sure we're able to support this mod
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
  // The config files are expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
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
  const gameId = GAME_ID;
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
      value: UE5_SORTABLE_ID,
    };
    const installFiles = (modFiles.length > 3)
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

  context.registerInstaller('ue5-pak-installer', 25, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealMod(context.api, files, gameId));

  context.registerModType(UE5_SORTABLE_ID, 25, (gameId) => testUnrealGame(gameId, true), getUnrealModsPath, () => Promise.resolve(false), {
    name: 'UE5 Sortable Mod',
    mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id
  });
  context.registerModType(LEGACY_UE5_SORTABLE_ID, 65, 
    (gameId) => testUnrealGame(gameId, true), 
    getUnrealModsPath, 
    () => Promise.resolve(false), 
    { name: 'Legacy UE - REINSTALL TO SORT',
      mergeMods: mod => 'ZZZZ-' + mod.id
    }
  );
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

async function resolveGameVersion(gamePath, exePath) {
  GAME_VERSION = await setGameVersionPath(gamePath);
  //SHIPPING_EXE = getShippingExe(gamePath);
  const READ_FILE = path.join(gamePath, EXEC_STEAM);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') { // use appxmanifest.xml for Xbox version
    try { //try to parse appxmanifest.xml
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parsed = await parseStringPromise(appManifest);
      version = parsed?.Package?.Identity?.[0]?.$?.Version;
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  else { //use shipping exe (note that this only returns the UE engine version right now)
    try {
      const exeVersion = require('exe-version');
      version = await exeVersion.getProductVersion(READ_FILE);
      //log('warn', `Resolved game version for ${GAME_ID} to: ${version}`);
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${READ_FILE} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
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

//Setup function
async function setup(discovery, api, gameSpec) {
  //SYNCHRONOUS CODE //////////////////////////////////////
  const state = api.getState();
  const mods = util.getSafe(state, ['persistent', 'mods', gameSpec.game.id], {});
  const legacyMods = Object.keys(mods).filter(id => mods[id]?.type === LEGACY_UE5_SORTABLE_ID);
  if (legacyMods.length > 0) {
    legacyModsNotify(api, legacyMods);
  }
  await fs.ensureDirWritableAsync(path.join(LOCALAPPDATA, CONFIG_PATH));
  await fs.ensureDirWritableAsync(path.join(LOCALAPPDATA, SAVE_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, UE5_PATH));
}

//Let vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    requiresCleanup: true,
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: () => MOD_PATH,
    requiredFiles,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
    getGameVersion: resolveGameVersion,
    requiresLauncher: requiresLauncher,
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
  context.registerModType(BINARIES_ID, 40, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, BINARIES_TARGET), 
    () => Promise.resolve(false), 
    { name: BINARIES_NAME }
  );
  context.registerModType(CONFIG_ID, 45, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, CONFIG_TARGET), 
    () => Promise.resolve(false), 
    { name: CONFIG_NAME }
  );

  //register mod installers
  //25 is pak installer
  context.registerInstaller(`${GAME_ID}-config`, 30, testConfig, installConfig);
  context.registerInstaller(`${GAME_ID}-save`, 35, testSave, installSave);
  context.registerInstaller(`${GAME_ID}-root`, 40, testRoot, installRoot);
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
      filter: mods => mods.filter(mod => mod.type === UE5_SORTABLE_ID),
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
