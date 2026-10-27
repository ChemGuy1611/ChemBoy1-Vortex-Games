# Changelog

## Planned Improvements (Not Yet Released)

- Added: The TMX Mod Loader tool now starts automatically when you launch the game from Vortex (requires a Vortex version with tool "Start with game" support).

## [1.0.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Fixed: Mod archives containing README, CHANGELOG, or LICENSE files are no longer flagged as file conflicts or excluded from deployment
- Fixed: Mod files with no file extension were skipped during installation
- Added "Open PCGamingWiki Page" and "Open SteamDB Page" buttons for all three games.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [0.2.0] - 2025-11-10

- All versions now use TMX Mod Loader (alternative loader for Steam was removed from Nexus).
- Fixed game version detection for Xbox versions.
- Fixed gameId checks in installer functions.
- Added buttons to open Documents folder for each game (folder icon on Mods page toolbar).

## [0.1.1]

- Added mod types and installers to handle mods with "databin" folders and subfolders ("bgm" and "movies" for NGS1, "sound" and "movies" for NGS2 and NG3RE).
