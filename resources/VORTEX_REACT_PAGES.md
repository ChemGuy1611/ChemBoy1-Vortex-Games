# Vortex Extension Pages Reference

How to create sidebar pages and settings panels in Vortex extensions using React (no JSX, plain CJS).

---

## 1. Imports

```js
const { actions, fs, util, selectors, log,
        MainPage, FlexLayout, DNDContainer, DraggableList, Spinner } = require('vortex-api');
const React = require('react');
```

All Vortex UI components come from `vortex-api`. `react-bootstrap` components are required lazily inside component functions. `react-redux` hooks are also required lazily.

---

## 2. `registerMainPage` — Add a Sidebar Page

### Signature

```js
context.registerMainPage(icon, title, Component, options);
```

| Param | Type | Notes |
| --- | --- | --- |
| `icon` | `string` | Icon name string (e.g. `'unreal'`, `'gamepad'`) |
| `title` | `string` | Label shown in the sidebar |
| `Component` | `React.ComponentType` | Page component — receives `props` from the `props` callback |
| `options` | `IMainPageOptions` | See below |

### `IMainPageOptions`

```js
{
  id: string,           // unique page ID, avoids title collisions
  group: 'dashboard' | 'global' | 'per-game' | 'support' | 'hidden',
  priority: number,     // lower = higher in sidebar; 31 is just below LO page
  hotkey: string,       // letter for Ctrl+Shift+<key> shortcut
  hotkeyRaw: string,    // full electron hotkey string (alternative to hotkey)
  visible: () => bool,  // hide/show the page dynamically
  props: () => ({}),    // extra props passed to the Component
  mdi: string,          // SVG path data for a custom icon
  badge: ReduxProp,     // shows a badge on the sidebar icon
  activity: ReduxProp,  // shows a spinner on the sidebar icon
  onReset: () => void,  // called when page is reset
}
```

### Minimal example

```js
context.registerMainPage('unreal', 'UE4SS Load Order', Ue4ssLoadOrderPage, {
  id: `${GAME_ID}-ue4ss-loadorder`,
  priority: 31,
  group: 'per-game',
  hotkey: 'U',
  visible: () => {
    const state = context.api.store.getState();
    const gameId = selectors.activeGameId(state);
    const loEnabled = util.getSafe(state, ['settings', GAME_ID, 'ue4ssLoEnabled'], true);
    return gameId === GAME_ID && loEnabled;
  },
  props: () => ({ api: context.api }),
});
```

- `group: 'per-game'` — page appears only when a game is active.
- `visible` is re-evaluated on state changes; use it to gate on `activeGameId` and feature toggles.
- `props` injects additional values into the component beyond the Redux store. `api` is the most common.

---

## 3. `registerSettings` — Add a Settings Tab Panel

### Signature

```js
context.registerSettings(title, Component, propsCallback, visibleCallback, priority);
```

| Param | Type | Notes |
| --- | --- | --- |
| `title` | `string` | Tab label in Settings dialog |
| `Component` | `React.ComponentType` | Settings panel component |
| `propsCallback` | `() => ({})` | Extra props; usually `() => ({})` |
| `visibleCallback` | `() => bool` | Gate by active game ID |
| `priority` | `number` | Order within the tab; `150` is a safe default |

### Example

```js
context.registerSettings('Mods', GameSettings, () => ({}),
  () => selectors.activeGameId(context.api.getState()) === GAME_ID, 150);
```

### Settings component pattern

```js
function GameSettings() {
  const { Toggle, More } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');
  const dispatch = useDispatch();

  const myFlag = useSelector(state =>
    util.getSafe(state, ['settings', GAME_ID, 'myFlag'], true));

  const onToggle = React.useCallback((checked) => {
    dispatch(setMyFlag(checked));
  }, [dispatch]);

  return React.createElement('form', null,
    React.createElement('div', { className: 'settings-group' },
      React.createElement(Toggle, { checked: myFlag, onToggle },
        'My Feature',
        React.createElement(More, { id: `${GAME_ID}-my-feature-more`, name: 'My Feature' },
          'Tooltip text explaining what this toggle does.',
        ),
      ),
    ),
  );
}
```

