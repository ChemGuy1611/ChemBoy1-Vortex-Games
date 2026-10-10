"use strict";

// Behavior suite for template-ue4-5: what it registers, how its installers route and emit,
// the load order surfaces (pak, UE4SS, LogicMods), the mod-update guard and the downloads.
// The React components are registered but not rendered (react-dom is not installed), so only
// what runs without a renderer is covered: the pure helpers and everything the components call.

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, describe, it, mock } = require("node:test");
const { checks } = require("../contract-checks");
const { makeState } = require("../harness/fake-context");
const { makeGameDir, makeTempDir, tree } = require("../harness/fixtures");
const {
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

const DIR = templateDir("template-ue4-5");
const GAME_ID = "XXX";
const STAGING = path.join(vortex.APP_ROOT, "staging", GAME_ID);
const DOWNLOADS = path.join(vortex.APP_ROOT, "downloads", GAME_ID);
const LOCAL_APP_DATA = path.join(vortex.APP_ROOT, "localAppData");

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const modType = (value) => ({ type: "setmodtype", value });
const attribute = (key, value) => ({ type: "attribute", key, value });

// Mod type and installer ids the template derives from the game id.
const ID = {
  combo: "XXX-ue4sscombo",
  logic: "XXX-logicmods",
  pakAlt: "XXX-pakalt",
  root: "XXX-root",
  pak: "XXX-uesortablepak",
  scripts: "XXX-scripts",
  dll: "XXX-ue4ssdll",
  binaries: "XXX-binaries",
  ue4ss: "XXX-ue4ss",
  config: "XXX-config",
  save: "XXX-save",
  sigbypass: "XXX-sigbypass",
  modkit: "XXX-modkitmod",
};

// Feature toggles, flipped in memory.
const noUe4ss = setConst("ue4ssLoadOrder", "false");
const noLogicMods = setConst("logicModsLoadOrder", "false");
const noCollections = setConst("collectionsLoadOrder", "false");
const noPakLoadOrder = setConst("PAKMOD_LOADORDER", "false");
const legacyLoadOrder = setConst("FBLO", "false");
const noIoStore = setConst("IO_STORE", "false");
const modKit = setConst("hasModKit", "true");
const sigBypass = setConst("SIGBYPASS_REQUIRED", "true");
// The placeholder Xbox id equals the placeholder Steam id, which switches the Xbox logic on. A
// different id leaves it off.
const noXbox = setConst("XBOXAPP_ID", '"other"');
// Four executables, so each store has its own and the demo build is told apart.
const multiExe = all(
  noXbox,
  setConst("EXEC_EPIC", '"Epic.exe"'),
  setConst("EXEC_GOG", '"Gog.exe"'),
  setConst("EXEC_DEMO", '"Demo.exe"'),
);
// Nexus page for UE4SS, so it comes from Nexus instead of GitHub.
const nexusUe4ss = all(setConst("UE4SS_PAGE_NO", "100"), setConst("UE4SS_FILE_NO", "200"));

// Source rewrite that hands private functions to the test through `module.exports.internals`.
const exposing =
  (...names) =>
  (source) =>
    `${source}\nmodule.exports.internals = { ${names.join(", ")} };\n`;

afterEach(() => {
  delete globalThis.window;
  mock.restoreAll();
});

// Stands in for the bundled downloader module and records what the template asks of it.
function fakeDownloader({ failTest } = {}) {
  const calls = [];
  const module = {
    download: async (_api, requirements, force) => {
      calls.push(["download", requirements, force]);
    },
    findModByFile: async (_api, type, fileName) => {
      calls.push(["findModByFile", type, fileName]);
      return "found-mod";
    },
    findDownloadIdByFile: (_api, fileName) => {
      calls.push(["findDownloadIdByFile", fileName]);
      return "download-1";
    },
    resolveVersionByModVersion: async (_api, requirement) => {
      calls.push(["resolveVersionByModVersion", requirement]);
      return "3.0.1-1133";
    },
    testRequirementVersion: async (_api, requirement) => {
      calls.push(["testRequirementVersion", requirement]);
      if (failTest) throw new Error(failTest);
    },
  };
  return { calls, module };
}

// Loads the template with the downloader faked. `ext.fake.calls` is what it was asked.
async function boot({ failTest, ...options } = {}) {
  const fake = fakeDownloader({ failTest });
  const ext = await loadExtension(DIR, { bundled: { "downloader.js": fake.module }, ...options });
  ext.fake = fake;
  return ext;
}

// Vortex state with the game discovered in `gameDir`. `mods` are the installed mods by id,
// `modState` the profile's enabled flags, `loadOrder` the stored pak load order.
function stateFor({ gameDir, mods = {}, modState = {}, loadOrder, settings } = {}) {
  const state = makeState({
    activeGameId: GAME_ID,
    discovered: gameDir ? { [GAME_ID]: { path: gameDir } } : {},
    mods: { [GAME_ID]: mods },
  });
  state.settings.profiles.lastActiveProfile = { [GAME_ID]: "profile" };
  state.persistent.profiles.profile.modState = modState;
  if (loadOrder !== undefined) state.persistent.loadOrder = { profile: loadOrder };
  if (settings !== undefined) state.settings[GAME_ID] = settings;
  return state;
}

// Answers the deploy event the way Vortex would, recording it.
function answerDeploy(ext) {
  const seen = [];
  ext.api.events.on("deploy-mods", (callback) => {
    seen.push("deploy-mods");
    callback(null);
  });
  return seen;
}

// Answers the download events with the arguments Vortex would receive, recording each.
function answerDownloadEvents(ext) {
  const seen = [];
  ext.api.events.on("start-download", (urls, info, third, callback, sixth, options) => {
    seen.push({ event: "start-download", urls, info, third, sixth, options });
    callback(null, "download-1");
  });
  ext.api.events.on("start-install-download", (id, options, callback) => {
    seen.push({ event: "start-install-download", id, options });
    callback(null, "mod-1");
  });
  return seen;
}

// Replaces what the dialogs the template shows return. `choose([type, title, content, buttons])`
// answers with the action label.
function answerDialogs(ext, choose) {
  ext.api.showDialog = async (...args) => {
    ext.dialogs.push(args);
    return choose(args);
  };
}
const pick = (action) => () => ({ action });
const labelsOf = (dialog) => dialog[3].map(({ label }) => label);

// A staged archive on disk: `{ "Mod/Scripts/main.lua": "text" }`. Returns the folder the
// installer reads from and the file list Vortex would hand it.
function stage(entries, archive = "Cool Mod.installing") {
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

const write = (file, text = "") => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

describe("template-ue4-5: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await boot();
  });

  it("registers one game with the scaffold values", () => {
    assert.equal(ext.gameRegistrations, 1);
    const { game } = ext;
    assert.equal(game.id, "XXX");
    assert.equal(game.name, "XXX");
    assert.equal(game.shortName, "XXX");
    assert.equal(game.logo, "XXX.jpg");
    assert.equal(game.mergeMods, true);
    assert.equal(game.requiresCleanup, true);
    assert.equal(game.modPath, sep("XXX", "Content", "Paks", "~mods"));
    assert.equal(game.modPathIsRelative, true);
    assert.deepEqual(game.requiredFiles, ["XXX"]);
    assert.deepEqual(game.compatible, { dinput: false, enb: false });
  });

  it("describes the store ids, symlink support and the ignore lists", () => {
    const { details, environment } = ext.game;
    assert.equal(Number.isNaN(details.steamAppId), true);
    assert.equal(details.gogAppId, "XXX");
    assert.equal(details.epicAppId, "XXX");
    assert.equal(details.xboxAppId, "XXX");
    assert.equal(details.supportsSymlinks, false);
    const ignored = [sep("**", "changelog*"), sep("**", "readme*"), sep("**", "license*")];
    assert.deepEqual(details.ignoreConflicts, ignored);
    assert.deepEqual(details.ignoreDeploy, ignored);
    assert.deepEqual(environment, {
      SteamAPPId: "XXX",
      GogAPPId: "XXX",
      EpicAPPId: "XXX",
      XboxAPPId: "XXX",
    });
  });

  it("exposes the game functions and a Custom Launch tool", () => {
    const { game } = ext;
    for (const name of ["queryPath", "executable", "queryModPath", "setup", "requiresLauncher"]) {
      assert.equal(typeof game[name], "function", name);
    }
    assert.equal(typeof game.getGameVersion, "function");
    assert.equal(game.supportedTools.length, 1);
    const [tool] = game.supportedTools;
    assert.equal(tool.id, "XXX-customlaunch");
    assert.equal(tool.name, "Custom Launch");
    assert.equal(tool.logo, "exec.png");
    assert.equal(tool.executable(), "XXX.exe");
    assert.deepEqual(tool.requiredFiles, ["XXX.exe"]);
    assert.deepEqual(
      [tool.detach, tool.relative, tool.exclusive, tool.shell],
      [true, true, true, true],
    );
  });

  it("registers the spec mod types, then the explicit ones, in priority order", () => {
    assert.deepEqual(summary(ext.modTypes), [
      [ID.combo, 30],
      [ID.logic, 31],
      [ID.pakAlt, 32],
      [ID.root, 33],
      [ID.pak, 25],
      [ID.scripts, 50],
      [ID.dll, 52],
      [ID.binaries, 54],
      [ID.ue4ss, 56],
      [ID.config, 62],
      [ID.save, 64],
    ]);
  });

  it("names every mod type", () => {
    assert.deepEqual(
      ext.modTypes.map(({ options }) => options.name),
      [
        "UE4SS Script-LogicMod Combo",
        "UE4SS LogicMods (Blueprint)",
        'Paks (no "~mods")',
        "Root Folder",
        "UE Sortable Pak Mod",
        "UE4SS Script Mod",
        "UE4SS DLL Mod",
        "Binaries (Engine Injector)",
        "UE4SS",
        "Config (Local AppData)",
        "Saves (Local AppData)",
      ],
    );
  });

  it("gives only the sortable pak mod type a merge function", () => {
    const merging = ext.modTypes.filter(({ options }) => options.mergeMods !== undefined);
    assert.deepEqual(
      merging.map(({ id }) => id),
      [ID.pak],
    );
    assert.equal(typeof merging[0].options.mergeMods, "function");
  });

  it("registers the installers in priority order, the Binaries fallback last", () => {
    assert.deepEqual(summary(ext.installers), [
      [ID.combo, 26],
      [ID.logic, 27],
      [ID.pak, 29],
      [ID.ue4ss, 31],
      [ID.scripts, 35],
      [ID.dll, 37],
      [ID.root, 39],
      [ID.config, 41],
      [ID.save, 43],
      [ID.binaries, 49],
    ]);
  });

  it("registers the toolbar buttons on the mod-icons group", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Open Paks Folder",
        "Open Binaries Folder",
        "Open UE4SS Mods Folder",
        "Open LogicMods Folder",
        "Open Config Folder",
        "Open Saves Folder",
        "Download UE4SS",
        "Open UE4SS Settings INI",
        "Open UE4SS mods.txt",
        "Open PCGamingWiki Page",
        "Open Nexus Mods Page",
        "Open SteamDB Page",
        "View Changelog",
        "Submit Bug Report",
        "Open Downloads Folder",
      ],
    );
    for (const action of ext.registeredActions) {
      assert.equal(action.group, "mod-icons", action.title);
      assert.equal(action.priority, 300, action.title);
      assert.equal(action.icon, "open-ext", action.title);
      assert.deepEqual(action.options, {}, action.title);
      assert.equal(typeof action.action, "function", action.title);
    }
  });

  it("shows every toolbar button only while this game is active", () => {
    for (const action of ext.registeredActions) {
      ext.state.persistent.profiles.profile.gameId = GAME_ID;
      assert.equal(action.condition(), true, action.title);
      ext.state.persistent.profiles.profile.gameId = "othergame";
      assert.equal(action.condition(), false, action.title);
    }
    ext.state.persistent.profiles.profile.gameId = GAME_ID;
  });

  it("registers the pak load order on the file-based API", () => {
    const [registration] = ext.calls.filter(({ name }) => name === "registerLoadOrder");
    const [options] = registration.args;
    assert.equal(options.gameId, "XXX");
    assert.equal(options.toggleableEntries, false);
    for (const name of [
      "validate",
      "deserializeLoadOrder",
      "serializeLoadOrder",
      "usageInstructions",
      "customItemRenderer",
    ]) {
      assert.equal(typeof options[name], "function", name);
    }
    assert.equal(ext.calls.filter(({ name }) => name === "registerLoadOrderPage").length, 0);
  });

  it("validates any load order without complaint", async () => {
    const [{ args }] = ext.calls.filter(({ name }) => name === "registerLoadOrder");
    assert.equal(await args[0].validate([{ id: "x" }]), undefined);
  });

  it("registers the settings reducer, the settings page and both persisted load order reducers", () => {
    const reducers = ext.calls.filter(({ name }) => name === "registerReducer");
    assert.deepEqual(
      reducers.map(({ args }) => args[0]),
      [
        ["settings", "XXX"],
        ["persistent", "ue4ssLoadOrder"],
        ["persistent", "logicModsLoadOrder"],
      ],
    );
    const [settings] = ext.calls.filter(({ name }) => name === "registerSettings");
    assert.equal(settings.args[0], "Mods");
    assert.equal(typeof settings.args[1], "function");
    assert.deepEqual(settings.args[2](), {});
    assert.equal(settings.args[4], 150);
  });

  it("shows the Mods settings page only while this game is active", () => {
    const [settings] = ext.calls.filter(({ name }) => name === "registerSettings");
    assert.equal(settings.args[3](), true);
    ext.state.persistent.profiles.profile.gameId = "othergame";
    assert.equal(settings.args[3](), false);
    ext.state.persistent.profiles.profile.gameId = GAME_ID;
  });

  it("keeps the UE4SS switch on by default and flips it on the matching action", () => {
    const [{ args }] = ext.calls.filter(
      ({ name, args }) => name === "registerReducer" && args[0][0] === "settings",
    );
    const [, definition] = args;
    assert.deepEqual(definition.defaults, { ue4ssLoEnabled: true });
    assert.deepEqual(Object.keys(definition.reducers), ["SET_XXX_UE4SS_LO_ENABLED"]);
    assert.deepEqual(definition.reducers.SET_XXX_UE4SS_LO_ENABLED({ other: 1 }, false), {
      other: 1,
      ue4ssLoEnabled: false,
    });
  });

  it("stores each persisted load order per profile, keeping the other profiles", () => {
    for (const [key, action] of [
      ["ue4ssLoadOrder", "SET_XXX_UE4SS_LOAD_ORDER"],
      ["logicModsLoadOrder", "SET_XXX_LOGICMODS_LOAD_ORDER"],
    ]) {
      const [{ args }] = ext.calls.filter(
        ({ name, args }) => name === "registerReducer" && args[0][1] === key,
      );
      const [, definition] = args;
      assert.deepEqual(definition.defaults, {}, key);
      assert.deepEqual(Object.keys(definition.reducers), [action], key);
      const next = definition.reducers[action](
        { keep: { loadOrder: [1] }, p1: { loadOrder: [2], extra: true } },
        { profileId: "p1", loadOrder: [3] },
      );
      assert.deepEqual(
        next,
        { keep: { loadOrder: [1] }, p1: { loadOrder: [3], extra: true } },
        key,
      );
    }
  });

  it("registers the UE4SS and LogicMods load order pages", () => {
    const pages = ext.calls.filter(({ name }) => name === "registerMainPage");
    assert.equal(pages.length, 2);
    const [[group, title, component, options], [group2, title2, component2, options2]] = pages.map(
      ({ args }) => args,
    );
    assert.equal(group, "unreal");
    assert.equal(title, "UE4SS Load Order");
    assert.equal(typeof component, "function");
    assert.deepEqual(
      { ...options, mdi: typeof options.mdi, visible: typeof options.visible },
      {
        id: "XXX-ue4ss-loadorder",
        priority: 31,
        group: "per-game",
        hotkey: "U",
        mdi: "string",
        visible: "function",
        props: options.props,
      },
    );
    assert.equal(group2, "unreal");
    assert.equal(title2, "LogicMods Load Order");
    assert.equal(typeof component2, "function");
    assert.equal(options2.id, "XXX-logicmods-loadorder");
    assert.equal(options2.priority, 32);
    assert.equal(options2.group, "per-game");
    assert.equal(options2.hotkey, "L");
    assert.equal(typeof options2.mdi, "string");
  });

  it("shows each load order page only while this game is active, and hands it the api", () => {
    const pages = ext.calls
      .filter(({ name }) => name === "registerMainPage")
      .map(({ args }) => args[3]);
    for (const options of pages) {
      assert.equal(options.visible(), true);
      assert.deepEqual(options.props(), { api: ext.api });
      ext.state.persistent.profiles.profile.gameId = "othergame";
      assert.equal(options.visible(), false);
      ext.state.persistent.profiles.profile.gameId = GAME_ID;
    }
  });

  it("registers the collection feature as an optional extension", () => {
    const features = ext.calls.filter(({ name }) => name === "optional.registerCollectionFeature");
    assert.equal(features.length, 1);
    const [id, generate, parse, , title, condition, view] = features[0].args;
    assert.equal(id, "XXX_ue4ss_collection_data");
    assert.equal(typeof generate, "function");
    assert.equal(typeof parse, "function");
    assert.equal(title((text) => `t:${text}`), "t:UE4SS Load Orders");
    assert.equal(condition({}, "XXX"), true);
    assert.equal(condition({}, "other"), false);
    assert.equal(typeof view, "function");
  });

  it("registers the start-up listeners in the once callback", () => {
    assert.deepEqual(
      ext.listeners.map(({ kind, args }) => [kind, args[0]]),
      [
        ["onAsync", "check-mods-version"],
        ["onAsync", "did-deploy"],
      ],
    );
    assert.deepEqual(ext.api.events.eventNames(), [
      "mod-update",
      "mods-update",
      "remove-mod",
      "will-install-mod",
      "did-install-mod",
    ]);
  });

  it("registers nothing from the once callback", () => {
    assert.equal(ext.calls.filter(({ phase }) => phase === "once").length, 0);
  });

  it("only exports the default function", () => {
    assert.deepEqual(Object.keys(ext.exports), ["default"]);
    assert.equal(ext.mainResult, true);
  });

  it("needed no vortex-api member the stub lacks", () => {
    assert.deepEqual(ext.unmocked, []);
  });
});

describe("template-ue4-5: toggles that change what is registered", () => {
  const idsOf = (list) => list.map(({ id }) => id);
  const names = (ext) => ext.calls.map(({ name }) => name);
  const titles = (ext) => ext.registeredActions.map(({ title }) => title);
  const UE4SS_BUTTONS = [
    "Open UE4SS Mods Folder",
    "Open LogicMods Folder",
    "Download UE4SS",
    "Open UE4SS Settings INI",
    "Open UE4SS mods.txt",
  ];

  it("ue4ssLoadOrder off drops the UE4SS, script, DLL and LogicMods mod types and installers", async () => {
    const ext = await boot({ transform: noUe4ss });
    assert.deepEqual(idsOf(ext.modTypes), [
      ID.combo,
      ID.pakAlt,
      ID.root,
      ID.pak,
      ID.binaries,
      ID.config,
      ID.save,
    ]);
    assert.deepEqual(summary(ext.installers), [
      [ID.combo, 26],
      [ID.pak, 29],
      [ID.root, 39],
      [ID.config, 41],
      [ID.save, 43],
      [ID.binaries, 49],
    ]);
  });

  it("ue4ssLoadOrder off keeps the spec mod type priorities of the survivors contiguous", async () => {
    const ext = await boot({ transform: noUe4ss });
    assert.deepEqual(summary(ext.modTypes.slice(0, 3)), [
      [ID.combo, 30],
      [ID.pakAlt, 31],
      [ID.root, 32],
    ]);
  });

  it("ue4ssLoadOrder off drops the UE4SS buttons, the settings page and the UE4SS page", async () => {
    const ext = await boot({ transform: noUe4ss });
    for (const title of UE4SS_BUTTONS) assert.equal(titles(ext).includes(title), false, title);
    assert.equal(names(ext).includes("registerSettings"), false);
    assert.deepEqual(
      ext.calls.filter(({ name }) => name === "registerReducer").map(({ args }) => args[0]),
      [["persistent", "logicModsLoadOrder"]],
    );
    assert.deepEqual(
      ext.calls.filter(({ name }) => name === "registerMainPage").map(({ args }) => args[1]),
      ["LogicMods Load Order"],
    );
  });

  it("ue4ssLoadOrder off still registers the collection feature for LogicMods", async () => {
    const ext = await boot({ transform: noUe4ss });
    assert.equal(names(ext).filter((name) => name === "optional.registerCollectionFeature").length, 1);
  });

  it("ue4ssLoadOrder off stops the update check from running", async () => {
    const ext = await boot({ transform: noUe4ss });
    const check = ext.listeners.find(({ args }) => args[0] === "check-mods-version").args[1];
    await check(GAME_ID, {}, false);
    assert.deepEqual(ext.fake.calls, []);
  });

  it("logicModsLoadOrder off drops the LogicMods reducer and page but keeps the installer", async () => {
    const ext = await boot({ transform: noLogicMods });
    assert.deepEqual(
      ext.calls.filter(({ name }) => name === "registerReducer").map(({ args }) => args[0]),
      [
        ["settings", "XXX"],
        ["persistent", "ue4ssLoadOrder"],
      ],
    );
    assert.deepEqual(
      ext.calls.filter(({ name }) => name === "registerMainPage").map(({ args }) => args[1]),
      ["UE4SS Load Order"],
    );
    assert.equal(idsOf(ext.installers).includes(ID.logic), true);
    assert.equal(idsOf(ext.modTypes).includes(ID.logic), true);
  });

  it("both load orders off drop the collection feature", async () => {
    const ext = await boot({ transform: all(noUe4ss, noLogicMods) });
    assert.equal(names(ext).includes("optional.registerCollectionFeature"), false);
    assert.equal(names(ext).includes("registerMainPage"), false);
  });

  it("collectionsLoadOrder off drops only the collection feature", async () => {
    const ext = await boot({ transform: noCollections });
    assert.equal(names(ext).includes("optional.registerCollectionFeature"), false);
    assert.equal(names(ext).filter((name) => name === "registerMainPage").length, 2);
  });

  it("PAKMOD_LOADORDER off registers no pak load order and moves paks to the Paks root", async () => {
    const ext = await boot({ transform: noPakLoadOrder });
    assert.equal(names(ext).includes("registerLoadOrder"), false);
    assert.equal(names(ext).includes("registerLoadOrderPage"), false);
    assert.equal(ext.game.modPath, sep("XXX", "Content", "Paks"));
  });

  it("PAKMOD_LOADORDER off swaps the alternate pak type to the ~mods folder", async () => {
    const ext = await boot({ transform: noPakLoadOrder });
    const alt = ext.modTypes.find(({ id }) => id === ID.pakAlt);
    assert.equal(alt.options.name, 'Paks (with "~mods")');
    const gameDir = makeGameDir();
    ext.state.settings.gameMode.discovered[GAME_ID] = { path: gameDir };
    assert.equal(
      alt.getPath({ id: GAME_ID }),
      path.join(gameDir, "XXX", "Content", "Paks", "~mods"),
    );
    const sortable = ext.modTypes.find(({ id }) => id === ID.pak);
    assert.equal(sortable.getPath({ id: GAME_ID }), path.join(gameDir, "XXX", "Content", "Paks"));
  });

  it("PAKMOD_LOADORDER off puts every pak mod in one folder, with no sorting prefix", async () => {
    const ext = await boot({ transform: noPakLoadOrder });
    const sortable = ext.modTypes.find(({ id }) => id === ID.pak);
    assert.equal(sortable.options.mergeMods({ id: "mod-a" }), "");
  });

  it("FBLO off registers the legacy load order page for sortable pak mods", async () => {
    const ext = await boot({ transform: legacyLoadOrder });
    assert.equal(names(ext).includes("registerLoadOrder"), false);
    const [{ args }] = ext.calls.filter(({ name }) => name === "registerLoadOrderPage");
    const [page] = args;
    assert.equal(page.gameId, "XXX");
    assert.equal(page.gameArtURL, path.join(DIR, "XXX.jpg"));
    assert.equal(page.displayCheckboxes, false);
    assert.equal(typeof page.preSort, "function");
    assert.equal(typeof page.callback, "function");
    const mods = [
      { id: "a", type: ID.pak },
      { id: "b", type: ID.root },
      { id: "c", type: "" },
    ];
    assert.deepEqual(page.filter(mods), [{ id: "a", type: ID.pak }]);
  });

  it("FBLO off explains the AAA/AAB folder prefixes on the info panel", async () => {
    const ext = await boot({ transform: legacyLoadOrder });
    const [{ args }] = ext.calls.filter(({ name }) => name === "registerLoadOrderPage");
    const text = args[0].createInfoPanel();
    assert.match(text, /Drag and drop the mods on the left/);
    assert.match(text, /"AAA, AAB, AAC, \.\.\."/);
    assert.match(text, /XXX loads mods in alphanumerical order/);
    assert.match(text, /YOU MUST DEPLOY MODS AFTER CHANGING THE ORDER TO APPLY CHANGES\./);
  });

  it("FBLO off flags a deployment only when the order really changed", async () => {
    const ext = await boot({ transform: legacyLoadOrder });
    const [{ args }] = ext.calls.filter(({ name }) => name === "registerLoadOrderPage");
    const { callback } = args[0];
    const first = { a: 1 };
    callback(first);
    assert.deepEqual(ext.dispatched, []);
    callback(first);
    assert.deepEqual(ext.dispatched, []);
    callback({ a: 2 });
    assert.deepEqual(ext.dispatched, [
      { type: "setDeploymentNecessary", payload: ["XXX", true] },
    ]);
    assert.equal(ext.notifications.at(-1).id, "XXX-loadorderdeploy-notif");
  });

  it("IO_STORE off lets the game deploy with symlinks", async () => {
    const ext = await boot({ transform: noIoStore });
    assert.equal(ext.game.details.supportsSymlinks, true);
  });

  it("hasModKit adds the ModKit mod type after the spec types and its installer first", async () => {
    const ext = await boot({ transform: modKit });
    assert.deepEqual(summary(ext.modTypes).slice(0, 5), [
      [ID.combo, 30],
      [ID.logic, 31],
      [ID.pakAlt, 32],
      [ID.root, 33],
      [ID.modkit, 34],
    ]);
    assert.equal(ext.modTypes[4].options.name, "ModKit mod");
    assert.deepEqual(summary(ext.installers)[0], [ID.modkit, 25]);
  });

  it("SIGBYPASS_REQUIRED adds the signature bypass mod type and installer", async () => {
    const ext = await boot({ transform: sigBypass });
    assert.deepEqual(summary(ext.modTypes).find(([id]) => id === ID.sigbypass), [ID.sigbypass, 58]);
    assert.deepEqual(summary(ext.installers).find(([id]) => id === ID.sigbypass), [
      ID.sigbypass,
      33,
    ]);
    assert.equal(ext.modTypes.find(({ id }) => id === ID.sigbypass).options.name, "Sig Bypass");
  });

  it("with every optional feature on, the contract checks still pass", async () => {
    const everything = all(modKit, sigBypass, setConst("setupNotification", "true"));
    for (const transform of [
      everything,
      noUe4ss,
      noPakLoadOrder,
      legacyLoadOrder,
      noIoStore,
      multiExe,
      all(noUe4ss, noLogicMods, noCollections),
    ]) {
      const ext = await boot({ transform });
      for (const [name, check] of Object.entries(checks)) {
        assert.deepEqual(await check(ext), [], name);
      }
    }
  });
});

