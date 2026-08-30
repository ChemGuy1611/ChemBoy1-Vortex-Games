# template-godot Changelog

## [2026-08-28]

- Fixed: `downloader.js` searches Vortex's downloads for the game being managed only. Vortex keeps one flat list of downloads across every managed game, so a requirement whose archive has a common name - `Release.zip` is used by more than a dozen extensions - could match an archive downloaded for a different game and install it in place of the real requirement. The version check read the same list and could likewise report a version taken from another game's archive.

## [2026-08-22]

- Fixed: `keepZips` is now forced on whenever `customLoader` is off. Stock Godot Mod Loader resolves `mods/` off the executable folder but `mods-unpacked` off `res://`, and a `res://` directory listing never falls back to disk, so an unpacked mods folder is invisible to it. The two toggles cannot be set independently, and a game scaffolded on the previous defaults deployed mods the stock loader could not see.
- Fixed: the Godot 3 loader route. The published asset is named `godot-mod-loader_v6.3.0_self-setup.zip` with a leading `v`, which both the archive name and the match pattern omitted. The pattern now accepts either spelling, and the requirement is pinned to `6.3.0` / tag `v6.3.0` for Godot 3, because the loader ships both engine lines from one release stream and `/releases/latest` is always the Godot 4 release.
- Fixed: the mod installer anchored the install folder on the first `.gd` file in the archive, so a mod whose nested script enumerated first was installed with that subfolder as its root and everything above it was dropped. It now keys on `mod_main.gd` or `manifest.json`, preferring the shallowest match, and falls back to the previous behaviour only when a mod carries neither.
- Fixed: installing the mod loader no longer copies build caches, version control metadata, or stray virtual environments into the game folder. Excluded folder names are listed in `LOADER_EXCLUDE_FOLDERS`.
- Fixed: the game and its launch tools no longer start with an empty launch argument when no parameters are configured.
- Added: a `useOverrideCfg` toggle that appends `--setup-create-override-cfg` to the launch parameters. The default setup path renames the game's `.pck` and swaps in a patched copy, which store validation reverts; the override path leaves the `.pck` alone and is the only setup method available off Windows.
- Added: a "Run Mod Loader Setup" tool that runs the loader's setup headlessly with `--only-setup`, so first-run setup is a deliberate action instead of an alert and forced restart on first launch. Registered only when `customLoader` is off.
- Added: a commented scaffold for a second content folder, modelled on a loader fork that installs levels to `<game>/maps/<Name>/`, plus commented `--exe-name` / `--pck-name` parameters for builds whose pack name does not match the executable name.
- Changed: `MODTYPE_FOLDERS` is deduplicated, since `MOD_PATH` is itself `mods` whenever `keepZips` is on.

## [2026-08-21]

- Changed: `context.once()` now calls through the local `api` constant declared at the top of the block instead of repeating `context.api` on each call.

## [2026-08-10]

- Changed: `hasXbox` is now derived from the active discovery IDs. It is declared with `let` and initialised to `false`, followed by `if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;`, so adding the Xbox app ID to `DISCOVERY_IDS_ACTIVE` is enough to switch on the Xbox version logic. Setting the initialiser to `true` still forces it on for games that need it without an Xbox ID in the list.

## [2026-08-05]

- Added: `downloader.js` installs a missing requirement when the update check runs, instead of reporting an update for something that is not installed. A new `autoInstall: false` requirement field opts out, for requirements that should only be installed by an explicit user action.
- Fixed: `downloader.js` disables the version a requirement update replaces before installing the new one, so the two cannot deploy on top of each other.
- Fixed: `downloader.js` updated to the audited canonical version. Requirement detection is now scoped to the requirement's own mod type instead of also matching untyped mods, and the module assigns that mod type itself on install. A missing or renamed release asset is now reported instead of failing silently, one failing requirement no longer cancels the rest of the array, downloads are streamed rather than buffered in memory, and repeat presses of a download action are ignored while one is already running.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-01]

- Changelog tracking started for this template.
