"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, describe, it } = require("node:test");
const { checks } = require("../contract-checks");
const { makeState } = require("../harness/fake-context");
const { makeGameDir, makeTempDir, tree } = require("../harness/fixtures");
const {
  answerDownloads,
  installerOf,
  stubShell,
  summary,
  supportedBy,
  waitFor,
  withWinapi,
} = require("../harness/helpers");
const { loadExtension, templateDir, vortex } = require("../harness/load-extension");
const { STUB_EXE_VERSION } = require("../harness/stub-modules");
const { all, setConst } = require("../harness/transforms");

const DIR = templateDir("template-reframework-fluffy");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });

const FLUFFY_PAGE = "nxm://site/mods/818/files/9440";
const REF_NIGHTLY =
  "https://github.com/praydog/REFramework-nightly/releases/latest/download/REFramework.zip";
const REF_RELEASES = "https://github.com/praydog/REFramework-nightly/releases";

// The scaffold's demo executable is the same file as the game executable, which makes every
// install look like the demo. Tests that care about the demo use a distinct, realistic name.
const withDemo = setConst("EXEC_DEMO", '"XXX_Demo.exe"');
const withDemoIds = all(withDemo, setConst("STEAMAPP_ID_DEMO", '"DEMO"'));
// No Xbox build and no demo: the single-executable case.
const singleExe = all(
  setConst("hasXbox", "false"),
  setConst("XBOXAPP_ID", '"other"'),
  setConst("EXEC_DEMO", '""'),
);

afterEach(() => {
  delete globalThis.window;
});

const actionOf = (ext, title) => ext.registeredActions.find((action) => action.title === title);

// Like answerDownloads, but keeps every argument Vortex would receive, and can answer late so a
// test sees whether setup really waits for the download.
function answerRaw(ext, delay = 0) {
  const seen = [];
  const reply = (callback, value) =>
    delay ? setTimeout(() => callback(null, value), delay) : callback(null, value);
  ext.api.events.on("start-download", (urls, info, third, callback, sixth, options) => {
    seen.push({ event: "start-download", urls, info, third, sixth, options });
    reply(callback, "download-1");
  });
  ext.api.events.on("start-install-download", (id, options, callback) => {
    seen.push({ event: "start-install-download", id, options });
    reply(callback, "mod-1");
  });
  return seen;
}

// A shell whose every call throws, for the "failed to open" branches.
function brokenShell() {
  const fail = () => {
    throw new Error("no shell");
  };
  globalThis.window = { api: { shell: { openUrl: fail, openFile: fail } } };
}

describe("template-reframework-fluffy: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the spec mod types, then the Fluffy mod and preset types", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-root", 35],
      ["XXX-looselua", 36],
      ["XXX-fluffymanager", 77],
      ["XXX-reframework", 78],
      ["XXX-fluffymod", 25],
      ["XXX-preset", 40],
    ]);
  });

  it("registers the five detected installers, then the re-zip catch-all, and no fallback", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-fluffymanager", 25],
      ["XXX-reframework", 27],
      ["XXX-looselua", 29],
      ["XXX-root", 31],
      ["XXX-preset", 33],
      ["XXX-fluffymodzip", 49],
    ]);
    assert.equal(
      ext.installers.some(({ id }) => id.endsWith("-fallback")),
      false,
    );
  });

  it("registers the nine toolbar actions", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Download Latest REFramework Nightly",
        "Open Config File",
        "Open Save Folder (Steam)",
        "Open PCGamingWiki Page",
        "Open Nexus Mods Page",
        "Open SteamDB Page",
        "View Changelog",
        "Submit Bug Report",
        "Open Downloads Folder",
      ],
    );
  });

  it("names every mod type, and merges only the Fluffy mod type", () => {
    assert.deepEqual(
      ext.modTypes.map(({ id, options }) => [id, options]),
      [
        ["XXX-root", { name: "Binaries / Root Folder" }],
        ["XXX-looselua", { name: "Loose Lua/Plugin (REFramework)" }],
        ["XXX-fluffymanager", { name: "Fluffy Mod Manager" }],
        ["XXX-reframework", { name: "REFramework" }],
        ["XXX-fluffymod", { name: "Fluffy Mod", mergeMods: true }],
        ["XXX-preset", { name: "Fluffy Preset" }],
      ],
    );
  });

  it("listens for deployments once Vortex has started", () => {
    assert.deepEqual(
      ext.listeners.map(({ kind, args }) => [kind, args[0]]),
      [["onAsync", "did-deploy"]],
    );
  });

  it("main reports success", () => {
    assert.equal(ext.mainResult, true);
  });

  it("puts every toolbar action in the mod icons group, at priority 300", () => {
    for (const { group, priority, icon, options, title } of ext.registeredActions) {
      assert.deepEqual([group, priority, icon, options], ["mod-icons", 300, "open-ext", {}], title);
    }
  });

  it("no mod type detects mods by file content", async () => {
    for (const { id, test } of ext.modTypes) assert.equal(await test(), false, id);
  });

  it("describes the game for Vortex", () => {
    const { game } = ext;
    assert.deepEqual(
      [game.id, game.name, game.shortName, game.logo],
      ["XXX", "XXX", "XXX", "XXX.jpg"],
    );
    assert.equal(game.mergeMods, true);
    assert.equal(game.requiresCleanup, true);
    assert.deepEqual(game.compatible, { dinput: false, enb: false });
    assert.equal(game.details.supportsSymlinks, true);
    assert.deepEqual(game.details.ignoreDeploy, game.details.ignoreConflicts);
    assert.deepEqual(game.details.ignoreDeploy, [
      sep("**", "changelog*"),
      sep("**", "readme*"),
      sep("**", "license*"),
    ]);
    assert.deepEqual(game.environment, { SteamAPPId: "XXX" });
  });

  it("offers Fluffy and the two launch buttons as tools", () => {
    const [fluffy, launch, demo] = ext.game.supportedTools;
    assert.equal(ext.game.supportedTools.length, 3);
    assert.deepEqual(
      [fluffy.id, fluffy.name, fluffy.logo, fluffy.executable(), fluffy.requiredFiles],
      [
        "XXX-fluffymanager",
        "Fluffy Mod Manager",
        "fluffy.png",
        "modmanager.exe",
        ["modmanager.exe"],
      ],
    );
    assert.deepEqual([fluffy.detach, fluffy.relative, fluffy.exclusive], [true, true, false]);
    assert.deepEqual(
      [launch.id, launch.name, launch.logo, launch.executable(), launch.requiredFiles],
      ["XXX-customlaunch", "Custom Launch", "exec.png", "XXX.exe", ["XXX.exe"]],
    );
    assert.deepEqual(
      [launch.detach, launch.relative, launch.exclusive, launch.shell],
      [true, true, true, true],
    );
    assert.deepEqual(
      [demo.id, demo.name, demo.logo, demo.executable(), demo.requiredFiles],
      ["XXX-customlaunchdemo", "Custom Launch (Demo)", "exec_demo.png", "XXX.exe", ["XXX.exe"]],
    );
    assert.deepEqual(
      [demo.detach, demo.relative, demo.exclusive, demo.shell],
      [true, true, true, true],
    );
  });
});

