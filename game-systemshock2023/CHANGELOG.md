# Changelog

## [1.1.3] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.1.2] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: The "Open LogicMods Folder" button now opens the LogicMods folder instead of the Paks folder.

## [1.1.1] - 2026-09-27

- Game version now shows the real game build instead of the Unreal engine version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.1.0] - 2026-09-20

- Dropped the Unreal Engine Mod Installer (UEMI) dependency - pak mod installation is now self-contained, and existing pak mods migrate automatically on update
- Added support for a FOMOD-packaged pak mod to correctly appear on the Load Order page

## [1.0.0] - 2026-09-18

- Migrated to file-based load order (FBLO) on the unified UE4-5 template; added lock button, multi-select, right-click context menu, UE4SS Load Order page
- Added UE4SS script/DLL/LogicMods mod support (new - not previously supported)
- Added a "Download UE4SS" button that downloads and installs the correct build automatically, and checks for UE4SS updates
- Kept Unreal Engine Mod Installer (UEMI) dependency for PAK installation - wired via a custom `loadOrderPrefixFunc` so FBLO correctly reorders UEMI-installed paks
- Fixed: Mod files with no file extension were skipped during installation

## [0.2.2]

- Initial release
