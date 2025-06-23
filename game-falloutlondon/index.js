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
const { default: IniParser, WinapiFormat } = require('vortex-parse-ini');

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

const STAGINGFOLDER_NAME = "falloutlondon"; // The name of the staging folder for FOLON
const FOLON_FILE = 'LondonWorldSpace.esm'; // The main file for FOLON

const DOCUMENTS = util.getVortexPath("documents");
const INI_PATH = path.join(DOCUMENTS, 'My Games', "Fallout4");
const INI_FILE_DEFAULT = 'Fallout4.ini'; // The INI file for FO4
const INI_FILE_CUSTOM = 'Fallout4Custom.ini'; // Second (optional) INI file for FO4
const INI_PATH_DEFAULT = path.join(INI_PATH, INI_FILE_DEFAULT);
const INI_PATH_CUSTOM = path.join(INI_PATH, INI_FILE_CUSTOM);

const INI_ARCHIVE_SECTION = `[Archive]
sResourceDataDirsFinal=
sResourceIndexFileList=Fallout4 - Textures1.ba2, Fallout4 - Textures2.ba2, Fallout4 - Textures3.ba2, Fallout4 - Textures4.ba2, Fallout4 - Textures5.ba2, Fallout4 - Textures6.ba2, Fallout4 - Textures7.ba2, Fallout4 - Textures8.ba2, Fallout4 - Textures9.ba2, LondonWorldSpace - Textures1.ba2, LondonWorldSpace - Textures2.ba2, LondonWorldSpace - Textures3.ba2, LondonWorldSpace - Textures4.ba2, LondonWorldSpace - Textures5.ba2, LondonWorldSpace - Textures6.ba2, LondonWorldSpace - Textures7.ba2, LondonWorldSpace - Textures8.ba2, LondonWorldSpace - Textures9.ba2, LondonWorldSpace - Textures10.ba2, LondonWorldSpace - Textures11.ba2, LondonWorldSpace - Textures12.ba2, LondonWorldSpace - Textures13.ba2
sResourceStartUpArchiveList=Fallout4 - Startup.ba2, Fallout4 - Shaders.ba2, Fallout4 - Interface.ba2, LondonWorldSpace - Interface.ba2
SResourceArchiveList=Fallout4 - Voices.ba2, Fallout4 - Meshes.ba2, Fallout4 - MeshesExtra.ba2, Fallout4 - Misc.ba2, Fallout4 - Sounds.ba2, Fallout4 - Materials.ba2, LondonWorldSpace - Sounds.ba2, LondonWorldSpace - Misc.ba2, LondonWorldSpace - Materials.ba2, LondonWorldSpace - Voices.ba2, LondonWorldSpace - VoicesExtra.ba2, LondonWorldSpace - Meshes.ba2, LondonWorldSpace - MeshesExtra.ba2, LondonWorldSpace - MeshesLOD.ba2
SResourceArchiveList2=Fallout4 - Animations.ba2, LondonWorldSpace - Animations.ba2
SGeometryPackageList=Fallout4 - Geometry.csg, LondonWorldSpace - Geometry.csg
SCellResourceIndexFileList=Fallout4.cdx, LondonWorldSpace.cdx
SResourceArchiveMemoryCacheList=Fallout4 - Misc.ba2, Fallout4 - Shaders.ba2, Fallout4 - Interface.ba2, Fallout4 - Materials.ba2, LondonWorldSpace - Misc.ba2, LondonWorldSpace - Interface.ba2, LondonWorldSpace - Materials.ba2
bInvalidateOlderFiles=1`; // The section in the INI file for archives

const FOLON_ID = `${GAME_ID}-folon`;
const FOLON_NAME = "FOLON GOG Files";
const FOLON_PATH = '{gamePath}';
const ROOT_FILE = 'Data'; // The main data folder for FOLON

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

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
}

//Write the FOLON settings to the FO4 INI files
async function writeFolonIni(api) {
  const parser = new IniParser(new WinapiFormat());
  try { //Fallout4.ini
    const INI_CONTENTS_DEFAULT = await parser.read(INI_PATH_DEFAULT);
    const section = INI_CONTENTS_DEFAULT?.data?.['Archive'];
    await fs.writeFileAsync( //write Resorep dllsettings.ini file
      INI_PATH_DEFAULT,
      INI_CONTENTS_DEFAULT,
    )
    .then(() => log('info', `Wrote Fallout London INI settings to ${iniPath}`))
    .catch(err => log('error', `Failed to write Fallout London INI settings: ${err.message}`));
  } catch (error) {
    log('error', `Failed to write Fallout London INI settings to Fallout4.ini: ${error.message}`);
  }

  try { //Fallout4Custom.ini
    fs.statSync(INI_PATH_CUSTOM); //statsync Fallout4Custom.ini file, write section if it exists
    const INI_CONTENTS_CUSTOM = await parser.read(INI_PATH_CUSTOM);
    const sectionCustom = INI_CONTENTS_CUSTOM?.data?.['Archive'];
    await fs.writeFileAsync( //write Resorep dllsettings.ini file
      INI_PATH_CUSTOM,
      INI_CONTENTS_CUSTOM,
    )
    .then(() => log('info', `Wrote Fallout London INI settings to ${iniPath}`))
    .catch(err => log('error', `Failed to write Fallout London INI settings: ${err.message}`));
  } catch (error) {
    log('error', `Failed to write Fallout London INI settings to Fallout4Custom.ini: ${error.message}`);
  }
}

async function makeLink(api) {
  FOLON_INSTALL_PATH = await findFolon(api);
  if (!FOLON_INSTALL_PATH) {
    return Promise.reject(new Error("FOLON Game path not found"));
  }
  const src = FOLON_INSTALL_PATH;
  const dest = FOLON_STAGING_PATH;
  return fs.link(src, dest)
    .then(() => log('info', `Created hardlink for FOLON files at path: "${dest}"`))
    .catch(err => api.showErrorNotification(`Failed to create hardlink for FOLON files`, err, { allowReport: true }));
}

const getFallout4Path = (api) => { //get the FO4 game's discovered path
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for FOLON files
function testFolon(files, gameId) {
  const isMod = files.some(file => (path.basename(file) === FOLON_FILE));
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
function installFolon(files) {
  const modFile = files.find(file => (path.basename(file) === ROOT_FILE));
  const idx = modFile.indexOf(`${path.basename(modFile)}\\`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FOLON_ID };

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
  FOLON_STAGING_PATH = path.join(STAGING_FOLDER, STAGINGFOLDER_NAME);
  makeLink(context.api); //create hardlink for FOLON to staging folder
  return;
}

//Main function
function main(context) {
  //register the mod type (and do other setup)
  context.registerModType(FOLON_ID, 75, 
    (gameId) => {
      try { //do functions here
        setup(context.api); //get information needed for setup and make link
        writeFolonIni(context.api); //write "Archive" section to FO4 INI file(s)
      } catch (err) {
        context.api.showErrorNotification(`Failed to set up ${GAME_NAME} Helper features.`, err, { allowReport: true });
      }
      return ((gameId === GAME_ID));
    },
    () => getFallout4Path(context.api),
    () => Promise.resolve(false),
    { name: FOLON_NAME }
  );

  //register mod installer for FOLON files (to FO4 root)
  context.registerInstaller(FOLON_ID, 49, testFolon, installFolon);

  context.once(() => { // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
