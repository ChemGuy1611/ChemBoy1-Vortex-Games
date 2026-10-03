# Changelog

## Planned Improvements (Not Yet Released)

## [1.0.0] - 2026-10-01

- Changed: BepInEx is now installed and managed by this extension instead of Vortex's built-in BepInEx support. Your installed BepInEx and mods are carried over automatically - no action needed.
- BepInEx now checks for updates and notifies you when a newer bleeding edge build is available. It was previously fixed to a single build, and it is never updated without you choosing to.
- Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other.
- New installs: BepInExConfigManager is now offered through a notification instead of being installed automatically.
- Added: "Download Latest MelonLoader" button. Only one mod loader can be installed at a time - if both are present, you'll be asked to choose which one to keep.
- Thunderstore package files (manifest.json, icon.png) from newly installed mods are no longer copied into the shared mod loader folder, where they collided between mods.

## [0.1.5] - 2026-09-28

- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Game version now shows the real game build instead of the Unity engine version.

## [0.1.4] - 2026-09-13

- Updated: BepInExConfigManager now automatically checks for and installs the latest version instead of staying pinned to 18.4.1, and shows its proper name in the mod list
- Fixed: The "Download BepInExConfigManager" button did nothing when the mod was already installed. It now always downloads and reinstalls it
- Updated: BepInEx now installs a newer bleeding edge build
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.

## [0.1.3] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.1.2] - 2026-03-22

- Fixed: Typo in a function name

## [0.1.1] - 2026-03-16

- Fixed: Bump BepInEx BE to version 755 and corrected displayed version
- Added: Button to download BepInExConfigManager

## [0.1.0] - 2025-10-15

- Initial release
