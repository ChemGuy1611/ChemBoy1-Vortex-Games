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
  settle,
  stubShell,
  summary,
  supportedBy,
  waitFor,
} = require("../harness/helpers");
const { loadExtension, templateDir, vortex } = require("../harness/load-extension");
const { setConst } = require("../harness/transforms");

const DIR = templateDir("template-frostbite");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const MODS = sep("FrostyModManager", "Mods", "XXX");
const PLUGINS = sep("FrostyModManager", "Plugins");
const FROSTY_CONFIG = sep(vortex.APP_ROOT, "localAppData", "Frosty", "manager_config.json");
const FROSTY_URL =
  "https://github.com/CadeEvs/FrostyToolsuite/releases/download/v1.0.6.3/FrostyModManager.zip";
const FROSTY_RELEASES = "https://github.com/CadeEvs/FrostyToolsuite/releases";
const PATCH_URL =
  "https://github.com/Dyvinia/DatapathFixPlugin/releases/download/v1.7.1/DatapathFixPlugin.dll";

const withKey = setConst("needsKey", "true");
const withArchives = setConst("hasArchives", "true");

// Answers a dialog the way the user would, whatever it asks.
const answerDialog = (ext, answer) => {
  ext.api.showDialog = async () => answer;
};

describe("template-frostbite: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the root, Frosty mod and plugin types, then the Frosty manager last", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-root", 25],
      ["XXX-frostymod", 26],
      ["XXX-plugin", 27],
      ["XXX-frostymodmanager", 78],
    ]);
  });

  it("registers the manager, mod and plugin installers, then the fallback", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-frostymodmanager", 25],
      ["XXX-frostymod", 30],
      ["XXX-plugin", 35],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the thirteen toolbar actions", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Download DatapathFix Plugin",
        "Remove DatapathFix Plugin",
        "Delete ModData Folder",
        "Open Frosty manager_config.json",
        "Set DatapathFix Plugin Enabled",
        "Set DatapathFix Plugin Disabled",
        "Open Config Folder",
        "Open Frosty Mods Folder",
        "Open PCGamingWiki Page",
        "Open SteamDB Page",
        "View Changelog",
        "Submit Bug Report",
        "Open Downloads Folder",
      ],
    );
  });

  it("listens for deployments once Vortex has started", () => {
    assert.deepEqual(
      ext.listeners.map(({ kind, args }) => [kind, args[0]]),
      [["onAsync", "did-deploy"]],
    );
  });
});

describe("template-frostbite: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const matrix = [
    [
      "Frosty Mod Manager in any case",
      tree("FMM/FrostyModManager.exe"),
      ["XXX-frostymodmanager", "XXX-fallback"],
    ],
    ["a .fbmod mod", tree("Pack/a.fbmod"), ["XXX-frostymod", "XXX-fallback"]],
    ["a .fbpack mod", tree("a.FBPACK"), ["XXX-frostymod", "XXX-fallback"]],
    [
      "a mod with both .fbmod and a plugin dll",
      tree("a.fbmod", "p.dll"),
      ["XXX-frostymod", "XXX-plugin", "XXX-fallback"],
    ],
    ["a plugin dll", tree("Plugins/p.dll"), ["XXX-plugin", "XXX-fallback"]],
    ["a dll shipped with an exe (not a plugin)", tree("p.dll", "tool.exe"), ["XXX-fallback"]],
    [
      "Frosty Mod Manager shipped with a dll (not a plugin)",
      tree("FrostyModManager.exe", "p.dll"),
      ["XXX-frostymodmanager", "XXX-fallback"],
    ],
    ["an .archive file (only with hasArchives)", tree("a.archive"), ["XXX-fallback"]],
    ["a key file (only with needsKey)", tree("xxx.key"), ["XXX-fallback"]],
    ["loose files with no known marker", tree("readme.txt"), ["XXX-fallback"]],
    ["a FOMOD package with a mod", tree("fomod/ModuleConfig.xml", "a.fbmod"), []],
    ["a FOMOD package with Frosty", tree("fomod/ModuleConfig.xml", "frostymodmanager.exe"), []],
    ["a FOMOD package with a plugin", tree("fomod/ModuleConfig.xml", "p.dll"), []],
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

  it("hasArchives adds .archive files to the Frosty mod installer", async () => {
    const archives = await loadExtension(DIR, { transform: withArchives });
    assert.deepEqual(await supportedBy(archives, tree("a.archive")), [
      "XXX-frostymod",
      "XXX-fallback",
    ]);
  });

  it("needsKey routes the key file in any case, but not from a FOMOD or another game", async () => {
    const keyed = await loadExtension(DIR, { transform: withKey });
    assert.deepEqual(await supportedBy(keyed, tree("Keys/XXX.KEY")), ["XXX-key", "XXX-fallback"]);
    assert.deepEqual(await supportedBy(keyed, tree("fomod/ModuleConfig.xml", "xxx.key")), []);
    assert.deepEqual(await supportedBy(keyed, tree("xxx.key"), "someothergame"), []);
  });
});

