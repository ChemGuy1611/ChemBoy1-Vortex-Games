# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [1.0.0] - 2026-08-23

- Added: "Browse ModWorkshop" page - browse the Road to Vostok section of ModWorkshop inside Vortex, and a download started from it installs, enables and names itself like any managed mod
- Added: A mod installed from the new page that lists other mods it needs offers to install them alongside it
- Added: Update check for mods installed from the new page, shown with the "Check for Updates" button on the Mods page
- Added: Ad slots are hidden on the browse page, and ad links no longer open in your web browser

## [0.3.1] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Fixed: The requirement download button now reports when the requirement is already up to date instead of appearing to do nothing
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.3.0] - 2026-08-04

- Added: Notification when a new version of Metro Mod Loader is released
- Added: Toolbar button to download the latest Metro Mod Loader
- Changed: Metro Mod Loader is now downloaded from ModWorkshop instead of Nexus Mods

## [0.2.0] - 2026-08-04

- Added: Notification when a new version of ModConfigurationMenu is released
- Changed: ModConfigurationMenu is now downloaded from the latest GitHub release instead of a fixed link
- Fixed: Fallback download of Metro Mod Loader installed an outdated version

## [0.1.2] - 2026-05-03

- Added: Archive handler for .vmz files (Vortex will recognize .vmz files as an archive)

## [0.1.1] - 2026-04-30

- Added: ModConfigurationMenu downloaded automatically from GitHub

## [0.1.0] - 2026-04-27

- Initial Release
