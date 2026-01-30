# Changelog

## Future Changes (NOT IMPLEMENTED YET)

- None planned

## [0.5.0] - 2026-01-30

- Fixed: Issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added: Notification indicating deployment is required after changing the load order.
- Fixed: Missing FOMOD installer check for pak mods.
- Fixed: path strings
- Added: Buttons to open PCGamingWiki page, view changelog, and submit bug reports

## [0.4.0] - 2025-05-19

- Added support for FF7RML (Mod Loader) and mods that depend on it.
- Improved installer error messages for Save and Config installers.

## [0.3.5] - 2025-04-22

- Added installer for UE4SS DLL Mods
- Added tool to launch the game with custom arguments (arguments provided by the user)
- Minor code improvements

## [0.3.4] - 2025-04-22

- Fixed incorrect path for button to open LogicMods folder
- Improved code for partition-checked modtypes

## [0.3.3] - 2025-04-22

- Fixed Epic ID not included in discovery.

## [0.3.2] - 2025-04-10

- Fixed the check for enabling config and save modtypes so they will be enabled properly if the game, staging folder, and Documents folder are on the same drive.
- Added an error message if the user attempts to install a config or save mod when the modtypes are not available.

## [0.3.1] - 2025-03-28

- Made the partition check for Config and Save modtypes synchronous so that it works as intended

## [0.3.0] - 2025-03-27

- Fixed pak mods not being sortable in the load order if obtained from a non-Nexus source
- Added button to download UE4SS (folder icon in Mods toolbar)
- Added check for enabled.txt file when installing UE4SS Script mods
- Added the ability to use the Config and Save installers and modtypes if the user has the game, staging folder, and config/save folder on the same drive
