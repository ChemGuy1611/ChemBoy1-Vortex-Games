# LoadOrderItemRenderer - Explainer & Learning Guide

**Source:** `template-ue4-5/index.js` — grep by name: `LoadOrderItemRenderer`, `usePakLOState`, `PakContextMenu`, `matchesStatus`, `StatusPills`, `LoadOrderStatusFilter`. (Line numbers are not cited in this doc — the file grows with each feature wave; function names are stable anchors.)

---

## 1. What it is, in 60 seconds

Vortex's **File-Based Load Order** (FBLO) system manages a sorted list of mods and
renders each row in the Load Order page using a **React component** you provide.
That component is called `customItemRenderer`.

```text
Vortex renders the FBLO page
  -> for each entry in loadOrder
       -> calls customItemRenderer({ className, item })
            -> your component draws one row of the list
```

`LoadOrderItemRenderer` is the implementation of that per-row component in the UE4-5
template. It uses React hooks (no JSX -- CJS extension files have no build step),
reads Vortex's Redux store directly, and dispatches Redux actions to reorder or
toggle entries.

---

## 2. The registration contract

Inside `main()`, FBLO is registered like this (grep `registerLoadOrder` in `template-ue4-5/index.js`):

```js
context.registerLoadOrder({
  gameId: spec.game.id,
  validate: async () => Promise.resolve(undefined),
  deserializeLoadOrder: async () => await deserializeLoadOrder(context),
  serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
  toggleableEntries: false,
  usageInstructions: LoadOrderInstructions,
  customItemRenderer: LoadOrderItemRenderer,   // <-- this file's function
});
```

Key points:

- `context.registerLoadOrder` is the **current API** for file-based load orders.

  The older `context.registerLoadOrderPage` is deprecated -- do not use it for new
  extensions.

- `customItemRenderer` is passed **by reference**, not invoked. Vortex calls it

  internally once per row, per render cycle.

- `toggleableEntries: false` controls whether per-row enable/disable checkboxes

  appear. See section 4b for why UE4-5 games set this to `false`.

---

## 3. Anatomy of a rendered row

Each load-order row is a `ListGroupItem` (from react-bootstrap) containing:

```text
ListGroupItem .load-order-entry [.selected ...]
 |-- div                                       drag handle (hidden when locked)
 |     `-- Icon         .drag-handle-icon
 |-- div                 style={width:24,flexShrink:0,overflow:'hidden'}
 |     `-- LoadOrderIndexInput .load-order-index  numeric position input
 |-- div                                       lock toggle button (amber when locked)
 |     `-- Icon                                'locked' | 'unlocked'
 |-- div                .load-order-thumb-slot (always 96 x 54 px)
 |     `-- div          .load-order-unmanaged-banner  "Not managed by Vortex" (no modId)
 |     `-- img          .load-order-thumb      Nexus thumbnail | nothing
 |-- p                  .load-order-name       loEntry.name  (whiteSpace:normal, wordBreak:break-word)
 |-- button             Enable/Disable         Vortex-mod toggle (only if loEntry.modId)
 |-- Checkbox           .entry-checkbox        only if displayCheckboxes = true
 `-- PakContextMenu                            only if contextMenu.itemId === loEntry.id
```

When a status filter is active and the entry does not match, none of this renders:
the component instead returns a hidden `ListGroupItem` with className `lo-row-hidden`
(see section 12b, Status filtering).

### What is ListGroupItem?

`ListGroupItem` from react-bootstrap renders as an HTML `<li>` element. It is
designed to be a child of `ListGroup`, which renders as a `<ul>`. In the FBLO
page, `DraggableList` wraps every row inside a `<ListGroup>`, so the real DOM
structure is:

```html
<ul>          <!-- ListGroup (DraggableList.tsx:71) -->
  <div>         <!-- react-dnd drag-preview wrapper (DraggableListItem.tsx:164) -->
    <div>         <!-- react-dnd drag-source / drop-target ref (DraggableListItem.tsx:165) -->
      <li class="list-group-item load-order-entry ...">  <!-- ListGroupItem -->
        ...row children...
      </li>
    </div>
  </div>
</ul>
```

The two `<div>` wrappers are injected by `DraggableListItem.tsx`. They are
invisible visually -- react-dnd attaches refs to them to intercept mouse events
for dragging. Your renderer never sees them; it only provides the `<li>` via
`ListGroupItem`.

**Why `ListGroupItem` instead of a plain `<div>`?**

Vortex's load order page is styled around react-bootstrap's list-group system.
`ListGroupItem` carries the `list-group-item` CSS class, which applies the
card-like row appearance, hover highlight, and border handling automatically.
A plain `<div>` would look inconsistent with the rest of the Vortex UI and
require re-implementing those styles manually.

**Props passed to it:**

| Prop | Value | Notes |
| --- | --- | --- |
| `key` | `loEntry.id` | React reconciliation key; must be unique within the list |
| `className` | `classes.join(' ')` | Merged string; see below |
| `onClick` | `onSelect` | Updates shared selection state via `usePakLOState` |
| `onContextMenu` | `onContextMenu` | Opens `PakContextMenu` at cursor position |
| `style` | `{ outline: isSelected ? '2px solid #337ab7' : 'none', outlineOffset: '-1px' }` | Selection highlight |

**How `className` gets built:**

`DraggableListItem.tsx` computes its own classes (`[]` normally, `["selected"]`
when the user clicks the row, `["dragging"]` while it is being dragged) and
passes them to your renderer as the `className` prop. The renderer prepends its
own base class before joining:

```js
const classes = ['load-order-entry'];
if (className) classes.push(...className.split(' '));
// result: "load-order-entry", "load-order-entry selected", "load-order-entry dragging", etc.
```