**`Toggle` props:**
- `checked` — boolean state value
- `onToggle(checked: boolean)` — receives the new value (not a DOM event)

**`More` props:**
- `id` — must be unique across all registered `More` components
- `name` — display name in the tooltip header

---

## 4. `registerReducer` — Persist State for Pages

Pages that need persistent state (like a load order list) use `registerReducer`. Call it **before** `registerMainPage`.

### State paths

| Path prefix | Persisted? | Notes |
| --- | --- | --- |
| `['settings', ...]` | Yes | User settings, survives restart |
| `['persistent', ...]` | Yes | Persistent game data |
| `['session', ...]` | No | Cleared on restart |

### Example — settings flag

```js
// Action creator
const SET_MY_FLAG = `SET_${GAME_ID.toUpperCase()}_MY_FLAG`;
function setMyFlag(value) { return { type: SET_MY_FLAG, payload: value }; }
setMyFlag.toString = () => SET_MY_FLAG;

// In main():
context.registerReducer(['settings', GAME_ID], {
  reducers: {
    [setMyFlag.toString()]: (state, payload) => util.setSafe(state, ['myFlag'], payload),
  },
  defaults: { myFlag: true },
});
```

### Example — persistent list

```js
const SET_MY_LIST = `SET_${GAME_ID.toUpperCase()}_MY_LIST`;
function setMyList(list) { return { type: SET_MY_LIST, payload: list }; }
setMyList.toString = () => SET_MY_LIST;

// In main():
context.registerReducer(['persistent', 'myList', GAME_ID], {
  reducers: {
    [setMyList.toString()]: (state, payload) => ({ ...state, items: payload }),
  },
  defaults: { items: [] },
});
```

Reading state:
```js
const items = useSelector(state =>
  util.getSafe(state, ['persistent', 'myList', GAME_ID, 'items'], []));
```

---

## 5. `MainPage` Layout

All main pages should use the `MainPage` wrapper. Three sub-components:

```
MainPage          — root wrapper
  MainPage.Header — optional toolbar / filter row at top
  MainPage.Body   — scrollable content area
```

### Skeleton

```js
function MyPage({ api }) {
  return React.createElement(MainPage, null,
    React.createElement(MainPage.Header, null,
      // toolbar content
    ),
    React.createElement(MainPage.Body, null,
      // page content
    ),
  );
}
```

### Loading state

```js
if (!items.length) {
  return React.createElement(MainPage, null,
    React.createElement(MainPage.Body, null,
      React.createElement(Spinner)));
}
```

---

## 6. Layout Primitives

### `FlexLayout`

Flexbox row or column container with optional fixed/flex children.

```js
React.createElement(FlexLayout, { type: 'row', style: { height: '100%' } },
  React.createElement(FlexLayout.Flex, { style: { overflowY: 'auto' } },
    // list
  ),
  React.createElement(FlexLayout.Flex, { style: { flex: '0 0 300px', overflowY: 'auto' } },
    // fixed-width info panel
  ),
)
```

- `FlexLayout.Flex` — grows to fill space; accepts `fill?: boolean` and any HTML div attrs.
- `FlexLayout.Fixed` — fixed-size child.

### `DNDContainer`

Required wrapper for any drag-and-drop list. Provides the react-dnd context.

```js
React.createElement(DNDContainer, { style: { height: '95%' } },
  // DraggableList goes here
)
```

### `DraggableList`

```js
React.createElement(DraggableList, {
  itemTypeId: `${GAME_ID}-my-entry`,    // unique drag type ID
  id: `${GAME_ID}-my-list`,            // unique list ID
  items: itemsArray,                   // array of item objects
  itemRenderer: MyItemRenderer,        // component rendered per item
  apply: onApply,                      // called with reordered array on drop
  idFunc: entry => entry.id,          // extracts unique key from item
})
```

