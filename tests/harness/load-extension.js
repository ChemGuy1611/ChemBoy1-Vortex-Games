"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const Module = require("module");
const path = require("path");
const { after } = require("node:test");
const stubModules = require("./stub-modules");
const vortex = require("./vortex-api-stub");
const { makeContext } = require("./fake-context");

// Folder holding the template-* folders. CB1_TEMPLATE_ROOT points the suites at a scratch copy,
// which is how a deliberately broken template is used to prove a suite goes red.
const REPO_ROOT = process.env.CB1_TEMPLATE_ROOT || path.join(__dirname, "..", "..");

// The repo's node_modules goes on the global search path so a scratch copy outside the repo,
// and the modules bundled inside it, still resolve the packages the repo installs.
process.env.NODE_PATH = [path.join(__dirname, "..", "..", "node_modules"), process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

// Every suite that loads an extension also proves it never reached for the network. The stubs
// throw on any attempt, but an extension could swallow that exception, so the attempts are
// recorded and asserted here.
after(() => {
  assert.deepEqual(stubModules.networkAttempts, [], "a test reached for the network");
});

// Load an extension folder's index.js under the stubs, run `main()` against a recording
// context, then run the callbacks it handed to `context.once`.
//
// `transform(source)` rewrites the source before it is compiled. The contract suite uses it
// to prove its checks can fail, and per-template suites use it to flip feature toggles. The
// file on disk is never touched.
//
// `bundled` replaces modules shipped inside the extension folder, keyed by file name, for example
// `{ "downloader.js": fake }`. It is how a suite checks what a template hands to a large shared
// module without running that module.
async function loadExtension(dir, { transform, state, runOnce = true, bundled = {} } = {}) {
  stubModules.install();
  vortex.reset();

  const file = path.join(dir, "index.js");
  const text = fs.readFileSync(file, "utf8");
  const original = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const source = transform ? transform(original) : original;

  // Bundled modules (downloader.js, *_browser.js) keep module-level state such as listener
  // guards, so each load starts from fresh copies of the ones inside the extension folder.
  for (const cached of Object.keys(require.cache)) {
    if (cached.startsWith(dir + path.sep)) delete require.cache[cached];
  }

  for (const [name, exports] of Object.entries(bundled)) {
    const stubFile = path.join(dir, name);
    const stub = new Module(stubFile, module);
    stub.filename = stubFile;
    stub.exports = exports;
    stub.loaded = true;
    require.cache[stubFile] = stub;
  }

  const loaded = new Module(file, module);
  loaded.filename = file;
  loaded.paths = Module._nodeModulePaths(dir);
  loaded._compile(source, file);

  const env = makeContext(state);
  const mainResult = await loaded.exports.default(env.context);
  if (runOnce) await env.runOnce();

  const byName = (name) => env.calls.filter((call) => call.name === name);
  return {
    name: path.basename(dir),
    dir,
    source,
    exports: loaded.exports,
    mainResult,
    unmocked: [...vortex.unmocked],
    ...env,
    game: byName("registerGame")[0]?.args[0],
    gameRegistrations: byName("registerGame").length,
    installers: byName("registerInstaller").map(
      ({ args: [id, priority, testSupported, install] }) => ({
        id,
        priority,
        testSupported,
        install,
      }),
    ),
    modTypes: byName("registerModType").map(
      ({ args: [id, priority, isSupported, getPath, test, options] }) => ({
        id,
        priority,
        isSupported,
        getPath,
        test,
        options,
      }),
    ),
    registeredActions: byName("registerAction").map(
      ({ args: [group, priority, icon, options, title, action, condition] }) => ({
        group,
        priority,
        icon,
        options,
        title,
        action,
        condition,
      }),
    ),
  };
}

// Absolute path of a template folder, e.g. templateDir("template-basic").
const templateDir = (name) => path.join(REPO_ROOT, name);

function listTemplates() {
  return fs
    .readdirSync(REPO_ROOT)
    .filter(
      (name) => name.startsWith("template-") && fs.existsSync(templateDir(name) + "/index.js"),
    )
    .sort();
}

module.exports = {
  loadExtension,
  templateDir,
  listTemplates,
  vortex,
};
