# template-frostbite Changelog

## [2026-09-12]

- Fixed: installers scoped their file list to the mod root with `file.indexOf(rootPath) !== -1`, a substring test that silently dropped every extension-less file. `path.dirname()` returns `"."` when the mod file sits at the archive root, which collapses the test to "the path contains a dot", so extension-less payloads never reached the staging folder; the same test also matched sibling folders that happen to share a name prefix. 3 of the 4 installers now derive `const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;` and filter with `file.startsWith(rootPrefix)`. The 4th site sits inside the `.fbmod` installer, which is entirely disabled behind a block comment and left as-is.

## [2026-09-06]

- Changed: migrated off the deprecated `vortex-api` `fs` wrapper onto native node `fs`. `fs` now means node's own module (`const fs = require("fs")`, plus `const fsp = fs.promises` for the async calls), and the vortex-api wrapper is still imported alongside it as `vfs`. Call sites move across 1:1 - `fs.statAsync` becomes `fsp.stat`, `fs.readdirAsync` becomes `fsp.readdir`, `fs.readFileAsync`/`fs.writeFileAsync` become `fsp.readFile`/`fsp.writeFile`, `fs.renameAsync` becomes `fsp.rename` - while the two that need options change shape: `fs.ensureDirSync(p)` becomes `fs.mkdirSync(p, { recursive: true })` and `fs.removeAsync(p)` becomes `fsp.rm(p, { recursive: true, force: true })`. `fs.copyAsync` becomes `fsp.cp` and always gains `recursive: true`, because native `cp` throws `ERR_FS_EISDIR` on a directory without it.
- Note: `ensureDirWritableAsync` stays on the wrapper as `vfs.ensureDirWritableAsync` - it has no native equivalent, and it is the call that creates a mod folder inside the game install and offers the elevation prompt when that folder is not writable. `vfs.unlinkAsync` is kept for the same reason where it appears. Everything else loses the wrapper's retry-and-elevate handling, which upstream deprecated deliberately; reach for `vfs.forcePerm` if a migrated write turns out to need it.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-19]

- Fixed: downloadPatch steam-skip error notification said "SDK Patch" (copied from the Veilguard extension); now uses `${PATCH_NAME}` (DatapathFix Plugin). Note: the check itself remains inert since GAME_VERSION is never set by the template.

## [2026-07-01]

- Changelog tracking started for this template.
