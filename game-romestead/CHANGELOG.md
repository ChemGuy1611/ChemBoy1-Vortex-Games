# Changelog

## [1.1.3] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of a mod loader or plugin folder (for example "Myplugins" for "plugins") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Closing the "Wrong Mod Loader" or "Mixed Mod Detected" warning without pressing Ok now cancels the install instead of installing the mod anyway.
- Fixed: A mod archive is now recognised as a BepInEx patcher or a MelonLoader plugin whichever of its files is read last.
- Fixed: The missing .NET runtime warning for MelonLoader is no longer shown twice.

## [1.1.2] - 2026-10-01

- Fixed: MelonLoader mods installed into their own folder were missing the manifest file MelonLoader needs to load them.
- Thunderstore package files (manifest.json, icon.png) from newly installed mods are no longer copied into the shared mod loader folder, where they collided between mods.

## [1.1.1] - 2026-09-27

- Game version now shows the real game build instead of the Unity engine version.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [1.1.0] - 2026-09-20

- Added: "Browse Thunderstore" page, which opens the Romestead Thunderstore site inside Vortex. Downloads started from it are installed, enabled, and named automatically, and any mods they depend on can be installed with them.
- Added: Update notifications for mods installed from the Thunderstore page.

## [1.0.1] - 2026-09-14

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Removed unusable MelonLoader mod type options from the manual "set mod type" selector, since Romestead does not support MelonLoader.
- Added automatic download and installation of Mod Settings Menu once BepInEx is installed.

## [1.0.0] - 2026-08-26

- Initial release
