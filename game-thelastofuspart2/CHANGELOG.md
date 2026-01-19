# Changelog

## FUTURE CHANGES (NOT YET IMPLEMENTED)

- Added check for if sp-common.psarc and bin.psarc files exist in the game folder (indicator of update and need to extract).

## [0.6.2] - 2026-01-19

- Fixed: More reliable folder deletion operations - revised deprecated fsPromises.rmdir function to fsPromises.rm
- Added: Full Epic version support

## [0.6.1] - 2025-07-14

- Slight optimization to the load order code.
- Mods will now maintain their load order position when updating. Thanks to infarctus.
- Updated bundled ndarc executable to v220.

## [0.6.0] - 2025-04-14

- Extension now writes .psarc mod file names from the "mods" folder to chunks.txt file automatically, based on the load order.
- Updated bundled ndarc executable to v190.
- Added button to open chunks.txt file - folder icon in Mods toolbar.

## [0.5.2] - 2025-04-09

- Updated bundled ndarc executable to v185.
- Removed some unused code.

## [0.5.1] - 2025-04-09

- Fixed reference error when sending an error notification if .psarc file extraction was not completed.
- Improved check for whether .psarc extraction was successful.
- Added check for extracted folders presence before sending notification to extract .psarc files.

## [0.5.0] - 2025-04-06

- Added load ordering for .psarc files in the Mod Loader's "mods" folder. Load Order is stored in the modloader.ini file.

## [0.4.1] - 2025-04-06

- Added a notification while .psarc extraction is running.
- Fixed some typos.

## [0.4.0] - 2025-04-06

- Changed .psarc extraction tool to ndarc, which will be downloaded automatically for the user.
- Added support for the new mod loader, which will be downloaded automatically for the user.
- .psarc mods will be installed to the "mods" folder for the mod loader.

## [0.3.0] - 2025-04-04

- Completed automation of .psarc extraction.
- Added functions to clean out extracted .psarc files to "reset" mods on purge.
- Corrected Config path.
- UnPSARC is now also bundled with the extension so it can run when mods are purged.

## [0.2.4] - 2025-04-04

- Fixed extraction path for bin.psarc to "bin" folder.

## [0.2.3] - 2025-04-04

- Fixed .psarc extraction so files are not extracted into a subfolder.

## [0.2.2] - 2025-04-04

- Switched .psarc extraction tool to UnPSARC (<https://github.com/rm-NoobInCoding/UnPSARC>) since it has support for .psarc files without oodle compression and runs much faster.
- Added notification with a button to run UnPSARC to extract .psarc files (sp-common.psarc and bin.psarc).
- Added button to run .psarc extraction - folder icon in Mods toolbar.

## [0.2.1] - 2025-04-04

- Corrected game ID to match Nexus domain.
- Fixed typo in RegEx for archive name matching when checking for updates to U4.PSARC.Tool.

## [0.2.0] - 2025-04-03

- Added automatic download of U4.PSARC.Tool

## [0.1.0] - 2025-04-03

- Initial release
