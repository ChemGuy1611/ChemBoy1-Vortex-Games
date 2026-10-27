# Changelog

## [1.0.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [0.2.1] - 2026-06-28

- Fixed: Installer filter for Save Data files no longer removes the files without extensions.

## [0.2.0] - 2025-12-11

- Fixed folder path setting for the Save folder based on the game store version.
- Changed to use the same executable for all game versions.
- Removed troublesome parameters from requiresLauncher function.
- Fixed Xbox game version detection.
- Technical fixes and improvements.

## [0.1.3] - 2025-09-29

- Version bump to fix incorrect files.

## [0.1.2] - 2025-09-27

- Completed list of file names for Save Data File installer list.

## [0.1.1] - 2025-09-13

- Added error catch for undefined executable (caused by Xbox app locking down the game folder).

## [0.1.0] - 2025-09-10

- Initial Release
