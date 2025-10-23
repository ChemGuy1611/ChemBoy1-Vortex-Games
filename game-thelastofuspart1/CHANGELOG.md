# Changelog

## FUTURE CHANGES (NOT YET IMPLEMENTED)

- None Planned

## [2.0.6] - 2025-10-23

- Fixed UnPSARC update check not running on mod update check.

## [2.0.5] - 2025-05-28

- Fixed profile test when checking for new versions of UnPSARC

## [2.0.4] - 2025-04-09

- Added a missing function.

## [2.0.3] - 2025-04-09

- Fixed reference error when sending an error notification if .psarc file extraction was not completed.
- Improved check for whether .psarc extraction was successful.
- Added check for extracted folders presence before sending notification to extract .psarc files.

## [2.0.2] - 2025-04-06

- Added a notification displayed while the .psarc extraction is running.
- Fixed a few typos.

## [2.0.1] - 2025-04-04

- Fixed a condition where both the backup and original .psarc files are present at the same time (i.e. after a game update).

## [2.0.0] - 2025-04-04

- Completely removed Fluffy Mod Manager. It was causing issues with mods and modding can be done without it.
- Fixed extraction path for bin.psarc to "bin" folder.
- Added functions to clean out extracted .psarc files to "reset" mods on purge.

## [1.5.2] - 2025-04-04

- Fixed .psarc extraction so files are not extracted into a subfolder.

## [1.5.1] - 2025-04-04

- Switched .psarc extraction tool to UnPSARC (<https://github.com/rm-NoobInCoding/UnPSARC>) since it runs much faster.

## [1.5.0] - 2025-04-04

- Added automatic download of U4.PSARC.Tool
- Added notification and functions to extract .psarc files (sp-common.psarc and bin.psarc) required for mods to work properly.
- Added button to run .psarc extraction - folder icon in Mods toolbar.

## [1.4.2] - 2025-04-02

- Fixed installer structure for Fluffy so that mods will be installed by Fluffy correctly.
- PLEASE REINSTALL YOUR MOD LIST!

## [1.4.1] - 2025-04-02

- Fixed the Save installer.

## [1.4.0] - 2025-04-02

- Corrected some issues in multiple mod installers
- Added notificaiton to run Fluffy Mod Manager after deployment
- Added mod types and installers for Saves and Configs
- Added buttons to open Config, Save, and Vortex Downloads folder, and to view the Changelog - folder icon in Mods toolbar.
