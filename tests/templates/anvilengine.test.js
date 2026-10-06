"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, describe, it } = require("node:test");
const { checks } = require("../contract-checks");
const { makeState } = require("../harness/fake-context");
const { makeGameDir, makeTempDir, tree } = require("../harness/fixtures");
const {
  answerDownloads,
  idsOf,
  installerOf,
  settle,
  stubShell,
  summary,
  supportedBy,
  waitFor,
  withWinapi,
} = require("../harness/helpers");
const { loadExtension, templateDir, vortex } = require("../harness/load-extension");
const { STUB_EXE_VERSION } = require("../harness/stub-modules");
const { all, setConst } = require("../harness/transforms");

const DIR = templateDir("template-anvilengine");
const GAME_ID = "XXX";
const STAGING = path.join(vortex.APP_ROOT, "staging", GAME_ID);
const DOWNLOADS = path.join(vortex.APP_ROOT, "downloads", GAME_ID);

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const modType = (value) => ({ type: "setmodtype", value });
const RENAME = "RENAME_ME_TO_FORGE_NAME.forge";
const GLOBS = [
  path.join("**", "changelog*"),
  path.join("**", "readme*"),
  path.join("**", "license*"),
];

const flags = (...names) => all(...names.map((name) => setConst(name, "true")));
const withDlc = all(
  setConst("hasDlcFolders", "true"),
  setConst("DLC_FOLDERS", '["dlc_10", "dlc_11"]'),
);
// Every optional feature at once, except patch textures, which cannot share a game with ResoRep.
const EVERYTHING = all(
  flags(
    "hasForger",
    "hasReforger",
    "hasResorep",
    "hasSound",
    "hasFixes",
    "hasBinariesType",
    "hasCustomLaunchers",
    "hasSettingsIni",
    "setupNotification",
  ),
  withDlc,
);

const modsOf = (...types) =>
  Object.fromEntries(types.map((type, index) => [`mod${index}`, { id: `mod${index}`, type }]));

// Vortex-shaped state for the game: discovered at gameDir, with the given mods installed.
function stateFor({ gameDir, mods = {}, tools, activeGameId } = {}) {
  const state = makeState({
    activeGameId,
    discovered: gameDir ? { [GAME_ID]: { path: gameDir, tools } } : {},
    mods: { [GAME_ID]: mods },
  });
  state.settings.profiles.lastActiveProfile[GAME_ID] = "profile";
  return state;
}

// The installer that would win in Vortex: the lowest priority number that accepts the files.
async function winnerOf(ext, files, gameId = GAME_ID) {
  const ordered = [...ext.installers].sort((a, b) => a.priority - b.priority);
  for (const entry of ordered) {
    if ((await entry.testSupported(files, gameId)).supported) return entry.id;
  }
  return undefined;
}

// Answers the purge and deploy events the way Vortex would, recording the order.
function answerDeployEvents(ext) {
  const seen = [];
  ext.api.events.on("purge-mods", (flag, callback) => {
    seen.push(["purge-mods", flag]);
    callback(null);
  });
  ext.api.events.on("deploy-mods", (callback) => {
    seen.push(["deploy-mods"]);
    callback(null);
  });
  return seen;
}

// Records what the extension asks Vortex to run.
function recordRuns(ext, failure) {
  const runs = [];
  ext.api.runExecutable = (...args) => {
    runs.push(args);
    return failure ? Promise.reject(failure) : Promise.resolve();
  };
  return runs;
}

// Stands in for the bundled downloader.js. `mods` are the successive answers of findModByFile
// (the installed ReForger installer mod before and after the download).
function fakeDownloader({ mods = [] } = {}) {
  const calls = [];
  const answers = [...mods];
  const exports = {
    download: async (_api, requirements, force) => {
      calls.push(["download", requirements, force]);
    },
    findModByFile: async (_api, type, fileName) => {
      calls.push(["findModByFile", type, fileName]);
      return answers.shift();
    },
    resolveVersionByModVersion: async (_api, requirement) => {
      calls.push(["resolveVersionByModVersion", requirement]);
      return "1.0.0";
    },
  };
  return { calls, bundled: { "downloader.js": exports } };
}

// A winapi stand-in answering registry reads from a { "hive|key|value": data } table.
function registry(entries) {
  return {
    RegGetValue: (hive, key, name) => {
      const value = entries[`${hive}|${key}|${name}`];
      if (value === undefined) throw new Error("registry key not found (stub)");
      return { value };
    },
  };
}
const HKLM = "HKEY_LOCAL_MACHINE";
const ubisoft = (appId = "XXX") =>
  `${HKLM}|SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\${appId}|InstallDir`;
const UBISOFT = ubisoft();
const EPIC = `${HKLM}|SOFTWARE\\WOW6432Node\\Epic Games\\EpicGamesLauncher|AppDataPath`;
const GOG = (name) => `${HKLM}|SOFTWARE\\WOW6432Node\\GOG.com\\Games\\gog1|${name}`;

const REFORGER_PACKAGES =
  "Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\PackageRepository\\Packages";
const REFORGER_KEY = "ReForger_2.1.0.0_x64__9r43be93mcwwm";
const REFORGER_PATH = `C:\\Tools\\${REFORGER_KEY}`;

// winapi members ReForger discovery reads: the package key enumeration plus the Path value of
// whichever key is asked for, so choosing the wrong key shows up as the wrong path.
function reforgerRegistry({ keys = [REFORGER_KEY] } = {}) {
  const opened = [];
  return {
    opened,
    WithRegOpen: (hive, key, run) => {
      opened.push([hive, key]);
      run("hkey");
    },
    RegEnumKeys: () => keys.map((key) => ({ key })),
    RegGetValue: (hive, key, name) => {
      const prefix = `${REFORGER_PACKAGES}\\`;
      if (hive === "HKEY_CLASSES_ROOT" && key.startsWith(prefix) && name === "Path") {
        return { value: `C:\\Tools\\${key.slice(prefix.length)}` };
      }
      throw new Error("registry key not found (stub)");
    },
  };
}

const expectTool = (fields) => ({
  detach: undefined,
  relative: true,
  exclusive: true,
  shell: undefined,
  queryPath: "undefined",
  ...fields,
});
const CUSTOM_LAUNCH = expectTool({
  id: "XXX-customlaunch",
  name: "Custom Launch",
  logo: "exec.png",
  executable: "XXX.exe",
  requiredFiles: ["XXX.exe"],
  detach: true,
  shell: true,
});
const ATK_TOOL = expectTool({
  id: "XXX-atk",
  name: "AnvilToolkit",
  logo: "anvil.png",
  executable: "anviltoolkit.exe",
  requiredFiles: ["anviltoolkit.exe"],
});
const PLUS_TOOL = expectTool({
  id: "XXX-launchplus",
  name: "Launch Game Ubisoft Plus",
  logo: "exec.png",
  executable: "XXX_UPP.exe",
  requiredFiles: ["XXX_UPP.exe"],
  detach: true,
});
const VULKAN_TOOL = expectTool({
  id: "XXX-launchvulkan",
  name: "Launch Vulkan",
  logo: "vulkan.png",
  executable: "XXX_vulkan.exe",
  requiredFiles: ["XXX_vulkan.exe"],
  detach: true,
});
const FORGER_TOOL = expectTool({
  id: "XXX-forger",
  name: "Forger Patch Manager",
  logo: "forger.png",
  executable: "forger.exe",
  requiredFiles: ["forger.exe"],
});
const REFORGER_TOOL = expectTool({
  id: "XXX-reforger",
  name: "ReForger",
  logo: "reforger.png",
  executable: "ReForger.exe",
  requiredFiles: ["ReForger.exe"],
  relative: false,
  queryPath: "function",
});

// What a registered tool looks like to Vortex.
const describeTool = (tool) => ({
  id: tool.id,
  name: tool.name,
  logo: tool.logo,
  executable: tool.executable(),
  requiredFiles: tool.requiredFiles,
  detach: tool.detach,
  relative: tool.relative,
  exclusive: tool.exclusive,
  shell: tool.shell,
  queryPath: typeof tool.queryPath,
});

async function withEnv(vars, run) {
  const saved = Object.keys(vars).map((key) => [key, process.env[key]]);
  Object.assign(process.env, vars);
  try {
    return await run();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

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

// A fake Windows folder holding a d3d11.dll in System32 and SysWOW64, for the ResoRep copy.
function fakeWindows() {
  const root = makeTempDir();
  for (const folder of ["System32", "SysWOW64"]) {
    fs.mkdirSync(path.join(root, folder));
    fs.writeFileSync(path.join(root, folder, "d3d11.dll"), `system ${folder}`);
  }
  return root;
}

afterEach(() => {
  delete globalThis.window;
});

describe("template-anvilengine: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("registers the folder mod types high, then AnvilToolkit low", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-extracted", 25],
      ["XXX-forgefolder", 26],
      ["XXX-datafolder", 27],
      ["XXX-loosedata", 28],
      ["XXX-forgefile", 29],
      ["XXX-root", 30],
      ["XXX-atk", 81],
    ]);
    assert.deepEqual(
      ext.modTypes.map(({ options }) => options.name),
      [
        "Extracted Folder",
        ".forge Folder",
        ".data Folder",
        "Loose Data Files",
        "Forge Replacement",
        "Binaries / Root Folder",
        "AnvilToolkit",
      ],
    );
  });

  it("registers the installers in one priority ladder with the fallback last", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-atk", 25],
      ["XXX-extracted", 35],
      ["XXX-forgefolder", 36],
      ["XXX-datafolder", 37],
      ["XXX-loosedata", 38],
      ["XXX-forgefile", 39],
      ["XXX-root", 41],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the five toolbar actions for the game only", async () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Open PCGamingWiki Page",
        "Open SteamDB Page",
        "View Changelog",
        "Submit Bug Report",
        "Open Downloads Folder",
      ],
    );
    assert.ok(
      ext.registeredActions.every(
        ({ group, priority, icon }) =>
          group === "mod-icons" && priority === 300 && icon === "open-ext",
      ),
    );
    const active = await loadExtension(DIR, { state: makeState({ activeGameId: GAME_ID }) });
    const other = await loadExtension(DIR, { state: makeState({ activeGameId: "other" }) });
    assert.ok(active.registeredActions.every(({ condition }) => condition() === true));
    assert.ok(other.registeredActions.every(({ condition }) => condition() === false));
  });

  it("describes the game and its tools", () => {
    const { game } = ext;
    assert.equal(game.id, GAME_ID);
    assert.equal(game.mergeMods, true);
    assert.equal(game.requiresCleanup, true);
    assert.equal(game.modPath, ".");
    assert.equal(game.modPathIsRelative, true);
    assert.deepEqual(game.requiredFiles, ["XXX.exe"]);
    assert.deepEqual(game.compatible, { dinput: false, enb: false });
    assert.deepEqual(game.details, {
      steamAppId: NaN,
      uPlayAppId: "XXX",
      supportsSymlinks: false,
      ignoreDeploy: GLOBS,
      ignoreConflicts: GLOBS,
    });
    assert.deepEqual(game.environment, { SteamAPPId: "XXX", UPlayAPPId: "XXX" });
    assert.deepEqual(game.supportedTools.map(describeTool), [CUSTOM_LAUNCH, ATK_TOOL]);
  });

  it("main reports success", () => {
    assert.equal(ext.mainResult, true);
  });

  it("registers only the deploy listener at startup", () => {
    assert.deepEqual(
      ext.listeners.map(({ kind, args }) => [kind, args[0]]),
      [["onAsync", "did-deploy"]],
    );
  });

  it("ships the documented defaults", () => {
    assert.match(ext.source, /^const hasAtk = true;/m);
    assert.match(ext.source, /^const autoDownloadReforger = false;/m);
    assert.match(ext.source, /^const deployNotification = true;/m);
    assert.match(ext.source, /^const allowSymlinks = false;/m);
    assert.match(ext.source, /^const fallbackInstaller = true;/m);
  });
});

