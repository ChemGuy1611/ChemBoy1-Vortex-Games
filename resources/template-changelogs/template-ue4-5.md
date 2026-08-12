# template-ue4-5 Changelog

## [2026-08-11]

- Fixed: `setup()` now pushes `BINARIES_PATH` onto `MODTYPE_FOLDERS` unconditionally, so the Binaries folder is created and checked for write access regardless of `ue4ssLoadOrder`. `SCRIPTS_PATH` is `BINARIES_PATH` plus the UE4SS mods subfolder, so before the previous release's gating that push was also what ensured the Binaries folder existed. Once `ue4ssLoadOrder` gated it, a game with UE4SS support off left the `BINARIES_ID` mod type — which is never gated — without an ensured target folder. Propagated to all 13 games at template parity. No behavior change on the 11 that run `ue4ssLoadOrder = true`, since the folder was already being created via `SCRIPTS_PATH`; it is a real fix only for `game-tekken8` and `game-fantasylifeithegirlwhostealstime`. `game-stalker2heartofchornobyl` uses a direct `fs.ensureDirWritableAsync` call instead of a `MODTYPE_FOLDERS` push, matching how that file already handles `SCRIPTS_PATH`; `game-windrose` needed the push in both `setup()` and `setupServer()`.

## [2026-08-10] (2)

- Changed: `hasXbox` is now derived from the active discovery IDs. It is declared with `let` and initialised to `false`, followed by `if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;`, so adding the Xbox app ID to `DISCOVERY_IDS_ACTIVE` is enough to switch on the Xbox version logic. Setting the initialiser to `true` still forces it on for games that need it without an Xbox ID in the list.

## [2026-08-10]

- Changed: `ue4ssLoadOrder` is now the master toggle for UE4SS support, not just for the load order page. Its comment says so. When it is off, the template no longer registers any of the UE4SS pieces:
  - Mod types: `SCRIPTS_ID`, `DLL_ID`, `UE4SS_ID` and the declarative `LOGICMODS_ID` entry (removed from `spec.modTypes` by a filter next to the existing `hasModKit` block).
  - Installers: `LOGICMODS_ID`, `UE4SS_ID`, `SCRIPTS_ID`, `DLL_ID`.
  - Folders created by `setup()`: the UE4SS Mods folder, its `BPModLoaderMod` subfolder, and the LogicMods entry in `MODTYPE_FOLDERS`.
  - The UE4SS auto-download in `setup()`: `autoDownloadUe4ss` keeps its own toggle but now only applies when `ue4ssLoadOrder` is on, so a game with UE4SS support off cannot download UE4SS on setup.
  - Toolbar buttons: "Open UE4SS Mods Folder", "Open LogicMods Folder", "Download UE4SS", "Open UE4SS Settings INI", "Open UE4SS mods.txt".

  `UE4SSCOMBO_ID` is deliberately left ungated - that installer also handles mods with both Binaries and Content folders that have nothing to do with UE4SS. LogicMods is gated on `ue4ssLoadOrder` rather than `logicModsLoadOrder` because LogicMods are blueprint paks loaded by UE4SS's `BPModLoaderMod`. Button order is unchanged: the guards wrap the buttons where they already sat, so no button moves relative to the ungated ones. Propagated to all 11 games at template parity; no behavior change there, since every one of them has `ue4ssLoadOrder = true`.

## [2026-07-29] (2)

Mod-update load order guard: placeholder row replaced by a freeze. Applied across all 20 files carrying the guard, template included.

