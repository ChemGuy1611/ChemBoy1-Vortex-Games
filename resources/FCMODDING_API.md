# fcmodding.com Downloads (Far Cry Mod Installer)

`downloads.fcmodding.com` hosts the **Far Cry Mod Installer** (FCMI), the community tool the Far Cry modding scene installs mods with. One archive serves all six supported games — Far Cry 3, 4, 5, 6, New Dawn and Primal — so every `game-farcry*` extension downloads the same file.

There is **no API**. What the host does provide is a stable alias per file, which is enough to resolve the current build without parsing anything:

| Surface | URL | Purpose |
| --- | --- | --- |
| File alias | `https://downloads.fcmodding.com/files/{fileName}` | Permanent name; `302`s to the current build |
| Versioned build | `https://downloads.fcmodding.com/version/{name}_{build}.zip` | The actual archive |
| Landing page | `https://downloads.fcmodding.com/all/mod-installer/` | Human download page; prints the current build |

Probed live: `/version/` has no directory index (`404`), and an invented `/files/<name>.zip` redirects to `/404` rather than guessing — only real file names resolve.

## The Redirect Carries the Version

```text
GET https://downloads.fcmodding.com/files/FCModInstaller.zip
  -> 302 https://downloads.fcmodding.com/version/FCModInstaller_20250412-1300.zip
     Content-Length: 48529363
     Last-Modified: Sat, 12 Apr 2025 10:43:35 GMT
```

The build lives in the redirect target's file name. `HEAD` works on this host, so the version can be resolved without pulling the ~48 MB body.

The landing page prints the same stamp as a second, independent signal:

```html
<i>v20250412-1300</i>
Last updated: 2025-04-12 10:44 UTC
```

Sibling files follow the same scheme. `FCModInstallerLinux.zip` is versioned identically (irrelevant — Vortex is Windows). `FCModInstallerBG.zip` (the optional background videos, used by Far Cry 4 and Primal) redirects to an **unversioned** target, so tracking it would need a `Last-Modified`/`ETag` path rather than a file-name one.

## The Opaque-Redirect Trap

The obvious implementation — request with `redirect: 'manual'` and read the `Location` header — **cannot work in a Vortex extension**:

```js
const response = await fetch(url, { redirect: 'manual' }); //WRONG
response.status;                       // 0
response.headers.get('location');      // null
```

Chromium returns an *opaque-redirect filtered response* for a manual redirect: status forced to `0`, header list emptied. This is fetch-spec behavior for a `no-cors`-ish redirect and is not affected by `webSecurity` or any Electron flag.

The working form reads the final URL after a **followed** redirect:

```js
const response = await fetch(url, { method: 'HEAD' }); //redirect: 'follow' is the default
const versionedUrl = response.url; // .../version/FCModInstaller_20250412-1300.zip
```

## Builds Are Timestamps, Not Versions

The build stamp is `YYYYMMDD-HHMM`: `20250412-1300`. It is not semver, and coercing it loses information — `semver.coerce('20250412-1300')` yields `20250412.0.0`, dropping the time half, so two builds released on the same day compare **equal**.

Ordering is therefore a numeric compare of the stamp's digits: `20250412-1300` -> `202504121300`. Twelve digits, well inside `Number.MAX_SAFE_INTEGER`. Same class of problem as the BepInEx BE build numbers (`BEPINEX_BE_BUILDS.md`), and it likewise means no semver dependency is involved.

## No Version Pinning

The host keeps only the current build and roughly one prior. Probed:

| Build | `/files/` alias behavior |
| --- | --- |
| `20250412-1300` (current) | `200` |
| `20240831-0800` (previous) | `200` |
| `20240527-0000` | `302` -> `/zip/<name>/` -> `404` |
| `20231208-1800` | `302` -> `/zip/<name>/` -> `404` |

A pin would therefore start `404`ing within a release or two of being set — silently, from the user's point of view. `fcmodding_downloader.js` is the one downloader module with no `pinVersion` field at all; `DOWNLOADER.md` has the cross-module table.

## Archive Layout

`FCModInstaller.zip` unpacks under a single `FCModInstaller/` root, 30 entries:

- `FCModInstaller.exe` plus a per-game launcher each: `FC3ModInstaller.exe`, `FC4ModInstaller.exe`, `FC5ModInstaller.exe`, `FC6ModInstaller.exe`, `FCNDModInstaller.exe`, `FCPModInstaller.exe`.
- `FCSavegameManager.exe`.
- `bin/` — `DuniaModInstaller.exe` and its DLLs.
- Six `ModifiedFilesFC*/` folders, each holding a `! Put a2, a3, a4, a5, bin files here.txt` marker. These are where FCMI-format mods are dropped.

