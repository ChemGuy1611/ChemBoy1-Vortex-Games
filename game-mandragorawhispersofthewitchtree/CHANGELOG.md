# Changelog

## [1.1.0] - 2026-11-05

- Changed: LogicMods (Blueprint) mods now always install directly into the LogicMods folder. Installed mods convert automatically when you next manage the game. Deploy when prompted.
- Added: A notification when a pak mod looks like a Blueprint mod, with a button to set it as a LogicMods mod.

## [1.0.4] - 2026-11-01

- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [1.0.3] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: Pak + UE4SS combo mods now show up on the UE4SS load order page on the Xbox / Game Pass version, instead of being listed as manual mods.

## [1.0.0] - 2026-10-05

- Changed: Pak mods now use Vortex's built-in load order page. Lock a mod in place, select several mods at once, use the right-click menu, and filter for enabled, disabled and locked mods.
- Added: UE4SS Load Order page. Reorder, enable, disable and lock UE4SS mods, with multi-select, a right-click menu and a filter for enabled, disabled and locked mods.
- Added: LogicMods Load Order page for blueprint mods, with the same controls.
- Added: UE4SS and LogicMods load orders are now included in Collections.
- Added: Updating a pak, UE4SS or LogicMods mod now keeps its place in the load order.
- Added: The Download UE4SS button now downloads and installs UE4SS for you, and Vortex tells you when a newer version is available.
- Changed: Game version now shows the real game build instead of the Unreal engine version.
- Added: Support for the Xbox (Microsoft Store) version. Mods install to the Xbox version's folders and its saves are found.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.1] - 2026-08-11

- Added GOG support

## [0.1.0] - 2025-04-22

- Initial release
