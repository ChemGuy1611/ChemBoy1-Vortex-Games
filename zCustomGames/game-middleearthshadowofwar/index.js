const GAME_ID = 'middleearthshadowofwar';
const STEAMAPP_ID = '356190';

const path = require('path');
const { fs, log, util } = require('vortex-api');

const MOD_FILE_EXT = '.dll'

function findGame() {
  return util.GameStoreHelper.findByAppId([STEAMAPP_ID])
      .then(game => game.gamePath);
}

function prepareForModding(discovery) {
    //await downloadModLoader(api);
    return fs.ensureDirAsync(path.join(discovery.path, 'x64', 'plugins'));
}

function testSupportedContent(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === GAME_ID) &&
    (files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT) !== undefined);

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function installContent(files) {
  // The .pak file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT); //Determines if the modFile extension is correct
  const idx = modFile.indexOf(path.basename(modFile)); //finds where the first occurence of the modFile's extension is
  const rootPath = path.dirname(modFile); //finds the directory name of the modFile
  
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

//* Function to auto-download UE4SS from Nexus Mods
async function downloadModLoader(api) {
  let isInstalled = isModLoaderInstalled(api);
  if (!isInstalled) {
    const MOD_NAME = 'Mod Loader';
    const NOTIF_ID = `${GAME_ID}-modloader-installing`;
    const PAGE_ID = '';
    const FILE_ID = '';  //If using a specific file id because "input" below gives an error
    const GAME_DOMAIN = GAME_ID;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${MOD_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    if (api.ext?.ensureLoggedIn !== undefined) { //make sure user is logged into Nexus Mods account in Vortex
      await api.ext.ensureLoggedIn();
    }
    try {
      let FILE = null;
      let URL = null;
      try { //get the mod files information from Nexus
        const modFiles = await api.ext.nexusGetModFiles(GAME_DOMAIN, PAGE_ID);
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
          .filter(file => file.category_id === 1)
          .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
          throw new util.ProcessCanceled(`No ${MOD_NAME} main file found`);
        }
        FILE = file.file_id;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      } catch (err) { // use defined file ID if input is undefined above
        FILE = FILE_ID;
        URL = `nxm://${GAME_DOMAIN}/mods/${PAGE_ID}/files/${FILE}`;
      }
      const dlInfo = { //Download the mod
        game: GAME_DOMAIN,
        name: MOD_NAME,
      };
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [URL], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions
    } catch (err) { //Show the user the download page if the download, install process fails
      const errPage = `https://www.nexusmods.com/${GAME_DOMAIN}/mods/${PAGE_ID}/files/?tab=files`;
      api.showErrorNotification(`Failed to download/install ${MOD_NAME}`, err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
} //*/

function main(context) {
	context.registerGame({
    id: GAME_ID,
    name: 'Middle-earth: Shadow of War',
   	mergeMods: true,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: () => 'x64/plugins',
    logo: `${GAME_ID}.jpg`,
    executable: () => 'x64/ShadowOfWar.exe',
    requiredFiles: [
      'x64/ShadowOfWar.exe',
      //'x64/bink2w64.dll',
      //'x64/bink2w64_.dll'
    ],
    setup: prepareForModding,
    environment: {
		SteamAPPId: STEAMAPP_ID,
   	},
    details: {
      steamAppId: STEAMAPP_ID,
    },
  	});
	context.registerInstaller('middleearthsow-mod', 25, testSupportedContent, installContent);
	return true;
}

module.exports = {
    default: main,
  };
