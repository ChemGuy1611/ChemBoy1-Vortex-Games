# Changelog

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Added a fallback installer: when no other installer matches a mod, Vortex now shows a notice and installs the files to the game folder.
- Fixed: Mods packaged inside an outer folder whose name ends with a game folder's name (for example "MyData" for "Data") now install into the right place instead of a doubled folder.
- Vortex now checks that the game's mod folders are writable when the game is set up.

## [0.3.0] - 2026-10-01

- Added support for ModLoader plugins installed to the `plugins` folder.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.2.5] - 2026-08-11

- Added Epic Games Store support

## [0.2.4] - 2025-10-03

- Several technical fixes and improvements.
- Added buttons to open several useful files and folders (inside folder icon on Mods page toolbar).
