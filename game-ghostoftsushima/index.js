/*//////////////////////////////////////////
Name: Ghost of Tsushima Vortex Extension
Author: ChemBoy1
Version: 0.2.0
Date: 2025-10-02
///////////////////////////////////////////*/

//import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
//const winapi = require('winapi-bindings');

const DOCUMENTS = util.getVortexPath("documents");
const APPDATA = util.getVortexPath("appData");

//Specify all the information about the game
const GAME_ID = "ghostoftsushima";
const STEAMAPP_ID = "2215430";
const EPICAPP_ID = "cd231060e6744ffb97684767b07d2b77";
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, EPICAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "Ghost of Tsushima";
const GAME_NAME_SHORT = "Ghost of Tsushima";
const EXEC = "GhostOfTsushima.exe";
const DATA_FOLDER = "Ghost of Tsushima DIRECTOR'S CUT";

let GAME_PATH = null;
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Info for mod types and installers
const PSARC_ID = "ghostoftsushima-psarc";
const PSARC_NAME = "PSARC (Archive)";
const PSARC_PATH = path.join("cache_pc", "psarc");
const PSARC_EXT = ".psarc";

const SAVE_ID = `${GAME_ID}-save`
const SAVE_NAME = "Save Game (Documents)";
const SAVE_EXT = '.sav'
const userDocsValue = util.getVortexPath('documents');
const userDocsPathString = userDocsValue.replace(/x00s/g, '');
const SAVE_FOLDER = path.join(userDocsPathString, DATA_FOLDER);
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

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(APPDATA, 'Sucker Punch Productions', DATA_FOLDER);
const CONFIG_EXT = ".ini";
const CONFIG_FILES = ["XXX"];

const MOD_PATH_DEFAULT = ".";
const PARAMETERS = [];

//Filled in from the data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": "ghostoftsushima.jpg",
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      "epicAppId": EPICAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "EpicAPPId": EPICAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": PSARC_ID,
      "name": PSARC_NAME,
      "priority": "high",
      "targetPath": path.join("{gamePath}", PSARC_PATH)
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": SAVE_PATH
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//3rd party launchers and tools
const tools = [
{
    id: `${GAME_ID}-customlaunch`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC,
    requiredFiles: [EXEC],
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
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

//Convert path string placeholders to actual values
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

//set launcher requirements
async function requiresLauncher(gamePath, store) {
  /*if (store === 'xbox' && (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID))) {
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

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//test whether to use mod installer
function testPsarc(files, gameId) {
  const isMod = files.some(file => path.extname(file).toLowerCase() === PSARC_EXT);
  let supported = (gameId === spec.game.id) && isMod;

  /* Don't test for mod installer since we handle variants in the installer
  if (supported && files.find(file =>
      (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
      (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  } //*/

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

/* psarc installer instructions (simple)
function installPsarc(files) {
  // The .psarc file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === PSARC_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PSARC_ID };

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
} //*/

//*Install psarc files (multiple variants)
function installPsarc(api, files, fileName) {
  let hasVariants = false;
  const psarcFiles = files.reduce((accum, iter) => {
    if (path.extname(iter) === PSARC_EXT) {
      const exists = accum[path.basename(iter)] !== undefined;
      if (exists) {
        hasVariants = true;
      }
      accum[path.basename(iter)] = exists
        ? accum[path.basename(iter)].concat(iter)
        : [iter];
    }
    return accum;
  }, {});

  let filtered = files;
  const queryVariant = () => {
    const psarcs = Object.keys(psarcFiles).filter(key => psarcFiles[key].length > 1);
    return Promise.map(psarcs, psarcFile => {
      return api.showDialog('question', 'Choose Variant', {
        text: 'This mod has several variants for "{{psarc}}" - please '
            + 'choose the variant you wish to install. (You can choose a '
            + 'different variant by re-installing the mod)',
        choices: psarcFiles[psarcFile].map((iter, idx) => ({ 
          id: iter,
          text: iter,
          value: idx === 0,
        })),
        parameters: {
          psarc: psarcFile,
        },
      }, [
        { label: 'Cancel' },
        { label: 'Confirm' },
      ]).then(res => {
        if (res.action === 'Confirm') {
          const choice = Object.keys(res.input).find(choice => res.input[choice]);
          filtered = filtered.filter(file => (path.extname(file) !== PSARC_EXT)
            || ((path.basename(file) === psarcFile) && file.includes(choice))
            || (path.basename(file) !== psarcFile));
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
          type: 'copy',
          source: iter,
          destination: path.join(path.basename(iter)),
        });
      }
      return accum;
    }, []);
    const instructions = [{ 
      type: 'setmodtype',
      value: PSARC_ID,
    }].concat(fileInstructions);
    return instructions;
  }

  const prom = hasVariants ? queryVariant : Promise.resolve;
  return prom()
    .then(() => Promise.resolve({ instructions: generateInstructions() }));
} //*/

//test whether to use mod installer
function testSave(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === spec.game.id) &&
      (files.find(file => path.extname(file).toLowerCase() === SAVE_EXT) !== undefined);

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
  // The .psarc file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === SAVE_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

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

// MAIN EXTENSION FUNCTION /////////////////////////////////////////////////////

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, PSARC_PATH));
  return fs.ensureDirWritableAsync(SAVE_PATH);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //clone game info from above and add required parameters
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    supportedTools: tools,
  };
  //register the game
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
  //context.registerInstaller('ghostoftsushima-psarc', 25, testPsarc, installPsarc);
  context.registerInstaller(PSARC_ID, 25, testPsarc, (files, fileName) => installPsarc(context.api, files, fileName));
  context.registerInstaller(SAVE_ID, 25, testSave, installSave);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = path.join(CONFIG_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    const openPath = path.join(SAVE_PATH);
    util.opn(openPath).catch(() => null);
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

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
