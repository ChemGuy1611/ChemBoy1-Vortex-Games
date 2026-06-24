const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const GAME_ID = 'placeholder';
const api = require('vortex-api'); //DUMMY PLACEHOLDER TO AVOID LINT FREAKING OUT

// REQUIREMENTS ///////////////////////////////////////////////////
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, resolveVersionByAssetDate, testRequirementVersion } = require('./downloader');
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
    modType: XXX_ID,
    assemblyFileName: XXX_FILE,
    userFacingName: XXX_NAME,
    githubUrl: XXX_URL_API,
    findMod: (api) => findModByFile(api, XXX_ID, XXX_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, XXX_ARC_NAME),
    fileArchivePattern: new RegExp(/^XXX(\d+\.\d+\.\d+)/, 'i'), //from ARC_NAME
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]), //*/
    //versionFile: 'version.txt', //file to check for version number (needed if version is not in the archive name)
    //resolveVersion: (api) => resolveVersionByFile(api, REQUIREMENTS[0]),
    //allowPrerelease: true, //include GitHub pre-release versions (default false)
    //prereleaseTag: 'experimental', //fetch a specific rolling pre-release tag directly (e.g. UE4SS); skips the prerelease scan
    //trackByAssetDate: true, //detect updates by the asset's GitHub upload time, not the version tag (rolling pre-release whose tag never changes)
    //resolveVersion: (api) => resolveVersionByAssetDate(api, REQUIREMENTS[0]), //use together with trackByAssetDate
  },
]; //*/

//* Alternative to resolveVersionByPattern for when the version is NOT in the archive
// file name. Finds the newest matching downloaded archive, extracts it to a temp dir,
// then reads requirement.versionFile (e.g. 'version.txt') for the installed version.
async function resolveVersionByFile(api, requirement) {
    const state = api.getState();
    const downloadPath = selectors.downloadPath(state);
    const files = util.getSafe(state, ['persistent', 'downloads', 'files'], {});
    // archives matching this requirement (version is not in the name, so match the pattern)
    const matches = Object.values(files)
        .filter(file => !!file.localPath && requirement.fileArchivePattern.exec(file.localPath));
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
  let checker = mod.every((entry) => entry === true);
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
