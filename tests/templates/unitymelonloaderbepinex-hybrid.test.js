"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, describe, it } = require("node:test");
const { checks } = require("../contract-checks");
const { makeState, setActiveGame } = require("../harness/fake-context");
const { makeGameDir, makeTempDir, tree } = require("../harness/fixtures");
const {
  installerOf,
  stubShell,
  summary,
  reply,
  supportedBy,
  waitFor,
  withFetch,
  withWinapi,
} = require("../harness/helpers");
const { loadExtension, templateDir, vortex } = require("../harness/load-extension");
const { STUB_EXE_VERSION } = require("../harness/stub-modules");
const { all, setConst } = require("../harness/transforms");

const DIR = templateDir("template-unitymelonloaderbepinex-hybrid");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const modType = (value) => ({ type: "setmodtype", value });

// Feature toggles, flipped in memory.
const xna = setConst("isXna", "true");
const mono = setConst("BEPINEX_BUILD", '"mono"');
const customMods = setConst("hasCustomMods", "true");
// A custom loader whose plugins are recognised by a real string instead of the placeholder.
const customLoader = all(
  setConst("hasCustomLoader", "true"),
  setConst("CUSTOM_PLUGIN_STRING", '"CustomLoaderPlugin"'),
);
const customLoaderWithInstaller = all(customLoader, setConst("customLoaderInstaller", "true"));
const nexusBepinex = all(setConst("BEPINEX_PAGE_NO", "100"), setConst("BEPINEX_FILE_NO", "101"));
const nexusMelon = all(setConst("MELON_PAGE_NO", "200"), setConst("MELON_FILE_NO", "201"));
const bepinexLoader = all(
  setConst("loaderChoice", "false"),
  setConst("recommendedLoader", '"bep"'),
);
const melonLoader = all(setConst("loaderChoice", "false"), setConst("recommendedLoader", '"mel"'));
// The placeholder Xbox id equals the placeholder Steam id, which switches the Xbox logic on. A
// different id leaves it off.
const noXbox = setConst("XBOXAPP_ID", '"other"');
// Two executables, so the Epic/GOG/demo build has its own executable and data folder.
const multiExe = all(setConst("GAME_STRING_ALT", '"ALT"'), noXbox);

afterEach(() => {
  delete globalThis.window;
});

// Stands in for the two bundled downloader modules and records what the template asks of them.
function fakeModules({ failTest, slow = 0 } = {}) {
  const calls = [];
  // With `slow` set, a download only finishes after that many milliseconds and then records its
  // name in `finished`, so a caller that does not wait for it shows up as an empty list.
  const finished = [];
  const finish = async (name) => {
    if (!slow) return;
    await new Promise((resolve) => setTimeout(resolve, slow));
    finished.push(name);
  };
  const downloader = {
    download: async (_api, requirements, force) => {
      calls.push(["download", requirements, force]);
      await finish("download");
    },
    findModByFile: async (_api, type, fileName) => {
      calls.push(["findModByFile", type, fileName]);
      return "found-mod";
    },
    findDownloadIdByFile: (_api, fileName) => {
      calls.push(["findDownloadIdByFile", fileName]);
      return "download-1";
    },
    resolveVersionByPattern: async (_api, requirement) => {
      calls.push(["resolveVersionByPattern", requirement]);
      return "1.0.0";
    },
    resolveVersionByAssetDate: async (_api, requirement) => {
      calls.push(["resolveVersionByAssetDate", requirement]);
      return "1.0.0";
    },
    resolveVersionByModVersion: async (_api, requirement) => {
      calls.push(["resolveVersionByModVersion", requirement]);
      return "1.0.0";
    },
    resolveVersionByNightlyRun: async (_api, requirement) => {
      calls.push(["resolveVersionByNightlyRun", requirement]);
      return "1.0.0";
    },
    testRequirementVersion: async (_api, requirement) => {
      calls.push(["testRequirementVersion", requirement]);
      if (failTest) throw new Error(failTest);
    },
  };
  const bepinexBe = {
    downloadBepinexBe: async (_api, gameSpec, requirements, check) => {
      calls.push(["downloadBepinexBe", gameSpec.game.id, requirements, check]);
      await finish("downloadBepinexBe");
    },
    checkForBepinexBeUpdate: async (_api, gameSpec, requirements) => {
      calls.push(["checkForBepinexBeUpdate", gameSpec.game.id, requirements]);
    },
  };
  return {
    calls,
    finished,
    bundled: { "downloader.js": downloader, "bepinexbe_downloader.js": bepinexBe },
  };
}

// Loads the template with both downloader modules faked. `ext.fake.calls` is what they were asked.
async function boot({ failTest, slow, ...options } = {}) {
  const fake = fakeModules({ failTest, slow });
  const ext = await loadExtension(DIR, { bundled: fake.bundled, ...options });
  ext.fake = fake;
  return ext;
}

const callNames = (ext) => ext.fake.calls.map(([name]) => name);

// Mods Vortex has installed, by mod type.
const modsOf = (...types) =>
  Object.fromEntries(types.map((type, index) => [`mod-${index}`, { id: `mod-${index}`, type }]));

// Vortex state with the game discovered in `gameDir` and `mods` installed.
function stateFor({ gameDir, mods = {} } = {}) {
  const state = makeState({
    activeGameId: GAME_ID,
    discovered: gameDir ? { [GAME_ID]: { path: gameDir } } : {},
    mods: { [GAME_ID]: mods },
  });
  state.settings.profiles.lastActiveProfile = { [GAME_ID]: "profile" };
  return state;
}

// Replaces what the dialog the template shows returns. `choose(args)` gets [type, title, content,
// buttons] and answers with the action label (or anything else the dialog could resolve to).
function answerDialogs(ext, choose, delay = 0) {
  ext.api.showDialog = async (...args) => {
    ext.dialogs.push(args);
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    return choose(args);
  };
}
const pick = (action) => () => ({ action });
const labelsOf = (dialog) => dialog[3].map(({ label }) => label);

// Answers the deploy/purge events the way Vortex would, recording them.
function answerDeployEvents(ext) {
  const seen = [];
  ext.api.events.on("deploy-mods", (callback) => {
    seen.push("deploy-mods");
    callback(null);
  });
  ext.api.events.on("purge-mods", (_clean, callback) => {
    seen.push("purge-mods");
    callback(null);
  });
  return seen;
}

// Answers the download events with the arguments Vortex would receive, recording each.
function answerDownloadEvents(ext, delay = 0) {
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

// A staged archive on disk: `{ "BepInEx/plugins/Mod.dll": "text the dll contains" }`. Returns the
// folder the installer reads from and the file list Vortex would hand it.
function stage(entries, archive = "Mod Archive.installing") {
  const workingDir = path.join(makeTempDir(), archive);
  fs.mkdirSync(workingDir);
  for (const [relative, content] of Object.entries(entries)) {
    if (relative.endsWith("/")) continue;
    const target = path.join(workingDir, ...relative.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return { workingDir, files: tree(...Object.keys(entries)) };
}

// What the dll contents tell the installer about which loader a plugin was built for.
const BEPINEX_PLUGIN = "built for BepInEx";
const BEPINEX_PATCHER = "BepInEx and BepInEx.Preloader.Core.Patching";
const MELON_MOD = "built for MelonLoader";
const MELON_PLUGIN = "MelonLoader and MelonPlugin";
const UNKNOWN_DLL = "built for something else";

describe("template-unitymelonloaderbepinex-hybrid: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await boot();
  });

  it("registers the seven BepInEx and seven MelonLoader mod types, then assembly and assets", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-bepinexmod", 30],
      ["XXX-bepinex-plugins", 31],
      ["XXX-bepinex-patchers", 32],
      ["XXX-bepinex-config", 33],
      ["XXX-bepcfgman", 34],
      ["XXX-root", 35],
      ["XXX-bepinex", 81],
      ["XXX-melonmod", 37],
      ["XXX-melonloader-mods", 38],
      ["XXX-melonloader-plugins", 39],
      ["XXX-melonloader-config", 40],
      ["XXX-melonloader-userlibs", 41],
      ["XXX-melonprefman", 42],
      ["XXX-melonloader", 88],
      ["XXX-assemblydll", 60],
      ["XXX-assets", 62],
    ]);
  });

  it("names every mod type", () => {
    assert.deepEqual(
      ext.modTypes.map(({ options }) => options),
      [
        { name: "BepInEx Mod" },
        { name: "BepInEx Plugins" },
        { name: "BepInEx Patchers" },
        { name: "BepInEx Config" },
        { name: "BepInExConfigManager" },
        { name: "Root Folder" },
        { name: "BepInEx Injector" },
        { name: "MelonLoader Mod" },
        { name: "MelonLoader Mods" },
        { name: "MelonLoader Plugins" },
        { name: "MelonLoader Config" },
        { name: "MelonLoader UserLibs" },
        { name: "MelonPreferencesManager" },
        { name: "MelonLoader" },
        { name: "Assembly DLL Mod" },
        { name: "Assets/Resources File" },
      ],
    );
  });

  it("registers the installers in priority order, ending with the plugin sorter and fallback", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-bepinex", 26],
      ["XXX-melonloader", 27],
      ["XXX-root", 28],
      ["XXX-bepcfgman", 29],
      ["XXX-melonprefman", 30],
      ["XXX-assemblydll", 31],
      ["XXX-plugin", 33],
      ["XXX-assets", 37],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the twelve toolbar actions", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Download Latest BepInEx BE",
        "Download BepInExConfigManager",
        "Download Latest MelonLoader",
        "Open Data Folder",
        "Open BepInEx Config",
        "Open BepInEx Log",
        "Open MelonLoader Config",
        "Open MelonLoader Log",
        "Open Nexus Mods Page",
        "Open SteamDB Page",
        "View Changelog",
        "Open Downloads Folder",
      ],
    );
  });

  it("puts every toolbar action in the mod icons group, at priority 300", () => {
    for (const { group, priority, icon, options, title } of ext.registeredActions) {
      assert.deepEqual([group, priority, icon, options], ["mod-icons", 300, "open-ext", {}], title);
    }
  });

  it("listens for version checks, deployments and purges once Vortex has started", () => {
    assert.deepEqual(
      ext.listeners.map(({ kind, args }) => [kind, args[0]]),
      [
        ["onAsync", "check-mods-version"],
        ["onAsync", "did-deploy"],
        ["onAsync", "did-purge"],
      ],
    );
  });

  it("registers nothing from inside the once callback", () => {
    assert.deepEqual(
      ext.calls.filter(({ phase }) => phase === "once"),
      [],
    );
  });

  it("main reports success", () => {
    assert.equal(ext.mainResult, true);
  });

  it("no mod type detects mods by file content", async () => {
    for (const { id, test } of ext.modTypes) assert.equal(await test(), false, id);
  });

  it("only offers the mod types once the game is discovered", async () => {
    const discovered = await boot({ state: stateFor({ gameDir: makeGameDir() }) });
    for (const type of ext.modTypes) assert.equal(type.isSupported(GAME_ID), false, type.id);
    for (const type of discovered.modTypes) {
      assert.equal(type.isSupported(GAME_ID), true, type.id);
      assert.equal(type.isSupported("someothergame"), false, type.id);
    }
  });

  it("points each mod type at its folder inside the game folder", async () => {
    const gameDir = makeGameDir();
    const discovered = await boot({ state: stateFor({ gameDir }) });
    const targets = Object.fromEntries(
      discovered.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-bepinexmod": sep(gameDir, "BepInEx"),
      "XXX-bepinex-plugins": sep(gameDir, "BepInEx", "plugins"),
      "XXX-bepinex-patchers": sep(gameDir, "BepInEx", "patchers"),
      "XXX-bepinex-config": sep(gameDir, "BepInEx", "config"),
      "XXX-bepcfgman": sep(gameDir, "BepInEx"),
      "XXX-root": gameDir,
      "XXX-bepinex": gameDir,
      "XXX-melonmod": gameDir,
      "XXX-melonloader-mods": sep(gameDir, "Mods"),
      "XXX-melonloader-plugins": sep(gameDir, "Plugins"),
      "XXX-melonloader-config": sep(gameDir, "UserData"),
      "XXX-melonloader-userlibs": sep(gameDir, "UserLibs"),
      "XXX-melonprefman": sep(gameDir, "Mods"),
      "XXX-melonloader": gameDir,
      "XXX-assemblydll": gameDir,
      "XXX-assets": sep(gameDir, "XXX_Data"),
    });
  });

  it("imports only names the bundled downloader modules really export", async () => {
    // A load without fakes leaves the real modules in the require cache.
    const real = await loadExtension(DIR);
    const imported = (module) => {
      const match = real.source.match(
        new RegExp(`const \\{([^}]+)\\} = require\\("\\./${module}"\\);`),
      );
      return match[1]
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    };
    for (const module of ["downloader", "bepinexbe_downloader"]) {
      const exported = require(path.join(DIR, `${module}.js`));
      assert.ok(imported(module).length > 0, module);
      for (const name of imported(module)) assert.equal(typeof exported[name], "function", name);
    }
  });
});

describe("template-unitymelonloaderbepinex-hybrid: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await boot({ state: stateFor({ gameDir }) });
  });

  it("describes the game for Vortex", () => {
    const { game } = ext;
    assert.deepEqual(
      [game.id, game.name, game.shortName, game.logo],
      ["XXX", "XXX", "XXX", "XXX.jpg"],
    );
    assert.equal(game.mergeMods, true);
    assert.equal(game.requiresCleanup, true);
    assert.deepEqual([game.modPath, game.modPathIsRelative], [".", true]);
    assert.deepEqual(game.requiredFiles, ["XXX.exe"]);
    assert.deepEqual(game.compatible, { dinput: false, enb: false });
    assert.equal(game.details.supportsSymlinks, true);
    assert.deepEqual(
      [game.details.gogAppId, game.details.epicAppId, game.details.xboxAppId],
      ["XXX", "XXX", "XXX"],
    );
    assert.deepEqual(game.environment, {
      SteamAPPId: "XXX",
      GogAPPId: "XXX",
      EpicAPPId: "XXX",
      XboxAPPId: "XXX",
    });
  });

  it("ignores package metadata only at the top of a mod, and documents everywhere", () => {
    const { ignoreConflicts, ignoreDeploy } = ext.game.details;
    assert.deepEqual(ignoreConflicts, [
      sep("**", "manifest.json"),
      sep("**", "icon.png"),
      sep("**", "changelog*"),
      sep("**", "readme*"),
      sep("**", "license*"),
    ]);
    assert.deepEqual(ignoreDeploy, [
      sep("*", "manifest.json"),
      sep("*", "icon.png"),
      sep("**", "changelog*"),
      sep("**", "readme*"),
      sep("**", "license*"),
    ]);
  });

  it("mods deploy relative to the game folder", () => {
    assert.equal(ext.game.queryModPath(), ".");
  });

  it("offers one launch tool", () => {
    const [launch, ...rest] = ext.game.supportedTools;
    assert.deepEqual(rest, []);
    assert.deepEqual(
      [launch.id, launch.name, launch.logo, launch.executable(), launch.requiredFiles],
      ["XXX-customlaunch", "Custom Launch", "exec.png", "XXX.exe", ["XXX.exe"]],
    );
    assert.deepEqual(
      [launch.detach, launch.relative, launch.exclusive, launch.shell],
      [true, true, true, true],
    );
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

  it("launches the base executable, or the Xbox helper when it is in the game folder", () => {
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
      addInfo: { appId: "XXX", parameters: [{ appExecName: "Game" }] },
    });
    assert.deepEqual(await requiresLauncher(gameDir, "epic"), {
      launcher: "epic",
      addInfo: { appId: "XXX" },
    });
    assert.equal(await requiresLauncher(gameDir, "gog"), undefined);
  });

  it("leaves the Epic and Xbox launchers out when their ids are not discoverable", async () => {
    const other = await boot({
      transform: all(setConst("EPICAPP_ID", '"epic"'), setConst("XBOXAPP_ID", '"xbox"')),
    });
    assert.deepEqual(await other.game.requiresLauncher(gameDir, "steam"), { launcher: "steam" });
    assert.equal(await other.game.requiresLauncher(gameDir, "epic"), undefined);
    assert.equal(await other.game.requiresLauncher(gameDir, "xbox"), undefined);
  });
});

describe("template-unitymelonloaderbepinex-hybrid: toggles change what is registered", () => {
  it("with the other toggle values, the contract checks still pass", async () => {
    const variants = {
      xna,
      mono,
      customMods,
      customLoader,
      customLoaderWithInstaller,
      nexus: all(nexusBepinex, nexusMelon),
      everything: all(
        customMods,
        customLoaderWithInstaller,
        setConst("enableSaveInstaller", "true"),
        setConst("allowMelPrefMan", "true"),
        setConst("setupNotification", "true"),
        setConst("loaderSwitchRestart", "true"),
        setConst("PCGAMINGWIKI_URL", '"https://example.test/wiki"'),
        setConst("EXTENSION_URL", '"https://example.test/ext"'),
        setConst("SAVE_FOLDERNAME", '"Saves"'),
      ),
      quiet: all(
        setConst("fallbackInstaller", "false"),
        setConst("preventPluginInstall", "false"),
        setConst("allowBepCfgMan", "false"),
        setConst("useMelonNightly", "true"),
        multiExe,
      ),
    };
    for (const [label, transform] of Object.entries(variants)) {
      const ext = await boot({ transform });
      for (const [name, check] of Object.entries(checks)) {
        assert.deepEqual(await check(ext), [], `${label}: ${name}`);
      }
    }
  });

  it("isXna drops every Unity-only mod type, installer and action", async () => {
    const ext = await boot({ transform: xna });
    assert.deepEqual(
      ext.modTypes.map(({ id }) => id),
      [
        "XXX-bepinexmod",
        "XXX-bepinex-plugins",
        "XXX-bepinex-patchers",
        "XXX-bepinex-config",
        "XXX-bepcfgman",
        "XXX-root",
        "XXX-bepinex",
        "XXX-assemblydll",
      ],
    );
    assert.deepEqual(summary(ext.installers), [
      ["XXX-bepinex", 26],
      ["XXX-root", 28],
      ["XXX-bepcfgman", 29],
      ["XXX-melonprefman", 30],
      ["XXX-assemblydll", 31],
      ["XXX-plugin", 33],
      ["XXX-fallback", 49],
    ]);
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Download Latest BepInEx BE",
        "Open BepInEx Config",
        "Open BepInEx Log",
        "Open Nexus Mods Page",
        "Open SteamDB Page",
        "View Changelog",
        "Open Downloads Folder",
      ],
    );
  });
});

describe("template-unitymelonloaderbepinex-hybrid: installer routing", () => {
  let ext;
  before(async () => {
    ext = await boot();
  });

  const BEPINEX = "XXX-bepinex";
  const MELON = "XXX-melonloader";
  const matrix = [
    [
      "the BepInEx loader",
      tree("winhttp.dll", "doorstop_config.ini", "BepInEx/core/BepInEx.Core.dll"),
      [BEPINEX, "XXX-plugin", "XXX-fallback"],
    ],
    [
      "the BepInEx loader inside a wrapper folder",
      tree("Pack/winhttp.dll", "Pack/BepInEx/core/BepInEx.Core.dll"),
      [BEPINEX, "XXX-plugin", "XXX-fallback"],
    ],
    ["a BepInEx folder without the loader dll", tree("BepInEx/config/a.cfg"), ["XXX-fallback"]],
    [
      "the MelonLoader loader",
      tree("version.dll", "MelonLoader/net6/MelonLoader.dll"),
      [MELON, "XXX-plugin", "XXX-fallback"],
    ],
    ["a root folder mod", tree("XXX_Data/data.txt"), ["XXX-root", "XXX-fallback"]],
    [
      "a root folder mod with an assets file inside",
      tree("XXX_Data/level0.assets"),
      ["XXX-root", "XXX-assets", "XXX-fallback"],
    ],
    [
      "BepInExConfigManager",
      tree("BepInEx/plugins/ConfigurationManager.dll"),
      ["XXX-bepcfgman", "XXX-plugin", "XXX-fallback"],
    ],
    [
      "BepInExConfigManager in upper case",
      tree("BepInEx/Plugins/CONFIGURATIONMANAGER.DLL"),
      ["XXX-bepcfgman", "XXX-plugin", "XXX-fallback"],
    ],
    [
      "the configuration manager dll without a plugins folder",
      tree("ConfigurationManager.dll"),
      ["XXX-plugin", "XXX-fallback"],
    ],
    [
      "MelonPreferencesManager",
      tree("Mods/MelonPrefManager.IL2CPP.dll"),
      ["XXX-melonprefman", "XXX-plugin", "XXX-fallback"],
    ],
    [
      "the Mono build of MelonPreferencesManager",
      tree("Mods/MelonPrefManager.Mono.dll"),
      ["XXX-plugin", "XXX-fallback"],
    ],
    [
      "the game assembly",
      tree("GameAssembly.dll"),
      ["XXX-assemblydll", "XXX-plugin", "XXX-fallback"],
    ],
    ["a loose plugin dll", tree("Mod.dll"), ["XXX-plugin", "XXX-fallback"]],
    ["a plugin dll in upper case", tree("MOD.DLL"), ["XXX-plugin", "XXX-fallback"]],
    ["an assets file", tree("data.assets"), ["XXX-assets", "XXX-fallback"]],
    ["a resource file in upper case", tree("DATA.RESOURCE"), ["XXX-assets", "XXX-fallback"]],
    ["a ress file", tree("sharedassets0.resS"), ["XXX-assets", "XXX-fallback"]],
    ["files nothing recognises", tree("readme.txt", "docs/a.png"), ["XXX-fallback"]],
    ["a custom data file, without the custom mod type", tree("a.custom.json"), ["XXX-fallback"]],
    ["a save file, without the save installer", tree("XXX.XXX"), ["XXX-fallback"]],
  ];

  for (const [label, files, expected] of matrix) {
    it(`routes ${label} to ${expected.join(", ")}`, async () => {
      assert.deepEqual(await supportedBy(ext, files), expected);
    });
  }

  it("ignores mods for another game, whichever installer would match", async () => {
    for (const [label, files] of matrix) {
      assert.deepEqual(await supportedBy(ext, files, "someothergame"), [], label);
    }
  });

  it("answers every installer test with a promise of { supported, requiredFiles }", async () => {
    for (const entry of ext.installers) {
      const answer = entry.testSupported(tree("Mod.dll"), GAME_ID);
      assert.ok(answer instanceof Promise, entry.id);
      const { supported, requiredFiles } = await answer;
      assert.equal(typeof supported, "boolean", entry.id);
      assert.deepEqual(requiredFiles, [], entry.id);
    }
  });

  it("leaves a FOMOD package to the FOMOD installer, whichever installer would match", async () => {
    const variants = [
      "fomod/ModuleConfig.xml",
      "FOMOD/MODULECONFIG.XML",
      "Pack/fomod/moduleconfig.xml",
    ];
    for (const [label, files] of matrix) {
      for (const marker of variants) {
        const withFomod = tree(...files.map((file) => file.replaceAll(path.sep, "/")), marker);
        assert.deepEqual(await supportedBy(ext, withFomod), [], `${label} + ${marker}`);
      }
    }
  });

  it("does not take a stray ModuleConfig.xml, or fomod/info.xml alone, for a FOMOD package", async () => {
    for (const files of [
      tree("Mod.dll", "ModuleConfig.xml"),
      tree("Mod.dll", "fomod/info.xml"),
      tree("Mod.dll", "other/ModuleConfig.xml"),
    ]) {
      assert.deepEqual(await supportedBy(ext, files), ["XXX-plugin", "XXX-fallback"]);
    }
  });

  it("the fallback takes any mod for the game that no other installer wanted", async () => {
    assert.deepEqual(await supportedBy(ext, []), ["XXX-fallback"]);
  });
});

