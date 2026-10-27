# Changelog

## [1.0.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [0.5.0] - 2025-10-29

- Improved handling of Mod Manager mods.
- Fixed Xbox game version detection.

## [0.4.3] - 2025-06-01

- Fixed reference error when using button to open Downloads folder

## [0.4.2] - 2025-04-24

- Fixed TR Reboot Mod Manager mod installer to ensure mods always have a top-level folder
- Added buttons to open "Logs and Crash Dumps" and Downloads folders and to view the changelog - folder icon on Mods toolbar

## [0.4.1]

- Added an installer for mods intended for the TR Reboot Mod Manager that did not include a top-level folder above the modified files.
- Added notification to run TR Reboot Mod Manager after deployment

## [0.4.0]

- Integrated new TR2013 Modding Tools mod manager

## [0.3.0]

- Improved TexMod support for DX9 version
- Updated requiresLauncher function
