# Thunderstore API

Thunderstore (`https://thunderstore.io`) hosts mods for hundreds of Unity and non-Unity games, one
*community* per game. Its read APIs are public JSON — no API key, no session, no bot protection
(a plain HTTP client with a default user agent works, unlike ModDB). Authentication is only needed
for write operations (rating, package submission, wiki edits, media upload).

Swagger UI: `https://thunderstore.io/api/docs/`. Machine-readable spec:
`https://thunderstore.io/api/docs/?format=openapi`.

| Family | Base path | Status |
| --- | --- | --- |
| v1 | `/api/v1/…`, `/c/{community}/api/v1/…` | Original public API; several endpoints marked deprecated but still served |
| experimental | `/api/experimental/…` | Despite the name, the most complete and widely used surface |
| cyberstorm | `/api/cyberstorm/…` | Powers the current site frontend; lightest payloads, paginated, filterable |
| ecosystem schema | `/api/experimental/schema/dev/latest/` | Single JSON describing every community, game, store ID, and mod loader |

All examples below were verified live on 2026-08-04 against the Hades II community
(`hades-ii`) and the `Hell2Modding-Hell2Modding` / `SGG_Modding-ENVY` packages.

## Core concepts

- **Community** — one game's mod site, keyed by a slug identifier (`hades-ii`, `valheim`,
  `lethal-company`). Browsable at `https://thunderstore.io/c/{community}/`.
- **Team / namespace** — the uploader (`SGG_Modding`). A package's `namespace` equals the owning
  team name.
- **Package** — a mod, identified by `{namespace}/{name}`. `full_name` = `Namespace-Name`.
- **Version** — semver-ish string. A version's `full_name` = `Namespace-Name-Version`
  (e.g. `SGG_Modding-ENVY-1.2.0`), which is also the format used inside `dependencies`.
- Packages are global to Thunderstore and *listed* into one or more communities; the same package
  can appear under several games.

## Reading package data

### Community metadata

| Endpoint | Returns |
| --- | --- |
| `GET /api/experimental/community/` | Cursor-paginated list of communities: `identifier`, `name`, `discord_url`, `wiki_url`, `require_package_listing_approval` |
| `GET /api/cyberstorm/community/{community}/` | Richer record: display `name`, image URLs, `total_download_count`, `total_package_count`, `has_mod_manager_support`, `is_listed` |
| `GET /api/experimental/community/{community}/category/` | Category list (`name`, `slug`) |
| `GET /api/cyberstorm/community/{community}/filters/` | Categories with numeric `id`s plus `sections` (each with a `uuid`) — the values the listing endpoint's filter parameters expect |

```text
https://thunderstore.io/api/cyberstorm/community/hades-ii/
→ {"name":"Hades 2","identifier":"hades-ii","total_package_count":205,
   "total_download_count":1039597,"has_mod_manager_support":true, ...}
```

### Package detail

| Endpoint | Notes |
| --- | --- |
| `GET /api/experimental/package/{namespace}/{name}/` | Package plus its `latest` version object and `community_listings[]` (`community`, `categories`, `review_status`) |
| `GET /api/experimental/package/{namespace}/{name}/{version}/` | One version |
| `GET /api/experimental/package/{namespace}/{name}/{version}/readme/` | `{"markdown": "…"}` |
| `GET /api/experimental/package/{namespace}/{name}/{version}/changelog/` | `{"markdown": null}` when the package ships no changelog |
| `GET /api/cyberstorm/listing/{community}/{namespace}/{name}/` | Listing view: adds `install_url`, `download_url`, `latest_version_number`, `version_count`, `dependency_count`, `dependant_count`, `size`, `team` |
| `GET /api/cyberstorm/package/{namespace}/{name}/versions/` | Every version: `version_number`, `datetime_created`, `download_count`, `download_url`, `install_url` |
| `GET /api/v1/package-metrics/{namespace}/{name}/` | `{"downloads", "rating_score", "latest_version"}` |
| `GET /api/v1/package-metrics/{namespace}/{name}/{version}/` | `{"downloads"}` |

