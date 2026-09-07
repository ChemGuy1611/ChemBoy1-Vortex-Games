# File & Folder Search (fs + util)

Patterns for searching, walking, and stat-ing files in Vortex extensions. `util.walk` comes from
`vortex-api`; the read/stat primitives are Node's built-in `fs` (see `NODE_FS.md` for the full
`vortex-api` → native mapping), as is `path`.

```js
const fs = require("fs"); // sync + constants
const fsp = fs.promises; // async
const path = require("path");
const { util, selectors, log } = require("vortex-api");
```

---

## Recursive walk (preferred)

```js
const { util } = require("vortex-api");

await util.walk(
    rootPath,
    (iterPath, stats) => {
        if (!stats.isDirectory()) return Promise.resolve();
        // inspect iterPath / stats here
        return Promise.resolve();
    },
    { ignoreErrors: true },
);
```

- `ignoreErrors: true` — swallows EACCES/ENOENT on individual subtrees without aborting the whole walk.
- Callback must return a `Promise`. Return `Promise.resolve()` for no-op paths.
- Use a `Set` to deduplicate parent directories when collecting targets.
- `stats` is already resolved — no second `stat` call needed inside the callback.

Do **not** write a custom recursive walker (`getAllFiles`-style). `util.walk` is the canonical
approach, and it has no native `fs` equivalent — Node's `fs` covers single-level listing only.

---

## Single-level directory listing

```js
const entries = await fsp.readdir(dirPath);
// entries: string[] of names (not full paths)
for (const entry of entries) {
    const full = path.join(dirPath, entry);
    const stats = await fsp.stat(full);
    if (stats.isDirectory()) {
        /* ... */
    }
}
```

Use when you only need immediate children, not a full recursive walk.

`{ withFileTypes: true }` avoids the per-entry `stat` entirely — each entry comes back as a `Dirent`
that already knows what it is:

```js
for (const ent of await fsp.readdir(dirPath, { withFileTypes: true })) {
    if (ent.isDirectory()) {
        /* path.join(dirPath, ent.name) for the full path */
    }
}
```

`Dirent.name` is the entry name, not a path — always `path.join` it back onto the parent.

---

## Stat a single path

```js
const stats = await fsp.stat(fullPath);
stats.isDirectory(); // true if dir
stats.isFile(); // true if regular file
stats.size; // bytes
stats.mtime; // Date of last modification
```

Wrap in `try/catch` to handle ENOENT:

```js
let exists = false;
try {
    await fsp.stat(marker);
    exists = true;
} catch {
    /* ENOENT — file does not exist */
}
```

There is no "does this exist" call worth using instead — `fs.existsSync` is sync and races, and
`fsp.access` gives you nothing `stat` doesn't. The `try`/`catch` around `stat` is the idiom.

---

## Get the staging folder path

```js
const { selectors } = require("vortex-api");

const stagingPath = selectors.installPathForGame(state, GAME_ID);
// undefined if game is not discovered / no staging folder configured
if (!stagingPath) return;
```

Always guard against `undefined` before walking.

---

## Write / delete a marker file

```js
// Write empty marker (skip if already exists)
try {
    await fsp.stat(marker);
} catch {
    await fsp.writeFile(marker, "");
}

// Delete marker (no-op if missing)
await fsp.rm(marker, { force: true });
```

`fsp.writeFile` does not create parent directories — `fsp.mkdir(path.dirname(marker), { recursive:
true })` first if the parent may be absent.

`{ force: true }` is what makes `rm` tolerate a missing path — this is the direct equivalent of the
old `fs.removeAsync`, which was backed by rimraf and likewise never raised `ENOENT`. Add
`recursive: true` as well when the target may be a directory tree.

**Consequence worth knowing if you are counting deletions:** because neither the old wrapper nor
`rm { force: true }` throws on a missing path, a `touched++` after the call counts markers that were
never there. That is pre-existing behaviour, not something the native swap introduced — a `catch
(err) { if (err.code !== 'ENOENT') ... }` wrapped around `removeAsync` was always dead code. Drop
`force` and keep the `try`/`catch` only if you actually need the count to mean "files that existed".

---

## Case-insensitive folder name match

```js
const base = path.basename(iterPath).toLowerCase();
if (base === "scripts" || base === "dlls") {
    /* ... */
}
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
    await util.walk(
        stagingPath,
        (iterPath, stats) => {
            if (!stats.isDirectory()) return Promise.resolve();
            const base = path.basename(iterPath).toLowerCase();
            if (base === "scripts" || base === "dlls") targets.add(path.dirname(iterPath));
            return Promise.resolve();
        },
        { ignoreErrors: true },
    );

    let touched = 0;
    for (const parent of targets) {
        const marker = path.join(parent, "enabled.txt");
        try {
            if (write) {
                try {
                    await fsp.stat(marker);
                } catch {
                    await fsp.writeFile(marker, "");
                    touched++;
                }
            } else {
                await fsp.rm(marker, { force: true });
                touched++;
            }
        } catch (err) {
            log(
                "warn",
                `enabled.txt ${write ? "write" : "delete"} failed at ${marker}: ${err.message}`,
            );
        }
    }
}
```

---

## Notes

- `fsp.readdir`, `fsp.stat`, `fsp.writeFile`, `fsp.rm` are Node's own promise API — they throw once
  and immediately. The `vortex-api` wrappers they replaced (`fs.readdirAsync`, `fs.statAsync`,
  `fs.writeFileAsync`, `fs.removeAsync`) added retries and an elevation prompt; `NODE_FS.md` covers
  what that means in practice and the two calls still worth taking from `vortex-api`.
- Creating a directory inside the **game install** is the exception — use
  `vfs.ensureDirWritableAsync(dir)` from `vortex-api`, which also proves write access and can elevate.
  Plain `fsp.mkdir(dir, { recursive: true })` is right for anywhere the user already owns.
- The deprecated hand-rolled `getAllFiles(dirPath)` helper still exists in `template-ue4-5/index.js`
  for legacy callers. New code should use `util.walk`.
- `util.walk` is not exported from `vortex-api`'s top-level TypeScript types in all versions — use it
  via `util.walk(...)` at runtime; the JS bundle always has it.

---

## See also

`NODE_FS.md` (the `vortex-api` → native `fs` mapping, the option traps on `cp`/`rm`/`mkdir`, and the
three methods that stay on the wrapper). `RE-UE4SS_MODS_CONFIG.md` (locating `mods.txt`/`mods.json`
on disk). `UNDERUSED_API_FUNCTIONS.md` (§5 file operations beyond the basics — `fs.forcePerm`,
`util.withTmpDir`, `util.calculateFolderSize`). `NTFS_LINKS.md` (turbowalk's
`details`/`idStr`/`linkCount`/`isReparsePoint` fields in anger — they are how link-based purge
identifies deployed files).
