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

const DIR = templateDir("template-cobraengineACSE");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const OVLDATA = sep("Win64", "ovldata");
const SAVED_GAMES = sep(vortex.APP_ROOT, "home", "Saved Games", "Frontier Developments", "XXX");

// Setup creates the save folder under the fake home, and the next load scans that folder for a
// user id, so each test starts from a clean home.
afterEach(() => {
  fs.rmSync(path.join(vortex.APP_ROOT, "home"), { recursive: true, force: true });
});

describe("template-cobraengineACSE: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers seven mod types in spec order", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-acse", 25],
      ["XXX-root", 26],
      ["XXX-acsemod", 27],
      ["XXX-ovldata", 28],
      ["XXX-localised", 29],
      ["XXX-movies", 30],
      ["XXX-save", 31],
    ]);
  });

  // The ACSE mod installer sits at 28 (between root and localised) and the save installer
  // shares priority 49 with the fallback. Both are reviewed oddities in the contract allowlist.
  it("registers the installers, with the save installer tied to the fallback at 49", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-acse", 25],
      ["XXX-root", 27],
      ["XXX-acsemod", 28],
      ["XXX-localised", 29],
      ["XXX-movies", 31],
      ["XXX-ovldata", 33],
      ["XXX-save", 49],
      ["XXX-fallback", 49],
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
        "Open Downloads Folder",
        "Submit Bug Report",
      ],
    );
  });
});

