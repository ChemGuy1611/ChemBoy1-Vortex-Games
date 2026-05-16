# State Helpers (util)

Immutable state manipulation and Redux dispatch helpers from the `util` namespace. Used inside `registerReducer` specs and thunk action creators.

---

## Batch dispatch

```js
import { util, actions } from 'vortex-api';

// Never dispatch in a loop — always batch
util.batchDispatch(api.store, [
  actions.setModAttribute(gameId, modId, 'version', '1.0'),
  actions.setModAttribute(gameId, modId, 'author', 'foo'),
]);
```

---

## Safe deep read

```js
util.getSafe(state, ['persistent', 'mods', gameId, modId], undefined)
// case-insensitive key lookup:
util.getSafeCI(state, ['persistent', 'mods', gameId, modId], undefined)
```

`path` elements may be `undefined` without throwing.

---

## Immutable set / delete

All functions return **new state**; never mutate in-place inside a reducer spec.

| Function | Description |
| --- | --- |
| `util.setSafe(state, path, value)` | Deep set — creates intermediate keys |
| `util.setOrNop(state, path, value)` | Set only if the path already exists |
| `util.changeOrNop(state, path, value)` | Set only if the value differs |
| `util.deleteOrNop(state, path)` | Delete key at path |
| `util.merge(state, path, value)` | Shallow-merge object at path |
| `util.deepMerge(lhs, rhs)` | Deep merge (no state path) |
| `util.mutateSafe(state, path, value)` | Mutating variant — only valid outside reducers |
| `util.pushSafe(state, path, value)` | Append to array at path |
| `util.addUniqueSafe(state, path, value)` | Append only if not already present |
| `util.removeValue(state, path, value)` | Remove value from array at path |
| `util.removeValueIf(state, path, predicate)` | Remove all elements matching predicate |

---

## Misc

```js
util.setdefault(obj, key, defaultValue)
// Like Python dict.setdefault — assigns and returns defaultValue if key missing

util.rehydrate(state, inbound, path, replace, defaults)
// Merge persisted state on store hydration (used in registerReducer specs)

util.makeReactive(value)
// Wrap a value so property assignments trigger React re-renders
```

---

## Reducer spec pattern

```js
context.registerReducer(['persistent', 'settings', gameId], {
  defaults: { configPath: '' },
  reducers: {
    [actions.setConfigPath]: (state, payload) =>
      util.setSafe(state, ['configPath'], payload),
  },
});
```

---

## Notes

- `util.batchDispatch` is mandatory when dispatching multiple Redux actions — never loop and dispatch individually.
- `setSafe` creates intermediate keys if missing; `setOrNop` does not — use `setOrNop` when you want to guard against creating unexpected paths.
- `mutateSafe` is for use outside reducers (e.g., in event handlers operating on plain objects). Never use it inside a reducer spec.
- `removeValue` uses reference equality; use `removeValueIf` with a predicate for structural equality.
