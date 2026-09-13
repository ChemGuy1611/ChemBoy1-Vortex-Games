# Changelog

## Planned Improvements (Not Yet Released)

- Added an "Open SteamDB Page" button next to the PCGamingWiki one.

## [1.0.1] - 2026-09-12

- Fixed: A required mod loader or tool is no longer mistaken for an unrelated Nexus mod that shares the same file, which could show the wrong mod details or offer a bogus update for it
- Fixed: Downloads fetched for a required mod loader or tool now show "Website" as their source instead of being left blank
- Changed: MelonPreferencesManager now installs as a mod, so it appears in the mods list with its own version and Remove button instead of being copied in as a loose file
- Changed: Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other
- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation
- Fixed: Files sitting outside the mod's own folder in an archive are no longer installed alongside it

## [1.0.0] - 2026-08-11

- Added: BepInEx and MelonLoader are now kept up to date - the extension checks for new releases and installs the latest instead of a fixed version
- Added: Download for BepInEx Configuration Manager, offered by notification when BepInEx is installed
- Added: Download for MelonPreferencesManager, offered by notification when MelonLoader is installed
- Added: Fallback installer for mods that no other installer recognizes
- Added: MelonLoader UserLibs mod type
- Added: Game version detection, shown in the games list
- Changed: Mod loaders now show their name in the mod list instead of their archive file name
- Changed: Rebuilt on the current extension template

## [0.1.3] - 2026-04-22

- Bump: BepInEx Config Manager to 18.4.1 - changed repo

## [0.1.2] - 2026-03-15

- Fixed: Bump BepInEx BE version to 755
- Added: .NET 6 installation check and notification for MelonLoader
- Added: Automatic detection of BepInEx patchers

## [0.1.1] - 2025-11-20

- Added support for CustomCharacters mods. Install folder is set based on which mod loader is installed.

## [0.1.0] - 2025-10-15

- Initial release