describe("template-anvilengine: toggles change what is registered", () => {
  const BASE_MODS = [
    ["XXX-extracted", 25],
    ["XXX-forgefolder", 26],
    ["XXX-datafolder", 27],
    ["XXX-loosedata", 28],
    ["XXX-forgefile", 29],
    ["XXX-root", 30],
  ];
  const BASE_INSTALLERS = [
    ["XXX-extracted", 35],
    ["XXX-forgefolder", 36],
    ["XXX-datafolder", 37],
    ["XXX-loosedata", 38],
    ["XXX-forgefile", 39],
    ["XXX-root", 41],
    ["XXX-fallback", 49],
  ];
  const ATK_TYPE = [["XXX-atk", 81]];
  const ATK_INSTALLER = [["XXX-atk", 25]];

  const cases = [
    {
      name: "hasAtk off drops the AnvilToolkit tool, mod type, and the whole folder workflow",
      transform: setConst("hasAtk", "false"),
      modTypes: BASE_MODS,
      installers: [
        ["XXX-forgefile", 39],
        ["XXX-root", 41],
        ["XXX-fallback", 49],
      ],
      tools: ["XXX-customlaunch"],
    },
    {
      name: "hasForger adds the Forger tool, mod types and installers",
      transform: setConst("hasForger", "true"),
      modTypes: [...BASE_MODS, ...ATK_TYPE, ["XXX-forger", 82], ["XXX-forgerpatch", 33]],
      installers: [
        ...ATK_INSTALLER,
        ["XXX-forger", 26],
        ["XXX-forgerpatch", 28],
        ...BASE_INSTALLERS,
      ],
      tools: ["XXX-customlaunch", "XXX-atk", "XXX-forger"],
    },
    {
      name: "hasReforger adds the tool and the synthetic installer mod type, but no installer",
      transform: setConst("hasReforger", "true"),
      modTypes: [...BASE_MODS, ...ATK_TYPE, ["XXX-reforgerinstall", 82]],
      installers: [...ATK_INSTALLER, ...BASE_INSTALLERS],
      tools: ["XXX-customlaunch", "XXX-atk", "XXX-reforger"],
    },
    {
      name: "hasDlcFolders adds the DLC mod type and installer",
      transform: withDlc,
      modTypes: [...BASE_MODS, ...ATK_TYPE, ["XXX-dlcfolder", 32]],
      installers: [...ATK_INSTALLER, ["XXX-dlcfolder", 34], ...BASE_INSTALLERS],
      tools: ["XXX-customlaunch", "XXX-atk"],
    },
    {
      name: "hasResorep adds the DLL and texture mod types and installers",
      transform: setConst("hasResorep", "true"),
      modTypes: [...BASE_MODS, ...ATK_TYPE, ["XXX-resoreptextures", 32], ["XXX-resorep", 83]],
      installers: [
        ...ATK_INSTALLER,
        ["XXX-resorep", 27],
        ["XXX-resoreptextures", 30],
        ...BASE_INSTALLERS,
      ],
      tools: ["XXX-customlaunch", "XXX-atk"],
    },
    {
      name: "hasPatchTextures adds the Forger patch textures mod type and installer",
      transform: setConst("hasPatchTextures", "true"),
      modTypes: [...BASE_MODS, ...ATK_TYPE, ["XXX-forgerpatchtextures", 32]],
      installers: [...ATK_INSTALLER, ["XXX-forgerpatchtextures", 29], ...BASE_INSTALLERS],
      tools: ["XXX-customlaunch", "XXX-atk"],
    },
    {
      name: "hasSound adds the sound bank mod type and installer",
      transform: setConst("hasSound", "true"),
      modTypes: [...BASE_MODS, ...ATK_TYPE, ["XXX-sound", 32]],
      installers: [...ATK_INSTALLER, ["XXX-sound", 32], ...BASE_INSTALLERS],
      tools: ["XXX-customlaunch", "XXX-atk"],
    },
    {
      name: "hasFixes adds the fixes mod type (low) and installer",
      transform: setConst("hasFixes", "true"),
      modTypes: [...BASE_MODS, ...ATK_TYPE, ["XXX-fixes", 82]],
      installers: [...ATK_INSTALLER, ["XXX-fixes", 33], ...BASE_INSTALLERS],
      tools: ["XXX-customlaunch", "XXX-atk"],
    },
    {
      name: "hasBinariesType adds a mod type but no installer",
      transform: setConst("hasBinariesType", "true"),
      modTypes: [...BASE_MODS, ...ATK_TYPE, ["XXX-binaries", 32]],
      installers: [...ATK_INSTALLER, ...BASE_INSTALLERS],
      tools: ["XXX-customlaunch", "XXX-atk"],
    },
    {
      name: "hasCustomLaunchers adds the Ubisoft Plus and Vulkan launchers after Custom Launch",
      transform: setConst("hasCustomLaunchers", "true"),
      modTypes: [...BASE_MODS, ...ATK_TYPE],
      installers: [...ATK_INSTALLER, ...BASE_INSTALLERS],
      tools: ["XXX-customlaunch", "XXX-launchplus", "XXX-launchvulkan", "XXX-atk"],
    },
    {
      name: "fallbackInstaller off drops the fallback",
      transform: setConst("fallbackInstaller", "false"),
      modTypes: [...BASE_MODS, ...ATK_TYPE],
      installers: [...ATK_INSTALLER, ...BASE_INSTALLERS.slice(0, -1)],
      tools: ["XXX-customlaunch", "XXX-atk"],
    },
  ];

  for (const { name, transform, modTypes, installers, tools } of cases) {
    it(name, async () => {
      const ext = await loadExtension(DIR, { transform });
      assert.deepEqual(summary(ext.modTypes), modTypes);
      assert.deepEqual(summary(ext.installers), installers);
      assert.deepEqual(idsOf(ext.game.supportedTools), tools);
    });
  }

  it("with every feature on, the ladder stays unique and within 25-49", async () => {
    const ext = await loadExtension(DIR, { transform: EVERYTHING });
    assert.deepEqual(summary(ext.installers), [
      ["XXX-atk", 25],
      ["XXX-forger", 26],
      ["XXX-resorep", 27],
      ["XXX-forgerpatch", 28],
      ["XXX-resoreptextures", 30],
      ["XXX-sound", 32],
      ["XXX-fixes", 33],
      ["XXX-dlcfolder", 34],
      ["XXX-extracted", 35],
      ["XXX-forgefolder", 36],
      ["XXX-datafolder", 37],
      ["XXX-loosedata", 38],
      ["XXX-forgefile", 39],
      ["XXX-root", 41],
      ["XXX-fallback", 49],
    ]);
    assert.deepEqual(ext.game.supportedTools.map(describeTool), [
      CUSTOM_LAUNCH,
      PLUS_TOOL,
      VULKAN_TOOL,
      ATK_TOOL,
      FORGER_TOOL,
      REFORGER_TOOL,
    ]);
    assert.deepEqual(ext.unmocked, []);
  });

  it("names every mod type, so the Vortex picker has a label for each", async () => {
    const ext = await loadExtension(DIR, { transform: EVERYTHING });
    assert.deepEqual(
      ext.modTypes.map(({ id, options }) => [id, options.name]),
      [
        ["XXX-extracted", "Extracted Folder"],
        ["XXX-forgefolder", ".forge Folder"],
        ["XXX-datafolder", ".data Folder"],
        ["XXX-loosedata", "Loose Data Files"],
        ["XXX-forgefile", "Forge Replacement"],
        ["XXX-root", "Binaries / Root Folder"],
        ["XXX-atk", "AnvilToolkit"],
        ["XXX-reforgerinstall", "ReForger Installer"],
        ["XXX-forger", "Forger Patch Manager"],
        ["XXX-forgerpatch", "Forger Patch"],
        ["XXX-dlcfolder", "DLC Folder"],
        ["XXX-sound", "Sound Data .pck"],
        ["XXX-fixes", "Fixes"],
        ["XXX-binaries", "Binaries / Root Folder"],
        ["XXX-resoreptextures", "ResoRep Textures"],
        ["XXX-resorep", "ResoRep DLL"],
      ],
    );
    const patch = await loadExtension(DIR, { transform: setConst("hasPatchTextures", "true") });
    assert.deepEqual(patch.modTypes.at(-1).options.name, "Forger Patch Textures");
  });

  it("with every feature on, the contract checks still pass", async () => {
    const ext = await loadExtension(DIR, { transform: EVERYTHING });
    for (const [name, check] of Object.entries(checks)) {
      assert.deepEqual(await check(ext), [], name);
    }
  });

  it("adds the optional toolbar actions ahead of the common ones", async () => {
    const ext = await loadExtension(DIR, { transform: EVERYTHING });
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Open Settings INI",
        "Force Copy System d3d11.dll (ResoRep)",
        "Download ReForger",
        "Open PCGamingWiki Page",
        "Open SteamDB Page",
        "View Changelog",
        "Submit Bug Report",
        "Open Downloads Folder",
      ],
    );
  });

  it("advertises the Epic and GOG ids only when they are in the discovery list", async () => {
    const both = all(
      setConst("EPICAPP_ID", '"epic1"'),
      setConst("GOGAPP_ID", '"gog1"'),
      setConst("DISCOVERY_IDS_ACTIVE", "[STEAMAPP_ID, UPLAYAPP_ID, EPICAPP_ID, GOGAPP_ID]"),
    );
    const ext = await loadExtension(DIR, { transform: both });
    assert.equal(ext.game.details.epicAppId, "epic1");
    assert.equal(ext.game.details.gogAppId, "gog1");
    assert.equal(ext.game.environment.EpicAPPId, "epic1");
    assert.equal(ext.game.environment.GogAPPId, "gog1");

    const unlisted = await loadExtension(DIR, {
      transform: all(setConst("EPICAPP_ID", '"epic1"'), setConst("GOGAPP_ID", '"gog1"')),
    });
    for (const key of ["epicAppId", "gogAppId"]) assert.equal(key in unlisted.game.details, false);
    for (const key of ["EpicAPPId", "GogAPPId"]) {
      assert.equal(key in unlisted.game.environment, false);
    }
  });

  it("keeps the Steam and Ubisoft Connect ids apart, and searches for both", async () => {
    const ids = all(setConst("STEAMAPP_ID", '"12345"'), setConst("UPLAYAPP_ID", '"uplay1"'));
    const state = makeState({ activeGameId: GAME_ID });
    const ext = await withWinapi(registry({ [ubisoft("uplay1")]: "C:\\Ubisoft\\Game" }), () =>
      loadExtension(DIR, { transform: ids, state }),
    );
    assert.equal(ext.game.details.steamAppId, 12345);
    assert.equal(ext.game.details.uPlayAppId, "uplay1");
    assert.deepEqual(ext.game.environment, { SteamAPPId: "12345", UPlayAPPId: "uplay1" });
    assert.equal(await ext.game.queryPath(), "C:\\Ubisoft\\Game");
    const find = ext.registeredActions.find(({ title }) => title === "Open SteamDB Page");
    const shown = stubShell();
    find.action();
    assert.deepEqual(shown, ["https://steamdb.info/app/12345/"]);

    let asked;
    const plain = await withWinapi(registry({}), () => loadExtension(DIR, { transform: ids }));
    vortex.gameStore.findByAppId = (list) => {
      asked = list;
      return Promise.resolve({ gamePath: "C:\\Steam\\Game" });
    };
    await plain.game.queryPath();
    assert.deepEqual(asked, ["12345", "uplay1"]);
  });

  it("allowSymlinks feeds the game's symlink support", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("allowSymlinks", "true") });
    assert.equal(ext.game.details.supportsSymlinks, true);
  });

  it("deployNotification off drops the deploy listener unless ResoRep needs it", async () => {
    const quiet = await loadExtension(DIR, { transform: setConst("deployNotification", "false") });
    assert.deepEqual(quiet.listeners, []);

    const resorep = await loadExtension(DIR, {
      transform: all(setConst("deployNotification", "false"), setConst("hasResorep", "true")),
    });
    assert.deepEqual(
      resorep.listeners.map(({ args }) => args[0]),
      ["did-deploy"],
    );
  });

  it("registers retired mod types after the spec ones, low, so their paths still resolve", async () => {
    const legacy = setConst(
      "LEGACY_MODTYPES",
      '[{ id: "XXX-oldtextures", name: "Old Textures", targetPath: path.join("{documents}", "Resorep") }, { id: "XXX-oldgamefolder", name: "Old Game Folder", targetPath: path.join("{gamePath}", "Resorep") }]',
    );
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR, {
      transform: legacy,
      state: stateFor({ gameDir }),
    });
    assert.deepEqual(summary(ext.modTypes).slice(-2), [
      ["XXX-oldtextures", 75],
      ["XXX-oldgamefolder", 76],
    ]);
    const [documents, gameFolder] = ext.modTypes.slice(-2);
    assert.deepEqual(
      [documents, gameFolder].map(({ options }) => options.name),
      ["Old Textures", "Old Game Folder"],
    );
    assert.equal(gameFolder.isSupported("someothergame"), false);
    assert.equal(
      documents.getPath({ id: GAME_ID }),
      path.join(vortex.APP_ROOT, "documents", "Resorep"),
    );
    assert.equal(gameFolder.getPath({ id: GAME_ID }), path.join(gameDir, "Resorep"));
    assert.equal(documents.isSupported(GAME_ID), true);
    assert.equal(await documents.test(), false);
    assert.equal(
      (await supportedBy(ext, tree("a.txt"))).some((id) => id.includes("old")),
      false,
    );
  });
});

describe("template-anvilengine: startup checks for conflicting toggles", () => {
  const errors = () =>
    vortex.logs.filter(({ level }) => level === "error").map(({ message }) => message);

  it("logs nothing for the default toggles", async () => {
    await loadExtension(DIR);
    assert.deepEqual(errors(), []);
  });

  it("accepts patch textures or ResoRep on their own", async () => {
    await loadExtension(DIR, { transform: setConst("hasPatchTextures", "true") });
    assert.deepEqual(errors(), []);
    await loadExtension(DIR, { transform: setConst("hasResorep", "true") });
    assert.deepEqual(errors(), []);
  });

  it("accepts DLC folders when the toggle and the list agree", async () => {
    await loadExtension(DIR, { transform: withDlc });
    assert.deepEqual(errors(), []);
  });

  it("logs an error when patch textures and ResoRep both claim .dds", async () => {
    await loadExtension(DIR, { transform: flags("hasPatchTextures", "hasResorep") });
    assert.equal(errors().length, 1);
    assert.match(errors()[0], /hasPatchTextures and hasResorep cannot both be enabled/);
  });

  it("logs an error when hasDlcFolders has no DLC_FOLDERS", async () => {
    await loadExtension(DIR, { transform: setConst("hasDlcFolders", "true") });
    assert.equal(errors().length, 1);
    assert.match(errors()[0], /hasDlcFolders is enabled but DLC_FOLDERS is empty/);
  });

  it("logs an error when DLC_FOLDERS is set without hasDlcFolders, and still routes the DLC .forge", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("DLC_FOLDERS", '["dlc_10"]') });
    assert.equal(errors().length, 1);
    assert.match(errors()[0], /DLC_FOLDERS is set but hasDlcFolders is disabled/);
    const { instructions } = await installerOf(ext, "XXX-forgefile").install(
      tree("Game_10_dlc.forge"),
    );
    assert.equal(instructions[0].destination, sep("dlc_10", "Game_10_dlc.forge"));
  });
});

describe("template-anvilengine: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const matrix = [
    [
      "an Extracted folder holding a .forge folder",
      tree("Extracted/X.forge/a.data"),
      ["XXX-extracted", "XXX-forgefolder", "XXX-loosedata", "XXX-forgefile", "XXX-fallback"],
      "XXX-extracted",
    ],
    [
      "a .forge folder at the top",
      tree("X.forge/a.data"),
      ["XXX-forgefolder", "XXX-loosedata", "XXX-forgefile", "XXX-fallback"],
      "XXX-forgefolder",
    ],
    [
      "a .forge folder in a wrapper folder",
      tree("Mod/X.forge/a.data"),
      ["XXX-forgefolder", "XXX-loosedata", "XXX-forgefile", "XXX-fallback"],
      "XXX-forgefolder",
    ],
    [
      "a .data folder",
      tree("Foo.data/a.bin"),
      ["XXX-datafolder", "XXX-loosedata", "XXX-fallback"],
      "XXX-datafolder",
    ],
    [
      "a .data folder in a wrapper folder",
      tree("Mod/Foo.data/a.bin"),
      ["XXX-datafolder", "XXX-loosedata", "XXX-fallback"],
      "XXX-datafolder",
    ],
    ["loose .data files", tree("a.data"), ["XXX-loosedata", "XXX-fallback"], "XXX-loosedata"],
    [
      "loose .DATA files in capitals",
      tree("A.DATA"),
      ["XXX-loosedata", "XXX-fallback"],
      "XXX-loosedata",
    ],
    ["a .forge file", tree("a.forge"), ["XXX-forgefile", "XXX-fallback"], "XXX-forgefile"],
    [
      "a .FORGE file in capitals",
      tree("A.FORGE"),
      ["XXX-forgefile", "XXX-fallback"],
      "XXX-forgefile",
    ],
    [
      "a .forge file in a wrapper",
      tree("Mod/a.forge"),
      ["XXX-forgefile", "XXX-fallback"],
      "XXX-forgefile",
    ],
    ["a root folder", tree("videos/a.bk2"), ["XXX-root", "XXX-fallback"], "XXX-root"],
    [
      "a root folder in a wrapper",
      tree("Mod/videos/a.bk2"),
      ["XXX-root", "XXX-fallback"],
      "XXX-root",
    ],
    [
      "a root folder in a different case (matched case-sensitively, so only the fallback)",
      tree("Videos/a.bk2"),
      ["XXX-fallback"],
      "XXX-fallback",
    ],
    [
      "an AnvilToolkit download",
      tree("AnvilToolkit/anviltoolkit.exe", "AnvilToolkit/x.dll"),
      ["XXX-atk", "XXX-fallback"],
      "XXX-atk",
    ],
    [
      "an AnvilToolkit download with a capitalised exe name",
      tree("AnvilToolkit.exe"),
      ["XXX-atk", "XXX-fallback"],
      "XXX-atk",
    ],
    [
      "an Extracted mod that also carries a root folder (Extracted wins)",
      tree("Extracted/X.forge/a.data", "videos/a.bk2"),
      [
        "XXX-extracted",
        "XXX-forgefolder",
        "XXX-loosedata",
        "XXX-forgefile",
        "XXX-root",
        "XXX-fallback",
      ],
      "XXX-extracted",
    ],
    ["a readme", tree("readme.txt"), ["XXX-fallback"], "XXX-fallback"],
    [
      "files for features that are switched off",
      tree("a.dds", "a.pck", "a.forger2", "version.dll", "forger.exe", "d3d11.dll"),
      ["XXX-fallback"],
      "XXX-fallback",
    ],
    ["a FOMOD package", tree("fomod/ModuleConfig.xml", "videos/a.bk2"), [], undefined],
  ];

  for (const [label, files, expected, winner] of matrix) {
    it(`routes ${label}`, async () => {
      assert.deepEqual(await supportedBy(ext, files), expected);
      assert.equal(await winnerOf(ext, files), winner);
    });
  }

  it("ignores mods for another game", async () => {
    assert.deepEqual(await supportedBy(ext, tree("Extracted/a.data"), "someothergame"), []);
  });

  it("routes with the fallback off leaves unknown files with no installer", async () => {
    const noFallback = await loadExtension(DIR, {
      transform: setConst("fallbackInstaller", "false"),
    });
    assert.deepEqual(await supportedBy(noFallback, tree("readme.txt")), []);
  });

  it("every installer answers with an empty requiredFiles list", async () => {
    for (const entry of ext.installers) {
      const result = await entry.testSupported(tree("Extracted/a.data"), GAME_ID);
      assert.deepEqual(result.requiredFiles, [], entry.id);
    }
  });
});

