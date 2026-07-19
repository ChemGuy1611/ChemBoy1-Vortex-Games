const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// GAMEBANANA REQUIREMENT /////////////////////////////////////////////////
const { downloadGameBanana, checkForGameBananaUpdate } = require('./gamebanana_downloader');
const XXX_ID = `${GAME_ID}-XXX`; //mod type id for the requirement (register the mod type + installer in index.js as usual)
const XXX_NAME = "XXX";
const XXX_GB_ITEM_TYPE = 'Tool'; //apiv11 model name: 'Tool', 'Mod', ...
const XXX_GB_ITEM_ID = '0000'; //GameBanana item id - https://gamebanana.com/tools/0000
const XXX_REV = '0.0.0'; //fallback version if the GameBanana API is unreachable
const XXX_DL_ID = '000000'; //fallback file id if the GameBanana API is unreachable - builds https://gamebanana.com/dl/000000
const GB_REQUIREMENTS = [
  {
    gbItemType: XXX_GB_ITEM_TYPE,
    gbItemId: XXX_GB_ITEM_ID,
    modType: XXX_ID,
    userFacingName: XXX_NAME,
    fallbackVersion: XXX_REV, //optional - omit to leave the version attribute empty when the API is down
    fallbackFileId: XXX_DL_ID, //optional - omit to fail with a manual-download error page when the API is down
    //fileNamePattern: /Windows/i, //RegExp tested against _aFiles[]._sFile - narrows multi-file submissions to this requirement's file (default: newest file)
    //fileIdAttribute: 'gamebananaFileId', //mod attribute tracking the installed GameBanana file id (default shown)
    //versionPattern: /\(Update\s+(.+?)\)/, //RegExp whose capture group 1 is the version, run against the Updates title (default shown)
    //pageUrl: `https://gamebanana.com/tools/${XXX_GB_ITEM_ID}`, //manual-download page (default derived from gbItemType + gbItemId)
  },
  //additional GameBanana requirements go here
];

// NOTE: The per-game installer (registerInstaller test/install pair) and the
// mod type registration for XXX_ID stay in index.js - this module only
// downloads, imports, and update-checks the requirement.

// *** In setup() function ////////////////////
async function setup(api, gameSpec) {
  await downloadGameBanana(api, gameSpec, GB_REQUIREMENTS); //install if missing
  await checkForGameBananaUpdate(api, gameSpec, GB_REQUIREMENTS).catch(() => null); //update check should never block setup
}

// *** In context.once() function ////////////////////
  api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return checkForGameBananaUpdate(api, spec, GB_REQUIREMENTS)
      .catch(err => log('warn', `Failed to check for ${XXX_NAME} update: ${err}`));
  }); //*/

// *** In applyGame() function ////////////////////
  //register a toolbar button to (re)download the latest file
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${XXX_NAME}`, () => {
    downloadGameBanana(context.api, spec, GB_REQUIREMENTS, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
