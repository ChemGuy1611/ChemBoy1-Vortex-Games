/**
 * audit_deprecated_usage.js
 * Finds live uses of Vortex APIs that are deprecated or removed, by walking each extension's
 * JavaScript as an AST (comments, string contents and commented-out blocks never match, and
 * a call split over several lines is still seen). Raw line greps give wrong answers for this
 * job: they count commented-out code and miss multi-line `util` newline `.toPromise(` chains.
 *
 * Scans game-*, template-*, helper-*, zCustomGames and the shared sources in
 * resources/browsers, resources/downloader and resources/templates. zArchive and
 * node_modules are skipped.
 *
 * Also checks that the FAMILIES table below is complete: every symbol tagged @deprecated in
 * resources/api.d.ts (the published typings) must belong to a family, and every family symbol
 * must still carry the tag. Refresh api.d.ts first, then run this to see if the set changed.
 *
 * Usage:
 *   node audit_deprecated_usage.js
 *   node audit_deprecated_usage.js GAME_ID [GAME_ID ...]
 *   node audit_deprecated_usage.js --files
 *   node audit_deprecated_usage.js --json
 *   node audit_deprecated_usage.js --strict
 *
 * Flags:
 *   GAME_ID [GAME_ID ...]  Only scan the listed ids. Resolves game-<ID>, then template-<ID>,
 *                          then helper-<ID>. The shared resources/ sources are skipped.
 *   --files                Also list every hit as file:line symbol, grouped by family.
 *   --json                 Write machine-readable JSON to stdout instead of the text report.
 *   --strict               Exit 1 on any hit in a family that is not marked tolerated, or on
 *                          any table drift against api.d.ts.
 *
 * JSON output schema:
 *   { timestamp, scanned: { jsFiles, infoJson }, typings: { deprecated, unmapped, stale },
 *     liveHits, strictFailed, families: [{ id, hits, files, tolerated, hint,
 *     locations: [{ file, line, symbol, form }] }] }
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = __dirname;
const TYPINGS = path.join(ROOT, "resources", "api.d.ts");
const FOLDER_PREFIXES = ["game-", "template-", "helper-"];
const EXTRA_ROOTS = [
  "zCustomGames",
  path.join("resources", "browsers"),
  path.join("resources", "downloader"),
  path.join("resources", "templates"),
];
const SKIP_DIRS = new Set(["node_modules", "zArchive", ".git"]);

// Receiver names that, when never declared in the file, are probably Vortex's util / fs handed
// in some other way (a parameter, a global). Hits through them are reported as unresolved.
const UNRESOLVED_RECEIVERS = { util: "util", fs: "fs", vfs: "fs" };

// One entry per deprecated or removed API.
//   via       where the member is read from: "util" or "fs" (a `vortex-api` export bound in the
//             file), "any" (a method on any object, e.g. the extension context), or "info.json"
//             / "type" for the two families that are not call sites.
//   names     the member names as written in extension code.
//   typings   the symbol keys api.d.ts tags @deprecated for this family (empty when the family
//             is not tagged there). Interface members are "Owner.member".
//   tolerated why a hit does not fail --strict, when it is expected.
const FAMILIES = [
  {
    id: "error-classes",
    via: "util",
    names: [
      "UserCanceled",
      "ProcessCanceled",
      "DataInvalid",
      "SetupError",
      "MissingInterpreter",
      "NotFound",
      "NotSupportedError",
      "ArgumentInvalid",
      "CycleError",
      "GameNotFound",
    ],
    hint: "VortexError directly, and err?.data?.kind checks in place of instanceof",
  },
  {
    id: "state-helpers",
    via: "util",
    names: [
      "getSafe",
      "getSafeCI",
      "mutateSafe",
      "setSafe",
      "setOrNop",
      "changeOrNop",
      "deleteOrNop",
      "setDefaultArray",
      "pushSafe",
      "addUniqueSafe",
      "removeValue",
      "removeValueIf",
      "merge",
      "rehydrate",
    ],
    hint: "optional chaining and nullish coalescing for reads, spread syntax for writes",
  },
  {
    id: "fs-wrappers",
    via: "fs",
    names: [
      "isDirectoryAsync",
      "ensureDirSync",
      "ensureFileAsync",
      "ensureDirAsync",
      "copyAsync",
      "linkAsync",
      "renameAsync",
      "removeAsync",
      "readlinkAsync",
    ],
    hint: "node:fs or node:fs/promises directly",
  },
  {
    id: "fs-passthroughs",
    via: "fs",
    names: [
      "accessSync",
      "appendFileSync",
      "closeSync",
      "createReadStream",
      "createWriteStream",
      "linkSync",
      "openSync",
      "readdirSync",
      "readFileSync",
      "statSync",
      "symlinkSync",
      "watch",
      "writeFileSync",
      "writeSync",
      "constants",
      "Stats",
      "WriteStream",
      "FSWatcher",
    ],
    typings: [],
    tolerated: "tagged in Vortex source only, the published typings drop the tag",
    hint: "node:fs directly (these are 1:1 re-exports already)",
  },
  {
    id: "opn",
    via: "util",
    names: ["opn"],
    typings: ["open"],
    hint: "window.api.shell.openUrl / openFile",
  },
  {
    id: "toPromise",
    via: "util",
    names: ["toPromise"],
    hint: "wrap the call in a plain new Promise",
  },
  {
    id: "makeRemoteCall",
    via: "util",
    names: ["makeRemoteCall"],
    hint: "window.api (IPC from renderer to main)",
  },
  {
    id: "store-shims",
    via: "util",
    names: ["steam", "epicGamesLauncher"],
    typings: ["steamShim", "epicGamesLauncherShim"],
    hint: 'util.GameStoreHelper.findByAppId(id, "steam" | "epic") / findByName(name, store)',
  },
  {
    id: "onceMain",
    via: "any",
    names: ["onceMain"],
    typings: ["IExtensionContext.onceMain"],
    hint: "once (renderer); a separate NodeJS process plus IPC if the main process is needed",
  },
  {
    id: "registerLoadOrderPage",
    via: "any",
    names: ["registerLoadOrderPage"],
    typings: [],
    tolerated: "toggle-gated legacy path kept beside registerLoadOrder; not tagged in the typings",
    hint: "registerLoadOrder (File-Based Load Order)",
  },
  {
    id: "removed-game-store-apis",
    via: "any",
    names: ["registerGameStore", "registerGameVersionProvider"],
    typings: [],
    hint: "removed in Vortex 2.8.0-beta.1; use util.GameStoreHelper / the tiered getGameVersion",
  },
  {
    id: "extension-info-keys",
    via: "info.json",
    names: ["type", "bundled", "path", "fileId", "issueTrackerURL"],
    typings: [
      "ExtensionInfo.type",
      "ExtensionInfo.bundled",
      "ExtensionInfo.path",
      "ExtensionInfo.fileId",
      "ExtensionInfo.issueTrackerURL",
    ],
    hint: "drop the key from info.json; Vortex no longer reads it (since 2.7.0)",
  },
  {
    // Not scanned on purpose: Vortex 2.8.2+ reads info.json modId again (restores the link of
    // extensions installed before 2.7), and release_extension.py keeps it equal to the mod id
    // at the end of EXTENSION_URL. Still listed so the typings drift check keeps it mapped.
    id: "extension-info-modId",
    via: "type",
    names: [],
    typings: ["ExtensionInfo.modId"],
    hint: "keep it in info.json (release_extension.py stamps it from EXTENSION_URL)",
  },
  {
    id: "IExtension-type",
    via: "type",
    names: [],
    typings: ["IExtension"],
    hint: "type alias for ExtensionInfo; JS has no use site, so there is nothing to scan",
  },
].map((f) => ({ typings: f.names, tolerated: null, ...f }));

// ── typings drift check ──────────────────────────────────────────────────────

const DECL_KINDS = new Set([
  ts.SyntaxKind.PropertySignature,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.VariableStatement,
]);

/** Return the set of symbol keys tagged @deprecated in the typings file. */
function deprecatedSymbols() {
  const sf = ts.createSourceFile(
    TYPINGS,
    fs.readFileSync(TYPINGS, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const found = new Set();
  const namesOf = (node) =>
    ts.isVariableStatement(node)
      ? node.declarationList.declarations.map((d) => d.name.getText(sf))
      : node.name
        ? [node.name.getText(sf)]
        : [];
  const walk = (node, owner) => {
    if (DECL_KINDS.has(node.kind) && ts.getJSDocDeprecatedTag(node)) {
      for (const name of namesOf(node)) found.add(owner ? `${owner}.${name}` : name);
    }
    const nextOwner =
      (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node)) && node.name
        ? node.name.text
        : owner;
    ts.forEachChild(node, (child) => walk(child, nextOwner));
  };
  walk(sf, null);
  return found;
}

// ── file discovery ───────────────────────────────────────────────────────────

function resolveRoots(ids) {
  if (ids.length === 0) {
    const roots = fs
      .readdirSync(ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory() && FOLDER_PREFIXES.some((p) => e.name.startsWith(p)))
      .map((e) => path.join(ROOT, e.name));
    for (const extra of EXTRA_ROOTS) {
      const abs = path.join(ROOT, extra);
      if (fs.existsSync(abs)) roots.push(abs);
    }
    return roots;
  }
  return ids.map((id) => {
    for (const prefix of FOLDER_PREFIXES) {
      const abs = path.join(ROOT, prefix + id);
      if (fs.existsSync(abs)) return abs;
    }
    console.error(`Error: no game-, template- or helper- folder for '${id}'.`);
    process.exit(1);
  });
}

/** Collect every .js file and info.json under dir, skipping SKIP_DIRS. */
function collect(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collect(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith(".js") || entry.name === "info.json") {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/");

// ── AST analysis ─────────────────────────────────────────────────────────────

/** Return the family that owns `name` when read through `via` ("util", "fs", or null). */
function lookup(via, name) {
  return FAMILIES.find((f) => f.names.includes(name) && (f.via === "any" || f.via === via)) || null;
}

/** For a.b or a["b"] return { object, name, node }, else null. */
function memberAccess(node) {
  if (ts.isPropertyAccessExpression(node))
    return { object: node.expression, name: node.name.text, node: node.name };
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
    return {
      object: node.expression,
      name: node.argumentExpression.text,
      node: node.argumentExpression,
    };
  }
  return null;
}

const isVortexRequire = (n) =>
  ts.isCallExpression(n) &&
  ts.isIdentifier(n.expression) &&
  n.expression.text === "require" &&
  n.arguments.length === 1 &&
  ts.isStringLiteralLike(n.arguments[0]) &&
  n.arguments[0].text === "vortex-api";

/** Return the hits for one .js file. */
function analyzeJs(abs) {
  const sf = ts.createSourceFile(
    abs,
    fs.readFileSync(abs, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const scope = new Map(); // local name -> { module: true } | { member: "util" | "fs" | ... }
  const declared = new Set(); // every variable declared in the file, vortex-bound or not
  const hits = [];

  /** What Vortex thing does this expression denote: the module, one of its members, or nothing. */
  const classify = (expr) => {
    while (ts.isParenthesizedExpression(expr)) expr = expr.expression;
    if (isVortexRequire(expr)) return { module: true };
    if (ts.isIdentifier(expr)) return scope.get(expr.text) || null;
    const m = memberAccess(expr);
    if (m && classify(m.object)?.module) return { member: m.name };
    return null;
  };

  const record = (via, name, node, form) => {
    const family = lookup(via, name);
    if (!family) return false;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    hits.push({ family: family.id, symbol: name, line: line + 1, form });
    return true;
  };

  const bindingKey = (el) => {
    const key = el.propertyName || el.name;
    return ts.isIdentifier(key) || ts.isStringLiteralLike(key) ? key.text : null;
  };

  const bind = (name, src) => {
    if (ts.isIdentifier(name)) {
      declared.add(name.text);
      if (src) scope.set(name.text, src);
      return;
    }
    if (!ts.isObjectBindingPattern(name)) return;
    for (const el of name.elements) {
      const key = el.dotDotDotToken ? null : bindingKey(el);
      if (key !== null && src?.module) {
        bind(el.name, { member: key });
      } else {
        // Destructuring a name straight off util / fs: the use is at this site.
        if (key !== null && src?.member) record(src.member, key, el.name, "destructure");
        bind(el.name, null);
      }
    }
  };

  const collectBindings = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer)
      bind(node.name, classify(node.initializer));
    else if (ts.isVariableDeclaration(node)) bind(node.name, null);
    ts.forEachChild(node, collectBindings);
  };

  const findUses = (node) => {
    const m = memberAccess(node);
    if (m) {
      const recv = classify(m.object);
      if (recv?.member) {
        record(recv.member, m.name, m.node, "access");
      } else if (
        ts.isIdentifier(m.object) &&
        !recv &&
        !scope.has(m.object.text) &&
        !declared.has(m.object.text)
      ) {
        const via = UNRESOLVED_RECEIVERS[m.object.text];
        const family = via && lookup(via, m.name);
        if (family && family.via !== "any" && !family.tolerated)
          record(via, m.name, m.node, "unresolved-receiver");
        else record(null, m.name, m.node, "access");
      } else {
        record(null, m.name, m.node, "access"); // only via:"any" families can match here
      }
    }
    ts.forEachChild(node, findUses);
  };

  collectBindings(sf);
  findUses(sf);
  return hits.sort((a, b) => a.line - b.line);
}

/** Return the hits for one info.json file: any key whose Vortex ExtensionInfo field is deprecated. */
function analyzeInfoJson(abs) {
  const family = FAMILIES.find((f) => f.via === "info.json");
  let info;
  try {
    info = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    return [];
  }
  return family.names
    .filter((key) => Object.prototype.hasOwnProperty.call(info, key))
    .map((key) => ({ family: family.id, symbol: key, line: 1, form: "info.json" }));
}

// ── report ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const ids = args.filter((a) => !a.startsWith("--"));
  const KNOWN_FLAGS = new Set(["--files", "--json", "--strict"]);
  for (const f of flags) {
    if (!KNOWN_FLAGS.has(f)) {
      console.error(`Error: unknown flag '${f}'. Known flags: ${[...KNOWN_FLAGS].join(", ")}`);
      process.exit(1);
    }
  }

  const files = [];
  for (const root of resolveRoots(ids)) collect(root, files);
  const jsFiles = files.filter((f) => f.endsWith(".js"));
  const infoFiles = files.filter((f) => f.endsWith("info.json"));

  const locations = new Map(FAMILIES.map((f) => [f.id, []]));
  for (const abs of files) {
    const hits = abs.endsWith("info.json") ? analyzeInfoJson(abs) : analyzeJs(abs);
    for (const h of hits)
      locations
        .get(h.family)
        .push({ file: rel(abs), line: h.line, symbol: h.symbol, form: h.form });
  }

  const deprecated = deprecatedSymbols();
  const claimed = new Set(FAMILIES.flatMap((f) => f.typings));
  const unmapped = [...deprecated].filter((s) => !claimed.has(s)).sort();
  const stale = [...claimed].filter((s) => !deprecated.has(s)).sort();

  const rows = FAMILIES.map((f) => {
    const locs = locations.get(f.id);
    return {
      id: f.id,
      hits: locs.length,
      files: new Set(locs.map((l) => l.file)).size,
      tolerated: f.tolerated,
      hint: f.hint,
      locations: locs,
    };
  });
  const liveHits = rows.reduce((n, r) => n + r.hits, 0);
  const strictHits = rows.filter((r) => !r.tolerated).reduce((n, r) => n + r.hits, 0);
  const strictFailed = strictHits > 0 || unmapped.length > 0 || stale.length > 0;

  if (flags.has("--json")) {
    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          scanned: { jsFiles: jsFiles.length, infoJson: infoFiles.length },
          typings: { deprecated: deprecated.size, unmapped, stale },
          liveHits,
          strictFailed,
          families: rows,
        },
        null,
        2,
      ),
    );
  } else {
    printReport(
      rows,
      { jsFiles: jsFiles.length, infoJson: infoFiles.length },
      deprecated.size,
      unmapped,
      stale,
      flags.has("--files"),
    );
  }
  process.exit(flags.has("--strict") && strictFailed ? 1 : 0);
}

