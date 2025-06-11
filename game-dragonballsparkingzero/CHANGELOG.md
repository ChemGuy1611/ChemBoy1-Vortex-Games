# Changelog

Future Changes (NOT IMPLEMENTED YET):
- 

## [0.4.3] - 2025-04-12
- Added automatic install of SZModLoader mod.

## [0.4.2] - 2025-04-12
- Fixed Vortex failing to manage the game on a clean game install by write-checking the Json folder before writing the JsonFiles.json file.

## [0.4.1] - 2025-04-11
- Fixed JsonFiles.json file list including the vortex.deployment.dragonballsparkingzero-json.json file.

## [0.4.0] - 2025-04-11
- Implemented automatic updating of the JsonFiles.json file with all installed json mod file names!
- Added a check for enabling config modtype if the user has the game, staging folder, and Local AppData folder on the same drive.
- Added an error message if the user attempts to install a config mod when the modtype is not available.
- Fixed mods not from Nexus not being sortable in the load order.