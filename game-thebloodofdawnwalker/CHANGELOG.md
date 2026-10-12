# Changelog

## Planned Improvements (Not Yet Released)

- Game version now shows the real game build instead of the Unreal engine version.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Changed: "Download UE4SS" now downloads and installs the correct UE4SS build on its own, instead of opening a browser page and asking you to pick the file by hand.
- Added: Vortex now checks for UE4SS updates and notifies you when a newer build is available.
- Fixed: The UE4SS download could accept the development build, a much larger debug version, in place of the normal one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: Pak + UE4SS combo mods now show up on the UE4SS load order page on the Xbox / Game Pass version, instead of being listed as manual mods.
- Fixed: The "Open LogicMods Folder" button now opens the LogicMods folder instead of the Paks folder.

## [1.0.2] - 2026-09-17

- Fixed: The Xbox version of the game could not be launched through Vortex due to incorrect Xbox launch information.

## [1.0.1] - 2026-09-06

- Fixed: Locked load order entries could be moved out of position when using "Move to Top", "Move to Bottom" or the position number box on another entry. Locked entries now keep their place.
- Fixed: The load order position number box now accepts low numbers even when a locked entry is further down the list.

## [1.0.0] - 2026-09-01

- Initial release
