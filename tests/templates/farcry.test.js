"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, describe, it } = require("node:test");
const { makeState } = require("../harness/fake-context");
const { makeGameDir, makeTempDir, tree } = require("../harness/fixtures");
const {
  answerDownloads,
  idsOf,
  installerOf,
  reply,
  stubShell,
  summary,
  supportedBy,
  waitFor,
  withFetch,
  withWinapi,
} = require("../harness/helpers");
const { loadExtension, templateDir, vortex } = require("../harness/load-extension");
const { all, setConst } = require("../harness/transforms");

const DIR = templateDir("template-farcry");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const MIMOD_DIR = sep("FCModInstaller", "ModifiedFilesFCXXX");
const MY_GAMES = sep(vortex.APP_ROOT, "documents", "My Games", "Far Cry XXX");
const FILES_URL = "https://downloads.fcmodding.com/files/FCModInstaller.zip";
const BUILD_URL = "https://downloads.fcmodding.com/version/FCModInstaller_20250412-1300.zip";
const MI_PAGE = "https://downloads.fcmodding.com/all/mod-installer/";

// The fcmodding.com host: the stable alias redirects to the versioned archive, the landing
// page answers with a bare build stamp.
const host =
  ({ url = BUILD_URL, status = 200, page, pageStatus = 200 } = {}) =>
  (requested) => {
    if (requested === FILES_URL) return reply({ status, url });
    if (requested === MI_PAGE && page !== undefined) {
      return reply({ status: pageStatus, body: page });
    }
    return reply({ status: 404 });
  };
const unreachable = () => {
  throw new Error("offline");
};

// State with one copy of the installer mod per given build stamp (undefined = an untracked copy).
const installed = (...versions) =>
  makeState({
    mods: {
      [GAME_ID]: Object.fromEntries(
        versions.map((version, index) => [
          `mi${index}`,
          {
            type: "XXX-modinstaller",
            attributes: version === undefined ? {} : { fcmoddingVersion: version },
          },
        ]),
      ),
    },
  });

const GLOBS = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];

afterEach(() => {
  delete globalThis.window;
  fs.rmSync(path.join(vortex.APP_ROOT, "documents"), { recursive: true, force: true });
});

describe("template-farcry: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the root, binaries, data, installer, mod, repacked mod and xml mod types", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-root", 25],
      ["XXX-binaries", 26],
      ["XXX-data", 27],
      ["XXX-modinstaller", 28],
      ["XXX-mimod", 29],
      ["XXX-mimoda3", 30],
      ["XXX-xml", 31],
    ]);
  });

  it("registers the installers in order with the fallback last", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-modinstaller", 25],
      ["XXX-root", 27],
      ["XXX-data", 29],
      ["XXX-binaries", 31],
      ["XXX-mimoda3", 33],
      ["XXX-mimod", 35],
      ["XXX-xml", 37],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the ten toolbar actions", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Open Far Cry Mods Site",
        "Open Far Cry Mod Installer Site",
        "Download Latest FC Mod Installer",
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

  it("names the mod types", () => {
    assert.deepEqual(
      ext.modTypes.map(({ options }) => options.name),
      [
        "Root Folder",
        "Binaries (Engine Injector)",
        "Game Data",
        "FC Mod Installer",
        "FCMI Mod (.a2/.a3/.a4/.a5/.bin)",
        "Repacked FCMI Mod",
        "XML Settings Mod",
      ],
    );
  });

  it("puts every action in the mod toolbar group at the same priority", () => {
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

  it("offers the mod installer, a custom launch and the save manager", () => {
    assert.deepEqual(idsOf(ext.game.supportedTools), [
      "XXX-modinstaller",
      "XXX-customlaunch",
      "XXX-savemanager",
    ]);
    const [installer, launch, saves] = ext.game.supportedTools;
    assert.equal(installer.executable(), sep("FCModInstaller", "FCXXXModInstaller.exe"));
    assert.deepEqual(installer.requiredFiles, [sep("FCModInstaller", "FCXXXModInstaller.exe")]);
    assert.equal(launch.executable(), sep("bin", "XXX.exe"));
    assert.equal(saves.executable(), sep("FCModInstaller", "FCSavegameManager.exe"));
    assert.ok([installer, launch, saves].every((tool) => tool.relative && tool.exclusive));
    assert.deepEqual(
      [installer, launch, saves].map(({ name, logo }) => [name, logo]),
      [
        ["FC Mod Installer", "modinstaller.png"],
        ["Custom Launch", "exec.png"],
        ["FC Save Manager", "savemanager.png"],
      ],
    );
    assert.equal(launch.shell, true);
  });

  it("registers the browse page and the deploy and update listeners", () => {
    const listeners = ext.listeners.map(({ kind, args }) => [kind, args[0]]);
    assert.deepEqual(listeners, [
      ["onAsync", "did-deploy"],
      ["onAsync", "check-mods-version"],
      ["onAsync", "check-mods-version"],
    ]);
    assert.equal(ext.api.events.listenerCount("did-finish-download"), 1);
    assert.equal(ext.api.events.listenerCount("did-install-mod"), 1);
  });
});

describe("template-farcry: browse page", () => {
  const pageCall = (ext) => ext.calls.find(({ name }) => name === "registerMainPage");

  it("registers a per-game page that is visible only while this game is active", async () => {
    const state = makeState({ activeGameId: GAME_ID });
    const ext = await loadExtension(DIR, { state });
    const [icon, title, , options] = pageCall(ext).args;
    assert.equal(icon, "search");
    assert.equal(title, "Browse Far Cry Mods");
    assert.equal(options.id, "XXX-fcmodding-browse");
    assert.equal(options.group, "per-game");
    assert.equal(options.priority, 40);
    assert.equal(options.hotkey, undefined);
    assert.equal(options.visible(), true);

    const other = await loadExtension(DIR, { state: makeState({ activeGameId: "other" }) });
    assert.equal(pageCall(other).args[3].visible(), false);
  });

  it("fcmoddingBrowser off drops the page and its download listeners", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("fcmoddingBrowser", "false") });
    assert.equal(pageCall(ext), undefined);
    assert.deepEqual(
      ext.listeners.map(({ args }) => args[0]),
      ["did-deploy", "check-mods-version"],
    );
    assert.equal(ext.api.events.listenerCount("did-finish-download"), 0);
  });

  it("each load wires its own listeners instead of inheriting a guard from the last one", async () => {
    const first = await loadExtension(DIR);
    const second = await loadExtension(DIR);
    assert.equal(first.api.events.listenerCount("did-finish-download"), 1);
    assert.equal(second.api.events.listenerCount("did-finish-download"), 1);
  });
});

