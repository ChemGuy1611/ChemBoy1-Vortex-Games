const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// MODDB REQUIREMENT /////////////////////////////////////////////////////
const { downloadModDb, checkForModDbUpdate } = require('./moddb_downloader');
const XXX_ID = `${GAME_ID}-XXX`; //mod type id for the requirement (register the mod type + installer in index.js as usual)
const XXX_NAME = "XXX";
const XXX_MODDB_PATH = 'games/placeholder-game'; //or 'mods/placeholder-mod' - https://www.moddb.com/{path}/downloads
const XXX_REV = '0.0.0'; //fallback version if the ModDB RSS feed is unreachable
const XXX_DL_ID = '000000'; //fallback file id if the RSS feed is unreachable - resolved via https://www.moddb.com/downloads/start/000000
const MODDB_REQUIREMENTS = [
  {
    moddbPath: XXX_MODDB_PATH,
    modType: XXX_ID,
    userFacingName: XXX_NAME,
    fallbackVersion: XXX_REV, //optional - omit to leave the version attribute empty when the feed is down
    fallbackFileId: XXX_DL_ID, //optional - omit to fail with a manual-download error page when the feed is down
    //filePattern: /XXX/i, //RegExp tested against RSS item titles - narrows the feed to this requirement's files (default: newest item in the feed)
    //skipDownloadManager: true, //skip the download-manager route and fetch directly - use when the www-host bot-block is confirmed for this page's mirror URLs
    //fileIdAttribute: 'moddbFileId', //mod attribute tracking the installed ModDB file id (default shown)
    //versionPattern: /\[([^[\]]+)\]\s*$/, //RegExp whose capture group 1 is the version, run against the RSS item title (default shown)
    //pageUrl: `https://www.moddb.com/${XXX_MODDB_PATH}/downloads`, //manual-download page (default derived from moddbPath)
    //archiveFileName: 'XXX.zip', //used to name the temp file only if the fallback direct-fetch route can't infer one
  },
  //additional ModDB requirements go here
];

// NOTE: The per-game installer (registerInstaller test/install pair) and the
// mod type registration for XXX_ID stay in index.js - this module only
// downloads, imports, and update-checks the requirement.

// *** In setup() function ////////////////////
async function setup(api, gameSpec) {
  await downloadModDb(api, gameSpec, MODDB_REQUIREMENTS); //install if missing
  await checkForModDbUpdate(api, gameSpec, MODDB_REQUIREMENTS).catch(() => null); //update check should never block setup
}

// *** In context.once() function ////////////////////
  api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return checkForModDbUpdate(api, spec, MODDB_REQUIREMENTS)
      .catch(err => log('warn', `Failed to check for ${XXX_NAME} update: ${err}`));
  }); //*/

// *** In applyGame() function ////////////////////
  //register a toolbar button to (re)download the latest file
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${XXX_NAME}`, () => {
    downloadModDb(context.api, spec, MODDB_REQUIREMENTS, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
