# template-unity-umm Changelog

## [2026-09-30]

- Added: an `id` field as the first key of `info.json`, set to the `XXX` placeholder that `new_extension.py` replaces with the `GAME_ID`. Vortex uses `id` as the extension's stable identity (registered name, install folder and localization namespace) instead of deriving them from the folder or archive name.

## [2026-09-28]

- Added: a `license*` glob (`path.join("**", "license*")`) alongside the existing `changelog*`/`readme*` entries in `IGNORE_CONFLICTS`/`IGNORE_DEPLOY`, so LICENSE files are treated the same as README/CHANGELOG - never flagged as a mod conflict, never deployed into the game folder.

## [2026-09-27] (2)

- Changed: `resolveGameVersion` now resolves the real game build instead of the Unity player version stamped in the exe's `ProductVersion`, which barely changes across content patches and made curator/user "Game version mismatch" checks meaningless. New tiered chain, ported from the `game-prodeus` pilot (`ue-unity-game-version-soaring-creek` plan, live-tested OK on the hybrid/bepinex templates this same session): `hasVersionFile` is now checked before the Xbox appxmanifest tier rather than after it, matching the other two Unity templates (extracted into `readVersionFile()`, which returns `undefined` on a read failure instead of rejecting, so the chain falls through instead of dying); then Xbox appxmanifest (unchanged); then a new `exeHasGameVersion` toggle (default off) for games whose devs do stamp the real version into the exe; then store build metadata - Steam `appmanifest_<id>.acf` `buildid` (walking up from the game path to find `steamapps/common`), Epic launcher `.item` manifest `AppVersionString`, GOG registry `ver`; then an MD5-of-MD5s hash of `ASSEMBLY_FILES` (IL2CPP `GameAssembly.dll` or Mono `Assembly-CSharp.dll`+`Assembly-CSharp-firstpass.dll`, never the Unity exe stub), cached per sorted file mtimes so it is paid once per build rather than on every `mod-installed` health check; last resort falls through to the old exe `ProductVersion` read, then `"0.0.0"`. Never throws. Requires `crypto`, newly added to the require block (`winapi-bindings` was already present). New `VER_IDX`/`VER_SPLIT` consts added beside `VERSION_FILE_PATH` - this template inlined the split character and index instead of naming them, unlike the other two Unity templates.
- Fixed: the last-resort exe read now goes through `getExecutable(gamePath)` instead of the bare `EXEC` constant, so a game with `multiExe = true` gets the alt/Xbox exe path checked here too, matching how every other tier already resolves the executable. Latent on the template default (`multiExe = false`), same as the exe-version import it shares with `getExeProductVersion()`.
- Note: existing collection revisions were published against the old Unity-player-version values, so users will see a one-time "Game version mismatch" dialog on games ported to this resolver until the curator republishes.

## [2026-09-27]

- Changed: the deprecated `util.<ErrorClass>(...)` constructors (`UserCanceled`, `ProcessCanceled`, `DataInvalid`, and the rest of that family) are replaced with direct `new VortexError(message, { kind, ... })` construction, and `VortexError` is added to the `vortex-api` require. `util.toPromise((cb) => api.events.emit(..., cb))` is replaced with a plain `new Promise((resolve, reject) => ...)` whose event callback is `(err, result) => (err ? reject(err) : resolve(result))`. No behavior change.

## [2026-09-25]

- Changed: `util.opn(...)` (deprecated Bluebird-promise API) replaced with `window.api.shell.openUrl()`/`openFile()` (void, no promise) at every call site, each wrapped in `try`/`catch` reporting failures via `showErrorNotification(..., { allowReport: false })` instead of the old silent `.catch(() => null)`.

## [2026-09-12]

- Added an "Open SteamDB Page" button next to "Open PCGamingWiki Page", opening the game's `https://steamdb.info/app/<STEAMAPP_ID>/` page.

## [2026-09-11]

- Fixed: installers scoped their file list to the mod root with `file.indexOf(rootPath) !== -1`, a substring test that silently dropped every extension-less file. `path.dirname()` returns `"."` when the mod file sits at the archive root, which collapses the test to "the path contains a dot", so asset bundles and other extension-less payloads never reached the staging folder; the same test also matched sibling folders that happen to share a name prefix. Each installer now derives `const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;` and filters with `file.startsWith(rootPrefix)`.
- Fixed: `installRoot` had its scoping filter removed entirely as a workaround for that bug, so it copied every file in the archive - including anything sitting outside the mod root - and only dropped directory entries. It now scopes to `rootPrefix` like the other installers, which keeps the extension-less files the workaround was protecting.

## [2026-09-06]

