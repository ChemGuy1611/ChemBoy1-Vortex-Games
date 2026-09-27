/**
 * replace_util_opn.js
 * Replaces deprecated util.opn(target) calls in game-[*] extensions with
 * window.api.shell.openUrl(target) / window.api.shell.openFile(target), each
 * wrapped in a try/catch that shows an error notification.
 *
 * Every call site is parsed (espree) and scope-analyzed (eslint-scope):
 *   - The target is classified as a URL or a path from the argument itself,
 *     from the value bound to the identifier it names, or from the name.
 *   - The notification uses the nearest `api`, `context` (-> context.api), or
 *     React.useContext(MainContext) variable actually in scope at the call.
 * Sites that cannot be classified, have no resolvable API reference, sit in an
 * unsupported expression position, or chain more than a plain .catch() are
 * left untouched and listed in the report for hand conversion.
 * Each rewritten file must re-parse, pass `node --check`, and have every
 * inserted API reference bind to a real variable before it is written.
 *
 * Usage:
 *   node replace_util_opn.js
 *   node replace_util_opn.js GAME_ID [GAME_ID ...]
 *   node replace_util_opn.js --dry-run
 *   node replace_util_opn.js --report PATH
 *   node replace_util_opn.js --file IN.js --out OUT.js
 *
 * Flags:
 *   GAME_ID [GAME_ID ...]  Only process these games (folder suffix or GAME_ID). Default: every
 *                          game-[*] folder still holding util.opn(, except deprecated extensions.
 *   --dry-run              Convert and validate in memory, write nothing.
 *   --report PATH          Write the unconverted-site report to PATH (default: printed to stdout).
 *   --file IN.js           Process one arbitrary file instead of game folders.
 *   --out OUT.js           With --file: write the result here instead of back to IN.js.
 *
 * Exit code: 0 = every site converted, 1 = any site left for hand conversion or any file error.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const espree = require("espree");
const eslintScope = require("eslint-scope");

const ROOT = __dirname;
const DEFAULT_EXCLUDE = new Set(["game-battlefield1"]);
const INDENT_UNIT = "  ";
const MAX_RESOLVE_DEPTH = 8;
const URL_MSG = "Failed to open the URL";
const PATH_MSG = "Failed to open the file or folder";
const PATH_WORD_SUFFIXES = ["path", "paths", "folder", "folders", "file", "dir", "directory"];

function parse(src) {
  return espree.parse(src, {
    ecmaVersion: "latest",
    sourceType: "script",
    range: true,
    loc: true,
    comment: true,
  });
}

function analyze(ast) {
  return eslintScope.analyze(ast, {
    ecmaVersion: espree.latestEcmaVersion,
    sourceType: "commonjs",
    childVisitorKeys: espree.VisitorKeys,
    fallback: "iteration",
  });
}

function walk(node, parent, visit) {
  node.parent = parent;
  visit(node);
  for (const key of espree.VisitorKeys[node.type] || []) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) if (c && typeof c.type === "string") walk(c, node, visit);
    } else if (child && typeof child.type === "string") {
      walk(child, node, visit);
    }
  }
}

function isOpnCall(node) {
  if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") return false;
  const { object, property, computed } = node.callee;
  if (computed || property.type !== "Identifier" || property.name !== "opn") return false;
  if (object.type === "Identifier") return object.name === "util";
  return (
    object.type === "MemberExpression" &&
    !object.computed &&
    object.property.type === "Identifier" &&
    object.property.name === "util"
  );
}

function innermostScope(scopeManager, node) {
  for (let n = node; n; n = n.parent) {
    const scope = scopeManager.acquire(n, true);
    if (scope) return scope;
  }
  return scopeManager.globalScope;
}

function findVariable(scope, name) {
  for (let s = scope; s; s = s.upper) {
    const v = s.set.get(name);
    if (v) return v;
  }
  return null;
}

function isModuleLevel(scope) {
  return scope.type === "global" || (scope.block && scope.block.type === "Program");
}

function definedBefore(variable, pos) {
  return variable.defs.some((d) => d.type === "Parameter" || d.name.range[0] < pos);
}

function isUseMainContext(init) {
  if (!init || init.type !== "CallExpression" || init.arguments.length < 1) return false;
  const arg = init.arguments[0];
  if (arg.type !== "Identifier" || arg.name !== "MainContext") return false;
  const c = init.callee;
  if (c.type === "Identifier") return c.name === "useContext";
  return (
    c.type === "MemberExpression" &&
    !c.computed &&
    c.property.type === "Identifier" &&
    c.property.name === "useContext"
  );
}

function resolveApiRef(scope, pos) {
  for (let s = scope; s && !isModuleLevel(s); s = s.upper) {
    const api = s.set.get("api");
    if (api && definedBefore(api, pos)) return "api";
    const ctx = s.set.get("context");
    if (ctx && definedBefore(ctx, pos)) return "context.api";
    for (const v of s.variables) {
      if (
        v.defs.some((d) => d.type === "Variable" && isUseMainContext(d.node.init)) &&
        definedBefore(v, pos)
      ) {
        return `${v.name}.api`;
      }
    }
  }
  return null;
}

function nameWords(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => w.replace(/\d+$/, ""))
    .filter(Boolean);
}

function classifyName(name) {
  const words = nameWords(name);
  const isUrl = words.some((w) => w.endsWith("url") || w === "uri");
  const isPath = words.some((w) => PATH_WORD_SUFFIXES.some((s) => w.endsWith(s)));
  if (isUrl === isPath) return null;
  return isUrl ? "url" : "path";
}

function latestValueBefore(variable, pos) {
  let best = null;
  for (const d of variable.defs) {
    if (
      d.type === "Variable" &&
      d.node.init &&
      d.node.id.type === "Identifier" &&
      d.node.range[0] < pos
    ) {
      if (!best || d.node.range[0] > best.pos) best = { pos: d.node.range[0], expr: d.node.init };
    }
  }
  for (const ref of variable.references) {
    if (ref.isWrite() && ref.writeExpr && ref.identifier.range[0] < pos) {
      const p = ref.identifier.range[0];
      if (!best || p > best.pos) best = { pos: p, expr: ref.writeExpr };
    }
  }
  return best ? best.expr : null;
}

function classify(node, scope, pos, depth = 0) {
  if (!node || depth > MAX_RESOLVE_DEPTH) return null;
  switch (node.type) {
    case "Literal":
      return typeof node.value === "string" && node.value.includes("://") ? "url" : null;
    case "TemplateLiteral": {
      const head = node.quasis[0].value.cooked || "";
      if (head.includes("://")) return "url";
      if (head === "" && node.expressions.length)
        return classify(node.expressions[0], scope, pos, depth + 1);
      return null;
    }
    case "CallExpression": {
      const c = node.callee;
      if (
        c.type === "MemberExpression" &&
        c.object.type === "Identifier" &&
        c.object.name === "path"
      )
        return "path";
      if (c.type === "Identifier") return classifyName(c.name);
      if (c.type === "MemberExpression" && !c.computed && c.property.type === "Identifier") {
        return classifyName(c.property.name);
      }
      return null;
    }
    case "Identifier": {
      if (node.name === "__dirname" || node.name === "__filename") return "path";
      const v = findVariable(scope, node.name);
      if (v) {
        const expr = latestValueBefore(v, pos);
        if (expr) {
          const r = classify(expr, scope, pos, depth + 1);
          if (r) return r;
        }
      }
      return classifyName(node.name);
    }
    case "MemberExpression":
      return !node.computed && node.property.type === "Identifier"
        ? classifyName(node.property.name)
        : null;
    case "BinaryExpression":
      return node.operator === "+" ? classify(node.left, scope, pos, depth + 1) : null;
    case "ConditionalExpression": {
      const a = classify(node.consequent, scope, pos, depth + 1);
      return a && a === classify(node.alternate, scope, pos, depth + 1) ? a : null;
    }
    case "LogicalExpression": {
      const a = classify(node.left, scope, pos, depth + 1);
      return a && a === classify(node.right, scope, pos, depth + 1) ? a : null;
    }
    case "AwaitExpression":
      return classify(node.argument, scope, pos, depth + 1);
    default:
      return null;
  }
}

function isTrivialHandler(fn) {
  if (!fn || (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression"))
    return false;
  const b = fn.body;
  if (b.type === "Literal") return b.value === null;
  if (b.type === "Identifier") return b.name === "undefined";
  if (b.type === "UnaryExpression") return b.operator === "void";
  if (b.type === "BlockStatement") {
    if (b.body.length === 0) return true;
    if (b.body.length !== 1 || b.body[0].type !== "ReturnStatement") return false;
    const arg = b.body[0].argument;
    return (
      !arg ||
      (arg.type === "Literal" && arg.value === null) ||
      (arg.type === "Identifier" && arg.name === "undefined")
    );
  }
  return false;
}

function lineStart(src, pos) {
  return src.lastIndexOf("\n", pos - 1) + 1;
}

function lineIndent(src, pos) {
  const start = lineStart(src, pos);
  return src.slice(start).match(/^[ \t]*/)[0];
}

