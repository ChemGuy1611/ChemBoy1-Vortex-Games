"""
check_port_equality.py

Prove a template port did not move anything it should not have. Loads the
extension's OLD index.js and its NEW index.js side by side under the stub
harness in tests/harness/ (no Vortex, no network, nothing written to the repo)
and compares what each one resolves, in four layers:

  1. Constants: every top-level `const`/`let` whose value is a string, number,
     boolean, null or an array of those (paths, ids, store ids, toggles, ...).
  2. Mod types: the ids each registers, and the folder each shared id resolves
     to for a fake install.
  3. Store scenarios: for each store marker exe (default, xbox, demo, epic, gog)
     a fresh fake install folder is built and game.executable() is called on
     it, then every path variable it re-pointed and every shared mod type
     folder is compared again. One more scenario seeds a Steam user-id folder
     under the save path, which exposes a Steam branch that discards it. An
     older OLD file that names the default exe EXEC_DEFAULT is read too.
  4. Installer battery: about 25 sample archive layouts (pak, IO store, wrapper
     folders, LogicMods, UE4SS script/DLL/bundle, root, config, save, binaries,
     extension-less files, FOMOD, empty) are run through Vortex's dispatch rule
     (lowest priority number whose test passes wins) on both sides; the winning
     installer's priority and its install instructions are compared.

Differences are printed. A changed constant, a changed shared mod type path or
a changed path in a store scenario fails the run (exit 1) unless the constant
is named in --allow. Everything else (mod types added/dropped, tools, details,
executable names, installer differences) is informational, because a port
changes those on purpose; --strict-installers makes installer differences fail
too. Judge each printed line yourself.

Limitations (store-specific paths): the store scenarios only exercise what
game.executable() does, and they pick the branch by marker exe file name.
So they cannot reach (a) paths that setup() sets from discovery.store (a
per-store save folder such as an Epic SAVE_PATH_EPIC, or a store folder above
Saved: the frostpunk2 setStorePaths() shape), (b) a game whose Steam, Epic and
GOG builds share ONE exe name, which always lands in the first matching branch
whatever the real store, (c) the Xbox save path with a user-id folder (only
the Steam uid is seeded), and (d) anything needing a real Packages/ or
launcher-manifest folder on disk. Check those by hand against PCGW and the
install. Also not covered: the Vortex FOMOD installer itself (the FOMOD case
only checks that none of this extension's installers claim it).

The OLD side defaults to <folder>/index.js.bak, which port_to_template.py
writes. Sibling .js files from the folder (downloader.js, bundled modules) are
copied next to it so its require() calls resolve.

Usage:
    python check_port_equality.py EXT_ID
    python check_port_equality.py EXT_ID --allow ENGINE_VERSION,EXEC
    python check_port_equality.py EXT_ID --old path/to/old-index.js
    python check_port_equality.py EXT_ID --git-head
    python check_port_equality.py EXT_ID --strict-installers
    python check_port_equality.py EXT_ID --verbose

Options:
    --old PATH          Use this file as the OLD side instead of index.js.bak
    --git-head          Use `git show HEAD:<folder>/index.js` as the OLD side
    --allow LIST        Comma-separated constant names expected to differ
                        (reported, but do not fail the run)
    --strict-installers Installer battery differences fail the run too
    --verbose           Print everything compared, not only the differences

Exit code: 0 = no failing difference, 1 = a constant, shared mod type path or
store-scenario path differs (or an installer, with --strict-installers),
2 = could not run (missing folder, missing old file, node error).
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
import vortex_utils as vu

# Node test body. Parameters arrive through environment variables so this
# string never needs interpolating. It is written to a temp dir and run with
# `node --test` because the harness registers an after() hook from node:test.
NODE_TEST = r"""
"use strict";
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO = process.env.CB1_REPO;
const GAME_DIR = process.env.CB1_FOLDER;
const OLD_FILE = process.env.CB1_OLD_FILE;
const ALLOW = new Set((process.env.CB1_ALLOW || "").split(",").filter(Boolean));
const VERBOSE = process.env.CB1_VERBOSE === "1";
const STRICT_INSTALLERS = process.env.CB1_STRICT === "1";
const { loadExtension } = require(path.join(REPO, "tests", "harness", "load-extension.js"));

