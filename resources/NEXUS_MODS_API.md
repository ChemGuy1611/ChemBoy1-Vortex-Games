# Nexus Mods API Reference

Covers the v1 and v3 Nexus Mods APIs as used by the release pipeline and extension downloader.

---

## Authentication

The v3 spec's global `security` block lists two schemes; either one satisfies a request:

| Scheme | Header | Notes |
| --- | --- | --- |
| `ApiKeyAuth` | `apikey: {key}` | What this repo's pipeline uses. Key comes from the `NEXUS_API_KEY` environment variable (with an HKCU registry fallback); personal keys are issued at `https://www.nexusmods.com/settings/api-keys`. |
| `BearerJwtAuth` | `Authorization: Bearer {jwt}` | Signed JWT — the OAuth path Vortex itself uses. Not used by this repo. |

Three v3 operations declare `security: []` and need no credentials at all:
`GET /vortex/extensions`, `GET /games/{game_domain}/dlcs`, and
`GET /games/{game_domain}/trending-mods`. Steps 4 and 5 of the upload flow hit S3 presigned URLs
directly — **no `apikey` header** on those either.

**Rate limits.** Premium keys get 20000 requests/day and **2000/hour** (read live from
`x-rl-daily-limit` / `x-rl-hourly-limit`, confirmed 2026-08-05). Free keys get 2500/day, dropping
to 100/hour once that daily allowance is spent. Every response carries `X-RL-Daily-Limit`,
`X-RL-Daily-Remaining`, `X-RL-Daily-Reset` and the `X-RL-Hourly-*` equivalents; breaching either
limit returns HTTP 429. `GET /v1/users/validate.json` does not count against the hourly limit.
Separately, nginx sheds requests above roughly 30/second, tolerating short bursts.

**User agent.** The v1 spec asks every application to send an identifying `User-Agent` naming the
app/library, its version, and system information, so Nexus can attribute traffic and debug
problems — Vortex sends `NexusApiClient/0.7.3 (Windows_NT 10.0.17134; x64) Node/8.9.3`, for
example. A browser-spoofing string still works but defeats the purpose.

---

## V1 API — `https://api.nexusmods.com/v1`

