const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// REQUIREMENTS ///////////////////////////////////////////////////
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, resolveVersionByAssetDate, resolveVersionByModVersion, resolveVersionByDirectCopyMarker, resolveVersionByNightlyRun, testRequirementVersion } = require('./downloader');
const semver = require('semver');
const XXX_ID = `${GAME_ID}-XXX`;
const XXX_NAME = "XXX";
const VER = '0.0.0';
const XXX_ARC_NAME = `XXX${VER}.zip`;
const XXX_FILE = 'XXX.exe'; // assembly/marker file used to detect an installed requirement (matched case-insensitively)
const AUTHOR = 'XXX'; // Author of the repo
const REPO = 'XXX'; // Repository name on GitHub
const XXX_URL_API = `https://api.github.com/repos/${AUTHOR}/${REPO}`; //api url
const REQUIREMENTS = [
  {
    archiveFileName: XXX_ARC_NAME,
    modType: XXX_ID, //the module assigns this to the installed mod itself; findModByFile only matches mods carrying it (untyped mods are not considered)
    assemblyFileName: XXX_FILE,
    userFacingName: XXX_NAME, //notifications, error messages, and the name shown in the mod list
    githubUrl: XXX_URL_API,
    findMod: (api) => findModByFile(api, XXX_ID, XXX_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, XXX_ARC_NAME),
    fileArchivePattern: new RegExp(/^XXX(\d+\.\d+\.\d+)/, 'i'), //from ARC_NAME
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]), //*/
    //versionFile: 'version.txt', //file to check for version number (needed if version is not in the archive name)
    //resolveVersion: (api) => resolveVersionByFile(api, REQUIREMENTS[0]),
    //allowPrerelease: true, //include GitHub pre-release versions (default false)
    //prereleaseTag: 'experimental', //fetch a specific rolling pre-release tag directly (e.g. UE4SS); skips the prerelease scan
    //trackByAssetDate: true, //detect updates by the asset's GitHub upload time, not the version tag (rolling pre-release whose tag never changes i.e. UE4SS)
    //resolveVersion: (api) => resolveVersionByAssetDate(api, REQUIREMENTS[0]), //use together with trackByAssetDate
    //resolveVersion: (api) => resolveVersionByModVersion(api, REQUIREMENTS[0]), //reads the version stamped on the installed mod at install time; use when the version is only in the release tag (asset filename is versionless) and fileArchivePattern has no capture group
    //autoInstall: false, //opt out of unattended installs - setup and the update check both skip it, only an explicit user action (toolbar button) installs it
    //pinVersion: VER, //hold at this exact release - while it is the installed version the update check returns without making any request, and it overrides allowPrerelease/prereleaseTag/trackByAssetDate
    //pinTag: `v${VER}`, //only if the release tag is not just pinVersion - the same tag with the leading 'v' toggled is retried automatically on a 404
  },
]; //*/

/* Direct-copy requirement: for upstreams that publish a naked file instead of an archive
// (a bare .dll, .exe, ...). Vortex's install pipeline can only take archives, so setting
// directCopyPath fetches the matched asset straight to that path and never registers a mod -
// findMod/findDownloadId/modType/assemblyFileName are not read for this requirement.
const XXX_TARGET_SUBFOLDER = 'Mods'; //game-relative folder the file belongs in
const DIRECT_REQUIREMENTS = [
  {
    archiveFileName: XXX_FILE,             //matched against the release asset name
    userFacingName: XXX_NAME,
    githubUrl: XXX_URL_API,
    //placeholder only - GAME_PATH is '' at module load, so setup() must reassign this (see below)
    directCopyPath: path.join(GAME_PATH, XXX_TARGET_SUBFOLDER, XXX_FILE),
    //directCopyModType: XXX_ID,           //optional - counts as installed when a mod of this type exists (user installed an archived build from Nexus instead)
    fileArchivePattern: new RegExp(/^XXX\.dll$/, 'i'),
    resolveVersion: (api) => resolveVersionByDirectCopyMarker(api, DIRECT_REQUIREMENTS[0]), //reads the <directCopyPath>.version.json marker written at install
    autoInstall: false,
    //pinVersion: VER,
  },
];

// *** In setup(), immediately after GAME_PATH = discovery.path ////////////////////
// REQUIRED: the array above is built at module load, when GAME_PATH is still '' - without
// this line the baked-in path stays relative and never resolves.
DIRECT_REQUIREMENTS[0].directCopyPath = path.join(GAME_PATH, XXX_TARGET_SUBFOLDER, XXX_FILE);
//*/

