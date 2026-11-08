# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod files whose names only begin with README, CHANGELOG, or LICENSE (for example, License_Plates.dds) are no longer skipped during deployment.
- Added: README and CHANGELOG files spelled with a hyphen, underscore, or space (for example, READ_ME.txt or Change Log.md) are now excluded from mod conflict detection and deployment.

## [1.0.3] - 2026-11-04

- Changed: Browse pages no longer open ads and other pop-ups in your web browser. A blocked page shows a notification with an "Open" button instead.

## [1.0.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [0.2.1] - 2026-09-04

- Added: A "Browse ModDB" page that opens moddb.com inside Vortex, so mods can be downloaded and installed without leaving the app.

## [0.2.0] - 2026-08-03

- Fixed: Readme and changelog files inside mods no longer show up as file conflicts.
- Fixed: Paths are now built safely on all systems.
- Added: Buttons to open the game's PCGamingWiki page and submit a bug report.
- Changed: Extension is smaller and loads faster.

## [0.1.0] - 2025-09-26

- Inital Release
