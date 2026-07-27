# Non-UE Load Order React Code

The Unreal templates are not the only extensions with hand-written load order UI. Ten non-Unreal
games in this repository register a load order, and their React code splits into three clearly
separated tiers plus one legacy holdout. This document maps the tiers, walks the shared code, and
records exactly where each tier diverges from the UE4-5 stack described in
`UE4_5_REACT_ARCHITECTURE.md`.

Read that document first for the shared foundations (module resolution, `DraggableList` row
lifecycle, `IItemRendererProps`, virtualization). Everything here is stated as a delta against it.

---

## 1. The landscape

| Game | Engine / loader | Tier | React surface |
| --- | --- | --- | --- |
| `game-kingdomcomedeliverance2` | CryEngine | G | Full FBLO renderer + context menu + status filter |
| `game-warhammer40kdarktide` | Stingray / DMF | G | Full FBLO renderer + context menu + status filter |
| `game-menace` | — | B | Minimal renderer |
| `game-mewgenics` | — | B | Minimal renderer |
| `game-middleearthshadowofwar` | LithTech-derived | B | Minimal renderer |
| `game-thelastofuspart2` | Naughty Dog engine | B | Minimal renderer |
| `game-warhammer40000spacemarine2` | Swarm | B | Minimal renderer |
| `game-warhammer40kdarkheresy` | — | B | Minimal renderer |
| `game-warhammer40kroguetrader` | Unity | B | Minimal renderer |
| `game-helldivers2` | Autodesk Stingray | L | None — legacy `registerLoadOrderPage` |

Two Unreal games also sit in tier B (`game-fantasylifeithegirlwhostealstime`, `game-tekken8`) —
they carry the minimal renderer without the UE4SS stack, so tier B guidance applies to them too.

Tier names used throughout:

- **Tier G — generic FBLO stack.** Everything the UE4-5 pak surface has, minus UE4SS and LogicMods.
- **Tier B — minimal renderer.** A custom row renderer and custom instructions, nothing else.
- **Tier L — legacy.** `registerLoadOrderPage`, no React at all.

**These tiers describe current state, not a design decision.** Tier B is the older baseline every
FBLO game had before the lock-button / multi-select / context-menu work landed; the games listed
there are the ones that rollout has not reached yet, and each is expected to become tier G when its
turn comes. Read tier B as "not migrated", not as "deliberately smaller". Tier L is the one genuine
exception: `game-helldivers2` stays on the legacy API because its merge step renames files by load
order position on deploy.

`game-nioh3` is *not* a load order game despite containing a `registerLoadOrderPage` call: the block
is gated behind `const loadOrderEnabled = false` and never registers. The generated
`resources/lists/games-loadorder.txt` still lists it, because the categoriser matches the call and
not the toggle.

---

## 2. Tier G — the generic FBLO stack

`game-kingdomcomedeliverance2` and `game-warhammer40kdarktide` carry the same block. A direct diff of
the two React sections is 24 lines, entirely instruction text and path resolution — treat it as one
canonical implementation with two skins.

### Components

| Identifier | Role |
| --- | --- |
| `LoadOrderInstructions` | `usageInstructions` component: status pills, matched/total counter, injects the row-hiding stylesheet |
| `useFbloState` | Module-level pub-sub for selection, context menu and status filter |
| `StatusPills` | Inline filter pills for the info panel |
| `matchesStatus` + `STATUS_GROUP_TOKENS` + `STATUS_TOKEN_LABELS` | Shared status-filter predicate and labels |
| `LoadOrderItemRenderer` | `customItemRenderer` for the core FBLO page |
| `FbloContextMenu` | Right-click menu, single and multi-select variants |
| `getModPageURL` / `getModStagingFolder` | Menu target resolvers |

Names differ from the UE4-5 template only by prefix: `useFbloState` / `_fbloListeners` /
`_fbloSelectedIds` where the template says `usePakLOState` / `_pakListeners` / `_pakSelectedIds`,
and `FbloContextMenu` where the template says `PakContextMenu`. The mechanism is identical: module
variables plus a listener `Set` of `forceUpdate` callbacks, because rows rendered by Vortex's own
`DraggableList` cannot be wrapped in a context provider.

### Deltas against the UE4-5 pak surface

