# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod files whose names only begin with README, CHANGELOG, or LICENSE (for example, License_Plates.dds) are no longer skipped during deployment.
- Added: README and CHANGELOG files spelled with a hyphen, underscore, or space (for example, READ_ME.txt or Change Log.md) are now excluded from mod conflict detection and deployment.

## [1.0.1] - 2026-11-01

- Changed: manifest.json and icon.png files are no longer skipped during deployment.

## [1.0.0] - 2026-10-27

- Initial release
- Automatically downloads and installs the MoonSweepers BepInEx Patcher from Nexus Mods when BepInEx is installed (required for BepInEx plugins to load).
