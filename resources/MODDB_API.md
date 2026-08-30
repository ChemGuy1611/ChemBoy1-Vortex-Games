# ModDB API

ModDB (moddb.com) has no official public API. Two site-provided mechanisms cover requirements auto-download without scraping the full page:

| Mechanism | Base URL | Purpose |
| --- | --- | --- |
| RSS feed | `https://rss.moddb.com/{path}/downloads/feed/rss.xml` | File discovery, newest-first, structured XML |
| Download-start page | `https://www.moddb.com/downloads/start/{fileId}` | Resolves the current mirror URL for a file id |

`{path}` is the page's URL path relative to moddb.com, e.g. `games/dark-messiah-of-might-magic` or `mods/edain-mod`.

## Bot Protection Caveat

`www.moddb.com` blocks non-browser HTTP clients (verified: a `curl` request with a full browser header set — matching User-Agent, Accept, Accept-Language, Sec-Fetch-* — still returns `403`). This is a TLS/request-fingerprint-level block, not a missing-header issue. `rss.moddb.com` is not behind the same block and responds normally to any client.

The block covers the **whole** www host, static paths included: `www.moddb.com/favicon.ico` returns `403` like every other path, so the "an unrouted static file slips the challenge" trick that works on some Cloudflare sites does not work here. Site assets are reachable on `media.moddb.com`, which answers any client — `media.moddb.com/favicon.ico`, `/images/global/moddb.png` and `/safari-pinned-tab.svg` all return `200`. That last one is the site's vector mark, a single-path potrace on a clean ten-by-ten pixel grid, and is where the browser module's sidebar icon comes from.

Practical effect for Vortex extensions:

- The RSS feed can be fetched from anywhere (main or renderer process).
- Resolving a mirror URL from `/downloads/start/{fileId}` must run from the Electron **renderer** process, where `fetch` uses the real Chromium network stack (same reasoning as the GitHub `downloader.js` — see `DOWNLOADER.md`).
- The block extends to the resolved mirror URLs: Vortex's main-process download manager receives `403` when fetching them (verified live against the Dark Messiah launcher mirror). The direct-fetch route in "Two-Step Download" below is therefore the expected working path, not an edge-case fallback.

## RSS Feed

`GET https://rss.moddb.com/{path}/downloads/feed/rss.xml`

Standard RSS 2.0. Items are newest-first. Each `<item>` relevant to file discovery:

```xml
<item>
  <title>[wOS] Dark Messiah Mod Launcher [R1-08.16]</title>
  <link>https://www.moddb.com/games/dark-messiah-of-might-magic/downloads/wos-dark-messiah-mod-launcher-r1-0816</link>
  <pubDate>Sat, 16 Aug 2025 01:37:39 +0000</pubDate>
  <guid isPermaLink="false">downloads295315</guid>
  <description><![CDATA[...]]></description>
</item>
```

- `<title>` — file display name; maintainers commonly embed the version in a trailing `[...]` bracket, as in the example above.
- `<link>` — the file's human page URL.
- `<pubDate>` — upload date, RFC 822 format (parses directly with `new Date(pubDate)`).
- `<guid isPermaLink="false">downloads{fileId}</guid>` — the numeric file id, prefixed with `downloads`. This id is what `/downloads/start/{fileId}` and the mod-attribute tracking need.
- Text fields use numeric HTML entities for punctuation (e.g. `&#45;` for `-`) — decode before regex-matching a version out of the title.

There is no documented rate limit on the RSS feed; keep polling infrequent (once per requirement per `setup()`/update-check, not on a timer).

## Resolving a Download URL

`GET https://www.moddb.com/downloads/start/{fileId}` returns an interstitial HTML page containing a mirror link:

```html
<a href="/downloads/mirror/295315/4110/...">download wos_dm_modlauncher_r1_0816.zip</a>
```

