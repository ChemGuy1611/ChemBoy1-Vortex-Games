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
const { all, setConst } = require("../harness/transforms");

const DIR = templateDir("template-tfcinstaller-ue2-3");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const BINARIES = sep("Binaries", "Win32");
const EXEC = sep(BINARIES, "XXX.exe");
const DATA_DIR = sep(vortex.APP_ROOT, "documents", "My Games", "XXX", "XXX");

describe("template-tfcinstaller-ue2-3: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the five mod folders, then the TFC Installer and UPK Explorer last", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-tfcmod", 25],
      ["XXX-root", 26],
      ["XXX-cookedsub", 27],
      ["XXX-binaries", 28],
      ["XXX-movies", 29],
      ["XXX-tfcinstaller", 80],
      ["XXX-tfcexplorer", 81],
    ]);
  });

  it("registers the tool installers first, then mods, root, cooked, movies, binaries, fallback", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-tfcinstaller", 25],
      ["XXX-tfcexplorer", 27],
      ["XXX-tfcmod", 29],
      ["XXX-root", 31],
      ["XXX-cookedsub", 33],
      ["XXX-movies", 35],
      ["XXX-binaries", 37],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the seven toolbar actions", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Open Config Folder",
        "Open Save Folder",
        "Open PCGamingWiki Page",
        "Open SteamDB Page",
        "View Changelog",
        "Open Downloads Folder",
        "Submit Bug Report",
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

describe("template-tfcinstaller-ue2-3: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const matrix = [
    [
      "the TFC Installer (its .exe also matches the binaries installer)",
      tree("TFCInstaller/tfcinstaller.exe"),
      ["XXX-tfcinstaller", "XXX-binaries", "XXX-fallback"],
    ],
    [
      "UPK Explorer (its .exe also matches the binaries installer)",
      tree("Explorer/UPK Explorer.exe"),
      ["XXX-tfcexplorer", "XXX-binaries", "XXX-fallback"],
    ],
    [
      "a TFC mod by its gameprofile.xml",
      tree("MyMod/GameProfile.xml"),
      ["XXX-tfcmod", "XXX-fallback"],
    ],
    [
      "a TFC mod by a .packagepatch file",
      tree("patch.packagepatch"),
      ["XXX-tfcmod", "XXX-fallback"],
    ],
    [
      "a TFC mod by its texturepack folder",
      tree("texturepack/a.dds"),
      ["XXX-tfcmod", "XXX-fallback"],
    ],
    ["a root folder", tree("Engine/a.bin"), ["XXX-root", "XXX-fallback"]],
    ["a root subfolder", tree("Mod/Config/a.ini"), ["XXX-root", "XXX-fallback"]],
    ["a .upk package", tree("a.upk"), ["XXX-cookedsub", "XXX-fallback"]],
    ["a cooked Maps folder", tree("Maps/a.bin"), ["XXX-cookedsub", "XXX-fallback"]],
    ["a cooked Packages folder", tree("Packages/a.bin"), ["XXX-cookedsub", "XXX-fallback"]],
    ["a .bik movie", tree("a.bik"), ["XXX-movies", "XXX-fallback"]],
    [
      "a .bik inside a Movies folder (root wins on priority)",
      tree("Movies/a.bik"),
      ["XXX-root", "XXX-movies", "XXX-fallback"],
    ],
    ["a loose DLL", tree("a.dll"), ["XXX-binaries", "XXX-fallback"]],
    ["a loose .asi plugin", tree("a.asi"), ["XXX-binaries", "XXX-fallback"]],
    ["a loose .addon64 plugin", tree("a.addon64"), ["XXX-binaries", "XXX-fallback"]],
    [
      "a DLL inside a Binaries folder (root wins on priority)",
      tree("Binaries/Win32/a.dll"),
      ["XXX-root", "XXX-binaries", "XXX-fallback"],
    ],
    ["loose files with no known marker", tree("readme.txt"), ["XXX-fallback"]],
    [
      "a FOMOD package with the TFC Installer",
      tree("fomod/ModuleConfig.xml", "tfcinstaller.exe"),
      [],
    ],
    ["a FOMOD package with a TFC mod", tree("fomod/ModuleConfig.xml", "gameprofile.xml"), []],
    ["a FOMOD package with a root folder", tree("fomod/ModuleConfig.xml", "Engine/a.bin"), []],
    ["a FOMOD package with a package", tree("fomod/ModuleConfig.xml", "a.upk"), []],
    ["a FOMOD package with a movie", tree("fomod/ModuleConfig.xml", "a.bik"), []],
    ["a FOMOD package with a DLL", tree("fomod/ModuleConfig.xml", "a.dll"), []],
  ];

  for (const [label, files, expected] of matrix) {
    it(`routes ${label}`, async () => {
      assert.deepEqual(await supportedBy(ext, files), expected);
    });
  }

  it("keeps .tfc files out of the TFC mod extensions", async () => {
    assert.deepEqual(await supportedBy(ext, tree("texture.tfc")), ["XXX-fallback"]);
  });

  it("ignores mods for another game, whichever installer would match", async () => {
    for (const [label, files] of matrix) {
      assert.deepEqual(await supportedBy(ext, files, "someothergame"), [], label);
    }
  });
});