describe("template-unitymelonloaderbepinex-hybrid: routing with other toggles", () => {
  it("fallbackInstaller off leaves an unrecognised mod to Vortex", async () => {
    const ext = await boot({ transform: setConst("fallbackInstaller", "false") });
    assert.equal(
      ext.installers.some(({ id }) => id === "XXX-fallback"),
      false,
    );
    assert.deepEqual(await supportedBy(ext, tree("readme.txt")), []);
  });

  it("isXna sends MelonLoader and assets files on to the plugin sorter or fallback", async () => {
    const ext = await boot({ transform: xna });
    assert.deepEqual(
      await supportedBy(ext, tree("version.dll", "MelonLoader/net6/MelonLoader.dll")),
      ["XXX-plugin", "XXX-fallback"],
    );
    assert.deepEqual(await supportedBy(ext, tree("data.assets")), ["XXX-fallback"]);
  });

  it("isXna recognises the BepInEx fork by its d3d11.dll, not winhttp.dll", async () => {
    const ext = await boot({ transform: xna });
    assert.deepEqual(await supportedBy(ext, tree("d3d11.dll", "BepInEx/core/BepInEx.Core.dll")), [
      "XXX-bepinex",
      "XXX-plugin",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(ext, tree("winhttp.dll", "BepInEx/core/BepInEx.Core.dll")), [
      "XXX-plugin",
      "XXX-fallback",
    ]);
  });

  it("isXna takes the game's own dll for the assembly", async () => {
    const ext = await boot({ transform: xna });
    assert.deepEqual(await supportedBy(ext, tree("XXX.dll")), [
      "XXX-assemblydll",
      "XXX-plugin",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(ext, tree("GameAssembly.dll")), [
      "XXX-plugin",
      "XXX-fallback",
    ]);
  });

  it("a Mono extension takes the two managed dlls for the assembly, and the Mono preferences manager", async () => {
    const ext = await boot({ transform: mono });
    for (const dll of ["Assembly-CSharp.dll", "Assembly-CSharp-firstpass.dll"]) {
      assert.deepEqual(await supportedBy(ext, tree(dll)), [
        "XXX-assemblydll",
        "XXX-plugin",
        "XXX-fallback",
      ]);
    }
    assert.deepEqual(await supportedBy(ext, tree("GameAssembly.dll")), [
      "XXX-plugin",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(ext, tree("Mods/MelonPrefManager.Mono.dll")), [
      "XXX-melonprefman",
      "XXX-plugin",
      "XXX-fallback",
    ]);
  });

  it("enableSaveInstaller registers the save installer at 47", async () => {
    const ext = await boot({
      transform: all(
        setConst("enableSaveInstaller", "true"),
        setConst("SAVE_FILES", '["slot1.sav"]'),
        setConst("SAVE_EXTS", '[".sav"]'),
      ),
    });
    assert.deepEqual(summary(ext.installers).slice(-2), [
      ["XXX-save", 47],
      ["XXX-fallback", 49],
    ]);
    assert.deepEqual(await supportedBy(ext, tree("Slot1.SAV")), ["XXX-save", "XXX-fallback"]);
    assert.deepEqual(await supportedBy(ext, tree("anything.sav")), ["XXX-save", "XXX-fallback"]);
    assert.deepEqual(await supportedBy(ext, tree("readme.txt")), ["XXX-fallback"]);
  });

  it("the save installer never matches while its file and extension are still placeholders", async () => {
    const ext = await boot({ transform: setConst("enableSaveInstaller", "true") });
    // The placeholders are upper case but the installer compares lower-cased names.
    assert.deepEqual(await supportedBy(ext, tree("XXX.XXX")), ["XXX-fallback"]);
    assert.deepEqual(await supportedBy(ext, tree("xxx.xxx")), ["XXX-fallback"]);
  });

  it("hasCustomMods registers the custom mod type at 58 and its installer at 39", async () => {
    const ext = await boot({ transform: customMods });
    assert.deepEqual(
      summary(ext.modTypes).filter(([id]) => id === "XXX-custommod"),
      [["XXX-custommod", 58]],
    );
    assert.deepEqual(summary(ext.installers).slice(-2), [
      ["XXX-custommod", 39],
      ["XXX-fallback", 49],
    ]);
    assert.deepEqual(await supportedBy(ext, tree("a.custom.json")), [
      "XXX-custommod",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(ext, tree("A.CUSTOM.JSON")), [
      "XXX-custommod",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(ext, tree("a.json")), ["XXX-fallback"]);
    assert.deepEqual(await supportedBy(ext, tree("a.custom.txt")), ["XXX-fallback"]);
  });

  it("hasCustomLoader registers three more mod types ahead of the assembly type, and the loader installer first", async () => {
    const ext = await boot({ transform: customLoader });
    assert.deepEqual(summary(ext.modTypes).slice(-5), [
      ["XXX-customloadermod", 25],
      ["XXX-customloaderplugin", 27],
      ["XXX-customloader", 60],
      ["XXX-assemblydll", 60],
      ["XXX-assets", 62],
    ]);
    assert.deepEqual(summary(ext.installers)[0], ["XXX-customloader", 25]);
    assert.deepEqual(await supportedBy(ext, tree("XXX.dll")), [
      "XXX-customloader",
      "XXX-plugin",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(ext, tree("XXX.exe")), ["XXX-fallback"]);
  });

  it("known gap: the custom loader mod types carry each other's display names", async () => {
    const ext = await boot({ transform: customLoader });
    const nameOf = (id) => ext.modTypes.find((type) => type.id === id).options.name;
    // CUSTOMLOADER_MOD_NAME is "XXX Mod" and CUSTOMLOADER_PLUGIN_NAME is "XXX Plugin", but the
    // registration hands each mod type the other's name.
    assert.equal(nameOf("XXX-customloadermod"), "XXX Plugin");
    assert.equal(nameOf("XXX-customloaderplugin"), "XXX Mod");
    assert.equal(nameOf("XXX-customloader"), "XXX");
  });

  it("customLoaderInstaller makes the loader installer look for the installer exe instead", async () => {
    const ext = await boot({ transform: customLoaderWithInstaller });
    assert.deepEqual(await supportedBy(ext, tree("XXX.exe")), ["XXX-customloader", "XXX-fallback"]);
    assert.deepEqual(await supportedBy(ext, tree("XXX.dll")), ["XXX-plugin", "XXX-fallback"]);
  });

  it("customLoaderInstaller adds the installer as a tool", async () => {
    const ext = await boot({ transform: customLoaderWithInstaller });
    const tool = ext.game.supportedTools.find(({ id }) => id === "XXX-customloader");
    assert.deepEqual(
      [tool.name, tool.logo, tool.executable(), tool.requiredFiles, tool.detach, tool.relative],
      [
        "XXX Installer",
        "customloader.png",
        sep("XXX", "XXX.exe"),
        [sep("XXX", "XXX.exe")],
        true,
        true,
      ],
    );
    assert.equal(tool.exclusive, true);
  });
});

// Runs one installer and returns its instructions.
async function installWith(ext, id, files, workingDir = ".") {
  const { instructions } = await installerOf(ext, id).install(files, workingDir);
  return instructions;
}

describe("template-unitymelonloaderbepinex-hybrid: install output", () => {
  let ext;
  before(async () => {
    ext = await boot();
  });

  it("installs the BepInEx loader at the game folder root, as the injector mod type", async () => {
    assert.deepEqual(
      await installWith(
        ext,
        "XXX-bepinex",
        tree("winhttp.dll", "doorstop_config.ini", "BepInEx/core/BepInEx.Core.dll"),
      ),
      [
        copy("winhttp.dll", "winhttp.dll"),
        copy("doorstop_config.ini", "doorstop_config.ini"),
        copy(
          sep("BepInEx", "core", "BepInEx.Core.dll"),
          sep("BepInEx", "core", "BepInEx.Core.dll"),
        ),
        modType("XXX-bepinex"),
      ],
    );
  });

  it("strips the wrapper folder around the BepInEx loader and leaves files outside it", async () => {
    assert.deepEqual(
      await installWith(
        ext,
        "XXX-bepinex",
        tree("Pack/winhttp.dll", "Pack/BepInEx/core/a.dll", "outside.txt"),
      ),
      [
        copy(sep("Pack", "winhttp.dll"), "winhttp.dll"),
        copy(sep("Pack", "BepInEx", "core", "a.dll"), sep("BepInEx", "core", "a.dll")),
        modType("XXX-bepinex"),
      ],
    );
  });

  it("installs MelonLoader at the game folder root, as the MelonLoader mod type", async () => {
    assert.deepEqual(
      await installWith(
        ext,
        "XXX-melonloader",
        tree("version.dll", "MelonLoader/net6/MelonLoader.dll"),
      ),
      [
        copy("version.dll", "version.dll"),
        copy(
          sep("MelonLoader", "net6", "MelonLoader.dll"),
          sep("MelonLoader", "net6", "MelonLoader.dll"),
        ),
        modType("XXX-melonloader"),
      ],
    );
  });

  it("strips the wrapper folder around MelonLoader", async () => {
    assert.deepEqual(
      await installWith(
        ext,
        "XXX-melonloader",
        tree("Pack/version.dll", "Pack/MelonLoader/net6/MelonLoader.dll"),
      ),
      [
        copy(sep("Pack", "version.dll"), "version.dll"),
        copy(
          sep("Pack", "MelonLoader", "net6", "MelonLoader.dll"),
          sep("MelonLoader", "net6", "MelonLoader.dll"),
        ),
        modType("XXX-melonloader"),
      ],
    );
  });

  it("installs a root folder mod as it is, and strips a wrapper folder", async () => {
    assert.deepEqual(await installWith(ext, "XXX-root", tree("XXX_Data/a.txt", "XXX.exe")), [
      copy(sep("XXX_Data", "a.txt"), sep("XXX_Data", "a.txt")),
      copy("XXX.exe", "XXX.exe"),
      modType("XXX-root"),
    ]);
    assert.deepEqual(
      await installWith(ext, "XXX-root", tree("Pack/XXX_Data/a.txt", "Pack/XXX.exe")),
      [
        copy(sep("Pack", "XXX_Data", "a.txt"), sep("XXX_Data", "a.txt")),
        copy(sep("Pack", "XXX.exe"), "XXX.exe"),
        modType("XXX-root"),
      ],
    );
  });

  it("installs BepInExConfigManager into the BepInEx folder, below its plugins folder", async () => {
    const expected = [
      copy(
        sep("BepInEx", "plugins", "ConfigurationManager.dll"),
        sep("plugins", "ConfigurationManager.dll"),
      ),
      modType("XXX-bepcfgman"),
    ];
    assert.deepEqual(
      await installWith(ext, "XXX-bepcfgman", tree("BepInEx/plugins/ConfigurationManager.dll")),
      expected,
    );
    assert.deepEqual(
      await installWith(
        ext,
        "XXX-bepcfgman",
        tree("Pack/BepInEx/plugins/ConfigurationManager.dll"),
      ),
      [
        copy(
          sep("Pack", "BepInEx", "plugins", "ConfigurationManager.dll"),
          sep("plugins", "ConfigurationManager.dll"),
        ),
        modType("XXX-bepcfgman"),
      ],
    );
  });

  it("installs MelonPreferencesManager as a bare dll, wherever it sat in the archive", async () => {
    const expected = [
      copy("MelonPrefManager.IL2CPP.dll", "MelonPrefManager.IL2CPP.dll"),
      modType("XXX-melonprefman"),
    ];
    assert.deepEqual(
      await installWith(ext, "XXX-melonprefman", tree("MelonPrefManager.IL2CPP.dll")),
      expected,
    );
    assert.deepEqual(
      await installWith(ext, "XXX-melonprefman", tree("Mods/MelonPrefManager.IL2CPP.dll")),
      [
        copy(sep("Mods", "MelonPrefManager.IL2CPP.dll"), "MelonPrefManager.IL2CPP.dll"),
        modType("XXX-melonprefman"),
      ],
    );
  });

  it("installs the game assembly with whatever sits beside it", async () => {
    assert.deepEqual(
      await installWith(
        ext,
        "XXX-assemblydll",
        tree("Pack/GameAssembly.dll", "Pack/other.dll", "x.txt"),
      ),
      [
        copy(sep("Pack", "GameAssembly.dll"), "GameAssembly.dll"),
        copy(sep("Pack", "other.dll"), "other.dll"),
        modType("XXX-assemblydll"),
      ],
    );
  });

  it("installs assets files as the assets mod type", async () => {
    assert.deepEqual(
      await installWith(ext, "XXX-assets", tree("level0.assets", "Pack/x.resource")),
      [
        copy("level0.assets", "level0.assets"),
        copy(sep("Pack", "x.resource"), sep("Pack", "x.resource")),
        modType("XXX-assets"),
      ],
    );
    assert.deepEqual(await installWith(ext, "XXX-assets", tree("Pack/level0.assets")), [
      copy(sep("Pack", "level0.assets"), "level0.assets"),
      modType("XXX-assets"),
    ]);
  });

  it("known gap: a root folder mod in a wrapper named like the root folder keeps the wrapper name", async () => {
    // The destination is cut at the first "XXX_Data\" in the path, which here is inside the
    // wrapper's own name.
    assert.deepEqual(await installWith(ext, "XXX-root", tree("MyXXX_Data/XXX_Data/a.txt")), [
      copy(sep("MyXXX_Data", "XXX_Data", "a.txt"), sep("XXX_Data", "XXX_Data", "a.txt")),
      modType("XXX-root"),
    ]);
  });

  it("known gap: MelonLoader in a wrapper whose name ends in MelonLoader keeps the wrapper name", async () => {
    assert.deepEqual(
      await installWith(
        ext,
        "XXX-melonloader",
        tree("MyMelonLoader/version.dll", "MyMelonLoader/MelonLoader/net6/MelonLoader.dll"),
      ),
      [
        copy(sep("MyMelonLoader", "version.dll"), sep("MelonLoader", "version.dll")),
        copy(
          sep("MyMelonLoader", "MelonLoader", "net6", "MelonLoader.dll"),
          sep("MelonLoader", "MelonLoader", "net6", "MelonLoader.dll"),
        ),
        modType("XXX-melonloader"),
      ],
    );
  });

  it("known gap: BepInExConfigManager in a wrapper whose name ends in plugins doubles the plugins folder", async () => {
    assert.deepEqual(
      await installWith(ext, "XXX-bepcfgman", tree("Myplugins/plugins/ConfigurationManager.dll")),
      [
        copy(
          sep("Myplugins", "plugins", "ConfigurationManager.dll"),
          sep("plugins", "plugins", "ConfigurationManager.dll"),
        ),
        modType("XXX-bepcfgman"),
      ],
    );
  });

  describe("the root installer for a build with its own data folder", () => {
    let alt;
    before(async () => {
      alt = await boot({ transform: multiExe });
    });
    const altGame = () => makeGameDir(["ALT.exe"]);

    it("renames the default data folder to the alt build's before installing", async () => {
      alt.game.executable(altGame());
      const { workingDir, files } = stage({
        "Pack/XXX_Data/a.txt": "a",
        "Pack/XXX_Data/sub/b.txt": "b",
        "Pack/readme.txt": "r",
      });
      const instructions = await installWith(alt, "XXX-root", files, workingDir);
      assert.deepEqual(
        instructions
          .filter(({ type }) => type === "copy")
          .map(({ destination }) => destination)
          .sort(),
        [sep("ALT_Data", "a.txt"), sep("ALT_Data", "sub", "b.txt"), "readme.txt"],
      );
      assert.deepEqual(instructions.at(-1), modType("XXX-root"));
      assert.equal(fs.existsSync(path.join(workingDir, "Pack", "ALT_Data", "a.txt")), true);
      assert.equal(fs.existsSync(path.join(workingDir, "Pack", "XXX_Data")), false);
    });

    it("leaves a mod that already uses the alt data folder alone", async () => {
      alt.game.executable(altGame());
      const { workingDir, files } = stage({ "ALT_Data/a.txt": "a" });
      const instructions = await installWith(alt, "XXX-root", files, workingDir);
      assert.deepEqual(instructions, [
        copy(sep("ALT_Data", "a.txt"), sep("ALT_Data", "a.txt")),
        modType("XXX-root"),
      ]);
    });

    it("does not rename anything for the default build", async () => {
      // The detected build is module state, so this needs a load that has not seen the alt build.
      const fresh = await boot({ transform: multiExe });
      fresh.game.executable(makeGameDir());
      const { workingDir, files } = stage({ "XXX_Data/a.txt": "a" });
      const instructions = await installWith(fresh, "XXX-root", files, workingDir);
      assert.deepEqual(instructions[0], copy(sep("XXX_Data", "a.txt"), sep("XXX_Data", "a.txt")));
      assert.equal(fs.existsSync(path.join(workingDir, "XXX_Data", "a.txt")), true);
    });

    it("installs the files as listed, and logs a warning, when the archive is not on disk", async () => {
      alt.game.executable(altGame());
      const empty = makeTempDir();
      const instructions = await installWith(alt, "XXX-root", tree("XXX_Data/a.txt"), empty);
      assert.deepEqual(instructions, [
        copy(sep("XXX_Data", "a.txt"), sep("XXX_Data", "a.txt")),
        modType("XXX-root"),
      ]);
      assert.ok(
        vortex.logs.some(
          ({ level, message }) =>
            level === "warn" &&
            message.startsWith('Failed to rename "XXX_Data" folder to "ALT_Data"'),
        ),
      );
    });
  });
});

describe("template-unitymelonloaderbepinex-hybrid: install output with other toggles", () => {
  it("installs a custom mod data file as the custom mod type", async () => {
    const ext = await boot({ transform: customMods });
    assert.deepEqual(await installWith(ext, "XXX-custommod", tree("a.custom.json")), [
      copy("a.custom.json", "a.custom.json"),
      modType("XXX-custommod"),
    ]);
    assert.deepEqual(
      await installWith(ext, "XXX-custommod", tree("config.json", "a.custom.json")),
      [
        copy("config.json", "config.json"),
        copy("a.custom.json", "a.custom.json"),
        modType("XXX-custommod"),
      ],
    );
  });

  it("known gap: a custom mod data file in a wrapper loses part of the wrapper's name, or keeps all of it", async () => {
    const ext = await boot({ transform: customMods });
    // The destination starts at the first occurrence of the data file's base name in the path,
    // which is inside the wrapper's name when the two share letters.
    assert.deepEqual(await installWith(ext, "XXX-custommod", tree("Pack/a.custom.json")), [
      copy(sep("Pack", "a.custom.json"), sep("ack", "a.custom.json")),
      modType("XXX-custommod"),
    ]);
    assert.deepEqual(await installWith(ext, "XXX-custommod", tree("Cool Mods/Cool.custom.json")), [
      copy(sep("Cool Mods", "Cool.custom.json"), sep("Cool Mods", "Cool.custom.json")),
      modType("XXX-custommod"),
    ]);
  });

  it("installs a save file as an assets mod, since there is no save mod type", async () => {
    const ext = await boot({
      transform: all(
        setConst("enableSaveInstaller", "true"),
        setConst("SAVE_FILES", '["slot1.sav"]'),
        setConst("SAVE_EXTS", '[".sav"]'),
      ),
    });
    assert.deepEqual(await installWith(ext, "XXX-save", tree("Slot1.sav", "x.txt")), [
      copy("Slot1.sav", "Slot1.sav"),
      copy("x.txt", "x.txt"),
      modType("XXX-assets"),
    ]);
    assert.deepEqual(await installWith(ext, "XXX-save", tree("Saves/a.sav", "Saves/b.txt")), [
      copy(sep("Saves", "a.sav"), "a.sav"),
      copy(sep("Saves", "b.txt"), "b.txt"),
      modType("XXX-assets"),
    ]);
  });

  it("finds a save by extension when no file has the listed name", async () => {
    const ext = await boot({
      transform: all(
        setConst("enableSaveInstaller", "true"),
        setConst("SAVE_FILES", '["slot1.sav"]'),
        setConst("SAVE_EXTS", '[".sav"]'),
      ),
    });
    assert.deepEqual(await installWith(ext, "XXX-save", tree("Mysaves/Saves/other.SAV")), [
      copy(sep("Mysaves", "Saves", "other.SAV"), "other.SAV"),
      modType("XXX-assets"),
    ]);
  });

  it("installs the custom loader's files where they are, or below its folder for the installer build", async () => {
    const plain = await boot({ transform: customLoader });
    assert.deepEqual(
      await installWith(plain, "XXX-customloader", tree("Pack/XXX.dll", "Pack/a.txt")),
      [
        copy(sep("Pack", "XXX.dll"), "XXX.dll"),
        copy(sep("Pack", "a.txt"), "a.txt"),
        modType("XXX-customloader"),
      ],
    );
    const withInstaller = await boot({ transform: customLoaderWithInstaller });
    assert.deepEqual(
      await installWith(withInstaller, "XXX-customloader", tree("Pack/XXX.exe", "Pack/a.txt")),
      [
        copy(sep("Pack", "XXX.exe"), sep("XXX", "XXX.exe")),
        copy(sep("Pack", "a.txt"), sep("XXX", "a.txt")),
        modType("XXX-customloader"),
      ],
    );
  });
});

// Appends an export of private helpers so they can be called directly.
const exposing =
  (...names) =>
  (source) =>
    `${source}\nmodule.exports.internals = { ${names.join(", ")} };\n`;

// Stages an archive on disk and runs the plugin sorter on it. `mods` are the Vortex mod types
// already installed; `archive` is the staging folder's name.
async function sortPlugins(
  entries,
  { mods = [], transform, archive = "Mod Archive.installing", ghost } = {},
) {
  const ext = await boot({
    transform,
    state: stateFor({ gameDir: makeGameDir(), mods: modsOf(...mods) }),
  });
  const { workingDir, files } = stage(entries, archive);
  if (ghost) files.push(ghost);
  let result;
  let error;
  try {
    result = await installerOf(ext, "XXX-plugin").install(files, workingDir);
  } catch (err) {
    error = err;
  }
  return { ext, workingDir, files, instructions: result?.instructions, error };
}

const manifestFor = (name) =>
  JSON.stringify(
    {
      name,
      version_number: "1.0.0",
      description: `${name} (installed by Vortex)`,
      dependencies: [],
    },
    null,
    2,
  );
const generated = (name) => ({
  type: "generatefile",
  data: manifestFor(name),
  destination: sep(name, "manifest.json"),
});

describe("template-unitymelonloaderbepinex-hybrid: plugin sorter", () => {
  describe("BepInEx plugins", () => {
    it("wraps a loose plugin in a folder named after its dll", async () => {
      const { instructions } = await sortPlugins({ "Foo.dll": BEPINEX_PLUGIN });
      assert.deepEqual(instructions, [
        copy("Foo.dll", sep("Foo", "Foo.dll")),
        modType("XXX-bepinex-plugins"),
      ]);
    });

    it("wraps every loose file with the plugin, package metadata included", async () => {
      const { instructions } = await sortPlugins({
        "Foo.dll": BEPINEX_PLUGIN,
        "readme.txt": "r",
        "icon.png": "i",
        "manifest.json": "{}",
      });
      assert.deepEqual(instructions, [
        copy("Foo.dll", sep("Foo", "Foo.dll")),
        copy("readme.txt", sep("Foo", "readme.txt")),
        copy("icon.png", sep("Foo", "icon.png")),
        copy("manifest.json", sep("Foo", "manifest.json")),
        modType("XXX-bepinex-plugins"),
      ]);
    });

    it("wraps a plugin that sits in its own folder in that folder's name", async () => {
      const { instructions } = await sortPlugins({
        "FooMod/Foo.dll": BEPINEX_PLUGIN,
        "FooMod/extra.txt": "e",
        "elsewhere.txt": "x",
      });
      assert.deepEqual(instructions, [
        copy(sep("FooMod", "Foo.dll"), sep("FooMod", "Foo.dll")),
        copy(sep("FooMod", "extra.txt"), sep("FooMod", "extra.txt")),
        modType("XXX-bepinex-plugins"),
      ]);
    });

    it("installs a plugins folder as it is, below BepInEx, and drops archive-root package metadata", async () => {
      const { instructions } = await sortPlugins({
        "plugins/Foo.dll": BEPINEX_PLUGIN,
        "plugins/manifest.json": "{}",
        "manifest.json": "{}",
        "icon.png": "i",
        "readme.txt": "r",
      });
      assert.deepEqual(instructions, [
        copy(sep("plugins", "Foo.dll"), sep("plugins", "Foo.dll")),
        copy(sep("plugins", "manifest.json"), sep("plugins", "manifest.json")),
        copy("readme.txt", "readme.txt"),
        modType("XXX-bepinexmod"),
      ]);
    });

    it("recognises the loader folders in any case, and the dll in any case", async () => {
      const { instructions } = await sortPlugins({ "Plugins/FOO.DLL": BEPINEX_PLUGIN });
      assert.deepEqual(instructions, [
        copy(sep("Plugins", "FOO.DLL"), sep("Plugins", "FOO.DLL")),
        modType("XXX-bepinexmod"),
      ]);
    });

    it("installs a whole BepInEx folder, keeping the folders below it", async () => {
      const { instructions } = await sortPlugins({
        "BepInEx/plugins/Foo.dll": BEPINEX_PLUGIN,
        "BepInEx/config/foo.cfg": "c",
      });
      assert.deepEqual(instructions, [
        copy(sep("BepInEx", "plugins", "Foo.dll"), sep("plugins", "Foo.dll")),
        copy(sep("BepInEx", "config", "foo.cfg"), sep("config", "foo.cfg")),
        modType("XXX-bepinexmod"),
      ]);
    });

    it("strips a wrapper folder around a plugins folder", async () => {
      const { instructions } = await sortPlugins({ "Pack/plugins/Foo.dll": BEPINEX_PLUGIN });
      assert.deepEqual(instructions, [
        copy(sep("Pack", "plugins", "Foo.dll"), sep("plugins", "Foo.dll")),
        modType("XXX-bepinexmod"),
      ]);
    });

    it("wraps a loose patcher and sends it to the patchers mod type", async () => {
      const { instructions } = await sortPlugins({ "Patch.dll": BEPINEX_PATCHER });
      assert.deepEqual(instructions, [
        copy("Patch.dll", sep("Patch", "Patch.dll")),
        modType("XXX-bepinex-patchers"),
      ]);
    });

    it("installs a patchers folder as it is, below BepInEx", async () => {
      const { instructions } = await sortPlugins({ "patchers/Patch.dll": BEPINEX_PATCHER });
      assert.deepEqual(instructions, [
        copy(sep("patchers", "Patch.dll"), sep("patchers", "Patch.dll")),
        modType("XXX-bepinexmod"),
      ]);
    });

    it("still sorts the plugin when the archive also holds a dll built for nothing in particular", async () => {
      const { ext, instructions } = await sortPlugins({
        "Foo.dll": BEPINEX_PLUGIN,
        "Dependency.dll": UNKNOWN_DLL,
      });
      assert.equal(instructions.at(-1).value, "XXX-bepinex-plugins");
      assert.deepEqual(
        ext.notifications.map(({ message }) => message),
        ["Unknown DLL File in mod: Mod Archive"],
      );
    });
  });

  describe("MelonLoader mods and plugins", () => {
    it("wraps a loose mod in a folder and writes it a manifest", async () => {
      const { instructions } = await sortPlugins({ "Mod.dll": MELON_MOD });
      assert.deepEqual(instructions, [
        copy("Mod.dll", sep("Mod", "Mod.dll")),
        generated("Mod"),
        modType("XXX-melonloader-mods"),
      ]);
    });

    it("writes the manifest as indented json naming the mod and its version", async () => {
      const { instructions } = await sortPlugins({ "Mod.dll": MELON_MOD });
      const manifest = instructions.find(({ type }) => type === "generatefile");
      assert.deepEqual(JSON.parse(manifest.data), {
        name: "Mod",
        version_number: "1.0.0",
        description: "Mod (installed by Vortex)",
        dependencies: [],
      });
      assert.match(manifest.data, /^\{\n {2}"name": "Mod",\n/);
    });

    it("keeps the archive's own manifest instead of writing one", async () => {
      const { instructions } = await sortPlugins({
        "Mod.dll": MELON_MOD,
        "manifest.json": "{}",
      });
      assert.deepEqual(instructions, [
        copy("Mod.dll", sep("Mod", "Mod.dll")),
        copy("manifest.json", sep("Mod", "manifest.json")),
        modType("XXX-melonloader-mods"),
      ]);
    });

    it("treats a manifest in any case as the archive's own", async () => {
      const { instructions } = await sortPlugins({
        "Mod.dll": MELON_MOD,
        "Manifest.JSON": "{}",
      });
      assert.equal(
        instructions.some(({ type }) => type === "generatefile"),
        false,
      );
    });

    it("wraps a loose MelonLoader plugin and sends it to the plugins mod type", async () => {
      const { instructions } = await sortPlugins({ "Plug.dll": MELON_PLUGIN });
      assert.deepEqual(instructions, [
        copy("Plug.dll", sep("Plug", "Plug.dll")),
        generated("Plug"),
        modType("XXX-melonloader-plugins"),
      ]);
    });

    it("installs a Mods folder as it is and does not write a manifest", async () => {
      const { instructions } = await sortPlugins({
        "Mods/Mod.dll": MELON_MOD,
        "UserData/Mod.cfg": "c",
      });
      assert.deepEqual(instructions, [
        copy(sep("Mods", "Mod.dll"), sep("Mods", "Mod.dll")),
        copy(sep("UserData", "Mod.cfg"), sep("UserData", "Mod.cfg")),
        modType("XXX-melonmod"),
      ]);
    });

    it("recognises UserLibs and plugins folders as MelonLoader folders in any case", async () => {
      for (const folder of ["UserLibs", "plugins", "USERDATA", "MODS"]) {
        const { instructions } = await sortPlugins({ [`${folder}/Mod.dll`]: MELON_MOD });
        assert.equal(instructions.at(-1).value, "XXX-melonmod", folder);
        assert.equal(instructions.length, 2, folder);
      }
    });

    it("a MelonLoader plugin folder sorts the same as a mods folder", async () => {
      const { instructions } = await sortPlugins({ "Plugins/Plug.dll": MELON_PLUGIN });
      assert.deepEqual(instructions, [
        copy(sep("Plugins", "Plug.dll"), sep("Plugins", "Plug.dll")),
        modType("XXX-melonmod"),
      ]);
    });
  });

  describe("dlls built for no known loader", () => {
    it("installs the files where they are, with no mod type, and tells the user", async () => {
      const { ext, instructions } = await sortPlugins({ "Foo.dll": UNKNOWN_DLL });
      assert.deepEqual(instructions, [copy("Foo.dll", "Foo.dll"), {}]);
      assert.equal(ext.notifications.length, 1);
      const [notification] = ext.notifications;
      assert.deepEqual(
        [notification.id, notification.type, notification.message, notification.allowSuppress],
        ["XXX-ModArchive-fallback", "info", "Unknown DLL File in mod: Mod Archive", true],
      );
      assert.deepEqual(
        notification.actions.map(({ title }) => title),
        ["More"],
      );
    });

    it("says nothing and sets no mod type when the dll cannot be read", async () => {
      const { ext, instructions } = await sortPlugins({ "Foo.txt": "x" }, { ghost: "Ghost.dll" });
      assert.deepEqual(instructions, [
        copy("Foo.txt", "Foo.txt"),
        copy("Ghost.dll", "Ghost.dll"),
        {},
      ]);
      assert.equal(ext.errors.length, 1);
      const [message, error, options] = ext.errors[0];
      assert.equal(
        message,
        'Failed to read plugin file "Ghost.dll" to determine which mod loader it requires. Plugin is likely corrupted.',
      );
      assert.equal(error.code, "ENOENT");
      assert.deepEqual(options, { allowReport: false });
      assert.deepEqual(ext.notifications, []);
    });

    it("checks the dll's contents for BepInEx before MelonLoader", async () => {
      const { instructions } = await sortPlugins({ "Foo.dll": "MelonLoader and BepInEx" });
      assert.equal(instructions.at(-1).value, "XXX-bepinex-plugins");
    });
  });

  describe("choosing the folder a loose plugin is wrapped in", () => {
    const wrapped = async (name, content = BEPINEX_PLUGIN) => {
      const { instructions } = await sortPlugins({ [`${name}.dll`]: content });
      return instructions[0].destination.split(path.sep)[0];
    };

    it("sanitises names the loaders would skip, by prefixing the game id", async () => {
      assert.equal(await wrapped("~hidden"), "XXX-~hidden");
      assert.equal(await wrapped(".dotted"), "XXX-.dotted");
      for (const reserved of ["Mods", "plugins", "UserLibs", "BROKEN", "Retired", "disabled"]) {
        assert.equal(await wrapped(reserved), `XXX-${reserved}`, reserved);
      }
    });

    it("leaves names that only contain a reserved word alone", async () => {
      assert.equal(await wrapped("ModsPlus"), "ModsPlus");
      assert.equal(await wrapped("My Plugins"), "My Plugins");
      assert.equal(await wrapped("userdata"), "userdata");
    });

    it("trims the name", async () => {
      assert.equal(await wrapped(" Spaced "), "Spaced");
    });

    it("wraps a MelonLoader mod the same way, and names its manifest after the wrapper", async () => {
      const { instructions } = await sortPlugins({ "Mods.dll": MELON_MOD });
      assert.equal(instructions[0].destination, sep("XXX-Mods", "Mods.dll"));
      assert.equal(instructions[1].destination, sep("XXX-Mods", "manifest.json"));
      assert.equal(JSON.parse(instructions[1].data).name, "XXX-Mods");
    });

    it("falls back to the archive's name when the dll's own name is blank", async () => {
      const ext = await boot({ transform: exposing("pluginFolderName") });
      const { pluginFolderName } = ext.exports.internals;
      assert.equal(
        pluginFolderName(" .dll", ".", sep("staging", "Great Mod.7z.installing")),
        "Great Mod",
      );
      assert.equal(pluginFolderName("Foo.dll", ".", sep("staging", "x")), "Foo");
      assert.equal(pluginFolderName(sep("Pack", "Foo.dll"), "Pack", sep("staging", "x")), "Pack");
    });

    it("replaces characters a folder name cannot hold", async () => {
      const ext = await boot({ transform: exposing("pluginFolderName") });
      const { pluginFolderName } = ext.exports.internals;
      assert.equal(pluginFolderName('a<b>c:d"e|f?g*h.dll', ".", "x"), "a_b_c_d_e_f_g_h");
    });
  });

  describe("refusing a plugin built for another loader", () => {
    const wrongLoader = (ext) => ext.dialogs.find(([, title]) => title === "Wrong Mod Loader");

    // Installs with the dialog answered `action` (the one button the dialogs carry is "Ok").
    async function withAnswer(entries, mods, transform, action = "Ok") {
      const ext = await boot({
        transform,
        state: stateFor({ gameDir: makeGameDir(), mods: modsOf(...mods) }),
      });
      answerDialogs(ext, pick(action));
      const { workingDir, files } = stage(entries, "Mod Archive.installing");
      try {
        const { instructions } = await installerOf(ext, "XXX-plugin").install(files, workingDir);
        return { ext, instructions };
      } catch (error) {
        return { ext, error };
      }
    }

    it("asks first, and cancels the install when the user accepts", async () => {
      const { ext, error } = await withAnswer({ "Foo.dll": BEPINEX_PLUGIN }, ["XXX-melonloader"]);
      assert.ok(error);
      assert.equal(error.message, "User canceled");
      assert.equal(error.kind, "user-canceled");
      assert.equal(error.skipped, false);
      const [type, title, content, buttons] = wrongLoader(ext);
      assert.deepEqual([type, title, buttons], ["error", "Wrong Mod Loader", [{ label: "Ok" }]]);
      assert.deepEqual(content.options, { order: ["bbcode"], wrap: true });
      assert.match(
        content.bbcode,
        /^Vortex has detected that the Mod Archive archive has BepInEx plugins, but you have installed MelonLoader\./,
      );
      assert.match(
        content.bbcode,
        /change your mod loader to BepInEx\.\[br\]\[\/br\]\[br\]\[\/br\]$/,
      );
    });

    it("lets the install go ahead when the dialog is dismissed without pressing Ok", async () => {
      const { ext, instructions } = await sortPlugins(
        { "Foo.dll": BEPINEX_PLUGIN },
        { mods: ["XXX-melonloader"] },
      );
      assert.equal(wrongLoader(ext) !== undefined, true);
      assert.equal(instructions.at(-1).value, "XXX-bepinex-plugins");
    });

    it("installs anyway when preventPluginInstall is off", async () => {
      const { ext, instructions, error } = await withAnswer(
        { "Foo.dll": BEPINEX_PLUGIN },
        ["XXX-melonloader"],
        setConst("preventPluginInstall", "false"),
      );
      assert.equal(error, undefined);
      assert.equal(wrongLoader(ext) !== undefined, true);
      assert.equal(instructions.at(-1).value, "XXX-bepinex-plugins");
    });

    it("refuses a MelonLoader mod while BepInEx is installed", async () => {
      const { ext, error } = await withAnswer({ "Mod.dll": MELON_MOD }, ["XXX-bepinex"]);
      assert.equal(error.message, "User canceled");
      assert.match(
        wrongLoader(ext)[2].bbcode,
        /has MelonLoader plugins, but you have installed BepInEx\..*change your mod loader to MelonLoader\./,
      );
    });

    it("lets a plugin through for the loader that is installed, without a dialog", async () => {
      for (const [entries, mods] of [
        [{ "Foo.dll": BEPINEX_PLUGIN }, ["XXX-bepinex"]],
        [{ "Mod.dll": MELON_MOD }, ["XXX-melonloader"]],
        [{ "Foo.dll": BEPINEX_PLUGIN }, []],
      ]) {
        const { ext, error } = await withAnswer(entries, mods);
        assert.equal(error, undefined);
        assert.deepEqual(ext.dialogs, []);
      }
    });

    it("refuses an archive that holds plugins for both loaders", async () => {
      const { ext, error } = await withAnswer(
        { "Foo.dll": BEPINEX_PLUGIN, "Mod.dll": MELON_MOD },
        [],
      );
      assert.equal(error.message, "User canceled");
      const [type, title, content, buttons] = ext.dialogs[0];
      assert.deepEqual([type, title, buttons], ["error", "Mixed Mod Detected", [{ label: "Ok" }]]);
      assert.match(
        content.bbcode,
        /has both BepInEx and MelonLoader plugins in the same archive\./,
      );
    });

    it("sorts a mixed archive as MelonLoader when preventPluginInstall is off", async () => {
      const { instructions, error } = await withAnswer(
        { "Foo.dll": BEPINEX_PLUGIN, "Mod.dll": MELON_MOD },
        [],
        setConst("preventPluginInstall", "false"),
      );
      assert.equal(error, undefined);
      assert.equal(instructions.at(-1).value, "XXX-melonloader-mods");
    });
  });

  describe("with a custom mod loader", () => {
    const CUSTOM_DLL = "built for CustomLoaderPlugin";

    it("sorts a custom loader plugin to the plugin type, or the mod type beside a mods folder", async () => {
      const loose = await sortPlugins({ "Custom.dll": CUSTOM_DLL }, { transform: customLoader });
      assert.deepEqual(loose.instructions, [
        copy("Custom.dll", "Custom.dll"),
        modType("XXX-customloaderplugin"),
      ]);
      const folder = await sortPlugins(
        { "mods/Custom.dll": CUSTOM_DLL },
        { transform: customLoader },
      );
      assert.deepEqual(folder.instructions, [
        copy(sep("mods", "Custom.dll"), sep("mods", "Custom.dll")),
        modType("XXX-customloadermod"),
      ]);
    });

    it("tells a custom loader plugin from a BepInEx plugin by the plugin string first", async () => {
      const { instructions } = await sortPlugins(
        { "Custom.dll": `${CUSTOM_DLL} BepInEx` },
        { transform: customLoader },
      );
      assert.equal(instructions.at(-1).value, "XXX-customloaderplugin");
    });

    it("does not look for custom plugins unless the custom loader is on", async () => {
      const { instructions } = await sortPlugins({ "Custom.dll": CUSTOM_DLL });
      assert.deepEqual(instructions.at(-1), {});
    });

    it("refuses a custom plugin while BepInEx or MelonLoader is installed", async () => {
      for (const loader of ["XXX-bepinex", "XXX-melonloader"]) {
        const ext = await boot({
          transform: customLoader,
          state: stateFor({ gameDir: makeGameDir(), mods: modsOf(loader) }),
        });
        answerDialogs(ext, pick("Ok"));
        const { workingDir, files } = stage({ "Custom.dll": CUSTOM_DLL }, "Mod Archive.installing");
        await assert.rejects(installerOf(ext, "XXX-plugin").install(files, workingDir), {
          message: "User canceled",
        });
        const [, title, content] = ext.dialogs[0];
        assert.equal(title, "Wrong Mod Loader");
        assert.match(
          content.bbcode,
          /has XXX plugins, but you have installed BepInEx or MelonLoader\./,
        );
        assert.match(content.bbcode, /The installation will be cancelled to avoid issues\./);
        assert.match(content.bbcode, /change your mod loader to MelonLoader\./);
      }
    });

    it("words the custom plugin refusal differently when preventPluginInstall is off", async () => {
      const ext = await boot({
        transform: all(customLoader, setConst("preventPluginInstall", "false")),
        state: stateFor({ gameDir: makeGameDir(), mods: modsOf("XXX-bepinex") }),
      });
      answerDialogs(ext, pick("Ok"));
      const { workingDir, files } = stage({ "Custom.dll": CUSTOM_DLL }, "Mod Archive.installing");
      const { instructions } = await installerOf(ext, "XXX-plugin").install(files, workingDir);
      assert.equal(instructions.at(-1).value, "XXX-customloaderplugin");
      assert.match(
        ext.dialogs[0][2].bbcode,
        /The mod will not be loaded unless the correct mod loader is installed\./,
      );
    });

    it("refuses a BepInEx or MelonLoader plugin while the custom loader is installed", async () => {
      for (const [entries, name] of [
        [{ "Foo.dll": BEPINEX_PLUGIN }, "BepInEx plugin"],
        [{ "Mod.dll": MELON_MOD }, "MelonLoader mod"],
      ]) {
        const ext = await boot({
          transform: customLoader,
          state: stateFor({ gameDir: makeGameDir(), mods: modsOf("XXX-customloader") }),
        });
        answerDialogs(ext, pick("Ok"));
        const { workingDir, files } = stage(entries, "Mod Archive.installing");
        await assert.rejects(
          installerOf(ext, "XXX-plugin").install(files, workingDir),
          {
            message: "User canceled",
          },
          name,
        );
        assert.match(
          ext.dialogs[0][2].bbcode,
          /has BepInEx\/MelonLoader plugins, but you have installed XXX\./,
          name,
        );
      }
    });
  });
});

// Runs `run` with members of the vortex-api `util` stub replaced, and puts it back afterwards.
async function withUtil(overrides, run) {
  const { util } = vortex.vortexApi;
  const saved = Object.keys(overrides).map((key) => [key, Object.hasOwn(util, key), util[key]]);
  Object.assign(util, overrides);
  try {
    return await run();
  } finally {
    for (const [key, existed, value] of saved) {
      if (existed) util[key] = value;
      else delete util[key];
    }
  }
}

// Presses the "More" action on a notification and returns the dialog it opens.
function openMore(ext, notification, dismiss = () => {}) {
  const before = ext.dialogs.length;
  notification.actions.find(({ title }) => title === "More").action(dismiss);
  assert.equal(ext.dialogs.length, before + 1);
  return ext.dialogs.at(-1);
}

const buttonOf = (dialog, label) => dialog[3].find((button) => button.label === label);

// Fills in {{name}} placeholders the way Vortex's translate does.
const interpolate = (text, options) =>
  text.replace(/\{\{(\w+)\}\}/g, (match, key) => options?.replace?.[key] ?? match);

describe("template-unitymelonloaderbepinex-hybrid: fallback and unknown dll notices", () => {
  const STAGING = path.join(vortex.APP_ROOT, "staging", "XXX");

  async function fallbackNotice(archive = "My Cool Mod.installing", mods = {}) {
    const state = stateFor({ gameDir: makeGameDir() });
    Object.assign(state.persistent.mods.XXX, mods);
    const ext = await boot({ state });
    const { instructions } = await installerOf(ext, "XXX-fallback").install(
      tree("a.txt", "dir/b.txt"),
      path.join("C:", "staging", archive),
    );
    return { ext, instructions, notification: ext.notifications[0] };
  }

  it("installs every file where it is, sets no mod type, and warns the user", async () => {
    const { ext, instructions, notification } = await fallbackNotice();
    assert.deepEqual(instructions, [
      copy("a.txt", "a.txt"),
      copy(sep("dir", "b.txt"), sep("dir", "b.txt")),
    ]);
    assert.equal(ext.notifications.length, 1);
    assert.deepEqual(
      [notification.id, notification.type, notification.message, notification.allowSuppress],
      ["XXX-MyCoolMod-fallback", "info", "Fallback installer reached for My Cool Mod", true],
    );
    assert.deepEqual(
      notification.actions.map(({ title }) => title),
      ["More"],
    );
  });

  it("keeps the notice id to twenty characters of the mod's name", async () => {
    const { notification } = await fallbackNotice("A Rather Long Mod Name Indeed.installing");
    assert.equal(notification.id, "XXX-ARatherLongModNameIn-fallback");
  });

  it("explains the fallback and offers three ways forward", async () => {
    const { ext, notification } = await fallbackNotice();
    const dialog = openMore(ext, notification);
    assert.deepEqual(dialog.slice(0, 2), [
      "question",
      "Fallback installer reached for My Cool Mod",
    ]);
    assert.match(dialog[2].text, /reached the fallback installer\./);
    assert.match(dialog[2].text, /Mod Name: My Cool Mod\./);
    assert.deepEqual(labelsOf(dialog), [
      "Continue",
      "Contact Ext. Developer",
      "Open Mod Page + Staging Folder",
    ]);
  });

  it("Continue just dismisses the notice", async () => {
    const { ext, notification } = await fallbackNotice();
    let dismissed = 0;
    const dialog = openMore(ext, notification, () => dismissed++);
    buttonOf(dialog, "Continue").action();
    assert.equal(dismissed, 1);
  });

  it("Contact Ext. Developer opens the extension's posts tab", async () => {
    const { ext, notification } = await fallbackNotice();
    const opened = stubShell();
    let dismissed = 0;
    notification.actions[0].action(() => dismissed++);
    ext.dialogs.at(-1)[3][1].action();
    assert.deepEqual(opened, ["XXX?tab=posts"]);
    assert.equal(dismissed, 1);
  });

  it("Open Mod Page opens the staging folder and the Nexus page of the mod it can match", async () => {
    const { ext, notification } = await fallbackNotice("My Cool Mod.installing", {
      matched: { id: "matched", installationPath: "My Cool Mod", attributes: { modId: 4242 } },
    });
    const opened = stubShell();
    let dismissed = 0;
    notification.actions[0].action(() => dismissed++);
    ext.dialogs.at(-1)[3][2].action();
    assert.deepEqual(opened, [
      path.join(STAGING, "My Cool Mod"),
      "https://www.nexusmods.com/XXX/mods/4242?tab=description",
    ]);
    assert.equal(dismissed, 1);
  });

  it("Open Mod Page falls back to the game's mod list when it cannot match the mod", async () => {
    const { ext, notification } = await fallbackNotice("My Cool Mod.installing", {
      other: { id: "other", installationPath: "Another Mod", attributes: { modId: 1 } },
      nomodid: { id: "nomodid", installationPath: "My Cool Mod", attributes: {} },
    });
    const opened = stubShell();
    notification.actions[0].action(() => {});
    ext.dialogs.at(-1)[3][2].action();
    assert.equal(opened.at(-1), "https://www.nexusmods.com/XXX/mods/");
  });

  it("reports a shell that will not open the folder or page, without offering to report it", async () => {
    const { ext, notification } = await fallbackNotice();
    globalThis.window = {
      api: {
        shell: {
          openUrl: () => {
            throw new Error("no url");
          },
          openFile: () => {
            throw new Error("no file");
          },
        },
      },
    };
    notification.actions[0].action(() => {});
    const buttons = ext.dialogs.at(-1)[3];
    buttons[1].action();
    buttons[2].action();
    assert.deepEqual(
      ext.errors.map(([message, error, options]) => [message, error.message, options]),
      [
        ["Failed to open the URL", "no url", { allowReport: false }],
        ["Failed to open the file or folder", "no file", { allowReport: false }],
        ["Failed to open the URL", "no url", { allowReport: false }],
      ],
    );
  });

  it("the unknown dll notice words its dialog for dlls and offers the same three buttons", async () => {
    const { ext } = await sortPlugins({ "Foo.dll": UNKNOWN_DLL });
    const dialog = openMore(ext, ext.notifications[0]);
    assert.deepEqual(dialog.slice(0, 2), ["question", "Unknown DLL File in mod: Mod Archive"]);
    assert.match(dialog[2].text, /contains dll files that don't appear to use any know mod loader/);
    assert.match(dialog[2].text, /Mod Name: Mod Archive\./);
    assert.deepEqual(labelsOf(dialog), [
      "Continue",
      "Contact Ext. Developer",
      "Open Mod Page + Staging Folder",
    ]);
  });

  it("the unknown dll notice's buttons open the extension page and the mod's pages", async () => {
    const { ext } = await sortPlugins({ "Foo.dll": UNKNOWN_DLL });
    const opened = stubShell();
    ext.notifications[0].actions[0].action(() => {});
    const buttons = ext.dialogs.at(-1)[3];
    buttons[1].action();
    buttons[2].action();
    assert.deepEqual(opened, [
      "XXX?tab=posts",
      path.join(STAGING, "Mod Archive"),
      "https://www.nexusmods.com/XXX/mods/",
    ]);
  });
});

describe("template-unitymelonloaderbepinex-hybrid: choosing a mod loader", () => {
  // Runs setup in a fresh game folder; `choose` answers the loader dialog.
  async function setupWith({ transform, mods = {}, choose = pick("Cancel"), nexus } = {}) {
    const gameDir = makeGameDir();
    const ext = await boot({ transform, state: stateFor({ gameDir, mods }) });
    ext.api.translate = interpolate;
    answerDialogs(ext, choose);
    if (nexus) Object.assign(ext.api.ext, nexus);
    const events = answerDeployEvents(ext);
    await ext.game.setup({ path: gameDir });
    return { ext, gameDir, events };
  }

  const loaderDialog = (ext) => ext.dialogs.find(([, title]) => title === "Mod Loader Selection");

  it("asks which loader to install when neither is installed, recommending MelonLoader", async () => {
    const { ext } = await setupWith();
    const [type, title, content, buttons] = loaderDialog(ext);
    assert.deepEqual([type, title], ["info", "Mod Loader Selection"]);
    assert.deepEqual(buttons, [{ label: "BepInEx" }, { label: "MelonLoader (Recommended)" }]);
    assert.match(
      content.bbcode,
      /^You must choose a mod loader to install mods\.\[br\]\[\/br\]\[br\]\[\/br\]/,
    );
    assert.match(content.bbcode, /Which mod loader would you like to use for XXX\?$/);
  });

  it("recommends BepInEx under its full name when recommendedLoader is bep", async () => {
    const { ext } = await setupWith({ transform: setConst("recommendedLoader", '"bep"') });
    assert.deepEqual(loaderDialog(ext)[3], [
      { label: "BepInEx Injector (Recommended)" },
      { label: "MelonLoader" },
    ]);
  });

  it("offers the custom loader first, always marked recommended, when there is one", async () => {
    const { ext } = await setupWith({ transform: customLoader });
    assert.deepEqual(loaderDialog(ext)[3], [
      { label: "XXX (Recommended)" },
      { label: "BepInEx" },
      { label: "MelonLoader (Recommended)" },
    ]);
  });

  it("does not ask when a loader is already installed", async () => {
    for (const loader of ["XXX-bepinex", "XXX-melonloader"]) {
      const { ext } = await setupWith({ mods: modsOf(loader) });
      assert.equal(loaderDialog(ext), undefined, loader);
    }
    const { ext } = await setupWith({ transform: customLoader, mods: modsOf("XXX-customloader") });
    assert.equal(loaderDialog(ext), undefined);
  });

  it("downloads the BepInEx Bleeding Edge build when BepInEx is picked", async () => {
    const { ext } = await setupWith({ choose: pick("BepInEx") });
    const [name, gameId, requirements, check] = ext.fake.calls[0];
    assert.deepEqual([name, gameId, check], ["downloadBepinexBe", "XXX", true]);
    assert.equal(requirements.length, 1);
    assert.equal(requirements[0].modType, "XXX-bepinex");
    assert.deepEqual(callNames(ext), ["downloadBepinexBe"]);
  });

  it("downloads the stable MelonLoader release when MelonLoader is picked", async () => {
    const { ext } = await setupWith({ choose: pick("MelonLoader (Recommended)") });
    const [name, requirements, force] = ext.fake.calls[0];
    assert.deepEqual([name, force], ["download", false]);
    assert.equal(requirements.length, 1);
    assert.equal(requirements[0].archiveFileName, "MelonLoader.x64.zip");
  });

  it("downloads the nightly MelonLoader when useMelonNightly is on", async () => {
    const { ext } = await setupWith({
      transform: setConst("useMelonNightly", "true"),
      choose: pick("MelonLoader (Recommended)"),
    });
    assert.equal(ext.fake.calls[0][1][0].archiveFileName, "MelonLoader.Windows.x64.CI.Release.zip");
  });

  it("downloads the stable BepInEx release for a Mono game", async () => {
    const { ext } = await setupWith({ transform: mono, choose: pick("BepInEx") });
    const [name, requirements, force] = ext.fake.calls[0];
    assert.deepEqual([name, force], ["download", false]);
    assert.equal(requirements[0].archiveFileName, "BepInEx_win_x64_5.4.23.5.zip");
  });

  it("does nothing when the dialog is dismissed or answered with something else", async () => {
    for (const choose of [() => undefined, pick("Cancel")]) {
      const { ext } = await setupWith({ choose });
      assert.deepEqual(ext.fake.calls, []);
    }
  });

  it("installs the loader without asking when loaderChoice is off", async () => {
    const bep = await setupWith({ transform: bepinexLoader });
    assert.equal(loaderDialog(bep.ext), undefined);
    assert.deepEqual(callNames(bep.ext), ["downloadBepinexBe"]);
    const mel = await setupWith({ transform: melonLoader });
    assert.equal(loaderDialog(mel.ext), undefined);
    assert.deepEqual(callNames(mel.ext), ["download"]);
    assert.equal(mel.ext.fake.calls[0][1][0].archiveFileName, "MelonLoader.x64.zip");
  });

  it("downloads BepInEx from the game's Nexus page when it has one", async () => {
    const files = [
      { category_id: 1, file_id: 11, uploaded_timestamp: 100, name: "old", file_name: "old.zip" },
      { category_id: 1, file_id: 12, uploaded_timestamp: 300, name: "new", file_name: "new.zip" },
      { category_id: 2, file_id: 13, uploaded_timestamp: 900, name: "opt", file_name: "opt.zip" },
    ];
    const gameDir = makeGameDir();
    const ext = await boot({ transform: nexusBepinex, state: stateFor({ gameDir }) });
    answerDialogs(ext, pick("BepInEx"));
    ext.api.ext.nexusGetModFiles = async () => files;
    const seen = answerDownloadEvents(ext);
    await ext.game.setup({ path: gameDir });
    assert.deepEqual(ext.fake.calls, []);
    assert.equal(seen[0].urls[0], "nxm://XXX/mods/100/files/12");
  });

  it("restarts the extension after a loader is chosen when mod type paths depend on it", async () => {
    for (const transform of [customMods, setConst("loaderSwitchRestart", "true")]) {
      const gameDir = makeGameDir();
      const ext = await boot({ transform, state: stateFor({ gameDir }) });
      const events = answerDeployEvents(ext);
      answerDialogs(ext, (args) =>
        args[1] === "Mod Loader Selection"
          ? { action: "BepInEx" }
          : { action: "Restart Extension" },
      );
      await ext.game.setup({ path: gameDir });
      await waitFor(() => events.includes("purge-mods"));
      assert.deepEqual(events, ["deploy-mods", "purge-mods"]);
      const restart = ext.dialogs.find(([, title]) => title === "Restart Required");
      assert.equal(restart[0], "info");
      assert.deepEqual(restart[3], [{ label: "Restart Extension" }]);
      assert.match(
        restart[2].text,
        /The extension requires a restart to complete the Mod Loader setup\./,
      );
      assert.deepEqual(
        ext.dispatched.map(({ type, payload }) => [type, payload]),
        [
          ["setDeploymentNecessary", ["XXX", true]],
          ["setNextProfile", [undefined]],
        ],
      );
    }
  });

  it("reports a restart that fails to purge, without offering to report it", async () => {
    const gameDir = makeGameDir();
    const ext = await boot({ transform: customMods, state: stateFor({ gameDir }) });
    ext.api.events.on("deploy-mods", (callback) => callback(null));
    ext.api.events.on("purge-mods", (_clean, callback) => callback(new Error("purge broke")));
    answerDialogs(ext, (args) =>
      args[1] === "Mod Loader Selection" ? { action: "BepInEx" } : { action: "Restart Extension" },
    );
    await ext.game.setup({ path: gameDir });
    await waitFor(() => ext.errors.length > 0);
    const [message, error, options] = ext.errors[0];
    assert.deepEqual(
      [message, error.message, options],
      ["Failed to set up Mod Loader", "purge broke", { allowReport: false }],
    );
    assert.deepEqual(ext.dispatched, []);
  });
});

describe("template-unitymelonloaderbepinex-hybrid: more than one mod loader installed", () => {
  async function conflict({ transform, mods, choose, removeFails = false, gameFiles = [] }) {
    const gameDir = makeGameDir(gameFiles);
    const ext = await boot({ transform, state: stateFor({ gameDir, mods }) });
    ext.api.translate = interpolate;
    answerDialogs(ext, choose);
    const removed = [];
    await withUtil(
      {
        removeMods: async (_api, gameId, ids) => {
          removed.push([gameId, ids]);
          if (removeFails) throw new Error("cannot remove");
        },
      },
      () => ext.game.setup({ path: gameDir }),
    );
    return { ext, removed };
  }
  const both = {
    a: { id: "bep-id", type: "XXX-bepinex" },
    b: { id: "mel-id", type: "XXX-melonloader" },
    c: { id: "cus-id", type: "XXX-customloader" },
  };
  const only = (...keys) => Object.fromEntries(keys.map((key) => [key, both[key]]));
  const conflictDialog = (ext) => ext.dialogs.find(([, title]) => title === "Mod Loader Conflict");

  it("asks which one to keep, warning that both crash the game", async () => {
    const { ext } = await conflict({ mods: only("a", "b"), choose: pick("Cancel") });
    const [type, title, content, buttons] = conflictDialog(ext);
    assert.deepEqual([type, title], ["info", "Mod Loader Conflict"]);
    assert.deepEqual(buttons, [{ label: "BepInEx" }, { label: "MelonLoader" }]);
    assert.match(content.bbcode, /^You have more than one mod loader installed\./);
    assert.match(content.bbcode, /This will cause the game to crash at launch\./);
    assert.match(content.bbcode, /which mod loader you would like to use for XXX\.$/);
  });

  it("removes MelonLoader when BepInEx is kept", async () => {
    const { removed } = await conflict({ mods: only("a", "b"), choose: pick("BepInEx") });
    assert.deepEqual(removed, [["XXX", ["mel-id"]]]);
  });

  it("removes BepInEx when MelonLoader is kept", async () => {
    const { removed } = await conflict({ mods: only("a", "b"), choose: pick("MelonLoader") });
    assert.deepEqual(removed, [["XXX", ["bep-id"]]]);
  });

  it("removes nothing when the dialog is dismissed or answered with something else", async () => {
    for (const choose of [() => undefined, pick("Cancel")]) {
      const { removed } = await conflict({ mods: only("a", "b"), choose });
      assert.deepEqual(removed, []);
    }
  });

  it("with a custom loader, offers it first and removes the other two when it is kept", async () => {
    const { ext, removed } = await conflict({
      transform: customLoader,
      mods: only("a", "b", "c"),
      choose: pick("XXX (Recommended)"),
    });
    assert.deepEqual(conflictDialog(ext)[3], [
      { label: "XXX (Recommended)" },
      { label: "BepInEx" },
      { label: "MelonLoader" },
    ]);
    assert.deepEqual(removed, [
      ["XXX", ["mel-id"]],
      ["XXX", ["bep-id"]],
    ]);
  });

  it("with a custom loader that has an installer, keeping BepInEx or MelonLoader removes the others", async () => {
    const marker = ["XXX_Data/Managed/XXX.dll"];
    const keepBepinex = await conflict({
      transform: customLoaderWithInstaller,
      mods: only("a", "b", "c"),
      choose: pick("BepInEx"),
      gameFiles: marker,
    });
    assert.deepEqual(keepBepinex.removed, [
      ["XXX", ["mel-id"]],
      ["XXX", ["cus-id"]],
    ]);
    const keepMelon = await conflict({
      transform: customLoaderWithInstaller,
      mods: only("a", "b", "c"),
      choose: pick("MelonLoader"),
      gameFiles: marker,
    });
    assert.deepEqual(keepMelon.removed, [
      ["XXX", ["bep-id"]],
      ["XXX", ["cus-id"]],
    ]);
  });

  it("known gap: without an installer the custom loader is judged by a marker file it never has, so it stays and the user is told to run an installer", async () => {
    const { ext, removed } = await conflict({
      transform: customLoader,
      mods: only("a", "b", "c"),
      choose: pick("BepInEx"),
    });
    // Only MelonLoader goes; the custom loader mod is still installed beside BepInEx.
    assert.deepEqual(removed, [["XXX", ["mel-id"]]]);
    assert.equal(
      ext.notifications.some(({ id }) => id === "XXX-custominstaller"),
      true,
    );
  });

  it("resolves a custom loader against BepInEx alone", async () => {
    const { removed } = await conflict({
      transform: customLoader,
      mods: only("a", "c"),
      choose: pick("XXX (Recommended)"),
    });
    assert.deepEqual(removed, [["XXX", ["bep-id"]]]);
  });

  it("reports a loader it cannot remove, without offering to report it", async () => {
    const { ext } = await conflict({
      mods: only("a", "b"),
      choose: pick("BepInEx"),
      removeFails: true,
    });
    const [message, error, options] = ext.errors[0];
    assert.deepEqual(
      [message, error.message, options],
      ["Failed to remove MelonLoader", "cannot remove", { allowReport: false }],
    );
  });

  it("removes the installer's files too when the custom loader has an installer", async () => {
    const gameDir = makeGameDir(["winhttp.dll", "XXX_Data/Managed/XXX.dll", "other.txt"]);
    const ext = await boot({
      transform: customLoaderWithInstaller,
      state: stateFor({ gameDir, mods: only("a", "c") }),
    });
    answerDialogs(ext, pick("BepInEx"));
    await withUtil({ removeMods: async () => undefined }, () => ext.game.setup({ path: gameDir }));
    assert.equal(fs.existsSync(path.join(gameDir, "winhttp.dll")), false);
    assert.equal(fs.existsSync(path.join(gameDir, "XXX_Data", "Managed", "XXX.dll")), false);
    assert.equal(fs.existsSync(path.join(gameDir, "other.txt")), true);
  });

  it("restarts the extension after resolving a conflict when mod type paths depend on the loader", async () => {
    const gameDir = makeGameDir();
    const ext = await boot({
      transform: customMods,
      state: stateFor({ gameDir, mods: only("a", "b") }),
    });
    const events = answerDeployEvents(ext);
    answerDialogs(ext, (args) =>
      args[1] === "Mod Loader Conflict" ? { action: "BepInEx" } : { action: "Restart Extension" },
    );
    await withUtil({ removeMods: async () => undefined }, () => ext.game.setup({ path: gameDir }));
    await waitFor(() => events.includes("purge-mods"));
    assert.deepEqual(events, ["deploy-mods", "purge-mods"]);
  });
});

const topFolders = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

describe("template-unitymelonloaderbepinex-hybrid: setup", () => {
  // Runs setup against a game folder holding `gameFiles`, with a loader already installed so the
  // loader dialog stays out of the way unless a test wants it.
  async function runSetup({ transform, mods = modsOf("XXX-melonloader"), gameFiles = [] } = {}) {
    const gameDir = makeGameDir(gameFiles);
    const ext = await boot({ transform, state: stateFor({ gameDir, mods }) });
    const suppressed = [];
    ext.api.suppressNotification = (id) => suppressed.push(id);
    await ext.game.setup({ path: gameDir });
    return { ext, gameDir, suppressed };
  }
  const ids = (ext) => ext.notifications.map(({ id }) => id);

  it("creates the loaders' folders and the data folder in the game folder", async () => {
    const { gameDir } = await runSetup();
    assert.deepEqual(topFolders(gameDir), [
      "BepInEx",
      "Mods",
      "Plugins",
      "UserData",
      "UserLibs",
      "XXX_Data",
    ]);
    assert.deepEqual(topFolders(path.join(gameDir, "BepInEx")), ["config", "patchers", "plugins"]);
  });

  it("an XNA game only gets the BepInEx folders", async () => {
    const { gameDir } = await runSetup({ transform: xna, mods: modsOf("XXX-bepinex") });
    assert.deepEqual(topFolders(gameDir), ["BepInEx"]);
  });

  it("a Mono game also gets the managed folder its assembly lives in", async () => {
    const { gameDir } = await runSetup({ transform: mono });
    assert.deepEqual(topFolders(path.join(gameDir, "XXX_Data")), ["Managed"]);
  });

  it("custom mod and custom loader folders are created when those features are on", async () => {
    const { gameDir } = await runSetup({ transform: all(customMods, customLoader) });
    assert.deepEqual(topFolders(path.join(gameDir, "BepInEx", "plugins")), ["XXX"]);
    assert.deepEqual(topFolders(path.join(gameDir, "Mods")), ["XXX"]);
    assert.equal(topFolders(gameDir).includes("XXX"), true);
  });

  it("an Xbox install gets its assets folder below Managed, and mod types follow it", async () => {
    const { ext, gameDir } = await runSetup({ gameFiles: ["gamelaunchhelper.exe"] });
    assert.deepEqual(topFolders(path.join(gameDir, "XXX_Data")), ["Managed"]);
    const assets = ext.modTypes.find(({ id }) => id === "XXX-assets");
    assert.equal(assets.getPath({ id: GAME_ID }), sep(gameDir, "XXX_Data", "Managed"));
  });

  it("a build with its own executable gets that build's data folder", async () => {
    const { gameDir } = await runSetup({ transform: multiExe, gameFiles: ["ALT.exe"] });
    assert.equal(topFolders(gameDir).includes("ALT_Data"), true);
    assert.deepEqual(topFolders(path.join(gameDir, "ALT_Data")), ["Managed"]);
  });

  it("shows the special instructions notice only when setupNotification is on", async () => {
    const off = await runSetup();
    assert.equal(ids(off.ext).includes("XXX-setup-notify"), false);
    const { ext, suppressed } = await runSetup({
      transform: setConst("setupNotification", "true"),
    });
    const notice = ext.notifications.find(({ id }) => id === "XXX-setup-notify");
    assert.deepEqual(
      [notice.type, notice.message, notice.allowSuppress],
      ["warning", "Special Setup Instructions", true],
    );
    let dismissed = 0;
    const dialog = openMore(ext, notice, () => dismissed++);
    assert.deepEqual(dialog.slice(0, 2), ["question", "Special Setup Instructions"]);
    assert.deepEqual(labelsOf(dialog), ["Acknowledge", "Never Show Again"]);
    buttonOf(dialog, "Acknowledge").action();
    buttonOf(dialog, "Never Show Again").action();
    assert.equal(dismissed, 2);
    assert.deepEqual(suppressed, ["XXX-setup-notify"]);
  });

  describe("BepInExConfigManager offer", () => {
    it("asks whether to download it once BepInEx is installed", async () => {
      const { ext } = await runSetup({ mods: modsOf("XXX-bepinex") });
      const notice = ext.notifications.find(({ id }) => id === "XXX-bepcfgman");
      assert.deepEqual(
        [notice.type, notice.message, notice.allowSuppress],
        ["warning", "Would you like to download BepInExConfigManager?", true],
      );
      assert.deepEqual(
        notice.actions.map(({ title }) => title),
        ["Download BepCfgMan", "More"],
      );
    });

    it("downloads it from the notice's button and closes the notice", async () => {
      const { ext } = await runSetup({ mods: modsOf("XXX-bepinex") });
      const notice = ext.notifications.find(({ id }) => id === "XXX-bepcfgman");
      let dismissed = 0;
      notice.actions[0].action(() => dismissed++);
      await waitFor(() => callNames(ext).includes("download"));
      const [, requirements, force] = ext.fake.calls.find(([name]) => name === "download");
      assert.equal(requirements[0].modType, "XXX-bepcfgman");
      assert.equal(force, false);
      assert.equal(dismissed, 1);
    });

    it("explains it in a dialog with download, not now and never buttons", async () => {
      const { ext, suppressed } = await runSetup({ mods: modsOf("XXX-bepinex") });
      const notice = ext.notifications.find(({ id }) => id === "XXX-bepcfgman");
      let dismissed = 0;
      const dialog = openMore(ext, notice, () => dismissed++);
      assert.deepEqual(dialog.slice(0, 2), [
        "question",
        "Would you like to download BepInExConfigManager?",
      ]);
      assert.match(dialog[2].text, /the default key to show the configuration menu is F1\./);
      assert.deepEqual(labelsOf(dialog), [
        "Download BepInExConfigManager",
        "Not Now",
        "Never Show Again",
      ]);
      buttonOf(dialog, "Download BepInExConfigManager").action();
      buttonOf(dialog, "Not Now").action();
      buttonOf(dialog, "Never Show Again").action();
      assert.equal(dismissed, 3);
      assert.deepEqual(suppressed, ["XXX-bepcfgman"]);
      await waitFor(() => callNames(ext).includes("download"));
    });

    it("does not ask when it is already installed, when BepInEx is not the loader, or when it is off", async () => {
      const installed = await runSetup({ mods: modsOf("XXX-bepinex", "XXX-bepcfgman") });
      assert.equal(ids(installed.ext).includes("XXX-bepcfgman"), false);
      const melon = await runSetup({ mods: modsOf("XXX-melonloader") });
      assert.equal(ids(melon.ext).includes("XXX-bepcfgman"), false);
      const off = await runSetup({
        mods: modsOf("XXX-bepinex"),
        transform: setConst("allowBepCfgMan", "false"),
      });
      assert.equal(ids(off.ext).includes("XXX-bepcfgman"), false);
    });
  });

  describe("MelonPreferencesManager offer", () => {
    const allowed = setConst("allowMelPrefMan", "true");

    it("is off by default", async () => {
      const { ext } = await runSetup();
      assert.equal(ids(ext).includes("XXX-melonprefman"), false);
    });

    it("asks whether to download it once MelonLoader is installed", async () => {
      const { ext } = await runSetup({ transform: allowed });
      const notice = ext.notifications.find(({ id }) => id === "XXX-melonprefman");
      assert.deepEqual(
        [notice.type, notice.message, notice.allowSuppress],
        ["warning", "Would you like to download MelonPreferencesManager?", true],
      );
      assert.deepEqual(
        notice.actions.map(({ title }) => title),
        ["Download MelPrefMan", "More"],
      );
    });

    it("downloads it from the notice's button, as a managed mod", async () => {
      const { ext } = await runSetup({ transform: allowed });
      const notice = ext.notifications.find(({ id }) => id === "XXX-melonprefman");
      let dismissed = 0;
      notice.actions[0].action(() => dismissed++);
      await waitFor(() => callNames(ext).includes("download"));
      const [, requirements, force] = ext.fake.calls.find(([name]) => name === "download");
      assert.equal(requirements[0].directCopyAsMod, true);
      assert.equal(force, false);
      assert.equal(dismissed, 1);
    });

    it("explains it in a dialog with download, not now and never buttons", async () => {
      const { ext, suppressed } = await runSetup({ transform: allowed });
      const notice = ext.notifications.find(({ id }) => id === "XXX-melonprefman");
      const dialog = openMore(ext, notice);
      assert.match(dialog[2].text, /the default key to show the configuration menu is F5\./);
      assert.match(dialog[2].text, /installed as a managed mod/);
      assert.deepEqual(labelsOf(dialog), [
        "Download MelonPreferencesManager",
        "Not Now",
        "Never Show Again",
      ]);
      buttonOf(dialog, "Never Show Again").action();
      assert.deepEqual(suppressed, ["XXX-melonprefman"]);
      buttonOf(dialog, "Download MelonPreferencesManager").action();
      await waitFor(() => callNames(ext).includes("download"));
    });

    it("does not ask when it is installed as a mod, or when an old loose copy is in the Mods folder", async () => {
      const asMod = await runSetup({
        transform: allowed,
        mods: modsOf("XXX-melonloader", "XXX-melonprefman"),
      });
      assert.equal(ids(asMod.ext).includes("XXX-melonprefman"), false);
      const loose = await runSetup({
        transform: allowed,
        gameFiles: ["Mods/MelonPrefManager.IL2CPP.dll"],
      });
      assert.equal(ids(loose.ext).includes("XXX-melonprefman"), false);
    });
  });

  describe(".NET check for MelonLoader on IL2CPP", () => {
    const reg = (values) => ({
      WithRegOpen: (hive, key, callback) => {
        reg.opened.push([hive, key]);
        callback("hkey");
      },
      RegEnumValues: () => values,
    });
    reg.opened = [];
    const dotnetNotice = (ext) =>
      ext.notifications.filter(({ id }) => id === "XXX-dotnetmelon-notify");

    it("stays quiet when the .NET 6 desktop runtime is installed", async () => {
      reg.opened = [];
      const { ext } = await withWinapi(reg([{ key: "5.0.1" }, { key: "6.0.25" }]), () =>
        runSetup(),
      );
      assert.deepEqual(dotnetNotice(ext), []);
      assert.deepEqual(reg.opened, [
        [
          "HKEY_LOCAL_MACHINE",
          "SOFTWARE\\WOW6432Node\\dotnet\\Setup\\InstalledVersions\\x64\\sharedfx\\Microsoft.WindowsDesktop.App",
        ],
      ]);
    });

    it("warns when only other .NET versions are installed", async () => {
      const { ext } = await withWinapi(reg([{ key: "5.0.1" }, { key: "7.0.0" }]), () => runSetup());
      const [notice] = dotnetNotice(ext);
      assert.deepEqual(
        [notice.type, notice.message, notice.allowSuppress],
        ["warning", ".NET 6 Required", true],
      );
      assert.equal(dotnetNotice(ext).length, 1);
    });

    it("warns, and logs, when the registry key cannot be read", async () => {
      const { ext } = await runSetup();
      assert.equal(dotnetNotice(ext).length > 0, true);
      assert.ok(
        vortex.logs.some(
          ({ level, message }) =>
            level === "warn" && message.startsWith("Failed to read .NET registry key:"),
        ),
      );
    });

    it("warns when the key has no entries at all", async () => {
      const { ext } = await withWinapi({ WithRegOpen: () => undefined }, () => runSetup());
      assert.equal(dotnetNotice(ext).length > 0, true);
    });

    it("does not check for BepInEx, for a Mono game, or for an XNA game", async () => {
      const bepinex = await runSetup({ mods: modsOf("XXX-bepinex") });
      assert.deepEqual(dotnetNotice(bepinex.ext), []);
      const monoGame = await runSetup({ transform: mono });
      assert.deepEqual(dotnetNotice(monoGame.ext), []);
    });

    it("downloads .NET from the notice's button, and explains it in a dialog", async () => {
      const { ext, suppressed } = await withWinapi(reg([]), () => runSetup());
      const [notice] = dotnetNotice(ext);
      assert.deepEqual(
        notice.actions.map(({ title }) => title),
        ["Download .NET 6", "More"],
      );
      const opened = stubShell();
      let dismissed = 0;
      notice.actions[0].action(() => dismissed++);
      assert.deepEqual(opened, ["https://dotnet.microsoft.com/download/dotnet/6.0"]);
      const dialog = openMore(ext, notice, () => dismissed++);
      assert.match(dialog[2].text, /MelonLoader requires \.NET 6 to be installed/);
      assert.deepEqual(labelsOf(dialog), ["Download .NET 6", "Not Now", "Never Show Again"]);
      buttonOf(dialog, "Download .NET 6").action();
      buttonOf(dialog, "Not Now").action();
      buttonOf(dialog, "Never Show Again").action();
      assert.equal(dismissed, 4);
      assert.deepEqual(opened, Array(2).fill("https://dotnet.microsoft.com/download/dotnet/6.0"));
      assert.deepEqual(suppressed, ["XXX-dotnetmelon-notify"]);
    });

    it("reports a shell that will not open the download page", async () => {
      const { ext } = await withWinapi(reg([]), () => runSetup());
      const [notice] = dotnetNotice(ext);
      globalThis.window = {
        api: {
          shell: {
            openUrl: () => {
              throw new Error("no url");
            },
          },
        },
      };
      notice.actions[0].action(() => {});
      openMore(ext, notice);
      buttonOf(ext.dialogs.at(-1), "Download .NET 6").action();
      assert.deepEqual(
        ext.errors.map(([message, error, options]) => [message, error.message, options]),
        [
          ["Failed to open the URL", "no url", { allowReport: false }],
          ["Failed to open the URL", "no url", { allowReport: false }],
        ],
      );
    });
  });

  it("points the MelonPreferencesManager legacy copy at the game folder, not the empty path it was built with", async () => {
    const gameDir = makeGameDir();
    const ext = await boot({
      transform: setConst("allowMelPrefMan", "true"),
      state: stateFor({ gameDir, mods: modsOf("XXX-melonloader") }),
    });
    const requirementsAsked = async () => {
      ext.fake.calls.length = 0;
      await ext.listeners
        .find(({ args }) => args[0] === "check-mods-version")
        .args[1](GAME_ID, {}, false);
      return ext.fake.calls
        .filter(([name]) => name === "testRequirementVersion")
        .map(([, req]) => req);
    };
    const [, before] = await requirementsAsked();
    assert.equal(before.directCopyPath, sep("Mods", "melonprefmanager.il2cpp.dll"));
    await ext.game.setup({ path: gameDir });
    const [, after] = await requirementsAsked();
    assert.equal(after.directCopyPath, sep(gameDir, "Mods", "melonprefmanager.il2cpp.dll"));
  });
});

describe("template-unitymelonloaderbepinex-hybrid: version checks", () => {
  // Asks for a version check the way Vortex does and returns what the downloader modules saw.
  async function versionCheck({ transform, mods = {}, gameId = GAME_ID } = {}) {
    const ext = await boot({ transform, state: stateFor({ gameDir: makeGameDir(), mods }) });
    const handler = ext.listeners.find(({ args }) => args[0] === "check-mods-version").args[1];
    await handler(gameId, {}, false);
    const tested = ext.fake.calls
      .filter(([name]) => name === "testRequirementVersion")
      .map(([, req]) => req);
    const beChecks = ext.fake.calls.filter(([name]) => name === "checkForBepinexBeUpdate");
    return { ext, tested, beChecks };
  }
  const archives = (tested) => tested.map(({ archiveFileName }) => archiveFileName);

  it("checks MelonLoader's requirement when MelonLoader is installed", async () => {
    const { tested, beChecks } = await versionCheck({ mods: modsOf("XXX-melonloader") });
    assert.deepEqual(archives(tested), ["MelonLoader.x64.zip"]);
    assert.deepEqual(beChecks, []);
  });

  it("checks only the loader that is installed, MelonLoader winning when both are", async () => {
    const { tested, beChecks } = await versionCheck({
      mods: modsOf("XXX-melonloader", "XXX-bepinex"),
    });
    assert.deepEqual(archives(tested), ["MelonLoader.x64.zip"]);
    assert.equal(beChecks.length, 1);
  });

  it("checks the preferences manager as well when it is allowed", async () => {
    const { tested } = await versionCheck({
      transform: setConst("allowMelPrefMan", "true"),
      mods: modsOf("XXX-melonloader"),
    });
    assert.deepEqual(archives(tested), ["MelonLoader.x64.zip", "MelonPrefManager.IL2CPP.dll"]);
  });

  it("checks the nightly MelonLoader build when useMelonNightly is on", async () => {
    const { tested } = await versionCheck({
      transform: setConst("useMelonNightly", "true"),
      mods: modsOf("XXX-melonloader"),
    });
    assert.deepEqual(archives(tested), ["MelonLoader.Windows.x64.CI.Release.zip"]);
  });

  it("does not check a MelonLoader fork served from the game's Nexus page", async () => {
    const { tested } = await versionCheck({
      transform: nexusMelon,
      mods: modsOf("XXX-melonloader"),
    });
    assert.deepEqual(tested, []);
    const withPrefMan = await versionCheck({
      transform: all(nexusMelon, setConst("allowMelPrefMan", "true")),
      mods: modsOf("XXX-melonloader"),
    });
    assert.deepEqual(archives(withPrefMan.tested), ["MelonPrefManager.IL2CPP.dll"]);
  });

  it("checks the Bleeding Edge build and the config manager when an IL2CPP game has BepInEx", async () => {
    const { ext, tested, beChecks } = await versionCheck({ mods: modsOf("XXX-bepinex") });
    assert.deepEqual(archives(tested), ["BepInEx.ConfigurationManager_IL2CPP_v19.0.zip"]);
    assert.equal(beChecks.length, 1);
    const [, gameId, requirements] = beChecks[0];
    assert.equal(gameId, "XXX");
    assert.equal(requirements.length, 1);
    assert.equal(requirements[0].modType, "XXX-bepinex");
    assert.deepEqual(callNames(ext), ["testRequirementVersion", "checkForBepinexBeUpdate"]);
  });

  it("checks the stable release instead of the Bleeding Edge build for a Mono game", async () => {
    const { tested, beChecks } = await versionCheck({
      transform: mono,
      mods: modsOf("XXX-bepinex"),
    });
    assert.deepEqual(archives(tested), [
      "BepInEx_win_x64_5.4.23.5.zip",
      "BepInEx.ConfigurationManager_BepInEx5_v19.0.zip",
    ]);
    assert.deepEqual(beChecks, []);
  });

  it("leaves out the config manager when it is off", async () => {
    const { tested, beChecks } = await versionCheck({
      transform: setConst("allowBepCfgMan", "false"),
      mods: modsOf("XXX-bepinex"),
    });
    assert.deepEqual(tested, []);
    assert.equal(beChecks.length, 1);
  });

  it("does not check a BepInEx fork served from the game's Nexus page", async () => {
    const il2cpp = await versionCheck({ transform: nexusBepinex, mods: modsOf("XXX-bepinex") });
    assert.deepEqual(archives(il2cpp.tested), ["BepInEx.ConfigurationManager_IL2CPP_v19.0.zip"]);
    assert.deepEqual(il2cpp.beChecks, []);
    const monoGame = await versionCheck({
      transform: all(mono, nexusBepinex),
      mods: modsOf("XXX-bepinex"),
    });
    assert.deepEqual(archives(monoGame.tested), [
      "BepInEx.ConfigurationManager_BepInEx5_v19.0.zip",
    ]);
  });

  it("checks nothing when no loader is installed, or for another game", async () => {
    const none = await versionCheck();
    assert.deepEqual(none.ext.fake.calls, []);
    const other = await versionCheck({ mods: modsOf("XXX-melonloader"), gameId: "someothergame" });
    assert.deepEqual(other.ext.fake.calls, []);
  });

  it("logs, rather than throws, when a check fails", async () => {
    const ext = await boot({
      failTest: "offline",
      state: stateFor({ gameDir: makeGameDir(), mods: modsOf("XXX-melonloader") }),
    });
    const handler = ext.listeners.find(({ args }) => args[0] === "check-mods-version").args[1];
    await handler(GAME_ID, {}, false);
    assert.ok(
      vortex.logs.some(
        ({ level, message }) =>
          level === "warn" && message === "Failed to test requirement version: Error: offline",
      ),
    );
  });

  it("logs when the checks complete", async () => {
    await versionCheck({ mods: modsOf("XXX-melonloader") });
    assert.ok(
      vortex.logs.some(
        ({ level, message }) => level === "warn" && message === "Checked requirements versions",
      ),
    );
  });
});

describe("template-unitymelonloaderbepinex-hybrid: the loaders' requirements", () => {
  // The requirement objects each loader hands to the downloader modules.
  async function requirementsFor(loader, transform) {
    const ext = await boot({
      transform,
      state: stateFor({ gameDir: makeGameDir(), mods: modsOf(loader) }),
    });
    const handler = ext.listeners.find(({ args }) => args[0] === "check-mods-version").args[1];
    await handler(GAME_ID, {}, false);
    const tested = ext.fake.calls
      .filter(([name]) => name === "testRequirementVersion")
      .map(([, req]) => req);
    const be = ext.fake.calls.find(([name]) => name === "checkForBepinexBeUpdate")?.[2] ?? [];
    ext.fake.calls.length = 0;
    return { ext, tested, be };
  }

  it("MelonLoader: GitHub release, matched by an anchored name, installed only by the user's choice", async () => {
    const {
      ext,
      tested: [req],
    } = await requirementsFor("XXX-melonloader");
    assert.deepEqual(
      [
        req.archiveFileName,
        req.modType,
        req.assemblyFileName,
        req.userFacingName,
        req.githubUrl,
        req.autoInstall,
      ],
      [
        "MelonLoader.x64.zip",
        "XXX-melonloader",
        "MelonLoader.dll",
        "MelonLoader",
        "https://api.github.com/repos/LavaGang/MelonLoader",
        false,
      ],
    );
    assert.equal(req.fileArchivePattern.test("MelonLoader.x64.zip"), true);
    assert.equal(req.fileArchivePattern.test("melonloader.X64.ZIP"), true);
    assert.equal(req.fileArchivePattern.test("MelonLoader.x64.CI.zip"), false);
    assert.equal(req.fileArchivePattern.test("MelonLoader.x86.zip"), false);
    assert.equal(req.fileArchivePattern.test("xMelonLoader.x64.zip"), false);
    await req.findMod("api");
    assert.equal(req.findDownloadId("api"), "download-1");
    await req.resolveVersion("api");
    assert.deepEqual(ext.fake.calls, [
      ["findModByFile", "XXX-melonloader", "MelonLoader.dll"],
      ["findDownloadIdByFile", "MelonLoader.x64.zip"],
      ["resolveVersionByModVersion", req],
    ]);
  });

  it("MelonLoader nightly: a CI artifact resolved from the newest successful run", async () => {
    const {
      ext,
      tested: [req],
    } = await requirementsFor("XXX-melonloader", setConst("useMelonNightly", "true"));
    assert.deepEqual(
      [
        req.archiveFileName,
        req.nightlyUrl,
        req.nightlyWorkflow,
        req.nightlyBranch,
        req.autoInstall,
      ],
      [
        "MelonLoader.Windows.x64.CI.Release.zip",
        "https://nightly.link/LavaGang/MelonLoader/workflows/build/alpha-development/MelonLoader.Windows.x64.CI.Release.zip",
        "build.yml",
        "alpha-development",
        false,
      ],
    );
    assert.equal(req.findDownloadId, undefined);
    await req.findMod("api");
    await req.resolveVersion("api");
    assert.deepEqual(ext.fake.calls, [
      ["findModByFile", "XXX-melonloader", "MelonLoader.dll"],
      ["resolveVersionByNightlyRun", req],
    ]);
  });

  it("x86 games take the x86 MelonLoader archive", async () => {
    const {
      tested: [req],
    } = await requirementsFor("XXX-melonloader", setConst("ARCH", '"x86"'));
    assert.equal(req.archiveFileName, "MelonLoader.x86.zip");
    assert.equal(req.fileArchivePattern.test("MelonLoader.x86.zip"), true);
    assert.equal(req.fileArchivePattern.test("MelonLoader.x64.zip"), false);
  });

  it("BepInEx Mono: the win-x64 release asset, versioned from the release tag", async () => {
    const {
      ext,
      tested: [req],
    } = await requirementsFor("XXX-bepinex", mono);
    assert.deepEqual(
      [
        req.archiveFileName,
        req.modType,
        req.assemblyFileName,
        req.userFacingName,
        req.githubUrl,
        req.autoInstall,
      ],
      [
        "BepInEx_win_x64_5.4.23.5.zip",
        "XXX-bepinex",
        "BepInEx.dll",
        "BepInEx Injector",
        "https://api.github.com/repos/BepInEx/BepInEx",
        false,
      ],
    );
    assert.equal(req.fileArchivePattern.test("BepInEx_win_x64_5.4.23.5.zip"), true);
    assert.equal(req.fileArchivePattern.test("BepInEx_win_x86_5.4.23.5.zip"), false);
    assert.equal(req.fileArchivePattern.test("BepInEx_linux_x64_5.4.23.5.zip"), false);
    await req.findMod("api");
    assert.equal(req.findDownloadId("api"), "download-1");
    await req.resolveVersion("api");
    assert.deepEqual(ext.fake.calls, [
      ["findModByFile", "XXX-bepinex", "BepInEx.dll"],
      ["findDownloadIdByFile", "BepInEx_win_x64_5.4.23.5.zip"],
      ["resolveVersionByModVersion", req],
    ]);
  });

  it("BepInEx Bleeding Edge: the IL2CPP artifact for the architecture, with a recorded fallback build", async () => {
    const {
      be: [req],
    } = await requirementsFor("XXX-bepinex");
    assert.deepEqual(
      [
        req.modType,
        req.userFacingName,
        req.fallbackBuild,
        req.fallbackArtifactUrl,
        req.autoInstall,
      ],
      [
        "XXX-bepinex",
        "BepInEx Injector",
        "788",
        "https://builds.bepinex.dev/projects/bepinex_be/788/BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.788%2B5b766a3.zip",
        false,
      ],
    );
    assert.equal(
      req.artifactPattern.test("BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.788+5b766a3.zip"),
      true,
    );
    assert.equal(
      req.artifactPattern.test("BepInEx-Unity.IL2CPP-win-x86-6.0.0-be.788+5b766a3.zip"),
      false,
    );
    assert.equal(
      req.artifactPattern.test("BepInEx-Unity.Mono-win-x64-6.0.0-be.788+5b766a3.zip"),
      false,
    );
    assert.equal(req.artifactPattern.global, false);
  });

  it("BepInEx Bleeding Edge for an XNA game takes the .NET Framework artifact", async () => {
    const {
      be: [req],
    } = await requirementsFor("XXX-bepinex", xna);
    assert.equal(
      req.fallbackArtifactUrl,
      "https://builds.bepinex.dev/projects/bepinex_be/788/BepInEx-NET.Framework-net452-win-x86-6.0.0-be.788%2B5b766a3.zip",
    );
    assert.equal(
      req.artifactPattern.test("BepInEx-NET.Framework-net452-win-x86-6.0.0-be.788+5b766a3.zip"),
      true,
    );
    assert.equal(
      req.artifactPattern.test("BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.788+5b766a3.zip"),
      false,
    );
  });

  it("BepInExConfigManager: the build for the game's runtime, versioned from the archive name", async () => {
    const il2cpp = await requirementsFor("XXX-bepinex");
    const [req] = il2cpp.tested;
    assert.deepEqual(
      [
        req.archiveFileName,
        req.modType,
        req.assemblyFileName,
        req.userFacingName,
        req.githubUrl,
        req.autoInstall,
      ],
      [
        "BepInEx.ConfigurationManager_IL2CPP_v19.0.zip",
        "XXX-bepcfgman",
        "configurationmanager.dll",
        "BepInExConfigManager",
        "https://api.github.com/repos/BepInEx/BepInEx.ConfigurationManager",
        false,
      ],
    );
    assert.equal(
      req.fileArchivePattern.exec("BepInEx.ConfigurationManager_IL2CPP_v19.0.zip")[1],
      "19.0",
    );
    assert.equal(
      req.fileArchivePattern.exec("BepInEx.ConfigurationManager_IL2CPP_v19.0.1.zip")[1],
      "19.0.1",
    );
    assert.equal(
      req.fileArchivePattern.test("BepInEx.ConfigurationManager_BepInEx5_v19.0.zip"),
      false,
    );
    await req.findMod("api");
    assert.equal(req.findDownloadId("api"), "download-1");
    await req.resolveVersion("api");
    assert.deepEqual(il2cpp.ext.fake.calls, [
      ["findModByFile", "XXX-bepcfgman", "configurationmanager.dll"],
      ["findDownloadIdByFile", "BepInEx.ConfigurationManager_IL2CPP_v19.0.zip"],
      ["resolveVersionByPattern", req],
    ]);
    const monoGame = await requirementsFor("XXX-bepinex", mono);
    assert.equal(
      monoGame.tested[1].fileArchivePattern.test("BepInEx.ConfigurationManager_BepInEx5_v19.0.zip"),
      true,
    );
  });

  it("MelonPreferencesManager: a bare dll copied in as a managed mod", async () => {
    const {
      ext,
      tested: [, req],
    } = await requirementsFor("XXX-melonloader", setConst("allowMelPrefMan", "true"));
    assert.deepEqual(
      [req.archiveFileName, req.modType, req.assemblyFileName, req.userFacingName, req.githubUrl],
      [
        "MelonPrefManager.IL2CPP.dll",
        "XXX-melonprefman",
        "melonprefmanager.il2cpp.dll",
        "MelonPreferencesManager",
        "https://api.github.com/repos/Bluscream/MelonPreferencesManager",
      ],
    );
    assert.deepEqual([req.directCopyAsMod, req.autoInstall], [true, false]);
    assert.equal(req.fileArchivePattern.test("MelonPrefManager.IL2CPP.dll"), true);
    assert.equal(req.fileArchivePattern.test("MelonPrefManager.Mono.dll"), false);
    assert.equal(req.fileArchivePattern.test("MelonPrefManager.IL2CPP.dll.sig"), false);
    await req.findMod("api");
    await req.resolveVersion("api");
    assert.deepEqual(ext.fake.calls, [
      ["findModByFile", "XXX-melonprefman", "melonprefmanager.il2cpp.dll"],
      ["resolveVersionByModVersion", req],
    ]);
  });

  it("a Mono game takes the Mono MelonPreferencesManager", async () => {
    const {
      tested: [, req],
    } = await requirementsFor("XXX-melonloader", all(mono, setConst("allowMelPrefMan", "true")));
    assert.equal(req.archiveFileName, "MelonPrefManager.Mono.dll");
    assert.equal(req.assemblyFileName, "melonprefmanager.mono.dll");
  });
});

describe("template-unitymelonloaderbepinex-hybrid: after a deployment or a purge", () => {
  const listener = (ext, name) => ext.listeners.find(({ args }) => args[0] === name).args[1];

  async function afterDeploy({
    transform,
    mods = {},
    gameFiles = [],
    profile = "profile",
    choose,
  } = {}) {
    const gameDir = makeGameDir(gameFiles);
    const ext = await boot({ transform, state: stateFor({ gameDir, mods }) });
    if (choose) answerDialogs(ext, choose);
    const result = listener(ext, "did-deploy")(profile, {});
    assert.ok(result instanceof Promise);
    await result;
    return ext;
  }
  const titles = (ext) => ext.dialogs.map(([, title]) => title);

  it("ignores a deployment for a profile that is not the game's last active one", async () => {
    const ext = await afterDeploy({ profile: "another" });
    assert.deepEqual(ext.dialogs, []);
  });

  it("asks which loader to install when none is installed", async () => {
    const ext = await afterDeploy();
    assert.deepEqual(titles(ext), ["Mod Loader Selection"]);
  });

  it("asks which loader to keep when more than one is installed", async () => {
    const ext = await afterDeploy({ mods: modsOf("XXX-bepinex", "XXX-melonloader") });
    assert.deepEqual(titles(ext), ["Mod Loader Conflict"]);
  });

  it("stays quiet when exactly one loader is installed", async () => {
    const ext = await afterDeploy({ mods: modsOf("XXX-bepinex") });
    assert.deepEqual(ext.dialogs, []);
    assert.deepEqual(ext.notifications, []);
  });

  it("checks for the .NET runtime when MelonLoader is installed on an IL2CPP game", async () => {
    const ext = await afterDeploy({ mods: modsOf("XXX-melonloader") });
    assert.equal(
      ext.notifications.some(({ id }) => id === "XXX-dotnetmelon-notify"),
      true,
    );
    const monoGame = await afterDeploy({ transform: mono, mods: modsOf("XXX-melonloader") });
    assert.deepEqual(monoGame.notifications, []);
  });

  it("reminds the user to run the custom loader's installer when its marker file is missing", async () => {
    const ext = await afterDeploy({
      transform: customLoaderWithInstaller,
      mods: modsOf("XXX-customloader"),
    });
    const [notice] = ext.notifications;
    assert.deepEqual(
      [notice.id, notice.type, notice.message],
      ["XXX-custominstaller", "warning", "Run XXX Installer"],
    );
    const done = await afterDeploy({
      transform: customLoaderWithInstaller,
      mods: modsOf("XXX-customloader"),
      gameFiles: ["XXX_Data/Managed/XXX.dll"],
    });
    assert.deepEqual(done.notifications, []);
  });

  it("does nothing after a purge unless there is a custom loader", async () => {
    const ext = await boot({ state: stateFor({ gameDir: makeGameDir() }) });
    await listener(ext, "did-purge")("profile");
    assert.deepEqual(ext.dialogs, []);
    assert.deepEqual(ext.notifications, []);
  });

  it("ignores a purge for a profile that is not the game's last active one", async () => {
    const ext = await boot({
      transform: customLoader,
      state: stateFor({ gameDir: makeGameDir() }),
    });
    await listener(ext, "did-purge")("another");
    assert.deepEqual(ext.dialogs, []);
  });

  it("asks which loader to install after a purge left the custom-loader game with none", async () => {
    const ext = await boot({
      transform: customLoader,
      state: stateFor({ gameDir: makeGameDir() }),
    });
    await listener(ext, "did-purge")("profile");
    assert.deepEqual(titles(ext), ["Mod Loader Selection"]);
  });

  it("removes the custom loader's installed files after a purge", async () => {
    const gameDir = makeGameDir(["winhttp.dll", "XXX_Data/Managed/XXX.dll", "other.txt"]);
    const ext = await boot({
      transform: customLoaderWithInstaller,
      state: stateFor({ gameDir, mods: modsOf("XXX-customloader") }),
    });
    await listener(ext, "did-purge")("profile");
    assert.equal(fs.existsSync(path.join(gameDir, "winhttp.dll")), false);
    assert.equal(fs.existsSync(path.join(gameDir, "XXX_Data", "Managed", "XXX.dll")), false);
    assert.equal(fs.existsSync(path.join(gameDir, "other.txt")), true);
    assert.ok(
      vortex.logs.some(({ message }) =>
        message.startsWith("Found XXX files to remove for deconfliction/purge:"),
      ),
    );
  });

  it("logs a file it could not remove and carries on", async () => {
    const gameDir = makeGameDir(["XXX_Data/Managed/XXX.dll"]);
    const ext = await boot({
      transform: customLoaderWithInstaller,
      state: stateFor({ gameDir, mods: modsOf("XXX-customloader") }),
    });
    await listener(ext, "did-purge")("profile");
    assert.equal(fs.existsSync(path.join(gameDir, "XXX_Data", "Managed", "XXX.dll")), false);
    assert.ok(
      vortex.logs.some(
        ({ level, message }) =>
          level === "warn" &&
          message.startsWith(`Failed to remove ${path.join(gameDir, "winhttp.dll")}:`),
      ),
    );
  });

  it("known gap: a purge reminds the user to run an installer a mod-based custom loader does not have", async () => {
    const ext = await boot({
      transform: customLoader,
      state: stateFor({ gameDir: makeGameDir(), mods: modsOf("XXX-customloader") }),
    });
    await listener(ext, "did-purge")("profile");
    assert.deepEqual(
      ext.notifications.map(({ id }) => id),
      ["XXX-custominstaller"],
    );
  });
});

const md5 = (text) => crypto.createHash("md5").update(text).digest("hex");

// Runs `run` with the exe-version stub's getProductVersion replaced.
async function withExeVersion(impl, run) {
  const stub = require("exe-version");
  const saved = stub.getProductVersion;
  stub.getProductVersion = impl;
  try {
    return await run();
  } finally {
    stub.getProductVersion = saved;
  }
}

// A game folder inside a Steam library: <library>/steamapps/common/Game, with appmanifests.
function steamGame({ manifests = {}, files = [] } = {}) {
  const library = makeTempDir();
  const gameDir = path.join(library, "steamapps", "common", "Game");
  fs.mkdirSync(gameDir, { recursive: true });
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(gameDir, file)), { recursive: true });
    fs.writeFileSync(path.join(gameDir, file), file);
  }
  for (const [appId, buildId] of Object.entries(manifests)) {
    fs.writeFileSync(
      path.join(library, "steamapps", `appmanifest_${appId}.acf`),
      `"AppState"\n{\n\t"appid"\t\t"${appId}"\n\t"buildid"\t\t"${buildId}"\n}\n`,
    );
  }
  return gameDir;
}

describe("template-unitymelonloaderbepinex-hybrid: game version", () => {
  const versionOf = async (gameDir, transform) => {
    const ext = await boot({ transform });
    return ext.game.getGameVersion(gameDir);
  };

  describe("from a version file", () => {
    const withFile = setConst("hasVersionFile", "true");

    it("reads the version out of the data folder's Version.info", async () => {
      const gameDir = makeGameDir();
      fs.mkdirSync(path.join(gameDir, "XXX_Data"));
      fs.writeFileSync(
        path.join(gameDir, "XXX_Data", "Version.info"),
        "Game build version 1.2.3 end",
      );
      assert.equal(await versionOf(gameDir, withFile), "1.2.3");
    });

    it("honours the version file's separator and index", async () => {
      const gameDir = makeGameDir();
      fs.mkdirSync(path.join(gameDir, "XXX_Data"));
      fs.writeFileSync(path.join(gameDir, "XXX_Data", "Version.info"), "a,b,7.8.9");
      assert.equal(
        await versionOf(
          gameDir,
          all(withFile, setConst("VER_SPLIT", '","'), setConst("VER_IDX", "2")),
        ),
        "7.8.9",
      );
    });

    it("falls through to the other sources, and logs, when the file is missing", async () => {
      assert.equal(await versionOf(makeGameDir(), withFile), STUB_EXE_VERSION);
      assert.ok(
        vortex.logs.some(
          ({ level, message }) =>
            level === "warn" &&
            message.startsWith("Could not read Version.info file to get game version:"),
        ),
      );
    });

    it("ignores the file unless hasVersionFile is on", async () => {
      const gameDir = makeGameDir();
      fs.mkdirSync(path.join(gameDir, "XXX_Data"));
      fs.writeFileSync(path.join(gameDir, "XXX_Data", "Version.info"), "a b c 1.2.3");
      assert.equal(await versionOf(gameDir), STUB_EXE_VERSION);
    });
  });

  describe("for the Xbox build", () => {
    it("reads appxmanifest.xml", async () => {
      const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
      fs.writeFileSync(
        path.join(gameDir, "appxmanifest.xml"),
        '<Package><Identity Name="x" Version="4.5.6.0"/></Package>',
      );
      assert.equal(await versionOf(gameDir), "4.5.6.0");
    });

    it("reports 0.0.0, and logs, when the manifest cannot be read", async () => {
      assert.equal(await versionOf(makeGameDir(["gamelaunchhelper.exe"])), "0.0.0");
      assert.ok(
        vortex.logs.some(
          ({ level, message }) =>
            level === "error" &&
            message.startsWith("Could not read appmanifest.xml file to get Xbox game version:"),
        ),
      );
    });

    it("is not looked for when the Xbox logic is off", async () => {
      const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
      fs.writeFileSync(
        path.join(gameDir, "appxmanifest.xml"),
        '<Package><Identity Version="9.9"/></Package>',
      );
      assert.equal(await versionOf(gameDir, noXbox), STUB_EXE_VERSION);
    });

    it("known gap: a build with its own executable is taken for the Xbox build and reports 0.0.0", async () => {
      // The alt build's marker is the same "xbox" string, so the manifest lookup runs for an
      // Epic or GOG build that has no manifest, and the store and hash sources are never tried.
      const gameDir = makeGameDir(["ALT.exe"]);
      assert.equal(await versionOf(gameDir, multiExe), "0.0.0");
    });
  });

  describe("from the executable", () => {
    it("reads the product version when the game stamps its real version there", async () => {
      const gameDir = makeGameDir();
      const read = [];
      const version = await withExeVersion(
        (file) => {
          read.push(file);
          return "9.8.7.6";
        },
        async () => versionOf(gameDir, setConst("exeHasGameVersion", "true")),
      );
      assert.equal(version, "9.8.7.6");
      assert.deepEqual(read, [path.join(gameDir, "XXX.exe")]);
    });

    it("moves on to the store and hash sources when that read fails", async () => {
      const gameDir = makeGameDir(["GameAssembly.dll"]);
      const version = await withExeVersion(
        () => {
          throw new Error("no version resource");
        },
        async () => versionOf(gameDir, setConst("exeHasGameVersion", "true")),
      );
      assert.equal(version, md5(md5("")));
      assert.ok(
        vortex.logs.some(
          ({ level, message }) =>
            level === "error" &&
            message.includes("file to get game version: Error: no version resource"),
        ),
      );
    });

    it("is the last resort, after the hash, and reports 0.0.0 when it fails too", async () => {
      const failing = () => {
        throw new Error("no version resource");
      };
      assert.equal(await withExeVersion(failing, () => versionOf(makeGameDir())), "0.0.0");
      assert.equal(await versionOf(makeGameDir()), STUB_EXE_VERSION);
    });
  });

  describe("from the store", () => {
    it("reads the Steam build id of the game's own app id", async () => {
      const gameDir = steamGame({ manifests: { 480: "9876543" } });
      assert.equal(await versionOf(gameDir, setConst("STEAMAPP_ID", '"480"')), "9876543");
    });

    it("tries the demo's app id when the game's manifest is not in the library", async () => {
      const gameDir = steamGame({ manifests: { 481: "111222" } });
      assert.equal(
        await versionOf(
          gameDir,
          all(setConst("STEAMAPP_ID", '"480"'), setConst("STEAMAPP_ID_DEMO", '"481"')),
        ),
        "111222",
      );
    });

    it("ignores app ids that are still placeholders", async () => {
      const gameDir = steamGame({ manifests: { XXX: "5" } });
      assert.equal(await versionOf(gameDir), STUB_EXE_VERSION);
    });

    it("needs the game to be inside a Steam library", async () => {
      const gameDir = makeGameDir();
      assert.equal(await versionOf(gameDir, setConst("STEAMAPP_ID", '"480"')), STUB_EXE_VERSION);
    });

    describe("Epic", () => {
      const withEpic = setConst("EPICAPP_ID", '"epicapp"');
      const manifestsIn = (dataPath, items) => {
        fs.mkdirSync(path.join(dataPath, "Manifests"), { recursive: true });
        for (const [name, content] of Object.entries(items)) {
          fs.writeFileSync(
            path.join(dataPath, "Manifests", name),
            typeof content === "string" ? content : JSON.stringify(content),
          );
        }
      };
      const registryAt = (dataPath, seen = []) => ({
        RegGetValue: (hive, key, name) => {
          seen.push([hive, key, name]);
          return { value: dataPath };
        },
      });

      it("finds the manifest by app name in the launcher's data folder from the registry", async () => {
        const dataPath = makeTempDir();
        manifestsIn(dataPath, {
          "a.item": {
            AppName: "epicapp",
            InstallLocation: "elsewhere",
            AppVersionString: "1.0.7-epic",
          },
        });
        const seen = [];
        const version = await withWinapi(registryAt(dataPath, seen), () =>
          versionOf(makeGameDir(), withEpic),
        );
        assert.equal(version, "1.0.7-epic");
        assert.deepEqual(seen, [
          [
            "HKEY_LOCAL_MACHINE",
            "SOFTWARE\\WOW6432Node\\Epic Games\\EpicGamesLauncher",
            "AppDataPath",
          ],
        ]);
      });

      it("finds the manifest by install location, ignoring case", async () => {
        const dataPath = makeTempDir();
        const gameDir = makeGameDir();
        manifestsIn(dataPath, {
          "a.item": {
            AppName: "other",
            InstallLocation: gameDir.toUpperCase(),
            AppVersionString: "2.0",
          },
        });
        assert.equal(
          await withWinapi(registryAt(dataPath), () => versionOf(gameDir, withEpic)),
          "2.0",
        );
      });

      it("skips files that are not manifests, manifests it cannot parse, and manifests without a version", async () => {
        const dataPath = makeTempDir();
        manifestsIn(dataPath, {
          "a.txt": { AppName: "epicapp", AppVersionString: "wrong" },
          "b.item": "not json",
          "c.item": { AppName: "epicapp" },
          "d.item": {
            AppName: "other",
            InstallLocation: "elsewhere",
            AppVersionString: "wrong too",
          },
          "e.ITEM": { AppName: "epicapp", AppVersionString: "3.1" },
        });
        assert.equal(
          await withWinapi(registryAt(dataPath), () => versionOf(makeGameDir(), withEpic)),
          "3.1",
        );
      });

      it("falls back to the launcher's default data folder when the registry has no entry", async () => {
        const programData = makeTempDir();
        manifestsIn(path.join(programData, "Epic", "EpicGamesLauncher", "Data"), {
          "a.item": { AppName: "epicapp", AppVersionString: "4.2" },
        });
        const saved = process.env.ProgramData;
        process.env.ProgramData = programData;
        try {
          assert.equal(await versionOf(makeGameDir(), withEpic), "4.2");
        } finally {
          process.env.ProgramData = saved;
        }
      });

      it("logs, and moves on, when the manifests folder is missing", async () => {
        const dataPath = makeTempDir();
        const version = await withWinapi(registryAt(dataPath), () =>
          versionOf(makeGameDir(), withEpic),
        );
        assert.equal(version, STUB_EXE_VERSION);
        assert.ok(
          vortex.logs.some(
            ({ level, message }) =>
              level === "warn" && message.startsWith("Could not read Epic manifests for XXX:"),
          ),
        );
      });

      it("is skipped while the Epic app id is a placeholder", async () => {
        const dataPath = makeTempDir();
        manifestsIn(dataPath, { "a.item": { AppName: "XXX", AppVersionString: "5.0" } });
        assert.equal(
          await withWinapi(registryAt(dataPath), () => versionOf(makeGameDir())),
          STUB_EXE_VERSION,
        );
      });
    });

    describe("GOG", () => {
      const withGog = setConst("GOGAPP_ID", '"gogapp"');
      const gogRegistry = (installedAt, version, seen = []) => ({
        RegGetValue: (hive, key, name) => {
          seen.push([hive, key, name]);
          if (name === "path") return { value: installedAt };
          if (name === "ver") return { value: version };
          throw new Error("registry key not found (stub)");
        },
      });

      it("reads the version GOG recorded for this install", async () => {
        const gameDir = makeGameDir();
        const seen = [];
        const version = await withWinapi(gogRegistry(gameDir, "1.0.5", seen), () =>
          versionOf(gameDir, withGog),
        );
        assert.equal(version, "1.0.5");
        const key = "SOFTWARE\\WOW6432Node\\GOG.com\\Games\\gogapp";
        assert.deepEqual(seen, [
          ["HKEY_LOCAL_MACHINE", key, "path"],
          ["HKEY_LOCAL_MACHINE", key, "ver"],
        ]);
      });

      it("compares the install path ignoring case", async () => {
        const gameDir = makeGameDir();
        const version = await withWinapi(gogRegistry(gameDir.toUpperCase(), "1.0.6"), () =>
          versionOf(gameDir, withGog),
        );
        assert.equal(version, "1.0.6");
      });

      it("ignores a GOG install somewhere else, and a missing registry key", async () => {
        const gameDir = makeGameDir();
        assert.equal(
          await withWinapi(gogRegistry(makeGameDir(), "1.0.7"), () => versionOf(gameDir, withGog)),
          STUB_EXE_VERSION,
        );
        assert.equal(await versionOf(gameDir, withGog), STUB_EXE_VERSION);
      });

      it("is skipped while the GOG app id is a placeholder", async () => {
        const gameDir = makeGameDir();
        assert.equal(
          await withWinapi(gogRegistry(gameDir, "1.0.8"), () => versionOf(gameDir)),
          STUB_EXE_VERSION,
        );
      });
    });

    it("prefers Steam, then Epic, then GOG", async () => {
      const gameDir = steamGame({ manifests: { 480: "777" } });
      const dataPath = makeTempDir();
      fs.mkdirSync(path.join(dataPath, "Manifests"));
      fs.writeFileSync(
        path.join(dataPath, "Manifests", "a.item"),
        JSON.stringify({ AppName: "epicapp", AppVersionString: "epic" }),
      );
      const both = all(
        setConst("STEAMAPP_ID", '"480"'),
        setConst("EPICAPP_ID", '"epicapp"'),
        setConst("GOGAPP_ID", '"gogapp"'),
      );
      const registry = {
        RegGetValue: (_hive, _key, name) => ({
          value: name === "AppDataPath" ? dataPath : gameDir,
        }),
      };
      assert.equal(await withWinapi(registry, () => versionOf(gameDir, both)), "777");
      const noSteam = steamGame();
      assert.equal(
        await withWinapi(
          {
            RegGetValue: (_hive, _key, name) => ({
              value: name === "AppDataPath" ? dataPath : noSteam,
            }),
          },
          () => versionOf(noSteam, both),
        ),
        "epic",
      );
    });
  });

  describe("from a hash of the game's code", () => {
    it("hashes the IL2CPP game assembly", async () => {
      const gameDir = makeGameDir();
      fs.writeFileSync(path.join(gameDir, "GameAssembly.dll"), "il2cpp code");
      assert.equal(await versionOf(gameDir), md5(md5("il2cpp code")));
    });

    it("hashes both managed assemblies of a Mono game, in order", async () => {
      const gameDir = makeGameDir();
      fs.mkdirSync(path.join(gameDir, "XXX_Data", "Managed"), { recursive: true });
      fs.writeFileSync(path.join(gameDir, "XXX_Data", "Managed", "Assembly-CSharp.dll"), "first");
      fs.writeFileSync(
        path.join(gameDir, "XXX_Data", "Managed", "Assembly-CSharp-firstpass.dll"),
        "second",
      );
      assert.equal(await versionOf(gameDir, mono), md5(md5("first") + md5("second")));
    });

    it("hashes the game's own dll for an XNA game", async () => {
      const gameDir = makeGameDir();
      fs.writeFileSync(path.join(gameDir, "XXX.dll"), "xna code");
      assert.equal(await versionOf(gameDir, xna), md5(md5("xna code")));
    });

    it("moves on to the executable's version when an assembly is missing", async () => {
      const gameDir = makeGameDir();
      fs.mkdirSync(path.join(gameDir, "XXX_Data", "Managed"), { recursive: true });
      fs.writeFileSync(path.join(gameDir, "XXX_Data", "Managed", "Assembly-CSharp.dll"), "first");
      assert.equal(await versionOf(gameDir, mono), STUB_EXE_VERSION);
      assert.ok(
        vortex.logs.some(
          ({ level, message }) =>
            level === "warn" && message.startsWith("Could not compute hash game version for XXX:"),
        ),
      );
    });

    it("hashes each build once, and again when a file's modified time changes", async () => {
      const gameDir = makeGameDir();
      const dll = path.join(gameDir, "GameAssembly.dll");
      fs.writeFileSync(dll, "il2cpp code");
      const ext = await boot();
      const hashed = [];
      await withUtil(
        {
          fileMD5: async (file) => {
            hashed.push(file);
            return md5(fs.readFileSync(file));
          },
        },
        async () => {
          const first = await ext.game.getGameVersion(gameDir);
          const second = await ext.game.getGameVersion(gameDir);
          assert.equal(second, first);
          assert.deepEqual(hashed, [dll]);
          fs.writeFileSync(dll, "changed code");
          const later = new Date(Date.now() + 60_000);
          fs.utimesSync(dll, later, later);
          const third = await ext.game.getGameVersion(gameDir);
          assert.equal(third, md5(md5("changed code")));
          assert.deepEqual(hashed, [dll, dll]);
        },
      );
    });
  });
});

describe("template-unitymelonloaderbepinex-hybrid: build detection", () => {
  const state = (gameDir) => stateFor({ gameDir });
  const pathsOf = (ext) =>
    Object.fromEntries(ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]));

  it("a single-executable game always launches the base executable", async () => {
    const ext = await boot({ transform: noXbox });
    assert.equal(ext.game.executable(makeGameDir(["gamelaunchhelper.exe", "ALT.exe"])), "XXX.exe");
  });

  it("launches the alt executable when the build has one", async () => {
    const ext = await boot({ transform: multiExe });
    assert.equal(ext.game.executable(makeGameDir(["ALT.exe"])), "ALT.exe");
    assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
  });

  it("prefers the Xbox helper to the alt executable", async () => {
    const ext = await boot({ transform: all(setConst("GAME_STRING_ALT", '"ALT"')) });
    assert.equal(
      ext.game.executable(makeGameDir(["gamelaunchhelper.exe", "ALT.exe"])),
      "gamelaunchhelper.exe",
    );
  });

  it("requires the game assembly instead of the executable when there are two executables", async () => {
    const ext = await boot({ transform: multiExe });
    assert.deepEqual(ext.game.requiredFiles, ["GameAssembly.dll"]);
  });

  it("requires a managed assembly for a Mono game with two executables", async () => {
    const ext = await boot({ transform: all(multiExe, mono) });
    assert.deepEqual(ext.game.requiredFiles, [sep("XXX_Data", "Managed", "Assembly-CSharp.dll")]);
  });

  it("offers a second launch tool for the alt executable", async () => {
    const ext = await boot({ transform: multiExe });
    const [base, alt] = ext.game.supportedTools;
    assert.equal(ext.game.supportedTools.length, 2);
    assert.deepEqual(
      [alt.id, alt.name, alt.logo, alt.executable(), alt.requiredFiles, alt.exclusive, alt.shell],
      ["XXX-customlaunchalt", "Custom Launch", "exec.png", "ALT.exe", ["ALT.exe"], true, true],
    );
    assert.deepEqual(alt.parameters, [""]);
    assert.equal(base.parameters, undefined);
  });

  it("moves the assets folder under Managed once an alt build is detected", async () => {
    const gameDir = makeGameDir(["ALT.exe"]);
    const ext = await boot({ transform: multiExe, state: state(gameDir) });
    assert.equal(pathsOf(ext)["XXX-assets"], sep(gameDir, "XXX_Data"));
    ext.game.executable(gameDir);
    assert.equal(pathsOf(ext)["XXX-assets"], sep(gameDir, "ALT_Data", "Managed"));
  });

  it("moves a Mono game's assembly folder to the alt build's data folder too", async () => {
    const gameDir = makeGameDir(["ALT.exe"]);
    const ext = await boot({ transform: all(multiExe, mono), state: state(gameDir) });
    assert.equal(pathsOf(ext)["XXX-assemblydll"], sep(gameDir, "XXX_Data", "Managed"));
    ext.game.executable(gameDir);
    assert.equal(pathsOf(ext)["XXX-assemblydll"], sep(gameDir, "ALT_Data", "Managed"));
  });

  it("detects the build from getGameVersion as well", async () => {
    const gameDir = makeGameDir(["ALT.exe"]);
    const ext = await boot({ transform: multiExe, state: state(gameDir) });
    await ext.game.getGameVersion(gameDir);
    assert.equal(pathsOf(ext)["XXX-assets"], sep(gameDir, "ALT_Data", "Managed"));
  });

  it("recognises both data folders as root folders", async () => {
    const ext = await boot({ transform: multiExe });
    assert.deepEqual(await supportedBy(ext, tree("ALT_Data/a.txt")), ["XXX-root", "XXX-fallback"]);
    assert.deepEqual(await supportedBy(ext, tree("XXX_Data/a.txt")), ["XXX-root", "XXX-fallback"]);
  });
});

describe("template-unitymelonloaderbepinex-hybrid: save folder", () => {
  const withSaves = all(
    setConst("DEV_REGSTRING", '"Dev"'),
    setConst("GAME_REGSTRING", '"Game"'),
    setConst("SAVE_FOLDERNAME", '"Saves"'),
  );
  const LOW = path.join(vortex.APP_ROOT, "home", "AppData", "LocalLow", "Dev", "Game");
  const XBOX = path.join(
    vortex.APP_ROOT,
    "localAppData",
    "Packages",
    "XXX_XXX",
    "SystemAppData",
    "wgs",
  );

  async function openSaves(options = {}) {
    const ext = await boot(options);
    const opened = stubShell();
    ext.registeredActions.find(({ title }) => title === "Open Save Folder").action();
    return { ext, opened };
  }

  it("offers the Save Folder button only once the folder name is filled in", async () => {
    const without = await boot();
    assert.equal(
      without.registeredActions.some(({ title }) => title === "Open Save Folder"),
      false,
    );
    const filled = await boot({ transform: withSaves });
    assert.equal(
      filled.registeredActions.some(({ title }) => title === "Open Save Folder"),
      true,
    );
  });

  it("opens the save folder below the developer and game names in LocalLow", async () => {
    const { opened } = await openSaves({ transform: withSaves });
    assert.deepEqual(opened, [path.join(LOW, "Saves")]);
  });

  it("opens the Xbox save location once the Xbox build is detected", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    const ext = await boot({ transform: withSaves, state: stateFor({ gameDir }) });
    ext.game.executable(gameDir);
    const opened = stubShell();
    ext.registeredActions.find(({ title }) => title === "Open Save Folder").action();
    assert.deepEqual(opened, [XBOX]);
  });

  it("includes the user id folder found in the config folder when hasUserIdFolder is on", async () => {
    fs.mkdirSync(path.join(LOW, "steam-12345"), { recursive: true });
    try {
      const { opened } = await openSaves({
        transform: all(withSaves, setConst("hasUserIdFolder", "true")),
      });
      assert.deepEqual(opened, [path.join(LOW, "steam-12345", "Saves")]);
    } finally {
      fs.rmSync(path.join(LOW, "steam-12345"), { recursive: true, force: true });
    }
  });

  it("leaves the user id out when the config folder does not exist", async () => {
    fs.rmSync(LOW, { recursive: true, force: true });
    const { opened } = await openSaves({
      transform: all(withSaves, setConst("hasUserIdFolder", "true")),
    });
    assert.deepEqual(opened, [path.join(LOW, "Saves")]);
  });

  it("reports a shell that will not open the folder, without offering to report it", async () => {
    const ext = await boot({ transform: withSaves });
    globalThis.window = {
      api: {
        shell: {
          openFile: () => {
            throw new Error("no file");
          },
        },
      },
    };
    await ext.registeredActions.find(({ title }) => title === "Open Save Folder").action();
    const [message, error, options] = ext.errors[0];
    assert.deepEqual(
      [message, error.message, options],
      ["Failed to open the file or folder", "no file", { allowReport: false }],
    );
  });
});

const withLinks = all(
  setConst("PCGAMINGWIKI_URL", '"https://example.test/wiki"'),
  setConst("EXTENSION_URL", '"https://example.test/ext"'),
);

const actionOf = (ext, title) => ext.registeredActions.find((action) => action.title === title);

// A shell whose every call throws, for the "failed to open" branches.
function brokenShell() {
  const fail = (what) => () => {
    throw new Error(`no ${what}`);
  };
  globalThis.window = { api: { shell: { openUrl: fail("url"), openFile: fail("file") } } };
}

describe("template-unitymelonloaderbepinex-hybrid: toolbar actions", () => {
  const gameDir = makeGameDir();
  const links = [
    ["Open Data Folder", "file", () => sep(gameDir, "XXX_Data")],
    ["Open BepInEx Config", "file", () => sep(gameDir, "BepInEx", "config", "BepInEx.cfg")],
    ["Open BepInEx Log", "file", () => sep(gameDir, "BepInEx", "LogOutput.log")],
    ["Open MelonLoader Config", "file", () => sep(gameDir, "UserData", "Loader.cfg")],
    ["Open MelonLoader Log", "file", () => sep(gameDir, "MelonLoader", "Latest.log")],
    ["Open PCGamingWiki Page", "url", () => "https://example.test/wiki"],
    ["Open Nexus Mods Page", "url", () => "https://www.nexusmods.com/XXX/mods"],
    ["Open SteamDB Page", "url", () => "https://steamdb.info/app/XXX/"],
    ["View Changelog", "file", () => path.join(DIR, "CHANGELOG.md")],
    ["Submit Bug Report", "url", () => "https://example.test/ext?tab=bugs"],
    ["Open Downloads Folder", "file", () => path.join(vortex.APP_ROOT, "downloads", "XXX")],
  ];
  let ext;
  before(async () => {
    ext = await boot({
      transform: withLinks,
      state: stateFor({ gameDir, mods: modsOf("XXX-melonloader") }),
    });
    // Setup is what records the downloads folder.
    await ext.game.setup({ path: gameDir });
  });

  for (const [title, kind, expected] of links) {
    it(`${title} opens ${kind === "url" ? "the page" : "the file or folder"}`, () => {
      const opened = stubShell();
      actionOf(ext, title).action();
      assert.deepEqual(opened, [expected()]);
    });

    it(`${title} reports a shell that will not open it, without offering to report it`, () => {
      brokenShell();
      const before = ext.errors.length;
      actionOf(ext, title).action();
      const [message, error, options] = ext.errors.at(-1);
      assert.equal(ext.errors.length, before + 1);
      assert.deepEqual(
        [message, error.message, options],
        [
          kind === "url" ? "Failed to open the URL" : "Failed to open the file or folder",
          kind === "url" ? "no url" : "no file",
          { allowReport: false },
        ],
      );
    });
  }

  it("only shows the actions while this game is the active one", () => {
    for (const { title, condition } of ext.registeredActions) {
      setActiveGame(ext.state, GAME_ID);
      assert.equal(condition(), true, title);
      setActiveGame(ext.state, "someothergame");
      assert.equal(condition(), false, title);
    }
    setActiveGame(ext.state, GAME_ID);
  });

  it("offers the optional buttons only once their placeholders are filled in", async () => {
    const bare = await boot();
    const titles = bare.registeredActions.map(({ title }) => title);
    for (const title of ["Open PCGamingWiki Page", "Submit Bug Report", "Open Save Folder"]) {
      assert.equal(titles.includes(title), false, title);
    }
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Download Latest BepInEx BE",
        "Download BepInExConfigManager",
        "Download Latest MelonLoader",
        "Open Data Folder",
        "Open BepInEx Config",
        "Open BepInEx Log",
        "Open MelonLoader Config",
        "Open MelonLoader Log",
        "Open PCGamingWiki Page",
        "Open Nexus Mods Page",
        "Open SteamDB Page",
        "View Changelog",
        "Submit Bug Report",
        "Open Downloads Folder",
      ],
    );
  });

  it("an XNA game keeps the BepInEx buttons and loses the MelonLoader and data folder ones", async () => {
    const xnaExt = await boot({ transform: xna });
    const titles = xnaExt.registeredActions.map(({ title }) => title);
    assert.equal(titles.includes("Open BepInEx Config"), true);
    for (const title of [
      "Open MelonLoader Config",
      "Open MelonLoader Log",
      "Open Data Folder",
      "Download Latest MelonLoader",
    ]) {
      assert.equal(titles.includes(title), false, title);
    }
  });
});

