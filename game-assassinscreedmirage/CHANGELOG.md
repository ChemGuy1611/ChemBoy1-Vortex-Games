# Changelog

## [1.0.5] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.4] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.3] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with a game folder's name (for example "MyData" for "Data") now install into the right place instead of a doubled folder.
- Fixed: The manual-rename notice no longer cuts letters out of mod names that contain "rar", "zip" or "7z" (for example "Hunter rarity"), so its Open Mod Page and rename buttons find the mod.
- Fixed: If renaming an extracted .forge folder fails, your mods are now redeployed instead of staying purged.

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
- Added a "Download ReForger" button. Removed Forger Patch Manager support.

## [0.3.1] - 2026-08-11

- Added Epic Games Store support

## [0.3.0]

- Initial release
