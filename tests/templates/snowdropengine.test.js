"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, describe, it } = require("node:test");
const { makeState } = require("../harness/fake-context");
const { makeGameDir, tree } = require("../harness/fixtures");
const { answerDownloads, installerOf, summary, supportedBy } = require("../harness/helpers");
const { loadExtension, templateDir, vortex } = require("../harness/load-extension");
const { setConst } = require("../harness/transforms");

const DIR = templateDir("template-snowdropengine");
const GAME_ID = "XXX";

// The scaffold's DATA_FILE placeholder is upper case and is compared against a lower-cased
// name, so it never matches until a game fills it in. Tests use a realistic lower-case value.
const withDataFolder = setConst("DATA_FILE", '"data"');

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });

// The mod loader installer also emits an entry for every folder (the other installers drop
// them), so install-output tests compare only the file copies and the mod type.
const withoutFolderCopies = (instructions) =>
  instructions.filter(({ type, source }) => type !== "copy" || !source.endsWith(path.sep));

describe("template-snowdropengine: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the four mod types, config first and the mod loader last", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-config", 25],
      ["XXX-data", 26],
      ["XXX-datasub", 27],
      ["XXX-modloader", 78],
    ]);
  });

  it("registers the loader, data, subfolder and config installers, then the fallback", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-modloader", 25],
      ["XXX-data", 27],
      ["XXX-datasub", 29],
      ["XXX-config", 31],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the six toolbar actions", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Open Config Folder",
        "Open PCGamingWiki Page",
        "Open SteamDB Page",
        "View Changelog",
        "Open Downloads Folder",
        "Submit Bug Report",
      ],
    );
  });
});

describe("template-snowdropengine: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, { transform: withDataFolder });
  });

  const matrix = [
    ["the version.dll mod loader", tree("version.dll"), ["XXX-modloader", "XXX-fallback"]],
    [
      "a mod loader nested in a wrapper folder, in any case",
      tree("Mod/Version.DLL"),
      ["XXX-modloader", "XXX-fallback"],
    ],
    ["a data folder", tree("data/a.bin"), ["XXX-data", "XXX-fallback"]],
    ["a data subfolder", tree("baked/a.bin"), ["XXX-datasub", "XXX-fallback"]],
    [
      "a data folder holding a data subfolder (the data installer wins on priority)",
      tree("data/baked/a.bin"),
      ["XXX-data", "XXX-datasub", "XXX-fallback"],
    ],
    ["a config file", tree("Graphic Settings.cfg"), ["XXX-config", "XXX-fallback"]],
    ["loose files with no known marker", tree("readme.txt"), ["XXX-fallback"]],
    [
      "a FOMOD package of data and config files",
      tree("fomod/ModuleConfig.xml", "data/a.bin", "a.cfg"),
      [],
    ],
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
});

describe("template-snowdropengine: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, { transform: withDataFolder });
  });

  it("mod loader installer strips the wrapper folder and sets the loader mod type", async () => {
    const files = tree("Mod/version.dll", "Mod/loader.ini", "Other/x.txt");
    const { instructions } = await installerOf(ext, "XXX-modloader").install(files);
    assert.deepEqual(withoutFolderCopies(instructions), [
      copy(sep("Mod", "version.dll"), "version.dll"),
      copy(sep("Mod", "loader.ini"), "loader.ini"),
      { type: "setmodtype", value: "XXX-modloader" },
    ]);
  });

  it("data installer keeps the data folder and drops the wrapper and folder entries", async () => {
    const files = tree("Pack/data/baked/a.bin", "Pack/data/b.bin", "Pack/readme.txt");
    const { instructions } = await installerOf(ext, "XXX-data").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "data", "baked", "a.bin"), sep("data", "baked", "a.bin")),
      copy(sep("Pack", "data", "b.bin"), sep("data", "b.bin")),
      copy(sep("Pack", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-data" },
    ]);
  });

  it("data subfolder installer keeps each subfolder at the top of the destination", async () => {
    const files = tree("Pack/baked/a.bin", "Pack/graph objects/b.bin");
    const { instructions } = await installerOf(ext, "XXX-datasub").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "baked", "a.bin"), sep("baked", "a.bin")),
      copy(sep("Pack", "graph objects", "b.bin"), sep("graph objects", "b.bin")),
      { type: "setmodtype", value: "XXX-datasub" },
    ]);
  });

  it("config installer flattens the config folder and ignores files outside it", async () => {
    const files = tree("Settings/Graphic Settings.cfg", "Settings/extra.txt", "Other/y.txt");
    const { instructions } = await installerOf(ext, "XXX-config").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Settings", "Graphic Settings.cfg"), "Graphic Settings.cfg"),
      copy(sep("Settings", "extra.txt"), "extra.txt"),
      { type: "setmodtype", value: "XXX-config" },
    ]);
  });

  it("fallback installer copies every file as is and notifies", async () => {
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
    assert.match(notification.message, /Fallback installer reached for My Mod/);
  });
});