Version objects (experimental) look like:

```json
{
  "namespace": "Hell2Modding",
  "name": "Hell2Modding",
  "version_number": "1.0.107",
  "full_name": "Hell2Modding-Hell2Modding-1.0.107",
  "description": "Lua Mod Loader for Hades 2",
  "icon": "https://gcdn.thunderstore.io/live/repository/icons/Hell2Modding-Hell2Modding-1.0.107.png",
  "dependencies": [],
  "download_url": "https://thunderstore.io/package/download/Hell2Modding/Hell2Modding/1.0.107/",
  "downloads": 3461,
  "date_created": "2026-07-21T17:19:47.133777Z",
  "website_url": "https://github.com/SGG-Modding/Hell2Modding/",
  "is_active": true
}
```

The v1 listing shape adds `uuid4` and `file_size` per version, which the experimental shape omits.

> `GET /api/experimental/package/{namespace}/{name}/` returns `rating_score: -1` and
> `total_downloads: -1` as placeholders — those counters are not computed on this endpoint. Use
> `/api/v1/package-metrics/…` or the cyberstorm listing endpoints for real numbers.

### Browsing and search

`GET /api/cyberstorm/listing/{community}/` is the practical way to search a community. It is
page-paginated (`count`, `next`, `previous`, `results`) and cheap — roughly 11 KB per page.

| Parameter | Values |
| --- | --- |
| `q` | Free-text search over package name/description |
| `ordering` | `last-updated` (default), `newest`, `most-downloaded`, `top-rated` |
| `page` | 1-based page number |
| `deprecated` | `True` / `False` (default `False`) |
| `nsfw` | `True` / `False` (default `False`) |
| `includedCategories` / `excludedCategories` | Category slug or id |
| `section` | Section **UUID** from `/api/cyberstorm/community/{community}/filters/` — a slug is rejected with `{"section":["Must be a valid UUID."]}` |

`GET /api/cyberstorm/listing/{community}/{namespace}/` narrows the same listing to one team.

Each result carries `namespace`, `name`, `description`, `icon_url`, `download_count`,
`rating_count`, `size`, `is_deprecated`, `is_nsfw`, `is_pinned`, `last_updated`,
`datetime_created`.

### Bulk endpoints

These exist for mod managers that mirror the whole catalogue. They are large — do not call them
from a per-mod code path.

| Endpoint | Payload |
| --- | --- |
| `GET /c/{community}/api/v1/package/` | Every package in the community with **every** version inlined. 1.2 MB for the 205-package Hades II community; several hundred MB for the largest communities |
| `GET /api/v1/package/` | Same, across all communities |
| `GET /api/experimental/package-index/` | 302 redirect to a gzipped newline-delimited JSON dump on `cache.thunderstore.io` (~79 MB compressed). Each line: `{namespace, name, version_number, file_format, file_size, dependencies}` |
| `GET /c/{community}/api/v1/package-listing-index/` | 302 to a gzipped JSON array of blob URLs; each blob holds a chunk of the community's listing data. This is the index r2modman consumes |

Both index endpoints redirect cross-host, so follow redirects explicitly (`curl -L`, or
`redirect: 'follow'`).

## Downloading

| URL | Behavior |
| --- | --- |
| `https://thunderstore.io/package/download/{namespace}/{name}/{version}/` | 302 → `https://gcdn.thunderstore.io/live/repository/packages/{Namespace}-{Name}-{Version}.zip` |
| `ror2mm://v1/install/thunderstore.io/{namespace}/{name}/{version}/` | Mod-manager install link (`install_url` in cyberstorm responses); the protocol Vortex's Thunderstore handler extension registers |
| `https://thunderstore.io/c/{community}/p/{namespace}/{name}/` | Human-readable package page |

Every package is a zip with a fixed root layout:

```text
manifest.json
icon.png
README.md
CHANGELOG.md      (optional)
…mod files…
```

