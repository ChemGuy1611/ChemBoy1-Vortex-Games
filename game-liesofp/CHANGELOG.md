# Changelog

## [1.2.2] - 2026-11-06

- Fixed: A UE4SS installed manually (outside Vortex) is now detected, so the UE4SS and LogicMods load orders and the UE4SS settings update work with it.

## [1.2.1] - 2026-11-06

- Changed: The "Download UE4SS" button now installs "UE4SS for Lies of P", the custom build made for this game that mods require.

## [1.2.0] - 2026-11-05

- Changed: LogicMods (Blueprint) mods now always install directly into the LogicMods folder. Installed mods convert automatically when you next manage the game. Deploy when prompted.
- Added: A notification when a pak mod looks like a Blueprint mod, with a button to set it as a LogicMods mod.

## [1.1.6] - 2026-11-01

- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [1.1.5] - 2026-10-28

- Fixed: Config and Save mods on the Steam and Epic versions now install to the game folder, where the game actually reads them

## [1.1.4] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.1.3] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.1.2] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of an expected folder (for example "MyContent" for "Content") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Blueprint (LogicMods) mods with an upper-case ".PAK" extension now get the correct name on the LogicMods load order.
- Fixed: Pak + UE4SS combo mods now show up on the UE4SS load order page on the Xbox / Game Pass version, instead of being listed as manual mods.
- Fixed: The "Open LogicMods Folder" button now opens the LogicMods folder instead of the Paks folder.

## [1.1.1] - 2026-09-27

- Game version now shows the real game build instead of the Unreal engine version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.1.0] - 2026-09-19

- Dropped the Unreal Engine Mod Installer (UEMI) dependency - pak mod installation is now self-contained, and existing pak mods migrate automatically on update
- Added support for a FOMOD-packaged pak mod to correctly appear on the Load Order page

## [1.0.0] - 2026-09-17

- Overhauled Load Order: drag-and-drop reordering for Paks mods, replacing the old load order system
- Added UE4SS script, DLL, and LogicMods (Blueprint) mod support, each with its own load order page
- Added Save mod support
- Fixed: mod files with no file extension were skipped during installation
- Fixed: Config and Save mods on the Steam and Epic versions were installing to a folder that doesn't exist and had no effect in-game

## [0.5.1] - 2026-08-11

- Added Epic Games Store support
- Steam version now launches through Steam

## [0.5.0] - 2026-05-07

- Fixed: Multiple technical issues

## [0.4.0] - 2025-06-17

- Many technical fixes to improve the extension.
- Added installers for save and config mods on both Xbox and Steam versions. Fixed paths for Steam version.
- Added buttons for opening useful folders and files (folder icon in Mods toolbar).
