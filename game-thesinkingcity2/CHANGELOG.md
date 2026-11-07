# Changelog

## [1.2.1] - 2026-11-06

- Fixed: A UE4SS installed manually (outside Vortex) is now detected, so the UE4SS and LogicMods load orders and the UE4SS settings update work with it.

## [1.2.0] - 2026-11-05

- Changed: LogicMods (Blueprint) mods now always install directly into the LogicMods folder. Installed mods convert automatically when you next manage the game. Deploy when prompted.
- Added: A notification when a pak mod looks like a Blueprint mod, with a button to set it as a LogicMods mod.

## [1.1.6] - 2026-11-01

- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [1.1.5] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.1.4] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.1.3] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: The "Open LogicMods Folder" button now opens the LogicMods folder instead of the Paks folder.

## [1.1.2] - 2026-09-27

- Game version now shows the real game build instead of the Unreal engine version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.1.1] - 2026-09-21

- Fixed: A pak mod installed through a FOMOD wizard (checkbox installer) now shows up on the Load Order page and gets a proper sorted deployment position, instead of silently deploying unsorted with no way to reorder it against other pak mods.

## [1.1.0] - 2026-09-13

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Changed: "Download UE4SS" now downloads and installs the correct UE4SS build on its own, instead of opening a browser page and asking you to pick the file by hand.
- Added: Vortex now checks for UE4SS updates and notifies you when a newer build is available.
- Fixed: The UE4SS download could accept the development build, a much larger debug version, in place of the normal one.

## [1.0.1] - 2026-09-06

- Fixed: Locked load order entries could be moved out of position when using "Move to Top", "Move to Bottom" or the position number box on another entry. Locked entries now keep their place.
- Fixed: The load order position number box now accepts low numbers even when a locked entry is further down the list.

## [1.0.0] - 2026-08-24

- Initial release
