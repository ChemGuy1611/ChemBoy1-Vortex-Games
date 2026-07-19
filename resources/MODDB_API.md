# ModDB API

ModDB (moddb.com) has no official public API. Two site-provided mechanisms cover requirements auto-download without scraping the full page:

| Mechanism | Base URL | Purpose |
| --- | --- | --- |
| RSS feed | `https://rss.moddb.com/{path}/downloads/feed/rss.xml` | File discovery, newest-first, structured XML |
| Download-start page | `https://www.moddb.com/downloads/start/{fileId}` | Resolves the current mirror URL for a file id |

`{path}` is the page's URL path relative to moddb.com, e.g. `games/dark-messiah-of-might-magic` or `mods/edain-mod`.

## Bot Protection Caveat

`www.moddb.com` blocks non-browser HTTP clients (verified: a `curl` request with a full browser header set — matching User-Agent, Accept, Accept-Language, Sec-Fetch-* — still returns `403`). This is a TLS/request-fingerprint-level block, not a missing-header issue. `rss.moddb.com` is not behind the same block and responds normally to any client.

Practical effect for Vortex extensions:

- The RSS feed can be fetched from anywhere (main or renderer process).
- Resolving a mirror URL from `/downloads/start/{fileId}` must run from the Electron **renderer** process, where `fetch` uses the real Chromium network stack (same reasoning as the GitHub `downloader.js` — see [DOWNLOADER.md](DOWNLOADER.md)).
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
2. **Fallback:** if the download-manager request fails, re-resolve the mirror URL and `fetch` the file directly in the renderer, stream it to a temp file, and hand that off to the `import-downloads` event — the same fetch-then-import pattern the GitHub `downloader.js` uses (see [DOWNLOADER.md](DOWNLOADER.md)).

A requirement can skip step 1 entirely with the `skipDownloadManager` flag once the block is confirmed for its page's mirrors — this avoids a doomed download attempt (and a failed entry on the Downloads page) on every install.

## Shared moddb_downloader.js Module

`resources/downloader/moddb_downloader.js` packages the pattern above into a reusable requirements auto-downloader — the ModDB counterpart to the GitHub `downloader.js` and the GameBanana `gamebanana_downloader.js` (see [DOWNLOADER.md](DOWNLOADER.md) and [GAMEBANANA_API.md](GAMEBANANA_API.md)). It downloads and installs ModDB-hosted requirements (mods, tools, or launchers), resolves each requirement's latest file via the RSS feed, and raises an "update available" notification when a newer file appears.

As with the other downloader modules, the canonical copy lives in `resources/downloader/` and each adopting extension bundles its own copy next to its `index.js` — changes to the canonical file must be propagated manually. Consumer wiring snippets live in `resources/downloader/template_moddb_downloader.js`.

### The requirement object

The entry points take an array of requirement objects (conventionally a `MODDB_REQUIREMENTS` constant in `index.js`), each describing one ModDB-hosted requirement:

| Field | Required | Meaning |
| --- | --- | --- |
| `moddbPath` | yes | URL path relative to moddb.com, e.g. `'games/dark-messiah-of-might-magic'` or `'mods/edain-mod'`. Builds the RSS feed URL and the default `pageUrl`. |
| `modType` | yes | Vortex mod type id the requirement installs as; also the installed-detection key (any mod with this type counts as installed). |
| `userFacingName` | yes | Display name in notifications and on the download. |
| `filePattern` | optional | RegExp tested against RSS item titles, narrowing the feed to this requirement's files. Default: the newest item in the feed. |
| `fallbackVersion` | optional | Version attribute to record when the feed is unreachable. |
| `fallbackFileId` | optional | File id used to resolve a download when the feed is unreachable. Without it, an unreachable feed fails the install with a manual-download error. |
| `skipDownloadManager` | optional | When `true`, skip the download-manager route and fetch the file directly in the renderer before importing it. Use for pages where the www-host bot-block is confirmed for mirror URLs (the verified steady state). Default `false`. |
| `fileIdAttribute` | optional | Mod attribute tracking the installed ModDB file id for update checks. Default `'moddbFileId'`. |
| `versionPattern` | optional | RegExp whose capture group 1 is the version, run against the RSS item title. Default `/\[([^[\]]+)\]\s*$/` (matches titles like `"[wOS] Dark Messiah Mod Launcher [R1-08.16]"`). |
| `pageUrl` | optional | Manual-download page opened on install failure. Default derived from `moddbPath` (`https://www.moddb.com/{moddbPath}/downloads`). |
| `archiveFileName` | optional | Fallback name for the temp file used only by the direct-fetch fallback route, when neither the response URL nor `content-disposition` yields a usable name. |

### Exports

| Export | Role |
| --- | --- |
| `downloadModDb(api, gameSpec, requirements, check = true)` | Download + install each requirement in the array (sequentially) — mirror URL via the download manager, falling back to a direct fetch + import if that fails — then enable it, set its mod type, and record version + file id attributes. With `check = true` (default) it is a no-op for requirements already installed; pass `false` to (re)install/update. Main entry point — call in `setup()`. |
| `checkForModDbUpdate(api, gameSpec, requirements)` | For each requirement in the array, compare the tracked file id against the latest RSS feed item; raise a warning notification with a Download action when newer. Call from a `check-mods-version` handler and after the `setup()` download. |
| `downloadModDbRequirement(api, gameSpec, requirement, check = true)` | Single-requirement variant of `downloadModDb`. |
| `checkForModDbUpdateRequirement(api, gameSpec, requirement)` | Single-requirement variant of `checkForModDbUpdate`. |
| `isModDbRequirementInstalled(api, gameId, requirement)` | Whether any mod with the requirement's mod type exists. |
| `getLatestModDbFile(requirement)` | Newest matching RSS item (`{ id, title, link, date }`), or `null` if the feed is unreachable. |
| `getLatestModDbVersion(requirement, file)` | Version parsed from the given file's title via `versionPattern`, or `null`. |
| `resolveModDbDownloadUrl(fileId)` | Resolves a file id to its current mirror download URL, or `null` if unreachable. |

### Behaviors worth knowing

- **Source attribution.** A successful install sets the mod's `source` attribute to `'website'` and `url` to `pageUrl(requirement)` (the ModDB page, not the download link) — Vortex renders this as a clickable "Source" link in the mod details panel.
- **Feed-unreachable fallback.** `getLatestModDbFile` returns `null` on failure. The installer then falls back to `fallbackFileId`/`fallbackVersion`; the update check silently skips (nothing to compare against).
- **No silent auto-update.** `checkForModDbUpdate` only notifies; the user-driven Download action performs the update via `downloadModDbRequirement(..., false)`.
- **Overlap guard.** A requirement whose install is already running is skipped (e.g. double-clicked toolbar action), keyed by mod type.
- **Install failure opens the page.** A failed download/install shows an error notification and opens `pageUrl` for a manual download.
- **Per-game pieces stay in `index.js`.** The mod type registration and the `registerInstaller` test/install pair for the requirement are not part of this module.

## Caveats

- No official API and no documented rate limit — keep request volume low.
- The download-start/mirror HTML structure is not versioned by ModDB; treat the mirror-link regex as fragile and keep the direct-fetch fallback route in place.
- Page paths (`games/<slug>` vs `mods/<slug>`) must match the entity type exactly — the RSS feed for a game page only lists files uploaded to that game page, not to mods under it.