`IDraggableListProps`:
```ts
{
  disabled?: boolean;
  id: string;
  itemTypeId: string;
  items: any[];
  isLocked?: (item: any) => boolean;
  idFunc?: (item: any) => string;
  itemRenderer: React.ComponentType<{ item: any; className?: string }>;
  apply: (reordered: any[]) => void;
}
```

---

## 7. React Hooks in Extension Components

Components are plain function components. All hooks must be called inside function bodies (React rules of hooks apply).

### Common pattern

```js
function MyComponent({ api }) {
  const { useSelector, useDispatch } = require('react-redux');
  const { MainContext } = require('vortex-api');

  const vortexContext = React.useContext(MainContext); // access api inside components
  const dispatch = useDispatch();
  const [localState, setLocalState] = React.useState('');

  const items = useSelector(state =>
    util.getSafe(state, ['persistent', 'myList', GAME_ID, 'items'], []));

  React.useEffect(() => {
    // runs when profileId changes
    loadData(api).then(data => dispatch(setMyList(data)));
  }, [profileId]);

  const onAction = React.useCallback((value) => {
    dispatch(setMyList(value));
  }, [dispatch, items]);

  return React.createElement('div', null, /* ... */);
}
```

### `MainContext`

Provides `{ api }` — use this inside item renderers or sub-components that don't receive `api` as a prop:

```js
const { MainContext } = require('vortex-api');
const vortexContext = React.useContext(MainContext);
vortexContext.api.sendNotification({ ... });
```

---

## 8. Item Renderer Pattern

Item renderers receive `{ item, className }` props from `DraggableList`. The `className` includes drag handle CSS classes — always forward it.

```js
function MyItemRenderer({ className, item }) {
  const { Checkbox } = require('react-bootstrap');
  const { Icon } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');

  const dispatch = useDispatch();
  const items = useSelector(state =>
    util.getSafe(state, ['persistent', 'myList', GAME_ID, 'items'], []));

  const onToggle = React.useCallback((evt) => {
    const newItems = items.map(e => e.id === item.id ? { ...e, enabled: evt.target.checked } : e);
    dispatch(setMyList(newItems));
  }, [dispatch, items, item]);

  const classes = ['load-order-entry'];
  if (className) classes.push(...className.split(' ').filter(Boolean));

  return React.createElement('div', {
    className: classes.join(' '),
    style: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, padding: '4px 12px', minHeight: 52 },
  },
    React.createElement(Icon, { className: 'drag-handle-icon', name: 'drag-handle' }),
    React.createElement('p', { style: { flex: '1 1 0', margin: 0 } }, item.name),
    React.createElement(Checkbox, {
      checked: item.enabled ?? true,
      onChange: onToggle,
    }),
  );
}
```

**Rules:**
- Always include `Icon` with `name: 'drag-handle'` and `className: 'drag-handle-icon'`.
- Spread `className` from props onto the root element so DnD works.
- Use `filter(Boolean)` when splitting className to avoid empty class strings.

---

## 9. Info Panel Pattern

Static (or lightly reactive) info panels are simple function components:

```js
function MyInfoPanel() {
  return React.createElement('div', {
    id: 'loadorderinfo',
    style: { padding: '12px', height: '100%', overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.1)' },
  },
    React.createElement('h2', { style: { marginTop: 0 } }, 'Panel Title'),
    React.createElement('p', null, 'Explanatory text here.'),
    React.createElement('br', null),
    React.createElement('p', null,
      'Text with ',
      React.createElement('strong', null, 'bold inline'),
      ' words.',
    ),
    React.createElement('p', { style: { fontStyle: 'italic' } }, 'Note text.'),
  );
}
```

---

## 10. Search / Filter in Header

