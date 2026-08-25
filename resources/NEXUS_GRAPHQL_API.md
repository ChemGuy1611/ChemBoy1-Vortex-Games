# Nexus Mods v2 GraphQL API

The `v2` GraphQL API is the third and least-documented of the three Nexus Mods HTTP APIs. Nexus
publishes no schema reference or changelog for it — but **introspection is enabled and requires no
authentication**, so the schema is fully self-describing and everything below was read directly off
the live endpoint.

Companion docs: `NEXUS_MODS_API.md` (v1 + v3 REST, including the file-upload flow) and
`NODE_NEXUS_API_CLIENT.md` (`@nexusmods/nexus-api`, the typed Node client Vortex uses, which wraps a
small subset of what follows).

Everything here was verified live on 2026-08-23 against schema totals of **66 query fields**
(4 deprecated), **96 mutation fields** (22 deprecated), and **346 types**. There is no subscription
type.

---

## Endpoint and Transport

| Property | Value |
| --- | --- |
| URL | `https://api.nexusmods.com/v2/graphql` |
| Method | `POST` only — `GET` with a `?query=` string returns **404** |
| Content type | `application/json` |
| Body | `{"query": "...", "variables": {...}, "operationName": "..."}` |
| Fronting | Cloudflare (sets `__cf_bm` / `__cflb` cookies; `cf-cache-status: DYNAMIC`) |

Standard GraphQL aliasing works and is the practical way to batch, since most single-entity queries
take no list argument:

```graphql
query {
  m1166: mod(gameId: 2295, modId: 1166) { name tags { id name } }
  m1960: mod(gameId: 2295, modId: 1960) { name tags { id name } }
}
```

30 aliases per request is comfortable; that is how 246 mod pages were audited in 9 round trips.

## Authentication

Three states, and most of the interesting read surface needs none:

- **No auth.** Works for `mod`, `mods`, `modFiles`, `games`, `game`, `tags`, `legacyTags`,
  `fileHash`, `news`, and the rest of the public catalog.
- **`apikey: <key>` header.** The same personal API key the v1 REST API uses is accepted here.
  Confirmed live: `{ preferences { adult } }` returns `UNAUTHORIZED` bare and succeeds with the
  header.
- **`Authorization: Bearer <jwt>`.** The OAuth path the Vortex client uses.

There is no separate v2 key to obtain.

> **Security note:** the `personalApiKey` query returns the account's personal API key in plaintext
> to any caller already holding a valid session or key. Treat a leaked OAuth token as equivalent to
> a leaked API key, and never log the response of that query.

## Introspection

Introspection is open, unauthenticated, and complete. This is the only real reference for the API:

```graphql
# every query field with its arguments and return type
query { __schema { queryType { fields(includeDeprecated: true) {
  name isDeprecated deprecationReason
  args { name type { kind name ofType { kind name } } }
  type { kind name ofType { kind name } }
} } } }

# one type
query { __type(name: "Mod") { kind description
  fields(includeDeprecated: true) { name isDeprecated type { kind name ofType { kind name } } }
  inputFields { name type { kind name } defaultValue }
  enumValues { name }
} }
```

**Pass `includeDeprecated: true`.** Without it the schema silently hides 4 queries and 22 mutations —
that difference alone accounts for a 75-vs-96 discrepancy in mutation counts between two otherwise
identical introspection runs.

## Response and Error Shape

Errors are **not** signalled by HTTP status. A failed operation still returns `200 OK` with a
top-level `errors` array and `null` in the corresponding `data` slot:

```json
{ "errors": [ { "message": "You must be logged in to retrieve user preferences",
                "locations": [ { "line": 1, "column": 3 } ],
                "path": [ "preferences" ],
                "extensions": { "code": "UNAUTHORIZED" } } ],
  "data": { "preferences": null } }
```

Observed `extensions.code` values include `UNAUTHORIZED`, `undefinedField`, `argumentNotAccepted`,
and `missingRequiredArguments`. Partial success is normal in a batched/aliased query: some aliases
resolve while others land in `errors`. **Always inspect `errors` even on a 200 with non-null
`data`.**

## Rate Limiting

