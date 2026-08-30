# Changelog

## Planned Improvements (Not Yet Released)

- None planned at this time

## [0.7.0] - 2026-08-29

- Added: Support for Jiangyu, the mod loader that replaced ModpackLoader. It is downloaded and installed for you, and kept up to date.
- Added: Installer for Jiangyu mods. They install to their own folder under "Mods" and appear on the load order page.
- Changed: The load order page now covers both Jiangyu and ModpackLoader mods together.
- Changed: ModpackLoader is no longer downloaded on its own. It now comes with the Menace ModKit, which places the loader files where the game needs them.
- Changed: The Menace ModKit now downloads from its current home, and is kept up to date.
- Fixed: The .NET 10 notification no longer appears unless ModpackLoader is actually installed.

## [0.6.2] - 2026-07-29

- Fixed: The load order could disappear after deploying while a mod update was in progress, and only came back after deploying a second time.
- Added: A message now appears if you change the load order while a mod update is still finishing, so it is clear the change was not applied and needs to be made again.
- Fixed: After a mod update finished, the load order page could keep showing out-of-date information until another deployment was run.

## [0.6.1] - 2026-07-25

- Fixed: Using "Update all" to update several mods at once could move them in the load order or uncheck them.

## [0.6.0] - 2026-07-22

- Fixed: Updating a mod could uncheck it or move it in the load order, especially on profiles other than the one you were using.

## [0.5.0] - 2026-04-22

- Improved: Load Order rendering using React - show mod image thumbnails

## [0.4.2] - 2026-03-22

- Added: Installer for Custom Leaders mods

## [0.4.1] - 2026-02-24

- Added: Checks and notifications for .NET 6/10 installations required by MelonLoader/ModpackLoader

## [0.4.0] - 2026-02-24

- Changed: ModpackLoader now downloads from a Nexus Mods page, and is no longer bundled with the extension

## [0.3.2] - 2026-02-16

- Updated: DLL file package
- Improved: ModpackLoader dlls are copied with overwrite at setup to ensure they are updated

## [0.3.1] - 2026-02-13

- Fixed: Added error handling for reading/writing failures in modpack.json files
- Fixed: Prevented adding non-ModpackLoader mod entries to load order

## [0.3.0] - 2026-02-12

- Added: Load Order support for ModPackLoader mods
- Added: Installer and launch tool for Menace ModKit app (<https://github.com/p0ss/MenaceAssetPacker>)

## [0.2.0] - 2026-02-12

- Added: support for ModPackLoader mods not packaged with loader dll
- Added: Auto-copy of ModPackLoader dlls to game folder

## [0.1.0] - 2026-02-10

- Initial release