If you replace rather than merge -- e.g. `className: 'load-order-entry'` --
the selection highlight and drag-opacity styles injected by FBLO will stop
working, because those styles are applied via the `selected` / `dragging`
class that `DraggableListItem` injects.

The thumbnail slot `div` is always exactly 96x54 px whether or not a thumbnail
exists. This keeps the name column aligned across all rows even when some mods
have no image.

---

## 4. Props from FBLO

Vortex calls the component with two props:

```js
function LoadOrderItemRenderer(props) {
  const { className, item } = props;
```

### props.className

A CSS class string from Vortex, typically `"selected"` when the row is active.
You must **merge** this into your own classes -- never replace them. If you omit it,
the selection highlight stops working.

### props.item

An object (`IItemRendererProps`) with:

| Field | Type | What it is |
| --- | --- | --- |
| `loEntry` | `ILoadOrderEntry_2` | The actual mod entry |
| `displayCheckboxes` | `boolean` | Whether to show the enable/disable checkbox |

`loEntry` fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Unique within the load order |
| `name` | `string` | Display name |
| `enabled` | `boolean` | Whether the mod is "on" in the load order |
| `locked` | `boolean \| 'always'` | Optional; if truthy, the row cannot be reordered |
| `modId` | `string` | Vortex internal mod id -- used to look up the thumbnail |
| `data` | `any` | Extension-specific extra data |

### The null guard

```js
if (item?.loEntry === undefined) return null;
```

FBLO can call the renderer before the store is fully hydrated. This guard prevents
crashes on an undefined `loEntry`. Always keep it as the very first check.

---

## 4b. Why displayCheckboxes is false for UE4-5 (and windrose)

Understanding this requires understanding **how UE4-5 FBLO actually works on disk**.

### Rename-based load ordering

The template's `serializeLoadOrder` (grep `async function serializeLoadOrder`) just writes
a JSON snapshot of the load order to a local file. The actual ordering on disk
happens at **deploy time**: `loadOrderPrefix` / `makePrefix`
(grep by name) compute a letter prefix from each entry's
position in the list:

```text
position 1  -> prefix "AAA"
position 2  -> prefix "AAB"
position 3  -> prefix "AAC"
...
position 26 -> prefix "AAZ"
position 27 -> prefix "ABA"
```

That prefix is **prepended to the mod's deployed folder name** (e.g.,
`AAA_MyCoolMod/`, `AAB_AnotherMod/`). Unreal Engine loads `.pak` files
alphabetically from the `~mods` folder, so the alphabetical prefix enforces the
load order without any game-side config file.

### Why enabled/disabled is meaningless here

A mod is either deployed (folder exists with prefix) or it is not. There is no
in-game config file that lists which mods are "on" or "off" -- the act of deploying
**is** the act of enabling. Users already control whether a mod is enabled on the
main Mods page. Showing a second checkbox in the load order row would be confusing
and do nothing.

The row does, however, ship a per-row **Enable/Disable button** (shown only when
`loEntry.modId` is set). That button is not the FBLO entry checkbox: it toggles the
**underlying Vortex mod's enabled state** (`actions.setModEnabled`) and calls
`requestDeployment`, so the mod is added to / removed from the deployed folder on
the next deploy. See Chunk G2 below.

Therefore:

- `toggleableEntries: false` is set at registration
- Vortex passes `displayCheckboxes: false` into the renderer
- The `displayCheckboxes ? Checkbox : null` branch never fires for UE4-5 games

### Contrast: Witcher 3 (file-based, toggleable)

Witcher 3 serializes its load order to a `mods.settings` ini file where each mod
has its own `Enabled=1` or `Enabled=0` line. There, per-row enabled/disabled
state maps directly to a real file, so `toggleableEntries: true` makes sense and
the checkbox does real work.

### Why the Checkbox branch exists in the template at all

The renderer is designed to be copy-pasted into other extensions -- including ones
that need per-row toggles. The `displayCheckboxes` branch is dormant for UE4-5
games but activates automatically in any extension that registers with
`toggleableEntries: true`. The code stays generic without costing anything.

---

## 5. Code walkthrough, line by line

The full function is in `template-ue4-5/index.js` (grep `function LoadOrderItemRenderer`). Broken into chunks:

---

### Chunk A -- Imports inside the function body

```js
const { ListGroupItem, Checkbox } = require('react-bootstrap');
const { Icon, LoadOrderIndexInput, MainContext } = require('vortex-api');
const { useSelector, useDispatch } = require('react-redux');
```

**Why `require` inside the function body?**

Extension files are plain CommonJS with no build step. Vortex resolves these
`require` calls from its own bundled dependencies. These modules are not available
when the extension module first loads -- `require('react-bootstrap')` at the top
of the file would fail before Vortex's renderer is ready. Deferring the `require`
to the component function body ensures they only resolve at render time.

---

### Chunk B -- Getting api from context

```js
const context = React.useContext(MainContext);
const dispatch = useDispatch();
```

**Why `MainContext` instead of passing `api` as a prop?**

`customItemRenderer` only receives `className` and `item` -- `api` is not a prop.
Vortex provides the extension API via React context instead. `MainContext` is
exported from `vortex-api` and always contains an `api` property. `useDispatch()`
gives a direct handle to the Redux store's `dispatch` function, needed to fire
actions.

---

### Chunk C -- Reading state with useSelector

```js
const profile = useSelector((state) => selectors.activeProfile(state));
const loadOrder = useSelector((state) =>
  util.getSafe(state, ['persistent', 'loadOrder', profile?.id], []),
);
```

**What is `useSelector`?**

A React-Redux hook that subscribes the component to a slice of the Redux store.
Whenever that slice changes, the component re-renders automatically. Two separate
calls are needed here because `loadOrder` depends on `profile.id` -- each call is
an independent subscription.