describe("template-farcry: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const matrix = [
    [
      "the FC Mod Installer itself",
      tree("FCModInstaller/FCModInstaller.exe"),
      ["XXX-modinstaller", "XXX-fallback"],
    ],
    ["a bin folder", tree("bin/XXX.exe"), ["XXX-root", "XXX-fallback"]],
    ["a Support folder", tree("Support/a.txt"), ["XXX-root", "XXX-fallback"]],
    [
      "a data_win32 folder (its .dat file also matches the data installer)",
      tree("Mod/data_win32/patch.dat"),
      ["XXX-root", "XXX-data", "XXX-fallback"],
    ],
    ["a loose .dat file", tree("Pack/patch.dat"), ["XXX-data", "XXX-fallback"]],
    ["a loose .fat file in upper case", tree("Pack/PATCH.FAT"), ["XXX-data", "XXX-fallback"]],
    ["a loose dll", tree("injector.dll"), ["XXX-binaries", "XXX-fallback"]],
    [
      "a dll inside bin (root and binaries tie in scope, root has the lower priority)",
      tree("bin/injector.dll"),
      ["XXX-root", "XXX-binaries", "XXX-fallback"],
    ],
    [
      "a naked .a3 mod extracted by Vortex (loose info.xml)",
      tree("info.xml", "Files/a.txt"),
      ["XXX-mimoda3", "XXX-fallback"],
    ],
    [
      "an extracted .a3 mod that also holds a .bin file",
      tree("info.xml", "Files/a.bin"),
      ["XXX-mimoda3", "XXX-mimod", "XXX-fallback"],
    ],
    ["an .a2 mod", tree("Mod/Main.a2"), ["XXX-mimod", "XXX-fallback"]],
    ["an .a5 mod in upper case", tree("Mod/MAIN.A5"), ["XXX-mimod", "XXX-fallback"]],
    ["a .bin mod", tree("Mod/patch.bin"), ["XXX-mimod", "XXX-fallback"]],
    ["a gamerprofile.xml", tree("Settings/gamerprofile.xml"), ["XXX-xml", "XXX-fallback"]],
    [
      "a gamerprofile.xml in another case",
      tree("Settings/GamerProfile.XML"),
      ["XXX-xml", "XXX-fallback"],
    ],
    [
      "a root folder in another case (the folder match is case-sensitive)",
      tree("Bin/a.txt"),
      ["XXX-fallback"],
    ],
    ["loose files with no known marker", tree("readme.txt"), ["XXX-fallback"]],
    ["a FOMOD package with a mod", tree("fomod/ModuleConfig.xml", "Mod/Main.a2"), []],
    ["a FOMOD package with a data file", tree("fomod/ModuleConfig.xml", "a.dat"), []],
    ["a FOMOD package with a root folder", tree("fomod/ModuleConfig.xml", "bin/a.txt"), []],
    [
      "a FOMOD package with a settings file",
      tree("fomod/ModuleConfig.xml", "gamerprofile.xml"),
      [],
    ],
    ["a FOMOD package with a dll", tree("fomod/ModuleConfig.xml", "a.dll"), []],
    ["a FOMOD package with an extracted .a3", tree("fomod/ModuleConfig.xml", "info.xml"), []],
    [
      "a FOMOD package with the mod installer",
      tree("fomod/ModuleConfig.xml", "FCModInstaller.exe"),
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

describe("template-farcry: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("mod installer strips the wrapper folder and drops files outside it", async () => {
    const files = tree(
      "FCModInstaller/FCModInstaller.exe",
      "FCModInstaller/lib/a.dll",
      "notes.txt",
    );
    const { instructions } = await installerOf(ext, "XXX-modinstaller").install(files);
    assert.deepEqual(instructions, [
      copy(sep("FCModInstaller", "FCModInstaller.exe"), "FCModInstaller.exe"),
      copy(sep("FCModInstaller", "lib", "a.dll"), sep("lib", "a.dll")),
      { type: "setmodtype", value: "XXX-modinstaller" },
    ]);
  });

  it("mod installer keeps an archive whose executable is already at the top as is", async () => {
    const { instructions } = await installerOf(ext, "XXX-modinstaller").install(
      tree("FCModInstaller.exe", "lib/a.dll"),
    );
    assert.deepEqual(instructions, [
      copy("FCModInstaller.exe", "FCModInstaller.exe"),
      copy(sep("lib", "a.dll"), sep("lib", "a.dll")),
      { type: "setmodtype", value: "XXX-modinstaller" },
    ]);
  });

  it("root installer strips the wrapper folder above the root folder", async () => {
    const files = tree("Wrap/bin/XXX.exe", "Wrap/bin/lib/x.dll", "Wrap/readme.txt", "Out/b.txt");
    const { instructions } = await installerOf(ext, "XXX-root").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "bin", "XXX.exe"), sep("bin", "XXX.exe")),
      copy(sep("Wrap", "bin", "lib", "x.dll"), sep("bin", "lib", "x.dll")),
      copy(sep("Wrap", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer keeps a root folder that is already at the top", async () => {
    const { instructions } = await installerOf(ext, "XXX-root").install(
      tree("data_win32/a.txt", "Support/b.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("data_win32", "a.txt"), sep("data_win32", "a.txt")),
      copy(sep("Support", "b.txt"), sep("Support", "b.txt")),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer is not thrown off by a wrapper folder that merely starts with a root folder's name", async () => {
    const { instructions } = await installerOf(ext, "XXX-root").install(tree("binary/bin/a.txt"));
    assert.deepEqual(instructions[0], copy(sep("binary", "bin", "a.txt"), sep("bin", "a.txt")));
  });

  it("the folder-flattening installers keep a mod that already sits at the top of the archive", async () => {
    const cases = [
      ["XXX-data", tree("a.dat", "readme.txt")],
      ["XXX-binaries", tree("a.dll", "a.ini")],
      ["XXX-mimod", tree("Main.a2", "info.txt")],
      ["XXX-xml", tree("gamerprofile.xml", "extra.txt")],
    ];
    for (const [id, files] of cases) {
      const { instructions } = await installerOf(ext, id).install(files);
      assert.deepEqual(
        instructions,
        [...files.map((file) => copy(file, file)), { type: "setmodtype", value: id }],
        id,
      );
    }
  });

  // The destination is cut at the first occurrence of "<root folder>/" in the matched path, so a
  // wrapper folder whose name ends with a root folder's name is cut inside the wrapper's name
  // and the root folder is duplicated. Pinned so that fixing the template turns this red.
  it("known gap: root installer duplicates the root folder when the wrapper name ends with it", async () => {
    const { instructions } = await installerOf(ext, "XXX-root").install(
      tree("ModSupport/Support/a.txt"),
    );
    assert.deepEqual(
      instructions[0],
      copy(sep("ModSupport", "Support", "a.txt"), sep("Support", "Support", "a.txt")),
    );
  });

  it("data installer flattens to the .dat file's folder", async () => {
    const files = tree("Pack/a.dat", "Pack/b.fat", "Pack/readme.txt", "Other/c.txt");
    const { instructions } = await installerOf(ext, "XXX-data").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "a.dat"), "a.dat"),
      copy(sep("Pack", "b.fat"), "b.fat"),
      copy(sep("Pack", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-data" },
    ]);
  });

  it("binaries installer flattens to the dll's folder", async () => {
    const files = tree("Wrap/inject.dll", "Wrap/inject.ini", "Other/c.txt");
    const { instructions } = await installerOf(ext, "XXX-binaries").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "inject.dll"), "inject.dll"),
      copy(sep("Wrap", "inject.ini"), "inject.ini"),
      { type: "setmodtype", value: "XXX-binaries" },
    ]);
  });

  it("mod file installer flattens to the .a2/.bin file's folder", async () => {
    const files = tree("Mods/Cool/Main.a2", "Mods/Cool/info.txt", "Mods/other.txt");
    const { instructions } = await installerOf(ext, "XXX-mimod").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Mods", "Cool", "Main.a2"), "Main.a2"),
      copy(sep("Mods", "Cool", "info.txt"), "info.txt"),
      { type: "setmodtype", value: "XXX-mimod" },
    ]);
  });

  it("xml installer flattens to the gamerprofile.xml's folder", async () => {
    const files = tree("Settings/gamerprofile.xml", "Settings/extra.txt", "Other/c.txt");
    const { instructions } = await installerOf(ext, "XXX-xml").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Settings", "gamerprofile.xml"), "gamerprofile.xml"),
      copy(sep("Settings", "extra.txt"), "extra.txt"),
      { type: "setmodtype", value: "XXX-xml" },
    ]);
  });

  it("repack installer zips the whole staging folder into <mod>.a3 and copies that", async () => {
    const staging = path.join(makeTempDir(), "Cool Mod.installing");
    fs.mkdirSync(path.join(staging, "Files"), { recursive: true });
    fs.writeFileSync(path.join(staging, "info.xml"), "");

    const { instructions } = await installerOf(ext, "XXX-mimoda3").install(
      tree("info.xml", "Files/a.txt"),
      staging,
    );

    assert.deepEqual(instructions, [
      copy("Cool Mod.a3", "Cool Mod.a3"),
      { type: "setmodtype", value: "XXX-mimoda3" },
    ]);
    const [call] = vortex.sevenZip.calls;
    assert.equal(call.archive, path.join(staging, "Cool Mod.a3"));
    assert.deepEqual(
      [...call.files].sort(),
      [path.join(staging, "Files"), path.join(staging, "info.xml")].sort(),
    );
    assert.deepEqual(call.options, { raw: ["-r"] });
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
    const fresh = await loadExtension(DIR, {
      state: makeState({
        mods: {
          [GAME_ID]: { m1: { id: "m1", installationPath: "My Mod", attributes: { modId: 55 } } },
        },
      }),
    });
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
    await installerOf(ext, "XXX-fallback").install(tree("a.txt"), "My Mod.installing");
    ext.notifications.at(-1).actions[0].action(() => undefined);
    ext.dialogs.at(-1)[3][2].action();
    assert.equal(opened.at(-1), "https://www.nexusmods.com/XXX/mods/");
  });
});

