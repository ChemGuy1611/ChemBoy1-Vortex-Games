# Changelog

## [1.2.1] - 2026-11-01

- Changed: manifest.json and icon.png files are no longer skipped during deployment.

## [1.2.0] - 2026-10-30

- Added: Railroader home folder setting (Settings > Mods). If you move the game's home folder with the "-homedir" Steam launch option, set the same folder here so native mods deploy where the game reads them. "Use Steam's Folder" reads it from your Steam launch options.
- Added: Vortex warns when Steam starts the game with a different home folder than Vortex uses.
- Added: "Open Home Folder" button (game settings and logs).
- Fixed: "Open Save Folder" now opens the save folder in the game's home folder.

## [1.1.1] - 2026-10-30

- Fixed: Native Railroader mods now install into "Documents\Railroader\Mods", where the game reads them, instead of the game's "Mods" folder.
- Added: "Open Native Mods Folder" button.

## [1.1.0] - 2026-10-30

- Added: Support for native Railroader mods (Railroader 2026.1 and later). They install into the "Mods" folder and show as "Native Mod" in the mod list.

## [1.0.6] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.5] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.4] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with a game folder's name (for example "MyData" for "Data") now install into the right place instead of a doubled folder.
- Fixed: The "Open Save Folder" button now opens the save folder.

## [1.0.3] - 2026-10-05

- Unity Mod Manager mods are now recognised by their "info.json" alone. A ".dll" is optional, so mods with or without one install.
- Archives containing several Unity Mod Manager mod folders now install all of them, instead of only the first.

## [1.0.2] - 2026-09-28

- Game version now shows the real game build instead of the Unity engine version.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.0.1] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [1.0.0] - 2026-08-24

- Initial Release