describe("template-snowdropengine: toggles change what is registered", () => {
  it("fallbackInstaller off drops the fallback", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("fallbackInstaller", "false") });
    assert.deepEqual(summary(ext.installers).at(-1), ["XXX-config", 31]);
    assert.equal(ext.installers.length, 4);
  });

  it("allowSymlinks off is passed on to the game details", async () => {
    const on = await loadExtension(DIR);
    const off = await loadExtension(DIR, { transform: setConst("allowSymlinks", "false") });
    assert.equal(on.game.details.supportsSymlinks, true);
    assert.equal(off.game.details.supportsSymlinks, false);
  });

  it("setupNotification on shows the special instructions notice during setup", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("setupNotification", "true") });
    answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    const notice = ext.notifications.find(({ id }) => id === "XXX-setup-notify");
    assert.equal(notice.type, "warning");
  });
});

describe("template-snowdropengine: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the Documents config folder, the game folder and the data subfolder", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-config": path.join(vortex.APP_ROOT, "documents", "My Games", "XXX"),
      "XXX-data": gameDir,
      "XXX-datasub": path.join(gameDir, "XXX"),
      "XXX-modloader": gameDir,
    });
  });

  it("only offers the mod types once the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    for (const type of undiscovered.modTypes) assert.equal(type.isSupported(GAME_ID), false);
    for (const type of ext.modTypes) assert.equal(type.isSupported(GAME_ID), true);
  });

  it("always launches the base executable, whatever store files exist", () => {
    assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
    assert.equal(ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])), "XXX.exe");
  });

  it("offers a Ubisoft Plus launch tool that needs its own executable", () => {
    const [tool] = ext.game.supportedTools;
    assert.equal(tool.id, "LaunchUbisoftPlus");
    assert.equal(tool.executable(), "XXX_Plus.exe");
    assert.deepEqual(tool.requiredFiles, ["XXX_Plus.exe"]);
  });

  it("mods install to the game folder", () => {
    assert.equal(ext.game.queryModPath(), ".");
  });

  it("only the Steam build needs a launcher", async () => {
    const { requiresLauncher } = ext.game;
    assert.deepEqual(await requiresLauncher(gameDir, "steam"), { launcher: "steam" });
    for (const store of ["epic", "gog", "xbox"]) {
      assert.equal(await requiresLauncher(gameDir, store), undefined);
    }
  });

  it("finds the game through the store helper when the Ubisoft registry key is absent", async () => {
    const asked = [];
    vortex.gameStore.findByAppId = (ids) => {
      asked.push(ids);
      return Promise.resolve({ gamePath: gameDir });
    };
    assert.equal(await ext.game.queryPath(), gameDir);
    assert.deepEqual(asked, [["XXX", "XXX"]]);
  });
});

describe("template-snowdropengine: setup and mod loader download", () => {
  it("downloads and enables the mod loader, then creates the config and data folders", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    assert.deepEqual(seen[0], {
      event: "start-download",
      urls: ["nxm://XXX/mods/24/files/294"],
      info: { game: "XXX", name: "Snowdrop ModLoader" },
    });
    assert.equal(seen[1].downloadId, "download-1");
    assert.deepEqual(
      ext.dispatched.map(({ type }) => type),
      ["setModsEnabled", "setModType"],
    );
    assert.deepEqual(ext.dispatched[1].payload, ["XXX", "mod-1", "XXX-modloader"]);
    assert.ok(fs.existsSync(path.join(vortex.APP_ROOT, "documents", "My Games", "XXX")));
    assert.ok(fs.existsSync(path.join(gameDir, "XXX")));
  });

  it("skips the download when the mod loader is already installed", async () => {
    const state = makeState({ mods: { [GAME_ID]: { existing: { type: "XXX-modloader" } } } });
    const ext = await loadExtension(DIR, { state });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });

    assert.deepEqual(seen, []);
    assert.deepEqual(ext.dispatched, []);
  });
});

describe("template-snowdropengine: toolbar actions", () => {
  let opened;
  afterEach(() => {
    delete globalThis.window;
  });

  async function run(title) {
    opened = [];
    globalThis.window = {
      api: { shell: { openUrl: (url) => opened.push(url), openFile: (file) => opened.push(file) } },
    };
    const ext = await loadExtension(DIR);
    ext.registeredActions.find((action) => action.title === title).action();
  }

  it("opens the Documents config folder", async () => {
    await run("Open Config Folder");
    assert.deepEqual(opened, [path.join(vortex.APP_ROOT, "documents", "My Games", "XXX")]);
  });

  it("opens the SteamDB page for the game", async () => {
    await run("Open SteamDB Page");
    assert.deepEqual(opened, ["https://steamdb.info/app/XXX/"]);
  });

  it("opens the extension bug tracker", async () => {
    await run("Submit Bug Report");
    assert.deepEqual(opened, ["XXX?tab=bugs"]);
  });
});
