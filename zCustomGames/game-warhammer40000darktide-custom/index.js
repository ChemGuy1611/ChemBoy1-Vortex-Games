const path = require("path");
const { fs, actions, util, selectors, log } = require("vortex-api");
const template = require("string-template");

const GAME_ID = "warhammer40kdarktide";
const STEAMAPP_ID = "1361210";
const MS_APPID = "FatsharkAB.Warhammer40000DarktideNew";
const MOD_FILE_EXT = ".mod";
const BAT_FILE_EXT = ".bat";
let GAME_PATH = null;
let mod_update_all_profile = false; // for mod update to keep them in the load order and not uncheck them
let updatemodid = undefined;
let updating_mod = false; // used to see if it's a mod update or not

//1792 is known to work, ???2048 fails to apply (no crash)??? up to 3096 does not crash, but might cause blurry textures???
const HEAP_SIZE = 2048;
const APPDATA = util.getVortexPath('appData');
const CONFIG_PATH = path.join(APPDATA, "Fatshark", "Darktide");
const CONFIG_FILE = path.join(CONFIG_PATH, "user_settings.config");
const LO_FILE = "mod_load_order.txt";
const MOD_FOLDER = "mods";
const DMF_FOLDER = "dmf";
const DML_FILE = "toggle_darktide_mods.bat";
const BINARIES_ID = 'darktide-binaries';
const BINARIES_NAME = 'Binaries';
const BINARIES_PATH = "binaries";
const ROOT_ID = 'darktide-root';
const ROOT_FOLDERS = ['mods', 'binaries', 'bundle', 'launcher'];
let DOWNLOAD_FOLDER = '';
let STAGING_FOLDER = '';

const tools = [
  {
    id: "ToggleMods",
    name: "Darktide Mod Patcher",
    shortName: "DML",
    logo: "dmf.png",
    executable: () => "tools/dtkit-patch.exe",
    requiredFiles: ["tools/dtkit-patch.exe"],
    relative: true,
    exclusive: true,
  },
  {
    id: "SL_EN_mod_load_order_file_maker",
    name: "SL_EN_mod_load_order_file_maker",
    executable: () => "SL_EN_mod_load_order_file_maker.bat",
    requiredFiles: ["SL_EN_mod_load_order_file_maker.bat"],
    relative: true,
    exclusive: true,
  },
  {
    id: "SL_RU_mod_load_order_file_maker",
    name: "SL_RU_mod_load_order_file_maker",
    executable: () => "SL_RU_mod_load_order_file_maker.bat",
    requiredFiles: ["SL_RU_mod_load_order_file_maker.bat"],
    relative: true,
    exclusive: true,
  },
];

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[GAME_ID]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
  });
}

const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}

function isDirectory(file) {
    return file.endsWith(path.sep);
}
function isFile(file) {
    return !file.endsWith(path.sep);
}

