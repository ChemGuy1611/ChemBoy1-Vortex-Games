/*//////////////////////////////////////////////////
Name: Fallout London Setup Helper
Structure: Utility Extension (game helper)
Author: ChemBoy1
Version: 0.1.0
Date: 2025-06-24
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

const STAGINGFOLDER_NAME = "falloutlondon"; // The name of the mod folder in the FO4 staging folder
const FOLON_FILE = 'LondonWorldSpace.esm'; // The main file for FOLON (installer)

const DOCUMENTS = util.getVortexPath("documents");
const INI_PATH = path.join(DOCUMENTS, 'My Games', "Fallout4");
const INI_FILE_DEFAULT = 'Fallout4.ini'; // The INI file for FO4
const INI_FILE_CUSTOM = 'Fallout4Custom.ini'; // Second (optional) INI file for FO4
const INI_PATH_DEFAULT = path.join(INI_PATH, INI_FILE_DEFAULT);
const INI_PATH_CUSTOM = path.join(INI_PATH, INI_FILE_CUSTOM);

const INI_ARCHIVE_SECTION = `sResourceDataDirsFinal=
sResourceIndexFileList=Fallout4 - Textures1.ba2, Fallout4 - Textures2.ba2, Fallout4 - Textures3.ba2, Fallout4 - Textures4.ba2, Fallout4 - Textures5.ba2, Fallout4 - Textures6.ba2, Fallout4 - Textures7.ba2, Fallout4 - Textures8.ba2, Fallout4 - Textures9.ba2, LondonWorldSpace - Textures1.ba2, LondonWorldSpace - Textures2.ba2, LondonWorldSpace - Textures3.ba2, LondonWorldSpace - Textures4.ba2, LondonWorldSpace - Textures5.ba2, LondonWorldSpace - Textures6.ba2, LondonWorldSpace - Textures7.ba2, LondonWorldSpace - Textures8.ba2, LondonWorldSpace - Textures9.ba2, LondonWorldSpace - Textures10.ba2, LondonWorldSpace - Textures11.ba2, LondonWorldSpace - Textures12.ba2, LondonWorldSpace - Textures13.ba2
sResourceStartUpArchiveList=Fallout4 - Startup.ba2, Fallout4 - Shaders.ba2, Fallout4 - Interface.ba2, LondonWorldSpace - Interface.ba2
SResourceArchiveList=Fallout4 - Voices.ba2, Fallout4 - Meshes.ba2, Fallout4 - MeshesExtra.ba2, Fallout4 - Misc.ba2, Fallout4 - Sounds.ba2, Fallout4 - Materials.ba2, LondonWorldSpace - Sounds.ba2, LondonWorldSpace - Misc.ba2, LondonWorldSpace - Materials.ba2, LondonWorldSpace - Voices.ba2, LondonWorldSpace - VoicesExtra.ba2, LondonWorldSpace - Meshes.ba2, LondonWorldSpace - MeshesExtra.ba2, LondonWorldSpace - MeshesLOD.ba2
SResourceArchiveList2=Fallout4 - Animations.ba2, LondonWorldSpace - Animations.ba2
SGeometryPackageList=Fallout4 - Geometry.csg, LondonWorldSpace - Geometry.csg
SCellResourceIndexFileList=Fallout4.cdx, LondonWorldSpace.cdx
SResourceArchiveMemoryCacheList=Fallout4 - Misc.ba2, Fallout4 - Shaders.ba2, Fallout4 - Interface.ba2, Fallout4 - Materials.ba2, LondonWorldSpace - Misc.ba2, LondonWorldSpace - Interface.ba2, LondonWorldSpace - Materials.ba2
bInvalidateOlderFiles=1`; // [Archive] section - write to FO4 INI files

const FOLON_ID = `${GAME_ID}-folon`;
const FOLON_NAME = "FOLON GOG Files";
const ROOT_FILE = 'Data'; // The main data folder for FOLON

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
    log('warn', `Failed to find FOLON GOG app ID ${GOGAPP_ID} in registry.`);
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
    log('warn', `Failed to find FOLON One-Click GOG app ID ${GOGAPP_ID_ONECLICK} in registry.`);
  }
  return () => util.GameStoreHelper.findByAppId(DISCOVERY_IDS);
}

//Write the FOLON settings to the FO4 INI files
async function writeFolonIni(api) {
  const parser = new IniParser(new WinapiFormat());
  // <-- ADD CHECKS FOR IF INI HAS ALREADY BEEN WRITTEN with new Archive section
  try { //Fallout4.ini
    fs.statSync(INI_PATH_DEFAULT); //make sure the file exists
    const contents = await parser.read(INI_PATH_DEFAULT);
    const section = contents?.data?.['Archive'];
    contents.data['Archive'] = INI_ARCHIVE_SECTION; // Set the Archive section to the new value
    // replace the section
    return parser.write(INI_PATH_DEFAULT, contents) //write the INI file
    /*return fs.writeFileAsync( //write Fallout4.ini file
      INI_PATH_DEFAULT,
      contents,
    ) //*/
      .then(() => log('warn', `Wrote FOLON INI settings to: "${INI_FILE_DEFAULT}"`))
      .then(() => iniSuccessNotifyDefault(api))
      .catch(err => log('error', `Failed to write FOLON INI settings: ${err.message}`));
  } catch (error) {
    api.showErrorNotification(`Failed to write FOLON INI settings to ${INI_FILE_DEFAULT}`, error, { allowReport: true });
  }

  try { //Fallout4Custom.ini (optional, only write if it exists)
    fs.statSync(INI_PATH_CUSTOM); //dont need to write to it if it doesnt already exist
    const contents = await parser.read(INI_PATH_CUSTOM);
    const section = contents?.data?.['Archive'];
    // replace the section
    contents.data['Archive'] = INI_ARCHIVE_SECTION; // Set the Archive section to the new value
    return parser.write(INI_PATH_CUSTOM, contents) //write the INI file
    /*return fs.writeFileAsync( //write Fallout4Custom.ini file
      INI_PATH_CUSTOM,
      contents,
    ) //*/
      .then(() => log('warn', `Wrote FOLON INI settings to: "${INI_FILE_CUSTOM}"`))
      .then(() => iniSuccessNotifyCustom(api))
      .catch(err => log('error', `Failed to write FOLON INI settings: ${err.message}`));
  } catch (error) {
    log('warn', `Failed to write FOLON INI settings to ${INI_FILE_CUSTOM}. The file likely does not exist: ${error.message}`);
  }
}

