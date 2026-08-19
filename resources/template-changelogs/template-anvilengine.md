# template-anvilengine Changelog

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