- Changed: migrated off the deprecated `vortex-api` `fs` wrapper onto native node `fs`. `fs` now means node's own module (`const fs = require("fs")`, plus `const fsp = fs.promises` for the async calls), and the vortex-api wrapper is still imported alongside it as `vfs`. Call sites move across 1:1 - `fs.statAsync` becomes `fsp.stat`, `fs.readdirAsync` becomes `fsp.readdir`, `fs.readFileAsync`/`fs.writeFileAsync` become `fsp.readFile`/`fsp.writeFile`, `fs.renameAsync` becomes `fsp.rename` - while the two that need options change shape: `fs.ensureDirSync(p)` becomes `fs.mkdirSync(p, { recursive: true })` and `fs.removeAsync(p)` becomes `fsp.rm(p, { recursive: true, force: true })`. `fs.copyAsync` becomes `fsp.cp` and always gains `recursive: true`, because native `cp` throws `ERR_FS_EISDIR` on a directory without it.
- Note: `ensureDirWritableAsync` stays on the wrapper as `vfs.ensureDirWritableAsync` - it has no native equivalent, and it is the call that creates a mod folder inside the game install and offers the elevation prompt when that folder is not writable. `vfs.unlinkAsync` is kept for the same reason where it appears. Everything else loses the wrapper's retry-and-elevate handling, which upstream deprecated deliberately; reach for `vfs.forcePerm` if a migrated write turns out to need it.

## [2026-08-24]

- Added: `isDir()` helper, matching the other templates.
- Corrected: the 2026-08-22 entry below claimed Railloader support was added behind a `railloaderSupport` toggle. It never was - the Railloader constants, installers and toolbar action live only in `game-railroader`, which is the only game that has a second loader. The entry has been amended.

## [2026-08-23]

- Fixed: the "Run Unity Mod Manager" action resolves the executable from the game folder each time. It previously read a stored tool path, which for anyone migrating from the bundled `modtype-umm` extension pointed at a staging folder named after a specific UMM version and stopped working as soon as that version changed.
- Added: `setUmmTool()` repoints any registered Unity Mod Manager tool at the deployed executable in the game folder, repairing the stale entry the helper extension left behind.

## [2026-08-22]

- Added: the template now downloads and installs Unity Mod Manager itself. `downloadUmm()` fetches it from Nexus (`site/mods/21`, newest main file with a hardcoded file-ID fallback), and `installUmm()` reproduces UMM's own DoorstopProxy patch as installer instructions: `winhttp.dll` and `doorstop_config.ini` in the game folder, the manager libraries and a generated `Config.xml` under `<data>/Managed/UnityModManager`, with the installer folder kept intact so `UnityModManager.exe` stays usable as a tool. `Config.xml` is built by parsing the game's `<GameInfo>` block out of the archive's `UnityModManagerConfig.xml`, and the `System.Xml.dll` and Harmony 2.2 conditionals UMM applies are reproduced as well. New toggle `autoDownloadUmm`, default on.
- Removed: `context.requireExtension('modtype-umm')` and the `api.ext.ummAddGame` registration. The bundled helper extension no longer works - its version table stops at 0.24.2 and matches archives by exact file name, it requires a premium account, and its mod type is registered without a deploy path.
- Added: `writeUmmParams()` merges an entry for the game into UMM's own `Params.xml`, and `setUmmRegistry()` writes its `HKEY_CURRENT_USER\Software\UnityModManager` values, so the installer window opens already pointed at the game. New toggle `seedUmmParams`, default on.
- Added: `UnityModManager.exe` is registered as a tool, with a "Run Unity Mod Manager" toolbar action.
- Added: mod installer for UMM mods (`info.json` plus a `.dll`), installing into `<gamePath>/Mods/<ModName>` under a new `Mod` mod type. Archives that wrap the mod in a `Mods` folder, in a bare folder, or ship it flat all normalise to the same layout, with the folder name taken from the manifest when the archive is flat.
- Not added: Railloader support stayed in `game-railroader` rather than being backported. It is the only game with a second loader, so the Railloader constants, installers, `railloaderSupport` toggle and "Get Railloader" toolbar action have no place in a template shared by other UMM games.
- Changed: installer ladder is now ROOT 8, UMM 25, UMM mods 27, assembly 31, assets 33, fallback 49. Slots 23 and 29 are left free for a game that adds a second loader ahead of UMM and its mods, as `game-railroader` does with Railloader.

## [2026-08-21]

- Changed: `context.once()` now calls through the local `api` constant declared at the top of the block instead of repeating `context.api` on each call.

## [2026-08-10]

- Changed: `hasXbox` is now derived from the active discovery IDs. It is declared with `let` and initialised to `false`, followed by `if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;`, so adding the Xbox app ID to `DISCOVERY_IDS_ACTIVE` is enough to switch on the Xbox version logic. Setting the initialiser to `true` still forces it on for games that need it without an Xbox ID in the list.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-01]

- Changelog tracking started for this template.
