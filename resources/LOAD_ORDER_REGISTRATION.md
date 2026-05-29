# Load Order Registration — Legacy vs. FBLO Reference

**Source files cited throughout:**

- `Vortex\src\renderer\src\types\IExtensionContext.ts` (both API signatures)
- `Vortex\src\renderer\src\extensions\mod_load_order\types\types.ts` (legacy types)
- `Vortex\src\renderer\src\extensions\mod_load_order\index.ts` (legacy registration)
- `Vortex\src\renderer\src\extensions\file_based_loadorder\types\types.ts` (FBLO types)
- `Vortex\src\renderer\src\extensions\file_based_loadorder\index.ts` (FBLO registration)
- `Vortex\src\renderer\src\extensions\file_based_loadorder\views\FileBasedLoadOrderPage.tsx` (FBLO UI)
- `template-ue4-5\index.js` (canonical ChemBoy1 FBLO usage)

---

## 0. At a glance — legacy vs. FBLO

| Aspect | Legacy `registerLoadOrderPage` | Modern `registerLoadOrder` (FBLO) |
| --- | --- | --- |
| Source extension | `mod_load_order` | `file_based_loadorder` |
| Status | Deprecated | Current — use for all new work |
| State shape | Dict `{ [profileId]: { [modId]: { pos, enabled, prefix } } }` | Array `{ [profileId]: IFBLoadOrderEntry[] }` |
| State path | `persistent.loadOrder[profileId][modId]` | `persistent.loadOrder[profileId]` (same root, different child) |
| Order encoding | `pos: number` field on each entry | Array index |
| Entry discovery | `filter(mods)` — Vortex queries installed mods and passes them in | `deserializeLoadOrder()` — extension owns what appears |
| Entry shape | `ILoadOrderDisplayItem` (`id`, `name`, `imgUrl`) | `IFBLoadOrderEntry` (`id`, `name`, `enabled`, `locked`, `modId`) |
| File I/O | Extension handles in `callback` or `did-deploy` hook | Extension provides `serializeLoadOrder` + `deserializeLoadOrder` |
| Lifecycle | `callback(loadOrder, updateType)` fires on every change | `serialize` / `deserialize` called at defined lifecycle points |
| Info panel | `createInfoPanel(props: { refresh })` — returns string or component | `usageInstructions` — string or component (no props) |
| Item renderer prop | `{ className, item: ILoadOrderDisplayItem, onRef }` | `{ className, item: { loEntry, displayCheckboxes, invalidEntries } }` |
| Validation | None | `validate(prev, current) => IValidationResult` |
| Enable/disable row | `displayCheckboxes` (default renderer) | `toggleableEntries` (default renderer) |
| Deployment trigger | Extension calls `setDeploymentNecessary` in `callback` | Extension calls `setDeploymentNecessary` in `serializeLoadOrder` or item renderer |
| Sort direction | `preSort(items, direction, updateType)` called before render | Not provided — extension orders in `deserializeLoadOrder` |
| Collections support | Via `noCollectionGeneration` | Via `noCollectionGeneration` |

---

## 1. What `registerLoadOrder` is (60-second overview)

`context.registerLoadOrder(gameInfo)` is Vortex's **File-Based Load Order** (FBLO) API.
Calling it does three things:

1. Registers a per-game load order handler (serialize / deserialize / validate functions).
2. Makes the shared **Load Order** sidebar page visible for that game, powered by those handlers.
3. Wires up automatic lifecycle events -- page mount, profile switch, deploy/purge, game exit -- to call your handlers at the right times.

The older `context.registerLoadOrderPage` (used with PAK-prefix renaming: `AAA_`, `AAB_`, ...) is **deprecated**. Use `registerLoadOrder` for all new development.

---

## 1a. Legacy `registerLoadOrderPage` — full reference

Kept here as a migration reference for Phase C / Phase D work. Do not use in new extensions.

### Source

`Vortex\src\renderer\src\extensions\mod_load_order\types\types.ts:130` — `IGameLoadOrderEntry`

### Registration signature

```js
context.registerLoadOrderPage({
  gameId: string,               // required — Nexus/Vortex game domain ID
  gameArtURL: string,           // required — path to game logo image
  createInfoPanel: (props) => string | React.ComponentType,  // required — info panel content
  preSort?: (items, direction, updateType) => Promise<ILoadOrderDisplayItem[]>,
  filter?: (mods: IMod[]) => IMod[],
  callback?: (loadOrder: ILoadOrder, updateType?: UpdateType) => void,
  displayCheckboxes?: boolean,  // default: true
  noCollectionGeneration?: boolean,
  itemRenderer?: React.ComponentType<{ className, item: ILoadOrderDisplayItem, onRef }>,
});
```

### `ILoadOrderDisplayItem` — what each entry looks like

```ts
{
  id: string;      // arbitrary unique id (usually modId or folder name)
  name: string;    // display name
  imgUrl: string;  // thumbnail URL — required by default renderer
  prefix?: string; // AAA/AAB sort prefix (set by preSort or loadOrderPrefix helper)
  data?: string;   // arbitrary extra data
  locked?: boolean;
  external?: boolean;
  official?: boolean;
  message?: string;   // optional message displayed beneath the mod image in the default renderer
  contextMenuActions?: IActionDefinitionEx[];   // per-item context menu entries (default renderer ignores this)
  condition?: (
    lhs: ILoadOrderDisplayItem,
    rhs: ILoadOrderDisplayItem,
    predictedResult: ILoadOrderDisplayItem[],
  ) => IDnDConditionResult;   // DnD restriction functor — return { success: false, errMessage } to block a drop
}
```

### `ILoadOrderEntry` — what Vortex stores in Redux

The item *displayed* (`ILoadOrderDisplayItem`) is different from what Vortex *persists* (`ILoadOrderEntry`):

```ts
{
  pos: number;      // sort position / priority index
  enabled: boolean;
  prefix?: string;
  data?: T;
  locked?: boolean;
  external?: boolean;
}
```

### Redux state shape (legacy)

```text
state.persistent.loadOrder[profileId][modId] = ILoadOrderEntry
```

So the full dict is: `{ [profileId]: { [modId]: { pos, enabled, prefix, ... } } }`

Updated by Vortex via `setLoadOrderEntry(profileId, modId, loEntry)` internally.

### How the lifecycle works (legacy)