describe("template-unitymelonloaderbepinex-hybrid: download buttons", () => {
  const press = async (ext, title) => {
    await actionOf(ext, title).action();
    return ext.fake.calls;
  };

  it("Download Latest BepInEx BE forces a fresh Bleeding Edge download", async () => {
    const ext = await boot();
    const [call, ...rest] = await press(ext, "Download Latest BepInEx BE");
    assert.deepEqual(rest, []);
    assert.deepEqual([call[0], call[1], call[3]], ["downloadBepinexBe", "XXX", false]);
    assert.equal(call[2][0].modType, "XXX-bepinex");
  });

  it("Download BepInExConfigManager forces a download", async () => {
    const ext = await boot();
    const [call, ...rest] = await press(ext, "Download BepInExConfigManager");
    assert.deepEqual(rest, []);
    assert.deepEqual([call[0], call[2]], ["download", true]);
    assert.equal(call[1][0].modType, "XXX-bepcfgman");
  });

  it("Download Latest MelonLoader forces a download of the stable release, or the nightly build", async () => {
    const stable = await boot();
    const [call] = await press(stable, "Download Latest MelonLoader");
    assert.deepEqual(
      [call[0], call[2], call[1][0].archiveFileName],
      ["download", true, "MelonLoader.x64.zip"],
    );
    const nightly = await boot({ transform: setConst("useMelonNightly", "true") });
    const [night] = await press(nightly, "Download Latest MelonLoader");
    assert.equal(night[1][0].archiveFileName, "MelonLoader.Windows.x64.CI.Release.zip");
  });

  it("Download MelonPreferencesManager forces a download of the managed-mod requirement", async () => {
    const ext = await boot({ transform: setConst("allowMelPrefMan", "true") });
    const [call] = await press(ext, "Download MelonPreferencesManager");
    assert.deepEqual([call[0], call[2], call[1][0].directCopyAsMod], ["download", true, true]);
  });

  it("the BepInEx and config manager buttons follow their toggles", async () => {
    const ext = await boot({ transform: setConst("allowBepCfgMan", "false") });
    assert.equal(actionOf(ext, "Download BepInExConfigManager"), undefined);
    assert.equal(actionOf(ext, "Download MelonPreferencesManager"), undefined);
    const monoExt = await boot({ transform: mono });
    assert.equal(actionOf(monoExt, "Download Latest BepInEx BE"), undefined);
    const nexus = await boot({ transform: nexusBepinex });
    assert.equal(actionOf(nexus, "Download Latest BepInEx BE"), undefined);
  });

  it("known gap: Download Latest MelonLoader fetches the upstream release even for a fork on the game's Nexus page", async () => {
    const ext = await boot({ transform: nexusMelon });
    const [call] = await press(ext, "Download Latest MelonLoader");
    assert.deepEqual(
      [call[0], call[1][0].githubUrl],
      ["download", "https://api.github.com/repos/LavaGang/MelonLoader"],
    );
  });
});

