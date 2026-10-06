"use strict";

// Checks every template must satisfy, derived from .claude/rules/extension-authoring.md and
// the Vortex registration contract. Each check takes a loaded extension (see
// harness/load-extension.js) and returns a list of violation strings; empty means it passes.
// Returning data instead of asserting lets the contract suite also run a check against a
// deliberately broken copy and require it to fail.

const { makeGameDir, makeTempDir, tree } = require("./harness/fixtures");
const { gameStore } = require("./harness/load-extension").vortex;
const { setActiveGame } = require("./harness/fake-context");

const OTHER_GAME = "notthisgame";
const FOMOD = ["fomod/", "fomod/ModuleConfig.xml"];

// Candidate file sets used to find one an installer accepts, so the game-id and FOMOD guards
// can be exercised without knowing each template's constants. The placeholder name matches
// the scaffold ("XXX"); template suites cover installers these do not reach.
const PROBES = [
  ["XXX/", "XXX/a.dat"],
  ["a.XXX"],
  ["XXX.dll"],
  ["a.exe"],
  ["a.dll"],
  ["a.pak"],
  ["a.ovl"],
  ["a.forge"],
  ["a.zip"],
  ["Binaries/a.dll"],
  ["modconfig.json"],
  ["readme.txt"],
].map((entries) => tree(...entries));

async function findProbe(installer, gameId) {
  for (const files of PROBES) {
    try {
      const result = await installer.testSupported(files, gameId);
      if (result?.supported) return files;
    } catch {
      // A probe an installer cannot handle is simply not a match.
    }
  }
  return null;
}

const withFomod = (files) => [...files, ...tree(...FOMOD)];

