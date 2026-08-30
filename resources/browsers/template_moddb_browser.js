const { selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const MODDB_REQUIREMENTS = []; //DUMMY PLACEHOLDER - the array from template_moddb_downloader.js
const downloadModDbRequirement = () => null; //DUMMY PLACEHOLDER - imported from moddb_downloader.js
const MOD_PATH = path.join('Mods'); //DUMMY PLACEHOLDER - the adopter's mod folder

// MODDB BROWSER ////////////////////////////////////////////////
// A sidebar page that embeds the live moddb.com section for this game. The user browses the
// real site and a click on a download link becomes a managed install: the mod is enabled and
// stamped with its browse key, version and file id.
// The adopter must carry TWO files beside index.js: moddb_browser.js and base_browser.js,
// which it requires from beside itself. Copying only the first fails at require time.
const moddbBrowser = true; //toggle - set false to leave the page unregistered
const { registerModDbBrowser, onceModDbBrowser } = require('./moddb_browser');
const MODDB_PATH = 'games/placeholder'; //the game on moddb.com - https://www.moddb.com/games/placeholder
const MODDB_BROWSER_CONFIG = {
  moddbPath: MODDB_PATH,
  requirements: MODDB_REQUIREMENTS, //optional - mods the extension manages itself, so they install to their own mod type
  installRequirement: (api, gameSpec, requirement) => //optional - required only when requirements is set
    downloadModDbRequirement(api, gameSpec, requirement, true),
  pageId: `${GAME_ID}-moddb-browse`, //optional (default shown)
  pageTitle: 'Browse ModDB', //optional - sidebar label. Keep it short - the sidebar truncates past ~20 characters
  //hotkey: 'D', //optional - Ctrl+Shift+<key>. Pick a free one: Vortex logs "hotkey already used" and drops the second claim (B is taken)
  //priority: 40, //optional - sidebar position, lower is higher up
  //pageGroup: 'per-game', //optional - 'per-game' hides the page while another game is active
  //icon: 'search', //optional - icon name, overridden by mdi
  //mdi: 'M6 6L2 6L2 18L6 18L6 22L10 22L10 18L6 18L6 14L18 14L18 18L14 18L14 22L18 22L18 18L22 18L22 6L18 6L18 2L6 2ZM10 10L6 10L6 6L10 6ZM18 10L14 10L14 6L18 6Z', //optional - raw SVG path data for the sidebar icon (default shown: ModDB's own mark, traced from the site's vector logo)
  //homePath: 'games/placeholder/downloads', //optional - where the page opens, if not '{moddbPath}/mods'
  //packageAttribute: 'moddbBrowseId', //optional - mod attribute holding the browse key (default shown)
  //versionAttribute: 'moddbVersion', //optional - mod attribute holding the installed version (default shown)
  //fileIdAttribute: 'moddbFileId', //optional - mod attribute holding the installed file id (default shown, shared with moddb_downloader.js)
  //allowedHosts: ['moddb.com'], //optional - hosts the page may navigate to (default shown; one entry covers www., media. and rss.)
  //hideAds: false, //optional - stop hiding the site's ad slots (default true; cosmetic only, the requests still happen)
  //adSelectors: ['ins.adsbygoogle'], //optional - CSS selectors hidden in the view, REPLACING the defaults
  //blockAdPopups: false, //optional - stop dropping navigations to ad networks (default true)
  //confirmExternal: false, //optional - skip the external-content confirmation shown before the first load
};

// NOTE: ModDB is the one source Vortex's download manager cannot fetch from. The www host
// rejects any client that is not a real browser, mirror URLs included, so this module fetches
// the file itself in the renderer and hands Vortex the result. Nothing in index.js changes
// because of that, but it is why a browsed ModDB download shows an "Installing ..." activity
// notification rather than a progress bar on the Downloads page.

// NOTE: The mod type and the installer for browsed mods stay in index.js. This module never
// sets a mod type - the extension's own installers decide where a mod lands.

// NOTE: A browsed mod is keyed on '{entity path}#{letters of the file slug}', e.g.
// 'mods/realrtcw-realism-mod#realrtcw'. That collapses a file's releases onto one key
// (realrtcw-50, realrtcw-40) while keeping its neighbours apart (realrtcw-30-lite-edition),
// which is what makes an update check possible on a site that mints a new file id per release.

// NOTE: A managed requirement is left alone unless it declares a browseKey naming the one file
// it installs - a requirement names a mod page, and a key names a single file on that page.
// Read the key off the file's own URL: https://www.moddb.com/{path}/downloads/{slug} becomes
// '{path}#' plus the slug with everything but letters stripped.
const MODDB_REQUIREMENTS_WITH_BROWSE_KEY = [ //DUMMY PLACEHOLDER - the shape, not a second array
  {
    moddbPath: 'games/placeholder',
    browseKey: 'games/placeholder#placeholdermod', //optional - routes this file to installRequirement
  },
];

// NOTE: Update checks for browsed mods come from this module, gated on the mod attribute;
// requirements are skipped because moddb_downloader.js already checks those. Both run on
// 'check-mods-version', so register both handlers in context.once().

// *** In setup() function ////////////////////
async function setup(discovery) {
  const fs = require('vortex-api').fs; //DUMMY PLACEHOLDER - use the extension's existing import
  await fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH)); //browsed mods need their target folder to exist
}

// *** In applyGame() function ////////////////////
  if (moddbBrowser) {
    registerModDbBrowser(context, spec, MODDB_BROWSER_CONFIG);
  } //*/

// *** In context.once() function ////////////////////
  if (moddbBrowser) {
    onceModDbBrowser(context.api, spec, MODDB_BROWSER_CONFIG);
  } //*/

// *** Optional: a toolbar button that opens the page's site in the system browser ////////////////////
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open ModDB Page', () => {
    const { util } = require('vortex-api');
    util.opn(`https://www.moddb.com/${MODDB_PATH}`).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/

log('debug', `${setup}${MODDB_REQUIREMENTS_WITH_BROWSE_KEY}`); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
