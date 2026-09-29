/*//////////////////////////////////////////////////
Name: Global Ignore Patterns Helper Extension
Structure: Utility Extension (global helper, no target game)
Author: ChemBoy1
Version: 1.0.0
Date: 2026-09-28
//////////////////////////////////////////////////*/

//Import libraries
const path = require("path");
const { util, log } = require("vortex-api");

//Specify all information about the extension
const EXTENSION_NAME = "Global Ignore Patterns Helper";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/2381";

// Glob patterns applied to every known game's ignoreConflicts/ignoreDeploy.
// Matches the readme*/changelog* convention already baked into every
// game-*/template-* index.js, plus license* which this extension adds
// globally so per-extension files never need to carry it themselves.
const PATTERNS = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];

const IGNORE_KEYS = ["ignoreConflicts", "ignoreDeploy"];

// Splice PATTERNS into one game's live registered IGame.details, additive only.
// util.getGame() returns a Proxy that passes non-intercepted keys (incl. "details")
// straight through to the real registered object, so this mutation is visible to
// every other extension (mod_management's BlacklistSet, mod-dependency-manager's
// blacklist) that reads game.details.ignoreConflicts/ignoreDeploy afterward.
function patchGame(gameId) {
  const game = util.getGame(gameId);
  if (!game) {
    return;
  }
  if (!game.details) {
    game.details = {};
  }
  for (const key of IGNORE_KEYS) {
    if (!Array.isArray(game.details[key])) {
      game.details[key] = [];
    }
    for (const pattern of PATTERNS) {
      if (!game.details[key].includes(pattern)) {
        game.details[key].push(pattern);
      }
    }
  }
}

function safePatchGame(gameId) {
  try {
    patchGame(gameId);
  } catch (err) {
    log("warn", `${EXTENSION_NAME} failed to patch ignore patterns for game`, {
      gameId,
      error: err.message,
    });
  }
}

//Main function
function main(context) {
  context.once(() => {
    const state = context.api.getState();
    const known = state?.session?.gameMode?.known ?? [];
    known.forEach((game) => safePatchGame(game.id));

    context.api.events.on("gamemode-activated", (gameId) => safePatchGame(gameId));
  });

  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
