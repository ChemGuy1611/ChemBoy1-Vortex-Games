# Vortex Nexus Integration (runtime)

How the app wires **Nexus Mods** into the runtime: login, `nxm://` links, mod update checks,
endorsements, categories, feedback. This is the **app-integration** view — the Nexus **HTTP API**
itself (endpoints, auth headers, response shapes) is documented separately: see `NEXUS_MODS_API.md`
and `NEXUS_FILE_PROPERTIES.md`.

Driver: the `nexus_integration` core extension (`index.tsx`, `util/`, `eventHandlers.ts`,
`nexusV3Client.ts`, `NXMUrl.ts`).

## Login & credentials

- **OAuth is the primary login** (`util/oauth.ts`, class `OAuth`, `ITokenReply`). **SSO**
  (`util/sso.ts`, `getPageURL(loginId)`) is the browser hand-off. The login flow opens a Nexus
  page; completion comes back as an **`nxm://…oauth`** URL (`NXMUrl.type === 'oauth'`) handled by
  `oauthCallback(api, oauthCode, oauthState)`.
- Credentials live in **`state.confidential.account.nexus.OAuthCredentials`** (a legacy `apiKey`
  path is still honoured). On load the ext reads them once; `loggedIn = apiKey !== undefined ||
  oauthCred !== undefined`. `updateToken(api, nexus, oauthCred)` refreshes the token into the
  nexus-node client.
- Helpers: `ensureLoggedIn(api)`, `requestLogin(nexus, api, callback)` (also exposed as the
  `request-nexus-login` event and `nexusRequestNexusLogin` API).

## Clients

Two clients back the integration: the **v1 nexus-node** client (`NexusT`) and the **v3** client
(`nexusV3Client.ts`, backed by `packages/nexus-api-v3`). Different features use different ones
(v3 for GraphQL-style queries, v1 for legacy endpoints). The v1 nexus-node client is the
`@nexusmods/nexus-api` package — full method/type catalog: `NODE_NEXUS_API_CLIENT.md`. That
package itself covers v1 REST *and* v2 GraphQL *and* a GraphQL-backed Collections API, which is a
separate transport from the v3 REST Collections endpoints in `NEXUS_MODS_API.md`.

## `nxm://` links

`NXMUrl` (`NXMUrl.ts`) parses an `nxm://` URL. `type` is one of **`mod` | `collection` | `oauth` |
`premium`**, with getters for `gameId`, `modId`, `fileId`, `collectionId`, `revisionId`,
`collectionSlug`, `revisionNumber`, `oauthCode`/`oauthState`, `key`/`expires`/`userId`, `view`.

The ext registers the **`nxm` protocol** (`associateNXM` setting →
`setAssociatedWithNXMURLs(true)`; toggled via `onChangeNXMAssociation`). When an `nxm://` mod/file
link arrives, it is resolved against the Nexus API into an actual (often **time-limited**) download
URL and handed to the download manager (`VORTEX_DOWNLOAD_MGMT.md`). A `view` link opens the page
instead of downloading.

## Mod update checks

- **`checkModVersion(store, nexus, gameId, mod)`** (`util/checkModsVersion.ts`) checks a single
  managed mod against its Nexus file's latest version, writing `newestFileId` etc. into the mod's
  attributes. Bulk checking goes through the async **`check-mods-version`** event
  (`onCheckModsVersion`).
- **Checking is separate from updating.** `mod-update` and `mods-update` *perform* an update —
  resolve the newest file, download it, and install it over the existing mod.

### `mod-update` vs `mods-update`

| Event | Emitted by | Payload | Handler |
| --- | --- | --- | --- |
| `mod-update` | the per-row update button (`VersionIconButton`) | `(gameId, nexusModId, fileId, source)` | `onModUpdate` |
| `mods-update` | the "Update all" flow (`CheckModVersionsButton`) | `(gameId, localModIds[])` | `onModsUpdate` |

`onModsUpdate` resolves each **local** mod id to its `attributes.modId` / `newestFileId` and then
calls `onModUpdate(...)` **as a function** — it never re-emits `mod-update`. So an extension that
listens for `mod-update` sees single-mod updates only, and must listen for `mods-update` as well to
observe bulk updates (note the payload difference: local mod ids, not Nexus mod ids). What this
means for load order is covered in `VORTEX_LOAD_ORDER.md`.

## Endorsements, categories, feedback

| Capability | Wiring |
| --- | --- |
| Endorse | `endorse-mod` event → `endorseMod` (`util/endorseMod.ts`); also a registered `endorseMod` action |
| Categories | `retrieve-category-list` (isUpdate) → `retrieveCategories` (`util/retrieveCategories.ts`) → `nexusRetrieveCategoryList` API |
| Feedback | `submit-feedback` → `onSubmitFeedback` |
| Collections | `submit-collection`, `open-collection-page`, `request-own-issues` |
| User info | `refresh-user-info` → `onRefreshUserInfo` (premium status, etc.) |
| Open pages | `open-mod-page`, `open-collection-page` |

Most are wired in `index.tsx`'s `once()` via handlers in `eventHandlers.ts` (`eh.*`).

## API exposed to other extensions

Via the extend-API pattern, `nexus_integration` adds methods other extensions call, e.g.
`nexusRequestNexusLogin(callback)` and `nexusRetrieveCategoryList(isUpdate)`.

## Events (runtime)

| Event | Purpose |
| --- | --- |
| `request-nexus-login` (cb) | Start login |
| `refresh-user-info` | Re-fetch account/premium info |
| `endorse-mod` | Endorse a mod |
| `check-mods-version` (gameId, modIds?) | Check managed mods for newer versions |
| `mod-update` (gameId, nexusModId, fileId, source) | Update one mod to a newer file |
| `mods-update` (gameId, localModIds[]) | Update several mods ("Update all"); calls the single-mod handler directly |
| `retrieve-category-list` (isUpdate) | Pull Nexus categories |
| `submit-feedback` / `submit-collection` | Submit to Nexus |
| `open-mod-page` / `open-collection-page` | Open a Nexus page |
| `gamemode-activated` | Triggers version checks for the game |

## Gotchas

- `nxm://` download URLs are **time-limited** — resolving then sitting on it too long can 403; the
  link may need re-resolution.
- Login completes through an `nxm://…oauth` callback, so the `nxm` protocol association must be
  registered for OAuth to finish.
- Premium vs free affects download options (free downloads may route through the website / be
  rate-limited); premium status comes from `refresh-user-info`.
- Two clients (v1/v3) coexist — match the one a given call already uses.
- `mods-update` carries **local** mod ids while `mod-update` carries a **Nexus** mod id; mixing them
  up silently breaks any lookup keyed on `attributes.modId`.

## See also

Runtime siblings: `VORTEX_DOWNLOAD_MGMT.md` (nxm → transfer), `VORTEX_LOAD_ORDER.md` (how updates
affect load order), `VORTEX_MOD_INSTALL.md` (installing over a previous version),
`VORTEX_MOD_METADATA.md` (where `attributes.modId` comes from, and how it can point at the wrong
mod page), `VORTEX_EVENT_BUS.md`. Overview:
`VORTEX_APP.md`. Nexus HTTP API: `NEXUS_MODS_API.md`, `NEXUS_GRAPHQL_API.md`,
`NEXUS_FILE_PROPERTIES.md`. Diagram of the
update/version-check flow: `VORTEX_FLOWCHARTS.md` §2.
