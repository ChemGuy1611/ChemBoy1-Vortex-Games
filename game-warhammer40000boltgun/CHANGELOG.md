# Changelog

## [1.0.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name ends with a game folder's name (for example "MyContent" for "Content") now install into the right place instead of a doubled folder.
- Added: UE4SS Load Order page to enable, disable and reorder UE4SS script and DLL mods.
- Added: LogicMods Load Order page to enable, disable and reorder Blueprint (LogicMods) mods.
- Added: Config and Save mod types, so config files and save files can be installed from Vortex (needs the game, the Vortex staging folder and Local AppData on the same drive).
- Added: "Open Paks Folder", "Open Binaries Folder", "Open Config Folder", "Open Saves Folder" and "Open Nexus Mods Page" buttons.
- Added: Vortex now notifies you when a newer UE4SS build is available.
- Added: A notification when a mod doesn't match any known layout and was installed as-is.
- Changed: The game now launches through its main executable (Warhammer 40,000 Boltgun.exe) instead of the shipping executable.

## [0.4.0] - 2026-04-06

- Added: UE4SS support

## [0.3.0]

- Initial release
