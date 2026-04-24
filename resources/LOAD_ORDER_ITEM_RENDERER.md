# LoadOrderItemRenderer - Explainer & Learning Guide

**Source:** `template-ue4-5/index.js:2494-2562`

---

## 1. What it is, in 60 seconds

Vortex's **File-Based Load Order** (FBLO) system manages a sorted list of mods and
renders each row in the Load Order page using a **React component** you provide.
That component is called `customItemRenderer`.

```
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

Inside `main()`, FBLO is registered like this ([index.js:2384-2393](index.js#L2384)):

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

```
ListGroupItem .load-order-entry [.selected ...]
 |-- Icon               .drag-handle-icon     drag handle on the left
 |-- LoadOrderIndexInput .load-order-index     numeric position input
 |-- div                .load-order-thumb-slot (always 96 x 54 px)
 |     `-- img          .load-order-thumb      Nexus thumbnail | nothing
 |-- p                  .load-order-name       loEntry.name
 `-- Checkbox           .entry-checkbox        only if displayCheckboxes = true
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
| `modId` | `string` | Nexus mod ID -- used to look up the thumbnail |
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

The template's `serializeLoadOrder` ([index.js:1705-1717](index.js#L1705)) just writes
a JSON snapshot of the load order to a local file. The actual ordering on disk
happens at **deploy time**: `loadOrderPrefix` / `makePrefix`
([index.js:1741-1750](index.js#L1741)) compute a letter prefix from each entry's
position in the list:

```
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

- `toggleableEntries: false` is set at registration ([index.js:2390](index.js#L2390))
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

The full function is at [index.js:2494-2562](index.js#L2494). Broken into chunks:

---

### Chunk A -- Imports inside the function body (lines 2498-2500)

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

### Chunk B -- Getting api from context (lines 2502-2503)

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

### Chunk C -- Reading state with useSelector (lines 2505-2508)

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

**What is `util.getSafe`?**

A Vortex utility that does a safe deep-read of a nested object. If any intermediate
key is missing, it returns the fallback instead of throwing. Here the fallback is
`[]` -- if there is no load order yet, the component gets an empty array.

**What is `persistent.loadOrder`?**

The Vortex Redux state tree. `persistent` is the branch that survives app restarts.
Load orders are stored under `persistent.loadOrder[profileId]`, which is why the
active profile ID is needed first.

---

### Chunk D -- Destructuring item, reading the thumbnail (lines 2510-2513)

```js
const { loEntry, displayCheckboxes } = item;
const mods = useSelector((state) => util.getSafe(state, ['persistent', 'mods', GAME_ID], {}));
const pictureUrl = mods[loEntry.modId]?.attributes?.pictureUrl;
const currentIdx = loadOrder.findIndex((e) => e.id === loEntry.id) + 1;
```

**Where does `pictureUrl` come from?**

When Vortex downloads a mod from Nexus Mods it stores metadata -- including the Nexus
CDN thumbnail URL -- as `mod.attributes.pictureUrl`. This is an HTTPS URL the browser
can load directly. Not every mod has one (local installs, for example), so optional
chaining (`?.`) means `pictureUrl` is `undefined` when absent.

**Why `GAME_ID` here?**

Mods for this game live under `persistent.mods[GAME_ID]`. `GAME_ID` is a module-level
constant in every extension -- the renderer closes over it automatically.

**Why `currentIdx + 1`?**

`findIndex` is zero-based. Load order positions are shown to users as 1-based numbers.
Adding 1 converts between the two systems.

---

### Chunk E -- Locked entries (lines 2515-2516)

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

### Chunk F -- The reorder callback (lines 2518-2523)

```js
const onApplyIndex = React.useCallback((idx) => {
  if (currentIdx === idx) return;
  const newLO = loadOrder.filter((e) => e.id !== loEntry.id);
  newLO.splice(idx - 1, 0, loEntry);
  dispatch(actions.setFBLoadOrder(profile.id, newLO));
}, [dispatch, profile, loadOrder, loEntry, currentIdx]);
```

**What triggers this?**

The user types a number into `LoadOrderIndexInput` and presses Enter. The input
component calls `onApplyIndex(idx)` where `idx` is the desired 1-based position.

**How does the splice work?**

1. Remove the entry from its current position:
   `loadOrder.filter((e) => e.id !== loEntry.id)`.
2. Insert it at the new position:
   `newLO.splice(idx - 1, 0, loEntry)`.
   (`idx - 1` converts back to 0-based for `splice`.)
3. Dispatch the entire rewritten array in one Redux action:
   `actions.setFBLoadOrder(profile.id, newLO)`.

**Why `useCallback`?**

Without it, a new function reference is created on every render, which re-renders
children unnecessarily. `useCallback` memoizes the function and only recreates it
when a dependency changes.

**Why the early return when `currentIdx === idx`?**

Dispatching a no-op action would trigger unnecessary serialize cycles.
Short-circuiting avoids that.

---

### Chunk G -- The toggle callback (lines 2525-2527)

```js
const onToggle = React.useCallback((evt) => {
  dispatch(actions.setFBLoadOrderEntry(profile.id, { ...loEntry, enabled: evt.target.checked }));
}, [dispatch, profile, loEntry]);
```

**What does this do?**

When the per-row Checkbox is toggled (in extensions where `displayCheckboxes` is
`true`), this dispatches `setFBLoadOrderEntry` -- a Redux action that patches a
single entry in the load order, flipping its `enabled` flag.

**For UE4-5 / windrose:** this callback is defined but never wired to anything
because the Checkbox never renders. It adds negligible overhead and keeps the
renderer generic for other extension types.

---

### Chunk H -- CSS class assembly (lines 2529-2530)

```js
const classes = ['load-order-entry'];
if (className) classes.push(...className.split(' '));
```

Always start with your own base class, then append what Vortex sends. Vortex may
send `"selected"` or other state classes. Replacing rather than merging would kill
the selection highlight.

---

### Chunk I -- The rendered tree (lines 2532-2561)

Since extension files cannot use JSX, everything uses `React.createElement(type, props, ...children)`:

```js
return React.createElement(
  ListGroupItem,                                     // root container
  { key: loEntry.id, className: classes.join(' ') },

  React.createElement(Icon, { className: 'drag-handle-icon', name: 'drag-handle' }),

  React.createElement(LoadOrderIndexInput, {         // numeric position editor
    className: 'load-order-index',
    api: context.api,
    item: loEntry,
    currentPosition: currentIdx,
    lockedEntriesCount: lockedCount,
    loadOrder: loadOrder,
    isLocked: isLocked,
    onApplyIndex: onApplyIndex,
  }),

  React.createElement('div',                         // fixed-size thumbnail slot
    { className: 'load-order-thumb-slot',
      style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, marginRight: 4, flexShrink: 0 } },
    pictureUrl ? React.createElement('img', {
      className: 'load-order-thumb',
      src: pictureUrl,
      draggable: false,
      style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT,
               objectFit: 'cover', borderRadius: 2, pointerEvents: 'none' },
    }) : null,
  ),

  React.createElement('p', { className: 'load-order-name' }, loEntry.name),

  displayCheckboxes ? React.createElement(Checkbox, { // conditional enable toggle
    className: 'entry-checkbox',
    checked: loEntry.enabled,
    disabled: isLocked(loEntry),
    onChange: onToggle,
  }) : null,
);
```

**`LoadOrderIndexInput` props cheatsheet:**

| Prop | What to pass |
| --- | --- |
| `api` | `context.api` |
| `item` | `loEntry` (the `ILoadOrderEntry_2` object) |
| `currentPosition` | 1-based position of this entry |
| `lockedEntriesCount` | count of entries where `isLocked` is truthy |
| `loadOrder` | the full load order array |
| `isLocked` | a function `(entry) => boolean` |
| `onApplyIndex` | called with the new 1-based position when user confirms |

The input clamps the user's typed number to `[lockedCount + 1, loadOrder.length]`
and fires `onApplyIndex` on Enter.

**The thumbnail slot:**

```
div .load-order-thumb-slot  (always width=96, height=54)
  img .load-order-thumb     (rendered only if pictureUrl is present)
  [nothing]                 (if pictureUrl is absent -- slot still occupies space)
