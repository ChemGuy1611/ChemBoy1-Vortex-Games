# Nexus Mods API Reference

Covers the v1 and v3 Nexus Mods APIs as used by the release pipeline and extension downloader.

---

## Authentication

All requests require header `apikey: {key}`. Key comes from the `NEXUS_API_KEY` environment
variable (with an HKCU registry fallback). Steps 4 and 5 of the upload flow hit S3 presigned URLs directly —
**no `apikey` header** on those requests.

**Rate limits (premium):** 20000 requests/day, 1500/hour. Check `X-RL-Daily-Remaining` and `X-RL-Hourly-Remaining` response headers.

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
header needed. `info.version` in that document is `3.0.0`. The spec documents a three-tier
stability system via `x-badges` on each operation: **Stable** (no badge — production ready, 90-day
minimum deprecation notice on any breaking change), **Beta** (feature-complete, 10-day minimum
deprecation notice), and **Experimental** (may change or be removed without notice — several
endpoints below are tagged this way; treat them as more likely to move than the unmarked ones).
Re-fetch this file to refresh the catalog below — see the memory `reference_nexus_api.md`
"How to Re-Verify" note for the exact command.

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

### V3 Endpoint Catalog (29 paths, confirmed against the live spec 2026-07-24)

Every path the live v3 API exposes, grouped by resource. `id` in a mod-file-scoped path is the
same value as `mod_files[].id` from `GET /mods/{id}/files` (what this repo calls the "file group"
id). Unwrapped rows return the schema directly as the response body; everything else is wrapped
in `{ "data": ... }`. **Experimental** tags are called out per-row — Nexus's own stability legend
says these "may change significantly or be removed" without the 90/10-day deprecation notice
stable/beta endpoints get.

#### Mods

| Method | Path | Operation | Notes |
| --- | --- | --- | --- |
| GET | `/games/{game_domain}/trending-mods` | `getTrendingMods` | Public top-5 trending feed, no auth-gated fields. Response: `{ mods: TrendingMod[] }` (`name`, `author?`, `summary?`, `picture_url?`, `mod_page_url`). |
| GET | `/games/{game_domain}/mods/{game_scoped_id}` | `getMod` | v3-native mod lookup — see identifier bridge above. |
| GET | `/mods/{id}/files` | `getModFiles` | The file-group listing this pipeline already uses. |
| PUT | `/mods/{id}/toggle-legacy-mod-requirements` | `toggleLegacyModRequirements` | Body `{ enabled: boolean }`, 204 on success. Switches a mod between mod-level and file-to-file requirements. |
| POST | `/mods/batch` | `getModsBatch` | Body `{ mod_ids: string[] }` (composite uids). Returns `{ data: { mods: ModDetail[] } }` — name/summary/status/thumbnail/adult_content per id; unknown ids simply contribute no row. |
| POST | `/mods/{id}/changelogs` | `addModChangelogEntries` | **Experimental.** Body `{ version, entries: string[] }` (1-50 entries, each non-empty; `version` matches `^[a-zA-Z0-9.-]+$`, max 50 chars). **Additive only** — repeated calls for the same version append further entries rather than replacing them. 201 response echoes `{ version, entries }`. This is the first public way to write mod-page changelog text; previously (per the "Documents editor" note below) it could only be done by hand on the site. Not yet wired into `release_extension.py --edit-changelog`, which still opens a browser. |
| GET | `/games/{game_domain}/dlcs` | `getGameDlcs` | **Experimental.** No auth required. Response `{ dlcs: [{ id, name, thumbnail_url }] }` — the DLC catalog for a game, used as the target list for the DLC-dependency endpoints below. |

#### Mod Files

A "mod file" is an update group/chain; `id` = group id.

| Method | Path | Operation | Notes |
| --- | --- | --- | --- |
| GET | `/mod-files/{id}` | `getModFile` | Returns `ModFileWithAggregates` (same shape as one entry of `getModFiles`). |
| PUT | `/mod-files/{id}` | `updateModFile` | Body `{ name: string }`, 204 on success. Renames the file group. |
| GET | `/mod-files/{id}/versions` | `getModFileVersions` | `{ data: { versions: ModFileVersion[] } }`. |
| POST | `/mod-files/{id}/versions` | `createModFileVersion` | **Current, non-deprecated way to publish a new file version.** See "V3 Multipart File Upload Flow" below — this replaces the deprecated Step 8. |
| POST | `/mod-files` | `createModFile` | Creates a brand-new file group (not a new version of an existing one) from a finalised upload. Body: `CreateModFileRequest` — `upload_id`, `mod_id` (uid), `name`, `version`, `description?`, `file_category`, `primary_mod_manager_download`, `allow_mod_manager_download`, `show_requirements_pop_up`, `update_mod_version`. |

