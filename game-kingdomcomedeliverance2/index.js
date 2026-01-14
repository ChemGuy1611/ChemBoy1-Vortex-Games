/*//////////////////////////////////////////////////
Name: Kingdom Come Deliverance II Vortex Extension
Structure: Mod Folder and FBLO
Author: ChemBoy1
Version: 0.4.2
Date: 2025-07-14
//////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all the information about the game
const STEAMAPP_ID = "1771300";
const EPICAPP_ID = "278984b84235407d922da634b9d7d247";
const GOGAPP_ID = "1248083010";
const XBOXAPP_ID = null;
const XBOXEXECNAME = null;
const GAME_ID = "kingdomcomedeliverance2";
const GAME_NAME = "Kingdom Come:\tDeliverance II"
const GAME_NAME_SHORT = "KCD2";
const MOD_PATH = path.join("Mods");
const REQ_FILE = path.join('Data', 'Levels', 'trosecko', 'cestool.pak');
const STEAMWORKSHOP_FOLDER = path.join("workshop", "content", STEAMAPP_ID);
let LOAD_ORDER_ENABLED = true;
let GAME_PATH = null;
let GAME_VERSION = null;
let EXECUTABLE = null;

//information for executable discovery and variable paths
let BINARIES_PATH = null;
let BINARIES_TARGET = null;
const EXEC_FILENAME = "KingdomCome.exe";
const BINPATH_STEAM = path.join("Bin", "Win64MasterMasterSteamPGO");
const EXEC_STEAM = path.join(BINPATH_STEAM, EXEC_FILENAME);
const BINPATH_EPIC = path.join("Bin", "Win64MasterMasterEpicPGO");
const EXEC_EPIC = path.join(BINPATH_EPIC, EXEC_FILENAME);
const BINPATH_GOG = path.join("Bin", "Win64MasterMasterGogPGO");
const EXEC_GOG = path.join(BINPATH_GOG, EXEC_FILENAME);
const BINPATH_XBOX = ".";
const EXEC_XBOX = "gamelaunchhelper.exe";

//Data for mod types, tools, load order, and installers
const USER_DOCS = util.getVortexPath('home');

const MOD_ID = `${GAME_ID}-mod`;
const MOD_NAME = `Mod`;
const MOD_FILE1 = "mod.manifest";
const MOD_FILES = [MOD_FILE1];
const MOD_FOLDER1 = "data";
const MOD_FOLDER2 = "localization";
const MOD_FOLDER3 = "engine";
const MOD_FOLDERS = [MOD_FOLDER1, MOD_FOLDER2, MOD_FOLDER3];
const CFGMOD_FILE = "mod.cfg";

const CFG_EXT = ".cfg";
const CFGUSER_FILE = "user.cfg";

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = `Root Game Folder`;
const ROOT_FOLDER1 = "bin";
const ROOT_FOLDERS = [ROOT_FOLDER1];

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = `Binaries`;
const DLL_EXT = ".dll";
const EXE_EXT = ".exe";

const LO_FILE = "mod_order.txt";
const LO_MOD_FILE = MOD_FILE1;
const LO_PATH = path.join(MOD_PATH, LO_FILE);
const IGNORED_EXTS = ['.txt', '.json', '.manifest'];

const LOG_FILE = "kcd.log";
const CONFIG_FILE = "attributes.xml";
const CONFIG_PATH = path.join(USER_DOCS, 'Saved Games', 'kingdomcome2', 'profiles', 'default');
const SAVE_PATH = path.join(USER_DOCS, 'Saved Games', 'kingdomcome2', 'saves');

// for mod update to keep them in the load order and not uncheck them
let mod_update_all_profile = false;
let updatemodid = undefined;
let updating_mod = false; // used to see if it's a mod update or not
let mod_install_name = ""; // used to display the name of the currently installed mod

//Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE,
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      //"xboxAppId": XBOXAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      //"XboxAPPId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": MOD_ID,
      "name": MOD_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MOD_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
      GOGAPP_ID,
      //XBOXAPP_ID,
    ],
    "names": []
  }
};

// BASIC EXTENSION FUNCTIONS //////////////////////////////////////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  try {
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch (err) {
    api.showErrorNotification('Failed to locate executable because Vortex cannot read the installation folder. Please launch the game at least once.', err, { allowReport: false });
  }
}

//Set the mod path for the game
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

async function requiresLauncher(gamePath, store) {
  /*
  if (store === 'xbox') {
      return Promise.resolve({
          launcher: 'xbox',
          addInfo: {
              appId: XBOXAPP_ID,
              parameters: [{ appExecName: XBOXEXECNAME }],
          },
      });
  } //*/
  /*
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'epic',
    });
  } //*/
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
  if (isCorrectExec(EXEC_STEAM)) {
    GAME_VERSION = 'steam';
    BINARIES_PATH = BINPATH_STEAM;
    BINARIES_TARGET = `{gamePath}\\${BINARIES_PATH}`;
    return EXEC_STEAM;
  };
  if (isCorrectExec(EXEC_EPIC)) {
    GAME_VERSION = 'epic';
    BINARIES_PATH = BINPATH_EPIC;
    BINARIES_TARGET = `{gamePath}\\${BINARIES_PATH}`;
    return EXEC_EPIC;
  };
  if (isCorrectExec(EXEC_GOG)) {
    GAME_VERSION = 'gog';
    BINARIES_PATH = BINPATH_GOG;
    BINARIES_TARGET = `{gamePath}\\${BINARIES_PATH}`;
    return EXEC_GOG;
  };
  /*if (isCorrectExec(EXEC_XBOX)) {
  GAME_VERSION = 'xbox';
    BINARIES_PATH = BINPATH_XBOX;
    BINARIES_TARGET = `{gamePath}\\${BINARIES_PATH}`;
    return EXEC_XBOX;
  }; //*/
  //log('error', `Could not read game folder to set executable for ${GAME_NAME}`);
  return EXEC_STEAM;
}

