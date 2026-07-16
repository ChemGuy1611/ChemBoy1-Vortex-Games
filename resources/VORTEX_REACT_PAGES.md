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

### Signature - registerSettings

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

### Settings registration example

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

```text
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

### Disabled-setting guard

Read the setting via `useSelector` alongside other selectors at the top of the component (before any early returns — Rules of Hooks). Then guard after the empty-list check:

```js
const loEnabled = useSelector(state => util.getSafe(state, ['settings', GAME_ID, 'ue4ssLoEnabled'], true));

// after empty-list check:
if (!loEnabled) {
  return React.createElement(MainPage, null,
    React.createElement(MainPage.Body, null,
      React.createElement('p', { style: { padding: '12px', fontWeight: 'bold', color: 'yellow' } }, 'UE4SS load order is disabled in Settings.')));
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

### Sharing state across renderer instances you don't own (module pub-sub)

When the item renderer is rendered by a list **you did not create** (e.g. FBLO's
`customItemRenderer`), you cannot wrap the list in a React context provider. The
workaround is a module-level pub-sub hook: module variables hold the shared state
(selection, context menu, status filter), a listener `Set` holds one `forceUpdate`
per mounted subscriber, and every setter mutates the variable then notifies all
listeners. All rows AND the info panel subscribe to the same hook, so one setter
call re-renders everything consistently. Canonical implementation: `usePakLOState`
in `template-ue4-5/index.js` (see `resources/LOAD_ORDER_ITEM_RENDERER.md` section
5b). On pages that own their own `DraggableList`, prefer a normal React context
(`Ue4ssSelectionContext` pattern).

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

Info panels can also be fully stateful: the FBLO `usageInstructions` component in the
LO extensions (`LoadOrderInstructions`) subscribes to shared state, renders the
`StatusPills` filter UI with a matched/total count, and injects CSS -- see
`resources/LOAD_ORDER_ITEM_RENDERER.md` section 12b.

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

When **any** filter is active, reordering must splice filtered positions back into
the full list. If the page has more than one filter (e.g. text + status), the guard
must cover all of them -- guarding on `filterText` alone mis-merges reorders done
under the other filter:

```js
const isFiltered = !!filterText || statusFilter.size > 0;

const onApply = React.useCallback((reordered) => {
  let newItems;
  if (isFiltered) {
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
}, [dispatch, allItems, isFiltered]);
```

### Status filter dropdown (beside the search box)

The LO pages pair the search box with a status-filter dropdown in a header flex row.
The list is then filtered by both: text match AND `matchesStatus` (a shared predicate
over enabled/locked/unmanaged token sets -- see `resources/LOAD_ORDER_ITEM_RENDERER.md`
section 12b):

```js
const [statusFilter, setStatusFilter] = React.useState(new Set());

const filteredItems = allItems.filter(e =>
  (!filterText || e.name.toLowerCase().includes(filterText.toLowerCase()))
  && matchesStatus(e, statusFilter, isEntryEnabled, isEntryLocked));

// Header:
React.createElement('div', { style: { display: 'flex', alignItems: 'center', width: '100%' } },
  React.createElement(FormControl, { type: 'search', style: { flex: 1 }, /* ... */ }),
  React.createElement(LoadOrderStatusFilter, {
    active: statusFilter, setActive: setStatusFilter, groups: ['enabled', 'locked', 'unmanaged'],
    count: statusFilter.size > 0 ? { matched: filteredItems.length, total: allItems.length } : null,
  }),
)
```

Load-bearing detail: `LoadOrderStatusFilter` is a **hand-built** dropdown (button +
checkbox panel). react-bootstrap's `Dropdown` auto-closes on every inner click,
which makes multi-checkbox filtering unusable. It dismisses on outside click,
right-click, or Escape (the same listener pattern as context menus), anchors its
panel `right: 0`, and shows a `matched / total` count while active.

---

## 11. Component Placement Rule

Define React components **after `main()`** and before `module.exports`. They can be referenced inside `main()` because JS hoisting makes function declarations available throughout the file scope.

```text
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

See [game-subnautica2/index.js](../game-subnautica2/index.js) for the complete
working implementation (grep by name -- line numbers drift as the file grows):

- `registerReducer` (grep `['persistent', 'ue4ssLoadOrder']`) — persistent load order list
- `registerMainPage` (grep `'UE4SS Load Order'`) — sidebar registration with visibility gating
- `GameSettings` — settings panel with `Toggle`+`More`
- `Ue4ssItemRenderer` — DnD item with thumbnail, checkbox, context menu
- `Ue4ssLoadOrderInfoPanel` — static info panel
- `Ue4ssLoadOrderPage` — full page with text + status filter, DnD list, info panel
- `LogicModsLoadOrderPage` — second custom LO page (same pattern, Enabled = Vortex mod state)

---

## 15. Page Groups

The `group` option controls where a page appears in the sidebar.

| Group | When visible | Real examples |
| --- | --- | --- |
| `'per-game'` | Only when a game is active | Load Order, Browse Nexus, Health Check |
| `'global'` | Always (no game required) | Downloads, Extensions, Games |
| `'dashboard'` | Used only for the Dashboard tab itself | Dashboard |
| `'hidden'` | Accessible programmatically but no sidebar entry | About dialog |
| `'support'` | Defined in interface but unused in practice | — |

Use `'per-game'` for all game-specific extension pages. Use `'global'` for tools or viewers that make sense without any game active.

---

## 16. Badge and Activity Indicators

`badge` shows a numeric count on the sidebar icon. `activity` shows a spinner. Both take a `ReduxProp` — a subscription to a Redux state path with a transform function.

### Constructing a `ReduxProp`

```js
const { ReduxProp } = require('vortex-api');

// badge: count of active items from state
const myBadgeCount = new ReduxProp(
  context.api,
  [['persistent', 'myData', 'items']],   // array of state paths to subscribe to
  (items) => {
    const count = Object.keys(items ?? {})
      .filter(id => items[id].active).length;
    return count > 0 ? count : undefined;  // undefined = no badge shown
  }
);

context.registerMainPage('download', 'My Page', MyPage, {
  group: 'global',
  priority: 30,
  badge: myBadgeCount,    // numeric badge on sidebar icon
  // activity: myActivity // spinner instead of badge
});
```

- Return `undefined` from the transform to hide the badge.
- `activity` is for long-running background work (e.g. installing mods). `badge` is for count-based indicators.
- Real example: `Vortex/src/renderer/src/extensions/download_management/index.ts` — `downloadCount` badges active downloads.

---

## 17. MDI Icons

Use `mdi` to provide a custom SVG icon from `@mdi/js` instead of a named string icon. MDI = Material Design Icons.

**Finding icons:** [pictogrammers.com/library/mdi/](https://pictogrammers.com/library/mdi/)

Workflow to get path data from Pictogrammers:

1. Search for icon by name or keyword
2. Click the icon
3. Click **SVG** tab in the detail panel
4. Copy the `d="..."` value (the long path string)
5. Paste as a string constant in your extension

**Option A — named import from `@mdi/js`** (bundled with Vortex; preferred when the icon exists):

```js
const { mdiGamepad, mdiFolder, mdiCog } = require('@mdi/js');

context.registerMainPage('', 'My Page', MyPage, {
  group: 'per-game',
  mdi: mdiGamepad,
});
```

Named exports follow `mdi` + PascalCase icon name: `mdi-gamepad` → `mdiGamepad`, `mdi-file-tree` → `mdiFileTree`.

**Option B — raw SVG path string** (for custom/unavailable icons):

```js
const UE4SS_ICON = 'M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22...';

context.registerMainPage('', 'My Page', MyPage, {
  group: 'per-game',
  mdi: UE4SS_ICON,
});
```

### Rules

- When `mdi` is set, the first `icon` string argument to `registerMainPage` is ignored.
- Store as a `const` at file top; reuse across multiple page registrations.
- `mdi` is **only** for `registerMainPage` — `registerAction` icon strings are from Vortex's own icon font (e.g. `'open-ext'`, `'gamepad'`), not MDI.

Real examples: `mdi: mdiViewDashboard` (Dashboard page), `mdi: mdiMagnify` (Browse Nexus page), `mdi: UE4SS_ICON` (UE4SS Load Order pages in CB1 extensions).

---

## 18. Simple Info / Status Page (No DnD)

Not all pages need drag-and-drop. A static or read-only page is just a `MainPage` with content in the body.

```js
function MyInfoPage({ api }) {
  const { useSelector } = require('react-redux');
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    loadData(api).then(setData);
  }, []);

  if (!data) {
    return React.createElement(MainPage, null,
      React.createElement(MainPage.Body, null,
        React.createElement(Spinner)));
  }

  return React.createElement(MainPage, null,
    React.createElement(MainPage.Body, null,
      React.createElement('div', { style: { padding: 16 } },
        React.createElement('h2', null, 'Status'),
        React.createElement('p', null, `Loaded ${data.items.length} items.`),
        data.items.map(item =>
          React.createElement('div', { key: item.id, style: { marginBottom: 8 } },
            React.createElement('strong', null, item.name),
            React.createElement('span', { style: { marginLeft: 8, color: '#aaa' } }, item.status),
          )
        ),
      )
    )
  );
}
```

Register the same way as any page:

```js
context.registerMainPage('gamepad', 'My Status', MyInfoPage, {
  id: `${GAME_ID}-status`,
  group: 'per-game',
  priority: 40,
  hotkey: 'S',
  visible: () => selectors.activeGameId(context.api.store.getState()) === GAME_ID,
  props: () => ({ api: context.api }),
});
```

---

## 19. Page Header with Toolbar Buttons

Two approaches for toolbar buttons in `MainPage.Header`:

### Approach A: `staticElements` with `IconBar`

Use this for hardcoded buttons (not user-extensible).

```js
const { IconBar } = require('vortex-api');

