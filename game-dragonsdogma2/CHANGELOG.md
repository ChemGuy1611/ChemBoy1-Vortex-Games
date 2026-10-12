# Changelog

## [1.0.0] - 2026-10-12

- Fixed: Mods packaged inside an outer folder named like one of the mod's key files (for example "dinput8.dll.old") now install into the right place.
- Fixed: Lua script mods with scripts in more than one folder now install every folder instead of only the first.
- Fixed: A mod archive containing another archive with an upper-case extension (.ZIP, .RAR, .7Z) is now installed as it is instead of being packed into another zip.
- Added a "Download Latest REFramework Nightly" button to the Mods toolbar.
- Added an "Open Save Folder (Steam)" button to the Mods toolbar.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Vortex now picks up the game's short name (DD2), which it was ignoring before.

## [0.6.0] - 2026-03-05

- Improved: Mod installer performance by removing Bluebird.
- Added: Installer for Fluffy Preset files (.prt) - useful for collections

## [0.5.0] - 2026-01-30

- Added: Installer for loose lua files - not installed properly by Fluffy
- Fixed: input undefined error when downloading Fluffy Mod Manager
- Fixed: path strings
- Added: Buttons to open Downloads folder, PCGamingWiki page, view changelog, and submit bug reports

## [0.4.3]

- Removed an obsolete parameter that caused downloading updates from the Moddding Tools domain, including Fluffy MM, to fail with wrong URL
- Removed 'site' from compatibleDownloads, as it would cause all mods from the Modding Tools domain the user has installed to show up as uninstalled mods in the mod list
