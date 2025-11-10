# Changelog

## FUTURE CHANGES (NOT YET IMPLEMENTED)

- Better installer for D2Fix mod - handle multiple folders + select options based on game version.
- ? Disable Config/Save installers so that hardlinks will be available for more users? - symlinks seem fine.

## [0.6.0] - 2025-11-10

- Improved installer for Void Installer mods.
- Changed check for Void Installer to use modType rather than turbowalk (better performance).
- Fixed game version detection for Xbox version.
- Added buttons to open Config and Save folders (folder icon on Mods page toolbar).
- Added installer for config file in 'Saved Games' folder (same location as saves).
- Added root folder installer ("base" folder in mod archive). This allows the D2Fix mod (as least the main part) to be installed correctly.

## [0.5.3]

- Tweak Void Installer Mod installer criteria

## [0.5.2]

- Removed an obsolete parameter that caused downloading updates from the Moddding Tools domain to fail with wrong URL
- Added additional note to notifications related to Void Installer that users should check for mod folders in the root if they don't find it is the Mods folder

## [0.5.1]

- Added a tool for Void Explorer if the user installs it to the game folder

## [0.5.0]

- Added support for Void Installer and mods that use it
- Changed requiredFiles and getExecutable for more reliable game discovery
