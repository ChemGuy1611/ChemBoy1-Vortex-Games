# Changelog

## [1.0.3] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.2] - 2026-10-12

- Added: A fallback installer. A mod no other installer recognises is now copied into the game folder as it is, with a notice explaining where it went.
- Changed: The game's data folder is now checked for write access during setup, along with the plugins folder.
- Fixed: Mods packaged inside an outer folder whose name ends with a game folder's name (for example "MyData" for "Data") now install into the right place instead of a doubled folder.
- Fixed: Plugins with an upper-case ".JS" file extension are now named and listed correctly.
- Fixed: After mods are purged, the next deploy now adds the deployed plugins back to plugins.js. They used to stay out until the load order was changed.

## [1.0.1] - 2026-10-02

- Fixed: Updating a mod no longer resets its plugins' position and enabled state on the Load Order page. Reordering is paused with a notice until the update finishes.

## [1.0.0] - 2026-09-29

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Installed plugins can now be reordered and enabled/disabled from Vortex's Load Order page, which keeps plugins.js in sync automatically. Only mod-installed plugins are listed - the game's built-in plugins are left alone.
- The Load Order page now shows mod thumbnails, lets you lock a plugin's position, filter the list by status, and right-click a plugin for a menu with move-to-top/bottom, open staging folder, open mod page, and enable/disable options.
- Purging mods now removes their plugin entries from plugins.js - the game's own built-in plugins are left alone.
- Added an "Edit Parameters" button to each plugin on the Load Order page (also in the right-click menu), so a plugin's description and configuration can be set without hand-editing plugins.js.

## [0.2.1] - 2026-08-11

- Added GOG support

## [0.2.0] - 2026-08-03

- Fixed: Paths are now built safely on all systems.
- Added: Buttons to open the game's PCGamingWiki page and submit a bug report.
- Changed: Extension is smaller and loads faster.

## [0.1.1] - 2025-09-18

- js plugins will now be written to plugins.js file automatically at mod installation. NOTE - when the game updates, you will need to update the plugins.js file again, either by manually editing it or reinstalling all js plugin mods.

## [0.1.0] - 2025-09-18

- Inital Release