//Create directory link for FOLON game files to FO4 staging folder
async function makeLink(api) {
  FOLON_INSTALL_PATH = await findFolon(api);
  if (!FOLON_INSTALL_PATH) {
    return Promise.reject(new Error("FOLON Game path not found. Make sure it is installed from GOG."));
  }
  const src = FOLON_INSTALL_PATH;
  const dest = FOLON_STAGING_PATH;
  try {
    fs.statSync(dest); //check if linked staging folder already exists
    return;
  } catch {
    return fs.symlinkAsync(src, dest, 'dir') //make directory link
    //return api.runExecutable('cmd.exe', [`mklink`, `/D`, `"${dest}"`, `"${src}"`], { shell: true, detached: true }) run through cmd.exe
    //return api.runExecutable('makelink.bat', [`mklink`, `/D`, `"${dest}"`, `"${src}"`], { shell: true, detached: true }) run through .bat file (close and restart Vortex)
      .then(() => log('warn', `Created hardlink for FOLON files directory at path: "${dest}"`))
      //.then(() => restartNotify(api)) //notify user to restart
      .then(() => linkSuccessNotify(api)) //notify user of linking success
      .then(() => changeFolonModTypeNotify(api)) //notify user to restart Vortex
      //.then(() => changeFolonModTypeAuto(api)) //automatically change mod type for FOLON mod (DONT KNOW HOW YET)
      .catch(err => api.showErrorNotification(`Failed to create hardlink for FOLON files`, err, { allowReport: true }));
  }
}