describe("template-tfcinstaller-ue2-3: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("TFC Installer installer places the tool under the TFCInstaller folder", async () => {
    const files = tree("Pkg/tfcinstaller.exe", "Pkg/lib/a.dll", "readme.txt");
    const { instructions } = await installerOf(ext, "XXX-tfcinstaller").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pkg", "tfcinstaller.exe"), sep("TFCInstaller", "tfcinstaller.exe")),
      copy(sep("Pkg", "lib", "a.dll"), sep("TFCInstaller", "lib", "a.dll")),
      { type: "setmodtype", value: "XXX-tfcinstaller" },
    ]);
  });

  it("UPK Explorer installer places the tool under the UPK Explorer folder", async () => {
    const files = tree("upk explorer.exe", "data/a.bin");
    const { instructions } = await installerOf(ext, "XXX-tfcexplorer").install(files);
    assert.deepEqual(instructions, [
      copy("upk explorer.exe", sep("UPK Explorer", "upk explorer.exe")),
      copy(sep("data", "a.bin"), sep("UPK Explorer", "data", "a.bin")),
      { type: "setmodtype", value: "XXX-tfcexplorer" },
    ]);
  });

  it("TFC mod installer wraps a mod with files at the top in a folder named after the archive", async () => {
    const files = tree("gameprofile.xml", "a.bin");
    const { instructions } = await installerOf(ext, "XXX-tfcmod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy("gameprofile.xml", sep("CoolMod", "gameprofile.xml")),
      copy("a.bin", sep("CoolMod", "a.bin")),
      { type: "setmodtype", value: "XXX-tfcmod" },
    ]);
  });

  it("TFC mod installer keeps the mod's own folder, and the files beside it", async () => {
    const files = tree("MyMod/gameprofile.xml", "MyMod/a.bin", "Other/x.txt");
    const { instructions } = await installerOf(ext, "XXX-tfcmod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("MyMod", "gameprofile.xml"), sep("MyMod", "gameprofile.xml")),
      copy(sep("MyMod", "a.bin"), sep("MyMod", "a.bin")),
      copy(sep("Other", "x.txt"), sep("Other", "x.txt")),
      { type: "setmodtype", value: "XXX-tfcmod" },
    ]);
  });

  it("TFC mod installer strips a wrapper folder above the mod's own folder", async () => {
    const files = tree("Wrap/MyMod/gameprofile.xml", "Wrap/MyMod/a.bin", "Wrap/Extra/b.bin");
    const { instructions } = await installerOf(ext, "XXX-tfcmod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "MyMod", "gameprofile.xml"), sep("MyMod", "gameprofile.xml")),
      copy(sep("Wrap", "MyMod", "a.bin"), sep("MyMod", "a.bin")),
      copy(sep("Wrap", "Extra", "b.bin"), sep("Extra", "b.bin")),
      { type: "setmodtype", value: "XXX-tfcmod" },
    ]);
  });

  it("TFC mod installer finds a mod by its extension when no marker file is present", async () => {
    const files = tree("Mod/patch.packagepatch", "Mod/a.bin");
    const { instructions } = await installerOf(ext, "XXX-tfcmod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("Mod", "patch.packagepatch"), sep("Mod", "patch.packagepatch")),
      copy(sep("Mod", "a.bin"), sep("Mod", "a.bin")),
      { type: "setmodtype", value: "XXX-tfcmod" },
    ]);
  });

  describe("special TFC mod folders", () => {
    const files = tree(
      "Wrap/Special/Inner/gameprofile.xml",
      "Wrap/Special/Inner/a.bin",
      "Wrap/Special/c.bin",
    );

    it("a listed folder keeps the whole nested structure below it", async () => {
      const special = await loadExtension(DIR, {
        transform: setConst("SPECIAL_TFCMOD_FOLDERS", '["Special"]'),
      });
      const { instructions } = await installerOf(special, "XXX-tfcmod").install(
        files,
        "Cool Mod.installing",
      );
      assert.deepEqual(instructions, [
        copy(
          sep("Wrap", "Special", "Inner", "gameprofile.xml"),
          sep("Special", "Inner", "gameprofile.xml"),
        ),
        copy(sep("Wrap", "Special", "Inner", "a.bin"), sep("Special", "Inner", "a.bin")),
        copy(sep("Wrap", "Special", "c.bin"), sep("Special", "c.bin")),
        { type: "setmodtype", value: "XXX-tfcmod" },
      ]);
    });

    it("an unlisted folder is stripped back to the folder holding the marker file", async () => {
      const { instructions } = await installerOf(ext, "XXX-tfcmod").install(
        files,
        "Cool Mod.installing",
      );
      assert.deepEqual(instructions, [
        copy(sep("Wrap", "Special", "Inner", "gameprofile.xml"), sep("Inner", "gameprofile.xml")),
        copy(sep("Wrap", "Special", "Inner", "a.bin"), sep("Inner", "a.bin")),
        copy(sep("Wrap", "Special", "c.bin"), "c.bin"),
        { type: "setmodtype", value: "XXX-tfcmod" },
      ]);
    });
  });

  it("root installer keeps a root folder at the top of the destination", async () => {
    const files = tree("Pack/Engine/a.bin", "Pack/Engine/sub/b.bin", "Pack/readme.txt");
    const { instructions } = await installerOf(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "Engine", "a.bin"), sep("Engine", "a.bin")),
      copy(sep("Pack", "Engine", "sub", "b.bin"), sep("Engine", "sub", "b.bin")),
      copy(sep("Pack", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer puts a root subfolder under the game's code-name folder", async () => {
    const files = tree("Pack/Config/a.ini");
    const { instructions } = await installerOf(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "Config", "a.ini"), sep("XXX", "Config", "a.ini")),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer puts a DLC folder under the code-name folder's DLC folder", async () => {
    const dlc = await loadExtension(DIR, {
      transform: setConst("DLCSUB_FOLDERS", '["Pack1"]'),
    });
    const files = tree("Pack/Pack1/a.bin");
    assert.deepEqual(await supportedBy(dlc, files), ["XXX-root", "XXX-fallback"]);
    const { instructions } = await installerOf(dlc, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "Pack1", "a.bin"), sep("XXX", "DLC", "Pack1", "a.bin")),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("cooked subfolder installer keeps the Maps or Packages folder", async () => {
    const files = tree("Pack/Maps/a.bin", "Pack/Maps/sub/b.bin");
    const { instructions } = await installerOf(ext, "XXX-cookedsub").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "Maps", "a.bin"), sep("Maps", "a.bin")),
      copy(sep("Pack", "Maps", "sub", "b.bin"), sep("Maps", "sub", "b.bin")),
      { type: "setmodtype", value: "XXX-cookedsub" },
    ]);
  });

  // The cooked subfolder installer reads modFile.indexOf before its fall-back to .upk files, so
  // a package with no Maps or Packages folder passes the test and then throws. Pinned so that
  // fixing the template turns this red and the entry gets removed.
  it("known gap: cooked subfolder installer throws on a lone .upk package", async () => {
    const files = tree("Mod/a.upk");
    assert.equal(
      (await installerOf(ext, "XXX-cookedsub").testSupported(files, GAME_ID)).supported,
      true,
    );
    assert.throws(() => installerOf(ext, "XXX-cookedsub").install(files), TypeError);
  });

  it("movies installer flattens to the movie's folder", async () => {
    const files = tree("Vids/a.bik", "Vids/b.bik", "Vids/readme.txt", "Other/c.txt");
    const { instructions } = await installerOf(ext, "XXX-movies").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Vids", "a.bik"), "a.bik"),
      copy(sep("Vids", "b.bik"), "b.bik"),
      copy(sep("Vids", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-movies" },
    ]);
  });

  it("binaries installer flattens to the game exe's folder when one is present", async () => {
    const files = tree("Aux/helper.dll", "Pack/XXX.exe", "Pack/x.dll");
    const { instructions } = await installerOf(ext, "XXX-binaries").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "XXX.exe"), "XXX.exe"),
      copy(sep("Pack", "x.dll"), "x.dll"),
      { type: "setmodtype", value: "XXX-binaries" },
    ]);
  });

  it("binaries installer falls back to the first binary by extension", async () => {
    const files = tree("Bin/a.dll", "Bin/b.asi", "Other/c.txt");
    const { instructions } = await installerOf(ext, "XXX-binaries").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Bin", "a.dll"), "a.dll"),
      copy(sep("Bin", "b.asi"), "b.asi"),
      { type: "setmodtype", value: "XXX-binaries" },
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

describe("template-tfcinstaller-ue2-3: toggles change what is registered", () => {
  it("fallbackInstaller off drops the fallback", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("fallbackInstaller", "false") });
    assert.equal(ext.installers.length, 7);
    assert.deepEqual(summary(ext.installers).at(-1), ["XXX-binaries", 37]);
  });

  it("allowSymlinks is on by default and off when toggled, as passed to the game details", async () => {
    const on = await loadExtension(DIR);
    const off = await loadExtension(DIR, { transform: setConst("allowSymlinks", "false") });
    assert.equal(on.game.details.supportsSymlinks, true);
    assert.equal(off.game.details.supportsSymlinks, false);
  });

  it("setupNotification on shows the TFC Installer setup notice during setup", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("setupNotification", "true") });
    answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    const notice = ext.notifications.find(({ id }) => id === "XXX-setup");
    assert.equal(notice.type, "warning");
    assert.equal(notice.message, "TFC Installer Setup Required");
  });

  it("an Xbox id outside the discovery ids turns the Xbox logic off", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("XBOXAPP_ID", '"other"') });
    assert.equal(ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])), EXEC);
    assert.equal(await ext.game.requiresLauncher(makeGameDir(), "xbox"), undefined);
  });

  it("has64Bit on launches the 64-bit executable when it exists", async () => {
    const ext = await loadExtension(DIR, {
      transform: all(setConst("has64Bit", "true"), setConst("EXEC_NAME_64", '"XXX64.exe"')),
    });
    assert.equal(
      ext.game.executable(makeGameDir([sep(BINARIES, "XXX64.exe")])),
      sep(BINARIES, "XXX64.exe"),
    );
    assert.equal(ext.game.executable(makeGameDir()), EXEC);
  });

  it("BITS moves the binaries folder and the executable to Win64", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR, {
      transform: setConst("BITS", '"64"'),
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
    const binaries = ext.modTypes.find(({ id }) => id === "XXX-binaries");
    assert.equal(binaries.getPath({ id: GAME_ID }), sep(gameDir, "Binaries", "Win64"));
    assert.equal(ext.game.executable(makeGameDir()), sep("Binaries", "Win64", "XXX.exe"));
  });
});

