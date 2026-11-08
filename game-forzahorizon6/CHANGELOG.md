# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod files whose names only begin with README, CHANGELOG, or LICENSE (for example, License_Plates.dds) are no longer skipped during deployment.
- Added: README and CHANGELOG files spelled with a hyphen, underscore, or space (for example, READ_ME.txt or Change Log.md) are now excluded from mod conflict detection and deployment.

## [2.0.1] - 2026-11-01

- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [2.0.0] - 2026-10-30

- Changed: Mods with loose game sub-folders (like "cars" or "tracks") now install inside the "mediapc" folder instead of the "media" folder.
- Fixed: Mods with a game sub-folder nested inside another (for example "cars\_library") now install from the outer folder.
- Added: More of the game's media folder names are now recognised (for example "animation", "camera", "sky" and "rules").
- Added: Loose files that replace game files (for example camera settings) now install into the matching "mediapc" sub-folder.
- Added: Car and sky mods are packed into a zip in "mediapc\cars" or "mediapc\hdrskies", and Vortex asks which car or sky they replace.
- Fixed: Car mods no longer install into the "mediapc\UI" folder.
- Added: "Loose Files", "Car Mod" and "Sky Mod" mod types, so these mods are labelled by kind in the mod list.

## [1.0.3] - 2026-10-30

- Added: Mods containing a "mediapc" folder now install to the game folder.

## [1.0.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder whose name contains the name of the mod's own folder or file (for example "MyData" for "Data") now install into the right place.

## [0.1.0] - 2026-05-20

- Initial Release