const getFallout4Path = (api) => { //get the FO4 game's discovered path
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

//Notification to restart Vortex to complete FOLON setup
function restartNotify(api) {
  const NOTIF_ID = `${GAME_ID}-folonlinkrestart`;
  const MESSAGE = 'Restart Vortex to Complete FOLON Setup';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        label: 'Restart Vortex', action: () => {
          // FIND FUNCTION TO RESTART VORTEX
          dismiss();
        }
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `FOLON files linked to FO4 Staging Folder.\n`
                + `\n`
                + `You must restart Vortex to complete setup.\n`
                + `\n`
          }, [
            {
              label: 'Restart Vortex', action: () => {
                // FIND FUNCTION TO RESTART VORTEX
                dismiss();
              }
            },
            { label: 'Not Now', action: () => dismiss() },
          ]);
        },
      },
    ],
  });
}

//Notification to change mod type for FOLON mod
function changeFolonModTypeNotify(api) {
  const NOTIF_ID = `${GAME_ID}-folonchangemodtype`;
  const MESSAGE = 'Must Change Mod Type for falloutlondon Mod';
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
            text: `The FOLON Helper Extension has successfully linked the GOG Fallout: London files to the Fallout 4 Staging Folder.\n`
                + `\n`
                + `You must now manually change the mod type for the new "${STAGINGFOLDER_NAME}" mod to "${FOLON_NAME}" to complete the setup.\n`
                + `\n`
          }, [
            {
              label: 'Continue', action: () => {
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });
}

//Notification to notify user of successful linking
function linkSuccessNotify(api) {
  const NOTIF_ID = `${GAME_ID}-folonlinksuccess`;
  const MESSAGE = 'Successfully linked FOLON files to FO4 Staging Folder';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'success',
    message: MESSAGE,
    allowSuppress: false,
    actions: [
    ],
  });
}

//Notification to notify user of successful INI writing
function iniSuccessNotifyDefault(api) {
  const NOTIF_ID = `${GAME_ID}-foloninisuccess`;
  const MESSAGE = `Successfully wrote FOLON "[Archive]" settings to "${INI_FILE_DEFAULT}"`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'success',
    message: MESSAGE,
    allowSuppress: false,
    actions: [
    ],
  });
}

//Notification to notify user of successful INI writing
function iniSuccessNotifyCustom(api) {
  const NOTIF_ID = `${GAME_ID}-foloninisuccess`;
  const MESSAGE = `Successfully wrote FOLON "[Archive]" settings to "${INI_FILE_CUSTOM}"`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'success',
    message: MESSAGE,
    allowSuppress: false,
    actions: [
    ],
  });
}


//Mod Type test for FOLON files
async function isFolonModType(api, instructions, files) {
  const setModTypeInstruction = { type: 'setmodtype', value: FOLON_ID };
  const isMod = files.some(file => (path.basename(file) === FOLON_FILE));
  if (isMod) {
    instructions.push(setModTypeInstruction);
  }
  return Promise.resolve(isMod);
}

//Setup function
async function setup(api) {
  const state = api.getState();
  GAME_PATH = getFallout4Path(api);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  FOLON_STAGING_PATH = path.join(STAGING_FOLDER, STAGINGFOLDER_NAME);
  makeLink(api); //create hardlink for FOLON to staging folder
  //writeFolonIni(api); //write "Archive" section to FO4 INI file(s)
  return;
}

//Main function
function main(context) {
  //register the mod type (and do other setup)
  context.registerModType(FOLON_ID, 75, 
    (gameId) => {
      var _a;
      return ((gameId === GAME_ID))
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    },
    () => getFallout4Path(context.api),
    (instructions, files) => isFolonModType(context.api, instructions, files), //test - is installed mod of this type
    { name: FOLON_NAME }
  );

  //register mod installer for FOLON files (to FO4 root)
  context.registerInstaller(FOLON_ID, 49, testFolon, installFolon);

  context.once((profileId, gameId) => { // put code here that should be run (once) when Vortex starts up
    /*const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
    if (profileId !== LAST_ACTIVE_PROFILE) return; //*/
    //if (gameId !== GAME_ID) return;
    try {
      setup(context.api); //FOLON setup
    } catch (err) {
      context.api.showErrorNotification(`Failed to set up ${GAME_NAME} Helper features.`, err, { allowReport: true });
    }
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
