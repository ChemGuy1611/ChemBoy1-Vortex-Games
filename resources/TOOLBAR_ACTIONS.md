# Toolbar Actions in Vortex Extensions

How to add buttons to toolbars, context menus, and custom page toolbars using `registerAction` and `IconBar`.

---

## Two Ways to Add Toolbar Buttons

| Approach | When to use |
| --- | --- |
| `context.registerAction(group, ...)` | Adding buttons to built-in toolbars (Mods, Downloads, Load Order). Allows other extensions to add to the same group. |
| `staticElements` on `IconBar` | Hardcoded buttons in a custom page's own header. Not extensible. |

Both are rendered by `IconBar`. `registerAction` populates the action registry; `IconBar` reads from it by group name.

---

## 1. `registerAction` — Signature

`registerAction(group, position, iconOrComponent, options, titleOrProps, actionOrCondition, condition)`,
always called inside `main(context)`, never `context.once()`/`context.onceMain()`. Full param
signature and the `IActionOptions` field table (`noCollapse`, `namespace`, `hollowIcon`,
`isClassicOnly`, `isModernOnly`): see `REGISTER_ACTION.md`.

---

## 2. `instanceIds` — What They Are and How They Flow

`instanceIds` is an array of string IDs representing the currently selected rows or items. When the user selects mods in the Mods list, those mod IDs become the `instanceIds` passed to your action and condition functions.

- **Single-row context menu**: `instanceIds = [rowId]` — the one row the user right-clicked.
- **Multirow selection**: `instanceIds = [id1, id2, id3, ...]` — all selected rows.
- **Toolbar with no selection**: `instanceIds = []` — no rows selected.

The flow:

```text
User clicks action button
  └─ IconBar / ContextMenu normalizes instanceId → string[]
       └─ condition(instanceIds) called — determines enabled/disabled/hidden
            └─ if enabled: action(instanceIds) called
```

The `IconBar` component normalizes `instanceId` prop to `string[]` before passing to actions:

```js
// Vortex internals:
const ids = typeof instanceId === 'string' ? [instanceId] : instanceId;
icon.action?.(ids, icon.data);
```

---

## 3. Condition Return Values

The condition function determines whether the action is shown and enabled: `true` = enabled,
`false` = hidden entirely, `string` = visible but disabled (shown as tooltip). Full table +
examples: see `REGISTER_ACTION.md`.

---

## 4. Icon-String Form (Most Common)

```js
// Minimal — no condition, always visible
context.registerAction(
  'mod-icons',
  300,
  'open-ext',
  {},
  'Open Wiki',
  () => util.opn('https://wiki.example.com').catch(() => null)
);

// With condition gated on game + selection
context.registerAction(
  'mod-icons',
  310,
  'refresh',
  {},
  'Refresh Config',
  (instanceIds) => {
    // instanceIds = selected mod IDs
    doRefresh(api, instanceIds);
  },
  (instanceIds) => {
    const gameId = selectors.activeGameId(api.getState());
    if (gameId !== GAME_ID) return false;       // hidden for other games
    if (instanceIds.length === 0) return 'Select a mod'; // disabled
    return true;
  }
);
```

---

## 5. Component Form (Custom Button UI)

Use when you need more than an icon + label — e.g. a dropdown, a toggle, or a custom layout.

```js
context.registerAction(
  'mod-icons',
  105,
  MyCustomButton,     // React component
  {},
  () => ({            // PropsCallback — returns props for the component
    api,
    onAction: () => doSomething(api),
  }),
  () => selectors.activeGameId(api.getState()) === GAME_ID  // condition (3rd positional arg in component form)
);
```

The component receives the props from the PropsCallback plus a `parentType` prop injected by Vortex:

```js
function MyCustomButton({ api, onAction, parentType }) {
  // parentType is 'iconbar' | 'context' — tells you where you're rendered
  return React.createElement('button', {
    className: 'btn btn-default',
    onClick: onAction,
  }, 'My Button');
}
```

