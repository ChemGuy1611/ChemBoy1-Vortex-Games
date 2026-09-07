# Native Node `fs` in Vortex Extensions

Filesystem access from extension code — discovery probes, `setup`/`prepareForModding` directory
creation, installer `test`/`install` file inspection, config read-modify-write, requirement staging
in downloader modules. This repo has moved off `vortex-api`'s `fs` wrapper onto Node's built-in
`fs` for everything with a native equivalent, keeping the wrapper only for the two-and-a-half calls
that have none.

```js
const fs = require("fs"); // sync calls + constants
const fsp = fs.promises; // async calls
const { fs: vfs, util, log } = require("vortex-api");
```

`fs.` now means Node everywhere in this repo. `vfs.` is the `vortex-api` wrapper, kept for
`ensureDirWritableAsync`, `unlinkAsync`, and the fd trio only (see below).

---

## Why the split, not a clean drop

`vortex-api`'s `fs` is a wrapper around `fs-extra` that adds three things: a pre-captured backtrace
so an error points at the caller rather than into libuv; up to 5 retries on the transient Windows
codes (`EPERM EBUSY EIO EBADF ENOTEMPTY EMFILE UNKNOWN`); and, on `EPERM`, a _"Vortex needs
permission"_ dialog listing the processes that hold the file (`wholocks`) plus an elevated
unlock path that recurses up the directory tree granting `rwx`.

Upstream (`Vortex/src/renderer/src/util/fs.ts`) has tagged most of that wrapper
`/** @deprecated use node:fs directly */` — the read and write primitives — while deliberately
**keeping** `ensureDirWritableAsync`, `unlinkAsync`, `rmdirAsync`, `removeSync`, `forcePerm`,
`makeFileWritableAsync` undeprecated. That retained set is where the elevation earns its keep. This
repo follows that split rather than inventing one.

What a migrated call loses in practice: a `writeFile` / `rename` / `rm` / `cp` targeting a directory
under `Program Files` no longer pops the UAC unlock — it throws `EPERM` once. Reads
(`stat`, `readdir`, `readFile`) lose almost nothing; extensions already `try/catch` `ENOENT` around
them. If a migrated write turns out to need elevation, the escape hatch is
`vfs.forcePerm(api.translate, () => fsp.writeFile(p, data), p)` — still exported, still undeprecated.
Do not pre-apply it.

---

## `vortex-api` `fs` → native mapping

Every method this repo uses, its native replacement, and the verdict. Compared name-by-name against
`require('fs')` + `fs.promises` on the Node the app ships (Vortex 2.x → Electron 43 → Node 22;
Vortex 1.x floor → Node 18 — every API below exists on both).

| `vortex-api` `fs`                        | native replacement                                        | notes                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `statSync`                               | `fs.statSync`                                             | 1:1                                                                                                                    |
| `statAsync`                              | `fsp.stat`                                                | 1:1                                                                                                                    |
| `readdirSync`                            | `fs.readdirSync`                                          | 1:1                                                                                                                    |
| `readdirAsync`                           | `fsp.readdir`                                             | 1:1; `{ withFileTypes: true }` → `Dirent[]` same as the wrapper                                                        |
| `readFileSync`                           | `fs.readFileSync`                                         | 1:1                                                                                                                    |
| `readFileAsync`                          | `fsp.readFile`                                            | 1:1                                                                                                                    |
| `writeFileSync`                          | `fs.writeFileSync`                                        | 1:1                                                                                                                    |
| `writeFileAsync`                         | `fsp.writeFile`                                           | 1:1; parent dir must exist                                                                                             |
| `renameAsync`                            | `fsp.rename`                                              | 1:1; fails `EXDEV` across volumes — see `moveAsync`                                                                    |
| `symlinkAsync`                           | `fsp.symlink`                                             | 1:1; pass `'junction'` as the third arg for a dir junction                                                             |
| `ensureDirSync`                          | `fs.mkdirSync(p, { recursive: true })`                    | option needed                                                                                                          |
| `ensureDirAsync`                         | `fsp.mkdir(p, { recursive: true })`                       | option needed; the `onDirCreatedCB` form has no native equal — none in this repo used it                               |
| `ensureFileAsync`                        | local helper (below)                                      | no single native call                                                                                                  |
| `removeAsync`                            | `fsp.rm(p, { recursive: true, force: true })`             | options needed; exact match — `removeAsync` was rimraf-backed and never threw `ENOENT` either                          |
| `copyAsync`                              | `fsp.cp(s, d, { recursive: true })`                       | `recursive` always added; drop a trailing `{ overwrite: true }` (native default)                                       |
| `moveAsync`                              | `fsp.rename` + `EXDEV` fallback to `fsp.cp` then `fsp.rm` | hand-write; 1 dead-commented site in this repo                                                                         |
| `ensureDirWritableAsync`                 | **none**                                                  | **keep `vfs.`** — creates a dir _and_ proves write access, elevating on `EPERM`                                        |
| `unlinkAsync`                            | **none** (`fsp.rm(p, { force: true })` is close)          | **keep `vfs.`** — swallows `ENOENT`, maps a dir `EPERM` to `EISDIR`                                                    |
| `openAsync` / `readAsync` / `closeAsync` | `FileHandle` from `fsp.open()`                            | **keep `vfs.`** — `fs.promises` has no top-level `read`/`write`/`close`; a real migration rewrites to the handle shape |

