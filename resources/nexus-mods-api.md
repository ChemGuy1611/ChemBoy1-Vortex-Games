# Nexus Mods API Reference

Covers the v1 and v3 Nexus Mods APIs as used by the release pipeline and extension downloader.

---

## Authentication

All requests require header `apikey: {key}`. Env var `NEXUS_API_KEY` (registry fallback — see
`reference_env_vars.md`). Steps 4 and 5 of the upload flow hit S3 presigned URLs directly —
**no `apikey` header** on those requests.

**Rate limit:** 2500 requests/day (free tier). Check `X-RL-Daily-Remaining` response header.

---

## V1 API — `https://api.nexusmods.com/v1`

Response: direct object/array (no wrapper).

| Endpoint | Description |
| --- | --- |
| `GET /games.json` | All 4500+ games with domain names |
| `GET /games/{domain}.json` | Single game info |
| `GET /games/{domain}/mods/{mod_id}.json` | Mod details — includes `uid` for v3 bridge |
| `GET /games/{domain}/mods/{mod_id}/files.json` | Returns `{ files: ModFile[], file_updates: FileUpdate[] }` |
| `GET /games/{domain}/mods/{mod_id}/files/{file_id}.json` | Returns bare `ModFile` (no wrapper) |
| `GET /users/validate.json` | Validate API key |

`domain_name` = game identifier in URLs (`GAME_ID`). Match by `startswith`. Cache full games
list per run to stay under rate limit.

---

## V3 API — `https://api.nexusmods.com/v3`

Mod/file management. Experimental. Response: `{ "data": { ... } }`.

### V1 to V3 Identifier Bridge

V3 uses a global `uid` (large int, e.g. `9856949946066`), **not** the per-domain integer
`mod_id` used in v1 URLs. Using a v1 `mod_id` in a v3 path returns `404 "Mod not found: {mod_id}"`.

Get the v3 uid:

```
GET /v1/games/{domain}/mods/{mod_id}.json  ->  response["uid"]
```

Use `uid` for all v3 mod-scoped endpoints.

---

## V3 Multipart File Upload Flow

Full working flow confirmed 2026-05-26. Used by `release_extension.py --upload`.

### Upload Steps

| Step | Auth | Method | URL | Notes |
| --- | --- | --- | --- | --- |
| 1 | apikey | GET | `/v1/games/{domain}/mods/{mod_id}.json` | Extract `uid` |
| 2 | apikey | GET | `/v3/mods/{uid}/file-update-groups` | List active groups; pick one |
| 3 | apikey | POST | `/v3/uploads/multipart` | Create upload session |
| 4 | none | PUT | `{part_presigned_url}` (S3) | Upload binary chunk; capture `ETag` |
| 5 | none | POST | `{complete_presigned_url}` (S3) | Send XML to assemble parts |
| 6 | apikey | POST | `/v3/uploads/{upload_id}/finalise` | Notify Nexus assembly complete |
| 7 | apikey | GET | `/v3/uploads/{upload_id}` | Poll until `state == "available"` |
| 8 | apikey | POST | `/v3/mod-file-update-groups/{group_id}/versions` | Create file version entry |

---

### Step 2 — File Update Groups Response

```json
{
  "data": {
    "groups": [
      {
        "id": "7216945",
        "name": "My Extension",
        "is_active": true,
        "last_file_uploaded_at": "2026-05-20T10:00:00.000Z",
        "versions_count": 12
      }
    ]
  }
}
```

Filter to `is_active === true` only. The `id` is a string int. If multiple active groups exist,
prompt the user to choose.

---

### Step 3 — Create Upload Session

**Request body:**

```json
{
  "filename": "game-mygame.zip",
  "size_bytes": "123456"
}
```

`size_bytes` must be a string, not a number.

**Response `data`:**

```json
{
  "id": "abc123-upload-id",
  "part_presigned_urls": ["https://s3.amazonaws.com/...?partNumber=1&...", "..."],
  "part_size_bytes": 10485760,
  "complete_presigned_url": "https://s3.amazonaws.com/...?uploadId=..."
}
```

