# template-ue4-5 Changelog

## [2026-07-25]

- Added: `mods-update` listener beside the existing `mod-update` one. The "Update all" button only emits `mods-update` (with local mod ids), so the mod-update load order guard never armed for batch updates. The listener resolves each local id to its `attributes.modId` before tracking it, since `remove-mod` looks tracking up by Nexus mod id.
- Changed: `updateModIds` is now a `Map` of Nexus mod id to `{ firstSeen, targetFileId }`, and `didDeploy` reconciles it per id instead of clearing it wholesale. Tracking for a mod is released only once a mod with that Nexus id, carrying the `fileId` being updated TO, is installed and enabled for the profile - or after `MAX_UPDATE_WAIT_MS` (5 minutes) if the update never lands. Previously a deploy firing part-way through a batch disarmed the guard for every mod still waiting to be reinstalled, and the UE4SS/LogicMods blocks further down the same handler then rewrote their order files with those mods missing.
- Note: the `fileId` comparison is what makes the reconciliation correct. A plain "installed and enabled" check cannot tell the new version from the one being replaced, since a mod whose update has not started yet is also still installed and enabled - so it would release tracking for the rest of the batch on the first deploy. `mod-update` supplies the target fileId as its third argument; the `mods-update` path reads `attributes.newestFileId` from state. When the target is unknown (non-Nexus mod, or no update chain) the check falls back to "installed and enabled".

- Added: Mod-update load order guard, ported from game-subnautica2 0.4.1. Updating a mod no longer unchecks it or moves it in the load order (Pak, UE4SS, LogicMods), including on profiles other than the one you're using. Tracks in-flight updates via the `mod-update`/`remove-mod`/`will-install-mod` events and pauses load order read/write until deployment confirms the update settled.

## [2026-07-20]

- Added: `writeEngineVersion` toggle (default off). When enabled, `didDeploy` writes `ENGINE_VERSION` (`MajorVersion`/`MinorVersion`) into the `EngineVersionOverride` section of `UE4SS-settings.ini` whenever UE4SS is installed, using `vortex-parse-ini` (`IniParser`/`WinapiFormat`). Generalized from `game-witchfire` 0.4.1.

## [2026-07-12]

- Added: Status filtering on all load order pages (Enabled/Disabled, Locked/Unlocked, Unmanaged), ported from game-subnautica2 0.4.0. Pak Load Order page gets filter pills in the info panel (`StatusPills` + `usePakLOState` statusFilter state + `lo-row-hidden` row hiding with injected `:has()` CSS); UE4SS and LogicMods pages get a `LoadOrderStatusFilter` dropdown beside the search box. Shows a "matched / total" count while a filter is active. Shared `matchesStatus` predicate (AND across groups, OR within a group; text search ANDs on top).
- Added: `getModPageURL` and `getModStagingFolder` helpers; "Open Mod Page" and "Open Staging Folder" context-menu items on all load order pages (Vortex-managed entries only). UE4SS multi-select gets "Open Staging Folders (N)".
- Added: `setVortexModsEnabled` helper; "Disable Vortex Mod" / "Enable Vortex Mod" toggle on the UE4SS Load Order context menu (single + "Disable Vortex Mod (N)" multi).
- Changed: LogicMods context menu "Disable Mod" is now a two-way "Disable Vortex Mod" / "Enable Vortex Mod" toggle; Pak context menu "Disable Mod" renamed to "Disable Vortex Mod".
- Changed: Context menus on all load order pages aligned to the canonical section order, with the Vortex mod enable/disable section moved to the bottom of each menu.

## [2026-07-01]

- Changelog tracking started for this template.
