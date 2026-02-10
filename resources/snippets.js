// TOP-LEVEL VARIABLES ///////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { parseStringPromise } = require('xml2js');
const winapi = require('winapi-bindings');
const turbowalk = require('turbowalk');
const Bluebird = require('bluebird'); //avoid using as it is deprecated
const fsPromises = require('fs/promises');
const fsExtra = require('fs-extra');
const exeVersion = require('exe-version');

//File parsers
const XML = require('xml2js'); //XML.parseString(), XML.parseStringPromise() (async), and XML.Builder() (write)
const builder = new XML.Builder();
const xml = builder.buildObject({});
const YAML = require('js-yaml'); //YAML.load() (parse) and YAML.dump() (stringify)
const TOML = require('@iarna/toml'); //TOML.parse() and TOML.stringify()
const { default: IniParser, WinapiFormat } = require('vortex-parse-ini'); //parser for .ini files
const parser = new IniParser(new WinapiFormat()); //parser.read() and parser.write()

//user data paths
const USER_HOME = util.getVortexPath("home");
const LOCALLOW = path.join(USER_HOME, 'AppData', 'LocalLow');
const DOCUMENTS = util.getVortexPath("documents");
const ROAMINGAPPDATA = util.getVortexPath('appData');
const LOCALAPPDATA = util.getVortexPath('localAppData');

//standard global variables to set in functions
let GAME_PATH = '';
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//User-Defined Folder, stored in state "settings" ////////////////////////////////////////////////////////////////
const selectUDF = async (api) => { //user select folder
  const launcherSettings = path.join(util.getVortexPath("appData"), "7DaysToDie", "launchersettings.json");
  const res = await api.showDialog(
    "info",
    "Choose User Data Folder",
    {
      text: "Please select your User Data Folder (UDF) - Vortex will deploy mods to this location. NEVER set your UDF path to Vortex's staging folder."
    },
    [
      { label: "Cancel" },
      { label: "Select UDF" }
    ]
  );
  if (res.action !== "Select UDF") {
    return Promise.reject(new util.UserCanceled("Cannot proceed without UDF"));
  }
  await fs.ensureDirWritableAsync(path.dirname(launcherSettings));
  await ensureLOFile(api);
  let directory = await api.selectDir({
    title: "Select User Data Folder",
    defaultPath: path.default.join(path.dirname(launcherSettings))
  });
  if (!directory) {
    return Promise.reject(new util.UserCanceled("Cannot proceed without UDF"));
  }
  let segments = directory.split(path.sep);
  const lowered = segments.map((seg) => seg.toLowerCase());
  if (lowered[lowered.length - 1] === "mods") {
    segments.pop();
    directory = segments.join(path.sep);
  }
  if (lowered.includes("vortex")) {
    return api.showDialog("info", "Invalid User Data Folder", {
      text: "The UDF cannot be set inside Vortex directories. Please select a different folder."
    }, [
      { label: "Try Again" }
    ]).then(() => selectUDF(context));
  }
  await fs.ensureDirWritableAsync(path.join(directory, "Mods"));
  const launcher = DEFAULT_LAUNCHER_SETTINGS;
  launcher.DefaultRunConfig.AdditionalParameters = `-UserDataFolder="${directory}"`;
  const launcherData = JSON.stringify(launcher, null, 2);
  await fs.writeFileAsync(launcherSettings, launcherData, { encoding: "utf8" });
  api.store.dispatch(setUDF(directory));
  return relaunchExt(api);
};
async function relaunchExt(api) {
  return api.showDialog('info', 'Restart Required', {
    text: '\n'
        + 'The extension requires a restart to complete setup.\n'
        + 'The extension will purge mods and then exit - please re-activate the game via the Games page or Dashboard page.\n'
        + '\n'
        + 'IMPORTANT: You may see an External Changes dialogue. Select "Revert change (use staging file)".\n'
        + '\n',
  }, [ { label: 'Restart Extension' } ])
  .then(async () => {
    try {
      await purge(api);
      const batched = [
        actions.setDeploymentNecessary(GAME_ID, true),
        actions.setNextProfile(undefined),
      ];
      util.batchDispatch(api.store, batched);
    } catch (err) {
      api.showErrorNotification('Failed to properly relaunch extension', err);
    }
  });
}
let DEFAULT_LAUNCHER_SETTINGS = {
  ShowLauncher: false,
  DefaultRunConfig: {
    UseEAC: true,
    AdditionalParameters: ""
  }
};
const createAction = require("redux-act");
const setUDF = createAction('7DTD_SET_UDF', (udf) => ({ udf }));
const reducer = { //reducers to register
  reducers: {
    [setUDF]: (state, payload) => {
      const { udf } = payload;
      return util.setSafe(state, ["udf"], udf);
    },
  },
  defaults: {}
};
//in main
context.registerReducer(["settings", GAME_ID], reducer);
context.registerSettings("Mods", Settings, () => ({
  onSelectUDF: () => selectUDF(context).catch(() => null)
}), () => {
  const state = context.api.getState();
  const activeGame = import_vortex_api7.selectors.activeGameId(state);
  return activeGame === GAME_ID;
});
//in setup
const isUDFSet = util.getSafe(
  api.getState(),
  ["settings", GAME_ID, "udf"],
  void 0
) != null;
return !isUDFSet ? selectUDF(api) : Promise.resolve();



// BASIC FUNCTIONS ///////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

function readRegistryKey(hive, key, name) {
  try {
    const instPath = winapi.RegGetValue(hive, key, name);
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return Promise.resolve(instPath.value);
  } catch (err) {
    return Promise.resolve(undefined);
  }
}

//get discovery.path from state
const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};
//Trigger purge and deploy events
async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

// Read an unknown folder name in a path //////////////////////////////////////////////////////
const SAVE_FOLDER = path.join(SAVEMOD_LOCATION, DATA_FOLDER, 'Saved', 'SaveGames');
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
let SAVE_PATH = path.join(SAVE_FOLDER, USERID_FOLDER);

//Write section to an ini file //////////////////////////////////////////////////////
try { //Fallout4.ini
const parser = new IniParser(new WinapiFormat());
fs.statSync(INI_PATH_DEFAULT); //make sure the file exists
const contents = await parser.read(INI_PATH_DEFAULT);
let TEST = false;
let TEST_LINE = '';
try {
    TEST_LINE = contents.data['Archive']['SCellResourceIndexFileList'];
} catch {
    TEST_LINE = '';
}
TEST = TEST_LINE === INI_ARCHIVE_OBJECT.SCellResourceIndexFileList;
if (!TEST) {
    contents.data['Archive'] = INI_ARCHIVE_OBJECT; // Set the Archive section to the new value
    await parser.write(INI_PATH_DEFAULT, contents) //write the INI file
    .then(() => log('warn', `${EXTENSION_NAME} wrote FOLON INI settings to "${INI_FILE_DEFAULT}"`))
    .then(() => iniSuccessNotifyDefault(api))
    .catch(err => api.showErrorNotification(`Error when writing FOLON INI settings to ${INI_FILE_DEFAULT}`, err, { allowReport: true }));
}
} catch (err) {
api.showErrorNotification(`${EXTENSION_NAME} failed to write FOLON INI settings to ${INI_FILE_DEFAULT}`, err, { allowReport: true });
}

//create a directory link in the staging folder //////////////////////////////////////////////////////
async function makeLink(api, src, dest, type) {
  type = type || 'dir'; //default to directory link
  try {
    fs.statSync(dest); //check if linked staging folder already exists
    return; //exit if it does
  } catch {
    await fs.symlinkAsync(src, dest, type) //make directory link
    //return api.runExecutable('cmd.exe', [`mklink`, `/D`, `"${dest}"`, `"${src}"`], { shell: true, detached: true }) run through cmd.exe
    //return api.runExecutable('makelink.bat', [`mklink`, `/D`, `"${dest}"`, `"${src}"`], { shell: true, detached: true }) run through .bat file (close and restart Vortex)
      .then(() => log('warn', `${EXTENSION_NAME} created directory link for FOLON GOG files directory from path "${src}" to path "${dest}"`))
      .then(() => linkSuccessNotify(api)) //notify user of linking success
      .then(() => changeFolonModTypeNotify(api)) //notify user of manual steps required
      .then(() => changeFolonModTypeAuto(api)) //attempt to automatically enable and change mod type for falloutlondon mod (relies on user responding to popup within 10 seconds)
      .catch(err => api.showErrorNotification(`${EXTENSION_NAME} failed to create directory link for FOLON GOG files`, err, { allowReport: true }));
  }
}

