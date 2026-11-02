# mod.io API

mod.io hosts mods for games that integrate its SDK, usually alongside in-game mod browsing. This
page covers what a Vortex extension needs to read mod data and download files from it: the two API
endpoints, the records, the download URL chain, and the shared `modio_browser.js` module.

Probed live against Quarantine Zone: The Last Check (`name_id` `quarantine-zone`, game id `12104`)
in November 2026.

## Two endpoints

| Endpoint              | Auth                                      | Used by                                    |
| --------------------- | ----------------------------------------- | ------------------------------------------ |
| `https://api.mod.io/v1` | `api_key` query parameter or OAuth bearer | Documented REST API (docs.mod.io)          |
| `https://mod.io/v1`     | none, with header `X-Modio-Origin: web`   | The mod.io website's own frontend          |

The documented API refuses every request without a key (`401`, `error_ref` `11000`). Keys are issued
per application or per user, so a public extension cannot ship one.

The website frontend (a JavaScript-only page; the served HTML is an empty shell) reads the same
records from `https://mod.io/v1`. That endpoint answers anonymous requests, but only mod-level
lookups need the `X-Modio-Origin: web` header: the game record returns without it, while
`/games/{game}/mods/{id}` returns the same `401` until the header is present. Responses are
identical in shape to the documented API's.

`modio_browser.js` uses the website endpoint, keeping every call in one `apiGet()` helper so a keyed
endpoint could replace it in one place. It is undocumented and may change without notice.

### CORS

`https://mod.io/v1` answers a CORS preflight from any origin other than mod.io's own with no
`Access-Control-Allow-Origin` header. The custom header forces a preflight, and Vortex's main window
enforces CORS, so a renderer `fetch` with that header fails inside Vortex even though the same call
succeeds from Node or curl. Use Node's `https` module (the renderer has `nodeIntegration`) instead.

## Games

`GET /games/@{name_id}` or `/games/{id}`. Anywhere a numeric game id appears in a path, `@{name_id}`
works too. The `name_id` is the slug in the site URL: `https://mod.io/g/quarantine-zone`.

| Field                 | Meaning                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                  | Numeric game id (not the number in image URLs - `/games/2976/12104/` there is a path hash, then the id) |
| `name_id`             | URL slug                                                                                       |
| `api_access_options`  | Bit field: `1` allows third-party API access, `2` allows direct downloads. `3` = both          |
| `dependency_option`   | Whether mods may declare dependencies                                                          |

## Mods

`GET /games/{game}/mods` (paginated envelope: `data`, `result_count`, `result_offset`,
`result_limit`, `result_total`) and `GET /games/{game}/mods/{id}`.

| Field          | Meaning                                                                         |
| -------------- | ------------------------------------------------------------------------------- |
| `id`           | Numeric mod id, unique site-wide                                                |
| `name_id`      | URL slug - `profile_url` is `https://mod.io/g/{game}/m/{name_id}`               |
| `status`       | `1` = accepted                                                                  |
| `visible`      | `1` = public                                                                    |
| `modfile`      | The current file record (below)                                                 |
| `platforms`    | `[{ platform, modfile_live }]` - the live file id per platform; may be empty    |
| `dependencies` | Boolean: whether the mod declares any. The list itself is a separate call       |
| `tags`         | `[{ name }]`                                                                    |

A mod carries one live file per platform. `modfile` is one of them and often not the Windows one: of
the 100 most popular mods in November 2026 it was another platform's file on 97 for Abiotic Factor
and 47 for STALKER 2. Pick the file from `platforms[].modfile_live` for the platform you install for
and fetch it by id when it differs. Each platform's file has its own archive name.

A game without per-platform files (Anno 117) has an empty `platforms` on both the mod and the file
records, and `modfile` is the only live file.

### Dependencies

