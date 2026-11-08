# Changelog

## Planned Improvements (Not Yet Released)

- Game version now shows the real game build instead of the Unreal engine version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Changed: LogicMods (Blueprint) mods now always install directly into the LogicMods folder. Installed mods convert automatically when you next manage the game. Deploy when prompted.
- Added: A notification when a pak mod looks like a Blueprint mod, with a button to set it as a LogicMods mod.
- Fixed: Mod files whose names only begin with README, CHANGELOG, or LICENSE (for example, License_Plates.dds) are no longer skipped during deployment.
- Added: README and CHANGELOG files spelled with a hyphen, underscore, or space (for example, READ_ME.txt or Change Log.md) are now excluded from mod conflict detection and deployment.

## [1.0.2] - 2026-11-01

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: The "Open LogicMods Folder" button now opens the LogicMods folder instead of the Paks folder.
- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [1.0.1] - 2026-09-06

- Fixed: Locked load order entries could be moved out of position when using "Move to Top", "Move to Bottom" or the position number box on another entry. Locked entries now keep their place.
- Fixed: The load order position number box now accepts low numbers even when a locked entry is further down the list.

## [1.0.0] - 2026-08-27

- Initial release
