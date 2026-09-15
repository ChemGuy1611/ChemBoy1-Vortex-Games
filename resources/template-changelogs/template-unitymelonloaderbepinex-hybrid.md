# template-unitymelonloaderbepinex-hybrid Changelog

## [2026-09-14] (3)

- Fixed: `allowMelPrefMan` default reverted to `false`. MelonPreferencesManager itself throws errors in-game once MelonLoader loads it - not a download or install failure, the managed-mod mechanism is unaffected - so it is no longer offered by default until that is fixed.

## [2026-09-14] (2)

- Fixed: `BEP_BE_VER`/`BEP_BE_COMMIT` fallback bumped from build 785/`6abdba4` (2026-08-05) to the current builds.bepinex.dev newest build 788/`5b766a3` (2026-09-01). Propagated to every game carrying the constant except `mywintercar`, which keeps its hardcoded loader URLs frozen by the 2026-09-14 decision to drop it from the downloader-migration plan.

## [2026-09-14]

- Fixed: the seven MelonLoader mod types (`MELON_MOD_ID`, `MELON_MODS_ID`, `MELON_PLUGINS_ID`, `MELON_CONFIG_ID`, `MELON_USERLIB_ID`, `MELONPREFMAN_ID`, `MELON_ID`) were still registered via `context.registerModType` on an XNA game, even though the matching `MELON_ID` installer and `MODTYPE_FOLDERS` were already gated on `!isXna`. They now live in an `if (!isXna) { spec.modTypes.push(...) }` block after the `spec` object instead of sitting unconditionally in the `modTypes` array literal, matching the `spec.modTypes.push()` pattern used elsewhere in the codebase for optional mod types.

## [2026-09-12]

- Added an "Open SteamDB Page" button next to "Open PCGamingWiki Page", opening the game's `https://steamdb.info/app/<STEAMAPP_ID>/` page.

## [2026-09-11]

- Fixed: installers scoped their file list to the mod root with `file.indexOf(rootPath) !== -1`, a substring test that silently dropped every extension-less file. `path.dirname()` returns `"."` when the mod file sits at the archive root, which collapses the test to "the path contains a dot", so asset bundles and other extension-less payloads never reached the staging folder; the same test also matched sibling folders that happen to share a name prefix. Each installer now derives `const rootPrefix = rootPath === "." ? "" : rootPath + path.sep;` and filters with `file.startsWith(rootPrefix)`.
- Fixed: `installRoot` had its scoping filter removed entirely as a workaround for that bug, so it copied every file in the archive - including anything sitting outside the mod root - and only dropped directory entries. It now scopes to `rootPrefix` like the other installers, which keeps the extension-less files the workaround was protecting.

## [2026-09-08]