describe("template-reframework-fluffy: toggles change what is registered", () => {
  it("reZip off swaps the re-zip installer for the plain Fluffy mod installer", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("reZip", "false") });
    assert.deepEqual(summary(ext.installers), [
      ["XXX-fluffymanager", 25],
      ["XXX-reframework", 27],
      ["XXX-looselua", 29],
      ["XXX-root", 31],
      ["XXX-preset", 33],
      ["XXX-fluffymod", 48],
    ]);
    const fluffyMod = ext.modTypes.find(({ id }) => id === "XXX-fluffymod");
    assert.deepEqual(fluffyMod.options, { name: "Fluffy Mod", mergeMods: false });
  });

  it("with the other toggle values, the contract checks still pass", async () => {
    const others = all(
      setConst("reZip", "false"),
      setConst("useRefNightly", "true"),
      setConst("allowSymlinks", "false"),
      setConst("setupNotification", "true"),
      singleExe,
    );
    for (const transform of [others, withDemo]) {
      const ext = await loadExtension(DIR, { transform });
      for (const [name, check] of Object.entries(checks)) {
        assert.deepEqual(await check(ext), [], name);
      }
    }
  });

  it("allowSymlinks off turns symlink deployment off", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("allowSymlinks", "false") });
    assert.equal(ext.game.details.supportsSymlinks, false);
  });

  it("an Xbox id outside the discovery ids turns the Xbox logic off", async () => {
    const ext = await loadExtension(DIR, {
      transform: all(setConst("hasXbox", "false"), setConst("XBOXAPP_ID", '"other"')),
    });
    assert.equal(ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])), "XXX.exe");
    assert.equal(await ext.game.requiresLauncher(makeGameDir(), "xbox"), undefined);
  });

  it("the Xbox logic stays on by default even when the Xbox id is not a discovery id", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("XBOXAPP_ID", '"other"') });
    assert.equal(
      ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])),
      "gamelaunchhelper.exe",
    );
  });

  it("with the Xbox logic off, a game with a demo still launches the demo executable", async () => {
    const ext = await loadExtension(DIR, {
      transform: all(setConst("hasXbox", "false"), setConst("XBOXAPP_ID", '"other"'), withDemo),
    });
    assert.equal(ext.game.executable(makeGameDir(["XXX_Demo.exe"])), "XXX_Demo.exe");
    assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
    assert.equal(ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])), "XXX.exe");
  });

  it("a game with one executable requires that executable, and one with several requires the archive", async () => {
    const single = await loadExtension(DIR, { transform: singleExe });
    assert.deepEqual(single.game.requiredFiles, ["XXX.exe"]);
    const multi = await loadExtension(DIR);
    assert.deepEqual(multi.game.requiredFiles, ["re_chunk_000.pak"]);
    const demo = await loadExtension(DIR, { transform: all(singleExe, withDemo) });
    assert.deepEqual(demo.game.requiredFiles, ["re_chunk_000.pak"]);
  });

  it("setupNotification is off by default and shows the Fluffy instructions when toggled", async () => {
    const off = await loadExtension(DIR);
    answerDownloads(off);
    await off.game.setup({ path: makeGameDir() });
    assert.equal(
      off.notifications.some(({ id }) => id === "XXX-setup-notification"),
      false,
    );

    const on = await loadExtension(DIR, { transform: setConst("setupNotification", "true") });
    answerDownloads(on);
    await on.game.setup({ path: makeGameDir() });
    const notice = on.notifications.find(({ id }) => id === "XXX-setup-notification");
    assert.equal(notice.type, "warning");
    assert.equal(notice.message, "Fluffy Mod Manager Instructions");
    assert.equal(notice.allowSuppress, true);
    assert.deepEqual(
      notice.actions.map(({ title }) => title),
      ["More"],
    );
  });

  it("the setup notice explains the dialog and can be suppressed for good", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("setupNotification", "true") });
    answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    const suppressed = [];
    ext.api.suppressNotification = (id) => suppressed.push(id);
    let dismissed = 0;
    const notice = ext.notifications.find(({ id }) => id === "XXX-setup-notification");
    notice.actions[0].action(() => dismissed++);

    const [type, title, content, buttons] = ext.dialogs[0];
    assert.equal(type, "question");
    assert.equal(title, "Fluffy Mod Manager Instructions");
    assert.equal(
      content.text,
      "You must use Fluffy Mod Manager to enable mods after installing with Vortex.\n" +
        'Use the included tool to launch Fluffy Mod Manager (at top of window or in "Dashboard" tab).\n' +
        'If your mod is not for Fluffy Mod Manager, you must extract the zip file in the staging folder and change the mod type to "Binaries / Root Folder".\n',
    );
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Acknowledge", "Never Show Again"],
    );
    buttons[0].action();
    assert.deepEqual([dismissed, suppressed], [1, []]);
    buttons[1].action();
    assert.deepEqual([dismissed, suppressed], [2, ["XXX-setup-notification"]]);
  });
});

describe("template-reframework-fluffy: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const ZIP = "XXX-fluffymodzip";
  const matrix = [
    [
      "the Fluffy manager (an exe also looks like a root mod)",
      tree("Fluffy/modmanager.exe", "Fluffy/Games/a.txt"),
      ["XXX-fluffymanager", "XXX-root"],
    ],
    [
      "the Fluffy manager whatever the case",
      tree("Fluffy/ModManager.EXE"),
      ["XXX-fluffymanager", "XXX-root"],
    ],
    ["REFramework", tree("dinput8.dll", "reframework/plugins/x.dll"), ["XXX-reframework"]],
    ["REFramework whatever the case", tree("Wrap/DINPUT8.DLL"), ["XXX-reframework"]],
    [
      "REFramework and Fluffy together",
      tree("dinput8.dll", "modmanager.exe"),
      ["XXX-fluffymanager", "XXX-reframework", "XXX-root"],
    ],
    ["a loose lua script", tree("Cool/script.lua"), ["XXX-looselua", ZIP]],
    ["a lua script whatever the case", tree("Cool/SCRIPT.LUA"), ["XXX-looselua", ZIP]],
    [
      "a lua mod that already has the reframework folder",
      tree("reframework/autorun/script.lua"),
      [ZIP],
    ],
    ["a lua mod inside an autorun folder", tree("autorun/script.lua"), [ZIP]],
    ["a lua mod in a reframework folder alone", tree("reframework/script.lua"), [ZIP]],
    ["a lua mod whose reframework folder is upper case", tree("REFramework/Autorun/a.lua"), [ZIP]],
    ["an engine dll", tree("Mod/nvngx_dlss.dll"), ["XXX-root", ZIP]],
    ["an exe", tree("Mod/Tool.exe"), ["XXX-root", ZIP]],
    ["an exe whatever the case", tree("Mod/TOOL.EXE"), ["XXX-root", ZIP]],
    ["a Fluffy preset", tree("Presets/look.prt"), ["XXX-preset", ZIP]],
    ["a Fluffy preset whatever the case", tree("Presets/LOOK.PRT"), ["XXX-preset", ZIP]],
    ["a Fluffy mod", tree("Mod/modinfo.ini", "Mod/natives/x/y.pak"), [ZIP]],
    ["a Fluffy mod that ships an exe", tree("Mod/modinfo.ini", "Mod/Tool.exe"), [ZIP]],
    [
      "a Fluffy mod whose modinfo.ini is upper case",
      tree("Mod/MODINFO.INI", "Mod/Tool.exe"),
      [ZIP],
    ],
    ["a Fluffy preset beside modinfo.ini", tree("Mod/modinfo.ini", "Mod/look.prt"), [ZIP]],
    [
      "a Fluffy preset beside an upper-case modinfo.ini",
      tree("Mod/MODINFO.INI", "Mod/look.prt"),
      [ZIP],
    ],
    ["a mod that is already a zip", tree("Mod.zip"), [ZIP]],
    ["loose files with no known marker", tree("readme.txt"), [ZIP]],
    ["an empty archive", [], [ZIP]],
    ["a FOMOD package", tree("fomod/ModuleConfig.xml", "dinput8.dll"), []],
    ["a FOMOD package holding a lua script", tree("fomod/ModuleConfig.xml", "a.lua"), []],
    ["a FOMOD package holding Fluffy", tree("fomod/ModuleConfig.xml", "modmanager.exe"), []],
    ["a FOMOD package holding a preset", tree("fomod/ModuleConfig.xml", "a.prt"), []],
    ["a FOMOD package holding a root file", tree("fomod/ModuleConfig.xml", "libxess.dll"), []],
    ["a FOMOD package holding anything else", tree("fomod/ModuleConfig.xml", "a.pak"), []],
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

  it("a FOMOD package is recognised by its ModuleConfig.xml inside a fomod folder, whatever the case", async () => {
    const markers = ["modmanager.exe", "dinput8.dll", "a.lua", "libxess.dll", "a.prt", "a.pak"];
    const unzipped = await loadExtension(DIR, { transform: setConst("reZip", "false") });
    for (const loaded of [ext, unzipped]) {
      for (const marker of markers) {
        const plain = await supportedBy(loaded, tree(marker));
        assert.notDeepEqual(plain, [], marker);
        const fomod = await supportedBy(loaded, tree(marker, "FOMOD/MODULECONFIG.XML"));
        assert.deepEqual(fomod, [], marker);
        // A ModuleConfig.xml outside a fomod folder, or other files inside one, is not a FOMOD.
        const stray = await supportedBy(loaded, tree(marker, "docs/ModuleConfig.xml"));
        assert.deepEqual(stray, plain, marker);
        const other = await supportedBy(loaded, tree(marker, "fomod/info.xml"));
        assert.deepEqual(other, plain, marker);
      }
    }
  });

  it("each root file name is recognised, and nothing else of that kind", async () => {
    for (const name of [
      "nvngx_dlss.dll",
      "dstoragecore.dll",
      "dstorage.dll",
      "amd_fidelityfx_dx12.dll",
      "amd_ags_x64.dll",
      "libxess.dll",
    ]) {
      assert.deepEqual(await supportedBy(ext, tree(`Mod/${name}`)), ["XXX-root", ZIP], name);
      assert.deepEqual(
        await supportedBy(ext, tree(`Mod/${name.toUpperCase()}`)),
        ["XXX-root", ZIP],
        name,
      );
    }
    assert.deepEqual(await supportedBy(ext, tree("Mod/other.dll")), [ZIP]);
  });

  it("with reZip off, the plain Fluffy mod installer takes everything the others leave", async () => {
    const plain = await loadExtension(DIR, { transform: setConst("reZip", "false") });
    assert.deepEqual(await supportedBy(plain, tree("Mod/modinfo.ini")), ["XXX-fluffymod"]);
    assert.deepEqual(await supportedBy(plain, tree("Mod/script.lua")), [
      "XXX-looselua",
      "XXX-fluffymod",
    ]);
    assert.deepEqual(await supportedBy(plain, tree("dinput8.dll")), [
      "XXX-reframework",
      "XXX-fluffymod",
    ]);
    assert.deepEqual(await supportedBy(plain, tree("fomod/ModuleConfig.xml", "a.pak")), []);
    assert.deepEqual(await supportedBy(plain, tree("Mod/modinfo.ini"), "someothergame"), []);
  });
});

