# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.1.0] - 2026-09-20

- Added: "Browse Thunderstore" page, which opens the ASKA Thunderstore site inside Vortex. Downloads started from it are installed, enabled, and named automatically, and any mods they depend on can be installed with them.
- Added: Update notifications for mods installed from the Thunderstore page.

## [1.0.0] - 2026-09-18

- BepInEx and BepInExConfigManager downloads now automatically check for and install the latest version instead of a fixed one.
- Changed: Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.

## [0.1.4] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.1.3] - 2026-04-03

- Fixed: Typo that would cause Vortex startup to fail on 2.0.0-alpha.3

## [0.1.2] - 2026-03-16

- Added: Notification and button to download latest BepInExConfigurationManager

## [0.1.1] - 2026-03-15

- Changed: BepInEx is now the downloaded without a popup choice, since it has become the standard for modding. MelonLoader can still be installed manually and is supported
- Added: Button to browse to download the latest BepInEx BE version
- Fixed: Bump BepInEx BE version to 755 and fix URL
- Added: .NET 6 installation check and notification for MelonLoader
- Added: Automatic detection of BepInEx patchers

## [0.1.0] - 2025-11-22

- Initial release
