# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.2] - 2026-08-24

- Fixed: Deploying could fail with an error when the load order had not been read yet, which can happen while installing a collection.
- Fixed: The load order no longer stops working for the rest of the session if its file cannot be read or is damaged.

## [1.0.1] - 2026-07-29

- Fixed: The load order could disappear after deploying while a mod update was in progress, and only came back after deploying a second time.
- Added: A message now appears if you change the load order while a mod update is still finishing, so it is clear the change was not applied and needs to be made again.
- Fixed: After a mod update finished, the load order page could keep showing out-of-date information until another deployment was run.

## [1.0.0] - 2026-07-29

- Fixed: Clicking the lock icon on a load order row no longer selects the row as well.
- Changed: Enabling or disabling a mod from a load order page now goes through Vortex's own enable/disable handling, so Vortex shows its usual "Deployment Required" prompt (or deploys straight away if you have automatic deployment on) and other extensions are told about the change.
- Changed: The UE4SS "Configure" button now looks for config files in the mod folder, its Scripts folder and its dlls folder instead of searching the whole mod folder. Opening the page with many mods installed is faster.
- Changed: Load order rows redraw less when the order changes.
- Changed: Right-click menus work out their position once when opened instead of adjusting after they appear, and all three menus now close the same way (click elsewhere, right-click elsewhere, or Escape).
- Changed: The checkbox on UE4SS load order rows now matches the styling used on the other pages.

## [0.3.2] - 2026-07-27

- Fixed: mods.txt could lose most of its contents when the BPModLoaderMod or Keybinds line was missing from the file.
- Fixed: Built-in UE4SS mod lines and comments in mods.txt were overwritten every time the load order was saved.
- Changed: ActorDumperMod and jsbLuaProfilerMod are now treated as built-in UE4SS mods. They no longer appear on the UE4SS Load Order page, no longer get duplicate entries in mods.txt, and no longer receive an enabled.txt file.
- Fixed: "Move to Top" and "Move to Bottom" now leave locked entries where they are, instead of moving them or adding a duplicate entry.
- Fixed: Typing in the search box on the UE4SS or LogicMods Load Order page no longer breaks the page when a collection has just been installed and not yet deployed.
- Fixed: Opening the UE4SS or LogicMods Load Order page when those folders cannot be read no longer raises an error dialog.
- Fixed: Locked entries on the LogicMods Load Order page no longer lose their lock after deploying.
- Fixed: Shift-clicking two rows while a status filter is active no longer selects the hidden rows between them.
- Fixed: The notification shown when turning the UE4SS Load Order setting on reported more enabled.txt files removed than it actually removed.

## [0.3.1] - 2026-07-25

- Fixed: Using "Update all" to update several mods at once could move them in the load order or uncheck them, including on the UE4SS and LogicMods load order pages.

## [0.3.0] - 2026-07-22

- Added: Updating a mod no longer unchecks it or moves it in the load order (Pak, UE4SS, and LogicMods pages), including on profiles other than the one you're using.

## [0.2.0] - 2026-07-19

- Added support for the Xbox Game Pass (PC) version of the game, including game detection, launching through the Xbox app, and WinGDK binaries and config folder pathing
- Rebuilt the extension on the current unified UE4-5 template
- Added file-based load order page for pak mods (replaces the legacy load order page)
- Added load order pages for UE4SS script mods (mods.txt) and LogicMods (load_order.txt), included in collections
- Added PCGamingWiki page link

## [0.1.0] - 2025-10-25

- Initial release
