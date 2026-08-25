# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [1.0.1] - 2026-08-24

- Fixed: Deploying could fail with an error when the load order had not been read yet, which can happen while installing a collection.
- Fixed: The load order no longer stops working for the rest of the session if its file cannot be read or is damaged.

## [1.0.0] - 2026-08-16

- Added: New load order page. Mods can be locked in place, selected in groups with Ctrl and Shift, and reordered from a right-click menu with Move to Top and Move to Bottom.
- Added: Filter the load order by status (enabled, disabled, locked, unlocked, unmanaged).
- Added: Right-click a load order entry to open its staging folder or its mod page.
- Added: Enable or disable a mod directly from its load order entry.
- Added: "Open Paks Folder" and "Open Binaries Folder" buttons.
- Added: Game version is now reported on the game tile.
- Fixed: The pak file count shown beside a mod name counted files that were not installed.
- Fixed: Load order positions were lost when updating a mod.

## [0.5.2] - 2026-03-16

- Fixed: Removed checkboxes from Load Order as they are not functional

## [0.5.1] - 2026-02-03

- Fixed: path strings
- Improved: Made Root Folder mod installer case-insensitive to folder name

## [0.5.0] - 2025-12-09

- Fixed issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added notification indicating deployment is required after changing the load order.
- Fixed missing FOMOD installer check for pak mods.
- Technical fixes and improvements.

## [0.4.2] - 2025-11-10

- Minor technical fixes and improvements.

## [0.4.1] - 2025-05-08

- Added automatic download of UTOC Signature Bypass mod as it is required for almost all mods.
- Improved notification for config installer.

## [0.4.0] - 2025-04-13

- Extension now requires hardlinks due to introduction of IO-Store UE feature. Symlink deployment is no longer available.
- Updated extension to handle IO Store pak mods with .ucas and .utoc files.
- Config modtype is now only available if the game, staging folder, and Local AppData folders are all on the same drive (due to lack of symlinks support).

## [0.3.5] - 2025-04-02

- Fixed launcher requirement for Steam version.

## [0.3.4] - 2025-04-02

- Made discovery and launcher code more reliable.
- Added buttons to open Config and Vortex Downloads folders - folder icon in Mods toolbar.
- Removed some unused code.
- Fixed mods not from Nexus Mods not being sortable in load order.
