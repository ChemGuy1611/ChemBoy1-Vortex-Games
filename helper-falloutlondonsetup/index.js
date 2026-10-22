/*//////////////////////////////////////////////////
Name: FOLON Setup Helper Extension
Structure: Utility Extension (game helper)
Author: ChemBoy1
Version: 0.2.0
Date: 2026-10-21
//////////////////////////////////////////////////*/

//Import libraries
const fs = require("fs");
const fsp = fs.promises;
const { actions, util, selectors, log } = require("vortex-api");
const path = require("path");
const winapi = require("winapi-bindings");
const { default: IniParser, WinapiFormat } = require("vortex-parse-ini");

//Specify all information about the game
const GAME_NAME = "Fallout: London";
const EXTENSION_NAME = "FOLON Setup Helper";
const EXTENSION_ID = "falloutlondonsetup";
const GAME_ID = "fallout4";
const NEXUS_ID = "falloutlondon";
const GOGAPP_ID = "1491728574";
const GOGAPP_ID_ONECLICK = "1897848199";
const DISCOVERY_IDS = [GOGAPP_ID, GOGAPP_ID_ONECLICK];
let STAGING_FOLDER = "";
let FOLON_STAGING_PATH = "";
let FOLON_INSTALL_PATH = "";
let GAME_PATH = "";
let PARTITION_CHECK = false;
const STAGINGFOLDER_NAME = "falloutlondon"; // The name of the mod folder in the FO4 staging folder
const FOLON_FILE = "LondonWorldSpace.esm"; // The main plugin file for FOLON
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/1349";

const PLUGIN1 = "LondonWorldSpace.esm";
const PLUGIN2 = "LondonWorldSpace-DLCBlock.esp";
const FOLON_PLUGINS = [PLUGIN1, PLUGIN2]; // Plugins to enable automatically when the falloutlondon mod is enabled
const MOD_ID = STAGINGFOLDER_NAME; // The mod ID for FOLON in Vortex (used to find mod for enabling and changing modtype)

const DOCUMENTS = util.getVortexPath("documents");
const INI_PATH = path.join(DOCUMENTS, "My Games", "Fallout4");
const INI_FILE_DEFAULT = "Fallout4.ini"; // The main INI file for FO4
const INI_FILE_CUSTOM = "Fallout4Custom.ini"; // Second (optional) INI file for FO4
const INI_PATH_DEFAULT = path.join(INI_PATH, INI_FILE_DEFAULT);
const INI_PATH_CUSTOM = path.join(INI_PATH, INI_FILE_CUSTOM);

const INI_ARCHIVE_OBJECT = {
  sResourceDataDirsFinal: "",
  sResourceIndexFileList:
    "Fallout4 - Textures1.ba2, Fallout4 - Textures2.ba2, Fallout4 - Textures3.ba2, Fallout4 - Textures4.ba2, Fallout4 - Textures5.ba2, Fallout4 - Textures6.ba2, Fallout4 - Textures7.ba2, Fallout4 - Textures8.ba2, Fallout4 - Textures9.ba2, LondonWorldSpace - Textures1.ba2, LondonWorldSpace - Textures2.ba2, LondonWorldSpace - Textures3.ba2, LondonWorldSpace - Textures4.ba2, LondonWorldSpace - Textures5.ba2, LondonWorldSpace - Textures6.ba2, LondonWorldSpace - Textures7.ba2, LondonWorldSpace - Textures8.ba2, LondonWorldSpace - Textures9.ba2, LondonWorldSpace - Textures10.ba2, LondonWorldSpace - Textures11.ba2, LondonWorldSpace - Textures12.ba2, LondonWorldSpace - Textures13.ba2, LondonWorldSpace - Textures14.ba2",
  sResourceStartUpArchiveList:
    "Fallout4 - Startup.ba2, Fallout4 - Shaders.ba2, Fallout4 - Interface.ba2, LondonWorldSpace - Interface.ba2",
  SResourceArchiveList:
    "Fallout4 - Voices.ba2, Fallout4 - Meshes.ba2, Fallout4 - MeshesExtra.ba2, Fallout4 - Misc.ba2, Fallout4 - Sounds.ba2, Fallout4 - Materials.ba2, LondonWorldSpace - Sounds.ba2, LondonWorldSpace - Misc.ba2, LondonWorldSpace - Materials.ba2, LondonWorldSpace - Voices.ba2, LondonWorldSpace - VoicesExtra.ba2, LondonWorldSpace - Meshes.ba2, LondonWorldSpace - MeshesExtra.ba2, LondonWorldSpace - MeshesLOD.ba2",
  SResourceArchiveList2: "Fallout4 - Animations.ba2, LondonWorldSpace - Animations.ba2",
  SGeometryPackageList: "Fallout4 - Geometry.csg, LondonWorldSpace - Geometry.csg",
  SCellResourceIndexFileList: "Fallout4.cdx, LondonWorldSpace.cdx",
  SResourceArchiveMemoryCacheList:
    "Fallout4 - Misc.ba2, Fallout4 - Shaders.ba2, Fallout4 - Interface.ba2, Fallout4 - Materials.ba2, LondonWorldSpace - Misc.ba2, LondonWorldSpace - Interface.ba2, LondonWorldSpace - Materials.ba2",
  bInvalidateOlderFiles: "1",
}; // [Archive] section in object format for the ini parser

