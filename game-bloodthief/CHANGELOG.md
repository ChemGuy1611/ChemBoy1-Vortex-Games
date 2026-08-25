# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [1.0.0] - 2026-08-22

- Fixed: Installing the mod loader no longer copies about 2600 unrelated files into the game folder. Only the loader itself is installed
- Added: Map mods are now recognised and installed to the game's `maps` folder
- Added: The mod loader is now checked for updates. When a newer release is available you are offered the update instead of having to reinstall it by hand
- Fixed: Mods that keep their scripts in a subfolder are now installed with the correct folder layout instead of losing everything above that subfolder
- Added: An archive that matches no known mod layout is now installed unchanged and reported, instead of being unpacked loose into the mods folder
- Fixed: The game and its launch tools no longer start with an empty launch argument
- Removed: Support for the game's demo, which cannot use the mod loader

## [0.2.1] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.2.0] - 2026-06-24

- Improved: Refactored downloader.js GitHub downloader/updater for Vortex v2.0+ and more reliable operation.

## [0.1.0] - 2025-11-05

- Inital Release
