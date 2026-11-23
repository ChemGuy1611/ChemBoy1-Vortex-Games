# Changelog

## [1.2.2] - 2026-11-23

- Changed: Updated the extension's info.json to the latest Vortex format.

## [1.2.1] - 2026-11-20

- Changed: The game is now named "Watch Dogs 2" (no underscore), so it is easier to find when searching for games in Vortex.

## [1.2.0] - 2026-11-20

- Added: Support for loose file mods (files made for repacking into the game's patch files). They are installed to the "data_win64\RedirectorData" folder and loaded by WD2 Redirector, without repacking.
- Added: WD2 Redirector support. Vortex offers to download and install it from Nexus Mods when a loose file mod needs it.

## [1.1.0] - 2026-11-20

- Fixed: Disrupt Manager no longer crashes when installing packages on a game with no patch file mods. Vortex now creates the empty "patch3" files Disrupt Manager expects.
- Added: A warning when Disrupt Manager packages and patch file mods are enabled together. Disrupt Manager rebuilds the same "patch3" files those mods use, so only one kind can be used at a time.

## [1.0.0] - 2026-11-17

- Initial Release
