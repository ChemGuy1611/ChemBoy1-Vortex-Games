# Changelog

## Planned Improvements (Not Yet Released)

## [1.0.0] - 2026-10-01

- Changed: BepInEx is now installed and managed by this extension instead of Vortex's built-in BepInEx support. It still comes from the pre-configured Mirthwood pack on Nexus Mods. Your installed BepInEx and mods are carried over automatically - no action needed.
- Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other.
- Removed: the "Download BepInExConfigManager" button. The Mirthwood BepInEx pack already includes ConfigurationManager, so this extension no longer offers a second copy. ConfigurationManager mods you installed yourself keep working.
- Added: "Download Latest MelonLoader" button. Only one mod loader can be installed at a time - if both are present, you'll be asked to choose which one to keep.
- Added: Mods that replace the game's assembly files (Assembly-CSharp.dll) or .assets/.resource files are now installed to the right folder.
- Thunderstore package files (manifest.json, icon.png) from newly installed mods are no longer copied into the shared mod loader folder, where they collided between mods.

## [0.3.1] - 2026-09-28

- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Game version now shows the real game build instead of the Unity engine version.

## [0.3.0] - 2026-09-13

- Added: Support for BepInEx Configuration Manager, with a "Download BepInExConfigManager" button to install it
- Added an "Open SteamDB Page" button.

## [0.2.1] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.2.0] - 2026-08-03

- Fixed: Readme and changelog files inside mods no longer show up as file conflicts.
- Fixed: Paths are now built safely on all systems.
- Added: Button to submit a bug report.
- Changed: Extension is smaller and loads faster.

## [0.1.1] - 2025-05-14

- Changed BepinEx page and file IDs to strings to avoid errors with numeric IDs.

## [0.1.0] - 2025-04-22

- Initial release
