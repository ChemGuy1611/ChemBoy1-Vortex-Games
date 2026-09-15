# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.4] - 2026-09-14

- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- Fixed: MelonPreferencesManager was causing errors in-game, so it is no longer offered

## [1.0.3] - 2026-09-12

- Fixed: A required mod loader or tool is no longer mistaken for an unrelated Nexus mod that shares the same file, which could show the wrong mod details or offer a bogus update for it
- Fixed: Downloads fetched for a required mod loader or tool now show "Website" as their source instead of being left blank
- Changed: MelonPreferencesManager now installs as a mod, so it appears in the mods list with its own version and Remove button instead of being copied in as a loose file
- Changed: Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other
- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [1.0.2] - 2026-09-02

- Fixed: A required mod loader or tool is no longer matched against downloads belonging to other games, which could report the wrong installed version or check for updates against the wrong file

## [1.0.1] - 2026-08-26

- Changed: Introduced user choice of loader (BepInEx or MelonLoader), MelonLoader recommended.

## [1.0.0] - 2026-08-25

- Initial release
