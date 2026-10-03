# Microsoft Store Catalog API

Every Xbox/Game Pass title needs three identity strings to wire `requiresLauncher`'s xbox branch:
`XBOXAPP_ID` (package identity name), `XBOXEXECNAME` (the app's exec name), and `XBOX_PUB_ID` (the
publisher-hash suffix used to locate per-user save data under `Packages\`). The conventional way to
get them is reading `appxmanifest.xml` out of an installed copy — which means owning a Game Pass
subscription and having the title actually installed. Microsoft's own product catalog API returns
the same identity data from just a Store product ID, no install required.

This is not an officially documented public API — it is the backend `displaycatalog.mp.microsoft.com`
service that store.microsoft.com and the Xbox app themselves call — but it answers unauthenticated
`GET` requests with no key, and its response shape has been stable for years across the tooling that
already depends on it (WinGet manifests, various community store-ID resolvers).

| Surface        | URL                                                                      | Returns                    |
| --------------- | ------------------------------------------------------------------------ | --------------------------- |
| Product catalog | `https://displaycatalog.mp.microsoft.com/v7.0/products/{id}?market=US&languages=en-us` | Full product JSON |

`{id}` is the Store product ID — the last path segment of a `https://apps.microsoft.com/detail/{id}`
or `https://www.xbox.com/.../store/.../{id}` URL (e.g. `9P402RWR63H4`). Case-insensitive.

---

## Finding the product ID

`fetch_pcgw_availability()` in `vortex_utils.py` already extracts one whenever a game's PCGamingWiki
Availability table carries a Microsoft Store row — it builds `xbox_url` as
`https://apps.microsoft.com/detail/{id}`. Failing that, search `xbox.com/games/store` or
`apps.microsoft.com` directly; the product ID sits at the end of the URL either way.

---

## Response shape

```json
{
  "Product": {
    "Properties": {
      "PackageFamilyName": "JagexLimited.Dominion_srxstwq7wczqa",
      "PackageIdentityName": "JagexLimited.Dominion"
    },
    "DisplaySkuAvailabilities": [
      {
        "Sku": {
          "Properties": {
            "Packages": [
              { "Applications": [], "PackageFamilyName": null },
              {
                "Applications": [{ "ApplicationId": "AppRSDragonwildsShipping" }],
                "PackageFamilyName": "JagexLimited.Dominion_srxstwq7wczqa"
              }
            ]
          }
        }
      }
    ]
  }
}
```

Field mapping:

| Extension constant | JSON path                                                               |
| ------------------- | ------------------------------------------------------------------------ |
| `XBOXAPP_ID`         | `Product.Properties.PackageIdentityName`                                 |
| `XBOXEXECNAME`       | `Applications[0].ApplicationId` of the package that has one              |
| `XBOX_PUB_ID`        | `PackageFamilyName` suffix after the last `_`                            |

`Product.Properties.PackageFamilyName` and `PackageIdentityName` sit at the top level and cover the
common case directly. `XBOXEXECNAME` needs a short scan: `DisplaySkuAvailabilities` usually holds
more than one SKU (full game, trial, etc.), and each SKU's `Packages` array routinely lists a
framework/redistributable dependency **before** the real game package — that entry's `Applications`
array is empty. Walk every package across every SKU and take the first non-empty `Applications[0]`.

`XBOX_PUB_ID` is the same hash that appears in the live install path
(`%LOCALAPPDATA%\Packages\{PackageFamilyName}\...`) and in Xbox save-data paths — it is exactly the
suffix on `PackageFamilyName`, so no separate lookup is needed once that field is in hand.
`'8wekyb3d8bbwe'` is the fixed value for Microsoft-published first-party titles; any other publisher
gets a unique 13-character hash.

---

## Python example

```python
import json, urllib.request

def fetch_xbox_identity(product_id):
    url = f"https://displaycatalog.mp.microsoft.com/v7.0/products/{product_id}?market=US&languages=en-us"
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})) as resp:
        data = json.load(resp)
    props = data["Product"]["Properties"]
    xbox_app_id = props.get("PackageIdentityName")
    family_name = props.get("PackageFamilyName") or ""
    xbox_pub_id = family_name.rsplit("_", 1)[1] if "_" in family_name else None
    xbox_exec_name = None
    for sku in data["Product"].get("DisplaySkuAvailabilities", []):
        for pkg in sku["Sku"]["Properties"].get("Packages", []):
            apps = pkg.get("Applications") or []
            if apps and apps[0].get("ApplicationId"):
                xbox_exec_name = apps[0]["ApplicationId"]
                break
        if xbox_exec_name:
            break
    return xbox_app_id, xbox_exec_name, xbox_pub_id
```

`vortex_utils.fetch_xbox_identity(xbox_url_or_id)` is the version actually used in this repo — same
logic, plus accepting a full URL, retry/error handling via `http_get_json()`, and the redirect
fallback described below. `vortex_utils.fetch_xbox_package_formats(xbox_url_or_id)` reads the package
formats from the same (cached) response — see the next section.

---

## `PackageFormat` predicts whether the game is moddable

Each `Packages[]` entry carries a `PackageFormat`, and the format decides where the install lands:

| `PackageFormat`                 | Install location                                  | Moddable |
| ------------------------------- | ------------------------------------------------- | -------- |
| `MSIXVC`                        | `XboxGames\<title>\Content` (GDK install)         | yes      |
| `XVC`                           | console package, empty `Applications`             | n/a      |
| `EAppx`, `EAppxBundle`, `Appx`  | protected `WindowsApps` folder, encrypted         | no       |

Judge the **PC-launchable** packages only, meaning the ones whose `Applications` array is non-empty.
A GDK title lists its console `XVC` package beside the PC `MSIXVC` one, and a title can list a
console `XVC` next to a protected PC build: Middle-earth: Shadow of War is `EAppxBundle` (PC, has
`Applications`) + `XVC` (console, none), and it is unmoddable. Counting the `XVC` would misclassify it.

Values seen across the games this repo supports or has ruled out:

| Game                               | PC package format | Verdict                                 |
| ---------------------------------- | ----------------- | --------------------------------------- |
| Abiotic Factor, Keeper             | `MSIXVC`          | moddable, supported                     |
| Alien: Isolation, Metro Exodus, Civilization VI, Red Dead Redemption, Borderlands 3, Final Fantasy XVI | `MSIXVC` | moddable |
| Resident Evil 7                    | `EAppxBundle`     | protected, ruled out                    |
| Middle-earth: Shadow of War        | `EAppxBundle`     | protected, ruled out                    |
| Rise of the Tomb Raider            | `Appx`            | protected, ruled out                    |
| PC Building Simulator              | `EAppx`           | protected                               |

This is an inference from store metadata, not a live read: every game this repo already ruled out for
folder permissions reports a protected format, and every supported one reports `MSIXVC`, but an unseen
format should be treated as unknown until an install shows where it lands. A product with no
PC-launchable package at all (console-only, or no PC build uploaded yet — NORSE: Oath of Blood has
zero packages on every SKU and no redirect) yields an empty format set.

---

## The `apps.microsoft.com/detail/{id}` ID can redirect to a different product ID

For several AAA titles (Onimusha: Way of the Sword, The Blood of Dawnwalker, Crimson Desert) the ID
in the human-facing `apps.microsoft.com/detail/{id}` URL resolves via `v7.0/products/{id}` to a valid
product with `XboxXPA: true` (Xbox Play Anywhere) but an **empty `Packages` array on every SKU** — as
if no package existed at all. The listing page ID and the base game's actual catalog product ID are
different products; the storefront silently serves the detail page for one while the real downloadable
package sits under another ID.

The fix is a second, different backend that resolves the real ID first:

```text
https://storeedgefd.dsx.mp.microsoft.com/v9.0/products/{id}?market=US&locale=en-us&deviceFamily=Windows.Desktop
```

Its response shape is unrelated to `displaycatalog` (`Payload.PrimaryPackageIdentity`, not
`Product.Properties`), and it does not carry `XBOXEXECNAME` at all — but `Payload.PrimaryPackageIdentity.ProductId`
is the real product ID. Re-query the original `v7.0/products/{realId}` endpoint with that ID and its
`DisplaySkuAvailabilities[].Sku.Properties.Packages[]` populate normally, `Applications` included.

```python
def resolve_real_product_id(product_id):
    url = (f"https://storeedgefd.dsx.mp.microsoft.com/v9.0/products/{product_id}"
           "?market=US&locale=en-us&deviceFamily=Windows.Desktop")
    data = http_get_json(url)
    identity = data.get("Payload", {}).get("PrimaryPackageIdentity")
    return identity.get("ProductId") if identity else None
```

Trigger this fallback whenever the first `v7.0/products/{id}` call returns a `PackageIdentityName`
that's empty/missing (Onimusha's case) **or** returns a non-empty identity but a `Packages` array of
length 0 on every SKU (Crimson Desert's case — top-level `Properties.PackageIdentityName` was already
populated there, so check `Packages`, not just the top-level identity, before concluding a redirect is
needed). Only retry through `storeedgefd` — the same `v7.0/products/{id}` call with `fieldsTemplate=Details`
or a different market returns byte-identical output, it is not a query-parameter problem.

