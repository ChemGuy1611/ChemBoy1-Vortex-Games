# Changelog

## [1.0.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: Pak + UE4SS combo mods now show up on the UE4SS load order page on the Xbox / Game Pass version, instead of being listed as manual mods.
- Fixed: The "Open LogicMods Folder" button now opens the LogicMods folder instead of the Paks folder.

## [1.0.0] - 2026-10-04

- Changed: Pak mods now use Vortex's built-in load order page. Lock a mod in place, select several mods at once, use the right-click menu, and filter for enabled, disabled and locked mods.
- Added: UE4SS Load Order page. Reorder, enable, disable and lock UE4SS mods, with multi-select, a right-click menu and a filter for enabled, disabled and locked mods.
- Added: LogicMods Load Order page for blueprint mods, with the same controls.
- Added: UE4SS and LogicMods load orders are now included in Collections.
- Added: Updating a pak, UE4SS or LogicMods mod now keeps its place in the load order.
- Added: The Download UE4SS button now downloads and installs UE4SS for you, and Vortex tells you when a newer version is available.
- Changed: Game version now shows the real game build instead of the Unreal engine version.
- Fixed: Save mods for the Steam version now install into the game's SaveGames folder inside your Steam user ID folder, instead of the Steam folder above it.

## [0.1.2] - 2026-10-02

- Added support for the Xbox / Microsoft Store version of the game.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.1] - 2026-03-27

- Fixed: Config and Save paths

## [0.1.0] - 2026-02-05

- Initial release
