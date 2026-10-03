# Changelog

## Planned Improvements (Not Yet Released)

## [1.0.0] - 2026-10-01

- Changed: BepInEx is now installed and managed by this extension instead of Vortex's built-in BepInEx support. It still comes from the pre-configured Diplomacy is Not an Option pack on Nexus Mods. Your installed BepInEx and mods are carried over automatically - no action needed.
- Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other.
- Changed: The "Download BepInEx Configuration Manager" button is now called "Download BepInExConfigManager", and Vortex also offers it in a notification when BepInEx is installed. ConfigurationManager you already installed keeps working.
- Added: "Download Latest MelonLoader" button. Only one mod loader can be installed at a time - if both are present, you'll be asked to choose which one to keep.
- Added: Mods that replace the game's assembly files (Assembly-CSharp.dll) or .assets/.resource files are now installed to the right folder.
- Thunderstore package files (manifest.json, icon.png) from newly installed mods are no longer copied into the shared mod loader folder, where they collided between mods.

## [0.3.1] - 2026-09-28

- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Game version now shows the real game build instead of the Unity engine version.

## [0.3.0] - 2026-09-13

- Added: Support for BepInEx Configuration Manager, with a "Download BepInExConfigManager" button to install it
- Updated: BepInEx now downloads a newer build
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.

## [0.2.0] - 2026-08-03

- Fixed: Readme and changelog files inside mods no longer show up as file conflicts.
- Fixed: Paths are now built safely on all systems.
- Added: Buttons to open the game's PCGamingWiki page, view the changelog, submit a bug report, and open the downloads folder.
- Changed: Extension is smaller and loads faster.

## [0.1.0]

- Initial release
