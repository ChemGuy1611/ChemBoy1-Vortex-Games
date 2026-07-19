# downloader.js (Requirements Auto-Downloader)

A shared module copied into each game extension that auto-downloads and installs a modding requirement (a script loader, framework, or runtime) from its **GitHub releases**. It picks the right release/asset, downloads it, imports it into Vortex as a managed mod, and surfaces an "update available" notification when a newer release appears.

The canonical copy lives at `resources/downloader/downloader.js`. Each adopting extension carries its own copy — changes to the canonical file must be propagated manually to every extension that bundles a `downloader.js`.

For **GameBanana**-hosted requirements, use the companion module `resources/downloader/gamebanana_downloader.js` instead (same local-copy model, with `template_gamebanana_downloader.js` for wiring) — documented in [GAMEBANANA_API.md](GAMEBANANA_API.md).

For **ModDB**-hosted requirements, use the companion module `resources/downloader/moddb_downloader.js` instead (same local-copy model, with `template_moddb_downloader.js` for wiring) — documented in [MODDB_API.md](MODDB_API.md).

---

## Architecture

Hand-authored CommonJS (formerly a webpack bundle). All HTTP goes through the native `fetch` global — Vortex 2 loads extensions in the Electron renderer, so requests use the same Chromium network stack the previously vendored axios browser build did. The only externals required are `path`, `semver`, and `vortex-api` (the `turbowalk` dependency was dropped — recursive walking now uses Vortex's `util.walk`).

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
| `testRequirementVersion(api, requirement)` | Compare installed vs. latest release; if newer, raise the "update available" notification. |
| `getLatestGithubReleaseAsset(api, requirement)` | Fetch the matching release asset from GitHub (also exported). |
| `doDownload(downloadUrl, destination)` | Low-level arraybuffer download to a path (also exported). |
| `getMods`, `walkPath` | Helpers also exported but rarely consumed directly. |

---

## The requirement object

`download()` (and the helpers) take an array of requirement objects. Each describes one GitHub-hosted requirement:

| Field | Required | Meaning |
| --- | --- | --- |
| `archiveFileName` | yes | Expected archive file name (also used as the download-id lookup key). |
| `modType` | yes | Vortex mod type id this requirement installs as. |
| `assemblyFileName` | yes | Marker file used to detect an installed requirement (matched **case-insensitively**). |
| `userFacingName` | yes | Display name in notifications and on the mod. |
| `githubUrl` | yes | GitHub API repo URL, e.g. `https://api.github.com/repos/{author}/{repo}`. |
| `findMod` | yes | `(api) => findModByFile(api, modType, assemblyFileName)`. |
| `findDownloadId` | yes | `(api) => findDownloadIdByFile(api, archiveFileName)`. |
| `fileArchivePattern` | for pattern resolve | RegExp whose capture group 1 is the version, e.g. `/^Name(\d+\.\d+\.\d+)/i`. |
| `resolveVersion` | for update checks | `(api) => resolveVersionByPattern(api, req)` (or `…ByFile` / `…ByAssetDate` / `…ByModVersion`). Omit to disable update checks. |
| `allowPrerelease` | opt-in | `true` -> fetch newest release including GitHub pre-releases (scans `/releases`). Default uses `/releases/latest` (stable only). |
| `prereleaseTag` | opt-in | `'<tag>'` -> fetch one fixed release directly via `/releases/tags/<tag>` (rolling tag, e.g. UE4SS `experimental`). |
| `trackByAssetDate` | opt-in | `true` -> detect updates by the asset's GitHub upload time instead of the version tag (rolling tag whose name never changes, only the files). |
| `versionFile` | for file resolve | File holding the version (e.g. `version.txt`) when it is not in the archive name; read by `resolveVersionByFile`. |

---

## Version-resolve strategies

Set one `resolveVersion` per requirement:

- **`resolveVersionByPattern`** (default) — the version is embedded in the archive file name; `fileArchivePattern` capture group 1 is the version.
- **`resolveVersionByFile`** — the version lives inside a file (e.g. `version.txt`). Extracts the newest matching downloaded archive to a temp dir, reads `versionFile`, and parses the version. **Not exported by `downloader.js`** — it ships in `template_downloader.js` because the parse step is per-game customizable.
- **`resolveVersionByAssetDate`** — paired with `trackByAssetDate`; reads the GitHub asset upload time recorded on the installed mod (`githubAssetDate` attribute) at install time.
- **`resolveVersionByModVersion`** — reads the `version` attribute stamped on the installed mod at install time. For requirements whose asset filename is versionless and whose version only exists in the release tag: the install stamps the tag-derived version, and update checks read it back — closing the version-tracking loop that `resolveVersionByPattern` cannot close there.

Version comparison is centralized: `latestAssetVersion()` and `isUpdateAvailable()` switch between semver comparison and `Date.parse` comparison based on `trackByAssetDate`. Mis-tagged release versions are normalized first via `normalizeVersion()` — every `-`/`_` between digits becomes `.` (e.g. `v1-2-3` -> `v1.2.3`, `6_1_1` -> `6.1.1`) so semver can parse them.

When the latest release is fetched, `latestAssetVersion()` prefers the version embedded in the **asset filename** (the `fileArchivePattern` capture group run against the asset name) over the release tag. This makes update detection work for rolling-tag repositories whose tag carries no version at all (e.g. EntityAtlan publishes `AtlanModLoader_v_6_1_1.zip` under the permanent tag `ModLoader`). Patterns without a capture group, or assets that don't match, fall back to the semver-coerced tag name as before. The same asset-derived version flows through every stamp point: the fresh-download install stamps it as the mod's `version` attribute, the already-downloaded shortcut path stamps the equivalent value extracted from the local archive name, and both the update check and the update dialog label use it — so a static tag never leaks into comparisons or the UI.

The inverse case needs care: when the version lives only in the release **tag** and the asset filename is versionless (e.g. lovely-injector publishes `lovely-x86_64-pc-windows-msvc.zip` under tags like `v0.8.0`), a capture-group-free pattern is correct for asset matching and the tag fallback covers the remote side — but `resolveVersionByPattern` cannot read the **installed** version from such filenames and always returns the `0.0.0` floor. Once the requirement is installed, every check would then report an update available, and the shortcut path would never stamp a `version` attribute. Pair a capture-group-free pattern with **`resolveVersionByModVersion`** instead: the install stamps the tag-derived version on the mod entry, and the update check reads that stamped attribute back (`game-balatro`'s lovely-injector requirement is the reference wiring).

---

## Behaviors worth knowing

- **GitHub-only.** Requirements come from GitHub release assets. Nexus requirements are handled inline in the individual extensions, not here. Requirement objects carrying old Nexus fields (`modId`/`fileFilter`/`modUrl`) are ignored.
- **Case-insensitive detection.** `findModByFile` lower-cases both sides, so a maintainer changing the marker file's capitalization won't trigger a constant re-download loop.
- **No auto-update on setup.** `download()` installs a missing requirement, but if one is already installed it does **not** silently pull a newer release. Instead it calls `testRequirementVersion`, which raises the "update available" notification. Only the user-driven Download action actually updates — it calls `download(api, [req], true)` (the forced branch).
- **Rate-limit aware.** `getLatestGithubReleaseAsset` / `doDownload` inspect `x-ratelimit-remaining` on a 403/404 response and reject with `util.ProcessCanceled` when the quota is exhausted. The check only fires when the header is actually present, so an error from a host that doesn't send `x-ratelimit-*` headers surfaces as a normal error instead. (Under the old axios build this check was unreachable — axios threw on any 4xx before the status inspection ran; native `fetch` does not throw on HTTP errors, so it now works.) The logged reset time converts GitHub's epoch-seconds `x-ratelimit-reset` correctly.
- **Non-2xx responses throw.** `fetch` resolves on HTTP errors, so both call sites explicitly throw `Request failed with status code N` on any non-ok, non-rate-limited response — preserving the axios error semantics callers rely on (error notification in `getLatestGithubReleaseAsset`, propagated rejection from `doDownload`).
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
    // prereleaseTag: 'experimental',
    // trackByAssetDate: true,
    // resolveVersion: (api) => resolveVersionByAssetDate(api, REQUIREMENTS[0]),
  },
];
```

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
