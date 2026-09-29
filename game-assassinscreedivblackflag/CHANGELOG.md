# Changelog

## [1.0.3] - 2026-09-29

- Shortened the "Run AnvilToolkit" deploy reminder button to "Run ATK".

## [1.0.2] - 2026-09-28

- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: the "Installed Version" shown by Vortex was always wrong, since the game's own exe doesn't store a real version number. The extension now reads the actual installed build from Steam or the Ubisoft Connect install data instead.

## [1.0.0] - 2026-09-21

- Migrated to `template-anvilengine` (refreshed installer priorities, ResoRep-ready toggle set).
- Added: DLC folder support. `.forge` mods for the dlc_1 through dlc_10 DLC now install into the correct DLC folder automatically instead of the base game folder.
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.

## [0.4.3] - 2026-06-30

- Fixed: Fix pathing to Windows folder to adjust to user environment (not hardcoded to C:\Windows).

## [0.4.2]

- Removed an obsolete parameter that caused downloading updates from the Moddding Tools domain, including AnvilToolkit, to fail with wrong URL
- Removed 'site' from compatibleDownloads, as it would cause all mods from the Modding Tools domain the user has installed to show up as uninstalled mods in the mod list

## [0.4.1]

- Added function to automatically copy d3d11.dll from system folder to game folder if the user installed ResoRep.

## [0.4.0]

- Drastically improved user experience when using ResoRep Textures. The extension will write a dllsettings.ini file to the game's root folder if it doesn't already exist. This file is used by ResoRep to locate the game and the modded textures folder. A notification presents users with the option to download ResoRep dll files with an installer script from Nexus Mods if they don't already have them.

## [0.2.0]

- Added additional mod installers to attempt to repackage poorly packaged ATK mods into the correct "Extracted" folder structure to be repacked by ATK
- Added installer for root folders ("videos", "sounddata")
- Added notification after deployment to run ATK