**What is `persistent.loadOrder`?**

The Vortex Redux state tree. `persistent` is the branch that survives app restarts.
Load orders are stored under `persistent.loadOrder[profileId]`, which is why the
active profile ID is needed first.

---

### Chunk D -- Destructuring item, reading the thumbnail

```js
const { loEntry, displayCheckboxes } = item;
const mods = useSelector((state) => util.getSafe(state, ['persistent', 'mods', GAME_ID], {}));
const pictureUrl = mods[loEntry.modId]?.attributes?.pictureUrl;
const currentIdx = loadOrder.findIndex((e) => e.id === loEntry.id) + 1;
```

**Where does `pictureUrl` come from?**

When Vortex downloads a mod from Nexus Mods it stores metadata -- including the Nexus
CDN thumbnail URL -- as `mod.attributes.pictureUrl`. Not every mod has one (local
installs, for example), so optional chaining (`?.`) means `pictureUrl` is `undefined`
when absent.

**Why `currentIdx + 1`?**

`findIndex` is zero-based. Load order positions are shown to users as 1-based numbers.
Adding 1 converts between the two systems.

---

### Chunk E -- Locked entries

```js
const isLocked = (entry) => [true, 'true', 'always'].includes(entry?.locked);
const lockedCount = loadOrder.filter(isLocked).length;
```

**What does "locked" mean?**

Locked entries cannot be reordered. They stay fixed at the top of the list. The three
truthy forms (`true`, `'true'`, `'always'`) exist for historical compatibility with
different serialization formats across extensions.

**Why count locked entries?**

`LoadOrderIndexInput` needs to know how many locked entries are at the top so it
can clamp the user's input to the valid reorderable range:
`[lockedCount + 1, loadOrder.length]`. A user cannot drag a mod above locked entries.

---

### Chunk F -- The reorder callback (onApplyIndex)

```js
const onApplyIndex = React.useCallback((idx) => {
  if (currentIdx === idx) return;
  const newLO = loadOrder.filter((e) => e.id !== loEntry.id);
  newLO.splice(idx - 1, 0, loEntry);
  dispatch(actions.setFBLoadOrder(profile.id, newLO));
}, [dispatch, profile, loadOrder, loEntry, currentIdx]);
```

**How does the splice work?**

1. Remove the entry from its current position: `loadOrder.filter(...)`.
2. Insert at the new position: `newLO.splice(idx - 1, 0, loEntry)` (`idx - 1` = 0-based for `splice`).
3. Dispatch the entire rewritten array in one Redux action.

The early return when `currentIdx === idx` avoids unnecessary serialize cycles.

---

### Chunk G -- The toggle callback (onToggle)

```js
const onToggle = React.useCallback((evt) => {
  dispatch(actions.setFBLoadOrderEntry(profile.id, { ...loEntry, enabled: evt.target.checked }));
}, [dispatch, profile, loEntry]);
```

Dispatches `setFBLoadOrderEntry` when the per-row Checkbox fires. Dormant for UE4-5
(`displayCheckboxes` is always `false`) but kept so the renderer stays generic.

---

### Chunk G2 -- Vortex-mod toggle (isModEnabled / onModToggle)

```js
const isModEnabled = useSelector(state =>
  util.getSafe(state, ['persistent', 'profiles', profile?.id, 'modState', loEntry.modId, 'enabled'], false));

const onModToggle = React.useCallback(() => {
  if (!loEntry.modId) return;
  dispatch(actions.setModEnabled(profile.id, loEntry.modId, !isModEnabled));
  requestDeployment(context.api, spec);
}, [dispatch, profile, loEntry.modId, isModEnabled, context]);
```

This backs the per-row **Enable/Disable button**. Unlike `onToggle` (Chunk G), this
does not touch the FBLO entry at all -- it flips the Vortex mod's profile `modState`
and requests a deployment, because for rename-based FBLO the only real "off switch"
is undeploying the mod. `isModEnabled` is also passed into `PakContextMenu` so the
menu can decide whether to show "Disable Vortex Mod".

---

### Chunk H -- Lock callback (onLock)

```js
const onLock = React.useCallback(() => {
  const newLO = loadOrder.map(e => e.id === loEntry.id ? { ...e, locked: !isEntryLocked } : e);
  dispatch(actions.setFBLoadOrder(profile.id, newLO));
  serializeLoadOrder(context, newLO);
}, [dispatch, context, profile, loadOrder, loEntry, isEntryLocked]);
```

**Critical:** always call `serializeLoadOrder` explicitly here. Vortex FBLO's
auto-serialize fires on `onStateChange(persistent.loadOrder)`, but internal timing
means the `locked` field may not reach the JSON file. Building the full new array
and dispatching `setFBLoadOrder` + calling serialize explicitly is the only safe path.

`serializeLoadOrder` accepts the React `MainContext` as `context` -- it only uses
`context.api`.

---

### Chunk I -- Selection and context menu (usePakLOState)

```js
const { selectedIds, setSelectedIds, contextMenu, setContextMenu, statusFilter } = usePakLOState();
const isSelected = selectedIds.has(loEntry.id);
const allIds = loadOrder.map(e => e.id);

const onSelect = React.useCallback((evt) => {
  const ctrlKey = evt.ctrlKey || evt.metaKey;
  const shiftKey = evt.shiftKey;
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (ctrlKey) {
      next.has(loEntry.id) ? next.delete(loEntry.id) : next.add(loEntry.id);
    } else if (shiftKey) {
      const lastId = [...prev].at(-1);
      const start = allIds.indexOf(lastId ?? loEntry.id);
      const end = allIds.indexOf(loEntry.id);
      const [lo, hi] = [Math.min(start, end), Math.max(start, end)];
      for (let i = lo; i <= hi; i++) next.add(allIds[i]);
    } else {
      next.clear();
      next.add(loEntry.id);
    }
    return next;
  });
}, [loEntry.id, setSelectedIds, allIds]);

const onContextMenu = React.useCallback((evt) => {
  evt.preventDefault();
  evt.stopPropagation();
  setContextMenu({ x: evt.clientX, y: evt.clientY, itemId: loEntry.id });
}, [loEntry.id, setContextMenu]);
```