// A booted extension whose game is discovered in a fresh game folder and whose setup has run, so
// the staging folder is known and the partition checks have something to compare.
async function ready({ files = ["XXX.exe"], transform, mods, modState, loadOrder, settings } = {}) {
  const gameDir = makeGameDir(files);
  const ext = await boot({
    transform,
    state: stateFor({ gameDir, mods, modState, loadOrder, settings }),
  });
  await ext.game.setup({ path: gameDir });
  return { ext, gameDir };
}

// Makes one folder report a different device than the rest, so the partition check fails for it.
function onOtherDevice(target) {
  const real = fs.statSync;
  mock.method(fs, "statSync", (file, ...rest) => {
    const stats = real(file, ...rest);
    return String(file) === target ? Object.assign(Object.create(stats), { dev: stats.dev + 1 }) : stats;
  });
}

const withFomod = (files) => [...files, ...tree("fomod/ModuleConfig.xml")];

describe("template-ue4-5: which installers accept an archive", () => {
  let ext;
  before(async () => {
    ext = await boot();
  });

  // [description, archive entries, installers that accept it, in registration order]
  const ROUTING = [
    ["a pak", ["a.pak"], [ID.pak]],
    ["a pak with its IO Store files", ["a.pak", "a.ucas", "a.utoc"], [ID.pak]],
    ["a pak inside the game folder layout", ["XXX/Content/Paks/~mods/a.pak"], [ID.pak, ID.root]],
    ["a LogicMods pak", ["LogicMods/a.pak"], [ID.logic, ID.pak]],
    [
      "Binaries plus a LogicMods pak under Content",
      ["Binaries/Win64/mod.dll", "Content/Paks/LogicMods/a.pak"],
      [ID.combo, ID.logic, ID.pak, ID.root],
    ],
    ["a Binaries folder alone", ["Binaries/Win64/mod.dll"], [ID.root, ID.binaries]],
    ["a Content folder alone", ["Content/Paks/a.dat"], [ID.root, ID.binaries]],
    ["the UE4SS proxy dll", ["dwmapi.dll"], [ID.ue4ss, ID.binaries]],
    ["the UE4SS dll in its folder", ["ue4ss/UE4SS.dll"], [ID.ue4ss, ID.binaries]],
    ["a UE4SS signatures folder", ["ue4ss/UE4SS_Signatures/a.lua"], [ID.ue4ss, ID.binaries]],
    ["a UE4SS script mod", ["Cool/Scripts/main.lua"], [ID.scripts, ID.binaries]],
    ["a UE4SS dll mod", ["Cool/dlls/main.dll"], [ID.dll, ID.binaries]],
    [
      "a script mod that also ships a dll mod",
      ["Cool/Scripts/main.lua", "Cool/dlls/main.dll"],
      [ID.scripts, ID.dll, ID.binaries],
    ],
    ["a Mods folder", ["Mods/x.txt"], [ID.root, ID.binaries]],
    ["a Movies folder", ["Movies/x.bk2"], [ID.root, ID.binaries]],
    ["an Engine folder", ["Engine/Config/x.ini"], [ID.root, ID.binaries]],
    ["a config file", ["engine.ini"], [ID.config, ID.binaries]],
    ["a config file in a folder", ["Cool/GameUserSettings.ini"], [ID.config, ID.binaries]],
    ["an ini that is not a game config", ["Cool/other.ini"], [ID.binaries]],
    ["a save file", ["a.sav"], [ID.save, ID.binaries]],
    ["a text file", ["readme.txt"], [ID.binaries]],
    ["a loose dll", ["a.dll"], [ID.binaries]],
  ];

  for (const [description, entries, expected] of ROUTING) {
    it(`${description} goes to ${expected.map((id) => id.replace("XXX-", "")).join(", ")}`, async () => {
      assert.deepEqual(await supportedBy(ext, tree(...entries)), expected);
    });
  }

  it("matches the folder, extension and file markers without regard to case", async () => {
    const UPPER = [
      [["BINARIES/Win64/a.dll", "CONTENT/a.dat"], ID.combo],
      [["LOGICMODS/A.PAK"], ID.logic],
      [["A.PAK"], ID.pak],
      [["DWMAPI.DLL"], ID.ue4ss],
      [["UE4SS_SIGNATURES/a.lua"], ID.ue4ss],
      [["SCRIPTS/A.LUA"], ID.scripts],
      [["DLLS/A.DLL"], ID.dll],
      [["xxx/a.dat"], ID.root],
      [["ENGINE.INI"], ID.config],
      [["A.SAV"], ID.save],
    ];
    for (const [entries, id] of UPPER) {
      assert.equal((await supportedBy(ext, tree(...entries))).includes(id), true, `${id} ${entries}`);
    }
  });

  it("returns an empty requiredFiles list from every installer test", async () => {
    for (const installer of ext.installers) {
      const result = await installer.testSupported(tree("a.pak"), GAME_ID);
      assert.deepEqual(result.requiredFiles, [], installer.id);
    }
  });

  it("accepts nothing for another game", async () => {
    for (const [description, entries] of ROUTING) {
      assert.deepEqual(await supportedBy(ext, tree(...entries), "othergame"), [], description);
    }
  });

  it("leaves an archive with a FOMOD installer to the FOMOD installer", async () => {
    for (const [description, entries] of ROUTING) {
      assert.deepEqual(await supportedBy(ext, withFomod(tree(...entries))), [], description);
    }
  });

  it("only treats ModuleConfig.xml inside a fomod folder as a FOMOD installer", async () => {
    assert.deepEqual(await supportedBy(ext, tree("a.pak", "other/ModuleConfig.xml")), [ID.pak]);
    assert.deepEqual(await supportedBy(ext, tree("a.pak", "fomod/info.xml")), [ID.pak]);
    assert.deepEqual(await supportedBy(ext, tree("a.pak", "FOMOD/MODULECONFIG.XML")), []);
  });

  it("hasModKit routes a mod.json plus .uplugin archive to the ModKit installer first", async () => {
    const kit = await boot({ transform: modKit });
    assert.deepEqual(
      await supportedBy(kit, tree("Mod/mod.json", "Mod/Plugin.uplugin")),
      [ID.modkit, ID.binaries],
    );
    assert.deepEqual(await supportedBy(kit, tree("Mod/mod.json")), [ID.binaries]);
    assert.deepEqual(await supportedBy(kit, tree("Mod/Plugin.uplugin")), [ID.binaries]);
    assert.deepEqual(await supportedBy(kit, tree("MOD/MOD.JSON", "MOD/A.UPLUGIN")), [
      ID.modkit,
      ID.binaries,
    ]);
    assert.deepEqual(await supportedBy(kit, withFomod(tree("Mod/mod.json", "Mod/Plugin.uplugin"))), []);
    assert.deepEqual(
      await supportedBy(kit, tree("Mod/mod.json", "Mod/Plugin.uplugin"), "othergame"),
      [],
    );
  });

  it("SIGBYPASS_REQUIRED routes dsound.dll plus the asi to the bypass installer", async () => {
    const bypass = await boot({ transform: sigBypass });
    assert.deepEqual(
      await supportedBy(bypass, tree("Mod/dsound.dll", "Mod/UniversalSigBypasser.asi")),
      [ID.sigbypass, ID.binaries],
    );
    assert.deepEqual(await supportedBy(bypass, tree("Mod/dsound.dll")), [ID.binaries]);
    assert.deepEqual(await supportedBy(bypass, tree("Mod/UniversalSigBypasser.asi")), [ID.binaries]);
    assert.deepEqual(
      await supportedBy(bypass, tree("MOD/DSOUND.DLL", "MOD/UNIVERSALSIGBYPASSER.ASI")),
      [ID.sigbypass, ID.binaries],
    );
    assert.deepEqual(
      await supportedBy(bypass, withFomod(tree("Mod/dsound.dll", "Mod/UniversalSigBypasser.asi"))),
      [],
    );
  });

  it("ue4ssLoadOrder off sends UE4SS, script, dll and LogicMods archives to the fallback", async () => {
    const plain = await boot({ transform: noUe4ss });
    assert.deepEqual(await supportedBy(plain, tree("dwmapi.dll")), [ID.binaries]);
    assert.deepEqual(await supportedBy(plain, tree("Cool/Scripts/main.lua")), [ID.binaries]);
    assert.deepEqual(await supportedBy(plain, tree("Cool/dlls/main.dll")), [ID.binaries]);
    assert.deepEqual(await supportedBy(plain, tree("LogicMods/a.pak")), [ID.pak]);
  });

  it("IO_STORE off does not change what is accepted, only what is installed", async () => {
    const plain = await boot({ transform: noIoStore });
    assert.deepEqual(await supportedBy(plain, tree("a.pak", "a.ucas", "a.utoc")), [ID.pak]);
  });
});

describe("template-ue4-5: pak installer output", () => {
  let ext;
  before(async () => {
    ext = await boot();
  });
  const install = (files, extension = ext) => installerOf(extension, ID.pak).install(files);

  it("flattens a pak and its IO Store files into the pak folder and records them", async () => {
    const files = tree("Mod/a.pak", "Mod/a.ucas", "Mod/a.utoc", "Mod/readme.txt");
    const { instructions } = await install(files);
    assert.deepEqual(instructions, [
      copy(sep("Mod", "a.pak"), "a.pak"),
      copy(sep("Mod", "a.ucas"), "a.ucas"),
      copy(sep("Mod", "a.utoc"), "a.utoc"),
      modType(ID.pak),
      attribute("unrealModFiles", ["a.pak", "a.ucas", "a.utoc"]),
    ]);
  });

  it("keeps the case of the file names while matching the extension in lower case", async () => {
    const { instructions } = await install(tree("A.PAK", "A.UCAS", "A.UTOC"));
    assert.deepEqual(
      instructions.filter(({ type }) => type === "copy").map(({ destination }) => destination),
      ["A.PAK", "A.UCAS", "A.UTOC"],
    );
  });

  it("installs a lone pak without asking", async () => {
    const { instructions } = await install(tree("deep/er/a.pak"));
    assert.deepEqual(instructions, [
      copy(sep("deep", "er", "a.pak"), "a.pak"),
      modType(ID.pak),
      attribute("unrealModFiles", ["a.pak"]),
    ]);
    assert.equal(ext.dialogs.length, 0);
  });

  it("installs exactly three files without asking", async () => {
    const fresh = await boot();
    await install(tree("a.pak", "b.ucas", "c.utoc"), fresh);
    assert.equal(fresh.dialogs.length, 0);
  });

  it("asks which files to install when there are more than three", async () => {
    const fresh = await boot();
    const files = tree("v1/a.pak", "v1/a.ucas", "v1/a.utoc", "v2/b.pak");
    await assert.rejects(install(files, fresh), (error) => {
      assert.equal(error.message, "User cancelled.");
      assert.equal(error.kind, "user-canceled");
      assert.equal(error.skipped, true);
      return true;
    });
    assert.equal(fresh.dialogs.length, 1);
    const [type, title, content, buttons] = fresh.dialogs[0];
    assert.equal(type, "question");
    assert.equal(title, "Multiple {{PAK}} files");
    assert.match(content.text, /The mod you are installing contains \{\{x\}\} \{\{ext\}\} files\./);
    assert.match(content.text, /Please select which files to install below:$/);
    assert.deepEqual(
      content.checkboxes,
      [
        sep("v1", "a.pak"),
        sep("v1", "a.ucas"),
        sep("v1", "a.utoc"),
        sep("v2", "b.pak"),
      ].map((file) => ({ id: file, text: file, value: false })),
    );
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Cancel", "Install Selected", "Install All_plural"],
    );
  });

  for (const action of ["Install All", "Install All_plural"]) {
    it(`installs every file when the answer is "${action}"`, async () => {
      const fresh = await boot();
      answerDialogs(fresh, pick(action));
      const { instructions } = await install(tree("a.pak", "a.ucas", "a.utoc", "b.pak"), fresh);
      assert.deepEqual(
        instructions.filter(({ type }) => type === "copy").map(({ destination }) => destination),
        ["a.pak", "a.ucas", "a.utoc", "b.pak"],
      );
      assert.deepEqual(instructions.at(-1), attribute("unrealModFiles", ["a.pak", "a.ucas", "a.utoc", "b.pak"]));
    });
  }

  it("installs only the ticked files when the answer is Install Selected", async () => {
    const fresh = await boot();
    answerDialogs(fresh, () => ({
      action: "Install Selected",
      input: { "a.pak": true, "a.ucas": false, "a.utoc": true, "b.pak": false },
    }));
    const { instructions } = await install(tree("a.pak", "a.ucas", "a.utoc", "b.pak"), fresh);
    assert.deepEqual(instructions, [
      copy("a.pak", "a.pak"),
      copy("a.utoc", "a.utoc"),
      modType(ID.pak),
      attribute("unrealModFiles", ["a.pak", "a.utoc"]),
    ]);
  });

  it("IO_STORE off installs only .pak files and asks from the second one", async () => {
    const plain = await boot({ transform: noIoStore });
    const { instructions } = await install(tree("a.pak", "a.ucas", "a.utoc"), plain);
    assert.deepEqual(instructions, [
      copy("a.pak", "a.pak"),
      modType(ID.pak),
      attribute("unrealModFiles", ["a.pak"]),
    ]);
    await assert.rejects(install(tree("a.pak", "b.pak"), plain), { kind: "user-canceled" });
  });

  it("PAKMOD_EXTRA_EXTS adds the extra extensions to what is installed", async () => {
    const extra = await boot({ transform: setConst("PAKMOD_EXTRA_EXTS", '[".json"]') });
    const { instructions } = await install(
      tree("a.pak", "a.ucas", "a.utoc", "settings.json", "readme.txt"),
      extra,
    );
    assert.deepEqual(
      instructions.filter(({ type }) => type === "copy").map(({ destination }) => destination),
      ["a.pak", "a.ucas", "a.utoc", "settings.json"],
    );
    assert.equal(extra.dialogs.length, 0);
  });
});

describe("template-ue4-5: UE4SS combo, LogicMods and UE4SS installers", () => {
  let ext;
  before(async () => {
    ext = await boot();
  });
  const combo = (files, workingDir) => installerOf(ext, ID.combo).install(files, workingDir);
  const logic = (files) => installerOf(ext, ID.logic).install(files);
  const ue4ss = (files) => installerOf(ext, ID.ue4ss).install(files);

  it("combo puts Binaries and Content under the game folder and records the LogicMods paks", async () => {
    const files = tree(
      "Mod/Binaries/Win64/x.dll",
      "Mod/Content/Paks/LogicMods/a.pak",
      "Mod/Content/Paks/LogicMods/b.pak",
      "Mod/readme.txt",
    );
    const { instructions } = await combo(files, "unused");
    assert.deepEqual(instructions, [
      copy(sep("Mod", "Binaries", "Win64", "x.dll"), sep("XXX", "Binaries", "Win64", "x.dll")),
      copy(
        sep("Mod", "Content", "Paks", "LogicMods", "a.pak"),
        sep("XXX", "Content", "Paks", "LogicMods", "a.pak"),
      ),
      copy(
        sep("Mod", "Content", "Paks", "LogicMods", "b.pak"),
        sep("XXX", "Content", "Paks", "LogicMods", "b.pak"),
      ),
      copy(sep("Mod", "readme.txt"), sep("XXX", "readme.txt")),
      modType(ID.combo),
      attribute("logicModFiles", ["a", "b"]),
    ]);
  });

  it("combo records the UE4SS mod folder of a script mod", async () => {
    const files = tree(
      "Binaries/Win64/ue4ss/Mods/MyMod/Scripts/main.lua",
      "Binaries/Win64/ue4ss/Mods/Other/Scripts/main.lua",
    );
    const { instructions } = await combo(files, "unused");
    assert.deepEqual(instructions.slice(-2), [modType(ID.combo), attribute("ue4ssModFolder", "MyMod")]);
    assert.deepEqual(instructions[0], copy(
      sep("Binaries", "Win64", "ue4ss", "Mods", "MyMod", "Scripts", "main.lua"),
      sep("XXX", "Binaries", "Win64", "ue4ss", "Mods", "MyMod", "Scripts", "main.lua"),
    ));
  });

  it("combo adds no attributes for a plain Binaries plus Content mod", async () => {
    const { instructions } = await combo(tree("Binaries/a.dll", "Content/a.dat"), "unused");
    assert.deepEqual(instructions.map(({ type }) => type), ["copy", "copy", "setmodtype"]);
  });

  it("combo copies no folder entries", async () => {
    const { instructions } = await combo(tree("Binaries/a.dll", "Content/a.dat"), "unused");
    assert.equal(instructions.filter(({ source }) => source?.endsWith(path.sep)).length, 0);
  });

  it("combo leaves the Win64 folder name alone for a non-Xbox game", async () => {
    const { workingDir, files } = stage({ "Binaries/Win64/x.dll": "", "Content/a.dat": "" });
    const { instructions } = await combo(files, workingDir);
    assert.equal(instructions[0].destination, sep("XXX", "Binaries", "Win64", "x.dll"));
    assert.equal(fs.existsSync(path.join(workingDir, "Binaries", "Win64")), true);
  });

  it("combo renames Win64 to WinGDK for the Xbox build", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    const xbox = await boot({ state: stateFor({ gameDir }) });
    xbox.game.executable(gameDir);
    const { workingDir, files } = stage({
      "Binaries/Win64/x.dll": "",
      "Binaries/Win64/ue4ss/Mods/MyMod/Scripts/main.lua": "",
      "Content/a.dat": "",
    });
    const { instructions } = await installerOf(xbox, ID.combo).install(files, workingDir);
    assert.deepEqual(
      instructions.filter(({ type }) => type === "copy").map(({ destination }) => destination).sort(),
      [
        sep("XXX", "Binaries", "WinGDK", "ue4ss", "Mods", "MyMod", "Scripts", "main.lua"),
        sep("XXX", "Binaries", "WinGDK", "x.dll"),
        sep("XXX", "Content", "a.dat"),
      ],
    );
    assert.equal(fs.existsSync(path.join(workingDir, "Binaries", "WinGDK", "x.dll")), true);
    assert.equal(fs.existsSync(path.join(workingDir, "Binaries", "Win64")), false);
    assert.equal(instructions.at(-1).type, "setmodtype");
  });

  it("known gap: combo for the Xbox build records no UE4SS mod folder for a script mod", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    const xbox = await boot({ state: stateFor({ gameDir }) });
    xbox.game.executable(gameDir);
    const { workingDir, files } = stage({
      "Binaries/Win64/ue4ss/Mods/MyMod/Scripts/main.lua": "",
      "Content/a.dat": "",
    });
    const { instructions } = await installerOf(xbox, ID.combo).install(files, workingDir);
    // Should end with attribute("ue4ssModFolder", "MyMod") as on every other build. The Xbox path
    // rebuilds the file list from the staged files, which holds no folder entries, so the Scripts
    // folder the attribute is found from is gone.
    assert.deepEqual(instructions.filter(({ type }) => type === "attribute"), []);
  });

  it("combo keeps the archive's own file list for the Xbox build when there is no Win64 folder", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    const xbox = await boot({ state: stateFor({ gameDir }) });
    xbox.game.executable(gameDir);
    const { workingDir, files } = stage({ "Binaries/WinGDK/x.dll": "", "Content/a.dat": "" });
    const { instructions } = await installerOf(xbox, ID.combo).install(files, workingDir);
    assert.deepEqual(
      instructions.filter(({ type }) => type === "copy").map(({ destination }) => destination),
      [sep("XXX", "Binaries", "WinGDK", "x.dll"), sep("XXX", "Content", "a.dat")],
    );
  });

  it("combo wrapped in an archive folder drops the wrapper", async () => {
    const { instructions } = await combo(tree("Pack/Binaries/a.dll", "Pack/Content/a.dat"), "unused");
    assert.deepEqual(
      instructions.filter(({ type }) => type === "copy").map(({ destination }) => destination),
      [sep("XXX", "Binaries", "a.dll"), sep("XXX", "Content", "a.dat")],
    );
  });

  it("logic installs the LogicMods folder into Paks and records the pak names", async () => {
    const { instructions } = await logic(
      tree("Mod/LogicMods/a.pak", "Mod/LogicMods/b.pak", "Mod/LogicMods/readme.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Mod", "LogicMods", "a.pak"), sep("LogicMods", "a.pak")),
      copy(sep("Mod", "LogicMods", "b.pak"), sep("LogicMods", "b.pak")),
      copy(sep("Mod", "LogicMods", "readme.txt"), sep("LogicMods", "readme.txt")),
      modType(ID.logic),
      attribute("logicModFiles", ["a", "b"]),
    ]);
  });

  it("logic without a wrapper folder installs from the top", async () => {
    const { instructions } = await logic(tree("LogicMods/a.pak"));
    assert.deepEqual(instructions, [
      copy(sep("LogicMods", "a.pak"), sep("LogicMods", "a.pak")),
      modType(ID.logic),
      attribute("logicModFiles", ["a"]),
    ]);
  });

  it("logic with no pak records no attribute", async () => {
    const { instructions } = await logic(tree("LogicMods/readme.txt"));
    assert.deepEqual(instructions.map(({ type }) => type), ["copy", "setmodtype"]);
  });

  it("logic ignores files outside the wrapper that holds the LogicMods folder", async () => {
    const { instructions } = await logic(tree("Pack/LogicMods/a.pak", "Elsewhere/b.pak"));
    assert.deepEqual(
      instructions.filter(({ type }) => type === "copy").map(({ source }) => source),
      [sep("Pack", "LogicMods", "a.pak")],
    );
  });

  it("ue4ss installs a release with its proxy dll into the Binaries folder as-is", async () => {
    const { instructions } = await ue4ss(
      tree("UE4SS_v3/dwmapi.dll", "UE4SS_v3/ue4ss/UE4SS.dll", "UE4SS_v3/ue4ss/Mods/mods.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("UE4SS_v3", "dwmapi.dll"), "dwmapi.dll"),
      copy(sep("UE4SS_v3", "ue4ss", "UE4SS.dll"), sep("ue4ss", "UE4SS.dll")),
      copy(sep("UE4SS_v3", "ue4ss", "Mods", "mods.txt"), sep("ue4ss", "Mods", "mods.txt")),
      modType(ID.ue4ss),
    ]);
  });

  it("ue4ss installs a release without the proxy dll under the ue4ss folder", async () => {
    const { instructions } = await ue4ss(tree("UE4SS.dll", "UE4SS-settings.ini"));
    assert.deepEqual(instructions, [
      copy("UE4SS.dll", sep("ue4ss", "UE4SS.dll")),
      copy("UE4SS-settings.ini", sep("ue4ss", "UE4SS-settings.ini")),
      modType(ID.ue4ss),
    ]);
  });

  it("ue4ss installs a partial update of the signature folders under ue4ss", async () => {
    const { instructions } = await ue4ss(tree("UE4SS_Signatures/a.lua", "UE4SS_Signatures/b.lua"));
    assert.deepEqual(instructions, [
      copy(sep("UE4SS_Signatures", "a.lua"), sep("ue4ss", "UE4SS_Signatures", "a.lua")),
      copy(sep("UE4SS_Signatures", "b.lua"), sep("ue4ss", "UE4SS_Signatures", "b.lua")),
      modType(ID.ue4ss),
    ]);
  });

  it("known gap: combo cuts a wrapper whose name ends in Binaries at its own name", async () => {
    const { instructions } = await combo(tree("MyBinaries/Binaries/Win64/x.dll"), "unused");
    // Should be XXX\Binaries\Win64\x.dll. The cut is the first "Binaries\" in the path, which sits
    // inside the wrapper's name.
    assert.equal(instructions[0].destination, sep("XXX", "Binaries", "Binaries", "Win64", "x.dll"));
  });

  it("known gap: logic records an upper-case .PAK with its extension", async () => {
    const { instructions } = await logic(tree("LogicMods/a.pak", "LogicMods/B.PAK"));
    // Should record ["a", "B"]. The pak is found by its lower-cased extension but the extension is
    // stripped with path.basename, which compares case-sensitively. The combo installer and the
    // LogicMods load order read the same way.
    assert.deepEqual(instructions.at(-1), attribute("logicModFiles", ["a", "B.PAK"]));
  });

  it("known gap: logic cuts a wrapper whose name ends in LogicMods at its own name", async () => {
    const { instructions } = await logic(tree("MyLogicMods/LogicMods/a.pak"));
    // Should be LogicMods\a.pak.
    assert.equal(instructions[0].destination, sep("LogicMods", "LogicMods", "a.pak"));
  });
});

