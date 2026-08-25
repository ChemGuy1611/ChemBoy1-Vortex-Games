# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [0.3.3] - 2026-08-22

- Fixed: Updating a required mod loader or tool now disables every older copy of it, so an out-of-date version can no longer stay enabled alongside the new one

## [0.3.2] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: One requirement failing to download no longer stops the remaining requirements from installing
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.3.1] - 2026-07-18

- Changed: Requirement downloader now uses the native fetch API instead of a bundled axios copy (much smaller extension, same behavior on Vortex 2.0+)
- Added: Auto-downloaded requirements now record their version and a clickable Source link (GitHub repo page) in the mod details panel

## [0.3.0] - 2026-06-24

- Improved: Refactored downloader.js GitHub downloader/updater for Vortex v2.0+ and more reliable operation.

## [0.2.1] - 2026-03-11

- Fixed: Typo in DML updater.

## [0.2.0] - 2026-02-27

- Upgraded: To UZDoom! - Note that the folder name where everything is placed has changed from "DMLv2.5[WINDOWS]" to "DML". You may need to copy some files (config, save) over manually.
- Improved: DML is now checked for updates from GitHub automatically. Vortex will update you to v2.6 automatically.

## [0.1.5] - 2025-10-23

- Fixed update check for GZDoom not running on mod update check.

## [0.1.4] - 2025-07-16

- Fixed an error that could potentially occur if installing a version of GZDoom that had empty folders in the archive.

## [0.1.3] - 2025-06-28

- Updated DML Setup notification with some additional details.
- Added .iwad and .ipk3 extensions to game WAD installer.

## [0.1.2] - 2025-06-05

- Added additional known IWADs to IWAD installer list.
- Corrected extension name in info.json file.

## [0.1.1] - 2025-06-01

- Added buttons for opening GZDoom Saves, GZDoom Config, gzdoom.ini, and Vortex Downloads folders (folder icon on Mods toolbar)

## [0.1.0] - 2025-05-29

- Initial release
