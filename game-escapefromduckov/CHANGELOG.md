# Changelog

## [1.0.5] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.4] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.3] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of a mod loader or plugin folder (for example "Myplugins" for "plugins") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Closing the "Wrong Mod Loader" or "Mixed Mod Detected" warning without pressing Ok now cancels the install instead of installing the mod anyway.
- Fixed: A mod archive is now recognised as a BepInEx patcher or a MelonLoader plugin whichever of its files is read last.
- Fixed: The missing .NET runtime warning for MelonLoader is no longer shown twice.

## [1.0.2] - 2026-10-01

- Thunderstore package files (manifest.json, icon.png) from newly installed mods are no longer copied into the shared mod loader folder, where they collided between mods.

## [1.0.1] - 2026-09-27

- Game version now shows the real game build instead of the Unity engine version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.0.0] - 2026-09-19

- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- BepInEx and MelonLoader downloads now automatically check for and install the latest version instead of a fixed one.
- Added: BepInExConfigManager can now be downloaded and is kept up to date automatically.
- Changed: Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other.

## [0.1.2] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.1.1] - 2026-04-22

- Bump: BepInEx version to 5.4.23.5
- Bump: BepInEx Config Manager to 18.4.1 - changed repo

## [0.1.0] - 2025-10-30

- Initial release
