"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, describe, it } = require("node:test");
const { makeState } = require("../harness/fake-context");
const { makeGameDir, tree } = require("../harness/fixtures");
const {
  answerDownloads,
  idsOf,
  installerOf: installer,
  summary,
  supportedBy,
} = require("../harness/helpers");
const { loadExtension, templateDir } = require("../harness/load-extension");
const { STUB_EXE_VERSION } = require("../harness/stub-modules");
const { setConst } = require("../harness/transforms");

const DIR = templateDir("template-basic");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);

describe("template-basic: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the root mod type and installer, plus the fallback last", () => {
    assert.deepEqual(summary(ext.modTypes), [["XXX-root", 25]]);
    assert.deepEqual(summary(ext.installers), [
      ["XXX-root", 27],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the toolbar actions for the game", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Open Config Folder",
        "Open Save Folder",
        "Open PCGamingWiki Page",
        "Open SteamDB Page",
        "View Changelog",
        "Submit Bug Report",
        "Open Downloads Folder",
      ],
    );
  });

  it("offers the custom launch tool", () => {
    assert.deepEqual(idsOf(ext.game.supportedTools), ["XXX-customlaunch"]);
  });
});

describe("template-basic: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const matrix = [
    ["a root folder at the top", tree("XXX/", "XXX/a.dat"), ["XXX-root", "XXX-fallback"]],
    [
      "a root folder nested in a wrapper folder",
      tree("Mod/XXX/a.dat"),
      ["XXX-root", "XXX-fallback"],
    ],
    ["a root folder in a different case", tree("xxx/a.dat"), ["XXX-root", "XXX-fallback"]],
    ["loose files with no known folder", tree("readme.txt"), ["XXX-fallback"]],
    ["a FOMOD package", tree("fomod/ModuleConfig.xml", "XXX/a.dat"), []],
  ];

  for (const [label, files, expected] of matrix) {
    it(`routes ${label}`, async () => {
      assert.deepEqual(await supportedBy(ext, files), expected);
    });
  }

  it("ignores mods for another game", async () => {
    assert.deepEqual(await supportedBy(ext, tree("XXX/a.dat"), "someothergame"), []);
  });
});