const toolbarButtons = [
  {
    component: ToolbarIcon,  // or any React component
    props: () => ({
      id: 'btn-refresh',
      icon: 'refresh',
      text: 'Refresh',
      onClick: () => loadData(api),
    }),
  },
];

// In the page component:
React.createElement(MainPage, null,
  React.createElement(MainPage.Header, null,
    React.createElement(IconBar, {
      group: `${GAME_ID}-toolbar-icons`,  // matches registerAction group
      staticElements: toolbarButtons,
    })
  ),
  React.createElement(MainPage.Body, null, /* ... */),
)
```

### Approach B: `registerAction` (user-extensible toolbar)

`registerAction` adds buttons to a named toolbar group. Any extension can add to the same group. The page renders the group via `IconBar`.

```js
// In main():
context.registerAction(
  `${GAME_ID}-toolbar-icons`,   // group name — matches IconBar group prop
  100,                          // priority (lower = left)
  'refresh',                    // icon name
  {},                           // options
  'Refresh Data',               // tooltip / label
  (instanceIds) => {
    loadData(context.api);
  },
  (instanceIds) => true,        // condition: return true/false or an error string
);
```

Full `registerAction` signature: see [REGISTER_ACTION.md](REGISTER_ACTION.md).

---

## 20. Tab-Based Page Layout

Vortex's own Health Check page builds its tabs from `TabProvider`, `TabBar`, and `TabPanel` — but these are **internal components** (`src/renderer/src/ui/components/tabs/`), imported by relative path inside the Vortex source. They are **not exported through the `vortex-api` runtime barrel** (`src/renderer/src/api.ts`), so `require('vortex-api')` in an extension does not provide them (verified against Vortex 2.3.0, 2026-07-14).

For an extension-built tabbed page, hand-roll the same pattern: keep an `activeTab` state, render a row of buttons as the tab bar, and show/hide panels by comparing against `activeTab`. The example below sketches the equivalent structure (the internal components referenced are shown for shape only — substitute your own):

```js
function MyTabbedPage({ api }) {
  // TabProvider/TabBar/TabPanel are NOT available from require('vortex-api');
  // this shows the structural pattern to replicate with your own components.
  const [activeTab, setActiveTab] = React.useState('tab-a');

  return React.createElement(MainPage, null,
    React.createElement(MainPage.Header, null,
      React.createElement(TabBar, {
        activeTab,
        tabs: [
          { id: 'tab-a', title: 'Overview' },
          { id: 'tab-b', title: 'Details', count: 3 },  // count shows a badge
        ],
        onSelect: setActiveTab,
      }),
    ),
    React.createElement(MainPage.Body, null,
      React.createElement(TabProvider, { activeTab },
        React.createElement(TabPanel, { tabId: 'tab-a' },
          React.createElement('div', { style: { padding: 16 } },
            React.createElement('p', null, 'Overview content.'),
          ),
        ),
        React.createElement(TabPanel, { tabId: 'tab-b' },
          React.createElement('div', { style: { padding: 16 } },
            React.createElement('p', null, 'Details content.'),
          ),
        ),
      ),
    ),
  );
}
```

- `count` on a tab entry shows a numeric badge next to the tab label.
- `TabProvider` + `TabPanel` handle show/hide based on `activeTab`.
- Tabs can also go inside `MainPage.Body` rather than the header, depending on layout needs.

---

## 21. `registerDashlet` — Dashboard Widgets

Add a widget to the Dashboard page. Dashlets are small cards in the masonry grid.

### Interface

```js
context.registerDashlet(
  title,      // string — card heading
  width,      // 1 | 2 | 3 — grid column units
  height,     // 1 | 2 | 3 | 4 | 5 — grid row units
  position,   // number — initial position in the grid
  Component,  // React.ComponentType — the card content
  isFixed,    // boolean — if true, user cannot move/close it
  propsCallback,  // () => ({}) — extra props for Component
  isVisible,  // (state) => boolean — hide when condition is false
);
```

### Dashlet registration example

```js
context.registerDashlet(
  'My Game Status',
  2,             // 2 columns wide
  2,             // 2 rows tall
  10,            // position 10 in the grid
  MyDashletComponent,
  false,         // user can close/move it
  () => ({}),
  (state) => selectors.activeGameId(state) === GAME_ID,
);
```

### Dashlet component

```js
function MyDashletComponent() {
  const { useSelector } = require('react-redux');
  const count = useSelector(state =>
    util.getSafe(state, ['persistent', 'myData', GAME_ID, 'items'], []).length);

  return React.createElement('div', { style: { padding: 12 } },
    React.createElement('p', null, `${count} items installed.`),
  );
}
```

- Dashlets must be self-contained — no props from outside except what `propsCallback` provides.
- Vortex handles positioning and the Edit Mode toggle for user rearrangement.
- `isFixed: true` means the dashlet cannot be moved or closed by the user.

---

## 22. `registerFooter` — Footer Components

Add a persistent component to the Vortex footer bar (bottom of the window).

```js
context.registerFooter('my-footer-item', MyFooterComponent);
```

```js
function MyFooterComponent() {
  const { useSelector } = require('react-redux');
  const status = useSelector(state =>
    util.getSafe(state, ['session', GAME_ID, 'status'], ''));

  return React.createElement('div', { style: { padding: '0 8px', display: 'flex', alignItems: 'center' } },
    React.createElement('span', null, status),
  );
}
```

- Footer is always visible regardless of active page.
- Use for lightweight status indicators (e.g. transfer speed, background task status).
- Real example: `registerFooter('speed-o-meter', SpeedOMeter)` in `download_management`.

---

## 23. `isClassicOnly` / `isModernOnly` Options

Gate a page to a specific UI generation of Vortex.

```js
context.registerMainPage('profiles', 'Profiles', ProfilesPage, {
  group: 'global',
  hotkey: 'P',
  isClassicOnly: true,   // only shown in Vortex "classic" UI
  // isModernOnly: true  // only shown in Vortex "modern" UI
  visible: () => ...,
});
```

- In practice, only the Profiles page uses `isClassicOnly: true`.
- Most extensions can ignore these options.

---

## 24. Putting It All Together — Non-DnD Game Page Example

A game-specific page that shows save files (no DnD, has toolbar, reloads on profile change):

```js
// --- In main() ---
context.registerMainPage('savegame', 'Saves', SavesPage, {
  id: `${GAME_ID}-saves`,
  group: 'per-game',
  priority: 40,
  hotkey: 'V',
  visible: () => selectors.activeGameId(context.api.store.getState()) === GAME_ID,
  props: () => ({ api: context.api }),
});

