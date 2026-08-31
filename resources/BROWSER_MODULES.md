# Browser Modules

A browser module registers a Vortex page that embeds a mod site's **own website** and turns a click
on its download link into a managed install. The site is the UI — search, categories, mod pages,
screenshots and all — so there is no card grid to build and no API surface to keep in step with the
site's design.

Modules live in `resources/browsers/`: `base_browser.js`, one canonical adapter per source, and a
`template_*.js` reference for each. `resources/downloader/` stays downloaders-only.

Everything that is the same for every site lives in the base; a source module supplies only what its
own site does differently. An adopting extension therefore carries **two** files —
`base_browser.js` and its source module — because the source module requires the base from beside
itself.

| | Downloader module | Browser module |
| --- | --- | --- |
| Purpose | Install known requirements unattended | Let the user browse and pick |
| Trigger | `setup()`, update check, toolbar button | The user, on a page |
| Knows in advance | Namespace, name, mod type per requirement | Nothing; the reference comes from the click |
| Mod type | Sets one per requirement | Never sets one |
| Lists | `resources/lists/games-downloader-*.txt` | none of its own — see below |

An extension can carry either, both, or neither. Hades II carries both: `thunderstore_downloader.js`
installs the Hell2Modding loader and the ModUtil dependency closure, `thunderstore_browser.js` gives
the user the rest of the community. DOOM Eternal is the same pairing on GameBanana:
`gamebanana_downloader.js` keeps EternalModInjector current, `gamebanana_browser.js` opens the game's
mod section inside Vortex.

## Adopter model

Same as the downloader modules: every adopter carries a **byte-identical copy** of the canonical
files, required with a relative path. Two files, not one — the source module and the base.

```js
const { registerThunderstoreBrowser, onceThunderstoreBrowser } = require('./thunderstore_browser');
const { registerGameBananaBrowser, onceGameBananaBrowser } = require('./gamebanana_browser');
const { registerModWorkshopBrowser, onceModWorkshopBrowser } = require('./modworkshop_browser');
```

`index.js` never requires the base directly; the source module does. Copying only the source module
fails at require time, on the machine where the extension is being tested rather than in the repo.

Every export name carries its source: the Thunderstore module's `registerThunderstoreBrowser` /
`installThunderstorePackage` are `registerGameBananaBrowser` / `installGameBananaItem` in the
GameBanana one, and so on down the table below.

A change to a canonical file must be propagated to every adopter copy in the same session, and the
copies verified by hash. A change to `base_browser.js` touches **every** adopter of **every** source,
so its blast radius is the union of every source's adopter roster (below) across all games.

Browser modules have no `games-browser-*.txt` list of their own. A game gets a source's browser page
as standard equipment alongside that source's downloader module - it is not an independent decision -
so the roster is the same `games-downloader-*.txt` list `categorize_games.py` already writes. A
separate browser list would just be a copy of that list that silently drifts out of sync. To find
current adopters of a source's browser module specifically (as opposed to just its downloader),
grep that list's games for a bundled `*_browser.js` file.

`deploy_to_vortex.py` copies `index.js` plus every bundled `*downloader.js` and `*browser.js` beside
it, so both files reach the deployed extension without `--force`. That suffix rule is why the base is
named `base_browser.js` and not `browser_base.js`: a file that does not end in `browser.js` would
never be copied, and every adopter would fail to load.

## The base and its adapters

There are two contracts, and they are easy to confuse. The **config** is per *game*, written by the
adopting extension. The **adapter** is per *site*, written once inside the source module.

`base_browser.js` owns the page component (chrome, history, host allow-list, the external-content
confirmation, ad-slot hiding and ad-popup dropping, `onNewWindow` routing), the `did-finish-download`
claim and its prune, the `did-install-mod` adoption and attribute stamping, the self-started-URL
guard, the install driver, the optional dependency walk and prompt, the update check, and
`registerMainPage` wiring. It exports one function, `createBrowserModule(adapter)`, which returns
those behaviours bound to a source; a source module is then a thin re-export under its own names.