// The three loaders that can be served from a Nexus page: same flow, different constants.
const nexusLoaders = [
  {
    label: "BepInEx",
    fn: "downloadBepinexNexus",
    name: "BepInEx Injector",
    type: "XXX-bepinex",
    page: 100,
    file: 101,
    patternConst: "BEPINEX_NEXUS_PATTERN",
    transform: nexusBepinex,
    installed: "XXX-bepinex",
  },
  {
    label: "MelonLoader",
    fn: "downloadMelonNexus",
    name: "MelonLoader",
    type: "XXX-melonloader",
    page: 200,
    file: 201,
    patternConst: "MELON_NEXUS_PATTERN",
    transform: nexusMelon,
    installed: "XXX-melonloader",
  },
  {
    label: "custom loader",
    fn: "downloadCustom",
    name: "XXX",
    type: "XXX-customloader",
    page: 300,
    file: 301,
    patternConst: "CUSTOMLOADER_NEXUS_PATTERN",
    transform: all(
      customLoader,
      setConst("CUSTOMLOADER_PAGE_NO", "300"),
      setConst("CUSTOMLOADER_FILE_NO", "301"),
    ),
    installed: "XXX-customloader",
  },
];

for (const loader of nexusLoaders) {
  describe(`template-unitymelonloaderbepinex-hybrid: ${loader.label} from the game's Nexus page`, () => {
    const files = [
      {
        category_id: 1,
        file_id: 11,
        uploaded_timestamp: 100,
        name: "Old client",
        file_name: "old-client.zip",
      },
      {
        category_id: 1,
        file_id: 12,
        uploaded_timestamp: 300,
        name: "New installer",
        file_name: "new-installer.zip",
      },
      {
        category_id: 1,
        file_id: 14,
        uploaded_timestamp: 200,
        name: "Mid client",
        file_name: "mid-client.zip",
      },
      {
        category_id: 2,
        file_id: 13,
        uploaded_timestamp: 900,
        name: "Optional",
        file_name: "optional.zip",
      },
    ];

    // Boots the template, exposes the download function and runs it with a Nexus page answering.
    async function run({
      modFiles = files,
      transform = loader.transform,
      mods = {},
      check = true,
      loggedIn,
      downloadFails,
      shell,
    } = {}) {
      const ext = await boot({
        transform: all(transform, exposing(loader.fn)),
        state: stateFor({ gameDir: makeGameDir(), mods }),
      });
      const order = [];
      ext.api.ext.nexusGetModFiles = async (domain, page) => {
        order.push(["nexusGetModFiles", domain, page]);
        if (modFiles instanceof Error) throw modFiles;
        return modFiles;
      };
      if (loggedIn) {
        ext.api.ext.ensureLoggedIn = async () => {
          order.push(["ensureLoggedIn"]);
        };
      }
      const seen = [];
      ext.api.events.on("start-download", (urls, info, third, callback, sixth, options) => {
        seen.push({ event: "start-download", urls, info, third, sixth, options });
        callback(downloadFails ? new Error("download failed") : null, "download-1");
      });
      ext.api.events.on("start-install-download", (id, options, callback) => {
        seen.push({ event: "start-install-download", id, options });
        callback(null, "mod-1");
      });
      const dismissed = [];
      ext.api.dismissNotification = (id) => dismissed.push(id);
      const opened = shell === "broken" ? (brokenShell(), []) : stubShell();
      await ext.exports.internals[loader.fn](ext.api, { game: { id: "XXX" } }, check);
      return { ext, order, seen, dismissed, opened };
    }
    const nxm = (id) => `nxm://XXX/mods/${loader.page}/files/${id}`;

    it("downloads the newest main file and installs it as the loader", async () => {
      const { ext, seen, dismissed } = await run();
      assert.deepEqual(seen, [
        {
          event: "start-download",
          urls: [nxm(12)],
          info: { game: "XXX", name: loader.name },
          third: undefined,
          sixth: undefined,
          options: { allowInstall: false },
        },
        { event: "start-install-download", id: "download-1", options: { allowAutoEnable: false } },
      ]);
      // setModsEnabled takes the api first; the profile is the game's last active one.
      assert.deepEqual(
        ext.dispatched.map(({ type, payload }) => [
          type,
          payload.slice(type === "setModsEnabled" ? 1 : 0),
        ]),
        [
          [
            "setModsEnabled",
            ["profile", ["mod-1"], true, { allowAutoDeploy: true, installed: true }],
          ],
          ["setModType", ["XXX", "mod-1", loader.type]],
        ],
      );
      assert.deepEqual(dismissed, [`${loader.type}-installing`]);
    });

    it("tells the user it is installing, and who to ask first", async () => {
      const { ext, order } = await run({ loggedIn: true });
      const [notice] = ext.notifications;
      assert.deepEqual(
        [notice.id, notice.message, notice.type, notice.noDismiss, notice.allowSuppress],
        [`${loader.type}-installing`, `Installing ${loader.name}`, "activity", true, false],
      );
      assert.deepEqual(order, [["ensureLoggedIn"], ["nexusGetModFiles", "XXX", loader.page]]);
    });

    it("does not wait for a login that is not available", async () => {
      const { order } = await run();
      assert.deepEqual(order, [["nexusGetModFiles", "XXX", loader.page]]);
    });

    it("picks the newest main file whose name matches the pattern", async () => {
      const { seen } = await run({
        transform: all(loader.transform, setConst(loader.patternConst, "/client/i")),
      });
      assert.deepEqual(seen[0].urls, [nxm(14)]);
    });

    it("matches the pattern against the file name as well as the display name", async () => {
      const { seen } = await run({
        transform: all(loader.transform, setConst(loader.patternConst, "/^new-installer/")),
      });
      assert.deepEqual(seen[0].urls, [nxm(12)]);
    });

    it("falls back to the configured file when no main file matches", async () => {
      const { seen } = await run({
        transform: all(loader.transform, setConst(loader.patternConst, "/nothing/")),
      });
      assert.deepEqual(seen[0].urls, [nxm(loader.file)]);
      const onlyOptional = await run({ modFiles: [files[3]] });
      assert.deepEqual(onlyOptional.seen[0].urls, [nxm(loader.file)]);
    });

    it("falls back to the configured file when the page cannot be read", async () => {
      const { seen } = await run({ modFiles: new Error("offline") });
      assert.deepEqual(seen[0].urls, [nxm(loader.file)]);
    });

    it("reports a failed download, opens the page's files tab, and still clears the notice", async () => {
      const { ext, opened, dismissed } = await run({ downloadFails: true });
      const [message, error, options] = ext.errors[0];
      assert.deepEqual(
        [message, error.message, options],
        [`Failed to download/install ${loader.name}`, "download failed", { allowReport: false }],
      );
      assert.deepEqual(opened, [
        `https://www.nexusmods.com/XXX/mods/${loader.page}/files/?tab=files`,
      ]);
      assert.deepEqual(dismissed, [`${loader.type}-installing`]);
      assert.deepEqual(ext.dispatched, []);
    });

    it("reports the files page too when the shell will not open it", async () => {
      const { ext } = await run({ downloadFails: true, shell: "broken" });
      assert.deepEqual(
        ext.errors.map(([message, error, options]) => [message, error.message, options]),
        [
          [`Failed to download/install ${loader.name}`, "download failed", { allowReport: false }],
          ["Failed to open the URL", "no url", { allowReport: false }],
        ],
      );
    });

    it("does nothing when the loader is already installed, unless a download is forced", async () => {
      const skipped = await run({ mods: modsOf(loader.installed) });
      assert.deepEqual(skipped.seen, []);
      assert.deepEqual(skipped.ext.notifications, []);
      const forced = await run({ mods: modsOf(loader.installed), check: false });
      assert.equal(forced.seen.length, 2);
    });
  });
}