describe("template-farcry: toggles change what is registered", () => {
  it("fallbackInstaller off drops the fallback installer", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("fallbackInstaller", "false") });
    assert.equal(ext.installers.length, 7);
    assert.ok(!idsOf(ext.installers).includes("XXX-fallback"));
  });

  it("allowSymlinks is on by default and off when toggled, as passed to the game details", async () => {
    const on = await loadExtension(DIR);
    const off = await loadExtension(DIR, { transform: setConst("allowSymlinks", "false") });
    assert.equal(on.game.details.supportsSymlinks, true);
    assert.equal(off.game.details.supportsSymlinks, false);
  });

  it("setupNotification on shows the mod installer instructions during setup, off does not", async () => {
    const on = await loadExtension(DIR);
    answerDownloads(on);
    await withFetch(host(), () => on.game.setup({ path: makeGameDir() }));
    const notice = on.notifications.find(({ id }) => id === "XXX-setup");
    assert.equal(notice.type, "warning");
    assert.equal(notice.message, "FC Mod Installer Usage");

    const off = await loadExtension(DIR, { transform: setConst("setupNotification", "false") });
    answerDownloads(off);
    await withFetch(host(), () => off.game.setup({ path: makeGameDir() }));
    assert.equal(
      off.notifications.some(({ id }) => id === "XXX-setup"),
      false,
    );
  });
});