The mirror href is what actually serves file bytes (or redirects to ModDB's CDN). Treat it as single-use / short-lived — re-resolve it rather than caching it across a retry.

## Two-Step Download

The download-manager route through ModDB's www host is blocked by the bot-protection layer (verified live — the mirror request returns `403`). Extensions still use a hybrid approach in case the block is relaxed or varies by mirror/CDN node:

1. **Primary:** resolve the mirror URL via a renderer `fetch` against `/downloads/start/{fileId}`, then hand that URL to Vortex's `start-download` event so the download manager owns progress/resume.
2. **Fallback:** if the download-manager request fails, re-resolve the mirror URL and `fetch` the file directly in the renderer, stream it to a temp file, and hand that off to the `import-downloads` event — the same fetch-then-import pattern the GitHub `downloader.js` uses (see `DOWNLOADER.md`).

A requirement can skip step 1 entirely with the `skipDownloadManager` flag once the block is confirmed for its page's mirrors — this avoids a doomed download attempt (and a failed entry on the Downloads page) on every install. The trade-off is that the fallback route has no progress UI: the user sees only an "Installing …" activity notification for the whole transfer. That is tolerable even for multi-GB requirements, but it is the reason to leave the flag off wherever the download manager still works.

### Do not use `Readable.fromWeb` on a renderer fetch body

The obvious way to write step 2's response to disk is `pipeline(Readable.fromWeb(response.body), createWriteStream(path))`. It does not work in Vortex's renderer, and the failure is easy to misread:

```text
TypeError [ERR_INVALID_ARG_TYPE]: The "readableStream" argument must be an instance of
ReadableStream. Received an instance of ReadableStream
```

Electron's renderer has two unrelated `ReadableStream` implementations: the global one from Blink, which `fetch` returns, and the one exported by `node:stream/web`, which is what `Readable.fromWeb` brand-checks its argument against. A Blink stream is never an instance of the Node class, so the call always throws — hence the message naming the same type twice.

Drain the web stream by hand instead (`body.getReader()` plus a `read()` loop writing into a `node:fs` write stream, honouring the `write()` return value for backpressure). Buffering the whole response with `response.arrayBuffer()` also sidesteps the problem, but ModDB files run to several GB, so it is not a viable substitute. The hand-drained route is verified against a multi-GB download.

Note that `vortex-api`'s `fs` re-exports `createWriteStream`, but marks it `@deprecated use node:fs directly` — require it from `fs`.

## Shared moddb_downloader.js Module

`resources/downloader/moddb_downloader.js` packages the pattern above into a reusable requirements auto-downloader — the ModDB counterpart to the GitHub `downloader.js` and the GameBanana `gamebanana_downloader.js` (see `DOWNLOADER.md` and `GAMEBANANA_API.md`). It downloads and installs ModDB-hosted requirements (mods, tools, or launchers), resolves each requirement's latest file via the RSS feed, and raises an "update available" notification when a newer file appears.

As with the other downloader modules, the canonical copy lives in `resources/downloader/` and each adopting extension bundles its own copy next to its `index.js` — changes to the canonical file must be propagated manually. Consumer wiring snippets live in `resources/downloader/template_moddb_downloader.js`.

### The requirement object

The entry points take an array of requirement objects (conventionally a `MODDB_REQUIREMENTS` constant in `index.js`), each describing one ModDB-hosted requirement:

| Field | Required | Meaning |
| --- | --- | --- |
| `moddbPath` | yes | URL path relative to moddb.com, e.g. `'games/dark-messiah-of-might-magic'` or `'mods/edain-mod'`. Builds the RSS feed URL and the default `pageUrl`. |
| `modType` | yes | Vortex mod type id the requirement installs as; also the installed-detection key (any mod with this type counts as installed). |
| `userFacingName` | yes | Display name in notifications, on the download, and in the mod list (stamped as the mod's `customFileName`). |
| `filePattern` | optional | RegExp tested against RSS item titles, narrowing the feed to this requirement's files. Default: the newest item in the feed. |
| `fallbackVersion` | optional | Version attribute to record when the feed is unreachable. |
| `fallbackFileId` | optional | File id used to resolve a download when the feed is unreachable. Without it, an unreachable feed fails the install with a manual-download error. |
| `skipDownloadManager` | optional | When `true`, skip the download-manager route and fetch the file directly in the renderer before importing it. Use for pages where the www-host bot-block is confirmed for mirror URLs (the verified steady state). Default `false`. |
| `fileIdAttribute` | optional | Mod attribute tracking the installed ModDB file id for update checks. Default `'moddbFileId'`. |
| `versionPattern` | optional | RegExp whose capture group 1 is the version, run against the RSS item title. Default `/\[([^[\]]+)\]\s*$/` (matches titles like `"[wOS] Dark Messiah Mod Launcher [R1-08.16]"`). |
| `pageUrl` | optional | Manual-download page opened on install failure. Default derived from `moddbPath` (`https://www.moddb.com/{moddbPath}/downloads`). |
| `autoInstall` | optional | `false` -> never install this requirement unattended; only an explicit user action (a toolbar button) installs it. Default installs a missing requirement automatically when the update check runs. |
| `archiveFileName` | optional | Fallback name for the temp file used only by the direct-fetch fallback route, when neither the response URL nor `content-disposition` yields a usable name. |
| `pinVersion` | optional | Hold the requirement at this file revision instead of tracking the newest feed item. Requires `pinFileId`; without it the pin is ignored with a warning. See **Version pinning** below. |
| `pinFileId` | with `pinVersion` | The file id to install for the pinned revision — the feed is newest-first with no version index, so the pin cannot be resolved without it. |
| `browseKey` | optional | Read only by `moddb_browser.js`: the browse key of the one file this requirement installs, e.g. `'mods/realrtcw-realism-mod#realrtcw'`. Without it the browse page installs that file as an ordinary mod instead of routing it to the requirement installer. |

### Version pinning

`pinVersion` + `pinFileId` hold the requirement at one file revision instead of following the newest one. It is opt-in and unset by default. While the tracked `moddbFileId` equals `pinFileId`, `checkForModDbUpdate` returns **before making any request** — a pinned requirement costs nothing against the feed. A pinned install skips the feed too; only the mirror-URL resolution still runs, since a ModDB file id always has to be turned into a mirror link.

When the installed file is not the pinned one — including when nothing is installed — the module resolves the *pinned* file, never the newest. The notification reads "pinned version available" rather than "update available", because the user may be *ahead* of the pin and installing it is then a deliberate downgrade. `autoInstall` stays orthogonal: the pin says which file, `autoInstall` says whether anything installs unattended.

The same field name and behavior exist in all five downloader modules; `DOWNLOADER.md` has the cross-module table.

### Exports

| Export | Role |
| --- | --- |
| `downloadModDb(api, gameSpec, requirements, check = true)` | Download + install each requirement in the array (sequentially) — mirror URL via the download manager, falling back to a direct fetch + import if that fails — then enable it, set its mod type, and record version + file id attributes. With `check = true` (default) it is a no-op for requirements already installed; pass `false` to (re)install/update. Main entry point — call in `setup()`. |
| `checkForModDbUpdate(api, gameSpec, requirements)` | For each requirement in the array: install it if it is missing (unless `autoInstall: false`), otherwise compare the tracked file id against the latest RSS feed item; raise a warning notification with a Download action when newer. Call from a `check-mods-version` handler and after the `setup()` download. |
| `downloadModDbRequirement(api, gameSpec, requirement, check = true)` | Single-requirement variant of `downloadModDb`. |
| `checkForModDbUpdateRequirement(api, gameSpec, requirement)` | Single-requirement variant of `checkForModDbUpdate`. |
| `isModDbRequirementInstalled(api, gameId, requirement)` | Whether any mod with the requirement's mod type exists. |
| `getLatestModDbFile(requirement)` | Newest matching RSS item (`{ id, title, link, date }`), or `null` if the feed is unreachable. |
| `getLatestModDbVersion(requirement, file)` | Version parsed from the given file's title via `versionPattern`, or `null`. |
| `resolveModDbDownloadUrl(fileId)` | Resolves a file id to its current mirror download URL, or `null` if unreachable. |

### Behaviors worth knowing

- **Source attribution.** A successful install sets the mod's `source` attribute to `'website'` and `url` to `pageUrl(requirement)` (the ModDB page, not the download link) — Vortex renders this as a clickable "Source" link in the mod details panel.
- **The mod list shows `userFacingName`, not the archive name.** Vortex renders a mod as `customFileName || logicalFileName || fileName || name`, and the install pipeline stamps `fileName` with the downloaded archive — so the install also stamps `customFileName` from `userFacingName`. Written at install only, so it cannot overwrite a name the user set afterwards. Rendering rule: `VORTEX_MOD_LIST.md`.
- **Feed-unreachable fallback.** `getLatestModDbFile` returns `null` on failure. The installer then falls back to `fallbackFileId`/`fallbackVersion`; the update check silently skips (nothing to compare against).
- **No silent auto-update.** `checkForModDbUpdate` only notifies; the user-driven Download action performs the update via `downloadModDbRequirement(..., false)`.
- **Overlap guard.** A requirement whose install is already running is skipped (e.g. double-clicked toolbar action), keyed by mod type.
- **Install failure opens the page.** A failed download/install shows an error notification and opens `pageUrl` for a manual download.
- **Per-game pieces stay in `index.js`.** The mod type registration and the `registerInstaller` test/install pair for the requirement are not part of this module.
- **A missing requirement is installed by the update check.** The update check used to return early when the requirement was not installed, so a requirement the user removed (or never got) was never picked up again. It now installs it instead. Requirements that should only be installed by an explicit user action set `autoInstall: false`.
- **Updating disables the version it replaces.** An update installs a second mod entry rather than replacing the first, so the mod ids carrying the requirement's mod type are captured before the install and disabled once the new one lands (the newly installed id is skipped). Without this both copies stayed enabled and deployed on top of each other.

## Shared moddb_browser.js Module

`resources/browsers/moddb_browser.js` is the other half: an embedded **browse page** rather than an
unattended downloader. It registers a Vortex sidebar page showing the live moddb.com section for one
game, and turns a click on a download link into a managed install. The page, the install driver and
the update check live in `resources/browsers/base_browser.js`; an adopting extension carries **both**
files beside its `index.js`, because the source module requires the base from beside itself. The
contract, the config fields and the adopter list are in `BROWSER_MODULES.md`; only what ModDB does
differently is below.

**It is the only browser module that fetches its own bytes.** Every other source hands its download
URL to Vortex's download manager. That is impossible here, so the adapter sets
`fetchStrategy: 'click'` and supplies a `fetchToFile`, which fetches in the renderer and hands the
base a local path. The base imports it, which *moves* the file into the download folder, and the
install proceeds normally. Same trade-off as `skipDownloadManager`: no progress bar, just an
"Installing …" notification for the whole transfer.

### The download does not start as a navigation, and does not end on moddb.com

Three things about a real download click, all found in one live test (2026-08-29) and none of them
guessable from the site's URL shapes:

- **The download button opens a modal at the same URL.** There is no navigation, so an embedded page
  gets no `did-navigate`, `did-navigate-in-page` or `new-window` for it — a browser module's
  `routeUrl` never sees the click at all. The click goes straight to Chromium, which converts it to a
  download and hands the URL to Vortex.
- **The URL Vortex is handed is not a moddb.com URL.** A download resolves out to DBolical's CDN:

  ```text
  https://fmt5.dl.dbolical.com/dl/2026/04/04/wOS_RogueArena.1.rar?st=<signature>&e=<expiry>
  ```

  Signed, short-lived, and carrying an archive name and **nothing else** — no mod, no file id. Any
  claim rule written against `/downloads/start/{id}` or `/downloads/mirror/{id}` will never match a
  real captured download.
- **The CDN refuses the main process too**, exactly as the www host does: the download manager fails
  with `DownloadError: Network request failed` about 450ms in. The bot-block is one hop further out
  than the "Bot Protection Caveat" section above describes.

So the site's own button always produces a failed Vortex download. The module takes that failure
over: `base_browser.js` watches `persistent.downloads.files` for one of its downloads entering
`failed`, removes the entry, and re-fetches the URL in the renderer — which works, and is the same
route `moddb_downloader.js` has used successfully all along. `VORTEX_DOWNLOAD_MGMT.md` covers why a
state watch is needed rather than an event.

The file id is then recovered by reading the file page the download was started from, scraping its
`/downloads/start/{id}` link; the same fetch yields the human title, which ModDB formats as
`"<file> file - <mod> mod for <game> - ModDB"`.

### Identity: the page, not the file

ModDB mints a **new file id for every release**. Keying a browsed mod on its file id would therefore
make an update impossible to detect — the id such a key resolves to is by definition the one already
installed. The key is the mod's *page*, plus a second half naming which file on that page it is:

```text
mods/realrtcw-realism-mod#realrtcw
games/dark-messiah-of-might-magic#wosdarkmessiahmodlauncherr
```

The second half is needed because a ModDB page hosts language packs, demos and localisations beside
its releases; keying on the page alone would offer "Real RTCW 5.0 Czech Localization" as an update to
"RealRTCW 5.44" purely for being newer.

**That half is the letters of the download's URL slug, never its title.** ModDB slugs keep a stable
stem and push the version into digits, so stripping everything but letters collapses a file's
releases and separates its neighbours:

| Slugs on one page | Letters only | Result |
| --- | --- | --- |
| `realrtcw-50`, `realrtcw-40`, `realrtcw-31` | `realrtcw` | three releases of one file, merged |
| `realrtcw-50-additional-languages-pack` | `realrtcwadditionallanguagespack` | separate file, kept apart |
| `real-rtcw-czech-localization` | `realrtcwczechlocalization` | separate file, kept apart |
| `endrv-0140`, `endrv-0131`, `endrv-0120`, `endrv` | `endrv` | four releases, merged |

Titles do not survive the same treatment, which is why they are not used: "[wOS] Rogue - Combat
Arena" is slugged `rogue-combat-arena-wos` (different word order), "2027" has no letters at all, and
"GMDXv9.0.3 FULL" is slugged `gmdxv90-release`.

### Nothing in a download URL says which mod it came from

`https://www.moddb.com/downloads/start/295315` is the entire identity a click carries. The page the
click came from supplies the rest, so the module keeps a ring of visited file pages
(`/{path}/downloads/{slug}`) in the base's per-page adapter state and joins the click to the most
recent one. That is exact rather than a guess: ModDB has no download button anywhere except a file's
own page. A mirror URL reached with an empty ring still installs, just without attribution.

### What the feed is and is not used for

The RSS feed names and dates the files on a page — nothing else. It is never on the install path: an
install resolves the file id the user actually clicked, because the feed only carries the ten newest
files and the user may well be downloading an older one. Listings are cached per page for five
minutes, since an update check walks every installed mod at once and several commonly share a page.
A mod page whose own feed 404s falls back to the game feed, filtered to that page.

Update comparison is on the file id, which is a site-wide autoincrement and the one thing on this
host that orders reliably; the version string is parsed out of the title (trailing `[...]` bracket,
then a trailing dotted number, then a `v1.1` form) for display only.

## Caveats

- No official API and no documented rate limit — keep request volume low.
- The download-start/mirror HTML structure is not versioned by ModDB; treat the mirror-link regex as fragile and keep the direct-fetch fallback route in place.
- Page paths (`games/<slug>` vs `mods/<slug>`) must match the entity type exactly — a path that names the wrong type 404s.
- A **game** feed is not limited to files uploaded to the game page: it carries files from the mods under it as well, each `<link>` naming its own owning page. Verified against four game feeds — `games/dark-messiah-of-might-magic` returns items linking to `mods/the-trials-of-kha-baleth` and `mods/dark-messiah-advanced-sdk`, and `games/unreal-tournament-2004` mixes `games/…/downloads/gibfix` with files on four different mod pages. That makes the game feed a usable fallback for a mod page whose own feed 404s. A **mod** feed does stay inside that one mod.
- Every feed returns the **ten newest** files and nothing older, with no paging parameter — enough to name a recent file or spot a newer one, never a full index of a page.

---

## See also

`BROWSER_MODULES.md` (the embedded-browse page family, and the `moddb_browser.js` section below's
counterpart there).
`VORTEX_DOWNLOAD_MGMT.md` (the `start-download`/`import-downloads` events `moddb_downloader.js`
hands off to). `VORTEX_MOD_INSTALL.md` (installing the downloaded requirement as a managed mod).
`VORTEX_MOD_METADATA.md` — covers the `modmeta-db` **metadata cache**, an unrelated package that
shares the "moddb" name with this site. `GAMEBANANA_API.md`, `MODWORKSHOP_API.md`, and
`THUNDERSTORE_API.md` (the other third-party mod hosts this repo queries; ModWorkshop inverts the
block described above — its API host answers any client while its web host returns `403` — and
Thunderstore blocks nothing at all). `PCGAMINGWIKI_API.md` (game-metadata lookups, and another site
where Cloudflare blocks part of the surface).
`FCMODDING_API.md` (the Far Cry Mod Installer host — `fcmodding_downloader.js` is modelled on
`moddb_downloader.js`, minus the bot-block fallback route this host does not need).
`CODEBERG_API.md` (the Forgejo/Gitea release API — the inverse of this host in every respect: a
documented JSON API, no bot check, and asset URLs that answer a plain `200` with nothing to resolve).
`GITHUB_API.md` (the default requirement host, and the API `downloader.js` talks to).
`STEAMCHARTS_API.md` (a third-party host behind Cloudflare that challenges nothing at all — no
User-Agent needed, no fallback route, the opposite end of the scale from this one).
