# UE4-5 Template React Layer

A granular walkthrough of every React component in `template-ue4-5\index.js`, the Vortex runtime
machinery each one plugs into, and the data flow that connects them. The template ships three
distinct load order surfaces plus a settings panel and a collections view; this document explains
what Vortex owns, what the extension owns, and where the seams are.

Companion documents cover the individual APIs in isolation: `VORTEX_REACT_PAGES.md` (page and
settings registration), `LOAD_ORDER_REGISTRATION.md` (the `registerLoadOrder` contract),
`LOAD_ORDER_ITEM_RENDERER.md` (per-row renderer deep dive), `COLLECTIONS_FEATURE.md` (collection
data export). This document is the map that ties them together.

---

## 1. Runtime model — how React reaches an extension

An extension is a plain CommonJS file loaded at runtime with Node's `require`, not bundled and not
transpiled. It still gets working hooks, context and Redux because Vortex patches module resolution
before any extension loads.

### The require patch

`Vortex\src\renderer\src\util\extensionRequire.ts` replaces `Module.prototype.require` during
renderer startup (installed from `ExtensionManager.ts`, grep `extensionRequire`). For any file whose
path starts with a registered extension path, the patched require:

1. Special-cases a handful of module ids (table below).
2. Otherwise calls `webpackRequireHack(id)` — which is `__non_webpack_require__`, the raw Node
   require left untouched by webpack — resolving from the application bundle's location.
