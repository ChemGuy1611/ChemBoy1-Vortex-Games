# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-10-01

- Added: UE4SS Load Order page. Reorder, enable, disable and lock UE4SS mods, with multi-select, a right-click menu and a filter for enabled, disabled and locked mods.
- Added: LogicMods Load Order page for blueprint mods, with the same controls.
- Added: UE4SS and LogicMods load orders are now included in Collections.
- Added: Updating a UE4SS or LogicMods mod now keeps its place in the load order.
- Added: The Download UE4SS button now fetches the latest UE4SS release, and Vortex tells you when a newer version is available.
- Added: Tool to launch the ModKit (Epic Games).
- Added: Loose .pak mods (without a modinfo.json) now install to the ~mods folder. ModKit mods still install to Content/Mods.
- Changed: Game version now shows the real game build instead of the Unreal engine version.
- Changed: Mods from the old shared "Legacy UE - REINSTALL TO SORT" type are converted automatically, so the reminder to reinstall them is gone.
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Removed the "Open PCGamingWiki Page" button, since PCGamingWiki has no page for this game.

## [0.4.0] - 2026-05-07

- Fixed: Issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added: Notification indicating deployment is required after changing the load order.
- Fixed: Missing FOMOD installer check for pak mods.
- Fixed: path strings
- Added: Buttons to open PCGamingWiki page, view changelog, and submit bug reports
- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names

## [0.3.0] - 2025-06-26

- Disabled Signature Bypass downloader since it is no longer required with the ModKit release.
- Changed Pak mod installer for new ModKit format, moved installation folder to "Content/Mods", and disabled Load Order (now in-game).

## [0.2.0] - 2025-04-25

- Added support IO Store pak mods (pak/ucas/utoc)
- Updated signature bypass download to new mod page
- Added buttons to open multiple folders - folder icon on Mods toolbar
- Several other technical improvements