const checks = {
  "game-registration": (ext) => {
    const issues = [];
    if (ext.gameRegistrations !== 1) {
      issues.push(`registerGame called ${ext.gameRegistrations} times, expected 1`);
    }
    const game = ext.game;
    if (!game) return issues;
    if (typeof game.id !== "string" || !game.id) issues.push("game.id missing");
    if (typeof game.name !== "string" || !game.name) issues.push("game.name missing");
    if (game.mergeMods === undefined) issues.push("game.mergeMods missing");
    if (!Array.isArray(game.requiredFiles)) issues.push("game.requiredFiles is not an array");
    if (!Array.isArray(game.supportedTools)) issues.push("game.supportedTools is not an array");
    for (const key of ["queryModPath", "executable", "setup"]) {
      if (typeof game[key] !== "function") issues.push(`game.${key} is not a function`);
    }
    // Discovery is either a queryPath function or a queryArgs lookup (template-frostbite).
    if (typeof game.queryPath !== "function" && !game.queryArgs) {
      issues.push("game has neither queryPath nor queryArgs");
    }
    return issues;
  },

  "modtype-priority": (ext) => {
    const issues = [];
    const seen = new Set();
    // Spec "low" types start at 75 and add their array index, so the ceiling rises with the
    // number of registered mod types.
    const ceiling = 75 + Math.max(ext.modTypes.length - 1, 0);
    for (const { id, priority } of ext.modTypes) {
      if (!(priority >= 25 && priority <= ceiling))
        issues.push(`modtype ${id} priority ${priority} outside 25-${ceiling}`);
      if (seen.has(id)) issues.push(`modtype id ${id} registered twice`);
      seen.add(id);
    }
    return issues;
  },

  "installer-priority-range": (ext) =>
    ext.installers
      .filter(({ priority }) => !(priority >= 25 && priority <= 49))
      .map(({ id, priority }) => `installer ${id} priority ${priority} outside 25-49`),

  "installer-priority-unique": (ext) => {
    const byPriority = new Map();
    for (const { id, priority } of ext.installers) {
      byPriority.set(priority, [...(byPriority.get(priority) ?? []), id]);
    }
    return [...byPriority]
      .filter(([, ids]) => ids.length > 1)
      .map(([priority, ids]) => `priority ${priority} shared by ${ids.join(", ")}`);
  },

  "installer-fallback-last": (ext) => {
    const fallbacks = ext.installers.filter(({ id }) => id.endsWith("-fallback"));
    const issues = [];
    for (const fallback of fallbacks) {
      if (fallback.priority !== 49)
        issues.push(`${fallback.id} priority ${fallback.priority}, expected 49`);
      if (ext.installers.at(-1) !== fallback)
        issues.push(`${fallback.id} is not the last installer registered`);
    }
    return issues;
  },

  "installer-shape": async (ext) => {
    const issues = [];
    for (const installer of ext.installers) {
      if (typeof installer.install !== "function")
        issues.push(`${installer.id}: install is not a function`);
      let result;
      try {
        result = await installer.testSupported(tree("readme.txt"), ext.game?.id);
      } catch (err) {
        issues.push(`${installer.id}: testSupported threw ${err.message}`);
        continue;
      }
      if (typeof result?.supported !== "boolean")
        issues.push(`${installer.id}: supported is not a boolean`);
      if (!Array.isArray(result?.requiredFiles))
        issues.push(`${installer.id}: requiredFiles is not an array`);
    }
    return issues;
  },

  "installer-gameid": async (ext) => {
    const issues = [];
    for (const installer of ext.installers) {
      const files = (await findProbe(installer, ext.game?.id)) ?? tree("readme.txt");
      const result = await installer.testSupported(files, OTHER_GAME);
      if (result?.supported) issues.push(`${installer.id}: supported a mod for another game`);
    }
    return issues;
  },

  "installer-fomod": async (ext) => {
    const issues = [];
    for (const installer of ext.installers) {
      const probe = await findProbe(installer, ext.game?.id);
      if (probe) {
        const result = await installer.testSupported(withFomod(probe), ext.game?.id);
        if (result?.supported) issues.push(`${installer.id}: accepts a FOMOD package`);
      } else if (!/moduleconfig\.xml/i.test(String(installer.testSupported))) {
        // No generic probe reaches this installer, so fall back to reading its guard.
        issues.push(`${installer.id}: no FOMOD guard found in testSupported`);
      }
    }
    return issues;
  },

  "register-phase": (ext) =>
    ext.calls
      .filter(({ phase }) => phase === "once")
      .map(({ name }) => `${name} called inside context.once`),

  "mod-icons-guard": (ext) => {
    const issues = [];
    const gameId = ext.game?.id;
    for (const action of ext.registeredActions.filter(({ group }) => group === "mod-icons")) {
      const label = `mod-icons action "${action.title}"`;
      if (action.priority !== 300)
        issues.push(`${label} priority ${action.priority}, expected 300`);
      if (typeof action.condition !== "function") {
        issues.push(`${label} has no condition`);
        continue;
      }
      try {
        setActiveGame(ext.state, OTHER_GAME);
        if (action.condition()) issues.push(`${label} shows for another game`);
        setActiveGame(ext.state, gameId);
        if (!action.condition()) issues.push(`${label} hidden for its own game`);
      } catch (err) {
        issues.push(`${label} condition threw ${err.message}`);
      } finally {
        setActiveGame(ext.state, undefined);
      }
    }
    return issues;
  },

  "query-path": async (ext) => {
    if (typeof ext.game?.queryPath !== "function") return [];
    const issues = [];
    const found = makeTempDir();
    gameStore.findByAppId = () => Promise.resolve({ gamePath: found });
    try {
      const resolved = await ext.game.queryPath();
      if (resolved !== found)
        issues.push(`queryPath resolved ${resolved}, expected the store path`);
    } catch (err) {
      issues.push(`queryPath failed with a store hit: ${err.message}`);
    }
    gameStore.findByAppId = () => Promise.reject(new Error("not installed"));
    try {
      await ext.game.queryPath();
    } catch {
      // Rejecting is how "not installed" is reported; only a synchronous throw is a bug.
    }
    return issues;
  },

  "executable-per-store": (ext) => {
    const issues = [];
    const stores = {
      none: [],
      steam: ["steam_api64.dll"],
      epic: ["EOSSDK-Win64-Shipping.dll"],
      gog: ["Galaxy64.dll"],
      xbox: ["appxmanifest.xml", "gamelaunchhelper.exe"],
    };
    for (const [store, markers] of Object.entries(stores)) {
      try {
        const executable = ext.game.executable(makeGameDir(markers));
        if (typeof executable !== "string" || !executable) {
          issues.push(`executable for ${store} returned ${JSON.stringify(executable)}`);
        }
      } catch (err) {
        issues.push(`executable for ${store} threw ${err.message}`);
      }
    }
    return issues;
  },

  "debug-off": (ext) =>
    /^\s*(?:const|let)\s+debug\s*=\s*false\b/m.test(ext.source)
      ? []
      : ["debug toggle is not false"],
};

module.exports = { checks, findProbe, OTHER_GAME };