//Find game installation directory
function makeFindGame() {
  return () => util.GameStoreHelper.findByAppId([STEAMAPP_ID, MS_APPID])
    .then((game) => game.gamePath);
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
  } //*/
  /*
  if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

function testSupportedContent(files, gameId) {
  const isDml = files.some(file => ( 
    (path.extname(file).toLowerCase() === BAT_FILE_EXT) && 
    path.basename(file).toLowerCase().includes("toggle_darktide_mods")
  ));
  const isLofm = files.some(file => ( 
    (path.extname(file).toLowerCase() === BAT_FILE_EXT) && 
    path.basename(file).toLowerCase().includes("_mod_load_order_file_maker")
  ));
  let supported = (gameId === GAME_ID) && (isDml || isLofm);

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

function installContent(files) {
  const mod_load_order_file_maker = files.some(file => (
    path.extname(file).toLowerCase() === BAT_FILE_EXT &&
    path.basename(file).toLowerCase().includes("_mod_load_order_file_maker")
  ));

  if (mod_load_order_file_maker) {
    return install_mod_load_order_file_maker(files);
  }

  return root_game_install(files);
}

function root_game_install(files) {
  const filtered = files.filter(file => !file.endsWith(path.sep));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: file,
    };
  });
  return Promise.resolve({ instructions });
}

function install_mod_load_order_file_maker(files) {
  const mod_load_order_file_maker = files.find(
    (file) => path.extname(file).toLowerCase() === BAT_FILE_EXT,
  );
  const idx = mod_load_order_file_maker.indexOf(
    path.basename(mod_load_order_file_maker),
  );
  const rootPath = path.dirname(mod_load_order_file_maker);
  const filtered = files.filter(file => 
    file.indexOf(rootPath) !== -1 && 
    !file.endsWith(path.sep)
  );
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join("mods", file.substr(idx)),
    };
  });
  return Promise.resolve({ instructions });
}

//Installer test for mod files
function testMod(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === MOD_FILE_EXT));
  let supported = (gameId === GAME_ID) && isMod;

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

//Installer install mod files
function installMod(files) {
  const modFile = files.find(file => 
    (path.extname(file).toLowerCase() === MOD_FILE_EXT)
  );
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const modName = path.basename(modFile, MOD_FILE_EXT);
  const filtered = files.filter(
    (file) => file.indexOf(rootPath) !== -1 && 
    !file.endsWith(path.sep)
  );

  const MOD_ATTRIBUTE = {
    type: 'attribute',
    key: 'modName',
    value: modName,
  };

  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join("mods", modName, file.substr(idx)),
    };
  });
  instructions.push(MOD_ATTRIBUTE);
  return Promise.resolve({ instructions });
}

//Installer test for Root folder files
function testRoot(files, gameId) {
  const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === GAME_ID) && isMod;

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

//Installer install Root folder files
function installRoot(files) {
  let modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`;
  const idx = modFile.indexOf(ROOT_IDX);
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

//Test Fallback installer to Binaries folder
function testBinaries(files, gameId) {
  let supported = (gameId === GAME_ID);

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

function fallbackNotify(api, modName) {
  const NOTIF_ID = `${GAME_ID}-fallback-notify`;
  const MESSAGE = `Fallback install to "binaries" folder for mod:\n${modName}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'info',
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}

//Fallback installer to Binaries folder
function installBinaries(api, files, fileName) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };
  const modName = path.basename(fileName, '.installing');

  //* Do not resend the alert in case of updates
  if (!updating_mod) {
    fallbackNotify(api, modName);
  } //*/
  
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: file,
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// LOAD ORDER FUNCTIONS ///////////////////////////////////////////////////

async function deserializeLoadOrder(context) {
  // on mod update for all profile it would cause the mod if it was selected to be unselected
  if (mod_update_all_profile) {
    let allMods = Array("mod_update");

    return allMods.map((modId) => {
      return {
        id: "mod update in progress, please wait. Refresh when finished. \n To avoid this wait, only update current profile",
        modId: modId,
        enabled: false,
      };
    });
  }

  //read current LO file
  const gameDir = getDiscoveryPath(context.api);
  const mods = util.getSafe(context.api.store.getState(), ['persistent', 'mods', GAME_ID], {});
  const loadOrderPath = path.join(gameDir, "mods", LO_FILE);
  let loadOrderFile = await fs.readFileAsync(
    loadOrderPath, 
    { encoding: "utf8", }
  );

  //read and filter mod folders
  const ignoredFolders = ["dmf", "base"];
  const ignoredExtensions = [".txt", ".bat"];
  let modFolderPath = path.join(gameDir, MOD_FOLDER);
  async function isValidModFolder(folder) {
    return fs.statAsync(path.join(modFolderPath, folder, `${folder}.mod`))
      .then(() => true)
      .catch(() => false)
  };
  let modFoldersRaw = await fs.readdirAsync(modFolderPath);
  let modFolders = await modFoldersRaw
    .filter((folder) => !ignoredFolders.includes(folder) && !ignoredExtensions.includes(path.extname(folder)))
    //.filter((folder) => isDirectory(folder))
    .filter(async (folder) => { // Filter any files/folders out that don't contain ModName.mod
      await isValidModFolder(folder);
    })
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); // Ignore case when sorting

  /* This is the most reliable way I could find to detect if a mod is managed by Vortex
  async function isVortexManaged(modId) {
    try {
      fs.statAsync(path.join(modFolderPath, modId, `__folder_managed_by_vortex`));
      return true;
    } catch (e) {
      try {
        fs.statAsync(path.join(modFolderPath, modId, `${modId}.mod.vortex_backup`));
        return true;
      } catch (d) {
        return false;
      }
    }
  } //*/

  // Get readable mod name using modFolderDerived attribute from mod installer
  async function getModName(folder) {
    const VORTEX = await isVortexManaged(folder);
    if (!VORTEX) { //If not Steam Workshop, check if mod was not installed by Vortex
      return ('Manual Mod');
    }
    try {//Mod installed by Vortex, find mod where atrribute (from installer) matches folder in the load order
      const modMatch = Object.values(mods).find(mod => (util.getSafe(mods[mod.id]?.attributes, ['modName'], '') === folder));
      if (modMatch) {
        let name = modMatch.attributes.customFileName ?? modMatch.attributes.logicalFileName ?? modMatch.attributes.name;
        name = name.replace(/(.zip|.rar|.7z)/gi, '');
        if (name.includes('Mod List Dividers')) {
          return `____${folder}`;
        }
        return name;
      }
      return folder;
    } catch (err) {
      return folder;
    }
  }

  //Determine if mod is managed by Vortex (async version)
  async function isVortexManaged(modId) {
    return fs.statAsync(path.join(modFolderPath, modId, `__folder_managed_by_vortex`))
      .then(() => true)
      .catch(() => false)
  };

  //create load order array
  let loadOrder = await loadOrderFile.split("\n")
    .reduce(async (accumP, line) => {
      const accum = await accumP;
      const folder = line.replace(/-- /g, "").trim();
      if (!modFolders.includes(folder)) { //remove lines that don't have corresponding mods in the file system
        return Promise.resolve(accum);
      }
      accum.push(
        {
          id: folder,
          name: `${await getModName(folder)} (${folder})`,
          modId: await isVortexManaged(folder) ? folder : undefined,
          enabled: !line.startsWith("--"),
        }
      );
      return Promise.resolve(accum);
      }, Promise.resolve([])
    )

  //add new mods to load order
  for (let folder of modFolders) {
    if (!loadOrder.find((mod) => mod.id === folder)) {
      loadOrder.push({
        id: folder,
        name: `${await getModName(folder)} (${folder})`,
        modId: await isVortexManaged(folder) ? folder : undefined,
        enabled: true,
      });
    }
  }
  return loadOrder;
}