Response: direct object/array (no wrapper). Full spec (Swagger 2.0) is published on SwaggerHub:
[`NexusMods/nexus-mods_public_api_params_in_form_data/1.0`](https://app.swaggerhub.com/apis-docs/NexusMods/nexus-mods_public_api_params_in_form_data/1.0)
— raw JSON at `https://api.swaggerhub.com/apis/NexusMods/nexus-mods_public_api_params_in_form_data/1.0`
(`info.version: "1.0"`, 18 paths total). POST/DELETE endpoints send params as
`application/x-www-form-urlencoded` or `multipart/form-data`, not JSON.

**Currently used by this repo:**

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

**Rest of the v1 surface (not currently used by this repo, documented for completeness):**

| Endpoint | Description |
| --- | --- |
| `GET /games/{domain}/mods/updated.json` | Mods updated for a game in a given period (query params control the period) |
| `GET /games/{domain}/mods/latest_added.json` | Latest 10 added mods |
| `GET /games/{domain}/mods/latest_updated.json` | Latest 10 updated mods |
| `GET /games/{domain}/mods/trending.json` | Trending 10 mods |
| `GET /games/{domain}/mods/md5_search/{md5_hash}.json` | Look up mods/files by an MD5 hash of the archive |
| `GET /games/{domain}/mods/{mod_id}/changelogs.json` | Read-side counterpart to the new v3 `POST /mods/{id}/changelogs` (write) — returns all changelog entries for a mod |
| `POST /games/{domain}/mods/{id}/endorse.json` | Endorse a mod. Form field `version?` |
| `POST /games/{domain}/mods/{id}/abstain.json` | Un-endorse/abstain from a mod |
| `GET /games/{domain}/mods/{mod_id}/files/{id}/download_link.json` | Generate a download URL for a file. Query `key`/`expires` — **required for non-premium API keys**, and must come from the `.nxm` link the website issued (extract before calling); premium keys can omit them but the endpoint 403s for premium-gated direct use without visiting the site first. Premium responses return an array of mirrors, preferred one first. 410 if the link/key has expired. |
| `GET /user/tracked_mods.json` | List the current user's tracked mods |
| `POST /user/tracked_mods.json` | Track a mod — query `domain_name`, form `mod_id` |
| `DELETE /user/tracked_mods.json` | Untrack a mod — same params |
| `GET /user/endorsements.json` | All endorsements for the current API key |
| `GET /colourschemes.json` | Site colour schemes (cosmetic, no known use case here) |

---

## V3 API — `https://api.nexusmods.com/v3`

Mod/file management. Most responses wrap the payload in `{ "data": { ... } }` — a handful of
endpoints (noted in the catalog below) return the payload directly, unwrapped.

The full OpenAPI spec is live and fetchable at **`GET https://api.nexusmods.com/openapi.yaml`**
(root of the domain, not under `/v3/` — `GET /v3/openapi.yaml` 404s, which is what led earlier
notes here to conclude the spec was unreachable; it's just a different base path). No `apikey`
header needed. `info.version` in that document is `3.0.0`.

### Stability Tiers

The spec assigns every operation one of three stability tiers via an `x-badges` entry, and states
a different deprecation guarantee for each:

| Tier | Badge | Guarantee |
| --- | --- | --- |
| **Stable** | *(none)* | Production ready. Breaking changes get a minimum **90-day** deprecation period with migration guidance. Additive changes (new optional fields/parameters) can land at any time. |
| **Beta** | `Beta` | Feature complete, minor changes still possible. Minimum **10-day** deprecation period. No v3 operation currently carries this badge. |
| **Experimental** | `Experimental` | *"May change significantly or be removed. Not recommended for production."* No deprecation period is promised. |

The **Tier** column in each catalog table below records this per operation. Two facts worth
knowing before building on v3:

- **Only the `/uploads/*` and `/collections/*` families are Stable.** Every `mods`, `mod-files`,
  `mod-file-versions`, and `vortex` operation is Experimental.
- **That includes both endpoints the file-upload flow depends on** — Step 2
  (`GET /mods/{id}/files`) and Step 8 (`POST /mod-files/{id}/versions`). The deprecated legacy
  Step 8 (`POST /mod-file-update-groups/{group_id}/versions`) is a *Stable*-tier endpoint, so
  migrating off it moved the upload flow onto endpoints with no notice guarantee. This is
  unavoidable — the legacy path is scheduled for removal — but it means the upload flow should be
  re-verified against the live spec more often than a Stable-only integration would need.

Re-fetch `openapi.yaml` to refresh the catalog below; `check_nexus_api.py --check-spec` in this
repo does that and reports any drift against the counts recorded here.

### V1 to V3 Identifier Bridge

V3 uses a global `uid` (large int, e.g. `9856949946066`), **not** the per-domain integer
`mod_id` used in v1 URLs. Using a v1 `mod_id` in a v3 path returns `404 "Mod not found: {mod_id}"`.

Get the v3 uid via v1 (current pipeline approach):

```text
GET /v1/games/{domain}/mods/{mod_id}.json  ->  response["uid"]
```

A v3-native alternative also exists and returns the same id space directly:

```text
GET /v3/games/{game_domain}/mods/{game_scoped_id}  ->  response["data"]["id"]
```

(`Mod: { id, game_scoped_id, game_id, name }` — `id` is the composite uid.) Not currently used by
the pipeline; the v1 route stays the primary path since it's already wired up and unchanged.

Use `uid` for all v3 mod-scoped endpoints.

---

### V3 Endpoint Catalog (30 paths, confirmed against the live spec 2026-08-05)

Every path the live v3 API exposes, grouped by resource. `id` in a mod-file-scoped path is the
same value as `mod_files[].id` from `GET /mods/{id}/files` (what this repo calls the "file group"
id). Unwrapped rows return the schema directly as the response body; everything else is wrapped
in `{ "data": ... }`. The **Tier** column carries the operation's stability badge — see
"Stability Tiers" above for what each one guarantees.

#### Mods

| Method | Path | Operation | Tier | Notes |
| --- | --- | --- | --- | --- |
| GET | `/games/{game_domain}/trending-mods` | `getTrendingMods` | Experimental | **No auth** (`security: []`). Public trending feed. Response: `{ mods: TrendingMod[] }` (`name`, `author?`, `summary?`, `picture_url?`, `mod_page_url`). |
| GET | `/games/{game_domain}/mods/{game_scoped_id}` | `getMod` | Experimental | v3-native mod lookup — see identifier bridge above. |
| GET | `/mods/{id}/files` | `getModFiles` | Experimental | The file-group listing this pipeline already uses (upload flow Step 2). |
| PUT | `/mods/{id}/toggle-legacy-mod-requirements` | `toggleLegacyModRequirements` | Experimental | Body `{ enabled: boolean }`, 204 on success. Switches a mod between mod-level and file-to-file requirements. |
| POST | `/mods/batch` | `getModsBatch` | Experimental | Body `{ mod_ids: string[] }` (composite uids). Returns `{ data: { mods: ModDetail[] } }` — name/summary/status/thumbnail/adult_content per id; unknown ids simply contribute no row. |
| POST | `/mods/{id}/changelogs` | `addModChangelogEntries` | Experimental | Body `{ version, entries: string[] }` (1-50 entries, each non-empty; `version` matches `^[a-zA-Z0-9.-]+$`, max 50 chars). **Additive only** — repeated calls for the same version append further entries rather than replacing them. 201 response echoes `{ version, entries }`. This is the first public way to write mod-page changelog text; previously (per the "Documents editor" note below) it could only be done by hand on the site. Not yet wired into `release_extension.py --edit-changelog`, which still opens a browser. |
| GET | `/games/{game_domain}/dlcs` | `getGameDlcs` | Experimental | **No auth** (`security: []`). Response `{ dlcs: [{ id, name, thumbnail_url }] }` — the DLC catalog for a game, used as the target list for the DLC-dependency endpoints below. |

#### Mod Files

A "mod file" is an update group/chain; `id` = group id.

| Method | Path | Operation | Tier | Notes |
| --- | --- | --- | --- | --- |
| GET | `/mod-files/{id}` | `getModFile` | Experimental | Returns `ModFileWithAggregates` (same shape as one entry of `getModFiles`). |
| PUT | `/mod-files/{id}` | `updateModFile` | Experimental | Body `{ name: string }`, 204 on success. Renames the file group. |
| GET | `/mod-files/{id}/versions` | `getModFileVersions` | Experimental | `{ data: { versions: ModFileVersion[] } }`. |
| POST | `/mod-files/{id}/versions` | `createModFileVersion` | Experimental | **Current, non-deprecated way to publish a new file version** (upload flow Step 8). See "V3 Multipart File Upload Flow" below — this replaces the deprecated legacy Step 8. |
| POST | `/mod-files` | `createModFile` | Experimental | Creates a brand-new file group (not a new version of an existing one) from a finalised upload. Body: `CreateModFileRequest` — required `upload_id`, `mod_id` (uid), `name`, `version`, `file_category`; optional `description?`, `primary_mod_manager_download` (default `false`), `allow_mod_manager_download` (default **`true`**), `show_requirements_pop_up` (default `false`), `update_mod_version` (default `false`). Same `name`/`version` patterns and 50-char caps as `createModFileVersion`. |

#### Mod File Versions

| Method | Path | Operation | Tier | Notes |
| --- | --- | --- | --- | --- |
| GET | `/mod-file-versions/{id}` | `getModFileVersion` | Experimental | Single `ModFileVersion`. |
| GET | `/games/{game_domain}/mod-file-versions/{game_scoped_id}` | `getModFileVersionByGameScopedId` | Experimental | Same shape, looked up by the game-scoped id shown in Nexus URLs. |
| POST | `/mod-file-versions/move` | `moveModFileVersions` | Experimental | **Unwrapped response.** Reorders/moves versions (possibly across file groups) relative to a target version. Body: `{ version_ids: string[], target: { target_version_id, relative_placement: "before"\|"after" } }`. |
| POST | `/mod-file-versions/move-to-new-mod-file` | `moveModFileVersionsToNewModFile` | Experimental | **Unwrapped response.** Same idea but spins up a brand-new file group named `mod_file_name` for the moved versions. |
| POST | `/mod-file-versions/batch` | `getModFileVersionsBatch` | Experimental | Body `{ version_ids: string[] }`. Resolves each to its owning file group + name/version/position — only for versions on visible mods. |
| GET | `/mod-file-versions/{id}/dependencies` | `getModFileVersionDependencies` | Experimental | **Unwrapped response.** Combined view: `{ dependency_definitions: [...], dlc_dependency_definitions: [...] }` — both mod-file range deps and DLC deps for one version in a single call. |
| GET | `/mod-file-versions/{id}/dependencies/ranges` | `getModFileVersionDependencyRanges` | Experimental | **Unwrapped response.** Declared dependency ranges only (min/max version id pairs; OR within a definition, AND across definitions). |
| PUT | `/mod-file-versions/{id}/dependencies/ranges` | `setModFileVersionDependencyRanges` | Experimental | Replaces all range definitions for a version. 204 on success. |
| GET | `/mod-file-versions/{id}/dependencies/ranges/materialized` | `getModFileVersionDependencyRangesMaterialized` | Experimental | **Unwrapped response.** Ranges resolved into concrete candidate file+version lists, for one version. |
| POST | `/mod-file-versions/dependencies/ranges/materialized/batch` | `getModFileVersionDependencyRangesMaterializedBatch` | Experimental | Current batch variant — paginated (`page`/`page_size`, default 1/1000), response includes `meta: PaginationMeta`. Batch-resolves install/recommend candidates for a set of source versions. |
| POST | `/mod-file-versions/dependencies/materialized/batch` | `getModFileVersionDependencyCandidatesBatch` | Deprecated | Still no removal date published as of 2026-08-05, unlike the group-version endpoint below. Superseded by the `ranges/materialized/batch` row above — same purpose, same request/response shape, just renamed. |
| GET | `/mod-file-versions/{id}/dependencies/dlc` | `getModFileVersionDlcDependencies` | Experimental | **Unwrapped response.** `{ dlc_dependency_definitions: [{ id, dlc_targets: [{ id, dlc_id, name }] }] }` — declared DLC-dependency definitions (OR-alternatives within `dlc_targets`). |
| PUT | `/mod-file-versions/{id}/dependencies/dlc` | `setModFileVersionDependencyDlc` | Experimental | Body `{ dlc_dependency_definitions: [{ dlc_ids: string[] }] }` — replaces the full set; empty array clears all DLC dependencies. `dlc_ids` must reference DLCs from `getGameDlcs` for that version's game. |
| POST | `/mod-file-update-groups/{group_id}/versions` | `createUpdateGroupVersion` | Stable (deprecated) | **Deprecated 2026-06-11, removal on/after 2026-09-09** — a Stable-tier endpoint, so it gets the full 90-day notice. See deprecation notice below. |

#### Uploads

The only Stable-tier family alongside Collections — the whole upload half of the publish flow is
Stable; only the two mod-file endpoints that bracket it are Experimental.

| Method | Path | Operation | Tier | Notes |
| --- | --- | --- | --- | --- |
| POST | `/uploads` | `createUpload` | Stable | Single-part upload (files ≤100 MiB). Body `{ filename, size_bytes }`. Response adds one `presigned_url` (PUT your whole file there, then finalise) — this pipeline always uses the multipart variant below instead, even for small files. |
| POST | `/uploads/multipart` | `createMultipartUpload` | Stable | What this pipeline uses; see Upload Flow below. |
| GET | `/uploads/{id}` | `getUpload` | Stable | Poll target. |
| POST | `/uploads/{id}/finalise` | `finaliseUpload` | Stable | |

#### Collections

Not currently used by this repo's pipeline — documented for completeness.

| Method | Path | Operation | Tier | Notes |
| --- | --- | --- | --- | --- |
| POST | `/collections` | `createCollection` | Stable | Body `{ upload_id, collection_data: CollectionPayload }` claims a finalised upload (the collection's `.json`/binary manifest) into a new collection. `CollectionPayload` = `{ adult_content, collection_schema_id, collection_manifest: { info: {...}, mods: CollectionManifestMod[] } }`. |
| POST | `/collections/{id}/revisions` | `createCollectionRevision` | Stable | Same body shape, adds a new revision to an existing collection. |
| PATCH | `/collections/{id}` | `editCollection` | Stable | Body `{ name?, summary?, description?, category_id? }`, 204 on success. |

422 responses on the two collection-create endpoints may return either a plain `ProblemDetails`
or a `ValidationProblem` (`ProblemDetails` + `errors: [{ detail, pointer }]` — `pointer` is an
RFC 6901 JSON Pointer into the request body, e.g.
`/collection_data/collection_manifest/mods/0/source/mod_id`).

#### Vortex

| Method | Path | Operation | Tier | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vortex/extensions` | `getVortexExtensions` | Experimental | **No auth** (`security: []`). Nexus's published index of every Vortex extension, theme, and translation. Optional query `game_ids` — comma-separated Nexus *numeric* game IDs (e.g. `1,2,3`) — filters the `extensions` list to game extensions for those games; themes and translations are always returned in full. |

Response is `{ "data": { extensions: VortexExtension[], themes: VortexAsset[], translations: VortexAsset[] } }`.
All three lists are built from Nexus mod pages, so entries are keyed by `mod_id` + `file_id`
(one mod per extension, one file per version):

```json
{
  "name": "STAR WARS Battlefront 2 (2017) Vortex Extension CB1",
  "version": "1.0.3",
  "author_name": "ChemBoy1",
  "author_user_id": "3263034",
  "uploaded_at": "2026-07-02T13:50:47.000Z",
  "mod_id": "112",
  "file_id": "8398",
  "image_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co3wi7.jpg",
  "type": "game",
  "game_id": "2229"
}
```

`VortexExtension` adds `type` and `game_id` on top of the shared `VortexAsset` fields; themes and
translations carry the shared fields only. `type` is `game` when Nexus's code analysis of the
extension's `info.json` decides it targets a specific game (in which case `game_id` holds that
game's Nexus numeric id), otherwise `other`. `image_url` is the mod page image, falling back to
the game artwork for game extensions, and is nullable.

**Field-presence caveat:** the spec describes `game_id` as "present only when `type` is `game`",
but the live response always includes the key and sets it to `null` for `other` entries. Read it
as nullable rather than optional.

Live snapshot (2026-08-05, unauthenticated): 664 extensions (557 `game`, 107 `other`), 16 themes,
15 translations.

Because it needs no API key and returns the currently published `version` for every extension in
one call, this endpoint is a cheap way to cross-check a whole repo of extensions against what is
actually live on Nexus, without per-mod v1 requests counting against a key's rate limit.

---

## V3 Multipart File Upload Flow

Full working flow confirmed 2026-05-26. Used by `release_extension.py --upload`.

> **Deprecation notice, migrated 2026-07-24:** Step 8 used to be
> `POST /v3/mod-file-update-groups/{group_id}/versions` (operation `createUpdateGroupVersion`),
> deprecated by Nexus since 2026-06-11 and scheduled for removal on or after **2026-09-09**.
> `nexus_upload.py`, `release_extension.py`, and `check_nexus_api.py` now call the replacement,
> `POST /v3/mod-files/{id}/versions` (operation `createModFileVersion`), which takes the **same
> `{id}`/`{group_id}` value** — see "Step 8 (current) vs. legacy" below. Nexus's own reference
> client (`Nexus-Mods/upload-action`) migrated to it on 2026-06-17. Verified live against the real
> API same session (`check_nexus_api.py --test-upload`, 28/28 checks passed). The legacy section
> below stays for historical reference until Nexus actually removes the endpoint.

### Upload Steps

| Step | Auth | Method | URL | Notes |
| --- | --- | --- | --- | --- |
| 1 | apikey | GET | `/v1/games/{domain}/mods/{mod_id}.json` | Extract `uid` |
| 2 | apikey | GET | `/v3/mods/{uid}/files` | List file groups under `mod_files[]` (id, name, is_active, versions_count...); pick one. `mod_files[].id` IS the group id. (The old `/v3/mods/{uid}/file-update-groups` path now 404s) |
| 3 | apikey | POST | `/v3/uploads/multipart` | Create upload session |
| 4 | none | PUT | `{part_presigned_url}` (S3) | Upload binary chunk; capture `ETag` |
| 5 | none | POST | `{complete_presigned_url}` (S3) | Send XML to assemble parts |
| 6 | apikey | POST | `/v3/uploads/{upload_id}/finalise` | Notify Nexus assembly complete |
| 7 | apikey | GET | `/v3/uploads/{upload_id}` | Poll until `state == "available"` |
| 8 | apikey | POST | `/v3/mod-files/{group_id}/versions` (current, what this repo calls as of 2026-07-24) — legacy `/v3/mod-file-update-groups/{group_id}/versions` deprecated, removal on/after 2026-09-09 | Create file version entry |

---

### Step 2 — File Groups Response (`GET /v3/mods/{uid}/files`)

```json
{
  "data": {
    "mod_files": [
      {
        "id": "7216945",
        "name": "My Extension",
        "is_active": true,
        "last_file_uploaded_at": "2026-05-20T10:00:00.000Z",
        "versions_count": 12,
        "archived_count": 3,
        "removed_count": 0
      }
    ]
  }
}
```

Filter to `is_active === true` only. The `id` is a string int and is the file group id used in
step 8. If multiple active groups exist, prompt the user to choose. (The retired
`/v3/mods/{uid}/file-update-groups` path returned the same objects under `groups[]` and now 404s.)

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

**Response `data` (HTTP 201):**

```json
{
  "id": "abc123-upload-id",
  "part_presigned_urls": ["https://s3.amazonaws.com/...?partNumber=1&...", "..."],
  "part_size_bytes": 52428800,
  "complete_presigned_url": "https://s3.amazonaws.com/...?uploadId=...",
  "state": "created",
  "user": { "id": "3263034" }
}
```

`part_presigned_urls` length determines how many S3 parts to upload. `part_size_bytes` is the
chunk size for each PUT except the final part (which may be smaller).

---

### Step 4 — Upload Parts (S3)

Read `part_size_bytes` bytes from the zip file per part. PUT each chunk to its presigned URL:

```text
PUT {part_presigned_url}
Content-Type: application/octet-stream
Content-Length: {chunk_length}

{raw binary chunk}
```

Capture the `ETag` response header and strip surrounding quotes. Store all ETags in order.

---

### Step 5 — Complete Multipart (S3)

```text
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

```text
POST /v3/uploads/{upload_id}/finalise
Content-Type: application/json

{}
```

Empty JSON body required. Signals Nexus to pick up the assembled S3 object.

---

### Step 7 — Poll Upload State

```text
GET /v3/uploads/{upload_id}
```

Poll `data.state` until `"available"`. Implementation backoff: `min(1.0 * 1.4^n, 20.0)` seconds,
30 attempts max. Known states: `"created"` (initial), `"pending"`, `"processing"`, `"available"`, `"failed"`.
Response also includes `"id"` (upload UUID) and `"user": {"id": "<user_id>"}` fields.

---

### Step 8 (legacy, deprecated) — Create Update Group Version

```text
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
  "allow_mod_manager_download": true,
  "show_requirements_pop_up": true
}
```

**Required fields** (422 if absent): `upload_id`, `name`, `version`, `file_category`

**Optional fields** (schema passes if absent, but `null` causes 422 for boolean fields): `description`, `archive_existing_file`, `primary_mod_manager_download`, `allow_mod_manager_download`, `show_requirements_pop_up`

**Field notes:**

- `name` — use the file group name verbatim; do not append version.
- `description` — changelog entry: bare date (`YYYY-MM-DD`) on first line, then bullet lines.
  No markdown heading, no version prefix.
- `file_category` — enum `NewModFileCategory`, whose full set of valid values is `"main"`,
  `"optional"`, and `"miscellaneous"`; anything else causes 422. Same enum on the current
  endpoint and on `createModFile`. This repo's `upload_zip()` takes it as a `file_category="main"`
  keyword argument. Note this publish-side enum is much smaller than the read-side
  `category_id` set returned by the v1 files endpoint (which also includes UPDATE, OLD_VERSION,
  and ARCHIVED — see `NEXUS_FILE_PROPERTIES.md`); those other states are reached by later
  archiving/superseding actions, not chosen at upload time.
- `allow_mod_manager_download`, `show_requirements_pop_up`, `primary_mod_manager_download` — all must be `true` or `false`; `null` causes 422 on any of them. Schema validates before upload state check.
- No `update_mod_version` field exists on this endpoint — this is why the "Mod Page Version Update" gap below applied to it.

**Response `data`** (flat — just the file group):

```json
{
  "id": "9876543210",
  "game_scoped_id": 12345,
  "name": "My Extension",
  "file_category": "main"
}
```

---

### Step 8 (current) — Create Mod File Version

```text
POST /v3/mod-files/{group_id}/versions
Content-Type: application/json
```

Same `{group_id}` value as the legacy endpoint (it's still the "mod file"/update-group id from
Step 2). Confirmed as the endpoint Nexus's own `upload-action` uses since 2026-06-17, and (as of
2026-07-24) what `nexus_upload.py`/`release_extension.py`/`check_nexus_api.py` in this repo use.
`name` must match `^[a-zA-Z0-9 _'().-]+$` (max 50 chars); `version` must match `^[a-zA-Z0-9.-]+$`
(max 50 chars) — from the live spec, not previously documented, not yet hit in practice.

**Request body** — same fields as the legacy body, plus two new ones (`update_mod_version` and
`previous_version_id`):

```json
{
  "upload_id": "abc123-upload-id",
  "name": "My Extension",
  "description": "2026-05-26\n- Fixed mod detection\n- Added support for DLC",
  "version": "1.2.3",
  "file_category": "main",
  "archive_existing_file": true,
  "primary_mod_manager_download": true,
  "allow_mod_manager_download": true,
  "show_requirements_pop_up": true,
  "update_mod_version": true
}
```

**New field:** `update_mod_version` (boolean, API default `false` if omitted) — when `true`,
updates the mod page's displayed version to match this file's `version`. This is the field that
closes the "Mod Page Version Update" gap noted below: it did not exist on the legacy endpoint, so
that update had to be done by hand on the Files tab; the new endpoint can do it in the same call
that publishes the file. **This repo's pipeline sends `true`** (`upload_zip()`'s
`update_mod_version` kwarg defaults to `True` as of 2026-07-24) — every upload now updates the mod
page version automatically; the manual Files-tab step is no longer needed for this.

**Second new field:** `previous_version_id` (string, nullable, optional) — the id of the mod file
version this upload replaces. Omitted by this repo's pipeline, which lets the API place the new
version at the head of the group's chain by default. Supply it to make the supersession explicit,
for example when publishing out of order or backfilling a version.

**Other body-field defaults** (from the live spec, applied when the field is omitted entirely):
`archive_existing_file` defaults to `false` and `update_mod_version` defaults to `false`. The
remaining booleans (`primary_mod_manager_download`, `allow_mod_manager_download`,
`show_requirements_pop_up`) declare no default on this endpoint — send them explicitly. Note that
`createModFile` (the new-file-group sibling) declares a *different* default set, including
`allow_mod_manager_download: true`; don't carry assumptions between the two.

**Response `data`** — nested, unlike the legacy flat shape:

```json
{
  "file": {
    "id": "9876543210",
    "game_scoped_id": 12345,
    "name": "My Extension",
    "file_category": "main"
  },
  "version": {
    "id": "<new version id>",
    "position": "12.0"
  }
}
```

Callers reading the old flat `id`/`name`/`file_category` fields off the top level need to switch
to `result.file.*`; the created version's own id is now available at `result.version.id` (the
legacy endpoint didn't return this at all).

---

### Mod Page Version Update — Now Available via the Current Endpoint

Previously (documented since 2026-05-29) there was no public API for the "Update mod page
version" checkbox on the Files tab — only the website's internal session-auth API could do it, so
it stayed a manual step after upload. As of the 2026-07-14 schema, `POST /v3/mod-files/{id}/versions`
(Step 8 current, above) and `POST /v3/mod-files` (`createModFile`, brand-new file groups) both take
`update_mod_version: boolean`. **This repo now sends `true` by default** — `nexus_upload.py`'s
`upload_zip()` has `update_mod_version=True` as its default (changed 2026-07-24, same day as the
migration itself), so `release_extension.py --upload` updates the mod page version automatically
on every publish. The manual Files-tab step for this is no longer needed. Pass
`update_mod_version=False` explicitly to `upload_zip()` to opt back out for a specific call — no
CLI flag exists for this, since the default now matches what the pipeline wants every time.

---

### Known Bugs (confirmed 2026-05-26, legacy endpoint)

The following fields were silently ignored by the legacy `mod-file-update-groups` endpoint —
accepted without error but with no effect:

- `primary_mod_manager_download`

**Note:** `allow_mod_manager_download` and `show_requirements_pop_up` were previously ignored but now work (confirmed 2026-06-03). Not re-tested against the new `mod-files/{id}/versions` endpoint — these were write-only checks and re-confirming them means actually publishing a file.

---

### Response Envelope Inconsistency

Most v3 endpoints wrap their success payload as `{ "data": { ... } }`, but **six** don't — the
payload is the response body directly. All six are in the mod-file-versions family:

- `GET /mod-file-versions/{id}/dependencies`
- `GET /mod-file-versions/{id}/dependencies/dlc`
- `GET /mod-file-versions/{id}/dependencies/ranges`
- `GET /mod-file-versions/{id}/dependencies/ranges/materialized`
- `POST /mod-file-versions/move`
- `POST /mod-file-versions/move-to-new-mod-file`

Check the specific operation before assuming `response["data"]` — `nexus_v3_get`/`v3_get` in this
repo always unwraps `["data"]`, which would raise `KeyError` if pointed at any of these six.

---

### Known Broken V3 Endpoints (all six re-verified live 2026-08-05)

| Endpoint | Problem |
| --- | --- |
| `GET /v3/mods/{v1_mod_id}/file-update-groups` | 404 — must use `uid`, not `mod_id` |
| `GET /v3/games/{domain}/mods/{mod_id}/file-update-groups` | 404 (was 500 as of 2026-05-26) |
| `GET /v3/mod-file-update-groups/{group_id}` | 404 (was 500 as of 2026-05-26) |
| `GET /v3/mods/{uid}/file-update-groups` | 404 even with correct `uid` — endpoint now defunct. **Use `GET /v3/mods/{uid}/files` instead** (returns the same group list under `mod_files[]`) |
| `GET /v3/openapi.yaml` | 404 — **not actually broken, wrong path.** The live spec is at the domain root, `GET https://api.nexusmods.com/openapi.yaml` (no `/v3/` prefix), confirmed reachable 2026-08-05 (HTTP 200, 30 paths, `info.version: "3.0.0"`). Corrected from an earlier note in this doc that called it dead. |
| `GET /v3/mods/{uid}` (mod-level, fetch by uid directly) | 404 — **not a bug; this path was never part of the spec.** The only mod-level GET in the live spec is `GET /v3/games/{game_domain}/mods/{game_scoped_id}` (by domain + game-scoped id, not uid). Confirmed against the live 30-path catalog 2026-08-05. |

The `/v3/mods/{uid}` and `/v3/openapi.yaml` rows were flagged broken in earlier passes based on
probing the wrong path or an unreachable mirror; re-checking against the real, fetchable spec
clears both. The remaining rows above are genuinely dead routes (405/404 with no live spec entry).
Nexus's unknown-route handler also switched from `500 Internal Server Error` to a proper
`404 Not Found` for these sometime between 2026-05-26 and 2026-07-24 — same non-functional
endpoints, different error signature; still 404 as of 2026-08-05. Upload-flow write steps (3-8)
have not been re-tested since the 2026-07-24 migration pass; those are only exercised safely via a
real `release_extension.py --upload` run.

**File group lookup (working):** `GET /v3/mods/{uid}/files` returns `{ data: { mod_files: [{ id, name, is_active, last_file_uploaded_at, versions_count, archived_count, removed_count }] } }`. Each `mod_files[].id` IS the file group id used by `POST /v3/mod-files/{group_id}/versions` (current) / the deprecated `POST /v3/mod-file-update-groups/{group_id}/versions`. This replaces the dead `/file-update-groups` list path.

**FILE_GROUP_ID override (fallback):** set `const FILE_GROUP_ID = <id>;` in the extension's index.js (id from the Nexus Files tab) to skip the lookup entirely and POST directly to the group. `release_extension.py` derives the publish `name` from the latest primary, non-ARCHIVED file in `GET /v1/games/{domain}/mods/{mod_id}/files.json`. Only needed if the `/files` lookup itself ever fails.

---

## V1 File Objects

Full `ModFile` / `FileUpdate` object shapes, the `content_preview_link` tree format, the file category ID table, and common download/sort patterns (auto-download primary MAIN file, walk the update chain, sort by upload date): see `NEXUS_FILE_PROPERTIES.md`.

---

## See also

`VORTEX_NEXUS_INTEGRATION.md` (OAuth/SSO login, `NXMUrl`, and the runtime client wired to these
endpoints). `NODE_NEXUS_API_CLIENT.md` documents a separate client library (`@nexusmods/nexus-api`)
that covers v1 REST + v2 GraphQL — it does not touch this v3 REST API at all.
`NEXUS_GRAPHQL_API.md` documents the **v2 GraphQL API** in full: introspection is open with no auth,
and it is the only tier that can read a mod's **tags** (no tier can write them). It is also where
the search/filter grammar and the batch mod/file lookups live.
`VORTEX_MOD_METADATA.md` (how Vortex uses the `md5_search` / `fileHashes` lookups to decide which
mod an archive belongs to).
`GITHUB_API.md` (the other API this project depends on - unauthenticated, 60 requests per hour
per IP, and the source of most modding requirements).