describe("template-farcry: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the game folders and the mod installer's folders", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-root": gameDir,
      "XXX-binaries": sep(gameDir, "bin"),
      "XXX-data": sep(gameDir, "data_win32"),
      "XXX-modinstaller": sep(gameDir, "FCModInstaller"),
      "XXX-mimod": sep(gameDir, MIMOD_DIR),
      "XXX-mimoda3": sep(gameDir, MIMOD_DIR),
      "XXX-xml": MY_GAMES,
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

  it("describes the game to Vortex and passes the store ids through", async () => {
    const fresh = await loadExtension(DIR, {
      transform: all(setConst("STEAMAPP_ID", '"1234"'), setConst("UPLAYAPP_ID", '"abc"')),
    });
    const { game } = fresh;
    assert.equal(game.name, "Far Cry XXX");
    assert.equal(game.shortName, "FCXXX");
    assert.equal(game.logo, "XXX.jpg");
    assert.deepEqual(game.compatible, { dinput: false, enb: false });
    assert.equal(game.details.steamAppId, 1234);
    assert.equal(game.details.uPlayAppId, "abc");
    assert.deepEqual(game.environment, { SteamAPPId: "1234", UPlayAPPId: "abc" });
    assert.deepEqual(game.details.ignoreConflicts, GLOBS);
    assert.deepEqual(game.details.ignoreDeploy, GLOBS);
  });

  it("installs mods to the game folder and merges them", () => {
    assert.equal(ext.game.modPathIsRelative, true);
    assert.equal(ext.game.queryModPath(), ".");
    assert.equal(ext.game.mergeMods, true);
    assert.equal(ext.game.requiresCleanup, true);
    assert.equal(ext.game.executable(), sep("bin", "XXX.exe"));
    assert.deepEqual(ext.game.requiredFiles, [sep("bin", "XXX.exe")]);
  });

  it("puts the xml mod type in the first user id folder under My Games when one exists", async () => {
    fs.mkdirSync(path.join(MY_GAMES, "76561"), { recursive: true });
    const withProfile = await loadExtension(DIR);
    assert.equal(withProfile.modTypes.at(-1).getPath({ id: GAME_ID }), sep(MY_GAMES, "76561"));
  });

  it("resolves the user id folder when Vortex starts, so one created later waits for the next load", async () => {
    const early = await loadExtension(DIR);
    fs.mkdirSync(path.join(MY_GAMES, "76561"), { recursive: true });
    assert.equal(early.modTypes.at(-1).getPath({ id: GAME_ID }), MY_GAMES);
    const late = await loadExtension(DIR);
    assert.equal(late.modTypes.at(-1).getPath({ id: GAME_ID }), sep(MY_GAMES, "76561"));
  });

  it("finds the game through the Ubisoft Connect registry key first", async () => {
    const asked = [];
    const registry = {
      RegGetValue: (...args) => {
        asked.push(args);
        return { value: gameDir };
      },
    };
    const found = await withWinapi(registry, async () => {
      const loaded = await loadExtension(DIR);
      return loaded.game.queryPath();
    });
    assert.equal(found, gameDir);
    assert.deepEqual(asked, [
      [
        "HKEY_LOCAL_MACHINE",
        "SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\XXX",
        "InstallDir",
      ],
    ]);
  });

  it("falls back to the store helper when the registry key is missing or empty", async () => {
    for (const registry of [{}, { RegGetValue: () => undefined }]) {
      const asked = [];
      await withWinapi(registry, async () => {
        const loaded = await loadExtension(DIR);
        vortex.gameStore.findByAppId = (ids) => {
          asked.push(ids);
          return Promise.resolve({ gamePath: gameDir });
        };
        assert.equal(await loaded.game.queryPath(), gameDir);
      });
      assert.deepEqual(asked, [["XXX", "XXX"]]);
    }
  });
});

