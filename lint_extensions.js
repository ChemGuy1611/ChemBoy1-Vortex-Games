/**
 * lint_extensions.js
 * Runs ESLint on every game-[*]/index.js in this repo and reports results.
 * Always writes lint_results.txt to the repo root with the full output.
 *
 * Usage:
 *   node lint_extensions.js
 *   node lint_extensions.js GAME_ID [GAME_ID ...]
 *   node lint_extensions.js --fix
 *   node lint_extensions.js GAME_ID [GAME_ID ...] --fix
 *   node lint_extensions.js --templates
 *   node lint_extensions.js --quiet
 *
 * Flags:
 *   GAME_ID [GAME_ID ...]  Only lint the listed game IDs.
 *   --fix                  Auto-fix ESLint issues where possible.
 *   --templates            Also include template-[*]/index.js files.
 *   --quiet                Suppress output for passing files.
 *   --json                 Write machine-readable JSON to stdout instead of human-readable text.
 */

const fs            = require('fs');
const path          = require('path');
const { spawnSync } = require('child_process');

const ROOT       = __dirname;
const OUT_FILE   = path.join(ROOT, 'lint_results.txt');

const args      = process.argv.slice(2);
const flags     = new Set(args.filter(a => a.startsWith('--')));
const gameArgs  = args.filter(a => !a.startsWith('--'));

const doFix       = flags.has('--fix');
const doTemplates = flags.has('--templates');
const quiet       = flags.has('--quiet');
const doJson      = flags.has('--json');

// ── output helper ─────────────────────────────────────────────────────────────

const lines = [];

function emit(line = '') {
  if (!doJson) console.log(line);
  lines.push(line);
}

// ── resolve target folders ────────────────────────────────────────────────────

let targetDirs;

if (gameArgs.length > 0) {
  targetDirs = [];
  for (const id of gameArgs) {
    const dir = path.join(ROOT, `game-${id}`);
    if (!fs.existsSync(dir)) {
      console.error(`Error: folder not found: game-${id}`);
      process.exit(1);
    }
    const indexPath = path.join(dir, 'index.js');
    if (!fs.existsSync(indexPath)) {
      console.error(`Error: no index.js in game-${id}`);
      process.exit(1);
    }
    targetDirs.push(`game-${id}`);
  }
} else {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });
  targetDirs = entries
    .filter(e => {
      if (!e.isDirectory()) return false;
      if (e.name.startsWith('game-')) return true;
      if (doTemplates && e.name.startsWith('template-')) return true;
      return false;
    })
    .map(e => e.name)
    .sort();
}

// ── header ────────────────────────────────────────────────────────────────────

const label     = doFix ? 'Fixing' : 'Linting';
const timestamp = new Date().toLocaleString();

emit(`ESLint Results -- ${timestamp}`);
emit('='.repeat(60));
emit();
emit(`${label} ${targetDirs.length} extension(s)...`);
emit();
if (doJson) process.stderr.write(`${label} ${targetDirs.length} extension(s)...\n`);

// ── run eslint per file ───────────────────────────────────────────────────────

const isWin    = process.platform === 'win32';
const npxCmd   = isWin ? 'npx.cmd' : 'npx';

let passed = 0;
let failed = 0;
const failedIds  = [];
const jsonResults = [];

for (const dirName of targetDirs) {
  const indexPath = path.join(ROOT, dirName, 'index.js');
  const relPath   = path.join(dirName, 'index.js');

  if (!fs.existsSync(indexPath)) {
    if (!quiet) emit(`  SKIP  ${relPath} (no index.js)`);
    continue;
  }

  const quotedPath = isWin ? `"${indexPath}"` : indexPath;
  const eslintArgs = ['eslint'];
  if (doFix) eslintArgs.push('--fix');
  eslintArgs.push(quotedPath);

  const result = spawnSync(npxCmd, eslintArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  });

  const output = (result.stdout || '') + (result.stderr || '');
  const ok     = result.status === 0;

  const gameId = dirName.replace(/^(game|template)-/, '');
  if (doJson) process.stderr.write(`  ${ok ? '[OK]  ' : '[FAIL]'} ${relPath}\n`);
  if (ok) {
    if (!quiet) emit(`  [OK]   ${relPath}`);
    passed++;
  } else {
    emit(`  [FAIL] ${relPath}`);
    if (output.trim()) {
      for (const line of output.trim().split('\n')) {
        emit(`         ${line}`);
      }
    }
    failed++;
    failedIds.push(gameId);
  }
  jsonResults.push({ id: gameId, path: relPath, ok, output: ok ? '' : output.trim() });
}

// ── summary ───────────────────────────────────────────────────────────────────

emit();
emit(`${label} complete: ${passed + failed} files -- ${passed} passed, ${failed} failed`);
if (failedIds.length > 0) {
  emit();
  emit(`Failed IDs:`);
  for (const id of failedIds) emit(`  ${id}`);
}

// ── write file ────────────────────────────────────────────────────────────────

if (doJson) {
  const jsonOut = {
    timestamp,
    passed,
    failed,
    total: passed + failed,
    results: jsonResults,
    failedIds,
  };
  process.stdout.write(JSON.stringify(jsonOut, null, 2) + '\n');
}

fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf8');
if (doJson) {
  process.stderr.write(`\n${passed} passed, ${failed} failed. JSON follows on stdout.\n`);
} else {
  console.log(`\nResults written to lint_results.txt`);
}

process.exit(failed > 0 ? 1 : 0);
