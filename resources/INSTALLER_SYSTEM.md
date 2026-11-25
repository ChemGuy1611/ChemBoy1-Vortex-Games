# Installer System

## Overview

When a user installs a mod archive, Vortex runs every registered installer's `testSupported` function in priority order (lowest number first). The first installer whose test returns `supported: true` wins and its `install` function runs. The `install` function returns an array of `IInstruction` objects that tell Vortex what to do with the archive's files.

The built-in FOMOD installer is registered at a fixed high priority. Custom installers opt out of FOMOD archives with a standard escape-hatch check (see [FOMOD Avoidance](#fomod-avoidance)).

---

## `registerInstaller`

```js
context.registerInstaller(id, priority, testFn, installFn);
```

| Param       | Type                                                                      | Notes                                                                                                  |
| ----------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `id`        | `string`                                                                  | Unique installer id; conventionally a `GAME_ID`-prefixed constant.                                     |
| `priority`  | `number`                                                                  | Lower = tested first. Fallbacks always use 49. See [Priority Reference](#priority-ordering-reference). |
| `testFn`    | `(files, gameId) => Promise<{ supported, requiredFiles }>`                | Synchronous test wrapped in `Promise.resolve`.                                                         |
| `installFn` | `(files, destinationPath, gameId, progress) => Promise<{ instructions }>` | May be sync or async. May be a wrapper closure to inject `api`.                                        |

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
if (
    supported &&
    files.find(
        (file) =>
            path.basename(file).toLowerCase() === "moduleconfig.xml" &&
            path.basename(path.dirname(file)).toLowerCase() === "fomod",
    )
) {
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

### `destinationPath` is the extracted archive

The second parameter is frequently mistaken for the archive file name. It is not: Vortex extracts
the archive before any installer runs and passes the extraction directory, `<staging>/<modId>.installing`.
Source: `InstallManager.ts`, which calls `installer.install(fileList, tempPath, gameId, progress)`.

That makes the archive's _contents_ readable inside `install`, not only its file names. Anything that
needs to look inside a file to decide what to install — a bundled manifest, a config, an embedded
version string, an image to show the user — can read it with `path.join(destinationPath, relativePath)`.
Vortex's own FOMOD wizard works this way, rendering option images with
`pathToFileURL(path.join(dataPath, image)).href`.

Two rules when reading from it:

- Only paths that appear in `files` are guaranteed to exist. Wrap the read and fall back to whatever
  the installer would have done without the file; never fail an install because an optional
  side-file is missing or malformed.
- The directory is deleted once the install finishes, so nothing may hold a reference past the
  returned promise. Copy anything that must outlive the install into staging with a `copy` instruction.

### Passing `api` into an installer

`install` does not receive `api` directly. Inject it via a closure at registration time:

```js
context.registerInstaller(MOD_ID, 35, testMod, (files, destinationPath) =>
    installMod(context.api, files, destinationPath),
);
```

### The `details` argument (8th parameter)

The full signature is `install(files, destinationPath, gameId, progressDelegate, choices, unattended, archivePath, details)`. `details` (`IInstallationDetails`) carries:

| Field | Since | Meaning |
| --- | --- | --- |
| `modReference` | 2.x | Nexus ids and file details Vortex knows for the archive. From 2.11.0-beta.1 it is also filled for local files (no download record) when the metadata lookup recognises the archive by MD5. |
| `hasXmlConfigXML`, `hasCSScripts`, `hasInstructionsOverrideFile`, `isTrusted` | 2.x | FOMOD / instruction-override flags set by the core. |
| `previousAttributes` | 2.11.0-beta.1 | Attributes of the mod this install replaces, updates or reinstalls. The old mod may already be gone from the state when the installer runs, so this is the reliable way to read a choice the previous install recorded. |
| `stagingFolder`, `previousStagingFolder` | Vortex `master` after 2.11.0-beta.3 | The staging folder name of this install and of the mod it replaces. |

Every field is optional; check for `undefined` before reading, since older Vortex versions do not send the newer ones.

---

## `IInstruction` Interface

Source: `node_modules/vortex-api/lib/api.d.ts` (grep `IInstruction` and `InstructionType` -- since v2.6.0 the bundle is rolldown-built and no longer prefixes real types with `declare`).

```typescript
interface IInstruction {
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

type InstructionType =
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

Fields as `InstallManager` actually reads them:

| Type           | Purpose                                                                 | Fields read                                                     |
| -------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `copy`         | Copy a file from the archive into the mod's staging folder              | `source`, `destination`                                         |
| `mkdir`        | Create an (empty) directory in the staging folder                       | `destination` (not `path`)                                      |
| `submodule`    | Install a nested archive into the same mod                              | `path` (full path of the nested archive), `submoduleType?`      |
| `generatefile` | Write generated content as a new file                                   | `destination`, `data` (string or Buffer)                        |
| `iniedit`      | Record an INI tweak with the mod (see below; usually not an INI patch)  | `destination` (not `path`), `section`, `key`, `value`           |
| `unsupported`  | Report installer features Vortex does not implement                     | `source` (name of the missing function)                         |
| `attribute`    | Set a metadata attribute on the mod                                     | `key`, `value`                                                  |
| `setmodtype`   | Set the mod type                                                        | `value` (mod type id string)                                    |
| `error`        | Report an installer error; aborts only when fatal                       | `source` (message), `value` (severity, `"fatal"` aborts)        |
| `rule`         | Add a dependency or conflict rule                                       | `rule` (IRule from modmeta-db)                                  |

Instructions are grouped by type before anything runs, so their order in the array does not matter. Vortex processes the groups as: `unsupported` report, `mkdir`, `copy` (extraction), `generatefile`, `iniedit`, `submodule`, `attribute`, `setmodtype`, `rule`. Before that, any instruction whose `destination` fails `util.isPathValid(destination, true)` (after stripping one leading separator) makes Vortex reject the **whole** install with "Invalid mod installer instructions", naming the game extension's `contributed` author.

---

## Common Instruction Patterns

### copy (most common)

```js
{ type: 'copy', source: filePath, destination: filePath }
```

### setmodtype

```js
{ type: 'setmodtype', value: MOD_TYPE_ID }
```

Repo convention pushes it last, though position is irrelevant. With more than one `setmodtype`, the last one wins and Vortex logs an error.

Without it the mod is installed as the default type `""`, and Vortex then runs every supported mod type's `test` against the instructions to pick one. That includes the bundled `dinput` type, which claims any mod copying a top-level `dinput8.dll`. Details: `MOD_TYPES.md`.

### attribute

```js
{ type: 'attribute', key: 'isPatch', value: true }
```

### generatefile

```js
{ type: 'generatefile', destination: 'config/settings.ini', data: '[Settings]\nKey=Value\n' }
```

The field is `destination`, not `path` — Vortex's `processGenerateFiles` joins the staging folder
with `gen.destination` and ignores `path` entirely, so an instruction using `path` writes nothing
and fails silently. `data` may be a string or a `Buffer`.

### mkdir

```js
{ type: 'mkdir', destination: 'Saves' }
```

### iniedit

```js
{ type: 'iniedit', destination: 'Skyrim.ini', section: 'Display', key: 'fShadowDistance', value: '4000' }
```

`iniedit` does not touch the game's INI at install time. Vortex groups the edits by `destination`, renders each group as an INI file and writes it into the mod's own staging folder as `Ini Tweaks\From Installer [<destination basename>].ini`, then marks that tweak enabled for the mod (the mod's details panel lists its INI tweaks). Applying tweaks to real INI files happens when settings are baked after deployment, and only for the games in Vortex's built-in INI table: Skyrim, Skyrim SE, Skyrim VR, Enderal, Enderal SE, Fallout 3, Fallout 4, Fallout 4 VR, Fallout New Vegas, Starfield, Oblivion, Oblivion Remastered and Morrowind. For any other game the tweak file is never applied, and since nothing in deployment excludes the `Ini Tweaks` folder, it deploys with the mod. A game extension that needs an INI change must write it itself (for example with `vortex-parse-ini`, see `FILE_PARSING.md`).

### error

```js
{ type: 'error', source: 'This mod requires the base game DLC.', value: 'fatal' }
```

Any `error` instruction shows an "Installer reported errors" notification listing every error's `source`. Only when one of them has `value: 'fatal'` is the install cancelled (`ProcessCanceled`); otherwise the install continues and the notification says the mod may work partially. An `error` with the message in `value` and no `source` shows an empty message and does not abort.

### unsupported

```js
{ type: 'unsupported', source: 'GetModVersion' }
```

Scripted installers emit this for functions Vortex does not implement. Vortex offers an error report listing the `source` values; the install still continues.

### submodule

```js
{ type: 'submodule', path: path.join(destinationPath, 'inner.zip'), submoduleType: OTHER_TYPE_ID }
```

Vortex runs the full installer selection on the nested archive and installs its result into the **same** mod's staging folder. `submoduleType` sets the outer mod's type.

---

## Mod-author overrides: `vortex_override_instructions.json`

A mod archive can carry a `vortex_override_instructions.json` file that rewrites what the chosen installer returned. Its presence anywhere in the archive sets `details.hasInstructionsOverrideFile` (8th `install` argument), and Vortex's FOMOD installers then ignore the game's stop patterns and plugin path. After the installer returns, Vortex adds a `copy` with the bare file name as `source` if the installer copied no such file, so in practice the file must sit at the archive root unless the installer itself copies it from deeper. Vortex reads it as a JSON array of `IInstruction` (a read or parse failure is logged and the installer's result is used unchanged) and merges it:

- `generatefile`, `unsupported` and `error` entries are dropped.
- Each entry is keyed by its `source` (or, without one, its `type`), case-insensitive. An installer instruction with the same key is **replaced** by the override.
- Override entries with a new key are appended, except a `copy` whose `destination` an existing `copy` already targets.
- A `setmodtype` entry is used only if that mod type exists for the game.
- The whole file is ignored while a collection installs its mods.

The file itself is removed from the instructions and is on Vortex's deploy blacklist, so it never reaches the game folder. For a game extension this means a mod can retarget individual files or change its own type regardless of what the extension's installer decided; a broken result is still rejected by the destination validation above.

---

## Installer Examples

### Extension-based (match by file extension)

Detects mods by file extension array `MOD_EXTS`. Path stripping uses `idx` to remove any leading archive subfolder.

```js
function testMod(files, gameId) {
    const isMod = files.some((file) => MOD_EXTS.includes(path.extname(file).toLowerCase()));
    let supported = gameId === spec.game.id && isMod;
    if (
        supported &&
        files.find(
            (file) =>
                path.basename(file).toLowerCase() === "moduleconfig.xml" &&
                path.basename(path.dirname(file)).toLowerCase() === "fomod",
        )
    ) {
        supported = false;
    }
    return Promise.resolve({ supported, requiredFiles: [] });
}

function installMod(files) {
    const modFile = files.find((file) => MOD_EXTS.includes(path.extname(file).toLowerCase()));
    const idx = modFile.indexOf(path.basename(modFile));
    const rootPath = path.dirname(modFile);
    const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
    const setModTypeInstruction = { type: "setmodtype", value: MOD_ID };

    const filtered = files.filter(
        (file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix),
    );
    const instructions = filtered.map((file) => ({
        type: "copy",
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
    const isMod = files.some((file) => path.basename(file) === LOADER_FILE);
    let supported = gameId === spec.game.id && isMod;
    // ... FOMOD check ...
    return Promise.resolve({ supported, requiredFiles: [] });
}
```

### Folder-based (match by known folder names)

Detects archives containing known root or sub-root folders (e.g. `Data`, `Plugins`). Has a two-tier fallback: try `ROOT_FOLDERS` first, then `ROOTSUB_FOLDERS`. The `ROOT_IDX` variant strips at the folder name boundary rather than at the file name.

Every name in `ROOTSUB_FOLDERS` makes the Root installer claim any archive that contains a folder of that name, so a game whose own mod loader reads a same-named folder (for example a loader that reads a `mods` folder next to its DLL while `ROOTSUB_FOLDERS` lists `Mods`) loses those archives to Root. Either drop the name from `ROOTSUB_FOLDERS` when the game has no such folder under its root, or register the loader's installer at a lower priority number than Root so it is tested first.

```js
function testRoot(files, gameId) {
    const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map((s) => s.toLowerCase());
    const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map((s) => s.toLowerCase());
    const isMod = files.some((file) =>
        ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()),
    );
    const isSub = files.some((file) =>
        ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()),
    );
    let supported = gameId === spec.game.id && (isMod || isSub);
    // ... FOMOD check ...
    return Promise.resolve({ supported, requiredFiles: [] });
}

function installRoot(files) {
    const ROOT_FOLDERS_LOWER = ROOT_FOLDERS.map((s) => s.toLowerCase());
    const ROOTSUB_FOLDERS_LOWER = ROOTSUB_FOLDERS.map((s) => s.toLowerCase());
    let folder = "";
    let modFile = files.find((file) =>
        ROOT_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()),
    );
    if (modFile === undefined) {
        modFile = files.find((file) =>
            ROOTSUB_FOLDERS_LOWER.includes(path.basename(file).toLowerCase()),
        );
        folder = ROOTSUB_PATH; // prepend sub-path for deployment
    }
    const ROOT_IDX = `${path.basename(modFile)}${path.sep}`;
    const idx = modFile.indexOf(ROOT_IDX);
    const rootPath = path.dirname(modFile);
    const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;
    // ...
}
```

### Flat fallback (always supported for the game)

Priority 49. Catches any archive that passed all earlier tests without matching. Notifies the user and installs flat to root.

```js
function testFallback(files, gameId) {
    let supported = gameId === spec.game.id;
    // ... FOMOD check ...
    return Promise.resolve({ supported, requiredFiles: [] });
}

function installFallback(api, files, destinationPath) {
    fallbackInstallerNotify(api, destinationPath);
    const setModTypeInstruction = { type: "setmodtype", value: ROOT_ID };
    const filtered = files.filter((file) => !file.endsWith(path.sep));
    const instructions = filtered.map((file) => ({
        type: "copy",
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

```text
archive path:  "MyMod-v1.2\Data\plugin.esp"
path.basename: "plugin.esp"
idx:           modFile.indexOf("plugin.esp")  →  11
file.substr(11) → "plugin.esp"
```

For folder-based installers the anchor is the folder name + separator:

```text
archive path:  "MyMod-v1.2\Data\"
ROOT_IDX:      "Data\"
idx:           modFile.indexOf("Data\")  →  11
file.substr(11) → "Data\plugin.esp"
```

---

## Scoping to `rootPath`

The `filtered` step in an installer does two independent jobs:

1. Drop directory entries, so no `copy` instruction ever names a folder.
2. Drop files outside the mod's own root, so unrelated archive siblings are not installed.

Job 1 is `!file.endsWith(path.sep)`. Vortex builds the `files` array from real filesystem
stats and appends `path.sep` to every directory entry, so this test is exact — a file with
no extension (`LICENSE`, a content-hash blob in a `Bundles` folder) is never mistaken for a
directory.

Job 2 must be a **prefix** test against a guarded prefix:

```js
const rootPath = path.dirname(modFile);
// path.dirname() returns "." when the mod file sits at the archive root, in which case
// every file is already inside the root and no scoping is needed. An empty prefix makes
// startsWith() accept everything. path.join() cannot build this prefix - it strips the
// trailing separator the comparison depends on.
const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;

const filtered = files.filter((file) => !file.endsWith(path.sep) && file.startsWith(rootPrefix));
```

### Why not `indexOf`

The older form `file.indexOf(rootPath) !== -1` is a substring search, and it fails in two ways.

**Extension-less files disappear when the mod file sits at the archive root.** `path.dirname()`
returns `"."` for a root-level file, so the test collapses into `file.indexOf(".") !== -1` —
"does this path contain a dot anywhere", which is approximately "does this have a file
extension". Every extension-less file is silently dropped from the install:

```text
modFile = "MyMod.dll"   ->   rootPath = "."

indexOf:     MyMod.dll, Bundles\manifest.json, Data\config.ini
startsWith:  MyMod.dll, LICENSE, README, Bundles\a1b2c3d4e5f6,
             Bundles\deadbeefcafe, Bundles\manifest.json, Data\config.ini
```

This is easy to misread as the directory filter misbehaving, because directory entries have
no dot either and vanish alongside the files. The directory filter is not involved.

**Sibling folders whose names share a prefix are pulled in.** A substring match has no
concept of a path boundary:

```text
rootPath = "natives"

indexOf:     natives\good.pak, natives_backup\stale.pak, Extras\natives\other.pak
startsWith:  natives\good.pak
```

The two strays are then mangled by `file.substr(idx)`, which assumes every surviving path
begins with `rootPath` + separator.

Both failures disappear with the prefix form, and `idx` needs no change: when `rootPath` is
`"."`, `idx` is already `0`, so `file.substr(idx)` returns the full relative path.

---

## Priority Ordering Reference

Lower number = tested first. Leave gaps between priorities for future insertions.

Vortex core registers its own installers alongside the game's: the native Basic FOMOD installer at 100, the generic `fallback` at 1000, and from 2.11.0-beta.1 a `manual-installer` at 50 that asks the user for a destination folder. The manual installer only claims archives for Tier 0 games (games Vortex manages without a game extension, behind the `vortex-tier-0-game-support` feature flag), so it never competes with an extension's installers for its own game. Tier 0 itself is covered in `VORTEX_GAME_LIFECYCLE.md`.

Bundled extensions add more. Two run for every game at priority 50, just above the repo's 49 fallback convention: `dinput` (any archive containing a `dinput8.dll`, files copied next to the game executable, no game check) and `gedosato` (texture-only archives, only for games in its own support table). Game-specific bundled installers (Dragon Age `dazipOuter`/`dazipInner` at 15) only claim their own games. An extension whose installers end with a priority-49 fallback is never reached by the priority-50 ones.

---

## Data-driven installers: `util.declareInstallers`

Vortex 2.2.0+ exports helpers that build `testSupported`/`install` pairs from a table instead of hand-written functions (`mod_management/util/installerHelpers.ts`, types in `types/IInstallerSpec.ts`):

```js
util.declareInstallers(context, GAME_ID, [
  { id: "paks", priority: 25, modType: PAK_ID,
    match: { kind: "extensions", list: [".pak", ".utoc", ".ucas"], mode: "any" },
    install: { stripCommonRoot: true } },
  { id: "loader", priority: 27, modType: LOADER_ID,
    match: { kind: "filename", names: ["dwmapi.dll", "UE4SS.dll"], mode: "any" },
    install: { stripCommonRoot: true } },
  { id: "loose", priority: 49,
    match: { kind: "custom", predicate: (files) => files.length > 0 },
    install: { stripCommonRoot: true } },
]);
```

| `match.kind`   | Supported when                                                                                       | `requiredFiles` |
| -------------- | ---------------------------------------------------------------------------------------------------- | --------------- |
| `extensions`   | `any`/`all` non-directory entries end with one of `list` (case-insensitive)                          | first match     |
| `regex`        | `any`/`all` entries match one of `patterns` (`RegExp` objects, flags as written)                     | first match     |
| `filename`     | `any`/`all` entries' basenames are in `names` (case-insensitive)                                     | first match     |
| `stopPatterns` | any entry matches the game's `details.stopPatterns` (compiled case-insensitive)                      | first file      |
| `custom`       | `predicate(files)` returns true; gets the raw list **including** directory entries                   | first file      |

Every spec rejects other game ids, and every kind except `custom` rejects an archive with no files. `install` is always `buildCopyInstructions(files, { stripCommonRoot, modType })`: one `copy` per file, the single wrapping top-level folder removed from destinations when `stripCommonRoot` is set and one exists (`util.findCommonRootDir`), then `setmodtype` when `modType` is given. The registration id is `modType` when set, otherwise `` `${gameId}-${spec.id}` ``.

The generated installers do **not** skip FOMOD archives, match by folder name, scope to a root folder, or emit anything but `copy`/`setmodtype`. `util.makeInstallerFromSpec(spec, gameId)` returns the bare pair so a spec-built installer can be mixed with hand-written ones, and `util.buildCopyInstructions` / `util.findCommonRootDir` / `util.compileStopPatterns` are usable on their own inside a custom `install`. Repo templates do not use these helpers; their installers rely on the FOMOD guard and root-folder logic above.

### template-basic priorities

| Priority | Installer | Trigger                                  |
| -------- | --------- | ---------------------------------------- |
| 25       | Loader    | Exact filename match (`LOADER_FILE`)     |
| 27       | Root      | Known root/sub-root folder names         |
| 29       | Binaries  | Binary file extensions (`BINARIES_EXTS`) |
| 33       | Saves     | Save file extensions (`SAVE_EXTS`)       |
| 35       | Mods      | Mod file extensions (`MOD_EXTS`)         |
| 49       | Fallback  | Any archive for this game                |

### template-ue4-5 priorities (example of a dense set)

| Priority | Installer          | Trigger                                              |
| -------- | ------------------ | ---------------------------------------------------- |
| 25       | ModKit Mods        | ModKit asset markers (conditional on `hasModKit`)    |
| 26       | UE4SS Combo        | `.zip` + UE4SS folder markers                        |
| 27       | Logic Mods         | `LogicMods` folder                                   |
| 29       | Pak / UE5 Sortable | `.pak` / `.utoc` / `.ucas` files                     |
| 31       | UE4SS              | UE4SS DLL or script markers                          |
| 33       | Signature Bypass   | Sig-bypass DLL (conditional on `SIGBYPASS_REQUIRED`) |
| 35       | Scripts            | Lua script files                                     |
| 37       | DLLs               | `.dll` files                                         |
| 39       | Root               | Known root folders                                   |
| 41       | Config             | Config file extensions                               |
| 43       | Saves              | Save file extensions                                 |
| 49       | Binaries           | Fallback binary/pak catch-all                        |

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
- Scope to the mod root with `file.startsWith(rootPrefix)`, never `file.indexOf(rootPath) !== -1`. The substring form drops every extension-less file when `rootPath` is `"."` and matches sibling folders that share a name prefix. See Scoping to `rootPath` above.
- `path.dirname()` returns `"."`, not `""`, for a path with no directory component. Any comparison against `rootPath` has to handle that case explicitly.
- `path.join()` strips a trailing separator, so it cannot build a prefix string used for `startsWith`. Concatenate `path.sep` instead. `path.relative()`, `path.dirname()` and `path.basename()` strip it too — never derive a path before testing whether the entry is a directory.
- `testSupported` must return a `Promise` even if the logic is synchronous — wrap with `Promise.resolve()`.
- `install` receives the same `files` list as `testSupported`; no need to re-derive the anchor file, but you must find it again.
- The `setmodtype` instruction overrides whatever mod type Vortex would normally assign. Position in the array is irrelevant; repo convention pushes it last for readability.
- Path separators in archive paths are OS-native (`path.sep`). Do not assume `/` or `\`.
- `idx` is a character index, not a path segment index. `file.substr(idx)` slices the string, not an array.
- Installer id strings must be unique across all extensions loaded in Vortex. Prefix with `GAME_ID` or a unique constant.
- Priority 49 is the fallback convention. Do not register a non-fallback installer at 49.

---

## See also

`FOMOD_INSTALLER.md` (the built-in priority-10/100 installer custom installers must yield to).
`MOD_TYPES.md` (what `setmodtype` sets, and type auto-detection when it is omitted).
`MOD_RULES.md` (`rule` instruction type / `IRule` shape). `ERROR_CLASSES.md` (throwing from
`install`/`testSupported`). `TEMPLATES_OVERVIEW.md` (the shared 25-49 priority convention across
templates; the per-template files under `templates/` give each template's actual ladder).
`TEMPLATE_TESTING.md` (the test suite that asserts the installer contract against every template).
`VORTEX_MOD_INSTALL.md` (runtime InstallManager orchestration, and where the `files` list passed
to `testSupported`/`install` is built). `ARCHIVE_HANDLER.md` (`registerArchiveType`, which serves
`api.openArchive` and does **not** feed the installer `files` list).

`HELLDIVERS2_MOD_MANIFEST.md` (a worked example of an installer reading a manifest and its
artwork out of the extraction directory to build an option picker).
`RESOREP.md` (a worked example of a runtime texture-injection tool whose mod type target must
match a config file the extension writes, and of retiring a mod type without stranding mods).
