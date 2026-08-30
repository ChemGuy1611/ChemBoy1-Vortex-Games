# template-unitymelonloaderbepinex-hybrid Changelog

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