describe("template-tfcinstaller-ue2-3: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the TFC mods folder, the game folders and the binaries folder", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-tfcmod": sep(gameDir, "TFCInstaller", "Mods"),
      "XXX-root": gameDir,
      "XXX-cookedsub": sep(gameDir, "XXX", "CookedPC"),
      "XXX-binaries": sep(gameDir, BINARIES),
      "XXX-movies": sep(gameDir, "XXX", "Movies"),
      "XXX-tfcinstaller": gameDir,
      "XXX-tfcexplorer": gameDir,
    });
  });

  it("only offers the mod types once the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    for (const type of undiscovered.modTypes) assert.equal(type.isSupported(GAME_ID), false);
    for (const type of ext.modTypes) assert.equal(type.isSupported(GAME_ID), true);
  });

  it("mods install to the game folder, which is recognised by the code-name folder", () => {
    assert.equal(ext.game.queryModPath(), ".");
    assert.deepEqual(ext.game.requiredFiles, ["XXX"]);
  });

  it("offers the custom launch, the TFC Installer and UPK Explorer tools", () => {
    const [launch, tfc, upk] = ext.game.supportedTools;
    assert.deepEqual(
      [launch.id, tfc.id, upk.id],
      ["XXX-customlaunch", "XXX-tfcinstaller", "XXX-tfcexplorer"],
    );
    assert.equal(launch.executable(), EXEC);
    assert.equal(launch.shell, true);
    assert.equal(tfc.executable(), "tfcinstaller.exe");
    assert.equal(upk.executable(), "upk explorer.exe");
  });

  it("launches the base executable, or the Xbox launcher when its marker file exists", () => {
    assert.equal(ext.game.executable(makeGameDir()), EXEC);
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

  it("reads the version from the executable", async () => {
    assert.equal(await ext.game.getGameVersion(makeGameDir([EXEC])), STUB_EXE_VERSION);
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

describe("template-tfcinstaller-ue2-3: setup and TFC Installer download", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  it("downloads and enables the TFC Installer, then creates the mod folders and placeholder file", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    assert.deepEqual(seen[0], {
      event: "start-download",
      urls: ["nxm://site/mods/588/files/8075"],
      info: { game: "site", name: "TFC Installer" },
    });
    assert.equal(seen[1].downloadId, "download-1");
    assert.deepEqual(
      ext.dispatched.map(({ type }) => type),
      ["setModsEnabled", "setModType"],
    );
    assert.deepEqual(ext.dispatched[1].payload, ["XXX", "mod-1", "XXX-tfcinstaller"]);
    for (const folder of [
      sep("TFCInstaller", "Mods"),
      BINARIES,
      sep("XXX", "Movies"),
      sep("XXX", "CookedPC"),
    ]) {
      assert.ok(fs.statSync(path.join(gameDir, folder)).isDirectory(), folder);
    }
    assert.ok(
      fs.statSync(path.join(gameDir, "TFCInstaller", "Mods", "TFC_Mods_Go_Here.txt")).isFile(),
    );
  });

  it("prefers the newest main file listed on Nexus over the pinned file id", async () => {
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    ext.api.ext.nexusGetModFiles = async () => [
      { category_id: 1, uploaded_time: "100", file_id: 7 },
      { category_id: 1, uploaded_time: "200", file_id: 8 },
      { category_id: 2, uploaded_time: "300", file_id: 9 },
    ];
    await ext.game.setup({ path: makeGameDir() });
    assert.deepEqual(seen[0].urls, ["nxm://site/mods/588/files/8"]);
  });

  it("skips the download when the TFC Installer is already installed", async () => {
    const state = makeState({ mods: { [GAME_ID]: { existing: { type: "XXX-tfcinstaller" } } } });
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

    assert.equal(ext.errors[0][0], "Failed to download/install TFC Installer");
    assert.deepEqual(opened, ["https://www.nexusmods.com/site/mods/588/files/?tab=files"]);
    assert.deepEqual(ext.dispatched, []);
  });
});

describe("template-tfcinstaller-ue2-3: run the TFC Installer after a deploy", () => {
  const toolPath = path.join(makeGameDir(), "tfcinstaller.exe");

  function didDeploy(ext) {
    return ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1];
  }

  it("shows the notice only for the last active profile", async () => {
    const ext = await loadExtension(DIR);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-2");
    assert.deepEqual(ext.notifications, []);

    await didDeploy(ext)("profile-1");
    const [notice] = ext.notifications;
    assert.equal(notice.id, "XXX-deploy");
    assert.equal(notice.type, "warning");
    assert.deepEqual(
      notice.actions.map(({ title }) => title),
      ["Run TFC", "More"],
    );
  });

  it("the Run TFC button launches the tool Vortex discovered", async () => {
    const state = makeState({
      discovered: { [GAME_ID]: { path: "x", tools: { "XXX-tfcinstaller": { path: toolPath } } } },
    });
    const ext = await loadExtension(DIR, { state });
    const runs = [];
    ext.api.runExecutable = (...args) => {
      runs.push(args);
      return Promise.resolve();
    };
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1");

    let dismissed = false;
    ext.notifications[0].actions[0].action(() => (dismissed = true));
    assert.deepEqual(runs, [[toolPath, [], { suggestDeploy: false }]]);
    assert.equal(dismissed, true);
  });

  it("reports an error instead of throwing when the tool is not set up", async () => {
    const ext = await loadExtension(DIR);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1");
    ext.notifications[0].actions[0].action(() => undefined);
    assert.equal(ext.errors[0][0], "Failed to run TFC Installer");
  });
});

describe("template-tfcinstaller-ue2-3: toolbar actions", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  async function run(title) {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    ext.registeredActions.find((action) => action.title === title).action();
    return opened;
  }

  it("opens the Documents config and save folders", async () => {
    assert.deepEqual(await run("Open Config Folder"), [sep(DATA_DIR, "Config")]);
    assert.deepEqual(await run("Open Save Folder"), [sep(DATA_DIR, "SaveData")]);
  });

  it("opens the SteamDB page and the bug tracker", async () => {
    assert.deepEqual(await run("Open SteamDB Page"), ["https://steamdb.info/app/XXX/"]);
    assert.deepEqual(await run("Submit Bug Report"), ["XXX?tab=bugs"]);
  });
});
