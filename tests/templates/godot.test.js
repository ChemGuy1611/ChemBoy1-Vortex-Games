"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, beforeEach, describe, it } = require("node:test");
const { makeState } = require("../harness/fake-context");
const { makeGameDir, makeTempDir, tree } = require("../harness/fixtures");
const {
  answerDownloads,
  idsOf,
  installerOf,
  stubShell,
  summary,
  supportedBy,
  waitFor,
} = require("../harness/helpers");
const { loadExtension, templateDir, vortex } = require("../harness/load-extension");
const { all, setConst } = require("../harness/transforms");

const DIR = templateDir("template-godot");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const SETUP_SCRIPT = "--script addons/mod_loader/mod_loader_setup.gd";
const GLOBS = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];

const DOWNLOAD_URL = "https://example.test/loader.zip";
const MANUAL_URL = "https://example.test/loader-page";
const loaderUrls = all(
  setConst("LOADER_CUSTOM_URL", `"${DOWNLOAD_URL}"`),
  setConst("LOADER_CUSTOM_URL_MANUAL", `"${MANUAL_URL}"`),
);
const stockLoader = setConst("customLoader", "false");
const withZips = setConst("keepZips", "true");

// Stands in for the bundled downloader.js: records what the template asks of it. `mod` is what
// findModByFile answers (undefined = the loader is not installed).
function fakeDownloader({ mod } = {}) {
  const calls = [];
  const exports = {
    download: async (_api, requirements, force) => {
      calls.push(["download", requirements, force]);
    },
    findModByFile: async (_api, modType, fileName) => {
      calls.push(["findModByFile", modType, fileName]);
      return mod;
    },
    findDownloadIdByFile: (_api, fileName) => {
      calls.push(["findDownloadIdByFile", fileName]);
      return "download-1";
    },
    resolveVersionByPattern: async (_api, requirement) => {
      calls.push(["resolveVersionByPattern", requirement]);
      return "1.0.0";
    },
    testRequirementVersion: async (_api, requirement) => {
      calls.push(["testRequirementVersion", requirement]);
    },
  };
  return { calls, bundled: { "downloader.js": exports } };
}

afterEach(() => {
  delete globalThis.window;
});

describe("template-godot: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the mod type first and the loader type low", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-mod", 25],
      ["XXX-godotmodloader", 76],
    ]);
    assert.deepEqual(
      ext.modTypes.map(({ options }) => options.name),
      ["Godot Mod", "Godot Mod Loader"],
    );
  });

  it("registers the loader, mod and fallback installers", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-godotmodloader", 25],
      ["XXX-mod", 27],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the seven toolbar actions in the mod toolbar group", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Open override.cfg",
        "Open PCGamingWiki Page",
        "Open Nexus Mods Page",
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

  it("offers a custom launch and a console launch, with no setup tool and no launch arguments", () => {
    const [launch, console] = ext.game.supportedTools;
    assert.deepEqual(idsOf(ext.game.supportedTools), ["XXX-customlaunch", "XXX-consolelaunch"]);
    assert.equal(launch.executable(), "XXX.exe");
    assert.equal(console.executable(), "XXX.console.exe");
    assert.deepEqual(console.requiredFiles, ["XXX.console.exe"]);
    assert.deepEqual([launch.parameters, console.parameters, ext.game.parameters], [[], [], []]);
    assert.equal(launch.defaultPrimary, false);
    assert.ok(
      [launch, console].every(
        (tool) => tool.relative && tool.exclusive && tool.shell && tool.logo === "exec.png",
      ),
    );
    assert.deepEqual(
      [launch, console].map(({ name }) => name),
      ["Custom Launch", "Console Launch"],
    );
  });

  it("registers no update listener, since the loader is fetched from a fixed address", () => {
    assert.deepEqual(ext.listeners, []);
  });
});