// Check if folders are on the same drive partition //////////////////////////////////////////////////////
STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
function checkPartitions(folder, discoveryPath) {
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

// verify files through Steam ////////////////////////////////////////////////////////////
//in applyGame function
context.requireExtension('Vortex Steam File Downloader');
//verify files
async function verifyGameFiles(api) {
  GAME_PATH = await getDiscoveryPath(api);
  const FILES = ['file'];
  const parameters = {
    "FileList": `${FILES.join('\n')}`,
    "InstallDirectory": GAME_PATH,
    "VerifyAll": false,
    "AppId": +STEAMAPP_ID,
  };
  try {
    await api.ext.steamkitVerifyFileIntegrity(parameters, GAME_ID);
    log('warn', `Steam verification complete`);
    return;
  } catch (err) {
    return api.showErrorNotification('Failed to verify game files through Steam', err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}

//Run a function with an activity notification
async function runActivity(api) {
  const NOTIF_ID = `${GAME_ID}-activitynotification`
  api.sendNotification({ //notification indicating install process
    id: NOTIF_ID,
    message: `Cleaning up extracted .psarc Files and restoring file names. This will take a few seconds.`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  GAME_PATH = await getDiscoveryPath(api);
  try {
    //do something
  } catch (err) {
    log('error', `Could not do the thing: ${err}`);
  }
  api.dismissNotification(NOTIF_ID);
}

// INSTALLER FUNCTIONS ///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

//slicer install looking for a folder (good for folder-based games)
function installMod(files, destinationPath) {
  const instructions = files.map(file => {
    const segments = file.split(path.sep);
    const offset = segments.findIndex(seg => seg.toLowerCase() === 'datalocal');
    const outPath = offset !== -1
      ? segments.slice(offset + 1).join(path.sep)
      : file;

    if (file.endsWith(path.sep)) {
      return {
        type: 'mkdir',
        destination: outPath,
      };
    } else {
      return {
        type: 'copy',
        source: file,
        destination: outPath,
      };
    }
  });

  return Promise.resolve({ instructions });
}

//Multiple folder destinations
function installContent(files) {
  const filtered = files.filter(file => !file.endsWith(path.sep));
  const factionFiles = filtered.filter(file => file.endsWith(FACTION_EXT));
  const nonFactionFiles = filtered.filter(file => !file.endsWith(FACTION_EXT));
  const instructions = nonFactionFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join('Mods', file),
    };
  }).concat(factionFiles.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join('Factions', file),
    };
  }));

  return Promise.resolve({ instructions });
}

// Re-zip installer //////////////////////////////////////////////////////
const Bluebird = require('bluebird');
//Install zips
async function installZipContent(files, destinationPath) {
  const zipFiles = files.filter(file => ['.zip', '.7z', '.rar'].includes(path.extname(file)));
  // If it's a double zip, we don't need to repack. 
  if (zipFiles.length > 0) {
    const instructions = zipFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file),
      }
    });
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
    return Promise.resolve({ instructions });
  }
}
//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

//Installer with dialogue selection //////////////////////////////////////////////////////
function installPk4(api, files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === modFileExt);
  const CANC_BUT = 'Cancel';
  const SP_BUT = 'Install to SP Folder';
  const MP_BUT = 'Install to MP Folder';
  //return __awaiter(this, void 0, void 0, function* () {
    return api.showDialog('question', 'Choose Install for .pk4 Files', {
      text: 'The mod you are installing contains .pk4 files.' +
          `Select if these .pk4 files should be installed to the "SP" (SinglePlayer) folder or "MP" (MultiPlayer) folder.`,
      }, [
        { label: CANC_BUT },
        { label: SP_BUT },
        { label: MP_BUT },
        ]).then((result) => {
          if (result.action === CANC_BUT) {
            return Promise.reject(new util.UserCanceled('User cancelled.'));
          }
          if (result.action === SP_BUT) {
            const idx = modFile.indexOf(path.basename(modFile));
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: SPBASE_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
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
          if (result.action === MP_BUT) {
            const idx = modFile.indexOf(path.basename(modFile));
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: MPBASE_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
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
        });
  //});
}

//Installer with user input to rename folder //////////////////////////////////////////////////////
function installFallback(api, files, fileName) {
  // Remove empty directories
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
  fallbackInstallerNotify(api, fileName);
  return Promise.resolve({ instructions });
}
//Notify User of instructions for Mod Merger Tool
function renamingRequiredNotify(api, fileName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  const MOD_NAME = path.basename(fileName).replace(/(.installing)*(.zip)*(.rar)*(.7z)*/gi, '');
  const NOTIF_ID = `${GAME_ID}-installerrenamingrequired`;
  const MESSAGE = `MANUAL FOLDER RENAMING REQUIRED FOR ${MOD_NAME}`;
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
            text: `You've just installed a mod with loose ".data" files or a folder name containing ".data" without a .forge folder above it. The affected mod is shown below.\n`
              + `\n`
              + `${MOD_NAME}.\n`
              + `\n`
              + `Because the mod author did not package the mod in the correct folder structure, you must manually rename folders in the mod Staging Folder. Pick one of the methods below to rename the folder.\n`
              + `\n`
              + `Check the mod page description to determine what the correct "FORGE_FILE_NAME" should be. You can use the "Open Mod Page" button below. This notification will remain active after opening the mod page.\n`
              + `\n`
              + `EASY MODE: Click the "Show Folder Rename Dialog" button below to open a dialog popup to rename the .forge folder.\n`
              + `\n`
              + `ADVANCED MODE:\n`
              + ` 1. Open the Staging Folder with the button below and rename the folder as indicated.\n`
              + ` 2. Deploy mods in Vortex.\n`
              + ` 3. You will get an "External Changes" popup in Vortex after doing this. Select "Save change (delete file)".\n`
              + `\n`
              + `The correct structure is:  Extracted\\FORGE_FILE_NAME.forge\\DATA_FILE.data.\n`
              + `The .forge folder is already in place for you to rename.\n`
              + `\n`
          }, [
            //*
            { label: `Open Mod Page`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
              log('warn', `Found ${modMatch?.id} for ${MOD_NAME}`);
              let PAGE = ``;
              if (modMatch) {
                const MOD_ID = modMatch.attributes.modId;
                PAGE = `${MOD_ID}?tab=description`;
              }
              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
              util.opn(MOD_PAGE_URL).catch(err => undefined);
              //dismiss();
            }}, //*/
            { label: `Show Folder Rename Dialog`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
              folderRenameDialog(api, modMatch);
              dismiss();
            }}, //*/
            { label: `Open Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, MOD_NAME)).catch(err => undefined);
              dismiss();
            }}, //*/
            { label: 'Close', action: () => dismiss() },
          ]
          );
        },
      },
    ],
  });
}
const RENAME_INPUT_ID = `${GAME_ID}-forgefolderrenameinput`;
async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}
//dialogue for user input folder name
async function folderRenameDialog(api, mod) {
  return api.showDialog('question', 'Rename .forge Folder', {
      text: api.translate(`Enter the correct .forge folder name for ${mod.name}:`),
      input: [
          {
              id: RENAME_INPUT_ID,
              label: 'For',
              type: 'text',
              placeholder: RENAME_FOLDER,
          }
      ],
  }, [{ label: 'Cancel' }, { label: 'Rename', default: true }])
  .then(result => { //rename the folder in the mod staging folder
    if (result.action === 'Rename') {
      const name = result.input[RENAME_INPUT_ID];
      if ( ( name.trim() === ( '' || RENAME_FOLDER ) ) || !name.includes(FORGE_EXT) ) {
        api.showErrorNotification('Invalid name entered for .forge folder. You will have to rename the folder manually.', undefined, { allowReport: false });
        return Promise.resolve();
      }
      const state = api.getState();
      STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
      const FOLDER_PATH = path.join(STAGING_FOLDER, mod.installationPath, EXTRACTED_FOLDER);
      const EXISTING = path.join(FOLDER_PATH, RENAME_FOLDER);
      const NEW = path.join(FOLDER_PATH, name);
      rename(api, EXISTING, NEW);
    }
    return Promise.resolve();
  })
  .catch(err => {
    api.showErrorNotification('Failed to rename .forge folder. You will have to rename the folder manually.', err, { allowReport: false });
    return Promise.resolve();
  });
}
//purge and rename folder
async function rename(api, EXISTING, NEW) {
  await purge(api); //purge mods before renaming folder
  try {
    fs.statSync(EXISTING); //make sure the folder exists
    await fs.renameAsync(EXISTING, NEW); //rename the folder
  }
  catch (err) {
    api.showErrorNotification('Failed to rename .forge folder. You will have to rename the folder manually.', err, { allowReport: false });
    return Promise.resolve();
  }
  await deploy(api); //redeploy mods after renaming folder
  return Promise.resolve();
}

//Notify user if hitting a fallback installer //////////////////////////////////////////////////////
function fallbackInstallerNotify(api, fileName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  const MOD_NAME = path.basename(fileName).replace(/(.installing)*(.zip)*(.rar)*(.7z)*/gi, '');
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
  log('warn', `Found ${modMatch?.id} for ${MOD_NAME}`);
  let PAGE = ``;
  if (modMatch) {
    const MOD_ID = modMatch.attributes.modId;
    PAGE = `${MOD_ID}?tab=description`;
  }
  const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
  const NOTIF_ID = `${GAME_ID}-fallbackinstaller`;
  const MESSAGE = `Fallback installer reached for ${MOD_NAME}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'info',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You've reached the fallback installer for the mod below. This mod is either not intended to be used with ATK, or it is packaged in a way that Vortex can't handle.\n`
              + `\n`
              + `${MOD_NAME}.\n`
              + `\n`
              + `Please manually verify that the mod is installed correctly. You can open the Staging Folder with the button below.\n`
              + `Check the mod page description with the button below to determine how the mod should be installed.\n`
              + `\n`
          }, [
            //*
            { label: `Open Mod Page`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
              log('warn', `Found ${modMatch?.id} for ${MOD_NAME}`);
              let PAGE = ``;
              if (modMatch) {
                const MOD_ID = modMatch.attributes.modId;
                PAGE = `${MOD_ID}?tab=description`;
              }
              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
              util.opn(MOD_PAGE_URL).catch(err => undefined);
              dismiss();
            }}, //*/
            { label: `Open Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, MOD_NAME)).catch(err => undefined);
              dismiss();
            }}, //*/
            { label: 'Close', action: () => dismiss() },
          ]
          );
        },
      },
    ],
  });
}