describe("template-unitymelonloaderbepinex-hybrid: custom mod folder", () => {
  const DEPLOY = "vortex.deployment.XXX-custommod.json";

  async function customFolder({ mods, gameFiles = [], undiscovered = false } = {}) {
    const gameDir = makeGameDir(gameFiles);
    const ext = await boot({
      transform: customMods,
      state: stateFor({ gameDir: undiscovered ? undefined : gameDir, mods }),
    });
    const type = ext.modTypes.find(({ id }) => id === "XXX-custommod");
    return { gameDir, folder: type.getPath({ id: GAME_ID }) };
  }

  it("follows BepInEx's plugins folder when BepInEx is the loader", async () => {
    const { gameDir, folder } = await customFolder({ mods: modsOf("XXX-bepinex") });
    assert.equal(folder, sep(gameDir, "BepInEx", "plugins", "XXX"));
  });

  it("follows MelonLoader's Mods folder when MelonLoader is the loader", async () => {
    const { gameDir, folder } = await customFolder({ mods: modsOf("XXX-melonloader") });
    assert.equal(folder, sep(gameDir, "Mods", "XXX"));
  });

  it("uses the game folder when no loader is installed, and the Mods folder when both are", async () => {
    const none = await customFolder({ mods: {} });
    assert.equal(none.folder, none.gameDir);
    const both = await customFolder({ mods: modsOf("XXX-bepinex", "XXX-melonloader") });
    assert.equal(both.folder, sep(both.gameDir, "Mods", "XXX"));
  });

  it("falls back to the root before the game is discovered", async () => {
    const { folder } = await customFolder({ mods: {}, undiscovered: true });
    assert.equal(folder, ".");
  });

  it("removes the other loader's leftover deployment file", async () => {
    const melonLeft = sep("Mods", "XXX", DEPLOY);
    const bepLeft = sep("BepInEx", "plugins", "XXX", DEPLOY);
    const forBepinex = await customFolder({
      mods: modsOf("XXX-bepinex"),
      gameFiles: [melonLeft, bepLeft],
    });
    assert.equal(fs.existsSync(path.join(forBepinex.gameDir, melonLeft)), false);
    assert.equal(fs.existsSync(path.join(forBepinex.gameDir, bepLeft)), true);
    const forMelon = await customFolder({
      mods: modsOf("XXX-melonloader"),
      gameFiles: [melonLeft, bepLeft],
    });
    assert.equal(fs.existsSync(path.join(forMelon.gameDir, bepLeft)), false);
    assert.equal(fs.existsSync(path.join(forMelon.gameDir, melonLeft)), true);
  });
});