```js
function MyPage({ api }) {
  const { FormControl } = require('react-bootstrap');
  const [filterText, setFilterText] = React.useState('');

  const allItems = useSelector(...);
  const filteredItems = filterText
    ? allItems.filter(e => e.name.toLowerCase().includes(filterText.toLowerCase()))
    : allItems;

  return React.createElement(MainPage, null,
    React.createElement(MainPage.Header, null,
      React.createElement(FormControl, {
        type: 'search',
        placeholder: 'Filter mods...',
        className: 'file-based-load-order-filter',
        value: filterText,
        onChange: (evt) => setFilterText(evt.target.value),
      })
    ),
    React.createElement(MainPage.Body, null,
      // use filteredItems
    ),
  );
}
```

When filter is active, reordering must splice filtered positions back into the full list:

```js
const onApply = React.useCallback((reordered) => {
  let newItems;
  if (filterText) {
    const filteredIds = new Set(reordered.map(e => e.id));
    const positions = allItems.reduce((acc, e, i) => {
      if (filteredIds.has(e.id)) acc.push(i);
      return acc;
    }, []);
    newItems = [...allItems];
    positions.forEach((pos, i) => { newItems[pos] = reordered[i]; });
  } else {
    newItems = reordered;
  }
  dispatch(setMyList(newItems));
}, [dispatch, allItems, filterText]);
```

---

## 11. Component Placement Rule

Define React components **after `main()`** and before `module.exports`. They can be referenced inside `main()` because JS hoisting makes function declarations available throughout the file scope.

```
Imports
Toggles / constants
spec
Helper functions
Installer functions
applyGame()
main()         <-- registers everything, references components defined below
                   React components        <-- defined here
module.exports
```

---

## 12. Visibility Gating — Common Patterns

### Gate by active game

```js
visible: () => selectors.activeGameId(context.api.store.getState()) === GAME_ID,
```

### Gate by game + feature toggle

```js
visible: () => {
  const state = context.api.store.getState();
  return selectors.activeGameId(state) === GAME_ID
    && util.getSafe(state, ['settings', GAME_ID, 'myFeatureEnabled'], true);
},
```

---

## 13. Available Components Cheatsheet

| Component | Source | Notes |
| --- | --- | --- |
| `MainPage` | `vortex-api` | Root page wrapper; use `.Header` and `.Body` |
| `FlexLayout` | `vortex-api` | Row/column flex container; use `.Flex` and `.Fixed` |
| `DNDContainer` | `vortex-api` | Required DnD context wrapper |
| `DraggableList` | `vortex-api` | Drag-and-drop list with custom item renderers |
| `Spinner` | `vortex-api` | Loading spinner |
| `Toggle` | `vortex-api` | Boolean toggle; `onToggle(checked)` receives new value |
| `More` | `vortex-api` | Tooltip/info popup; needs unique `id` |
| `Icon` | `vortex-api` | Icon by name (e.g. `'drag-handle'`, `'gamepad'`) |
| `MainContext` | `vortex-api` | React context providing `{ api }` |
| `LoadOrderIndexInput` | `vortex-api` | Numeric index input for FBLO items |
| `ListGroupItem` | `react-bootstrap` | Bootstrap list item; use as outer in FBLO renderers |
| `Checkbox` | `react-bootstrap` | Standard checkbox |
| `FormControl` | `react-bootstrap` | Text input (search/filter box) |
| `useSelector` | `react-redux` | Subscribe to Redux state |
| `useDispatch` | `react-redux` | Get Redux dispatch function |

---

## 14. Full Example — Custom Load Order Page

See [game-subnautica2/index.js](../game-subnautica2/index.js) lines 2639–2985 for the complete working implementation:

- `registerReducer` at line 2635 — persistent load order list
- `registerMainPage` at line 2641 — sidebar registration with visibility gating
- `GameSettings` at line 2817 — settings panel with `Toggle`+`More`
- `Ue4ssItemRenderer` at line 2840 — DnD item with thumbnail, checkbox
- `Ue4ssLoadOrderInfoPanel` at line 2891 — static info panel
- `Ue4ssLoadOrderPage` at line 2916 — full page with filter, DnD list, info panel
