# Changelog

## FUTURE CHANGES (NOT YET IMPLEMENTED)

- None Planned

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
