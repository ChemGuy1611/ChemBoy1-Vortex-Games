# PCGamingWiki API

PCGamingWiki is a MediaWiki install with the [Cargo](https://www.mediawiki.org/wiki/Extension:Cargo)
extension. There is no bespoke REST API — everything useful is reached through the standard
MediaWiki endpoint, either as structured Cargo rows or as raw page wikitext. Official policy page:
`https://www.pcgamingwiki.com/wiki/PCGamingWiki:API`.

| Surface | Base URL | Reachable programmatically |
| --- | --- | --- |
| MediaWiki API | `https://www.pcgamingwiki.com/w/api.php` | Yes |
| Redirect API | `https://www.pcgamingwiki.com/api/appid.php`, `/api/gog.php` | No — see below |
| Article HTML | `https://www.pcgamingwiki.com/wiki/{Page_Title}` | No — Cloudflare challenge |

All endpoints and behaviours below were verified live (August 2026) against `Doom: The Dark Ages`
(page ID `195569`) and `Elden Ring` (page ID `146683`).

## Access Requirements

PCGamingWiki is a small community-run site and enforces both of these:

- **Rate limit: 30 requests/minute.** Exceeding it returns `429 Too Many Requests` and blocks the
  IP for 60 seconds. Cache aggressively rather than re-querying.
- **A descriptive User-Agent is mandatory.** MediaWiki's recommended format is
  `clientname/version (contact info) library/version`, e.g.
  `MyCoolTool/1.1 (https://example.org/MyCoolTool/; me@example.org) urllib/3.11`.

Verified User-Agent behaviour against `api.php`:

| User-Agent sent | Result |
| --- | --- |
| Descriptive UA with contact info | `200` |
| `Mozilla/5.0` | `200` (currently tolerated, but it is exactly the kind of generic string the site warns it may block) |
| `Python-urllib/3.11` | `403 Forbidden` |
| Any UA, against `/wiki/...` or `/api/*.php` | `403` / Cloudflare interstitial |

A default-library User-Agent is therefore a hard failure, not a soft one — the header must be set
explicitly on every request.

### Cloudflare-blocked surfaces

Two surfaces documented on the official API page cannot be used from a script:

- **Redirect API** (`/api/appid.php?appid=...`, `/api/gog.php?page=...`), which maps a Steam AppID or
  GOG product ID to the matching wiki page. Returns `403` (server header: `cloudflare`) for both a
  descriptive UA and a full browser UA.
- **Article and special-page HTML** under `/wiki/`, including `Special:CargoTables`. Returns a
  Cloudflare "Just a moment..." managed-challenge page rather than content.

Both have API equivalents: use a Cargo query on `Infobox_game.Steam_AppID` / `Infobox_game.GOGcom_ID`
instead of the redirect API, and the `cargotables` / `cargofields` actions instead of the special
page. Article URLs are still the right thing to *link a user to* — they render fine in a browser —
they just cannot be fetched.

## Finding a Page

Four actions, with materially different matching semantics. This matters because game names as they
appear in a store rarely match the wiki title exactly (`DOOM: The Dark Ages` vs `Doom: The Dark Ages`).

**`action=query&titles=` — exact title, normalised, follows redirects.** The cheapest lookup and the
right first attempt.

```text
https://www.pcgamingwiki.com/w/api.php?action=query&titles=Doom%3A%20The%20Dark%20Ages&redirects=1&format=json
-> {"query":{"pages":{"195569":{"pageid":195569,"ns":0,"title":"Doom: The Dark Ages"}}}}
```

A miss returns a page keyed `-1` carrying a `"missing"` property. First-letter case is normalised by
MediaWiki; nothing else is.

**`action=opensearch` — prefix match only.** The official API page describes this as a case
insensitive search returning all matching results; in practice it matches on a *prefix* of the
title. `DOOM: The Dark` resolves, `Doom The Dark Ages` (missing the colon) returns no results. Use it
for autocomplete-style input, not for reconciling a store title.

```text
...?action=opensearch&search=DOOM%3A%20The%20Dark&redirects=resolve&format=json
-> ["DOOM: The Dark",["Doom: The Dark Ages"],[""],["https://www.pcgamingwiki.com/wiki/Doom:_The_Dark_Ages"]]
```

**`action=query&list=search` — full-text search.** The most forgiving option and the correct
fallback: `Doom The Dark Ages` finds `Doom: The Dark Ages` because the words appear in the article.
Add `srwhat=title` to restrict to titles, `srlimit=N` to widen the candidate set. Results need
client-side matching against the intended name (see "Title matching" below) — the top hit is not
reliably the right game.

**Cargo lookup by store ID — exact and unambiguous.** When a Steam AppID or GOG product ID is
already known, this beats every name-based search:

```text
...?action=cargoquery&tables=Infobox_game
   &fields=Infobox_game._pageName=Page,Infobox_game._pageID=PageID
   &where=Infobox_game.Steam_AppID%20HOLDS%20%221245620%22&format=json
```

### Title matching

When falling back to search, compare normalised strings rather than accepting the first hit:
lowercase, `’` -> `'`, strip `:`, collapse whitespace, trim. Accept an exact normalised match,
or a match on `normalised_name + " ("` to pick up disambiguation suffixes such as
`Keeper (video game)`. Check Roman/Arabic numeral variants (`VII` vs `7`) as separate candidates.

### Fetching wikitext

```text
...?action=parse&page=Doom%3A%20The%20Dark%20Ages&prop=wikitext&format=json&redirects=1
...?action=parse&pageid=195569&prop=wikitext&format=json
```

The `page` parameter is **case sensitive** — resolve the exact title first. With
`formatversion=2` the body is `parse.wikitext` (a plain string); with the default format it is
`parse.wikitext["*"]`. `redirects=1` is honoured, but a page may still come back as a redirect stub
(`#REDIRECT [[Target]]`), so keep a regex fallback that extracts the target and re-fetches.

## Cargo

Cargo turns wiki template calls into queryable SQL-ish tables. Three actions:

| Action | Purpose |
| --- | --- |
| `action=cargotables` | List every table |
| `action=cargofields&table=X` | List a table's fields, types, and list delimiters |
| `action=cargoquery` | Run the query |

`cargoquery` parameters: `tables`, `fields`, `where`, `join_on`, `group_by`, `having`, `order_by`,
`limit` (default 50, max 500), `offset`.

Tables as of August 2026:

```text
API, Assignments, Audio, Availability, Cloud, Company, Controller,
GOGcom_Enhancement_Project, Engine, Infobox_game, Infobox_game_engine, Input, L10n,
Middleware, Mods, Multiplayer, News, SafeDisc, StarForce, Tags, Taxonomy, TempDisplay,
VR_support, Video, XDG, _pageData, assigneeNotes
```

### Query rules

- **Underscore-prefixed columns must be aliased.** `_pageName`, `_pageID`, `_pageTitle` etc. are
  rejected unless renamed: `&fields=Infobox_game._pageName=Page`.
- **List fields need `HOLDS`, not `=`.** Many columns are `List (,) of String`. `Infobox_game.Steam_AppID`
  for Elden Ring is `"1245620,2778580, 2778590"` — base game plus DLC/soundtrack, with inconsistent
  spacing after the commas. `WHERE Steam_AppID = "1245620"` matches nothing;
  `WHERE Steam_AppID HOLDS "1245620"` matches. Split on `,` and trim when reading the value back.
- **Returned JSON keys use spaces, not underscores.** `Infobox_game.Cover_URL` comes back as
  `"Cover URL"`, `Steam_AppID` as `"Steam AppID"`. Alias fields explicitly if that is inconvenient.
- **Date fields emit a companion key.** `Released` is accompanied by `Released__precision`.
- **Joins are explicit**: `&join_on=Infobox_game._pageID=Availability._pageID`.

### Infobox_game

The main game record. Selected fields (`List (,)` unless noted):

| Field | Type | Notes |
| --- | --- | --- |
| `Steam_AppID` | List of String | All related AppIDs, base game first |
| `GOGcom_ID` | List of String | `null` when the game is not on GOG |
| `Engines` | List of Page | e.g. `Engine:id Tech 8`, `Engine:Unreal Engine 5` |
| `Developers`, `Publishers` | List of Page | `Company:FromSoftware` form |
| `Released` | List (;) of Date | |
| `Available_on` | List of String | OS list (`Windows`, `OS X`, `Linux`) |
| `Cover_URL` | URL | Direct image URL on `images.pcgamingwiki.com` |
| `Release_State`, `Series`, `Genres`, `Modes`, `Wikipedia`, `License` | | |

There are no Epic or Microsoft Store ID columns here — see the next section.

### Availability

Per-store DRM and subscription data, **not** store product IDs. Field families:

- `Available_from` — list of canonical store names actually selling the game, e.g.
  `Retail,Battle.net,Gamesplanet,Green Man Gaming,Humble Store,Microsoft Store,Steam`. This is the
  reliable "is it on store X" signal.
- `Available_from_historically`, `Available_from_future` — delisted and upcoming.
- `{Store}_DRM` and `{Store}_keys` pairs for ~25 stores (`Steam_DRM`, `Epic_Games_Store_DRM`,
  `GOGcom_DRM`, `Microsoft_Store_DRM`, `Ubisoft_Store_DRM`, `itchio_DRM`, ...).
- Subscription/entitlement flags as plain strings: `Xbox_Game_Pass`, `Xbox_Play_Anywhere`,
  `EA_Play`, `EA_Play_Pro`, `Ubisoft_Plus_Premium`, `Apple_Arcade`.

Store *identifiers* (the Epic slug, the Microsoft Store product ID, the Humble slug) are not stored
in Cargo at all. Getting them requires parsing the page wikitext.

### Other tables worth knowing

- `API` — renderer and binary facts: `Direct3D_versions`, `Vulkan_versions`, `OpenGL_versions`,
  `Windows_64bit_executable`, `Windows_ARM_app`, and the equivalent macOS/Linux fields.
- `Mods` — `ModName` (Page), `GameName`, `Type`, `State`, `Notes` (Wikitext).
- `Cloud`, `Video`, `Audio`, `Input`, `Controller`, `Multiplayer`, `VR_support` — the corresponding
  article sections.

## Wikitext Structures

For everything Cargo does not expose, parse the article wikitext.

### Availability rows

```wikitext
{{Availability/row| Microsoft Store | 9PH9X0760B0T | Microsoft Store | {{Store feature|Xbox Play Anywhere}}. | | Windows }}
{{Availability/row| Gamesplanet | 6997-1 | Steam | ... | | Windows }}
{{Availability/row| Retail | | Steam | Collectors edition, digital code included. | | Windows }}
```

Positional parameters: `1` store alias, `2` store-specific ID or slug, `3` DRM, `4` notes,
`5` retail key types, `6` OS list. Parameter 2 is empty for `Retail`.

Parameter 1 is an alias, not the canonical store name — matching on the display name from
`Available_from` will miss rows. Alias -> product URL, from `Template:Availability/store`:

| Aliases (case-insensitive) | Product URL |
| --- | --- |
| `steam` | `https://store.steampowered.com/app/{id}/` (also `steam-sub`, `steam-bundle` -> `/sub/`, `/bundle/`) |
| `gog`, `gog.com` | `https://gog.com/game/{slug}` |
| `egs`, `epic`, `epic games store` | `https://www.epicgames.com/p/{slug}` (`store.epicgames.com/en-US/p/{slug}` also resolves) |
| `ms store`, `microsoft store` | `https://apps.microsoft.com/detail/{id}` |
| `ea app`, `ea desktop`, `origin` | `https://www.ea.com/games/{slug}` |
| `uplay`, `ubisoft`, `ubisoft store` | `https://store.ubi.com/{slug}.html` |
| `battle.net` | `https://battle.net/shop/product/{slug}` |
| `bethesda.net` | `https://bethesda.net/en/store/product/{slug}` |
| `humble`, `humble store` | `https://www.humblebundle.com/store/{slug}` |
| `gmg` | `https://www.greenmangaming.com/games/{slug}` |
| `gamesplanet` | `https://gamesplanet.com/game/{id}` |
| `itch.io` | parameter 2 is the full URL |
| `oculus`, `meta`, `meta store` | `https://www.meta.com/experiences/pcvr/{id}/` |
| `macapp`, `mac app store` | `https://apps.apple.com/app/{id}` |
| `viveport`, `zoom`, `zoom platform`, `discord`, `twitch`, `gamersgate`, `amazon*` | see the template |
| `retail`, `developer`, `publisher`, `official` | no product ID; the last three take a full URL |

The wiki's own links carry affiliate parameters (`?epic_affiliate=pcgamingwiki`, `af.gog.com`,
`?tag=pcgamingwik0e-20`). Build clean URLs from the ID rather than copying the rendered link.

