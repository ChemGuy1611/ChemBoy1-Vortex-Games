# Archive Handler Reference

Source: `IArchiveOptions` / `IArchiveHandler` / `registerArchiveType` in
`Vortex/src/renderer/src/types/IExtensionContext.ts`; registration and dispatch in
`ExtensionManager.registerArchiveHandler` / `ExtensionManager.openArchive`.

## How Vortex Handles Archives

Vortex has **two separate archive paths**, and `registerArchiveType` only feeds one of them.

**1. The install pipeline (does not use registered handlers).** `InstallManager` extracts every
downloaded mod with its own bundled `node-7z` instance (`extractFull`). It never consults
`registerArchiveType`. Because 7z identifies formats by content signature rather than by
extension, a renamed zip extracts here on its own. The only extension-based rule is the avoid
list (`.dll`).

**2. `api.openArchive` (the only consumer of registered handlers).** `registerArchiveType` stores
the creator in a map that is read exclusively by `ExtensionManager.openArchive`. In-app callers
are mod merging (`mod_management/modMerging.ts`) and the gamebryo extensions. Registering a type
is what lets those paths — and your own `api.openArchive` calls — read a format Vortex otherwise
knows nothing about.

### What registerArchiveType does NOT do

Vortex's "is this file an archive?" test is `knownArchiveExt()` in
`Vortex/src/renderer/src/util/archives.ts`, a **hardcoded** set (`.zip`, `.7z`, `.rar`, `.tar`,
… plus `.fomod` and `.dazip`). Extensions cannot add to it. So a custom extension such as `.vmz`
stays a non-archive as far as the surrounding UI is concerned, even with a handler registered:

- the downloads-folder scan skips it, and — because the same filtered scan decides what counts as
  removed — an existing entry for it is dropped from the Downloads list on refresh (the file
  itself stays on disk);
- the download-folder watcher ignores changes to it;
- dragging it onto the mods list takes the "non-archive files" branch.

Downloads created programmatically (`start-download`, `import-downloads`) are unaffected, since
they register state directly.

**Practical consequence:** when an extension auto-downloads a requirement from a mod site or a
GitHub release, prefer an asset with a standard archive extension. If the upstream project ships
both (e.g. an identical `.zip` and `.vmz` pair), take the `.zip`.

---

## registerArchiveType

```typescript
context.registerArchiveType(
  extension: string,           // file extension WITHOUT leading dot, e.g. "vmz", "ba2"
  handler: ArchiveHandlerCreator
): void
```

- Call inside `applyGame()` / `main()` — must be synchronous.
- Registers globally for the lifetime of the extension; no game-id filter is built in.
- One handler per file extension. Registering the same extension twice overwrites the first.
- Lookup key is the file's own extension with the leading dot stripped, **with no case
  normalization** — a handler registered as `vmz` is not found for a file named `MOD.VMZ`.
  `openArchive`'s optional third argument overrides extension detection entirely.

---

## ArchiveHandlerCreator

```typescript
type ArchiveHandlerCreator = (
  fileName: string,          // absolute path to the archive file on disk
  options: IArchiveOptions
) => PromiseBB<IArchiveHandler>;
```

`fileName` is the archive path at the time Vortex opens it. Store it in a closure — the `IArchiveHandler` methods do not receive the path again.

---

## IArchiveOptions

Source: line 293

```typescript
interface IArchiveOptions {
  verify?:  boolean;   // run integrity check (CRC) when opening
  gameId?:  string;    // hint for game context
  version?: string;    // hint for format version
  create?:  boolean;   // open in write/create mode
}
```

Options are hints only. Most handlers ignore all of them; use `create` to branch on write vs read mode if needed.

---

## IArchiveHandler

Source: line 313

```typescript
interface IArchiveHandler {
  readDir(archPath: string):                         PromiseBB<string[]>; // REQUIRED
  extractAll(outputPath: string):                    PromiseBB<void>;     // REQUIRED
  readFile?(filePath: string):                       NodeJS.ReadableStream;
  extractFile?(filePath: string, outputPath: string): PromiseBB<void>;
  addFile?(filePath: string, sourcePath: string):    PromiseBB<void>;
  create?(sourcePath: string):                       PromiseBB<void>;
  write?():                                          PromiseBB<void>;
}
```

| Method | Required | Description |
| --- | --- | --- |
| `readDir(archPath)` | YES | List all file paths in the archive. `archPath` may be a subdirectory filter or the archive root — handling both is safest. Return flat list of relative paths. |
| `extractAll(outputPath)` | YES | Extract entire archive to `outputPath`. |
| `readFile(filePath)` | no | Return a readable stream for a single file. Used by FOMOD reader and preview features. |
| `extractFile(filePath, outputPath)` | no | Extract a single file. Called when Vortex only needs one item. |
| `addFile(filePath, sourcePath)` | no | Add/update a file in the archive. Only needed for mutable archives. |
| `create(sourcePath)` | no | Create a new archive from a directory. Only needed if `options.create` mode matters. |
| `write()` | no | Flush pending changes. Called after a series of `addFile` calls. |

`readDir` and `extractAll` are the two methods `Archive` always exposes, so implement both.
They run when something opens the archive through `api.openArchive` — not on every mod install
(see "How Vortex Handles Archives" above). Implement the optional methods only when your format
requires them.

---

## Implementation Pattern: Zip-Compatible Extension (renamed zip)

