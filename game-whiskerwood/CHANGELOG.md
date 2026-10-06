# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-10-05

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS and LogicMods load order support to Collections.
- Added a status filter to the load order pages.
- Updating a mod now keeps its place in the load order.
- UE4SS now downloads automatically and checks for updates.
- Game version now shows the real game build instead of the Unreal engine version.
- Added: Mods made for Whiskerwood's own mod loader (a folder with a .pak and a .uplugin file) now install into the game's `Saved\mods` folder, and there is a new "Open Mods Folder" button.
- Fixed: Save mods now install into the folder the game actually reads (`Saved\saves_player`, .whisker files).
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.1] - 2026-01-19

- Added: Logic to the UE4SS combo installer to change "Win64" folder name to "WinGDK" if user is on the Xbox version of the game

## [0.1.0] - 2025-11-13

- Initial release
