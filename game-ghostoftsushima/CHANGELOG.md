# Changelog

## [1.0.3] - 2026-11-09

- Fixed: .psarc mods no longer fail to install with an error. Cancelling the variant choice now cancels the install.
- Fixed: Mod files whose names only begin with README, CHANGELOG, or LICENSE (for example, License_Plates.dds) are no longer skipped during deployment.
- Added: README and CHANGELOG files spelled with a hyphen, underscore, or space (for example, READ_ME.txt or Change Log.md) are now excluded from mod conflict detection and deployment.

## [1.0.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [0.2.0] - 2025-10-02

- Enhanced psarc mod installer to handle mods with psarc files in multile folders or with variants of the same psarc file name.
- Added custom launch tool.
- Added buttons to open Config & Save folders, changelog, and Vortex downloads folder (folder icon in Mods toolbar).

## [0.1.8] - 2025-09-19

- Added Epic Games ID and full support.
- General technical improvements.