`fs.copySync` is **not** exported by `vortex-api` at all — the one occurrence in the repo is a
commented-out line in `resources/snippets.js` that would have thrown. Native equivalent is
`fs.cpSync(s, d, { recursive: true })`.

---

## The three kept on `vfs.`

### `ensureDirWritableAsync(dir, confirm?)`

Runs `fs.ensureDir(dir)`, then writes and deletes a `__vortex_canary` file to confirm the directory
is actually writable. On `EPERM`/`EBADF`/`UNKNOWN`/`EEXIST` it calls the optional `confirm` callback,
then launches an elevated helper that walks up the tree calling `ensureDir` + `permissions.allow(…,
'rwx')` at each level. This is precisely the _"create a mod folder inside the game install"_ call —
`setup` / `prepareForModding` — and there is no native substitute for the elevation. Keep it.

```js
await vfs.ensureDirWritableAsync(path.join(GAME_PATH, MOD_PATH));
```

The optional second argument is a **confirm callback returning a Promise**, not a path segment.
`vfs.ensureDirWritableAsync(GAME_PATH, MOD_PATH)` is a bug — it passes a string where a function is
expected, so the `EPERM` recovery branch throws _"confirm is not a function"_ and the subdirectory is
never created. Always `path.join(...)` the segments into the first argument.

### `unlinkAsync(filePath)`

The reason to keep this one is **not** the `ENOENT` swallow — `fsp.rm(p, { force: true })` reproduces
that exactly, and in practice almost every call site is already wrapped in `try`/`catch` anyway. Nor
is it the `EPERM`-points-at-a-directory → `EISDIR` remap, which is diagnostic sugar: both the wrapper
and a non-recursive `rm` fail on a directory either way.

What it keeps is the **retry-and-prompt path**. `unlinkAsync` routes failures through the same error
handler as the rest of the wrapper, so an `EBUSY` (the game holding the file open) raises the
"close these applications and retry" dialog with a live process list, and an `EPERM` raises the
unlock/elevate dialog. The overwhelming majority of `unlinkAsync` calls in extension code delete a
file _inside the game directory during purge_ — exactly the case where the file may be locked or the
directory may need elevation. Native `rm` fails once, silently, into whatever `catch` is nearest.

That is why upstream left it undeprecated, and why it stays on `vfs.` here.

### `openAsync` / `readAsync` / `closeAsync` (the fd trio)

`fs.promises` exposes no top-level `read`, `write`, `close`, or `fsync` — those live on the
`FileHandle` object returned by `fsp.open()`. One file in this repo (`game-metalgearsolidvtpp`) reads
a binary header via the fd trio. Migrating it means rewriting to:

```js
const handle = await fsp.open(filePath, "r");
try {
    const { bytesRead } = await handle.read(buf, 0, len, pos);
} finally {
    await handle.close();
}
```

That is a real rewrite, not a rename — out of scope for the migration. Kept on `vfs.` until it
matters.

---

## Verified semantics

Run against Node 24; these are the rules that make the option-carrying replacements safe.

