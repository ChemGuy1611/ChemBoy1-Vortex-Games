# downloader.js (Requirements Auto-Downloader)

A shared module copied into each game extension that auto-downloads and installs a modding requirement (a script loader, framework, or runtime) from its **GitHub releases**. It picks the right release/asset, downloads it, imports it into Vortex as a managed mod, and surfaces an "update available" notification when a newer release appears.

The canonical copy lives at `resources/downloader/downloader.js`. Each adopting extension carries its own copy — changes to the canonical file must be propagated manually to every extension that bundles a `downloader.js`.

For **GameBanana**-hosted requirements, use the companion module `resources/downloader/gamebanana_downloader.js` instead (same local-copy model, with `template_gamebanana_downloader.js` for wiring) — documented in `GAMEBANANA_API.md`.

For **ModDB**-hosted requirements, use the companion module `resources/downloader/moddb_downloader.js` instead (same local-copy model, with `template_moddb_downloader.js` for wiring) — documented in `MODDB_API.md`.

For **ModWorkshop**-hosted requirements, use the companion module `resources/downloader/modworkshop_downloader.js` instead (same local-copy model, with `template_modworkshop_downloader.js` for wiring) — documented in `MODWORKSHOP_API.md`.

For **Thunderstore**-hosted requirements, use the companion module `resources/downloader/thunderstore_downloader.js` instead (same local-copy model, with `template_thunderstore_downloader.js` for wiring) — documented in `THUNDERSTORE_API.md`.

For **BepInEx bleeding-edge** builds (`builds.bepinex.dev`, the only source of an IL2CPP-capable BepInEx 6), use the companion module `resources/downloader/bepinexbe_downloader.js` instead (same local-copy model, with `template_bepinexbe_downloader.js` for wiring) — documented in `BEPINEX_BE_BUILDS.md`. Mono Unity games stay on this module: BepInEx 5.x ships as ordinary GitHub releases.

---

## Architecture

Hand-authored CommonJS (formerly a webpack bundle). All HTTP goes through the native `fetch` global — Vortex 2 loads extensions in the Electron renderer, so requests use the same Chromium network stack the previously vendored axios browser build did. The externals required are `vortex-api`, `semver`, and node's `path`/`fs`/`stream` (the `turbowalk` dependency was dropped — recursive walking now uses Vortex's `util.walk`).

`resources/downloader/downloader_old.js` (+ `.map`) is retained only as a diffing reference against the original webpack bundle. `resources/downloader/downloader_axios.js` is the archived last axios-based version, from before the switch to native `fetch`.

---

## Exports

```js
const {
  download,
  findModByFile,
  findDownloadIdByFile,
  resolveVersionByPattern,
  resolveVersionByAssetDate,
  resolveVersionByModVersion,
  resolveVersionByDirectCopyMarker,
  testRequirementVersion,
} = require('./downloader');
```

| Export | Role |
| --- | --- |
| `download(api, requirements, force)` | Install missing requirements; with `force === true`, perform updates. Main entry point. |
| `findModByFile(api, modType, fileName)` | Find an installed requirement mod by a marker file (case-insensitive). Used in `findMod`. |
| `findDownloadIdByFile(api, fileName)` | Find an already-downloaded archive's download id by file name. Used in `findDownloadId`. |
| `resolveVersionByPattern(api, requirement)` | Resolve the installed version from the archive file name via `fileArchivePattern`. Default strategy. |
| `resolveVersionByAssetDate(api, requirement)` | Resolve the installed version from the recorded GitHub asset upload time. For `trackByAssetDate` requirements. |
| `resolveVersionByModVersion(api, requirement)` | Resolve the installed version from the `version` attribute stamped on the installed mod. For versionless asset filenames (version only in the release tag). |
| `resolveVersionByDirectCopyMarker(api, requirement)` | Resolve the installed version from the `<directCopyPath>.version.json` marker file. For direct-copy requirements, which have no mod entry to stamp. |
| `resolveVersionByNightlyRun(api, requirement)` | Resolve the installed build from the `nightlyRunNumber` attribute stamped on the installed mod. For nightly (CI artifact) requirements. |
| `testRequirementVersion(api, requirement)` | Compare installed vs. latest release; if newer, raise the "update available" notification. |
| `getLatestGithubReleaseAsset(api, requirement)` | Fetch the matching release asset from GitHub (also exported). |
| `getLatestNightlyArtifact(api, requirement)` | Fetch the newest successful workflow run from the GitHub Actions API and return it shaped as a release asset. For nightly requirements (also exported). |
| `doDownload(downloadUrl, destination)` | Low-level streamed download to a path (also exported). |
| `getMods`, `walkPath` | Helpers also exported but rarely consumed directly. |

