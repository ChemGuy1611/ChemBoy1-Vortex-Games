# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-10-09

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS and LogicMods load order support to Collections.
- Added a status filter to the load order pages.
- Updating a mod now keeps its place in the load order.
- UE4SS now downloads automatically and checks for updates.
- The game's Unreal Engine version (5.6) is now written into the UE4SS settings when mods are deployed, which UE4SS needs for this game.
- Game version now shows the real game build instead of the Unreal engine version.
- Fixed: Save file mods now install into the folder the game actually reads (Saved Games\Grasshopper Manufacture\ROMEO IS A DEAD MAN\SavedGames\<id>) instead of an unused AppData folder.

## [0.1.1] - 2026-10-02

- Added support for the Xbox / Microsoft Store version of the game.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.0] - 2026-02-16

- Initial release
