# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.1] - 2026-10-01

- Fixed: Pak mods carried over from the old shared mod type are now tracked correctly after the automatic fix, so their old files can't be left behind in the game folder.

## [1.0.0] - 2026-09-30

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS and LogicMods load order support to Collections.
- Added a status filter to the load order pages.
- UE4SS now downloads automatically and checks for updates.
- Game version now shows the real game build instead of the Unreal engine version.
- Added Config and Save mod types (Save mods are not available for the Xbox version).
- Pak mods installed before version 0.2.0 are now made sortable automatically - no more reinstalling needed.
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.2.1] - 2026-02-06

- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names

## [0.2.0] - 2026-02-01

- Fixed: Issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added: Notification indicating deployment is required after changing the load order.
- Fixed: Missing FOMOD installer check for pak mods.
- Fixed: path strings
- Fixed: Xbox game version detection
- Added: UE4SS DLL Mods installer
- Added: Button to download UE4SS and open PCGamingWiki page, view changelog, and submit bug reports
- Added: Automatic "Win64" to "WinGDK" folder rename for Xbox version UE4SS combo mod installer