#### Mod File Versions

| Method | Path | Operation | Notes |
| --- | --- | --- | --- |
| GET | `/mod-file-versions/{id}` | `getModFileVersion` | Single `ModFileVersion`. |
| GET | `/games/{game_domain}/mod-file-versions/{game_scoped_id}` | `getModFileVersionByGameScopedId` | Same shape, looked up by the game-scoped id shown in Nexus URLs. |
| POST | `/mod-file-versions/move` | `moveModFileVersions` | **Unwrapped response.** Reorders/moves versions (possibly across file groups) relative to a target version. Body: `{ version_ids: string[], target: { target_version_id, relative_placement: "before"\|"after" } }`. |
| POST | `/mod-file-versions/move-to-new-mod-file` | `moveModFileVersionsToNewModFile` | **Unwrapped response.** Same idea but spins up a brand-new file group named `mod_file_name` for the moved versions. |
| POST | `/mod-file-versions/batch` | `getModFileVersionsBatch` | Body `{ version_ids: string[] }`. Resolves each to its owning file group + name/version/position — only for versions on visible mods. |
| GET | `/mod-file-versions/{id}/dependencies` | `getModFileVersionDependencies` | Combined view: `{ dependency_definitions: [...], dlc_dependency_definitions: [...] }` — both mod-file range deps and DLC deps for one version in a single call. |
| GET | `/mod-file-versions/{id}/dependencies/ranges` | `getModFileVersionDependencyRanges` | **Unwrapped response.** Declared dependency ranges only (min/max version id pairs; OR within a definition, AND across definitions). |
| PUT | `/mod-file-versions/{id}/dependencies/ranges` | `setModFileVersionDependencyRanges` | Replaces all range definitions for a version. 204 on success. |
| GET | `/mod-file-versions/{id}/dependencies/ranges/materialized` | `getModFileVersionDependencyRangesMaterialized` | **Unwrapped response.** Ranges resolved into concrete candidate file+version lists, for one version. |
| POST | `/mod-file-versions/dependencies/ranges/materialized/batch` | `getModFileVersionDependencyRangesMaterializedBatch` | Current batch variant — paginated (`page`/`page_size`, default 1/1000), response includes `meta: PaginationMeta`. Batch-resolves install/recommend candidates for a set of source versions. |
| POST | `/mod-file-versions/dependencies/materialized/batch` | `getModFileVersionDependencyCandidatesBatch` | **Deprecated** (no removal date published as of 2026-07-24, unlike the group-version endpoint below). Superseded by the `ranges/materialized/batch` row above — same purpose, same request/response shape, just renamed. |
| GET | `/mod-file-versions/{id}/dependencies/dlc` | `getModFileVersionDlcDependencies` | `{ dlc_dependency_definitions: [{ id, dlc_targets: [{ id, dlc_id, name }] }] }` — declared DLC-dependency definitions (OR-alternatives within `dlc_targets`). |
| PUT | `/mod-file-versions/{id}/dependencies/dlc` | `setModFileVersionDependencyDlc` | Body `{ dlc_dependency_definitions: [{ dlc_ids: string[] }] }` — replaces the full set; empty array clears all DLC dependencies. `dlc_ids` must reference DLCs from `getGameDlcs` for that version's game. |
| POST | `/mod-file-update-groups/{group_id}/versions` | `createUpdateGroupVersion` | **Deprecated 2026-06-11, removal on/after 2026-09-09** (stable-tier endpoint, so it gets the full 90-day notice). See deprecation notice below. |

#### Uploads

