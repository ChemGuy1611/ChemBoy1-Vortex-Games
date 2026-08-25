const { selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const MI_REQUIREMENTS = []; //DUMMY PLACEHOLDER - the array from template_fcmodding_downloader.js
const downloadFcModdingRequirement = () => null; //DUMMY PLACEHOLDER - imported from fcmodding_downloader.js
const MI_PATH = path.join('FCModInstaller'); //DUMMY PLACEHOLDER - the adopter's Mod Installer folder

// FCMODDING BROWSER //////////////////////////////////////////////////
// A sidebar page that embeds the live downloads.fcmodding.com section for this game. The user
// browses the real catalog and a click on a download link becomes a managed install: the mod
// is enabled and stamped with its file name and version.
// The adopter must carry TWO files beside index.js: fcmodding_browser.js and base_browser.js,
// which it requires from beside itself. Copying only the first fails at require time.
const fcmoddingBrowser = true; //toggle - set false to leave the page unregistered
const { registerFcModdingBrowser, onceFcModdingBrowser } = require('./fcmodding_browser');
const FC = 'fcXXX'; //DUMMY PLACEHOLDER - the extension's existing section slug (fc3, fc4, fc5, fc6, fcnd, fcp)
const FCM_BROWSER_CONFIG = {
  fcGame: FC, //section slug - https://downloads.fcmodding.com/fcXXX/
  requirements: MI_REQUIREMENTS, //optional - mods the extension manages itself, so they install to their own mod type
  installRequirement: (api, gameSpec, requirement) => //optional - required only when requirements is set
    downloadFcModdingRequirement(api, gameSpec, requirement, true),
  pageId: `${GAME_ID}-fcmodding-browse`, //optional (default shown)
  pageTitle: 'Browse Far Cry Mods', //optional - sidebar label. Keep it short - the sidebar truncates past ~20 characters
  //hotkey: 'F', //optional - Ctrl+Shift+<key>. Pick a free one: Vortex logs "hotkey already used" and drops the second claim (B is taken)
  //priority: 40, //optional - sidebar position, lower is higher up
  //pageGroup: 'per-game', //optional - 'per-game' hides the page while another game is active
  //icon: 'search', //optional - icon name, overridden by mdi
  //mdi: 'M10,21V18H3L8,13H5L10,8H7L12,3L17,8H14L19,13H16L21,18H14V21H10Z', //optional - raw SVG path data for the sidebar icon (default shown: mdi's pine-tree, the one part of the fcmodding mark that survives at 24x24)
  //packageAttribute: 'fcmoddingFile', //optional - mod attribute holding the file name (default shown)
  //versionAttribute: 'fcmoddingVersion', //optional - mod attribute holding the installed version (default shown, shared with fcmodding_downloader.js)
  //allowedHosts: ['downloads.fcmodding.com', 'fcmodding.com'], //optional - hosts the page may navigate to (default shown)
  //confirmExternal: false, //optional - skip the external-content confirmation shown before the first load
};

// NOTE: The mod type and the installer for browsed mods stay in index.js. This module never
// sets a mod type - the extension's own installers decide where a mod lands. FCMI-format mods
// (.a2/.a3/.a4/.a5/.bin) keep going to the existing Mod Installer installers.

// NOTE: Managed requirements (the entries in MI_REQUIREMENTS) are routed to installRequirement,
// so the Mod Installer keeps its dedicated mod type when it is downloaded from the page. Ad-hoc
// browsed mods must not go through the requirement downloader: it disables every mod carrying
// the requirement's mod type before installing.

// NOTE: The site publishes no dependency data, so no dependency prompt is shown and no extra
// lookups are made.

// NOTE: Some downloads on this host are opaque /files/ ids that redirect to a Google Drive
// folder. drive.google.com is deliberately not in allowedHosts, so those open in the system
// browser instead of failing inside the page.

// NOTE: Update checks for browsed mods come from this module, gated on the mod attribute;
// requirements are skipped because fcmodding_downloader.js already checks those. Both run on
// 'check-mods-version', so register both handlers in context.once().

// *** In setup() function ////////////////////
async function setup(discovery) {
  const fs = require('vortex-api').fs; //DUMMY PLACEHOLDER - use the extension's existing import
  await fs.ensureDirWritableAsync(path.join(discovery.path, MI_PATH)); //browsed mods need their target folder to exist
}

// *** In applyGame() function ////////////////////
  if (fcmoddingBrowser) {
    registerFcModdingBrowser(context, spec, FCM_BROWSER_CONFIG);
  } //*/

// *** In context.once() function ////////////////////
  if (fcmoddingBrowser) {
    onceFcModdingBrowser(context.api, spec, FCM_BROWSER_CONFIG);
  } //*/

// *** Optional: the existing toolbar buttons stay as they are ////////////////////
// "Open Far Cry Mods Site" (mods.farcry.info) is unaffected by this page - that database
// indexes mods posted in the FCModding Discord, which this module does not download from.
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Far Cry Mod Installer Site', () => {
    const { util } = require('vortex-api');
    util.opn(`https://downloads.fcmodding.com/${FC}/`).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/

log('debug', `${setup}`); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
