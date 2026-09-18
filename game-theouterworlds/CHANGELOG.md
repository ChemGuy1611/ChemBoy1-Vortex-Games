# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-09-17

- Migrated to file-based load order (FBLO) on the unified UE4-5 template; added lock button, multi-select, right-click context menu, UE4SS Load Order page
- Added UE4SS script/DLL/LogicMods mod support (new - not previously supported)
- Added a "Download UE4SS" button that downloads and installs the correct build automatically, and checks for UE4SS updates
- Added Save mod support (new - not previously supported)
- Kept Unreal Engine Mod Installer (UEMI) dependency for PAK installation - wired via a custom `loadOrderPrefixFunc` so FBLO correctly reorders UEMI-installed paks
- Fixed: Mod files with no file extension were skipped during installation

## [0.5.2] - 2026-05-28

- Fixed: Launching of Spacer's Choice Xbox version

## [0.5.1] - 2026-02-07

- Improved: Made Root folder installer case-insensitive

## [0.5.0] - 2026-02-02

- Fixed: Xbox version support for Spacer's Choice Edition
- Fixed: path strings
- Added: Custom launch tools for Classic and Spacer's Choice Edition
- Added: Buttons to open several files/folders/URLs
- Added: Deployment notification after changing the load order
- Fixed: Xbox game version detection
