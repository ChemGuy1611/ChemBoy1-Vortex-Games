/*
 * This is the base information about the game this extension supports,
 * here you can change or extend the things you configured when using the
 * wizard.
 */
const spec = {
  "game": {
    "id": "battlefield1",
    "name": "Battlefield 1",
    "executable": "bf1.exe",
    "logo": "battlefield1.jpg",
    "mergeMods": true,
    "modPath": "FrostyModManager\\Mods\\bf1",
    "modPathIsRelative": true,
    "requiredFiles": [
      "bf1.exe"
    ],
    "details": {
      "steamAppId": 1238840,
      "nexusPageId": "battlefield1"
    },
    "environment": {
      "SteamAPPId": "1238840"
    }
  },
  "modTypes": [
    {
      "id": "battlefield1-binaries",
      "name": "Binaries (Engine Injector)",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      "1238840"
    ],
    "names": []
  }
};

const frostyExec = 'FrostyModManager.exe';
const frostyId = 'FrostyModManager';
const modFileExt = ".fbmod";

/*
 * use this to set up launchers or third-party tools commonly used with this game.
 * Users can set up tools themselves, this is merely a convenience to save users work
 * and to ensure the tools are used correctly.
 */
const tools = [
  {
    id: 'FrostyModManagerLaunch',
    name: 'Launch Modded Game',
    logo: 'executable.png',
    executable: () => frostyExec,
    defaultPrimary: true,
    requiredFiles: [
        frostyExec,
    ],
    relative: true,
    exclusive: true,
    parameters: [
        '-launch Default',
    ],
  },
  {
    id: frostyId,
    name: 'Frosty Mod Manager',
    logo: 'frosty.png',
    executable: () => frostyExec,
    requiredFiles: [
        frostyExec,
    ],
    relative: true,
    exclusive: true,
  }
  
  /*
  {
    // unique id
    id: 'skse',
    // display name of the tool
    name: 'Skyrim Script Extender',
    // optional short name for cases where the UI has limited space
    shortName: 'SKSE',
    // the executable to to run
    executable: () => 'skse_loader.exe',
    // list of command line parameters to pass to the tool
    parameters: [
      // '--foobar', '--fullscreen'
    ],
    // files that need to exist in the tool directory. This is used
    // for the automatic detection of the tool
    requiredFiles: [
      'skse_loader.exe',
    ],
    // if true, the tool is run in a shell. Some applications written to be run
    // from the command line/prompt will not work correctly otherwise
    shell: false,
    // if true, the tool will be a detached process, meaning that if Vortex is closed,
    // the tool is not terminated.
    detach: false,
    // set this to true if the tool is installed in the same directory as the
    // game. This helps automatic discovery of the tool
    relative: true,
    // if set, Vortex will not start other tools or the game while this one is running.
    // set this to true if the tools may interfere with each other or if you're unsure
    exclusive: true,
    // if this is true and the tool is detected, whenever the user starts the game,
    // this tool is run instead.
    defaultPrimary: true,
  },
  */
];

/*
 * here we make use of foreign libraries. vortex-api contains functions
 * to interface with the Vortex application,
 * see https://nexus-mods.github.io/vortex-api/ for a full documentation
 */
const { actions, fs, util } = require('vortex-api');
const path = require('path');
const template = require('string-template');
// uncomment this if you need to access the windows registry.
const winapi = require('winapi-bindings');


/*
 * mod types can be registered at arbitrary priority, a lower number means
 * the mod type will be considered first.
 * While you can use arbitrary values, most mod types are specific to a game
 * so you don't really have to care about them.
 * Mod types supporting multiple games (things like enbs for example) will use
 * a priority around 50 so what's relevant here is only whether your mod type
 * should take precedence over those or not
 */
function modTypePriority(priority) {
    return {
        high: 25,
        low: 75,
    }[priority];
}

/*
 * non-default mod types deploy mods into a different directory from the default.
 * Please consider that many folders (including the Documents directory or the
 * installation directory for the game) may be customized by users of your extension
 * so you shouldn't use concrete paths for those but placeholders that get
 * replaced on the users system at runtime.
 */
function pathPattern(api, game, pattern) {
    var _a;
    return template(pattern, {
        gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
        documents: util.getVortexPath('documents'),
        localAppData: process.env['LOCALAPPDATA'],
        appData: util.getVortexPath('appData'),
    });
}

/*
 * This function is used to find where the game is installed.
 * It gets called every time Vortex starts so that, if the game is moved, Vortex will
 * update accordingly.
 * This function is ignored when the user manually sets the game location or if they
 * use a full disk search.
 *
 * this function is supposed to throw an exception if the game is not found.
 * Sample code for discovering games through the registry:
 * const instPath = winapi.RegGetValue(
 *   'HKEY_LOCAL_MACHINE',
 *   'Software\\Wow6432Node\\Publisher\\Gamename',
 *   'InstallPath');
 * if (!instPath) {
 *   throw new Error('empty registry key');
 * }
 * return instPath.value;
 */