describe("template-frostbite: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("Frosty installer places the manager under the FrostyModManager folder", async () => {
    const files = tree("FMM/frostymodmanager.exe", "FMM/Plugins/a.dll", "readme.txt");
    const { instructions } = await installerOf(ext, "XXX-frostymodmanager").install(files);
    assert.deepEqual(instructions, [
      copy(sep("FMM", "frostymodmanager.exe"), sep("FrostyModManager", "frostymodmanager.exe")),
      copy(sep("FMM", "Plugins", "a.dll"), sep("FrostyModManager", "Plugins", "a.dll")),
      { type: "setmodtype", value: "XXX-frostymodmanager" },
    ]);
  });

  it("mod installer copies each .fbmod to the top of the destination without notifying", async () => {
    const files = tree("Pack/a.fbmod", "Pack/readme.txt");
    const { instructions } = await installerOf(ext, "XXX-frostymod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("Pack", "a.fbmod"), "a.fbmod"),
      { type: "setmodtype", value: "XXX-frostymod" },
    ]);
    assert.deepEqual(ext.notifications, []);
  });

  it("mod installer tells the user to import a .fbpack by hand", async () => {
    const files = tree("Pack/b.fbpack");
    const { instructions } = await installerOf(ext, "XXX-frostymod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("Pack", "b.fbpack"), "b.fbpack"),
      { type: "setmodtype", value: "XXX-frostymod" },
    ]);
    const [notice] = ext.notifications;
    assert.equal(notice.id, "XXX-CoolMod-fallback");
    assert.equal(notice.type, "warning");
    assert.equal(notice.message, ".fbpack Import Required for Cool Mod");
  });

  it("mod installer installs a .fbmod and its .fbpack together without asking", async () => {
    const files = tree("a.fbmod", "a.fbpack");
    const fresh = await loadExtension(DIR);
    const { instructions } = await installerOf(fresh, "XXX-frostymod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(
      instructions.map(({ type, destination }) => [type, destination]),
      [
        ["copy", "a.fbmod"],
        ["copy", "a.fbpack"],
        ["setmodtype", undefined],
      ],
    );
    assert.deepEqual(fresh.dialogs, []);
  });

  describe("when a mod holds more mod files than there are mod extensions", () => {
    const files = tree("a.fbmod", "b.fbmod", "c.fbmod");

    it("asks which to install and installs the selected files", async () => {
      const fresh = await loadExtension(DIR);
      answerDialog(fresh, {
        action: "Install Selected",
        input: { "a.fbmod": true, "b.fbmod": false, "c.fbmod": true },
      });
      const { instructions } = await installerOf(fresh, "XXX-frostymod").install(
        files,
        "Cool Mod.installing",
      );
      assert.deepEqual(instructions, [
        copy("a.fbmod", "a.fbmod"),
        copy("c.fbmod", "c.fbmod"),
        { type: "setmodtype", value: "XXX-frostymod" },
      ]);
    });

    it("installs every file when the user chooses Install All", async () => {
      const fresh = await loadExtension(DIR);
      answerDialog(fresh, { action: "Install All_plural" });
      const { instructions } = await installerOf(fresh, "XXX-frostymod").install(
        files,
        "Cool Mod.installing",
      );
      assert.equal(instructions.length, 4);
    });

    it("cancels the install when the user cancels", async () => {
      const fresh = await loadExtension(DIR);
      answerDialog(fresh, { action: "Cancel" });
      await assert.rejects(
        installerOf(fresh, "XXX-frostymod").install(files, "Cool Mod.installing"),
        /User cancelled/,
      );
    });
  });

  it("plugin installer flattens to the dll's folder", async () => {
    const files = tree("Pack/a.dll", "Pack/b.txt", "Other/c.txt");
    const { instructions } = await installerOf(ext, "XXX-plugin").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "a.dll"), "a.dll"),
      copy(sep("Pack", "b.txt"), "b.txt"),
      { type: "setmodtype", value: "XXX-plugin" },
    ]);
  });

  it("key installer flattens to the key file's folder", async () => {
    const keyed = await loadExtension(DIR, { transform: withKey });
    const files = tree("Keys/xxx.key", "Keys/readme.txt", "Other/c.txt");
    const { instructions } = await installerOf(keyed, "XXX-key").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Keys", "xxx.key"), "xxx.key"),
      copy(sep("Keys", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-key" },
    ]);
  });

  it("fallback installer copies every file as is, retypes to root, and notifies", async () => {
    const files = tree("readme.txt", "docs/a.txt");
    const { instructions } = await installerOf(ext, "XXX-fallback").install(
      files,
      "My Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy("readme.txt", "readme.txt"),
      copy(sep("docs", "a.txt"), sep("docs", "a.txt")),
      { type: "setmodtype", value: "XXX-root" },
    ]);
    const notice = ext.notifications.find(({ id }) => id === "XXX-MyMod-fallback");
    assert.match(notice.message, /Fallback installer reached for My Mod/);
  });

  it("fallback notification ids are cut to 20 characters of the mod name", async () => {
    const fresh = await loadExtension(DIR);
    await installerOf(fresh, "XXX-fallback").install(
      tree("a.txt"),
      "A Very Long Mod Name That Goes On.installing",
    );
    assert.equal(fresh.notifications[0].id, "XXX-AVeryLongModNameThat-fallback");
  });
});

