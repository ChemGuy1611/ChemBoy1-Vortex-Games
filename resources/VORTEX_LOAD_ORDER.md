# Vortex Load Order (runtime)

How the app drives mod **load order** at runtime: reading it from disk, persisting reorders,
serializing it back to the game's order file, and validating it. The registration API
(`registerLoadOrder`), the row renderer, the legacy API, and the separate Gamebryo plugin system
are the authoring view: see `LOAD_ORDER_REGISTRATION.md`, `LOAD_ORDER_ITEM_RENDERER.md`,
`GAMEBRYO_PLUGIN_SYSTEM.md`.

There are **two distinct** load-order systems plus a legacy page:

| System | Where | For |
| --- | --- | --- |
| **File-based load order (FBLO)** | `file_based_loadorder` core ext | The modern, generic system most games use |
| **Gamebryo plugins** | `gamebryo-plugin-management` bundled ext | Bethesda `.esp`/`.esl` (LOOT sort, `plugins.txt`) — separate |
| Legacy `mod_load_order` | `mod_load_order` core ext | Older renderer-page variant |

This doc is about **FBLO**. Gamebryo plugins are a parallel system (`GAMEBRYO_PLUGIN_SYSTEM.md`).

## What FBLO stores

- State: **`state.persistent.loadOrder[profileId]`** — a `LoadOrder` = `ILoadOrderEntry[]`
  (each entry has `id`, `modId`, `enabled`, `name`, …). **Per profile** (registered reducer at
  `['persistent','loadOrder']`; reorder dispatches `setFBLoadOrder(profileId, loadOrder)`).
- Per-game behaviour comes from the entry an extension registered via `registerLoadOrder`:
  `deserializeLoadOrder()`, `serializeLoadOrder(newLO, prev)`, `validateLoadOrder(...)`,
  optional `condition()`, `toggleableEntries`, etc. The core ext looks these up with
  `findGameEntry(gameId)`.

## The page

`registerMainPage('sort-none', 'Load order', FileBasedLoadOrderPage, …)` with `priority: 30`,
`id: 'file-based-loadorder'`, `group: 'per-game'`, hotkey `E`. `visible()` shows it only when the
active game has a registered FBLO entry (and its `condition()` passes). The page renders a
drag-and-drop list (`ItemRenderer.tsx`).

## Lifecycle (runtime)

1. **Load** — the core ext calls the game's `deserializeLoadOrder()` (reads the game's order
   file), seeds the `UpdateSet` (`updateSet.init(gameId, …)`), and dispatches
   `setFBLoadOrder(profile.id, loadOrder)`. **`gamemode-activated` is not a trigger** — that
   listener exists (`onGameModeActivated`) but its registration is commented out in `context.once`.
   What actually fires a load is: an `onStateChange` on `['persistent','profiles']`
   (`genProfilesChange`, so any profile write including a mod being enabled), `did-deploy` /
   `did-purge`, an `onStateChange` on `['session','base','toolsRunning']`, `onStartUp`, and the
   page mounting. **All of them are skipped while `session.base.activity.installing_dependencies`
   is non-empty**, so nothing seeds the load order during a collection install.
2. **Reorder** — the user drags items; `setFBLoadOrder` changes `persistent.loadOrder[profileId]`.
   An `onStateChange` on that path computes prev vs new and calls **`applyNewLoadOrder`**, which:
   - `findGameEntry(profile.gameId)` (warns if the game isn't registered),
   - `gameEntry.serializeLoadOrder(newLO, prev)` — **writes the game's order file** (e.g.
     `mods.txt`), then
   - `validateLoadOrder(api, profile, newLO)` — game-specific validation; failures go through
     `errorHandler`.
   It must **never** dispatch `setFBLoadOrder` itself (infinite loop).
3. **Deploy / purge** — `did-deploy`, `will-purge`, `did-purge` each route through
   `genDeploymentEvent(api, profileId, type)`, which re-`deserializeLoadOrder()`s and re-seeds
   state. On **`did-deploy`** the deserialized order is passed through `updateSet.restore(...)` so
   externally-introduced entries are reconciled against the known set.

## `deserializeLoadOrder` contract

**Whatever it returns becomes the load order.** Every call site dispatches the result straight into
`persistent.loadOrder[profileId]` via `setFBLoadOrder` — no filtering, no merging against the
previous order, no validation on that path (`validate` runs on the reorder and start-up paths, not
here). A deserializer that returns a stand-in value — a placeholder row, a truncated list, an empty
array on a transient read failure — has *replaced* the user's load order, and the state persists, so
it survives until the next successful deserialize. To decline to rebuild (e.g. while a mod update is
in flight) return the currently stored order unchanged; that is a no-op dispatch and leaves the page
showing the real order.

