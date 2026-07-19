# GameBanana API

GameBanana exposes two public, read-only JSON APIs. Neither requires authentication or an API key for read operations.

| API | Base URL | Status |
| --- | --- | --- |
| apiv11 | `https://gamebanana.com/apiv11/` | Current — powers the site itself |
| Core (legacy) | `https://api.gamebanana.com/` | Older but still functional; self-documenting at its base URL |

All endpoints below were verified live against the DOOM Eternal EternalModInjector tool page (`https://gamebanana.com/tools/7475`).

## Response Conventions

GameBanana uses Hungarian-style field prefixes throughout both APIs:

| Prefix | Type | Example |
| --- | --- | --- |
| `_s` | string | `_sName`, `_sDownloadUrl` |
| `_n` | number | `_nFilesize`, `_nDownloadCount` |
| `_b` | boolean | `_bHasUpdates`, `_bIsArchived` |
| `_ts` | Unix timestamp (seconds) | `_tsDateAdded`, `_tsDateUpdated` |
| `_a` | array or object | `_aFiles`, `_aGame` |
| `_idRow` | numeric record ID | the item/file/update ID |

Additional notes:

- Forward slashes in URLs are escaped (`https:\/\/...`) in the raw JSON; any JSON parser handles this transparently.
- Paginated endpoints wrap results in `{ "_aMetadata": { "_nRecordCount", "_nPerpage", "_bIsComplete" }, "_aRecords": [...] }`.
- Item models (used in URL paths): `Mod`, `Tool`, `Sound`, `Wip`, `Game`, `Member`, `File`, and others matching the site's section names.

## apiv11 Endpoints

### Item profile: `GET /apiv11/{Model}/{itemId}/ProfilePage`

Full submission record. Example: `https://gamebanana.com/apiv11/Tool/7475/ProfilePage`

Key fields:

- `_sName` — submission title (e.g. `"EternalModInjector [Windows]"`)
- `_tsDateUpdated`, `_nUpdatesCount`, `_bHasUpdates` — update tracking
- `_aFiles[]` — current downloadable files (see File record below)
- `_aGame` — `{ _idRow, _sName, _sAbbreviation, _sProfileUrl }` (e.g. DOOM Eternal = game ID `8756`)
- `_aCategory` — `{ _idRow, _sName, _sModelName }`
- `_sDownloadUrl` — download *page* URL (`https://gamebanana.com/tools/download/7475`), not a direct file
- `_aPreviewMedia._aImages[]` — screenshots with `_sBaseUrl` + `_sFile` variants (100/220/530/800 px)
- `_aTags[]`, `_sLicense`, `_aLicenseChecklist`

### Download info: `GET /apiv11/{Model}/{itemId}/DownloadPage`

Lightweight subset — ideal for update automation. Returns `_aFiles[]`, `_sLicense`, and `_sSubmitterInstructions` (HTML install instructions).

### File record (in `_aFiles[]`, or via `GET /apiv11/File/{fileId}`)

```json
{
  "_idRow": 1706519,
  "_sFile": "eternalmodinjector_b20ec.zip",
  "_nFilesize": 5177982,
  "_tsDateAdded": 1779267497,
  "_sDownloadUrl": "https://gamebanana.com/dl/1706519",
  "_sMd5Checksum": "3c53a6cc8fbef141f91b4dd6d382e940",
  "_sAnalysisState": "done",
  "_sAnalysisResult": "ok",
  "_sAvState": "done",
  "_sAvResult": "clean",
  "_bIsArchived": false,
  "_aAnalysisWarnings": { "contains_exe": ["EternalModManager.exe", "..."] }
}
```

`_sDownloadUrl` (`https://gamebanana.com/dl/{fileId}`) is the direct download link (redirects to the file CDN). `_sMd5Checksum` allows integrity verification. `_sAvResult: "clean"` indicates the antivirus scan passed.

When a submission has multiple files, select the newest by `_tsDateAdded` rather than assuming array order.

### Updates: `GET /apiv11/{Model}/{itemId}/Updates?_nPage=1&_nPerpage=3`

Paginated update history. Each record includes:

- `_sName` — update title; submitters commonly embed the version, e.g. `"2026-05-20 (Update 6.66 Rev 3 N)"`
- `_tsDateAdded`, `_sText`, `_aSubmitter`