| Adapter member | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Short source id. Namespaces the page id (`<gameId>-<id>-browse`) and the per-page state |
| `label` | yes | Human name of the site, used in messages, notifications and log lines |
| `defaults` | no | Per-source defaults a config may override: `packageAttribute`, `versionAttribute`, `allowedHosts`, `icon`, `mdi`, `pageTitle`, `homeTooltip`, `adSelectors`, `blockedHosts` |
| `homeUrl(config)` | yes | Where the page opens and what Home returns to |
| `refKey(ref)` / `parseKey(key)` | yes | The package-attribute string and its inverse. **No shared hyphen rule** — Thunderstore's split-at-the-first-hyphen is valid only because its ids are `[a-zA-Z0-9_]` |
| `requirementKey(req)` | yes | An adopter requirement → the same key string, for install routing and installed-detection |
| `parseClaim(download)` | yes | A finished download record → a partial reference, or null for "not ours" |
| `resolve(config, ref)` | yes | The authoritative lookup → `{ version, downloadUrl, pageUrl, dependencies?, ... }` or null |
| `resolveForInstall(config, ref)` | no | Resolve for a reference that already names its own version. Default is `resolve`; Thunderstore overrides it to avoid an API call the URL already answered |
| `identify(config, state, partial)` | no | Partial reference → Promise of a full one. Default passes it straight through; GameBanana implements it because its download URLs do not identify the mod |
| `routeUrl(ctx, url, navigated)` | no | First refusal on every URL the page opens. Return `true` to consume it |
| `displayName(resolved, key)` | no | What the mod list and notifications call the mod. **Default is the key**, which is always correct — no field on the resolved record is treated as a human title by convention |
| `archiveName(resolved, key)` | no | File name Vortex should save the archive under. Needed only where the source's download URL carries no file name of its own and its server sends no `Content-Disposition` — see below |
| `extraAttributes(config, resolved)` | no | `[[name, value], ...]` stamped on top of the standard attribute set |
| `dependencies` | no | `true` only when the source publishes a machine-readable dependency graph |
| `fetchStrategy` / `fetchToFile` | no | `'capture'` (default) or `'click'` — see below |
| `unresolvedMessage` | no | Error text when a reference cannot be resolved |
| `installedInfo` / `compareInstalled` / `isUpdate` / `updateRef` | no | Update-check hooks. The defaults compare semver-coerced versions; a source whose versions are free text overrides all four |

`template_base_browser.js` is a commented skeleton of exactly this, ready to copy.

Two things the base deliberately does **not** assume:

- **A dependency graph.** Only Thunderstore has one. The walk and the prompt are gated on
  `dependencies`, so a source without one makes no extra API calls rather than resolving an empty
  list.
- **That Vortex can fetch the bytes.** `fetchStrategy: 'capture'` is today's behaviour — the view
  requests the download URL and Vortex's own chain turns it into a download the claim handler sees.
  `'click'` is what `moddb_browser.js` uses, because the main-process download manager cannot fetch
  from that host at all: the adapter fetches in the renderer instead and the base hands the finished
  file to `import-downloads`, which **moves** it into the download folder, so there is nothing to
  clean up afterwards. Three consequences worth knowing. An imported download carries no source URL,
  so the claim handler never sees it — a click source that wants its mod stamped routes the click
  through `ctx.install(ref)` rather than `ctx.requestDownload(url)`. The transfer has no progress UI:
  the user sees an "Installing …" activity notification for the whole download, the same trade-off
  `moddb_downloader.js` makes with `skipDownloadManager`. And the site's own download button may not
  reach `routeUrl` at all — see below.

### When the site's own button never reaches the module

`routeUrl` only ever sees what arrives as a navigation or a popup. A site whose download button
opens a **modal at the same URL** produces neither: the click goes straight to Chromium, which
converts it into a download and hands the URL to Vortex, whose download manager then fails on it for
exactly the reason the source is a click source in the first place. ModDB is that shape, and it was
invisible until a live test — every URL rule in the adapter was correct and none of them ever ran.

