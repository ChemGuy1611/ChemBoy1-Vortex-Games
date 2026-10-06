"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, describe, it } = require("node:test");
const { makeState } = require("../harness/fake-context");
const { makeGameDir, tree } = require("../harness/fixtures");
const {
  idsOf,
  installerOf,
  settle,
  stubShell,
  summary,
  supportedBy,
  waitFor,
} = require("../harness/helpers");
const { loadExtension, templateDir, vortex } = require("../harness/load-extension");
const { all, setConst } = require("../harness/transforms");

const DIR = templateDir("template-rpgmaker");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const GLOBS = [
  path.join("**", "instructions.txt"),
  path.join("**", "screenshot*"),
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];
const DEFAULT_DESCRIPTION =
  "Mod installed with Vortex. See mod page for description. You may need to add additional parameters below.";

// Private helpers the template does not export, handed back through the module's exports.
const expose = (source) =>
  `${source}\nmodule.exports.internals = { editParametersDialog, writePluginEntry, readPluginEntry, stripOuterBraces, unquote, splitTopLevel, coercePairsToJson };`;

afterEach(() => {
  delete globalThis.window;
});

describe("template-rpgmaker: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the js folder, js file, root and json mod types", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-jsfolder", 25],
      ["XXX-jsfile", 26],
      ["XXX-root", 27],
      ["XXX-json", 28],
    ]);
    assert.deepEqual(
      ext.modTypes.map(({ options }) => options.name),
      ["js folder", "js file", "Root Folder", "JSON Mod"],
    );
  });

  it("registers the installers in order with the fallback last", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-jsfolder", 25],
      ["XXX-jsfile", 27],
      ["XXX-root", 29],
      ["XXX-json", 31],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the six toolbar actions in the mod toolbar group", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Open plugins.js File",
        "Open PCGamingWiki Page",
        "Open SteamDB Page",
        "View Changelog",
        "Open Downloads Folder",
        "Submit Bug Report",
      ],
    );
    assert.ok(
      ext.registeredActions.every(
        ({ group, priority, icon }) =>
          group === "mod-icons" && priority === 300 && icon === "open-ext",
      ),
    );
  });

  it("shows every toolbar action for this game only", async () => {
    const active = await loadExtension(DIR, { state: makeState({ activeGameId: GAME_ID }) });
    const other = await loadExtension(DIR, { state: makeState({ activeGameId: "other" }) });
    assert.ok(active.registeredActions.every(({ condition }) => condition() === true));
    assert.ok(other.registeredActions.every(({ condition }) => condition() === false));
  });

  it("registers a toggleable load order with a custom renderer and no validation", async () => {
    const calls = ext.calls.filter(({ name }) => name === "registerLoadOrder");
    assert.equal(calls.length, 1);
    const [registration] = calls[0].args;
    assert.equal(registration.gameId, GAME_ID);
    assert.equal(registration.toggleableEntries, true);
    assert.equal(typeof registration.usageInstructions, "function");
    assert.equal(typeof registration.customItemRenderer, "function");
    assert.equal(await registration.validate(), undefined);
  });

  it("listens for purges and deployments through the event bus", () => {
    for (const event of ["will-purge", "did-deploy", "did-purge"]) {
      assert.equal(ext.api.events.listenerCount(event), 1, event);
    }
    assert.deepEqual(ext.listeners, []);
  });

  it("offers a custom launch tool", () => {
    assert.deepEqual(idsOf(ext.game.supportedTools), ["XXX-customlaunch"]);
    const [launch] = ext.game.supportedTools;
    assert.equal(launch.executable(), "XXX.exe");
    assert.deepEqual(launch.requiredFiles, ["XXX.exe"]);
    assert.ok(launch.relative && launch.exclusive && launch.shell);
    assert.equal(launch.name, "Custom Launch");
    assert.equal(launch.logo, "exec.png");
  });
});

describe("template-rpgmaker: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const matrix = [
    [
      "a js folder with a plugin (the folder and the .js file both match)",
      tree("js/plugins/A.js"),
      ["XXX-jsfolder", "XXX-jsfile", "XXX-fallback"],
    ],
    [
      "a js folder in upper case",
      tree("JS/plugins/A.js"),
      ["XXX-jsfolder", "XXX-jsfile", "XXX-fallback"],
    ],
    ["a js folder with no plugins in it", tree("js/readme.txt"), ["XXX-jsfolder", "XXX-fallback"]],
    ["a lone plugin", tree("A.js"), ["XXX-jsfile", "XXX-fallback"]],
    ["a plugin with an upper-case extension", tree("A.JS"), ["XXX-jsfile", "XXX-fallback"]],
    ["a root img folder", tree("img/a.png"), ["XXX-root", "XXX-fallback"]],
    ["the game's own folder", tree("XXX/a.png"), ["XXX-root", "XXX-fallback"]],
    [
      "a data folder with json (root and json both match)",
      tree("data/Actors.json"),
      ["XXX-root", "XXX-json", "XXX-fallback"],
    ],
    ["a loose json file", tree("Actors.json"), ["XXX-json", "XXX-fallback"]],
    [
      "a root folder in another case (the folder match is case-sensitive)",
      tree("Img/a.png"),
      ["XXX-fallback"],
    ],
    ["loose files with no known marker", tree("readme.txt"), ["XXX-fallback"]],
    ["a FOMOD package with a plugin", tree("fomod/ModuleConfig.xml", "js/plugins/A.js"), []],
    ["a FOMOD package with a root folder", tree("fomod/ModuleConfig.xml", "img/a.png"), []],
    ["a FOMOD package with json", tree("fomod/ModuleConfig.xml", "a.json"), []],
  ];

  for (const [label, files, expected] of matrix) {
    it(`routes ${label}`, async () => {
      assert.deepEqual(await supportedBy(ext, files), expected);
    });
  }

  it("ignores mods for another game, whichever installer would match", async () => {
    for (const [label, files] of matrix) {
      assert.deepEqual(await supportedBy(ext, files, "someothergame"), [], label);
    }
  });

  it("treats each of the engine's own folders as a root folder", async () => {
    const folders = [
      "XXX",
      "audio",
      "css",
      "data",
      "effects",
      "fonts",
      "icon",
      "img",
      "lib",
      "locales",
      "swiftshader",
    ];
    for (const folder of folders) {
      const accepted = await supportedBy(ext, tree(`${folder}/a.txt`));
      assert.deepEqual(accepted, ["XXX-root", "XXX-fallback"], folder);
    }
  });

  it("accepts a json file with an upper-case extension", async () => {
    assert.deepEqual(await supportedBy(ext, tree("A.JSON")), ["XXX-json", "XXX-fallback"]);
  });
});