A genuinely empty `Payload.PrimaryPackageIdentity` (`None`, as opposed to a populated one with empty
`Packages`) means there is no PC package at all yet — confirmed on `game-warhammer40kdarkheresy`
(Owlcat has reserved `OwlcatGames.Warhammer40000DarkHeresy` and its `XBOX_PUB_ID` but shipped no build),
distinct from a genuine redirect. **A package whose `PlatformDependencies` names only `Windows.Xbox`**
(Pragmata's case, `PackageFormat: "XVC"`) means the title is Xbox-console-only for now — no PC/Desktop
package exists to resolve at all, redirect or not; don't treat its console `XBOXAPP_ID` as a usable PC
identity.

---

## Caveats

- **Not an authenticated, versioned, or documented API.** It is the backend the Store client itself
  calls, observed to be stable, not a contract Microsoft guarantees. Treat any failure as "no data",
  never as an error worth surfacing to a user.
- **Store metadata, not a live read — confirm against an install when one is available.** This
  resolves what the *package* declares, not what a live install's `appxmanifest.xml` on a specific
  console/PC actually shipped. Wire the result and flag it as static-verified-only until a real
  Xbox/Game Pass install confirms it — the same caveat every Xbox port in this repo has carried
  before this endpoint was known. First live cross-check (RuneScape: Dragonwilds, September 2026):
  `PackageIdentityName` and the package's `ApplicationId` matched the installed
  `appxmanifest.xml`'s `Identity Name` and `Application Id` exactly — the two fields a live manifest
  can independently confirm both checked out.
- **A title can list more than one package with no `Applications` entry.** Don't assume index `0` is
  the game; scan for the entry that actually has one.
- **Ubisoft and EA titles in the Xbox library often have no usable `XBOXEXECNAME`.** Game Pass
  subscribers get access to a limited slice of the Ubisoft and EA libraries, and those games appear in
  the Microsoft Store and Xbox app even though the publisher's own launcher (Ubisoft Connect, the EA
  app) is what runs them. Their packages are not a normal directly launched game package, so the
  lookup returns either no `ApplicationId` at all (`None`) or only a placeholder such as
  `GDKStubGame`. That is the expected shape for these publishers, not a failed lookup. The package
  identity (`XBOXAPP_ID`) and publisher suffix (`XBOX_PUB_ID`) still resolve, and the publisher-hash
  suffix is shared across a publisher's titles (Ubisoft: `ngz4m417e0mpw`; EA: `q5ha1ztykcgvj`). Treat
  such a hit as unverified until an install confirms the exec name.
- **Region/market can matter for storefront metadata** (price, availability) but not for the package
  identity fields this lookup cares about — `market=US&languages=en-us` is fine regardless of where
  the game actually ships.

---

## See also

`REQUIRES_LAUNCHER.md` (the `requiresLauncher` xbox branch these three constants feed).
`REGISTER_GAME.md` (`spec.game.details.xboxAppId` / `environment.XboxAPPId`, the other places
`XBOXAPP_ID` gets used). `PCGAMINGWIKI_API.md` (the Availability-table scrape that supplies the Store
product URL this lookup starts from). `TEMPLATES_OVERVIEW.md` (`template-ue4-5`'s Xbox constant block
and `hasXbox`-gated path building, the shape these three values plug into).
