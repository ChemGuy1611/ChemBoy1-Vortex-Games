# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [0.4.2] - 2026-07-18

- Changed: Requirement downloader now uses the native fetch API instead of a bundled axios copy (much smaller extension, same behavior on Vortex 2.0+)
- Added: Auto-downloaded requirements now record their version and a clickable Source link (GitHub repo page) in the mod details panel

## [0.4.1] - 2026-07-16

- Fixed: Atlan Mod Loader updater now properly detects new versions.

## [0.4.0] - 2026-06-24

- Improved: Refactored downloader.js GitHub downloader/updater for Vortex v2.0+ and more reliable operation.

## [0.3.0] - 2026-03-11

- Improved: Mod installer performance by removing Bluebird Promises.
- Fixed: Mod Loader update check properly parses the version number (replacing "_" with ".").
- Added: Create "DisabledMods" folder to avoid popup on first launch of Atlan Mod Loader.
- Fixed: Strings in deployment notification.

## [0.2.1] - 2025-10-22

- Fixed game version detection for Xbox version (for real this time!).
- Fixed Steam Saves path.

## [0.2.0] - 2025-07-16

- Added support for Atlan Mod Loader! Note that only the Steam version is supported at this time.
- Automatic download and update of Atlan Mod Loader (Steam only).
- Added installers and tools for Atlan Resource Extractor and Valen.

## [0.1.3] - 2025-05-28

- Fixed game version detection for Xbox version

## [0.1.2] - 2025-05-24

- Added installer for .cfg files to "base" folder
- Added functions to write all user-installed .cfg files to the autoexec.cfg file
- Added "+exec autoexec.cfg" to all launch parameters
- Added button to open autoexec.cfg file (folder icon in Mods toolbar)

## [0.1.1] - 2025-05-19

- Changed executable to idTechLauncher.exe to ensure proper dll injection when launching the game.
- Added skip intro launch parameters for Steam (GamePass can use the Custom Launch tool).
- Fixed config and save folder open buttons (Steam Saves folder not accessible).

## [0.1.0] - 2025-05-14

- Initial release