describe("template-reframework-fluffy: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("Fluffy installer keeps the manager's folder and drops everything outside it", async () => {
    const files = tree("Fluffy/modmanager.exe", "Fluffy/Games/a.txt", "Other/b.txt");
    const { instructions } = await installerOf(ext, "XXX-fluffymanager").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Fluffy", "modmanager.exe"), "modmanager.exe"),
      copy(sep("Fluffy", "Games", "a.txt"), sep("Games", "a.txt")),
      { type: "setmodtype", value: "XXX-fluffymanager" },
    ]);
  });

  it("Fluffy installer accepts files with no wrapper folder", async () => {
    const files = tree("ModManager.exe", "Games/a.txt");
    const { instructions } = await installerOf(ext, "XXX-fluffymanager").install(files);
    assert.deepEqual(instructions, [
      copy("ModManager.exe", "ModManager.exe"),
      copy(sep("Games", "a.txt"), sep("Games", "a.txt")),
      { type: "setmodtype", value: "XXX-fluffymanager" },
    ]);
  });

  it("REFramework installer places dinput8.dll and its folders at the game root", async () => {
    const files = tree("REF/dinput8.dll", "REF/reframework/plugins/x.dll", "Other/b.txt");
    const { instructions } = await installerOf(ext, "XXX-reframework").install(files);
    assert.deepEqual(instructions, [
      copy(sep("REF", "dinput8.dll"), "dinput8.dll"),
      copy(sep("REF", "reframework", "plugins", "x.dll"), sep("reframework", "plugins", "x.dll")),
      { type: "setmodtype", value: "XXX-reframework" },
    ]);
  });

  it("REFramework installer accepts files with no wrapper folder", async () => {
    const files = tree("dinput8.dll", "reframework/plugins/x.dll");
    const { instructions } = await installerOf(ext, "XXX-reframework").install(files);
    assert.deepEqual(instructions, [
      copy("dinput8.dll", "dinput8.dll"),
      copy(sep("reframework", "plugins", "x.dll"), sep("reframework", "plugins", "x.dll")),
      { type: "setmodtype", value: "XXX-reframework" },
    ]);
  });

  it("REFramework installer finds an upper-case dinput8.dll", async () => {
    const files = tree("REF/DINPUT8.DLL", "REF/x.cfg");
    const { instructions } = await installerOf(ext, "XXX-reframework").install(files);
    assert.deepEqual(instructions, [
      copy(sep("REF", "DINPUT8.DLL"), "DINPUT8.DLL"),
      copy(sep("REF", "x.cfg"), "x.cfg"),
      { type: "setmodtype", value: "XXX-reframework" },
    ]);
  });

  it("loose lua installer puts the script folder under reframework/autorun", async () => {
    const files = tree("Cool/script.lua", "Cool/data/x.txt", "Other/b.txt");
    const { instructions } = await installerOf(ext, "XXX-looselua").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Cool", "script.lua"), sep("reframework", "autorun", "script.lua")),
      copy(sep("Cool", "data", "x.txt"), sep("reframework", "autorun", "data", "x.txt")),
      { type: "setmodtype", value: "XXX-looselua" },
    ]);
  });

  it("loose lua installer accepts a script at the top and takes every file with it", async () => {
    const files = tree("script.LUA", "data/x.txt");
    const { instructions } = await installerOf(ext, "XXX-looselua").install(files);
    assert.deepEqual(instructions, [
      copy("script.LUA", sep("reframework", "autorun", "script.LUA")),
      copy(sep("data", "x.txt"), sep("reframework", "autorun", "data", "x.txt")),
      { type: "setmodtype", value: "XXX-looselua" },
    ]);
  });

  it("loose lua installer only takes the folder holding the first script", async () => {
    const files = tree("A/one.lua", "B/two.lua");
    const { instructions } = await installerOf(ext, "XXX-looselua").install(files);
    assert.deepEqual(instructions, [
      copy(sep("A", "one.lua"), sep("reframework", "autorun", "one.lua")),
      { type: "setmodtype", value: "XXX-looselua" },
    ]);
  });

  it("root installer flattens to the engine dll's folder", async () => {
    const files = tree("Wrap/nvngx_dlss.dll", "Wrap/extra.cfg", "Other/b.txt");
    const { instructions } = await installerOf(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "nvngx_dlss.dll"), "nvngx_dlss.dll"),
      copy(sep("Wrap", "extra.cfg"), "extra.cfg"),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer flattens to an executable's folder when no engine dll is there", async () => {
    const files = tree("Wrap/Tool.exe", "Wrap/sub/data.bin");
    const { instructions } = await installerOf(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "Tool.exe"), "Tool.exe"),
      copy(sep("Wrap", "sub", "data.bin"), sep("sub", "data.bin")),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer finds upper-case engine dlls and executables", async () => {
    const dll = await installerOf(ext, "XXX-root").install(tree("Wrap/LIBXESS.DLL", "Wrap/x.cfg"));
    assert.deepEqual(dll.instructions, [
      copy(sep("Wrap", "LIBXESS.DLL"), "LIBXESS.DLL"),
      copy(sep("Wrap", "x.cfg"), "x.cfg"),
      { type: "setmodtype", value: "XXX-root" },
    ]);
    const exe = await installerOf(ext, "XXX-root").install(tree("Wrap/TOOL.EXE", "Wrap/x.cfg"));
    assert.deepEqual(exe.instructions, [
      copy(sep("Wrap", "TOOL.EXE"), "TOOL.EXE"),
      copy(sep("Wrap", "x.cfg"), "x.cfg"),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer accepts files with no wrapper folder", async () => {
    const { instructions } = await installerOf(ext, "XXX-root").install(
      tree("nvngx_dlss.dll", "sub/x.cfg"),
    );
    assert.deepEqual(instructions, [
      copy("nvngx_dlss.dll", "nvngx_dlss.dll"),
      copy(sep("sub", "x.cfg"), sep("sub", "x.cfg")),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer prefers the engine dll's folder over an executable's", async () => {
    const files = tree("A/Tool.exe", "B/libxess.dll", "B/x.cfg");
    const { instructions } = await installerOf(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("B", "libxess.dll"), "libxess.dll"),
      copy(sep("B", "x.cfg"), "x.cfg"),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("preset installer takes the preset's folder to the top", async () => {
    const files = tree("Presets/look.PRT", "Presets/look.png", "Other/b.txt");
    const { instructions } = await installerOf(ext, "XXX-preset").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Presets", "look.PRT"), "look.PRT"),
      copy(sep("Presets", "look.png"), "look.png"),
      { type: "setmodtype", value: "XXX-preset" },
    ]);
  });

  it("preset installer accepts files with no wrapper folder", async () => {
    const { instructions } = await installerOf(ext, "XXX-preset").install(
      tree("look.prt", "extra/look.png"),
    );
    assert.deepEqual(instructions, [
      copy("look.prt", "look.prt"),
      copy(sep("extra", "look.png"), sep("extra", "look.png")),
      { type: "setmodtype", value: "XXX-preset" },
    ]);
  });

  it("plain Fluffy mod installer (reZip off) copies every file as is", async () => {
    const plain = await loadExtension(DIR, { transform: setConst("reZip", "false") });
    const files = tree("Mod/modinfo.ini", "Mod/natives/x.pak");
    const { instructions } = await installerOf(plain, "XXX-fluffymod").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Mod", "modinfo.ini"), sep("Mod", "modinfo.ini")),
      copy(sep("Mod", "natives", "x.pak"), sep("Mod", "natives", "x.pak")),
      { type: "setmodtype", value: "XXX-fluffymod" },
    ]);
  });
});