// --- Component (after main()) ---
function SavesPage({ api }) {
  const { IconBar } = require('vortex-api');
  const { useSelector } = require('react-redux');

  const profileId = useSelector(state => selectors.activeProfile(state)?.id);
  const [saves, setSaves] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadSavesFromDisk(api);
      setSaves(result);
    } finally {
      setLoading(false);
    }
  }, [api]);

  React.useEffect(() => {
    if (!profileId) return;
    reload();
  }, [profileId, reload]);

  const toolbarButtons = [
    {
      component: ToolbarIcon,
      props: () => ({ id: 'btn-refresh', icon: 'refresh', text: 'Refresh', onClick: reload }),
    },
  ];

  if (loading) {
    return React.createElement(MainPage, null,
      React.createElement(MainPage.Body, null, React.createElement(Spinner)));
  }

  return React.createElement(MainPage, null,
    React.createElement(MainPage.Header, null,
      React.createElement(IconBar, {
        group: `${GAME_ID}-saves-toolbar`,
        staticElements: toolbarButtons,
      }),
    ),
    React.createElement(MainPage.Body, null,
      React.createElement('div', { style: { padding: 16 } },
        saves.length === 0
          ? React.createElement('p', null, 'No saves found.')
          : saves.map(save =>
              React.createElement('div', {
                key: save.id,
                style: { padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' },
              },
                React.createElement('strong', null, save.name),
                React.createElement('span', { style: { marginLeft: 12, color: '#aaa' } },
                  new Date(save.date).toLocaleDateString()),
              )
            ),
      ),
    ),
  );
}