`part_presigned_urls` length determines how many S3 parts to upload. `part_size_bytes` is the
chunk size for each PUT except the final part (which may be smaller).

---

### Step 4 — Upload Parts (S3)

Read `part_size_bytes` bytes from the zip file per part. PUT each chunk to its presigned URL:

```
PUT {part_presigned_url}
Content-Type: application/octet-stream
Content-Length: {chunk_length}

{raw binary chunk}
```

Capture the `ETag` response header and strip surrounding quotes. Store all ETags in order.

---

### Step 5 — Complete Multipart (S3)

```
POST {complete_presigned_url}
Content-Type: application/xml

<CompleteMultipartUpload>
  <Part><PartNumber>1</PartNumber><ETag>etag1</ETag></Part>
  <Part><PartNumber>2</PartNumber><ETag>etag2</ETag></Part>
</CompleteMultipartUpload>
```

No auth header. Successful response has no meaningful body — check for HTTP 200.

---

### Step 6 — Finalise Upload

```
POST /v3/uploads/{upload_id}/finalise
Content-Type: application/json

{}
```

Empty JSON body required. Signals Nexus to pick up the assembled S3 object.

---

### Step 7 — Poll Upload State

```
GET /v3/uploads/{upload_id}
```

Poll `data.state` until `"available"`. Implementation backoff: `min(1.0 * 1.4^n, 20.0)` seconds,
30 attempts max. Intermediate states observed: `"pending"`, `"processing"`.

---

### Step 8 — Create File Version

```
POST /v3/mod-file-update-groups/{group_id}/versions
Content-Type: application/json
```

**Request body:**

```json
{
  "upload_id": "abc123-upload-id",
  "name": "My Extension",
  "description": "2026-05-26\n- Fixed mod detection\n- Added support for DLC",
  "version": "1.2.3",
  "file_category": "main",
  "archive_existing_file": true,
  "primary_mod_manager_download": true,
  "allow_mod_manager_download": false,
  "show_requirements_pop_up": true
}
```

**Field notes:**

- `name` — use the file group name verbatim; do not append version.
- `description` — changelog entry: bare date (`YYYY-MM-DD`) on first line, then bullet lines.
  No markdown heading, no version prefix.
- `allow_mod_manager_download` — **inverted legacy field**: send `false` to enable MMD,
  `true` to disable it. The polarity was never corrected when the API meaning changed.
- `show_requirements_pop_up` — must be `true` or `false`; `null` causes 422 error.

**Response `data`:**

```json
{
  "id": "9876543210",
  "game_scoped_id": 12345,
  "name": "My Extension",
  "file_category": "main"
}
```

---

### Known Bugs (confirmed 2026-05-26)

The following fields are silently ignored by the API — accepted without error but have no effect:

- `allow_mod_manager_download` — see polarity note above; still silently ignored as of 2026-05-26.
- `primary_mod_manager_download`
- `show_requirements_pop_up`

**Result:** every uploaded file has Mod Manager Download disabled regardless of what is sent.
No PATCH or PUT endpoint exists to fix this post-creation. Enable MMD manually on the Nexus
Files tab after upload.

These fields are still sent in the request body in case Nexus fixes the API.

---

### Known Broken V3 Endpoints (as of 2026-05-26)

| Endpoint | Problem |
| --- | --- |
| `GET /v3/mods/{v1_mod_id}/file-update-groups` | 404 — must use `uid`, not `mod_id` |
| `GET /v3/games/{domain}/mods/{mod_id}/file-update-groups` | 500 |
| `GET /v3/mod-file-update-groups/{group_id}` | 500 |
| `GET /v3/openapi.yaml` | 500 |

---

## V1 File Objects

### Response Wrapper (list endpoint only)

`GET /v1/games/{domain}/mods/{mod_id}/files.json` returns:

| key | type | description |
| --- | --- | --- |
| `files` | `ModFile[]` | Array of file objects |
| `file_updates` | `FileUpdate[]` | Array of file update records |

