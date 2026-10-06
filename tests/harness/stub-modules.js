"use strict";

// Makes `require()` of Vortex-only and native modules resolve to stubs, and blocks the
// network, so extension `index.js` files load under plain node. The hook stays installed for
// the life of the process: extensions also require lazily (inside installers and setup).

const Module = require("module");
const http = require("http");
const https = require("https");
const { vortexApi } = require("./vortex-api-stub");

const STUB_EXE_VERSION = "1.2.3.4";

// RegGetValue throws (rather than returning null) when the key is missing, like the real one.
const winapi = {
  RegGetValue: () => {
    throw new Error("registry key not found (stub)");
  },
};

const exeVersion = {
  getProductVersion: () => STUB_EXE_VERSION,
  getFileVersion: () => STUB_EXE_VERSION,
};

class IniParser {
  read() {
    return Promise.resolve({ data: {} });
  }
  write() {
    return Promise.resolve();
  }
}
const parseIni = { default: IniParser, WinapiFormat: class WinapiFormat {} };

const stubs = new Map([
  ["vortex-api", vortexApi],
  ["winapi-bindings", winapi],
  ["exe-version", exeVersion],
  ["vortex-parse-ini", parseIni],
]);

// Every blocked call is recorded, so a swallowed exception cannot hide an accidental download.
const networkAttempts = [];
let installed = false;

function blockNetwork() {
  const block = (what) => () => {
    networkAttempts.push(what);
    throw new Error(`network access blocked in tests: ${what}`);
  };
  globalThis.fetch = block("fetch");
  for (const [label, lib] of [
    ["http", http],
    ["https", https],
  ]) {
    lib.request = block(`${label}.request`);
    lib.get = block(`${label}.get`);
  }
}

function install() {
  if (installed) return;
  installed = true;
  const load = Module._load;
  Module._load = function (request, parent, isMain) {
    return stubs.has(request) ? stubs.get(request) : load.call(this, request, parent, isMain);
  };
  blockNetwork();
}

module.exports = { install, networkAttempts, STUB_EXE_VERSION, winapi };
