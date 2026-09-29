# Changelog

## [1.0.0] - 2026-09-29

- Migrated to `template-anvilengine`. Added ReForger support alongside the existing Forger Patch Manager, with a "Download ReForger" button
- Mods can now be installed as direct .forge file replacements, without needing a tool
- Added support for DLC-specific mods — a .forge file naming its DLC now deploys to the correct dlc_NN folder automatically
- Added a fallback installer and a root-folder installer for mods that don't fit another category
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: the "Installed Version" shown by Vortex was always wrong, since the game's own exe doesn't store a real version number. The extension now reads the actual installed build from Steam or the Ubisoft Connect install data instead.
- Added a reminder notification after deploying mods, letting you know to run Forger Patch Manager.
- Fixed: the deploy reminder notification's "Run ReForger" button showed up even when ReForger wasn't actually installed.
- Fixed: the deploy reminder's "Run Forger Patch Manager" button showed up even when Forger Patch Manager wasn't actually installed. Also shortened it to "Run Forger".

## [0.1.4] - 2026-08-11

- Added Epic Games Store support

## [0.1.3]

- Initial release