describe("template-anvilengine: installer routing for the optional features", () => {
  // [installer id, files the installer accepts]
  const probes = [
    ["XXX-atk", tree("anviltoolkit.exe")],
    ["XXX-forger", tree("forger.exe")],
    ["XXX-resorep", tree("d3d11.dll")],
    ["XXX-forgerpatch", tree("a.forger2")],
    ["XXX-resoreptextures", tree("a.dds")],
    ["XXX-sound", tree("a.pck")],
    ["XXX-fixes", tree("version.dll")],
    ["XXX-dlcfolder", tree("dlc_10/a.bin")],
    ["XXX-extracted", tree("Extracted/a.bin")],
    ["XXX-forgefolder", tree("X.forge/a.bin")],
    ["XXX-datafolder", tree("Foo.data/a.bin")],
    ["XXX-loosedata", tree("a.data")],
    ["XXX-forgefile", tree("a.forge")],
    ["XXX-root", tree("videos/a.bin")],
    ["XXX-fallback", tree("a.txt")],
  ];

  let ext;
  before(async () => {
    ext = await loadExtension(DIR, { transform: EVERYTHING });
  });

  for (const [id, files] of probes) {
    it(`${id} accepts its own files, rejects a FOMOD package and another game`, async () => {
      const entry = installerOf(ext, id);
      const accepted = await entry.testSupported(files, GAME_ID);
      assert.equal(accepted.supported, true);
      assert.deepEqual(accepted.requiredFiles, []);
      const fomod = [...files, "fomod" + path.sep, "fomod" + path.sep + "ModuleConfig.xml"];
      assert.equal((await entry.testSupported(fomod, GAME_ID)).supported, false, "FOMOD guard");
      assert.equal((await entry.testSupported(files, "someothergame")).supported, false);
    });
  }

  it("each optional feature claims its own file type and nothing else", async () => {
    const cases = [
      [tree("a.dds"), ["XXX-resoreptextures", "XXX-fallback"]],
      [tree("a.pck"), ["XXX-sound", "XXX-fallback"]],
      [tree("a.forger2"), ["XXX-forgerpatch", "XXX-fallback"]],
      [tree("version.dll"), ["XXX-fixes", "XXX-fallback"]],
      [tree("forger.exe"), ["XXX-forger", "XXX-fallback"]],
      [tree("d3d11.dll"), ["XXX-resorep", "XXX-fallback"]],
      [
        tree("dlc_10/Extracted/x/a.data"),
        ["XXX-dlcfolder", "XXX-extracted", "XXX-loosedata", "XXX-fallback"],
      ],
      [tree("dlc_99/a.bin"), ["XXX-fallback"]],
      [tree("A.FORGER2"), ["XXX-forgerpatch", "XXX-fallback"]],
      [tree("A.PCK"), ["XXX-sound", "XXX-fallback"]],
      [tree("A.DDS"), ["XXX-resoreptextures", "XXX-fallback"]],
    ];
    for (const [files, expected] of cases) {
      assert.deepEqual(await supportedBy(ext, files), expected, files.join(", "));
    }
  });

  it("patch textures claim .dds when ResoRep is off", async () => {
    const textures = await loadExtension(DIR, { transform: setConst("hasPatchTextures", "true") });
    assert.deepEqual(await supportedBy(textures, tree("a.dds")), [
      "XXX-forgerpatchtextures",
      "XXX-fallback",
    ]);
    const entry = installerOf(textures, "XXX-forgerpatchtextures");
    assert.deepEqual((await entry.testSupported(tree("A.DDS"), GAME_ID)).requiredFiles, []);
    assert.equal((await entry.testSupported(tree("A.DDS"), GAME_ID)).supported, true);
    assert.equal(
      (await entry.testSupported(tree("a.dds", "fomod/ModuleConfig.xml"), GAME_ID)).supported,
      false,
    );
    assert.equal((await entry.testSupported(tree("a.dds"), "someothergame")).supported, false);
  });

  it("the root folder list can name several folders", async () => {
    const wide = await loadExtension(DIR, {
      transform: setConst("ROOT_FOLDERS", '["videos", "resources"]'),
    });
    assert.deepEqual(await supportedBy(wide, tree("resources/a.bin")), [
      "XXX-root",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(wide, tree("videos/a.bin")), ["XXX-root", "XXX-fallback"]);
  });

  it("the marker files are matched whatever their case, except the fixes and ResoRep files", async () => {
    assert.equal((await supportedBy(ext, tree("FORGER.EXE"))).includes("XXX-forger"), true);
    assert.equal((await supportedBy(ext, tree("AnvilToolkit.exe"))).includes("XXX-atk"), true);
    assert.equal((await supportedBy(ext, tree("Version.dll"))).includes("XXX-fixes"), false);
    assert.equal((await supportedBy(ext, tree("D3D11.dll"))).includes("XXX-resorep"), false);
  });
});

describe("template-anvilengine: install output", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const install = (id, files, ...rest) => installerOf(ext, id).install(files, ...rest);

  it("AnvilToolkit keeps the folder holding the exe and drops files outside it", async () => {
    const files = tree("AnvilToolkit/anviltoolkit.exe", "AnvilToolkit/Data/x.dll", "Other/y.txt");
    const { instructions } = await install("XXX-atk", files);
    assert.deepEqual(instructions, [
      copy(sep("AnvilToolkit", "anviltoolkit.exe"), "anviltoolkit.exe"),
      copy(sep("AnvilToolkit", "Data", "x.dll"), sep("Data", "x.dll")),
      modType("XXX-atk"),
    ]);
  });

  it("AnvilToolkit at the top of the archive installs everything as is", async () => {
    const { instructions } = await install("XXX-atk", tree("anviltoolkit.exe", "lib/x.dll"));
    assert.deepEqual(instructions, [
      copy("anviltoolkit.exe", "anviltoolkit.exe"),
      copy(sep("lib", "x.dll"), sep("lib", "x.dll")),
      modType("XXX-atk"),
    ]);
  });

  it("Extracted at the top keeps its path", async () => {
    const { instructions } = await install(
      "XXX-extracted",
      tree("Extracted/X.forge/a.data", "Extracted/X.forge/sub/b.dat"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Extracted", "X.forge", "a.data"), sep("Extracted", "X.forge", "a.data")),
      copy(
        sep("Extracted", "X.forge", "sub", "b.dat"),
        sep("Extracted", "X.forge", "sub", "b.dat"),
      ),
      modType("XXX-extracted"),
    ]);
  });

  it("Extracted in a wrapper strips the wrapper, and files beside it follow", async () => {
    const files = tree("Mod/Extracted/X.forge/a.data", "Mod/readme.txt", "Other/z.txt");
    const { instructions } = await install("XXX-extracted", files);
    assert.deepEqual(instructions, [
      copy(sep("Mod", "Extracted", "X.forge", "a.data"), sep("Extracted", "X.forge", "a.data")),
      copy(sep("Mod", "readme.txt"), "readme.txt"),
      modType("XXX-extracted"),
    ]);
  });

  it("known gap: a wrapper folder ending in 'Extracted' is kept, doubling the folder", async () => {
    const { instructions } = await install(
      "XXX-extracted",
      tree("MyExtracted/Extracted/X.forge/a.data"),
    );
    assert.equal(
      instructions[0].destination,
      sep("Extracted", "Extracted", "X.forge", "a.data"),
      "should be Extracted\\X.forge\\a.data",
    );
  });

  it("a .forge folder is placed inside Extracted, wrapper stripped", async () => {
    const top = await install("XXX-forgefolder", tree("X.forge/a.data", "X.forge/sub/b.dat"));
    assert.deepEqual(top.instructions, [
      copy(sep("X.forge", "a.data"), sep("Extracted", "X.forge", "a.data")),
      copy(sep("X.forge", "sub", "b.dat"), sep("Extracted", "X.forge", "sub", "b.dat")),
      modType("XXX-forgefolder"),
    ]);
    const wrapped = await install("XXX-forgefolder", tree("Mod/X.forge/a.data", "Other/z.txt"));
    assert.deepEqual(wrapped.instructions, [
      copy(sep("Mod", "X.forge", "a.data"), sep("Extracted", "X.forge", "a.data")),
      modType("XXX-forgefolder"),
    ]);
  });

  it("a .data folder is placed under the rename placeholder and the user is told", async () => {
    const { instructions } = await install(
      "XXX-datafolder",
      tree("Foo.data/a.bin", "Foo.data/sub/b.bin"),
      path.join(STAGING, "My Mod.installing"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Foo.data", "a.bin"), sep("Extracted", RENAME, "Foo.data", "a.bin")),
      copy(sep("Foo.data", "sub", "b.bin"), sep("Extracted", RENAME, "Foo.data", "sub", "b.bin")),
      modType("XXX-datafolder"),
    ]);
    const [notification] = ext.notifications;
    assert.equal(notification.id, "XXX-installerrenamingrequired");
    assert.equal(notification.type, "warning");
    assert.equal(notification.message, "MANUAL FOLDER RENAMING REQUIRED FOR My Mod");
    assert.equal(notification.allowSuppress, true);
    assert.deepEqual(
      notification.actions.map(({ title }) => title),
      ["More"],
    );
  });

  it("a .data folder in a wrapper drops the wrapper", async () => {
    const { instructions } = await install(
      "XXX-datafolder",
      tree("Mod/Foo.data/a.bin", "Other/z.txt"),
      path.join(STAGING, "My Mod.installing"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Mod", "Foo.data", "a.bin"), sep("Extracted", RENAME, "Foo.data", "a.bin")),
      modType("XXX-datafolder"),
    ]);
  });

  it("loose .data files go under the rename placeholder and the user is told", async () => {
    const { instructions } = await install(
      "XXX-loosedata",
      tree("a.data", "b.txt"),
      path.join(STAGING, "Loose Mod.installing"),
    );
    assert.deepEqual(instructions, [
      copy("a.data", sep("Extracted", RENAME, "a.data")),
      copy("b.txt", sep("Extracted", RENAME, "b.txt")),
      modType("XXX-loosedata"),
    ]);
    assert.equal(ext.notifications.at(-1).message, "MANUAL FOLDER RENAMING REQUIRED FOR Loose Mod");
  });

  it("loose .data files keep only the folder holding the first one", async () => {
    const { instructions } = await install(
      "XXX-loosedata",
      tree("Mod/sub/a.data", "Mod/sub/b.txt", "Mod/other.txt"),
      path.join(STAGING, "Loose Mod.installing"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Mod", "sub", "a.data"), sep("Extracted", RENAME, "a.data")),
      copy(sep("Mod", "sub", "b.txt"), sep("Extracted", RENAME, "b.txt")),
      modType("XXX-loosedata"),
    ]);
  });

  it("a .forge file goes to the game root, wrapper stripped", async () => {
    const { instructions } = await install(
      "XXX-forgefile",
      tree("Mod/Game.forge", "Mod/sub/b.txt", "Other/z.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Mod", "Game.forge"), "Game.forge"),
      copy(sep("Mod", "sub", "b.txt"), sep("sub", "b.txt")),
      modType("XXX-forgefile"),
    ]);
  });

  it("root folders keep their folder name at the top of the destination", async () => {
    const top = await install("XXX-root", tree("videos/a.bk2", "videos/sub/b.bk2"));
    assert.deepEqual(top.instructions, [
      copy(sep("videos", "a.bk2"), sep("videos", "a.bk2")),
      copy(sep("videos", "sub", "b.bk2"), sep("videos", "sub", "b.bk2")),
      modType("XXX-root"),
    ]);
    const wrapped = await install(
      "XXX-root",
      tree("Mod/videos/a.bk2", "Mod/readme.txt", "Other/z.txt"),
    );
    assert.deepEqual(wrapped.instructions, [
      copy(sep("Mod", "videos", "a.bk2"), sep("videos", "a.bk2")),
      copy(sep("Mod", "readme.txt"), "readme.txt"),
      modType("XXX-root"),
    ]);
  });

  it("known gap: a wrapper folder ending in a root folder's name is kept, doubling the folder", async () => {
    const { instructions } = await install("XXX-root", tree("HD videos/videos/a.bk2"));
    assert.equal(
      instructions[0].destination,
      sep("videos", "videos", "a.bk2"),
      "should be videos\\a.bk2",
    );
  });

  it("the fallback copies everything as it is, retypes to root, and notifies", async () => {
    const { instructions } = await install(
      "XXX-fallback",
      tree("readme.txt", "docs/a.txt"),
      path.join(STAGING, "My Mod.installing"),
    );
    assert.deepEqual(instructions, [
      copy("readme.txt", "readme.txt"),
      copy(sep("docs", "a.txt"), sep("docs", "a.txt")),
      modType("XXX-root"),
    ]);
    const [notification] = ext.notifications.slice(-1);
    assert.equal(notification.id, "XXX-MyMod-fallback");
    assert.equal(notification.type, "info");
    assert.equal(notification.message, "Fallback installer reached for My Mod");
  });

  it("the fallback notice id is built from the first 20 letters and digits of the name", async () => {
    await install(
      "XXX-fallback",
      tree("a.txt"),
      path.join(STAGING, "A very, very long mod name 12345.installing"),
    );
    assert.equal(ext.notifications.at(-1).id, "XXX-Averyverylongmodname-fallback");
  });

  it("known gap: a mod name with a character plus 'rar', 'zip' or '7z' loses those letters in the rename notice", async () => {
    await install(
      "XXX-datafolder",
      tree("Foo.data/a.bin"),
      path.join(STAGING, "Hunter rarity.installing"),
    );
    assert.equal(
      ext.notifications.at(-1).message,
      "MANUAL FOLDER RENAMING REQUIRED FOR Hunterity",
      "should name Hunter rarity",
    );
  });
});

