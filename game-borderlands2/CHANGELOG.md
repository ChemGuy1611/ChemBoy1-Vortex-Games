# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [0.4.2] - 2026-08-22

- Fixed: Updating a required mod loader or tool now disables every older copy of it, so an out-of-date version can no longer stay enabled alongside the new one

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

- Added: Notification when a new version of OpenBLCMM or the Python SDK is released
- Changed: OpenBLCMM and the Python SDK are now downloaded from the latest GitHub release instead of a fixed link, so OpenBLCMM is no longer locked to version 1.4.1

## [0.3.5] - 2025-11-16

- Further improvements to TFC mod installer.
- Add installer for .dll files to the "Binaries" folder.
- Added installer for files and folder in to the "CookedPCConsole" folder.
- Improved root folder and subfolder installer.

## [0.3.4] - 2025-11-12

- Improved TFC mod installer to better handle different packaging methods.

## [0.3.3] - 2025-09-21

- Improved SDK mod installer to support both .py and .sdkmod files.

## [0.3.2] - 2025-09-20

- Added automatic install of Python SDK (enables modding).
- Clarified in OpenBLCMM notifications that .blcm files are in the Binaries folder, while .txt mods are in root.
- Changed OpenBLCMM tool to make it non-exclusive.

## [0.3.1] - 2025-09-20

- Added tool for Gibbed's Save Editor.
- Added ignoreConflicts list for common files (i.e. LICENSE.txt, instructions.txt, readme.txt, etc.).
- Improved deploy notification to cover both BLCMM and TFC.

## [0.3.0] - 2025-09-19

- Added support and auto-download for OpenBLCMM.

## [0.2.0] - 2025-09-19

- Added SDK mod support.
- Added support for .blcm file mods.
- Added installer for movies (.bik files).

## [0.1.0] - 2025-09-17

- Initial release.