### Section listing: `GET /apiv11/{Model}/Index?_nPerpage=15&_aFilters[...]=...&_sSort=...`

Paginated submission listing with filters. Verified examples:

- `_aFilters[Generic_Game]={gameBananaGameId}` — filter by game (e.g. `8756` for DOOM Eternal)
- `_aFilters[Generic_Category]={categoryId}` — filter by category
- `_sSort=Generic_LatestModified` — sort by last modified

Example: `https://gamebanana.com/apiv11/Mod/Index?_nPerpage=15&_aFilters%5BGeneric_Game%5D=8756&_sSort=Generic_LatestModified`

### Game feed: `GET /apiv11/Game/{gameId}/Subfeed?_nPage=1`

Recent submissions across all models for one game.

## Legacy Core API

Self-documenting: visiting `https://api.gamebanana.com/` lists all endpoints, and each endpoint has companion `AllowedItemTypes` / `AllowedFields` / `AllowedFilters` / `AllowedSorts` endpoints.

### `GET /Core/Item/Data`

Field-selector queries against a single item:

```text
https://api.gamebanana.com/Core/Item/Data?itemtype=Tool&itemid=7475&fields=name,Files().aFiles(),Updates().aGetLatestUpdates()&return_keys=1
```

- `fields` — comma-separated list; supports nested selectors like `Files().aFiles()`
- `return_keys=1` — return an object keyed by field name (omit for a positional array)
- `Updates().aGetLatestUpdates()` returns update titles plus a structured `_aChangeLog[]` (`{ text, cat }`) not present in the apiv11 Updates endpoint

### `GET /Core/List/New`

```text
https://api.gamebanana.com/Core/List/New?itemtype=Mod&gameid=8756&page=1
```

Returns newest submissions as positional pairs: `[["Mod", 678437], ["Mod", 510764], ...]`.

## Direct Downloads

| URL | Behavior |
| --- | --- |
| `https://gamebanana.com/dl/{fileId}` | Direct file download (HTTP redirect to CDN) |
| `https://gamebanana.com/{section}/download/{itemId}` | Human download page listing all files |
| `https://gamebanana.com/{section}/{itemId}` | Item profile page (e.g. `/tools/7475`, `/mods/428520`) |

## Usage in Vortex Extensions

`util.jsonRequest<T>(url)` from `vortex-api` fetches and parses JSON in one call — no extra dependencies needed:

```js
const { util } = require('vortex-api');

// Resolve the current file ID for a GameBanana tool at runtime
async function getLatestGamebananaFile(itemType, itemId) {
  const url = `https://gamebanana.com/apiv11/${itemType}/${itemId}/DownloadPage`;
  const data = await util.jsonRequest(url);
  const files = data._aFiles || [];
  if (files.length === 0) {
    throw new Error(`No files found for GameBanana ${itemType} ${itemId}`);
  }
  // Newest file wins when multiple are present
  files.sort((a, b) => b._tsDateAdded - a._tsDateAdded);
  return files[0]; // { _idRow, _sFile, _sDownloadUrl, _sMd5Checksum, ... }
}
```

Pair this with the item's `Updates` endpoint to extract a display version from the latest update title when needed.

For GitHub-hosted requirements, see [DOWNLOADER.md](DOWNLOADER.md) — its version-resolution strategies are GitHub-specific, but the same download-then-install flow applies once a GameBanana URL is resolved.

## Shared gamebanana_downloader.js Module

`resources/downloader/gamebanana_downloader.js` packages the pattern above into a reusable requirements auto-downloader — the GameBanana counterpart to the GitHub `downloader.js` (see [DOWNLOADER.md](DOWNLOADER.md)). It downloads and installs GameBanana-hosted requirements (mod injectors, tools, or frameworks), resolves each requirement's latest file via the apiv11 endpoints, and raises an "update available" notification when a newer file appears. Extracted from the DOOM Eternal extension's EternalModInjector downloader.

As with `downloader.js`, the canonical copy lives in `resources/downloader/` and each adopting extension bundles its own copy next to its `index.js` — changes to the canonical file must be propagated manually. Consumer wiring snippets live in `resources/downloader/template_gamebanana_downloader.js`.

### The requirement object

The entry points take an array of requirement objects (conventionally a `GB_REQUIREMENTS` constant in `index.js`), each describing one GameBanana-hosted requirement:

| Field | Required | Meaning |
| --- | --- | --- |
| `gbItemType` | yes | apiv11 model name in URL paths: `'Tool'`, `'Mod'`, `'Sound'`, ... |
| `gbItemId` | yes | GameBanana item id (e.g. `'7475'` from `gamebanana.com/tools/7475`). |
| `modType` | yes | Vortex mod type id the requirement installs as; also the installed-detection key (any mod with this type counts as installed). |
| `userFacingName` | yes | Display name in notifications and on the download. |
| `fileNamePattern` | optional | RegExp tested against `_aFiles[]._sFile`, narrowing multi-file submissions (e.g. Windows/Linux variants) to this requirement's file. Default: the newest file. |
| `fallbackVersion` | optional | Version attribute to record when the API is unreachable. |
| `fallbackFileId` | optional | File id used to build a `https://gamebanana.com/dl/{fileId}` fallback link when the API is unreachable. Without it, an unreachable API fails the install with a manual-download error. |
| `fileIdAttribute` | optional | Mod attribute tracking the installed GameBanana file id for update checks. Default `'gamebananaFileId'`. |
| `versionPattern` | optional | RegExp whose capture group 1 is the version, run against the latest Updates title. Default `/\(Update\s+(.+?)\)/` (matches titles like `"2026-05-20 (Update 6.66 Rev 3 N)"`). |
| `pageUrl` | optional | Manual-download page opened on install failure. Default derived from `gbItemType`/`gbItemId` (e.g. `https://gamebanana.com/tools/7475`). |