3. Falls back to the original require (resolution from the extension's own folder) only if step 2
   throws or returns `undefined`.

Because the renderer's webpack config uses `webpack-node-externals`
(`Vortex\src\renderer\webpack.config.cjs`, `externals: [nodeExternals()]`), packages such as
`react`, `react-dom`, `react-redux` and `react-bootstrap` are **not** inlined into the bundle — the
application itself requires them from `node_modules` at runtime. Step 2 therefore hits Node's
module cache and hands the extension the exact same module object the application is using.

Three consequences that the whole React layer depends on:

- **One React instance.** Hooks work, and `React.useContext(MainContext)` resolves against the
  provider Vortex mounted. Two copies of React would break both.
- **One Redux store.** `useSelector`/`useDispatch` from `react-redux` bind to the `Provider` Vortex
  mounted around the app; the extension never creates a store or a provider.
- **Only what Vortex ships can be required.** A package absent from Vortex's `node_modules` fails
  both resolution steps. This is the mechanical reason for the project rule that extension
  `index.js` may only import libraries present in Vortex or vendored into this repository.

### Special-cased module ids

| Required id | What the extension actually receives |
| --- | --- |
| `vortex-api` / `@nexusmods/vortex-api` | A `Proxy` around the api module, per extension. `log()` is wrapped to prefix messages with the extension namespace |
| `redux-act` | A `Proxy` whose `createAction` injects `{ extension: <name> }` into action metadata |
| `react-select` | Vortex's `ReactSelectWrap`, not the upstream package |
| anything else | Raw Node require resolved from the application bundle, then from the extension folder |

The `vortex-api` proxy is why `log('warn', ...)` inside an extension shows up namespaced in the
Vortex log with no extra work.

### No JSX, lazy requires

The template writes `React.createElement(type, props, ...children)` throughout — there is no build
step to compile JSX. Two stylistic consequences visible everywhere in the file:

- Vortex-provided UI primitives used at module scope (`MainPage`, `FlexLayout`, `DNDContainer`,
  `DraggableList`) are destructured from the top-level `require('vortex-api')`.
- `react-bootstrap`, `react-redux` and secondary `vortex-api` exports (`Icon`,
  `LoadOrderIndexInput`, `MainContext`, `Toggle`, `More`) are required **inside** component
  function bodies. This is safe (module cache makes repeat calls free) and keeps module load order
  independent of when Vortex finishes initialising its own UI exports.

---

## 2. Component inventory

Fifteen components, two React contexts, one custom hook and three shared helpers, all defined after
`main()` and before `module.exports`. Function declarations hoist, so registration calls inside
`main()` can reference components defined further down the file.

| Identifier | Kind | Mounted by |
| --- | --- | --- |
| `LoadOrderInstructions` | component | Vortex FBLO page, via `usageInstructions` |
| `LoadOrderItemRenderer` | component | Vortex FBLO page, via `customItemRenderer` |
| `PakContextMenu` | component | `LoadOrderItemRenderer` (conditional child) |
| `StatusPills` | component | `LoadOrderInstructions` |
| `LoadOrderStatusFilter` | component | `Ue4ssLoadOrderPage`, `LogicModsLoadOrderPage` headers |
| `GameSettings` | component | Settings dialog, via `registerSettings` |
| `Ue4ssLoadOrderPage` | component (page) | Sidebar, via `registerMainPage` |
| `Ue4ssItemRenderer` | component | `DraggableList` inside `Ue4ssLoadOrderPage` |
| `Ue4ssContextMenu` | component | `Ue4ssItemRenderer` (conditional child) |
| `Ue4ssLoadOrderInfoPanel` | component | `Ue4ssLoadOrderPage` |
| `LogicModsLoadOrderPage` | component (page) | Sidebar, via `registerMainPage` |
| `LogicModsItemRenderer` | component | `DraggableList` inside `LogicModsLoadOrderPage` |
| `LogicModsContextMenu` | component | `LogicModsItemRenderer` (conditional child) |
| `LogicModsLoadOrderInfoPanel` | component | `LogicModsLoadOrderPage` |
| `CollectionsDataView` | component | Collection workshop tab, via `registerCollectionFeature` |
| `Ue4ssSelectionContext` | React context | Provider in `Ue4ssLoadOrderPage` |
| `LogicModsSelectionContext` | React context | Provider in `LogicModsLoadOrderPage` |
| `usePakLOState` | custom hook | `LoadOrderInstructions` + every `LoadOrderItemRenderer` row |
| `matchesStatus` | helper | all three surfaces |
| `getModPageURL` | helper | all three context menus |
| `getModStagingFolder` | helper | all three context menus |

---

## 3. The three load order surfaces

The template manages three unrelated orderings, each with its own page, state and on-disk format.
The single most useful mental model is which side owns the page shell.

| Aspect | Pak mods | UE4SS script/DLL mods | LogicMods (Blueprint paks) |
| --- | --- | --- | --- |
| Page shell owner | Vortex (`registerLoadOrder`) | Extension (`registerMainPage`) | Extension (`registerMainPage`) |
| Redux path | `persistent.loadOrder.<profileId>` | `persistent.ue4ssLoadOrder.<profileId>.loadOrder` | `persistent.logicModsLoadOrder.<profileId>.loadOrder` |
| Action creator | `actions.setFBLoadOrder` (core) | `setUe4ssLoadOrder` (extension) | `setLogicModsLoadOrder` (extension) |
| Sidecar file | `<profileId>_loadOrder.json` in game dir | `<profileId>_ue4ss_loadOrder.json` in UE4SS Mods dir | `<profileId>_logicMods_loadOrder.json` in `BPModLoaderMod` |
| Game-facing file | folder-name prefixes applied on deploy | `mods.txt` | `BPModLoaderMod\load_order.txt` |
| Ordering applied | on deploy (folder rename) | immediately on change | immediately on change |
| Selection state | module-level pub-sub (`usePakLOState`) | React context (`Ue4ssSelectionContext`) | React context (`LogicModsSelectionContext`) |
| Status filter UI | inline pills in info panel | dropdown beside search box | dropdown beside search box |
| Per-entry `enabled` | checkbox suppressed (`toggleableEntries: false`) | real, written to `mods.txt` | absent; enable/disable means the Vortex mod |
| Feature toggle | `PAKMOD_LOADORDER` + `FBLO` | `ue4ssLoadOrder` + settings toggle | `logicModsLoadOrder` |

---

## 4. Surface A — the Vortex-owned FBLO page

### Registration

```js
context.registerLoadOrder({
  gameId: spec.game.id,
  validate: async () => Promise.resolve(undefined),
  deserializeLoadOrder: async () => await deserializeLoadOrder(context),
  serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
  toggleableEntries: false,
  usageInstructions: LoadOrderInstructions,
  customItemRenderer: LoadOrderItemRenderer,
});
```

The extension supplies two components and three functions; Vortex supplies everything else.

### What Vortex renders around the extension

From `FileBasedLoadOrderPage.tsx`:

```text
MainPage
  MainPage.Header -> IconBar (group 'fb-load-order-icons')
  MainPage.Body
    Panel > PanelX.Body
      FilterBox                      (Vortex's own text filter)
      DNDContainer
        FlexLayout type="row" .file-based-load-order-container
          FlexLayout.Flex .file-based-load-order-list
            DraggableList            (itemRenderer = customItemRenderer ?? default)
          FlexLayout.Flex
            InfoPanel                (renders usageInstructions + validation console)
```

The row/column split is hardcoded: the info panel is always to the right of the list.

### Props each row receives

Vortex builds row props through `RenderRowsCache` (`renderRows.ts`), which memoises the full row
array on `(loadOrder, invalid, toggleable)` and the filtered slice separately on the filter text, so
an unrelated re-render reuses the same row objects and leaves each row's `React.memo` intact.

```ts
interface IItemRendererProps {
  loEntry: ILoadOrderEntry;
  displayCheckboxes: boolean;
  invalidEntries?: IInvalidResult[];
  position?: number;            // 1-based, over the FULL order, computed before filtering
  lockedEntriesCount?: number;  // count of locked entries in the full order
  setRef?: (ref: any) => void;  // present in the type, not supplied by DraggableListItem
}
```

`position` and `lockedEntriesCount` are precomputed for exactly the two values the template needs
for `LoadOrderIndexInput`. The template ignores both and recomputes them with `useSelector` over the
whole load order:

```js
const currentIdx = loadOrder.findIndex((e) => e.id === loEntry.id) + 1;
const lockedCount = loadOrder.filter(isLocked).length;
```

This works and stays correct, but it makes every row subscribe to the entire load order array, so
any load order change re-renders all rows. Switching to `item.position` and
`item.lockedEntriesCount` would let the memoised rows stay untouched — worth knowing before adding
more per-row state.

### Virtualization is off for this template

```ts
virtualized={gameEntry?.customItemRenderer === undefined || gameEntry?.uniformRowHeight === true}
```

Supplying `customItemRenderer` disables windowing unless the extension also sets
`uniformRowHeight: true`, because windowing measures row pitch from the first two rendered rows and
assumes it holds for all of them. The template's rows wrap long mod names onto multiple lines, so
they are deliberately non-uniform and the template does not set the flag. `DraggableList` also only
windows above `VIRTUALIZE_THRESHOLD = 100` rows, so short lists render in full either way.

Practical effect: every row of a large pak load order is mounted at once. That is what makes the
status filter's "render a hidden row" trick viable (a windowed list would not keep filtered rows
mounted), and it is the reason per-row work should stay cheap.

