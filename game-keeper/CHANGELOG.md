# Changelog

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: Pak + UE4SS combo mods now show up on the UE4SS load order page on the Xbox / Game Pass version, instead of being listed as manual mods.
- Fixed: The "Open LogicMods Folder" button now opens the LogicMods folder instead of the Paks folder.

## [1.0.0] - 2026-10-10

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS and LogicMods load order support to Collections.
- Added a status filter to the load order pages.
- Updating a mod now keeps its place in the load order.
- UE4SS now downloads automatically and checks for updates.
- Game version now shows the real game build instead of the Unreal engine version.
- Fixed: Steam and GOG installs used the Xbox game folder name (PaganIdol), so mods were installed to a folder the game does not use. They now install to the Keeper folder. The Xbox version is unchanged.
- Fixed: Config mods were placed in a folder the game never reads (%LOCALAPPDATA%\PaganIdol). They now go to %LOCALAPPDATA%\Keeper.
- Mods packaged for the other store's game folder (Keeper or PaganIdol) now install to the right place.

## [0.1.1] - 2026-10-02

- Added support for the GOG version of the game.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.0] - 2025-10-22

- Initial release
