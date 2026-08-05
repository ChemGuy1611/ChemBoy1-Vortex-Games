const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// MODWORKSHOP REQUIREMENT ////////////////////////////////////////////////
const { downloadModWorkshop, checkForModWorkshopUpdate } = require('./modworkshop_downloader');
const XXX_ID = `${GAME_ID}-XXX`; //mod type id for the requirement (register the mod type + installer in index.js as usual)
const XXX_NAME = "XXX";
const XXX_MWS_MOD_ID = '00000'; //ModWorkshop mod id - https://modworkshop.net/mod/00000
const XXX_REV = '0.0.0'; //fallback version if the ModWorkshop API is unreachable
const XXX_DL_ID = '000000'; //fallback file id if the ModWorkshop API is unreachable - builds https://api.modworkshop.net/files/000000/download
const MWS_REQUIREMENTS = [
  {
    mwsModId: XXX_MWS_MOD_ID,
    modType: XXX_ID,
    userFacingName: XXX_NAME,
    fallbackVersion: XXX_REV, //optional - omit to leave the version attribute empty when the API is down
    fallbackFileId: XXX_DL_ID, //optional - omit to fail with a manual-download error page when the API is down
    //fileType: 'zip', //file extension to require - REQUIRED when the mod also ships .vmz (or any other non-archive extension), which Vortex will not treat as an archive
    //filePattern: /Windows/i, //RegExp tested against the file's display name - narrows multi-file submissions further (default: the mod's primary file)
    //fileIdAttribute: 'modworkshopFileId', //mod attribute tracking the installed ModWorkshop file id (default shown)
    //pageUrl: `https://modworkshop.net/mod/${XXX_MWS_MOD_ID}`, //manual-download page (default derived from mwsModId)
    //autoInstall: false, //opt out of unattended installs - setup and the update check both skip it, only an explicit user action (toolbar button) installs it
  },
  //additional ModWorkshop requirements go here
];

// NOTE: With neither fileType nor filePattern set, the module resolves the
// mod's primary file - the one the site's own download button serves. It
// deliberately does not use the API's /files/latest endpoint, which orders by
// the author-controlled display_order before version and can return an older
// file. Set fileType as soon as a mod uploads more than one file per release.

// NOTE: The per-game installer (registerInstaller test/install pair) and the
// mod type registration for XXX_ID stay in index.js - this module only
// downloads, imports, and update-checks the requirement.

// *** In setup() function ////////////////////
async function setup(api, gameSpec) {
  await downloadModWorkshop(api, gameSpec, MWS_REQUIREMENTS); //install if missing
  await checkForModWorkshopUpdate(api, gameSpec, MWS_REQUIREMENTS).catch(() => null); //update check should never block setup
}

// *** In context.once() function ////////////////////
  api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return checkForModWorkshopUpdate(api, spec, MWS_REQUIREMENTS)
      .catch(err => log('warn', `Failed to check for ${XXX_NAME} update: ${err}`));
  }); //*/

// *** In applyGame() function ////////////////////
  //register a toolbar button to (re)download the latest file
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${XXX_NAME}`, () => {
    downloadModWorkshop(context.api, spec, MWS_REQUIREMENTS, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