| check                                                           | result                                                                             |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `mkdir(p, { recursive: true })` on an existing dir              | no-op — matches `ensureDir`                                                        |
| `mkdir(p, { recursive: true })` where a **file** holds the path | throws `EEXIST` — matches `ensureDir`                                              |
| `rm(p, { recursive: true, force: true })` on a missing path     | no-op — matches `removeAsync`                                                      |
| `rm(p, { recursive: true, force: true })` on a plain file       | deletes it — `removeAsync` covered files too                                       |
| `cp(s, d)` on a **file**, no `recursive`                        | works                                                                              |
| `cp(s, d, { recursive: true })` on a **file**                   | also works — flag is harmless, so apply it blanket                                 |
| `cp(s, d)` on a **directory**, no `recursive`                   | throws `ERR_FS_EISDIR` — **must add the flag**                                     |
| `cp` default overwrite                                          | `force` defaults `true` — matches `fs-extra` `overwrite: true`                     |
| `cp(s, d, { force: false })` onto an existing dest              | **silently skips**, does not throw                                                 |
| `cp(s, d, { force: false, errorOnExist: true })`                | throws `ERR_FS_CP_EEXIST` (not `EEXIST`)                                           |
| `unlink(p)` on a missing path                                   | throws `ENOENT` — a bare `fsp.rm`/`fsp.unlink` swap for `vfs.unlinkAsync` is wrong |
| `mkdir` + `open(p, 'a')` + `close` on an existing file          | does **not** truncate — valid `ensureFile` emulation                               |
| `readdir(p, { withFileTypes: true })`                           | returns `Dirent[]` — same as the wrapper                                           |
| `stat(p)` on a missing path                                     | throws `ENOENT` — same `code` as `statAsync`                                       |

`copyAsync(a, b)` with no options appears several times in the repo copying **directories**
(`copyAsync(folder, folderRoot)`). Those are exactly the sites that break without `recursive: true` —
hence the blanket flag.

---

## The `ensureFile` helper

No single native call creates a file and its parent directories without truncating an existing file.
Inject this once per file that needs it, above the first use:

```js
// vortex-api's fs.ensureFileAsync is deprecated; this is the node equivalent.
async function ensureFileAsync(filePath) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    const handle = await fsp.open(filePath, "a");
    await handle.close();
}
```

`open(p, 'a')` creates the file if absent and is a no-op (no truncation) if present, so this is safe
to call on a path that may already hold content.

---

## `Stats` and `Dirent`

`fsp.stat` / `fs.statSync` return a `fs.Stats`; `fsp.readdir(p, { withFileTypes: true })` returns
`fs.Dirent[]`. Both are the same objects the wrapper returned.

```js
const st = await fsp.stat(p);
st.isDirectory();
st.isFile();
st.size;
st.mtime; // Stats

for (const ent of await fsp.readdir(dir, { withFileTypes: true })) {
    ent.name;
    ent.isDirectory();
    ent.isFile(); // Dirent — name only, not a full path
}
```

`Dirent.name` is the entry name, not a path — `path.join(dir, ent.name)` for the full path. On
NTFS, `Stats.ino` / `Stats.nlink` are Numbers and can lose precision; where identity matters use
`fsp.stat(p, { bigint: true })`.

---

## Error-code vocabulary

The codes extension code actually meets, all on `err.code`:

| code               | when                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `ENOENT`           | path does not exist — `stat`, `readdir`, `readFile`, `unlink`, `rename` source                     |
| `EPERM` / `EACCES` | no permission — write/delete under `Program Files`, a file the game holds                          |
| `EBUSY`            | file open in another process (the game, an AV scanner)                                             |
| `EEXIST`           | `mkdir` without `recursive` on an existing path; a file occupying a dir path even with `recursive` |
| `EISDIR`           | a file operation aimed at a directory                                                              |
| `ENOTEMPTY`        | `rmdir` (not `rm { recursive }`) on a non-empty dir                                                |
| `EXDEV`            | `rename` across volumes — copy-then-delete instead                                                 |
| `ERR_FS_EISDIR`    | `cp` on a directory without `recursive: true`                                                      |
| `ERR_FS_CP_EEXIST` | `cp` with `{ force: false, errorOnExist: true }` onto an existing dest                             |

Native `fs` throws these once, immediately. The wrapper retried the transient ones (`EPERM EBUSY EIO
EBADF ENOTEMPTY EMFILE UNKNOWN`) up to 5 times and prompted on `EPERM` — migrated code does neither.

---

## `fs` vs `original-fs`

Vortex's own sync passthroughs (`statSync`, `readdirSync`, `readFileSync`, `writeFileSync`,
`writeSync`, `accessSync`, `appendFileSync`, `closeSync`, `createReadStream`, `createWriteStream`,
`linkSync`, `openSync`, `symlinkSync`, `watch`) are re-exported from Electron's **`original-fs`**,
not `fs`; only `constants`, `Stats`, `WriteStream`, `FSWatcher` come from `fs`. `original-fs` is
Electron's un-patched module — it does not treat `app.asar` as a directory.