`{{Store link|alias|id|label}}` uses the same alias set and appears inline in notes for edition
variants — a game with a Premium Edition typically has the base ID in the row and the variant IDs in
`{{store link}}` calls inside parameter 4.

### Save and config paths

```wikitext
{{Game data|
{{Game data/config|Windows|{{p|userprofile}}\Saved Games\id Software\DOOMTheDarkAges\base\}}
}}
{{Game data|
{{Game data/saves|Windows|{{p|steam}}\userdata\{{p|uid}}\3017860\remote\}}
{{Game data/saves|Microsoft Store|{{p|localappdata}}\Packages\BethesdaSoftworks.ProjectTitan_3275kfvn8vcwc\SystemAppData\wgs\}}
}}
```

Parameter 1 is the OS or store variant, parameter 2 the path. Paths embed `{{p|...}}` path tokens
(`userprofile`, `localappdata`, `appdata`, `steam`, `uid`, `game`, `hkcu`) that must be substituted
or stripped. Because the path argument itself contains `{{ }}`, a naive `[^}]+` regex truncates —
scan with a brace-depth counter and take the last top-level `|` argument before the closing `}}`.

Unity games conventionally use `%USERPROFILE%\AppData\LocalLow\{Developer}\{Game}\{Subfolder}`,
which yields the developer and product folder names directly.