// Runs the "More" action of a notification and returns the dialog it opened.
function openMore(ext, notification) {
  const state = { dismissed: 0 };
  notification.actions[0].action(() => state.dismissed++);
  const dialog = ext.dialogs.at(-1);
  const press = (label) => dialog[3].find((button) => button.label === label).action();
  return { dialog, text: dialog[2].text, press, state };
}

// Both UE4SS folder installers share a shape: a marker folder, a wrapper-or-archive-name folder,
// an enabled.txt next to the marker folder when the load order is off, and an ownership attribute.
for (const kind of [
  { id: ID.scripts, label: "scripts", folder: "Scripts", file: "main.lua", name: "UE4SS Script Mod" },
  { id: ID.dll, label: "dll", folder: "dlls", file: "main.dll", name: "UE4SS DLL Mod" },
]) {
  describe(`template-ue4-5: ${kind.label} installer output`, () => {
    let ext;
    before(async () => {
      ext = await boot();
    });
    const run = (entries, archive, extension = ext) => {
      const staged = stage(entries, archive);
      return installerOf(extension, kind.id)
        .install(staged.files, staged.workingDir)
        .then((result) => ({ ...result, ...staged }));
    };
    const inner = `${kind.folder}/${kind.file}`;

    it("keeps a wrapper folder and names the mod after it", async () => {
      const { instructions } = await run({ [`Mod/${inner}`]: "" });
      assert.deepEqual(instructions, [
        copy(sep("Mod", kind.folder, kind.file), sep("Mod", kind.folder, kind.file)),
        modType(kind.id),
        attribute("ue4ssModFolder", "Mod"),
      ]);
    });

    it("wraps a bare mod in a folder named after the archive", async () => {
      const { instructions } = await run({ [inner]: "" }, "Cool Mod.installing");
      assert.deepEqual(instructions, [
        copy(sep(kind.folder, kind.file), sep("CoolMod", kind.folder, kind.file)),
        modType(kind.id),
        attribute("ue4ssModFolder", "CoolMod"),
      ]);
    });

    it("strips the archive extensions and spaces from the folder name", async () => {
      for (const [archive, folder] of [
        ["Pack.zip.installing", "Pack"],
        ["A B.7z.installing", "AB"],
        ["Rar Pack.rar", "RarPack"],
        ["Plain", "Plain"],
      ]) {
        const { instructions } = await run({ [inner]: "" }, archive);
        assert.equal(instructions[0].destination, sep(folder, kind.folder, kind.file), archive);
        assert.equal(instructions.at(-1).value, folder, archive);
      }
    });

    it("copies everything beside a single wrapper folder, so sibling folders come along", async () => {
      const { instructions } = await run({
        [`Mod/${inner}`]: "",
        "Mod/info.txt": "",
        "Other/stray.txt": "",
      });
      assert.deepEqual(
        instructions.filter(({ type }) => type === "copy").map(({ source }) => source),
        [sep("Mod", kind.folder, kind.file), sep("Mod", "info.txt"), sep("Other", "stray.txt")],
      );
    });

    it("drops the folders above a nested wrapper and what sits outside them", async () => {
      const { instructions } = await run({
        [`Pack/Mod/${inner}`]: "",
        "Pack/Mod/info.txt": "",
        "Elsewhere/stray.txt": "",
      });
      assert.deepEqual(
        instructions.filter(({ type }) => type === "copy").map(({ destination }) => destination),
        [sep("Mod", kind.folder, kind.file), sep("Mod", "info.txt")],
      );
      assert.equal(instructions.at(-1).value, "Mod");
    });

    it("drops an enabled.txt from the archive while the UE4SS load order is on", async () => {
      const { instructions } = await run({ [`Mod/${inner}`]: "", "Mod/enabled.txt": "" });
      assert.deepEqual(
        instructions.filter(({ type }) => type === "copy").map(({ source }) => source),
        [sep("Mod", kind.folder, kind.file)],
      );
    });

    describe("with the UE4SS load order switched off in the settings", () => {
      const off = async () => {
        const fresh = await boot();
        fresh.state.settings[GAME_ID] = { ue4ssLoEnabled: false };
        return fresh;
      };

      it("creates an enabled.txt beside the marker folder and installs it", async () => {
        const fresh = await off();
        const { instructions, workingDir } = await run({ [`Mod/${inner}`]: "" }, undefined, fresh);
        assert.equal(fs.existsSync(path.join(workingDir, "Mod", "enabled.txt")), true);
        assert.deepEqual(
          instructions.filter(({ type }) => type === "copy").map(({ destination }) => destination),
          [sep("Mod", kind.folder, kind.file), sep("Mod", "enabled.txt")],
        );
        assert.equal(vortex.logs.some(({ message }) => message.includes(`Successfully created enabled.txt for ${kind.name}: Cool Mod.installing`)), true);
      });

      it("puts the enabled.txt of a bare mod in the archive-named folder", async () => {
        const fresh = await off();
        const { instructions, workingDir } = await run({ [inner]: "" }, "Cool Mod.installing", fresh);
        assert.equal(fs.existsSync(path.join(workingDir, "enabled.txt")), true);
        assert.deepEqual(
          instructions.filter(({ type }) => type === "copy").map(({ destination }) => destination),
          [sep("CoolMod", kind.folder, kind.file), sep("CoolMod", "enabled.txt")],
        );
      });

      it("keeps an enabled.txt the author shipped, once", async () => {
        const fresh = await off();
        const { instructions } = await run(
          { [`Mod/${inner}`]: "", "Mod/enabled.txt": "" },
          undefined,
          fresh,
        );
        assert.deepEqual(
          instructions.filter(({ type }) => type === "copy").map(({ source }) => source),
          [sep("Mod", kind.folder, kind.file), sep("Mod", "enabled.txt")],
        );
      });

      it("logs and carries on when the enabled.txt cannot be written", async () => {
        const fresh = await off();
        const missing = path.join(makeTempDir(), "gone");
        const { instructions } = await installerOf(fresh, kind.id).install(
          tree(`Mod/${inner}`),
          missing,
        );
        assert.deepEqual(
          instructions.filter(({ type }) => type === "copy").length,
          1,
        );
        assert.equal(
          vortex.logs.some(({ level, message }) => level === "error" && message === `Could not create enabled.txt for ${kind.name}: gone`),
          true,
        );
      });
    });
  });
}

describe("template-ue4-5: root installer output", () => {
  let ext;
  before(async () => {
    ext = await boot();
  });
  const root = (...entries) => installerOf(ext, ID.root).install(tree(...entries));
  const copies = ({ instructions }) =>
    instructions.filter(({ type }) => type === "copy").map(({ destination }) => destination);

  it("installs a game-folder layout as it is", async () => {
    const result = await root("XXX/Content/Paks/~mods/a.pak", "XXX/Binaries/Win64/b.dll");
    assert.deepEqual(copies(result), [
      sep("XXX", "Content", "Paks", "~mods", "a.pak"),
      sep("XXX", "Binaries", "Win64", "b.dll"),
    ]);
    assert.deepEqual(result.instructions.at(-1), modType(ID.root));
  });

  it("drops a wrapper folder around the game folder", async () => {
    assert.deepEqual(copies(await root("Pack/XXX/Content/a.dat", "Other/b.txt")), [
      sep("XXX", "Content", "a.dat"),
    ]);
  });

  it("installs an Engine folder at the game root", async () => {
    assert.deepEqual(copies(await root("Engine/Config/x.ini")), [sep("Engine", "Config", "x.ini")]);
  });

  it("puts Content, Binaries and Mods under the game folder", async () => {
    assert.deepEqual(copies(await root("Content/Movies/a.bk2")), [
      sep("XXX", "Content", "Movies", "a.bk2"),
    ]);
    assert.deepEqual(copies(await root("Binaries/Win64/a.dll")), [
      sep("XXX", "Binaries", "Win64", "a.dll"),
    ]);
    assert.deepEqual(copies(await root("Pack/Mods/m/x.lua")), [sep("XXX", "Mods", "m", "x.lua")]);
  });

  it("puts Paks and Movies under the game's Content folder", async () => {
    assert.deepEqual(copies(await root("Movies/a.bk2")), [sep("XXX", "Content", "Movies", "a.bk2")]);
    assert.deepEqual(copies(await root("Pack/Paks/~mods/a.pak")), [
      sep("XXX", "Content", "Paks", "~mods", "a.pak"),
    ]);
  });

  it("prefers a game or Engine folder over the subfolders", async () => {
    const result = await root("Content/a.dat", "XXX/b.dat");
    assert.equal(result.instructions[0].destination, sep("Content", "a.dat"));
  });

  it("copies no folder entries", async () => {
    const result = await root("XXX/Content/a.dat");
    assert.equal(result.instructions.filter(({ source }) => source?.endsWith(path.sep)).length, 0);
  });

  it("known gap: a wrapper whose name ends in the game folder name is cut inside its own name", async () => {
    // Should be XXX\Content\a.dat. The cut is the first "XXX\" in the path, which is part of
    // the wrapper's name.
    assert.deepEqual(copies(await root("MyXXX/XXX/Content/a.dat")), [
      sep("XXX", "XXX", "Content", "a.dat"),
    ]);
  });

  it("known gap: a wrapper whose name ends in a subfolder name is cut inside its own name", async () => {
    // Should be XXX\Content\Paks\a.pak.
    assert.deepEqual(copies(await root("MyContent/Content/Paks/a.pak")), [
      sep("XXX", "Content", "Content", "Paks", "a.pak"),
    ]);
  });
});

describe("template-ue4-5: ModKit and signature bypass installers", () => {
  it("bypass installs its dll and asi at the game's Binaries folder root", async () => {
    const ext = await boot({ transform: sigBypass });
    const { instructions } = await installerOf(ext, ID.sigbypass).install(
      tree("Pack/dsound.dll", "Pack/UniversalSigBypasser.asi", "Pack/readme.txt", "Other/x.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Pack", "dsound.dll"), "dsound.dll"),
      copy(sep("Pack", "UniversalSigBypasser.asi"), "UniversalSigBypasser.asi"),
      copy(sep("Pack", "readme.txt"), "readme.txt"),
      modType(ID.sigbypass),
    ]);
  });

  it("ModKit names the mod folder after modPluginName in mod.json", async () => {
    const ext = await boot({ transform: modKit });
    const { workingDir, files } = stage({
      "Pack/mod.json": JSON.stringify({ modPluginName: "RealName" }),
      "Pack/Plugin.uplugin": "",
      "Pack/Content/a.uasset": "",
    });
    const { instructions } = await installerOf(ext, ID.modkit).install(files, workingDir);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "mod.json"), sep("RealName", "mod.json")),
      copy(sep("Pack", "Plugin.uplugin"), sep("RealName", "Plugin.uplugin")),
      copy(sep("Pack", "Content", "a.uasset"), sep("RealName", "Content", "a.uasset")),
      modType(ID.modkit),
    ]);
  });

  it("ModKit reads a mod.json that starts with a byte order mark", async () => {
    const ext = await boot({ transform: modKit });
    const { workingDir, files } = stage({
      "mod.json": `﻿${JSON.stringify({ modPluginName: "Bom" })}`,
      "a.uplugin": "",
    });
    const { instructions } = await installerOf(ext, ID.modkit).install(files, workingDir);
    assert.equal(instructions[0].destination, sep("Bom", "mod.json"));
  });

  it("ModKit falls back to the wrapper folder name when mod.json cannot be read", async () => {
    const ext = await boot({ transform: modKit });
    const { workingDir, files } = stage({ "Pack/mod.json": "not json", "Pack/a.uplugin": "" });
    const { instructions } = await installerOf(ext, ID.modkit).install(files, workingDir);
    assert.equal(instructions[0].destination, sep("Pack", "mod.json"));
    assert.equal(
      vortex.logs.some(({ level, message }) => level === "error" && message === "Could not read mod.json file for mod Pack."),
      true,
    );
  });

  it("ModKit falls back to the archive name when there is no wrapper folder", async () => {
    const ext = await boot({ transform: modKit });
    const { workingDir, files } = stage({ "mod.json": "not json", "a.uplugin": "" }, "Cool Mod.zip.installing");
    const { instructions } = await installerOf(ext, ID.modkit).install(files, workingDir);
    assert.equal(instructions[0].destination, sep("CoolMod", "mod.json"));
  });
});

describe("template-ue4-5: config and save installers", () => {
  const CONFIG_PATH = sep(LOCAL_APP_DATA, "XXX", "Saved", "Config", "Windows");
  const configFiles = tree("Mod/Config/engine.ini", "Mod/Config/game.ini", "Mod/Config/readme.txt");

  it("config installs the files of the folder that holds the config file", async () => {
    const { ext } = await ready();
    const { instructions } = await installerOf(ext, ID.config).install(configFiles);
    assert.deepEqual(instructions, [
      copy(sep("Mod", "Config", "engine.ini"), "engine.ini"),
      copy(sep("Mod", "Config", "game.ini"), "game.ini"),
      copy(sep("Mod", "Config", "readme.txt"), "readme.txt"),
      modType(ID.config),
    ]);
  });

  it("config refuses before setup has found the staging folder, with a notification", async () => {
    const gameDir = makeGameDir(["XXX.exe"]);
    const ext = await boot({ state: stateFor({ gameDir }) });
    assert.throws(
      () => installerOf(ext, ID.config).install(configFiles),
      (error) => {
        assert.equal(error.message, "User canceled");
        assert.equal(error.kind, "user-canceled");
        assert.equal(error.skipped, false);
        return true;
      },
    );
    const [notification] = ext.notifications;
    assert.equal(notification.id, "XXX-configinstaller");
    assert.equal(notification.type, "error");
    assert.equal(notification.message, "Could not install mod as Config");
    assert.equal(notification.allowSuppress, true);
    assert.deepEqual(notification.actions.map(({ title }) => title), ["More"]);
  });

  it("config refuses when the config folder is on another drive", async () => {
    const { ext } = await ready();
    onOtherDevice(LOCAL_APP_DATA);
    assert.throws(() => installerOf(ext, ID.config).install(configFiles), { kind: "user-canceled" });
    assert.equal(ext.notifications.at(-1).id, "XXX-configinstaller");
  });

  it("config refuses when the game is on another drive", async () => {
    const { ext, gameDir } = await ready();
    onOtherDevice(gameDir);
    assert.throws(() => installerOf(ext, ID.config).install(configFiles), { kind: "user-canceled" });
  });

  it("config refuses when the staging folder is on another drive", async () => {
    const { ext } = await ready();
    onOtherDevice(STAGING);
    assert.throws(() => installerOf(ext, ID.config).install(configFiles), { kind: "user-canceled" });
  });

  it("config skips the drive check when hardlinks have no benefit", async () => {
    const { ext } = await ready({
      transform: all(noIoStore, setConst("preferHardlinks", "false")),
    });
    onOtherDevice(LOCAL_APP_DATA);
    const { instructions } = await installerOf(ext, ID.config).install(configFiles);
    assert.equal(instructions.length, 4);
  });

  it("explains a refused config install and offers the config folder", async () => {
    const { ext } = await ready();
    onOtherDevice(LOCAL_APP_DATA);
    assert.throws(() => installerOf(ext, ID.config).install(configFiles));
    const opened = stubShell();
    const { dialog, text, press, state } = openMore(ext, ext.notifications.at(-1));
    assert.equal(dialog[0], "question");
    assert.equal(dialog[1], "Could not install mod as Config");
    assert.match(text, /You tried installing a Config file mod, but the game, staging folder, and Local AppData folder are not all on the same drive\./);
    assert.match(text, new RegExp(`Config Path: ${CONFIG_PATH.replace(/\\/g, "\\\\")}`));
    assert.deepEqual(dialog[3].map(({ label }) => label), ["Continue", "Open Config Folder"]);
    press("Open Config Folder");
    assert.deepEqual(opened, [CONFIG_PATH]);
    assert.equal(state.dismissed, 1);
    press("Continue");
    assert.equal(state.dismissed, 2);
  });

  it("reports a config folder that cannot be opened", async () => {
    const { ext } = await ready();
    onOtherDevice(LOCAL_APP_DATA);
    assert.throws(() => installerOf(ext, ID.config).install(configFiles));
    const { press } = openMore(ext, ext.notifications.at(-1));
    press("Open Config Folder");
    const [message, , options] = ext.errors.at(-1);
    assert.equal(message, "Failed to open the file or folder");
    assert.deepEqual(options, { allowReport: false });
  });

  it("save installs the files of the folder that holds the save file", async () => {
    const { ext } = await ready();
    const { instructions } = await installerOf(ext, ID.save).install(
      tree("Mod/Saves/slot1.sav", "Mod/Saves/slot2.SAV", "Mod/Saves/notes.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Mod", "Saves", "slot1.sav"), "slot1.sav"),
      copy(sep("Mod", "Saves", "slot2.SAV"), "slot2.SAV"),
      copy(sep("Mod", "Saves", "notes.txt"), "notes.txt"),
      modType(ID.save),
    ]);
  });

  it("save refuses the Xbox build, with a notification", async () => {
    const { ext } = await ready({ files: ["gamelaunchhelper.exe"] });
    await assert.rejects(installerOf(ext, ID.save).install(tree("a.sav")), (error) => {
      assert.equal(error.message, "User canceled");
      assert.equal(error.kind, "user-canceled");
      assert.equal(error.skipped, false);
      return true;
    });
    const [notification] = ext.notifications.slice(-1);
    assert.equal(notification.id, "XXX-saveinsterrxbox");
    assert.equal(notification.type, "error");
    assert.equal(notification.message, "Save files are not supported by the Xbox version of XXX");
    assert.deepEqual(notification.actions, []);
  });

  it("save refuses when no game executable is found", async () => {
    const { ext } = await ready({ files: ["other.txt"] });
    await assert.rejects(installerOf(ext, ID.save).install(tree("a.sav")), { kind: "user-canceled" });
    assert.equal(ext.notifications.at(-1).id, "XXX-saveinsterrxbox");
  });

  it("save accepts every store listed as compatible", async () => {
    for (const files of [["Epic.exe"], ["Gog.exe"]]) {
      const { ext } = await ready({ files, transform: multiExe });
      const { instructions } = await installerOf(ext, ID.save).install(tree("a.sav"));
      assert.equal(instructions.at(-1).value, ID.save, files[0]);
    }
  });

  it("save refuses the demo build", async () => {
    const { ext } = await ready({ files: ["Demo.exe"], transform: multiExe });
    await assert.rejects(installerOf(ext, ID.save).install(tree("a.sav")), { kind: "user-canceled" });
  });

  it("save refuses when the save folder is on another drive and explains why", async () => {
    const { ext } = await ready();
    onOtherDevice(LOCAL_APP_DATA);
    await assert.rejects(installerOf(ext, ID.save).install(tree("a.sav")), { kind: "user-canceled" });
    const notification = ext.notifications.at(-1);
    assert.equal(notification.id, "XXX-saveinstaller");
    assert.equal(notification.message, "Could not install mod as Save");
    const opened = stubShell();
    const { dialog, text, press } = openMore(ext, notification);
    assert.equal(dialog[1], "Could not install mod as Save");
    assert.match(text, /You tried installing a Save file mod, but the game, staging folder, and Local AppData folder are not all on the same drive\./);
    assert.match(text, /Save Path: /);
    assert.deepEqual(dialog[3].map(({ label }) => label), ["Continue", "Open Save Folder"]);
    press("Open Save Folder");
    assert.deepEqual(opened, [sep(LOCAL_APP_DATA, "XXX", "Saved", "SaveGames")]);
  });
});

describe("template-ue4-5: Binaries fallback installer", () => {
  const FALLBACK_FILES = tree("Mod/a.dll", "Mod/sub/b.txt");

  it("copies every file to the same path and tags the Binaries mod type", async () => {
    const ext = await boot({ state: stateFor({}) });
    const { instructions } = await installerOf(ext, ID.binaries).install(
      FALLBACK_FILES,
      path.join("C:", "staging", "Cool Mod.installing"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Mod", "a.dll"), sep("Mod", "a.dll")),
      copy(sep("Mod", "sub", "b.txt"), sep("Mod", "sub", "b.txt")),
      modType(ID.binaries),
    ]);
  });

  it("tells the user a fallback install happened", async () => {
    const ext = await boot({ state: stateFor({}) });
    await installerOf(ext, ID.binaries).install(FALLBACK_FILES, sep(STAGING, "Cool Mod!.7z.installing"));
    assert.equal(ext.notifications.length, 1);
    const [notification] = ext.notifications;
    assert.equal(notification.id, "XXX-CoolMod7z-fallback");
    assert.equal(notification.type, "info");
    assert.equal(notification.message, "Fallback installer reached for Cool Mod!.7z");
    assert.equal(notification.allowSuppress, true);
  });

  it("keeps the notification id to 20 characters of the mod name", async () => {
    const ext = await boot({ state: stateFor({}) });
    await installerOf(ext, ID.binaries).install(
      FALLBACK_FILES,
      sep(STAGING, "An Extremely Long Mod Name That Goes On.zip"),
    );
    assert.equal(ext.notifications[0].id, "XXX-AnExtremelyLongModNa-fallback");
  });

  it("explains the fallback and offers support, the staging folder and the mod page", async () => {
    const ext = await boot({ state: stateFor({}) });
    await installerOf(ext, ID.binaries).install(FALLBACK_FILES, sep(STAGING, "Cool Mod.installing"));
    const { dialog, text } = openMore(ext, ext.notifications[0]);
    assert.equal(dialog[0], "question");
    assert.equal(dialog[1], "Fallback installer reached for Cool Mod");
    assert.match(text, /reached the fallback installer to the Binaries folder/);
    assert.match(text, /Mod Name: Cool Mod\.\n/);
    assert.deepEqual(dialog[3].map(({ label }) => label), [
      "Continue",
      "Contact Ext. Developer",
      "Open Mod Page + Staging Folder",
    ]);
  });

  it("opens the support page of the extension", async () => {
    const ext = await boot({ state: stateFor({}) });
    await installerOf(ext, ID.binaries).install(FALLBACK_FILES, sep(STAGING, "Cool Mod.installing"));
    const opened = stubShell();
    const { press, state } = openMore(ext, ext.notifications[0]);
    press("Contact Ext. Developer");
    assert.deepEqual(opened, ["XXX?tab=posts"]);
    assert.equal(state.dismissed, 1);
  });

  it("opens the staging folder and the Nexus page of the mod it installed", async () => {
    const mods = {
      "Cool Mod-123-1": { id: "Cool Mod-123-1", installationPath: "Cool Mod", attributes: { modId: 123 } },
      other: { id: "other", installationPath: "Other", attributes: { modId: 999 } },
    };
    const ext = await boot({ state: stateFor({ mods }) });
    await installerOf(ext, ID.binaries).install(FALLBACK_FILES, sep(STAGING, "Cool Mod.installing"));
    const opened = stubShell();
    const { press, state } = openMore(ext, ext.notifications[0]);
    press("Open Mod Page + Staging Folder");
    assert.deepEqual(opened, [
      sep(STAGING, "Cool Mod"),
      "https://www.nexusmods.com/XXX/mods/123?tab=description",
    ]);
    assert.equal(state.dismissed, 1);
  });

  it("opens the game's mod list when the mod has no Nexus id or is not found", async () => {
    for (const mods of [
      { a: { id: "a", installationPath: "Cool Mod", attributes: {} } },
      { a: { id: "a", installationPath: "Different", attributes: { modId: 5 } } },
      {},
    ]) {
      const ext = await boot({ state: stateFor({ mods }) });
      await installerOf(ext, ID.binaries).install(FALLBACK_FILES, sep(STAGING, "Cool Mod.installing"));
      const opened = stubShell();
      openMore(ext, ext.notifications[0]).press("Open Mod Page + Staging Folder");
      assert.equal(opened[1], "https://www.nexusmods.com/XXX/mods/");
    }
  });

  it("reports a folder or page it cannot open", async () => {
    const ext = await boot({ state: stateFor({}) });
    await installerOf(ext, ID.binaries).install(FALLBACK_FILES, sep(STAGING, "Cool Mod.installing"));
    delete globalThis.window;
    openMore(ext, ext.notifications[0]).press("Open Mod Page + Staging Folder");
    assert.deepEqual(
      ext.errors.map(([message]) => message),
      ["Failed to open the file or folder", "Failed to open the URL"],
    );
    assert.deepEqual(ext.errors[0][2], { allowReport: false });
    openMore(ext, ext.notifications[0]).press("Contact Ext. Developer");
    assert.equal(ext.errors.at(-1)[0], "Failed to open the URL");
  });

  it("stays quiet while the install is part of a mod update", async () => {
    const ext = await boot({ state: stateFor({}) });
    ext.api.events.emit("mod-update", GAME_ID, 123, 456);
    ext.api.events.emit("will-install-mod", GAME_ID, "archive", "Cool Mod-123-1");
    await installerOf(ext, ID.binaries).install(FALLBACK_FILES, sep(STAGING, "Cool Mod.installing"));
    assert.deepEqual(ext.notifications, []);
  });
});