### `usageInstructions` gets no props

`InfoPanel.tsx` renders a component-valued `usageInstructions` as `<Info />` — no props at all, not
even `t`. `LoadOrderInstructions` therefore pulls everything it needs from hooks: `usePakLOState`
for the shared status filter, and `useSelector` for the active profile, the load order and the
profile's `modState` (to compute the `matched / total` counter next to the pills). It also injects
the stylesheet that collapses filtered rows.

### `usePakLOState` — module-level pub-sub

The rows are mounted by Vortex's `DraggableList`, so the extension cannot wrap them in a context
provider. The template shares state through module variables plus a listener set:

```js
let _pakSelectedIds = new Set();
let _pakContextMenu = null;
let _pakStatusFilter = new Set();
const _pakListeners = new Set();
function _notifyPak() { _pakListeners.forEach(l => l()); }

function usePakLOState() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    _pakListeners.add(forceUpdate);
    return () => _pakListeners.delete(forceUpdate);
  }, []);
  return { /* current values + setters that mutate then notify */ };
}
```

Every mounted row and the info panel register one `forceUpdate` each, so any setter re-renders all
of them in one pass. State lives at module scope, which means it is shared per extension instance
(one game), survives page unmount, and is reset only by explicit assignment.

### `LoadOrderItemRenderer` structure

