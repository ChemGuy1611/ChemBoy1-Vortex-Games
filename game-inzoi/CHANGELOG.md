# Changelog

## Future Improvements (Not Yet Released)

- tool to launch inZOIMODKit (having difficulty with discovering the install location)

## [0.6.0] - 2026-02-03

- Removed: Automatic download of Mod Enabler - users can still install it from a new Vortex button or the mod page
- Fixed: Mod installs are properly cancelled if the modType is not deployable - This avoids confusion about if the mod will work
- Fixed: Proper installer handling for all Documents folder mods (Creations, AIGenerated, Canvas, My3DPrinter, MyAppearances, Animations, Textures)
- Fixed: Path checker reliablity
- Added: Tool to launch inZOIMODKit, if installed.
- Fixed: Path strings
- Added: Buttons to open several files/folders/URLs

## [0.5.1] - 2025-12-04

- Added compatibility flags to remove built-in Vortex modTypes. Users should now be able to deploy mods when the game folder is not on the C drive. Note that you still won't be able to install mods to the game folder if it is not on C drive.

## [0.5.0] - 2025-12-03

- Added missing directory check for legacy pak mod types. This could prevent deployment if the game folder was on a secondary drive. Note that you still won't be able to deploy if the game is on a secondary drive due to a Vortex limitation (<https://github.com/Nexus-Mods/Vortex/issues/18945>).
- Fixed issue with Load Order sorting of legacy pak mods not working if certain other UE game extensions were installed. You will need to reinstall all legacy pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added notification indicating deployment is required after changing the load order.
- Fixed missing FOMOD installer check for pak mods.
- Technical fixes and improvements.

## [0.4.0] - 2025-10-07

- Added functions to automatically set the "bEnable" flag to "true" in mod_manifest.json file for all MODKit mods on deployment.

## [0.3.2] - 2025-09-25

- Updated MODKit mod installer so that mods with invalid mod_manifest.json files will still be installed, with a warning notification to the user.

## [0.3.1] - 2025-06-29

- Updated installer notification to reflect the new requirements of the mod folder being moved to User Documents. Partition checks are now for mods that install to the game folder and Local AppData.

## [0.3.0] - 2025-06-26

- Updated Pak mod installer to handle new MODKit mod format. Moved to correct install directory "Document/inZOI/Mods".
- Changed partion checks and installer error messages to target mod types that go into the game folder (since the default install path is in Documents now).

## [0.2.1] - 2025-04-22

- Added installer for UE4SS DLL Mods
- Improved code for partition-checked modtypes
- Fixed incorrect path for button to open LogicMods folder
- Minor code improvements

## [0.2.0] - 2025-04-08

- Added multiple modtypes and installers for Documents folders: Canvas and AIGenerated folders, MyAppearances (appearance.dat), MyTextures (albedo.jpg), and MyAnimations (motion.dat)
- Corrected Saves install path
- Removed unnecessary logging

## [0.1.5] - 2025-03-30

- Corrected Saves install path.
- Added multiple modtypes and installers for Documents folders: Canvas and AIGenerated folders, MyAppearances (appearance.dat), MyTextures (albedo.jpg), and MyAnimations (motion.dat).
- Removed unnecessary logging.

## [0.1.4] - 2025-03-30

- Fixed undefined variable error for setting modtypes if the game had not been discovered yet.

## [0.1.3] - 2025-03-30

- Fixed partition checks for enabling modtypes for Config, Saves, and Creations mods.
- Added error messages if the user tries to install Config, Save, or Creations mods when those modtypes are not enabled.
- Fixed a ReferenceError for incorrect "CHECK_AI" variable name.

## [0.1.2] - 2025-03-29

- Added installers for My3DPrinter and Creations mods (to Documents folder). Note that the game, staging folder, and user folder must ALL be on the same drive for this to work since this game cannot use symlinks.
- Added buttons to open inZOI My3DPrinter and Creations (Documents) folders and to view the Changelog (folder icon in Mods toolbar)
- Added a tool to launch the game with custom arguments (arguments provided by the user)

## [0.1.1] - 2025-03-28

- Fixed Save games path
- Added automatic install of Mod Enabler
- Removed .sig extension files from pak mod installer as they are not required

## [0.1.0] - 2025-03-27

- Initial release