async function serializeLoadOrder(context, loadOrder) {
  if (mod_update_all_profile) {
    return;
  }

  const gameDir = getDiscoveryPath(context.api);
  const loadOrderPath = path.join(gameDir, MOD_FOLDER, LO_FILE);

  let loadOrderOutput = loadOrder
    .map((mod) => (mod.enabled ? mod.id : `-- ${mod.id}`))
    .join("\n");

  return fs.writeFileAsync(
    loadOrderPath,
    `-- File managed by Vortex mod manager\n${loadOrderOutput}`,
    { encoding: "utf8" },
  );
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

const is_darktide_profile_active = (api) => {
  const state = api.getState();
  const test = (selectors.activeGameId(state) === GAME_ID)
  return test;
};

function checkForDMF(api, mod_framework) {
  return fs.statAsync(mod_framework).catch(() => {
    api.sendNotification({
      id: "darktide-mod-framework-missing",
      type: "warning",
      title: "Darktide Mod Framework not installed",
      message: "Darktide Mod Framework is required to mod Darktide.",
      actions: [
        {
          title: "Get DMF",
          action: () =>
            util
              .opn("https://www.nexusmods.com/warhammer40kdarktide/mods/8")
              .catch(() => undefined),
        },
      ],
    });
  });
}

function checkForDML(api, toggle_mods_path) {
  return fs.statAsync(toggle_mods_path).catch(() => {
    api.sendNotification({
      id: "toggle_darktide_mods-missing",
      type: "warning",
      title: "Darktide Mod Loader not installed",
      message: "Darktide Mod Loader is required to mod Darktide.",
      actions: [
        {
          title: "Get DML",
          action: () =>
            util
              .opn("https://www.nexusmods.com/warhammer40kdarktide/mods/19")
              .catch(() => undefined),
        },
      ],
    });
  });
}

//setup function
async function setup(discovery, api) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH,  MOD_FOLDER)); // Ensure the mods directory exists
  await fs.ensureDirWritableAsync(CONFIG_PATH);
  await fs.ensureFileAsync(path.join(GAME_PATH, MOD_FOLDER, LO_FILE)); // Ensure the mod load order file exists
  await checkForDMF(api, path.join(GAME_PATH, MOD_FOLDER, DMF_FOLDER)); // Check if DMF is installed
  return checkForDML(api, path.join(GAME_PATH, DML_FILE)); // Check if DML is installed
}

