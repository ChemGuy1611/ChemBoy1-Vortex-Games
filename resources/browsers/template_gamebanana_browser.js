const { selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const GB_REQUIREMENTS = []; //DUMMY PLACEHOLDER - the array from template_gamebanana_downloader.js
const downloadGameBananaRequirement = () => null; //DUMMY PLACEHOLDER - imported from gamebanana_downloader.js
const MOD_PATH = path.join('Mods'); //DUMMY PLACEHOLDER - the adopter's mod folder

// GAMEBANANA BROWSER ////////////////////////////////////////////////
// A sidebar page that embeds the live gamebanana.com site. The user browses the real
// site and a click on a download link becomes a managed install: the mod is enabled and
// stamped with its submission, version and file id.
// The adopter must carry TWO files beside index.js: gamebanana_browser.js and base_browser.js,
// which it requires from beside itself. Copying only the first fails at require time.
const gamebananaBrowser = true; //toggle - set false to leave the page unregistered
const { registerGameBananaBrowser, onceGameBananaBrowser } = require('./gamebanana_browser');
const GB_GAME_ID = '0000'; //GameBanana game id - https://gamebanana.com/games/0000 (from _aGame._idRow on any of the game's submissions)
const GB_BROWSER_CONFIG = {
  gbGameId: GB_GAME_ID,
  requirements: GB_REQUIREMENTS, //optional - submissions the extension manages itself, so they install to their own mod type
  installRequirement: (api, gameSpec, requirement) => //optional - required only when requirements is set
    downloadGameBananaRequirement(api, gameSpec, requirement, true),
  pageId: `${GAME_ID}-gamebanana-browse`, //optional (default shown)
  pageTitle: 'Browse GameBanana', //optional - sidebar label
  //hotkey: 'G', //optional - Ctrl+Shift+<key>. Pick a free one: Vortex logs "hotkey already used" and drops the second claim (B is taken)
  //gbSection: 'mods', //optional - section the page opens on (default shown); e.g. 'tools', 'sounds'
  //homeUrl: 'https://gamebanana.com/games/0000', //optional - full override for the home URL, e.g. the game's hub page instead of one section
  //priority: 40, //optional - sidebar position, lower is higher up
  //pageGroup: 'per-game', //optional - 'per-game' hides the page while another game is active
  //icon: 'search', //optional - icon name, overridden by mdi
  //mdi: 'M9.5 14.5V13.25H13.25V12H14.5V8.25H15.75V4.5H14.5V2H18.25V4.5H19.5V5.75H20.75V7H22V15.75H20.75V18.25H19.5V19.5H18.25V20.75H15.75V22H7V20.75H4.5V19.5H3.25V18.25H2V14.5z', //optional - raw SVG path data for the sidebar icon (default is GameBanana's own banana mark, traced from the site's 16x16 sprite)
  //packageAttribute: 'gamebananaItem', //optional - mod attribute holding "Model-itemId" (default shown)
  //versionAttribute: 'gamebananaVersion', //optional - mod attribute holding the installed version (default shown)
  //fileIdAttribute: 'gamebananaFileId', //optional - mod attribute holding the installed file id (default shown, shared with gamebanana_downloader.js)
  //versionPattern: /\(Update\s+(.+?)\)/, //optional - group 1 is the version inside an update title, used when a submission leaves _sVersion empty (default shown)
  //allowedHosts: ['gamebanana.com'], //optional - hosts the page may navigate to (default shown; one entry covers files./filecacheNN./images. subdomains)
  //hideAds: false, //optional - stop hiding the site's ad slots (default true; cosmetic only, the requests still happen)
  //adSelectors: ['.AdTagModule', '[data-pw-desk]'], //optional - CSS selectors hidden in the view, REPLACING the defaults
  //blockAdPopups: false, //optional - let ad destinations open in the system browser (default true drops them)
  //blockedHosts: ['doubleclick.net'], //optional - ad hosts whose links are dropped, REPLACING the defaults
  //confirmExternal: false, //optional - skip the external-content confirmation shown before the first load
};

// NOTE: The mod type and the installer for browsed mods stay in index.js. This module never
// sets a mod type - the extension's own installers decide where a submission lands, which is
// what keeps a mod injector out of the mods folder.

// NOTE: Managed requirements (the entries in GB_REQUIREMENTS) are routed to
// installRequirement, so they keep their dedicated mod types. Ad-hoc browsed mods must not
// go through the requirement downloader: it disables every mod carrying the requirement's
// mod type before installing, which would switch off previously browsed mods.

// NOTE: GameBanana has no dependency graph, so nothing is offered alongside an install, and
// no API maps a downloaded file back to its submission - the page remembers the submissions
// the user opens and matches a claimed download against them by file id or file name.

// NOTE: Update checks for browsed mods come from this module, gated on the submission
// attribute; requirements are skipped because gamebanana_downloader.js already checks
// those. Both run on 'check-mods-version', so register both handlers in context.once().

// *** In setup() function ////////////////////
async function setup(discovery) {
  const fs = require('vortex-api').fs; //DUMMY PLACEHOLDER - use the extension's existing import
  await fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH)); //browsed mods need their target folder to exist
}

// *** In applyGame() function ////////////////////
  if (gamebananaBrowser) {
    registerGameBananaBrowser(context, spec, GB_BROWSER_CONFIG);
  } //*/

// *** In context.once() function ////////////////////
  if (gamebananaBrowser) {
    onceGameBananaBrowser(context.api, spec, GB_BROWSER_CONFIG);
  } //*/

// *** Optional: a toolbar button that opens the page's site in the system browser ////////////////////
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open GameBanana Page', () => {
    const { util } = require('vortex-api');
    util.opn(`https://gamebanana.com/games/${GB_GAME_ID}`).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/

log('debug', `${setup}`); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