```json
{
  "namespace": "SGG_Modding",
  "name": "ENVY",
  "description": "A plugin to allow ReturnOfModding plugins greater control of their environment.",
  "version_number": "1.2.0",
  "dependencies": ["LuaENVY-ENVY-1.2.0"],
  "website_url": "https://github.com/SGG-Modding/ENVY",
  "FullName": "SGG_Modding-ENVY"
}
```

`manifest.json` at the archive root is a reliable `testSupported` signal for a Thunderstore
package, and `dependencies[]` (version-pinned `Namespace-Name-Version` strings) is what a
dependency-resolving installer walks. Note that dependency entries name a *specific* version;
resolving to the newest instead requires a second lookup per dependency.

## Ecosystem schema

`GET https://thunderstore.io/api/experimental/schema/dev/latest/` returns a single ~1.4 MB JSON
document — the canonical mapping between Thunderstore communities and real games. Top-level keys:
`schemaVersion`, `games` (308 entries), `communities` (263), `modloaderPackages` (90),
`packageInstallers`.

A `games` entry contains everything needed to bind a community to a Vortex game extension:

```json
"hades-ii": {
  "uuid": "98d80ee3-5a6e-4c15-a433-ab70200a0b90",
  "label": "hades-ii",
  "meta": { "displayName": "Hades 2", "iconUrl": "hades-ii/hades-ii-cover-360x480.webp" },
  "distributions": [
    { "platform": "steam", "identifier": "1145350" },
    { "platform": "epic-games-store", "identifier": "07c634c7291a49b5b2455e14b9a83950" }
  ],
  "r2modman": [{
    "internalFolderName": "HadesII",
    "dataFolderName": "",
    "packageIndex": "https://thunderstore.io/c/hades-ii/api/v1/package-listing-index/",
    "steamFolderName": "Hades II/Ship",
    "exeNames": ["Hades2.exe"],
    "packageLoader": "return-of-modding",
    "installRules": []
  }],
  "thunderstore": { "displayName": "Hades 2", "listed": true, "categories": { … }, "sections": { … } }
}
```

- `distributions[].platform` covers `steam`, `epic-games-store`, `xbox-game-pass`, `oculus`, and
  others — the same store IDs a game extension already hardcodes, useful for cross-checking.
- `r2modman[].packageLoader` names the loader family (`bepinex`, `melonloader`,
  `return-of-modding`, `northstar`, `lovely`, `shimloader`, …) — a fast way to tell what a
  Thunderstore game's mods actually need at runtime.
- `r2modman[].installRules` describes where each file type is routed inside the game folder, which
  maps closely onto Vortex mod types.
- `modloaderPackages[]` lists `{ packageId, rootFolder, loader }` for every loader package, e.g.
  `{"packageId": "bbepis-BepInExPack", "rootFolder": "BepInExPack", "loader": "bepinex"}`. This is
  how a manager recognises that a downloaded package *is* the loader and must be installed to the
  game root rather than the mods folder.
- Vortex's official Thunderstore handler extension fetches exactly this URL (cached for 24 hours)
  as its `thunderstoreGames.json`.

## Write endpoints (authenticated)

Not needed for read-only extension work, listed for completeness. All require a session
(`/api/experimental/auth/…`) or, for the bot endpoint, a JWT.

- `POST /api/v1/package/{uuid4}/rate/` — rate a package.
- `POST /api/experimental/usermedia/initiate-upload/` → `…/{uuid}/finish-upload/` →
  `POST /api/experimental/submission/submit-async/` → `GET /api/experimental/submission/poll-async/{submission_id}/`
  — the multi-step package upload flow.
- `POST /api/experimental/submission/validate/{manifest-v1,icon,readme}/` — pre-flight validation,
  returns `{"success": bool}`.
- `POST/DELETE /api/experimental/package/{namespace}/{name}/wiki/` — wiki page upsert/delete.
- `POST /api/experimental/package-listing/{id}/{approve,reject,report,update}/` — moderation.
- `POST /api/v1/bot/deprecate-mod/` — JWT, special permissions.

## Usage in Vortex extensions

`util.jsonRequest<T>(url)` from `vortex-api` covers every read call — no extra dependency:

