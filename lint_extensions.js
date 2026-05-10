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
 *
 * JSON output schema:
 *   { timestamp, passed, failed, total, totalErrors, totalWarnings,
 *     failedIds, results: [{ id, path, ok, errorCount, warningCount, messages }] }
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
    const gameDir     = path.join(ROOT, `game-${id}`);
    const templateDir = path.join(ROOT, `template-${id}`);
    const prefix      = fs.existsSync(gameDir) ? 'game' : fs.existsSync(templateDir) ? 'template' : null;
    if (!prefix) {
      console.error(`Error: folder not found: game-${id} or template-${id}`);
      process.exit(1);
    }
    const dirName   = `${prefix}-${id}`;
    const indexPath = path.join(ROOT, dirName, 'index.js');
    if (!fs.existsSync(indexPath)) {
      console.error(`Error: no index.js in ${dirName}`);
      process.exit(1);
    }
    targetDirs.push(dirName);
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
const timestamp = new Date().toISOString();

emit(`ESLint Results -- ${timestamp}`);
emit('='.repeat(60));
emit();
emit(`${label} ${targetDirs.length} extension(s)...`);
emit();
if (doJson) process.stderr.write(`${label} ${targetDirs.length} extension(s)...\n`);

// ── collect files ─────────────────────────────────────────────────────────────

const isWin  = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

const targetFiles = [];

for (const dirName of targetDirs) {
  const indexPath = path.join(ROOT, dirName, 'index.js');
  const relPath   = path.join(dirName, 'index.js');
  if (!fs.existsSync(indexPath)) {
    if (!quiet) emit(`  SKIP  ${relPath} (no index.js)`);
  } else {
    targetFiles.push({ dirName, indexPath, relPath });
  }
}

if (targetFiles.length === 0) {
  emit('Warning: no index.js files found to lint.');
  fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf8');
  process.exit(1);
}

// ── run eslint (chunked to stay under Windows CreateProcess 32767-char limit) ──

const WIN_CMD_LIMIT = 32000;

let passed        = 0;
let failed        = 0;
let totalErrors   = 0;
let totalWarnings = 0;
const failedIds   = [];
const jsonResults = [];

if (targetFiles.length > 0) {
  const baseArgs = ['eslint', '--format', 'json'];
  if (doFix) baseArgs.push('--fix');

  // Split into batches so no single invocation exceeds the Windows limit
  const batches = [[]];
  if (isWin) {
    let batchLen = 0;
    for (const f of targetFiles) {
      const argLen = f.indexPath.length + 1;
      if (batches[batches.length - 1].length > 0 && batchLen + argLen > WIN_CMD_LIMIT) {
        batches.push([]);
        batchLen = 0;
      }
      batches[batches.length - 1].push(f);
      batchLen += argLen;
    }
  } else {
    batches[0] = targetFiles;
  }

  const byPath = new Map();
  for (const batch of batches) {
    if (batch.length === 0) continue;
    const eslintArgs = [...baseArgs];
    for (const { indexPath } of batch) {
      eslintArgs.push(indexPath);
    }
    const result = spawnSync(npxCmd, eslintArgs, {
      cwd: ROOT,
      encoding: 'utf8',
    });
    let eslintData = [];
    try {
      eslintData = JSON.parse(result.stdout || '[]');
    } catch (_) {
      const errMsg = `ESLint error: ${(result.stderr || result.stdout || '').trim()}`;
      emit(errMsg);
      fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf8');
      process.exit(2);
    }
    for (const entry of eslintData) {
      byPath.set(path.normalize(entry.filePath), entry);
    }
  }

  for (const { dirName, indexPath, relPath } of targetFiles) {
    const entry     = byPath.get(path.normalize(indexPath));
    const errCount  = entry ? entry.errorCount   : 0;
    const warnCount = entry ? entry.warningCount : 0;
    const ok        = errCount === 0;
    const gameId    = dirName.replace(/^(game|template)-/, '');

    totalErrors   += errCount;
    totalWarnings += warnCount;

    if (doJson) process.stderr.write(`  ${ok ? '[OK]  ' : '[FAIL]'} ${relPath}\n`);
    if (ok) {
      if (!quiet) {
        const suffix = warnCount > 0 ? ` (${warnCount} warning${warnCount !== 1 ? 's' : ''})` : '';
        emit(`  [OK]   ${relPath}${suffix}`);
      }
      passed++;
    } else {
      emit(`  [FAIL] ${relPath}`);
      if (entry && entry.messages.length > 0) {
        for (const msg of entry.messages) {
          const sev = msg.severity === 1 ? 'warning' : 'error';
          emit(`         ${relPath}:${msg.line}:${msg.column}: ${sev} - ${msg.message} (${msg.ruleId || 'no-rule'})`);
        }
      }
      failed++;
      failedIds.push(gameId);
    }
    jsonResults.push({ id: gameId, path: relPath, ok, errorCount: errCount, warningCount: warnCount,
      messages: entry ? entry.messages : [] });
  }
}

// ── summary ───────────────────────────────────────────────────────────────────

const errNote  = totalErrors   > 0 ? `, ${totalErrors} error${totalErrors   !== 1 ? 's' : ''}` : '';
const warnNote = totalWarnings > 0 ? `, ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}` : '';

emit();
emit(`${label} complete: ${passed + failed} files -- ${passed} passed, ${failed} failed${errNote}${warnNote}`);
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
    totalErrors,
    totalWarnings,
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
