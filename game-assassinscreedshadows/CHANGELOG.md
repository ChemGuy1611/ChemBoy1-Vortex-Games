# Changelog

## [1.0.2] - 2026-09-29

- Fixed: the deploy reminder notification's "Run ReForger" button showed up even when ReForger wasn't actually installed.
- Shortened the "Run AnvilToolkit" deploy reminder button to "Run ATK".

## [1.0.1] - 2026-09-28

- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: the "Installed Version" shown by Vortex was always wrong, since the game's own exe doesn't store a real version number. The extension now reads the actual installed build from Steam, Epic, or the Ubisoft Connect install data instead.

## [1.0.0] - 2026-09-23

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Added support for unpacked mods (Extracted/.forge/.data folders) using AnvilToolkit.
- Forge replacement files belonging to a DLC now install to the correct DLC folder automatically.
- Added support for Forger-format texture patches (.dds files).
- Added a "Download ReForger" button. Removed Forger Patch Manager support, which was never actually functional for this game.

## [0.1.2] - 2026-08-11

- Added Epic Games Store support
- Steam version now launches through Steam

## [0.1.1]

- Added mod installer tests for .forge files to put files in the correct dlc folder, if necessary.
- Removed some unused mod installers.

## [0.1.0]

- Intial release