describe("template-godot: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const matrix = [
    [
      "the custom loader script (it is also a .gd file)",
      tree("mod_loader.gd"),
      ["XXX-godotmodloader", "XXX-mod", "XXX-fallback"],
    ],
    [
      "the loader script in upper case",
      tree("addons/MOD_LOADER.GD"),
      ["XXX-godotmodloader", "XXX-mod", "XXX-fallback"],
    ],
    [
      "a mod with mod_main.gd",
      tree("MyMod/mod_main.gd", "MyMod/manifest.json"),
      ["XXX-mod", "XXX-fallback"],
    ],
    ["a lone script", tree("a.gd"), ["XXX-mod", "XXX-fallback"]],
    ["a script in upper case", tree("Pack/A.GD"), ["XXX-mod", "XXX-fallback"]],
    ["a manifest with no script", tree("MyMod/manifest.json"), ["XXX-fallback"]],
    ["loose files with no known marker", tree("readme.txt"), ["XXX-fallback"]],
    ["a FOMOD package with a mod", tree("fomod/ModuleConfig.xml", "MyMod/mod_main.gd"), []],
    ["a FOMOD package with the loader", tree("fomod/ModuleConfig.xml", "mod_loader.gd"), []],
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

  it("looks for mod_loader_setup.gd instead once the stock loader is used", async () => {
    const stock = await loadExtension(DIR, { transform: stockLoader, ...fakeDownloader() });
    assert.deepEqual(await supportedBy(stock, tree("addons/mod_loader/mod_loader_setup.gd")), [
      "XXX-godotmodloader",
      "XXX-mod",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(stock, tree("mod_loader.gd")), ["XXX-mod", "XXX-fallback"]);
  });
});

describe("template-godot: loader install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("copies every file as is and types the mod as the loader", async () => {
    const files = tree("mod_loader.gd", "addons/mod_loader/a.gd", "addons/mod_loader/sub/b.gd");
    const { instructions } = await installerOf(ext, "XXX-godotmodloader").install(files);
    assert.deepEqual(instructions, [
      copy("mod_loader.gd", "mod_loader.gd"),
      copy(sep("addons", "mod_loader", "a.gd"), sep("addons", "mod_loader", "a.gd")),
      copy(sep("addons", "mod_loader", "sub", "b.gd"), sep("addons", "mod_loader", "sub", "b.gd")),
      { type: "setmodtype", value: "XXX-godotmodloader" },
    ]);
  });

  it("leaves out build caches and version control folders a release archive picked up", async () => {
    const files = tree(
      "mod_loader.gd",
      ".venv/lib/x.py",
      "__pycache__/a.pyc",
      "addons/.git/config",
      ".github/workflows/ci.yml",
      "tools/.GIT/HEAD",
      "github/readme.txt",
      "notgit/a.txt",
    );
    const { instructions } = await installerOf(ext, "XXX-godotmodloader").install(files);
    assert.deepEqual(
      instructions.map((entry) => entry.source ?? entry.value),
      ["mod_loader.gd", sep("github", "readme.txt"), sep("notgit", "a.txt"), "XXX-godotmodloader"],
    );
  });
});