Hook order in the body, in sequence: `useContext(MainContext)`, `useDispatch`, four `useSelector`
calls (profile, load order, mods, mod-enabled state), five `useCallback` handlers
(`onApplyIndex`, `onToggle`, `onModToggle`, `onSelect`, `onContextMenu`, `onLock`), `usePakLOState`,
and one `useEffect` that injects the index-input focus stylesheet.

Two structural details worth flagging:

- The guard `if (item?.loEntry === undefined) return null;` sits **before** any hook call. It is a
  props-shape guard rather than a state-dependent branch — for a given mounted row the outcome never
  flips, so hook order stays stable in practice. Any new early return must go **after** all hooks.
- The status filter check is placed after every hook for exactly that reason, and returns a hidden
  row rather than `null`:

```js
if (!matchesStatus(loEntry, statusFilter, () => isModEnabled, isLocked)) {
  return React.createElement(ListGroupItem, { key: loEntry.id, className: 'lo-row-hidden', style: { display: 'none' } });
}
```

Hiding the row alone is not enough: `DraggableListItem` wraps every renderer in two `<div>`s the
extension cannot reach, and their spacing leaves visible gaps. The injected stylesheet collapses the
wrapper instead:

```css
.file-based-load-order-list .list-group > div:has(.lo-row-hidden) { display: none !important; }
```

Rendered row contents, in order: drag handle (hidden via `visibility` when locked, which preserves
layout width), `LoadOrderIndexInput`, lock toggle, 96x54 thumbnail slot (mod picture, or a yellow
"Not managed by Vortex" banner when `loEntry.modId` is undefined), name, Enable/Disable button for
the underlying Vortex mod, optional checkbox, and the context menu when this row owns it.

### `PakContextMenu`

Rendered as a conditional last child of the row that opened it. Three `useEffect` calls: Escape
key, click/contextmenu dismissal, and hover-style injection. Menu contents depend on selection size
— with two or more selected rows including this one, every action applies to the whole selection and
labels carry a `(n)` suffix.

---

## 5. Surface B — the UE4SS page

### Registration and state

```js
context.registerReducer(['settings', GAME_ID], { reducers: { [setUe4ssLoEnabled.toString()]: ... }, defaults: { ue4ssLoEnabled: true } });
context.registerSettings('Mods', GameSettings, () => ({}), () => selectors.activeGameId(context.api.getState()) === GAME_ID, 150);
context.registerReducer(['persistent', 'ue4ssLoadOrder'], { reducers: { [setUe4ssLoadOrder.toString()]: ... }, defaults: {} });
context.registerMainPage('unreal', 'UE4SS Load Order', Ue4ssLoadOrderPage, {
  id: `${GAME_ID}-ue4ss-loadorder`, priority: 31, group: 'per-game', hotkey: 'U',
  mdi: UE4SS_ICON,
  visible: () => selectors.activeGameId(context.api.store.getState()) === GAME_ID && ue4ssLoadOrder,
  props: () => ({ api: context.api }),
});
```

Reducers are registered before the page. The `visible` predicate deliberately ignores the settings
toggle so the page stays reachable when the feature is switched off — the page itself renders an
explanatory message in that case.

### `Ue4ssLoadOrderPage`

