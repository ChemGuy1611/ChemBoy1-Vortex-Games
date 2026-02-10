/*/////////////////////////////////////////
Name: Wolfenstein (2009) Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.2.2
Date: 08/07/2024
//////////////////////////////////////////*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const winapi = require('winapi-bindings');

//Specify all the information about the game
const STEAMAPP_ID = "10170";
const GAME_ID = "wolfenstein2009";
const GAME_NAME = "Wolfenstein (2009)";
const GAME_NAME_SHORT = "Wolfenstein";
const EXEC = path.join("SP", "Wolf2.exe");
const EXEC_MP = path.join("MP", "Wolf2MP.exe");
const MOD_PATH = ".";
const SP_ID = `${GAME_ID}-sp`;
const MP_ID = `${GAME_ID}-mp`;
const SPBASE_ID = `${GAME_ID}-spbase`;
const MPBASE_ID = `${GAME_ID}-mpbase`;
const SP_FOLDER = "SP";
const MP_FOLDER = "MP";
const BASE_FOLDER = "base";
const STREAM_FOLDER = "streampacks";
const VIDEOS_FOLDER = "videos";
const MAPS_FOLDER = "maps";
const modFileExt = ".pk4";
const EXE_EXT = ".exe";

const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "modPath": MOD_PATH,
    "modPathIsRelative": true,
    "requiredFiles": [
      EXEC,
      EXEC_MP,
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": SPBASE_ID,
      "name": "SinglePlayer base Folder",
      "priority": "high",
      "targetPath": path.join('{gamePath}', "SP", "base")
    },
    {
      "id": MPBASE_ID,
      "name": "MultiPlayer base Folder",
      "priority": "high",
      "targetPath": path.join('{gamePath}', "MP", "base")
    },
    {
      "id": SP_ID,
      "name": "SP Folder",
      "priority": "high",
      "targetPath": path.join('{gamePath}', "SP")
    },
    {
      "id": MP_ID,
      "name": "MP Folder",
      "priority": "high",
      "targetPath": path.join('{gamePath}', "MP")
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const tools = [
  {
    id: 'LaunchGameSP',
    name: 'Launch SP Game',
    logo: 'executable.png',
    executable: () => EXEC,
    requiredFiles: [
      EXEC,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    parameters: [
      `+set com_allowconsole 1 +set com_skipIntro 1 +set com_SingleDeclFile 0 +set sys_lang "english"`,
    ],
    defaultPrimary: true,
  },
  {
    id: 'LaunchGameMP',
    name: 'Launch MP Game',
    logo: 'executable.png',
    executable: () => EXEC_MP,
    requiredFiles: [
      EXEC_MP,
    ],
    relative: true,
    exclusive: true,
    shell: true,
    parameters: [
      `+set com_allowconsole 1 +set com_skipIntro 1 +set com_SingleDeclFile 0 +set sys_lang "english"`,
    ],
  },
];

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with actual folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: process.env['LOCALAPPDATA'],
    appData: util.getVortexPath('appData'),
  });
}

//Find the game installation folder
function makeFindGame(api, gameSpec) {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      `SOFTWARE\\WOW6432Node\\Activision\\Wolfenstein`,
        'InstallPath');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return () => Promise.resolve(instPath.value);
  } catch (err) {
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  }
}
//Set the mod path for the game
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Setup launcher requirements (Steam, Epic, GOG, GamePass, etc.). More parameters required for Epic and GamePass
function makeRequiresLauncher(api, gameSpec) {
  return () => Promise.resolve((gameSpec.game.requiresLauncher !== undefined)
    ? { launcher: gameSpec.game.requiresLauncher }
    : undefined);
}

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

//Installer test whether to use base folder mod installer
function testBase(files, gameId) {
  const isMod = files.some(file => path.basename(file) === BASE_FOLDER);
  const hasSPFolder = files.some(file => path.basename(file) === SP_FOLDER);
  const hasMPFolder = files.some(file => path.basename(file) === MP_FOLDER);
  let supported = (gameId === spec.game.id) && isMod && !hasSPFolder && !hasMPFolder;

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

//Installer install base folder mod files
function installBase(api, files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === BASE_FOLDER.toLowerCase());
  const CANC_BUT = 'Cancel';
  const SP_BUT = 'Install to SP Folder';
  const MP_BUT = 'Install to MP Folder';
  //return __awaiter(this, void 0, void 0, function* () {
    return api.showDialog('question', 'Choose Install for "base" Folder', {
      text: 'The mod you are installing contains a "base" folder.' +
          `Select if this "base" folder should be installed to the "SP" (SinglePlayer) folder or "MP" (MultiPlayer) folder.`,
      }, [
        { label: CANC_BUT },
        { label: SP_BUT },
        { label: MP_BUT },
        ]).then((result) => {
          if (result.action === CANC_BUT) {
            return Promise.reject(new util.UserCanceled('User cancelled.'));
          }
          if (result.action === SP_BUT) {
            const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: SP_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
          if (result.action === MP_BUT) {
            const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: MP_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
        });
  //});
}

//Installer test whether to use maps folder mod installer
function testMaps(files, gameId) {
  const isMod = files.some(file => path.basename(file) === MAPS_FOLDER);
  const hasSPFolder = files.some(file => path.basename(file) === SP_FOLDER);
  const hasMPFolder = files.some(file => path.basename(file) === MP_FOLDER);
  let supported = (gameId === spec.game.id) && isMod && !hasSPFolder && !hasMPFolder;

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

//Installer install maps folder mod files
function installMaps(api, files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === MAPS_FOLDER.toLowerCase());
  const CANC_BUT = 'Cancel';
  const SP_BUT = 'Install to SP Folder';
  const MP_BUT = 'Install to MP Folder';
  //return __awaiter(this, void 0, void 0, function* () {
    return api.showDialog('question', 'Choose Install for "maps" Folder', {
      text: 'The mod you are installing contains a "maps" folder.' +
          `Select if this "maps" folder should be installed to the "SP" (SinglePlayer) folder or "MP" (MultiPlayer) folder.`,
      }, [
        { label: CANC_BUT },
        { label: SP_BUT },
        { label: MP_BUT },
        ]).then((result) => {
          if (result.action === CANC_BUT) {
            return Promise.reject(new util.UserCanceled('User cancelled.'));
          }
          if (result.action === SP_BUT) {
            const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: SPBASE_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
          if (result.action === MP_BUT) {
            const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: MPBASE_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
        });
  //});
}

//Installer test whether to use streampacks folder mod installer
function testStream(files, gameId) {
  const isMod = files.some(file => path.basename(file) === STREAM_FOLDER);
  const hasSPFolder = files.some(file => path.basename(file) === SP_FOLDER);
  const hasMPFolder = files.some(file => path.basename(file) === MP_FOLDER);
  let supported = (gameId === spec.game.id) && isMod && !hasSPFolder && !hasMPFolder;

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

//Installer install streampacks folder mod files
function installStream(api, files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === STREAM_FOLDER.toLowerCase());
  const CANC_BUT = 'Cancel';
  const SP_BUT = 'Install to SP Folder';
  const MP_BUT = 'Install to MP Folder';
  //return __awaiter(this, void 0, void 0, function* () {
    return api.showDialog('question', 'Choose Install for "streampacks" Folder', {
      text: 'The mod you are installing contains a "streampacks" folder.' +
          `Select if this "streampacks" folder should be installed to the "SP" (SinglePlayer) folder or "MP" (MultiPlayer) folder.`,
      }, [
        { label: CANC_BUT },
        { label: SP_BUT },
        { label: MP_BUT },
        ]).then((result) => {
          if (result.action === CANC_BUT) {
            return Promise.reject(new util.UserCanceled('User cancelled.'));
          }
          if (result.action === SP_BUT) {
            const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: SPBASE_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
          if (result.action === MP_BUT) {
            const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: MPBASE_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
        });
  //});
}

//Installer test whether to use videos folder mod installer
function testVideos(files, gameId) {
  const isMod = files.some(file => path.basename(file) === VIDEOS_FOLDER);
  const hasSPFolder = files.some(file => path.basename(file) === SP_FOLDER);
  const hasMPFolder = files.some(file => path.basename(file) === MP_FOLDER);
  let supported = (gameId === spec.game.id) && isMod && !hasSPFolder && !hasMPFolder;

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

//Installer install videos folder mod files
function installVideos(api, files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === VIDEOS_FOLDER.toLowerCase());
  const CANC_BUT = 'Cancel';
  const SP_BUT = 'Install to SP Folder';
  const MP_BUT = 'Install to MP Folder';
  //return __awaiter(this, void 0, void 0, function* () {
    return api.showDialog('question', 'Choose Install for "videos" Folder', {
      text: 'The mod you are installing contains a "videos" folder.' +
          `Select if this "videos" folder should be installed to the "SP" (SinglePlayer) folder or "MP" (MultiPlayer) folder.`,
      }, [
        { label: CANC_BUT },
        { label: SP_BUT },
        { label: MP_BUT },
        ]).then((result) => {
          if (result.action === CANC_BUT) {
            return Promise.reject(new util.UserCanceled('User cancelled.'));
          }
          if (result.action === SP_BUT) {
            const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: SPBASE_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
          if (result.action === MP_BUT) {
            const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: MPBASE_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
        });
  //});
}

//Installer test whether to use .pk4 mod installer
function testPk4(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === modFileExt) !== undefined;
  const hasSPFolder = files.some(file => path.basename(file) === SP_FOLDER);
  const hasMPFolder = files.some(file => path.basename(file) === MP_FOLDER);
  let supported = (gameId === spec.game.id) && isMod && !hasSPFolder && !hasMPFolder;

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

//Installer install .pk4 mod files
function installPk4(api, files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === modFileExt);
  const CANC_BUT = 'Cancel';
  const SP_BUT = 'Install to SP Folder';
  const MP_BUT = 'Install to MP Folder';
  //return __awaiter(this, void 0, void 0, function* () {
    return api.showDialog('question', 'Choose Install for .pk4 Files', {
      text: 'The mod you are installing contains .pk4 files.' +
          `Select if these .pk4 files should be installed to the "SP" (SinglePlayer) folder or "MP" (MultiPlayer) folder.`,
      }, [
        { label: CANC_BUT },
        { label: SP_BUT },
        { label: MP_BUT },
        ]).then((result) => {
          if (result.action === CANC_BUT) {
            return Promise.reject(new util.UserCanceled('User cancelled.'));
          }
          if (result.action === SP_BUT) {
            const idx = modFile.indexOf(path.basename(modFile));
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: SPBASE_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
          if (result.action === MP_BUT) {
            const idx = modFile.indexOf(path.basename(modFile));
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: MPBASE_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
        });
  //});
}

//Installer test whether to use .exe mod installer
function testExe(files, gameId) {
  const isMod = files.find(file => path.extname(file).toLowerCase() === EXE_EXT) !== undefined;
  const hasSPFolder = files.some(file => path.basename(file) === SP_FOLDER);
  const hasMPFolder = files.some(file => path.basename(file) === MP_FOLDER);
  let supported = (gameId === spec.game.id) && isMod && !hasSPFolder && !hasMPFolder;

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

//Installer install .exe mod files
function installExe(api, files) {
  const modFile = files.find(file => path.extname(file).toLowerCase() === EXE_EXT);
  const CANC_BUT = 'Cancel';
  const SP_BUT = 'Install to SP Folder';
  const MP_BUT = 'Install to MP Folder';
  //return __awaiter(this, void 0, void 0, function* () {
    return api.showDialog('question', 'Choose Install for .exe Files', {
      text: 'The mod you are installing contains .exe files.' +
          `Select if these .exe files should be installed to the "SP" (SinglePlayer) folder or "MP" (MultiPlayer) folder.`,
      }, [
        { label: CANC_BUT },
        { label: SP_BUT },
        { label: MP_BUT },
        ]).then((result) => {
          if (result.action === CANC_BUT) {
            return Promise.reject(new util.UserCanceled('User cancelled.'));
          }
          if (result.action === SP_BUT) {
            const idx = modFile.indexOf(path.basename(modFile));
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: SP_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
          if (result.action === MP_BUT) {
            const idx = modFile.indexOf(path.basename(modFile));
            const rootPath = path.dirname(modFile);
            const setModTypeInstruction = { type: 'setmodtype', value: MP_ID };
            // Remove directories and anything that isn't in the rootPath.
            const filtered = files.filter(file =>
              ((file.indexOf(rootPath) !== -1))
            );
            const instructions = filtered.map(file => {
              return {
                type: 'copy',
                source: file,
                destination: path.join(file.substr(idx)),
              };
            });
            instructions.push(setModTypeInstruction);
            return Promise.resolve({ instructions });
          }
        });
  //});
}

//Setup function
async function setup(discovery, api, gameSpec) {
  await fs.ensureDirWritableAsync(path.join(discovery.path, SP_FOLDER, "base"));
  await fs.ensureDirWritableAsync(path.join(discovery.path, MP_FOLDER, "base"));
  return fs.ensureDirWritableAsync(path.join(discovery.path, gameSpec.game.modPath));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: makeRequiresLauncher(context.api, gameSpec),
    requiresCleanup: true,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
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
  context.registerInstaller(`${GAME_ID}-base`, 25, testBase, (files, __destinationPath) => installBase(context.api, files));
  context.registerInstaller(`${GAME_ID}-maps`, 30, testMaps, (files, __destinationPath) => installMaps(context.api, files));
  context.registerInstaller(`${GAME_ID}-streampacks`, 35, testStream, (files, __destinationPath) => installStream(context.api, files));
  context.registerInstaller(`${GAME_ID}-videos`, 40, testVideos, (files, __destinationPath) => installVideos(context.api, files));
  context.registerInstaller(`${GAME_ID}-pk4`, 45, testPk4, (files, __destinationPath) => installPk4(context.api, files));
  context.registerInstaller(`${GAME_ID}-exe`, 50, testExe, (files, __destinationPath) => installExe(context.api, files));
}

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => {
    // put code here that should be run (once) when Vortex starts up

  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