//AUTO-DOWNLOAD FUNCTIONS /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

//* for downloader.js //////////////////////////////////////////////////////
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');
const SHADPS4_ARC_NAME = `shadps4-win64-qt-${SHADPS4_VERSION}.zip`;
const SHADPS4_URL_MAIN = `https://api.github.com/repos/shadps4-emu/shadPS4`;
const SHADPS4_FILE = 'shadPS4.exe'; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.
const REQUIREMENTS = [
  { //shadPS4
    archiveFileName: SHADPS4_ARC_NAME,
    modType: SHADPS4_ID,
    assemblyFileName: SHADPS4_FILE,
    userFacingName: SHADPS4_NAME,
    githubUrl: SHADPS4_URL_MAIN,
    findMod: (api) => findModByFile(api, SHADPS4_ID, SHADPS4_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, SHADPS4_ARC_NAME),
    fileArchivePattern: new RegExp(/^shadps4-win64-qt-(\d+\.\d+\.\d+)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
  },
]; //*/
//* Test version for all requirements
async function asyncForEachTestVersion(api, requirements) {
  for (let index = 0; index < requirements.length; index++) {
    await testRequirementVersion(api, requirements[index]);
  }
} //*/
//* Find all requirements
async function asyncForEachCheck(api, requirements) {
  let mod = [];
  for (let index = 0; index < requirements.length; index++) {
    mod[index] = await requirements[index].findMod(api);
  }
  let checker = mod.every((entry) => entry === true);
  return checker;
} //*/
//* called in context.once
async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await asyncForEachTestVersion(api, REQUIREMENTS);
    log('warn', 'Checked requirements versions');
  } catch (err) {
    log('warn', `failed to test requirement version: ${err}`);
  }
} //*/
//* check for each requirement
async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
} //*/
//* in setup function
const requirementsInstalled = await checkForRequirements(api);
if (!requirementsInstalled) {
    await download(api, REQUIREMENTS);
} //*/
//* in context.once
context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return onCheckModVersion(context.api, gameId, mods, forced);
}); //*/

//Check if modType is installed by modid, with fallback to a file check ///////////////////////////
function isModLoaderInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test =  Object.keys(mods).some(id => mods[id]?.type === MODLOADER_ID);
  //* Fallback to file check
  if (test === false) {
    try {
      GAME_PATH = getDiscoveryPath(api);
      fs.statSync(path.join(GAME_PATH, BINARIES_PATH, MODLOADER_MARKER));
      test = true;
    } catch (err) {
      test = false;
    }
  } //*/
  return test;
}

//* Turbowalk method to check for a mod/tool in a known folder ///////////////////////////////
const turbowalk = require('turbowalk');
async function turbowalkFind(folder, findFile) {
  let isInstalled = false;
  const findFileLower = findFile.toLowerCase();
  await turbowalk.default(folder, async (entries) => {
    if (isInstalled) {
      return;
    }
    for (const entry of entries) {
      if (path.basename(entry.filePath).toLowerCase() === findFileLower) {
        isInstalled = true;
        return;
      }
    }
  });
  return isInstalled;
}

// Function to automatically download from Nexus Mods //////////////////////////////////////////////////////
async function downloadUe4ssNexus(api, gameSpec) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = UE4SS_NAME;
    const MOD_TYPE = UE4SS_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = UE4SS_PAGE_NO;
    const FILE_ID = UE4SS_FILE_NO;  //If using a specific file id because "input" below gives an error
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
      } catch (err) { // use defined file ID if input is undefined above
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

//* Function to auto-download from GitHub or external site //////////////////////////////////////////////////////
async function downloadBlcmm(api, gameSpec) {
  let isInstalled = isBlcmmInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = BLCMM_NAME;
    const MOD_TYPE = BLCMM_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = GAME_ID;
    const URL = BLCMM_URL;
    const ERR_URL = BLCMM_URL_ERR;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
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
      const errPage = ERR_URL;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// Download from GitHub or external site (user browse for download) /////////////////////////////////////////////////////
async function downloadUe4ss(api, gameSpec) {
  let isInstalled = isUe4ssInstalled(api, gameSpec);
  const URL = UE4SS_URL;
  const MOD_NAME = UE4SS_NAME;
  const MOD_TYPE = UE4SS_ID;
  const ARCHIVE_NAME = UE4SS_DLFILE_STRING;
  const instructions = api.translate(`Click on Continue below to open the browser. - `
    + `Navigate to the latest experimental version of ${MOD_NAME} on the GitHub releases page and `
    + `click on the appropriate file to download and install the mod.`
  );

  if (!isInstalled) {
    return new Promise((resolve, reject) => { //Browse and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.UserCanceled('Selected wrong download'));
        } //*/
        return Promise.resolve(result);
      })
      .catch((error) => {
        return reject(error);
      })
      .then((result) => {
        const dlInfo = {game: gameSpec.game.id, name: MOD_NAME};
        api.events.emit('start-download', result, {}, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              return resolve();
            });
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please re-launch Vortex and try again.`, err, { allowReport: false });
        //util.opn(URL).catch(() => null);
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from modDB at the opened paged and install the zip in Vortex.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }
} //*/

//* Function to auto-download a naked .exe file from Nexus Mods and copy it to the game folder //////////////////
async function downloadModManager(api, check) {
  GAME_PATH = getDiscoveryPath(api);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(api.getState(), GAME_ID);
  let isInstalled = await isModManagerInstalled(api);
  if (check === false) isInstalled = false;
  if (!isInstalled) {
    const MOD_NAME = MODMANAGER_NAME;
    const MOD_TYPE = MODMANAGER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = MODMANAGER_PAGE_NO;
    const FILE_ID = MODMANAGER_FILE_NO;  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = MODMANAGER_DOMAIN;
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
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //*Only start-download with Promise
      return new Promise((resolve, reject) => {
        api.events.emit('start-download', [URL], dlInfo, undefined,
          async (error, dlid) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            try { //find the file in Download and copy it to the game folder
              api.sendNotification({ //notification indicating copy process
                id: `${NOTIF_ID}-copy`,
                message: `Copying ${MOD_NAME} executable to game folder`,
                type: 'activity',
                noDismiss: true,
                allowSuppress: false,
              });
              let files = await fs.readdirAsync(DOWNLOAD_FOLDER);
              //let files = fs.readdirSync(DOWNLOAD_FOLDER);
              files = files.filter(file => ( path.basename(file).includes(MODMANAGER_STRING) && (path.extname(file).toLowerCase() === '.exe') ))
                .sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                .reverse();
              const copyFile = files[0];
              await fs.statAsync(path.join(DOWNLOAD_FOLDER, copyFile));
              //fs.statSync(path.join(DOWNLOAD_FOLDER, copyFile));
              const source = path.join(DOWNLOAD_FOLDER, copyFile);
              const destination = path.join(GAME_PATH, MODMANAGER_EXEC);
              await fs.copyAsync(source, destination, { overwrite: true });
              //fs.copySync(source, destination, { overwrite: true });
              api.dismissNotification(NOTIF_ID);
              api.dismissNotification(`${NOTIF_ID}-copy`);
              api.sendNotification({ //notification copy success
                id: `${NOTIF_ID}-success`,
                message: `Successfully copied ${MOD_NAME} executable to game folder`,
                type: 'success',
                noDismiss: false,
                allowSuppress: true,
              });
            } catch (err) {
              const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
              api.showErrorNotification(`Failed to download and copy ${MOD_NAME} executable`, err, { allowReport: false });
              util.opn(errPage).catch(() => null);
              return reject(err);
            }
            finally {
              api.dismissNotification(NOTIF_ID);
              api.dismissNotification(`${NOTIF_ID}-copy`);
              return resolve();
            }
          },
          'never',
          { allowInstall: false },
        );
      });
    } catch (err) { //Show the user the download page if the download and copy process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download and copy ${MOD_NAME} executable`, err, { allowReport: false });
      util.opn(errPage).catch(() => null);
      api.dismissNotification(NOTIF_ID);
      api.dismissNotification(`${NOTIF_ID}-copy`);
    }
  }
} //*/

