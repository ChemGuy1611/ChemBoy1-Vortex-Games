"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, describe, it } = require("node:test");
const { makeState } = require("../harness/fake-context");
const { makeGameDir, tree } = require("../harness/fixtures");
const {
  answerDownloads,
  installerOf,
  stubShell,
  summary,
  supportedBy,
} = require("../harness/helpers");
const { loadExtension, templateDir, vortex } = require("../harness/load-extension");
const { setConst } = require("../harness/transforms");

const DIR = templateDir("template-reloaded2");
const GAME_ID = "XXX";

// The scaffold's loader file placeholder is upper case and is compared against a lower-cased
// name, so it never matches until a game fills it in. Tests use a realistic lower-case value.
const withLoaderFile = setConst("RELOADEDMODLOADER_FILE", '"xxx.modloader.dll"');

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const ELEVATOR = sep(vortex.APP_ROOT, "application", "resources", "elevate.exe");
const MANAGER_URL =
  "https://github.com/Reloaded-Project/Reloaded-II/releases/latest/download/Release.zip";
const MANAGER_RELEASES = "https://github.com/Reloaded-Project/Reloaded-II/releases";

describe("template-reloaded2: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the mod, mod loader and manager mod types", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-reloadedmod", 25],
      ["XXX-reloadedmodloader", 76],
      ["XXX-reloadedmanager", 77],
    ]);
  });

  it("registers the manager, loader and mod installers, then the fallback", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-reloadedmanager", 25],
      ["XXX-reloadedmodloader", 27],
      ["XXX-reloadedmod", 29],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the eight toolbar actions", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Download Reloaded Mod Manager",
        "Open Save Folder",
        "Open PCGamingWiki Page",
        "Open Nexus Mods Page",
        "Open SteamDB Page",
        "View Changelog",
        "Open Downloads Folder",
        "Submit Bug Report",
      ],
    );
  });

  it("never uses symlinks, which Reloaded does not support", () => {
    assert.equal(ext.game.details.supportsSymlinks, false);
  });

  it("listens for deployments once Vortex has started", () => {
    assert.deepEqual(
      ext.listeners.map(({ kind, args }) => [kind, args[0]]),
      [["onAsync", "did-deploy"]],
    );
  });
});