describe("template-reframework-fluffy: re-zip installer", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  // A staging folder named the way Vortex names it while installing, holding real files.
  function staging(name, files) {
    const root = makeTempDir();
    const dest = path.join(root, name);
    for (const file of files) {
      const target = path.join(dest, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, "");
    }
    return dest;
  }

  const install = (files, dest) => installerOf(ext, "XXX-fluffymodzip").install(files, dest);

  it("copies nested archives through untouched when the mod is already zipped", async () => {
    vortex.sevenZip.calls.length = 0;
    const files = tree("a.zip", "b.7z", "sub/c.rar", "readme.txt");
    const { instructions } = await install(files, "unused");
    assert.deepEqual(instructions, [
      copy("a.zip", "a.zip"),
      copy("b.7z", "b.7z"),
      copy(sep("sub", "c.rar"), "c.rar"),
    ]);
    assert.deepEqual(vortex.sevenZip.calls, []);
  });

  it("repacks the staging folder into one zip named after the mod", async () => {
    vortex.sevenZip.calls.length = 0;
    const dest = staging("Cool Mod.installing", ["natives/x.pak", "modinfo.ini"]);
    const { instructions } = await install(tree("natives/x.pak", "modinfo.ini"), dest);

    assert.deepEqual(instructions, [copy("Cool Mod.zip", "Cool Mod.zip")]);
    const [call] = vortex.sevenZip.calls;
    assert.equal(call.archive, path.join(dest, "Cool Mod.zip"));
    assert.deepEqual([...call.files].sort(), [
      path.join(dest, "modinfo.ini"),
      path.join(dest, "natives"),
    ]);
    assert.deepEqual(call.options, { raw: ["-r"] });
    assert.equal(vortex.sevenZip.calls.length, 1);
  });

  it("waits for 7-Zip to finish before reporting the zip", async () => {
    const { util } = require("vortex-api");
    const stock = util.SevenZip;
    let finished = false;
    util.SevenZip = class {
      async add() {
        await new Promise((resolve) => setTimeout(resolve, 20));
        finished = true;
      }
    };
    try {
      await install(tree("a.pak"), staging("Slow.installing", ["a.pak"]));
    } finally {
      util.SevenZip = stock;
    }
    assert.equal(finished, true);
  });

  it("names the zip after the whole folder name when it has no .installing suffix", async () => {
    vortex.sevenZip.calls.length = 0;
    const dest = staging("Cool Mod", ["a.pak"]);
    const { instructions } = await install(tree("a.pak"), dest);
    assert.deepEqual(instructions, [copy("Cool Mod.zip", "Cool Mod.zip")]);
  });

  it("only treats lower-case .zip, .7z and .rar as archives to pass through", async () => {
    vortex.sevenZip.calls.length = 0;
    const dest = staging("Mod.installing", ["a.pak"]);
    const { instructions } = await install(tree("a.pak", "b.zip"), dest);
    assert.deepEqual(instructions, [copy("b.zip", "b.zip")]);
    assert.deepEqual(vortex.sevenZip.calls, []);
  });

  it("known gap: a nested archive with an upper-case extension is repacked inside another zip", async () => {
    vortex.sevenZip.calls.length = 0;
    const dest = staging("Mod.installing", ["Mod.ZIP"]);
    const { instructions } = await install(tree("Mod.ZIP"), dest);
    assert.deepEqual(instructions, [copy("Mod.zip", "Mod.zip")]);
    assert.equal(vortex.sevenZip.calls.length, 1);
  });
});

