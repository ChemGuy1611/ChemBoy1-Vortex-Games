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
const { STUB_EXE_VERSION } = require("../harness/stub-modules");
const { setConst } = require("../harness/transforms");

const DIR = templateDir("template-shinryu");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const MEDIA = sep("runtime", "media");
const CONFIG_DIR = sep(vortex.APP_ROOT, "appData", "Sega", "XXX", "Steam");
const XBOX_SAVE_DIR = sep(
  vortex.APP_ROOT,
  "localAppData",
  "Packages",
  "XXX_XXX",
  "SystemAppData",
  "wgs",
);

describe("template-shinryu: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the root, SRMM mod and data types, then the mod manager last", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-root", 25],
      ["XXX-mod", 26],
      ["XXX-data", 27],
      ["XXX-modmanager", 78],
    ]);
  });

  it("registers the mod manager, mod, data and root installers with no fallback", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-modmanager", 25],
      ["XXX-mod", 27],
      ["XXX-data", 29],
      ["XXX-root", 27],
    ]);
  });

  it("registers the eight toolbar actions", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Open Save Folder",
        "Open Config Folder",
        "Open PCGamingWiki Page",
        "Open Nexus Mods Page",
        "Open SteamDB Page",
        "View Changelog",
        "Submit Bug Report",
        "Open Downloads Folder",
      ],
    );
  });

  it("listens for deployments once Vortex has started", () => {
    const listeners = ext.listeners.map(({ kind, args }) => [kind, args[0]]);
    assert.deepEqual(listeners, [["onAsync", "did-deploy"]]);
  });
});

