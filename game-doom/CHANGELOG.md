# Changelog

## Planned Improvements (Not Yet Released)

- Config and save modtypes, installers, and open buttons.

## [0.6.2] - 2026-08-22

- Fixed: Updating a required mod loader or tool now disables every older copy of it, so an out-of-date version can no longer stay enabled alongside the new one

## [0.6.1] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: One requirement failing to download no longer stops the remaining requirements from installing
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.6.0] - 2026-08-03

- Fixed: DOOMModLoader is downloaded again - it now follows the current release files instead of a link that no longer exists.
- Added: DOOMModLoader and DOOMLauncher are included in "Check for Updates", with a notification when a new version is out.
- Fixed: Readme and changelog files inside mods no longer show up as file conflicts.
- Fixed: Paths are now built safely on all systems.
- Added: Buttons to open the game's PCGamingWiki page and submit a bug report.

## [0.5.1] - 2025-05-28

- Added GOG version support.

## [0.5.0] - 2025-04-07

- Added notification to run DOOMModLoader after deployment.
- Added button to open Vortex Downloads folder and changelog - folder icon in Mods toolbar.