const { actions, util, selectors, log } = require("vortex-api");
const path = require("path");
const GAME_ID = "placeholder";
const api = require("vortex-api"); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// DROPBOX REQUIREMENT /////////////////////////////////////////////////////
const { downloadDropbox, checkForDropboxUpdate } = require("./dropbox_downloader");
const XXX_NAME = "XXX";
const XXX_SHARE_URL = "https://www.dropbox.com/scl/fi/XXX/XXX.zip?rlkey=XXX&dl=1"; //public share link - st= is dropped and dl=1 forced automatically
const DROPBOX_REQUIREMENTS = [
  {
    shareUrl: XXX_SHARE_URL,
    userFacingName: XXX_NAME, //notifications, error messages, and the name shown in the mod list
    //modType: XXX_ID, //optional - force a mod type after install. A DEDICATED type also marks installed copies (incl. ones installed before the module was adopted); never a type ordinary mods share
    //pageUrl: 'https://XXX', //optional - manual-download page, stamped as the mod's "Source" link (default: the share link with dl=0)
    //fileName: 'XXX.zip', //optional - name to save under when neither Dropbox nor the share link names the file
    //fallbackVersion: '1.0.0', //optional - version used when the file name carries none
    //versionPattern: /(\d+(?:\.\d+)+)/, //RegExp whose capture group 1 is the version, run against the resolved file name (default shown)
    //autoInstall: false, //opt out of unattended installs - setup and the update check both skip it, only an explicit user action (toolbar button) installs it
  },
  //additional Dropbox requirements go here
];

// NOTE: There is no pinVersion here, unlike most companion modules. A share link
// points at one file and Dropbox keeps no history behind it - see DROPBOX_API.md.

// NOTE: The module fetches the file itself rather than through Vortex's download
// manager, so a legacy /s/ link (which Dropbox serves as "unspecified") still
// lands under its real name. There is no download-progress bar for it.

// *** In setup() function ////////////////////
async function setup(api, gameSpec) {
  await downloadDropbox(api, gameSpec, DROPBOX_REQUIREMENTS); //install if missing
  await checkForDropboxUpdate(api, gameSpec, DROPBOX_REQUIREMENTS).catch(() => null); //update check should never block setup
}

// *** In context.once() function ////////////////////
api.onAsync("check-mods-version", (gameId, mods, forced) => {
  if (gameId !== GAME_ID) return;
  return checkForDropboxUpdate(api, spec, DROPBOX_REQUIREMENTS).catch((err) =>
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
    downloadDropbox(context.api, spec, DROPBOX_REQUIREMENTS, false);
  },
  () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  },
); //*/
