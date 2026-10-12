# Changelog

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.

## [1.0.0] - 2026-10-03

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS and LogicMods load order support to Collections.
- Added a status filter to the load order pages.
- Updating a mod now keeps its place in the load order.
- Added UE4SS update checks; the Download UE4SS button installs the latest UE4SS build.
- Game version now shows the real game build instead of the Unreal engine version.
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.0] - 2025-06-02

- Initial release