describe("template-anvilengine: install output for the optional features", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, { transform: EVERYTHING });
  });

  const install = (id, files, ...rest) => installerOf(ext, id).install(files, ...rest);

  it("Forger keeps the folder holding forger.exe", async () => {
    const { instructions } = await install(
      "XXX-forger",
      tree("Forger/forger.exe", "Forger/lib/a.dll", "Other/z.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Forger", "forger.exe"), "forger.exe"),
      copy(sep("Forger", "lib", "a.dll"), sep("lib", "a.dll")),
      modType("XXX-forger"),
    ]);
  });

  it("Forger patches keep the folder holding the first .forger2", async () => {
    const { instructions } = await install(
      "XXX-forgerpatch",
      tree("Patches/a.forger2", "Patches/b.txt", "Other/z.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Patches", "a.forger2"), "a.forger2"),
      copy(sep("Patches", "b.txt"), "b.txt"),
      modType("XXX-forgerpatch"),
    ]);
  });

  it("sound banks keep the folder holding the first .pck", async () => {
    const { instructions } = await install(
      "XXX-sound",
      tree("Bank/a.pck", "Bank/b.pck", "Other/z.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Bank", "a.pck"), "a.pck"),
      copy(sep("Bank", "b.pck"), "b.pck"),
      modType("XXX-sound"),
    ]);
  });

  it("the fixes package keeps the folder holding its marker dll", async () => {
    const { instructions } = await install(
      "XXX-fixes",
      tree("Fix/version.dll", "Fix/x.ini", "Other/z.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Fix", "version.dll"), "version.dll"),
      copy(sep("Fix", "x.ini"), "x.ini"),
      modType("XXX-fixes"),
    ]);
  });

  it("the ResoRep package keeps the folder holding d3d11.dll", async () => {
    const { instructions } = await install(
      "XXX-resorep",
      tree("ResoRep/d3d11.dll", "ResoRep/x.bat", "Other/z.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("ResoRep", "d3d11.dll"), "d3d11.dll"),
      copy(sep("ResoRep", "x.bat"), "x.bat"),
      modType("XXX-resorep"),
    ]);
  });

  it("ResoRep textures keep the folder holding the first .dds", async () => {
    const { instructions } = await install(
      "XXX-resoreptextures",
      tree("Tex/a.dds", "Tex/sub/b.dds", "Other/z.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Tex", "a.dds"), "a.dds"),
      copy(sep("Tex", "sub", "b.dds"), sep("sub", "b.dds")),
      modType("XXX-resoreptextures"),
    ]);
  });

  it("DLC folders keep their folder name, wrapper stripped", async () => {
    const top = await install("XXX-dlcfolder", tree("dlc_10/Extracted/X.forge/a.data"));
    assert.deepEqual(top.instructions, [
      copy(
        sep("dlc_10", "Extracted", "X.forge", "a.data"),
        sep("dlc_10", "Extracted", "X.forge", "a.data"),
      ),
      modType("XXX-dlcfolder"),
    ]);
    const wrapped = await install("XXX-dlcfolder", tree("Mod/dlc_11/x.bin", "Other/z.txt"));
    assert.deepEqual(wrapped.instructions, [
      copy(sep("Mod", "dlc_11", "x.bin"), sep("dlc_11", "x.bin")),
      modType("XXX-dlcfolder"),
    ]);
  });

  it("patch textures are copied exactly as packed", async () => {
    const textures = await loadExtension(DIR, { transform: setConst("hasPatchTextures", "true") });
    const { instructions } = await installerOf(textures, "XXX-forgerpatchtextures").install(
      tree("Mod/a.dds", "b.txt"),
    );
    assert.deepEqual(instructions, [
      copy(sep("Mod", "a.dds"), sep("Mod", "a.dds")),
      copy("b.txt", "b.txt"),
      modType("XXX-forgerpatchtextures"),
    ]);
  });

  describe("DLC .forge routing", () => {
    it("routes a DLC .forge into its DLC folder and leaves a root .forge at the root", async () => {
      const { instructions } = await install(
        "XXX-forgefile",
        tree("Game_10_dlc.forge", "Game_11_dlc.forge", "Game.forge", "Game_3_something.forge"),
      );
      assert.deepEqual(instructions, [
        copy("Game_10_dlc.forge", sep("dlc_10", "Game_10_dlc.forge")),
        copy("Game_11_dlc.forge", sep("dlc_11", "Game_11_dlc.forge")),
        copy("Game.forge", "Game.forge"),
        copy("Game_3_something.forge", "Game_3_something.forge"),
        modType("XXX-forgefile"),
      ]);
    });

    it("matches the DLC number whatever the case of the file name", async () => {
      const { instructions } = await install("XXX-forgefile", tree("GAME_10_DLC.FORGE"));
      assert.equal(instructions[0].destination, sep("dlc_10", "GAME_10_DLC.FORGE"));
    });

    it("strips a wrapper before routing", async () => {
      const { instructions } = await install("XXX-forgefile", tree("Mod/Game_11_dlc.forge"));
      assert.equal(instructions[0].destination, sep("dlc_11", "Game_11_dlc.forge"));
    });

    it("matches the _NN_dlc segment, so a bare number in the name does not route", async () => {
      const { instructions } = await install(
        "XXX-forgefile",
        tree("DataPC_boot_10_something.forge"),
      );
      assert.equal(instructions[0].destination, "DataPC_boot_10_something.forge");
    });

    it("ensures the DLC Extracted folders exist during setup", async () => {
      const gameDir = makeGameDir();
      const state = stateFor({ gameDir, mods: modsOf("XXX-atk") });
      const dlc = await loadExtension(DIR, { transform: withDlc, state });
      await dlc.game.setup({ path: gameDir });
      assert.ok(fs.existsSync(path.join(gameDir, "dlc_10", "Extracted")));
      assert.ok(fs.existsSync(path.join(gameDir, "dlc_11", "Extracted")));
    });
  });
});

describe("template-anvilengine: mod type paths", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, { transform: EVERYTHING, state: stateFor({ gameDir }) });
  });

  const pathOf = (id) => ext.modTypes.find((type) => type.id === id).getPath({ id: GAME_ID });

  it("deploys the folder and tool mod types to the game folder", () => {
    for (const id of [
      "XXX-extracted",
      "XXX-forgefolder",
      "XXX-datafolder",
      "XXX-loosedata",
      "XXX-forgefile",
      "XXX-root",
      "XXX-atk",
      "XXX-forger",
      "XXX-reforgerinstall",
      "XXX-dlcfolder",
      "XXX-fixes",
      "XXX-binaries",
      "XXX-resorep",
    ]) {
      assert.equal(pathOf(id), gameDir, id);
    }
  });

  it("deploys Forger patches, sound banks and ResoRep textures to their own subfolders", () => {
    assert.equal(pathOf("XXX-forgerpatch"), path.join(gameDir, "ForgerPatches"));
    assert.equal(pathOf("XXX-sound"), path.join(gameDir, "sounddata", "pc"));
    assert.equal(pathOf("XXX-resoreptextures"), path.join(gameDir, "ResoRep", "modded"));
  });

  it("deploys patch textures to ForgerPatches", async () => {
    const textures = await loadExtension(DIR, {
      transform: setConst("hasPatchTextures", "true"),
      state: stateFor({ gameDir }),
    });
    const type = textures.modTypes.find(({ id }) => id === "XXX-forgerpatchtextures");
    assert.equal(type.getPath({ id: GAME_ID }), path.join(gameDir, "ForgerPatches"));
  });

  it("is offered for this game only, once it is discovered", async () => {
    const root = ext.modTypes.find(({ id }) => id === "XXX-root");
    assert.equal(root.isSupported(GAME_ID), true);
    assert.equal(root.isSupported("someothergame"), false);
    const both = stateFor({ gameDir });
    both.settings.gameMode.discovered.someothergame = { path: gameDir };
    const shared = await loadExtension(DIR, { state: both });
    assert.equal(shared.modTypes[0].isSupported("someothergame"), false);
    const undiscovered = await loadExtension(DIR);
    assert.equal(undiscovered.modTypes[0].isSupported(GAME_ID), false);
    assert.equal(await root.test(), false);
  });

  it("reports a missing game folder instead of throwing", async () => {
    const state = stateFor({ gameDir });
    delete state.settings.gameMode.discovered;
    const broken = await loadExtension(DIR, { state });
    assert.equal(broken.modTypes[0].getPath({ id: GAME_ID }), undefined);
    assert.equal(broken.errors.length, 1);
    assert.equal(
      broken.errors[0][0],
      "Failed to locate executable. Please launch the game at least once.",
    );
  });

  it("names every mod type for the Vortex mod type picker", () => {
    assert.ok(
      ext.modTypes.every(({ options }) => typeof options.name === "string" && options.name),
    );
  });
});

describe("template-anvilengine: game definition", () => {
  it("runs the one executable on every store", async () => {
    const ext = await loadExtension(DIR);
    assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
    assert.equal(ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])), "XXX.exe");
    assert.equal(ext.game.queryModPath(), ".");
  });

  it("asks only Steam to launch through its launcher", async () => {
    const { requiresLauncher } = (await loadExtension(DIR)).game;
    assert.deepEqual(await requiresLauncher("", "steam"), { launcher: "steam" });
    for (const store of ["epic", "gog", "xbox", "uplay"]) {
      assert.equal(await requiresLauncher("", store), undefined, store);
    }
  });

  describe("finding the game", () => {
    const INSTALL = "C:\\Games\\Ubisoft\\XXX";

    it("reads the Ubisoft Connect install folder from the registry", async () => {
      const ext = await withWinapi(registry({ [UBISOFT]: INSTALL }), () => loadExtension(DIR));
      vortex.gameStore.findByAppId = () => Promise.reject(new Error("store should not be asked"));
      assert.equal(await ext.game.queryPath(), INSTALL);
    });

    it("asks the store helper for every discovery id when the registry has no entry", async () => {
      const ext = await loadExtension(DIR);
      let asked;
      vortex.gameStore.findByAppId = (ids) => {
        asked = ids;
        return Promise.resolve({ gamePath: "C:\\Steam\\XXX" });
      };
      assert.equal(await ext.game.queryPath(), "C:\\Steam\\XXX");
      assert.deepEqual(asked, ["XXX", "XXX"]);
    });

    it("falls back to the store helper when the registry value is empty", async () => {
      const winapi = { RegGetValue: () => null };
      const ext = await withWinapi(winapi, () => loadExtension(DIR));
      vortex.gameStore.findByAppId = () => Promise.resolve({ gamePath: "C:\\Steam\\XXX" });
      assert.equal(await ext.game.queryPath(), "C:\\Steam\\XXX");
    });

    it("reports not installed as a rejection", async () => {
      const ext = await loadExtension(DIR);
      await assert.rejects(ext.game.queryPath());
    });
  });
});

