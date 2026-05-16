# registerAction

Adds a button or menu item to a named group (toolbar, context menu, etc.). Works in both icon-string and custom-component forms.

---

## Signature

```js
context.registerAction(
  group,          // string — target slot (see Groups table below)
  position,       // number — render order within the group (lower = left/first)
  iconOrComponent,// string icon name OR React component
  options,        // IActionOptions (can be {})
  titleOrProps?,  // string title (icon form) OR PropsCallback (component form)
  actionOrCondition?, // action fn (icon form) OR condition fn (component form)
  condition?      // condition fn (icon form only)
)
```

---

## IActionOptions

| Field | Type | Description |
| --- | --- | --- |
| `noCollapse` | `boolean` | Prevent collapsing into overflow "..." menu |
| `namespace` | `string` | i18n namespace override |
| `hollowIcon` | `boolean` | Outline-only icon style |
| `isClassicOnly` | `boolean` | Visible only in classic layout |
| `isModernOnly` | `boolean` | Visible only in modern layout |

---

## Condition return values

| Return value | Meaning |
| --- | --- |
| `true` | Enabled |
| `false` | Hidden |
| `string` | Disabled; string shown as tooltip reason |

---

## Known group strings

| Group | Where it appears |
| --- | --- |
| `'mod-icons'` | Mods page toolbar (most common for game extensions) |
| `'mod-context-icons'` | Mods list single-row right-click menu |
| `'mods-multirow-actions'` | Mods list multi-row context actions |
| `'fb-load-order-icons'` | FBLO (file-based) load order page toolbar |
| `'generic-load-order-icons'` | Generic load order page toolbar |
| `'global-icons'` | Application header (always visible) |
| `'application-icons'` | Application header (often `isClassicOnly: true`) |
| `'downloads-action-icons'` | Downloads page per-row actions |
| `'downloads-multirow-actions'` | Downloads page multi-row actions |
| `'categories-icons'` | Categories page toolbar |
| `'extensions-layout-icons'` | Extensions page toolbar |
| `'game-managed-buttons'` | Games list row (managed game) |
| `'game-unmanaged-buttons'` | Games list row (unmanaged game) |

---

## Icon-string form (most common)

```js
context.registerAction(
  'mod-icons',          // group
  300,                  // position
  'open-ext',           // icon name (from icon font)
  {},                   // options
  'Open PCGamingWiki',  // title
  () => {               // action
    util.opn(PCGAMINGWIKI_URL).catch(() => null);
  }
);
```

## Icon-string form with condition

```js
context.registerAction(
  'mod-icons', 300, 'open-ext', {},
  'Open Config Folder',
  () => { util.opn(CONFIG_PATH).catch(() => null); },
  (instanceIds) => {
    const state = api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID
      ? true
      : 'Only available for this game';  // string = disabled with tooltip
  }
);
```

## Component form

```js
context.registerAction(
  'mod-icons',          // group
  105,                  // position
  ActivationButton,     // React component
  {},
  () => ({              // PropsCallback — returns props for the component
    t: api.translate,
    api,
  }),
  isGameActive         // condition fn (component form: 3rd arg becomes condition)
);
```

---

## Notes

- Always call inside `main(context)`, not inside `context.once()`.
- `position` is just render order — no semantic meaning beyond sorting.
- When passing a React component, `titleOrProps` must be a `PropsCallback` (function returning props object), not a string. The action is baked into the component.
- `condition` returning `false` hides the action entirely. Returning a string disables it and shows the string as a tooltip.
- Multiple actions can share the same group and position number; tie-breaking is insertion order.
