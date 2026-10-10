"use strict";

// Minimal stand-in for the `vortex-api` package. The npm package is types only; the real
// implementation exists solely inside the Vortex app. This stub implements what extensions
// touch while loading and inside their installers. Any other member resolves to a no-op and
// is recorded in `unmocked`, so gaps in this stub stay visible instead of passing silently.

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const fsp = fs.promises;

// Virtual Vortex folders (documents, appData, staging...). Nothing creates this directory
// except extension code that writes into it, and it is removed again on process exit.
const APP_ROOT = path.join(os.tmpdir(), `cb1-template-tests-${process.pid}`);
process.on("exit", () => fs.rmSync(APP_ROOT, { recursive: true, force: true }));

const unmocked = new Set();
const logs = [];
const noop = () => undefined;

// Wrap `impl` so unknown members are recorded in `unmocked` and replaced by a no-op function.
// `fallback(key)` may supply a real value first; returning undefined means "not handled".
function lenient(label, impl, fallback = () => undefined) {
  return new Proxy(impl, {
    get(target, key, receiver) {
      if (Reflect.has(target, key)) return Reflect.get(target, key, receiver);
      if (typeof key === "symbol" || key === "then") return undefined;
      const found = fallback(key);
      if (found !== undefined) return found;
      unmocked.add(`${label}.${key}`);
      return noop;
    },
  });
}

// vortex-api `fs` wraps node fs with `fooAsync` variants; map them straight onto fs.promises.
const vortexFs = lenient(
  "fs",
  {
    ensureDirAsync: (dir) => fsp.mkdir(dir, { recursive: true }),
    ensureDirWritableAsync: (dir) => fsp.mkdir(dir, { recursive: true }),
    copyAsync: (src, dest) => fsp.cp(src, dest, { recursive: true }),
    removeAsync: (target) => fsp.rm(target, { recursive: true, force: true }),
  },
  (key) => {
    if (typeof key !== "string") return undefined;
    const base = key.endsWith("Async") ? key.slice(0, -"Async".length) : null;
    if (base && typeof fsp[base] === "function") return fsp[base].bind(fsp);
    if (typeof fs[key] === "function") return fs[key].bind(fs);
    return undefined;
  },
);

// Tests replace `findByAppId` to drive game discovery (resolve a path, or reject for "not installed").
const gameStore = {
  findByAppId: () => Promise.reject(new Error("game not found (stub)")),
};

// Records what an extension asked 7-Zip to do. `add` writes nothing, so a test that needs the
// archive on disk creates it itself.
const sevenZip = { calls: [] };
class SevenZip {
  async add(archive, files, options) {
    sevenZip.calls.push({ archive, files, options });
  }
}

// Visits every file and folder below `target`, folders before their contents, the way
// vortex-api's util.walk does: `callback(fullPath, stats)` is awaited per entry. With
// `ignoreErrors` an unreadable or missing folder ends quietly instead of rejecting.
async function walk(target, callback, options = {}) {
  let names;
  try {
    names = await fsp.readdir(target);
  } catch (err) {
    if (options.ignoreErrors) return;
    throw err;
  }
  for (const name of names.sort()) {
    const full = path.join(target, name);
    const stats = await fsp.stat(full);
    await callback(full, stats);
    if (stats.isDirectory()) await walk(full, callback, options);
  }
}

const util = lenient("util", {
  SevenZip,
  walk,
  // Same arithmetic as vortex-api: the value as text, left-padded with `padding` up to `width`.
  pad: (value, padding, width) => {
    const text = `${value}`;
    return text.length >= width ? text : padding.repeat(width - text.length) + text;
  },
  deBOM: (input) => input.replace(/^﻿/, ""),
  // The display name an extension shows for a mod. The real function also decorates it with the
  // version; the stub keeps just the name so assertions do not depend on that.
  renderModName: (mod) =>
    mod.attributes?.customFileName ??
    mod.attributes?.logicalFileName ??
    mod.attributes?.name ??
    mod.id,
  getVortexPath: (name) => path.join(APP_ROOT, String(name)),
  GameStoreHelper: lenient("util.GameStoreHelper", {
    findByAppId: (...args) => gameStore.findByAppId(...args),
  }),
  batchDispatch: (store, batch) => [].concat(batch).forEach((action) => store.dispatch(action)),
  copyFileAtomic: (source, destination) => fsp.copyFile(source, destination),
  fileMD5: (file) =>
    Promise.resolve(crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex")),
});

const activeProfile = (state) =>
  state.persistent?.profiles?.[state.settings?.profiles?.activeProfileId];

const selectors = lenient("selectors", {
  activeGameId: (state) => activeProfile(state)?.gameId,
  activeProfile,
  profileById: (state, profileId) => state.persistent?.profiles?.[profileId],
  discoveryByGame: (state, gameId) => state.settings?.gameMode?.discovered?.[gameId],
  installPathForGame: (state, gameId) => path.join(APP_ROOT, "staging", gameId),
  downloadPathForGame: (state, gameId) => path.join(APP_ROOT, "downloads", gameId),
  lastActiveProfileForGame: (state, gameId) =>
    state.settings?.profiles?.lastActiveProfile?.[gameId],
});

// Every action creator becomes `(...args) => ({ type, payload })`, enough to assert dispatches.
const actions = new Proxy(
  {},
  {
    get: (_, type) => (typeof type === "string" ? (...payload) => ({ type, payload }) : undefined),
  },
);

class VortexError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = new.target.name;
    Object.assign(this, options);
  }
}
const errorClasses = Object.fromEntries(
  [
    "ProcessCanceled",
    "UserCanceled",
    "SetupError",
    "DataInvalid",
    "NotFound",
    "ArgumentInvalid",
  ].map((name) => [name, { [name]: class extends VortexError {} }[name]]),
);

// React components and UI helpers extensions import at the top level but only render inside
// Vortex. They stay inert here, so they are not reported as gaps in this stub.
const UI_MEMBERS = new Set([
  "Icon",
  "MainPage",
  "FlexLayout",
  "Spinner",
  "Webview",
  "Toggle",
  "More",
  "LoadOrderIndexInput",
  "MainContext",
  "DNDContainer",
  "DraggableList",
  "tooltip",
]);

const vortexApi = lenient(
  "vortex-api",
  {
    util,
    fs: vortexFs,
    selectors,
    actions,
    log: (level, message, meta) => logs.push({ level, message, meta }),
    VortexError,
    ...errorClasses,
  },
  (key) => (UI_MEMBERS.has(key) ? noop : undefined),
);

// Forget everything a previous load recorded. Shared module state is process-wide because
// extensions also `require("vortex-api")` lazily, long after their top-level code ran.
function reset() {
  unmocked.clear();
  logs.length = 0;
  sevenZip.calls.length = 0;
  gameStore.findByAppId = () => Promise.reject(new Error("game not found (stub)"));
}

module.exports = { vortexApi, unmocked, logs, gameStore, sevenZip, lenient, reset, APP_ROOT };