describe("template-anvilengine: game version", () => {
  const manifestOf = (gameDir, text, mtimeSeconds = 1_700_000_000) => {
    const file = path.join(gameDir, "uplay_install.manifest");
    fs.writeFileSync(file, text);
    fs.utimesSync(file, mtimeSeconds, mtimeSeconds);
  };
  const md5 = (text) => crypto.createHash("md5").update(text).digest("hex");

  function steamInstall(buildId, { appId = "12345", acf } = {}) {
    const library = makeTempDir();
    const gamePath = path.join(library, "steamapps", "common", "Some Game");
    fs.mkdirSync(gamePath, { recursive: true });
    fs.writeFileSync(
      path.join(library, "steamapps", `appmanifest_${appId}.acf`),
      acf ?? `"AppState"\n{\n\t"appid"\t\t"${appId}"\n\t"buildid"\t\t"${buildId}"\n}\n`,
    );
    return gamePath;
  }
  const withSteam = setConst("STEAMAPP_ID", '"12345"');
  const withEpic = setConst("EPICAPP_ID", '"epic1"');
  const withGog = setConst("GOGAPP_ID", '"gog1"');

  it("falls back to the executable's product version when nothing else answers", async () => {
    const ext = await loadExtension(DIR);
    assert.equal(await ext.game.getGameVersion(makeGameDir()), STUB_EXE_VERSION);
  });

  it("reads the version from the game's own executable", async () => {
    const ext = await loadExtension(DIR);
    const gameDir = makeGameDir();
    const read = [];
    const version = await withExeVersion(
      (file) => {
        read.push(file);
        return "9.8.7.6";
      },
      () => ext.game.getGameVersion(gameDir),
    );
    assert.equal(version, "9.8.7.6");
    assert.deepEqual(read, [path.join(gameDir, "XXX.exe")]);
  });

  it("reports 0.0.0 when even the executable cannot be read", async () => {
    const ext = await loadExtension(DIR);
    const version = await withExeVersion(
      () => {
        throw new Error("no version resource");
      },
      () => ext.game.getGameVersion(makeGameDir()),
    );
    assert.equal(version, "0.0.0");
    assert.ok(vortex.logs.some(({ level }) => level === "error"));
  });

  it("uses the executable first when the game stamps its version into it", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("exeHasGameVersion", "true") });
    const gameDir = makeGameDir();
    manifestOf(gameDir, "ignored");
    assert.equal(await ext.game.getGameVersion(gameDir), STUB_EXE_VERSION);
  });

  it("carries on to the store and hash when the executable cannot be read", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("exeHasGameVersion", "true") });
    const gameDir = makeGameDir();
    manifestOf(gameDir, "manifest text");
    const version = await withExeVersion(
      () => {
        throw new Error("no version resource");
      },
      () => ext.game.getGameVersion(gameDir),
    );
    assert.equal(version, md5("manifest text"));
  });

  describe("Steam build id", () => {
    it("reads the build id from the appmanifest of the library holding the game", async () => {
      const ext = await loadExtension(DIR, { transform: withSteam });
      assert.equal(await ext.game.getGameVersion(steamInstall("9988776")), "9988776");
    });

    it("finds the library from a folder deeper than the game folder", async () => {
      const ext = await loadExtension(DIR, { transform: withSteam });
      const deeper = path.join(steamInstall("4455"), "bin");
      fs.mkdirSync(deeper);
      assert.equal(await ext.game.getGameVersion(deeper), "4455");
    });

    it("skips Steam when the app id is still the placeholder", async () => {
      const ext = await loadExtension(DIR);
      const gameDir = steamInstall("9988776", { appId: "XXX" });
      assert.equal(await ext.game.getGameVersion(gameDir), STUB_EXE_VERSION);
    });

    it("skips Steam when the game is not under steamapps/common", async () => {
      const ext = await loadExtension(DIR, { transform: withSteam });
      assert.equal(await ext.game.getGameVersion(makeGameDir()), STUB_EXE_VERSION);
    });

    it("skips Steam when the manifest has no build id or belongs to another app", async () => {
      const ext = await loadExtension(DIR, { transform: withSteam });
      assert.equal(
        await ext.game.getGameVersion(steamInstall("1", { acf: '"AppState"\n{\n}\n' })),
        STUB_EXE_VERSION,
      );
      assert.equal(
        await ext.game.getGameVersion(steamInstall("1", { appId: "99999" })),
        STUB_EXE_VERSION,
      );
    });
  });

  describe("Epic app version", () => {
    function epicData(items) {
      const dataDir = makeTempDir();
      fs.mkdirSync(path.join(dataDir, "Manifests"));
      for (const [name, content] of Object.entries(items)) {
        fs.writeFileSync(
          path.join(dataDir, "Manifests", name),
          typeof content === "string" ? content : JSON.stringify(content),
        );
      }
      return dataDir;
    }
    const versionFor = (gameDir, dataDir, transform = withEpic) =>
      withWinapi(registry(dataDir ? { [EPIC]: dataDir } : {}), async () => {
        const ext = await loadExtension(DIR, { transform });
        return ext.game.getGameVersion(gameDir);
      });

    it("reads the version of the manifest naming this app", async () => {
      const dataDir = epicData({
        "other.item": { AppName: "other", AppVersionString: "9.9.9" },
        "ours.item": { AppName: "epic1", AppVersionString: "1.2.3-epic" },
      });
      assert.equal(await versionFor(makeGameDir(), dataDir), "1.2.3-epic");
    });

    it("matches a manifest by install folder, whatever the case", async () => {
      const gameDir = makeGameDir();
      const dataDir = epicData({
        "ours.item": {
          AppName: "differentname",
          InstallLocation: gameDir.toUpperCase(),
          AppVersionString: "5.5.5",
        },
      });
      assert.equal(await versionFor(gameDir, dataDir), "5.5.5");
    });

    it("skips files that are not manifests, unreadable manifests and ones without a version", async () => {
      const dataDir = epicData({
        "a-notes.txt": { AppName: "epic1", AppVersionString: "1.1.1" },
        "b-broken.item": "{ not json",
        "c-noversion.item": { AppName: "epic1" },
        "d-good.item": { AppName: "epic1", AppVersionString: "7.7.7" },
      });
      assert.equal(await versionFor(makeGameDir(), dataDir), "7.7.7");
    });

    it("skips Epic when the app id is still the placeholder", async () => {
      const dataDir = epicData({ "ours.item": { AppName: "XXX", AppVersionString: "1.2.3" } });
      const placeholder = setConst("EPICAPP_ID", '"XXX"');
      assert.equal(await versionFor(makeGameDir(), dataDir, placeholder), STUB_EXE_VERSION);
    });

    it("skips Epic when no manifest matches or the manifests folder is missing", async () => {
      const dataDir = epicData({ "other.item": { AppName: "other", AppVersionString: "9.9.9" } });
      assert.equal(await versionFor(makeGameDir(), dataDir), STUB_EXE_VERSION);
      assert.equal(await versionFor(makeGameDir(), makeTempDir()), STUB_EXE_VERSION);
    });

    it("skips Epic when the app id is not set", async () => {
      const dataDir = epicData({ "ours.item": { AppName: "epic1", AppVersionString: "1.2.3" } });
      assert.equal(await versionFor(makeGameDir(), dataDir, (source) => source), STUB_EXE_VERSION);
    });

    it("looks in the shared ProgramData folder when the registry has no Epic data path", async () => {
      const programData = makeTempDir();
      const manifests = path.join(programData, "Epic", "EpicGamesLauncher", "Data", "Manifests");
      fs.mkdirSync(manifests, { recursive: true });
      fs.writeFileSync(
        path.join(manifests, "ours.item"),
        JSON.stringify({ AppName: "epic1", AppVersionString: "3.3.3" }),
      );
      const version = await withEnv({ ProgramData: programData }, () =>
        versionFor(makeGameDir(), undefined),
      );
      assert.equal(version, "3.3.3");
    });
  });

  describe("GOG version", () => {
    const versionFor = (gameDir, entries) =>
      withWinapi(registry(entries), async () => {
        const ext = await loadExtension(DIR, { transform: withGog });
        return ext.game.getGameVersion(gameDir);
      });

    it("reads the version when the registered install path is this folder", async () => {
      const gameDir = makeGameDir();
      const entries = { [GOG("path")]: gameDir.toUpperCase(), [GOG("ver")]: "2.0.0.1" };
      assert.equal(await versionFor(gameDir, entries), "2.0.0.1");
    });

    it("skips GOG when the registered install path is another folder", async () => {
      const entries = { [GOG("path")]: makeGameDir(), [GOG("ver")]: "2.0.0.1" };
      assert.equal(await versionFor(makeGameDir(), entries), STUB_EXE_VERSION);
    });

    it("skips GOG when the registry has no entry", async () => {
      assert.equal(await versionFor(makeGameDir(), {}), STUB_EXE_VERSION);
    });

    it("skips GOG when the app id is still the placeholder", async () => {
      const gameDir = makeGameDir();
      const key = (name) => `${HKLM}|SOFTWARE\\WOW6432Node\\GOG.com\\Games\\XXX|${name}`;
      const entries = { [key("path")]: gameDir, [key("ver")]: "2.0.0.1" };
      const version = await withWinapi(registry(entries), async () => {
        const ext = await loadExtension(DIR, { transform: setConst("GOGAPP_ID", '"XXX"') });
        return ext.game.getGameVersion(gameDir);
      });
      assert.equal(version, STUB_EXE_VERSION);
    });

    it("skips GOG when the app id is not set", async () => {
      const gameDir = makeGameDir();
      const entries = { [GOG("path")]: gameDir, [GOG("ver")]: "2.0.0.1" };
      const version = await withWinapi(registry(entries), async () => {
        const ext = await loadExtension(DIR);
        return ext.game.getGameVersion(gameDir);
      });
      assert.equal(version, STUB_EXE_VERSION);
    });
  });

  describe("store order", () => {
    it("prefers Steam over Epic over GOG over the manifest hash", async () => {
      const gameDir = steamInstall("111");
      manifestOf(gameDir, "hash text");
      const dataDir = makeTempDir();
      fs.mkdirSync(path.join(dataDir, "Manifests"));
      fs.writeFileSync(
        path.join(dataDir, "Manifests", "a.item"),
        JSON.stringify({ AppName: "epic1", AppVersionString: "epic-version" }),
      );
      const entries = {
        [EPIC]: dataDir,
        [GOG("path")]: gameDir,
        [GOG("ver")]: "gog-version",
      };
      const versions = [];
      for (const transform of [
        all(withSteam, withEpic, withGog),
        all(withEpic, withGog),
        withGog,
        (source) => source,
      ]) {
        versions.push(
          await withWinapi(registry(entries), async () => {
            const ext = await loadExtension(DIR, { transform });
            return ext.game.getGameVersion(gameDir);
          }),
        );
      }
      assert.deepEqual(versions, ["111", "epic-version", "gog-version", md5("hash text")]);
    });
  });

  describe("Ubisoft Connect manifest hash", () => {
    it("hashes uplay_install.manifest", async () => {
      const ext = await loadExtension(DIR);
      const gameDir = makeGameDir();
      manifestOf(gameDir, "first build");
      assert.equal(await ext.game.getGameVersion(gameDir), md5("first build"));
    });

    it("keeps the hash it computed while the manifest's modified time is unchanged", async () => {
      const ext = await loadExtension(DIR);
      const gameDir = makeGameDir();
      manifestOf(gameDir, "first build");
      assert.equal(await ext.game.getGameVersion(gameDir), md5("first build"));
      manifestOf(gameDir, "second build!", 1_700_000_000);
      assert.equal(await ext.game.getGameVersion(gameDir), md5("first build"));
    });

    it("hashes again once the manifest's modified time changes", async () => {
      const ext = await loadExtension(DIR);
      const gameDir = makeGameDir();
      manifestOf(gameDir, "first build");
      assert.equal(await ext.game.getGameVersion(gameDir), md5("first build"));
      manifestOf(gameDir, "second build", 1_700_000_500);
      assert.equal(await ext.game.getGameVersion(gameDir), md5("second build"));
    });
  });
});

describe("template-anvilengine: setup", () => {
  it("ensures the Extracted folder exists", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR, { state: stateFor({ gameDir, mods: modsOf("XXX-atk") }) });
    await ext.game.setup({ path: gameDir });
    assert.ok(fs.existsSync(path.join(gameDir, "Extracted")));
    assert.equal(fs.existsSync(path.join(gameDir, "ForgerPatches")), false);
  });

  it("ensures each enabled feature's folder exists", async () => {
    const gameDir = makeGameDir();
    const mods = modsOf("XXX-atk", "XXX-forger", "XXX-resorep");
    const ext = await loadExtension(DIR, {
      transform: EVERYTHING,
      state: stateFor({ gameDir, mods }),
    });
    await ext.game.setup({ path: gameDir });
    for (const folder of [
      "Extracted",
      path.join("sounddata", "pc"),
      "ForgerPatches",
      path.join("ResoRep", "modded"),
      path.join("dlc_10", "Extracted"),
      path.join("dlc_11", "Extracted"),
    ]) {
      assert.ok(fs.existsSync(path.join(gameDir, folder)), folder);
    }
  });

  it("creates ForgerPatches for patch textures too", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR, {
      transform: setConst("hasPatchTextures", "true"),
      state: stateFor({ gameDir, mods: modsOf("XXX-atk") }),
    });
    await ext.game.setup({ path: gameDir });
    assert.ok(fs.existsSync(path.join(gameDir, "ForgerPatches")));
  });

  it("shows the setup notice only when it is switched on", async () => {
    const gameDir = makeGameDir();
    const state = () => stateFor({ gameDir, mods: modsOf("XXX-atk") });
    const quiet = await loadExtension(DIR, { state: state() });
    await quiet.game.setup({ path: gameDir });
    assert.deepEqual(quiet.notifications, []);

    const loud = await loadExtension(DIR, {
      transform: setConst("setupNotification", "true"),
      state: state(),
    });
    await loud.game.setup({ path: gameDir });
    assert.deepEqual(
      loud.notifications.map(({ id, message }) => [id, message]),
      [["XXX-setup-notify", "Special Setup Instructions"]],
    );
  });

  it("setup instructions dialog offers Acknowledge and Never Show Again", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR, {
      transform: setConst("setupNotification", "true"),
      state: stateFor({ gameDir, mods: modsOf("XXX-atk") }),
    });
    const suppressed = [];
    ext.api.suppressNotification = (id) => suppressed.push(id);
    await ext.game.setup({ path: gameDir });
    let dismissed = 0;
    ext.notifications[0].actions[0].action(() => dismissed++);
    const [, , , buttons] = ext.dialogs[0];
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Acknowledge", "Never Show Again"],
    );
    buttons[0].action();
    buttons[1].action();
    assert.deepEqual(suppressed, ["XXX-setup-notify"]);
    assert.equal(dismissed, 2);
  });
});

// What a download request looks like to Vortex: the urls, the info, and the options handed to start-download.
function recordRequests(ext) {
  const requests = { download: [], install: [] };
  ext.api.events.on("start-download", (urls, info, _x, _callback, _y, options) =>
    requests.download.push({ urls, info, options }),
  );
  ext.api.events.on("start-install-download", (downloadId, options) =>
    requests.install.push({ downloadId, options }),
  );
  return requests;
}

// The two tools fetched from a Nexus page during setup share one routine in the template, so
// the same checks run against each.
const NEXUS_TOOLS = [
  {
    label: "AnvilToolkit",
    name: "AnvilToolkit",
    type: "XXX-atk",
    domain: "site",
    page: 455,
    file: 3699,
    transform: undefined,
    installed: [],
    // The mods that stand in for every other download setup would make first.
    others: [],
  },
  {
    label: "Forger",
    name: "Forger Patch Manager",
    type: "XXX-forger",
    domain: "assassinscreedodyssey",
    page: 42,
    file: 716,
    transform: setConst("hasForger", "true"),
    installed: ["XXX-atk"],
    others: ["XXX-atk"],
  },
];

for (const tool of NEXUS_TOOLS) {
  describe(`template-anvilengine: ${tool.label} download`, () => {
    const url = (file = tool.file) => `nxm://${tool.domain}/mods/${tool.page}/files/${file}`;
    const filesPage = `https://www.nexusmods.com/${tool.domain}/mods/${tool.page}/files/?tab=files`;
    const progressId = `${tool.type}-installing`;

    async function setupOnly({ mods = tool.others } = {}) {
      const ext = await loadExtension(DIR, {
        transform: tool.transform,
        state: stateFor({ mods: modsOf(...mods) }),
      });
      const dismissed = [];
      ext.api.dismissNotification = (id) => dismissed.push(id);
      return { ext, dismissed };
    }

    it("downloads and installs it during setup when it is missing", async () => {
      const { ext, dismissed } = await setupOnly();
      const seen = answerDownloads(ext);
      const requests = recordRequests(ext);
      await ext.game.setup({ path: makeGameDir() });

      assert.deepEqual(seen[0], {
        event: "start-download",
        urls: [url()],
        info: { game: "XXX", name: tool.name },
      });
      assert.equal(seen[1].downloadId, "download-1");
      assert.deepEqual(requests.download[0].options, { allowInstall: false });
      assert.deepEqual(requests.install[0].options, { allowAutoEnable: false });
      assert.deepEqual(
        ext.dispatched.map(({ type }) => type),
        ["setModsEnabled", "setModType"],
      );
      assert.deepEqual(ext.dispatched[0].payload.slice(1), [
        "profile",
        ["mod-1"],
        true,
        { allowAutoDeploy: true, installed: true },
      ]);
      assert.deepEqual(ext.dispatched[1].payload, ["XXX", "mod-1", tool.type]);
      const [progress] = ext.notifications;
      assert.deepEqual(
        [progress.id, progress.message, progress.type, progress.noDismiss, progress.allowSuppress],
        [progressId, `Installing ${tool.name}`, "activity", true, false],
      );
      assert.deepEqual(dismissed, [progressId]);
    });

    it("skips the download when it is already installed", async () => {
      const { ext } = await setupOnly({ mods: [...tool.others, tool.type] });
      const seen = answerDownloads(ext);
      await ext.game.setup({ path: makeGameDir() });
      assert.deepEqual(seen, []);
      assert.deepEqual(ext.dispatched, []);
    });

    it("prefers the newest main file on the Nexus page", async () => {
      const { ext } = await setupOnly();
      const seen = answerDownloads(ext);
      const asked = [];
      ext.api.ext.nexusGetModFiles = async (domain, page) => {
        asked.push([domain, page]);
        return [
          { category_id: 1, file_id: 11, uploaded_time: "100" },
          { category_id: 1, file_id: 12, uploaded_time: "200" },
          { category_id: 1, file_id: 10, uploaded_time: "50" },
          { category_id: 2, file_id: 99, uploaded_time: "300" },
        ];
      };
      await ext.game.setup({ path: makeGameDir() });
      assert.deepEqual(asked, [[tool.domain, tool.page]]);
      assert.deepEqual(seen[0].urls, [url(12)]);
    });

    it("falls back to the pinned file when the page has no main file", async () => {
      const { ext } = await setupOnly();
      const seen = answerDownloads(ext);
      ext.api.ext.nexusGetModFiles = async () => [
        { category_id: 2, file_id: 99, uploaded_time: "1" },
      ];
      await ext.game.setup({ path: makeGameDir() });
      assert.deepEqual(seen[0].urls, [url()]);
    });

    it("waits for the Nexus login when the extension offers one", async () => {
      const { ext } = await setupOnly();
      answerDownloads(ext);
      const order = [];
      ext.api.ext.ensureLoggedIn = async () => order.push("login");
      ext.api.events.on("start-download", () => order.push("download"));
      await ext.game.setup({ path: makeGameDir() });
      assert.deepEqual(order, ["login", "download"]);
    });

    it("reports a failed download, opens the files page, and stops the progress notice", async () => {
      const { ext, dismissed } = await setupOnly();
      const opened = stubShell();
      ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
        callback(new Error("boom")),
      );
      await ext.game.setup({ path: makeGameDir() });
      assert.equal(ext.errors[0][0], `Failed to download/install ${tool.name}`);
      assert.equal(ext.errors[0][1].message, "boom");
      assert.deepEqual(opened, [filesPage]);
      assert.deepEqual(dismissed, [progressId]);
    });

    it("reports a second error when the page cannot be opened either", async () => {
      const { ext } = await setupOnly();
      ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
        callback(new Error("boom")),
      );
      await ext.game.setup({ path: makeGameDir() });
      assert.deepEqual(
        ext.errors.map(([message]) => message),
        [`Failed to download/install ${tool.name}`, "Failed to open the URL"],
      );
      assert.deepEqual(ext.errors[1][2], { allowReport: false });
    });
  });
}