describe("template-unitymelonloaderbepinex-hybrid: custom loader installer", () => {
  const TOOL_PATH = path.join("C:", "tools", "XXX", "XXX.exe");

  // A game whose custom loader is installed as a mod but whose installer has not been run, so
  // the next deployment asks for it. Returns the notice and a record of what gets run.
  async function reminder({ tool, runExecutable } = {}) {
    const gameDir = makeGameDir();
    const state = stateFor({ gameDir, mods: modsOf("XXX-customloader") });
    if (tool) state.settings.gameMode.discovered.XXX.tools = { "XXX-customloader": tool };
    const ext = await boot({ transform: customLoaderWithInstaller, state });
    const runs = [];
    ext.api.runExecutable =
      runExecutable ??
      ((...args) => {
        runs.push(args);
        return Promise.resolve();
      });
    await ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1]("profile", {});
    return { ext, runs, notice: ext.notifications.find(({ id }) => id === "XXX-custominstaller") };
  }

  it("reminds the user, with a button that runs the installer", async () => {
    const { notice } = await reminder();
    assert.deepEqual(
      [notice.type, notice.message, notice.allowSuppress],
      ["warning", "Run XXX Installer", true],
    );
    assert.deepEqual(
      notice.actions.map(({ title }) => title),
      ["Run XXX", "More"],
    );
  });

  it("runs the installer tool without suggesting a deployment, and closes the notice", async () => {
    const { notice, runs } = await reminder({ tool: { path: TOOL_PATH } });
    let dismissed = 0;
    notice.actions[0].action(() => dismissed++);
    await waitFor(() => runs.length > 0);
    assert.deepEqual(runs, [[TOOL_PATH, [], { suggestDeploy: false }]]);
    assert.equal(dismissed, 1);
  });

  it("explains the installer in a dialog with run, continue and never buttons", async () => {
    const { ext, notice, runs } = await reminder({ tool: { path: TOOL_PATH } });
    let dismissed = 0;
    const suppressed = [];
    ext.api.suppressNotification = (id) => suppressed.push(id);
    const dialog = openMore(ext, notice, () => dismissed++);
    assert.deepEqual(dialog.slice(0, 2), ["question", "Run XXX Installer"]);
    assert.match(
      dialog[2].text,
      /You must run the XXX installer to install necessary files to the game folder\./,
    );
    assert.match(
      dialog[2].text,
      /IMPORTANT: Use the default installation options for compatibility with Vortex\./,
    );
    assert.deepEqual(labelsOf(dialog), ["Run XXX", "Continue", "Never Show Again"]);
    buttonOf(dialog, "Run XXX").action();
    buttonOf(dialog, "Continue").action();
    buttonOf(dialog, "Never Show Again").action();
    assert.equal(dismissed, 3);
    assert.deepEqual(suppressed, ["XXX-custominstaller"]);
    await waitFor(() => runs.length > 0);
    assert.equal(runs.length, 1);
  });

  it("tells the user when the installer tool has not been found", async () => {
    const { ext, notice } = await reminder({ tool: {} });
    notice.actions[0].action(() => {});
    assert.deepEqual(ext.errors.at(-1), [
      "Failed to run XXX Installer",
      "Path to XXX Installer executable could not be found. Ensure XXX Installer is installed through Vortex.",
    ]);
  });

  it("reports a missing tool entry, without offering to report it", async () => {
    const { ext, notice } = await reminder();
    notice.actions[0].action(() => {});
    const [message, error, options] = ext.errors.at(-1);
    assert.deepEqual(
      [message, error instanceof TypeError, options],
      ["Failed to run XXX Installer", true, { allowReport: false }],
    );
  });

  it("offers to report a launch failure with a code the user cannot cause", async () => {
    for (const code of ["EPERM", "ENOENT"]) {
      const { ext, notice } = await reminder({
        tool: { path: TOOL_PATH },
        runExecutable: () => Promise.reject(Object.assign(new Error("boom"), { code })),
      });
      notice.actions[0].action(() => {});
      await waitFor(() => ext.errors.length > 0);
      const [message, error, options] = ext.errors[0];
      assert.deepEqual(
        [message, error.code, options],
        ["Failed to run XXX Installer", code, { allowReport: true }],
      );
    }
  });

  it("does not offer to report an unrecognised launch failure", async () => {
    const { ext, notice } = await reminder({
      tool: { path: TOOL_PATH },
      runExecutable: () => Promise.reject(Object.assign(new Error("odd"), { code: "EOTHER" })),
    });
    notice.actions[0].action(() => {});
    await waitFor(() => ext.errors.length > 0);
    assert.deepEqual(ext.errors[0][2], { allowReport: false });
  });

  it("known gap: the report list names EACCESS, so a real EACCES permission failure is not offered", async () => {
    const attempt = async (code, throws) => {
      const { ext, notice } = await reminder({
        tool: { path: TOOL_PATH },
        runExecutable: () => {
          const error = Object.assign(new Error("denied"), { code });
          return throws
            ? (() => {
                throw error;
              })()
            : Promise.reject(error);
        },
      });
      notice.actions[0].action(() => {});
      await waitFor(() => ext.errors.length > 0);
      return ext.errors[0][2].allowReport;
    };
    for (const throws of [false, true]) {
      assert.equal(await attempt("EACCES", throws), false);
      assert.equal(await attempt("EACCESS", throws), true);
    }
  });

  it("no reminder once the marker file exists", async () => {
    const gameDir = makeGameDir(["XXX_Data/Managed/XXX.dll"]);
    const ext = await boot({
      transform: customLoaderWithInstaller,
      state: stateFor({ gameDir, mods: modsOf("XXX-customloader") }),
    });
    await ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1]("profile", {});
    assert.deepEqual(ext.notifications, []);
  });

  it("counts the loader as installed from its marker file alone, so it is not offered again", async () => {
    const gameDir = makeGameDir(["XXX_Data/Managed/XXX.dll"]);
    const ext = await boot({ transform: customLoaderWithInstaller, state: stateFor({ gameDir }) });
    answerDialogs(ext, pick("Cancel"));
    await ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1]("profile", {});
    assert.deepEqual(ext.dialogs, []);
  });
});

// The BepInEx Bleeding Edge module is bundled in the template, so it is exercised here against a
// fake copy of the builds.bepinex.dev index page. No request leaves the process.
const BE_INDEX = "https://builds.bepinex.dev/projects/bepinex_be";
const il2cpp = (build, commit) => `BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.${build}+${commit}.zip`;
const monoBuild = (build, commit) => `BepInEx-Unity.Mono-win-x64-6.0.0-be.${build}+${commit}.zip`;
const artifactUrl = (build, name) =>
  `https://builds.bepinex.dev/projects/bepinex_be/${build}/${encodeURIComponent(name)}`;

// One block of the index page, in the shape the module splits on.
function indexBlock(build, commit, names, extra = "") {
  const links = names
    .map(
      (name) => `<a class="artifact-link"
        href="/projects/bepinex_be/${build}/${encodeURIComponent(name)}"${extra}>${name}</a>`,
    )
    .join("\n");
  return `<div class="artifact-item">
    <span class="artifact-id">#${build}</span>
    <a class="hash-button" href="https://example.test/${commit}">${commit}</a>
    <span class="build-date">2026-01-${build % 28}</span>
    ${links}
  </div>`;
}
const indexPage = (...blocks) => `<html><body>${blocks.join("\n")}</body></html>`;
const TWO_BUILDS = indexPage(
  indexBlock(790, "abc1234", [il2cpp(790, "abc1234"), monoBuild(790, "abc1234")]),
  indexBlock(789, "def5678", [monoBuild(789, "def5678")]),
  indexBlock(788, "5b766a3", [il2cpp(788, "5b766a3")]),
);

const beRequirement = (extra = {}) => ({
  artifactPattern: /^BepInEx-Unity\.IL2CPP-win-x64-/i,
  modType: "XXX-bepinex",
  userFacingName: "BepInEx Injector",
  fallbackBuild: "788",
  fallbackArtifactUrl: "https://builds.bepinex.dev/projects/bepinex_be/788/fallback.zip",
  autoInstall: false,
  ...extra,
});
const beMods = (...builds) =>
  Object.fromEntries(
    builds.map((build, index) => [
      `mod-${index}`,
      {
        id: `mod-${index}`,
        type: "XXX-bepinex",
        attributes: build === undefined ? {} : { bepinexBeBuild: build },
      },
    ]),
  );
const SPEC = { game: { id: "XXX" } };

// The real bepinexbe_downloader module and an extension api to hand it.
async function beModule({ mods = {} } = {}) {
  const ext = await loadExtension(DIR, { state: stateFor({ gameDir: makeGameDir(), mods }) });
  return { ext, be: require(path.join(DIR, "bepinexbe_downloader.js")) };
}
const serve = (html) => () => reply({ body: html });
const unreachable = () => {
  throw new Error("offline");
};
const warned = (pattern) =>
  vortex.logs.some(({ level, message }) => level === "warn" && pattern.test(message));

describe("template-unitymelonloaderbepinex-hybrid: Bleeding Edge build index", () => {
  it("parses each build with its commit, date and artifacts, newest first", async () => {
    const { be } = await beModule();
    assert.deepEqual(be.parseBepinexBeArtifacts(TWO_BUILDS), [
      {
        build: "790",
        commit: "abc1234",
        date: "2026-01-6",
        artifacts: [
          { name: il2cpp(790, "abc1234"), url: artifactUrl(790, il2cpp(790, "abc1234")) },
          { name: monoBuild(790, "abc1234"), url: artifactUrl(790, monoBuild(790, "abc1234")) },
        ],
      },
      {
        build: "789",
        commit: "def5678",
        date: "2026-01-5",
        artifacts: [
          { name: monoBuild(789, "def5678"), url: artifactUrl(789, monoBuild(789, "def5678")) },
        ],
      },
      {
        build: "788",
        commit: "5b766a3",
        date: "2026-01-4",
        artifacts: [
          { name: il2cpp(788, "5b766a3"), url: artifactUrl(788, il2cpp(788, "5b766a3")) },
        ],
      },
    ]);
  });

  it("keeps the percent-encoded plus in the artifact link rather than encoding it again", async () => {
    const { be } = await beModule();
    const [first] = be.parseBepinexBeArtifacts(TWO_BUILDS);
    assert.match(first.artifacts[0].url, /6\.0\.0-be\.790%2Babc1234\.zip$/);
  });

  it("decodes &amp; in a link, skips blocks without a build number, and survives anything else", async () => {
    const { be } = await beModule();
    const html = `<div class="artifact-item"><span class="artifact-id">#5</span>
      <a class="artifact-link" href="/p/5/a.zip?x=1&amp;y=2">a.zip</a></div>
      <div class="artifact-item"><span>no id here</span></div>`;
    assert.deepEqual(be.parseBepinexBeArtifacts(html), [
      {
        build: "5",
        commit: "",
        date: "",
        artifacts: [{ name: "a.zip", url: "https://builds.bepinex.dev/p/5/a.zip?x=1&y=2" }],
      },
    ]);
    assert.deepEqual(be.parseBepinexBeArtifacts(""), []);
    assert.deepEqual(be.parseBepinexBeArtifacts(undefined), []);
    assert.deepEqual(be.parseBepinexBeArtifacts(null), []);
    assert.deepEqual(be.parseBepinexBeArtifacts("<html>nothing</html>"), []);
  });

  it("finds the newest build that carries the requirement's artifact", async () => {
    const { be } = await beModule();
    const html = indexPage(
      indexBlock(791, "aaa0001", [monoBuild(791, "aaa0001")]),
      indexBlock(790, "abc1234", [il2cpp(790, "abc1234")]),
    );
    const latest = await withFetch(serve(html), () => be.getLatestBepinexBeBuild(beRequirement()));
    assert.deepEqual(latest, {
      build: "790",
      commit: "abc1234",
      date: "2026-01-6",
      artifact: { name: il2cpp(790, "abc1234"), url: artifactUrl(790, il2cpp(790, "abc1234")) },
    });
  });

  it("asks for the index of the requirement's own project", async () => {
    const { be } = await beModule();
    const requests = await withFetch(serve(TWO_BUILDS), async (seen) => {
      await be.getLatestBepinexBeBuild(beRequirement());
      await be.getLatestBepinexBeBuild(beRequirement({ projectPath: "projects/other" }));
      return seen;
    });
    assert.deepEqual(
      requests.map(({ url }) => url),
      [BE_INDEX, "https://builds.bepinex.dev/projects/other"],
    );
  });

  it("answers null, and logs why, when the index cannot be fetched or has no matching artifact", async () => {
    const { be } = await beModule();
    assert.equal(
      await withFetch(
        () => reply({ status: 500 }),
        () => be.getLatestBepinexBeBuild(beRequirement()),
      ),
      null,
    );
    assert.ok(
      warned(
        /^Could not get BepInEx Injector builds from builds\.bepinex\.dev: Error: Request failed with status code 500$/,
      ),
    );
    assert.equal(
      await withFetch(unreachable, () => be.getLatestBepinexBeBuild(beRequirement())),
      null,
    );
    assert.ok(warned(/builds\.bepinex\.dev: Error: offline$/));
    const onlyMono = indexPage(indexBlock(790, "abc1234", [monoBuild(790, "abc1234")]));
    assert.equal(
      await withFetch(serve(onlyMono), () => be.getLatestBepinexBeBuild(beRequirement())),
      null,
    );
    assert.ok(warned(/^No builds\.bepinex\.dev artifact matches .* for BepInEx Injector$/));
  });

  it("finds one specific build by number, or null when it is gone or has no matching artifact", async () => {
    const { be } = await beModule();
    const found = await withFetch(serve(TWO_BUILDS), () =>
      be.getBepinexBeBuild(beRequirement(), 788),
    );
    assert.equal(found.build, "788");
    assert.equal(found.artifact.name, il2cpp(788, "5b766a3"));
    assert.equal(
      await withFetch(serve(TWO_BUILDS), () => be.getBepinexBeBuild(beRequirement(), "789")),
      null,
    );
    assert.equal(
      await withFetch(serve(TWO_BUILDS), () => be.getBepinexBeBuild(beRequirement(), 100)),
      null,
    );
    assert.equal(
      await withFetch(unreachable, () => be.getBepinexBeBuild(beRequirement(), 788)),
      null,
    );
  });

  it("knows whether a mod of the requirement's type is installed", async () => {
    const { ext, be } = await beModule({ mods: modsOf("XXX-bepinex") });
    assert.equal(be.isBepinexBeInstalled(ext.api, "XXX", beRequirement()), true);
    assert.equal(
      be.isBepinexBeInstalled(ext.api, "XXX", beRequirement({ modType: "XXX-other" })),
      false,
    );
    assert.equal(be.isBepinexBeInstalled(ext.api, "othergame", beRequirement()), false);
  });
});

describe("template-unitymelonloaderbepinex-hybrid: Bleeding Edge install", () => {
  // Runs an install against the fake index; `fetch` answers the index request.
  async function install({
    mods = {},
    requirement = beRequirement(),
    check = true,
    fetch = serve(TWO_BUILDS),
    downloadFails = false,
    shell,
    twice = false,
  } = {}) {
    const { ext, be } = await beModule({ mods });
    const seen = answerDownloadEvents(ext);
    if (downloadFails) {
      ext.api.events.removeAllListeners("start-download");
      ext.api.events.on("start-download", (urls, info, third, callback) =>
        callback(new Error("download failed")),
      );
    }
    const dismissed = [];
    ext.api.dismissNotification = (id) => dismissed.push(id);
    const opened = shell === "broken" ? (brokenShell(), []) : stubShell();
    const requests = await withFetch(fetch, async (list) => {
      const run = () => be.downloadBepinexBeRequirement(ext.api, SPEC, requirement, check);
      if (twice) await Promise.all([run(), run()]);
      else await run();
      return list;
    });
    return { ext, be, seen, dismissed, opened, requests };
  }
  const shape = ({ type, payload }) => [type, payload.slice(type === "setModsEnabled" ? 1 : 0)];

  it("downloads the newest matching build and installs it as the loader", async () => {
    const { ext, seen, requests, dismissed } = await install();
    assert.deepEqual(
      requests.map(({ url }) => url),
      [BE_INDEX],
    );
    assert.deepEqual(seen, [
      {
        event: "start-download",
        urls: [artifactUrl(790, il2cpp(790, "abc1234"))],
        info: { game: "XXX", name: "BepInEx Injector" },
        third: undefined,
        sixth: undefined,
        options: { allowInstall: false },
      },
      { event: "start-install-download", id: "download-1", options: { allowAutoEnable: false } },
    ]);
    assert.deepEqual(ext.dispatched.map(shape), [
      ["setDownloadModInfo", ["download-1", "source", "website"]],
      ["setModsEnabled", ["profile", ["mod-1"], true, { allowAutoDeploy: true, installed: true }]],
      ["setModType", ["XXX", "mod-1", "XXX-bepinex"]],
      ["setModAttribute", ["XXX", "mod-1", "version", "790"]],
      ["setModAttribute", ["XXX", "mod-1", "bepinexBeBuild", 790]],
      ["setModAttribute", ["XXX", "mod-1", "source", "website"]],
      ["setModAttribute", ["XXX", "mod-1", "url", BE_INDEX]],
      ["setModAttribute", ["XXX", "mod-1", "customFileName", "BepInEx Injector"]],
      ["setModAttribute", ["XXX", "mod-1", "modId", undefined]],
      ["setModAttribute", ["XXX", "mod-1", "fileId", undefined]],
    ]);
    const [notice] = ext.notifications;
    assert.deepEqual(
      [notice.id, notice.message, notice.type, notice.noDismiss, notice.allowSuppress],
      ["XXX-bepinex-installing", "Installing BepInEx Injector", "activity", true, false],
    );
    assert.deepEqual(dismissed, ["XXX-bepinex-installing"]);
  });

  it("does nothing when the requirement is installed, unless a download is forced", async () => {
    const skipped = await install({ mods: beMods(790) });
    assert.deepEqual(skipped.requests, []);
    assert.deepEqual(skipped.seen, []);
    assert.deepEqual(skipped.ext.notifications, []);
    const forced = await install({ mods: beMods(790), check: false });
    assert.equal(forced.seen.length, 2);
  });

  it("switches the build it replaces off as soon as the new one is downloaded", async () => {
    const { ext } = await install({ mods: beMods(788), check: false });
    assert.deepEqual(ext.dispatched.map(shape).slice(0, 2), [
      ["setModEnabled", ["profile", "mod-0", false]],
      ["setDownloadModInfo", ["download-1", "source", "website"]],
    ]);
  });

  it("leaves the working build enabled when the download fails", async () => {
    const { ext, dismissed } = await install({
      mods: beMods(788),
      check: false,
      downloadFails: true,
    });
    assert.deepEqual(ext.dispatched, []);
    assert.deepEqual(dismissed, ["XXX-bepinex-installing"]);
  });

  it("ignores a second request while the first is running", async () => {
    const { seen } = await install({ twice: true });
    assert.equal(seen.filter(({ event }) => event === "start-download").length, 1);
  });

  it("can install again after a run has finished", async () => {
    const { ext, be } = await beModule();
    const seen = answerDownloadEvents(ext);
    await withFetch(serve(TWO_BUILDS), async () => {
      await be.downloadBepinexBeRequirement(ext.api, SPEC, beRequirement(), false);
      await be.downloadBepinexBeRequirement(ext.api, SPEC, beRequirement(), false);
    });
    assert.equal(seen.filter(({ event }) => event === "start-download").length, 2);
  });

  it("falls back to the recorded build when the index is unreachable or has no matching artifact", async () => {
    for (const fetch of [
      unreachable,
      serve(indexPage(indexBlock(790, "abc1234", [monoBuild(790, "abc1234")]))),
    ]) {
      const { ext, seen } = await install({ fetch });
      assert.deepEqual(seen[0].urls, [
        "https://builds.bepinex.dev/projects/bepinex_be/788/fallback.zip",
      ]);
      assert.deepEqual(
        ext.dispatched
          .map(shape)
          .filter(([, [, , key]]) => key === "version" || key === "bepinexBeBuild"),
        [
          ["setModAttribute", ["XXX", "mod-1", "version", "788"]],
          ["setModAttribute", ["XXX", "mod-1", "bepinexBeBuild", 788]],
        ],
      );
    }
  });

  it("reports that it cannot download, and opens the build index, when there is no fallback either", async () => {
    const { ext, opened, dismissed } = await install({
      fetch: unreachable,
      requirement: beRequirement({ fallbackArtifactUrl: undefined }),
    });
    assert.equal(ext.errors.length, 1);
    const [message, error] = ext.errors[0];
    assert.equal(
      message,
      "Failed to download/install BepInEx Injector. You must download manually.",
    );
    assert.equal(
      error.message,
      "builds.bepinex.dev is unreachable and no fallbackArtifactUrl is set",
    );
    assert.equal(ext.errors[0].length, 2);
    assert.deepEqual(opened, [BE_INDEX]);
    assert.deepEqual(dismissed, ["XXX-bepinex-installing"]);
    assert.deepEqual(ext.dispatched, []);
  });

  it("reports a failed download and opens the build index", async () => {
    const { ext, opened } = await install({ downloadFails: true });
    const [message, error] = ext.errors[0];
    assert.deepEqual(
      [message, error.message],
      [
        "Failed to download/install BepInEx Injector. You must download manually.",
        "download failed",
      ],
    );
    assert.deepEqual(opened, [BE_INDEX]);
  });

  it("reports the index page too when the shell will not open it", async () => {
    const { ext } = await install({ downloadFails: true, shell: "broken" });
    const [, second] = ext.errors;
    assert.deepEqual(
      [second[0], second[1].message, second[2]],
      ["Failed to open the URL", "no url", { allowReport: false }],
    );
  });

  it("honours a requirement's own project, page, and attribute names", async () => {
    const requirement = beRequirement({
      projectPath: "projects/other",
      pageUrl: "https://example.test/page",
      buildAttribute: "customBuild",
    });
    const { ext, requests } = await install({
      requirement,
      fetch: () =>
        reply({ body: TWO_BUILDS.replaceAll("/projects/bepinex_be/", "/projects/other/") }),
    });
    assert.deepEqual(
      requests.map(({ url }) => url),
      ["https://builds.bepinex.dev/projects/other"],
    );
    const attributes = ext.dispatched.map(shape).filter(([type]) => type === "setModAttribute");
    assert.deepEqual(
      attributes.map(([, [, , key, value]]) => [key, value]),
      [
        ["version", "790"],
        ["customBuild", 790],
        ["source", "website"],
        ["url", "https://example.test/page"],
        ["customFileName", "BepInEx Injector"],
        ["modId", undefined],
        ["fileId", undefined],
      ],
    );
  });

  describe("a pinned build", () => {
    it("installs the pinned build rather than the newest, found by number on the index", async () => {
      const { seen, ext } = await install({ requirement: beRequirement({ pinVersion: 788 }) });
      assert.deepEqual(seen[0].urls, [artifactUrl(788, il2cpp(788, "5b766a3"))]);
      assert.equal(
        ext.dispatched.map(shape).find(([, [, , key]]) => key === "version")[1][3],
        "788",
      );
    });

    it("uses the pinned artifact url without asking the index at all", async () => {
      const { seen, requests } = await install({
        requirement: beRequirement({
          pinVersion: 700,
          pinArtifactUrl: "https://builds.bepinex.dev/projects/bepinex_be/700/old.zip",
        }),
      });
      assert.deepEqual(requests, []);
      assert.deepEqual(seen[0].urls, [
        "https://builds.bepinex.dev/projects/bepinex_be/700/old.zip",
      ]);
    });

    it("never installs a different build when the pinned one cannot be found", async () => {
      const { seen, ext, opened } = await install({
        requirement: beRequirement({ pinVersion: 100 }),
      });
      assert.deepEqual(seen, []);
      assert.equal(
        ext.errors[0][1].message,
        "Build 100 could not be resolved from the builds.bepinex.dev index - set pinArtifactUrl to reach a build that has scrolled off it",
      );
      assert.deepEqual(opened, [BE_INDEX]);
    });
  });

  it("installs each requirement in a list, one after the other", async () => {
    const { ext, be } = await beModule();
    const seen = answerDownloadEvents(ext);
    await withFetch(serve(TWO_BUILDS), () =>
      be.downloadBepinexBe(
        ext.api,
        SPEC,
        [beRequirement(), beRequirement({ modType: "XXX-second" })],
        true,
      ),
    );
    assert.equal(seen.filter(({ event }) => event === "start-download").length, 2);
    assert.deepEqual(
      ext.notifications.map(({ id }) => id),
      ["XXX-bepinex-installing", "XXX-second-installing"],
    );
  });

  it("keys the in-progress guard on the artifact pattern when a requirement has no mod type", async () => {
    const { ext, be } = await beModule();
    const seen = answerDownloadEvents(ext);
    await withFetch(serve(TWO_BUILDS), () =>
      be.downloadBepinexBeRequirement(ext.api, SPEC, beRequirement({ modType: undefined }), false),
    );
    assert.match(ext.notifications[0].id, /^\^BepInEx-Unity\\\.IL2CPP-win-x64--installing$/);
    assert.equal(seen.length, 2);
  });
});