describe("template-farcry: setup and FC Mod Installer download", () => {
  const setupWith = (ext, dir, handler = host()) =>
    withFetch(handler, async (requests) => {
      await ext.game.setup({ path: dir });
      return requests;
    });

  it("downloads the versioned archive, enables it and stamps the build on the mod", async () => {
    const dir = makeGameDir();
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    const requests = await setupWith(ext, dir);

    assert.deepEqual(requests[0], { url: FILES_URL, method: "HEAD" });
    assert.deepEqual(seen[0], {
      event: "start-download",
      urls: [BUILD_URL],
      info: { game: GAME_ID, name: "FC Mod Installer" },
    });
    assert.equal(seen[1].downloadId, "download-1");

    const [info, enable, type, ...attributes] = ext.dispatched;
    assert.deepEqual(info, {
      type: "setDownloadModInfo",
      payload: ["download-1", "source", "website"],
    });
    assert.equal(enable.type, "setModsEnabled");
    assert.deepEqual(type, { type: "setModType", payload: [GAME_ID, "mod-1", "XXX-modinstaller"] });
    const stamped = Object.fromEntries(
      attributes.slice(0, 7).map(({ payload: [, , key, value] }) => [key, value]),
    );
    assert.deepEqual(stamped, {
      version: "20250412-1300",
      fcmoddingVersion: "20250412-1300",
      source: "website",
      url: MI_PAGE,
      customFileName: "FC Mod Installer",
      modId: undefined,
      fileId: undefined,
    });
  });

  it("hands over the alias when the redirect cannot be resolved", async () => {
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await setupWith(ext, makeGameDir(), unreachable);
    assert.deepEqual(seen[0].urls, [FILES_URL]);
  });

  it("creates the game, mod installer and settings folders", async () => {
    const dir = makeGameDir();
    const ext = await loadExtension(DIR);
    answerDownloads(ext);
    await setupWith(ext, dir);
    for (const folder of ["bin", "data_win32", MIMOD_DIR]) {
      assert.ok(fs.statSync(path.join(dir, folder)).isDirectory(), folder);
    }
    assert.ok(fs.statSync(MY_GAMES).isDirectory());
  });

  it("skips the download when the installer is installed and current", async () => {
    const ext = await loadExtension(DIR, { state: installed("20250412-1300") });
    const seen = answerDownloads(ext);
    const requests = await setupWith(ext, makeGameDir());
    assert.deepEqual(seen, []);
    assert.deepEqual(requests, [{ url: FILES_URL, method: "HEAD" }]);
    assert.equal(
      ext.notifications.some(({ id }) => id === "XXX-modinstaller-update"),
      false,
    );
  });

  it("the setup notice explains the installer and links to the mod index", async () => {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    answerDownloads(ext);
    await setupWith(ext, makeGameDir());
    ext.notifications.find(({ id }) => id === "XXX-setup").actions[0].action(() => undefined);

    const [, , content, buttons] = ext.dialogs[0];
    assert.match(content.text, /automatically downloaded and installed the FC Mod Installer/);
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Continue", "Get Mod Installer Mods"],
    );
    buttons[1].action();
    assert.deepEqual(opened, ["https://mods.farcry.info/fcXXX"]);
  });

  it("hands over the alias when the host answers the lookup with an error", async () => {
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await setupWith(ext, makeGameDir(), host({ status: 404 }));
    assert.deepEqual(seen[0].urls, [FILES_URL]);
  });

  it("reports a failed download and opens the installer's download page", async () => {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
      callback(new Error("offline")),
    );
    await setupWith(ext, makeGameDir());

    assert.equal(
      ext.errors[0][0],
      "Failed to download/install FC Mod Installer. You must download manually.",
    );
    assert.equal(opened[0], MI_PAGE);
  });
});

