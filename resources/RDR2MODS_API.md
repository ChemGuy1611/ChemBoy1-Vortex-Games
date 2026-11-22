# RDR2Mods.com

`www.rdr2mods.com` is the main Red Dead Redemption 2 mod site outside Nexus Mods, and the only source of **Lenny's Mod Loader** (LML). It runs Invision Community with a Downloads application.

## The Browser Check

The whole site sits behind a proof-of-work browser check (a "Shortflare" front end, argon2 challenge). Probed live with a plain HTTP client:

| Request                                   | Answer                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| Any HTML path, first hit                  | `307` to the **same** URL, with a `Shortflare_Sec` cookie                 |
| Same path, with that cookie               | `403` and a challenge page that needs a JavaScript engine to solve        |
| `/robots.txt`                             | `200`                                                                     |
| `/api/*` (the Invision REST API)          | `401` `NO_API_KEY` — reachable, but keys are issued by the site staff only |

The challenge covers every HTML path that was tried: file pages, `?do=download`, `/sitemap.xml`, `/rss/` and `?do=rss`. There is no feed, no index and no keyless API to fall back on.

Consequences:

- **Nothing on this site can be fetched unattended.** `curl`, Node's `http`, and Vortex's main-process download manager all get the 403. There is deliberately no `rdr2mods_downloader.js`, and LML cannot be a downloader requirement.
- **A real browser session passes**, which is what an embedded `<webview>` is. A browse page works; see `BROWSER_MODULES.md`.
- **The site's markup cannot be read from outside a browser either**, so the scrape patterns in the module below are the standard Invision shapes. A live install of Lenny's Mod Loader confirmed the title and version patterns.
- **The files themselves are not behind the check.** A download ends on a signed, expiring URL on the site's CDN, which any client holding that URL can fetch — see the URL shapes below.

## URL Shapes

| What            | Shape                                                                 |
| --------------- | --------------------------------------------------------------------- |
| Section         | `/downloads/rdr2/`                                                    |
| Category        | `/downloads/rdr2/<category>/` — `player`, `weapon`, `scripts`, `maps`, `misc`, `tools`, `rdrfr` |
| File page       | `/downloads/rdr2/<category>/<id>-<slug>/`                             |
| Download        | the file page URL with `?do=download` (plus a CSRF key; `&r=<record id>&confirm=1` once a file is chosen) |
| Served file     | `https://us-west.int-cdn.rdr2mods.com/monthly_<yyyy>_<mm>/<name>_<ext>.<hash>?st=…&e=…` — signed and expiring, with the real file name in a `response-content-disposition` parameter |

The numeric id is stable across releases of a file — a new version is uploaded to the same page — so, unlike ModDB, a file page is a durable identity. Lenny's Mod Loader is `/downloads/rdr2/tools/76-lennys-mod-loader-rdr/`.

Versions are dotted numbers with any segment count; LML's are four segments (`0.6.8470.31280`), which `semver.coerce` would truncate.

## Lenny's Mod Loader

| Item                 | Where it goes                                                        |
| -------------------- | -------------------------------------------------------------------- |
| `ModLoader/` contents | The game folder, so `vfs.asi` sits beside `RDR2.exe`                |
| `ModManager/`        | Standalone tool; lives anywhere and is not deployed                  |
| `Example …/` folders | Sample mods beside the loader, each with its own `install.xml`; not part of the loader |
| A mod with `install.xml` | Its own folder: `<game>/lml/<mod folder>/`                       |
| `replace/` and `stream/` | Shared folders directly under `<game>/lml/`, used by mods that ship no `install.xml` |
| ASI plugins          | Loose in the game folder                                             |

LML is itself an ASI plugin, so it needs an ASI loader — in practice ScriptHookRDR2, whose `dinput8.dll` is the loader.

Because the loader archive carries sample mods with `install.xml` files, an installer for the loader has to be tested **before** the one for LML mods, and has to copy only the folder holding `vfs.asi`.

### Load order: `lml/mods.xml`

LML keeps the load order and enabled state of every `install.xml` mod in `<game>/lml/mods.xml`. LML Mod Manager reads and writes it. As LML Mod Manager writes it, the file is UTF-8 with a byte order mark, CRLF line endings and no trailing newline:

```xml
<?xml version="1.0" encoding="utf-8"?>
<ModsManager>
  <Mods>
    <Mod folder="1907">
      <Name>Project New Austin: 1907</Name>
      <Enabled>true</Enabled>
      <Overwrite>false</Overwrite>
      <DisabledGroups />
    </Mod>
  </Mods>
  <LoadOrder>
    <Mod>1907</Mod>
  </LoadOrder>
</ModsManager>
```

