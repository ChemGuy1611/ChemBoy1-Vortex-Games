# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-10-02

- Both games: migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Both games: added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Both games: added UE4SS and LogicMods load order support to Collections.
- Both games: added a status filter to the load order pages.
- Both games: updating a mod now keeps its place in the load order.
- Both games: UE4SS now downloads automatically and checks for updates.
- Both games: game version now shows the real game build instead of the Unreal engine version.
- Both games: the UE4SS Load Order setting is now kept separately for each game.
- Unfinished Business: added Xbox (Microsoft Store) support.
- Unfinished Business: the Open PCGamingWiki Page button now opens its own page instead of the Rogue City one.
- Unfinished Business: fixed the Open Saves Folder button, which pointed at the wrong location.
- Rogue City: pak mods from the old shared "REINSTALL TO SORT" type are now made sortable automatically. Reinstalling them is no longer needed.
- Rogue City: Save mods now install to the game's main save folder. They could previously end up in its Backup subfolder.
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button for both editions.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.7.0] - 2026-05-07

- Fixed: Issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added: Notification indicating deployment is required after changing the load order.
- Fixed: Missing FOMOD installer check for pak mods.
- Fixed: path strings
- Added: Buttons to open PCGamingWiki page, view changelog, and submit bug reports
- Fixed: Xbox game version detection
- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names

## [0.6.0] - 2025-07-17

- Added support for RoboCop: Rogue City - Unfinished Business as a separate game.
- Added Game Pass support for RoboCop: Rogue City.
- Added full support for UE4SS and its script and dll mods.
- Installers for Config and Save mods (dependent on folders being on same partition).
- Many technical improvements.