const FOLON_ID = `${GAME_ID}-folon`;
const FOLON_NAME = "FOLON GOG Files";
const ROOT_FOLDER = "Data"; // The main data folder for FOLON (index for installer)

// MAIN FUNCTIONS ////////////////////////////////////////////////////////////////////////

//Find FOLON install directory (GOG)
async function findFolon(api) {
  try {
    const KEY = winapi.RegGetValue(
      "HKEY_LOCAL_MACHINE",
      "SOFTWARE\\WOW6432Node\\GOG.com\\Games\\" + GOGAPP_ID,
      "PATH",
    );
    if (KEY && KEY.value) {
      return Promise.resolve(KEY.value);
    }
  } catch {
    log("warn", `${EXTENSION_NAME} Failed to find FOLON GOG app ID ${GOGAPP_ID} in registry.`);
  }
  try {
    const KEY = winapi.RegGetValue(
      "HKEY_LOCAL_MACHINE",
      "SOFTWARE\\WOW6432Node\\GOG.com\\Games\\" + GOGAPP_ID_ONECLICK,
      "PATH",
    );
    if (KEY && KEY.value) {
      return Promise.resolve(KEY.value);
    }
  } catch {
    log(
      "warn",
      `${EXTENSION_NAME} Failed to find FOLON One-Click GOG app ID ${GOGAPP_ID_ONECLICK} in registry.`,
    );
  }
  return () => util.GameStoreHelper.findByAppId(DISCOVERY_IDS);
}

