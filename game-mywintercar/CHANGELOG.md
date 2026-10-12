# Changelog

## [1.0.0] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of a mod loader or plugin folder (for example "Myplugins" for "plugins") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Closing the "Wrong Mod Loader" or "Mixed Mod Detected" warning without pressing Ok now cancels the install instead of installing the mod anyway.
- Fixed: A mod archive is now recognised as a MelonLoader plugin whichever of its files is read last.

## [0.2.4] - 2026-09-28

- Game version now shows the real game build instead of the Unity engine version.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.2.3] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.2.2] - 2026-01-12

- Removed some obsolete notification text related to MSCLoader installer.

## [0.2.1] - 2026-01-10

- Added customized MSCLoader installer to remove unnecessary checks. No longer requires deleting "BepInEx" and "Plugins" folders.

## [0.2.0] - 2026-01-09

- Added MSCLoader as mod loader option. Note that you still must choose only ONE loader.
- Added support for Texture Pack Loader and its mods (depends on MSCLoader).
- Added tool to launch MWCEditor (save editor) if installed.

## [0.1.0] - 2026-01-03

- Initial release
