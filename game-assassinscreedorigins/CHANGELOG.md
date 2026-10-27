# Changelog

## [1.0.3] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with a game folder's name (for example "MyData" for "Data") now install into the right place instead of a doubled folder.
- Fixed: The manual-rename notice no longer cuts letters out of mod names that contain "rar", "zip" or "7z" (for example "Hunter rarity"), so its Open Mod Page and rename buttons find the mod.
- Fixed: If renaming an extracted .forge folder fails, your mods are now redeployed instead of staying purged.

## [1.0.0] - 2026-09-29

- Migrated to `template-anvilengine`. Added ResoRep support for texture replacement mods — the extension now auto-downloads the correct file and writes its settings automatically. Texture mods now install inside the game folder instead of Documents; mods installed under the old Documents-based type are migrated automatically
- Mods can now be installed as unpacked/extracted .forge and .data folders, with a rename prompt and automatic repacking via AnvilToolkit, or as loose .forge/.data file replacements
- Added support for DLC-specific mods — a .forge file naming its DLC now deploys to the correct dlc_NN folder automatically
- Added a separate "Binaries / Root Folder" mod type
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: the "Installed Version" shown by Vortex was always wrong, since the game's own exe doesn't store a real version number. The extension now reads the actual installed build from Steam, Epic, or the Ubisoft Connect install data instead.
- Added a reminder notification after deploying mods, letting you know to run AnvilToolkit or Forger Patch Manager.
- Fixed: the deploy reminder's "Run Forger Patch Manager" button showed up even when Forger Patch Manager wasn't actually installed.
- Shortened the "Run AnvilToolkit"/"Run Forger Patch Manager" deploy reminder buttons to "Run ATK"/"Run Forger".

## [0.2.3] - 2026-08-11

- Added Epic Games Store support

## [0.2.2]

- Initial release
