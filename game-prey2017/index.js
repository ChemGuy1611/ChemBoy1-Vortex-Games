/*
Name: Prey Vortex Extension (Alt version)
Author: ChemBoy1
Version: 0.5.0
Date: 03/09/2025
*/

//Import libraries
const { fs, util, actions, selectors, log } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const Bluebird = require('bluebird');
const { parseStringPromise } = require('xml2js');

//Specify all the information about the game
const STEAMAPP_ID = "480490";
const GOGAPP_ID = "1158493447";
const EPICAPP_ID = "52d88e9a6df248da913c8e99f1e4c526";
const XBOXAPP_ID = "BethesdaSoftworks.LiluDallas-Multipass";
const XBOXEXECNAME = "App";
const GAME_ID = "prey2017";
const MOD_PATH = "GameSDK\\Precache";

let execFolder = null;
let EXEC_TARGET = null;
let GAME_VERSION = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';
const FIND_FILE = "GameSDK";
const requiredFiles = [FIND_FILE];
const STEAM_EXEC= "Binaries\\Danielle\\x64\\Release\\Prey.exe";
const GOG_EXEC= "Binaries\\Danielle\\x64-GOG\\Release\\Prey.exe";
const EPIC_EXEC = "Binaries\\Danielle\\x64-Epic\\Release\\Prey.exe";
const XBOX_EXEC = "Binaries\\Danielle\\Gaming.Desktop.x64\\Release\\Prey.exe";
const STEAM_EXEC_FOLDER = "x64";
const GOG_EXEC_FOLDER = "x64-GOG";
const EPIC_EXEC_FOLDER = "x64-Epic";
const XBOX_EXEC_FOLDER = "Gaming.Desktop.x64";

const EXEC_STEAM = STEAM_EXEC;
const EXEC_XBOX = XBOX_EXEC;
const EXEC_EPIC = EPIC_EXEC;
const EXEC_GOG = GOG_EXEC;

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }],
  xbox: [{ id: XBOXAPP_ID }],
  epic: [{ id: EPICAPP_ID }],
  gog: [{ id: GOGAPP_ID }],
};

const ROOT_ID = "prey2017-root";
const ROOT_PATH = "{gamePath}";
const ROOT_FOLDERS = ["GameSDK", "Whiplash", "Binaries", "Engine", "Localization", ""];
const ROOT_NAME = "Root Game Folder";

const BINARIES_ID = "prey2017-binaries";
const BINARIES_NAME = "Binaries (Engine Injector)";

const PRIC_ID = `${GAME_ID}-pric`;
const PRIC_NAME = "Prey Interface Customizer";
const PRIC_FILE = "preyinterfacecustomizergui.exe";

//Info for Chairloader
const CHAIR_ID = `${GAME_ID}-chairloader`;
const CHAIR_PATH = "{gamePath}";
const CHAIR_NAME = "Chairloader";
const CHAIR_FILE = "chairmanager.exe";

const CHAIRMOD_ID = `${GAME_ID}-chairloadermod`;
const CHAIRMOD_PATH = "{gamePath}\\Mods";
const CHAIRMOD_NAME = "Chairloader Mod";
const CHAIRMOD_FILE = "modinfo.xml";

const CHAIRMODLEGACY_ID = `${GAME_ID}-chairloadermodlegacy`;
const CHAIRMODLEGACY_PATH = "{gamePath}\\Mods\\Legacy";
const CHAIRMODLEGACY_NAME = "Chairloader Legacy Mod";
const CHAIRMODLEGACY_EXT = ".pak";