describe("template-reframework-fluffy: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the game folder and the Fluffy mods and presets folders", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-root": gameDir,
      "XXX-looselua": sep(gameDir, "."),
      "XXX-fluffymanager": gameDir,
      "XXX-reframework": gameDir,
      "XXX-fluffymod": sep(gameDir, "Games", "XXX", "Mods"),
      "XXX-preset": sep(gameDir, "Games", "XXX", "Presets"),
    });
  });

  it("resolves the game folder to nothing, rather than throwing, before the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    const targets = Object.fromEntries(
      undiscovered.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(
      [targets["XXX-root"], targets["XXX-looselua"], targets["XXX-fluffymanager"]],
      ["", "", ""],
    );
    assert.equal(targets["XXX-reframework"], "");
  });

  it("only offers the mod types once the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    for (const type of undiscovered.modTypes) assert.equal(type.isSupported(GAME_ID), false);
    for (const type of ext.modTypes) {
      assert.equal(type.isSupported(GAME_ID), true);
      assert.equal(type.isSupported("someothergame"), false);
    }
  });

  it("mods install to the Fluffy mods folder", () => {
    assert.equal(ext.game.queryModPath(), sep("Games", "XXX", "Mods"));
  });

  it("launches the base executable by default", () => {
    assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
  });

  it("launches the Xbox helper when it is in the game folder, ahead of the demo", async () => {
    const demo = await loadExtension(DIR, { transform: withDemo });
    assert.equal(
      demo.game.executable(makeGameDir(["gamelaunchhelper.exe"])),
      "gamelaunchhelper.exe",
    );
    assert.equal(
      demo.game.executable(makeGameDir(["gamelaunchhelper.exe", "XXX_Demo.exe"])),
      "gamelaunchhelper.exe",
    );
    assert.equal(demo.game.queryModPath(), sep("Games", "XXX", "Mods"));
  });

  it("launches the demo executable and moves the mod folders to the demo's", async () => {
    const demo = await loadExtension(DIR, {
      transform: withDemo,
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
    assert.equal(demo.game.executable(makeGameDir(["XXX_Demo.exe"])), "XXX_Demo.exe");
    assert.equal(demo.game.queryModPath(), sep("Games", "XXX_Demo", "Mods"));
    const targets = Object.fromEntries(
      demo.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.equal(targets["XXX-fluffymod"], sep(gameDir, "Games", "XXX_Demo", "Mods"));
    assert.equal(targets["XXX-preset"], sep(gameDir, "Games", "XXX_Demo", "Presets"));
  });

  it("a single-executable game ignores the Xbox helper and the demo", async () => {
    const single = await loadExtension(DIR, { transform: singleExe });
    assert.equal(
      single.game.executable(makeGameDir(["gamelaunchhelper.exe", "XXX_Demo.exe"])),
      "XXX.exe",
    );
    assert.equal(single.game.queryModPath(), sep("Games", "XXX", "Mods"));
  });

  it("known gap: a game with no demo (EXEC_DEMO empty) and the Xbox logic on launches an empty executable", async () => {
    const noDemo = await loadExtension(DIR, { transform: setConst("EXEC_DEMO", '""') });
    assert.equal(noDemo.game.executable(makeGameDir()), "");
    assert.equal(noDemo.game.queryModPath(), sep("Games", "XXX_Demo", "Mods"));
  });

  it("known gap: a demo executable with the game's own name makes every install look like the demo", async () => {
    const same = await loadExtension(DIR);
    same.game.executable(makeGameDir(["XXX.exe"]));
    assert.equal(same.game.queryModPath(), sep("Games", "XXX_Demo", "Mods"));
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

  it("leaves the Epic and Xbox launchers out when their ids are not discoverable", async () => {
    const other = await loadExtension(DIR, {
      transform: all(setConst("EPICAPP_ID", '"epic"'), setConst("XBOXAPP_ID", '"xbox"')),
    });
    assert.deepEqual(await other.game.requiresLauncher(gameDir, "steam"), { launcher: "steam" });
    assert.equal(await other.game.requiresLauncher(gameDir, "epic"), undefined);
    assert.equal(await other.game.requiresLauncher(gameDir, "xbox"), undefined);
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
});

describe("template-reframework-fluffy: game version", () => {
  const withExeVersion = async (impl, run) => {
    const stub = require("exe-version");
    const saved = stub.getProductVersion;
    stub.getProductVersion = impl;
    try {
      return await run();
    } finally {
      stub.getProductVersion = saved;
    }
  };

  it("reads the version from the executable", async () => {
    const ext = await loadExtension(DIR);
    const read = [];
    const gameDir = makeGameDir();
    const version = await withExeVersion(
      (file) => {
        read.push(file);
        return "9.8.7.6";
      },
      () => ext.game.getGameVersion(gameDir),
    );
    assert.equal(version, "9.8.7.6");
    assert.deepEqual(read, [path.join(gameDir, "XXX.exe")]);
    assert.equal(await ext.game.getGameVersion(makeGameDir()), STUB_EXE_VERSION);
  });

  it("reads the demo executable for the demo build", async () => {
    const ext = await loadExtension(DIR, { transform: withDemo });
    const read = [];
    const gameDir = makeGameDir(["XXX_Demo.exe"]);
    await withExeVersion(
      (file) => {
        read.push(file);
        return "1.0.0.0";
      },
      () => ext.game.getGameVersion(gameDir),
    );
    assert.deepEqual(read, [path.join(gameDir, "XXX_Demo.exe")]);
  });

  it("reports 0.0.0 when the executable cannot be read", async () => {
    const ext = await loadExtension(DIR);
    const version = await withExeVersion(
      () => {
        throw new Error("no version resource");
      },
      () => ext.game.getGameVersion(makeGameDir()),
    );
    assert.equal(version, "0.0.0");
    assert.ok(
      vortex.logs.some(
        ({ level, message }) =>
          level === "error" &&
          /^Could not read executable file to get game version: .*no version resource$/.test(
            message,
          ),
      ),
    );
  });

  it("reads the version from appxmanifest.xml for the Xbox build", async () => {
    const ext = await loadExtension(DIR);
    const xboxDir = makeGameDir(["gamelaunchhelper.exe"]);
    fs.writeFileSync(
      path.join(xboxDir, "appxmanifest.xml"),
      '<Package><Identity Name="x" Version="1.2.3.0"/></Package>',
    );
    assert.equal(await ext.game.getGameVersion(xboxDir), "1.2.3.0");
  });

  it("falls back to 0.0.0 when the Xbox manifest is unreadable", async () => {
    const ext = await loadExtension(DIR);
    const version = await ext.game.getGameVersion(makeGameDir(["gamelaunchhelper.exe"]));
    assert.equal(version, "0.0.0");
    assert.ok(
      vortex.logs.some(
        ({ level, message }) =>
          level === "error" &&
          /^Could not read appmanifest\.xml file to get Xbox game version: .*appxmanifest\.xml'$/.test(
            message,
          ),
      ),
    );
  });

  it("reads the executable, not the manifest, when Xbox logic is off", async () => {
    const ext = await loadExtension(DIR, { transform: singleExe });
    const xboxDir = makeGameDir(["gamelaunchhelper.exe"]);
    fs.writeFileSync(
      path.join(xboxDir, "appxmanifest.xml"),
      '<Package><Identity Version="5.5"/></Package>',
    );
    assert.equal(await ext.game.getGameVersion(xboxDir), STUB_EXE_VERSION);
  });
});

describe("template-reframework-fluffy: setup and downloads", () => {
  const releaseDownloads = [
    {
      event: "start-download",
      urls: [FLUFFY_PAGE],
      info: { game: "site", name: "Fluffy Mod Manager" },
    },
  ];

  it("creates the mod folders and downloads Fluffy and REFramework from Nexus", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    const downloads = seen.filter(({ event }) => event === "start-download");
    assert.deepEqual(downloads, [
      ...releaseDownloads,
      {
        event: "start-download",
        urls: ["nxm://XXX/mods/0/files/0"],
        info: { game: "XXX", name: "REFramework" },
      },
    ]);
    assert.deepEqual(
      ext.dispatched.map(({ type, payload }) => [type, payload.at(-1)]),
      [
        ["setModsEnabled", { allowAutoDeploy: true, installed: true }],
        ["setModType", "XXX-fluffymanager"],
        ["setModsEnabled", { allowAutoDeploy: true, installed: true }],
        ["setModType", "XXX-reframework"],
      ],
    );
    assert.ok(fs.statSync(path.join(gameDir, "Games", "XXX", "Mods")).isDirectory());
    assert.ok(fs.statSync(path.join(gameDir, "Games", "XXX", "Presets")).isDirectory());
  });

  it("sends and clears an installing notice for each download", async () => {
    const ext = await loadExtension(DIR);
    answerDownloads(ext);
    const dismissed = [];
    ext.api.dismissNotification = (id) => dismissed.push(id);
    await ext.game.setup({ path: makeGameDir() });

    const shape = ({ id, message, type, noDismiss, allowSuppress }) => [
      id,
      message,
      type,
      noDismiss,
      allowSuppress,
    ];
    assert.deepEqual(ext.notifications.map(shape), [
      ["XXX-fluffymanager-installing", "Installing Fluffy Mod Manager", "activity", true, false],
      ["XXX-reframework-installing", "Installing REFramework", "activity", true, false],
    ]);
    assert.deepEqual(dismissed, ["XXX-fluffymanager-installing", "XXX-reframework-installing"]);
  });

  it("sends and clears the same notice for the GitHub nightly", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("useRefNightly", "true") });
    answerDownloads(ext);
    const dismissed = [];
    ext.api.dismissNotification = (id) => dismissed.push(id);
    await ext.game.setup({ path: makeGameDir() });

    const [, nightly] = ext.notifications;
    assert.deepEqual(
      [nightly.id, nightly.message, nightly.type, nightly.noDismiss, nightly.allowSuppress],
      ["XXX-reframework-installing", "Installing REFramework", "activity", true, false],
    );
    assert.deepEqual(dismissed.at(-1), "XXX-reframework-installing");
  });

  for (const [label, transform] of [
    ["from Nexus", undefined],
    ["from GitHub", setConst("useRefNightly", "true")],
  ]) {
    it(`hands Vortex each download ${label} in the shape it expects, then enables and types the mod`, async () => {
      const ext = await loadExtension(DIR, { transform });
      ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
      const seen = answerRaw(ext);
      await ext.game.setup({ path: makeGameDir() });

      assert.deepEqual(
        seen.map(({ event }) => event),
        ["start-download", "start-install-download", "start-download", "start-install-download"],
      );
      for (const call of seen) {
        if (call.event === "start-download") {
          assert.deepEqual(
            [call.third, call.sixth, call.options],
            [undefined, undefined, { allowInstall: false }],
          );
        } else {
          assert.deepEqual([call.id, call.options], ["download-1", { allowAutoEnable: false }]);
        }
      }
      const enabled = { allowAutoDeploy: true, installed: true };
      assert.deepEqual(
        ext.dispatched.map(({ type, payload }) => [type, ...payload.slice(1)]),
        [
          ["setModsEnabled", "profile-1", ["mod-1"], true, enabled],
          ["setModType", "mod-1", "XXX-fluffymanager"],
          ["setModsEnabled", "profile-1", ["mod-1"], true, enabled],
          ["setModType", "mod-1", "XXX-reframework"],
        ],
      );
      assert.deepEqual(ext.dispatched[1].payload[0], GAME_ID);
      assert.deepEqual(ext.dispatched[3].payload[0], GAME_ID);
    });
  }

  it("waits for each download to finish, one after the other, before setup completes", async () => {
    const ext = await loadExtension(DIR);
    const seen = answerRaw(ext, 15);
    await ext.game.setup({ path: makeGameDir() });
    assert.deepEqual(
      seen.map(({ event }) => event),
      ["start-download", "start-install-download", "start-download", "start-install-download"],
    );
    assert.equal(ext.dispatched.length, 4);

    const nightly = await loadExtension(DIR, { transform: setConst("useRefNightly", "true") });
    const nightlySeen = answerRaw(nightly, 15);
    await nightly.game.setup({ path: makeGameDir() });
    assert.equal(nightlySeen.length, 4);
    assert.equal(nightly.dispatched.length, 4);
  });

  it("creates the demo mod folders for the demo build", async () => {
    const gameDir = makeGameDir(["XXX_Demo.exe"]);
    const ext = await loadExtension(DIR, { transform: withDemo });
    answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    assert.ok(fs.statSync(path.join(gameDir, "Games", "XXX_Demo", "Mods")).isDirectory());
    assert.ok(fs.statSync(path.join(gameDir, "Games", "XXX_Demo", "Presets")).isDirectory());
    assert.equal(fs.existsSync(path.join(gameDir, "Games", "XXX")), false);
  });

  it("keeps the Xbox build on the base mod folders", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    const ext = await loadExtension(DIR, { transform: withDemo });
    answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    assert.ok(fs.statSync(path.join(gameDir, "Games", "XXX", "Mods")).isDirectory());
    assert.equal(fs.existsSync(path.join(gameDir, "Games", "XXX_Demo")), false);
  });

  it("skips both downloads when both are already installed", async () => {
    const state = makeState({
      mods: {
        [GAME_ID]: {
          a: { type: "XXX-fluffymanager" },
          b: { type: "XXX-reframework" },
        },
      },
    });
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR, { state });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    assert.deepEqual(seen, []);
    assert.deepEqual(ext.dispatched, []);
    assert.deepEqual(ext.notifications, []);
    assert.ok(fs.statSync(path.join(gameDir, "Games", "XXX", "Mods")).isDirectory());
  });

  it("downloads only the one that is missing", async () => {
    const state = makeState({ mods: { [GAME_ID]: { a: { type: "XXX-reframework" } } } });
    const ext = await loadExtension(DIR, { state });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    assert.deepEqual(
      seen.filter(({ event }) => event === "start-download"),
      releaseDownloads,
    );
  });

  it("prefers the newest main file listed on Nexus over the pinned file id", async () => {
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    const asked = [];
    ext.api.ext.nexusGetModFiles = async (domain, page) => {
      asked.push([domain, page]);
      return [
        { category_id: 1, uploaded_time: "200", file_id: 8 },
        { category_id: 1, uploaded_time: "300", file_id: 10 },
        { category_id: 1, uploaded_time: "100", file_id: 7 },
        { category_id: 2, uploaded_time: "400", file_id: 9 },
      ];
    };
    await ext.game.setup({ path: makeGameDir() });

    assert.deepEqual(asked, [
      ["site", 818],
      ["XXX", 0],
    ]);
    const urls = seen.filter(({ event }) => event === "start-download").map(({ urls }) => urls[0]);
    assert.deepEqual(urls, ["nxm://site/mods/818/files/10", "nxm://XXX/mods/0/files/10"]);
  });

  it("compares upload times as numbers, so a longer timestamp is newer", async () => {
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    ext.api.ext.nexusGetModFiles = async () => [
      { category_id: 1, uploaded_time: "9", file_id: 1 },
      { category_id: 1, uploaded_time: "10", file_id: 2 },
    ];
    await ext.game.setup({ path: makeGameDir() });
    const urls = seen.filter(({ event }) => event === "start-download").map(({ urls }) => urls[0]);
    assert.deepEqual(urls, ["nxm://site/mods/818/files/2", "nxm://XXX/mods/0/files/2"]);
  });

  it("falls back to the pinned file id when Nexus lists no main file", async () => {
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    ext.api.ext.nexusGetModFiles = async () => [{ category_id: 2, uploaded_time: "1", file_id: 9 }];
    await ext.game.setup({ path: makeGameDir() });
    const urls = seen.filter(({ event }) => event === "start-download").map(({ urls }) => urls[0]);
    assert.deepEqual(urls, [FLUFFY_PAGE, "nxm://XXX/mods/0/files/0"]);
  });

  it("makes sure the user is logged in to Nexus before each Nexus download", async () => {
    const ext = await loadExtension(DIR);
    answerDownloads(ext);
    const order = [];
    ext.api.ext.ensureLoggedIn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
      order.push("login");
    };
    ext.api.events.on("start-download", () => order.push("download"));
    await ext.game.setup({ path: makeGameDir() });
    assert.deepEqual(order, ["login", "download", "login", "download"]);
  });

  it("useRefNightly takes REFramework from GitHub instead of Nexus", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("useRefNightly", "true") });
    const seen = answerDownloads(ext);
    ext.api.ext.ensureLoggedIn = async () => seen.push({ event: "login" });
    await ext.game.setup({ path: makeGameDir() });

    const downloads = seen.filter(({ event }) => event === "start-download");
    assert.deepEqual(downloads[1], {
      event: "start-download",
      urls: [REF_NIGHTLY],
      info: { game: "XXX", name: "REFramework" },
    });
    assert.equal(seen.filter(({ event }) => event === "login").length, 1);
    assert.deepEqual(ext.dispatched.at(-1).payload, ["XXX", "mod-1", "XXX-reframework"]);
  });

  it("reports a failed Fluffy download and opens the Nexus files page", async () => {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
      callback(new Error("offline")),
    );
    await ext.game.setup({ path: makeGameDir() });

    assert.equal(ext.errors[0][0], "Failed to download/install Fluffy Mod Manager");
    assert.equal(ext.errors[1][0], "Failed to download/install REFramework");
    assert.deepEqual(opened, [
      "https://www.nexusmods.com/site/mods/818/files/?tab=files",
      "https://www.nexusmods.com/XXX/mods/0/files/?tab=files",
    ]);
    assert.deepEqual(ext.dispatched, []);
  });

  it("reports a failed nightly download and opens the GitHub releases page", async () => {
    const opened = stubShell();
    const ext = await loadExtension(DIR, { transform: setConst("useRefNightly", "true") });
    let calls = 0;
    ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
      callback(++calls === 1 ? null : new Error("offline"), "download-1"),
    );
    ext.api.events.on("start-install-download", (_id, _options, callback) =>
      callback(null, "mod-1"),
    );
    await ext.game.setup({ path: makeGameDir() });

    assert.equal(ext.errors[0][0], "Failed to download/install REFramework");
    assert.deepEqual(opened, [REF_RELEASES]);
  });

  it("reports the failure without throwing when the shell cannot open the page", async () => {
    const ext = await loadExtension(DIR);
    ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
      callback(new Error("offline")),
    );
    await ext.game.setup({ path: makeGameDir() });
    const opening = ext.errors.filter(([title]) => title === "Failed to open the URL");
    assert.equal(opening.length, 2);
    for (const entry of opening) assert.deepEqual(entry[2], { allowReport: false });
  });

  it("reports the failure without throwing when the shell cannot open the GitHub page", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("useRefNightly", "true") });
    let calls = 0;
    ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
      callback(++calls === 1 ? null : new Error("offline"), "download-1"),
    );
    ext.api.events.on("start-install-download", (_id, _options, callback) =>
      callback(null, "mod-1"),
    );
    await ext.game.setup({ path: makeGameDir() });
    const opening = ext.errors.filter(([title]) => title === "Failed to open the URL");
    assert.equal(opening.length, 1);
    assert.deepEqual(opening[0][2], { allowReport: false });
  });

  it("useRefNightly skips the nightly in setup when REFramework is already installed", async () => {
    const state = makeState({ mods: { [GAME_ID]: { a: { type: "XXX-reframework" } } } });
    const ext = await loadExtension(DIR, { state, transform: setConst("useRefNightly", "true") });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    assert.deepEqual(
      seen.filter(({ event }) => event === "start-download"),
      releaseDownloads,
    );
  });

  it("the toolbar button downloads the REFramework nightly even when REFramework is installed", async () => {
    const state = makeState({ mods: { [GAME_ID]: { a: { type: "XXX-reframework" } } } });
    const ext = await loadExtension(DIR, { state });
    const seen = answerDownloads(ext);
    actionOf(ext, "Download Latest REFramework Nightly").action();
    assert.ok(await waitFor(() => seen.length === 2));

    assert.equal(seen[0].event, "start-download");
    assert.deepEqual(seen[0].urls, [REF_NIGHTLY]);
  });
});