//* User Browse download and then Run executable //////////////////////////////////////////////////////
async function browseForDownloadFunction(discovery, api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, gameSpec.game.id);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, gameSpec.game.id);
  //const dlInfo = {game: gameSpec.game.id, name: MOD_NAME};
  const dlInfo = {};

  if (!isInstalled && isArchive && isInstaller && !isElevated) { // mod is not installed, is an archive, and has an installer exe in the archive that does not require elevation. Must launch from staging folder after extraction (need to know exact folder name STAGING_PATH)
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.UserCanceled('Selected wrong download'));
        }
        return Promise.resolve(result);
      })
      .catch((err) => {
        return reject(err);
      })
      .then((result) => {
        api.events.emit('start-download', result, dlInfo, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              try {
                const RUN_PATH = path.join(STAGING_FOLDER, STAGING_PATH, INSTALLER);
                api.runExecutable(RUN_PATH, [], { suggestDeploy: false });
                log('warn', `${MOD_NAME} installer started from staging folder`);
              } catch (err) {
                log('error', `Running ${MOD_NAME} installer from staging folder failed: ${err}`);
              }
              return resolve();
            });
          },
          'never',
          { allowInstall: false },
        );
      })
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please try again.`, err, { allowReport: false });
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from the opened page..`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    })
  } 

  if (!isInstalled && isArchive && isInstaller && isElevated) { // mod is not installed, is an archive, and has an installer exe in the archive that requires elevation. Must launch from staging folder after extraction (need to know exact folder name STAGING_PATH)
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.UserCanceled('Selected wrong download'));
        }
        return Promise.resolve(result);
      })
      .catch((err) => {
        return reject(err);
      })
      .then((result) => {
        api.events.emit('start-download', result, dlInfo, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              try { //run installer from staging folder with elevation
                const RUN_PATH = path.join(STAGING_FOLDER, STAGING_PATH, INSTALLER);
                api.runExecutable(RUN_PATH, [], { suggestDeploy: false });
                log('warn', `${MOD_NAME} installer started from staging folder`);
              } catch (err) {
                log('error', `Running ${MOD_NAME} installer from staging folder failed: ${err}`);
              }
              return resolve();
            });
          },
          'never',
          { allowInstall: false },
        );
      })
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please try again.`, err, { allowReport: false });
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from the opened page..`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    })
  } 

  if (!isInstalled && !isArchive && isInstaller && !isElevated) { // mod is not installed, is NOT an archive, and is an installer exe that does not require elevation. Can launch from Downloads folder
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.UserCanceled('Selected wrong download'));
        }
        return Promise.resolve(result);
      })
      .catch((err) => {
        return reject(err);
      })
      .then((result) => {
        api.events.emit('start-download', result, dlInfo, undefined,
          async (error, id) => { //callback function to check for errors and then run installer from downloads folder
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            try {
              const RUN_PATH = path.join(DOWNLOAD_FOLDER, INSTALLER);
              api.runExecutable(RUN_PATH, [], { suggestDeploy: false });
              log('warn', `${MOD_NAME} installer started from downloads folder`);
            } catch (err) {
              log('error', `Running ${MOD_NAME} installer frown downloads folder failed: ${err}`);
            }
            return resolve();
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please re-launch Vortex and try again.`, err, { allowReport: false });
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from the opened page.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }

  if (!isInstalled && !isArchive && isInstaller && isElevated) { // mod is not installed, is NOT an archive, and is an installer exe that requires elevation. Can launch from Downloads folder
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.UserCanceled('Selected wrong download'));
        }
        return Promise.resolve(result);
      })
      .catch((err) => {
        return reject(err);
      })
      .then((result) => {
        api.events.emit('start-download', result, dlInfo, undefined,
          async (error, id) => { //callback function to check for errors and then run installer from downloads folder
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            try { //run installer from downloads folder with elevation
              const RUN_PATH = path.join(DOWNLOAD_FOLDER, INSTALLER);
              api.runExecutable(RUN_PATH, [], { suggestDeploy: false });
              log('warn', `${MOD_NAME} installer started from downloads folder`);
            } catch (err) {
              log('error', `Running ${MOD_NAME} installer frown downloads folder failed: ${err}`);
            }
            return resolve();
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please re-launch Vortex and try again.`, err, { allowReport: false });
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from the opened page.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  }

  if (!isInstalled && isArchive && !isInstaller) { // mod is not installed, is an archive, and has no installer. Install normally as a mod in Vortex
    return new Promise((resolve, reject) => { //Browse to modDB and download the mod
      return api.emitAndAwait('browse-for-download', URL, instructions)
      .then((result) => { //result is an array with the URL to the downloaded file as the only element
        if (!result || !result.length) { //user clicks outside the window without downloading
          return reject(new util.UserCanceled());
        }
        if (!result[0].toLowerCase().includes(ARCHIVE_NAME)) { //if user downloads the wrong file
          return reject(new util.UserCanceled('Selected wrong download'));
        }
        return Promise.resolve(result);
      })
      .catch((err) => {
        return reject(err);
      })
      .then((result) => {
        api.events.emit('start-download', result, dlInfo, undefined,
          async (error, id) => { //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && (error.name !== 'AlreadyDownloaded')) {
              return reject(error);
            }
            api.events.emit('start-install-download', id, { allowAutoEnable: true }, async (error) => { //callback function to complete the installation
              if (error !== null) {
                return reject(error);
              }
              const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
              const batched = [
                actions.setModsEnabled(api, profileId, result, true, {
                  allowAutoDeploy: true,
                  installed: true,
                }),
                actions.setModType(GAME_ID, result[0], MOD_TYPE), // Set the mod type
              ];
              util.batchDispatch(api.store, batched); // Will dispatch both actions.
              return resolve();
            });
          }, 
          'never',
          { allowInstall: false },
        );
      });
    })
    .catch(err => {
      if (err instanceof util.UserCanceled) {
        api.showErrorNotification(`User cancelled download/install of ${MOD_NAME}. Please try again.`, err, { allowReport: false });
        return Promise.resolve();
      } else if (err instanceof util.ProcessCanceled) {
        api.showErrorNotification(`Failed to download/install ${MOD_NAME}. Please re-launch Vortex and try again or download manually from the opened page.`, err, { allowReport: false });
        util.opn(URL).catch(() => null);
        return Promise.reject(err);
      } else {
        return Promise.reject(err);
      }
    });
  } 
  log('warn', `Could not download/install ${MOD_NAME}. Cannot be downloaded with this function.`);
  return api.showErrorNotification(`${MOD_NAME} is already installed. Please remove the exisitng mod if you want to try again.`, undefined, { allowReport: false });
} //*/
//Check if a mod is installed by stat'ing the file
function isRsModsInstalled(discovery, api, spec) {
  try {
    fs.statSync(path.join(discovery.path, RSMODS_FILE));
    return true;
  } catch (err) {
    return false;
  }
} //*/
//* Function call to download the mod, setting all vars to feed into the function above
async function downloadRsMods(discovery, api, gameSpec) {
  let isInstalled = isRsModsInstalled(discovery, api, gameSpec);
  const URL = RSMODS_URL;
  const MOD_NAME = RSMODS_NAME;
  const MOD_TYPE = RSMODS_ID;
  const INSTALLER = RSMODS_INSTALLER;
  const STAGING_PATH = '';
  const isArchive = RSMODS_IS_ARCHIVE;
  const isInstaller = RSMODS_IS_INSTALLER;
  const isElevated = RSMODS_IS_ELEVATED;
  const ARCHIVE_NAME = RSMODS_DLFILE_STRING;
  const instructions = api.translate(`1. Click on Continue below to open the browser.\n`
    + `2. Navigate to the latest version of ${MOD_NAME} on the site.\n`
    + `3. Click on the appropriate file to download and install the mod.\n`
  );
  await browseForDownloadFunction(discovery, api, gameSpec, URL, instructions, ARCHIVE_NAME, MOD_NAME, isArchive, isInstaller, INSTALLER, STAGING_PATH, MOD_TYPE, isInstalled, isElevated);
} //*/
//Check if a mod/tool is installed through the registry
function isAsio4allInstalled() {
  try {
    return registryInstallCheck(ASIO4ALL_REGISTRY_KEY, ASIO4ALL_NAME);
  } catch (err) {
    return false;
  } //*/
}
//Function to read registry and check if a mod/tool is installed
function registryInstallCheck(keyObj, modName) {
  try {
    const instPath = winapi.RegGetValue(keyObj.key, keyObj.subKey, keyObj.value);
    if (!instPath) {
      throw new Error('empty registry key');
    }
    log('warn', `${modName} found in the registry at: ${instPath.value}`);
    return true;
  } catch (err) {
    log('warn', `${modName} not found in the registry: ${err}`);
    return false;
  }
}
//Object for registry key info
const ASIO4ALL_REGISTRY_KEY = {
  "key": "HKEY_LOCAL_MACHINE",
  "subKey": `SOFTWARE\\WOW6432Node\\ASIO4ALL`,
  "value": ``
};





// LOAD ORDER /////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

// Folder-based load order //////////////////////////////////////////////////////
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
  const profile = selectors.lastActiveProfileForGame(state, GAME_ID);
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
            return Promise.reject(new util.UserCanceled('User cancelled.'));
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
    const modsPath = UNREALDATA.modsPath;
    const state = context.api.getState();
    const discoveryPath = util.getSafe(state.settings, ['gameMode', 'discovered', game.id, 'path'], undefined);
    const installPath = [discoveryPath].concat(modsPath.split(path.sep));
    return discoveryPath ? path.join.apply(null, installPath) : undefined;
  };
  context.registerInstaller('ue5-pak-installer', 29, testForUnrealMod, (files, __destinationPath, gameId) => installUnrealMod(context.api, files, gameId));
  context.registerModType(UE5_SORTABLE_ID, 25, 
    (gameId) => testUnrealGame(gameId, true), 
    getUnrealModsPath, 
    () => Promise.resolve(false), 
    { name: UE5_SORTABLE_NAME,
      mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id
    }
  );
}

