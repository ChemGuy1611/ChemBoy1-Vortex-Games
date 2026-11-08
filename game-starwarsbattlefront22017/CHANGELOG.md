# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod files whose names only begin with README, CHANGELOG, or LICENSE (for example, License_Plates.dds) are no longer skipped during deployment.
- Added: README and CHANGELOG files spelled with a hyphen, underscore, or space (for example, READ_ME.txt or Change Log.md) are now excluded from mod conflict detection and deployment.

## [1.2.1] - 2026-11-04

- Changed: Browse pages no longer open ads and other pop-ups in your web browser. A blocked page shows a notification with an "Open" button instead.

## [1.2.0] - 2026-11-03

- Added: "Browse GameBanana" page to browse the game's mods on GameBanana and install them directly in Vortex, with an "Open GameBanana Page" button.

## [1.1.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.1.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.1.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder named like one of the mod's key files (for example "plugin.dll.old") now install into the right place.

## [1.0.3] - 2026-07-02

- Fixed: Path typo in Frosty install check fallback

## [1.0.2] - 2026-06-16

- Fixed: Typo in registry discovery key
- Added: .fbpack file support

## [1.0.1] - 2026-05-01

- Added: Buttons to open Frosty manager_config.json and Enable/Disable DatapathFix Plugin

## [1.0.0] - 2026-04-30

- Initial Release of new ChemBoy1 extension