describe("template-rpgmaker: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const attribute = (value) => ({ type: "attribute", key: "pluginNames", value });

  it("js folder installer keeps the js folder at the top and records the plugins it carries", async () => {
    const files = tree(
      "Wrap/js/plugins/A.js",
      "Wrap/js/plugins/B.js",
      "Wrap/js/plugins/sub/C.js",
      "Wrap/js/other.txt",
      "Wrap/readme.txt",
      "Out/x.txt",
    );
    const { instructions } = await installerOf(ext, "XXX-jsfolder").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "js", "plugins", "A.js"), sep("js", "plugins", "A.js")),
      copy(sep("Wrap", "js", "plugins", "B.js"), sep("js", "plugins", "B.js")),
      copy(sep("Wrap", "js", "plugins", "sub", "C.js"), sep("js", "plugins", "sub", "C.js")),
      copy(sep("Wrap", "js", "other.txt"), sep("js", "other.txt")),
      copy(sep("Wrap", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-jsfolder" },
      attribute(["A", "B"]),
    ]);
  });

  it("js folder installer keeps a js folder that is already at the top, in any case", async () => {
    const top = await installerOf(ext, "XXX-jsfolder").install(
      tree("js/plugins/A.js", "js/plugins/notes.txt"),
    );
    assert.deepEqual(top.instructions, [
      copy(sep("js", "plugins", "A.js"), sep("js", "plugins", "A.js")),
      copy(sep("js", "plugins", "notes.txt"), sep("js", "plugins", "notes.txt")),
      { type: "setmodtype", value: "XXX-jsfolder" },
      attribute(["A"]),
    ]);
    const upper = await installerOf(ext, "XXX-jsfolder").install(tree("Wrap/JS/plugins/A.js"));
    assert.deepEqual(
      upper.instructions[0],
      copy(sep("Wrap", "JS", "plugins", "A.js"), sep("JS", "plugins", "A.js")),
    );
  });

  it("js folder installer stamps no plugin names when the folder holds no plugins", async () => {
    const { instructions } = await installerOf(ext, "XXX-jsfolder").install(
      tree("js/readme.txt", "js/lib/x.txt"),
    );
    assert.deepEqual(instructions.at(-1), { type: "setmodtype", value: "XXX-jsfolder" });
    assert.ok(instructions.every((entry) => entry.type !== "attribute"));
  });

  // The destination is cut at the first "js" in the matched path, so a wrapper folder whose name
  // contains "js" is cut inside the wrapper's name: the files land under the wrapper and no
  // plugin names are stamped. Pinned so that fixing the template turns this red.
  it("known gap: js folder installer keeps a wrapper folder whose name contains js", async () => {
    const { instructions } = await installerOf(ext, "XXX-jsfolder").install(
      tree("jsmods/js/plugins/A.js"),
    );
    assert.deepEqual(instructions, [
      copy(sep("jsmods", "js", "plugins", "A.js"), sep("jsmods", "js", "plugins", "A.js")),
      { type: "setmodtype", value: "XXX-jsfolder" },
    ]);
  });

  it("js file installer flattens to the first plugin's folder and records every plugin", async () => {
    const files = tree("Cool/A.js", "Cool/B.js", "Cool/readme.txt", "Out/x.js");
    const { instructions } = await installerOf(ext, "XXX-jsfile").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Cool", "A.js"), "A.js"),
      copy(sep("Cool", "B.js"), "B.js"),
      copy(sep("Cool", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-jsfile" },
      attribute(["A", "B"]),
    ]);
  });

  it("js file installer keeps plugins at the top of the archive as is", async () => {
    const { instructions } = await installerOf(ext, "XXX-jsfile").install(tree("A.js", "B.js"));
    assert.deepEqual(instructions, [
      copy("A.js", "A.js"),
      copy("B.js", "B.js"),
      { type: "setmodtype", value: "XXX-jsfile" },
      attribute(["A", "B"]),
    ]);
  });

  // path.basename's extension argument is case-sensitive, so a plugin saved as B.JS is stamped
  // "B.JS", and the deployed-plugin scan only counts names ending in lower-case .js, so it is
  // never listed on the load order page. Pinned so that fixing the template turns this red.
  it("known gap: js file installer stamps an upper-case .JS plugin with its extension", async () => {
    const { instructions } = await installerOf(ext, "XXX-jsfile").install(tree("A.js", "B.JS"));
    assert.deepEqual(instructions.at(-1), attribute(["A", "B.JS"]));
    const only = await installerOf(ext, "XXX-jsfile").install(tree("Cool/C.JS"));
    assert.deepEqual(only.instructions, [
      copy(sep("Cool", "C.JS"), "C.JS"),
      { type: "setmodtype", value: "XXX-jsfile" },
      attribute(["C.JS"]),
    ]);
    const folder = await installerOf(ext, "XXX-jsfolder").install(tree("js/plugins/D.JS"));
    assert.deepEqual(folder.instructions.at(-1), attribute(["D.JS"]));
  });

  it("root installer strips the wrapper folder above the root folder", async () => {
    const files = tree("Wrap/img/a.png", "Wrap/data/Map1.json", "Wrap/readme.txt", "Out/b.txt");
    const { instructions } = await installerOf(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "img", "a.png"), sep("img", "a.png")),
      copy(sep("Wrap", "data", "Map1.json"), sep("data", "Map1.json")),
      copy(sep("Wrap", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer keeps a root folder at the top and is not thrown off by a similar wrapper name", async () => {
    const top = await installerOf(ext, "XXX-root").install(tree("audio/a.ogg"));
    assert.deepEqual(top.instructions[0], copy(sep("audio", "a.ogg"), sep("audio", "a.ogg")));
    const similar = await installerOf(ext, "XXX-root").install(tree("imgs/img/a.png"));
    assert.deepEqual(
      similar.instructions[0],
      copy(sep("imgs", "img", "a.png"), sep("img", "a.png")),
    );
  });

  // The same first-occurrence cut as the js folder installer: a wrapper whose name ends with a
  // root folder's name duplicates that folder. Pinned so that fixing the template turns this red.
  it("known gap: root installer duplicates the root folder when the wrapper name ends with it", async () => {
    const { instructions } = await installerOf(ext, "XXX-root").install(tree("mydata/data/a.json"));
    assert.deepEqual(
      instructions[0],
      copy(sep("mydata", "data", "a.json"), sep("data", "data", "a.json")),
    );
  });

  it("json installer flattens to the json file's folder", async () => {
    const files = tree("Mod/Actors.json", "Mod/Items.json", "Mod/notes.txt", "Out/x.txt");
    const { instructions } = await installerOf(ext, "XXX-json").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Mod", "Actors.json"), "Actors.json"),
      copy(sep("Mod", "Items.json"), "Items.json"),
      copy(sep("Mod", "notes.txt"), "notes.txt"),
      { type: "setmodtype", value: "XXX-json" },
    ]);
    const top = await installerOf(ext, "XXX-json").install(tree("Actors.json"));
    assert.deepEqual(top.instructions[0], copy("Actors.json", "Actors.json"));
    const upper = await installerOf(ext, "XXX-json").install(tree("Mod/ACTORS.JSON", "Mod/b.txt"));
    assert.deepEqual(upper.instructions[0], copy(sep("Mod", "ACTORS.JSON"), "ACTORS.JSON"));
  });

  it("fallback installer copies every file as is, with no mod type, and notifies", async () => {
    const files = tree("readme.txt", "docs/a.txt");
    const { instructions } = await installerOf(ext, "XXX-fallback").install(
      files,
      "My Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy("readme.txt", "readme.txt"),
      copy(sep("docs", "a.txt"), sep("docs", "a.txt")),
    ]);
    const [notification] = ext.notifications;
    assert.equal(notification.id, "XXX-MyMod-fallback");
    assert.equal(notification.type, "info");
    assert.match(notification.message, /Fallback installer reached for My Mod/);
  });

  it("the fallback notice offers the developer contact and the mod page with its staging folder", async () => {
    const state = makeState({
      mods: {
        [GAME_ID]: { m1: { id: "m1", installationPath: "My Mod", attributes: { modId: 55 } } },
      },
    });
    const fresh = await loadExtension(DIR, { state });
    const opened = stubShell();
    await installerOf(fresh, "XXX-fallback").install(tree("a.txt"), "My Mod.installing");
    fresh.notifications[0].actions[0].action(() => undefined);

    const [, , , buttons] = fresh.dialogs[0];
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Continue", "Contact Ext. Developer", "Open Mod Page + Staging Folder"],
    );
    buttons[1].action();
    buttons[2].action();
    assert.deepEqual(opened, [
      "XXX?tab=posts",
      sep(vortex.APP_ROOT, "staging", "XXX", "My Mod"),
      "https://www.nexusmods.com/XXX/mods/55?tab=description",
    ]);
  });

  it("the mod page button falls back to the game's mods page when the mod is unknown", async () => {
    const opened = stubShell();
    await installerOf(ext, "XXX-fallback").install(tree("a.txt"), "Unknown.installing");
    ext.notifications.at(-1).actions[0].action(() => undefined);
    ext.dialogs.at(-1)[3][2].action();
    assert.equal(opened.at(-1), "https://www.nexusmods.com/XXX/mods/");
  });
});

