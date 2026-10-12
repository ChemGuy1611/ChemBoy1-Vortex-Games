/*////////////////////////////////////////////////
Name: Dragon Age Inquisition Vortex Extension
Structure: 3rd-Party Mod Manager (Frosty)
Author: ChemBoy1
Version: 1.0.0
Date: 2026-10-12
/////////////////////////////////////////////////*/

//Import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, fs: vfs, util, selectors, log, VortexError } = require("vortex-api");
const path = require("path");
const template = require("string-template");
const winapi = require("winapi-bindings");

const EAAPP_ID = "";
const EPICAPP_ID = "verdi";
const STEAMAPP_ID = "1222690";
const GAME_ID = "dragonageinquisition";
const GAME_NAME = "Dragon Age: Inquisition";
const GAME_NAME_SHORT = "Dragon Age: Inquisition";
const EXEC = "DragonAgeInquisition.exe";
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Dragon_Age:_Inquisition";
const STEAMDB_URL = `https://steamdb.info/app/${STEAMAPP_ID}/`;
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/876"; //Nexus link to this extension. Used for links

//feature toggles
const hasArchives = false; //toggle for .archive file support
const needsKey = false; //toggle for encryption key logic
const allowSymlinks = false; // Frosty handles its own deployment; symlinks not typical
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const setupNotification = true; //enable to show the user a notification with special instructions (specify below)
const hasUserIdFolder = false; //true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID)
const debug = false; //toggle for debug mode

const FROSTY_FOLDER = "FrostyModManager";
const FROSTYMOD_FOLDER = "dragonageinquisition";

//definitions for mod types, installers, and tools
const ROOT_ID = `${GAME_ID}-binaries`;

const FROSTY_ID = `${GAME_ID}-frostymanager`;
const DAI_ID = `${GAME_ID}-daimanager`;

const DAIMOD_ID = `${GAME_ID}-daimod`;
const daiModFileExt = ".daimod";
const DAI_PATH = "DAIMod";

const FROSTYMOD_ID = `${GAME_ID}-frostymod`;
let FROSTYMOD_EXTS = [".fbmod", ".fbpack"];
if (hasArchives) FROSTYMOD_EXTS.push(".archive");
const FROSTYMOD_PATH = path.join("FrostyModManager", "Mods", FROSTYMOD_FOLDER);

const FROSTY_EXEC = "frostymodmanager.exe";
const DAI_EXEC = "daimodmanager.exe";

const DOCUMENTS = util.getVortexPath("documents");
const LOCALAPPDATA = util.getVortexPath("localAppData");
const CONFIG_ID = `${GAME_ID}-configsave`;
const CONFIG_PATH = path.join(DOCUMENTS, "BioWare", "Dragon Age Inquisition", "Save");
const SAVE_EXT = ".das";
const CONFIG_FILE = "ProfileOptions_profile";

const UPDATE_ID = `${GAME_ID}-update`;
const UPDATE_PATH = "Update";

const PLUGIN_ID = `${GAME_ID}-frostyplugin`;
const PLUGIN_PATH = path.join("FrostyModManager", "Plugins");
const PLUGIN_EXTS = [".dll"];

const KEY_ID = `${GAME_ID}-key`;
const KEY_NAME = "Key (FMM)";
const KEY_PATH = path.join(FROSTY_FOLDER);
const KEY_FILE = "XXX.key"; //not used: this game needs no key file, so needsKey stays false
const KEY_PAGE_NO = 0;
const KEY_FILE_NO = 0;

const MODDATA_FOLDER = "ModData";

const FROSTY_NAME = "Frosty Mod Manager";
const FROSTY_TOOL_ID = "FrostyModManager";
const FROSTY_CONFIG_FILE = "manager_config.json";
const FROSTY_CONFIG_PATH = path.join(LOCALAPPDATA, "Frosty", FROSTY_CONFIG_FILE);

const PATCH_ID = `${GAME_ID}-patch`; //!NOT registered as a modType since the plugin must be copied in as it is not in an archive
const PATCH_NAME = "DatapathFix Plugin";
const PATCH_PATH = PLUGIN_PATH;
const PATCH_FILE = "DatapathFixPlugin.dll";
const PATCH_URL = `https://github.com/Dyvinia/DatapathFixPlugin/releases/download/v1.7.1/DatapathFixPlugin.dll`;
const PATCH_URL_ERR = `https://github.com/Dyvinia/DatapathFixPlugin/releases`;
const PATCH_KEY = "GlobalOptions.DatapathFixEnabled";

let DOWNLOAD_FOLDER = "";
let STAGING_FOLDER = "";