- Fixed: the load order went blank after a deployment that landed while a mod update was in flight, and only reappeared after a second deployment. While the guard was armed, every `deserialize*` returned a synthetic `mod update in progress` row. That row is not display-only - whatever a deserializer returns becomes the load order state, because core FBLO dispatches `deserializeLoadOrder`'s result straight into `persistent.loadOrder[profileId]` unfiltered and `didDeploy` dispatches the UE4SS/LogicMods results into their own reducers. The matching `serialize*` was suppressed, so the on-disk order survived and only the next deserialize could restore it. Each deserializer now returns the stored order for `selectors.lastActiveProfileForGame(state, gameId)` unchanged: positions are still frozen for the duration of the update, but the page keeps showing the real order. Note that rejecting instead of returning is not a safe way to decline - three of core's four `deserializeLoadOrder` call sites swallow the error, but `onStartUp` routes it through `errorHandler` and shows the user a failed-operation notification on page open.
- Added: `notifyLoadOrderPaused(api, gameId)`, called by `serializeLoadOrder`, `serializeUe4ss` and `serializeLogicMods` before their early return. With the real order now on screen the page looks interactive, so a reorder attempted mid-update would otherwise be dropped silently. Fixed notification id per game, so repeated attempts collapse into one.
- Fixed: the pak/FBLO page still showed the frozen order after the update finished, until another deployment ran. `emitAndAwait` fans `did-deploy` out to all listeners concurrently and invokes them in registration order, and core's file_based_loadorder extension is registered before any game extension - so core's `genDeploymentEvent` calls `deserializeLoadOrder` and reads `mod_update_all_profile` synchronously, before `didDeploy` reaches the line that clears it. The sidecar UE4SS/LogicMods orders were unaffected because `didDeploy` re-deserializes those itself, after clearing. `didDeploy` now captures `guardWasArmed` before the reconciliation loop and, on the deploy that actually clears the guard, re-runs `deserializeLoadOrder` and dispatches `actions.setFBLoadOrder(profileId, refreshedLO)` - the same thing core would have done. Forcing a second deployment would also work but re-links every managed file; this is one deserialize and one dispatch. `deserializeLoadOrder({ api })` is safe because the whole chain (`generateProps`, `ensureLOFile`) only ever reads `context.api`.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-28]

React/load-order audit, perf and polish pass (F12-F18), ported from game-subnautica2 0.5.3 (live-tested there first).

- Added: three shared hooks at the top of the React block - `useInjectStyleOnce(styleId, css)`, `useDismissOnOutside(onClose)` and `useClampedMenuPosition(x, y)` - plus the `LO_INDEX_FOCUS_CSS` / `LO_ROW_HIDDEN_CSS` / `LO_CTX_MENU_CSS` constants. They replace 8 inline style-injection blocks over 4 style ids, 3 copies of the context-menu dismiss effects and 3 copies of `clampRef`. The context menus and row renderers themselves are deliberately left triplicated: a template is a copy-paste artifact, so consolidation stays inside the one file.
- Fixed: the lock icon on a load order row no longer selects the row. The lock `div` called `onClick: onLock` bare, so the click bubbled to the row's `onSelect`. Back-ported from `game-warhammer40kdarktide`, which already had the guard.
- Changed: mod enable/disable on the load order surfaces now calls `actions.setModsEnabled(api, profileId, modIds, enable, { allowAutoDeploy: true })` instead of hand-rolling `util.batchDispatch` + a custom deployment notification. Six sites: both multi-select menu handlers, both single-item menu handlers, the pak row's mod toggle and the LogicMods row's Disable button. The helper diffs `willChange` first, runs inside `api.withPrePost('enable-mods')` and emits `mods-enabled`, all of which the manual path skipped, so other extensions never saw the change. `allowAutoDeploy: true` does not force a deploy - core auto-deploys only when the user's `settings.automation.deploy` is on, and otherwise dispatches `setDeploymentNecessary`, which raises Vortex's own "Deployment Required" banner in place of the extension's custom one.
- Changed: `Ue4ssItemRenderer` stats the conventional config locations instead of running `util.walk` over its mod folder. The walk ran per row on every page open and profile switch, and its `found` flag did not stop it early. It now stats `UE4SS_CONFIG_FILES` plus `<id>.txt|.ini|.json` in the mod folder, its `Scripts` folder and its `dlls` folder - 18 stats, no directory reads. Trade-off: a config file kept below some other subfolder no longer surfaces a Configure button.
- Changed: `LoadOrderItemRenderer` reads `item.position` and `item.lockedEntriesCount`, which FBLO already precomputes and memoises per row, falling back to the old whole-order scans. Rows no longer all re-render on any load order change.
- Changed: the UE4SS row uses the react-bootstrap `Checkbox` (already destructured, previously unused) rather than a raw `<input type="checkbox">`, matching the other rows.
- Removed: the UE4SS and LogicMods pages no longer register their own click/contextmenu dismiss listeners. Each menu now owns its dismissal through `useDismissOnOutside`, so the LogicMods menu is no longer dismissed twice and the UE4SS menu no longer depends on its page for it.

