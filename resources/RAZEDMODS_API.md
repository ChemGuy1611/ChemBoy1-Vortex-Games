# razedmods.com Downloads (Visual Redemption)

`downloads.razedmods.com` hosts Razed's mods outside Nexus Mods — in practice **Visual Redemption**, the Red Dead Redemption 2 visual overhaul. `razedmods.com/<game>` is the human page for each mod.

There is **no API**. What the host does provide is a stable alias per mod, which is enough to resolve the current version without parsing anything:

| Surface           | URL                                                              | Purpose                                       |
| ----------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Alias             | `https://downloads.razedmods.com/rdr2`                           | Permanent name; `302`s to the current archive |
| Versioned archive | `https://downloads.razedmods.com/Visual%20Redemption%20-%202.40.zip` | The actual archive                        |
| Landing page      | `https://razedmods.com/rdr2`                                     | Human download page                           |

Probed live: plain Cloudflare with no bot check and no User-Agent requirement, `HEAD` answered on both the alias and the archive, an invented alias returns `404`, and the bare host redirects to `razedmods.com`.

## The Redirect Carries the Version

The alias answers `302` with a `Location` naming the versioned archive, and the version is the trailing number in that file name. The name is percent-encoded and contains spaces, so it has to be decoded before matching:

```text
GET  https://downloads.razedmods.com/rdr2
302  Location: https://downloads.razedmods.com/Visual%20Redemption%20-%202.40.zip
     decoded file name: "Visual Redemption - 2.40.zip"  ->  version 2.40
```

This is the same shape as `downloads.fcmodding.com` (`FCMODDING_API.md`), including the trap that comes with it: `fetch` with `redirect: 'manual'` cannot read `Location` in Chromium (opaque-redirect filtered response, status `0`), so the final URL is read from `response.url` after a **followed** redirect. A `HEAD` request is enough.

## Versions Are Dotted Numbers, Compared by Segment

`2.40` is a real dotted version, not a build stamp, and the segment count is not fixed. Two shortcuts both go wrong:

- **Stripping the dots and comparing digits** (the build-stamp key `fcmodding_downloader.js` uses) turns `1.68` into `168` and `1.7` into `17`.
- **`semver.coerce`** pads or truncates anything that is not three segments.

So the module splits on dots and compares the segments as numbers, missing segments counting as `0`. Under that rule `2.40` is newer than `2.5` (40 > 5) and `1.68` is newer than `1.7` — the ordinary reading of a version whose minor number counts up past 9. A host that used decimal-style versions (`1.7` newer than `1.68`) would need a different comparison; nothing on this host has shown that pattern.

## No Version Pinning

The host serves one alias per mod and publishes no index of older versions. There is nothing stable to pin, so the module has no `pinVersion` field — the second downloader module without one, after `fcmodding_downloader.js`. `DOWNLOADER.md` has the cross-module table.

## Archive Layout

Visual Redemption 2.40, read from the live archive:

```text
Visual Redemption - 2.40/
  Main Files/
    Visual_Redemption/        <- a Lenny's Mod Loader mod: install.xml + its data files
  Optional Add-Ons/
    1. No Vignetting/         <- single replacement file + "How to Install.txt"
    2. VisualR for RedM/      <- citizen/ tree for the RedM client, not the base game
    3. Vanilla Art Style/     <- replacement files + "How to Install.txt"
  README - Install Guide.html
```

The mod is an ordinary LML mod — `Main Files/Visual_Redemption/` goes to `<game>/lml/Visual_Redemption/` — and not a game-root preset. The optional add-ons are manual overwrites of files inside that folder and are not installed by the extension.

## Shared razedmods_downloader.js Module

`resources/downloader/razedmods_downloader.js` packages the above into a reusable requirements auto-downloader — the razedmods.com counterpart to the GitHub `downloader.js` and its companions (see `DOWNLOADER.md`). It resolves the current version, downloads and installs it, and raises an "update available" notification when a newer one appears. Adopters carry a byte-identical copy beside `index.js`; `template_razedmods_downloader.js` shows the wiring. Its only external is `vortex-api`.

### The requirement object

| Field             | Required | Purpose                                                                                                    |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `aliasUrl`        | yes      | The stable alias, e.g. `https://downloads.razedmods.com/rdr2`                                               |
| `userFacingName`  | yes      | Notifications, error messages, and the name shown in the mod list                                           |
| `pageUrl`         | no       | Manual-download page, stamped as the mod's Source link (default: the alias)                                 |
| `modType`         | no       | Force a mod type after install. Leave it out to let the extension's own installers decide                   |
| `fallbackVersion` | no       | Version used when the redirect cannot be read                                                               |
| `versionPattern`  | no       | RegExp whose group 1 is the version, run against the decoded file name (default `/-\s*([\d.]+)\.zip$/i`)    |
| `versionAttribute`| no       | Mod attribute tracking the installed version (default `razedModsVersion`)                                   |
| `autoInstall`     | no       | `false` opts out of unattended installs; only an explicit user action installs it                           |

### Exports

`downloadRazedMods`, `checkForRazedModsUpdate` (array entry points), `downloadRazedModsRequirement`, `checkForRazedModsUpdateRequirement`, `isRazedModsRequirementInstalled`, `getLatestRazedModsVersion`, `resolveRazedModsDownloadUrl`, `compareVersions`.

### Behaviors worth knowing

- **Installed copies are found by attribute, not by mod type.** Every other companion module treats "any mod of the requirement's mod type" as the installed copy. That works for a mod loader with a mod type of its own; it does not work here, because the mods on this host are ordinary mods sharing their type with everything else the user has installed. Detecting by type would report the requirement installed as soon as any mod of that type existed, and would disable every one of them when an update replaced "the previous copy". The module stamps `razedModsAlias` (the alias URL) on the mod it installs and matches on that. A copy the user installed by hand is therefore not recognized until it has been installed through the module once.
- **The versioned URL is what gets downloaded**, so the archive lands under its versioned name and successive versions do not collide in the downloads folder. If the redirect cannot be resolved, the alias is handed over and the download manager follows the redirect itself.
- **Attributes stamped:** `version`, `razedModsVersion`, `razedModsAlias`, `source: 'website'`, `url` (the page), `customFileName` (the `userFacingName`), and `modId` / `fileId` cleared so a false Nexus md5 match cannot attach an unrelated update.
- **An update disables the copy it replaces** in the same batch that enables the new one.
- **One install at a time per alias**; a second request while one is running is dropped.

## See also

`DOWNLOADER.md` (the GitHub requirements auto-downloader, the shared local-copy model, and the
cross-module version-pinning table). `FCMODDING_API.md` (the host this module is modelled on — the
same alias-redirect shape with build stamps instead of versions).
`RDR2MODS_API.md` (the other third-party Red Dead Redemption 2 source, a browse page rather than a
downloader). `VORTEX_DOWNLOAD_MGMT.md` (the `start-download` / `start-install-download` events this
module hands off to). `VORTEX_MOD_LIST.md` (the `customFileName` rule that decides which name a
requirement shows under).