describe("template-godot: mod install output (unpacked)", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const install = (files, name = "Cool Mod.installing") =>
    installerOf(ext, "XXX-mod").install(files, name);

  it("keeps the mod's own folder, anchored on mod_main.gd", async () => {
    const files = tree("MyMod/mod_main.gd", "MyMod/manifest.json", "MyMod/sub/a.gd");
    const { instructions } = await install(files);
    assert.deepEqual(instructions, [
      copy(sep("MyMod", "mod_main.gd"), sep("MyMod", "mod_main.gd")),
      copy(sep("MyMod", "manifest.json"), sep("MyMod", "manifest.json")),
      copy(sep("MyMod", "sub", "a.gd"), sep("MyMod", "sub", "a.gd")),
      { type: "setmodtype", value: "XXX-mod" },
    ]);
  });

  it("strips a wrapper folder above the mod's folder and drops its siblings", async () => {
    const files = tree("Wrap/MyMod/mod_main.gd", "Wrap/MyMod/a.gd", "Wrap/readme.txt", "Out/b.txt");
    const { instructions } = await install(files);
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "MyMod", "mod_main.gd"), sep("MyMod", "mod_main.gd")),
      copy(sep("Wrap", "MyMod", "a.gd"), sep("MyMod", "a.gd")),
      { type: "setmodtype", value: "XXX-mod" },
    ]);
  });

  it("names the folder after the archive when the mod files sit at the top", async () => {
    const { instructions } = await install(
      tree("mod_main.gd", "manifest.json"),
      "Cool Mod.zip.installing",
    );
    assert.deepEqual(instructions, [
      copy("mod_main.gd", sep("CoolMod", "mod_main.gd")),
      copy("manifest.json", sep("CoolMod", "manifest.json")),
      { type: "setmodtype", value: "XXX-mod" },
    ]);
  });

  it("strips every archive suffix and truncates the folder name to 29 characters", async () => {
    const name = `${"a".repeat(40)}.7z.installing`;
    const { instructions } = await install(tree("mod_main.gd"), name);
    assert.deepEqual(instructions[0], copy("mod_main.gd", sep("a".repeat(29), "mod_main.gd")));
    for (const archive of ["Pack.rar.installing", "Pack.7z.installing", "Pack.zip.installing"]) {
      const named = await install(tree("mod_main.gd"), archive);
      assert.deepEqual(named.instructions[0], copy("mod_main.gd", sep("Pack", "mod_main.gd")));
    }
  });

  it("lets the shallowest mod_main.gd win over a nested copy", async () => {
    const files = tree("A/mod_main.gd", "A/B/mod_main.gd", "A/B/x.gd");
    const { instructions } = await install(files);
    assert.deepEqual(
      instructions.map((entry) => entry.destination ?? entry.value),
      [sep("A", "mod_main.gd"), sep("A", "B", "mod_main.gd"), sep("A", "B", "x.gd"), "XXX-mod"],
    );
  });

  it("prefers mod_main.gd over a shallower manifest.json", async () => {
    const { instructions } = await install(tree("manifest.json", "Deep/Deeper/mod_main.gd"));
    assert.deepEqual(instructions[0].destination, sep("Deeper", "mod_main.gd"));
  });

  it("falls back to manifest.json, then to the first script, to find the mod folder", async () => {
    const manifest = await install(tree("MyMod/manifest.json", "MyMod/x.gd"));
    assert.deepEqual(
      manifest.instructions.map((entry) => entry.destination ?? entry.value),
      [sep("MyMod", "manifest.json"), sep("MyMod", "x.gd"), "XXX-mod"],
    );
    const apart = await install(tree("A/x.gd", "B/manifest.json", "B/y.gd"));
    assert.deepEqual(
      apart.instructions.map((entry) => entry.destination ?? entry.value),
      [sep("B", "manifest.json"), sep("B", "y.gd"), "XXX-mod"],
    );
    const script = await install(tree("Pack/a.gd", "Pack/b.gd"));
    assert.deepEqual(
      script.instructions.map((entry) => entry.destination ?? entry.value),
      [sep("Pack", "a.gd"), sep("Pack", "b.gd"), "XXX-mod"],
    );
  });

  it("recognises mod_main.gd and manifest.json in any case", async () => {
    const upper = await install(tree("Other/b.gd", "MyMod/MOD_MAIN.GD"));
    assert.deepEqual(
      upper.instructions.map((entry) => entry.destination ?? entry.value),
      [sep("MyMod", "MOD_MAIN.GD"), "XXX-mod"],
    );
    const manifest = await install(tree("Other/b.gd", "MyMod/MANIFEST.JSON", "MyMod/x.gd"));
    assert.deepEqual(
      manifest.instructions.map((entry) => entry.destination ?? entry.value),
      [sep("MyMod", "MANIFEST.JSON"), sep("MyMod", "x.gd"), "XXX-mod"],
    );
  });
});

