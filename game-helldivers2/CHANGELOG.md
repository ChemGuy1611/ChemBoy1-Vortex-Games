# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [1.0.0] - 2026-08-23

- Patch mods for any game archive are now ordered and renamed automatically. Previously only mods for one specific archive were, and everything else had to be renumbered by hand.
- Sound mods are now handled like every other patch mod. They appear in the load order and no longer overwrite each other when two of them change the same archive.
- New "Patch Conflicts" page lists the archives that more than one mod changes, and lets you reorder the mods within one of those archives on its own.
- The load order page has been rebuilt: multi-select, right-click menu, position locking, status filters, and a marker on any mod that shares an archive with another.
- Added a warning when a mod patches an archive your installed version of the game does not have, since those files have no effect in game.
- Deployment now stops with an error if a patch file cannot be written, instead of quietly skipping it and leaving the remaining mods for that archive broken.
- Fixed: readme and other documentation files included in a patch mod are no longer discarded.
- Fixed: patch mods that keep their files in a subfolder are now recognised correctly.

## [0.7.1] - 2026-01-28

- Fixed: Path strings

## [0.7.0] - 2025-09-24

- .patch_0 graphics mods installer will present the user a dialogue to select which variant to install if the mod archive has multiple variants. Currently, the user must select the same variant for each of the .patch_0, .stream, and .gpu_resources files.
- .patch_0 sound mods installer will present the user a dialogue to select which variant to install if the mod archive has multiple variants. Files still must be manually renamed at this time.

## [0.6.1] - 2025-09-20

- Disabled notification suggesting the user disable auto-deploy (Vortex has been updated so that this is no longer needed).
