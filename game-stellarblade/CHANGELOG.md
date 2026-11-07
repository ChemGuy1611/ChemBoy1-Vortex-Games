# Changelog

## [1.3.1] - 2026-11-06

- Fixed: A UE4SS installed manually (outside Vortex) is now detected, so the UE4SS and LogicMods load orders and the UE4SS settings update work with it.

## [1.3.0] - 2026-11-05

- Added: Support for ATOOL (Animation Tool). ATOOL installs into its own folder in LogicMods, and ATOOL animation mods install their paks to ~mods and their sound files into ATOOL's audio folder.
- Added: Support for the Mod Pak Chunk ID Patcher. It installs into ~mods and gets a tool to run it from Vortex.

## [1.2.0] - 2026-11-05

- Changed: LogicMods (Blueprint) mods now always install directly into the LogicMods folder. Installed mods convert automatically when you next manage the game. Deploy when prompted.
- Added: A notification when a pak mod looks like a Blueprint mod, with a button to set it as a LogicMods mod.

## [1.1.1] - 2026-11-04

- Changed: Browse pages no longer open ads and other pop-ups in your web browser. A blocked page shows a notification with an "Open" button instead.

## [1.1.0] - 2026-11-03

- Added: "Browse GameBanana" page to browse the game's mods on GameBanana and install them directly in Vortex, with an "Open GameBanana Page" button.

## [1.0.11] - 2026-11-01

- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [1.0.10] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.9] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.8] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.

## [1.0.7] - 2026-10-04

- Added: Mods packaged in a top-level "Engine", "Content", "Binaries" or "Mods" folder now install into the matching game folder.

## [1.0.6] - 2026-09-28

- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Game version now shows the real game build instead of the Unreal engine version.

## [1.0.5] - 2026-09-21

- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Fixed: A pak mod installed through a FOMOD wizard (checkbox installer) now shows up on the Load Order page and gets a proper sorted deployment position, instead of silently deploying unsorted with no way to reorder it against other pak mods.

## [1.0.4] - 2026-09-08

- Fixed: A required mod loader or tool is no longer mistaken for an unrelated Nexus mod that shares the same file, which could show the wrong mod details or offer a bogus update for it
- Fixed: Downloads fetched for a required mod loader or tool now show "Website" as their source instead of being left blank

## [1.0.3] - 2026-09-06

- Fixed: Locked load order entries could be moved out of position when using "Move to Top", "Move to Bottom" or the position number box on another entry. Locked entries now keep their place.
- Fixed: The load order position number box now accepts low numbers even when a locked entry is further down the list.

## [1.0.2] - 2026-09-02

- Fixed: A required mod loader or tool is no longer matched against downloads belonging to other games, which could report the wrong installed version or check for updates against the wrong file

## [1.0.1] - 2026-08-24

- Fixed: Deploying could fail with an error when the load order had not been read yet, which can happen while installing a collection.
- Fixed: The load order no longer stops working for the rest of the session if its file cannot be read or is damaged.

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
- Added support for Menu Video Randomizer and Improvements (<https://www.nexusmods.com/stellarblade/mods/529>) and mods that depend on it. Mods must include "Menu" folder and at least one .webm or .bk2 video file to trigger the installer. Otherwise, the user must change the Mod Type to "Menu Mod (.bk2/.webm)" manually.

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
