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
  pageTitle: 'Browse ModWorkshop', //optional - sidebar label. Keep it short - the sidebar truncates past ~20 characters ('Browse ModWorkshop.net' did not fit)
  //hotkey: 'M', //optional - Ctrl+Shift+<key>. Pick a free one: Vortex logs "hotkey already used" and drops the second claim (B is taken)
  //priority: 40, //optional - sidebar position, lower is higher up
  //pageGroup: 'per-game', //optional - 'per-game' hides the page while another game is active
  //icon: 'plugin', //optional - icon name, overridden by mdi
  //mdi: 'M12.05,0.64L9.97,1.84L10.4,2.58L4.74,5.85L4.31,5.1L2.23,6.31L2.23,8.71L3.09,8.71L3.09,15.24L2.23,15.24L2.23,17.64L4.31,18.85L4.74,18.1L10.4,21.37L9.97,22.11L12.05,23.31L14.13,22.11L13.7,21.37L19.36,18.1L19.79,18.85L21.87,17.64L21.87,15.24L21.01,15.24L21.01,8.71L21.87,8.71L21.87,6.31L19.79,5.1L19.36,5.85L13.7,2.58L14.13,1.84ZM12.05,1.63L12.24,1.74L12.24,4.65L18.3,8.15L20.82,6.69L21.01,6.8L21.01,7.02L18.49,8.47L18.49,15.48L21.01,16.93L21.01,17.15L20.82,17.26L18.3,15.8L12.24,19.3L12.24,22.21L12.05,22.32L11.86,22.21L11.86,19.3L5.8,15.8L3.28,17.26L3.09,17.15L3.09,16.93L5.61,15.48L5.61,8.47L3.09,7.02L3.09,6.8L3.28,6.69L5.8,8.15L11.86,4.65L11.86,1.74ZM12.05,5.28L6.25,8.63L6.25,15.32L12.05,18.67L17.85,15.32L17.85,8.63ZM11.86,5.76L11.86,7.67L8.41,9.66L6.76,8.7ZM12.24,5.76L17.34,8.7L15.69,9.66L12.24,7.67ZM6.57,9.03L8.22,9.99L8.22,13.96L6.57,14.92ZM17.53,9.03L17.53,14.92L15.88,13.96L15.88,9.99ZM8.41,14.29L11.86,16.28L11.86,18.19L6.76,15.25ZM15.69,14.29L17.34,15.25L12.24,18.19L12.24,16.28Z', //optional - raw SVG path data for the sidebar icon (default shown: ModWorkshop's own hexagon-and-cube mark, traced from the site's vector logo)
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
