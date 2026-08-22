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
| `https://gamebanana.com/mmdl/{fileId}` | The one-click "install with mod manager" target; redirects exactly like `/dl/` |
| `https://gamebanana.com/{section}/download/{itemId}` | Human download page listing all files |
| `https://gamebanana.com/{section}/{itemId}` | Item profile page (e.g. `/tools/7475`, `/mods/428520`) |

The redirect chain for a current file, verified August 2026:

```text
https://gamebanana.com/dl/1765017
  302 -> https://files.gamebanana.com/tools/eternalmodinjector_e3b59.zip
  302 -> https://filecache40.gamebanana.com/tools/eternalmodinjector_e3b59.zip
  200    application/zip
```

Two things follow from it:

- **A stale file id does not fail loudly.** `/dl/{fileId}` for a file the submission has since replaced
  redirects to the submission's download *page* (`/{section}/download/{itemId}`) and returns HTML with a
  `200`. Anything holding a hardcoded file id — a fallback, a pin — therefore has to be checked against
  the API rather than trusted to error out.
- **The CDN URL carries no ids**, only the section and the file name, so a download captured at the CDN
  cannot be traced back to its submission from the URL alone. There is no endpoint that maps a file id
  to its item either: `apiv11/File/{fileId}` returns the file record with no parent field, and the Core
  API's `Url().sProfileUrl()` for a `File` returns a malformed URL (`gamebanana.com//{fileId}`).

The one-click links the site renders for registered managers take the form
`{manager}:https://gamebanana.com/mmdl/{fileId},{Model},{itemId}` — the only download link on the site
that names the submission it belongs to.

## Usage in Vortex Extensions

**`util.jsonRequest` does not work against this API.** GameBanana serves apiv11 responses with
`Content-Type: text/html` even though the body is JSON — verified live in August 2026 against
`ProfilePage`, `DownloadPage` and `Updates`, on repeated calls. (An occasional Cloudflare `BYPASS`
response is labelled `application/json`, which is why a one-off check can look fine.) Vortex's
`jsonRequest` accepts only `application/json` or `text/plain`; anything else is rejected before the
body is ever parsed, and the resulting `TemporaryError` carries the *response body* as its message,
so the failure reads like a successful fetch in a log.

Use `util.rawRequest` with a content type this API actually sends, and parse locally:

```js
const { util } = require('vortex-api');

const GB_CONTENT_TYPE = /^(application\/json|text\/html|text\/plain)/;

async function gamebananaJson(url) {
  const raw = await util.rawRequest(url, { expectedContentType: GB_CONTENT_TYPE, encoding: 'utf-8' });
  return JSON.parse(String(raw));
}

// Resolve the current file ID for a GameBanana tool at runtime
async function getLatestGamebananaFile(itemType, itemId) {
  const url = `https://gamebanana.com/apiv11/${itemType}/${itemId}/DownloadPage`;
  const data = await gamebananaJson(url);
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

For GitHub-hosted requirements, see `DOWNLOADER.md` — its version-resolution strategies are GitHub-specific, but the same download-then-install flow applies once a GameBanana URL is resolved.

## Shared gamebanana_downloader.js Module

`resources/downloader/gamebanana_downloader.js` packages the pattern above into a reusable requirements auto-downloader — the GameBanana counterpart to the GitHub `downloader.js` (see `DOWNLOADER.md`). It downloads and installs GameBanana-hosted requirements (mod injectors, tools, or frameworks), resolves each requirement's latest file via the apiv11 endpoints, and raises an "update available" notification when a newer file appears. Extracted from the DOOM Eternal extension's EternalModInjector downloader.

As with `downloader.js`, the canonical copy lives in `resources/downloader/` and each adopting extension bundles its own copy next to its `index.js` — changes to the canonical file must be propagated manually. Consumer wiring snippets live in `resources/downloader/template_gamebanana_downloader.js`.

### The requirement object

The entry points take an array of requirement objects (conventionally a `GB_REQUIREMENTS` constant in `index.js`), each describing one GameBanana-hosted requirement:

