# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [0.3.1] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.3.0] - 2026-08-04

- Fixed: Python SDK download failed because the download link no longer existed
- Added: The correct Python SDK is now installed for the version of the game you have (standard or Game of the Year Enhanced)
- Added: Notification when a new version of the Python SDK is released
- Fixed: Game of the Year Enhanced was not detected, so its launch tool did not work

## [0.2.3] - 2025-11-16

- Further improvemnents to the TFC mod installer.
- Add installer for .dll files to the "Binaries" folder.
- Added installer for files and folder in to the "CookedPC" folder.
- Improved root folder and subfolder installer.

## [0.2.2] - 2025-11-12

- Improved TFC mod installer to better handle different packaging methods.

## [0.2.1] - 2025-09-23

- Added "-nostartupmovies" launch argument to all methods of launching the game - skips unskippable launch videos.

## [0.2.0] - 2025-09-21

- Autodownload of Python SDK (enables modding and plugin loading).
- Fixed pathfinding for config and save folders.
- Added ignoreConflicts list for common files (i.e. LICENSE.txt, instructions.txt, readme.txt, etc.).

## [0.1.1] - 2025-09-19

- Added installer for movies (.bik files).

## [0.1.0] - 2025-09-17

- Initial release.
