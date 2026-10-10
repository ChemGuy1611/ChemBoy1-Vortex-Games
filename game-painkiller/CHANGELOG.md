# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-10-10

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS and LogicMods load order support to Collections.
- Added a status filter to the load order pages.
- Updating a mod now keeps its place in the load order.
- UE4SS now downloads automatically and checks for updates.
- Game version now shows the real game build instead of the Unreal engine version.
- Fixed: Config mods were installed to a folder the game does not read (`Saved\Config\Windows`). They now go to `Saved\Config\WindowsNoEditor`.
- Fixed: The "Open PCGamingWiki Page" button opened the page of the original 2004 game instead of Painkiller (2025).
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.0] - 2025-10-22

- Initial release
