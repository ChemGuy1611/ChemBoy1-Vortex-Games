# template-unitymelonloaderbepinex-hybrid Changelog

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