const SEP = path.sep;
const TOP_LEVEL = /^(?:const|let|var)[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]*=/gm;
const names = (src) => [...src.matchAll(TOP_LEVEL)].map((m) => m[1]);
const J = (v) => JSON.stringify(v);
const SKIP = new Set(["<undef>", "<non-primitive>", "<tdz>"]);
const comparable = (a, b) => !SKIP.has(a) && !SKIP.has(b);

// Appends a live reader to the module: every call re-reads the current value of each top-level
// name, so it sees what getExecutable() re-pointed after the module loaded.
const appendProbe = (nameList) => (src) =>
  src +
  "\nmodule.exports.__read = () => {\n" +
  "  const ok = (v) => v === null || ['string','number','boolean'].includes(typeof v);\n" +
  "  const ser = (v) => (ok(v) || (Array.isArray(v) && v.every(ok))) ? v : '<non-primitive>';\n" +
  "  const out = {};\n" +
  nameList
    .map((n) => `  try { out[${J(n)}] = (typeof ${n} === 'undefined') ? '<undef>' : ser(${n}); } catch (e) { out[${J(n)}] = '<tdz>'; }\n`)
    .join("") +
  "  return out;\n};\n" +
  // Stand-in for setup(), which sets the store version the installer tests read.
  "module.exports.__setVersion = (v) => { try { GAME_VERSION = v; } catch (e) { /* not a let */ } };\n";

const orderOnly = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && J([...a].sort()) === J([...b].sort());