The v2 endpoint returns **no `x-rl-*` headers at all**, unlike v1, which reports
`x-rl-hourly-limit` / `-remaining` / `-reset` and the daily equivalents on every response. Whatever
budget applies to v2 is not exposed, so there is nothing to read and back off against. Pace requests
conservatively — a short sleep between batches — and rely on aliasing to keep the request count low
rather than hammering single-entity queries.

## Pagination

Two incompatible systems coexist. Which one applies is visible from the return type name.

### `*Page` types — offset/count

Used by the search-style queries (`mods`, `games`, `collectionsV2`, `media`, `news`,
`modFileContents`, `modsByUid`, `modFilesByUid`, `legacyMods`, `legacyModsByDomain`). Arguments are
`offset: Int` and `count: Int`.

```graphql
query { mods(filter: {...}, count: 80, offset: 160) {
  totalCount nodesCount nodes { modId name } facets { ... } facetsData
} }
```

**`count` is hard-capped at 80 server-side.** Requesting 100, 101 or 500 all return exactly 80
nodes with no error and no warning — the only signal is a short `nodes` array. This matches
`MODS_BY_UID_MAX_COUNT = 80` in the Node client's `src/parameters.ts`. Page with `offset` in steps
of 80. `totalCount` is the unpaginated total and is reliable.

The 13 `*Page` types: `BlockedModsPage`, `CollectionPage`, `GamePage`, `MediaUnionPage`,
`ModAnalyticsByMonthPage`, `ModAnalyticsForMonthPage`, `ModFileContentPage`, `ModFilePage`,
`ModPage`, `ModRequirementPage`, `ModRequiringPage`, `NewsPage`, `UserPage`.

### `*Connection` types — Relay cursors

Used by `modEndorsers`, `searchComments`, `moderationWarnings`, and the nested `games` field on
`LegacyTag`. Arguments are `first` / `last` / `after` / `before`, and the payload carries
`pageInfo` + `edges`. `modEndorsers` documents a 100-item-per-page maximum. The 8 connection types:
`CollectionBugReportConnection`, `CommentConnection`, `CommentSearchResultConnection`,
`GameConnection`, `ModEndorserConnection`, `ModerationWarningConnection`,
`ModerationWarningRestrictionConnection`, `UserConnection`.

## Search: filter, postFilter, facets, sort

The search queries are Elasticsearch-backed and share one filter grammar. Each filterable field
takes a **list** of value objects, each with a `value` (always a string, even for ints and booleans
in the base type) and an `op`:

```graphql
query {
  mods(
    filter: {
      uploaderId: [{ value: "3263034", op: EQUALS }]
      gameDomainName: [{ value: "site", op: EQUALS }]
      op: AND
    }
    sort: [{ createdAt: { direction: DESC } }]
    count: 80
  ) { totalCount nodes { modId name tags { id name } } }
}
```

Operator enums, narrowed per field:

| Enum | Values | Applies to |
| --- | --- | --- |
| `FilterComparisonOperator` | `EQUALS` `NOT_EQUALS` `MATCHES` `WILDCARD` `GT` `GTE` `LT` `LTE` | `BaseFilterValue`, `BooleanFilterValue`, `IntFilterValue` |
| `FilterComparisonOperatorEqualsWildcard` | `EQUALS` `NOT_EQUALS` `WILDCARD` | `Mod.name` |
| `FilterComparisonOperatorEqualsMatches` | `EQUALS` `NOT_EQUALS` `MATCHES` | `Mod.description` |
| `FilterLogicalOperator` | `AND` `OR` | the `op` key on a filter object |
| `SortDirection` | `ASC` `DESC` | `BaseSortValue.direction` |

Filters nest: a `ModsFilter` has its own `filter: [ModsFilter!]` plus `op`, so arbitrary AND/OR
trees are expressible. `postFilter` takes the same shape and is applied after faceting, which is
what makes facet counts stay stable while the result list narrows.

`ModsFilter` fields: `name`, `nameStemmed`, `modId`, `id`, `gameId`, `gameDomainName`, `createdAt`,
`updatedAt`, `hasUpdated`, `uploaderId`, `adultContent`, `fileSize`, `downloads`, `endorsements`,
`tag`, `description`, `author`, `uploader`, `supportsVortex`, `languageName`, `categoryName`,
`status`, `gameName`, `primaryImage`, `directDownloadEnabled`.

