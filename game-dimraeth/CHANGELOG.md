# Changelog

## [1.0.1] - 2026-10-12

- Fixed: Mods packaged inside an outer folder whose name ends with the name of a mod loader or plugin folder (for example "Myplugins" for "plugins") now install into the right place instead of keeping part of the outer folder's name.
- Fixed: Closing the "Wrong Mod Loader" or "Mixed Mod Detected" warning without pressing Ok now cancels the install instead of installing the mod anyway.
- Fixed: A mod archive is now recognised as a BepInEx patcher or a MelonLoader plugin whichever of its files is read last.
- Fixed: The missing .NET runtime warning for MelonLoader is no longer shown twice.

## [1.0.0] - 2026-10-09

- Initial release
