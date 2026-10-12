# Changelog

## [2.0.1] - 2026-10-12

- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder named like one of the mod's key files (for example "dinput8.dll.old") now install into the right place.
- Fixed: Lua script mods with scripts in more than one folder now install every folder instead of only the first.
- Fixed: A mod archive containing another archive with an upper-case extension (.ZIP, .RAR, .7Z) is now installed as it is instead of being packed into another zip.
- Fixed: Removed the "Custom Launch (Demo)" button. The game has no demo, so the button had nothing to launch.

## [2.0.0] - 2026-09-15

- Migrated extension to new Fluffy-integrated system. Users of old versions must verify their game files and reinstall all mods in Vortex.