describe("template-farcry: update check", () => {
  const checkVersions = (ext) =>
    ext.listeners.find(({ args }) => args[0] === "check-mods-version").args[1];

  it("ignores other games", async () => {
    const ext = await loadExtension(DIR, { state: installed("20250101-0000") });
    const requests = await withFetch(host(), async (seen) => {
      await checkVersions(ext)("other", {}, false);
      return seen;
    });
    assert.deepEqual(requests, []);
    assert.deepEqual(ext.notifications, []);
  });

  it("notifies when the host has a newer build than the installed one", async () => {
    const ext = await loadExtension(DIR, { state: installed("20250101-0000") });
    await withFetch(host(), () => checkVersions(ext)(GAME_ID, {}, false));
    const notice = ext.notifications.find(({ id }) => id === "XXX-modinstaller-update");
    assert.equal(notice.type, "warning");
    assert.equal(notice.message, "FC Mod Installer update available (20250412-1300)");
    assert.deepEqual(
      notice.actions.map(({ title }) => title),
      ["Download"],
    );
  });

  it("measures the installed build by the newest copy", async () => {
    const ext = await loadExtension(DIR, { state: installed("20250101-0000", "20250412-1300") });
    await withFetch(host(), () => checkVersions(ext)(GAME_ID, {}, false));
    assert.deepEqual(ext.notifications, []);
  });

  it("compares builds released on the same day by their time", async () => {
    const earlier = await loadExtension(DIR, { state: installed("20250412-0900") });
    await withFetch(host(), () => checkVersions(earlier)(GAME_ID, {}, false));
    assert.equal(earlier.notifications.length, 1);

    const same = await loadExtension(DIR, { state: installed("20250412-1300") });
    await withFetch(host(), () => checkVersions(same)(GAME_ID, {}, false));
    assert.deepEqual(same.notifications, []);

    const newer = await loadExtension(DIR, { state: installed("20250412-1400") });
    await withFetch(host(), () => checkVersions(newer)(GAME_ID, {}, false));
    assert.deepEqual(newer.notifications, []);
  });

  it("reads the build from the landing page when the redirect carries none", async () => {
    const ext = await loadExtension(DIR, { state: installed("20250101-0000") });
    const handler = host({
      url: "https://downloads.fcmodding.com/version/FCModInstaller.zip",
      page: "<b>Download</b> <i>v20250412-1300</i>",
    });
    await withFetch(handler, () => checkVersions(ext)(GAME_ID, {}, false));
    assert.equal(ext.notifications[0].message, "FC Mod Installer update available (20250412-1300)");
  });

  it("ignores a landing page that answers with an error", async () => {
    const ext = await loadExtension(DIR, { state: installed("20250101-0000") });
    const handler = host({
      url: "https://downloads.fcmodding.com/version/FCModInstaller.zip",
      page: "<i>v20250412-1300</i>",
      pageStatus: 404,
    });
    await withFetch(handler, () => checkVersions(ext)(GAME_ID, {}, false));
    assert.deepEqual(ext.notifications, []);
  });

  it("stays silent when the host is unreachable", async () => {
    for (const state of [installed("20250101-0000"), installed(undefined)]) {
      const ext = await loadExtension(DIR, { state });
      const requests = await withFetch(unreachable, async (seen) => {
        await checkVersions(ext)(GAME_ID, {}, false);
        return seen;
      });
      assert.deepEqual(ext.notifications, []);
      assert.deepEqual(
        requests.map(({ url }) => url),
        [FILES_URL, MI_PAGE],
      );
    }
  });

  it("draws one notice for a copy installed before builds were tracked", async () => {
    const ext = await loadExtension(DIR, { state: installed(undefined) });
    await withFetch(host(), () => checkVersions(ext)(GAME_ID, {}, false));
    assert.equal(ext.notifications.length, 1);
  });

  it("installs the tool instead of nagging when it is missing", async () => {
    const ext = await loadExtension(DIR);
    const seen = answerDownloads(ext);
    await withFetch(host(), () => checkVersions(ext)(GAME_ID, {}, false));
    assert.deepEqual(seen[0].urls, [BUILD_URL]);
    assert.equal(
      ext.notifications.some(({ id }) => id === "XXX-modinstaller-update"),
      false,
    );
  });

  it("the Download button installs the new build and disables the one it replaces", async () => {
    const ext = await loadExtension(DIR, { state: installed("20250101-0000") });
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    const seen = answerDownloads(ext);
    await withFetch(host(), async () => {
      await checkVersions(ext)(GAME_ID, {}, false);
      let dismissed = false;
      ext.notifications
        .find(({ id }) => id === "XXX-modinstaller-update")
        .actions[0].action(() => (dismissed = true));
      assert.equal(dismissed, true);
      assert.equal(
        await waitFor(() => ext.dispatched.some(({ type }) => type === "setModEnabled")),
        true,
      );
    });
    assert.deepEqual(seen[0].urls, [BUILD_URL]);
    const disabled = ext.dispatched.find(({ type }) => type === "setModEnabled");
    assert.deepEqual(disabled.payload, ["profile-1", "mi0", false]);
  });
});

