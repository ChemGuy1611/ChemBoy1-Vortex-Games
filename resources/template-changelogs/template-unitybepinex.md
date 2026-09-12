# template-unitybepinex Changelog

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
