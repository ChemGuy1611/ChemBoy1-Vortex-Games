# Settings Reducer Reference

How to persist user-configurable settings in a Vortex extension using
`context.registerReducer` and `context.registerSettings`.

---

## Quick-reference: path prefixes and persistence

| Path prefix     | Persists?          | Cleared when?             | Typical use                        |
| --------------- | ------------------ | ------------------------- | ---------------------------------- |
| `settings`      | Yes (global)       | Never                     | Game-level user settings           |
| `persistent`    | Yes (global)       | Never                     | Mod lists, load order state        |
| `session`       | No                 | Every Vortex restart      | Transient UI state                 |
| `window`        | Yes (global)       | Never                     | Window/UI preferences              |

`settings` and `persistent` are both global Vortex hives — they are already
persisted by core. `session` is explicitly non-persisting.

For a custom top-level hive (not `settings`/`persistent`/`session`/`window`),
call `context.registerSettingsHive` first (see below).

---

## 1. Define actions (plain JS)

Extensions use plain JS. Two patterns:

### Manual (subnautica2-style — no extra dependency)

```js
const SET_MY_VALUE = `SET_${GAME_ID.toUpperCase()}_MY_VALUE`;
function setMyValue(value) { return { type: SET_MY_VALUE, payload: value }; }
setMyValue.toString = () => SET_MY_VALUE;
```

`toString()` override is required so `[setMyValue.toString()]` works as an
object key in the reducer map.

### redux-act (used in snippets.js and vortex-games reference extensions)

```js
const { createAction } = require('redux-act');
const setMyValue = createAction(`${GAME_ID.toUpperCase()}_SET_MY_VALUE`, (v) => v);
```

`createAction` already provides `.toString()` returning the action type.

---

## 2. Register the reducer

Call **first** in `main()`, before any other registrations.

```js
function main(context) {
  context.registerReducer(['settings', GAME_ID], {
    reducers: {
      [setMyValue.toString()]: (state, payload) => util.setSafe(state, ['myKey'], payload),
    },
    defaults: {
      myKey: 'default-value',
    },
  });
  // ... rest of registrations
}
```

### IReducerSpec shape

```
{
  reducers: { [actionTypeString]: (state, payload) => newState },
  defaults:  { ... }   // initial state; same keys as what reducers touch
  verifiers?: { ... }  // optional state-shape validators
}
```

- Reducers must be **pure** — return a new object, never mutate.
- Use `util.setSafe(state, [keyPath], value)` for nested updates; use spread
  (`{ ...state, key: value }`) for shallow updates.
- State must be **serializable** — strings, numbers, booleans, arrays, plain
  objects only. No functions or class instances.
- `api.sendNotification` and `api.showDialog` are **not available** inside
  reducer functions.

### Path for game-specific settings

```js
context.registerReducer(['settings', GAME_ID], spec);
// state lives at: state.settings[GAME_ID]
```

### Path for persistent state (e.g. load order)

```js
context.registerReducer(['persistent', 'ue4ssLoadOrder', GAME_ID], spec);
// state lives at: state.persistent.ue4ssLoadOrder[GAME_ID]
```

---

## 3. Read state

```js
// Outside a React component (setup, event handler, etc.)
const value = util.getSafe(api.getState(), ['settings', GAME_ID, 'myKey'], 'fallback');

// Direct property access (when shape is known)
const mods = api.getState().persistent.mods[GAME_ID] ?? {};
```

---

## 4. Dispatch actions

```js
// Outside a component
api.store.dispatch(setMyValue('new-value'));

// Inside a React component
const { useDispatch } = require('react-redux');
const dispatch = useDispatch();
dispatch(setMyValue('new-value'));
```

---

## 5. Register a Settings page

```js
context.registerSettings(
  'Mods',              // tab label — use an existing tab ('Mods', 'Interface', etc.)
                       // or a new string to create a new tab
  MySettingsComponent, // React function/class component
  () => ({             // props callback — called each render, return props object
    onDoSomething: () => doSomething(context.api),
  }),
  () => selectors.activeGameId(context.api.getState()) === GAME_ID, // visibility (optional)
  150,                 // priority — lower = higher in the tab list (optional)
);
```

- The `visible` callback hides the section when the wrong game is active —
  always set this for game-specific settings.
- The `props` callback is **not** the place to read state; do that inside the
  component with `useSelector`.