describe("template-godot: mod install output (kept in zips)", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, { transform: withZips });
  });
  beforeEach(() => {
    vortex.sevenZip.calls.length = 0;
  });

  it("registers the zip installer for mods and puts them in the mods folder", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-godotmodloader", 25],
      ["XXX-mod", 27],
      ["XXX-fallback", 49],
    ]);
    assert.equal(ext.game.queryModPath(), "mods");
  });

  it("copies a nested archive through without repacking it", async () => {
    const files = tree("Mods/cool.zip", "Mods/other.7z", "Mods/third.rar", "readme.txt");
    const { instructions } = await installerOf(ext, "XXX-mod").install(files, makeTempDir());
    assert.deepEqual(instructions, [
      copy(sep("Mods", "cool.zip"), "cool.zip"),
      copy(sep("Mods", "other.7z"), "other.7z"),
      copy(sep("Mods", "third.rar"), "third.rar"),
      { type: "setmodtype", value: "XXX-mod" },
    ]);
    assert.deepEqual(vortex.sevenZip.calls, []);
  });

  it("repacks the whole staging folder into a zip named after the mod", async () => {
    const staging = path.join(makeTempDir(), "Cool Mod.installing");
    fs.mkdirSync(path.join(staging, "MyMod"), { recursive: true });
    fs.writeFileSync(path.join(staging, "readme.txt"), "");

    const { instructions } = await installerOf(ext, "XXX-mod").install(
      tree("MyMod/mod_main.gd"),
      staging,
    );

    assert.deepEqual(instructions, [
      copy("Cool Mod.zip", "Cool Mod.zip"),
      { type: "setmodtype", value: "XXX-mod" },
    ]);
    const [call] = vortex.sevenZip.calls;
    assert.equal(call.archive, path.join(staging, "Cool Mod.zip"));
    assert.deepEqual(
      [...call.files].sort(),
      [path.join(staging, "MyMod"), path.join(staging, "readme.txt")].sort(),
    );
    assert.deepEqual(call.options, { raw: ["-r"] });
  });

  it("truncates the zip's name to 25 characters before the extension", async () => {
    const staging = path.join(makeTempDir(), `${"b".repeat(40)}.installing`);
    fs.mkdirSync(staging);
    const { instructions } = await installerOf(ext, "XXX-mod").install(tree("a.gd"), staging);
    assert.equal(instructions[0].source, `${"b".repeat(25)}.zip`);
  });

  // The extension check is case-sensitive, so an archive named in upper case inside the mod is
  // not seen as an archive and the whole staging folder is zipped around it. Pinned so that
  // fixing the template turns this red.
  it("known gap: a nested .ZIP in upper case is repacked inside another zip", async () => {
    const staging = path.join(makeTempDir(), "Cool Mod.installing");
    fs.mkdirSync(staging);
    const { instructions } = await installerOf(ext, "XXX-mod").install(
      tree("Mods/COOL.ZIP"),
      staging,
    );
    assert.equal(instructions[0].source, "Cool Mod.zip");
    assert.equal(vortex.sevenZip.calls.length, 1);
  });
});