//3rd party tools and launchers
const tools = [
  {
    id: "PRIC",
    name: "Prey Interface Customizer",
    logo: "pric.png",
    executable: () => PRIC_FILE,
    //parameters: [],
    requiredFiles: [PRIC_FILE],
    detach: true,
    relative: true,
    exclusive: true,
  },
  {
    id: "Chairloader",
    name: "Chairloader",
    logo: "chairloader.png",
    executable: () => CHAIR_FILE,
    //parameters: [],
    requiredFiles: [CHAIR_FILE],
    detach: true,
    relative: true,
    exclusive: true,
  },
];

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
    execFolder = XBOX_EXEC_FOLDER;
    EXEC_TARGET = `{gamePath}\\Binaries\\Danielle\\${execFolder}\\Release`;
    return XBOX_EXEC;
  };

  if (isCorrectExec(STEAM_EXEC)) {
    execFolder = STEAM_EXEC_FOLDER;
    EXEC_TARGET = `{gamePath}\\Binaries\\Danielle\\${execFolder}\\Release`;
    return STEAM_EXEC;
  };

  if (isCorrectExec(EPIC_EXEC)) {
    execFolder = EPIC_EXEC_FOLDER;
    EXEC_TARGET = `{gamePath}\\Binaries\\Danielle\\${execFolder}\\Release`;
    return EPIC_EXEC;
  };

  if (isCorrectExec(GOG_EXEC)) {
    execFolder = GOG_EXEC_FOLDER;
    EXEC_TARGET = `{gamePath}\\Binaries\\Danielle\\${execFolder}\\Release`;
    return GOG_EXEC;
  };

  return STEAM_EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
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
  if (isCorrectExec(EXEC_STEAM)) {
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  };
  if (isCorrectExec(EXEC_GOG)) {
    GAME_VERSION = 'gog';
    return GAME_VERSION;
  };
  if (isCorrectExec(EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    return GAME_VERSION;
  };
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Fluffy Mod Manager files
function testPric(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === PRIC_FILE);
  let supported = (gameId === GAME_ID) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installPric(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === PRIC_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: PRIC_ID };

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
function testChair(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === CHAIR_FILE);
  let supported = (gameId === GAME_ID) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installChair(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === CHAIR_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CHAIR_ID };

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

//test for zips
async function testChairModZip(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === CHAIRMOD_FILE);
  return Promise.resolve({
    supported: (gameId === GAME_ID) && isMod,
    requiredFiles: []
  });
}

//install zips
async function installChairModZip(files, destinationPath) {
  const zipFiles = files.filter(file => ['.zip', '.7z', '.rar'].includes(path.extname(file)));
  const setModTypeInstruction = { type: 'setmodtype', value: CHAIRMOD_ID};
  // If it's a double zip, we don't need to repack. 
  if (zipFiles.length > 0) {
    const instructions = zipFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file),
      }
    });
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }
  // Repack the ZIP
  else {
    const szip = new util.SevenZip();
    const archiveName = path.basename(destinationPath, '.installing') + '.zip';
    const archivePath = path.join(destinationPath, archiveName);
    const rootRelPaths = await fs.readdirAsync(destinationPath);
    await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
    const instructions = [{
      type: 'copy',
      source: archiveName,
      destination: path.basename(archivePath),
    }];
    instructions.push(setModTypeInstruction);
    return Promise.resolve({ instructions });
  }
}

//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

//Installer test for Fluffy Mod Manager files
function testChairMod(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLowerCase() === CHAIRMOD_FILE);
  let supported = (gameId === GAME_ID) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Chairload mod files
function installChairMod(files, fileName) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === CHAIRMOD_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CHAIRMOD_ID};
  // Update folder naming
  const MOD_NAME = path.basename(fileName);
  const MOD_FOLDER = MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '');

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) &&
      (!file.endsWith(path.sep))));

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

//test whether to use mod installer
function testChairModLegacy(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === GAME_ID) &&
      (files.find(file => path.extname(file).toLowerCase() === CHAIRMODLEGACY_EXT) !== undefined);

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
function installChairModLegacy(files) {
  // The .psarc file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === CHAIRMODLEGACY_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CHAIRMODLEGACY_ID };

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
  //const isMod = files.some(file => path.basename(file).toLowerCase() === ROOT_FILE);
  const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === GAME_ID) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Fluffy Mod Manger files
