# Vortex Mods Page: Display and Filtering

How the Mods page (`ModList`) assembles its rows and how the underlying generic table engine (`SuperTable`) sorts, groups, filters, and persists column state.

---

## Row data: `IModWithState`

Each row is an `IModWithState` (`IMod & IProfileMod`):

- `IMod` — persistent, profile-independent mod record: `id`, `state`, `type`, `archiveId`, `installationPath`, `attributes`, `rules`, etc. Lives at `state.persistent.mods[gameId]`.
- `IProfileMod` — per-profile overlay: `enabled`, `enabledTime`, `disabledTime`. Comes from the active profile's `modState` map (`selectors.activeProfile(state).modState`).

`ModList` merges these client-side (`updateModsWithState`, debounced 500ms on prop change):

```ts
newModsWithState[modId] = {
  ...mods[modId],       // IMod fields first
  enabled: false,       // safe default
  ...modState[modId],   // IProfileMod fields override enabled/enabledTime/disabledTime
};
```

Finished-but-not-installed downloads for the active game are also synthesized into pseudo-mod rows (`state: "downloaded"`) so archives appear before install.

**Row grouping (variants):** mods sharing the same logical identity (matched by `modId`/`collectionSlug`, then `newestFileId`/`logicalFileName`) are collapsed into a single row via `groupMods()` (`util/modGrouping.ts`) — this produces `primaryMods`, the actual `data` passed to the table. Other installed versions of the same mod are reachable through the Version column's dropdown, not as separate rows. This is a different mechanism from the generic table's column-based `isGroupable` grouping (see below).

---

## Table columns (`ITableAttribute`)

Columns are plain objects matching `ITableAttribute` (calc/customRenderer, filter, sort, group, edit). Key columns defined in `ModList.tsx`:

| Column | Placement | Sort / Group / Filter | Notes |
|---|---|---|---|
| `picture` | detail | — | `ZoomableImage` + description |
| `enabled` | table | groupable; filter = `OptionsFilter` (Enabled/Disabled/Uninstalled) | inline-editable; cycles mod state via `setModState`/`cycleModState` |
| `name` | both | sortable (locale collator); default filter target; filter = `TextFilter` | editable filename unless mod is only downloaded |
| `version` | table | groupable (function: "Up-to-date" vs "Update available"); filter = `VersionFilter` | shows version dropdown for alternate installed versions; CSS class driven by update state |
| `author` | both | sortable; groupable; hidden by default | unions `attributes.author` + `attributes.uploader` |
| `archiveName` | both | sortable; groupable; hidden by default | looks up the source download's local path |
| `modSize` | table | sortable; hidden by default | on-demand folder-size calculation |
| `enabledTime` / `installTime` / `downloadTime` | both; hidden by default | sortable; filter = `DateTimeFilter` | date columns |

Other extensions contribute more columns to the same table (see "Cross-extension columns" below): category, endorsement/tracking/game/modId/collectionId, mod type, mod source/URL, INI edits, installer, collection membership.

---

## The generic table engine: `SuperTable`

`src/renderer/src/controls/Table.tsx` (default export `SuperTable`), with supporting pieces in `src/renderer/src/controls/table/` (`HeaderCell`, `TableRow`, `TableDetail`, `GroupingRow`, plus filter widgets `TextFilter`, `OptionsFilter`, `DateTimeFilter`, `NumericFilter`, `GameFilter`).

### Filtering

A column only participates in filtering if it has a `filter` object. For each row:

1. `dataId = attribute.filter.dataId || attribute.id` — which property to read off the row.
2. The value handed to `matches()` depends on `raw`:
   - `raw === false` → the **calculated** value (`calc()` output, cached).
   - `raw === true` → the **raw row value**: whole row object if `dataId === "$"`, else `row[dataId]`.
   - `raw` is a string → reach into a named sub-object first: `(row[raw] || {})[dataId]` (e.g. category filter uses `raw: "attributes"`).
3. Row survives only if every active filter's `matches(filterValue, value, state)` returns non-false. `state` is the full Redux store state, so filters can consult other rows/global data (e.g. counting sibling mods, resolving category trees).

### Sorting

Only one column sorts at a time (setting a new sort column resets the others). Precedence:

1. `sortFunc(calcLhs, calcRhs, locale)` — operates on calculated values.
2. else `sortFuncRaw(rowLhs, rowRhs, locale)` — operates on raw row objects (needed when sorting requires context beyond the calculated cell, e.g. category hierarchy).
3. else a standard `<`/`===`/`>` comparison on calculated values.

Rows with an `undefined` calculated value are pushed to one end before comparison runs.

### Grouping (column-based)

Driven by the `groupBy` prop (persisted per table). The grouping key per row is `isGroupable(row, t)` if `isGroupable` is a function, else the row's calculated value for that column. Distinct group keys are collected and sorted (numeric or locale-aware). Array-valued groups (e.g. collection membership) use an empty-group sentinel for rows with no memberships.

### Calculated-value caching

`calc()` results are cached per row and only recomputed when the row object reference changes — unless the column sets `isVolatile: true`, or registers an `externalData` callback that can invalidate its own column on demand. Columns that read state outside the row itself (a linked download's timestamp, a linked category's name) need one of these two escape hatches or they'll go stale.

### Column visibility & persistence

The gear-icon menu lists all `isToggleable` columns. Toggling one dispatches `setAttributeVisible(tableId, attributeId, visible)`. All of this — column visibility, sort column/direction, filter values, `groupBy`, collapsed groups — lives in `state.settings.tables[tableId]`, one of the persisted (not session-only) state hives, keyed by the table's id string (e.g. `"mods"`). It survives app restarts.

---

## Filter widget reference

| Filter | `raw` | Typical `dataId` | Matches against |
|---|---|---|---|
| `TextFilter` | `false` | attribute id | calculated display string, substring search (optional case-insensitive) |
| `OptionsFilter` | `true` (can be forced `false`) | attribute id | raw value against a fixed choice list; supports single/multi-select and array-valued rows |
| `VersionFilter` | `true` | `"$"` (whole row) | preset tokens (`has-update`, `missing-meta`) plus arbitrary version strings |
| `DateTimeFilter` | `false` | attribute id | calculated `Date`, rounded to day, against `{ comparison: "eq"\|"ge"\|"le", value }` |
| `CategoryFilter` | `"attributes"` (string form) | `"category"` | category parent chain, plus `*`-prefixed free-text search |

---

## Cross-extension columns: `registerTableAttribute`

`context.registerTableAttribute(tableId: string, attribute: ITableAttribute)` lets any extension add a column to any table, matched purely by the shared `tableId` string (e.g. `"mods"`). Registrations made during extension init are recorded and replayed; a `SuperTable` instance only picks up attributes registered under the exact `tableId` it was rendered with. This is how category, Nexus integration, mod type, mod source, INI edits, installer type, and collection-membership columns all end up on the same Mods page table without `mod_management` needing to know about them directly.

Any other `tableId` (downloads table, plugins table, etc.) is a fully independent namespace — extensions just need to agree on the literal string.

---

## See also

`VORTEX_APP.md` (repo/app overview, runtime subsystem index) · `REGISTER_ACTION.md` (`mod-icons`/`mod-context-icons`/`mods-multirow-actions` groups render on this table's toolbar and row context menus) · `STATE_HELPERS.md` (`getSafe` used throughout ModList's calc/filter code).