---

## The requirement object

`download()` (and the helpers) take an array of requirement objects. Each describes one GitHub-hosted requirement:

| Field | Required | Meaning |
| --- | --- | --- |
| `archiveFileName` | yes | Expected archive file name (also used as the download-id lookup key). |
| `modType` | yes | Vortex mod type id this requirement installs as. The module assigns it to the installed mod itself, and detection only considers mods that carry it. |
| `assemblyFileName` | yes | Marker file used to detect an installed requirement (matched **case-insensitively**), searched only within mods of this requirement's `modType`. |
| `userFacingName` | yes | Display name in notifications, in error messages, and in the mod list (stamped as the mod's `customFileName`). |
| `githubUrl` | yes | GitHub API repo URL, e.g. `https://api.github.com/repos/{author}/{repo}`. |
| `findMod` | yes | `(api) => findModByFile(api, modType, assemblyFileName)`. |
| `findDownloadId` | yes | `(api) => findDownloadIdByFile(api, archiveFileName)`. |
| `fileArchivePattern` | for pattern resolve | RegExp whose capture group 1 is the version, e.g. `/^Name(\d+\.\d+\.\d+)/i`. |
| `resolveVersion` | for update checks | `(api) => resolveVersionByPattern(api, req)` (or `…ByFile` / `…ByAssetDate` / `…ByModVersion`). Omit to disable update checks. |
| `allowPrerelease` | opt-in | `true` -> fetch newest release including GitHub pre-releases (scans `/releases` newest-first, skipping releases that carry no matching asset). Default uses `/releases/latest` (stable only). |
| `prereleaseTag` | opt-in | `'<tag>'` -> fetch one fixed release directly via `/releases/tags/<tag>` (rolling tag, e.g. UE4SS `experimental-latest`). Pick the tag that upstream *moves*, not one that merely sounds current — see the warning below. |
| `trackByAssetDate` | opt-in | `true` -> detect updates by the asset's GitHub upload time instead of the version tag (rolling tag whose name never changes, only the files). |
| `versionFile` | for file resolve | File holding the version (e.g. `version.txt`) when it is not in the archive name; read by `resolveVersionByFile`. |
| `autoInstall` | opt-out | `false` -> never install this requirement unattended. `setup()` and the update check both leave it alone; only an explicit user action (a toolbar button calling `download`) installs it. Default (unset) installs a missing requirement automatically. |
| `pinVersion` | opt-in | Hold this requirement at one specific release instead of tracking the newest. While the installed version equals the pin, the update check returns without any HTTP request. See **Version pinning**. |
| `pinTag` | with `pinVersion` | The GitHub tag to fetch when it is not simply `pinVersion`. The same tag with its leading `v` toggled is retried automatically on a 404, so most repos need no `pinTag` at all. |
| `directCopyPath` | opt-in | Absolute destination **file** path. Its presence switches the requirement into direct-copy mode for non-archive assets — `findMod`/`findDownloadId`/`modType`/`assemblyFileName` are then not read. See **Direct-copy requirements**. |
| `directCopyModType` | with `directCopyPath` | Mod type that also satisfies the requirement. If a mod of this type is installed (the user took an archived build from Nexus instead), the file is considered present without touching the filesystem. |
| `nightlyUrl` | opt-in | Stable download URL for a GitHub Actions CI artifact (a `nightly.link` URL). Its presence switches the requirement into nightly mode, where identity comes from the Actions run listing rather than a release. See **Nightly (CI artifact) requirements**. |
| `nightlyWorkflow` | with `nightlyUrl` | Workflow file name as it appears in `.github/workflows`, e.g. `build.yml`. |
| `nightlyBranch` | with `nightlyUrl` | Branch the nightly is built from, e.g. `alpha-development`. |

---

## Version-resolve strategies

Set one `resolveVersion` per requirement:

- **`resolveVersionByPattern`** (default) — the version is embedded in the archive file name; `fileArchivePattern` capture group 1 is the version.
- **`resolveVersionByFile`** — the version lives inside a file (e.g. `version.txt`). Extracts the newest matching downloaded archive to a temp dir, reads `versionFile`, and parses the version. **Not exported by `downloader.js`** — it ships in `template_downloader.js` because the parse step is per-game customizable.
- **`resolveVersionByAssetDate`** — paired with `trackByAssetDate`; reads the GitHub asset upload time recorded on the installed mod (`githubAssetDate` attribute) at install time.
- **`resolveVersionByModVersion`** — reads the `version` attribute stamped on the installed mod at install time. For requirements whose asset filename is versionless and whose version only exists in the release tag: the install stamps the tag-derived version, and update checks read it back — closing the version-tracking loop that `resolveVersionByPattern` cannot close there.
- **`resolveVersionByNightlyRun`** — paired with `nightlyUrl`; reads the workflow run number recorded on the installed mod (`nightlyRunNumber` attribute) at install time.

Version comparison is centralized: `latestAssetVersion()` and `isUpdateAvailable()` switch between semver comparison and `Date.parse` comparison based on `trackByAssetDate`. Mis-tagged release versions are normalized first via `normalizeVersion()` — every `-`/`_` between digits becomes `.` (e.g. `v1-2-3` -> `v1.2.3`, `6_1_1` -> `6.1.1`) so semver can parse them.

When the latest release is fetched, `latestAssetVersion()` prefers the version embedded in the **asset filename** (the `fileArchivePattern` capture group run against the asset name) over the release tag. This makes update detection work for rolling-tag repositories whose tag carries no version at all (e.g. EntityAtlan publishes `AtlanModLoader_v_6_1_1.zip` under the permanent tag `ModLoader`). Patterns without a capture group, or assets that don't match, fall back to the semver-coerced tag name as before. The same asset-derived version flows through every stamp point: the fresh-download install stamps it as the mod's `version` attribute, the already-downloaded shortcut path stamps the equivalent value extracted from the local archive name, and both the update check and the update dialog label use it — so a static tag never leaks into comparisons or the UI.

The inverse case needs care: when the version lives only in the release **tag** and the asset filename is versionless (e.g. lovely-injector publishes `lovely-x86_64-pc-windows-msvc.zip` under tags like `v0.8.0`), a capture-group-free pattern is correct for asset matching and the tag fallback covers the remote side — but `resolveVersionByPattern` cannot read the **installed** version from such filenames and always returns the `0.0.0` floor. Once the requirement is installed, every check would then report an update available, and the shortcut path would never stamp a `version` attribute. Pair a capture-group-free pattern with **`resolveVersionByModVersion`** instead: the install stamps the tag-derived version on the mod entry, and the update check reads that stamped attribute back (`game-balatro`'s lovely-injector requirement is the reference wiring).

---

## Version pinning

`pinVersion` holds a requirement at one specific release instead of tracking the newest one. It is opt-in and unset by default; with no pin the module behaves exactly as it does without the feature. The intended use is a specific upstream release that breaks a specific game — not general version freezing, since tracking the latest release is the whole point of the module.

The same field name exists in all six downloader modules. Only the way each one *reaches* the pinned release differs, because their hosts do:

| Module | `pinVersion` means | Reach-the-release field |
| --- | --- | --- |
| `downloader.js` | GitHub release version | `pinTag` — optional; defaults to `pinVersion`, retried once with the leading `v` toggled on a 404 |
| `gamebanana_downloader.js` | submission version | `pinFileId` — **required**; the API has no version-to-file lookup |
| `moddb_downloader.js` | file revision | `pinFileId` — **required**; the RSS feed is newest-first with no version index |
| `modworkshop_downloader.js` | file version | `pinFileId` — **required** |
| `thunderstore_downloader.js` | package version | none — the per-version download URL is fully predictable |
| `bepinexbe_downloader.js` | BE build number | `pinArtifactUrl` — optional; only needed once the pinned build has scrolled off the index page |

Behavior, identical across all six:

- **Installed identity equals the pin -> the update check returns immediately**, before any HTTP request. A pinned requirement therefore costs nothing against the GitHub rate limit or any host API. This is the headline behavior, and it is what the short-circuit at the top of each module's update-check entry point exists for.
- Installed identity differs from the pin — **including not installed at all** — and the module resolves the *pinned* release, never the latest one.
- The notification says "pinned version available", not "update available". The wording has to cover a user who is *ahead* of the pin as well as behind it; installing the pin from that state is a deliberate downgrade, and the dialog says so.
- The pin overrides every "which release" strategy the module owns: `allowPrerelease` and `prereleaseTag` here, newest-file selection in the companions. Each combination logs a warning. Selection *within* the pinned release is untouched — `fileArchivePattern` / `filePattern` / `fileType` still pick the right asset out of it.
- `trackByAssetDate` is **ignored** while pinned, and warns. A fixed tag's assets do not roll, so date comparison would only fight the pin.
- Installed identity is read from the module's existing tracking attribute (`version` here, `gamebananaFileId` / `moddbFileId` / `modworkshopFileId` / `thunderstoreVersion` / `bepinexBeBuild` in the companions). In `downloader.js` this deliberately **bypasses `resolveVersion`**, so a pin works whichever of the resolver strategies a requirement uses — including `resolveVersionByAssetDate`, which returns a date that could never be compared against a version.
- `autoInstall` stays orthogonal: the pin says *which* version, `autoInstall` says *whether* anything installs unattended.
- A requirement installed before the pin was set has no matching stamp, so it reads as "not at pin" -> one notification -> installing it stamps the pin -> silent from then on.
- A forced `download(api, [req], true)` installs the pin, not the latest. Toolbar actions labelled "Download Latest X" become inaccurate in a pinned extension — relabel them to "Download X" wherever a pin is set.

Two comparison details are load-bearing in `downloader.js`. `latestAssetVersion()` returns the pin verbatim rather than a coerced tag, because pinned versions are routinely shapes semver cannot hold (BepInEx's 4-segment `5.4.23.5`, ConfigurationManager's 2-segment `19.0`), and the stamped `version` attribute has to match what the next check compares against. The pin comparison itself is exact-string-first, falling back to semver equality only so a version stamped before the pin existed (`19.0` coerced to `19.0.0`) still matches.

---

## Direct-copy requirements (non-archive assets)

Some upstreams publish a naked file rather than an archive — a bare `.dll`, a single `.exe`. Vortex's install pipeline (`import-downloads` -> `start-install-download`) assumes 7-Zip can open whatever was downloaded, so those assets cannot travel through it at all; extensions have historically hand-rolled ~80 lines of bespoke download code per case.

Setting `directCopyPath` switches a requirement into direct-copy mode: the matched release asset is fetched straight to that path and is never registered as a Vortex mod. `findMod`, `findDownloadId`, `modType` and `assemblyFileName` are not read for such a requirement. Everything about *choosing* the asset is unchanged — `archiveFileName`, `fileArchivePattern`, `githubUrl`, `userFacingName`, `allowPrerelease`, `prereleaseTag`, `trackByAssetDate` and `pinVersion` all behave identically, because none of them care whether the matched asset is an archive.

- **Installed detection** is a `stat` on `directCopyPath`, plus an optional check for a mod of `directCopyModType` — that covers a user who installed an archived build from Nexus instead, whose file Vortex is already deploying.
- **Version tracking uses a sidecar marker.** A direct-copied file is not a managed mod, so there are no attributes to stamp. The install writes `<directCopyPath>.version.json` holding `{ version, assetDate }`, and `resolveVersionByDirectCopyMarker` reads it back. The marker disappears with the file (or the game folder), which correctly forces re-detection. Deleting only the marker leaves the file in place but forces one re-resolve.
- **No Downloads-tab entry is created.** This is deliberate: an entry whose "Install" button cannot work would only mislead, for a file that structurally cannot be installed.

### The `GAME_PATH` timing trap

`directCopyPath` is the only requirement field that depends on the discovered game path, and extensions declare `let GAME_PATH = '';` at module scope, assigning it inside `setup()`. A requirement array is built at **module load**, when `GAME_PATH` is still `''` — so the path baked into the array is relative and will never resolve.

Every adopter must reassign the field inside `setup()`, after `GAME_PATH` is set:

```js
//in setup(), after GAME_PATH = discovery.path
XXX_REQUIREMENTS[0].directCopyPath = path.join(GAME_PATH, XXX_TARGET_SUBFOLDER, XXX_FILE);
```

`setup()` runs on every `gamemode-activated`, so it always precedes the toolbar action and the `check-mods-version` handler for that game — one reassignment there covers every path that reads the field. Put it next to the other `GAME_PATH` consumers.

---

## Nightly (CI artifact) requirements

Some upstreams publish their bleeding-edge builds as GitHub **Actions artifacts** rather than releases, usually surfaced through [`nightly.link`](https://nightly.link). MelonLoader's `alpha-development` branch is the reference case. None of the module's three release endpoints (`/releases/latest`, `/releases`, `/releases/tags/<tag>`) can reach an artifact, so such a build has no tag, no release, and a file name that is identical for every CI run.

Setting `nightlyUrl` switches a requirement into nightly mode. Identity then comes from the Actions run listing instead:

```text
GET {githubUrl}/actions/workflows/{nightlyWorkflow}/runs?branch={nightlyBranch}&status=success&per_page=1
```

The newest successful run's `run_number` is the compare key. It is a monotonic integer, so comparison is numeric — there is no version to coerce and semver is not involved. The run is returned shaped like a release asset, so the download, install and attribute-stamping paths are the ordinary archive ones.

- **The endpoint is readable unauthenticated**, and counts against the same GitHub rate limit as the release endpoints (the same rate-limit handling applies).
- **Version tracking** stamps `nightlyRunNumber` on the installed mod; `resolveVersionByNightlyRun` reads it back. The mod's `version` attribute is stamped with the run number as well, so the mod list shows which build is installed. A mod installed before the stamp existed reads as "update available" once, then self-heals.
- **The download-shortcut path is skipped.** A nightly artifact's file name never changes between runs, so an already-downloaded archive matching it is precisely the stale build that must not be reused — the module always re-resolves the newest run. `findDownloadId` is therefore not required on a nightly requirement.
- **`nightlyUrl` is a redirector.** It resolves to a short-lived pre-signed storage URL on every request; `doDownload` follows that the same way it follows GitHub's own asset redirect, so no special handling is needed. Note that `nightly.link` answers `GET` but **404s on `HEAD`** — probe it with a ranged `GET` if you need to check one by hand.
- **Pinning does not apply.** `nightlyUrl` only ever serves the newest run's artifact, so an older build cannot be reached through it. Setting `pinVersion` alongside it logs a warning and is ignored.

---

## Behaviors worth knowing

- **GitHub-only.** Requirements come from GitHub release assets. Nexus requirements are handled inline in the individual extensions, not here. Requirement objects carrying old Nexus fields (`modId`/`fileFilter`/`modUrl`) are ignored.
- **Case-insensitive detection.** `findModByFile` lower-cases both sides, so a maintainer changing the marker file's capitalization won't trigger a constant re-download loop.
- **Detection is scoped to the requirement's mod type.** `getMods` returns only mods whose `type` equals the requirement's `modType`; untyped mods are not searched. Marker files are frequently generic — `winmm.dll`, `dinput8.dll` and friends ship with any number of ordinary ASI mods — and including untyped mods meant such a mod could satisfy the requirement, leaving it permanently "installed" (never downloaded, with update checks reading an unrelated mod's version). Scoping also avoids walking every untyped mod's staging folder on each setup and update check. To keep that safe, `installDownload` dispatches `actions.setModType` for the requirement's `modType` itself rather than relying solely on the extension's own installer firing its `setmodtype` instruction; when the installer already assigned it, the dispatch is a no-op. A requirement that was installed previously without a mod type is re-downloaded once, after which it is typed correctly.
- **A missing or renamed asset is reported, not swallowed.** When no release contains an asset matching `fileArchivePattern` (or `archiveFileName`), `getLatestGithubReleaseAsset` logs a warning and raises an error notification naming the pattern and listing the file names the release actually ships. This is what an upstream asset rename looks like from the extension's side, and it used to fail silently.
- **One bad requirement does not cancel the rest.** Each requirement in the array is processed inside its own `try`, so an unreachable repository, an exhausted rate limit or a failed install affects only that requirement — the remaining ones still install. Rate-limit cancellations are logged rather than raised as error notifications.
- **Concurrent runs are guarded.** `download()` keeps a module-level set of in-flight requirements keyed by mod type, so pressing a `Download <requirement>` toolbar action twice does not start two downloads of the same asset. Matches the guard used by the GameBanana, ModDB, ModWorkshop and Thunderstore modules.
- **A forced run reports when there is nothing to do.** `download(api, requirements, true)` from a toolbar button previously just flashed the activity notification when everything was already current. It now raises a success notification listing the up-to-date requirements and their versions, so a manual button press always produces visible feedback.
- **Downloads are streamed, not buffered.** `doDownload` writes the response body to disk through a backpressure-aware stream instead of materializing the whole asset in memory — mod loaders and emulator builds run to hundreds of megabytes. The web stream is drained by hand rather than via `Readable.fromWeb`, because the renderer's `fetch` returns Blink's `ReadableStream`, a different class from the `node:stream/web` one `fromWeb` brand-checks against. The temp file is removed if the import or install step does not complete.
- **No auto-update on setup.** `download()` installs a missing requirement, but if one is already installed it does **not** silently pull a newer release. Instead it calls `testRequirementVersion`, which raises the "update available" notification. Only the user-driven Download action actually updates — it calls `download(api, [req], true)` (the forced branch).
- **A missing requirement is installed by the update check, not reported as an update.** `testRequirementVersion` starts by asking `findMod` whether the requirement exists at all. If it does not, resolving a version would yield the `0.0.0` floor and raise an "update available" notification for something the user never had — so it installs the requirement instead. This cannot recurse: the call is non-forced, and an installed requirement never reaches that branch. Requirements that should only ever be installed by an explicit user action set `autoInstall: false`.
- **Updating disables the version it replaces, before installing.** When the forced branch finds a newer release, the currently installed mod is disabled with an immediate dispatch rather than being queued into the batch that runs at the end of `download()`. `installDownload` enables the incoming mod the moment it lands, so a deferred disable left both copies enabled across the install — and where Vortex reuses the same mod id for the replacement (common for requirements whose asset name carries no version) the deferred disable would land on the mod that had just been installed, leaving the requirement switched off after a successful update.
- **Rate-limit aware.** `getLatestGithubReleaseAsset` / `doDownload` inspect `x-ratelimit-remaining` on a 403/404 response and reject with `util.ProcessCanceled` when the quota is exhausted. The check only fires when the header is actually present, so an error from a host that doesn't send `x-ratelimit-*` headers surfaces as a normal error instead. (Under the old axios build this check was unreachable — axios threw on any 4xx before the status inspection ran; native `fetch` does not throw on HTTP errors, so it now works.) The logged reset time converts GitHub's epoch-seconds `x-ratelimit-reset` correctly.
- **Non-2xx responses throw.** `fetch` resolves on HTTP errors, so both call sites explicitly throw `Request failed with status code N` on any non-ok, non-rate-limited response — preserving the axios error semantics callers rely on (error notification in `getLatestGithubReleaseAsset`, propagated rejection from `doDownload`).
- **The already-downloaded shortcut is narrow, and its exact-name match is deliberate.** `download()` only reaches the `findDownloadId` lookup after the installed-requirement branches have had their turn: an installed requirement with a `resolveVersion` either raises the update notification (non-forced) or compares versions (forced) and returns either way, and an installed requirement without a resolver is simply re-enabled and returns. The shortcut gate itself (`!versionMismatch && !force && dlId`) therefore fires in exactly one situation — the requirement is **not installed** and a matching archive is already in Vortex's downloads. `findDownloadIdByFile` compares the full base file name (case-insensitively) against `archiveFileName`, so any other file name yields no id and the flow correctly falls through to a fresh GitHub fetch. Do not loosen that comparison to `fileArchivePattern`: a stale older archive left in downloads would then satisfy the requirement and get installed instead of the current release. Outside this lookup, `archiveFileName` is only used to build the update notification's id, so it does not need updating when a project publishes a new archive name.
- **`start-download` arg shape is load-bearing.** The handoff to Vortex's own download manager is `api.events.emit('start-download', [url], dlInfo, undefined, cb, redownload, { allowInstall: false })`. Vortex schema-validates those arguments and, on a mismatch, logs a warning and does nothing at all — no download, no callback, no error dialog. Keep the URL wrapped in an array and keep `redownload` to `'never' | 'ask' | 'replace' | 'always'` (or `undefined`). Details and the full tuples: `VORTEX_DOWNLOAD_MGMT.md`.
- **`prereleaseTag` needs the tag upstream actually moves.** A project can publish several pre-release tags whose names all sound current, and picking the wrong one silently installs an ancient build rather than failing. RE-UE4SS is the cautionary example: `experimental` is an **archive** holding 857 assets accumulated since 2023, so `assets.find` returns whichever 2023 build matches first, while the tag that genuinely rolls is `experimental-latest` (four assets, replaced on each build). Before wiring a `prereleaseTag`, fetch `/releases/tags/<tag>` once and check the asset count and their upload dates — a rolling tag holds a handful of assets all sharing a recent timestamp.
- **The mod list shows `userFacingName`, not the archive name.** Vortex renders a mod as `customFileName || logicalFileName || fileName || name`, and the install pipeline stamps `fileName` with the downloaded archive — so a requirement used to appear as `BepInEx_win_x64_5.4.23.5.zip` even though the module was already setting `name`. Every install now stamps `customFileName` from `userFacingName` as well. It is written at install only, so it cannot overwrite a name the user set afterwards. (The one older exception: the installed-without-resolver branch of `download()` re-stamps it on every non-forced run.) The same stamp exists in all five modules. Rendering rule: `VORTEX_MOD_LIST.md`.
- **Every install path stamps a version when one is parsable.** The stamped `attributes.version` is the source of truth for the installed version — the semver-coerced release tag, or the `fileArchivePattern` capture taken from the asset name. The fresh-download path always stamps `latestAssetVersion()`. The already-downloaded shortcut path stamps the `resolveVersion` result, but deliberately skips stamping on a failed resolve (`''` or the `'0.0.0'` sentinel), so the next forced update records the real release version instead of a floor that would misreport the install and suppress nothing.
- **Tracking attributes, one per mode.** Which attribute holds the installed identity depends on the requirement: `version` by default (and for `pinVersion`), `githubAssetDate` for `trackByAssetDate`, `nightlyRunNumber` for `nightlyUrl`, and the `<directCopyPath>.version.json` marker file instead of any attribute for `directCopyPath`. `pinVersion` deliberately reads `version` directly rather than going through `resolveVersion`, so a pin works whichever strategy the requirement is configured with.
- **Source attribution + version.** A successful install sets `source: 'website'` and `url` to the repo's human page (derived from `githubUrl`, e.g. `https://api.github.com/repos/{owner}/{repo}` -> `https://github.com/{owner}/{repo}`) — Vortex renders this as a clickable "Source" link in the mod details panel. It also records the `version` attribute: the archive-derived version on the already-downloaded shortcut path (no extra GitHub request), or `latestAssetVersion(requirement, asset)` on a fresh download (the same value used in the update-check dialog). When the shortcut path cannot resolve a version (no resolver, or the `''`/`'0.0.0'` sentinel for a versionless archive), the attribute is left unset rather than stamped with a bogus floor — the next forced update stamps the real release version.

---

## Consumer wiring (template_downloader.js)

`resources/downloader/template_downloader.js` shows the `REQUIREMENTS` array and how to wire it. Minimum integration:

```js
const {
  download, findModByFile, findDownloadIdByFile,
  resolveVersionByPattern, resolveVersionByAssetDate, testRequirementVersion,
} = require('./downloader');

const REQUIREMENTS = [
  {
    archiveFileName: XXX_ARC_NAME,
    modType: XXX_ID,
    assemblyFileName: XXX_FILE,
    userFacingName: XXX_NAME,
    githubUrl: XXX_URL_API,
    findMod: (api) => findModByFile(api, XXX_ID, XXX_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, XXX_ARC_NAME),
    fileArchivePattern: new RegExp(/^XXX(\d+\.\d+\.\d+)/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
    // allowPrerelease: true,
    // prereleaseTag: 'experimental-latest',
    // trackByAssetDate: true,
    // resolveVersion: (api) => resolveVersionByAssetDate(api, REQUIREMENTS[0]),
    // pinVersion: VER,        // hold at this release; update checks go silent once it is installed
    // pinTag: `v${VER}`,      // only if the tag is not just pinVersion
  },
];
```

The template also carries a commented direct-copy requirement, including the `setup()` reassignment of `directCopyPath` that the `GAME_PATH` timing trap requires.

In `setup()` — install on first run if missing:

```js
async function setup(api) {
  const requirementsInstalled = await checkForRequirements(api);
  if (!requirementsInstalled) {
    await download(api, REQUIREMENTS);
  }
}
```

In `context.once()` — check versions when the game's mods are checked:

```js
api.onAsync('check-mods-version', (gameId, mods, forced) => {
  if (gameId !== GAME_ID) return;
  return onCheckModVersion(api, gameId, mods, forced); // loops testRequirementVersion over REQUIREMENTS
});
```

The template also includes a full `resolveVersionByFile` implementation (extract newest archive to a temp dir, read `versionFile`, parse) with the per-game parse step marked for customization.

---

## See also

`VORTEX_DOWNLOAD_MGMT.md` (the `start-download`/`import-downloads` events this module hands off
to). `TEMPLATES_OVERVIEW.md` (which templates bundle a `downloader.js` copy).
`ARCHIVE_HANDLER.md` (why `archiveFileName` should point at an asset with a standard archive
extension, and what a custom extension like `.vmz` costs).
`VORTEX_MOD_METADATA.md` (why a GitHub-sourced requirement can end up tagged with an unrelated
Nexus `modId`, and what an extension can do about it).
`VORTEX_MOD_LIST.md` (the `customFileName || logicalFileName || fileName || name` rule that decides
which name a requirement shows under).
`GAMEBANANA_API.md`, `MODDB_API.md`, `MODWORKSHOP_API.md`, and `THUNDERSTORE_API.md` (the non-GitHub
mod hosts — each has a sibling downloader module; the ModWorkshop and Thunderstore ones are the
simplest, since both hosts serve direct download URLs).
`BEPINEX_BE_BUILDS.md` (the sixth sibling module, for the IL2CPP-capable BepInEx 6 CI builds —
the only one whose requirements are ordered by build number instead of by version).
`EMBEDDED_BROWSER.md` (the `browse-for-download` hand-off used when a requirement has no predictable
URL, and how to embed a mod site in a page instead).
