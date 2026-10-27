# Changelog

## [1.2.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.2.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.2.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [1.1.1] - 2026-09-08

- Fixed: A required mod loader or tool is no longer mistaken for an unrelated Nexus mod that shares the same file, which could show the wrong mod details or offer a bogus update for it
- Fixed: Downloads fetched for a required mod loader or tool now show "Website" as their source instead of being left blank

## [1.1.0] - 2026-09-01

- Added: Support for Resonance Framework (auto-download) and its texture mods
- Added: Ultimate ASI Loader auto-download and update - required by Resonance Framework
- Added: Launch tool for Texture Studio

## [1.0.0] - 2026-08-30

- Initial Release
