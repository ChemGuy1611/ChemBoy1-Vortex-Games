# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.1.0] - 2026-09-20

- Added: "Browse Thunderstore" page, which opens the Burglin' Gnomes Thunderstore site inside Vortex. Downloads started from it are installed, enabled, and named automatically, and any mods they depend on can be installed with them.
- Added: Update notifications for mods installed from the Thunderstore page.

## [1.0.0] - 2026-09-17

- Changed: No longer asks which mod loader to use on first install - BepInEx now installs automatically. MelonLoader still works if you install it yourself.
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- BepInEx, MelonLoader, and BepInExConfigManager downloads now automatically check for and install the latest version instead of a fixed one.
- Changed: Plugins that don't already ship their own folder are now installed into one of their own, so two mods with a same-named file no longer overwrite each other

## [0.1.2] - 2026-09-12

- Fixed: Mod files with no file extension, such as Unity asset bundles, were skipped during installation

## [0.1.1] - 2026-04-22

- Bump: BepInEx version to 5.4.23.5
- Bump: BepInEx Config Manager to 18.4.1 - changed repo

## [0.1.0] - 2026-02-18

- Initial release