| Aspect | UE4-5 pak surface | Tier G |
| --- | --- | --- |
| `toggleableEntries` | `false` — checkbox never renders | `true` — checkbox is live |
| Meaning of `enabled` | unused; ordering comes from folder renames at deploy | written to the game's load order file as a comment marker |
| Status filter "enabled" predicate | Vortex `modState` lookup | `(e) => e.enabled !== false`, the LO entry flag |
| Row buttons | Enable/Disable button that toggles the Vortex mod | none; enable/disable lives on the checkbox and in the menu |
| Toggling a Vortex mod | `util.batchDispatch` + custom `requestDeployment` notification | `actions.setModsEnabled(api, profileId, modIds, enable, { allowAutoDeploy: true })` |
| Lock icon click | plain `onClick` — also selects the row | `evt.stopPropagation()` first, so locking does not change selection |
| Sidecar orders | UE4SS + LogicMods pages, reducers, collection feature | none |
| Ordering applied | at deploy, via folder-name prefixes | immediately, on write of the LO file |

The last row is the important one. These games write a real load order file the game reads directly,
so a reorder takes effect without a deployment, and a disabled entry is expressed by commenting the
line out:

```js
// warhammer40kdarktide — <gameDir>/<MOD_FOLDER>/<LO_FILE>
loadOrder.map((mod) => (mod.enabled ? mod.id : `-- ${mod.id}`)).join('\n')
// written with a `-- File managed by Vortex mod manager` header

// kingdomcomedeliverance2 — <gameDir>/<LO_PATH>, or the absolute LO_PATH_XBOX on Xbox
loadOrder.map((mod) => (mod.enabled ? mod.id : `#${mod.id}`)).join('\n')
```

Both serializers early-return while a batch mod update is in flight (`mod_update_all_profile`), the
same guard the UE templates use.

### `actions.setModsEnabled` — the better enable/disable path

Tier G calls the core helper rather than dispatching per-mod actions by hand:

```js
actions.setModsEnabled(context.api, profile.id, modIds, enabled, { allowAutoDeploy: true });
```

Verified behaviour (`Vortex\src\renderer\src\extensions\profile_management\actions\profiles.ts`):

- Filters to mods whose state actually changes before doing anything.
- Runs inside `api.withPrePost('enable-mods', ...)`, so pre/post hooks registered by other
  extensions fire.
- Batches the individual `setModEnabled` dispatches internally.
- Emits the `mods-enabled` event with `(modIds, enable, gameId, options)`.
- Reports failures through `showErrorNotification` instead of throwing into the UI.

Options are `{ installed?, allowAutoDeploy?, willBeReplaced?, reason? }`. `reason` feeds the
`mods_state_changed` analytics event and defaults to `user_manual`; programmatic callers are expected
to set it.

`allowAutoDeploy: true` does not force a deployment — it only declines to *suppress* one. The
downstream `mods-enabled` handler
(`Vortex\src\renderer\src\extensions\mod_management\index.ts`, `onModsEnabled`) branches like this:

- `settings.automation.deploy` on AND `allowAutoDeploy !== false` → schedules a debounced deploy, and
  the user sees no prompt.
- otherwise → dispatches `setDeploymentNecessary(gameId, true)`, which raises Vortex's own
  "Deployment Required" banner.

So an extension replacing a hand-rolled `setDeploymentNecessary` + custom notification with this
helper does not leave the user without a deploy prompt in either case: auto-deploy users get the
deploy, everyone else gets the core banner in place of the custom one. The handler also dismisses any
stale `may-enable-<modId>` notification for each affected mod.

Hand-rolling `util.batchDispatch(dispatch, mods.map(setModEnabled))` skips the pre/post hooks and
never emits `mods-enabled`, so anything listening for that event does not react. Prefer the helper in
new code.

---

## 3. Tier B — the minimal renderer

Seven non-Unreal games (plus two Unreal ones) carry a much smaller renderer. What it has:

- `MainContext` for `api`, `useDispatch`, and `useSelector` reads of profile, load order and mods.
- `currentIdx` / `lockedCount` recomputed from the load order.
- `LoadOrderIndexInput` for the numeric position box.
- A thumbnail slot fed by `attributes.pictureUrl`.
- The entry name, and the `displayCheckboxes` checkbox branch.
- A custom `LoadOrderInstructions` component for the info panel.

What it does not have: lock toggle UI, "Not managed by Vortex" banner, row selection, context menu,
status filter, and any Vortex-mod enable/disable control. `isLocked` and `lockedCount` are still
computed, but only to feed `LoadOrderIndexInput`.

The checkbox branch is live in six of them; `game-menace`, `game-fantasylifeithegirlwhostealstime`
and `game-tekken8` set `toggleableEntries: false`, which makes their checkbox branch dead code in
exactly the way the UE4-5 pak surface's is.

Tier B is the right baseline for a new game whose load order is a simple ordered list, and it is
also where every existing FBLO game started. Upgrading one to tier G means adding, in order: the
status helpers, the pub-sub hook, the pills in the info panel, the lock column and hidden-row
handling in the renderer, then the context menu — the checklist in section 6. Because that upgrade
rewrites the whole load order region, it is the right moment to also correct the defects listed in
section 5 rather than patching them into the old shape first.

---

## 4. Tier L — legacy `registerLoadOrderPage`

`game-helldivers2` still uses the deprecated API. There is no React component anywhere in its load
order path: `createInfoPanel` returns a translated string, `preSort` supplies the ordering, and a
`callback` requests deployment when the order changes. It also registers a merge for `.patch0`
graphics mods, which re-runs on deploy — that is why its info panel keeps the "deploy to apply"
wording that generic FBLO games should not show.

Full legacy contract: `LOAD_ORDER_REGISTRATION.md` section 1a.

---

## 5. Shared gotchas

Everything in this section is code these games inherited from the same lineage as the UE templates,
so the same defects travel with it.

- **Locked-entry duplication.** Tier G's single-item "Move to Top" builds
  `[...lo.filter(isLocked), item, ...rest]`; if `item` is itself locked it appears twice, producing
  a duplicate id in state and in the written LO file. The multi-select variant already excludes
  locked entries.
- **"Move to Bottom" ignores locks** in both variants, while "Move to Top" honours them.
- **Shift-select spans hidden rows.** `allIds` is built from the full load order, so a shift-click
  range silently includes rows the status filter has hidden.
- **Precomputed props ignored.** Rows recompute `currentIdx` and `lockedCount` with a `useSelector`
  over the whole order instead of reading `item.position` / `item.lockedEntriesCount`, which the
  FBLO page already memoises. Every row re-renders on any order change. Applies to tier B as well.
- **`clampRef` churn.** The context menu's viewport clamp is a fresh callback ref every render, so
  React detaches and reattaches it each time, and a re-render rewrites the inline style over the
  clamped position.
- **Early return before hooks.** `if (item?.loEntry === undefined) return null;` precedes every hook
  in the renderer. It is a props-shape guard whose result does not flip for a mounted row, but any
  new early return must go after the hook block.
- **Module-scope filter state.** The pub-sub variables are never reset on profile switch, so a
  status filter stays applied and stale selection ids linger.

---

## 6. Porting checklist — tier G into another FBLO game

1. Confirm the game writes a real load order file the game reads (otherwise ordering needs deploy,
   and the info panel wording changes — see `LOAD_ORDER_REGISTRATION.md`).
2. Copy the status helpers (`STATUS_GROUP_TOKENS`, `STATUS_TOKEN_LABELS`, `matchesStatus`),
   `getModPageURL`, `getModStagingFolder`.
3. Copy the pub-sub block, renaming the module variables to the game's own prefix so two extensions
   never share state through a shared name.
4. Copy `StatusPills` and wire it into the game's `LoadOrderInstructions`, including the
   `fblo-status-filter-hide-style` injection.
5. Copy `LoadOrderItemRenderer`, adjusting the status-filter `isEnabledFn` to the game's definition
   of enabled (LO entry flag when `toggleableEntries: true`, Vortex `modState` otherwise).
6. Copy the context menu, adjusting the "Open Mod Folder" path resolution and keeping
   `actions.setModsEnabled` for Vortex-mod toggling.
7. Register with `customItemRenderer` and `usageInstructions`; leave `uniformRowHeight` unset,
   because these rows are not uniform.

---

## See also

`UE4_5_REACT_ARCHITECTURE.md` (the full stack these tiers are deltas against).
`LOAD_ORDER_REGISTRATION.md` (`registerLoadOrder` and legacy `registerLoadOrderPage` contracts).
`LOAD_ORDER_ITEM_RENDERER.md` (row anatomy, props, virtualization).
`VORTEX_REACT_PAGES.md` (page/settings registration primitives).
`VORTEX_LOAD_ORDER.md` (FBLO runtime orchestration).
`TEMPLATES_OVERVIEW.md` (which template each game derives from).
