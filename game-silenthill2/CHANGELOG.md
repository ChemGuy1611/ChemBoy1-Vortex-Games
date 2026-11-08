# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod files whose names only begin with README, CHANGELOG, or LICENSE (for example, License_Plates.dds) are no longer skipped during deployment.
- Added: README and CHANGELOG files spelled with a hyphen, underscore, or space (for example, READ_ME.txt or Change Log.md) are now excluded from mod conflict detection and deployment.

## [1.1.1] - 2026-11-06

- Fixed: A UE4SS installed manually (outside Vortex) is now detected, so the UE4SS and LogicMods load orders and the UE4SS settings update work with it.

## [1.1.0] - 2026-11-05

- Changed: LogicMods (Blueprint) mods now always install directly into the LogicMods folder. Installed mods convert automatically when you next manage the game. Deploy when prompted.
- Added: A notification when a pak mod looks like a Blueprint mod, with a button to set it as a LogicMods mod.

## [1.0.4] - 2026-11-01

- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [1.0.3] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: Pak + UE4SS combo mods now show up on the UE4SS load order page on the Xbox / Game Pass version, instead of being listed as manual mods.
- Fixed: The "Open LogicMods Folder" button now opens the LogicMods folder instead of the Paks folder.

## [1.0.0] - 2026-10-01

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS and LogicMods load order support to Collections.
- Added a status filter to the load order pages.
- UE4SS now downloads automatically and checks for updates.
- Game version now shows the real game build instead of the Unreal engine version.
- Added Config and Save mod types (Save mods are not available for the Xbox version).
- Full Xbox version support: UE4SS and binaries mods now install to the Xbox game folders.
- Fixed: The Xbox version is now launched with the correct app name.
- Pak mods installed with the old shared mod type or the manual "UE5 Paks" mod type are now made sortable automatically - no more reinstalling needed.
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.3.1] - 2026-02-07

- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names

## [0.3.0] - 2026-02-02

- Added: Basic Xbox version support (discovery and executable setting). Note that only pak mods will install properly for Xbox at this time (not binaries or UE4SS mods)
- Added: Game discovery for GOG version
- Fixed: Issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added: Notification indicating deployment is required after changing the load order.
- Fixed: Missing FOMOD installer check for pak mods.
- Fixed: path strings
- Added: Buttons to download UE4SS and open several files/folders/URLs