function tryBlock(ind, site) {
  const fn = site.kind === "url" ? "openUrl" : "openFile";
  const msg = site.kind === "url" ? URL_MSG : PATH_MSG;
  const e = site.errName;
  return (
    `try {\n` +
    `${ind}${INDENT_UNIT}window.api.shell.${fn}(${site.arg});\n` +
    `${ind}} catch (${e}) {\n` +
    `${ind}${INDENT_UNIT}${site.apiRef}.showErrorNotification("${msg}", ${e}, { allowReport: false });\n` +
    `${ind}}`
  );
}

const BLOCK_PARENTS = new Set(["BlockStatement", "Program", "SwitchCase", "StaticBlock"]);

function commentsIn(comments, start, end) {
  return comments.filter((c) => c.range[0] >= start && c.range[1] <= end);
}

function trailingLineComment(src, comments, pos) {
  const eol = src.indexOf("\n", pos);
  const end = eol === -1 ? src.length : eol;
  const c = comments.find((cm) => cm.type === "Line" && cm.range[0] >= pos && cm.range[1] <= end);
  if (!c || src.slice(pos, c.range[0]).trim() !== "") return null;
  return c;
}

function planSite(src, ast, scopeManager, call) {
  const where = { line: call.loc.start.line, arg: null };
  if (call.arguments.length !== 1 || call.arguments[0].type === "SpreadElement") {
    return { skip: "util.opn called with other than exactly one argument", ...where };
  }
  const argNode = call.arguments[0];
  const arg = src.slice(argNode.range[0], argNode.range[1]);
  where.arg = arg;

  let expr = call;
  const p = call.parent;
  if (p.type === "MemberExpression" && p.object === call) {
    const prop = !p.computed && p.property.type === "Identifier" ? p.property.name : "?";
    const outer = p.parent;
    if (prop !== "catch" || outer.type !== "CallExpression" || outer.callee !== p) {
      return { skip: `util.opn(...) chained with .${prop}(...)`, ...where };
    }
    if (outer.arguments.length !== 1 || !isTrivialHandler(outer.arguments[0])) {
      return { skip: ".catch() handler does more than swallow the error", ...where };
    }
    expr = outer;
  }
  if (expr.parent.type === "AwaitExpression") expr = expr.parent;

  const scope = innermostScope(scopeManager, call);
  const kind = classify(argNode, scope, call.range[0]);
  if (!kind) return { skip: "cannot tell whether the target is a URL or a path", ...where };
  const apiRef = resolveApiRef(scope, call.range[0]);
  if (!apiRef)
    return { skip: "no api / context / useContext(MainContext) variable in scope", ...where };
  where.kind = kind;
  where.apiRef = apiRef;
  where.errName = findVariable(scope, "err") ? "openErr" : "err";

  const holder = expr.parent;
  if (holder.type === "ExpressionStatement" && holder.expression === expr) {
    const stmt = holder;
    const ind = lineIndent(src, stmt.range[0]);
    let start = stmt.range[0];
    let end = stmt.range[1];
    if (commentsIn(ast.comments, start, end).length) {
      return { skip: "comment inside the call would be lost", ...where };
    }
    if (BLOCK_PARENTS.has(stmt.parent.type)) {
      let prefix = "";
      const trailing = trailingLineComment(src, ast.comments, end);
      if (trailing) {
        if (src.slice(lineStart(src, start), start).trim() !== "") {
          return { skip: "trailing comment on a line shared with other code", ...where };
        }
        prefix = `${src.slice(trailing.range[0], trailing.range[1])}\n${ind}`;
        end = trailing.range[1];
      }
      return { edit: { start, end, text: prefix + tryBlock(ind, where) }, ...where };
    }
    if (trailingLineComment(src, ast.comments, end)) {
      return { skip: "trailing comment after a braceless statement body", ...where };
    }
    const inner = ind + INDENT_UNIT;
    return {
      edit: { start, end, text: `{\n${inner}${tryBlock(inner, where)}\n${ind}}` },
      ...where,
    };
  }

  if (holder.type === "ArrowFunctionExpression" && holder.body === expr) {
    const arrowTok = src.lastIndexOf("=>", expr.range[0]);
    if (arrowTok < holder.range[0]) return { skip: "could not locate the arrow token", ...where };
    const start = arrowTok + 2;
    let end = expr.range[1];
    if (commentsIn(ast.comments, start, end).length) {
      return { skip: "comment inside the arrow body would be lost", ...where };
    }
    const ind = lineIndent(src, holder.range[0]);
    const inner = ind + INDENT_UNIT;
    let close = `${ind}}`;
    const call2 = holder.parent;
    if (
      call2.type === "CallExpression" &&
      call2.arguments[call2.arguments.length - 1] === holder &&
      /^\s*,?\s*\)$/.test(src.slice(end, call2.range[1])) &&
      src.slice(end, call2.range[1]).includes("\n")
    ) {
      end = call2.range[1];
      close += ")";
    }
    return {
      edit: { start, end, text: ` {\n${inner}${tryBlock(inner, where)}\n${close}` },
      ...where,
    };
  }

  return { skip: `unsupported position (${holder.type})`, ...where };
}