describe("template-frostbite: toggles change what is registered", () => {
  it("needsKey adds the key installer and a low-priority key mod type", async () => {
    const ext = await loadExtension(DIR, { transform: withKey });
    assert.deepEqual(summary(ext.installers), [
      ["XXX-frostymodmanager", 25],
      ["XXX-frostymod", 30],
      ["XXX-plugin", 35],
      ["XXX-key", 40],
      ["XXX-fallback", 49],
    ]);
    assert.deepEqual(summary(ext.modTypes).at(-1), ["XXX-key", 79]);
  });

  it("fallbackInstaller off drops the fallback", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("fallbackInstaller", "false") });
    assert.deepEqual(summary(ext.installers).at(-1), ["XXX-plugin", 35]);
    assert.equal(ext.installers.length, 3);
  });

  it("allowSymlinks is off by default and on when toggled, as passed to the game details", async () => {
    const off = await loadExtension(DIR);
    const on = await loadExtension(DIR, { transform: setConst("allowSymlinks", "true") });
    assert.equal(off.game.details.supportsSymlinks, false);
    assert.equal(on.game.details.supportsSymlinks, true);
  });

  it("setupNotification is on by default and off when toggled", async () => {
    const on = await loadExtension(DIR);
    answerDownloads(on);
    await on.game.setup({ path: makeGameDir() });
    const notice = on.notifications.find(({ id }) => id === "XXX-setup-notify");
    assert.equal(notice.type, "warning");
    assert.deepEqual(
      notice.actions.map(({ title }) => title),
      ["Download DatapathFix", "More"],
    );

    const off = await loadExtension(DIR, { transform: setConst("setupNotification", "false") });
    answerDownloads(off);
    await off.game.setup({ path: makeGameDir() });
    assert.equal(
      off.notifications.some(({ id }) => id === "XXX-setup-notify"),
      false,
    );
  });
});

