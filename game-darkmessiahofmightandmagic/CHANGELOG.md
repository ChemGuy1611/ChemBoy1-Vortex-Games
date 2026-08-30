# Changelog

## Planned Improvements (Not Yet Released)

- None

## [0.5.0] - 2026-08-29

- Added: A page to browse mods on ModDB and install them without leaving Vortex

## [0.4.2] - 2026-08-05

- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.4.1] - 2026-08-03

- Fixed: wiltOS Mod Launcher download failed with a "readableStream" error instead of installing

## [0.4.0] - 2026-07-18

- Improved: wiltOS Mod Launcher download now auto-resolves and installs the latest file from ModDB's RSS feed (previously required browsing to ModDB and picking the file manually)
- Added: Update notification when a newer wiltOS Mod Launcher file is published on ModDB (at startup and when using the "Check for Updates" button on the Mods page)

## [0.3.0] - 2026-03-25

- Added: Button to download wiltOS Mod Launcher from ModDB - provides a means to update
- Added: Buttons to open several useful files/folders/URLs - folder icon on Mods page toolbar

## [0.2.3] - 2025-11-18

- Added config.cfg file installer.
- Added buttons to open config.cfg and Saves folder (folder icon on Mods page toolbar).
- Technical fixes and improvements.

## [0.2.2]

- Removed 'bin' folder from the game root installer because it can conflict with some Launcher Mods

## [0.2.1]

- Added installer for additional folders in the game root.
- Fixed typo in a modtype name

## [0.2.0]

- Changed URL for browsing to wiltOS Mod Launcher download to ensure user finds the latest version
- Fixed unhandled exception when downloading wiltOS Mod Launcher
- Cleaned up the code
