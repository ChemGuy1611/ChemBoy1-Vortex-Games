# Changelog

## Planned Improvements (Not Yet Released)

## [1.0.1] - 2026-09-27

- Fixed: a non-Xbox install could be misidentified as the Xbox version, showing the wrong installed game version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.0.0] - 2026-09-18

- BepInEx and BepInExConfigManager downloads now automatically check for and install the latest version instead of a fixed one.
- Changed: BepInExConfigManager now downloads and installs automatically once BepInEx is detected, instead of requiring a manual button click.
- Changed: Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.

## [0.1.2] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.1.1] - 2026-03-06

- Fixed: Changed to new BepInEx mod page
- Changed: BepCfgMan is now downloaded from Nexus Mods

## [0.1.0] - 2026-02-18

- Initial release
