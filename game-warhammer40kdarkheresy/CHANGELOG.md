# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: After mods were purged, the next deploy left the mod lists in OwlcatModificationManagerSettings.json empty until the load order was changed. The load order is now written back on that deploy.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [0.1.0] - 2026-XX-XX

- Inital Release