describe("template-reloaded2: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, { transform: withLoaderFile });
  });

  const matrix = [
    [
      "the Reloaded-II manager",
      tree("Reloaded-II/reloaded-ii.exe"),
      ["XXX-reloadedmanager", "XXX-fallback"],
    ],
    [
      "a Reloaded mod (modconfig.json)",
      tree("MyMod/ModConfig.json"),
      ["XXX-reloadedmod", "XXX-fallback"],
    ],
    [
      "the mod loader (modconfig.json beside the loader dll)",
      tree("Loader/modconfig.json", "Loader/xxx.modloader.dll"),
      ["XXX-reloadedmodloader", "XXX-reloadedmod", "XXX-fallback"],
    ],
    ["a loader dll with no modconfig.json", tree("Loader/xxx.modloader.dll"), ["XXX-fallback"]],
    ["loose files with no known marker", tree("readme.txt"), ["XXX-fallback"]],
    ["a FOMOD package holding a mod", tree("fomod/ModuleConfig.xml", "modconfig.json"), []],
    [
      "a FOMOD package holding the mod loader",
      tree("fomod/ModuleConfig.xml", "modconfig.json", "xxx.modloader.dll"),
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

describe("template-reloaded2: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, { transform: withLoaderFile });
  });

  it("manager installer places the manager under the Reloaded folder", async () => {
    const files = tree("Reloaded-II/reloaded-ii.exe", "Reloaded-II/Loader/x.dll", "readme.txt");
    const { instructions } = await installerOf(ext, "XXX-reloadedmanager").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Reloaded-II", "reloaded-ii.exe"), sep("Reloaded", "reloaded-ii.exe")),
      copy(sep("Reloaded-II", "Loader", "x.dll"), sep("Reloaded", "Loader", "x.dll")),
      { type: "setmodtype", value: "XXX-reloadedmanager" },
    ]);
  });

  it("manager installer accepts files with no wrapper folder", async () => {
    const files = tree("reloaded-ii.exe", "Loader/x.dll");
    const { instructions } = await installerOf(ext, "XXX-reloadedmanager").install(files);
    assert.deepEqual(instructions, [
      copy("reloaded-ii.exe", sep("Reloaded", "reloaded-ii.exe")),
      copy(sep("Loader", "x.dll"), sep("Reloaded", "Loader", "x.dll")),
      { type: "setmodtype", value: "XXX-reloadedmanager" },
    ]);
  });

  it("mod loader installer flattens to the modconfig.json folder", async () => {
    const files = tree("Loader/modconfig.json", "Loader/xxx.modloader.dll", "Other/x.txt");
    const { instructions } = await installerOf(ext, "XXX-reloadedmodloader").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Loader", "modconfig.json"), "modconfig.json"),
      copy(sep("Loader", "xxx.modloader.dll"), "xxx.modloader.dll"),
      { type: "setmodtype", value: "XXX-reloadedmodloader" },
    ]);
  });

  it("mod installer wraps a mod with files at the top in a folder named after the archive", async () => {
    const files = tree("modconfig.json", "Mod.dll");
    const { instructions } = await installerOf(ext, "XXX-reloadedmod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy("modconfig.json", sep("CoolMod", "modconfig.json")),
      copy("Mod.dll", sep("CoolMod", "Mod.dll")),
      { type: "setmodtype", value: "XXX-reloadedmod" },
    ]);
  });

  it("mod installer keeps a mod's own folder and ignores files outside it", async () => {
    const files = tree("MyMod/modconfig.json", "MyMod/Mod.dll", "Other/x.txt");
    const { instructions } = await installerOf(ext, "XXX-reloadedmod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("MyMod", "modconfig.json"), sep("MyMod", "modconfig.json")),
      copy(sep("MyMod", "Mod.dll"), sep("MyMod", "Mod.dll")),
      { type: "setmodtype", value: "XXX-reloadedmod" },
    ]);
  });

  it("mod installer strips a wrapper folder above the mod's own folder", async () => {
    const files = tree("Wrap/MyMod/modconfig.json", "Wrap/MyMod/Mod.dll");
    const { instructions } = await installerOf(ext, "XXX-reloadedmod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "MyMod", "modconfig.json"), sep("MyMod", "modconfig.json")),
      copy(sep("Wrap", "MyMod", "Mod.dll"), sep("MyMod", "Mod.dll")),
      { type: "setmodtype", value: "XXX-reloadedmod" },
    ]);
  });

  it("fallback installer copies every file as is, leaves the mod type, and notifies", async () => {
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

describe("template-reloaded2: toggles change what is registered", () => {
  it("fallbackInstaller off drops the fallback", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("fallbackInstaller", "false") });
    assert.deepEqual(summary(ext.installers), [
      ["XXX-reloadedmanager", 25],
      ["XXX-reloadedmodloader", 27],
      ["XXX-reloadedmod", 29],
    ]);
  });

  it("setupNotification is on by default and off when toggled", async () => {
    const on = await loadExtension(DIR);
    answerDownloads(on);
    await on.game.setup({ path: makeGameDir() });
    const notice = on.notifications.find(({ id }) => id === "XXX-setup");
    assert.equal(notice.type, "warning");

    const off = await loadExtension(DIR, { transform: setConst("setupNotification", "false") });
    answerDownloads(off);
    await off.game.setup({ path: makeGameDir() });
    assert.equal(
      off.notifications.some(({ id }) => id === "XXX-setup"),
      false,
    );
  });

  it("an Xbox id outside the discovery ids turns the Xbox logic off", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("XBOXAPP_ID", '"other"') });
    assert.equal(ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])), "XXX.exe");
    assert.equal(await ext.game.requiresLauncher(makeGameDir(), "xbox"), undefined);
  });
});