describe("template-cobraengineACSE: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const matrix = [
    ["the ACSE folder", tree("ACSE/a.dll"), ["XXX-acse", "XXX-fallback"]],
    [
      "a Win64 folder holding ACSE and ovldata (root wins on priority)",
      tree("Win64/ovldata/ACSE/a.dll"),
      ["XXX-acse", "XXX-root", "XXX-ovldata", "XXX-fallback"],
    ],
    ["a root folder", tree("Blueprints/a.bin"), ["XXX-root", "XXX-fallback"]],
    ["a root folder nested in a wrapper", tree("Mod/Parks/a.bin"), ["XXX-root", "XXX-fallback"]],
    ["an ACSE mod (Main.ovl)", tree("MyMod/Main.ovl"), ["XXX-acsemod", "XXX-fallback"]],
    [
      "an ACSE mod with Main.ovl in another case",
      tree("main.OVL"),
      ["XXX-acsemod", "XXX-fallback"],
    ],
    ["an ovldata folder", tree("ovldata/a.ovl"), ["XXX-ovldata", "XXX-fallback"]],
    ["a localised folder", tree("localised/en.txt"), ["XXX-localised", "XXX-fallback"]],
    ["a loose .webm movie", tree("clip.webm"), ["XXX-movies", "XXX-fallback"]],
    [
      "a .webm inside a Movies folder (root wins on priority)",
      tree("Movies/clip.webm"),
      ["XXX-root", "XXX-movies", "XXX-fallback"],
    ],
    ["a .prk2 save file", tree("Park.prk2"), ["XXX-save", "XXX-fallback"]],
    ["a .blpr2 save file", tree("slot.blpr2"), ["XXX-save", "XXX-fallback"]],
    ["loose files with no known marker", tree("readme.txt"), ["XXX-fallback"]],
    ["a FOMOD package with a root folder", tree("fomod/ModuleConfig.xml", "Parks/a.bin"), []],
    ["a FOMOD package with a save file", tree("fomod/ModuleConfig.xml", "a.prk2"), []],
    ["a FOMOD package with a movie", tree("fomod/ModuleConfig.xml", "a.webm"), []],
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

describe("template-cobraengineACSE: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("ACSE installer keeps the ACSE folder and drops the wrapper and folder entries", async () => {
    const files = tree("Pack/ACSE/a.dll", "Pack/ACSE/sub/b.txt", "Pack/readme.txt");
    const { instructions } = await installerOf(ext, "XXX-acse").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "ACSE", "a.dll"), sep("ACSE", "a.dll")),
      copy(sep("Pack", "ACSE", "sub", "b.txt"), sep("ACSE", "sub", "b.txt")),
      copy(sep("Pack", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-acse" },
    ]);
  });

  it("root installer keeps every root folder found beside the first one", async () => {
    const files = tree("Pack/Win64/a.dll", "Pack/Parks/p.bin", "Other/x.txt");
    const { instructions } = await installerOf(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "Win64", "a.dll"), sep("Win64", "a.dll")),
      copy(sep("Pack", "Parks", "p.bin"), sep("Parks", "p.bin")),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("ACSE mod installer wraps a mod with files at the top in a folder named after the archive", async () => {
    const files = tree("Main.ovl", "data.bin");
    const { instructions } = await installerOf(ext, "XXX-acsemod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy("Main.ovl", sep("CoolMod", "Main.ovl")),
      copy("data.bin", sep("CoolMod", "data.bin")),
      { type: "setmodtype", value: "XXX-acsemod" },
    ]);
  });

  it("ACSE mod installer keeps the mod's own folder, and the files beside it", async () => {
    const files = tree("MyMod/Main.ovl", "MyMod/a.bin", "Other/x.txt");
    const { instructions } = await installerOf(ext, "XXX-acsemod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("MyMod", "Main.ovl"), sep("MyMod", "Main.ovl")),
      copy(sep("MyMod", "a.bin"), sep("MyMod", "a.bin")),
      copy(sep("Other", "x.txt"), sep("Other", "x.txt")),
      { type: "setmodtype", value: "XXX-acsemod" },
    ]);
  });

  it("ACSE mod installer strips a wrapper folder above the mod's own folder", async () => {
    const files = tree("Wrap/MyMod/Main.ovl", "Wrap/MyMod/a.bin", "Wrap/Extra/b.bin", "Out/c.txt");
    const { instructions } = await installerOf(ext, "XXX-acsemod").install(
      files,
      "Cool Mod.installing",
    );
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "MyMod", "Main.ovl"), sep("MyMod", "Main.ovl")),
      copy(sep("Wrap", "MyMod", "a.bin"), sep("MyMod", "a.bin")),
      copy(sep("Wrap", "Extra", "b.bin"), sep("Extra", "b.bin")),
      { type: "setmodtype", value: "XXX-acsemod" },
    ]);
  });

  it("localised installer keeps the localised folder", async () => {
    const files = tree("Pack/localised/en/a.txt");
    const { instructions } = await installerOf(ext, "XXX-localised").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "localised", "en", "a.txt"), sep("localised", "en", "a.txt")),
      { type: "setmodtype", value: "XXX-localised" },
    ]);
  });

  it("ovldata installer keeps the ovldata folder", async () => {
    const files = tree("Pack/ovldata/x.ovl");
    const { instructions } = await installerOf(ext, "XXX-ovldata").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "ovldata", "x.ovl"), sep("ovldata", "x.ovl")),
      { type: "setmodtype", value: "XXX-ovldata" },
    ]);
  });

  it("movies installer flattens to the movie's folder", async () => {
    const files = tree("Vids/a.webm", "Vids/b.webm", "Vids/readme.txt", "Other/c.txt");
    const { instructions } = await installerOf(ext, "XXX-movies").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Vids", "a.webm"), "a.webm"),
      copy(sep("Vids", "b.webm"), "b.webm"),
      copy(sep("Vids", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-movies" },
    ]);
  });

  it("save installer flattens to the save file's folder", async () => {
    const files = tree("Slots/a.prk2", "Slots/b.blpr2", "Other/c.txt");
    const { instructions } = await installerOf(ext, "XXX-save").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Slots", "a.prk2"), "a.prk2"),
      copy(sep("Slots", "b.blpr2"), "b.blpr2"),
      { type: "setmodtype", value: "XXX-save" },
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

describe("template-cobraengineACSE: toggles change what is registered", () => {
  it("fallbackInstaller off drops the fallback", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("fallbackInstaller", "false") });
    assert.equal(ext.installers.length, 7);
    assert.deepEqual(summary(ext.installers).at(-1), ["XXX-save", 49]);
  });

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
    const notice = ext.notifications.find(({ id }) => id === "XXX-setup-notify");
    assert.equal(notice.type, "warning");
  });

  it("an Xbox id outside the discovery ids turns the Xbox logic off", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("XBOXAPP_ID", '"other"') });
    assert.equal(ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])), "XXX.exe");
    assert.equal(await ext.game.requiresLauncher(makeGameDir(), "xbox"), undefined);
  });
});

