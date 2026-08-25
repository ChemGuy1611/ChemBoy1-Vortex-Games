# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [0.5.4] - 2026-08-22

- Fixed: Updating a required mod loader or tool now disables every older copy of it, so an out-of-date version can no longer stay enabled alongside the new one

## [0.5.3] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.5.2] - 2026-07-29

- Fixed: The load order could disappear after deploying while a mod update was in progress, and only came back after deploying a second time.
- Added: A message now appears if you change the load order while a mod update is still finishing, so it is clear the change was not applied and needs to be made again.
- Fixed: After a mod update finished, the load order page could keep showing out-of-date information until another deployment was run.

## [0.5.1] - 2026-07-25

- Fixed: Using "Update all" to update several mods at once could move them in the load order or uncheck them.

## [0.5.0] - 2026-07-22

- Fixed: Updating a mod could uncheck it or move it in the load order, especially on profiles other than the one you were using.

## [0.4.1] - 2026-07-18

- Changed: Requirement downloader now uses the native fetch API instead of a bundled axios copy (much smaller extension, same behavior on Vortex 2.0+)
- Added: Auto-downloaded requirements now record their version and a clickable Source link (GitHub repo page) in the mod details panel

## [0.4.0] - 2026-06-24

- Improved: Refactored downloader.js GitHub downloader/updater for Vortex v2.0+ and more reliable operation.

## [0.3.0] - 2026-04-22

- Improved: Load Order rendering using React - show mod image thumbnails
- Fixed: Properly assign mod attribute at install for Load Order

## [0.2.1] - 2026-02-16

- Fixed: A typo and a few small technical issues

## [0.2.0] - 2026-02-13

- Fixed: Files without extensions dropping from plugin installer - missing checksum file when ToyBox installed
- Fixed: Game version detection unified for all versions using Version.info file
- Fixed: Vortex marker file deleted from ToyBox Localization folder on deploy - avoid causing an exception

## [0.1.2] - 2026-01-21

- Fixed: UMM plugin mod installer could use wrong plugin name for folder (i.e. "0Harmony")

## [0.1.1] - 2026-01-16

- Fixed: Owlcat mod installer removing "Bundles" folder and files as they have no file extension
- Added: Button to open the "OwlcatModificationManagerSettings.json" file
- Added: Notification for Xbox users that custom Portaits mods will not be loaded by that version of the game
- Added: Support for Portrait Manager (installer and launch tool)

## [0.1.0] - 2026-01-13

- Inital Release