// FBLO (File-Based Load Order) /////////////////////////////////////////////////////////////
let mod_update_all_profile = false;
let updatemodid = undefined;
let updating_mod = false; // used to see if it's a mod update or not
let mod_install_name = ""; // used to display the name of the currently installed mod
//in main function
context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('did-purge', (profileId) => didPurge(context.api, profileId)); //*/
    context.api.onAsync("did-deploy", (profileId) => {
        mod_update_all_profile = false;
        updating_mod = false;
        updatemodid = undefined;
    });
    context.api.events.on("mod-update", (gameId, modId, fileId) => {
        if (GAME_ID == gameId) {
        updatemodid = modId;
        }
    });
    context.api.events.on("remove-mod", (gameMode, modId) => {
        if (modId.includes("-" + updatemodid + "-")) {
        mod_update_all_profile = true;
        }
    });
    context.api.events.on("will-install-mod", (gameId, archiveId, modId) => {
        mod_install_name = modId.split("-")[0];
        if (GAME_ID == gameId && modId.includes("-" + updatemodid + "-")) {
        updating_mod = true;
        } else {
        updating_mod = false;
        }
    }); //*/
});
context.registerLoadOrder({
    gameId: GAME_ID,
    deserializeLoadOrder: async () => await deserializeLoadOrder(context),
    serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),  
    validate: async (prev, current) => await validate(context, prev, current), 
    //validate: async () => Promise.resolve(undefined), // no validation
    toggleableEntries: true,
    clearStateOnPurge: false,
    //noCollectionGeneration: undefined,
    usageInstructions:`Drag and drop the mods on the left to change the order in which they load.   \n` 
                    +`${GAME_NAME} loads mods in the order you set from top to bottom.   \n`
                    +`De-select mods to prevent the game from loading them.   \n`
                    +`\n`,
});
//deserialize load order
async function deserializeLoadOrder(context) {
  //Set basic information for load order paths and data
  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const mods = util.getSafe(context.api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const loadOrderPath = path.join(gameDir, PLUGINSTXT_PATH);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  //Get all .esm/esp/esl files from Data folder
  let modFolderPath = path.join(gameDir, PLUGINS_PATH);
  let modFiles = [];
  try {
    modFiles = await fs.readdirAsync(modFolderPath);
    modFiles = modFiles.filter(file => PLUGINS_EXTS_FILTER.includes(path.extname(file).toLowerCase()));
    modFiles = modFiles.filter(file => !DEFAULT_PLUGINS.includes(path.basename(file)));
    modFiles = modFiles.filter(file => !EXCLUDED_PLUGINS.includes(path.basename(file)));
    modFiles.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read Data folder'));
  }
  // Get readable mod name using attribute from mod installer
  async function getModName(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['plugins'], '').includes(file))); //find mod that includes the plugin file
      if (modMatch) {
        return modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
      }
      return file;
    } catch (err) {
      return file;
    }
  }
  // Get readable mod id using attribute from mod installer
  async function getModId(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['plugins'], '').includes(file))); //find mod that includes the plugin file
      if (modMatch) {
        return modMatch.id;
      }
      return undefined;
    } catch (err) {
      return undefined;
    }
  }
  //* Set initial load order from file
  let loadOrder = await (loadOrderFile.split("\n"))
    .reduce(async (accumP, line) => {
      const accum = await accumP;
      const file = line.replace(/#/g, '');
      if (!modFiles.includes(file)) {
        return Promise.resolve(accum);
      }
      accum.push(
      {
        id: file,
        name: `${file} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: !line.startsWith("#"),
      }
      );
      return Promise.resolve(accum);
    }, Promise.resolve([])
  ); //*/
  //push new mods to loadOrder
  for (let file of modFiles) {
    if (!loadOrder.find((mod) => (mod.id === file))) {
      loadOrder.push({
        id: file,
        name: `${file} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: true,
      });
    }
  }
  return loadOrder;
}
//Serialize load order
async function serializeLoadOrder(context, loadOrder) {
  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const loadOrderPath = path.join(gameDir, PLUGINSTXT_PATH);
  let loadOrderOutput = loadOrder
  .map((mod) => (mod.enabled ? mod.id : `#${mod.id}`))
  .join("\n");
  /* Log load order
  let loadOrderLog = loadOrder
  .map((mod) => (mod.enabled ? mod.id : `#${mod.id}`))
  .join(", ");
  log('warn', `Load Order: ${loadOrderLog}`); //*/
  const header = `# File generated by Vortex. Please do not edit this file.\n`;
  return fs.writeFileAsync(
    loadOrderPath,
    `${header + PLUGINSTXT_DEFAULT_CONTENT + loadOrderOutput}`, //empty line included in default plugins list to avoid overlap
    { encoding: "utf8" },
  );
}
//Validate load order
async function validate(context, prev, current) {
  const invalid = [];
  GAME_PATH = getDiscoveryPath(context.api);
  const dataPath = path.join(GAME_PATH, PLUGINS_PATH);
  for (const entry of current) {
    try {
      await fs.statAsync(path.join(dataPath, entry.id));
    }
    catch (err) {
      invalid.push({ id: entry.id, reason: 'File not found in Data folder' });
    }
  }
  return invalid.length > 0 ? Promise.resolve({ invalid }) : Promise.resolve(undefined);
}

