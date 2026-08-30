# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [1.3.0] - 2026-08-30

- Added: two settings under Settings > Mods, both off by default. One installs mods with SnakeBite automatically every time mods are deployed; the other removes them from the game when purging
- Added: purging now warns when SnakeBite still has mods installed in the game, with a button to restore the original game files

## [1.2.0] - 2026-08-29

- Added: "Install Mods with SnakeBite" button on the Mods toolbar. It installs the mods Vortex has deployed into the game, removes the ones Vortex no longer has, and reports anything it had to skip
- Added: mods that replace the same game files as an already installed mod are now listed for confirmation before anything is installed
- Fixed: mod information is now read directly from the .mgsv file, so mods are no longer skipped with "contains no mod information"
- Added: "Sync" button on the notification shown after deploying, with the workflow explained under "More"
- Added: mods installed in SnakeBite that Vortex has not deployed are now listed after a sync, with the option to remove them. They are never removed on their own
- Changed: a mod Vortex has deployed that SnakeBite already has installed is now tracked, so removing it in Vortex also removes it from the game on the next sync
- Added: "Restore Original Game Files" button on the Mods toolbar. SnakeBite puts the game archives back the way they were before any mod was installed

## [1.1.2] - 2026-08-29

- Added: support for .MGSVPreset files

## [1.1.1] - 2026-08-27

- Fixed: .mgsv files are all placed at same level rather than in individual folders, to make adding to SnakeBite easier.

## [1.1.0] - 2026-08-22

- Added: Updating SnakeBite Mod Manager in Vortex now applies the update automatically. Its installer runs in the background and reuses the folder SnakeBite is already installed in, so there is nothing to click through
- Fixed: SnakeBite Mod Manager is now located using the folder it recorded when it was installed, so it is still found when it was installed outside the default folder
- Fixed: Installing SnakeBite Mod Manager now runs the installer that was just downloaded rather than an older copy left in the mod staging folder

## [1.0.0] - 2026-08-19

- Initial Release
