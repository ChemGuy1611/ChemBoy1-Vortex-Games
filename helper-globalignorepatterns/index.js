/*//////////////////////////////////////////////////
Name: Global Ignore Patterns Helper Extension
Structure: Utility Extension (global helper, no target game)
Author: ChemBoy1
Version: 1.1.0
Date: 2026-11-08
//////////////////////////////////////////////////*/

//Import libraries
const path = require("path");
const { util, log } = require("vortex-api");

//Specify all information about the extension
const EXTENSION_ID = "globalignorepatterns";
const EXTENSION_NAME = "Global Ignore Patterns Helper";
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/2381";

// Glob patterns applied to every known game's ignoreConflicts/ignoreDeploy.
// Vortex matches these case-insensitively. Each document name uses two patterns:
// the name followed by anything without a dot, and the name followed by anything
// ending in a document extension, so that a mod file that only begins with the
// name (License_Plates.dds) still deploys. A leading * also catches names that only
// contain the word (SMIM Readme.txt). The notice names below are exact apart from
// the extension and the word separator, and only this extension carries them, along
// with the document and system file types. [-_ ] is a hyphen, underscore or space,
// and ?([-_ ]) also allows no separator.
const DOC_EXTS = "{txt,md,rtf,pdf,html,htm,doc,docx,url,nfo}";
const PATTERNS = [
  path.join("**", "change?([-_ ])log!(*.*)"),
  path.join("**", `*change?([-_ ])log*.${DOC_EXTS}`),
  path.join("**", "read?([-_ ])me!(*.*)"),
  path.join("**", `read?([-_ ])me*.${DOC_EXTS}`),
  path.join("**", `*readme*.${DOC_EXTS}`),
  path.join("**", "license!(*.*)"),
  path.join("**", `*licen[cs]e*.${DOC_EXTS}`),
  path.join("**", `copying{,.${DOC_EXTS}}`),
  path.join("**", `gpl-*.${DOC_EXTS}`),
  path.join("**", `*credit*.${DOC_EXTS}`),
  path.join("**", `*patch?([-_ ])notes*.${DOC_EXTS}`),
  path.join("**", "*.{pdf,doc,docx,rtf,url,nfo}"),
  path.join("**", "{Thumbs.db,desktop.ini,.DS_Store}"),
  path.join("**", `CommonLibSSE[-_ ]NG[-_ ]EXCEPTIONS.${DOC_EXTS}`),
  path.join("**", `EXCEPTIONS.${DOC_EXTS}`),
  path.join("**", `NOTICE{,S}{,.${DOC_EXTS}}`),
  path.join("**", `THIRD?([-_ ])PARTY?([-_ ]){NOTICES,LICENSES}.${DOC_EXTS}`),
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