describe("template-unitymelonloaderbepinex-hybrid: Bleeding Edge update check", () => {
  async function check({
    mods = {},
    requirement = beRequirement(),
    fetch = serve(TWO_BUILDS),
  } = {}) {
    const { ext, be } = await beModule({ mods });
    const seen = answerDownloadEvents(ext);
    const requests = await withFetch(fetch, async (list) => {
      await be.checkForBepinexBeUpdateRequirement(ext.api, SPEC, requirement);
      return list;
    });
    return { ext, be, seen, requests };
  }

  it("offers the newest build when the installed one is older", async () => {
    const { ext, requests } = await check({ mods: beMods(788) });
    assert.deepEqual(
      requests.map(({ url }) => url),
      [BE_INDEX],
    );
    const [notice] = ext.notifications;
    assert.deepEqual(
      [notice.id, notice.type, notice.message, notice.allowSuppress],
      ["XXX-bepinex-update", "warning", "BepInEx Injector update available (build 790)", true],
    );
    assert.deepEqual(
      notice.actions.map(({ title }) => title),
      ["Download"],
    );
  });

  it("downloads the build from the notice's button, replacing the old one, and closes it", async () => {
    const { ext, seen } = await check({ mods: beMods(788) });
    let dismissed = 0;
    await withFetch(serve(TWO_BUILDS), async () => {
      ext.notifications[0].actions[0].action(() => dismissed++);
      await waitFor(() => ext.dispatched.length > 5);
    });
    assert.equal(dismissed, 1);
    assert.equal(seen.filter(({ event }) => event === "start-download").length, 1);
    assert.deepEqual(shapeFirst(ext.dispatched), ["setModEnabled", ["profile", "mod-0", false]]);
  });
  const shapeFirst = ([first]) => [first.type, first.payload];

  it("says nothing when the installed build is the newest or newer", async () => {
    for (const build of [790, 791]) {
      const { ext } = await check({ mods: beMods(build) });
      assert.deepEqual(ext.notifications, [], String(build));
    }
  });

  it("goes by the highest build when several copies are installed", async () => {
    const { ext } = await check({ mods: beMods(788, 790, 789) });
    assert.deepEqual(ext.notifications, []);
  });

  it("offers an update to a copy installed before builds were tracked", async () => {
    for (const mods of [beMods(undefined), beMods("not a number")]) {
      const { ext } = await check({ mods });
      assert.equal(ext.notifications.length, 1);
    }
  });

  it("says nothing when the index cannot be reached", async () => {
    const { ext } = await check({ mods: beMods(788), fetch: unreachable });
    assert.deepEqual(ext.notifications, []);
  });

  it("does not install a missing requirement the user installs by hand", async () => {
    const { ext, seen, requests } = await check();
    assert.deepEqual([ext.notifications, seen, requests], [[], [], []]);
  });

  it("installs a missing requirement that has not opted out", async () => {
    const { seen } = await check({ requirement: beRequirement({ autoInstall: undefined }) });
    assert.equal(seen.filter(({ event }) => event === "start-download").length, 1);
    const explicit = await check({ requirement: beRequirement({ autoInstall: true }) });
    assert.equal(explicit.seen.filter(({ event }) => event === "start-download").length, 1);
  });

  describe("a pinned build", () => {
    const pinned = beRequirement({ pinVersion: 789 });

    it("makes no request at all when the pinned build is installed", async () => {
      const { ext, requests } = await check({ mods: beMods(789), requirement: pinned });
      assert.deepEqual([ext.notifications, requests], [[], []]);
    });

    it("offers the pinned build, without asking the index, when another build is installed", async () => {
      for (const installed of [788, 790]) {
        const { ext, requests } = await check({ mods: beMods(installed), requirement: pinned });
        assert.deepEqual(requests, []);
        const [notice] = ext.notifications;
        assert.deepEqual(
          [notice.id, notice.message],
          ["XXX-bepinex-update", "BepInEx Injector pinned version available (build 789)"],
        );
      }
    });
  });

  it("checks each requirement in a list", async () => {
    const { ext, be } = await beModule({ mods: beMods(788) });
    await withFetch(serve(TWO_BUILDS), () =>
      be.checkForBepinexBeUpdate(ext.api, SPEC, [
        beRequirement(),
        beRequirement({ modType: "XXX-bepinex" }),
      ]),
    );
    assert.equal(ext.notifications.length, 2);
  });
});

describe("template-unitymelonloaderbepinex-hybrid: Bleeding Edge requirement with the real module", () => {
  // The template's own requirement, driven through the bundled module against the fake index.
  async function withRealModule(options = {}) {
    const fake = fakeModules();
    const ext = await loadExtension(DIR, {
      bundled: { "downloader.js": fake.bundled["downloader.js"] },
      ...options,
    });
    ext.fake = fake;
    return ext;
  }

  it("installs the newest IL2CPP build for the architecture when BepInEx is chosen", async () => {
    const gameDir = makeGameDir();
    const ext = await withRealModule({ state: stateFor({ gameDir }) });
    answerDialogs(ext, pick("BepInEx"));
    const seen = answerDownloadEvents(ext);
    await withFetch(serve(TWO_BUILDS), () => ext.game.setup({ path: gameDir }));
    assert.deepEqual(seen[0].urls, [artifactUrl(790, il2cpp(790, "abc1234"))]);
    assert.equal(
      ext.dispatched.some(
        ({ type, payload }) => type === "setModType" && payload[2] === "XXX-bepinex",
      ),
      true,
    );
  });

  it("falls back to the build recorded in the template when the index is unreachable", async () => {
    const gameDir = makeGameDir();
    const ext = await withRealModule({ state: stateFor({ gameDir }) });
    answerDialogs(ext, pick("BepInEx"));
    const seen = answerDownloadEvents(ext);
    await withFetch(unreachable, () => ext.game.setup({ path: gameDir }));
    assert.deepEqual(seen[0].urls, [
      "https://builds.bepinex.dev/projects/bepinex_be/788/BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.788%2B5b766a3.zip",
    ]);
  });

  it("an x86 game takes the x86 artifact", async () => {
    const gameDir = makeGameDir();
    const ext = await withRealModule({
      transform: setConst("ARCH", '"x86"'),
      state: stateFor({ gameDir }),
    });
    answerDialogs(ext, pick("BepInEx"));
    const seen = answerDownloadEvents(ext);
    const x86 = (build, commit) => `BepInEx-Unity.IL2CPP-win-x86-6.0.0-be.${build}+${commit}.zip`;
    const html = indexPage(
      indexBlock(790, "abc1234", [il2cpp(790, "abc1234")]),
      indexBlock(789, "def5678", [x86(789, "def5678")]),
    );
    await withFetch(serve(html), () => ext.game.setup({ path: gameDir }));
    assert.deepEqual(seen[0].urls, [artifactUrl(789, x86(789, "def5678"))]);
  });

  it("an XNA game takes the .NET Framework artifact", async () => {
    const gameDir = makeGameDir();
    const ext = await withRealModule({ transform: xna, state: stateFor({ gameDir }) });
    const seen = answerDownloadEvents(ext);
    const framework = (build, commit) =>
      `BepInEx-NET.Framework-net452-win-x86-6.0.0-be.${build}+${commit}.zip`;
    const html = indexPage(
      indexBlock(790, "abc1234", [il2cpp(790, "abc1234"), framework(790, "abc1234")]),
    );
    await withFetch(serve(html), () => ext.game.setup({ path: gameDir }));
    assert.deepEqual(seen[0].urls, [artifactUrl(790, framework(790, "abc1234"))]);
  });

  it("tells the user about a newer build during the version check, and not when current", async () => {
    for (const [installed, expected] of [
      [788, ["BepInEx Injector update available (build 790)"]],
      [790, []],
    ]) {
      const ext = await withRealModule({
        state: stateFor({ gameDir: makeGameDir(), mods: beMods(installed) }),
      });
      const handler = ext.listeners.find(({ args }) => args[0] === "check-mods-version").args[1];
      await withFetch(serve(TWO_BUILDS), () => handler(GAME_ID, {}, false));
      assert.deepEqual(
        ext.notifications.map(({ message }) => message),
        expected,
      );
    }
  });
});

// ---- checks that pin the details the broader tests above leave loose ----------------------------

const saveConsts = all(
  setConst("enableSaveInstaller", "true"),
  setConst("SAVE_FILES", '["slot1.sav"]'),
  setConst("SAVE_EXTS", '[".sav"]'),
);
const gatedLoad = all(customMods, customLoader, saveConsts);
const gatedInstallerLoad = all(customMods, customLoaderWithInstaller, saveConsts);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const STAGING_ROOT = path.join(vortex.APP_ROOT, "staging", "XXX");

describe("template-unitymelonloaderbepinex-hybrid: installer routing, in detail", () => {
  const FOMOD = ["fomod/ModuleConfig.xml", "FOMOD/MODULECONFIG.XML", "Pack/fomod/moduleconfig.xml"];
  const NOT_FOMOD = ["other/ModuleConfig.xml", "fomod/info.xml"];
  const slashes = (files) => files.map((file) => file.replaceAll(path.sep, "/"));

  // `id` accepts the files; a FOMOD package is left alone; files that only look a little like one
  // are not; another game's mods are never taken.
  async function guarded(ext, files, id) {
    const accepted = await supportedBy(ext, files);
    assert.equal(accepted.includes(id), true, id);
    for (const marker of FOMOD) {
      assert.deepEqual(
        await supportedBy(ext, tree(...slashes(files), marker)),
        [],
        `${id} + ${marker}`,
      );
    }
    for (const marker of NOT_FOMOD) {
      assert.deepEqual(
        await supportedBy(ext, tree(...slashes(files), marker)),
        accepted,
        `${id} + ${marker}`,
      );
    }
    assert.deepEqual(await supportedBy(ext, files, "someothergame"), [], id);
  }

  it("applies each default installer's FOMOD guard to exactly what it should", async () => {
    const ext = await boot();
    for (const [id, files] of [
      ["XXX-bepinex", tree("winhttp.dll", "BepInEx/core/BepInEx.Core.dll")],
      ["XXX-melonloader", tree("version.dll", "MelonLoader/net6/MelonLoader.dll")],
      ["XXX-root", tree("XXX_Data/data.txt")],
      ["XXX-bepcfgman", tree("BepInEx/plugins/ConfigurationManager.dll")],
      ["XXX-melonprefman", tree("Mods/MelonPrefManager.IL2CPP.dll")],
      ["XXX-assemblydll", tree("GameAssembly.dll")],
      ["XXX-plugin", tree("Mod.dll")],
      ["XXX-assets", tree("data.assets")],
      ["XXX-fallback", tree("readme.txt")],
    ]) {
      await guarded(ext, files, id);
    }
  });

  it("applies the optional installers' FOMOD guard the same way, and takes them beside other files", async () => {
    const gated = await boot({ transform: gatedLoad });
    for (const [id, files] of [
      ["XXX-custommod", tree("a.custom.json", "readme.txt")],
      ["XXX-save", tree("slot1.sav", "readme.txt")],
      ["XXX-customloader", tree("XXX.dll", "readme.txt")],
    ]) {
      await guarded(gated, files, id);
    }
    const withInstaller = await boot({ transform: gatedInstallerLoad });
    await guarded(withInstaller, tree("XXX.exe", "readme.txt"), "XXX-customloader");
  });

  it("needs the loader's own files, not just any file beside them", async () => {
    const ext = await boot();
    for (const files of [
      tree("winhttp.dll"),
      tree("version.dll"),
      tree("BepInEx/core/BepInEx.Core.dll"),
      tree("MelonLoader/net6/MelonLoader.dll"),
      tree("BepInEx/plugins/Other.dll"),
      tree("Mods/Other.dll"),
    ]) {
      assert.deepEqual(await supportedBy(ext, files), ["XXX-plugin", "XXX-fallback"], files.join());
    }
  });
});

describe("template-unitymelonloaderbepinex-hybrid: install output, in detail", () => {
  it("installs the assembly mod and its neighbours from an unwrapped archive", async () => {
    const ext = await boot();
    assert.deepEqual(
      await installWith(ext, "XXX-assemblydll", tree("GameAssembly.dll", "other.dll", "x.txt")),
      [
        copy("GameAssembly.dll", "GameAssembly.dll"),
        copy("other.dll", "other.dll"),
        copy("x.txt", "x.txt"),
        modType("XXX-assemblydll"),
      ],
    );
  });

  it("installs BepInExConfigManager from an unwrapped archive, with any folder case", async () => {
    const ext = await boot();
    assert.deepEqual(
      await installWith(
        ext,
        "XXX-bepcfgman",
        tree("plugins/ConfigurationManager.dll", "readme.txt"),
      ),
      [
        copy(
          sep("plugins", "ConfigurationManager.dll"),
          sep("plugins", "ConfigurationManager.dll"),
        ),
        copy("readme.txt", "readme.txt"),
        modType("XXX-bepcfgman"),
      ],
    );
    assert.deepEqual(
      await installWith(ext, "XXX-bepcfgman", tree("Plugins/CONFIGURATIONMANAGER.DLL")),
      [
        copy(
          sep("Plugins", "CONFIGURATIONMANAGER.DLL"),
          sep("Plugins", "CONFIGURATIONMANAGER.DLL"),
        ),
        modType("XXX-bepcfgman"),
      ],
    );
  });

  it("installs an assets file with an upper-case extension", async () => {
    const ext = await boot();
    assert.deepEqual(await installWith(ext, "XXX-assets", tree("LEVEL0.ASSETS")), [
      copy("LEVEL0.ASSETS", "LEVEL0.ASSETS"),
      modType("XXX-assets"),
    ]);
  });

  it("installs a custom mod data file with an upper-case name", async () => {
    const ext = await boot({ transform: customMods });
    assert.deepEqual(await installWith(ext, "XXX-custommod", tree("A.CUSTOM.JSON")), [
      copy("A.CUSTOM.JSON", "A.CUSTOM.JSON"),
      modType("XXX-custommod"),
    ]);
  });

  it("picks the save by its listed name, in any case, before the first save it finds", async () => {
    const ext = await boot({ transform: saveConsts });
    assert.deepEqual(await installWith(ext, "XXX-save", tree("a/other.sav", "b/SLOT1.SAV")), [
      copy(sep("b", "SLOT1.SAV"), "SLOT1.SAV"),
      modType("XXX-assets"),
    ]);
  });

  it("installs the custom loader from an unwrapped archive, either build", async () => {
    const plain = await boot({ transform: customLoader });
    assert.deepEqual(await installWith(plain, "XXX-customloader", tree("XXX.dll", "a.txt")), [
      copy("XXX.dll", "XXX.dll"),
      copy("a.txt", "a.txt"),
      modType("XXX-customloader"),
    ]);
    const withInstaller = await boot({ transform: customLoaderWithInstaller });
    assert.deepEqual(
      await installWith(withInstaller, "XXX-customloader", tree("XXX.exe", "a.txt")),
      [
        copy("XXX.exe", sep("XXX", "XXX.exe")),
        copy("a.txt", sep("XXX", "a.txt")),
        modType("XXX-customloader"),
      ],
    );
  });
});

describe("template-unitymelonloaderbepinex-hybrid: plugin sorter, in detail", () => {
  const CUSTOM_DLL = "built for CustomLoaderPlugin";

  it("drops archive-root package metadata in any case from an unwrapped install", async () => {
    const { instructions } = await sortPlugins({
      "plugins/Foo.dll": BEPINEX_PLUGIN,
      "MANIFEST.JSON": "{}",
      "ICON.PNG": "i",
    });
    assert.deepEqual(instructions, [
      copy(sep("plugins", "Foo.dll"), sep("plugins", "Foo.dll")),
      modType("XXX-bepinexmod"),
    ]);
  });

  it("recognises a patchers folder, and a custom loader's mods folder, in any case", async () => {
    const patcher = await sortPlugins({ "Patchers/P.dll": BEPINEX_PATCHER });
    assert.deepEqual(patcher.instructions, [
      copy(sep("Patchers", "P.dll"), sep("Patchers", "P.dll")),
      modType("XXX-bepinexmod"),
    ]);
    const custom = await sortPlugins(
      { "Mods/Custom.dll": CUSTOM_DLL },
      { transform: customLoader },
    );
    assert.deepEqual(custom.instructions, [
      copy(sep("Mods", "Custom.dll"), sep("Mods", "Custom.dll")),
      modType("XXX-customloadermod"),
    ]);
  });

  it("keeps sorting BepInEx, MelonLoader and unknown dlls as usual when there is a custom loader", async () => {
    const bep = await sortPlugins({ "Foo.dll": BEPINEX_PLUGIN }, { transform: customLoader });
    assert.deepEqual(bep.instructions, [
      copy("Foo.dll", sep("Foo", "Foo.dll")),
      modType("XXX-bepinex-plugins"),
    ]);
    const mel = await sortPlugins({ "Mod.dll": MELON_MOD }, { transform: customLoader });
    assert.equal(mel.instructions.at(-1).value, "XXX-melonloader-mods");
    const unknown = await sortPlugins({ "Foo.dll": UNKNOWN_DLL }, { transform: customLoader });
    assert.deepEqual(unknown.instructions, [copy("Foo.dll", "Foo.dll"), {}]);
  });

  it("shows no dialog when the plugin suits the loader that is installed, custom loader or not", async () => {
    for (const [entries, mods] of [
      [{ "Foo.dll": BEPINEX_PLUGIN }, ["XXX-bepinex"]],
      [{ "Mod.dll": MELON_MOD }, ["XXX-melonloader"]],
      [{ "Custom.dll": CUSTOM_DLL }, ["XXX-customloader"]],
      [{ "Foo.dll": UNKNOWN_DLL }, ["XXX-bepinex"]],
      [{ "Foo.dll": BEPINEX_PLUGIN }, []],
    ]) {
      const { ext, error } = await sortPlugins(entries, { mods, transform: customLoader });
      assert.equal(error, undefined);
      assert.deepEqual(ext.dialogs, []);
    }
  });

  describe("refusing a plugin built for another loader", () => {
    async function refuse(entries, mods, transform) {
      const ext = await boot({
        transform,
        state: stateFor({ gameDir: makeGameDir(), mods: modsOf(...mods) }),
      });
      answerDialogs(ext, pick("Ok"));
      const { workingDir, files } = stage(entries);
      let error;
      try {
        await installerOf(ext, "XXX-plugin").install(files, workingDir);
      } catch (err) {
        error = err;
      }
      return { ext, error };
    }

    const cases = [
      [
        "a BepInEx plugin while MelonLoader is installed",
        { "Foo.dll": BEPINEX_PLUGIN },
        ["XXX-melonloader"],
        undefined,
        "Wrong Mod Loader",
        /^Vortex has detected that the Mod Archive archive has BepInEx plugins, but you have installed MelonLoader\.\[br\]\[\/br\]\[br\]\[\/br\]The installation will be cancelled to avoid issues\.\[br\]\[\/br\]\[br\]\[\/br\]Check the mod's page to see if there is a MelonLoader version of the mod, or change your mod loader to BepInEx\./,
      ],
      [
        "a MelonLoader mod while BepInEx is installed",
        { "Mod.dll": MELON_MOD },
        ["XXX-bepinex"],
        undefined,
        "Wrong Mod Loader",
        /^Vortex has detected that the Mod Archive archive has MelonLoader plugins, but you have installed BepInEx\.\[br\]\[\/br\]\[br\]\[\/br\]The installation will be cancelled to avoid issues\.\[br\]\[\/br\]\[br\]\[\/br\]Check the mod's page to see if there is a BepInEx version of the mod, or change your mod loader to MelonLoader\./,
      ],
      [
        "an archive with plugins for both",
        { "Foo.dll": BEPINEX_PLUGIN, "Mod.dll": MELON_MOD },
        [],
        undefined,
        "Mixed Mod Detected",
        /^Vortex has detected that the Mod Archive archive has both BepInEx and MelonLoader plugins in the same archive\.\[br\]\[\/br\]\[br\]\[\/br\]Mixed mods are not supported by the game extension and the mod author will need to repackage their mod\.\[br\]\[\/br\]\[br\]\[\/br\]You can manually extract the correct plugin from the archive and install it to Vortex\./,
      ],
      [
        "a custom loader plugin while BepInEx is installed",
        { "Custom.dll": CUSTOM_DLL },
        ["XXX-bepinex"],
        customLoader,
        "Wrong Mod Loader",
        /^Vortex has detected that the Mod Archive archive has XXX plugins, but you have installed BepInEx or MelonLoader\.\[br\]\[\/br\]\[br\]\[\/br\]The installation will be cancelled to avoid issues\.\[br\]\[\/br\]\[br\]\[\/br\]The installation will be cancelled to avoid issues\.\[br\]\[\/br\]\[br\]\[\/br\]Check the mod's page to see if there is a XXX version of the mod, or change your mod loader to MelonLoader\.\[br\]\[\/br\]\[br\]\[\/br\]$/,
      ],
      [
        "a BepInEx plugin while the custom loader is installed",
        { "Foo.dll": BEPINEX_PLUGIN },
        ["XXX-customloader"],
        customLoader,
        "Wrong Mod Loader",
        /^Vortex has detected that the Mod Archive archive has BepInEx\/MelonLoader plugins, but you have installed XXX\.\[br\]\[\/br\]\[br\]\[\/br\]The installation will be cancelled to avoid issues\.\[br\]\[\/br\]\[br\]\[\/br\]Check the mod's page to see if there is a XXX version of the mod, or change your mod loader to BepInEx\/MelonLoader\.\[br\]\[\/br\]\[br\]\[\/br\]$/,
      ],
      [
        "a MelonLoader mod while the custom loader is installed",
        { "Mod.dll": MELON_MOD },
        ["XXX-customloader"],
        customLoader,
        "Wrong Mod Loader",
        /has BepInEx\/MelonLoader plugins, but you have installed XXX\./,
      ],
    ];

    for (const [label, entries, mods, transform, title, bbcode] of cases) {
      it(`${label}: the dialog and the cancellation are exactly as worded`, async () => {
        const { ext, error } = await refuse(entries, mods, transform);
        assert.equal(ext.dialogs.length >= 1, true);
        const [type, dialogTitle, content, buttons] = ext.dialogs[0];
        assert.deepEqual([type, dialogTitle, buttons], ["error", title, [{ label: "Ok" }]]);
        assert.deepEqual(content.options, { order: ["bbcode"], wrap: true });
        assert.match(content.bbcode, bbcode);
        assert.equal(error.message, "User canceled");
        assert.equal(error.kind, "user-canceled");
        assert.equal(error.skipped, false);
      });
    }
  });
});

describe("template-unitymelonloaderbepinex-hybrid: unknown dll and fallback notices, in detail", () => {
  async function unknownNotice({ mods = {}, archive = "Mod Archive.installing" } = {}) {
    const state = stateFor({ gameDir: makeGameDir() });
    Object.assign(state.persistent.mods.XXX, mods);
    const ext = await boot({ state });
    const { workingDir, files } = stage({ "Foo.dll": UNKNOWN_DLL }, archive);
    await installerOf(ext, "XXX-plugin").install(files, workingDir);
    return ext;
  }
  const warnLogged = (message) =>
    vortex.logs.some((entry) => entry.level === "warn" && entry.message === message);

  it("keeps the unknown dll notice id to twenty characters of the mod's name", async () => {
    const ext = await unknownNotice({ archive: "A Rather Long Mod Name Indeed.installing" });
    assert.equal(ext.notifications[0].id, "XXX-ARatherLongModNameIn-fallback");
  });

  it("opens the matched mod's page from the unknown dll notice, and logs the match", async () => {
    const ext = await unknownNotice({
      mods: {
        other: { id: "other", installationPath: "Another", attributes: { modId: 1 } },
        matched: { id: "matched", installationPath: "Mod Archive", attributes: { modId: 77 } },
      },
    });
    const opened = stubShell();
    openMore(ext, ext.notifications[0]);
    ext.dialogs.at(-1)[3][2].action();
    assert.deepEqual(opened, [
      path.join(STAGING_ROOT, "Mod Archive"),
      "https://www.nexusmods.com/XXX/mods/77?tab=description",
    ]);
    assert.equal(warnLogged("Found matched for Mod Archive"), true);
  });

  it("falls back to the mod list when the unknown dll notice finds no usable match", async () => {
    const ext = await unknownNotice();
    const opened = stubShell();
    openMore(ext, ext.notifications[0]);
    ext.dialogs.at(-1)[3][2].action();
    assert.equal(opened.at(-1), "https://www.nexusmods.com/XXX/mods/");
    assert.equal(warnLogged("Found undefined for Mod Archive"), true);
    const noModId = await unknownNotice({
      mods: { m: { id: "m", installationPath: "Mod Archive", attributes: {} } },
    });
    const again = stubShell();
    openMore(noModId, noModId.notifications[0]);
    noModId.dialogs.at(-1)[3][2].action();
    assert.equal(again.at(-1), "https://www.nexusmods.com/XXX/mods/");
    assert.equal(warnLogged("Found m for Mod Archive"), true);
  });

  it("reports a shell that will not open the pages from the unknown dll notice", async () => {
    const ext = await unknownNotice();
    brokenShell();
    openMore(ext, ext.notifications[0]);
    const buttons = ext.dialogs.at(-1)[3];
    buttons[1].action();
    buttons[2].action();
    assert.deepEqual(
      ext.errors.map(([message, error, options]) => [message, error.message, options]),
      [
        ["Failed to open the URL", "no url", { allowReport: false }],
        ["Failed to open the file or folder", "no file", { allowReport: false }],
        ["Failed to open the URL", "no url", { allowReport: false }],
      ],
    );
  });

  it("logs the mod the fallback notice matched, or that it found none", async () => {
    const state = stateFor({ gameDir: makeGameDir() });
    state.persistent.mods.XXX.matched = {
      id: "matched",
      installationPath: "My Cool Mod",
      attributes: { modId: 5 },
    };
    const ext = await boot({ state });
    await installerOf(ext, "XXX-fallback").install(
      tree("a.txt"),
      path.join("C:", "staging", "My Cool Mod.installing"),
    );
    stubShell();
    openMore(ext, ext.notifications[0]);
    ext.dialogs.at(-1)[3][2].action();
    assert.equal(warnLogged("Found matched for My Cool Mod"), true);
    const none = await boot({ state: stateFor({ gameDir: makeGameDir() }) });
    await installerOf(none, "XXX-fallback").install(
      tree("a.txt"),
      path.join("C:", "staging", "Another Mod.installing"),
    );
    stubShell();
    openMore(none, none.notifications[0]);
    none.dialogs.at(-1)[3][2].action();
    assert.equal(warnLogged("Found undefined for Another Mod"), true);
  });
});

