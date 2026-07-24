# Changelog

## Planned Improvements (Not Yet Released)

- None

## [0.3.0] - 2026-07-22

- Added: Updating a mod no longer unchecks it or moves it in the load order (Pak, UE4SS, and LogicMods pages), including on profiles other than the one you're using.

## [0.2.0] - 2026-07-22

- Migrated to file-based load order (FBLO) on the unified UE4-5 template; added lock button, multi-select, right-click context menu, UE4SS Load Order page
- Added UE4SS script/DLL/LogicMods mod support (new - not previously supported)
- Added Xbox Game Pass version support
- Kept Unreal Engine Mod Installer (UEMI) dependency for PAK installation - wired via a custom `loadOrderPrefixFunc` so FBLO correctly reorders UEMI-installed paks

## [0.1.1]

- Initial release