describe("template-anvilengine: setup order and switches", () => {
  it("downloads AnvilToolkit first, then Forger", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("hasForger", "true") });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    assert.deepEqual(
      seen.filter(({ event }) => event === "start-download").map(({ info }) => info.name),
      ["AnvilToolkit", "Forger Patch Manager"],
    );
  });

  it("downloads no tool with hasAtk off", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("hasAtk", "false") });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    assert.deepEqual(seen, []);
  });

  it("downloads no Forger with hasForger off", async () => {
    const ext = await loadExtension(DIR, { state: stateFor({ mods: modsOf("XXX-atk") }) });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: makeGameDir() });
    assert.deepEqual(seen, []);
  });
});

describe("template-anvilengine: ReForger", () => {
  const withReforger = flags("hasReforger");
  const autoReforger = flags("hasReforger", "autoDownloadReforger");
  const INSTALLER = "ReForgerInstaller.exe";
  const found = (version) => ({ attributes: { version } });

  describe("finding the tool", () => {
    const pathVia = async (registryAnswers) => {
      const ext = await loadExtension(DIR, { transform: withReforger });
      const tool = ext.game.supportedTools.find(({ id }) => id === "XXX-reforger");
      return withWinapi(registryAnswers, () => tool.queryPath());
    };

    it("reads the install path from the package key whatever version is in its name", async () => {
      const winapi = reforgerRegistry();
      assert.equal(await pathVia(winapi), REFORGER_PATH);
      assert.deepEqual(winapi.opened, [["HKEY_CLASSES_ROOT", REFORGER_PACKAGES]]);
    });

    it("ignores keys that do not carry both the prefix and the suffix", async () => {
      const wrong = ["ReForger_2.1.0.0_arm64__9r43be93mcwwm", "Other_2.1.0.0_x64__9r43be93mcwwm"];
      assert.equal(await pathVia(reforgerRegistry({ keys: wrong })), undefined);
      assert.equal(
        await pathVia(reforgerRegistry({ keys: [...wrong, REFORGER_KEY] })),
        REFORGER_PATH,
      );
    });

    const warnings = () =>
      vortex.logs.filter(({ level }) => level === "warn").map(({ message }) => message);

    it("logs where it found ReForger", async () => {
      await pathVia(reforgerRegistry());
      assert.ok(
        vortex.logs.some(
          ({ level, message }) =>
            level === "info" && message === `ReForger path found at ${REFORGER_PATH}`,
        ),
      );
    });

    it("reports nothing found, and says so, when there is no package key", async () => {
      assert.equal(await pathVia(reforgerRegistry({ keys: [] })), undefined);
      assert.deepEqual(warnings(), ["ReForger path not found"]);
    });

    it("reports nothing found, and says so, when the Path value is missing", async () => {
      assert.equal(await pathVia({ ...reforgerRegistry(), RegGetValue: () => null }), undefined);
      assert.deepEqual(warnings(), ["ReForger path not found"]);
    });

    it("reports nothing found when the registry cannot be read", async () => {
      const denied = {
        WithRegOpen: () => {
          throw new Error("access denied");
        },
      };
      assert.equal(await pathVia(denied), undefined);
      assert.deepEqual(warnings(), [
        "Could not enumerate the ReForger package registry key: access denied",
        "ReForger path not found",
      ]);
      assert.equal(await pathVia({}), undefined);
    });
  });

  describe("automatic download during setup", () => {
    async function setupWith({ mods, installerPresent = true, runFailure } = {}) {
      const gameDir = makeGameDir(installerPresent ? [INSTALLER] : []);
      const fake = fakeDownloader({ mods });
      const ext = await loadExtension(DIR, {
        transform: autoReforger,
        state: stateFor({ gameDir, mods: modsOf("XXX-atk") }),
        bundled: fake.bundled,
      });
      const events = answerDeployEvents(ext);
      const runs = recordRuns(ext, runFailure);
      await ext.game.setup({ path: gameDir });
      return { ext, fake, events, runs, gameDir };
    }

    it("downloads, deploys and runs the installer on a first install", async () => {
      const { fake, events, runs, gameDir } = await setupWith({
        mods: [undefined, found("1.0.0")],
      });
      assert.deepEqual(
        fake.calls.map(([name]) => name),
        ["findModByFile", "download", "findModByFile"],
      );
      assert.equal(fake.calls[0][1], "XXX-reforgerinstall");
      assert.equal(fake.calls[0][2], INSTALLER);
      assert.equal(fake.calls[1][2], false);
      assert.deepEqual(events, [["deploy-mods"]]);
      assert.deepEqual(runs, [[path.join(gameDir, INSTALLER), [], { suggestDeploy: false }]]);
    });

    it("hands the downloader a requirement that deploys the installer as a mod", async () => {
      const { fake, gameDir } = await setupWith({ mods: [undefined, found("1.0.0")] });
      const requirement = fake.calls[1][1][0];
      assert.equal(requirement.archiveFileName, INSTALLER);
      assert.equal(requirement.userFacingName, "ReForger");
      assert.equal(requirement.githubUrl, "https://api.github.com/repos/QuilLeeR/ReForger");
      assert.equal(requirement.directCopyAsMod, true);
      assert.equal(requirement.modType, "XXX-reforgerinstall");
      assert.equal(requirement.assemblyFileName, INSTALLER);
      assert.equal(requirement.directCopyPath, path.join(gameDir, INSTALLER));
    });

    it("looks the installed mod and its version up through the downloader", async () => {
      const { fake } = await setupWith({ mods: [undefined, found("1.0.0")] });
      const requirement = fake.calls[1][1][0];
      fake.calls.length = 0;
      await requirement.findMod({});
      await requirement.resolveVersion({});
      assert.deepEqual(fake.calls, [
        ["findModByFile", "XXX-reforgerinstall", INSTALLER],
        ["resolveVersionByModVersion", requirement],
      ]);
    });

    it("runs the installer again when a newer version landed", async () => {
      const { events, runs } = await setupWith({ mods: [found("1.0.0"), found("1.1.0")] });
      assert.deepEqual(events, [["deploy-mods"]]);
      assert.equal(runs.length, 1);
    });

    it("does nothing more when the download changed nothing", async () => {
      const { events, runs } = await setupWith({ mods: [found("1.0.0"), found("1.0.0")] });
      assert.deepEqual(events, []);
      assert.deepEqual(runs, []);
    });

    it("deploys but does not run an installer that never landed in the game folder", async () => {
      const { events, runs } = await setupWith({
        mods: [undefined, undefined],
        installerPresent: false,
      });
      assert.deepEqual(events, [["deploy-mods"]]);
      assert.deepEqual(runs, []);
    });

    it("allows reporting a launch failure that is not the user's setup", async () => {
      const failure = Object.assign(new Error("denied"), { code: "EPERM" });
      const { ext } = await setupWith({ mods: [undefined, found("1.0.0")], runFailure: failure });
      const [message, error, options] = ext.errors[0];
      assert.equal(
        message,
        "Could not run the ReForger installer. Run ReForgerInstaller.exe from the game folder manually.",
      );
      assert.equal(error, failure);
      assert.deepEqual(options, { allowReport: true });
    });

    it("allows reporting permission, access and missing-file launch failures", async () => {
      for (const code of ["EPERM", "EACCES", "ENOENT"]) {
        const failure = Object.assign(new Error("fail"), { code });
        const { ext } = await setupWith({ mods: [undefined, found("1.0.0")], runFailure: failure });
        assert.deepEqual(ext.errors[0][2], { allowReport: true }, code);
      }
    });

    it("does not offer to report an unrecognised launch failure", async () => {
      const failure = Object.assign(new Error("odd"), { code: "EOTHER" });
      const { ext } = await setupWith({ mods: [undefined, found("1.0.0")], runFailure: failure });
      assert.deepEqual(ext.errors[0][2], { allowReport: false });
    });

    it("downloads nothing during setup unless autoDownloadReforger is on", async () => {
      const gameDir = makeGameDir();
      const fake = fakeDownloader();
      const ext = await loadExtension(DIR, {
        transform: withReforger,
        state: stateFor({ gameDir, mods: modsOf("XXX-atk") }),
        bundled: fake.bundled,
      });
      await ext.game.setup({ path: gameDir });
      assert.deepEqual(fake.calls, []);
    });
  });

  describe("Download ReForger button", () => {
    it("forces the download", async () => {
      const gameDir = makeGameDir([INSTALLER]);
      const fake = fakeDownloader({ mods: [undefined, found("1.0.0")] });
      const ext = await loadExtension(DIR, {
        transform: withReforger,
        state: stateFor({ gameDir, mods: modsOf("XXX-atk") }),
        bundled: fake.bundled,
      });
      answerDeployEvents(ext);
      const runs = recordRuns(ext);
      await ext.game.setup({ path: gameDir });

      ext.registeredActions.find(({ title }) => title === "Download ReForger").action();
      assert.ok(await waitFor(() => runs.length === 1));
      assert.equal(fake.calls.find(([name]) => name === "download")[2], true);
    });

    it("is offered for this game only", async () => {
      const active = await loadExtension(DIR, {
        transform: withReforger,
        state: makeState({ activeGameId: GAME_ID }),
      });
      const other = await loadExtension(DIR, {
        transform: withReforger,
        state: makeState({ activeGameId: "other" }),
      });
      const find = (ext) =>
        ext.registeredActions.find(({ title }) => title === "Download ReForger");
      assert.equal(find(active).condition(), true);
      assert.equal(find(other).condition(), false);
    });
  });
});

