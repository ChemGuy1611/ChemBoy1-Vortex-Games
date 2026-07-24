# Nexus Mods File Object Properties

Properties returned by the mod files endpoints:

- `GET /v1/games/{domain}/mods/{mod_id}/files.json`
- `GET /v1/games/{domain}/mods/{mod_id}/files/{file_id}.json`

**Auth:** header `apikey: {key}` required on all requests.  
**Rate limit:** 2500 requests/day (free tier). Check `X-RL-Daily-Remaining` response header.

The list endpoint returns the wrapper object below. The single-file endpoint returns a bare `ModFile` object with no wrapper.

---

## Response Wrapper (list endpoint only)

| key | type | description |
| --- | --- | --- |
| `files` | `ModFile[]` | Array of file objects |
| `file_updates` | `FileUpdate[]` | Array of file update records |

---

## `files[]` — ModFile Object

| property | type | description |
| --- | --- | --- |
| `id` | `[number, number]` | Legacy tuple: `[file_id, game_id]` where `game_id` is the internal Nexus numeric game ID (not the domain string) |
| `uid` | `number` | Globally unique file identifier derived from the `id` tuple; treat as opaque — use `file_id` for all API calls |
| `file_id` | `number` | The file's ID on this mod page; use this for API calls |
| `name` | `string` | Display name shown on the mod page |
| `version` | `string` | Version string for this specific file |
| `mod_version` | `string` | Version of the mod at the time this file was uploaded |
| `category_id` | `number` | Numeric category; see table below |
| `category_name` | `string` | Human-readable category name (e.g. `"MAIN"`, `"ARCHIVED"`) |
| `is_primary` | `boolean` | `true` if this is the featured/primary file shown on the mod page |
| `file_name` | `string` | Actual filename used for the download (includes mod ID and version suffix) |
| `size` | `number` | File size in KB — legacy duplicate of `size_kb` |
| `size_kb` | `number` | File size in KB |
| `size_in_bytes` | `number` | File size in bytes |
| `uploaded_timestamp` | `number` | Unix timestamp (seconds) of upload |
| `uploaded_time` | `string` | ISO 8601 upload time (e.g. `"2018-02-11T03:50:50.000+00:00"`) |
| `description` | `string` | Short plain-text description for this file; may be empty string |
| `changelog_html` | `string \| null` | HTML changelog for this file version; `null` if not set |
| `external_virus_scan_url` | `string \| null` | VirusTotal scan URL; `null` if not scanned |
| `content_preview_link` | `string` | URL to a JSON document listing the archive's internal file tree |

### Notes

- `category_id === 1` is the conventional filter for MAIN files when auto-downloading.
- `is_primary` marks the single file the mod page highlights; there may be zero or one per mod.
- `size` and `size_kb` always have the same value; prefer `size_in_bytes` for precision.
- `id[1]` is the internal Nexus numeric game ID, **not** the domain string used in API paths.
- `description` is plain text; `changelog_html` is HTML — treat them differently when rendering.

---

### `content_preview_link` Response Shape

The URL resolves to a JSON document describing the archive's internal file tree:

| key | type | description |
| --- | --- | --- |
| `name` | `string` | Archive filename |
| `children` | `FileNode[]` | Top-level entries in the archive |

Each `FileNode`:

| key | type | description |
| --- | --- | --- |
| `path` | `string` | Full path within the archive |
| `name` | `string` | Entry name |
| `type` | `"file" \| "directory"` | Node type |
| `size` | `number \| null` | Size in bytes; `null` for directories |
| `children` | `FileNode[] \| null` | Sub-entries; `null` for files |

---

## `file_updates[]` — FileUpdate Object

Describes a supersession relationship between two files (old -> new).

| property | type | description |
| --- | --- | --- |
| `old_file_id` | `number` | ID of the file being superseded |
| `new_file_id` | `number` | ID of the file that replaces it |
| `old_file_name` | `string` | Filename of the old file |
| `new_file_name` | `string` | Filename of the new file |
| `uploaded_timestamp` | `number` | Unix timestamp (seconds) when the new file was uploaded |
| `uploaded_time` | `string` | ISO 8601 upload time of the new file |

### Usage — Walking the Update Chain

To find the latest file ID for a given starting file:

```js
function getLatestFileId(startId, updates) {
  let current = startId;
  let next = updates.find(u => u.old_file_id === current);
  while (next) {
    current = next.new_file_id;
    next = updates.find(u => u.old_file_id === current);
  }
  return current;
}
```

Cycles are not expected but guard with a `visited` set if robustness is needed.

---

## Downloaded Archive Filename Convention

Current Nexus-downloaded archive filenames follow a space-delimited pattern:

`{name} {gameScopedModId} {version} {timestamp} {slug}.{ext}`

An earlier dash-delimited format is still present on any mod that hasn't been
re-downloaded since the change:

`{name}-{gameScopedModId}-{version}-{timestamp}-{slug}.{ext}`

`gameScopedModId` is the mod's ID within its game's domain (same value as
`mod.attributes.modId` on an installed Vortex mod, and the 2nd argument of
Vortex's `mod-update` event) — stable across every version of that mod, even
though the surrounding tokens (version, timestamp) differ per upload. Vortex's
own local mod ID (the key used in `state.persistent.mods`) is derived from
this filename with only OS-invalid characters masked — spaces and dashes both
pass through untouched.

**The convention is stamped per mod at download time, not system-wide.** An
already-installed mod's local ID keeps whichever convention was active when
it was last downloaded, so a system can have both dash-delimited (older
installs) and space-delimited (recent downloads) local IDs side by side.
Some very old or manually-tracked mods have no `gameScopedModId` token in
their local ID at all.

Because of this, code that needs to detect "is this install the same mod
being updated" should not parse the local ID string for either delimiter —
it should read the already-installed mod's `attributes.modId` directly from
`state.persistent.mods[gameId][modId]` and compare that. That value is set
at install time regardless of which filename convention was active, so it's
unaffected by future convention changes too.

---

## Nexus Mods File Category IDs

| category_id | name | typical use |
| --- | --- | --- |
| 1 | MAIN | Primary download; filter to this for auto-install |
| 2 | UPDATE | Patch/hotfix; may require a MAIN file already installed |
| 3 | OPTIONAL | Addons, patches, or extras the user selects manually |
| 4 | OLD_VERSION | Superseded by a newer upload but kept for rollback |
| 5 | MISCELLANEOUS | Utilities, docs, or assets not directly installed |
| 6 | *(deleted/removed)* | Removed by Nexus; never returned in active API responses |
| 7 | ARCHIVED | Mod author manually archived; excluded from most queries |

---

## Common Patterns

### Auto-download the primary MAIN file

```js
const mainFiles = files.filter(f => f.category_id === 1 && f.is_primary);
const file = mainFiles[0] ?? files.filter(f => f.category_id === 1)[0];
```

### Pick the latest version of a specific file

```js
const latestId = getLatestFileId(knownFileId, file_updates);
const latest = files.find(f => f.file_id === latestId);
```

### Sort files by upload date

```js
files.sort((a, b) => b.uploaded_timestamp - a.uploaded_timestamp);
```