test("port equality: old vs new", async () => {
  const newSrc = fs.readFileSync(path.join(GAME_DIR, "index.js"), "utf8");
  const oldSrc = fs.readFileSync(OLD_FILE, "utf8");
  const nameList = [...new Set([...names(oldSrc), ...names(newSrc)])];
  const probe = appendProbe(nameList);

  // Old file in its own dir, with the folder's other .js files beside it so require() resolves.
  const oldDir = fs.mkdtempSync(path.join(os.tmpdir(), "cb1-port-old-"));
  for (const f of fs.readdirSync(GAME_DIR)) {
    if (f.endsWith(".js") && f !== "index.js") fs.copyFileSync(path.join(GAME_DIR, f), path.join(oldDir, f));
  }
  fs.copyFileSync(OLD_FILE, path.join(oldDir, "index.js"));

  const FAKE = path.join(os.tmpdir(), "FakeInstall");
  const probeGameId = (/^const GAME_ID = "([^"]+)"/m.exec(newSrc) || [])[1] || "";
  const state = {
    settings: { gameMode: { discovered: { [probeGameId]: { path: FAKE, store: "steam" } } } },
    persistent: { mods: { [probeGameId]: {} }, profiles: {} },
    session: {},
  };
  const load = (dir) => loadExtension(dir, { transform: probe, state });

  let failing = 0;

  // ---------------------------------------------------------------- 1. constants
  const oldExt = await load(oldDir);
  const newExt = await load(GAME_DIR);
  const ob = oldExt.exports.__read();
  const nb = newExt.exports.__read();
  const lines = [];
  let compared = 0;
  for (const k of nameList) {
    const a = ob[k], b = nb[k];
    if (!comparable(a, b)) continue;
    compared++;
    if (J(a) === J(b)) { if (VERBOSE) lines.push(`  =  ${k}: ${J(a)}`); continue; }
    const oo = orderOnly(a, b);
    const allowed = ALLOW.has(k) || oo;
    if (!allowed) failing++;
    const tag = oo ? " (order only)" : ALLOW.has(k) ? " (allowed)" : "";
    lines.push(`  ${allowed ? "~~" : "!="} ${k}${tag}\n       old=${J(a)}\n       new=${J(b)}`);
  }
  const onlyOld = nameList.filter((k) => ob[k] !== "<undef>" && nb[k] === "<undef>");
  const onlyNew = nameList.filter((k) => nb[k] !== "<undef>" && ob[k] === "<undef>");
  console.log(`CONSTANTS compared: ${compared}; differing: ${lines.filter((l) => !l.startsWith("  = ")).length}`);
  if (lines.length) console.log(lines.join("\n"));
  console.log(`  declared only in OLD (${onlyOld.length}): ${onlyOld.join(", ") || "-"}`);
  console.log(`  declared only in NEW: ${onlyNew.length} (not listed)`);

  // ---------------------------------------------------------------- 2. mod types
  const gameId = nb.GAME_ID || probeGameId;
  const typePaths = (ext) => {
    const out = {};
    for (const m of ext.modTypes) {
      try { out[m.id] = String(m.getPath({ id: gameId })); } catch (e) { out[m.id] = "THROW:" + e.message; }
    }
    return out;
  };
  const obPaths = typePaths(oldExt);
  const nbPaths = typePaths(newExt);
  const oIds = Object.keys(obPaths).sort();
  const nIds = Object.keys(nbPaths).sort();
  console.log(`\nMOD TYPES old=${oIds.length} new=${nIds.length}`);
  console.log(`  only in OLD: ${oIds.filter((i) => !nIds.includes(i)).join(", ") || "-"}`);
  console.log(`  only in NEW: ${nIds.filter((i) => !oIds.includes(i)).join(", ") || "-"}`);
  const shared = oIds.filter((i) => nIds.includes(i));
  let pathDiffs = 0;
  for (const id of shared) {
    if (obPaths[id] === nbPaths[id]) { if (VERBOSE) console.log(`  =  ${id}: ${obPaths[id]}`); continue; }
    const allowed = ALLOW.has(id);
    if (!allowed) pathDiffs++;
    console.log(`  ${allowed ? "~~" : "!="} ${id}${allowed ? " (allowed)" : ""}\n       old=${obPaths[id]}\n       new=${nbPaths[id]}`);
  }
  console.log(`  shared ${shared.length}, path diffs ${pathDiffs}`);
  failing += pathDiffs;

  // ---------------------------------------------------------------- game object
  const og = oldExt.game || {}, ng = newExt.game || {};
  const exe = (g) => (typeof g.executable === "function" ? g.executable(FAKE) : g.executable);
  console.log("\nGAME");
  console.log(`  executable old/new: ${exe(og)} / ${exe(ng)}`);
  if (typeof og.requiresLauncher === "function" && typeof ng.requiresLauncher === "function") {
    for (const store of ["steam", "epic", "gog", "xbox"]) {
      let a, b;
      try { a = J(await og.requiresLauncher(FAKE, store)); } catch (e) { a = "THROW"; }
      try { b = J(await ng.requiresLauncher(FAKE, store)); } catch (e) { b = "THROW"; }
      if (a !== b || VERBOSE) console.log(`  requiresLauncher(${store}) old/new: ${a} / ${b}`);
    }
  }
  const tools = (g) => (g.supportedTools || []).map((t) => t.id);
  console.log(`  tools old: ${tools(og).join(", ") || "-"}`);
  console.log(`  tools new: ${tools(ng).join(", ") || "-"}`);
  const od = J(og.details), nd = J(ng.details);
  console.log(od === nd ? "  details: equal" : `  details differ\n       old=${od}\n       new=${nd}`);
  const inst = (e) => e.installers.map((i) => `${i.id}@${i.priority}`).join(", ");
  console.log(`  installers old: ${inst(oldExt)}`);
  console.log(`  installers new: ${inst(newExt)}`);

  // ---------------------------------------------------------------- 3. store scenarios
  // Each scenario gets a fresh load of both files (module state is mutated by getExecutable) and
  // a fake install folder holding only that scenario's marker exe, named from each file's own
  // constants. After executable() runs, every path variable it re-pointed is compared.
  const markerFor = (snap, scenario) => {
    const picks = { default: ["EXEC", "EXEC_DEFAULT"], epic: ["EXEC_EPIC"], gog: ["EXEC_GOG"], demo: ["EXEC_DEMO"], xbox: ["EXEC_XBOX"] }[scenario];
    const real = (k) => { const v = snap[k]; return typeof v === "string" && v && !SKIP.has(v) ? v : undefined; }; //an undeclared constant reads as the "<undef>" sentinel string
    for (const k of picks) if (real(k)) return real(k);
    if (scenario === "xbox") return "gamelaunchhelper.exe";
    return real("EXEC") || real("EXEC_DEFAULT"); //older files name the default exe EXEC_DEFAULT; undefined = no marker file
  };
  const scenarios = [
    { name: "default", from: "default" },
    { name: "xbox", from: "xbox" },
    { name: "demo", from: "demo" },
    { name: "epic", from: "epic" },
    { name: "gog", from: "gog" },
    { name: "default+uid", from: "default", uid: "76561198000000001" },
  ];
  const scratch = [];
  const runSide = async (dir, base, scenario) => {
    const install = fs.mkdtempSync(path.join(os.tmpdir(), "cb1-port-install-"));
    scratch.push(install);
    const marker = markerFor(base, scenario.from);
    if (marker) fs.writeFileSync(path.join(install, marker), "");
    let uidDir;
    if (scenario.uid && typeof nb.SAVE_PATH_DEFAULT === "string") {
      uidDir = path.join(nb.SAVE_PATH_DEFAULT, scenario.uid);
      fs.mkdirSync(uidDir, { recursive: true });
    }
    try {
      const ext = await load(dir);
      let ret;
      try { ret = typeof ext.game.executable === "function" ? await ext.game.executable(install) : ext.game.executable; }
      catch (e) { ret = "THROW:" + e.message; }
      return { exe: ret, snap: ext.exports.__read(), paths: typePaths(ext) };
    } finally {
      if (uidDir) fs.rmSync(uidDir, { recursive: true, force: true });
    }
  };
  console.log("\nSTORE SCENARIOS (executable() on a fake install holding one marker exe)");
  let scenarioDiffs = 0;
  const scenarioLines = [];
  for (const sc of scenarios) {
    const o = await runSide(oldDir, ob, sc);
    const n = await runSide(GAME_DIR, nb, sc);
    const sceneLines = [];
    if (J(o.exe) !== J(n.exe)) sceneLines.push(`     exe  old=${J(o.exe)} new=${J(n.exe)} (informational)`);
    for (const k of nameList) {
      const a = o.snap[k], b = n.snap[k];
      if (!comparable(a, b) || J(a) === J(b)) continue;
      // Already reported as a baseline difference and untouched by this scenario: skip.
      if (J(a) === J(ob[k]) && J(b) === J(nb[k])) continue;
      const allowed = ALLOW.has(k) || orderOnly(a, b);
      if (!allowed) scenarioDiffs++;
      sceneLines.push(`     ${allowed ? "~~" : "!="} ${k}\n          old=${J(a)}\n          new=${J(b)}`);
    }
    for (const id of shared) {
      const a = o.paths[id], b = n.paths[id];
      if (a === b) continue;
      if (a === obPaths[id] && b === nbPaths[id]) continue;
      const allowed = ALLOW.has(id);
      if (!allowed) scenarioDiffs++;
      sceneLines.push(`     ${allowed ? "~~" : "!="} mod type ${id}${allowed ? " (allowed)" : ""}\n          old=${a}\n          new=${b}`);
    }
    if (sceneLines.length || VERBOSE) scenarioLines.push(`  [${sc.name}] exe old/new: ${J(o.exe)} / ${J(n.exe)}` + (sceneLines.length ? "\n" + sceneLines.join("\n") : " - equal"));
  }
  for (const d of scratch) fs.rmSync(d, { recursive: true, force: true });
  console.log(scenarioLines.length ? scenarioLines.join("\n") : `  ${scenarios.length} scenarios, all equal`);
  console.log(`  scenarios ${scenarios.length}, path differences ${scenarioDiffs}`);
  failing += scenarioDiffs;

  // ---------------------------------------------------------------- 4. installer battery
  const EPIC = nb.EPIC_CODE_NAME || ob.EPIC_CODE_NAME || "Game";
  const f = (...p) => p.join(SEP);
  const d = (...p) => p.join(SEP) + SEP;
  const pakSet = (...dir) => [f(...dir, "Mod_P.pak"), f(...dir, "Mod_P.ucas"), f(...dir, "Mod_P.utoc")];
  const tree = (...dir) => dir.map((_, i) => d(...dir.slice(0, i + 1)));
  const cases = {
    "pak only": [f("Mod.pak")],
    "pak + io store": pakSet(),
    "pak in wrapper folder": [d("Cool Mod"), ...pakSet("Cool Mod")],
    "pak in game ~mods tree": [...tree(EPIC, "Content", "Paks", "~mods"), ...pakSet(EPIC, "Content", "Paks", "~mods")],
    "logicmods folder": [d("LogicMods"), f("LogicMods", "BP.pak")],
    "logicmods nested": [d("Mod"), d("Mod", "LogicMods"), f("Mod", "LogicMods", "BP.pak")],
    "ue4ss script mod": [d("MyMod"), d("MyMod", "Scripts"), f("MyMod", "Scripts", "main.lua"), f("MyMod", "enabled.txt")],
    "ue4ss script mod, no wrapper": [d("Scripts"), f("Scripts", "main.lua")],
    "ue4ss dll mod": [d("MyDll"), d("MyDll", "dlls"), f("MyDll", "dlls", "main.dll")],
    "ue4ss bundle (root)": [f("dwmapi.dll"), d("ue4ss"), f("ue4ss", "UE4SS-settings.ini"), ...tree("ue4ss", "Mods", "Foo", "Scripts"), f("ue4ss", "Mods", "Foo", "Scripts", "main.lua")],
    "ue4ss bundle (game tree)": [...tree(EPIC, "Binaries", "Win64"), f(EPIC, "Binaries", "Win64", "dwmapi.dll"), d(EPIC, "Binaries", "Win64", "ue4ss"), f(EPIC, "Binaries", "Win64", "ue4ss", "UE4SS-settings.ini")],
    "combo (pak + lua)": [...tree(EPIC, "Content", "Paks", "~mods"), ...pakSet(EPIC, "Content", "Paks", "~mods"), ...tree(EPIC, "Binaries", "Win64", "ue4ss", "Mods", "Foo", "Scripts"), f(EPIC, "Binaries", "Win64", "ue4ss", "Mods", "Foo", "Scripts", "main.lua")],
    "root folder mod": [...tree(EPIC, "Content"), f(EPIC, "Content", "thing.bin")],
    "root: Engine folder": [...tree("Engine", "Config"), f("Engine", "Config", "Base.ini")],
    "config: Engine.ini": [f("Engine.ini")],
    "config: GameUserSettings.ini": [f("GameUserSettings.ini")],
    "config in wrapper": [d("Preset"), f("Preset", "Engine.ini")],
    "save: .sav": [f("AutoSave.sav")],
    "save in wrapper": [d("Saves"), f("Saves", "AutoSave.sav")],
    "binaries: dll": [f("tool.dll")],
    "binaries: exe": [f("tool.exe")],
    "binaries: asi + ini": [f("mod.asi"), f("mod.ini")],
    "extension-less file": [f("somefile")],
    "extension-less in folder": [d("Mod"), f("Mod", "NOEXT")],
    "readme only": [f("readme.txt")],
    "fomod": [d("fomod"), f("fomod", "ModuleConfig.xml"), f("Mod.pak")],
    "empty archive": [],
  };
  const normInstr = (r) =>
    ((r && r.instructions) || [])
      .map((i) => {
        const o = {};
        for (const k of ["type", "source", "destination", "key", "value", "section", "path"]) {
          if (i[k] !== undefined) o[k] = i[k];
        }
        return J(o);
      })
      .sort();
  const dest = path.join(os.tmpdir(), "FakeStaging", "Test Mod-1-0-1700000000");
  // Installer tests read the store version getExecutable() sets (GAME_VERSION, the save-mod gate),
  // so run the default-store executable() on each side before replaying the battery.
  // Some installers (save) re-derive the store version from the discovery folder itself, so that
  // folder gets a real default marker exe for the battery.
  fs.mkdirSync(FAKE, { recursive: true });
  for (const snap of [ob, nb]) fs.writeFileSync(path.join(FAKE, markerFor(snap, "default")), "");
  for (const [ext, snap] of [[oldExt, ob], [newExt, nb]]) {
    const install = fs.mkdtempSync(path.join(os.tmpdir(), "cb1-port-battery-"));
    scratch.push(install);
    fs.writeFileSync(path.join(install, markerFor(snap, "default")), "");
    try { await ext.game.executable(install); } catch (e) { /* reported by the scenarios */ }
    // A Steam-only game's executable() returns early without setting GAME_VERSION (setup() does).
    ext.exports.__setVersion("steam");
  }
  // Vortex asks installers in ascending priority order; the first whose test passes wins.
  const dispatch = async (ext, files) => {
    const list = [...ext.installers].sort((a, b) => a.priority - b.priority);
    for (const it of list) {
      let sup;
      try { sup = await it.testSupported(files, gameId); }
      catch (e) { return { win: it, error: "test THROW: " + e.message, out: [] }; }
      if (sup && sup.supported) {
        try {
          const r = await it.install(files, dest, gameId, () => {}, undefined, false, "archive.zip");
          return { win: it, out: normInstr(r) };
        } catch (e) { return { win: it, error: "install THROW: " + e.message, out: [] }; }
      }
    }
    return { win: null, out: [] };
  };
  const label = (r) => (r.win ? `${r.win.id}@${r.win.priority}` : "none") + (r.error ? ` [${r.error}]` : "");
  console.log("\nINSTALLER BATTERY (Vortex dispatch: lowest priority number whose test passes wins)");
  let installerDiffs = 0;
  const caseNames = Object.keys(cases);
  for (const name of caseNames) {
    const files = cases[name];
    const o = await dispatch(oldExt, files);
    const n = await dispatch(newExt, files);
    const slotSame = (o.win ? o.win.priority : null) === (n.win ? n.win.priority : null);
    const errSame = (o.error || "") === (n.error || "");
    const outSame = J(o.out) === J(n.out);
    if (slotSame && errSame && outSame) {
      if (VERBOSE) console.log(`  =  ${name}: ${label(n)} (${n.out.length} instruction${n.out.length === 1 ? "" : "s"})`);
      continue;
    }
    installerDiffs++;
    console.log(`  ${STRICT_INSTALLERS ? "!=" : "~~"} ${name}\n       old: ${label(o)}\n       new: ${label(n)}`);
    const oSet = new Set(o.out), nSet = new Set(n.out);
    for (const s of o.out) if (!nSet.has(s)) console.log(`       - ${s}`);
    for (const s of n.out) if (!oSet.has(s)) console.log(`       + ${s}`);
  }
  console.log(`  cases ${caseNames.length}, differing ${installerDiffs}${STRICT_INSTALLERS ? "" : " (informational; --strict-installers fails on these)"}`);
  if (STRICT_INSTALLERS) failing += installerDiffs;
  for (const dir of [...scratch, oldDir, FAKE]) fs.rmSync(dir, { recursive: true, force: true });

  console.log(`\nRESULT: ${failing === 0 ? "PASS" : "FAIL"} (${failing} failing difference${failing === 1 ? "" : "s"})`);
  fs.writeFileSync(process.env.CB1_RESULT, failing === 0 ? "PASS" : "FAIL");
});
"""


def main():
    sys.stdout.reconfigure(errors="replace")  # node's reporter prints non-ASCII marks
    parser = argparse.ArgumentParser(
        description="Compare what an extension's old and new index.js resolve, under the stub harness."
    )
    parser.add_argument("ext_id", help="extension id (game-<id> or helper-<id>)")
    parser.add_argument("--old", help="OLD index.js to compare against (default: <folder>/index.js.bak)")
    parser.add_argument("--git-head", action="store_true", help="use HEAD's index.js as the OLD side")
    parser.add_argument("--allow", default="", help="comma-separated constants expected to differ")
    parser.add_argument("--strict-installers", action="store_true",
                        help="installer battery differences fail the run too")
    parser.add_argument("--verbose", action="store_true", help="print equal results too")
    args = parser.parse_args()

    folder, _kind = vu.resolve_extension_folder(args.ext_id)
    if not folder:
        print(f"ERROR: no game-{args.ext_id} or helper-{args.ext_id} folder")
        return 2
    if not os.path.isfile(os.path.join(folder, "index.js")):
        print(f"ERROR: {folder} has no index.js")
        return 2
    if shutil.which("node") is None:
        print("ERROR: node not found on PATH")
        return 2

    work = tempfile.mkdtemp(prefix="cb1-port-equality-")
    try:
        if args.old:
            old_file = os.path.abspath(args.old)
        elif args.git_head:
            rel = os.path.relpath(os.path.join(folder, "index.js"), vu.REPO_ROOT).replace(os.sep, "/")
            shown = subprocess.run(
                ["git", "show", f"HEAD:{rel}"], cwd=vu.REPO_ROOT, capture_output=True
            )
            if shown.returncode != 0:
                print(f"ERROR: git show HEAD:{rel} failed: {shown.stderr.decode(errors='replace').strip()}")
                return 2
            old_file = os.path.join(work, "old-index.js")
            with open(old_file, "wb") as fh:
                fh.write(shown.stdout)
        else:
            old_file = os.path.join(folder, "index.js.bak")
        if not os.path.isfile(old_file):
            print(f"ERROR: OLD file not found: {old_file} (use --old or --git-head)")
            return 2

        test_file = os.path.join(work, "port_equality.test.js")
        with open(test_file, "w", encoding="utf-8") as fh:
            fh.write(NODE_TEST)

        result_file = os.path.join(work, "result.txt")
        env = dict(os.environ)
        env.update(
            CB1_REPO=vu.REPO_ROOT,
            CB1_FOLDER=folder,
            CB1_OLD_FILE=old_file,
            CB1_ALLOW=args.allow,
            CB1_VERBOSE="1" if args.verbose else "0",
            CB1_STRICT="1" if args.strict_installers else "0",
            CB1_RESULT=result_file,
        )
        print(f"Comparing {os.path.basename(folder)}: OLD={old_file}")
        run = subprocess.run(
            ["node", "--test", "--test-reporter=spec", test_file],
            cwd=vu.REPO_ROOT, env=env, capture_output=True, text=True, encoding="utf-8",
        )
        if not os.path.isfile(result_file):
            # The test never reached its verdict: show everything node said.
            print(run.stdout)
            print(run.stderr)
            print("ERROR: the comparison did not complete (see output above)")
            return 2
        # Print the report up to the verdict line; the node test-runner trailer adds nothing.
        for line in run.stdout.splitlines():
            print(line)
            if line.startswith("RESULT:"):
                break
        with open(result_file, encoding="utf-8") as fh:
            return 0 if fh.read().strip() == "PASS" else 1
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