Local state: `filterText`, `statusFilter`, `selectedIds`, `contextMenu`. Redux reads: active
profile id, the load order for that profile, and the `ue4ssLoEnabled` setting.

Three effects:

| Effect | Dependencies | Purpose |
| --- | --- | --- |
| context-menu dismiss | `[contextMenu]` | document-level click/contextmenu listeners while a menu is open |
| load order refresh | `[profileId]` | guard on `activeGameId`, then `deserializeUe4ss` -> dispatch, clear selection |
| stylesheet injection | `[]` | index-input focus colours + scroll container fix, id-guarded |

Rendering short-circuits twice before the main tree: a "disabled in Settings" message when the
toggle is off, and a "No UE4SS mods are installed" message when the order is empty. Both are placed
after all hooks.

The main tree mirrors the layout Vortex uses for FBLO, assembled by hand:

```text
MainPage
  MainPage.Header -> FormControl type="search" + LoadOrderStatusFilter
  MainPage.Body
    DNDContainer
      FlexLayout type="column" .file-based-load-order-container
        FlexLayout.Flex .file-based-load-order-list  (overflowY auto, minHeight 0)
          Ue4ssSelectionContext.Provider
            DraggableList
        div (flexShrink 0)
          Ue4ssLoadOrderInfoPanel
```

Column rather than row, so the info panel sits below the list instead of beside it — the one layout
choice a custom page can make that `registerLoadOrder` cannot.

### Reordering a filtered list

`DraggableList` only ever sees the filtered array, so the reordered array it hands back must be
mapped onto positions in the full order:

```js
const isFiltered = !!filterText || statusFilter.size > 0;

const onApply = React.useCallback((reordered) => {
  let newLO;
  if (isFiltered) {
    const filteredIds = new Set(reordered.map(e => e.id));
    const positions = loadOrder.reduce((acc, e, i) => { if (filteredIds.has(e.id)) acc.push(i); return acc; }, []);
    newLO = [...loadOrder];
    positions.forEach((pos, i) => { newLO[pos] = reordered[i]; });
  } else {
    newLO = reordered;
  }
  dispatch(setUe4ssLoadOrder(profileId, newLO));
  serializeUe4ss(api, newLO);
}, [dispatch, loadOrder, isFiltered, profileId]);
```

Visible entries are permuted among the slots they already occupied; hidden entries keep their
absolute positions. The guard must test both filter kinds — text search and status filter — hence
`isFiltered` rather than `filterText`. Vortex's own FBLO page takes the other route and refuses to
apply a reorder while its filter box is non-empty.

### `Ue4ssItemRenderer`

Same skeleton as the pak renderer, with three differences:

- Selection and context-menu state come from `React.useContext(Ue4ssSelectionContext)` instead of
  the module pub-sub, because this page owns its `DraggableList`.
- The row's checkbox writes `enabled` into the **load order entry**, which `serializeUe4ss`
  translates into `mods.txt` (`<folder> : 1|0`). This is independent of whether the Vortex mod is
  enabled; the context menu exposes the Vortex mod state separately.
- A `useEffect` keyed on `[gamePath, item.id]` walks the mod's folder looking for a config file
  (`UE4SS_CONFIG_FILES` plus `<id>.txt|.ini|.json`) and stores the first hit in local state. When
  found, the row grows a "Configure" button that opens the file with `util.opn`.

### Write path — `mods.txt`

`serializeUe4ss` writes the per-profile JSON sidecar, then rewrites `mods.txt` in place: it keeps
every line up to and including the `BPModLoaderMod` line, splices the mapped load order in, and
appends everything from the `Keybinds` line onward. Native UE4SS mods above and below those markers
are preserved untouched; extension-managed mods occupy the band between them.

---

## 6. Surface C — the LogicMods page

Structurally a copy of the UE4SS page (own `DraggableList`, own selection context, dropdown status
filter, column layout, `isFiltered` remap in `onApply`), differing in what an entry means.