> In component form: `titleOrProps` is a `PropsCallback` (function), not a string. The `actionOrCondition` arg becomes the condition, not the action (action is baked into the component).

---

## 6. Built-In Group Strings

| Group | Where it appears |
| --- | --- |
| `'mod-icons'` | Mods page main toolbar — most common for game extensions |
| `'mod-context-icons'` | Mods list single-row right-click context menu |
| `'mods-multirow-actions'` | Mods list footer when multiple rows are selected |
| `'fb-load-order-icons'` | File-based load order page toolbar |
| `'generic-load-order-icons'` | Generic load order page toolbar |
| `'global-icons'` | Application header (always visible, any page) |
| `'application-icons'` | Application header — often `isClassicOnly: true` |
| `'downloads-action-icons'` | Downloads page per-row actions |
| `'downloads-multirow-actions'` | Downloads page multirow footer |
| `'categories-icons'` | Categories page toolbar |
| `'extensions-layout-icons'` | Extensions manager toolbar |
| `'game-managed-buttons'` | Games list row (managed game) |
| `'game-unmanaged-buttons'` | Games list row (unmanaged game) |
| `'starter-dashlet-tools-controls'` | Starter tool dashlet controls |

### Dynamic table groups

Vortex tables generate group strings dynamically from `tableId`:

| Pattern | Example | Where |
| --- | --- | --- |
| `${tableId}-action-icons` | `modlist-action-icons` | Per-row context menu / ActionDropdown |
| `${tableId}-multirow-actions` | `modlist-multirow-actions` | Multirow selection footer toolbar |

You generally don't register actions into these directly — use `mod-icons` / `mod-context-icons` etc. instead.

---

## 7. Toolbar vs Context Menu — Same API, Different Renderer

The action/condition callback signature is identical for toolbar buttons and context menu items. The only differences are how they are rendered and when condition is called.

```text
Toolbar (IconBar)          Context Menu (ContextMenu / ActionDropdown)
─────────────────────      ──────────────────────────────────────────
Always visible             Opens on right-click
instanceId from prop       instanceId from row that was right-clicked
noCollapse applies         noCollapse ignored (menus don't overflow)
group = 'mod-icons'        group = 'mod-context-icons'
```

Same action function works in both — just register under the appropriate group.

To add an action to both:

```js
const sharedAction = (instanceIds) => doThing(api, instanceIds);
const sharedCondition = (instanceIds) => selectors.activeGameId(api.getState()) === GAME_ID;

context.registerAction('mod-icons', 300, 'my-icon', {}, 'My Action', sharedAction, sharedCondition);
context.registerAction('mod-context-icons', 300, 'my-icon', {}, 'My Action', sharedAction, sharedCondition);
```

---

## 8. Multi-Row vs Single-Row Actions

For the Mods page:

- **`'mod-icons'`** — toolbar at top of Mods page. `instanceIds` = currently selected mod IDs (can be empty, one, or many).
- **`'mod-context-icons'`** — right-click menu on a single row. `instanceIds = [that row's id]`.
- **`'mods-multirow-actions'`** — appears at the bottom of the Mods list when multiple rows are selected. `instanceIds` = all selected IDs.

Pattern: use `'mod-icons'` + a condition that handles `instanceIds.length === 0` gracefully for page-level actions, and `'mod-context-icons'` for row-specific operations.

```js
// Page-level action — works even with no selection
context.registerAction('mod-icons', 200, 'refresh', {}, 'Refresh All', () => refreshAll(api));

// Row-specific action — requires exactly one mod selected
context.registerAction(
  'mod-context-icons', 100, 'open-ext', {},
  'Open Mod Folder',
  (instanceIds) => openModFolder(api, instanceIds[0]),
  (instanceIds) => instanceIds.length === 1 || 'Select exactly one mod'
);

// Multi-row action
context.registerAction(
  'mods-multirow-actions', 100, 'delete', {},
  'Remove Selected',
  (instanceIds) => removeAll(api, instanceIds),
  (instanceIds) => instanceIds.length > 0
);
```