describe("template-frostbite: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the Frosty folders inside the game folder", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-root": gameDir,
      "XXX-frostymod": sep(gameDir, MODS),
      "XXX-plugin": sep(gameDir, PLUGINS),
      "XXX-frostymodmanager": gameDir,
    });
  });

  it("targets the key folder when a key is needed", async () => {
    const keyed = await loadExtension(DIR, {
      transform: withKey,
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
    const key = keyed.modTypes.find(({ id }) => id === "XXX-key");
    assert.equal(key.getPath({ id: GAME_ID }), sep(gameDir, "FrostyModManager"));
  });

  it("only offers the mod types once the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    for (const type of undiscovered.modTypes) assert.equal(type.isSupported(GAME_ID), false);
    for (const type of ext.modTypes) assert.equal(type.isSupported(GAME_ID), true);
  });

  it("finds the game with a Steam and registry query rather than a queryPath", () => {
    assert.equal(ext.game.queryPath, undefined);
    assert.deepEqual(ext.game.queryArgs, {
      steam: [{ id: "XXX", prefer: 0 }],
      registry: [{ id: "HKEY_LOCAL_MACHINE:SOFTWARE\\WOW6432Node\\EA Games\\XXX:Install Dir" }],
    });
  });

  it("installs mods to the Frosty mods folder and requires the executable", () => {
    assert.equal(ext.game.queryModPath(), MODS);
    assert.deepEqual(ext.game.requiredFiles, ["XXX.exe"]);
    assert.equal(ext.game.executable(), "XXX.exe");
  });

  it("offers a modded launch through Frosty and the manager itself", () => {
    const [launch, manager] = ext.game.supportedTools;
    assert.equal(launch.id, "FrostyModManagerLaunch");
    assert.deepEqual(launch.parameters, ["-launch Default"]);
    assert.equal(launch.defaultPrimary, true);
    assert.equal(launch.executable(), "frostymodmanager.exe");
    assert.equal(manager.id, "XXX-frostymodmanager");
    assert.equal(ext.game.supportedTools.length, 2);
  });

  it("only the Steam build needs a launcher", async () => {
    const { requiresLauncher } = ext.game;
    assert.deepEqual(await requiresLauncher(gameDir, "steam"), { launcher: "steam" });
    for (const store of ["epic", "gog", "xbox"]) {
      assert.equal(await requiresLauncher(gameDir, store), undefined);
    }
  });
});

describe("template-frostbite: setup and Frosty download", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  it("downloads and enables Frosty, then creates the mods and plugins folders", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    assert.deepEqual(seen[0], {
      event: "start-download",
      urls: [FROSTY_URL],
      info: { game: "XXX", name: "Frosty Mod Manager" },
    });
    assert.equal(seen[1].downloadId, "download-1");
    assert.deepEqual(
      ext.dispatched.map(({ type }) => type),
      ["setModsEnabled", "setModType"],
    );
    assert.deepEqual(ext.dispatched[1].payload, ["XXX", "mod-1", "XXX-frostymodmanager"]);
    assert.ok(fs.statSync(path.join(gameDir, MODS)).isDirectory());
    assert.ok(fs.statSync(path.join(gameDir, PLUGINS)).isDirectory());
  });

  it("skips the download when Frosty is installed as a mod", async () => {
    const state = makeState({
      mods: { [GAME_ID]: { existing: { type: "XXX-frostymodmanager" } } },
    });
    const ext = await loadExtension(DIR, { state });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    assert.deepEqual(seen, []);
    assert.deepEqual(ext.dispatched, []);
  });

  it("skips the download when Frosty is already in the game folder", async () => {
    const gameDir = makeGameDir([sep("FrostyModManager", "frostymodmanager.exe")]);
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });
    assert.deepEqual(seen, []);
  });

  it("reports a failed download and opens the releases page", async () => {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
      callback(new Error("offline")),
    );
    await ext.game.setup({ path: makeGameDir() });

    assert.equal(ext.errors[0][0], "Failed to download/install Frosty Mod Manager");
    assert.deepEqual(opened, [FROSTY_RELEASES]);
    assert.deepEqual(ext.dispatched, []);
  });

  it("needsKey also downloads the key from Nexus after Frosty", async () => {
    const ext = await loadExtension(DIR, { transform: withKey });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });

    const downloads = seen.filter(({ event }) => event === "start-download");
    assert.deepEqual(downloads[1], {
      event: "start-download",
      urls: ["nxm://XXX/mods/0/files/0"],
      info: { game: "XXX", name: "Key (FMM)" },
    });
    assert.deepEqual(ext.dispatched.at(-1).payload, ["XXX", "mod-1", "XXX-key"]);
  });

  it("needsKey prefers the newest main key file listed on Nexus over the pinned file id", async () => {
    const ext = await loadExtension(DIR, { transform: withKey });
    const seen = answerDownloads(ext);
    ext.api.ext.nexusGetModFiles = async () => [
      { category_id: 1, uploaded_time: "100", file_id: 7 },
      { category_id: 1, uploaded_time: "200", file_id: 8 },
      { category_id: 2, uploaded_time: "300", file_id: 9 },
    ];
    await ext.game.setup({ path: makeGameDir() });
    const downloads = seen.filter(({ event }) => event === "start-download");
    assert.deepEqual(downloads[1].urls, ["nxm://XXX/mods/0/files/8"]);
  });

  it("needsKey skips the key download when the key file is already in place", async () => {
    const gameDir = makeGameDir([sep("FrostyModManager", "XXX.key")]);
    const ext = await loadExtension(DIR, { transform: withKey });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });
    assert.equal(seen.filter(({ event }) => event === "start-download").length, 1);
  });
});