describe("template-reloaded2: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the Reloaded mods folder, the mod loader folder and the game folder", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-reloadedmod": sep(gameDir, "Reloaded", "Mods"),
      "XXX-reloadedmodloader": sep(gameDir, "Reloaded", "Mods", "XXX_Mod_Loader"),
      "XXX-reloadedmanager": gameDir,
    });
  });

  it("only offers the mod types once the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    for (const type of undiscovered.modTypes) assert.equal(type.isSupported(GAME_ID), false);
    for (const type of ext.modTypes) assert.equal(type.isSupported(GAME_ID), true);
  });

  it("offers the Reloaded-II manager as the primary tool, launched from the game folder", () => {
    const [tool, ...rest] = ext.game.supportedTools;
    assert.equal(rest.length, 0);
    assert.equal(tool.id, "XXX-reloadedmanager");
    assert.equal(tool.executable(), "reloaded-ii.exe");
    assert.deepEqual(tool.requiredFiles, ["reloaded-ii.exe"]);
    assert.equal(tool.relative, true);
    assert.equal(tool.defaultPrimary, true);
  });

  it("launches the base executable, or the Xbox launcher when its marker file exists", () => {
    assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
    assert.equal(
      ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])),
      "gamelaunchhelper.exe",
    );
  });

  it("mods install to the game folder", () => {
    assert.equal(ext.game.queryModPath(), ".");
    assert.deepEqual(ext.game.requiredFiles, ["XXX.exe"]);
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

describe("template-reloaded2: setup and manager download", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  it("creates the mods and save folders, downloads the manager, and marks it portable", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    assert.deepEqual(seen[0], {
      event: "start-download",
      urls: [MANAGER_URL],
      info: { game: "XXX", name: "Reloaded Mod Manager" },
    });
    assert.equal(seen[1].downloadId, "download-1");
    assert.deepEqual(
      ext.dispatched.map(({ type }) => type),
      ["setModsEnabled", "setModType"],
    );
    assert.deepEqual(ext.dispatched[1].payload, ["XXX", "mod-1", "XXX-reloadedmanager"]);
    assert.ok(fs.statSync(path.join(gameDir, "Reloaded", "Mods")).isDirectory());
    assert.ok(fs.statSync(path.join(gameDir, "gamedata", "savedata")).isDirectory());
    assert.ok(fs.statSync(path.join(gameDir, "Reloaded", "portable.txt")).isFile());
  });

  it("skips the download when the manager is already installed, but still marks it portable", async () => {
    const gameDir = makeGameDir();
    const state = makeState({ mods: { [GAME_ID]: { existing: { type: "XXX-reloadedmanager" } } } });
    const ext = await loadExtension(DIR, { state });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    assert.deepEqual(seen, []);
    assert.deepEqual(ext.dispatched, []);
    assert.ok(fs.statSync(path.join(gameDir, "Reloaded", "portable.txt")).isFile());
  });

  it("reports a failed download and opens the releases page", async () => {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
      callback(new Error("offline")),
    );
    await ext.game.setup({ path: makeGameDir() });

    assert.equal(ext.errors[0][0], "Failed to download/install Reloaded Mod Manager");
    assert.deepEqual(opened, [MANAGER_RELEASES]);
    assert.deepEqual(ext.dispatched, []);
  });

  it("the toolbar button downloads the manager again even when it is installed", async () => {
    const state = makeState({ mods: { [GAME_ID]: { existing: { type: "XXX-reloadedmanager" } } } });
    const ext = await loadExtension(DIR, { state });
    const seen = answerDownloads(ext);
    ext.registeredActions.find(({ title }) => title === "Download Reloaded Mod Manager").action();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(seen[0].event, "start-download");
    assert.deepEqual(seen[0].urls, [MANAGER_URL]);
  });
});

describe("template-reloaded2: run Reloaded-II as admin", () => {
  const toolPath = path.join(makeGameDir(), "Reloaded", "reloaded-ii.exe");

  function didDeploy(ext) {
    return ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1];
  }

  it("shows the notice only for the last active profile", async () => {
    const ext = await loadExtension(DIR);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-2", {});
    assert.deepEqual(ext.notifications, []);

    await didDeploy(ext)("profile-1", {});
    const [notice] = ext.notifications;
    assert.equal(notice.id, "XXX-deploy");
    assert.equal(notice.type, "warning");
    assert.deepEqual(
      notice.actions.map(({ title }) => title),
      ["Run Reloaded (Admin)", "More"],
    );
  });

  it("the admin button runs the manager through Vortex's elevate.exe", async () => {
    const state = makeState({
      discovered: {
        [GAME_ID]: { path: "x", tools: { "XXX-reloadedmanager": { path: toolPath } } },
      },
    });
    const ext = await loadExtension(DIR, { state });
    const runs = [];
    ext.api.runExecutable = (...args) => {
      runs.push(args);
      return Promise.resolve();
    };
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1", {});

    let dismissed = false;
    ext.notifications[0].actions[0].action(() => (dismissed = true));
    assert.deepEqual(runs, [[ELEVATOR, [toolPath], { suggestDeploy: false, detached: true }]]);
    assert.equal(dismissed, true);
  });

  it("reports an error instead of throwing when the manager is not set up", async () => {
    const ext = await loadExtension(DIR);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1", {});
    ext.notifications[0].actions[0].action(() => undefined);
    assert.equal(ext.errors[0][0], "Failed to run Reloaded-II Mod Manager as Admin");
  });
});

describe("template-reloaded2: toolbar actions", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  async function run(title, state) {
    const opened = stubShell();
    const ext = await loadExtension(DIR, { state });
    ext.registeredActions.find((action) => action.title === title).action();
    return opened;
  }

  it("opens the save folder inside the discovered game folder", async () => {
    const gameDir = makeGameDir();
    const state = makeState({ discovered: { [GAME_ID]: { path: gameDir } } });
    assert.deepEqual(await run("Open Save Folder", state), [sep(gameDir, "gamedata", "savedata")]);
  });

  it("opens the Nexus Mods and SteamDB pages and the bug tracker", async () => {
    assert.deepEqual(await run("Open Nexus Mods Page"), ["https://www.nexusmods.com/XXX/mods"]);
    assert.deepEqual(await run("Open SteamDB Page"), ["https://steamdb.info/app/XXX/"]);
    assert.deepEqual(await run("Submit Bug Report"), ["XXX?tab=bugs"]);
  });
});