An extension's own `require('fs')` is Node's asar-aware `fs`. For game directories — never inside an
asar — the two are byte-for-byte identical, so `require('fs')` is correct for everything an extension
does. The distinction would only matter reading a path inside `app.asar`, which extensions do not.

---

## Typical usage

### Discovery / requiresLauncher probe

```js
async function findGame() {
    // GameStoreHelper first; a manual stat only as a fallback probe
    try {
        await fsp.stat(path.join(candidatePath, EXEC));
        return candidatePath;
    } catch {
        return undefined; // ENOENT — not this path
    }
}
```

### `setup` / `prepareForModding` — directory creation

```js
async function prepareForModding(discovery) {
    await vfs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH)); // kept — elevates on EPERM
    await fsp.mkdir(path.join(discovery.path, LOG_PATH), { recursive: true }); // plain dir, no elevation needed
}
```

### Installer `test` / `install` — inspecting the extracted file list

```js
function testSupported(files, gameId) {
    const supported =
        gameId === GAME_ID && files.some((f) => path.basename(f).toLowerCase() === MARKER_FILE);
    return Promise.resolve({ supported, requiredFiles: [] });
}

async function install(files, destinationPath) {
    const manifestRel = files.find((f) => path.basename(f) === "mod.json");
    let folderName;
    try {
        const json = JSON.parse(
            await fsp.readFile(path.join(destinationPath, manifestRel), "utf8"),
        );
        folderName = json.modPluginName;
    } catch {
        folderName = path.basename(path.dirname(manifestRel)); // fall back to the archive-derived name
    }
    // ...build IInstruction[]
}
```

### Config read-modify-write

```js
let cfg = {};
try {
    cfg = JSON.parse(await fsp.readFile(cfgPath, "utf8"));
} catch (err) {
    if (err.code !== "ENOENT") throw err; // missing is fine, malformed is not
}
cfg.enabled = true;
await fsp.mkdir(path.dirname(cfgPath), { recursive: true });
await fsp.writeFile(cfgPath, JSON.stringify(cfg, null, 2), "utf8");
```

### Downloader requirement staging

```js
await fsp.mkdir(stagingDir, { recursive: true });
const dest = path.join(stagingDir, assetName);
await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest); // fs.createWriteStream — not a destructured import
    response.body.pipe(out);
    out.on("finish", resolve);
    out.on("error", reject);
});
```

---

## Notes

- The per-file rewrite is **atomic**: because `fs` changes meaning, a half-migrated file is broken,
  not degraded — but it fails loudly. Native `fs` has no `ensureDirWritableAsync` / `statAsync` /
  `readdirAsync` / `ensureFileAsync` / `removeAsync`, so a missed call site throws
  `TypeError: fs.X is not a function` on first run rather than misbehaving silently.
- `migrate_fs.py` at the repo root applies the mapping above; `eslint.config.js` carries a
  `no-restricted-properties` block that flags the 17 migrated names on `vfs`.
- Both `removeAsync` and `unlinkAsync` tolerate a missing path, so `fsp.rm(p, { force: true })`
  (plus `recursive: true` for a tree) matches either on the `ENOENT` axis. Code wrapping them in a
  `catch (err) { if (err.code !== 'ENOENT') throw err; }` has a dead catch, and a deletion counter
  after either form counts paths that were never there. What separates them is the failure path, not
  the missing-path path: `unlinkAsync` keeps the busy/permission dialogs, which is why it stays.
- `util.walk` (from `vortex-api`) is still the canonical recursive walker — see `FILE_SEARCH.md`.
  Native `fs` covers single-level listing and single-path stat only.

---

## See also

`FILE_SEARCH.md` (`util.walk` for recursive walks, single-level `readdir`/`stat` patterns, the
staging-folder path). `FILE_PARSING.md` (INI/XML/YAML/TOML/JSON libraries layered on top of the
read/write calls here). `NTFS_LINKS.md` (`fsp.symlink` with the `'junction'` type, and why link
identity needs `{ bigint: true }`). `ARCHIVE_HANDLER.md` (reading a file that lives inside an
archive rather than on disk). `DOWNLOADER.md` (the requirement-staging file writes in the shared
downloader modules). `TEMPLATES_OVERVIEW.md` (every template's `setup` uses
`ensureDirWritableAsync`; new extensions are scaffolded already migrated). `UNDERUSED_API_FUNCTIONS.md`
(§5 — `fs.forcePerm`, `util.withTmpDir`, `util.calculateFolderSize` beyond the basics).