describe("template-farcry: how the installer is downloaded", () => {
  const latest = (ext) =>
    ext.registeredActions.find(({ title }) => title === "Download Latest FC Mod Installer").action;

  it("shows progress while it runs and clears it afterwards", async () => {
    const ext = await loadExtension(DIR);
    const dismissed = [];
    ext.api.dismissNotification = (id) => dismissed.push(id);
    answerDownloads(ext);
    await withFetch(host(), async () => {
      latest(ext)();
      assert.equal(await waitFor(() => dismissed.length > 0), true);
    });
    assert.deepEqual(ext.notifications[0], {
      id: "XXX-modinstaller-installing",
      message: "Installing FC Mod Installer",
      type: "activity",
      noDismiss: true,
      allowSuppress: false,
    });
    assert.deepEqual(dismissed, ["XXX-modinstaller-installing"]);
  });

  it("downloads without installing, then installs without enabling, then enables with a deploy", async () => {
    const ext = await loadExtension(DIR);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    const options = [];
    ext.api.events.on("start-download", (_urls, _info, _x, callback, _y, downloadOptions) => {
      options.push(downloadOptions);
      callback(null, "download-1");
    });
    ext.api.events.on("start-install-download", (_id, installOptions, callback) => {
      options.push(installOptions);
      callback(null, "mod-1");
    });
    await withFetch(host(), async () => {
      latest(ext)();
      assert.equal(
        await waitFor(() => ext.dispatched.some(({ type }) => type === "setModsEnabled")),
        true,
      );
    });
    assert.deepEqual(options, [{ allowInstall: false }, { allowAutoEnable: false }]);
    const enable = ext.dispatched.find(({ type }) => type === "setModsEnabled");
    assert.deepEqual(enable.payload.slice(1), [
      "profile-1",
      ["mod-1"],
      true,
      { allowAutoDeploy: true, installed: true },
    ]);
  });

  it("ignores a second request while one is running", async () => {
    const ext = await loadExtension(DIR);
    let starts = 0;
    ext.api.events.on("start-download", (_urls, _info, _x, callback) => {
      starts += 1;
      setTimeout(() => callback(null, "download-1"), 20);
    });
    ext.api.events.on("start-install-download", (_id, _options, callback) =>
      callback(null, "mod-1"),
    );
    await withFetch(host(), async () => {
      latest(ext)();
      latest(ext)();
      assert.equal(
        await waitFor(() => ext.dispatched.some(({ type }) => type === "setModsEnabled")),
        true,
      );
    });
    assert.equal(starts, 1);
  });

  it("allows another attempt after one failed", async () => {
    stubShell();
    const ext = await loadExtension(DIR);
    let attempts = 0;
    ext.api.events.on("start-download", (_urls, _info, _x, callback) => {
      attempts += 1;
      callback(attempts === 1 ? new Error("offline") : null, "download-1");
    });
    ext.api.events.on("start-install-download", (_id, _options, callback) =>
      callback(null, "mod-1"),
    );
    await withFetch(host(), () => ext.game.setup({ path: makeGameDir() }));
    assert.equal(attempts, 2);
  });
});

describe("template-farcry: run the mod installer after a deploy", () => {
  const toolPath = path.join(makeGameDir(), "FCXXXModInstaller.exe");

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
    assert.equal(notice.message, "Use FC Mod Installer to Install Mods");
    assert.deepEqual(
      notice.actions.map(({ title }) => title),
      ["Run Installer", "More"],
    );
  });

  it("the Run Installer button launches the tool Vortex discovered, through the shell", async () => {
    const state = makeState({
      discovered: { [GAME_ID]: { path: "x", tools: { "XXX-modinstaller": { path: toolPath } } } },
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
    assert.deepEqual(runs, [[toolPath, [], { suggestDeploy: false, shell: true }]]);
    assert.equal(dismissed, true);
  });

  it("reports an error instead of throwing when the tool is not set up", async () => {
    const ext = await loadExtension(DIR);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1", {});
    ext.notifications[0].actions[0].action(() => undefined);
    assert.equal(ext.errors[0][0], "Failed to run FC Mod Installer");
  });

  it("says so when Vortex found the tool but not where it lives", async () => {
    const state = makeState({
      discovered: { [GAME_ID]: { path: "x", tools: { "XXX-modinstaller": {} } } },
    });
    const ext = await loadExtension(DIR, { state });
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1", {});
    ext.notifications[0].actions[0].action(() => undefined);
    assert.deepEqual(ext.errors[0], [
      "Failed to run FC Mod Installer",
      "Path to FC Mod Installer executable could not be found. Ensure FC Mod Installer is installed through Vortex.",
    ]);
  });

  it("the dialog's Run Mod Installer button launches the tool too", async () => {
    const state = makeState({
      discovered: { [GAME_ID]: { path: "x", tools: { "XXX-modinstaller": { path: toolPath } } } },
    });
    const ext = await loadExtension(DIR, { state });
    const runs = [];
    ext.api.runExecutable = (...args) => {
      runs.push(args);
      return Promise.resolve();
    };
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1", {});
    ext.notifications[0].actions[1].action(() => undefined);
    ext.dialogs[0][3][0].action();
    assert.equal(runs.length, 1);
  });

  it("the More dialog lists the mod file types and offers four choices", async () => {
    const ext = await loadExtension(DIR);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1", {});
    ext.notifications[0].actions[1].action(() => undefined);

    const [, , content, buttons] = ext.dialogs[0];
    assert.match(content.text, /\.a2\/\.a3\/\.a4\/\.a5\/\.bin mods/);
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Run Mod Installer", "Get Mod Installer Mods", "Continue", "Never Show Again"],
    );
  });

  it("Never Show Again suppresses the notice and Get Mod Installer Mods opens the mod index", async () => {
    const opened = stubShell();
    const ext = await loadExtension(DIR);
    const suppressed = [];
    ext.api.suppressNotification = (id) => suppressed.push(id);
    ext.state.settings.profiles.lastActiveProfile[GAME_ID] = "profile-1";
    await didDeploy(ext)("profile-1", {});
    ext.notifications[0].actions[1].action(() => undefined);

    const [, , , buttons] = ext.dialogs[0];
    buttons[1].action();
    buttons[3].action();
    assert.deepEqual(opened, ["https://mods.farcry.info/fcXXX"]);
    assert.deepEqual(suppressed, ["XXX-deploy"]);
  });
});