See section 5b for the pub-sub mechanism behind `usePakLOState`.

**Modifier keys must be captured before entering the setState updater.** React 16
event pooling nullifies `evt.ctrlKey`/`evt.shiftKey` before the updater runs. Always
extract them into local variables (`ctrlKey`, `shiftKey`) before calling `setSelectedIds`.

---

### Chunk J -- CSS class assembly

```js
const classes = ['load-order-entry'];
if (className) classes.push(...className.split(' '));
```

Always start with your own base class, then append what Vortex sends. Vortex may
send `"selected"` or other state classes. Replacing rather than merging kills the
selection highlight.

---

### Chunk J2 -- Status-filter row hiding

Immediately after class assembly and **after all hooks have run** (a mid-hook early
return would violate the Rules of Hooks), the renderer checks the shared status filter:

```js
// Status filter: render hidden (but keep the DnD item count stable) when the entry is filtered out.
// The 'lo-row-hidden' marker lets the injected CSS collapse the whole DraggableListItem wrapper
// (the two dnd <div>s the renderer can't reach), otherwise their spacing leaves visible gaps.
if (!matchesStatus(loEntry, statusFilter, () => isModEnabled, isLocked)) {
  return React.createElement(ListGroupItem, { key: loEntry.id, className: 'lo-row-hidden', style: { display: 'none' } });
}
```

Returning a hidden row instead of `null` keeps FBLO's DnD item count stable. The
`lo-row-hidden` class exists so the one-time CSS injected by `LoadOrderInstructions`
(`.file-based-load-order-list .list-group > div:has(.lo-row-hidden) { display: none !important; }`)
can also collapse the two `DraggableListItem` wrapper `<div>`s the renderer cannot
reach -- without it their spacing leaves visible gaps in the list. Full mechanism in
section 12b.

---

### Chunk K -- The rendered tree

The `ListGroupItem` receives `onClick: onSelect`, `onContextMenu: onContextMenu`,
and `style: { outline: isSelected ? '2px solid #337ab7' : 'none', outlineOffset: '-1px' }`.
Children include the unmanaged banner (when no `modId`) or thumbnail, the name, and
the Enable/Disable Vortex-mod button (when `modId` is set; see Chunk G2).

`PakContextMenu` is rendered as the last child, conditionally:

```js
contextMenu?.itemId === loEntry.id ? React.createElement(PakContextMenu, {
  x: contextMenu.x, y: contextMenu.y,
  item: loEntry, loadOrder, profile, dispatch, context, selectedIds, isModEnabled,
  onClose: () => setContextMenu(null),
}) : null,
```

---

## 5b. Module-level PAK selection + status-filter pub-sub (`usePakLOState`)

**Why not React context?**

`customItemRenderer` instances are rendered deep inside FBLO's `DraggableList`.
There is no API hook to wrap the list in a context provider from outside FBLO.
The only way for all row instances to share mutable selection state is a
**module-level variable** combined with a simple pub-sub notification system.

**The pattern (grep `function usePakLOState`):**

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
  return {
    selectedIds: _pakSelectedIds,
    setSelectedIds: (fn) => { _pakSelectedIds = fn(_pakSelectedIds); _notifyPak(); },
    contextMenu: _pakContextMenu,
    setContextMenu: (val) => { _pakContextMenu = val; _notifyPak(); },
    statusFilter: _pakStatusFilter,
    setStatusFilter: (next) => { _pakStatusFilter = next; _notifyPak(); },
  };
}
```

**How it works:**

1. Each `LoadOrderItemRenderer` instance calls `usePakLOState()` on render.
2. The hook registers a `forceUpdate` reducer as a listener in `_pakListeners`.
3. When `setSelectedIds`, `setContextMenu`, or `setStatusFilter` is called (from any

   instance), it mutates the module-level variable and then calls `_notifyPak()`.

4. `_notifyPak` calls every registered `forceUpdate`, which increments a counter

   and causes all instances to re-render, picking up the new shared state.

5. On unmount, the `useEffect` cleanup removes the listener.

**The status filter rides the same channel.** `LoadOrderInstructions` (the info
panel) also calls `usePakLOState()`: it renders the `StatusPills` UI and calls
`setStatusFilter`, and because rows and the panel share the same listener set they
re-render together -- pills update, rows hide/show, and the matched/total count
refreshes, all from one `_notifyPak()`.

**Contrast with `Ue4ssSelectionContext`:**

The UE4SS page owns its `DraggableList` and can wrap it in a React context
(`Ue4ssSelectionContext.Provider`). The PAK LO page is FBLO-managed; the pub-sub
approach is the workaround for that constraint.

---

## 6. Why the img has draggable:false and pointerEvents:none

```js
draggable: false,
style: { ..., pointerEvents: 'none' },
```

Browsers have **built-in drag behavior for `<img>` elements**. If you drag an image
element, the browser starts its own native drag operation -- which conflicts with
`react-dnd`, the library Vortex uses for drag-and-drop reordering. The native drag
event fires instead of the react-dnd event, and the row appears to do nothing.

- `draggable: false` disables native image drag.
- `pointerEvents: 'none'` makes the image transparent to all mouse events. The drag

  gesture lands on the parent `ListGroupItem` instead, which react-dnd's FBLO
  wrapper intercepts correctly.

Always include both when rendering an `<img>` inside a custom FBLO renderer.

---

## 7. Why item.setRef is NOT used

If you look at the Witcher 3 source (section 8), you'll see `ref={props.item.setRef}`
on the root element. The type definition for `IItemRendererProps` includes a `setRef`
field. You might expect to pass it.

**Don't.**

In the current Vortex FBLO implementation, `setRef` is always `undefined`. Modern
FBLO wraps each row internally in `DraggableListItem.tsx`, which manages drag-and-drop
entirely through react-dnd's own wrapper divs. The `ref` mechanism described in the
type definition belongs to an older class-based DnD system that no longer applies.

Passing `ref={props.item.setRef}` does nothing at best and emits React warnings about
setting a ref to `undefined` at worst.

---

## 8. The Witcher 3 ancestor -- side by side

The Witcher 3 `ItemRenderer.tsx` in the Vortex repo is the original the template
renderer is modelled on. Here is the root element it returns:

```tsx
// Vortex/extensions/games/game-witcher3/src/views/ItemRenderer.tsx
return (
  <ListGroupItem key={key} className={classes.join(' ')} ref={props.item.setRef}>
    <Icon className='drag-handle-icon' name='drag-handle' />
    <LoadOrderIndexInput ... />
    {renderValidationError(props)}
    <p className='load-order-name'>{key}</p>
    {renderExternalBanner(item.loEntry)}
    {renderViewModIcon(props)}
    {checkBox()}
    {lock()}
  </ListGroupItem>
);
```

**Comparison table:**

| Feature | Witcher 3 | UE4-5 template |
| --- | --- | --- |
| Language | TypeScript + JSX | JavaScript + `React.createElement` |
| `ref={props.item.setRef}` | Yes (legacy, now dead) | No (correctly omitted) |
| Validation error display | Yes | No |
| External mod banner | Yes | No |
| View-mod icon | Yes | No |
| Lock icon | Yes | Yes -- amber `#e2c04c` when locked; drag handle hides |
| Nexus thumbnail | No | Yes |
| Checkbox | Yes (`toggleableEntries: true`) | Yes (conditional, usually dormant) |
| `displayCheckboxes` check | Not used | Yes -- guards the Checkbox branch |
| Multi-select | No | Yes -- `usePakLOState` pub-sub |
| Context menu | No | Yes -- `PakContextMenu` on right-click |
| Reorder mechanism | `onApplyIndex` -> `setFBLoadOrder` | Same |

