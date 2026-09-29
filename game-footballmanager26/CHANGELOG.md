# Changelog

## Planned Improvements (Not Yet Released)

## [1.1.2] - 2026-09-27

- Game version now shows the real game build instead of the Unity engine version.

## [1.1.1] - 2026-09-27

- Fixed: a non-Xbox install could be misidentified as the Xbox version, showing the wrong installed game version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.1.0] - 2026-09-20

- Added: "Browse Thunderstore" page, which opens the Football Manager 26 Thunderstore site inside Vortex. Downloads started from it are installed, enabled, and named automatically, and any mods they depend on can be installed with them.
- Added: Update notifications for mods installed from the Thunderstore page.

## [1.0.0] - 2026-09-19

- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- BepInEx and MelonLoader downloads now automatically check for and install the latest version instead of a fixed one.
- Added: BepInExConfigManager can now be downloaded and is kept up to date automatically.
- Changed: Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other.

## [0.1.1] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.1.0] - 2025-11-04

- Initial release