describe("template-shinryu: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const matrix = [
    [
      "the mod manager (its .exe also matches the root installer)",
      tree("shinryumodmanager.exe"),
      ["XXX-modmanager", "XXX-root"],
    ],
    ["a mod with mod-meta.yaml", tree("MyMod/mod-meta.yaml", "MyMod/a.bin"), ["XXX-mod"]],
    ["a mod with modinfo.ini", tree("modinfo.ini"), ["XXX-mod"]],
    ["a .par data file in any case", tree("Pack/A.PAR"), ["XXX-data"]],
    ["a root DLL", tree("nvngx_dlss.dll"), ["XXX-root"]],
    ["a root executable", tree("Tools/Cool.exe"), ["XXX-root"]],
    [
      "a mod that also ships an exe (mod and root tie at priority 27)",
      tree("mod-meta.yaml", "tool.exe"),
      ["XXX-mod", "XXX-root"],
    ],
    ["loose files with no known marker (no fallback exists)", tree("readme.txt"), []],
    ["a FOMOD package with a mod", tree("fomod/ModuleConfig.xml", "mod-meta.yaml"), []],
    ["a FOMOD package with a .par file", tree("fomod/ModuleConfig.xml", "a.par"), []],
    ["a FOMOD package with an exe", tree("fomod/ModuleConfig.xml", "a.exe"), []],
    [
      "a FOMOD package with the mod manager",
      tree("fomod/ModuleConfig.xml", "shinryumodmanager.exe"),
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

describe("template-shinryu: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("mod manager installer strips the wrapper folder and sets the manager mod type", async () => {
    const files = tree("SRMM/shinryumodmanager.exe", "SRMM/libs/a.dll", "other.txt");
    const { instructions } = await installerOf(ext, "XXX-modmanager").install(files);
    assert.deepEqual(instructions, [
      copy(sep("SRMM", "shinryumodmanager.exe"), "shinryumodmanager.exe"),
      copy(sep("SRMM", "libs", "a.dll"), sep("libs", "a.dll")),
      { type: "setmodtype", value: "XXX-modmanager" },
    ]);
  });

  it("mod installer wraps a mod with files at the top in a folder named after the archive", async () => {
    const files = tree("mod-meta.yaml", "files/a.bin");
    const { instructions } = await installerOf(ext, "XXX-mod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy("mod-meta.yaml", sep("Cool Mod", "mod-meta.yaml")),
      copy(sep("files", "a.bin"), sep("Cool Mod", "files", "a.bin")),
      { type: "setmodtype", value: "XXX-mod" },
    ]);
  });

  it("mod installer keeps the mod's own folder when the archive already has one", async () => {
    const files = tree("MyMod/mod-meta.yaml", "MyMod/data/a.par");
    const { instructions } = await installerOf(ext, "XXX-mod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("MyMod", "mod-meta.yaml"), sep("MyMod", "mod-meta.yaml")),
      copy(sep("MyMod", "data", "a.par"), sep("MyMod", "data", "a.par")),
      { type: "setmodtype", value: "XXX-mod" },
    ]);
  });

  it("mod installer strips a wrapper folder above the mod's own folder, keeping its siblings", async () => {
    const files = tree(
      "Wrap/MyMod/mod-meta.yaml",
      "Wrap/MyMod/a.bin",
      "Wrap/readme.txt",
      "Out/b.txt",
    );
    const { instructions } = await installerOf(ext, "XXX-mod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "MyMod", "mod-meta.yaml"), sep("MyMod", "mod-meta.yaml")),
      copy(sep("Wrap", "MyMod", "a.bin"), sep("MyMod", "a.bin")),
      copy(sep("Wrap", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-mod" },
    ]);
  });

  it("data installer flattens to the .par file's folder", async () => {
    const files = tree("Pack/a.par", "Pack/b.par", "Pack/readme.txt", "Other/c.txt");
    const { instructions } = await installerOf(ext, "XXX-data").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "a.par"), "a.par"),
      copy(sep("Pack", "b.par"), "b.par"),
      copy(sep("Pack", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-data" },
    ]);
  });

  it("root installer flattens to the marker DLL's folder", async () => {
    const files = tree("Bin/nvngx_dlss.dll", "Bin/other.dll", "docs/y.txt");
    const { instructions } = await installerOf(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Bin", "nvngx_dlss.dll"), "nvngx_dlss.dll"),
      copy(sep("Bin", "other.dll"), "other.dll"),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer falls back to the .exe's folder when no marker DLL is present", async () => {
    const files = tree("Tools/Cool.exe", "Tools/lib/x.dll");
    const { instructions } = await installerOf(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Tools", "Cool.exe"), "Cool.exe"),
      copy(sep("Tools", "lib", "x.dll"), sep("lib", "x.dll")),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  // The root installer's test lower-cases file names but its install does not, so a marker DLL
  // written in another case (and no .exe) passes the test and then throws. Pinned so that
  // fixing the template turns this red and the entry gets removed.
  it("known gap: root installer throws on a marker DLL in a different case", async () => {
    const files = tree("Mod/NVNGX_DLSS.dll");
    assert.equal(
      (await installerOf(ext, "XXX-root").testSupported(files, GAME_ID)).supported,
      true,
    );
    assert.throws(() => installerOf(ext, "XXX-root").install(files), TypeError);
  });
});

describe("template-shinryu: toggles change what is registered", () => {
  const cases = [
    {
      name: "needsModInstaller off drops the mod installer but keeps its mod type",
      transform: setConst("needsModInstaller", "false"),
      installers: [
        ["XXX-modmanager", 25],
        ["XXX-data", 29],
        ["XXX-root", 27],
      ],
    },
    {
      name: "rootInstaller off drops the root installer",
      transform: setConst("rootInstaller", "false"),
      installers: [
        ["XXX-modmanager", 25],
        ["XXX-mod", 27],
        ["XXX-data", 29],
      ],
    },
  ];

  for (const { name, transform, installers } of cases) {
    it(name, async () => {
      const ext = await loadExtension(DIR, { transform });
      assert.deepEqual(summary(ext.installers), installers);
      assert.equal(ext.modTypes.length, 4);
    });
  }

  it("allowSymlinks is on by default and off when toggled, as passed to the game details", async () => {
    const on = await loadExtension(DIR);
    const off = await loadExtension(DIR, { transform: setConst("allowSymlinks", "false") });
    assert.equal(on.game.details.supportsSymlinks, true);
    assert.equal(off.game.details.supportsSymlinks, false);
  });

  it("setupNotification on shows the special instructions notice during setup", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("setupNotification", "true") });
    answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    const notice = ext.notifications.find(({ id }) => id === "XXX-setup-notification");
    assert.equal(notice.type, "warning");
  });

  it("an Xbox id outside the discovery ids turns the Xbox logic off", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("XBOXAPP_ID", '"other"') });
    assert.equal(
      ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])),
      sep("runtime", "media", "startup.exe"),
    );
    assert.equal(await ext.game.requiresLauncher(makeGameDir(), "xbox"), undefined);
  });
});

