# Changelog

## [1.0.0] - 2026-10-12

- Fixed: Mods packaged inside an outer folder named like one of the mod's key files (for example "dinput8.dll.old") now install into the right place.
- Fixed: Lua script mods with scripts in more than one folder now install every folder instead of only the first.
- Fixed: A mod archive containing another archive with an upper-case extension (.ZIP, .RAR, .7Z) is now installed as it is instead of being packed into another zip.
- Fixed: A mod whose key file name uses different letter case (for example "DINPUT8.DLL") no longer fails to install.
- Added an "Open Save Folder (Steam)" button to the Mods toolbar.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.5] - 2026-08-14

- Fixed: Corrected REFramework Nightly latest download file URL

## [0.1.4] - 2026-08-12

- Fixed: The Epic Games Store version now launches through the Epic launcher

## [0.1.3] - 2026-03-05

- Added: Installer for Fluffy Preset files (.prt) - useful for collections

## [0.1.2] - 2026-02-28

- Added: Epic version support.

## [0.1.1] - 2026-02-28

- Improved: Mod installer performance by removing Bluebird.
- Added: Buttons to download latest REFramework Nightly and EMV Engine (Modding Tools) from GitHub.

## [0.1.0] - 2026-02-27

- Initial Release.