//Write the FOLON settings to the FO4 INI files
async function writeFolonIni(api) {
  try {
    //Fallout4.ini
    const parser = new IniParser(new WinapiFormat());
    fs.statSync(INI_PATH_DEFAULT); //make sure the file exists
    const contents = await parser.read(INI_PATH_DEFAULT);
    let TEST = false;
    let TEST_LINE = "";
    try {
      TEST_LINE = contents.data["Archive"]["sResourceIndexFileList"];
      //log('warn', `FOLON Fallout4.ini test line: "${TEST_LINE}"`);
    } catch {
      TEST_LINE = "";
    }
    TEST = TEST_LINE === INI_ARCHIVE_OBJECT.sResourceIndexFileList;
    if (!TEST) {
      contents.data["Archive"] = INI_ARCHIVE_OBJECT; // Set the Archive section to the new value
      await parser
        .write(INI_PATH_DEFAULT, contents) //write the INI file
        .then(() =>
          log("warn", `${EXTENSION_NAME} wrote FOLON INI settings to "${INI_FILE_DEFAULT}"`),
        )
        .then(() => iniSuccessNotifyDefault(api))
        .catch((err) =>
          api.showErrorNotification(
            `Error when writing FOLON INI settings to ${INI_FILE_DEFAULT}`,
            err,
            { allowReport: false },
          ),
        );
    }
  } catch (err) {
    api.showErrorNotification(
      `${EXTENSION_NAME} failed to write FOLON INI settings to ${INI_FILE_DEFAULT}`,
      err,
      { allowReport: false },
    );
  }

  try {
    //Fallout4Custom.ini (optional, only write if it exists)
    const parser = new IniParser(new WinapiFormat());
    fs.statSync(INI_PATH_CUSTOM); //dont need to write to it if it doesnt already exist
    const contents = await parser.read(INI_PATH_CUSTOM);
    let TEST = false;
    let TEST_LINE = "";
    try {
      TEST_LINE = contents.data["Archive"]["sResourceIndexFileList"];
      //log('warn', `FOLON Fallout4Custom.ini test line: "${TEST_LINE}"`);
    } catch {
      TEST_LINE = "";
    }
    TEST = TEST_LINE === INI_ARCHIVE_OBJECT.sResourceIndexFileList;
    if (!TEST) {
      contents.data["Archive"] = INI_ARCHIVE_OBJECT; // Set the Archive section to the new value
      await parser
        .write(INI_PATH_CUSTOM, contents) //write the INI file
        .then(() =>
          log("warn", `${EXTENSION_NAME} wrote FOLON INI settings to "${INI_FILE_CUSTOM}"`),
        )
        .then(() => iniSuccessNotifyCustom(api))
        .catch((err) =>
          log(
            "error",
            `${EXTENSION_NAME} - Error when writing FOLON INI settings to "${INI_FILE_CUSTOM}": ${err.message}`,
          ),
        );
    }
  } catch (err) {
    log(
      "warn",
      `Failed to write FOLON INI settings to ${INI_FILE_CUSTOM}. This likely means the file does not exist. Error: ${err.message}`,
    );
  }
}

//Create directory link for FOLON game files to FO4 staging folder
async function makeLink(api, src, dest, type) {
  type = type || "dir"; //default to directory link
  try {
    fs.statSync(dest); //check if linked staging folder already exists
    return; //exit if it does
  } catch {
    await fsp
      .symlink(src, dest, type) //make directory link
      .then(() =>
        log(
          "warn",
          `${EXTENSION_NAME} created directory link for FOLON GOG files directory from path "${src}" to path "${dest}"`,
        ),
      )
      .then(() => linkSuccessNotify(api)) //notify user of linking success
      .catch((err) =>
        api.showErrorNotification(
          `${EXTENSION_NAME} failed to create directory link for FOLON GOG files`,
          err,
          { allowReport: false },
        ),
      );
  }
}

