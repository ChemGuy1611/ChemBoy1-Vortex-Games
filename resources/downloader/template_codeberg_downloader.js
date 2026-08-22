const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const spec = { game: { id: GAME_ID } }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT
const context = { api }; //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// CODEBERG REQUIREMENT ///////////////////////////////////////////////////
const { downloadCodeberg, checkForCodebergUpdate, isCodebergRequirementInstalled } = require('./codeberg_downloader');
const XXX_ID = `${GAME_ID}-XXX`; //mod type id for the requirement (register the mod type + installer in index.js as usual)
const XXX_NAME = "XXX";
const XXX_REPO = 'author/Repo'; //Codeberg repository - https://codeberg.org/author/Repo
const XXX_VER = '0.0.0'; //fallback version if the Codeberg API is unreachable
const XXX_ARCHIVE_PATTERN = new RegExp(`^Repo_(\\d+\\.\\d+(?:\\.\\d+)?)`, 'i'); //capture group 1 is the version
const CODEBERG_REQUIREMENTS = [
  {
    repo: XXX_REPO,
    modType: XXX_ID,
    userFacingName: XXX_NAME, //notifications, error messages, and the name shown in the mod list
    assetPattern: XXX_ARCHIVE_PATTERN, //RegExp tested against the release asset name - REQUIRED as soon as a release ships more than one file; capture group 1 is the version
    fallbackVersion: XXX_VER, //optional - omit to leave the version attribute empty when the API is down
    //apiBase: 'https://codeberg.org/api/v1', //any Forgejo/Gitea instance (default shown) - the human page URL is derived from it
    //pageUrl: `https://codeberg.org/${XXX_REPO}/releases`, //manual-download page (default derived from repo)
    //allowPrerelease: true, //fetch the newest release including pre-releases (default: latest stable only)
    //releaseTag: 'nightly', //fetch one fixed release by tag - for a rolling tag upstream MOVES (same role prereleaseTag plays in downloader.js)
    //trackByAssetDate: true, //detect updates by the asset upload time instead of the version tag - for a rolling tag whose name never changes; reads created_at, since Forgejo assets have no updated_at
    //autoInstall: false, //opt out of unattended installs - the update check skips it too, so only an explicit user action (a notification button or a toolbar action) installs it
    //pinVersion: XXX_VER, //hold at this release - while it is installed the update check returns without making any request
    //pinTag: XXX_VER, //the tag to fetch when it is not simply pinVersion; the same tag with its leading 'v' toggled is retried automatically on a miss, so most repos need no pinTag
  },
  //additional Codeberg requirements go here
];

// NOTE: The per-game installer (registerInstaller test/install pair) and the
// mod type registration for XXX_ID stay in index.js - this module only
// downloads, imports, and update-checks the requirement.

// NOTE: Forgejo release assets carry created_at and NO updated_at, so
// trackByAssetDate compares upload times taken from created_at. Everything
// else about release selection matches downloader.js, because the Forgejo API
// is shaped like GitHub's.

// *** In setup() function ////////////////////
// Unattended install - use this when the requirement is mandatory (a mod loader):
async function setup(api, gameSpec) {
  await downloadCodeberg(api, gameSpec, CODEBERG_REQUIREMENTS); //install if missing
  await checkForCodebergUpdate(api, gameSpec, CODEBERG_REQUIREMENTS).catch(() => null); //update check should never block setup
}

// *** OPTIONAL requirement - ask instead of installing ////////////////////
// For a requirement the user should choose (a fix or a QoL plugin rather than a mod loader):
// set autoInstall: false on it and call this from setup() instead of downloadCodeberg. The
// notification is suppressible, so pair it with the toolbar action below.
function downloadXXXNotify(api) {
  if (isCodebergRequirementInstalled(api, GAME_ID, CODEBERG_REQUIREMENTS[0])) {
    return;
  }
  const NOTIF_ID = `${GAME_ID}-XXX`;
  const MOD_NAME = XXX_NAME;
  const MESSAGE = `Would you like to download ${MOD_NAME}?`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Download',
        action: (dismiss) => {
          downloadCodeberg(api, spec, CODEBERG_REQUIREMENTS);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `${MOD_NAME} is XXX.\n`
                + `Click the button below to download and install ${MOD_NAME}.\n`
          }, [
            {
              label: `Download ${MOD_NAME}`, action: () => {
                downloadCodeberg(api, spec, CODEBERG_REQUIREMENTS);
                dismiss();
              }
            },
            { label: 'Not Now', action: () => dismiss() },
            {
              label: 'Never Show Again', action: () => {
                api.suppressNotification(NOTIF_ID);
                dismiss();
              }
            },
          ]);
        },
      },
    ],
  });
}

// *** In context.once() function ////////////////////
  api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return checkForCodebergUpdate(api, spec, CODEBERG_REQUIREMENTS)
      .catch(err => log('warn', `Failed to check for ${XXX_NAME} update: ${err}`));
  }); //*/

// *** In applyGame() function ////////////////////
  //register a toolbar button to (re)download the latest release
  //REQUIRED for an autoInstall: false requirement - the notification is otherwise the only
  //install path, and "Never Show Again" would leave the user with no way back
  context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${XXX_NAME}`, () => {
    downloadCodeberg(context.api, spec, CODEBERG_REQUIREMENTS, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
