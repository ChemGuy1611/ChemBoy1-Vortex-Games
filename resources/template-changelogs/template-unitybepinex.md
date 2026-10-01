# template-unitybepinex Changelog

## [2026-09-30]

- Added: an `id` field as the first key of `info.json`, set to the `XXX` placeholder that `new_extension.py` replaces with the `GAME_ID`. Vortex uses `id` as the extension's stable identity (registered name, install folder and localization namespace) instead of deriving them from the folder or archive name.

## [2026-09-28]

- Added: a `license*` glob (`path.join("**", "license*")`) alongside the existing `changelog*`/`readme*` entries in `IGNORE_CONFLICTS`/`IGNORE_DEPLOY`, so LICENSE files are treated the same as README/CHANGELOG - never flagged as a mod conflict, never deployed into the game folder.

## [2026-09-27] (2)

- Changed: `resolveGameVersion` now resolves the real game build instead of the Unity player version stamped in the exe's `ProductVersion`, which barely changes across content patches and made curator/user "Game version mismatch" checks meaningless. New tiered chain, ported from the `game-prodeus` pilot (`ue-unity-game-version-soaring-creek` plan, live-tested OK): `hasVersionFile` stays tier 0 (extracted into `readVersionFile()`, now returns `undefined` on a read failure instead of `"0.0.0"` so the chain falls through); then Xbox appxmanifest (unchanged); then a new `exeHasGameVersion` toggle (default off) for games whose devs do stamp the real version into the exe; then store build metadata - Steam `appmanifest_<id>.acf` `buildid` (walking up from the game path to find `steamapps/common`), Epic launcher `.item` manifest `AppVersionString`, GOG registry `ver`; then an MD5-of-MD5s hash of `ASSEMBLY_FILES` (IL2CPP `GameAssembly.dll` or Mono `Assembly-CSharp.dll`+`Assembly-CSharp-firstpass.dll`, never the Unity exe stub), cached per sorted file mtimes so it is paid once per build rather than on every `mod-installed` health check; last resort falls through to the old exe `ProductVersion` read, then `"0.0.0"`. Never throws. Requires `crypto`, newly added to the require block; `winapi-bindings` was already required by the game files this template scaffolds but had been left commented out in the template itself - uncommented, since the Epic/GOG tiers need it.
- Note: existing collection revisions were published against the old Unity-player-version values, so users will see a one-time "Game version mismatch" dialog on games ported to this resolver until the curator republishes.

## [2026-09-27]

- Fixed: `setGameVersion()`'s Xbox branch called `statCheckAsync(gamePath, EXEC_XBOX)` without `await` — a Promise is always truthy, so on any game with `hasXbox = true` the check always passed regardless of the actual install, misclassifying every non-Xbox install as Xbox and swapping `DATA_FOLDER`/`ASSETS_PATH`/`ASSEMBLY_PATH`/`SAVE_PATH` to the Xbox variants. The equivalent `multiExe`/`EXEC_ALT` check two lines below already awaited correctly. Found while debugging a `prodeus` version-resolver pilot that returned "0.0.0" on a real Steam install (`ue-unity-game-version-soaring-creek.md` W2).
- Changed: the deprecated `util.<ErrorClass>(...)` constructors (`UserCanceled`, `ProcessCanceled`, `DataInvalid`, and the rest of that family) are replaced with direct `new VortexError(message, { kind, ... })` construction, and `VortexError` is added to the `vortex-api` require. `util.toPromise((cb) => api.events.emit(..., cb))` is replaced with a plain `new Promise((resolve, reject) => ...)` whose event callback is `(err, result) => (err ? reject(err) : resolve(result))`. No behavior change.
- Changed: `downloader.js`'s requirement loop now checks `err?.data?.kind === "process-canceled"` instead of `err instanceof util.ProcessCanceled`. A plain `VortexError` is never `instanceof` the old subclass, so without this a skipped requirement (for example a GitHub rate limit) would surface as a "Failed to install" error instead of being logged and skipped.

## [2026-09-25]

- Changed: `util.opn(...)` (deprecated Bluebird-promise API) replaced with `window.api.shell.openUrl()`/`openFile()` (void, no promise) at every call site (`index.js`, `downloader.js`), each wrapped in `try`/`catch` reporting failures via `showErrorNotification(..., { allowReport: false })` instead of the old silent `.catch(() => null)`.

## [2026-09-14]

- Fixed: `BEP_BE_VER`/`BEP_BE_COMMIT` fallback bumped from build 755/`3fab71a` (2026-08-05) to the current builds.bepinex.dev newest build 788/`5b766a3` (2026-09-01).

