const GAME_ID = 'pacificdrive';
const MOD_FILE_EXT = ".pak";
const STEAMAPP_ID = '1458140';
const XBOXAPP_ID = 'KeplerInteractive.PacificDrive';
const XBOXEXECNAME = 'AppPenDriverProShipping';
const EXEC_XBOX = 'gamelaunchhelper.exe';

//Import some assets from Vortex we'll need.
const path = require('path');
const { actions, fs, util, selectors, log } = require('vortex-api');

//Get correct executable for game version
function getExecutable(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    return EXEC_XBOX;
  };
  return EXEC;
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'xbox') {
      return Promise.resolve({
          launcher: 'xbox',
          addInfo: {
              appId: XBOXAPP_ID,
              parameters: [{ appExecName: XBOXEXECNAME }],
          },
      });
  } //*/
  return Promise.resolve(undefined);
}

function main(context) {
	//This is the main function Vortex will run when detecting the game extension. 
	context.registerGame({
    id: GAME_ID,
    name: 'Pacific Drive',
    mergeMods: true,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: () => 'PenDriverPro/Content/Paks/~mods',
    logo: 'gameart.png',
    executable: getExecutable,
    requiredFiles: [
      'PenDriverPro',
    ],
    setup: prepareForModding,
    requiresLauncher: requiresLauncher,
    environment: {
      SteamAPPId: STEAMAPP_ID,
    },
    details: {
      steamAppId: STEAMAPP_ID,
    },
  });
  
  context.registerInstaller('PacificDrive-mod', 25, testSupportedContent, installContent);
	
	return true;
}

module.exports = {
    default: main,
};

function findGame() {
  return util.GameStoreHelper.findByAppId([STEAMAPP_ID, XBOXAPP_ID])
      .then(game => game.gamePath);
}

function prepareForModding(discovery) {
    return fs.ensureDirWritableAsync(path.join(discovery.path, 'PenDriverPro', 'Content', 'Paks', '~mods'));
}

function testSupportedContent(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === GAME_ID) &&
    (files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT)!== undefined);

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function installContent(files) {
  // The .pak file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => 
    ((file.indexOf(rootPath) !== -1) 
    && (!file.endsWith(path.sep))));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });

  return Promise.resolve({ instructions });
}

