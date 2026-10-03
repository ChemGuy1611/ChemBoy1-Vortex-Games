# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-10-02

- Migrated to file-based load order (FBLO); added a lock button, multi-select, and a right-click context menu to the Paks load order page.
- Added a UE4SS Load Order page and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS and LogicMods load order support to Collections.
- Added a status filter to the load order pages.
- UE4SS now downloads automatically and checks for updates.
- Game version now shows the real game build instead of the Unreal engine version.
- Added Config and Save mod types (Save mods are not available for the Xbox version).
- Pak mods installed with the old shared mod type or the manual "UE5 Paks" mod type are now made sortable automatically - no more reinstalling needed.
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.2.0] - 2026-01-07

- Changed Signature Bypass method to MK12TTH mod <https://www.nexusmods.com/mortalkombat/mods/62?tab=files>.
- Added Xbox version support
- Fixed issue with Load Order sorting of legacy pak mods not working if certain other UE game extensions were installed. You will need to reinstall all legacy pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added notification indicating deployment is required after changing the load order.
- Technical fixes and improvements.
