# Archive Handler Reference

Source: `Vortex/src/renderer/src/types/IExtensionContext.ts` lines 293-326, 1229-1232

## How Vortex Handles Archives

When a user drops a mod file into Vortex, Vortex determines how to extract it based on the file extension.

- Standard extensions (`.zip`, `.7z`, `.rar`) are handled natively by the Vortex download manager via the bundled `node-7z` bindings.
- Unknown or game-specific extensions (`.vmz`, `.ba2`, `.bsa`, `.arc`, etc.) require an extension to register a handler before Vortex knows how to open them.
- Without a registered handler, Vortex either refuses the file or treats it as a raw (non-archive) download.

`context.registerArchiveType` maps a file extension to a handler creator. Vortex calls the creator when it needs to open a file of that type, then calls methods on the returned handler to list or extract its contents.

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
| `extractAll(outputPath)` | YES | Extract entire archive to `outputPath`. This is called by the installer pipeline to get files into the staging temp folder. |
| `readFile(filePath)` | no | Return a readable stream for a single file. Used by FOMOD reader and preview features. |
| `extractFile(filePath, outputPath)` | no | Extract a single file. Called when Vortex only needs one item. |
| `addFile(filePath, sourcePath)` | no | Add/update a file in the archive. Only needed for mutable archives. |
| `create(sourcePath)` | no | Create a new archive from a directory. Only needed if `options.create` mode matters. |
| `write()` | no | Flush pending changes. Called after a series of `addFile` calls. |

Vortex will call `readDir` and `extractAll` for every install. Implement the optional methods only when your format requires them.

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

Vortex, once it can extract `.vmz` via `registerArchiveType`, extracts the archive contents into a temp folder. If the mod *is itself* a renamed zip (no wrapper folder), Vortex sees the raw contents — e.g., `mod.txt`, `mod_data/`, etc.

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
User drops .vmz onto Vortex
  -> registerArchiveType('vmz') allows extraction
  -> Vortex extracts contents to temp folder
  -> testMod fires? NO (no .vmz inside)
  -> testRezip fires? YES (mod.txt found)
  -> installRezip: repacks contents into .zip, renames, copies to staging
  -> Vortex deploys .zip to mod folder (game reads it as .vmz via its own loader)
```

Working example: `game-roadtovostok/index.js`
