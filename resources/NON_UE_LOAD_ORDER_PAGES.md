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
| `game-helldivers2` | Autodesk Stingray | G | Full FBLO renderer + context menu + status filter |

Two Unreal games also sit in tier B (`game-fantasylifeithegirlwhostealstime`, `game-tekken8`) —
they carry the minimal renderer without the UE4SS stack, so tier B guidance applies to them too.

Tier names used throughout:

- **Tier G — generic FBLO stack.** Everything the UE4-5 pak surface has, minus UE4SS and LogicMods.
- **Tier B — minimal renderer.** A custom row renderer and custom instructions, nothing else.

**These tiers describe current state, not a design decision.** Tier B is the older baseline every
FBLO game had before the lock-button / multi-select / context-menu work landed; the games listed
there are the ones that rollout has not reached yet, and each is expected to become tier G when its
turn comes. Read tier B as "not migrated", not as "deliberately smaller".

There used to be a third tier, **L — legacy**, for extensions still on the deprecated
`registerLoadOrderPage` with no React at all. It held one game, `game-helldivers2`, and it was
described as a permanent exception on the grounds that its merge step renames files by load order
position at deploy time. That reasoning does not hold: how a game consumes its order is independent
of which API registers the page. Version 1.0.0 moved it to tier G and left the merge step untouched.
A future merge-based game belongs in tier G too.

`game-nioh3` is *not* a load order game. It used to carry a `registerLoadOrderPage` call gated behind
`const loadOrderEnabled = false`, which never registered; that block and its helpers (`preSort`,
`loadOrderPrefix`, `makePrefix`, the loose-file `installMod` variant) were removed in 0.3.1, and the
mod type now merges with `mergeMods: () => ""` unconditionally. Because the categoriser matches the
`registerLoadOrderPage` call and not the toggle, the game only dropped out of the generated
`resources/lists/games-loadorder.txt` once the call itself was gone.

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

## 4. When the load order is not what the engine reads

Every other game in this document writes its order somewhere the game reads directly, so a row's
position is the thing that takes effect. `game-helldivers2` is the exception worth understanding
before copying its shape.

It patches archives by adding files named `<archive hash>.patch_N` beside the archive they modify.
Order only matters between two mods patching the *same* archive, and the numbering for one archive
has to run `0..N-1` with no gaps — a hole does not reorder the mods, it stops them loading. So the
load order page presents a single list of every patch mod, and each archive derives its own
numbering from that one list by walking it and handing out consecutive numbers to whichever mods
touch that archive. A separate page lists only the archives that more than one enabled mod touches,
and lets the order be overridden for one of those archives on its own.

Two consequences for anyone reading that code as a model:

- **A row's position is not its `patch_N`.** The order is an input to a computation, not the output.
  Do not copy the indirection into a game whose order maps 1:1 onto what the engine consumes.
- **The order does nothing until deployment**, because the renaming happens in the merge step. This
  is the one generic-FBLO game whose info panel legitimately keeps the "deploy to apply" wording.

Its enablement model also differs, and copying it blind is the usual mistake: the game has no list
of its own in which an entry can be marked active, so `toggleableEntries` is `false` and "enabled"
means the Vortex mod is enabled. The status filter therefore reads the profile's mod state rather
than the entry's own `enabled` flag, and the context menu offers a single Enable/Disable pair
instead of the usual two.

Until version 1.0.0 this extension was the sole occupant of a "tier L" for the deprecated
`registerLoadOrderPage` API. Full legacy contract, for extensions still on it:
`LOAD_ORDER_REGISTRATION.md` section 1a.

---

## 5. Shared gotchas

Everything in this section is code these games inherited from the same lineage as the UE templates,
so the same defects travel with it.

- **A locked entry never moves.** Both single-item move handlers open with
  `if (isLocked(item)) return lo;`. Without it, "Move to Top" builds
  `[...lo.filter(isLocked), item, ...rest]` and a locked `item` appears twice — a duplicate id in
  state and in the written LO file — while "Move to Bottom" drags locked entries down.
  The multi-select "Move to Bottom" needs the matching rule on its side: locked entries are excluded
  from the moved selection **and** counted into `rest`
  (`lo.filter(e => !targets.find(t => t.id === e.id) || isLocked(e))`). Excluding them from the
  selection alone drops locked+selected entries out of both arrays, i.e. out of the load order.
- **Shift-select must span visible rows only.** `allIds` comes from the status-filtered order, not
  the full one, and is memoised in the renderer (`React.useMemo` keyed on the order and the filter
  set) — a bare filter there runs once per row, which is the same O(n²) the precomputed-props item
  below removes. Tier G defines "enabled" as the entry's own flag, so the memo needs no `modState`
  selector; the UE4-5 pak page does.
- **Read the precomputed props.** `currentIdx` and `lockedCount` come from `item.position` /
  `item.lockedEntriesCount`, which the FBLO page already memoises per row, with the whole-order
  scans left only as fallbacks. Recomputing them unconditionally subscribes every row to the entire
  order, so any change re-renders all rows. Tier B still does that — it gets the fixed shape when
  its migration rewrites the LO region.
- **Clamp the menu by rendering, not by mutating.** `useClampedMenuPosition(x, y)` returns
  `[position, measureRef]`: the menu is measured once into state and the clamped `left`/`top` are
  rendered. The earlier `clampRef` wrote `el.style.left/top` from a callback ref rebuilt every
  render — it worked (React re-invokes a ref whose identity changed) but caused detach/reattach
  churn. `useRef` + `useLayoutEffect` with `[]` deps is not the fix: it fires once, and later
  renders reapply the unclamped inline position with nothing to re-clamp it.
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
`templates/` (one file per template, with the mechanics of each).

`HELLDIVERS2_MOD_MANIFEST.md` (how that game's patch files are chosen at install time, before the
load order page ever sees them).
