# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.5] - 2026-08-24

- Fixed: Deploying could fail with an error when the load order had not been read yet, which can happen while installing a collection.
- Fixed: The load order no longer stops working for the rest of the session if its file cannot be read or is damaged.

## [1.0.4] - 2026-07-29

- Fixed: The load order could disappear after deploying while a mod update was in progress, and only came back after deploying a second time.
- Added: A message now appears if you change the load order while a mod update is still finishing, so it is clear the change was not applied and needs to be made again.
- Fixed: After a mod update finished, the load order page could keep showing out-of-date information until another deployment was run.

## [1.0.3] - 2026-07-29

- Fixed: Clicking the lock icon on a load order row no longer selects the row as well.
- Changed: Enabling or disabling a mod from a load order page now goes through Vortex's own enable/disable handling, so Vortex shows its usual "Deployment Required" prompt (or deploys straight away if you have automatic deployment on) and other extensions are told about the change.
- Changed: The UE4SS "Configure" button now looks for config files in the mod folder, its Scripts folder and its dlls folder instead of searching the whole mod folder. Opening the page with many mods installed is faster.
- Changed: Load order rows redraw less when the order changes.
- Changed: Right-click menus work out their position once when opened instead of adjusting after they appear, and all three menus now close the same way (click elsewhere, right-click elsewhere, or Escape).
- Changed: The checkbox on UE4SS load order rows now matches the styling used on the other pages.

## [1.0.2] - 2026-07-27

- Fixed: mods.txt could lose most of its contents when the BPModLoaderMod or Keybinds line was missing from the file.
- Fixed: Built-in UE4SS mod lines and comments in mods.txt were overwritten every time the load order was saved.
- Changed: ActorDumperMod and jsbLuaProfilerMod are now treated as built-in UE4SS mods. They no longer appear on the UE4SS Load Order page, no longer get duplicate entries in mods.txt, and no longer receive an enabled.txt file.
- Fixed: "Move to Top" and "Move to Bottom" now leave locked entries where they are, instead of moving them or adding a duplicate entry.
- Fixed: Typing in the search box on the UE4SS or LogicMods Load Order page no longer breaks the page when a collection has just been installed and not yet deployed.
- Fixed: Opening the UE4SS or LogicMods Load Order page when those folders cannot be read no longer raises an error dialog.
- Fixed: Locked entries on the LogicMods Load Order page no longer lose their lock after deploying.
- Fixed: Shift-clicking two rows while a status filter is active no longer selects the hidden rows between them.
- Fixed: The notification shown when turning the UE4SS Load Order setting on reported more enabled.txt files removed than it actually removed.

## [1.0.1] - 2026-07-25

- Fixed: Using "Update all" to update several mods at once could move them in the load order or uncheck them, including on the UE4SS and LogicMods load order pages.

## [1.0.0] - 2026-07-24

- Added: UE4SS Load Order page - drag-and-drop mods.txt management with lock, multi-select, a Configure button for mods with settings files, and per-profile state.
- Added: LogicMods/Blueprint pak Load Order page - manages load order for Blueprint pak mods.
- Added: Pak Load Order page now supports Enable/Disable, lock, multi-select, right-click context menu, and status filtering (Enabled/Disabled, Locked/Unlocked, Unmanaged).
- Added: A Settings toggle to turn UE4SS Load Order management on or off.
- Added: Collections support for UE4SS and LogicMods load orders.
- Changed: "Open UE4SS mods.json" button now opens mods.txt instead.
- Fixed: Mods no longer briefly lose their enabled state or load order position on other profiles while a mod update is being installed.

## [0.1.0] - 2026-04-08

- Initial release
