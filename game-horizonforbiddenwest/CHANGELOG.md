# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod files with no file extension were skipped during installation

## [0.2.7] - 2026-09-08

- Fixed: A required mod loader or tool is no longer mistaken for an unrelated Nexus mod that shares the same file, which could show the wrong mod details or offer a bogus update for it
- Fixed: Downloads fetched for a required mod loader or tool now show "Website" as their source instead of being left blank

## [0.2.6] - 2026-09-02

- Changed: HFW Mod Manager now appears in the mod list with its version, and can be disabled or removed from there
- Added: Update check for HFW Mod Manager, with a notification when a new version is released
- Fixed: HFW Mod Manager now installs the current version instead of an outdated one

## [0.2.5] - 2026-04-18

- Fixed: HFW MM wil download the latest version

## [0.2.4] - 2026-01-27

- Added: Button to open save folder
- Added: Notification to run HFW MM to restore vanilla files on purge
- Removed: Deprecated zip installer
- Removed: Unpleasant strings
- Removed: fsExtra import - no longer needed

## [0.2.3] - 2026-01-25

- Changed HFW MM to launch directly from Vortex (fixed in v0.9.3 of HFW MM)

## [0.2.2] - 2026-01-22

- Disabled all Alternative repacker support. All users should use HFW MM instead. Alternative repacker is not capable of handling mod variants, and is closed-source.

## [0.2.1] - 2026-01-14

- Changed HFW Mod Manager to instruct the user to launch it from the game folder. This is due to some strange behavior in the app that I am still trying to sort out.
- Added preliminary support for Alternative repacker (alternative mod packer). Auto-download choice is deactivated for now.
- Fixed issues with downloaded HFW MM executable not being downloaded properly.

## [0.2.0] - 2026-01-07

- Added support for HFW Mod Manager and its mods.
- Automatically downloads HFW Mod Manager and copies the executable to the game folder.
- Send notification to run HFW Mod Manager after deployment.
