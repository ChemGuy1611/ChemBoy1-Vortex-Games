# Changelog

## [2.1.1] - 2026-10-12

- Fixed: Removed the "Custom Launch (Demo)" button. The demo uses the same re2.exe as the full game, so the button only started the full game a second time.

## [2.1.0] - 2026-10-11

- Fixed: Steam installs of the full game were treated as the 1-Shot Demo, so mods went to the demo's Fluffy folders and the save-game lookup used the demo's app id. The full game now uses its own folders, so purge and redeploy your mods after updating. The demo (same re2.exe) is no longer handled separately.
- Fixed: Mods packaged inside an outer folder named like one of the mod's key files (for example "dinput8.dll.old") now install into the right place.
- Fixed: Lua script mods with scripts in more than one folder now install every folder instead of only the first.
- Fixed: A mod archive containing another archive with an upper-case extension (.ZIP, .RAR, .7Z) is now installed as it is instead of being packed into another zip.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [2.0.0] - 2026-09-15

- Migrated extension to new Fluffy-integrated system. Users of old versions must verify their game files and reinstall all mods in Vortex.