describe("template-godot: fallback installer", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("copies every file as is, with no mod type, and notifies", async () => {
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

  it("the notice offers the developer contact and the mod page with its staging folder", async () => {
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

describe("template-godot: toggles change what is registered", () => {
  it("fallbackInstaller off drops the fallback installer", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("fallbackInstaller", "false") });
    assert.deepEqual(idsOf(ext.installers), ["XXX-godotmodloader", "XXX-mod"]);
  });

  it("allowSymlinks is on by default and off when toggled, as passed to the game details", async () => {
    const on = await loadExtension(DIR);
    const off = await loadExtension(DIR, { transform: setConst("allowSymlinks", "false") });
    assert.equal(on.game.details.supportsSymlinks, true);
    assert.equal(off.game.details.supportsSymlinks, false);
  });

  it("keepZips on moves mods to the mods folder", async () => {
    const ext = await loadExtension(DIR, {
      transform: withZips,
      state: makeState({ discovered: { [GAME_ID]: { path: "game" } } }),
    });
    assert.equal(ext.modTypes[0].getPath({ id: GAME_ID }), sep("game", "mods"));
  });

  it("keepZips off, the default, uses mods-unpacked", async () => {
    const ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: "game" } } }),
    });
    assert.equal(ext.modTypes[0].getPath({ id: GAME_ID }), sep("game", "mods-unpacked"));
    assert.equal(ext.game.queryModPath(), "mods-unpacked");
  });

  it("the stock loader forces zips on, so a mods-unpacked folder the loader cannot see is never used", async () => {
    const ext = await loadExtension(DIR, {
      transform: all(stockLoader, setConst("keepZips", "false")),
      ...fakeDownloader(),
    });
    assert.equal(ext.game.queryModPath(), "mods");
  });

  it("the stock loader adds a setup tool and makes the custom launch the primary tool", async () => {
    const ext = await loadExtension(DIR, { transform: stockLoader, ...fakeDownloader() });
    assert.deepEqual(idsOf(ext.game.supportedTools), [
      "XXX-loadersetup",
      "XXX-customlaunch",
      "XXX-consolelaunch",
    ]);
    const [setup, launch, console] = ext.game.supportedTools;
    assert.deepEqual(setup.parameters, [`${SETUP_SCRIPT} --only-setup`]);
    assert.equal(setup.name, "Run Mod Loader Setup");
    assert.equal(setup.executable(), "XXX.exe");
    assert.equal(setup.shell, true);
    assert.deepEqual(launch.parameters, [SETUP_SCRIPT]);
    assert.deepEqual(console.parameters, [SETUP_SCRIPT]);
    assert.deepEqual(ext.game.parameters, [SETUP_SCRIPT]);
    assert.equal(launch.defaultPrimary, true);
  });

  it("useOverrideCfg adds the override.cfg setup flag to the launch and setup arguments", async () => {
    const ext = await loadExtension(DIR, {
      transform: all(stockLoader, setConst("useOverrideCfg", "true")),
      ...fakeDownloader(),
    });
    const [setup, launch] = ext.game.supportedTools;
    assert.deepEqual(launch.parameters, [`${SETUP_SCRIPT} --setup-create-override-cfg`]);
    assert.deepEqual(setup.parameters, [
      `${SETUP_SCRIPT} --only-setup --setup-create-override-cfg`,
    ]);
  });

  it("useOverrideCfg does nothing for the custom loader's launch arguments", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("useOverrideCfg", "true") });
    assert.deepEqual(ext.game.parameters, []);
  });

  it("the stock loader listens for update checks, the custom loader does not", async () => {
    const stock = await loadExtension(DIR, { transform: stockLoader, ...fakeDownloader() });
    assert.deepEqual(
      stock.listeners.map(({ kind, args }) => [kind, args[0]]),
      [["onAsync", "check-mods-version"]],
    );
  });
});

describe("template-godot: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the mods folder for mods and the game folder for the loader", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-mod": sep(gameDir, "mods-unpacked"),
      "XXX-godotmodloader": gameDir,
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

  it("picks the Xbox launcher executable only when its marker file exists", () => {
    assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
    assert.equal(
      ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])),
      "gamelaunchhelper.exe",
    );
  });

  it("an Xbox id outside the discovery ids turns the Xbox logic off", async () => {
    const off = await loadExtension(DIR, { transform: setConst("XBOXAPP_ID", '"other"') });
    assert.equal(off.game.executable(makeGameDir(["gamelaunchhelper.exe"])), "XXX.exe");
    assert.equal(await off.game.requiresLauncher(gameDir, "xbox"), undefined);
  });

  it("an Epic id outside the discovery ids turns the Epic launcher off", async () => {
    const off = await loadExtension(DIR, { transform: setConst("EPICAPP_ID", '"other"') });
    assert.equal(await off.game.requiresLauncher(gameDir, "epic"), undefined);
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
  });
});

