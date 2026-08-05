# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [0.4.1] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: One requirement failing to download no longer stops the remaining requirements from installing
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.4.0] - 2026-08-04

- Added: Notification when a new version of OpenHotfixLoader or the Python SDK is released
- Changed: OpenHotfixLoader and the Python SDK are now downloaded from the latest GitHub release instead of a fixed link

## [0.3.0] - 2026-08-03

- Fixed: Mod installers no longer match folder entries by mistake.
- Fixed: Paths are now built safely on all systems.
- Added: Buttons to open the game's PCGamingWiki page and submit a bug report.
- Changed: Extension is smaller and loads faster.

## [0.2.1] - 2025-09-29

- Added the user id folder (Steam ID) to the save folder path.
- Added fallback installer to the Binaries folder (used after all other installer checks fail).

## [0.2.0] - 2025-09-21

- Converted from BL3 Hotfix Merger to Open Hotfix Loader (no need for running exe or using WebUI!).
- Added Python SDK support and auto-download (enables modding and loads plugins).
- Added installers for SDK mods (.py and .sdkmod files).
- Removed Plugin Loader as it is no longer needed with SDK.
- Fixed pathfinding for config and save folders.
- Added ignoreConflicts list for common files (i.e. LICENSE.txt, instructions.txt, readme.txt, etc.).
- Added tool for BL3 Save Editor.

## [0.1.0] - 2025-09-19

- Initial release.