describe("template-frostbite: DatapathFix plugin", () => {
  const downloads = sep(vortex.APP_ROOT, "downloads", "XXX");
  const pluginAt = (gameDir) => path.join(gameDir, PLUGINS, "DatapathFixPlugin.dll");

  afterEach(() => {
    delete globalThis.window;
    fs.rmSync(path.join(vortex.APP_ROOT, "downloads"), { recursive: true, force: true });
    fs.rmSync(path.join(vortex.APP_ROOT, "localAppData"), { recursive: true, force: true });
  });

  async function setUp({ installed = false } = {}) {
    const gameDir = makeGameDir([
      sep(PLUGINS, installed ? "DatapathFixPlugin.dll" : "keep.txt"),
      sep("ModData", "cache.bin"),
    ]);
    fs.mkdirSync(downloads, { recursive: true });
    fs.writeFileSync(path.join(downloads, "DatapathFixPlugin.dll"), "dll");
    const ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
    const seen = [];
    ext.api.events.on("start-download", (urls, info, _x, callback) => {
      seen.push({ urls, info });
      callback(null, "download-1");
    });
    ext.api.events.on("start-install-download", (_id, _options, callback) =>
      callback(null, "mod-1"),
    );
    const click = (title) =>
      ext.registeredActions.find((action) => action.title === title).action();
    return { gameDir, ext, seen, click };
  }

  it("the toolbar button downloads the plugin and copies it into the Plugins folder", async () => {
    const { gameDir, seen, click } = await setUp();
    click("Download DatapathFix Plugin");
    assert.ok(await waitFor(() => fs.existsSync(pluginAt(gameDir))));
    assert.deepEqual(seen, [
      { urls: [PATCH_URL], info: { game: "XXX", name: "DatapathFix Plugin" } },
    ]);
  });

  it("the toolbar button downloads again even when the plugin is installed", async () => {
    const { seen, click } = await setUp({ installed: true });
    click("Download DatapathFix Plugin");
    assert.ok(await waitFor(() => seen.length === 1));
  });

  it("the setup notice button skips the download when the plugin is installed", async () => {
    const { gameDir, ext, seen } = await setUp({ installed: true });
    await ext.game.setup({ path: gameDir });
    ext.notifications
      .find(({ id }) => id === "XXX-setup-notify")
      .actions[0].action(() => undefined);
    await settle();
    assert.deepEqual(
      seen.filter(({ urls }) => urls[0] === PATCH_URL),
      [],
    );
  });

  it("the setup notice button downloads the plugin when it is missing", async () => {
    const { gameDir, ext, seen } = await setUp();
    await ext.game.setup({ path: gameDir });
    ext.notifications
      .find(({ id }) => id === "XXX-setup-notify")
      .actions[0].action(() => undefined);
    assert.ok(await waitFor(() => seen.some(({ urls }) => urls[0] === PATCH_URL)));
  });

  it("removing the plugin deletes the file after the user confirms", async () => {
    const { gameDir, ext, click } = await setUp({ installed: true });
    answerDialog(ext, { action: "Continue" });
    click("Remove DatapathFix Plugin");
    assert.ok(await waitFor(() => !fs.existsSync(pluginAt(gameDir))));
    assert.ok(await waitFor(() => ext.notifications.some(({ id }) => id === "XXX-removepatch")));
  });

  it("removing the plugin keeps the file when the user cancels", async () => {
    const { gameDir, ext, click } = await setUp({ installed: true });
    answerDialog(ext, { action: "Cancel" });
    click("Remove DatapathFix Plugin");
    await settle();
    assert.ok(fs.existsSync(pluginAt(gameDir)));
  });

  it("enabling and disabling the plugin edits Frosty's manager_config.json", async () => {
    const { ext, click } = await setUp();
    fs.mkdirSync(path.dirname(FROSTY_CONFIG), { recursive: true });
    fs.writeFileSync(
      FROSTY_CONFIG,
      JSON.stringify({ GlobalOptions: { DatapathFixEnabled: false } }),
    );
    //the config is rewritten in place, so a read can land mid-write
    const read = () => {
      try {
        return JSON.parse(fs.readFileSync(FROSTY_CONFIG, "utf8")).GlobalOptions.DatapathFixEnabled;
      } catch {
        return undefined;
      }
    };

    click("Set DatapathFix Plugin Enabled");
    assert.ok(await waitFor(() => read() === true));
    click("Set DatapathFix Plugin Disabled");
    assert.ok(await waitFor(() => read() === false));
    assert.ok(
      await waitFor(() =>
        ext.notifications.some(
          ({ message }) => message === "Successfully Disabled DatapathFix Plugin",
        ),
      ),
    );
  });

  it("toggling reports an error instead of throwing when Frosty has no config yet", async () => {
    const { ext, click } = await setUp();
    click("Set DatapathFix Plugin Enabled");
    assert.ok(await waitFor(() => ext.errors.length === 1));
    assert.equal(ext.errors[0][0], "Failed to enable DatapathFix Plugin");
  });

  it("deleting the ModData folder removes it after the user confirms", async () => {
    const { gameDir, ext, click } = await setUp();
    answerDialog(ext, { action: "Continue" });
    click("Delete ModData Folder");
    assert.ok(await waitFor(() => !fs.existsSync(path.join(gameDir, "ModData"))));
    assert.ok(await waitFor(() => ext.notifications.some(({ id }) => id === "XXX-deletemoddata")));
  });

  it("deleting the ModData folder keeps it when the user cancels", async () => {
    const { gameDir, ext, click } = await setUp();
    answerDialog(ext, { action: "Cancel" });
    click("Delete ModData Folder");
    await settle();
    assert.ok(fs.existsSync(path.join(gameDir, "ModData")));
  });
});

