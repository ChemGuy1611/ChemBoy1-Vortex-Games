# Changelog

## [1.0.3] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with a game folder's name (for example "MyData" for "Data") now install into the right place instead of a doubled folder.
- Fixed: Plugins with an upper-case ".JS" file extension are now named and listed correctly.
- Changed: The Load Order page no longer pauses plugin list updates while mods are being purged.
- Fixed: After mods are purged, the next deploy now adds the deployed plugins back to plugins.js. They used to stay out until the load order was changed.

## [1.0.0] - 2026-10-07

- Initial Release
