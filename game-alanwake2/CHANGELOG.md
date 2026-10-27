# Changelog

## [1.2.3] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.2.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.2.1] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [1.2.0] - 2026-03-22

- Improved: Added folder-based installer to fix poorly packaged mods
- Added: Buttons to open useful files/folders/URLs (folder icon on Mods toolbar)
- Fixed: requiresLauncher specification
- Improved: Reliability of Mod Loader downloader
