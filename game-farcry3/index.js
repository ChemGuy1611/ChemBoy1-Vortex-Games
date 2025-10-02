/*
Name: Far Cry 3 Vortex Extension
Author: ChemBoy1
Version: 0.1.2
Date: 07/31/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const Bluebird = require('bluebird');

//Specify all the information about the game
const STEAMAPP_ID = "220240";
const EPICAPP_ID = null;
const UPLAYAPP_ID = "46";
const GOGAPP_ID = "";
const XBOXAPP_ID = "";
const XBOXEXECNAME = "";
const GAME_ID = "farcry3";
const EXEC = "bin\\farcry3_d3d11.exe";
const BIN_ID = "farcry3-binaries";
const DATA_ID = "farcry3-data";
const MI_ID = "farcry3-modinstaller";
const LAA_ID = "farcry3-largeaddressaware";
const XML_ID = "farcry3-xml";
const MIMOD_ID = "farcry3-mimod";
const MIMODA3_ID = "farcry3-mimoda3";
const MI_FILE = "fcmodinstaller.exe";
const LAA_FILE = "large address aware.exe";
const ZIGGY_FILE = "readme - ziggy's mod.txt";
const BIN_FILE = ".dll";
const XML_FILE = "gamerprofile.xml";
const DATA_FILE = [".dat", ".fat"];
const MIMOD_FILE1 = ".a2";
const MIMOD_FILE2 = ".a3";
const MIMOD_FILE3 = ".bin";
const MIMOD_FILEXML = "info.xml";
const MIMOD_FILE = [".a2", ".a3", ".bin"];
const MIMOD_PATH = "FCModInstaller\\ModifiedFilesFC3";
const XML_PATH = "My Games\\Far Cry 3";
const MI_URL = "https://downloads.fcmodding.com/files/FCModInstaller.zip";
const DB_URL = "https://mods.farcry.info/fc3";
const LAA_URL = "https://www.techpowerup.com/forums/attachments/laa_2_0_4-zip.34392/";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": "Far Cry 3",
    "executable": EXEC,
    "logo": "farcry3.jpg",
    "mergeMods": true,
    "modPath": ".",
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC
    ],
    "details": {
      "steamAppId": STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      "epicAppId": EPICAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "uPlayAppId": UPLAYAPP_ID,
      "nexusPageId": GAME_ID
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      "EpicAPPId": EPICAPP_ID,
      "UPlayAPPId": UPLAYAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": BIN_ID,
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": "{gamePath}\\bin"
    },
    {
      "id": DATA_ID,
      "name": "Game Data",
      "priority": "high",
      "targetPath": "{gamePath}\\data_win32"
    },
    {
      "id": MI_ID,
      "name": "Mod Installer",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": LAA_ID,
      "name": "Large Address Aware App",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": MIMOD_ID,
      "name": "Mod Installer Mod",
      "priority": "high",
      "targetPath": `{gamePath}\\${MIMOD_PATH}`
    },
    {
      "id": MIMODA3_ID,
      "name": "Mod Installer .a3 Mod",
      "priority": "high",
      "targetPath": `{gamePath}\\${MIMOD_PATH}`
    },
    {
      "id": XML_ID,
      "name": "XML Settings Mod",
      "priority": "high",
      "targetPath": `{documents}\\${XML_PATH}`
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      //UPLAYAPP_ID,
      //EPICAPP_ID,
      //GOGAPP_ID,
      //XBOXAPP_ID
    ],
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: 'FC3ModInstaller',
    name: 'FC3 Mod Installer',
    logo: 'fc3modinstaller.png',
    executable: () => MI_FILE,
    requiredFiles: [
      MI_FILE,
    ],
    relative: true,
    exclusive: true,
  },
  {
    id: 'LargeAddressAware',
    name: 'Large Address Aware',
    logo: 'laa.png',
    executable: () => LAA_FILE,
    requiredFiles: [
      LAA_FILE,
    ],
    relative: true,
    exclusive: true,
  },
];

//set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with correct folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find the game installation folder
function makeFindGame(api, gameSpec) {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      `SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\${UPLAYAPP_ID}`,
        'InstallDir');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return () => Promise.resolve(instPath.value);
  } catch (err) {
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  }
}

//Set launcher requirements
function makeRequiresLauncher(api, gameSpec) {

  if (util.epicGamesLauncher.isGameInstalled(EPICAPP_ID)) {
    return () => Promise.resolve({
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    });
  }

  return undefined;
}

//Find game information by API utility
async function queryGame() {
  let game = await util.GameStoreHelper.findByAppId(spec.discovery.ids);
  return game;
}

//Find game install location 
async function queryPath() {
  let game = await queryGame();
  return game.gamePath;
}

//Set launcher requirements
async function requiresLauncher() {
  let game = await queryGame();

  if (game.gameStoreId === "steam") {
    return undefined;
  }

  if (game.gameStoreId === "gog") {
    return undefined;
  }

  if (game.gameStoreId === "epic") {
    return {
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    };
  }

  if (game.gameStoreId === "xbox") {
    return {
      launcher: "xbox",
      addInfo: {
        appId: XBOXAPP_ID,
        // appExecName is the <Application id="" in the appxmanifest.xml file
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    };
  }

  return undefined;
}

//Installer test for Mod Installer
function testModInstaller(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === MI_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Mod Installer
function installModInstaller(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === MI_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MI_ID };

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

//Installer Test for .a3 files
async function testMiModA3(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === MIMOD_FILEXML);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install .a3 files
async function installMiModA3(files, gameSpec, destinationPath) {
  const setModTypeInstruction = { type: 'setmodtype', value: MIMODA3_ID };

  //Repack .a3 files since Vortex forcibly extracts them as archives for some reason...
  const szip = new util.SevenZip();
  const archiveName = path.basename(destinationPath, '.installing') + MIMOD_FILE2;
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

//Installer Test for mod installer .a2 and .bin mod files
function testMiMod(files, gameId) {
  //const isMod = files.find(file => path.extname(file).toLowerCase() === MIMOD_FILE1 || MIMOD_FILE2 || MIMOD_FILE3) !== undefined;
  const isMod = files.find(file => MIMOD_FILE.includes(path.extname(file).toLowerCase())) !== undefined;
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install mod installer .a2 and .bin mod files
function installMiMod(files, gameSpec) {
  // The .a2 and .bin files are expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  //const modFile = files.find(file => path.extname(file).toLowerCase() === MIMOD_FILE1 || MIMOD_FILE2 || MIMOD_FILE3);
  const modFile = files.find(file => MIMOD_FILE.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MIMOD_ID };

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

//Installer test for Ziggy's Mod
function testZiggy(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === ZIGGY_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Ziggy's Mod
function installZiggy(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === ZIGGY_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);

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

  return Promise.resolve({ instructions });
}

//Installer Test for .dat and .fat files
function testData(files, gameId) {
  //const isMod = files.find(file => path.extname(file).toLowerCase() === DATA_FILE) !== undefined;
  const isMod = files.find(file => DATA_FILE.includes(path.extname(file).toLowerCase())) !== undefined;
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

//Installer install .dat and .fat files
function installData(files, gameSpec) {
  // The .dat and .fat files are expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  //const modFile = files.find(file => path.extname(file).toLowerCase() === DATA_FILE);
  const modFile = files.find(file => DATA_FILE.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATA_ID };

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

//Installer Test for .dll files
function testBin(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === BIN_FILE) !== undefined;
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

//Installer install .dll files
function installBin(files, gameSpec) {
  // The .dll files are expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === BIN_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BIN_ID };

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

//Installer test for xml settings file
function testXml(files, gameId) {
  const isMod = files.some(file => path.basename(file).toLocaleLowerCase() === XML_FILE);
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install xml settings file
function installXml(files) {
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === XML_FILE);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: XML_ID };

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

//Check if FC3 Mod Installer is installed
function isModInstallerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MI_ID);
}

//Function to auto-download FC3 Mod Installer
async function downloadModInstaller(discovery, api, gameSpec) {
  let modLoaderInstalled = isModInstallerInstalled(api, gameSpec);

  if (!modLoaderInstalled) {
    //notification indicating install process
    const NOTIF_ID = 'farcry3-modinstaller-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing FC3 Mod Installer',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'FC3 Mod Installer',
      };
      const URL = MI_URL;
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
        actions.setModType(gameSpec.game.id, modId, MI_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = MI_URL;
      api.showErrorNotification('Failed to download/install FC3 Mod Installer', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Check if Large Address Aware is installed
function isLaaInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === LAA_ID);
}

//Function to auto-download Large Address Aware
async function downloadLaa(discovery, api, gameSpec) {
  let modLoaderInstalled = isLaaInstalled(api, gameSpec);

  if (!modLoaderInstalled) {
    //notification indicating install process
    const NOTIF_ID = 'farcry3-laa-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing Large Address Aware',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'Large Address Aware',
      };
      const URL = LAA_URL;
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
        actions.setModType(gameSpec.game.id, modId, LAA_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = LAA_URL;
      api.showErrorNotification('Failed to download/install Large Address Aware', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Check if XML is installed
function isXmlInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === XML_ID);
}

//Function to auto-download REFramework from Nexus
async function downloadXml(discovery, api, gameSpec) {
  let modLoaderInstalled = isXmlInstalled(api, gameSpec);
  
  if (!modLoaderInstalled) {
    //notification indicating install process
    const NOTIF_ID = 'farcry3-xml-installing';
    api.sendNotification({
      id: NOTIF_ID,
      message: 'Installing GamerProfile.xml',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }

    const modPageId = 331;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled('No GamerProfile.xml main file found');
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'GamerProfile.xml Settings Vortex',
      };
      const nxmUrl = `nxm://${gameSpec.game.id}/mods/${modPageId}/files/${file.file_id}`;
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [nxmUrl], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, XML_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification('Failed to download/install GamerProfile.xml', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Notify User of Setup instructions for FC3 Mod Installer
function setupNotify(api) {
  api.sendNotification({
    id: 'setup-notification-farcry3',
    type: 'warning',
    message: 'FC3 Mod Installer Usage',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'This extension has automatically downloaded and installed the FC3 Mod Installer application. This can be used to install mods from the database site linked below.\n'
                + '\n'
                + 'After downloading a file there, drag and drop the zip or file downloaded into Vortex, where it will be placed in the correct folder.\n'
                + 'Next, run the FC3 Mod Installer using the tool in the Vortex Dashboard tab to launch the application and install the mod.\n'
                + '\n'
                + 'If you have already installed mods from Nexus previously, you may need to disable them in order to use FC3 Mod Installer as it expects unmodified game files.\n'
                + '\n'
                + 'It is also recommended you run the Large Address Aware application in the Dashboard tab and target the game executable to prevent issues with crashing on DX11.\n'
          }, [
            { label: 'Continue', action: () => dismiss() },
            { label: 'Get FC3 Mod Installer Mods', action: () => {
              util.opn(DB_URL).catch(err => undefined);
              dismiss();
          }},
          ]);
        },
      },
    ],
  });    
}

//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

//Setup function
async function setup(discovery, api, gameSpec) {
  setupNotify(api);
  await downloadModInstaller(discovery, api, gameSpec);
  await downloadXml(discovery, api, gameSpec);
  await downloadLaa(discovery, api, gameSpec);
  await fs.ensureDirWritableAsync(path.join(util.getVortexPath('documents'), XML_PATH));
  return fs.ensureDirWritableAsync(path.join(discovery.path, MIMOD_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    //queryPath,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    //requiresLauncher,
    //requiresLauncher: makeRequiresLauncher(context.api, gameSpec),
    requiresCleanup: true,
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
  context.registerInstaller('farcry3-modinstaller', 25, testModInstaller, installModInstaller);
  context.registerInstaller('farcry3-ziggy', 30, testZiggy, installZiggy);
  context.registerInstaller('farcry3-dat', 35, testData, installData);
  context.registerInstaller('farcry3-bin', 40, testBin, installBin);
  context.registerInstaller('farcry3-xml', 45, testXml, installXml);
  context.registerInstaller('farcry3-mimoda3', 50, toBlue(testMiModA3), toBlue(installMiModA3));
  //context.registerInstaller('farcry3-mimoda3', 50, testMiModA3, installMiModA3);
  context.registerInstaller('farcry3-mimod', 55, testMiMod, installMiMod);
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