---

## 9. Adapting the renderer to another extension

### Prerequisites at module scope

These must be defined before the function body (the renderer closes over them):

```js
const GAME_ID = '...';                // your game ID
const React = require('react');       // top-level require is fine for React itself
const { selectors, util, actions } = require('vortex-api');
const LO_IMAGE_WIDTH = 96;
const LO_IMAGE_HEIGHT = LO_IMAGE_WIDTH * 0.5625;
// Also required if using context menu / selection:
// _pakSelectedIds, _pakContextMenu, _pakListeners, _notifyPak, usePakLOState
// serializeLoadOrder (must be defined in the same file)
```

### Wiring checklist

- [ ] Pass `customItemRenderer: LoadOrderItemRenderer` in `context.registerLoadOrder()`.
- [ ] Set `toggleableEntries: false` if your FBLO is rename-based (UE4-5/windrose-style).
- [ ] Set `toggleableEntries: true` if your FBLO writes real enabled/disabled state

  to disk -- the per-row checkbox will appear automatically.

- [ ] Confirm your `serializeLoadOrder` and `deserializeLoadOrder` functions are correct.
- [ ] Copy the `usePakLOState` pub-sub block and `PakContextMenu` if you want context menus.

### Function placement

Define `LoadOrderItemRenderer` **after `main()`** in the file. JavaScript hoisting
makes it accessible inside `main()` as `customItemRenderer: LoadOrderItemRenderer`
even though it appears later. Standard code structure: imports -> toggles -> constants
-> spec -> helpers -> installers -> `applyGame()` -> `main()` -> React components ->
`module.exports`.

---

## 10. Gotchas recap

| Rule | Why |
| --- | --- |
| Never pass `ref={item.setRef}` | Always `undefined` in current FBLO; emits React warnings |
| `<img>` always needs `draggable: false` and `pointerEvents: 'none'` | Native browser image drag hijacks react-dnd; rows won't move without this |
| One `setFBLoadOrder` call for the whole reorder | Never dispatch entry-by-entry in a loop; a single action is atomic |
| `onLock` must call `serializeLoadOrder` explicitly | Vortex FBLO auto-serialize may not write `locked` to the JSON -- always use `setFBLoadOrder` + explicit `serializeLoadOrder(context, newLO)` |
| Name `<p>` needs `whiteSpace:'normal'` and `wordBreak:'break-word'` | Vortex's default CSS applies `white-space:nowrap` to `.load-order-name`; without the override, long mod names are clipped |
| `serializeLoadOrder` accepts React `MainContext` as `context` | It only uses `context.api`, so the React `MainContext` from `useContext(MainContext)` works directly |
| `require` calls go inside the function body | Top-level require of Vortex-bundled modules fails before the renderer is ready |
| Merge `className`, don't replace it | Vortex injects `"selected"` and other state classes; overwriting them breaks the selection highlight |
| Use `registerLoadOrder`, not `registerLoadOrderPage` | The older call is deprecated |
| `toggleableEntries: false` for rename-based FBLO | The `enabled` bit has no on-disk representation; checkbox would be a lie |
| Capture modifier keys before calling `setSelectedIds` | React 16 event pooling nullifies `evt.ctrlKey`/`evt.shiftKey` before the updater runs |
| PAK selection uses pub-sub, not React context | No API hook exists to wrap FBLO's `DraggableList` in a context provider from outside |
| `FlexLayout.Flex` ignores `flex: '0 0 Npx'` height in column mode | Use a plain `div { flexShrink: 0 }` for fixed-height children in a column `FlexLayout` |
| react-bootstrap `Checkbox` breaks flex row centering | The `div > label > input` wrapper stack prevents `alignItems: 'center'`; use plain `input[type=checkbox]` with `alignSelf: 'center'` |
| `ul` needs `listStyleType: 'disc'` | Vortex's global CSS resets `list-style: none` on all `ul` elements |

