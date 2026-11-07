# Changelog

## [1.3.1] - 2026-11-06

- Fixed: A UE4SS installed manually (outside Vortex) is now detected, so the UE4SS and LogicMods load orders and the UE4SS settings update work with it.

## [1.3.0] - 2026-11-05

- Changed: LogicMods (Blueprint) mods now always install directly into the LogicMods folder. Installed mods convert automatically when you next manage the game. Deploy when prompted.
- Added: A notification when a pak mod looks like a Blueprint mod, with a button to set it as a LogicMods mod.

## [1.2.1] - 2026-11-04

- Changed: Browse pages no longer open ads and other pop-ups in your web browser. A blocked page shows a notification with an "Open" button instead.

## [1.2.0] - 2026-11-03

- Added: "Browse GameBanana" page to browse the game's mods on GameBanana and install them directly in Vortex, with an "Open GameBanana Page" button.
- Fixed: mods packaged as a plugin folder (with a .uplugin file) now install to the mod loader's Mods folder instead of being flattened into ~mods, and an archive holding several of them installs them all.

## [1.1.5] - 2026-11-03

- Fixed: LogicMods (Blueprint) mods installing into a second LogicMods folder, which stopped mods packaged in a subfolder from loading. Reinstall any affected mods.

## [1.1.4] - 2026-11-01

- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [1.1.3] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.1.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.1.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.

## [1.1.0] - 2026-09-30

- Added a JSON Load Order page for SZModLoader JSON mods. The order you set there is written to JsonFiles.json, and new JSON mods are added to the bottom of the list. Each entry has a checkbox to leave it out of JsonFiles.json without uninstalling it.
- Added the JSON load order to Collections.

## [1.0.1] - 2026-09-27

- Game version now shows the real game build instead of the Unreal engine version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.0.0] - 2026-09-22

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS load order support to Collections.
- Added a status filter to the load order pages.
- Fixed: UE4SS auto-download was pointed at the wrong Nexus page and never worked; it now downloads from its GitHub releases and checks for updates.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Fixed: Mod files with no file extension were skipped during installation.
- Improved: Pak mods still carrying the old shared mod type are now retagged automatically instead of prompting you to reinstall them.

## [0.5.1] - 2026-02-05

- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names
- Improved: Filter out JsonFiles.json file from SZModLoader, its mods, and JSON mods to avoid external changes popups
- Fixed: Corrected error message text

## [0.5.0] - 2026-02-01

- Fixed: Issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added: Notification indicating deployment is required after changing the load order.
- Fixed: Missing FOMOD installer check for pak mods.
- Added: Installer for UE4SS DLL mods
- Improved: JsonFiles.json file update performance
- Improved: Reliability of download functions
- Improved: Config installer notification text
- Fixed: Path strings
- Added: Buttons to open JsonFiles.json file, open PCGamingWiki page, view changelog, and submit bug reports

## [0.4.3] - 2025-04-12

- Added automatic install of SZModLoader mod.

## [0.4.2] - 2025-04-12

- Fixed Vortex failing to manage the game on a clean game install by write-checking the Json folder before writing the JsonFiles.json file.

## [0.4.1] - 2025-04-11

- Fixed JsonFiles.json file list including the vortex.deployment.dragonballsparkingzero-json.json file.

## [0.4.0] - 2025-04-11

- Implemented automatic updating of the JsonFiles.json file with all installed json mod file names!
- Added a check for enabling config modtype if the user has the game, staging folder, and Local AppData folder on the same drive.
- Added an error message if the user attempts to install a config mod when the modtype is not available.
- Fixed mods not from Nexus not being sortable in the load order.