### Engine version

```wikitext
{{Infobox game/row/engine|Unreal Engine 5|build=5.4.4}}
```

`build` is 2-4 dotted components; normalise to 4 (`5.4.4` -> `5.4.4.0`) before comparing.

## Use in This Repo

`vortex_utils.py` centralises access. `PCGW_API` holds the `api.php` base URL and `PCGW_USER_AGENT`
the descriptive User-Agent the site requires.

- `pcgw_get_json(url)` -> parsed JSON, sending `PCGW_USER_AGENT`. Every PCGamingWiki request goes
  through this rather than `http_get()`/`http_get_json()` directly, which send a generic
  `Mozilla/5.0`.
- `lookup_pcgamingwiki(game_name)` -> `(page_url, page_title)`. Stage 1 tries `action=query&titles=`
  with `redirects=1` across the name variants from `name_lookup_variants()`; stage 2 falls back to
  `list=search&srwhat=title&srlimit=20` with normalised matching, then fetches the wikitext to follow
  a `#REDIRECT` stub. Results are cached per name for the session, and each request is spaced by a
  `time.sleep(0.2)`.
- `fetch_pcgw_availability(page_title)` -> `{'xbox', 'xbox_url', 'epic_url', 'engine_version', 'unity_paths'}`,
  parsed from the wikitext structures above.
