# Changelog

## [1.0.3] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.2] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of a mod loader or plugin folder (for example "Myplugins" for "plugins") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Closing the "Wrong Mod Loader" or "Mixed Mod Detected" warning without pressing Ok now cancels the install instead of installing the mod anyway.
- Fixed: A mod archive is now recognised as a BepInEx patcher or a MelonLoader plugin whichever of its files is read last.
- Fixed: The missing .NET runtime warning for MelonLoader is no longer shown twice.

## [1.0.0] - 2026-10-11

- Initial release