const COMMENTED_RE = /^(\s*\/\/\s*)util\.opn\((.*)\)\.catch\(.*\);?\s*$/;

function inRange(node, range) {
  return !range || (node.range[0] >= range[0] && node.range[1] <= range[1]);
}

function planLiveSites(src, ast, scopeManager, range) {
  const calls = [];
  walk(ast, null, (n) => {
    if (isOpnCall(n) && inRange(n, range)) calls.push(n);
  });
  return calls.map((c) => planSite(src, ast, scopeManager, c));
}

// Blanking the delimiters keeps every offset identical, so edits planned on the
// uncommented variant apply unchanged to the real (still commented) source.
function planBlockCommentSites(src, comment) {
  const [s, e] = comment.range;
  const variant = `${src.slice(0, s)}  ${src.slice(s + 2, e - 2)}  ${src.slice(e)}`;
  let vast;
  try {
    vast = parse(variant);
  } catch {
    const out = [];
    const body = src.slice(s, e);
    let offset = 0;
    for (const ln of body.split("\n")) {
      if (ln.includes("util.opn(")) {
        const m = ln.match(/util\.opn\((.*)\)\.catch/);
        out.push({
          skip: "inside a /* */ block whose code does not parse once uncommented",
          line: comment.loc.start.line + offset,
          arg: m ? m[1] : null,
          commented: true,
        });
      }
      offset++;
    }
    return out;
  }
  const sites = planLiveSites(variant, vast, analyze(vast), comment.range).concat(
    planCommentedSites(variant, vast, comment.range),
  );
  return sites.map((x) => ({ ...x, commented: true }));
}

