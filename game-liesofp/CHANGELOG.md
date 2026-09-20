# Changelog

## Planned Improvements (Not Yet Released)

- None

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
