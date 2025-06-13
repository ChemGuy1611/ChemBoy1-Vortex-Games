const Promise = require('bluebird');
const path = require('path');
const winapi = require('winapi-bindings');
const { fs, util, actions, selectors } = require('vortex-api');
const { default: IniParser, WinapiFormat } = require('vortex-parse-ini');

const GAME_ID = 'vampirebloodlines';
const STEAM_ID = '2600';
const GOG_ID = '1207659240';
const EXEC = 'Vampire.exe';
const MOD_PATH = 'Unofficial_Patch';

//3rd party tools and launchers
const tools = [
  /*{
    id: "LaunchUPGame",
    name: "Launch UP Game",
    logo: `exec.png`,
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,
    exclusive: true,
    defaultPrimary: true,
    parameters: ['-game Unofficial_Patch']
  }, //*/
];

function readRegistryKey(hive, key, name) {
  try {
    const instPath = winapi.RegGetValue(hive, key, name);
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return Promise.resolve(instPath.value);
  } catch (err) {
    return Promise.resolve(undefined);
  }
}

function findGame() {
  return util.steam.findByAppId(STEAM_ID)
    .then(game => game.gamePath)
    .catch(() => readRegistryKey('HKEY_LOCAL_MACHINE',
      `SOFTWARE\\WOW6432Node\\GOG.com\\Games\\${GOG_ID}`,
      'PATH'))
    .catch(() => readRegistryKey('HKEY_LOCAL_MACHINE',
      `SOFTWARE\\GOG.com\\Games\\${GOG_ID}`,
      'PATH'))
}

function getUnofficialModPath(api) {
  const state = api.getState();
  const discovery = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
  return path.join(discovery.path, 'Unofficial_Patch');
}

function isUPModType(api, instructions) {
  return fs.statAsync(getUnofficialModPath(api))
    .then(() => Promise.resolve(true))
    .catch(() => Promise.resolve(false));
}

function getGameVersion(discoveryPath) {
  const parser = new IniParser(new WinapiFormat());
  return parser.read(path.join(discoveryPath, 'version.inf'))
    .then((data) => {
      const version = data?.data?.['Version Info']?.ExtVersion;
      return (version)
        ? Promise.resolve(version)
        : Promise.reject(new util.DataInvalid('Invalid version file'))
    });
}

function requiresLauncher(gamePath, store) {
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
    });
  }
  return Promise.resolve(undefined);
}

async function setup(discovery, api) {
  return fs.ensureDirWritableAsync(path.join(discovery.path, 'Unofficial_Patch'));
}

function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: 'CUSTOM Vampire the Masquerade Bloodlines',
    shortName: 'VTMB',
    logo: 'gameart.jpg',
    mergeMods: true,
    queryPath: findGame,
    requiresLauncher: requiresLauncher,
    getGameVersion,
    queryModPath: () => MOD_PATH,
    executable: () => EXEC,
    parameters: ['-game Unofficial_Patch'],
    requiredFiles: [
      EXEC
    ],
    environment: {
      SteamAPPId: STEAM_ID,
      GogAPPId: GOG_ID,
    },
    details: {
      steamAppId: +STEAM_ID,
      gogAppId: +GOG_ID,
      compatibleDownloads: ['vampirebloodlines'],
      nexusPageId: 'vampirebloodlines',
    },
    supportedTools: tools,
    setup: async (discovery) => await setup(discovery, context.api),
  });

  // The "unofficial patch" mod modifies the mods folder. GoG includes by default. Steam does not.
  context.registerModType('vtmb-up-modtype', 25, //id, priority
    (gameId) => gameId === GAME_ID, //isSupported - Is this mod for this game
    () => getUnofficialModPath(context.api), //getPath - mod install location
    (instructions) => isUPModType(context.api, instructions), //test - is installed mod of this type
    { name: 'Unofficial_Patch Folder' } //options
  );
}

module.exports = {
  default: main
};
