# Changelog

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [0.1.2] - 2025-12-03

- Fixed undefined argument in path.join error when installing extension (oops).

## [0.1.1] - 2025-12-02

- Small improvement to DXHR Patcher installer to remove unnecessary files from staging folder.

## [0.1.0] - 2025-09-29

- Inital Release
