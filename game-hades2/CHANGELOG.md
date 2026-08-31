# Changelog

## Planned Improvements (Not Yet Released)

## [1.1.3] - 2026-08-30

- Fixed: Plugins are now installed into a folder named after the plugin itself, so plugins that depend on each other load correctly. Plugins installed before this update use a placeholder folder name and need to be reinstalled.
- Fixed: Mod loader, plugin, and tool downloads are now saved under their real file name instead of a temporary one.

## [1.1.2] - 2026-08-17

- Changed: The Browse Thunderstore page asks you to confirm opening an external site once per Vortex session, instead of every time the page is opened.
- Fixed: After a download is started from the Browse Thunderstore page, the Back button no longer returns to the download link.
- Fixed: The Browse Thunderstore page no longer registers a keyboard shortcut that was already in use elsewhere in Vortex.

## [1.1.1] - 2026-08-17

- Fixed: On the Xbox version, the mod loader, plugins, and Binaries mods now install beside the game executable in the game's main folder, instead of the Ship folder used by the other versions.

## [1.1.0] - 2026-08-16

- Added: "Browse Thunderstore" page, which opens the Hades II Thunderstore site inside Vortex. Downloads started from it are installed, enabled, and named automatically, and any mods they depend on can be installed with them.
- Added: Update notifications for mods installed from the Thunderstore page.

## [1.0.0] - 2026-08-15

- Added: Support for the Hell2Modding mod loader, the current Hades II modding route.
- Added: The mod loader, ModUtil, and everything ModUtil needs are downloaded and installed automatically from Thunderstore, with notifications when a new version is available.
- Added: Mod type for ReturnOfModding plugins, so plugins install to the correct folder.
- Note: The older Mod Importer route still works and is unchanged.

## [0.2.0] - 2026-08-03

- Fixed: Readme and changelog files inside mods no longer show up as file conflicts.
- Fixed: Paths are now built safely on all systems.
- Added: Buttons to open the game's PCGamingWiki page, view the changelog, submit a bug report, and open the downloads folder.

## [0.1.3] - 2025-09-26

- Added Epic version ID and full support.
