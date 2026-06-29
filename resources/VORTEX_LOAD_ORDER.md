# Vortex Load Order (runtime)

How the app drives mod **load order** at runtime: reading it from disk, persisting reorders,
serializing it back to the game's order file, and validating it. The registration API
(`registerLoadOrder`), the row renderer, the legacy API, and the separate Gamebryo plugin system
are the authoring view: see `LOAD_ORDER_REGISTRATION.md`, `LOAD_ORDER_ITEM_RENDERER.md`,
`reference_legacy_load_order`, `GAMEBRYO_PLUGIN_SYSTEM.md`.

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

1. **Load** — on `gamemode-activated` / profile change, the core ext calls the game's
   `deserializeLoadOrder()` (reads the game's order file), seeds the `UpdateSet`
   (`updateSet.init(gameId, …)`), and dispatches `setFBLoadOrder(profile.id, loadOrder)`.
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

## UpdateSet — reconciling external changes

`UpdateSet.ts` tracks the known load-order entries (`toExtendedLoadOrderEntry`) so that when the
order file is re-read after a deploy, new/removed entries (e.g. a mod added outside the page) are
merged in predictably (`updateSet.restore`).

## Sort by deploy order

The page's `onSortByDeployOrder` resolves the mods referenced by the load order, runs
`util.sortMods(gameId, mods, api)` (the mod-rules topological sort), and reorders the list to
match — surfacing a non-reportable error on `CycleError` (circular mod rules).

## Collections

`file_based_loadorder/collections/loadOrder.ts` (`generate`, `parser`, `Interface`) captures the
load order into a collection and restores it on install (`genCollectionLoadOrder`). See
`reference_collections_feature`.

## Events / state

| Thing | Role |
| --- | --- |
| `state.persistent.loadOrder[profileId]` | The order (watched for reorders) |
| `did-deploy` / `will-purge` / `did-purge` | Re-serialize/deserialize triggers |
| `gamemode-activated` / profile change | Initial deserialize + seed |

## Gotchas

- `applyNewLoadOrder` reacts to state change — dispatching `setFBLoadOrder` inside it loops forever.
- If the profile can't be resolved when setting order, the user is told to re-activate the game.
- FBLO and Gamebryo plugins are independent; a Bethesda game can use both (FBLO for non-plugin
  mods, plugin management for ESPs).
- `serializeLoadOrder` is the **only** place the on-disk order file is written; it receives both
  the new and previous order so extensions can diff.

## See also

Runtime siblings: `VORTEX_PROFILES.md`, `VORTEX_DEPLOYMENT.md`, `VORTEX_GAME_LIFECYCLE.md`,
`VORTEX_EVENT_BUS.md`. Overview: `VORTEX_APP.md`. Authoring: `LOAD_ORDER_REGISTRATION.md`,
`LOAD_ORDER_ITEM_RENDERER.md`, `GAMEBRYO_PLUGIN_SYSTEM.md`. Memory: `reference_vortex_load_order`.
