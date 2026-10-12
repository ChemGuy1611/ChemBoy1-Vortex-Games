/**
 * parser_snapshot.js
 * Regression check for extension_parser.js. Records what the parser extracts from every extension
 * folder (installers, spec mod types, registerModType calls), then diffs a later run against that
 * recording. Run it around any change to extension_parser.js: the generated docs are built from
 * these extractions, so a changed row here is a changed row in EXTENSION_EXPLAINED.md /
 * NOTES_FOR_MOD_AUTHORS.md, and an unexpected row is a parser regression.
 *
 * Usage:
 *   node parser_snapshot.js --out FILE [FOLDER ...]       record the current extractions
 *   node parser_snapshot.js --compare FILE [FOLDER ...]   extract again, print what differs from FILE
 *
 * Flags:
 *   --out FILE       Write the snapshot as JSON. Keep FILE outside the repo (OS temp folder).
 *   --compare FILE   Read a snapshot written by --out and print every entry added (+) or removed (-)
 *                    per folder, then a summary line.
 *   FOLDER           Only these extensions. Accepts a bare id (farcry4), a folder name (game-farcry4,
 *                    template-ue4-5, helper-x) or a zCustomGames/<name> path. Default: every game-*,
 *                    template-*, helper-* folder and every zCustomGames/* folder with an index.js.
 *
 * Exit codes: 0 no differences (or snapshot written), 1 at least one difference, 2 usage error.
 */

const fs = require("fs");
const path = require("path");
const parser = require("./extension_parser");

const REPO = __dirname;
const KINDS = ["installers", "modTypes", "registerModTypes"];

function allFolders() {
  const out = [];
  for (const name of fs.readdirSync(REPO)) {
    if (/^(game|template|helper)-/.test(name)) out.push(name);
  }
  const custom = path.join(REPO, "zCustomGames");
  if (fs.existsSync(custom)) {
    for (const name of fs.readdirSync(custom)) out.push(`zCustomGames/${name}`);
  }
  return out.filter((f) => fs.existsSync(path.join(REPO, f, "index.js"))).sort();
}

function resolveFolder(arg) {
  const normal = arg.replace(/\\/g, "/");
  for (const candidate of [normal, `game-${normal}`]) {
    if (fs.existsSync(path.join(REPO, candidate, "index.js"))) return candidate;
  }
  return null;
}

function extract(folder) {
  const src = fs.readFileSync(path.join(REPO, folder, "index.js"), "utf8");
  try {
    const table = parser.buildSymbolTable(src);
    return {
      installers: parser.extractInstallers(src, table),
      modTypes: parser.extractModTypes(src, table),
      registerModTypes: parser.extractRegisterModTypes(src, table),
    };
  } catch (err) {
    return { error: String(err && err.message ? err.message : err) };
  }
}

function snapshot(folders) {
  const snap = {};
  for (const folder of folders) snap[folder] = extract(folder);
  return snap;
}

/** Entries of one kind as a multiset of JSON strings, so order changes alone do not count. */
function entries(rec, kind) {
  if (!rec) return [];
  if (rec.error) return kind === "installers" ? [`ERROR ${rec.error}`] : [];
  return (rec[kind] || []).map((e) => JSON.stringify(e));
}

function multisetDiff(before, after) {
  const counts = new Map();
  for (const e of before) counts.set(e, (counts.get(e) || 0) + 1);
  const added = [];
  for (const e of after) {
    if (counts.get(e)) counts.set(e, counts.get(e) - 1);
    else added.push(e);
  }
  const removed = [];
  for (const [e, n] of counts) for (let i = 0; i < n; i++) removed.push(e);
  return { added, removed };
}

function usage(msg) {
  if (msg) console.error(msg);
  console.error("usage: node parser_snapshot.js (--out FILE | --compare FILE) [FOLDER ...]");
  process.exit(2);
}

function main() {
  const argv = process.argv.slice(2);
  let mode = null;
  let file = null;
  const wanted = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" || a === "--compare") {
      if (mode) usage("give only one of --out / --compare");
      mode = a.slice(2);
      file = argv[++i];
      if (!file) usage(`${a} needs a file`);
    } else if (a.startsWith("--")) {
      usage(`unknown flag ${a}`);
    } else {
      wanted.push(a);
    }
  }
  if (!mode) usage("need --out FILE or --compare FILE");

  let folders = allFolders();
  if (wanted.length) {
    folders = wanted.map((w) => {
      const f = resolveFolder(w);
      if (!f) usage(`no extension folder with an index.js matches "${w}"`);
      return f;
    });
  }

  const now = snapshot(folders);

  if (mode === "out") {
    fs.writeFileSync(file, JSON.stringify(now, null, 1));
    console.log(`snapshot of ${folders.length} folder(s) written to ${file}`);
    return;
  }

  let before;
  try {
    before = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    usage(`cannot read snapshot ${file}: ${err.message}`);
  }
  let changed = 0;
  let skipped = 0;
  for (const folder of folders) {
    if (!(folder in before)) {
      skipped++;
      continue;
    }
    const lines = [];
    for (const kind of KINDS) {
      const { added, removed } = multisetDiff(
        entries(before[folder], kind),
        entries(now[folder], kind),
      );
      for (const e of removed) lines.push(`  - ${kind}: ${e}`);
      for (const e of added) lines.push(`  + ${kind}: ${e}`);
    }
    if (lines.length) {
      changed++;
      console.log(`${folder}`);
      console.log(lines.join("\n"));
    }
  }
  const note = skipped ? ` (${skipped} not in the snapshot, skipped)` : "";
  console.log(`${folders.length - skipped} folder(s) compared, ${changed} changed${note}`);
  process.exit(changed ? 1 : 0);
}

main();