//Specify all the information about the game
let GAME_PATH = ""; //Game installation path
let GAME_VERSION = ""; //Game version
let MODTYPE_FOLDERS = [DAI_PATH, UPDATE_PATH, PLUGIN_PATH, FROSTYMOD_PATH]; // Folders to ensure are writable on setup
const IGNORE_CONFLICTS = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];
const IGNORE_DEPLOY = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];
const spec = {
  game: {
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME_SHORT,
    executable: EXEC,
    logo: `${GAME_ID}.jpg`,
    mergeMods: true,
    modPath: ".",
    modPathIsRelative: true,
    requiredFiles: [EXEC],
    details: {
      steamAppId: +STEAMAPP_ID,
      epicAppId: EPICAPP_ID,
      //"EAAppId": EAAPP_ID,
      supportsSymlinks: allowSymlinks,
      ignoreConflicts: IGNORE_CONFLICTS,
      ignoreDeploy: IGNORE_DEPLOY,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
      EpicAPPId: EPICAPP_ID,
      //"EAAPPId": EAAPP_ID
    },
  },
  modTypes: [
    {
      id: ROOT_ID,
      name: "Binaries / Root Game Folder",
      priority: "high",
      targetPath: "{gamePath}",
    },
    {
      id: FROSTYMOD_ID,
      name: "Frosty Mod .fbmod",
      priority: "high",
      targetPath: path.join("{gamePath}", FROSTYMOD_PATH),
    },
    {
      id: DAIMOD_ID,
      name: "DAIMod .daimod",
      priority: "high",
      targetPath: path.join("{gamePath}", DAI_PATH),
    },
    /*{
      "id": CONFIG_ID,
      "name": "Config / Save File",
      "priority": "high",
      "targetPath": CONFIG_PATH
    }, //*/
    {
      id: PLUGIN_ID,
      name: "Frosty Plugin",
      priority: "high",
      targetPath: path.join("{gamePath}", PLUGIN_PATH),
    },
    {
      id: UPDATE_ID,
      name: "Update Folder",
      priority: "high",
      targetPath: path.join("{gamePath}", UPDATE_PATH),
    },
    {
      id: DAI_ID,
      name: "DAI Mod Manager",
      priority: "low",
      targetPath: "{gamePath}",
    },
    {
      id: FROSTY_ID,
      name: "Frosty Mod Manager",
      priority: "low",
      targetPath: "{gamePath}",
    },
  ],
  discovery: {
    ids: [
      STEAMAPP_ID,
      EPICAPP_ID,
      //EAAPP_ID
    ],
    names: [],
  },
};
if (needsKey) {
  spec.modTypes.push({
    id: KEY_ID,
    name: KEY_NAME,
    priority: "low",
    targetPath: path.join("{gamePath}", KEY_PATH),
  });
}

//3rd party tools and launchers
const tools = [
  ///*
  {
    id: "FrostyModManagerLaunch",
    name: "Launch Modded Game",
    logo: "exec.png",
    executable: () => FROSTY_EXEC,
    requiredFiles: [FROSTY_EXEC],
    relative: true,
    exclusive: true,
    parameters: ["-launch Default"],
    defaultPrimary: true,
  },
  //*/
  {
    id: "FrostyModManager",
    name: "Frosty Mod Manager",
    logo: "frosty.png",
    executable: () => FROSTY_EXEC,
    requiredFiles: [FROSTY_EXEC],
    relative: true,
    exclusive: true,
  },
  {
    id: "DAIModManager",
    name: "DAI Mod Manager",
    logo: "DAIMod.png",
    executable: () => DAI_EXEC,
    requiredFiles: [DAI_EXEC],
    relative: true,
    exclusive: true,
  },
];

//Set mod type priorities
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  } catch {
    return false;
  }
}

async function statCheckAsync(gamePath, file) {
  try {
    await fsp.stat(path.join(gamePath, file));
    return true;
  } catch {
    return false;
  }
}