- `parse_unity_data_paths(wikitext)` -> developer/game/save/config folder names for Unity titles,
  using the brace-depth scanner.

`new_extension.py` calls both when scaffolding a new extension, populating `PCGAMINGWIKI_URL`,
`XBOXAPP_ID` (as a comment on the URL), the Epic store URL, and the Unity registry/AppData constants.
`patch_extensions.py` exposes the same lookup as the `pcgamingwiki_url` patch
(`--only pcgamingwiki_url`, `--force-pcgw` to re-evaluate values that are already set, `--debug` to
print raw search results). Extensions surface the result through the standard
`Open PCGamingWiki Page` toolbar action, which opens `PCGAMINGWIKI_URL`.

Two things to keep in mind when touching that code:

- Route new requests through `pcgw_get_json()`. A direct `http_get()` call sends the generic
  `Mozilla/5.0`, which the site says it may block.
- Request spacing is a bare `time.sleep(0.2)` between calls, which allows up to 300 requests/minute
  — ten times the published limit. It is safe today only because a single game costs 2-3 requests
  and lookups run sequentially. Any parallel or whole-repo sweep needs real throttling to stay
  under 30/minute.

## Caveats

- No authentication and no API key — which also means no elevated rate limit.
- Cargo tables and fields are wiki-template-derived and can change when editors restructure a
  template. Re-check with `cargofields` rather than assuming a schema.
- Data completeness varies per article. A missing `Availability/row` means nobody has filled it in,
  not that the game is absent from that store.
- Steam AppID lists mix base game, DLC, and soundtrack entries with no type marker; the first entry
  is conventionally the base game but this is not guaranteed.

---

## See also

`REGISTER_GAME.md` (the `IGame` store-ID fields these lookups populate).
`TEMPLATES_OVERVIEW.md` (the `PCGAMINGWIKI_URL` constant and the toolbar action every template ships).
`GAMEBANANA_API.md` and `MODDB_API.md` (the other third-party sites this repo queries, both with
their own bot-protection behaviour).
