"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { afterEach, before, describe, it } = require("node:test");
const { parseStringPromise } = require("xml2js");
const { makeState } = require("../harness/fake-context");
const { makeGameDir, makeTempDir, tree } = require("../harness/fixtures");
const {
  answerDownloads,
  installerOf,
  stubShell,
  summary,
  supportedBy,
  withWinapi,
} = require("../harness/helpers");
const { loadExtension, templateDir, vortex } = require("../harness/load-extension");
const { STUB_EXE_VERSION } = require("../harness/stub-modules");
const { all, setConst } = require("../harness/transforms");

const DIR = templateDir("template-unity-umm");
const GAME_ID = "XXX";

const sep = (...parts) => path.join(...parts);
const copy = (source, destination) => ({ type: "copy", source, destination });
const DATA = "XXX_Data";
const UMM_FOLDER = "UnityModManagerInstaller";
const MANAGER = sep(DATA, "Managed", "UnityModManager");
const PARAMS_FILE = sep(vortex.APP_ROOT, "localAppData", "UnityModManagerNet", "Params.xml");
const SAVE_DEFAULT = sep(vortex.APP_ROOT, "home", "AppData", "LocalLow", "XXX", "XXX", "SaveGames");
const SAVE_XBOX = sep(
  vortex.APP_ROOT,
  "localAppData",
  "Packages",
  "XXX_XXX",
  "SystemAppData",
  "wgs",
);

const md5 = (data) => crypto.createHash("md5").update(data).digest("hex");

// A staging folder as the installer sees it: a real folder (named like Vortex's) holding the
// listed empty files, so installers that read from it have something to read.
function staging(files, name = "Cool Mod.installing") {
  const dir = path.join(makeTempDir(), name);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), "");
  }
  return dir;
}

// The Unity Mod Manager archive: its shipped game list and the files the installer copies.
const gameList = ({ harmony = false, listed = true } = {}) =>
  `<?xml version="1.0" encoding="utf-8"?><Config>` +
  (listed
    ? `<GameInfo Name="XXX"><Folder>XXX</Folder>${harmony ? "<HarmonyVersion>2.2</HarmonyVersion>" : ""}</GameInfo>`
    : "") +
  `<GameInfo Name="Other"><Folder>Other</Folder></GameInfo></Config>`;

const UMM_FILES = [
  "UnityModManager.exe",
  "winhttp_x64.dll",
  "0Harmony.dll",
  "dnlib.dll",
  "UnityModManager.dll",
  "UnityModManager.xml",
  "System.Xml.dll",
];

function ummArchive({ prefix = "", config = gameList(), extra = [], without = [] } = {}) {
  const at = (name) => (prefix ? `${prefix}/${name}` : name);
  const names = [...UMM_FILES.filter((name) => !without.includes(name)), ...extra].map(at);
  if (config !== null) names.push(at("UnityModManagerConfig.xml"));
  const workingDir = staging(names);
  if (config !== null)
    fs.writeFileSync(path.join(workingDir, at("UnityModManagerConfig.xml")), config);
  return { workingDir, files: tree(...names) };
}

// Instructions in a compact, comparable shape.
const shape = (instructions) =>
  instructions.map((entry) => {
    if (entry.type === "copy") return ["copy", entry.source, entry.destination];
    if (entry.type === "generatefile") return ["generatefile", undefined, entry.destination];
    return [entry.type, entry.value];
  });

describe("template-unity-umm: registration with default toggles", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  // The UMM and Mods types sit at 8 and 10 to beat helper-extension mod types, and the root
  // installer sits at 8 to run ahead of the UMM installers. Both are reviewed contract oddities.
  it("registers the root, UMM, Mods, assembly and assets mod types", () => {
    assert.deepEqual(summary(ext.modTypes), [
      ["XXX-root", 25],
      ["XXX-umm", 8],
      ["XXX-mods", 10],
      ["XXX-assemblydll", 60],
      ["XXX-assets", 62],
    ]);
  });

  it("registers the root installer first, then UMM, mods, assembly, assets and the fallback", () => {
    assert.deepEqual(summary(ext.installers), [
      ["XXX-root", 8],
      ["XXX-umm", 25],
      ["XXX-ummmod", 27],
      ["XXX-assemblydll", 31],
      ["XXX-assets", 33],
      ["XXX-fallback", 49],
    ]);
  });

  it("registers the ten toolbar actions", () => {
    assert.deepEqual(
      ext.registeredActions.map(({ title }) => title),
      [
        "Run Unity Mod Manager",
        "Open Mods Folder",
        "Open Data Folder",
        "Open Save Folder",
        "Open PCGamingWiki Page",
        "Open Nexus Mods Page",
        "Open SteamDB Page",
        "View Changelog",
        "Submit Bug Report",
        "Open Downloads Folder",
      ],
    );
  });
});