**An extension's own `did-deploy` handler cannot pre-empt it.** `emitAndAwait` fans the event out to
every listener concurrently — it emits synchronously, each listener enqueues a promise, and the
caller `Promise.all`s them. Listeners are invoked in registration order, and the core
file_based_loadorder extension registers before any game extension, so `genDeploymentEvent` calls
`deserializeLoadOrder()` before a game extension's `did-deploy` handler has run a single line. Any
module-level flag that handler sets or clears is therefore read in its *pre-handler* state by that
deserialize. An extension that needs the order re-read after its handler has done its work must do
it itself: call its own deserializer and dispatch `actions.setFBLoadOrder(profileId, lo)` (exported
through the public `actions` barrel). Dispatching it feeds `genLoadOrderChange`, which diffs against
the previous order and calls `serializeLoadOrder` when it really changed, so the corrected order also
reaches disk.

**Rejecting leaves the order unset, not preserved.** On the three swallowing call sites a rejection
means `setFBLoadOrder` is never dispatched, so `persistent.loadOrder[profileId]` keeps whatever it
had — which on a profile that has never deserialized successfully is *nothing at all*. A deserializer
that reads its order file outside its `try` block therefore turns one unwritable game folder or one
damaged order file into a load order that stays unset for the whole session. Read the file inside the
try and fall back to the stored order (never to `[]`, which would diff against the stored order and
serialize straight back over the file).

**Rejecting is not a safe "do nothing".** Three of the four call sites — the `gamemode-activated` /
profile-change seed, `genLoadOrderChange`, and `genDeploymentEvent` — wrap the call in
`try { … } catch { /* nop */ }` and simply skip the dispatch. But `onStartUp` routes a throw through
`errorHandler`, which calls `reportError` and shows the user a "Failed load order operation" error.
`ProcessCanceled` / `DataInvalid` / `UserCanceled` only suppress the *report* button, not the
notification.

## UpdateSet — surviving mod updates and purge cycles

`UpdateSet.ts` remembers the load-order entries and the **index** each one held
(`toExtendedLoadOrderEntry`), so a load order re-read from disk can be put back into the order the
user chose. It is the mechanism that keeps a mod's position when the mod is updated or reinstalled.

