# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.2] - 2026-09-06

- Fixed: Locked load order entries could be moved out of position when using "Move to Top", "Move to Bottom" or the position number box on another entry. Locked entries now keep their place.
- Fixed: The load order position number box now accepts low numbers even when a locked entry is further down the list.

## [1.0.1] - 2026-08-24

- Fixed: Deploying could fail with an error when the load order had not been read yet, which can happen while installing a collection.
- Fixed: The load order no longer stops working for the rest of the session if its file cannot be read or is damaged.

## [1.0.0] - 2026-08-11

- Added: Pak Load Order page now supports Enable/Disable, lock, multi-select, right-click context menu, and status filtering (Enabled/Disabled, Locked/Unlocked, Unmanaged).
- Added: Installer support for mods that contain both a Binaries folder and a Content folder.
- Removed: The UE4SS LogicMods mod type, which needs UE4SS support that this extension does not enable.
- Fixed: Mods no longer briefly lose their enabled state or load order position on other profiles while a mod update is being installed.

## [0.1.0] - 2026-04-04

- Initial release
