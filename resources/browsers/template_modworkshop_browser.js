const { selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const MWS_REQUIREMENTS = []; //DUMMY PLACEHOLDER - the array from template_modworkshop_downloader.js
const downloadModWorkshopRequirement = () => null; //DUMMY PLACEHOLDER - imported from modworkshop_downloader.js
const MOD_PATH = path.join('Mods'); //DUMMY PLACEHOLDER - the adopter's mod folder

// MODWORKSHOP BROWSER ////////////////////////////////////////////////
// A sidebar page that embeds the live modworkshop.net game section. The user browses the
// real site and a click on a download link becomes a managed install: the mod is enabled and
// stamped with its mod id, version and file id.
// The adopter must carry TWO files beside index.js: modworkshop_browser.js and
// base_browser.js, which it requires from beside itself. Copying only the first fails at
// require time.
const modworkshopBrowser = true; //toggle - set false to leave the page unregistered
const { registerModWorkshopBrowser, onceModWorkshopBrowser } = require('./modworkshop_browser');
const MWS_GAME = 'placeholder'; //ModWorkshop game short_name/slug - https://modworkshop.net/g/placeholder
const MWS_BROWSER_CONFIG = {
  mwsGame: MWS_GAME,
  requirements: MWS_REQUIREMENTS, //optional - mods the extension manages itself, so they install to their own mod type
  installRequirement: (api, gameSpec, requirement) => //optional - required only when requirements is set
    downloadModWorkshopRequirement(api, gameSpec, requirement, true),
  pageId: `${GAME_ID}-modworkshop-browse`, //optional (default shown)
  pageTitle: 'Browse Mods', //optional - sidebar label
  //hotkey: 'M', //optional - Ctrl+Shift+<key>. Pick a free one: Vortex logs "hotkey already used" and drops the second claim (B is taken)
  //priority: 40, //optional - sidebar position, lower is higher up
  //pageGroup: 'per-game', //optional - 'per-game' hides the page while another game is active
  //icon: 'plugin', //optional - icon name, overridden by mdi
  //mdi: 'M22.7,19L13.6,9.9C14.5,7.6,14,4.9,12.1,3C10.1,1,7.1,0.6,4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1,0.9,10.1,2.9,12.1C4.8,14,7.5,14.5,9.8,13.6L18.9,22.7C19.3,23.1,19.9,23.1,20.3,22.7L22.6,20.4C23.1,20,23.1,19.3,22.7,19Z', //optional - raw SVG path data for the sidebar icon (default is a generic wrench - ModWorkshop's own mark could not be traced from a probeable source)
  //packageAttribute: 'modworkshopMod', //optional - mod attribute holding the mod id (default shown)
  //versionAttribute: 'modworkshopVersion', //optional - mod attribute holding the installed version (default shown)
  //fileIdAttribute: 'modworkshopFileId', //optional - mod attribute holding the installed file id (default shown, shared with modworkshop_downloader.js)
  //allowedHosts: ['modworkshop.net', 'storage.modworkshop.net'], //optional - hosts the page may navigate to (default shown)
  //hideAds: false, //optional - stop hiding the site's ad slots (default true; cosmetic only, the requests still happen)
  //adSelectors: ['.ad'], //optional - CSS selectors hidden in the view, REPLACING the defaults
  //confirmExternal: false, //optional - skip the external-content confirmation shown before the first load
};

// NOTE: The mod type and the installer for browsed mods stay in index.js. This module never
// sets a mod type - the extension's own installers decide where a mod lands.

// NOTE: Managed requirements (the entries in MWS_REQUIREMENTS) are routed to
// installRequirement, so they keep their dedicated mod types. Ad-hoc browsed mods must not
// go through the requirement downloader: it disables every mod carrying the requirement's
// mod type before installing, which would switch off previously browsed mods.

// NOTE: ModWorkshop mods declare dependencies with the dependency's own mod record embedded,
// so an install offers to bring them along at no extra API cost beyond resolving the mod
// itself. The "optional" flag on a dependency is not used to filter the prompt - see
// modworkshop_browser.js for why.

// NOTE: A "disable_mod_managers" mod does not lose its plain Download button - only the
// "Install with a manager" protocol-link buttons (mws-mo2://, mws-manager://) are skipped for it.

// NOTE: Update checks for browsed mods come from this module, gated on the mod attribute;
// requirements are skipped because modworkshop_downloader.js already checks those. Both run
// on 'check-mods-version', so register both handlers in context.once().

// *** In setup() function ////////////////////
async function setup(discovery) {
  const fs = require('vortex-api').fs; //DUMMY PLACEHOLDER - use the extension's existing import
  await fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH)); //browsed mods need their target folder to exist
}

// *** In applyGame() function ////////////////////
  if (modworkshopBrowser) {
    registerModWorkshopBrowser(context, spec, MWS_BROWSER_CONFIG);
  } //*/

// *** In context.once() function ////////////////////
  if (modworkshopBrowser) {
    onceModWorkshopBrowser(context.api, spec, MWS_BROWSER_CONFIG);
  } //*/

// *** Optional: a toolbar button that opens the page's site in the system browser ////////////////////
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open ModWorkshop Page', () => {
    const { util } = require('vortex-api');
    util.opn(`https://modworkshop.net/g/${MWS_GAME}`).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/

log('debug', `${setup}`); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
