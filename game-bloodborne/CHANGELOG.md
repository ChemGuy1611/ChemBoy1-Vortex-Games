# Changelog

## Planned Improvements (Not Yet Released)

- None

## [0.4.2] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: One requirement failing to download no longer stops the remaining requirements from installing
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.4.1] - 2026-07-18

- Changed: Requirement downloader now uses the native fetch API instead of a bundled axios copy (much smaller extension, same behavior on Vortex 2.0+)
- Added: Auto-downloaded requirements now record their version and a clickable Source link (GitHub repo page) in the mod details panel

## [0.4.0] - 2026-06-24

- Improved: Refactored downloader.js GitHub downloader/updater for Vortex v2.0+ and more reliable operation.

## [0.3.0] - 2026-02-16

- Fixed: Updated for shadPS4 v0.12.0 and newer with Qt Launcher as a separate download from the emulator core
- Added: Button to download shadPS4 Qt Launcher
- Fixed: File name for shadPS4 on GitHub

## [0.2.5] - 2025-10-24

- Vortex now passes launch parameters to start Bloodborne automatically using the launch button, and NOT when launching via the shadPS4 tool. This lets the user get to the shadPS4 main menu using the tool without automatically launching Bloodborne.

## [0.2.4] - 2025-10-23

- Fixed shadPS4 update check not running on mod update check.

## [0.2.3] - 2025-07-30

- Version bump to fix mod page.

## [0.2.2] - 2025-05-28

- Fixed profile test when checking for new versions of shadPS4

## [0.2.1] - 2025-03-31

- Fixed shadPS4 re-downloading on every Vortex launch due to file name case-sensitivity

## [0.2.0] - 2025-03-30

- Added download and update functionality for shadPS4 sot that the user will always get the latest verison when managing the game