describe("template-godot: setup with the custom loader", () => {
  const stateFor = (dir, mods) =>
    makeState({ discovered: { [GAME_ID]: { path: dir } }, ...(mods ? { mods } : {}) });

  it("downloads and enables the loader, then creates the mod folders", async () => {
    const dir = makeGameDir();
    const ext = await loadExtension(DIR, { transform: loaderUrls, state: stateFor(dir) });
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    const options = [];
    const seen = answerDownloads(ext);
    ext.api.events.on("start-download", (_urls, _info, _x, _cb, _y, downloadOptions) =>
      options.push(downloadOptions),
    );
    ext.api.events.on("start-install-download", (_id, installOptions) =>
      options.push(installOptions),
    );
    const dismissed = [];
    ext.api.dismissNotification = (id) => dismissed.push(id);
    await ext.game.setup({ path: dir });

    assert.deepEqual(seen[0], {
      event: "start-download",
      urls: [DOWNLOAD_URL],
      info: { game: GAME_ID, name: "Godot Mod Loader" },
    });
    assert.deepEqual(options, [{ allowInstall: false }, { allowAutoEnable: false }]);
    assert.equal(seen[1].downloadId, "download-1");
    assert.deepEqual(
      ext.dispatched.map(({ type }) => type),
      ["setModsEnabled", "setModType"],
    );
    assert.deepEqual(ext.dispatched[0].payload.slice(1), [
      "profile-1",
      ["mod-1"],
      true,
      { allowAutoDeploy: true, installed: true },
    ]);
    assert.deepEqual(ext.dispatched[1].payload, [GAME_ID, "mod-1", "XXX-godotmodloader"]);
    assert.deepEqual(ext.notifications[0], {
      id: "XXX-godotmodloader-installing",
      message: "Installing Godot Mod Loader",
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });
    assert.deepEqual(dismissed, ["XXX-godotmodloader-installing"]);
    for (const folder of ["mods-unpacked", "mods"]) {
      assert.ok(fs.statSync(path.join(dir, folder)).isDirectory(), folder);
    }
  });

  it("creates only the mods folder when mods are kept in zips", async () => {
    const dir = makeGameDir();
    const ext = await loadExtension(DIR, { transform: withZips, state: stateFor(dir) });
    answerDownloads(ext);
    await ext.game.setup({ path: dir });
    assert.deepEqual(fs.readdirSync(dir), ["mods"]);
  });

  it("skips the download when the loader is already installed", async () => {
    const dir = makeGameDir();
    const mods = { [GAME_ID]: { existing: { type: "XXX-godotmodloader" } } };
    const ext = await loadExtension(DIR, { state: stateFor(dir, mods) });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: dir });
    assert.deepEqual(seen, []);
    assert.deepEqual(ext.dispatched, []);
  });

  it("reports a failed download and opens the loader's manual download page", async () => {
    const opened = stubShell();
    const dir = makeGameDir();
    const ext = await loadExtension(DIR, { transform: loaderUrls, state: stateFor(dir) });
    ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
      callback(new Error("offline")),
    );
    await ext.game.setup({ path: dir });

    assert.equal(ext.errors[0][0], "Failed to download/install Godot Mod Loader");
    assert.deepEqual(opened, [MANUAL_URL]);
    assert.deepEqual(ext.dispatched, []);
  });

  it("setupNotification on shows the special instructions notice, off, the default, does not", async () => {
    const dir = makeGameDir();
    const off = await loadExtension(DIR, { state: stateFor(dir) });
    answerDownloads(off);
    await off.game.setup({ path: dir });
    assert.equal(
      off.notifications.some(({ id }) => id === "XXX-setup-notify"),
      false,
    );

    const on = await loadExtension(DIR, {
      transform: setConst("setupNotification", "true"),
      state: stateFor(dir),
    });
    answerDownloads(on);
    await on.game.setup({ path: dir });
    const notice = on.notifications.find(({ id }) => id === "XXX-setup-notify");
    assert.equal(notice.type, "warning");
    assert.equal(notice.message, "Special Setup Instructions");
    notice.actions[0].action(() => undefined);
    const [, , , buttons] = on.dialogs[0];
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Acknowledge", "Never Show Again"],
    );
    const suppressed = [];
    on.api.suppressNotification = (id) => suppressed.push(id);
    buttons[1].action();
    assert.deepEqual(suppressed, ["XXX-setup-notify"]);
  });
});

