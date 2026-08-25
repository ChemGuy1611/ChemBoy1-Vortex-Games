# Changelog

## Planned Improvements (Not Yet Released)

- None

## [1.0.1] - 2026-08-24

- Fixed: Deploying could fail with an error when the load order had not been read yet, which can happen while installing a collection.
- Fixed: The load order no longer stops working for the rest of the session if its file cannot be read or is damaged.

## [1.0.0] - 2026-08-21

- Rebuilt the pak load order on Vortex's current load order page. Entries can be locked in place, selected in bulk with Ctrl-click, and managed from a right-click menu.
- Added a status filter to the load order page, with a count of matched and total entries.
- Added a UE4SS Load Order page for Lua and DLL script mods, and a LogicMods Load Order page for Blueprint pak mods.
- Added UE4SS and LogicMods load orders to collections.
- Load order positions are now held in place while a mod update is installing.
- Added support for the Xbox (Game Pass) version of the game.
- UE4SS and the IOStore sideloader are now offered automatically when the game is first set up.
- Added buttons to open the UE4SS settings file and the UE4SS mods.txt file.

## [0.1.0] - 2025-06-02

- Initial release
