# template-anvilengine Changelog

## [2026-09-22]

- Added: `autoDownloadReforger` toggle (default `true`). `hasReforger` alone gated both the tool's registration AND its setup-time auto-fetch together; some games (valhalla) support both ReForger and legacy Forger Patch Manager and only want the legacy one auto-installed. `false` keeps the tool entry, registry lookup and "Download ReForger" button working, it just skips the unattended fetch during `setup()`.
- Fixed: ReForger's registry lookup assumed an MSIX/Windows Store package (`AppModel\Repository\Packages\<GUID>_<version>_x64__<publisher>`, `PackageRootFolder` value). It is actually a regular application install that self-registers a similarly-shaped key (`AppModel\PackageRepository\Packages\...`, `Path` value) whose NAME embeds the exact installed version — a hardcoded key silently broke on every ReForger update. `getReforgerPath()` now enumerates the parent key's subkeys (`winapi.WithRegOpen` + `RegEnumKeys`) and matches on the stable prefix/suffix around the version segment instead, so it never needs a manual bump again.
- Changed: `downloadReforger()` no longer skips `download()` when the registry says ReForger already looks installed — a non-forced call is always safe (it only raises an "update available" notification, never overwrites on its own), and skipping it silenced that notification forever after the first successful install. It now only actually RUNS the fetched installer when the deployed mod's version changed (a first-ever install counts), instead of either always running it (noisy, re-launches on every activation) or gating the run the same way as the fetch (would miss real updates).

## [2026-09-21]

- Changed: the comments on `autoCopyResorepDll` and `resorepDllCopy` said the DLL copy goes to the mod's staging folder, which is what the ResoRep package's own `.bat` does, while the code copies it into the game folder. The game folder is the intended target — the copy is live immediately, at the cost of not being a managed mod file — and the comments now say so, including that purging does not remove it.
- Added: the post-deployment notification now names the DLC-folder example (`dlc_NN/Extracted/...`) when `hasDlcFolders` is enabled, alongside the existing root example. Found while porting `ghostreconbreakpoint` (W2 pilot) — its pre-template rename dialog spelled out both patterns by hand and the template version had dropped the DLC one.
- Changed: the ReForger installer download mechanism now goes through the shared `downloader.js` module (added to this template) instead of a hand-rolled fetch. `ReForgerInstaller.exe` is a naked (non-archive) GitHub release asset, so it is wired as a `directCopyAsMod` requirement — a new `REFORGER_INSTALL_ID` synthetic mod type deploys it to `{gamePath}`, and `downloadReforger()` runs it from its deployed path after an explicit deploy. This adds real version tracking the old mechanism never had. `REFORGER_RELEASES_URL` removed (orphaned by the rewrite).

## [2026-09-20]

- Fixed: `resorepSettingsWrite` passed an error handler as the third argument to `fsp.writeFile`. `fs.promises` takes options there, not a callback, and silently discards a function, so the handler was dead code and a failed `dllsettings.ini` write rejected out of `setup` with no notification shown. The write is now wrapped in `try`/`catch` and reports through `showErrorNotification` as intended.
- Fixed: `testForger` was the only installer test without a FOMOD guard, so a FOMOD archive containing `forger.exe` was claimed at priority 26 instead of reaching the FOMOD installer. It now returns unsupported when `fomod/ModuleConfig.xml` is present, matching every other test in the file.
- Changed: `autoCopyResorepDll` now performs the direct DLL copy only. It previously also ran the ResoRep `.bat` afterwards, which could never do anything — both paths write the same `ori_d3d11.dll` and both skip when it already exists, so the script call was always a no-op. `resorepScriptCheck` and `RESOREP_SCRIPT_FILE` are removed; the toggle's two states are now simply "the extension copies the DLL" or "the user runs the bundled `.bat`".
- Added: a startup error is logged when `hasDlcFolders` and `DLC_FOLDERS` disagree in either direction. The DLC mod type and installer follow the toggle, while `.forge` routing and the `dlc_NN\Extracted` folders follow `DLC_FOLDERS` directly, so setting only one of the two produced half the feature with no warning.
- Added: `reforger.png` and `vulkan.png`, referenced by the ReForger and Vulkan launcher tool entries but previously missing from the template, so a scaffolded extension enabling `hasReforger` or `hasCustomLaunchers` had a broken tool icon.
- Fixed: the `hasDlcFolders` comment still described per-DLC `.forge` mod types, which were replaced by destination-path routing.

## [2026-09-12]