describe("template-godot: setup with the stock loader", () => {
  const stateFor = (dir) => makeState({ discovered: { [GAME_ID]: { path: dir } } });

  it("hands the loader requirement to the downloader when the loader is missing", async () => {
    const dir = makeGameDir();
    const fake = fakeDownloader();
    const ext = await loadExtension(DIR, { transform: stockLoader, state: stateFor(dir), ...fake });
    await ext.game.setup({ path: dir });

    assert.deepEqual(fake.calls.slice(0, 1), [
      ["findModByFile", "XXX-godotmodloader", "mod_loader_setup.gd"],
    ]);
    const [, requirements] = fake.calls.find(([name]) => name === "download");
    assert.equal(requirements.length, 1);
    assert.deepEqual(fs.readdirSync(dir), ["mods"]);
  });

  it("does not download when the loader mod is already installed", async () => {
    const dir = makeGameDir();
    const fake = fakeDownloader({ mod: { id: "loader" } });
    const ext = await loadExtension(DIR, { transform: stockLoader, state: stateFor(dir), ...fake });
    await ext.game.setup({ path: dir });
    assert.equal(
      fake.calls.some(([name]) => name === "download"),
      false,
    );
  });

  it("describes the Godot 4 loader release and looks the loader up through the downloader", async () => {
    const fake = fakeDownloader();
    const ext = await loadExtension(DIR, { transform: stockLoader, ...fake });
    await ext.game.setup({ path: makeGameDir() });
    const [, [requirement]] = fake.calls.find(([name]) => name === "download");

    assert.equal(requirement.archiveFileName, "ModLoader-Self-Setup_7.0.1-WIN.zip");
    assert.equal(requirement.modType, "XXX-godotmodloader");
    assert.equal(requirement.assemblyFileName, "mod_loader_setup.gd");
    assert.equal(requirement.userFacingName, "Godot Mod Loader");
    assert.equal(
      requirement.githubUrl,
      "https://api.github.com/repos/GodotModding/godot-mod-loader",
    );
    assert.equal(requirement.pinVersion, undefined);
    assert.equal(requirement.pinTag, undefined);
    assert.equal(
      requirement.fileArchivePattern.exec("ModLoader-Self-Setup_7.0.1-WIN.zip")[1],
      "7.0.1",
    );
    assert.equal(
      requirement.fileArchivePattern.test("godot-mod-loader_v6.3.0_self-setup.zip"),
      false,
    );
    assert.equal(requirement.fileArchivePattern.test("MODLOADER-SELF-SETUP_7.0.1-WIN.ZIP"), true);

    fake.calls.length = 0;
    await requirement.findMod(ext.api);
    requirement.findDownloadId(ext.api);
    await requirement.resolveVersion(ext.api);
    assert.deepEqual(fake.calls, [
      ["findModByFile", "XXX-godotmodloader", "mod_loader_setup.gd"],
      ["findDownloadIdByFile", "ModLoader-Self-Setup_7.0.1-WIN.zip"],
      ["resolveVersionByPattern", requirement],
    ]);
  });

  it("pins the last Godot 3 loader release for a Godot 3 game", async () => {
    const fake = fakeDownloader();
    const ext = await loadExtension(DIR, {
      transform: all(stockLoader, setConst("ENGINE_VERSION", '"3"')),
      ...fake,
    });
    await ext.game.setup({ path: makeGameDir() });
    const [, [requirement]] = fake.calls.find(([name]) => name === "download");

    assert.equal(requirement.archiveFileName, "godot-mod-loader_v6.3.0_self-setup.zip");
    assert.equal(requirement.pinVersion, "6.3.0");
    assert.equal(requirement.pinTag, "v6.3.0");
    const { fileArchivePattern } = requirement;
    assert.equal(fileArchivePattern.exec("godot-mod-loader_v6.3.0_self-setup.zip")[1], "6.3.0");
    assert.equal(fileArchivePattern.exec("godot-mod-loader_6.3.0_self-setup.zip")[1], "6.3.0");
    assert.equal(fileArchivePattern.test("ModLoader-Self-Setup_7.0.1-WIN.zip"), false);
    assert.equal(fileArchivePattern.test("GODOT-MOD-LOADER_V6.3.0_SELF-SETUP.ZIP"), true);
  });

  it("checks the loader's version when Vortex checks for updates, for this game only", async () => {
    const fake = fakeDownloader();
    const ext = await loadExtension(DIR, { transform: stockLoader, ...fake });
    const handler = ext.listeners.find(({ args }) => args[0] === "check-mods-version").args[1];

    await handler("other", {}, false);
    assert.deepEqual(fake.calls, []);

    await handler(GAME_ID, {}, false);
    assert.equal(fake.calls.length, 1);
    assert.equal(fake.calls[0][0], "testRequirementVersion");
    assert.equal(fake.calls[0][1].modType, "XXX-godotmodloader");
  });

  it("keeps going when the version check fails", async () => {
    const fake = fakeDownloader();
    fake.bundled["downloader.js"].testRequirementVersion = async () => {
      throw new Error("rate limited");
    };
    const ext = await loadExtension(DIR, { transform: stockLoader, ...fake });
    const handler = ext.listeners.find(({ args }) => args[0] === "check-mods-version").args[1];
    await assert.doesNotReject(handler(GAME_ID, {}, false));
  });
});

