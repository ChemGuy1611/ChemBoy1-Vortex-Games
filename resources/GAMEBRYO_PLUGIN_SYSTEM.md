# Gamebryo Plugin Load Order System

Covers how Vortex manages plugin load ordering for Bethesda/Gamebryo games, including the two file format types, plugin metadata parsing, and LOOT integration.

**Primary source:** `Vortex\extensions\gamebryo-plugin-management\src\`

---

## 1. Supported Games

| Game | Format | ESL Support | Plugin Path |
| --- | --- | --- | --- |
| Oblivion | original | No | `%LOCALAPPDATA%\oblivion\` |
| Fallout 3 | original | No | `%LOCALAPPDATA%\Fallout3\` |
| Fallout: New Vegas | original | No | `%LOCALAPPDATA%\FalloutNV\` |
| Skyrim (original) | original | No | `%LOCALAPPDATA%\Skyrim\` |
| Skyrim Special Edition | fallout4 | Yes | `%LOCALAPPDATA%\Skyrim Special Edition\` |
| Skyrim VR | fallout4 | No | `%LOCALAPPDATA%\Skyrim VR\` |
| Fallout 4 | fallout4 | Yes | `%LOCALAPPDATA%\Fallout4\` |
| Fallout 4 VR | fallout4 | No | `%LOCALAPPDATA%\Fallout4VR\` |
| Starfield | fallout4 | Yes (+Medium, +Blueprint) | `%LOCALAPPDATA%\Starfield\` |
| Enderal | original | No | `%LOCALAPPDATA%\enderal\` |
| Enderal Special Edition | fallout4 | Yes | `%LOCALAPPDATA%\Enderal Special Edition\` |
| Oblivion Remastered | original | No | (UE5 game — custom plugins path) |

Game support config: `gamebryo-plugin-management\src\util\gameSupport.ts`

---

## 2. Plugin File Types

| Extension | Meaning | Flag Bit |
| --- | --- | --- |
| `.esm` | Master file | `0x00000001` (FLAG_MASTER) |
| `.esp` | Plugin file | (no dedicated flag) |
| `.esl` | Light plugin (ESL) | `0x00000200` (or `0x00000100` Starfield) |
| `.ghost` | Ghosted/disabled plugin | Appended to base filename (e.g. `Mod.esp.ghost`) |

Starfield adds two extra types:
- **Medium plugin** — `FLAG_MASTER` bit set on a `.esm` with special light limit
- **Blueprint plugin** — `0x00000800` flag; Starfield manages these itself, they are excluded from `plugins.txt` entirely

Plugin extension list is built by `pluginExtensions(gameMode)`:
- Games with ESL support: `['.esm', '.esp', '.esl']`
- Games without: `['.esm', '.esp']`

---

## 3. File Formats

### 3a. "original" format (Oblivion, Fallout 3/NV, Skyrim LE, Enderal)

Two separate files:

**`loadorder.txt`** (UTF-8) — all plugins in load order, one per line, no prefix:
```
Oblivion.esm
DLCBattlehornCastle.esp
MyMod.esp
```

**`plugins.txt`** (latin1) — only enabled plugins, one per line:
```
Oblivion.esm
MyMod.esp
```

When Vortex controls load order it sets file modification timestamps sequentially (1-day offsets from epoch `946684800`) so the game engine reads the correct order.

### 3b. "fallout4" format (Skyrim SE, Fallout 4, Starfield, Enderal SE)

Single file: **`plugins.txt`** (latin1) — all plugins, enabled ones prefixed with `*`:
```
*Skyrim.esm
*Update.esm
*DLC.esm
MyMod.esp
*AnotherMod.esl
```

Lines without `*` are known but disabled. `loadorder.txt` may also exist for compatibility but the `*`-prefix file is authoritative.

---

## 4. Native Plugins

Each game has a hardcoded list of native (game-bundled) plugins in `gameSupport.ts`. These are:
- Always placed at the beginning of the load order in a fixed sequence
- Not written to `plugins.txt` or `loadorder.txt`
- Never visible in Vortex's plugin list for user reordering

Additional native plugins can be loaded from `.ccc` files (e.g. `Skyrim.ccc`, `Fallout4.ccc`, `Starfield.ccc`) — these list Creation Club content that ships with the game.

Starfield DLC plugins also match via pattern: `sfbgs00[0-8].esm`.

---

## 5. ESP/ESM/ESL Binary Parsing

Source: `gamebryo-plugin-management\src\esp\ESPFile.ts`

Vortex reads only the `TES4` record header (first ~50-200 bytes) — not the full file. Subrecords parsed:

| Subrecord | Content |
| --- | --- |
| `HEDR` | Version and record count (numRecords == 0 means "dummy/empty") |
| `MAST` | Master file dependency list |
| `CNAM` | Author string |
| `SNAM` | Description string |

Flags extracted from TES4 record header:
```
FLAG_MASTER    = 0x00000001  -> isMaster
FLAG_LIGHT     = 0x00000200  -> isLight (ESL)  [0x00000100 on Starfield]
FLAG_BLUEPRINT = 0x00000800  -> isBlueprint (Starfield only)
```

---

## 6. Plugin Ghosting

Ghosted plugins are disabled without removing them from the load order or the filesystem.

- Normal: `SomeMod.esp`
- Ghosted: `SomeMod.esp.ghost`

Ghosted plugins are:
- Excluded from LOOT sort operations
- Not counted in the 255-plugin (or ESL slot) limits
- Still tracked in Vortex's internal state with `enabled: "ghost"`

---

## 7. Redux State

### Load order state path
```
state.persistent.loadOrder[profileId][pluginId] = ILoadOrder
```

### ILoadOrder shape
```ts
{
  enabled: boolean | "ghost",  // true = active, false = disabled, "ghost" = ghosted
  loadOrder: number,           // zero-based index position
}
```

### Plugin info state path
```
state.session.plugins.pluginList[pluginId] = IPlugin
```

### IPlugin shape
```ts
{
  modId?: string,        // originating Vortex mod id
  filePath: string,      // full path to plugin file
  isNative: boolean,     // game-bundled, never reorderable
  warnings?: { [key: string]: boolean },
  deployed?: boolean,
}
```

Reducers: `gamebryo-plugin-management\src\reducers\loadOrder.ts`, `plugins.ts`

---

## 8. PluginPersistor

Source: `gamebryo-plugin-management\src\util\PluginPersistor.ts`

Implements `types.IPersistor`. Responsibilities:
- Watch `plugins.txt` and `loadorder.txt` for external changes (file watcher)
- Deserialize files into Redux state on game activation
- Serialize Redux state back to files on any state change
- Debounce writes (200ms) to avoid rapid thrashing

**Deserialization flow:**
1. Read `loadorder.txt` (original) or `plugins.txt` (fallout4) for order
2. Read `plugins.txt` for enabled state
3. Merge with native plugin list (prepend, mark `isNative: true`)
4. Emit Redux update

**Serialization flow:**
1. Collect all plugins sorted by `loadOrder`
2. Skip Blueprint plugins (Starfield only)
3. Write `loadorder.txt` (all plugins, UTF-8)
4. Write `plugins.txt` — format depends on game:
   - original: only enabled, latin1
   - fallout4: all with `*` prefix for enabled, latin1
5. original format only: set file mtimes sequentially if controlling order

---

## 9. LOOT Integration

Source: `gamebryo-plugin-management\src\autosort.ts`

LOOT (Load Order Optimization Tool) provides automated plugin sorting and plugin metadata (tags, requirements, incompatibilities, dirty/clean status).

### 9a. LOOT Initialization

Triggered by `gamemode-activated` event:

1. `LootAsync.createAsync(gameId, gamePath, pluginPath, locale, callbacks)` — initializes libloot
2. Downloads/updates `masterlist.yaml` from GitHub (branch `v0.26`)
3. Downloads/updates `prelude.yaml` from GitHub (branch `v0.26`)
4. Calls `loot.loadListsAsync(masterlistPath, userlistPath, preludePath)`

**LOOT list file paths:**
| File | Path |
| --- | --- |
| masterlist | `{vortexUserData}/{gameId}/masterlist/masterlist.yaml` |
| userlist | `{vortexUserData}/{gameId}/userlist.yaml` |
| prelude | `{vortexUserData}/loot_prelude/prelude.yaml` |

### 9b. Game ID Mapping for LOOT

Some game IDs are remapped to their parent masterlist:

| Vortex game ID | LOOT masterlist |
| --- | --- |
| `fallout4vr` | `fallout4` |
| `skyrimvr` | `skyrimse` |
| `oblivionremastered` | `oblivion` |
| `enderal` | `enderal` (own masterlist) |
| `enderalspecialedition` | `enderalse` (own masterlist) |

### 9c. Sorting Flow

Triggered by `autosort-plugins` event or manual "Sort Now" button:

1. Collect all deployed, non-ghosted, non-native plugins
2. Call `loot.sortPluginsAsync(pluginNames)` — returns sorted name array
3. Dispatch `updatePluginOrder(sorted, false, autoEnable)` to update Redux
4. Show success notification

**Cyclic dependency handling:** LOOT detects cycles and returns a detailed error. Vortex visualizes the cycle and suggests which custom rule to remove.

### 9d. Plugin Metadata from LOOT

Metadata retrieved per-plugin via:
- `loot.getPluginMetadataAsync(pluginName)` — groups, custom rules
- `loot.getPluginAsync(pluginName)` — tags, archive loading, cleanliness

`IPluginLoot` shape:
```ts
{
  messages: Message[],                  // LOOT messages (warnings, info)
  cleanliness: PluginCleaningData[],    // ITM record count etc
  dirtyness: PluginCleaningData[],
  currentTags: Tag[],                   // applied Bash Tags
  suggestedTags: Tag[],                 // LOOT-recommended tags
  group: string,                        // LOOT group this plugin belongs to
  isValidAsLightPlugin: boolean,        // can be flagged .esl
  requirements: ILootReference[],       // required masters not present
  incompatibilities: ILootReference[],  // conflicting plugins
  loadsArchive: boolean,
  isEmpty: boolean,
  version: string,
}
```

### 9e. Userlist (Custom Rules)

Source: `gamebryo-plugin-management\src\util\UserlistPersistor.ts`

`userlist.yaml` stores user-defined LOOT rules (custom load order relationships, groups, messages). The UI allows adding/editing/removing these rules without editing YAML manually.

Userlist is loaded with the masterlist and affects LOOT sort output. Vortex monitors `userlist.yaml` mtime and reloads when it detects an external change.

---

## 10. Key Source Files

| File | Role |
| --- | --- |
| `gamebryo-plugin-management\src\index.ts` | Extension entry, event wiring, registration |
| `gamebryo-plugin-management\src\util\PluginPersistor.ts` | Read/write plugins.txt + loadorder.txt |
| `gamebryo-plugin-management\src\autosort.ts` | LOOT init, sort trigger, plugin details |
| `gamebryo-plugin-management\src\util\gameSupport.ts` | Per-game config, native plugin lists |
| `gamebryo-plugin-management\src\util\UserlistPersistor.ts` | userlist.yaml I/O |
| `gamebryo-plugin-management\src\util\masterlist.ts` | masterlist download/versioning |
| `gamebryo-plugin-management\src\esp\ESPFile.ts` | Binary TES4 record parser |
| `gamebryo-plugin-management\src\types\ILoadOrder.ts` | ILoadOrder interface |
| `gamebryo-plugin-management\src\types\IPlugins.ts` | IPlugin, IPluginCombined |
| `gamebryo-plugin-management\src\types\ILOOTList.ts` | LOOT masterlist/userlist structures |
| `gamebryo-plugin-management\src\reducers\` | Redux reducers for load order + plugin state |

All paths relative to `Vortex\extensions\`.
