# Changelog

## [1.0.0] - 2026-09-29

- Migrated to the updated Anvil template. Mods can now be installed as unpacked/extracted .forge and .data folders, with a rename prompt and automatic repacking via AnvilToolkit, or as loose .forge/.data file replacements.
- Added a reminder notification after deploying mods, letting you know to run AnvilToolkit.
- Fixed: the "Installed Version" shown by Vortex was always wrong, since the game's own exe doesn't store a real version number. The extension now reads the actual installed build from Steam, Epic, or the Ubisoft Connect install data instead.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.1] - 2026-08-11

- Added Epic Games Store support

## [0.1.0]

- Initial release
