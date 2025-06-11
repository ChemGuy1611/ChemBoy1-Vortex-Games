// Based on Unreal Engine Library
// https://github.com/Pickysaurus/vortex-unreal-engine-library/blob/master/example/game-example/index.js
// https://wiki.nexusmods.com/index.php/Creating_a_game_extension_for_Vortex

// Import some assets from Vortex we'll need.
const path = require('path');
const { actions, fs, util } = require('vortex-api');

// Basic Game Information
const GAME_ID = 'readyornot'; //Nexus Mods ID (the part of the URL before "mods")
const GAME_NAME = 'Ready Or Not';
const GAME_SHORTNAME = 'RoN';
const GAME_ARTWORK = 'gameart.jpg';
const EXE_PATH = 'ReadyOrNot.exe';
const SHIPPING_EXE_PATH = 'ReadyOrNot/Binaries/Win64/ReadyOrNot-Win64-Shipping.exe';

//Steam Application ID, you can get this from https://steamdb.info/apps/
const STEAMAPP_ID = '1144200';

const GAMESTORES = [STEAMAPP_ID];

/*
  Unreal Engine Game Data
  - modsPath: this is where the mod files need to be installed, relative to the game install folder.
  - fileExt(optional): if for some reason the game uses something other than PAK files, add the extensions here.
  - loadOrder: do we want to show the load order tab?
*/
const UNREALDATA = {
  modsPath: path.join('ReadyOrNot', 'Content', 'Paks', '~mods'),
  fileExt: '.pak',
  loadOrder: true,
}

function main(context) {

  context.requireExtension('Unreal Engine Mod Installer');

  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    mergeMods: true,
    queryPath: findGame,
    requiresCleanup: true,
    supportedTools: [],
    queryModPath: () => '.',
    compatible: {
      unrealEngine: true
    },
    logo: GAME_ARTWORK,
    executable: () => EXE_PATH,
    requiredFiles: [
      EXE_PATH,
      SHIPPING_EXE_PATH,
    ],
    setup: prepareForModding,
    environment: {
      SteamAPPId: STEAMAPP_ID
    },
    details: {
      unrealEngine: UNREALDATA,
      steamAppId: STEAMAPP_ID,
      customOpenModsPath: UNREALDATA.absModsPath || UNREALDATA.modsPath
    }
  });

  if (UNREALDATA.loadOrder === true) {
    let previousLO;
    context.registerLoadOrderPage({
      gameId: GAME_ID,
      gameArtURL: path.join(__dirname, GAME_ARTWORK),
      preSort: (items, direction) => preSort(context.api, items, direction),
      filter: mods => mods.filter(mod => mod.type === 'ue4-sortable-modtype'),
      displayCheckboxes: false,
      callback: (loadOrder) => {
        if (previousLO === undefined) previousLO = loadOrder;
        if (loadOrder === previousLO) return;
        context.api.store.dispatch(actions.setDeploymentNecessary(GAME_ID, true));
        previousLO = loadOrder;
      },
      createInfoPanel: () =>
      context.api.translate(`Drag and drop the mods on the left to change the order in which they load. {{gameName}} loads mods in alphanumerical order, so Vortex prefixes `
      + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
      + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.',
      { replace: { gameName: GAME_SHORTNAME }}),
    });
  }
}

function findGame() {
  return util.GameStoreHelper.findByAppId(GAMESTORES)
    .then(game => game.gamePath);
}

function prepareForModding(discovery) {
  return fs.ensureDirWritableAsync(path.join(discovery.path, UNREALDATA.modsPath));
}

async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', GAME_ID], {});
  const fileExt = (UNREALDATA.fileExt || '.pak').substr(1).toUpperCase();

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    const paks = util.getSafe(modInfo.attributes, ['unrealModFiles'], []);
    if (paks.length > 1) name = name + ` (${paks.length} ${fileExt} files)`;

    return {
      id: mod.id,
      name,
      imgUrl: util.getSafe(modInfo, ['attributes', 'pictureUrl'], path.join(__dirname, GAME_ARTWORK))
    }
  });

  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);
}

module.exports = {
  default: main,
};
