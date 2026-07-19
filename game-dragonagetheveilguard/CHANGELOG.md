# Changelog

## Planned Improvements (Not Yet Released)

- Config and save installers (partition check)

## [0.5.0] - 2026-07-19

- Added: Button to remove the SDK Patch (EA/Epic) dll (with confirmation) - folder icon in Mods toolbar
- Added: Button to open the Frosty manager_config.json config file

## [0.4.1] - 2026-07-18

- Changed: Requirement downloader now uses the native fetch API instead of a bundled axios copy (much smaller extension, same behavior on Vortex 2.0+)
- Added: Auto-downloaded requirements now record their version and a clickable Source link (GitHub repo page) in the mod details panel

## [0.4.0] - 2026-06-24

- Improved: Refactored downloader.js GitHub downloader/updater for Vortex v2.0+ and more reliable operation.

## [0.3.0] - 2026-02-26

- Added: SDK patch will be automatically installed for EA game version (not needed for Steam)
- Fixed: Frosty Mod Manager update checker - fixing versions to be semver compliant - should find newest versions now
- Added: DAVExtender support - Installer and button to download
- Fixed: path strings
- Added: Buttons to go to FMM GitHub page and to delete the ModData folder (with confirmation) and several other files/folders/URLs
- Added: Tool to launch game .exe directly, not through Frosty - useful for when you need to rebuild the SDK after a patch

## [0.2.4] - 2025-10-23

- Fixed new version check for Frosty Mod Manager (for real this time!).

## [0.2.3] - 2025-06-17

- Fixed new version check for Frosty Mod Manager.

## [0.2.2] - 2025-05-28

- Fixed profile test when checking for new versions of Frosty Mod Manager

## [0.2.1] - 2025-05-19

- Switched Frosty Mod Manager download to J-Lyt GitHub repository (more updated).

## [0.2.0] - 2025-04-11

- Implemented automatic download and update of Frosty Mod Manager Alpha.
- Added notification to run Frosty Mod Manager after deployment.
- Added buttons to open Config, Save, Frosty mods, and Vortex Downloads folders and the Changelog - folder icon in Mods toolbar.
