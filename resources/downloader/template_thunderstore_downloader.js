const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// THUNDERSTORE REQUIREMENT ////////////////////////////////////////////////
const { downloadThunderstore, checkForThunderstoreUpdate } = require('./thunderstore_downloader');
const XXX_ID = `${GAME_ID}-XXX`; //mod type id for the requirement (register the mod type + installer in index.js as usual)
const XXX_NAME = "XXX";
const XXX_TS_COMMUNITY = 'community-slug'; //Thunderstore community for this game - https://thunderstore.io/c/community-slug/
const XXX_TS_NAMESPACE = 'Namespace'; //team/uploader, first path segment of the package page
const XXX_TS_NAME = 'PackageName'; //package name, second path segment
const XXX_REV = '0.0.0'; //fallback version if the Thunderstore API is unreachable - also builds the fallback download URL
const TS_REQUIREMENTS = [
  {
    tsCommunity: XXX_TS_COMMUNITY, //optional - omit to resolve through the community-independent package endpoint
    tsNamespace: XXX_TS_NAMESPACE,
    tsName: XXX_TS_NAME,
    modType: XXX_ID,
    userFacingName: XXX_NAME, //notifications, error messages, and the name shown in the mod list
    fallbackVersion: XXX_REV, //optional - omit to fail with a manual-download error page when the API is down
    //versionAttribute: 'thunderstoreVersion', //mod attribute tracking the installed version for update checks (default shown)
    //pageUrl: `https://thunderstore.io/c/${XXX_TS_COMMUNITY}/p/${XXX_TS_NAMESPACE}/${XXX_TS_NAME}/`, //manual-download page (default derived from the fields above)
    //autoInstall: false, //opt out of unattended installs - setup and the update check both skip it, only an explicit user action (toolbar button) installs it
    //pinVersion: XXX_REV, //hold at this package version - while it is installed the update check returns without making any request; no companion field needed, every version has a predictable download URL
  },
  //additional Thunderstore requirements go here
];

// NOTE: There is no archive-name pattern and no version-resolve strategy to
// pick. Thunderstore versions are plain semver and every version has a
// predictable download URL, so fallbackVersion alone is enough to install when
// the API is unreachable.

// NOTE: Thunderstore packages declare their dependencies, but this module does
// NOT install them - each dependency that Vortex should manage needs its own
// entry in TS_REQUIREMENTS with its own mod type. A requirement's declared
// dependencies are logged on install, and getThunderstoreDependencies() returns
// them as "Namespace-Name-Version" strings if the extension wants to check.

// NOTE: The per-game installer (registerInstaller test/install pair) and the
// mod type registration for XXX_ID stay in index.js - this module only
// downloads, imports, and update-checks the requirement. A Thunderstore package
// always carries a manifest.json at its archive root, which makes a reliable
// testSupported signal.

// *** In setup() function ////////////////////
async function setup(api, gameSpec) {
  await downloadThunderstore(api, gameSpec, TS_REQUIREMENTS); //install if missing
  await checkForThunderstoreUpdate(api, gameSpec, TS_REQUIREMENTS).catch(() => null); //update check should never block setup
}

// *** In context.once() function ////////////////////
  api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return checkForThunderstoreUpdate(api, spec, TS_REQUIREMENTS)
      .catch(err => log('warn', `Failed to check for ${XXX_NAME} update: ${err}`));
  }); //*/

// *** In applyGame() function ////////////////////
  //register a toolbar button to (re)download the latest version
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${XXX_NAME}`, () => {
    downloadThunderstore(context.api, spec, TS_REQUIREMENTS, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