describe("template-reframework-fluffy: Fluffy reminder after deploying", () => {
  const toolPath = path.join(makeGameDir(), "modmanager.exe");

  function didDeploy(ext) {
    return ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1];
  }

  it("shows the reminder only for the last active profile", async () => {
    const ext = await loadExtension(DIR);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-2", {});
    assert.deepEqual(ext.notifications, []);

    await didDeploy(ext)("profile-1", {});
    const [notice] = ext.notifications;
    assert.equal(notice.id, "XXX-deploy-notification");
    assert.equal(notice.type, "warning");
    assert.equal(notice.message, "Run Fluffy Mod Manager after Deploy");
    assert.equal(notice.allowSuppress, true);
    assert.deepEqual(
      notice.actions.map(({ title }) => title),
      ["Run Fluffy", "More"],
    );
  });

  async function shown(state) {
    const ext = await loadExtension(DIR, { state });
    const runs = [];
    ext.api.runExecutable = (...args) => {
      runs.push(args);
      return Promise.resolve();
    };
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1", {});
    return { ext, runs };
  }

  const withTool = () =>
    makeState({
      discovered: { [GAME_ID]: { path: "x", tools: { "XXX-fluffymanager": { path: toolPath } } } },
    });

  it("the Run Fluffy button launches the manager without suggesting a deploy", async () => {
    const { ext, runs } = await shown(withTool());
    let dismissed = 0;
    ext.notifications[0].actions[0].action(() => dismissed++);
    assert.deepEqual(runs, [[toolPath, [], { suggestDeploy: false }]]);
    assert.equal(dismissed, 1);
  });

  it("the More dialog explains the manager and offers Run, Continue and Never Show Again", async () => {
    const { ext, runs } = await shown(withTool());
    const suppressed = [];
    ext.api.suppressNotification = (id) => suppressed.push(id);
    let dismissed = 0;
    ext.notifications[0].actions[1].action(() => dismissed++);

    const [type, title, content, buttons] = ext.dialogs[0];
    assert.equal(type, "question");
    assert.equal(title, "Run Fluffy Mod Manager after Deploy");
    assert.equal(
      content.text,
      "You must use Fluffy Mod Manager to enable most mods after installing with Vortex.\n" +
        'Use the included tool to launch Fluffy Mod Manager (button on notification or in "Dashboard" tab).\n' +
        'If your mod is not for Fluffy Mod Manager, you may need to change the mod type to "Binaries / Root Folder" and extract the zip in the staging folder manually.\n',
    );
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Run Fluffy", "Continue", "Never Show Again"],
    );
    buttons[1].action();
    assert.deepEqual([dismissed, runs.length, suppressed], [1, 0, []]);
    buttons[2].action();
    assert.deepEqual([dismissed, suppressed], [2, ["XXX-deploy-notification"]]);
    buttons[0].action();
    assert.deepEqual([dismissed, runs.length], [3, 1]);
  });

  // Both failure routes report the same way: a rejected launch, and a launch that throws at once.
  const routes = {
    "a rejected launch": (code) => () => Promise.reject(Object.assign(new Error("x"), { code })),
    "a launch that throws": (code) => () => {
      throw Object.assign(new Error("x"), { code });
    },
  };

  async function reportedFor(runExecutable) {
    const { ext } = await shown(withTool());
    ext.api.runExecutable = runExecutable;
    ext.notifications[0].actions[0].action(() => undefined);
    assert.ok(await waitFor(() => ext.errors.length === 1));
    return ext.errors[0];
  }

  for (const [label, route] of Object.entries(routes)) {
    it(`reports ${label}, and offers to report only permission and missing-file errors`, async () => {
      for (const [code, reportable] of [
        ["EPERM", true],
        ["ENOENT", true],
        ["EBUSY", false],
      ]) {
        const [title, , options] = await reportedFor(route(code));
        assert.equal(title, "Failed to run Fluffy Mod Manager", code);
        assert.deepEqual(options, { allowReport: reportable }, code);
      }
    });

    it(`known gap: ${label} with an access-denied code is never offered for reporting`, async () => {
      // The list holds "EACCESS", which Node never raises; the code is "EACCES".
      assert.deepEqual((await reportedFor(route("EACCES")))[2], { allowReport: false });
      assert.deepEqual((await reportedFor(route("EACCESS")))[2], { allowReport: true });
    });
  }

  it("reports an error instead of throwing when Fluffy is not set up", async () => {
    const { ext, runs } = await shown(undefined);
    ext.notifications[0].actions[0].action(() => undefined);
    assert.equal(ext.errors[0][0], "Failed to run Fluffy Mod Manager");
    assert.deepEqual(runs, []);
  });

  it("explains that Fluffy has no path when the tool is known but unlocated", async () => {
    const state = makeState({
      discovered: { [GAME_ID]: { path: "x", tools: { "XXX-fluffymanager": {} } } },
    });
    const { ext, runs } = await shown(state);
    ext.notifications[0].actions[0].action(() => undefined);
    assert.deepEqual(ext.errors[0], [
      "Failed to run Fluffy Mod Manager",
      "Path to Fluffy Mod Manager executable could not be found. Ensure Fluffy Mod Manager is installed through Vortex.",
    ]);
    assert.deepEqual(runs, []);
  });
});

