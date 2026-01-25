//Import some assets from Vortex we'll need.
const path = require('path');
const { fs, log, util } = require('vortex-api');

// Nexus Mods domain for the game. e.g. nexusmods.com/aliensfireteamelite
const GAME_ID = 'aliensfireteamelite';

//Steam Application ID, you can get this from https://steamdb.info/apps/
const STEAMAPP_ID = '1549970';
const XBOXAPP_ID = 'ColdIronStudiosLLC.AliensFireteam';
const XBOXEXECNAME = 'AppAliensFireteamEliteShipping';
const EXEC_XBOX = 'gamelaunchhelper.exe';
const EXEC = 'Endeavor.exe';

function findGame() {
  return util.GameStoreHelper.findByAppId([STEAMAPP_ID, XBOXAPP_ID])
      .then(game => game.gamePath);
}

function prepareForModding(discovery) {
    return fs.ensureDirWritableAsync(path.join(discovery.path, 'Endeavor', 'Content', 'Paks', '~mods'));
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch (err) {
    return false;
  }
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
  }
  return Promise.resolve(undefined);
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    return EXEC_XBOX;
  };
  return EXEC;
}

function main(context) {
	//This is the main function Vortex will run when detecting the game extension. 
	context.registerGame({
    id: GAME_ID,
    name: 'Aliens: Fireteam Elite',
    mergeMods: true,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: () => 'Endeavor/Content/Paks/~mods',
    logo: 'gameart.jpg',
    executable: getExecutable,
    requiredFiles: [
      'Endeavor',
    ],
    setup: prepareForModding,
    requiresLauncher: requiresLauncher,
    environment: {
      SteamAPPId: STEAMAPP_ID,
    },
    details: {
      steamAppId: STEAMAPP_ID,
	    stopPatterns: ['(^|/).*\.pak$'],
    },
  });
	return true;
}

module.exports = {
    default: main,
};