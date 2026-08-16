const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// FCMODDING REQUIREMENT /////////////////////////////////////////////////////
const { downloadFcModding, checkForFcModdingUpdate } = require('./fcmodding_downloader');
const XXX_ID = `${GAME_ID}-XXX`; //mod type id for the requirement (register the mod type + installer in index.js as usual)
const XXX_NAME = "XXX";
const XXX_FILENAME = "FCModInstaller.zip"; //file name on the host - https://downloads.fcmodding.com/files/{fileName}
const XXX_URL_ERR = "https://downloads.fcmodding.com/all/mod-installer/"; //manual-download page, also used by the "Open ... Site" toolbar action
const FCMODDING_REQUIREMENTS = [
  {
    fileName: XXX_FILENAME,
    modType: XXX_ID,
    userFacingName: XXX_NAME, //notifications, error messages, and the name shown in the mod list
    pageUrl: XXX_URL_ERR, //manual-download page, stamped as the mod's "Source" link (default: the Mod Installer page shown above)
    //fallbackVersion: '20250412-1300', //optional - version stamp used when neither the redirect nor the page can be read
    //versionPattern: /_(\d{8}-\d{4})\.zip$/i, //RegExp whose capture group 1 is the version, run against the resolved file name (default shown)
    //pageVersionPattern: /<i>\s*v(\d{8}-\d{4})\s*<\/i>/i, //RegExp whose capture group 1 is the version, run against the page HTML as a fallback signal (default shown)
    //versionAttribute: 'fcmoddingVersion', //mod attribute tracking the installed build stamp (default shown)
    //autoInstall: false, //opt out of unattended installs - setup and the update check both skip it, only an explicit user action (toolbar button) installs it
  },
  //additional fcmodding.com requirements go here
];

// NOTE: There is no pinVersion here, unlike the other companion modules. The
// host culls builds older than one release, so a pinned build's URL starts
// 404ing within a release or two - see FCMODDING_API.md.

// NOTE: The per-game installer (registerInstaller test/install pair) and the
// mod type registration for XXX_ID stay in index.js - this module only
// downloads, imports, and update-checks the requirement.

// *** In setup() function ////////////////////
async function setup(api, gameSpec) {
  await downloadFcModding(api, gameSpec, FCMODDING_REQUIREMENTS); //install if missing
  await checkForFcModdingUpdate(api, gameSpec, FCMODDING_REQUIREMENTS).catch(() => null); //update check should never block setup
}

// *** In context.once() function ////////////////////
  api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return checkForFcModdingUpdate(api, spec, FCMODDING_REQUIREMENTS)
      .catch(err => log('warn', `Failed to check for ${XXX_NAME} update: ${err}`));
  }); //*/

// *** In applyGame() function ////////////////////
  //register a toolbar button to (re)download the latest build
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${XXX_NAME}`, () => {
    downloadFcModding(context.api, spec, FCMODDING_REQUIREMENTS, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
