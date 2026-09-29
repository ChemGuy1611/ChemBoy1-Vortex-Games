# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod archives containing README, CHANGELOG, or LICENSE files are no longer flagged as file conflicts or excluded from deployment
- Fixed: Mod files with no file extension were skipped during installation
- Added "Open PCGamingWiki Page" and "Open SteamDB Page" buttons for all three games.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.2.0] - 2025-11-10

- All versions now use TMX Mod Loader (alternative loader for Steam was removed from Nexus).
- Fixed game version detection for Xbox versions.
- Fixed gameId checks in installer functions.
- Added buttons to open Documents folder for each game (folder icon on Mods page toolbar).

## [0.1.1]

- Added mod types and installers to handle mods with "databin" folders and subfolders ("bgm" and "movies" for NGS1, "sound" and "movies" for NGS2 and NG3RE).