`ModsSort` fields: `relevance`, `name`, `downloads`, `uniqueDownloads`, `endorsements`, `random`
(takes `seed` instead of `direction`), `createdAt`, `updatedAt`, `size`, `lastComment`.

`ModsFacet` fields: `gameDomainName`, `gameName`, `gameId`, `adult`, `languageName`, `status`,
`categoryName`, `tag`.

`supportsVortex` and `tag` as filterable fields are worth remembering — between them you can
enumerate every Vortex-supporting mod, or every mod carrying a given tag, without touching v1.

## Query Catalog

66 fields. Deprecated ones are marked.

### Mods and files

| Query | Notes |
| --- | --- |
| `mod(modId: ID!, gameId: ID!): Mod!` | Single mod. **`gameId` is the numeric game id, not the domain string** — `site` is `2295`. Passing a domain errors with `argumentNotAccepted`. |
| `mods(filter, postFilter, facets, sort, offset, count, viewUploaderHidden, viewUserBlockedContent): ModPage!` | The main search. See the filter grammar above. |
| `modsByUid(uids: [ID!]!, offset, count): ModPage!` | Batch by composite uid (`gameId << 32 \| modId`). |
| `legacyMods(ids: [CompositeIdInput!]!, offset, count): ModPage!` | Batch by `{gameId, modId}` pairs. |
| `legacyModsByDomain(ids: [CompositeDomainWithIdInput!]!, offset, count): ModPage!` | Batch by `{gameDomain, modId}` pairs — the one place a domain string is accepted for mod lookup. |
| `modFiles(modId: ID!, gameId: ID!): [ModFile!]!` | All files for a mod, unpaginated. |
| `modFilesByUid(uids: [ID!]!, offset, count): ModFilePage!` | Batch file lookup. |
| `modFileContents(filter, sort, offset, count): ModFileContentPage!` | Search *inside* mod archives by path/name/extension/size. |
| `modEndorsers(modUid: ID!, first, last, after, before): ModEndorserConnection!` | Relay-paginated, max 100/page. |
| `fileHash(md5: String!): [FileHash!]!` / `fileHashes(md5s: [String!]!): [FileHash!]` | MD5 → `ModFile`. The lookup behind Vortex's archive-identification. |
| `optedInMods(accountId: Int!): OptedInMods!` | DP opt-in state. |

### Games and categories

`game(id: ID, domainName: String): Game` (accepts either), `games(facets, filter, postFilter, sort,
offset, count): GamePage!`, `collectionGames`, `favouriteGames`, `gameArtwork`,
`categories(gameId, global)`, `category(id: ID!)`.

### Tags

| Query | Returns |
| --- | --- |
| `legacyTags(gameId: ID, onlyAdult: Boolean, excludeAdult: Boolean): [LegacyTag!]` | **Mod** tags — 113 entries in the global pool. |
| `tags(gameId: Int, categoryId: Int, includeGlobal: Boolean, includeDiscarded: Boolean): [Tag!]` | **Collection** tags — 24 entries. `Tag` is marked deprecated in its own description. |
| `tag(id: ID!)`, `tagCategories`, `tagCategory(id: ID!)` | Collection-tag definitions and their categories. |
| `blockedTags(excludeAdult: Boolean): [LegacyTag!]` | Tags the calling user has hidden from their own feed. |

See "Mod Tags vs Collection Tags" below — the two systems are easy to confuse and only one applies
to mods.

### Collections

`collection(slug, domainName, viewAdultContent)`, `collectionRevision(slug, revision, domainName,
viewAdultContent)`, `collectionsV2(facets, filter, postFilter, sort, offset, count,
viewUserBlockedContent)`, `collectionRevisionUploadUrl`, and `myCollections(...)`
*(deprecated — use `collectionsV2`)*.

### Comments and media

`comment(commentId: ID!)`, `commentThread(commentThreadId: ID!)`, `searchComments(filter, sort,
first/last/after/before)`, `media(facets, filter, postFilter, sort, offset, count)`,
`externalVideo(url: String!)`, `news(newsCategory, gameId, offset, count)`,
`requestMediaUploadUrl(filename, mimeType)`.

### Users and account

