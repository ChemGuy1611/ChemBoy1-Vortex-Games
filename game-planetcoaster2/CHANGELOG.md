# Changelog

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Added a fallback installer: when no other installer matches a mod, Vortex now shows a notice and installs the files to the game folder.
- Added installers for ACSE localization files and .webm movie replacements.
- Fixed: Mods packaged inside an outer folder whose name ends with a game folder's name (for example "MyData" for "Data") now install into the right place instead of a doubled folder.
- Fixed: The Open Save Folder and Open Config Folder buttons could point to the wrong folder right after the first setup.
- Vortex now checks that the game's mod folders are writable when the game is set up.

## [0.4.1] - 2026-10-04

- Fixed: The Epic Games Store version of the game is now found and launched correctly.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.4.0] - 2026-06-06

- Fixed: ACSE Mods always installed with a top level folder

## [0.3.1] - 2026-04-09

- Added: Xbox (Game Pass) version support.

## [0.3.0] - 2025-10-22

- Added Root modtype and installer for known folders.
- Improved ACSE downloader function.
- Several technical improvements.

## [0.2.0] - 2024-12-13

- Added mod types and installer for saves folder.
- Added Epic Games ID (thanks to user Coppertine).

## [0.1.0] - 2024-11-25

- Initial release