`GET /games/{game}/mods/{id}/dependencies` returns `data[]` of whole mod records (`id` is the
dependency's mod id). No version pin. Only worth calling when the mod's `dependencies` flag is true.

## Files

`GET /games/{game}/mods/{id}/files` (filterable: `?filename=` matches the archive name exactly) and
`GET /games/{game}/mods/{id}/files/{fileId}`.

| Field                   | Meaning                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `id`                    | File id - grows with every upload, so it orders a mod's releases  |
| `mod_id`                | Owning mod                                                        |
| `version`               | Free text, often absent or inconsistent                           |
| `filename`              | Archive name, e.g. `quaraintinestories_v0911-326r.zip`            |
| `filehash.md5`          | MD5 of the archive                                                |
| `virus_status`          | `1` = scanned                                                     |
| `platforms`             | `[{ platform, status }]`                                          |
| `download.binary_url`   | Download URL (below); `download.date_expires` is its expiry       |

Versions are free text, so compare releases by file id, not by version.

## Downloading

`binary_url` is `https://g-{gameId}.modapi.io/v1/games/{gameId}/mods/{modId}/files/{fileId}/download`.
It needs no authentication on a game that allows direct downloads, and answers `302` to
`https://binary.modcdn.io/mods/{hash}/{modId}/{filename}?verify={signature}`, which serves the archive
(`200`, `Content-Type: application/zip`, `Access-Control-Allow-Origin: *`, range support, **no
`Content-Disposition`**).

Archive naming follows from that:

- A download started from `binary_url` itself ends in the segment `download`, which Vortex takes as
  the file name - no extension. Resolve the redirect first (a `HEAD`, reading `Location`) and hand
  over the CDN URL, whose last segment is the real archive name. Vortex reads only the URL's
  pathname, so the `?verify=` query does not end up in the name.
- A download captured from an embedded page is unaffected: Vortex receives the post-redirect CDN URL.

### What the site's Download button does

On a game whose files anyone may download, the site renders a plain `<a target="_blank">` pointing at
`binary_url` - a popup, which an embedded page sees in `onNewWindow`.

Which files get a button depends on the game. With no per-platform files, the mod's `modfile` is the
one live file. With per-platform files, the live list holds one row per platform's live file,
labelled by platform ("Windows", "PS5", "Xbox Series X", "Windows Server") - the site does not pick
one, so a user can click another platform's build as easily as the Windows one. Older files are
listed separately under "Download files manually".

On a game that restricts downloads to logged-in users or purchasers, it instead fetches the file in
the page and saves it from a `blob:` URL. Vortex's download manager cannot fetch that, so such games
are not supported by the browser module.

## Archive layout

Mods built with an Unreal mod kit ship as a plugin:

```text
ModName.uplugin
Content/Paks/Windows/ModNameGame-Windows.pak
Content/Paks/Windows/ModNameGame-Windows.ucas
Content/Paks/Windows/ModNameGame-Windows.utoc
```

The `.uplugin` sits at the archive root with no wrapper folder, and the archive name carries a
version and upload suffix, so an installer should name the target folder after the `.uplugin` file.
Quarantine Zone and Abiotic Factor both ship this layout (Abiotic's sometimes adds
`Config/<Plugin>Tags.ini`), with no `mod.json`, and load it from `<GameFolder>/Mods/<Plugin>/`.

Anno 117 archives are `<Wrapper>/modinfo.json` plus `data/base/config/...`, sometimes several mods in
one archive, and install whole into the game's `mods` folder with the wrapper kept.

## Shared modio_browser.js Module

`resources/browsers/modio_browser.js` (plus `base_browser.js`, both copied beside the adopter's
`index.js`) registers a Vortex page embedding `https://mod.io/g/{name_id}/m`. A download click becomes
a managed install, stamped with `modioMod` (mod id), `modioVersion` and `modioFileId`.

- **Config:** `modioGame` (the `name_id`, required) and `platform` (default `windows`), plus the
  shared browser config fields.
- **Claims:** both URL shapes carry the mod id. The `binary_url` form also names the file id; the CDN
  form names the file by its archive name, resolved through `?filename=`.
- **Installs:** the file clicked is the file installed, even an older one from the Files tab. Installs
  started by the module itself (update notifications, dependencies) take the platform's live file.
- **Wrong-platform clicks:** before a clicked file downloads, its record is checked. A file listing
  platforms without the configured one is swapped for that platform's live file, with a notification
  ("That file is the PS5 build - installing the Windows file instead"). A mod with no file for the
  platform installs nothing and says so. A file listing no platforms, or a failed lookup, downloads
  as clicked. `modio_browser.js` keeps the `api` for that notification itself, in the source's
  `adapterState`, because the base's `routeUrl` context does not carry one.
- **Updates:** compared by file id.
- **Dependencies:** offered when the mod's `dependencies` flag is set; mods without any cost no
  extra call.
- **Hosts:** `mod.io` (and its `auth.mod.io` login), `modapi.io`, `modcdn.io`. mod.io shows no ads.

Wiring reference: `resources/browsers/template_modio_browser.js`. Adopters and the base contract:
`BROWSER_MODULES.md`.

## Repo tools

- `python find_modio_games.py [--loose]` — which `game-*` extensions have a mod.io page, with the
  `modioGame` value, mod count, download access and adoption state.
- `python modio_listings.py <name_id> --count 40` — what the most popular archives contain, read
  from the zip central directory without downloading them.
- `node replay_installers.js <game_id> modio_listings_<name_id>.json` — which of the extension's
  installers claims each of those archives and where its files would land.

Details: `SCRIPTS.md`.

## See also

`BROWSER_MODULES.md` (the browser module family, adapter contract and adopters).
`EMBEDDED_BROWSER.md` (the `Webview` control and the download capture chain).
`VORTEX_DOWNLOAD_MGMT.md` (how Vortex names a download).
`MODWORKSHOP_API.md`, `GAMEBANANA_API.md`, `THUNDERSTORE_API.md` (the other browser sources).
