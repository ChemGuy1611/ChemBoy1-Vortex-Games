# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-09-15

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Migrated the pak load order page to Vortex's newer file-based system, adding a lock button, multi-select, and a right-click context menu.
- Added dedicated UE4SS Load Order and LogicMods Load Order pages, so script/DLL and LogicMods pak mods can now be reordered directly instead of relying on install order alone.

## [0.5.2] - 2026-02-03

- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names

## [0.5.1] - 2026-02-02

- Fixed: Extension now repackages poorly packaged MLUE4SS mods - places pak files in LogicMods folder
- Added: Deployment notification after changing the load order
- Added: Automatic renaming of "Win64" folder to "WinGDK" for UE4SS combo mod installer

## [0.5.0] - 2026-01-31

- Added: UE4SS auto-download function (if not already installed)
- Added: UE4SS DLL mod installer
- Added: Buttons to open multiple files and folders
- Fixed: path strings
- Fixed: Xbox game version detection
