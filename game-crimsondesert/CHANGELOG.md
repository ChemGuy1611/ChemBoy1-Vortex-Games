# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [0.3.0] - 2026-04-24

- Fixed: Updated support for Crimson Sharp (formerly Crimson Browser)
- Fixed: Updated for Save Editor standalone executable
- Added: Installer handling for mods like Character Creator mod (has additional layer of folder nesting and includes plugin)

## [0.2.8] - 2026-04-15

- Added: .addon64 files will install to the bin64 folder properly

## [0.2.7] - 2026-04-08

- Fixed: removed manifest.json check from Crimson Browser mod installer - prevent mods installed to game root when meant for JSON Mod Manager

## [0.2.6] - 2026-04-07

- Added: Auto-download JSON Mod Manager if not installed to the game folder yet (required to install most mods)

## [0.2.5] - 2026-04-06

- Added: Support for .dds texture mods - installed via JSON Mod Manager

## [0.2.4] - 2026-03-29

- Fixed: Better checks for Python installation when setting up Crimson Browser

## [0.2.3] - 2026-03-29

- Added: Deployment notifications with buttons to run Crimson Browser and/or JSON Mod Manager
- Fixed: Removed attempt to install Python dependencies for Crimson Browser - no longer required

## [0.2.2] - 2026-03-28

- Changed: Patch mod installer updated for new modding patterns (JSON/QT Mod Managers) - "0036+" folders
- Fixed: New name for JSON Mod Manager executable v7.5+
- Added: Separate installer for JSON mods with no data files
- Removed: CD Mod Manager tool and download button (not currently available)
- Removed: Unpacker download button (deprecated)

## [0.2.1] - 2026-03-26

- Added: Download buttons and setup scripts for tools
- Crimson Browser - will attempt to install dependencies and add game path to config file - Python 3.10+ REQUIRED

## [0.2.0] - 2026-03-25

- Added: Support for multiple new mod installers and formats, including launch tools:
- Crimson Browser (manifest.json and "files" folder)
- CD Mod Manager (.cdmod files)
- JSON Mod Manager (.json files)

## [0.1.2] - 2026-03-24

- Added: "meta" folder to Root Installer
- Added: Launch tool for Save Editor

## [0.1.1] - 2026-03-23

- Added: Root Folder installer (bin64, 0000, 0001, ..., 0035)
- Added: Installer and launch tool for Unpacker
- Added: Fallback installer to root folder with notification - includes link to ReShade installer

## [0.1.0] - 2026-03-22

- Initial Release