async function getAllFiles(dirPath) {
  let results = [];
  try {
    const entries = await fsp.readdir(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fsp.stat(fullPath);
      if (stats.isDirectory()) {
        // Recursively get files from subdirectories
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else {
        // Add file to results
        results.push(fullPath);
      }
    }
  } catch (err) {
    log("warn", `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

const getDiscoveryPath = (api) => {
  //get the game's discovered path
  const state = api.getState();
  const discovery = state?.settings?.gameMode?.discovered?.[GAME_ID] ?? {};
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  return new Promise((resolve, reject) =>
    api.events.emit("purge-mods", true, (err) => (err ? reject(err) : resolve())),
  );
}

async function deploy(api) {
  return new Promise((resolve, reject) =>
    api.events.emit("deploy-mods", (err) => (err ? reject(err) : resolve())),
  );
}

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
    gamePath:
      (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0
        ? void 0
        : _a.path,
    documents: util.getVortexPath("documents"),
    localAppData: util.getVortexPath("localAppData"),
    appData: util.getVortexPath("appData"),
  });
}

//Find the game installation folder
function makeFindGame(api, gameSpec) {
  try {
    const instPath = winapi.RegGetValue(
      "HKEY_LOCAL_MACHINE",
      "SOFTWARE\\WOW6432Node\\BioWare\\Dragon Age Inquisition",
      "Install Dir",
    );
    if (!instPath) {
      throw new Error("empty registry key");
    }
    return () => Promise.resolve(instPath.value);
  } catch {
    return () =>
      util.GameStoreHelper.findByAppId(gameSpec.discovery.ids).then((game) => game.gamePath);
  }
}

//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () =>
    gameSpec.game.modPathIsRelative !== false
      ? gameSpec.game.modPath || "."
      : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Setup launcher requirements (Steam, Epic, GOG, GamePass, etc.). More parameters required for Epic and GamePass
async function requiresLauncher(gamePath, store) {
  if (store === "epic") {
    return Promise.resolve({
      launcher: "epic",
      addInfo: {
        appId: EPICAPP_ID,
      },
    });
  }
  return Promise.resolve(undefined);
}

//Check if mod injector is installed
function isFrostyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some((id) => mods[id]?.type === FROSTY_ID);
}

//Check if mod injector is installed
function isDAIInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some((id) => mods[id]?.type === DAI_ID);
}

//Function to auto-download Frosty Mod Manager
async function downloadFrosty(discovery, api, gameSpec) {
  let modLoaderInstalled = isFrostyInstalled(api, gameSpec);

  if (!modLoaderInstalled) {
    //notification indicating install process
    const NOTIF_ID = "dragonageinquisition-frosty-installing";
    api.sendNotification({
      id: NOTIF_ID,
      message: "Installing Frosty Mod Manager",
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });

    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: "Frosty Mod Manager",
      };
      const URL = `https://github.com/CadeEvs/FrostyToolsuite/releases/download/v1.0.6.3/FrostyModManager.zip`;
      const dlId = await new Promise((resolve, reject) =>
        api.events.emit(
          "start-download",
          [URL],
          dlInfo,
          undefined,
          (err, result) => (err ? reject(err) : resolve(result)),
          undefined,
          {
            allowInstall: false,
          },
        ),
      );
      const modId = await new Promise((resolve, reject) =>
        api.events.emit("start-install-download", dlId, { allowAutoEnable: false }, (err, result) =>
          err ? reject(err) : resolve(result),
        ),
      );
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, FROSTY_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
      //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://github.com/CadeEvs/FrostyToolsuite/releases/tag/v1.0.6.3`;
      api.showErrorNotification("Failed to download/install Frosty Mod Manager", err);
      try {
        window.api.shell.openUrl(errPage);
      } catch (openErr) {
        api.showErrorNotification("Failed to open the URL", openErr, { allowReport: false });
      }
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Function to auto-download DAI Mod Manager
async function downloadDAIMod(discovery, api, gameSpec) {
  let modLoaderInstalled = isDAIInstalled(api, gameSpec);

  if (!modLoaderInstalled) {
    //notification indicating install process
    const NOTIF_ID = "dragonageinquisition-dai-installing";
    api.sendNotification({
      id: NOTIF_ID,
      message: "Installing DAI Mod Manager",
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });

    try {
      //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: "DAI Mod Manager",
      };
      const URL = `https://www.dropbox.com/s/9mhd5ovig3bjoxs/ModManager%20(x64)%201.0.0.59.zip?e=1&dl=1`;
      const dlId = await new Promise((resolve, reject) =>
        api.events.emit(
          "start-download",
          [URL],
          dlInfo,
          undefined,
          (err, result) => (err ? reject(err) : resolve(result)),
          undefined,
          {
            allowInstall: false,
          },
        ),
      );
      const modId = await new Promise((resolve, reject) =>
        api.events.emit("start-install-download", dlId, { allowAutoEnable: false }, (err, result) =>
          err ? reject(err) : resolve(result),
        ),
      );
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, DAI_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
      //Show the user the download page if the download, install process fails
    } catch (err) {
      const errPage = `https://www.dropbox.com/s/9mhd5ovig3bjoxs/ModManager%20(x64)%201.0.0.59.zip?e=1&dl=0`;
      api.showErrorNotification("Failed to download/install DAI Mod Manager", err);
      try {
        window.api.shell.openUrl(errPage);
      } catch (openErr) {
        api.showErrorNotification("Failed to open the URL", openErr, { allowReport: false });
      }
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Check if Patch is installed
async function isPatchInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test = Object.keys(mods).some((id) => mods[id]?.type === PATCH_ID);
  if (!test) {
    try {
      await fsp.stat(path.join(GAME_PATH, PATCH_PATH, PATCH_FILE));
      test = true;
    } catch {
      test = false;
    }
  }
  return test;
}

// Download Patch from GitHub
async function downloadPatch(api, gameSpec, check = true) {
  GAME_PATH = getDiscoveryPath(api);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(api.getState(), GAME_ID);
  if (GAME_VERSION === "steam") {
    api.showErrorNotification(
      `${PATCH_NAME} is not needed for the Steam version of the game`,
      undefined,
      { allowReport: false },
    );
    return;
  }
  let isInstalled = await isPatchInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = PATCH_NAME;
    const MOD_TYPE = PATCH_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const GAME_DOMAIN = gameSpec.game.id;
    const URL = PATCH_URL;
    const URL_ERR = PATCH_URL_ERR;
    api.sendNotification({
      //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });
    try {
      const dlInfo = {
        //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      //*Only start-download with Promise
      return new Promise((resolve, reject) => {
        api.events.emit(
          "start-download",
          [URL],
          dlInfo,
          undefined,
          async (error, dlid) => {
            //callback function to check for errors and pass id to and call 'start-install-download' event
            if (error !== null && error.name !== "AlreadyDownloaded") {
              return reject(error);
            }
            try {
              //find the file in Download and copy it to the game folder
              api.sendNotification({
                //notification indicating copy process
                id: `${NOTIF_ID}-copy`,
                message: `Copying ${MOD_NAME} dll to game folder`,
                type: "activity",
                noDismiss: true,
                allowSuppress: false,
              });
              let files = await fsp.readdir(DOWNLOAD_FOLDER);
              files = files
                .filter((file) => path.basename(file).includes(path.basename(PATCH_FILE, "dll")))
                .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                .reverse();
              const copyFile = files[0];
              await fsp.stat(path.join(DOWNLOAD_FOLDER, copyFile));
              const source = path.join(DOWNLOAD_FOLDER, copyFile);
              const destination = path.join(GAME_PATH, PATCH_PATH, PATCH_FILE);
              await fsp.cp(source, destination, { recursive: true });
              api.dismissNotification(NOTIF_ID);
              api.dismissNotification(`${NOTIF_ID}-copy`);
              api.sendNotification({
                //notification copy success
                id: `${NOTIF_ID}-success`,
                message: `Successfully copied ${MOD_NAME} dll to game folder`,
                type: "success",
                noDismiss: false,
                allowSuppress: true,
              });
            } catch (err) {
              api.showErrorNotification(`Failed to download and copy ${MOD_NAME} dll`, err, {
                allowReport: false,
              });
              try {
                window.api.shell.openUrl(URL_ERR);
              } catch (openErr) {
                api.showErrorNotification("Failed to open the URL", openErr, {
                  allowReport: false,
                });
              }
              return reject(err);
            } finally {
              api.dismissNotification(NOTIF_ID);
              api.dismissNotification(`${NOTIF_ID}-copy`);
              return resolve();
            }
          },
          "never",
          { allowInstall: false },
        );
      });
    } catch (err) {
      //Show the user the download page if the download and copy process fails
      api.showErrorNotification(`Failed to download and copy ${MOD_NAME} dll`, err, {
        allowReport: false,
      });
      try {
        window.api.shell.openUrl(URL_ERR);
      } catch (openErr) {
        api.showErrorNotification("Failed to open the URL", openErr, { allowReport: false });
      }
      api.dismissNotification(NOTIF_ID);
      api.dismissNotification(`${NOTIF_ID}-copy`);
    }
  }
} //*/

//Check if key is installed
async function isKeyInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  let test = Object.keys(mods).some((id) => mods[id]?.type === KEY_ID);
  if (!test) {
    try {
      await fsp.stat(path.join(GAME_PATH, FROSTY_FOLDER, KEY_FILE));
      test = true;
    } catch {
      test = false;
    }
  }
  return test;
}

//* Function to auto-download Key from Nexus Mods
async function downloadKey(api, gameSpec, check = true) {
  let modLoaderInstalled = await isKeyInstalled(api, gameSpec);
  if (!modLoaderInstalled || !check) {
    const MOD_NAME = KEY_NAME;
    const MOD_TYPE = KEY_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = KEY_PAGE_NO;
    const FILE_ID = KEY_FILE_NO; //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = GAME_ID;
    api.sendNotification({
      //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) {
      //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try {
        //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter((file) => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))
          .reverse()[0];
        if (file === undefined) {
          throw new VortexError(`No ${MOD_NAME} main file found`, { kind: "process-canceled" });
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch {
        // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
        //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      const dlId = await new Promise((resolve, reject) =>
        api.events.emit(
          "start-download",
          [URL],
          dlInfo,
          undefined,
          (err, result) => (err ? reject(err) : resolve(result)),
          undefined,
          {
            allowInstall: false,
          },
        ),
      );
      const modId = await new Promise((resolve, reject) =>
        api.events.emit("start-install-download", dlId, { allowAutoEnable: false }, (err, result) =>
          err ? reject(err) : resolve(result),
        ),
      );
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE), // Set the mod type
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) {
      //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      try {
        window.api.shell.openUrl(errPage);
      } catch (openErr) {
        api.showErrorNotification("Failed to open the URL", openErr, { allowReport: false });
      }
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Notify User of Setup instructions for Mod Managers
function setupNotify(api) {
  api.sendNotification({
    id: "setup-notification-dragonageinquisition",
    type: "warning",
    message: "DAI Mod Manager Setup Required.",
    allowSuppress: true,
    actions: [
      {
        title: "More",
        action: (dismiss) => {
          api.showDialog(
            "question",
            "Action required",
            {
              text:
                "The DAI Mod Manager tool downloaded by this extension requires setup.\n" +
                'Please launch the tool and set the "Mod Path" to: "[RootGameFolder]\\DAIMod".\n' +
                "\n" +
                'You should also make a backup of the "[RootGameFolder]\\Updates\\Patch" folder before using the "Merge" button to merge mods into the game in case you need to revert.\n' +
                'After merging in DAI Mod Manger, you need to rename the "Updates\\Patch_ModManagerMerge" folder to just "Patch" (delete existing Patch folder).\n' +
                "\n" +
                "It is also highly recommended you watch the video linked below to understand how to install DAI Mods (.daimod files) together with Frosty Mods (.fbmod files).",
            },
            [
              { label: "Continue", action: () => dismiss() },
              {
                label: "Watch Instruction Video",
                action: () => {
                  try {
                    window.api.shell.openUrl("https://www.youtube.com/watch?v=TiXuixE8vr0");
                  } catch (err) {
                    api.showErrorNotification("Failed to open the URL", err, {
                      allowReport: false,
                    });
                  }
                  dismiss();
                },
              },
            ],
          );
        },
      },
    ],
  });
}

//Notify User about DatapathFix Plugin for Steam/Epic versions
function setupNotifyPatch(api, gameSpec) {
  const NOTIF_ID = `${GAME_ID}-setup-notify-patch`;
  const MESSAGE = "IMPORTANT: DatapathFix for Steam/Epic Versions";
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "Download DatapathFix",
        action: (dismiss) => {
          downloadPatch(api, gameSpec, true);
          dismiss();
        },
      },
      {
        title: "More",
        action: (dismiss) => {
          const replace = {
            game: gameSpec.game.shortName,
            bl: "[br][/br][br][/br]",
          };
          const t = api.translate;
          api.showDialog(
            "info",
            MESSAGE,
            {
              bbcode: t(
                "[br][/br]" +
                  `If you have the license for {{game}} from Steam or Epic, you need to use the ${PATCH_NAME}.{{bl}}` +
                  `You can download the plugin using the button below or within the folder icon on the Mods page toolbar.{{bl}}` +
                  `Once downloaded, start Frosty and go to Options > DatapathFix Options > set "Enabled" checkbox.{{bl}}` +
                  `Without this step, your mods will NOT load in the game on Steam and Epic versions.{{bl}}` +
                  `You can determine if you need the plugin by checking for a "accessed through Steam/Epic" message on the game's EA App page.{{bl}}` +
                  `[img]https://live.staticflickr.com/65535/55239690302_da1f8ec95b_z.jpg[/img]` +
                  "[br][/br]" +
                  `[img]https://live.staticflickr.com/65535/55239407657_9cb28562aa_n.jpg[/img]` +
                  "[br][/br]" +
                  `[img]https://live.staticflickr.com/65535/55240681830_e246926ca6.jpg[/img]` +
                  "[br][/br]",
                { replace },
              ),
            },
            [
              { label: "Continue", action: () => dismiss() },
              {
                label: "Download DatapathFix",
                action: () => {
                  downloadPatch(api, gameSpec, true);
                  dismiss();
                },
              },
              {
                label: "Never Show Again",
                action: () => {
                  api.suppressNotification(NOTIF_ID);
                  dismiss();
                },
              },
            ],
          );
        },
      },
    ],
  });
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Test for Frosty Manager files
function testFrosty(files, gameId) {
  const isFrosty = files.some((file) => path.basename(file).toLowerCase() === FROSTY_EXEC);
  let supported = gameId === spec.game.id && isFrosty;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install Frosty Manager files
function installFrosty(files) {
  // The .fbmod file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find((file) => path.basename(file).toLowerCase() === FROSTY_EXEC);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: FROSTY_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));

  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join("FrostyModManager", file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for Frosty Manager files
function testDAI(files, gameId) {
  // Make sure we're able to support this mod.
  const isDAI = files.some((file) => path.basename(file).toLowerCase() === DAI_EXEC);
  let supported = gameId === spec.game.id && isDAI;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install Frosty Manager files
function installDAI(files) {
  // The .fbmod file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find((file) => path.basename(file).toLowerCase() === DAI_EXEC);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: DAI_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));

  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for .daimod files
function testDaiMod(files, gameId) {
  // Make sure we're able to support this mod.
  const isMod =
    files.find((file) => path.extname(file).toLowerCase() === daiModFileExt) !== undefined;
  let supported = gameId === spec.game.id && isMod;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install .daimod files
function installDaiMod(files) {
  // The .daimod file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find((file) => path.extname(file).toLowerCase() === daiModFileExt);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: DAIMOD_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));

  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for config files
function testConfig(files, gameId) {
  // Make sure we're able to support this mod.
  const isConfig = files.some((file) => path.basename(file) === CONFIG_FILE);
  let supported = gameId === spec.game.id && isConfig;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install config files
function installConfig(files) {
  // The config file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find((file) => path.basename(file) === CONFIG_FILE);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: "setmodtype", value: CONFIG_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep));

  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for save files
function testSave(files, gameId) {
  // Make sure we're able to support this mod.
  const isSave = files.find((file) => path.extname(file).toLowerCase() === SAVE_EXT) !== undefined;
  let supported = gameId === spec.game.id && isSave;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install save files
function installSave(files) {
  // The save file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find((file) => path.extname(file).toLowerCase() === SAVE_EXT);
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: CONFIG_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));

  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for .fbmod files
function testFbmod(files, gameId) {
  const isMod = files.some((file) => FROSTYMOD_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = gameId === spec.game.id && isMod;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//install .fbmod/.archive mod files (variant handler)
async function installFbmod(api, files, workingDir) {
  const fileExt = FROSTYMOD_EXTS;
  const modFiles = files.filter((file) => fileExt.includes(path.extname(file).toLowerCase()));
  const modType = {
    type: "setmodtype",
    value: FROSTYMOD_ID,
  };
  const installFiles =
    modFiles.length > FROSTYMOD_EXTS.length
      ? await chooseFilesToInstall(api, modFiles, fileExt)
      : modFiles;
  let instructions = installFiles.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.basename(file),
    };
  });
  if (installFiles.some((file) => path.extname(file).toLowerCase() === ".fbpack")) {
    const file = path.basename(
      installFiles.find((file) => path.extname(file).toLowerCase() === ".fbpack"),
    );
    packInstructionsNotify(api, workingDir, file);
  }
  instructions.push(modType);
  return Promise.resolve({ instructions });
}

function packInstructionsNotify(api, modName, file) {
  GAME_PATH = getDiscoveryPath(api);
  log("warn", `.fbpack file: ${file}`);
  modName = path.basename(modName, ".installing");
  const id = modName.replace(/[^a-zA-Z0-9\s]*( )*/gi, "").slice(0, 20);
  const NOTIF_ID = `${GAME_ID}-${id}-fallback`;
  const MESSAGE = ".fbpack Import Required for " + modName;
  const t = api.translate;
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "More",
        action: (dismiss) => {
          api.showDialog(
            "question",
            MESSAGE,
            {
              bbcode: t(
                `The mod you just installed included a .fbpack file. This means you need to manually import the pack in Frosty Mod Manager.[br][/br][br][/br]` +
                  `Run Frosty with the button below, then select File -> Pack -> Import.[br][/br][br][/br]` +
                  `Then navigate to the file path shown below and select the file. Screenshot included below for reference.[br][/br][br][/br]` +
                  `Mod Name: ${modName}.[br][/br][br][/br]` +
                  `Path to .fbpack File: ${path.join(GAME_PATH, FROSTYMOD_PATH, file)}[br][/br][br][/br]` +
                  `[img]https://live.staticflickr.com/65535/55339069196_713ca00e3f.jpg[/img][br][/br][br][/br]`,
              ),
            },
            [
              { label: "Continue", action: () => dismiss() },
              {
                label: "Run Frosty",
                action: () => {
                  runFrosty(api);
                  dismiss();
                },
              },
            ],
          );
        },
      },
    ],
  });
}

//file selection dialog for .fbmod/.archive mods
async function chooseFilesToInstall(api, files, fileExt) {
  const t = api.translate;
  return api
    .showDialog(
      "question",
      t("Multiple {{ext}} files", { replace: { ext: fileExt } }),
      {
        text:
          t("The mod you are installing contains {{x}} {{ext}} files.", {
            replace: { x: files.length, ext: fileExt },
          }) +
          `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
        checkboxes: files.map((file) => {
          return {
            id: file,
            text: file,
            value: false,
          };
        }),
      },
      [{ label: "Cancel" }, { label: "Install Selected" }, { label: "Install All_plural" }],
    )
    .then((result) => {
      if (result.action === "Cancel")
        return Promise.reject(
          new VortexError("User cancelled.", { kind: "user-canceled", skipped: true }),
        );
      else {
        const installAll =
          result.action === "Install All" || result.action === "Install All_plural";
        const installFiles = installAll
          ? files
          : Object.keys(result.input)
              .filter((s) => result.input[s])
              .map((file) => files.find((f) => f === file));
        return installFiles;
      }
    });
}

//Test for FMM plugin files
function testPlugin(files, gameId) {
  const isMod = files.some((file) => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
  const isExe = files.some((file) => path.extname(file).toLowerCase() === ".exe");
  let supported = gameId === spec.game.id && isMod && !isExe;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install Frosty Manager files
function installPlugin(files) {
  const modFile = files.find((file) => PLUGIN_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: PLUGIN_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for key file
function testKey(files, gameId) {
  const isFrosty = files.some(
    (file) => path.basename(file).toLowerCase() === KEY_FILE.toLowerCase(),
  );
  let supported = gameId === spec.game.id && isFrosty;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install key file
function installKey(files) {
  const modFile = files.find(
    (file) => path.basename(file).toLowerCase() === KEY_FILE.toLowerCase(),
  );
  const idx = modFile.lastIndexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
  const setModTypeInstruction = { type: "setmodtype", value: KEY_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Fallback installer to root folder
function testFallback(files, gameId) {
  let supported = gameId === spec.game.id;

  // Test for a mod installer.
  if (
    supported &&
    files.find(
      (file) =>
        path.basename(file).toLowerCase() === "moduleconfig.xml" &&
        path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
  ) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Fallback installer to root folder
function installFallback(api, files, destinationPath) {
  fallbackInstallerNotify(api, destinationPath);
  const setModTypeInstruction = { type: "setmodtype", value: ROOT_ID };

  const filtered = files.filter((file) => !file.endsWith(path.sep));
  const instructions = filtered.map((file) => {
    return {
      type: "copy",
      source: file,
      destination: file,
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

function fallbackInstallerNotify(api, modName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, spec.game.id);
  modName = path.basename(modName, ".installing");
  const id = modName.replace(/[^a-zA-Z0-9\s]*( )*/gi, "").slice(0, 20);
  const NOTIF_ID = `${GAME_ID}-${id}-fallback`;
  const MESSAGE = "Fallback installer reached for " + modName;
  api.sendNotification({
    id: NOTIF_ID,
    type: "info",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "More",
        action: (dismiss) => {
          api.showDialog(
            "question",
            MESSAGE,
            {
              text:
                `The mod you just installed reached the fallback installer. This means Vortex could not determine where to place these mod files.\n` +
                `Please check the mod page description and review the files in the mod staging folder to determine if manual file manipulation is required.\n` +
                `\n` +
                `If you think that Vortex should be capable to install this mod to a specific folder, please contact the extension developer for support at the link below.\n` +
                `\n` +
                `Mod Name: ${modName}.\n` +
                `\n`,
            },
            [
              { label: "Continue", action: () => dismiss() },
              {
                label: "Contact Ext. Developer",
                action: () => {
                  try {
                    window.api.shell.openUrl(`${EXTENSION_URL}?tab=posts`);
                  } catch (err) {
                    api.showErrorNotification("Failed to open the URL", err, {
                      allowReport: false,
                    });
                  }
                  dismiss();
                },
              }, //*/
              //*
              {
                label: `Open Mod Page + Staging Folder`,
                action: () => {
                  try {
                    window.api.shell.openFile(path.join(STAGING_FOLDER, modName));
                  } catch (err) {
                    api.showErrorNotification("Failed to open the file or folder", err, {
                      allowReport: false,
                    });
                  }
                  const mods = api.store.getState()?.persistent?.mods?.[spec.game.id] ?? {};
                  const modMatch = Object.values(mods).find(
                    (mod) => mod.installationPath === modName,
                  );
                  log("warn", `Found ${modMatch?.id} for ${modName}`);
                  let PAGE = ``;
                  if (modMatch) {
                    const MOD_ID = modMatch.attributes.modId;
                    if (MOD_ID !== undefined) {
                      PAGE = `${MOD_ID}?tab=description`;
                    }
                  }
                  const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
                  try {
                    window.api.shell.openUrl(MOD_PAGE_URL);
                  } catch (err) {
                    api.showErrorNotification("Failed to open the URL", err, {
                      allowReport: false,
                    });
                  }
                  dismiss();
                },
              }, //*/
            ],
          );
        },
      },
    ],
  });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User to run Frosty after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = FROSTY_NAME;
  const MESSAGE = `Run ${MOD_NAME}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: "warning",
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: "Run Frosty",
        action: (dismiss) => {
          runFrosty(api);
          dismiss();
        },
      },
      {
        title: "More",
        action: (dismiss) => {
          api.showDialog(
            "question",
            MESSAGE,
            {
              text:
                `After installing new mods, you must run ${MOD_NAME} to install them to the game's data files.\n` +
                `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`,
            },
            [
              {
                label: "Run Frosty",
                action: () => {
                  runFrosty(api);
                  dismiss();
                },
              },
              { label: "Continue", action: () => dismiss() },
              {
                label: "Never Show Again",
                action: () => {
                  api.suppressNotification(NOTIF_ID);
                  dismiss();
                },
              },
            ],
          );
        },
      },
    ],
  });
}

function runFrosty(api) {
  const TOOL_ID = FROSTY_TOOL_ID;
  const TOOL_NAME = FROSTY_NAME;
  const state = api.store.getState();
  const tool = state?.settings?.gameMode?.discovered?.[GAME_ID]?.tools?.[TOOL_ID] ?? undefined;

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false }).catch((err) =>
        api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, {
          allowReport: ["EPERM", "EACCES", "ENOENT"].indexOf(err.code) !== -1,
        }),
      );
    } else {
      return api.showErrorNotification(
        `Failed to run ${TOOL_NAME}`,
        `Path to ${TOOL_NAME} executable could not be found. Ensure ${TOOL_NAME} is installed through Vortex.`,
      );
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, {
      allowReport: ["EPERM", "EACCES", "ENOENT"].indexOf(err.code) !== -1,
    });
  }
}

//Setup function
async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await vfs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(api.getState(), GAME_ID);
  STAGING_FOLDER = selectors.installPathForGame(api.getState(), GAME_ID);
  await downloadFrosty(discovery, api, gameSpec);
  await downloadDAIMod(discovery, api, gameSpec);
  if (needsKey) await downloadKey(api, gameSpec, true);
  if (setupNotification) {
    setupNotify(api);
    setupNotifyPatch(api, gameSpec);
  }
  //await fs.ensureDirWritableAsync(path.join(CONFIG_PATH));
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    supportedTools: tools,
  };
  context.registerGame(game);

  //register mod types
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(
      type.id,
      modTypePriority(type.priority) + idx,
      (gameId) => {
        var _a;
        return (
          gameId === gameSpec.game.id &&
          !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null ||
          _a === void 0
            ? void 0
            : _a.path)
        );
      },
      (game) => pathPattern(context.api, game, type.targetPath),
      () => Promise.resolve(false),
      { name: type.name },
    );
  });

  //register mod installers
  context.registerInstaller("dragonageinquisition-daimodmanager", 25, testDAI, installDAI);
  context.registerInstaller("dragonageinquisition-frostymodmanager", 30, testFrosty, installFrosty);
  context.registerInstaller("dragonageinquisition-fbmod", 35, testFbmod, (files, workingDir) =>
    installFbmod(context.api, files, workingDir),
  );
  context.registerInstaller(PLUGIN_ID, 38, testPlugin, installPlugin);
  if (needsKey) context.registerInstaller(KEY_ID, 40, testKey, installKey);
  context.registerInstaller("dragonageinquisition-daimod", 45, testDaiMod, installDaiMod);
  //context.registerInstaller('dragonageinquisition-config', 50, testConfig, installConfig);
  //context.registerInstaller('dragonageinquisition-save', 55, testSave, installSave);
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) =>
      installFallback(context.api, files, destinationPath),
    );
  }

  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    `Download ${PATCH_NAME}`,
    () => {
      downloadPatch(context.api, gameSpec, false);
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  ); //*/
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    `Remove ${PATCH_NAME}`,
    () => {
      removePatch(context.api);
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  ); //*/
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Delete ModData Folder",
    () => {
      deleteModData(context.api);
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  ); //*/
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    `Open Frosty ${FROSTY_CONFIG_FILE}`,
    () => {
      const openPath = FROSTY_CONFIG_PATH;
      try {
        window.api.shell.openFile(openPath);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the file or folder", err, {
          allowReport: false,
        });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  ); //*/
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    `Set ${PATCH_NAME} Enabled`,
    () => {
      togglePatch(context.api, true);
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  ); //*/
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    `Set ${PATCH_NAME} Disabled`,
    () => {
      togglePatch(context.api, false);
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  ); //*/
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Frosty Mods Folder",
    () => {
      const state = context.api.getState();
      const discovery = selectors.discoveryByGame(state, GAME_ID);
      const openPath = path.join(discovery.path, FROSTYMOD_PATH);
      try {
        window.api.shell.openFile(openPath);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the file or folder", err, {
          allowReport: false,
        });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Config/Save Folder",
    async () => {
      try {
        window.api.shell.openFile(CONFIG_PATH);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the file or folder", err, {
          allowReport: false,
        });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open PCGamingWiki Page",
    () => {
      try {
        window.api.shell.openUrl(PCGAMINGWIKI_URL);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open SteamDB Page",
    () => {
      try {
        window.api.shell.openUrl(STEAMDB_URL);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "View Changelog",
    () => {
      try {
        window.api.shell.openFile(path.join(__dirname, "CHANGELOG.md"));
      } catch (err) {
        context.api.showErrorNotification("Failed to open the file or folder", err, {
          allowReport: false,
        });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Submit Bug Report",
    () => {
      try {
        window.api.shell.openUrl(`${EXTENSION_URL}?tab=bugs`);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open Downloads Folder",
    () => {
      try {
        window.api.shell.openFile(DOWNLOAD_FOLDER);
      } catch (err) {
        context.api.showErrorNotification("Failed to open the file or folder", err, {
          allowReport: false,
        });
      }
    },
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    },
  );
}

//Main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    api.onAsync("did-deploy", async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(api);
    });
  });
  return true;
}

