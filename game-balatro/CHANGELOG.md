# Changelog

## Planned Improvements (Not Yet Released)

- Xbox support - waiting on stable (and easy to install) mod injector for Xbox version

## [0.4.0] - 2026-09-20

- Added: "Browse Thunderstore" page, which opens the Balatro Thunderstore site inside Vortex. Downloads started from it are installed, enabled, and named automatically, and any mods they depend on can be installed with them.
- Added: Update notifications for mods installed from the Thunderstore page.
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.

## [0.3.4] - 2026-09-08

- Fixed: A required mod loader or tool is no longer mistaken for an unrelated Nexus mod that shares the same file, which could show the wrong mod details or offer a bogus update for it
- Fixed: Downloads fetched for a required mod loader or tool now show "Website" as their source instead of being left blank

## [0.3.3] - 2026-09-02

- Fixed: A required mod loader or tool is no longer matched against downloads belonging to other games, which could report the wrong installed version or check for updates against the wrong file

## [0.3.2] - 2026-08-11

- Added Epic Games Store support

## [0.3.1] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.3.0] - 2026-07-19

- Added: Lovely-Injector is now auto-downloaded and installed from GitHub on setup via the shared downloader module (if not already present).
- Added: Automatic "update available" notification when a newer Lovely-Injector release is published on GitHub.
- Improved: Lovely-Injector version is now stamped on the mod entry and read back for update checks, so the installed version is tracked correctly against the latest GitHub release.

## [0.2.0] - 2026-02-24

- Added: A Mod installer to better handle poorly-packaged mods
- Added: Button to download latest Malverk from GitHub (Texture Pack Manager - folder icon in Mods toolbar)
- Fixed: Path Strings
- Added: Buttons to open several useful files/folders/URLs (folder icon in Mods toolbar)

## [0.1.2] - 2025-05-28

- Changed lovely-injector download URL to always get latest release
- Added a button to manually trigger the lovely-injector downloader (folder icon in Mods toolbar)

## [0.1.1] - 2025-05-28

- Changed required file to executable
- Made game launch through Steam
- Removed lovely-injector version check since it doesn't work properly
- Fixed SteamModded installer

## [0.1.0] - 2025-05-27

- Initial release
