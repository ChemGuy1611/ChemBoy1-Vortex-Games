# Changelog

## [1.1.0] - 2026-10-18

- Added: Support for the GOG version of the game.

## [1.0.6] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.5] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of a mod loader or plugin folder (for example "Myplugins" for "plugins") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Closing the "Wrong Mod Loader" or "Mixed Mod Detected" warning without pressing Ok now cancels the install instead of installing the mod anyway.
- Fixed: A mod archive is now recognised as a BepInEx patcher or a MelonLoader plugin whichever of its files is read last.
- Fixed: The missing .NET runtime warning for MelonLoader is no longer shown twice.

## [1.0.4] - 2026-10-01

- Fixed: MelonLoader mods installed into their own folder were missing the manifest file MelonLoader needs to load them.
- Thunderstore package files (manifest.json, icon.png) from newly installed mods are no longer copied into the shared mod loader folder, where they collided between mods.

## [1.0.3] - 2026-09-27

- Game version now shows the real game build instead of the Unity engine version.

## [1.0.2] - 2026-09-27

- Fixed: a non-Xbox install could be misidentified as the Xbox version, showing the wrong installed game version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.0.1] - 2026-09-17

- Added support for the Xbox version of the game.

## [1.0.0] - 2026-09-15

- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation
- Changed: Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other

## [0.1.1] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.1.0] - 2026-04-18

- Initial release