---

## 11. PakContextMenu

**Source:** grep `function PakContextMenu` in `template-ue4-5/index.js`

`PakContextMenu` is a fixed-position overlay rendered as the last child of
`LoadOrderItemRenderer` when `contextMenu.itemId === loEntry.id`.

All LO context menus in the template (PAK, UE4SS, LogicMods) follow one **canonical
section order**, each section separator-delimited:

1. LO-entry toggles / Lock-Unlock (+ Configure on UE4SS)
2. Move to Top / Move to Bottom
3. Open Mod Folder(s) / Open Staging Folder / Open Mod Page
4. Vortex-mod-state (Disable/Enable Vortex Mod) -- always LAST, in its own section

### Lifecycle

- Rendered by: `LoadOrderItemRenderer` when `contextMenu?.itemId === loEntry.id`
- Dismissed by: click anywhere (`document.addEventListener('click', dismiss)`),

  right-click anywhere (`contextmenu` event), or Escape key

- Inline `<style>` injection: on first render, injects `.ue4ss-ctx-item:hover { background: rgba(255,255,255,0.1); }` via `globalThis.document.head` if not already present

### Menu variants

**Single-item menu** (one entry selected, or right-clicking an unselected entry):

| Item | Action |
| --- | --- |
| Lock / Unlock Position | Toggle `locked` on this entry; serializes LO |
| *(separator)* | |
| Move to Top | Re-inserts after all locked entries |
| Move to Bottom | Re-inserts at end of array |
| *(separator)* | Only shown when Open Staging Folder or Open Mod Page is visible |
| Open Staging Folder | Only when `getModStagingFolder` resolves; `util.opn` on the mod's Vortex staging folder |
| Open Mod Page | Only when `getModPageURL` resolves; `util.opn` on the mod page URL |
| *(separator)* | Only shown when Disable Vortex Mod is visible |
| Disable Vortex Mod | Only shown when `item.modId` set AND mod is currently enabled; calls `setModsEnabled([item], false)` on the underlying Vortex mod (one-way -- re-enable on the Mods tab or via the row button) |

**Multi-item menu** (`selectedIds.size >= 2 && selectedIds.has(item.id)`):

| Item | Action |
| --- | --- |
| Lock Selected (n) | Set `locked: true` on all selected entries; serializes |
| Unlock Selected (n) | Set `locked: false` on all selected entries; serializes |
| *(separator)* | |
| Move to Top (n) | Selected entries (relative order) placed after locked entries; non-selected unlocked entries follow |
| Move to Bottom (n) | Non-selected entries first, then selected entries (relative order) |
| *(separator)* | |
| Disable Selected (n) | Call `setModsEnabled(targets, false)`; Enable Selected is commented out (no effect on deployed pak mods) |

### applyToTargets helper

```js
const applyToTargets = (transform, serialize = false) => {
  const newLO = transform(loadOrder, targets);
  dispatch(actions.setFBLoadOrder(profile.id, newLO));
  if (serialize) serializeLoadOrder(context, newLO);
  onClose();
};
```

Lock/unlock operations pass `serialize = true`; move operations do not (deploy handles
the prefix rename).

### Positioning

```js
const menuStyle = {
  position: 'fixed', left: x, top: y, zIndex: 9999,
  background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 4, padding: '4px 0', minWidth: 180,
  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
};
```

`x` and `y` come from `evt.clientX` / `evt.clientY` at right-click time, stored in
`_pakContextMenu` via `setContextMenu({ x, y, itemId })`.

### Viewport clamping (clampRef)

Every menu root div gets a callback ref that clamps the menu into the viewport, so a
right-click near the bottom or right edge of the window does not cut the menu off:

```js
const clampRef = (el) => {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const vw = globalThis.window.innerWidth;
  const vh = globalThis.window.innerHeight;
  if (x + rect.width > vw) el.style.left = `${Math.max(8, vw - rect.width - 8)}px`;
  if (y + rect.height > vh) el.style.top = `${Math.max(8, vh - rect.height - 8)}px`;
};
```

The same `clampRef` pattern appears in all three context menus (PAK, UE4SS, LogicMods).

---

## 12. Ue4ssLoadOrderPage layout

`Ue4ssLoadOrderPage` renders a `FlexLayout type='column'` with the mod list on top
and an info panel at the bottom. The page header is a flex row holding the text
search box (`FormControl`, `style: { flex: 1 }`) and the `LoadOrderStatusFilter`
dropdown (see section 12b). Page-level state includes both filters:

```js
const [filterText, setFilterText] = React.useState('');
const [statusFilter, setStatusFilter] = React.useState(new Set());

const isFiltered = !!filterText || statusFilter.size > 0;
const isEntryEnabled = (e) => e.enabled !== false;
const isEntryLocked = (e) => [true, 'true', 'always'].includes(e?.locked);

const filteredOrder = loadOrder.filter(e =>
  (!filterText || e.name.toLowerCase().includes(filterText.toLowerCase()))
  && matchesStatus(e, statusFilter, isEntryEnabled, isEntryLocked));
```

`onApply` remaps drag results through the filter whenever **either** filter is
active -- the guard is `if (isFiltered)`, not `if (filterText)`. (LogicMods'
`LogicModsLoadOrderPage` is wired identically, except `isEntryEnabled` reads the
Vortex mod state: `util.getSafe(modState, [e.modId, 'enabled'], false)`.)

