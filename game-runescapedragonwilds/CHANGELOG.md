# Changelog

## [1.2.0] - 2026-09-25

- Updated: RuneSchema support for new RSDW Modding Community framework and mods

## [1.1.1] - 2026-09-21

- Improved: Pak mods still carrying the old shared mod type are now retagged automatically instead of prompting you to reinstall them.

## [1.1.0] - 2026-09-20

- Added support for RuneSchema mods with .json/.jsonc files
- Removed installer for character saves (to allow for RuneSchema installer to handle .json files)

## [1.0.0] - 2026-09-17

- Added Xbox version support
- Added a Load Order page for UE4SS script mods, with a Configure button for mods that ship a config file
- Added a separate Load Order page for LogicMods (Blueprint) pak mods
- Pak, UE4SS, and LogicMods load orders now support locking entries, multi-select, and a right-click menu for common actions
- Added a status filter to the load order pages
- Added support for including UE4SS and LogicMods load order in Collections
- Load order is now preserved automatically when a mod updates
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one
- Added an "Open Save Characters Folder" button

## [0.2.1] - 2026-08-11

- Added Epic Games Store support
- Steam version now launches through Steam

## [0.2.0] - 2026-05-07

- Fixed: Issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added: Notification indicating deployment is required after changing the load order.
- Fixed: Missing FOMOD installer check for pak mods.
- Fixed: path strings
- Added: Buttons to open PCGamingWiki page, view changelog, and submit bug reports
- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names
