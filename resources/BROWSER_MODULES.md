# Browser Modules

A browser module registers a Vortex page that embeds a mod site's **own website** and turns a click
on its download link into a managed install. The site is the UI — search, categories, mod pages,
screenshots and all — so there is no card grid to build and no API surface to keep in step with the
site's design.

Modules live in `resources/browsers/`, one canonical file per source plus a `template_*.js` wiring
reference. `resources/downloader/` stays downloaders-only.

| | Downloader module | Browser module |
| --- | --- | --- |
| Purpose | Install known requirements unattended | Let the user browse and pick |
| Trigger | `setup()`, update check, toolbar button | The user, on a page |
| Knows in advance | Namespace, name, mod type per requirement | Nothing; the reference comes from the click |
| Mod type | Sets one per requirement | Never sets one |
| Lists | `resources/lists/games-downloader-*.txt` | `resources/lists/games-browser-*.txt` |

An extension can carry either, both, or neither. Hades II carries both: `thunderstore_downloader.js`
installs the Hell2Modding loader and the ModUtil dependency closure, `thunderstore_browser.js` gives
the user the rest of the community.

## Adopter model

Same as the downloader modules: every adopter carries a **byte-identical copy** of the canonical
file, required with a relative path.

```js
const { registerThunderstoreBrowser, onceThunderstoreBrowser } = require('./thunderstore_browser');
```

A change to the canonical file must be propagated to every adopter copy in the same session, and the
copies verified by hash. `categorize_games.py` writes the adopter list, so
`resources/lists/games-browser-thunderstore.txt` is the roster to propagate across.

`deploy_to_vortex.py` copies `index.js` plus every bundled `*downloader.js` and `*browser.js` beside
it, so a browser module reaches the deployed extension without `--force`.

## Config contract

All game-specific knowledge arrives in one object, which is what makes a second adopter a copy plus
about fifteen lines. Fields marked source-specific are defined by the module for its own site.

| Field | Required | Purpose |
| --- | --- | --- |
| `tsCommunity` (source key) | yes | Identifies the site section to open; sets the home URL |
| `requirements` | no | The adopter's requirement table, for install routing and installed-detection |
| `installRequirement` | no | `(api, gameSpec, requirement) => Promise` — adopter injects its requirement downloader |
| `packageAttribute` | no | Mod attribute holding the package key (default `thunderstorePackage`) |
| `versionAttribute` | no | Mod attribute holding the installed version (default `thunderstoreVersion`) |
| `allowedHosts` | no | Hosts the embedded view may navigate to |
| `confirmExternal` | no | Show the external-content confirmation before the first load (default true) |
| `pageId` / `pageTitle` / `hotkey` / `icon` / `mdi` / `priority` / `pageGroup` | no | Page identity |

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
takes over:

1. On `did-finish-download`, look at the download's URLs. No match against the source's
   package-download pattern, or a different game, and the download is left alone in Downloads.
2. On a match, record the package reference against the download id.
3. Start the install — **unless core is about to**. `settings.automation.install` ("Install mods when
   downloaded") makes core emit `start-install-download` for the same download immediately after
   `did-finish-download`, because a browser capture carries no `allowInstall` override. A second emit
   installs the archive twice.
4. On `did-install-mod` for that download id, stamp the attributes: `version`, the version attribute,
   the package attribute, `source: 'website'`, `url` (the package page), and `customFileName` — Vortex
   renders `customFileName || logicalFileName || fileName || name`, so without it the mod list shows
   the raw archive name.
5. Enable the mod, disable any older copy of the same package, then offer its dependencies.

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

## Update checks for browsed mods

`checkThunderstoreModUpdates` walks the mods carrying the package attribute, skips any whose key
belongs to a managed requirement (the downloader module checks those and its notification carries the
right action), resolves each remaining package once, and raises a warning notification with a
Download action for anything outdated. Version comparison is semver-coerced, so `1.2` and `1.2.0` are
the same version and a copy ahead of the listing is not offered as an "update".

It runs on `check-mods-version`, which is Vortex's own Check for Updates, so the API cost is one call
per distinct browsed package and only when the user asks.

## Writing a module for a new source

The page chrome, history, host allow-list, confirmation gate, claim handler, attribute stamping and
dependency prompt are the same for every source. What a new source must supply:

| Piece | Notes |
| --- | --- |
| Home URL | Built from the config's source key |
| Allowed hosts | Site plus its CDN; an off-list navigation is bounced and opened externally |
| Download-URL pattern | What the claim handler matches; include the CDN form |
| Package-reference parser | URL (and the site's "install with mod manager" protocol link, if it has one) → identity + version |
| Dependency resolver | **Optional.** Some sources have no dependency graph; the module must work without one |
| Version resolver | For update checks and for installs where the click gave no version |

Sites behind a bot challenge (Cloudflare) are the strongest case for a browser module: an embedded
session is exactly the client the challenge admits, where a fetch-and-parse downloader gets a 403.

## Page mechanics worth knowing

- The exported `Webview` control is the embed variant. It exposes `loadURL` but no history API, so
  the page keeps its own history array and index.
- The control wires only a fixed event set and drops its `events` prop, so `did-navigate` and
  `did-navigate-in-page` are attached to the DOM node — give the control an `id` and look it up on
  mount, and remove the listeners on unmount.
- `onNewWindow` is where popups and `target=_blank` links arrive: same-host navigates in place,
  install-protocol links are parsed, everything else goes to the system browser via `util.opn`.
- Setting a `partition` isolates cookies but moves the guest off the session whose `will-download`
  hook provides capture, which silently breaks installs. Do not set one without re-testing.

## Adopters

| Module | Source | Adopters |
| --- | --- | --- |
| `thunderstore_browser.js` | thunderstore.io | `game-hades2` |

## See also

`EMBEDDED_BROWSER.md` (the `Webview` control, the download capture chain, popups and partitions).
`DOWNLOADER.md` (the requirements auto-downloader family these modules sit beside).
`THUNDERSTORE_API.md` (the first source: endpoints, community slugs, package URL shapes).
`VORTEX_REACT_PAGES.md` (`registerMainPage` and the page component API).
`VORTEX_MOD_INSTALL.md` (what `start-install-download` hands the archive to).
`VORTEX_DOWNLOAD_MGMT.md` (download states, protocol handlers, `did-finish-download`).