function planCommentedSites(src, ast, range) {
  const out = [];
  for (const c of ast.comments) {
    if (c.type !== "Line" || !inRange(c, range)) continue;
    const text = src.slice(c.range[0], c.range[1]);
    if (!text.includes("util.opn(")) continue;
    const m = text.match(COMMENTED_RE);
    const where = { line: c.loc.start.line, arg: m ? m[2] : null, commented: true };
    if (!m) {
      out.push({ skip: "commented-out util.opn in an unrecognized shape", ...where });
      continue;
    }
    const argSrc = m[2];
    let kind = null;
    try {
      const argAst = espree.parse(`(${argSrc})`, { ecmaVersion: "latest", range: true });
      kind = classifyDetached(argAst.body[0].expression);
    } catch {
      kind = null;
    }
    if (!kind) {
      out.push({
        skip: "commented-out: cannot tell whether the target is a URL or a path",
        ...where,
      });
      continue;
    }
    const fn = kind === "url" ? "openUrl" : "openFile";
    out.push({
      edit: {
        start: c.range[0],
        end: c.range[1],
        text: `${m[1]}window.api.shell.${fn}(${argSrc});`,
      },
      kind,
      ...where,
    });
  }
  return out;
}

function classifyDetached(node) {
  if (node.type === "Identifier") {
    if (node.name === "__dirname" || node.name === "__filename") return "path";
    return classifyName(node.name);
  }
  return classify(node, null, 0);
}

