/*
Name: State of Decay 2 Vortex Extension
Structure: UE4 (Local AppData)
Author: ChemBoy1
Version: 0.2.2
Date: 07/31/2024
*/

//Import libraries
const { actions, fs, util, selectors } = require('vortex-api');
const path = require('path');
const template = require('string-template');

//Specify all information about the game
const GAME_ID = "stateofdecay2";
const STEAMAPP_ID = "495420";
const EPICAPP_ID = "Snoek";
const GOGAPP_ID = "";
const XBOXAPP_ID = "Microsoft.Dayton";
const XBOXEXECNAME = "Shipping";
const EPIC_CODE_NAME = "StateOfDecay2";
const GAME_NAME = "State of Decay 2";
const GAME_NAME_SHORT = "State of Decay 2";
const EXEC = `StateOfDecay2.exe`;
const MANAGER_EXEC = "modintegrator.exe";

/*
  Unreal Engine Game Data
  - modsPath: this is where the mod files need to be installed, relative to the game install folder.
  - fileExt(optional): if for some reason the game uses something other than PAK files, add the extensions here.
  - loadOrder: do we want to show the load order tab?
*/
const XBOX_DATA_PATH = `Packages\\${XBOXAPP_ID}_8wekyb3d8bbwe\\LocalCache\\Local`;
const UNREALDATA = {
  absModsPath: path.join(process.env['LOCALAPPDATA'], EPIC_CODE_NAME, 'Saved', 'Paks'),
  //absModsPath: path.join(process.env['LOCALAPPDATA'], XBOX_DATA_PATH, 'Saved', 'Paks'), //XBOX Version
  fileExt: '.pak',
  loadOrder: true,
}

//This information will be filled in from the data above
//const COOKED_PATH = `${EPIC_CODE_NAME}\\Saved\\Cooked\\WindowsNoEditor\\${EPIC_CODE_NAME}`;
const COOKED_PATH = `${EPIC_CODE_NAME}\\Saved`;
const PAK_PATH = path.join(EPIC_CODE_NAME, "Saved", "Paks");
const CONFIG_PATH = path.join(EPIC_CODE_NAME, "Saved", "Config", "WindowsNoEditor");
const XBOX_COOKED_PATH = path.join(XBOX_DATA_PATH, COOKED_PATH);
const XBOX_PAK_PATH = path.join(XBOX_DATA_PATH, PAK_PATH);
const XBOX_CONFIG_PATH = path.join(XBOX_DATA_PATH, CONFIG_PATH);
const MANAGER_ID = `${GAME_ID}-modmanager`;
const COOKED_ID = `${GAME_ID}-cooked`;
const CONFIG_ID = `${GAME_ID}-config`;
const PAK_ID = `${GAME_ID}-pak`;
const ROOT_ID = `${GAME_ID}-root`;
const CONFIG_FILE1 = "engine.ini";
const CONFIG_FILE2 = "input.ini";
const CONFIG_EXT = ".ini";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    //"executable": XBOXEXECNAME, //XBOX executable
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": `{localAppData}\\${COOKED_PATH}`,
    //"modPath": `{localAppData}\\${XBOX_COOKED_PATH}`, //XBOX mod path
    "modPathIsRelative": false,
    "requiredFiles": [
      EXEC,
      //XBOXEXECNAME, //XBOX Version
    ],
    "details": {
      "unrealEngine": UNREALDATA,
      "epicAppId": EPICAPP_ID,
      "steamAppId": STEAMAPP_ID,
      //"gogAppId": GOGAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "nexusPageId": GAME_ID,
      "customOpenModsPath": UNREALDATA.absModsPath || UNREALDATA.modsPath
    },
    "compatible": {
      "unrealEngine": true
    },
    "environment": {
      "EpicAppId": EPICAPP_ID,
      "SteamAPPId": STEAMAPP_ID,
      //"GogAPPId": GOGAPP_ID,
      "XboxAPPId": XBOXAPP_ID,
    },
  },
  "modTypes": [
    {
      "id": CONFIG_ID,
      "name": "Config (LocalAppData)",
      "priority": "high",
      "targetPath": `{localAppData}\\${CONFIG_PATH}`
      //"targetPath": `{localAppData}\\${XBOX_CONFIG_PATH}` //XBOX Config path
    },
    {
      "id": PAK_ID,
      "name": "PAK Mods",
      "priority": "high",
      "targetPath": `{localAppData}\\${PAK_PATH}`
      //"targetPath": `{localAppData}\\${XBOX_PAK_PATH}` //XBOX Pak path
    },
    {
      "id": COOKED_ID,
      "name": "Cooked Mods",
      "priority": "high",
      "targetPath": `{localAppData}\\${COOKED_PATH}`
      //"targetPath": `{localAppData}\\${XBOX_COOKED_PATH}` //XBOX Cooked path
    },
    {
      "id": ROOT_ID,
      "name": "Root Game Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": MANAGER_ID,
      "name": "SoD2 Mod Manager",
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      EPICAPP_ID,
      //GOGAPP_ID,
      //XBOXAPP_ID
    ],
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: "SOD2ModManager",
    name: "SoD2 Mod Manager",
    logo: "manager.png",
    executable: () => MANAGER_EXEC,
    requiredFiles: [MANAGER_EXEC],
    detach: true,
    relative: true,
    exclusive: true,
  },
];

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Set mod path
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
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
}

