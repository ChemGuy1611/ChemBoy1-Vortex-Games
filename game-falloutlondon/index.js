/*//////////////////////////////////////////////////
Name: Fallout London Setup Helper
Structure: Utility Extension (not game support)
Author: ChemBoy1
Version: 0.1.0
Date: 2025-06-23
//////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//Specify all information about the game
const GAME_NAME = "Fallout: London";
const GAME_ID = "fallout4";
const GOGAPP_ID = "1491728574";
const GOGAPP_ID_ONECLICK = "1897848199";
let STAGING_FOLDER = '';
let FOLON_STAGING_PATH = '';
let FOLON_INSTALL_PATH = '';
let GAME_PATH = '';
const DISCOVERY_IDS = [GOGAPP_ID, GOGAPP_ID_ONECLICK];

const STAGINGFOLDER_NAME = "falloutlondon";
const LONDON_FILE = 'LondonWorldSpace.esm'; // The main file for FOLON

//Information for modtypes, installers, tools, and actions
//const USER_HOME = util.getVortexPath("home");
const DOCUMENTS = util.getVortexPath("documents");
const LOCALAPPDATA = util.getVortexPath('localAppData');

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
const CONFIG_PATH = path.join(LOCALAPPDATA, DATA_FOLDER, "Saved", "Config", "WindowsNoEditor");
const CONFIG_FILES = ["engine.ini", "scalability.ini", "input.ini", "game.ini"];
const CONFIG_EXT = ".ini";
const CONFIG_LOC = 'Local AppData';

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";
const ROOT_PATH = '{gamePath}';
const ROOT_FILE = 'data'; // The main data folder for FOLON

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

//Convert path string placeholders to actual values
function pathPattern(api, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[GAME_ID]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Find FOLON install directory (GOG)
function findFolon(api) {
  try {
    const KEY = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      'SOFTWARE\\WOW6432Node\\GOG.com\\Games\\' + GOGAPP_ID,
      'PATH'
    );
    if (KEY && KEY.value) {
      return Promise.resolve(KEY.value);
    }
  } catch { 
    log('info', `Failed to find FOLON GOG app ID ${GOGAPP_ID} in registry.`);
  }
  try {
    const KEY = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      'SOFTWARE\\WOW6432Node\\GOG.com\\Games\\' + GOGAPP_ID_ONECLICK,
      'PATH'
    );
    if (KEY && KEY.value) {
      return Promise.resolve(KEY.value);
    }
  } catch {
    log('info', `Failed to find FOLON One-Click GOG app ID ${GOGAPP_ID_ONECLICK} in registry.`);
  }
  return () => util.GameStoreHelper.findByAppId(DISCOVERY_IDS);
    //.then((game) => game.gamePath);
}

//Find FOLON install directory (GOG)
function writeFolonIni(api) {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  if (!discovery || !discovery.path) {
    return Promise.reject(new Error("Game path not found"));
  }
  
  const iniPath = path.join(discovery.path, 'FalloutLondon.ini');
  const iniContent = `[Folon]\nGamePath=${discovery.path}\n`;
  
  return fs.writeFileAsync(iniPath, iniContent)
    .then(() => log('info', `Wrote Fallout London INI to ${iniPath}`))
    .catch(err => log('error', `Failed to write Fallout London INI: ${err.message}`));
}

async function makeLink(api) {
  FOLON_INSTALL_PATH = await findFolon(api);
  if (!FOLON_INSTALL_PATH) {
    return Promise.reject(new Error("FOLON Game path not found"));
  }
  const source = FOLON_INSTALL_PATH;
  const destination = path.join(STAGING_FOLDER, LONDON_FILE);
  return fs.ensureSymlink(source, destination)
    .then(() => log('info', `Created symlink for FOLON at path: "${destination}"`))
    .catch(err => api.showErrorNotification(`Failed to create symlink for FOLON: ${err.message}`, { allowReport: false }));
}

const getFallout4Path = (api) => { //get the FO4 game's discovered path
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for FOLON files
function testRoot(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLocaleLowerCase() === ROOT_FILE));
  let supported = (gameId === GAME_ID) && isMod;

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

//Installer install FOLON files
function installRoot(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === ROOT_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
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

//Setup function
async function setup(api) {
  const state = api.getState();
  GAME_PATH = getFallout4Path(api);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  FOLON_DEST_PATH = path.join(STAGING_FOLDER, STAGINGFOLDER_NAME);
  findFolon(context.api); //find the FOLON install directory from GOG
  makeLink(context.api); //create hardlink for FOLON to staging folder
  return;
}

//Main function
function main(context) {
  context.registerModType(ROOT_ID, 25, 
    (gameId) => {
      try {
        setup(context.api); //get information needed for setup
        writeFolonIni(context.api); //write "Archive" section to INI file for FOLON
      } catch (err) {
          context.api.showErrorNotification(`Failed to set up ${GAME_NAME} extended features.`, err, { allowReport: true });
        }
      return ((gameId === GAME_ID));
    },
    () => pathPattern(context.api, ROOT_PATH), 
    () => Promise.resolve(false), 
    { name: ROOT_NAME }
  );

  //register mod installers
  context.registerInstaller(ROOT_ID, 45, testRoot, installRoot);

  context.once(() => { // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