describe("template-frostbite: run Frosty after a deploy", () => {
  const toolPath = path.join(makeGameDir(), "frostymodmanager.exe");

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
      ["Run Frosty", "More"],
    );
  });

  it("the Run Frosty button launches the tool Vortex discovered", async () => {
    const state = makeState({
      discovered: {
        [GAME_ID]: { path: "x", tools: { "XXX-frostymodmanager": { path: toolPath } } },
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
    assert.deepEqual(runs, [[toolPath, [], { suggestDeploy: false }]]);
    assert.equal(dismissed, true);
  });

  it("reports an error instead of throwing when Frosty is not set up", async () => {
    const ext = await loadExtension(DIR);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1", {});
    ext.notifications[0].actions[0].action(() => undefined);
    assert.equal(ext.errors[0][0], "Failed to run Frosty Mod Manager");
  });
});

describe("template-frostbite: toolbar actions", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  async function run(title, state) {
    const opened = stubShell();
    const ext = await loadExtension(DIR, { state });
    ext.registeredActions.find((action) => action.title === title).action();
    return opened;
  }

  it("opens the Documents config folder and Frosty's config file", async () => {
    assert.deepEqual(await run("Open Config Folder"), [
      sep(vortex.APP_ROOT, "documents", "XXX", "settings"),
    ]);
    assert.deepEqual(await run("Open Frosty manager_config.json"), [FROSTY_CONFIG]);
  });

  it("opens the Frosty mods folder inside the discovered game folder", async () => {
    const gameDir = makeGameDir();
    const state = makeState({ discovered: { [GAME_ID]: { path: gameDir } } });
    assert.deepEqual(await run("Open Frosty Mods Folder", state), [sep(gameDir, MODS)]);
  });

  it("opens the SteamDB page and the bug tracker", async () => {
    assert.deepEqual(await run("Open SteamDB Page"), ["https://steamdb.info/app/XXX/"]);
    assert.deepEqual(await run("Submit Bug Report"), ["XXX?tab=bugs"]);
  });
});
