# Changelog

## Planned Improvements (Not Yet Released)

- None

## [0.5.0] - 2026-07-23

- Added: UE4SS Load Order page - drag-and-drop mods.txt management with lock, multi-select, a Configure button for mods with settings files, and per-profile state.
- Added: LogicMods/Blueprint pak Load Order page - manages load order for Blueprint pak mods.
- Added: Pak Load Order page now supports Enable/Disable, lock, multi-select, right-click context menu, and status filtering (Enabled/Disabled, Locked/Unlocked, Unmanaged).
- Added: A Settings toggle to turn UE4SS Load Order management on or off.
- Added: Collections support for UE4SS and LogicMods load orders.
- Added: Load order features listed above are now available for the Dedicated Server entry as well.
- Changed: "Open UE4SS mods.json" button now opens mods.txt instead.
- Fixed: Mods no longer briefly lose their enabled state or load order position on other profiles while a mod update is being installed.

## [0.4.1] - 2026-04-30

- Fixed: Corrected save extension to ".sst"

## [0.4.0] - 2026-04-29

- Fixed: Changed pak mod pathing to avoid deployment JSON files in Pak folders (game tries to load them) - Please purge mods, make sure the ~mods folders are empty, and then re-install your pak mods.

## [0.3.0] - 2026-04-24

- Added: Dedicated Server support - registered as a separate game
- Added: Option to install to both SP and MP Paks folders

## [0.2.0] - 2026-04-21

- Added: Pak installer will now ask if you want to install to the Client (SP) or Server (MP) Paks folder.
- Changed: UE4SS download button now points to working build on Nexus.
- Improved: Custom load order React item renderer (Witcher3-style)
- Improved: Load Order page instructions rendered with React.

## [0.1.2] - 2026-04-15

- Fixed: Epic EA version discovery

## [0.1.1] - 2026-04-13

- Fixed: Game launch for EA release

## [0.1.0] - 2026-03-25

- Initial release
