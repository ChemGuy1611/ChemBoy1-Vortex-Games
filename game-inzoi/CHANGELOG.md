# Changelog

## Future Improvements (Not Yet Released)

- functions to automatically set the "bEnable" flag to true for all MODKit mods on deployment. - The json files are not parsing correctly.
- tool to launch inZOIMODKit.

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