- **`folder`** is the name of the mod's folder under `lml/`. The mod author chooses it: an archive shipping `lml/1907/install.xml` gives `1907`. **`<Name>`** is copied from that folder's `install.xml`.
- **The bottom entry wins.** A mod loaded later overrides earlier ones for the files they both replace, and mod readmes ask for "priority" mods to be moved to the bottom.
- **New mods go to the top.** When LML Mod Manager finds a folder missing from the file, it adds the folder at the top of both `<Mods>` and `<LoadOrder>`. A mod whose `install.xml` sets `<IsExtension>true</IsExtension>` goes to the bottom instead.
- **`<Overwrite>`** is a per-mod checkbox in LML Mod Manager. Neither LML's documentation nor its release notes say what it does. `<DisabledGroups>` lists the option groups from `install.xml` that the user switched off.
- Loose files in `lml/stream/` and `lml/replace/` have no entry; they load for every mod.

`game-reddeadredemption2` writes this file from Vortex's Load Order page. It keeps `<Overwrite>`, `<DisabledGroups>` and any other per-mod element as they are, and changes only the order, `<Name>` and `<Enabled>` (see `NON_UE_LOAD_ORDER_PAGES.md`). It also creates the file when it is missing, so the order applies even if LML Mod Manager has never been run.

### The official Vortex extension claims the same game

Nexus Mods publishes its own "Red Dead Redemption 2 Support" extension (site mod 68) under the same game id. It targets OpenIV-style `.rpf` replacement — a `mods/source` staging path, a destination-picker dialog per file, mod types `reddeadredemption2asi` / `reddeadredemption2dotnet` / `reddeadredemption2dlc` — and registers its installers at priorities 5 and 25. With both extensions installed, its game registration and installers win: LML mods get the destination dialog and the `lml` folder is never created. Only one of the two can be active; the other has to be removed or disabled on Vortex's Extensions page. Mods installed under the official extension keep its mod type ids and need reinstalling afterwards.

Mod archives come in every combination of the above. Shapes seen on popular mods: a wrapper folder around the mod folder; several mod folders in one archive; an `lml/` folder beside loose `.asi` files meant for the game folder; and a top-level `replace/` tree with a loose readme beside it.

## Shared rdr2mods_browser.js Module

`resources/browsers/rdr2mods_browser.js` is the RDR2Mods adapter over `base_browser.js` (`BROWSER_MODULES.md` has the adapter contract). An adopter carries both files; `template_rdr2mods_browser.js` shows the wiring.

- **Ordinary capture does the work.** A download click resolves to the signed CDN URL, which Vortex's download manager fetches itself (verified live); the base claims the finished download and stamps the mod.
- **`fetchStrategy: 'click'` is the fallback**, for what is not a CDN URL: a download the manager does fail on is taken over by the base, and an update install starts from the page's `?do=download` link. Both are fetched in the renderer with `credentials: 'include'`, so the request rides on the cookies the embedded view earned. The view has no `partition`, so it shares the default session (`EMBEDDED_BROWSER.md`). This path has not been exercised live.
- **`openRdr2ModsFilePage(api, gameSpec, config, key)`** shows the browse page on one file's own page rather than the section home — what a "Download Lenny's Mod Loader" button calls. The base has no start-URL hook, so it shows the page and then points the view at the URL once the view exists.
- **Key = the file page path** after `/downloads/`, e.g. `rdr2/tools/76-lennys-mod-loader-rdr`. The id alone identifies the file, but the update check has to rebuild the page URL from the key, and that needs the category and slug.
- **The CDN URL names no file page**, so a captured download is joined to the file page the user was last on (a ring of visited pages, as the ModDB and GameBanana adapters keep). A URL that does name its file page has the identity read straight off it.
- **A `?do=download` URL the view actually navigated to is a page, not a file** — the file chooser shown when a page offers several files, or a download agreement — so it is left to load.
- **Title, version and download link are read off the file page**: `og:title`, the `softwareVersion` field of the page's structured data (falling back to the light span in the page heading), and the first `do=download` link.
- **A page that comes back as HTML where a file was expected is refused**, rather than saved and installed as an archive.
- **Updates compare versions by numeric segment.** A page that cannot be read, or that names no version, never reports an update.
- **No dependencies, and never a mod type** — the adopting extension's own installers decide where a browsed archive lands, which is what puts LML in the game folder and a mod in `lml/`.

### Not yet confirmed by a live test

- Whether the renderer fetch is sent the session's cookies; if it is not, the fallback fetch gets the challenge page and the install reports it. Only the update-install and failed-download paths depend on this.
- Whether every file is served from the CDN, or only large or older ones.
- `openRdr2ModsFilePage` against the running app.

## See also

`BROWSER_MODULES.md` (the browser-page family, the adapter contract, and the adopter table).
`EMBEDDED_BROWSER.md` (the `Webview` control, download capture, sessions and partitions).
`MODDB_API.md` (the other source whose downloads Vortex cannot fetch itself, and the first
`fetchStrategy: 'click'` adapter). `RAZEDMODS_API.md` (the other third-party Red Dead Redemption 2
source — plain HTTP, so it gets a downloader module instead).
`VORTEX_DOWNLOAD_MGMT.md` (download states, and the failed-download transition the takeover watches).
