# Changelog

## [1.0.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Added a fallback installer: when no other installer matches a mod, Vortex now shows a notice and installs the files to the game folder.
- Fixed: Mods packaged inside an outer folder whose name ends with a game folder's name (for example "MyData" for "Data") now install into the right place instead of a doubled folder.
- Fixed: Mods made up only of loose package files (no containing folder) could fail to install.
- The game version shown in Vortex is now read from the installed game's executable.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.6.1] - 2025-11-16

- Further improvements to TFC mod installer.
- Add installer for .dll files to the "Binaries" folder.
- Added installer for .upk/.xxx/.ucs files to the "CookedPCConsole" folder.

## [0.6.0] - 2025-11-12

- Improved TFC mod installer to better handle different packaging methods.
- Technical fixes and improvements.

## [0.5.1] - 2025-09-17

- Fixed potential issues with TFC Installer download.
- Fixed Epic version discovery and launching.

## [0.5.0]

- Improved support for TFC Installer and mods that use it
- Moved TFC mods to "TFC Installer\Mods" folder
- Added installer for root folders (XGame)
- Added a tool for UPK Explorer if the user installs it to the game folder
- Removed an obsolete parameter that caused downloading updates from the Moddding Tools domain, including TFC Installer, to fail with wrong URL