**Armed by removals, not by update events.** `onWillRemoveMods` listens on `will-remove-mods` /
`will-remove-mod` and, when `IRemoveModOptions.willBeReplaced` is `true` (set by the install
manager's replace path and by profile-replace), stores the affected entries' indices and sets
`updateSet.shouldRestore = true`. `will-purge` arms it the same way, from the current stored order.
`diffLoadOrder` arms it too, whenever an entry that stayed at the same index is now backed by a mod
with a different `fileId` — i.e. an update landed underneath it.

**While armed:**

- `genLoadOrderChange` **skips `applyNewLoadOrder`**, so nothing is serialized to the game's order
  file. This is what stops a transient mid-update read (a mod's staging folder briefly absent
  between the old version's removal and the new version's install) from being written back to disk
  as a shortened order.
- `updateSet.init(...)` is a no-op, so the remembered indices cannot be overwritten by whatever
  state the order is in mid-update.

**On `did-deploy`:** the freshly deserialized order is passed through `updateSet.restore(...)`,
which sorts it by the remembered indices (entries it doesn't know keep their current position),
disarms itself, and re-seeds from the restored order.

Arming happens **per removal**, so a batch of updates arms once per mod, each time before that
mod's own vulnerable window.

## Mod updates and load-order position

Two core behaviours matter to an extension author:

- **An updated mod keeps its mod id.** When the install manager takes the replace path for a new
  version, it reuses the previous mod's id (and therefore its staging folder name). The load-order
  entry id is unchanged across the update, so a `deserializeLoadOrder` that matches on mod id finds
  the entry already in the order file — nothing gets appended as if it were a brand-new mod.
- **The protection is event-source-agnostic.** It hangs off `will-remove-mods`, which fires
  downstream of both the single-mod update button (`mod-update`) and the bulk "Update all" flow
  (`mods-update`) — see `VORTEX_NEXUS_INTEGRATION.md`. An extension that arms its own guard from
  `mod-update` alone will not arm for bulk updates; the core protection still applies.
- **Only FBLO state is covered.** All of the above operates on
  `state.persistent.loadOrder[profileId]` and the game entry registered through
  `registerLoadOrder`. A *sidecar* order — a custom `registerMainPage` list with its own reducer and
  its own order file, e.g. the UE4SS and LogicMods pages in the Unreal templates — is invisible to
  core: no arming, no serialize suppression, no restore. Such a page has to guard itself while an
  update is in flight (`LOAD_ORDER_REGISTRATION.md`, "Sidecar orders get none of the core update
  protections").
- **One known gap:** if a deployment completes *mid-batch* (collection installs, `autoDeploy` off,
  or a manual deploy), `restore()` disarms, the resulting `setFBLoadOrder` re-seeds the `UpdateSet`
  through the `SET_FB_LOAD_ORDER` action check — dropping the remembered index of a mod that is
  still mid-update — and the next state diff serializes the shortened order to disk. In the normal
  auto-deploy path this does not happen: deployment waits for installs to go idle
  (`installManager.waitForIdle()`), so a batch collapses into a single `did-deploy` after every mod
  has landed. An extension guard that suppresses its own `serializeLoadOrder` while an update is in
  flight covers that gap.

## Sort by deploy order

The page's `onSortByDeployOrder` resolves the mods referenced by the load order, runs
`util.sortMods(gameId, mods, api)` (the mod-rules topological sort), and reorders the list to
match — surfacing a non-reportable error on `CycleError` (circular mod rules).

## Collections

`file_based_loadorder/collections/loadOrder.ts` (`generate`, `parser`, `Interface`) captures the
load order into a collection and restores it on install (`genCollectionLoadOrder`). See
`COLLECTIONS_FEATURE.md`.

## Events / state

| Thing | Role |
| --- | --- |
| `state.persistent.loadOrder[profileId]` | The order (watched for reorders) |
| `did-deploy` / `will-purge` / `did-purge` | Re-serialize/deserialize triggers |
| `gamemode-activated` / profile change | Initial deserialize + seed |

## Gotchas

- **`persistent.loadOrder[profileId]` may not exist, and may not be an array.** It is written only
  by the triggers listed above, so a fresh profile — or any profile whose first deployment comes out
  of a collection install, where those triggers are all suppressed — reaches deploy time with no key
  at all. Installs carried over from the deprecated `registerLoadOrderPage` hold the *legacy object*
  (`{ modId: { pos, enabled } }`) at the same state path. Core defends itself
  (`if (!Array.isArray(currentStoredLO)) currentStoredLO = []` in `genDeploymentEvent`); extension
  code reading the path must do the same. Branch on `Array.isArray`, not on a local "am I FBLO"
  flag, and give `getSafe` a default that matches the branch you are about to take — a `{}` default
  in front of a `.findIndex` call is the classic crash.
- **A `mergeMods` callback that reads load order state runs during deployment and its throws are
  fatal.** `genSubDirFunc` (`mod_management/util/deploy.ts`) only swallows the error when `mod` is
  `null` (the merge pseudo-mod); for a real mod it rethrows and the deployment fails. The safe
  fallback is a sentinel prefix that sorts last, not an exception.
- `applyNewLoadOrder` reacts to state change — dispatching `setFBLoadOrder` inside it loops forever.
- If the profile can't be resolved when setting order, the user is told to re-activate the game.
- FBLO and Gamebryo plugins are independent; a Bethesda game can use both (FBLO for non-plugin
  mods, plugin management for ESPs).
- `serializeLoadOrder` is the **only** place the on-disk order file is written; it receives both
  the new and previous order so extensions can diff.
- For games whose deployment purges first (`directoryCleaning: 'tag'` with `requiresCleanup`), every
  deploy fires `did-purge` as well — so a naive `deserializeLoadOrder` can run at a moment when a
  mod being updated has no folder on disk. That is what the `UpdateSet` arming above exists for.
- Don't arm an extension-side update guard from `mod-update` only — the bulk update flow emits
  `mods-update` instead and never re-emits `mod-update`.
- An extension-side guard must suppress `serializeLoadOrder` **and** make `deserializeLoadOrder`
  return the stored order — returning a placeholder instead wipes the visible load order for as long
  as the guard stays armed. Same applies to a sidecar order's own deserializer, which the extension
  dispatches into its own reducer. Tell the user when a reorder is being skipped: with the real
  order still on screen the page looks interactive, and a silently dropped drag reads as a bug.

## See also

Runtime siblings: `VORTEX_PROFILES.md`, `VORTEX_DEPLOYMENT.md`, `VORTEX_GAME_LIFECYCLE.md`,
`VORTEX_MOD_INSTALL.md` (mod id reuse on update), `VORTEX_NEXUS_INTEGRATION.md` (update events),
`VORTEX_EVENT_BUS.md`. Overview: `VORTEX_APP.md`. Authoring: `LOAD_ORDER_REGISTRATION.md`,
`LOAD_ORDER_ITEM_RENDERER.md`, `GAMEBRYO_PLUGIN_SYSTEM.md`. Diagram of the FBLO lifecycle:
`VORTEX_FLOWCHARTS.md` §3. On-disk shape of `persistent###loadOrder` (array vs per-entry
children): `VORTEX_DATABASES.md`.
