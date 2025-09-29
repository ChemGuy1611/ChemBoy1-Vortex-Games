# Changelog

## Future Improvements (NOT implemented yet)

- None planned

## [0.4.6] - 2025-09-28

- Fixed a Vortex crash that could occur for the classic version if the SS2Tool executable was not found in the downloads folder.
- Added Epic version ID (Remaster) and full support.

## [0.4.5] - 2025-07-09

- Fixed an issue with the game image displaying in the Vortex Games list prior to downloading the extension and added a unique image for the Classic version.

## [0.4.4] - 2025-07-05

- Added extensions for Classic and Legacy mod installers to properly install mod archives with .dml, .gam, and .mis files and no folders.
- Classic - Added 'cutscenes' folder mod installer since it will now not interfere with the Remaster installer. Note this does NOT apply to the Legacy Mod Converter for the Remaster version.

## [0.4.3] - 2025-07-03

- Classic - Added functions to copy SS2Tool exe from downloads folder to game folder and allow the user to run it manully (tool in Dashboard OR button in folder icon on mods toolbar).

## [0.4.2] - 2025-07-03

- Remaster - Improved legacy mod converter/installer for Remaster to remove extraneous top-level folders from the .kpf archive. Note that can only hande a SINGLE top level folder in the archive.c

## [0.4.1] - 2025-07-02

- Classic mods now install directly to folders to avoid issues with BMM managing archives.

## [0.4.0] - 2025-07-02

- Extensions now registers separate games for classic and Remaster versions of the game. This resolves multiple technical issues and allows for each version to be modded separately.

## [0.3.0] - 2025-07-01

- Added support for classic (1999) System Shock 2 game version on Steam and GOG!
- Classic - Added download-and-run on startup functions for SS2Tool.
- Classic - Added tools for SS2Tool, Blue Mod Manager (default launch tool), and ShockEd.

## [0.2.0] - 2025-06-30

- Added installer to convert legacy mods to .kpf format for this remaster. Note that some .kpf files created by the installer may not always work if there are issues with the original mods.
- Added "systemshock2" domain to compatibleDownloads.
- Added tool to launch the game with custom command line arguements (specified by the user).

## [0.1.0] - 2025-06-30

- Initial release