The base handles it by taking the failure over, which is gated on `fetchStrategy: 'click'` and so
costs the capture sources nothing:

1. `did-finish-download` is **no use here** — it only ever fires with `"finished"`, because Vortex
   emits it from `finalizeDownload`, which runs on success. A failed download emits nothing.
2. So the base watches `persistent.downloads.files` through `api.onStateChange` (optional on
   `IExtensionApi`, so guarded) for one of its downloads entering `failed`.
3. `parseClaim` decides whether the download is this source's. **Match the URL the download actually
   carries**, which is whatever the site's redirects finally resolved to — for ModDB that is a signed
   DBolical CDN URL naming an archive and no ids at all, not any moddb.com path.
4. The failed entry is removed with the `remove-download` event, and `installRef` runs with
   `force: true`, fetching through `fetchToFile`.

Because such a URL usually identifies nothing, the reference comes from page context — the same
visited-ring mechanism GameBanana needs, and for the same reason.

### Per-page state, not module state

The claim map, the self-started-URL set, the confirmation flag and whatever the adapter needs to
remember are keyed by page id (`<gameId>-<id>-browse`), not held in module-level singletons. Before
the base existed, each adopter's own file copy gave each source its own instance. One shared base
required by two source modules in the same extension would otherwise let one source claim — and
install a second time — a download the other made.

## Config contract

All game-specific knowledge arrives in one object, which is what makes a second adopter a copy plus
about fifteen lines. Fields marked source-specific are defined by the module for its own site.

| Field | Required | Purpose |
| --- | --- | --- |
| source key | yes | Identifies the site section to open; sets the home URL. `tsCommunity` (Thunderstore), `gbGameId` (GameBanana), `mwsGame` (ModWorkshop), `fcGame` (fcmodding), `moddbPath` (ModDB) |
| `requirements` | no | The adopter's requirement table, for install routing and installed-detection |
| `installRequirement` | no | `(api, gameSpec, requirement) => Promise` — adopter injects its requirement downloader |
| `packageAttribute` | no | Mod attribute holding the package key (default `thunderstorePackage` / `gamebananaItem`) |
| `versionAttribute` | no | Mod attribute holding the installed version (default `thunderstoreVersion` / `gamebananaVersion`) |
| `allowedHosts` | no | Hosts the embedded view may navigate to |
| `confirmExternal` | no | Show the external-content confirmation before the site loads (default true). Answering it is remembered per page for the rest of the Vortex session, so leaving the page and coming back does not re-ask; a restart asks again |
| `pageId` / `pageTitle` / `hotkey` / `icon` / `mdi` / `priority` / `pageGroup` | no | Page identity |

Fields only one source needs stay on that source's adapter:

