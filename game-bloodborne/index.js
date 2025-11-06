/*////////////////////////////////////////////////////
Name: Bloodborne Vortex Extension
Structure: Emulation Game
Author: ChemBoy1
Version: 0.2.5
Date: 2025-10-24
////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');

//Specify all the information about the game
const GAME_ID = "bloodborne";
const PS_ID = "CUSA03173";   // <--- CHANGE THIS IF YOU ARE USING A DIFFERENT VERSION OF THE GAME
const GAME_FILE = path.join(PS_ID, "eboot.bin");
const GAME_NAME = "Bloodborne";
const GAME_NAME_SHORT = "Bloodborne";
const MOD_PATH = "."; //Set default mod path

//Info for mod types and installers
const DVDROOTPS4_ID = `${GAME_ID}-dvdroot_ps4`;
const DVDROOTPS4_NAME = `Game Data (dvdroot_ps4)`;
const DVDROOTPS4_PATH = path.join(PS_ID, "dvdroot_ps4");
const DVDROOTPS4_FOLDERS = ["action", "chr", "event", "facegen", "map", "menu", "movie", "msg","mtd", "obj", "other", "param", "paramdef", "parts", "remo", "script", "sfx", "shader", "sound"];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Root Folder";

// Information for shadPS4 downloader and updater
const SHADPS4_ID = `${GAME_ID}-shadps4`;
const SHADPS4_NAME = "shadPS4";
const SHADPS4_EXEC = "shadps4.exe";
const SHADPS4_VERSION = '0.12.0';
const SHADPS4_URL = `https://github.com/shadps4-emu/shadPS4/releases/download/v.${SHADPS4_VERSION}/shadps4-win64-qt-${SHADPS4_VERSION}.zip`;
const SHADPS4_ARC_NAME = `shadps4-win64-qt-${SHADPS4_VERSION}.zip`;
const SHADPS4_URL_MAIN = `https://api.github.com/repos/shadps4-emu/shadPS4`;
const SHADPS4_FILE = 'shadPS4.exe'; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.

const SHADLAUNCHER_ID = `${GAME_ID}-shadps4qtlauncher`;
const SHADLAUNCHER_NAME = "shadPS4QtLauncher";
const SHADLAUNCHER_EXEC = "shadps4qtlauncher.exe";
const SHADLAUNCHER_VERSION = '2025-11-02-70ce5a7';
const SHADLAUNCHER_URL = `https://github.com/shadps4-emu/shadPS4/releases/download/v.${SHADLAUNCHER_VERSION}/shadPS4QtLauncher-win64-qt-${SHADLAUNCHER_VERSION}.zip`;
const SHADLAUNCHER_ARC_NAME = `shadPS4QtLauncher-win64-qt-${SHADLAUNCHER_VERSION}.zip`;
const SHADLAUNCHER_URL_MAIN = `https://api.github.com/repos/shadps4-emu/shadps4-qtlauncher`;
const SHADLAUNCHER_FILE = "shadPS4QtLauncher.exe"; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.

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
  { //QtLauncher
    archiveFileName: SHADLAUNCHER_ARC_NAME,
    modType: SHADLAUNCHER_ID,
    assemblyFileName: SHADLAUNCHER_FILE,
    userFacingName: SHADLAUNCHER_NAME,
    githubUrl: SHADLAUNCHER_URL_MAIN,
    findMod: (api) => findModByFile(api, SHADLAUNCHER_ID, SHADLAUNCHER_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, SHADLAUNCHER_ARC_NAME),
    fileArchivePattern: new RegExp(/^shadPS4QtLauncher-win64-qt-(\d+\.\d+\.\d+)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[1]),
  },
];

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Save";
const SAVE_PATH = path.join("user", "savedata", "1", PS_ID, "SPRJ0005");
const SAVE_FILE = "userdata0000";

const SMITHBOX_EXEC = "smithbox.exe";
const FLVER_EXEC = "flver_editor.exe";

const PARAMETERS = [GAME_FILE];

//Filled in from info above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": SHADPS4_EXEC,
    "parameters": PARAMETERS,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      GAME_FILE,
    ],
    "details": {},
    "environment": {}
  },
  "modTypes": [
    {
      "id": DVDROOTPS4_ID,
      "name": DVDROOTPS4_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${DVDROOTPS4_PATH}`
    },
    {
      "id": SAVE_ID,
      "name": SAVE_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${SAVE_PATH}`
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": `{gamePath}`
    },
    {
      "id": SHADPS4_ID,
      "name": SHADPS4_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
  ],
  "discovery": {
    "ids": [],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: "shadPS4",
    name: "shadPS4",
    logo: `shadps4.png`,
    executable: () => SHADPS4_EXEC,
    requiredFiles: [SHADPS4_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  }, //*/
  {
    id: `${GAME_ID}-shadps4qtlauncher`,
    name: "shadPS4QtLauncher",
    logo: `shadps4.png`,
    executable: () => SHADLAUNCHER_EXEC,
    requiredFiles: [SHADLAUNCHER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    //shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  },
  {
    id: "Smithbox",
    name: "Smithbox",
    logo: `smithbox.png`,
    executable: () => SMITHBOX_EXEC,
    requiredFiles: [SMITHBOX_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: []
  },
  {
    id: "FlverEditor",
    name: "Flver Editor",
    logo: `flver.png`,
    executable: () => FLVER_EXEC,
    requiredFiles: [FLVER_EXEC],
    detach: true,
    relative: true,
    exclusive: false,
    //shell: true,
    //parameters: []
  },
];

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
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

//Set launcher requirements
async function requiresLauncher() {
  return Promise.resolve(undefined);
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for ShadPS4 files
function testShadPs4(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === SHADPS4_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install ShadPS4 files
function installShadPs4(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === SHADPS4_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SHADPS4_ID };

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

//Installer test for Smithbox files
function testSmithbox(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === SMITHBOX_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Smithbox files
function installSmithbox(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === SMITHBOX_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  //const setModTypeInstruction = { type: 'setmodtype', value: SHADPS4_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join("Smithbox", file.substr(idx)),
    };
  });
  //instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for Flver Editor files
function testFlver(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === FLVER_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Flver Editor files
function installFlver(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === FLVER_EXEC));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  //const setModTypeInstruction = { type: 'setmodtype', value: SHADPS4_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join("Flver Editor", file.substr(idx)),
    };
  });
  //instructions.push(setModTypeInstruction);

  return Promise.resolve({ instructions });
}