The per-game extensions install the archive under a `FCModInstaller` mod type targeting the game folder, and point their dashboard tool at `FCModInstaller\FC{N}ModInstaller.exe` — the executable is *inside* the archive root, not at the game root.

## Shared fcmodding_downloader.js Module

`resources/downloader/fcmodding_downloader.js` packages the above into a reusable requirements auto-downloader — the fcmodding.com counterpart to the GitHub `downloader.js` and the GameBanana/ModDB/ModWorkshop/Thunderstore/BepInEx-BE companions (see `DOWNLOADER.md`). It resolves the current build, downloads and installs it, and raises an "update available" notification when a newer build appears.

As with the other downloader modules, the canonical copy lives in `resources/downloader/` and each adopting extension bundles its own copy next to its `index.js` — changes to the canonical file must be propagated manually. Consumer wiring snippets live in `resources/downloader/template_fcmodding_downloader.js`.

Before this module existed, every Far Cry extension carried an inline install-only download function pinned to the `/files/` alias, with **no update check at all** — a user stayed on whichever build they first installed.

### The requirement object

The entry points take an array of requirement objects (conventionally an `MI_REQUIREMENTS` constant in `index.js`), each describing one fcmodding.com requirement:

| Field | Required | Meaning |
| --- | --- | --- |
| `fileName` | yes | File name on the host, e.g. `'FCModInstaller.zip'`. The alias URL is built from it. |
| `modType` | yes | Vortex mod type id the requirement installs as; also the installed-detection key (any mod with this type counts as installed). |
| `userFacingName` | yes | Display name in notifications, on the download, and in the mod list (stamped as the mod's `customFileName`). |
| `pageUrl` | optional | Manual-download page opened on install failure, and the mod's "Source" link. Default `https://downloads.fcmodding.com/all/mod-installer/`. |
| `fallbackVersion` | optional | Version stamp recorded when neither the redirect nor the page can be read. |
| `versionPattern` | optional | RegExp whose capture group 1 is the version, run against the resolved file name. Default `/_(\d{8}-\d{4})\.zip$/i`. |
| `pageVersionPattern` | optional | RegExp whose capture group 1 is the version, run against the landing page's HTML as the fallback signal. Default `/<i>\s*v(\d{8}-\d{4})\s*<\/i>/i`. |
| `versionAttribute` | optional | Mod attribute tracking the installed build stamp for update checks. Default `'fcmoddingVersion'`. |
| `autoInstall` | optional | `false` -> never install this requirement unattended; only an explicit user action (a toolbar button) installs it. Default installs a missing requirement automatically when the update check runs. |

There is no `pinVersion`, for the reason above, and no `assemblyFileName`: installed-detection here is purely by mod type, as in the other non-GitHub companions.

### Exports

| Export | Role |
| --- | --- |
| `downloadFcModding(api, gameSpec, requirements, check = true)` | Download + install each requirement in the array (sequentially), then enable it, set its mod type, and record the version attributes. With `check = true` (default) it is a no-op for requirements already installed; pass `false` to (re)install/update. Main entry point. |
| `checkForFcModdingUpdate(api, gameSpec, requirements)` | For each requirement in the array: install it if it is missing (unless `autoInstall: false`), otherwise compare the tracked stamp against the current build; raise a warning notification with a Download action when newer. Call from a `check-mods-version` handler. |
| `downloadFcModdingRequirement(api, gameSpec, requirement, check = true)` | Single-requirement variant of `downloadFcModding`. |
| `checkForFcModdingUpdateRequirement(api, gameSpec, requirement)` | Single-requirement variant of `checkForFcModdingUpdate`. |
| `isFcModdingRequirementInstalled(api, gameId, requirement)` | Whether any mod with the requirement's mod type exists. |
| `getLatestFcModdingVersion(requirement)` | Current build stamp (redirect file name, then landing page, then `fallbackVersion`), or `null`. |
| `resolveFcModdingDownloadUrl(requirement)` | Versioned download URL the `/files/` alias redirects to, or `null` if the host is unreachable. |

### Behaviors worth knowing

- **The versioned URL is what gets downloaded**, not the `/files/` alias — so the archive lands as `FCModInstaller_20250412-1300.zip` and successive builds do not collide in the downloads folder. If the redirect cannot be resolved the alias is handed over instead: the download manager follows the redirect itself, it just cannot name the archive by build.
- **`HEAD`, not `GET`, for the version lookup.** The archive is ~48 MB; an update check that pulled the body would be absurd. The host answers `HEAD` on both the alias and the versioned URL.
- **Two version signals, in order.** Redirect file name first, landing page second, `fallbackVersion` third. The page pattern exists because the redirect is the load-bearing surface and a host change to it would otherwise silently disable update checks.
- **Numeric stamp compare.** Update detection compares `fcmoddingVersion` numerically, never through semver. A copy installed before version tracking existed has no attribute and reads as `null`, so it draws exactly one notification and the resulting install stamps it — self-healing.
- **No bot-block route.** The host is plain unauthenticated HTTP with no bot check (verified with `curl`, no UA spoofing, `200` on both endpoints), so unlike the ModDB companion there is no direct-fetch fallback and no `skipDownloadManager` field. Re-add one only if a live test shows the download manager blocked.
- **The mod list shows `userFacingName`, not the archive name.** Vortex renders a mod as `customFileName || logicalFileName || fileName || name`, and the install pipeline stamps `fileName` with the downloaded archive — so the install also stamps `customFileName` from `userFacingName`. Written at install only, so it cannot overwrite a name the user set afterwards. Rendering rule: `VORTEX_MOD_LIST.md`.
- **Source attribution.** A successful install sets the mod's `source` attribute to `'website'` and `url` to the landing page — Vortex renders this as a clickable "Source" link in the mod details panel.
- **No silent auto-update.** The update check only notifies; the user-driven Download action performs the update.
- **Updating disables the build it replaces.** An update installs a second mod entry rather than replacing the first, so the mod ids carrying the requirement's mod type are captured before the install and disabled in the same batch that enables the new one — otherwise two copies deploy on top of each other.
- **Overlap guard.** A requirement whose install is already running is skipped (e.g. double-clicked toolbar action), keyed by mod type.
- **Install failure opens the landing page.** A failed download/install shows an error notification and opens the manual-download page.
- **Per-game pieces stay in `index.js`.** The mod type registration and the `registerInstaller` test/install pair for the requirement are not part of this module.

### Wiring

```js
const { downloadFcModding, checkForFcModdingUpdate } = require('./fcmodding_downloader');

const MI_ID = `${GAME_ID}-modinstaller`;
const MI_NAME = "FC3 Mod Installer";
const MI_FILENAME = "FCModInstaller.zip";
const MI_URL_ERR = "https://downloads.fcmodding.com/all/mod-installer/";
const MI_REQUIREMENTS = [
  {
    fileName: MI_FILENAME,
    modType: MI_ID,
    userFacingName: MI_NAME,
    pageUrl: MI_URL_ERR,
  },
];

// in setup()
await downloadFcModding(api, gameSpec, MI_REQUIREMENTS);
await checkForFcModdingUpdate(api, gameSpec, MI_REQUIREMENTS).catch(() => null);

// in context.once()
api.onAsync('check-mods-version', (gameId, mods, forced) => {
  if (gameId !== GAME_ID) return;
  return checkForFcModdingUpdate(api, spec, MI_REQUIREMENTS)
    .catch(err => log('warn', `Failed to check for ${MI_NAME} update: ${err}`));
});

// in applyGame()
context.registerAction('mod-icons', 300, 'open-ext', {}, `Download Latest ${MI_NAME}`, () => {
  downloadFcModding(context.api, spec, MI_REQUIREMENTS, false);
}, () => selectors.activeGameId(context.api.getState()) === GAME_ID);
```

## Caveats

- No API — the redirect and the landing page are the whole contract, and neither is versioned by the site. Keep `fallbackVersion` in mind if the redirect scheme changes.
- Old builds are culled, so there is no way to install anything but the current one. Pinning is impossible by construction.
- FCMI has its own in-app updater. It writes into the deployed (hardlinked) folder, which desyncs Vortex's staging copy — users should let Vortex handle updates instead.
- `mods.farcry.info` (the mod database FCMI installs from) is a different site with no predictable per-mod URL scheme. It stays a plain toolbar link, not a download route.

---

## See also

`DOWNLOADER.md` (the GitHub requirements auto-downloader, the shared local-copy model, and the
cross-module version-pinning table this module is the exception in).
`BEPINEX_BE_BUILDS.md` (the other module whose requirements are ordered numerically rather than by
semver).
`MODDB_API.md` (the module this one is modelled on — the other "no API, probe the host" case, and
the only one whose host bot-blocks non-browser clients).
`VORTEX_DOWNLOAD_MGMT.md` (the `start-download`/`start-install-download` events this module hands
off to). `VORTEX_MOD_INSTALL.md` (installing the downloaded archive as a managed mod).
`VORTEX_MOD_LIST.md` (the `customFileName || logicalFileName || fileName || name` rule that decides
which name a requirement shows under).
`TEMPLATES_OVERVIEW.md` (which templates bundle a downloader module copy).