`user(id: Int!)`, `userByName(name: String!)`, `preferences`, `personalApiKey`, `applications`,
`ignoredUsers`, `userDonationPreferences`, `privateMessageUrl(id: ID!)`, `badges`,
`currentWarnings`, `ageVerificationInfo(userId)`, `startAgeVerificationFlow`,
`startAgeVerificationAppealFlow`, plus deprecated `blockedAuthors` (→ `ignoredUsers`) and
`legacyBlockedAuthors`.

### Moderation, admin, reporting

`moderationReason(id)`, `moderationReasons`, `moderationWarnings(category, first/last/after/before)`,
`csamDeletionRequests(status, cdnSecret)`, `csamHashCheck(md5Hashes: [String!]!)`,
`uploads(start!, perPage!, orderDir!, orderColumn!, ...)`, `temporalWorkflowStatus(uploadId)`,
`transactions(...)`, `userMonthlyReport(accountId!, year!, month!)`, `userMonthlyReportById`,
`userMonthlySummary(accountId!)`, `speedtestUrls`. Most of these are staff-scoped and return
`UNAUTHORIZED` for ordinary accounts.

## Mutation Catalog

96 fields, 22 deprecated. The shape is uniform: every mutation returns a
`<Name>MutationPayload` object.

### Mods — the entire mod-level write surface

| Mutation | Effect |
| --- | --- |
| `createModEndorsement(modUid: String!)` | Endorse. |
| `abstainFromModEndorsement(modUid: String!)` | Abstain. |
| `trackMod(modUid: ID!)` / `untrackMod(modUid: ID!)` | Track / untrack. |
| `updateModDirectDownloadEnabled(modUid: ID!, directDownloadEnabled: Boolean!)` | Toggle non-premium direct download. |
| `blockModsFromEarningDp(userId)` / `unblockModsFromEarningDp(userId)` | Donation-point blocking, applied per uploader. |

**That is the complete list.** There is no mutation to edit a mod's name, description, category,
tags, media, or page permissions. See "What you cannot do" below.

### Collection writes

Create/update: `createCollection`, `createOrUpdateRevision`, `editCollection(collectionId!, name,
summary, description, categoryId, allowUserMedia, manuallyVerifyMedia)`, `updateRevision`,
`createChangelog`, `updateChangelog`.
Lifecycle: `publishRevision`, `retractRevision`, `discardRevision`, `discardCollection`,
`listCollection`, `unlistCollection`.
Badges: `addBadgeToCollection`, `removeBadgeFromCollection`.
Bug reports: `closeCollectionBugReport`, `submitModerationFix`, `acceptModerationFix`,
`rejectModerationFix`.
Deprecated but functional (all flagged "will be replaced using Interfaces and Global IDs"):
`addTagToCollection`, `removeTagFromCollection`, `addImageToCollection`,
`removeImageFromCollection`, `modifyImageForCollection`, `addVideoToCollection`,
`removeVideoFromCollection`, `addHeaderImageToCollection`, `removeHeaderImageFromCollection`,
`addTileImageToCollection`, `removeTileImageFromCollection`, `createCollectionBugReport`,
`updateCollectionBugReport`, `hideCollectionBugReport`, `openCollectionBugReport`,
`clearCollectionBugReportModerationStatus`.

### Comments

`createComment`, `updateComment`, `discardComment`, `restoreComment`, `hideComment`,
`likeComment`, `removeCommentLike`, `lockComment`, `lockCommentThread`, `pinComment`,
`unpinComment`, `reorderPinnedComments`, `clearCommentModerationStatus`,
`clearCommentThreadModerationStatus`.

### Users and social

`ignoreUser` / `unignoreUser`, `trackUser` / `untrackUser`, `giveKudos` / `removeKudos`,
`addFavouriteGame` / `removeFavouriteGame`, `updateAboutMe`, `updateCountry`, `updatePreferences`
(26 arguments), `updateUserDonationPreferences`, `createMessage`, `createApiKey`, `deleteApiKey`,
`deletePersonalApiKey`. Deprecated: `blockAuthor` / `unblockAuthor` (→ `ignoreUser`).

### Tag definitions

`createTag(name!, categoryId, gameIds, global, adult)`, `updateTag(id!, ...)`, `discardTag(id!)` —
these manage **collection-tag definitions** and are permission-gated (`tag:discard` and friends).
`blockTag(tagId!)` / `unblockTag(tagId!)` are per-viewer feed filtering, not moderation.