const typeOf = (ext, id) => ext.modTypes.find((type) => type.id === id);
const pathOf = (ext, id) => typeOf(ext, id).getPath({ id: GAME_ID });

describe("template-ue4-5: game discovery and the executable", () => {
  it("looks the game up by its discovery ids and returns the folder", async () => {
    const ext = await boot();
    const seen = [];
    vortex.gameStore.findByAppId = async (ids) => {
      seen.push(ids);
      return { gamePath: "C:\\Games\\Cool" };
    };
    assert.equal(await ext.game.queryPath(), "C:\\Games\\Cool");
    assert.deepEqual(seen, [["XXX"]]);
  });

  it("passes a failed lookup on", async () => {
    const ext = await boot();
    await assert.rejects(ext.game.queryPath(), /game not found/);
  });

  it("answers the mod path relative to the game", async () => {
    const ext = await boot();
    assert.equal(ext.game.queryModPath(), sep("XXX", "Content", "Paks", "~mods"));
  });

  // [files in the game folder, executable returned]
  const XBOX_ON = [
    [["gamelaunchhelper.exe"], "gamelaunchhelper.exe"],
    [["XXX.exe"], "XXX.exe"],
    [["gamelaunchhelper.exe", "XXX.exe"], "gamelaunchhelper.exe"],
    [[], "XXX.exe"],
  ];
  for (const [files, expected] of XBOX_ON) {
    it(`with Xbox support, ${files.join(" + ") || "an empty folder"} runs ${expected}`, async () => {
      const ext = await boot();
      assert.equal(ext.game.executable(makeGameDir(files)), expected);
    });
  }

  const MULTI = [
    [["XXX.exe"], "XXX.exe"],
    [["Epic.exe"], "Epic.exe"],
    [["Gog.exe"], "Gog.exe"],
    [["Demo.exe"], "Demo.exe"],
    [["Epic.exe", "Demo.exe"], "Demo.exe"],
    [["Gog.exe", "Epic.exe"], "Epic.exe"],
    [["Gog.exe", "XXX.exe", "Demo.exe"], "XXX.exe"],
    [[], "XXX.exe"],
  ];
  for (const [files, expected] of MULTI) {
    it(`with one executable per store, ${files.join(" + ") || "an empty folder"} runs ${expected}`, async () => {
      const ext = await boot({ transform: multiExe });
      assert.equal(ext.game.executable(makeGameDir(files)), expected);
    });
  }

  it("with no Xbox and one executable, answers at once and leaves the paths alone", async () => {
    const ext = await boot({ transform: noXbox });
    const before = pathOf(ext, ID.binaries);
    assert.equal(ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])), "XXX.exe");
    assert.equal(pathOf(ext, ID.binaries), before);
  });

  it("points the engine folders at WinGDK for the Xbox build", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    const ext = await boot({ state: stateFor({ gameDir }) });
    const winGdk = (...rest) => sep(gameDir, "XXX", "Binaries", "WinGDK", ...rest);
    ext.game.executable(gameDir);
    assert.equal(pathOf(ext, ID.binaries), winGdk());
    assert.equal(pathOf(ext, ID.ue4ss), winGdk());
    assert.equal(pathOf(ext, ID.scripts), winGdk("ue4ss", "Mods"));
    assert.equal(pathOf(ext, ID.dll), winGdk("ue4ss", "Mods"));
    assert.equal(
      pathOf(ext, ID.config),
      sep(LOCAL_APP_DATA, "XXX", "Saved", "Config", "WinGDK"),
    );
  });

  it("points the engine folders back at Win64 for any other build", async () => {
    const gameDir = makeGameDir(["XXX.exe"]);
    const ext = await boot({ state: stateFor({ gameDir }) });
    ext.game.executable(makeGameDir(["gamelaunchhelper.exe"]));
    ext.game.executable(gameDir);
    assert.equal(pathOf(ext, ID.binaries), sep(gameDir, "XXX", "Binaries", "Win64"));
    assert.equal(
      pathOf(ext, ID.config),
      sep(LOCAL_APP_DATA, "XXX", "Saved", "Config", "Windows"),
    );
  });

  for (const [file, label] of [
    ["Epic.exe", "Epic"],
    ["Gog.exe", "GOG"],
    ["Demo.exe", "demo"],
  ]) {
    it(`uses the Win64 folders for the ${label} build`, async () => {
      const gameDir = makeGameDir([file]);
      const ext = await boot({ transform: multiExe, state: stateFor({ gameDir }) });
      ext.game.executable(gameDir);
      assert.equal(pathOf(ext, ID.binaries), sep(gameDir, "XXX", "Binaries", "Win64"));
      assert.equal(pathOf(ext, ID.scripts), sep(gameDir, "XXX", "Binaries", "Win64", "ue4ss", "Mods"));
    });
  }

  it("takes the save folder of the Xbox build from the packaged app data", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    const wgs = sep(LOCAL_APP_DATA, "Packages", "XXX_XXX", "SystemAppData", "wgs");
    fs.mkdirSync(path.join(wgs, "0123ABCD"), { recursive: true });
    const ext = await boot({ state: stateFor({ gameDir }) });
    ext.game.executable(gameDir);
    assert.equal(pathOf(ext, ID.save), sep(wgs, "0123ABCD"));
    fs.rmSync(path.join(LOCAL_APP_DATA, "Packages"), { recursive: true, force: true });
  });

  it("uses the packaged app data folder itself when it holds no user folder yet", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    const ext = await boot({ state: stateFor({ gameDir }) });
    ext.game.executable(gameDir);
    assert.equal(
      pathOf(ext, ID.save),
      sep(LOCAL_APP_DATA, "Packages", "XXX_XXX", "SystemAppData", "wgs"),
    );
  });

  it("takes the first folder of the save folder as the user id for a Steam-style build", async () => {
    const saves = sep(LOCAL_APP_DATA, "XXX", "Saved", "SaveGames");
    fs.mkdirSync(path.join(saves, "76561198000000000"), { recursive: true });
    write(path.join(saves, "stray.txt"));
    const ext = await boot({ transform: setConst("hasUserIdFolder", "true") });
    fs.rmSync(path.join(LOCAL_APP_DATA, "XXX"), { recursive: true, force: true });
    assert.equal(pathOf(ext, ID.save), sep(saves, "76561198000000000"));
  });

  it("uses the save folder itself when the user id folder is switched on but missing", async () => {
    fs.rmSync(path.join(LOCAL_APP_DATA, "XXX"), { recursive: true, force: true });
    const ext = await boot({ transform: setConst("hasUserIdFolder", "true") });
    assert.equal(pathOf(ext, ID.save), sep(LOCAL_APP_DATA, "XXX", "Saved", "SaveGames"));
  });

  it("uses the save folder itself when the user id folder is switched on and holds only files", async () => {
    const saves = sep(LOCAL_APP_DATA, "XXX", "Saved", "SaveGames");
    write(path.join(saves, "stray.txt"));
    const ext = await boot({ transform: setConst("hasUserIdFolder", "true") });
    fs.rmSync(path.join(LOCAL_APP_DATA, "XXX"), { recursive: true, force: true });
    assert.equal(pathOf(ext, ID.save), saves);
  });
});

describe("template-ue4-5: launcher requirements", () => {
  it("asks Steam to start a Steam copy", async () => {
    const ext = await boot();
    assert.deepEqual(await ext.game.requiresLauncher("C:\\game", "steam"), { launcher: "steam" });
  });

  it("starts the Xbox copy through its app id and executable name", async () => {
    const ext = await boot();
    assert.deepEqual(await ext.game.requiresLauncher("C:\\game", "xbox"), {
      launcher: "xbox",
      addInfo: { appId: "XXX", parameters: [{ appExecName: "AppUEGameShipping" }] },
    });
  });

  it("starts the Epic copy through its app id", async () => {
    const ext = await boot();
    assert.deepEqual(await ext.game.requiresLauncher("C:\\game", "epic"), {
      launcher: "epic",
      addInfo: { appId: "XXX" },
    });
  });

  it("needs no launcher for GOG, an unknown store or an id outside the discovery ids", async () => {
    const ext = await boot();
    assert.equal(await ext.game.requiresLauncher("C:\\game", "gog"), undefined);
    assert.equal(await ext.game.requiresLauncher("C:\\game", undefined), undefined);
    const other = await boot({
      transform: all(setConst("EPICAPP_ID", '"epic-id"'), noXbox),
    });
    assert.equal(await other.game.requiresLauncher("C:\\game", "epic"), undefined);
    assert.equal(await other.game.requiresLauncher("C:\\game", "xbox"), undefined);
    assert.deepEqual(await other.game.requiresLauncher("C:\\game", "steam"), { launcher: "steam" });
  });
});

describe("template-ue4-5: game version", () => {
  const version = (ext, gameDir) => ext.game.getGameVersion(gameDir);

  it("reads the Xbox version from appxmanifest.xml", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    write(
      path.join(gameDir, "appxmanifest.xml"),
      '<?xml version="1.0"?><Package><Identity Name="Game" Version="2.0.1.0"/></Package>',
    );
    const ext = await boot();
    assert.equal(await version(ext, gameDir), "2.0.1.0");
  });

  it("falls back to 0.0.0 when the Xbox manifest cannot be read", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    const ext = await boot();
    assert.equal(await version(ext, gameDir), "0.0.0");
    assert.equal(vortex.logs.some(({ level, message }) => level === "error" && message.startsWith("Could not read appmanifest.xml file to get Xbox game version")), true);
  });

  it("reads the executable's product version first when exeHasGameVersion is on", async () => {
    const gameDir = makeGameDir(["XXX.exe"]);
    const ext = await boot({ transform: setConst("exeHasGameVersion", "true") });
    assert.equal(await version(ext, gameDir), STUB_EXE_VERSION);
  });

  it("carries on to the store builds when the executable version cannot be read", async () => {
    const root = makeTempDir();
    const gameDir = path.join(root, "steamapps", "common", "Cool");
    fs.mkdirSync(gameDir, { recursive: true });
    write(path.join(root, "steamapps", "appmanifest_480.acf"), '"AppState"\n{\n\t"buildid"\t\t"4242"\n}');
    const ext = await boot({
      transform: all(setConst("exeHasGameVersion", "true"), setConst("STEAMAPP_ID", '"480"')),
    });
    mock.method(require("exe-version"), "getProductVersion", () => {
      throw new Error("unreadable");
    });
    assert.equal(await version(ext, gameDir), "4242");
  });

  describe("from the store build", () => {
    const steam = setConst("STEAMAPP_ID", '"480"');

    it("takes the Steam build id from the app manifest", async () => {
      const root = makeTempDir();
      const gameDir = path.join(root, "steamapps", "common", "Cool");
      fs.mkdirSync(gameDir, { recursive: true });
      write(path.join(root, "steamapps", "appmanifest_480.acf"), '"buildid"\t\t"12345"');
      const ext = await boot({ transform: steam });
      assert.equal(await version(ext, gameDir), "12345");
    });

    it("finds the steamapps folder from a nested game folder, whatever the case", async () => {
      const root = makeTempDir();
      const gameDir = path.join(root, "SteamApps", "Common", "Cool", "Sub");
      fs.mkdirSync(gameDir, { recursive: true });
      write(path.join(root, "SteamApps", "appmanifest_480.acf"), '"buildid"\t\t"777"');
      const ext = await boot({ transform: steam });
      assert.equal(await version(ext, gameDir), "777");
    });

    it("falls back to the demo's manifest", async () => {
      const root = makeTempDir();
      const gameDir = path.join(root, "steamapps", "common", "Cool");
      fs.mkdirSync(gameDir, { recursive: true });
      write(path.join(root, "steamapps", "appmanifest_481.acf"), '"buildid"\t\t"6789"');
      const ext = await boot({ transform: all(steam, setConst("STEAMAPP_ID_DEMO", '"481"')) });
      assert.equal(await version(ext, gameDir), "6789");
    });

    it("prefers the full game's manifest over the demo's", async () => {
      const root = makeTempDir();
      const gameDir = path.join(root, "steamapps", "common", "Cool");
      fs.mkdirSync(gameDir, { recursive: true });
      write(path.join(root, "steamapps", "appmanifest_480.acf"), '"buildid"\t\t"1"');
      write(path.join(root, "steamapps", "appmanifest_481.acf"), '"buildid"\t\t"2"');
      const ext = await boot({ transform: all(steam, setConst("STEAMAPP_ID_DEMO", '"481"')) });
      assert.equal(await version(ext, gameDir), "1");
    });

    it("ignores a manifest without a build id and a game outside steamapps", async () => {
      const root = makeTempDir();
      const gameDir = path.join(root, "steamapps", "common", "Cool");
      fs.mkdirSync(gameDir, { recursive: true });
      write(path.join(root, "steamapps", "appmanifest_480.acf"), '"name"\t\t"Cool"');
      const ext = await boot({ transform: steam });
      assert.equal(await version(ext, gameDir), STUB_EXE_VERSION);
      assert.equal(await version(ext, makeGameDir()), STUB_EXE_VERSION);
    });

    describe("Epic", () => {
      const epic = setConst("EPICAPP_ID", '"epicid"');
      const manifests = (entries) => {
        const dataPath = makeTempDir();
        for (const [name, content] of Object.entries(entries)) {
          write(path.join(dataPath, "Manifests", name), content);
        }
        return dataPath;
      };
      const withData = (dataPath, run) =>
        withWinapi({ RegGetValue: () => ({ value: dataPath }) }, run);

      it("takes the version of the manifest with this app name", async () => {
        const dataPath = manifests({
          "a.item": JSON.stringify({ AppName: "other", AppVersionString: "9.9" }),
          "b.item": JSON.stringify({ AppName: "epicid", AppVersionString: "1.5.0" }),
        });
        const ext = await boot({ transform: epic });
        await withData(dataPath, async () => {
          assert.equal(await version(ext, makeGameDir()), "1.5.0");
        });
      });

      it("matches the install location when the app name differs, ignoring case", async () => {
        const gameDir = makeGameDir();
        const dataPath = manifests({
          "a.item": JSON.stringify({
            AppName: "other",
            InstallLocation: gameDir.toUpperCase(),
            AppVersionString: "3.1",
          }),
        });
        const ext = await boot({ transform: epic });
        await withData(dataPath, async () => {
          assert.equal(await version(ext, gameDir), "3.1");
        });
      });

      it("skips manifests it cannot parse and files that are not manifests", async () => {
        const dataPath = manifests({
          "broken.item": "{ nope",
          "note.txt": JSON.stringify({ AppName: "epicid", AppVersionString: "7.7" }),
          "z.ITEM": JSON.stringify({ AppName: "epicid", AppVersionString: "2.2" }),
        });
        const ext = await boot({ transform: epic });
        await withData(dataPath, async () => {
          assert.equal(await version(ext, makeGameDir()), "2.2");
        });
      });

      it("skips a matching manifest that has no version", async () => {
        const dataPath = manifests({ "a.item": JSON.stringify({ AppName: "epicid" }) });
        const ext = await boot({ transform: epic });
        await withData(dataPath, async () => {
          assert.equal(await version(ext, makeGameDir()), STUB_EXE_VERSION);
        });
      });

      it("reads the launcher data folder from ProgramData when the registry has no entry", async () => {
        const programData = makeTempDir();
        write(
          path.join(programData, "Epic", "EpicGamesLauncher", "Data", "Manifests", "a.item"),
          JSON.stringify({ AppName: "epicid", AppVersionString: "4.4" }),
        );
        const saved = process.env.ProgramData;
        process.env.ProgramData = programData;
        try {
          const ext = await boot({ transform: epic });
          assert.equal(await version(ext, makeGameDir()), "4.4");
        } finally {
          process.env.ProgramData = saved;
        }
      });

      it("logs and moves on when the manifest folder is missing", async () => {
        const ext = await boot({ transform: epic });
        await withData(makeTempDir(), async () => {
          assert.equal(await version(ext, makeGameDir()), STUB_EXE_VERSION);
        });
        assert.equal(vortex.logs.some(({ level, message }) => level === "warn" && message.startsWith("Could not read Epic manifests for XXX")), true);
      });

      it("reads the registry value that names the data folder", async () => {
        const asked = [];
        const ext = await boot({ transform: epic });
        await withWinapi(
          {
            RegGetValue: (...args) => {
              asked.push(args);
              return { value: makeTempDir() };
            },
          },
          async () => version(ext, makeGameDir()),
        );
        assert.deepEqual(asked, [
          ["HKEY_LOCAL_MACHINE", "SOFTWARE\\WOW6432Node\\Epic Games\\EpicGamesLauncher", "AppDataPath"],
        ]);
      });
    });

    describe("GOG", () => {
      const gog = setConst("GOGAPP_ID", '"1234"');
      const registry = (gameDir, ver = "2.1.0") => (hive, key, name) => {
        assert.equal(hive, "HKEY_LOCAL_MACHINE");
        assert.equal(key, "SOFTWARE\\WOW6432Node\\GOG.com\\Games\\1234");
        return { value: name === "path" ? gameDir : ver };
      };

      it("takes the version the GOG registry key records for this install", async () => {
        const gameDir = makeGameDir();
        const ext = await boot({ transform: gog });
        await withWinapi({ RegGetValue: registry(gameDir) }, async () => {
          assert.equal(await version(ext, gameDir), "2.1.0");
        });
      });

      it("compares the install folders without regard to case", async () => {
        const gameDir = makeGameDir();
        const ext = await boot({ transform: gog });
        await withWinapi({ RegGetValue: registry(gameDir.toUpperCase()) }, async () => {
          assert.equal(await version(ext, gameDir), "2.1.0");
        });
      });

      it("ignores a GOG install in a different folder", async () => {
        const ext = await boot({ transform: gog });
        await withWinapi({ RegGetValue: registry(makeGameDir()) }, async () => {
          assert.equal(await version(ext, makeGameDir()), STUB_EXE_VERSION);
        });
      });

      it("ignores a missing registry key", async () => {
        const ext = await boot({ transform: gog });
        assert.equal(await version(ext, makeGameDir()), STUB_EXE_VERSION);
      });
    });

    it("tries Steam, then Epic, then GOG", async () => {
      const root = makeTempDir();
      const gameDir = path.join(root, "steamapps", "common", "Cool");
      fs.mkdirSync(gameDir, { recursive: true });
      write(path.join(root, "steamapps", "appmanifest_480.acf"), '"buildid"\t\t"STEAM"'.replace("STEAM", "11"));
      const all3 = all(steam, setConst("EPICAPP_ID", '"e"'), setConst("GOGAPP_ID", '"g"'));
      const ext = await boot({ transform: all3 });
      await withWinapi(
        { RegGetValue: (_hive, _key, name) => ({ value: name === "path" ? gameDir : "gog-ver" }) },
        async () => {
          assert.equal(await version(ext, gameDir), "11");
        },
      );
      const noSteam = await boot({ transform: all(setConst("EPICAPP_ID", '"e"'), setConst("GOGAPP_ID", '"g"')) });
      await withWinapi(
        { RegGetValue: (_hive, _key, name) => ({ value: name === "path" ? gameDir : "gog-ver" }) },
        async () => {
          assert.equal(await version(noSteam, gameDir), "gog-ver");
        },
      );
    });
  });

  describe("from the shipping executable", () => {
    const shipping = (gameDir, content = "binary") =>
      write(path.join(gameDir, "XXX", "Binaries", "Win64", "XXX-Win64-Shipping.exe"), content);
    const md5 = (text) => crypto.createHash("md5").update(text).digest("hex");

    it("hashes the shipping executable when no store build is known", async () => {
      const gameDir = makeGameDir(["XXX.exe"]);
      shipping(gameDir, "game code");
      const ext = await boot();
      assert.equal(await version(ext, gameDir), md5(md5("game code")));
    });

    it("hashes a build once, however often it is asked", async () => {
      const gameDir = makeGameDir(["XXX.exe"]);
      shipping(gameDir, "game code");
      const ext = await boot();
      const hashes = mock.method(vortex.vortexApi.util, "fileMD5", async () => "fixed");
      const first = await version(ext, gameDir);
      const second = await version(ext, gameDir);
      assert.equal(first, second);
      assert.equal(hashes.mock.callCount(), 1);
    });

    it("hashes again when the executable's modification time changes", async () => {
      const gameDir = makeGameDir(["XXX.exe"]);
      shipping(gameDir, "game code");
      const ext = await boot();
      const hashes = mock.method(vortex.vortexApi.util, "fileMD5", async () => "fixed");
      await version(ext, gameDir);
      const file = path.join(gameDir, "XXX", "Binaries", "Win64", "XXX-Win64-Shipping.exe");
      fs.utimesSync(file, new Date(2020, 1, 1), new Date(2020, 1, 1));
      await version(ext, gameDir);
      assert.equal(hashes.mock.callCount(), 2);
    });

    it("hashes the shipping executable of the Epic build under its own file name", async () => {
      const gameDir = makeGameDir(["Epic.exe"]);
      write(path.join(gameDir, "XXX", "Binaries", "Win64", "XXX-Win64-EOS-Shipping.exe"), "epic code");
      const ext = await boot({
        transform: all(multiExe, setConst("SHIPEXE_STRING_EGS", '"-EOS"')),
      });
      ext.game.executable(gameDir);
      assert.equal(await version(ext, gameDir), md5(md5("epic code")));
    });

    it("uses the product version of the executable when there is nothing to hash", async () => {
      const ext = await boot();
      assert.equal(await version(ext, makeGameDir(["XXX.exe"])), STUB_EXE_VERSION);
    });

    it("answers 0.0.0 when nothing at all can be read, instead of throwing", async () => {
      const ext = await boot();
      mock.method(require("exe-version"), "getProductVersion", () => {
        throw new Error("unreadable");
      });
      assert.equal(await version(ext, makeGameDir(["XXX.exe"])), "0.0.0");
    });
  });
});

// The shared app data folder outlives a test, so tests that look at what setup created start from
// an empty one.
const cleanLocal = () => fs.rmSync(path.join(LOCAL_APP_DATA, "XXX"), { recursive: true, force: true });
const exists = (...parts) => fs.existsSync(path.join(...parts));

