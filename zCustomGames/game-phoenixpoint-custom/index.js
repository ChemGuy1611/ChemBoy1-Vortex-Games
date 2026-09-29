const GAME_ID = "phoenixpoint";
const EGS_CODENAME = "Iris";
const STEAMAPP_ID = "839770";

const path = require("path");
const IGNORE_CONFLICTS = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];
const IGNORE_DEPLOY = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];
const { fs: vfs, log, util } = require("vortex-api");

function PhoenixPoint(context) {
  context.registerGame({
    id: GAME_ID,
    name: "Phoenix Point",
    mergeMods: true,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: () => "Mods",
    logo: "gameart.jpg",
    executable: () => "PhoenixPointWin64.exe",
    requiredFiles: ["PhoenixPointWin64.exe", "/PhoenixPointWin64_Data/Managed/Assembly-CSharp.dll"],
    setup: async (discovery) => await prepareForModding(discovery),
    details: {
      ignoreConflicts: IGNORE_CONFLICTS,
      ignoreDeploy: IGNORE_DEPLOY,
    },
  });
  return true;
}

function findGame() {
  return util.epicGamesLauncher
    .findByName([STEAMAPP_ID, EGS_CODENAME])
    .then((game) => game.gamePath);
}

async function prepareForModding(discovery) {
  let gamePath = discovery.path;
  let modsDir = path.join(gamePath, "Mods");

  return vfs.ensureDirWritableAsync(modsDir);
}

module.exports = {
  default: PhoenixPoint,
};
