const { selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const TS_REQUIREMENTS = []; //DUMMY PLACEHOLDER - the array from template_thunderstore_downloader.js
const downloadThunderstoreRequirement = () => null; //DUMMY PLACEHOLDER - imported from thunderstore_downloader.js
const PLUGIN_PATH = path.join('Mods'); //DUMMY PLACEHOLDER - the adopter's mod folder

// THUNDERSTORE BROWSER ////////////////////////////////////////////////
// A sidebar page that embeds the live thunderstore.io community site. The user browses the
// real site and a click on a download link becomes a managed install: the mod is enabled,
// stamped with its package and version, and its dependencies are offered for installation.
// The adopter must carry TWO files beside index.js: thunderstore_browser.js and base_browser.js,
// which it requires from beside itself. Copying only the first fails at require time.
const thunderstoreBrowser = true; //toggle - set false to leave the page unregistered
const { registerThunderstoreBrowser, onceThunderstoreBrowser } = require('./thunderstore_browser');
const TS_COMMUNITY = 'community-slug'; //Thunderstore community for this game - https://thunderstore.io/c/community-slug/
const TS_BROWSER_CONFIG = {
  tsCommunity: TS_COMMUNITY,
  requirements: TS_REQUIREMENTS, //optional - packages the extension manages itself, so they install to their own mod type
  installRequirement: (api, gameSpec, requirement) => //optional - required only when requirements is set
    downloadThunderstoreRequirement(api, gameSpec, requirement, true),
  pageId: `${GAME_ID}-thunderstore-browse`, //optional (default shown)
  pageTitle: 'Browse Thunderstore', //optional - sidebar label
  //hotkey: 'G', //optional - Ctrl+Shift+<key>. Pick a free one: Vortex logs "hotkey already used" and drops the second claim (B is taken)
  //priority: 40, //optional - sidebar position, lower is higher up
  //pageGroup: 'per-game', //optional - 'per-game' hides the page while another game is active
  //icon: 'flash', //optional - icon name, overridden by mdi
  //mdi: 'M0.43 13.16L5.09 21.27...', //optional - raw SVG path data for the sidebar icon (default is Thunderstore's own bolt mark, scaled to a 24x24 viewBox)
  //packageAttribute: 'thunderstorePackage', //optional - mod attribute holding "Namespace-Name" (default shown)
  //versionAttribute: 'thunderstoreVersion', //optional - mod attribute holding the installed version (default shown)
  //allowedHosts: ['thunderstore.io', 'gcdn.thunderstore.io'], //optional - hosts the page may navigate to (default shown)
  //confirmExternal: false, //optional - skip the external-content confirmation shown before the first load
};

// NOTE: The mod type and the installer for browsed mods stay in index.js. This module never
// sets a mod type - the extension's own installers decide where a package lands, which is
// what keeps a mod loader out of the plugins folder.

// NOTE: Managed requirements (the entries in TS_REQUIREMENTS) are routed to
// installRequirement, so they keep their dedicated mod types. Ad-hoc browsed mods must not
// go through the requirement downloader: it disables every mod carrying the requirement's
// mod type before installing, which would switch off previously browsed mods.

// NOTE: Update checks for browsed mods come from this module, gated on the package
// attribute; requirements are skipped because thunderstore_downloader.js already checks
// those. Both run on 'check-mods-version', so register both handlers in context.once().

// *** In setup() function ////////////////////
async function setup(discovery) {
  const fs = require('vortex-api').fs; //DUMMY PLACEHOLDER - use the extension's existing import
  await fs.ensureDirWritableAsync(path.join(discovery.path, PLUGIN_PATH)); //browsed mods need their target folder to exist
}

// *** In applyGame() function ////////////////////
  if (thunderstoreBrowser) {
    registerThunderstoreBrowser(context, spec, TS_BROWSER_CONFIG);
  } //*/

// *** In context.once() function ////////////////////
  if (thunderstoreBrowser) {
    onceThunderstoreBrowser(context.api, spec, TS_BROWSER_CONFIG);
  } //*/

// *** Optional: a toolbar button that opens the page's site in the system browser ////////////////////
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Thunderstore Page', () => {
    const { util } = require('vortex-api');
    util.opn(`https://thunderstore.io/c/${TS_COMMUNITY}/`).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/

log('debug', `${setup}`); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
