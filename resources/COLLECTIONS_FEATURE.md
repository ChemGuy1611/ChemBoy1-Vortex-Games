# Collections Feature API

How a game extension contributes custom data to a Vortex collection
(export/generate when publishing, parse/apply when installing). There are two
distinct mechanisms — pick the right one:

- **A. `context.optional.registerCollectionFeature(...)`** — a named feature
  layered onto the collection manifest, provided by the collections extension as
  a *soft* API. This is what file-based load order (FBLO) uses internally, and
  what custom sidecar load orders (UE4SS, LogicMods) use.
- **C. `context.registerGameSpecificCollectionsData(...)`** — the older,
  wholesale per-game collection data hook, a core context method (used by
  witcher3, morrowind, kingdomcome-deliverance).

(B below is not a third API — it's FBLO's automatic use of A.)

## Source paths

- `registerCollectionFeature`: `Vortex/extensions/collections/src/index.ts` (grep `registerCollectionFeature`)
- `IExtendedInterfaceProps`: `Vortex/extensions/collections/src/types/IExtendedInterfaceProps.ts`
- `registerGameSpecificCollectionsData` signature: `Vortex/src/renderer/src/types/IExtensionContext.ts` (grep)
- `ICollectionsGameSupportEntry`, `ICollection`, `IGameSpecificInterfaceProps`: `Vortex/src/renderer/src/extensions/file_based_loadorder/types/collections.ts`
- FBLO auto-registration: `Vortex/src/renderer/src/extensions/file_based_loadorder/index.ts` (grep `registerCollectionFeature`)

---

## A. registerCollectionFeature (soft, via context.optional)

Provided by the collections extension. Because it is not part of core, call it
through `context.optional` — if collections isn't installed the call silently
no-ops.

```js
context.optional.registerCollectionFeature(
  id: string,
  generate: (gameId: string, includedMods: string[]) => Promise<any>,
  parse:    (gameId: string, collection: ICollection) => Promise<void>,
  clone:    (gameId: string, collection: ICollection, from: IMod, to: IMod) => Promise<void>,
  title:    (t: TFunction) => string,
  condition?:    (state: IState, gameId: string) => boolean,
  editComponent?: React.ComponentType<IExtendedInterfaceProps>,
);
```

- `generate` runs when a collection is published/exported. Its return is merged
  **flat** into the collection manifest with `Object.assign`. **The data keys
  must not collide with another feature's keys** — in particular FBLO owns the
  `loadOrder` key, so a custom feature must use a distinct key
  (e.g. `ue4ssLoadOrder`, `logicModsLoadOrder`).
- `parse` runs when a collection is installed — read your key off `collection`
  and apply it.
- `clone` runs when a collection mod is duplicated.
- `title(t)` is the feature label in the UI.
- `condition(state, gameId)` gates whether the feature applies.
- `editComponent` props = `IExtendedInterfaceProps`:
  `{ t, gameId, collection, revisionInfo, onSetCollectionAttribute(attrPath[], value) }`.
  Note there is **no `api`** — inject it via closure or read the store with
  `useSelector`.

`ICollection` (what `parse`/`clone` receive):

```ts
interface ICollection {
  info: ICollectionInfo;
  mods: ICollectionMod[];
  modRules: ICollectionModRule[];
  loadOrder: LoadOrder;        // FBLO's own key
  // ...plus any feature keys merged in by generate()
}
```

---

## B. FBLO auto-registration (free, opt-out)

`file_based_loadorder/index.ts` calls
`context.optional.registerCollectionFeature("file_based_load_order_collection_data", ...)`
once, covering **every** game that calls `registerLoadOrder`. So PAK/file-based
load order is included in collections with zero extension code.

- Opt out per game with `noCollectionGeneration: true` in the `registerLoadOrder`
  call (use when the default generation logic is wrong for your game).
- Custom sidecar load orders (UE4SS, LogicMods) live in their own reducers and
  are **not** covered by this auto-registration — register them explicitly via A.

---

## C. registerGameSpecificCollectionsData (core, per-game)

```js
context.registerGameSpecificCollectionsData(data: ICollectionsGameSupportEntry): void
```

```ts
interface ICollectionsGameSupportEntry {
  gameId: string;
  generator: (state: IState, gameId: string, stagingPath: string,
              modIds: string[], mods: { [modId: string]: IMod }) => Promise<any>;
  parser:    (api: IExtensionApi, gameId: string, collection: ICollection) => Promise<void>;
  interface: (props: IGameSpecificInterfaceProps) => JSX.Element;
}

interface IGameSpecificInterfaceProps {
  t: TFunction;
  collection: IMod;
  revisionInfo: IRevision;
}
```

Note the UI prop shape differs from A's `editComponent`: `interface` gets only
`{ t, collection, revisionInfo }` — no `gameId`, no `onSetCollectionAttribute`.

### A vs C — which to use

| Need | Use |
| ------ | ----- |
| A named feature layered on top of FBLO (extra LO, toggles) | A `registerCollectionFeature` (via `context.optional`) |
| Wholesale game-specific collection data, one hook per game | C `registerGameSpecificCollectionsData` |
| PAK / file-based load order in collections | nothing — FBLO does it (B); opt out with `noCollectionGeneration` |

---

## Session lessons (verified, 2026-06-12 UE4SS/LogicMods export work)

- `parse` must **dispatch the reducer action AND write the per-profile sidecar
  JSON** to disk — not just dispatch. The `didDeploy` deserializer reads the
  on-disk JSON for first-install ordering, so a dispatch-only parse loses order
  on first deploy.
- Keep the exported entry shape **minimal** to avoid leaking machine-specific
  data across users: UE4SS used `{ id, enabled, locked }`, LogicMods used
  `{ id }`. Avoid exporting `name`/`modId` that differ per machine.
- Before choosing a feature `id` / data key, check existing game extensions —
  the flat `Object.assign` merge means a duplicate key silently clobbers.
