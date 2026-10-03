# Changelog

## Planned Improvements (Not Yet Released)

## [1.0.3] - 2026-10-01

- Fixed: MelonLoader mods installed into their own folder were missing the manifest file MelonLoader needs to load them.
- Thunderstore package files (manifest.json, icon.png) from newly installed mods are no longer copied into the shared mod loader folder, where they collided between mods.

## [1.0.2] - 2026-09-27

- Game version now shows the real game build instead of the Unity engine version
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.0.1] - 2026-09-17

- Added support for the Xbox version of the game.

## [1.0.0] - 2026-09-15

- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- BepInEx, MelonLoader, and BepInExConfigManager downloads now automatically check for and install the latest version instead of a fixed one.
- Plugins with no mod loader folder of their own are now installed into their own folder, so two different mods can no longer overwrite each other's files.

## [0.1.2] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.1.1] - 2026-04-23

- Multiple fixes and enhancements

## [0.1.0] - 2026-04-08

- Initial release
