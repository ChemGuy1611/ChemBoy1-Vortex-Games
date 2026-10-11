/**
 * sweep_template_fixes.js
 * Reverts fixed sites in the template-[*]/index.js files one at a time and runs that template's
 * suite against each reverted copy. A revert the suite does not catch marks a fix nothing guards:
 * either it has no test or the site is unreachable (dead code, an unregistered installer).
 *
 * Each mutant is a scratch copy (template + template-basic) in the OS temp folder, loaded through
 * the CB1_TEMPLATE_ROOT override of the test harness. Real templates are never touched.
 *
 * Usage:
 *   node sweep_template_fixes.js
 *   node sweep_template_fixes.js TEMPLATE [TEMPLATE ...]
 *   node sweep_template_fixes.js --pair "FROM=>TO" [--pair "FROM=>TO" ...]
 *   node sweep_template_fixes.js --concurrency 4
 *   node sweep_template_fixes.js --json
 *
 * Flags:
 *   TEMPLATE            Only sweep the listed templates. Accepts the folder name
 *                       (template-ue4-5) or the short name (ue4-5).
 *   --pair "FROM=>TO"   Revert pair: every occurrence of FROM in a non-comment line becomes TO.
 *                       Repeatable. Default pairs: ".lastIndexOf(=>.indexOf(" and
 *                       "\"EACCES\"=>\"EACCESS\"".
 *   --concurrency N     Parallel suite runs (default 8).
 *   --json              Write the result as JSON to stdout instead of text.
 *
 * Exit codes: 0 every revert was caught, 1 at least one survivor, 2 nothing to sweep.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const REPO = __dirname;
const SUITE_TIMEOUT_MS = 120000;

const DEFAULT_PAIRS = [
  [".lastIndexOf(", ".indexOf("],
  ['"EACCES"', '"EACCESS"'],
];

function parseArgs(argv) {
  const args = { templates: [], pairs: [], concurrency: 8, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--concurrency") args.concurrency = Math.max(1, Number(argv[++i]) || 8);
    else if (arg === "--pair") {
      const [from, to] = String(argv[++i] ?? "").split("=>");
      if (!from || to === undefined) throw new Error('--pair needs "FROM=>TO"');
      args.pairs.push([from, to]);
    } else args.templates.push(arg);
  }
  if (args.pairs.length === 0) args.pairs = DEFAULT_PAIRS;
  return args;
}

// template-cobraengineACSE -> tests/templates/cobraengine-acse.test.js
function suiteFor(folder) {
  const name = folder.replace(/^template-/, "");
  const candidates = [
    name,
    name.toLowerCase(),
    name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
  ];
  return candidates.find((c) =>
    fs.existsSync(path.join(REPO, "tests", "templates", `${c}.test.js`)),
  );
}

function findMutants(templates, pairs) {
  const mutants = [];
  for (const folder of templates) {
    const lines = fs.readFileSync(path.join(REPO, folder, "index.js"), "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.trimStart().startsWith("//")) return;
      for (const [from, to] of pairs) {
        let at = line.indexOf(from);
        while (at !== -1) {
          mutants.push({ folder, line: i + 1, from, to, at });
          at = line.indexOf(from, at + 1);
        }
      }
    });
  }
  return mutants;
}

function runMutant(m, suite) {
  return new Promise((resolve) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cb1-sweep-"));
    for (const folder of new Set([m.folder, "template-basic"])) {
      fs.cpSync(path.join(REPO, folder), path.join(root, folder), { recursive: true });
    }
    const file = path.join(root, m.folder, "index.js");
    const lines = fs.readFileSync(file, "utf8").split("\n");
    const line = lines[m.line - 1];
    lines[m.line - 1] = line.slice(0, m.at) + m.to + line.slice(m.at + m.from.length);
    fs.writeFileSync(file, lines.join("\n"));
    const child = spawn(
      process.execPath,
      ["--test", "--test-timeout=30000", path.join("tests", "templates", `${suite}.test.js`)],
      { cwd: REPO, env: { ...process.env, CB1_TEMPLATE_ROOT: root }, stdio: "ignore" },
    );
    const timer = setTimeout(() => child.kill(), SUITE_TIMEOUT_MS);
    child.on("exit", (code) => {
      clearTimeout(timer);
      fs.rmSync(root, { recursive: true, force: true });
      resolve({ ...m, killed: code !== 0 });
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const all = fs
    .readdirSync(REPO)
    .filter((n) => n.startsWith("template-") && fs.existsSync(path.join(REPO, n, "index.js")));
  const wanted = new Set(
    args.templates.map((t) => (t.startsWith("template-") ? t : `template-${t}`)),
  );
  const templates = args.templates.length ? all.filter((n) => wanted.has(n)) : all;

  const suites = new Map();
  for (const folder of templates) {
    const suite = suiteFor(folder);
    if (suite) suites.set(folder, suite);
    else console.error(`skipping ${folder}: no suite in tests/templates`);
  }
  const mutants = findMutants([...suites.keys()], args.pairs);
  if (mutants.length === 0) {
    console.error("nothing to sweep");
    process.exit(2);
  }
  if (!args.json) console.log(`${mutants.length} mutants across ${suites.size} templates`);

  const results = [];
  let next = 0;
  async function worker() {
    while (next < mutants.length) {
      const m = mutants[next++];
      results.push(await runMutant(m, suites.get(m.folder)));
    }
  }
  await Promise.all(Array.from({ length: args.concurrency }, worker));

  const survivors = results
    .filter((r) => !r.killed)
    .sort((a, b) => a.folder.localeCompare(b.folder) || a.line - b.line || a.at - b.at);
  if (args.json) {
    console.log(
      JSON.stringify(
        { total: results.length, killed: results.length - survivors.length, survivors },
        null,
        2,
      ),
    );
  } else {
    console.log(`killed ${results.length - survivors.length} of ${results.length}`);
    for (const s of survivors) {
      console.log(`SURVIVOR ${s.folder}:${s.line} col ${s.at + 1}  ${s.from}  ->  ${s.to}`);
    }
  }
  process.exit(survivors.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(2);
});
