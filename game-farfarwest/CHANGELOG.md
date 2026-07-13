# Changelog

## Planned Improvements (Not Yet Released)

- None

## [0.4.0] - 2026-07-12

- Added: Status filtering on all load order pages (Enabled/Disabled, Locked/Unlocked, Unmanaged). Pak Load Order page gets filter pills in the info panel; UE4SS and LogicMods pages get a dropdown filter beside the search box. Shows a "matched / total" count while a filter is active.
- Added: "Open Mod Page" option to the right-click context menu on all load order pages (shown only for Vortex-managed entries with a resolvable mod page).
- Added: "Open Staging Folder" option to the right-click context menu on all load order pages (opens the mod's Vortex staging folder; shown only for Vortex-managed entries). UE4SS multi-select gets "Open Staging Folders (N)".
- Added: "Disable Vortex Mod" / "Enable Vortex Mod" toggle to the UE4SS Load Order context menu (single item, plus "Disable Vortex Mod (N)" for multi-select). This changes the Vortex mod's enabled state (deployment), separate from the per-entry mods.txt enable checkbox.
- Changed: LogicMods Load Order context menu "Disable Mod" is now a two-way "Disable Vortex Mod" / "Enable Vortex Mod" toggle, shown for all Vortex-managed entries.
- Changed: Pak Load Order context menu "Disable Mod" renamed to "Disable Vortex Mod" to match the other load order pages.
- Changed: Context menu items follow the same section order on all load order pages: entry toggles/lock, move actions, open folder/page, Vortex mod enable/disable.

## [0.3.1] - 2026-06-22

- Fixed: Load Order Context menus no longer cut off when item is at bottom of the application window.
- Fixed: Scrollbar displayed properly on UE4SS and LogicMods Load Order pages.

## [0.3.0] - 2026-06-12

- Added: Collections support for UE4SS and LogicMods load orders; exports load orders to the collection manifest, restores them on collection install, and adds a read-only "UE4SS Load Orders" tab to the collection workshop

## [0.2.0] - 2026-06-11

- Added: LogicMods/Blueprint pak load order page with drag-and-drop, lock, multi-select, and context menu support

## [0.1.1] - 2026-06-04

- Improved: Better context menus for UE4SS and Pak Load Orders

## [0.1.0] - 2026-05-15

- Initial release