describe("template-anvilengine: ResoRep", () => {
  const withResorep = setConst("hasResorep", "true");
  const iniLines = (gameDir, bits = "BIT64") => [
    "version=1.7.0",
    `modded_textures_folder=${gameDir}\\ResoRep\\modded`,
    "mod_creator_mode_enabled=false",
    "dll_log_enabled=false",
    `dll_log_file=${gameDir}\\resorepDll.log`,
    "save_textures=false",
    `original_textures_folder=${gameDir}\\ResoRep\\original`,
    `application_to_hook=${gameDir}\\XXX.exe|${bits}`,
  ];

  describe("download prompt", () => {
    async function prompted(transform = withResorep) {
      const gameDir = makeGameDir();
      const ext = await loadExtension(DIR, {
        transform,
        state: stateFor({ gameDir, mods: modsOf("XXX-atk") }),
      });
      const seen = answerDownloads(ext);
      const suppressed = [];
      ext.api.suppressNotification = (id) => suppressed.push(id);
      await ext.game.setup({ path: gameDir });
      return { ext, seen, suppressed, gameDir };
    }

    it("asks the user whether to download ResoRep, offering the download and more info", async () => {
      const { ext } = await prompted();
      const [notification] = ext.notifications;
      assert.equal(notification.id, "XXX-resorepdownload");
      assert.equal(notification.type, "warning");
      assert.equal(notification.message, "Download ResoRep for Legacy Texture Mods");
      assert.equal(notification.allowSuppress, true);
      assert.deepEqual(
        notification.actions.map(({ title }) => title),
        ["Download ResoRep", "More"],
      );
    });

    it("does not ask when ResoRep is already installed", async () => {
      const gameDir = makeGameDir();
      const ext = await loadExtension(DIR, {
        transform: withResorep,
        state: stateFor({ gameDir, mods: modsOf("XXX-atk", "XXX-resorep") }),
      });
      await ext.game.setup({ path: gameDir });
      assert.deepEqual(ext.notifications, []);
    });

    it("downloads the 64-bit Vortex file variant from the Download ResoRep button", async () => {
      const { ext, seen } = await prompted();
      const requests = recordRequests(ext);
      const stopped = [];
      ext.api.dismissNotification = (id) => stopped.push(id);
      ext.api.ext.ensureLoggedIn = async () => requests.install.push("login-first");
      let dismissed = 0;
      ext.notifications[0].actions[0].action(() => dismissed++);
      assert.ok(await waitFor(() => ext.dispatched.length === 2));
      assert.equal(dismissed, 1);
      assert.deepEqual(requests.download[0].options, { allowInstall: false });
      assert.equal(requests.install[0], "login-first");
      assert.deepEqual(requests.install[1].options, { allowAutoEnable: false });
      assert.deepEqual(ext.dispatched[0].payload.slice(1), [
        "profile",
        ["mod-1"],
        true,
        { allowAutoDeploy: true, installed: true },
      ]);
      assert.deepEqual(stopped, ["XXX-resorep-installing"]);
      const progress = ext.notifications.find(({ id }) => id === "XXX-resorep-installing");
      assert.deepEqual(
        [progress.message, progress.type, progress.noDismiss, progress.allowSuppress],
        ["Installing ResoRep DLL 64-bit", "activity", true, false],
      );
      assert.deepEqual(seen[0], {
        event: "start-download",
        urls: ["nxm://site/mods/1215/files/8350"],
        info: { game: "XXX", name: "ResoRep DLL 64-bit" },
      });
      assert.deepEqual(ext.dispatched[1].payload, ["XXX", "mod-1", "XXX-resorep"]);
    });

    it("downloads the 32-bit variant when BITS says so", async () => {
      const { ext, seen } = await prompted(all(withResorep, setConst("BITS", '"BIT32"')));
      ext.notifications[0].actions[0].action(() => undefined);
      assert.ok(await waitFor(() => ext.dispatched.length === 2));
      assert.deepEqual(seen[0].urls, ["nxm://site/mods/1215/files/4854"]);
      assert.equal(seen[0].info.name, "ResoRep DLL 32-bit");
    });

    it("explains ResoRep and lets the user download, continue or never be asked again", async () => {
      const { ext, seen, suppressed } = await prompted();
      let dismissed = 0;
      ext.notifications[0].actions[1].action(() => dismissed++);
      const [kind, title, content, buttons] = ext.dialogs[0];
      assert.equal(kind, "question");
      assert.equal(title, "Download ResoRep for Legacy Texture Mods");
      assert.match(content.text, /inject textures into memory/);
      assert.match(content.text, /"ResoRep.modded" inside the game folder/);
      assert.match(content.text, /"dllsettings.ini" settings file/);
      assert.deepEqual(
        buttons.map(({ label }) => label),
        ["Download ResoRep", "Continue", "Never Show Again"],
      );
      buttons[1].action();
      buttons[2].action();
      assert.deepEqual(suppressed, ["XXX-resorepdownload"]);
      assert.equal(dismissed, 2);
      buttons[0].action();
      assert.ok(await waitFor(() => seen.length === 2));
      assert.equal(seen[0].event, "start-download");
    });

    it("reports a failed ResoRep download and opens its files page", async () => {
      const { ext } = await prompted();
      const opened = stubShell();
      ext.api.events.removeAllListeners("start-download");
      ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
        callback(new Error("boom")),
      );
      ext.notifications[0].actions[0].action(() => undefined);
      assert.ok(await waitFor(() => ext.errors.length === 1));
      assert.equal(ext.errors[0][0], "Failed to download/install ResoRep DLL 64-bit");
      assert.deepEqual(opened, ["https://www.nexusmods.com/site/mods/1215/files/?tab=files"]);
    });
  });

  describe("dllsettings.ini", () => {
    it("writes the settings file into the game folder", async () => {
      const gameDir = makeGameDir();
      const ext = await loadExtension(DIR, {
        transform: withResorep,
        state: stateFor({ gameDir, mods: modsOf("XXX-atk", "XXX-resorep") }),
      });
      await ext.game.setup({ path: gameDir });
      const text = fs.readFileSync(path.join(gameDir, "dllsettings.ini"), "utf8");
      assert.equal(text, iniLines(gameDir).join("\n"));
    });

    it("hooks the 32-bit exe when BITS says so", async () => {
      const gameDir = makeGameDir();
      const ext = await loadExtension(DIR, {
        transform: all(withResorep, setConst("BITS", '"BIT32"')),
        state: stateFor({ gameDir, mods: modsOf("XXX-atk", "XXX-resorep") }),
      });
      await ext.game.setup({ path: gameDir });
      const text = fs.readFileSync(path.join(gameDir, "dllsettings.ini"), "utf8");
      assert.equal(text, iniLines(gameDir, "BIT32").join("\n"));
    });

    it("leaves an existing settings file alone", async () => {
      const gameDir = makeGameDir(["dllsettings.ini"]);
      fs.writeFileSync(path.join(gameDir, "dllsettings.ini"), "mine");
      const ext = await loadExtension(DIR, {
        transform: withResorep,
        state: stateFor({ gameDir, mods: modsOf("XXX-atk", "XXX-resorep") }),
      });
      await ext.game.setup({ path: gameDir });
      assert.equal(fs.readFileSync(path.join(gameDir, "dllsettings.ini"), "utf8"), "mine");
    });

    it("reports a settings file it cannot write", async () => {
      const gameDir = path.join(makeTempDir(), "missing");
      const ext = await loadExtension(DIR, {
        transform: withResorep,
        state: stateFor({ gameDir, mods: modsOf("XXX-atk", "XXX-resorep") }),
      });
      await ext.game.setup({ path: gameDir });
      assert.equal(ext.errors[0][0], "Failed to write ResoRep dllsettings.ini file");
    });

    it("writes no settings file with ResoRep off", async () => {
      const gameDir = makeGameDir();
      const ext = await loadExtension(DIR, {
        state: stateFor({ gameDir, mods: modsOf("XXX-atk") }),
      });
      await ext.game.setup({ path: gameDir });
      assert.equal(fs.existsSync(path.join(gameDir, "dllsettings.ini")), false);
    });
  });

  describe("original d3d11.dll copy", () => {
    const autoCopy = all(withResorep, setConst("autoCopyResorepDll", "true"));

    // Loads with SystemRoot pointing at the fake Windows folder, because the source path is
    // worked out when the extension loads.
    async function loaded({ transform = autoCopy, mods = ["XXX-atk", "XXX-resorep"] } = {}) {
      const windows = fakeWindows();
      const gameDir = makeGameDir();
      const ext = await withEnv({ SystemRoot: windows }, () =>
        loadExtension(DIR, { transform, state: stateFor({ gameDir, mods: modsOf(...mods) }) }),
      );
      return { ext, gameDir };
    }
    const target = (gameDir) => path.join(gameDir, "ori_d3d11.dll");

    it("copies the system dll next to the game during setup when ResoRep is installed", async () => {
      const { ext, gameDir } = await loaded();
      await ext.game.setup({ path: gameDir });
      assert.equal(fs.readFileSync(target(gameDir), "utf8"), "system System32");
    });

    it("copies the 32-bit system dll for a 32-bit game", async () => {
      const { ext, gameDir } = await loaded({
        transform: all(autoCopy, setConst("BITS", '"BIT32"')),
      });
      await ext.game.setup({ path: gameDir });
      assert.equal(fs.readFileSync(target(gameDir), "utf8"), "system SysWOW64");
    });

    it("copies nothing until ResoRep is installed", async () => {
      const { ext, gameDir } = await loaded({ mods: ["XXX-atk"] });
      await ext.game.setup({ path: gameDir });
      assert.equal(fs.existsSync(target(gameDir)), false);
    });

    it("does not copy when autoCopyResorepDll is off", async () => {
      const { ext, gameDir } = await loaded({ transform: withResorep });
      await ext.game.setup({ path: gameDir });
      assert.equal(fs.existsSync(target(gameDir)), false);
    });

    it("keeps the copy it already made", async () => {
      const { ext, gameDir } = await loaded();
      fs.writeFileSync(target(gameDir), "mine");
      await ext.game.setup({ path: gameDir });
      assert.equal(fs.readFileSync(target(gameDir), "utf8"), "mine");
    });

    it("copies again after each deploy of the game's active profile", async () => {
      const { ext, gameDir } = await loaded({
        transform: all(autoCopy, setConst("deployNotification", "false")),
      });
      await ext.game.setup({ path: gameDir });
      fs.rmSync(target(gameDir));
      const handler = ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1];
      await handler("some-other-profile");
      assert.equal(fs.existsSync(target(gameDir)), false);
      await handler("profile");
      assert.equal(fs.readFileSync(target(gameDir), "utf8"), "system System32");
      assert.deepEqual(ext.notifications, []);
    });

    const handlerOf = (ext) => ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1];

    it("does not copy after a deploy when autoCopyResorepDll is off", async () => {
      const { ext, gameDir } = await loaded({ transform: withResorep });
      await ext.game.setup({ path: gameDir });
      await handlerOf(ext)("profile");
      assert.equal(fs.existsSync(target(gameDir)), false);
    });

    it("does not copy after a deploy when ResoRep itself is switched off", async () => {
      const { ext, gameDir } = await loaded({ transform: setConst("autoCopyResorepDll", "true") });
      await ext.game.setup({ path: gameDir });
      await handlerOf(ext)("profile");
      assert.equal(fs.existsSync(target(gameDir)), false);
    });

    it("the Force Copy button copies even when ResoRep is not installed and the copy exists", async () => {
      const { ext, gameDir } = await loaded({ transform: withResorep, mods: ["XXX-atk"] });
      await ext.game.setup({ path: gameDir });
      fs.writeFileSync(target(gameDir), "stale");
      ext.registeredActions
        .find(({ title }) => title === "Force Copy System d3d11.dll (ResoRep)")
        .action();
      assert.ok(
        await waitFor(() => fs.readFileSync(target(gameDir), "utf8") === "system System32"),
      );
    });

    it("reports a system dll it cannot copy", async () => {
      const gameDir = makeGameDir();
      const missing = await withEnv({ SystemRoot: makeTempDir() }, () =>
        loadExtension(DIR, {
          transform: autoCopy,
          state: stateFor({ gameDir, mods: modsOf("XXX-atk", "XXX-resorep") }),
        }),
      );
      await missing.game.setup({ path: gameDir });
      assert.equal(missing.errors[0][0], "Failed to copy d3d11.dll from the system folder");
      assert.equal(fs.existsSync(target(gameDir)), false);
    });
  });
});

describe("template-anvilengine: deploy reminder", () => {
  const handlerOf = (ext) => ext.listeners.find(({ args }) => args[0] === "did-deploy").args[1];

  async function remind({ transform, mods = [], tools, registryAnswers } = {}) {
    const state = stateFor({ gameDir: makeGameDir(), mods: modsOf(...mods), tools });
    const ext = await loadExtension(DIR, { transform, state });
    await withWinapi(registryAnswers ?? {}, () => handlerOf(ext)("profile"));
    return ext;
  }

  it("reminds the user to run ATK after a deploy", async () => {
    const ext = await remind();
    const [notification] = ext.notifications;
    assert.equal(notification.id, "XXX-deploy-notification");
    assert.equal(notification.type, "warning");
    assert.equal(notification.message, "Run ATK to Repack .forge Files");
    assert.equal(notification.allowSuppress, true);
    assert.deepEqual(
      notification.actions.map(({ title }) => title),
      ["Run ATK", "More"],
    );
  });

  it("ignores a deploy of another profile", async () => {
    const ext = await loadExtension(DIR, { state: stateFor({ gameDir: makeGameDir() }) });
    await handlerOf(ext)("some-other-profile");
    assert.deepEqual(ext.notifications, []);
  });

  it("says nothing when no deploy tool is enabled", async () => {
    const ext = await remind({ transform: setConst("hasAtk", "false") });
    assert.deepEqual(ext.notifications, []);
  });

  it("names the tools it is about to ask the user to run", async () => {
    const message = async (transform, mods, registryAnswers) =>
      (await remind({ transform, mods, registryAnswers })).notifications[0].message;
    assert.equal(await message(flags("hasForger")), "Run ATK and/or Forger to Apply Changes");
    assert.equal(await message(flags("hasReforger")), "Run ATK and/or Forger to Apply Changes");
    assert.equal(
      await message(all(flags("hasForger"), setConst("hasAtk", "false"))),
      "Run Forger to Apply Patches",
    );
    assert.equal(
      await message(all(flags("hasReforger"), setConst("hasAtk", "false"))),
      "Run Forger to Apply Patches",
    );
  });

  it("offers a Forger button only once Forger is installed", async () => {
    const titles = async (mods) =>
      (await remind({ transform: flags("hasForger"), mods })).notifications[0].actions.map(
        ({ title }) => title,
      );
    assert.deepEqual(await titles([]), ["Run ATK", "More"]);
    assert.deepEqual(await titles(["XXX-forger"]), ["Run ATK", "Run Forger", "More"]);
  });

  it("offers a ReForger button only once ReForger is found in the registry", async () => {
    const titles = async (registryAnswers) =>
      (
        await remind({ transform: flags("hasReforger"), registryAnswers })
      ).notifications[0].actions.map(({ title }) => title);
    assert.deepEqual(await titles({}), ["Run ATK", "More"]);
    assert.deepEqual(await titles(reforgerRegistry()), ["Run ATK", "Run ReForger", "More"]);
  });

  describe("the More dialog", () => {
    async function dialogFor(options) {
      const ext = await remind(options);
      const suppressed = [];
      ext.api.suppressNotification = (id) => suppressed.push(id);
      let dismissed = 0;
      ext.notifications[0].actions.at(-1).action(() => dismissed++);
      const [kind, title, content, buttons] = ext.dialogs[0];
      return { ext, kind, title, content, buttons, suppressed, dismissals: () => dismissed };
    }

    it("explains the ATK workflow and offers Run, Continue and Never Show Again", async () => {
      const { kind, title, content, buttons, suppressed, dismissals } = await dialogFor();
      assert.equal(kind, "question");
      assert.equal(title, "Run ATK to Repack .forge Files");
      assert.match(content.text, /you must use AnvilToolkit to pack mods/);
      assert.match(
        content.text,
        /The folder structure should look something like this: "Extracted\/\{FORGE_FILE_NAME\}\.forge\/\{DATA_FILE\}\.data"\.\n/,
      );
      assert.match(content.text, /Use the included tools to launch them/);
      assert.equal(content.text.includes("Forger"), false);
      assert.deepEqual(
        buttons.map(({ label }) => label),
        ["Run ATK", "Continue", "Never Show Again"],
      );
      buttons[1].action();
      buttons[2].action();
      assert.deepEqual(suppressed, ["XXX-deploy-notification"]);
      assert.equal(dismissals(), 2);
    });

    it("adds the run order and the Forger paragraph when Forger is enabled", async () => {
      const { content } = await dialogFor({ transform: flags("hasForger") });
      assert.match(content.text, /^Run AnvilToolkit first to repack mods/);
      assert.match(
        content.text,
        /For Forger patch mods, you must use Forger Patch Manager to apply patches/,
      );
    });

    it("adds the ReForger paragraph when ReForger is enabled", async () => {
      const { content } = await dialogFor({ transform: flags("hasReforger") });
      assert.match(content.text, /you must use ReForger to apply patches/);
    });

    it("gives a DLC example when DLC folders are enabled", async () => {
      const { content } = await dialogFor({ transform: withDlc });
      assert.match(
        content.text,
        /or "dlc_10\/Extracted\/\{FORGE_FILE_NAME\}\.forge\/\{DATA_FILE\}\.data" for a DLC \.forge file\./,
      );
    });
  });

  describe("running a tool from the reminder", () => {
    const toolPath = path.join(makeTempDir(), "anviltoolkit.exe");
    const runButton = (ext) => ext.notifications[0].actions[0];

    it("runs the tool Vortex has on record without suggesting a deploy", async () => {
      const ext = await remind({ tools: { "XXX-atk": { path: toolPath } } });
      const runs = recordRuns(ext);
      let dismissed = 0;
      runButton(ext).action(() => dismissed++);
      assert.deepEqual(runs, [[toolPath, [], { suggestDeploy: false }]]);
      assert.equal(dismissed, 1);
    });

    it("tells the user when the tool has no recorded path", async () => {
      const ext = await remind({ tools: { "XXX-atk": {} } });
      runButton(ext).action(() => undefined);
      assert.deepEqual(ext.errors, [
        [
          "Failed to run ATK",
          "Path to ATK executable could not be found. Ensure ATK is installed through Vortex.",
        ],
      ]);
    });

    it("reports a tool Vortex has no record of", async () => {
      const ext = await remind();
      runButton(ext).action(() => undefined);
      assert.equal(ext.errors[0][0], "Failed to run ATK");
      assert.equal(ext.errors[0][2].allowReport, false);
    });

    it("reports a launch failure, allowing a report for permission and missing-file errors", async () => {
      const failures = async (code) => {
        const ext = await remind({ tools: { "XXX-atk": { path: toolPath } } });
        recordRuns(ext, Object.assign(new Error("fail"), { code }));
        runButton(ext).action(() => undefined);
        assert.ok(await waitFor(() => ext.errors.length === 1));
        assert.equal(ext.errors[0][0], "Failed to run ATK");
        return ext.errors[0][2].allowReport;
      };
      assert.equal(await failures("EPERM"), true);
      assert.equal(await failures("ENOENT"), true);
      assert.equal(await failures("EOTHER"), false);
    });

    it("known gap: an access-denied failure (EACCES) is never offered for reporting", async () => {
      const ext = await remind({ tools: { "XXX-atk": { path: toolPath } } });
      recordRuns(ext, Object.assign(new Error("denied"), { code: "EACCES" }));
      runButton(ext).action(() => undefined);
      assert.ok(await waitFor(() => ext.errors.length === 1));
      assert.equal(ext.errors[0][2].allowReport, false, "the check list spells it EACCESS");
    });

    it("runs Forger from the dialog's Run Forger button", async () => {
      const forgerPath = path.join(makeTempDir(), "forger.exe");
      const ext = await remind({
        transform: flags("hasForger"),
        mods: ["XXX-forger"],
        tools: { "XXX-forger": { path: forgerPath } },
      });
      const runs = recordRuns(ext);
      let dismissed = 0;
      ext.notifications[0].actions.at(-1).action(() => dismissed++);
      const buttons = ext.dialogs[0][3];
      assert.deepEqual(
        buttons.map(({ label }) => label),
        ["Run ATK", "Run Forger", "Continue", "Never Show Again"],
      );
      buttons[1].action();
      assert.deepEqual(runs, [[forgerPath, [], { suggestDeploy: false }]]);
      assert.equal(dismissed, 1);
    });
  });
});

