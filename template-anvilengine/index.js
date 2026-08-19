/*//////////////////////////////////////////////////////////
Name: XXX Vortex Extension
Structure: Anvil Engine - AnvilToolkit/ForgerPatchManager
Author: ChemBoy1
Version: 1.0.0
Date: 2026-XX-XX
Notes:
-
//////////////////////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//////////////////////////////////////////////////////////////////////////////
// EDIT ZONE — everything down to "END EDIT ZONE" is set per game
//////////////////////////////////////////////////////////////////////////////

//Specify all the information about the game
const GAME_ID = "XXX";
const UPLAYAPP_ID = "XXX"; //Ubisoft Connect App ID — from SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs\
const STEAMAPP_ID = "XXX"; //https://steamdb.info/app/XXX/
const EPICAPP_ID = null; //Epic catalog item — Ubisoft games are usually installed through Ubisoft Connect instead
const GOGAPP_ID = null; //not typically available for Ubisoft games
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, UPLAYAPP_ID]; // UPDATE THIS WITH ALL VALID IDs

const GAME_NAME = "XXX";
const GAME_NAME_SHORT = "XXX";
const EXEC = "XXX.exe";
const PCGAMINGWIKI_URL = "XXX";
const EXTENSION_URL = "XXX"; //Nexus link to this extension. Used for links

//Feature toggles
const hasAtk = true; //true if game supports AnvilToolkit — also gates the Extracted/.forge/.data/loose workflow and the rename dialog
const hasForger = false; //true if game supports Forger Patch Manager (.forger2 files) — typically older AC games
const hasReforger = false; //true if game uses ReForger (Xbox package, found through the registry)
const hasDlcFolders = false; //true if game has dlc_NN folders — adds the DLC mod type, per-DLC .forge mod types and .forge routing
const hasResorep = false; //true if game uses ResoRep for runtime texture injection
const autoCopyResorepDll = false; //true to copy the system d3d11.dll automatically instead of leaving the bundled .bat to the user
const hasPatchTextures = false; //true if game takes loose .dds textures as Forger patches — mutually exclusive with hasResorep
const hasSound = false; //true if game takes .pck sound bank replacements
const hasFixes = false; //true if game has a community "fixes" DLL package
const hasBinariesType = false; //true if game ships a separate "-binaries" mod type alongside "-root"
const hasCustomLaunchers = false; //true if game has extra launcher executables (Ubisoft Plus / Vulkan)
const hasSettingsIni = false; //true to add an "Open Settings INI" toolbar button
const setupNotification = false; //enable to show the user a notification with special instructions on first setup
const deployNotification = true; //enable the post-deployment notification reminding the user to run the tools
const allowSymlinks = false; //symlinks can cause issues when repacking with ATK — set to false when hasAtk = true
const fallbackInstaller = true; //enable fallback installer. Set false if you need to avoid installer collisions
const debug = false; //toggle for debug mode

const DOCUMENTS = util.getVortexPath('documents');

//Info for mod types and installers
const ROOT_FOLDERS = ["videos"]; //XXX — update to match game (e.g. ["videos", "resources"])
const LOOSE_EXTS = [".data"];

const ATK_ID = `${GAME_ID}-atk`;
const ATK_NAME = "AnvilToolkit";
const ATK_EXEC = 'anviltoolkit.exe'; //used for the tool entry
const ATK_FILES = [ATK_EXEC]; //file names that identify an AnvilToolkit download
const ATK_PAGE = 455;
const ATK_FILE = 3699;
const ATK_DOMAIN = 'site';

const EXTRACTED_ID = `${GAME_ID}-extracted`;
const EXTRACTED_NAME = "Extracted Folder";
const EXTRACTED_FOLDER = "Extracted"; //destination path component
const EXTRACTED_FOLDERS = [EXTRACTED_FOLDER]; //folder names that identify an extracted-folder mod
const RENAME_FOLDER = "RENAME_ME_TO_FORGE_NAME.forge";

const FORGEFOLDER_ID = `${GAME_ID}-forgefolder`;
const FORGEFOLDER_NAME = ".forge Folder";
const FORGEFOLDER_STRING = ".forge";

const DATAFOLDER_ID = `${GAME_ID}-datafolder`;
const DATAFOLDER_NAME = ".data Folder";
const DATAFOLDER_STRING = ".data";

const LOOSE_ID = `${GAME_ID}-loosedata`;
const LOOSE_NAME = "Loose Data Files";

const FORGE_ID = `${GAME_ID}-forgefile`;
const FORGE_NAME = "Forge Replacement";
const FORGE_EXTS = [".forge"];

const ROOT_ID = `${GAME_ID}-root`;
const ROOT_NAME = "Binaries / Root Folder";

//Forger Patch Manager — used when hasForger = true (older AC games)
const FORGER_ID = `${GAME_ID}-forger`;
const FORGER_NAME = "Forger Patch Manager";
const FORGER_EXEC = 'forger.exe'; //used for the tool entry
const FORGER_FILES = [FORGER_EXEC]; //file names that identify a Forger download
const FORGERPATCH_ID = `${GAME_ID}-forgerpatch`;
const FORGERPATCH_NAME = "Forger Patch";
const FORGER_EXTS = [".forger2"];
const FORGER_FOLDER = "ForgerPatches";
const FORGER_PAGE = 42;
const FORGER_FILE = 716;
const FORGER_DOMAIN = "assassinscreedodyssey"; //Forger is hosted on AC Odyssey page

//ReForger — used when hasReforger = true. Installed as an Xbox (MSIX) package, so it is found
//through the registry rather than in the game folder, and it cannot be managed as a Vortex mod.
const REFORGER_ID = `${GAME_ID}-reforger`;
const REFORGER_NAME = "ReForger";
const REFORGER_EXEC = 'ReForger.exe';
const REFORGER_REG_HIVE = 'HKEY_CLASSES_ROOT';
const REFORGER_REG_KEY = 'Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\Repository\\Packages\\XXX';
const REFORGER_REG_VALUE = 'PackageRootFolder';
const REFORGER_GITHUB_API = 'https://api.github.com/repos/QuilLeeR/ReForger';
const REFORGER_RELEASES_URL = 'https://github.com/QuilLeeR/ReForger/releases';
const REFORGER_INSTALLER = 'ReForgerInstaller.exe';

//Forger patch textures — used when hasPatchTextures = true. Claims ".dds", so it cannot be combined with hasResorep.
const PATCH_TEXTURES_ID = `${GAME_ID}-forgerpatchtextures`;
const PATCH_TEXTURES_NAME = "Forger Patch Textures";
const PATCH_TEXTURES_EXTS = [".dds"];

//DLC folders — used when hasDlcFolders = true. Enumerate the real dlc_NN folders in the game directory, never guess.
const DLC_FOLDERS = []; //XXX — e.g. ["dlc_10", "dlc_11"]
const DLC_ID = `${GAME_ID}-dlcfolder`;
const DLC_NAME = "DLC Folder";

//Fixes package — used when hasFixes = true
const FIXES_ID = `${GAME_ID}-fixes`;
const FIXES_NAME = "Fixes";
const FIXES_FILES = ["version.dll"]; //XXX — update to match the game's fixes package

//Sound banks — used when hasSound = true
const SOUND_ID = `${GAME_ID}-sound`;
const SOUND_NAME = "Sound Data .pck";
const SOUND_PATH = path.join('sounddata', 'pc');
const SOUND_EXTS = [".pck"]; //XXX — add any other sound file extensions the game takes

//Separate binaries mod type — used when hasBinariesType = true. No installer, the user assigns it manually.
const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries / Root Folder";

//Extra launchers — used when hasCustomLaunchers = true
const EXEC_PLUS = "XXX_UPP.exe";
const EXEC_VULKAN = "XXX_vulkan.exe";

//Settings INI — used when hasSettingsIni = true
const SETTINGS_FILE = path.join(DOCUMENTS, 'My Games', 'XXX', 'XXX.ini');

//ResoRep — used when hasResorep = true. BITS drives the downloaded file, the system dll source and the hook suffix.
const BITS = "BIT64"; // "BIT32" or "BIT64"
const RESOREP_PAGE = 1215;
const RESOREP_FILE_32BIT = 4854; //32BIT Vortex variant — NOT the Manual variant, which bundles a conflicting dllsettings.ini
const RESOREP_FILE_64BIT = 8350; //64BIT Vortex variant — NOT the Manual variant, which bundles a conflicting dllsettings.ini
const RESOREP_DOMAIN = 'site';
const RESOREP_ID = `${GAME_ID}-resorep`;
const RESOREP_NAME = "ResoRep DLL";
const RESOREP_FILES = ["d3d11.dll"];
const RESOREP_TEXTURES_ID = `${GAME_ID}-resoreptextures`;
const RESOREP_TEXTURES_NAME = "ResoRep Textures";
const RESOREP_TEXTURES_PATH = path.join("ResoRep", "modded");
const RESOREP_TEXTURES_EXTS = [".dds"];
const RESOREP_INI_FILE = "dllsettings.ini";
const RESOREP_DLL_FILE = 'd3d11.dll';
const RESOREP_ORIDLL_FILE = 'ori_d3d11.dll';
const RESOREP_SCRIPT_FILE = 'copy_d3d11dll_vortex.bat';

//Legacy mod types — retired types that a user may still have mods installed under.
//These are deliberately NOT part of spec.modTypes and no installer routes to them. They stay
//registered purely so Vortex can still resolve their target path, which is what lets purge and
//deploy handle those mods instead of stranding their files. Only drop one once no user can
//still be carrying it.
const LEGACY_MODTYPES = [
  /*{
    id: `${GAME_ID}-textures`,
    name: "ResoRep Textures (legacy)",
    targetPath: path.join('{documents}', 'Resorep', 'modded'),
  },
  {
    id: `${GAME_ID}-texturesgamefolder`,
    name: "ResoRep Textures (legacy game folder)",
    targetPath: path.join('{gamePath}', 'Resorep'),
  }, //*/
];