| Field | Required | Meaning |
| --- | --- | --- |
| `gbItemType` | yes | apiv11 model name in URL paths: `'Tool'`, `'Mod'`, `'Sound'`, ... |
| `gbItemId` | yes | GameBanana item id (e.g. `'7475'` from `gamebanana.com/tools/7475`). |
| `modType` | yes | Vortex mod type id the requirement installs as; also the installed-detection key (any mod with this type counts as installed). |
| `userFacingName` | yes | Display name in notifications, on the download, and in the mod list (stamped as the mod's `customFileName`). |
| `fileNamePattern` | optional | RegExp tested against `_aFiles[]._sFile`, narrowing multi-file submissions (e.g. Windows/Linux variants) to this requirement's file. Default: the newest file. |
| `fallbackVersion` | optional | Version attribute to record when the API is unreachable. |
| `fallbackFileId` | optional | File id used to build a `https://gamebanana.com/dl/{fileId}` fallback link when the API is unreachable. Without it, an unreachable API fails the install with a manual-download error. |
| `fileIdAttribute` | optional | Mod attribute tracking the installed GameBanana file id for update checks. Default `'gamebananaFileId'`. |
| `versionPattern` | optional | RegExp whose capture group 1 is the version, run against the latest Updates title. Default `/\(Update\s+(.+?)\)/` (matches titles like `"2026-05-20 (Update 6.66 Rev 3 N)"`). |
| `pageUrl` | optional | Manual-download page opened on install failure. Default derived from `gbItemType`/`gbItemId` (e.g. `https://gamebanana.com/tools/7475`). |
| `autoInstall` | optional | `false` -> never install this requirement unattended; only an explicit user action (a toolbar button) installs it. Default installs a missing requirement automatically when the update check runs. |
| `pinVersion` | optional | Hold the requirement at this submission version instead of tracking the newest file. Requires `pinFileId`; without it the pin is ignored with a warning. See **Version pinning** below. |
| `pinFileId` | with `pinVersion` | The file id to install for the pinned version — the API has no version-to-file lookup, so the pin cannot be resolved without it. |

### Version pinning

`pinVersion` + `pinFileId` hold the requirement at one file instead of following the newest one. It is opt-in and unset by default. While the tracked `gamebananaFileId` equals `pinFileId`, `checkForGameBananaUpdate` returns **before making any request** — a pinned requirement costs nothing against the API. A pinned install skips the API entirely as well, since `https://gamebanana.com/dl/{fileId}` is a complete download URL on its own.

When the installed file is not the pinned one — including when nothing is installed — the module resolves the *pinned* file, never the newest. The notification reads "pinned version available" rather than "update available", because the user may be *ahead* of the pin and installing it is then a deliberate downgrade. `autoInstall` stays orthogonal: the pin says which file, `autoInstall` says whether anything installs unattended.

The same field name and behavior exist in all five downloader modules; `DOWNLOADER.md` has the cross-module table.

### Exports

| Export | Role |
| --- | --- |
| `downloadGameBanana(api, gameSpec, requirements, check = true)` | Download + install each requirement in the array (sequentially) via Vortex's download manager, then enable it, set its mod type, and record version + file id attributes. With `check = true` (default) it is a no-op for requirements already installed; pass `false` to (re)install/update. Main entry point — call in `setup()`. |
| `checkForGameBananaUpdate(api, gameSpec, requirements)` | For each requirement in the array: install it if it is missing (unless `autoInstall: false`), otherwise compare the tracked file id (or archive name, for mods installed before id tracking) against the latest apiv11 file; raise a warning notification with a Download action when newer. Call from a `check-mods-version` handler and after the `setup()` download. |
| `downloadGameBananaRequirement(api, gameSpec, requirement, check = true)` | Single-requirement variant of `downloadGameBanana`. |
| `checkForGameBananaUpdateRequirement(api, gameSpec, requirement)` | Single-requirement variant of `checkForGameBananaUpdate`. |
| `isGameBananaRequirementInstalled(api, gameId, requirement)` | Whether any mod with the requirement's mod type exists. |
| `getLatestGameBananaFile(requirement)` | Newest `_aFiles[]` record by `_tsDateAdded` (null if the API is unreachable). |
| `getLatestGameBananaVersion(requirement)` | Version parsed from the latest Updates title via `versionPattern` (null if unreachable). |

### Behaviors worth knowing

- **Source attribution.** A successful install sets the mod's `source` attribute to `'website'` and `url` to `pageUrl(requirement)` (the GameBanana item page) — Vortex renders this as a clickable "Source" link in the mod details panel.
- **The mod list shows `userFacingName`, not the archive name.** Vortex renders a mod as `customFileName || logicalFileName || fileName || name`, and the install pipeline stamps `fileName` with the downloaded archive — so the install also stamps `customFileName` from `userFacingName`. Written at install only, so it cannot overwrite a name the user set afterwards. Rendering rule: `VORTEX_MOD_LIST.md`.
- **API-unreachable fallback.** Both API helpers return `null` on failure. The installer then falls back to `fallbackFileId`/`fallbackVersion`; the update check silently skips (nothing to compare against).
- **No silent auto-update.** `checkForGameBananaUpdate` only notifies; the user-driven Download action performs the update via `downloadGameBananaRequirement(..., false)`.
- **Overlap guard.** A requirement whose install is already running is skipped (e.g. double-clicked toolbar action), keyed by mod type.
- **Install failure opens the page.** A failed download/install shows an error notification and opens `pageUrl` for a manual download.
- **Per-game pieces stay in `index.js`.** The mod type registration and the `registerInstaller` test/install pair for the requirement are not part of this module.
- **A missing requirement is installed by the update check.** The update check used to return early when the requirement was not installed, so a requirement the user removed (or never got) was never picked up again. It now installs it instead. Requirements that should only be installed by an explicit user action set `autoInstall: false`.
- **Updating disables the version it replaces.** An update installs a second mod entry rather than replacing the first, so the mod ids carrying the requirement's mod type are captured before the install and disabled once the new one lands (the newly installed id is skipped). Without this both copies stayed enabled and deployed on top of each other.

## Shared gamebanana_browser.js Module

`resources/browsers/gamebanana_browser.js` registers a Vortex page that embeds gamebanana.com itself
and turns a click on the site's download button into a managed install. It is the browsing counterpart
to the downloader above — the downloader installs requirements unattended, the browser serves a user
picking mods — and an extension can carry both, as `game-doometernal` does. The shared contract, the
adopter model and the claim chain are in `BROWSER_MODULES.md`; what is GameBanana-specific:

| Piece | How this source does it |
| --- | --- |
| Home URL | `/{gbSection}/games/{gbGameId}`, i.e. the game's mod section (`gbSection` defaults to `mods`) |
| Submission key | `Model-itemId` (`Mod-428520`), stored in the `gamebananaItem` mod attribute |
| Identity of a download | Not in the URL — the page records the submissions the user opens and matches a claimed download against them by file id or file name (see Direct Downloads above) |
| Resolution | One `ProfilePage` call per submission: `_aFiles` for the file, `_sVersion` for the version, `_aGame` for the game it belongs to |
| Version | `_sVersion`, else group 1 of `versionPattern` against the newest `Updates` title, else the file's `_tsDateAdded` as a date, else the file id |
| Update comparison | File id, numerically. Free-text versions make `semver` useless here |
| Dependencies | No resolvable graph, so nothing is offered alongside an install — but see `_aRequirements` below, which is structured enough for a best-effort requirement list |
| One-click links | `{manager}:https://gamebanana.com/mmdl/{fileId},{Model},{itemId}` is parsed when the user clicks it; Vortex is not a registered manager, so no button on the site will say "Vortex" |

The file id is stored in `gamebananaFileId` — deliberately the same attribute
`gamebanana_downloader.js` writes, so a submission installed by either route is recognised by both.

### `_aRequirements`

`ProfilePage` carries `_aRequirements` when the submitter filled it in: an array of `[label, url]`
pairs, **not** free prose.

```json
[["EternalModInjector", "https://gamebanana.com/tools/download/7475"]]
```

The URL is usually a submission download page (`/{section}/download/{itemId}`), which is the same
shape a submission page URL parser already handles — so the requirement resolves to a `Model-itemId`
identity without a second endpoint. Three limits decide what can be built on it (all verified against
the live API in August 2026):

- **Sparse.** Absent entirely on most submissions — 0 of the 25 newest site-wide and 0 of 12 recent
  DOOM Eternal mods carried one, while `Mod/428520` does. Treat a missing field as "no information",
  never as "no requirements".
- **Unversioned.** A pair names a submission, never a version, so "installed but too old" cannot be
  expressed.
- **Not always on-site.** The URL may point anywhere. Anything that does not parse as a GameBanana
  submission can only be shown to the user as a labelled link.

That is enough for a best-effort requirement list and not enough for a dependency graph.

## Caveats

- **`util.jsonRequest` rejects every response from this API** (`Content-Type: text/html`); use
  `util.rawRequest` as shown above. The failure is quiet: both shared modules kept working off their
  hardcoded fallback file id, and update checks reported nothing, for as long as it went unnoticed.
- No official rate-limit documentation; keep request volume low and cache results where possible.
- Field sets are not formally versioned — code should tolerate missing fields and fall back gracefully (e.g. to a hardcoded file ID).
- The `Generic_Game` filter requires GameBanana's own game ID (from `_aGame._idRow` or the game page URL), which is unrelated to Steam/Nexus IDs.

---

## See also

`VORTEX_DOWNLOAD_MGMT.md` (the `start-download`/`import-downloads` events `gamebanana_downloader.js`
hands off to). `VORTEX_MOD_INSTALL.md` (installing the downloaded requirement as a managed mod).
`MODWORKSHOP_API.md`, `MODDB_API.md`, and `THUNDERSTORE_API.md` (the other third-party mod hosts
this repo queries — ModWorkshop and Thunderstore both publish a machine-readable API spec and serve
direct download URLs; GameBanana and ModDB do not).
`BROWSER_MODULES.md` (the shared browser-module contract `gamebanana_browser.js` implements) and
`EMBEDDED_BROWSER.md` (the `Webview` control and the download capture chain it relies on).
`PCGAMINGWIKI_API.md` (game-metadata lookups, and another third-party site with its own
User-Agent/rate-limit rules).
`CODEBERG_API.md` (the Forgejo/Gitea release API — the opposite case to this one: its listing hands
back a complete unauthenticated download URL, so its module has no file-id resolution step at all).
`GITHUB_API.md` (the default requirement host, and the API `downloader.js` talks to).
