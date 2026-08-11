const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// BEPINEX BLEEDING EDGE REQUIREMENT /////////////////////////////////////
const { downloadBepinexBe, checkForBepinexBeUpdate } = require('./bepinexbe_downloader');
const BEPINEX_ID = `${GAME_ID}-bepinex`; //mod type id for the requirement (register the mod type + installer in index.js as usual)
const BEPINEX_NAME = "BepInEx";
const BEP_BE_VER = '785'; //fallback build if the builds.bepinex.dev index page is unreachable
const BEP_BE_COMMIT = '6abdba4'; //git commit for the fallback build - only used to build the fallback URL
const BEPINEX_URL = `https://builds.bepinex.dev/projects/bepinex_be/${BEP_BE_VER}/BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.${BEP_BE_VER}%2B${BEP_BE_COMMIT}.zip`;
const BEPINEX_BE_REQUIREMENTS = [
  {
    //RegExp tested against the artifact file names in each build block - do NOT set the g flag, a
    //stateful RegExp would match every other call. IL2CPP games use IL2CPP, mono games use Mono.
    artifactPattern: /^BepInEx-Unity\.IL2CPP-win-x64-/i,
    modType: BEPINEX_ID,
    userFacingName: BEPINEX_NAME, //notifications, error messages, and the name shown in the mod list
    fallbackBuild: BEP_BE_VER, //optional - build number recorded when the index page is unreachable
    fallbackArtifactUrl: BEPINEX_URL, //optional - omit to fail with a manual-download error page when the index is unreachable
    autoInstall: false, //the loader choice dialog installs this, never the update check
    //projectPath: 'projects/bepinex_be', //project whose build index is parsed, relative to https://builds.bepinex.dev (default shown)
    //buildAttribute: 'bepinexBeBuild', //mod attribute tracking the installed build number (default shown)
    //pageUrl: 'https://builds.bepinex.dev/projects/bepinex_be', //manual-download page (default derived from projectPath)
    //pinVersion: BEP_BE_VER, //hold at this build - while it is installed the update check returns without making any request
    //pinArtifactUrl: BEPINEX_URL, //only needed if the pinned build has scrolled off the index page
  },
  //additional builds.bepinex.dev requirements go here
];

// NOTE: The per-game installer (registerInstaller test/install pair) and the
// mod type registration for BEPINEX_ID stay in index.js - this module only
// downloads, imports, and update-checks the requirement.

// *** In setup() function ////////////////////
async function setup(api, gameSpec) {
  await downloadBepinexBe(api, gameSpec, BEPINEX_BE_REQUIREMENTS); //install if missing
  await checkForBepinexBeUpdate(api, gameSpec, BEPINEX_BE_REQUIREMENTS).catch(() => null); //update check should never block setup
}

// *** In context.once() function ////////////////////
  api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return checkForBepinexBeUpdate(api, spec, BEPINEX_BE_REQUIREMENTS)
      .catch(err => log('warn', `Failed to check for ${BEPINEX_NAME} update: ${err}`));
  }); //*/

// *** In applyGame() function ////////////////////
  //register a toolbar button to (re)download the latest build
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${BEPINEX_NAME}`, () => {
    downloadBepinexBe(context.api, spec, BEPINEX_BE_REQUIREMENTS, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