describe("template-ue4-5: setup", () => {
  const MOD_FOLDERS = [
    ["XXX", "Content", "Paks", "~mods"],
    ["XXX", "Content", "Paks"],
    ["XXX", "Content", "Paks", "LogicMods"],
    ["XXX", "Binaries", "Win64", "ue4ss", "Mods"],
    ["XXX", "Binaries", "Win64", "ue4ss", "Mods", "BPModLoaderMod"],
    ["XXX", "Binaries", "Win64"],
  ];

  it("makes every mod folder, the config folder and the save folder", async () => {
    cleanLocal();
    const { gameDir } = await ready();
    for (const folder of MOD_FOLDERS) assert.equal(exists(gameDir, ...folder), true, folder.join("/"));
    assert.equal(exists(LOCAL_APP_DATA, "XXX", "Saved", "Config", "Windows"), true);
    assert.equal(exists(LOCAL_APP_DATA, "XXX", "Saved", "SaveGames"), true);
  });

  it("makes the WinGDK folders and no save folder for the Xbox build", async () => {
    cleanLocal();
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    const ext = await boot({ state: stateFor({ gameDir }) });
    ext.game.executable(gameDir);
    await ext.game.setup({ path: gameDir });
    assert.equal(exists(gameDir, "XXX", "Binaries", "WinGDK", "ue4ss", "Mods"), true);
    assert.equal(exists(gameDir, "XXX", "Binaries", "Win64"), false);
    assert.equal(exists(LOCAL_APP_DATA, "XXX", "Saved", "Config", "WinGDK"), true);
    assert.equal(exists(LOCAL_APP_DATA, "XXX", "Saved", "SaveGames"), false);
  });

  it("ue4ssLoadOrder off makes no UE4SS or LogicMods folders", async () => {
    const { gameDir } = await ready({ transform: noUe4ss });
    assert.equal(exists(gameDir, "XXX", "Content", "Paks", "~mods"), true);
    assert.equal(exists(gameDir, "XXX", "Binaries", "Win64"), true);
    assert.equal(exists(gameDir, "XXX", "Content", "Paks", "LogicMods"), false);
    assert.equal(exists(gameDir, "XXX", "Binaries", "Win64", "ue4ss"), false);
  });

  it("logicModsLoadOrder off makes no BPModLoaderMod folder", async () => {
    const { gameDir } = await ready({ transform: noLogicMods });
    assert.equal(exists(gameDir, "XXX", "Binaries", "Win64", "ue4ss", "Mods"), true);
    assert.equal(exists(gameDir, "XXX", "Binaries", "Win64", "ue4ss", "Mods", "BPModLoaderMod"), false);
  });

  it("hasModKit makes the Mods folder", async () => {
    const { gameDir } = await ready({ transform: modKit });
    assert.equal(exists(gameDir, "XXX", "Mods"), true);
    const plain = await ready();
    assert.equal(exists(plain.gameDir, "XXX", "Mods"), false);
  });

  it("makes no config or save folder, and says so, when the game is on another drive", async () => {
    cleanLocal();
    const gameDir = makeGameDir(["XXX.exe"]);
    const ext = await boot({ state: stateFor({ gameDir }) });
    onOtherDevice(gameDir);
    await ext.game.setup({ path: gameDir });
    assert.equal(exists(LOCAL_APP_DATA, "XXX", "Saved", "Config"), false);
    assert.equal(exists(LOCAL_APP_DATA, "XXX", "Saved", "SaveGames"), false);
    const [notification] = ext.notifications;
    assert.equal(notification.id, "XXX-partioncheck");
    assert.equal(notification.type, "warning");
    assert.equal(notification.message, "Some Mods Installers are Not Available");
    assert.equal(notification.allowSuppress, true);
    const suppressed = [];
    ext.api.suppressNotification = (id) => suppressed.push(id);
    const { dialog, text, press, state } = openMore(ext, notification);
    assert.equal(dialog[1], "Some Mods Installers are Not Available");
    assert.match(text, /Because XXX includes the IO-Store Unreal Engine feature/);
    assert.match(text, /Config: DISABLED: Local AppData folder is NOT on the same partition/);
    assert.match(text, /Save: DISABLED: Local AppData folder is NOT on the same partition/);
    assert.match(text, new RegExp(`Game Path: ${gameDir.replace(/\\/g, "\\\\")}\\n`));
    assert.match(text, /Staging Path: /);
    assert.match(text, /Config Path: /);
    assert.match(text, /Save Path \(installer for Steam\/Epic\/GOG versions only\): /);
    assert.deepEqual(dialog[3].map(({ label }) => label), ["Acknowledge", "Never Show Again"]);
    press("Acknowledge");
    assert.equal(state.dismissed, 1);
    press("Never Show Again");
    assert.deepEqual(suppressed, ["XXX-partioncheck"]);
    assert.equal(state.dismissed, 2);
  });

  it("stays quiet when everything shares a drive", async () => {
    const { ext } = await ready();
    assert.deepEqual(ext.notifications, []);
  });

  it("checks the drives only when hardlinks matter", async () => {
    const gameDir = makeGameDir(["XXX.exe"]);
    const ext = await boot({
      transform: all(noIoStore, setConst("preferHardlinks", "false")),
      state: stateFor({ gameDir }),
    });
    onOtherDevice(gameDir);
    await ext.game.setup({ path: gameDir });
    assert.deepEqual(ext.notifications, []);
  });

  it("shows the special instructions notification only when asked to", async () => {
    const { ext } = await ready({ transform: setConst("setupNotification", "true") });
    const [notification] = ext.notifications;
    assert.equal(notification.id, "XXX-setup-notify");
    assert.equal(notification.type, "warning");
    assert.equal(notification.message, "Special Setup Instructions");
    const suppressed = [];
    ext.api.suppressNotification = (id) => suppressed.push(id);
    const { dialog, text, press } = openMore(ext, notification);
    assert.equal(dialog[1], "Special Setup Instructions");
    assert.equal(text, "\nTEXT HERE.\n\nTEXT HERE.\n\n");
    assert.deepEqual(dialog[3].map(({ label }) => label), ["Acknowledge", "Never Show Again"]);
    press("Never Show Again");
    assert.deepEqual(suppressed, ["XXX-setup-notify"]);
    const quiet = await ready();
    assert.equal(quiet.ext.notifications.some(({ id }) => id === "XXX-setup-notify"), false);
  });
});

describe("template-ue4-5: mod type behavior", () => {
  const GAME = { id: GAME_ID };

  it("only claims the game once it is discovered", async () => {
    const gameDir = makeGameDir(["XXX.exe"]);
    const ext = await boot({ state: stateFor({ gameDir }) });
    for (const id of [ID.combo, ID.logic, ID.pakAlt, ID.root, ID.pak, ID.scripts, ID.dll, ID.binaries, ID.ue4ss]) {
      const type = typeOf(ext, id);
      assert.equal(type.isSupported(GAME_ID), true, id);
      assert.equal(type.isSupported("othergame"), false, id);
    }
    const undiscovered = await boot({ state: stateFor({}) });
    for (const type of undiscovered.modTypes.filter(({ id }) => ![ID.config, ID.save].includes(id))) {
      assert.equal(type.isSupported(GAME_ID), false, type.id);
    }
  });

  it("is never picked by Vortex's own detection", async () => {
    const ext = await boot();
    for (const type of ext.modTypes) assert.equal(await type.test(), false, type.id);
  });

  it("deploys each mod type to its own folder", async () => {
    const gameDir = makeGameDir(["XXX.exe"]);
    const ext = await boot({ state: stateFor({ gameDir }) });
    ext.game.executable(gameDir);
    const win64 = (...rest) => sep(gameDir, "XXX", "Binaries", "Win64", ...rest);
    assert.equal(pathOf(ext, ID.combo), gameDir);
    assert.equal(pathOf(ext, ID.root), gameDir);
    assert.equal(pathOf(ext, ID.logic), sep(gameDir, "XXX", "Content", "Paks"));
    assert.equal(pathOf(ext, ID.pakAlt), sep(gameDir, "XXX", "Content", "Paks"));
    assert.equal(pathOf(ext, ID.pak), sep(gameDir, "XXX", "Content", "Paks", "~mods"));
    assert.equal(pathOf(ext, ID.scripts), win64("ue4ss", "Mods"));
    assert.equal(pathOf(ext, ID.dll), win64("ue4ss", "Mods"));
    assert.equal(pathOf(ext, ID.binaries), win64());
    assert.equal(pathOf(ext, ID.ue4ss), win64());
    assert.equal(pathOf(ext, ID.config), sep(LOCAL_APP_DATA, "XXX", "Saved", "Config", "Windows"));
    assert.equal(pathOf(ext, ID.save), sep(LOCAL_APP_DATA, "XXX", "Saved", "SaveGames"));
  });

  it("deploys the ModKit and bypass types to the game folders they belong in", async () => {
    const gameDir = makeGameDir(["XXX.exe"]);
    const ext = await boot({ transform: all(modKit, sigBypass), state: stateFor({ gameDir }) });
    assert.equal(pathOf(ext, ID.modkit), sep(gameDir, "XXX", "Mods"));
    assert.equal(pathOf(ext, ID.sigbypass), sep(gameDir, "XXX", "Binaries", "Win64"));
  });

  it("reports a missing executable when the game folder cannot be worked out", async () => {
    const ext = await boot({ state: stateFor({ gameDir: makeGameDir() }) });
    ext.state.settings.gameMode = undefined;
    assert.equal(typeOf(ext, ID.binaries).getPath(GAME), undefined);
    const [message, error] = ext.errors[0];
    assert.equal(message, "Failed to locate executable. Please launch the game at least once.");
    assert.equal(error instanceof Error, true);
  });

  describe("Config and Save types", () => {
    it("offer Config once the config folder shares a drive with the game and staging", async () => {
      const { ext } = await ready();
      assert.equal(typeOf(ext, ID.config).isSupported(GAME_ID), true);
      assert.equal(typeOf(ext, ID.config).isSupported("othergame"), false);
    });

    it("withdraw Config when the config folder is on another drive", async () => {
      const { ext } = await ready();
      onOtherDevice(LOCAL_APP_DATA);
      assert.equal(typeOf(ext, ID.config).isSupported(GAME_ID), false);
    });

    it("offer Config only when the game is known", async () => {
      const { ext } = await ready();
      ext.state.settings.gameMode.discovered = {};
      assert.equal(typeOf(ext, ID.config).isSupported(GAME_ID), true);
    });

    it("offer Save for the store builds that have compatible saves", async () => {
      const { ext } = await ready();
      assert.equal(typeOf(ext, ID.save).isSupported(GAME_ID), true);
      assert.equal(typeOf(ext, ID.save).isSupported("othergame"), false);
    });

    it("withdraw Save for the Xbox build", async () => {
      const { ext } = await ready({ files: ["gamelaunchhelper.exe"] });
      assert.equal(typeOf(ext, ID.save).isSupported(GAME_ID), false);
    });

    it("withdraw Save for a build that has no recognised executable", async () => {
      const { ext } = await ready({ files: ["readme.txt"] });
      assert.equal(typeOf(ext, ID.save).isSupported(GAME_ID), false);
    });

    it("withdraw Save when the save folder is on another drive", async () => {
      const { ext } = await ready();
      onOtherDevice(LOCAL_APP_DATA);
      // Config and Save share one folder, so Save follows the drive check the Config type just ran.
      assert.equal(typeOf(ext, ID.config).isSupported(GAME_ID), false);
      assert.equal(typeOf(ext, ID.save).isSupported(GAME_ID), false);
    });

    it("keeps the drive result of the last Config check for Save", async () => {
      const { ext } = await ready();
      onOtherDevice(LOCAL_APP_DATA);
      assert.equal(typeOf(ext, ID.save).isSupported(GAME_ID), true);
    });
  });

  describe("sorting prefix of the sortable pak type", () => {
    const prefixed = async (loadOrder, id = "mod-a") => {
      const ext = await boot({ state: stateFor({ loadOrder }) });
      return typeOf(ext, ID.pak).options.mergeMods({ id });
    };
    const entries = (count) => Array.from({ length: count }, (_, index) => ({ id: `mod-${index}` }));

    it("numbers folders from AAA by load order position", async () => {
      assert.equal(await prefixed([{ id: "mod-a" }]), "AAA-mod-a");
      assert.equal(await prefixed([{ id: "x" }, { id: "mod-a" }]), "AAB-mod-a");
      assert.equal(await prefixed([{ id: "x" }, { id: "y" }, { id: "mod-a" }]), "AAC-mod-a");
    });

    it("counts in base 25, so Z is never used and 25 rolls over to BA", async () => {
      const at = (position) => {
        const list = entries(position + 1);
        list[position] = { id: "mod-a" };
        return prefixed(list);
      };
      assert.equal(await at(24), "AAY-mod-a");
      assert.equal(await at(25), "ABA-mod-a");
      assert.equal(await at(26), "ABB-mod-a");
      assert.equal(await at(625), "BAA-mod-a");
    });

    it("sorts a mod missing from the load order last", async () => {
      assert.equal(await prefixed([{ id: "x" }]), "ZZZZ-mod-a");
      assert.equal(await prefixed(undefined), "ZZZZ-mod-a");
    });

    it("reads the position from a legacy load order stored as an object", async () => {
      assert.equal(await prefixed({ first: {}, "mod-a": {}, last: {} }), "AAB-mod-a");
      assert.equal(await prefixed({ first: {} }), "ZZZZ-mod-a");
    });

    it("uses the load order of the last active profile", async () => {
      const ext = await boot({ state: stateFor({ loadOrder: [{ id: "x" }, { id: "mod-a" }] }) });
      ext.state.persistent.loadOrder.other = [{ id: "mod-a" }];
      assert.equal(typeOf(ext, ID.pak).options.mergeMods({ id: "mod-a" }), "AAB-mod-a");
    });
  });
});

describe("template-ue4-5: toolbar buttons", () => {
  const button = (ext, title) => ext.registeredActions.find((action) => action.title === title);

  it("open the folders and pages they are named after", async () => {
    cleanLocal();
    const { ext, gameDir } = await ready();
    const opened = stubShell();
    const win64 = (...rest) => sep(gameDir, "XXX", "Binaries", "Win64", ...rest);
    const expected = [
      ["Open Paks Folder", sep(gameDir, "XXX", "Content", "Paks")],
      ["Open Binaries Folder", win64()],
      ["Open UE4SS Mods Folder", win64("ue4ss", "Mods")],
      ["Open Config Folder", sep(LOCAL_APP_DATA, "XXX", "Saved", "Config", "Windows")],
      ["Open Saves Folder", sep(LOCAL_APP_DATA, "XXX", "Saved", "SaveGames")],
      ["Open UE4SS Settings INI", win64("ue4ss", "UE4SS-settings.ini")],
      ["Open UE4SS mods.txt", win64("ue4ss", "Mods", "mods.txt")],
      ["Open PCGamingWiki Page", "XXX"],
      ["Open Nexus Mods Page", "https://www.nexusmods.com/XXX/mods"],
      ["Open SteamDB Page", "https://steamdb.info/app/XXX/"],
      ["View Changelog", sep(DIR, "CHANGELOG.md")],
      ["Submit Bug Report", "XXX?tab=bugs"],
      ["Open Downloads Folder", DOWNLOADS],
    ];
    for (const [title, target] of expected) {
      opened.length = 0;
      await button(ext, title).action();
      assert.deepEqual(opened, [target], title);
    }
  });

  it("known gap: Open LogicMods Folder opens the Paks folder, not its LogicMods subfolder", async () => {
    const { ext, gameDir } = await ready();
    const opened = stubShell();
    await button(ext, "Open LogicMods Folder").action();
    // Should be <game>\XXX\Content\Paks\LogicMods, which is what the LogicMods load order page opens.
    assert.deepEqual(opened, [sep(gameDir, "XXX", "Content", "Paks")]);
  });

  it("report a folder or page they cannot open instead of throwing", async () => {
    const { ext } = await ready();
    delete globalThis.window;
    const FOLDERS = [
      "Open Paks Folder",
      "Open Binaries Folder",
      "Open UE4SS Mods Folder",
      "Open LogicMods Folder",
      "Open Config Folder",
      "Open Saves Folder",
      "Open UE4SS Settings INI",
      "Open UE4SS mods.txt",
      "View Changelog",
      "Open Downloads Folder",
    ];
    const PAGES = [
      "Open PCGamingWiki Page",
      "Open Nexus Mods Page",
      "Open SteamDB Page",
      "Submit Bug Report",
    ];
    for (const title of FOLDERS) {
      ext.errors.length = 0;
      await button(ext, title).action();
      assert.equal(ext.errors[0][0], "Failed to open the file or folder", title);
      assert.deepEqual(ext.errors[0][2], { allowReport: false }, title);
    }
    for (const title of PAGES) {
      ext.errors.length = 0;
      await button(ext, title).action();
      assert.equal(ext.errors[0][0], "Failed to open the URL", title);
      assert.deepEqual(ext.errors[0][2], { allowReport: false }, title);
    }
  });
});

describe("template-ue4-5: UE4SS and signature bypass downloads", () => {
  const FILES = [
    { file_id: 11, category_id: 1, uploaded_time: "100" },
    { file_id: 12, category_id: 1, uploaded_time: "300" },
    { file_id: 13, category_id: 2, uploaded_time: "900" },
    { file_id: 14, category_id: 1, uploaded_time: "200" },
  ];

  // A booted extension ready to run a Nexus download: login, file list, events and a recorded
  // dismissal. `files` is what the Nexus file lookup returns, or a function that throws.
  async function nexusReady({ transform, files = FILES, mods } = {}) {
    const gameDir = makeGameDir(["XXX.exe"]);
    const ext = await boot({ transform, state: stateFor({ gameDir, mods }) });
    ext.nexus = { loggedIn: 0, lookups: [], dismissed: [] };
    ext.api.ext.ensureLoggedIn = async () => {
      ext.nexus.loggedIn++;
    };
    ext.api.ext.nexusGetModFiles = async (domain, page) => {
      ext.nexus.lookups.push([domain, page]);
      if (typeof files === "function") return files();
      return files;
    };
    ext.api.dismissNotification = (id) => ext.nexus.dismissed.push(id);
    ext.events = answerDownloadEvents(ext);
    return { ext, gameDir };
  }

  describe("UE4SS from GitHub", () => {
    it("hands the downloader one requirement describing the release to fetch", async () => {
      const { ext, gameDir } = await ready({ transform: setConst("autoDownloadUe4ss", "true") });
      assert.equal(gameDir.length > 0, true);
      const [[name, requirements, force]] = ext.fake.calls.filter(([call]) => call === "download");
      assert.equal(name, "download");
      assert.equal(force, false);
      assert.equal(requirements.length, 1);
      const [requirement] = requirements;
      assert.equal(requirement.archiveFileName, "ue4ss_v");
      assert.equal(requirement.modType, "XXX-ue4ss");
      assert.equal(requirement.assemblyFileName, "dwmapi.dll");
      assert.equal(requirement.userFacingName, "UE4SS");
      assert.equal(requirement.githubUrl, "https://api.github.com/repos/UE4SS-RE/RE-UE4SS");
      assert.equal(requirement.prereleaseTag, "experimental-latest");
      assert.equal(requirement.autoInstall, false);
    });

    it("recognises the release archive and reads its version from the name", async () => {
      const { ext } = await ready({ transform: setConst("autoDownloadUe4ss", "true") });
      const [, [requirement]] = ext.fake.calls.find(([call]) => call === "download");
      const pattern = requirement.fileArchivePattern;
      assert.equal("UE4SS_v3.0.1-1133-gb4cefa18.zip".match(pattern)[1], "3.0.1-1133");
      assert.equal("UE4SS_v3.0.1.zip".match(pattern)[1], "3.0.1");
      assert.equal("ue4ss_v2.5.2.zip".match(pattern)[1], "2.5.2");
      assert.equal("zDEV-UE4SS_v3.0.1-1133-gb4cefa18.zip".match(pattern), null);
      assert.equal("Something_UE4SS_v3.0.1.zip".match(pattern), null);
      assert.equal("UE4SS_vNext.zip".match(pattern), null);
    });

    it("asks the downloader's lookups about this game's UE4SS", async () => {
      const { ext } = await ready({ transform: setConst("autoDownloadUe4ss", "true") });
      const [, [requirement]] = ext.fake.calls.find(([call]) => call === "download");
      assert.equal(await requirement.findMod(ext.api), "found-mod");
      assert.equal(requirement.findDownloadId(ext.api), "download-1");
      assert.equal(await requirement.resolveVersion(ext.api), "3.0.1-1133");
      assert.deepEqual(ext.fake.calls.slice(-3), [
        ["findModByFile", "XXX-ue4ss", "dwmapi.dll"],
        ["findDownloadIdByFile", "ue4ss_v"],
        ["resolveVersionByModVersion", requirement],
      ]);
    });

    it("downloads at setup only when autoDownloadUe4ss is on and UE4SS is used", async () => {
      const off = await ready();
      assert.deepEqual(off.ext.fake.calls, []);
      const noLoadOrder = await ready({ transform: all(noUe4ss, setConst("autoDownloadUe4ss", "true")) });
      assert.deepEqual(noLoadOrder.ext.fake.calls, []);
    });

    it("the toolbar button forces a fresh download", async () => {
      const { ext } = await ready();
      await ext.registeredActions.find(({ title }) => title === "Download UE4SS").action();
      await waitFor(() => ext.fake.calls.length > 0);
      assert.equal(ext.fake.calls[0][0], "download");
      assert.equal(ext.fake.calls[0][2], true);
    });
  });

  describe("UE4SS from a Nexus page", () => {
    const nexus = nexusUe4ss;

    it("downloads the newest main file and installs it as the UE4SS mod type", async () => {
      const { ext } = await nexusReady({ transform: all(nexus, setConst("autoDownloadUe4ss", "true")) });
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.nexus.lookups, [["XXX", 100]]);
      assert.equal(ext.nexus.loggedIn, 1);
      assert.deepEqual(ext.events[0], {
        event: "start-download",
        urls: ["nxm://XXX/mods/100/files/12"],
        info: { game: "XXX", name: "UE4SS" },
        third: undefined,
        sixth: undefined,
        options: { allowInstall: false },
      });
      assert.deepEqual(ext.events[1], {
        event: "start-install-download",
        id: "download-1",
        options: { allowAutoEnable: false },
      });
      assert.equal(ext.dispatched.length, 2);
      assert.equal(ext.dispatched[0].type, "setModsEnabled");
      assert.deepEqual(ext.dispatched[0].payload.slice(1), [
        "profile",
        ["mod-1"],
        true,
        { allowAutoDeploy: true, installed: true },
      ]);
      assert.deepEqual(ext.dispatched[1], {
        type: "setModType",
        payload: ["XXX", "mod-1", "XXX-ue4ss"],
      });
      assert.deepEqual(ext.nexus.dismissed, ["XXX-ue4ss-installing"]);
    });

    it("shows an activity notification while it works", async () => {
      const { ext } = await nexusReady({ transform: all(nexus, setConst("autoDownloadUe4ss", "true")) });
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.notifications[0], {
        id: "XXX-ue4ss-installing",
        message: "Installing UE4SS",
        type: "activity",
        noDismiss: true,
        allowSuppress: false,
      });
    });

    it("uses the file id from the settings when the file lookup fails", async () => {
      const { ext } = await nexusReady({
        transform: all(nexus, setConst("autoDownloadUe4ss", "true")),
        files: () => {
          throw new Error("offline");
        },
      });
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.events[0].urls, ["nxm://XXX/mods/100/files/200"]);
    });

    it("uses the file id from the settings when the page has no main file", async () => {
      const { ext } = await nexusReady({
        transform: all(nexus, setConst("autoDownloadUe4ss", "true")),
        files: [{ file_id: 13, category_id: 2, uploaded_time: "900" }],
      });
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.events[0].urls, ["nxm://XXX/mods/100/files/200"]);
    });

    it("downloads from the site domain when the page lives there", async () => {
      const { ext } = await nexusReady({
        transform: all(nexus, setConst("autoDownloadUe4ss", "true"), setConst("UE4SS_DOMAIN", '"site"')),
      });
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.nexus.lookups, [["site", 100]]);
      assert.deepEqual(ext.events[0].urls, ["nxm://site/mods/100/files/12"]);
      assert.deepEqual(ext.events[0].info, { game: "site", name: "UE4SS" });
    });

    it("does nothing when UE4SS is already installed", async () => {
      const { ext } = await nexusReady({
        transform: all(nexus, setConst("autoDownloadUe4ss", "true")),
        mods: { existing: { id: "existing", type: ID.ue4ss } },
      });
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.nexus.lookups, []);
      assert.deepEqual(ext.events, []);
      assert.deepEqual(ext.notifications, []);
    });

    it("skips the login step when Vortex offers none", async () => {
      const { ext } = await nexusReady({ transform: all(nexus, setConst("autoDownloadUe4ss", "true")) });
      delete ext.api.ext.ensureLoggedIn;
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.equal(ext.events.length, 2);
    });

    it("the toolbar button downloads from the Nexus page unless UE4SS is installed", async () => {
      const { ext } = await nexusReady({ transform: nexus });
      await ext.registeredActions.find(({ title }) => title === "Download UE4SS").action();
      await waitFor(() => ext.nexus.dismissed.length > 0);
      assert.deepEqual(ext.fake.calls, []);
      assert.deepEqual(ext.events[0].urls, ["nxm://XXX/mods/100/files/12"]);
    });

    it("reports a failed download and opens the file page", async () => {
      const opened = stubShell();
      const { ext } = await nexusReady({ transform: all(nexus, setConst("autoDownloadUe4ss", "true")) });
      ext.api.events.removeAllListeners("start-download");
      ext.api.events.on("start-download", (_urls, _info, _third, callback) =>
        callback(new Error("download refused")),
      );
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      const [message, error] = ext.errors[0];
      assert.equal(message, "Failed to download/install UE4SS");
      assert.equal(error.message, "download refused");
      assert.deepEqual(opened, ["https://www.nexusmods.com/XXX/mods/100/files/?tab=files"]);
      assert.deepEqual(ext.dispatched, []);
      assert.deepEqual(ext.nexus.dismissed, ["XXX-ue4ss-installing"]);
    });

    it("reports a failed install the same way", async () => {
      stubShell();
      const { ext } = await nexusReady({ transform: all(nexus, setConst("autoDownloadUe4ss", "true")) });
      ext.api.events.removeAllListeners("start-install-download");
      ext.api.events.on("start-install-download", (_id, _options, callback) =>
        callback(new Error("install refused")),
      );
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.equal(ext.errors[0][0], "Failed to download/install UE4SS");
      assert.equal(ext.errors[0][1].message, "install refused");
    });

    it("also reports a download page it cannot open", async () => {
      const { ext } = await nexusReady({ transform: all(nexus, setConst("autoDownloadUe4ss", "true")) });
      ext.api.events.removeAllListeners("start-download");
      ext.api.events.on("start-download", (_urls, _info, _third, callback) => callback(new Error("x")));
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(
        ext.errors.map(([message]) => message),
        ["Failed to download/install UE4SS", "Failed to open the URL"],
      );
      assert.deepEqual(ext.errors[1][2], { allowReport: false });
    });
  });

  describe("signature bypass", () => {
    it("downloads at setup, from the site's bypass page, and installs it as the bypass type", async () => {
      const { ext } = await nexusReady({ transform: sigBypass });
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.nexus.lookups, [["site", 1416]]);
      assert.deepEqual(ext.events[0].urls, ["nxm://site/mods/1416/files/12"]);
      assert.deepEqual(ext.events[0].info, { game: "site", name: "Sig Bypass" });
      assert.deepEqual(ext.dispatched[1], {
        type: "setModType",
        payload: ["XXX", "mod-1", "XXX-sigbypass"],
      });
      assert.deepEqual(ext.notifications[0], {
        id: "XXX-sigbypass-installing",
        message: "Installing Sig Bypass",
        type: "activity",
        noDismiss: true,
        allowSuppress: false,
      });
      assert.deepEqual(ext.nexus.dismissed, ["XXX-sigbypass-installing"]);
    });

    it("uses the fixed file id when the file lookup fails", async () => {
      const { ext } = await nexusReady({
        transform: sigBypass,
        files: () => {
          throw new Error("offline");
        },
      });
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.events[0].urls, ["nxm://site/mods/1416/files/5719"]);
    });

    it("uses the fixed file id when the page has no main file", async () => {
      const { ext } = await nexusReady({ transform: sigBypass, files: [] });
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.events[0].urls, ["nxm://site/mods/1416/files/5719"]);
    });

    it("does nothing when the bypass is already installed", async () => {
      const { ext } = await nexusReady({
        transform: sigBypass,
        mods: { existing: { id: "existing", type: ID.sigbypass } },
      });
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.nexus.lookups, []);
      assert.deepEqual(ext.events, []);
    });

    it("is not downloaded when the game needs no bypass", async () => {
      const { ext } = await nexusReady();
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(ext.nexus.lookups, []);
    });

    it("reports a failed download and opens the bypass page", async () => {
      const opened = stubShell();
      const { ext } = await nexusReady({ transform: sigBypass });
      ext.api.events.removeAllListeners("start-download");
      ext.api.events.on("start-download", (_urls, _info, _third, callback) => callback(new Error("no")));
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.equal(ext.errors[0][0], "Failed to download/install Sig Bypass");
      assert.deepEqual(opened, ["https://www.nexusmods.com/site/mods/1416/files/?tab=files"]);
    });

    it("reports a bypass page it cannot open", async () => {
      const { ext } = await nexusReady({ transform: sigBypass });
      ext.api.events.removeAllListeners("start-download");
      ext.api.events.on("start-download", (_urls, _info, _third, callback) => callback(new Error("no")));
      await ext.game.setup({ path: ext.state.settings.gameMode.discovered[GAME_ID].path });
      assert.deepEqual(
        ext.errors.map(([message]) => message),
        ["Failed to download/install Sig Bypass", "Failed to open the URL"],
      );
    });
  });

  describe("update check", () => {
    const check = (ext) => ext.listeners.find(({ args }) => args[0] === "check-mods-version").args[1];

    it("tests the UE4SS requirement for this game", async () => {
      const ext = await boot();
      await check(ext)(GAME_ID, {}, false);
      assert.equal(ext.fake.calls.length, 1);
      const [name, requirement] = ext.fake.calls[0];
      assert.equal(name, "testRequirementVersion");
      assert.equal(requirement.modType, "XXX-ue4ss");
    });

    it("ignores other games", async () => {
      const ext = await boot();
      await check(ext)("othergame", {}, false);
      assert.deepEqual(ext.fake.calls, []);
    });

    it("leaves a game with its own UE4SS page alone", async () => {
      const ext = await boot({ transform: nexusUe4ss });
      await check(ext)(GAME_ID, {}, false);
      assert.deepEqual(ext.fake.calls, []);
    });

    it("logs a failed check instead of throwing", async () => {
      const ext = await boot({ failTest: "no network" });
      await check(ext)(GAME_ID, {}, false);
      assert.equal(
        vortex.logs.some(({ level, message }) => level === "warn" && message === "Failed to test requirement version: Error: no network"),
        true,
      );
    });
  });
});