## [2026-07-27]

React/load-order audit fix set, ported from game-subnautica2 0.5.2 (live-tested there first).

- Fixed: `serializeUe4ss` could truncate `mods.txt`. The splice used `lines.slice(0, bpIdx + 1)` and `lines.slice(kbIdx)` unguarded, so a missing `Keybinds` line (`kbIdx === -1`) reduced the tail to the final line and a missing `BPModLoaderMod` line dropped the header. Replaced with `headEnd = bpIdx >= 0 ? bpIdx + 1 : 0` and `tailStart = kbIdx >= headEnd ? kbIdx : lines.length`, so a missing marker degrades to rebuilding the band. Note: `lines.length` is the wrong `headEnd` fallback - the head would then swallow the previously written order and the mapped order would be appended after it, duplicating the whole block on every write.
- Fixed: the load order band no longer wipes stock lines. Upstream `mods.txt` keeps `jsbLuaProfilerMod : 0` and the `; Built-in keybinds, do not move up!` comment between the two markers, and both were overwritten on every serialize. The band is now re-emitted through a whitelist: comments and `UE4SS_NATIVE_MODS` lines survive, everything else is treated as load-order-owned. A blacklist ("keep anything not in the current order") was rejected because it preserves the line of a removed mod forever, and each stale line is a live UE4SS load instruction for a folder that no longer exists.
- Changed: `UE4SS_NATIVE_MODS` now lists all 11 folders RE-UE4SS ships. `ActorDumperMod` and `jsbLuaProfilerMod` were missing, so ActorDumperMod got both a stock `: 0` line and an extension-written `: 1` line, and jsbLuaProfilerMod's stock disabled line was wiped and re-added enabled. Side effect: any load order entry persisted for those two folders is dropped on the next deserialize, and they no longer receive an `enabled.txt`.
- Fixed: locked entries no longer move. "Move to Top" built `[...locked, item, ...rest]`, which duplicated a locked `item` into the order, and "Move to Bottom" ignored locks entirely. Both single-item handlers now bail on a locked target, and multi-select "Move to Bottom" counts locked entries into `rest` - filtering them out of the selection alone would drop them from the order completely.
- Fixed: the filter box on the UE4SS and LogicMods pages threw a TypeError on the first keystroke after a collection install. Collection data carries no `name` until the first deserialize, so the pages now filter on `(e.name ?? e.id)` and the row renderers display `item.name ?? item.id`.
- Fixed: `deserializeUe4ss` / `deserializeLogicMods` on page mount had no `.catch`, so opening a page with the mods folder unreadable (UE4SS not installed) produced an unhandled rejection. Both now log a warning instead.
- Fixed: locks on the LogicMods page were lost on every deploy. `makeEntry` dropped `locked`, and `deserializeLogicMods` rebuilds every entry on each `did-deploy` and profile switch. It now takes the persisted entry as `prev` and carries the flag across.
- Fixed: shift-select on the Pak page spanned rows hidden by the status filter, because `allIds` came from the full order. It is now built from the status-filtered order, memoized in the renderer (`React.useMemo` keyed on the order, filter set and `modState`) - filtering per row would be O(n^2) over the load order.
- Fixed: the `enabled.txt` reconcile notification over-reported deletions. `fs.removeAsync` is rimraf and never reports a missing file, so the delete branch counted every folder; it now stats the marker first.

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
