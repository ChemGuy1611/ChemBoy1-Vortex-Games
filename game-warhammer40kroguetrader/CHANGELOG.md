# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

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