describe("template-unity-umm: installer routing", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  const matrix = [
    ["the Unity Mod Manager archive", tree("UMM/UnityModManager.exe"), ["XXX-umm", "XXX-fallback"]],
    [
      "a UMM mod (Info.json beside a dll)",
      tree("MyMod/Info.json", "MyMod/a.dll"),
      ["XXX-ummmod", "XXX-fallback"],
    ],
    [
      "a UMM mod with an info.json and no dll (a dll is optional)",
      tree("MyMod/info.json"),
      ["XXX-ummmod", "XXX-fallback"],
    ],
    [
      "an archive with several mod folders",
      tree("ModA/info.json", "ModA/a.dll", "ModB/info.json"),
      ["XXX-ummmod", "XXX-fallback"],
    ],
    ["a dll with no info.json", tree("MyMod/a.dll"), ["XXX-fallback"]],
    ["an assembly dll", tree("Pack/Assembly-CSharp.dll"), ["XXX-assemblydll", "XXX-fallback"]],
    [
      "the firstpass assembly dll",
      tree("Assembly-CSharp-firstpass.dll"),
      ["XXX-assemblydll", "XXX-fallback"],
    ],
    ["an .assets file", tree("a.assets"), ["XXX-assets", "XXX-fallback"]],
    ["a .resource file", tree("a.resource"), ["XXX-assets", "XXX-fallback"]],
    ["a .ress file", tree("a.ress"), ["XXX-assets", "XXX-fallback"]],
    ["the game's data folder", tree("Pack/XXX_Data/a.bin"), ["XXX-root", "XXX-fallback"]],
    ["loose files with no known marker", tree("readme.txt"), ["XXX-fallback"]],
    ["a FOMOD package with UMM", tree("fomod/ModuleConfig.xml", "UnityModManager.exe"), []],
    ["a FOMOD package with a mod", tree("fomod/ModuleConfig.xml", "info.json", "a.dll"), []],
    ["a FOMOD package with an assembly", tree("fomod/ModuleConfig.xml", "Assembly-CSharp.dll"), []],
    ["a FOMOD package with assets", tree("fomod/ModuleConfig.xml", "a.assets"), []],
    ["a FOMOD package with the data folder", tree("fomod/ModuleConfig.xml", "XXX_Data/a.bin"), []],
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

  it("an IL2CPP build routes GameAssembly.dll instead of the Mono assemblies", async () => {
    const il2cpp = await loadExtension(DIR, { transform: setConst("UNITY_BUILD", '"il2cpp"') });
    assert.deepEqual(await supportedBy(il2cpp, tree("GameAssembly.dll")), [
      "XXX-assemblydll",
      "XXX-fallback",
    ]);
    assert.deepEqual(await supportedBy(il2cpp, tree("Assembly-CSharp.dll")), ["XXX-fallback"]);
  });
});

describe("template-unity-umm: Unity Mod Manager archive install", () => {
  const install = (ext, archive) =>
    installerOf(ext, "XXX-umm").install(archive.files, archive.workingDir);
  const archiveCopies = (...names) => names.map((n) => ["copy", n, sep(UMM_FOLDER, n)]);

  it("keeps the whole installer folder and patches the game folder the way UMM's DoorstopProxy does", async () => {
    const ext = await loadExtension(DIR);
    const archive = ummArchive();
    const { instructions } = await install(ext, archive);

    assert.deepEqual(shape(instructions), [
      ...archiveCopies(...UMM_FILES, "UnityModManagerConfig.xml"),
      ["copy", "winhttp_x64.dll", "winhttp.dll"],
      ["copy", "0Harmony.dll", sep(MANAGER, "0Harmony.dll")],
      ["copy", "dnlib.dll", sep(MANAGER, "dnlib.dll")],
      ["copy", "UnityModManager.dll", sep(MANAGER, "UnityModManager.dll")],
      ["copy", "UnityModManager.xml", sep(MANAGER, "UnityModManager.xml")],
      ["copy", "System.Xml.dll", sep(MANAGER, "System.Xml.dll")],
      ["generatefile", undefined, "doorstop_config.ini"],
      ["generatefile", undefined, sep(MANAGER, "Config.xml")],
      ["setmodtype", "XXX-umm"],
    ]);
  });

  it("points Doorstop at the manager assembly with CRLF line endings", async () => {
    const ext = await loadExtension(DIR);
    const { instructions } = await install(ext, ummArchive());
    const ini = instructions.find(({ destination }) => destination === "doorstop_config.ini");
    assert.equal(
      ini.data,
      `[General]\r\nenabled = true\r\ntarget_assembly = ${sep(MANAGER, "UnityModManager.dll")}\r\n`,
    );
  });

  it("writes only this game's entry from the shipped list to Config.xml", async () => {
    const ext = await loadExtension(DIR);
    const { instructions } = await install(
      ext,
      ummArchive({ config: gameList({ harmony: true }) }),
    );
    const config = instructions.find(
      ({ destination }) => destination === sep(MANAGER, "Config.xml"),
    );
    const parsed = await parseStringPromise(config.data);
    assert.equal(parsed.Config.GameInfo.length, 1);
    assert.equal(parsed.Config.GameInfo[0].$.Name, "XXX");
    assert.deepEqual(parsed.Config.GameInfo[0].Folder, ["XXX"]);
    assert.deepEqual(parsed.Config.GameInfo[0].HarmonyVersion, ["2.2"]);
  });

  it("does not add a second System.Xml.dll when the game already has one", async () => {
    const gameDir = makeGameDir([sep(DATA, "Managed", "System.Xml.dll")]);
    const state = makeState({ discovered: { [GAME_ID]: { path: gameDir } } });
    const ext = await loadExtension(DIR, { state });
    const { instructions } = await install(ext, ummArchive());
    const destinations = shape(instructions).map(([, , destination]) => destination);
    assert.equal(destinations.includes(sep(MANAGER, "System.Xml.dll")), false);
    assert.equal(destinations.includes(sep(MANAGER, "dnlib.dll")), true);
  });

  it("strips a wrapper folder around the installer", async () => {
    const ext = await loadExtension(DIR);
    const archive = ummArchive({ prefix: "UMM-1.0" });
    const { instructions } = await install(ext, archive);
    const rows = shape(instructions);
    assert.deepEqual(rows[0], [
      "copy",
      sep("UMM-1.0", "UnityModManager.exe"),
      sep(UMM_FOLDER, "UnityModManager.exe"),
    ]);
    assert.deepEqual(
      rows.find(([, , destination]) => destination === "winhttp.dll"),
      ["copy", sep("UMM-1.0", "winhttp_x64.dll"), "winhttp.dll"],
    );
    assert.deepEqual(
      rows.find(([, , destination]) => destination === sep(MANAGER, "dnlib.dll")),
      ["copy", sep("UMM-1.0", "dnlib.dll"), sep(MANAGER, "dnlib.dll")],
    );
    assert.equal(
      rows.some(
        ([type, , destination]) =>
          type === "generatefile" && destination === sep(MANAGER, "Config.xml"),
      ),
      true,
    );
  });

  it("uses the Harmony 2.2 payload when the game's entry asks for it", async () => {
    const ext = await loadExtension(DIR);
    const archive = ummArchive({
      config: gameList({ harmony: true }),
      extra: ["Harmony/2.2/0Harmony.dll"],
    });
    const { instructions } = await install(ext, archive);
    const toManager = shape(instructions)
      .filter(([type, , destination]) => type === "copy" && destination.startsWith(MANAGER))
      .map(([, source, destination]) => [source, path.basename(destination)]);
    assert.deepEqual(toManager, [
      ["dnlib.dll", "dnlib.dll"],
      ["UnityModManager.dll", "UnityModManager.dll"],
      ["UnityModManager.xml", "UnityModManager.xml"],
      [sep("Harmony", "2.2", "0Harmony.dll"), "0Harmony.dll"],
      ["System.Xml.dll", "System.Xml.dll"],
    ]);
  });

  it("keeps the standard Harmony when 2.2 is asked for but not shipped", async () => {
    const ext = await loadExtension(DIR);
    const { instructions } = await install(
      ext,
      ummArchive({ config: gameList({ harmony: true }) }),
    );
    assert.equal(
      shape(instructions).some(
        ([, source, destination]) =>
          source === "0Harmony.dll" && destination === sep(MANAGER, "0Harmony.dll"),
      ),
      true,
    );
  });

  it("skips a library the archive does not ship", async () => {
    const ext = await loadExtension(DIR);
    const { instructions } = await install(ext, ummArchive({ without: ["dnlib.dll"] }));
    const destinations = shape(instructions).map(([, , destination]) => destination);
    assert.equal(destinations.includes(sep(MANAGER, "dnlib.dll")), false);
    assert.equal(destinations.includes(sep(MANAGER, "0Harmony.dll")), true);
  });

  it("uses the 32-bit Doorstop proxy for an x86 game", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("UNITY_ARCH", '"x86"') });
    const archive = ummArchive({ extra: ["winhttp_x86.dll"] });
    const { instructions } = await install(ext, archive);
    assert.deepEqual(
      shape(instructions).filter(([, , destination]) => destination === "winhttp.dll"),
      [["copy", "winhttp_x86.dll", "winhttp.dll"]],
    );
  });

  it("skips the Doorstop proxy when the archive does not ship the matching one", async () => {
    const ext = await loadExtension(DIR);
    const { instructions } = await install(ext, ummArchive({ without: ["winhttp_x64.dll"] }));
    assert.equal(
      shape(instructions).some(([, , destination]) => destination === "winhttp.dll"),
      false,
    );
  });

  it("still installs the tool and reports an error when the game list is missing", async () => {
    const ext = await loadExtension(DIR);
    const { instructions } = await install(ext, ummArchive({ config: null }));
    assert.equal(ext.errors[0][0], "Could not read the Unity Mod Manager game list");
    assert.equal(ext.errors[0][1].kind, "data-invalid");
    const rows = shape(instructions);
    assert.equal(
      rows.some(([, , destination]) => destination === sep(MANAGER, "Config.xml")),
      false,
    );
    assert.equal(
      rows.some(([, , destination]) => destination === "doorstop_config.ini"),
      true,
    );
    assert.deepEqual(rows.at(-1), ["setmodtype", "XXX-umm"]);
  });

  it("reports an error and writes no Config.xml when the game is not in the list", async () => {
    const ext = await loadExtension(DIR);
    const { instructions } = await install(
      ext,
      ummArchive({ config: gameList({ listed: false }) }),
    );
    assert.match(ext.errors[0][1].message, /XXX is not listed in UnityModManagerConfig\.xml/);
    assert.equal(
      shape(instructions).some(([, , destination]) => destination === sep(MANAGER, "Config.xml")),
      false,
    );
  });
});

