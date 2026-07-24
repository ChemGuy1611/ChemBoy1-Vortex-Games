# node-nexus-api (`@nexusmods/nexus-api`) Client Library

Reference for the `Nexus-Mods/node-nexus-api` repository — the official Node/TypeScript client
library that Vortex core (`src/main`, `src/renderer`, `packages/vortex-api`) and several game
extensions (`game-stardewvalley`, `issue-tracker`, `script-extender-installer`,
`game-extension-test`) depend on as `@nexusmods/nexus-api`. This is a **separate, standalone
GitHub repository** from Vortex itself — local clone lives alongside the other repos in this
workspace. It is the library behind the "v1 nexus-node client" (`NexusT`) referenced in
`VORTEX_NEXUS_INTEGRATION.md`.

This covers a different (and mostly non-overlapping) API surface from `NEXUS_MODS_API.md`: that
doc is the **v3 REST API** (mod file uploads, versions, the OpenAPI-documented endpoints this
repo's `release_extension.py` calls directly). This library instead wraps **v1 REST** and **v2
GraphQL**, plus a GraphQL-backed Collections API that is architecturally distinct from the v3
REST Collections endpoints documented in `NEXUS_MODS_API.md`.

---

## Package & Base URLs

`package.json`: name `@nexusmods/nexus-api`, `main: ./lib/index.js`. Source of truth is
`src/Nexus.ts` (the `Nexus` class, ~1900 lines) plus `src/types.ts` (data shapes) and
`src/typesGraphQL.ts` (GraphQL query-builder types). The compiled `lib/` and generated `docs/`
folders can lag behind `src/` — `docs/classes/_nexus_.nexus.md` is missing several newer methods
(GraphQL, collections, `modFileContents`) present in current `src/Nexus.ts`; read `src/Nexus.ts`
directly rather than trusting `docs/`.

Base URLs (`src/parameters.ts`):

| Constant | Value |
| --- | --- |
| `API_URL` | `https://api.nexusmods.com/v1` |
| `GRAPHQL_URL` | `https://api.nexusmods.com/v2/graphql` |
| `USER_SERVICE_API_URL` | `https://{users-subdomain}.nexusmods.com` |

Note there is no `v3` base URL here — this library never touches the v3 REST API at all. Vortex's
v3 access goes through a different, separate package (`packages/nexus-api-v3` /
`nexusV3Client.ts` inside the Vortex monorepo, not this repo) — out of scope for this doc.

---

## Auth

- **API key**: `Nexus.create(apiKey, appName, appVersion, defaultGame, timeout?)` — static
  factory, validates the key immediately. `setKey(apiKey)` swaps keys on an existing instance
  (also usable to unset by passing `undefined`).
- **OAuth/JWT** (marked experimental in the README): `Nexus.createWithOAuth(credentials, config,
  appName, appVersion, defaultGame, timeout?, onJWTRefresh?)`. `credentials = { token,
  refreshToken, fingerprint }`, `config = { id, secret }` (OAuth client id/secret). The client
  refreshes expired tokens itself and calls `onJWTRefresh(newCredentials)` so the host app can
  persist them — obtaining the *initial* JWT is not this library's job.
- **SSO** (websocket handshake, described in the README, not implemented by this library): open a
  websocket to `wss://sso.nexusmods.com`, send `{ id: <uuid>, appid: <your appid> }`, ping every
  30s, have the user open `https://www.nexusmods.com/sso?id={id}` in a browser: the socket then
  receives one message containing the plain API key.
- Every constructor call requires `appName` + `appVersion` (semver) — used server-side for
  per-app-version throttling/blocking if a specific client version misbehaves.

---

## Method Catalog (`src/Nexus.ts`, current `public` methods)

### Key / validation

| Method | Purpose |
| --- | --- |
| `static create(apiKey, appName, appVersion, defaultGame, timeout?)` | Construct + validate in one call. |
| `static createWithOAuth(credentials, config, appName, appVersion, defaultGame, timeout?, onJWTRefresh?)` | OAuth/JWT constructor. |
| `setKey(apiKey)` | Swap the API key; re-validates. |
| `setOAuthCredentials(credentials, config)` | Swap OAuth creds. |
| `revalidate()` | Re-run key/token validation. |
| `validateKey(key?)` | One-off validation without updating cached state/quota. |
| `getValidationResult()` | Last cached validation result (sync). |
| `setGame(gameId)` | Change the default game id used when a call omits `gameId`. |
| `getRateLimits()` | `{ daily, hourly }` remaining, from the last response headers. |
| `setLogger(logCB)` | Install a `(level, message, meta) => void` log hook. |

### v1 REST — games & mods

| Method | Purpose |
| --- | --- |
| `getGames()` | All games (`IGameListEntry[]`). |
| `getGameInfo(gameId?)` | Single game (`IGameInfo`). |
| `getModInfo(modId, gameId?)` | Mod details. |
| `getLatestAdded(gameId?)` / `getLatestUpdated(gameId?)` / `getTrending(gameId?)` | The 3 curated mod lists. |
| `getRecentlyUpdatedMods(period, gameId?)` | `period` is `'1d' \| '1w' \| '1m'` (server-cached windows only). |
| `getChangelogs(modId, gameId?)` | v1 read-side changelog fetch (see the new v3 write-side `POST /mods/{id}/changelogs` in `NEXUS_MODS_API.md`). |
| `getModFiles(modId, gameId?)` | File list for a mod. |
| `getFileInfo(modId, fileId, gameId?)` | Single file. |
| `getDownloadURLs(modId, fileId, key?, expires?, gameId?)` | Resolve to download mirror URLs. Non-premium keys must supply `key`/`expires` pulled from the `.nxm` link the site issued — same premium-gating as the raw v1 `download_link.json` endpoint. |
| `getFileByMD5(hash, gameId?)` | Reverse-lookup file(s) by archive MD5 (may return multiple hits — caller must disambiguate, e.g. by size). |

### v1 REST — user

| Method | Purpose |
| --- | --- |
| `getUserInfo()` | Current user info (premium status, etc.). |
| `getTrackedMods()` / `trackMod(modId, gameId?)` / `untrackMod(modId, gameId?)` | Tracking list management. |
| `getEndorsements()` | User's endorsements. |
| `endorseMod(modId, modVersion, endorseStatus, gameId?)` | `endorseStatus: 'endorse' \| 'abstain'`. `modVersion` must match a version that actually exists on the mod. |
| `getColourschemes()` / `getColorschemes()` | Site colour schemes (British/American spelling aliases for the same call). |

### v2 GraphQL

| Method | Purpose |
| --- | --- |
| `userById(query, userId)` | GraphQL user lookup. |
| `getPreferences(query, useCache=true)` | User site preferences (comments/media-tab/search defaults etc. — see the `Preferences*Enum` types in `types.ts`). Cached client-side; `clearPreferencesCache()` invalidates. |
| `modsByUid(query, uids)` | Batch mod lookup by composite uid via GraphQL. |
| `modFilesByUid(query)` | Batch file lookup via GraphQL. |
| `fileHashes(query)` | Batch file-hash lookup via GraphQL. |
| `modFileContents(query, filter?, offset?, count?)` | Search inside mod archive contents (file paths/names/extensions/sizes) — see the README's extensive filter-operator documentation (`EQUALS`/`WILDCARD`/`MATCHES`/`GT`/`LT`/etc., `AND`/`OR` composition, all filter values passed as strings). Paginated via `offset`/`count`. |
| `modRequirements(...)` | GraphQL mod-requirements query (signature not fully inspected — see `src/Nexus.ts` around `modRequirements`). |

GraphQL query shape uses a field-selection object (`{ name: true, headerImage: { url: true,
thumbnailUrl: { $filter: { size: 'MED' } } } }`) rather than raw query strings — `$filter` marks
fields that need parameters (documented at length in the README with `modFileContents` examples).

### Collections (GraphQL-backed — distinct from the v3 REST Collections API)

| Method | Purpose |
| --- | --- |
| `createCollection(data, ...)` / `updateCollection(data, ...)` | Create/update a collection. `data: ICollectionPayload` (`adult_content`, `collection_manifest`, `collection_schema_id` — same shape family as the v3 REST `CollectionPayload`, but sent over GraphQL here, not `POST /v3/collections`). |
| `createOrUpdateRevision(data, ...)` | Upsert a revision. |
| `editCollection(collectionId, ...)` | Edit collection metadata. |
| `publishRevision(revisionId)` | Publish a draft revision. |
| `attachCollectionsToCategory(categoryId, collectionIds)` | Bulk-categorize collections. |
| `getCollectionGraph(query, ...)` / `getCollectionListGraph(query, gameId?, count?, offset?)` / `getMyCollections(query, gameId?, count?, offset?)` / `searchCollectionsGraph(...)` / `getCollectionRevisionGraph(query, ...)` | Read-side GraphQL collection queries. |
| `getRevisionUploadUrl()` | Pre-signed upload URL for a new revision's manifest/binary (`IPreSignedUrl`). |
| `getCollectionDownloadLink(downloadLink)` | Resolve a collection's download link to mirrors. |
| `endorseCollection(collectionId, endorseStatus, gameId?)` | Same `'abstain' \| 'endorse'` shape as mod endorsement. |
| `rateRevision(revisionId, rating)` | `rating: 'positive' \| 'negative' \| 'abstained'`. |
| `getCollectionVideo(collectionId, videoId)` | Fetch video metadata for a collection. |

**This repo does not currently use the Collections API at all** — noted here for completeness and
because it is easy to confuse with the v3 REST `POST /collections` family in `NEXUS_MODS_API.md`.
They are two different transports (GraphQL mutations here vs. plain REST there) that appear to
serve overlapping purposes; which one is authoritative/current was not resolved in this pass.

### Internal-use (per source comments — do not build on these)

| Method | Purpose |
| --- | --- |
| `getOwnIssues()` | Issues reported by this user. Source comment: "FOR INTERNAL USE ONLY". |
| `sendFeedback(title, message, fileBundle, anonymous, groupingKey?, id?)` | Feedback submission. Source comment: "FOR INTERNAL USE ONLY". |
| `sendMetric(eventType, entityType, entityId, metadata, clientString?)` | Telemetry/metrics event. |

---

## Key Types (`src/types.ts`, ~89 exported names — not exhaustively catalogued here)

Most directly useful ones, matching the methods above: `IValidateKeyResponse`, `IUserInfo`,
`IModInfo` / `IModInfoEx`, `IFileInfo`, `IModFiles`, `IFileUpdate`, `IGameListEntry` /
`IGameInfo`, `IDownloadURL`, `IMD5Result`, `IChangelogs`, `ITrackedMod` / `ITrackResponse`,
`IEndorsement` / `IEndorseResponse`, `IColourScheme`, `IUpdateEntry`, `ICollection` /
`ICollectionPayload` / `ICollectionManifest` / `IRevision`, `IModFile` / `ModFileCategory` /
`VirusScanStatus`, `IModFileContent` / `IModFileContentSearchFilter` (+ the `FilterComparison*`
operator unions), `IPreference` (+ its dozen `Preferences*Enum` unions), `IOAuthCredentials` /
`IOAuthConfig`, `IGraphQLError`. Full list: `grep "^export interface\|^export type" src/types.ts`.

`src/typesGraphQL.ts` (55 lines) defines the query-builder generic types (`IModQuery`,
`IModFileQuery`, `IFileHashQuery`, `IUserQuery`, `IPreferenceQuery`, `ICollectionQuery`,
`IRevisionQuery`, `GraphQueryParameters`) used to build the field-selection objects passed into
the GraphQL methods above.

`src/customErrors.ts` defines the thrown error classes: `HttpError`, `NexusError`,
`ParameterInvalid`, `ProtocolError`, `RateLimitError`, `TimeoutError`, `JWTExpiredError`.

---

## Throttling

Client-side token-bucket quota: 300 requests (600 for premium keys), refilling at 1/second,
allowing bursts but not sustained high traffic. Server-side, the API also returns HTTP 429 under
heavy load (global or per-user) and resets the client's local quota to 0 when that happens.

---

## See also

`NEXUS_MODS_API.md` (the v3 REST API this library does *not* cover), `NEXUS_FILE_PROPERTIES.md`,
`VORTEX_NEXUS_INTEGRATION.md` (how Vortex core wires this library in as the "v1 nexus-node"
client, alongside the separate `packages/nexus-api-v3` v3 client).
