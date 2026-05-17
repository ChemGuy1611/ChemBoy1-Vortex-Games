# File & Folder Search (fs + util)

Patterns for searching, walking, and stat-ing files in Vortex extensions. All async helpers come from `vortex-api`; `path` is Node's built-in.

---

## Recursive walk (preferred)

```js
const { util } = require('vortex-api');

await util.walk(rootPath, (iterPath, stats) => {
  if (!stats.isDirectory()) return Promise.resolve();
  // inspect iterPath / stats here
  return Promise.resolve();
}, { ignoreErrors: true });
```

- `ignoreErrors: true` — swallows EACCES/ENOENT on individual subtrees without aborting the whole walk.
- Callback must return a `Promise`. Return `Promise.resolve()` for no-op paths.
- Use a `Set` to deduplicate parent directories when collecting targets.

Do **not** write a custom recursive walker (`getAllFiles`-style). `util.walk` is the canonical approach.

---

## Single-level directory listing

```js
const { fs } = require('vortex-api');

const entries = await fs.readdirAsync(dirPath);
// entries: string[] of names (not full paths)
for (const entry of entries) {
  const full = path.join(dirPath, entry);
  const stats = await fs.statAsync(full);
  if (stats.isDirectory()) { /* ... */ }
}
```

Use when you only need immediate children, not a full recursive walk.

---

## Stat a single path

```js
const stats = await fs.statAsync(fullPath);
stats.isDirectory()  // true if dir
stats.isFile()       // true if regular file
stats.size           // bytes
stats.mtime          // Date of last modification
```

Wrap in `try/catch` to handle ENOENT:

```js
let exists = false;
try { await fs.statAsync(marker); exists = true; }
catch { /* ENOENT — file does not exist */ }
```

---

## Get the staging folder path

```js
const { selectors } = require('vortex-api');

const stagingPath = selectors.installPathForGame(state, GAME_ID);
// undefined if game is not discovered / no staging folder configured
if (!stagingPath) return;
```

Always guard against `undefined` before walking.

---

## Write / delete a marker file

```js
// Write empty marker (skip if already exists)
try { await fs.statAsync(marker); }
catch { await fs.writeFileAsync(marker, ''); }

// Delete marker (ignore if missing)
try { await fs.removeAsync(marker); }
catch (err) { if (err.code !== 'ENOENT') throw err; }
```

---

## Case-insensitive folder name match

```js
const base = path.basename(iterPath).toLowerCase();
if (base === 'scripts' || base === 'dlls') { /* ... */ }
```

Always `.toLowerCase()` when matching folder names that may come from user-supplied mod archives.

---

## Full pattern: walk staging, find Scripts/Dlls, write enabled.txt

```js
async function reconcileEnabledTxt(api, write) {
  const state = api.getState();
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  if (!stagingPath) return;

  const targets = new Set();
  await util.walk(stagingPath, (iterPath, stats) => {
    if (!stats.isDirectory()) return Promise.resolve();
    const base = path.basename(iterPath).toLowerCase();
    if (base === 'scripts' || base === 'dlls') targets.add(path.dirname(iterPath));
    return Promise.resolve();
  }, { ignoreErrors: true });

  let touched = 0;
  for (const parent of targets) {
    const marker = path.join(parent, 'enabled.txt');
    try {
      if (write) {
        try { await fs.statAsync(marker); }
        catch { await fs.writeFileAsync(marker, ''); touched++; }
      } else {
        try { await fs.removeAsync(marker); touched++; }
        catch (err) { if (err.code !== 'ENOENT') throw err; }
      }
    } catch (err) {
      log('warn', `enabled.txt ${write ? 'write' : 'delete'} failed at ${marker}: ${err.message}`);
    }
  }
}
```

---

## Notes

- `fs.readdirAsync`, `fs.statAsync`, `fs.writeFileAsync`, `fs.removeAsync` — all from `vortex-api`; wrappers around Node's `fs` that return Promises and integrate with Vortex's error reporting.
- The deprecated hand-rolled `getAllFiles(dirPath)` helper still exists in template-ue4-5/index.js:676 for legacy callers. New code should use `util.walk`.
- `util.walk` is not exported from `vortex-api`'s top-level TypeScript types in all versions — use it via `util.walk(...)` at runtime; the JS bundle always has it.