function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: "Warhammer 40,000: Darktide",
    logo: "gameart.png",
    queryPath: makeFindGame,
    queryModPath: () => ".",
    supportedTools: tools,
    mergeMods: true,
    directoryCleaning: "tag",
    requiresCleanup: true,
    requiresLauncher: requiresLauncher,
    executable: () => "launcher/Launcher.exe",
    parameters: [`--lua-heap-mb-size ${HEAP_SIZE}`],
    requiredFiles: ["launcher/Launcher.exe", "binaries/Darktide.exe"],
    setup: async (discovery) => await setup(discovery, context.api),
    environment: {
      SteamAPPId: STEAMAPP_ID,
    },
    details: {
      steamAppId: +STEAMAPP_ID,
    },
  });

  context.registerLoadOrder({
    gameId: GAME_ID,
    validate: async () => Promise.resolve(undefined), // no validation implemented yet
    deserializeLoadOrder: async () => await deserializeLoadOrder(context),
    serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
    toggleableEntries: true,
  });

  //register mod types
  context.registerModType(BINARIES_ID, 25, (gameId) => {
    var _a;
    return (gameId === GAME_ID)
      && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, path.join("{gamePath}", BINARIES_PATH)), () => Promise.resolve(false), { name: BINARIES_NAME }
  ); //*/
  context.registerModType('darktide-config', 30, (gameId) => {
    var _a;
    return (gameId === GAME_ID)
      && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, CONFIG_PATH), () => Promise.resolve(false), { name: 'Config' }
  ); //*/

  //register installers
  context.registerInstaller( //covers DML and LOFM
    "warhammer40kdarktide-dmfdml",
    25,
    testSupportedContent,
    installContent,
  );
  context.registerInstaller( //regular mods
    "warhammer40kdarktide-mod",
    27,
    testMod,
    installMod,
  );
  context.registerInstaller( //root folders ("mods", "binaries", "bundle", "launcher")
    ROOT_ID,
    29,
    testRoot,
    installRoot,
  );
  context.registerInstaller( //fallback installer to Binaries folder (i.e. dll mods, Optiscaler)
    BINARIES_ID,
    31,
    testBinaries,
    (files, fileName) => installBinaries(context.api, files, fileName),
  );

  //register actions/////////////////////////////////////////////////
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open user_settings.config', () => {
    util.opn(CONFIG_FILE).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open settings_common.ini', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, "bundle", "application_settings", 'settings_common.ini');
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open win32_settings.ini', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, "bundle", "application_settings", 'win32_settings.ini');
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    util.opn(DOWNLOAD_FOLDER).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });

  context.once(() => {
    const api = context.api; //don't move from the top
    // Patch exe on deploy and reset mod update flags
    context.api.onAsync("did-deploy", (profileId) => {
      mod_update_all_profile = false; //reset all-profile flag on deploy
      updating_mod = false; //reset updating flag on deploy
      updatemodid = undefined; //reset updated modId on deploy
      GAME_PATH = getDiscoveryPath(api);
      if (is_darktide_profile_active(api) && GAME_PATH != null) {
        try {
          api.runExecutable(path.join(GAME_PATH, "tools", "dtkit-patch.exe"), ["--patch"], { shell: true, detached: true } )
        } catch (e) {}
      }
    });
    // Unpatch exe on purge
    context.api.events.on("will-purge", (profileId) => {
      GAME_PATH = getDiscoveryPath(api);
      if (is_darktide_profile_active(api) && GAME_PATH != null) {
        try {
          api.runExecutable(path.join(GAME_PATH, "tools", "dtkit-patch.exe"), ["--unpatch"], { shell: true, detached: true } )
        } catch (e) {}
      }
    });
    //detect mod update (to maintain LO position)
    context.api.events.on("mod-update", (gameId, modId, fileId) => {
      if (GAME_ID == gameId) {
        updatemodid = modId;
      }
    });
    //detect mod removal (to maintain LO position)
    context.api.events.on("remove-mod", (gameMode, modId) => {
      if (modId.includes("-" + updatemodid + "-")) {
        mod_update_all_profile = true;
      }
    });
    //detect mod installation (to maintain LO position)
    context.api.events.on("will-install-mod", (gameId, archiveId, modId) => {
      mod_install_name = modId.split("-")[0];
      if (GAME_ID == gameId && modId.includes("-" + updatemodid + "-")) {
        updating_mod = true;
      } else {
        updating_mod = false;
      }
    });
    if (is_darktide_profile_active(api)) {
      toolbar(api);
    }
    context.api.events.on("profile-did-change", () => {
      if (is_darktide_profile_active(api)) {
        toolbar(api);
      }
    });
  });

  return true;
}

async function toolbar(api) {
  const state = api.getState();
  if (
    !util.getSafe(
      state,
      ["settings", "interface", "tools", "addToolsToTitleBar"],
      false,
    )
  ) {
    api.sendNotification({
      id: "Darktide-enable-toolbar",
      type: "warning",
      message: "Enable toolbar for easy game patching",
      actions: [
        {
          title: "Enable Toolbar",
          action: () => {
            api.store.dispatch({
              type: "SET_ADD_TO_TITLEBAR",
              payload: { addToTitleBar: true },
            });
            api.dismissNotification("Darktide-enable-toolbar");
            api.sendNotification({
              id: "enabled toolbar",
              type: "success",
              message:
                "Activated the toolbar. At the top of your screen you now can patch the game",
              supress: true,
            });
          },
        },
      ],
    });
  }
}

module.exports = {
  default: main,
};