describe("template-basic: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("root installer keeps the root folder at the top of the destination", async () => {
    const { instructions } = await installer(ext, "XXX-root").install(
      tree("XXX/a.dat", "XXX/sub/b.dat"),
    );
    assert.deepEqual(instructions, [
      { type: "copy", source: sep("XXX", "a.dat"), destination: sep("XXX", "a.dat") },
      { type: "copy", source: sep("XXX", "sub", "b.dat"), destination: sep("XXX", "sub", "b.dat") },
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer strips the wrapper folder and drops files outside it", async () => {
    const files = tree("Mod/XXX/a.dat", "Mod/readme.txt", "Other/b.txt");
    const { instructions } = await installer(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      { type: "copy", source: sep("Mod", "XXX", "a.dat"), destination: sep("XXX", "a.dat") },
      { type: "copy", source: sep("Mod", "readme.txt"), destination: "readme.txt" },
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("fallback installer copies every file as is, retypes to root, and notifies", async () => {
    const files = tree("readme.txt", "docs/a.txt");
    const { instructions } = await installer(ext, "XXX-fallback").install(
      files,
      "My Mod.installing",
    );
    assert.deepEqual(instructions, [
      { type: "copy", source: "readme.txt", destination: "readme.txt" },
      { type: "copy", source: sep("docs", "a.txt"), destination: sep("docs", "a.txt") },
      { type: "setmodtype", value: "XXX-root" },
    ]);
    const [notification] = ext.notifications;
    assert.equal(notification.id, "XXX-MyMod-fallback");
    assert.match(notification.message, /Fallback installer reached for My Mod/);
  });
});

describe("template-basic: toggles change what is registered", () => {
  const cases = [
    {
      name: "rootInstaller off drops the root installer",
      transform: setConst("rootInstaller", "false"),
      installers: [["XXX-fallback", 49]],
      modTypes: [["XXX-root", 25]],
    },
    {
      name: "fallbackInstaller off drops the fallback",
      transform: setConst("fallbackInstaller", "false"),
      installers: [["XXX-root", 27]],
      modTypes: [["XXX-root", 25]],
    },
    {
      name: "hasLoader adds the loader installer and mod type",
      transform: setConst("hasLoader", "true"),
      installers: [
        ["XXX-loader", 25],
        ["XXX-root", 27],
        ["XXX-fallback", 49],
      ],
      modTypes: [
        ["XXX-root", 25],
        ["XXX-loader", 70],
      ],
    },
    {
      name: "needsModInstaller adds the mod installer and mod type",
      transform: setConst("needsModInstaller", "true"),
      installers: [
        ["XXX-root", 27],
        ["XXX-mod", 29],
        ["XXX-fallback", 49],
      ],
      modTypes: [
        ["XXX-root", 25],
        ["XXX-mod", 26],
      ],
    },
    {
      name: "saveInstaller adds the save installer and mod type",
      transform: setConst("saveInstaller", "true"),
      installers: [
        ["XXX-root", 27],
        ["XXX-save", 35],
        ["XXX-fallback", 49],
      ],
      modTypes: [
        ["XXX-root", 25],
        ["XXX-save", 26],
      ],
    },
    {
      name: "a binaries subfolder adds the binaries installer and mod type",
      transform: setConst("BINARIES_PATH", 'path.join("Bin")'),
      installers: [
        ["XXX-root", 27],
        ["XXX-binaries", 31],
        ["XXX-fallback", 49],
      ],
      modTypes: [
        ["XXX-root", 25],
        ["XXX-binaries", 72],
      ],
    },
  ];

  for (const { name, transform, installers, modTypes } of cases) {
    it(name, async () => {
      const ext = await loadExtension(DIR, { transform });
      assert.deepEqual(summary(ext.installers), installers);
      assert.deepEqual(summary(ext.modTypes), modTypes);
    });
  }

  it("a binaries subfolder is also treated as a root folder and created by setup", async () => {
    const ext = await loadExtension(DIR, {
      transform: setConst("BINARIES_PATH", 'path.join("Bin")'),
    });
    assert.deepEqual(await supportedBy(ext, tree("Bin/a.dat")), ["XXX-root", "XXX-fallback"]);
    assert.deepEqual(await supportedBy(ext, tree("a.dll")), ["XXX-binaries", "XXX-fallback"]);

    const gameDir = makeGameDir();
    await ext.game.setup({ path: gameDir });
    assert.ok(fs.existsSync(path.join(gameDir, "Bin")));
  });
});

describe("template-basic: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the discovered game folder for the root mod type", () => {
    const root = ext.modTypes[0];
    assert.equal(root.getPath({ id: GAME_ID }), gameDir);
    assert.equal(root.isSupported(GAME_ID), true);
    assert.equal(root.isSupported("someothergame"), false);
  });

  it("only offers the root mod type once the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    assert.equal(undiscovered.modTypes[0].isSupported(GAME_ID), false);
  });

  it("picks the Xbox launcher executable only when its marker file exists", () => {
    assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
    assert.equal(
      ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])),
      "gamelaunchhelper.exe",
    );
  });

  it("mods install to the game folder by default", () => {
    assert.equal(ext.game.queryModPath(), ".");
  });

  it("sets the launcher for each store", async () => {
    const { requiresLauncher } = ext.game;
    assert.deepEqual(await requiresLauncher(gameDir, "steam"), { launcher: "steam" });
    assert.deepEqual(await requiresLauncher(gameDir, "xbox"), {
      launcher: "xbox",
      addInfo: { appId: "XXX", parameters: [{ appExecName: "Game" }] },
    });
    assert.deepEqual(await requiresLauncher(gameDir, "epic"), {
      launcher: "epic",
      addInfo: { appId: "XXX" },
    });
    assert.equal(await requiresLauncher(gameDir, "gog"), undefined);
  });

  it("reads the version from the executable", async () => {
    assert.equal(await ext.game.getGameVersion(makeGameDir()), STUB_EXE_VERSION);
  });

  it("reads the version from appxmanifest.xml for the Xbox build", async () => {
    const xboxDir = makeGameDir(["gamelaunchhelper.exe"]);
    fs.writeFileSync(
      path.join(xboxDir, "appxmanifest.xml"),
      '<Package><Identity Name="x" Version="1.2.3.0"/></Package>',
    );
    assert.equal(await ext.game.getGameVersion(xboxDir), "1.2.3.0");
  });

  it("falls back to 0.0.0 when the Xbox manifest is unreadable", async () => {
    const xboxDir = makeGameDir(["gamelaunchhelper.exe"]);
    assert.equal(await ext.game.getGameVersion(xboxDir), "0.0.0");
  });
});

describe("template-basic: loader download", () => {
  const withLoader = setConst("hasLoader", "true");

  it("downloads and installs the loader during setup when it is missing", async () => {
    const ext = await loadExtension(DIR, { transform: withLoader });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });

    assert.deepEqual(seen[0], {
      event: "start-download",
      urls: ["nxm://XXX/mods/0/files/0"],
      info: { game: "XXX", name: "Mod Loader" },
    });
    assert.equal(seen[1].downloadId, "download-1");
    const types = ext.dispatched.map(({ type }) => type);
    assert.deepEqual(types, ["setModsEnabled", "setModType"]);
    assert.deepEqual(ext.dispatched[1].payload, ["XXX", "mod-1", "XXX-loader"]);
  });

  it("skips the download when the loader is already installed", async () => {
    const state = makeState({ mods: { [GAME_ID]: { existing: { type: "XXX-loader" } } } });
    const ext = await loadExtension(DIR, { transform: withLoader, state });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });

    assert.deepEqual(seen, []);
    assert.deepEqual(ext.dispatched, []);
  });
});

describe("template-basic: toolbar actions", () => {
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
    return ext;
  }

  it("opens the SteamDB page for the game", async () => {
    await run("Open SteamDB Page");
    assert.deepEqual(opened, ["https://steamdb.info/app/XXX/"]);
  });

  it("opens the changelog shipped with the extension", async () => {
    await run("View Changelog");
    assert.deepEqual(opened, [path.join(DIR, "CHANGELOG.md")]);
  });

  it("opens the extension bug tracker", async () => {
    await run("Submit Bug Report");
    assert.deepEqual(opened, ["XXX?tab=bugs"]);
  });

  it("reports a failure instead of throwing when the shell is unavailable", async () => {
    const ext = await loadExtension(DIR);
    ext.registeredActions.find((action) => action.title === "Open Downloads Folder").action();
    assert.equal(ext.errors.length, 1);
    assert.equal(ext.errors[0][0], "Failed to open the file or folder");
  });
});
