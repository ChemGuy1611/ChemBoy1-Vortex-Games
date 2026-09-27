# State Helpers (util)

Immutable state manipulation and Redux dispatch helpers from the `util` namespace. Used inside `registerReducer` specs and thunk action creators.

---

## Batch dispatch

```js
import { util, actions } from "vortex-api";

// Never dispatch in a loop — always batch
util.batchDispatch(api.store, [
    actions.setModAttribute(gameId, modId, "version", "1.0"),
    actions.setModAttribute(gameId, modId, "author", "foo"),
]);
```

---

## Safe deep read

`util.getSafe` is deprecated in Vortex — use native optional chaining and nullish coalescing instead:

```js
state?.persistent?.mods?.[gameId]?.[modId] ?? undefined;
```

`util.getSafeCI` (case-insensitive key lookup) has no `?.` equivalent and stays as-is; Vortex's own docs recommend `Object.keys(obj).find(...)` for new code instead:

```js
util.getSafeCI(state, ["persistent", "mods", gameId, modId], undefined);
```

---

## Immutable set / delete

The whole state-helper family below is deprecated in Vortex. `util.setSafe` is the only one with real usage in this repo — replaced by a hand-written spread, built recursively per path depth:

```js
// util.setSafe(state, ["a"], v)            -> depth 1
({ ...state, a: v });
// util.setSafe(state, [k, "b"], v)         -> depth 2
({ ...state, [k]: { ...state[k], b: v } });
```

Always wrap the replacement in outer parens when used as an arrow function's implicit-return body — `(state, payload) => { ...state, a: v }` is a syntax error (`{` opens a block).

The rest of the family has no call sites in this repo and is kept here for reference only. All functions return **new state**; never mutate in-place inside a reducer spec.

| Function                                     | Description                                    |
| -------------------------------------------- | ---------------------------------------------- |
| `util.setOrNop(state, path, value)`          | Set only if the path already exists            |
| `util.changeOrNop(state, path, value)`       | Set only if the value differs                  |
| `util.deleteOrNop(state, path)`              | Delete key at path                             |
| `util.merge(state, path, value)`             | Shallow-merge object at path                   |
| `util.deepMerge(lhs, rhs)`                   | Deep merge (no state path)                     |
| `util.mutateSafe(state, path, value)`        | Mutating variant — only valid outside reducers |
| `util.pushSafe(state, path, value)`          | Append to array at path                        |
| `util.addUniqueSafe(state, path, value)`     | Append only if not already present             |
| `util.removeValue(state, path, value)`       | Remove value from array at path                |
| `util.removeValueIf(state, path, predicate)` | Remove all elements matching predicate         |

---

## Misc

```js
util.setdefault(obj, key, defaultValue);
// Like Python dict.setdefault — assigns and returns defaultValue if key missing

util.rehydrate(state, inbound, path, replace, defaults);
// Merge persisted state on store hydration (used in registerReducer specs)

util.makeReactive(value);
// Wrap a value so property assignments trigger React re-renders
```

---

## Reducer spec pattern

```js
context.registerReducer(["persistent", "settings", gameId], {
    defaults: { configPath: "" },
    reducers: {
        [actions.setConfigPath]: (state, payload) => ({ ...state, configPath: payload }),
    },
});
```

---

## Notes

- `util.batchDispatch` is mandatory when dispatching multiple Redux actions — never loop and dispatch individually.
- `util.getSafe`/`util.setSafe` and the rest of this family are deprecated in Vortex — prefer `?.`/`??` for reads and a spread for writes, as shown above.
- `setOrNop` sets only if the path already exists (vs. a spread, which always creates intermediate keys).
- `mutateSafe` is for use outside reducers (e.g., in event handlers operating on plain objects). Never use it inside a reducer spec.
- `removeValue` uses reference equality; use `removeValueIf` with a predicate for structural equality.

---

## See also

`SETTINGS_REDUCER.md` (optional chaining / spread as used inside reducer specs and component readers).
`REGISTER_MIGRATION.md` (optional chaining / spread for reading/patching state inside a migration).
`LOAD_ORDER_REGISTRATION.md`, `LOAD_ORDER_ITEM_RENDERER.md`, `VORTEX_REACT_PAGES.md` (same pattern in load-order and React-page state reads). `DEPRECATED_METHODS.md` (index of every deprecated symbol across the published API, this family included).