---

## 6. Settings component (plain JS, no JSX)

Full example — toggle stored in `state.settings[GAME_ID].myToggle`:

```js
function MySettingsComponent({ onDoSomething }) {
  const React = require('react');
  const { Toggle, More, util } = require('vortex-api');
  const { useSelector, useStore } = require('react-redux');

  const myToggle = useSelector(state =>
    util.getSafe(state, ['settings', GAME_ID, 'myToggle'], false));
  const store = useStore();

  const onToggle = React.useCallback((checked) => {
    store.dispatch(setMyToggle(checked));
  }, [store]);

  return React.createElement('form', null,
    React.createElement('div', { className: 'settings-group' },
      React.createElement(Toggle, {
        checked: myToggle,
        onToggle: onToggle,
      },
        'My Setting Label',
        React.createElement(More, { id: 'my-setting-more', name: 'My Setting' },
          'Description of what this setting does.',
        ),
      ),
    ),
  );
}
```

### Component notes

- `require` calls inside the function body are fine — modules are cached.
- `useSelector` re-renders the component when that slice of state changes.
- `useStore().dispatch` vs `useDispatch()` — both work; prefer `useDispatch`.
- Use `Panel` / `Panel.Body` from `react-bootstrap` to group related controls.
- The component receives the props returned by the props callback as-is — no
  Redux `connect` wiring needed when using hooks.

---

## 7. registerSettingsHive (custom top-level hives)

Only needed when adding a **new** top-level key to the state tree that is not
one of the core hives (`settings`, `persistent`, `session`, `window`, etc.).

```js
// PersistingType: 'global' | 'game' | 'profile'
context.registerSettingsHive('global', 'myCustomHive');
context.registerReducer(['myCustomHive', GAME_ID], spec);
```

- `'global'` — persists always; loaded at startup.
- `'game'`   — persisted per game; swapped when game mode changes.
- `'profile'` — persisted per profile; swapped on profile change.

For game-extension state, `'global'` with a GAME_ID segment in the path is
the most common choice and avoids swap-related edge cases.

**Do not** register a hive that core Vortex already manages — that causes
data inconsistency.

---

## 8. verifiers (optional state hardening)

```js
context.registerReducer(['settings', GAME_ID], {
  reducers: { ... },
  defaults: { myKey: 'default' },
  verifiers: {
    myKey: {
      type: 'string',
      noNull: true,
      noUndefined: true,
    },
  },
});
```

Vortex runs verifiers at load time and sanitizes bad values back to defaults.
Useful if a prior extension version stored state in the wrong shape.

---

## Real-world examples

### subnautica2 — persistent UE4SS load order

```js
// Action
const SET_UE4SS_LOAD_ORDER = `SET_${GAME_ID.toUpperCase()}_UE4SS_LOAD_ORDER`;
function setUe4ssLoadOrder(loadOrder) { return { type: SET_UE4SS_LOAD_ORDER, payload: loadOrder }; }
setUe4ssLoadOrder.toString = () => SET_UE4SS_LOAD_ORDER;

// Reducer registration (in main())
context.registerReducer(['persistent', 'ue4ssLoadOrder', GAME_ID], {
  reducers: {
    [setUe4ssLoadOrder.toString()]: (state, payload) => ({ ...state, loadOrder: payload }),
  },
  defaults: { loadOrder: [] },
});

// Read in component
const loadOrder = useSelector(state =>
  util.getSafe(state, ['persistent', 'ue4ssLoadOrder', GAME_ID, 'loadOrder'], []));

// Dispatch
dispatch(setUe4ssLoadOrder(newLO));
```

### snippets.js — game-level settings with redux-act

```js
const { createAction } = require('redux-act');
const setUDF = createAction('7DTD_SET_UDF', (udf) => ({ udf }));

context.registerReducer(['settings', GAME_ID], {
  reducers: {
    [setUDF]: (state, payload) => util.setSafe(state, ['udf'], payload.udf),
  },
  defaults: {},
});

context.registerSettings('Mods', Settings, () => ({
  onSelectUDF: () => selectUDF(context).catch(() => null),
}), () => selectors.activeGameId(context.api.getState()) === GAME_ID);

// Read in setup()
const udf = util.getSafe(api.getState(), ['settings', GAME_ID, 'udf'], undefined);
```
