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

- Improved game discovery reliability.

## [0.4.1]

- Added an installer for mods intended for the TR Reboot Mod Manager that did not include a top-level folder above the modified files.
- Added more file extensions to detect mods for TR Reboot Mod Manager

## [0.4.0]

- Updated support for new version of the SOTTR Mod Manager (now TR Reboot Mod Manager)
- Added notificaiton to run TR Reboot Mod Manager after deployment
- Added fallback installer for root folder
- Removed xbox id from discovery since that version of the game cannot be modded