Entries are built by `deserializeLogicMods` from the `.pak` basenames found under the `LogicMods`
folder, matched back to Vortex mods through the `logicModFiles` install attribute (an array of pak
basenames, so one mod may own several entries):

```js
const makeEntry = (pakName) => ({
  id: pakName,
  name: modName ? `${modName} (${pakName}.pak)` : `Manual Mod (${pakName}.pak)`,
  modId: getModId(pakName),
});
```

Notable consequences:

- There is **no per-entry `enabled` flag**. `BPModLoaderMod` reads a plain ordered list, so the row
  offers a "Disable" button that disables the underlying Vortex mod and requests a deploy. The
  page's status filter therefore defines "enabled" as the Vortex mod's `modState.enabled`, whereas
  the UE4SS page defines it as `entry.enabled !== false`.
- `makeEntry` does not carry `locked` across, so a lock set in the UI survives in Redux and in the
  JSON sidecar but is dropped the next time `deserializeLogicMods` runs — which includes every
  `did-deploy` and every profile switch. Locks on this page are effectively session-scoped until
  `makeEntry` preserves the flag from the parsed sidecar entry.

`serializeLogicMods` writes the per-profile JSON sidecar into the `BPModLoaderMod` folder and then
`load_order.txt` as one pak basename per line. Paks missing from the file still load, after the
listed ones, in unspecified order — which the info panel states explicitly.

---

## 7. Row lifecycle — `DraggableList` internals

Worth knowing precisely, because both custom pages and the FBLO page funnel through it.

```text
DraggableList (class, DropTarget-wrapped, cached per itemTypeId)
  ListGroup
    DraggableItem (React.memo)                 one per visible row
      div ref={dragPreview}
        div ref={setRef} onClick={handleClick}   drag source + drop target live here
          <ItemRenderer className={...} item={item} />
```

- **The renderer receives exactly `{ className, item }`.** `forwardedRef` exists in the prop type
  but `DraggableListItem` never passes it; the drag ref is attached to the inner wrapper `<div>`,
  which is why extension renderers neither need nor can use `setRef`.
- **`className` carries only `selected` and `dragging`**, derived from `DraggableList`'s own
  selection state and drag state. Templates append their own classes rather than replacing it.
- **Two wrapper `<div>`s exist between the `ListGroup` and the row.** They are unreachable from the
  renderer, which is why row-hiding needs the `:has()` stylesheet rather than a style on the row.
- **The wrapper owns an `onClick`.** A click therefore updates `DraggableList`'s internal ctrl/shift
  selection *and* the template's own selection (set on the row element). The internal selection
  drives multi-row dragging; the template's drives context-menu targeting. They are maintained
  independently and can disagree — for example after a context-menu action clears one but not the
  other.
- **`apply` fires on drag end, not per hover.** Hover events reorder `DraggableList`'s internal copy
  of the list; `apply` is called once when the drag ends, with duplicates removed by id.
- **`itemTypeId` keys a module-level class cache** and is the react-dnd drag type. Two lists sharing
  an id would share the drop target class and accept each other's rows, so the template scopes both
  ids per game (`${GAME_ID}-ue4ss-lo-entry`, `${GAME_ID}-logicmods-lo-entry`).
- **`idFunc` is required** unless items expose a plain `id`; it is used for keys, index lookups and
  the dedupe in `apply`.

`LoadOrderIndexInput` (from `vortex-api`) renders the numeric position box. It clamps input to
`[lockedEntriesCount + 1, loadOrder.length]`, applies on Enter, resets on Escape or blur, and renders
a plain `<p>` instead of an input when `isLocked(item)` returns true.

---

## 8. Data flow

### Read path

```text
Redux store ──useSelector──> page component ──filter/sort──> DraggableList
                          └─> item renderer (its own useSelector calls)
```

Every surface reads from the store, never from local caches. Item renderers re-read the load order
themselves rather than deriving from props, so a state change refreshes rows even when the parent
did not re-render.