describe("template-anvilengine: rename dialog for .forge folders", () => {
  const MOD = "My Mod";
  const mod = {
    id: "mod1",
    name: "My Mod name",
    installationPath: MOD,
    attributes: { modId: 1234 },
  };

  // Installs a .data folder mod, then opens the notification's "More" dialog.
  async function opened({ mods = { mod1: mod } } = {}) {
    const ext = await loadExtension(DIR, {
      state: stateFor({ gameDir: makeGameDir(), mods }),
    });
    await installerOf(ext, "XXX-datafolder").install(
      tree("Foo.data/a.bin"),
      path.join(STAGING, `${MOD}.installing`),
    );
    let dismissed = 0;
    ext.notifications[0].actions[0].action(() => dismissed++);
    const [kind, title, content, buttons] = ext.dialogs[0];
    return { ext, kind, title, content, buttons, dismissals: () => dismissed };
  }
  const button = (buttons, label) => buttons.find((entry) => entry.label === label);

  it("explains the problem and offers four ways forward", async () => {
    const { kind, title, content, buttons } = await opened();
    assert.equal(kind, "question");
    assert.equal(title, "MANUAL FOLDER RENAMING REQUIRED FOR My Mod");
    assert.match(content.text, /\nMy Mod\.\n/);
    assert.match(content.text, /Extracted\\FORGE_FILE_NAME\.forge\\DATA_FILE\.data/);
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Open Mod Page", "Show Folder Rename Dialog", "Open Staging Folder", "Close"],
    );
  });

  describe("Open Mod Page", () => {
    it("opens the description tab of the mod's Nexus page and leaves the notice open", async () => {
      const { buttons, dismissals } = await opened();
      const shown = stubShell();
      button(buttons, "Open Mod Page").action();
      assert.deepEqual(shown, ["https://www.nexusmods.com/XXX/mods/1234?tab=description"]);
      assert.equal(dismissals(), 0);
    });

    it("opens the game's mods list when the mod is unknown or has no page id", async () => {
      for (const mods of [{}, { mod1: { ...mod, attributes: {} } }]) {
        const { buttons } = await opened({ mods });
        const shown = stubShell();
        button(buttons, "Open Mod Page").action();
        assert.deepEqual(shown, ["https://www.nexusmods.com/XXX/mods/"]);
      }
    });

    it("reports a page it cannot open", async () => {
      const { ext, buttons } = await opened();
      button(buttons, "Open Mod Page").action();
      assert.equal(ext.errors[0][0], "Failed to open the URL");
    });
  });

  describe("Open Staging Folder", () => {
    it("opens the mod's folder in staging and dismisses the notice", async () => {
      const { buttons, dismissals } = await opened();
      const shown = stubShell();
      button(buttons, "Open Staging Folder").action();
      assert.deepEqual(shown, [path.join(STAGING, MOD)]);
      assert.equal(dismissals(), 1);
    });

    it("reports a folder it cannot open, and still dismisses", async () => {
      const { ext, buttons, dismissals } = await opened();
      button(buttons, "Open Staging Folder").action();
      assert.equal(ext.errors[0][0], "Failed to open the file or folder");
      assert.equal(dismissals(), 1);
    });
  });

  describe("Close", () => {
    it("dismisses the notice", async () => {
      const { buttons, dismissals } = await opened();
      button(buttons, "Close").action();
      assert.equal(dismissals(), 1);
    });
  });

  describe("Show Folder Rename Dialog", () => {
    it("tells the user to rename by hand when the mod cannot be found", async () => {
      const { ext, buttons, dismissals } = await opened({ mods: {} });
      button(buttons, "Show Folder Rename Dialog").action();
      assert.equal(ext.errors[0][0], "Cannot rename folder. You must rename the folder manually.");
      assert.equal(ext.dialogs.length, 1);
      assert.equal(dismissals(), 1);
    });

    it("asks for the .forge folder name with the placeholder as a hint", async () => {
      const { ext, buttons, dismissals } = await opened();
      button(buttons, "Show Folder Rename Dialog").action();
      assert.equal(dismissals(), 1);
      const [kind, title, content, rename] = ext.dialogs[1];
      assert.equal(kind, "question");
      assert.equal(title, "Rename .forge Folder");
      assert.equal(content.text, "Enter the correct .forge folder name for My Mod name:");
      assert.deepEqual(content.input, [
        {
          id: "XXX-forgefolderrenameinput",
          label: "For",
          type: "text",
          placeholder: RENAME,
        },
      ]);
      assert.deepEqual(rename, [{ label: "Cancel" }, { label: "Rename", default: true }]);
    });

    // Stages the mod, answers the rename dialog with `answer`, and waits for it to finish.
    async function rename(answer, { stage = true } = {}) {
      const { ext, buttons } = await opened();
      const events = answerDeployEvents(ext);
      const extracted = path.join(STAGING, MOD, "Extracted");
      fs.rmSync(path.join(STAGING, MOD), { recursive: true, force: true });
      if (stage) {
        fs.mkdirSync(path.join(extracted, RENAME), { recursive: true });
        fs.writeFileSync(path.join(extracted, RENAME, "a.data"), "data");
      }
      ext.api.showDialog = (...args) => {
        ext.dialogs.push(args);
        return typeof answer === "function" ? answer() : Promise.resolve(answer);
      };
      button(buttons, "Show Folder Rename Dialog").action();
      await settle();
      return { ext, events, extracted };
    }
    const typed = (name) => ({ action: "Rename", input: { "XXX-forgefolderrenameinput": name } });

    it("purges, renames the folder inside staging, then redeploys", async () => {
      const { ext, events, extracted } = await rename(typed("Patch_01.forge"));
      assert.deepEqual(events, [["purge-mods", true], ["deploy-mods"]]);
      assert.equal(
        fs.readFileSync(path.join(extracted, "Patch_01.forge", "a.data"), "utf8"),
        "data",
      );
      assert.equal(fs.existsSync(path.join(extracted, RENAME)), false);
      assert.deepEqual(ext.errors, []);
    });

    it("adds .forge when the user leaves it off and trims spaces", async () => {
      const { extracted } = await rename(typed("  Patch_02  "));
      assert.ok(fs.existsSync(path.join(extracted, "Patch_02.forge", "a.data")));
    });

    for (const [label, name] of [
      ["nothing", undefined],
      ["only .forge", ".forge"],
      ["the placeholder itself", RENAME],
      ["the placeholder without its extension", "RENAME_ME_TO_FORGE_NAME"],
    ]) {
      it(`refuses ${label} as a name`, async () => {
        const { ext, events, extracted } = await rename(typed(name));
        assert.equal(
          ext.errors[0][0],
          "Invalid name entered for .forge folder. You will have to rename the folder manually.",
        );
        assert.deepEqual(events, []);
        assert.ok(fs.existsSync(path.join(extracted, RENAME)));
      });
    }

    it("does nothing when the user cancels", async () => {
      const { ext, events, extracted } = await rename({ action: "Cancel" });
      assert.deepEqual(events, []);
      assert.deepEqual(ext.errors, []);
      assert.ok(fs.existsSync(path.join(extracted, RENAME)));
    });

    it("reports a dialog that fails", async () => {
      const { ext } = await rename(() => Promise.reject(new Error("dialog broke")));
      assert.equal(
        ext.errors[0][0],
        "Failed to rename .forge folder. You will have to rename the folder manually.",
      );
      assert.deepEqual(ext.errors[0][2], { allowReport: false });
    });

    it("reports a missing placeholder folder, after the purge and without a deploy", async () => {
      const { ext, events } = await rename(typed("Patch_03"), { stage: false });
      assert.equal(
        ext.errors[0][0],
        "Failed to rename .forge folder. You will have to rename the folder manually.",
      );
      assert.deepEqual(events, [["purge-mods", true]]);
    });
  });
});

describe("template-anvilengine: fallback notice", () => {
  async function opened(mods = {}) {
    const ext = await loadExtension(DIR, { state: stateFor({ gameDir: makeGameDir(), mods }) });
    await installerOf(ext, "XXX-fallback").install(
      tree("a.txt"),
      path.join(STAGING, "My Mod.installing"),
    );
    let dismissed = 0;
    ext.notifications[0].actions[0].action(() => dismissed++);
    const [kind, title, content, buttons] = ext.dialogs[0];
    return { ext, kind, title, content, buttons, dismissals: () => dismissed };
  }
  const button = (buttons, label) => buttons.find((entry) => entry.label === label);

  it("explains that the mod reached the fallback and names it", async () => {
    const { kind, title, content, buttons } = await opened();
    assert.equal(kind, "question");
    assert.equal(title, "Fallback installer reached for My Mod");
    assert.match(content.text, /Mod Name: My Mod\./);
    assert.deepEqual(
      buttons.map(({ label }) => label),
      ["Continue", "Contact Ext. Developer", "Open Mod Page + Staging Folder"],
    );
  });

  it("Continue dismisses the notice", async () => {
    const { buttons, dismissals } = await opened();
    button(buttons, "Continue").action();
    assert.equal(dismissals(), 1);
  });

  it("Contact Ext. Developer opens the extension's posts tab", async () => {
    const { buttons, dismissals } = await opened();
    const shown = stubShell();
    button(buttons, "Contact Ext. Developer").action();
    assert.deepEqual(shown, ["XXX?tab=posts"]);
    assert.equal(dismissals(), 1);
  });

  it("opens the mod's staging folder and its Nexus page", async () => {
    const mod = { id: "mod1", installationPath: "My Mod", attributes: { modId: 77 } };
    const { buttons, dismissals } = await opened({ mod1: mod });
    const shown = stubShell();
    button(buttons, "Open Mod Page + Staging Folder").action();
    assert.deepEqual(shown, [
      path.join(STAGING, "My Mod"),
      "https://www.nexusmods.com/XXX/mods/77?tab=description",
    ]);
    assert.equal(dismissals(), 1);
  });

  it("opens the game's mods list when the mod is unknown", async () => {
    const { buttons } = await opened();
    const shown = stubShell();
    button(buttons, "Open Mod Page + Staging Folder").action();
    assert.deepEqual(shown, [path.join(STAGING, "My Mod"), "https://www.nexusmods.com/XXX/mods/"]);
  });

  it("reports what it cannot open, and still dismisses", async () => {
    const { ext, buttons, dismissals } = await opened();
    button(buttons, "Contact Ext. Developer").action();
    button(buttons, "Open Mod Page + Staging Folder").action();
    assert.deepEqual(
      ext.errors.map(([message]) => message),
      ["Failed to open the URL", "Failed to open the file or folder", "Failed to open the URL"],
    );
    assert.equal(dismissals(), 2);
  });
});

describe("template-anvilengine: toolbar actions", () => {
  async function run(title, transform) {
    const shown = stubShell();
    const ext = await loadExtension(DIR, { transform });
    ext.registeredActions.find((action) => action.title === title).action();
    return { ext, shown };
  }

  it("opens the PCGamingWiki and SteamDB pages", async () => {
    assert.deepEqual((await run("Open PCGamingWiki Page")).shown, ["XXX"]);
    assert.deepEqual((await run("Open SteamDB Page")).shown, ["https://steamdb.info/app/XXX/"]);
  });

  it("opens the changelog shipped with the extension and the bug tracker", async () => {
    assert.deepEqual((await run("View Changelog")).shown, [path.join(DIR, "CHANGELOG.md")]);
    assert.deepEqual((await run("Submit Bug Report")).shown, ["XXX?tab=bugs"]);
  });

  it("opens the downloads folder once setup has found it", async () => {
    const shown = stubShell();
    const ext = await loadExtension(DIR, { state: stateFor({ mods: modsOf("XXX-atk") }) });
    await ext.game.setup({ path: makeGameDir() });
    ext.registeredActions.find(({ title }) => title === "Open Downloads Folder").action();
    assert.deepEqual(shown, [DOWNLOADS]);
  });

  it("opens the game's settings ini under Documents", async () => {
    const { shown } = await run("Open Settings INI", setConst("hasSettingsIni", "true"));
    assert.deepEqual(shown, [
      path.join(vortex.APP_ROOT, "documents", "My Games", "XXX", "XXX.ini"),
    ]);
  });

  it("reports a failure instead of throwing when the shell is unavailable", async () => {
    for (const [title, message] of [
      ["Open PCGamingWiki Page", "Failed to open the URL"],
      ["Open SteamDB Page", "Failed to open the URL"],
      ["Submit Bug Report", "Failed to open the URL"],
      ["View Changelog", "Failed to open the file or folder"],
      ["Open Downloads Folder", "Failed to open the file or folder"],
    ]) {
      const ext = await loadExtension(DIR);
      ext.registeredActions.find((action) => action.title === title).action();
      assert.equal(ext.errors.length, 1, title);
      assert.equal(ext.errors[0][0], message, title);
      assert.deepEqual(ext.errors[0][2], { allowReport: false }, title);
    }
  });
});
