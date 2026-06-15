# Changelog

## Future Changes (NOT IMPLEMENTED YET)

- ModKit?

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