async function deleteModData(api) {
  const t = api.translate;
  let choices = [{ label: t("Continue") }, { label: t("Cancel") }];
  const result = await api.showDialog(
    "question",
    `Delete ModData Folder`,
    {
      text:
        `\n` +
        `Are you sure you want to delete the ModData folder?\n` +
        `\n` +
        `Frosty will rebuild the ModData folder on next launch.`,
    },
    choices,
  );
  if (result === undefined || result.action === "Cancel") {
    return;
  }
  GAME_PATH = getDiscoveryPath(api);
  const modDataPath = path.join(GAME_PATH, MODDATA_FOLDER);
  try {
    await fsp.rm(modDataPath, { recursive: true });
    api.sendNotification({
      id: `${GAME_ID}-deletemoddata`,
      type: "success",
      message: `Successfully Deleted ModData Folder`,
      allowSuppress: true,
      actions: [],
    });
  } catch (err) {
    api.showErrorNotification("Failed to delete ModData folder", err, { allowReport: false });
  }
}

async function removePatch(api) {
  const t = api.translate;
  let choices = [{ label: t("Continue") }, { label: t("Cancel") }];
  const result = await api.showDialog(
    "question",
    `Remove ${PATCH_NAME}`,
    {
      text: `\n` + `Are you sure you want to remove the ${PATCH_NAME}?\n` + `\n`,
    },
    choices,
  );
  if (result === undefined || result.action === "Cancel") {
    return;
  }
  GAME_PATH = getDiscoveryPath(api);
  const pluginPath = path.join(GAME_PATH, PATCH_PATH, PATCH_FILE);
  try {
    await vfs.unlinkAsync(pluginPath);
    api.sendNotification({
      id: `${GAME_ID}-removepatch`,
      type: "success",
      message: `Successfully Removed ${PATCH_NAME}`,
      allowSuppress: true,
      actions: [],
    });
  } catch (err) {
    api.showErrorNotification(`Failed to remove ${PATCH_NAME}`, err, { allowReport: false });
  }
}

async function togglePatch(api, toggle) {
  const filePath = FROSTY_CONFIG_PATH;
  let MESSAGE = `Successfully Enabled ${PATCH_NAME}`;
  let MESSAGE_ERR = `Failed to enable ${PATCH_NAME}`;
  if (!toggle) {
    MESSAGE = `Successfully Disabled ${PATCH_NAME}`;
    MESSAGE_ERR = `Failed to disable ${PATCH_NAME}`;
  }
  try {
    const data = await fsp.readFile(filePath, "utf8");
    const json = JSON.parse(data);
    json.GlobalOptions.DatapathFixEnabled = toggle;
    await fsp.writeFile(filePath, JSON.stringify(json, null, 2));
    api.sendNotification({
      id: `${GAME_ID}-togglepatch`,
      type: "success",
      message: MESSAGE,
      allowSuppress: true,
      actions: [],
    });
  } catch (err) {
    api.showErrorNotification(MESSAGE_ERR, err, { allowReport: false });
  }
}

//export to Vortex
module.exports = {
  default: main,
};