It uses its own `DraggableList` + `Ue4ssItemRenderer`
with a React context (`Ue4ssSelectionContext`) for shared selection and context menu state:

```js
const Ue4ssSelectionContext = React.createContext({
  selectedIds: new Set(), setSelectedIds: () => {},
  allIds: [],
  contextMenu: null, setContextMenu: () => {},
});
```

Page layout:

```js
React.createElement(FlexLayout, { type: 'column', style: { height: '100%' } },
  // list -- must have minHeight:0 to shrink in a column flex container
  React.createElement(FlexLayout.Flex, { style: { overflowY: 'auto', minHeight: 0 } },
    React.createElement(Ue4ssSelectionContext.Provider, { value: { selectedIds, setSelectedIds, allIds, contextMenu, setContextMenu } },
      React.createElement(DraggableList, {
        ...
        isLocked: item => [true, 'true', 'always'].includes(item?.locked),
      })
    )
  ),
  // info panel -- plain div, not FlexLayout.Flex
  React.createElement('div', { style: { flexShrink: 0 } },
    React.createElement(Ue4ssLoadOrderInfoPanel)
  ),
)
```

`Ue4ssLoadOrderInfoPanel` uses a `ul` with `listStyleType: 'disc'` and a `borderTop`
separator. Current bullets (4):

1. Drag-and-drop reorder -- changes write to `mods.txt` immediately.
2. Checkboxes to enable/disable each mod -- all changes write to `mods.txt` immediately.
3. Mods with a `config.lua`/`settings.json`/etc. file have a **Configure** button to open it externally.
4. *(italic, yellow, bold)* Note: this page manages UE4SS mods only; pak mod LO is on the Load Order page.

### Ue4ssItemRenderer row details

The renderer uses a plain `div` (not `ListGroupItem` -- no page-scoped CSS). Key elements:

| Element | Key note |
| --- | --- |
| Root `div` | `display:flex, flexDirection:row, alignItems:center, gap:8, padding:'4px 12px', border, borderRadius, minHeight:52`, outline for selection |
| Configure button | Only rendered when `configFilePath` is non-empty (detected by `useEffect` + `util.walk`); `style: { margin: '0 4px' }`; `title: path.basename(configFilePath)` shows filename on hover |
| Enable checkbox | Plain `input[type=checkbox]` with `alignSelf: 'center', cursor: 'pointer'` -- react-bootstrap `Checkbox` wrapper breaks flex centering |
| Context menu | `Ue4ssContextMenu` rendered last when `contextMenu?.itemId === item.id` |

### Ue4ssContextMenu

`Ue4ssContextMenu` is richer than `PakContextMenu` and follows the same canonical
section order (section 11). Single-item menu:
Enable/Disable (LO-entry `enabled` flag, written to mods.txt), Lock/Unlock Position,
Configure (if `configFilePath` non-empty), separator, Move to Top, Move to Bottom,
separator, Open Mod Folder, Open Staging Folder (if resolvable), Open Mod Page (if
resolvable), separator, **Disable Vortex Mod / Enable Vortex Mod** (two-way toggle,
shown when `item.modId` is set; calls `setVortexModsEnabled([item], !isModEnabled)`).

Multi-item menu: Enable/Disable Selected (n), separator, Lock/Unlock Selected (n),
separator, Move to Top (n) / Move to Bottom (n), separator, Open Mod Folders (n),
Open Staging Folders (n) (shown when any target has a `modId`), separator,
**Disable Vortex Mod (n)**.

Note the two enable concepts on this page: the plain Enable/Disable items flip the
**LO-entry** `enabled` flag (serialized to `mods.txt` immediately), while the
Vortex-mod items flip the **mod's deployment state** via `setVortexModsEnabled`
(batch `actions.setModEnabled` + `requestDeployment` -- no mods.txt write).

---

## 12b. Status filtering

All load order pages can be filtered by entry **status** in addition to the text
search: Enabled/Disabled, Locked/Unlocked, Unmanaged. Filters combine with **AND
across groups, OR within a group**, and the text search ANDs on top.

### Shared predicate and token maps

```js
const STATUS_GROUP_TOKENS = { enabled: ['enabled', 'disabled'], locked: ['locked', 'unlocked'], unmanaged: ['unmanaged'] };
const STATUS_TOKEN_LABELS = { enabled: 'Enabled', disabled: 'Disabled', locked: 'Locked', unlocked: 'Unlocked', unmanaged: 'Unmanaged' };

function matchesStatus(entry, active, isEnabledFn, isLockedFn) {
  if (active.has('enabled') || active.has('disabled')) {
    const en = isEnabledFn(entry);
    if (!((active.has('enabled') && en) || (active.has('disabled') && !en))) return false;
  }
  if (active.has('locked') || active.has('unlocked')) {
    const lk = isLockedFn(entry);
    if (!((active.has('locked') && lk) || (active.has('unlocked') && !lk))) return false;
  }
  if (active.has('unmanaged') && entry.modId !== undefined) return false;
  return true;
}
```

`isEnabledFn` differs per surface -- pass whatever the row's enable actually reflects:

| Surface | isEnabledFn |
| --- | --- |
| PAK FBLO (rename-based) | Vortex mod state (`isModEnabled`) |
| UE4SS page (mods.txt) | `(e) => e.enabled !== false` (LO-entry flag) |
| LogicMods page | Vortex mod state via `modState[e.modId].enabled` |

Unmanaged = `entry.modId === undefined`; Locked = the usual
`[true, 'true', 'always'].includes(entry?.locked)` -- same everywhere.

### Two UI styles