---

## 9. Custom Page Toolbar Group

For a custom `registerMainPage`, define your own group string. Any extension (including yours) can then add buttons to it via `registerAction`.

### Step 1 — Pick a group name

Use `${GAME_ID}-toolbar-icons` or similar to avoid collisions.

### Step 2 — Render it in the page component with `IconBar`

```js
function MyPage({ api }) {
  const { IconBar } = require('vortex-api');

  return React.createElement(MainPage, null,
    React.createElement(MainPage.Header, null,
      React.createElement(IconBar, {
        group: `${GAME_ID}-toolbar-icons`,  // matches registerAction group
        instanceId: `${GAME_ID}-page`,     // a stable ID for this page (no rows)
        staticElements: [],                // optional hardcoded buttons (see §10)
      }),
    ),
    React.createElement(MainPage.Body, null, /* ... */),
  );
}
```

### Step 3 — Register actions into that group

```js
// In main():
context.registerAction(
  `${GAME_ID}-toolbar-icons`,
  100,
  'refresh',
  {},
  'Refresh',
  () => reload(context.api),
  () => selectors.activeGameId(context.api.getState()) === GAME_ID
);
```

Real example: `fb-load-order-icons` group in `Vortex/src/renderer/src/extensions/file_based_loadorder/views/FileBasedLoadOrderPage.tsx:292`.

---

## 10. `staticElements` — Hardcoded Buttons on `IconBar`

`staticElements` adds fixed buttons alongside registered-action buttons. They are not extensible by other extensions.

```js
const { IconBar } = require('vortex-api');

const ToolbarIcon = ({ id, icon, text, onClick }) => {
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
};

const toolbarButtons = [
  {
    component: ToolbarIcon,
    props: () => ({
      id: 'btn-refresh',
      icon: 'refresh',
      text: 'Refresh',
      onClick: () => reload(api),
    }),
  },
];

// In the page JSX:
React.createElement(IconBar, {
  group: `${GAME_ID}-toolbar-icons`,
  staticElements: toolbarButtons,
})
```

Use `staticElements` for buttons that will never be added to by other extensions. Use `registerAction` if you want the action to be composable.

---

## 11. `noCollapse` — Keep Buttons Visible When Toolbar Overflows

When a toolbar has too many buttons to fit, Vortex collapses some into a "…" overflow menu. `noCollapse: true` keeps a specific button always visible outside the overflow.

```js
context.registerAction(
  'mod-icons',
  100,
  'deploy',
  { noCollapse: true },   // always stays in the toolbar, never collapses
  'Deploy Mods',
  () => api.events.emit('deploy-mods', api.store.getState().settings.profiles.activeProfileId)
);
```

- `IconBar` renders `noCollapse` actions in an "uncollapsed" array that always renders.
- Without `noCollapse`, low-priority (high position number) actions collapse first.
- `collapse="force"` on `IconBar` overrides `noCollapse` and collapses everything.

---

## 12. `IconBar` Component Props

When rendering `IconBar` manually in a custom page:

```ts
interface IIconBarProps {
  group: string;          // action group name — matches registerAction group
  instanceId?: string | string[]; // ID(s) passed to action/condition callbacks
  staticElements?: IActionDefinition[]; // hardcoded buttons (not from registry)
  collapse?: boolean | 'force'; // collapse into "..." menu
  buttonType?: 'text' | 'icon' | 'both' | 'menu'; // how buttons render labels
  orientation?: 'horizontal' | 'vertical';
}
```

Minimal usage in a custom page header (no selection, stable instanceId):

```js
React.createElement(IconBar, {
  group: `${GAME_ID}-my-toolbar`,
  instanceId: GAME_ID,
})
```