/*
function makeFindGame(api, gameSpec) {
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
        //.catch(() => util.GameStoreHelper.findByName(gameSpec.discovery.names))
        .then((game) => game.gamePath);
}*/


function makeFindGame(api, gameSpec) {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      'Software\\Wow6432Node\\EA Games\\Battlefield 1',
        'Install Dir');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return () => Promise.resolve(instPath.value);
  } catch (err) {
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  }
}


/*
 * This determines where mods get installed. If this is a relative path, it will be
 * relative to the game directory, if it's just '.', mods get installed to the game
 * directory directly.
 * If mods don't get installed to the game directory at all you have to specify an
 * absolute directory. Please also see pathPattern!
 */
function makeGetModPath(api, gameSpec) {
    return () => gameSpec.game.modPathIsRelative !== false
        ? gameSpec.game.modPath || '.'
        : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

/*
 * some games can't be launched directly (by running the exe), instead as part of their
 * DRM they always have to be launched from the launcher they were purchased on.
 * But that same game may also be available without DRM on a different store.
 * This function decides whether the game needs to be launched through a store, Vortex will
 * then do that automatically.
 * The following is sample code that will launch the game through steam if it was purchased there,
 * otherwise it is run directly.

 * return fs.readdirAsync(gamePath)
 *   .then(files => (files.find(file => file.endsWith('steamclient64.dll')) !== undefined)
 *     ? Promise.resolve({ launcher: 'steam' })
 *     : Promise.resolve(undefined))
 *   .catch(err => Promise.reject(err));
 */
function makeRequiresLauncher(api, gameSpec) {
    return () => Promise.resolve((gameSpec.game.requiresLauncher !== undefined)
        ? { launcher: gameSpec.game.requiresLauncher }
        : undefined);
}


//Notification for Frosty Mod Manager function
function frostyNotify(api) {
  api.sendNotification({
    id: 'frosty-notification-battlefield1',
    type: 'warning',
    message: 'FrostyToolsuite Required.',
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: () => {
          api.showDialog('question', 'Action required', {
            text: 'Battlefield 1 requires FrostyToolsuite (Mod Manager) to install most mods.\n'
                + 'Please use the button below to download and install the tool as a mod using this extension\n'
                + 'Install Frosty Mod Manager as a mod with Mod Type "Binaries (Engine Injector)'
          }, [
            { label: 'Continue', action: (dismiss) => dismiss() },
            { label: 'Download FrostyToolsuite', action: (dismiss) => {
                util.opn('https://github.com/CadeEvs/FrostyToolsuite/releases').catch(err => undefined);
                dismiss();
            }},
          ]);
        },
      },
    ],
  });    
}

//Setup function
async function setup(discovery, api) {
  frostyNotify(api);
  frostyPath = "FrostyModManager\\Mods\\bf1";
  //check default mod path writable
  //check Fluffy Mod Manager mod path writable
  try {
    await fs.ensureDirWritableAsync(path.join(discovery.path, spec.game.modPath));
    await fs.ensureDirWritableAsync(path.join(discovery.path, frostyPath));
    //return Promise.resolve;
  } catch (error) {
    return Promise.reject(error);
  }
}


function testSupportedContent(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === spec.game.id) &&
      (files.find(file => path.extname(file).toLowerCase() === modFileExt) !== undefined);

  // Test for a mod installer.
  if (supported && files.find(file =>
          (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
          (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
      supported = false;
  }

  return Promise.resolve({
      supported,
      requiredFiles: [],
  });
}


function installContent(files) {
  // The .fbmod file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === modFileExt);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
      ((file.indexOf(rootPath) !== -1) &&
          (!file.endsWith(path.sep))));

  const instructions = filtered.map(file => {
      return {
          type: 'copy',
          source: file,
          destination: path.join(file.substr(idx)),
      };
  });

  return Promise.resolve({ instructions });
}


/*
 * This function takes the game specification above and triggers the actual api calls
 * to let Vortex know about the game.
 */
function applyGame(context, gameSpec) {
  //register game
  const game = {
      ...gameSpec.game,
      queryPath: makeFindGame(context.api, gameSpec),
      queryModPath: makeGetModPath(context.api, gameSpec),
      requiresLauncher: makeRequiresLauncher(context.api, gameSpec),
      requiresCleanup: true,
      setup: async (discovery) => await setup(discovery, context.api),
      executable: () => gameSpec.game.executable,
      supportedTools: tools,
  };
  context.registerGame(game);
  //register mod types
  (gameSpec.modTypes || []).forEach((type, idx) => {
      context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
          var _a;
          return (gameId === gameSpec.game.id)
              && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
      }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });
  //register mod installers
  context.registerInstaller('battlefield1-mod', 25, testSupportedContent, installContent);
}

/*
 * This function is called when Vortex initializes extension. Please note that Vortex
 * is in the middle of startup at the point this is run, it must only be used to declare
 * the functionality your extension provides.
 */
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up
  });
  return true;
}

/*
 * you can call the "main" function whatever you want but it has to be exported as
 * "default" so that Vortex can find it
 */
module.exports = {
  default: main,
};