// MOD INSTALLER FUNCTIONS ////////////////////////////////////////////////////////////////////////////////////////

//Installer test for mod files
function testMod(files, gameId) {
  const isModFile = files.some(file => MOD_FILES.includes(path.basename(file).toLowerCase()));
  const isFolder = files.some(file => MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
  const isCfg = files.some(file => path.basename(file).toLowerCase() === CFGMOD_FILE);
  let supported = (gameId === spec.game.id) && ( isModFile || isFolder || isCfg );

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

//Installer install mod files
function installMod(files, fileName) {
  const modFile1 = files.find(file => MOD_FILES.includes(path.basename(file).toLowerCase()));
  const modFile2 = files.find(file => MOD_FOLDERS.includes(path.basename(file).toLowerCase()));
  const modFile3 = files.find(file => path.basename(file).toLowerCase() === CFGMOD_FILE);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_ID };
  const MOD_NAME = path.basename(fileName);
  let idx = null;
  let rootPath = null;
  let MOD_FOLDER = null;
  //log('info', `Installing Mod File: ${MOD_NAME}`);
  if (modFile1 !== undefined) {
    idx = modFile1.indexOf(path.basename(modFile1));
    rootPath = path.dirname(modFile1);
    try {
      //parse mod.manifest XML here to get <name>, lowercase and replace whitespace with "_", and use as MOD_FOLDER
      const modManifest = fs.readFileSync(path.join(fileName, modFile1), 'utf8');
      const parser = new DOMParser();
      const serializer = new XMLSerializer();
      const XML = parser.parseFromString(modManifest, 'text/xml');
      const XML_SERIAL = serializer.serializeToString(XML);
      //log('info', `mod.manifest: ${XML_SERIAL}`);
      let modName = null;
      try { //try to get the modid from mod.manifest
        modName = XML.getElementsByTagName("modid")[0].childNodes[0].nodeValue;
        //log('info', `Mod Name: ${modName}`);
        MOD_FOLDER = modName;
      } catch (err) { //could not get modid. Try for name, then lowercease and replace whitespace with "_"
        modName = XML.getElementsByTagName("name")[0].childNodes[0].nodeValue;
        //log('info', `Mod Name: ${modName}`);
        const modNameLower = modName.toLowerCase();
        MOD_FOLDER = modNameLower.replace(/ /gi, '_');
      }
      //log('info', `Mod Folder: ${MOD_FOLDER}`);
    } catch (err) { //mod.manifest could not be read. Try to overwrite with a clean one.
      log('error', `Could not read mod.manifest for mod ${MOD_NAME}. Overwriting with a clean one.`);
      const rootPathLower = path.basename(rootPath).toLowerCase();
      MOD_FOLDER = rootPathLower.replace(/ /gi, '_');
      if (MOD_FOLDER === '.') { // If mod did not have a top level folder, make one from the mod name
        const modNameLower = MOD_NAME.toLowerCase();
        const modNameLower2 = modNameLower.replace(/ /gi, '_');
        MOD_FOLDER = modNameLower2.replace(/[\-]*[\d]*[\.]*(installing)*(zip)*(rar)*(7z)*( )*/gi, '');
      }
      try { //write the mod.manifest file
        const MODMANIFEST_CONTENT = (`<?xml version="1.0" encoding="utf-8"?>\n`
                                    + `<kcd_mod>\n`
                                    + `  <info>\n`
                                    + `    <name>${MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '')}</name>\n`
                                    + `    <modid>${MOD_FOLDER}</modid>\n`
                                    + `  </info>\n`                                                                             
                                    + `</kcd_mod>`
        );
        const MODMANIFEST_PATH = path.join(fileName, rootPath, 'mod.manifest');
        fs.writeFileSync(
          MODMANIFEST_PATH,
          `${MODMANIFEST_CONTENT}`,
          { encoding: "utf8" },
        );
        //files.push(path.join(rootPath, 'mod.manifest'));
      } catch (err) {
        log('error', `Could not create a clean mod.manifest for mod ${MOD_NAME}`);
      }
    }
  }
  else if (modFile2 !== undefined) { //Archive contains valid mod folder, but no mod.manifest
    idx = modFile2.indexOf(`${path.basename(modFile2)}\\`);
    rootPath = path.dirname(modFile2);
    const rootPathLower = path.basename(rootPath).toLowerCase();
    MOD_FOLDER = rootPathLower.replace(/ /gi, '_');
    if (MOD_FOLDER === '.') {
      const modNameLower = MOD_NAME.toLowerCase();
      const modNameLowerReplaced = modNameLower.replace(/ /gi, '_');
      MOD_FOLDER = modNameLowerReplaced.replace(/[\-]*[\d]*[\.]*(installing)*(zip)*(rar)*(7z)*( )*/gi, '');
    }
    try { //Generate basic mod.manifest with modid=MOD_FOLDER
      const MODMANIFEST_CONTENT = (`<?xml version="1.0" encoding="utf-8"?>\n`
                                  + `<kcd_mod>\n`
                                  + `  <info>\n`
                                  + `    <name>${MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '')}</name>\n`
                                  + `    <modid>${MOD_FOLDER}</modid>\n`
                                  + `  </info>\n`                                                                             
                                  + `</kcd_mod>`
      );
      const MODMANIFEST_PATH = path.join(fileName, rootPath, 'mod.manifest');
      fs.writeFileSync(
        MODMANIFEST_PATH,
        `${MODMANIFEST_CONTENT}`,
        { encoding: "utf8" },
      );
      files.push(path.join(rootPath, 'mod.manifest'));
    } catch (err) {
      log('error', `Could not create mod.manifest for mod ${MOD_NAME}`);
    }
  }
  else if (modFile3 !== undefined) { //Archive contains mod.cfg, but no mod.manifest
    idx = modFile3.indexOf(path.basename(modFile3));
    rootPath = path.dirname(modFile3);
    const rootPathLower = path.basename(rootPath).toLowerCase();
    MOD_FOLDER = rootPathLower.replace(/ /gi, '_');
    if (MOD_FOLDER === '.') {
      const modNameLower = MOD_NAME.toLowerCase();
      const modNameLowerReplaced = modNameLower.replace(/ /gi, '_');
      MOD_FOLDER = modNameLowerReplaced.replace(/[\-]*[\d]*[\.]*(installing)*(zip)*(rar)*(7z)*( )*/gi, '');
    }
    try { //Generate basic mod.manifest with modid=MOD_FOLDER
      const MODMANIFEST_CONTENT = (`<?xml version="1.0" encoding="utf-8"?>\n`
                                  + `<kcd_mod>\n`
                                  + `  <info>\n`
                                  + `    <name>${MOD_NAME.replace(/(\.installing)*(\.zip)*(\.rar)*(\.7z)*( )*/gi, '')}</name>\n`
                                  + `    <modid>${MOD_FOLDER}</modid>\n`
                                  + `  </info>\n`                                                                             
                                  + `</kcd_mod>`
      );
      const MODMANIFEST_PATH = path.join(fileName, rootPath, 'mod.manifest');
      fs.writeFileSync(
        MODMANIFEST_PATH,
        `${MODMANIFEST_CONTENT}`,
        { encoding: "utf8" },
      );
      files.push(path.join(rootPath, 'mod.manifest'));
    } catch (err) {
      log('error', `Could not create mod.manifest for mod ${MOD_NAME}`);
    }
  }
  const MOD_ATTRIBUTE = {
    type: 'attribute',
    key: 'modRootPath',
    value: path.basename(rootPath),
  };
  const MOD_ATTRIBUTE2 = { //this attribute is used to identify the mod name in serializeLoadOrder
    type: 'attribute',
    key: 'modFolderDerived',
    value: MOD_FOLDER,
  };
  const MOD_ATTRIBUTE3 = {
    type: 'attribute',
    key: 'modFileName',
    value: MOD_NAME,
  };
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
  instructions.push(MOD_ATTRIBUTE);
  instructions.push(MOD_ATTRIBUTE2);
  instructions.push(MOD_ATTRIBUTE3);
  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isFolder = files.some(file => ROOT_FOLDERS.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && ( isFolder );

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

//Installer install Root folder files
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
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

//Installer test for Root folder files
function testCfg(files, gameId) {
  const isCfg = files.find(file => path.extname(file).toLowerCase() === CFG_EXT) !== undefined;
  let supported = (gameId === spec.game.id) && ( isCfg );

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

//Installer install Root folder files
function installCfg(files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === CFG_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

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

//Test for Mod Loader mods
function testBinaries(files, gameId) {
  //const isDll = files.find(file => path.extname(file).toLowerCase() === DLL_EXT) !== undefined;
  //const isExe = files.find(file => path.extname(file).toLowerCase() === EXE_EXT) !== undefined;
  let supported = (gameId === spec.game.id);
  //let supported = (gameId === spec.game.id) && ( isDll || isExe );

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
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// LOAD ORDER FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////

const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

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
  let loadOrderPath = path.join(gameDir, LO_PATH);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );
  let modFolderPath = path.join(gameDir, MOD_PATH);

  //Get all mod folders from Mods folder (async version)
  let modFolders = [];
  try {
    modFolders = await fs.readdirAsync(modFolderPath);
    modFolders = modFolders.filter((folderName) => !IGNORED_EXTS.includes(path.extname(folderName)));
    modFolders.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return Promise.reject(new Error('Failed to read Mods folder'));
  }

  //Get all mod folders from Steam Workshop folder
  let modFoldersSteamWorkshop = [];
  let steamWorkshopIds = [];
  let SWFOLDER_FOUND = null;
  let STEAMWORKSHOP_PATH = null;
  if (GAME_VERSION === 'steam') { 
    try {
      const SPLIT_PATH = gameDir.split(path.sep);
      const SPLIT_PATH_LENGTH = SPLIT_PATH.length;
      const STEAM_INSTALL_PATH = SPLIT_PATH.slice(0, SPLIT_PATH_LENGTH - 2).join(path.sep);
      //const STEAM_INSTALL_PATH = gameDir.replace(/\/common\/KindgomComeDeliverance2/, '');
      STEAMWORKSHOP_PATH = path.join(STEAM_INSTALL_PATH, STEAMWORKSHOP_FOLDER);
    } catch (err) {
      log('error', `Could not modify Steam game path to set Steam Workshop mods folder: ${gameDir}`);
    }
  }
  if (GAME_VERSION === 'steam') { // Read Steam Workshop mod folders if on Steam game version
    try {
      modFoldersSteamWorkshop = await fs.readdirAsync(STEAMWORKSHOP_PATH);
      modFoldersSteamWorkshop.sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      //modFolders.push(modFoldersSteamWorkshop);
      SWFOLDER_FOUND = true;
    } catch (err) {
      SWFOLDER_FOUND = false;
      //context.api.showErrorNotification('Failed to read Steam Workshop mods folder.', err, { allowReport: false });
      const NOTIF_ID = `${GAME_ID}-steamworkshopfolder`;
      const MESSAGE = `Could not read Steam Workshop mods folder.`;
      context.api.sendNotification({
        id: NOTIF_ID,
        type: 'warning',
        message: MESSAGE,
        allowSuppress: true,
        actions: [
          {
            title: 'More',
            action: (dismiss) => {
              context.api.showDialog('question', MESSAGE, {
                text: `Vortex detected you are using the Steam version of the game, but could not read the Steam Workshop mods folder.\n`
                    + `Vortex looked for the Steam Workshop mods folder at:\n`
                    + `${STEAMWORKSHOP_PATH}\n`
                    + '\n'
                    + 'If you are NOT using any Steam Workshop mods, then no action is required.\n'
                    + '\n'
                    + 'If you ARE using Steam Workshop mods:.\n'
                    + 'You may need to move your Steam Library outside of the Program Files (x86) folder to fix this issue.\n'
              }, [
                { label: 'Acknowledge', action: () => dismiss() },
                {
                  label: 'Never Show Again', action: () => {
                    context.api.suppressNotification(NOTIF_ID);
                    dismiss();
                  }
                },
              ]);
            },
          },
        ],
      });
    }
  }

  //Make an array of all the modid's parsed from the Steam Workshop mods mod.manifest
  if (SWFOLDER_FOUND === true) {
    for (let folder of modFoldersSteamWorkshop) {
      let MOD_ID = null;
      let modManifest = null;
      let MOD_FOLDERS = [];
      let FOLDER_PATH = null;
      const MOD_ID_ERROR = 'steamworkshop-error-read-modmanifest'
      try { //Read mod.manifest file to get modid
        /*
        const RAW_MOD_FOLDERS = await fs.readdirAsync(path.join(STEAMWORKSHOP_PATH, folder)); //Raw read, with folders and files
        MOD_FOLDERS = RAW_MOD_FOLDERS.filter(item => fs.statSync(path.join(STEAMWORKSHOP_PATH, folder, item)).isDirectory()); //filter for only folders
        if (MOD_FOLDERS.length === 0) { //If no folders, mod.manifest is in root
          FOLDER_PATH = path.join(STEAMWORKSHOP_PATH, folder, 'mod.manifest');
        } else { //Folder found, read mod.manifest in first folder (should be the only folder)
          FOLDER_PATH = path.join(STEAMWORKSHOP_PATH, folder, MOD_FOLDERS[0], 'mod.manifest');
        }
        //*/
        FOLDER_PATH = path.join(STEAMWORKSHOP_PATH, folder, 'mod.manifest');
        modManifest = await fs.readFileAsync(FOLDER_PATH, 'utf8');
        const parser = new DOMParser();
        const XML = parser.parseFromString(modManifest, 'text/xml');
        try { //try to get the modid from mod.manifest
          MOD_ID = XML.getElementsByTagName("modid")[0].childNodes[0].nodeValue;
        } catch (err) { //could not get modid. Try for name, then lowercase and replace whitespace with "_"
          const MOD_NAME = XML.getElementsByTagName("name")[0].childNodes[0].nodeValue;
          const MOD_NAME_LOWER = MOD_NAME.toLowerCase();
          MOD_ID = MOD_NAME_LOWER.replace(/ /gi, '_');
        }
        log('info', `Steam Workshop mod.manfest read: #${folder} with ID ${MOD_ID}`);
        //steamWorkshopIds.push(MOD_ID);
      } catch (err) { //mod.manifest could not be read
        MOD_ID = MOD_ID_ERROR;
        //context.api.showErrorNotification(`Could read mod.manifest file for Steam Workshop mod #${folder}. Please report this error to the mod author.`, err, { allowReport: false });
        //log('error', `Could read mod.manifest for Steam Workshop mod ${folder}. Please report this error to the mod author.`);
        const NOTIF_ID = `${GAME_ID}-steamworkshoperror-${folder}`;
        const MESSAGE = `Corrupt mod.manifest file in Steam Workshop mod #${folder}. Report this error to the mod author.`;
        const URL = `https://steamcommunity.com/sharedfiles/filedetails/?id=${folder}`;
        context.api.sendNotification({
          id: NOTIF_ID,
          type: 'warning',
          message: MESSAGE,
          allowSuppress: true,
          actions: [
            {
              title: 'More',
              action: (dismiss) => {
                context.api.showDialog('question', MESSAGE, {
                  text: `Steam Workshop mod #${folder} contains a corrupt mod.manifest file. This file is required for all KCD2 mods.\n`
                      + 'This issue prevents the mod from being entered into the mod_order.txt file for load ordering, and thus prevents the game from loading the mod.\n'
                      + `Vortex tried to read the mod.manifest file at:\n`
                      + `${FOLDER_PATH}\n`
                      + '\n'
                      + 'Please report this error to the mod author.\n'
                      + `You can open the Steam Workshop mod page with the button below.\n`
                }, [
                  { label: 'Dismiss', action: () => dismiss() },
                  { label: 'Open Steam Workshop Page', action: () => {
                    util.opn(URL).catch(err => undefined);
                    dismiss();
                  }},
                  {
                    label: 'Never Show Again', action: () => {
                      context.api.suppressNotification(NOTIF_ID);
                      dismiss();
                    }
                  },
                ]);
              },
            },
          ],
        });
      }
      
      if ((!steamWorkshopIds.includes(MOD_ID) && (MOD_ID !== MOD_ID_ERROR))) {
        steamWorkshopIds.push(MOD_ID);
      }
    }
  }
  
  //Determine if mod is managed by Vortex (async version)
  const isVortexManaged = async (modId) => {
    return fs.statAsync(path.join(modFolderPath, modId, `__folder_managed_by_vortex`))
      .then(() => true)
      .catch(() => false)
  };

  // Get readable mod name using modFolderDerived attribute from mod installer
  async function getModName(folder) {
    const VORTEX = await isVortexManaged(folder);
    const WORKSHOP = steamWorkshopIds.includes(folder);
    if (WORKSHOP) { //check if mod is from Steam Workshop
      return ('Steam Workshop Mod');
    }
    if (!VORTEX) { //If not Steam Workshop, check if mod was not installed by Vortex
      return ('Manual Mod');
    }
    try {//Mod installed by Vortex, find mod where atrribute (from installer) matches folder in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['modFolderDerived'], '') === folder));
      if (modMatch) {
        return modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
      }
      return folder;
    } catch (err) {
      return folder;
    }
  }

  //* // Get mod image from metadata
  async function getModImage(folder) {
    const VORTEX = await isVortexManaged(folder);
    if (!VORTEX) {
      return path.join(__dirname, spec.game.logo);
    }
    try {//find mod where the folder name assigned in the installer attribute matches the folder name of the mod in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['modFolderDerived'], '') === folder));
      if (modMatch) {
        return modMatch.attributes.pictureUrl ?? path.join(__dirname, spec.game.logo);
      }
      return path.join(__dirname, spec.game.logo);
    } catch (err) {
      return path.join(__dirname, spec.game.logo);
    }
  }
  //*/

  //Set load order (async version)
  let loadOrder = await loadOrderFile.split("\n")
    .reduce(async (accumP, line) => {
      const accum = await accumP;
      const folder = line.replace(/#/g, '').trim();
      if ((!modFolders.includes(folder) && !steamWorkshopIds.includes(folder))) {
        return Promise.resolve(accum);
      }
      accum.push(
        {
          id: folder,
          name: `${await getModName(folder)} (${folder})`,
          modId: await isVortexManaged(folder) ? folder : undefined,
          enabled: !line.startsWith("#"),
          //imgUrl: await getModImage(folder);
        }
      );
      return Promise.resolve(accum);
    }, Promise.resolve([])
  );
  
  //push new mod folders from Mods folder to loadOrder
  for (let folder of modFolders) {
    if (!loadOrder.find((mod) => (mod.id === folder))) {
      loadOrder.push({
        id: folder,
        name: `${await getModName(folder)} (${folder})`,
        modId: await isVortexManaged(folder) ? folder : undefined,
        enabled: true,
        //imgUrl: await getModImage(folder)
      });
    }
  }

  //* push new modid's from Steam Workshop mods to loadOrder
  if (SWFOLDER_FOUND === true) {
    for (let MOD_ID of steamWorkshopIds) {
      if (!loadOrder.find((mod) => (mod.id === MOD_ID))) {
        loadOrder.push({
          id: MOD_ID,
          name: `${await getModName(MOD_ID)} (${MOD_ID})`,
          modId: undefined,
          enabled: true,
          //imgUrl: await getModImage(folder)
        });
      }
    }
  }
  //*/
  return loadOrder;
}

async function serializeLoadOrder(context, loadOrder) {
  //* don't write if all profiles are being updated
  if (mod_update_all_profile) {
    return;
  } //*/
  let gameDir = getDiscoveryPath(context.api);
  if (gameDir === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  let loadOrderPath = path.join(gameDir, LO_PATH);
  let loadOrderOutput = loadOrder
    .map((mod) => (mod.enabled ? mod.id : `#${mod.id}`))
    .join("\n");
  return fs.writeFileAsync(
    loadOrderPath,
    //`#File managed by Vortex\n${loadOrderOutput}`,
    `${loadOrderOutput}`,
    { encoding: "utf8" },
  );
}

// MAIN FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////

//Notify User of Setup instructions
function setupNotify(api) {
  const NOTIF_ID = `setup-notification-${GAME_ID}`;
  const MESSAGE = `Reinstall Mods for Load Order`;
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
            text: 'If you used the extension before v0.2.1, you will need to reinstall all your mods for the Load Order to work properly.\n'
                //+ 'You can do this by clicking "Reinstall All Mods" below.\n'
                + 'You can do this easily by selecting all mods in the mod list and clicking "Reinstall" in the blue bar at the buttom of the list.\n'
                + 'If you don\'t do this, your mods will most likley not be loaded by the game. You can verify mods are loading by looking at your kcd.log file in the game folder.\n'
                + 'This only needs to be done once. All subsequent mod installs and updates will work properly.\n'
          }, [
            /*
            {
              label: 'Reinstall All Mods', action: () => {
                try {
                  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', GAME_ID], {});
                  api.events.emit('uninstall-mods', GAME_ID, mods, (err) => {
                    if (err !== null) {
                      api.showErrorNotification('Failed to reinstall mods. Please do it manually.', err, { allowReport: false });
                    }
                  });
                  api.events.emit('install-mods', GAME_ID, mods, (err) => {
                    if (err !== null) {
                      api.showErrorNotification('Failed to reinstall mods. Please do it manually.', err, { allowReport: false });
                    }
                  });
                  api.suppressNotification(NOTIF_ID);
                  dismiss();
                } catch (err) {
                  api.showErrorNotification('Failed to reinstall mods. Please do it manually.', err, { allowReport: false });
                }
              }
            },
            //*/
            { label: 'Acknowledge', action: () => dismiss() },
            //*
            {
              label: 'Never Show Again', action: () => {
                api.suppressNotification(NOTIF_ID);
                dismiss();
              }
            },
            //*/
          ]);
        },
      },
    ],
  });    
}

