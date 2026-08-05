# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.1] - 2026-08-05

- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [1.0.0] - 2026-08-03

- Automated the RealRTCW download - Vortex now finds the latest version on ModDB and installs it for you
- Added a notification when a new version of RealRTCW is released
- Removed the ioRTCW download option - RealRTCW is the actively maintained fork. ioRTCW can still be installed manually and launched from the tools list

## [0.4.1]
- Made game discovery more reliable
- Corrected a typo in a modtype id
- Added buttons to manually start RealRTCW and ioRTCW download processes (folder icon in Mods toolbar)

## [0.4.0]
- Improved notification to download RealRTCW or ioRTCW to automate the process
- Cleaned up code