# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [1.0.5] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.4] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.3] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [1.0.2] - 2026-10-09

- Fixed: Disabled symlinks as they don't work with the dll mod loader. You must place the staging folder on the same drive as the game and use hardlinks instead.

## [1.0.1] - 2026-09-30

- Fixed: Added "crmods" folder to the list of root folders to avoid triggering the fallback notification for f2g DLL mods.

## [1.0.0] - 2026-09-24

- Initial Release