//////////////////////////////////////////////////////////////////////////////
// END EDIT ZONE
//////////////////////////////////////////////////////////////////////////////

let GAME_PATH = ''; //patched in setup to the discovered game path
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';

//Derived from the store IDs actually in use — no separate toggle needed
const hasEpic = (EPICAPP_ID !== null) && DISCOVERY_IDS_ACTIVE.includes(EPICAPP_ID);
const hasGog = (GOGAPP_ID !== null) && DISCOVERY_IDS_ACTIVE.includes(GOGAPP_ID);

//BITS picks the ResoRep file, the system dll folder and the application_to_hook suffix
const RESOREP_FILE = (BITS === "BIT32") ? RESOREP_FILE_32BIT : RESOREP_FILE_64BIT;
const WINDIR = process.env.SystemRoot || process.env.windir || path.join('C:', 'Windows');
const SYSTEM_DLL_FILE = path.join(WINDIR, (BITS === "BIT32") ? 'SysWOW64' : 'System32', RESOREP_DLL_FILE);
const RESOREP_INI_TEXT = (
`version=1.7.0
modded_textures_folder={gamePath}\\${RESOREP_TEXTURES_PATH}
mod_creator_mode_enabled=false
dll_log_enabled=false
dll_log_file={gamePath}\\resorepDll.log
save_textures=false
original_textures_folder={gamePath}\\ResoRep\\original
application_to_hook={gamePath}\\${EXEC}|${BITS}`
);

//A .forge file belonging to a DLC carries the DLC number as a "_NN_dlc" segment in its name.
//Root .forge files carry no such segment, which is what makes this a safe routing test.
//Routing prefixes the destination path with the DLC folder, so every .forge mod stays on the
//single root .forge mod type — there is no mod type per DLC folder.
const DLC_FORGE_ROUTES = DLC_FOLDERS.map(folder => ({
  folder: folder,
  token: `_${(folder.match(/(\d+)/) || [])[1]}_dlc`,
}));