describe("template-unity-umm: other installers", () => {
  let ext;
  before(async () => {
    ext = await loadExtension(DIR);
  });

  it("mod installer keeps a mod's own folder under Mods and ignores files outside it", async () => {
    const files = tree("MyMod/info.json", "MyMod/a.dll", "Other/x.txt");
    const { instructions } = await installerOf(ext, "XXX-ummmod").install(files, staging([]));
    assert.deepEqual(instructions, [
      copy(sep("MyMod", "info.json"), sep("MyMod", "info.json")),
      copy(sep("MyMod", "a.dll"), sep("MyMod", "a.dll")),
      { type: "setmodtype", value: "XXX-mods" },
    ]);
  });

  it("mod installer strips a wrapper folder above the mod's own folder", async () => {
    const files = tree("Wrap/MyMod/info.json", "Wrap/MyMod/a.dll");
    const { instructions } = await installerOf(ext, "XXX-ummmod").install(files, staging([]));
    assert.deepEqual(instructions, [
      copy(sep("Wrap", "MyMod", "info.json"), sep("MyMod", "info.json")),
      copy(sep("Wrap", "MyMod", "a.dll"), sep("MyMod", "a.dll")),
      { type: "setmodtype", value: "XXX-mods" },
    ]);
  });

  it("mod installer installs a mod without a dll the same way as one with a dll", async () => {
    const files = tree("MyMod/info.json", "MyMod/data.bin");
    const { instructions } = await installerOf(ext, "XXX-ummmod").install(files, staging([]));
    assert.deepEqual(instructions, [
      copy(sep("MyMod", "info.json"), sep("MyMod", "info.json")),
      copy(sep("MyMod", "data.bin"), sep("MyMod", "data.bin")),
      { type: "setmodtype", value: "XXX-mods" },
    ]);
  });

  describe("an archive with more than one mod folder", () => {
    const install = (...names) =>
      installerOf(ext, "XXX-ummmod").install(tree(...names), staging([]));

    it("installs every folder that holds an info.json as its own mod", async () => {
      const { instructions } = await install(
        "ModA/info.json",
        "ModA/a.dll",
        "ModB/info.json",
        "ModB/sub/b.bin",
      );
      assert.deepEqual(instructions, [
        copy(sep("ModA", "info.json"), sep("ModA", "info.json")),
        copy(sep("ModA", "a.dll"), sep("ModA", "a.dll")),
        copy(sep("ModB", "info.json"), sep("ModB", "info.json")),
        copy(sep("ModB", "sub", "b.bin"), sep("ModB", "sub", "b.bin")),
        { type: "setmodtype", value: "XXX-mods" },
      ]);
    });

    it("drops a shared wrapper folder above the mod folders", async () => {
      const { instructions } = await install("Mods/A/info.json", "Mods/B/Info.json");
      assert.deepEqual(instructions, [
        copy(sep("Mods", "A", "info.json"), sep("A", "info.json")),
        copy(sep("Mods", "B", "Info.json"), sep("B", "Info.json")),
        { type: "setmodtype", value: "XXX-mods" },
      ]);
    });

    it("leaves files outside every mod folder out of the install", async () => {
      const { instructions } = await install("ModA/info.json", "ModB/info.json", "readme.txt");
      assert.deepEqual(
        instructions.map(({ source }) => source),
        [sep("ModA", "info.json"), sep("ModB", "info.json"), undefined],
      );
    });

    it("does not treat a folder as inside another just because its name starts the same", async () => {
      const { instructions } = await install("ModA/info.json", "ModAB/info.json");
      assert.deepEqual(
        instructions.map(({ destination }) => destination),
        [sep("ModA", "info.json"), sep("ModAB", "info.json"), undefined],
      );
    });

    it("keeps an info.json nested inside a mod folder as part of that mod", async () => {
      const { instructions } = await install(
        "ModA/info.json",
        "ModA/lib/info.json",
        "ModA/lib/z.dll",
      );
      assert.deepEqual(
        instructions.map(({ destination }) => destination),
        [
          sep("ModA", "info.json"),
          sep("ModA", "lib", "info.json"),
          sep("ModA", "lib", "z.dll"),
          undefined,
        ],
      );
    });

    it("treats a manifest at the archive root as the only mod", async () => {
      const dir = staging([]);
      fs.writeFileSync(path.join(dir, "info.json"), '{ "Id": "Root Mod" }');
      const { instructions } = await installerOf(ext, "XXX-ummmod").install(
        tree("info.json", "sub/info.json", "sub/a.dll"),
        dir,
      );
      assert.deepEqual(instructions, [
        copy("info.json", sep("Root Mod", "info.json")),
        copy(sep("sub", "info.json"), sep("Root Mod", "sub", "info.json")),
        copy(sep("sub", "a.dll"), sep("Root Mod", "sub", "a.dll")),
        { type: "setmodtype", value: "XXX-mods" },
      ]);
    });
  });

  describe("a mod with files at the top of the archive", () => {
    const files = tree("info.json", "a.dll", "sub/b.txt");
    const named = (content) => {
      const dir = staging(["a.dll"]);
      fs.writeFileSync(path.join(dir, "info.json"), content);
      return dir;
    };

    it("is named by the Id in its info.json", async () => {
      const { instructions } = await installerOf(ext, "XXX-ummmod").install(
        files,
        named('{ "Id": "Fancy Mod" }'),
      );
      assert.deepEqual(instructions, [
        copy("info.json", sep("Fancy Mod", "info.json")),
        copy("a.dll", sep("Fancy Mod", "a.dll")),
        copy(sep("sub", "b.txt"), sep("Fancy Mod", "sub", "b.txt")),
        { type: "setmodtype", value: "XXX-mods" },
      ]);
    });

    it("accepts a lower-case id key", async () => {
      const { instructions } = await installerOf(ext, "XXX-ummmod").install(
        files,
        named('{ "id": "lowercase" }'),
      );
      assert.equal(instructions[0].destination, sep("lowercase", "info.json"));
    });

    it("falls back to the archive name when there is no usable id", async () => {
      for (const content of ["{}", "not json", '{ "Id": "" }']) {
        const { instructions } = await installerOf(ext, "XXX-ummmod").install(
          files,
          named(content),
        );
        assert.equal(instructions[0].destination, sep("Cool Mod", "info.json"), content);
      }
    });
  });

  it("assembly installer flattens to the assembly dll's folder", async () => {
    const files = tree("Pack/Assembly-CSharp.dll", "Pack/x.txt", "Other/y.txt");
    const { instructions } = await installerOf(ext, "XXX-assemblydll").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "Assembly-CSharp.dll"), "Assembly-CSharp.dll"),
      copy(sep("Pack", "x.txt"), "x.txt"),
      { type: "setmodtype", value: "XXX-assemblydll" },
    ]);
  });

  it("assets installer flattens to the assets file's folder", async () => {
    const files = tree("Pack/a.assets", "Pack/b.resource", "Other/y.txt");
    const { instructions } = await installerOf(ext, "XXX-assets").install(files);
    assert.deepEqual(instructions, [
      copy(sep("Pack", "a.assets"), "a.assets"),
      copy(sep("Pack", "b.resource"), "b.resource"),
      { type: "setmodtype", value: "XXX-assets" },
    ]);
  });

  it("root installer keeps the data folder at the top of the destination", async () => {
    const files = tree("Pack/XXX_Data/a.assets", "Pack/XXX_Data/Managed/b.dll", "Pack/readme.txt");
    const { instructions } = await installerOf(ext, "XXX-root").install(files, staging([]));
    assert.deepEqual(instructions, [
      copy(sep("Pack", "XXX_Data", "a.assets"), sep("XXX_Data", "a.assets")),
      copy(sep("Pack", "XXX_Data", "Managed", "b.dll"), sep("XXX_Data", "Managed", "b.dll")),
      copy(sep("Pack", "readme.txt"), "readme.txt"),
      { type: "setmodtype", value: "XXX-root" },
    ]);
  });

  it("root installer renames the default data folder to the Xbox build's once Xbox is detected", async () => {
    const xbox = await loadExtension(DIR, { transform: setConst("GAME_STRING_ALT", '"ALT"') });
    await xbox.game.getGameVersion(makeGameDir(["gamelaunchhelper.exe"]));

    const workingDir = staging(["Pack/XXX_Data/a.assets"]);
    const { instructions } = await installerOf(xbox, "XXX-root").install(
      tree("Pack/XXX_Data/a.assets"),
      workingDir,
    );
    assert.deepEqual(instructions, [
      copy(sep("Pack", "ALT_Data", "a.assets"), sep("ALT_Data", "a.assets")),
      { type: "setmodtype", value: "XXX-root" },
    ]);
    assert.ok(fs.existsSync(path.join(workingDir, "Pack", "ALT_Data", "a.assets")));
    assert.equal(fs.existsSync(path.join(workingDir, "Pack", "XXX_Data")), false);
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

describe("template-unity-umm: toggles change what is registered", () => {
  it("fallbackInstaller off drops the fallback", async () => {
    const ext = await loadExtension(DIR, { transform: setConst("fallbackInstaller", "false") });
    assert.equal(ext.installers.length, 5);
    assert.deepEqual(summary(ext.installers).at(-1), ["XXX-assets", 33]);
  });

  it("allowSymlinks is on by default and off when toggled, as passed to the game details", async () => {
    const on = await loadExtension(DIR);
    const off = await loadExtension(DIR, { transform: setConst("allowSymlinks", "false") });
    assert.equal(on.game.details.supportsSymlinks, true);
    assert.equal(off.game.details.supportsSymlinks, false);
  });

  it("setupNotification on shows the special instructions notice during setup", async () => {
    const ext = await loadExtension(DIR, {
      transform: all(setConst("setupNotification", "true"), setConst("autoDownloadUmm", "false")),
    });
    await ext.game.setup({ path: makeGameDir() });
    const notice = ext.notifications.find(({ id }) => id === "XXX-setup-notify");
    assert.equal(notice.type, "warning");
  });

  it("an IL2CPP build installs assembly mods to the game folder", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR, {
      transform: setConst("UNITY_BUILD", '"il2cpp"'),
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
    const assembly = ext.modTypes.find(({ id }) => id === "XXX-assemblydll");
    assert.equal(assembly.getPath({ id: GAME_ID }), gameDir);
  });

  it("multiExe switches to the Xbox executable and its data folder once detected", async () => {
    const gameDir = makeGameDir();
    const ext = await loadExtension(DIR, {
      transform: all(setConst("multiExe", "true"), setConst("GAME_STRING_ALT", '"ALT"')),
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
    const opened = stubShell();
    try {
      const openData = () =>
        ext.registeredActions.find(({ title }) => title === "Open Data Folder").action();

      assert.equal(ext.game.executable(makeGameDir()), "XXX.exe");
      openData();
      assert.equal(
        ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])),
        "gamelaunchhelper.exe",
      );
      openData();
      assert.deepEqual(opened, [sep(gameDir, "XXX_Data"), sep(gameDir, "ALT_Data")]);
    } finally {
      delete globalThis.window;
    }
  });
});

describe("template-unity-umm: game definition", () => {
  const gameDir = makeGameDir();
  let ext;
  before(async () => {
    ext = await loadExtension(DIR, {
      state: makeState({ discovered: { [GAME_ID]: { path: gameDir } } }),
    });
  });

  it("targets the game folder, Mods, the Managed folder and the data folder", () => {
    const targets = Object.fromEntries(
      ext.modTypes.map(({ id, getPath }) => [id, getPath({ id: GAME_ID })]),
    );
    assert.deepEqual(targets, {
      "XXX-root": gameDir,
      "XXX-umm": gameDir,
      "XXX-mods": sep(gameDir, "Mods"),
      "XXX-assemblydll": sep(gameDir, DATA, "Managed"),
      "XXX-assets": sep(gameDir, DATA),
    });
  });

  it("only offers the mod types once the game is discovered", async () => {
    const undiscovered = await loadExtension(DIR);
    for (const type of undiscovered.modTypes) assert.equal(type.isSupported(GAME_ID), false);
    for (const type of ext.modTypes) assert.equal(type.isSupported(GAME_ID), true);
  });

  it("mods install to the game folder and the executable is required", () => {
    assert.equal(ext.game.queryModPath(), ".");
    assert.deepEqual(ext.game.requiredFiles, ["XXX.exe"]);
    assert.equal(ext.game.executable(makeGameDir(["gamelaunchhelper.exe"])), "XXX.exe");
  });

  it("offers the Unity Mod Manager tool and two launch tools", () => {
    const [umm, launch, alt] = ext.game.supportedTools;
    assert.equal(umm.id, "XXX-umm");
    assert.equal(umm.executable(), sep(UMM_FOLDER, "UnityModManager.exe"));
    assert.equal(launch.id, "XXX-customlaunch");
    assert.equal(launch.executable(), "XXX.exe");
    assert.equal(alt.id, "XXX-customlaunchalt");
    assert.equal(alt.executable(), "gamelaunchhelper.exe");
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

  it("an Xbox id outside the discovery ids turns the Xbox launcher off", async () => {
    const other = await loadExtension(DIR, { transform: setConst("XBOXAPP_ID", '"other"') });
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

describe("template-unity-umm: game version", () => {
  const version = async (gamePath, transform) => {
    const ext = await loadExtension(DIR, { transform });
    return ext.game.getGameVersion(gamePath);
  };

  // A game folder inside a Steam library, with its appmanifest beside the "common" folder.
  function steamGame(buildId) {
    const library = makeTempDir();
    const gamePath = path.join(library, "steamapps", "common", "Game");
    fs.mkdirSync(gamePath, { recursive: true });
    fs.writeFileSync(
      path.join(library, "steamapps", "appmanifest_480.acf"),
      `"AppState"\n{\n\t"buildid"\t\t"${buildId}"\n}\n`,
    );
    return gamePath;
  }
  const withSteam = setConst("STEAMAPP_ID", '"480"');

  it("reads the version file the game ships", async () => {
    const gamePath = makeGameDir();
    fs.mkdirSync(path.join(gamePath, DATA));
    fs.writeFileSync(path.join(gamePath, DATA, "Version.info"), "Game Name Build 1.2.3 more");
    assert.equal(await version(gamePath), "1.2.3");
  });

  it("ignores the version file when hasVersionFile is off", async () => {
    const gamePath = makeGameDir();
    fs.mkdirSync(path.join(gamePath, DATA));
    fs.writeFileSync(path.join(gamePath, DATA, "Version.info"), "Game Name Build 9.9.9 more");
    assert.equal(await version(gamePath, setConst("hasVersionFile", "false")), STUB_EXE_VERSION);
  });

  it("reads the version from appxmanifest.xml for the Xbox build", async () => {
    const xboxDir = makeGameDir(["gamelaunchhelper.exe"]);
    fs.writeFileSync(
      path.join(xboxDir, "appxmanifest.xml"),
      '<Package><Identity Name="x" Version="1.2.3.0"/></Package>',
    );
    assert.equal(await version(xboxDir), "1.2.3.0");
  });

  it("falls back to 0.0.0 when the Xbox manifest is unreadable", async () => {
    assert.equal(await version(makeGameDir(["gamelaunchhelper.exe"])), "0.0.0");
  });

  it("uses the Steam build id from the library's appmanifest", async () => {
    assert.equal(await version(steamGame("12345"), withSteam), "12345");
  });

  it("ignores a Steam manifest while the app id is still the scaffold placeholder", async () => {
    const gamePath = steamGame("12345");
    fs.copyFileSync(
      path.join(gamePath, "..", "..", "appmanifest_480.acf"),
      path.join(gamePath, "..", "..", "appmanifest_XXX.acf"),
    );
    assert.equal(await version(gamePath), STUB_EXE_VERSION);
  });

  it("prefers the executable's version over the Steam build id when exeHasGameVersion is on", async () => {
    const transform = all(withSteam, setConst("exeHasGameVersion", "true"));
    assert.equal(await version(steamGame("12345"), transform), STUB_EXE_VERSION);
  });

  describe("Epic and GOG builds", () => {
    it("uses the Epic manifest matching the app name, skipping unreadable manifests", async () => {
      const programData = makeTempDir();
      const manifests = path.join(programData, "Epic", "EpicGamesLauncher", "Data", "Manifests");
      fs.mkdirSync(manifests, { recursive: true });
      fs.writeFileSync(path.join(manifests, "broken.item"), "{");
      fs.writeFileSync(
        path.join(manifests, "a-notes.txt"),
        JSON.stringify({ AppName: "epicapp", AppVersionString: "9.9.9" }),
      );
      fs.writeFileSync(
        path.join(manifests, "game.item"),
        JSON.stringify({ AppName: "epicapp", AppVersionString: "1.0.5" }),
      );
      const saved = process.env.ProgramData;
      process.env.ProgramData = programData;
      try {
        assert.equal(await version(makeGameDir(), setConst("EPICAPP_ID", '"epicapp"')), "1.0.5");
      } finally {
        process.env.ProgramData = saved;
      }
    });

    it("matches an Epic manifest by install location when the app name differs", async () => {
      const programData = makeTempDir();
      const gamePath = makeGameDir();
      const manifests = path.join(programData, "Epic", "EpicGamesLauncher", "Data", "Manifests");
      fs.mkdirSync(manifests, { recursive: true });
      fs.writeFileSync(
        path.join(manifests, "game.item"),
        JSON.stringify({
          AppName: "renamed",
          InstallLocation: gamePath,
          AppVersionString: "2.0.0",
        }),
      );
      const saved = process.env.ProgramData;
      process.env.ProgramData = programData;
      try {
        assert.equal(await version(gamePath, setConst("EPICAPP_ID", '"epicapp"')), "2.0.0");
      } finally {
        process.env.ProgramData = saved;
      }
    });

    it("uses the GOG registry version when the registry path is this game", async () => {
      const gamePath = makeGameDir();
      const registry = (_hive, _key, name) => ({ value: name === "path" ? gamePath : "3.1.4" });
      await withWinapi({ RegGetValue: registry }, async () => {
        assert.equal(await version(gamePath, setConst("GOGAPP_ID", '"gogapp"')), "3.1.4");
      });
    });

    it("ignores a GOG registry entry for a different install", async () => {
      const registry = (_hive, _key, name) => ({
        value: name === "path" ? "C:\\Elsewhere" : "3.1.4",
      });
      await withWinapi({ RegGetValue: registry }, async () => {
        const result = await version(makeGameDir(), setConst("GOGAPP_ID", '"gogapp"'));
        assert.equal(result, STUB_EXE_VERSION);
      });
    });
  });

  it("hashes the Mono assemblies when no store build id is available", async () => {
    const gamePath = makeGameDir();
    const managed = path.join(gamePath, DATA, "Managed");
    fs.mkdirSync(managed, { recursive: true });
    fs.writeFileSync(path.join(managed, "Assembly-CSharp.dll"), "A");
    fs.writeFileSync(path.join(managed, "Assembly-CSharp-firstpass.dll"), "B");
    assert.equal(await version(gamePath), md5(md5("A") + md5("B")));
  });

  it("hashes GameAssembly.dll for an IL2CPP build", async () => {
    const gamePath = makeGameDir(["GameAssembly.dll"]);
    fs.writeFileSync(path.join(gamePath, "GameAssembly.dll"), "C");
    assert.equal(await version(gamePath, setConst("UNITY_BUILD", '"il2cpp"')), md5(md5("C")));
  });

  it("falls back to the executable's version when nothing else resolves", async () => {
    assert.equal(await version(makeGameDir()), STUB_EXE_VERSION);
  });
});

describe("template-unity-umm: setup and Unity Mod Manager download", () => {
  const gameDir = () => makeGameDir();
  const stateFor = (dir, extra = {}) =>
    makeState({ discovered: { [GAME_ID]: { path: dir, ...extra } }, ...extra.state });
  const UMM_URL = "nxm://site/mods/21/files/9047";

  afterEach(() => {
    delete globalThis.window;
    fs.rmSync(path.join(vortex.APP_ROOT, "localAppData"), { recursive: true, force: true });
  });

  it("downloads and enables Unity Mod Manager, then creates the mod folders", async () => {
    const dir = gameDir();
    const ext = await loadExtension(DIR, { state: stateFor(dir) });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: dir });

    assert.deepEqual(seen[0], {
      event: "start-download",
      urls: [UMM_URL],
      info: { game: "site", name: "Unity Mod Manager" },
    });
    assert.equal(seen[1].downloadId, "download-1");
    assert.deepEqual(ext.dispatched[1].payload, ["XXX", "mod-1", "XXX-umm"]);
    for (const folder of [sep(DATA, "Managed"), DATA, "Mods"]) {
      assert.ok(fs.statSync(path.join(dir, folder)).isDirectory(), folder);
    }
  });

  it("prefers the newest main file listed on Nexus over the pinned file id", async () => {
    const dir = gameDir();
    const ext = await loadExtension(DIR, { state: stateFor(dir) });
    const seen = answerDownloads(ext);
    ext.api.ext.nexusGetModFiles = async () => [
      { category_id: 1, uploaded_time: "100", file_id: 7 },
      { category_id: 1, uploaded_time: "200", file_id: 8 },
      { category_id: 2, uploaded_time: "300", file_id: 9 },
    ];
    await ext.game.setup({ path: dir });
    assert.deepEqual(seen[0].urls, ["nxm://site/mods/21/files/8"]);
  });

  it("skips the download when UMM is installed as a mod", async () => {
    const dir = gameDir();
    const state = stateFor(dir, {
      state: { mods: { [GAME_ID]: { existing: { type: "XXX-umm" } } } },
    });
    const ext = await loadExtension(DIR, { state });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: dir });
    assert.deepEqual(seen, []);
  });

  it("skips the download when UMM is already patched into the game folder", async () => {
    const dir = makeGameDir([sep(MANAGER, "UnityModManager.dll")]);
    const ext = await loadExtension(DIR, { state: stateFor(dir) });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: dir });
    assert.deepEqual(seen, []);
  });

  it("autoDownloadUmm off skips the download", async () => {
    const dir = gameDir();
    const ext = await loadExtension(DIR, {
      transform: setConst("autoDownloadUmm", "false"),
      state: stateFor(dir),
    });
    const seen = answerDownloads(ext);
    await ext.game.setup({ path: dir });
    assert.deepEqual(seen, []);
  });

  it("reports a failed download and opens the Nexus file page", async () => {
    const dir = gameDir();
    const opened = stubShell();
    const ext = await loadExtension(DIR, { state: stateFor(dir) });
    ext.api.events.on("start-download", (_urls, _info, _x, callback) =>
      callback(new Error("offline")),
    );
    await ext.game.setup({ path: dir });
    assert.equal(ext.errors[0][0], "Failed to download/install Unity Mod Manager");
    assert.deepEqual(opened, ["https://www.nexusmods.com/site/mods/21/files/?tab=files"]);
  });

  it("seeds UMM's Params.xml so the tool opens pointed at this game", async () => {
    const dir = gameDir();
    const ext = await loadExtension(DIR, { state: stateFor(dir) });
    answerDownloads(ext);
    await ext.game.setup({ path: dir });

    const parsed = await parseStringPromise(fs.readFileSync(PARAMS_FILE, "utf8"));
    assert.deepEqual(parsed.Param.LastSelectedGame, ["XXX"]);
    const [entry] = parsed.Param.GameParams[0].GameParam;
    assert.equal(entry.$.Name, "XXX");
    assert.deepEqual(entry.Path, [dir]);
    assert.deepEqual(entry.InstallType, ["DoorstopProxy"]);
  });

  it("keeps the other games already registered in Params.xml, and adds this one only once", async () => {
    const dir = gameDir();
    fs.mkdirSync(path.dirname(PARAMS_FILE), { recursive: true });
    fs.writeFileSync(
      PARAMS_FILE,
      `<?xml version="1.0"?><Param><LastSelectedGame>Other</LastSelectedGame><GameParams>` +
        `<GameParam Name="Other"><Path>C:\\Other</Path><InstallType>A</InstallType></GameParam>` +
        `</GameParams></Param>`,
    );
    for (let run = 0; run < 2; run++) {
      const ext = await loadExtension(DIR, { state: stateFor(dir) });
      answerDownloads(ext);
      await ext.game.setup({ path: dir });
    }

    const parsed = await parseStringPromise(fs.readFileSync(PARAMS_FILE, "utf8"));
    assert.deepEqual(parsed.Param.LastSelectedGame, ["XXX"]);
    const names = parsed.Param.GameParams[0].GameParam.map((entry) => entry.$.Name);
    assert.deepEqual(names, ["Other", "XXX"]);
    assert.deepEqual(parsed.Param.GameParams[0].GameParam[0].Path, ["C:\\Other"]);
  });

  it("seedUmmParams off writes neither Params.xml nor the registry values", async () => {
    const dir = gameDir();
    const writes = [];
    const ext = await loadExtension(DIR, {
      transform: setConst("seedUmmParams", "false"),
      state: stateFor(dir),
    });
    answerDownloads(ext);
    await withWinapi({ RegSetKeyValue: (...args) => writes.push(args) }, () =>
      ext.game.setup({ path: dir }),
    );
    assert.equal(fs.existsSync(PARAMS_FILE), false);
    assert.deepEqual(writes, []);
  });

  it("seeds the registry values UMM reads on first run", async () => {
    const dir = gameDir();
    const writes = [];
    const ext = await loadExtension(DIR, { state: stateFor(dir) });
    answerDownloads(ext);
    await withWinapi({ RegSetKeyValue: (...args) => writes.push(args) }, () =>
      ext.game.setup({ path: dir }),
    );
    assert.deepEqual(writes, [
      ["HKEY_CURRENT_USER", "Software\\UnityModManager", "Path", sep(dir, UMM_FOLDER)],
      [
        "HKEY_CURRENT_USER",
        "Software\\UnityModManager",
        "ExePath",
        sep(dir, UMM_FOLDER, "UnityModManager.exe"),
      ],
    ]);
  });

  it("finishes setup even when the registry cannot be written", async () => {
    const dir = gameDir();
    const ext = await loadExtension(DIR, { state: stateFor(dir) });
    answerDownloads(ext);
    await withWinapi(
      {
        RegSetKeyValue: () => {
          throw new Error("access denied");
        },
      },
      () => ext.game.setup({ path: dir }),
    );
    assert.ok(fs.statSync(path.join(dir, "Mods")).isDirectory());
  });

  it("writes nothing outside the game folder when the game has not been discovered", async () => {
    const dir = gameDir();
    const ext = await loadExtension(DIR);
    answerDownloads(ext);
    await ext.game.setup({ path: dir });
    assert.equal(fs.existsSync(PARAMS_FILE), false);
    assert.ok(fs.statSync(path.join(dir, "Mods")).isDirectory());
  });

  it("repoints a Unity Mod Manager tool that targets a stale staging folder", async () => {
    const dir = gameDir();
    const toolPath = sep(dir, UMM_FOLDER, "UnityModManager.exe");
    const ext = await loadExtension(DIR, {
      state: stateFor(dir, {
        tools: {
          stale: { name: "UMM", path: "C:\\staging\\umm-1.0\\UnityModManager.exe" },
          current: { name: "UMM", path: toolPath },
          game: { name: "Game", path: "C:\\Games\\Game.exe" },
        },
      }),
    });
    answerDownloads(ext);
    await ext.game.setup({ path: dir });

    const repointed = ext.dispatched.filter(({ type }) => type === "addDiscoveredTool");
    assert.deepEqual(
      repointed.map(({ payload }) => payload),
      [
        [
          "XXX",
          "stale",
          { name: "UMM", path: toolPath, workingDirectory: sep(dir, UMM_FOLDER) },
          true,
        ],
      ],
    );
  });

  it("the Run Unity Mod Manager button launches the deployed executable", async () => {
    const dir = gameDir();
    const ext = await loadExtension(DIR, { state: stateFor(dir) });
    const runs = [];
    ext.api.runExecutable = (...args) => {
      runs.push(args);
      return Promise.resolve();
    };
    ext.registeredActions.find(({ title }) => title === "Run Unity Mod Manager").action();
    assert.deepEqual(runs, [
      [sep(dir, UMM_FOLDER, "UnityModManager.exe"), [], { suggestDeploy: false }],
    ]);
  });

  it("the Run Unity Mod Manager button reports an error when the game is not discovered", async () => {
    const ext = await loadExtension(DIR);
    ext.registeredActions.find(({ title }) => title === "Run Unity Mod Manager").action();
    assert.equal(ext.errors[0][0], "Failed to run Unity Mod Manager");
  });
});

describe("template-unity-umm: toolbar actions", () => {
  afterEach(() => {
    delete globalThis.window;
  });

  async function run(title, state) {
    const opened = stubShell();
    const ext = await loadExtension(DIR, { state });
    ext.registeredActions.find((action) => action.title === title).action();
    return opened;
  }
  const discovered = (dir) => makeState({ discovered: { [GAME_ID]: { path: dir } } });

  it("opens the Mods folder and the data folder inside the discovered game folder", async () => {
    const dir = makeGameDir();
    assert.deepEqual(await run("Open Mods Folder", discovered(dir)), [sep(dir, "Mods")]);
    assert.deepEqual(await run("Open Data Folder", discovered(dir)), [sep(dir, DATA)]);
  });

  it("opens the Nexus Mods and SteamDB pages and the bug tracker", async () => {
    assert.deepEqual(await run("Open Nexus Mods Page"), ["https://www.nexusmods.com/XXX/mods"]);
    assert.deepEqual(await run("Open SteamDB Page"), ["https://steamdb.info/app/XXX/"]);
    assert.deepEqual(await run("Submit Bug Report"), ["XXX?tab=bugs"]);
  });

  // The save folder is resolved by an async function whose result is not awaited, so the shell
  // is handed a Promise rather than a path. Pinned so that fixing the template turns this red
  // and the entry gets removed.
  it("known gap: Open Save Folder hands the shell an unresolved promise", async () => {
    const dir = makeGameDir();
    const [handed] = await run("Open Save Folder", discovered(dir));
    assert.ok(handed instanceof Promise);
    assert.equal(await handed, SAVE_DEFAULT);
  });

  it("the save folder resolves to the Xbox location when the Xbox launcher is present", async () => {
    const dir = makeGameDir(["gamelaunchhelper.exe"]);
    const [handed] = await run("Open Save Folder", discovered(dir));
    assert.equal(await handed, SAVE_XBOX);
  });
});