Some games use a custom extension that is structurally identical to a ZIP file (e.g., `.vmz` in Road to Vostok). Register the extension and delegate to `util.SevenZip` (the bundled `node-7z` bindings), which handles ZIP natively.

```js
context.registerArchiveType('vmz', (fileName, options) => {
  const szip = new util.SevenZip();
  const handler = {
    readDir: (archPath) => new Promise((resolve, reject) => {
      const files = [];
      const stream = szip.list(fileName);
      stream.on('data', (data) => files.push(data.file));
      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    }),
    extractAll: (outputPath) => new Promise((resolve, reject) => {
      const stream = szip.extractFull(fileName, outputPath);
      stream.on('end', resolve);
      stream.on('error', reject);
    }),
  };
  return Promise.resolve(handler);
});
```

### util.SevenZip (node-7z) method signatures used above

| Method | Signature | Notes |
| --- | --- | --- |
| `szip.list(archivePath, opts?)` | returns stream | `data` event: `{ file, size, compressedSize, ... }` |
| `szip.extractFull(archivePath, destPath, opts?)` | returns stream | Extracts with full directory structure |
| `szip.extract(archivePath, destPath, opts?)` | returns stream | Extracts flat (no paths) |
| `szip.add(archivePath, files, opts?)` | returns stream | Add files; `opts.raw: ['-r']` for recursive |

All node-7z streams are thenable — you can `await szip.add(...)` directly, or use `.on('end'/'error')` for the Promise wrapper pattern above.

---

## Implementation Pattern: External Tool / Custom Binary Format

When the format requires a dedicated tool (e.g., MT Framework `.arc`), delegate to the tool executable:

```js
context.registerArchiveType('arc', (fileName, options) =>
  createARCHandler(context.api, fileName, options)
);
```

The handler calls the external binary with child_process / IRunOptions and resolves the IArchiveHandler interface with wrapper methods around the tool's output.

Existing Vortex examples:

- `Vortex/extensions/gamebryo-ba2-support` — BA2 via `bsatk` native binding
- `Vortex/extensions/gamebryo-bsa-support` — BSA via `bsatk`
- `Vortex/extensions/mtframework-arc-support` — ARC via `ARCtool.exe`

---

## The Re-Zip Pattern (vmz / renamed-zip mods)

When a game distributes mods as renamed zips (`.vmz`), the installer pipeline needs two installers working in tandem:

### Why two installers are needed

Vortex extracts the download into a temp folder before running installer tests. If the mod *is
itself* a renamed zip (no wrapper folder), the installers see the raw contents — e.g. `mod.txt`,
`mod_data/`, etc.

The game's mod loader expects a `.vmz` file in the mods folder, not extracted contents. So the installer must repack the files back into a zip and rename it `.vmz`.

### Installer 1 — testMod / installMod (pass-through, for .vmz inside a wrapper zip)

Fires when the *outer* download is a zip that contains `.vmz` files inside it. Detects by checking file extensions, copies `.vmz` files flat to the mod type destination.

```js
// testMod: fires if any extracted file has .vmz extension
const isMod = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
```

### Installer 2 — testRezip / installRezip (repack, for naked .vmz)

Fires when the `.vmz` was downloaded directly. After `registerArchiveType` extracts it, Vortex sees the raw contents (including `mod.txt`). `testRezip` detects `mod.txt` as the signal that a repack is needed.

```js
// testRezip: fires if mod.txt is present in extracted contents
const isMod = files.some(file => MOD_FILES.includes(path.basename(file).toLowerCase()));
// MOD_FILES = ["mod.txt"]
```

`installRezip` uses `util.SevenZip` to repack the extracted contents back into a `.zip` (Vortex stores it as a zip internally) and returns a single `copy` instruction:

```js
async function installRezip(files, destinationPath) {
  const szip = new util.SevenZip();
  const modName = path.basename(destinationPath, '.installing');
  const archiveName = modName.split('-')[0] + '.zip';
  const archivePath = path.join(destinationPath, archiveName);
  const rootRelPaths = await fs.readdirAsync(destinationPath);
  await szip.add(archivePath, rootRelPaths.map(p => path.join(destinationPath, p)), { raw: ['-r'] });
  return Promise.resolve({
    instructions: [
      { type: 'copy', source: archiveName, destination: path.basename(archivePath) },
      { type: 'setmodtype', value: MOD_ID },
    ]
  });
}
```

### Pipeline summary

```text
A .vmz reaches the install pipeline (e.g. inside a downloaded .zip)
  -> Vortex extracts contents to temp folder
  -> testMod fires? NO (no .vmz inside)
  -> testRezip fires? YES (mod.txt found)
  -> installRezip: repacks contents into .zip, renames, copies to staging
  -> Vortex deploys .zip to mod folder (game reads it as .vmz via its own loader)
```

Note what this pipeline does **not** depend on: `registerArchiveType`. Extraction is 7z's
signature detection. Conversely, a bare `.vmz` handed to Vortex as a download is the weak case —
it is not a `knownArchiveExt`, so prefer a `.zip`-named asset for anything the extension
downloads automatically.

Working example: `game-roadtovostok/index.js`

---

## See also

`INSTALLER_SYSTEM.md` (the `files` list installers test against, produced by the extraction step
described above). `UNDERUSED_API_FUNCTIONS.md` (§5 `api.openArchive` — the one caller of the
handlers registered here). `DOWNLOADER.md` (auto-downloading requirements from GitHub releases —
why the asset it fetches should carry a standard archive extension). `VORTEX_APP.md` (overview of
where archive handling fits among other extension systems).
