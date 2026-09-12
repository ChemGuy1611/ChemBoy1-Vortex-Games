# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: Mod files with no file extension were skipped during installation

## [2.5.4] - 2026-09-06

- Fixed: Locked load order entries could be moved out of position when using "Move to Top", "Move to Bottom" or the position number box on another entry. Locked entries now keep their place.
- Fixed: The load order position number box now accepts low numbers even when a locked entry is further down the list.

## [2.5.3] - 2026-09-04

- Added: Right-click menu on the load order: enable or disable an entry, lock or unlock it, move it to the top or bottom, and open its staging folder or mod page. Works on one entry or several at once.
- Added: Lock button on each load order row, plus ctrl/shift multi-select.
- Added: Load order filter by status (enabled, disabled, locked, unlocked, unmanaged) with a matched/total count.
- Added: Load order entries for mods Vortex does not manage are now marked "Not managed by Vortex".
- Fixed: A locked load order entry no longer unlocks itself after deploying or reopening the load order page.
- Fixed: Opening the load order on a fresh install could fail with a "file doesn't exist" error for default.archcfg. The file is now created if it is missing.

## [2.5.2] - 2026-07-29

- Fixed: The load order could disappear after deploying while a mod update was in progress, and only came back after deploying a second time.
- Added: A message now appears if you change the load order while a mod update is still finishing, so it is clear the change was not applied and needs to be made again.
- Fixed: After a mod update finished, the load order page could keep showing out-of-date information until another deployment was run.

## [2.5.1] - 2026-07-25

- Fixed: Using "Update all" to update several mods at once could move them in the load order or uncheck them.

## [2.5.0] - 2026-07-22

- Fixed: Updating a mod could uncheck it or move it in the load order, especially on profiles other than the one you were using.

## [2.4.0] - 2026-04-22

- Improved: Load Order rendering using React - show mod image thumbnails

## [2.2.2] - 2026-03-24

- Improved: .arch06 mod installer can now handle mods with multiple .arch06 files and variants
- Fixed: Mods no longer incorrectly marked as "Not Managed by Vortex" if the .arch06 files in the mod archive were nested in a folder

## [2.2.1] - 2026-01-29

- Added: Button to open MEML Mods GitHub page

## [2.2.0] - 2026-01-28

- Added: Support for Middle-earth-Mod-Loader - installer and button to download. Note that this loader has some bugs and is not recommended
- Fixed: DLL Loader will now only auto-download if neither DLL Loader nor Middle-earth-Mod-Loader are installed (in Vortex or manually in the game folder)
- Added: Button to open PacketLoader.ini file

## [2.1.0] - 2025-12-22

- Added Load Order support and automatic update of default.archcfg file for .arch06 mods

## [2.0.0] - 2025-12-19

- Inital Release