//Setup function
async function setup(discovery, api, gameSpec) {
  GAME_PATH = discovery.path;
  EXECUTABLE = getExecutable;
  //setupNotify(api);
  if (LOAD_ORDER_ENABLED) {
    await fs.ensureFileAsync(path.join(discovery.path, LO_PATH));
  }
  return fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: getExecutable,
    supportedTools: [ //3rd party tools and launchers
      {
        id: `${GAME_ID}-devmodelaunch`,
        name: `KCD2 DevMode Launch`,
        logo: `exec.png`,
        executable: () => getExecutable(GAME_PATH),
        requiredFiles: [getExecutable(GAME_PATH)],
        detach: true,
        relative: true,
        exclusive: true,
        //shell: true,
        //defaultPrimary: true,
        parameters: ['-devmode +exec user.cfg']
      },
    ], //*/
  };
  context.registerGame(game);

  //register mod types recusively
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });
  //register mod types explicitly
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
  context.registerInstaller(MOD_ID, 25, testMod, installMod);
  context.registerInstaller(ROOT_ID, 30, testRoot, installRoot);
  context.registerInstaller(`${GAME_ID}-cfg`, 35, testCfg, installCfg);
  context.registerInstaller(BINARIES_ID, 40, testBinaries, installBinaries);

  //register buttons to open folders and logs
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Log - kcd.log', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, LOG_FILE);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open LO File - mod_order.txt', () => {
    const state = context.api.getState();
    const discovery = selectors.discoveryByGame(state, GAME_ID);
    const openPath = path.join(discovery.path, LO_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Settings - attributes.xml', () => {
    const state = context.api.getState();
    const openPath = path.join(CONFIG_PATH, CONFIG_FILE);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const state = context.api.getState();
    const openPath = path.join(CONFIG_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    const state = context.api.getState();
    const openPath = path.join(SAVE_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
}

//main function
function main(context) {
  applyGame(context, spec);
  if (LOAD_ORDER_ENABLED) {
    context.registerLoadOrder({
      gameId: GAME_ID,
      //gameArtURL: path.join(__dirname, spec.game.logo),
      validate: async () => Promise.resolve(undefined), // no validation implemented yet
      deserializeLoadOrder: async () => await deserializeLoadOrder(context),
      serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),  
      toggleableEntries: true,
      usageInstructions:`Drag and drop the mods on the left to change the order in which they load.   \n` 
                        +`${GAME_NAME} loads mods in the order you set from top to bottom.   \n`
                        +`De-select mods to prevent the game from loading them.   \n`
                        +`\n`,
    });
  }
  context.once(() => {
    //* put code here that should be run (once) when Vortex starts up
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
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