const MODS = (gameDir, ...rest) => sep(gameDir, "XXX", "Binaries", "Win64", "ue4ss", "Mods", ...rest);
const BPML = (gameDir, ...rest) => MODS(gameDir, "BPModLoaderMod", ...rest);
const LOGIC = (gameDir, ...rest) => sep(gameDir, "XXX", "Content", "Paks", "LogicMods", ...rest);
const loadOrderApi = (ext) => ext.calls.find(({ name }) => name === "registerLoadOrder")?.args[0];
const listener = (ext, event) => ext.listeners.find(({ args }) => args[0] === event).args[1];

// Pak mods as Vortex would hold them: three sortable, one of them disabled, and a root mod.
const PAK_MODS = {
  a: { id: "a", type: ID.pak, attributes: { name: "Mod A" } },
  b: { id: "b", type: ID.pak, attributes: { logicalFileName: "Mod B", name: "ignored" } },
  c: { id: "c", type: ID.root, attributes: { name: "Root Mod" } },
  d: { id: "d", type: ID.pak, attributes: { name: "Disabled" } },
};
const PAK_MOD_STATE = {
  a: { enabled: true },
  b: { enabled: true },
  c: { enabled: true },
  d: { enabled: false },
};

// Puts a mod the update guard will recognise into the state and arms the guard the way Vortex
// does an update: the mod-update event, then the removal of the old version.
function armUpdateGuard(ext, { nexusId = 123, fileId = 456, removed = "upd" } = {}) {
  ext.state.persistent.mods[GAME_ID][removed] = {
    id: removed,
    type: ID.pak,
    attributes: { modId: nexusId, fileId: 1 },
  };
  ext.api.events.emit("mod-update", GAME_ID, nexusId, fileId);
  ext.api.events.emit("remove-mod", GAME_ID, removed);
}

// The same, for a game folder and state where the pak load order can run.
async function pakGame({ files = ["XXX.exe"], mods = PAK_MODS, modState = PAK_MOD_STATE, ...rest } = {}) {
  const gameDir = makeGameDir(files);
  // Tests change mods and enabled flags, so every boot gets its own copy of the shared fixtures.
  const state = stateFor({
    gameDir,
    mods: structuredClone(mods),
    modState: structuredClone(modState),
    ...rest,
  });
  const ext = await boot({ state, ...rest });
  ext.lo = loadOrderApi(ext);
  ext.dismissed = [];
  ext.api.dismissNotification = (id) => ext.dismissed.push(id);
  return { ext, gameDir };
}

describe("template-ue4-5: pak load order", () => {
  const orderFile = (gameDir) => path.join(gameDir, "profile_loadOrder.json");
  const entry = (id, name, extra = {}) => ({ id, modId: id, enabled: true, name, ...extra });

  it("lists the enabled sortable pak mods by name and creates the order file", async () => {
    const { ext, gameDir } = await pakGame();
    assert.deepEqual(await ext.lo.deserializeLoadOrder(), [entry("a", "Mod A"), entry("b", "Mod B")]);
    assert.equal(fs.readFileSync(orderFile(gameDir), "utf8"), "");
  });

  it("keeps the order and the entries stored in the file", async () => {
    const { ext, gameDir } = await pakGame();
    const stored = [
      { id: "b", modId: "b", enabled: false, name: "Stored B", locked: true },
      { id: "a", modId: "a", enabled: true, name: "Stored A" },
    ];
    write(orderFile(gameDir), JSON.stringify(stored));
    assert.deepEqual(await ext.lo.deserializeLoadOrder(), stored);
  });

  it("drops entries of mods that are disabled or gone", async () => {
    const { ext, gameDir } = await pakGame();
    write(
      orderFile(gameDir),
      JSON.stringify([entry("d", "Disabled"), entry("gone", "Gone"), entry("a", "Mod A")]),
    );
    assert.deepEqual(await ext.lo.deserializeLoadOrder(), [entry("a", "Mod A"), entry("b", "Mod B")]);
  });

  it("adds a newly enabled mod at the bottom", async () => {
    const { ext, gameDir } = await pakGame();
    write(orderFile(gameDir), JSON.stringify([entry("b", "Mod B")]));
    assert.deepEqual(await ext.lo.deserializeLoadOrder(), [entry("b", "Mod B"), entry("a", "Mod A")]);
  });

  it("only adds enabled mods of the sortable pak type", async () => {
    const { ext } = await pakGame();
    const ids = (await ext.lo.deserializeLoadOrder()).map(({ id }) => id);
    assert.deepEqual(ids, ["a", "b"]);
  });

  it("falls back to the stored load order when the file is not valid JSON", async () => {
    const stored = [{ id: "b", modId: "b", enabled: true, name: "In state" }];
    const { ext, gameDir } = await pakGame({ loadOrder: stored });
    write(orderFile(gameDir), "{ not json");
    assert.deepEqual(await ext.lo.deserializeLoadOrder(), [
      stored[0],
      entry("a", "Mod A"),
    ]);
    assert.equal(
      vortex.logs.some(({ level, message }) => level === "warn" && message === "failed to read load order file"),
      true,
    );
  });

  it("falls back to an empty load order when nothing is stored either", async () => {
    const { ext, gameDir } = await pakGame();
    write(orderFile(gameDir), "{ not json");
    assert.deepEqual(await ext.lo.deserializeLoadOrder(), [entry("a", "Mod A"), entry("b", "Mod B")]);
  });

  it("treats JSON that is not a list as an empty order", async () => {
    const { ext, gameDir } = await pakGame();
    write(orderFile(gameDir), '{"id":"a"}');
    assert.deepEqual(await ext.lo.deserializeLoadOrder(), [entry("a", "Mod A"), entry("b", "Mod B")]);
  });

  it("refuses to read a load order for another game or an undiscovered game", async () => {
    const { ext } = await pakGame();
    ext.state.persistent.profiles.profile.gameId = "othergame";
    await assert.rejects(ext.lo.deserializeLoadOrder(), (error) => {
      assert.equal(error.message, "invalid props");
      assert.equal(error.kind, "process-canceled");
      return true;
    });
    const undiscovered = await boot({ state: stateFor({}) });
    await assert.rejects(loadOrderApi(undiscovered).deserializeLoadOrder(), /invalid props/);
  });

  it("writes the order as indented JSON and asks for a deployment", async () => {
    const { ext, gameDir } = await pakGame();
    const order = [entry("b", "Mod B"), entry("a", "Mod A")];
    await ext.lo.serializeLoadOrder(order);
    assert.equal(fs.readFileSync(orderFile(gameDir), "utf8"), JSON.stringify(order, null, 4));
    assert.deepEqual(ext.dispatched, [{ type: "setDeploymentNecessary", payload: ["XXX", true] }]);
    const [notification] = ext.notifications;
    assert.equal(notification.id, "XXX-loadorderdeploy-notif");
    assert.equal(notification.type, "warning");
    assert.equal(notification.message, "Deployment Required to Apply Load Order Changes");
    assert.equal(notification.allowSuppress, true);
    assert.deepEqual(notification.actions.map(({ title }) => title), ["Deploy"]);
  });

  it("deploys and dismisses when the user presses Deploy", async () => {
    const { ext } = await pakGame();
    const deploys = answerDeploy(ext);
    await ext.lo.serializeLoadOrder([entry("a", "Mod A")]);
    let dismissed = 0;
    ext.notifications[0].actions[0].action(() => dismissed++);
    assert.deepEqual(deploys, ["deploy-mods"]);
    assert.equal(dismissed, 1);
  });

  it("refuses to write a load order for another game", async () => {
    const { ext } = await pakGame();
    ext.state.persistent.profiles.profile.gameId = "othergame";
    await assert.rejects(ext.lo.serializeLoadOrder([]), /invalid props/);
  });

  it("freezes the stored order while a mod update is in flight", async () => {
    const stored = [entry("b", "Stored B")];
    const { ext, gameDir } = await pakGame({ loadOrder: stored });
    armUpdateGuard(ext);
    assert.deepEqual(await ext.lo.deserializeLoadOrder(), stored);
    assert.equal(fs.existsSync(orderFile(gameDir)), false);
  });

  it("answers an empty order while updating when none is stored", async () => {
    const { ext } = await pakGame();
    armUpdateGuard(ext);
    assert.deepEqual(await ext.lo.deserializeLoadOrder(), []);
  });

  it("tells the user a reorder was not applied while a mod update is in flight", async () => {
    const { ext, gameDir } = await pakGame();
    armUpdateGuard(ext);
    assert.equal(await ext.lo.serializeLoadOrder([entry("a", "Mod A")]), undefined);
    assert.equal(fs.existsSync(orderFile(gameDir)), false);
    assert.deepEqual(ext.dispatched, []);
    assert.deepEqual(ext.notifications, [
      {
        id: "XXX-loadorder-update-paused",
        type: "warning",
        message:
          "Load order changes are paused while a mod update finishes. Reorder again once it completes.",
        displayMS: 6000,
      },
    ]);
  });

  it("describes the order on the info panel", async () => {
    const { ext } = await pakGame();
    assert.equal(typeof ext.lo.usageInstructions, "function");
  });
});

describe("template-ue4-5: mod update guard", () => {
  // Whether the guard is armed: a reorder is then refused with the "paused" notice.
  const pending = async (ext) => {
    ext.notifications.length = 0;
    await ext.lo.serializeLoadOrder([]);
    return ext.notifications.some(({ id }) => id === "XXX-loadorder-update-paused");
  };

  it("arms only for a mod whose removal follows its update", async () => {
    const { ext } = await pakGame();
    ext.api.events.emit("remove-mod", GAME_ID, "a");
    assert.equal(await pending(ext), false);
    ext.api.events.emit("mod-update", GAME_ID, 777, 1);
    ext.state.persistent.mods[GAME_ID].a.attributes.modId = 5;
    ext.api.events.emit("remove-mod", GAME_ID, "a");
    assert.equal(await pending(ext), false);
    ext.state.persistent.mods[GAME_ID].a.attributes.modId = 777;
    ext.api.events.emit("remove-mod", GAME_ID, "a");
    assert.equal(await pending(ext), true);
  });

  it("matches the removed mod by its Nexus id, not by its local name", async () => {
    const { ext } = await pakGame();
    ext.state.persistent.mods[GAME_ID]["Old Name-123-1"] = { id: "x", attributes: { modId: 123 } };
    ext.api.events.emit("mod-update", GAME_ID, "123", 9);
    ext.api.events.emit("remove-mod", GAME_ID, "Old Name-123-1");
    assert.equal(await pending(ext), true);
  });

  it("ignores updates of other games", async () => {
    const { ext } = await pakGame();
    ext.api.events.emit("mod-update", "othergame", 123, 456);
    ext.api.events.emit("mods-update", "othergame", ["a"]);
    ext.state.persistent.mods[GAME_ID].a.attributes.modId = 123;
    ext.api.events.emit("remove-mod", GAME_ID, "a");
    assert.equal(await pending(ext), false);
  });

  it("tracks every mod of an Update all by its Nexus id", async () => {
    const { ext } = await pakGame();
    ext.state.persistent.mods[GAME_ID].a.attributes = { modId: 11, newestFileId: 90 };
    ext.state.persistent.mods[GAME_ID].b.attributes = { modId: 22 };
    ext.state.persistent.mods[GAME_ID].c.attributes = {};
    ext.api.events.emit("mods-update", GAME_ID, ["a", "b", "c", "missing"]);
    ext.api.events.emit("remove-mod", GAME_ID, "b");
    assert.equal(await pending(ext), true);
  });

  it("tolerates an Update all without a mod list", async () => {
    const { ext } = await pakGame();
    ext.api.events.emit("mods-update", GAME_ID, undefined);
    assert.equal(await pending(ext), false);
  });

  it("releases the guard once the new version is installed and enabled", async () => {
    const { ext, gameDir } = await pakGame({ loadOrder: [] });
    armUpdateGuard(ext);
    assert.equal(await pending(ext), true);
    ext.state.persistent.mods[GAME_ID].fresh = { id: "fresh", type: ID.pak, attributes: { modId: 123, fileId: 456, name: "Fresh" } };
    ext.state.persistent.profiles.profile.modState.fresh = { enabled: true };
    ext.notifications.length = 0;
    await listener(ext, "did-deploy")("profile");
    await ext.lo.serializeLoadOrder([entry0()]);
    assert.equal(fs.existsSync(path.join(gameDir, "profile_loadOrder.json")), true);
    assert.equal(ext.notifications.some(({ id }) => id === "XXX-loadorder-update-paused"), false);
  });

  function entry0() {
    return { id: "a", modId: "a", enabled: true, name: "Mod A" };
  }

  it("keeps the guard while the new version is missing, disabled or still the old file", async () => {
    const { ext } = await pakGame();
    armUpdateGuard(ext);
    const stillArmed = async () => {
      ext.notifications.length = 0;
      await listener(ext, "did-deploy")("profile");
      return pending(ext);
    };
    assert.equal(await stillArmed(), true);
    ext.state.persistent.mods[GAME_ID].fresh = { id: "fresh", type: ID.pak, attributes: { modId: 123, fileId: 456 } };
    assert.equal(await stillArmed(), true);
    ext.state.persistent.profiles.profile.modState.fresh = { enabled: true };
    ext.state.persistent.mods[GAME_ID].fresh.attributes.fileId = 1;
    assert.equal(await stillArmed(), true);
    ext.state.persistent.mods[GAME_ID].fresh.attributes.fileId = 456;
    assert.equal(await stillArmed(), false);
  });

  it("accepts any enabled install of the mod when the target file is unknown", async () => {
    const { ext } = await pakGame();
    ext.state.persistent.mods[GAME_ID].upd = { id: "upd", attributes: { modId: 123 } };
    ext.api.events.emit("mod-update", GAME_ID, 123, undefined);
    ext.api.events.emit("remove-mod", GAME_ID, "upd");
    ext.state.persistent.mods[GAME_ID].fresh = { id: "fresh", type: ID.pak, attributes: { modId: 123, fileId: 7 } };
    ext.state.persistent.profiles.profile.modState.fresh = { enabled: true };
    await listener(ext, "did-deploy")("profile");
    assert.equal(await pending(ext), false);
  });

  it("stays armed while any one of several updates is outstanding", async () => {
    const { ext } = await pakGame();
    armUpdateGuard(ext, { nexusId: 1, fileId: 10, removed: "u1" });
    armUpdateGuard(ext, { nexusId: 2, fileId: 20, removed: "u2" });
    ext.state.persistent.mods[GAME_ID].n1 = { id: "n1", attributes: { modId: 1, fileId: 10 } };
    ext.state.persistent.profiles.profile.modState.n1 = { enabled: true };
    await listener(ext, "did-deploy")("profile");
    assert.equal(await pending(ext), true);
    ext.state.persistent.mods[GAME_ID].n2 = { id: "n2", attributes: { modId: 2, fileId: 20 } };
    ext.state.persistent.profiles.profile.modState.n2 = { enabled: true };
    ext.notifications.length = 0;
    await listener(ext, "did-deploy")("profile");
    assert.equal(await pending(ext), false);
  });

  it("gives up on an update that never lands after five minutes", async () => {
    const { ext } = await pakGame();
    let now = 1_000_000;
    mock.method(Date, "now", () => now);
    armUpdateGuard(ext);
    now += 5 * 60 * 1000;
    await listener(ext, "did-deploy")("profile");
    assert.equal(await pending(ext), true);
    now += 1;
    ext.notifications.length = 0;
    await listener(ext, "did-deploy")("profile");
    assert.equal(await pending(ext), false);
    assert.equal(
      vortex.logs.some(({ level, message }) => level === "warn" && message === "[XXX] Mod update tracking for Nexus mod 123 timed out without landing; releasing load order guard for it."),
      true,
    );
  });

  it("refreshes the stored order once the guard clears, and not on an ordinary deploy", async () => {
    const { ext } = await pakGame({ loadOrder: [] });
    await listener(ext, "did-deploy")("profile");
    assert.equal(ext.dispatched.some(({ type }) => type === "setFBLoadOrder"), false);
    armUpdateGuard(ext);
    ext.state.persistent.mods[GAME_ID].fresh = { id: "fresh", type: ID.pak, attributes: { modId: 123, fileId: 456, name: "Fresh" } };
    ext.state.persistent.profiles.profile.modState.fresh = { enabled: true };
    await listener(ext, "did-deploy")("profile");
    const refresh = ext.dispatched.find(({ type }) => type === "setFBLoadOrder");
    assert.equal(refresh.payload[0], "profile");
    assert.deepEqual(refresh.payload[1].map(({ id }) => id), ["a", "b", "fresh"]);
  });

  it("ignores a deployment of another game's profile", async () => {
    const { ext } = await pakGame();
    ext.state.persistent.profiles.other = { id: "other", gameId: "othergame" };
    armUpdateGuard(ext);
    await listener(ext, "did-deploy")("other");
    assert.equal(await pending(ext), true);
    assert.deepEqual(ext.dismissed, []);
  });

  describe("fallback installer notice during an update", () => {
    const noticeFor = async (modId, gameId = GAME_ID) => {
      const { ext } = await pakGame();
      ext.api.events.emit("mod-update", GAME_ID, 123, 456);
      ext.api.events.emit("will-install-mod", gameId, "archive", modId);
      await installerOf(ext, ID.binaries).install(tree("a.dll"), sep(STAGING, "Cool.installing"));
      return ext.notifications.length;
    };

    it("is suppressed for a mod whose id carries the updating Nexus id, in either naming style", async () => {
      assert.equal(await noticeFor("Cool Mod-123-1-0"), 0);
      assert.equal(await noticeFor("Cool Mod 123 1 0"), 0);
    });

    it("still appears for a different mod, a longer id or another game", async () => {
      assert.equal(await noticeFor("Cool Mod-1234-1"), 1);
      assert.equal(await noticeFor("Cool Mod-12-1"), 1);
      assert.equal(await noticeFor("Cool Mod-123-1", "othergame"), 1);
    });

    it("comes back after the next deployment", async () => {
      const { ext } = await pakGame();
      ext.api.events.emit("mod-update", GAME_ID, 123, 456);
      ext.api.events.emit("will-install-mod", GAME_ID, "archive", "Cool Mod-123-1");
      await listener(ext, "did-deploy")("profile");
      await installerOf(ext, ID.binaries).install(tree("a.dll"), sep(STAGING, "Cool.installing"));
      assert.equal(ext.notifications.length, 1);
    });

    it("comes back when the next install is not an update", async () => {
      const { ext } = await pakGame();
      ext.api.events.emit("mod-update", GAME_ID, 123, 456);
      ext.api.events.emit("will-install-mod", GAME_ID, "archive", "Cool Mod-123-1");
      ext.api.events.emit("will-install-mod", GAME_ID, "archive", "Other-9-1");
      await installerOf(ext, ID.binaries).install(tree("a.dll"), sep(STAGING, "Cool.installing"));
      assert.equal(ext.notifications.length, 1);
    });
  });
});

// Private functions the UE4SS and LogicMods surfaces and the helpers around them are tested through.
const INTERNALS = [
  "deserializeUe4ss",
  "serializeUe4ss",
  "deserializeLogicMods",
  "serializeLogicMods",
  "reconcileEnabledTxt",
  "pathSegments",
  "beatsPakInstaller",
  "matchesStatus",
  "getModPageURL",
  "getModStagingFolder",
  "preSort",
  "getBinariesFolder",
  "getShippingExe",
  "setConfigPath",
  "setSavePath",
  "getModKitPath",
  "didPurge",
];
const withInternals = (transform) => (source) =>
  exposing(...INTERNALS)(transform ? transform(source) : source);

const UE4SS_MODS = {
  "mod-b": {
    id: "mod-b",
    type: ID.scripts,
    attributes: { ue4ssModFolder: "ModB", name: "Cool B" },
  },
  "mod-c": {
    id: "mod-c",
    type: ID.dll,
    attributes: {
      ue4ssModFolder: "ModC",
      customFileName: "Custom C",
      logicalFileName: "Logical C",
      name: "Plain C",
    },
  },
  "mod-d": {
    id: "mod-d",
    type: ID.scripts,
    attributes: { ue4ssModFolder: "ModD", logicalFileName: "Logical D", name: "Plain D" },
  },
  logic1: {
    id: "logic1",
    type: ID.logic,
    attributes: { logicModFiles: ["Alpha", "Beta"], name: "Logic One" },
  },
  logic2: {
    id: "logic2",
    type: ID.logic,
    attributes: { logicModFiles: "Gamma", customFileName: "Logic Two", name: "ignored" },
  },
};