describe("template-godot: toolbar actions", () => {
  async function run(title, { state, transform } = {}) {
    const opened = stubShell();
    const ext = await loadExtension(DIR, { state, transform });
    await ext.registeredActions.find((action) => action.title === title).action();
    return opened;
  }

  it("opens the override.cfg in the discovered game folder", async () => {
    const state = makeState({ discovered: { [GAME_ID]: { path: "game" } } });
    assert.deepEqual(await run("Open override.cfg", { state }), [sep("game", "override.cfg")]);
  });

  it("opens the game's pages, the changelog shipped with the extension and the bug tracker", async () => {
    assert.deepEqual(await run("Open PCGamingWiki Page"), ["XXX"]);
    assert.deepEqual(await run("Open Nexus Mods Page"), ["https://www.nexusmods.com/XXX/mods"]);
    assert.deepEqual(await run("Open SteamDB Page"), ["https://steamdb.info/app/XXX/"]);
    assert.deepEqual(await run("View Changelog"), [path.join(DIR, "CHANGELOG.md")]);
    assert.deepEqual(await run("Submit Bug Report"), ["XXX?tab=bugs"]);
  });

  it("opens the Vortex downloads folder for the game once setup has run", async () => {
    const dir = makeGameDir();
    const opened = stubShell();
    const ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: dir } } }),
    });
    answerDownloads(ext);
    await ext.game.setup({ path: dir });
    ext.registeredActions.find(({ title }) => title === "Open Downloads Folder").action();
    assert.equal(await waitFor(() => opened.length > 0), true);
    assert.deepEqual(opened, [sep(vortex.APP_ROOT, "downloads", GAME_ID)]);
  });

  it("reports a failure instead of throwing when the shell is unavailable", async () => {
    const URL_FAILURE = "Failed to open the URL";
    const FILE_FAILURE = "Failed to open the file or folder";
    const state = makeState({ discovered: { [GAME_ID]: { path: "game" } } });
    const titles = [
      ["Open override.cfg", FILE_FAILURE],
      ["Open PCGamingWiki Page", URL_FAILURE],
      ["Open Nexus Mods Page", URL_FAILURE],
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