//FBLO with order written to an existing txt file with other data in it //////////////////
//purge reset txt files
async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  psarcCleanup(api);
  clearModOrder(api);
  clearChunksTxt(api);
  return Promise.resolve();
}
//deserialize
async function deserializeLoadOrder(context) {
  //* on mod update for all profile it would cause the mod if it was selected to be unselected
  if (mod_update_all_profile) {
    let allMods = Array("mod_update");

    return allMods.map((modId) => {
      return {
        id: "mod update in progress, please wait. Refresh when finished. \n To avoid this wait, only update current profile",
        modId: modId,
        enabled: false,
      };
    });
  } //*/
  //Set basic information for load order paths and data
  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const mods = util.getSafe(context.api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  let loadOrderPath = path.join(gameDir, LO_FILE);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let loadOrderSplit = loadOrderFile.split("\n");
  let LO_LINE = loadOrderSplit.find(line => line.startsWith(LO_LINE_START)); //we are putting the list on one line. should be element [1], but doing find just in case that ever changes.
  LO_LINE = LO_LINE.replace(LO_LINE_START, '');
  let modFolderPath = path.join(gameDir, PSARC_PATH);
  //Get all .psarc files from mods folder
  let modFiles = [];
  try {
    modFiles = await fs.readdirAsync(modFolderPath);
    modFiles = modFiles.filter((file) => (path.extname(file) === PSARC_EXT));
    modFiles.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read .psarc "mods" folder'));
  }
  // Get readable mod name using attribute from mod installer
  async function getModName(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['psarcFiles'], '').includes(file))); //find mod that includes the psarc file
      if (modMatch) {
        return modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
      }
      return file;
    } catch (err) {
      return file;
    }
  }
  // Get readable mod id using attribute from mod installer
  async function getModId(file) {
    try {//find mod where atrribute (from installer) matches file in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['psarcFiles'], '').includes(file))); //find mod that includes the psarc file
      if (modMatch) {
        return modMatch.id;
      }
      return undefined;
    } catch (err) {
      return undefined;
    }
  }
  //Set load order
  let loadOrder = await (LO_LINE.split(","))
    .reduce(async (accumP, entry) => {
      const accum = await accumP;
      const file = entry;
      if (!modFiles.includes(file)) {
        return Promise.resolve(accum);
      }
      accum.push(
      {
        id: file,
        name: `${file.replace(PSARC_EXT, '')} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: true,
      }
      );
      return Promise.resolve(accum);
    }, Promise.resolve([]));
  //push new mod folders from Mods folder to loadOrder
  for (let file of modFiles) {
    if (!loadOrder.find((mod) => (mod.id === file))) {
      loadOrder.push({
        id: file,
        name: `${file.replace(PSARC_EXT, '')} (${await getModName(file)})`,
        modId: await getModId(file),
        enabled: true,
      });
    }
  }
  return loadOrder;
}
//Write load order to files
async function serializeLoadOrder(context, loadOrder) {
  //* don't write if all profiles are being updated
  if (mod_update_all_profile) {
    return;
  } //*/
  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  let loadOrderPath = path.join(gameDir, LO_FILE);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let loadOrderSplit = loadOrderFile.split("\n");
  let LO_LINE = loadOrderSplit.find(line => line.startsWith(LO_LINE_START)); //we are putting the list on one line. should be element [1], but doing find just in case that ever changes.
  let index = loadOrderSplit.indexOf(LO_LINE);
  let loadOrderMapped = loadOrder
    //.map((mod) => (mod.id))
    .map((mod) => (mod.enabled ? mod.id : ``)); //this is used for chunks.txt also
  let loadOrderJoined = loadOrderMapped
    .filter((entry) => (entry !== ``))
    .join(",");
  loadOrderSplit[index] = LO_LINE_START + loadOrderJoined;
  //Write to chunks.txt file
  let chunksPath = path.join(gameDir, CHUNKS_PATH);
  let loadOrderName = loadOrderMapped
    .filter((entry) => (entry !== ``))
    .map((name) => (name.replace('.psarc', '')));
  const startLine = CHUNKS_START_LINE;
  for (let line = startLine; line < (startLine + loadOrderName.length); line++) {
    let offset = line - startLine; //offset to zero for indexing the array from the first element
    loadOrderName[offset] = `${loadOrderName[offset]} ${line}`;
  }
  let loadOrderJoinedChunks = loadOrderName.join(`\n`);
  await fs.writeFileAsync(
    chunksPath,
    `${CHUNKS_DEFAULT_CONTENT}` + `${loadOrderJoinedChunks}`,
    { encoding: "utf8" },
  );
  //write to modloader.ini file
  let loadOrderOutput = loadOrderSplit.join("\n");
  return fs.writeFileAsync(
    loadOrderPath,
    `${loadOrderOutput}`,
    { encoding: "utf8" },
  );
}
//remove load order list from modloader.ini on purge
async function clearModOrder(api) {
  let gameDir = getDiscoveryPath(api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  let loadOrderPath = path.join(gameDir, LO_FILE);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let loadOrderSplit = loadOrderFile.split("\n");
  let LO_LINE = loadOrderSplit.find(line => line.startsWith(LO_LINE_START)); //we are putting the list on one line. should be element [1], but doing find just in case that ever changes.
  let index = loadOrderSplit.indexOf(LO_LINE);
  loadOrderSplit[index] = LO_LINE_START; //set the line to the default "blank" text
  let loadOrderOutput = loadOrderSplit.join("\n");
  return fs.writeFileAsync(
    loadOrderPath,
    `${loadOrderOutput}`,
    { encoding: "utf8" },
  );
}
//remove load order list from chunks.txt on purge
async function clearChunksTxt(api) {
  let gameDir = getDiscoveryPath(api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  let chunksPath = path.join(gameDir, CHUNKS_PATH);
  return fs.writeFileAsync(
    chunksPath,
    `${CHUNKS_DEFAULT_CONTENT}`,
    { encoding: "utf8" },
  );
}





// GAME REGISTRATION FUNCTIONS ///////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

//Dynamic executable path //////////////////////////////////////////////////////
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
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return EXEC_XBOX;
  };
  if (isCorrectExec(EXEC_DEFAULT)) {
    GAME_VERSION = 'steam';
    return EXEC_DEFAULT;
  };
  if (isCorrectExec(EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    return EXEC_EPIC;
  };
  if (isCorrectExec(EXEC_GOG)) {
    GAME_VERSION = 'gog';
    return EXEC_GOG;
  }; 
  if (isCorrectExec(EXEC_DEMO)) {
    GAME_VERSION = 'demo';
    return EXEC_DEMO;
  }; //*/
  GAME_VERSION = 'default';
  return EXEC;
}

//* register modtypes with partition checks //////////////////////////////////////////////////////
context.registerModType(CONFIG_ID, 60, 
(gameId) => {
    GAME_PATH = getDiscoveryPath(context.api);
    if (GAME_PATH !== undefined) {
      CHECK_DATA = checkPartitions(CONFIGMOD_LOCATION, GAME_PATH);
    }
    return ((gameId === GAME_ID) && (CHECK_DATA === true));
},
(game) => pathPattern(context.api, game, CONFIG_TARGET), 
() => Promise.resolve(false), 
{ name: CONFIG_NAME }
); //*/



// NOTIFICATIONS ///////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////

//Success notification //////////////////////////////////////////////////////
function linkSuccessNotify(api) {
  const NOTIF_ID = `${GAME_ID}-folonlinksuccess`;
  const MESSAGE = `${EXTENSION_NAME} successfully linked FOLON GOG game files to FO4 Vortex Staging Folder`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'success',
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}

//Basic notification //////////////////////////////////////////////////////
function partitionCheckNotify(api, CHECK_DATA) {
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
                + `  - Config: ${CHECK_DATA ? `ENABLED: ${CONFIG_LOC} folder is on the same partition as the game and the Vortex staging folder, so the Config modtype is available` : `DISABLED: ${CONFIG_LOC} folder is NOT on the same partition as the game and the Vortex staging folder, so the Config modtype is NOT available`}\n`
                + `  - Save: ${CHECK_DATA ? `ENABLED: ${SAVE_LOC} folder is on the same partition as the game and the Vortex staging folder, so the Save modtype is available` : `DISABLED: ${SAVE_LOC} folder is NOT on the same partition as the game and the Vortex staging folder, so the Save modtype is NOT available`}\n`

                + `\n`
                + `Config Path: ${CONFIG_PATH}\n`
                + `Save Path: ${SAVE_PATH}\n`
                + `\n`
                + `If you want to use the disabled mod types, you must move the game and staging folder to the same partition as the folders shown above (typically C Drive).\n`
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

//Tool-run notification //////////////////////////////////////////////////////
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy`;
  const MOD_NAME = 'OpenBLCMM or TFC';
  const MESSAGE = `Run ${MOD_NAME} to Install Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run BLCMM',
        action: (dismiss) => {
          runModManager(api, BLCMM_ID, BLCMM_NAME);
          dismiss();
        },
      },
      {
        title: 'Run TFC',
        action: (dismiss) => {
          runModManager(api, TFC_ID, TFC_NAME);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `For most mods, you must use ${MOD_NAME} to install the mod to the game files after installing with Vortex.\n`
                + `TFC mods will be found at this folder: "${TFC_FOLDER}\\Mods".\n`
                + `BLCMM mods (.blcm files) will be found in the "Binaries" folder.\n`  
                + `.txt patch files for OpenBLCMM will be found at the game root folder.\n`         
                + `Use the included tools to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
          }, [
            {
              label: 'Run BLCMM', action: () => {
                runModManager(api, BLCMM_ID, BLCMM_NAME);
                dismiss();
              }
            },
            {
              label: 'Run TFC', action: () => {
                runModManager(api, TFC_ID, TFC_NAME);
                dismiss();
              }
            },
            { label: 'Continue', action: () => dismiss() },
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
//run the tool
function runModManager(api, toolId, toolName) {
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', toolId], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false })
        .catch(err => api.showErrorNotification(`Failed to run ${toolName}`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    }
    else {
      return api.showErrorNotification(`Failed to run ${toolName}`, `Path to ${toolName} executable could not be found. Ensure ${toolName} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${toolName}`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}





// SETUP FUNCTIONS ////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

//Set a primary tool if one is not already set
const trySetPrimaryTool = async (api) => {
  const state = api.getState();
  const discovery = selectors.discoveryByGame(state, GAME_ID);
  if (discovery === undefined || discovery.store === 'xbox') {
      return Promise.resolve();
  }
  else {
    await api.emitAndAwait('discover-tools', GAME_ID);
    const tool = REQUIREMENTS[0].findMod(api);
    const primaryTool = util.getSafe(api.getState(), ['settings', 'interface', 'primaryTool', GAME_ID], undefined);
    if (tool && !primaryTool) {
      api.store.dispatch(actions.setPrimaryTool(GAME_ID, TOOL_ID));
    }
  }
};

//Setup function - ensure modType Folders are writable /////////////////////
async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

// swap mod loaders and restart extension
async function relaunchExt(api) {
  return api.showDialog('info', 'Restart Required', {
    text: '\n'
        + 'The extension requires a restart to complete the Mod Loader setup.\n'
        + '\n'
        + 'The extension will purge mods and then exit - please re-activate the game via the Games page or Dashboard page.\n'
        + '\n'
        + 'IMPORTANT: You may see an External Changes dialogue. Select "Revert change (use staging file)".\n'
        + '\n',
  }, [ { label: 'Restart Extension' } ])
  .then(async () => {
    try {
      await purge(api);
      const batched = [
        actions.setDeploymentNecessary(GAME_ID, true),
        actions.setNextProfile(undefined),
      ];
      util.batchDispatch(api.store, batched);
    } catch (err) {
      api.showErrorNotification('Failed to set up Mod Loader', err);
    }
  });
}
//Function to choose mod loader
async function chooseModLoader(api, gameSpec) {
  const t = api.translate;
  const replace = {
    game: gameSpec.game.name,
    bl: '[br][/br][br][/br]',
  };
  return api.showDialog('info', 'Mod Loader Selection', {
    bbcode: t('You must choose between BepInEx and MelonLoader to install mods.{{bl}}'
      + 'Only one mod loader can be installed at a time.{{bl}}'
      + 'Make your choice based on which mods you would like to install and which loader they support.{{bl}}'
      + 'You can change which mod loader you have installed by Uninstalling the current one from Vortex, which will bring up this dialog again.{{bl}}'
      + 'Which mod loader would you like to use for {{game}}?',
      { replace }
    ),
  }, [
    { label: t('BepInEx') },
    { label: t('MelonLoader') },
  ])
  .then(async (result) => {
    if (result === undefined) {
      return;
    }
    if (result.action === 'BepInEx') {
      await downloadBepinex(api, gameSpec);
    } else if (result.action === 'MelonLoader') {
      await downloadMelon(api, gameSpec);
    }
    //* This is necessary to change CustomCharacters modType path
    await deploy(api);
    relaunchExt(api); //*/
  });
}
//Deconflict mod loaders
async function deconflictModLoaders(api, gameSpec) {
  const t = api.translate;
  const replace = {
    game: gameSpec.game.name,
    bl: '[br][/br][br][/br]',
  };
  return api.showDialog('info', 'Mod Loader Conflict', {
    bbcode: t('You have both BepInEx and MelonLoader installed.{{bl}}'
      + 'This will cause the game to crash at launch. Only one mod loader can be installed at a time.{{bl}}'
      + 'You must choose which mod loader you would like to use for {{game}}.',
      { replace }
    ),
  }, [
    { label: t('BepInEx') },
    { label: t('MelonLoader') },
  ])
  .then(async (result) => {
    if (result === undefined) {
      return;
    }
    if (result.action === 'BepInEx') {
      await removeMelon(api, gameSpec);
    } else if (result.action === 'MelonLoader') {
      await removeBepinex(api, gameSpec);
    }
    //* This is necessary to change CustomCharacters modType path
    await deploy(api);
    relaunchExt(api); //*/
  });
}
async function removeBepinex(api, gameSpec) {
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const mod = Object.keys(mods).find(id => mods[id]?.type === BEPINEX_ID);
  const modId = mods[mod].id
  log('warn', `Found BepInEx mod to remove for deconfliction: ${modId}`);
  try {
    await util.removeMods(api, gameSpec.game.id, [modId]);
  } catch (err) {
    api.showErrorNotification('Failed to remove BepInEx', err);
  }
}
async function removeMelon(api, gameSpec) {
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const mod = Object.keys(mods).find(id => mods[id]?.type === MELON_ID);
  const modId = mods[mod].id
  log('warn', `Found MelonLoader mod to remove for deconfliction: ${modId}`);
  try {
    await util.removeMods(api, gameSpec.game.id, [modId]);
  } catch (err) {
    api.showErrorNotification('Failed to remove MelonLoader', err);
  }
}

//Extract a game data file using specialized tools ////////////////////////////////////////////
const CLEANUP_FOLDERS = ["actor97", "animstream97", "bin", "pak68", "sfx1", "soundbank4", "texturedict3"];
async function psarcExtract(GAME_PATH, api) {
  let RUN_PATH = path.join(__dirname, PSARCTOOL_EXT_PATH, PSARCTOOL_EXEC); //if bundled with extension
  //* If installed as a mod (run from staging so that can purge prior to execution)
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  const mods = state.persistent.mods[spec.game.id] || {};
  const modMatch = Object.keys(mods).find(id => mods[id]?.type === PSARCTOOL_ID);
  const EXEC_FOLDER = mods[modMatch].installationPath;
  if (EXEC_FOLDER !== undefined) {
    //const RUN_PATH = path.join(GAME_PATH, PSARCTOOL_PATH, PSARCTOOL_EXEC);
    RUN_PATH = path.join(STAGING_FOLDER, EXEC_FOLDER, PSARCTOOL_EXEC);
  } //*/
  const WORK_PATH = path.join(GAME_PATH, PSARCTOOL_PATH);
  try { //extract sp-common.psarc
    const TARGET_FILE = path.join(WORK_PATH, SPCOMPSARC_FILE);
    const EXTRACT_PATH = WORK_PATH;
    fs.statSync(TARGET_FILE);
    //const ARGUMENTS = `"${path.join(WORK_PATH, SPCOMPSARC_FILE)}" "${WORK_PATH}"`; //UnPSARC arguments
    const ARGUMENTS = `-e "${TARGET_FILE}" -o "${EXTRACT_PATH}"`; //ndarc arguments
    await api.runExecutable(RUN_PATH, [ARGUMENTS], { shell: true, detached: true, suggestDeploy: false });
    log('warn', `Ran extraction for .psarc file ${SPCOMPSARC_FILE}`);
  } catch (err) {
    log('error', `Could not extract .psarc file ${SPCOMPSARC_FILE}: ${err}`);
    return false;
  }
  try { //extract bin.psarc
    const TARGET_FILE = path.join(WORK_PATH, BINPSARC_FILE);
    const EXTRACT_PATH = path.join(WORK_PATH, BIN_FOLDER);
    fs.statSync(TARGET_FILE);
    //const ARGUMENTS = `"${path.join(WORK_PATH, BINPSARC_FILE)}" "${path.join(WORK_PATH, BIN_FOLDER)}"`; //UnPSARC arguments
    const ARGUMENTS = `-e "${TARGET_FILE}" -o "${EXTRACT_PATH}"`; //ndarc arguments
    await api.runExecutable(RUN_PATH, [ARGUMENTS], { shell: true, detached: true, suggestDeploy: false });
    log('warn', `Ran extraction for .psarc file ${BINPSARC_FILE}`);
  } catch (err) {
    log('error', `Could not extract .psarc file ${BINPSARC_FILE}: ${err}`);
    return false;
  }
  try { //stat extracted folders to make sure they are there
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BIN_FOLDER));
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, 'pak68'));
    return true;
  } catch (err) { //if the folders aren't there, the user probably clossed the terminal windows
    return false;
  }
}
//Setup .psarc files for modding
async function psarcSetup(api) { //run on mod purge
  const NOTIF_ID = `${GAME_ID}-psarcsetup`
  api.sendNotification({ //notification indicating install process
    id: NOTIF_ID,
    message: `Extracting and Renaming .psarc Files. This will take a while. Do not close the terminal windows.`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  const state = api.getState();
  const discovery = selectors.discoveryByGame(state, GAME_ID);
  GAME_PATH = discovery.path;
  //await api.emitAndAwait('purge-mods-in-path', GAME_ID, '', path.join(GAME_PATH, PSARCTOOL_PATH));
  await purge(api);
  //await api.emitAndAwait('deploy-single-mod', GAME_ID, modMatch.id, false);
  let EXTRACTED = await psarcExtract(GAME_PATH, api);
  if (EXTRACTED) {
    log('warn', `Extraction of all .psarc files complete. Renaming files...`);
    try { //rename sp-common.psarc
      fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, SPCOMPSARC_FILE));
      fs.renameAsync(path.join(GAME_PATH, PSARCTOOL_PATH, SPCOMPSARC_FILE), path.join(GAME_PATH, PSARCTOOL_PATH, BAK_SPCOMPSARC_FILE));
      log('warn', `Renamed .psarc file ${SPCOMPSARC_FILE} to ${BAK_SPCOMPSARC_FILE}`);
    } catch (err) {
      log('error', `Could not rename .psarc file ${SPCOMPSARC_FILE}: ${err}`);
    }
    try { //rename bin.psarc
      fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BINPSARC_FILE));
      fs.renameAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BINPSARC_FILE), path.join(GAME_PATH, PSARCTOOL_PATH, BAK_BINPSARC_FILE));
      log('warn', `Renamed .psarc file ${BINPSARC_FILE} to ${BAK_BINPSARC_FILE}`);
    } catch (err) {
      log('error', `Could not rename .psarc file ${BINPSARC_FILE}: ${err}`);
    } //*/
    //api.events.emit('deploy-mods', (err) => {log('error', `Failed to deploy mods! User will have to deploy manually: ${err}`)});
    await deploy(api);
    api.dismissNotification(NOTIF_ID);
    return;
  }
  await deploy(api);
  api.dismissNotification(NOTIF_ID);
  api.showErrorNotification(`Could not complete extraction of .psarc files. Please try again.`, `Could not complete extraction of .psarc files. Please try again. This error likely occured due to closing the ndarc terminal windows before extraction was complete.`, { allowReport: false });
  return;
}
//Cleanup extracted .psarc game files (called on purge)
async function psarcCleanup(api) {
  const state = api.getState();
  const discovery = selectors.discoveryByGame(state, GAME_ID);
  GAME_PATH = discovery.path;
  const FOLDERS_PATH = path.join(GAME_PATH, PSARCTOOL_PATH);
  CLEANUP_FOLDERS.forEach((folder, idx, arr) => {
    try { //remove extracted .psarc folders
      fs.statSync(path.join(FOLDERS_PATH, folder));
      fsPromises.rm(path.join(FOLDERS_PATH, folder), { recursive: true });
      //log('warn', `Deleted extracted .psarc folder "${folder}"`);
    } catch (err) {
      log('error', `Could not delete extracted .psarc folder "${folder}": ${err}`);
    }
  }); //*/
  try { //restore name of sp-common.psarc
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_SPCOMPSARC_FILE));
    try { //make sure vanilla file is not in place - this usually means the game was updated
      fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, SPCOMPSARC_FILE));
      fs.unlinkAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_SPCOMPSARC_FILE));
    } catch (err) { //vanilla file not present, safe to rename
      await fs.renameAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_SPCOMPSARC_FILE), path.join(GAME_PATH, PSARCTOOL_PATH, SPCOMPSARC_FILE));
      //log('warn', `Renamed .psarc file ${BAK_SPCOMPSARC_FILE} to ${SPCOMPSARC_FILE}`);
    }
  } catch (err) {
    //log('error', `Could not restore name of .psarc file ${SPCOMPSARC_FILE}: ${err}`);
  }
  try { //restore name of bin.psarc
    fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_BINPSARC_FILE));
    try { //make sure vanilla file is not in place - this usually means the game was updated
      fs.statSync(path.join(GAME_PATH, PSARCTOOL_PATH, BINPSARC_FILE));
      fs.unlinkAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_BINPSARC_FILE));
    } catch (err) {
      await fs.renameAsync(path.join(GAME_PATH, PSARCTOOL_PATH, BAK_BINPSARC_FILE), path.join(GAME_PATH, PSARCTOOL_PATH, BINPSARC_FILE));
      //log('warn', `Renamed .psarc file ${BAK_BINPSARC_FILE} to ${BINPSARC_FILE}`);
    }
  } catch (err) {
    //log('error', `Could not restore name of .psarc file ${BINPSARC_FILE}: ${err}`);
  }
  setupNotify(api);
}





