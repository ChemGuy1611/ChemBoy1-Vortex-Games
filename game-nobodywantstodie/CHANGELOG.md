# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-10-05

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS and LogicMods load order support to Collections.
- Added a status filter to the load order pages.
- Updating a mod now keeps its place in the load order.
- The Download UE4SS button now downloads and installs UE4SS for you, and Vortex checks for UE4SS updates.
- Game version now shows the real game build instead of the Unreal engine version.
- Pak mods installed with the old shared mod type or the manual "UE5 Paks" mod type are now made sortable automatically - no more reinstalling needed.
- Added support for installing Config mods and Save mods again (Local AppData\detnoir).
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.3.1] - 2026-08-11

- Added Epic Games Store support

## [0.3.0] - 2026-05-07

- Fixed: Issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added: Notification indicating deployment is required after changing the load order.
- Fixed: Missing FOMOD installer check for pak mods.
- Fixed: path strings
- Added: Buttons to open PCGamingWiki page, view changelog, and submit bug reports
- Fixed: Xbox game version detection
- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names

## [0.2.0] - 2025-10-11

- Disabled symlinks as they don't work with this game (because of Unreal Engine IOStore)
- Disabled config and save mod types and installers due to lack of symlinks support

## [0.1.0] - 2025-01-14

- Inital Release
