# Changelog

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Fixed: Mod archives containing README, CHANGELOG, or LICENSE files are no longer flagged as file conflicts or excluded from deployment
- Fixed: Mod files with no file extension were skipped during installation
- Added "Open PCGamingWiki Page" and "Open SteamDB Page" buttons.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.
- Fixed: A mod archive containing another archive with an upper-case extension (.ZIP, .RAR, .7Z) is now installed as it is instead of being packed into another zip.

## [0.6.1] - 2026-05-10

- Added: Binaries installer for .exe/.dll/.asi/.addon64 files
- Fixed: A few more minor fixes

## [0.6.0] - 2026-05-10

- Fixed: Multiple technical fixes

## [0.5.0]

- Updated Chairloader mod installer to rezip the mods so that they can be manually added in Chairloader (automated installer doesn't work)