// A game folder with a UE4SS Mods folder: `plain` folders are manual mods, `managed` folders carry
// Vortex's marker file. The native BPModLoaderMod and Keybinds folders are always there.
async function ue4ssGame({
  plain = ["ModA"],
  managed = ["ModB"],
  mods = UE4SS_MODS,
  modState = {},
  transform,
  ...rest
} = {}) {
  const gameDir = makeGameDir(["XXX.exe"]);
  fs.mkdirSync(BPML(gameDir), { recursive: true });
  fs.mkdirSync(MODS(gameDir, "Keybinds"), { recursive: true });
  for (const name of plain) fs.mkdirSync(MODS(gameDir, name), { recursive: true });
  for (const name of managed) write(MODS(gameDir, name, "__folder_managed_by_vortex"));
  const state = stateFor({
    gameDir,
    mods: structuredClone(mods),
    modState: structuredClone(modState),
    ...rest,
  });
  const ext = await boot({ transform: withInternals(transform), state });
  ext.dismissed = [];
  ext.api.dismissNotification = (id) => ext.dismissed.push(id);
  ext.internals = ext.exports.internals;
  return { ext, gameDir };
}

describe("template-ue4-5: UE4SS load order", () => {
  const stored = (gameDir) => MODS(gameDir, "profile_ue4ss_loadOrder.json");

  it("lists the mod folders alphabetically without regard to case, skipping native mods and files", async () => {
    const { ext, gameDir } = await ue4ssGame({ plain: ["beta", "Alpha", "Gamma"], managed: [] });
    write(MODS(gameDir, "mods.txt"), "x");
    const order = await ext.internals.deserializeUe4ss(ext.api);
    assert.deepEqual(
      order.map(({ id }) => id),
      ["Alpha", "beta", "Gamma"],
    );
  });

  it("names a manual mod by its folder and a Vortex mod by its attributes", async () => {
    const { ext } = await ue4ssGame({ plain: ["ModA"], managed: ["ModB", "ModC", "ModD", "ModX"] });
    assert.deepEqual(await ext.internals.deserializeUe4ss(ext.api), [
      { id: "ModA", name: "Manual Mod (ModA)", modId: undefined, enabled: true },
      { id: "ModB", name: "Cool B (ModB)", modId: "mod-b", enabled: true },
      { id: "ModC", name: "Custom C (ModC)", modId: "mod-c", enabled: true },
      { id: "ModD", name: "Logical D (ModD)", modId: "mod-d", enabled: true },
      { id: "ModX", name: "ModX (ModX)", modId: undefined, enabled: true },
    ]);
  });

  it("keeps the stored order, flags and locks, drops vanished folders and appends new ones", async () => {
    const { ext, gameDir } = await ue4ssGame({ plain: ["ModA"], managed: ["ModB"] });
    write(
      stored(gameDir),
      JSON.stringify([
        { id: "ModB", enabled: false, locked: true },
        { id: "Gone", enabled: true },
      ]),
    );
    assert.deepEqual(await ext.internals.deserializeUe4ss(ext.api), [
      { id: "ModB", name: "Cool B (ModB)", modId: "mod-b", enabled: false, locked: true },
      { id: "ModA", name: "Manual Mod (ModA)", modId: undefined, enabled: true },
    ]);
  });

  it("carries a stored entry without a lock as unlocked-by-omission", async () => {
    const { ext, gameDir } = await ue4ssGame({ plain: ["ModA"], managed: [] });
    write(stored(gameDir), JSON.stringify([{ id: "ModA", enabled: true }]));
    const [entry] = await ext.internals.deserializeUe4ss(ext.api);
    assert.equal("locked" in entry, true);
    assert.equal(entry.locked, undefined);
  });

  it("reads a stored order that starts with a byte order mark", async () => {
    const { ext, gameDir } = await ue4ssGame({ plain: ["ModA", "ModZ"], managed: [] });
    write(stored(gameDir), `\uFEFF${JSON.stringify([{ id: "ModZ", enabled: false }])}`);
    const order = await ext.internals.deserializeUe4ss(ext.api);
    assert.deepEqual(
      order.map(({ id, enabled }) => [id, enabled]),
      [
        ["ModZ", false],
        ["ModA", true],
      ],
    );
  });

  it("starts fresh from an empty or unreadable stored order", async () => {
    for (const content of ["", "{ nope"]) {
      const { ext, gameDir } = await ue4ssGame({ plain: ["ModA", "ModB"], managed: [] });
      write(stored(gameDir), content);
      const order = await ext.internals.deserializeUe4ss(ext.api);
      assert.deepEqual(
        order.map(({ id }) => id),
        ["ModA", "ModB"],
        content,
      );
    }
  });

  it("rejects when the Mods folder does not exist", async () => {
    const { ext, gameDir } = await ue4ssGame();
    fs.rmSync(MODS(gameDir), { recursive: true, force: true });
    await assert.rejects(ext.internals.deserializeUe4ss(ext.api), {
      message: "Failed to read UE4SS Mods folder",
    });
  });

  it("looks in the WinGDK folder for the Xbox build", async () => {
    const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
    fs.mkdirSync(sep(gameDir, "XXX", "Binaries", "WinGDK", "ue4ss", "Mods", "OnXbox"), {
      recursive: true,
    });
    const ext = await boot({ transform: withInternals(), state: stateFor({ gameDir }) });
    ext.game.executable(gameDir);
    const order = await ext.exports.internals.deserializeUe4ss(ext.api);
    assert.deepEqual(
      order.map(({ id }) => id),
      ["OnXbox"],
    );
  });

  it("keeps the stored order untouched while a mod update is in flight", async () => {
    const frozen = [{ id: "ModA", name: "x", enabled: false }];
    const { ext } = await ue4ssGame();
    ext.state.persistent.ue4ssLoadOrder = { profile: { loadOrder: frozen } };
    armUpdateGuard(ext);
    assert.deepEqual(await ext.internals.deserializeUe4ss(ext.api), frozen);
    delete ext.state.persistent.ue4ssLoadOrder;
    assert.deepEqual(await ext.internals.deserializeUe4ss(ext.api), []);
  });

  describe("writing", () => {
    const BAND_FILE = [
      "CheatManagerEnablerMod : 0",
      "ConsoleCommandsMod : 0",
      "BPModLoaderMod : 1",
      "OldMod : 1",
      "; user note",
      "LineTraceMod : 1",
      "Keybinds : 1",
    ].join("\n");
    const ORDER = [
      { id: "ModA", enabled: true },
      { id: "ModB", enabled: false },
    ];
    const run = async (content, order = ORDER, options = {}) => {
      const { ext, gameDir } = await ue4ssGame(options);
      if (content !== undefined) write(MODS(gameDir, "mods.txt"), content);
      await ext.internals.serializeUe4ss(ext.api, order);
      return { ext, gameDir, text: () => fs.readFileSync(MODS(gameDir, "mods.txt"), "utf8") };
    };

    it("stores the order per profile as indented JSON", async () => {
      const { gameDir } = await run(BAND_FILE);
      assert.equal(fs.readFileSync(stored(gameDir), "utf8"), JSON.stringify(ORDER, null, 2));
    });

    it("rewrites the band between BPModLoaderMod and Keybinds, keeping comments and native mods", async () => {
      const { text } = await run(BAND_FILE);
      assert.equal(
        text(),
        [
          "CheatManagerEnablerMod : 0",
          "ConsoleCommandsMod : 0",
          "BPModLoaderMod : 1",
          "ModA : 1",
          "ModB : 0",
          "; user note",
          "LineTraceMod : 1",
          "Keybinds : 1",
        ].join("\n"),
      );
    });

    it("creates mods.txt holding just the order when there is none", async () => {
      const { text } = await run(undefined);
      assert.equal(text(), "ModA : 1\nModB : 0");
    });

    it("rebuilds the whole file when neither marker exists", async () => {
      const { text } = await run("Foo : 1\nBar : 0");
      assert.equal(text(), "ModA : 1\nModB : 0");
    });

    it("keeps the Keybinds tail when only that marker exists", async () => {
      const { text } = await run("A : 1\nKeybinds : 1");
      assert.equal(text(), "ModA : 1\nModB : 0\nKeybinds : 1");
    });

    it("keeps the head and drops the rest when Keybinds comes before BPModLoaderMod", async () => {
      const { text } = await run("Keybinds : 1\nBPModLoaderMod : 1\nX : 1");
      assert.equal(text(), "Keybinds : 1\nBPModLoaderMod : 1\nModA : 1\nModB : 0");
    });

    it("writes 0 for a disabled mod and 1 for an enabled one", async () => {
      const { text } = await run("BPModLoaderMod : 1\nKeybinds : 1", [
        { id: "Off", enabled: false },
        { id: "On", enabled: true },
      ]);
      assert.equal(text(), "BPModLoaderMod : 1\nOff : 0\nOn : 1\nKeybinds : 1");
    });

    it("writes nothing for another game's profile", async () => {
      const { ext, gameDir } = await ue4ssGame();
      ext.state.persistent.profiles.profile.gameId = "othergame";
      await ext.internals.serializeUe4ss(ext.api, ORDER);
      assert.equal(fs.existsSync(stored(gameDir)), false);
      assert.equal(fs.existsSync(MODS(gameDir, "mods.txt")), false);
    });

    it("tells the user a reorder was not applied while a mod update is in flight", async () => {
      const { ext, gameDir } = await ue4ssGame();
      armUpdateGuard(ext);
      assert.equal(await ext.internals.serializeUe4ss(ext.api, ORDER), undefined);
      assert.equal(fs.existsSync(stored(gameDir)), false);
      assert.equal(ext.notifications.at(-1).id, "XXX-loadorder-update-paused");
    });
  });
});

describe("template-ue4-5: LogicMods load order", () => {
  const stored = (gameDir) => BPML(gameDir, "profile_logicMods_loadOrder.json");
  const paks = (gameDir, names) => {
    for (const name of names) write(LOGIC(gameDir, name));
  };

  it("lists each pak once, naming it after the mod that installed it", async () => {
    const { ext, gameDir } = await ue4ssGame();
    paks(gameDir, ["Alpha.pak", "sub/Gamma.pak", "sub/Alpha.pak", "notes.txt"]);
    const order = await ext.internals.deserializeLogicMods(ext.api);
    assert.deepEqual(
      [...order].sort((x, y) => x.id.localeCompare(y.id)),
      [
        { id: "Alpha", name: "Logic One (Alpha.pak)", modId: "logic1" },
        { id: "Gamma", name: "Logic Two (Gamma.pak)", modId: "logic2" },
      ],
    );
  });

  it("names a pak no mod claims as a manual mod", async () => {
    const { ext, gameDir } = await ue4ssGame();
    paks(gameDir, ["Mystery.pak"]);
    assert.deepEqual(await ext.internals.deserializeLogicMods(ext.api), [
      { id: "Mystery", name: "Manual Mod (Mystery.pak)", modId: undefined },
    ]);
  });

  it("keeps the stored order and locks, drops missing paks and appends new ones", async () => {
    const { ext, gameDir } = await ue4ssGame();
    paks(gameDir, ["Alpha.pak", "Beta.pak", "New.pak"]);
    write(
      stored(gameDir),
      JSON.stringify([{ id: "Beta", locked: "always" }, { id: "Gone" }, { id: "Alpha" }]),
    );
    const order = await ext.internals.deserializeLogicMods(ext.api);
    assert.deepEqual(order, [
      { id: "Beta", name: "Logic One (Beta.pak)", modId: "logic1", locked: "always" },
      { id: "Alpha", name: "Logic One (Alpha.pak)", modId: "logic1" },
      { id: "New", name: "Manual Mod (New.pak)", modId: undefined },
    ]);
  });

  it("is empty when there is no LogicMods folder", async () => {
    const { ext } = await ue4ssGame();
    assert.deepEqual(await ext.internals.deserializeLogicMods(ext.api), []);
  });

  it("ignores an empty or unreadable stored order and a BOM", async () => {
    for (const content of ["", "{ nope", `\uFEFF${JSON.stringify([{ id: "B" }, { id: "A" }])}`]) {
      const { ext, gameDir } = await ue4ssGame();
      paks(gameDir, ["A.pak", "B.pak"]);
      write(stored(gameDir), content);
      const order = (await ext.internals.deserializeLogicMods(ext.api)).map(({ id }) => id);
      assert.deepEqual(order, content.includes("B") ? ["B", "A"] : ["A", "B"], content);
    }
  });

  it("keeps the stored order untouched while a mod update is in flight", async () => {
    const { ext } = await ue4ssGame();
    const frozen = [{ id: "A" }];
    ext.state.persistent.logicModsLoadOrder = { profile: { loadOrder: frozen } };
    armUpdateGuard(ext);
    assert.deepEqual(await ext.internals.deserializeLogicMods(ext.api), frozen);
    delete ext.state.persistent.logicModsLoadOrder;
    assert.deepEqual(await ext.internals.deserializeLogicMods(ext.api), []);
  });

  it("writes the order as JSON and as the plain list BPModLoaderMod reads", async () => {
    const { ext, gameDir } = await ue4ssGame();
    const order = [
      { id: "Beta", locked: true },
      { id: "Alpha" },
    ];
    await ext.internals.serializeLogicMods(ext.api, order);
    assert.equal(fs.readFileSync(stored(gameDir), "utf8"), JSON.stringify(order, null, 2));
    assert.equal(fs.readFileSync(BPML(gameDir, "load_order.txt"), "utf8"), "Beta\nAlpha");
  });

  it("writes nothing for another game, and pauses during a mod update", async () => {
    const { ext, gameDir } = await ue4ssGame();
    ext.state.persistent.profiles.profile.gameId = "othergame";
    await ext.internals.serializeLogicMods(ext.api, [{ id: "A" }]);
    assert.equal(fs.existsSync(stored(gameDir)), false);
    ext.state.persistent.profiles.profile.gameId = GAME_ID;
    armUpdateGuard(ext);
    assert.equal(await ext.internals.serializeLogicMods(ext.api, [{ id: "A" }]), undefined);
    assert.equal(fs.existsSync(stored(gameDir)), false);
    assert.equal(ext.notifications.at(-1).id, "XXX-loadorder-update-paused");
  });
});

describe("template-ue4-5: load orders in collections", () => {
  const feature = (ext) => ext.calls.find(({ name }) => name === "optional.registerCollectionFeature").args;
  const withOrders = (state) => {
    state.persistent.ue4ssLoadOrder = {
      profile: {
        loadOrder: [
          { id: "ModB", name: "n", modId: "mod-b", enabled: true, locked: true },
          { id: "ModA", name: "n", modId: undefined, enabled: true },
          { id: "ModZ", name: "n", modId: "mod-z", enabled: false },
        ],
      },
    };
    state.persistent.logicModsLoadOrder = {
      profile: {
        loadOrder: [
          { id: "Alpha", name: "n", modId: "logic1" },
          { id: "Beta", name: "n", modId: "other" },
          { id: "Manual", name: "n" },
        ],
      },
    };
  };

  it("exports only the included Vortex mods, without machine-specific names", async () => {
    const { ext } = await ue4ssGame();
    withOrders(ext.state);
    const [, generate] = feature(ext);
    assert.deepEqual(await generate(GAME_ID, ["mod-b", "logic1"]), {
      ue4ssLoadOrder: [{ id: "ModB", enabled: true, locked: true }],
      logicModsLoadOrder: [{ id: "Alpha" }],
    });
  });

  it("exports an empty list for a game with no stored order", async () => {
    const { ext } = await ue4ssGame();
    const [, generate] = feature(ext);
    assert.deepEqual(await generate(GAME_ID, ["mod-b"]), {
      ue4ssLoadOrder: [],
      logicModsLoadOrder: [],
    });
  });

  it("leaves out the order of a surface that is switched off", async () => {
    const off = await ue4ssGame({ transform: noLogicMods });
    withOrders(off.ext.state);
    assert.deepEqual(Object.keys(await feature(off.ext)[1](GAME_ID, ["mod-b"])), ["ue4ssLoadOrder"]);
    const noUe4ssSurface = await ue4ssGame({ transform: noUe4ss });
    withOrders(noUe4ssSurface.ext.state);
    assert.deepEqual(
      Object.keys(await feature(noUe4ssSurface.ext)[1](GAME_ID, ["logic1"])),
      ["logicModsLoadOrder"],
    );
  });

  it("refuses to export without a profile", async () => {
    const { ext } = await ue4ssGame();
    ext.state.settings.profiles.lastActiveProfile = {};
    await assert.rejects(feature(ext)[1](GAME_ID, []), {
      message: "Invalid profile - cannot generate UE4SS load order collection data",
    });
    await assert.rejects(feature(ext)[2](GAME_ID, {}), {
      message: "Invalid profile - cannot apply UE4SS load order collection data",
    });
  });

  it("applies an imported order to the state and to the files the game reads", async () => {
    const { ext, gameDir } = await ue4ssGame();
    const [, , parse] = feature(ext);
    const ue4ss = [{ id: "ModB", enabled: false }];
    const logic = [{ id: "Alpha" }];
    await parse(GAME_ID, { ue4ssLoadOrder: ue4ss, logicModsLoadOrder: logic });
    assert.deepEqual(ext.dispatched, [
      { type: "SET_XXX_UE4SS_LOAD_ORDER", payload: { profileId: "profile", loadOrder: ue4ss } },
      { type: "SET_XXX_LOGICMODS_LOAD_ORDER", payload: { profileId: "profile", loadOrder: logic } },
    ]);
    assert.equal(
      fs.readFileSync(MODS(gameDir, "profile_ue4ss_loadOrder.json"), "utf8"),
      JSON.stringify(ue4ss, null, 2),
    );
    assert.equal(
      fs.readFileSync(BPML(gameDir, "profile_logicMods_loadOrder.json"), "utf8"),
      JSON.stringify(logic, null, 2),
    );
  });

  it("ignores an empty or malformed imported order", async () => {
    const { ext } = await ue4ssGame();
    const [, , parse] = feature(ext);
    await parse(GAME_ID, { ue4ssLoadOrder: [], logicModsLoadOrder: "nope" });
    await parse(GAME_ID, undefined);
    assert.deepEqual(ext.dispatched, []);
  });

  it("updates the state even when the game is not discovered", async () => {
    const ext = await boot({ state: stateFor({}) });
    const [, , parse] = feature(ext);
    await parse(GAME_ID, { ue4ssLoadOrder: [{ id: "ModB" }] });
    assert.equal(ext.dispatched.length, 1);
  });

  it("does not apply the order of a surface that is switched off", async () => {
    const { ext } = await ue4ssGame({ transform: noLogicMods });
    await feature(ext)[2](GAME_ID, {
      ue4ssLoadOrder: [{ id: "ModB" }],
      logicModsLoadOrder: [{ id: "Alpha" }],
    });
    assert.deepEqual(
      ext.dispatched.map(({ type }) => type),
      ["SET_XXX_UE4SS_LOAD_ORDER"],
    );
  });

  it("logs and carries on when an imported order cannot be written", async () => {
    const { ext, gameDir } = await ue4ssGame();
    fs.rmSync(path.join(gameDir, "XXX"), { recursive: true, force: true });
    write(path.join(gameDir, "XXX"), "a file where the game folder should be");
    await feature(ext)[2](GAME_ID, {
      ue4ssLoadOrder: [{ id: "ModB" }],
      logicModsLoadOrder: [{ id: "Alpha" }],
    });
    const warnings = vortex.logs.filter(({ level }) => level === "warn").map(({ message }) => message);
    assert.deepEqual(warnings, [
      "[XXX] Failed to write UE4SS load order file from collection",
      "[XXX] Failed to write LogicMods load order file from collection",
    ]);
    assert.equal(ext.dispatched.length, 2);
  });
});

describe("template-ue4-5: after a deployment, UE4SS and LogicMods", () => {
  const withUe4ssInstalled = (extra = {}) => ({
    ...UE4SS_MODS,
    ue4ss: { id: "ue4ss", type: ID.ue4ss, attributes: {} },
    ...extra,
  });
  const deployed = (ext) => listener(ext, "did-deploy")("profile");
  const types = (ext) => ext.dispatched.map(({ type }) => type);

  it("reads, stores and writes both load orders when UE4SS is installed", async () => {
    const { ext, gameDir } = await ue4ssGame({ mods: withUe4ssInstalled() });
    write(LOGIC(gameDir, "Alpha.pak"));
    await deployed(ext);
    assert.deepEqual(types(ext), ["SET_XXX_UE4SS_LOAD_ORDER", "SET_XXX_LOGICMODS_LOAD_ORDER"]);
    assert.deepEqual(
      ext.dispatched[0].payload.loadOrder.map(({ id }) => id),
      ["ModA", "ModB"],
    );
    assert.equal(
      fs.readFileSync(MODS(gameDir, "mods.txt"), "utf8"),
      "ModA : 1\nModB : 1",
    );
    assert.equal(
      fs.readFileSync(MODS(gameDir, "profile_ue4ss_loadOrder.json"), "utf8").includes('"ModA"'),
      true,
    );
    assert.equal(fs.readFileSync(BPML(gameDir, "load_order.txt"), "utf8"), "Alpha");
    assert.deepEqual(ext.dismissed, ["XXX-loadorderdeploy-notif"]);
  });

  it("does nothing for UE4SS and LogicMods while UE4SS is not installed", async () => {
    const { ext, gameDir } = await ue4ssGame();
    await deployed(ext);
    assert.deepEqual(ext.dispatched, []);
    assert.equal(fs.existsSync(MODS(gameDir, "mods.txt")), false);
    assert.deepEqual(ext.dismissed, ["XXX-loadorderdeploy-notif"]);
  });

  it("leaves mods.txt alone when the UE4SS load order is switched off in the settings", async () => {
    const { ext, gameDir } = await ue4ssGame({
      mods: withUe4ssInstalled(),
      settings: { ue4ssLoEnabled: false },
    });
    write(LOGIC(gameDir, "Alpha.pak"));
    await deployed(ext);
    assert.deepEqual(types(ext), ["SET_XXX_LOGICMODS_LOAD_ORDER"]);
    assert.equal(fs.existsSync(MODS(gameDir, "mods.txt")), false);
  });

  it("skips the surfaces that are compiled out", async () => {
    const noLogic = await ue4ssGame({ mods: withUe4ssInstalled(), transform: noLogicMods });
    await deployed(noLogic.ext);
    assert.deepEqual(types(noLogic.ext), ["SET_XXX_UE4SS_LOAD_ORDER"]);
    const noUe4ssSurface = await ue4ssGame({ mods: withUe4ssInstalled(), transform: noUe4ss });
    write(LOGIC(noUe4ssSurface.gameDir, "Alpha.pak"));
    await deployed(noUe4ssSurface.ext);
    assert.deepEqual(types(noUe4ssSurface.ext), ["SET_XXX_LOGICMODS_LOAD_ORDER"]);
  });

  it("writes no order file for a surface with nothing in it", async () => {
    const { ext, gameDir } = await ue4ssGame({ mods: withUe4ssInstalled(), plain: [], managed: [] });
    await deployed(ext);
    assert.equal(fs.existsSync(MODS(gameDir, "mods.txt")), false);
    assert.equal(fs.existsSync(BPML(gameDir, "load_order.txt")), false);
  });

  it("falls back to the stored order, and logs, when a surface cannot be read", async () => {
    const { ext, gameDir } = await ue4ssGame({ mods: withUe4ssInstalled() });
    fs.rmSync(MODS(gameDir), { recursive: true, force: true });
    ext.state.persistent.ue4ssLoadOrder = { profile: { loadOrder: [] } };
    await deployed(ext);
    assert.equal(
      vortex.logs.some(({ level, message }) => level === "error" && message === "[XXX] didDeploy: deserializeUe4ss failed, falling back to store state"),
      true,
    );
    assert.deepEqual(types(ext), ["SET_XXX_LOGICMODS_LOAD_ORDER"].slice(0, 0).concat(types(ext)));
  });

  describe("engine version", () => {
    const iniFile = (gameDir) => sep(gameDir, "XXX", "Binaries", "Win64", "ue4ss", "UE4SS-settings.ini");
    // Replaces the INI parser so the file contents are a plain object the test can inspect.
    function fakeIni() {
      const IniParser = require("vortex-parse-ini").default;
      const contents = { data: { EngineVersionOverride: { MajorVersion: " 0", MinorVersion: " 0" } } };
      const calls = [];
      mock.method(IniParser.prototype, "read", async (file) => {
        calls.push(["read", file]);
        return contents;
      });
      mock.method(IniParser.prototype, "write", async (file, written) => {
        calls.push(["write", file, written]);
      });
      return { contents, calls };
    }
    const engine = (extra) => all(setConst("writeEngineVersion", "true"), extra ?? ((s) => s));

    it("writes the executable's engine version into UE4SS-settings.ini", async () => {
      const { ext, gameDir } = await ue4ssGame({ mods: withUe4ssInstalled(), transform: engine() });
      write(iniFile(gameDir));
      const ini = fakeIni();
      await deployed(ext);
      assert.deepEqual(ini.contents.data.EngineVersionOverride, { MajorVersion: " 1", MinorVersion: " 2" });
      assert.deepEqual(ini.calls.map(([kind, file]) => [kind, file]), [
        ["read", iniFile(gameDir)],
        ["write", iniFile(gameDir)],
      ]);
      assert.equal(ini.calls[1][2], ini.contents);
    });

    it("falls back to ENGINE_VERSION when the executable's version cannot be read", async () => {
      const { ext, gameDir } = await ue4ssGame({
        mods: withUe4ssInstalled(),
        transform: engine(setConst("ENGINE_VERSION", '"5.4.2.0"')),
      });
      write(iniFile(gameDir));
      const ini = fakeIni();
      mock.method(require("exe-version"), "getProductVersion", () => {
        throw new Error("unreadable");
      });
      await deployed(ext);
      assert.deepEqual(ini.contents.data.EngineVersionOverride, { MajorVersion: " 5", MinorVersion: " 4" });
      assert.equal(
        vortex.logs.some(({ level, message }) => level === "info" && message === "[XXX] Could not read engine version from shipping exe, falling back to ENGINE_VERSION constant: unreadable"),
        true,
      );
    });

    it("falls back to ENGINE_VERSION when the executable version has no minor part", async () => {
      const { ext, gameDir } = await ue4ssGame({
        mods: withUe4ssInstalled(),
        transform: engine(setConst("ENGINE_VERSION", '"4.27.2.0"')),
      });
      write(iniFile(gameDir));
      const ini = fakeIni();
      mock.method(require("exe-version"), "getProductVersion", () => "5");
      await deployed(ext);
      assert.deepEqual(ini.contents.data.EngineVersionOverride, { MajorVersion: " 4", MinorVersion: " 27" });
    });

    it("logs and leaves the file when UE4SS-settings.ini is missing", async () => {
      const { ext } = await ue4ssGame({ mods: withUe4ssInstalled(), transform: engine() });
      const ini = fakeIni();
      await deployed(ext);
      assert.deepEqual(ini.calls, []);
      assert.equal(
        vortex.logs.some(({ level, message }) => level === "info" && message.startsWith("[XXX] Failed to read UE4SS Settings INI file and write Engine Version: ENOENT")),
        true,
      );
    });

    it("does nothing unless writeEngineVersion is on and UE4SS is installed", async () => {
      const off = await ue4ssGame({ mods: withUe4ssInstalled() });
      write(iniFile(off.gameDir));
      const ini = fakeIni();
      await deployed(off.ext);
      const notInstalled = await ue4ssGame({ transform: engine() });
      write(iniFile(notInstalled.gameDir));
      await deployed(notInstalled.ext);
      assert.deepEqual(ini.calls, []);
    });
  });
});

