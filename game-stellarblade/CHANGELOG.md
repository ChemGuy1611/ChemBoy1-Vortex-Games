# Changelog

## Future Changes (NOT IMPLEMENTED YET)

- None

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