function verifyApiRefs(ast, scopeManager) {
  const bad = [];
  const tries = [];
  walk(ast, null, (n) => {
    if (n.type === "TryStatement" && n.handler) tries.push(n);
  });
  for (const n of tries) {
    const first = n.block.body[0];
    const call = first && first.type === "ExpressionStatement" ? first.expression : null;
    const isShell =
      call &&
      call.type === "CallExpression" &&
      call.callee.type === "MemberExpression" &&
      /^window\.api\.shell\.open(Url|File)$/.test(memberText(call.callee));
    if (!isShell) continue;
    const notify = n.handler.body.body[0];
    const nc = notify && notify.type === "ExpressionStatement" ? notify.expression : null;
    if (!nc || nc.type !== "CallExpression" || nc.callee.type !== "MemberExpression") continue;
    let root = nc.callee.object;
    while (root.type === "MemberExpression") root = root.object;
    if (root.type !== "Identifier") continue;
    const scope = innermostScope(scopeManager, nc);
    const v = findVariable(scope, root.name);
    if (!v || v.scope.type === "global") bad.push({ line: nc.loc.start.line, name: root.name });
  }
  return bad;
}

function memberText(node) {
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && !node.computed)
    return `${memberText(node.object)}.${node.property.name}`;
  return "?";
}

function nodeCheck(text) {
  const tmp = path.join(os.tmpdir(), `replace_util_opn_${process.pid}_${Date.now()}.js`);
  fs.writeFileSync(tmp, text, "utf8");
  try {
    const r = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
    return r.status === 0 ? null : (r.stderr || "").trim().split("\n").slice(0, 4).join(" | ");
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function processSource(rawSrc) {
  const crlf = rawSrc.includes("\r\n");
  const src = crlf ? rawSrc.replace(/\r\n/g, "\n") : rawSrc;
  const ast = parse(src);
  const scopeManager = analyze(ast);
  const sites = planLiveSites(src, ast, scopeManager, null).concat(
    planCommentedSites(src, ast, null),
  );
  for (const c of ast.comments) {
    if (c.type !== "Block" || !src.slice(c.range[0], c.range[1]).includes("util.opn(")) continue;
    sites.push(...planBlockCommentSites(src, c));
  }
  const edits = sites.filter((s) => s.edit).map((s) => s.edit);
  edits.sort((a, b) => b.start - a.start);
  for (let i = 1; i < edits.length; i++) {
    if (edits[i].end > edits[i - 1].start)
      throw new Error(`overlapping edits near offset ${edits[i].start}`);
  }
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  let fileError = null;
  if (edits.length) {
    try {
      const newAst = parse(out);
      const bad = verifyApiRefs(newAst, analyze(newAst));
      if (bad.length)
        fileError = `unbound API reference after rewrite: ${bad.map((b) => `${b.name}@${b.line}`).join(", ")}`;
    } catch (err) {
      fileError = `rewritten source does not parse: ${err.message}`;
    }
    if (!fileError) {
      const chk = nodeCheck(out);
      if (chk) fileError = `node --check failed: ${chk}`;
    }
  }
  return {
    sites,
    text: crlf ? out.replace(/\n/g, "\r\n") : out,
    changed: edits.length > 0,
    fileError,
  };
}

function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, file);
}

