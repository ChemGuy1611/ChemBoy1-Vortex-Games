const { selectors, log } = require("vortex-api");
const path = require("path");
const GAME_ID = "placeholder";
const api = require("vortex-api"); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const MOD_PATH = path.join("Mods"); //DUMMY PLACEHOLDER - the adopter's mod folder

// MOD.IO BROWSER ////////////////////////////////////////////////
// A sidebar page that embeds the live mod.io game section. The user browses the real site and
// a click on a download link becomes a managed install: the mod is enabled and stamped with its
// mod id, version and file id.
// The adopter must carry TWO files beside index.js: modio_browser.js and base_browser.js, which
// it requires from beside itself. Copying only the first fails at require time.
const modioBrowser = true; //toggle - set false to leave the page unregistered
const { registerModioBrowser, onceModioBrowser } = require("./modio_browser");
const MODIO_GAME = "placeholder"; //mod.io game name_id - https://mod.io/g/placeholder
const MODIO_BROWSER_CONFIG = {
  modioGame: MODIO_GAME,
  pageId: `${GAME_ID}-modio-browse`, //optional (default shown)
  pageTitle: "Browse mod.io", //optional - sidebar label. Keep it short - the sidebar truncates past ~20 characters
  //platform: 'windows', //optional - mod.io platform whose live file is installed (default shown)
  //requirements: [], //optional - mods the extension manages itself, entries carry modioModId
  //installRequirement: (api, gameSpec, requirement) => Promise, //optional - required only when requirements is set
  //hotkey: 'M', //optional - Ctrl+Shift+<key>. Pick a free one: Vortex logs "hotkey already used" and drops the second claim (B is taken)
  //priority: 40, //optional - sidebar position, lower is higher up
  //pageGroup: 'per-game', //optional - 'per-game' hides the page while another game is active
  //icon: 'plugin', //optional - icon name, overridden by mdi
  //mdi: '...', //optional - raw SVG path data for the sidebar icon (default: mod.io's own cog mark, traced from the site's vector asset)
  //packageAttribute: 'modioMod', //optional - mod attribute holding the mod id (default shown)
  //versionAttribute: 'modioVersion', //optional - mod attribute holding the installed version (default shown)
  //fileIdAttribute: 'modioFileId', //optional - mod attribute holding the installed file id (default shown)
  //allowedHosts: ['mod.io', 'modapi.io', 'modcdn.io'], //optional - hosts the page may navigate to (default shown)
  //confirmExternal: false, //optional - skip the external-content confirmation shown before the first load
};

// NOTE: The mod type and the installer for browsed mods stay in index.js. This module never
// sets a mod type - the extension's own installers decide where a mod lands.

// NOTE: Only games whose mods anyone can download are supported. On a game that restricts
// downloads to logged-in users or purchasers, the site saves the file from a blob: URL that never
// reaches Vortex's download manager.

// NOTE: mod.io mods flag whether they have dependencies, so an install offers to bring them along
// and a mod without any costs no extra lookup.

// NOTE: Update checks for browsed mods come from this module, gated on the mod attribute, and run
// on 'check-mods-version' - register the handler in context.once().

// *** In setup() function ////////////////////
async function setup(discovery) {
  const vfs = require("vortex-api").fs; //DUMMY PLACEHOLDER - use the extension's existing import
  await vfs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH)); //browsed mods need their target folder to exist
}

// *** In applyGame() function ////////////////////
if (modioBrowser) {
  registerModioBrowser(context, spec, MODIO_BROWSER_CONFIG);
} //*/

// *** In context.once() function ////////////////////
if (modioBrowser) {
  onceModioBrowser(context.api, spec, MODIO_BROWSER_CONFIG);
} //*/

// *** Optional: a toolbar button that opens the page's site in the system browser ////////////////////
context.registerAction(
  "mod-icons",
  300,
  "open-ext",
  {},
  "Open mod.io Page",
  () => {
    try {
      window.api.shell.openUrl(`https://mod.io/g/${MODIO_GAME}/m`);
    } catch (err) {
      context.api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
    }
  },
  () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  },
); //*/

log("debug", `${setup}`); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