| Field | Module | Purpose |
| --- | --- | --- |
| `hideAds` / `adSelectors` | any source with an `adSelectors` default (`gamebanana_browser.js`, `modworkshop_browser.js`, `moddb_browser.js`) | Hide the site's ad slots in the embedded view (default on). `adSelectors` replaces the adapter's list rather than extending it; a source with no list injects nothing |
| `blockAdPopups` / `blockedHosts` | any source with a `blockedHosts` default (`gamebanana_browser.js`, `moddb_browser.js`) | Drop links that lead to an ad network instead of opening them in the system browser (default on) |
| `gbSection` | `gamebanana_browser.js` | Section the page opens on, e.g. `mods` (default) or `tools` — GameBanana listings are `/{section}/games/{gameId}` |
| `fcGame` | `fcmodding_browser.js` | Section the page opens on — `fc3`, `fc4`, `fc5`, `fc6`, `fcnd` or `fcp`, the same slug the extension already uses |
| `homeUrl` | `gamebanana_browser.js` | Full override for the home URL, e.g. the game's hub page instead of one section |
| `fileIdAttribute` | `gamebanana_browser.js`, `modworkshop_browser.js`, `moddb_browser.js` | Mod attribute holding the installed file id (default `gamebananaFileId` / `modworkshopFileId` / `moddbFileId`, the same one that source's downloader tracks) |
| `moddbPath` | `moddb_browser.js` | The game on moddb.com (`games/deus-ex`, `mods/realrtcw-realism-mod`) — the same field and value `moddb_downloader.js` takes |
| `homePath` | `moddb_browser.js` | Where the page opens, if not `{moddbPath}/mods`. The mods list, not the file index: a game's `/downloads` page carries only the files uploaded to the game page itself, while the mods list is where the community actually is and every mod page links to its own files. |
| `browseKey` | `moddb_browser.js` (on a **requirement**, not the config) | The browse key of the one file a requirement installs. Without it the requirement is not routed, because a ModDB requirement names a mod page and a key names a single file on that page |
| `versionPattern` | `gamebanana_browser.js` | RegExp whose group 1 is a version inside an update title, for submissions that leave `_sVersion` empty |

## Exports and where they are called

| Export | Called from | Does |
| --- | --- | --- |
| `registerThunderstoreBrowser(context, gameSpec, config)` | `applyGame()` | `registerMainPage`, gated on the active game |
| `onceThunderstoreBrowser(api, gameSpec, config)` | `context.once()` | Installs the `did-finish-download`, `did-install-mod` and `check-mods-version` handlers |
| `installThunderstorePackage(api, gameSpec, config, ref, options)` | Anywhere | Downloads and installs one package by reference |
| `resolveThunderstorePackage(config, namespace, name)` | Anywhere | Current version, download URL and dependencies |
| `isThunderstorePackageInstalled(api, gameId, config, key)` | Anywhere | Installed-detection by attribute or requirement mod type |
| `checkThunderstoreModUpdates(api, gameSpec, config)` | `check-mods-version` | Update notifications for browsed mods |
| `makeThunderstoreBrowsePage(gameSpec, config)` | Rarely | The page component, for an extension that registers it itself |

Registration goes in the main path, event handlers go in `context.once()` — the same split every
other Vortex extension follows.

## How an install is claimed

Vortex already turns a download started inside embedded content into a normal Vortex download
(`will-download` → `received-url` → `start-download-url` → the `https` protocol handler; see
`EMBEDDED_BROWSER.md`). A browser module intercepts nothing. It waits for the finished download and
takes over. The whole path — click inside the page, download, claim, install, attribute stamping — was
confirmed live against Thunderstore in August 2026:

1. On `did-finish-download`, look at the download's URLs. No match against the source's
   package-download pattern, or a different game, and the download is left alone in Downloads.
2. On a match, record the package reference against the download id.
3. Start the install — **unless core is about to**. `settings.automation.install` ("Install mods when
   downloaded") makes core emit `start-install-download` for the same download immediately after
   `did-finish-download`, because a browser capture carries no `allowInstall` override. A second emit
   installs the archive twice. Both branches are confirmed live (August 2026): with the setting on,
   core starts the install ~100 ms after the claim and the module stands down; one mod entry results.
4. On `did-install-mod` for that download id, stamp the attributes: `version`, the version attribute,
   the package attribute, `source: 'website'`, `url` (the package page), and `customFileName` — Vortex
   renders `customFileName || logicalFileName || fileName || name`, so without it the mod list shows
   the raw archive name.
5. Enable the mod, disable any older copy of the same package, then — only for a source that declares
   `dependencies` — offer what it depends on.

### Three rules that are not obvious

- **Never `setModType`.** The adopter's own installers decide the type. A blanket assignment from the
  browser drops a mod loader into the plugins folder.
- **Never route an ad-hoc install through a requirement downloader.** `thunderstore_downloader.js`
  disables every mod carrying the requirement's mod type before installing, so a second browsed mod
  would switch off the first, and its in-flight guard is keyed by mod type, so a second install
  started while one runs returns silently. Managed requirements — and only those — are handed to
  `installRequirement`.
- **Match the download URL, not the page URL.** Sources that redirect to a CDN need both patterns,
  and a source with a two-step download (ModDB) has to match the final mirror.

### When the download URL does not identify the mod

Thunderstore is the easy case: both `thunderstore.io/package/download/{ns}/{name}/{version}/` and the
`gcdn` zip it redirects to spell out namespace, name and version, so a claim needs no state at all.

GameBanana is the other case, and it is the one to design for. `gamebanana.com/dl/{fileId}` names a
*file*, its CDN redirect (`files.gamebanana.com/{section}/{fileName}`, then a numbered
`filecacheNN.gamebanana.com` mirror) names only a section and a file name, and **no API endpoint maps a
file id back to the submission that owns it** — `apiv11/File/{fileId}` returns the file record with no
parent, and the legacy Core API's `Url().sProfileUrl()` for a file returns a broken URL.

So `gamebanana_browser.js` keeps the browsing context: the page records every submission the user opens
(`/{section}/{itemId}` and `/{section}/download/{itemId}`, newest first, capped at eight), and a claimed
download is matched against those candidates by file id, or by file name when the CDN URL is all that
was recorded. The first candidate whose file list contains the file wins; if none does — the user
navigated on before the download finished — the most recently opened submission is used, since that is
where the click came from.

Two consequences for any source that works this way:

- The claim must be **recorded synchronously** and identified afterwards. Core starts the install itself
  the moment `did-finish-download` returns when "Install mods when downloaded" is on, so the download id
  has to be in the claim map before any `await`. The module stores the identification promise in the
  claim and the `did-install-mod` handler awaits it before stamping.
- A page that opens a download URL must keep it **out of its own history**. The view requests the URL so
  the capture chain sees it, the site stays where it was, and Back must not walk into a URL that only
  ever produces a download.

## Update checks for browsed mods

`checkThunderstoreModUpdates` walks the mods carrying the package attribute, skips any whose key
belongs to a managed requirement (the downloader module checks those and its notification carries the
right action), resolves each remaining package once, and raises a warning notification with a
Download action for anything outdated. Version comparison is semver-coerced, so `1.2` and `1.2.0` are
the same version and a copy ahead of the listing is not offered as an "update".

It runs on `check-mods-version`, which is Vortex's own Check for Updates, so the API cost is one call
per distinct browsed package and only when the user asks.

Version comparison is per source, because "newer" is not the same question everywhere — which is what
the four update hooks on the adapter are for. `gamebanana_browser.js` compares **file ids**, which
grow monotonically, and falls back to a plain
string inequality on the version only for mods installed before the file id was tracked: GameBanana
versions are free text (`_sVersion` is whatever the submitter typed, and some submissions carry the
version only inside an update title), so `semver` has nothing to work with. That is also why a browsed
GameBanana mod stores its file id alongside its version.

## Writing a module for a new source

Copy `template_base_browser.js` to `<source>_browser.js`, fill in the adapter, and re-export
`createBrowserModule(adapter)`'s functions under the source's own names. The page chrome, history,
host allow-list, confirmation gate, claim handler, attribute stamping, install driver, dependency
prompt and update check all come from the base. What a new source must supply:

| Piece | Notes |
| --- | --- |
| Home URL | Built from the config's source key |
| Allowed hosts | Site plus its CDN; an off-list navigation is bounced and opened externally |
| Download-URL pattern | What `parseClaim` matches; include the CDN form |
| Reference parser | URL (and the site's "install with mod manager" protocol link, if it has one) → identity + version. When the download URL cannot carry the identity, `identify` has to supply it — see above |
| Key format | The string stored in the package attribute, and the rule for splitting it back apart. Thunderstore's `Namespace-Name` splits at the first hyphen only because its ids are `[a-zA-Z0-9_]`; a source with numeric ids or hyphenated slugs needs its own scheme rather than that rule |
| Dependency resolver | **Optional.** Some sources have no dependency graph, and `dependencies: false` means the base never asks for one |
| Version resolver | For update checks and for installs where the click gave no version. Allow a fallback endpoint: Thunderstore's resolver tries the community listing first, then the community-independent package endpoint, because a package can be installed from a community it is not listed in |
| Update comparison | Only when the source's versions are not semver — override `installedInfo`, `compareInstalled`, `isUpdate` and `updateRef` together, since they describe one ordering |

Three traps the two live adapters already hit:

- **Do not name a field on the resolved record after what the base might want it for.** Thunderstore's
  `name` is a *package* name, GameBanana's is a *human title*; the base treats neither as a display
  name, so a source with a title opts in through `displayName`.
- **The file name must end in `browser.js`** — see the adopter model above.
- **Trace the source's real mark for `defaults.mdi` rather than picking a generic glyph.** Every site so
  far has had a fetchable logo — check `/favicon.ico`, an `og:image` or `apple-touch-icon` in the served
  HTML, and `/assets/*logo*.svg` before concluding otherwise, retrying with a browser `User-Agent` since
  an intermittent bot-block looks exactly like a missing file. A vendor SVG's outline path rescaled into
  the 24x24 viewBox beats anything hand-drawn.
- **Anything used by exactly one source stays in that adapter.** The base is only allowed to grow when
  two sources do the same thing the same way.

Sites behind a bot challenge (Cloudflare) are the strongest case for a browser module: an embedded
session is exactly the client the challenge admits, where a fetch-and-parse downloader gets a 403.

## Page mechanics worth knowing

- **A `pageTitle` longer than about 20 characters is clipped in the sidebar**, so name the page after the
  site alone: `Browse ModWorkshop`, not `Browse ModWorkshop.net`, which was cut off in the live UI. Each
  adapter's `defaults.pageTitle` stays the generic `Browse Mods`; the site-named title belongs in the
  adopter's config and in that source's template.
- The exported `Webview` control is the embed variant. It exposes `loadURL` but no history API, so
  the page keeps its own history array and index.
- The control wires only a fixed event set and drops its `events` prop, so `did-navigate` and
  `did-navigate-in-page` are attached to the DOM node — give the control an `id` and look it up on
  mount, and remove the listeners on unmount.
- `onNewWindow` is where popups and `target=_blank` links arrive: same-host navigates in place,
  install-protocol links are parsed, everything else goes to the system browser via `util.opn`.
- Setting a `partition` isolates cookies but moves the guest off the session whose `will-download`
  hook provides capture, which silently breaks installs. Do not set one without re-testing.

### Ads

Mod sites carry ads, and an embedded view shows them like any browser would. Two things a browser
module can do about it, both local to the page:

- **Hide the slots.** The guest is a real `<webview>` tag, so `insertCSS` works on the node the page
  already looks up by id — core's own control does the same thing in its `dom-ready` handler.
  Injected CSS lasts for one document, so it has to go on **every** `dom-ready`, not once on mount.
  This is cosmetic: the ad requests still happen, the page just stops showing the result.
- **Drop ad destinations.** Without this, an ad click or pop-under reaches `onNewWindow`, fails the
  host allow-list, and gets handed to `util.opn` — so the ad opens in the user's real browser, which
  is worse than the ad was. Match the URL against an ad-host list before the `util.opn` fallback.

What a module **cannot** reasonably do is block the requests themselves. That needs
`session.webRequest` in the main process, which is the same session Vortex downloads through, and
Electron allows only one listener per event per session — so a game extension registering one would
be reaching into app-wide networking and could clobber, or be clobbered by, core's own handlers.

Both layers live in the base, but the **lists live in the adapter**: they describe one site's markup
and one site's ad partners, so a source with no ads (Thunderstore) simply supplies neither and the
base skips both.

## Adopters

| Module | Source | Adopters |
| --- | --- | --- |
| `base_browser.js` | — | every adopter of every source below |
| `thunderstore_browser.js` | thunderstore.io | `game-hades2` |
| `gamebanana_browser.js` | gamebanana.com | `game-doometernal` |
| `modworkshop_browser.js` | modworkshop.net | `game-roadtovostok` |
| `fcmodding_browser.js` | downloads.fcmodding.com | `game-farcry3`, `game-farcry4`, `game-farcry5`, `game-farcry6`, `game-farcrynewdawn`, `game-farcryprimal`, `template-farcry` |
| `moddb_browser.js` | moddb.com | `game-darkmessiahofmightandmagic`, `game-returntocastlewolfenstein` |

### Quirks per source

- **GameBanana** has no dependency *graph*, so nothing is offered alongside an install — the dependency
  prompt is skipped rather than stubbed. It does publish `_aRequirements`, a structured
  `[[label, url], …]` array whose URL usually parses to a submission, but it is sparse, unversioned
  and sometimes off-site: enough for a best-effort requirement list, not enough to resolve a closure
  (see `GAMEBANANA_API.md`). Its submission key is `Model-itemId` (`Mod-428520`,
  `Tool-7475`), parsed with a strict `letters-digits` pattern instead of Thunderstore's split-at-the-
  first-hyphen rule. A **stale file id is not an error**: `gamebanana.com/dl/{fileId}` for a file that
  has been superseded redirects to the submission's download *page*, so a download built from a
  hardcoded file id silently fetches HTML once the submission is updated. Resolve the current file
  through the API and keep any hardcoded id as a fallback only.
- **Thunderstore** is the only source with a dependency closure, and the only one whose versions are
  semver by convention. Its dependency entries are version-pinned, but the pin is a **minimum, not an
  exact match** — two mods routinely pin different versions of the same dependency, and one install
  satisfies both.
- **ModWorkshop** publishes `dependencies[]` on the mod record with the dependency's whole mod record
  embedded, so a requirement resolves without a second call. Entries carry an `optional` flag and no
  version at all. A mod is one numeric id, so the package key needs no splitting rule. Versions are
  free text - `v`-prefixed, date-based and single-segment values all occur - so update comparison runs
  on the file id, a Laravel autoincrement that reliably orders newest-last. The click-through download
  URL is **not** on the site host: `modworkshop.net/mods/{id}/download` 404s, and the working endpoint
  is `api.modworkshop.net/mods/{id}/download`, which redirects to `storage.modworkshop.net`. A mod
  flagged `disable_mod_managers` has opted out of one-click installs, so its `mws-mo2://` /
  `mws-manager://` protocol links are skipped; its plain Download button still captures normally.

- **fcmodding** has no API of any kind. The catalog is a handful of static pages, so the module reads
  a section index, then each mod page, for the title, the printed `<i>v1.68</i>` version and the
  `/files/` links that page offers — one fetch per page, cached for the session, over a catalog of
  well under twenty entries. A mod's identity is therefore its **download file name**: the host
  publishes no mod id anywhere. Versions are not semver — mod packs use `4.52`-style numbers and the
  Mod Installer uses a `20250412-1300` build stamp — so comparison is a numeric segment compare, which
  orders both where semver coercion orders neither. Two shapes of link on this host are deliberately
  not claimed: `/files/` aliases that are opaque 30-character ids (they redirect to a Google Drive
  folder, and `drive.google.com` is kept off `allowedHosts` so they open in the system browser), and
  anything without an archive extension. The sibling database at `mods.farcry.info` is **not** a
  source: every entry there links to a Discord message rather than a file (`FCMODDING_API.md`).

- **ModDB** is the only source Vortex cannot download from itself, so it is the only one running
  `fetchStrategy: 'click'`. It is also the only source that mints a **new file id for every release**,
  which rules out keying on the file id: the id a key resolves to is by definition the one already
  installed, so an update could never be found. The key is therefore the mod's *page* plus a second
  half naming which file on it — `mods/realrtcw-realism-mod#realrtcw` — since a ModDB page hosts
  language packs, demos and localisations beside its releases, and keying on the page alone would
  offer "Real RTCW Czech Localization" as an update to "RealRTCW 5.44" for being newer.
  That second half is **the letters of the download's URL slug, never its title**: ModDB slugs keep a
  stable stem and push the version into digits (`realrtcw-50`, `realrtcw-40`, `endrv-0140`,
  `endrv-0131`), so letters-only collapses a file's releases and separates its neighbours. Titles do
  not survive the same treatment — "[wOS] Rogue - Combat Arena" is slugged `rogue-combat-arena-wos`,
  "2027" has no letters at all, and "GMDXv9.0.3 FULL" is slugged `gmdxv90-release`. Nothing in a
  ModDB download URL says which mod it came from (`/downloads/start/295315` is the whole identity a
  click carries), so the module keeps a ring of visited file pages and joins the click to the page it
  came from. Update comparison is on the file id, a site-wide autoincrement, because ModDB versions
  are free text and often absent.

## See also

`EMBEDDED_BROWSER.md` (the `Webview` control, the download capture chain, popups and partitions).
`DOWNLOADER.md` (the requirements auto-downloader family these modules sit beside).
`THUNDERSTORE_API.md` (the first source: endpoints, community slugs, package URL shapes).
`GAMEBANANA_API.md` (the second source: apiv11 endpoints, item models, file records, download URLs).
`MODWORKSHOP_API.md` (the third source: mod and file endpoints, storage download URLs, dependencies).
`FCMODDING_API.md` (the fourth source: the download catalog, the `/files/` alias redirect, and why
the `mods.farcry.info` database is not a download route).
`MODDB_API.md` (the fifth source: the RSS feed, the download-start interstitial, the mirror URL, and
the bot-block that forces `fetchStrategy: 'click'`).
`VORTEX_REACT_PAGES.md` (`registerMainPage` and the page component API).
`VORTEX_MOD_INSTALL.md` (what `start-install-download` hands the archive to).
`VORTEX_DOWNLOAD_MGMT.md` (download states, protocol handlers, `did-finish-download`).

## Naming the archive

Vortex names a download from the server's `Content-Disposition` header, then from the last path
segment of the requested URL, then from the `fileName` argument the caller passed to
`start-download` — and failing all three it keeps the `__vortex_tmp_<8 digits>` placeholder it
downloaded under. `InstallManager` takes the mod's staging folder name straight off that file name,
so a source that answers none of the first three leaves every mod installed from its page in a
folder called `__vortex_tmp_00000000`, and any installer that derives an in-game folder name from
`destinationPath` inherits it.

The URL segment is read from the URL the caller supplied, not the one a redirect lands on, and it
**outranks** the `fileName` argument. So a source is in one of two situations:

- **The URL's last segment is empty** — `thunderstore.io/package/download/{namespace}/{name}/{version}/`
  ends in a slash, and its CDN sends no `Content-Disposition`. Nothing is derived, so `archiveName`
  applies. Thunderstore builds it from the resolved record: `Namespace-Name-Version.zip`, the archive
  it actually serves.
- **The URL's last segment is an opaque id** — `gamebanana.com/dl/{fileId}`, again with no
  `Content-Disposition` behind it. `1788872` is a perfectly good segment as far as Vortex is
  concerned, so it wins and `archiveName` is never consulted. A hint cannot fix this one; the URL
  has to change. GameBanana therefore implements `resolveForInstall`, which resolves the redirect
  (`HEAD` with redirects followed, `response.url`) and hands over
  `files.gamebanana.com/{section}/{fileName}` instead. Its `archiveName` stays as a backstop for the
  path where that resolution fails and the `/dl/` URL is used unchanged.

Getting this wrong on GameBanana costs more than a bad folder name: an id carries no archive
extension, and Vortex deletes download-folder files that have none, so the archive disappears on a
later pass while the installed mod keeps its meaningless name.

ModDB needs neither hook — it fetches through `fetchToFile` rather than the download manager.
fcmodding already resolves to a versioned URL that ends in the file name, and ModWorkshop's storage
URLs carry both an extension and a `Content-Disposition`.

The base passes `redownload: 'replace'` alongside a supplied name and nothing otherwise. Naming a
download makes Vortex check the download folder first, and an archive already sitting there is
handed back through the callback as an `AlreadyDownloaded` **error**, which the install path would
report as a failed download. Without a name that check never runs, so an adapter that supplies no
`archiveName` behaves exactly as it did before.

Full mechanism in `VORTEX_DOWNLOAD_MGMT.md`.