function printReport(rows, scanned, deprecatedCount, unmapped, stale, showFiles) {
  console.log(`Scanned ${scanned.jsFiles} JS files and ${scanned.infoJson} info.json files.\n`);
  const idWidth = Math.max(...rows.map((r) => r.id.length), "Family".length);
  console.log(`${"Family".padEnd(idWidth)}  ${"Hits".padStart(5)}  ${"Files".padStart(5)}  Note`);
  console.log(`${"-".repeat(idWidth)}  -----  -----  ----`);
  for (const r of rows) {
    const note = r.tolerated ? `tolerated: ${r.tolerated}` : "";
    console.log(
      `${r.id.padEnd(idWidth)}  ${String(r.hits).padStart(5)}  ${String(r.files).padStart(5)}  ${note}`,
    );
  }

  if (showFiles) {
    for (const r of rows.filter((x) => x.hits > 0)) {
      console.log(`\n${r.id}  ->  ${r.hint}`);
      for (const l of r.locations) {
        const mark =
          l.form === "unresolved-receiver" ? "  [receiver not bound from vortex-api]" : "";
        console.log(`  ${l.file}:${l.line}  ${l.symbol}${mark}`);
      }
    }
  }

  const live = rows.reduce((n, r) => n + r.hits, 0);
  const families = rows.filter((r) => r.hits > 0).length;
  console.log(
    `\nLive hits: ${live} in ${families} ${families === 1 ? "family" : "families"}.${live > 0 && !showFiles ? " Re-run with --files for locations." : ""}`,
  );

  const driftOk = unmapped.length === 0 && stale.length === 0;
  console.log(
    `Typings: ${deprecatedCount} @deprecated symbols in resources/api.d.ts, ${driftOk ? "all mapped to a family" : "table out of date"}.`,
  );
  for (const s of unmapped)
    console.log(`  UNMAPPED  ${s}  (tagged @deprecated, add it to FAMILIES)`);
  for (const s of stale)
    console.log(`  STALE     ${s}  (in FAMILIES, no longer tagged @deprecated)`);
}

if (require.main === module) main();

module.exports = { analyzeJs };
