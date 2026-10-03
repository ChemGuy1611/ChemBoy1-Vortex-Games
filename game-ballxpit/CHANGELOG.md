# Changelog

## Planned Improvements (Not Yet Released)

## [1.0.3] - 2026-10-01

- Fixed: MelonLoader mods installed into their own folder were missing the manifest file MelonLoader needs to load them.
- Thunderstore package files (manifest.json, icon.png) from newly installed mods are no longer copied into the shared mod loader folder, where they collided between mods.

## [1.0.2] - 2026-09-27

- Game version now shows the real game build instead of the Unity engine version.

## [1.0.1] - 2026-09-27

- Fixed: a non-Xbox install could be misidentified as the Xbox version, showing the wrong installed game version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.0.0] - 2026-09-18

- BepInEx and MelonLoader downloads now automatically check for and install the latest version instead of a fixed one.
- Changed: BepInExConfigManager now downloads and installs automatically once BepInEx is detected, instead of requiring a manual button click.
- Changed: Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other.
- Fixed: The Xbox version of the game was not detected correctly.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.

## [0.1.3] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.1.2] - 2026-04-22

- Bump: BepInEx Config Manager to 18.4.1 - changed repo

## [0.1.1] - 2026-03-15

- Fixed: Bump BepInEx BE version to 755
- Added: .NET 6 installation check and notification for MelonLoader
- Added: Automatic detection of BepInEx patchers

## [0.1.0] - 2025-11-19

- Initial release