- **`StatusPills({ active, setActive, groups, count })`** -- inline toggle-button row
  used on **core FBLO page surfaces**, rendered inside `LoadOrderInstructions` (the
  registered `usageInstructions` component). Active pill = `bsStyle: 'success'` +
  bold; a `Clear` link appears when any pill is active. `groups` is
  `['enabled', 'locked', 'unmanaged']`.
- **`LoadOrderStatusFilter({ active, setActive, groups, count })`** -- dropdown used
  on the **custom pages** (UE4SS, LogicMods), beside the search box. It is
  **hand-built** (button + checkbox panel): react-bootstrap's `Dropdown` auto-closes
  on every inner click, which makes multi-checkbox filtering unusable. Dismissed on
  outside click, right-click, or Escape (same dismiss pattern as the context menus).
  Button style: `bsStyle` primary when idle / success when active, bold, Vortex
  `filter` icon; the panel anchors `right: 0` so it stays on-screen at the header's
  right edge.

Both accept `count` -- `{ matched, total }` or `null` -- and render a
`matched / total` span (accent `#7ec8e3`) while a status filter is active. The pills
surface computes `matched` from `persistent.loadOrder[profileId]` with
`matchesStatus`; the custom pages just reuse `filteredOrder.length` / `loadOrder.length`.

### How the core FBLO page filters without Vortex edits

The extension owns only the row (`customItemRenderer`) and the info panel
(`usageInstructions`) -- not the list. So:

1. `LoadOrderInstructions` renders `StatusPills` and publishes the active filter via
   the `usePakLOState` pub-sub (section 5b).
2. Each `LoadOrderItemRenderer` reads `statusFilter` and returns a hidden
   `lo-row-hidden` row for non-matching entries (Chunk J2). Hidden rather than
   removed, so FBLO's DnD indices stay stable.
3. `LoadOrderInstructions` injects one-time CSS (style id
   `fblo-status-filter-hide-style`) so the `DraggableListItem` wrapper divs collapse
   too: `.file-based-load-order-list .list-group > div:has(.lo-row-hidden) { display: none !important; }`.
   (`:has()` is fine -- Vortex 2.x ships Chromium 120+.)

Caveat shown to users in the info panel: clear the status filter before reordering.
Hidden rows still exist in FBLO's DnD list, so dragging across a filtered list can
compute odd indices. The custom pages do NOT have this caveat -- they already remap
drag positions through the filter (`isFiltered` guard in `onApply`).

---

## 12c. Shared LO helpers

Module-level helpers used by the context menus and rows (defined near `usePakLOState`):

```js
// Mod page URL: homepage attribute first, else compose the Nexus URL.
function getModPageURL(api, vortexModId) {
  if (vortexModId === undefined) return undefined;
  const attributes = util.getSafe(api.getState(), ['persistent', 'mods', GAME_ID, vortexModId, 'attributes'], {});
  if (attributes.homepage) return attributes.homepage;
  if (attributes.source === 'nexus' && attributes.modId !== undefined) {
    return `https://www.nexusmods.com/${GAME_ID}/mods/${attributes.modId}`;
  }
  return undefined;
}

// Vortex staging folder of a managed entry.
function getModStagingFolder(api, vortexModId) {
  if (vortexModId === undefined) return undefined;
  const state = api.getState();
  const installationPath = util.getSafe(state, ['persistent', 'mods', GAME_ID, vortexModId, 'installationPath'], undefined);
  const stagingPath = selectors.installPathForGame(state, GAME_ID);
  if (!installationPath || !stagingPath) return undefined;
  return path.join(stagingPath, installationPath);
}
```

Both return `undefined` when not resolvable, and the menu items that consume them
(`Open Mod Page`, `Open Staging Folder`) are simply not rendered in that case --
so unmanaged entries never show them.

The UE4SS/LogicMods menus also define `setVortexModsEnabled(entries, enable)`
(inside the menu component, since it needs `profileId`/`dispatch`/`onClose`):
batch-maps `actions.setModEnabled` over entries that have a `modId`, dispatches via
`util.batchDispatch`, then calls `requestDeployment`. This is the engine behind
every "Disable/Enable Vortex Mod" menu item.

---

## 13. Related reading

- **Template source:** `template-ue4-5/index.js` -- grep these names:
  - `usePakLOState` (pub-sub: selection + context menu + status filter)
  - `LoadOrderInstructions` (info panel: StatusPills + matched/total + CSS inject)
  - `LoadOrderItemRenderer` / `PakContextMenu`
  - `matchesStatus` / `STATUS_GROUP_TOKENS` / `StatusPills` / `LoadOrderStatusFilter`
  - `getModPageURL` / `getModStagingFolder`
  - `Ue4ssSelectionContext` / `Ue4ssItemRenderer` / `Ue4ssContextMenu` (+ `setVortexModsEnabled`) / `Ue4ssLoadOrderPage`
  - `LogicModsItemRenderer` / `LogicModsContextMenu` / `LogicModsLoadOrderPage`
  - Registration site: `registerLoadOrder` inside `main()`
  - `makePrefix` / `loadOrderPrefix`
  - `serializeLoadOrder` / `deserializeLoadOrder`
- **Witcher 3 ItemRenderer (inspiration, TSX):**

  `Vortex/extensions/games/game-witcher3/src/views/ItemRenderer.tsx`

- **Vortex core ItemRenderer (default, TSX):**

  `Vortex/src/renderer/src/extensions/file_based_loadorder/views/ItemRenderer.tsx`

- **`LoadOrderIndexInput` source:**

  `Vortex/src/renderer/src/extensions/file_based_loadorder/views/loadOrderIndex.tsx`

- **FBLO type definitions:**

  `Vortex/src/renderer/src/extensions/file_based_loadorder/types/types.ts`

- **`context.registerLoadOrder` declaration:**

  `Vortex/src/renderer/src/types/IExtensionContext.ts`