// REGISTER GAME FUNCTIONS /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

//getGameVersion //////////////////////////////////////////////////////
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
  }
  else { 
    GAME_VERSION = 'steam';
    return GAME_VERSION;
  };
}
//For games with an Xbox version and a readable executable for non-Xbox versions //
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
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
  else { // use DoomTheDarkAges.exe for Steam
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
}

//Specify a second executable to use for versioning //////////////////////////////////////////////////////
function getShippingExe(gamePath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(gamePath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_DEFAULT)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_DEFAULT}-Shipping.exe`);
    return SHIPPING_EXE;
  };
  if (isCorrectExec(EXEC_EPIC)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_EGS}-Shipping.exe`);
    return SHIPPING_EXE;
  };
  if (isCorrectExec(EXEC_GOG)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_GOG}-Shipping.exe`);
    return SHIPPING_EXE;
  };
  if (isCorrectExec(EXEC_DEMO)) {
    SHIPPING_EXE = path.join(EPIC_CODE_NAME, 'Binaries', EXEC_FOLDER_DEFAULT, `${SHIPEXE_PROJECTNAME}-${EXEC_FOLDER_DEFAULT}${SHIPEXE_STRING_DEMO}-Shipping.exe`);
    return SHIPPING_EXE;
  };
}
async function resolveGameVersion(gamePath, exePath) {
  //SHIPPING_EXE = getShippingExe(gamePath);
  const READ_FILE = path.join(gamePath, SHIPPING_EXE);
  let version = '0.0.0';
  try {
    const exeVersion = require('exe-version');
    version = await exeVersion.getProductVersion(READ_FILE);
    //log('warn', `Resolved game version for ${GAME_ID} to: ${version}`);
    return Promise.resolve(version); 
  } catch (err) {
    log('error', `Could not read ${READ_FILE} file to get game version: ${err}`);
    return Promise.resolve(version);
  }
}





// TOOLS /////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

[
    {
    id: `${GAME_ID}-customlaunch`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC_DEFAULT,
    requiredFiles: [EXEC_DEFAULT],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: [],
    }, //*/
    {
    id: `${GAME_ID}-customlaunchxbox`,
    name: `Custom Launch (Xbox)`,
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
    {
    id: SAVE_EDITOR_ID,
    name: SAVE_EDITOR_NAME,
    logo: `saveeditor.png`,
    queryPath: getBinariesFolder,
    executable: () => SAVE_EDITOR_EXEC,
    requiredFiles: [SAVE_EDITOR_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    //parameters: [],
    }, //*/
],





// CONTEXT.ONCE FUNCTIONS /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

// Combine txt/.cfg files into one //////////////////////////////////////////////////////
//* In context.once 
context.api.onAsync('did-deploy', async (profileId, deployment) => {
  const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
  if (profileId !== LAST_ACTIVE_PROFILE) return;
  return didDeploy(context.api, profileId);
}); //*/
context.api.onAsync('did-purge', async (profileId) => {
  const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
  if (profileId !== LAST_ACTIVE_PROFILE) return;
  return didDeploy(context.api, profileId);
});
//* After deploy
async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  await writeCfgDeploy(api);
  deployNotify(api);
  return Promise.resolve();
} //*/
//* After purge
async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  await writeCfgPurge(api);
  return Promise.resolve();
} //*/
//* Write autoexec.cfg on deploy
async function writeCfgDeploy(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const AUTOEXEC_CFG_PATH = path.join(GAME_PATH, CONFIG_PATH, AUTOEXEC_CFG_FILE);
  const CFG_PATH = path.join(GAME_PATH, CONFIG_PATH);

  let EXISTING_CONTENT = await fs.readFileAsync(
    AUTOEXEC_CFG_PATH, 
    { encoding: "utf8", }
  );
  let EXISTING_CONTENT_ARRAY = EXISTING_CONTENT.split("\n");
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => !line.startsWith('exec'));
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => (line !== ``));
  EXISTING_CONTENT = EXISTING_CONTENT_ARRAY.join("\n");

  let modFiles = [];
  const CFG_EXT_FILTER = CONFIG_EXTS;
  const CFG_FILE_FILTER = [AUTOEXEC_CFG_FILE, 'candidate.cfg', 'default.cfg', 'disclayout.cfg'];
  try {
    modFiles = await fs.readdirAsync(CFG_PATH);
    modFiles = modFiles.filter(file => CFG_EXT_FILTER.includes(path.extname(file).toLowerCase()));
    modFiles = modFiles.filter(file => !CFG_FILE_FILTER.includes(path.basename(file)));
    modFiles = modFiles.map(file => `exec ${file}`);
  } catch {
    return Promise.reject(new Error('Failed to read Data folder'));
  }
  return fs.writeFileAsync(
    AUTOEXEC_CFG_PATH,
    `${EXISTING_CONTENT + '\n' + modFiles.join('\n')}`,
    { encoding: "utf8" },
  );
} //*/
//* Reset autoexec.cfg on purge
async function writeCfgPurge(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const AUTOEXEC_CFG_PATH = path.join(GAME_PATH, CONFIG_PATH, AUTOEXEC_CFG_FILE);

  let EXISTING_CONTENT = await fs.readFileAsync(
    AUTOEXEC_CFG_PATH, 
    { encoding: "utf8", }
  );
  let EXISTING_CONTENT_ARRAY = EXISTING_CONTENT.split("\n");
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => !line.startsWith('exec'));
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => (line !== ``));
  EXISTING_CONTENT = EXISTING_CONTENT_ARRAY.join("\n");

  return fs.writeFileAsync(
    AUTOEXEC_CFG_PATH,
    EXISTING_CONTENT,
    { encoding: "utf8" },
  );
} //*/

// Did deploy/purge boilerplate //////////////////////////////////////////////////////
async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  
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

//Scan a folder for .json files and write there names to a list in a central .json file //////////////////////////////////////////////////////
// in context.once
context.api.onAsync('did-deploy', async (profileId, deployment) => { //update boot-options.json file on deployment
    const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
    if (profileId !== LAST_ACTIVE_PROFILE) return;
    return await updateJsonFiles(context.api);
});
context.api.onAsync('did-purge', async (profileId) => {
    const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
    if (profileId !== LAST_ACTIVE_PROFILE) return;
    return await resetJsonFiles(context.api);
}); //*/
// Write json file list to JsonFiles.json file (on deployment)
async function updateJsonFiles(api) { 
  GAME_PATH = getDiscoveryPath(api);
  try { //write to JsonFiles.json file (on deploy)
    try { //read JsonFiles.json file to get current list
      fs.statSync(path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE));
      JSONFILES_JSON = JSON.parse(fs.readFileSync(path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE)));
    } catch (err) {
      await fs.writeFileAsync(
        path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE),
        `${JSON.stringify(DEFAULT_JSON, null, 2)}`,
        { encoding: "utf8" },
      );
      JSONFILES_JSON = JSON.parse(fs.readFileSync(path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE)));
    } //*/
    const JSON_FOLDER_FILES = await fsPromises.readdir(path.join(GAME_PATH, JSON_PATH), { recursive: true });
    const JSON_FILES = JSON_FOLDER_FILES.filter(file => ( 
      (path.extname(file).toLowerCase() === JSON_EXT) && 
      (path.basename(file) !== JSONFILES_FILE) &&
      (path.basename(file).toLowerCase() !== 'mod.json') &&
      (path.basename(file) !== 'vortex.deployment.dragonballsparkingzero-json.json')
    ));
    const JSON_FILE_NAMES = JSON_FILES.map(file => path.basename(file, path.extname(file)));
    JSONFILES_JSON[JSONFILES_KEY] = JSON_FILE_NAMES;
    await fs.writeFileAsync(
      path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE),
      `${JSON.stringify(JSONFILES_JSON, null, 2)}`,
      { encoding: "utf8" },
    );
  } catch (err) {
    api.showErrorNotification(`Could not update ${JSONFILES_FILE} file with texpack and lodpack file names. Please add entries manually.`, err, { allowReport: false });
  }
}
// Reset JsonFiles.json file (on purge)
async function resetJsonFiles(api) { 
  GAME_PATH = getDiscoveryPath(api);
  try { //reset JsonFiles.json file
    try { //read JsonFiles.json file to get current list
      fs.statSync(path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE));
      JSONFILES_JSON = JSON.parse(fs.readFileSync(path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE)));
    } catch (err) {
      await fs.writeFileAsync(
        path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE),
        `${JSON.stringify(DEFAULT_JSON, null, 2)}`,
        { encoding: "utf8" },
      );
      JSONFILES_JSON = JSON.parse(fs.readFileSync(path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE)));
    } //*/
    JSONFILES_JSON[JSONFILES_KEY] = [];
    await fs.writeFileAsync(
      path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE),
      `${JSON.stringify(JSONFILES_JSON, null, 2)}`,
      { encoding: "utf8" },
    );
  } catch (err) {
    api.showErrorNotification(`Could not reset ${JSONFILES_FILE} file. Please remove entries manually.`, err, { allowReport: false });
  }
}