### Moderation and admin

`issueWarningToUser`, `updateModerationWarning`, `createNoteAboutUser`,
`writeFullPageNotificationToUser`, `createCsamDeletionRequest`, `updateCsamDeletionRequest`,
`rescanVirusTotal(uploadId!)`, `restartUploadProcessing(uploadId!)`, `updateGame(gameId!,
artworkSchema, copyrightedName)`, `uploadGameArtworkV2`, `uploadAttachment(file: Upload!)`,
`trackAppMetric`, `reorderItem`. Deprecated generics: `moderate`, `amendModeration`, `endorse`,
`rate`, `unpublishRevision`.

## Key Types

### `Mod`

`id`, `uid`, `modId`, `gameId`, `game`, `name`, `summary`, `description`, `version`, `author`,
`uploader`, `category`, `modCategory`, `status`, `adultContent`, `createdAt`, `updatedAt`,
`downloads`, `endorsements`, `fileSize`, `pictureUrl`, `thumbnailUrl` (+ `Large` / `Blurred`
variants), `mirrors`, `modRequirements`, `directDownloadEnabled`, `legacyModRequirementsEnabled`,
`supportsVortex`, `isBlockedFromEarningDp`, **`tags`**, and viewer-scoped fields (`viewerEndorsed`,
`viewerTracked`, `viewerDownloaded`, `viewerBlocked`, `viewerIsBlocked`,
`viewerUpdateAvailable`).

`uid` is the same global identifier the v3 REST API uses; see the v1↔v3 identifier bridge in
`NEXUS_MODS_API.md`.

### `ModFile`

`id`, `uid`, `fileId`, `modId`, `mod`, `game`, `owner`, `name`, `version`, `description`,
`category` (`ModFileCategory` enum), `categoryId`, `groupId`, `date`, `size`, `sizeInBytes`
(`BigInt`), `uri`, `primary`, `manager`, `changelogText`, `totalDownloads`, `uniqueDownloads`,
`requirementsAlert`, `reportLink`, `scanned`, `scannedV2` (`VirusScanStatus` enum).

`ModFileCategory`: `MAIN` `UPDATE` `OPTIONAL` `OLD_VERSION` `MISCELLANEOUS` `REMOVED` `ARCHIVED`.
Note this read-side set is wider than the v3 upload-side `NewModFileCategory` enum
(`main` / `optional` / `miscellaneous`) — see `NEXUS_FILE_PROPERTIES.md`.

`VirusScanStatus`: `NOT_SCANNED` `QUEUED` `WAITING_REPORT` `VERIFIED` `INTERNALLY_VERIFIED`
`QUARANTINED` `MANUALLY_VERIFIED` `MOD_DOES_NOT_EXIST` `FILE_NOT_FOUND` `REPORT_ERROR` `TOO_LARGE`
`PARTIAL`.

### `Game`

`id` (Int), `domainName`, `name`, `genre`, `forumUrl`, `approvedAt`, `modCount`,
`collectionCount`, `downloadCount` / `uniqueDownloadCount` (`BigInt`), `imageCount`, `videoCount`,
`mediaCount`, `supporterImageCount`, `supportsVortex`, `copyrightedName`, `trendingPeriodDays`,
`artworkSchema`, `availableTags`, `specificTags`.

### `FileHash`

`md5`, `fileName`, `fileSize` (`BigInt`), `fileType`, `gameId`, `modFileId`, `modFile`,
`createdAt`.

### Scalars, unions, interfaces

Scalars beyond the built-ins: `BigInt`, `DateTime`, `ISO8601DateTime`, `JSON`, `Upload` (multipart
file uploads — `uploadAttachment`, `uploadGameArtworkV2`).
Unions: `MediaUnion = Image | SupporterImage | Video`,
`CollectionMediaUnion = CollectionImage | CollectionVideo`.
Interfaces: `Node` (`id`), `GloballyIdentifiable` (`globalId`, `id`), `Attachable`
(`attachments`), `Reorderable` (`order`).

## Mod Tags vs Collection Tags

Two separate tag systems share the word "tag", and mixing them up is the main trap in this area.

