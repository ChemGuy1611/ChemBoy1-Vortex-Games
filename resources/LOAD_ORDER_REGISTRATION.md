# context.registerLoadOrder — Reference & Custom-Page Design Guide

**Source files cited throughout:**
- `Vortex\src\renderer\src\types\IExtensionContext.ts` (signature, IMainPageOptions)
- `Vortex\src\renderer\src\extensions\file_based_loadorder\types\types.ts` (all interfaces)
- `Vortex\src\renderer\src\extensions\file_based_loadorder\index.ts` (registration, lifecycle)
- `Vortex\src\renderer\src\extensions\file_based_loadorder\views\FileBasedLoadOrderPage.tsx` (UI)
- `template-ue4-5\index.js` (canonical ChemBoy1 usage)

---

## 1. What `registerLoadOrder` is (60-second overview)

`context.registerLoadOrder(gameInfo)` is Vortex's **File-Based Load Order** (FBLO) API.
Calling it does three things:

1. Registers a per-game load order handler (serialize / deserialize / validate functions).
2. Makes the shared **Load Order** sidebar page visible for that game, powered by those handlers.
3. Wires up automatic lifecycle events — page mount, profile switch, deploy/purge, game exit — to call your handlers at the right times.

The older `context.registerLoadOrderPage` (used with PAK-prefix renaming: `AAA_`, `AAB_`, ...) is **deprecated**. Use `registerLoadOrder` for all new development.

---

## 2. The `ILoadOrderGameInfo` contract

