# Changelog

## Planned Improvements (Not Yet Released)

- Changed launcher settings so that Steam version launches through Steam (so that Steam launch arguments are used).

## [1.0.1] - 2026-07-29

- Fixed: The load order could disappear after deploying while a mod update was in progress, and only came back after deploying a second time.
- Added: A message now appears if you change the load order while a mod update is still finishing, so it is clear the change was not applied and needs to be made again.
- Fixed: After a mod update finished, the load order page could keep showing out-of-date information until another deployment was run.

## [1.0.0] - 2026-07-29

- Changed: Load order rows redraw less when the order changes.
- Changed: The right-click menu works out its position once when opened instead of adjusting after it appears.

## [0.7.2] - 2026-07-27

- Fixed: "Move to Top" and "Move to Bottom" now leave locked entries where they are, instead of moving them or adding a duplicate entry.
- Fixed: Shift-clicking two rows while a status filter is active no longer selects the hidden rows between them.

## [0.7.1] - 2026-07-25

- Fixed: Using "Update all" to update several mods at once could move them in the load order or uncheck them.

## [0.7.0] - 2026-07-22

- Fixed: Updating a mod could uncheck it or move it in the load order, especially on profiles other than the one you were using.
- Added: Lock button on each load order entry.
- Added: Multi-select (Ctrl/Shift-click) and right-click context menu for the load order list.
- Added: Right-click options to open a mod's folder, staging folder, or mod page, and to enable/disable the Vortex mod.
- Added: Load order status filter (enabled/disabled, locked/unlocked, unmanaged) with a match count.
- Added: "Not managed by Vortex" indicator on load order entries with no matching mod.

## [0.6.0] - 2026-04-22

- Improved: Load Order rendering using React - show mod image thumbnails
- Fixed: Game version detection for Xbox version

## [0.5.1] - 2026-03-04

- Fixed: Corrected mod path for Xbox version (Documents)

## [0.5.0] - 2026-03-03

- Added: Xbox version support
- Improved: Filtering of the mod folder read to prevent invalid load order entries
- Added: Launch tools for each game version
- Fixed: Steam-related load order code no longer running on non-Steam versions

## [0.4.3] - 2026-01-29

- Fixed: path strings
- Added: Buttons to open PCGamingWiki page, view changelog, open downloads folder, and submit bug reports

## [0.4.2] - 2025-07-14

- Mods will now maintain their load order postion and enable/disable state when updating. Thanks to infarctus.

## [0.4.1] - 2025-03-29

- GOG version support added

## [0.4.0] - 2025-03-27

- Made game discovery more reliable
- Fixed load order errors that could sometimes occur when switching profiles

## [0.3.2]

- The mod.manifest file for Steam Workshop mods is now read only from the root folder

## [0.3.1]

- Fixed path replace functions for setting path to Steam Workshop mods folder
- Updated some notification text related to Steam Workshop mods

## [0.3.0]

- Added mods from Steam Workshop to load order. This obviously only applies to the Steam version of the game
