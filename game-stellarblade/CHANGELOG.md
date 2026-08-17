# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-08-17

- Changed: Rebuilt the pak mod load order page. Entries can now be locked in place, selected in bulk with Ctrl-click, and managed from a right-click menu, and the list can be filtered by status.
- Added: UE4SS Load Order page for script and DLL mods, with a Configure button for mods that ship a config file and a checkbox to enable or disable each mod.
- Added: LogicMods Load Order page for blueprint pak mods.
- Added: UE4SS and LogicMods load orders are now included in collections.
- Added: Buttons to open the UE4SS settings INI and the UE4SS mods.txt file.
- Added: Setting to control whether the UE4SS load order manages mods.txt or the older enabled.txt files are used instead.
- Added: Notification when a mod reaches the fallback installer, so it is clear when Vortex could not determine where mod files belong.
- Added: UE4SS is now downloaded and installed automatically from the Stellar Blade build's release page, and Vortex checks it for updates.
- Fixed: Reordering pak mods had no effect on the order they loaded.
- Fixed: Updating a mod no longer removes it from the load order or changes its position.
- Fixed: Downloading UE4SS could pick up the large developer build instead of the standard one.

## [0.2.0] - 2026-02-03

- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names

## [0.1.9] - 2026-01-29

- Added: Notification that deployment is required to apply load order changes
- Fixed: path strings
- Added: Buttons to open PCGamingWiki page and submit bug reports

## [0.1.8] - 2025-09-02

- Added additional installer for CNS mods with only a .json file and no .pak file.

## [0.1.7] - 2025-07-26

- Fixed UE4SS not installing properly on 0.1.6 due to installer test order.
- Fixed UE4SS installer performance issue. UE4SS should now install in seconds.
- Fixed pak mod installer to avoid hijacking any mod that had a .json file without a .pak file.
- UE4SS downloader function now points to the custom version for Stellar Blade (<https://github.com/Chrisr0/RE-UE4SS/releases>). This function can be run using the button within the folder icon on the Mods toolbar.
- Added support for Menu Video Randomizer and Improvements (<https://www.nexusmods.com/stellarblade/mods/529>) and mods that depend on it. Mods must include "Menu" folder and at least one .webm or .bk2 video file to trigger the installer.  Otherwise, the user must change the Mod Type to "Menu Mod (.bk2/.webm)" manually.

## [0.1.6] - 2025-07-24

- Added .json files to pak mod installer. Fixes CNS (Custom NanoSuit System) compatibility.

## [0.1.5] - 2025-06-21

- Added Epic Games ID and full support.

## [0.1.4] - 2025-06-16

- Fixed config/save installers notification text.
- Added installer for splash screen mods (splash.bmp file).

## [0.1.3] - 2025-06-15

- Added installer for title screen mods (.bk2 files to "SB/Content/Movies").

## [0.1.2] - 2025-06-12

- Set Vortex to launch the Steam version through Steam launcher.
- Corrected save game folder path for release version.

## [0.1.1] - 2025-06-05

- Added Steam demo app id to discovery.
- Fixed text in Config/Save modtype notification.

## [0.1.0] - 2025-06-02

- Initial release