- Fixed: installers scoped their file list to the mod root with `file.indexOf(rootPath) !== -1`, a substring test that silently dropped every extension-less file. `path.dirname()` returns `"."` when the mod file sits at the archive root, which collapses the test to "the path contains a dot", so extension-less payloads never reached the staging folder; the same test also matched sibling folders that happen to share a name prefix. All 14 installers now derive `const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;` and filter with `file.startsWith(rootPrefix)`.
- Added an "Open SteamDB Page" button next to "Open PCGamingWiki Page", opening the game's `https://steamdb.info/app/<STEAMAPP_ID>/` page.

## [2026-09-06]

- Changed: migrated off the deprecated `vortex-api` `fs` wrapper onto native node `fs`. `fs` now means node's own module (`const fs = require("fs")`, plus `const fsp = fs.promises` for the async calls), and the vortex-api wrapper is still imported alongside it as `vfs`. Call sites move across 1:1 - `fs.statAsync` becomes `fsp.stat`, `fs.readdirAsync` becomes `fsp.readdir`, `fs.readFileAsync`/`fs.writeFileAsync` become `fsp.readFile`/`fsp.writeFile`, `fs.renameAsync` becomes `fsp.rename` - while the two that need options change shape: `fs.ensureDirSync(p)` becomes `fs.mkdirSync(p, { recursive: true })` and `fs.removeAsync(p)` becomes `fsp.rm(p, { recursive: true, force: true })`. `fs.copyAsync` becomes `fsp.cp` and always gains `recursive: true`, because native `cp` throws `ERR_FS_EISDIR` on a directory without it.
- Note: `ensureDirWritableAsync` stays on the wrapper as `vfs.ensureDirWritableAsync` - it has no native equivalent, and it is the call that creates a mod folder inside the game install and offers the elevation prompt when that folder is not writable. `vfs.unlinkAsync` is kept for the same reason where it appears. Everything else loses the wrapper's retry-and-elevate handling, which upstream deprecated deliberately; reach for `vfs.forcePerm` if a migrated write turns out to need it.

## [2026-08-17]

- Added: an EDIT ZONE block at the top of `index.js` holding every per-game setting, in the style of `template-ue4-5`.
- Added: 11 feature toggles, each gating a feature previously found only in individual Anvil extensions — `hasDlcFolders`, `hasResorep`, `autoCopyResorepDll`, `hasPatchTextures`, `hasSound`, `hasFixes`, `hasBinariesType`, `hasReforger`, `hasCustomLaunchers`, `hasSettingsIni`, `deployNotification`.
- Added: DLC folder support. Setting `DLC_FOLDERS` adds the DLC folder mod type and routes `.forge` files into the right DLC folder by matching a `_NN_dlc` segment in the file name. Routing is done per file through the install destination, so a single archive can carry `.forge` files for several DLCs and each one lands in its own folder. Adding a folder to the list is the whole change; there are no per-DLC file lists or mod types to maintain.
- Added: ResoRep support — DLL mod type and installer, auto-download of the bitness-matched Vortex file variant, `dllsettings.ini` written by the extension, and a textures mod type targeting `ResoRep\modded` inside the game folder. `BITS` selects the download, the system DLL source folder and the hook suffix together. Deploying textures inside the game folder keeps them on the same drive as the staging folder, so Vortex can hardlink them.
- Added: `LEGACY_MODTYPES`, a list of retired mod types that stay registered without any installer routing to them, so mods a user installed under an older version keep deploying and purging correctly instead of being stranded.
- Added: mod types and installers for `.pck` sound banks, community fixes packages, loose `.dds` Forger patch textures, and a separate binaries mod type.
- Added: ReForger tool support, located through the registry because it installs as an Xbox package.
- Added: automatic ReForger download. The latest `ReForgerInstaller.exe` is fetched from the ReForger GitHub releases and launched for you, both during game setup and from a "Download ReForger" toolbar button. ReForger ships as an MSIX package rather than loose files, so it is installed by its own installer instead of being managed as a mod; the extension skips the download when ReForger is already installed.
- Added: optional Ubisoft Plus and Vulkan launcher entries, and an "Open Settings INI" toolbar button.
- Changed: installer priorities re-laid across the 25-49 range in a single ladder, with slot 31 left free for game-specific installers.
- Changed: the post-deployment notification is now gated behind `deployNotification` and builds its text and buttons from whichever tools are enabled.
- Changed: Epic and GOG support is derived from `DISCOVERY_IDS_ACTIVE` rather than set by hand, and fills in `epicAppId` / `gogAppId`.
- Added: a startup error is logged if `hasPatchTextures` and `hasResorep` are both enabled, since both claim `.dds` files.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.
- Added: a version marker `.txt` file (`1.0.0.txt`). This template previously shipped without one, so new extensions made from it had no version marker for `release_extension.py` to rename.

## [2026-07-01]

- Changelog tracking started for this template.
