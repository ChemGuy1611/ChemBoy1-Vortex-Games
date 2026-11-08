# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod files whose names only begin with README, CHANGELOG, or LICENSE (for example, License_Plates.dds) are no longer skipped during deployment.
- Added: README and CHANGELOG files spelled with a hyphen, underscore, or space (for example, READ_ME.txt or Change Log.md) are now excluded from mod conflict detection and deployment.

## [1.2.1] - 2026-11-06

- Fixed: A UE4SS installed manually (outside Vortex) is now detected, so the UE4SS and LogicMods load orders and the UE4SS settings update work with it.

## [1.2.0] - 2026-11-05

- Changed: LogicMods (Blueprint) mods now always install directly into the LogicMods folder. Installed mods convert automatically when you next manage the game. Deploy when prompted.
- Added: A notification when a pak mod looks like a Blueprint mod, with a button to set it as a LogicMods mod.

## [1.1.1] - 2026-11-01

- Changed: Internal cleanup of how file paths are handled. No change to how mods install.

## [1.1.0] - 2026-10-27

- Added: FFR Modding Tools is downloaded and its installer run automatically, with a Dashboard tool to launch it and a button to download it again.
- Added: support for FFR Modding Tools packs (.ffrspack). They are installed to the "FFRSPacks" folder in the game folder, with a notification explaining how to import them into FFR Modding Tools and a button to open the folder.
- Fixed: the Unreal Engine version written to UE4SS-settings.ini was wrong.
- Changed: the game version is now read from the game executable.

## [1.0.0] - 2026-10-27

- Initial release
