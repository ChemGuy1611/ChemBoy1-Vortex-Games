"use strict";

// Smoke run of the template contract checks against released game extensions. It catches a
// syntax slip or a broken registration after a repo-wide patch, without any game-specific
// assertions. It is NOT part of `npm test` (the file name has no `.test.js` suffix): game
// extensions carry years of per-game drift the template contract was never written for, so the
// useful signal is what CHANGED, not what is red.
//
// Run:  npm run test:games
//
// Environment:
//   CB1_GAMES            comma-separated game ids (without the `game-` prefix).
//   CB1_GAME_LIST        path to a file with one game id per line.
//                        With neither set, every game in a games-*-parity.txt list is used.
//   CB1_GAME_ROOT        folder holding the game-* folders, default the repo root. Points the run
//                        at a scratch copy, which is how a deliberately broken game proves the
//                        run can go red.
//   CB1_SMOKE_BASELINE   path to a baseline JSON file outside the repo.
//                        File missing: the run records it (every game passes).
//                        File present: a game fails on a load error or any contract violation
//                        that the baseline does not already hold. Fixed violations are fine.
//                        Variable unset: report mode, a game fails only if it does not load or
//                        does not register exactly one game.
//
// Typical use around a patch: record a baseline on the unpatched tree, patch, run again.

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { describe, it, after } = require("node:test");
const { checks } = require("./contract-checks");
const { loadExtension } = require("./harness/load-extension");

const REPO = path.join(__dirname, "..");
const LISTS = path.join(REPO, "resources", "lists");
const GAME_ROOT = process.env.CB1_GAME_ROOT || REPO;

const readIds = (file) =>
  fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

function gameIds() {
  if (process.env.CB1_GAMES) {
    return process.env.CB1_GAMES.split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }
  if (process.env.CB1_GAME_LIST) return readIds(process.env.CB1_GAME_LIST);
  const ids = new Set();
  for (const name of fs.readdirSync(LISTS).filter((n) => /^games-.*-parity\.txt$/.test(n))) {
    for (const id of readIds(path.join(LISTS, name))) ids.add(id);
  }
  return [...ids].sort();
}

const baselinePath = process.env.CB1_SMOKE_BASELINE;
const baseline =
  baselinePath && fs.existsSync(baselinePath)
    ? JSON.parse(fs.readFileSync(baselinePath, "utf8"))
    : null;
const recording = Boolean(baselinePath) && !baseline;
const recorded = {};

// Load one game and run every contract check. Returns { load, violations } where load is an
// error message (or null) and violations is a flat list of "check: detail" strings.
async function inspect(id) {
  const dir = path.join(GAME_ROOT, `game-${id}`);
  if (!fs.existsSync(path.join(dir, "index.js"))) {
    return { load: `game-${id}/index.js not found`, violations: [], registrations: 0 };
  }
  let ext;
  try {
    ext = await loadExtension(dir);
  } catch (err) {
    return { load: String(err?.message ?? err).split("\n")[0], violations: [], registrations: 0 };
  }
  const violations = [];
  for (const [name, check] of Object.entries(checks)) {
    try {
      for (const issue of await check(ext)) violations.push(`${name}: ${issue}`);
    } catch (err) {
      violations.push(`${name}: check threw ${String(err?.message ?? err).split("\n")[0]}`);
    }
  }
  return { load: null, violations, registrations: ext.gameRegistrations };
}

const ids = gameIds();

describe(`game smoke (${ids.length} games, ${baseline ? "compare" : recording ? "record" : "report"})`, () => {
  for (const id of ids) {
    it(`game-${id}`, async (t) => {
      const result = await inspect(id);
      recorded[id] = { load: result.load, violations: result.violations };

      if (result.violations.length) {
        t.diagnostic(`${result.violations.length} contract violation(s)`);
      }
      if (recording) return;

      if (!baseline) {
        assert.equal(result.load, null, "did not load");
        assert.equal(result.registrations, 1, "registerGame must be called exactly once");
        return;
      }

      const before = baseline[id];
      assert.ok(before, `no baseline entry for ${id}; re-record the baseline`);
      if (result.load !== null) {
        assert.equal(result.load, before.load, `load failed: ${result.load}`);
        return;
      }
      assert.equal(before.load, null, "baseline recorded a load error that is now gone; re-record");
      const known = new Set(before.violations);
      const added = result.violations.filter((v) => !known.has(v));
      assert.deepEqual(added, [], "new contract violations since the baseline");
    });
  }

  after(() => {
    if (recording) {
      fs.writeFileSync(baselinePath, JSON.stringify(recorded, null, 2) + "\n");
    }
  });
});
