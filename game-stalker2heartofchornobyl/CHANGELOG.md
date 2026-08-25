# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [2.0.2] - 2026-08-24

- Fixed: The load order no longer stops working for the rest of the session if its file cannot be read or is damaged.

## [2.0.1] - 2026-08-24

- Fixed: Error that could occur if the user had never opened the load order page before deploying.

## [2.0.0] - 2026-08-22

- Added: Support for 2.0 mod structure. No load order support for them at this time.

## [1.0.5] - 2026-07-29

- Fixed: The load order could disappear after deploying while a mod update was in progress, and only came back after deploying a second time.
- Added: A message now appears if you change the load order while a mod update is still finishing, so it is clear the change was not applied and needs to be made again.
- Fixed: After a mod update finished, the load order page could keep showing out-of-date information until another deployment was run.

## [1.0.4] - 2026-07-29

- Fixed: Clicking the lock icon on a load order row no longer selects the row as well.
- Changed: Enabling or disabling a mod from a load order page now goes through Vortex's own enable/disable handling, so Vortex shows its usual "Deployment Required" prompt (or deploys straight away if you have automatic deployment on) and other extensions are told about the change.
- Changed: The UE4SS "Configure" button now looks for config files in the mod folder, its Scripts folder and its dlls folder instead of searching the whole mod folder. Opening the page with many mods installed is faster.
- Changed: Load order rows redraw less when the order changes.
- Changed: Right-click menus work out their position once when opened instead of adjusting after they appear, and all three menus now close the same way (click elsewhere, right-click elsewhere, or Escape).
- Changed: The checkbox on UE4SS load order rows now matches the styling used on the other pages.

## [1.0.3] - 2026-07-27

- Fixed: mods.txt could lose most of its contents when the BPModLoaderMod or Keybinds line was missing from the file.
- Fixed: Built-in UE4SS mod lines and comments in mods.txt were overwritten every time the load order was saved.
- Changed: ActorDumperMod and jsbLuaProfilerMod are now treated as built-in UE4SS mods. They no longer appear on the UE4SS Load Order page, no longer get duplicate entries in mods.txt, and no longer receive an enabled.txt file.
- Fixed: "Move to Top" and "Move to Bottom" now leave locked entries where they are, instead of moving them or adding a duplicate entry.
- Fixed: Typing in the search box on the UE4SS or LogicMods Load Order page no longer breaks the page when a collection has just been installed and not yet deployed.
- Fixed: Opening the UE4SS or LogicMods Load Order page when those folders cannot be read no longer raises an error dialog.
- Fixed: Locked entries on the LogicMods Load Order page no longer lose their lock after deploying.
- Fixed: Shift-clicking two rows while a status filter is active no longer selects the hidden rows between them.
- Fixed: The notification shown when turning the UE4SS Load Order setting on reported more enabled.txt files removed than it actually removed.

## [1.0.2] - 2026-07-25

- Fixed: Using "Update all" to update several mods at once could move them in the load order or uncheck them, including on the UE4SS and LogicMods load order pages.

## [1.0.1] - 2026-07-23

- Fixed: Save mod folder path was incorrect for the Xbox version.
- Fixed: Save mods can no longer be installed on the Xbox version (not supported).
- Fixed: Config and Save mod installers now properly cancel instead of installing anyway when the game, staging folder, and mod folder are not on the same drive.
- Fixed: Steam version now launches through Steam instead of directly.
- Improved: Fallback installer notification now includes buttons to contact the developer and open the mod page/staging folder.

## [1.0.0] - 2026-07-22

- Migrated to file-based load order (FBLO): lock button, multi-select, right-click context menu, status filter (enabled/disabled, locked/unlocked, unmanaged), Open Mod Page/Staging Folder, Disable/Enable Vortex Mod.
- Added UE4SS Load Order page (mods.txt management, Configure button, per-profile state) and LogicMods/Blueprint pak Load Order page (load_order.txt management).
- Added collections support for UE4SS and LogicMods load orders.
- Added: Updating a mod no longer unchecks it or moves it in the load order (Pak, UE4SS, and LogicMods pages), including on profiles other than the one you're using.
- Added: Notification when a mod installs through the fallback Binaries folder installer.

## [0.5.4] - 2026-02-04

- Fixed: Wrong variable name in a couple open buttons

## [0.5.3] - 2026-02-03

- Improved: Made UE4SS Scripts, UE4SS DLL, LogicMods, and Root Folder mod installers case-insensitive to folder names

## [0.5.2] - 2026-02-02

- Added: Automatic renaming of "Win64" folder to "WinGDK" for UE4SS combo mod installer
- Added: Buttons to open several additional files/folders/URLs

## [0.5.1] - 2026-01-19

- Fixed: More reliable folder deletion operations - revised deprecated fsPromises.rmdir function to fsPromises.rm

## [0.5.0] - 2025-11-22

- Fixed issue with Load Order sorting not working if certain other UE game extensions were installed. You will need to reinstall all pak mods to be able to sort them properly. A notification will be sent reminding you to do this.
- Added notification indicating deployment is required after changing the load order.
- UE4SS downloader now has the user browse GitHub releases page for the file.
- Fixed Xbox game version detection.
- Fixed Saves path for GOG version.
- Technical fixes and improvements

## [0.4.0] - 2025-07-02

- Added full Epic version support.
- Added button to open Steam Workshop Mods folder - folder icon in Mods toolbar.

## [0.3.2] - 2025-04-22

- Added installer for UE4SS DLL Mods
- Added button to download UE4SS - folder icon in Mods toolbar
- Improved code for partition-checked modtypes
- Added button to open LogicMods folder - folder icon in Mods toolbar
- Minor code improvements

## [0.3.1] - 2025-04-03

- Corrected a typo in a notification message.

## [0.3.0] - 2025-04-02

- Made Simple Mod Merger download optional via a notification with a button to download it.
- Enabled mod types for Config and Save mods. The mod types will only be avaiable if the game, staging folder, and user folder are on the same partition.
- Added notifications when attempting to install a mod type that is not available because the game, staging folder, and user folder are not on the same partition.
- Added notification to enable the toolbar when a profile is changed.
- Fixed pak mods not being sortable in the load order if not sourced from Nexus Mods.
- Cleaned up the code.
