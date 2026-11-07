# Changelog

## [1.2.1] - 2026-11-06

- Fixed: A UE4SS installed manually (outside Vortex) is now detected, so the UE4SS and LogicMods load orders and the UE4SS settings update work with it.

## [1.2.0] - 2026-11-05

- Changed: LogicMods (Blueprint) mods now always install directly into the LogicMods folder. Installed mods convert automatically when you next manage the game. Deploy when prompted.
- Added: A notification when a pak mod looks like a Blueprint mod, with a button to set it as a LogicMods mod.

## [1.1.1] - 2026-11-04

- Changed: Browse pages no longer open ads and other pop-ups in your web browser. A blocked page shows a notification with an "Open" button instead.

## [1.1.0] - 2026-11-03

- Added: "Browse GameBanana" page to browse the game's mods on GameBanana and install them directly in Vortex, with an "Open GameBanana Page" button.

## [1.0.6] - 2026-11-03

- Fixed: LogicMods (Blueprint) mods installing into a second LogicMods folder, which stopped mods packaged in a subfolder from loading. Reinstall any affected mods.

## [1.0.5] - 2026-11-01

- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [1.0.4] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.3] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.2] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: Pak + UE4SS combo mods now show up on the UE4SS load order page on the Xbox / Game Pass version, instead of being listed as manual mods.

## [1.0.1] - 2026-09-27

- Game version now shows the real game build instead of the Unreal engine version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.0.0] - 2026-09-18

- Migrated to file-based load order (FBLO); added lock button, multi-select, and right-click context menu.
- Added a UE4SS Load Order page and a LogicMods Load Order page.
- UE4SS now downloads automatically and checks for updates.
- Fixed: GOG version could not install save mods.
- Fixed: Mod files with no file extension were skipped during installation.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.

## [0.2.1] - 2026-02-04

- Fixed: Wrong variable name in a couple open buttons

## [0.2.0] - 2026-02-03

- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names

## [0.1.8] - 2026-01-30

- Fixed: path strings

## [0.1.7] - 2025-12-23

- Added notification indicating deployment is required after changing the load order.

## [0.1.6] - 2025-12-18

- Fixed cannot deploy errors that could occur if the game was installed to C Drive and the user had never launched the game before.
- Fixed game version detection for Xbox game store version.
- Technical fixes and improvements.

## [0.1.5] - 2025-09-25

- Added GOG version support.

## [0.1.4] - 2025-06-15

- Added tool for Save Editor.
- Fixed version detection for all game store versions.

## [0.1.3] - 2025-05-22

- Improved the config installer notification.
- Added save (.sav) installer - Steam and Epic versions only.

## [0.1.2] - 2025-05-16

- Fixed a null error that could occur when sending the config mod notification.

## [0.1.1] - 2025-05-03

- Added Epic version support. Thanks to user j34nT0k for the info.

## [0.1.0] - 2025-04-23

- Initial release
