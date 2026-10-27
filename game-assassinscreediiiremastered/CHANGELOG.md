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

- Added AnvilToolkit support: it is downloaded automatically and available as a tool in Vortex.
- Migrated to the updated Anvil template. Mods can now be installed as unpacked/extracted .forge and .data folders, with a rename prompt and automatic repacking via AnvilToolkit, or as loose .forge/.data file replacements.
- Added ResoRep support for texture replacement mods. The extension downloads the correct ResoRep file and writes its settings for you, and texture mods install to the ResoRep folder inside the game folder.
- Added a reminder notification after deploying mods, letting you know to run AnvilToolkit.
- Fixed: the "Installed Version" shown by Vortex was always wrong, since the game's own exe doesn't store a real version number. The extension now reads the actual installed build from Steam, Epic, or the Ubisoft Connect install data instead.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.1] - 2026-08-11

- Added Epic Games Store support

## [0.1.0]

- Initial release