1. User opens Load Order page.
2. Vortex reads `state.persistent.loadOrder[profileId]` to get current positions.
3. Vortex calls `filter(mods)` to get the set of mods to display.
4. Vortex calls `preSort(items, direction, updateType)` — extension maps mods to `ILoadOrderDisplayItem[]`, optionally sorts them.
5. Page renders the sorted list.
6. User drags a row — Vortex updates its internal state and calls `callback(loadOrder, 'drag-n-drop')`.
7. Extension's `callback` calls `setDeploymentNecessary` and optionally writes files.

Extension has **no** serialize/deserialize callbacks. File I/O must happen in `callback` or in a `did-deploy` / `will-purge` event handler registered separately.

### Common legacy pattern (ChemBoy1 games)

```js
// In main():
let previousLO;
context.registerLoadOrderPage({
  gameId: spec.game.id,
  gameArtURL: path.join(__dirname, spec.game.logo),
  preSort: (items, direction) => preSort(context.api, items, direction),
  filter: mods => mods.filter(mod => mod.type === UE5_SORTABLE_ID),
  displayCheckboxes: false,
  callback: (loadOrder) => {
    if (previousLO === undefined) previousLO = loadOrder;
    if (loadOrder === previousLO) return;
    context.api.store.dispatch(actions.setDeploymentNecessary(spec.game.id, true));
    previousLO = loadOrder;
  },
  createInfoPanel: () =>
    context.api.translate(`Drag and drop the mods on the left to change the order...`),
});
```

```js
// Typical preSort helper (maps Vortex mods to display items):
async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', GAME_ID], {});
  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    const name = modInfo?.attributes?.customFileName
      ?? modInfo?.attributes?.logicalFileName
      ?? modInfo?.attributes?.name
      ?? mod.name;
    return {
      id: mod.id,
      name,
      imgUrl: modInfo?.attributes?.pictureUrl ?? path.join(__dirname, spec.game.logo),
    };
  });
  return direction === 'descending' ? loadOrder.reverse() : loadOrder;
}
```

The `loadOrderPrefix` / `makePrefix` helpers (also in the extension file) are called at deploy time to rename staging folders: `AAA_modname`, `AAB_modname`, etc.

### What is NOT in the legacy system

