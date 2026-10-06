# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-10-04

- Added: UE4SS Load Order page. Reorder, enable, disable and lock UE4SS mods, with multi-select, a right-click menu and a filter for enabled, disabled and locked mods.
- Added: LogicMods Load Order page for blueprint mods, with the same controls.
- Added: UE4SS and LogicMods load orders are now included in Collections.
- Added: Updating a UE4SS or LogicMods mod now keeps its place in the load order.
- Added: The Download UE4SS button now downloads and installs UE4SS for you, and Vortex tells you when a newer version is available.
- Added: Support for the Xbox (Microsoft Store) version of the game.
- Changed: Game version now shows the real game build instead of the Unreal engine version.
- Pak mods still install straight to the Paks folder, so there is no pak load order page. The game loads them from there.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.2.1] - 2026-03-27

- Fixed: Corrected Save and Config paths (Documents)
- Changed: Config and Save modTypes will only be available if the game is on same drive as Documents (to allow hardlinks on secondary drives)

## [0.2.0] - 2026-03-19

- Fixed: Pak mods now install to Paks folder directly. Load Order support is disabled for this reason

## [0.1.0] - 2025-10-31

- Initial release
