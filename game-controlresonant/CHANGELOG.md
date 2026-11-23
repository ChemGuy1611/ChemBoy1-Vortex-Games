# Changelog

## [1.3.1] - 2026-11-23

- Changed: Updated the extension's info.json to the latest Vortex format.

## [1.3.0] - 2026-11-19

- Added: Load Order page for Resonant Mod Manager mods. The order and enabled state you set in Vortex are saved to the manager's mod list, and changes saved in the manager show up in Vortex.
- Fixed: Resonant Mod Manager mod folders are now named after the mod instead of the full download file name.

## [1.2.0] - 2026-11-18

- Fixed: Mod files whose names only begin with README, CHANGELOG, or LICENSE (for example, License_Plates.dds) are no longer skipped during deployment.
- Added: README and CHANGELOG files spelled with a hyphen, underscore, or space (for example, READ_ME.txt or Change Log.md) are now excluded from mod conflict detection and deployment.
- Added: Resonant Mod Manager support. The manager installs to the game folder and can be launched from Vortex's Tools.
- Added: When Resonant Mod Manager is installed, data_pack2 resource mods install into the "Mods" folder so the manager can merge them. After deploying, a notification reminds you to build your mods in the manager.

## [1.1.0] - 2026-10-29

- Added: GOG version support.

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
