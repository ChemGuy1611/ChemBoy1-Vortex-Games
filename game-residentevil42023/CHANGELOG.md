# Changelog

## [1.0.0] - 2026-10-12

- Fixed: Mods packaged inside an outer folder named like one of the mod's key files (for example "dinput8.dll.old") now install into the right place.
- Fixed: Lua script mods with scripts in more than one folder now install every folder instead of only the first.
- Fixed: A mod archive containing another archive with an upper-case extension (.ZIP, .RAR, .7Z) is now installed as it is instead of being packed into another zip.
- Fixed: A mod whose key file name uses different letter case (for example "DINPUT8.DLL") no longer fails to install.
- Added a "Download Latest REFramework Nightly" button to the Mods toolbar.
- Added an "Open Save Folder (Steam)" button to the Mods toolbar.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.4.1] - 2026-03-11

- Fixed: Missing function crash when clicking the "Open Config File" button

## [0.4.0] - 2026-03-05

- Improved: Mod installer performance by removing Bluebird.
- Added: Installer for Fluffy Preset files (.prt) - useful for collections

## [0.3.3] - 2026-02-08

- Added: Upscaler and root file mod installers
- Added: Custom launch tool

## [0.3.2] - 2026-01-31

- Fixed: Error related to "path" argument not being a string.

## [0.3.1] - 2026-01-30

- Fixed: paths strings
- Added: Buttons to open Downloads folder, PCGamingWiki page, view changelog, and submit bug reports

## [0.3.0] - 2025-09-27

- Fixed potential issues with Fluffy Mod Manager autodwonloader.
- Added loose lua file installer (loose lua files are not installed properly by Fluffy Mod Manager).
- Integrated Steam demo support into main extension.

## [0.2.0]

- Added notification for running FMM after mod deployment
- Removed an obsolete parameter that caused downloading updates from the Moddding Tools domain, including Fluffy MM, to fail with wrong URL