describe("template-reframework-fluffy: toolbar actions", () => {
  async function run(title, state) {
    const opened = stubShell();
    const ext = await loadExtension(DIR, { state });
    actionOf(ext, title).action();
    return opened;
  }

  it("only shows while the game is the active game", async () => {
    const ext = await loadExtension(DIR);
    ext.state.persistent.profiles.profile.gameId = GAME_ID;
    for (const action of ext.registeredActions) assert.equal(action.condition(), true);
    ext.state.persistent.profiles.profile.gameId = "someothergame";
    for (const action of ext.registeredActions) assert.equal(action.condition(), false);
  });

  it("opens the config file in the discovered game folder", async () => {
    const gameDir = makeGameDir();
    const state = makeState({ discovered: { [GAME_ID]: { path: gameDir } } });
    assert.deepEqual(await run("Open Config File", state), [sep(gameDir, ".", "config.ini")]);
  });

  it("opens the Nexus Mods, SteamDB and PCGamingWiki pages and the bug tracker", async () => {
    assert.deepEqual(await run("Open Nexus Mods Page"), ["https://www.nexusmods.com/XXX/mods"]);
    assert.deepEqual(await run("Open SteamDB Page"), ["https://steamdb.info/app/XXX/"]);
    assert.deepEqual(await run("Open PCGamingWiki Page"), ["XXX"]);
    assert.deepEqual(await run("Submit Bug Report"), ["XXX?tab=bugs"]);
  });

  it("opens the extension's changelog", async () => {
    assert.deepEqual(await run("View Changelog"), [path.join(DIR, "CHANGELOG.md")]);
  });

  it("opens the downloads folder once setup has found it", async () => {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    actionOf(ext, "Open Downloads Folder").action();
    assert.deepEqual(opened, [sep(vortex.APP_ROOT, "downloads", GAME_ID)]);
  });

  it("reports a failure to open instead of throwing", async () => {
    brokenShell();
    const ext = await loadExtension(DIR);
    const failed = {
      "Open Config File": "Failed to open the file or folder",
      "Open Save Folder (Steam)": "Failed to open the file or folder",
      "Open PCGamingWiki Page": "Failed to open the URL",
      "Open Nexus Mods Page": "Failed to open the URL",
      "Open SteamDB Page": "Failed to open the URL",
      "View Changelog": "Failed to open the file or folder",
      "Submit Bug Report": "Failed to open the URL",
      "Open Downloads Folder": "Failed to open the file or folder",
    };
    for (const [title, expected] of Object.entries(failed)) {
      ext.errors.length = 0;
      actionOf(ext, title).action();
      assert.ok(await waitFor(() => ext.errors.length === 1), title);
      assert.equal(ext.errors[0][0], expected, title);
      assert.deepEqual(ext.errors[0][2], { allowReport: false }, title);
    }
  });
});

