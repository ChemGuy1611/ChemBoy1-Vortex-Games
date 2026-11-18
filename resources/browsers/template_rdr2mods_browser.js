const { selectors, log } = require("vortex-api");
const path = require("path");
const GAME_ID = "placeholder";
const api = require("vortex-api"); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const MOD_PATH = path.join("lml"); //DUMMY PLACEHOLDER - the adopter's mod folder

// RDR2MODS BROWSER ////////////////////////////////////////////////
// A sidebar page that embeds the live rdr2mods.com downloads section. The user browses the
// real site and a click on a download button becomes a managed install: the mod is enabled and
// stamped with its browse key and version.
// The adopter must carry TWO files beside index.js: rdr2mods_browser.js and base_browser.js,
// which it requires from beside itself. Copying only the first fails at require time.
const rdr2modsBrowser = true; //toggle - set false to leave the page unregistered
const { registerRdr2ModsBrowser, onceRdr2ModsBrowser } = require("./rdr2mods_browser");
const RDR2MODS_BROWSER_CONFIG = {
  pageId: `${GAME_ID}-rdr2mods-browse`, //optional (default shown)
  pageTitle: "Browse RDR2Mods", //optional - sidebar label. Keep it short - the sidebar truncates past ~20 characters
  //homePath: 'downloads/rdr2/', //optional - where the page opens, relative to the site (default shown)
  //requirements: [], //optional - mods the extension manages itself, each declaring a browseKey (see below)
  //installRequirement: (api, gameSpec, requirement) => null, //optional - required only when requirements is set
  //hotkey: 'D', //optional - Ctrl+Shift+<key>. Pick a free one: Vortex logs "hotkey already used" and drops the second claim (B is taken)
  //priority: 40, //optional - sidebar position, lower is higher up
  //pageGroup: 'per-game', //optional - 'per-game' hides the page while another game is active
  //icon: 'search', //optional - icon name, overridden by mdi
  //mdi: '', //optional - raw SVG path data for the sidebar icon
  //packageAttribute: 'rdr2modsBrowseId', //optional - mod attribute holding the browse key (default shown)
  //versionAttribute: 'rdr2modsVersion', //optional - mod attribute holding the installed version (default shown)
  //allowedHosts: ['rdr2mods.com'], //optional - hosts the page may navigate to (default shown; one entry covers every subdomain)
  //hideAds: false, //optional - stop hiding the site's ad slots (default true; cosmetic only, the requests still happen)
  //adSelectors: ['ins.adsbygoogle'], //optional - CSS selectors hidden in the view, REPLACING the defaults
  //blockAdPopups: false, //optional - stop dropping navigations to ad networks (default true)
  //confirmExternal: false, //optional - skip the external-content confirmation shown before the first load
};

// NOTE: rdr2mods.com sits behind a browser check that Vortex's download manager cannot pass,
// so this module fetches the file itself in the renderer, on the session the browse page has
// already cleared, and hands Vortex the result. Nothing in index.js changes because of that,
// but it is why a browsed download shows an "Installing ..." activity notification rather than
// a progress bar on the Downloads page - and why nothing from this site can be installed
// unattended (there is no rdr2mods downloader module).

// NOTE: The mod type and the installer for browsed mods stay in index.js. This module never
// sets a mod type - the extension's own installers decide where a mod lands.

// NOTE: A browsed mod is keyed on its file page path, everything after /downloads/ without the
// trailing slash: https://www.rdr2mods.com/downloads/rdr2/tools/76-lennys-mod-loader-rdr/
// becomes 'rdr2/tools/76-lennys-mod-loader-rdr'. A managed requirement declares that as its
// browseKey to be routed to installRequirement.

// *** In setup() function ////////////////////
async function setup(discovery) {
  const vfs = require("vortex-api").fs; //DUMMY PLACEHOLDER - use the extension's existing import
  await vfs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH)); //browsed mods need their target folder to exist
}

// *** In applyGame() function ////////////////////
if (rdr2modsBrowser) {
  registerRdr2ModsBrowser(context, spec, RDR2MODS_BROWSER_CONFIG);
} //*/

// *** In context.once() function ////////////////////
if (rdr2modsBrowser) {
  onceRdr2ModsBrowser(context.api, spec, RDR2MODS_BROWSER_CONFIG);
} //*/

// *** Optional: a toolbar button that opens the site in the system browser ////////////////////
context.registerAction(
  "mod-icons",
  300,
  "open-ext",
  {},
  "Open RDR2Mods Page",
  () => {
    try {
      window.api.shell.openUrl("https://www.rdr2mods.com/downloads/rdr2/");
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