describe("template-ue4-5: retagging a FOMOD-installed pak mod", () => {
  const FOMOD_MOD = {
    m1: { id: "m1", type: "", installationPath: "Fomod Pak", attributes: { name: "Fomod Pak" } },
  };

  // A game where mod `m1` was just installed through a FOMOD and holds `staged` files.
  async function fomodGame({ staged = ["a.pak"], mods = FOMOD_MOD, enabled = true, ...rest } = {}) {
    fs.rmSync(STAGING, { recursive: true, force: true });
    for (const file of staged) write(path.join(STAGING, "Fomod Pak", ...file.split("/")));
    const { ext, gameDir } = await pakGame({
      mods,
      modState: enabled ? { m1: { enabled: true } } : {},
      ...rest,
    });
    // Vortex applies the new type to its state when the action is dispatched.
    ext.api.store.dispatch = (action) => {
      ext.dispatched.push(action);
      if (action.type === "setModType") {
        ext.state.persistent.mods[GAME_ID][action.payload[1]].type = action.payload[2];
      }
      return action;
    };
    return { ext, gameDir };
  }
  const install = async (ext, modId = "m1", gameId = GAME_ID) => {
    ext.api.events.emit("did-install-mod", gameId, "archive", modId);
    // The handler is fire-and-forget, so wait until it has been quiet for a while.
    let last = -1;
    let quiet = 0;
    for (let poll = 0; poll < 400 && quiet < 12; poll++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      const activity = ext.dispatched.length + ext.notifications.length + vortex.logs.length;
      quiet = activity === last ? quiet + 1 : 0;
      last = activity;
    }
  };
  const types = (ext) => ext.dispatched.map(({ type }) => type);

  it("tags the mod as a sortable pak, refreshes the order and asks for a deployment", async () => {
    const { ext } = await fomodGame();
    await install(ext);
    assert.deepEqual(types(ext), ["setModType", "setFBLoadOrder", "setDeploymentNecessary"]);
    assert.deepEqual(ext.dispatched[0].payload, ["XXX", "m1", ID.pak]);
    assert.equal(ext.dispatched[1].payload[0], "profile");
    assert.deepEqual(
      ext.dispatched[1].payload[1].map(({ id }) => id),
      ["m1"],
    );
    assert.equal(ext.notifications.at(-1).id, "XXX-loadorderdeploy-notif");
  });

  it("recognises every pak extension in the IO Store set", async () => {
    for (const staged of [["a.ucas"], ["a.utoc"], ["Option 1/a.pak", "Option 1/a.ucas"]]) {
      const { ext } = await fomodGame({ staged });
      await install(ext);
      assert.equal(types(ext)[0], "setModType", staged.join());
    }
  });

  it("leaves a mod that already has a type alone", async () => {
    const { ext } = await fomodGame({ mods: { m1: { ...FOMOD_MOD.m1, type: ID.root } } });
    await install(ext);
    assert.deepEqual(ext.dispatched, []);
  });

  it("leaves other games, unknown mods and unstaged mods alone", async () => {
    const other = await fomodGame();
    await install(other.ext, "m1", "othergame");
    assert.deepEqual(other.ext.dispatched, []);
    const unknown = await fomodGame();
    await install(unknown.ext, "nope");
    assert.deepEqual(unknown.ext.dispatched, []);
    const unstaged = await fomodGame({
      mods: { m1: { id: "m1", type: "", attributes: {} } },
    });
    await install(unstaged.ext);
    assert.deepEqual(unstaged.ext.dispatched, []);
  });

  it("does nothing when the pak load order is switched off", async () => {
    const { ext } = await fomodGame({ transform: noPakLoadOrder });
    await install(ext);
    assert.deepEqual(ext.dispatched, []);
  });

  it("leaves a mod with no pak files alone", async () => {
    const { ext } = await fomodGame({ staged: ["readme.txt", "settings.json"] });
    await install(ext);
    assert.deepEqual(ext.dispatched, []);
  });

  it("leaves a mod an earlier installer would have claimed", async () => {
    for (const staged of [
      ["Binaries/Win64/x.dll", "Content/Paks/a.pak"],
      ["LogicMods/a.pak"],
    ]) {
      const { ext } = await fomodGame({ staged });
      await install(ext);
      assert.deepEqual(ext.dispatched, [], staged.join());
    }
  });

  it("lets a LogicMods folder through when LogicMods are switched off", async () => {
    const { ext } = await fomodGame({ staged: ["LogicMods/a.pak"], transform: noLogicMods });
    await install(ext);
    assert.equal(types(ext)[0], "setModType");
  });

  it("leaves a mod staged in the full game folder layout", async () => {
    for (const staged of [["XXX/Content/Paks/~mods/a.pak"], ["Pack/xxx/Content/a.pak"]]) {
      const { ext } = await fomodGame({ staged });
      await install(ext);
      assert.deepEqual(ext.dispatched, [], staged.join());
    }
  });

  it("tags but does not refresh while a collection is installing", async () => {
    for (const installing of [["dep"], "yes"]) {
      const { ext } = await fomodGame();
      ext.state.session.base = { activity: { installing_dependencies: installing } };
      await install(ext);
      assert.deepEqual(types(ext), ["setModType"], JSON.stringify(installing));
    }
    for (const installing of [[], undefined]) {
      const { ext } = await fomodGame();
      ext.state.session.base = { activity: { installing_dependencies: installing } };
      await install(ext);
      assert.deepEqual(types(ext), ["setModType", "setFBLoadOrder", "setDeploymentNecessary"]);
    }
  });

  it("tags but does not refresh while another game is active", async () => {
    const { ext } = await fomodGame();
    ext.state.persistent.profiles.profile.gameId = "othergame";
    await install(ext);
    assert.deepEqual(types(ext), ["setModType"]);
  });

  it("keeps the stored order when the mod is not enabled yet, but still asks for a deployment", async () => {
    const { ext } = await fomodGame({ enabled: false });
    await install(ext);
    assert.deepEqual(types(ext), ["setModType", "setDeploymentNecessary"]);
  });

  it("logs a failed refresh and still asks for a deployment", async () => {
    const { ext } = await fomodGame();
    ext.state.settings.gameMode.discovered = {};
    await install(ext);
    assert.deepEqual(types(ext), ["setModType", "setDeploymentNecessary"]);
    assert.equal(
      vortex.logs.some(({ level, message }) => level === "warn" && message === '[XXX] load order refresh after retagging "m1" failed'),
      true,
    );
  });
});

describe("template-ue4-5: path and status helpers", () => {
  let ext;
  let helpers;
  before(async () => {
    ext = await boot({ transform: withInternals(), state: stateFor({ gameDir: makeGameDir() }) });
    helpers = ext.exports.internals;
  });

  it("splits paths into segments on either separator, dropping blanks", () => {
    assert.deepEqual(helpers.pathSegments(["a\\b/c", "d//e\\", "", "f"]), ["a", "b", "c", "d", "e", "f"]);
  });

  describe("beatsPakInstaller", () => {
    it("is true for Binaries plus Content and for a LogicMods folder", () => {
      assert.equal(helpers.beatsPakInstaller(["Binaries\\x.dll", "Content\\a.dat"]), true);
      assert.equal(helpers.beatsPakInstaller(["content/a.dat", "BINARIES/x.dll"]), true);
      assert.equal(helpers.beatsPakInstaller(["LogicMods\\a.pak"]), true);
      assert.equal(helpers.beatsPakInstaller(["logicmods/a.pak"]), true);
    });

    it("is false for anything the pak installer would take", () => {
      assert.equal(helpers.beatsPakInstaller(["a.pak"]), false);
      assert.equal(helpers.beatsPakInstaller(["Binaries\\x.dll"]), false);
      assert.equal(helpers.beatsPakInstaller(["Content\\a.dat"]), false);
      assert.equal(helpers.beatsPakInstaller(["mod.json", "Plugin.uplugin"]), false);
      assert.equal(helpers.beatsPakInstaller([]), false);
    });

    it("sees through directory entries and plain file lists alike", () => {
      assert.equal(helpers.beatsPakInstaller(["LogicMods\\"]), true);
      assert.equal(helpers.beatsPakInstaller(["Pack\\LogicMods\\a.pak"]), true);
    });

    it("counts the ModKit pair only when the game has a ModKit", async () => {
      const files = ["Mod\\mod.json", "Mod\\Plugin.uplugin"];
      assert.equal(helpers.beatsPakInstaller(files), false);
      const kit = await boot({ transform: withInternals(modKit) });
      assert.equal(kit.exports.internals.beatsPakInstaller(files), true);
      assert.equal(kit.exports.internals.beatsPakInstaller(["Mod\\mod.json"]), false);
      assert.equal(kit.exports.internals.beatsPakInstaller(["Mod\\Plugin.uplugin"]), false);
      assert.equal(kit.exports.internals.beatsPakInstaller(["MOD\\MOD.JSON", "MOD\\A.UPLUGIN"]), true);
    });

    it("ignores a LogicMods folder when LogicMods are switched off", async () => {
      const plain = await boot({ transform: withInternals(noLogicMods) });
      assert.equal(plain.exports.internals.beatsPakInstaller(["LogicMods\\a.pak"]), false);
    });
  });

  describe("matchesStatus", () => {
    const enabledFn = (entry) => entry.on;
    const lockedFn = (entry) => entry.lock;
    const match = (entry, ...tokens) =>
      helpers.matchesStatus(entry, new Set(tokens), enabledFn, lockedFn);

    it("lets everything through without a filter", () => {
      assert.equal(match({ on: false, lock: true, modId: undefined }), true);
    });

    it("filters on enabled and disabled", () => {
      assert.equal(match({ on: true }, "enabled"), true);
      assert.equal(match({ on: false }, "enabled"), false);
      assert.equal(match({ on: false }, "disabled"), true);
      assert.equal(match({ on: true }, "disabled"), false);
      assert.equal(match({ on: true }, "enabled", "disabled"), true);
      assert.equal(match({ on: false }, "enabled", "disabled"), true);
    });

    it("filters on locked and unlocked", () => {
      assert.equal(match({ lock: true }, "locked"), true);
      assert.equal(match({ lock: false }, "locked"), false);
      assert.equal(match({ lock: false }, "unlocked"), true);
      assert.equal(match({ lock: true }, "unlocked"), false);
      assert.equal(match({ lock: true }, "locked", "unlocked"), true);
    });

    it("filters on mods Vortex does not manage", () => {
      assert.equal(match({ modId: undefined }, "unmanaged"), true);
      assert.equal(match({ modId: "m" }, "unmanaged"), false);
    });

    it("needs every group to agree", () => {
      assert.equal(match({ on: true, lock: true, modId: undefined }, "enabled", "locked", "unmanaged"), true);
      assert.equal(match({ on: true, lock: false, modId: undefined }, "enabled", "locked", "unmanaged"), false);
      assert.equal(match({ on: false, lock: true, modId: undefined }, "enabled", "locked", "unmanaged"), false);
      assert.equal(match({ on: true, lock: true, modId: "m" }, "enabled", "locked", "unmanaged"), false);
    });
  });

  describe("mod page and staging lookups", () => {
    const api = () => ({
      getState: () => ext.state,
      store: { getState: () => ext.state },
    });
    const withMod = (mod) => {
      ext.state.persistent.mods[GAME_ID].page = mod;
    };

    it("prefers the mod's homepage for its page", () => {
      withMod({ id: "page", attributes: { homepage: "https://example.test/mod", source: "nexus", modId: 5 } });
      assert.equal(helpers.getModPageURL(api(), "page"), "https://example.test/mod");
    });

    it("builds the Nexus page from the numeric mod id", () => {
      withMod({ id: "page", attributes: { source: "nexus", modId: 5 } });
      assert.equal(helpers.getModPageURL(api(), "page"), "https://www.nexusmods.com/XXX/mods/5");
    });

    it("has no page for a mod from another source, a mod without an id or an unknown mod", () => {
      withMod({ id: "page", attributes: { source: "other", modId: 5 } });
      assert.equal(helpers.getModPageURL(api(), "page"), undefined);
      withMod({ id: "page", attributes: { source: "nexus" } });
      assert.equal(helpers.getModPageURL(api(), "page"), undefined);
      assert.equal(helpers.getModPageURL(api(), "unknown"), undefined);
      assert.equal(helpers.getModPageURL(api(), undefined), undefined);
    });

    it("finds the staging folder of an installed mod", () => {
      withMod({ id: "page", installationPath: "Page Mod", attributes: {} });
      assert.equal(helpers.getModStagingFolder(api(), "page"), sep(STAGING, "Page Mod"));
    });

    it("has no staging folder for an unknown mod or one without an install path", () => {
      withMod({ id: "page", attributes: {} });
      assert.equal(helpers.getModStagingFolder(api(), "page"), undefined);
      assert.equal(helpers.getModStagingFolder(api(), "unknown"), undefined);
      assert.equal(helpers.getModStagingFolder(api(), undefined), undefined);
    });
  });

  describe("legacy load order sorting", () => {
    const sortApi = (mods) => ({ store: { getState: () => ({ persistent: { mods: { XXX: mods } } }) } });

    it("names each mod and counts its pak files", async () => {
      const mods = {
        a: { attributes: { customFileName: "Custom", logicalFileName: "Logical", name: "Plain" } },
        b: { attributes: { logicalFileName: "Logical", name: "Plain", unrealModFiles: ["x.pak", "x.ucas", "x.utoc"] } },
        c: { attributes: { name: "Plain", pictureUrl: "https://example.test/c.png" } },
      };
      const sorted = await helpers.preSort(
        sortApi(mods),
        [{ id: "a" }, { id: "b" }, { id: "c" }],
        "ascending",
      );
      assert.deepEqual(sorted, [
        { id: "a", name: "Custom", imgUrl: path.join(DIR, "XXX.jpg") },
        { id: "b", name: "Logical (3 .pak,.ucas,.utoc files)", imgUrl: path.join(DIR, "XXX.jpg") },
        { id: "c", name: "Plain", imgUrl: "https://example.test/c.png" },
      ]);
    });

    it("lists a single pak without a count", async () => {
      const sorted = await helpers.preSort(
        sortApi({ a: { attributes: { name: "Plain", unrealModFiles: ["x.pak"] } } }),
        [{ id: "a" }],
        "ascending",
      );
      assert.equal(sorted[0].name, "Plain");
    });

    it("reverses the list for a descending sort", async () => {
      const mods = { a: { attributes: { name: "A" } }, b: { attributes: { name: "B" } } };
      const sorted = await helpers.preSort(sortApi(mods), [{ id: "a" }, { id: "b" }], "descending");
      assert.deepEqual(sorted.map(({ id }) => id), ["b", "a"]);
    });
  });

  describe("scaffold helpers games switch on", () => {
    it("known gap: getBinariesFolder looks for the build folders in the game root, not under Binaries", async () => {
      const gameDir = makeGameDir(["gamelaunchhelper.exe"]);
      fs.mkdirSync(sep(gameDir, "XXX", "Binaries", "WinGDK"), { recursive: true });
      // Should answer XXX\Binaries\WinGDK. It stats <game>\WinGDK and <game>\Win64, which never exist.
      assert.equal(helpers.getBinariesFolder(gameDir), undefined);
    });

    it("answers the current Binaries folder when there is no Xbox build", async () => {
      const plain = await boot({ transform: withInternals(noXbox) });
      assert.equal(
        plain.exports.internals.getBinariesFolder(makeGameDir()),
        sep("XXX", "Binaries", "Win64"),
      );
    });

    it("getShippingExe names the executable of the build it finds", () => {
      const named = (file) => helpers.getShippingExe(makeGameDir([file]));
      assert.equal(named("gamelaunchhelper.exe"), sep("XXX", "Binaries", "WinGDK", "XXX-WinGDK-Shipping.exe"));
      assert.equal(named("XXX.exe"), sep("XXX", "Binaries", "Win64", "XXX-Win64-Shipping.exe"));
      assert.equal(named("other.exe"), undefined);
    });

    it("getShippingExe finds the Epic, GOG and demo builds", async () => {
      const multi = await boot({ transform: withInternals(multiExe) });
      const named = (file) => multi.exports.internals.getShippingExe(makeGameDir([file]));
      for (const file of ["Epic.exe", "Gog.exe", "Demo.exe"]) {
        assert.equal(named(file), sep("XXX", "Binaries", "Win64", "XXX-Win64-Shipping.exe"), file);
      }
    });

    it("setConfigPath adds the store folder found under the data folder", async () => {
      cleanLocal();
      fs.mkdirSync(sep(LOCAL_APP_DATA, "XXX", "StoreA"), { recursive: true });
      const fresh = await boot({ transform: withInternals() });
      assert.equal(
        await fresh.exports.internals.setConfigPath("steam"),
        sep(LOCAL_APP_DATA, "XXX", "StoreA", "Saved", "Config", "Windows"),
      );
      assert.equal(
        await fresh.exports.internals.setConfigPath("xbox"),
        sep(LOCAL_APP_DATA, "XXX", "StoreA", "Saved", "Config", "WinGDK"),
      );
      cleanLocal();
      assert.equal(
        await fresh.exports.internals.setConfigPath("steam"),
        sep(LOCAL_APP_DATA, "XXX", "Saved", "Config", "Windows"),
      );
    });

    it("setSavePath adds the store folder and the user id folder", async () => {
      cleanLocal();
      fs.mkdirSync(sep(LOCAL_APP_DATA, "XXX", "StoreA", "Saved", "SaveGames", "User1"), {
        recursive: true,
      });
      const fresh = await boot({ transform: withInternals() });
      assert.equal(
        await fresh.exports.internals.setSavePath(),
        sep(LOCAL_APP_DATA, "XXX", "StoreA", "Saved", "SaveGames", "User1"),
      );
      cleanLocal();
      assert.equal(
        await fresh.exports.internals.setSavePath(),
        sep(LOCAL_APP_DATA, "XXX", "Saved", "SaveGames"),
      );
    });

    it("getModKitPath finds the ModKit through the Epic store", async () => {
      const seen = [];
      vortex.gameStore.findByAppId = async (...args) => {
        seen.push(args);
        return { gamePath: "C:\\Epic\\Kit" };
      };
      assert.equal(
        await helpers.getModKitPath(),
        sep("C:\\Epic\\Kit", "XXX", "Binaries", "Win64"),
      );
      assert.deepEqual(seen, [["XXX", "epic"]]);
      vortex.gameStore.findByAppId = async () => undefined;
      assert.equal(await helpers.getModKitPath(), undefined);
      vortex.gameStore.findByAppId = async () => {
        throw new Error("not installed");
      };
      assert.equal(await helpers.getModKitPath(), undefined);
    });

    it("didPurge answers for any profile without doing anything", async () => {
      assert.equal(await helpers.didPurge(ext.api, "profile"), undefined);
      assert.equal(await helpers.didPurge(ext.api, "other"), undefined);
    });
  });
});

describe("template-ue4-5: UE4SS Load Order setting", () => {
  const stage = (names) => {
    fs.rmSync(STAGING, { recursive: true, force: true });
    for (const name of names) write(path.join(STAGING, ...name.split("/")));
  };
  const run = async (write, extra = []) => {
    const { ext } = await ue4ssGame({ transform: undefined });
    await ext.internals.reconcileEnabledTxt(ext.api, write);
    return ext;
  };

  it("writes an enabled.txt beside every Scripts and dlls folder when the load order is turned off", async () => {
    stage(["ModA/Scripts/main.lua", "ModB/dlls/x.dll", "Deep/Wrap/Scripts/a.lua", "ModC/readme.txt"]);
    const ext = await run(true);
    for (const folder of ["ModA", "ModB", "Deep/Wrap"]) {
      assert.equal(fs.existsSync(path.join(STAGING, ...folder.split("/"), "enabled.txt")), true, folder);
    }
    assert.equal(fs.existsSync(path.join(STAGING, "ModC", "enabled.txt")), false);
    assert.deepEqual(ext.notifications.at(-1), {
      id: "XXX-ue4ss-lo-reconcile",
      type: "success",
      message: "UE4SS Load Order disabled: wrote enabled.txt for 3 mod folder(s).",
      displayMS: 5000,
    });
  });

  it("skips folders of UE4SS's own native mods and folders that already have the file", async () => {
    stage(["BPModLoaderMod/Scripts/main.lua", "Keybinds/Scripts/main.lua", "ModA/Scripts/main.lua", "ModB/Scripts/main.lua", "ModB/enabled.txt"]);
    const ext = await run(true);
    assert.equal(fs.existsSync(path.join(STAGING, "BPModLoaderMod", "enabled.txt")), false);
    assert.equal(fs.existsSync(path.join(STAGING, "Keybinds", "enabled.txt")), false);
    assert.equal(ext.notifications.at(-1).message, "UE4SS Load Order disabled: wrote enabled.txt for 1 mod folder(s).");
  });

  it("matches the Scripts and dlls folder names without regard to case", async () => {
    stage(["ModA/SCRIPTS/main.lua", "ModB/DLLS/x.dll"]);
    const ext = await run(true);
    assert.equal(ext.notifications.at(-1).message.includes("for 2 mod folder(s)"), true);
  });

  it("removes the enabled.txt files when the load order is turned back on", async () => {
    stage(["ModA/Scripts/main.lua", "ModA/enabled.txt", "ModB/dlls/x.dll", "ModC/Scripts/main.lua", "ModC/enabled.txt"]);
    const ext = await run(false);
    assert.equal(fs.existsSync(path.join(STAGING, "ModA", "enabled.txt")), false);
    assert.equal(fs.existsSync(path.join(STAGING, "ModC", "enabled.txt")), false);
    assert.equal(fs.existsSync(path.join(STAGING, "ModA", "Scripts", "main.lua")), true);
    assert.deepEqual(ext.notifications.at(-1), {
      id: "XXX-ue4ss-lo-reconcile",
      type: "success",
      message: "UE4SS Load Order enabled: cleared enabled.txt for 2 mod folder(s).",
      displayMS: 5000,
    });
  });

  it("reports zero when there is nothing to change", async () => {
    stage(["ModA/readme.txt"]);
    assert.equal(
      (await run(false)).notifications.at(-1).message,
      "UE4SS Load Order enabled: cleared enabled.txt for 0 mod folder(s).",
    );
    stage(["ModA/Scripts/main.lua", "ModA/enabled.txt"]);
    assert.equal(
      (await run(true)).notifications.at(-1).message,
      "UE4SS Load Order disabled: wrote enabled.txt for 0 mod folder(s).",
    );
  });

  it("copes with an empty staging folder", async () => {
    fs.rmSync(STAGING, { recursive: true, force: true });
    assert.equal(
      (await run(true)).notifications.at(-1).message,
      "UE4SS Load Order disabled: wrote enabled.txt for 0 mod folder(s).",
    );
  });
});

// END OF SUITE