function installRoot(files) {
  //const modFile = files.find(file => path.basename(file).toLowerCase() === ROOT_FILE);
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup-notification`;
  const MOD_NAME = `Chairloader Mod Manager`;
  const MESSAGE = `Chairloader Mod Manager Mod Installation`;
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
            text: `If you use ${MOD_NAME}, you must install mod zips from the "Mods" folder in the Chairloader GUI.\n`
                + `This is necessary for the mods to install properly and cannot be automated.\n`
                + `Select "Install Mod From File" and navigate to the "Mods" folder inside the game folder to locate the zips.\n`
                + `You must import the zips one at a time. Then you can select which mods to enable and choose "Deploy Mods".\n`
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
  if (GAME_VERSION = 'steam') { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC_STEAM));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  if (GAME_VERSION = 'gog') { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC_GOG));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  if (GAME_VERSION = 'epic') { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC_EPIC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

//Setup function
async function setup(discovery, api) {
  setupNotify(api);
  await fs.ensureDirWritableAsync(path.join(discovery.path, "Mods", "Legacy"));
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH));
}

//Main function
function main(context) {
  //Register the game
  const game = {
    id: GAME_ID,
    name: "Prey (2017)",
    shortName: "Prey",
    logo: "prey2017.jpg",
    mergeMods: true,
    details: {
      steamAppId: STEAMAPP_ID,
      gogAppId: GOGAPP_ID,
      epicAppId: EPICAPP_ID,
      xboxAppId: XBOXAPP_ID,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
      GogAPPId: GOGAPP_ID,
      EpicAPPId: EPICAPP_ID,
      XboxAPPId: XBOXAPP_ID
    },
    requiresCleanup: true,
    queryArgs: gameFinderQuery,
    queryModPath: () => MOD_PATH,
    executable: getExecutable,
    requiredFiles,
    setup: async (discovery) => await setup(discovery, context.api),
    supportedTools: tools,
    getGameVersion: resolveGameVersion,
    requiresLauncher: requiresLauncher,
  };
  context.registerGame(game);

  //register mod types
  context.registerModType(ROOT_ID, 25, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, ROOT_PATH), 
    () => Promise.resolve(false), 
    { name: ROOT_NAME }
  );
  context.registerModType(BINARIES_ID, 30, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, EXEC_TARGET), 
    () => Promise.resolve(false), 
    { name: BINARIES_NAME }
  );
  context.registerModType(CHAIRMOD_ID, 35, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, CHAIRMOD_PATH), 
    () => Promise.resolve(false), 
    { name: CHAIRMOD_NAME }
  );
  context.registerModType(CHAIRMODLEGACY_ID, 35, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, CHAIRMODLEGACY_PATH), 
    () => Promise.resolve(false), 
    { name: CHAIRMODLEGACY_NAME }
  );
  context.registerModType(PRIC_ID, 70, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, EXEC_TARGET), 
    () => Promise.resolve(false), 
    { name: PRIC_NAME }
  );
  context.registerModType(CHAIR_ID, 75, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, CHAIR_PATH), 
    () => Promise.resolve(false), 
    { name: CHAIR_NAME }
  );

  //register mod installers
  context.registerInstaller(`${GAME_ID}-pric`, 25, testPric, installPric);
  context.registerInstaller(`${GAME_ID}-chairloader`, 30, testChair, installChair);
  context.registerInstaller(`${GAME_ID}-chairmodzip`, 35, toBlue(testChairModZip), toBlue(installChairModZip));
  //context.registerInstaller(`${GAME_ID}-chairmod`, 35, testChairMod, installChairMod);
  context.registerInstaller(`${GAME_ID}-root`, 40, testRoot, installRoot);
  //context.registerInstaller(`${GAME_ID}-chairmodlegacy`, 45, testChairModLegacy, installChairModLegacy);

  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    
  });

  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