describe("template-shinryu: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the nested runtime/media folders", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-root": sep(gameDir, MEDIA),
      "XXX-mod": sep(gameDir, MEDIA, "mods"),
      "XXX-data": sep(gameDir, MEDIA, "data"),
      "XXX-modmanager": sep(gameDir, MEDIA),
    });
  });

  it("only offers the mod types once the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    for (const type of undiscovered.modTypes) assert.equal(type.isSupported(GAME_ID), false);
    for (const type of ext.modTypes) assert.equal(type.isSupported(GAME_ID), true);
  });

  it("installs mods to the SRMM mods folder and requires the nested executables", () => {
    assert.equal(ext.game.modPathIsRelative, true);
    assert.equal(ext.game.queryModPath(), sep(MEDIA, "mods"));
    assert.deepEqual(ext.game.requiredFiles, [sep(MEDIA, "startup.exe"), sep(MEDIA, "XXX.exe")]);
  });

  it("offers the modded launch, the mod manager and a no-mods launch", () => {
    const [launch, manager, plain] = ext.game.supportedTools;
    assert.deepEqual(
      [launch.id, manager.id, plain.id],
      ["XXX-modmanagerlaunch", "XXX-modmanager", "XXX-nomodlaunch"],
    );
    assert.deepEqual(launch.parameters, ["--run", "--silent"]);
    assert.equal(launch.executable(), "shinryumodmanager.exe");
    assert.equal(plain.executable(), sep(MEDIA, "startup.exe"));
  });

  it("picks the Xbox launcher executable only when its marker file exists", () => {
    assert.equal(ext.game.executable(makeGameDir()), sep(MEDIA, "startup.exe"));
    assert.equal(
      ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])),
      "gamelaunchhelper.exe",
    );
  });

  it("sets the launcher for each store", async () => {
    const { requiresLauncher } = ext.game;
    assert.deepEqual(await requiresLauncher(gameDir, "steam"), { launcher: "steam" });
    assert.deepEqual(await requiresLauncher(gameDir, "xbox"), {
      launcher: "xbox",
      addInfo: { appId: "XXX", parameters: [{ appExecName: "runtime.media.startup" }] },
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
    assert.equal(await ext.game.getGameVersion(makeGameDir(["gamelaunchhelper.exe"])), "0.0.0");
  });
});