### Exports

| Export | Role |
| --- | --- |
| `downloadGameBanana(api, gameSpec, requirements, check = true)` | Download + install each requirement in the array (sequentially) via Vortex's download manager, then enable it, set its mod type, and record version + file id attributes. With `check = true` (default) it is a no-op for requirements already installed; pass `false` to (re)install/update. Main entry point — call in `setup()`. |
| `checkForGameBananaUpdate(api, gameSpec, requirements)` | For each requirement in the array, compare the tracked file id (or archive name, for mods installed before id tracking) against the latest apiv11 file; raise a warning notification with a Download action when newer. Call from a `check-mods-version` handler and after the `setup()` download. |
| `downloadGameBananaRequirement(api, gameSpec, requirement, check = true)` | Single-requirement variant of `downloadGameBanana`. |
| `checkForGameBananaUpdateRequirement(api, gameSpec, requirement)` | Single-requirement variant of `checkForGameBananaUpdate`. |
| `isGameBananaRequirementInstalled(api, gameId, requirement)` | Whether any mod with the requirement's mod type exists. |
| `getLatestGameBananaFile(requirement)` | Newest `_aFiles[]` record by `_tsDateAdded` (null if the API is unreachable). |
| `getLatestGameBananaVersion(requirement)` | Version parsed from the latest Updates title via `versionPattern` (null if unreachable). |

### Behaviors worth knowing

- **Source attribution.** A successful install sets the mod's `source` attribute to `'website'` and `url` to `pageUrl(requirement)` (the GameBanana item page) — Vortex renders this as a clickable "Source" link in the mod details panel.
- **API-unreachable fallback.** Both API helpers return `null` on failure. The installer then falls back to `fallbackFileId`/`fallbackVersion`; the update check silently skips (nothing to compare against).
- **No silent auto-update.** `checkForGameBananaUpdate` only notifies; the user-driven Download action performs the update via `downloadGameBananaRequirement(..., false)`.
- **Overlap guard.** A requirement whose install is already running is skipped (e.g. double-clicked toolbar action), keyed by mod type.
- **Install failure opens the page.** A failed download/install shows an error notification and opens `pageUrl` for a manual download.
- **Per-game pieces stay in `index.js`.** The mod type registration and the `registerInstaller` test/install pair for the requirement are not part of this module.

## Caveats

- No official rate-limit documentation; keep request volume low and cache results where possible.
- Field sets are not formally versioned — code should tolerate missing fields and fall back gracefully (e.g. to a hardcoded file ID).
- The `Generic_Game` filter requires GameBanana's own game ID (from `_aGame._idRow` or the game page URL), which is unrelated to Steam/Nexus IDs.
