# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.0] - 2026-09-18

- Migrated to file-based load order (FBLO) on the unified UE4-5 template; added lock button, multi-select, right-click context menu, UE4SS Load Order page
- Added UE4SS script/DLL/LogicMods mod support (new - not previously supported)
- Added a "Download UE4SS" button that downloads and installs the correct build automatically, and checks for UE4SS updates
- Kept Unreal Engine Mod Installer (UEMI) dependency for PAK installation - wired via a custom `loadOrderPrefixFunc` so FBLO correctly reorders UEMI-installed paks
- Fixed: Mod files with no file extension were skipped during installation

## [0.2.2]

- Initial release