describe("template-unitymelonloaderbepinex-hybrid: dialog wording, in detail", () => {
  async function setupWith({ transform, mods = {}, choose = pick("Cancel"), files = [] } = {}) {
    const gameDir = makeGameDir(files);
    const ext = await boot({ transform, state: stateFor({ gameDir, mods }) });
    ext.api.translate = interpolate;
    answerDialogs(ext, choose);
    await ext.game.setup({ path: gameDir });
    return ext;
  }

  it("words the loader selection dialog exactly", async () => {
    const ext = await setupWith();
    const dialog = ext.dialogs.find(([, title]) => title === "Mod Loader Selection");
    assert.equal(
      dialog[2].bbcode,
      "You must choose a mod loader to install mods.[br][/br][br][/br]" +
        "Only one mod loader can be installed at a time.[br][/br][br][/br]" +
        "Make your choice based on which mods you would like to install and which loader they support.[br][/br][br][/br]" +
        "You can change which mod loader you have installed by Uninstalling the current one from Vortex, which will bring up this dialog again.[br][/br][br][/br]" +
        "Which mod loader would you like to use for XXX?",
    );
  });

  it("words the conflict dialog exactly", async () => {
    const ext = await setupWith({ mods: modsOf("XXX-bepinex", "XXX-melonloader") });
    const dialog = ext.dialogs.find(([, title]) => title === "Mod Loader Conflict");
    assert.equal(
      dialog[2].bbcode,
      "You have more than one mod loader installed.[br][/br][br][/br]" +
        "This will cause the game to crash at launch. Only one mod loader can be installed at a time.[br][/br][br][/br]" +
        "You must choose which mod loader you would like to use for XXX.",
    );
  });

  it("words the restart dialog exactly", async () => {
    const gameDir = makeGameDir();
    const ext = await boot({ transform: customMods, state: stateFor({ gameDir }) });
    answerDeployEvents(ext);
    answerDialogs(ext, (args) =>
      args[1] === "Mod Loader Selection" ? { action: "BepInEx" } : { action: "Restart Extension" },
    );
    await ext.game.setup({ path: gameDir });
    await waitFor(() => ext.dialogs.some(([, title]) => title === "Restart Required"));
    const restart = ext.dialogs.find(([, title]) => title === "Restart Required");
    assert.equal(
      restart[2].text,
      "\nThe extension requires a restart to complete the Mod Loader setup.\n" +
        "\nThe extension will purge mods and then exit - please re-activate the game via the Games page or Dashboard page.\n" +
        '\nIMPORTANT: You may see an External Changes dialogue. Select "Revert change (use staging file)".\n' +
        "\n",
    );
  });

  it("purges all the way when the restart dialog is accepted", async () => {
    const gameDir = makeGameDir();
    const ext = await boot({ transform: customMods, state: stateFor({ gameDir }) });
    const purged = [];
    ext.api.events.on("deploy-mods", (callback) => callback(null));
    ext.api.events.on("purge-mods", (clean, callback) => {
      purged.push(clean);
      callback(null);
    });
    answerDialogs(ext, (args) =>
      args[1] === "Mod Loader Selection" ? { action: "BepInEx" } : { action: "Restart Extension" },
    );
    await ext.game.setup({ path: gameDir });
    await waitFor(() => purged.length > 0);
    assert.deepEqual(purged, [true]);
  });

  it("words the MelonPreferencesManager and .NET dialogs exactly", async () => {
    const prefMan = await setupWith({
      transform: setConst("allowMelPrefMan", "true"),
      mods: modsOf("XXX-melonloader"),
    });
    const prefDialog = openMore(
      prefMan,
      prefMan.notifications.find(({ id }) => id === "XXX-melonprefman"),
    );
    assert.equal(prefDialog[0], "question");
    assert.equal(
      prefDialog[2].text,
      "MelonPreferencesManager is a mod that allows you to configure MelonLoader mods with and in-game GUI.\n" +
        "Click the button below to download and install MelonPreferencesManager.\n" +
        "Once installed, the default key to show the configuration menu is F5.\n" +
        "\n" +
        "MelonPreferencesManager is installed as a managed mod: it appears in your mod list with its version, and you can disable or remove it from there.\n",
    );
    const dotnet = await setupWith({ mods: modsOf("XXX-melonloader") });
    const dotDialog = openMore(
      dotnet,
      dotnet.notifications.find(({ id }) => id === "XXX-dotnetmelon-notify"),
    );
    assert.equal(dotDialog[0], "question");
    assert.equal(
      dotDialog[2].text,
      "\nMelonLoader requires .NET 6 to be installed on your system for IL2CPP build Unity games, like this game.\n" +
        "\nPlease install .NET 6 so that MelonLoader can function. Your game may crash at launch if the correct version of .NET is not installed.\n" +
        "\n",
    );
  });
});

describe("template-unitymelonloaderbepinex-hybrid: waiting for downloads, removals and dialogs", () => {
  async function setupSlow({ transform, choose, mods = {}, dialogDelay = 0, nexus = false }) {
    const gameDir = makeGameDir();
    const ext = await boot({ transform, slow: 30, state: stateFor({ gameDir, mods }) });
    if (choose) answerDialogs(ext, choose, dialogDelay);
    answerDownloadEvents(ext, nexus ? 30 : 0);
    await ext.game.setup({ path: gameDir });
    return ext;
  }
  const installedMods = (ext) =>
    ext.dispatched.filter(({ type }) => type === "setModType").map(({ payload }) => payload[2]);

  it("setup returns only once the loader the user picked has finished downloading", async () => {
    for (const [transform, choose, expected] of [
      [undefined, pick("BepInEx"), ["downloadBepinexBe"]],
      [undefined, pick("MelonLoader (Recommended)"), ["download"]],
      [mono, pick("BepInEx"), ["download"]],
      [bepinexLoader, undefined, ["downloadBepinexBe"]],
      [melonLoader, undefined, ["download"]],
    ]) {
      const ext = await setupSlow({ transform, choose, dialogDelay: 10 });
      assert.deepEqual(ext.fake.finished, expected);
    }
  });

  it("setup returns only once a loader from the game's Nexus page has been installed", async () => {
    for (const [transform, choose, type] of [
      [nexusBepinex, pick("BepInEx"), "XXX-bepinex"],
      [all(nexusBepinex, bepinexLoader), undefined, "XXX-bepinex"],
      [nexusMelon, pick("MelonLoader (Recommended)"), "XXX-melonloader"],
      [all(nexusMelon, melonLoader), undefined, "XXX-melonloader"],
      [customLoader, pick("XXX (Recommended)"), "XXX-customloader"],
    ]) {
      const ext = await setupSlow({ transform, choose, nexus: true });
      assert.deepEqual(installedMods(ext), [type]);
    }
  });

  it("asks for the Nexus login before it asks the page for files", async () => {
    for (const loader of nexusLoaders) {
      const ext = await boot({
        transform: all(loader.transform, exposing(loader.fn)),
        state: stateFor({ gameDir: makeGameDir() }),
      });
      const order = [];
      ext.api.ext.ensureLoggedIn = async () => {
        await wait(20);
        order.push("logged in");
      };
      ext.api.ext.nexusGetModFiles = async () => {
        order.push("files");
        return [];
      };
      answerDownloadEvents(ext);
      await ext.exports.internals[loader.fn](ext.api, { game: { id: "XXX" } }, true);
      assert.deepEqual(order, ["logged in", "files"], loader.label);
    }
  });

  it("downloads by default only what is not already installed", async () => {
    for (const loader of nexusLoaders) {
      const ext = await boot({
        transform: all(loader.transform, exposing(loader.fn)),
        state: stateFor({ gameDir: makeGameDir(), mods: modsOf(loader.installed) }),
      });
      const seen = answerDownloadEvents(ext);
      await ext.exports.internals[loader.fn](ext.api, { game: { id: "XXX" } });
      assert.deepEqual(seen, [], loader.label);
    }
  });

  it("downloads MelonLoader by default without forcing it", async () => {
    const ext = await boot({ transform: exposing("downloadMelon") });
    await ext.exports.internals.downloadMelon(ext.api, { game: { id: "XXX" } });
    assert.equal(ext.fake.calls[0][2], false);
  });

  it("finishes the restart's deployment before it shows the restart dialog", async () => {
    const gameDir = makeGameDir();
    const ext = await boot({ transform: customMods, state: stateFor({ gameDir }) });
    const order = [];
    ext.api.events.on("deploy-mods", (callback) =>
      setTimeout(() => {
        order.push("deployed");
        callback(null);
      }, 30),
    );
    ext.api.events.on("purge-mods", (_clean, callback) => callback(null));
    answerDialogs(ext, (args) => {
      if (args[1] === "Restart Required") order.push("restart dialog");
      return args[1] === "Mod Loader Selection"
        ? { action: "BepInEx" }
        : { action: "Restart Extension" };
    });
    await ext.game.setup({ path: gameDir });
    await waitFor(() => order.includes("restart dialog"));
    assert.deepEqual(order, ["deployed", "restart dialog"]);
  });

  it("finishes the restart's deployment after a conflict before it shows the restart dialog", async () => {
    const gameDir = makeGameDir();
    const ext = await boot({
      transform: customMods,
      state: stateFor({ gameDir, mods: modsOf("XXX-bepinex", "XXX-melonloader") }),
    });
    const order = [];
    ext.api.events.on("deploy-mods", (callback) =>
      setTimeout(() => {
        order.push("deployed");
        callback(null);
      }, 30),
    );
    ext.api.events.on("purge-mods", (_clean, callback) => callback(null));
    answerDialogs(ext, (args) => {
      if (args[1] === "Restart Required") order.push("restart dialog");
      return args[1] === "Mod Loader Conflict"
        ? { action: "BepInEx" }
        : { action: "Restart Extension" };
    });
    await withUtil({ removeMods: async () => undefined }, () => ext.game.setup({ path: gameDir }));
    await waitFor(() => order.includes("restart dialog"));
    assert.deepEqual(order, ["deployed", "restart dialog"]);
  });

  describe("removing the loaders that lose a conflict", () => {
    const mods = {
      a: { id: "bep-id", type: "XXX-bepinex" },
      b: { id: "mel-id", type: "XXX-melonloader" },
      c: { id: "cus-id", type: "XXX-customloader" },
    };
    const MARKER = ["XXX_Data/Managed/XXX.dll"];

    async function resolve({ transform, keep, only, files = [], removeMods }) {
      const gameDir = makeGameDir(files);
      const ext = await boot({
        transform,
        state: stateFor({ gameDir, mods: Object.fromEntries(only.map((key) => [key, mods[key]])) }),
      });
      answerDialogs(ext, pick(keep));
      await withUtil({ removeMods }, () => ext.game.setup({ path: gameDir }));
      return ext;
    }
    // The first removal is the slowest, so one that is not awaited finishes out of order.
    const slowRemoval = (done) => {
      let calls = 0;
      return async (_api, _game, ids) => {
        await wait(calls++ === 0 ? 40 : 10);
        done.push(...ids);
      };
    };
    const warned = (message) =>
      vortex.logs.some((entry) => entry.level === "warn" && entry.message === message);

    it("waits for every removal to finish before setup carries on", async () => {
      for (const [transform, keep, only, files, expected] of [
        [undefined, "BepInEx", ["a", "b"], [], ["mel-id"]],
        [undefined, "MelonLoader", ["a", "b"], [], ["bep-id"]],
        [customLoaderWithInstaller, "BepInEx", ["a", "b", "c"], MARKER, ["mel-id", "cus-id"]],
        [customLoaderWithInstaller, "MelonLoader", ["a", "b", "c"], MARKER, ["bep-id", "cus-id"]],
        [customLoader, "XXX (Recommended)", ["a", "b", "c"], [], ["mel-id", "bep-id"]],
      ]) {
        const done = [];
        await resolve({ transform, keep, only, files, removeMods: slowRemoval(done) });
        assert.deepEqual(done, expected, keep);
      }
    });

    it("logs which loader mod it is removing", async () => {
      await resolve({
        transform: customLoaderWithInstaller,
        keep: "MelonLoader",
        only: ["a", "b", "c"],
        files: MARKER,
        removeMods: async () => undefined,
      });
      assert.equal(warned("Found BepInEx mod to remove for deconfliction: bep-id"), true);
      assert.equal(warned("Found XXX mod to remove for deconfliction: cus-id"), true);
      await resolve({
        keep: "BepInEx",
        only: ["a", "b"],
        removeMods: async () => undefined,
      });
      assert.equal(warned("Found MelonLoader mod to remove for deconfliction: mel-id"), true);
    });

    it("logs the custom loader files it removes, with the exact list", async () => {
      await resolve({
        transform: customLoaderWithInstaller,
        keep: "BepInEx",
        only: ["a", "c"],
        files: MARKER,
        removeMods: async () => undefined,
      });
      assert.equal(
        warned(
          `Found XXX files to remove for deconfliction/purge: [winhttp.dll, ${sep("XXX_Data", "Managed", "XXX.dll")}]`,
        ),
        true,
      );
    });

    it("reports a BepInEx or custom loader that will not come off, without offering to report it", async () => {
      const failing = async () => {
        throw new Error("cannot remove");
      };
      const bepinex = await resolve({ keep: "MelonLoader", only: ["a", "b"], removeMods: failing });
      const custom = await resolve({
        transform: customLoaderWithInstaller,
        keep: "BepInEx",
        only: ["a", "c"],
        files: MARKER,
        removeMods: failing,
      });
      assert.deepEqual(
        [bepinex, custom].map(({ errors }) =>
          errors[0].slice(0, 1).concat(errors[0][1].message, errors[0][2]),
        ),
        [
          ["Failed to remove BepInEx", "cannot remove", { allowReport: false }],
          ["Failed to remove XXX", "cannot remove", { allowReport: false }],
        ],
      );
    });
  });

  describe("only one of the three loaders", () => {
    it("is not a conflict whichever one it is, and is not asked about again", async () => {
      for (const type of ["XXX-bepinex", "XXX-melonloader", "XXX-customloader"]) {
        const gameDir = makeGameDir();
        const ext = await boot({
          transform: customLoader,
          state: stateFor({ gameDir, mods: modsOf(type) }),
        });
        answerDialogs(ext, pick("Cancel"));
        await ext.game.setup({ path: gameDir });
        assert.deepEqual(ext.dialogs, [], type);
        await ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1]("profile", {});
        assert.deepEqual(ext.dialogs, [], type);
      }
    });

    it("a deployment calls a custom loader beside either other loader a conflict", async () => {
      for (const other of ["XXX-bepinex", "XXX-melonloader"]) {
        const ext = await boot({
          transform: customLoader,
          state: stateFor({ gameDir: makeGameDir(), mods: modsOf(other, "XXX-customloader") }),
        });
        answerDialogs(ext, pick("Cancel"));
        await ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1]("profile", {});
        assert.deepEqual(
          ext.dialogs.map(([, title]) => title),
          ["Mod Loader Conflict"],
          other,
        );
      }
    });

    it("setup offers the custom loader when the installer build has neither a mod nor its marker file", async () => {
      const gameDir = makeGameDir();
      const ext = await boot({
        transform: customLoaderWithInstaller,
        state: stateFor({ gameDir }),
      });
      answerDialogs(ext, pick("Cancel"));
      await ext.game.setup({ path: gameDir });
      assert.deepEqual(
        ext.dialogs.map(([, title]) => title),
        ["Mod Loader Selection"],
      );
    });
  });

  describe("handlers that wait for the loader dialog", () => {
    it("a deployment finishes only after the loader the user picked has downloaded", async () => {
      const ext = await boot({ slow: 30, state: stateFor({ gameDir: makeGameDir() }) });
      answerDialogs(ext, pick("BepInEx"), 10);
      await ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1]("profile", {});
      assert.deepEqual(ext.fake.finished, ["downloadBepinexBe"]);
    });

    it("a deployment finishes only after the conflict has been resolved", async () => {
      const ext = await boot({
        state: stateFor({ gameDir: makeGameDir(), mods: modsOf("XXX-bepinex", "XXX-melonloader") }),
      });
      answerDialogs(ext, pick("BepInEx"), 10);
      const done = [];
      await withUtil(
        {
          removeMods: async (_api, _game, ids) => {
            await wait(20);
            done.push(...ids);
          },
        },
        () => ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1]("profile", {}),
      );
      assert.deepEqual(done, ["mod-1"]);
    });

    it("a purge finishes only after the loader the user picked has downloaded", async () => {
      const ext = await boot({
        transform: customLoader,
        slow: 30,
        state: stateFor({ gameDir: makeGameDir() }),
      });
      answerDialogs(ext, pick("BepInEx"), 10);
      await ext.listeners.find(({ args }) => args[0] === "did-purge").args[1]("profile");
      assert.deepEqual(ext.fake.finished, ["downloadBepinexBe"]);
    });
  });

  describe("the custom loader's installer reminder and clean-up", () => {
    const purgeOf = (ext) => ext.listeners.find(({ args }) => args[0] === "did-purge").args[1];
    const deployOf = (ext) => ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1];
    const removalLogged = () =>
      vortex.logs.some(({ message }) => message.startsWith("Found XXX files to remove"));

    it("does not remind the user without an installer, or without the loader being installed", async () => {
      for (const [transform, mods] of [
        [customLoader, {}],
        [customLoaderWithInstaller, {}],
        [customLoader, modsOf("XXX-customloader")],
      ]) {
        const ext = await boot({ transform, state: stateFor({ gameDir: makeGameDir(), mods }) });
        answerDialogs(ext, pick("Cancel"));
        await deployOf(ext)("profile", {});
        assert.equal(
          ext.notifications.some(({ id }) => id === "XXX-custominstaller"),
          false,
        );
      }
    });

    it("leaves a mod-based custom loader's files alone on a purge, even when its marker file is there", async () => {
      const gameDir = makeGameDir(["winhttp.dll", "XXX_Data/Managed/XXX.dll"]);
      const ext = await boot({
        transform: customLoader,
        state: stateFor({ gameDir, mods: modsOf("XXX-customloader") }),
      });
      await purgeOf(ext)("profile");
      assert.equal(fs.existsSync(path.join(gameDir, "winhttp.dll")), true);
      assert.equal(fs.existsSync(path.join(gameDir, "XXX_Data", "Managed", "XXX.dll")), true);
    });

    it("removes nothing on a purge while the installer's marker file is missing", async () => {
      const ext = await boot({
        transform: customLoaderWithInstaller,
        state: stateFor({ gameDir: makeGameDir(), mods: modsOf("XXX-customloader") }),
      });
      await purgeOf(ext)("profile");
      assert.equal(removalLogged(), false);
    });

    it("does not ask for a loader after a purge while another loader is installed", async () => {
      for (const type of ["XXX-bepinex", "XXX-melonloader"]) {
        const ext = await boot({
          transform: customLoader,
          state: stateFor({ gameDir: makeGameDir(), mods: modsOf(type) }),
        });
        answerDialogs(ext, pick("Cancel"));
        await purgeOf(ext)("profile");
        assert.deepEqual(ext.dialogs, [], type);
      }
    });
  });
});

describe("template-unitymelonloaderbepinex-hybrid: mod types and game, in detail", () => {
  it("offers the optional mod types only once the game is discovered, and none detects by content", async () => {
    const gameDir = makeGameDir();
    const discovered = await boot({
      transform: all(customMods, customLoader),
      state: stateFor({ gameDir }),
    });
    const bare = await boot({ transform: all(customMods, customLoader) });
    for (const id of [
      "XXX-custommod",
      "XXX-customloadermod",
      "XXX-customloaderplugin",
      "XXX-customloader",
    ]) {
      const type = discovered.modTypes.find((entry) => entry.id === id);
      assert.equal(type.isSupported(GAME_ID), true, id);
      assert.equal(type.isSupported("someothergame"), false, id);
      assert.equal(await type.test(), false, id);
      assert.equal(bare.modTypes.find((entry) => entry.id === id).isSupported(GAME_ID), false, id);
    }
  });

  it("points the optional mod types at their folders", async () => {
    const gameDir = makeGameDir();
    const ext = await boot({
      transform: all(customMods, customLoader),
      state: stateFor({ gameDir }),
    });
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.equal(targets["XXX-customloadermod"], gameDir);
    assert.equal(targets["XXX-customloaderplugin"], sep(gameDir, "XXX"));
    assert.equal(targets["XXX-customloader"], gameDir);
    assert.equal(targets["XXX-custommod"], gameDir);
  });

  it("resolves a mod type's folder to something, without an error, before the game is discovered", async () => {
    const ext = await boot();
    for (const { id, getPath } of ext.modTypes) {
      assert.equal(typeof getPath({ id: GAME_ID }), "string", id);
    }
    assert.deepEqual(ext.errors, []);
  });

  it("follows the game's mod path setting, relative or not", async () => {
    const gameDir = makeGameDir();
    const absolute = await boot({
      transform: all(
        (source) => source.replace("modPathIsRelative: true", "modPathIsRelative: false"),
        setConst("MOD_PATH_DEFAULT", '"{gamePath}/Mods"'),
      ),
      state: stateFor({ gameDir }),
    });
    assert.equal(absolute.game.queryModPath(), `${gameDir}/Mods`);
    const empty = await boot({ transform: setConst("MOD_PATH_DEFAULT", '""') });
    assert.equal(empty.game.queryModPath(), ".");
  });

  it("launches the second executable's tool the way the first one launches", async () => {
    const ext = await boot({ transform: multiExe });
    const alt = ext.game.supportedTools.find(({ id }) => id === "XXX-customlaunchalt");
    assert.deepEqual([alt.detach, alt.relative], [true, true]);
  });

  it("registers every optional toolbar action in the same group, at the same priority", async () => {
    const ext = await boot({
      transform: all(
        withLinks,
        setConst("allowMelPrefMan", "true"),
        setConst("SAVE_FOLDERNAME", '"Saves"'),
      ),
    });
    assert.equal(ext.registeredActions.length, 16);
    for (const { group, priority, icon, options, title } of ext.registeredActions) {
      assert.deepEqual([group, priority, icon, options], ["mod-icons", 300, "open-ext", {}], title);
    }
  });
});

describe("template-unitymelonloaderbepinex-hybrid: game version, in detail", () => {
  const versionOf = async (gameDir, transform) =>
    (await boot({ transform })).game.getGameVersion(gameDir);
  const loggedError = (pattern) =>
    vortex.logs.some(({ level, message }) => level === "error" && pattern.test(message));

  it("reads the executable's version when the game's own executable is in the game folder", async () => {
    assert.equal(await versionOf(makeGameDir(["XXX.exe"])), STUB_EXE_VERSION);
  });

  it("does not take a build with a second executable for the alternative build while it is absent", async () => {
    assert.equal(await versionOf(makeGameDir(["XXX.exe"]), multiExe), STUB_EXE_VERSION);
    assert.equal(await versionOf(makeGameDir(), multiExe), STUB_EXE_VERSION);
  });

  it("logs the executable that could not be read", async () => {
    const gameDir = makeGameDir();
    const failing = () => {
      throw new Error("no version resource");
    };
    await withExeVersion(failing, () => versionOf(gameDir));
    assert.equal(
      loggedError(
        new RegExp(
          `^Could not read ${path.join(gameDir, "XXX.exe").replaceAll("\\", "\\\\")} file to get game version: Error: no version resource$`,
        ),
      ),
      true,
    );
  });

  it("finds a Steam library whatever the case of its folder names", async () => {
    const library = makeTempDir();
    const gameDir = path.join(library, "SteamApps", "Common", "Game");
    fs.mkdirSync(gameDir, { recursive: true });
    fs.writeFileSync(
      path.join(library, "SteamApps", "appmanifest_480.acf"),
      '"AppState"\n{\n\t"buildid"\t\t"4321"\n}\n',
    );
    assert.equal(await versionOf(gameDir, setConst("STEAMAPP_ID", '"480"')), "4321");
    // A folder named common is not enough; its parent has to be steamapps.
    const elsewhere = makeTempDir();
    const notLibrary = path.join(elsewhere, "Other", "Common", "Game");
    fs.mkdirSync(notLibrary, { recursive: true });
    fs.writeFileSync(
      path.join(elsewhere, "Other", "appmanifest_480.acf"),
      '"AppState"\n{\n\t"buildid"\t\t"9999"\n}\n',
    );
    assert.equal(await versionOf(notLibrary, setConst("STEAMAPP_ID", '"480"')), STUB_EXE_VERSION);
  });

  describe("the Xbox build's data folder and assembly", () => {
    const withAlt = setConst("GAME_STRING_ALT", '"ALT"');
    const pathsAfter = async (transform, detect) => {
      const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
      const ext = await boot({ transform, state: stateFor({ gameDir }) });
      await detect(ext, gameDir);
      return {
        ext,
        gameDir,
        paths: Object.fromEntries(
          ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
        ),
      };
    };
    const viaExecutable = (ext, gameDir) => ext.game.executable(gameDir);
    const viaVersion = (ext, gameDir) => ext.game.getGameVersion(gameDir);

    for (const [label, detect] of [
      ["executable", viaExecutable],
      ["game version", viaVersion],
    ]) {
      it(`moves the assets folder under the Xbox build's own data folder (from the ${label})`, async () => {
        const { gameDir, paths } = await pathsAfter(withAlt, detect);
        assert.equal(paths["XXX-assets"], sep(gameDir, "ALT_Data", "Managed"));
      });

      it(`moves a Mono game's assembly folder there too (from the ${label})`, async () => {
        const { gameDir, paths } = await pathsAfter(all(mono, withAlt), detect);
        assert.equal(paths["XXX-assemblydll"], sep(gameDir, "ALT_Data", "Managed"));
        assert.equal(paths["XXX-assets"], sep(gameDir, "ALT_Data", "Managed"));
      });

      it(`keeps a Mono game's assembly under Managed when the Xbox build shares the data folder name (from the ${label})`, async () => {
        const { gameDir, paths } = await pathsAfter(mono, detect);
        assert.equal(paths["XXX-assemblydll"], sep(gameDir, "XXX_Data", "Managed"));
      });
    }

    it("renames a root mod's data folder to the Xbox build's before installing it", async () => {
      const { ext } = await pathsAfter(withAlt, viaExecutable);
      const { workingDir, files } = stage({ "XXX_Data/a.txt": "a" });
      const instructions = await installWith(ext, "XXX-root", files, workingDir);
      assert.equal(instructions[0].destination, sep("ALT_Data", "a.txt"));
      assert.equal(fs.existsSync(path.join(workingDir, "ALT_Data", "a.txt")), true);
    });
  });
});

describe("template-unitymelonloaderbepinex-hybrid: launching the custom loader's installer, in detail", () => {
  it("offers to report a launch failure that throws with a code the user cannot cause", async () => {
    for (const code of ["EPERM", "ENOENT"]) {
      const state = stateFor({ gameDir: makeGameDir(), mods: modsOf("XXX-customloader") });
      state.settings.gameMode.discovered.XXX.tools = {
        "XXX-customloader": { path: path.join("C:", "tools", "XXX.exe") },
      };
      const ext = await boot({ transform: customLoaderWithInstaller, state });
      ext.api.runExecutable = () => {
        throw Object.assign(new Error("boom"), { code });
      };
      await ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1]("profile", {});
      const notice = ext.notifications.find(({ id }) => id === "XXX-custominstaller");
      notice.actions[0].action(() => {});
      assert.deepEqual(ext.errors[0][2], { allowReport: true }, code);
    }
  });
});

describe("template-unitymelonloaderbepinex-hybrid: last details", () => {
  it("names the custom mod type", async () => {
    const ext = await boot({ transform: customMods });
    assert.deepEqual(ext.modTypes.find(({ id }) => id === "XXX-custommod").options, {
      name: "XXX",
    });
  });

  it("takes a save by its listed name alone, or by its extension alone", async () => {
    const ext = await boot({
      transform: all(
        setConst("enableSaveInstaller", "true"),
        setConst("SAVE_FILES", '["slot1.dat"]'),
        setConst("SAVE_EXTS", '[".sav"]'),
      ),
    });
    assert.deepEqual(await supportedBy(ext, tree("slot1.dat", "readme.txt")), [
      "XXX-save",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(ext, tree("other.sav", "readme.txt")), [
      "XXX-save",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(ext, tree("slot2.dat", "readme.txt")), ["XXX-fallback"]);
  });

  it("installs a loader without asking, forcing nothing, when loaderChoice is off", async () => {
    for (const [transform, assertCall] of [
      [bepinexLoader, ([name, , , check]) => [name, check]],
      [melonLoader, ([name, , force]) => [name, force]],
    ]) {
      const gameDir = makeGameDir();
      const ext = await boot({ transform, state: stateFor({ gameDir }) });
      await ext.game.setup({ path: gameDir });
      const expected =
        transform === bepinexLoader ? ["downloadBepinexBe", true] : ["download", false];
      assert.deepEqual(assertCall(ext.fake.calls[0]), expected);
    }
  });

  it("known gap: keeping MelonLoader leaves a mod-based custom loader installed beside it", async () => {
    const gameDir = makeGameDir();
    const ext = await boot({
      transform: customLoader,
      state: stateFor({
        gameDir,
        mods: {
          a: { id: "bep-id", type: "XXX-bepinex" },
          b: { id: "mel-id", type: "XXX-melonloader" },
          c: { id: "cus-id", type: "XXX-customloader" },
        },
      }),
    });
    answerDialogs(ext, pick("MelonLoader"));
    const removed = [];
    await withUtil(
      {
        removeMods: async (_api, _game, ids) => {
          removed.push(...ids);
        },
      },
      () => ext.game.setup({ path: gameDir }),
    );
    assert.deepEqual(removed, ["bep-id"]);
  });

  it("sorts a plugin in a config folder as a BepInEx mod, folder and all", async () => {
    const { instructions } = await sortPlugins({
      "config/settings.cfg": "c",
      "Foo.dll": BEPINEX_PLUGIN,
    });
    assert.deepEqual(instructions, [
      copy(sep("config", "settings.cfg"), sep("config", "settings.cfg")),
      copy("Foo.dll", "Foo.dll"),
      modType("XXX-bepinexmod"),
    ]);
  });

  it("known gap: a plugins folder inside a wrapper whose name ends in plugins doubles the folder", async () => {
    const { instructions } = await sortPlugins({ "Myplugins/plugins/Foo.dll": BEPINEX_PLUGIN });
    assert.deepEqual(instructions, [
      copy(sep("Myplugins", "plugins", "Foo.dll"), sep("plugins", "plugins", "Foo.dll")),
      modType("XXX-bepinexmod"),
    ]);
  });

  it("tells the user to launch the game when a mod type's folder cannot be worked out", async () => {
    const ext = await boot({ state: stateFor({ gameDir: makeGameDir() }) });
    ext.state.settings.gameMode = undefined;
    const root = ext.modTypes.find(({ id }) => id === "XXX-root");
    assert.equal(root.getPath({ id: GAME_ID }), undefined);
    assert.equal(
      ext.errors[0][0],
      "Failed to locate executable. Please launch the game at least once.",
    );
    assert.ok(ext.errors[0][1] instanceof TypeError);
  });

  it("moves a Mono game's assembly folder to the alternative build's, once getGameVersion finds it", async () => {
    const gameDir = makeGameDir(["ALT.exe"]);
    const ext = await boot({ transform: all(multiExe, mono), state: stateFor({ gameDir }) });
    await ext.game.getGameVersion(gameDir);
    const assembly = ext.modTypes.find(({ id }) => id === "XXX-assemblydll");
    assert.equal(assembly.getPath({ id: GAME_ID }), sep(gameDir, "ALT_Data", "Managed"));
  });
});