- Changed: retired the `fs-extra` dependency. The two `fsExtra.unlinkSync` calls that remove a stale deploy-file marker are now `fs.unlinkSync` (identical behaviour — `fs-extra` re-exports node's own), and `const fsExtra = require("fs-extra")` is gone. `fs-extra` is a Vortex-bundled module, not something an extension should import.
- Changed: MelonPreferencesManager installs as a managed mod instead of a loose file copied into the MelonLoader `Mods` folder. `MELONPREFMAN_REQUIREMENTS` uses `directCopyAsMod` with `MELONPREFMAN_ID`, so it gets a mod-list row with its version, an enable/disable toggle, ordinary conflict handling and a working Remove. `resolveVersion` moves to `resolveVersionByModVersion`. On the first update check after this change, a pre-existing loose `Mods\melonprefmanager.<build>.dll` and its `.version.json` marker are removed once and replaced by the managed copy - `directCopyPath` is kept, demoted to that legacy pointer, and `setup()` still reassigns it. A MelonPreferencesManager the user installed by hand as an archived mod is left untouched.
- Removed: the "Remove MelonPreferencesManager" toolbar button and `removeMelonPrefMan`. A managed mod has Vortex's own Remove; the hand-unlink deleted a deployed link and left the staging file to redeploy on the next deployment.
- Removed: `directCopyModType` from the requirement and `resolveVersionByDirectCopyMarker` from the module import. In managed-mod mode a mod of the requirement's own type would count as proof the file exists, so a hand-deleted loader would never be re-fetched; and there is no sidecar marker file to read a version from.
- Changed: `installPlugin` wraps a loose plugin in its own folder. A BepInEx plugin or patcher, or a MelonLoader Mod or Plugin, that arrives without a `plugins`/`patchers`/`mods` folder of its own is installed into a per-mod folder named after the plugin's subfolder in the archive, or after the DLL when it sits at the archive root. Two mods that each ship a `README.md`, an `icon.png` or a same-named dependency DLL no longer overwrite each other in the loader folder. An archive that already carries its loader folder is installed exactly as before. Both loaders read nested and flat alike.
- Added: a wrapped MelonLoader mod gets a generated `manifest.json` in its folder (`generatefile`), because MelonLoader silently skips a `Mods`/`Plugins` subfolder that has no manifest. An archive that already ships its own manifest keeps it. BepInEx wrappers get no manifest - nothing reads one there.
- Changed: the MelonPreferencesManager download prompt's "More" dialog no longer says the file is copied straight to the Mods folder rather than installed as a mod.

## [2026-09-06]

- Changed: migrated off the deprecated `vortex-api` `fs` wrapper onto native node `fs`. `fs` now means node's own module (`const fs = require("fs")`, plus `const fsp = fs.promises` for the async calls), and the vortex-api wrapper is still imported alongside it as `vfs`. Call sites move across 1:1 - `fs.statAsync` becomes `fsp.stat`, `fs.readdirAsync` becomes `fsp.readdir`, `fs.readFileAsync`/`fs.writeFileAsync` become `fsp.readFile`/`fsp.writeFile`, `fs.renameAsync` becomes `fsp.rename` - while the two that need options change shape: `fs.ensureDirSync(p)` becomes `fs.mkdirSync(p, { recursive: true })` and `fs.removeAsync(p)` becomes `fsp.rm(p, { recursive: true, force: true })`. `fs.copyAsync` becomes `fsp.cp` and always gains `recursive: true`, because native `cp` throws `ERR_FS_EISDIR` on a directory without it.
- Note: `ensureDirWritableAsync` stays on the wrapper as `vfs.ensureDirWritableAsync` - it has no native equivalent, and it is the call that creates a mod folder inside the game install and offers the elevation prompt when that folder is not writable. `vfs.unlinkAsync` is kept for the same reason where it appears. Everything else loses the wrapper's retry-and-elevate handling, which upstream deprecated deliberately; reach for `vfs.forcePerm` if a migrated write turns out to need it.
- Changed: the bundled `downloader.js` carries the same migration and stays byte-identical to `resources/downloader/downloader.js`.

## [2026-08-29]

- Added: `isXna` now gates every Unity-only path instead of only flipping three values. With `isXna` false nothing changes. With it true: MelonLoader's installer, its mod-type folders and its three toolbar buttons are not registered; the ASSETS mod type and installer are skipped, since `.assets`/`.resource`/`.ress` are Unity container formats; `ASSEMBLY_PATH`/`ASSEMBLY_FILES` point at the managed dll beside the executable rather than at a `Managed` folder; `BEPINEX_DLL_FILE` becomes `d3d11.dll`, because a .NET game has no Unity player to intercept and a game-specific fork hooks a DLL the game itself loads; the BepInEx 5 `BepInEx.dll` rename is skipped, since such a fork is BepInEx 6; the "Download Latest BepInEx BE" button is not registered, as no Bleeding Edge build applies; `getRequirements()` returns nothing, because a loader published on the game's own mod page has no release feed to check; and `downloadBepinex()` routes to the Nexus helper when a page is configured.
- Fixed: `MODTYPE_FOLDERS` no longer lists MelonLoader's folders on an XNA game, and `setup()` no longer adds `ASSEMBLY_PATH`/`ASSETS_PATH` to it there. That list is passed to `ensureDirWritable`, which creates each entry, so folders belonging to a loader the game cannot run were being created inside the game install on every launch.
- Fixed: the three Nexus download helpers sorted candidate files by `Number.parseInt(file.uploaded_time, 10)`, but that field is an ISO 8601 string, so every sort key evaluated to the year and the sort did nothing. They now use `uploaded_timestamp`, which is the numeric field.
- Added: `BEPINEX_NEXUS_PATTERN`, `MELON_NEXUS_PATTERN` and `CUSTOMLOADER_NEXUS_PATTERN`, all null by default. A loader page that publishes more than one main file - a Linux build, an installer, a server package - cannot be resolved by "newest main file" alone; setting a pattern selects the right archive by name.
- Changed: `allowBepCfgMan`, `allowMelPrefMan` and `allowMelonNexus` are now `let` and are forced off for an XNA game, since both in-game config editors ship Unity-only builds and MelonLoader has no build that can load such a game. The "Download BepInExConfigManager" button follows `allowBepCfgMan` rather than always being registered.
- Changed: the "Open Save Folder", "Open PCGamingWiki Page" and "Submit Bug Report" buttons are only registered once their placeholder has been filled in, rather than being offered with an `XXX` value behind them.
- Changed: an XNA game now resolves its loader from the Bleeding Edge builds. BepInEx 6 is the only line that ships `NET.Framework` and `NET.CoreCLR` builds, and 6.x has never had a stable release, so the 5.x GitHub releases - which are Unity Mono only - can never serve such a game. The `isXna` block pins `BEPINEX_BUILD` to `il2cpp`, which is this template's name for the Bleeding Edge route rather than a statement about the game's engine, and the comment says so.
- Added: `BEPINEX_BE_ARTIFACT` names which Bleeding Edge artifact a game takes, with the available runtimes listed beside it, and both the match pattern and the fallback URL are derived from it. A Unity game keeps `BepInEx-Unity.IL2CPP-win-<arch>`; an XNA game gets `BepInEx-NET.Framework-net452-win-x86` as a starting point and is told to change it to the target framework the game builds against.
- Added: `bepinexFromNexus` and `melonFromNexus`, replacing four copies of the same inline test. A loader served from the game's own Nexus page is a game-specific fork with no upstream feed, so it - not the engine - is what decides whether there is a release to resolve, a version to check, or a Bleeding Edge button to offer.

## [2026-08-28]

- Fixed: `downloader.js` searches Vortex's downloads for the game being managed only. Vortex keeps one flat list of downloads across every managed game, so a requirement whose archive has a common name - `Release.zip` is used by more than a dozen extensions - could match an archive downloaded for a different game and install it in place of the real requirement. The version check read the same list and could likewise report a version taken from another game's archive.

## [2026-08-21]

- Changed: `context.once()` now calls through the local `api` constant declared at the top of the block instead of repeating `context.api` on each call.

## [2026-08-17]

- Changed: the BepInEx mono requirement tracks its release version instead of the GitHub asset upload time. `trackByAssetDate` is gone and `resolveVersion` now uses `resolveVersionByModVersion`, so the mod list shows `5.4.23-5` rather than a timestamp. This is possible because `downloader.js` maps a fourth version segment onto a prerelease identifier — the reason the requirement was on asset-date is fixed at the module level. Asset selection is unchanged; the version comes from the release tag. An install made under the old behaviour reports one update, which the update re-stamps.

## [2026-08-11]

- Added: MelonLoader nightly builds are version-checked like every other requirement. `MELON_NIGHTLY_REQUIREMENTS` uses the new nightly mode in `downloader.js`, which reads the newest successful `alpha-development` CI run from the GitHub Actions API and compares builds by run number. `useMelonNightly` now selects between the two requirement arrays; the stable-release path is unchanged while the toggle is off.
- Added: a "Remove MelonPreferencesManager" toolbar button, beside the existing download button and gated on `allowMelPrefMan` the same way. MelonPreferencesManager is direct-copied rather than installed as a mod, so it has no mod-list row and no Remove button; this deletes the `.dll` and its `.version.json` marker together. A file that is already gone is not treated as an error.
- Changed: nightly builds install through `downloader.js` and so now show "MelonLoader" in the mod list instead of `MelonLoader.Windows.x64.CI.Release.zip`.
- Removed: `downloadMelonNightly` and `MELON_URL_ERR`. The module handles the nightly path now, so the hand-rolled download and its fallback error page are gone. `MELON_URL_NIGHTLY` is kept as the requirement's `nightlyUrl`.

## [2026-08-10]

- Added: `downloader.js` and `bepinexbe_downloader.js` are now bundled with the template, and every mod-loader requirement is version-checked instead of being fetched from a hardcoded URL. MelonLoader, BepInEx mono and BepInExConfigManager are `downloader.js` requirements; MelonPreferencesManager uses its direct-copy mode because the release is a naked `.dll`; IL2CPP BepInEx resolves the newest Bleeding Edge build from `builds.bepinex.dev`. `BEP_BE_VER`/`BEP_BE_COMMIT` are now only the fallback used when that index page is unreachable.
- Added: `getRequirements(api)` returns the requirements belonging to the loader that is currently installed, and never both loaders at once. `getBepinexBeRequirements(api)` does the same for the Bleeding Edge requirement, which the separate module owns. A `check-mods-version` handler in `context.once()` runs both.
- Added: `setup()` reassigns `MELONPREFMAN_REQUIREMENTS[0].directCopyPath` after `GAME_PATH` is known. The array is built at module load, when `GAME_PATH` is still empty, so without this the destination path never resolves.
- Changed: `downloadBepinex`, `downloadMelon`, `downloadBepCfgMan` and `downloadMelonPrefMan` now delegate to the modules. The function names are unchanged, so `chooseModLoader`, `deconflictModLoaders`, the notification actions and the toolbar buttons all still work. Requirements installed this way show their readable name in the mod list instead of the archive file name.
- Changed: the MelonLoader nightly build moved into its own `downloadMelonNightly` function. `useMelonNightly` still selects it, unchanged — nightly builds are CI artifacts rather than GitHub releases, so the module cannot reach them.
- Changed: the "Download BepInExConfigManager" and "Download Latest BepInEx BE" toolbar buttons install directly instead of opening a browser and asking the user to pick the right file. Both now resolve the newest release themselves, so the "(Browse)" step and the wrong-file rejection it needed are gone. "Download MelonPreferencesManager" and "Download Latest MelonLoader" already install directly.
- Changed: `BEPCFGMAN_VARIANT` replaces the paired `if (BEPINEX_BUILD === 'mono')` reassignments for the ConfigurationManager archive name.
- Removed: `downloadBepinexManual` and `downloadBepCfgManManual`, the two browse-for-download functions the buttons above used to call.
- Removed: `BEPINEX_ZIP`, `MELON_URL`, `BEPCFGMAN_URL_DIRECT`, `MELONPREFMAN_URL`, `MELONPREFMAN_URL_ERR`, `BEPINEX_URL_ERR`, `BEPINEX_ARCHIVE_NAME`, `BEPCFGMAN_URL_MAIN` and `BEPCFGMAN_URL_ERR`, all superseded by the requirement definitions or orphaned with the browse functions. `BEPINEX_URL` is kept as the Bleeding Edge fallback URL.
- Changed: `hasXbox` is now derived from the active discovery IDs. It is declared with `let` and initialised to `false`, followed by `if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;`, so adding the Xbox app ID to `DISCOVERY_IDS_ACTIVE` is enough to switch on the Xbox version logic. Setting the initialiser to `true` still forces it on for games that need it without an Xbox ID in the list.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-01]

- Changelog tracking started for this template.