```
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
| `usageInstructions` | Vortex default | String or `React.ComponentType` shown in the info panel |
| `customItemRenderer` | Vortex default | `React.ComponentType` for each row in the list |
| `noCollectionGeneration` | `false` | Opt out of automatic Vortex Collections integration |
| `condition` | `undefined` | `() => boolean` — hide the LO page when returns `false` |

### `ILoadOrderEntry` shape (types.ts:35-60)

```js
{
  id: string,       // unique key — usually mod folder name or filename
  enabled: boolean, // controls per-entry on/off checkbox
  name: string,     // display name shown in the list
  locked?: LockedState,  // 'locked'|'always-locked'|undefined — prevents drag
  modId?: string,   // Vortex internal mod id — REQUIRED for Collections to work
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

`template-ue4-5\index.js:2555-2563`:

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

```
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

### What `customItemRenderer` receives

Each row's renderer gets props `{ className?: string, item: IItemRendererProps }` where:

```ts
IItemRendererProps = {
  loEntry: ILoadOrderEntry,
  displayCheckboxes: boolean,        // = toggleableEntries
  invalidEntries?: IInvalidResult[], // from last validation run
}
```

The renderer also has full access to the Vortex Redux store via `connect()` or
`useSelector()` — that is how `LoadOrderItemRenderer` in the template reads mod
attributes (thumbnail, etc.) without them being passed explicitly.

---

## 5. Redux state & actions

### State path

```
state.persistent.loadOrder[profileId] = ILoadOrderEntry[]
```

Key point: keyed by **profile id**, not game id. This means each profile has its own
independent load order for the same game.

Reducers are registered at:
- `["persistent", "loadOrder"]` — the LO array (`file_based_loadorder\index.ts:290`)
- `["session", "fblo"]` — validation results, force-update flag (`index.ts:291`)

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

Serialize is **never** called directly by events — it is only called after a user-driven
LO state change (`onStateChange persistent.loadOrder`). Deploy/purge events only call
deserialize, not serialize.

---

## 7. `ue4ss_loadOrder.json` — how it fits in the UE4-5 template

### Key constants (`template-ue4-5\index.js:237-245`)

```js
const UE4SS_MODSTXT_FILE  = 'mods.txt';
const UE4SS_LO_FILE       = 'ue4ss_loadOrder.json';
const LO_ATTRIBUTE_UE4SS  = 'ue4ssModFolder'; // installer sets this on each mod
const UE4SS_NATIVE_MODS   = [
  'BPML_GenericFunctions', 'BPModLoaderMod', 'CheatManagerEnablerMod',
  'ConsoleCommandsMod', 'ConsoleEnablerMod', 'Keybinds',
  'LineTraceMod', 'shared', 'SplitScreenMod'
];
```

### File path

```
<GamePath>/<EPIC_CODE_NAME>/Binaries/<Win64|WinGDK>/ue4ss/Mods/<profileId>_ue4ss_loadOrder.json
```
Same directory as `mods.txt`.

### JSON shape

```json
[
  { "id": "MyScriptMod",  "name": "My Mod (MyScriptMod)",  "modId": "abc123", "enabled": true },
  { "id": "AnotherMod",   "name": "Manual Mod (AnotherMod)", "modId": null,   "enabled": false }
]
```

### Relationship to FBLO

**Important:** in the current template, the FBLO page (`context.registerLoadOrder`) and
the UE4SS sidecar are **two separate systems**:

- FBLO uses `<profile>_loadOrder.json` for **PAK-style** mods (sortable via prefix renaming).
- `ue4ss_loadOrder.json` is used **only** by the `didDeploy` hook, gated by
  `if (ue4ssLoadOrder && isUe4ssInstalled(...))`.
- Setting `ue4ssLoadOrder = false` (line 82) disables UE4SS sidecar entirely —
  the FBLO page still works for PAK mods.

The sidecar is **deploy-driven, not FBLO-driven**. Flow on deploy:

```
did-deploy fires
  -> deserializeUe4ss()
       reads <profile>_ue4ss_loadOrder.json
       scans Mods/ folder for actual mod folders
       resolves mod names via LO_ATTRIBUTE_UE4SS attribute
       returns sorted ILoadOrderEntry[]
  -> serializeUe4ss()
       writes back <profile>_ue4ss_loadOrder.json
       rewrites mods.txt between BPModLoaderMod and Keybinds anchors
```

`mods.txt` line format: `ModFolderName : 1` (enabled) or `ModFolderName : 0` (disabled).

---

## 8. Custom React page for UE4SS mods — implementation

**Reference implementation: `game-subnautica2/index.js` v0.2.0 (2026-05-15).**
`template-ue4-5/index.js` propagation queued (toggle `false` at line 82).

The page is **additive** — registered alongside the existing FBLO page, never replacing it.
FBLO manages PAK mod load order (prefix renaming). The custom page manages only UE4SS
script mods via the `<profile>_ue4ss_loadOrder.json` sidecar + `mods.txt`.

### Key Vortex UI primitives

```js
// top-level import in index.js
const { actions, fs, util, selectors, log,
        MainPage, FlexLayout, DNDContainer, DraggableList, Spinner } = require('vortex-api');
// inline-required inside component functions (mirrors existing LoadOrderItemRenderer style):
// Icon, MainContext  <- from 'vortex-api'
// Checkbox, FormControl  <- from 'react-bootstrap'
// useSelector, useDispatch  <- from 'react-redux'
```

**Critical:** always wrap drag-and-drop lists in `DNDContainer`. Vortex bundles `react-dnd`
internally; do NOT import it from npm.

### Action creator (no safeCreateAction — not exported from vortex-api)

```js
const SET_UE4SS_LOAD_ORDER = `SET_${GAME_ID.toUpperCase()}_UE4SS_LOAD_ORDER`;
function setUe4ssLoadOrder(profileId, lo) { return { type: SET_UE4SS_LOAD_ORDER, payload: { profileId, loadOrder: lo } }; }
setUe4ssLoadOrder.toString = () => SET_UE4SS_LOAD_ORDER;
```

### Reducer registration (inside `main(context)`)

State is keyed by `profileId` so switching profiles picks up the correct order without re-reading the file.

```js
context.registerReducer(['persistent', 'ue4ssLoadOrder'], {
  reducers: {
    [setUe4ssLoadOrder.toString()]: (state, payload) => util.setSafe(state, [payload.profileId, 'loadOrder'], payload.loadOrder),
  },
  defaults: {},
});
```

### Page registration (inside `main(context)`, after FBLO block)

```js
if (ue4ssLoadOrder) {
  context.registerReducer([...]);  // see above
  context.registerMainPage('sort-none', 'UE4SS Load Order', Ue4ssLoadOrderPage, {
    id: `${GAME_ID}-ue4ss-loadorder`,
    group: 'per-game',
    hotkey: 'U',
    visible: () => {
      const gameId = selectors.activeGameId(context.api.store.getState());
      return gameId === GAME_ID && isUe4ssInstalled(context.api, spec);
    },
    props: () => ({ api: context.api }),
  });
}
```

### didDeploy — refresh-only, page is sole writer

`serializeUe4ss` writes directly to the game directory (not staging), so `didDeploy`
must NOT re-serialize — that would overwrite the user's order. Instead it refreshes the
reducer so newly deployed mods appear in the list. **The refresh IS necessary** — the
page's `useEffect` only fires on `profileId` change, so without it new mods don't appear
until a profile switch.

```js
if (ue4ssLoadOrder && isUe4ssInstalled(api, spec)) {
  const UE4SS_LOAD_ORDER = await deserializeUe4ss(api);
  api.store.dispatch(setUe4ssLoadOrder(profileId, UE4SS_LOAD_ORDER));
  // do NOT call serializeUe4ss here
}
```

### CSS scoping pitfall (critical)

FBLO styles live in `Vortex/src/stylesheets/vortex/page-mod-load-order.scss` and are
scoped to `#page-file-based-loadorder`. A custom page has a different DOM ID so these
rules **do not apply**: `.load-order-entry`, `.load-order-name`, the page-scoped
`.layout-flex { overflow:auto }` override, `.file-based-load-order-list .list-group`, etc.

**Global** styles that DO apply (from `layout.scss`):

| Class | Global style |
| --- | --- |
| `.layout-container` | `display: flex` |
| `.layout-flex` | `flex: 1 1 0; position: relative; overflow: hidden` |
| `.layout-fixed` | `position: relative` (no flex sizing) |

Fix: apply all critical styles inline on `div` elements.

### FlexLayout layout rules

- `FlexLayout.Flex` has global `overflow: hidden` — override with `style={{ overflowY: 'auto' }}` on the scrollable list side.
- Fixed-width info panel: use `FlexLayout.Flex` with `style={{ flex: '0 0 300px' }}`. Do NOT use `FlexLayout.Fixed` — it only gets `position: relative`, no flex sizing, and gets squeezed.
- `FlexLayout(row)` inside a percentage-height parent (e.g. `DNDContainer style={{ height: '95%' }}`) needs `style={{ height: '100%' }}` or it collapses to content height.

### Component skeleton (actual working pattern)

```js
function Ue4ssLoadOrderPage({ api }) {
  const { useSelector, useDispatch } = require('react-redux');
  const { FormControl } = require('react-bootstrap');

  const profileId = useSelector(state => selectors.activeProfile(state)?.id);
  const loadOrder = useSelector(state =>
    util.getSafe(state, ['persistent', 'ue4ssLoadOrder', profileId, 'loadOrder'], []));
  const dispatch = useDispatch();
  const [filterText, setFilterText] = React.useState('');

  React.useEffect(() => {
    if (!profileId) return;
    deserializeUe4ss(api).then(lo => dispatch(setUe4ssLoadOrder(profileId, lo)));
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
    serializeUe4ss(api, newLO); // writes mods.txt + sidecar directly — no deploy needed
  }, [dispatch, loadOrder, filterText, profileId]);

  const filteredOrder = filterText
    ? loadOrder.filter(e => e.name.toLowerCase().includes(filterText.toLowerCase()))
    : loadOrder;

  if (!loadOrder.length) {
    return React.createElement(MainPage, null,
      React.createElement(MainPage.Body, null, React.createElement('p', { style: { padding: '12px', fontWeight: 'bold', color: 'yellow' } }, 'No UE4SS mods are installed.')));
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
        React.createElement(FlexLayout, { type: 'row',
          className: 'file-based-load-order-container', style: { height: '100%' } },
          React.createElement(FlexLayout.Flex,
            { className: 'file-based-load-order-list', style: { overflowY: 'auto' } },
            React.createElement(DraggableList, {
              itemTypeId: `${GAME_ID}-ue4ss-lo-entry`,
              id: `${GAME_ID}-ue4ss-loadorder-list`,
              items: filteredOrder, itemRenderer: Ue4ssItemRenderer,
              apply: onApply, idFunc: entry => entry.id,
            })
          ),
          React.createElement(FlexLayout.Flex, { style: { flex: '0 0 300px', overflowY: 'auto' } },
            React.createElement(Ue4ssLoadOrderInfoPanel)
          )
        )
      )
    )
  );
}
```

### Per-row renderer (DraggableList contract)

`DraggableList` passes `{ className, item }` where `item` is the **raw entry** from the
`items` array — NOT FBLO's wrapped `{ loEntry, displayCheckboxes, invalidEntries }`. The
control wraps all rows in a `<ListGroup>` internally
(`controls/DraggableList.tsx:70`, `controls/DraggableListItem.tsx:146`).

Return a plain `div` with inline flex styles. Do NOT use `ListGroupItem` — Bootstrap's
block display needs page-scoped CSS that won't fire. Use `MainContext` to get `api` inside
the renderer (same pattern as `LoadOrderItemRenderer`).

```js
function Ue4ssItemRenderer({ className, item }) {
  const { Checkbox } = require('react-bootstrap');
  const { Icon, MainContext } = require('vortex-api');
  const { useSelector, useDispatch } = require('react-redux');

  const vortexContext = React.useContext(MainContext);
  const dispatch = useDispatch();
  const profileId = useSelector(state => selectors.activeProfile(state)?.id);
  const loadOrder = useSelector(state =>
    util.getSafe(state, ['persistent', 'ue4ssLoadOrder', profileId, 'loadOrder'], []));
  const mods = useSelector(state => util.getSafe(state, ['persistent', 'mods', GAME_ID], {}));
  const pictureUrl = mods[item.modId]?.attributes?.pictureUrl;

  const onToggle = React.useCallback((evt) => {
    const newLO = loadOrder.map(e => e.id === item.id ? { ...e, enabled: evt.target.checked } : e);
    dispatch(setUe4ssLoadOrder(profileId, newLO));
    serializeUe4ss(vortexContext.api, newLO); // immediate write, no deploy
  }, [dispatch, vortexContext, loadOrder, item, profileId]);

  const classes = ['load-order-entry'];
  if (className) classes.push(...className.split(' ').filter(Boolean));

  return React.createElement('div', {
    key: item.id, className: classes.join(' '),
    style: { display: 'flex', flexDirection: 'row', alignItems: 'center',
             gap: 8, padding: '4px 12px', margin: 0,
             border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, minHeight: 52 },
  },
    React.createElement(Icon, { className: 'drag-handle-icon', name: 'drag-handle' }),
    React.createElement('div', { className: 'load-order-thumb-slot',
      style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT, flexShrink: 0 } },
      pictureUrl ? React.createElement('img', {
        className: 'load-order-thumb', src: pictureUrl, draggable: false,
        style: { width: LO_IMAGE_WIDTH, height: LO_IMAGE_HEIGHT,
                 objectFit: 'cover', borderRadius: 2, pointerEvents: 'none' },
      }) : null,
    ),
    React.createElement('p', { className: 'load-order-name',
      style: { flex: '1 1 0', margin: 0 } }, item.name),
    React.createElement(Checkbox, {
      className: 'entry-checkbox', style: { margin: 0 },
      checked: item.enabled ?? true, onChange: onToggle,
    }),
  );
}
```

### Hook integration summary

| Event | Response |
| --- | --- |
| Page mounts / profile switches | `useEffect([profileId])` -> `deserializeUe4ss` -> dispatch |
| User drags row | `DraggableList.apply` -> merge filter subset -> `serializeUe4ss` -> dispatch |
| User toggles checkbox | `onToggle` -> map new enabled state -> `serializeUe4ss` -> dispatch |
| `did-deploy` | `didDeploy` -> `deserializeUe4ss` -> dispatch only (no serialize) |

---

## 9. Related files

- `resources/LOAD_ORDER_ITEM_RENDERER.md` — deep dive on the per-row renderer component
- `resources/RE-UE4SS_MODS_CONFIG.md` — mods.json vs mods.txt vs sidecar relationship
- `template-ue4-5\index.js` — canonical implementation of everything described here
- `Vortex\src\renderer\src\extensions\file_based_loadorder\` — full FBLO source
