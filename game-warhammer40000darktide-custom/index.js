const path = require("path");
const { fs, actions, util, selectors } = require("vortex-api");

// Nexus Mods domain for the game. e.g. nexusmods.com/warhammer40kdarktide
const GAME_ID = "warhammer40kdarktide";
// Steam app id
const STEAMAPP_ID = "1361210";
// Microsoft Store app id (gamepass)
const MS_APPID = "FatsharkAB.Warhammer40000DarktideNew";

//CUSTOM CODE//////////////////////////////////////////////////////////////////
const template = require("string-template");
const APPDATA = util.getVortexPath('appData');
const CONFIG_PATH = path.join(APPDATA, "Fatshark", "Darktide");
const CONFIG_FILE = path.join(CONFIG_PATH, "user_settings.config");
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
//END CUSTOM CODE/////////////////////////////////////////////////////////////

// for mod update to keep them in the load order and not uncheck them
let mod_update_all_profile = false;
let updatemodid = undefined;
// used to see if it's a mod update or not
let updating_mod = false;
// used to display the name of the currently installed mod
let mod_install_name = "";

let api = false; // useful where we can't access API
const state = () => api.getState(); //get the state from anywhere
const is_darktide_profile_active = () =>
  selectors.activeGameId(state()) === GAME_ID;

let warn_call = 0; // to avoid a notif not appearing due to having the same id
function log(message) {
  if (!api) {
    console.log("Darktide-log : api is not defined could not send notif");
    return;
  }
  api.sendNotification({
    id: "log-" + message + warn_call++,
    type: "warning",
    message: message,
    allowSuppress: true,
  });
} //*/

function api_warning(ID, message, supress) {
  if (!api) {
    console.log(
      "Darktide-" + ID + " : api is not defined could not send notif",
    );
    return;
  }
  api.sendNotification({
    id: "Darktide-" + ID + "-" + warn_call++,
    type: "warning",
    message: message,
    allowSuppress: supress === undefined || supress ? true : false,
  });
}

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

// Not sure if there is a more elegant way to get this for patching later
let GAME_PATH = null;

async function prepareForModding(discovery, api) {
  GAME_PATH = discovery.path;

  // Ensure the mods directory exists
  await fs.ensureDirWritableAsync(path.join(discovery.path, "mods"));

  // Ensure the mod load order file exists
  await fs.ensureFileAsync(
    path.join(discovery.path, "mods", "mod_load_order.txt"),
  );

  // Check if DMF is installed
  await checkForDMF(api, path.join(discovery.path, "mods", "dmf"));

  // Check if DML is installed
  await checkForDML(api, path.join(discovery.path, "toggle_darktide_mods.bat"));
}

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

const MOD_FILE_EXT = ".mod";
const BAT_FILE_EXT = ".bat";

function testSupportedContent(files, gameId) {
  let supported =
    gameId === GAME_ID &&
    files.find(
      (file) =>
        path.extname(file).toLowerCase() === MOD_FILE_EXT ||
        (path.extname(file).toLowerCase() === BAT_FILE_EXT &&
          file.includes("toggle_darktide_mods")) ||
        (path.extname(file).toLowerCase() === BAT_FILE_EXT &&
          file.includes("_mod_load_order_file_maker")),
    ) !== undefined;

  // Do not resend the alert in case of updates
  if (gameId === GAME_ID && !supported && !updating_mod) {
    api_warning(
      "Unsupported-Root-Install-" + mod_install_name,
      mod_install_name +
        " could not pass our support test, it'll be installed in the root directory",
    );
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

async function installContent(files) {
  const modFile = files.find(
    (file) => path.extname(file).toLowerCase() === MOD_FILE_EXT,
  );

  // other checks to see if it should be installed only in the /mods folder
  if (modFile && modFile.split("\\").length < 3) {
    return installMod(files);
  }

  const mod_load_order_file_maker = files.find(
    (file) =>
      path.extname(file).toLowerCase() === BAT_FILE_EXT &&
      file.includes("_mod_load_order_file_maker"),
  );

  if (mod_load_order_file_maker) {
    return install_mod_load_order_file_maker(files);
  }

  return root_game_install(files);
}

async function root_game_install(files) {
  // check for DML, we could add other mod here as well
  const supported_root = files.find(
    (file) =>
      path.extname(file).toLowerCase() === BAT_FILE_EXT &&
      file.includes("toggle_darktide_mods"),
  );

  // Do not resend the alert in case of updates
  if (!supported_root && !updating_mod) {
    api_warning(
      "Root-Install-" + mod_install_name,
      mod_install_name +
        " will be installed in the root directory of the game. If it's normal just ignore this warning",
    );
  }

  // you always need to filter and everything
  const rootPath = "";
  const filtered = files.filter(
    (file) => file.indexOf(rootPath) !== -1 && !file.endsWith(path.sep),
  );
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join("", file),
    };
  });
  return { instructions };
}

