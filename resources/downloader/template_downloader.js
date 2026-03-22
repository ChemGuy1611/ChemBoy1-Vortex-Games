const GAME_ID = 'placeholder';

// REQUIREMENTS ///////////////////////////////////////////////////
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');
const semver = require('semver');
const XXX_ID = `${GAME_ID}-XXX`;
const XXX_NAME = "XXX";
const VER = '0.0.0';
const XXX_ARC_NAME = `XXX${VER}.zip`;
const XXX_FILE = 'XXX.exe'; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.
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
    /*versionFile: 'version.txt', //file to check for version number (needed if version is not in the archive name)
    resolveVersion: (api) => resolveVersionByFile(api, REQUIREMENTS[0]), //*/
  },
]; //*/

//* Function to resolve version by a means other than the archive name
async function resolveVersionByFile(api, requirement) {
    const exeVersion = require('exe-version');
    const state = api.getState();
    const files = util.getSafe(state, ['persistent', 'downloads', 'files'], []);
    const latestVersion = Object.values(files).reduce((prev, file) => {
        const match = requirement.fileArchivePattern.exec(file.localPath);
        let version = '0.0.0';
        if (match !== null && match !== undefined && match[0]) {
            const checkFile = path.join(file.localPath, requirement.versionFile);
            version = exeVersion.getProductVersion(checkFile);
            log('warn', `Resolved version ${version} from file ${file.localPath}`);
        }//
        if ((match === null || match === void 0 ? void 0 : match[0]) && semver.gt(version, prev)) {
            prev = version;
        }
        return prev;
    }, '0.0.0');
  return latestVersion;
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

const requirementsInstalled = await checkForRequirements(api);
if (!requirementsInstalled) {
    await download(api, REQUIREMENTS);
} //*/

// *** In context.once() function ////////////////////

context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
    if (gameId !== GAME_ID) return;
    return onCheckModVersion(context.api, gameId, mods, forced);
}); //*/