describe("template-rpgmaker: toggles change what is registered", () => {
  it("fallbackInstaller off drops the fallback installer", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("fallbackInstaller", "false") });
    assert.deepEqual(idsOf(ext.installers), ["XXX-jsfolder", "XXX-jsfile", "XXX-root", "XXX-json"]);
  });

  it("allowSymlinks is on by default and off when toggled, as passed to the game details", async () => {
    const on = await loadExtension(DIR);
    const off = await loadExtension(DIR, { transform: setConst("allowSymlinks", "false") });
    assert.equal(on.game.details.supportsSymlinks, true);
    assert.equal(off.game.details.supportsSymlinks, false);
  });

  it("setupNotification on, the default, shows the plugins.js notice during setup, off does not", async () => {
    const dir = makeGameDir();
    const on = await loadExtension(DIR);
    await on.game.setup({ path: dir });
    const notice = on.notifications.find(({ id }) => id === "XXX-setup");
    assert.equal(notice.type, "info");
    assert.equal(notice.message, "Configure Installed Plugins");

    const off = await loadExtension(DIR, { transform: setConst("setupNotification", "false") });
    await off.game.setup({ path: dir });
    assert.equal(off.notifications.length, 0);
  });
});

describe("template-rpgmaker: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the game, plugins and data folders", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-jsfolder": gameDir,
      "XXX-jsfile": sep(gameDir, "js", "plugins"),
      "XXX-root": gameDir,
      "XXX-json": sep(gameDir, "data"),
    });
  });

  it("only offers the mod types once the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    for (const type of undiscovered.modTypes) assert.equal(type.isSupported(GAME_ID), false);
    for (const type of ext.modTypes) assert.equal(type.isSupported(GAME_ID), true);

    const both = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir }, other: { path: gameDir } } }),
    });
    for (const type of both.modTypes) assert.equal(type.isSupported("other"), false);
  });

  it("describes the game and passes the store ids through", async () => {
    const fresh = await loadExtension(DIR, {
      transform: all(
        setConst("STEAMAPP_ID", '"1234"'),
        setConst("GOGAPP_ID", '"g1"'),
        setConst("EPICAPP_ID", '"e1"'),
        setConst("XBOXAPP_ID", '"x1"'),
      ),
    });
    const { game } = fresh;
    assert.equal(game.name, "XXX");
    assert.equal(game.logo, "XXX.jpg");
    assert.equal(game.mergeMods, true);
    assert.equal(game.requiresCleanup, true);
    assert.equal(game.modPathIsRelative, true);
    assert.equal(game.queryModPath(), ".");
    assert.deepEqual(game.requiredFiles, ["XXX.exe"]);
    assert.deepEqual(game.compatible, { dinput: false, enb: false });
    assert.equal(game.details.steamAppId, 1234);
    assert.equal(game.details.gogAppId, "g1");
    assert.equal(game.details.epicAppId, "e1");
    assert.equal(game.details.xboxAppId, "x1");
    assert.deepEqual(game.environment, {
      SteamAPPId: "1234",
      GogAPPId: "g1",
      EpicAPPId: "e1",
      XboxAPPId: "x1",
    });
    assert.deepEqual(game.details.ignoreConflicts, GLOBS);
    assert.deepEqual(game.details.ignoreDeploy, GLOBS);
  });

  it("finds the game through the store helper", async () => {
    const asked = [];
    vortex.gameStore.findByAppId = (ids) => {
      asked.push(ids);
      return Promise.resolve({ gamePath: gameDir });
    };
    assert.equal(await ext.game.queryPath(), gameDir);
    assert.deepEqual(asked, [["XXX"]]);
  });

  it("picks the Xbox launcher executable only when its marker file exists", async () => {
    assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
    assert.equal(
      ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])),
      "gamelaunchhelper.exe",
    );
    const off = await loadExtension(DIR, { transform: setConst("XBOXAPP_ID", '"other"') });
    assert.equal(off.game.executable(makeGameDir(["gamelaunchhelper.exe"])), "XXX.exe");
    assert.equal(await off.game.requiresLauncher(gameDir, "xbox"), undefined);
  });

  it("sets the launcher for each store", async () => {
    const { requiresLauncher } = ext.game;
    assert.deepEqual(await requiresLauncher(gameDir, "steam"), { launcher: "steam" });
    assert.deepEqual(await requiresLauncher(gameDir, "xbox"), {
      launcher: "xbox",
      addInfo: { appId: "XXX", parameters: [{ appExecName: "XXX" }] },
    });
    assert.deepEqual(await requiresLauncher(gameDir, "epic"), {
      launcher: "epic",
      addInfo: { appId: "XXX" },
    });
    assert.equal(await requiresLauncher(gameDir, "gog"), undefined);
    const off = await loadExtension(DIR, { transform: setConst("EPICAPP_ID", '"other"') });
    assert.equal(await off.game.requiresLauncher(gameDir, "epic"), undefined);
  });
});

