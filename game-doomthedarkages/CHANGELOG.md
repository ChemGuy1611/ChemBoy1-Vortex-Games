# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [0.4.4] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.4.3] - 2026-08-01

- Fixed: Made 3rd digit in Atlan Mod Loader version pattern optional to support inconsistent versioning.

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