// ToolbarIcon helper (paste once per file, or import from a shared module)
function ToolbarIcon({ id, icon, text, onClick }) {
  const { Icon } = require('vortex-api');
  return React.createElement('div', {
    id,
    className: 'toolbar-icon',
    onClick,
    title: text,
    style: { display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '0 8px' },
  },
    React.createElement(Icon, { name: icon }),
    React.createElement('span', null, text),
  );
}
```

---

## 25. Full Examples in Other Repos

| Page type | File | Notes |
| --- | --- | --- |
| DnD load order (LO + sidebar info panel) | `game-subnautica2/index.js` | Full UE4SS LO page |
| DnD load order (FBLO + context menu) | `game-legobatmanlegacyofthedarkknight/index.js` | Pak LO + context menu |
| Settings panel | `template-ue4-5/index.js` | `Toggle`+`More` pattern |
| Dashboard | `Vortex/src/renderer/src/extensions/dashboard/index.ts` | Dashlet registry + Packery grid |
| Search + pagination page | `Vortex/src/renderer/src/extensions/browse_nexus/index.ts` | `useSelector` + async search |
| Health/status + tabs | `Vortex/src/renderer/src/extensions/health_check/index.ts` | `TabProvider`/`TabBar`/`TabPanel` |
| Badge on sidebar icon | `Vortex/src/renderer/src/extensions/download_management/index.ts` | `ReduxProp` + `badge` |
| Saves table page | `vortex-games/game-mount-and-blade2/src/index.ts` | `useContext(MainContext)` + toolbar |