- No `serializeLoadOrder` callback — extension must wire `did-deploy` / `will-purge` manually.
- No `deserializeLoadOrder` callback — order is driven by `persistent.loadOrder[profileId][modId].pos`.
- No built-in validation.
- No `usageInstructions` React component — `createInfoPanel` returns a string or component but does not receive live update props.
- No `customItemRenderer` (it's called `itemRenderer` with a different prop shape including `onRef`).

---

## 1b. Migrating from legacy to FBLO — considerations

This section is critical for Phase C and Phase D games that currently use `registerLoadOrderPage`.

### State path compatibility

Both systems write to `persistent.loadOrder[profileId]` — but in different shapes:

- **Legacy**: `persistent.loadOrder[profileId]` is a `{ [modId]: { pos, enabled, prefix } }` dict
- **FBLO**: `persistent.loadOrder[profileId]` is an `IFBLoadOrderEntry[]` array

When FBLO first dispatches `setFBLoadOrder(profileId, array)`, it **replaces** whatever was at that path (the old dict). This is safe — the old dict becomes irrelevant once `deserializeLoadOrder` has run.

### Natural migration via folder prefixes

For UE PAK games, the load order is encoded in deployed folder names (`AAA_`, `AAB_`, `AAC_`...). The `deserializeLoadOrder` implementation in `template-ue4-5` reads those prefixes from the staging folder, so it **reconstructs the correct order from the filesystem** even without explicit state migration. This is the primary migration mechanism — no `registerMigration` is strictly necessary for users who have deployed at least once.

```text
Before migration (legacy, deployed):
  staging/
    AAA_ModA/     <- pos 0
    AAB_ModB/     <- pos 1
    AAC_ModC/     <- pos 2

After migration (FBLO, first deserialize):
  deserializeLoadOrder() reads prefix from each folder
  returns [{ id:'ModA', pos:0 }, { id:'ModB', pos:1 }, { id:'ModC', pos:2 }]
  -> order is recovered automatically
```

**Edge case**: users who have never deployed (or have purged) have no prefixes on disk. Their LO will start fresh in an arbitrary order on first FBLO run. This is acceptable for most games — add a note in the CHANGELOG if this is a concern.

### When to add `registerMigration`

Add it when:

- The CHANGELOG version bump is MINOR (which it always is for this migration) — tell users to deploy.
- The old extension had custom state the FBLO system doesn't handle (unusual).
- You need to explicitly clean up stale state from the old system.

Minimum useful migration — user notification + mark deployment necessary:

```js
const semver = require('semver');

async function migrateLegacyToFBLO(api, oldVersion) {
  if (semver.gte(oldVersion, TARGET_VERSION)) return;
  // State reads are safe before awaitUI; dispatches that update session state are too.
  const state = api.store.getState();
  const gamePath = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'path'], undefined);
  if (!gamePath) return; // game not discovered, nothing to migrate
  api.store.dispatch(actions.setDeploymentNecessary(GAME_ID, true));
  await api.awaitUI(); // required before showDialog / sendNotification
  api.sendNotification({
    id: `${GAME_ID}-lo-migration`,
    type: 'info',
    title: 'Load Order upgraded',
    message: 'Deploy your mods once to confirm load order is preserved in the new format.',
    actions: [{ title: 'Deploy', action: (dismiss) => { deploy(api); dismiss(); } }],
  });
}

// In main():
context.registerMigration(old => migrateLegacyToFBLO(context.api, old));
```

Replace `TARGET_VERSION` with the MINOR version being introduced (e.g. `'0.4.0'`).

### `deserializeLoadOrder` merge pattern

A robust FBLO `deserializeLoadOrder` for PAK games must **merge** three sources:

1. **On-disk order** — read from the FBLO sidecar JSON (if it exists) or from deployed folder prefix names
2. **Currently installed mods** — from `state.persistent.mods[GAME_ID]` filtered to the right mod type
3. **New mods** — any installed mod not present in the on-disk order; append at the end

This merge ensures that:

- Existing order is preserved across deploys
- Newly installed mods appear in the list (appended, not silently dropped)
- Uninstalled mods are removed from the returned array (no ghost entries)

The template's `deserializeLoadOrder` does this by:

1. Reading the staging folder to find all installed mods of type `UE5_SORTABLE_ID`
2. Sorting them by current folder prefix if present
3. Returning `IFBLoadOrderEntry[]` sorted by prefix, with new mods appended

When migrating from legacy (no sidecar JSON exists yet), step 2 is what recovers the old order.

### Item renderer prop shape change

The legacy `itemRenderer` received `{ className, item: ILoadOrderDisplayItem, onRef }` where `item.id` is the modId and `item.imgUrl` must be set by `preSort`. The FBLO `customItemRenderer` receives `{ className, item: { loEntry: IFBLoadOrderEntry, displayCheckboxes, invalidEntries } }` — `loEntry.modId` is the Vortex internal mod ID, and `loEntry.id` is the unique display key. If you have a custom `itemRenderer` in a legacy game, it must be rewritten for the FBLO prop shape.

### Summary of what changes per game

| Legacy code | FBLO replacement |
| --- | --- |
| `registerLoadOrderPage({ ... })` | `registerLoadOrder({ ... })` |
| `preSort(items, direction)` | Logic moves into `deserializeLoadOrder` (initial ordering from prefixes/JSON) |
| `filter(mods)` | Filtering moves into `deserializeLoadOrder` (return only mods of the right type) |
| `callback(loadOrder)` + `setDeploymentNecessary` | `serializeLoadOrder` writes files; `requestDeployment` / `setDeploymentNecessary` called from item renderer or serializer |
| `createInfoPanel(props)` | `usageInstructions` (no props — remove any usage of `props.refresh`) |
| `itemRenderer` (optional) | `customItemRenderer` (different prop shape) |
| `displayCheckboxes: false` | `toggleableEntries: false` |
| No migration | `registerMigration` gated to the new MINOR version |

---

## 2. The `ILoadOrderGameInfo` contract

```text
IExtensionContext.ts:1463   registerLoadOrder(gameInfo: ILoadOrderGameInfo): void
types.ts:81                 interface ILoadOrderGameInfo { ... }
```

### Required fields

| Field | Type | Purpose |
| --- | --- | --- |
| `gameId` | `string` | Nexus/Vortex game domain ID |
| `serializeLoadOrder` | `(lo, prev) => Promise<void>` | Write the current LO to disk |
| `deserializeLoadOrder` | `() => Promise<LoadOrder>` | Read LO from disk, return sorted array |
| `validate` | `(prev, current) => Promise<IValidationResult>` | Check for invalid entries |

### Optional fields

| Field | Default | Purpose |
| --- | --- | --- |
| `toggleableEntries` | `true` | Show enable/disable checkbox per row |
| `clearStateOnPurge` | `true` | Wipe Redux state when mods are purged |
| `usageInstructions` | Vortex default | String or `React.ComponentType` shown in the info panel -- always rendered on the **right side** of the list in a `FlexLayout type="row"`; position is hardcoded and not configurable via this API |
| `customItemRenderer` | Vortex default | `React.ComponentType` for each row in the list |
| `noCollectionGeneration` | `false` | Opt out of automatic Vortex Collections integration |
| `condition` | `undefined` | `() => boolean` -- hide the LO page when returns `false` |

### `ILoadOrderEntry` shape (types.ts:35-60)

```js
{
  id: string,       // unique key -- usually mod folder name or filename
  enabled: boolean, // controls per-entry on/off checkbox
  name: string,     // display name shown in the list
  locked?: LockedState,  // 'locked'|'always-locked'|undefined -- prevents drag
  modId?: string,   // Vortex internal mod id -- REQUIRED for Collections to work
  data?: any,       // arbitrary extra data passed through serialize/deserialize
}
```

### `IValidationResult` shape (types.ts:71-78)

```js
{
  invalid: [
    { id: string, reason: string },  // one per bad entry
  ]
}
// Return undefined (not null) to signal "all valid"
```

---

## 3. Real-world registration examples

### template-ue4-5 (ChemBoy1 FBLO pattern)

`template-ue4-5\index.js:2573-2581`:

```js
context.registerLoadOrder({
  gameId: spec.game.id,
  validate: async () => Promise.resolve(undefined), // no validation implemented
  deserializeLoadOrder: async () => await deserializeLoadOrder(context),
  serializeLoadOrder: async (loadOrder) => await serializeLoadOrder(context, loadOrder),
  toggleableEntries: false,
  usageInstructions: LoadOrderInstructions,
  customItemRenderer: LoadOrderItemRenderer,
});
```

### Baldur's Gate 3 (Vortex built-in)

`Vortex\extensions\games\game-baldursgate3\src\index.tsx:365-381`:

```ts
context.registerLoadOrder({
  clearStateOnPurge: false,
  gameId: GAME_ID,
  deserializeLoadOrder: () => deserialize(context),
  serializeLoadOrder: (loadOrder, prev) => serialize(context, loadOrder),
  validate,
  toggleableEntries: false,
  usageInstructions: (() => <InfoPanelWrap api={context.api} />) as any,
});
```

---

## 4. The internal FBLO page Vortex draws

`file_based_loadorder\index.ts:305` registers the shared Load Order main page:

```ts
context.registerMainPage('sort-none', 'Load order', FileBasedLoadOrderPage, {
  priority: 30,
  id: 'file-based-loadorder',
  hotkey: 'E',
  group: 'per-game',
  visible: () => {
    const gameEntry = findGameEntry(currentGameId);
    return gameEntry?.condition !== undefined ? gameEntry.condition() : gameEntry !== undefined;
  },
  props: () => ({ getGameEntry, onSortByDeployOrder, onImportList, ... }),
});
```

### Component tree (FileBasedLoadOrderPage.tsx:289-314)

```jsx
<MainPage>
  <MainPage.Header>
    <IconBar group="fb-load-order-icons" />   // toolbar buttons
  </MainPage.Header>
  <MainPage.Body>
    <Panel>
      <FilterBox />                            // search/filter input
      <DNDContainer>                           // drag-and-drop wrapper (required)
        <FlexLayout type="row">
          <FlexLayout.Flex>
            <DraggableList
              items={filteredEntries}          // IItemRendererProps[]
              itemRenderer={customItemRenderer ?? ItemRenderer}
              apply={this.onApply}             // called with reordered array
              idFunc={entry => entry.loEntry.id}
              isLocked={...}
            />
          </FlexLayout.Flex>
          <FlexLayout.Flex>
            <InfoPanel info={gameEntry.usageInstructions} />
          </FlexLayout.Flex>
        </FlexLayout>
      </DNDContainer>
    </Panel>
  </MainPage.Body>
</MainPage>
```

> **`usageInstructions` position is hardcoded right.** `FileBasedLoadOrderPage.tsx:304-309` uses `FlexLayout type="row"` with the list left and `InfoPanel` right. There is no API option to move it to the bottom. To get bottom-positioned instructions you must replace `registerLoadOrder` with a fully custom `registerMainPage` (column `FlexLayout`, list as `FlexLayout.Flex` + info panel as `div { flexShrink: 0 }`) -- the same approach as `Ue4ssLoadOrderPage`. That means re-implementing filter, DnD, validate, and serialize wiring yourself; not worth it for instruction placement alone.

### What `customItemRenderer` receives

Each row's renderer gets props `{ className?: string, item: IItemRendererProps }` where:

```ts
// IItemRendererProps — the `item` field passed to customItemRenderer
IItemRendererProps = {
  loEntry: ILoadOrderEntry,
  displayCheckboxes: boolean,        // = toggleableEntries
  invalidEntries?: IInvalidResult[], // from last validation run
  setRef?: (ref: any) => void,       // forward to root element for react-dnd compat
}

// The full props shape received by customItemRenderer:
{ className?: string, item: IItemRendererProps, forwardedRef?: (ref: any) => void }
```

The renderer also has full access to the Vortex Redux store via `useSelector()`.

---

## 5. Redux state & actions

### State path

```text
state.persistent.loadOrder[profileId] = ILoadOrderEntry[]
```

Key point: keyed by **profile id**, not game id. Each profile has its own
independent load order for the same game.

Reducers are registered at:

- `["persistent", "loadOrder"]` -- the LO array (`file_based_loadorder\index.ts:290`)
- `["session", "fblo"]` -- validation results, force-update flag (`index.ts:291`)

### Actions (`file_based_loadorder\actions\loadOrder.ts`)

| Action | Use case |
| --- | --- |
| `setFBLoadOrder(profileId, loadOrder)` | Replace entire LO array |
| `setFBLoadOrderEntry(profileId, loEntry)` | Update a single entry |
| `setFBForceUpdate(profileId)` | Trigger a re-render without data change |
| `setValidationResult(profileId, result)` | Write validation errors to session state |

Import from `vortex-api`:

```js
const { actions } = require('vortex-api');
// setFBLoadOrder is re-exported as actions.setFBLoadOrder
```

---

## 6. Lifecycle trigger map

| Trigger | What fires | Handler called |
| --- | --- | --- |
| Load Order page mounts | `componentDidMount` -> `onStartUp` prop | `deserializeLoadOrder` + `validate` |
| User drags/drops or toggles a row | Redux state change on `persistent.loadOrder` | `serializeLoadOrder` -> `validate` |
| Profile switch | Redux state change on `persistent.profiles` | `deserializeLoadOrder` |
| Game or tool exits | Redux state change on `session.base.toolsRunning` | `deserializeLoadOrder` |
| `did-deploy` event | `api.onAsync('did-deploy', ...)` | `deserializeLoadOrder` (UpdateSet rebuild) |
| `will-purge` event | `api.onAsync('will-purge', ...)` | `deserializeLoadOrder` |
| `did-purge` event | `api.onAsync('did-purge', ...)` | `deserializeLoadOrder` |

Serialize is **never** called directly by events -- it is only called after a user-driven
LO state change (`onStateChange persistent.loadOrder`). Deploy/purge events only call
deserialize, not serialize.

---

## 7. `ue4ss_loadOrder.json` -- how it fits in the UE4-5 template

### Key constants (`template-ue4-5\index.js:237-252`)

```js
const UE4SS_MODSTXT_FILE  = 'mods.txt';
const UE4SS_LO_FILE       = 'ue4ss_loadOrder.json';
const LO_ATTRIBUTE_UE4SS  = 'ue4ssModFolder'; // installer sets this on each mod
const UE4SS_CONFIG_FILES  = ['config.txt', 'settings.json', 'config.lua']; // triggers Configure button
const UE4SS_NATIVE_MODS   = [
  'BPML_GenericFunctions', 'BPModLoaderMod', 'CheatManagerEnablerMod',
  'ConsoleCommandsMod', 'ConsoleEnablerMod', 'Keybinds',
  'LineTraceMod', 'shared', 'SplitScreenMod'
];
```

### File path

```text
<GamePath>/<EPIC_CODE_NAME>/Binaries/<Win64|WinGDK>/ue4ss/Mods/<profileId>_ue4ss_loadOrder.json
```

Same directory as `mods.txt`.

### JSON shape

```json
[
  { "id": "MyScriptMod",  "name": "My Mod (MyScriptMod)",  "modId": "abc123", "enabled": true },
  { "id": "AnotherMod",   "name": "Manual Mod (AnotherMod)", "modId": null,   "enabled": false, "locked": true }
]
```

### Relationship to FBLO

**Important:** in the current template, the FBLO page (`context.registerLoadOrder`) and
the UE4SS sidecar are **two separate systems**:

- FBLO uses `<profile>_loadOrder.json` for **PAK-style** mods (sortable via prefix renaming).
- `ue4ss_loadOrder.json` is used by the `Ue4ssLoadOrderPage` custom React page and

  written to disk by `serializeUe4ss`, which also rewrites `mods.txt` directly.

- Setting `ue4ssLoadOrder = false` disables the UE4SS sidecar entirely --

  the FBLO page still works for PAK mods.

`mods.txt` line format: `ModFolderName : 1` (enabled) or `ModFolderName : 0` (disabled).
`serializeUe4ss` writes user-managed mods between the `BPModLoaderMod` and `Keybinds`
anchor lines.

---

## 8. Custom React page for UE4SS mods -- implementation

**Reference implementation: `template-ue4-5/index.js`, `game-subnautica2/index.js`.**

The page is **additive** -- registered alongside the existing FBLO page, never replacing it.
FBLO manages PAK mod load order (prefix renaming). The custom page manages only UE4SS
script mods via the `<profile>_ue4ss_loadOrder.json` sidecar + `mods.txt`.

### Key Vortex UI primitives

```js
// top-level import in index.js
const { actions, fs, util, selectors, log,
        MainPage, FlexLayout, DNDContainer, DraggableList, Spinner } = require('vortex-api');
// inline-required inside component functions:
// Icon, LoadOrderIndexInput, MainContext, Toggle, More  <- from 'vortex-api'
// Checkbox, FormControl  <- from 'react-bootstrap'
// useSelector, useDispatch  <- from 'react-redux'
```

**Critical:** always wrap drag-and-drop lists in `DNDContainer`. Vortex bundles `react-dnd`
internally; do NOT import it from npm.

### Action creators (no safeCreateAction -- not exported from vortex-api)

```js
// UE4SS load order state (per-profile, persistent)
const SET_UE4SS_LOAD_ORDER = `SET_${GAME_ID.toUpperCase()}_UE4SS_LOAD_ORDER`;
function setUe4ssLoadOrder(profileId, lo) { return { type: SET_UE4SS_LOAD_ORDER, payload: { profileId, loadOrder: lo } }; }
setUe4ssLoadOrder.toString = () => SET_UE4SS_LOAD_ORDER;

// UE4SS LO enabled toggle (settings)
const SET_UE4SS_LO_ENABLED = `SET_${GAME_ID.toUpperCase()}_UE4SS_LO_ENABLED`;
function setUe4ssLoEnabled(value) { return { type: SET_UE4SS_LO_ENABLED, payload: value }; }
setUe4ssLoEnabled.toString = () => SET_UE4SS_LO_ENABLED;
```

### Registration gating in main()

All four UE4SS registrations live inside a single `if (ue4ssLoadOrder)` block in `main()`:

```js
function main(context) {
  applyGame(context, spec);
  if (UNREALDATA.loadOrder === true) {
    if (FBLO) { context.registerLoadOrder({...}); }   // PAK FBLO only
  }
  if (ue4ssLoadOrder) {
    // 1. Settings reducer (ue4ssLoEnabled toggle)
    context.registerReducer(['settings', GAME_ID], {
      reducers: {
        [setUe4ssLoEnabled.toString()]: (state, payload) => util.setSafe(state, ['ue4ssLoEnabled'], payload),
      },
      defaults: { ue4ssLoEnabled: true },
    });
    // 2. Settings page entry (Toggle + More)
    context.registerSettings('Mods', GameSettings, () => ({}),
      () => selectors.activeGameId(context.api.getState()) === GAME_ID, 150
    );
    // 3. Persistent LO reducer
    context.registerReducer(['persistent', 'ue4ssLoadOrder'], {
      reducers: {
        [setUe4ssLoadOrder.toString()]: (state, payload) => util.setSafe(state, [payload.profileId, 'loadOrder'], payload.loadOrder),
      },
      defaults: {},
    });
    // 4. Main page
    context.registerMainPage('unreal', 'UE4SS Load Order', Ue4ssLoadOrderPage, {
      id: `${GAME_ID}-ue4ss-loadorder`,
      priority: 31,
      group: 'per-game',
      hotkey: 'U',
      mdi: 'M12 0c-6.5745 0-11.899 5.371-11.899 12s...', // UE4SS SVG icon path
      visible: () => {
        const state = context.api.store.getState();
        const gameId = selectors.activeGameId(state);
        return gameId === GAME_ID && ue4ssLoadOrder; // ue4ssLoadOrder is the toggle constant
      },
      props: () => ({ api: context.api }),
    });
  }
}
```

**`visible` must NOT check `isUe4ssInstalled()`** -- when gated that way, the page
requires a full Vortex restart to appear after UE4SS auto-downloads in the same session
(mod-state check doesn't re-evaluate). The `ue4ssLoadOrder` constant is always `true`
when this block runs, so `visible` simplifies to `gameId === GAME_ID`.

Reducer path `['persistent', 'ue4ssLoadOrder']` -- state shape
`{ [profileId]: { loadOrder: [] } }` -- persisted per-profile, not per-game.

### GameSettings component

`GameSettings` renders a `Toggle` + `More` help text in the Vortex Settings > Mods tab.
Toggling off calls `reconcileEnabledTxt(api, true)` to write `enabled.txt` files;
toggling on calls `reconcileEnabledTxt(api, false)` to delete them.

```js
function GameSettings() {
  const { Toggle, More, MainContext } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');
  const dispatch = useDispatch();
  const { api } = React.useContext(MainContext);
  const ue4ssLoEnabled = useSelector(state =>
    util.getSafe(state, ['settings', GAME_ID, 'ue4ssLoEnabled'], true));
  const onToggle = React.useCallback((checked) => {
    dispatch(setUe4ssLoEnabled(checked));
    reconcileEnabledTxt(api, !checked)
      .catch(err => log('warn', `UE4SS LO reconcile failed: ${err.message}`));
  }, [api, dispatch]);
  return React.createElement('form', null,
    React.createElement('div', { className: 'settings-group' },
      React.createElement(Toggle, { checked: ue4ssLoEnabled, onToggle },
        'UE4SS Load Order',
        React.createElement(More, { id: `${GAME_ID}-ue4ss-lo-more`, name: 'UE4SS Load Order' },
          'Enable the UE4SS mod load order page and mods.txt management. '
          + `Disabling will have the extension write ${ENABLEDTXT_FILE} files with no Load Order control.`,
        ),
      ),
    ),
  );
}
```

### reconcileEnabledTxt

When the UE4SS LO toggle changes, `reconcileEnabledTxt(api, write)` walks the staging
folder and writes or deletes `enabled.txt` files in every UE4SS mod folder:

- Walks `stagingPath` with `util.walk`
- Identifies mod folders: any parent of a `scripts` or `dlls` sub-folder (excluding native mods)
- `write = true`: writes empty `enabled.txt` if not present (LO disabled -- mods need marker file)
- `write = false`: deletes `enabled.txt` if present (LO enabled -- marker no longer needed)
- Sends a success notification with count of touched folders

### Installer API pattern

`installScripts` and `installDll` are `async` and receive `api` as their **first**
parameter, injected via a closure at `registerInstaller`:

```js
context.registerInstaller(SCRIPTS_ID, 35, testScripts, (files, fileName) => installScripts(context.api, files, fileName));
```

When LO is enabled (`ue4ssLoadOrder && ue4ssLoEnabled`): filter any bundled `enabled.txt`
out of `files` before building instructions. When disabled: `await fs.writeFileAsync(...)`
to create `enabled.txt` (async -- no `writeFileSync`).

### Cross-game guard pattern

Both `serializeUe4ss` and `deserializeUe4ss` must guard against being called while a
different game is active. Vortex keeps all pages mounted; the `useEffect([profileId])`
fires on game switch and would call into the wrong game's UE4SS folder without guards.

```js
async function deserializeUe4ss(api) {
  // read-only; do NOT use ensureFileAsync -- that creates empty files on wrong-game calls
  let LO_MOD_ARRAY = [];
  try {
    const raw = await fs.readFileAsync(loadOrderPath, { encoding: 'utf8' });
    if (raw.length > 0) LO_MOD_ARRAY = JSON.parse(util.deBOM(raw));
  } catch { /* file doesn't exist yet; start empty */ }
```

```js
async function serializeUe4ss(api, loadOrder) {
  const state = api.getState();
  if (selectors.activeGameId(state) !== GAME_ID) return; // guard: wrong game active
  // ...
}
```

```js
// Ue4ssLoadOrderPage useEffect:
React.useEffect(() => {
  if (!profileId) return;
  if (selectors.activeGameId(api.getState()) !== GAME_ID) return; // guard: page mounted after game switch
  deserializeUe4ss(api).then(lo => dispatch(setUe4ssLoadOrder(profileId, lo)));
  setSelectedIds(new Set());
}, [profileId]);
```

The `ensureFileAsync` -> try/catch change in `deserializeUe4ss` is load-bearing:
`ensureFileAsync` creates an empty file on first call, which is what causes the
"empty LO written for the other game's profile" symptom.

### didDeploy: deserialize -> dispatch -> serialize (with fallback)

`didDeploy` runs all three steps so `mods.txt` stays current after every deploy.
`deserializeUe4ss` is wrapped in try/catch -- `isDir` uses `fs.statSync` inside
`Array.filter()`, which can throw during deploy if a junction/hardlink is in a
transitional state. Without the catch, a throw propagates silently and
`serializeUe4ss` is never reached:

```js
async function didDeploy(api, profileId) {
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  if (profile?.gameId !== GAME_ID) return Promise.resolve();
  if (ue4ssLoadOrder && isUe4ssInstalled(api, spec)) {
    const loEnabled = util.getSafe(state, ['settings', GAME_ID, 'ue4ssLoEnabled'], true);
    if (loEnabled) {
      let UE4SS_LOAD_ORDER;
      try {
        UE4SS_LOAD_ORDER = await deserializeUe4ss(api);
        api.store.dispatch(setUe4ssLoadOrder(profileId, UE4SS_LOAD_ORDER));
      } catch (err) {
        log('error', `[${GAME_ID}] didDeploy: deserializeUe4ss failed, falling back to store state`, err);
        UE4SS_LOAD_ORDER = util.getSafe(state, ['persistent', 'ue4ssLoadOrder', profileId, 'loadOrder'], []);
      }
      if (UE4SS_LOAD_ORDER.length > 0) {
        await serializeUe4ss(api, UE4SS_LOAD_ORDER);
      }
    }
  }
  api.dismissNotification(`${GAME_ID}-loadorderdeploy-notif`);
  return Promise.resolve();
}
```

The `length > 0` guard prevents writing an empty load order if both paths fail. The
dispatch on success is required: the page's `useEffect` only fires on `profileId`
change, so without it newly deployed mods won't appear in the UI until a profile switch.

### CSS scoping pitfall

FBLO styles are scoped to `#page-file-based-loadorder`. On a custom page (different DOM
ID), `.load-order-entry`, `.load-order-name`, and page-scoped `.layout-flex` overrides
**do not apply**. Global styles that DO apply:

| Class | Global style |
| --- | --- |
| `.layout-container` | `display: flex` |
| `.layout-flex` | `flex: 1 1 0; position: relative; overflow: hidden` |
| `.layout-fixed` | `position: relative` (no flex sizing) |

Fix: apply all critical styles inline on `div` elements.

### FlexLayout layout rules

- `FlexLayout.Flex` has global `overflow: hidden` -- override with `style={{ overflowY: 'auto' }}` on the scrollable list side.
- Fixed-width info panel: use `FlexLayout.Flex` with `style={{ flex: '0 0 300px' }}`. Do NOT use `FlexLayout.Fixed` -- only gets `position: relative`, no flex sizing.
- `FlexLayout(row)` inside a percentage-height parent needs `style={{ height: '100%' }}` or it collapses.
- For a **column** layout (Ue4ssLoadOrderPage pattern): `FlexLayout.Flex` list needs `minHeight: 0` to shrink; info panel should be a plain `div { flexShrink: 0 }` -- `FlexLayout.Flex` ignores `flex: '0 0 Npx'` height constraints in column mode.

### Ue4ssLoadOrderPage component skeleton

```js
function Ue4ssLoadOrderPage({ api }) {
  const { useSelector, useDispatch } = require('react-redux');
  const { FormControl } = require('react-bootstrap');

  const profileId = useSelector(state => selectors.activeProfile(state)?.id);
  const loadOrder = useSelector(state =>
    util.getSafe(state, ['persistent', 'ue4ssLoadOrder', profileId, 'loadOrder'], []));
  const loEnabled = useSelector(state => util.getSafe(state, ['settings', GAME_ID, 'ue4ssLoEnabled'], true));
  const dispatch = useDispatch();
  const [filterText, setFilterText] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [contextMenu, setContextMenu] = React.useState(null);

  // Dismiss context menu on any click/right-click outside
  React.useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    globalThis.document.addEventListener('click', dismiss);
    globalThis.document.addEventListener('contextmenu', dismiss);
    return () => {
      globalThis.document.removeEventListener('click', dismiss);
      globalThis.document.removeEventListener('contextmenu', dismiss);
    };
  }, [contextMenu]);

  // Load on profile change; guard against wrong game
  React.useEffect(() => {
    if (!profileId) return;
    if (selectors.activeGameId(api.getState()) !== GAME_ID) return;
    deserializeUe4ss(api).then(lo => dispatch(setUe4ssLoadOrder(profileId, lo)));
    setSelectedIds(new Set());
  }, [profileId]);

  const onApply = React.useCallback((reordered) => {
    let newLO;
    if (filterText) {
      // merge reordered filtered subset back into full list at the same positions
      const filteredIds = new Set(reordered.map(e => e.id));
      const positions = loadOrder.reduce((acc, e, i) => { if (filteredIds.has(e.id)) acc.push(i); return acc; }, []);
      newLO = [...loadOrder];
      positions.forEach((pos, i) => { newLO[pos] = reordered[i]; });
    } else {
      newLO = reordered;
    }
    dispatch(setUe4ssLoadOrder(profileId, newLO));
    serializeUe4ss(api, newLO); // writes mods.txt + sidecar directly -- no deploy needed
  }, [dispatch, loadOrder, filterText, profileId]);

  const filteredOrder = filterText
    ? loadOrder.filter(e => e.name.toLowerCase().includes(filterText.toLowerCase()))
    : loadOrder;

  const allIds = filteredOrder.map(e => e.id);

  // Empty-state checks: loEnabled first, then no mods
  if (!loEnabled) {
    return React.createElement(MainPage, null,
      React.createElement(MainPage.Body, null,
        React.createElement('p', { style: { padding: '12px', fontWeight: 'bold', color: 'yellow' } },
          'UE4SS load order is disabled in Settings.')));
  }
  if (!loadOrder.length) {
    return React.createElement(MainPage, null,
      React.createElement(MainPage.Body, null,
        React.createElement('p', { style: { padding: '12px', fontWeight: 'bold', color: 'yellow' } },
          'No UE4SS mods are installed.')));
  }

  return React.createElement(MainPage, null,
    React.createElement(MainPage.Header, null,
      React.createElement(FormControl, {
        type: 'search', placeholder: 'Filter mods...',
        className: 'file-based-load-order-filter',
        value: filterText, onChange: (evt) => setFilterText(evt.target.value),
      })
    ),
    React.createElement(MainPage.Body, null,
      React.createElement(DNDContainer, { style: { height: '95%' } },
        React.createElement(FlexLayout, { type: 'column',
          className: 'file-based-load-order-container', style: { height: '100%' } },
          React.createElement(FlexLayout.Flex,
            { className: 'file-based-load-order-list', style: { overflowY: 'auto', minHeight: 0 } },
            React.createElement(Ue4ssSelectionContext.Provider,
              { value: { selectedIds, setSelectedIds, allIds, contextMenu, setContextMenu } },
              React.createElement(DraggableList, {
                itemTypeId: `${GAME_ID}-ue4ss-lo-entry`,
                id: `${GAME_ID}-ue4ss-loadorder-list`,
                items: filteredOrder,
                itemRenderer: Ue4ssItemRenderer,
                apply: onApply,
                idFunc: entry => entry.id,
                isLocked: item => [true, 'true', 'always'].includes(item?.locked),
              })
            )
          ),
          React.createElement('div', { style: { flexShrink: 0 } },
            React.createElement(Ue4ssLoadOrderInfoPanel)
          )
        )
      )
    )
  );
}
```

### Ue4ssSelectionContext

Defined at module level (outside components):

```js
const Ue4ssSelectionContext = React.createContext({
  selectedIds: new Set(),
  setSelectedIds: () => {},
  allIds: [],
  contextMenu: null,
  setContextMenu: () => {},
});
```

`Ue4ssLoadOrderPage` holds `selectedIds` and `contextMenu` as state. `allIds` is
derived from `filteredOrder.map(e => e.id)` per render. All five fields are provided
via `Ue4ssSelectionContext.Provider` wrapping `DraggableList`.

### Per-row renderer (DraggableList contract)

`DraggableList` passes `{ className, item }` where `item` is the **raw entry** from the
`items` array -- NOT FBLO's wrapped `{ loEntry, displayCheckboxes, invalidEntries }`.
The control wraps all rows in a `<ListGroup>` internally.

Return a plain `div` with inline flex styles. Do NOT use `ListGroupItem` -- Bootstrap's
block display needs page-scoped CSS that won't fire on a custom page.

```js
function Ue4ssItemRenderer({ className, item }) {
  const { Icon, LoadOrderIndexInput, MainContext } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');

  const vortexContext = React.useContext(MainContext);
  const dispatch = useDispatch();

  const profileId = useSelector(state => selectors.activeProfile(state)?.id);
  const loadOrder = useSelector(state =>
    util.getSafe(state, ['persistent', 'ue4ssLoadOrder', profileId, 'loadOrder'], []));
  const mods = useSelector(state => util.getSafe(state, ['persistent', 'mods', GAME_ID], {}));
  const pictureUrl = mods[item.modId]?.attributes?.pictureUrl;
  const gamePath = useSelector(state =>
    util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'path'], ''));

  const currentIdx = loadOrder.findIndex((e) => e.id === item.id) + 1;
  const isLocked = (entry) => [true, 'true', 'always'].includes(entry?.locked);
  const lockedCount = loadOrder.filter(isLocked).length;
  const isEntryLocked = isLocked(item);

  const onApplyIndex = React.useCallback((idx) => {
    if (currentIdx === idx) return;
    const newLO = loadOrder.filter((e) => e.id !== item.id);
    newLO.splice(idx - 1, 0, item);
    dispatch(setUe4ssLoadOrder(profileId, newLO));
    serializeUe4ss(vortexContext.api, newLO);
  }, [dispatch, vortexContext, profileId, loadOrder, item, currentIdx]);

  const onLock = React.useCallback(() => {
    const newLO = loadOrder.map(e => e.id === item.id ? { ...e, locked: !isEntryLocked } : e);
    dispatch(setUe4ssLoadOrder(profileId, newLO));
    serializeUe4ss(vortexContext.api, newLO);
  }, [dispatch, vortexContext, profileId, loadOrder, item, isEntryLocked]);

  const onToggle = React.useCallback((evt) => {
    const newLO = loadOrder.map(e => e.id === item.id ? { ...e, enabled: evt.target.checked } : e);
    dispatch(setUe4ssLoadOrder(profileId, newLO));
    serializeUe4ss(vortexContext.api, newLO);
  }, [dispatch, vortexContext, loadOrder, item, profileId]);

  // Detect config file for "Configure" button
  const [configFilePath, setConfigFilePath] = React.useState('');
  React.useEffect(() => {
    if (!gamePath || !item.id) { setConfigFilePath(''); return; }
    const modFolder = path.join(gamePath, BINARIES_PATH, UE4SS_MOD_PATH, item.id);
    const localConfigFiles = [...UE4SS_CONFIG_FILES, `${item.id}.txt`, `${item.id}.ini`, `${item.id}.json`];
    let found = '';
    util.walk(modFolder, (iterPath, stats) => {
      if (found === '' && !stats.isDirectory() && localConfigFiles.includes(path.basename(iterPath))) {
        found = iterPath;
      }
      return Promise.resolve();
    })
      .then(() => setConfigFilePath(found))
      .catch(() => setConfigFilePath(''));
  }, [gamePath, item.id]);

  const { selectedIds, setSelectedIds, allIds, contextMenu, setContextMenu } =
    React.useContext(Ue4ssSelectionContext);
  const isSelected = selectedIds.has(item.id);

  const onContextMenu = React.useCallback((evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    setContextMenu({ x: evt.clientX, y: evt.clientY, itemId: item.id });
  }, [item.id, setContextMenu]);

  const onSelect = React.useCallback((evt) => {
    const ctrlKey = evt.ctrlKey || evt.metaKey; // capture before entering updater
    const shiftKey = evt.shiftKey;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (ctrlKey) {
        next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      } else if (shiftKey) {
        const lastId = [...prev].at(-1);
        const start = allIds.indexOf(lastId ?? item.id);
        const end = allIds.indexOf(item.id);
        const [lo, hi] = [Math.min(start, end), Math.max(start, end)];
        for (let i = lo; i <= hi; i++) next.add(allIds[i]);
      } else { next.clear(); next.add(item.id); }
      return next;
    });
  }, [item.id, setSelectedIds, allIds]);

  const classes = ['load-order-entry'];
  if (className) classes.push(...className.split(' ').filter(Boolean));

  return React.createElement('div', {
    key: item.id,
    className: classes.join(' '),
    onClick: onSelect,
    onContextMenu: onContextMenu,
    style: {
      display: 'flex', flexDirection: 'row', alignItems: 'center',
      gap: 8, padding: '4px 12px', margin: 0,
      border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, minHeight: 52,
      outline: isSelected ? '2px solid #337ab7' : 'none', outlineOffset: '-1px',
    },
  },
    React.createElement('div', { style: { visibility: isEntryLocked ? 'hidden' : 'visible' } },
      React.createElement(Icon, { className: 'drag-handle-icon', name: 'drag-handle' }),
    ),
    React.createElement('div', { style: { width: 24, flexShrink: 0, overflow: 'hidden' } },
      React.createElement(LoadOrderIndexInput, {
        className: 'load-order-index', api: vortexContext.api, item: item,
        currentPosition: currentIdx, lockedEntriesCount: lockedCount,
        loadOrder: loadOrder, isLocked: isLocked, onApplyIndex: onApplyIndex,
      }),
    ),
    React.createElement('div', {
      style: { cursor: 'pointer', display: 'flex', alignItems: 'center' },
      title: isEntryLocked ? 'Unlock position' : 'Lock position', onClick: onLock,
    },
      React.createElement(Icon, { name: isEntryLocked ? 'locked' : 'unlocked',
        style: { color: isEntryLocked ? '#e2c04c' : 'inherit' } }),
    ),
    React.createElement('div', { className: 'load-order-thumb-slot',
      style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, flexShrink: 0 } },
      pictureUrl ? React.createElement('img', {
        className: 'load-order-thumb', src: pictureUrl, draggable: false,
        style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT,
                 objectFit: 'cover', borderRadius: 2, pointerEvents: 'none' },
      }) : null,
    ),
    React.createElement('p', { className: 'load-order-name',
      style: { flex: '1 1 0', margin: 0, whiteSpace: 'normal', wordBreak: 'break-word' } }, item.name),
    configFilePath ? React.createElement('button', {
      className: 'btn btn-default btn-sm', style: { margin: '0 4px' },
      onClick: () => util.opn(configFilePath).catch(() => null),
    }, 'Configure') : null,
    React.createElement('input', {
      type: 'checkbox',
      style: { alignSelf: 'center', cursor: 'pointer' },
      checked: item.enabled ?? true,
      onChange: onToggle,
    }),
    contextMenu?.itemId === item.id ? React.createElement(Ue4ssContextMenu, {
      x: contextMenu.x, y: contextMenu.y,
      item, loadOrder, profileId, dispatch,
      api: vortexContext.api, gamePath, configFilePath, selectedIds,
      onClose: () => setContextMenu(null),
    }) : null,
  );
}
```

**`deserializeUe4ss` must explicitly include `locked: entry?.locked`** -- entries are
built manually (not spread from file), so `locked` is silently dropped if omitted.

### Ue4ssContextMenu

Richer than `PakContextMenu`. Dismissed by click/contextmenu/Escape (same pattern).
Injects `.ue4ss-ctx-item:hover` style once via `globalThis.document.head`.

**Single-item menu:**

| Item | Condition | Action |
| --- | --- | --- |
| Enable / Disable | always | Toggle `enabled` on this entry; serialize |
| Lock / Unlock Position | always | Toggle `locked`; serialize |
| Configure | `configFilePath` non-empty | `util.opn(configFilePath)` |
| *(separator)* | always | |
| Open Mod Folder | always | `util.opn(gamePath/binaries/ue4ss/Mods/item.id)` |
| *(separator)* | always | |
| Move to Top | always | Re-insert after locked entries; serialize |
| Move to Bottom | always | Re-insert at end; serialize |

**Multi-item menu** (`selectedIds.size >= 2 && selectedIds.has(item.id)`):

| Item | Action |
| --- | --- |
| Enable Selected (n) | Set `enabled: true` on all selected; serialize |
| Disable Selected (n) | Set `enabled: false` on all selected; serialize |
| Lock Selected (n) | Set `locked: true` on all selected; serialize |
| Unlock Selected (n) | Set `locked: false` on all selected; serialize |
| Open Mod Folder | Opens `item.id` folder (not all selected) |

All menu actions call `dispatch(setUe4ssLoadOrder(profileId, newLO))` and
`serializeUe4ss(api, newLO)` -- changes write to `mods.txt` immediately.

### Hook integration summary

| Event | Response |
| --- | --- |
| Page mounts / profile switches | `useEffect([profileId])` -> guard GAME_ID -> `deserializeUe4ss` -> dispatch + clear selection |
| User drags row | `DraggableList.apply` -> merge filter subset -> dispatch -> `serializeUe4ss` |
| User types position | `onApplyIndex` -> splice -> dispatch -> `serializeUe4ss` |
| User toggles checkbox | `onToggle` -> map new enabled state -> dispatch -> `serializeUe4ss` |
| User locks entry | `onLock` -> map new locked state -> dispatch -> `serializeUe4ss` |
| User right-clicks | `onContextMenu` -> `setContextMenu({ x, y, itemId })` |
| User clicks row | `onSelect` -> `setSelectedIds` (plain/Ctrl/Shift) |
| Context menu dismissed | click/contextmenu/Escape listeners -> `setContextMenu(null)` |
| `did-deploy` | `didDeploy` -> `deserializeUe4ss` (with fallback) -> dispatch + `serializeUe4ss` |

---

## 9. Related files

- `resources/LOAD_ORDER_ITEM_RENDERER.md` -- deep dive on the per-row renderer component
- `resources/RE-UE4SS_MODS_CONFIG.md` -- mods.json vs mods.txt vs sidecar relationship
- `template-ue4-5\index.js` -- canonical implementation of everything described here
- `Vortex\src\renderer\src\extensions\file_based_loadorder\` -- full FBLO source