### Write path

```text
UI event ──> dispatch(action) ──> reducer ──> Redux state ──> re-render
         └─> serialize*(api, newLO) ──> sidecar JSON + game-facing file
```

Dispatch and serialize are called together and are not coupled: the store is updated optimistically
and the file write happens in parallel. The pak surface differs — `serializeLoadOrder` writes the
sidecar and then calls `requestDeployment`, because pak ordering is only realised when Vortex
renames the staged folders during deployment.

### Refresh triggers

| Trigger | Effect |
| --- | --- |
| Page mount / profile change | `deserialize*` -> dispatch, selection cleared (custom pages, effect keyed on `profileId`) |
| FBLO page mount | Vortex calls `deserializeLoadOrder` itself and dispatches the result |
| Drag end | `onApply` -> dispatch + serialize |
| Index input (Enter) | `onApplyIndex` -> dispatch + serialize |
| Checkbox / lock / context action | dispatch + serialize |
| Enable/Disable Vortex mod | `actions.setModEnabled` (batched via `util.batchDispatch` for multi-select) + `requestDeployment` |
| `did-deploy` | `didDeploy` -> `deserialize*` -> dispatch -> `serialize*`, with a fallback to store state on error |
| Status filter change | pub-sub notify (pak) or local state (custom pages); `isFiltered` arms the reorder remap |

`didDeploy` runs the deserialize/dispatch/serialize cycle for both sidecar orders and is the point
where externally added or removed mod folders enter the load order. It also releases the
mod-update guard before touching either order, so a deploy landing mid-update cannot rewrite an
order file from a half-installed state.

---

## 9. Settings panel

`GameSettings` is a four-line form: a `Toggle` bound to `settings.<GAME_ID>.ue4ssLoEnabled`, with a
`More` popover describing the consequence. The toggle handler does two things — dispatch the
setting, then call `reconcileEnabledTxt(api, !checked)`.