//Check if mod injector is installed
function isModManagerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === MANAGER_ID);
}

//Function to auto-download Mod Loader
async function downloadModManager(api, gameSpec) {
  let modManagerInstalled = isModManagerInstalled(api, gameSpec);

  if (!modManagerInstalled) {
    //notification indicating install process
    const NOTIF_ID = "stateofdecay2-modmanager-installing";
    const MOD_NAME = "SoD2 Mod Manager";
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });

    //make sure user is logged into Nexus Mods account in Vortex
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }

    const modPageId = 96;
    try {
      //get the mod files information from Nexus
      const modFiles = await api.ext.nexusGetModFiles(gameSpec.game.id, modPageId);
      const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
      const file = modFiles
        .filter(file => file.category_id === 1)
        .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
      if (file === undefined) {
        throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
      }
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: MOD_NAME,
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
        actions.setModType(gameSpec.game.id, modId, MANAGER_ID), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${gameSpec.game.id}/mods/${modPageId}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  api.sendNotification({
    id: 'setup-notification-stateofdecay2',
    type: 'warning',
    message: 'SoD2 Mod Manger and Setup Instructions',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', 'Action required', {
            text: 'This extension has automatically downloaded and installed the SoD2 Mod Manager application.\n'
                + 'It is not required for you to use it, but it is helpful in resolving mod conflicts and seeing what each mod changes.\n'
                + 'If you make changes with the Mod Manager, note that you will need to re-deploy your mods in Vortex and accept the popups since Vortex did not manage those changes.\n'
                + '\n'
          }, [
            { label: 'Acknowledge', action: () => dismiss() },
          ]);
        },
      },
    ],
  });    
}

//Test for config files
function testConfig(files, gameId) {
  // Make sure we're able to support this mod
  const isConfig = files.some(file => path.basename(file).toLocaleLowerCase() === (CONFIG_FILE1 || CONFIG_FILE2));
  const isIni = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT) !== undefined;
  let supported = (gameId === spec.game.id) && isConfig && isIni;

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

//Install config files
function installConfig(files) {
  // The config files are expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === CONFIG_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

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

//Installer test for Mod Manager
function testModManager(files, gameId) {
  // Make sure we're able to support this mod.
  const isManager = files.some(file => path.basename(file).toLocaleLowerCase() === MANAGER_EXEC);
  let supported = (gameId === spec.game.id) && isManager

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

//Install Mod Manager files
function installModManager(files) {
  // The .fbmod file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.basename(file).toLocaleLowerCase() === MANAGER_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MANAGER_ID };

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

//Setup function
async function setup(discovery, api, gameSpec) {
  //await downloadModManager(api, gameSpec);
  //setupNotify(api);
  await fs.ensureDirWritableAsync(discovery.path);
  await fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], COOKED_PATH));
  await fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], CONFIG_PATH));
  return fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], PAK_PATH));
  //await fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], XBOX_COOKED_PATH)); //XBOX Version
  //await fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], XBOX_CONFIG_PATH)); //XBOX Version
  //return fs.ensureDirWritableAsync(path.join(process.env['LOCALAPPDATA'], XBOX_PAK_PATH)); //XBOX Version
}

//Pre-sort function
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
  const fileExt = (UNREALDATA.fileExt || '.pak').substr(1).toUpperCase();

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

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //require other extensions
  context.requireExtension('Unreal Engine Mod Installer');
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher,
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
  context.registerInstaller(`${GAME_ID}-modmanager`, 25, testModManager, installModManager);
  context.registerInstaller(`${GAME_ID}-config`, 35, testConfig, installConfig);
}

//Main function
function main(context) {
  applyGame(context, spec);

  if (UNREALDATA.loadOrder === true) {
    let previousLO;
    context.registerLoadOrderPage({
      gameId: spec.game.id,
      gameArtURL: path.join(__dirname, spec.game.logo),
      preSort: (items, direction) => preSort(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === 'ue4-sortable-modtype'),
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
  }

  context.once(() => {
    // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
