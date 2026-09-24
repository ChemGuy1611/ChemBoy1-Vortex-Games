# Changelog

## [1.0.0] - 2026-09-21

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS load order support to Collections.
- Added: UE4SS and the Signature Bypass tool now download automatically and check for updates.
- Added a status filter to the load order pages.
- Added buttons to open the UE4SS settings file, the UE4SS mods.txt file, and the Vortex downloads folder.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Fixed: Updating a mod no longer moved it in the load order.
- Fixed: Mod files with no file extension were skipped during installation.
- Improved: Pak mods still carrying the old shared mod type are now retagged automatically instead of prompting you to reinstall them.
- Changed: UE4SS now downloads from its GitHub releases instead of this game's Nexus page, since that page is no longer maintained.

## [0.3.2] - 2026-02-03

- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names

## [0.3.1] - 2026-02-01

- Fixed: Deploy notification not clearing on deploy

## [0.3.0] - 2026-01-30

- Added: Epic version support
- Fixed: Issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added: Notification indicating deployment is required after changing the load order
- Fixed: Folder read permission poupus when installing UE4SS
- Fixed: Missing FOMOD installer check for pak mods
- Fixed: path strings
- Added: Buttons to open PCGamingWiki page, view changelog, and submit bug reports
