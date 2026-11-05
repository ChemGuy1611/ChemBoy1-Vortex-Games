# Changelog

## [1.1.1] - 2026-11-04

- Changed: Browse pages no longer open ads and other pop-ups in your web browser. A blocked page shows a notification with an "Open" button instead.

## [1.1.0] - 2026-11-03

- Added: "Browse GameBanana" page to browse the game's mods on GameBanana and install them directly in Vortex, with an "Open GameBanana Page" button.

## [1.0.3] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with a game folder's name (for example "MyData" for "Data") now install into the right place instead of a doubled folder.

## [1.0.0] - 2026-10-03

- Added a fallback installer: when no other installer matches a mod, Vortex now shows a notice and installs the files to the game folder.
- Setup now makes sure the Reloaded mod and save folders in the game folder are writable.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.1.2] - 2025-10-14

- Added text information and button to run Reloaded-II as Admin to setup notification (needed to install dependencies if running from protected folder).
- Added deploy notification with a button to run Reloaded-II as Admin after deployment.

## [0.1.1] - 2025-10-09

- Added button to open Saves folder ("gamedata/savedata").
- Improved setup notification text.

## [0.1.0] - 2025-10-04

- Initial Release