//get FO4 game's discovered path
const getFallout4Path = (api) => {
  const state = api.getState();
  const discovery = state?.settings?.gameMode?.discovered?.[GAME_ID] ?? undefined;
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

//Check if FOLON files are installed by modType
function isFolonInstalled(api) {
  const state = api.getState();
  const mods = state.persistent.mods[GAME_ID] || {};
  return Object.keys(mods).some((id) => mods[id]?.type === FOLON_ID);
}

//Notification to change mod type for FOLON mod
function changeFolonModTypeNotify(api) {
  const NOTIF_ID = `${GAME_ID}-folonchangemodtype`;
  const MESSAGE = "REQUIRED: Complete FOLON Setup";
  try {
    fs.statSync(FOLON_STAGING_PATH); //check if the FOLON staging folder exists
    if (!isFolonInstalled(api)) {
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
                  text:
                    `The ${EXTENSION_NAME} Extension has successfully directory-linked the GOG FOLON files to the FO4 Vortex Mod Staging Folder.\n` +
                    `\n` +
                    `You must now complete the following steps while managing Fallout 4 in Vortex to complete setup:\n` +
                    `\n` +
                    `1. Change the Mod Type for the new "${STAGINGFOLDER_NAME}" mod to "${FOLON_NAME}". Double-click on the mod in the list to bring up the side panel and make the change in the "Mod Type" dropdown box.\n` +
                    `\n` +
                    `2. Enable the mod "${STAGINGFOLDER_NAME}" and deploy mods.\n` +
                    `\n` +
                    `3. If there are conflicts, falloutlondon should load after other mods (unless the mod is specifically for FOLON, in which case, load it after falloutlondon).\n` +
                    `\n` +
                    `4. Check that the plugins "${PLUGIN1}" and "${PLUGIN2}" are enabled in the Plugins tab (they are enabled automatically when you enable the mod).\n` +
                    `\n`,
                },
                [
                  {
                    label: "I Will Complete These Steps!",
                    action: () => {
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
  } catch {
    //do nothing
  }
}

//Success notifications
function linkSuccessNotify(api) {
  const NOTIF_ID = `${GAME_ID}-folonlinksuccess`;
  const MESSAGE = `${EXTENSION_NAME} successfully linked FOLON GOG game files to FO4 Vortex Staging Folder`;
  api.sendNotification({
    id: NOTIF_ID,
    type: "success",
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}
function iniSuccessNotifyDefault(api) {
  const NOTIF_ID = `${GAME_ID}-foloninisuccessdefault`;
  const MESSAGE = `${EXTENSION_NAME} successfully wrote FOLON "[Archive]" settings to "${INI_FILE_DEFAULT}"`;
  api.sendNotification({
    id: NOTIF_ID,
    type: "success",
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}
function iniSuccessNotifyCustom(api) {
  const NOTIF_ID = `${GAME_ID}-foloninisuccesscustom`;
  const MESSAGE = `${EXTENSION_NAME} successfully wrote FOLON "[Archive]" settings to "${INI_FILE_CUSTOM}"`;
  api.sendNotification({
    id: NOTIF_ID,
    type: "success",
    message: MESSAGE,
    allowSuppress: true,
    actions: [],
  });
}

//Mod Type test for FOLON files
async function isFolonModType(api, instructions, files) {
  //const setModTypeInstruction = { type: 'setmodtype', value: FOLON_ID };
  const isMod = files.some((file) => path.basename(file) === FOLON_FILE);
  if (isMod) {
    return true;
  }
  return false;
}

// Function to check if staging folder and game path are on same drive partition to enable modtypes + installers
async function checkPartitions(path1, path2, path3) {
  try {
    // Ensure all folders exist
    fs.mkdirSync(path1, { recursive: true });
    fs.mkdirSync(path2, { recursive: true });
    fs.mkdirSync(path3, { recursive: true });
    // Get the stats for all folders
    const stats1 = fs.statSync(path1);
    const stats2 = fs.statSync(path2);
    const stats3 = fs.statSync(path3);
    // Read device IDs and check if they are all the same
    const a = stats1.dev;
    const b = stats2.dev;
    const c = stats3.dev;
    const TEST = a === b && b === c;
    return TEST;
  } catch (err) {
    //log('error', `Error checking folder partitions: ${err}`);
    return false;
  }
}

// Add the falloutlondon mod to Vortex with the FOLON mod type and enable it.
// Vortex only picks up new staging folders on game activation (after its "Mods changed on disk" prompt),
// which runs before the link exists, so the helper adds the mod record itself.
function addFolonMod(api) {
  try {
    fs.statSync(FOLON_STAGING_PATH); //only add the mod if the linked staging folder exists
  } catch {
    return;
  }
  const state = api.getState();
  if (state?.persistent?.mods?.[GAME_ID]?.[MOD_ID] !== undefined) {
    setFolonModType(api);
    return;
  }
  const mod = {
    id: MOD_ID,
    type: FOLON_ID,
    installationPath: STAGINGFOLDER_NAME,
    state: "installed",
    attributes: {
      name: STAGINGFOLDER_NAME,
      installTime: new Date().toString(),
    },
  };
  try {
    api.store.dispatch(actions.addMod(GAME_ID, mod));
    log(
      "warn",
      `${EXTENSION_NAME} added "${STAGINGFOLDER_NAME}" mod with Mod Type "${FOLON_NAME}"`,
    );
    enableFolonMod(api);
  } catch (err) {
    api.showErrorNotification(
      `${EXTENSION_NAME} failed to automatically add "${STAGINGFOLDER_NAME}" mod.`,
      err,
      { allowReport: false },
    );
  }
}

// Set the FOLON mod type on the falloutlondon mod while it still has the default mod type.
// Vortex adds the folder with the default type if the user applies its "Mods changed on disk" prompt.
function setFolonModType(api) {
  const mod = api.getState()?.persistent?.mods?.[GAME_ID]?.[MOD_ID];
  if (mod === undefined || (mod.type ?? "") !== "") return;
  try {
    api.store.dispatch(actions.setModType(GAME_ID, MOD_ID, FOLON_ID));
    log("warn", `${EXTENSION_NAME} set Mod Type "${FOLON_NAME}" for "${STAGINGFOLDER_NAME}" mod`);
  } catch (err) {
    api.showErrorNotification(
      `${EXTENSION_NAME} failed to automatically change Mod Type for "${STAGINGFOLDER_NAME}" mod.`,
      err,
      { allowReport: false },
    );
  }
}

// Enable the falloutlondon mod in the last active FO4 profile (enabling it also enables the FOLON plugins)
function enableFolonMod(api) {
  const state = api.getState();
  const profileId = selectors.lastActiveProfileForGame(state, GAME_ID);
  if (profileId === undefined) return;
  if (state?.persistent?.profiles?.[profileId]?.modState?.[MOD_ID]?.enabled === true) return;
  try {
    api.store.dispatch(actions.setModEnabled(profileId, MOD_ID, true));
  } catch (err) {
    api.showErrorNotification(
      `${EXTENSION_NAME} failed to automatically enable "${STAGINGFOLDER_NAME}" mod.`,
      err,
      { allowReport: false },
    );
  }
}

// Watch for the falloutlondon mod record being added or replaced (for example by the "Mods changed on disk" prompt)
function onFolonModChange(api, prev, current) {
  const mod = current?.[MOD_ID];
  if (mod === undefined || mod === prev?.[MOD_ID]) return;
  setFolonModType(api);
  if (prev?.[MOD_ID] === undefined) {
    enableFolonMod(api);
  }
}

//Enable the FOLON plugins when the falloutlondon mod is enabled.
//Vortex only auto-enables plugins at the top level of a mod folder, and the FOLON plugins sit in "Data".
//"SET_PLUGIN_ENABLED" is the plugin management action type (redux-act keeps upper-case types verbatim).
//The plugin hive (state.loadOrder) belongs to the active profile, so other profiles are skipped.
function enableFolonPlugins(api, profileId, modId) {
  if (modId !== MOD_ID) return;
  const state = api.getState();
  const profile = selectors.activeProfile(state);
  if (profile?.id !== profileId || profile?.gameId !== GAME_ID) return;
  const loadOrder = state?.loadOrder ?? {};
  const batched = FOLON_PLUGINS.filter(
    (plugin) => loadOrder[plugin.toLowerCase()]?.enabled !== true,
  ).map((plugin) => ({
    type: "SET_PLUGIN_ENABLED",
    payload: { pluginName: plugin, enabled: true },
  }));
  if (batched.length === 0) return;
  try {
    util.batchDispatch(api.store, batched);
    log("info", `${EXTENSION_NAME} enabled FOLON plugins: ${FOLON_PLUGINS.join(", ")}`);
  } catch (err) {
    api.showErrorNotification(`${EXTENSION_NAME} failed to enable FOLON plugins.`, err, {
      allowReport: false,
    });
  }
}

//Setup function
async function setup(api, gameId) {
  if (gameId !== GAME_ID) return; //exit if FO4 is not being managed.
  const state = api.getState();
  // Find FO4 game path
  GAME_PATH = getFallout4Path(api);
  if (GAME_PATH === undefined) {
    log(
      "warn",
      `${EXTENSION_NAME} cannot find Fallout 4 game path. FOLON Helper Extension will exit setup.`,
    );
    return; //if FO4 game path is not found, exit setup
  }
  // Find FO4 staging folder
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  if (STAGING_FOLDER === undefined) {
    log(
      "warn",
      `${EXTENSION_NAME} cannot find FO4 Vortex Staging Folder. FOLON Helper Extension will exit setup.`,
    );
    return; //if FO4 Staging Folder path is not found, exit setup
  }
  FOLON_STAGING_PATH = path.join(STAGING_FOLDER, STAGINGFOLDER_NAME);
  // Find FOLON install path
  FOLON_INSTALL_PATH = await findFolon(api);
  if (FOLON_INSTALL_PATH === undefined) {
    log(
      "warn",
      `${EXTENSION_NAME} cannot find FOLON GOG Folder. FOLON Helper Extension will exit setup.`,
    );
    return; //if FOLON install path is not found, exit setup
  }
  // Check that all 3 folders are on same drive partition
  PARTITION_CHECK = await checkPartitions(FOLON_INSTALL_PATH, STAGING_FOLDER, GAME_PATH);
  if (PARTITION_CHECK !== true) {
    api.showErrorNotification(
      `${EXTENSION_NAME} - The FOLON GOG game folder, FO4 game folder, and Vortex FO4 Staging Folder are not on the same drive partition. Move all folders to same drive.`,
      { allowReport: false },
    );
    return; //if folders not on same partition, exit setup
  }
  //Make link, write INI files, and change falloutlondon modtype
  await makeLink(api, FOLON_INSTALL_PATH, FOLON_STAGING_PATH, "dir"); //create link for FOLON game files to staging folder
  addFolonMod(api); //add falloutlondon mod with FOLON mod type and enable it (or fix the mod type if it's already added)
  changeFolonModTypeNotify(api); //check if FOLON mod type is set and notify user to change it if it's not
  await writeFolonIni(api); //write "[Archive]" section to FO4 INI file(s)
}

//Main function
function main(context) {
  context.once(() => {
    // put code here that
    context.api.events.on("gamemode-activated", (gameId) => {
      try {
        setup(context.api, gameId);
      } catch (err) {
        context.api.showErrorNotification(`${EXTENSION_NAME} failed to complete setup.`, err, {
          allowReport: false,
        });
      }
    });
    context.api.events.on("mod-enabled", (profileId, modId) =>
      enableFolonPlugins(context.api, profileId, modId),
    );
    context.api.onStateChange(["persistent", "mods", GAME_ID], (prev, current) =>
      onFolonModChange(context.api, prev, current),
    );
  });

  context.registerModType(
    FOLON_ID,
    75,
    (gameId) => {
      var _a;
      return (
        gameId === GAME_ID &&
        !!((_a = context.api.getState().settings.gameMode.discovered[GAME_ID]) === null ||
        _a === void 0
          ? void 0
          : _a.path)
      );
    },
    () => getFallout4Path(context.api),
    () => Promise.resolve(false),
    //(instructions, files) => isFolonModType(context.api, instructions, files), //test - is installed mod of this type
    { name: FOLON_NAME },
  );

  context.registerAction(
    "mod-icons",
    300,
    "open-ext",
    {},
    "Open FOLON GOG Folder",
    () => {
      try {
        window.api.shell.openFile(FOLON_INSTALL_PATH);
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
    "Open FOLON Nexus Mods Page",
    () => {
      try {
        window.api.shell.openUrl(`https://www.nexusmods.com/${NEXUS_ID}/mods`);
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
    "Run FOLON Helper Setup",
    () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      try {
        setup(context.api, gameId);
      } catch (err) {
        context.api.showErrorNotification(`Failed to manually execute ${EXTENSION_NAME}.`, err, {
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
    "Submit FOLON Helper Bug Report",
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
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
