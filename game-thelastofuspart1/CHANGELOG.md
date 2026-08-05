# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [2.2.2] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [2.2.1] - 2026-07-18

- Changed: Requirement downloader now uses the native fetch API instead of a bundled axios copy (much smaller extension, same behavior on Vortex 2.0+)
- Added: Auto-downloaded requirements now record their version and a clickable Source link (GitHub repo page) in the mod details panel

## [2.2.0] - 2026-06-24

- Improved: Refactored downloader.js GitHub downloader/updater for Vortex v2.0+ and more reliable operation.

## [2.1.1] - 2026-02-12

- Fixed: Crash on undefined "err" variable if file extraction process fails

## [2.1.0] - 2026-02-11

- Fixed: Several technical fixes and improvements

## [2.0.7] - 2026-01-19

- Fixed: More reliable folder deletion operations - revised deprecated fsPromises.rmdir function to fsPromises.rm

## [2.0.6] - 2025-11-04

- Improved .psarc extraction and cleanup functions to avoid errors and duplicate notifications.
- Fixed UnPSARC update check not running on mod update check.

## [2.0.5] - 2025-05-28

- Fixed profile test when checking for new versions of UnPSARC

## [2.0.4] - 2025-04-09

- Added a missing function.

## [2.0.3] - 2025-04-09

- Fixed reference error when sending an error notification if .psarc file extraction was not completed.
- Improved check for whether .psarc extraction was successful.
- Added check for extracted folders presence before sending notification to extract .psarc files.

## [2.0.2] - 2025-04-06

- Added a notification displayed while the .psarc extraction is running.
- Fixed a few typos.

## [2.0.1] - 2025-04-04

- Fixed a condition where both the backup and original .psarc files are present at the same time (i.e. after a game update).

## [2.0.0] - 2025-04-04

- Completely removed Fluffy Mod Manager. It was causing issues with mods and modding can be done without it.
- Fixed extraction path for bin.psarc to "bin" folder.
- Added functions to clean out extracted .psarc files to "reset" mods on purge.

## [1.5.2] - 2025-04-04

- Fixed .psarc extraction so files are not extracted into a subfolder.

## [1.5.1] - 2025-04-04

- Switched .psarc extraction tool to UnPSARC (<https://github.com/rm-NoobInCoding/UnPSARC>) since it runs much faster.

## [1.5.0] - 2025-04-04

- Added automatic download of U4.PSARC.Tool
- Added notification and functions to extract .psarc files (sp-common.psarc and bin.psarc) required for mods to work properly.
- Added button to run .psarc extraction - folder icon in Mods toolbar.

## [1.4.2] - 2025-04-02

- Fixed installer structure for Fluffy so that mods will be installed by Fluffy correctly.
- PLEASE REINSTALL YOUR MOD LIST!

## [1.4.1] - 2025-04-02

- Fixed the Save installer.

## [1.4.0] - 2025-04-02

- Corrected some issues in multiple mod installers
- Added notificaiton to run Fluffy Mod Manager after deployment
- Added mod types and installers for Saves and Configs
- Added buttons to open Config, Save, and Vortex Downloads folder, and to view the Changelog - folder icon in Mods toolbar.