describe("template-shinryu: setup and mod manager download", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  it("downloads and enables the mod manager, then creates the mods and data folders", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    assert.deepEqual(seen[0], {
      event: "start-download",
      urls: ["nxm://site/mods/743/files/7043"],
      info: { game: "site", name: "Shin Ryu MM" },
    });
    assert.equal(seen[1].downloadId, "download-1");
    assert.deepEqual(
      ext.dispatched.map(({ type }) => type),
      ["setModsEnabled", "setModType"],
    );
    assert.deepEqual(ext.dispatched[1].payload, ["XXX", "mod-1", "XXX-modmanager"]);
    assert.ok(fs.statSync(path.join(gameDir, MEDIA, "mods")).isDirectory());
    assert.ok(fs.statSync(path.join(gameDir, MEDIA, "data")).isDirectory());
  });

  it("prefers the newest main file listed on Nexus over the pinned file id", async () => {
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    ext.api.ext.nexusGetModFiles = async () => [
      { category_id: 1, uploaded_time: "100", file_id: 1 },
      { category_id: 1, uploaded_time: "200", file_id: 2 },
      { category_id: 2, uploaded_time: "300", file_id: 3 },
    ];
    await ext.game.setup({ path: makeGameDir() });
    assert.deepEqual(seen[0].urls, ["nxm://site/mods/743/files/2"]);
  });

  it("skips the download when the mod manager is already installed", async () => {
    const state = makeState({ mods: { [GAME_ID]: { existing: { type: "XXX-modmanager" } } } });
    const ext = await loadExtension(DIR, { state });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });

    assert.deepEqual(seen, []);
    assert.deepEqual(ext.dispatched, []);
  });

  it("reports a failed download and opens the Nexus file page", async () => {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
      callback(new Error("offline")),
    );
    await ext.game.setup({ path: makeGameDir() });

    assert.equal(ext.errors[0][0], "Failed to download/install Shin Ryu MM");
    assert.deepEqual(opened, ["https://www.nexusmods.com/site/mods/743/files/?tab=files"]);
    assert.deepEqual(ext.dispatched, []);
  });
});

describe("template-shinryu: run the mod manager after a deploy", () => {
  const toolPath = path.join(makeGameDir(), "shinryumodmanager.exe");

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
    assert.equal(notice.id, "XXX-deploy-notification");
    assert.equal(notice.type, "warning");
    assert.deepEqual(
      notice.actions.map(({ title }) => title),
      ["Run SRMM", "More"],
    );
  });

  it("the Run SRMM button launches the mod manager tool Vortex discovered", async () => {
    const state = makeState({
      discovered: { [GAME_ID]: { path: "x", tools: { "XXX-modmanager": { path: toolPath } } } },
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
    assert.deepEqual(runs, [[toolPath, [], { suggestDeploy: false }]]);
    assert.equal(dismissed, true);
  });

  it("reports an error instead of throwing when the mod manager is not set up", async () => {
    const ext = await loadExtension(DIR);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1", {});
    ext.notifications[0].actions[0].action(() => undefined);
    assert.equal(ext.errors[0][0], "Failed to run Shin Ryu MM");
  });
});

describe("template-shinryu: toolbar actions", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  async function run(title, { before: prepare } = {}) {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    prepare?.(ext);
    ext.registeredActions.find((action) => action.title === title).action();
    return opened;
  }

  it("opens the config folder under Roaming AppData", async () => {
    assert.deepEqual(await run("Open Config Folder"), [CONFIG_DIR]);
  });

  it("opens the save folder, which is the config folder when there is no user id folder", async () => {
    assert.deepEqual(await run("Open Save Folder"), [CONFIG_DIR]);
  });

  it("opens the user id subfolder as the save folder when one exists", async () => {
    const userDir = path.join(CONFIG_DIR, "76561");
    fs.mkdirSync(userDir, { recursive: true });
    try {
      assert.deepEqual(await run("Open Save Folder"), [userDir]);
    } finally {
      fs.rmSync(path.join(vortex.APP_ROOT, "appData"), { recursive: true, force: true });
    }
  });

  it("switches the save folder to the Xbox location once an Xbox install is detected", async () => {
    const xboxDir = makeGameDir(["gamelaunchhelper.exe"]);
    const opened = await run("Open Save Folder", {
      before: (ext) => ext.game.executable(xboxDir),
    });
    assert.deepEqual(opened, [XBOX_SAVE_DIR]);
  });

  it("opens the Nexus Mods and SteamDB pages and the bug tracker", async () => {
    assert.deepEqual(await run("Open Nexus Mods Page"), ["https://www.nexusmods.com/XXX/mods"]);
    assert.deepEqual(await run("Open SteamDB Page"), ["https://steamdb.info/app/XXX/"]);
    assert.deepEqual(await run("Submit Bug Report"), ["XXX?tab=bugs"]);
  });
});