describe("template-rpgmaker: setup", () => {
  it("creates the plugins and data folders", async () => {
    const dir = makeGameDir();
    const ext = await loadExtension(DIR);
    await ext.game.setup({ path: dir });
    for (const folder of [sep("js", "plugins"), "data"]) {
      assert.ok(fs.statSync(path.join(dir, folder)).isDirectory(), folder);
    }
  });

  it("the setup notice explains plugin management and can open plugins.js or be silenced", async () => {
    const opened = stubShell();
    const dir = makeGameDir();
    const ext = await loadExtension(DIR);
    await ext.game.setup({ path: dir });
    ext.notifications.find(({ id }) => id === "XXX-setup").actions[0].action(() => undefined);

    const [, title, content, buttons] = ext.dialogs[0];
    assert.equal(title, "Configure Installed Plugins");
    assert.match(content.text, /Installed js plugin mods are added to the plugins\.js file/);
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Acknowledge", "Open plugins.js File", "Never Show Again"],
    );
    const suppressed = [];
    ext.api.suppressNotification = (id) => suppressed.push(id);
    buttons[1].action();
    buttons[2].action();
    assert.deepEqual(opened, [sep(dir, "js", "plugins.js")]);
    assert.deepEqual(suppressed, ["XXX-setup"]);
  });
});

describe("template-rpgmaker: toolbar actions", () => {
  async function run(title, { state } = {}) {
    const opened = stubShell();
    const ext = await loadExtension(DIR, { state });
    await ext.registeredActions.find((action) => action.title === title).action();
    return opened;
  }

  it("opens plugins.js in the discovered game folder", async () => {
    const state = makeState({ discovered: { [GAME_ID]: { path: "game" } } });
    assert.deepEqual(await run("Open plugins.js File", { state }), [
      sep("game", "js", "plugins.js"),
    ]);
  });

  it("opens the game's pages, the changelog shipped with the extension and the bug tracker", async () => {
    assert.deepEqual(await run("Open PCGamingWiki Page"), ["XXX"]);
    assert.deepEqual(await run("Open SteamDB Page"), ["https://steamdb.info/app/XXX/"]);
    assert.deepEqual(await run("View Changelog"), [path.join(DIR, "CHANGELOG.md")]);
    assert.deepEqual(await run("Submit Bug Report"), ["XXX?tab=bugs"]);
  });

  it("opens the Vortex downloads folder for the game once setup has run", async () => {
    const dir = makeGameDir();
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    await ext.game.setup({ path: dir });
    ext.registeredActions.find(({ title }) => title === "Open Downloads Folder").action();
    assert.deepEqual(opened, [sep(vortex.APP_ROOT, "downloads", GAME_ID)]);
  });

  it("reports a failure instead of throwing when the shell is unavailable", async () => {
    const URL_FAILURE = "Failed to open the URL";
    const FILE_FAILURE = "Failed to open the file or folder";
    const state = makeState({ discovered: { [GAME_ID]: { path: "game" } } });
    const titles = [
      ["Open plugins.js File", FILE_FAILURE],
      ["Open PCGamingWiki Page", URL_FAILURE],
      ["Open SteamDB Page", URL_FAILURE],
      ["View Changelog", FILE_FAILURE],
      ["Open Downloads Folder", FILE_FAILURE],
      ["Submit Bug Report", URL_FAILURE],
    ];
    for (const [title, message] of titles) {
      const ext = await loadExtension(DIR, { state });
      await ext.registeredActions.find((action) => action.title === title).action();
      assert.equal(ext.errors[0]?.[0], message, title);
    }
  });
});