async function installMod(files) {
  const modFile = files.find(
    (file) => path.extname(file).toLowerCase() === MOD_FILE_EXT,
  );
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const modName = path.basename(modFile, MOD_FILE_EXT);
  const filtered = files.filter(
    (file) => file.indexOf(rootPath) !== -1 && !file.endsWith(path.sep),
  );
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join("mods", modName, file.substr(idx)),
    };
  });
  return { instructions };
}

async function install_mod_load_order_file_maker(files) {
  const mod_load_order_file_maker = files.find(
    (file) => path.extname(file).toLowerCase() === BAT_FILE_EXT,
  );
  const idx = mod_load_order_file_maker.indexOf(
    path.basename(mod_load_order_file_maker),
  );
  const rootPath = path.dirname(mod_load_order_file_maker);
  const filtered = files.filter(
    (file) => file.indexOf(rootPath) !== -1 && !file.endsWith(path.sep),
  );
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join("mods", file.substr(idx)),
    };
  });
  return { instructions };
}

async function queryGame() {
  let game = await util.GameStoreHelper.findByAppId([STEAMAPP_ID, MS_APPID]);
  return game;
}

async function queryPath() {
  let game = await queryGame();
  return game.gamePath;
}

async function requiresLauncher() {
  let game = await queryGame();

  if (game.gameStoreId === "steam") {
    return undefined;
  }

  if (game.gameStoreId === "xbox") {
    return {
      launcher: "xbox",
      addInfo: {
        appId: MS_APPID,
        // appExecName is the <Application id="" in the appxmanifest.xml file
        parameters: [{ appExecName: "launcher.launcher" }],
      },
    };
  }
}

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
    return;
  }

  let gameDir = await queryPath();

  let loadOrderPath = path.join(gameDir, "mods", "mod_load_order.txt");
  let loadOrderFile = await fs.readFileAsync(loadOrderPath, {
    encoding: "utf8",
  });

  let modFolderPath = path.join(gameDir, "mods");
  let modFolders = fs
    .readdirSync(modFolderPath)
    // Filter any files/folders out that don't contain ModName.mod
    .filter((fileName) => {
      try {
        fs.readFileSync(path.join(modFolderPath, fileName, `${fileName}.mod`));
        return true;
      } catch (e) {
        return false;
      }
    })
    // Ignore case when sorting
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  // This is the most reliable way I could find to detect if a mod is managed by Vortex
  function isVortexManaged(modId) {
    try {
      fs.readFileSync(
        path.join(modFolderPath, modId, `__folder_managed_by_vortex`),
      );
      return true;
    } catch (e) {
      try {
        fs.readFileSync(
          path.join(modFolderPath, modId, `${modId}.mod.vortex_backup`),
        );
        return true;
      } catch (d) {
        return false;
      }
    }
  }

  let loadOrder = loadOrderFile
    .split("\n")
    .map((line) => {
      const id = line.replace(/-- /g, "").trim();
      return {
        id,
        modId: isVortexManaged(id) ? id : undefined,
        enabled: !line.startsWith("--"),
      };
    })
    // Remove any mods from the mod_load_order that don't have corresponding mods in the file system
    .filter((mod) => modFolders.includes(mod.id))
    .filter((mod) => mod.id !== "dmf" && mod.id !== "base");

  for (let folder of modFolders) {
    if (folder !== "dmf" && folder !== "base") {
      if (!loadOrder.find((mod) => mod.id === folder)) {
        loadOrder.push({
          id: folder,
          modId: isVortexManaged(folder) ? folder : undefined,
          enabled: true,
        });
      }
    }
  }

  return loadOrder;
}

