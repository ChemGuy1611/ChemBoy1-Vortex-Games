/*
Name: Age of Mythology: Retold Vortex Extension
Structure: Generic Game
Author: ChemBoy1
Version: 0.1.6
Date: 11/07/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const STEAMAPP_ID = "1934680";
const EPICAPP_ID = null;
const GOGAPP_ID = null;
const XBOXAPP_ID = "Microsoft.AthensStandardEdition";
const XBOXEXECNAME = "Game";
const GAME_ID = "ageofmythologyretold";
const GAME_NAME = "Age of Mythology: Retold";
const GAME_NAME_SHORT = "AoM Retold";
const COMMON_FOLDER = "game";

//Discovery IDs
const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  //gog: [{ id: GOGAPP_ID }],
  //epic: [{ id: EPICAPP_ID }],
  xbox: [{ id: XBOXAPP_ID }],
};

//Info for location and setting executable and other store-dependent variables
const EXEC_XBOX = "AoMRT.exe";
const EXEC_STEAM = "AoMRT_s.exe";
const requiredFiles = [COMMON_FOLDER];

//Info for mod types and installers
const DATA_ID = `${GAME_ID}-data`;
const DATA_FOLDER = "game";
const DATA_IDX = "game\\";
const DATA_FOLDERS_LIST = ["ai", "art", "campaign", "config", "data", "modelcache", "movies", "random_maps", "render", "sound", "ui"];
const BAR_EXT = ".bar";
const XS_EXT = ".xs";
const MYTHSCN_EXT = ".mythscn";
const XML_EXT = ".xml";
const CFG_EXT = ".cfg";
const DDT_EXT = ".ddt";

const BINARIES_ID = `${GAME_ID}-binaries`;
const RESHADE_FOLDER = "reshade-shaders";
const RESHADE_IDX = "reshade-shaders\\";
const BINARIES_EXT = [".dll", ".ini"];

let USERID_FOLDER = "";
CONFIG_FOLDER = path.join(util.getVortexPath('home'), "Games", "Age of Mythology Retold");
try {
  const CONFIG_ARRAY = fs.readdirSync(CONFIG_FOLDER);
  USERID_FOLDER = CONFIG_ARRAY.find((element) => 
  ((/[a-z]/i.test(element) === false))
   );
} catch(err) {
  USERID_FOLDER = "";
}
if (USERID_FOLDER === undefined) {
  USERID_FOLDER = "";
}
const CONFIG_ID = `${GAME_ID}-config`;
CONFIG_PATH = path.join(CONFIG_FOLDER, USERID_FOLDER, "users")
const CONFIG_EXT = ".xml";
const SAVE_ID = `${GAME_ID}-save`;
SAVE_PATH = path.join(CONFIG_FOLDER, USERID_FOLDER, "savegames")
const SAVE_EXT = ".mythsav";
const MOD_PATH = path.join(CONFIG_FOLDER, USERID_FOLDER, "mods", "local");

//This will fill in from the info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "details": {
      "steamAppId": STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      //"epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      //"EpicAPPId": EPICAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": DATA_ID,
      "name": "Game Data Folder",
      "priority": "high",
      "targetPath": `{gamePath}\\${DATA_FOLDER}`
    },
    {
      "id": BINARIES_ID,
      "name": "Binaries / Root Game Folder",
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": CONFIG_ID,
      "name": "Config (UserGames)",
      "priority": "high",
      "targetPath": CONFIG_PATH
    },
    {
      "id": SAVE_ID,
      "name": "Save (UserGames)",
      "priority": "high",
      "targetPath": SAVE_PATH
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //EPICAPP_ID,
      //GOGAPP_ID,
      XBOXAPP_ID
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  
];

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
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

  /*
  if (store === 'epic') {
    return Promise.resolve({
        launcher: 'epic',
        addInfo: {
            appId: EPICAPP_ID,
        },
    });
  }
  */
  
  return Promise.resolve(undefined);
}

//Get correct executable, add to required files, set paths for mod types
function getExecutable(discoveryPath) {

  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      requiredFiles.push(exec);
      return true;
    }
    catch (err) {
      return false;
    }
  };

  if (isCorrectExec(EXEC_XBOX)) {
    return EXEC_XBOX;
  };

  if (isCorrectExec(EXEC_STEAM)) {
    return EXEC_STEAM;
  };

  return EXEC_STEAM;
}

/*
//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  api.sendNotification({
    id: `setup-notification-${GAME_ID}`,
    type: 'warning',
    message: 'TexMod Required for Some Mods',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'Note that this extension is designed for mods that install to the game\'s root folder. \n'
                + 'Some mods require a tool called TexMod, so if your mod needs that, you will need to install and set it up manually. \n'
                + 'You can download TexMod with the button below.\n'
          }, [
            { label: 'Continue', action: () => dismiss() },
            { label: 'Download TexMod', action: () => {
                util.opn('https://gamebanana.com/tools/6973').catch(err => undefined);
                dismiss();
            }},
          ]);
        },
      },
    ],
  });    
}
*/

//Installer test for Root folder files
function testData(files, gameId) {
  //const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FILE);
  const isMod = files.some(file => path.basename(file) === DATA_FOLDER);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installData(files) {
  //const modFile = files.find(file => path.basename(file).toLowerCase() === DATA_FOLDER);
  const modFile = files.find(file => path.basename(file) === DATA_FOLDER);
  const idx = modFile.indexOf(DATA_IDX);
  const rootPath = path.dirname(modFile);
  //const setModTypeInstruction = { type: 'setmodtype', value: DATA_ID };

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
  //instructions.push(setModTypeInstruction);

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

//test whether to use mod installer
function testConfig(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT) !== undefined;
  const gameFolder = files.some(file => path.basename(file) === DATA_FOLDER);
  let supported = (gameId === spec.game.id) && isMod && !gameFolder;

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
function installConfig(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

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

//Installer test for Root folder files
function testReshade(files, gameId) {
  //const isMod = files.some(file => path.basename(file).toLowerCase() === RESHADE_FOLDER);
  const isReshade = files.some(file => path.basename(file) === RESHADE_FOLDER);
  let supported = (gameId === spec.game.id) && isReshade;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installReshade(files) {
  //const modFile = files.find(file => path.basename(file).toLowerCase() === RESHADE_FOLDER);
  const modFile = files.find(file => path.basename(file) === RESHADE_FOLDER);
  const idx = modFile.indexOf(RESHADE_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };

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

//Installer test for Root folder files
function testBinaries(files, gameId) {
  const isMod = files.find(file => BINARIES_EXT.includes(path.extname(file).toLowerCase())) !== undefined;
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installBinaries(files) {
  const modFile = files.find(file => BINARIES_EXT.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };

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

//Setup function
async function setup(discovery, api, gameSpec) {
  //setupNotify(api);
  await fs.ensureDirWritableAsync(SAVE_PATH);
  await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureDirWritableAsync(path.join(discovery.path, DATA_FOLDER));
  return fs.ensureDirWritableAsync(MOD_PATH);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    requiresCleanup: true,
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: () => MOD_PATH,
    requiredFiles,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    supportedTools: tools,
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
  
  //register mod installers
  //context.registerInstaller(`${GAME_ID}-data`, 25, testData, installData);
  context.registerInstaller(`${GAME_ID}-save`, 30, testSave, installSave);
  context.registerInstaller(`${GAME_ID}-config`, 35, testConfig, installConfig);
  context.registerInstaller(`${GAME_ID}-reshade`, 40, testReshade, installReshade);
  context.registerInstaller(`${GAME_ID}-binaries`, 45, testBinaries, installBinaries);
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