//Installer test for game data files
function testDvdRootPs4(files, gameId) {
  const isMod = files.some(file => DVDROOTPS4_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install game data files
function installDvdRootPs4(files) {
  const modFile = files.find(file => DVDROOTPS4_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DVDROOTPS4_ID };

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

//Installer test for save files
function testSave(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === SAVE_FILE));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install save files
function installSave(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === SAVE_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

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

// GITHUB AUTOMATIC DOWNLOAD FUNCTIONS /////////////////////////////////////////////////

async function asyncForEachTestVersion(api, requirements) {
  for (let index = 0; index < requirements.length; index++) {
    await testRequirementVersion(api, requirements[index]);
  }
}

async function asyncForEachCheck(api, requirements) {
  let mod = [];
  for (let index = 0; index < requirements.length; index++) {
    mod[index] = await requirements[index].findMod(api);
  }
  let checker = mod.every((entry) => entry === true);
  return checker;
}

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await asyncForEachTestVersion(api, REQUIREMENTS);
    log('warn', 'Checked requirements versions');
  } catch (err) {
    log('warn', `failed to test requirements versions: ${err}`);
  }
}

async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
}

//* Old shadPS4 download method
async function isShadPS4Installed(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  const modIdCheck = Object.keys(mods).some(id => mods[id]?.type === SHADPS4_ID);
  const discovery = selectors.discoveryByGame(state, spec.game.id);
  let statCheck = false;
  try {
    fs.statSync(path.join(discovery.path, SHADPS4_EXEC));
    statCheck = true;
  } catch (err) {
    //do nothing
  }
  const TEST = ( modIdCheck || statCheck );
  return TEST;
}
//Function to auto-download shadPS4 from Github
async function downloadShadPS4(api, gameSpec) {
  let modLoaderInstalled = isShadPS4Installed(api, gameSpec);
  if (!modLoaderInstalled) {
    //notification indicating install process
    NOTIF_ID = 'bloodborne-shadps4-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing shadPS4',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: `shadPS4 v${SHADPS4_VERSION}`,
      };
      const URL = SHADPS4_URL;
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
        actions.setModType(gameSpec.game.id, modId, SHADPS4_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://github.com/shadps4-emu/shadPS4/releases`;
      api.showErrorNotification('Failed to download/install shadPS4', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions
function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup`;
  const MESSAGE = 'Bloodborne Game Files Required';
  api.sendNotification({
    id: 'setup-notification-bloodborne',
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: 'Neither the mod author nor Nexus Mods endorse piracy. You must own a legitimate copy of Bloodborne to use this extension.\n'
                + 'You must have the Bloodorne game (CUSA03173) files installed from your PS4 or a .pkg file for the extension to work.\n'
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
  setupNotify(api);
  //await downloadShadPS4(api, gameSpec);
  const requirementsInstalled = await checkForRequirements(api);
  if (!requirementsInstalled) {
    await download(api, REQUIREMENTS);
  }
  await fs.ensureDirWritableAsync(path.join(discovery.path, SAVE_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, DVDROOTPS4_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher,
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
  context.registerInstaller(`${GAME_ID}-shadps4`, 25, testShadPs4, installShadPs4);
  context.registerInstaller(`${GAME_ID}-smithbox`, 30, testSmithbox, installSmithbox);
  context.registerInstaller(`${GAME_ID}-flver`, 35, testFlver, installFlver);
  context.registerInstaller(`${GAME_ID}-dvdroot_ps4`, 40, testDvdRootPs4, installDvdRootPs4);
  context.registerInstaller(`${GAME_ID}-save`, 45, testSave, installSave);
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(context.api, gameId, mods, forced);
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
