# Changelog

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: The "Open LogicMods Folder" button now opens the LogicMods folder instead of the Paks folder.

## [1.0.0] - 2026-10-04

- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods, with a lock button, multi-select, a right-click context menu and a status filter.
- Added UE4SS and LogicMods load order support to Collections.
- Updating a mod now keeps its place in the load order.
- The Download UE4SS button now downloads and installs UE4SS for you, and Vortex checks for UE4SS updates.
- Game version now shows the real game build instead of the Unreal engine version.
- Pak mods still install to the main Paks folder with pak load order off, as before.
- Fixed: Save mods and the Open Saves Folder button now use the main SaveGames folder instead of the first save slot's folder.
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.1] - 2026-01-07

- Removed "~mods" folder from the pak mod path as some mods apparently don't work from that folder.
- Disabled Load Ordering so that paks are not in subfolders.

## [0.1.0] - 2026-01-04

- Initial release