| | Mod tags | Collection tags |
| --- | --- | --- |
| Type | `LegacyTag` | `Tag` (+ `TagCategory`) |
| Query | `legacyTags(gameId, onlyAdult, excludeAdult)` | `tags(gameId, categoryId, includeGlobal, includeDiscarded)` |
| Pool size | 113 | 24 |
| Read from a mod | `Mod.tags` | n/a |
| Write | **impossible via API** | `addTagToCollection` / `removeTagFromCollection` |
| Schema status | current | `Tag`/`TagCategory` self-describe as deprecated, "will be removed in a future release in favour of domain specific tag queries/mutations" |

`LegacyTag` fields: `id`, `name`, `global`, `blockable`, `searchable`, `parentId`,
`games` (Relay connection).

Reading the tags on a mod:

```graphql
query { mod(gameId: 2295, modId: 1166) { name tags { id name } } }
```

Useful ids in the mod pool: `4694` Game Extension, `4902` AI Assisted, `4488` AI-Generated Content,
`4899` Generative AI Usage, `4905` AI Media.

## What You Cannot Do

The read surface is broad; the write surface for mods is almost nonexistent. Confirmed against the
full introspected schema, none of the following is possible from any API tier (v1 REST, v2 GraphQL,
or v3 REST):

- **Add or remove a tag on a mod.** The whole tag-assignment mutation family is collection-scoped.
- **Add, remove or reorder a mod's images or videos.** Likewise collection-scoped
  (`addImageToCollection`, `addVideoToCollection`).
- **Change a mod page's permission switches** — "allow users to add tags", "allow users to add
  images/videos". `editCollection` exposes `allowUserMedia` and `manuallyVerifyMedia`; the `Mod`
  type has no counterpart and no mutation targets it.
- **Edit a mod's name, summary, description, or category.**

All of these are website-only operations. For bulk work the realistic pattern is: use GraphQL to
*audit* current state across many mods in a few requests, generate a worklist, then apply the
changes by hand through the mod pages.

## Gotchas

- **`mod(gameId:)` takes the numeric game id**, not the domain string. `site` = `2295`. A domain
  string produces `argumentNotAccepted` plus a confusing `missingRequiredArguments` for `gameId` in
  the same response. `game(domainName: "...")` resolves the number; `legacyModsByDomain` is the one
  mod query that accepts a domain directly.
- **`count` silently caps at 80** on `*Page` queries — no error, just a short array.
- **Introspection hides deprecated fields by default.** Always pass `includeDeprecated: true`.
- **HTTP 200 does not mean success.** Check `errors` on every response.
- **No rate-limit headers exist on v2**, so no adaptive backoff is possible. Batch with aliases and
  sleep between batches.
- **`personalApiKey` leaks the account's API key** to any authenticated caller.
- **`Tag` ≠ `LegacyTag`.** The friendlier-sounding one is the deprecated collection system.
- **Filter values are strings even for numbers and booleans** in `BaseFilterValue`; only
  `IntFilterValue` and `BooleanFilterValue` take native types.
- The mod counts returned by `mods(filter: {uploaderId: ...})` include unpublished and hidden mods
  that other indexes omit, so totals will not match `GET /v3/vortex/extensions` or a profile page.

## Re-verifying This Document

The schema is the only source of truth and Nexus does not announce changes to it. To refresh:

1. `POST` a full introspection query (with `includeDeprecated: true`) to
   `https://api.nexusmods.com/v2/graphql` — no auth needed — and save the JSON.
2. Diff the query/mutation field lists and the deprecation flags against the catalogs above.
3. Re-check the counts quoted at the top of this document (66 / 96 / 346) and the `count` cap.

Nothing in this document requires an API key to verify except the two auth probes, and no mutation
needs to be executed to confirm the catalog — the schema declares it.

---

## See also

`NEXUS_MODS_API.md` — v1 and v3 REST, the file-upload flow, the `uid` identifier bridge, and the
v3 endpoint catalog.
`NODE_NEXUS_API_CLIENT.md` — `@nexusmods/nexus-api`, the typed Node client, and which slice of this
schema it wraps.
`NEXUS_FILE_PROPERTIES.md` — v1 `ModFile` object shape and the read-side vs upload-side file
category enums.
`VORTEX_NEXUS_INTEGRATION.md` — how Vortex authenticates (OAuth/SSO) and which client talks to
which API.
