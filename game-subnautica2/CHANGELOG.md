# Changelog

## Planned Improvements (Not Yet Released)

- ModKit?

## [0.5.5] - 2026-08-24

- Fixed: Deploying could fail with an error when the load order had not been read yet, which can happen while installing a collection.
- Fixed: The load order no longer stops working for the rest of the session if its file cannot be read or is damaged.

## [0.5.4] - 2026-07-29

- Fixed: The load order could disappear after deploying while a mod update was in progress, and only came back after deploying a second time.
- Added: A message now appears if you change the load order while a mod update is still finishing, so it is clear the change was not applied and needs to be made again.
- Fixed: After a mod update finished, the load order page could keep showing out-of-date information until another deployment was run.

## [0.5.3] - 2026-07-29

- Fixed: Clicking the lock icon on a load order row no longer selects the row as well.
- Changed: Enabling or disabling a mod from a load order page now goes through Vortex's own enable/disable handling, so Vortex shows its usual "Deployment Required" prompt (or deploys straight away if you have automatic deployment on) and other extensions are told about the change.
- Changed: The UE4SS "Configure" button now looks for config files in the mod folder, its Scripts folder and its dlls folder instead of searching the whole mod folder. Opening the page with many mods installed is faster.
- Changed: Load order rows redraw less when the order changes.
- Changed: Right-click menus work out their position once when opened instead of adjusting after they appear, and all three menus now close the same way (click elsewhere, right-click elsewhere, or Escape).
- Changed: The checkbox on UE4SS load order rows now matches the styling used on the other pages.

## [0.5.2] - 2026-07-27

- Fixed: mods.txt could lose most of its contents when the BPModLoaderMod or Keybinds line was missing from the file.
- Fixed: Built-in UE4SS mod lines and comments in mods.txt were overwritten every time the load order was saved.
- Changed: ActorDumperMod and jsbLuaProfilerMod are now treated as built-in UE4SS mods. They no longer appear on the UE4SS Load Order page, no longer get duplicate entries in mods.txt, and no longer receive an enabled.txt file.
- Fixed: "Move to Top" and "Move to Bottom" now leave locked entries where they are, instead of moving them or adding a duplicate entry.
- Fixed: Typing in the search box on the UE4SS or LogicMods Load Order page no longer breaks the page when a collection has just been installed and not yet deployed.
- Fixed: Opening the UE4SS or LogicMods Load Order page when those folders cannot be read no longer raises an error dialog.
- Fixed: Locked entries on the LogicMods Load Order page no longer lose their lock after deploying.
- Fixed: Shift-clicking two rows while a status filter is active no longer selects the hidden rows between them.
- Fixed: The notification shown when turning the UE4SS Load Order setting on reported more enabled.txt files removed than it actually removed.

## [0.5.1] - 2026-07-25

- Fixed: Using "Update all" to update several mods at once could move them in the load order or uncheck them, including on the UE4SS and LogicMods load order pages.

## [0.5.0] - 2026-07-22

- Fixed: Updating a mod could uncheck it or move it in the load order (Pak, UE4SS, and LogicMods pages), especially on profiles other than the one you were using.

## [0.4.0] - 2026-07-02

- Added: Status filtering on all load order pages (Enabled/Disabled, Locked/Unlocked, Unmanaged). Pak Load Order page gets filter pills in the info panel; UE4SS and LogicMods pages get a dropdown filter beside the search box. Shows a "matched / total" count while a filter is active.
- Added: "Open Mod Page" option to the right-click context menu on all load order pages (shown only for Vortex-managed entries with a resolvable mod page).
- Added: "Disable Vortex Mod" / "Enable Vortex Mod" toggle to the UE4SS Load Order context menu (single item, plus "Disable Vortex Mod (N)" for multi-select). This changes the Vortex mod's enabled state (deployment), separate from the per-entry mods.txt enable checkbox.
- Changed: LogicMods Load Order context menu "Disable Mod" is now a two-way "Disable Vortex Mod" / "Enable Vortex Mod" toggle, shown for all Vortex-managed entries.
- Changed: Context menu items follow the same section order on all load order pages: entry toggles/lock, move actions, open folder/page, Vortex mod enable/disable.
- Changed: Pak Load Order context menu "Disable Mod" renamed to "Disable Vortex Mod" to match the other load order pages.
- Added: "Open Staging Folder" option to the right-click context menu on all load order pages (opens the mod's Vortex staging folder; shown only for Vortex-managed entries). UE4SS multi-select gets "Open Staging Folders (N)".

## [0.3.1] - 2026-06-22

- Fixed: Load Order Context menus no longer cut off when item is at bottom of the application window.
- Fixed: Scrollbar displayed properly on UE4SS and LogicMods Load Order pages.

## [0.3.0] - 2026-06-12

- Added LogicMods/Blueprint pak load order page (draggable reorder of Blueprint pak mods; writes per-profile sidecar JSON + `BPModLoaderMod/load_order.txt` on user reorder and after deploy)
- Added `LO_ATTRIBUTE_LOGIC` install attribute to `installLogic` and `installUe4ssCombo` for pak-to-mod matching on the LogicMods LO page
- Added "Disable" button per row on LogicMods LO page (disables underlying Vortex mod and triggers deploy to remove pak from LogicMods folder)
- Added: Collections support for UE4SS and LogicMods load orders; exports load orders to the collection manifest, restores them on collection install, and adds a read-only "UE4SS Load Orders" tab to the collection workshop

## [0.2.0] - 2026-05-15

- Added custom UE4SS Load Order page (draggable reorder of UE4SS script mods via DraggableList; writes per-profile sidecar JSON + mods.txt on user reorder)
- Added user-toggleable setting (Settings > Mods) to enable/disable the UE4SS Load Order page and mods.txt management

## [0.1.0] - 2026-05-14

- Initial release
