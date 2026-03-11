const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');

//Define requirements ////////

// Information for Frosty Mod Manager Alpha downloader and updater
const FROSTYMANAGER_ID = `${GAME_ID}-XXX`;
const FROSTYMANAGER_NAME = "XXX";
const VER = '0.0.0';
const FROSTY_ARC_NAME = `XXX${VER}.zip`;
const FROSTY_FILE = 'XXX.exe'; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.
const AUTHOR = 'XXX'; // Author of the Frosty Mod Manager Alpha fork
const REPO = 'XXX'; // Repository name on GitHub
const FROSTY_URL_MAIN = `https://api.github.com/repos/${AUTHOR}/${REPO}`;
//requirements array
const REQUIREMENTS = [
  {
    archiveFileName: FROSTY_ARC_NAME,
    modType: FROSTYMANAGER_ID,
    assemblyFileName: FROSTY_FILE,
    userFacingName: FROSTYMANAGER_NAME,
    githubUrl: FROSTY_URL_MAIN,
    findMod: (api) => findModByFile(api, FROSTYMANAGER_ID, FROSTY_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, FROSTY_ARC_NAME),
    fileArchivePattern: new RegExp(/^XXX(\d+\.\d+\.\d+)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
  },
];

//* Function to resolve version by a means other than the archive name
async function resolveVersionByFile(api, requirement) {
  const state = api.getState();
  const files = util.getSafe(state, ['persistent', 'downloads', 'files'], []);
  const latestVersion = Object.values(files).reduce((prev, file) => {
    const match = requirement.fileArchivePattern.exec(file.localPath);
    //
    if ((match === null || match === void 0 ? void 0 : match[1]) && semver.gt(match[1], prev)) {
        prev = match[1];
    }
    return prev;
  }, '0.0.0');
  return latestVersion;
} //*/

// AUTO-DOWNLOADER FUNCTIONS ///////////////////////////////////////////////////

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
    log('warn', `failed to test requirement version: ${err}`);
  }
}

async function checkForRequirements(api) {
  const CHECK = await asyncForEachCheck(api, REQUIREMENTS);
  return CHECK;
}

// In setup function ////////////////////

const requirementsInstalled = await checkForRequirements(api);
if (!requirementsInstalled) {
await download(api, REQUIREMENTS);
}
