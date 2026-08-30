# SteamCharts API

[SteamCharts](https://steamcharts.com) tracks concurrent-player counts for every game on Steam.
There is no official API, no documentation, and no key — but the site's own chart is fed by a plain
JSON endpoint that answers unauthenticated requests, and the rest of the data is server-rendered
HTML. That JSON endpoint is the only free source of *hourly* player history: Steam's own Web API
reports the current player count and nothing else, and SteamDB (which does keep full history) sits
behind a Cloudflare challenge that no script gets through.

| Surface | URL | Returns |
| --- | --- | --- |
| Player history | `https://steamcharts.com/app/{appid}/chart-data.json` | JSON `[[unix_ms, players], ...]` |
| App page | `https://steamcharts.com/app/{appid}` | HTML — current/peak stats plus a month-by-month table |
| Top list | `https://steamcharts.com/top`, `/top/p.{n}` | HTML — 25 ranked games per page |

Everything below was verified live (August 2026) against Counter-Strike 2 (`730`), Dota 2 (`570`),
Elden Ring (`1245620`), and a handful of unreleased 2026 titles.

---

## Access rules

- No API key, no auth, no session, no referer check.
- **No `robots.txt`** — the site returns `404` for it, so there are no published crawl directives.
- The site is behind Cloudflare, but serves a plain `200` to any client. No browser User-Agent is
  needed; a request with no `User-Agent` header at all succeeds. This is the opposite of most
  third-party mod and game-data sites, which challenge or `403` non-browser clients.
- `http://` redirects to `https://`.
- **No rate limit observed.** 15 back-to-back `chart-data.json` requests with no delay all returned
  `200` in 2.1 s total. Space requests anyway (~0.3 s is plenty) — the data only changes hourly, so
  there is nothing to gain from hammering it.
- Responses carry an `expires` header set to the next hour boundary, and Cloudflare revalidates on
  that schedule.

---

## `chart-data.json`

The endpoint that backs the graph on each app page. `Content-Type: application/json`, roughly 22 KB
for a game with fourteen years of history.

```json
[[1341100800000, 1642], [1343779200000, 52261], ..., [1787920915000, 1149716]]
```

Each element is `[timestamp_ms, concurrent_players]`. Timestamps are UTC milliseconds, ascending.

### Resolution tiers

The series is **not** uniform. It is downsampled by age, which matters whenever you compute a
statistic across a window that spans a tier boundary:

| Age of data | Interval | Points (app `730`) |
| --- | --- | --- |
| Last 30 days | Hourly | 719 |
| 30–90 days | Daily | 59 |
| Older than 90 days | Monthly, first of month at 00:00 UTC | 167 |

So a 7-day window is entirely hourly (167 points), a 60-day window mixes hourly and daily samples,
and anything past 90 days is one point per month. An average taken naively across tiers weights a
whole month the same as one hour.

### Freshness

The final point equals the "playing now" figure on the app page exactly (verified across all three
test apps). It lags real time by up to an hour, since the series is written hourly.

### Status codes

| Response | Meaning |
| --- | --- |
| `200` + populated array | Normal. |
| `200` + `[]` | SteamCharts knows the appid but has no player history — typically an unreleased game. |
| `404` (HTML body) | SteamCharts has no record of the appid. |

The `404` body is an HTML error page, not JSON, so parse only after checking the status. Note the
asymmetry: an unreleased game returns `[]` here while its **app page returns `404`**.

### Peak semantics

The site's own published peak figures are `max()` over this same series. Verified on app `730`:

| Figure | Page value | `max()` of the JSON over that window |
| --- | --- | --- |
| "Last 30 Days" peak | 1275415 | 1275415 |
| "July 2026" peak | 1420896 | 1420896 |

So a peak computed from this endpoint matches the site's published methodology — it is not an
independent approximation of it.

Two consequences worth stating plainly:

- **A peak is a sampled lower bound.** Each point is a snapshot, so a spike shorter than the
  sampling interval never appears. The true peak is always ≥ the reported one.
- **The stats-block "24-hour peak" can disagree slightly** with `max()` over a rolling 24-hour
  window, because the page is cached on the hour while a rolling window computed from "now" drops
  the boundary sample. Counter-Strike 2 showed 1246779 on the page against 1166050 rolling; Dota 2
  and Elden Ring matched exactly. This is a window-edge artifact, not a second data source.

### Computing a peak over a window

```python
import json, time, urllib.request

def week_peak(appid):
    """Peak concurrent players over the last 7 days, or None if there is no data."""
    url = f"https://steamcharts.com/app/{appid}/chart-data.json"
    with urllib.request.urlopen(urllib.request.Request(url), timeout=20) as resp:
        points = json.loads(resp.read())          # raises HTTPError 404 for an unknown appid
    cutoff_ms = (time.time() - 7 * 86400) * 1000
    recent = [p[1] for p in points if p[0] >= cutoff_ms]
    return max(recent) if recent else None        # [] -> None, e.g. an unreleased game
```

---

## App page

`https://steamcharts.com/app/{appid}` is fully server-rendered — no JavaScript needed to read it.

The `<h1>` holds the game name (wrapped in an `<a>`), which is the cheapest way to confirm an appid
resolved to the game you meant.

Three `<span class="num">` values follow, in this order:

1. Players in game right now (identical to the last `chart-data.json` point).
2. 24-hour peak.
3. All-time peak.

Below that sits a `common-table` with one header row and one row per period, newest first:

| Month | Avg. Players | Gain | % Gain | Peak Players |
| --- | --- | --- | --- | --- |
| Last 30 Days | 820479.22 | -32753.2 | -3.84% | 1275415 |
| July 2026 | 853232.45 | -63422.08 | -6.92% | 1420896 |
| June 2026 | 916654.53 | -16066.51 | -1.72% | 1573727 |

The first data row is always `Last 30 Days`; the rest are calendar months back to the game's launch
(170 rows for Counter-Strike 2). Numbers carry no thousands separators, and a positive `Gain` is
written with the HTML entity `&#43;`, so unescape before parsing. Where you only need per-month
figures, this one HTML request beats parsing the JSON — the monthly tier of `chart-data.json` gives
the same peaks but the page gives you the averages for free.

An appid with no player history returns `404` here even though `chart-data.json` returns `[]`.

---

## Top list

`https://steamcharts.com/top` ranks every game with players by current player count, 25 rows per
page, paginated as `/top/p.{n}`. Columns: rank, name, current players, a sparkline cell (empty in
the HTML), peak players, hours played. Each row links to `/app/{appid}`, which is a way to harvest
appids in bulk without touching Steam.

The list runs deep — `/top/p.400` still returns real rows (rank 9976, one current player). Past the
end of the list the page returns `404`.

---

## Resolving a game name to an appid

SteamCharts has no search endpoint and is keyed entirely by Steam appid. Steam's own store search
fills the gap:

```text
https://store.steampowered.com/api/storesearch/?term={name}&cc=us&l=en
```

It is unauthenticated and returns `{"total": n, "items": [{"id": appid, "name": ..., "type": "app"}]}`.

Match strictly. Normalize both sides (lowercase, strip everything non-alphanumeric) and accept only
an exact hit — a near match is far more likely to be a different entry in the same series, or a demo
or soundtrack, than the game you asked for. On a sample of recently-added game names this resolved 9
of 10 titles; on a sample weighted toward older catalogue titles it resolved 17 of 25.

The misses are worth understanding, because most of them are the rule working rather than failing.
Six unmatched titles, checked by hand against what the search actually returned:

| Query | Top results | Why no exact match |
| --- | --- | --- |
| `Yakuza 0` | `Yakuza 0 Director's Cut` only | A different SKU with its own appid and its own player count. |
| `Divinity: Original Sin` | Two *Original Sin 2* editions | The original is not even in the top results; the sequel is. |
| `Lobotomy Corporation` | `LobotomyCorporation_ArtBook`, then the game | The DLC art book outranks the game. |
| `Grand Theft Auto IV` | `Grand Theft Auto IV: The Complete Edition` | Genuine miss — same game, renamed on Steam. |
| `Final Fantasy XIV` | `FINAL FANTASY XIV Online` | Genuine miss — same game, renamed on Steam. |
| `FIFA 23` | `total: 0` | Delisted from Steam. A blank is the correct answer. |

Three of the six would have returned a **wrong** number under a "take the top result" or prefix-match
rule — a director's cut, a sequel, and an art book. Only two are true rename misses, and one is not a
miss at all. Loosening the rule trades a blank cell for a plausible-looking wrong one, which is the
worse failure: a blank is visibly missing, a wrong player count is not.

Cache the mapping, negative results included. Names do not change often, and the appid lookup is the
expensive half of the pair.

---

## Choosing a source

| Source | Gives you | Cost |
| --- | --- | --- |
| SteamCharts `chart-data.json` | Hourly history (30 d), daily (90 d), monthly (all time) | Unofficial, undocumented |
| Steam `ISteamUserStats/GetNumberOfCurrentPlayers/v1` | Current players only, no history | Official, keyless |
| Steam `ISteamChartsService/GetGamesByConcurrentPlayers` | Top 100 games only | Official, keyless |
| SteamSpy `appdetails` (`ccu` field) | Yesterday's peak only | Unofficial, no history |
| SteamDB | Full history at finer resolution | Cloudflare challenge — not scriptable |

For "how popular is this game right now", the official current-players endpoint is the honest
choice. For anything involving a *window* — a weekly peak, a trend, a launch curve — SteamCharts is
the only free option.

---

## Caveats

- Unofficial and undocumented. `chart-data.json` is an implementation detail of the site's chart and
  could change or disappear without notice. Treat every failure as "no data" rather than an error,
  and never block a workflow on it.
- Peaks are sampled lower bounds (see **Peak semantics** above).
- Concurrent players measure activity, not sales or ownership.
- Steam-only. A game released solely on Epic, GOG, or console has no entry — the correct output is a
  blank cell, not a zero, and conflating the two turns "not on Steam" into "nobody plays it".
- The appid must be the base game. DLC, soundtrack, and demo appids have no chart of their own.

---

## See also

`STEAM_FILE_DOWNLOADER.md` (the other Steam-facing surface this repo talks to; the appid keying
every lookup here is the same `steamAppId` that extension registers).
`REGISTER_GAME.md` (`details.steamAppId` on `IGame` — where that appid comes from in an extension).
`PCGAMINGWIKI_API.md` (game metadata and Steam AppID lists, useful when the store search cannot
resolve a title).
`MODDB_API.md` (a third-party site that *does* enforce a bot check, and the fallback routes needed
to work around one — the contrast with this host's open access).
