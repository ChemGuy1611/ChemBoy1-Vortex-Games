# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [0.4.1] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Fixed: The requirement download button now reports when the requirement is already up to date instead of appearing to do nothing
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other
- Changed: GoWR-Script-Loader stays optional - it is still only installed by the toolbar button, never automatically

## [0.4.0] - 2026-08-04

- Changed: GoWR-Script-Loader is now downloaded from the latest GitHub release instead of a fixed link
- Added: Update notifications when a new version of GoWR-Script-Loader is released
- Changed: The download button now reports when the installed loader is already up to date

## [0.3.0] - 2026-01-30

- Improved: Finds .texpack and .lodpack files in any subdirectory of the "exec\patch" folder
- Added: Installer and download button for GoWR-Script-Loader
- Added: Installer for GoWR-Script-Loader mods - indexed on "int9" folder
- Fixed: path strings
- Added: Buttons to open Script Loader config file, PCGamingWiki page, view changelog, and submit bug reports

## [0.2.2] - 2025-04-10

- Corrected text string when writing texpack and lodpack mods to boot-options.json (`../../patch/pc_le/${fileName}`).

## [0.2.1] - 2025-04-07

- Added button to open Settings INI file and boot-options.json file - folder icon in Mods toolbar.
- Reset boot-option.json file on mod purge.

## [0.2.0] - 2025-04-01

- Added installers for texpacks and lodpacks, which update the game's boot-options.json file with a filename list.