`reconcileEnabledTxt` walks the staging folder for any mod containing a `Scripts` or `dlls`
directory (skipping UE4SS's own native mods), and either writes or deletes an `enabled.txt` marker
in each. UE4SS treats `enabled.txt` as "load this mod regardless of `mods.txt`", so the marker is
the fallback when the extension stops managing ordering. The function reports how many folders it
touched through a success notification.

---

## 10. Collections view

```js
context.optional.registerCollectionFeature(
  `${GAME_ID}_ue4ss_collection_data`,
  (gameId, includedMods) => genUe4ssCollectionsData(context.api, gameId, includedMods),
  (gameId, collection) => parseUe4ssCollectionsData(context.api, gameId, collection),
  () => Promise.resolve(),
  (t) => t('UE4SS Load Orders'),
  (state, gameId) => gameId === GAME_ID,
  CollectionsDataView,
);
```

The last argument is the `editComponent`, rendered as a tab in the collection workshop. Vortex
passes it `IExtendedInterfaceProps`:

```ts
{ t: TFunction, gameId: string, collection: IMod, revisionInfo: IRevision, onSetCollectionAttribute: (attrPath: string[], value: any) => void }
```

`CollectionsDataView` destructures only `t` and `collection`. It is read-only: it reads both sidecar
orders for the last active profile, keeps entries whose `modId` appears in `collection.rules`, and
lists them numbered, marking UE4SS entries that are disabled. Sections appear only for the feature
toggles that are on.

Export deliberately strips machine-specific fields — UE4SS entries export as
`{ id, enabled, locked }` and LogicMods entries as `{ id }`; `name` and `modId` are recomputed on the
installing machine.

---

## 11. Cross-cutting patterns

### Stylesheet injection

Extensions cannot ship CSS, so components inject a `<style>` element into `document.head` from a
mount effect, guarded by a fixed id so repeated mounts do not duplicate it:

```js
React.useEffect(() => {
  const styleId = 'lo-index-focus-style';
  if (!globalThis.document.getElementById(styleId)) {
    const style = globalThis.document.createElement('style');
    style.id = styleId;
    style.textContent = '...';
    globalThis.document.head.appendChild(style);
  }
}, []);
```

The style is never removed — deliberate, since the same rules are wanted for the lifetime of the
session, and the id guard makes re-injection harmless. Note `globalThis.document` rather than bare
`document`: the file is linted as a Node module.

### Context-menu shape

All three context menus share one shape: `position: fixed` at the cursor with a `clampRef` callback
ref that pulls the menu back inside the viewport after layout, a `menuItem(label, onClick)` factory
that stops propagation before acting, hairline separators, dismissal effects for click/contextmenu
and Escape, and a multi-select branch keyed on `selectedIds.size >= 2 && selectedIds.has(item.id)`.
Actions run through an `applyToTargets(transform)` helper that computes the new order, dispatches,
serialises when appropriate, and closes the menu.

### Status filter helpers

`STATUS_GROUP_TOKENS` maps group names to tokens (`enabled`/`disabled`, `locked`/`unlocked`,
`unmanaged`), `STATUS_TOKEN_LABELS` maps tokens to labels, and `matchesStatus(entry, active,
isEnabledFn, isLockedFn)` applies them: tokens combine with OR inside a group and AND across groups.
Each surface passes its own `isEnabled` predicate, which is what lets the same helper serve three
different definitions of "enabled".

Two presentations exist because of where the widget must live: inline `StatusPills` inside the FBLO
info panel (the only surface the extension can reach on that page), and the `LoadOrderStatusFilter`
dropdown in the header of the custom pages. The dropdown is hand-built rather than a `react-bootstrap`
`Dropdown`, which closes on every inner click and would make multi-token selection unusable.

---

## 12. Gotchas

- Hooks must all run before any early return. The existing `item?.loEntry === undefined` guard in the
  pak renderer predates the rest of the body; new guards belong after the hook block.
- Module-scope mutable state (`GAME_PATH`, `mod_update_all_profile`) is read by components and
  context menus. `LogicModsContextMenu` uses `GAME_PATH` directly, so it depends on a prior
  `getDiscoveryPath` call having populated it — the deserialize functions do this.
- `serializeUe4ss` and `serializeLogicMods` return early when the active game is not this game, and
  both short-circuit while a batch mod update is in flight. UI actions taken during an update
  therefore update Redux but not disk until the next deploy.
- The two selection systems (DraggableList's internal one and the extension's) are not synchronised.
  Multi-row drag follows the internal one; context-menu bulk actions follow the extension's.
- `visible` on `registerMainPage` intentionally does not check the UE4SS settings toggle; the page
  handles the disabled case itself so users can find it again.
- The extension owns `mods.txt` only between the `BPModLoaderMod` and `Keybinds` markers. Removing
  either marker from the file breaks the splice.

---

## See also

`VORTEX_REACT_PAGES.md` (page/settings registration and the component cheatsheet).
`LOAD_ORDER_REGISTRATION.md` (the `registerLoadOrder` contract and sidecar-order relationship).
`LOAD_ORDER_ITEM_RENDERER.md` (row-by-row anatomy of the item renderers).
`COLLECTIONS_FEATURE.md` (collection data generation and parsing behind section 10).
`VORTEX_LOAD_ORDER.md` (FBLO runtime orchestration).
`VORTEX_EXTENSION_LOADING.md` (extension discovery and the context recording proxy).
`RE-UE4SS_MODS_CONFIG.md` (`mods.txt` / `mods.json` / `enabled.txt` semantics).
`TEMPLATES_OVERVIEW.md` (which templates carry this React layer).
`NON_UE_LOAD_ORDER_PAGES.md` (the same lineage in non-Unreal games — generic FBLO tier, minimal
renderer tier, and the legacy holdout, all written as deltas against this document).