// The load order page reads and writes plugins.js and a Vortex-owned sidecar in the game folder.
// These tests run it against a real temporary game folder.
describe("template-rpgmaker: plugins.js load order", () => {
  const entry = (name, extra = {}) => ({
    name,
    status: true,
    description: `${name} description`,
    parameters: {},
    ...extra,
  });
  const owners = (...names) => ({
    [GAME_ID]: Object.fromEntries(
      names.map((name, index) => [
        `m${index}`,
        { id: `m${index}`, attributes: { pluginNames: [name] } },
      ]),
    ),
  });
  const pluginsFile = (dir) => path.join(dir, "js", "plugins.js");
  const sidecarFile = (dir) => path.join(dir, "profile_pluginsLoadOrder.json");
  const writePlugins = (dir, entries) =>
    fs.writeFileSync(pluginsFile(dir), `var $plugins =\n${JSON.stringify(entries, null, 2)};`);
  const readPlugins = (dir) => {
    const text = fs.readFileSync(pluginsFile(dir), "utf8");
    return JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf(";")));
  };
  const writeSidecar = (dir, entries) =>
    fs.writeFileSync(sidecarFile(dir), JSON.stringify(entries, null, 2));
  const readSidecar = (dir) => JSON.parse(fs.readFileSync(sidecarFile(dir), "utf8"));
  const gameWith = (plugins) =>
    makeGameDir(plugins.map((name) => sep("js", "plugins", `${name}.js`)));

  async function load(dir, { names = ["A", "B"], loadOrder, transform } = {}) {
    const state = makeState({
      activeGameId: GAME_ID,
      discovered: { [GAME_ID]: { path: dir } },
      mods: owners(...names),
    });
    state.persistent.profiles.other = { id: "other", gameId: "someothergame" };
    if (loadOrder) state.persistent.loadOrder = { profile: loadOrder };
    const ext = await loadExtension(DIR, { state, transform });
    const registration = ext.calls.find(({ name }) => name === "registerLoadOrder").args[0];
    return { ext, registration };
  }

  describe("reading", () => {
    it("lists only plugins a Vortex mod owns, in plugins.js order, with their enabled state", async () => {
      const dir = gameWith(["A", "B", "Vanilla"]);
      const b = entry("B", {
        status: false,
        description: "b; has a semicolon",
        parameters: { x: "1" },
      });
      writePlugins(dir, [entry("Vanilla"), b, entry("A")]);
      const { registration } = await load(dir);

      const order = await registration.deserializeLoadOrder();
      assert.deepEqual(
        order.map(({ id, name, modId, enabled, locked }) => [id, name, modId, enabled, locked]),
        [
          ["B", "B", "m1", false, false],
          ["A", "A", "m0", true, false],
        ],
      );
      assert.deepEqual(order[0].data, b);
    });

    it("drops entries for plugins that are not deployed or that no mod owns", async () => {
      const dir = gameWith(["A", "B"]);
      writePlugins(dir, [entry("Gone"), entry("B"), entry("A")]);
      const { registration } = await load(dir, { names: ["A", "Gone"] });
      assert.deepEqual(
        (await registration.deserializeLoadOrder()).map(({ id }) => id),
        ["A"],
      );
    });

    it("creates the sidecar next to plugins.js, named for the profile", async () => {
      const dir = gameWith(["A"]);
      const { registration } = await load(dir);
      await registration.deserializeLoadOrder();
      assert.equal(fs.statSync(sidecarFile(dir)).size, 0);
    });

    it("adds sidecar-only entries after plugins.js's own, keeping their saved state", async () => {
      const dir = gameWith(["A", "B", "Vanilla"]);
      writePlugins(dir, [entry("B")]);
      writeSidecar(dir, [
        entry("A", { status: false, locked: true }),
        entry("Gone"),
        entry("B", { description: "stale copy" }),
      ]);
      const { registration } = await load(dir);

      const order = await registration.deserializeLoadOrder();
      assert.deepEqual(
        order.map(({ id, enabled, locked }) => [id, enabled, locked]),
        [
          ["B", true, false],
          ["A", false, true],
        ],
      );
      assert.equal(order[0].data.description, "B description");
    });

    it("gives a plugin in neither file the default entry, in deployed order", async () => {
      const dir = gameWith(["A", "B", "Vanilla"]);
      const { registration } = await load(dir);
      const order = await registration.deserializeLoadOrder();
      assert.deepEqual(
        order.map(({ id }) => id),
        ["A", "B"],
      );
      assert.deepEqual(order[0].data, {
        name: "A",
        status: true,
        description: DEFAULT_DESCRIPTION,
        parameters: {},
      });
    });

    it("treats a corrupt plugins.js as empty and never rewrites it while reading", async () => {
      const dir = gameWith(["A"]);
      fs.writeFileSync(pluginsFile(dir), "this is not a plugin list");
      const { registration } = await load(dir);
      const order = await registration.deserializeLoadOrder();
      assert.deepEqual(
        order.map(({ id }) => id),
        ["A"],
      );
      assert.equal(fs.readFileSync(pluginsFile(dir), "utf8"), "this is not a plugin list");
    });

    it("takes the lock from the stored load order before the sidecar's copy", async () => {
      const dir = gameWith(["A", "B"]);
      writePlugins(dir, [entry("B")]);
      writeSidecar(dir, [entry("A", { locked: false })]);
      const loadOrder = [
        { id: "A", locked: true },
        { id: "B", locked: false },
      ];
      const { registration } = await load(dir, { loadOrder });
      assert.deepEqual(
        (await registration.deserializeLoadOrder()).map(({ id, locked }) => [id, locked]),
        [
          ["B", false],
          ["A", true],
        ],
      );
    });

    it("counts an entry with no status field as enabled", async () => {
      const dir = gameWith(["A"]);
      writePlugins(dir, [{ name: "A", description: "d", parameters: {} }]);
      const { registration } = await load(dir);
      assert.equal((await registration.deserializeLoadOrder())[0].enabled, true);
    });

    it("reads a sidecar that is not a list as empty", async () => {
      const dir = gameWith(["A"]);
      writeSidecar(dir, { not: "a list" });
      const { registration } = await load(dir);
      assert.deepEqual(
        (await registration.deserializeLoadOrder()).map(({ id }) => id),
        ["A"],
      );
    });

    it("lists nothing, rather than failing, when there is no js/plugins folder", async () => {
      const dir = makeGameDir();
      const { registration } = await load(dir);
      assert.deepEqual(await registration.deserializeLoadOrder(), []);
    });

    it("finds plugins in nested folders under js/plugins", async () => {
      const dir = makeGameDir([
        sep("js", "plugins", "nested", "N.js"),
        sep("js", "plugins", "N.txt"),
      ]);
      const { registration } = await load(dir, { names: ["N"] });
      assert.deepEqual(
        (await registration.deserializeLoadOrder()).map(({ id }) => id),
        ["N"],
      );
    });
  });

  describe("writing", () => {
    const row = (name, extra = {}) => ({ id: name, name, enabled: true, locked: false, ...extra });

    it("writes the order and enabled state back, keeping descriptions and parameters", async () => {
      const dir = gameWith(["A", "B", "Vanilla"]);
      writePlugins(dir, [
        entry("Vanilla"),
        entry("Dead"),
        entry("B", { description: "keep me", parameters: { k: "v" } }),
      ]);
      const { registration } = await load(dir);

      await registration.serializeLoadOrder([
        row("A", {
          locked: true,
          data: { name: "A", description: "from data", parameters: { p: 1 } },
        }),
        row("B", { enabled: false }),
      ]);

      const expected = [
        entry("Vanilla"),
        { name: "A", description: "from data", parameters: { p: 1 }, status: true },
        { name: "B", status: false, description: "keep me", parameters: { k: "v" } },
      ];
      assert.equal(
        fs.readFileSync(pluginsFile(dir), "utf8"),
        `var $plugins =\n${JSON.stringify(expected, null, 2)};`,
      );
      const sidecar = readSidecar(dir);
      assert.equal(fs.readFileSync(sidecarFile(dir), "utf8"), JSON.stringify(sidecar, null, 2));
    });

    it("keeps locked in the sidecar only", async () => {
      const dir = gameWith(["A", "B"]);
      const { registration } = await load(dir);
      await registration.serializeLoadOrder([row("A", { locked: true }), row("B")]);
      assert.ok(readPlugins(dir).every((written) => !("locked" in written)));
      assert.deepEqual(
        readSidecar(dir).map(({ name, locked }) => [name, locked]),
        [
          ["A", true],
          ["B", false],
        ],
      );
    });

    it("fills a plugin never seen before with the default description and parameters", async () => {
      const dir = gameWith(["A"]);
      const { registration } = await load(dir);
      await registration.serializeLoadOrder([row("A")]);
      assert.deepEqual(readPlugins(dir), [
        { name: "A", description: DEFAULT_DESCRIPTION, parameters: {}, status: true },
      ]);
    });

    it("prefers plugins.js's own copy, then the sidecar's, then the entry's data", async () => {
      const dir = gameWith(["A", "B", "C"]);
      writePlugins(dir, [entry("A", { description: "from plugins.js" })]);
      writeSidecar(dir, [
        entry("A", { description: "sidecar A" }),
        entry("B", { description: "from sidecar" }),
      ]);
      const { registration } = await load(dir, { names: ["A", "B", "C"] });

      await registration.serializeLoadOrder([
        row("A"),
        row("B"),
        row("C", { data: { name: "Stale", description: "from data", parameters: {} } }),
      ]);
      assert.deepEqual(
        readPlugins(dir).map(({ name, description }) => [name, description]),
        [
          ["A", "from plugins.js"],
          ["B", "from sidecar"],
          ["C", "from data"],
        ],
      );
    });

    it("treats an entry with no enabled flag as enabled", async () => {
      const dir = gameWith(["A"]);
      const { registration } = await load(dir);
      await registration.serializeLoadOrder([{ id: "A", name: "A" }]);
      assert.equal(readPlugins(dir)[0].status, true);
      assert.equal(readSidecar(dir)[0].locked, false);
    });

    it("still writes the sidecar when plugins.js cannot be written", async () => {
      const dir = gameWith(["A"]);
      fs.mkdirSync(pluginsFile(dir));
      const { registration } = await load(dir);
      await registration.serializeLoadOrder([row("A")]);
      assert.equal(readSidecar(dir)[0].name, "A");
      assert.ok(
        vortex.logs.some(
          ({ level, message }) => level === "error" && /Could not write plugins\.js/.test(message),
        ),
      );
    });
  });

  describe("purge guard", () => {
    it("returns the stored load order untouched while a purge is under way", async () => {
      const dir = gameWith(["A"]);
      writePlugins(dir, [entry("A")]);
      const stored = [{ id: "A", name: "A", enabled: false, locked: true }];
      const { ext, registration } = await load(dir, { loadOrder: stored });

      ext.api.events.emit("will-purge", "profile");
      assert.deepEqual(await registration.deserializeLoadOrder(), stored);

      const before = fs.readFileSync(pluginsFile(dir), "utf8");
      await registration.serializeLoadOrder([{ id: "Z", name: "Z", enabled: true }]);
      assert.equal(fs.readFileSync(pluginsFile(dir), "utf8"), before);
      assert.equal(fs.existsSync(sidecarFile(dir)), false);
    });

    it("returns nothing while purging when no load order is stored yet", async () => {
      const dir = gameWith(["A"]);
      const { ext, registration } = await load(dir);
      ext.api.events.emit("will-purge", "profile");
      assert.deepEqual(await registration.deserializeLoadOrder(), []);
    });

    it("ignores a purge of another game's profile", async () => {
      const dir = gameWith(["A"]);
      const { ext, registration } = await load(dir);
      ext.api.events.emit("will-purge", "other");
      assert.deepEqual(
        (await registration.deserializeLoadOrder()).map(({ id }) => id),
        ["A"],
      );
    });

    it("lifts the guard on the next deploy and refreshes the stored load order from disk", async () => {
      const dir = gameWith(["A"]);
      writePlugins(dir, [entry("A")]);
      const { ext, registration } = await load(dir);

      ext.api.events.emit("will-purge", "profile");
      ext.api.events.emit("did-deploy", "profile");
      assert.equal(await waitFor(() => ext.dispatched.length > 0), true);

      const [action] = ext.dispatched;
      assert.equal(action.type, "setFBLoadOrder");
      assert.equal(action.payload[0], "profile");
      assert.deepEqual(
        action.payload[1].map(({ id }) => id),
        ["A"],
      );
      assert.deepEqual(
        (await registration.deserializeLoadOrder()).map(({ id }) => id),
        ["A"],
      );
    });

    it("does nothing on a deploy that is not the end of a purge", async () => {
      const dir = gameWith(["A"]);
      const { ext } = await load(dir);
      ext.api.events.emit("did-deploy", "profile");
      await settle();
      assert.deepEqual(ext.dispatched, []);
    });

    it("keeps the guard when another game's profile deploys", async () => {
      const dir = gameWith(["A"]);
      const { ext, registration } = await load(dir, { loadOrder: [{ id: "S" }] });
      ext.api.events.emit("will-purge", "profile");
      ext.api.events.emit("did-deploy", "other");
      await settle();
      assert.deepEqual(ext.dispatched, []);
      assert.deepEqual(await registration.deserializeLoadOrder(), [{ id: "S" }]);
    });

    it("prunes plugins.js down to the plugins still deployed after a purge, leaving the sidecar", async () => {
      const dir = gameWith(["Vanilla"]);
      writePlugins(dir, [entry("Vanilla"), entry("A"), entry("B")]);
      writeSidecar(dir, [entry("A"), entry("B")]);
      const sidecar = fs.readFileSync(sidecarFile(dir), "utf8");
      const { ext } = await load(dir);

      ext.api.events.emit("did-purge", "profile");
      //plugins.js is rewritten in place, so a read can land mid-write
      const pruned = () => {
        try {
          return readPlugins(dir).length === 1;
        } catch {
          return false;
        }
      };
      assert.equal(await waitFor(pruned), true);
      assert.deepEqual(readPlugins(dir), [entry("Vanilla")]);
      assert.equal(fs.readFileSync(sidecarFile(dir), "utf8"), sidecar);
    });

    it("leaves plugins.js alone after a purge that removed nothing, or for another game", async () => {
      const dir = gameWith(["Vanilla", "A"]);
      const compact = `var $plugins =\n[{"name":"Vanilla","status":true},{"name":"A","status":true}];`;
      fs.writeFileSync(pluginsFile(dir), compact);
      const { ext } = await load(dir);

      ext.api.events.emit("did-purge", "profile");
      await settle();
      assert.equal(fs.readFileSync(pluginsFile(dir), "utf8"), compact);

      fs.rmSync(path.join(dir, "js", "plugins", "A.js"));
      ext.api.events.emit("did-purge", "other");
      await settle();
      assert.equal(fs.readFileSync(pluginsFile(dir), "utf8"), compact);
    });
  });

  describe("editing one plugin's description and parameters", () => {
    const loadInternals = async (dir, extra = {}) => {
      const { ext } = await load(dir, { transform: expose, ...extra });
      return { ext, internals: ext.exports.internals };
    };

    it("patches an existing entry in plugins.js and the sidecar, and adds a missing one fresh", async () => {
      const dir = gameWith(["A", "B"]);
      writePlugins(dir, [entry("A"), entry("B")]);
      writeSidecar(dir, [entry("A", { locked: true })]);
      const { ext, internals } = await loadInternals(dir);

      await internals.writePluginEntry(ext.api, "A", {
        description: "new",
        parameters: { a: "1" },
      });
      assert.deepEqual(
        readPlugins(dir)[0],
        entry("A", { description: "new", parameters: { a: "1" } }),
      );
      assert.equal(readPlugins(dir)[1].description, "B description");
      assert.deepEqual(readSidecar(dir), [
        entry("A", { description: "new", parameters: { a: "1" }, locked: true }),
      ]);

      await internals.writePluginEntry(ext.api, "C", { description: "fresh" });
      assert.deepEqual(readPlugins(dir).at(-1), { name: "C", status: true, description: "fresh" });
      assert.deepEqual(readSidecar(dir).at(-1), {
        name: "C",
        status: true,
        description: "fresh",
        locked: false,
      });
    });

    it("starts a fresh list when plugins.js is corrupt rather than carrying junk forward", async () => {
      const dir = gameWith(["A"]);
      fs.writeFileSync(pluginsFile(dir), "this is not a plugin list");
      const { ext, internals } = await loadInternals(dir);
      await internals.writePluginEntry(ext.api, "A", { description: "d" });
      assert.deepEqual(readPlugins(dir), [{ name: "A", status: true, description: "d" }]);
    });

    it("reads a plugin fresh from plugins.js, then the sidecar, then a bare default", async () => {
      const dir = gameWith(["A", "B"]);
      writePlugins(dir, [entry("A", { description: "from plugins.js" })]);
      writeSidecar(dir, [entry("A", { description: "sidecar A" }), entry("B")]);
      const { ext, internals } = await loadInternals(dir);

      assert.equal((await internals.readPluginEntry(ext.api, "A")).description, "from plugins.js");
      assert.equal((await internals.readPluginEntry(ext.api, "B")).description, "B description");
      assert.deepEqual(await internals.readPluginEntry(ext.api, "Nope"), {
        description: DEFAULT_DESCRIPTION,
        parameters: {},
      });
    });

    describe("the dialog", () => {
      const DESC = "XXX-editdescinput";
      const PARAMS = "XXX-editparamsinput";

      // Answers the dialog the given way each time it opens and records what it was shown.
      const answering = (ext, ...answers) => {
        const shown = [];
        ext.api.showDialog = async (type, title, content, buttons) => {
          shown.push({ type, title, content, buttons });
          return answers.shift() ?? { action: "Cancel" };
        };
        return shown;
      };
      const save = (description, parameters) => ({
        action: "Save",
        input: { [DESC]: description, [PARAMS]: parameters },
      });
      const edit = async (internals, ext, ...answers) => {
        const shown = answering(ext, ...answers);
        const result = await internals.editParametersDialog(ext.api, "Cool", "desc", '{"a": "1"}');
        return { result, shown };
      };

      it("shows both fields prefilled, without the wrapping braces, and no default button", async () => {
        const { ext, internals } = await loadInternals(gameWith([]));
        const { result, shown } = await edit(internals, ext);
        assert.equal(result, undefined);
        const [dialog] = shown;
        assert.equal(dialog.type, "question");
        assert.equal(dialog.title, "Edit Parameters - Cool");
        assert.deepEqual(
          dialog.content.input.map(({ id, type, label, value }) => [id, type, label, value]),
          [
            [DESC, "multiline", "Description", "desc"],
            [PARAMS, "multiline", "Parameters (key: value pairs, one per line)", '"a": "1"'],
          ],
        );
        assert.deepEqual(dialog.buttons, [{ label: "Cancel" }, { label: "Save" }]);
      });

      it("returns the description and parsed parameters on Save", async () => {
        const { ext, internals } = await loadInternals(gameWith([]));
        const cases = [
          ['"a": "1", "b": 2', { a: "1", b: 2 }],
          ['{"a": "1"}', { a: "1" }],
          ["", {}],
          ["  ", {}],
          ["a: 1\nb: hello", { a: "1", b: "hello" }],
          ["a: 1, b: 2", { a: "1", b: "2" }],
          ["url: http://x.test:80/y", { url: "http://x.test:80/y" }],
          ['msg: "a, b"', { msg: "a, b" }],
          ["'k': 'v'", { k: "v" }],
          ["{a: 1}", { a: "1" }],
        ];
        for (const [text, parameters] of cases) {
          const { result } = await edit(internals, ext, save("new desc", text));
          assert.deepEqual(result, { description: "new desc", parameters }, text);
        }
      });

      it("treats a missing description as empty", async () => {
        const { ext, internals } = await loadInternals(gameWith([]));
        const { result } = await edit(internals, ext, { action: "Save", input: { [PARAMS]: "" } });
        assert.deepEqual(result, { description: "", parameters: {} });
      });

      it("reports invalid parameters and reopens with both edits preserved", async () => {
        const { ext, internals } = await loadInternals(gameWith([]));
        const { result, shown } = await edit(
          internals,
          ext,
          save("my desc", "no colon here"),
          save("my desc", "ok: fixed"),
        );
        assert.deepEqual(result, { description: "my desc", parameters: { ok: "fixed" } });
        assert.equal(ext.errors[0][0], "Invalid JSON - parameters not saved");
        assert.deepEqual(ext.errors[0][2], { allowReport: false });
        assert.equal(shown.length, 2);
        const [first, second] = shown.map(({ content }) => content.input.map(({ value }) => value));
        assert.deepEqual(first, ["desc", '"a": "1"']);
        assert.deepEqual(second, ["my desc", "no colon here"]);
      });

      it("gives up quietly when the reopened dialog is cancelled", async () => {
        const { ext, internals } = await loadInternals(gameWith([]));
        const { result } = await edit(internals, ext, save("d", "no colon here"));
        assert.equal(result, undefined);
        assert.equal(ext.errors.length, 1);
      });
    });

    describe("parameter text helpers", () => {
      let internals;
      before(async () => {
        const { ext } = await load(gameWith([]), { transform: expose });
        internals = ext.exports.internals;
      });

      it("stripOuterBraces removes one surrounding pair and tolerates missing text", () => {
        assert.equal(internals.stripOuterBraces("  {a: 1} "), "a: 1");
        assert.equal(internals.stripOuterBraces("{ a: 1 }"), "a: 1");
        assert.equal(internals.stripOuterBraces("a: 1"), "a: 1");
        assert.equal(internals.stripOuterBraces("{}"), "");
        assert.equal(internals.stripOuterBraces("{a"), "{a");
        assert.equal(internals.stripOuterBraces("a}"), "a}");
        assert.equal(internals.stripOuterBraces(undefined), "");
      });

      it("unquote removes matching quotes only", () => {
        assert.equal(internals.unquote('"x"'), "x");
        assert.equal(internals.unquote("'x'"), "x");
        assert.equal(internals.unquote(' "x" '), "x");
        assert.equal(internals.unquote("x"), "x");
        assert.equal(internals.unquote('"x'), '"x');
        assert.equal(internals.unquote("\"x'"), "\"x'");
        assert.equal(internals.unquote('"'), '"');
      });

      it("splitTopLevel splits on delimiters outside quotes", () => {
        assert.deepEqual(internals.splitTopLevel('a,"b,c",d', ","), ["a", '"b,c"', "d"]);
        assert.deepEqual(internals.splitTopLevel("a,'b,c',d", ","), ["a", "'b,c'", "d"]);
        assert.deepEqual(internals.splitTopLevel("a\nb,c", "\n,"), ["a", "b", "c"]);
        assert.deepEqual(internals.splitTopLevel("", ","), [""]);
      });

      it("coercePairsToJson quotes both sides and names the entry that has no colon", () => {
        assert.equal(internals.coercePairsToJson("a: 1\nb: x"), '{"a": "1", "b": "x"}');
        assert.equal(internals.coercePairsToJson(""), "{}");
        assert.equal(internals.coercePairsToJson("a: 1,,\n b: 2 "), '{"a": "1", "b": "2"}');
        assert.equal(internals.coercePairsToJson("t: 10:30"), '{"t": "10:30"}');
        assert.throws(() => internals.coercePairsToJson("novalue"), /No ':' found in "novalue"/);
      });
    });
  });
});