function gameFolders(ids) {
  const folders = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("game-"))
    .map((d) => d.name)
    .sort();
  if (!ids.length) return folders.filter((f) => !DEFAULT_EXCLUDE.has(f));
  const wanted = new Set(ids.map((i) => i.toLowerCase()));
  const found = [];
  for (const f of folders) {
    let gameId = null;
    const idx = path.join(ROOT, f, "index.js");
    if (fs.existsSync(idx)) {
      const m = fs
        .readFileSync(idx, "utf8")
        .match(/^\s*const\s+GAME_ID\s*=\s*["'`]([^"'`]+)["'`]/m);
      if (m) gameId = m[1].toLowerCase();
    }
    const suffix = f.slice("game-".length).toLowerCase();
    if (wanted.has(suffix) || (gameId && wanted.has(gameId))) {
      found.push(f);
      wanted.delete(suffix);
      if (gameId) wanted.delete(gameId);
    }
  }
  for (const w of wanted) console.log(`[${w}] WARN: no game folder matches this id`);
  return found;
}

function parseArgs(argv) {
  const args = { ids: [], dryRun: false, report: null, file: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--report") args.report = argv[++i];
    else if (a === "--file") args.file = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a.startsWith("--")) throw new Error(`unknown flag ${a}`);
    else args.ids.push(a);
  }
  if (args.out && !args.file) throw new Error("--out requires --file");
  return args;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    return 1;
  }
  const prefix = args.dryRun ? "[DRY RUN] " : "";
  const targets = [];
  if (args.file) {
    targets.push({
      label: path.basename(args.file),
      file: path.resolve(args.file),
      out: path.resolve(args.out || args.file),
    });
  } else {
    for (const folder of gameFolders(args.ids)) {
      const dir = path.join(ROOT, folder);
      for (const name of fs
        .readdirSync(dir)
        .filter((n) => n.endsWith(".js"))
        .sort()) {
        const file = path.join(dir, name);
        targets.push({ label: `${folder}/${name}`, file, out: file });
      }
    }
  }

  const totals = { files: 0, sites: 0, converted: 0, commented: 0, skipped: 0, fileErrors: 0 };
  const reportLines = [];
  for (const t of targets) {
    const raw = fs.readFileSync(t.file, "utf8");
    if (!raw.includes("util.opn(")) continue;
    totals.files++;
    let res;
    try {
      res = processSource(raw);
    } catch (err) {
      totals.fileErrors++;
      reportLines.push(`${t.label}: FILE ERROR ${err.message}`);
      console.log(`[${t.label}] ERROR: ${err.message}`);
      continue;
    }
    const conv = res.sites.filter((s) => s.edit);
    const skips = res.sites.filter((s) => s.skip);
    totals.sites += res.sites.length;
    if (res.fileError) {
      totals.fileErrors++;
      totals.skipped += res.sites.length;
      reportLines.push(`${t.label}: FILE NOT WRITTEN - ${res.fileError}`);
      console.log(`[${t.label}] ERROR: ${res.fileError}`);
      continue;
    }
    totals.converted += conv.filter((s) => !s.commented).length;
    totals.commented += conv.filter((s) => s.commented).length;
    totals.skipped += skips.length;
    for (const s of skips)
      reportLines.push(`${t.label}:${s.line}: ${s.skip}${s.arg ? `  [arg: ${s.arg}]` : ""}`);
    if (res.changed && !args.dryRun) writeAtomic(t.out, res.text);
    const note = skips.length ? `, ${skips.length} left for hand conversion` : "";
    console.log(`${prefix}[${t.label}] ${conv.length}/${res.sites.length} converted${note}`);
  }

  const report = reportLines.length
    ? reportLines.join("\n") + "\n"
    : "No sites left for hand conversion.\n";
  if (args.report) {
    writeAtomic(path.resolve(args.report), report);
    console.log(`\nReport written to ${args.report}`);
  } else {
    console.log(`\n--- Sites left for hand conversion ---\n${report}`);
  }
  console.log(
    `${prefix}Files: ${totals.files}  Sites: ${totals.sites}  Converted: ${totals.converted}  ` +
      `Commented-out converted: ${totals.commented}  Left for hand: ${totals.skipped}  File errors: ${totals.fileErrors}`,
  );
  return totals.skipped || totals.fileErrors ? 1 : 0;
}

process.exitCode = main();