## [2026-09-12]

- Added an "Open SteamDB Page" button next to "Open PCGamingWiki Page", opening the game's `https://steamdb.info/app/<STEAMAPP_ID>/` page.

## [2026-09-11]

- Fixed: installers scoped their file list to the mod root with `file.indexOf(rootPath) !== -1`, a substring test that silently dropped every extension-less file. `path.dirname()` returns `"."` when the mod file sits at the archive root, which collapses the test to "the path contains a dot", so asset bundles and other extension-less payloads never reached the staging folder; the same test also matched sibling folders that happen to share a name prefix. Each installer now derives `const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;` and filters with `file.startsWith(rootPrefix)`.
- Fixed: `installRoot` had its scoping filter removed entirely as a workaround for that bug, so it copied every file in the archive - including anything sitting outside the mod root - and only dropped directory entries. It now scopes to `rootPrefix` like the other installers, which keeps the extension-less files the workaround was protecting.

## [2026-09-08]

- Removed: the dead `//const fsExtra = require('fs-extra');` import comment. `fs-extra` is retired across the repo — `fs.unlinkSync` / `fs.copyFileSync` are native.

## [2026-09-06]

- Changed: migrated off the deprecated `vortex-api` `fs` wrapper onto native node `fs`. `fs` now means node's own module (`const fs = require("fs")`, plus `const fsp = fs.promises` for the async calls), and the vortex-api wrapper is still imported alongside it as `vfs`. Call sites move across 1:1 - `fs.statAsync` becomes `fsp.stat`, `fs.readdirAsync` becomes `fsp.readdir`, `fs.readFileAsync`/`fs.writeFileAsync` become `fsp.readFile`/`fsp.writeFile`, `fs.renameAsync` becomes `fsp.rename` - while the two that need options change shape: `fs.ensureDirSync(p)` becomes `fs.mkdirSync(p, { recursive: true })` and `fs.removeAsync(p)` becomes `fsp.rm(p, { recursive: true, force: true })`. `fs.copyAsync` becomes `fsp.cp` and always gains `recursive: true`, because native `cp` throws `ERR_FS_EISDIR` on a directory without it.
- Note: `ensureDirWritableAsync` stays on the wrapper as `vfs.ensureDirWritableAsync` - it has no native equivalent, and it is the call that creates a mod folder inside the game install and offers the elevation prompt when that folder is not writable. `vfs.unlinkAsync` is kept for the same reason where it appears. Everything else loses the wrapper's retry-and-elevate handling, which upstream deprecated deliberately; reach for `vfs.forcePerm` if a migrated write turns out to need it.
- Changed: the bundled `downloader.js` carries the same migration and stays byte-identical to `resources/downloader/downloader.js`.

## [2026-08-28]

- Fixed: `downloader.js` searches Vortex's downloads for the game being managed only. Vortex keeps one flat list of downloads across every managed game, so a requirement whose archive has a common name - `Release.zip` is used by more than a dozen extensions - could match an archive downloaded for a different game and install it in place of the real requirement. The version check read the same list and could likewise report a version taken from another game's archive.

## [2026-08-21]

- Changed: `context.once()` now calls through the local `api` constant declared at the top of the block instead of repeating `context.api` on each call.

## [2026-08-10]

- Added: `downloader.js` is now bundled with the template, and BepInExConfigManager is defined as a requirement (`BEPCFGMAN_REQUIREMENTS`) resolved from its GitHub releases instead of a hardcoded version URL. A `check-mods-version` handler in `context.once()` offers an update when a newer release appears, and the mod list shows the readable name rather than the archive file name. BepInEx itself is untouched and still comes from the `modtype-bepinex` extension.
- Added: `BEPCFGMAN_VARIANT` selects the BepInEx 5 or IL2CPP build of ConfigurationManager. It matches with `includes('mono')` so it works with both spellings in use across this family, `mono`/`il2cpp` and `unitymono`/`unityil2cpp`.
- Changed: `downloadBepCfgMan` delegates to the module; the `downloadCfgMan` toggle still gates both the unattended install in `setup()` and the update check.
- Removed: `BEPCFGMAN_URL`, `BEPCFGMAN_URL_ERR` and `isBepCfgManInstalled`, all superseded by the requirement definition.
- Changed: `hasXbox` is now derived from the active discovery IDs. It is declared with `let` and initialised to `false`, followed by `if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;`, so adding the Xbox app ID to `DISCOVERY_IDS_ACTIVE` is enough to switch on the Xbox version logic. Setting the initialiser to `true` still forces it on for games that need it without an Xbox ID in the list.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-01]

- Changelog tracking started for this template.