```

`LO_IMAGE_WIDTH = 96` and `LO_IMAGE_HEIGHT = LO_IMAGE_WIDTH * 0.5625` (16:9).
The slot div always takes that space so the name column stays aligned.

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
renderer is modelled on. Here is the root element it returns (lines 154-178):

```tsx
// Vortex/extensions/games/game-witcher3/src/views/ItemRenderer.tsx
return (
  <ListGroupItem key={key} className={classes.join(' ')} ref={props.item.setRef}>
    <Icon className='drag-handle-icon' name='drag-handle' />
    <LoadOrderIndexInput
      className='load-order-index'
      api={context.api}
      item={item.loEntry}
      currentPosition={currentPosition(props)}
      lockedEntriesCount={lockedEntriesCount(props)}
      loadOrder={loadOrder}
      isLocked={isLocked}
      onApplyIndex={onApplyIndex}
    />
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
| Lock icon | Yes | No |
| Nexus thumbnail | No | Yes (new addition) |
| Checkbox | Yes (`toggleableEntries: true`) | Yes (conditional, usually dormant) |
| `displayCheckboxes` check | Not used | Yes -- guards the Checkbox branch |
| Reorder mechanism | `onApplyIndex` -> `setFBLoadOrder` | Same |

The template strips all the Witcher 3-specific features (validation, external banners,
lock icon, view-mod button), adds the thumbnail slot, and converts from JSX to
`React.createElement` so no build step is needed.

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
```

If any are missing, the renderer will fail at runtime with a ReferenceError.

### Wiring checklist

- [ ] Pass `customItemRenderer: LoadOrderItemRenderer` in `context.registerLoadOrder()`.
- [ ] Set `toggleableEntries: false` if your FBLO is rename-based (UE4-5/windrose-style).
- [ ] Set `toggleableEntries: true` if your FBLO writes real enabled/disabled state
  to disk -- the per-row checkbox will appear automatically.
- [ ] Confirm your `serializeLoadOrder` and `deserializeLoadOrder` functions are correct.
  The renderer reads from the store but cannot fix a broken serialize/deserialize.
- [ ] Make sure the mod type your extension registers for sortable mods matches what
  `deserializeLoadOrder` filters on, or entries may vanish from the list.

### Adjusting image size

Change `LO_IMAGE_WIDTH`. `LO_IMAGE_HEIGHT` derives from it automatically
(`LO_IMAGE_WIDTH * 0.5625` = 16:9). Both constants are referenced inline in the
`style` props -- changing the constants is a one-line edit.

### Function placement

Define `LoadOrderItemRenderer` **after `main()`** in the file. JavaScript hoisting
makes it accessible inside `main()` as `customItemRenderer: LoadOrderItemRenderer`
even though it appears later. This follows the standard code structure for UE4-5
extensions: imports -> toggles -> constants -> spec -> helpers -> installers ->
`applyGame()` -> `main()` -> React components -> `module.exports`.

---

## 10. Gotchas recap

| Rule | Why |
| --- | --- |
| Never pass `ref={item.setRef}` | Always `undefined` in current FBLO; emits React warnings |
| `<img>` always needs `draggable: false` and `pointerEvents: 'none'` | Native browser image drag hijacks react-dnd; rows won't move without this |
| One `setFBLoadOrder` call for the whole reorder | Never dispatch entry-by-entry in a loop; a single action is atomic |
| `require` calls go inside the function body | Top-level require of Vortex-bundled modules fails before the renderer is ready |
| Merge `className`, don't replace it | Vortex injects `"selected"` and other state classes; overwriting them breaks the selection highlight |
| Use `registerLoadOrder`, not `registerLoadOrderPage` | The older call is deprecated |
| Place the component after `main()` | Convention; hoisting handles the forward reference safely |
| `toggleableEntries: false` for rename-based FBLO | The `enabled` bit has no on-disk representation; checkbox would be a lie |

---

## 11. Related reading

- **Template source:** `template-ue4-5/index.js:2494-2562`
- **Registration site:** `template-ue4-5/index.js:2384-2393`
- **Prefix / rename logic:** `template-ue4-5/index.js:1741-1763` (`makePrefix`, `loadOrderPrefix`)
- **Serialize / deserialize:** `template-ue4-5/index.js:1636-1717`
- **Witcher 3 ItemRenderer (inspiration, TSX):**
  `Vortex/extensions/games/game-witcher3/src/views/ItemRenderer.tsx`
- **Vortex core ItemRenderer (default, TSX):**
  `Vortex/src/renderer/src/extensions/file_based_loadorder/views/ItemRenderer.tsx`
- **`LoadOrderIndexInput` source:**
  `Vortex/src/renderer/src/extensions/file_based_loadorder/views/loadOrderIndex.tsx`
- **FBLO type definitions (IItemRendererProps, ILoadOrderEntry_2, customItemRenderer):**
  `Vortex/src/renderer/src/extensions/file_based_loadorder/types/types.ts`
- **Public API surface (ILoadOrderEntry_2, ILoadOrderGameInfo):**
  `Vortex/etc/vortex.api.md:2668, 5802-5803`
- **`context.registerLoadOrder` declaration:**
  `Vortex/src/renderer/src/types/IExtensionContext.ts:1524`