//Both features claim ".dds" — enabling them together makes install routing depend on registration order
if (hasPatchTextures && hasResorep) {
  log('error', `${GAME_ID}: hasPatchTextures and hasResorep cannot both be enabled - both claim "${RESOREP_TEXTURES_EXTS.join('/')}" files. Disable one of them.`);
}

const MOD_PATH_DEFAULT = '.';
const REQ_FILE = EXEC;
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];
const IGNORE_DEPLOY = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_CONFLICTS = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

//Folders that must exist and be writable before mods are deployed
let MODTYPE_FOLDERS = [EXTRACTED_FOLDER];
if (hasSound) MODTYPE_FOLDERS.push(SOUND_PATH);
if (hasForger || hasPatchTextures) MODTYPE_FOLDERS.push(FORGER_FOLDER);
if (hasResorep) MODTYPE_FOLDERS.push(RESOREP_TEXTURES_PATH);
DLC_FORGE_ROUTES.forEach(route => MODTYPE_FOLDERS.push(path.join(route.folder, EXTRACTED_FOLDER)));

//filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "compatible": {
      "dinput": false,
      "enb": false,
    },
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "uPlayAppId": UPLAYAPP_ID,
      "supportsSymlinks": allowSymlinks,
      "ignoreDeploy": IGNORE_DEPLOY,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "UPlayAPPId": UPLAYAPP_ID
    }
  },
  "modTypes": [
    {
      "id": EXTRACTED_ID,
      "name": EXTRACTED_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": FORGEFOLDER_ID,
      "name": FORGEFOLDER_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": DATAFOLDER_ID,
      "name": DATAFOLDER_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": LOOSE_ID,
      "name": LOOSE_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": FORGE_ID,
      "name": FORGE_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//Store IDs are only advertised when the matching store is actually in use
if (hasEpic) {
  spec.game.details.epicAppId = EPICAPP_ID;
  spec.game.environment.EpicAPPId = EPICAPP_ID;
}
if (hasGog) {
  spec.game.details.gogAppId = GOGAPP_ID;
  spec.game.environment.GogAPPId = GOGAPP_ID;
}

//Append ATK mod type when enabled
if (hasAtk) {
  spec.modTypes.push({
    "id": ATK_ID,
    "name": ATK_NAME,
    "priority": "low",
    "targetPath": "{gamePath}"
  });
}

//Append Forger mod types when enabled
if (hasForger) {
  spec.modTypes.push({
    "id": FORGER_ID,
    "name": FORGER_NAME,
    "priority": "low",
    "targetPath": "{gamePath}"
  });
  spec.modTypes.push({
    "id": FORGERPATCH_ID,
    "name": FORGERPATCH_NAME,
    "priority": "high",
    "targetPath": path.join("{gamePath}", FORGER_FOLDER)
  });
}

//Append the Forger patch textures mod type when enabled
if (hasPatchTextures) {
  spec.modTypes.push({
    "id": PATCH_TEXTURES_ID,
    "name": PATCH_TEXTURES_NAME,
    "priority": "high",
    "targetPath": path.join("{gamePath}", FORGER_FOLDER)
  });
}

//Append the DLC folder mod type when enabled. DLC .forge files do not get their own mod
//types — installForge adds the DLC folder to the destination path instead.
if (hasDlcFolders) {
  spec.modTypes.push({
    "id": DLC_ID,
    "name": DLC_NAME,
    "priority": "high",
    "targetPath": "{gamePath}"
  });
}

//Append the sound mod type when enabled
if (hasSound) {
  spec.modTypes.push({
    "id": SOUND_ID,
    "name": SOUND_NAME,
    "priority": "high",
    "targetPath": path.join("{gamePath}", SOUND_PATH)
  });
}

//Append the fixes mod type when enabled
if (hasFixes) {
  spec.modTypes.push({
    "id": FIXES_ID,
    "name": FIXES_NAME,
    "priority": "low",
    "targetPath": "{gamePath}"
  });
}

//Append the separate binaries mod type when enabled
if (hasBinariesType) {
  spec.modTypes.push({
    "id": BINARIES_ID,
    "name": BINARIES_NAME,
    "priority": "high",
    "targetPath": "{gamePath}"
  });
}

//Append the ResoRep mod types when enabled
if (hasResorep) {
  spec.modTypes.push({
    "id": RESOREP_TEXTURES_ID,
    "name": RESOREP_TEXTURES_NAME,
    "priority": "high",
    "targetPath": path.join("{gamePath}", RESOREP_TEXTURES_PATH)
  });
  spec.modTypes.push({
    "id": RESOREP_ID,
    "name": RESOREP_NAME,
    "priority": "low",
    "targetPath": "{gamePath}"
  });
}

//3rd party tools and launchers
const tools = [
  {
    id: `${GAME_ID}-customlaunch`,
    name: "Custom Launch",
    logo: `exec.png`,
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    //parameters: PARAMETERS,
  },
];

//Append the extra launchers when enabled
if (hasCustomLaunchers) {
  tools.push({
    id: `${GAME_ID}-launchplus`,
    name: "Launch Game Ubisoft Plus",
    logo: `exec.png`,
    executable: () => EXEC_PLUS,
    requiredFiles: [EXEC_PLUS],
    detach: true,
    relative: true,
    exclusive: true,
  });
  tools.push({
    id: `${GAME_ID}-launchvulkan`,
    name: "Launch Vulkan",
    logo: `vulkan.png`,
    executable: () => EXEC_VULKAN,
    requiredFiles: [EXEC_VULKAN],
    detach: true,
    relative: true,
    exclusive: true,
  });
}

//Append ATK tool when enabled
if (hasAtk) {
  tools.push({
    id: ATK_ID,
    name: ATK_NAME,
    logo: 'anvil.png',
    executable: () => ATK_EXEC,
    requiredFiles: [
      ATK_EXEC,
    ],
    relative: true,
    exclusive: true,
  });
}
if (hasForger) {
  tools.push({
    id: FORGER_ID,
    name: FORGER_NAME,
    logo: 'forger.png',
    executable: () => FORGER_EXEC,
    requiredFiles: [
      FORGER_EXEC,
    ],
    relative: true,
    exclusive: true,
  });
}
if (hasReforger) {
  tools.push({
    id: REFORGER_ID,
    name: REFORGER_NAME,
    logo: 'reforger.png',
    queryPath: getReforgerPath,
    executable: () => REFORGER_EXEC,
    requiredFiles: [
      REFORGER_EXEC,
    ],
    relative: false,
    exclusive: true,
  });
}

// BASIC EXTENSION FUNCTIONS ///////////////////////////////////////////////////

function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

async function getAllFiles(dirPath) {
  let results = [];
  try {
    const entries = await fs.readdirAsync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.statAsync(fullPath);
      if (stats.isDirectory()) {
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else {
        results.push(fullPath);
      }
    }
  } catch (err) {
    log('warn', `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

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
  catch (err) { //this happens if the executable comes back as "undefined", usually caused by the Xbox app locking down the folder
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Find the game installation folder via Ubisoft Connect registry entry
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
  } catch {
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  }
}

//Find ReForger, which is installed as an Xbox package rather than into the game folder
function getReforgerPath() {
  try {
    const reg = winapi.RegGetValue(REFORGER_REG_HIVE, REFORGER_REG_KEY, REFORGER_REG_VALUE);
    if (!reg) {
      log('warn', `${REFORGER_NAME} path not found`);
      return undefined;
    }
    log('info', `${REFORGER_NAME} path found at ${reg.value}`);
    return reg.value;
  } catch (err) {
    log('warn', `${REFORGER_NAME} path not found: ${err.message}`);
    return undefined;
  }
}

//* Get mod path dynamically
function getModPath(discoveryPath) {
  return () => MOD_PATH_DEFAULT;
} //*/

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable
function getExecutable(discoveryPath) {
  return EXEC;
}

//Get correct game version
async function setGameVersion(gamePath) {
  GAME_VERSION = 'default';
  return GAME_VERSION;
}

//* Resolve game version for display in Vortex
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
  let version = '0.0.0';
  try {
    const exeVersion = require('exe-version');
    version = exeVersion.getProductVersion(path.join(gamePath, getExecutable(gamePath)));
    return Promise.resolve(version);
  } catch (err) {
    log('error', `Could not read executable file to get game version: ${err}`);
    return Promise.resolve(version);
  }
} //*/

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if AnvilToolkit is installed
function isAnvilInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === ATK_ID);
}

//Function to automatically download AnvilToolkit from Nexus Mods
async function downloadAnvil(api, gameSpec) {
  let isInstalled = isAnvilInstalled(api, gameSpec);
  if (!isInstalled) {
    const MOD_NAME = ATK_NAME;
    const MOD_TYPE = ATK_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = ATK_PAGE;
    const FILE_ID = ATK_FILE;
    const GAME_DOMAIN = ATK_DOMAIN;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try {
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
      } catch {
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE),
      ];
      util.batchDispatch(api.store, batched);
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Check if Forger Patch Manager is installed
function isForgerInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === FORGER_ID);
}

//Function to automatically download Forger Patch Manager from Nexus Mods
//Only called when hasForger = true
async function downloadForger(api, gameSpec, check = true) {
  let isInstalled = isForgerInstalled(api, gameSpec);
  if (!isInstalled || !check) {
    const MOD_NAME = FORGER_NAME;
    const MOD_TYPE = FORGER_ID;
    const NOTIF_ID = `${MOD_TYPE}-installing`;
    const PAGE_ID = FORGER_PAGE;
    const FILE_ID = FORGER_FILE;
    const GAME_DOMAIN = FORGER_DOMAIN;
    api.sendNotification({
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) {
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try {
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
      } catch {
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = {
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
        actions.setModType(gameSpec.game.id, modId, MOD_TYPE),
      ];
      util.batchDispatch(api.store, batched);
    } catch (err) {
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Check if ResoRep is installed
function isResoRepInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === RESOREP_ID);
}

//Ask the user whether they want ResoRep — only needed for legacy texture mods
//Only called when hasResorep = true
async function downloadResoRepPrompt(api, gameSpec) {
  if (isResoRepInstalled(api, gameSpec)) {
    return;
  }
  const NOTIF_ID = `${GAME_ID}-resorepdownload`;
  const MESSAGE = `Download ResoRep for Legacy Texture Mods`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Download ResoRep',
        action: (dismiss) => { downloadResoRep(api, gameSpec); dismiss(); },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `Some legacy texture mods need ${RESOREP_NAME} to inject textures into memory while the game runs.\n`
                + `Click "Download ResoRep" below if you want to use those mods. You can install it later at any time.\n`
                + `\n`
                + `Textures are deployed to "${RESOREP_TEXTURES_PATH}" inside the game folder, and the extension writes the "${RESOREP_INI_FILE}" settings file for you.\n`
          }, [
            { label: 'Download ResoRep', action: () => { downloadResoRep(api, gameSpec); dismiss(); } },
            { label: 'Continue', action: () => dismiss() },
            { label: 'Never Show Again', action: () => { api.suppressNotification(NOTIF_ID); dismiss(); } },
          ]);
        },
      },
    ],
  });
}

//Download the BITS-matched ResoRep "Vortex" file variant from Nexus Mods
async function downloadResoRep(api, gameSpec) {
  const MOD_NAME = `${RESOREP_NAME} ${(BITS === "BIT32") ? '32-bit' : '64-bit'}`;
  const MOD_TYPE = RESOREP_ID;
  const NOTIF_ID = `${MOD_TYPE}-installing`;
  const PAGE_ID = RESOREP_PAGE;
  const FILE_ID = RESOREP_FILE;
  const GAME_DOMAIN = RESOREP_DOMAIN;
  api.sendNotification({
    id: NOTIF_ID,
    message: `Installing ${MOD_NAME}`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  if (api.ext?.ensureLoggedIn !== undefined) {
    await api.ext.ensureLoggedIn();
  }
  try {
    //The file id is pinned on purpose - the page also carries "Manual" variants, which bundle a
    //conflicting dllsettings.ini, so picking the newest main file would install the wrong package.
    const URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE_ID}`;
    const dlInfo = {
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
      actions.setModType(gameSpec.game.id, modId, MOD_TYPE),
    ];
    util.batchDispatch(api.store, batched);
  } catch (err) {
    const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
    api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
    util.opn(errPage).catch(() => null);
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
}

//Check if ReForger is installed. It registers an Xbox package rather than dropping files in the
//game folder, so the registry lookup is the only reliable test.
function isReforgerInstalled() {
  return getReforgerPath() !== undefined;
}

//Download and run the ReForger installer from GitHub.
//ReForger ships as an MSIX package behind an installer executable, so it cannot be managed as a
//Vortex mod — there is nothing to stage or deploy. The installer is fetched into the downloads
//folder with allowInstall disabled and then launched; the registry check above is what tells us
//it worked. Only called when hasReforger = true.
async function downloadReforger(api, gameSpec, force = false) {
  if (!force && isReforgerInstalled()) {
    log('info', `${REFORGER_NAME} already installed. Installer not downloaded.`);
    return Promise.resolve();
  }
  const state = api.getState();
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  const NOTIF_ID = `${REFORGER_ID}-installing`;
  api.sendNotification({
    id: NOTIF_ID,
    message: `Downloading ${REFORGER_NAME}`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  try {
    const response = await fetch(`${REFORGER_GITHUB_API}/releases/latest`);
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    const release = await response.json();
    const asset = (release.assets || []).find(file =>
      path.basename(file.name).toLowerCase() === REFORGER_INSTALLER.toLowerCase());
    if (asset === undefined) {
      throw new util.ProcessCanceled(`No ${REFORGER_INSTALLER} found in ${REFORGER_NAME} release ${release.tag_name}. `
        + `That release ships: ${(release.assets || []).map(file => file.name).join(', ')}`);
    }
    await new Promise((resolve, reject) => {
      api.events.emit('start-download', [asset.browser_download_url], {}, undefined,
        async (err, dlId) => {
          if (err !== null && err.name !== 'AlreadyDownloaded') {
            return reject(err);
          }
          try {
            const RUN_PATH = path.join(DOWNLOAD_FOLDER, REFORGER_INSTALLER);
            await fs.statAsync(RUN_PATH);
            await api.runExecutable(RUN_PATH, [], { suggestDeploy: false });
            log('info', `${REFORGER_NAME} installer started from the downloads folder`);
          } catch (runErr) {
            log('error', `Could not run the ${REFORGER_NAME} installer: ${runErr}`);
            api.showErrorNotification(`Could not run the ${REFORGER_NAME} installer. Run ${REFORGER_INSTALLER} from your downloads folder manually.`,
              runErr, { allowReport: false });
            util.opn(DOWNLOAD_FOLDER).catch(() => null);
          }
          return resolve();
        },
        'never',
        { allowInstall: false },
      );
    });
  } catch (err) {
    api.showErrorNotification(`Failed to download ${REFORGER_NAME}`, err,
      { allowReport: !(err instanceof util.ProcessCanceled) });
    util.opn(REFORGER_RELEASES_URL).catch(() => null);
  } finally {
    api.dismissNotification(NOTIF_ID);
  }
  return Promise.resolve();
}

// MOD INSTALLER FUNCTIONS /////////////////////////////////////////////////////

//Installer test for AnvilToolkit
function testATK(files, gameId) {
  const isMod = files.some(file => ATK_FILES.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

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

//Installer install AnvilToolkit
function installATK(files) {
  const modFile = files.find(file => ATK_FILES.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ATK_ID };

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

//Test for "Extracted" folder
function testExtracted(files, gameId) {
  const isMod = files.some(file => EXTRACTED_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install "Extracted" folder
function installExtracted(files) {
  const modFile = files.find(file => EXTRACTED_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: EXTRACTED_ID };

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

//Test for folder with ".forge" in name
function testForgeFolder(files, gameId) {
  const isMod = files.some(file => path.dirname(file).includes(FORGEFOLDER_STRING));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install folder with ".forge" in name — places inside Extracted folder
function installForgeFolder(files) {
  const modFile = files.find(file => path.basename(file).includes(FORGEFOLDER_STRING));
  const MODFILE_IDX = `${path.basename(modFile)}${path.sep}`;
  const idx = modFile.indexOf(MODFILE_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FORGEFOLDER_ID };

  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTRACTED_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for folder with ".data" in name
function testDataFolder(files, gameId) {
  const isMod = files.some(file => path.dirname(file).includes(DATAFOLDER_STRING));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install folder with ".data" in name — places inside Extracted/RENAME_ME folder, notifies user to rename
function installDataFolder(api, files, fileName) {
  const modFile = files.find(file => path.basename(file).includes(DATAFOLDER_STRING));
  const MODFILE_IDX = `${path.basename(modFile)}${path.sep}`;
  const idx = modFile.indexOf(MODFILE_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DATAFOLDER_ID };

  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTRACTED_FOLDER, RENAME_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  renamingRequiredNotify(api, fileName);
  return Promise.resolve({ instructions });
}

//Test for loose .data files
function testLoose(files, gameId) {
  const isMod = files.some(file => LOOSE_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install loose .data files — places inside Extracted/RENAME_ME folder, notifies user to rename
function installLoose(api, files, fileName) {
  const modFile = files.find(file => LOOSE_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: LOOSE_ID };

  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(EXTRACTED_FOLDER, RENAME_FOLDER, file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  renamingRequiredNotify(api, fileName);
  return Promise.resolve({ instructions });
}

//Test for .forge replacement files
function testForge(files, gameId) {
  const isMod = files.some(file => FORGE_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install .forge replacement files — routed to a DLC folder when the file name names one
function installForge(files) {
  const modFile = files.find(file => FORGE_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);

  const setModTypeInstruction = { type: 'setmodtype', value: FORGE_ID };

  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  //A DLC .forge file carries the DLC number as a "_NN_dlc" segment, and that names the folder
  //it belongs in. First match wins; a name matching no DLC number stays at the root. Routing is
  //per file, so one archive can carry .forge files for several DLCs.
  const instructions = filtered.map(file => {
    const FILE_NAME = path.basename(file).toLowerCase();
    const route = DLC_FORGE_ROUTES.find(entry => FILE_NAME.includes(entry.token));
    return {
      type: 'copy',
      source: file,
      destination: path.join((route !== undefined) ? route.folder : '', file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Test for DLC folders — only used when hasDlcFolders = true
function testDlc(files, gameId) {
  const isMod = files.some(file => DLC_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install DLC folders — only used when hasDlcFolders = true
function installDlc(files) {
  const modFile = files.find(file => DLC_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DLC_ID };

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

//Test for root folder files (e.g. videos, resources)
function testRoot(files, gameId) {
  const isMod = files.some(file => ROOT_FOLDERS.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install root folder files
function installRoot(files) {
  const modFile = files.find(file => ROOT_FOLDERS.includes(path.basename(file)));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

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

//Fallback installer — catches anything not handled above
function testFallback(files, gameId) {
  let supported = (gameId === spec.game.id);

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

//Fallback installer — installs to root, notifies user
function installFallback(api, files, fileName) {
  fallbackInstallerNotify(api, fileName);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };
  const filtered = files.filter(file => (!file.endsWith(path.sep)));
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

//Test for Forger Patch Manager installer files — only used when hasForger = true
function testForger(files, gameId) {
  const isMod = files.some(file => FORGER_FILES.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Install Forger Patch Manager — only used when hasForger = true
function installForger(files) {
  const modFile = files.find(file => FORGER_FILES.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FORGER_ID };

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

//Test for .forger2 patch files — only used when hasForger = true
function testForgerPatch(files, gameId) {
  const isMod = files.some(file => FORGER_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install .forger2 patch files — only used when hasForger = true
function installForgerPatch(files) {
  const modFile = files.find(file => FORGER_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FORGERPATCH_ID };

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

//Test for loose .dds Forger patch textures — only used when hasPatchTextures = true
function testPatchTextures(files, gameId) {
  const isMod = files.some(file => PATCH_TEXTURES_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install loose .dds Forger patch textures — only used when hasPatchTextures = true
function installPatchTextures(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: PATCH_TEXTURES_ID };
  const filtered = files.filter(file => (!file.endsWith(path.sep)));
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

//Test for .pck sound banks — only used when hasSound = true
function testSound(files, gameId) {
  const isMod = files.some(file => SOUND_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install .pck sound banks — only used when hasSound = true
function installSound(files) {
  const modFile = files.find(file => SOUND_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SOUND_ID };

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

//Test for the community fixes package — only used when hasFixes = true
function testFixes(files, gameId) {
  const isMod = files.some(file => FIXES_FILES.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install the community fixes package — only used when hasFixes = true
function installFixes(files) {
  const modFile = files.find(file => FIXES_FILES.includes(path.basename(file)));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: FIXES_ID };

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

//Test for the ResoRep DLL package — only used when hasResorep = true
function testResoRep(files, gameId) {
  const isMod = files.some(file => RESOREP_FILES.includes(path.basename(file)));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install the ResoRep DLL package — only used when hasResorep = true
function installResoRep(files) {
  const modFile = files.find(file => RESOREP_FILES.includes(path.basename(file)));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: RESOREP_ID };

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

//Test for ResoRep .dds textures — only used when hasResorep = true
function testResoRepTextures(files, gameId) {
  const isMod = files.some(file => RESOREP_TEXTURES_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

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

//Install ResoRep .dds textures — only used when hasResorep = true
function installResoRepTextures(files) {
  const modFile = files.find(file => RESOREP_TEXTURES_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: RESOREP_TEXTURES_ID };

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

// MAIN FUNCTIONS //////////////////////////////////////////////////////////////

//Notify user that folder renaming is required for .data folder mods
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
            { label: `Open Mod Page`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
              log('warn', `Found ${modMatch?.id} for ${MOD_NAME}`);
              let PAGE = ``;
              if (modMatch) {
                const MOD_ID = modMatch.attributes.modId;
                if (MOD_ID !== undefined) {
                  PAGE = `${MOD_ID}?tab=description`;
                }
              }
              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
              util.opn(MOD_PAGE_URL).catch(() => null);
            }},
            { label: `Show Folder Rename Dialog`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === MOD_NAME);
              if (!modMatch) {
                api.showErrorNotification('Cannot rename folder. You must rename the folder manually.', undefined, { allowReport: false });
                dismiss();
              } else {
                folderRenameDialog(api, modMatch);
                dismiss();
              }
            }},
            { label: `Open Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, MOD_NAME)).catch(() => null);
              dismiss();
            }},
            { label: 'Close', action: () => dismiss() },
          ]);
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
  .then(result => {
    if (result.action === 'Rename') {
      let name = result.input[RENAME_INPUT_ID];
      if (name === undefined) {
        name = RENAME_FOLDER;
      }
      name = name.trim();
      if (!name.endsWith('.forge')) {
        name = name + '.forge';
      }
      if (name === '.forge' || name === RENAME_FOLDER) {
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

async function rename(api, EXISTING, NEW) {
  await purge(api);
  try {
    fs.statSync(EXISTING);
    await fs.renameAsync(EXISTING, NEW);
  }
  catch (err) {
    api.showErrorNotification('Failed to rename .forge folder. You will have to rename the folder manually.', err, { allowReport: false });
    return Promise.resolve();
  }
  await deploy(api);
  return Promise.resolve();
}

//Notify user that fallback installer was reached
function fallbackInstallerNotify(api, modName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, spec.game.id);
  modName = path.basename(modName, '.installing');
  const id = modName.replace(/[^a-zA-Z0-9\s]*( )*/gi, '').slice(0, 20);
  const NOTIF_ID = `${GAME_ID}-${id}-fallback`;
  const MESSAGE = 'Fallback installer reached for ' + modName;
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
            text: `The mod you just installed reached the fallback installer. This means Vortex could not determine where to place these mod files.\n`
                + `Please check the mod page description and review the files in the mod staging folder to determine if manual file manipulation is required.\n`
                + `\n`
                + `If you think that Vortex should be capable to install this mod to a specific folder, please contact the extension developer for support at the link below.\n`
                + `\n`
                + `Mod Name: ${modName}.\n`
                + `\n`
          }, [
            { label: 'Continue', action: () => dismiss() },
            {
              label: 'Contact Ext. Developer', action: () => {
                util.opn(`${EXTENSION_URL}?tab=posts`).catch(() => null);
                dismiss();
              }
            },
            //*
            { label: `Open Mod Page + Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, modName)).catch(() => null);
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => mod.installationPath === modName);
              log('warn', `Found ${modMatch?.id} for ${modName}`);
              let PAGE = ``;
              if (modMatch) {
                const MOD_ID = modMatch.attributes.modId;
                if (MOD_ID !== undefined) {
                  PAGE = `${MOD_ID}?tab=description`;
                }
              }
              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
              util.opn(MOD_PAGE_URL).catch(() => null);
              dismiss();
            }}, //*/
          ]);
        },
      },
    ],
  });
}

//Notify user to run the active deploy tool(s) after deployment
function deployNotify(api) {
  if (!hasAtk && !hasForger && !hasReforger) return;
  const hasBoth = hasAtk && (hasForger || hasReforger);
  const MESSAGE = hasBoth
    ? `Run ATK and/or Forger to Apply Changes`
    : hasAtk
      ? `Run ATK to Repack .forge Files`
      : `Run Forger to Apply Patches`;
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const ATK_TEXT = `For some mods, you must use ${ATK_NAME} to pack mods into the game's .forge data files after installing with Vortex.\n`
    + `Read your mod's instructions to determine which .forge file(s) to unpack and repack.\n`
    + `You may need to do some manual folder manipulation in the mod staging folder if the extension could not do it for your mod.\n`
    + `Right click on the mod in the "Mods" tab to open the mod's staging folder and verify the folder structure is correct.\n`
    + `The folder structure should look something like this: "Extracted/{FORGE_FILE_NAME}.forge/{DATA_FILE}.data".\n`;
  const FORGER_TEXT = `For Forger patch mods, you must use ${FORGER_NAME} to apply patches after installing with Vortex.\n`
    + `Read your mod's instructions for any additional steps required.\n`;
  const REFORGER_TEXT = `For Forger patch mods, you must use ${REFORGER_NAME} to apply patches after installing with Vortex.\n`;
  const ORDER_TEXT = `Run ${ATK_NAME} first to repack mods into the game's .forge data files, then run the Forger tool to apply any Forger patches.\n`;
  const TOOLS_TEXT = `Use the included tools to launch them (buttons on this notification or in the "Dashboard" tab).\n`;
  let DETAIL_TEXT = ``;
  if (hasBoth) DETAIL_TEXT += ORDER_TEXT;
  if (hasAtk) DETAIL_TEXT += ATK_TEXT;
  if (hasForger) DETAIL_TEXT += FORGER_TEXT;
  if (hasReforger) DETAIL_TEXT += REFORGER_TEXT;
  DETAIL_TEXT += TOOLS_TEXT;

  const deployTools = [];
  if (hasAtk) deployTools.push({ id: ATK_ID, name: ATK_NAME });
  if (hasForger) deployTools.push({ id: FORGER_ID, name: FORGER_NAME });
  if (hasReforger) deployTools.push({ id: REFORGER_ID, name: REFORGER_NAME });

  const notifActions = deployTools.map(tool => ({
    title: `Run ${tool.name}`,
    action: (dismiss) => { runDeployTool(api, tool.id, tool.name); dismiss(); },
  }));
  notifActions.push({
    title: 'More',
    action: (dismiss) => {
      const dialogButtons = deployTools.map(tool =>
        ({ label: `Run ${tool.name}`, action: () => { runDeployTool(api, tool.id, tool.name); dismiss(); } }));
      dialogButtons.push({ label: 'Continue', action: () => dismiss() });
      dialogButtons.push({ label: 'Never Show Again', action: () => { api.suppressNotification(NOTIF_ID); dismiss(); } });
      api.showDialog('question', MESSAGE, { text: DETAIL_TEXT }, dialogButtons);
    },
  });
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: notifActions,
  });
}

//Launch a deploy tool from Vortex
function runDeployTool(api, toolId, toolName) {
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', toolId], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false })
        .catch(err => api.showErrorNotification(`Failed to run ${toolName}`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    } else {
      return api.showErrorNotification(`Failed to run ${toolName}`, `Path to ${toolName} executable could not be found. Ensure ${toolName} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${toolName}`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}

function setupNotify(api) {
  const NOTIF_ID = `${GAME_ID}-setup-notify`;
  const MESSAGE = 'Special Setup Instructions';
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
            text: `\n`
                + `TEXT HERE.\n`
                + `\n`
                + `TEXT HERE.\n`
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

// RESOREP FUNCTIONS ///////////////////////////////////////////////////////////

//Write the ResoRep dllsettings.ini file — the Vortex file variants deliberately ship without one
async function resorepSettingsWrite(api, gameSpec) {
  try {
    fs.statSync(path.join(GAME_PATH, RESOREP_INI_FILE));
  } catch {
    await fs.writeFileAsync(
      path.join(GAME_PATH, RESOREP_INI_FILE),
      (pathPattern(api, gameSpec.game, RESOREP_INI_TEXT)),
      (err) => {
        if (err) {
          api.showErrorNotification(`Failed to write ResoRep ${RESOREP_INI_FILE} file`, err);
        }
      }
    );
  }
}

//Copy the system d3d11.dll into the staging folder as ori_d3d11.dll, which is what the bundled .bat does
async function resorepDllCopy(api, gameSpec, force = false) {
  let isInstalled = isResoRepInstalled(api, gameSpec);
  if (!isInstalled && !force) {
    log('info', 'ResoRep not installed. File not copied.');
    return Promise.resolve();
  }
  try {
    if (force) throw new Error('forced copy');
    fs.statSync(path.join(GAME_PATH, RESOREP_ORIDLL_FILE));
    log('info', 'ResoRep original dll already exists. No file copied.');
    return Promise.resolve();
  } catch {
    const SOURCE = SYSTEM_DLL_FILE;
    const TARGET = path.join(GAME_PATH, RESOREP_ORIDLL_FILE);
    return util.copyFileAtomic(SOURCE, TARGET)
      .catch(err => {
        api.showErrorNotification(`Failed to copy ${RESOREP_DLL_FILE} from the system folder`, err);
        log('error', `Failed to copy ${RESOREP_DLL_FILE} from the system folder`);
        return Promise.resolve();
      });
  }
}

//Run the bundled ResoRep copy script instead of copying the dll directly
async function resorepScriptCheck(api, gameSpec) {
  let isInstalled = isResoRepInstalled(api, gameSpec);
  if (!isInstalled) {
    log('info', 'ResoRep not installed. File copy script not run.');
    return Promise.resolve();
  }
  try {
    fs.statSync(path.join(GAME_PATH, RESOREP_ORIDLL_FILE));
    log('info', 'ResoRep original dll already exists. File copy script not run.');
  } catch {
    try {
      await api.runExecutable(
        path.join(GAME_PATH, RESOREP_SCRIPT_FILE),
        [],
        {
          shell: true,
          detached: true,
        }
      );
      log('info', 'ResoRep file copy script run.');
    } catch (err) {
      api.showErrorNotification('Failed to run ResoRep file copy script', err);
    }
  }
  return Promise.resolve();
}

// SETUP AND REGISTRATION //////////////////////////////////////////////////////

async function modFoldersEnsureWritable(gamePath, relPaths) {
  for (let index = 0; index < relPaths.length; index++) {
    await fs.ensureDirWritableAsync(path.join(gamePath, relPaths[index]));
  }
}

//Setup function — runs when the game is first discovered
async function setup(discovery, api, gameSpec) {
  // SYNCHRONOUS CODE ////////////////////////////////////
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  // ASYNC CODE //////////////////////////////////////////
  if (setupNotification) setupNotify(api);
  if (hasAtk) {
    await downloadAnvil(api, gameSpec);
  }
  if (hasForger) {
    await downloadForger(api, gameSpec);
  }
  if (hasReforger) {
    await downloadReforger(api, gameSpec);
  }
  if (hasResorep) {
    await downloadResoRepPrompt(api, gameSpec);
    await resorepSettingsWrite(api, gameSpec);
    if (autoCopyResorepDll) {
      await resorepDllCopy(api, gameSpec);
      await resorepScriptCheck(api, gameSpec);
    }
  }
  return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutable,
    queryModPath: getModPath(),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    getGameVersion: resolveGameVersion,
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

  //register retired mod types that users may still have mods installed under, so Vortex can
  //still resolve their target path. They are not in spec.modTypes, so no installer routes to them.
  LEGACY_MODTYPES.forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority('low') + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod installers
  if (hasAtk) {
    context.registerInstaller(ATK_ID, 25, testATK, installATK);
  }
  if (hasForger) {
    context.registerInstaller(FORGER_ID, 26, testForger, installForger);
  }
  if (hasResorep) {
    context.registerInstaller(RESOREP_ID, 27, testResoRep, installResoRep);
  }
  if (hasForger) {
    context.registerInstaller(FORGERPATCH_ID, 28, testForgerPatch, installForgerPatch);
  }
  if (hasPatchTextures) {
    context.registerInstaller(PATCH_TEXTURES_ID, 29, testPatchTextures, installPatchTextures);
  }
  if (hasResorep) {
    context.registerInstaller(RESOREP_TEXTURES_ID, 30, testResoRepTextures, installResoRepTextures);
  }
  //slot 31 is left free for game-unique installers
  if (hasSound) {
    context.registerInstaller(SOUND_ID, 32, testSound, installSound);
  }
  if (hasFixes) {
    context.registerInstaller(FIXES_ID, 33, testFixes, installFixes);
  }
  if (hasDlcFolders) {
    context.registerInstaller(DLC_ID, 34, testDlc, installDlc);
  }
  if (hasAtk) {
    context.registerInstaller(EXTRACTED_ID, 35, testExtracted, installExtracted);
    context.registerInstaller(FORGEFOLDER_ID, 36, testForgeFolder, installForgeFolder);
    context.registerInstaller(DATAFOLDER_ID, 37, testDataFolder, (files, fileName) => installDataFolder(context.api, files, fileName));
    context.registerInstaller(LOOSE_ID, 38, testLoose, (files, fileName) => installLoose(context.api, files, fileName));
  }
  context.registerInstaller(FORGE_ID, 39, testForge, installForge);
  context.registerInstaller(ROOT_ID, 41, testRoot, installRoot);
  if (fallbackInstaller) {
    context.registerInstaller(`${GAME_ID}-fallback`, 49, testFallback, (files, destinationPath) => installFallback(context.api, files, destinationPath));
  }

  //register actions
  if (hasSettingsIni) {
    context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Settings INI', () => {
      util.opn(SETTINGS_FILE).catch(() => null);
      }, () => {
        const state = context.api.getState();
        const gameId = selectors.activeGameId(state);
        return gameId === GAME_ID;
    });
  }
  if (hasResorep) {
    context.registerAction('mod-icons', 300, 'open-ext', {}, `Force Copy System ${RESOREP_DLL_FILE} (ResoRep)`, () => {
      resorepDllCopy(context.api, spec, true);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    });
  }
  if (hasReforger) {
    context.registerAction('mod-icons', 300, 'open-ext', {}, `Download ${REFORGER_NAME}`, () => {
      downloadReforger(context.api, spec, true);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    });
  }
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open PCGamingWiki Page', () => {
    util.opn(PCGAMINGWIKI_URL).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    util.opn(path.join(__dirname, 'CHANGELOG.md')).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Submit Bug Report', () => {
    util.opn(`${EXTENSION_URL}?tab=bugs`).catch(() => null);
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
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    const api = context.api;
    if (deployNotification || hasResorep) {
      api.onAsync('did-deploy', async (profileId) => {
        const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
        if (profileId !== LAST_ACTIVE_PROFILE) return;
        if (hasResorep && autoCopyResorepDll) {
          await resorepDllCopy(api, spec);
        }
        if (deployNotification) {
          return deployNotify(api);
        }
      });
    }
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
