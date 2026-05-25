# LoadOrderItemRenderer - Explainer & Learning Guide

**Source:** `template-ue4-5/index.js:2751-2884` (LoadOrderItemRenderer), `2732-2748` (usePakLOState), `2886-2962` (PakContextMenu)

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

Inside `main()`, FBLO is registered like this ([index.js:2573-2581](index.js#L2573)):

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
 |     `-- img          .load-order-thumb      Nexus thumbnail | nothing
 |-- p                  .load-order-name       loEntry.name  (whiteSpace:normal, wordBreak:break-word)
 |-- Checkbox           .entry-checkbox        only if displayCheckboxes = true
 `-- PakContextMenu                            only if contextMenu.itemId === loEntry.id
```

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

The template's `serializeLoadOrder` ([index.js:1772-1784](index.js#L1772)) just writes
a JSON snapshot of the load order to a local file. The actual ordering on disk
happens at **deploy time**: `loadOrderPrefix` / `makePrefix`
([index.js:1943-1970](index.js#L1943)) compute a letter prefix from each entry's
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

The full function is at [index.js:2751-2884](index.js#L2751). Broken into chunks:

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
const { selectedIds, setSelectedIds, contextMenu, setContextMenu } = usePakLOState();
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

### Chunk K -- The rendered tree

The `ListGroupItem` receives `onClick: onSelect`, `onContextMenu: onContextMenu`,
and `style: { outline: isSelected ? '2px solid #337ab7' : 'none', outlineOffset: '-1px' }`.

`PakContextMenu` is rendered as the last child, conditionally:

```js
contextMenu?.itemId === loEntry.id ? React.createElement(PakContextMenu, {
  x: contextMenu.x, y: contextMenu.y,
  item: loEntry, loadOrder, profile, dispatch, context, selectedIds,
  onClose: () => setContextMenu(null),
}) : null,
```

---

## 5b. Module-level PAK selection pub-sub (`usePakLOState`)

**Why not React context?**

`customItemRenderer` instances are rendered deep inside FBLO's `DraggableList`.
There is no API hook to wrap the list in a context provider from outside FBLO.
The only way for all row instances to share mutable selection state is a
**module-level variable** combined with a simple pub-sub notification system.

**The pattern ([index.js:2732-2748](index.js#L2732)):**

```js
let _pakSelectedIds = new Set();
let _pakContextMenu = null;
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
  };
}
```

**How it works:**

1. Each `LoadOrderItemRenderer` instance calls `usePakLOState()` on render.
2. The hook registers a `forceUpdate` reducer as a listener in `_pakListeners`.
3. When `setSelectedIds` or `setContextMenu` is called (from any instance), it

   mutates the module-level variable and then calls `_notifyPak()`.

4. `_notifyPak` calls every registered `forceUpdate`, which increments a counter

   and causes all instances to re-render, picking up the new shared state.

5. On unmount, the `useEffect` cleanup removes the listener.

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

**Source:** [index.js:2886-2962](index.js#L2886)

`PakContextMenu` is a fixed-position overlay rendered as the last child of
`LoadOrderItemRenderer` when `contextMenu.itemId === loEntry.id`.

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

**Multi-item menu** (`selectedIds.size >= 2 && selectedIds.has(item.id)`):

| Item | Action |
| --- | --- |
| Lock Selected (n) | Set `locked: true` on all selected entries; serializes |
| Unlock Selected (n) | Set `locked: false` on all selected entries; serializes |

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

---

## 12. Ue4ssLoadOrderPage layout

`Ue4ssLoadOrderPage` renders a `FlexLayout type='column'` with the mod list on top
and an info panel at the bottom. It uses its own `DraggableList` + `Ue4ssItemRenderer`
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
| Configure button | Only rendered when `configFilePath` is non-empty (detected by `useEffect` + `util.walk`); `style: { margin: '0 4px' }` |
| Enable checkbox | Plain `input[type=checkbox]` with `alignSelf: 'center', cursor: 'pointer'` -- react-bootstrap `Checkbox` wrapper breaks flex centering |
| Context menu | `Ue4ssContextMenu` rendered last when `contextMenu?.itemId === item.id` |

### Ue4ssContextMenu

`Ue4ssContextMenu` is richer than `PakContextMenu`. Single-item menu includes:
Enable/Disable, Lock/Unlock, Configure (if `configFilePath` non-empty), separator,
Open Mod Folder, separator, Move to Top, Move to Bottom.

Multi-item menu: Enable/Disable selected, Lock/Unlock selected, separator, Open Mod Folder.

---

## 13. Related reading

- **Template source:** `template-ue4-5/index.js`
  - `usePakLOState`: lines 2732-2748
  - `LoadOrderItemRenderer`: lines 2751-2884
  - `PakContextMenu`: lines 2886-2962
  - `Ue4ssSelectionContext` + `Ue4ssItemRenderer`: lines 3033-3192
  - `Ue4ssContextMenu`: lines 3194-3270
  - `Ue4ssLoadOrderPage`: lines 3295-3401
  - Registration site: lines 2573-2581
  - `makePrefix` / `loadOrderPrefix`: lines 1943-1970
  - `serializeLoadOrder` / `deserializeLoadOrder`: lines 1703-1784
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
