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

## [0.1.1] - 2025-10-06

- Changed default mod install path to "Mods" folder and added a fallback installer to the root folder. This improves compatibility with FOMOD installers for .pk3 mods.
- Added '+g_skipintro 1' to the default command line arguments (skips intro videos).

## [0.1.0] - 2025-10-05

- Inital Release
