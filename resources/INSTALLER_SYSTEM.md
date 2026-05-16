# Installer System

## Overview

When a user installs a mod archive, Vortex runs every registered installer's `testSupported` function in priority order (lowest number first). The first installer whose test returns `supported: true` wins and its `install` function runs. The `install` function returns an array of `IInstruction` objects that tell Vortex what to do with the archive's files.

The built-in FOMOD installer is registered at a fixed high priority. Custom installers opt out of FOMOD archives with a standard escape-hatch check (see [FOMOD Avoidance](#fomod-avoidance)).

---

## `registerInstaller`

```js
context.registerInstaller(id, priority, testFn, installFn);
```

| Param | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Unique installer id; conventionally a `GAME_ID`-prefixed constant. |
| `priority` | `number` | Lower = tested first. Fallbacks always use 49. See [Priority Reference](#priority-ordering-reference). |
| `testFn` | `(files, gameId) => Promise<{ supported, requiredFiles }>` | Synchronous test wrapped in `Promise.resolve`. |
| `installFn` | `(files, destinationPath, gameId, progress) => Promise<{ instructions }>` | May be sync or async. May be a wrapper closure to inject `api`. |

Call `registerInstaller` inside `applyGame()`, after `context.registerGame()`.

---

## `testSupported` Contract

```js
function testFoo(files, gameId) {
  const isMod = files.some(file => /* match on ext, basename, or folder */);
  let supported = (gameId === spec.game.id) && isMod;

  // FOMOD escape hatch — always include this
  if (supported && files.find(file =>
      (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
      (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  }

  return Promise.resolve({ supported, requiredFiles: [] });
}
```

- `files` — flat list of all paths in the archive, including directory entries (end with `path.sep`).
- `gameId` — active game id string; always guard with `gameId === spec.game.id`.
- `requiredFiles` — always `[]` in CB1 extensions; Vortex uses this for FOMOD dependency checks only.

### FOMOD Avoidance

Every `testSupported` function must include this check. If `moduleconfig.xml` lives inside a `fomod` folder, set `supported = false` to let the built-in FOMOD installer handle it.

```js
if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
  supported = false;
}
```

The fallback installer (`testFallback`) only checks `gameId === spec.game.id`, so it also needs this check.

---

## `install` Contract

```js
function installFoo(files) {
  const instructions = /* build IInstruction[] */;
  return Promise.resolve({ instructions });
}
```

- `files` — same flat list passed to `testSupported`.
- Return type is `IInstallResult = { instructions: IInstruction[] }`.
- Always filter out directory entries before building copy instructions.

### Passing `api` into an installer

`install` does not receive `api` directly. Inject it via a closure at registration time:

```js
context.registerInstaller(MOD_ID, 35, testMod, (files, fileName) => installMod(context.api, files, fileName));
```

---

## `IInstruction` Interface

Source: `vortex-api/lib/api.d.ts` lines 4691-4702, 5496.

```typescript
declare interface IInstruction {
    type: InstructionType;
    path?: string;
    source?: string;
    destination?: string;
    section?: string;
    key?: string;
    value?: any;
    submoduleType?: string;
    data?: string | Buffer;
    rule?: IRule;
}

declare type InstructionType =
    | "copy"
    | "mkdir"
    | "submodule"
    | "generatefile"
    | "iniedit"
    | "unsupported"
    | "attribute"
    | "setmodtype"
    | "error"
    | "rule";
```

---

## Instruction Type Reference

| Type | Purpose | Relevant Fields |
| --- | --- | --- |
| `copy` | Copy a file from archive to staging folder | `source`, `destination` |
| `mkdir` | Create a directory | `path` |
| `submodule` | Install a submodule or framework | `submoduleType` |
| `generatefile` | Write generated content as a new file | `path`, `data` (string or Buffer) |
| `iniedit` | Patch a key-value pair in an INI file | `path`, `section`, `key`, `value` |
| `unsupported` | Mark the mod as unsupported | - |
| `attribute` | Set a metadata attribute on the mod | `key`, `value` |
| `setmodtype` | Override the mod type after installation | `value` (mod type id string) |
| `error` | Abort installation with an error message | `value` (message string) |
| `rule` | Add a dependency or conflict rule | `rule` (IRule from modmeta-db) |

---

## Common Instruction Patterns

### copy (most common)

```js
{ type: 'copy', source: filePath, destination: filePath }
```

### setmodtype

Always push this as the last instruction in the array.

```js
{ type: 'setmodtype', value: MOD_TYPE_ID }
```

### attribute

```js
{ type: 'attribute', key: 'isPatch', value: true }
```

### generatefile

```js
{ type: 'generatefile', path: 'config/settings.ini', data: '[Settings]\nKey=Value\n' }
```

### iniedit

```js
{ type: 'iniedit', path: 'settings.ini', section: 'Settings', key: 'MyKey', value: '1' }
```

### error

```js
{ type: 'error', value: 'This mod requires the base game DLC.' }
```

---

## Installer Examples

### Extension-based (match by file extension)

Detects mods by file extension array `MOD_EXTS`. Path stripping uses `idx` to remove any leading archive subfolder.

```js
function testMod(files, gameId) {
  const isMod = files.some(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;
  if (supported && files.find(file =>
      (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
      (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  }
  return Promise.resolve({ supported, requiredFiles: [] });
}

function installMod(files) {
  const modFile = files.find(file => MOD_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: MOD_ID };

  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => ({
    type: 'copy',
    source: file,
    destination: path.join(file.substr(idx)),
  }));
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}
```

### Filename-based (match by exact file name)

Detects a specific loader file (e.g. `dinput8.dll`, `winmm.dll`).

```js
function testLoader(files, gameId) {
  const isMod = files.some(file => path.basename(file) === LOADER_FILE);
  let supported = (gameId === spec.game.id) && isMod;
  // ... FOMOD check ...
  return Promise.resolve({ supported, requiredFiles: [] });
}
```

### Folder-based (match by known folder names)

Detects archives containing known root or sub-root folders (e.g. `Data`, `Plugins`). Has a two-tier fallback: try `ROOT_FOLDERS` first, then `ROOTSUB_FOLDERS`. The `ROOT_IDX` variant strips at the folder name boundary rather than at the file name.

```js
function testRoot(files, gameId) {
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map(s => s.toLowerCase());
  const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map(s => s.toLowerCase());
  const isMod = files.some(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  const isSub = files.some(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && (isMod || isSub);
  // ... FOMOD check ...
  return Promise.resolve({ supported, requiredFiles: [] });
}

function installRoot(files) {
  const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map(s => s.toLowerCase());
  const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map(s => s.toLowerCase());
  let folder = '';
  let modFile = files.find(file => ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
  if (modFile === undefined) {
    modFile = files.find(file => ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()));
    folder = ROOTSUB_PATH;  // prepend sub-path for deployment
  }
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`;
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);
  // ...
}
```

### Flat fallback (always supported for the game)

Priority 49. Catches any archive that passed all earlier tests without matching. Notifies the user and installs flat to root.

```js
function testFallback(files, gameId) {
  let supported = (gameId === spec.game.id);
  // ... FOMOD check ...
  return Promise.resolve({ supported, requiredFiles: [] });
}

function installFallback(api, files, destinationPath) {
  fallbackInstallerNotify(api, destinationPath);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };
  const filtered = files.filter(file => (!file.endsWith(path.sep)));
  const instructions = filtered.map(file => ({
    type: 'copy',
    source: file,
    destination: file,
  }));
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}
```

---

## Path Stripping Pattern

Archives often wrap files in a subfolder (e.g. `MyMod-v1.2/Data/plugin.esp`). The `idx` technique strips that prefix so files install to the correct relative path.

```
archive path:  "MyMod-v1.2\Data\plugin.esp"
path.basename: "plugin.esp"
idx:           modFile.indexOf("plugin.esp")  →  11
file.substr(11) → "plugin.esp"
```

For folder-based installers the anchor is the folder name + separator:

```
archive path:  "MyMod-v1.2\Data\"
ROOT_IDX:      "Data\"
idx:           modFile.indexOf("Data\")  →  11
file.substr(11) → "Data\plugin.esp"
```

The `filtered` step removes directory entries (`file.endsWith(path.sep)`) and anything not under `rootPath` to avoid installing unrelated archive siblings.

---

## Priority Ordering Reference

Lower number = tested first. Leave gaps between priorities for future insertions.

### template-basic priorities

| Priority | Installer | Trigger |
| --- | --- | --- |
| 25 | Loader | Exact filename match (`LOADER_FILE`) |
| 27 | Root | Known root/sub-root folder names |
| 29 | Binaries | Binary file extensions (`BINARIES_EXTS`) |
| 33 | Saves | Save file extensions (`SAVE_EXTS`) |
| 35 | Mods | Mod file extensions (`MOD_EXTS`) |
| 49 | Fallback | Any archive for this game |

### template-ue4-5 priorities (example of a dense set)

| Priority | Installer | Trigger |
| --- | --- | --- |
| 25 | ModKit Mods | ModKit asset markers (conditional on `hasModKit`) |
| 26 | UE4SS Combo | `.zip` + UE4SS folder markers |
| 27 | Logic Mods | `LogicMods` folder |
| 29 | Pak / UE5 Sortable | `.pak` / `.utoc` / `.ucas` files |
| 31 | UE4SS | UE4SS DLL or script markers |
| 33 | Signature Bypass | Sig-bypass DLL (conditional on `SIGBYPASS_REQUIRED`) |
| 35 | Scripts | Lua script files |
| 37 | DLLs | `.dll` files |
| 39 | Root | Known root folders |
| 41 | Config | Config file extensions |
| 43 | Saves | Save file extensions |
| 49 | Binaries | Fallback binary/pak catch-all |

---

## Conditional Registration

Wrap `registerInstaller` calls in a toggle guard when the installer only applies in certain game configurations:

```js
// Toggle-gated installer
if (hasModKit === true) {
  context.registerInstaller(MODKITMOD_ID, 25, testModKitMod, installModKitMod);
}

// Store-variant gate
if (!reZip) {
  context.registerInstaller(FLUFFYMOD_ID, 49, testFluffyMod, installFluffyMod);
} else {
  context.registerInstaller(`${FLUFFYMOD_ID}zip`, 49, testZipContent, installZipContent);
}
```

Always read existing toggles before adding or removing conditional registration blocks.

---

## Gotchas

- `files` includes directory entries (paths ending with `path.sep`). Always filter them out before building `copy` instructions.
- `testSupported` must return a `Promise` even if the logic is synchronous — wrap with `Promise.resolve()`.
- `install` receives the same `files` list as `testSupported`; no need to re-derive the anchor file, but you must find it again.
- The `setmodtype` instruction overrides whatever mod type Vortex would normally assign. Push it last so copy instructions come first.
- Path separators in archive paths are OS-native (`path.sep`). Do not assume `/` or `\`.
- `idx` is a character index, not a path segment index. `file.substr(idx)` slices the string, not an array.
- Installer id strings must be unique across all extensions loaded in Vortex. Prefix with `GAME_ID` or a unique constant.
- Priority 49 is the fallback convention. Do not register a non-fallback installer at 49.