The single-file endpoint (`/files/{file_id}.json`) returns a bare `ModFile` with no wrapper.

---

### `ModFile` Object

| property | type | description |
| --- | --- | --- |
| `id` | `[number, number]` | Legacy tuple `[file_id, game_id]` where `game_id` is the internal Nexus numeric game ID (not the domain string) |
| `uid` | `number` | Globally unique file identifier derived from the `id` tuple; treat as opaque |
| `file_id` | `number` | The file's ID on this mod page; use for API calls |
| `name` | `string` | Display name shown on the mod page |
| `version` | `string` | Version string for this specific file |
| `mod_version` | `string` | Version of the mod at the time this file was uploaded |
| `category_id` | `number` | Numeric category; see table below |
| `category_name` | `string` | Human-readable category name (e.g. `"MAIN"`, `"ARCHIVED"`) |
| `is_primary` | `boolean` | `true` if this is the featured/primary file shown on the mod page |
| `file_name` | `string` | Actual download filename (includes mod ID and version suffix) |
| `size` | `number` | File size in KB — legacy duplicate of `size_kb` |
| `size_kb` | `number` | File size in KB |
| `size_in_bytes` | `number` | File size in bytes |
| `uploaded_timestamp` | `number` | Unix timestamp (seconds) |
| `uploaded_time` | `string` | ISO 8601 upload time (e.g. `"2018-02-11T03:50:50.000+00:00"`) |
| `description` | `string` | Short plain-text description; may be empty string |
| `changelog_html` | `string \| null` | HTML changelog for this file version; `null` if not set |
| `external_virus_scan_url` | `string \| null` | VirusTotal scan URL; `null` if not scanned |
| `content_preview_link` | `string` | URL to a JSON document listing the archive's internal file tree |

**Notes:**

- `category_id === 1` is the conventional filter for MAIN files when auto-downloading.
- `is_primary` marks the single highlighted file; there may be zero or one per mod.
- `size` and `size_kb` always match; prefer `size_in_bytes` for precision.
- `id[1]` is the internal Nexus numeric game ID, not the domain string used in API paths.
- `description` is plain text; `changelog_html` is HTML — render them differently.

---

### `content_preview_link` Response Shape

Resolves to a JSON document of the archive's internal file tree:

| key | type | description |
| --- | --- | --- |
| `name` | `string` | Archive filename |
| `children` | `FileNode[]` | Top-level entries |

Each `FileNode`:

| key | type | description |
| --- | --- | --- |
| `path` | `string` | Full path within the archive |
| `name` | `string` | Entry name |
| `type` | `"file" \| "directory"` | Node type |
| `size` | `number \| null` | Size in bytes; `null` for directories |
| `children` | `FileNode[] \| null` | Sub-entries; `null` for files |

---

### `FileUpdate` Object

Describes a supersession relationship (old file -> new file).

| property | type | description |
| --- | --- | --- |
| `old_file_id` | `number` | ID of the file being superseded |
| `new_file_id` | `number` | ID of the replacement file |
| `old_file_name` | `string` | Filename of the old file |
| `new_file_name` | `string` | Filename of the new file |
| `uploaded_timestamp` | `number` | Unix timestamp of the new file upload |
| `uploaded_time` | `string` | ISO 8601 upload time of the new file |

**Walking the update chain:**

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

### File Category IDs

| category_id | name | typical use |
| --- | --- | --- |
| 1 | MAIN | Primary download; filter to this for auto-install |
| 2 | UPDATE | Patch/hotfix; requires a MAIN file already installed |
| 3 | OPTIONAL | Addons or extras the user selects manually |
| 4 | OLD_VERSION | Superseded; kept for rollback |
| 5 | MISCELLANEOUS | Utilities, docs, or assets not directly installed |
| 6 | *(deleted)* | Removed by Nexus; never returned in active API responses |
| 7 | ARCHIVED | Manually archived by mod author; excluded from most queries |

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