---

## 13. `registerActionCheck` — NOT a UI Feature

The name sounds like it relates to UI action conditions, but it is not.

`context.registerActionCheck(actionType, check)` validates **Redux store actions** (dispatched actions, not UI button actions). It is a sanity-check hook for the Redux action pipeline.

Do not confuse with the `condition` parameter of `registerAction`.

---

## 14. Common Patterns for Game Extensions

### Open a URL from the Mods toolbar

```js
context.registerAction(
  'mod-icons', 400, 'open-ext', {},
  'Open Nexus Page',
  () => util.opn(`https://www.nexusmods.com/${NEXUS_DOMAIN}`).catch(() => null),
  () => selectors.activeGameId(context.api.getState()) === GAME_ID
);
```

### Show a dialog with info about selected mod

```js
context.registerAction(
  'mod-context-icons', 200, 'info', {},
  'Mod Details',
  (instanceIds) => {
    const state = context.api.getState();
    const mod = state.persistent.mods[GAME_ID]?.[instanceIds[0]];
    context.api.showDialog('info', mod?.attributes?.name ?? 'Mod', {
      text: `Version: ${mod?.attributes?.version ?? 'unknown'}`,
    }, [{ label: 'Close' }]);
  },
  (instanceIds) => {
    if (selectors.activeGameId(context.api.getState()) !== GAME_ID) return false;
    return instanceIds.length === 1 || 'Select exactly one mod';
  }
);
```

### Trigger a re-deploy

```js
context.registerAction(
  'mod-icons', 150, 'deploy', { noCollapse: true }, {},
  'Deploy Mods',
  () => {
    const profileId = selectors.activeProfile(context.api.getState())?.id;
    context.api.events.emit('deploy-mods', profileId);
  },
  () => selectors.activeGameId(context.api.getState()) === GAME_ID
);
```

### Refresh button on a custom page toolbar

```js
// registerAction approach:
context.registerAction(
  `${GAME_ID}-my-page-toolbar`, 100, 'refresh', {},
  'Refresh',
  () => reloadPageData(context.api),
  () => selectors.activeGameId(context.api.getState()) === GAME_ID
);
```

---

## 15. Real Examples in the Codebase

| Pattern | File | Notes |
| --- | --- | --- |
| Custom page toolbar group | `Vortex/src/renderer/src/extensions/file_based_loadorder/views/FileBasedLoadOrderPage.tsx:292` | `group="fb-load-order-icons"` with `staticElements` |
| Multirow footer | `Vortex/src/renderer/src/controls/Table.tsx:429` | `group="${tableId}-multirow-actions"` with `instanceId={selected}` |
| Single-row context | `Vortex/src/renderer/src/controls/table/TableRow.tsx:435` | `ActionDropdown` with `group="${tableId}-action-icons"` |
| Badge on page icon | `Vortex/src/renderer/src/extensions/download_management/index.ts` | `new ReduxProp(...)` passed as `badge:` to `registerMainPage` |
| noCollapse example | Any CB1 extension with `'mod-icons'` | See `mod-icons` calls in game-* index.js files |

---

## See also

`REGISTER_ACTION.md` (full `registerAction` signature, `IActionOptions`, condition-return-value
table). `VORTEX_MOD_LIST.md` (the Mods page table `mod-icons`/`mod-context-icons`/
`mods-multirow-actions` render onto). `VORTEX_REACT_PAGES.md` (custom pages that host their own
`IconBar` toolbar group). `LOAD_ORDER_REGISTRATION.md` (`fb-load-order-icons` toolbar group).
`TEMPLATES_OVERVIEW.md` (the universal `mod-icons` button set at priority 300) and
the per-template files under `templates/` (the extra buttons each template adds on top).
`STEAM_FILE_DOWNLOADER.md` (the third-party "Verify Files" button that appears in `mod-icons`
for every game carrying `details.steamAppId`).
