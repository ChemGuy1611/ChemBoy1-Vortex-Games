# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod files with no file extension were skipped during installation

## [0.3.4] - 2026-09-06

- Fixed: Locked load order entries could be moved out of position when using "Move to Top", "Move to Bottom" or the position number box on another entry. Locked entries now keep their place.
- Fixed: The load order position number box now accepts low numbers even when a locked entry is further down the list.

## [0.3.3] - 2026-09-04

- Added: Right-click menu on the load order: enable or disable an entry, lock or unlock it, move it to the top or bottom, and open its mod folder, staging folder or mod page. Works on one entry or several at once.
- Added: Lock button on each load order row, plus ctrl/shift multi-select.
- Added: Load order filter by status (enabled, disabled, locked, unlocked, unmanaged) with a matched/total count.
- Added: Load order entries for mods Vortex does not manage are now marked "Not managed by Vortex".
- Fixed: A locked load order entry no longer unlocks itself after deploying or reopening the load order page.
- Fixed: Opening the load order on a fresh install could fail with a "Vortex tried to access modlist.txt but it doesn't exist" error. The file is now created if it is missing.

## [0.3.2] - 2026-07-29

- Fixed: The load order could disappear after deploying while a mod update was in progress, and only came back after deploying a second time.
- Added: A message now appears if you change the load order while a mod update is still finishing, so it is clear the change was not applied and needs to be made again.
- Fixed: After a mod update finished, the load order page could keep showing out-of-date information until another deployment was run.

## [0.3.1] - 2026-07-25

- Fixed: Using "Update all" to update several mods at once could move them in the load order or uncheck them.

## [0.3.0] - 2026-07-22

- Fixed: Updating a mod could uncheck it or move it in the load order, especially on profiles other than the one you were using.

## [0.2.0] - 2026-04-22

- Improved: Load Order rendering using React - show mod image thumbnails
- Fixed: Properly assign mod attribute at install for Load Order

## [0.1.3] - 2026-03-25

- Added: Mewjector support

## [0.1.2] - 2026-03-25

- Added: Mewjector support
- Added: Level Editor support (launch tool)

## [0.1.1] - 2026-02-19

- Added: SaveEditor support (installer and launch tool)
- Fixed: Mod order instructions now clarify that mods higher up take priority over mods lower
- Removed: Unnecessary mod count launch parameter

## [0.1.0] - 2026-02-13

- Inital Release
