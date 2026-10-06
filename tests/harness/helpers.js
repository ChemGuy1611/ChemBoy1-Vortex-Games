"use strict";

// Small helpers the per-template suites share.

const idsOf = (list) => list.map(({ id }) => id);

// [id, priority] pairs, the compact shape registration is asserted in.
const summary = (list) => list.map(({ id, priority }) => [id, priority]);

const installerOf = (ext, id) => ext.installers.find((entry) => entry.id === id);

// Ids of every registered installer whose testSupported accepts these files.
async function supportedBy(ext, files, gameId = ext.game.id) {
  const accepted = [];
  for (const entry of ext.installers) {
    if ((await entry.testSupported(files, gameId)).supported) accepted.push(entry.id);
  }
  return accepted;
}

// Answers the download events the way Vortex would, recording each request. Returns the list
// the requests are appended to.
function answerDownloads(ext) {
  const seen = [];
  ext.api.events.on("start-download", (urls, info, _x, callback) => {
    seen.push({ event: "start-download", urls, info });
    callback(null, "download-1");
  });
  ext.api.events.on("start-install-download", (downloadId, _options, callback) => {
    seen.push({ event: "start-install-download", downloadId });
    callback(null, "mod-1");
  });
  return seen;
}

// Gives the test a window.api.shell that records what it was asked to open. Callers delete
// globalThis.window afterwards.
function stubShell() {
  const opened = [];
  globalThis.window = {
    api: { shell: { openUrl: (url) => opened.push(url), openFile: (file) => opened.push(file) } },
  };
  return opened;
}

// Runs `run` with members of the winapi-bindings stub replaced (for example RegGetValue to
// answer a registry lookup), and puts the stub back afterwards.
async function withWinapi(overrides, run) {
  const { winapi } = require("./stub-modules");
  const saved = Object.keys(overrides).map((key) => [key, Object.hasOwn(winapi, key), winapi[key]]);
  Object.assign(winapi, overrides);
  try {
    return await run();
  } finally {
    for (const [key, existed, value] of saved) {
      if (existed) winapi[key] = value;
      else delete winapi[key];
    }
  }
}

// Runs `run(requests)` with the blocked global fetch replaced by `handler(url, options)`, which
// answers the way the remote host would. Every request is appended to `requests`. The network
// block goes back afterwards, so only requests a test chose to answer are allowed through.
async function withFetch(handler, run) {
  const requests = [];
  const blocked = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), method: options.method ?? "GET" });
    return handler(String(url), options);
  };
  try {
    return await run(requests);
  } finally {
    globalThis.fetch = blocked;
  }
}

// A fetch Response stand-in carrying only what extensions read.
const reply = ({ status = 200, url = "", body = "" } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  url,
  text: async () => body,
  json: async () => JSON.parse(body),
});

// Toolbar actions start async work and return nothing to await. Polls `check` (sync or async)
// until it is truthy; resolves false when it never becomes so.
async function waitFor(check, tries = 200) {
  for (let attempt = 0; attempt < tries; attempt++) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return false;
}

// Gives fire-and-forget work time to run when a test expects nothing to happen.
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

module.exports = {
  idsOf,
  summary,
  installerOf,
  supportedBy,
  answerDownloads,
  stubShell,
  waitFor,
  settle,
  withWinapi,
  withFetch,
  reply,
};
