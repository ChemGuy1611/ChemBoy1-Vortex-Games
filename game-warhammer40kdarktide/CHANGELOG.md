# Changelog

## Planned Improvements (Not Yet Released)

- None

## [0.2.4] - 2026-07-29

- Fixed: The load order could disappear after deploying while a mod update was in progress, and only came back after deploying a second time.
- Added: A message now appears if you change the load order while a mod update is still finishing, so it is clear the change was not applied and needs to be made again.
- Fixed: After a mod update finished, the load order page could keep showing out-of-date information until another deployment was run.

## [0.2.3] - 2026-07-29

- Changed: Load order rows redraw less when the order changes.
- Changed: The right-click menu works out its position once when opened instead of adjusting after it appears.

## [0.2.2] - 2026-07-27

- Fixed: "Move to Top" and "Move to Bottom" now leave locked entries where they are, instead of moving them or adding a duplicate entry.
- Fixed: Shift-clicking two rows while a status filter is active no longer selects the hidden rows between them.

## [0.2.1]

- Fixed: Using "Update all" to update several mods at once could still move them in the load order or uncheck them.

## [0.2.0]

- Fixed: Updating a mod could uncheck it or move it in the load order, especially on profiles other than the one you were using.
- Fixed: Load order description incorrectly said mod folders get renamed with alphanumeric prefixes; corrected to describe how the load order is actually written.

## [0.1.0]

- Initial release of the Warhammer 40,000: Darktide extension.
- Steam and Xbox (Game Pass) detection and support.
- Mod, binaries, and root folder mod types with installers.
- Load order management with custom item renderer: thumbnails, lock button,
  multi-select, right-click context menu, and "Not managed by Vortex" banner.
- "Open Mod Page" option in the load order context menu (shown only for
  Vortex-managed entries with a resolvable mod page).
- "Open Staging Folder" option in the load order context menu (opens the mod's
  Vortex staging folder; shown only for Vortex-managed entries; multi-select
  gets "Open Staging Folders (N)").
- Load order status filtering: filter entries by enabled/disabled, locked/unlocked,
  and unmanaged status from the info panel.
- Darktide Mod Patcher and load order file maker tools.