describe("template-reframework-fluffy: Steam save folder", () => {
  function steam(userIds) {
    const root = makeTempDir();
    fs.mkdirSync(path.join(root, "userdata"));
    for (const id of userIds) fs.mkdirSync(path.join(root, "userdata", id));
    return root;
  }
  const registry = (root) => ({
    RegGetValue: (hive, key, name) => {
      assert.deepEqual(
        [hive, key, name],
        ["HKEY_LOCAL_MACHINE", "SOFTWARE\\WOW6432Node\\Valve\\Steam", "InstallPath"],
      );
      return { value: root };
    },
  });

  async function openSave(root, transform) {
    const opened = stubShell();
    const ext = await loadExtension(DIR, { transform });
    await withWinapi(registry(root), async () => {
      actionOf(ext, "Open Save Folder (Steam)").action();
      await waitFor(() => opened.length === 1);
    });
    return { opened, ext };
  }

  it("opens userdata/<first user id>/<app id>, skipping files in userdata", async () => {
    const root = steam(["1111", "2222"]);
    fs.writeFileSync(path.join(root, "userdata", "0-file.txt"), "");
    const { opened } = await openSave(root);
    assert.deepEqual(opened, [sep(root, "userdata", "1111", "XXX")]);
  });

  it("leaves the user id out when there is no userdata folder", async () => {
    const root = makeTempDir();
    const { opened } = await openSave(root);
    assert.deepEqual(opened, [sep(root, "userdata", "XXX")]);
  });

  it("uses the demo's Steam id for the demo build", async () => {
    const root = steam(["1111"]);
    const demoDir = makeGameDir(["XXX_Demo.exe"]);
    const opened = stubShell();
    const ext = await loadExtension(DIR, { transform: withDemoIds });
    await ext.game.getGameVersion(demoDir);
    await withWinapi(registry(root), async () => {
      actionOf(ext, "Open Save Folder (Steam)").action();
      await waitFor(() => opened.length === 1);
    });
    assert.deepEqual(opened, [sep(root, "userdata", "1111", "DEMO")]);
  });

  it("uses the game's Steam id once the version is the full game", async () => {
    const root = steam(["1111"]);
    const opened = stubShell();
    const ext = await loadExtension(DIR, { transform: withDemoIds });
    await ext.game.getGameVersion(makeGameDir());
    await withWinapi(registry(root), async () => {
      actionOf(ext, "Open Save Folder (Steam)").action();
      await waitFor(() => opened.length === 1);
    });
    assert.deepEqual(opened, [sep(root, "userdata", "1111", "XXX")]);
  });

  it("leaves the user id out when userdata holds only files", async () => {
    const root = steam([]);
    fs.writeFileSync(path.join(root, "userdata", "readme.txt"), "");
    const { opened } = await openSave(root);
    assert.deepEqual(opened, [sep(root, "userdata", "XXX")]);
  });

  // With no Steam folder known the path is relative to wherever Vortex runs. userdata is not a
  // folder in this repo, so no user id is found either.
  it("opens a relative userdata path when the registry lookup fails", async () => {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    actionOf(ext, "Open Save Folder (Steam)").action();
    assert.ok(await waitFor(() => opened.length === 1));
    assert.deepEqual(opened, [sep("userdata", "XXX")]);
  });

  it("opens a relative userdata path when the registry has no value for Steam", async () => {
    for (const answer of [null, undefined, {}]) {
      const opened = stubShell();
      const ext = await loadExtension(DIR);
      await withWinapi({ RegGetValue: () => answer }, async () => {
        actionOf(ext, "Open Save Folder (Steam)").action();
        await waitFor(() => opened.length === 1);
      });
      assert.deepEqual(opened, [sep("userdata", "XXX")], String(answer));
    }
  });
});