describe("template-cobraengineACSE: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets Win64/ovldata for ACSE and its mods, and the saves outside the game folder", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-acse": sep(gameDir, OVLDATA),
      "XXX-root": gameDir,
      "XXX-acsemod": sep(gameDir, OVLDATA),
      "XXX-ovldata": sep(gameDir, "Win64"),
      "XXX-localised": sep(gameDir, OVLDATA, "ACSE"),
      "XXX-movies": sep(gameDir, "Movies"),
      "XXX-save": sep(SAVED_GAMES, "Saves"),
    });
  });

  it("only offers the mod types once the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    for (const type of undiscovered.modTypes) assert.equal(type.isSupported(GAME_ID), false);
    for (const type of ext.modTypes) assert.equal(type.isSupported(GAME_ID), true);
  });

  it("installs mods to Win64/ovldata and requires the executable", () => {
    assert.equal(ext.game.queryModPath(), OVLDATA);
    assert.deepEqual(ext.game.requiredFiles, ["XXX.exe"]);
  });

  it("offers a custom launch tool run through the shell", () => {
    const [tool, ...rest] = ext.game.supportedTools;
    assert.equal(rest.length, 0);
    assert.equal(tool.id, "XXX-customlaunch");
    assert.equal(tool.executable(), "XXX.exe");
    assert.equal(tool.shell, true);
  });

  it("launches the base executable, or the Xbox launcher when its marker file exists", () => {
    assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
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
});

describe("template-cobraengineACSE: setup and ACSE download", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  it("downloads and enables ACSE, then creates the game and save folders", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: gameDir });

    assert.deepEqual(seen[0], {
      event: "start-download",
      urls: ["nxm://XXX/mods/1/files/1"],
      info: { game: "XXX", name: "ACSE (Script Extender)" },
    });
    assert.equal(seen[1].downloadId, "download-1");
    assert.deepEqual(
      ext.dispatched.map(({ type }) => type),
      ["setModsEnabled", "setModType"],
    );
    assert.deepEqual(ext.dispatched[1].payload, ["XXX", "mod-1", "XXX-acse"]);
    for (const folder of [OVLDATA, sep(OVLDATA, "ACSE"), "Movies"]) {
      assert.ok(fs.statSync(path.join(gameDir, folder)).isDirectory(), folder);
    }
    assert.ok(fs.statSync(path.join(SAVED_GAMES, "Saves")).isDirectory());
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
    assert.deepEqual(seen[0].urls, ["nxm://XXX/mods/1/files/8"]);
  });

  it("skips the download when ACSE is already installed", async () => {
    const state = makeState({ mods: { [GAME_ID]: { existing: { type: "XXX-acse" } } } });
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

    assert.equal(ext.errors[0][0], "Failed to download/install ACSE (Script Extender)");
    assert.deepEqual(opened, ["https://www.nexusmods.com/XXX/mods/1/files/?tab=files"]);
    assert.deepEqual(ext.dispatched, []);
  });
});

describe("template-cobraengineACSE: toolbar actions", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  async function run(title) {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    ext.registeredActions.find((action) => action.title === title).action();
    return opened;
  }

  it("opens the Saved Games save and config folders", async () => {
    assert.deepEqual(await run("Open Save Folder"), [sep(SAVED_GAMES, "Saves")]);
    assert.deepEqual(await run("Open Config Folder"), [sep(SAVED_GAMES, "Config")]);
  });

  it("opens the user id subfolder when one exists", async () => {
    const userDir = path.join(SAVED_GAMES, "76561");
    fs.mkdirSync(userDir, { recursive: true });
    assert.deepEqual(await run("Open Save Folder"), [sep(userDir, "Saves")]);
    assert.deepEqual(await run("Open Config Folder"), [sep(userDir, "Config")]);
  });

  // Setup creates <Saved Games>/XXX/Saves when no user id folder exists yet. The next load scans
  // that folder, takes "Saves" for a user id, and points save and config at Saves/Saves and
  // Saves/Config. Pinned so that fixing the template turns this red and the entry gets removed.
  it("known gap: a Saves folder made by setup is mistaken for a user id folder on the next load", async () => {
    const first = await loadExtension(DIR);
    answerDownloads(first);
    await first.game.setup({ path: makeGameDir() });

    assert.deepEqual(await run("Open Save Folder"), [sep(SAVED_GAMES, "Saves", "Saves")]);
  });

  it("opens the Nexus Mods and SteamDB pages and the bug tracker", async () => {
    assert.deepEqual(await run("Open Nexus Mods Page"), ["https://www.nexusmods.com/XXX/mods"]);
    assert.deepEqual(await run("Open SteamDB Page"), ["https://steamdb.info/app/XXX/"]);
    assert.deepEqual(await run("Submit Bug Report"), ["XXX?tab=bugs"]);
  });
});
