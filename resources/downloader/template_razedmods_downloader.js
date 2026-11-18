const { actions, util, selectors, log } = require("vortex-api");
const path = require("path");
const GAME_ID = "placeholder";
const api = require("vortex-api"); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// RAZEDMODS REQUIREMENT /////////////////////////////////////////////////////
const { downloadRazedMods, checkForRazedModsUpdate } = require("./razedmods_downloader");
const XXX_NAME = "XXX";
const XXX_ALIAS_URL = "https://downloads.razedmods.com/XXX"; //stable alias on the host - redirects to the current versioned archive
const XXX_URL_ERR = "https://razedmods.com/XXX"; //manual-download page
const RAZEDMODS_REQUIREMENTS = [
  {
    aliasUrl: XXX_ALIAS_URL,
    userFacingName: XXX_NAME, //notifications, error messages, and the name shown in the mod list
    pageUrl: XXX_URL_ERR, //manual-download page, stamped as the mod's "Source" link (default: the alias itself)
    //modType: XXX_ID, //optional - force a mod type after install. Leave out to let the extension's own installers decide
    //fallbackVersion: '2.40', //optional - version used when the redirect can't be read
    //versionPattern: /-\s*([\d.]+)\.zip$/i, //RegExp whose capture group 1 is the version, run against the decoded resolved file name (default shown)
    //versionAttribute: 'razedModsVersion', //mod attribute tracking the installed version (default shown)
    //autoInstall: false, //opt out of unattended installs - setup and the update check both skip it, only an explicit user action (toolbar button) installs it
  },
  //additional razedmods.com requirements go here
];

// NOTE: There is no pinVersion here, unlike most companion modules. The host
// serves one alias per mod and no index of older versions - see RAZEDMODS_API.md.

// NOTE: Installed copies are found by a mod attribute the module stamps, not by
// mod type, so a requirement can share its mod type with ordinary mods. A copy
// the user installed by hand is not recognized until it is installed through
// the module once.

// *** In setup() function ////////////////////
async function setup(api, gameSpec) {
  await downloadRazedMods(api, gameSpec, RAZEDMODS_REQUIREMENTS); //install if missing
  await checkForRazedModsUpdate(api, gameSpec, RAZEDMODS_REQUIREMENTS).catch(() => null); //update check should never block setup
}

// *** In context.once() function ////////////////////
api.onAsync("check-mods-version", (gameId, mods, forced) => {
  if (gameId !== GAME_ID) return;
  return checkForRazedModsUpdate(api, spec, RAZEDMODS_REQUIREMENTS).catch((err) =>
    log("warn", `Failed to check for ${XXX_NAME} update: ${err}`),
  );
}); //*/

// *** In applyGame() function ////////////////////
//register a toolbar button to (re)download the latest version
context.registerAction(
  "mod-icons",
  300,
  "open-ext",
  {},
  `Download Latest ${XXX_NAME}`,
  () => {
    downloadRazedMods(context.api, spec, RAZEDMODS_REQUIREMENTS, false);
  },
  () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  },
); //*/
