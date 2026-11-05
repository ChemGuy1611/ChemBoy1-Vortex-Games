# Changelog

## [1.2.0] - 2026-11-05

- Changed: LogicMods (Blueprint) mods now always install directly into the LogicMods folder. Installed mods convert automatically when you next manage the game. Deploy when prompted.
- Added: A notification when a pak mod looks like a Blueprint mod, with a button to set it as a LogicMods mod.

## [1.1.4] - 2026-11-01

- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [1.1.3] - 2026-10-29

- Fixed: Error when starting Vortex before the game was discovered.

## [1.1.2] - 2026-10-29

- Fixed: Save mods on the Epic version now install to the Epic save folder.

## [1.1.1] - 2026-10-28

- Fixed: Save mods now install to the game folder, where the game keeps its saves

## [1.1.0] - 2026-10-22

- Added: Epic Games Store version support.

## [1.0.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: The "Open LogicMods Folder" button now opens the LogicMods folder instead of the Paks folder.

## [1.0.0] - 2026-10-07

- Initial release