| Method | Path | Operation | Notes |
| --- | --- | --- | --- |
| POST | `/uploads` | `createUpload` | Single-part upload (files ≤100 MiB). Body `{ filename, size_bytes }`. Response adds one `presigned_url` (PUT your whole file there, then finalise) — this pipeline always uses the multipart variant below instead, even for small files. |
| POST | `/uploads/multipart` | `createMultipartUpload` | What this pipeline uses; see Upload Flow below. |
| GET | `/uploads/{id}` | `getUpload` | Poll target. |
| POST | `/uploads/{id}/finalise` | `finaliseUpload` | |

#### Collections

Not currently used by this repo's pipeline — documented for completeness.

| Method | Path | Operation | Notes |
| --- | --- | --- | --- |
| POST | `/collections` | `createCollection` | Body `{ upload_id, collection_data: CollectionPayload }` claims a finalised upload (the collection's `.json`/binary manifest) into a new collection. `CollectionPayload` = `{ adult_content, collection_schema_id, collection_manifest: { info: {...}, mods: CollectionManifestMod[] } }`. |
| POST | `/collections/{id}/revisions` | `createCollectionRevision` | Same body shape, adds a new revision to an existing collection. |
| PATCH | `/collections/{id}` | `editCollection` | Body `{ name?, summary?, description?, category_id? }`, 204 on success. |

422 responses on the two collection-create endpoints may return either a plain `ProblemDetails`
or a `ValidationProblem` (`ProblemDetails` + `errors: [{ detail, pointer }]` — `pointer` is an
RFC 6901 JSON Pointer into the request body, e.g.
`/collection_data/collection_manifest/mods/0/source/mod_id`).

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
- `file_category` — enum `NewModFileCategory`; invalid values cause 422. Known valid: `"main"`.
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

**Request body** — same fields as the legacy body, plus one new one:

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

Most v3 endpoints wrap their success payload as `{ "data": { ... } }`, but four don't — the
payload is the response body directly: `GET /mod-file-versions/{id}/dependencies/ranges`,
`GET /mod-file-versions/{id}/dependencies/materialized`, `POST /mod-file-versions/move`, and
`POST /mod-file-versions/move-to-new-mod-file`. Check the specific operation before assuming
`response["data"]` — `nexus_v3_get`/`v3_get` in this repo always unwraps `["data"]`, which would
raise `KeyError` if pointed at one of these four.

---

### Known Broken V3 Endpoints (re-verified 2026-07-24)

| Endpoint | Problem |
| --- | --- |
| `GET /v3/mods/{v1_mod_id}/file-update-groups` | 404 — must use `uid`, not `mod_id` |
| `GET /v3/games/{domain}/mods/{mod_id}/file-update-groups` | 404 (was 500 as of 2026-05-26) |
| `GET /v3/mod-file-update-groups/{group_id}` | 404 (was 500 as of 2026-05-26) |
| `GET /v3/mods/{uid}/file-update-groups` | 404 even with correct `uid` — endpoint now defunct. **Use `GET /v3/mods/{uid}/files` instead** (returns the same group list under `mod_files[]`) |
| `GET /v3/openapi.yaml` | 404 — **not actually broken, wrong path.** The live spec is at the domain root, `GET https://api.nexusmods.com/openapi.yaml` (no `/v3/` prefix), confirmed reachable 2026-07-24 (HTTP 200, 29 paths, `info.version: "3.0.0"`). Corrected from an earlier note in this doc that called it dead. |
| `GET /v3/mods/{uid}` (mod-level, fetch by uid directly) | 404 — **not a bug; this path was never part of the spec.** The only mod-level GET in the live spec is `GET /v3/games/{game_domain}/mods/{game_scoped_id}` (by domain + game-scoped id, not uid). Confirmed against the live 29-path catalog 2026-07-24. |

The `/v3/mods/{uid}` and `/v3/openapi.yaml` rows were flagged broken in earlier passes based on
probing the wrong path or an unreachable mirror; re-checking against the real, fetchable spec
clears both. The remaining rows above are genuinely dead routes (405/404 with no live spec entry).
Nexus's unknown-route handler also switched from `500 Internal Server Error` to a proper
`404 Not Found` for these sometime between 2026-05-26 and 2026-07-24 — same non-functional
endpoints, different error signature. Upload-flow write steps (3-8) were not re-tested in this
pass; those are only exercised safely via a real `release_extension.py --upload` run.

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
`VORTEX_MOD_METADATA.md` (how Vortex uses the `md5_search` / `fileHashes` lookups to decide which
mod an archive belongs to).