async function serializeLoadOrder(_context, loadOrder) {
  if (mod_update_all_profile) {
    return;
  }

  let gameDir = await queryPath();
  let loadOrderPath = path.join(gameDir, "mods", "mod_load_order.txt");

  let loadOrderOutput = loadOrder
    .map((mod) => (mod.enabled ? mod.id : `-- ${mod.id}`))
    .join("\n");

  return fs.writeFileAsync(
    loadOrderPath,
    `-- File managed by Vortex mod manager\n${loadOrderOutput}`,
    { encoding: "utf8" },
  );
}

async function toolbar() {
  if (
    !util.getSafe(
      state(),
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

function main(context) {
  context.registerInstaller(
    "warhammer40kdarktide-mod",
    25,
    testSupportedContent,
    installContent,
  );

  context.registerGame({
    id: GAME_ID,
    name: "Warhammer 40,000: Darktide",
    logo: "gameart.png",
    queryPath,
    queryModPath: () => ".",
    supportedTools: tools,
    mergeMods: true,
    directoryCleaning: "tag",
    requiresCleanup: true,
    requiresLauncher,
    executable: () => "launcher/Launcher.exe",
    /*parameters: [
      "--bundle-dir",
      "../bundle",
      "--ini",
      "settings",
      "--backend-auth-service-url",
      "https://bsp-auth-prod.atoma.cloud",
      "--backend-title-service-url",
      "https://bsp-td-prod.atoma.cloud",
    ], //*/
    requiredFiles: ["launcher/Launcher.exe", "binaries/Darktide.exe"],
    setup: async (discovery) => await prepareForModding(discovery, context.api),
    environment: {
      SteamAPPId: STEAMAPP_ID,
    },
    details: {
      steamAppId: STEAMAPP_ID,
    },
  });

  context.registerLoadOrder({
    gameId: GAME_ID,
    validate: async () => Promise.resolve(undefined), // no validation implemented yet
    deserializeLoadOrder: async () => await deserializeLoadOrder(context),
    serializeLoadOrder: async (loadOrder) =>
      await serializeLoadOrder(context, loadOrder),
    toggleableEntries: true,
  });

  //register mod types/////////////////////////////////////////////////
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
  context.registerModType('darktide-binaries', 25, (gameId) => {
    var _a;
    return (gameId === GAME_ID)
      && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, "{gamePath}\\binaries"), () => Promise.resolve(false), { name: 'Binaries' }
  );
  /*context.registerModType('darktide-config', 30, (gameId) => {
    var _a;
    return (gameId === GAME_ID)
      && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, CONFIG_PATH), () => Promise.resolve(false), { name: 'Config' }
  ); //*/
  /////////////////////////////////////////////////////////////////////

  // Didn't check if below events trigger on profiles for other games, so make sure it is for this

  context.once(() => {
    api = context.api; //don't move from the top
    if (is_darktide_profile_active()) {
      toolbar();
    }
    context.api.events.on("profile-did-change", () => {
      if (is_darktide_profile_active()) {
        toolbar();
      }
    });

    // Patch on deploy
    context.api.onAsync("did-deploy", (profileId) => {
      mod_update_all_profile = false;
      updating_mod = false;
      updatemodid = undefined;
      if (is_darktide_profile_active() && GAME_PATH != null) {
        try {
          api.runExecutable(path.join(GAME_PATH, "tools", "dtkit-patch.exe"), ["--patch"], { shell: true, detached: true } )
        } catch (e) {}
      }
    });
    // Unpatch on purge
    context.api.events.on("will-purge", (profileId) => {
      if (is_darktide_profile_active() && GAME_PATH != null) {
        try {
          api.runExecutable(path.join(GAME_PATH, "tools", "dtkit-patch.exe"), ["--unpatch"], { shell: true, detached: true } )
        } catch (e) {}
      }
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
    });
  });

  return true;
}

module.exports = {
  default: main,
};
