# Changelog

## [1.0.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.
- Fixed: A mod archive containing another archive with an upper-case extension (.ZIP, .RAR, .7Z) is now installed as it is instead of being packed into another zip.

## [0.2.0] - 2026-01-27

- Added Xbox Game Pass version support