describe("template-farcry: toolbar actions", () => {
  async function run(title, { before: prepare, state } = {}) {
    const opened = stubShell();
    const ext = await loadExtension(DIR, { state });
    await prepare?.(ext);
    await ext.registeredActions.find((action) => action.title === title).action();
    return opened;
  }

  it("opens the mod index, the installer's download page and the game's pages", async () => {
    assert.deepEqual(await run("Open Far Cry Mods Site"), ["https://mods.farcry.info/fcXXX"]);
    assert.deepEqual(await run("Open Far Cry Mod Installer Site"), [MI_PAGE]);
    assert.deepEqual(await run("Open PCGamingWiki Page"), ["XXX"]);
    assert.deepEqual(await run("Open SteamDB Page"), ["https://steamdb.info/app/XXX/"]);
  });

  it("opens the changelog shipped with the extension and the bug tracker", async () => {
    assert.deepEqual(await run("View Changelog"), [path.join(DIR, "CHANGELOG.md")]);
    assert.deepEqual(await run("Submit Bug Report"), ["XXX?tab=bugs"]);
  });

  it("opens the settings folder under My Games", async () => {
    assert.deepEqual(await run("Open Config Folder"), [MY_GAMES]);
  });

  it("opens the Vortex downloads folder for the game once setup has run", async () => {
    const opened = await run("Open Downloads Folder", {
      before: (ext) =>
        withFetch(host(), async () => {
          answerDownloads(ext);
          await ext.game.setup({ path: makeGameDir() });
        }),
    });
    assert.deepEqual(opened, [sep(vortex.APP_ROOT, "downloads", GAME_ID)]);
  });

  it("opens the first user folder under the Ubisoft Launcher savegames as the save folder", async () => {
    const launcher = makeGameDir(["savegames/12345/XXX/slot1.save"]);
    const opened = await withWinapi({ RegGetValue: () => ({ value: launcher }) }, () =>
      run("Open Save Folder"),
    );
    assert.deepEqual(opened, [sep(launcher, "savegames", "12345", "XXX")]);
  });

  it("downloads the latest installer again from the toolbar even when one is installed", async () => {
    const ext = await loadExtension(DIR, { state: installed("20250412-1300") });
    const seen = answerDownloads(ext);
    await withFetch(host(), async () => {
      ext.registeredActions
        .find(({ title }) => title === "Download Latest FC Mod Installer")
        .action();
      assert.equal(await waitFor(() => seen.length >= 2), true);
    });
    assert.deepEqual(seen[0].urls, [BUILD_URL]);
  });

  it("opens the settings folder inside the user id folder once Vortex has seen one", async () => {
    fs.mkdirSync(path.join(MY_GAMES, "76561"), { recursive: true });
    assert.deepEqual(await run("Open Config Folder"), [sep(MY_GAMES, "76561")]);
  });

  it("reports a failure instead of throwing when the shell is unavailable", async () => {
    const URL_FAILURE = "Failed to open the URL";
    const FILE_FAILURE = "Failed to open the file or folder";
    const titles = [
      ["Open Far Cry Mods Site", URL_FAILURE],
      ["Open Far Cry Mod Installer Site", URL_FAILURE],
      ["Open Config Folder", FILE_FAILURE],
      ["Open Save Folder", FILE_FAILURE],
      ["Open PCGamingWiki Page", URL_FAILURE],
      ["Open SteamDB Page", URL_FAILURE],
      ["View Changelog", FILE_FAILURE],
      ["Open Downloads Folder", FILE_FAILURE],
      ["Submit Bug Report", URL_FAILURE],
    ];
    for (const [title, message] of titles) {
      const ext = await loadExtension(DIR);
      await ext.registeredActions.find((action) => action.title === title).action();
      assert.equal(ext.errors[0]?.[0], message, title);
    }
  });
});
