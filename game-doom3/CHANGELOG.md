# Changelog

## Planned Improvements (Not Yet Released)

- Config and save modtypes, installers, and open buttons.

## [0.5.3] - 2026-08-11

- Added Epic Games Store support for DOOM 3: BFG Edition
- Steam version now launches through Steam

## [0.5.2] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.5.1] - 2026-07-18

- Changed: Requirement downloader now uses the native fetch API instead of a bundled axios copy (much smaller extension, same behavior on Vortex 2.0+)
- Added: Auto-downloaded requirements now record their version and a clickable Source link (GitHub repo page) in the mod details panel

## [0.5.0] - 2026-06-24

- Improved: Refactored downloader.js GitHub downloader/updater for Vortex v2.0+ and more reliable operation.

## [0.4.1] - 2026-01-16

- Added: icon for Dhem3 launch tool
- Added: custom launch tool for classic executable

## [0.4.0] - 2025-11-14

- Integrated support for BFG Edition into a single extension.
- Technical fixes and improvements.

## [0.3.5] - 2025-05-30

- Added ignoreDeploy and ignoreConflict parameters for readme files.
- Added additional known mods to root installer.
- Fixed game version detection for all game variants.

## [0.3.4] - 2025-05-30

- Improved detection of mods to be installed to the root folder.
- Added Phobos mod to root installer.
- Fixed profileId check for Dhewm3 update check.
- Added notification for known mods that require manual file/folder manipulation.

## [0.3.3] - 2025-04-08

- Added missing modtype folder write checks (would cause deployment to be unavailable on BFG Edition).

## [0.3.2] - 2025-04-08

- Updated game image.

## [0.3.1] - 2025-04-08

- Removed Dhewm3 launch tool arguments related to resolution to avoid user confusion.

## [0.3.0] - 2025-04-07

- Added button to open Vortex Downloads folder and changelog - folder icon in Mods toolbar.
- Added a condition to prevent notification to install Dhewm3 if it is already installed.
- Changed Dhewm3 to an automated installer.
- Updated Dhewm3 default launch tool with standard startup parameters.
