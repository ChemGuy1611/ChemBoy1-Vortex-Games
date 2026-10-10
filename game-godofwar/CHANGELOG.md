# Changelog

## [1.0.2] - 2026-10-09

- Fixed: A .texpack and a .lodpack with the same name now share one line on the Load Order page instead of showing as two, and both are written to boot-options.json. Your saved order, disabled packs and locked positions are kept.

## [1.0.1] - 2026-10-07

- Fixed: Prevent conflicts and deployment of boot-options.json files packaged in mod archives.

## [1.0.0] - 2026-10-07

- Added a Load Order page for .texpack and .lodpack mods. Drag packs to reorder them, use the checkbox to turn a pack on or off without uninstalling it, lock a pack's position, and right-click a pack for more options. The order is written to boot-options.json automatically.
- Fixed: The game's own texture and LOD packs are no longer added to the pack lists in boot-options.json.
- Fixed: Packs stored more than two folders deep inside "exec\patch" or "exec\wad" now get the correct path in boot-options.json.

## [0.2.2] - 2026-10-04

- Fixed: The Epic Games Store version of the game is now found and launched correctly.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.2.1] - 2026-08-11

- Added GOG support

## [0.2.0] - 2026-01-30

- Improved: Finds .texpack and .lodpack files in any subdirectory of the "exec\patch" or "exec\wad" folders
- Added: Installer and download button for Script Loader
- Added: Installer for Script Loader mods - indexed on "lua" folder
- Fixed: path strings
- Added: Buttons to open Script Loader config file, PCGamingWiki page, view changelog, and submit bug reports

## [0.1.3] - 2025-04-10

- Corrected text string when writing texpack and lodpack mods to boot-options.json (`../../patch/pc_le/${fileName}`).

## [0.1.2] - 2025-04-10

- Updated info.json

## [0.1.1] - 2025-04-02

- Added button to open Settings INI file and boot-options.json file - folder icon in Mods toolbar.
- Reset boot-option.json file on mod purge.

## [0.1.0] - 2025-04-01

- Initial release
