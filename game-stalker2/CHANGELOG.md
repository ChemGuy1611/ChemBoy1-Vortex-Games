# Changelog

## FUTURE CHANGES (NOT YET IMPLEMENTED)

- None Planned

## [0.5.2] - 2026-02-02

- Added: Automatic renaming of "Win64" folder to "WinGDK" for UE4SS combo mod installer
- Added: Buttons to open several additional files/folders/URLs

## [0.5.1] - 2026-01-19

- Fixed: More reliable folder deletion operations - revised deprecated fsPromises.rmdir function to fsPromises.rm

## [0.5.0] - 2025-11-22

- Fixed issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added notification indicating deployment is required after changing the load order.
- UE4SS downloader now has the user browse GitHub releases page for the file.
- Fixed Xbox game version detection.
- Fixed Saves path for GOG version.
- Technical fixes and improvements

## [0.4.0] - 2025-07-02

- Added full Epic version support.
- Added button to open Steam Workshop Mods folder - folder icon in Mods toolbar.

## [0.3.2] - 2025-04-22

- Added installer for UE4SS DLL Mods
- Added button to download UE4SS - folder icon in Mods toolbar
- Improved code for partition-checked modtypes
- Added button to open LogicMods folder - folder icon in Mods toolbar
- Minor code improvements

## [0.3.1] - 2025-04-03

- Corrected a typo in a notification message.

## [0.3.0] - 2025-04-02

- Made Simple Mod Merger download optional via a notification with a button to download it.
- Enabled mod types for Config and Save mods. The mod types will only be avaiable if the game, staging folder, and user folder are on the same partition.
- Added notifications when attempting to install a mod type that is not available because the game, staging folder, and user folder are not on the same partition.
- Added notification to enable the toolbar when a profile is changed.
- Fixed pak mods not being sortable in the load order if not sourced from Nexus Mods.
- Cleaned up the code.
