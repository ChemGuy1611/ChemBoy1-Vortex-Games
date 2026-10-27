# Changelog

## [2.0.3] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [2.0.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [2.0.1] - 2026-10-12

- Fixed Ubisoft Connect version discovery so that game store is properly set to "Ubisoft" rather than "Registry"
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [2.0.0] - 2026-10-05

- Added support for GRW ScriptHook Reforged. It is downloaded and installed automatically when you set up the game.
- ScriptHook plugins (.asi and .dll files) now install to the game's plugins folder.
- Forge Mod Loader mods (.forge and .data files) now install to the game's mods folder. They are installed exactly as packaged, so the mod should come in a single folder named after the mod.
- Added an "Open ScriptHook Config File" button.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.0.0] - 2026-08-10

- Initial Release