/* Nightly requirement: for upstreams whose bleeding-edge builds are GitHub Actions CI
// artifacts rather than releases (served through nightly.link). Setting nightlyUrl switches
// the requirement to resolving its identity from the Actions run listing - the newest
// successful run of nightlyWorkflow on nightlyBranch - and comparing by run number.
// The download itself is an ordinary archive install; only the version identity differs.
const XXX_URL_NIGHTLY = `https://nightly.link/${AUTHOR}/${REPO}/workflows/build/main/XXX.CI.Release.zip`;
const NIGHTLY_REQUIREMENTS = [
  {
    archiveFileName: 'XXX.CI.Release.zip', //the artifact's (constant) file name
    modType: XXX_ID,
    assemblyFileName: XXX_FILE,
    userFacingName: XXX_NAME,
    githubUrl: XXX_URL_API,                //the Actions run listing is read from here
    nightlyUrl: XXX_URL_NIGHTLY,           //presence of this field switches the mode on
    nightlyWorkflow: 'build.yml',          //workflow file name, as it appears in .github/workflows
    nightlyBranch: 'main',                 //branch the nightly is built from
    findMod: (api) => findModByFile(api, XXX_ID, XXX_FILE),
    //no findDownloadId: the artifact file name never changes, so a local archive matching it
    //is a stale build - the module always re-resolves the newest run instead
    resolveVersion: (api) => resolveVersionByNightlyRun(api, NIGHTLY_REQUIREMENTS[0]), //reads the run number stamped at install
    autoInstall: false,
    //pinVersion has no effect here - nightlyUrl only ever serves the newest run's artifact
  },
];
//*/

//* Alternative to resolveVersionByPattern for when the version is NOT in the archive
// file name. Finds the newest matching downloaded archive, extracts it to a temp dir,
// then reads requirement.versionFile (e.g. 'version.txt') for the installed version.
async function resolveVersionByFile(api, requirement) {
    const state = api.getState();
    const gameId = selectors.activeGameId(state);
    const downloadPath = selectors.downloadPath(state);
    const files = util.getSafe(state, ['persistent', 'downloads', 'files'], {});
    // Archives matching this requirement (version is not in the name, so match the pattern),
    // restricted to the game being managed. Requirement archives often share a generic name
    // across games, and downloadPath only points at this game's folder anyway - an entry from
    // another game would either be the wrong mod or a path that does not exist.
    const matches = Object.values(files)
        .filter(file => !!file.localPath
            && (Array.isArray(file.game) ? file.game : [file.game]).includes(gameId)
            && requirement.fileArchivePattern.exec(file.localPath));
    if (matches.length === 0) {
        return '0.0.0';
    }
    // newest matching archive by file mtime (proxy for "current" download)
    let newest = null;
    let newestTime = -1;
    for (const file of matches) {
        const archivePath = path.join(downloadPath, file.localPath);
        try {
            const stat = await fs.statAsync(archivePath);
            if (stat.mtime.getTime() > newestTime) {
                newestTime = stat.mtime.getTime();
                newest = archivePath;
            }
        } catch {
            // archive missing/unreadable -> skip
        }
    }
    if (!newest) {
        return '0.0.0';
    }
    // extract into an auto-cleaned temp dir, read the version file, parse the version
    try {
        return await util.withTmpDir(async (tmpPath) => {
            const szip = new util.SevenZip();
            await szip.extractFull(newest, tmpPath);
            // NOTE: requirement.versionFile may live in a subfolder of the archive ->
            // adjust this join per game if so.
            const versionFilePath = path.join(tmpPath, requirement.versionFile);
            const raw = await fs.readFileAsync(versionFilePath, { encoding: 'utf8' });
            // *** PER-GAME CUSTOMIZATION ***
            // version.txt contents differ per mod - parse the version string out of `raw`.
            // examples:
            //   const parsed = raw.trim();                       // file is just "1.2.3"
            //   const parsed = /(\d+\.\d+\.\d+)/.exec(raw)?.[1];  // version embedded in text
            //   const parsed = JSON.parse(raw).version;          // json file
            const parsed = raw.trim();
            return semver.coerce(parsed)?.version ?? '0.0.0';
        }, { cleanup: true });
    } catch (err) {
        log('warn', `resolveVersionByFile failed: ${err}`);
        return '0.0.0';
    }
} //*/

// AUTO-DOWNLOADER FUNCTIONS ///////////////////////////////////////////////

async function asyncForEachTestVersion(api, requirements) {
  for (let index = 0; index < requirements.length; index++) {
    await testRequirementVersion(api, requirements[index]);
  }
}

async function asyncForEachCheck(api, requirements) {
  let mod = [];
  for (let index = 0; index < requirements.length; index++) {
    mod[index] = await requirements[index].findMod(api);
  }
  let checker = mod.every((entry) => entry !== undefined); //findMod resolves to a mod object or undefined, never a boolean
  return checker;
}

async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await asyncForEachTestVersion(api, REQUIREMENTS);
    log('warn', 'Checked requirements versions');
  } catch (err) {
    log('warn', `Failed to test requirement version: ${err}`);
  }
}

async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
}

// *** In setup() function ////////////////////
async function setup(api) {
  const requirementsInstalled = await checkForRequirements(api);
  if (!requirementsInstalled) {
      await download(api, REQUIREMENTS);
  } //*/
}

// *** In context.once() function ////////////////////
  api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(api, gameId, mods, forced);
  }); //*/