```js
const { util } = require('vortex-api');

// Resolve the current version + direct download URL for a Thunderstore package.
async function getLatestThunderstorePackage(community, namespace, name) {
  const url = `https://thunderstore.io/api/cyberstorm/listing/${community}/${namespace}/${name}/`;
  const listing = await util.jsonRequest(url);
  return {
    version: listing.latest_version_number,   // '1.0.107'
    downloadUrl: listing.download_url,        // .../package/download/ns/name/1.0.107/
    fileSize: listing.size,
    updated: listing.version_created,
  };
}
```

Points worth knowing when wiring this into a game extension:

- **Version comparison is easy.** `latest_version_number` is a plain semver string, so an
  installed-version attribute compares directly with `semver.gt` — simpler than the GameBanana or
  ModDB routes, which infer versions from file dates or update titles.
- **The download URL is stable and redirects to a `.zip`.** Vortex's download manager follows the
  redirect and lands on `Namespace-Name-Version.zip`, so the archive name already carries the
  version.
- **Dependencies are declared, not guessed.** A requirement's `dependencies[]` (from the version
  object or the package's `manifest.json`) names the exact packages that must also be installed.
  Loader packages are identifiable via the ecosystem schema's `modloaderPackages`.
- **Loader packages install to the game root.** For a `return-of-modding` game such as Hades II,
  the loader package's payload belongs at the game root while ordinary mod packages go to the
  game's mods directory — two different Vortex mod types, distinguished by whether the package id
  appears in `modloaderPackages`.
- **Vortex already ships a Thunderstore handler.** The official `extension-thunderstore-handler`
  registers the `ror2mm` protocol, mirrors the community package list, and exposes a Thunderstore
  browse page for any game extension whose `IGame.details.thunderstore` is populated. A game
  extension can opt into that instead of, or alongside, fetching the API directly.

## Shared thunderstore_downloader.js Module

`resources/downloader/thunderstore_downloader.js` packages the above into a reusable requirements
auto-downloader — the Thunderstore counterpart to the GitHub `downloader.js`, the GameBanana
`gamebanana_downloader.js`, the ModDB `moddb_downloader.js`, and the ModWorkshop
`modworkshop_downloader.js` (see `DOWNLOADER.md`, `GAMEBANANA_API.md`, `MODDB_API.md`, and
`MODWORKSHOP_API.md`). It downloads and installs Thunderstore-hosted requirements, resolves each
requirement's current version through the API, and raises an "update available" notification when a
newer version is published.

It is the least configurable of the five, because Thunderstore removes the two things the others
have to work around: versions are plain semver on the package record, and every version has a
predictable direct download URL. There is no archive-name pattern to write, no version-resolve
strategy to choose, no renderer-fetch route, and a hardcoded fallback *version* is enough to build a
working download URL by itself. Externals are `semver` and `vortex-api` only.

As with the other downloader modules, the canonical copy lives in `resources/downloader/` and each
adopting extension bundles its own copy next to its `index.js` — changes to the canonical file must
be propagated manually. Consumer wiring snippets live in
`resources/downloader/template_thunderstore_downloader.js`.

### The requirement object

The entry points take an array of requirement objects (conventionally a `TS_REQUIREMENTS` constant
in `index.js`), each describing one Thunderstore-hosted requirement:

| Field | Required | Meaning |
| --- | --- | --- |
| `tsNamespace` | yes | Team/uploader, the first path segment of the package page (`SGG_Modding`). |
| `tsName` | yes | Package name, the second path segment (`ENVY`). |
| `modType` | yes | Vortex mod type id the requirement installs as; also the installed-detection key (any mod with this type counts as installed). |
| `userFacingName` | yes | Display name in notifications, on the download, and in the mod list (stamped as the mod's `customFileName`). |
| `tsCommunity` | optional | Community slug (`hades-ii`). With it, the community listing endpoint is used, which also reports size, deprecation, and resolved dependencies. Without it — or when the package is not listed in that community — resolution falls back to the community-independent package endpoint. |
| `fallbackVersion` | optional | Version used to build a download URL when the API is unreachable, and recorded as the version attribute. Without it, an unreachable API fails the install with a manual-download error. |
| `versionAttribute` | optional | Mod attribute tracking the installed version for update checks. Default `'thunderstoreVersion'`. |
| `pageUrl` | optional | Manual-download page opened on install failure. Default is the community package page when `tsCommunity` is set, the bare package page otherwise. |
| `autoInstall` | optional | `false` -> never install this requirement unattended; only an explicit user action (a toolbar button) installs it. Default installs a missing requirement automatically when the update check runs. |

| `pinVersion` | optional | Hold the requirement at this package version instead of tracking the newest. Needs no companion field — every version has a predictable download URL. See **Version pinning** below. |

There is no `fileType`, `filePattern`, or `versionPattern` equivalent: a Thunderstore version has
exactly one artifact, always a `.zip`.

### Version pinning

`pinVersion` holds the requirement at one package version instead of following the newest one. It is opt-in and unset by default. This is the simplest of the five modules to pin, because `thunderstore.io/package/download/{namespace}/{name}/{version}/` is fully predictable — no companion `pinFileId` is needed.

While the tracked `thunderstoreVersion` equals the pin, `checkForThunderstoreUpdate` returns **before making any request** — a pinned requirement costs nothing against the API. The comparison is exact-string first, falling back to coerced-semver equality so `1.2` and `1.2.0` match. A pinned install skips the API too, building the download URL directly.

When the installed version is not the pinned one — including when nothing is installed — the module installs the *pinned* version, never the newest. The notification reads "pinned version available" rather than "update available", because the user may be *ahead* of the pin and installing it is then a deliberate downgrade. `autoInstall` stays orthogonal: the pin says which version, `autoInstall` says whether anything installs unattended. Since a pinned install makes no API call, a pinned requirement also logs no dependency list — pin each dependency's own requirement entry alongside it.

The same field name and behavior exist in all five downloader modules; `DOWNLOADER.md` has the cross-module table.

### Exports

| Export | Role |
| --- | --- |
| `downloadThunderstore(api, gameSpec, requirements, check = true)` | Download + install each requirement in the array (sequentially), then enable it, set its mod type, and record the version attributes. With `check = true` (default) it is a no-op for requirements already installed; pass `false` to (re)install/update. Main entry point — call in `setup()`. |
| `checkForThunderstoreUpdate(api, gameSpec, requirements)` | For each requirement: install it if it is missing (unless `autoInstall: false`), otherwise compare the tracked version against the current one; raise a warning notification with a Download action when newer. Call from a `check-mods-version` handler and after the `setup()` download. |
| `downloadThunderstoreRequirement(api, gameSpec, requirement, check = true)` | Single-requirement variant of `downloadThunderstore`. |
| `checkForThunderstoreUpdateRequirement(api, gameSpec, requirement)` | Single-requirement variant of `checkForThunderstoreUpdate`. |
| `isThunderstoreRequirementInstalled(api, gameId, requirement)` | Whether any mod with the requirement's mod type exists. |
| `getLatestThunderstorePackage(requirement)` | `{ version, downloadUrl, dependencies, isDeprecated, size, updated }`, or `null` if the API is unreachable and the package cannot be resolved. |
| `getLatestThunderstoreVersion(requirement, pkg)` | Current version string, or `null`. Resolves the package itself when `pkg` is omitted. |
| `getThunderstoreDependencies(requirement, pkg)` | The current version's dependencies as `Namespace-Name-Version` strings (empty array when unavailable). |

### Behaviors worth knowing

- **The mod list shows `userFacingName`, not the archive name.** Vortex renders a mod as
  `customFileName || logicalFileName || fileName || name`, and the install pipeline stamps
  `fileName` with the downloaded archive (`Namespace-Name-Version.zip`) — so the install also
  stamps `customFileName` from `userFacingName`. Written at install only, so it cannot overwrite a
  name the user set afterwards. Rendering rule: `VORTEX_MOD_LIST.md`.
- **Two resolution routes, one shape.** With `tsCommunity` set the module reads
  `/api/cyberstorm/listing/{community}/{namespace}/{name}/`; without it — or if that call fails —
  it reads `/api/experimental/package/{namespace}/{name}/`. The two endpoints describe dependencies
  differently (objects vs `Namespace-Name-Version` strings); the module normalises both to strings.
  The package endpoint reports no `size`.
- **Version tracking uses a dedicated attribute.** The installed version is stamped on both
  `version` and `thunderstoreVersion`. The update check reads the latter, because Vortex's md5 meta
  lookup can overwrite `version` with data from an unrelated Nexus match.
- **Update comparison is semver, with an archive-name fallback.** A tracked version equal to or
  newer than the published one is treated as current (so a deliberately installed newer build does
  not trigger a permanent notification). Mods installed before version tracking are matched on their
  archive name, which Thunderstore guarantees to be `Namespace-Name-Version.zip`.
- **Dependencies are logged, not installed.** Thunderstore packages declare their dependencies, but
  each dependency Vortex should manage needs its own requirement entry with its own mod type. The
  module logs a requirement's declared dependencies on install and exposes them through
  `getThunderstoreDependencies`.
- **Deprecated packages warn.** When the resolved package carries `is_deprecated`, the module logs a
  warning naming the package. The download still proceeds.
- **Source attribution.** A successful install sets the mod's `source` attribute to `'website'` and
  `url` to `pageUrl(requirement)` — Vortex renders this as a clickable "Source" link in the mod
  details panel.
- **No silent auto-update.** `checkForThunderstoreUpdate` only notifies; the user-driven Download
  action performs the update via `downloadThunderstoreRequirement(..., false)`.
- **Overlap guard.** A requirement whose install is already running is skipped (e.g. double-clicked
  toolbar action), keyed by mod type.
- **Install failure opens the page.** A failed download/install shows an error notification and
  opens `pageUrl` for a manual download.
- **Per-game pieces stay in `index.js`.** The mod type registration and the `registerInstaller`
  test/install pair for the requirement are not part of this module.
- **A missing requirement is installed by the update check.** The update check used to return early when the requirement was not installed, so a requirement the user removed (or never got) was never picked up again. It now installs it instead. Requirements that should only be installed by an explicit user action set `autoInstall: false`.
- **Updating disables the version it replaces.** An update installs a second mod entry rather than replacing the first, so the mod ids carrying the requirement's mod type are captured before the install and disabled once the new one lands (the newly installed id is skipped). Without this both copies stayed enabled and deployed on top of each other.

## Caveats

- No documented rate limit and no rate-limit response headers, but the site is Cloudflare-fronted —
  keep request volume low and cache community-wide payloads rather than re-fetching per mod.
- "Experimental" is a misnomer: those endpoints are the stable ones. Several endpoints marked
  *deprecated* in the OpenAPI spec (`/api/experimental/package/`, `/api/v1/package/{uuid4}/`, the
  `frontend/*` group) still respond — do not build on them.
- Cyberstorm endpoints back the live site and are not covered by the published OpenAPI spec, so
  their shapes can change without a spec revision. Tolerate missing fields.
- `/api/experimental/package/{namespace}/{name}/` reports `-1` for `rating_score` and
  `total_downloads` (see above).
- Package versions are immutable, but a package can be deprecated (`is_deprecated`) — check it
  before advertising a requirement as current.
- Community identifiers are Thunderstore's own slugs and are unrelated to Steam, Epic, or Nexus
  IDs; map them via the ecosystem schema's `distributions` rather than guessing from the game name.

---

## See also

`VORTEX_DOWNLOAD_MGMT.md` (the `start-download`/`import-downloads` events a requirement downloader
hands off to). `VORTEX_MOD_INSTALL.md` (installing a downloaded package as a managed mod).
`DOWNLOADER.md` (the GitHub requirements auto-downloader — same download-then-install flow once a
URL is resolved). `GAMEBANANA_API.md` and `MODDB_API.md` (the other third-party mod sites this repo
queries). `REGISTER_GAME.md` (the `IGame` store-ID and `details` fields the ecosystem schema maps
onto).
